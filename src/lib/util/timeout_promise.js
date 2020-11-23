const Promise = require('bluebird');

const promiseTimeout = (ms, promise) => {
  let id;
  // Create a promise that rejects in <ms> milliseconds
  const timeout = new Promise((resolve, reject) => {
    id = setTimeout(() => {
      clearTimeout(id);
      const e = 'TIMEDOUT';
      reject(e);
    }, ms);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([
    promise,
    timeout,
  ]).finally(() => clearTimeout(id));
};

module.exports = promiseTimeout;
