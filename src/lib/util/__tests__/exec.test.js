const exec = require('../exec');

describe('execMethodInDir', () => {
  it('should change dir to the passed dir and change it back', () => {
    // given
    const originalDir = process.cwd();
    process.chdir = jest.fn();

    // when
    exec.execMethodInDir('testDir', () => console.log('test method'))();

    // then
    expect(process.chdir).toBeCalledWith('testDir');
    expect(process.chdir).toBeCalledWith(originalDir);
  });

  it('should wait for the promise to resolve and then and then change it back', () => {
    // given
    const originalDir = process.cwd();
    process.chdir = jest.fn();

    // when
    exec.execMethodInDir('testDir', () => new Promise(resolve => resolve('test method')))()
      // then
      .then(() => expect(process.chdir).toBeCalledWith(originalDir));
    expect(process.chdir).toBeCalledWith('testDir');
    expect(process.chdir).not.toBeCalledWith(originalDir);
  });
});
