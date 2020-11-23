const timeoutPromise = require('../timeout_promise');

describe('Timeout for functions WITHOUT argument', () => {
  it('should timeout for function without arguments', () => {
    // given
    const customFunction = () => {
      return new Promise((resolve, reject) => {
        // do not resolve or reject promise and allow it to timeout
      });
    };
    const customPromise = customFunction();

    // when
    return expect(timeoutPromise(50, customPromise)).rejects.toEqual('TIMEDOUT');
  });

  it('should NOT timeout for function without arguments', () => {
    // given
    const customFunction = () => {
      return new Promise((resolve, reject) => {
        resolve('resolve');
      });
    };
    const customPromise = customFunction();

    // when
    return expect(timeoutPromise(50, customPromise)).resolves.toBeDefined();
  });
});

describe('Timeout for functions WITH argument', () => {
  it('should timeout for function with arguments', () => {
    // given
    const customFunction = (resolveValue) => {
      return new Promise((resolve, reject) => {
        // do not resolve or reject promise and allow it to timeout
      });
    };
    const customPromise = customFunction('test');

    // when
    return expect(timeoutPromise(50, customPromise)).rejects.toEqual('TIMEDOUT');
  });

  it('should NOT timeout for function with arguments', () => {
    // given
    const customFunction = (resolveValue) => {
      return new Promise((resolve, reject) => {
        resolve(resolveValue);
      });
    };
    const customPromise = customFunction('test');

    // when
    return expect(timeoutPromise(50, customPromise)).resolves.toBeDefined();
  });
});
