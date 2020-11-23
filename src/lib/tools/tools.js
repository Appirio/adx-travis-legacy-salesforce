const os = require('os');
const _ = require('lodash');
const rollbar = require('../notify/rollbar');
const debugLog = require('../util/debug');
const toolsMaster = require('./tools-master.json');
const { executeCommand, fixFieldType, ERR_BAD_PLATFORM } = require('./tool-helpers');
const { isRestrictedPowershell } = require('../util/env');

const currentOS = os.platform();

/* eslint-disable-next-line no-unused-vars */
let brew; let choco; let node; let yarn; let sfdx; let eslint; let pmd; let sonarqube; let vscode; let sublime; let vlocitydx; let vlocitybuild;
/* eslint-disable-next-line no-unused-vars */
let git; let sourcetree; let cmc; let gitlab; let bitbucket; let circleci; let jenkins; let travis; let vsts;

let mapOfTools;
let mapOfAllTools;

debugLog('Tools :: Path >>> ', process.env.PATH);

const importTools = () => {
  // all services and some tools don't need current OS, so don't need to pass current OS values
  brew = require('./tools-config/brew').brew(currentOS);
  choco = require('./tools-config/choco').choco(currentOS);
  node = require('./tools-config/node').node(currentOS);
  yarn = require('./tools-config/yarn').yarn(currentOS);
  sfdx = require('./tools-config/sfdx').sfdx(currentOS);
  eslint = require('./tools-config/eslint').eslint(currentOS);
  pmd = require('./tools-config/pmd').pmd(currentOS);
  sonarqube = require('./tools-config/sonarqube').sonarqube(currentOS);
  vscode = require('./tools-config/vscode').vscode(currentOS);
  sublime = require('./tools-config/sublime').sublime(currentOS);
  vlocitydx = require('./tools-config/vlocitydx').vlocitydx(currentOS);
  vlocitybuild = require('./tools-config/vlocitybuild').vlocitybuild(currentOS);
  git = require('./tools-config/git').git(currentOS);
  sourcetree = require('./tools-config/sourcetree').sourcetree(currentOS);
  cmc = require('./tools-config/cmc').cmc(currentOS);
  gitlab = require('./tools-config/gitlab').gitlab(currentOS);
  bitbucket = require('./tools-config/bitbucket').bitbucket(currentOS);
  circleci = require('./tools-config/circleci').circleci(currentOS);
  jenkins = require('./tools-config/jenkins').jenkins(currentOS);
  travis = require('./tools-config/travis').travis(currentOS);
  vsts = require('./tools-config/vsts').vsts(currentOS);
};

/**
 * returns tools supported for user's OS
 * @param {*} listOfTools : List of all Appirio DX supported tools
 */
const getToolsForCurrentOS = listOfTools => _.filter(listOfTools, tool => tool.validPlatforms.includes(currentOS));

/**
 * returns sorted tool list in the order of dependencies, i.e. most important dependency comes first followed by dependent tools
 * brew => node => yarn => allOthers
 * @param {*} listOfTools : List of all Appirio DX supported tools
 */
const getSortedTools = (listOfTools) => {
  const toposort = require('topo-sort');
  // eslint-disable-next-line new-cap
  const dependencySortedList = new toposort();
  listOfTools.forEach((tool) => {
    dependencySortedList.add(tool.id, tool.platform.dependencies);
  });
  const sortedList = dependencySortedList.sort().reverse();
  return sortedList.map((toolId, index) => {
    const toolObj = listOfTools.find(tool => tool.id === toolId);
    if (toolObj) {
      toolObj.sortOrder = index + 1;
    }
    return toolObj;
  });
};

/**
 * Creates map of all available sorted tools depending on user's OS and map of all tools as well
 */
const requiredTools = () => {
  importTools();
  const listOfTools = [];
  const allAvailableTools = toolsMaster.tools;
  if (allAvailableTools && allAvailableTools.length > 0) {
    allAvailableTools.forEach((toolId) => {
      // eslint-disable-next-line no-eval
      listOfTools.push(eval(toolId));
    });
  }
  // Filter listOfTools for the current OS
  const listOfCurrentOSTools = getToolsForCurrentOS(listOfTools);

  // Sort tool list according to the dependencies to show it in order on UI
  const sortedCurrentOSTools = getSortedTools(listOfCurrentOSTools);
  const sortedAllTools = getSortedTools(listOfTools);

  // Create map of tools to use them later in all places
  mapOfTools = _.mapKeys(sortedCurrentOSTools, 'id');
  mapOfAllTools = _.mapKeys(sortedAllTools, 'id');
};

const getToolVersion = (versionNumberString) => {
  let re = /[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}/;
  let versionNumberMatches = re.exec(versionNumberString);
  if (Array.isArray(versionNumberMatches) && versionNumberMatches.length > 0) {
    return {
      installationStatus: `v${versionNumberMatches[0]}`,
      semverInstallationStatus: `v${versionNumberMatches[0]}`,
    };
    // eslint-disable-next-line no-else-return
  } else {
    re = /[0-9]{1,5}\.[0-9]{1,5}/;
    versionNumberMatches = re.exec(versionNumberString);
    if (Array.isArray(versionNumberMatches) && versionNumberMatches.length > 0) {
      return {
        installationStatus: `v${versionNumberMatches[0]}`,
        semverInstallationStatus: `v${versionNumberMatches[0]}.0`,
      };
    }
  }

  return {
    installationStatus: 'Not Installed',
    semverInstallationStatus: undefined,
  };
};

/**
 * returns tool object along with installation status and recommended and minimum version validations
 * @param {*} toolId
 */
const checkIfToolIsInstalled = toolId => new Promise((resolve) => {
  const semver = require('semver');
  if (!mapOfTools) {
    requiredTools();
  }
  console.log(`${toolId} :: Version Check`);
  const tool = mapOfTools[toolId];
  // Find the installation status only for installable tools
  if (tool.platform.versionCommand) {
    executeCommand(tool.platform.versionCommand)
      .then((versionResult) => {
        let installationStatusForSemver;
        tool.versionCheckResult = '';
        if (tool.id === 'sublime') {
          tool.installationstatus = versionResult;
        } else {
          const { installationStatus, semverInstallationStatus } = getToolVersion(versionResult);
          tool.installationstatus = installationStatus;
          installationStatusForSemver = semverInstallationStatus;
        }
        if (tool.installationstatus === 'Not Installed') {
          tool.versionCheckResult = versionResult;
        } else {
          if (tool.platform.recommendedVersion) {
            // if tool has recommendedVersion, find whether tool installed version is greater than recommendedVersion
            tool.fulfillsRecommendedToolVersion = semver.gte(installationStatusForSemver, tool.platform.recommendedVersion);
          } else {
            tool.fulfillsRecommendedToolVersion = true;
          }
          if (tool.platform.minimumVersion) {
            // if tool has minimumVersion, find whether tool installed version is greater than minimumVersion
            tool.fulfillsMinimumToolVersion = semver.gte(installationStatusForSemver, tool.platform.minimumVersion);
          } else {
            tool.fulfillsMinimumToolVersion = true;
          }
        }
        resolve(tool);
      }).catch((err) => {
        tool.versionCheckResult = err;
        if (tool.id === 'choco' && isRestrictedPowershell()) {
          tool.platform.installType = 'link';
        }
        // If tool version command errors out, treat the tool as Not Installed
        tool.installationstatus = 'Not Installed';
        resolve(tool);
      });
  } else {
    // for non-installable tools, return tool object directly
    resolve(tool);
  }
});

/**
 * returns an object with the currently set configuration value for the passed in configuration
 * @param {*} configuration : tool configuration object for a setting
 */
const getConfigurationValue = configuration => executeCommand(configuration.getValue)
  .then(configValue => ({
    key: configuration.item,
    value: fixFieldType(configuration.fieldType, configValue),
  }))
  // return error which occured while getting configuration setting in the below format
  .catch(configureError => ({
    key: configuration.item,
    error: configureError,
  }));

const createToolConfigObject = (toolConfigList) => {
  const toolConfigObject = {};
  toolConfigList.forEach((toolConfig) => {
    toolConfigObject[toolConfig.key] = {
      ...!_.isNil(toolConfig.value) && { value: toolConfig.value },
      ...toolConfig.error && { error: toolConfig.error },
    };
  });
  return toolConfigObject;
};

/**
 * returns a formatted configuration object
 *  if toolConfigurationList is specified return config values only for them, else return values for all tool configuration
 * @param {*} toolId
 * @param {*} toolConfigurationList : (optional) array of configuration items whose current config value need to be fetched
 */
const getToolConfiguration = (toolId, toolConfigurationList) => new Promise((resolve) => {
  if (!mapOfTools) {
    requiredTools();
  }
  const toolConfigs = [];
  const tool = mapOfTools[toolId];
  const toolConfigurations = tool.platform && tool.platform.configuration && tool.platform.configuration.components;
  // Fetch the configuration if the tool has got any configuration defined
  if (toolConfigurations) {
    const toolConfigurationsMap = _.mapKeys(toolConfigurations, 'item');
    let toolConfigurationsToFetch;
    // if toolConfigurationList is not passed or it does not contain any item, fetch all tool config values
    if (!toolConfigurationList || toolConfigurationList.length <= 0) {
      toolConfigurationsToFetch = Object.keys(toolConfigurationsMap);
    } else {
      // if toolConfigurationList is passed, only fetch config values for them
      toolConfigurationsToFetch = toolConfigurationList;
    }
    toolConfigurationsToFetch.forEach((configuration) => {
      const currSetting = toolConfigurationsMap[configuration];
      // Filter out any configuration not applicable for current OS
      if (!currSetting.item.includes('___') || currSetting.item.endsWith(`___${currentOS}`)) {
        toolConfigs.push(getConfigurationValue(currSetting));
      }
    });
    Promise.all(toolConfigs)
      .then((toolConfigList) => {
        // simplify tool config object before resolving
        resolve(createToolConfigObject(toolConfigList));
      });
  } else {
    // Resolve as undefined for tools that do not have configuration defined
    resolve();
  }
});

/**
 * @param {*} toolVersionResult : version result of the tool
 * @param {*} toolConfigResult : configuration values result for tool
 */
const createToolStatusObject = (toolVersionResult, toolConfigResult) => {
  const toolStatus = {
    id: toolVersionResult.id,
    ...toolVersionResult.versionCheckResult && { versionCheckResult: toolVersionResult.versionCheckResult },
    ...toolVersionResult.installationstatus && { installationstatus: toolVersionResult.installationstatus },
    ...!_.isNil(toolVersionResult.fulfillsRecommendedToolVersion) && { fulfillsRecommendedToolVersion: toolVersionResult.fulfillsRecommendedToolVersion },
    ...!_.isNil(toolVersionResult.fulfillsMinimumToolVersion) && { fulfillsMinimumToolVersion: toolVersionResult.fulfillsMinimumToolVersion },
    ...toolVersionResult.platform.installationHelp && { installationHelp: toolVersionResult.platform.installationHelp },
    ...toolVersionResult.platform.configurationHelp && { configurationHelp: toolVersionResult.platform.configurationHelp },
    ...toolVersionResult.platform.manualInstallUrl && { manualInstallUrl: toolVersionResult.platform.manualInstallUrl },
    ...toolVersionResult.platform.installType && { installType: toolVersionResult.platform.installType },
    ...toolVersionResult.platform.token_url && { token_url: toolVersionResult.platform.token_url },
    ...!_.isEmpty(toolConfigResult) && { configuration: toolConfigResult },
  };
  return toolStatus;
};

/**
 * returns local tool version and its configurations
 * @param {*} toolId
 */
const getSingleToolStatus = toolId => new Promise((resolve) => {
  // get tool version if installed
  checkIfToolIsInstalled(toolId)
    .then((toolVersionResult) => {
      if (toolVersionResult.installationstatus !== 'Not Installed') {
        // if tool is installed, get its current configurations
        getToolConfiguration(toolId)
          .then((toolConfigResult) => {
            // simplify tool object before resolving
            resolve(createToolStatusObject(toolVersionResult, toolConfigResult));
          });
      } else {
        // simplify tool object before resolving
        resolve(createToolStatusObject(toolVersionResult));
      }
    });
});

/**
 * Returns tool status of all Appirio DX supported tools which are also supported by the user's OS.
 * Return value includes version result as well as configuration values for the tool
 */
const getLocalToolStatus = () => {
  const shell = require('shelljs');
  const { getLatestWindowsPath, getLatestMacPath } = require('../util/env');
  if (!mapOfTools) {
    requiredTools();
  }
  // For windows only, fetch new path and then only allow checking tool versions
  let pathPromise;
  if (currentOS === 'win32') {
    // get Windows latest PATH before proceeding
    pathPromise = getLatestWindowsPath();
  } else if (currentOS === 'darwin') {
    // get Mac latest PATH before proceeding
    pathPromise = Promise.resolve(getLatestMacPath());
  } else {
    pathPromise = Promise.resolve('');
  }
  return pathPromise
    .then(async (outputPath) => {
      if (outputPath !== '') {
        shell.env.PATH = outputPath;
      }
      const toolStatuses = [];
      Object.keys(mapOfTools).forEach((toolId) => {
        toolStatuses.push(getSingleToolStatus(toolId));
      });
      return Promise.all(toolStatuses)
        .then((toolStatusResult) => {
          const mapOfToolStatus = _.mapKeys(toolStatusResult, 'id');
          return mapOfToolStatus;
        });
    })
    .catch(err => Promise.reject(err));
};

/**
 * set tool configuration according to the value passed and return tool config status
 * @param {*} configuration : Tool configuration object for which config needs to be set
 * @param {*} configValue : configuration value that needs to be set
 */
const setConfigurationValue = (configuration, configValue) => executeCommand(configuration.setValue(configValue)) // execute method to set configuration to the value specified
  // if configuration is set successfully, get config status explicitly to avoid any false cases where no error occured but the value was not actually set
  .then(() => getConfigurationValue(configuration))
  // return error which occured while setting configuration setting in the below format
  .catch(async (configureError) => {
    try {
      const oldValue = await getConfigurationValue(configuration);
      return {
        key: configuration.item,
        error: configureError,
        value: oldValue.value,
      };
    } catch (e) {
      return {
        key: configuration.item,
        error: configureError,
      };
    }
  });


/**
 * Sets configurations for a tool based on the input toolConfigs and returns a formatted configuration object
 * @param {*} toolId : id of the tool whose configuration need to be set
 * @param {*} toolConfigs : configuration object containing config item and the value that needs to be set
 */
const setToolConfiguration = (toolId, toolConfigs) => new Promise((resolve, reject) => {
  const bluebird = require('bluebird');
  if (!mapOfTools) {
    requiredTools();
  }
  const toolConfigList = [];
  const tool = mapOfTools[toolId];
  const toolConfigurations = tool.platform && tool.platform.configuration && tool.platform.configuration.components;
  const toolConfigurationMap = _.mapKeys(toolConfigurations, 'item');
  /* Following code executes all promises in a synchronous manner, i.e. serially, using bluebird mapSeries method.
        Also, even if one of more promises get rejected, we want all the settings to be done instead of aborting when the first one fails.  */
  return bluebird.mapSeries(Object.keys(toolConfigs), (configuration) => {
    // set configuration values only for configs passed into toolConfigs
    const currSetting = toolConfigurationMap[configuration];
    // Filter out any configuration not applicable for current OS
    if (!currSetting.item.includes('___') || currSetting.item.endsWith(`___${currentOS}`)) {
      const configValue = toolConfigs[configuration].value;
      return setConfigurationValue(currSetting, configValue)
        .then((configResult) => {
          toolConfigList.push(configResult);
        });
    }
    return '';
  })
    // simplify configuration object before returning
    .then(() => resolve(createToolConfigObject(toolConfigList)))
    .catch(() => {
      reject(new Error('Somehow we couldn\'t continue because of some error!'));
    });
});

/**
 * validates whether yarn prefix is set to expected value or not
 * @param {*} tool : Yarn tool object
 */
const verifyYarnPrefix = tool => new Promise((resolve, reject) => {
  // used for the case of yarn update
  tool.isPrefixSetToUserDir()
    .then((isPrefixSet) => {
      if (!isPrefixSet) {
        // if prefix is not already set to the expected value, ask user for confirmation to change their prefix as part of update process
        /* eslint-disable-next-line no-undef, no-alert, no-restricted-globals */
        if (confirm('For security reasons this will update your Node Modules to be stored in your user folder. Your existing global packages will remain where they are and continue to function. New or updated packages will be stored in your user folder.')) {
          resolve(isPrefixSet);
        } else {
          reject(new Error('We are unable to upgrade Yarn without your permission to set Yarn prefix!'));
        }
      } else {
        resolve(isPrefixSet);
      }
    })
    .catch((verifyPrefixError) => {
      reject(verifyPrefixError);
    });
});

/**
 * validate whether tool dependencies satisfy requirements or not
 * @param {*} tool
 */
const validateToolDependencies = tool => new Promise((resolve, reject) => {
  const toolDependencies = tool.platform && tool.platform.dependencies;
  if (!toolDependencies || toolDependencies.length < 1) {
    // if tool has no dependencies, resolve directly
    resolve();
  } else {
    const dependenciesStatus = [];
    toolDependencies.forEach((dependency) => {
      // check for installation status of each dependency
      dependenciesStatus.push(checkIfToolIsInstalled(dependency));
    });
    Promise.all(dependenciesStatus)
      .then((dependencyStatusResult) => {
        const uninstalledDependency = dependencyStatusResult.find(dependency => dependency.installationstatus === 'Not Installed');
        if (uninstalledDependency) {
          // If any of the dependency is not installed, reject and fail installation
          reject(new Error(`Dependency "${uninstalledDependency.name}" is not installed`));
        } else {
          // If any dependency's version is less than its minimum version, reject and fail installation
          const minimumVersionMissingDependency = dependencyStatusResult.find(dependency => dependency.fulfillsMinimumToolVersion === false || dependency.fulfillsMinimumToolVersion === 'false');
          if (minimumVersionMissingDependency) {
            reject(new Error(`Minimum version "${minimumVersionMissingDependency.platform.minimumVersion}" is not installed for dependency "${minimumVersionMissingDependency.name}"`));
          } else {
            resolve();
          }
        }
      })
      .catch((dependencyStatusError) => {
        // If any of the dependency is not installed, reject and fail installation
        let dependencyError = dependencyStatusError;
        if (dependencyStatusError.installationstatus === 'Not Installed') {
          dependencyError = `Dependency "${dependencyStatusError.name}" is not installed`;
        }
        reject(dependencyError);
      });
  }
});

/**
 * Performs actual tool installation and returns an object with installation result and status as an object
 * @param {*} tool
 */
const executeToolInstallation = (tool, upgrade) => new Promise((resolve, reject) => {
  let installation = tool.platform && tool.platform.installation;
  const needAdminPrivilege = tool.platform && tool.platform.adminPrivileges;
  if (upgrade && tool.platform && tool.platform.upgrade) {
    installation = tool.platform.upgrade;
  }
  // execute method to actually install a tool
  executeCommand(installation, needAdminPrivilege)
    .then((installationResult) => {
      // if tool installation returns no error, try fetching tool installation status
      checkIfToolIsInstalled(tool.id)
        .then((versionResult) => {
          // if tool seem to be successfully installed and version number gets returned, resolve in below format
          resolve({
            installResult: installationResult,
            versionResult,
          });
        });
    })
    .catch((installationError) => {
      // reject for any installation error
      reject(installationError);
    });
});

/**
 * Sends installation status to Rollbar
 * @param {*} action : Specifies whether it is an 'Update' or 'Install'
 * @param {*} payload : contains context, toolId and action to be sent to rollbar
 * @param {*} toolStatus : installation result and version result in object format
 */
const sendInstallationStatusToRollbar = (action, payload, toolStatus, rollBarAccessToken) => new Promise((resolve, reject) => {
  console.log(`${toolStatus.versionResult.id} :: Sending installation notification to Rollbar`);
  let installResult;
  if (typeof toolStatus.installResult !== 'string') {
    // stringify install result
    installResult = JSON.stringify(toolStatus.installResult);
  } else {
    // eslint-disable-next-line prefer-destructuring
    installResult = toolStatus.installResult;
  }
  if (toolStatus.versionResult.installationstatus === 'Not Installed') {
    // if tool version result says Not Installed, reject it with the error
    // rejection will be handled by installTool method which will then log it to rollbar
    let errMessage = `Tool "${toolStatus.versionResult.name}" installed successfully but version command says "Not Installed". Version command results are included for reference.\n\n`;
    errMessage += 'Install Result:\n';
    errMessage += `${installResult}<br>\n\n`;
    errMessage += 'Version command Result:\n';
    errMessage += toolStatus.versionResult.versionCheckResult;
    reject(errMessage);
  } else if (!toolStatus.versionResult.fulfillsMinimumToolVersion || !toolStatus.versionResult.fulfillsRecommendedToolVersion) {
    // For Upgrade case
    // If there was no error while upgrading but still latest version could not be found
    // reject it with error
    // rejection will be handled by installTool method which will then log it to rollbar
    let errMessage = `Tool "${toolStatus.versionResult.name}" ${action === 'Install' ? 'installed' : 'upgraded'} successfully but version command still cannot find the latest version. It can be a PATH issue too. Results are included for reference.\n\n`;
    errMessage += `${action} Result:\n`;
    errMessage += `${installResult}<br>\n\n`;
    errMessage += 'Version command Result:\n';
    errMessage += toolStatus.versionResult.installationstatus;
    reject(errMessage);
  } else {
    // if version result gives us the version, log SUCCESS to rollbar and resolve with version result
    let message = `${action} FOR ${toolStatus.versionResult.id}: SUCCESSFUL!`;
    message += `${action} Result:\n`;
    message += `${installResult}<br>\n\n`;
    rollbar.sendMessage(message, false, payload, rollBarAccessToken);
    resolve(toolStatus.versionResult);
  }
});

/**
 * Installs the tool
 * @param {string} toolId : Id of the tool which need to be installed
 * @param {*} inputToolConfig : This should be a configuration object containing config items and their corresponding values.
 * @param {boolean} upgrade : In case of update it should be passed in as boolean value true. Defaults to false.
 */
const installTool = (toolId, inputToolConfig, rollBarAccessToken, upgrade = false) => new Promise((resolve, reject) => {
  if (!mapOfTools) {
    requiredTools();
  }
  let toolConfigs = {};
  if ((!upgrade || (upgrade && toolId === 'yarn')) && inputToolConfig) {
    toolConfigs = inputToolConfig;
  }
  const action = upgrade ? 'Upgrade' : 'Install';
  const payload = {
    context: 'installTool',
    tool: toolId,
    action,
  };

  let verifyConfigPromise;
  const tool = mapOfTools[toolId];
  if (upgrade && toolId === 'yarn') {
    // if yarn update is required, first verify if its prefix is set correctly or not
    verifyConfigPromise = verifyYarnPrefix(tool)
      .then((isConfigSet) => {
        if (isConfigSet) {
          toolConfigs = {};
        }
      });
  } else {
    verifyConfigPromise = Promise.resolve();
  }
  verifyConfigPromise
    // validate for dependencies for the tool before installation
    .then(() => validateToolDependencies(tool))
    // execute actual tool installation
    .then(() => executeToolInstallation(tool, upgrade))
    // send SUCCESS or ERROR status to rollbar
    .then(toolStatus => sendInstallationStatusToRollbar(action, payload, toolStatus, rollBarAccessToken))
    .then(async (toolresult) => {
      const configResult = await setToolConfiguration(toolId, toolConfigs);
      return {
        toolresult,
        configResult,
      };
    })
    .then((lastResult) => {
      // after installation, set proxy for tool if required
      // finally return simplified tool status object only with version result and no configuration
      const proxy = require('../proxy/proxy');
      if (proxy.checkIfProxyIsToBeSet(lastResult.toolresult)) {
        proxy.setProxyAfterInstallation(lastResult.toolresult.id, lastResult.toolresult.installationstatus)
          .then(() => resolve(createToolStatusObject(lastResult.toolresult, lastResult.configResult)))
          .catch(() => resolve(createToolStatusObject(lastResult.toolresult, lastResult.configResult)));
      } else {
        resolve(createToolStatusObject(lastResult.toolresult, lastResult.configResult));
      }
    })
    .catch((installationError) => {
      // if any error occurs in the process, log it as ERROR to Rollbar and reject with error message
      console.log(`${tool.id} :: Sending installation error to Rollbar`);
      let errMessage = typeof installationError === 'string' ? installationError : installationError.toString();
      errMessage = `${tool.name} ${action}: ${errMessage}`;
      rollbar.sendMessage(errMessage, true, payload, rollBarAccessToken);
      reject(errMessage);
    });
});

/**
 * Method returns the master Tools metadata - all supported tools (irrespective of current OS), configuration and other attributes
 */
const getMasterToolsMetadata = () => {
  requiredTools();
  const master = {};
  // All tool categories
  _.forEach(toolsMaster.toolCategories, (catLabel, catKey) => {
    master[catKey] = { id: catKey, label: catLabel };
  });
  // All tools
  _.forEach(mapOfAllTools, (toolObj, toolId) => {
    let configObj;
    let isConfigNeeded = false;
    // Figure out if tool requires configuration and it it does, construct map for all the config settings for this tool
    if (toolObj.platform.configuration && Array.isArray(toolObj.platform.configuration.components)) {
      isConfigNeeded = true;
      const fieldsObj = {};
      _.forEach(toolObj.platform.configuration.components, (currSetting) => {
        // Create object for each config setting
        fieldsObj[currSetting.item] = {
          id: currSetting.item,
          label: currSetting.label,
          sortOrder: currSetting.sortOrder,
          fieldType: currSetting.fieldType,
          ...currSetting.fieldType === 'picklist' && { options: currSetting.options },
          default: currSetting.default,
          ...currSetting.validation && { validation: currSetting.validation },
          isLocalConfig: (currSetting.localOnly || toolObj.platform.configuration.localOnly) === true,
        };
      });
      configObj = { fields: fieldsObj };
    }
    // Add current tool with all corresponding values to the master map
    master[toolObj.toolCategory][toolId] = {
      id: toolId,
      label: toolObj.name,
      sortOrder: toolObj.sortOrder,
      toolCategory: toolObj.toolCategory,
      validPlatforms: toolObj.validPlatforms,
      dependencies: toolObj.platform.dependencies,
      preferred: Boolean(toolObj.preferred),
      installationRequired: Boolean(toolObj.platform.versionCommand),
      configurationRequired: isConfigNeeded,
      supportsTeamConfiguration: isConfigNeeded && !toolObj.platform.configuration.localOnly,
      ...isConfigNeeded && { configuration: configObj },
    };
  });
  return master;
};

/**
 * Method returns the Appirio-preferred, i.e. default tools, including the default config values
 * @param {boolean} includeToolsForAllOS Pass this in as true if current OS based filtering is not required. Defaults to false.
 */
const getDefaultToolsAndConfig = (includeToolsForAllOS = false) => {
  if (!mapOfTools || !mapOfAllTools) {
    requiredTools();
  }
  let toolMap;
  if (includeToolsForAllOS) {
    toolMap = mapOfAllTools;
  } else {
    toolMap = mapOfTools;
  }

  const defaultTools = {};
  // All tool categories
  _.forEach(toolsMaster.toolCategories, (catLabel, catKey) => {
    defaultTools[catKey] = {};
  });

  // All tools
  _.forEach(toolMap, (toolObj, toolId) => {
    // Inlcude only Appirio-preferred, i.e. default tools
    if (toolObj.preferred) {
      let configObj;
      // If the tool has configuration settings, construct map for all the config settings for this tool
      if (toolObj.platform.configuration && Array.isArray(toolObj.platform.configuration.components)) {
        if (toolObj.id === 'yarn' || !toolObj.platform.configuration.localOnly) {
          configObj = {};
          _.forEach(toolObj.platform.configuration.components, (currSetting) => {
            // If required, filter out any configuration not applicable for current OS
            if (includeToolsForAllOS || !currSetting.item.includes('___') || currSetting.item.endsWith(`___${currentOS}`)) {
              // Create object for each config setting
              configObj[currSetting.item] = { value: currSetting.default };
            }
          });
        }
      }
      // Add current tool with the corresponding configuration, if applicable
      defaultTools[toolObj.toolCategory][toolId] = {
        status: 'Active',
        ...configObj && { configuration: configObj },
      };
    }
  });
  return defaultTools;
};

// function for opening terminal on porject path
const openTerminalWindow = (projectPath) => {
  if (os.platform() === 'darwin') {
    const open = require('open');
    return open(projectPath, { app: 'Terminal' });
  }
  if (os.platform() === 'win32') {
    const re = /^[a-zA-Z]:/;
    const drive = re.exec(projectPath)[0];
    const command = `start cmd.exe /K "${drive} && cd ${projectPath}"`;
    return executeCommand(command);
  }
  return ERR_BAD_PLATFORM;
};

module.exports = {
  checkIfToolIsInstalled,
  getDefaultToolsAndConfig,
  getLocalToolStatus,
  getMasterToolsMetadata,
  getToolConfiguration,
  installTool,
  setToolConfiguration,
  openTerminalWindow,
};
