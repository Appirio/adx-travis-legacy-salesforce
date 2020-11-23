const _ = require('lodash');
const { initFromCLI } = require('./prepare');
const { isBeta } = require('../util/misc');

const ezBakeTemplates = {
  'Org Development Model': {
    url: 'https://gitlab.com/Appirio/appirio-dx/templates/sfdx-unpackaged.git',
    value: 'org',
  },
  'Package Development Model': {
    url: 'https://gitlab.com/Appirio/appirio-dx/templates/sfdx-package.git',
    value: 'package',
  },
};

const ezBakeLegacyTemplate = {
  'Legacy Salesforce Development Model': {
    url: 'https://gitlab.com/Appirio/appirio-dx/templates/legacy-salesforce.git',
    value: 'legacy',
  },
};

const getEzbakeTemplates = (showLegacy, templatePath) => {
  let templates = ezBakeTemplates;
  if (showLegacy) {
    templates = {
      ...ezBakeLegacyTemplate,
      ...templates,
    };
  }
  if (templatePath) {
    _.each(templates, (template) => {
      const obj = template;
      obj.url = templatePath;
    });
  }

  return templates;
};

const executeInit = (showLegacy, templatePath, templateBranch = 'ezbake') => initFromCLI(getEzbakeTemplates(showLegacy, templatePath), isBeta() ? 'beta' : templateBranch);


module.exports = {
  executeInit,
};
