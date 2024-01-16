import { join } from 'node:path';
import fs from 'node:fs';
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

/**
 * @param {string} pathname
 * @param {number?} maxDepth
 * @return {Array<string>}
 */
export const getFileList = (pathname, maxDepth) => {
  const state = fs.statSync(pathname);
  if (state.isDirectory()) {
    const filenameList = fs.readdirSync(pathname);
    if (maxDepth != null && maxDepth < 0) {
      return [];
    }
    const result = [];
    for (let i = 0; i < filenameList.length; i++) {
      const filename = filenameList[i];
      const subList = getFileList(
        join(pathname, filename),
        maxDepth == null ? null : maxDepth - 1,
      );
      result.push(...subList);
    }
    return result;
  }
  return [pathname];
};
