const vcs = require('../vcs/vcs');

const gitBranch = {
  command: 'git:branch',
  desc: 'Creates a new branch and checks it out.',
  commandType: 'project',
  projectType: 'common',
  builder: yargs => yargs.options({
    n: {
      alias: 'name',
      describe: 'CMC Story/Issue/Task Number, or description if CMC disabled',
      group: 'git:branch',
      demandOption: true,
      requiresArg: true,
    },
  }),
};

const gitEol = {
  command: 'git:eol',
  desc: 'Changes files in the current directory and its subdirectories to the correct line ending (LF/CRLF) for this operating system.',
  commandType: 'project',
  projectType: 'common',
  builder: yargs => yargs.options({
    c: {
      alias: 'character',
      describe: 'The desired line ending for your files: LF (Mac/Unix) or CRLF (Windows)',
      group: 'git:eol',
      demandOption: false,
      requiresArg: true,
    },
  }),
};

const notifyDeploy = {
  command: 'notify:deploy',
  desc: false,
  commandType: 'project',
  projectType: 'common',
  builder: yargs => yargs.options({
    d: {
      alias: 'destination',
      describe: 'Destination Org',
      group: 'notify:deploy',
      demandOption: true,
      requiresArg: true,
    },
    e: {
      alias: 'error',
      describe: 'Mark this notification message as an error',
      group: 'notify:deploy',
    },
  }),
};

const notifyRollbar = {
  command: 'notify:rollbar',
  desc: false,
  commandType: 'project',
  projectType: 'common',
  builder: yargs => yargs.options({
    m: {
      alias: 'message',
      describe: 'Notification message for Rollbar',
      group: 'notify:rollbar',
      demandOption: true,
      requiresArg: true,
    },
    l: {
      alias: 'level',
      describe: 'Message level, such as error or info',
      group: 'notify:rollbar',
      default: 'error',
      choices: ['error', 'info'],
    },
  }),
};

const sonarConfig = {
  command: 'sonar:config',
  // Hide the command from users, i.e. do not display in the help content
  desc: false,
  commandType: 'project',
  projectType: 'common',
  builder: yargs => yargs.options({
    flags: {
      array: true,
      describe: 'Pass properties to write in sonar.properties',
      group: 'sonar:config',
      type: 'array',
    },
  }),
};

const initProject = {
  command: 'init',
  desc: 'Initialize a new Appirio DX project.',
  commandType: 'non-project',
  builder: yargs => yargs.options({
    l: {
      alias: 'showLegacy',
      describe: 'Show Legacy Salesforce Development Model',
      type: 'boolean',
      default: false,
      hidden: true,
    },
    b: {
      alias: 'templateBranch',
      describe: 'Template branch to clone',
      hidden: true,
    },
    p: {
      alias: 'templatePath',
      describe: 'Template path to clone',
      hidden: true,
    },
  }),
};

const demoSetup = {
  command: 'demo',
  desc: false,
  commandType: 'non-project',
  builder: yargs => yargs.options({
    b: {
      alias: 'templateBranch',
      describe: 'Template Branch to clone',
      hidden: true,
    },
    p: {
      alias: 'templatePath',
      describe: 'Template Path to clone',
      hidden: true,
    },
  }),
};

const ciSecret = {
  command: 'ci:secret',
  desc: 'Writes one or more secret key/variable for a project to a continuous integration server.',
  commandType: 'project',
  projectType: 'common',
  builder: yargs => yargs.options({
    f: {
      alias: 'file',
      describe: 'Path to the properties file containg name/value pairs (Used to write multiple variables at once)',
      group: 'ci:secret',
    },
    k: {
      alias: 'key',
      describe: 'Secret key/variable name (Used to write a single variable at a time)',
      group: 'ci:secret',
    },
    b: {
      alias: 'body',
      describe: 'Secret key/variable value (Used to write a single variable at a time)',
      group: 'ci:secret',
    },
  }).check((args) => {
    if (!args.f && (!args.k || !args.b)) {
      const err = 'Must specify either a file (-f,--file) or key (-k,--key) and value (-b,--body)';
      throw err;
    }
    return true;
  }),
};

const envAdd = {
  command: 'env:add',
  desc: 'Adds a property and it\'s value to the .env file.',
  commandType: 'project',
  projectType: 'common',
  builder: yargs => yargs.options({
    k: {
      alias: 'key',
      describe: 'Property name',
      group: 'env:add',
      demandOption: true,
      requiresArg: true,
    },
    b: {
      alias: 'body',
      describe: 'Property value',
      group: 'env:add',
      demandOption: true,
      requiresArg: true,
    },
  }),
};

const sslCert = {
  command: 'ssl:cert',
  desc: 'Creates a SSL certificate along with private and public keys.',
  commandType: 'all',
  builder: yargs => yargs.options({
    d: {
      alias: 'destination',
      describe: 'Destination path where the files will be written',
      group: 'ssl:cert',
      requiresArg: true,
    },
  }),
};

const projectAdd = {
  command: 'project:add',
  desc: 'Adds current project to your list of projects',
  commandType: 'project',
  projectType: 'common',
  builder: yargs => yargs.options({
    n: {
      alias: 'name',
      describe: 'Name of the project',
      group: 'project:add',
      demandOption: true,
      requiresArg: true,
    },
    d: {
      alias: 'description',
      describe: 'Description of the project',
      group: 'project:add',
    },
  }).example('adx project:add -n "My Project"',
    'Adds a project named "My Project"',
  ).example('adx project:add -n "My Project" -d "My first Appirio DX project."',
    'Adds a project named "My Project" with description as "My first Appirio DX project."'),
};

const cmdArray = [
  notifyDeploy,
  notifyRollbar,
  sonarConfig,
  initProject,
  demoSetup,
  ciSecret,
  envAdd,
  sslCert,
  projectAdd,
];

if (vcs.type === 'git') {
  cmdArray.push(gitBranch, gitEol);
}

module.exports = cmdArray;
