const fs = require('fs');
const os = require('os');
const sortObject = require('deep-sort-object');
const beautify = require('js-beautify').js_beautify;

const throwError = (errorMsg) => {
  throw (new Error(errorMsg));
};

const convertObjectToString = (inputObj) => {
  const obj = inputObj;
  return beautify(JSON.stringify(sortObject(obj)), {
    indent_size: 2,
    eol: os.EOL,
    end_with_newline: true,
  });
};

const set = (inputObj, key, val) => {
  const obj = inputObj;
  if (typeof key !== 'undefined') {
    const arrKey = key.split('.');
    // In case the provided key is a multi-level key, check for existence of complete key hierarchy before setting the final value
    if (arrKey.length > 1) {
      let currObj = obj;
      // Go through the complete key hierarchy except the last key
      for (let i = 0; i < arrKey.length - 1; i += 1) {
        const currKey = arrKey[i];
        if (!currObj.hasOwnProperty(currKey)) {
          // When the current key doesn't exist, create it and set it to an empty object
          currObj[currKey] = {};
        } else if (typeof currObj[currKey] !== 'object') {
          // Workaround for inconsistent return issue (Sonar Lint), as it expects a return and is not happy with throw.
          const err = `Found key "${currKey}" to be of type "${typeof currObj[currKey]}" when expecting it to be of type "object"!`;
          return throwError(err);
        }
        // Set the current object to point to the current key in complete key hierarchy
        currObj = currObj[currKey];
      }
      // Create/Update the actual key (last key in the provided key hierarchy)
      currObj[arrKey[arrKey.length - 1]] = val;
    } else {
      // When a single key is provided, simply set it to the new value
      obj[key] = val;
    }
  }
  // Return the updated object
  return obj;
};

const get = (inputObj, key) => {
  let currObj = inputObj;
  // Split the multi-level key into an array
  const arrKey = key.split('.');
  // Go through the complete key hierarchy
  for (let i = 0; i < arrKey.length; i += 1) {
    const currKey = arrKey[i];
    // Ensure that the current key exists in the current object
    if (currObj.hasOwnProperty(currKey)) {
      // Store the value of the current key as current object
      currObj = currObj[currKey];
      // If the current key is the last key in the hierarchy, return the value
      if (i === arrKey.length - 1) {
        return (currObj);
      }
    } else {
      break;
    }
  }
  // Workaround for inconsistent return issue (Sonar Lint), as it expects a return and is not happy with throw.
  const err = `Key "${key}" not found!`;
  return throwError(err);
};

const has = (inputObj, key) => {
  let currObj = inputObj;
  // Split the multi-level key into an array
  const arrKey = key.split('.');
  // Go through the complete key hierarchy
  for (let i = 0; i < arrKey.length; i += 1) {
    const currKey = arrKey[i];
    // Ensure that the current key exists in the current object
    if (currObj.hasOwnProperty(currKey)) {
      // Store the value of the current key as current object
      currObj = currObj[currKey];
      // If the current key is the last key in the hierarchy, return true
      if (i === arrKey.length - 1) {
        return true;
      }
    } else {
      break;
    }
  }
  // When the key is not found till the end, retun false
  return false;
};

const load = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch (e) {
    return {};
  }
};

const remove = (inputObj, key) => {
  const obj = inputObj;
  if (typeof key !== 'undefined') {
    const arrKey = key.split('.');
    // In case the provided key is a multi-level key, check for existence of complete key hierarchy before removing the key
    if (arrKey.length > 1) {
      let currObj = obj;
      // Go through the complete key hierarchy except the last key
      for (let i = 0; i < arrKey.length - 1; i += 1) {
        const currKey = arrKey[i];
        // When the current key doesn't exist or current key is not of type object, there is no need to remove any keys
        if (!currObj.hasOwnProperty(currKey) || typeof currObj[currKey] !== 'object') {
          return obj;
        }
        // Set the current object to point to the current key in complete key hierarchy
        currObj = currObj[currKey];
      }
      // Remove the actual key (last key in the provided key hierarchy), if it exists
      if (currObj.hasOwnProperty(arrKey[arrKey.length - 1])) {
        delete currObj[arrKey[arrKey.length - 1]];
      }
    } else if (obj.hasOwnProperty(key)) {
      // When a single key is provided, simply remove the key, if it exists
      delete obj[key];
    }
  }
  // Return the updated object
  return obj;
};

module.exports = {
  convertObjectToString,
  set,
  get,
  has,
  load,
  remove,
};
