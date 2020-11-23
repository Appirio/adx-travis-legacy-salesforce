/* eslint-disable global-require,no-else-return */
const { updateMacPathAndRun, fixFieldType, ERR_BAD_PLATFORM } = require('../tool-helpers');
const config = require('../../config/config');

const toolName = 'Git';
const formula = 'git';
const manualInstallUrl = 'https://git-scm.com/downloads';

const needsAdminPrivileges = {
  darwin: false,
  win32: true,
};

const versionCommand = 'git --version';

const getVersion = {
  darwin: updateMacPathAndRun(versionCommand),
  win32: versionCommand,
};

const installation = platform => () => new Promise((resolve, reject) => {
  const { brewInstaller, chocoInstaller } = require('../tool-installation');
  const admin = needsAdminPrivileges[platform];
  if (platform === 'darwin') {
    brewInstaller.install(formula, admin)
      .then(installationResult => resolve(installationResult))
      .catch(installationError => reject(installationError));
  } else if (platform === 'win32') {
    chocoInstaller.install(formula, toolName, admin)
      .then(installationResult => resolve(installationResult))
      .catch(installationError => reject(installationError));
  } else {
    reject(ERR_BAD_PLATFORM);
  }
});

const dependencies = {
  darwin: ['brew'],
  win32: ['choco'],
};

const getGitConfig = setting => `git config --global ${setting}`;

const setGitConfig = (setting, fieldType) => (value) => {
  const newValue = fixFieldType(fieldType, value);
  if (newValue !== '') {
    return `git config --global ${setting} "${newValue}"`;
  }
  return `git config --global --unset ${setting}`;
};

const installationHelp = (platform) => {
  const installHelp = require('../installation-help');
  let help = '';

  help += '<ul class="slds-list_dotted">';
  help += `${installHelp.installedButNotRecognized(toolName)}`;
  if (platform === 'darwin') {
    help += `${installHelp.installationErrorForMac(toolName, formula, versionCommand)}`;
  }
  help += `${installHelp.behindProxy(toolName)}`;
  help += `${installHelp.manualWorkaroundForToolsWithSettings(toolName, manualInstallUrl)}`;
  help += '</ul>';

  return help;
};

const gitConfig = platform => ({
  id: 'git',
  name: toolName,
  toolCategory: 'versionControlTools',
  validPlatforms: ['darwin', 'win32'],
  preferred: true,
  setProxy: true,
  platform: {
    versionCommand: getVersion[platform],
    recommendedVersion: '2.25.0',
    dependencies: dependencies[platform],
    adminPrivileges: needsAdminPrivileges[platform],
    installation: installation(platform),
    installationHelp: installationHelp(platform),
    manualInstallUrl,
    configuration: {
      configType: 'command',
      components: [{
        item: 'name',
        label: 'Your Name in Git',
        key: 'user.name',
        fieldType: 'text',
        default: config.hasUserConfig('name') ? config.readUserConfig('name') : '',
        localOnly: true,
        sortOrder: 1,
      }, {
        item: 'email',
        label: 'Your Email in Git',
        key: 'user.email',
        fieldType: 'email',
        default: config.hasUserConfig('email') ? config.readUserConfig('email') : '',
        localOnly: true,
        sortOrder: 2,
      }, {
        item: 'diffAlgorithm',
        label: 'Git Diff Algorithm',
        key: 'diff.algorithm',
        fieldType: 'picklist',
        options: ['default', 'minimal', 'patience', 'histogram'],
        default: 'patience',
        sortOrder: 3,
      }, {
        item: 'pushesCreateUpstreamBranches',
        label: 'Pushing creates an upstream branch',
        key: 'push.default',
        fieldType: 'picklist',
        options: ['current', 'simple', 'upstream'],
        default: 'current',
        sortOrder: 4,
      }, {
        item: 'pushFollowTags',
        label: 'Pushes include Tags',
        key: 'push.followTags',
        fieldType: 'toggle',
        default: true,
        sortOrder: 5,
      }, {
        item: 'safecrlf___darwin',
        label: 'Line Endings (Safe) - Mac',
        key: 'core.safecrlf',
        fieldType: 'picklist',
        options: ['warn', 'true'],
        default: 'true',
        sortOrder: 6,
      }, {
        item: 'safecrlf___win32',
        label: 'Line Endings (Safe) - Windows',
        key: 'core.safecrlf',
        fieldType: 'picklist',
        options: ['warn', 'true'],
        default: 'warn',
        sortOrder: 7,
      }, {
        item: 'autocrlf___darwin',
        label: 'Line Endings (Change Automatically) - Mac',
        key: 'core.autocrlf',
        fieldType: 'picklist',
        options: ['input', 'true', 'false'],
        default: 'input',
        sortOrder: 8,
      }, {
        item: 'autocrlf___win32',
        label: 'Line Endings (Change Automatically) - Windows',
        key: 'core.autocrlf',
        fieldType: 'picklist',
        options: ['input', 'true', 'false'],
        default: 'true',
        sortOrder: 9,
      }, {
        item: 'osxkeychain___darwin',
        label: 'Git should use the OS X keychain',
        key: 'credential.helper',
        fieldType: 'picklist',
        options: ['osxkeychain'],
        default: 'osxkeychain',
        sortOrder: 10,
      }],
    },
  },
});

module.exports = {
  git: (platform) => {
    const gitConfigObject = gitConfig(platform);
    gitConfigObject.platform.configuration.components.forEach((currSetting) => {
      const setting = currSetting;
      setting.getValue = getGitConfig(setting.key);
      setting.setValue = setGitConfig(setting.key, setting.fieldType);
    });
    return gitConfigObject;
  },
};
