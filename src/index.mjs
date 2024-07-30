import { createHash } from 'node:crypto';
import getPathname from './getPathname.mjs';
import wrapStreamWrite from './wrapStreamWrite.mjs';
import wrapStreamRead from './wrapStreamRead.mjs';
import readFileList from './readFileList.mjs';
import toDataify from './toDataify.mjs';

export const sha256 = (str) => createHash('sha256')
  .update(str)
  .digest()
  .toString('hex');

export {
  readFileList,
  getPathname,
  wrapStreamWrite,
  wrapStreamRead,
  toDataify,
};
