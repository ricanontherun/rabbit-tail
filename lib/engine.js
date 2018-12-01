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
    const time = (new Date()).getTime();
    const transientQueueName = `${this.options.application.queuePrefix}.${time}`;

    this.queue = await this.channel.assertQueue(transientQueueName, {
      autoDelete: true,
      exclusive: true,

      arguments: {
        maxLength: this.options.application.maxLength
      }
    });

    this.log('log', `Created transient queue: '${this.queue.queue}'`);
  }

  /**
   * Bind the transient queue to the target exchange.
   */
  async bind() {
    this.options.application.routingKeys
      .split(',').map(key => key.trim())
      .forEach(async (routingKey) => {
        await this.channel.bindQueue(this.queue.queue, this.options.application.exchange, routingKey);
        this.log('info', `Bound '${this.queue.queue}' to '${this.options.application.exchange}' via '${routingKey}'`);
      });
  }

  /**
   * Register a consumer.
   */
  async registerConsumer() {
    await this.channel.consume(this.queue.queue, this.consume, {noAck: true});
  }

  log(channel, message, force = false) {
    if (force || this.options.application.verbose) {
      console[channel](message);
    }
  }

  consume(message) {
    message.content = message.content.toString();

    // TODO: Might be nice to allow the specification of which message fields to print.
    console.log(JSON.stringify(message));
  }
}

module.exports = RabbitTailEngine;
