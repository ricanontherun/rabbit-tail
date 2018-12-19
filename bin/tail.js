#!/usr/bin/env node

const RabbitTailEngine = require('../lib/engine');
const Logger = require('../lib/log');
const options = require('../lib/options');

const engine = new RabbitTailEngine(options);

engine
  .start()
  .catch((err) => {
    Logger.error(`Failed to start RabbitTail engine: ${err}`);
  });
