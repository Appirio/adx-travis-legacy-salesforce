module.exports = {
  travis: () => ({
    id: 'travis',
    name: 'Travis CI',
    toolCategory: 'ciCdTools',
    validPlatforms: ['darwin', 'win32'],
    platform: {
      dependencies: [],
    },
  }),
};
