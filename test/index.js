const sinon = require('sinon');
const amqpMock = require('amqp-mock');

describe('rabbit-tail tests', () => {
  let channel;
  let engine;

  before(() => {
    // Setup a mock channel which we can observe
    const conn = amqpMock.createConnection();

    channel = conn.createChannel();

    console.log(channel);
  });

  it("works", () => {

  });
});
