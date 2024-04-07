import { join } from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import getPathname from './getPathname.mjs';
import wrapStreamWrite from './wrapStreamWrite.mjs';
import wrapStreamRead from './wrapStreamRead.mjs';

export const sha256 = (str) => createHash('sha256')
  .update(str)
  .digest()
  .toString('hex');

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

export {
  getPathname,
  wrapStreamWrite,
  wrapStreamRead,
};
