/* eslint-disable no-cond-assign, no-loop-func */
const _ = require('lodash');
const os = require('os');
const { uniqueIdAlphabets, uniqueIdLength, sonarPropertiesFile } = require('../config/appirio');

const emptyResult = () => ({
  data: null,
  error: null,
  warning: null,
});

const getPlainObjectFromNativeError = (err) => {
  const error = {};
  if (err instanceof Error) {
    let obj = err;
    const props = [];
    do {
      Object.getOwnPropertyNames(obj).forEach((key) => {
        if (!props.includes(key) && key !== '__proto__' && typeof obj[key] !== 'function') {
          error[key] = obj[key];
          props.push(key);
        }
      });
    } while (obj = Object.getPrototypeOf(obj));
  }
  return error;
};

const processError = (inputError) => {
  let outputError = {
    message: '',
  };
  if (_.isPlainObject(inputError) && _.has(inputError, 'error')) {
    return processError(inputError.error);
  }
  if (inputError instanceof Error) {
    outputError = getPlainObjectFromNativeError(inputError);
  } else if (_.isPlainObject(inputError) && _.has(inputError, 'message')) {
    outputError = inputError;
  } else if (typeof inputError !== 'string') {
    const str = String(inputError);
    if (str !== '[object Object]') {
      outputError.message = str;
    } else {
      outputError.message = JSON.stringify(inputError);
    }
  } else {
    outputError.message = inputError;
  }
  return outputError;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 *
 * @param {*} size Size of the new ID that is to be generated. (Optional, Default: 15)
 * @return A unique ID of the desired size
 */
const getNewUniqueId = (size = uniqueIdLength) => {
  const generate = require('nanoid/generate');
  return generate(uniqueIdAlphabets, size);
};

/**
 *
 * This method checks if the input ID is of desired size and have only the allowed characters in it.
 * It just checks for the valid format, and not necessarily the input ID may be a unique ID.
 *
 * @param {*} id Input ID to check for valid format
 * @param {*} size Size of the input ID to check (Optional, Default: 15)
 *
 * @return true or false.
 */
const isValidUniqueId = (id, size = uniqueIdLength) => {
  if (typeof id === 'string' && id.length === size) {
    const idCharArray = id.split('');
    const allowedCharArray = uniqueIdAlphabets.split('');
    const invalidCharArray = _.difference(idCharArray, allowedCharArray);
    if (invalidCharArray.length === 0) {
      return true;
    }
  }
  return false;
};

/**
 *
 * @param input String that is to be shortened
 * @return Shortened string using NPM shortners module
 */
const getShortenedString = (input, alphaNumOnly = false) => {
  const shortners = require('shorteners');
  let str = shortners.shortener(input);
  if (alphaNumOnly) {
    str = str ? str.replace(/-/g, 'H') : str;
    str = str ? str.replace(/_/g, 'U') : str;
  }
  return str;
};

const isSonarEnabled = () => {
  const config = require('../config/config');
  if (config.hasProjectConfig('sonar.host.url', sonarPropertiesFile, 'properties')
    && config.hasProjectConfig('sonar.projectKey', sonarPropertiesFile, 'properties')
    && config.hasProjectConfig('sonar.projectName', sonarPropertiesFile, 'properties')
  ) {
    const sonarHostUrl = config.readProjectConfig('sonar.host.url', sonarPropertiesFile, 'properties');
    const sonarProjectKey = config.readProjectConfig('sonar.projectKey', sonarPropertiesFile, 'properties');
    const sonarProjectName = config.readProjectConfig('sonar.projectName', sonarPropertiesFile, 'properties');
    if (sonarHostUrl && sonarProjectKey && sonarProjectName) {
      return true;
    }
  }
  return false;
};

const convertLineFeed = src => src.toString().split('\n').join(os.EOL);

const isProd = () => (process.env.ADX_CLI_ENV === 'production' || process.env.ADX_APP_ENV === 'production');
const isBeta = () => (process.env.ADX_CLI_ENV === 'beta' || process.env.ADX_APP_ENV === 'beta');
const isDev = () => (process.env.ADX_CLI_ENV === 'dev' || process.env.ADX_APP_ENV === 'dev');
const isQA = () => process.env.ADX_APP_ENV === 'qa';

module.exports = {
  emptyResult,
  processError,
  sleep,
  getNewUniqueId,
  isValidUniqueId,
  getShortenedString,
  isSonarEnabled,
  convertLineFeed,
  isProd,
  isBeta,
  isDev,
  isQA,
};
