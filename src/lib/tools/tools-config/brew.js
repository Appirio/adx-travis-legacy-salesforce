const toolName = 'Homebrew';
const manualInstallUrl = 'https://brew.sh/';

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

module.exports = {
  brew: () => ({
    id: 'brew',
    name: 'Homebrew',
    toolCategory: 'requiredTools',
    validPlatforms: ['darwin'],
    preferred: true,
    platform: {
      versionCommand: 'brew -v',
      dependencies: [],
      adminPrivileges: false,
      installation: '/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"',
      installationHelp: installationHelp(),
      manualInstallUrl,
      installType: 'link',
    },
  }),
};
