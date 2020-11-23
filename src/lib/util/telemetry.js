const { lowerCase } = require('lodash');
const ci = require('../ci/ci');
const rollbar = require('../notify/rollbar');
const { supporteCISystems } = require('../config/appirio');

// collect the Telemetry Information and return the same info as a object
const collectTelemetryInfo = (status) => {
  const telemetryInfo = {};
  // getting ci Name from appirio
  let ciName;
  if (ci.env.isCi) {
    if (Object.values(supporteCISystems).indexOf(ci.env.service) >= 0) {
      ciName = Object.keys(supporteCISystems).find(key => supporteCISystems[key] === ci.env.service);
    } else {
      ciName = ci.env.name;
    }
  } else {
    ciName = 'local';
  }
  telemetryInfo.ci = ciName;
  telemetryInfo.repoUrl = ci.env.isCi ? ci.env.projectUrl : '';
  telemetryInfo.status = status;
  return telemetryInfo;
};

// it create and write telemetry information
const writeTelemetryInfo = (rollBarAccessToken, context, payload = {}) => {
  return rollbar.sendMessage(context, false, payload, rollBarAccessToken);
};

const cliTelemetry = async (rollBarAccessToken, context, status) => {
  const enableDevTelemetry = process.env.ADX_ENABLE_DEV_TELEMETRY;
  let writeTelemetry = true;
  if (process.env.ADX_CLI_ENV === 'dev' && lowerCase(enableDevTelemetry) !== 'true' && enableDevTelemetry !== '1') {
    writeTelemetry = false;
  }
  // run telemetry if dev docker img is used in ci
  if (writeTelemetry || ci.env.isCi) {
    try {
      const payload = collectTelemetryInfo(status);
      await writeTelemetryInfo(rollBarAccessToken, context, payload);
    } catch (err) {
      // ignore error
    }
  }
};

const appTelemetry = async (rollBarAccessToken, context) => {
  const enableDevTelemetry = process.env.ADX_ENABLE_DEV_TELEMETRY;
  const appEnv = process.env.ADX_APP_ENV;
  let writeTelemetry = true;
  if ((appEnv === 'dev' || appEnv === 'qa') && lowerCase(enableDevTelemetry) !== 'true' && enableDevTelemetry !== '1') {
    writeTelemetry = false;
  }
  if (writeTelemetry) {
    try {
      await writeTelemetryInfo(rollBarAccessToken, context);
    } catch (err) {
      // ignore error
    }
  }
};

module.exports = {
  cliTelemetry,
  appTelemetry,
};
