const commander = require('commander');
const url = require('url');
const { get } = require('lodash');

const BIN_NAME = 'rabbit-tail';

const DEFAULT_VHOST = '/';
const DEFAULT_MAX_LENGTH = 100;

const AMQP_PROTOCOL = 'amqp://';

const USAGE_EXAMPLES = {
  'Basic usage': `${BIN_NAME} -r username:password@rabbit.mywebsite.com/myvhost -b myExchange:my,routing,keys`,
  'Filter results (pluck)': `${BIN_NAME} -r username:password@rabbit.mywebsite.com/myvhost -b myExchange:my,routing,keys -f content.data.whatever`,
  'Filter results (search)': `${BIN_NAME} -r guest:guest@localhost/ -b myExchange:my,routing,keys -f content.name=Bob`,
  'Filter results (regex search)': `${BIN_NAME} -r guest:guest@localhost/ -b myExchange:my,routing,keys -f content.message_type=^chat.+`,
  'Max Queue Length': `${BIN_NAME} -r username:password@rabbit.mywebsite.com/myvhost -b myExchange:my,routing,keys -m 100`,
  'Auto Stop, stop after 100 messages': `${BIN_NAME} -r username:password@rabbit.mywebsite.com/myvhost -b myExchange:my,routing,keys -a 100`,
};

const die = code => process.exit(code);

const bindings = [];
const collectBindings = (value) => {
  bindings.push(value);
};

commander
  .version(require('../package.json').version)
  .usage('<required> [optional]')
  .description('Tail the stream of messages from a RabbitMQ exchange')
  .option('-r, --remoteUrl [user:pass@host:port/vhost]', 'Remote connection url string, takes precedence over other flags.')
  .option('-b, --bind <exchange#routing,keys>', 'exchange#routing,keys to bind to', collectBindings, [])
  .option('-q, --queuePrefix [myDebugQueue]', 'Transient queue prefix')
  .option('-m, --maxLength [maxLength]', `Transient queue max length, defaults to ${DEFAULT_MAX_LENGTH}`)
  .option('-f, --filter [field.to.print]', 'AMQP message to print, supports dot.notation.')
  .option('-a, --autoStop [N]', 'Kill the program after consuming N messages.')
  .option('-v, --verbose', 'Print verbose output during setup')
  .option('-e, --examples', 'Print usage examples')
  .parse(process.argv);

if (commander.examples) {
  /* eslint-disable no-console */
  console.log('Examples:\n');

  Object.keys(USAGE_EXAMPLES)
    .forEach((key) => {
      console.log(key);
      console.log(`${USAGE_EXAMPLES[key]}\n`);
    });

  die(0);
}

const options = {
  connection: {
    protocol: 'amqp',
  },
  application: {},
};

if (commander.remoteUrl) { // Attempt to parse out the remoteUrl flag.
  let { remoteUrl } = commander;

  // This is needed for accurate parsing of the remote url.
  if (!remoteUrl.startsWith(AMQP_PROTOCOL)) {
    remoteUrl = `${AMQP_PROTOCOL}${remoteUrl}`;
  }

  const {
    host,
    auth,
    port,
    path,
  } = url.parse(remoteUrl);

  options.connection.hostname = host;

  options.connection.vhost = path || DEFAULT_VHOST;
  if (options.connection.vhost.charAt(0) === '/') {
    options.connection.vhost = options.connection.vhost.substring(1);
  }

  if (port) {
    options.connection.port = port;
  }

  if (auth) {
    const [username, password] = auth.split(':');

    options.connection.username = username;
    options.connection.password = password;
  }
}

if (bindings.length === 0) {
  commander.help();
}

options.application = {
  bindings,
  queuePrefix: commander.queuePrefix,
  verbose: Object.prototype.hasOwnProperty.call(commander, 'verbose'),
  maxLength: commander.maxLength ? parseInt(commander.maxLength, 10) : DEFAULT_MAX_LENGTH,
  filter: commander.filter,
  autoStop: parseInt(commander.autoStop, 10) || null,
};

// Verify that the user has provided the bare minimum parameters.
// TODO: Validate final options object with JSONSchema or Joi. Please.
const required = ['connection.hostname'];
required.forEach((filter) => {
  if (!get(options, filter)) {
    commander.help();
  }
});

module.exports = options;
