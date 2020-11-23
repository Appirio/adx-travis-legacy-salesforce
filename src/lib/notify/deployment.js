const gulpLog = require('fancy-log');
const _ = require('lodash');
const rollbar = require('./rollbar');
const cmc = require('../alm/cmc');
const git = require('../vcs/git');
const ci = require('../ci/ci');

const SKIP_MESSAGE = 'Skip further then blocks.';
const sprintIds = [];
const releaseIds = [];
const cmcItemDetails = {};
let cmcItems;
let cmcStoryFound;
let cmcIssueFound;
let __destination;
let __isError;

// Extract CMC story/issue/task numbers from the commit message
const extractCMCNumbers = (commitText) => {
  cmcItems = cmc.extractCMCNumbersFromText(commitText);
  // return;
};

// If rollbar is enabled then send notification message to rollbar
const notifyRollbar = () => {
  if (rollbar.enabled) {
    const payload = {};
    if (cmc.enabled) {
      payload.stories = cmcItems.stories.join(', ');
      payload.issues = cmcItems.issues.join(', ');
      payload.tasks = cmcItems.tasks.join(', ');
    }
    return rollbar.sendMessage(`Deployment to ${__destination}`, __isError, payload)
      .then(() => {
        gulpLog('Deployment notification sent to Rollbar.');
      });
  }
  gulpLog('Rollbar not enabled. Skipping Rollbar notification.');
  return undefined;
};

// Fetch all the story details
const fetchAllStoryDetails = () => {
  const promises = [];
  if (!_.isEmpty(cmcItems.stories)) {
    const stories = cmc.fetchStoriesFromName(cmcItems.stories)
      .then((storyResults) => {
        // Loop through all the story details
        _.forEach(storyResults, (story) => {
          cmcStoryFound = true;
          cmcItemDetails[story.storyNumber] = story;
          // Add the sprint to the array, if not already there
          if (story.hasOwnProperty('sprintId') && story.sprintId !== null && !_.includes(sprintIds, story.sprintId)) {
            sprintIds.push(story.sprintId);
          }
          // Add the release to the array, if not already there
          if (story.hasOwnProperty('releaseId') && story.releaseId !== null && !_.includes(releaseIds, story.releaseId)) {
            releaseIds.push(story.releaseId);
          }
        });
      });
    promises.push(stories);
  }
  return promises;
};

// Fetch all the issue details
const fetchAllIssueDetails = () => {
  const promises = [];
  if (!_.isEmpty(cmcItems.issues)) {
    const issues = cmc.fetchIssuesFromName(cmcItems.issues)
      .then((issueResults) => {
        // Loop through all the issue details
        _.forEach(issueResults, (issue) => {
          cmcIssueFound = true;
          cmcItemDetails[issue.issueNumber] = issue;
          // Add the sprint to the array, if not already there
          if (issue.hasOwnProperty('sprintId') && issue.sprintId !== null && !_.includes(sprintIds, issue.sprintId)) {
            sprintIds.push(issue.sprintId);
          }
          // Add the release to the array, if not already there
          if (issue.hasOwnProperty('releaseId') && issue.releaseId !== null && !_.includes(releaseIds, issue.releaseId)) {
            releaseIds.push(issue.releaseId);
          }
        });
      });
    promises.push(issues);
  }
  return promises;
};

// Fetch story/issue details from CMC
const fetchCMCItemDetails = () => {
  // If CMC is enabled, fetch story/issue details from CMC, otherwise stop further execution of then blocks
  if (cmc.enabled) {
    const storyPromises = fetchAllStoryDetails();
    const issuePromises = fetchAllIssueDetails();
    const promises = storyPromises.concat(issuePromises);
    return Promise.all(promises);
  }
  gulpLog('CMC not enabled. Skipping CMC notification.');
  // Fake exception to skip further execution of then blocks when CMC is not enabled
  throw (SKIP_MESSAGE);
};

// Create deployment record in CMC
const createDeployment = () => {
  let deploymentStatus = 'Completed';
  if (__isError) {
    deploymentStatus = 'Automated Deployments In Progress';
  }
  const deploymentData = {
    deploymentName: `Deployment to ${__destination}`,
    deploymentDate: new Date(),
    deploymentStatus: `${deploymentStatus}`,
    sourceUrl: ci.env.commitUrl,
  };
  if (sprintIds.length === 1 || (sprintIds.length > 0 && releaseIds.length === 0)) {
    // Use first encountered Sprint when all the stories/issues are from same Sprint or when Release is not available
    deploymentData.sprintId = sprintIds[0];
  } else if (releaseIds.length > 0) {
    // Use first encountered Release when Sprint cannot be used
    deploymentData.releaseId = releaseIds[0];
  } else if (!cmcStoryFound && !cmcIssueFound) {
    // No sprint or release found
    gulpLog('No valid CMC story/issue found in the commit message. Skipping CMC notification.');
    // Fake exception to skip further execution of then blocks since required Release/Sprint info is not available
    throw (SKIP_MESSAGE);
  } else {
    const err = 'Unable to create Deployment record in CMC since Sprint or Release is not defined for any of the CMC stories/issues mentioned in the commit message.';
    throw (err);
  }
  return cmc.createDeployment(deploymentData)
    .then((response) => {
      gulpLog('Deployment record successfully created in CMC.');
      return response.content;
    });
};

// Create deployment items in CMC
const createDeploymentItems = (deploymentId) => {
  const promises = [];
  _.forEach(cmcItemDetails, (value, key) => {
    const itemData = {
      deploymentId: `${deploymentId}`,
    };
    if (/^S-/.test(key)) {
      itemData.storyId = value.id;
    } else if (/^I-/.test(key)) {
      itemData.issueId = value.id;
    }
    const item = cmc.createDeploymentItem(itemData);
    promises.push(item);
  });
  return Promise.all(promises).then(() => {
    gulpLog('Deployment Item(s) successfully added to the Deployment record in CMC.');
  });
};

// Send deployment notification to Rollbar and CMC
const notifyDeployment = (destination, isError = false) => {
  __destination = destination;
  __isError = isError;
  return new Promise((resolve, reject) => {
    if (ci.env.isCi) {
      // Extract commit message from git log
      git.getCommitMessage(ci.env.commit)
        // Extract story/issue/task numbers from the commit message
        .then(extractCMCNumbers)
        // Send deployment notification to Rollbar
        .then(notifyRollbar)
        // Fetch story/issue details from CMC
        .then(fetchCMCItemDetails)
        // Create Deployment Record in CMC
        .then(createDeployment)
        // Create Deployment Items for the Deployment Record create above
        .then(createDeploymentItems)
        // Done, resolve the promise
        .then(() => {
          resolve();
        })
        .catch((reason) => {
          // In case of fake rejection, reolve the promise
          if (reason === SKIP_MESSAGE) {
            resolve(SKIP_MESSAGE);
          } else {
            reject(reason);
          }
        });
    } else {
      reject(ci.ERR_CI_ONLY);
    }
  });
};

module.exports = {
  notifyDeployment,
};
