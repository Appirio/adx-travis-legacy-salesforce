/* eslint-disable no-control-regex */
const git = require('simple-git/promise');
const _ = require('lodash');
const colors = require('ansi-colors');
const path = require('path');
const stripAnsi = require('strip-ansi');
const config = require('../config/config');
const { logger, fileLogger } = require('../util/logger');
const { emptyResult, processError, sleep } = require('../util/misc');

const getDefaultProjectName = (repoURL) => {
  let projectName = path.basename(repoURL);
  projectName = projectName.replace(/\.git$/, '');
  return projectName;
};

const gitSafeName = (rawString) => {
  let safeName = _.replace(rawString, /(\s+|\\|~|:|\^|\.|@{|\?|\*|\[)/g, '-');
  // Characters such as & cause problems with GitLab CI branch names
  safeName = _.replace(safeName, /[&<>]/g, '-');
  safeName = _.replace(safeName, /-{2,}/g, '-');
  safeName = stripAnsi(safeName);
  safeName = _.replace(safeName, /`|'|"|[^\x00-\x7F]|(\/|-)*$/g, '');

  return safeName.substring(0, 200);
};

/**
 * To Check if given branch is available in given Branch list
 * @param {Array} branchArray Branch list
 * @param {string} branchName Branch name to checked
 * @returns {boolean}
 */
const isBranchAvailable = (branchArray, branchName) => (branchArray.includes(branchName));

/**
 * Return if Source branch has been defined
 * @returns {string} defined branch name
 */
const projectConfigSourceBranch = () => {
  let sourceBranchName = null;
  if (config.hasProjectConfig('sourceBranchToClone')) {
    const strBranch = _.trim(config.readProjectConfig('sourceBranchToClone'));
    if (strBranch !== '' && strBranch !== 'master') {
      if (strBranch.indexOf('remotes/origin/') === 0) {
        sourceBranchName = strBranch;
      } else if (strBranch.indexOf('origin/') === 0) {
        sourceBranchName = `remotes/${strBranch}`;
      } else {
        sourceBranchName = `remotes/origin/${strBranch}`;
      }
    }
  }
  return sourceBranchName;
};
const getSourceBranch = async (sourceBranch) => {
  const defaultSource = 'remotes/origin/master';
  const masterMessage = 'Your new branch will be created from "origin/master" instead.';
  try {
    let sourceBranchName;
    const branches = await git().branch();
    const branchesList = (branches && branches.all) ? branches.all : [];
    if (sourceBranch) {
      // If sourceBranch has been provided from UI
      if (!isBranchAvailable(branchesList, sourceBranch)) {
        throw new Error(`Source branch "${sourceBranch}" was not found!`);
      }
      sourceBranchName = sourceBranch;
    } else {
      // Fetch default sourceBranch or system config source branch
      const configSourceBranch = projectConfigSourceBranch();
      if (configSourceBranch && branchesList.length) {
        if (isBranchAvailable(branchesList, configSourceBranch)) {
          sourceBranchName = configSourceBranch;
        } else {
          logger.info('WARNING:', colors.yellow(`Source branch "${configSourceBranch}" was not found. ${masterMessage}`));
          sourceBranchName = defaultSource;
        }
      } else if (configSourceBranch) {
        // if we have configSourceBranch but branchesList is not available or empty
        logger.info('WARNING:', colors.yellow(`An unknown error occurred while checking for the existence of source branch "${configSourceBranch}". ${masterMessage}`));
        sourceBranchName = defaultSource;
      } else {
        // If ProjectConfig branch not defined
        sourceBranchName = defaultSource;
      }
    }
    return sourceBranchName;
  } catch (err) {
    fileLogger.addContext('error', err);
    fileLogger.error('An error occurred while determining the source branch to use.');
    fileLogger.removeContext('error');
    throw err;
  }
};

const createBranch = (branchName, sourceBranch) => {
  logger.info(`Processing branch name for legality: '${branchName}'`);
  const newBranchName = gitSafeName(branchName);
  return getSourceBranch(sourceBranch)
    .then((sourceBranchName) => {
      logger.info(`Creating branch: ${newBranchName}`);
      return git().raw(['checkout', '-b', newBranchName, sourceBranchName, '--no-track'])
        .then(() => {
          logger.info(colors.green(`Successfully created and checked out branch: ${newBranchName}`));
          return newBranchName;
        });
    });
};

const getCommitMessage = commitSHA => git().raw(['log', '-1', '--pretty=%B', commitSHA])
  .then(data => _.trim(data));

const getRemoteURL = () => git().getRemotes(true)
  .then((remotes) => {
    const remote = remotes.find(r => r.name === 'origin') || remotes[0];
    return (remote && remote.refs.push) || '';
  });

const getHttpRemoteUrl = (originalUrl, gitUsername, gitToken) => {
  let httpUrl;
  if (originalUrl.startsWith('http') || originalUrl.startsWith('https')) {
    const url = require('url');
    const remoteUrl = url.parse(originalUrl);
    httpUrl = `${remoteUrl.protocol}//${gitUsername}:${gitToken}@${remoteUrl.hostname}${remoteUrl.pathname}`;
  } else {
    const url = require('ssh-url');
    const remoteUrl = url.parse(originalUrl);
    httpUrl = `https://${gitUsername}:${gitToken}@${remoteUrl.hostname}${remoteUrl.pathname}`;
  }
  return httpUrl;
};

const setRemote = () => {
  const ci = require('../ci/ci');
  let remoteUrl = ci.env.projectUrl;
  const gitUsername = process.env.GIT_USERNAME || process.env.GITLAB_USERNAME;
  const gitToken = process.env.GIT_TOKEN || process.env.GITLAB_TOKEN;
  if (gitUsername && gitToken) {
    remoteUrl = getHttpRemoteUrl(remoteUrl, gitUsername, gitToken);
    console.log('Setting remote based on your Git username and token...');
    return git().addConfig('remote.origin.url', remoteUrl);
  }
  return Promise.reject(new Error('GIT_USERNAME and/or GIT_TOKEN missing. Please add them as your secret variables in your project.'));
};

const getOrSetRemote = () => getRemoteURL()
  .then(async (remoteUrl) => {
    const ci = require('../ci/ci');
    if (ci.env.isCi) {
      await git().removeRemote('origin');
      return setRemote();
    }
    return remoteUrl;
  });

const getRemotePath = () => getRemoteURL()
  .then((remoteURL) => {
    const domainTest = '(?:(?:[a-z0-9]+\\.)?(?:[a-z0-9][a-z0-9-]+\\.)+[a-z]{2,6})';
    const test = `(?:(?:git|ssh|https?):\\/\\/|(?:git@${domainTest}))(?:(?:git@)?${domainTest})?.(?:\\/*)((?:(?!(?:\\.git\\/?)|(?:\\/?$)).)*)`;
    const re = new RegExp(test, 'i');
    const match = remoteURL.match(re);
    if (match && match.length > 1) {
      return match[1];
    }
    return remoteURL;
  });

const getRemoteSlug = () => getRemotePath().then(remotePath => _.kebabCase(remotePath));

// returns array of all local branch names.
const getLocalBranchList = () => {
  const result = emptyResult();
  return git().branchLocal()
    .then((branchSummary) => {
      result.data = {
        current: branchSummary.current,
        all: branchSummary.all,
      };
      return result;
    })
    .catch((err) => {
      result.error = processError(err);
      throw result;
    });
};

// returns array of all branches name.
const getFullBranchList = () => {
  const result = emptyResult();
  return git().branch()
    .then((branches) => {
      result.data = {
        current: branches.current,
        all: branches.all,
      };
      return result;
    })
    .catch((err) => {
      result.error = processError(err);
      throw result;
    });
};

const fetch = (remote = 'origin') => git().fetch(remote);

// returns ahead/behind status of a branch.
const isSyncRequired = (branchName, retry, remote = 'origin') => {
  const result = emptyResult();
  return git().raw(['rev-list', '--left-right', '--count', `${branchName}...${branchName}@{upstream}`])
    .then((branchInfo) => {
      const statusInfo = branchInfo.split('\t');
      const status = {
        ahead: statusInfo[0],
        behind: statusInfo[1].replace('\n', ''),
      };
      result.data = status;
      return result;
    })
    .catch(async (err) => {
      const processedErr = processError(err);
      if (processedErr.message.includes("Couldn't find remote ref") || processedErr.message.includes('no upstream configured')) {
        result.data = 'No remote ref found. Push your branch to remote.';
        return result;
      }
      if (!retry && processedErr.message.includes('port 22: Connection refused') && processedErr.message.includes('Could not read from remote repository')) {
        console.log(`Failed for '${branchName}'! Will retry in some time...`);
        await sleep(2000);
        console.log(`Retrying for '${branchName}'....`);
        return isSyncRequired(branchName, true, remote);
      }
      result.error = processedErr;
      throw result;
    });
};

// Get the presently checked out Git branch name
const getCurrentBranchName = (quiet = false) => {
  const result = emptyResult();
  let gitObj;
  if (quiet) {
    gitObj = git().silent(true);
  } else {
    gitObj = git();
  }
  return gitObj.revparse(['--abbrev-ref', 'HEAD'])
    .then((branchName) => {
      result.data = branchName.trim();
      return result;
    })
    .catch((err) => {
      result.error = processError(err);
      throw result;
    });
};

// push changes
const push = (args = 'origin') => {
  const result = emptyResult();
  return git().push(args)
    .then(() => {
      result.data = true;
      return result;
    })
    .catch((err) => {
      result.error = processError(err);
      throw result;
    });
};

// push changes
const pull = async (remote = 'origin') => {
  const result = emptyResult();
  const branchName = await getCurrentBranchName();
  const { spawn } = require('child_process');

  const cmd = 'git';
  const args = ['pull', '--log', remote, branchName.data];
  const cmdOptions = {
    shell: true,
  };
  return new Promise((resolve, reject) => {
    const spawnRes = spawn(cmd, args, cmdOptions);

    spawnRes.stdout
      .on('data', (data) => {
        if (data.includes('CONFLICT (content)')) {
          result.error = processError(data);
        }
      });

    spawnRes.stderr.on('data', (data) => {
      if (!result.error) {
        result.error = processError(data);
      }
    });

    spawnRes.on('exit', (code) => {
      if (code !== 0) {
        return reject(result);
      }
      result.data = true;
      return resolve(result);
    });
  });
};

const getBranchStatus = () => {
  const result = emptyResult();
  return git().status()
    .then((statusSummary) => {
      result.data = statusSummary;
      return result;
    })
    .catch((err) => {
      result.error = processError(err);
      throw result;
    });
};

// Method to commit changes.
const commit = (message) => {
  const result = emptyResult();
  return git().commit(message)
    .then((commitResult) => {
      if (!commitResult.commit && !commit.branch
        && commitResult.summary.changes === 0 && commitResult.summary.insertions === 0
        && commitResult.summary.deletions === 0) {
        result.error = processError('No changes added to commit');
        throw result;
      }
      result.data = commitResult;
      return result;
    })
    .catch((err) => {
      result.error = processError(err);
      throw result;
    });
};

const checkoutBranch = (branchName, retry = false) => {
  const result = emptyResult();
  return git().checkout(branchName)
    .then(() => {
      result.data = true;
      return result;
    })
    .catch(async (errorResult) => {
      const processedErr = processError(errorResult);
      if (!retry && processedErr.message.includes('Another git process seems to be running in this repository')) {
        console.log(`Failed for '${branchName}'! Will retry in some time...`);
        await sleep(3000);
        console.log(`Retrying for '${branchName}'....`);
        return checkoutBranch(branchName, true);
      }
      result.error = processedErr;
      throw result;
    });
};

const getElementsToSplice = (filesArr) => {
  const maxCommandLineLength = 30000;
  let elementsToSplice = 2000;
  if (process.platform === 'win32') {
    let accumulatedStringLength = 0;
    for (let i = 0; i < filesArr.length; i += 1) {
      accumulatedStringLength += filesArr[i].length;
      if (accumulatedStringLength > maxCommandLineLength) {
        elementsToSplice = i - 1;
        break;
      }
    }
  }
  return elementsToSplice;
};

const stageChanges = async (files) => {
  const result = emptyResult();
  const filesArr = [].concat(files);
  while (filesArr.length) {
    const elementsToSplice = getElementsToSplice(filesArr);
    const currentBatch = filesArr.splice(0, elementsToSplice);
    try {
      // eslint-disable-next-line no-await-in-loop
      await git().add(currentBatch);
    } catch (e) {
      result.error = processError(e);
      throw result;
    }
  }
  result.data = true;
  return result;
};

const unstageChanges = async (files) => {
  const result = emptyResult();
  const filesArr = [].concat(files);
  while (filesArr.length) {
    let args = ['HEAD', '--'];
    const elementsToSplice = getElementsToSplice(filesArr);
    const currentBatch = filesArr.splice(0, elementsToSplice);
    args = args.concat(currentBatch);
    try {
      // eslint-disable-next-line no-await-in-loop
      await git().reset(args);
    } catch (e) {
      result.error = processError(e);
      throw result;
    }
  }
  result.data = true;
  return result;
};

const syncGitBranch = async () => {
  const result = emptyResult();
  try {
    const branchStatusResult = await getBranchStatus();
    const branchStatusSummary = branchStatusResult.data;
    if (branchStatusSummary.behind > 0) {
      await pull();
    }
    if (branchStatusSummary.ahead > 0) {
      await push();
    }
    if (!branchStatusSummary.tracking) {
      await push(['-u', 'origin', branchStatusSummary.current]);
    }
    result.data = true;
    return result;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};

const deleteBranch = async (branchName, deleteRemoteBranch) => {
  const result = emptyResult();
  try {
    // Delete the branch from local repo.
    await git().raw(['branch', '-D', branchName]);

    // Delete the remote branch as well.
    if (deleteRemoteBranch) {
      await git().push(['origin', '--delete', branchName]);
    }
    result.data = true;
    return result;
  } catch (err) {
    result.error = err;
    throw result;
  }
};

// Method to clone repo.
const clone = async (repoURL) => {
  const result = emptyResult();
  try {
    // Clone the repo using simple git
    await git().clone(repoURL);
    // Retrieve the project name from the repoURL
    const projectName = getDefaultProjectName(repoURL);
    // create project root using project name and current working directory.
    const projectRoot = path.join(process.cwd(), projectName);
    // Set the project path in result.
    result.data = projectRoot;
    return result;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};

// Method to discard changes of active branch
const discardChanges = async () => {
  const result = emptyResult();
  try {
    // reset the uncommitted changes of branch
    await git().reset('hard');
    // clean the branch
    await git().clean('fd');
  } catch (e) {
    result.error = processError(e);
    throw result;
  }
  result.data = true;
  return result;
};

module.exports = {
  getDefaultProjectName,
  createBranch,
  getCommitMessage,
  getOrSetRemote,
  getRemotePath,
  getRemoteSlug,
  getRemoteURL,
  gitSafeName,
  fetch,
  getLocalBranchList,
  isSyncRequired,
  push,
  pull,
  getBranchStatus,
  getCurrentBranchName,
  commit,
  checkoutBranch,
  stageChanges,
  unstageChanges,
  syncGitBranch,
  deleteBranch,
  getFullBranchList,
  clone,
  discardChanges,
};
