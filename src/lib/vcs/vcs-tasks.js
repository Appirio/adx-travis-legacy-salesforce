const _ = require('lodash');
const colors = require('ansi-colors');
const gulp = require('gulp');
const changeEol = require('gulp-eol');
const isBinary = require('gulp-is-binary');
const through = require('through2');
const { logger } = require('../util/logger');
const cmc = require('../alm/cmc');
const userutil = require('../util/user');
const vcs = require('./vcs');
const { processError } = require('../util/misc');

const getItemTitleFromCMC = cmcNumber => new Promise((resolve, reject) => {
  cmc.fetchItemDetailsFromName(cmcNumber)
    .then((cmcResponse) => {
      if (typeof cmcResponse === 'object' && cmcResponse.length === 1) {
        let titleField = 'title';
        if (/^T-/.test(cmcNumber)) {
          titleField = 'taskName';
        }
        const title = _.replace(cmcResponse[0][titleField],
          /\b(?:a|an|the)\b/gi, ' ');
        resolve(_.trim(title));
      } else {
        const err = 'Could not find Story/Issue/Task in CMC!';
        reject(err);
      }
    })
    .catch((err) => {
      let { message: errText } = processError(err);
      errText = `CMC Request failed with error: ${errText}`;
      reject(errText);
    });
});

const getBranchName = (itemNumber, accessCMC = true) => new Promise((resolve) => {
  const username = userutil.getUserName();
  let branchName;
  if (username !== '') {
    branchName = `feature/${_.snakeCase(username)}-${itemNumber}`;
  } else {
    branchName = `feature/${itemNumber}`;
  }
  if (accessCMC && cmc.enabled) {
    logger.info('Fetching Story/Issue/Task details from CMC...');
    getItemTitleFromCMC(itemNumber)
      .then((title) => {
        branchName += `-${title}`;
        resolve(branchName);
      })
      .catch((err) => {
        logger.addContext('error', err);
        logger.error(colors.yellow(err));
        logger.removeContext('error');
        resolve(branchName);
      });
  } else if (!accessCMC) {
    branchName = vcs.gitSafeName(branchName);
    if (cmc.enabled && /^(S-|I-|T-)/.test(itemNumber)) {
      branchName += '...';
    }
    resolve(branchName);
  } else {
    resolve(branchName);
  }
});

const createGITBranch = (name, sourceBranch) => getBranchName(name).then(branchName => vcs.createBranch(branchName, sourceBranch));

const determineEOLcharacter = (chosenEOLcharacter) => {
  let eolCharacter;
  const eolOptions = {
    LF: '\n',
    CRLF: '\r\n',
  };
  const validEOLcharacters = Object.keys(eolOptions);

  if (chosenEOLcharacter !== undefined) {
    if (!validEOLcharacters.includes(chosenEOLcharacter)) {
      throw new Error(`${chosenEOLcharacter} is not a valid option. Valid options are ${validEOLcharacters.join(', ')}`);
    }
    eolCharacter = eolOptions[chosenEOLcharacter];
  }
  return eolCharacter;
};

const changeEOLcharacters = (eolCharacter) => {
  const newLineAtEndOfFile = false;
  return gulp.src(['./**/*', '!node_modules/**'])
    .pipe(isBinary())
    .pipe(through.obj((file, enc, next) => {
      if (file.isBinary()) {
        next();
        return;
      }

      next(null, file);
    }))
    .pipe(changeEol(eolCharacter, newLineAtEndOfFile))
    .pipe(gulp.dest('./'));
};

const changeLineEndings = (chosenEOLcharacter) => {
  const eolCharacter = determineEOLcharacter(chosenEOLcharacter);
  return changeEOLcharacters(eolCharacter);
};

module.exports = {
  createGITBranch,
  changeLineEndings,
  getBranchName,
};
