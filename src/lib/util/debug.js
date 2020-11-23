module.exports = (...messages) => {
  const { lowerCase } = require('lodash');
  if (lowerCase(process.env.ADX_DEBUG_ENABLED) === 'true' || process.env.ADX_DEBUG_ENABLED === '1') {
    console.log(...messages);
  }
};
