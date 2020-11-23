const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const gulpLog = require('fancy-log');
const colors = require('ansi-colors');
const appirio = require('../config/appirio');
const config = require('../config/config');
const parser = require('../config/properties');
const ci = require('../ci/ci');
const vcs = require('../vcs/vcs');
const sonarlint = require('./sonarlint');

let projectURL;
let projectKey;
let projectName;

/** Make a path lowercased and with everything except 0-9 and a-z
 * replaced with -. Use in URLs and domain names.
 */
const prefixWithGitServerType = (projectUrl, keyPath) => {
  let prefix = '';
  if (/(github.com)/.test(projectUrl)) {
    prefix = 'gh-';
  } else if (/(bitbucket.org)/.test(projectUrl)) {
    prefix = 'bb-';
  }
  return prefix + keyPath;
};

const stripBuildPrefix = keyPath => _.replace(keyPath, /^\/builds\//, '');

const setSonarVars = () => new Promise((resolve, reject) => {
  if (projectURL && projectKey && projectName) {
    resolve();
  } else if (ci.env.isCi) {
    projectURL = ci.env.projectUrl || 'No Description provided';
    projectName = stripBuildPrefix(ci.env.root) || 'Unnamed Project';
    projectKey = prefixWithGitServerType(ci.env.projectUrl, _.kebabCase(ci.env.slug));
    resolve();
  } else {
    const promises = [vcs.getRemoteURL(), vcs.getRemotePath(), vcs.getRemoteSlug()];
    Promise.all(promises)
      .then((responses) => {
        projectURL = responses[0] || 'No Description provided';
        projectName = responses[1] || 'Unnamed Project';
        projectKey = prefixWithGitServerType(responses[0], responses[2]);
        resolve();
      })
      .catch(err => reject(err));
  }
});

const resetSonarVars = () => {
  projectURL = null;
  projectName = null;
  projectKey = null;
};

const { sonarPropertiesFile, sonarUrl } = appirio;
let sonarURL;

// This outputs a sonar-project.properties file to configure the Sonar scan
const writeSonarProjectProperties = (passedArguments, projectDevModel) => setSonarVars()
  .then(() => {
    // Read sonar vars from passedArguments, if they're passed else use defaults.
    sonarURL = (passedArguments && passedArguments['sonar.host.url']) || sonarUrl;
    projectKey = (passedArguments && passedArguments['sonar.projectKey']) || projectKey;

    if (fs.existsSync(sonarPropertiesFile)) {
      gulpLog(colors.yellow('The SonarQube Properties file already exists. Not overwriting it.'));
      return Promise.resolve();
    }
    const sonarConfig = {
      'sonar.host.url': sonarURL,
      'sonar.projectKey': projectKey,
      'sonar.projectName': projectName,
      'sonar.projectDescription': projectURL,
      'sonar.sourceEncoding': 'UTF-8',
    };
    // Override sonarConfig values with passedArguments
    if (passedArguments) {
      Object.assign(sonarConfig, passedArguments);
    }

    // set project dependant sonar properties
    const legacySourceFolder = 'src';
    const sfdxSourceFolder = 'force-app';
    const jestTests = path.join('**', '__tests__', '*');
    const jestMocks = path.join('**', '__mocks__', '*');
    const managedPackageFiles = [
      path.join('**', '*__*.cls'),
      path.join('**', '*__*.trigger'),
      path.join('**', '*__*.js')
    ];
    const miscFiles = [
      path.join('**', '*.xml'),
      path.join('**', '*.css'),
      path.join('**', '*.html')
    ];
    let staticResourcesFiles = [];
    let sonarInclusions = [];
    let sonarExclusions = [jestTests, jestMocks, sonarPropertiesFile];
    sonarExclusions = sonarExclusions.concat(managedPackageFiles);
    sonarExclusions = sonarExclusions.concat(miscFiles);

    if (projectDevModel === 'legacy') {
      sonarConfig['sonar.sources'] = legacySourceFolder;
      sonarInclusions = [
        path.join(legacySourceFolder, '**', '*.cls'),
        path.join(legacySourceFolder, '**', '*.trigger'),
        path.join(legacySourceFolder, '**', '*.js')
      ];
      staticResourcesFiles = [
        path.join(legacySourceFolder, '**', 'staticresources', '**', '*.html'),
        path.join(legacySourceFolder, '**', 'staticresources', '**', '*.css'),
        path.join(legacySourceFolder, '**', 'staticresources', '**', '*.js')
      ];
    } else if (projectDevModel === 'org' || projectDevModel === 'package') {
      sonarConfig['sonar.sources'] = sfdxSourceFolder;
      sonarInclusions = [
        path.join(sfdxSourceFolder, '**', '*.cls'),
        path.join(sfdxSourceFolder, '**', '*.trigger'),
        path.join(sfdxSourceFolder, '**', '*.js')
      ];
      staticResourcesFiles = [
        path.join(sfdxSourceFolder, '**', 'staticresources', '**', '*.html'),
        path.join(sfdxSourceFolder, '**', 'staticresources', '**', '*.css'),
        path.join(sfdxSourceFolder, '**', 'staticresources', '**', '*.js')
      ];
    } else {
      sonarConfig['sonar.sources'] = '.';
      sonarInclusions = [
        path.join('**', '*.js'),
      ];
    }

    if (process.env.CODE_COVERAGE) {
      sonarConfig['sonar.javascript.lcov.reportPaths'] = path.join(
        process.env.CODE_COVERAGE, 'lcov.info');
      const codeCoverageFiles = path.join(process.env.CODE_COVERAGE, '**', '*');
      sonarExclusions.push(codeCoverageFiles);
    }
    sonarExclusions = sonarExclusions.concat(staticResourcesFiles);
    sonarConfig['sonar.exclusions'] = sonarExclusions.join(',');
    sonarConfig['sonar.inclusions'] = sonarInclusions.join(',');

    if (ci.env.isCi) {
      gulpLog(`You should create a ${sonarPropertiesFile} file and move this configuration into it:
          \n${parser.convertObjectToString(sonarConfig)}\n`);
    }
    return config.writeConfigFromObject('.', sonarPropertiesFile, sonarConfig, 'properties')
      .then((response) => {
        gulpLog(colors.green(response));
      });
  })
  .catch(err => Promise.reject(err));

const writeSonarLintFile = () => setSonarVars()
  .then(() => sonarlint.writeSonarLintFile(sonarURL, projectKey))
  .catch(err => Promise.reject(err));

module.exports = {
  propertiesFile: sonarPropertiesFile,
  sonarLintProjectConfig: sonarlint.sonarLintProjectConfig,
  sonarURL,
  writeConfigFiles: (passedArguments, projectModel) => {
    // Throw error if mandatory values can't be found.
    if (ci.env.isCi && !ci.env.slug) {
      const err = `Mandatory properties like the Sonar.projectKey not available, skipping creation of ${sonarPropertiesFile} and ${sonarlint.sonarLintProjectConfig}`;
      return Promise.reject(err);
    }
    resetSonarVars();
    return writeSonarProjectProperties(passedArguments, projectModel)
      .then(writeSonarLintFile)
      .catch(err => Promise.reject(err));
  },
  writeSonarLintFile,
};
