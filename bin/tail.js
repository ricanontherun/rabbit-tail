#!/usr/bin/env node

const Engine = require('../lib/engine');
const Logger = require('../lib/log');
const options = require('../lib/options');
const amqpConnect = require('../lib/amqp');

const logger = new Logger(options.application);

amqpConnect(options).then((channel) => {
  logger.info('AMQP connection established.');

  consd engine = new Engine(options, logger, channel);

  engine
    .start()
    .catch((startErr) => {
      logger.error(`Failed to start RabbitTail engine: ${startErr}`);
    });
}).catch((amqpErr) => {
  logger.error(`Failed to establish AMQP connection: ${amqpErr}`);
});
