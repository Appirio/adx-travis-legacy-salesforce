jest.mock('unirest');
jest.mock('rollbar');
jest.mock('simple-git/promise');
jest.mock('fs');
jest.mock('env-ci');

let Rollbar;
let git;
let fs;
let ci;
let deployment;
let config;
let cmcApiMock;

const CMC_ENABLED = 'cmc.enabled';
const ROLLBAR_ENABLED = 'rollbar.enabled';
let destination = null;
let testCommitSHA = null;
let expectedPayload = null;
let EXPECTED_DEPLOYMENT_OBJECT = Object.create(null);
let expectedRollbarPayload = null;

const prepareForNotification = () => {
  ci.env.isCi = true;
  ci.env.commit = testCommitSHA;
  process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';
  config.writeProjectConfig(CMC_ENABLED, true);
  config.writeProjectConfig(ROLLBAR_ENABLED, true);
};

const checkResult = (response) => {
  expect(response).toBeUndefined();
  expect(Rollbar.__getInfoOrErrorPayload()).toEqual(expectedRollbarPayload);
  expect(cmcApiMock.__getDeploymentItems()).toEqual(expectedPayload);
  expect(cmcApiMock.__getDeploymentObject()).toMatchObject(EXPECTED_DEPLOYMENT_OBJECT);
};

beforeEach(() => {
  // reset and require modules so that we have new fresh objects for CMC and other modules used by deployment.js for each test
  jest.resetModules();
  Rollbar = require('rollbar');
  git = require('simple-git/promise')();
  fs = require('fs');
  ci = require('../../ci/ci');
  deployment = require('../deployment');
  config = require('../../config/config');
  cmcApiMock = require('../../../__mocks__/cmcApiMock');

  Rollbar.__resetValues();
  fs.__resetMockFiles();
  config.purge();

  destination = 'fakeDestination';
  testCommitSHA = 'testSHA';
  this.originalSHA = ci.env.commit;
  expectedPayload = null;
  EXPECTED_DEPLOYMENT_OBJECT = Object.create(null);
  expectedRollbarPayload = null;
});

afterEach(() => {
  ci.env.isCi = false;
  ci.env.commit = this.originalSHA;
  delete process.env.ROLLBAR_ACCESS_TOKEN;
});

describe('Notify Rollbar and CMC for deployment', () => {
  it('should throw error if in NON-CI environment', () => {
    // given
    const ERROR_MESSAGE = 'This functionality is only available in CI environment.';
    ci.env.isCi = false;

    // when
    return expect(deployment.notifyDeployment(destination))
      // then
      .rejects.toEqual(ERROR_MESSAGE);
  });

  it('should throw error if CMC is not enbled', () => {
    // given
    const ERROR_MESSAGE = 'Skip further then blocks.';
    ci.env.isCi = true;
    ci.env.commit = testCommitSHA;

    // when
    return expect(deployment.notifyDeployment(destination))
      // then
      .resolves.toEqual(ERROR_MESSAGE);
  });

  it('should not notify Rollbar if it is not enabled', () => {
    // given
    ci.env.isCi = true;
    ci.env.commit = testCommitSHA;
    config.writeProjectConfig(CMC_ENABLED, true);
    git.__setCommitMessageItems(['S-12345']);

    // when
    return deployment.notifyDeployment(destination)
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(Rollbar.__getReceivedPayload()).toBeNull();
      });
  });

  it('should notify Rollbar and CMC if commit message contains a valid STORY', () => {
    // given
    const STORIES = ['S-12345'];
    prepareForNotification();
    git.__setCommitMessageItems(STORIES);
    expectedPayload = cmcApiMock.__getExpectedResult(STORIES);
    expectedRollbarPayload = {
      stories: 'S-12345',
      issues: '',
      tasks: '',
    };
    EXPECTED_DEPLOYMENT_OBJECT = {
      deploymentName: 'Deployment to fakeDestination',
      deploymentStatus: 'Completed',
      sprintId: 'fakeSprintId1',
    };

    // when
    return deployment.notifyDeployment(destination)
      // then
      .then((response) => {
        checkResult(response);
      });
  });

  it('should notify Rollbar and CMC if commit message contains a valid ISSUE', () => {
    // given
    const ISSUES = ['I-12345'];
    prepareForNotification();
    git.__setCommitMessageItems(ISSUES);
    expectedPayload = cmcApiMock.__getExpectedResult(ISSUES);
    expectedRollbarPayload = {
      stories: '',
      issues: 'I-12345',
      tasks: '',
    };
    EXPECTED_DEPLOYMENT_OBJECT = {
      deploymentName: 'Deployment to fakeDestination',
      deploymentStatus: 'Completed',
      sprintId: 'fakeSprintId3',
    };

    // when
    return deployment.notifyDeployment(destination)
      // then
      .then((response) => {
        checkResult(response);
      });
  });

  it('should notify Rollbar and CMC if commit message contains valid STORIES and ISSUES', () => {
    // given
    const CMC_ITEMS = ['S-12345', 'S-123457', 'I-12345', 'I-123457'];
    prepareForNotification();
    git.__setCommitMessageItems(CMC_ITEMS);
    expectedPayload = cmcApiMock.__getExpectedResult(CMC_ITEMS);
    expectedRollbarPayload = {
      stories: 'S-12345, S-123457',
      issues: 'I-12345, I-123457',
      tasks: '',
    };
    EXPECTED_DEPLOYMENT_OBJECT = {
      deploymentName: 'Deployment to fakeDestination',
      deploymentStatus: 'Completed',
      releaseId: 'fakeReleaseId1',
    };

    // when
    return deployment.notifyDeployment(destination)
      // then
      .then((response) => {
        checkResult(response);
      });
  });

  it('should notify Rollbar and CMC if commit message contains some valid and some invalid STORIES and ISSUES', () => {
    // given
    const CMC_ITEMS = ['S-12345', 'S-29854', 'I-12345', 'I-09898'];
    prepareForNotification();
    git.__setCommitMessageItems(CMC_ITEMS);
    expectedPayload = cmcApiMock.__getExpectedResult(CMC_ITEMS);
    expectedRollbarPayload = {
      stories: 'S-12345, S-29854',
      issues: 'I-12345, I-09898',
      tasks: '',
    };
    EXPECTED_DEPLOYMENT_OBJECT = {
      deploymentName: 'Deployment to fakeDestination',
      deploymentStatus: 'Completed',
      releaseId: 'fakeReleaseId1',
    };

    // when
    return deployment.notifyDeployment(destination)
      // then
      .then((response) => {
        checkResult(response);
      });
  });

  it('should notify Rollbar and CMC if commit message contains STORIES and ISSUES none of which has release Id', () => {
    // given
    const CMC_ITEMS = ['S-123459', 'I-304890'];
    prepareForNotification();
    git.__setCommitMessageItems(CMC_ITEMS);
    expectedPayload = cmcApiMock.__getExpectedResult(CMC_ITEMS);
    expectedRollbarPayload = {
      stories: 'S-123459',
      issues: 'I-304890',
      tasks: '',
    };
    EXPECTED_DEPLOYMENT_OBJECT = {
      deploymentName: 'Deployment to fakeDestination',
      deploymentStatus: 'Completed',
      sprintId: 'fakeSprintId2',
    };

    // when
    return deployment.notifyDeployment(destination)
      // then
      .then((response) => {
        checkResult(response);
      });
  });

  it('should notify Rollbar and CMC when some error occured', () => {
    // given
    const CMC_ITEMS = ['S-12345', 'S-123457', 'I-12345', 'I-123457'];
    prepareForNotification();
    git.__setCommitMessageItems(CMC_ITEMS);
    expectedPayload = cmcApiMock.__getExpectedResult(CMC_ITEMS);
    expectedRollbarPayload = {
      stories: 'S-12345, S-123457',
      issues: 'I-12345, I-123457',
      tasks: '',
    };
    EXPECTED_DEPLOYMENT_OBJECT = {
      deploymentName: 'Deployment to fakeDestination',
      deploymentStatus: 'Automated Deployments In Progress',
      releaseId: 'fakeReleaseId1',
    };

    // when
    return deployment.notifyDeployment(destination, true)
      // then
      .then((response) => {
        checkResult(response);
      });
  });

  it('should not create deployment record if no valid STORY or ISSUE is found in commit message', () => {
    // given
    const CMC_ITEMS = ['S-21538', 'I-2145361'];
    const ERROR_MESSAGE = 'Skip further then blocks.';
    prepareForNotification();
    git.__setCommitMessageItems(CMC_ITEMS);
    expectedRollbarPayload = {
      stories: 'S-21538',
      issues: 'I-2145361',
      tasks: '',
    };

    // when
    return deployment.notifyDeployment(destination, true)
      // then
      .then((response) => {
        expect(response).toEqual(ERROR_MESSAGE);
        expect(Rollbar.__getInfoOrErrorPayload()).toEqual(expectedRollbarPayload);
      });
  });

  it('should not create deployment record if the STORY or ISSUE in commit message has no Spint or Release specified', () => {
    // given
    const CMC_ITEMS = ['I-123459'];
    const ERROR_MESSAGE = 'Unable to create Deployment record in CMC since Sprint or Release is not defined for any of the CMC stories/issues mentioned in the commit message.';
    prepareForNotification();
    git.__setCommitMessageItems(CMC_ITEMS);

    // when
    return expect(deployment.notifyDeployment(destination, true))
      // then
      .rejects.toEqual(ERROR_MESSAGE);
  });
});
