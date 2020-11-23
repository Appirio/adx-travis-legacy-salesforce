jest.mock('fs');
jest.mock('@gitbeaker/node');
jest.mock('../../vcs/vcs');

const fs = require('fs');
const { gitLabApi } = require('@gitbeaker/node');

const gitlab = require('../gitlab');
const config = require('../../config/config');
const vcs = require('../../vcs/vcs');

const CURRENT_USER = require('../../../__mockData__/gitlab/user.json');
const GROUP_LEVEL_ACCESS = require('../../../__mockData__/gitlab/group-access-level.json');
const GROUPS = require('../../../__mockData__/gitlab/groups.json');

describe('Fetch current user details from gitlab', () => {
  beforeEach(() => {
    fs.__resetMockFiles();
    config.purge();
  });

  it('should fetch users when using Appirio\'s Gitlab server and gitlab personal token is defined in the user config file', () => {
    // given
    const GITLAB_PERSONAL_TOKEN_PROP = 'gitlab.personal_token';
    const GITLAB_PERSONAL_TOKEN = 'fakeToken';
    config.setSecret(GITLAB_PERSONAL_TOKEN_PROP, GITLAB_PERSONAL_TOKEN);

    // when
    return gitlab.getCurrentUser()
      // then
      .then((users) => {
        expect(users).toEqual(CURRENT_USER);
      });
  });

  it('should error out when using Appirio\'s Gitlab server and gitlab personal token is NOT defined in the user config file', () => {
    // when
    expect.assertions(1);
    return expect(gitlab.getCurrentUser())
      // then
      .rejects.toEqual('Gitlab Personal Access Token is not available.');
  });

  it('should fetch current user when using CUSTOM gitlab server', () => {
    // given
    const GITLAB_PROJECT_CONFIG = 'continuousIntegrationURL';
    const GITLAB_CI_URL = 'https://gitlab.dx.com';
    config.writeProjectConfig(GITLAB_PROJECT_CONFIG, GITLAB_CI_URL);
    process.env.GITLAB_TOKEN = 'fakeToken';

    // when
    return gitlab.getCurrentUser()
      // then
      .then((users) => {
        expect(users).toEqual(CURRENT_USER);
        delete process.env.GITLAB_TOKEN;
      });
  });

  it('should fail while fetching users when node process version is less than 12.0.0', () => {
    // given
    const GITLAB_PERSONAL_TOKEN_PROP = 'gitlab.personal_token';
    const GITLAB_PERSONAL_TOKEN = 'fakeToken';
    config.setSecret(GITLAB_PERSONAL_TOKEN_PROP, GITLAB_PERSONAL_TOKEN);

    this.originalVersion = process.version;
    Object.defineProperty(process, 'version', {
      value: '11.9.9',
    });

    // when
    return gitlab.getCurrentUser()
      // then
      .then()
      .catch((err) => {
        expect(err.message).toMatch(/Please update your version of Node/);
        Object.defineProperty(process, 'version', {
          value: this.originalVersion,
        });
      });
  });
});

describe('Get Group Access Level for User', () => {
  beforeAll(() => {
    const GITLAB_PERSONAL_TOKEN_PROP = 'gitlab.personal_token';
    const GITLAB_PERSONAL_TOKEN = 'fakeToken';
    config.setSecret(GITLAB_PERSONAL_TOKEN_PROP, GITLAB_PERSONAL_TOKEN);
  });

  it('should get group access by user', () => {
    // given
    const GROUP_ID = 110;
    const USER_ID = 150;

    // when
    return gitlab.getGroupAccessByUser(GROUP_ID, USER_ID)
      // then
      .then((response) => {
        expect(response).toEqual(GROUP_LEVEL_ACCESS);
      });
  });

  it('should throw error if user does not have access to group', () => {
    // given
    const GROUP_ID = 110;
    const USER_ID = 140;

    // when
    return expect(gitlab.getGroupAccessByUser(GROUP_ID, USER_ID))
      // then
      .rejects.toEqual('404 Not Found');
  });
});

describe('Fetch Group Details from Gitlab', () => {
  beforeAll(() => {
    const GITLAB_PERSONAL_TOKEN_PROP = 'gitlab.personal_token';
    const GITLAB_PERSONAL_TOKEN = 'fakeToken';
    config.setSecret(GITLAB_PERSONAL_TOKEN_PROP, GITLAB_PERSONAL_TOKEN);
  });

  it('should fetch group detail from gitlab', () => {
    // given
    const GROUP_ID = 40;

    // when
    return gitlab.getGroupById(GROUP_ID)
      // then
      .then((response) => {
        expect(response).toEqual(GROUPS[0]);
      });
  });

  it('should throw error if group does not exist', () => {
    // given
    const GROUP_ID = 110;

    // when
    return expect(gitlab.getGroupById(GROUP_ID))
      // then
      .rejects.toEqual('404 Group Not Found');
  });
});

describe('Fetch Project Details from Gitlab', () => {
  const expectCorrectProjectDetails = (project, masterAccess) => {
    expect(project).toEqual(gitLabApi.__getRequiredProject());
    expect(config.readProjectCache('gitlab.master_level_access')).toBe(masterAccess);
    expect(config.readProjectCache('gitlab.project_id')).toEqual(gitLabApi.__getRequiredProject().id);
    expect(config.readProjectCache('gitlab.project_path')).toEqual(gitLabApi.__getRequiredProject().path_with_namespace);
  };

  beforeEach(() => {
    fs.__resetMockFiles();
    config.purge();
    const GITLAB_PERSONAL_TOKEN_PROP = 'gitlab.personal_token';
    const GITLAB_PERSONAL_TOKEN = 'fakeToken';
    config.setSecret(GITLAB_PERSONAL_TOKEN_PROP, GITLAB_PERSONAL_TOKEN);
  });

  it('should fetch project details when project and group access is null', () => {
    // given
    const PROJECT_ID = 931;

    // when
    return gitlab.getProjectById(PROJECT_ID)
      // then
      .then((project) => {
        expectCorrectProjectDetails(project, false);
      });
  });

  it('should fetch project details when project access is 40', () => {
    // given
    const PROJECT_ID = 866;

    // when
    return gitlab.getProjectById(PROJECT_ID)
      // then
      .then((project) => {
        expectCorrectProjectDetails(project, true);
      });
  });

  it('should fetch project details when group access is 40', () => {
    // given
    const PROJECT_ID = 834;

    // when
    return gitlab.getProjectById(PROJECT_ID)
      // then
      .then((project) => {
        expectCorrectProjectDetails(project, true);
      });
  });

  it('should fetch project details when project access is 50 and group access is 10', () => {
    // given
    const PROJECT_ID = 818;

    // when
    return gitlab.getProjectById(PROJECT_ID)
      // then
      .then((project) => {
        expectCorrectProjectDetails(project, true);
      });
  });

  it('should fetch project details when project access is 50 and group access is 60 but namespace.parent_id is null', () => {
    // given
    const PROJECT_ID = 819;

    // when
    return gitlab.getProjectById(PROJECT_ID)
      // then
      .then((project) => {
        expectCorrectProjectDetails(project, true);
      });
  });

  it('should fetch project details when parent group access is highest', () => {
    // given
    const PROJECT_ID = 866;

    // when
    return gitlab.getProjectById(PROJECT_ID)
      // then
      .then((project) => {
        expectCorrectProjectDetails(project, true);
      });
  });

  it('should fetch project details when group level access does not exist for user', () => {
    // given
    const PROJECT_ID = 931;

    // when
    return gitlab.getProjectById(PROJECT_ID)
      // then
      .then((project) => {
        expectCorrectProjectDetails(project, false);
      });
  });
});

describe('Write Project Secret Key', () => {
  beforeEach(() => {
    fs.__resetMockFiles();
    config.purge();
    gitLabApi.__resetSecretObject();
    const GITLAB_PERSONAL_TOKEN_PROP = 'gitlab.personal_token';
    const GITLAB_PERSONAL_TOKEN = 'fakeToken';
    config.setSecret(GITLAB_PERSONAL_TOKEN_PROP, GITLAB_PERSONAL_TOKEN);
  });

  it('update project secret key in the secret object', () => {
    // given
    config.writeProjectCache('gitlab.project_id', '123');
    config.writeProjectCache('gitlab.master_level_access', true);

    gitLabApi.__setSecretObject('SF_ORG__VERSION', '42.0');

    // when
    return gitlab.writeProjectSecretKey('SF_ORG__VERSION', '45.0')
      // then
      .then((response) => {
        expect(response).toMatch(/successfully updated/);
        expect(gitLabApi.__getSecretObject()).toMatchObject({
          SF_ORG__VERSION: '45.0',
        });
      });
  });

  it('write project secret key in the secret object', () => {
    // given
    config.writeProjectCache('gitlab.project_id', '123');
    config.writeProjectCache('gitlab.master_level_access', true);

    // when
    return gitlab.writeProjectSecretKey('SF_ORG__VERSION', '42.0')
      // then
      .then((response) => {
        expect(response).toMatch(/successfully created/);
        expect(gitLabApi.__getSecretObject()).toMatchObject({
          SF_ORG__VERSION: '42.0',
        });
      });
  });

  it('should deny changing writing the secret keys if user does not have master access', () => {
    // given
    config.writeProjectCache('gitlab.project_id', '123');
    config.writeProjectCache('gitlab.master_level_access', false);

    // when
    return expect(gitlab.writeProjectSecretKey('SF_ORG__VERSION', '42.0'))
      // then
      .rejects.toEqual('You do not have sufficient permissions to edit secret variables for this repository!');
  });

  it('update project secret key in secret object when no project cache was found', () => {
    // given
    gitLabApi.__setSecretObject('SF_ORG__VERSION', '42.0');

    vcs.getRemotePath.mockImplementation(() => Promise.resolve('learn/legacy-salesforce-indy'));

    // when
    return gitlab.writeProjectSecretKey('SF_ORG__VERSION', '45.0')
      // then
      .then((response) => {
        expect(response).toMatch(/successfully updated/);
        expect(gitLabApi.__getSecretObject()).toMatchObject({
          SF_ORG__VERSION: '45.0',
        });
      });
  });
});

describe('Schedule Pipelines', () => {
  it('Create Schedule Pipelines', () => gitlab.schedulePipeline('Clean Merged Branches', 'master', '0 4 * * 0')
    // then
    .then((response) => {
      expect(response).toMatch(/successfully created/);
    }),
  );

  it('should deny create schedule if user does not have master access', () => {
    // given
    config.writeProjectCache('gitlab.project_id', '123');
    config.writeProjectCache('gitlab.master_level_access', false);
    // when
    return expect(gitlab.schedulePipeline('Clean Merged Branches', 'master', '0 4 * * 0'))
      // then
      .rejects.toEqual('You do not have sufficient permissions to create schedules for this repository!');
  });
});
