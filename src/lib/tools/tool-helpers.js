const ERR_BAD_PLATFORM = 'Unknown platform!';
const ERR_OSX_ONLY = 'This tool is only available on OS X!';
const ERR_WIN_ONLY = 'This tool is only available on Windows!';

const brewNodeFormula = 'node@12';
const macNodeBinPath = `/usr/local/opt/${brewNodeFormula}/bin`;

const executeCommand = (command, requiresAdmin = false, returnAsObject = false) => new Promise((resolve, reject) => {
  if (typeof command === 'function') {
    const retVal = command();
    if (retVal instanceof Promise) {
      retVal
        .then(result => resolve(result))
        .catch(err => reject(err));
    } else {
      resolve(retVal);
    }
  } else if (typeof command === 'string') {
    if (requiresAdmin) {
      const sudo = require('sudo-prompt');
      const { isRestrictedPowershell } = require('../util/env');

      const sudoOptions = {
        name: 'DiXie',
      };
      const sudoCallbackFunc = (error, stdout = '', stderr = '') => {
        if (!error) {
          resolve(stdout);
        } else {
          const errMsg = `${error} ${stderr}`;
          reject(errMsg);
        }
      };

      if (process.platform === 'win32' && isRestrictedPowershell()) {
        const sudoWin = require('../util/sudo-prompt-win');
        sudoWin.exec(command, sudoOptions, sudoCallbackFunc);
      } else {
        sudo.exec(command, sudoOptions, sudoCallbackFunc);
      }
    } else {
      const shell = require('shelljs');

      shell.exec(command, (code, stdout, stderr) => {
        if ((code !== 0 && code !== null) && stderr !== '') {
          const errMsg = `Failed with code ${code}: ${stderr}`;
          reject(errMsg);
        } else if (returnAsObject) {
          resolve({
            out: stdout,
            err: stderr,
            code,
          });
        } else {
          resolve(stdout);
        }
      });
    }
  } else {
    reject(new Error('Invalid command!'));
  }
});

const fixWhiteSpace = (input) => {
  if (input.indexOf(' ') > -1) {
    return `"${input}"`;
  }
  return input;
};

const executeIcingCommand = (command, cmdOptions) => {
  return new Promise((resolve, reject) => {
    let cmd = command[0];
    const args = command.length > 1 ? command.slice(1) : [];
    const { spawn } = require('child_process');

    if (cmd === 'node') {
      const which = require('which');
      const resolved = which.sync('node', { nothrow: true });
      if (resolved) {
        cmd = resolved;
      }
    }

    const execCmd = spawn(fixWhiteSpace(cmd), args, cmdOptions);
    execCmd.stdout.on('data', (data) => {
      console.log(`  ${data}`);
    });

    execCmd.stderr.on('data', (data) => {
      console.log(`  ! ${data}`);
    });

    execCmd.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error('  ! Error in command execution.'));
      }
      return resolve();
    });
  });
};

const fixFieldType = (fieldType, inputValue) => {
  const stripAnsi = require('strip-ansi');
  let newValue = inputValue;
  if (typeof newValue === 'string') {
    newValue = stripAnsi(newValue);
  }
  if (fieldType === 'toggle') {
    if (typeof newValue !== 'boolean') {
      if (typeof newValue === 'string') {
        newValue = (/true/i).test(newValue);
      } else {
        newValue = Boolean(newValue);
      }
    }
  } else if (fieldType === 'number') {
    if (typeof newValue !== 'number') {
      newValue = Number(newValue);
      if (Number.isNaN(newValue)) {
        newValue = 0;
      }
    }
  } else if (['text', 'email', 'password', 'picklist'].includes(fieldType)) {
    if (typeof newValue !== 'string') {
      if (newValue === null && newValue === undefined) {
        newValue = '';
      } else {
        newValue = String(newValue);
      }
    }
    newValue = newValue.trim();
  }
  return newValue;
};

const updateMacPathAndRun = (command) => {
  const shell = require('shelljs');
  const { getLatestMacPath } = require('../util/env');
  const latestMacPath = getLatestMacPath();
  if (latestMacPath !== '') {
    shell.env.PATH = latestMacPath;
  }
  return command;
};

module.exports = {
  ERR_BAD_PLATFORM,
  ERR_OSX_ONLY,
  ERR_WIN_ONLY,
  brewNodeFormula,
  macNodeBinPath,
  executeCommand,
  executeIcingCommand,
  fixFieldType,
  updateMacPathAndRun,
};
