const { get, cloneDeep } = require('lodash');

const Consumer = require('./consumer');

const CONTENT_TYPE_APPLICATION_JSON = 'application/json';
const BINDING_DELIMITER = ':';

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
    this.queue = null;
    this.numConsumed = 0;
    this.filter = {
      filterPath: null,
      filterRegEx: null,
    };

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
   * Start the engine
   */
  async start() {
    const consumers = this.options.application.bindings.map((binding) => {
      const [exchange, routingKeys] = binding.split(BINDING_DELIMITER);

      const consumer = new Consumer(
        exchange,
        routingKeys.split(',')
          .map(key => key.trim()),
        this.channel,
        this.logger,
        this.options,
      );

      consumer.on('message', this.handleMessage.bind(this));

      return consumer;
    });

    await Promise.all(consumers.map(consumer => consumer.consume()));

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
