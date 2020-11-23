const fs = require('fs');
const os = require('os');
const path = require('path');
const gulpLog = require('fancy-log');
const colors = require('ansi-colors');
const appirio = require('../config/appirio');
const config = require('../config/config');
const parser = require('../config/json');
const ci = require('../ci/ci');

/** For SonarLint using the SonarQube-inject module for VS Code
 * https://marketplace.visualstudio.com/items?itemName=silverbulleters.sonarqube-inject */
const sonarLintDir = path.join(os.homedir(), '.sonarlint');
const sonarLintConfig = path.join(sonarLintDir, 'global.json');
const sonarLintProjectConfig = appirio.sonarLintFile;

const getSonarLintServers = () => config.readConfig('servers', sonarLintConfig);

const writeSonarLintFile = (sonarURL, projectKey) => {
  // Outputs a sonarlint.json file to configure sonarlint
  if (fs.existsSync(sonarLintProjectConfig)) {
    gulpLog(colors.yellow('The SonarLint JSON file already exists. Not overwriting it.'));
    return Promise.resolve();
  }
  const projectConfig = {
    projectKey,
    serverId: sonarURL,
  };
  if (ci.env.isCi) {
    gulpLog(`You should create a ${sonarLintProjectConfig} file and move this configuration into it:
      \n${parser.convertObjectToString(projectConfig)}\n`);
  }
  return config.writeConfigFromObject('.', sonarLintProjectConfig, projectConfig)
    .then((response) => {
      gulpLog(colors.green(response));
    });
};

module.exports = {
  getSonarLintServers,
  writeSonarLintFile,
  sonarLintProjectConfig,
};
