const { initFromCLI } = require('./prepare');

const ezBakeTemplates = {
  // 'Salesforce DX': 'https://gitlab.appirio.com/appirio-dx/templates/salesforce.git',
  'Legacy Salesforce Development Model': {
    url: 'https://gitlab.com/Appirio/appirio-dx/templates/legacy-salesforce.git',
    value: 'legacy',
  },
};

const getEzbakeTemplates = (templatePath) => {
  if (templatePath) {
    ezBakeTemplates['Legacy Salesforce Development Model'].url = templatePath;
  }
  return ezBakeTemplates;
};

const executeDemo = (templatePath, templateBranch = 'demo') => initFromCLI(getEzbakeTemplates(templatePath), templateBranch, true);

module.exports = {
  executeDemo,
};
