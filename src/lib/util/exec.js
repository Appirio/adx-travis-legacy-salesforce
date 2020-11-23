const execMethodInDir = (dir, method) => (...args) => {
  const originalDir = process.cwd();
  process.chdir(dir);
  const results = method(...args);
  if (results !== null && results !== undefined && typeof results.then === 'function') {
    results
      .then(() => {
        process.chdir(originalDir);
      })
      .catch(() => {
        process.chdir(originalDir);
      });
  } else {
    process.chdir(originalDir);
  }
  return results;
};

module.exports = { execMethodInDir };
