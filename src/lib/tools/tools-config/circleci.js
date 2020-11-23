module.exports = {
  circleci: () => ({
    id: 'circleci',
    name: 'CircleCI',
    toolCategory: 'ciCdTools',
    validPlatforms: ['darwin', 'win32'],
    platform: {
      dependencies: [],
    },
  }),
};
