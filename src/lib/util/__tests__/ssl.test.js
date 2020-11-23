jest.mock('self-cert');
jest.mock('fs');
jest.mock('shelljs');
jest.mock('inquirer');

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const ssl = require('../ssl');

let successMessage;
let privateKey;
let publicKey;
let sslCert;
let privateKeyValue;
let publicKeyValue;
let sslCertValue;

beforeAll(() => {
  successMessage = 'Successfuly wrote certificate and key files|';
  privateKey = 'private.key';
  publicKey = 'public.key';
  sslCert = 'ssl.cert';
  privateKeyValue = 'fakePrivateKey';
  publicKeyValue = 'fakePublicKey';
  sslCertValue = 'fakeCertificate';
});

beforeEach(() => {
  fs.__resetMockFiles();
});

describe('Create and write SSL keys and certificate', () => {
  it('should write SSL keys and certificate when destination dir is specified', () => {
    // given
    const destDir = '__fakeKeys__';
    const resolvedDir = path.resolve(destDir);

    // when
    return ssl.createCertAndKeys(destDir)
      // then
      .then((response) => {
        expect(response).toEqual(successMessage);
        expect(fs.readFileSync(path.join(resolvedDir, privateKey))).toEqual(privateKeyValue);
        expect(fs.readFileSync(path.join(resolvedDir, sslCert))).toEqual(sslCertValue);
        expect(fs.readFileSync(path.join(resolvedDir, publicKey))).toEqual(publicKeyValue);
      });
  });

  it('should write SSL keys and certificate when destination dir is NOT specified', () => {
    // when
    return ssl.createCertAndKeys()
      // then
      .then((response) => {
        expect(response).toEqual(successMessage);
        expect(fs.readFileSync(path.join(inquirer.__getDestDir(), privateKey))).toEqual(privateKeyValue);
        expect(fs.readFileSync(path.join(inquirer.__getDestDir(), sslCert))).toEqual(sslCertValue);
        expect(fs.readFileSync(path.join(inquirer.__getDestDir(), publicKey))).toEqual(publicKeyValue);
      });
  });
});
