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
  /**
   * Constructor
   *
   * @param {Object} options
   */
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

  /**
   * Log message
   *
   * @param {string} message
   */
  message(message) {
    this.logger.message(message);
  }

  /**
   * Log error
   *
   * @param {string} message
   */
  error(message) {
    this.logger.error(message);
  }

  /**
   * Log info
   *
   * @param {string} message
   */
  info(message) {
    this.logger.info(message);
  }

  /**
   * Log fatal
   *
   * @param {string} message
   */
  fatal(message) {
    this.error(message);
    process.exit(1);
  }
};
