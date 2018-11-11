const chalk = require('chalk');
const ConsoleWriter = require('./consoleWriter');
const amqplib = require('amqplib');

class RabbitTailEngine {
    constructor(options) {
        this.options = options;
        this.channel = null;
        this.queue = null;
    }

    async start() {
        await this.connect();
        await this.ensureExchnage();
        await this.createTransientQueue();
        await this.bind();
        await this.registerConsumer();

        this.log('log', 'Consuming messages...', true);
    }

    /**
     * Create connection handles to RabbitMQ.
     */
    async connect() {
        const connection = await amqplib.connect(this.options.connection);

        this.log('log', 'Connection Established');

        // Ensure connections are closed on termination termination.
        process.once('SIGINT', () => connection.close());

        this.channel = await connection.createChannel();
    }

    /**
     * Ensure that a target exchange actually exists.
     */
    async ensureExchnage() {
        await this.channel.checkExchange(this.options.application.exchange);
    }

    /**
     * Create a transient queue. This queue will be deleted from RabbitMQ on program termination.
     */
    async createTransientQueue() {
        const ms = (new Date()).getTime();
        const transientQueueName = `${this.options.application.queuePrefix}.${ms}`;

        this.queue = await this.channel.assertQueue(transientQueueName, {
            // Delete queue when consumer count drops to zero.
            autoDelete: true,

            // Make sure this channel is the only consumer.
            exclusive: true
        });

        this.log('log', `Created transient queue: '${this.queue.queue}'`);
    }

    /**
     * Bind the transient queue to the target exchange.
     */
    async bind() {
        if (this.options.application.routingKeys) {
            this.options.application.routingKeys
                .split(',').map(key => key.trim())
                .forEach(async (routingKey) => {
                    await this.channel.bindQueue(this.queue.queue, this.options.application.exchange, routingKey);
                    this.log('info', `Bound '${this.queue.queue}' to '${this.options.application.exchange}' via '${routingKey}'`);
                });
        } else {
            await this.channel.bindQueue(this.queue.queue, this.options.application.exchange);
            this.log('info', `Bound '${this.queue.queue}' to '${this.options.application.exchange}'`);
        }
    }

    /**
     * Register a consumer.
     */
    async registerConsumer() {
        await this.channel.consume(this.queue.queue, this.consume, {noAck: true});
    }

    log(channel, message, force = false) {
        if (this.options.application.verbose || force) {
            ConsoleWriter.write(channel, message);
        }
    }

    consume(message) {
        message.content = message.content.toString();

        // TODO: Might be nice to allow the specification of which message fields to print.
        console.log(JSON.stringify(message));
    }
}

module.exports = RabbitTailEngine;
