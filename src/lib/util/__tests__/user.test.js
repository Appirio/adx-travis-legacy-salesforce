jest.mock('fs');

const os = require('os');
const fs = require('fs');
const user = require('../user');
const config = require('../../config/config');

let username;

beforeEach(() => {
  fs.__resetMockFiles();
  config.purge();
});

describe('Get Username', () => {
  it('should get shorten name from the user config file with single word', () => {
    username = 'fakeUser';
    config.writeUserConfig('name', username);
    expect(user.getUserName()).toEqual('fakeuser');
  });

  it('should get shorten name from the user config file with multiple words', () => {
    username = 'fake User Name';
    config.writeUserConfig('name', username);
    expect(user.getUserName()).toEqual('funame');
  });

  it('should get shorten name in lowercase from the user config file', () => {
    username = 'faKe UsEr NaMe';
    config.writeUserConfig('name', username);
    expect(user.getUserName()).toEqual('funame');
  });

  it('should get username from OS info if no user config file exists', () => {
    username = os.userInfo().username;
    expect(user.getUserName()).toEqual(username);
  });
});
