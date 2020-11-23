/* eslint-disable global-require, import/no-dynamic-require */
const _ = require('lodash');
const colors = require('ansi-colors');
const config = require('../config/config');
const { logger } = require('../util/logger');

const vcsType = config.hasProjectConfig('sourceControlType')
  ? _.lowerCase(config.readProjectConfig('sourceControlType'))
  : 'git';
let vcs;
try {
  vcs = require(`./${vcsType}`);
  vcs.type = vcsType;
} catch (e) {
  const err = `${vcsType} is not a supported version control provider`;
  logger.addContext('error', err);
  logger.error('ERROR:', colors.red(err));
  logger.removeContext('error');
  throw err;
}

module.exports = vcs;
