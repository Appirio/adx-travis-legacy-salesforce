module.exports = {
  jenkins: () => ({
    id: 'jenkins',
    name: 'Jenkins',
    toolCategory: 'ciCdTools',
    validPlatforms: ['darwin', 'win32'],
    platform: {
      dependencies: [],
    },
  }),
};
