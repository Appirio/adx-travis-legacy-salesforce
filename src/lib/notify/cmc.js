const gulpLog = require('fancy-log');
const colors = require('ansi-colors');
const cmc = require('../alm/cmc');

module.exports = {
  get enabled() {
    return cmc.enabled;
  },
  notify: () => {
    gulpLog(colors.green('TODO: CMC integration to be done here!'));
    // We should use the cmc module to do all of the heavy lifting here.
  }
}
