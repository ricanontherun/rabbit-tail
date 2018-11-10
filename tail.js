const amqplib = require('amqplib');
const commander = require('commander');
const chalk = require('chalk');

const DEFAULT_AMQP_HOST = 'localhost';

commander
    .version(require('./package.json').version)
    .usage('<required> [optional]')
    .description('Tail the stream of messages from a RabbitMQ exchange')
    .option('--host [host]', 'Remote host to connect to')
    .option('--exchange <exchange>', 'Exchange to bind to')
    .option('--routingKeys <routingKeys>', 'Comma separated list of routing keys to consume')
    .option('--queuePrefix [--queuePrefix]', 'Transient queue prefix')
    .option('--auth [username:password]', 'Server authentication')
    .parse(process.argv);

// Parse out the CLI arguments.
const cliArgs = {
    host: commander.host || DEFAULT_AMQP_HOST
};

if (!commander.exchange) {
    commander.help()
}

if (!commander.routingKeys) {
    commander.help();
}

cliArgs.exchange = commander.exchange;
cliArgs.routingKeys = commander.routingKeys;
cliArgs.queuePrefix = commander.queuePrefix;

const run = (connection) => {
    console.log(chalk.green('Connected:'), cliArgs.host);

    // Properly close the connection on script stop.
    process.once('SIGINT', function() { connection.close(); });

    return connection.createChannel().then(async (channel) => {
        await channel.checkExchange(cliArgs.exchange);

        // Create the transient queue.
        let transientQueueName;

        if (cliArgs.queuePrefix) {
            transientQueueName = cliArgs.queuePrefix;
        } else {
            transientQueueName = `${cliArgs.exchange}`;
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

        cliArgs.routingKeys.split(',').map(key => key.trim()).forEach(async (routingKey) => {
            await channel.bindQueue(queue.queue, cliArgs.exchange, routingKey);
            console.log(chalk.green('Bound:'), `${queue.queue} to ${cliArgs.exchange} via ${routingKey}`);
        })

        // Setup a consumption callback.
        await channel.consume(queue.queue, consumption, {noAck: true});

        console.log("\n");

        function consumption(message) {
            // TODO: Might be nice to allow the specification of which message fields to print.
            console.log(JSON.stringify(message));
        };
    }).catch(console.error);
}

const connectionUrl = `amqp://${cliArgs.host}`;
amqplib.connect(connectionUrl).then(run).catch(() => {
    console.error(chalk.red('Failed'), 'to connect to', cliArgs.host);
});