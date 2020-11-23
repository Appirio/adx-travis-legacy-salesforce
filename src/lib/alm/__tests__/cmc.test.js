jest.mock('fs');
jest.mock('unirest');

let fs = require('fs');
let config = require('../../config/config.js');
let appirio = require('../../config/appirio.js');
let cmc = require('../cmc');
let ci = require('../../ci/ci');
let cmcApiMock = require('../../../__mocks__/cmcApiMock');

const CMC_TOKEN_PROP = 'cmc.refresh_token';
const CMC_ACCESS_TOKEN_PROP = 'cmc.access_token';

const reRequireModules = () => {
  fs = require('fs');
  config = require('../../config/config.js');
  appirio = require('../../config/appirio.js');
  cmc = require('../cmc');
  ci = require('../../ci/ci');
  cmcApiMock = require('../../../__mocks__/cmcApiMock');
};

describe('Reading CMC refresh token from the user config file or from env variables', () => {
  const REFRESH_TOKEN = 'asdfghj34567890opjqhss200';

  it('should try to read the refresh token from the user config file but fail', () => {
    // test  whether user config file exists
    expect(fs.existsSync(appirio.userConfigPath)).toBe(false);
    expect(config.hasSecret(CMC_TOKEN_PROP)).toBe(false);
    expect(cmc.getRefreshTokenFromJSON).toThrow(cmc.ERR_NO_REFRESH_TOKEN);
  });

  it('should try to read the refresh token from the env variables but fail', () => {
    // test  whether user config file exists
    expect(fs.existsSync(appirio.userConfigPath)).toBe(false);
    expect(config.hasSecret(CMC_TOKEN_PROP)).toBe(false);

    // enable ci to true to check the case for CI variables for Gitlab
    ci.env.isCi = true;
    expect(cmc.getRefreshTokenFromJSON).toThrowError(cmc.ERR_NO_REFRESH_TOKEN);

    ci.env.isCi = false;
  });

  it('should read and write the refresh token to the user config file', () => {
    // given
    // create and write to config file
    config.setSecret(CMC_TOKEN_PROP, REFRESH_TOKEN);

    // read config file
    config.purge();
    // then
    expect(config.getSecret(CMC_TOKEN_PROP)).toBe(REFRESH_TOKEN);
    expect(cmc.getRefreshTokenFromJSON()).toBe(REFRESH_TOKEN);
  });

  it('should read refresh token from env variables successfully', () => {
    // given
    ci.env.isCi = true;
    // write refresh token to env variable
    process.env.CMC_REFRESH_TOKEN = REFRESH_TOKEN;

    // then
    expect(cmc.getRefreshTokenFromJSON()).toBe(REFRESH_TOKEN);
    ci.env.isCi = false;
    delete process.env.CMC_REFRESH_TOKEN;
  });
});

describe('Generate Access Token from the Refresh Token', () => {
  beforeEach(() => {
    // reset user config file and config object
    fs.__resetMockFiles();
    config.purge();
  });

  it('should generate and write access token using the refresh token to the user config file', () => {
    // given
    const REFRESH_TOKEN = 'asdfghj34567890opjqhss200';
    const EXPECTED_ACCESS_TOKEN = 'asdfghj34567890opjqhss200';

    // create and write to config file
    config.setSecret(CMC_TOKEN_PROP, REFRESH_TOKEN);

    // when
    // execute cmc method to generate and write access token to user config file
    return cmc.getAccessToken()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_ACCESS_TOKEN);
        expect(config.getSecret(CMC_ACCESS_TOKEN_PROP)).toBe(EXPECTED_ACCESS_TOKEN);
      });
  });

  it('should get the refresh token but give stale refresh token error when trying to generate access token', () => {
    // given
    const REFRESH_TOKEN = 'asdfghj34567890opjqhss500';

    config.setSecret(CMC_TOKEN_PROP, REFRESH_TOKEN);
    cmcApiMock.__setStatusCode(500);

    // when
    return cmc.getAccessToken()
      .then(() => { })
      .catch((errorResponse) => {
        // then
        expect(errorResponse).toBe(cmc.ERR_INVALID_REFRESH_TOKEN);
      });
  });

  it('should get the refresh token but give but give server error', () => {
    // given
    const REFRESH_TOKEN = 'asdfghj34567890opjqhss333';

    config.setSecret(CMC_TOKEN_PROP, REFRESH_TOKEN);
    cmcApiMock.__setStatusCode(333);

    // when
    return expect(cmc.getAccessToken()).rejects.toMatch(/Response code from the server/);
  });

  it('should give 403 response when trying to generate access token for the first time', () => {
    // given
    const REFRESH_TOKEN = 'adsfgjkgs8ydbfjbdfj403';
    const EXPECTED_ACCESS_TOKEN = 'adsfgjkgs8ydbfjbdfj403';
    config.setSecret(CMC_TOKEN_PROP, REFRESH_TOKEN);
    cmcApiMock.__setStatusCode(403);

    // when
    return cmc.getAccessToken()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_ACCESS_TOKEN);
        expect(config.getSecret(CMC_ACCESS_TOKEN_PROP)).toBe(EXPECTED_ACCESS_TOKEN);
      });
  });
});

describe('Check for CMC enabled flag', () => {
  const CMC_ENABLED = 'cmc.enabled';

  it('should return false if CMC enabled flag is not present in project config file', () => {
    // given
    expect(fs.existsSync(appirio.projectConfigPath)).toBe(false);
    expect(config.hasProjectConfig(CMC_ENABLED)).toBe(false);

    // then
    expect(cmc.enabled).toBe(false);
  });

  it('should read and write CMC enabled flag as true in project JSON config file', () => {
    // given
    expect(fs.existsSync(appirio.projectConfigPath)).toBe(false);
    expect(config.hasProjectConfig(CMC_ENABLED)).toBe(false);

    config.writeProjectConfig(CMC_ENABLED, true);

    // when
    config.purge();

    // then
    expect(config.readProjectConfig(CMC_ENABLED)).toBe(true);
    expect(cmc.enabled).toBe(true);
  });

  it('should read and write CMC enabled flag as false in project JSON config file', () => {
    // given
    // reset user config file and config object
    fs.__resetMockFiles();
    config.purge();

    // when
    config.writeProjectConfig(CMC_ENABLED, false);

    // then
    expect(config.readProjectConfig(CMC_ENABLED)).toBe(false);
    expect(cmc.enabled).toBe(false);
  });
});

describe('Fetch STORY Details from label', () => {
  it('should find story detail from name', () => {
    // given
    const STORY_NUMBER = 'S-12345';
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(STORY_NUMBER);

    // when
    return cmc.fetchStoryDetailsFromName(STORY_NUMBER)
      .then((response) => {
        // then
        expect(response.length).toBe(1);
        expect(response[0]).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return not find any story if the story number does not exist', () => {
    // given
    const STORY_NUMBER = 'S-098765';
    const EXPECTED_RESULT = 'No records found';

    // when
    return cmc.fetchStoryDetailsFromName(STORY_NUMBER)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch ISSUE Details from Name', () => {
  it('should find issue detail from name', () => {
    // given
    const ISSUE_NUMBER = 'I-12345';
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(ISSUE_NUMBER);

    // when
    return cmc.fetchIssueDetailsFromName(ISSUE_NUMBER)
      .then((response) => {
        // then
        expect(response.length).toBe(1);
        expect(response[0]).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return not find any issue if the issue number does not exist', () => {
    // given
    const ISSUE_NUMBER = 'I-098765';
    const EXPECTED_RESULT = 'No records found';

    // when
    return cmc.fetchIssueDetailsFromName(ISSUE_NUMBER)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch TASK Details from Name', () => {
  it('should find task detail from name', () => {
    // given
    const TASK_NUMBER = 'T-12345';
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(TASK_NUMBER);

    // when
    return cmc.fetchTaskDetailsFromName(TASK_NUMBER)
      .then((response) => {
        // then
        expect(response.length).toBe(1);
        expect(response[0]).toEqual(EXPECTED_RESULT);
      });
  });

  it('should not find any task if the task number does not exist', () => {
    // given
    const TASK_NUMBER = 'T-098765';
    const EXPECTED_RESULT = 'No records found';

    // when
    return cmc.fetchTaskDetailsFromName(TASK_NUMBER)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch SPRINT Details from Name', () => {
  it('should find sprint detail from name', () => {
    // given
    const SPRINT_NAME = 'TestSprint';
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(SPRINT_NAME);

    // when
    return cmc.fetchSprintDetailsFromTitle(SPRINT_NAME)
      .then((response) => {
        console.log(response);
        // then
        expect(response.length).toBe(1);
        expect(response[0]).toEqual(EXPECTED_RESULT);
      });
  });

  it('should not find any story if the story number does not exist', () => {
    // given
    const SPRINT_NAME = 'Fake Sprint';
    const EXPECTED_RESULT = 'No records found';

    // when
    return cmc.fetchSprintDetailsFromTitle(SPRINT_NAME)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch Story/Issue/Task Detail from Name', () => {
  it('should find STORY detail from story name', () => {
    // given
    const STORY_NUMBER = 'S-123459';
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(STORY_NUMBER);

    // when
    return cmc.fetchItemDetailsFromName(STORY_NUMBER)
      .then((response) => {
        // then
        expect(response.length).toBe(1);
        expect(response[0]).toEqual(EXPECTED_RESULT);
      });
  });

  it('should find ISSUE detail from issue name', () => {
    // given
    const ISSUE_NUMBER = 'I-304890';
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(ISSUE_NUMBER);

    // when
    return cmc.fetchItemDetailsFromName(ISSUE_NUMBER)
      .then((response) => {
        // then
        expect(response.length).toBe(1);
        expect(response[0]).toEqual(EXPECTED_RESULT);
      });
  });

  it('should find TASK detail from issue name', () => {
    // given
    const TASK_NUMBER = 'T-635989';
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(TASK_NUMBER);

    // when
    return cmc.fetchItemDetailsFromName(TASK_NUMBER)
      .then((response) => {
        // then
        expect(response.length).toBe(1);
        expect(response[0]).toEqual(EXPECTED_RESULT);
      });
  });

  it('should throw exception if some random string is passed as opposed to Story/Task/Issue format', (done) => {
    // given
    const RANDOM_NUMBER = 'A-123456';
    const EXPECTED_RESULT = 'Invalid CMC Story/Issue/Task';

    // when
    return cmc.fetchItemDetailsFromName(RANDOM_NUMBER)
      .then(() => {
        done.fail('CUSTOM FAIL:should fail');
      })
      .catch((responseError) => {
        // then
        expect(responseError).toBe(EXPECTED_RESULT);
        done();
      });
  });
});

describe('Extract CMC Story/Issue/Task number from the text specified(for git commits)', () => {
  beforeEach(() => {
    // reset and re-require modules
    jest.resetModules();
    reRequireModules();
  });

  it('should find STORY number included in the message', () => {
    // given
    const MESSAGE = 'S-12345 completed';
    const EXPECTED_RESULT = {
      stories: ['S-12345'],
      issues: [],
      tasks: [],
    };

    // then
    expect(cmc.extractCMCNumbersFromText(MESSAGE)).toEqual(EXPECTED_RESULT);
  });

  it('should find ISSUE number included in the message', () => {
    // given
    const MESSAGE = 'I-12345 completed';
    const EXPECTED_RESULT = {
      stories: [],
      issues: ['I-12345'],
      tasks: [],
    };

    // then
    expect(cmc.extractCMCNumbersFromText(MESSAGE)).toEqual(EXPECTED_RESULT);
  });

  it('should find TASK number included in the message', () => {
    // given
    const MESSAGE = 'T-12345 completed';
    const EXPECTED_RESULT = {
      stories: [],
      issues: [],
      tasks: ['T-12345'],
    };

    // then
    expect(cmc.extractCMCNumbersFromText(MESSAGE)).toEqual(EXPECTED_RESULT);
  });

  it('should find all Story/Issue/Task number included in the message', () => {
    // given
    const MESSAGE = 'I-12345 for T-12345 in S-12345 solved';
    const EXPECTED_RESULT = {
      stories: ['S-12345'],
      issues: ['I-12345'],
      tasks: ['T-12345'],
    };

    // then
    expect(cmc.extractCMCNumbersFromText(MESSAGE)).toEqual(EXPECTED_RESULT);
  });

  it('should return object with empty arrays of story/task/issue when the text specified does not contain any story/task/issue number', () => {
    // given
    const MESSAGE = 'Initial commit';
    const EXPECTED_RESULT = {
      stories: [],
      issues: [],
      tasks: [],
    };

    // then
    expect(cmc.extractCMCNumbersFromText(MESSAGE)).toEqual(EXPECTED_RESULT);
  });

  it('should return object with empty arrays of story/task/issue when the text specified does not contain correct format for story/task/issue number', () => {
    // given
    const MESSAGE = 'ST-12345 completed';
    const EXPECTED_RESULT = {
      stories: [],
      issues: [],
      tasks: [],
    };

    // then
    expect(cmc.extractCMCNumbersFromText(MESSAGE)).toEqual(EXPECTED_RESULT);
  });
});

describe('Fetch project details from project config file', () => {
  beforeEach(() => {
    // reset user config file and config object
    fs.__resetMockFiles();
    config.purge();
  });

  it('should fail when trying to read project config file', () => {
    // given
    const PROJECT_PROP = 'cmc.products';

    config.writeProjectConfig(PROJECT_PROP, []);

    // then
    expect(config.readProjectConfig(PROJECT_PROP).length).toBe(0);
    expect(cmc.getProductDetailsFromJSON).toThrowError(cmc.ERR_NO_CMC_PRODUCT_DEFINED);
  });

  it('should fail when trying to read project config file', () => {
    // given
    const PROJECT_PROP = 'cmc.products';
    const PRODUCT_LIST = ['AppirioDX', 'TestDX'];

    config.writeProjectConfig(PROJECT_PROP, PRODUCT_LIST);

    // then
    expect(config.hasProjectConfig(PROJECT_PROP)).toBe(true);
    expect(config.readProjectConfig(PROJECT_PROP).length).toBe(2);
    expect(cmc.getProductDetailsFromJSON()).toEqual(PRODUCT_LIST);
  });
});

describe('Fetch STORIES from CMC', () => {
  it('should find the stories from CMC', () => {
    // given
    const STORIES = ['S-12345', 'S-12346'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(STORIES);

    // when
    return cmc.fetchStoriesFromName(STORIES)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return story detail only for the story number found in CMC and no result for other story', () => {
    // given
    const STORIES = ['S-12345', 'S-1234789'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(STORIES);

    // when
    return cmc.fetchStoriesFromName(STORIES)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return empty array if story number does not exist in CMC', () => {
    // given
    const STORIES = ['S-123450', 'S-1234789'];
    const EXPECTED_RESULT = [];

    // when
    return cmc.fetchStoriesFromName(STORIES)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch ISSUES from CMC', () => {
  it('should find the issues from CMC', () => {
    // given
    const ISSUES = ['I-12345', 'I-123457'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(ISSUES);

    // when
    return cmc.fetchIssuesFromName(ISSUES)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return issue detail only for the issue number found in CMC and no result for other issue', () => {
    // given
    const ISSUES = ['I-12345', 'I-1234789'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(ISSUES);

    // when
    return cmc.fetchIssuesFromName(ISSUES)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return empty array if issue number does not exist in CMC', () => {
    // given
    const ISSUES = ['I-123450', 'I-1234789'];
    const EXPECTED_RESULT = [];

    // when
    return cmc.fetchIssuesFromName(ISSUES)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch TASKS from CMC', () => {
  it('should find the tasks from CMC', () => {
    // given
    const TASKS = ['T-12345', 'T-635977'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(TASKS);

    // when
    return cmc.fetchTasksFromName(TASKS)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return task detail only for the task number found in CMC and no result for other task', () => {
    // given
    const TASKS = ['T-12345', 'T-1234789'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(TASKS);

    // when
    return cmc.fetchTasksFromName(TASKS)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return empty array if task number does not exist in CMC', () => {
    // given
    const TASKS = ['T-123450', 'T-1234789'];
    const EXPECTED_RESULT = [];

    // when
    return cmc.fetchTasksFromName(TASKS)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch STORIES for the Products from CMC', () => {
  beforeEach(() => {
    // reset user config file and config object
    fs.__resetMockFiles();
    config.purge();
  });
  const PROJECT_PROP = 'cmc.products';

  it('should return stories related to the products', () => {
    // given
    const PRODUCTS = ['AppirioDX', 'TestDX'];
    const resultStories = [
      'S-12345',
      'S-12346',
      'S-123457',
      'S-123459',
      'S-123456789',
    ];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(resultStories);

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductStories()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return stories only for the products which exist', () => {
    // given
    const PRODUCTS = ['AppirioDX', 'SomeProduct'];
    const resultStories = ['S-12345', 'S-12346', 'S-123457'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(resultStories);

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductStories()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return no story detail if no story with the product exists', () => {
    // given
    const PRODUCTS = ['SomeProduct'];
    const EXPECTED_RESULT = 'No stories found for the given products';

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductStories()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch TASKS for the Products from CMC', () => {
  beforeEach(() => {
    // reset user config file and config object
    fs.__resetMockFiles();
    config.purge();
  });
  const PROJECT_PROP = 'cmc.products';

  it('should return tasks related to the products', () => {
    // given
    const PRODUCTS = ['AppirioDX', 'TestDX'];
    const resultTasks = ['T-12345', 'T-635977', 'T-635978', 'T-635987', 'T-635989'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(resultTasks);

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductTasks()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return tasks only for the products which exist', () => {
    // given
    const PRODUCTS = ['AppirioDX', 'SomeProduct'];
    const resultTasks = ['T-635977', 'T-635978'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(resultTasks);

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductTasks()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return no task detail if no task with the product exists', () => {
    // given
    const PRODUCTS = ['SomeProduct'];
    const EXPECTED_RESULT = 'No tasks found for the given products';

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductTasks()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch ISSUES for the Products from CMC', () => {
  beforeEach(() => {
    // reset user config file and config object
    fs.__resetMockFiles();
    config.purge();
  });
  const PROJECT_PROP = 'cmc.products';

  it('should return issues related to the products', () => {
    // given
    const PRODUCTS = ['AppirioDX', 'TestDX'];
    const resultIssues = ['I-12345', 'I-123457', 'I-123459', 'I-12346', 'I-304890'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(resultIssues);

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductIssues()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return issues only for the products which exist', () => {
    // given
    const PRODUCTS = ['AppirioDX', 'SomeProduct'];
    const resultIssues = ['I-12346', 'I-304890'];
    const EXPECTED_RESULT = cmcApiMock.__getExpectedResult(resultIssues);

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductIssues()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should return no issue detail if no issue with the product exists', () => {
    // given
    const PRODUCTS = ['SomeProduct'];
    const EXPECTED_RESULT = 'No issues found for the given products';

    config.writeProjectConfig(PROJECT_PROP, PRODUCTS);

    // when
    return cmc.fetchProductIssues()
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('update refresh token in user config file', () => {
  beforeEach(() => {
    // reset and re-require modules
    jest.resetModules();
    reRequireModules();
  });

  it('should insert the property of refresh token in the user config file', () => {
    // given
    // if refresh token is not present in the user config file, then write the property to it
    const REFRESH_TOKEN_PROP = 'cmc.refresh_token';
    const REFRESH_TOKEN = 'qwhfgkjdi78vvjhbk200';

    // when
    cmc.updateCMCRefreshToken(REFRESH_TOKEN);

    // then
    expect(fs.existsSync(appirio.userConfigPath)).toBe(true);
    expect(config.getSecret(REFRESH_TOKEN_PROP)).toBe(REFRESH_TOKEN);
  });

  it('should update the refresh token in user config file', () => {
    // given
    // update the refresh token in the user config file if it already exists
    const REFRESH_TOKEN_PROP = 'cmc.refresh_token';
    const NEW_REFRESH_TOKEN = 'eqwtfgvdbiw58790-jnkn201';

    // when
    cmc.updateCMCRefreshToken(NEW_REFRESH_TOKEN);

    // then
    expect(fs.existsSync(appirio.userConfigPath)).toBe(true);
    expect(config.getSecret(REFRESH_TOKEN_PROP)).toBe(NEW_REFRESH_TOKEN);
  });
});

describe('set product details in project config file', () => {
  beforeEach(() => {
    // reset and re-require modules
    jest.resetModules();
    reRequireModules();
  });

  it('should insert products in the project config file', () => {
    // given
    // if product is not present in the project config file, then write the property to it
    const PRODUCT_PROP = 'cmc.products';
    const PRODUCTS = ['AppirioDX'];

    // when
    cmc.setProductDetailsInJson(PRODUCTS);

    // then
    expect(fs.existsSync(appirio.projectConfigPath)).toBe(true);
    expect(config.hasProjectConfig(PRODUCT_PROP)).toBe(true);
    expect(config.readProjectConfig(PRODUCT_PROP)).toEqual(PRODUCTS);
  });

  it('should update the products in project config file', () => {
    // given
    // update the refresh token in the user config file if it already exists
    const PRODUCT_PROP = 'cmc.products';
    const NEW_PRODUCTS = ['AppirioDX', 'TestDX'];

    // when
    cmc.setProductDetailsInJson(NEW_PRODUCTS);

    // then
    expect(fs.existsSync(appirio.projectConfigPath)).toBe(true);
    expect(config.hasProjectConfig(PRODUCT_PROP)).toBe(true);
    expect(config.readProjectConfig(PRODUCT_PROP)).toEqual(NEW_PRODUCTS);
  });
});

describe('Get/Set Product Cache data from/to project cache file', () => {
  const CACHE_PROP = 'cmc';
  const PRODUCT_CACHE = [{
    data: 'TEST - TNoe - AppirioDX UAT',
    detail: 'Test!',
    documentation: 'https://appirio.my.salesforce.com/a415000000GRk1DAAT',
    kind: 1,
    label: 'S-558744',
  }, {
    data: 'Test Story for AppirioDX Training',
    detail: 'Test Story',
    documentation: 'https://appirio.my.salesforce.com/a415000000GRkwFAAT',
    kind: 1,
    label: 'S-559021',
  }, {
    data: 'Development Training Story for AppirioDX - CI',
    detail: 'As a Salesforce developer, I require proper training on the AppirioDX CI ( Continuous Integration ) feature in order to use it during the build.',
    documentation: 'https://appirio.my.salesforce.com/a415000000FqUrgAAF',
    kind: 1,
    label: 'S-561656',
  }];
  const EXPECTED_CACHE = {
    'S-558744': {
      data: 'TEST - TNoe - AppirioDX UAT',
      detail: 'Test!',
      documentation: 'https://appirio.my.salesforce.com/a415000000GRk1DAAT',
      kind: 1,
      label: 'S-558744',
    },
    'S-559021': {
      data: 'Test Story for AppirioDX Training',
      detail: 'Test Story',
      documentation: 'https://appirio.my.salesforce.com/a415000000GRkwFAAT',
      kind: 1,
      label: 'S-559021',
    },
    'S-561656': {
      data: 'Development Training Story for AppirioDX - CI',
      detail: 'As a Salesforce developer, I require proper training on the AppirioDX CI ( Continuous Integration ) feature in order to use it during the build.',
      documentation: 'https://appirio.my.salesforce.com/a415000000FqUrgAAF',
      kind: 1,
      label: 'S-561656',
    },
  };
  const EXPECTED_RESULT = 'Wrote config file: .appirio/cache.json';

  it('should read and write the project cache object from/to project cache file', () => {
    // given
    expect(config.hasProjectCache(CACHE_PROP)).toBe(false);

    // when
    return cmc.setCacheProductData(PRODUCT_CACHE)
      .then((response) => {
        expect(response).toEqual(EXPECTED_RESULT);
        // then
        expect(config.hasProjectCache(CACHE_PROP)).toBe(true);
        expect(config.readProjectCache(CACHE_PROP)).toEqual(EXPECTED_CACHE);
        expect(cmc.getCachedProductData()).toEqual(PRODUCT_CACHE);
      });
  });
});

describe('Create deployment record in CMC', () => {
  it('should create deployment record when both sprintId and releaseId are specified', () => {
    // given
    // concatenate sprintId and releaseId to mock the deployment record id
    const DEPLOYMENT_DATA = {
      deploymentStatus: 'Completed',
      deploymentName: 'Deployment to',
      deploymentDate: new Date(),
      sourceUrl: '',
      releaseId: 'a3z50000000UbT7AAK',
      sprintId: 'a4050000000tfwJAAQ',
    };
    const EXPECTED_RESULT = {
      status: 201,
      content: 'a4050000000tfwJAAQa3z50000000UbT7AAK',
    };

    // when
    return cmc.createDeployment(DEPLOYMENT_DATA)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should create deployment record when only sprintId is specified', () => {
    // given
    // assign sprintId as the deployment record id
    const DEPLOYMENT_DATA = {
      deploymentStatus: 'Completed',
      deploymentName: 'Deployment to',
      deploymentDate: new Date(),
      sourceUrl: '',
      sprintId: 'a4050000000tfwJAAQ',
    };
    const EXPECTED_RESULT = {
      status: 201,
      content: 'a4050000000tfwJAAQ',
    };

    // when
    return cmc.createDeployment(DEPLOYMENT_DATA)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should create deployment record when releaseId is specified', () => {
    // given
    // assign releaseId as the deployment record id
    const DEPLOYMENT_DATA = {
      deploymentStatus: 'Completed',
      deploymentName: 'Deployment to',
      deploymentDate: new Date(),
      sourceUrl: '',
      releaseId: 'a3z50000000UbT7AAK',
    };
    const EXPECTED_RESULT = {
      status: 201,
      content: 'a3z50000000UbT7AAK',
    };

    // when
    return cmc.createDeployment(DEPLOYMENT_DATA)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Create deployment items in CMC', () => {
  it('should create deployment item for story in CMC', () => {
    // given
    // concatenate deploymentId and storyId to mock the deployment item record id
    const DEPLOYMENT_ITEM_RECORD = {
      deploymentId: 'a3z50000000UbT7AAK',
      storyId: 'a415000000GRk1DAAT',
    };
    const EXPECTED_RESULT = {
      status: 201,
      content: 'a3z50000000UbT7AAKa415000000GRk1DAAT',
    };

    // when
    return cmc.createDeploymentItem(DEPLOYMENT_ITEM_RECORD)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should create deployment item for issue in CMC', () => {
    // given
    // concatenate deploymentId and storyId to mock the deployment item record id
    const DEPLOYMENT_ITEM_RECORD = {
      deploymentId: 'a3z50000000UbT7AAK',
      issueId: 'i415000000GRk1DTAA',
    };
    const EXPECTED_RESULT = {
      status: 201,
      content: 'a3z50000000UbT7AAKi415000000GRk1DTAA',
    };

    // when
    return cmc.createDeploymentItem(DEPLOYMENT_ITEM_RECORD)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});

describe('Fetch package.xml for arbitrary list of stories/issues from CMC', () => {
  beforeEach(() => {
    // reset and re-require modules
    jest.resetModules();
    reRequireModules();
  });

  it('should fetch package.xml from CMC when cmc item contains manifest items', () => {
    // given
    const cmcNumbers = {
      stories: ['fakeStoryId'],
    };
    cmcApiMock.__setPackageXMLResult(true);

    // when
    return cmc.retrievePackageXML(cmcNumbers)
      // then
      .then((response) => {
        expect(response).toEqual(cmcApiMock.__getPackageXMLResult());
      });
  });

  it('should fetch package.xml from CMC when cmc item does not contain manifest items', () => {
    // given
    const cmcNumbers = {
      stories: ['fakeStoryId'],
    };
    cmcApiMock.__setPackageXMLResult(false);

    // when
    return cmc.retrievePackageXML(cmcNumbers)
      // then
      .then((response) => {
        expect(response).toEqual(cmcApiMock.__getPackageXMLResult());
      });
  });
});

describe('Fetch destructiveChanges.xml for arbitrary list of stories/issues from CMC', () => {
  beforeEach(() => {
    // reset and re-require modules
    jest.resetModules();
    reRequireModules();
  });

  it('should fetch destructiveChanges.xml from CMC when cmc item contains destructive manifest items', () => {
    // given
    const cmcNumbers = {
      stories: ['fakeStoryId'],
    };
    cmcApiMock.__setPackageXMLResult(true);

    // when
    return cmc.retrieveDestructivePackageXML(cmcNumbers)
      // then
      .then((response) => {
        expect(response).toEqual(cmcApiMock.__getPackageXMLResult());
      });
  });

  it('should fetch destructiveChanges.xml from CMC when cmc item does not contain destructive manifest items', () => {
    // given
    const cmcNumbers = {
      stories: ['fakeStoryId'],
    };
    cmcApiMock.__setPackageXMLResult(false);

    // when
    return cmc.retrieveDestructivePackageXML(cmcNumbers)
      // then
      .then((response) => {
        expect(response).toEqual(cmcApiMock.__getPackageXMLResult());
      });
  });
});

describe('Create manifest items in CMC', () => {
  it('should create manifest item for story in CMC', () => {
    // given
    const MANIFEST_ITEM_RECORD = {
      metadataName: 'HelloWorld__c',
      type: 'ApexClass',
      action: 'Add',
      storyId: 'a3z50000000UbT7AAK',
    };
    const EXPECTED_RESULT = {
      status: 201,
      content: 'a3z50000000UbT7AAK',
    };

    // when
    return cmc.createManifestItem(MANIFEST_ITEM_RECORD)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });

  it('should create manifest item for issue in CMC', () => {
    // given
    const MANIFEST_ITEM_RECORD = {
      metadataName: 'HelloWorld__c',
      type: 'ApexClass',
      action: 'Update',
      issueId: 'a3z50000000UbT7AAK',
    };
    const EXPECTED_RESULT = {
      status: 201,
      content: 'a3z50000000UbT7AAK',
    };

    // when
    return cmc.createManifestItem(MANIFEST_ITEM_RECORD)
      .then((response) => {
        // then
        expect(response).toEqual(EXPECTED_RESULT);
      });
  });
});
