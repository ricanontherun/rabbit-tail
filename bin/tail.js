#!/usr/bin/env node

const RabbitTailEngine = require('../lib/engine');
const engine = new RabbitTailEngine(require('../lib/options'));
const Logger = require('../lib/log');

engine
  .start()
  .catch((err) => {
    Logger.error(`Failed to start RabbitTail engine: ${err}`);
  });
