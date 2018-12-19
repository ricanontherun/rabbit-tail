const {
  createLogger, format, transports, addColors, config,
} = require('winston');

const {
  combine, timestamp, printf, colorize,
} = format;

const formatter = printf((info) => {
  let msg = info.message;

  if (info.verbose === true) {
    msg = `${info.timestamp} ${info.level}: ${msg}`;
  }

  return msg;
});

const decorate = format((info, verbose) => ({ ...info, verbose }));

addColors({ message: 'cyan' });

module.exports = class Logger {
  constructor(options) {
    const { verbose } = options;

    this.logger = createLogger({
      level: verbose ? 'info' : 'error',
      levels: { ...config.syslog.levels, message: 0 },
      format: combine(
        colorize(),
        timestamp(),
        decorate(verbose),
        formatter,
      ),
      transports: [
        new transports.Console(),
      ],
    });
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
};
