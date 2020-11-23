const config = require('../../config/config');
const appirio = require('../../config/appirio');

const tokenUrl = `${appirio.gitlabURL}/profile/personal_access_tokens`;

const getToken = tokenKey => () => (config.hasSecret(tokenKey) ? config.getSecret(tokenKey) : '');

const setToken = tokenKey => value => () => config.setSecret(tokenKey, value);

const getSimpleUserConfig = configKey => () => (config.hasUserConfig(configKey) ? config.readUserConfig(configKey) : '');

const setSimpleUserConfig = configKey => value => () => config.writeUserConfig(configKey, value);

const configHelp = () => `
  <li>
  Enter your Gitlab Username and Personal Access Token in the requested fields. You can get your username by clicking the dropdown settings menu in the upper-right corner of GitLab.
  </li>
  <br>
  <li>
  Visit the <a href="${tokenUrl}">Personal Access Token page</a> and create a new token.
  </li>
  <br>
  <li>
  As soon as you click on 'Create personal access token', you'll be displayed with your created personal token which will only be available one time for you to copy. Just copy that token and place inside the requested field.
  </li>
`;

module.exports = {
  gitlab: () => ({
    id: 'gitlab',
    name: 'Gitlab',
    toolCategory: 'ciCdTools',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
    platform: {
      dependencies: [],
      configuration: {
        configType: 'command',
        localOnly: true,
        components: [{
          item: 'username',
          label: 'Gitlab Username',
          getValue: getSimpleUserConfig('gitlab.username'),
          setValue: setSimpleUserConfig('gitlab.username'),
          fieldType: 'text',
          sortOrder: 1,
        }, {
          item: 'token',
          label: 'Gitlab Access Token',
          getValue: getToken('gitlab.personal_token'),
          setValue: setToken('gitlab.personal_token'),
          fieldType: 'password',
          sortOrder: 2,
        }],
      },
      token_url: tokenUrl,
      configurationHelp: configHelp(),
    },
  }),
};
