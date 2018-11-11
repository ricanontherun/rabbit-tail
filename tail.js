const amqplib = require('amqplib');
const commander = require('commander');
const chalk = require('chalk');

const DEFAULT_RABBITMQ_HOST = 'localhost';
const DEFAULT_RABBITMQ_VHOST = '/';

commander
    .version(require('./package.json').version)
    .usage('<required> [optional]')
    .description('Tail the stream of messages from a RabbitMQ exchange')
    .option('--host [host]', 'Remote host to connect to')
    .option('--exchange <exchange>', 'Exchange to bind to')
    .option('--routingKeys <routingKeys>', 'Comma separated list of routing keys to consume')
    .option('--queuePrefix [--queuePrefix]', 'Transient queue prefix')
    .option('--auth [username:password]', 'Server authentication')
    .option('--vhost [vhost]', 'RabbitMQ vhost')
    .parse(process.argv);

// Parse out the CLI arguments.
if (!commander.exchange) {
    commander.help()
}

if (!commander.routingKeys) {
    commander.help();
}

const main = (connectionOptions) => {
    amqplib.connect(connectionOptions).then(run.bind(null, connectionOptions)).catch((err) => {
        console.error(chalk.red('Failed'), 'to connect to', connectionOptions.host, err);
    });
}

const run = async (connetionOptions, connection) => {
    console.log(chalk.green('Connected:'), connectionOptions.host);

    // Properly close the connection on script stop.
    process.once('SIGINT', function() { connection.close(); });

    const channel = await connection.createChannel();

    await channel.checkExchange(commander.exchange);

    // Create the transient queue.
    let transientQueueName;
    if (commander.queuePrefix) {
        transientQueueName = commander.queuePrefix;
    } else {
        transientQueueName = `${commander.exchange}`;
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

    commander.routingKeys.split(',').map(key => key.trim()).forEach(async (routingKey) => {
        await channel.bindQueue(queue.queue, commander.exchange, routingKey);
        console.log(chalk.green('Bound:'), `${queue.queue} to ${commander.exchange} via ${routingKey}`);
    })

    // Setup a consumption callback.
    await channel.consume(queue.queue, consumption, {noAck: true});

    console.log("\n");

    function consumption(message) {
        message.content = message.content.toString();

        // TODO: Might be nice to allow the specification of which message fields to print.
        console.log(JSON.stringify(message));
    };
}

const connectionOptions = {
    protocol: 'amqp',
    host: commander.host || DEFAULT_RABBITMQ_HOST,
    vhost: commander.vhost || DEFAULT_RABBITMQ_VHOST
}

if (commander.auth) {
    const [username, password] = commander.auth.split(':');

    connectionOptions.username = username;
    connectionOptions.password = password;
}

main(connectionOptions);