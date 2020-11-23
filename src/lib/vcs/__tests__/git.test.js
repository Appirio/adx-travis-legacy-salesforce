jest.mock('child_process');
jest.mock('simple-git/promise');
jest.mock('fs');
jest.mock('shelljs');
jest.mock('../../ci/ci');

let git;
let ci;
let config;
let gitPromise;
let REMOTES;
let sourceBranch;
let branchName;
let expectedSourceBranch;
let expectedRemoteUrl;

beforeEach(() => {
  /* eslint-disable global-require */
  jest.resetModules();
  git = require('../git');
  config = require('../../config/config');
  gitPromise = require('simple-git/promise')();
  ci = require('../../ci/ci');

  expectedRemoteUrl = '';
  sourceBranch = 'remotes/origin/fake_branch';
  branchName = 'testBranch';
  expectedSourceBranch = 'remotes/origin/master';
  REMOTES = [{
    name: 'origin',
    refs: {
      fetch: 'git@gitlab.appirio.com:appirio-dx/test-project.git',
      push: 'git@gitlab.appirio.com:appirio-dx/test-project.git',
    },
  }];
});

describe('git push', () => {
  it('should return true if pushed successfully',
    async () => {
      const result = await git.push();
      expect(result.data).toBe(true);
    });

  it('should reject if pushed unsuccessfully',
    async () => {
      // given
      gitPromise.push.mockRejectedValueOnce('Can not push');

      // when
      try {
        await git.push();
      } catch (result) {
        // then
        expect(result.error.message).toBe('Can not push');
      }
    });
});

describe('git pull', () => {
  let theEvent;
  let spawn;
  const { Readable } = require('stream');
  const mockUtil = require('../../util/mocking');
  const EE = require('events').EventEmitter;
  beforeEach(() => {
    ({ spawn } = require('child_process'));
    theEvent = new EE();
  });
  it('should return true if pull is successful', () => {
    theEvent.stdout = mockUtil.getMockStreamReadableStr('Pull successful');
    // Nothing in STDERR
    theEvent.stderr = new Readable({ read() { } });

    spawn.mockReturnValueOnce(theEvent);
    setTimeout(() => {
      theEvent.emit('exit', 0);
    }, 2000);
    const result = git.pull();
    return expect(result).resolves.toHaveProperty('data', true);
  });

  it('should reject if pull is unsuccessful - no conflict error - should read error from STDERR', () => {
    const ERR_STDOUT = 'Some output written to STDOUT, but not the conflict text';
    const ERR_STDERR = 'Some error occured in pull - written to STDERR';
    theEvent.stdout = mockUtil.getMockStreamReadableStr(ERR_STDOUT);
    theEvent.stderr = mockUtil.getMockStreamReadableStr(ERR_STDERR);
    spawn.mockReturnValueOnce(theEvent);

    setTimeout(() => {
      theEvent.emit('exit', 1);
    }, 2000);
    const result = git.pull();
    expect(result).rejects.toHaveProperty('data', null);
    return expect(result).rejects.toHaveProperty('error.message', ERR_STDERR);
  });

  it('should reject if pull is unsuccessful - in case of a conflict error - should read error from STDOUT', () => {
    const ERR_STDOUT = 'This conflict error - CONFLICT (content): Some file name - written to STDOUT';
    const ERR_STDERR = 'Some error occured in pull - written to STDERR';
    theEvent.stdout = mockUtil.getMockStreamReadableStr(ERR_STDOUT);
    theEvent.stderr = mockUtil.getMockStreamReadableStr(ERR_STDERR);
    spawn.mockReturnValueOnce(theEvent);

    setTimeout(() => {
      theEvent.emit('exit', 1);
    }, 2000);
    const result = git.pull();
    expect(result).rejects.toHaveProperty('data', null);
    return expect(result).rejects.toHaveProperty('error.message', ERR_STDOUT);
  });
});

describe('isSyncRequired', () => {
  it('should return ahead and behind info if sync is required of the branch being passed',
    async () => {
      const expectedResult = { ahead: '1', behind: '4' };
      // when
      const result = await git.isSyncRequired('master');

      // then
      expect(result.data).toMatchObject(expectedResult);
    });

  it('should resolve with No remote ref found if this error comes',
    async () => {
      // given
      gitPromise.raw.mockRejectedValueOnce({ message: "Couldn't find remote ref" });

      // when
      const result = await git.isSyncRequired('master');

      // then
      return expect(result.data).toEqual('No remote ref found. Push your branch to remote.');
    });

  it('should return false if the branch needs no sync',
    async () => {
      // given
      const expectedResult = { ahead: '0', behind: '0' };
      gitPromise.raw.mockResolvedValueOnce('0\t0\n');

      // when
      const result = await git.isSyncRequired('master');

      // then
      expect(result.data).toMatchObject(expectedResult);
    });

  it('should reject if unknown error is thrown',
    async () => {
      // given
      gitPromise.raw.mockRejectedValueOnce({ message: 'Error Found' });

      try {
        // when
        await git.isSyncRequired('master');
      } catch (result) {
        // then
        return expect(result.error.message).toBe('Error Found');
      }
    });

  it('should retry getting branch status if a connection error arises ',
    async () => {
      // given
      global.console.log = jest.fn();
      gitPromise.raw.mockRejectedValueOnce({ message: 'ssh: connect to host gitlab.appirio.com port 22: Connection refused. fatal: Could not read from remote repository.' });
      // when
      try {
        await git.isSyncRequired('master');
      } catch (err) {
        // do nothing
      }
      // then
      expect(global.console.log).toHaveBeenCalledWith("Failed for 'master'! Will retry in some time...");
      expect(global.console.log).toHaveBeenCalledWith("Retrying for 'master'....");
      global.console.log.mockReset();
    });
});

describe('getLocalBranchList', () => {
  it('should display all the local branches in the repo',
    async () => {
      // when
      const result = await git.getLocalBranchList();

      // then
      expect(result.data).toEqual({
        current: 'feature/unit_tests',
        all: ['feature/unit_tests',
          'remotes/origin/fake_branch',
        ],
      });
    });

  it('should reject throw an error when there is an issue getting the branches',
    async () => {
      // given
      gitPromise.branchLocal.mockRejectedValueOnce({ message: 'Error Found' });

      // when
      try {
        await git.getLocalBranchList();
      } catch (result) {
        // then
        expect(result.error.message).toBe('Error Found');
      }
    });
});

describe('getBranchStatus', () => {
  it('should return status summary',
    async () => {
      // given
      const returnValue = require('../../../__mockData__/git.json');
      const { statusSummary } = returnValue;

      // when
      const result = await git.getBranchStatus();

      // then
      expect(result.data).toEqual(statusSummary);
    });
  it('should throw error when there is one',
    async () => {
      // given
      gitPromise.status.mockRejectedValueOnce({ message: 'test error' });

      // when
      try {
        await git.getBranchStatus();
      } catch (result) {
        // then
        expect(result.error.message).toBe('test error');
      }
    });
});

describe('commit', () => {
  it('should commit changes to the repository when there are some staged changes',
    async () => {
      // given
      const returnValue = require('../../../__mockData__/git.json');
      const { commitSummary } = returnValue;

      // when
      const result = await git.commit('test message');

      // then
      expect(result.data).toEqual(commitSummary);
    });
  it('should reject the promise if there are no changes to commit',
    async () => {
      // given
      const commitSummary = {
        branch: '',
        commit: '',
        summary: {
          changes: 0,
          insertions: 0,
          deletions: 0,
        },
        author: null,
      };
      gitPromise.commit.mockResolvedValueOnce(commitSummary);

      // when
      try {
        await git.commit('test message');
      } catch (result) {
        // then
        expect(result.error.message).toBe('No changes added to commit');
      }
    });
  it('should throw error when there is error while commiting changes',
    async () => {
      // given
      gitPromise.commit.mockRejectedValueOnce({ message: 'test error' });

      // when
      try {
        await git.commit('test message');
      } catch (result) {
        // then
        expect(result.error.message).toBe('test error');
      }
    });
});

describe('syncGitBranch', () => {
  let theEvent;
  let spawn;
  const { Readable } = require('stream');
  const mockUtil = require('../../util/mocking');
  const EE = require('events').EventEmitter;
  beforeEach(() => {
    ({ spawn } = require('child_process'));
    theEvent = new EE();
  });
  it('should run push/pull methods when the branch is ahead/behind',
    async () => {
      /* Successful Pull - Start */
      theEvent.stdout = mockUtil.getMockStreamReadableStr('Pull successful');
      // Nothing in STDERR
      theEvent.stderr = new Readable({ read() { } });
      spawn.mockReturnValueOnce(theEvent);
      setTimeout(() => {
        theEvent.emit('exit', 0);
      }, 2000);
      /* Successful Pull - End */

      // when
      const result = await git.syncGitBranch();
      // then
      expect(result.data).toBe(true);
    });
  it('should run push/pull methods when the branch is ahead/behind and not tracking any remote branch as well',
    async () => {
      /* Successful Pull - Start */
      theEvent.stdout = mockUtil.getMockStreamReadableStr('Pull successful');
      // Nothing in STDERR
      theEvent.stderr = new Readable({ read() { } });
      spawn.mockReturnValueOnce(theEvent);
      setTimeout(() => {
        theEvent.emit('exit', 0);
      }, 2000);
      /* Successful Pull - End */

      // given
      const { statusSummary } = require('../../../__mockData__/git.json');
      statusSummary.tracking = null;
      gitPromise.status.mockResolvedValueOnce(statusSummary);

      // when
      const result = await git.syncGitBranch();

      //
      expect(result.data).toBe(true);
    });
  it('should reject with an error if either push or pull is rejected',
    async () => {
      /* Failed Pull - Start */
      // Nothing in STDOUT
      theEvent.stdout = new Readable({ read() { } });
      theEvent.stderr = mockUtil.getMockStreamReadableStr('Can not pull');
      spawn.mockReturnValueOnce(theEvent);
      setTimeout(() => {
        theEvent.emit('exit', 1);
      }, 2000);
      /* Failed Pull - End */

      try {
        // when
        await git.syncGitBranch();
      } catch (result) {
        // then
        expect(result.error.message).toBe('Can not pull');
      }
    });
});

describe('checkout', () => {
  it('should checkout existing branch',
    async () => {
      // when
      const result = await git.checkoutBranch();

      // then
      expect(result.data).toBe(true);
    });
  it('should reject if it can not checkout the branch',
    async () => {
      // given
      gitPromise.checkout.mockRejectedValueOnce('Your local changes to the following files would be overwritten by checkout');
      try {
        // when
        await git.checkoutBranch('master');
      } catch (result) {
        // then
        return expect(result.error.message).toBe('Your local changes to the following files would be overwritten by checkout');
      }
    });
  it('should retry checking out if an error arises because of index.lock',
    async () => {
      // given
      global.console.log = jest.fn();
      gitPromise.checkout.mockRejectedValueOnce({ message: 'Another git process seems to be running in this repository' });
      // when
      try {
        await git.checkoutBranch('master', false);
      } catch (err) {
        // do nothing
      }
      // then
      expect(global.console.log).toHaveBeenCalledWith("Failed for 'master'! Will retry in some time...");
      expect(global.console.log).toHaveBeenCalledWith("Retrying for 'master'....");
      global.console.log.mockReset();
    });
});

describe('stageChanges', () => {
  it('should stage changes and return true if successful',
    async () => {
      // when
      const result = await git.stageChanges(['fileA, fileB']);

      // then
      expect(result.data).toBe(true);
    });
  it('should reject if it can not stage the changes',
    async () => {
      // given
      gitPromise.add.mockRejectedValueOnce("Error: fatal: pathspec 'fileA' did not match any files");
      try {
        // when
        await git.stageChanges('fileA');
      } catch (result) {
        // then
        return expect(result.error.message).toBe("Error: fatal: pathspec 'fileA' did not match any files");
      }
    });
});

describe('unstageChanges', () => {
  it('should stage changes and return true if successful',
    async () => {
      // when
      const result = await git.unstageChanges(['fileA, fileB']);

      // then
      expect(result.data).toBe(true);
    });
  it('should reject if it can not stage the changes',
    async () => {
      // given
      gitPromise.reset.mockRejectedValueOnce('Unknown error');
      expect.assertions(1);
      try {
        // when
        await git.unstageChanges('fileA');
      } catch (result) {
        // then
        return expect(result.error.message).toBe('Unknown error');
      }
    });
});

describe('deleteBranch', () => {
  it('should delete the local and remote branch',
    async () => {
      // when
      const result = await git.deleteBranch('testBranch', true);
      // then
      expect(result.data).toBe(true);
    });
  it('should throw an error when there is an error deleting the branch',
    async () => {
      // given
      gitPromise.raw.mockRejectedValueOnce('Unable to delete the branch');
      expect.assertions(1);

      try {
        await git.deleteBranch('testBranch', true);
      } catch (result) {
        // then
        return expect(result.error).toBe('Unable to delete the branch');
      }
    });
});

describe('Generating a Git-safe name', () => {
  it('should remove any special characters that are not allowed in Git refs', () => {
    // when
    expect(git.gitSafeName('Test\\a~few:types^^    of.punctuation@{to?see*what[works  '))
      // then
      .toBe('Test-a-few-types-of-punctuation-to-see-what-works');
  });

  it('should remove any characters that are not allowed in Git refs', () => {
    // when
    expect(git.gitSafeName('Some phrase    with ?punctuation!!!'))
      // then
      .toBe('Some-phrase-with-punctuation!!!');

    // when
    expect(git.gitSafeName(`Some 'phrase'    "with" (quotes)`))
      // then
      .toBe('Some-phrase-with-(quotes)');

    // when
    expect(git.gitSafeName('https://test.something'))
      // then
      .toBe('https-//test-something');
  });

  it('should remove additional characters that cause problems with GitLab CI', () => {
    // when
    expect(git.gitSafeName('Some <phrase> with & Ampersands'))
      // then
      .toBe('Some-phrase-with-Ampersands');

    // when
    expect(git.gitSafeName('branch\n-test'))
      // then
      .toBe('branch-test');

    // when
    expect(git.gitSafeName('branch\xA9test'))
      // then
      .toBe('branchtest');

    // when
    expect(git.gitSafeName('branch---test//--'))
      // then
      .toBe('branch-test');
  });
});

describe('Create branch from the branch to clone/checked out branch', () => {
  it('should create branch from the default master branch if no source branch is specified in the project config file', () => {
    // when
    return git.createBranch(branchName)
      // then
      .then((res) => {
        expect(gitPromise.__getSourceBranch()).toEqual(expectedSourceBranch);
        // expect(global.console.log).toHaveBeenCalledWith('Successfully created and checked out branch: testBranch');
      });
  });

  it('should create new branch from master if the source branch specified in project config file does not exist', () => {
    // given
    config.writeProjectConfig('sourceBranchToClone', 'remote/noExist/branch');

    // when
    return git.createBranch(branchName)
      // then
      .then((res) => {
        expect(gitPromise.__getSourceBranch()).toEqual(expectedSourceBranch);
        // expect(global.console.log).toHaveBeenCalledWith('Successfully created and checked out branch: testBranch');
      });
  });

  it('should create new branch from master if an error occurred while searching for the source branch', () => {
    // given
    config.writeProjectConfig('sourceBranchToClone', 'origin/testBranch');
    gitPromise.branch.mockResolvedValueOnce();

    // when
    return git.createBranch(branchName)
      // then
      .then((res) => {
        expect(gitPromise.__getSourceBranch()).toEqual(expectedSourceBranch);
        // expect(global.console.log).toHaveBeenCalledWith('Successfully created and checked out branch: testBranch');
      });
  });

  it('should create new branch from master if the source branch in project config file is master', () => {
    // given
    config.writeProjectConfig('sourceBranchToClone', 'master');
    gitPromise.branch.mockResolvedValueOnce();

    // when
    return git.createBranch(branchName)
      // then
      .then((res) => {
        expect(gitPromise.__getSourceBranch()).toEqual(expectedSourceBranch);
        // expect(global.console.log).toHaveBeenCalledWith('Successfully created and checked out branch: testBranch');
      });
  });

  it('should create new branch from master if the source branch in project config file is empty', () => {
    // given
    config.writeProjectConfig('sourceBranchToClone', '');
    gitPromise.branch.mockResolvedValueOnce();

    // when
    return git.createBranch(branchName)
      // then
      .then((res) => {
        expect(gitPromise.__getSourceBranch()).toEqual(expectedSourceBranch);
        // expect(global.console.log).toHaveBeenCalledWith('Successfully created and checked out branch: testBranch');
      });
  });

  it('should create new branch from the source branch specified in project config file where source branch is not provided', () => {
    // given
    expectedSourceBranch = 'remotes/origin/fake_branch';
    config.writeProjectConfig('sourceBranchToClone', 'remotes/origin/fake_branch');

    // when
    return git.createBranch(branchName)
      // then
      .then((res) => {
        expect(gitPromise.__getSourceBranch()).toEqual(expectedSourceBranch);
        // expect(global.console.log).toHaveBeenCalledWith('Successfully created and checked out branch: testBranch');
      });
  });

  it('should create new branch from the source branch specified in project config file where source branch is not provided and append remotes if its still not on remote', () => {
    // given
    expectedSourceBranch = 'remotes/origin/fake_branch';
    config.writeProjectConfig('sourceBranchToClone', 'origin/fake_branch');

    // when
    return git.createBranch(branchName)
      // then
      .then((res) => {
        expect(gitPromise.__getSourceBranch()).toEqual(expectedSourceBranch);
        // expect(global.console.log).toHaveBeenCalledWith('Successfully created and checked out branch: testBranch');
      });
  });

  it('should create branch by the name provided ', () => git.createBranch(branchName, sourceBranch)
    // then
    .then(() => {
      expect(gitPromise.__getNewBranch()).toEqual(branchName);
    }),
  );

  it('should create new branch from the provided source branch', () => git.createBranch(branchName, sourceBranch)
    // then
    .then(() => {
      expect(gitPromise.__getSourceBranch()).toEqual(sourceBranch);
    }),
  );

  it('should throw error if given source branch does not exist', () => expect(git.createBranch(branchName, 'dummy_source_branch'))
    // then
    .rejects.toThrow('Source branch "dummy_source_branch" was not found!'),
  );
  it('should create new branch from master if given branch and config source branch is not available', () => git.createBranch(branchName)
    // then
    .then(() => {
      expect(gitPromise.__getSourceBranch()).toEqual(expectedSourceBranch);
    }),
  );
  it('should not create any branch if some error occurs while fetching branches', () => {
    // given
    config.writeProjectConfig('sourceBranchToClone', 'remotes/origin/fake_branch');
    gitPromise.branch.mockRejectedValueOnce('fake error');

    // when
    return expect(git.createBranch(branchName))
      // then
      .rejects.toEqual('fake error');
  });
});

describe('Get commit message from commitSHA', () => {
  it('should return the commit message associated with the specified commit SHA', () => {
    // when
    return expect(git.getCommitMessage('testSHA'))
      // then
      .resolves.toMatch(/Test commit/);
  });

  it('should return commit message containing CMC items', () => {
    // given
    gitPromise.__setCommitMessageItems(['fakeItem']);

    // when
    return expect(git.getCommitMessage('testSHA'))
      // then
      .resolves.toMatch(/(Test commit).*(fakeItem)/);
  });
});

describe('Get Remote URL', () => {
  it('should get remote SSH origin URL', () => {
    // given
    expectedRemoteUrl = 'git@gitlab.appirio.com:appirio-dx/test-project.git';
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemoteURL())
      // then
      .resolves.toEqual(expectedRemoteUrl);
  });

  it('should get remote HTTPS origin URL', () => {
    // given
    REMOTES = [{
      name: 'origin',
      refs: {
        fetch: 'https://gitlab.appirio.com/appirio-dx/test-project.git',
        push: 'https://gitlab.appirio.com/appirio-dx/test-project.git',
      },
    }];
    expectedRemoteUrl = 'https://gitlab.appirio.com/appirio-dx/test-project.git';
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemoteURL())
      // then
      .resolves.toEqual(expectedRemoteUrl);
  });

  it('should get remote URL from non-gitlab server', () => {
    // given
    REMOTES = [{
      name: 'origin',
      refs: {
        fetch: 'https://bitbucket.org/appirio-dx/test-project.git',
        push: 'https://bitbucket.org/appirio-dx/test-project.git',
      },
    }];
    expectedRemoteUrl = 'https://bitbucket.org/appirio-dx/test-project.git';
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemoteURL())
      // then
      .resolves.toEqual(expectedRemoteUrl);
  });

  it('should get non-origin remote URL', () => {
    // given
    REMOTES = [{
      name: 'fakeOrigin',
      refs: {
        fetch: 'git@gitlab.appirio.com:fake-appirio-dx/test-project.git',
        push: 'git@gitlab.appirio.com:fake-appirio-dx/test-project.git',
      },
    }];
    expectedRemoteUrl = 'git@gitlab.appirio.com:fake-appirio-dx/test-project.git';
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemoteURL())
      // then
      .resolves.toEqual(expectedRemoteUrl);
  });

  it('should return no remote if push ref is not associated with it', () => {
    // given
    REMOTES = [{
      name: 'fakeOrigin',
      refs: {
        fetch: 'git@gitlab.appirio.com:fake-appirio-dx/test-project.git',
      },
    }];
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemoteURL())
      // then
      .resolves.toEqual('');
  });
});

describe('Get Remote Path', () => {
  it('should get remote path from SSH URL', () => {
    // given
    const expectedPath = 'appirio-dx/test-project';
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemotePath())
      // then
      .resolves.toEqual(expectedPath);
  });

  it('should get remote path from HTTPS URL', () => {
    // given
    const expectedPath = 'appirio-dx/test-project';
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemotePath())
      // then
      .resolves.toEqual(expectedPath);
  });

  it('should get remote path from non-gitlab URL', () => {
    // given
    REMOTES = [{
      name: 'origin',
      refs: {
        fetch: 'https://bitbucket.org/appirio-dx/test-project.git',
        push: 'https://bitbucket.org/appirio-dx/test-project.git',
      },
    }];
    const expectedPath = 'appirio-dx/test-project';
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemotePath())
      // then
      .resolves.toEqual(expectedPath);
  });

  it('should get no remote path if not associated with any remote repository', () => {
    // given
    REMOTES = [];
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemotePath())
      // then
      .resolves.toEqual('');
  });
});

describe('Get Remote Slug', () => {
  it('should get remote slug', () => {
    // given
    gitPromise.__setInfo(REMOTES);

    // when
    return expect(git.getRemoteSlug())
      // then
      .resolves.toEqual('appirio-dx-test-project');
  });
});

describe('getOrSetRemote', () => {
  beforeAll(() => {
    delete process.env.GIT_USERNAME;
    delete process.env.GIT_TOKEN;
    delete process.env.GITLAB_USERNAME;
    delete process.env.GITLAB_TOKEN;
  });

  it("should throw error if it can't find Git username and/or token", () => {
    // given
    REMOTES = [{
      name: 'fakeOrigin',
      refs: {
        fetch: 'git@gitlab.appirio.com:fake-appirio-dx/test-project.git',
      },
    }];
    gitPromise.__setInfo(REMOTES);
    ci.__setCIValues(true, 'https://gitlab.appirio.com/appirio-dx/test-project.git');

    // when
    const result = git.getOrSetRemote();
    return expect(result).rejects.toThrow('GIT_USERNAME and/or GIT_TOKEN missing. Please add them as your secret variables in your project.');
  });

  it("should throw error if it can't find Git username and/or token", () => {
    // given
    REMOTES = [{
      name: 'fakeOrigin',
      refs: {
        fetch: 'git@gitlab.appirio.com:fake-appirio-dx/test-project.git',
      },
    }];
    gitPromise.__setInfo(REMOTES);
    ci.__setCIValues(true, 'https://gitlab.appirio.com/appirio-dx/test-project.git');

    // when
    const result = git.getOrSetRemote();

    // then
    return expect(result).rejects.toThrow('GIT_USERNAME and/or GIT_TOKEN missing. Please add them as your secret variables in your project.');
  });

  it('should set remote based on Git username or token', async () => {
    // given
    REMOTES = [];
    gitPromise.__setInfo(REMOTES);
    ci.__setCIValues(true, 'https://gitlab.appirio.com/appirio-dx/test-project.git');

    if (!process.env.GIT_USERNAME || !process.env.GIT_TOKEN) {
      process.env.GIT_USERNAME = 'testUser';
      process.env.GIT_TOKEN = 'testToken';
    }

    global.console.log = jest.fn();
    // when
    await git.getOrSetRemote();

    // then
    expect(global.console.log).toHaveBeenCalledWith('Setting remote based on your Git username and token...');
  });

  it('should set remote based on Git username or token', async () => {
    // given
    REMOTES = [{
      name: 'Origin',
      refs: {
        push: 'https://gitlab-ci-token:xxxxxxx@gitlab.appirio.com:fake-appirio-dx/test-project.git',
      },
    }];
    gitPromise.__setInfo(REMOTES);
    ci.__setCIValues(true, 'https://gitlab.appirio.com/appirio-dx/test-project.git');

    if (!process.env.GIT_USERNAME || !process.env.GIT_TOKEN) {
      process.env.GIT_USERNAME = 'testUser';
      process.env.GIT_TOKEN = 'testToken';
    }

    global.console.log = jest.fn();
    // when
    await git.getOrSetRemote();

    // then
    expect(global.console.log).toHaveBeenCalledWith('Setting remote based on your Git username and token...');
  });
});

describe('getDefaultProjectName', () => {
  it('should read repoURL and return the project Name', () => {
    // given
    const repoUrl = 'git@gitlab.appirio.com:appirio-dx/test-project.git';

    // when
    const projectName = git.getDefaultProjectName(repoUrl);

    // then
    expect(projectName).toBe('test-project');
  });
});

describe('getFullBranchList', () => {
  it('should display current and all branches',
    async () => {
      // when
      const result = await git.getFullBranchList();
      // then
      expect(result.data).toEqual({
        current: 'feature/unit_tests',
        all: ['feature/unit_tests',
          'remotes/origin/fake_branch',
          'remotes/origin/fake_branch2',
        ],
      });
    });
  it('should reject throw an error when there is an issue getting all branches',
    async () => {
      // given
      gitPromise.branch.mockRejectedValueOnce({ message: 'Error Found' });

      // when
      try {
        await git.getFullBranchList();
      } catch (result) {
        // then
        expect(result.error.message).toBe('Error Found');
      }
    });
});

describe('discardChanges', () => {
  it('should discard active branch uncommited changes',
    async () => {
      // when
      const result = await git.discardChanges();

      // then
      expect(result.data).toBe(true);
    });
  it('should reject if it can not discard the changes',
    async () => {
      // given
      gitPromise.reset.mockRejectedValueOnce('Error: fatal: Specified Mode is not valid');
      try {
        // when
        await git.discardChanges();
      } catch (result) {
        // then
        return expect(result.error.message).toBe('Error: fatal: Specified Mode is not valid');
      }
    });
});
