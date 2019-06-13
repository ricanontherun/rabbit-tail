const { EventEmitter } = require('events');

class Consumer extends EventEmitter {
  /**
   *
   * @param {String} exchange
   * @param {Array<String>} routingKeys
   * @param {String} channel
   * @param {Object} logger
   * @param {Object} options
   */
  constructor(exchange, routingKeys, channel, logger, options) {
    super();

    this.exchange = exchange;
    this.routingKeys = routingKeys;
    this.channel = channel;
    this.logger = logger;
    this.options = options;
    this.queue = null;
  }

  /**
   * Start consuming messages.
   *
   * @returns {Promise<void>}
   */
  async consume() {
    await this.ensureExchange();
    await this.createTransientQueue();
    await this.bind();
    await this.registerMessageHandler();
  }

  /**
   * Ensure that a target exchange actually exists.
   */
  async ensureExchange() {
    await this.channel.checkExchange(this.exchange);
  }

  /**
   * Create a transient queue. This queue will be deleted from RabbitMQ on program termination.
   */
  async createTransientQueue() {
    const time = (new Date()).getTime();
    const queuePrefix = this.options.application.queuePrefix || this.exchange;
    const transientQueueName = `${queuePrefix}.${time}`;

    this.queue = await this.channel.assertQueue(transientQueueName, {
      autoDelete: true,
      exclusive: true,

      arguments: {
        maxLength: this.options.application.maxLength,
      },
    });

    this.logger.info(`Created transient queue: '${this.queue.queue}'`);
  }

  /**
   * Bind the transient queue to the exchange via all provided routing keys.
   *
   * @returns {Promise<void>}
   */
  async bind() {
    this.routingKeys
      .forEach(async (routingKey) => {
        await this.channel.bindQueue(
          this.queue.queue,
          this.exchange,
          routingKey,
        );

        this.logger.info(`Bound '${this.queue.queue}' to '${this.exchange}' via '${routingKey}'`);
      });
  }

  /**
   * Register the message handler.
   *
   * @returns {Promise<void>}
   */
  async registerMessageHandler() {
    await this.channel.consume(
      this.queue.queue,
      this.emit.bind(this, 'message'),
      { noAck: true },
    );
  }
}

module.exports = Consumer;
