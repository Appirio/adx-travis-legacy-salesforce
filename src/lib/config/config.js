/* eslint-disable no-prototype-builtins */
const fs = require('fs');
const os = require('os');
const path = require('path');
const shelljs = require('shelljs');
const _ = require('lodash');
const requireFromString = require('require-from-string');
const appirio = require('./appirio');
const { PROFILE_FILE } = require('../util/env');

const parsers = {
  properties: require('./properties'),
  json: require('./json'),
};

let configdx = {};
let projectDir = appirio.projectBaseDir;
const macProfileFilePath = path.join(os.homedir(), PROFILE_FILE);

const getFileKey = filePath => _.kebabCase(filePath);

const validateConfigType = (configType) => {
  const type = configType.toLowerCase();
  if (!parsers.hasOwnProperty(type)) {
    throw (new Error(`Configuration type "${type}" not supported!`));
  }
  return type;
};

const hasConfig = (configKey, filePath, configType = 'json') => {
  const type = validateConfigType(configType);
  const fileKey = getFileKey(filePath);
  const parser = parsers[type];

  // If the config object doesn't already contain the config for this config file, load this first
  if (!configdx.hasOwnProperty(fileKey)) {
    configdx[fileKey] = parser.load(filePath);
  }
  return parser.has(configdx[fileKey], configKey);
};

const readConfigFile = (filePath, configType = 'json') => {
  const type = validateConfigType(configType);
  const parser = parsers[type];
  const fileKey = getFileKey(filePath);

  // If the config object doesn't already contain the config for this config file, load this first
  if (!configdx.hasOwnProperty(fileKey)) {
    configdx[fileKey] = parser.load(filePath);
  }
  return configdx[fileKey];
};

const readConfig = (configKey, filePath, configType = 'json') => {
  const type = validateConfigType(configType);
  const configFile = readConfigFile(filePath, type);
  const parser = parsers[type];
  return parser.get(configFile, configKey);
};

const writeFileSync = (dir, filePath, fileContent, objConfig) => {
  // Load/Reload the config object for current config file
  const fileKey = getFileKey(filePath);
  configdx[fileKey] = objConfig;
  // Create the target directory recursively, if doesn't exist already
  if (!fs.existsSync(dir)) {
    shelljs.mkdir('-p', dir);
  }
  fs.writeFileSync(filePath, fileContent, 'utf8');
  return true;
};

const writeFile = (dir, filePath, fileContent, objConfig) => new Promise((resolve, reject) => {
  try {
    writeFileSync(dir, filePath, fileContent, objConfig);
    resolve(`Wrote config file: ${filePath}`);
  } catch (e) {
    reject(new Error('Unable to write config file!'));
  }
});

const removeConfigSync = (configKey, filePath, configType = 'json') => {
  const type = validateConfigType(configType);
  const parser = parsers[type];

  const objConfig = parser.load(filePath);
  const updatedConfig = parser.remove(objConfig, configKey);
  const strConfig = parser.convertObjectToString(updatedConfig);
  const fileDir = path.resolve(path.dirname(filePath));
  // Create the directory if doesn't exist, load/Reload the config object and write the file
  return writeFileSync(fileDir, filePath, strConfig, updatedConfig);
};

const removeConfig = (configKey, filePath, configType = 'json') => {
  const type = validateConfigType(configType);
  const parser = parsers[type];

  const objConfig = parser.load(filePath);
  const updatedConfig = parser.remove(objConfig, configKey);
  const strConfig = parser.convertObjectToString(updatedConfig);
  const fileDir = path.resolve(path.dirname(filePath));
  // Create the directory if doesn't exist, load/Reload the config object and write the file
  return writeFile(fileDir, filePath, strConfig, updatedConfig);
};

const writeConfigSync = (configKey, configValue, filePath, configType = 'json') => {
  const type = validateConfigType(configType);
  const parser = parsers[type];

  const objConfig = parser.load(filePath);
  const updatedConfig = parser.set(objConfig, configKey, configValue);
  const strConfig = parser.convertObjectToString(updatedConfig);
  const fileDir = path.resolve(path.dirname(filePath));
  // Create the directory if doesn't exist, load/Reload the config object and write the file
  return writeFileSync(fileDir, filePath, strConfig, updatedConfig);
};

// TODO consider re-writing the method signature to combine dir and fileName and put them at the end, as with the other methods
const writeConfig = (dir, fileName, configKey, configValue, configType = 'json') => {
  const type = validateConfigType(configType);
  const filePath = path.join(dir, fileName);
  const parser = parsers[type];

  const objConfig = parser.load(filePath);
  const updatedConfig = parser.set(objConfig, configKey, configValue);
  const strConfig = parser.convertObjectToString(updatedConfig);
  // Create the directory if doesn't exist, load/Reload the config object and write the file
  return writeFile(dir, filePath, strConfig, updatedConfig);
};

const writeConfigFromObject = (dir, fileName, objConfig = {}, configType = 'json') => {
  const type = validateConfigType(configType);

  const filePath = path.join(dir, fileName);
  const parser = parsers[type];

  const strConfig = parser.convertObjectToString(objConfig);
  // Create the directory if doesn't exist, load/Reload the config object and write the file
  return writeFile(dir, filePath, strConfig, objConfig);
};

const writeSecret = (secretKey, secretValue, filePath, configType = 'json') => {
  const type = validateConfigType(configType);
  let crypto;
  if (process.env.ADX_DESKTOP_CONTEXT) {
    /* eslint-disable-next-line */
    const src = require('!raw-loader!../util/crypto.js');
    crypto = requireFromString(src);
  } else {
    crypto = require('../util/crypto');
  }
  let key = secretKey;
  // In case of user config file, the secret will be stored under hash key
  if (filePath === appirio.userConfigPath) {
    key = `hash.${key}`;
  }
  // console.log(`. ${type} >>> Writing ${key}`);
  // Encrypt the secret before writing to the file
  return writeConfigSync(key, crypto.encrypt(secretValue), filePath, type);
};

const readSecret = (secretKey, filePath, configType = 'json') => {
  const type = validateConfigType(configType);
  let crypto;
  if (process.env.ADX_DESKTOP_CONTEXT) {
    /* eslint-disable-next-line */
    const src = require('!raw-loader!../util/crypto.js');
    crypto = requireFromString(src);
  } else {
    crypto = require('../util/crypto');
  }
  const configFile = readConfigFile(filePath, type);
  const parser = parsers[type];

  // In case of user config file, check if the secret exists under the hash key and return the same after decrypting it
  if (filePath === appirio.userConfigPath) {
    const key = `hash.${secretKey}`;
    if (parser.has(configFile, key)) {
      // console.log(`. ${type} >>> Found encrypted ${key}`);
      // Decrypt the secret before returning
      return crypto.decrypt(parser.get(configFile, key));
    }
    // console.log(`. ${type} >>> secret not found ${key}`);
  }
  if (parser.has(configFile, secretKey)) {
    const existingValue = parser.get(configFile, secretKey);
    // In case of user config file, remove the existing (unencrypted) value, store as encrypted secret value and return the existing value
    if (filePath === appirio.userConfigPath) {
      // console.log(`. ${type} >>> Found unencrypted ${secretKey}, moving to hash....`);
      removeConfigSync(secretKey, filePath, type);
      writeSecret(secretKey, existingValue, filePath, type);
      return existingValue;
    }
    // console.log(`. ${type} >>> found encrypted ${secretKey}`);
    // Decrypt the existing envrypted value before returning it
    return crypto.decrypt(existingValue);
  }
  return undefined;
};

// Method to explicitly set the project base directory - Used by external apps outside out nodejs app, such as CMC Extension
const setProjectBaseDir = (projectPath) => {
  projectDir = projectPath;
};

// Method to purge already stored config values from memory, to force re-parsing the next time a read/write call is made.
const purge = () => {
  configdx = {};
};

// Project config read/write shortcut methods
const hasProjectConfig = (configKey, fileName = appirio.projectConfigPath, type = 'json') => {
  const filePath = path.join(projectDir, fileName);
  return hasConfig(configKey, filePath, type);
};

const readProjectConfig = (configKey, fileName = appirio.projectConfigPath, type = 'json') => {
  const filePath = path.join(projectDir, fileName);
  return readConfig(configKey, filePath, type);
};

const removeProjectConfig = (configKey, fileName = appirio.projectConfigPath, type = 'json') => {
  const filePath = path.join(projectDir, fileName);
  return removeConfig(configKey, filePath, type);
};

// By default, writes 'appirio.json' in 'config' directory under project root directory
const writeProjectConfig = (
  configKey, configValue, fileName = appirio.projectConfigPath, type = 'json',
) => writeConfig(projectDir, fileName, configKey, configValue, type);

// Project cache read/write shortcut methods
const hasProjectCache = (configKey, fileName = appirio.projectCacheFile) => {
  const filePath = path.join(projectDir, appirio.projectCacheDir, fileName);
  return hasConfig(configKey, filePath, 'json');
};

// Project cache read/write shortcut methods
const readProjectCache = (configKey, fileName = appirio.projectCacheFile) => {
  const filePath = path.join(projectDir, appirio.projectCacheDir, fileName);
  return readConfig(configKey, filePath, 'json');
};

const removeProjectCache = (configKey, fileName = appirio.projectCacheFile) => {
  const filePath = path.join(projectDir, appirio.projectCacheDir, fileName);
  return removeConfig(configKey, filePath, 'json');
};

// By default, writes 'cache.json' in '.appirio' directory under project root directory
const writeProjectCache = (configKey, configValue, fileName = appirio.projectCacheFile) => {
  const dir = path.join(projectDir, appirio.projectCacheDir);
  return writeConfig(dir, fileName, configKey, configValue, 'json');
};

// User config read/write shortcut methods
const hasUserConfig = (configKey, fileName = appirio.userConfigFile, type = 'json') => {
  const filePath = path.join(appirio.userConfigDir, fileName);
  return hasConfig(configKey, filePath, type);
};

const readUserConfig = (configKey, fileName = appirio.userConfigFile, type = 'json') => {
  const filePath = path.join(appirio.userConfigDir, fileName);
  return readConfig(configKey, filePath, type);
};

const removeUserConfig = (configKey, fileName = appirio.userConfigFile, type = 'json') => {
  const filePath = path.join(appirio.userConfigDir, fileName);
  return removeConfig(configKey, filePath, type);
};
// By default, writes 'userConfig.json' in '.appirio' directory under user's home directory
const writeUserConfig = (
  configKey, configValue, fileName = appirio.userConfigFile, type = 'json',
) => writeConfig(appirio.userConfigDir, fileName, configKey, configValue, type);

const hasSecret = (
  secretKey, filePath = appirio.userConfigPath, type = 'json',
) => {
  let secret;
  try {
    secret = readSecret(secretKey, filePath, type);
  } catch (e) {
    secret = undefined;
    console.log(`hasSecret: Failed to read secret ${secretKey}!`, e.message);
  }
  return secret !== undefined;
};

const getMacProfileContent = () => {
  try {
    return fs.readFileSync(macProfileFilePath).toString();
  } catch (e) {
    console.log(e);
    return '';
  }
};

const writeMacProfileContent = (profileContent) => {
  try {
    const dir = os.homedir();
    return writeFile(dir, macProfileFilePath, profileContent);
  } catch (e) {
    console.log(e);
    return '';
  }
};

// By default, checks for '.profile' in '.appirio' directory under user's home directory to be present in 'bash_profile'
const checkForFileInMacProfile = (filePath = appirio.profileFilePath) => {
  const macProfileContent = getMacProfileContent();
  let macProfileContentArray = [];
  if (macProfileContent) {
    macProfileContentArray = macProfileContent.split('\n');
  }
  const includeFileStatement = `source ${filePath}`;
  return macProfileContentArray.includes(includeFileStatement);
};

// By default, includes '.profile' in '.appirio' directory under user's home directory in 'bash_profile'
const includeFileInMacProfile = (filePath = appirio.profileFilePath) => {
  let macProfileContent = getMacProfileContent();
  if (!macProfileContent) {
    macProfileContent = '';
  }
  const updateMacProfile = `\nset -a\nsource ${filePath}\nset +a\n`;
  macProfileContent += updateMacProfile;
  return writeMacProfileContent(macProfileContent);
};

const getSecret = (
  secretKey, filePath = appirio.userConfigPath, type = 'json',
) => readSecret(secretKey, filePath, type);

const setSecret = (
  secretKey, secretValue, filePath = appirio.userConfigPath, type = 'json',
) => writeSecret(secretKey, secretValue, filePath, type);

const removeSecret = (secretKey, filePath = appirio.userConfigPath, type = 'json') => {
  let key = secretKey;
  // In case of user config file, the secret will be stored under hash key
  if (filePath === appirio.userConfigPath) {
    key = `hash.${secretKey}`;
  }
  return removeConfigSync(key, filePath, type);
};

const betaUser = () => (hasUserConfig('betaUser') ? readUserConfig('betaUser') : false);

const debuggingEnabled = () => (hasUserConfig('allowDebug') ? readUserConfig('allowDebug') : false);

module.exports = {
  // General purpose, core config methods
  hasConfig,
  readConfig,
  readConfigFile,
  removeConfig,
  writeConfig,
  writeConfigFromObject,
  setProjectBaseDir,
  purge,
  hasProjectConfig,
  readProjectConfig,
  removeProjectConfig,
  writeProjectConfig,
  hasProjectCache,
  readProjectCache,
  removeProjectCache,
  writeProjectCache,
  hasUserConfig,
  readUserConfig,
  removeUserConfig,
  writeUserConfig,
  getMacProfileContent,
  writeMacProfileContent,
  checkForFileInMacProfile,
  includeFileInMacProfile,
  hasSecret,
  getSecret,
  setSecret,
  removeSecret,
  betaUser,
  debuggingEnabled,
};
