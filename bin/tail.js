#!/usr/bin/env node

const RabbitTailEngine = require('../lib/engine');
const engine = new RabbitTailEngine(require('../lib/cli'));

engine
    .start()
    .catch(console.error.bind(null, "Failed to start engine:"));