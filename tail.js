const chalk = require('chalk');

const RabbitTailEngine = require('./engine');

const engine = new RabbitTailEngine(require('./cli'));
engine
    .start()
    .catch((err) => {
        console.error(chalk.red("Failed to start engine"), err);
    });