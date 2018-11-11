const chalk = require('chalk');

class ConsoleWriter {
    static write(channel, message) {
        console[channel](message);
    }

    static paint(color, text) {
        return chalk[color](text);
    }
}

module.exports = ConsoleWriter;