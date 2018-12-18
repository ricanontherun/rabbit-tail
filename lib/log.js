//const winston = require('winston');
const { createLogger, format, transports, addColors, config } = require('winston');
const { combine, timestamp, printf, colorize } = format;

const formatter = printf((info) => {
  let msg = '';

  if (info.verbose === true) {
    msg += `${info.timestamp} ${info.level}: `
  }

  msg += info.message;

  return msg;
});

const verbose = format((info, options) => {
  info.verbose = options.verbose;

  return info;
});

addColors({ message: 'cyan' });

module.exports = class Logger {
  constructor(options) {
    this.options = options;

    this.logger = createLogger({
      levels: { ...config.syslog.levels, message: 0, },
      format: combine(
        colorize(),
        timestamp(),
        verbose(options),
        formatter,
      ),
      transports: [
        new transports.Console(),
      ]
    })
  }

  message(message) {
    this.logger.message(message);
  }

  error(message) {
    this.logger.error(message);
  }

  info(message) {
    this.logger.info(message);
  }

  fatal(message) {
    this.error(message);
    process.exit(1);
  }
}
