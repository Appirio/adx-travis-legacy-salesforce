/* eslint-disable no-else-return, global-require */
const { executeCommand, ERR_BAD_PLATFORM } = require('../tool-helpers');

const toolName = 'Sourcetree';
const formula = 'sourcetree';
const manualInstallUrl = 'https://www.sourcetreeapp.com/';

const needsAdminPrivileges = {
  darwin: false,
  win32: true,
};

const installation = platform => () => new Promise((resolve, reject) => {
  const { brewInstaller, chocoInstaller } = require('../tool-installation');
  const admin = needsAdminPrivileges[platform];
  if (platform === 'darwin') {
    brewInstaller.install(formula, admin, true)
      // for cask installations
      // resolve after 10 seconds
      // so that apple script is able to find the tool
      .then(installationResult => setTimeout(() => resolve(installationResult), 10000))
      .catch(installationError => reject(installationError));
  } else if (platform === 'win32') {
    chocoInstaller.install(formula, toolName, admin)
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
    <li>
      <strong>You may need to switch between tabs to see the correct SourceTree version.</strong>
    </li>
    <br>
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
    return 'osascript -e \'version of app "SourceTree"\'';
  } else if (platform === 'win32') {
    return () => new Promise((resolve, reject) => {
      let streePath = 'Sourcetree';
      streePath = streePath.replace(/\\/gm, '\\\\');
      executeCommand(`wmic product where name="${streePath}" get Version /value`, false, true)
        .then((versionResult) => {
          if (typeof versionResult.err === 'string'
            && versionResult.err.toLowerCase().includes('no instance(s) available')) {
            const errStr = `${streePath} was not found!`;
            reject(errStr);
          } else {
            resolve(versionResult.out);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  } else {
    return ERR_BAD_PLATFORM;
  }
};

module.exports = {
  sourcetree: platform => ({
    id: 'sourcetree',
    name: toolName,
    toolCategory: 'otherUtilities',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
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
