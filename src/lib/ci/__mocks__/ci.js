const ci = jest.genMockFromModule('../../ci/ci');
// const ci = {};
let isCi;
let projectUrl;
let root;
let slug;
let env = {};

ci.__setCIValues = (isCi, projectUrl, root, slug) => {
  this.isCi = isCi;
  this.projectUrl = projectUrl;
  this.root = root;
  this.slug = slug;
  env = {
    isCi,
    projectUrl,
    root,
    slug,
  };
  ci.env = env;
};

ci.__resetCIValues = () => {
  isCi = null;
  projectUrl = null;
  root = null;
  slug = null;
  env = {
    isCi,
    projectUrl,
    root,
    slug,
  };
  ci.env = env;
};
module.exports = ci;
