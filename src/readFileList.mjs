import fs from 'node:fs';
import { join } from 'node:path';

const readFileList = (pathname, maxDepth) => {
  const state = fs.statSync(pathname);
  if (state.isDirectory()) {
    const filenameList = fs.readdirSync(pathname);
    if (maxDepth != null && maxDepth < 0) {
      return [];
    }
    const result = [];
    for (let i = 0; i < filenameList.length; i++) {
      const filename = filenameList[i];
      const subList = readFileList(
        join(pathname, filename),
        maxDepth == null ? null : maxDepth - 1,
      );
      result.push(...subList);
    }
    return result;
  }
  return [pathname];
};

export default readFileList;
