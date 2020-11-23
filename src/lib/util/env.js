const os = require('os');
const { execSync } = require('child_process');

const ERR_BAD_INPUT_PATH = 'Invalid input was provided to add to PATH!';

let MAC_SHELL = '';
let PROFILE_FILE = '';
let POWERSHELL_ENABLED = false;
let RESTRICTED_POWERSHELL = true;

if (os.platform() === 'darwin') {
  MAC_SHELL = '/bin/bash';
  PROFILE_FILE = '.bash_profile';
  if (process.env.SHELL === '/bin/zsh') {
    MAC_SHELL = '/bin/zsh';
    PROFILE_FILE = '.zshrc';
  }
} else if (os.platform() === 'win32') {
  try {
    POWERSHELL_ENABLED = true;
    const psCheckResult = execSync('powershell.exe -Command "$env:Path;"', {
      stdio: 'pipe',
    }).toString().trim();
    if (psCheckResult !== '') {
      RESTRICTED_POWERSHELL = false;
    }
  } catch (err) {
    POWERSHELL_ENABLED = false;
  }
} else {
  // Do Nothing
}

const isPowershellEnabled = () => POWERSHELL_ENABLED;

const isRestrictedPowershell = () => RESTRICTED_POWERSHELL;

const getLatestMacEnvVars = () => {
  let envVars = {};
  if (MAC_SHELL) {
    const shellEnv = require('shell-env');
    envVars = shellEnv.sync(MAC_SHELL);
  }
  return envVars;
};

const getLatestMacPath = () => {
  let latestPath = '';
  if (MAC_SHELL) {
    const envVars = getLatestMacEnvVars();
    if (envVars) {
      latestPath = String(envVars.PATH).trim();
    }
  }
  console.log('Latest Mac Path >>>', latestPath);
  return latestPath;
};

const getLatestWindowsPath = async () => {
  let latestPath = '';
  try {
    if (os.platform() === 'win32' && POWERSHELL_ENABLED) {
      const machinePath = '$machine_path = [System.Environment]::GetEnvironmentVariable(\'path\', \'Machine\'); ';
      const userPath = '$user_path = [System.Environment]::GetEnvironmentVariable(\'path\', \'User\'); ';
      const machinePlusUserPath = '$env:Path = $machine_path + \';\' + $user_path; ';
      const printPath = '$env:Path;';
      latestPath = execSync(`powershell.exe "${machinePath}${userPath}${machinePlusUserPath}${printPath}"`, {
        stdio: 'pipe',
      }).toString().trim();
    }
    console.log('Latest Win Path >>>', latestPath);
    return latestPath;
  } catch (e) {
    return process.env.PATH;
  }
};

const addToMacPath = async (pathToAdd) => {
  if (MAC_SHELL) {
    if (typeof pathToAdd === 'string' && pathToAdd.trim() !== '') {
      const { executeCommand } = require('../tools/tool-helpers');
      await executeCommand(`echo '\nexport PATH="${pathToAdd.trim()}":$PATH\n' >> ~/${PROFILE_FILE}`);
      return getLatestMacPath();
    }
    throw new Error(ERR_BAD_INPUT_PATH);
  }
  return '';
};

const addToWindowsPath = async (pathToAdd) => {
  let latestPath = '';
  try {
    console.log('Existing Win Path >>>', process.env.PATH);
    if (os.platform() === 'win32' && POWERSHELL_ENABLED) {
      console.log(`Path to add ${pathToAdd}`);
      const desiredEntry = `$desired_entry = '${pathToAdd}'; `;
      const oldUserPath = '$old_user_path = [System.Environment]::GetEnvironmentVariable(\'path\', \'User\'); ';
      const newUserPath = '$new_user_path = $desired_entry + \';\' + $old_user_path; ';
      const setNewUserPath = '[System.Environment]::SetEnvironmentVariable(\'path\', $new_user_path, \'User\'); ';
      const machinePath = '$machine_path = [System.Environment]::GetEnvironmentVariable(\'path\', \'Machine\'); ';
      const machinePlusUserPath = '$env:Path = $machine_path + \';\' + $new_user_path; ';
      const printPath = '$env:Path;';
      latestPath = execSync(`powershell.exe "${desiredEntry}${oldUserPath}${newUserPath}${setNewUserPath}${machinePath}${machinePlusUserPath}${printPath}"`, {
        stdio: 'pipe',
      }).toString().trim();
    }
    console.log('New Win Path >>>', latestPath);
    return latestPath;
  } catch (e) {
    return process.env.PATH;
  }
};

const refreshMacEnvVars = () => {
  if (MAC_SHELL) {
    const envVars = getLatestMacEnvVars();
    if (envVars) {
      const shell = require('shelljs');
      const envVarsToExclude = ['_', 'SHLVL', 'XPC_FLAGS', 'XPC_SERVICE_NAME'];
      Object.keys(envVars)
        .filter(key => !envVarsToExclude.includes(key))
        .forEach((key) => {
          shell.env[key] = envVars[key];
        });
    }
  }
};

module.exports = {
  MAC_SHELL,
  PROFILE_FILE,
  isPowershellEnabled,
  isRestrictedPowershell,
  getLatestMacEnvVars,
  getLatestMacPath,
  getLatestWindowsPath,
  addToMacPath,
  addToWindowsPath,
  refreshMacEnvVars,
};
