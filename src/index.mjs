import { createHash } from 'node:crypto';

import getPathname from './getPathname.mjs';
import readFileList from './readFileList.mjs';
import toDataify from './toDataify.mjs';
import wrapStreamRead from './wrapStreamRead.mjs';
import wrapStreamWrite from './wrapStreamWrite.mjs';

export const sha256 = (str) => createHash('sha256')
  .update(str)
  .digest()
  .toString('hex');

export {
  getPathname,
  readFileList,
  toDataify,
  wrapStreamRead,
  wrapStreamWrite,
};
