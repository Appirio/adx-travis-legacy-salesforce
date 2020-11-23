const config = require('../../config/config');
const appirio = require('../../config/appirio');

const tokenUrl = `${appirio.CMCBaseUrl}/oauth/start`;

const getToken = tokenKey => () => (config.hasSecret(tokenKey) ? config.getSecret(tokenKey) : '');

const setToken = tokenKey => value => () => config.setSecret(tokenKey, value);

const configHelp = () => `
  <li>
    Enter your CMC API refresh token in the requested field. Go to this page to <a href="${tokenUrl}">Get a CMC API Refresh Token</a>. You will need to log in. If you are an Appirio Employee click 'Log In' next to 'Appirio employee?' on the landing page and login using Okta. For customers and contractors use your CMC Portal Login.
  </li>
  <br>
  <li>
    After logging in, copy your refresh token and paste it inside the requested field.
  </li>
`;

module.exports = {
  cmc: () => ({
    id: 'cmc',
    name: 'CMC',
    toolCategory: 'projectManagementTools',
    validPlatforms: ['darwin', 'win32'],
    preferred: true,
    platform: {
      dependencies: [],
      configuration: {
        configType: 'command',
        localOnly: true,
        components: [{
          item: 'token',
          label: 'CMC Refresh Token',
          getValue: getToken('cmc.refresh_token'),
          setValue: setToken('cmc.refresh_token'),
          fieldType: 'password',
          sortOrder: 1,
        }],
      },
      token_url: tokenUrl,
      configurationHelp: configHelp(),
    },
  }),
};
