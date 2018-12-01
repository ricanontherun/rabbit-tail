const winston = require('winston');
const { combine, timestamp, label, printf } = winston.format;
const chalk = require('chalk');

const formatter = printf((info) => {
  const level = info.level;
  let colorFn = 'reset';

  switch (level) {
    case 'message':
      colorFn = 'green';
      break;
    case 'error':
      colorFn = 'red';
      break;
    case 'info':
      colorFn = 'blue';
      break;
  }

  return `${info.timestamp} ${chalk[colorFn](info.level)}: ${info.message}`;
});

const logFormat = combine(
  label({label: ''}),
  timestamp(),
  formatter
);

const messageLogger = winston.createLogger({
  level: 'message',
  levels: {message: 0},
  format: logFormat,
  transports: [
    new winston.transports.Console(),
  ]
});

const errorLogger = winston.createLogger({
  level: 'error',
  format: logFormat,
  transports: [
    new winston.transports.Console({stderrLevels: ['error']}),
  ]
});

const infoLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console(),
  ]
});

module.exports = class Logger {
  static message(message) {
    messageLogger.message(message);
  }

  static error(message) {
    errorLogger.error(message);
  }

  static info(message) {
    infoLogger.info(message);
  }

  static fatal(message) {
    Logger.error(message);
    process.exit(1);
  }
}
