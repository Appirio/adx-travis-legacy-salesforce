jest.mock('fs');
jest.mock('os');
jest.mock('shelljs');
jest.mock('sudo-prompt');
jest.mock('rollbar');

let os;
let shell;

let proxy;

const INSTALLED_TOOL_VERSION = {
  code: 0,
  stdout: '10.11.1',
  stderr: '',
};
const UNINSTALLED_TOOL_VERSION = {
  code: 0,
  stdout: 'No internal or external command',
  stderr: '',
};
const PROXY_SET_REMOVE = {
  code: 0,
  stdout: '',
  stderr: '',
};

beforeEach(() => {
  jest.resetModules();
  os = require('os');
  shell = require('shelljs');
  os.homedir.mockReturnValue('fakeHomeDir');
});

describe('Check if proxies are successfully set', () => {
  describe('Check if proxies are successfully set for Darwin', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('darwin');
      proxy = require('../proxy');
    });

    it('should successfully set all proxies', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        password: 'fakePassword',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully set all proxies without username and password when not specified', () => {
      // given
      const proxyValues = {
        endpoint: 'http://jdc-proxy.appirio.com',
        port: '8080',
      };
      shell.__setCommandOutputs([INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully set all proxies without password when not specified', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully set all proxies even if node is not installed', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        password: 'fakePassword',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully set all proxies even if yarn is not installed', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        password: 'fakePassword',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully set all proxies even if git is not installed', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        password: 'fakePassword',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });
  });

  describe('Check if proxies are successfully set for Windows', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('win32');
      proxy = require('../proxy');
    });

    it('should successfully set all proxies', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        password: 'fakePassword',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully set all proxies even if node is not installed', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        password: 'fakePassword',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully set all proxies even if yarn is not installed', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        password: 'fakePassword',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully set all proxies even if git is not installed', () => {
      // given
      const proxyValues = {
        downLevelLogonName: 'appirio\\user',
        endpoint: 'http://jdc-proxy.appirio.com',
        password: 'fakePassword',
        port: '8080',
        userPrincipalName: 'user@appirio.com',
      };
      shell.__setCommandOutputs([PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.setProxies(proxyValues))
        // then
        .resolves.toBeUndefined();
    });
  });
});

describe('Check if proxies are successfully removed', () => {
  describe('Check if proxies are successfully removed for Darwin', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('darwin');
      proxy = require('../proxy');
    });

    it('should successfully remove all proxies', () => {
      // given
      shell.__setCommandOutputs([INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.removeProxies())
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully remove all proxies even if node is not installed', () => {
      // given
      shell.__setCommandOutputs([UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.removeProxies())
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully remove all proxies even if yarn is not installed', () => {
      // given
      shell.__setCommandOutputs([INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.removeProxies())
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully remove all proxies even if git is not installed', () => {
      // given
      shell.__setCommandOutputs([INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.removeProxies())
        // then
        .resolves.toBeUndefined();
    });
  });

  describe('Check if proxies are successfully removed for Windows', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('win32');
      proxy = require('../proxy');
    });

    it('should successfully remove all proxies', () => {
      // given
      shell.__setCommandOutputs([PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.removeProxies())
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully remove all proxies even if node is not installed', () => {
      // given
      shell.__setCommandOutputs([PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.removeProxies())
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully remove all proxies even if yarn is not installed', () => {
      // given
      shell.__setCommandOutputs([PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.removeProxies())
        // then
        .resolves.toBeUndefined();
    });

    it('should successfully remove all proxies even if git is not installed', () => {
      // given
      shell.__setCommandOutputs([PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        INSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
        UNINSTALLED_TOOL_VERSION,
        PROXY_SET_REMOVE,
        PROXY_SET_REMOVE,
      ]);

      // when
      return expect(proxy.removeProxies())
        // then
        .resolves.toBeUndefined();
    });
  });
});
