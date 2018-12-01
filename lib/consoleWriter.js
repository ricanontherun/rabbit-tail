const chalk = require('chalk');

class ConsoleWriter {
  /**
   * Write to console.{channel};
   *
   */
  static write(channel, message) {
    console[channel](message);
  }
}

module.exports = ConsoleWriter;
