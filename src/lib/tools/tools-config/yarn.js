/* eslint-disable global-require, no-else-return */
const path = require('path');
const os = require('os');
const fs = require('fs');
const shell = require('shelljs');
const { executeCommand, updateMacPathAndRun, fixFieldType, ERR_BAD_PLATFORM } = require('../tool-helpers');
const { addToMacPath, addToWindowsPath } = require('../../util/env');

const currentOS = os.platform();
const toolName = 'Yarn';
const brewFormula = 'yarn';
const chocoPackage = 'yarn';
const manualInstallUrl = 'https://yarnpkg.com/en/docs/install';

const yarnDefaultParentDir = path.join(os.homedir(), '.config');
const yarnHome = path.join(os.homedir(), '.yarn');
const yarnPath = path.join(yarnHome, 'bin');
const PATH_NOT_SET = 'Path not set';

const needsAdminPrivileges = {
  darwin: false,
  win32: true,
};

const versionCommand = 'yarn -v';

const getVersion = {
  darwin: updateMacPathAndRun(versionCommand),
  win32: versionCommand,
};

const installation = platform => () => new Promise((resolve, reject) => {
  const admin = needsAdminPrivileges[platform];
  const { brewInstaller, chocoInstaller } = require('../tool-installation');
  if (platform === 'darwin') {
    let tempResult = '';
    brewInstaller.install(brewFormula, admin)
      .then((installationResult) => {
        tempResult = installationResult;
        if (fs.existsSync(yarnDefaultParentDir)) {
          console.log('~/.config exists. Changing ownership......');
          return executeCommand(`chown -R $USER:$(id -gn $USER) ${yarnDefaultParentDir}`, true);
        } else {
          return '';
        }
      })
      .then((lastResult) => {
        if (lastResult !== '') {
          tempResult += ` \n\n ${lastResult}`;
        }
        resolve(tempResult);
      })
      .catch(installationError => reject(installationError));
  } else if (platform === 'win32') {
    chocoInstaller.install(chocoPackage, toolName, admin)
      .then(installationResult => resolve(installationResult))
      .catch(installationError => reject(installationError));
  } else {
    reject(ERR_BAD_PLATFORM);
  }
});

const installationHelp = () => {
  const installHelp = require('../installation-help');
  return `
    <ul class="slds-list_dotted">
    ${installHelp.installedButNotRecognized(toolName)}
    ${installHelp.behindProxy(toolName)}
    ${installHelp.manualWorkaround(manualInstallUrl)}
    </ul>
  `;
};

const dependencies = {
  darwin: ['brew', 'node'],
  win32: ['choco', 'node'],
};

const getYarnConfig = setting => `yarn config get ${setting}`;

const setYarnConfig = (setting, fieldType) => (value) => {
  const newValue = fixFieldType(fieldType, value);
  if (newValue !== '') {
    return `yarn config set ${setting} "${newValue}"`;
  }
  return `yarn config delete ${setting}`;
};

const getPath = () => {
  // System independent way to determine if a path is present or not
  const currentPaths = process.env.PATH.split(path.delimiter);
  return currentPaths.find(dir => dir === yarnPath) || PATH_NOT_SET;
};

const setPath = value => () => new Promise((resolve, reject) => {
  if (currentOS === 'darwin') {
    if (getPath() === PATH_NOT_SET) {
      addToMacPath(value)
        .then((outputPath) => {
          if (outputPath !== '') {
            shell.env.PATH = outputPath;
          }
        });
    } else {
      console.log('Path to Yarn already set!');
    }
    if (fs.existsSync(yarnHome)) {
      executeCommand(`chown -R $USER:$(id -gn $USER) ${yarnHome}`, true)
        .then(resolve)
        .catch(reject);
    } else {
      resolve();
    }
  } else if (currentOS === 'win32') {
    if (getPath() === PATH_NOT_SET) {
      console.log('Adding Yarn bin directory to Path...');
      addToWindowsPath(value)
        .then((outputPath) => {
          if (outputPath !== '') {
            shell.env.PATH = outputPath;
          }
          resolve();
        })
        .catch((err) => {
          console.log('Error in adding Yarn bin directory to Path...');
          reject(err);
        });
    } else {
      console.log('Path to Yarn already set!');
      resolve();
    }
  } else {
    reject(ERR_BAD_PLATFORM);
  }
});

const isPrefixSetToUserDir = () => {
  const getPrefix = getYarnConfig('prefix');
  return executeCommand(getPrefix, false)
    .then(prefix => prefix.startsWith(os.homedir()));
};

module.exports = {
  yarn: platform => ({
    id: 'yarn',
    name: toolName,
    toolCategory: 'requiredTools',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
    setProxy: true,
    isPrefixSetToUserDir,
    platform: {
      versionCommand: getVersion[platform],
      recommendedVersion: '1.22.0',
      minimumVersion: '1.22.0',
      dependencies: dependencies[platform],
      adminPrivileges: needsAdminPrivileges[platform],
      installation: installation(platform),
      installationHelp: installationHelp(),
      manualInstallUrl,
      configuration: {
        configType: 'command',
        localOnly: true,
        components: [{
          item: 'networkTimeout',
          label: 'Timeout for Yarn network requests',
          getValue: getYarnConfig('network-timeout'),
          setValue: setYarnConfig('network-timeout', 'number'),
          fieldType: 'number',
          validation: {
            min: 600000,
          },
          default: 600000,
          sortOrder: 1,
        }, {
          item: 'prefix',
          label: 'Yarn package folder',
          getValue: getYarnConfig('prefix'),
          setValue: setYarnConfig('prefix', 'text'),
          fieldType: 'text',
          default: yarnHome,
          sortOrder: 2,
        }, {
          item: 'path',
          label: 'Are Yarn modules included in your path?',
          getValue: getPath,
          setValue: setPath,
          fieldType: 'text',
          default: yarnPath,
          sortOrder: 3,
        }],
      },
    },
  }),
};
