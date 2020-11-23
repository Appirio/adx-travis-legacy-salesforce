/* eslint-disable global-require */
jest.mock('fs');

let config;

beforeEach(() => {
  jest.resetModules();
  config = require('../../config/config');
});

describe('Require VCS module', () => {
  it('should require VCS module with GIT module when no \'Source Control Type\' is specified in project config file', () => {
    const vcs = require('../vcs');
    expect(vcs.type).toEqual('git');
  });

  it('should require VCS module with GIT module when \'Source Control Type\' is GIT in project config file', () => {
    config.writeProjectConfig('sourceControlType', 'git');
    const vcs = require('../vcs');
    expect(vcs.type).toEqual('git');
  });

  it('should throw error if \'Source Control Type\' specified in project config file is other than git', () => {
    config.writeProjectConfig('sourceControlType', 'fakeVCS');
    expect(() => require('../vcs')).toThrow(/not a supported version control provider/);
  });
});
