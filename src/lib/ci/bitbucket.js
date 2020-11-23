const writeProjectSecretKey = () => Promise.reject(new Error('ci:secret command is only supported for Gitlab CI, at present.'));
const schedulePipeline = () => Promise.reject(new Error('This functionality is only supported for Gitlab CI, at present.'));

module.exports = { writeProjectSecretKey, schedulePipeline };
