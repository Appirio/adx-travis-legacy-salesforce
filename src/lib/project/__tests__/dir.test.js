jest.mock('fs');

const path = require('path');
const os = require('os');

const cwd = process.cwd();
const homedir = os.homedir();
const driveRoot = path.parse(cwd).root;

describe('Inside project directory or subdirectory', () => {
  const fs = require('fs');
  const MOCK_FILE_INFO = {};
  MOCK_FILE_INFO[path.join(cwd, 'config', 'appirio.json')] = JSON.stringify({});

  beforeAll(() => {
    fs.__setMockFiles(MOCK_FILE_INFO);
  });

  afterAll(() => {
    fs.__resetMockFiles();
  });

  it('Validates that we are inside project directory', () => {
    const mydir = require('../dir');
    const dirProps = mydir.processDirectory();
    expect(dirProps.isInsideProject).toBe(true);
    expect(dirProps.projectRoot).toBe(cwd);
  });

  it('Validates that we are inside project subdirectory "force-app"', () => {
    const mydir = require('../dir');
    const subdir = path.join(cwd, 'force-app');
    const dirProps = mydir.processDirectory(subdir);
    expect(dirProps.isInsideProject).toBe(true);
    expect(path.join(dirProps.projectRoot, 'force-app')).toBe(subdir);
  });
});

describe('Not inside project directory or subdirectory', () => {
  const fs = require('fs');
  const MOCK_FILE_INFO = {};

  beforeAll(() => {
    fs.__setMockFiles(MOCK_FILE_INFO);
  });

  afterAll(() => {
    fs.__resetMockFiles();
  });

  it('Validates that we are not inside project directory or subdirectory', () => {
    const mydir = require('../dir');
    const dirProps = mydir.processDirectory();
    expect(dirProps.isInsideProject).toBe(false);
    expect(dirProps.projectRoot).toBe('');
  });
});

describe('Config file (config/appirio.json) in user\'s home directory or drive root', () => {
  const fs = require('fs');
  const MOCK_FILE_INFO = {};
  MOCK_FILE_INFO[path.join(homedir, 'config', 'appirio.json')] = JSON.stringify({});
  MOCK_FILE_INFO[path.join(driveRoot, 'config', 'appirio.json')] = JSON.stringify({});

  beforeAll(() => {
    fs.__setMockFiles(MOCK_FILE_INFO);
  });

  afterAll(() => {
    fs.__resetMockFiles();
  });

  it('Ignores when config file is found in user\'s home directory', () => {
    const mydir = require('../dir');
    const subdir = path.join(homedir, 'some-dir');
    const dirProps = mydir.processDirectory(subdir);
    expect(dirProps.isInsideProject).toBe(false);
    expect(dirProps.projectRoot).toBe('');
  });

  it('Ignores when config file is found in drive root', () => {
    const mydir = require('../dir');
    const subdir = path.join(driveRoot, 'some-dir');
    const dirProps = mydir.processDirectory(subdir);
    expect(dirProps.isInsideProject).toBe(false);
    expect(dirProps.projectRoot).toBe('');
  });
});
