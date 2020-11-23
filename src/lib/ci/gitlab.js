const semver = require('semver');
const gulpLog = require('fancy-log');
const colors = require('ansi-colors');
const appirio = require('../config/appirio');
const config = require('../config/config');
const vcs = require('../vcs/vcs');

let getGroupAccessRecursive;

const encodeURIPart = (value) => {
  if (Number.isInteger(value)) return value;
  return encodeURIComponent(value);
};

const gitlabClient = () => {
  // Users will have one main GitLab server, but might also have project-specific GitLab servers
  let gitlabURL;
  let gitlabToken;
  if (config.hasProjectConfig('continuousIntegrationURL')) {
    gitlabURL = config.readProjectConfig('continuousIntegrationURL');
  } else {
    /* eslint-disable-next-line */
    gitlabURL = appirio.gitlabURL;
  }
  if (gitlabURL && gitlabURL !== appirio.gitlabURL) {
    gitlabToken = process.env.GIT_TOKEN || process.env.GITLAB_TOKEN;
  } else {
    gitlabToken = config.hasSecret('gitlab.personal_token') ? config.getSecret('gitlab.personal_token') : null;
  }
  // GitLab will fail if we don't have at least version 8
  const minNodeVersion = '10.0.0';
  if (semver.lt(process.version, minNodeVersion)) {
    const nodeVersionError = `Node version ${process.version} is not supported. Please update your version of Node to at least ${minNodeVersion}.`;
    gulpLog('ERROR:', colors.red(nodeVersionError));
    throw new Error(`Node version ${process.version} is not supported. Please update your version of Node to at least ${minNodeVersion}.`);
  }
  const { Gitlab } = require('@gitbeaker/node');
  if (gitlabToken) {
    return new Gitlab({
      host: gitlabURL,
      token: gitlabToken,
    });
  }
  const tokenError = 'Gitlab Personal Access Token is not available.';
  throw (tokenError);
};

const getGroupById = groupId => new Promise((resolve, reject) => {
  const gitlab = gitlabClient();
  gitlab.Groups.show(groupId)
    .then(resolve)
    .catch(reject);
});

const getCurrentUser = () => new Promise((resolve, reject) => {
  const gitlab = gitlabClient();
  gitlab.Users.current()
    .then(resolve)
    .catch(reject);
});

const getGroupAccessByUser = (groupId, userId) => new Promise((resolve, reject) => {
  const gitlab = gitlabClient();
  gitlab.GroupMembers.show(groupId, userId)
    .then(resolve)
    .catch(reject);
});

const getParentGroupAccessLevel = (groupId, userId, currentAccess) => {
  let accessLevel = 0;
  return getGroupAccessByUser(groupId, userId)
    .then((res) => {
      // store the higher access level so far
      accessLevel = Math.max(currentAccess, res.access_level);
      // Check further up for parent groups
      return getGroupAccessRecursive(groupId, userId, accessLevel);
    })
    // User doesn't have explict access to the current group/subgroup, hence an error occurs
    // Check further up for parent groups
    .catch(() => getGroupAccessRecursive(groupId, userId, currentAccess));
};

getGroupAccessRecursive = (groupId, userId, accessLevel) => getGroupById(groupId) // Check details for this group to determine if there is another parent group
  .then((group) => {
    if (group.parent_id) {
      // get parent group access level recursively till the top level group
      return getParentGroupAccessLevel(group.parent_id, userId, accessLevel);
    }
    // return the access level for the current group as there is no further parent
    return accessLevel;
  })
  .catch((err) => {
    throw err;
  });

const getProjectAccessLevel = project => new Promise((resolve, reject) => {
  let projectAccessLevel = 0;
  let groupAccessLevel = 0;
  // Access level explicitly defined at the project level
  if (project.permissions && project.permissions.project_access) {
    projectAccessLevel = project.permissions.project_access.access_level;
  }
  // Access level explicitly defined for immediate parent group
  if (project.permissions && project.permissions.group_access) {
    groupAccessLevel = project.permissions.group_access.access_level;
  }
  // If the project is inside a subgroup, fetch the access level recursively
  if (project.namespace.parent_id) {
    getCurrentUser()
      .then(user => getParentGroupAccessLevel(project.namespace.parent_id, user.id, groupAccessLevel))
      .then((finalGroupAccessLevel) => {
        resolve(Math.max(projectAccessLevel, finalGroupAccessLevel));
      }).catch(reject);
  } else {
    resolve(Math.max(projectAccessLevel, groupAccessLevel));
  }
});

const setProjectCache = project => new Promise((resolve, reject) => {
  getProjectAccessLevel(project)
    .then((accessLevel) => {
      const masterOrHigherAccess = accessLevel >= 40;
      return config.writeProjectCache('gitlab.master_level_access', masterOrHigherAccess);
    })
    .then(() => config.writeProjectCache('gitlab.project_id', project.id))
    .then(() => config.writeProjectCache('gitlab.project_path', project.path_with_namespace))
    .then(() => config.writeProjectCache('gitlab.project_details', project))
    .then(() => {
      resolve(project);
    })
    .catch(reject);
});

const getProjectById = projectId => new Promise((resolve, reject) => {
  const gitlab = gitlabClient();
  gitlab.Projects.show(projectId)
    .then(setProjectCache)
    .then(resolve)
    .catch(reject);
});

const getProjectIdAndAccessLevel = () => {
  const result = {
    project_id: '',
    master_level_access: false,
  };
  return new Promise((resolve, reject) => {
    // If project ID and access level are available to be read from project cache read from it
    if (config.hasProjectCache('gitlab.project_id') && config.hasProjectCache('gitlab.master_level_access')) {
      result.project_id = config.readProjectCache('gitlab.project_id');
      result.master_level_access = config.readProjectCache('gitlab.master_level_access');
      resolve(result);
    } else {
      // If project ID and access level are not available in cache, fetch the same from server
      vcs.getRemotePath()
        .then(getProjectById)
        .then(() => {
          result.project_id = config.readProjectCache('gitlab.project_id');
          result.master_level_access = config.readProjectCache('gitlab.master_level_access');
          resolve(result);
        })
        .catch(reject);
    }
  });
};

const schedulePipeline = (description, targetBranch, cron) => new Promise((resolve, reject) => {
  getProjectIdAndAccessLevel()
    .then((response) => {
      if (response.master_level_access) {
        const gitlab = gitlabClient();
        gitlab.PipelineSchedules.create(response.project_id, description, targetBranch, cron).then(() => {
          resolve('Pipeline schedule successfully created.');
        }).catch((err) => {
          reject(err);
        });
      } else {
        const err = 'You do not have sufficient permissions to create schedules for this repository!';
        reject(err);
      }
    })
    .catch(reject);
});

const writeProjectSecretKey = (key, value) => new Promise((resolve, reject) => {
  getProjectIdAndAccessLevel()
    .then((response) => {
      // Secret variables can be manipulated only when user has master level or higher access
      if (response.master_level_access) {
        const gitlab = gitlabClient();
        gitlab.ProjectVariables.edit(response.project_id, key, { value }).then(() => {
          resolve(`Secret key '${key}' successfully updated.`);
        }).catch((err) => {
          if (err.toString().indexOf('Response code 404 (Not Found)') >= 0) {
            gitlab.ProjectVariables.create(response.project_id, { key, value }).then(() => {
              resolve(`Secret key '${key}' successfully created.`);
            }).catch(reject);
          } else {
            reject(err);
          }
        });
      } else {
        const err = 'You do not have sufficient permissions to edit secret variables for this repository!';
        reject(err);
      }
    })
    .catch(reject);
});

module.exports = {
  getCurrentUser,
  getGroupAccessByUser,
  getGroupById,
  getProjectById,
  writeProjectSecretKey,
  schedulePipeline,
};
