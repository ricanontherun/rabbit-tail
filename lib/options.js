const commander = require('commander');

const BIN_NAME = 'rabbit-tail';
const DEFAULT_HOST = 'localhost';
const DEFAULT_VHOST = '/';
const DEFAULT_MAX_LENGTH = 100;
const USAGE_EXAMPLES = {
  'Basic usage (remoteUrl argument)': `${BIN_NAME} --remoteUrl username:password@rabbit.mywebsite.com/myvhost --exchange myExchange --routingKeys myRoutingKey`,
  'Basic usage (individual connection arguments)': `${BIN_NAME} --host RABBIT_HOST --exchange myExchange --routingKeys myRoutingKey`,
  'Multiple routing keys': `${BIN_NAME} --host RABBIT_HOST --exchange myExchange --routingKeys routingKey1,routingKey2,routingKeyN`,
  'Filter results': `${BIN_NAME} --host RABBIT_HOST --exchange myExchange --routingKeys routingKey  --filter content.key=value`,
};
const AMQP_PROTOCOL_STRING = 'amqp://';

const die = code => process.exit(code);

commander
  .version(require('../package.json').version)
  .usage('<required> [optional]')
  .description('Tail the stream of messages from a RabbitMQ exchange')
  .option('--remoteUrl [user:pass@host:port/vhost]', 'Remote connection url string, takes precedence over other flags.')
  .option('--host [rabbit.host.com]', 'Remote host to connect to')
  .option('--exchange <myExchange>', 'Exchange to bind to')
  .option('--routingKeys <my,routing,keys>', 'Comma separated list of routing keys to consume')
  .option('--vhost [myVhost]', 'RabbitMQ vhost')
  .option('--auth [username:password]', 'Server authentication')
  .option('--queuePrefix [myDebugQueue]', 'Transient queue prefix')
  .option('--maxLength [maxLength]', `Transient queue max length, defaults to ${DEFAULT_MAX_LENGTH}`)
  .option('--filter [firstName]', 'Field to print, supports dot.notation')
  .option('--verbose', 'Print verbose output during setup')
  .option('--pretty', 'Pretty print payload, using content-type as a guide')
  .option('--examples', 'Print usage examples')
  .parse(process.argv);

if (commander.examples) {
  /* eslint-disable no-console */
  console.log('Examples:\n');

  Object.keys(USAGE_EXAMPLES).forEach((key) => {
    console.log(key);
    console.log(`${USAGE_EXAMPLES[key]}\n`);
  });

  die(0);
}

const required = ['exchange', 'routingKeys'];
required.forEach((filter) => {
  if (!commander[filter]) {
    commander.help();
  }
});

const options = {
  connection: {},
  application: {},
};

if (commander.remoteUrl) {
  let { remoteUrl } = commander;

  if (!remoteUrl.startsWith(AMQP_PROTOCOL_STRING)) {
    remoteUrl = `${AMQP_PROTOCOL_STRING}${remoteUrl}`;
  }

  options.connection.remoteUrl = remoteUrl;
} else {
  options.connection = {
    protocol: 'amqp',
    vhost: commander.vhost || DEFAULT_VHOST,
  };

  const host = commander.host || DEFAULT_HOST;

  if (host.indexOf(':') !== -1) {
    const [hostname, port] = host.split(':');

    options.connection.hostname = hostname;
    options.connection.port = port;
  } else {
    options.connection.hostname = host;
  }

  if (commander.auth) {
    const [username, password] = commander.auth.split(':');

    options.connection.username = username;
    options.connection.password = password;
  }
}

options.application = {
  exchange: commander.exchange,
  routingKeys: commander.routingKeys,
  queuePrefix: commander.queuePrefix || commander.exchange,
  verbose: Object.prototype.hasOwnProperty.call(commander, 'verbose'),
  maxLength: commander.maxLength ? parseInt(commander.maxLength, 10) : DEFAULT_MAX_LENGTH,
  filter: commander.filter,
};

module.exports = options;
