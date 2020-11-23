const os = require('os');
const path = require('path');

const projectBaseDir = '.';
const projectCacheDir = '.appirio';
const projectCacheFile = 'cache.json';
const projectCachePath = path.join(projectCacheDir, projectCacheFile);

const projectConfigDir = 'config';
const projectConfigFile = 'appirio.json';
const projectConfigPath = path.join(projectConfigDir, projectConfigFile);

const selectiveTestsConfigFile = 'selective-tests.json';
const selectiveTestsConfigPath = path.join(projectConfigDir, selectiveTestsConfigFile);

const sonarPropertiesFile = 'sonar-project.properties';
const sonarLintFile = 'sonarlint.json';

const userConfigDir = path.join(os.homedir(), '.appirio');
const userConfigFile = 'userConfig.json';
const userConfigPath = path.join(userConfigDir, userConfigFile);

const teamConfigFile = 'teamConfig.json';
const teamConfigPath = path.join(userConfigDir, teamConfigFile);

const logDir = 'logs';
const logFile = 'adx.log';
const logFilePath = path.join(userConfigDir, logDir, logFile);

const profileFile = '.profile';
const profileFilePath = path.join(userConfigDir, profileFile);

const CMCBaseUrl = 'https://cmc-api.appirio.net/v1';
const gitlabDomain = 'gitlab.appirio.com';
const gitlabURL = `https://${gitlabDomain}`;
const validProjectTypes = [
  'sfdx',
  'legacy-salesforce',
  'react',
  'electron',
  'node',
  'commerce-cloud',
  'google',
  'data-management',
  'stryker',
  'sfdx-package',
  'sfdx-org',
];
const uniqueIdAlphabets = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const uniqueIdLength = 15;
const supporteCISystems = {
  'Azure DevOps': 'vsts',
  'Bitbucket Pipelines': 'bitbucket',
  CircleCI: 'circleci',
  'GitLab CI': 'gitlab',
  Jenkins: 'jenkins',
  'Travis CI': 'travis',
};
const sonarUrl = 'https://sonarqube.appirio.com';

const appirioConfig = {
  projectBaseDir,
  projectCacheDir,
  projectCacheFile,
  projectCachePath,
  projectConfigDir,
  projectConfigFile,
  projectConfigPath,
  selectiveTestsConfigFile,
  selectiveTestsConfigPath,
  sonarPropertiesFile,
  sonarLintFile,
  userConfigDir,
  userConfigFile,
  userConfigPath,
  teamConfigFile,
  teamConfigPath,
  logFile,
  logFilePath,
  profileFile,
  profileFilePath,
  validProjectTypes,
  CMCBaseUrl,
  gitlabDomain,
  gitlabURL,
  uniqueIdAlphabets,
  uniqueIdLength,
  supporteCISystems,
  sonarUrl,
};

const getAppirioConfigValues = () => appirioConfig;

module.exports = {
  ...appirioConfig,
  getAppirioConfigValues,
};
