/* eslint-disable no-else-return */
const fs = require('fs');
const path = require('path');
const os = require('os');
const shell = require('shelljs');
const { spawn } = require('child_process');
const { executeCommand, ERR_BAD_PLATFORM } = require('./tool-helpers');
const { addToMacPath, addToWindowsPath } = require('../util/env');
const { processError } = require('../util/misc');

const currentOS = os.platform();

const checkForAdxPath = () => {
  if (currentOS === 'darwin') {
    return executeCommand('which adx');
  } else if (currentOS === 'win32') {
    return executeCommand('where adx');
  } else {
    throw ERR_BAD_PLATFORM;
  }
};

const addToPath = async (folder) => {
  if (!process.env.PATH.includes(folder)) {
    if (currentOS === 'darwin') {
      const newPath = await addToMacPath(folder);
      if (newPath !== '') {
        shell.env.PATH = newPath;
      }
      return newPath;
    } else if (currentOS === 'win32') {
      const newPath = await addToWindowsPath(folder);
      if (newPath !== '') {
        shell.env.PATH = newPath;
      }
      return newPath;
    } else {
      throw ERR_BAD_PLATFORM;
    }
  }
  return process.env.PATH;
};

const renameFiles = async (currentPath, adxBinaryPath) => {
  const origAdxPath = currentPath.trim();
  console.log('Current Path:', currentPath);
  if (currentOS === 'darwin') {
    // rename adx to adx_old
    const existingAdxDirname = path.dirname(origAdxPath);
    const existingAdxNewPath = path.join(existingAdxDirname, 'adx_old');
    const adxOldBinPath = path.join(adxBinaryPath, 'adx_old');
    const adxCorrectBinPath = path.join(adxBinaryPath, 'adx');
    console.log('adxOldBinPath:', adxOldBinPath);
    console.log('adxCorrectBinPath:', adxCorrectBinPath);
    if (fs.existsSync(adxOldBinPath)) {
      await executeCommand(`mv "${adxOldBinPath}" "${adxCorrectBinPath}"`);
    }
    console.log('existingAdxNewPath:', existingAdxNewPath);
    return executeCommand(`mv "${origAdxPath}" "${existingAdxNewPath}"`);
  } else if (currentOS === 'win32') {
    // rename adx to adx_old and adx.cmd to adx_old.cmd
    const splitPath = origAdxPath.split('\n');
    const adxOldBinPath = path.join(adxBinaryPath, 'adx_old');
    if (fs.existsSync(adxOldBinPath)) {
      await executeCommand(`rename "${adxOldBinPath}" adx`);
    }
    const adxOldCmdPath = path.join(adxBinaryPath, 'adx_old.cmd');
    if (fs.existsSync(adxOldCmdPath)) {
      await executeCommand(`rename "${adxOldCmdPath}" adx.cmd`);
    }
    return Promise.all([executeCommand(`rename "${splitPath[0]}" adx_old`), executeCommand(`rename "${splitPath[1]}" adx_old.cmd`)]);
  }
  throw ERR_BAD_PLATFORM;
};

const uninstallAdx = () => {
  const cmd = 'yarn';
  const args = ['global', 'remove', '@appirio/dx'];
  const cmdOptions = {
    shell: true,
    detached: true,
  };
  // run uninstallation in a detached child process
  return spawn(cmd, args, cmdOptions);
};

const mapAdxBinary = adxBinaryPath => checkForAdxPath() // check for the path where adx exists
  .then((adxPathResult) => {
    if (adxPathResult === '' || adxPathResult === 'adx not found') {
      // if no adx CLI is present already, simply add the resources/bin path(case for Mac)
      return addToPath(adxBinaryPath);
    } else if (!adxPathResult.includes(adxBinaryPath)) {
      // if adx CLI is present at any other location,
      // add the resources/bin path and
      // also return the older path so that files can be renamed there
      return Promise.all([addToPath(adxBinaryPath), adxPathResult]);
    } else {
      // if resources/bin path is already added, no action required
      throw new Error('[IGNORE]: No action required!');
    }
  })
  .then((addPathResult) => {
    if (typeof addPathResult !== 'object') {
      // if only path was added, no action required(case when no ADX CLI was installed previously)
      throw new Error('[IGNORE]: Rename action not required!');
    }
    // rename the adx files at the older location
    return renameFiles(addPathResult[1], adxBinaryPath);
  })
  .then(() => uninstallAdx())
  .catch((err) => {
    const error = processError(err).message;
    if (error.includes('INFO: Could not find files for the given pattern(s)')) {
      // Windows throws an error if adx is not present, so we simply add the resources/bin path
      return addToPath(adxBinaryPath);
    }
    console.log(error);
    throw error;
  });

module.exports = {
  mapAdxBinary,
};
