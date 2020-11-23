/* eslint-disable no-else-return, global-require */
const { executeCommand, ERR_BAD_PLATFORM } = require('../tool-helpers');

const toolName = 'Vlocity DX';
const manualInstallUrl = 'https://vlocity.s3.amazonaws.com/electron/index.html';

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

const versionCommand = (platform) => {
  if (platform === 'darwin') {
    return 'osascript -e \'version of app "Vlocity DX"\'';
  } else if (platform === 'win32') {
    return () => new Promise((resolve, reject) => {
      executeCommand('powershell.exe -Command "Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion | Where-Object {$_.DisplayName -like \'Vlocity DX*\'} | ConvertTo-Json;"', false, true)
        .then((versionResult) => {
          if (versionResult.out) {
            const versionResultObj = JSON.parse(versionResult.out);
            if (versionResultObj.DisplayVersion) {
              return versionResultObj;
            }
          }
          return executeCommand('powershell.exe -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion | Where-Object {$_.DisplayName -like \'Vlocity DX*\'} | ConvertTo-Json;"', false, true);
        })
        .then((versionResult) => {
          if (versionResult.DisplayVersion) {
            resolve(versionResult.DisplayVersion);
          } else if (versionResult.out) {
            const versionResultObj = JSON.parse(versionResult.out);
            if (versionResultObj.DisplayVersion) {
              resolve(versionResultObj.DisplayVersion);
            }
          } else {
            reject(versionResult.err);
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
  vlocitydx: platform => ({
    id: 'vlocitydx',
    name: toolName,
    toolCategory: 'developmentEnvironmentTools',
    validPlatforms: ['darwin', 'win32'],
    platform: {
      versionCommand: versionCommand(platform),
      dependencies: [],
      adminPrivileges: false,
      installation: manualInstallUrl,
      installationHelp: installationHelp(),
      installType: 'link',
      manualInstallUrl,
    },
  }),
};
