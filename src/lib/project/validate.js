const _ = require('lodash');
const path = require('path');
const config = require('../config/config');
const { validProjectTypes, teamConfigPath } = require('../config/appirio');
const dir = require('./dir');
const { emptyResult } = require('../util/misc');

/**
 * Method to check the project is valid Appirio DX project
 * @param {string} inputPath  it is the path of the project in local system.
 * @returns {object} it returns the result with error or success.
 */
const isValidADXProject = (inputPath) => {
  const result = emptyResult();
  // check the directory properties of the given input path
  const dirProps = dir.processDirectory(inputPath);
  // if the given project directory is not inside the Appirio DX Folder then return error.
  if (!dirProps.isInsideProject) {
    result.error = 'This is not a valid Appirio DX project';
  } else if (dirProps.projectRoot !== path.resolve(inputPath)) { // check project root and given path should be identical
    result.error = 'Selected path should be the project\'s root directory!';
  }
  // If given path is valid Appirio DX folder then check that it contains valid project type.
  if (!result.error) {
    // Set the project base directory to the input project path
    config.setProjectBaseDir(inputPath);
    // check project contains projectType property in appirio.json file of config folder.
    if (config.hasProjectConfig('projectType')) {
      let projectType = [];
      projectType = config.readProjectConfig('projectType');
      // If existing value is not an array, convert the value to an array
      if (!Array.isArray(projectType)) {
        projectType = [projectType];
      }
      const unknownProjectTypes = _.difference(projectType, validProjectTypes);
      if (projectType.length === 0) {
        result.error = 'No valid project type(s) have been defined. Check config/appirio.json.';
      } else if (unknownProjectTypes.length > 0) {
        result.error = `Unrecognized project type(s): ${unknownProjectTypes}. Check config/appirio.json.`;
      } else { // if folder is valid Appirio DX project then set the projectType property in result.
        result.projectType = projectType;
      }
    } else {
      result.error = 'No valid project type(s) have been defined. Check config/appirio.json.';
    }
  }
  // if result contains error then set result.data = false
  if (result.error) {
    result.data = false;
  } else {
    result.data = true;
  }
  return result;
};

/**
 * Method to check the given path exists in team projects if yes then return project.
 * @param {string} inputPath  it is the path of the project in local system.
 * @returns {object} existing team project.
 */
const checkExistingTeamProject = (inputPath) => {
  let existingProject;
  // Read entire team config file.
  const teamConfig = config.readConfigFile(teamConfigPath);
  _.each(teamConfig, (teamData) => {
    // condition to break the outer loop.
    if (existingProject) {
      return false;
    }
    _.each(teamData, (team) => {
      // condition to break the inner loop.
      if (existingProject) {
        return false;
      }
      // Check for the project's existence
      existingProject = _.find(team.projects, { path: inputPath });
    });
  });
  return existingProject;
};

/**
 * Method to check the given path exists in private projects if yes then return project.
 * @param {string} inputPath  it is the path of the project in local system.
 * @returns {object} existing private project.
 */
const checkExistingPrivateProject = (inputPath) => {
  let existingProject;
  if (config.hasUserConfig('projects')) {
    let userProjects = config.readUserConfig('projects');
    // If existing value is not an array, convert the value to an array
    if (!Array.isArray(userProjects)) {
      userProjects = [userProjects];
    }
    // Check for the project's existence
    existingProject = _.find(userProjects, {
      path: inputPath,
    });
  }
  return existingProject;
};

/**
 * Method to check the given path does not exist in team config file if exists then return result with the error.
 * @param {string} inputPath  it is the path of the project in local system.
 * @returns {object} Result with the error or success.
 */
const validateNewTeamProject = (inputPath) => {
  // Check given input path is valid ADX Project
  const result = isValidADXProject(inputPath);
  // If it is valid ADX project then check that it does not exist in the team data
  if (result.data) {
    // check for project existence in team data
    const existingproject = checkExistingTeamProject(inputPath);
    // if it exists then set the error in the result.
    if (existingproject) {
      result.error = 'This project already exists as a team project!';
      result.data = false;
    }
  }
  return result;
};

/**
 * Method to check the given path does not exist in team config file if exists then return result with the error and it has valid ADX project.
 * @param {string} inputPath  it is the path of the project in local system.
 * @param {boolean} ignoreLocal if it is true then private projects would not be checked for input path.
 * @returns {object} Result with the error or success.
 */
const validateNewPrivateProject = (inputPath, ignoreLocal = false) => {
  // Check given input path is valid ADX Project
  const result = isValidADXProject(inputPath);
  // If it is valid ADX project then run further validations.
  if (result.data) {
    // If ignore local is true and project path exists in private workspace then set error
    if (!ignoreLocal && checkExistingPrivateProject(inputPath)) {
      result.error = 'This project already exists in your workspace!';
      result.data = false;
    }
    if (result.data) {
      // check for project existence in team data
      const existingproject = checkExistingTeamProject(inputPath);
      // if it exists then set the error in the result.
      if (existingproject) {
        result.error = 'This project already exists as a team project!';
        result.data = false;
      }
    }
  }
  return result;
};

module.exports = {
  isValidADXProject,
  checkExistingTeamProject,
  checkExistingPrivateProject,
  validateNewTeamProject,
  validateNewPrivateProject,
};
