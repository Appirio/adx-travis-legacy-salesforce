/* eslint-disable global-require */
jest.mock('env-ci');
jest.mock('fs');
let fs = require('fs');
const _ = require('lodash');
const path = require('path');
let config = require('../../config/config');


const SAMPLE_URL = 'https://gitlab.appirio.com';
const SAMPLE_SHA = 'ae78fa5';

beforeEach(() => {
  jest.resetModules();
  config = require('../../config/config');
  fs = require('fs');
});

describe('CI module in CI context', () => {
  it('should recognize different CI engines based on environment variables', () => {
    // given
    process.env.GITLAB_CI = 1;

    // when
    const ci = require('../ci');

    // then
    expect(ci.env.service).toBe('gitlab');
    delete process.env.GITLAB_CI;
  });

  it('should throw an error if there\'s an unsupported CI engine', () => {
    // given
    process.env.APPVEYOR = 1;

    expect(() => {
      require('../ci');
    }).toThrowError(/is not a supported continuous integration tool/);

    delete process.env.APPVEYOR;
  });

  it('should generate the commit and project URLs from GitLab if available', () => {
    // given
    process.env.GITLAB_CI = true;
    process.env.CI_PROJECT_URL = SAMPLE_URL;
    process.env.CI_COMMIT_SHA = SAMPLE_SHA;

    // when
    const ci = require('../ci');

    // then
    expect(ci.env.projectUrl).toBe(SAMPLE_URL);
    expect(ci.env.commitUrl).toBe(`${SAMPLE_URL}/commit/${SAMPLE_SHA}`);

    delete process.env.GITLAB_CI;
    delete process.env.CI_PROJECT_URL;
    delete process.env.CI_COMMIT_SHA;
  });

  it('should fall back to using Git for the commit and branch', () => {
    // given
    // commit and branch values referenced from env-ci mock file
    const COMMIT = '2aeerk84u';
    const BRANCH = 'origin/feature/unit_tests';
    const CI_TYPE = 'gitlab';
    const CI_TYPE_PROP = 'continuousIntegrationType';
    process.env.CI = true;

    // when
    const ci = require('../ci');

    // then
    expect(ci.env.commit).toBe(COMMIT);
    expect(ci.env.branch).toBe(BRANCH);
    // if 'continuousIntegrationType' property does not exist in project config file, then ciType=gitlab
    expect(config.hasProjectConfig(CI_TYPE_PROP)).toBe(false);
    expect(ci.type).toBe(CI_TYPE);
    delete process.env.CI;
  });

  it('should fall back to using git and read ciType from project config file', () => {
    // given
    // commit and branch values referenced from env-ci mock file
    const COMMIT = '2aeerk84u';
    const BRANCH = 'origin/feature/unit_tests';
    const CI_TYPE = 'Jenkins';
    const CI_TYPE_PROP = 'continuousIntegrationType';
    process.env.CI = true;
    config.writeProjectConfig(CI_TYPE_PROP, CI_TYPE);

    // when
    const ci = require('../ci');

    // then
    expect(ci.env.commit).toBe(COMMIT);
    expect(ci.env.branch).toBe(BRANCH);
    expect(config.readProjectConfig(CI_TYPE_PROP)).toBe(CI_TYPE);
    expect(ci.type).toBe(_.lowerCase(CI_TYPE));
    delete process.env.CI;
  });
});

describe('CI module in non-CI context', () => {
  it('should fall back to using Git when running in non-CI context', () => {
    // given
    // commit and branch values referenced from env-ci mock file
    const COMMIT = '2aeerk84u';
    const BRANCH = 'origin/feature/unit_tests';

    // when
    const ci = require('../ci');

    // then
    expect(ci.env.service).not.toBeDefined();
    expect(ci.env.commit).toEqual(COMMIT);
    expect(ci.env.branch).toEqual(BRANCH);
    expect(ci.type).toEqual('gitlab');
  });

  it('should generate the commit and project URLs in non-CI context if available using env variables', () => {
    // given
    const COMMIT_URL = `${SAMPLE_URL} ,/commit/`;
    process.env.CI_commitUrl = COMMIT_URL;
    process.env.CI_projectUrl = SAMPLE_URL;

    // when
    const ci = require('../ci');

    // then
    expect(ci.env.commitUrl).toEqual(COMMIT_URL);
    expect(ci.env.projectUrl).toEqual(SAMPLE_URL);
    delete process.env.CI_commitUrl;
    delete process.env.CI_projectUrl;
  });

  it('should generate the commit and project URLs in non-CI context if available using .env file', () => {
    // given
    const COMMIT_URL = `${SAMPLE_URL} ,/commit/`;
    const ENV_FILE = `
      CI_commitUrl=${COMMIT_URL}
      CI_projectUrl=${SAMPLE_URL}
    `;
    const filePath = path.join('.', '.env');
    fs.writeFileSync(filePath, ENV_FILE);
    require('dotenv').config();

    // when
    const ci = require('../ci');

    // then
    expect(ci.env.commitUrl).toEqual(COMMIT_URL);
    expect(ci.env.projectUrl).toEqual(SAMPLE_URL);
    delete process.env.CI_commitUrl;
    delete process.env.CI_projectUrl;
  });

  it('should fall back to using git in non-CI context and read ciType from project config file', () => {
    // given
    // commit and branch values referenced from env-ci mock file
    const COMMIT = '2aeerk84u';
    const BRANCH = 'origin/feature/unit_tests';
    const CI_TYPE = 'Jenkins';
    const CI_TYPE_PROP = 'continuousIntegrationType';
    config.writeProjectConfig(CI_TYPE_PROP, CI_TYPE);

    // when
    const ci = require('../ci');

    // then
    expect(ci.env.commit).toBe(COMMIT);
    expect(ci.env.branch).toBe(BRANCH);
    expect(config.readProjectConfig(CI_TYPE_PROP)).toBe(CI_TYPE);
    expect(ci.type).toBe(_.lowerCase(CI_TYPE));
  });
});
