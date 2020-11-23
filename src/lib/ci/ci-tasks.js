const fs = require('fs');
const path = require('path');
const gulpLog = require('fancy-log');
const colors = require('ansi-colors');
const parseEnv = require('dotenv').parse;
const ci = require('./ci');

const writeProjectSecrets = (file, key, value) => {
  if (file) {
    const promises = [];
    let err;
    let obj;
    try {
      obj = parseEnv(fs.readFileSync(file));
    } catch (e) {
      err = `No such file '${path.resolve(file)}'!`;
      throw err;
    }
    Object.keys(obj).forEach((k) => {
      const currPromise = ci.writeProjectSecretKey(k, obj[k]);
      promises.push(currPromise);
    });
    if (promises.length === 0) {
      err = 'No key/value pair(s) were found in the supplied properties file!';
      throw err;
    }
    return Promise.all(promises)
      .then(() => {
        gulpLog(colors.green('Successfully created CI secret variables using the supplied properties file!'));
      });
  }
  return ci.writeProjectSecretKey(key, value)
    .then((response) => {
      gulpLog(colors.green(response));
    });
};

const schedulePipeline = (description, targetBranch, cron) => ci.schedulePipeline(description, targetBranch, cron).then(((res) => {
  gulpLog(colors.green(res));
})).catch((error) => { throw error; });

module.exports = {
  writeProjectSecrets,
  schedulePipeline,
};
