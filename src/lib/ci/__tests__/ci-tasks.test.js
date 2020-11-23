jest.mock('fs');
jest.mock('@gitbeaker/node');

const fs = require('fs');
const { gitLabApi } = require('@gitbeaker/node');

const config = require('../../config/config');
const ci_tasks = require('../ci-tasks');

let testEnvDir;
let expectedResult;

beforeEach(() => {
  this.origImpl = fs.readFileSync;
  fs.__resetMockFiles();
  config.purge();

  gitLabApi.__resetSecretObject();
  gitLabApi.__setSecretObject('SF_ORG__VERSION', '42.0');

  testEnvDir = '__testEnvDir__';
  const GITLAB_PERSONAL_TOKEN_PROP = 'gitlab.personal_token';
  const GITLAB_PERSONAL_TOKEN = 'fakeToken';
  expectedResult = {
    SF_ORG__VERSION: '45.0',
  };

  fs.writeFileSync(testEnvDir, 'SF_ORG__VERSION=45.0');
  config.writeProjectCache('gitlab.project_id', '123');
  config.writeProjectCache('gitlab.master_level_access', true);
  config.setSecret(GITLAB_PERSONAL_TOKEN_PROP, GITLAB_PERSONAL_TOKEN);
});

afterEach(() => {
  fs.readFileSync = this.origImpl;
});

describe('Write Project Secret Key', () => {
  it('should read env variables(single) from file specified and write the secret keys', () => {
    // when
    return ci_tasks.writeProjectSecrets(testEnvDir)
      // then
      .then((response) => {
        expect(gitLabApi.__getSecretObject()).toEqual(expectedResult);
      });
  });

  it('should read env variables(multiple) from file specified and write the secret keys', () => {
    // given
    const envFileData = `SF_ORG__VERSION=45.0
    SF_DEPLOY__ENABLED=true
    SF_ORG__DEPLOY__TEST_LEVEL=NoTestRun`;
    fs.writeFileSync(testEnvDir, envFileData);
    gitLabApi.__setSecretObject('SF_DEPLOY__ENABLED', false);
    gitLabApi.__setSecretObject('SF_ORG__DEPLOY__TEST_LEVEL', 'testLevel');
    expectedResult = {
      SF_ORG__VERSION: '45.0',
      SF_DEPLOY__ENABLED: 'true',
      SF_ORG__DEPLOY__TEST_LEVEL: 'NoTestRun',
    };

    // when
    return ci_tasks.writeProjectSecrets(testEnvDir)
      // then
      .then((response) => {
        expect(gitLabApi.__getSecretObject()).toEqual(expectedResult);
      });
  });

  it('should write the secret keys when no file is specified', () => {
    // given
    expectedResult = {
      SF_ORG__VERSION: '47.0',
    };

    // when
    return ci_tasks.writeProjectSecrets(null, 'SF_ORG__VERSION', '47.0')
      // then
      .then((response) => {
        expect(gitLabApi.__getSecretObject()).toEqual(expectedResult);
      });
  });

  it('should error out if the specified file does not exist', () => {
    // given
    fs.readFileSync = jest.fn().mockImplementation(() => {
      throw new Error('Cannot read file.');
    });

    // when
    return expect(() => {
        ci_tasks.writeProjectSecrets(testEnvDir);
      })
      // then
      .toThrow(/No such file/);
  });

  it('should throw error if values in the file are not key/value pairs', () => {
    // given
    fs.writeFileSync(testEnvDir, 'SF_ORG_VERSION:45.0');

    // when
    return expect(() => {
        ci_tasks.writeProjectSecrets('__keys__');
      })
      // then
      .toThrow('No key/value pair(s) were found in the supplied properties file!');
  });
});
