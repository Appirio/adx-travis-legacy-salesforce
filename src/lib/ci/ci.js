/* eslint-disable global-require, import/no-dynamic-require */
const envCi = require('env-ci');
const _ = require('lodash');
const colors = require('ansi-colors');
const gulpLog = require('fancy-log');
const config = require('../config/config');

/* const knownCiServices = [
  'service',
  'appveyor',
  'bamboo',
  'bitbucket_pipelines',
  'bitrise',
  'buildkite',
  'circleci',
  'codeship',
  'drone',
  'gitlab',
  'github'
  'jenkins',
  'semaphore',
  'shippable',
  'teamcity',
  'travis',
  'wercker',
]; */

let env = {};
const {
  isCi,
  commit,
  branch,
} = envCi();

if (isCi) {
  // In a CI context, we will return the appropriate environment variable
  // according to whatever CI system we're executing in
  env = envCi();
  if (env.service === 'gitlab') {
    env.commitUrl = `${process.env.CI_PROJECT_URL}/commit/${env.commit}`;
    env.projectUrl = process.env.CI_PROJECT_URL;
    env.lastPushedCommit = process.env.CI_COMMIT_BEFORE_SHA;
  } else if (env.service === 'circleci') {
    env.commitUrl = `${process.env.CIRCLE_REPOSITORY_URL}/commit/${env.commit}`;
    env.projectUrl = process.env.CIRCLE_REPOSITORY_URL;
  } else if (env.service === 'bitbucket') {
    env.commitUrl = `${process.env.BITBUCKET_GIT_HTTP_ORIGIN}/commits/${env.commit}`;
    // Using SSH URL since BitBucket returns HTTP URL and Not HTTPS, which causes issues.
    env.projectUrl = process.env.BITBUCKET_GIT_SSH_ORIGIN;
  } else if (env.service === 'jenkins') {
    env.commitUrl = 'Repository path is not available.';
    env.projectUrl = process.env.GIT_URL;
  } else if (env.service === 'github') {
    env.projectUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}`;
    env.commitUrl = `${env.projectUrl}/commit/${process.env.GITHUB_SHA}`;
    // Remove below line when https://github.com/pvdlg/env-ci/pull/128 gets merged
    env.build = process.env.GITHUB_RUN_ID;
  } else if (env.service === 'travis') {
    env.projectUrl = `https://github.com/${process.env.TRAVIS_REPO_SLUG}`;
    env.commitUrl = `${env.projectUrl}/commit/${env.commit}`;
  } else if (env.service === 'vsts') {
    env.commitUrl = `${process.env.BUILD_REPOSITORY_URI}/commit/${env.commit}`;
    env.projectUrl = process.env.BUILD_REPOSITORY_URI;
    // For Azure DevOps, replace Build Number with Build ID to avoid issues with SFDX package creation
    // SFDX likes build number to be Whole Numbers only but Azure's build number has a Decimal Point in it.
    env.build = process.env.BUILD_BUILDID;
  } else {
    // Unsupported CI service - Do nothing
  }
} else {
  // Commit and branch are dynamically determined from the local Git repo
  env.commit = commit;
  env.branch = branch;
  const envProperties = [
    'service',
    'build',
    'buildUrl',
    'job',
    'jobUrl',
    'pr',
    'isPr',
    'slug',
    'root',
    'commitUrl',
    'projectUrl',
    'lastPushedCommit',
  ];
  envProperties.map((property) => {
    // When executing outside of a CI system we can use a .env file or
    // environment variables in the form of:
    // CI_service=jenkins
    // CI_build=29
    // ...
    if (process.env[`CI_${property}`]) {
      env[property] = process.env[`CI_${property}`];
    }
  });
}

let ciType;
if (env.service) {
  ciType = env.service;
} else {
  ciType = config.hasProjectConfig('continuousIntegrationType') ?
    _.lowerCase(config.readProjectConfig('continuousIntegrationType')) :
    'gitlab';
}
let ci;
try {
  ci = require(`./${ciType}`);
  ci.type = ciType;
} catch (e) {
  const err = `${ciType} is not a supported continuous integration tool`;
  gulpLog('ERROR:', colors.red(err));
  throw err;
}

ci.env = env;
ci.ERR_CI_ONLY = 'This functionality is only available in CI environment.';

module.exports = ci;
