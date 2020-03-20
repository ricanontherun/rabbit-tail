const amqplib = require('amqplib');

let channel;

module.exports = async (config) => {
  if (!channel) {
    const connection = await amqplib.connect(config.connection);
    
    // Ensure connections are closed on program termination.
    channel = connection.createChannel();

    process.once('SIGINT', () => connection.close());
  }

  return channel;
};
