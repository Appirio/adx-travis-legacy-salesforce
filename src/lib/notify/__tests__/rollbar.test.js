jest.mock('rollbar');
jest.mock('fs');

const Rollbar = require('rollbar');
const fs = require('fs');
const config = require('../../config/config');
const rollbar = require('../rollbar');

let failureMessage = null;
let expectedPayload = null;

afterEach(() => {
  fs.__resetMockFiles();
  config.purge();
  Rollbar.__resetValues();
});

describe('Enable Rollbar for the project', () => {
  const ROLLBAR_ENABLED = 'rollbar.enabled';

  it('should return false if rollbar enabled property does NOT exist in the project config', () => {
    // given
    expect(config.hasProjectConfig(ROLLBAR_ENABLED)).toBeFalsy();

    // when
    expect(rollbar.enabled)
      // then
      .toBeFalsy();
  });

  it('should return true if rollbar enabled is TRUE in project config file', () => {
    // given
    config.writeProjectConfig(ROLLBAR_ENABLED, true);

    // when
    expect(rollbar.enabled)
      // then
      .toBeTruthy();
  });

  it('should return true if rollbar enabled is FALSE in project config file', () => {
    // given
    config.writeProjectConfig(ROLLBAR_ENABLED, false);

    // when
    expect(rollbar.enabled)
      // then
      .toBeFalsy();
  });
});

describe('Send message to Rollbar', () => {
  let msg;
  let payload;
  let isError;
  let EMAIL;
  let NAME;

  beforeEach(() => {
    msg = 'Test Message';
    payload = {
      testContext: 'Test Install',
    };
    failureMessage = null;
    expectedPayload = null;
    EMAIL = 'test@email.dx';
    NAME = 'DIXie Coder';
  });

  afterEach(() => {
    delete process.env.ROLLBAR_ACCESS_TOKEN;
    delete process.env.ADX_APP_VERSION;
    delete process.env.ADX_CLI_VERSION;
    delete process.env.ADX_APP_ENV;
    delete process.env.ADX_CLI_ENV;
  });

  it('should give error while sending error if Rollbar access token is not found', () => {
    // given
    isError = true;

    // when
    return expect(() => {
      rollbar.sendMessage(msg, isError, payload);
    })
      // then
      .toThrow('Rollbar access token is not available!');
  });

  it('should send ERROR message to Rollbar successfully', () => {
    // given
    isError = true;
    process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';
    process.env.ADX_CLI_ENV = 'test';
    expectedPayload = {
      person: {
        id: 'Unknown',
        email: 'Unknown',
        username: 'Unknown',
      },
      OS: process.platform,
      environment: 'test',
      version: 'Unknown',
    };

    // when
    return rollbar.sendMessage(msg, isError, payload)
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(Rollbar.__getReceivedPayload()).toEqual(expectedPayload);
      });
  });

  it('should send INFO message to Rollbar successfully', () => {
    // given
    isError = false;
    process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';
    process.env.ADX_CLI_ENV = 'test';
    expectedPayload = {
      person: {
        id: 'Unknown',
        email: 'Unknown',
        username: 'Unknown',
      },
      OS: process.platform,
      environment: 'test',
      version: 'Unknown',
    };

    // when
    return rollbar.sendMessage(msg, isError, payload)
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(Rollbar.__getReceivedPayload()).toEqual(expectedPayload);
      });
  });

  it('should fail while sending ERROR message to Rollbar', () => {
    // given
    isError = true;
    failureMessage = Rollbar.__setFailureMessage('Test Failure to send Error message');
    process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';

    // when
    return expect(rollbar.sendMessage(msg, isError, payload))
      // then
      .rejects.toMatch(failureMessage);
  });

  it('should fail while sending INFO message to Rollbar', () => {
    // given
    isError = false;
    failureMessage = Rollbar.__setFailureMessage('Test Failure to send Info message');
    process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';

    // when
    return expect(rollbar.sendMessage(msg, isError, payload))
      // then
      .rejects.toMatch(failureMessage);
  });

  it('should send ERROR message for ADX app when user info is available', () => {
    // given
    isError = true;
    process.env.ADX_APP_VERSION = 'fakeversion';
    process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';
    process.env.ADX_APP_ENV = 'test';
    config.writeUserConfig('email', EMAIL);
    config.writeUserConfig('name', NAME);
    expectedPayload = {
      person: {
        id: EMAIL,
        email: EMAIL,
        username: NAME,
      },
      OS: process.platform,
      environment: 'test',
      version: process.env.ADX_APP_VERSION,
    };

    // when
    return rollbar.sendMessage(msg, isError, payload)
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(Rollbar.__getReceivedPayload()).toEqual(expectedPayload);
      });
  });

  it('should send ERROR message for ADX-CLI when user info is available', () => {
    // given
    isError = true;
    process.env.ADX_CLI_VERSION = 'fakeversion';
    process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';
    process.env.ADX_CLI_ENV = 'test';
    config.writeUserConfig('email', EMAIL);
    config.writeUserConfig('name', NAME);
    expectedPayload = {
      person: {
        id: EMAIL,
        email: EMAIL,
        username: NAME,
      },
      OS: process.platform,
      environment: 'test',
      version: process.env.ADX_CLI_VERSION,
    };

    // when
    return rollbar.sendMessage(msg, isError, payload)
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(Rollbar.__getReceivedPayload()).toEqual(expectedPayload);
      });
  });

  it('should send ERROR message for ADX-CLI when no user info is available', () => {
    // given
    isError = true;
    process.env.ADX_CLI_VERSION = 'fakeversion';
    process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';
    process.env.ADX_CLI_ENV = 'test';
    config.writeUserConfig('email', EMAIL);
    expectedPayload = {
      person: {
        id: EMAIL,
        email: EMAIL,
        username: 'Unknown',
      },
      OS: process.platform,
      environment: 'test',
      version: process.env.ADX_CLI_VERSION,
    };

    // when
    return rollbar.sendMessage(msg, isError, payload)
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(Rollbar.__getReceivedPayload()).toEqual(expectedPayload);
      });
  });

  it('should send ERROR message when Node Environment does not exist', () => {
    // given
    isError = true;
    process.env.ROLLBAR_ACCESS_TOKEN = 'fakeRollbarToken';
    process.env.ADX_CLI_ENV = 'test';
    expectedPayload = {
      person: {
        id: 'Unknown',
        email: 'Unknown',
        username: 'Unknown',
      },
      OS: process.platform,
      environment: 'test',
      version: 'Unknown',
    };

    // when
    return rollbar.sendMessage(msg, isError, payload)
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(Rollbar.__getReceivedPayload()).toEqual(expectedPayload);
      });
  });
});
