const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const selfCert = require('self-cert');
const inquirer = require('inquirer');
const shelljs = require('shelljs');

const write = (dest, cert) => {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.resolve(dest);
      if (!fs.existsSync(dir)) {
        shelljs.mkdir('-p', dir);
      }
      fs.writeFileSync(path.join(dir, 'private.key'), cert.privateKey, 'utf8');
      fs.writeFileSync(path.join(dir, 'ssl.cert'), cert.certificate, 'utf8');
      fs.writeFileSync(path.join(dir, 'public.key'), cert.publicKey, 'utf8');
      resolve('Successfuly wrote certificate and key files|');
    } catch (e) {
      reject(e);
    }
  });
};

const createCertAndKeys = (dest) => {
  const now = new Date();
  const cert = selfCert({
    attrs: {
      stateName: 'Indiana',
      locality: 'South Capitol Avenue, Indianapolis',
      orgName: 'Appirio Inc.',
      shortName: 'Appirio DX',
    },
    expires: new Date(now.getFullYear() + 10, 11, 31),
  });

  const question = [{
    type: 'input',
    name: 'dest',
    message: 'Please provide the destination path where the files will be written: ',
    validate: target => _.trim(target) !== '',
  }];

  if (_.isEmpty(dest)) {
    return inquirer.prompt(question)
      .then(answer => write(answer.dest, cert));
  }
  return write(dest, cert);
};

module.exports = {
  createCertAndKeys,
};
