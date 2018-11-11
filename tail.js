const amqplib = require('amqplib');
const chalk = require('chalk');

const Engine = require('./engine');

const main = (options) => {
    amqplib.connect(options).then(run.bind(null, options)).catch((err) => {
        console.error(chalk.red('Failed'), 'to connect to', options.connect.host, err);
    });
}

const run = async (options, connection) => {
    console.log(chalk.green('Connected:'), options.connection.host);

    // Properly close the connection on script stop.
    process.once('SIGINT', function() { connection.close(); });

    const channel = await connection.createChannel();

    await channel.checkExchange(options.application.exchange);

    // Create the transient queue.
    let transientQueueName;
    if (options.application.queuePrefix) {
        transientQueueName = options.application.queuePrefix;
    } else {
        transientQueueName = `${options.application.exchange}`;
    }

    const now = new Date();
    transientQueueName += `.${now.getTime()}`;

    const queue = await channel.assertQueue(transientQueueName, {
        // Delete queue when consumer count drops to zero.
        autoDelete: true,

        // Make sure this channel is the only consumer.
        exclusive: true
    });

    console.log(chalk.green("Created queue:"), queue.queue);

    options.application.routingKeys.split(',').map(key => key.trim()).forEach(async (routingKey) => {
        await channel.bindQueue(queue.queue, options.application.exchange, routingKey);
        console.log(chalk.green('Bound:'), `${queue.queue} to ${options.application.exchange} via ${routingKey}`);
    });

    // Setup a consumption callback.
    await channel.consume(queue.queue, consumption, {noAck: true});

    console.log("\n");

    function consumption(message) {
        message.content = message.content.toString();

        // TODO: Might be nice to allow the specification of which message fields to print.
        console.log(JSON.stringify(message));
    };
}

main(require('./cli'));