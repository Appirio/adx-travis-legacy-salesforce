const _ = require('lodash');
const fs = require('fs');
const config = require('../config/config');
const appirio = require('../config/appirio');
const { getNewUniqueId, isValidUniqueId } = require('./misc');
const { extractKeyRemovePrivateProject } = require('./user');
const { isValidADXProject } = require('../project/validate');

const ERR_NO_USER_ID = 'User Id not found';
const ERR_PROJ_NOT_FOUND = 'Project not found!';
const ERR_TEAM_NOT_FOUND = 'Team not found!';

/* ***************************** UTIL METHODS (Internal) ***************************************************************************** */
/* ***************************** These shouldn't be called from desktop app directly ************************************************* */
/* ***************************** These should only be called from other node modules ************************************************* */

// ////////////////////// Reusable Methods - Start ////////////////////// //

/**
 * Method to create the project structure.
 * @param {string} hasAuth0Id Is auth0Id available in team config.
 * @param {string} auth0Id Auth0Id of the user.
 * @param {object} team Team data.
 * @returns {object} all projects of the team.
 */
const createProjectStructure = (hasAuth0Id, auth0Id, team) => {
  const projectsKey = `${auth0Id}.${team.id}.projects`;
  let localProjects = {};
  if (hasAuth0Id && config.hasUserConfig(projectsKey, appirio.teamConfigFile)) {
    localProjects = config.readUserConfig(projectsKey, appirio.teamConfigFile);
  }
  // Create new Project structure for the team if exist or not.
  const projects = {};
  _.each(team.projects, (project) => {
    // check if project already exists then use existing project otherwise create new project for team config.
    let localProject = _.find(localProjects, { id: project.id });
    if (localProject) {
      if (!(localProject.path && fs.existsSync(localProject.path)) || !isValidUniqueId(localProject.key)) {
        localProject = {};
      }
      localProject.id = project.id;
      localProject.archived = false;
      delete localProject.type;
      projects[project.id] = localProject;
    } else {
      projects[project.id] = { id: project.id, archived: false };
    }
  });
  return _.cloneDeep(projects);
};

/**
 * Method to clean the team orgs.
 * @param {string} hasAuth0Id Is auth0Id available in team config.
 * @param {string} auth0Id Auth0Id of the user.
 * @param {string} teamId Team Id.
 * @param {object} apiOrgs API response of the orgs for the given team.
 * @returns {object} All team level orgs.
 */
const cleanTeamOrgs = (hasAuth0Id, auth0Id, teamId, apiOrgs) => {
  const orgsKey = `${auth0Id}.${teamId}.orgs`;
  let orgs = {};
  if (hasAuth0Id && config.hasUserConfig(orgsKey, appirio.teamConfigFile)) {
    // Read local orgs from the team config.
    const localOrgs = config.readUserConfig(orgsKey, appirio.teamConfigFile);
    // create an array of existing orgs id and orgs id of the API response.
    const localOrgsKeys = _.keys(localOrgs);
    const apiOrgsKeys = _.keys(apiOrgs);
    const orgsToRemove = _.difference(localOrgsKeys, apiOrgsKeys);
    orgs = _.omit(localOrgs, orgsToRemove);
  }
  return _.cloneDeep(orgs);
};

/**
 * Method to remove the key, path and type from team config for the project that has the same project path with the given path.
 * @param {string} inputPath  It is the project path of the local system.
 */
const removeTeamProjectDetails = async (inputPath) => {
  // read entire team config file
  const teamConfig = config.readConfigFile(appirio.teamConfigPath);
  let projectFound = false;
  // loop through each auth0Id/credentials
  _.each(teamConfig, (teamData) => {
    // loop through each team of the auth0Id.
    _.each(teamData, (team) => {
      // find the project in team with the given input Path.
      const existingProjectArr = _.filter(team.projects, { path: inputPath });
      _.each(existingProjectArr, (existingProject) => {
        const proj = existingProject;
        delete proj.key;
        delete proj.path;
        delete proj.type;
        projectFound = true;
      });
    });
  });
  if (projectFound) {
    await config.writeConfigFromObject(appirio.userConfigDir, appirio.teamConfigFile, teamConfig);
  }
};

/**
 * Method to create team orgs structure
 * @param {object} apiResultOrgs API response of the orgs.
 * @param {object} inputOrgs API input of the orgs.
 * @returns {object} All team level orgs.
 */
const createTeamOrgsStructure = (apiResultOrgs, inputOrgs) => {
  const orgs = {};
  _.each(apiResultOrgs, (org, orgId) => {
    orgs[orgId] = { username: inputOrgs[orgId].username };
  });
  return orgs;
};

/**
 * Method to clean the team orgs and add new orgs in team if they are new at the time of project creation.
 * @param {string} auth0Id Auth0Id of the user.
 * @param {string} teamId Team Id.
 * @param {object} apiResultOrgs API response of the team orgs.
 * @param {object} inputOrgs API input of the orgs.
 * @returns {object} All team level orgs.
 */
const createProjectOrgsStructure = (auth0Id, teamId, apiResultOrgs, inputOrgs) => {
  const orgs = cleanTeamOrgs(true, auth0Id, teamId, apiResultOrgs);
  // Here loop is on the input orgs as input orgs(project orgs) is subset of the API response (all team orgs)
  _.each(inputOrgs, (org, orgId) => {
    if (org.username) orgs[orgId] = { username: org.username };
  });
  return orgs;
};

// ////////////////////// Reusable Methods - End ////////////////////// //

/**
 * Method to set the single org details of the team.
 * @param {string} teamId  Team Id.
 * @param {string} orgId  Salesforce Org Id.
 * @param {string} orgUsername Salesforce Org Username.
 */
const setSingleOrgMapping = async (teamId, orgId, orgUsername) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const org = { username: orgUsername };
    const orgKey = `${auth0Id}.${teamId}.orgs.${orgId}`;
    await config.writeUserConfig(orgKey, org, appirio.teamConfigFile);
  }
};

/**
 * Method to refresh the single team details in team config.
 * @param {object} teamAPIResult  API result of the single team.
 */
const refreshSingleTeam = async (teamAPIResult) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const hasAuth0Id = config.hasUserConfig(auth0Id, appirio.teamConfigFile);
    const projects = createProjectStructure(hasAuth0Id, auth0Id, teamAPIResult);
    const orgs = cleanTeamOrgs(hasAuth0Id, auth0Id, teamAPIResult.id, teamAPIResult.orgs);
    const teamStr = { projects, orgs };
    await config.writeUserConfig(`${auth0Id}.${teamAPIResult.id}`, teamStr, appirio.teamConfigFile);
  } else {
    throw ERR_NO_USER_ID;
  }
};

/**
 * Method to refresh all team data in team config file.
 * @param {object} teamsAPIResult All team data.
 */
const refreshAllTeamsForUser = async (teamsAPIResult) => {
  // check if the Auth0Id of the logged in user exist.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    // check if team data have been refreshed before.
    const hasAuth0Id = config.hasUserConfig(auth0Id, appirio.teamConfigFile);
    // Create new team data and replace the existing one.
    let teamResult = {};
    _.each(teamsAPIResult, (subData) => {
      teamResult = _.assign(teamResult, _.mapValues(subData.teams, (team) => {
        const projects = createProjectStructure(hasAuth0Id, auth0Id, team);
        const orgs = cleanTeamOrgs(hasAuth0Id, auth0Id, team.id, team.orgs);
        return {
          projects,
          orgs,
        };
      }));
    });
    await config.writeUserConfig(auth0Id, teamResult, appirio.teamConfigFile);
  } else {
    throw ERR_NO_USER_ID;
  }
};

/**
 * Method to add the team in team config.
 * @param {object} teamsAPIResult  API response of the team creation.
 * @param {object} teamInput Input of the team creation API.
 */
const addTeam = async (teamAPIResult, teamInput) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    let teamStr = {};
    if (config.hasUserConfig(auth0Id, appirio.teamConfigFile)) {
      teamStr = config.readUserConfig(auth0Id, appirio.teamConfigFile);
    }
    const orgs = createTeamOrgsStructure(teamAPIResult.orgs, teamInput.orgs);
    teamStr[teamAPIResult.id] = { orgs, projects: {} };
    await config.writeUserConfig(auth0Id, teamStr, appirio.teamConfigFile);
  } else {
    throw ERR_NO_USER_ID;
  }
};

/**
 * Method to add project in team config
 * @param {string} teamId  Team Id.
 * @param {object} projectAPIResult  API result of creating the project and it contains all team orgs also.
 * @param {object} projectInput API input of creating the project in the given team.
 */
const addProject = async (teamId, projectAPIResult, projectInput) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const teamKey = `${auth0Id}.${teamId}`;
    // check if team already exist in team config file. if not then create fresh structure if the projects.
    let team = {};
    if (config.hasUserConfig(teamKey, appirio.teamConfigFile)) {
      team = config.readUserConfig(teamKey, appirio.teamConfigFile);
    } else {
      team.projects = {};
      team.orgs = {};
    }
    // Check if project exists in private workspace
    const teamProject = { id: projectAPIResult.project.id, archived: false };
    const existingProjectKey = await extractKeyRemovePrivateProject(projectInput.path);
    await removeTeamProjectDetails(projectInput.path);
    // check, it is valid ADX project, if not then do not set path, key and type in project and throw error.
    const isValid = isValidADXProject(projectInput.path);
    if (isValid.data) {
      teamProject.path = projectInput.path;
      teamProject.key = isValidUniqueId(existingProjectKey) ? existingProjectKey : getNewUniqueId();
    }

    // update existing or new team projects with new created project.
    team.projects[projectAPIResult.project.id] = teamProject;
    // Clean all team level orgs.
    team.orgs = createProjectOrgsStructure(auth0Id, teamId, projectAPIResult.teamOrgs, projectInput.orgs);
    await config.writeUserConfig(teamKey, team, appirio.teamConfigFile);

    if (!isValid.data) {
      throw isValid;
    }
  } else {
    throw ERR_NO_USER_ID;
  }
};

/**
 * Method to delete project from team config
 * @param {string} teamId  Team Id.
 * @param {string} projectId Project Id.
 */
const deleteProject = async (teamId, projectId) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const projectKey = `${auth0Id}.${teamId}.projects`;

    let projects;
    // check if project exists.
    if (config.hasUserConfig(projectKey, appirio.teamConfigFile)) {
      // get all the projects for this team.
      projects = config.readUserConfig(projectKey, appirio.teamConfigFile);
      // check if projects is an object.
      if (_.isPlainObject(projects)) {
        // delete the project.
        delete projects[projectId];
      } else {
        projects = {};
      }
    } else {
      projects = {};
    }
    await config.writeUserConfig(projectKey, projects, appirio.teamConfigFile);
  } else {
    throw ERR_NO_USER_ID;
  }
};

/**
 * Method to update the team orgs in team config
 * @param {string} teamId  Team Id.
 * @param {object} orgsAPIResult  API result of updating the team orgs
 * @param {object} orgInput API input of updating the team orgs.
 */
const updateTeamOrgs = async (teamId, orgsAPIResult, orgInput) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const orgKey = `${auth0Id}.${teamId}.orgs`;
    // Create new orgs structure that contains existing and new orgs.
    const orgs = createTeamOrgsStructure(orgsAPIResult.orgs, orgInput);
    // Replace the all orgs with new orgs
    await config.writeUserConfig(orgKey, orgs, appirio.teamConfigFile);
  } else {
    throw ERR_NO_USER_ID;
  }
};

/**
 * Method to update & clean the team orgs and add new orgs if created
 * @param {string} teamId  Team Id.
 * @param {object} projectAPIResult  API result of updating the project orgs and it contains all the team orgs.
 * @param {object} projectOrgsInput API input of updating the project orgs.
 */
const updateProjectOrgs = async (teamId, projectAPIResult, projectOrgsInput) => {
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const orgKey = `${auth0Id}.${teamId}.orgs`;
    const orgs = createProjectOrgsStructure(auth0Id, teamId, projectAPIResult.teamOrgs, projectOrgsInput.orgs);
    await config.writeUserConfig(orgKey, orgs, appirio.teamConfigFile);
  } else {
    throw ERR_NO_USER_ID;
  }
};

/* ******************************** UTIL METHODS (General) *************************************************************************** */
/* ******************************** These can be callled from desktop app directly *************************************************** */

/**
 * Method to return the locally-stored org details from team config.
 * @param {string} teamId  Team Id.
 * @param {string} orgId  Salesforce Org Id.
 * @returns locally-stored org details from team config.
 */
const getTeamOrgById = (teamId, orgId) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const orgKey = `${auth0Id}.${teamId}.orgs.${orgId}`;
    // if org exists in team config, then return the details otherwise return null.
    if (config.hasUserConfig(orgKey, appirio.teamConfigFile)) {
      return _.cloneDeep(config.readUserConfig(orgKey, appirio.teamConfigFile));
    }
    return null;
  }
  throw ERR_NO_USER_ID;
};

/**
 * Method to retrieve all the org details from team config, for a particular team.
 * @param {string} teamId  Team Id.
 * @returns all the locally-stored org details from team config, for a particular team.
 */
const getTeamOrgs = (teamId) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const teamKey = `${auth0Id}.${teamId}`;
    // if team exists in team config, then return the project details, otherwise throw error.
    if (config.hasUserConfig(teamKey, appirio.teamConfigFile)) {
      const teamDetail = config.readUserConfig(teamKey, appirio.teamConfigFile);
      return _.isPlainObject(teamDetail) ? _.cloneDeep(teamDetail.orgs) : null;
    }
    throw ERR_TEAM_NOT_FOUND;
  }
  throw ERR_NO_USER_ID;
};

/**
 * Method to return the locally-stored project details from team config.
 * @param {string} teamId  Team Id.
 * @param {string} projectId   Project Id.
 * @returns locally-stored project details from team config.
 */
const getTeamProjectById = (teamId, projectId) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const projectKey = `${auth0Id}.${teamId}.projects.${projectId}`;
    // if project exists in team config, then return the project details, otherwise throw error.
    if (config.hasUserConfig(projectKey, appirio.teamConfigFile)) {
      return _.cloneDeep(config.readUserConfig(projectKey, appirio.teamConfigFile));
    }
    throw ERR_PROJ_NOT_FOUND;
  }
  throw ERR_NO_USER_ID;
};

/**
 * Method to return all the locally-stored projects from team config, for a particular team.
 * @param {string} teamId  Team Id.
 * @returns all the locally-stored project details from team config, for a particular team.
 */
const getTeamProjects = (teamId) => {
  // check if the Auth0Id of the logged in user exist if not throw error.
  if (config.hasUserConfig('userId')) {
    const auth0Id = config.readUserConfig('userId');
    const teamKey = `${auth0Id}.${teamId}`;
    // if team exists in team config, then return the project details, otherwise throw error.
    if (config.hasUserConfig(teamKey, appirio.teamConfigFile)) {
      const teamDetail = config.readUserConfig(teamKey, appirio.teamConfigFile);
      return _.isPlainObject(teamDetail) ? _.cloneDeep(teamDetail.projects) : null;
    }
    throw ERR_TEAM_NOT_FOUND;
  }
  throw ERR_NO_USER_ID;
};

module.exports = {
  /* Methods that SHOULD NOT be called from desktop app  */
  ERR_NO_USER_ID,
  removeTeamProjectDetails,
  setSingleOrgMapping,
  refreshSingleTeam,
  refreshAllTeamsForUser,
  addTeam,
  addProject,
  deleteProject,
  updateTeamOrgs,
  updateProjectOrgs,
  /* Methods that should be called from desktop app  */
  getTeamOrgById,
  getTeamOrgs,
  getTeamProjectById,
  getTeamProjects,
};
