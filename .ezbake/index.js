const storeSecret = (secretName) => {
  return (input, answers) => {
    answers._secrets = answers._secrets || {};
    answers._secrets[secretName] = input;
    return true;
  }
}
const appirio = {
  gitLabUrl: 'https://gitlab.appirio.com',
  sonarQubeUrl: "https://sonar.appirio.com"
};

module.exports = {
  source: {
    "**/config/*": true,
    "**/.gitlab-ci.yml": true,
    "**/.ezbake/scripts/ezbaker.js": true,
    "**/.ezbake/scripts/secrets.js": true,
    "**/sfdx-project.json": false
  },
  ingredients: [{
      type: "confirm",
      name: "usesCMC",
      message: "Will your project use CMC?",
      default: true,
      filter: response => {
        return response ? 1 : 0;
      }
    },
    {
      type: "input",
      name: "CMCProduct",
      message: "What is the exact name of your 'Product' in CMC?",
      validate: function (answer) {
        if (answer == '') {
          return 'You must provide the CMC Product name';
        }
        return true;
      },
      when: function (answers) {
        return answers.usesCMC != false;
      }
    },
    {
      type: "list",
      name: "continuousIntegrationType",
      message: "Which CI System would you like to use?",
      choices: ["GitLab CI", "None"],
      default: "GitLab CI",
      filter: response => {
        return {
          'GitLab CI': 'gitlab',
          'None': 'none'
        } [response];
      }
    },
    {
      type: "input",
      name: "continuousIntegrationURL",
      message: "What is the URL of your CI system?",
      when: answers => {
        return answers.continuousIntegrationType !== 'none';
      },
      default: appirio.gitLabUrl
    },
    {
      type: "input",
      name: "gitlab__personal_token",
      message: "You specified a GitLab CI server other than Appirio's standard CI server. What is the personal access token for this server?",
      when: answers => {
        answers.gitlab__personal_token = answers.gitlab__personal_token || '';
        return (answers.continuousIntegrationType === 'gitlab') &&
          !(RegExp(appirio.gitLabUrl).test(answers.continuousIntegrationURL));
      }
    },
    {
      type: "list",
      name: "enableSonarQube",
      message: "Enable quality scanning using SonarQube?",
      choices: ["Yes", "No"],
      filter: val => (val === "Yes")
    },
    {
      type: "input",
      name: "sonarUrl",
      message: "What's the URL of your SonarQube instance?",
      when: answers => {
        return answers.enableSonarQube;
      },
      default: appirio.sonarQubeUrl
    },
    {
      "type": "list",
      "name": "cleanUpBranches",
      "message": "Automatically clean up branches that have been merged?",
      when: answers => {
        answers.cleanUpBranches = answers.cleanUpBranches || '';
        return answers.continuousIntegrationType !== 'none';
      },
      choices: ["Yes", "No"],
      default: "Yes",
      filter: val => (val === "Yes")
    },
    {
      type: 'list',
      message: 'Which set of orgs will you be deploying to for your project?',
      name: 'orgs',
      choices: [{
          name: 'QA, SIT, UAT, Production',
          value: 'QA,SIT,UAT,PROD'
        },
        {
          name: 'SIT, UAT, Production',
          value: 'SIT,UAT,PROD'
        },
        {
          name: 'QA, UAT, Production',
          value: 'QA,UAT,PROD'
        },
        {
          name: 'UAT, Production',
          value: 'UAT,PROD'
        },
        {
          name: 'Production',
          value: 'PROD',
          checked: true
        }
      ],
      validate: function (answer) {
        if (answer.length < 1) {
          return 'You must choose at least one org.';
        }
        return true;
      }
    },
    {
      type: "list",
      name: "sourceBranchToClone",
      message: "Which branch do you want to create new feature branches from?",
      choices: (answers) => {
        let org_list = answers.orgs.split(',');
        return (org_list.length >= 3) ? [org_list[0], "master"] : ["master"];
      },
      default: (answers) => {
        let org_list = answers.orgs.split(',');
        return (org_list.length >= 3) ?
          org_list[0] :
          "master";
      },
    },
    {
      "type": "input",
      "name": "SF_ORG__QA__URL",
      "message": "What is the URL of your QA Org?",
      when: function (answers) {
        return answers.orgs.includes('QA');
      },
      validate: storeSecret('SF_ORG__QA__SERVERURL'),
      default: 'https://test.salesforce.com'
    },
    {
      "type": "input",
      "name": "SF_ORG__QA__USERNAME",
      "message": "What is the username of your QA Org?",
      when: function (answers) {
        return answers.orgs.includes('QA');
      },
      validate: storeSecret('SF_ORG__QA__USERNAME')
    },
    {
      "type": "password",
      "name": "SF_ORG__QA__PASSWORD",
      "message": "Please enter the password and security token for the QA org",
      when: function (answers) {
        return answers.orgs.includes('QA');
      },
      validate: storeSecret('SF_ORG__QA__PASSWORD')
    },
    {
      "type": "input",
      "name": "SF_ORG__UAT__URL",
      "message": "What is the URL of your UAT Org?",
      when: function (answers) {
        return answers.orgs.includes('UAT');
      },
      validate: storeSecret('SF_ORG__UAT__SERVERURL'),
      default: 'https://test.salesforce.com'
    },
    {
      "type": "input",
      "name": "SF_ORG__UAT__USERNAME",
      "message": "What is the username of your UAT Org?",
      when: function (answers) {
        return answers.orgs.includes('UAT');
      },
      validate: storeSecret('SF_ORG__UAT__USERNAME')
    },
    {
      "type": "password",
      "name": "SF_ORG__UAT__PASSWORD",
      "message": "Please enter the password and security token for the UAT org?",
      when: function (answers) {
        return answers.orgs.includes('UAT');
      },
      validate: storeSecret('SF_ORG__UAT__PASSWORD')
    },
    {
      "type": "input",
      "name": "SF_ORG__SIT__URL",
      "message": "What is the URL of your SIT Org?",
      when: function (answers) {
        return answers.orgs.includes('SIT');
      },
      validate: storeSecret('SF_ORG__SIT__SERVERURL'),
      default: 'https://test.salesforce.com'
    },
    {
      "type": "input",
      "name": "SF_ORG__SIT__USERNAME",
      "message": "What is the username of your SIT Org?",
      when: function (answers) {
        return answers.orgs.includes('SIT');
      },
      validate: storeSecret('SF_ORG__SIT__USERNAME')
    },
    {
      "type": "password",
      "name": "SF_ORG__SIT__PASSWORD",
      "message": "Please enter the password and security token for the SIT org?",
      when: function (answers) {
        return answers.orgs.includes('SIT');
      },
      validate: storeSecret('SF_ORG__SIT__PASSWORD')
    },
    {
      "type": "input",
      "name": "SF_ORG__PROD__URL",
      "message": "What is the URL of your PROD Org?",
      when: function (answers) {
        return answers.orgs.includes('PROD');
      },
      validate: storeSecret('SF_ORG__PROD__SERVERURL'),
      default: 'https://login.salesforce.com'
    },
    {
      "type": "input",
      "name": "SF_ORG__PROD__USERNAME",
      "message": "What is the username of your PROD Org?",
      when: function (answers) {
        return answers.orgs.includes('PROD');
      },
      validate: storeSecret('SF_ORG__PROD__USERNAME')
    },
    {
      "type": "password",
      "name": "SF_ORG__PROD__PASSWORD",
      "message": "Please enter the password and security token for the PROD org?",
      when: function (answers) {
        return answers.orgs.includes('PROD');
      },
      validate: storeSecret('SF_ORG__PROD__PASSWORD')
    }
  ],
  icing: [{
      description: 'Running Yarn Install so we can do some fancy stuff for you',
      cmd: ['yarn', 'install'],
      cmdOptions: {
        shell: true,
        cwd: '.ezbake/scripts'
      }
    },
    {
      description: 'Creating a CI Configuration file',
      cmd: [`<% if(continuousIntegrationType !== 'none') { return 'node' } else { return 'echo "  Not Required"' } %>`,
        `<% if(continuousIntegrationType !== 'none') { return '.ezbake/scripts/ezbaker.js' } else { return } %>`
      ],
      cmdOptions: {
        shell: true,
      }
    },
    {
      description: 'Writing secret variables to local .env file and/or to GitLab CI',
      cmd: ['node', '.ezbake/scripts/secrets.js'],
      cmdOptions: {
        shell: true,
      }
    },
    {
      description: 'Storing GitLab personal token (if applicable)',
      cmd: [`<% if(gitlab__personal_token) { return 'adx' } else { return 'echo "  Not Required"' } %>`,
        `<% if(gitlab__personal_token) { return 'env:add' } else { return } %>`,
        `<% if(gitlab__personal_token) { return '-k' } else { return } %>`,
        `<% if(gitlab__personal_token) { return 'GITLAB_TOKEN' } else { return } %>`,
        `<% if(gitlab__personal_token) { return '-b' } else { return } %>`,
        `<% if(gitlab__personal_token) {%><%= gitlab__personal_token %><%} else { return } %>`
      ],
      cmdOptions: {
        shell: true,
      }
    },
    {
      description: 'Creating SonarQube configuration files (if required)',
      cmd: [`<% if(enableSonarQube) { return 'adx' } else { return 'echo "  Not Required"' } %>`,
        `<% if(enableSonarQube) { return 'sonar:config' } else { return } %>`,
        `<% if(enableSonarQube) { return '--flags' } else { return } %>`,
        `<% if(enableSonarQube) {%>sonar.host.url=<%= sonarUrl %><%} else { return } %>`
      ],
      cmdOptions: {
        shell: true,
      }
    },
    {
      description: 'Adding project to list of AppirioDX projects',
      cmd: ['adx', 'project:add', '--name', '<%= projectName %>'],
      cmdOptions: {
        shell: true,
      }
    }
  ]
}
