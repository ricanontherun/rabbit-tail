const amqplib = require('amqplib');

let channel;

module.exports = async (config) => {
  if (!channel) {
    const connection = await amqplib.connect(config.connection);

    // Ensure connections are closed on program termination.
    process.once('SIGINT', () => connection.close());

    channel = connection.createChannel();
  }

  return channel;
};
