jest.mock('fs');
jest.mock('simple-git/promise');
// jest.setMock('../../ci/ci', require('../__mocks__/ci'));
jest.mock('../../ci/ci');

let sonarqube;
let git;
let fs;
let ci;

let REMOTES;
let EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES;
let EXPECTED_LEGACY_SONAR_PROJECT_PROPERTIES;
let EXPECTED_SONARLINT_PROPERTIES;
let projectUrl;
let root;
let slug;
let filePath;
let sonarlintFilePath;

const requireModules = () => {
  jest.resetModules();
  git = require('simple-git/promise')();
  sonarqube = require('../sonarqube');
  fs = require('fs');
  ci = require('../../ci/ci');
};

beforeEach(() => {
  this.originalCoverage = process.env.CODE_COVERAGE;
  this.originalSonarHost = process.env.SONAR_HOST_URL;

  REMOTES = [{
    name: 'origin',
    refs: {
      fetch: 'git@gitlab.appirio.com:appirio-dx/test-project.git',
      push: 'git@gitlab.appirio.com:appirio-dx/test-project.git',
    },
  }];
  EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES = `
  sonar.exclusions=**/__tests__/*,**/__mocks__/*,sonar-project.properties,**/*__*.cls,**/*__*.trigger,**/*__*.js,**/*.xml,**/*.css,**/*.html,force-app/**/staticresources/**/*.html,force-app/**/staticresources/**/*.css,force-app/**/staticresources/**/*.js
  sonar.host.url=https://sonarqube.appirio.com
  sonar.inclusions=force-app/**/*.cls,force-app/**/*.trigger,force-app/**/*.js
  sonar.projectDescription=git@gitlab.appirio.com:appirio-dx/test-project.git
  sonar.projectKey=appirio-dx-test-project
  sonar.projectName=appirio-dx/test-project
  sonar.sourceEncoding=UTF-8
  sonar.sources=force-app
  `;
  EXPECTED_LEGACY_SONAR_PROJECT_PROPERTIES = `
  sonar.exclusions=**/__tests__/*,**/__mocks__/*,sonar-project.properties,**/*__*.cls,**/*__*.trigger,**/*__*.js,**/*.xml,**/*.css,**/*.html,src/**/staticresources/**/*.html,src/**/staticresources/**/*.css,src/**/staticresources/**/*.js
  sonar.host.url=https://sonarqube.appirio.com
  sonar.inclusions=src/**/*.cls,src/**/*.trigger,src/**/*.js
  sonar.projectDescription=git@gitlab.appirio.com:appirio-dx/test-project.git
  sonar.projectKey=appirio-dx-test-project
  sonar.projectName=appirio-dx/test-project
  sonar.sourceEncoding=UTF-8
  sonar.sources=src
  `;
  EXPECTED_SONARLINT_PROPERTIES = {
    projectKey: 'appirio-dx-test-project',
    serverId: 'https://sonarqube.appirio.com',
  };
  projectUrl = 'git@gitlab.appirio.com:appirio-dx/test-project.git';
  root = '/builds/appirio-dx/test-project';
  slug = 'appirio-dx/test-project';
  filePath = 'sonar-project.properties';
  sonarlintFilePath = 'sonarlint.json';
});

afterEach(() => {
  delete process.env.GITLAB_CI;
  delete process.env.CI;
  fs.__resetMockFiles();
  // ci.__resetCIValues();
  process.env.CODE_COVERAGE = this.originalCoverage;
  process.env.SONAR_HOST_URL = this.originalSonarHost;
});

describe('Write sonar-properties and sonerlint files', () => {
  it('should throw error if in CI environment but CI_PROJECT_PATH is not set', () => {
    // given
    requireModules();
    ci.__setCIValues(true);

    // when
    return expect(sonarqube.writeConfigFiles(null, 'org'))
      // then
      .rejects.toMatch(/Mandatory properties like the Sonar.projectKey not available/);
  });

  it('should write files when in NON-CI env for org based project', () => {
    // given
    delete process.env.CODE_COVERAGE;
    delete process.env.SONAR_HOST_URL;
    requireModules();
    ci.__setCIValues(false);
    git.__setInfo(REMOTES);

    // when
    return sonarqube.writeConfigFiles(null, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should write files when in NON-CI env for package based project', () => {
    // given
    delete process.env.CODE_COVERAGE;
    delete process.env.SONAR_HOST_URL;
    requireModules();
    ci.__setCIValues(false);
    git.__setInfo(REMOTES);

    // when
    return sonarqube.writeConfigFiles(null, 'package')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should write files when in NON-CI env for legacy salesforce project', () => {
    // given
    delete process.env.CODE_COVERAGE;
    delete process.env.SONAR_HOST_URL;
    requireModules();
    ci.__setCIValues(false);
    git.__setInfo(REMOTES);

    // when
    return sonarqube.writeConfigFiles(null, 'legacy')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_LEGACY_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should write files in CI environment', () => {
    // given
    delete process.env.CODE_COVERAGE;
    delete process.env.SONAR_HOST_URL;
    requireModules();
    ci.__setCIValues(true, projectUrl, root, slug);

    // when
    return sonarqube.writeConfigFiles(null, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should write files in CI environment when projectUrl and project_dir is not specified', () => {
    // given
    EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES = `
    sonar.exclusions=**/__tests__/*,**/__mocks__/*,sonar-project.properties,**/*__*.cls,**/*__*.trigger,**/*__*.js,**/*.xml,**/*.css,**/*.html,force-app/**/staticresources/**/*.html,force-app/**/staticresources/**/*.css,force-app/**/staticresources/**/*.js
    sonar.host.url=https://sonarqube.appirio.com
    sonar.inclusions=force-app/**/*.cls,force-app/**/*.trigger,force-app/**/*.js
    sonar.projectDescription=No Description provided
    sonar.projectKey=appirio-dx-test-project
    sonar.projectName=Unnamed Project
    sonar.sourceEncoding=UTF-8
    sonar.sources=force-app
  `;
    delete process.env.CODE_COVERAGE;
    delete process.env.SONAR_HOST_URL;
    requireModules();
    ci.__setCIValues(true, null, null, slug);

    // when
    return sonarqube.writeConfigFiles(null, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should write files in CI environment when CODE_COVERAGE directory is specified', () => {
    // given
    EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES = `
    sonar.exclusions=**/__tests__/*,**/__mocks__/*,sonar-project.properties,**/*__*.cls,**/*__*.trigger,**/*__*.js,**/*.xml,**/*.css,**/*.html,testCoverage/**/*,force-app/**/staticresources/**/*.html,force-app/**/staticresources/**/*.css,force-app/**/staticresources/**/*.js
    sonar.host.url=https://sonarqube.appirio.com
    sonar.inclusions=force-app/**/*.cls,force-app/**/*.trigger,force-app/**/*.js
    sonar.javascript.lcov.reportPaths=testCoverage/lcov.info
    sonar.projectDescription=No Description provided
    sonar.projectKey=appirio-dx-test-project
    sonar.projectName=Unnamed Project
    sonar.sourceEncoding=UTF-8
    sonar.sources=force-app
  `;
    delete process.env.SONAR_HOST_URL;
    process.env.CODE_COVERAGE = 'testCoverage';
    requireModules();
    ci.__setCIValues(true, null, null, slug);

    // when
    return sonarqube.writeConfigFiles(null, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should write files in CI environment when a different SONAR_HOST is specified', () => {
    // given
    EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES = `
    sonar.exclusions=**/__tests__/*,**/__mocks__/*,sonar-project.properties,**/*__*.cls,**/*__*.trigger,**/*__*.js,**/*.xml,**/*.css,**/*.html,force-app/**/staticresources/**/*.html,force-app/**/staticresources/**/*.css,force-app/**/staticresources/**/*.js
    sonar.host.url=https://sonar.test.com
    sonar.inclusions=force-app/**/*.cls,force-app/**/*.trigger,force-app/**/*.js
    sonar.projectDescription=No Description provided
    sonar.projectKey=appirio-dx-test-project
    sonar.projectName=Unnamed Project
    sonar.sourceEncoding=UTF-8
    sonar.sources=force-app
  `;
    EXPECTED_SONARLINT_PROPERTIES = {
      projectKey: 'appirio-dx-test-project',
      serverId: 'https://sonar.test.com',
    };
    delete process.env.CODE_COVERAGE;
    requireModules();
    ci.__setCIValues(true, null, null, slug);

    // when
    return sonarqube.writeConfigFiles({ 'sonar.host.url': 'https://sonar.test.com' }, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should write files in CI environment if it is a GITHUB repository', () => {
    // given
    EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES = `
    sonar.exclusions=**/__tests__/*,**/__mocks__/*,sonar-project.properties,**/*__*.cls,**/*__*.trigger,**/*__*.js,**/*.xml,**/*.css,**/*.html,force-app/**/staticresources/**/*.html,force-app/**/staticresources/**/*.css,force-app/**/staticresources/**/*.js
    sonar.host.url=https://sonarqube.appirio.com
    sonar.inclusions=force-app/**/*.cls,force-app/**/*.trigger,force-app/**/*.js
    sonar.projectDescription=git@github.com:appirio-dx/test-project.git
    sonar.projectKey=gh-appirio-dx-test-project
    sonar.projectName=appirio-dx/test-project
    sonar.sourceEncoding=UTF-8
    sonar.sources=force-app
  `;
    EXPECTED_SONARLINT_PROPERTIES = {
      projectKey: 'gh-appirio-dx-test-project',
      serverId: 'https://sonarqube.appirio.com',
    };
    projectUrl = 'git@github.com:appirio-dx/test-project.git';
    delete process.env.CODE_COVERAGE;
    delete process.env.SONAR_HOST_URL;
    requireModules();
    ci.__setCIValues(true, projectUrl, root, slug);

    // when
    return sonarqube.writeConfigFiles(null, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should write files in CI environment if it is a BITBUCKET repository', () => {
    // given
    EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES = `
    sonar.exclusions=**/__tests__/*,**/__mocks__/*,sonar-project.properties,**/*__*.cls,**/*__*.trigger,**/*__*.js,**/*.xml,**/*.css,**/*.html,force-app/**/staticresources/**/*.html,force-app/**/staticresources/**/*.css,force-app/**/staticresources/**/*.js
    sonar.host.url=https://sonarqube.appirio.com
    sonar.inclusions=force-app/**/*.cls,force-app/**/*.trigger,force-app/**/*.js
    sonar.projectDescription=git@bitbucket.org:appirio-dx/test-project.git
    sonar.projectKey=bb-appirio-dx-test-project
    sonar.projectName=appirio-dx/test-project
    sonar.sourceEncoding=UTF-8
    sonar.sources=force-app
  `;
    EXPECTED_SONARLINT_PROPERTIES = {
      projectKey: 'bb-appirio-dx-test-project',
      serverId: 'https://sonarqube.appirio.com',
    };
    projectUrl = 'git@bitbucket.org:appirio-dx/test-project.git';
    delete process.env.CODE_COVERAGE;
    delete process.env.SONAR_HOST_URL;
    requireModules();
    ci.__setCIValues(true, projectUrl, root, slug);

    // when
    return sonarqube.writeConfigFiles(null, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should not overwrite sonar-project.properties file if it already exists', () => {
    // given
    delete process.env.SONAR_HOST_URL;
    delete process.env.CODE_COVERAGE;
    requireModules();
    ci.__setCIValues(true, null, null, slug);
    // write empty string to sonar-project.properties
    fs.writeFileSync(filePath, '');

    // when
    return sonarqube.writeConfigFiles(null, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath)).toEqual('');
        expect(JSON.parse(fs.readFileSync(sonarlintFilePath))).toEqual(EXPECTED_SONARLINT_PROPERTIES);
      });
  });

  it('should not overwrite sonarlint.json if it already exists', () => {
    // given
    delete process.env.CODE_COVERAGE;
    delete process.env.SONAR_HOST_URL;
    requireModules();
    ci.__setCIValues(true, projectUrl, root, slug);
    // write empty object to sonarlint.json
    fs.writeFileSync(sonarlintFilePath, {});

    // when
    return sonarqube.writeConfigFiles(null, 'org')
      // then
      .then((response) => {
        expect(response).toBeUndefined();
        expect(fs.readFileSync(filePath).replace(/\s/g, '')).toEqual(EXPECTED_SFDX_SONAR_PROJECT_PROPERTIES.replace(/\s/g, ''));
        expect(fs.readFileSync(sonarlintFilePath)).toEqual({});
      });
  });
});
