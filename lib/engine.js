const amqplib = require('amqplib');
const { get, cloneDeep } = require('lodash');

const Logger = require('./log');

const CONTENT_TYPE_APPLICATION_JSON = 'application/json';

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

    this.log('info', 'Consuming messages...');
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
        maxLength: this.options.application.maxLength,
      },
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
        await this.channel.bindQueue(
          this.queue.queue,
          this.options.application.exchange,
          routingKey,
        );

        this.log('info', `Bound '${this.queue.queue}' to '${this.options.application.exchange}' via '${routingKey}'`);
      });
  }

  /**
   * Register the queue consumer.
   */
  async registerConsumer() {
    await this.channel.consume(this.queue.queue, this.consume.bind(this), { noAck: true });
  }

  /**
   * Log a mesage to stdout.
   *
   * @param
   */
  log(channel, message) {
    this.logger[channel](message);
  }

  consume(message) {
    const msg = this.filterMessage(this.formatMessage(message));

    if (msg) {
      this.log('message', msg);
    }
  }

  formatMessage(rawMessage) {
    const message = cloneDeep(rawMessage);

    message.content = message.content.toString();

    const contentType = this.constructor.getMessageContentType(message);

    // Given a contenType, we can format the message's 'content'
    // filter so that it's contents are subject to filtering.
    if (contentType) {
      switch (contentType) {
        case CONTENT_TYPE_APPLICATION_JSON:
          message.content = JSON.parse(message.content);
          break;
        default:
          break;
      }
    }

    return message;
  }

  static getMessageContentType(message) {
    return message.properties.contentType
      || message.properties.headers['content-type']
      || null;
  }

  filterMessage(message) {
    const filter = get(this.options, 'application.filter');
    const msg = JSON.stringify(message);

    if (!filter) {
      return [msg, true];
    }

    const [filterPath, filterRegEx] = filter.split('=');
    const filteredMsg = get(message, filterPath);

    if (filterRegEx) {
      const re = new RegExp(filterRegEx, 'gi');

      // Return whole message on match
      return re.test(String(filteredMsg)) ? msg : undefined;
    }

    // Return the filtered partial message
    return filteredMsg;
  }
}

module.exports = RabbitTailEngine;
