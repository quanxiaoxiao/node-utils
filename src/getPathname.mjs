import { join } from 'node:path';
import { homedir } from 'node:os';

export default (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  const str = url.trim();
  const trim = (s) => s.replace(/\/$/, '');
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
