const os = require('os');
const _ = require('lodash');
const fs = require('fs');
const config = require('../config/config');
const { emptyResult, processError, isValidUniqueId, getNewUniqueId } = require('./misc');
const validate = require('../project/validate');
const { dateTimeISO } = require('./date');

const reqToolsKey = 'requiredTools';
const ERR_PROJ_NOT_FOUND = 'Project not found!';

/**
 * Method to shorten given Name
 * @param {string} name
 * @returns {string} shorten Name
 */
const shortenName = (name) => {
  const stringArray = name.split(' ');
  let returnName = name;
  if (stringArray.length > 1) {
    const lastWord = stringArray.pop();
    returnName = stringArray.map(chr => chr.charAt(0)).join('').concat(lastWord);
  }
  return returnName.toLowerCase();
};

const getUserName = () => ((config.hasUserConfig('name')) ? shortenName(_.trim(config.readUserConfig('name'))) : os.userInfo().username);


/* ************************************************* PROJECTS SECTION ************************************************* */


const getPrivateProjectByPath = (projectPath) => {
  let project;
  if (config.hasUserConfig('projects')) {
    const projects = config.readUserConfig('projects');
    project = _.cloneDeep(_.find(projects, { path: projectPath }));
  }
  return project;
};

const getPrivateProjectById = (projectId) => {
  let project;
  if (config.hasUserConfig('projects')) {
    const projects = config.readUserConfig('projects');
    project = _.cloneDeep(_.find(projects, { id: projectId }));
  }
  return project;
};

const getPrivateProjectByKey = (projectKey) => {
  let project;
  if (config.hasUserConfig('projects')) {
    const projects = config.readUserConfig('projects');
    project = _.cloneDeep(_.find(projects, { key: projectKey }));
  }
  return project;
};

/**
 * Method to retrieve all private projects and remove project if path is not valid.
 * If project key is not valid create new key and update it.
 */
const getPrivateProjects = async () => {
  let projects = [];
  if (config.hasUserConfig('projects')) {
    projects = config.readUserConfig('projects');
    // if returned projects is not an array then make it.
    if (!Array.isArray(projects)) {
      projects = [projects];
    }
    // Remove all projects those do not have any valid path.
    _.remove(projects, (currProject) => {
      const project = currProject;
      if (_.isPlainObject(project) && project.path) {
        const pathExist = fs.existsSync(project.path);
        if (pathExist && !isValidUniqueId(project.key)) {
          project.key = getNewUniqueId();
        }
        if (!project.name) {
          project.name = 'No Name';
        }
        project.id = project.key;
        delete project.type;
        return !pathExist;
      }
      return true;
    });
    projects = _.orderBy(projects, [proj => proj.name.toLowerCase()], ['asc']);
    await config.writeUserConfig('projects', projects);
  }
  return _.mapKeys(_.cloneDeep(projects), 'key');
};

/**
 * Method to extract key from the private project and delete the private project that matches the project path with the given input path..
 * @param {string} inputPath  It is the project path of the local system.
 */
const extractKeyRemovePrivateProject = async (inputPath) => {
  let existingKey;
  // Check if private projects exist in user config
  if (config.hasUserConfig('projects')) {
    const projects = config.readUserConfig('projects');
    // find project with the given input path in private projects
    const existingPrivateProject = _.find(projects, { path: inputPath });
    // remove existing private project with same path as given inputPath
    _.remove(projects, { path: inputPath });
    await config.writeUserConfig('projects', projects);
    if (existingPrivateProject) {
      existingKey = existingPrivateProject.key;
    }
  }
  return existingKey;
};

/**
 * Method to add private project
 * @param {string} inputProject  Project input with orgs details.
 */
const addPrivateProject = async (inputProject) => {
  const result = emptyResult();
  try {
    // check, it is valid ADX project, if not throw error.
    const isValid = validate.isValidADXProject(inputProject.path);
    if (!isValid.data) {
      throw isValid;
    }
    // Check team project if it exists then throw error.
    const existingTeamProject = validate.checkExistingTeamProject(inputProject.path);
    if (existingTeamProject) {
      result.error = 'This project already exists as a team project!';
      result.data = false;
      throw result;
    }

    // Retrieve all orgs for private workspace.
    let orgs = {};
    if (config.hasUserConfig('orgs')) {
      orgs = config.readUserConfig('orgs');
    }
    const projectOrgs = [];
    _.each(inputProject.orgs, (org) => {
      // check if the org already exist in user private orgs if not create new one.
      const existingOrg = _.find(orgs, { sfOrgId: org.sfOrgId });
      if (existingOrg) {
        existingOrg.username = org.username;
        orgs[org.sfOrgId] = existingOrg;
      } else {
        orgs[org.sfOrgId] = org;
      }
      // Push the org id in project orgs array
      projectOrgs.push(org.sfOrgId);
    });
    // Extract key from the private project and remove the private project.
    const existingProjectKey = await extractKeyRemovePrivateProject(inputProject.path);
    // Create project object with its details.
    const project = _.pick(inputProject, ['name', 'description', 'path']);
    project.orgs = projectOrgs;
    project.archived = false;
    // if existing project key exists then use that one otherwise create new one.
    project.key = isValidUniqueId(existingProjectKey) ? existingProjectKey : getNewUniqueId();
    project.id = project.key;
    project.createdDate = dateTimeISO();
    // Read all private projects.
    let projects = [];
    if (config.hasUserConfig('projects')) {
      projects = config.readUserConfig('projects');
    }
    projects.push(project);
    // Sort the projects based on their names
    const sortedProjects = _.orderBy(projects, [proj => (proj.name ? proj.name.toLowerCase() : 'no name')], ['asc']);
    // write projects and orgs in user config.
    await config.writeUserConfig('projects', sortedProjects);
    await config.writeUserConfig('orgs', orgs);
    // if it is called from the CLI then result data should be different and it should contains the message
    if (inputProject.addingProjectFromCLI) {
      let action = 'added to';
      if (existingProjectKey) {
        action = 'modified in';
      }
      result.data = `Project '${project.name}' was successfully ${action} your list of projects.`;
    } else {
      // otherwise it should contains project and private orgs.
      result.data = { project: _.cloneDeep(project), privateOrgs: _.cloneDeep(orgs) };
    }
    return result;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};


/**
 * Method to update the name and description of the project.
 */
const updatePrivateProject = async (inputProject) => {
  const result = emptyResult();
  try {
    // check the projects existance in user confif file.
    if (config.hasUserConfig('projects')) {
      let projects = config.readUserConfig('projects');
      // if returned projects is not an array then make it.
      if (!Array.isArray(projects)) {
        projects = [projects];
      }
      // find the project to update.
      const project = _.find(projects, { key: inputProject.key });
      if (project) {
        // update the found project with name and description
        project.name = inputProject.name;
        project.description = inputProject.description;
        await config.writeUserConfig('projects', projects);
        result.data = 'Success';
        return result;
      }
    }
    // Throw error if project is not found in user config
    throw ERR_PROJ_NOT_FOUND;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};

/**
 * Method to delete private project
 * @param {string} projectKey  Project key of the project to delete.
 */
const deletePrivateProject = async (projectKey) => {
  const result = emptyResult();
  try {
    // check the projects existence in user config file.
    if (config.hasUserConfig('projects')) {
      let projects = config.readUserConfig('projects');
      // if returned projects is not an array then make it.
      if (!Array.isArray(projects)) {
        projects = [projects];
      }
      // delete project
      const removedProject = _.remove(projects, { key: projectKey });
      // if empty, it means the project was not found.
      if (removedProject.length) {
        await config.writeUserConfig('projects', projects);
        result.data = 'Success';
        return result;
      }
    }
    // throw error if project is not found in user config.
    throw ERR_PROJ_NOT_FOUND;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};


/* ************************************************* ORGS SECTION ************************************************* */


/**
 * Method to retrieve the org details.
 * @param {string} key Salesforce Org Id.
 * @returns {object} Org details object that contains username, alias and instance Url.
 */
const getPrivateOrgById = (orgId) => {
  const orgKey = `orgs.${orgId}`;
  if (config.hasUserConfig(orgKey)) {
    return _.cloneDeep(config.readUserConfig(orgKey));
  }
  return null;
};

/**
 * Method to retrieve all private orgs.
 * @returns {object} Object of the orgs.
 */
const getPrivateOrgs = async () => {
  let orgs = {};
  if (config.hasUserConfig('orgs')) {
    orgs = config.readUserConfig('orgs');
    if (!_.isPlainObject(orgs)) {
      orgs = {};
    } else {
      // Remove all orgs those do not have any valid sfOrgId, alias and loginUrl.
      _.each(orgs, (org, orgId) => {
        if (!(_.isPlainObject(org) && org.sfOrgId && org.alias && org.loginUrl)) {
          delete orgs[orgId];
        }
      });
    }
  }
  await config.writeUserConfig('orgs', orgs);
  return _.cloneDeep(orgs);
};

/**
 * Method to add the org in the My Workspace.
 * @param {string} orgId Org Id.
 * @param {string} orgUsername Org Username.
 * @param {string} loginUrl Instance Url of the org.
 * @param {string} alias Alias of the Org.
 */
const setSingleOrgMapping = async (orgId, orgUsername, loginUrl, alias) => {
  const org = { username: orgUsername, sfOrgId: orgId, loginUrl, alias };
  const orgKey = `orgs.${orgId}`;
  await config.writeUserConfig(orgKey, org);
};

/**
 * Method to update the all private orgs and update the project orgs if any org is removed.
 * @param {object} orgsInput Object of the orgs.
 */
const updatePrivateOrgs = async (orgsInput) => {
  const result = emptyResult();
  try {
    // create defined Org structure from orgsInput
    let projects = {};
    if (config.hasUserConfig('projects')) {
      projects = config.readUserConfig('projects');
      // if return projects is not an array then make it.
      if (!Array.isArray(projects)) {
        projects = [projects];
      }
      _.each(projects, (project) => {
        if (_.isPlainObject(project)) {
          const proj = project;
          // It returns the orgs to remove from the project as orgs have been deleted in private orgs.
          const orgsToRemove = _.difference(project.orgs, _.keys(orgsInput));
          // remove the orgs from the project.
          proj.orgs = _.difference(project.orgs, orgsToRemove);
        }
      });
      // Update all projects in user config again
      await config.writeUserConfig('projects', projects);
    }
    // update the input orgs in user config
    await config.writeUserConfig('orgs', orgsInput);
    result.data = {};
    result.data.orgs = _.cloneDeep(orgsInput);
    result.data.projects = await getPrivateProjects();
    return result;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};

/**
 * Method to update the single project orgs and create new org at Workspace level if it is not available.
 * @param {object} projectOrgsInput Object of the orgs along with the project key.
 */
const updateProjectOrgs = async (projectOrgsInput) => {
  const result = emptyResult();
  try {
    let projects = [];
    if (config.hasUserConfig('projects')) {
      projects = config.readUserConfig('projects');
    }
    const project = _.find(projects, { key: projectOrgsInput.key });
    // Update project orgs if project found otherwiese throw error.
    if (project) {
      // Retrieve all orgs for private workspace.
      let orgs = {};
      if (config.hasUserConfig('orgs')) {
        orgs = config.readUserConfig('orgs');
      }
      const projectOrgs = [];
      _.each(projectOrgsInput.orgs, (org) => {
        // check if the org already exist in user private orgs if not create new one.
        const existingOrg = _.find(orgs, { sfOrgId: org.sfOrgId });
        if (existingOrg) {
          existingOrg.username = org.username;
          orgs[org.sfOrgId] = existingOrg;
        } else {
          orgs[org.sfOrgId] = org;
        }
        // Push the org id in project orgs array
        projectOrgs.push(org.sfOrgId);
      });
      project.orgs = projectOrgs;
      await config.writeUserConfig('projects', projects);
      await config.writeUserConfig('orgs', orgs);
      result.data = {};
      result.data.privateOrgs = await getPrivateOrgs();
      result.data.project = _.cloneDeep(project);
      return result;
    }
    // Throw error if project not found.
    throw ERR_PROJ_NOT_FOUND;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};

/* ************************************************* TOOLS SECTION ************************************************* */


/**
 * Method to update tools and tools configuration for the private workspace.
 * @param {*} toolsInput Configured Tools for the private workspace.
 *
 * Returns the input only to behave the same way as the corrresponding team workspace method.
 */
const updateToolsAndConfig = async (toolsInput) => {
  const result = emptyResult();
  try {
    // Ensure that the tools object and required tools are valid
    if (_.isPlainObject(toolsInput) && _.has(toolsInput, reqToolsKey) && _.isPlainObject(toolsInput[reqToolsKey])) {
      // Save required tools as secret
      config.setSecret('rtnc', JSON.stringify(toolsInput[reqToolsKey]));
      const toolsClone = _.cloneDeep(toolsInput);
      // Remove required tools from all tools and save the rest of them under tools property
      delete toolsClone[reqToolsKey];
      await config.writeUserConfig('tools', toolsClone);
      // Return the original input object only
      result.data = toolsInput;
      return result;
    }
    throw new Error('Invalid tools input!');
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};

/**
 * Method to create/overwrite tools and configuration in user config. Only Appirio-preferred (i.e. default) tools & configuration
 * are stored in user config by this method as the default settings for private workspaces.
 */
const setDefaultPrivateTools = async () => {
  try {
    // Get default tools
    const defaultTools = require('../tools/tools').getDefaultToolsAndConfig();
    // Write default tools in user config
    await updateToolsAndConfig(defaultTools);
    // return the default tools
    return defaultTools;
  } catch (err) {
    throw processError(err);
  }
};

/**
 * This method read user config and returns the tools and configuration required for user's private workspace.
 * In case it encounters any problems such as missing or corrupt data, default tools are returned and user config is updated.
 */
const getPrivateTools = async () => {
  try {
    let reqTools;
    let otherTools;
    // Retrieve the required tools from user config
    if (config.hasSecret('rtnc')) {
      try {
        reqTools = JSON.parse(config.getSecret('rtnc'));
      } catch (e) {
        // In case of error with JSON parse error with required tools, we will set up defaults again
      }
    }
    // Retrieve the all other tools, except for required tools from user config
    if (config.hasUserConfig('tools')) {
      otherTools = config.readUserConfig('tools');
    }
    // In case any of the 2 tools section (required or others) is not a JS object, we will set up defaults again
    // This may happen when user tampers with the user config manually or the user config gets overwritten/reset
    if (_.isPlainObject(reqTools) && _.isPlainObject(otherTools)) {
      otherTools[reqToolsKey] = reqTools;
      return _.cloneDeep(otherTools);
    }
    // Get default tools and return them
    const defaultTools = await setDefaultPrivateTools();
    return _.cloneDeep(defaultTools);
  } catch (err) {
    throw processError(err);
  }
};

/**
 * Reset default values for Name & Email config setting for Git as per the logged in user (in user config, NOT IN GIT)
 */
const resetGitNameEmailDefaults = async () => {
  try {
    const privateTools = await getPrivateTools();
    // Need to manipulate git settings only if git is includeed in user's private tools
    if (_.has(privateTools, 'versionControlTools.git')) {
      const toolGit = privateTools.versionControlTools.git;
      // if configuration object was found, reset name and email to match with currently logged in user
      if (_.isPlainObject(toolGit) && _.has(toolGit, 'configuration') && _.isPlainObject(toolGit.configuration)) {
        const gitConf = toolGit.configuration;
        const name = config.hasUserConfig('name') ? config.readUserConfig('name') : '';
        const email = config.hasUserConfig('email') ? config.readUserConfig('email') : '';
        gitConf.name = { value: name };
        gitConf.email = { value: email };
      } else {
        // if git object or configuration object is not an object, reset the whole git tool in user config
        const defaultTools = require('../tools/tools').getDefaultToolsAndConfig();
        privateTools.versionControlTools.git = defaultTools.versionControlTools.git;
      }
      await updateToolsAndConfig(privateTools);
    }
    return _.cloneDeep(privateTools);
  } catch (err) {
    throw processError(err);
  }
};

/**
 * Method to retrieve the all Private Workspace Details - such as projects, orgs and tools.
 */
const getPrivateWorkspaceDetails = async () => {
  const result = emptyResult();
  try {
    const projects = await getPrivateProjects();
    const orgs = await getPrivateOrgs();
    const tools = await getPrivateTools();
    result.data = { projects, orgs, tools };
    return result;
  } catch (err) {
    result.error = processError(err);
    throw result;
  }
};

module.exports = {
  getUserName,
  getPrivateProjectByPath,
  getPrivateProjectById,
  getPrivateProjectByKey,
  getPrivateProjects,
  extractKeyRemovePrivateProject,
  addPrivateProject,
  updatePrivateProject,
  deletePrivateProject,
  getPrivateOrgById,
  getPrivateOrgs,
  setSingleOrgMapping,
  updatePrivateOrgs,
  updateProjectOrgs,
  updateToolsAndConfig,
  setDefaultPrivateTools,
  getPrivateTools,
  resetGitNameEmailDefaults,
  getPrivateWorkspaceDetails,
};
