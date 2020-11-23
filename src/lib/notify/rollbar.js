// include and initialize the rollbar library with your access token
const Rollbar = require('rollbar');
const config = require('../config/config');

const ERR_ROLLBAR_NOT_ENABLED = 'Rollbar is not enabled. Check config/appirio.json.';
const ERR_NO_RB_ACCESS_TOKEN = 'Rollbar access token is not available!';

const userInformation = () => ({
  id: (config.hasSecret('auth0.id') && config.getSecret('auth0.id'))
    || (config.hasUserConfig('email') && config.readUserConfig('email'))
    || 'Unknown',
  email: (config.hasUserConfig('email') && config.readUserConfig('email')) || 'Unknown',
  username: (config.hasUserConfig('name') && config.readUserConfig('name')) || 'Unknown',
});

const init = (accessToken) => {
  const rbAccessToken = accessToken || process.env.ROLLBAR_ACCESS_TOKEN;
  if (!rbAccessToken) {
    throw (ERR_NO_RB_ACCESS_TOKEN);
  }
  const payload = {
    person: userInformation(),
    OS: process.platform,
  };

  if (process.env.ADX_CLI_ENV) {
    payload.environment = process.env.ADX_CLI_ENV;
  } else if (process.env.ADX_APP_ENV) {
    payload.environment = process.env.ADX_APP_ENV;
  } else {
    payload.environment = 'production';
  }

  if (process.env.ADX_CLI_VERSION) {
    payload.version = process.env.ADX_CLI_VERSION;
  } else if (process.env.ADX_APP_VERSION) {
    payload.version = process.env.ADX_APP_VERSION;
  } else {
    payload.version = 'Unknown';
  }

  return Rollbar.init({
    payload,
    accessToken: rbAccessToken,
    captureUncaught: false,
    captureUnhandledRejections: false,
    verbose: false,
  });
};

const errorCallback = (err, resolve, reject) => {
  if (err) {
    reject(err);
  } else {
    resolve();
  }
};

const logError = (msg, payload) => new Promise((resolve, reject) => {
  const cb = (err) => {
    errorCallback(err, resolve, reject);
  };
  Rollbar.error(msg, null, payload, cb);
});

const logInfo = (msg, payload) => new Promise((resolve, reject) => {
  const cb = (err) => {
    errorCallback(err, resolve, reject);
  };
  Rollbar.info(msg, null, payload, cb);
});

const sendMessage = (msg, isError, payload, accessToken) => {
  init(accessToken);
  if (isError) {
    return logError(msg, payload);
  }
  return logInfo(msg, payload);
};

module.exports = {
  ERR_ROLLBAR_NOT_ENABLED,
  get enabled() {
    return (config.hasProjectConfig('rollbar.enabled'))
      ? config.readProjectConfig('rollbar.enabled')
      : false;
  },
  sendMessage,
};
