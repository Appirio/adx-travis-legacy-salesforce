const log4js = require('log4js');
const os = require('os');
const fsExtra = require('fs-extra');
const stripAnsi = require('strip-ansi');
const { logFilePath } = require('../config/appirio');
const { processError } = require('../util/misc');

// Create the log file if it is not exist
fsExtra.ensureFileSync(logFilePath);

const layoutConfig = () => (logEvent) => {
  // Strip ANSI characters (color codes) from the log message
  let msg;
  if (Array.isArray(logEvent.data)) {
    msg = logEvent.data.map(m => stripAnsi(m));
  } else {
    msg = stripAnsi(logEvent.data);
  }

  const logData = {
    timestamp: logEvent.startTime,
    loglevel: logEvent.level.levelStr,
    os: os.platform(),
    hostname: os.hostname().toString(),
    pid: logEvent.pid,
    msg,
  };
  // If context is available, set proprties in the log accordingly
  if (logEvent.context) {
    logData.source = logEvent.context.source || 'UNKNOWN';
    logData.version = logEvent.context.version;
    if (logEvent.context.error) {
      logData.error = processError(logEvent.context.error);
    }
    if (logEvent.context.context) {
      logData.context = logEvent.context.context;
    }
  }
  return JSON.stringify(logData);
};

log4js.addLayout('json', layoutConfig);

log4js.levels.INFO.colour = 'grey';
log4js.levels.ERROR.colour = 'grey';

log4js.configure({
  appenders: {
    fileAppender: {
      type: 'fileSync',
      // 25 MB
      maxLogSize: 26214400,
      backups: 3,
      filename: logFilePath,
      layout: {
        type: 'json',
      },
    },
    consoleAppender: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '[%[%r%]] %m',
      },
    },
  },
  categories: {
    default: { appenders: ['fileAppender', 'consoleAppender'], level: 'ALL' },
    fileOnly: { appenders: ['fileAppender'], level: 'ALL' },
  },
});
const logger = log4js.getLogger();
const fileLogger = log4js.getLogger('fileOnly');
module.exports = { logger, fileLogger, log4js, layoutConfig };
