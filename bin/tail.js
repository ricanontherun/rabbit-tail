#!/usr/bin/env node

const RabbitTailEngine = require('../lib/engine');
const Logger = require('../lib/log');
const options = require('../lib/options');

const logger = new Logger(options.application);
const engine = new RabbitTailEngine(options, logger);

engine
  .start()
  .catch((err) => {
    logger.error(`Failed to start RabbitTail engine: ${err}`);
  });
