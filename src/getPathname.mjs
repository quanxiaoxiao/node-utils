import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const trim = (s) => s.replace(/\/$/, '');

const generateNameList = (str) => str.split('/').filter((s) => s !== '');

export default (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  const str = url.trim();
  if (str[0] === '~') {
    const nameList = generateNameList(trim(str.slice(1)));
    if (nameList.length === 0) {
      return homedir();
    }
    return path.join(homedir(), ...nameList);
  }
  if (str[0] !== '/') {
    const nameList = [];
    if (/^\.\//.test(str)) {
      nameList.push(...generateNameList(trim(str.slice(2))));
    } else {
      nameList.push(...generateNameList(trim(str)));
    }
    if (nameList.length === 0) {
      return process.cwd();
    }
    return path.join(process.cwd(), ...nameList);
  }
  const { root } = path.parse(process.cwd());
  if (str === '/') {
    return root;
  }
  const nameList = generateNameList(trim(str.slice(1)));
  return path.join(root, ...nameList);
};
