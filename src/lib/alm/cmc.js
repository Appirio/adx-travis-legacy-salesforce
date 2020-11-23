/* eslint no-cond-assign: ["error", "except-parens"] */
const unirest = require('unirest');
const _ = require('lodash');
const config = require('../config/config');
const appirio = require('../config/appirio');
const ci = require('../ci/ci');

const CMC_BASE_URL = appirio.CMCBaseUrl;
const ERR_NO_CMC_PRODUCT_DEFINED = 'No CMC products have been defined for this project yet.';
const ERR_NO_REFRESH_TOKEN = 'CMC refresh token is not available.';
const ERR_INVALID_REFRESH_TOKEN = 'Your CMC refresh token is invalid. Please get a new one.';
const ERR_CMC_NOT_ENABLED = 'CMC is not enabled. Check config/appirio.json.';
const cmcItems = {
  stories: [],
  issues: [],
  tasks: [],
};

const processCmcResponse = (response, resolve, reject) => {
  if (_.includes([200, 201], response.statusCode)) {
    resolve(response.body);
  } else {
    reject(response);
  }
};

let getAccessToken;

/**
 * Make a request to the CMC API
 * @param {String} httpAction - Any valid HTTP action such as GET or POST
 * @param {String} path - The path within the CMC API (ex: /stories)
 * @param {Object} headers - any HTTP headers you want to add
 * @param {Object} data - any data to send with the request
 * @returns {Promise} the status of the API call
 */
const cmcAPI = (httpAction, path, headers, data) => {
  let accessToken;
  try {
    accessToken = config.getSecret('cmc.access_token');
    if (accessToken === undefined) {
      accessToken = 'invalid';
    }
  } catch (e) {
    accessToken = 'invalid';
  }
  _.defaults(headers, {
    Accept: 'application/json',
    AuthorizationToken: accessToken,
  });
  const action = _.lowerCase(httpAction);
  if (/(get|put|post|delete|head|patch)/.test(action)) {
    return new Promise((resolve, reject) => {
      const endpoint = CMC_BASE_URL + path;
      const request = unirest[action](endpoint)
        .headers(headers)
        .send(data);
      request.end((response) => {
        if (response.statusCode === 403) {
          getAccessToken().then((newAccessToken) => {
            const updatedHeaders = headers;
            updatedHeaders.AuthorizationToken = newAccessToken;
            request.headers(updatedHeaders).end(newResponse => processCmcResponse(newResponse, resolve, reject));
          }).catch((err) => {
            reject(err);
          });
        } else {
          processCmcResponse(response, resolve, reject);
        }
      });
    });
  }
  const err = `The action ${action} is not valid HTTP syntax.`;
  throw err;
};

const getCMC = (path, headers, data) => {
  let fullPath;
  if (typeof data === 'string') {
    fullPath = `${path}?${encodeURIComponent(data)}`;
  } else if (typeof data === 'object') {
    const parameters = Object.entries(data).map(part => `${part[0]}=${encodeURIComponent(part[1])}`).join('&');
    fullPath = `${path}?${parameters}`;
  } else {
    fullPath = path;
  }

  return cmcAPI('get', fullPath, headers);
};

const queryCMC = (path, data) => {
  let query = data;
  if (typeof data === 'string') {
    query = {
      query: data,
    };
  }
  const headers = {};
  return getCMC(path, headers, query);
};

const postCMC = (path, headers, data) => {
  _.defaults(headers, {
    'Content-Type': 'application/json',
  });
  return cmcAPI('post', path, headers, data);
};

const getRefreshTokenFromJSON = () => {
  if (ci.env.isCi) {
    if (!process.env.CMC_REFRESH_TOKEN) {
      throw (ERR_NO_REFRESH_TOKEN);
    } else {
      return process.env.CMC_REFRESH_TOKEN;
    }
  } else {
    try {
      const refreshToken = config.getSecret('cmc.refresh_token');
      if (refreshToken === undefined) {
        throw (ERR_NO_REFRESH_TOKEN);
      }
      return refreshToken;
    } catch (e) {
      throw (ERR_NO_REFRESH_TOKEN);
    }
  }
};

getAccessToken = () => new Promise((resolve, reject) => postCMC('/oauth/token', {}, {
  // try with old token
  refreshToken: getRefreshTokenFromJSON(),
})
  .then((responseBody) => {
    config.setSecret('cmc.access_token', responseBody.accessToken);
    resolve(responseBody.accessToken);
  })
  .catch((response) => {
    let err;
    if (response.statusCode === 500) {
      err = ERR_INVALID_REFRESH_TOKEN;
    } else if (response.statusCode) {
      err = `Response code from the server: ${response.statusCode}`;
    } else {
      err = response;
    }
    reject(err);
  }));

const getProductDetailsFromJSON = () => {
  const listOfProducts = config.readProjectConfig('cmc.products');
  if (listOfProducts.length > 0) {
    return listOfProducts;
  }
  throw ERR_NO_CMC_PRODUCT_DEFINED;
};

const filterByProduct = (productArray) => {
  const productList = productArray.map(x => `'${x}'`).join(',');
  return `Product__c IN (${productList})`;
};

const extractCMCRecords = recordType => (responseBody) => {
  if (responseBody.content.records.length > 0) {
    return responseBody.content.records;
  }
  return `No ${recordType} found for the given products`;
};

const checkForValidResponse = (responseBody) => {
  if (responseBody && responseBody.hasOwnProperty('content') && responseBody.content.hasOwnProperty('records') && responseBody.content.records.length > 0) {
    return responseBody.content.records;
  }
  return 'No records found';
};

const fetchStoryDetailsFromName = storyNumber => queryCMC('/stories', `storyNumber = '${storyNumber}'`)
  .then(responseBody => checkForValidResponse(responseBody));

const fetchIssueDetailsFromName = issueNumber => queryCMC('/issues', `Name = '${issueNumber}'`)
  .then(responseBody => checkForValidResponse(responseBody));

const fetchTaskDetailsFromName = Name => queryCMC('/tasks', `Name = '${Name}'`)
  .then(responseBody => checkForValidResponse(responseBody));

const fetchSprintDetailsFromTitle = sprintName => queryCMC('/sprints', `title = '${sprintName}'`)
  .then(responseBody => checkForValidResponse(responseBody));

const fetchItemDetailsFromName = (cmcNumber) => {
  if (/^S-/.test(cmcNumber)) {
    return fetchStoryDetailsFromName(cmcNumber);
  }
  if (/^I-/.test(cmcNumber)) {
    return fetchIssueDetailsFromName(cmcNumber);
  }
  if (/^T-/.test(cmcNumber)) {
    return fetchTaskDetailsFromName(cmcNumber);
  }
  const err = 'Invalid CMC Story/Issue/Task';
  return Promise.reject(err);
};

const extractCMCNumbersFromText = (text) => {
  const cmcPattern = /\b[STI]-[0-9]{3,9}\b/g;
  let cmcMatches;
  while ((cmcMatches = cmcPattern.exec(text)) !== null) {
    const cmcNumber = cmcMatches[0];
    if (/^S-/.test(cmcNumber) && !_.includes(cmcItems.stories, cmcNumber)) {
      cmcItems.stories.push(cmcNumber);
    } else if (/^I-/.test(cmcNumber) && !_.includes(cmcItems.issues, cmcNumber)) {
      cmcItems.issues.push(cmcNumber);
    } else if (/^T-/.test(cmcNumber) && !_.includes(cmcItems.tasks, cmcNumber)) {
      cmcItems.tasks.push(cmcNumber);
    }
  }
  return cmcItems;
};

const retrievePackageXML = payload => postCMC('/manifests/package', {}, payload)
  .then(responseBody => responseBody)
  .catch((err) => {
    let error;
    if (typeof err === 'object') {
      error = JSON.parse(JSON.stringify(err)).body;
    } else {
      error = err;
    }
    return Promise.reject(error);
  });

const retrieveDestructivePackageXML = payload => postCMC('/manifests/destructive-changes', {}, payload)
  .then(responseBody => responseBody)
  .catch((err) => {
    let error;
    if (typeof err === 'object') {
      error = JSON.parse(JSON.stringify(err)).body;
    } else {
      error = err;
    }
    return Promise.reject(error);
  });

module.exports = {
  ERR_CMC_NOT_ENABLED,
  ERR_NO_CMC_PRODUCT_DEFINED,
  ERR_NO_REFRESH_TOKEN,
  ERR_INVALID_REFRESH_TOKEN,
  checkForValidResponse,
  extractCMCNumbersFromText,
  getAccessToken,
  getProductDetailsFromJSON,
  getRefreshTokenFromJSON,
  fetchStoryDetailsFromName,
  fetchIssueDetailsFromName,
  fetchTaskDetailsFromName,
  fetchSprintDetailsFromTitle,
  fetchItemDetailsFromName,
  queryCMC,
  retrievePackageXML,
  retrieveDestructivePackageXML,

  get enabled() {
    return (config.hasProjectConfig('cmc.enabled')) ? config.readProjectConfig('cmc.enabled') : false;
  },

  setProjectBaseDir: config.setProjectBaseDir,
  purgeConfig: config.purge,

  fetchStoriesFromName: (storyArray) => {
    const storyList = storyArray.map(x => `'${x}'`).join(',');
    return queryCMC('/stories', `storyNumber IN (${storyList})`)
      .then(responseBody => responseBody.content.records);
  },

  fetchIssuesFromName: (issueArray) => {
    const issueList = issueArray.map(x => `'${x}'`).join(',');
    return queryCMC('/issues', `Name IN (${issueList})`)
      .then(responseBody => responseBody.content.records);
  },

  fetchTasksFromName: (taskArray) => {
    const taskList = taskArray.map(x => `'${x}'`).join(',');
    return queryCMC('/tasks', `Name IN (${taskList})`)
      .then(responseBody => responseBody.content.records);
  },

  fetchProductStories: () => {
    const thisProduct = getProductDetailsFromJSON();
    return queryCMC('/stories', filterByProduct(thisProduct))
      .then(extractCMCRecords('stories'));
  },

  fetchProductTasks: () => {
    const thisProduct = getProductDetailsFromJSON();
    return queryCMC('/tasks', filterByProduct(thisProduct))
      .then(extractCMCRecords('tasks'));
  },

  fetchProductIssues: () => {
    const thisProduct = getProductDetailsFromJSON();
    return queryCMC('/issues', filterByProduct(thisProduct))
      .then(extractCMCRecords('issues'));
  },

  updateCMCRefreshToken: async refreshToken => config.setSecret('cmc.refresh_token', refreshToken),

  setProductDetailsInJson: products => config.writeProjectConfig('cmc.products', products),

  setCacheProductData: (listOfCachedObjects) => {
    const CacheObject = _.chain(listOfCachedObjects)
      .keyBy('label')
      .mapValues(v => v)
      .value();
    return config.writeProjectCache('cmc', CacheObject);
  },

  getCachedProductData: () => {
    const listOfCachedObjects = config.readProjectCache('cmc');
    return _.values(listOfCachedObjects);
  },

  createDeployment: data => postCMC('/deployments', {}, data),

  createDeploymentItem: data => postCMC('/deployment-items', {}, data),

  createManifestItem: data => postCMC('/manifest-items', {}, data),

};
