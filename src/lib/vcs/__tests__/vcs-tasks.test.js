jest.mock('fs');
jest.mock('unirest');

let fs = require('fs');
let config = require('../../config/config');
let vcsTasks = require('../vcs-tasks');
let git = require('simple-git/promise')();

let cmcItem;
const cmcNumber = 'S-12345';

beforeEach(() => {
  fs.__resetMockFiles();
  config.purge();
  cmcItem = '';
});

describe('Create GIT Branch on the basis of CMC Number specified', () => {
  it('should create branch with STORY name without description if CMC is NOT enabled', () => {
    cmcItem = 'S-12345';
    config.writeUserConfig('name', 'unit test');

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/utest-S-12345');
      });
  });

  it('should create branch with STORY name with description as CMC is enabled', () => {
    cmcItem = 'S-12345';
    config.writeUserConfig('name', 'unit test');
    config.writeProjectConfig('cmc.enabled', true);

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/utest-S-12345-AppirioDX-test-story');
      });
  });

  it('should create branch with more then 200 Character of story title ', () => {
    cmcItem = 'S-123456789';
    config.writeUserConfig('name', 'unit test');
    config.writeProjectConfig('cmc.enabled', true);

    return vcsTasks.createGITBranch(cmcItem).then((response) => {
      expect(git.__getNewBranch()).toEqual(
        'feature/utest-S-123456789-someRandomTextWhichNeedtoBeMoreThan250CharacterToCheckIfWecreateBranchancCheckoutIntoThatBranchAsPerThisStringItShouldTrimAfter250CharacterAndThenWeWillTryToCreateABranchWhic'
      );
    });
  });
  it('should create branch with ISSUE name without description if CMC is NOT enabled', () => {
    cmcItem = 'I-12345';
    config.writeUserConfig('name', 'unit test');

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/utest-I-12345');
      });
  });

  it('should create branch with ISSUE name with description as CMC is enabled', () => {
    cmcItem = 'I-12345';
    config.writeUserConfig('name', 'unit test');
    config.writeProjectConfig('cmc.enabled', true);

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/utest-I-12345-Milestone-Status-field-is-not-available-on-milestone-object');
      });
  });

  it('should create branch with TASK name without description if CMC is NOT enabled', () => {
    cmcItem = 'T-12345';
    config.writeUserConfig('name', 'unit test');

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/utest-T-12345');
      });
  });

  it('should create branch with TASK name with description as CMC is enabled', () => {
    cmcItem = 'T-12345';
    config.writeUserConfig('name', 'unit test');
    config.writeProjectConfig('cmc.enabled', true);

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/utest-T-12345-Provide-Template');
      });
  });

  it('should create branch without username if username is not found', () => {
    cmcItem = 'S-12345';
    config.writeUserConfig('name', '');
    config.writeProjectConfig('cmc.enabled', true);

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/S-12345-AppirioDX-test-story');
      });
  });

  it('should create branch if CMC number does not exist', () => {
    cmcItem = 'T-12345097';
    config.writeUserConfig('name', 'unit test');
    config.writeProjectConfig('cmc.enabled', true);

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/utest-T-12345097');
      });
  });

  it('should create branch if CMC number is invalid', () => {
    cmcItem = 'A-12345';
    config.writeUserConfig('name', 'unit test');
    config.writeProjectConfig('cmc.enabled', true);

    return vcsTasks.createGITBranch(cmcItem)
      .then((response) => {
        expect(git.__getNewBranch()).toEqual('feature/utest-A-12345');
      });
  });
});

describe('Get Branch Name on the basis of CMC number specified', () => {
  it('should get branch name if accessCMC is true and cmc.enabled is false',
    async () => {
      // given
      config.writeUserConfig('name', 'unit test');
      config.writeProjectConfig('cmc.enabled', false);
      // when
      const branchName = await vcsTasks.getBranchName(cmcNumber);
      // then
      return expect(branchName).toEqual('feature/utest-S-12345');
    });
  it('should get branch name with story title if accessCMC is true and cmc.enabled is true',
    async () => {
      // given
      config.writeUserConfig('name', 'unit test');
      config.writeProjectConfig('cmc.enabled', true);
      // when
      const branchName = await vcsTasks.getBranchName(cmcNumber);
      // then
      return expect(branchName).toEqual('feature/utest-S-12345-AppirioDX test story');
    });
  it('should get branch name without ... if accessCMC is false and cmc.enabled is false',
    async () => {
      // given
      config.writeUserConfig('name', 'unit test');
      config.writeProjectConfig('cmc.enabled', false);
      // when
      const branchName = await vcsTasks.getBranchName(cmcNumber, false);
      // then
      return expect(branchName).toEqual('feature/utest-S-12345');
    });
  it('should get branch name with ... if accessCMC is false, cmc.enabled is true and itemNumber is a CMC story/issue/task ',
    async () => {
      // given
      config.writeUserConfig('name', 'unit test');
      config.writeProjectConfig('cmc.enabled', true);
      // when
      const branchName = await vcsTasks.getBranchName(cmcNumber, false);
      // then
      return expect(branchName).toEqual('feature/utest-S-12345...');
    });
  it('should get branch name without ... if accessCMC is false, cmc.enabled is false and itemNumber is a CMC story/issue/task ',
    async () => {
      // given
      config.writeUserConfig('name', 'unit test');
      config.writeProjectConfig('cmc.enabled', false);
      // when
      const branchName = await vcsTasks.getBranchName(cmcNumber, false);
      // then
      return expect(branchName).toEqual('feature/utest-S-12345');
    });
  it('should get branch name without ... if accessCMC is false, cmc.enabled is true and itemNumber is not a CMC story/issue/task ',
    async () => {
      // given
      config.writeUserConfig('name', 'unit test');
      config.writeProjectConfig('cmc.enabled', false);
      // when
      const branchName = await vcsTasks.getBranchName('A-12345', false);
      // then
      return expect(branchName).toEqual('feature/utest-A-12345');
    });
});
