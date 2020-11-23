/* eslint-disable no-else-return, global-require */
const { executeCommand, ERR_BAD_PLATFORM } = require('../tool-helpers');

const toolName = 'Sublime Text';
const brewFormula = 'sublime-text';
const chocoPackage = 'sublimetext3';
const manualInstallUrl = 'https://www.sublimetext.com/3';

const needsAdminPrivileges = {
  darwin: false,
  win32: true,
};

const installation = platform => () => new Promise((resolve, reject) => {
  const { brewInstaller, chocoInstaller } = require('../tool-installation');
  const admin = needsAdminPrivileges[platform];
  if (platform === 'darwin') {
    brewInstaller.install(brewFormula, admin, true)
      // for cask installations
      // resolve after 10 seconds
      // so that apple script is able to find the tool
      .then(installationResult => setTimeout(() => resolve(installationResult), 10000))
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
  darwin: ['brew'],
  win32: ['choco'],
};

const versionCommand = (platform) => {
  if (platform === 'darwin') {
    return "/Applications/'Sublime Text'.app/Contents/SharedSupport/bin/subl --version";
  } else if (platform === 'win32') {
    return () => new Promise((resolve, reject) => {
      executeCommand('"%ProgramFiles%\\Sublime Text 3\\subl.exe" --version')
        .then((versionResult) => {
          resolve(versionResult);
        })
        .catch(() => {
          executeCommand('subl.exe --version')
            .then((versionResult) => {
              resolve(versionResult);
            })
            .catch((err2) => {
              reject(err2);
            });
        });
    });
  } else {
    return ERR_BAD_PLATFORM;
  }
};

module.exports = {
  sublime: platform => ({
    id: 'sublime',
    name: toolName,
    toolCategory: 'developmentEnvironmentTools',
    validPlatforms: ['darwin', 'win32'],
    platform: {
      versionCommand: versionCommand(platform),
      dependencies: dependencies[platform],
      adminPrivileges: needsAdminPrivileges[platform],
      installation: installation(platform),
      installationHelp: installationHelp(),
      manualInstallUrl,
    },
  }),
};
