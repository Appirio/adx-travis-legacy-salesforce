const toolName = 'Salesforce CLI';
const toolInstallName = 'sfdx-cli';
const sfdxVersionCommand = 'sfdx -v';
const sfdxcliInstallCommand = 'yarn global add sfdx-cli';
const sfdxcliUninstallCommand = 'yarn global remove sfdx-cli';
const sfdxPluginUninstallCommand = 'sfdx plugins:uninstall salesforcedx';

const installationHelp = () => {
  const installHelp = require('../installation-help');
  return `
    <ul class="slds-list_dotted">
    ${installHelp.yarnDependenciesInstalledButNotRecognized(toolName, sfdxVersionCommand)}
    ${installHelp.installationErrorForYarnDependencies(toolName)}
    ${installHelp.behindProxy(toolName)}
    ${installHelp.manualWorkaroundForYarnDependencies(toolInstallName, sfdxVersionCommand)}
    </ul>
  `;
};

const upgrade = () => () => {
  const { executeCommand } = require('../tool-helpers');
  return new Promise((resolve, reject) => {
    let tempResult = '';
    executeCommand(sfdxcliUninstallCommand)
      .then((uninstallationResult) => {
        tempResult = uninstallationResult;
        console.log(tempResult);
        return executeCommand(sfdxcliInstallCommand);
      })
      .then((installationResult) => {
        tempResult += ` \n\n ${installationResult}`;
        console.log(tempResult);
        return executeCommand(sfdxPluginUninstallCommand)
          .catch(pluginError => `Ignored error in uninstalling salesforcedx plugin: ${pluginError}`);
      })
      .then((pluginResult) => {
        if (pluginResult !== '') {
          tempResult += ` \n\n ${pluginResult}`;
          console.log(tempResult);
        }
        resolve(tempResult);
      })
      .catch((installationError) => {
        console.log(tempResult);
        return reject(installationError);
      });
  });
};

module.exports = {
  sfdx: () => ({
    id: 'sfdx',
    name: toolName,
    toolCategory: 'requiredTools',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
    platform: {
      versionCommand: sfdxVersionCommand,
      recommendedVersion: '7.71.0',
      dependencies: ['yarn'],
      adminPrivileges: false,
      upgrade: upgrade(),
      installation: sfdxcliInstallCommand,
      installationHelp: installationHelp(),
      manualInstallUrl: 'https://developer.salesforce.com/tools/sfdxcli',
    },
  }),
};
