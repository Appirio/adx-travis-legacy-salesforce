jest.mock('inquirer');
jest.mock('child_process');

let inquirer;
let childProcess;
let demo;

let expectedNumberOfQuestions = 0;

const MATCH_FILTER_VALUE = 'https://gitlab.com/Appirio/appirio-dx/templates/legacy-salesforce.git';
let MATCH_VALIDATION_VALUE;

beforeEach(() => {
  jest.resetModules();
  /* eslint-disable global-require */
  inquirer = require('inquirer');
  childProcess = require('child_process');
  demo = require('../demo');

  // mock return value of spawnSync method
  childProcess.spawnSync.mockReturnValue(true);

  inquirer.__resetValues();
});

describe('Create Demo Project', () => {
  it('test', () => {
    // remove when writing correct unit tests
    expect(true).toBeTruthy();
  });
  //   it('should create demo project when gitOriginUrl is NOT specified and does not give its value when prompted a question', () => {
  //     // given
  //     expectedNumberOfQuestions = 2;
  //     inquirer.__setValidateValue('');
  //     MATCH_VALIDATION_VALUE = 'You must provide the remote URL';

  //     // when
  //     expect(() => {
  //       demo.askQuestions();
  //     })
  //       // then
  //       .not.toThrow();
  //     expect(inquirer.__getNumberOfQuestions()).toBe(expectedNumberOfQuestions);
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).toEqual(MATCH_VALIDATION_VALUE);
  //   });

  //   it('should create demo project when gitOriginUrl is specified', () => {
  //     // given
  //     expectedNumberOfQuestions = 1;
  //     const GITLAB_URL = 'testURL';

  //     // when
  //     expect(() => {
  //       demo.askQuestions(GITLAB_URL);
  //     })
  //       // then
  //       .not.toThrow();
  //     expect(inquirer.__getNumberOfQuestions()).toBe(expectedNumberOfQuestions);
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).not.toBe(true);
  //   });

  //   it('should create demo project when gitOriginUrl is NOT specified', () => {
  //     // given
  //     expectedNumberOfQuestions = 2;

  //     // when
  //     expect(() => {
  //       demo.askQuestions();
  //     })
  //       // then
  //       .not.toThrow();
  //     expect(inquirer.__getNumberOfQuestions()).toBe(expectedNumberOfQuestions);
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).toBe(true);
  //   });

  //   it('should throw error if spawnSync runs into some error', () => {
  //     // given
  //     childProcess.spawnSync.mockImplementation(() => {
  //       throw 'Cannot run command';
  //     });

  //     // when
  //     expect(demo.askQuestions())
  //       // then
  //       .rejects.toBe('Cannot run command');
  //     expect(inquirer.__getFilterResult().url).toEqual(MATCH_FILTER_VALUE);
  //     expect(inquirer.__getValidateResult()).toBe(true);
  //   });

  //   it('should throw error if inquirer runs into some error', () => {
  //     // given
  //     inquirer.prompt = jest.fn().mockRejectedValue('Inquirer failed');

  //     // when
  //     expect(demo.askQuestions())
  //       // then
  //       .rejects.toBe('Inquirer failed');
  //   });
});
