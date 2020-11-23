const fs = require('fs');
const os = require('os');
const parseEnv = require('dotenv').parse;

const throwError = (errorMsg) => {
  throw (errorMsg);
};

// Method to convert the multi-line values into a quoted and single line value
const formatValue = (inputValue) => {
  let value = inputValue;
  if (!value || typeof value !== 'string') {
    value = '';
  }
  let finalValue = value;
  const test = '(\r\n|\n|\r)';
  const re = new RegExp(test, 'gm');
  const match = value.match(re);
  if (match) {
    finalValue = `"${value.replace(re, '\\n')}"`;
  }
  return finalValue;
};

const convertObjectToString = (inputObj) => {
  const obj = inputObj;
  let propertyString = '';
  // Sort the object keys, loop through them, format multi-line values and convert the object to a flat string
  Object.keys(obj).sort().forEach((key) => {
    // Each key/value pair to be added on a new line
    if (propertyString !== '') {
      propertyString += os.EOL;
    }
    // Key and the value will be separated by '=' delimeter
    const finalValue = formatValue(obj[key]);
    propertyString += `${key}=${finalValue}`;
  });
  // return the formatted string representation of the object
  return propertyString + os.EOL;
};

module.exports = {
  convertObjectToString,
  formatValue,

  set: (inputObj, key, val) => {
    const obj = inputObj;
    if (typeof key !== 'undefined') {
      // Add/update the value of the key
      obj[key] = val;
    }
    return obj;
  },

  get: (inputObj, key) => {
    const obj = inputObj;
    // If the key is present in the object, return the value for that key; else throw an error
    if (obj.hasOwnProperty(key)) {
      return obj[key];
    }
    // Workaround for inconsistent return issue (Sonar Lint), as it expects a return and is not happy with throw.
    const err = `Key "${key}" not found!`;
    throwError(err);
    return err;
  },

  has: (inputObj, key) => inputObj.hasOwnProperty(key),

  load: (filePath) => {
    try {
      return parseEnv(fs.readFileSync(filePath));
    } catch (e) {
      return {};
    }
  },

  remove: (inputObj, key) => {
    const obj = inputObj;
    if (typeof key !== 'undefined') {
      // Remove the key, if it exists
      if (obj.hasOwnProperty(key)) {
        delete obj[key];
      }
    }
    return obj;
  },
};
