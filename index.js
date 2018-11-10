const amqplib = require('amqplib');
const commander = require('commander');
const package = require('./package.json');

const DEFAULT_AMQP_HOST = 'amqp://localhost';

commander
    .version(package.version)
    .description('Tail the stream of messages from a RabbitMQ exchange')
    .option('--host [host]', 'Remote host to connect to')
    .option('--exchange <exchange>', 'Exchange to bind to')
    .option('--routingKey <routing-key>', 'Routing key')
    .option('--queue [queue]', 'Transient queue name, omit for auto-generated')
    .option('--auth [username:password]', 'Server authentication')
    .parse(process.argv);

// Parse out the CLI arguments.
const cliArgs = {
    host: commander.host || DEFAULT_AMQP_HOST
};

if (!commander.exchange) {
    console.log("Missing exchange");
    commander.help()
}

if (!commander.routingKey) {
    console.log("Missing routing-key");
    commander.help();
}

cliArgs.exchange = commander.exchange;
cliArgs.routingKey = commander.routingKey;
cliArgs.queue = commander.queue;

console.log(cliArgs);
process.exit(0);

const now = new Date();

const run = (connection) => {
    // Properly close the connection on script stop.
    process.once('SIGINT', function() { connection.close(); });

    return connection.createChannel().then(async (channel) => {
        await channel.checkExchange(cliArgs.exchange);

        const queuePrefix = cliArgs["queue-prefix"] || cliArgs.exchange;
        const temporaryQueue = `${queuePrefix}-${now.getTime()}`;

        const queue = await channel.assertQueue(temporaryQueue, {
            // Delete queue when consumer count drops to zero.
            autoDelete: true,

            // Make sure this channel is the only consumer.
            exclusive: true
        });

        // Bind the transient queue to the exchange with the provided routing key.
        await channel.bindQueue(queue.queue, cliArgs.exchange, cliArgs.routingKey);

        // Setup a consumption callback.
        await channel.consume(queue.queue, consumption, {noAck: true});

        function consumption(message) {
            console.log('Received a message');
        };
    }).catch(console.error);
}

amqplib.connect(cliArgs.host).then(run).catch(console.error);