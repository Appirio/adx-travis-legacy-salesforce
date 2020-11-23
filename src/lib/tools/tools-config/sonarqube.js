const config = require('../../config/config');
const { sonarUrl } = require('../../config/appirio');

const getToken = tokenKey => () => (config.hasSecret(tokenKey) ? config.getSecret(tokenKey) : '');

const setToken = tokenKey => value => () => config.setSecret(tokenKey, value);

const configHelp = () => `
  <li>
  Enter the access token for your SonarQube in the requested field. Visit the <a href="${sonarUrl}">SonarQube Login Page</a> to create an access token. Login Using Gitlab. Enter your gitlab credentials if directed to the Gitlab login page.
  </li>
  <br>
  <li>
  When you successfully login to SonarQube, you may go to 'My Account' from the top right menu.
  </li>
  <br>
  <li>
  Select the Security tab
  </li>
  <br>
  <li>
  Create your token and paste it inside the requested field.
  </li>
`;

module.exports = {
  sonarqube: () => ({
    id: 'sonarqube',
    name: 'SonarQube',
    toolCategory: 'lintingTestingAnalysisTools',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
    platform: {
      dependencies: [],
      configuration: {
        configType: 'command',
        localOnly: true,
        components: [{
          item: 'token',
          label: 'SonarQube Access Token',
          getValue: getToken('sonarqube.access_token'),
          setValue: setToken('sonarqube.access_token'),
          fieldType: 'password',
          sortOrder: 1,
        }],
      },
      token_url: sonarUrl,
      configurationHelp: configHelp(),
    },
  }),
};
