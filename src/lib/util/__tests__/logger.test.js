jest.mock('fs');

const os = require('os');
const { layoutConfig } = require('../logger');

const configData = layoutConfig();
const layoutData = {
  startTime: '2020-09-07T09:13:29.357Z',
  level: {
    levelStr: 'INFO',
  },
  os: os.platform(),
  hostname: os.hostname().toString(),
  pid: '34442',
};

const plainTextLog = 'Dummy info to log';
const coloredTextLog = '\u001b[35mDummy info to log\u001b[39m';
const arrayWithPlainTextLog = ['Dummy info to log', 'Some more'];
const arrayWithColoredTextLog = ['\u001b[35mDummy info to log\u001b[39m', 'Some more'];

describe('Logger layout configuration', () => {
  it('should return layout data for logger with plain text string in log message', () => {
    // given
    layoutData.data = plainTextLog;
    const resData = JSON.stringify({
      timestamp: layoutData.startTime,
      loglevel: layoutData.level.levelStr,
      os: layoutData.os,
      hostname: layoutData.hostname,
      pid: layoutData.pid,
      msg: plainTextLog,
    });
    // when
    const layoutOutput = configData(layoutData);
    // then
    expect(layoutOutput).toEqual(resData);
  });

  it('should strip color from layout data for logger with colored string in log message', () => {
    // given
    layoutData.data = coloredTextLog;
    const resData = JSON.stringify({
      timestamp: layoutData.startTime,
      loglevel: layoutData.level.levelStr,
      os: layoutData.os,
      hostname: layoutData.hostname,
      pid: layoutData.pid,
      msg: plainTextLog,
    });
    // when
    const layoutOutput = configData(layoutData);
    // then
    expect(layoutOutput).toEqual(resData);
  });

  it('should return layout data for logger with plain text array in log message', () => {
    // given
    layoutData.data = arrayWithPlainTextLog;
    const resData = JSON.stringify({
      timestamp: layoutData.startTime,
      loglevel: layoutData.level.levelStr,
      os: layoutData.os,
      hostname: layoutData.hostname,
      pid: layoutData.pid,
      msg: arrayWithPlainTextLog,
    });
    // when
    const layoutOutput = configData(layoutData);
    // then
    expect(layoutOutput).toEqual(resData);
  });

  it('should strip color from layout data for logger with colored text array in log message', () => {
    // given
    layoutData.data = arrayWithColoredTextLog;
    const resData = JSON.stringify({
      timestamp: layoutData.startTime,
      loglevel: layoutData.level.levelStr,
      os: layoutData.os,
      hostname: layoutData.hostname,
      pid: layoutData.pid,
      msg: arrayWithPlainTextLog,
    });
    // when
    const layoutOutput = configData(layoutData);
    // then
    expect(layoutOutput).toEqual(resData);
  });

  it('should add error if there is error in context', () => {
    // given
    layoutData.context = { error: new Error('Dummy Error') };
    // when
    const layoutOutput = JSON.parse(configData(layoutData));
    // then
    expect(layoutOutput).toHaveProperty('error');
  });

  it('should return correct source when source is defined in context', () => {
    // given
    layoutData.context = { error: new Error('Dummy Error'), version: 123, source: 'APP' };
    // when
    const layoutOutput = JSON.parse(configData(layoutData));
    // then
    expect(layoutOutput.source).toEqual('APP');
  });

  it('should add source UNKNOWN if there is no source defined in context', () => {
    // given
    layoutData.context = { error: new Error('Dummy Error'), version: 123 };
    // when
    const layoutOutput = JSON.parse(configData(layoutData));
    // then
    expect(layoutOutput.source).toEqual('UNKNOWN');
  });

  it('should return correct context when it is defined in logger context', () => {
    // given
    layoutData.context = { context: 'SOME_COMMAND', source: 'APP' };
    // when
    const layoutOutput = JSON.parse(configData(layoutData));
    // then
    expect(layoutOutput.context).toEqual('SOME_COMMAND');
  });

  it('should return undefined context when it is not defined in logger context', () => {
    // given
    layoutData.context = { source: 'APP' };
    // when
    const layoutOutput = JSON.parse(configData(layoutData));
    // then
    expect(layoutOutput.context).toBeUndefined();
  });
});
