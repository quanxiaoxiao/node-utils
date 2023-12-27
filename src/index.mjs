import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';

/**
 * @param {string} url
 * @returns {string}
 */
export const getPathname = (url) => {
  const str = url.trim();
  const trim = (/** @type {string} s */ s) => s.replace(/\/$/, '');
  if (str[0] === '~') {
    const nameList = trim(str.slice(1)).split('/');
    if (nameList.length === 0) {
      return homedir();
    }
    return join(homedir(), ...nameList);
  }
  if (str[0] !== '/') {
    const nameList = [];
    if (/^\/\./.test(str)) {
      nameList.push(...trim(str.slice(2)).split('/'));
    } else {
      nameList.push(...trim(str).split('/'));
    }
    if (nameList.length === 0) {
      return process.cwd();
    }
    return join(process.cwd(), ...nameList);
  }
  if (str === '/') {
    return str;
  }
  const nameList = trim(str.slice(1)).split('/');
  return join('/', ...nameList);
};

/**
 * @param {string|Buffer} str
 * @return {string}
 */
export const sha256 = (str) => createHash('sha256')
  .update(str)
  .digest()
  .toString('hex');
