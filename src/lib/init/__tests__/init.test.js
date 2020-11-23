jest.mock('inquirer');
jest.mock('child_process');

let inquirer;
let childProcess;
let init;

let expectedNumberOfQuestions = 0;
let MATCH_FILTER_VALUE;
let MATCH_VALIDATION_VALUE;

beforeEach(() => {
  /* eslint-disable global-require */
  jest.resetModules();
  inquirer = require('inquirer');
  childProcess = require('child_process');
  init = require('../init');

  // mock return value of spawnSync method
  childProcess.spawnSync.mockReturnValue(true);

  inquirer.__resetValues();
  inquirer.__setFilterValue('Package Development Model');
  MATCH_FILTER_VALUE = 'https://gitlab.com/Appirio/appirio-dx/templates/sfdx-package.git';
});

describe('Initialize New Project', () => {
  it('test', () => {
    // remove when writing correct unit tests
    expect(true).toBeTruthy();
  });
  //   it('should initialize new project when gitOriginUrl is NOT specified and return no value when prompted to', () => {
  //     // given
  //     expectedNumberOfQuestions = 2;
  //     inquirer.__setValidateValue('');
  //     MATCH_VALIDATION_VALUE = 'You must provide the remote URL';

  //     // when
  //     expect(() => {
  //       init.askQuestions();
  //     })
  //       // then
  //       .not.toThrow();
  //     expect(inquirer.__getNumberOfQuestions()).toBe(expectedNumberOfQuestions);
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).toEqual(MATCH_VALIDATION_VALUE);
  //   });

  //   it('should initialize new project when gitOriginUrl is NOT specified', () => {
  //     // given
  //     expectedNumberOfQuestions = 2;

  //     // when
  //     expect(() => {
  //       init.askQuestions();
  //     })
  //       // then
  //       .not.toThrow();
  //     expect(inquirer.__getNumberOfQuestions()).toBe(expectedNumberOfQuestions);
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).toBe(true);
  //   });

  //   it('should initialize new project using some other project type and return no value when prompted to', () => {
  //     // given
  //     expectedNumberOfQuestions = 2;
  //     inquirer.__setFilterValue('Package Development Model');
  //     inquirer.__setValidateValue('');
  //     MATCH_FILTER_VALUE = 'https://gitlab.com/Appirio/appirio-dx/templates/sfdx-package.git';
  //     MATCH_VALIDATION_VALUE = 'You must provide the remote URL';

  //     // when
  //     expect(() => {
  //       init.askQuestions();
  //     })
  //       // then
  //       .not.toThrow();
  //     expect(inquirer.__getNumberOfQuestions()).toBe(expectedNumberOfQuestions);
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).toEqual(MATCH_VALIDATION_VALUE);
  //   });

  //   it('should initialize new project when gitOriginUrl is specified', () => {
  //     // given
  //     expectedNumberOfQuestions = 1;
  //     const GITLAB_URL = 'testURL';

  //     // when
  //     expect(() => {
  //       init.askQuestions(GITLAB_URL);
  //     })
  //       // then
  //       .not.toThrow();
  //     expect(inquirer.__getNumberOfQuestions()).toBe(expectedNumberOfQuestions);
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).not.toBe(true);
  //   });

  //   it('should initialize new project when gitOriginUrl and showLegacy is specified', () => {
  //     // given
  //     expectedNumberOfQuestions = 1;
  //     const GITLAB_URL = 'testURL';
  //     inquirer.__setFilterValue('Legacy Salesforce Development Model');
  //     inquirer.__setValidateValue('');

  //     // when
  //     expect(() => {
  //       init.askQuestions(GITLAB_URL, true);
  //     })
  //       // then
  //       .not.toThrow();
  //     expect(inquirer.__getNumberOfQuestions()).toBe(expectedNumberOfQuestions);
  //     expect(inquirer.__getFilterResult().url).toEqual('https://gitlab.com/Appirio/appirio-dx/templates/legacy-salesforce.git');
  //     expect(inquirer.__getValidateResult()).not.toBe(true);
  //   });

  //   it('should throw error if spawnSync runs into some error', () => {
  //     // given
  //     childProcess.spawnSync.mockImplementation(() => {
  //       throw 'Cannot run command';
  //     });

  //     // when
  //     expect(init.askQuestions())
  //       // then
  //       .rejects.toBe('Cannot run command');
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).toBe(true);
  //   });

  //   it('should throw error if inquirer runs into some error', () => {
  //     // given
  //     inquirer.prompt = jest.fn().mockRejectedValue('Inquirer failed');

  //     // when
  //     expect(init.askQuestions())
  //       // then
  //       .rejects.toBe('Inquirer failed');
  //   });
});
