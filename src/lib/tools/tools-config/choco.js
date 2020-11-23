/* eslint-disable global-require */
const shell = require('shelljs');
const { getLatestWindowsPath } = require('../../util/env');
const { executeCommand, ERR_WIN_ONLY } = require('../tool-helpers');

const toolName = 'Chocolatey';
const manualInstallUrl = 'https://chocolatey.org/install';

const needsAdminPrivileges = true;

const installation = (platform) => {
  if (platform === 'win32') {
    return () => new Promise((resolve, reject) => {
      const admin = needsAdminPrivileges;
      let tempResult;
      executeCommand('@"%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://chocolatey.org/install.ps1\'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\\chocolatey\\bin"', admin)
        .then((installResult) => {
          tempResult = installResult.toLowerCase();
          return getLatestWindowsPath();
        })
        .then((outputPath) => {
          if (outputPath !== '') {
            shell.env.PATH = outputPath;
          }
          resolve(tempResult);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  return ERR_WIN_ONLY;
};

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

const versionCommand = 'choco -v';

module.exports = {
  choco: platform => ({
    id: 'choco',
    name: toolName,
    toolCategory: 'requiredTools',
    validPlatforms: ['win32'],
    preferred: true,
    platform: {
      versionCommand,
      dependencies: [],
      adminPrivileges: needsAdminPrivileges,
      installation: installation(platform),
      installationHelp: installationHelp(),
      manualInstallUrl,
    },
  }),
};
