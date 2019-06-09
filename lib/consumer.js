const { get, cloneDeep } = require('lodash');

const CONTENT_TYPE_APPLICATION_JSON = 'application/json';

class Consumer {
  /**
   *
   * @param {String} exchange
   * @param {Array<String>} routingKeys
   * @param {String} channel
   * @param {Object} logger
   * @param {Object} options
   */
  constructor(exchange, routingKeys, channel, logger, options) {
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
    await this.channel.consume(this.queue.queue, this.handleMessage.bind(this), { noAck: true });
  }

  /**
   * Filter and format message
   *
   * @param {Object} message
   */
  handleMessage(message) {
    const msg = this.filterMessage(this.formatMessage(message));

    if (msg) {
      this.logger.message(msg);
    }
  }

  /**
   * Format message
   *
   * @param {Object} message
   * @returns {Object}
   */
  formatMessage(message) {
    const msg = cloneDeep(message);

    msg.content = msg.content.toString();

    const contentType = this.constructor.getMessageContentType(msg);

    // Given a contentType, we can format the message's 'content'
    // filter so that it's contents are subject to filtering.
    if (contentType) {
      switch (contentType) {
        case CONTENT_TYPE_APPLICATION_JSON:
          msg.content = JSON.parse(msg.content);
          break;
        default:
          break;
      }
    }

    return msg;
  }

  /**
   * Filter message
   *
   * @param {Object} message
   * @returns {string}
   */
  filterMessage(message) {
    const filter = get(this.options, 'application.filter');
    const msg = JSON.stringify(message);

    if (!filter) {
      return msg;
    }

    const [filterPath, filterRegEx] = filter.split('=');
    const filteredMsg = get(message, filterPath);

    if (filterRegEx) {
      const re = new RegExp(filterRegEx, 'gi');

      // Return whole message on match
      return re.test(String(filteredMsg)) ? msg : undefined;
    }

    // Return the filtered partial message
    return filteredMsg ? JSON.stringify(filteredMsg) : undefined;
  }

  /**
   * Extract message content type
   *
   * @param {Object} message
   * @returns {string|undefined}
   */
  static getMessageContentType(message) {
    return message.properties.contentType
      || message.properties.headers['content-type']
      || undefined;
  }
}

module.exports = Consumer;
