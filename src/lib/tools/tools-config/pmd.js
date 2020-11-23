/* eslint-disable no-else-return, global-require */
const { updateMacPathAndRun, ERR_BAD_PLATFORM } = require('../tool-helpers');

const toolName = 'PMD';
const formula = 'pmd';
const manualInstallUrl = 'https://pmd.github.io/';

const needsAdminPrivileges = {
  darwin: false,
  win32: true,
};

const versionCommand = {
  darwin: 'pmd pmd -h',
  win32: 'pmd -h',
};

const getVersion = {
  darwin: updateMacPathAndRun(versionCommand.darwin),
  win32: versionCommand.win32,
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

const installationHelp = (platform) => {
  const installHelp = require('../installation-help');
  let help = '';

  help += '<ul class="slds-list_dotted">';
  help += `${installHelp.installedButNotRecognized(toolName)}`;
  if (platform === 'win32') {
    help += `
      <li>
      <strong>Error during installation?</strong>
      <div>
        If this was not a PATH problem, please find the relevant error and its solution below:
        <ul>
          ${installHelp.javaDependencyErrorForPMD()}
        </ul>
      </div>
    </li>
    `;
  } else if (platform === 'darwin') {
    help += `${installHelp.installationErrorForMac(toolName, formula, versionCommand.darwin, true)}`;
  }
  help += `${installHelp.behindProxy(toolName)}`;
  help += `${installHelp.manualWorkaround(manualInstallUrl)}`;
  help += '</ul>';

  return help;
};

const dependencies = {
  darwin: ['brew'],
  win32: ['choco'],
};

module.exports = {
  pmd: platform => ({
    id: 'pmd',
    name: toolName,
    toolCategory: 'lintingTestingAnalysisTools',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
    platform: {
      versionCommand: getVersion[platform],
      recommendedVersion: '6.20.0',
      dependencies: dependencies[platform],
      adminPrivileges: needsAdminPrivileges[platform],
      installation: installation(platform),
      installationHelp: installationHelp(platform),
      manualInstallUrl,
    },
  }),
};
