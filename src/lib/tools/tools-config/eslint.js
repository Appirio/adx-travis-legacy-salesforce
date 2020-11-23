const toolName = 'Eslint';
const toolInstallName = 'eslint';
const eslintVersionCommand = 'eslint --version';

const installationHelp = () => {
  const installHelp = require('../installation-help');
  return `
    <ul class="slds-list_dotted">
    ${installHelp.yarnDependenciesInstalledButNotRecognized(toolName, eslintVersionCommand)}
    ${installHelp.installationErrorForYarnDependencies(toolName)}
    ${installHelp.behindProxy(toolName)}
    ${installHelp.manualWorkaroundForYarnDependencies(toolInstallName, eslintVersionCommand)}
    </ul>
  `;
};

module.exports = {
  eslint: () => ({
    id: 'eslint',
    name: toolName,
    toolCategory: 'lintingTestingAnalysisTools',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
    platform: {
      versionCommand: eslintVersionCommand,
      recommendedVersion: '6.8.0',
      dependencies: ['yarn'],
      adminPrivileges: false,
      installation: 'yarn global add eslint',
      installationHelp: installationHelp(),
      manualInstallUrl: 'https://eslint.org/docs/user-guide/getting-started',
    },
  }),
};
