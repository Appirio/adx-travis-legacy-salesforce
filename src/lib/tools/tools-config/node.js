/* eslint-disable global-require, no-else-return */
const shell = require('shelljs');
const { updateMacPathAndRun, ERR_BAD_PLATFORM } = require('../tool-helpers');
const { processError } = require('../../util/misc');
const { addToMacPath } = require('../../util/env');
const { brewNodeFormula, macNodeBinPath } = require('../tool-helpers');

const toolName = 'Node.js';
const brewFormula = brewNodeFormula;
const chocoPackage = 'nodejs-lts --version 12.18.3';
const manualInstallUrl = 'https://nodejs.org/en/download/';

const updateMacProfileForNode = `echo 'export PATH="${macNodeBinPath}:$PATH"' >>`;

const needsAdminPrivileges = {
  darwin: false,
  win32: true,
};

const dependencies = {
  darwin: ['brew'],
  win32: ['choco'],
};

const versionCommand = 'node -v';

const getVersion = {
  darwin: updateMacPathAndRun(versionCommand),
  win32: versionCommand,
};

const setMacNodeBinPath = async () => {
  const newPath = await addToMacPath(macNodeBinPath);
  if (newPath !== '') {
    shell.env.PATH = newPath;
  }
  return newPath;
};

const installation = platform => () => new Promise((resolve, reject) => {
  const admin = needsAdminPrivileges[platform];
  const { brewInstaller, chocoInstaller } = require('../tool-installation');
  if (platform === 'darwin') {
    let tempResult = '';
    brewInstaller.install(brewFormula, admin)
      .then((installationResult) => {
        tempResult = installationResult;
        if (installationResult.toLowerCase().includes(updateMacProfileForNode.toLowerCase())) {
          return setMacNodeBinPath();
        } else {
          return '';
        }
      })
      .then((updateMacProfileResult) => {
        if (updateMacProfileResult !== '') {
          tempResult += ` \n\n ${updateMacProfileResult}`;
        }
        resolve(tempResult);
      })
      .catch((installationError) => {
        const error = processError(installationError).message;
        if (error.toLowerCase().includes(updateMacProfileForNode.toLowerCase())) {
          setMacNodeBinPath()
            .then((updateMacProfileResult) => {
              if (tempResult === '') {
                resolve(updateMacProfileResult);
              } else {
                tempResult += ` \n\n ${updateMacProfileResult}`;
                resolve(tempResult);
              }
            })
            .catch(updateMacProfileError => reject(updateMacProfileError));
        } else {
          reject(error);
        }
      });
  } else if (platform === 'win32') {
    chocoInstaller.install(chocoPackage, toolName, admin)
      .then(installationResult => resolve(installationResult))
      .catch(installationError => reject(installationError));
  } else {
    reject(ERR_BAD_PLATFORM);
  }
});

const installationHelp = (platform) => {
  const installHelp = require('../installation-help');
  let help = '';

  help += '<ul class="slds-list_dotted">';
  help += `${installHelp.installedButNotRecognized(toolName)}`;
  if (platform === 'darwin') {
    help += `${installHelp.installationErrorForMac(toolName, brewFormula, versionCommand)}`;
  }
  help += `${installHelp.behindProxy(toolName)}`;
  help += `${installHelp.manualWorkaround(manualInstallUrl)}`;
  help += '</ul>';

  return help;
};

module.exports = {
  node: platform => ({
    id: 'node',
    name: toolName,
    toolCategory: 'requiredTools',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
    setProxy: true,
    platform: {
      versionCommand: getVersion[platform],
      recommendedVersion: '12.16.1',
      minimumVersion: '12.16.1',
      dependencies: dependencies[platform],
      adminPrivileges: needsAdminPrivileges[platform],
      installation: installation(platform),
      installationHelp: installationHelp(platform),
      manualInstallUrl,
    },
  }),
};
