class Queue {
  constructor(name, options) {
    this.queue = name;
    this.options = options;
  }
}

class Channel {
  constructor() {
    this.bindings = {};
  }

  async checkExchange(name) {
    return true;
  }

  async assertQueue(queueName, options) {
    return new Queue(queueName, options);
  }

  async bindQueue(queue, exchange, routingKey) {
    if (!this.bindings.hasOwnProperty(exchange)) {
      this.bindings[exchange] = {};
    }

    if (!this.bindings[exchange].hasOwnProperty(routingKey)) {
      this.bindings[exchange][routingKey] = [];
    }

    // We should create a new Queue object here.
    this.bindings[exchange][routingKey].push(queue);
  }

  async publish(exchange, routingKey, message) {

  }
}

module.exports = Channel;
