const crypto = require('crypto');

const D = ':';
const C = 16;
const A = 'aes-256-gcm';
const Q = 'XdA227b';
const S = '81a84dbe45';
const U = '541d7b0c1218';
const Z = 'aDX';

/* ****************************************************************************************************
  This File Always Needs To Be Scrambled (in CI) Before Publishing A New NPM Version Of This Package.

  Notice: This module provides methods for encrypting and decrypting plain text strings to avoid
  secrets from being accessed by unintended people. It is very much possible for a person with
  malicious intent to decipher the ecryption and see the value in plain text!
**************************************************************************************************** */

const encrypt = (text) => {
  if (text === null || text === undefined) {
    return undefined;
  }
  const iv = crypto.randomBytes(C).toString('hex');
  const key = `${Q}${S}${U}${Z}`;
  const cipher = crypto.createCipheriv(A, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv}${encrypted}${D}${tag}`;
};

const decrypt = (text) => {
  if (text === null || text === undefined) {
    return undefined;
  }
  const tokens = text.split(D);
  if (tokens.length !== 2) {
    throw new Error('Failed to decrypt: Invalid input value!');
  }
  const tag = tokens[1];
  const iv = tokens[0].substring(0, (C * 2));
  const secret = tokens[0].substring((C * 2), tokens[0].length);
  const key = `${Q}${S}${U}${Z}`;
  const decipher = crypto.createDecipheriv(A, key, iv);
  let dec;
  try {
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    dec = decipher.update(secret, 'hex', 'utf8');
    dec += decipher.final('utf8');
  } catch (e) {
    throw new Error('Failed to decrypt: Possibly a corrupted/modified encrypted input value!');
  }
  return dec;
};

module.exports = {
  encrypt,
  decrypt,
};
