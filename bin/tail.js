#!/usr/bin/env node

const RabbitTailEngine = require('../lib/engine');
const engine = new RabbitTailEngine(require('../lib/options'));

engine
  .start()
  .catch((err) => {
    console.error(`Failed to start RabbitTail engine: ${err}`);
  });
