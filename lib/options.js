const commander = require('commander');

const DEFAULT_HOST = 'localhost';
const DEFAULT_VHOST = '/';
const DEFAULT_ROUTING_KEY = '#';
const DEFAULT_MAX_LENGTH = 100;

commander
  .version(require('../package.json').version)
  .usage('<required> [optional]')
  .description('Tail the stream of messages from a RabbitMQ exchange')
  .option('--host [rabbit.host.com]', 'Remote host to connect to')
  .option('--exchange <myExchange>', 'Exchange to bind to')
  .option('--routingKeys [my,routing,keys]', 'Comma separated list of routing keys to consume (defaults to #)')
  .option('--vhost [myVhost]', 'RabbitMQ vhost')
  .option('--auth [username:password]', 'Server authentication')
  .option('--queuePrefix [myDebugQueue]', 'Transient queue prefix')
  .option('--maxLength [maxLength]', `Transient queue max length, defaults to ${DEFAULT_MAX_LENGTH}`)
  .option('--verbose', 'Print verbose output during setup')
  .parse(process.argv);

const required = ['exchange'];
required.forEach((field) => {
  if (!commander[field]) {
    commander.help();
  }
});

const options = {
  connection: {},
  application: {}
};

options.connection = {
  protocol: 'amqp',
  hostname: commander.host || DEFAULT_HOST,
  vhost: commander.vhost || DEFAULT_VHOST
}

if (commander.auth) {
  const [username, password] = commander.auth.split(':');

  options.connection.username = username;
  options.connection.password = password;
}

options.application = {
  exchange: commander.exchange,
  routingKeys: commander.routingKeys,
  queuePrefix: commander.queuePrefix || commander.exchange,
  verbose: commander.hasOwnProperty('verbose'),
  maxLength: commander.maxLength ? parseInt(commander.maxLength, 10) : DEFAULT_MAX_LENGTH,
}

module.exports = options;
