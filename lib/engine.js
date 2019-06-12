const Consumer = require('./consumer');

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
  }

  /**
   * Start the engine
   */
  async start() {
    const consumers = this.options.application.bindings.map((binding) => {
      const [exchange, routingKeys] = binding.split(BINDING_DELIMITER);

      return new Consumer(
        exchange,
        routingKeys.split(',').map(key => key.trim()),
        this.channel,
        this.logger,
        this.options,
      );
    });

    await Promise.all(consumers.map(consumer => consumer.consume()));

    this.logger.info('Consuming messages...');
  }
}

module.exports = Engine;
