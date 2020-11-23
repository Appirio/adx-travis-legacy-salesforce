/* eslint-disable no-else-return */
const os = require('os');
const shell = require('shelljs');
const config = require('../config/config');
const appirio = require('../config/appirio');
const tools = require('../tools/tools');
const rollbar = require('../notify/rollbar');
const { executeCommand } = require('../tools/tool-helpers');

const currentOS = os.platform();

const checkIfProxyIsToBeSet = toolresult => toolresult.installationstatus !== 'Not Installed'
  && toolresult.setProxy
  && config.hasUserConfig('proxySettings.enabled')
  && config.readUserConfig('proxySettings.enabled') === true
  && config.hasUserConfig('proxySettings.default');

const noAuthentication = proxyValues => !proxyValues.userPrincipalName && !proxyValues.downLevelLogonName && !proxyValues.password;

const noPassword = proxyValues => proxyValues.userPrincipalName && proxyValues.downLevelLogonName && !proxyValues.password;

const createProxyString = (proxyValues) => {
  const protocolRegex = /\w+(?=:)/;
  const proxyUrlRegex = /(?<=:\/\/).*/;
  const protocol = protocolRegex.exec(proxyValues.endpoint)[0];
  const proxyUrl = proxyUrlRegex.exec(proxyValues.endpoint)[0];

  let nodeAndYarnProxyString;
  let gitProxyString;
  let encodedUsernameFormat1;
  let encodedUsernameFormat2;
  let encodedPassword;

  if (noAuthentication(proxyValues)) {
    // create proxy string without username and password
    nodeAndYarnProxyString = `${protocol}://${proxyUrl}:${proxyValues.port}`;
    gitProxyString = `${protocol}://${proxyUrl}:${proxyValues.port}`;
  } else if (noPassword(proxyValues)) {
    // encode username and create proxy string without password
    encodedUsernameFormat1 = encodeURIComponent(proxyValues.userPrincipalName);
    encodedUsernameFormat2 = encodeURIComponent(proxyValues.downLevelLogonName);
    nodeAndYarnProxyString = `${protocol}://${encodedUsernameFormat1}@${proxyUrl}:${proxyValues.port}`;
    gitProxyString = `${protocol}://${encodedUsernameFormat2}@${proxyUrl}:${proxyValues.port}`;
  } else {
    // encode username and password and create proxy string
    encodedUsernameFormat1 = encodeURIComponent(proxyValues.userPrincipalName);
    encodedUsernameFormat2 = encodeURIComponent(proxyValues.downLevelLogonName);
    encodedPassword = encodeURIComponent(proxyValues.password);
    nodeAndYarnProxyString = `${protocol}://${encodedUsernameFormat1}:${encodedPassword}@${proxyUrl}:${proxyValues.port}`;
    gitProxyString = `${protocol}://${encodedUsernameFormat2}:${encodedPassword}@${proxyUrl}:${proxyValues.port}`;
  }
  return {
    nodeAndYarnProxyString,
    gitProxyString,
  };
};

const setDarwinEnvVars = (proxyString) => {
  const proxyDir = appirio.userConfigDir;
  const proxyFile = appirio.profileFile;

  // Set env var so that it is available in the currrent process also
  shell.env.ALL_PROXY = proxyString;

  // write content to profile file
  config.writeConfig(proxyDir, proxyFile, 'HTTP_PROXY', proxyString, 'properties');
  config.writeConfig(proxyDir, proxyFile, 'HTTPS_PROXY', proxyString, 'properties');
  config.writeConfig(proxyDir, proxyFile, 'ALL_PROXY', proxyString, 'properties');

  // update bash_profile to include path to proxy_profile
  if (!config.checkForFileInMacProfile()) {
    return config.includeFileInMacProfile();
  } else {
    return Promise.resolve();
  }
};

const setWindowsEnvVars = (proxyString) => {
  const setCommand = `setx HTTP_PROXY ${proxyString} && setx HTTPS_PROXY ${proxyString}`;
  return executeCommand(setCommand);
};

const setEnvVars = (proxyValues) => {
  const proxyStrings = createProxyString(proxyValues);

  // Set env vars so that they are available in the currrent process also
  shell.env.HTTP_PROXY = proxyStrings.nodeAndYarnProxyString;
  shell.env.HTTPS_PROXY = proxyStrings.nodeAndYarnProxyString;

  if (currentOS === 'darwin') {
    return setDarwinEnvVars(proxyStrings.nodeAndYarnProxyString);
  } else if (currentOS === 'win32') {
    return setWindowsEnvVars(proxyStrings.nodeAndYarnProxyString);
  } else {
    return Promise.reject();
  }
};

const removeDarwinEnvVars = () => {
  const proxyFilePath = appirio.profileFilePath;

  // Remove env var so that it is not there in the current process as well
  delete shell.env.ALL_PROXY;

  // remove content from profile file
  config.removeConfig('HTTP_PROXY', proxyFilePath, 'properties');
  config.removeConfig('HTTPS_PROXY', proxyFilePath, 'properties');
  config.removeConfig('ALL_PROXY', proxyFilePath, 'properties');

  if (!config.hasConfig('HTTP_PROXY', proxyFilePath, 'properties')
    && !config.hasConfig('HTTPS_PROXY', proxyFilePath, 'properties')
    && !config.hasConfig('ALL_PROXY', proxyFilePath, 'properties')) {
    return Promise.resolve();
  } else {
    return Promise.reject();
  }
};

const removeWindowsEnvVars = () => {
  const removeCommand = 'setx HTTP_PROXY "" && setx HTTPS_PROXY ""';
  return executeCommand(removeCommand);
};

const removeEnvVars = () => {
  // Remove env vars so that they are not there in the current process as well
  delete shell.env.HTTP_PROXY;
  delete shell.env.HTTPS_PROXY;

  if (currentOS === 'darwin') {
    return removeDarwinEnvVars();
  } else if (currentOS === 'win32') {
    return removeWindowsEnvVars();
  } else {
    return Promise.reject();
  }
};

const setNodeProxy = (nodeVersionResult, proxyValues) => {
  if (nodeVersionResult.installationstatus !== 'Not Installed') {
    const proxyStrings = createProxyString(proxyValues);
    const nodeHttpProxy = `npm config set proxy ${proxyStrings.nodeAndYarnProxyString}`;
    const nodeHttpsProxy = `npm config set https-proxy ${proxyStrings.nodeAndYarnProxyString}`;

    return executeCommand(nodeHttpProxy)
      .then(() => executeCommand(nodeHttpsProxy));
  } else {
    return Promise.resolve();
  }
};

const removeNodeProxy = (nodeVersionResult) => {
  if (nodeVersionResult.installationstatus !== 'Not Installed') {
    const nodeHttpProxy = 'npm config rm proxy';
    const nodeHttpsProxy = 'npm config rm https-proxy';

    return executeCommand(nodeHttpProxy)
      .then(() => executeCommand(nodeHttpsProxy));
  } else {
    return Promise.resolve();
  }
};

const setYarnProxy = (yarnVersionResult, proxyValues) => {
  if (yarnVersionResult.installationstatus !== 'Not Installed') {
    const proxyStrings = createProxyString(proxyValues);
    const yarnHttpProxy = `yarn config set proxy ${proxyStrings.nodeAndYarnProxyString}`;
    const yarnHttpsProxy = `yarn config set https-proxy ${proxyStrings.nodeAndYarnProxyString}`;

    return executeCommand(yarnHttpProxy)
      .then(() => executeCommand(yarnHttpsProxy));
  } else {
    return Promise.resolve();
  }
};

const removeYarnProxy = (yarnVersionResult) => {
  if (yarnVersionResult.installationstatus !== 'Not Installed') {
    const yarnHttpProxy = 'yarn config delete proxy';
    const yarnHttpsProxy = 'yarn config delete https-proxy';

    return executeCommand(yarnHttpProxy)
      .then(() => executeCommand(yarnHttpsProxy));
  } else {
    return Promise.resolve();
  }
};

const setGitProxy = (gitVersionResult, proxyValues) => {
  if (gitVersionResult.installationstatus !== 'Not Installed') {
    const proxyStrings = createProxyString(proxyValues);
    const gitHttpProxy = `git config --global http.proxy ${proxyStrings.gitProxyString}`;
    const gitHttpsProxy = `git config --global https.proxy ${proxyStrings.gitProxyString}`;

    return executeCommand(gitHttpProxy)
      .then(() => executeCommand(gitHttpsProxy));
  } else {
    return Promise.resolve();
  }
};

const removeGitProxy = (gitVersionResult) => {
  if (gitVersionResult.installationstatus !== 'Not Installed') {
    const gitHttpProxy = 'git config --global --unset http.proxy';
    const gitHttpsProxy = 'git config --global --unset https.proxy';

    return executeCommand(gitHttpProxy)
      .then(() => executeCommand(gitHttpsProxy));
  } else {
    return Promise.resolve();
  }
};

const setProxies = proxyValues => setEnvVars(proxyValues) // set environment variables
  // check if node is installed
  .then(() => tools.checkIfToolIsInstalled('node'))
  // set proxy for node only when it is installed
  .then(nodeVersionResult => setNodeProxy(nodeVersionResult, proxyValues))
  // check if yarn is installed
  .then(() => tools.checkIfToolIsInstalled('yarn'))
  // set proxy for yarn only when it is installed
  .then(yarnVersionResult => setYarnProxy(yarnVersionResult, proxyValues))
  // check if git is installed
  .then(() => tools.checkIfToolIsInstalled('git'))
  // set proxy for git only when it is installed
  .then(gitVersionResult => setGitProxy(gitVersionResult, proxyValues))
  .then(() => Promise.resolve())
  .catch((err) => {
    return Promise.reject(err);
  });

const setProxyAfterInstallation = (toolId, toolVersionResult) => {
  const proxyValues = config.readUserConfig('proxySettings.default');
  if (toolId === 'node') {
    return setNodeProxy(toolVersionResult, proxyValues);
  } else if (toolId === 'yarn') {
    return setYarnProxy(toolVersionResult, proxyValues);
  } else if (toolId === 'git') {
    return setGitProxy(toolVersionResult, proxyValues);
  } else {
    return Promise.resolve();
  }
};

const removeProxies = () => removeEnvVars() // remove environment variables
  // check if node is installed
  .then(() => tools.checkIfToolIsInstalled('node'))
  // remove proxy for node only when it is installed
  .then(removeNodeProxy)
  // check if yarn is installed
  .then(() => tools.checkIfToolIsInstalled('yarn'))
  // remove proxy for yarn only when it is installed
  .then(removeYarnProxy)
  // check if git is installed
  .then(() => tools.checkIfToolIsInstalled('git'))
  // remove proxy for git only when it is installed
  .then(removeGitProxy)
  .then(() => Promise.resolve())
  .catch((err) => {
    return Promise.reject(err);
  });

module.exports = {
  setProxies,
  setProxyAfterInstallation,
  removeProxies,
  checkIfProxyIsToBeSet,
};
