const toolName = 'Vlocity Build';
const toolInstallName = 'vlocity';
const vlocityVersionCommand = 'vlocity';

const installationHelp = () => {
  const installHelp = require('../installation-help');
  return `
    <ul class="slds-list_dotted">
    ${installHelp.yarnDependenciesInstalledButNotRecognized(toolName, vlocityVersionCommand)}
    ${installHelp.installationErrorForYarnDependencies(toolName)}
    ${installHelp.behindProxy(toolName)}
    ${installHelp.manualWorkaroundForYarnDependencies(toolInstallName, vlocityVersionCommand)}
    </ul>
  `;
};

module.exports = {
  vlocitybuild: () => ({
    id: 'vlocitybuild',
    name: toolName,
    toolCategory: 'developmentEnvironmentTools',
    validPlatforms: ['darwin', 'win32'],
    platform: {
      versionCommand: vlocityVersionCommand,
      recommendedVersion: '1.12.10',
      dependencies: ['yarn'],
      adminPrivileges: false,
      installation: 'yarn global add vlocity',
      installationHelp: installationHelp(),
      manualInstallUrl: 'https://www.npmjs.com/package/vlocity',
    },
  }),
};
