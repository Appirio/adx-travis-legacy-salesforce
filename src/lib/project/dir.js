const dirProps = () => ({
  cwd: '',
  driveRoot: '',
  isInsideProject: false,
  projectRoot: '',
});

// Method to get the drive root for the current directory (cwd)
const getDriveRoot = (cwd = process.cwd()) => {
  const path = require('path');
  return path.parse(cwd).root;
};

/* Method processes the current directory (cwd) and return an object containing various properties
  related to the directory path. These properties will be used by various ADX commands. */
const processDirectory = (cwd = process.cwd()) => {
  const os = require('os');
  const path = require('path');
  const _ = require('lodash');
  const findUp = require('find-up');
  const appirio = require('../config/appirio');
  const debugLog = require('../util/debug');
  let foundWhat;
  let foundWhere;
  let foundIndex;
  const HOME_DIR = os.homedir();
  const CONFIG_FILE = path.join(appirio.projectConfigDir, appirio.projectConfigFile);
  const DRIVE_ROOT = getDriveRoot(cwd);
  const dirObj = dirProps();
  dirObj.cwd = cwd;
  dirObj.driveRoot = DRIVE_ROOT;

  debugLog('Current Working Directory:', cwd);
  debugLog('Drive Root:', DRIVE_ROOT);
  debugLog('Home Directory:', HOME_DIR);

  // Check if the current dir (cwd) or any of its parent have config file in it
  const result = findUp.sync([CONFIG_FILE], {
    cwd,
  });

  if (result !== null) {
    // Validate config file was found in the currnet dir (cwd) or any of its parent dir
    if (_.endsWith(result, CONFIG_FILE)) {
      foundWhat = CONFIG_FILE;
    } else {
      debugLog('RESULT:', result);
      const err = 'Cannot locate the project directory!';
      throw err;
    }

    // Remove the last part containing the cachce dir or config file from the search result to get the dir path
    foundIndex = result.lastIndexOf(foundWhat);
    foundWhere = path.resolve(result.substring(0, foundIndex));
    debugLog(`Found "${foundWhat}" in ${foundWhere}`);

    // Drive Root and User's Home Directory are not accepted as project directories
    if (foundWhere === DRIVE_ROOT || foundWhere === HOME_DIR) {
      debugLog('Home Directory or Drive Root! Not inside an Appirio DX project folder or subfolder!');
    } else {
      debugLog('Inside an Appirio DX project folder or subfolder!');
      dirObj.projectRoot = foundWhere;
      dirObj.isInsideProject = true;
    }
  }
  return dirObj;
};

// Method to validate whether the command can be executed in the current dir (cwd)
const validateCommandDir = (dirObj, commandType) => {
  // Validate that we are in an Appirio DX project directory or subdirectory
  if (commandType === 'project') {
    if (dirObj.isInsideProject) {
      // If we are in a project subdir, change the process directory to the project root
      if (dirObj.projectRoot !== process.cwd()) {
        process.chdir(dirObj.projectRoot);
      }
    } else {
      // Throw error
      const err = 'This command can only be excuted from inside an Appirio DX project directory!';
      throw err;
    }
  }
};

module.exports = {
  getDriveRoot,
  processDirectory,
  validateCommandDir,
};
