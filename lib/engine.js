const os = require('os');

const { get, cloneDeep } = require('lodash');

const CONTENT_TYPE_APPLICATION_JSON = 'application/json';
const BINDING_DELIMITER = ':';
const ROUTING_KEY_DELIMETER = ',';

class Engine {
  /**
   * @param {Object} options
   * @param {Logger} logger
   * @param {Object} channel AMQP channel
   */
  constructor(options, logger, channel) {
    this.options = options;
    this.channel = channel;
    this.logger = logger;
    this.numConsumed = 0;
    this.filter = {
      filterPath: null,
      filterRegEx: null,
    };
    this.hostname = os.hostname();

    // Setup filtering.
    const { filter } = this.options.application;
    if (filter) {
      const [filterPath, filterPattern] = filter.split('=');

      this.filter.filterPath = filterPath;

      if (filterPattern) {
        this.filter.filterRegEx = new RegExp(filterPattern, 'gi');
      }
    }
  }

  /**
   * Start the engine. This creates a single transient queue and binds it to all
   * specified exchange/routingKey pairs.
   */
  async start() {
    const time = (new Date()).getTime();
    const transientQueueName = `rabbit-tail.${this.hostname}.${time}`;

    const queue = await this.channel.assertQueue(transientQueueName, {
      autoDelete: true,
      exclusive: true,

      arguments: {
        maxLength: this.options.application.maxLength,
      },
    });
    const queueName = queue.queue;

    this.logger.info(`Created transient queue: '${queueName}'`);

    // Bind to this queue.
    this.options.application.bindings.forEach((binding) => {
      const [exchange, routingKeys] = binding.split(BINDING_DELIMITER);

      routingKeys.split(ROUTING_KEY_DELIMETER)
        .map(routingKey => routingKey.trim())
        .filter(routingKey => routingKey.length !== 0)
        .forEach((routingKey) => {
          this.channel.bindQueue(
            queueName,
            exchange,
            routingKey,
          );

          this.logger.info(`Bound '${queueName}' to '${exchange}' via '${routingKey}'`);
        });
    });

    await this.channel.consume(
      queueName,
      this.handleMessage.bind(this),
      { noAck: true },
    );

    this.logger.info('Consuming messages...');
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

    const { autoStop } = this.options.application;
    if (autoStop) {
      this.numConsumed += 1;

      if (this.numConsumed >= autoStop) {
        this.logger.info('Auto stop reached, killing program.');
        process.exit(0);
      }
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
    // filter so that it's contents are subject to filtering/searching.
    if (contentType) {
      if (contentType === CONTENT_TYPE_APPLICATION_JSON) {
        msg.content = JSON.parse(msg.content);
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
    const msg = JSON.stringify(message);

    if (!this.filter.filterPath) {
      return msg;
    }

    const filteredMsg = get(message, this.filter.filterPath);

    if (this.filter.filterRegEx) {
      // Return whole message on match
      return this.filter.filterRegEx.test(String(filteredMsg)) ? msg : undefined;
    }

    // If we're just plucking values, return that.
    return filteredMsg ? JSON.stringify(filteredMsg) : undefined;
  }

  /**
   * Extract message content type
   *
   * @param {Object} message
   * @returns {string|undefined}
   */
  static getMessageContentType(message) {
    return get(message, 'properties.contentType')
      || get(message, 'properties.headers.content-type')
      || undefined;
  }
}

module.exports = Engine;
