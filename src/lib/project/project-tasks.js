const _ = require('lodash');
const path = require('path');
const git = require('simple-git/promise');
const config = require('../config/config');
const { validProjectTypes, teamConfigFile, teamConfigPath } = require('../config/appirio');
const { dateTimeISO } = require('../util/date');
const { isValidUniqueId, getNewUniqueId } = require('../util/misc');
const vcsGit = require('../vcs/git');
const ci = require('../ci/ci');
const { emptyResult, processError } = require('../util/misc');
const { ERR_NO_USER_ID, removeTeamProjectDetails } = require('../util/team');
const { extractKeyRemovePrivateProject } = require('../util/user');
const { isValidADXProject } = require('./validate');

const WARN_OUTDATED_MODEL = 'This project is using the outdated Legacy Salesforce Development Model. We recommend switching to Org Development Model or Package Development Model.';
const addProjectToUserConfig = async () => 'Depcrecated';

const joinExistingProject = async () => 'Depcrecated';

const getProjectKey = (projectPath, createIfNotFound = false) => {
  let projectKey;
  // Since CI doesn't have a user config, return a new unique ID every time
  if (ci.env.isCi) {
    projectKey = getNewUniqueId();
  } else {
    let userProjects = [];
    // Read that projects from the user config
    if (config.hasUserConfig('projects')) {
      userProjects = config.readUserConfig('projects');
      // If existing value is not an array, convert the value to an array
      if (!Array.isArray(userProjects)) {
        userProjects = [userProjects];
      }
      // Check for the project's existence
      const existingProject = _.find(userProjects, {
        path: projectPath,
      });
      if (existingProject) {
        // If a valid unique ID is already present for the project, return that
        if (isValidUniqueId(existingProject.key)) {
          projectKey = existingProject.key;
        } else if (createIfNotFound) { // If required, assign a new unique ID and save in the user config
          projectKey = getNewUniqueId();
          existingProject.key = projectKey;
          existingProject.id = projectKey;
          config.writeUserConfig('projects', userProjects);
        }
        return projectKey;
      }
    }
    if (!projectKey) {
      const teamConfig = config.readConfigFile(teamConfigPath);
      _.each(teamConfig, (teamData, auth0Id) => {
        if (projectKey) {
          return false;
        }
        _.each(teamData, (team, teamId) => {
          if (projectKey) {
            return false;
          }
          const existingProject = _.find(team.projects, { path: projectPath });
          if (existingProject) {
            // If a valid unique ID is already present for the project, return that
            if (isValidUniqueId(existingProject.key)) {
              projectKey = existingProject.key;
            } else if (createIfNotFound) { // If required, assign a new unique ID and save in the user config
              projectKey = getNewUniqueId();
              existingProject.key = projectKey;
              const configProjectKey = `${auth0Id}.${teamId}.projects.${existingProject.id}.key`;
              config.writeUserConfig(configProjectKey, projectKey, teamConfigFile);
            }
          }
        });
      });
    }
  }
  return projectKey;
};

/**
 * Method to check the given path does not exist in team config file if exists then return result with the error.
 * @param {string} inputPath  it is the path of the project in local system.
 * @returns {object} Result with the error or success.
 */
const joinExistingTeamProject = async (repoURL, teamId, projectId) => {
  const result = emptyResult();
  try {
    // Clone the given repo Url and retrieve the project path
    const clonedPath = await vcsGit.clone(repoURL);
    // check the given project is valid ADX project.
    const isValid = isValidADXProject(clonedPath.data);
    // If it is not valid then throw the error.
    if (isValid.error) {
      result.error = isValid.error;
      throw result;
    } else if (config.hasUserConfig('userId')) { // Check user is logged otherwise throw error.
      // Get auth0Id from the user config.
      const auth0Id = config.readUserConfig('userId');
      // Set the project key where the project would be written in team config file.
      const projectKey = `${auth0Id}.${teamId}.projects.${projectId}`;
      // create existing team project with id and archived values
      let existingTeamProject = { id: projectId, archived: false };
      // if project exists in team config then retrieve the existing project
      if (config.hasUserConfig(projectKey, teamConfigFile)) {
        existingTeamProject = config.readUserConfig(projectKey, teamConfigFile);
      }
      // Extract key from the private project and remove the private project.
      const existingProjectKey = await extractKeyRemovePrivateProject(clonedPath.data);
      // Remove key, path and type from the team data if path exists for any project.
      await removeTeamProjectDetails(clonedPath.data);
      // set team project data and set the project key if it was retrieved from the private project otherwise create new one.
      existingTeamProject.id = projectId;
      existingTeamProject.archived = false;
      existingTeamProject.path = clonedPath.data;
      existingTeamProject.key = isValidUniqueId(existingProjectKey) ? existingProjectKey : getNewUniqueId();
      // Write project details in team data.
      await config.writeUserConfig(projectKey, existingTeamProject, teamConfigFile);
      result.data = _.cloneDeep(existingTeamProject);
    } else {
      result.error = ERR_NO_USER_ID;
      throw result;
    }
    return result;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};

const getProjectDevModel = (projectType) => {
  let latestProjectType = projectType;
  let projectDevModel;
  if (!Array.isArray(latestProjectType)) {
    latestProjectType = [latestProjectType];
  }
  if (latestProjectType.includes('legacy-salesforce')) {
    projectDevModel = 'legacy';
  } else if (latestProjectType.includes('sfdx') || latestProjectType.includes('sfdx-package')) {
    projectDevModel = 'package';
  } else if (latestProjectType.includes('sfdx-org')) {
    projectDevModel = 'org';
  } else {
    projectDevModel = 'other';
  }
  return projectDevModel;
};

module.exports = {
  joinExistingProject,
  addProjectToUserConfig,
  getProjectKey,
  joinExistingTeamProject,
  getProjectDevModel,
  WARN_OUTDATED_MODEL,
};
