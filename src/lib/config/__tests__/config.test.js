jest.mock('fs');
jest.mock('shelljs');
const path = require('path');
const fs = require('fs');
const appirio = require('../appirio');

const TEST_KEY = 'test';
const TEST_VALUE = 'testValue';
beforeEach(() => {
  fs.__resetMockFiles();
});

describe('Appirio user-level config file', () => {
  it('should read and write the default user JSON config file', () => {
    // given
    const config = require('../config');
    expect(fs.existsSync(appirio.userConfigPath)).toBe(false);
    expect(config.hasUserConfig(TEST_KEY)).toBe(false);

    // when
    config.writeUserConfig(TEST_KEY, TEST_VALUE);

    // then
    config.purge();
    expect(fs.existsSync(appirio.userConfigPath)).toBe(true);
    expect(config.hasUserConfig(TEST_KEY)).toBe(true);
    expect(config.readUserConfig(TEST_KEY)).toBe(TEST_VALUE);

    config.purge();
    config.removeUserConfig(TEST_KEY);
    expect(config.hasUserConfig(TEST_KEY)).toBe(false);
  });

  it('should read and write an alternative user JSON config file', () => {
    // given
    const config = require('../config');
    const altUserConfig = 'altUserConfig.json';
    const altUserConfigPath = path.join(appirio.userConfigDir, altUserConfig);
    expect(fs.existsSync(altUserConfigPath)).toBe(false);
    expect(config.hasUserConfig(TEST_KEY, altUserConfig)).toBe(false);

    // when
    config.writeUserConfig(TEST_KEY, TEST_VALUE, altUserConfig);

    // then
    config.purge();
    expect(fs.existsSync(altUserConfigPath)).toBe(true);
    expect(config.hasUserConfig(TEST_KEY, altUserConfig)).toBe(true);
    expect(config.readUserConfig(TEST_KEY, altUserConfig)).toBe(TEST_VALUE);

    config.purge();
    config.removeUserConfig(TEST_KEY, altUserConfig);
    expect(config.hasUserConfig(TEST_KEY, altUserConfig)).toBe(false);
  });

  it('should read and write an alternative user properties file', () => {
    // given
    const config = require('../config');
    const altUserConfig = 'altUserConfig.properties';
    const altUserConfigPath = path.join(appirio.userConfigDir, altUserConfig);
    expect(fs.existsSync(altUserConfigPath)).toBe(false);
    expect(config.hasUserConfig(TEST_KEY, altUserConfig, 'properties')).toBe(false);

    // when
    config.writeUserConfig(TEST_KEY, TEST_VALUE, altUserConfig, 'properties');

    // then
    config.purge();
    expect(fs.existsSync(altUserConfigPath)).toBe(true);
    expect(config.hasUserConfig(TEST_KEY, altUserConfig, 'properties')).toBe(true);
    expect(config.readUserConfig(TEST_KEY, altUserConfig, 'properties')).toBe(TEST_VALUE);

    config.purge();
    config.removeUserConfig(TEST_KEY, altUserConfig, 'properties');
    expect(config.hasUserConfig(TEST_KEY, altUserConfig, 'properties')).toBe(false);
  });
});

describe('Appirio project-level config file', () => {
  it('should read and write the default project JSON config file', () => {
    // given
    const config = require('../config');
    expect(fs.existsSync(appirio.projectConfigPath)).toBe(false);
    expect(config.hasProjectConfig(TEST_KEY)).toBe(false);

    // when
    config.writeProjectConfig(TEST_KEY, TEST_VALUE);

    // then
    config.purge();
    expect(fs.existsSync(appirio.projectConfigPath)).toBe(true);
    expect(config.hasProjectConfig(TEST_KEY)).toBe(true);
    expect(config.readProjectConfig(TEST_KEY)).toBe(TEST_VALUE);

    config.purge();
    config.removeProjectConfig(TEST_KEY);
    expect(config.hasProjectConfig(TEST_KEY)).toBe(false);
  });

  it('should read and write an alternative project JSON config file', () => {
    // given
    const config = require('../config');
    const altProjectConfig = 'altProjectConfig.json';
    expect(fs.existsSync(altProjectConfig)).toBe(false);
    expect(config.hasProjectConfig(TEST_KEY, altProjectConfig)).toBe(false);

    // when
    config.writeProjectConfig(TEST_KEY, TEST_VALUE, altProjectConfig);

    // then
    config.purge();
    expect(fs.existsSync(altProjectConfig)).toBe(true);
    expect(config.hasProjectConfig(TEST_KEY, altProjectConfig)).toBe(true);
    expect(config.readProjectConfig(TEST_KEY, altProjectConfig)).toBe(TEST_VALUE);

    config.purge();
    config.removeProjectConfig(TEST_KEY, altProjectConfig);
    expect(config.hasProjectConfig(TEST_KEY, altProjectConfig)).toBe(false);
  });

  it('should read and write an alternative project properties file', () => {
    // given
    const config = require('../config');
    const altProjectConfig = 'altProjectConfig.properties';
    expect(fs.existsSync(altProjectConfig)).toBe(false);
    expect(config.hasProjectConfig(TEST_KEY, altProjectConfig, 'properties')).toBe(false);

    // when
    config.writeProjectConfig(TEST_KEY, TEST_VALUE, altProjectConfig, 'properties');

    // then
    config.purge();
    expect(fs.existsSync(altProjectConfig)).toBe(true);
    expect(config.hasProjectConfig(TEST_KEY, altProjectConfig, 'properties')).toBe(true);
    expect(config.readProjectConfig(TEST_KEY, altProjectConfig, 'properties')).toBe(TEST_VALUE);

    config.purge();
    config.removeProjectConfig(TEST_KEY, altProjectConfig, 'properties');
    expect(config.hasProjectConfig(TEST_KEY, altProjectConfig, 'properties')).toBe(false);
  });

  it('should allow an arbitrary projectBaseDir to be set', () => {
    // given
    const config = require('../config');
    const originalProjectDir = appirio.projectBaseDir;
    const differentProjectDir = path.join('some', 'project', 'dir');
    const differentConfigFile = path.join(differentProjectDir, appirio.projectConfigDir, appirio.projectConfigFile);
    expect(fs.existsSync(differentConfigFile)).toBe(false);

    // when
    config.setProjectBaseDir(differentProjectDir);
    config.writeProjectConfig(TEST_KEY, TEST_VALUE);

    // then
    config.purge();
    expect(fs.existsSync(appirio.projectConfigPath)).toBe(false);
    expect(fs.existsSync(differentConfigFile)).toBe(true);
    expect(config.hasProjectConfig(TEST_KEY)).toBe(true);
    expect(config.readProjectConfig(TEST_KEY)).toBe(TEST_VALUE);

    config.purge();
    config.removeProjectConfig(TEST_KEY);
    expect(config.hasProjectConfig(TEST_KEY)).toBe(false);

    // reset
    config.setProjectBaseDir(originalProjectDir);
  });
});

describe('Appirio project-level cache file', () => {
  it('should read and write the default project cache file', () => {
    // given
    const config = require('../config');
    expect(fs.existsSync(appirio.projectCachePath)).toBe(false);
    expect(config.hasProjectCache(TEST_KEY)).toBe(false);

    // when
    config.writeProjectCache(TEST_KEY, TEST_VALUE);

    // then
    config.purge();
    expect(fs.existsSync(appirio.projectCachePath)).toBe(true);
    expect(config.hasProjectCache(TEST_KEY)).toBe(true);
    expect(config.readProjectCache(TEST_KEY)).toBe(TEST_VALUE);

    config.purge();
    config.removeProjectCache(TEST_KEY);
    expect(config.hasProjectCache(TEST_KEY)).toBe(false);
  });

  it('should read and write an alternative project cache file', () => {
    // given
    const config = require('../config');
    const altProjectCache = 'altProjectCache.json';
    const altProjectCachePath = path.join(appirio.projectCacheDir, altProjectCache);
    expect(fs.existsSync(altProjectCachePath)).toBe(false);
    expect(config.hasProjectCache(TEST_KEY, altProjectCache)).toBe(false);

    // when
    config.writeProjectCache(TEST_KEY, TEST_VALUE, altProjectCache);

    // then
    config.purge();
    expect(fs.existsSync(altProjectCachePath)).toBe(true);
    expect(config.hasProjectCache(TEST_KEY, altProjectCache)).toBe(true);
    expect(config.readProjectCache(TEST_KEY, altProjectCache)).toBe(TEST_VALUE);

    config.purge();
    config.removeProjectCache(TEST_KEY, altProjectCache);
    expect(config.hasProjectCache(TEST_KEY, altProjectCache)).toBe(false);
  });
});

describe('Generic config file methods', () => {
  const configDir = path.join('some', 'random', 'dir');
  const jsonConfig = 'file.json';
  const jsonPath = path.join(configDir, jsonConfig);
  const propertyFile = 'file.properties';
  const propertyPath = path.join(configDir, propertyFile);

  describe('Storing key-value pairs', () => {
    it('should store data in a generic JSON file', () => {
      // given
      const config = require('../config');
      expect(fs.existsSync(jsonPath)).toBe(false);
      expect(config.hasConfig(TEST_KEY, jsonPath)).toBe(false);

      // when
      config.writeConfig(configDir, jsonConfig, TEST_KEY, TEST_VALUE);

      // then
      config.purge();
      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(config.hasConfig(TEST_KEY, jsonPath)).toBe(true);
      expect(config.readConfig(TEST_KEY, jsonPath)).toBe(TEST_VALUE);

      config.purge();
      config.removeConfig(TEST_KEY, jsonPath);
      expect(config.hasConfig(TEST_KEY, jsonPath)).toBe(false);
    });

    it('should store nested keys in a JSON file', () => {
      // given
      const config = require('../config');
      const deeply = {
        nested: {
          key: TEST_VALUE,
        },
      };
      const nestedKey = 'deeply.nested.key';
      expect(fs.existsSync(jsonPath)).toBe(false);
      expect(config.hasConfig(nestedKey, jsonPath)).toBe(false);

      // when
      config.writeConfig(configDir, jsonConfig, nestedKey, TEST_VALUE);

      // then
      config.purge();
      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(config.hasConfig(nestedKey, jsonPath)).toBe(true);
      expect(config.readConfig(nestedKey, jsonPath)).toBe(TEST_VALUE);
      expect(config.readConfig('deeply', jsonPath))
        .toMatchObject(deeply);

      config.purge();
      config.removeConfig(nestedKey, jsonPath);
      expect(config.hasConfig(nestedKey, jsonPath)).toBe(false);
    });

    it('should read and write from a generic Properties file', () => {
      // given
      const config = require('../config');
      expect(fs.existsSync(propertyPath)).toBe(false);
      expect(config.hasConfig(TEST_KEY, propertyPath, 'properties')).toBe(false);

      // when
      config.writeConfig(configDir, propertyFile, TEST_KEY, TEST_VALUE, 'properties');

      // then
      config.purge();
      expect(fs.existsSync(propertyPath)).toBe(true);
      expect(config.hasConfig(TEST_KEY, propertyPath, 'properties')).toBe(true);
      expect(config.readConfig(TEST_KEY, propertyPath, 'properties')).toBe(TEST_VALUE);

      config.purge();
      config.removeConfig(TEST_KEY, propertyPath, 'properties');
      expect(config.hasConfig(TEST_KEY, propertyPath, 'properties')).toBe(false);
    });
  });

  describe('Storing objects to files', () => {
    it('should read and write an object to a JSON file', () => {
      // given
      const config = require('../config');
      const configObject = {};
      configObject[TEST_KEY] = TEST_VALUE;
      const KEY2 = 'KEY2';
      configObject[KEY2] = [
        'value2',
        'value3',
      ];
      expect(fs.existsSync(jsonPath)).toBe(false);
      expect(config.hasConfig(TEST_KEY, jsonPath)).toBe(false);

      // when
      config.writeConfigFromObject(configDir, jsonConfig, configObject);

      // then
      config.purge();
      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(config.hasConfig(TEST_KEY, jsonPath)).toBe(true);
      expect(config.readConfig(TEST_KEY, jsonPath)).toBe(TEST_VALUE);
      expect(config.readConfig(KEY2, jsonPath)).toMatchObject(configObject[KEY2]);
    });

    it('should read and write key value pairs to a Properties file', () => {
      // given
      const config = require('../config');
      const configObject = {
        key1: 'val1',
        key2: 'val2',
      };
      // Simple key-value pairs work fine for Properties files
      configObject[TEST_KEY] = TEST_VALUE;

      expect(fs.existsSync(propertyPath)).toBe(false);
      expect(config.hasConfig(TEST_KEY, propertyPath, 'properties')).toBe(false);

      // when
      config.writeConfigFromObject(configDir, propertyFile, configObject, 'properties');

      // then
      config.purge();
      expect(fs.existsSync(propertyPath)).toBe(true);
      expect(config.hasConfig(TEST_KEY, propertyPath, 'properties')).toBe(true);
      expect(config.readConfig(TEST_KEY, propertyPath, 'properties')).toBe(TEST_VALUE);
    });

    it('should cache complex objects but fail to store them in Properties files', () => {
      // given
      const config = require('../config');
      const configObject = {};
      // Simple key-value pairs work fine for Properties files
      configObject[TEST_KEY] = TEST_VALUE;

      // Complex Object keys will NOT work
      const ARRAY_KEY = 'ARRAY_KEY';
      configObject[ARRAY_KEY] = [
        'entry1',
        'entry2',
      ];
      const COMPLEX_KEY = 'COMPLEX_KEY';
      configObject[COMPLEX_KEY] = {
        test: {
          sub1: 'val2',
          sub2: {
            rev1: 'val3',
          },
        },
      };

      // when
      config.writeConfigFromObject(configDir, propertyFile, configObject, 'properties');

      // then
      expect(config.readConfig(TEST_KEY, propertyPath, 'properties')).toBe(TEST_VALUE);
      // The config module caches any config we're sent
      // So complex values will match the cached values
      expect(config.readConfig(ARRAY_KEY, propertyPath, 'properties'))
        .toBe(configObject[ARRAY_KEY]);
      expect(config.readConfig(COMPLEX_KEY, propertyPath, 'properties'))
        .toBe(configObject[COMPLEX_KEY]);

      // But if we clear the cache, complex values will NOT match
      config.purge();
      expect(config.readConfig(ARRAY_KEY, propertyPath, 'properties'))
        .not.toBe(configObject[ARRAY_KEY]);
      expect(config.readConfig(COMPLEX_KEY, propertyPath, 'properties'))
        .not.toBe(configObject[COMPLEX_KEY]);
    });
  });
});

describe('Config exception handling', () => {
  const propertiesFile = 'some.properties';

  it('should only accept JSON and properties types', () => {
    const config = require('../config');
    expect(() => {
      config.writeProjectConfig(TEST_KEY, TEST_VALUE, propertiesFile, 'bad_type');
    }).toThrow();
  });

  it('should throw an error when querying non-existent JSON keys', () => {
    const config = require('../config');
    // when
    config.writeProjectConfig(TEST_KEY, TEST_VALUE);

    // then
    config.purge();
    expect(() => {
      config.readProjectConfig('nonExistentKey');
    }).toThrow();
  });

  it('should throw an error when querying non-existent properties', () => {
    const config = require('../config');
    // when
    config.writeProjectConfig(TEST_KEY, TEST_VALUE, propertiesFile, 'properties');

    // then
    config.purge();
    expect(() => {
      config.readProjectConfig('nonExistentKey', propertiesFile, 'properties');
    }).toThrow();
  });
});
