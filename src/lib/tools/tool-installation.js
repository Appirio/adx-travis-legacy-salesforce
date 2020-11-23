/* eslint-disable no-else-return */
const shell = require('shelljs');
const { executeCommand } = require('./tool-helpers');
const config = require('../config/config');
const { getLatestWindowsPath } = require('../util/env');
const { processError } = require('../util/misc');
const { macNodeBinPath } = require('./tool-helpers');
const { getLatestMacPath } = require('../util/env');

const localBinPath = '/usr/local/bin';

const brewCommands = (formula, caskInstall) => ({
  formula,
  install: caskInstall ? `brew cask install ${formula}` : `brew install ${formula}`,
  reinstall: caskInstall ? `brew cask reinstall ${formula}` : `brew reinstall ${formula}`,
  takeOwnership: 'chown -R $(whoami) $(brew --prefix)/*',
  link: `brew link ${formula}`,
  linkOverwrite: `brew link --overwrite ${formula}`,
  relink: `brew unlink ${formula} && brew link ${formula}`,
  upgrade: caskInstall ? `brew cask upgrade ${formula}` : `brew upgrade ${formula}`,
  forceCaskInstall: `brew cask install ${formula} --force`,
});

const chocoCommands = pkg => ({
  package: pkg,
  install: `choco install ${pkg} --yes`,
  forceInstall: `choco install ${pkg} --force --yes --forcedependencies`,
  upgrade: `choco upgrade ${pkg} --yes`,
});

const setBrewBinPath = async () => {
  // read default shell profile file
  const shellProfileContent = config.getMacProfileContent();
  const localBinExportedPathString = `export PATH="${localBinPath}:$PATH"`;
  const macProfilePathForNode = `export PATH="${macNodeBinPath}:$PATH"`;
  let shellProfileContentArray = [];
  const updatedMacProfileContentArray = [];
  if (shellProfileContent) {
    // convert profile content string to array
    shellProfileContentArray = shellProfileContent.split('\n');
  }
  let isNode12PathPresent = false;
  // loop over profile content array to find occurrences of /usr/local/bin or node@12 path
  // create a new array which do not include the above 2 paths
  shellProfileContentArray.forEach((shellPath) => {
    if (!shellPath.includes(localBinPath) && !shellPath.includes(macNodeBinPath)) {
      updatedMacProfileContentArray.push(shellPath);
    }
    // if node@12 path was commented, do not set isNode12PathPresent to true
    if (shellPath.includes(macNodeBinPath) && !shellPath.trim().startsWith('#')) {
      isNode12PathPresent = true;
    }
  });
  // after processing the entire profile content array, push /usr/local/bin path at the end
  updatedMacProfileContentArray.push(localBinExportedPathString);
  // if node@12 path was found, then only add it to the path else don't
  if (isNode12PathPresent) {
    updatedMacProfileContentArray.push(macProfilePathForNode);
  }
  // finally convert array into string and update it into shell.env
  const newProfileContent = updatedMacProfileContentArray.join('\n');
  config.writeMacProfileContent(newProfileContent);
  const newPath = await getLatestMacPath();
  if (newPath !== '') {
    shell.env.PATH = newPath;
  }
  return newPath;
};

const brewInstaller = {
  install: (brewFormula, admin, caskInstall = false) => {
    const brew = brewCommands(brewFormula, caskInstall);
    let tempResult = '';
    return new Promise((resolve, reject) => {
      executeCommand(brew.install, admin, true)
        .then((installResult) => {
          tempResult = installResult.out.toLowerCase() + installResult.err.toLowerCase();
          if (tempResult.includes('brew reinstall') || tempResult.includes('brew cask reinstall')
            || tempResult.includes('brew upgrade') || tempResult.includes('brew cask upgrade')
            || tempResult.includes(brew.relink)
            || (!(tempResult.includes(brew.relink)) && tempResult.includes(brew.link))) {
            throw tempResult;
          } else {
            return '';
          }
        })
        .then(() => setBrewBinPath())
        .then((lastResult) => {
          if (lastResult !== '') {
            tempResult += `  ${lastResult}`;
          }
          resolve(tempResult);
        })
        .catch((err) => {
          let errFlag = false;
          const error = processError(err).message.toLowerCase();
          tempResult += error;
          Promise.resolve()
            .then(() => {
              if (tempResult.includes('brew reinstall') || tempResult.includes('brew cask reinstall')) {
                errFlag = true;
                return executeCommand(brew.reinstall, admin, true);
              } else if (tempResult.includes('brew upgrade') || tempResult.includes('brew cask upgrade')) {
                errFlag = true;
                return executeCommand(brew.upgrade, admin, true);
              } else {
                return '';
              }
            })
            .then((result1) => {
              if (result1 !== '') {
                tempResult += `  ${result1.out.toLowerCase()}  ${result1.err.toLowerCase()}`;
              }
              if (tempResult.includes('brew link') || tempResult.includes('could not symlink')
                || tempResult.includes('can\'t create update lock') || tempResult.includes('permission denied') || tempResult.includes('not writable')) {
                errFlag = true;
                return executeCommand(brew.takeOwnership, true, true)
                  .then(() => executeCommand(brew.linkOverwrite, admin, true));
              } else if (tempResult.includes('there is already an app')) {
                errFlag = true;
                return executeCommand(brew.forceCaskInstall, admin, true);
              } else {
                return '';
              }
            })
            .then((result2) => {
              if (result2 !== '') {
                tempResult += `  ${result2.out.toLowerCase()}  ${result2.err.toLowerCase()}`;
              }
              if (tempResult.includes(brew.relink)) {
                errFlag = true;
                return executeCommand(brew.relink, admin, true);
              } else {
                return '';
              }
            })
            .then((result3) => {
              // process this
              // Overwrite link
              if (result3 !== '') {
                tempResult += `  ${result3.out.toLowerCase()}  ${result3.err.toLowerCase()}`;
              }
              if (!(tempResult.includes(brew.relink)) && tempResult.includes(brew.link)) {
                errFlag = true;
                return executeCommand(brew.link, admin, true);
              } else {
                return '';
              }
            })
            // eslint-disable-next-line consistent-return
            .then((result4) => {
              if (result4 !== '') {
                tempResult += `  ${result4.out.toLowerCase()}  ${result4.err.toLowerCase()}`;
              }
              if (errFlag) {
                return setBrewBinPath();
              } else {
                reject(error);
              }
            })
            .then((result5) => {
              if (result5 !== '') {
                tempResult += `  ${result5}`;
              }
              resolve(tempResult);
            })
            .catch((err1) => {
              let errCommand;
              let errAdmin;
              const error1 = err1.toLowerCase();
              tempResult += error1;
              errFlag = false;
              if (error1.includes(brew.relink)) {
                errCommand = brew.relink;
                errAdmin = admin;
              } else if ((!error1.includes(brew.relink)) && error1.includes(brew.link)) {
                errCommand = brew.link;
                errAdmin = admin;
              } else if (error1.includes('there is already an app')) {
                errCommand = brew.forceCaskInstall;
                errAdmin = admin;
              } else if (error1.includes('brew link') || error1.includes('could not symlink')
                || error1.includes('can\'t create update lock') || error1.includes('permission denied') || error1.includes('not writable')) {
                errCommand = brew.takeOwnership;
                errAdmin = true;
              } else {
                reject(error1);
              }

              executeCommand(errCommand, errAdmin, true)
                .then((errResult1) => {
                  if (errResult1 !== '') {
                    tempResult += `  ${errResult1.out.toLowerCase()}  ${errResult1.err.toLowerCase()}`;
                  }
                  if (errCommand.includes('chown')) {
                    return executeCommand(brew.linkOverwrite, admin, true);
                  } else {
                    return '';
                  }
                })
                .then((errResult2) => {
                  if (errResult2 !== '') {
                    tempResult += `  ${errResult2.out.toLowerCase()}  ${errResult2.err.toLowerCase()}`;
                  }
                  return setBrewBinPath();
                })
                .then((finalResult) => {
                  if (finalResult !== '') {
                    tempResult += `  ${finalResult}`;
                  }
                  resolve(tempResult);
                })
                .catch((err2) => {
                  reject(err2);
                });
            });
        });
    });
  },
};

const chocoInstaller = {
  install: (chocoPkg, toolName, admin) => {
    const choco = chocoCommands(chocoPkg);
    return new Promise((resolve, reject) => {
      const pathBeforeInstall = `Path before installing ${toolName} :: ${process.env.PATH}`;
      let tempResult = `${pathBeforeInstall} \n\n `;
      executeCommand(choco.install, admin)
        .then((installResult) => {
          if (installResult !== '') {
            tempResult += installResult.toLowerCase();
          }
          if (tempResult.includes('use --force to reinstall')) {
            tempResult += ' \n\n Running forced install with switches --force --yes --forcedependencies...';
            return executeCommand(choco.forceInstall, admin);
          } else {
            return '';
          }
        })
        .then((result1) => {
          if (result1 !== '') {
            tempResult += result1.toLowerCase();
          }
          if (tempResult.includes('use upgrade')) {
            tempResult += ' \n\n Running upgrade...';
            return executeCommand(choco.upgrade, admin);
          } else {
            return '';
          }
        })
        .then((lastResult) => {
          if (lastResult !== '') {
            tempResult += ` \n\n ${lastResult.toLowerCase()}`;
          }
          return getLatestWindowsPath();
        })
        .then((outputPath) => {
          if (outputPath !== '') {
            shell.env.PATH = outputPath;
          }
          const pathAfterInstall = `Path after installing ${toolName} :: ${process.env.PATH}`;
          tempResult += `\n\n ${pathAfterInstall}`;
          resolve(tempResult);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};

module.exports = {
  brewInstaller,
  chocoInstaller,
};
