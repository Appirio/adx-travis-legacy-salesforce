/* eslint-disable no-else-return, global-require */
const fs = require('fs');
const os = require('os');
const { fixFieldType, ERR_BAD_PLATFORM } = require('../tool-helpers');

const currentOS = os.platform();
const toolName = 'Visual Studio Code';
const brewFormula = 'visual-studio-code';
const chocoPackage = 'vscode';
const manualInstallUrl = 'https://code.visualstudio.com/download';

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
    ${installHelp.installedButNotRecognized(toolName, true)}
    ${installHelp.behindProxy(toolName)}
    ${installHelp.manualWorkaround(manualInstallUrl)}
    </ul>
  `;
};

const dependencies = {
  darwin: ['brew'],
  win32: ['choco'],
};

const fileLocation = (platform) => {
  if (platform === 'darwin') {
    return `${os.homedir()}/Library/Application Support/Code/User/settings.json`;
  } else if (platform === 'win32') {
    return `${os.homedir()}\\AppData\\Roaming\\Code\\User\\settings.json`;
  } else {
    return ERR_BAD_PLATFORM;
  }
};

const versionCommand = (platform) => {
  if (platform === 'darwin') {
    return 'osascript -e \'version of app "Visual Studio Code"\'';
  } else if (platform === 'win32') {
    return 'code -v';
  } else {
    return ERR_BAD_PLATFORM;
  }
};

const readSetting = settingKey => () => {
  const configFile = fileLocation(currentOS);
  let jsonObject = {};
  try {
    const JSONdata = fs.readFileSync(configFile, 'utf8');
    const jsonMinusTrailingCommas = JSONdata.replace(/(.*?),\s*(\}|])/g, '$1$2');
    jsonObject = JSON.parse(jsonMinusTrailingCommas);
  } catch (e) {
    // console.log(e);
  }
  return jsonObject[settingKey];
};

const writeSetting = (settingKey, fieldType) => value => () => {
  const path = require('path');
  const shell = require('shelljs');
  const beautify = require('js-beautify').js_beautify;
  const configFile = fileLocation(currentOS);
  let settingObject = {};
  try {
    const JSONdata = fs.readFileSync(configFile, 'utf8');
    settingObject = JSON.parse(JSONdata);
  } catch (e) {
    // console.log(e);
  }
  settingObject[settingKey] = fixFieldType(fieldType, value);
  const fileDir = path.dirname(configFile);
  if (!fs.existsSync(fileDir)) {
    shell.mkdir('-p', fileDir);
  }
  const fileContent = beautify(JSON.stringify(settingObject), {
    indent_size: 2,
    eol: os.EOL,
    end_with_newline: true,
  });
  fs.writeFileSync(configFile, fileContent);
  return 'Success!';
};

const vsconfig = platform => ({
  id: 'vscode',
  name: toolName,
  toolCategory: 'developmentEnvironmentTools',
  validPlatforms: ['darwin', 'win32'],
  preferred: true,
  platform: {
    versionCommand: versionCommand(platform),
    recommendedVersion: '1.42.0',
    minimumVersion: '1.40.0',
    dependencies: dependencies[platform],
    adminPrivileges: needsAdminPrivileges[platform],
    installation: installation(platform),
    installationHelp: installationHelp(),
    manualInstallUrl,
    configuration: {
      configType: 'json',
      configFile: fileLocation(platform),
      components: [{
        item: 'trimTrailingWhitespace',
        label: 'Trim Trailing Whitespace',
        key: 'files.trimTrailingWhitespace',
        fieldType: 'toggle',
        default: true,
        sortOrder: 1,
      }, {
        item: 'tabSize',
        label: 'Indent Size',
        key: 'editor.tabSize',
        fieldType: 'number',
        validation: {
          min: 1,
          max: 8,
        },
        default: 2,
        sortOrder: 2,
      }, {
        item: 'insertSpaces',
        label: 'Spaces instead of Tabs',
        key: 'editor.insertSpaces',
        fieldType: 'toggle',
        default: true,
        sortOrder: 3,
      }, {
        item: 'detectIndentation',
        label: 'Detect File Indentation',
        key: 'editor.detectIndentation',
        fieldType: 'toggle',
        default: true,
        sortOrder: 4,
      }, {
        item: 'formatOnSave',
        label: 'Format on Save',
        key: 'editor.formatOnSave',
        fieldType: 'toggle',
        default: true,
        sortOrder: 5,
      }, {
        item: 'insertFinalNewline',
        label: 'Insert a newline at the end of files',
        key: 'files.insertFinalNewline',
        fieldType: 'toggle',
        default: true,
        sortOrder: 6,
        /* }, {
          item: 'xmlToolsDontSplitNS',
          label: 'XMLTools Extension should not split namespace onto new line',
          key: 'xmlTools.splitXmlnsOnFormat',
          fieldType: 'toggle',
          default: false,
          sortOrder: 7, */
      }, {
        item: 'gitAutoFetch',
        label: 'Auto-fetch from Git',
        key: 'git.autofetch',
        fieldType: 'toggle',
        default: true,
        sortOrder: 7,
      }, {
        item: 'cmcExtension',
        label: 'Enable Auto-suggestions in comments (for CMC extension)',
        key: 'editor.quickSuggestions.comments',
        fieldType: 'toggle',
        default: true,
        sortOrder: 8,
      }],
    },
  },
});

module.exports = {
  vscode: (platform) => {
    const vscodeConfigObject = vsconfig(platform);
    vscodeConfigObject.platform.configuration.components.forEach((currSetting) => {
      const setting = currSetting;
      setting.getValue = readSetting(setting.key);
      setting.setValue = writeSetting(setting.key, setting.fieldType);
    });
    return vscodeConfigObject;
  },
};
