const amqplib = require('amqplib');
const {get, set, cloneDeep} = require('lodash');

const Logger = require('./log');

class RabbitTailEngine {
  constructor(options) {
    this.options = options;
    this.channel = null;
    this.queue = null;
    this.logger = new Logger(options.application);
  }

  async start() {
    await this.connect();
    await this.ensureExchnage();
    await this.createTransientQueue();
    await this.bind();
    await this.registerConsumer();

    this.log('info', 'Consuming messages...', true);
  }

  /**
   * Create connection handles to RabbitMQ.
   */
  async connect() {
    const connection = await amqplib.connect(this.options.connection);

    this.log('info', 'Connection Established');

    // Ensure connections are closed on program termination.
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

    this.log('info', `Created transient queue: '${this.queue.queue}'`);
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
   * Register the queue consumer.
   */
  async registerConsumer() {
    await this.channel.consume(this.queue.queue, this.consume.bind(this), {noAck: true});
  }

  /**
   * Log a mesage to stdout.
   *
   * @param
   */
  log(channel, message, force = false) {
    if (force || this.options.application.verbose) {
      this.logger[channel](message);
    }
  }

  consume(message) {
    message.content = message.content.toString();

    if (this.options.application.fields) {
      const filteredMessage = {};
      const fields = this.options.application.fields.split(',').map(field => field.trim())

      fields.forEach((field) => {
        const value = get(message, field);

        if (value) {
          set(filteredMessage, field, value);
        } else {
          this.log('error', `Field '${field}' not found in payload!`);
        }
      });

      this.log('message', JSON.stringify(filteredMessage), true);
    } else {
      this.log('message', JSON.stringify(message), true);
    }
  }
}

module.exports = RabbitTailEngine;
