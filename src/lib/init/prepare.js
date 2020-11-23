const path = require('path');
const fs = require('fs-extra');
const git = require('simple-git/promise');
const _ = require('lodash');
const rimraf = require('rimraf');
const inquirer = require('inquirer');
const minimatch = require('minimatch');
const colors = require('ansi-colors');
const debugLog = require('../util/debug');
const { executeIcingCommand } = require('../tools/tool-helpers');
const promiseTimeout = require('../util/timeout_promise');
const { checkExistingTeamProject } = require('../project/validate');
const { writeConfigFiles } = require('../scan/sonarqube');
const { emptyResult } = require('../util/misc');
const { logger, fileLogger } = require('../util/logger');

const cwd = path.resolve(process.cwd());

const getQuestions = (ezBakeTemplates, isDemo) => {
  const projectTypeMessage = isDemo ? 'What type of demo do you want to create?' : 'What type of project will you be developing?';
  return [{
    type: 'list',
    name: 'projectType',
    message: projectTypeMessage,
    choices: Object.keys(ezBakeTemplates),
  }, {
    type: 'input',
    name: 'gitOriginURL',
    message: 'Please enter the URL of the remote repository you want to push this project to',
    validate: (answer) => {
      if (answer === '') {
        return 'You must provide the remote URL';
      }
      return true;
    },
  }, {
    type: 'input',
    name: 'projectName',
    message: 'Please enter the name for this project',
    validate: (answer) => {
      if (answer === '') {
        return 'You must provide the name for this project';
      }
      return true;
    },
  }, {
    type: 'input',
    name: 'projectDescription',
    message: 'Please enter a description for this project',
    default: 'An Appirio DX project',
  }];
};

const duplicateProjectNameQuestion = (projectName, projectLocalPath) => [
  {
    type: 'input',
    name: 'projectName',
    message: `${projectLocalPath} already exists. Please specify a new name. If you keep the current name, it will be deleted.`,
    default: `${projectName}`,
  },
];

const existingTeamProjectNameQuestion = projectLocalPath => [
  {
    type: 'input',
    name: 'projectName',
    message: `${projectLocalPath} already exists as a team project. Please specify a new name.`,
    validate: (answer) => {
      if (answer === '') {
        return 'You must provide a new name for this project';
      }
      return true;
    },
  },
];

const getProjectFolderName = projectName => projectName
  .replace(/\W+/g, ' ') // alphanumerics only
  .trimRight()
  .replace(/ /g, '-')
  .toLowerCase();

const validateNewProjectName = async (projectLocalPath, oldProjectName, newProjectName) => {
  if (oldProjectName === newProjectName) {
    try {
      await fs.remove(projectLocalPath);
      logger.info(colors.green(`Deleted ${projectLocalPath}.`));
      return newProjectName;
    } catch (err) {
      fileLogger.addContext('error', err);
      fileLogger.error(`An error occurred while removing folder ${projectLocalPath}. ${err}`);
      fileLogger.removeContext('error');
      throw new Error(`An error occurred while removing folder ${projectLocalPath}. ${err}`);
    }
  } else {
    return newProjectName;
  }
};

const validateFolderExistence = async (projectName, folderName) => {
  const projectInfo = {
    projectName,
    folderName,
  };
  const projectLocalPath = path.join(cwd, `./${folderName}`);
  const existingTeamProject = checkExistingTeamProject(projectLocalPath);

  if (existingTeamProject) {
    const newProject = await inquirer.prompt(existingTeamProjectNameQuestion(projectLocalPath));
    projectInfo.projectName = newProject.projectName;
    projectInfo.folderName = getProjectFolderName(projectInfo.projectName);
    return validateFolderExistence(projectInfo.projectName, projectInfo.folderName);
    // eslint-disable-next-line no-else-return
  } else if (fs.existsSync(projectLocalPath)) {
    const newProject = await inquirer.prompt(duplicateProjectNameQuestion(projectName, projectLocalPath));
    projectInfo.projectName = await validateNewProjectName(projectLocalPath, projectName, newProject.projectName);
    projectInfo.folderName = getProjectFolderName(projectInfo.projectName);
    return validateFolderExistence(projectInfo.projectName, projectInfo.folderName);
  }

  return projectInfo;
};

const cloneProjectTemplate = async (projectType, templateUrl, templateBranch, projectLocalPath) => {
  debugLog(`Cloning ${templateUrl}#${templateBranch} to ${projectLocalPath}\n`);
  logger.info(`Cloning ${projectType} template to ${projectLocalPath}...`);
  // Clone the repo using simple git
  await git().silent(true).clone(templateUrl, projectLocalPath, ['-b', templateBranch]);
  logger.info(colors.green(`Finished cloning ${projectType} template to ${projectLocalPath}.`));
  return true;
};

const readAndInitializeProjectRecipe = (projectLocalPath) => {
  const pathToRecipe = path.join(projectLocalPath, '.ezbake');
  // eslint-disable-next-line import/no-dynamic-require
  return require(pathToRecipe);
};

const removeGitBindings = (projectLocalPath) => {
  const pathToGit = path.join(projectLocalPath, '.git');
  logger.info(`Removing .git folder from ${pathToGit}...`);
  rimraf.sync(pathToGit);
  logger.info(colors.green('Finished deleting .git folder.'));
  return true;
};

const walkSync = (dir, filelist) => {
  const files = fs.readdirSync(dir);
  // eslint-disable-next-line no-param-reassign
  filelist = filelist || [];
  files.forEach((file) => {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      // eslint-disable-next-line no-param-reassign
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      filelist.push({
        path: path.join(dir, file),
        name: file,
      });
    }
  });
  return filelist;
};

const isValidFile = (file, validFiles) => {
  const fileMatches = Object.keys(validFiles).some((filePattern) => {
    const fileMatch = minimatch(file, filePattern);
    return fileMatch && validFiles[filePattern];
  });

  const ignoreMatches = Object.keys(validFiles).some((filePattern) => {
    const fileMatch = minimatch(file, filePattern);
    return fileMatch && validFiles[filePattern] === false;
  });

  return fileMatches && !ignoreMatches;
};

const bakeProject = (projectLocalPath, answers, recipe) => {
  const fileGlobs = recipe.source || {};
  const files = walkSync(projectLocalPath);
  // store original interpolate values to be reset again
  const origInterpolateSettings = _.templateSettings.interpolate;
  // Only watch for <%= %> swaps, lodash template swaps ES6 templates by default
  _.templateSettings.interpolate = /<%=([\s\S]+?)%>/g;
  files.forEach((file) => {
    if (isValidFile(file.path, fileGlobs)) {
      logger.info(`Swapping template values for ${file.path}...`);
      const fileTemplate = _.template(fs.readFileSync(file.path));
      fs.writeFileSync(file.path, fileTemplate(answers), { encoding: 'utf8' });
    }
  });
  // reset interpolate values
  _.templateSettings.interpolate = origInterpolateSettings;
  return true;
};

const establishLocalGitBindings = async (gitOriginURL) => {
  logger.info('Establishing new local .git bindings...');
  // Perform git init
  await git().silent(true).init();
  // add remote origin
  await git().silent(true).addRemote('origin', gitOriginURL);
  logger.info(colors.green('Finished establishing new local .git binding.'));
  return true;
};

/**
 * Adds ingredients (e.g. template values) to an array of cmd's
 * @param {Array} cmd - A string array of commands to execute as icing
 * @param {Object} ingredients - An object of all ingredients collected
 */
const addIngredients = (cmd, ingredients) => cmd.map((cmdItem) => {
  const icingTemplate = _.template(cmdItem);
  return icingTemplate(ingredients);
});

const performIcing = async (recipeIcing, allIngredients) => {
  // store original interpolate values to be reset again
  const origInterpolateSettings = _.templateSettings.interpolate;
  // Only watch for <%= %> swaps, lodash template swaps ES6 templates by default
  _.templateSettings.interpolate = /<%=([\s\S]+?)%>/g;

  logger.info('Applying icing...');

  // eslint-disable-next-line no-restricted-syntax
  for (const icing of recipeIcing) {
    logger.info(icing.description);
    if (Array.isArray(icing.cmd)) {
      // eslint-disable-next-line no-await-in-loop
      await executeIcingCommand(
        addIngredients(icing.cmd, allIngredients),
        icing.cmdOptions,
      );
    }
  }

  logger.info(colors.green('Icing applied.'));
  // reset interpolate values
  _.templateSettings.interpolate = origInterpolateSettings;
  return true;
};

const writeSonarFiles = async (sonarUrl, projectModel) => {
  logger.info('Creating SonarQube configuration files...');
  const sonarArgs = {
    'sonar.host.url': sonarUrl,
  };
  await writeConfigFiles(sonarArgs, projectModel);
  logger.info(colors.green('Finished creating SonarQube configuration files.'));
  return true;
};

const removeEzbakeFolder = (projectLocalPath) => {
  logger.info('Deleting Setup Files...');
  const pathToEzbake = path.join(projectLocalPath, '.ezbake');
  rimraf.sync(pathToEzbake);
  logger.info(colors.green('Deleted Setup Files.'));
  return true;
};

const commitAndPushProject = async () => {
  logger.info('Pushing changes to remote...');
  const { stageChanges, commit } = require('../vcs/git');
  await stageChanges('./*');
  await commit('[Appirio DX] - initial commit');
  await git().silent(true).push(['-u', 'origin', 'master']);
  logger.info(colors.green('Successfully pushed to remote.'));
  return true;
};

const addProject = async (projectLocalPath, projectInput) => {
  const { validateNewPrivateProject } = require('../project/validate');
  const { processDirectory } = require('../project/dir');
  const { addPrivateProject } = require('../util/user');
  const { projectRoot } = processDirectory(projectLocalPath);
  const isValid = validateNewPrivateProject(projectRoot, true);
  if (isValid.error) {
    throw new Error(isValid.error);
  } else {
    const updatedProjectInput = Object.assign(projectInput, {
      path: projectRoot,
      addingProjectFromCLI: true,
    });
    const response = await addPrivateProject(updatedProjectInput);
    logger.info(colors.green(response.data));
    return response;
  }
};

const initFromCLI = async (ezBakeTemplates, templateBranchToClone, isDemo = false) => {
  const TIMEOUT = 20000;
  const templateBranch = templateBranchToClone;
  let projectIngredients = await inquirer.prompt(getQuestions(ezBakeTemplates, isDemo));

  const validProjectNames = await validateFolderExistence(projectIngredients.projectName, getProjectFolderName(projectIngredients.projectName));

  projectIngredients = {
    ...projectIngredients,
    ...validProjectNames,
  };
  const projectLocalPath = path.join(cwd, `./${projectIngredients.folderName}`);

  try {
    await cloneProjectTemplate(projectIngredients.projectType, ezBakeTemplates[projectIngredients.projectType].url, templateBranch, projectLocalPath);
  } catch (e) {
    fileLogger.addContext('error', e);
    fileLogger.error(`An error occurred while cloning template repository. ${e}`);
    fileLogger.removeContext('error');
    throw new Error(`An error occurred while cloning template repository. ${e}`);
  }

  process.chdir(projectLocalPath);

  const recipe = await readAndInitializeProjectRecipe(projectLocalPath);

  // Remove git bindings
  try {
    await promiseTimeout(
      TIMEOUT,
      removeGitBindings(projectLocalPath),
    );
  } catch (err) {
    fileLogger.addContext('error', err);
    fileLogger.error(`An error occurred while deleting existing Git bindings. ${err}`);
    fileLogger.removeContext('error');
    throw new Error(`An error occurred while deleting existing Git bindings. ${err}`);
  }

  const templateIngredients = await inquirer.prompt(recipe.ingredients);
  const allIngredients = {
    ...projectIngredients,
    ...templateIngredients,
  };

  bakeProject(projectLocalPath, allIngredients, recipe);

  try {
    await promiseTimeout(
      TIMEOUT,
      establishLocalGitBindings(allIngredients.gitOriginURL),
    );
  } catch (err) {
    fileLogger.addContext('error', err);
    fileLogger.error(`An error occurred while establishing new Git bindings. ${err}`);
    fileLogger.removeContext('error');
    throw new Error(`An error occurred while establishing new Git bindings. ${err}`);
  }

  if (recipe.icing && Array.isArray(recipe.icing) && recipe.icing.length > 0) {
    await performIcing(recipe.icing, allIngredients);
  }

  if (allIngredients.enableSonarQube) {
    try {
      await writeSonarFiles(allIngredients.sonarUrl, ezBakeTemplates[allIngredients.projectType].value);
    } catch (e) {
      logger.addContext('error', e);
      logger.error(colors.yellow(`Failed to create SonarQube configuration files! ${e}`));
      logger.removeContext('error');
    }
  }

  try {
    removeEzbakeFolder(projectLocalPath);
  } catch (e) {
    logger.addContext('error', e);
    logger.error(colors.yellow(`Failed to delete .ezbake folder! ${e}`));
    logger.removeContext('error');
  }

  try {
    await commitAndPushProject();
  } catch (e) {
    logger.addContext('error', e);
    logger.error(colors.yellow(`Your project was successfully created but we were not able to push it to the Git remote. ${e}`));
    logger.removeContext('error');
  }

  try {
    await addProject(projectLocalPath, {
      name: allIngredients.projectName,
      description: allIngredients.projectDescription,
    });
  } catch (e) {
    fileLogger.addContext('error', e);
    fileLogger.error(`An error occurred while adding project to your workspace. ${e}`);
    fileLogger.removeContext('error');
    throw e;
  }

  logger.info(colors.green('Your project is ready!'));
  return true;
};

/**
 *
 * @param {*} projectInput : Object which contains all information such as gitOriginURL, localPath, projectName, projectType, projectTypeTemplateUrl, projectDescription
 */
const initFromApp = async (projectInput, templateBranchToClone = 'ezbake') => {
  const result = emptyResult();
  try {
    const projectIngredients = {
      ...projectInput,
      folderName: getProjectFolderName(projectInput.projectName),
    };
    const projectLocalPath = path.join(projectIngredients.localPath, projectIngredients.folderName);

    try {
      await cloneProjectTemplate(projectInput.projectType, projectInput.projectTypeTemplateUrl, templateBranchToClone, projectLocalPath);
    } catch (e) {
      throw new Error(`Failed to clone project template: ${e}`);
    }

    result.data = projectIngredients;
    return result;
  } catch (e) {
    result.error = e;
    throw result;
  }
};

const completeInitFromApp = async (allIngredients) => {
  const TIMEOUT = 20000;
  const warnings = [];
  const result = emptyResult();
  try {
    const projectLocalPath = path.join(allIngredients.localPath, allIngredients.folderName);

    process.chdir(projectLocalPath);

    const recipe = await readAndInitializeProjectRecipe(projectLocalPath);

    // Remove git bindings
    try {
      await promiseTimeout(
        TIMEOUT,
        removeGitBindings(projectLocalPath),
      );
    } catch (err) {
      throw new Error(`Failed to delete existing Git bindings: ${err}`);
    }

    bakeProject(projectLocalPath, allIngredients, recipe);

    try {
      await promiseTimeout(
        TIMEOUT,
        establishLocalGitBindings(allIngredients.gitOriginURL),
      );
    } catch (err) {
      throw new Error(`Failed to establish new Git bindings: ${err}`);
    }

    if (recipe.icing && Array.isArray(recipe.icing)) {
      await performIcing(recipe.icing, allIngredients);
    }

    if (allIngredients.enableSonarQube) {
      try {
        await writeSonarFiles(allIngredients.sonarUrl, allIngredients.projectModel);
      } catch (e) {
        warnings.push(`Failed to create SonarQube configuration files: ${e}`);
      }
    }

    try {
      removeEzbakeFolder(projectLocalPath);
    } catch (e) {
      warnings.push(`Failed to delete .ezbake folder: ${e}`);
    }

    try {
      await commitAndPushProject();
    } catch (e) {
      warnings.push(`Failed to push to Git remote: ${e}`);
    }

    console.log('Project is Ready!');
    if (warnings.length > 0) {
      throw warnings;
    } else {
      result.data = true;
      return result;
    }
  } catch (e) {
    if (warnings.length > 0) {
      result.warning = warnings;
    } else {
      result.error = e;
    }
    throw result;
  }
};

module.exports = {
  getProjectFolderName,
  initFromCLI,
  initFromApp,
  completeInitFromApp,
};
