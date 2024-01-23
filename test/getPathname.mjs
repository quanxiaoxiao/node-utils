import os from 'node:os';
import path from 'node:path';
import test from 'ava'; // eslint-disable-line
import { getPathname } from '../src/index.mjs';

test('null', (t) => {
  t.is(getPathname(12), null);
  t.is(getPathname(), null);
});

test('~', (t) => {
  t.is(getPathname('~'), os.homedir());
  t.is(getPathname('~/'), os.homedir());
  t.is(getPathname('~/aaa'), path.resolve(os.homedir(), 'aaa'));
  t.is(getPathname('~/a/'), path.resolve(os.homedir(), 'a'));
  t.is(getPathname('~/a/b'), path.resolve(os.homedir(), 'a', 'b'));
  t.is(getPathname('~/a/b/'), path.resolve(os.homedir(), 'a', 'b'));
});

test('*', (t) => {
  t.is(getPathname('.'), process.cwd());
  t.is(getPathname('./'), process.cwd());
  t.is(getPathname('../'), path.resolve(process.cwd(), '..'));
  t.is(getPathname('..'), path.resolve(process.cwd(), '..'));
  t.is(getPathname('.test'), path.resolve(process.cwd(), '.test'));
  t.is(getPathname('.test/..'), path.resolve(process.cwd()));
  t.is(getPathname('a/b'), path.resolve(process.cwd(), 'a', 'b'));
  t.is(getPathname('a/b/'), path.resolve(process.cwd(), 'a', 'b'));
});

test('/', (t) => {
  t.is(getPathname('/'), path.resolve('/'));
  t.is(getPathname('/aa'), path.resolve('/aa'));
  t.is(getPathname('/aa/bb/cc'), path.resolve('/aa/bb/cc'));
  t.is(getPathname('/aa/bb/cc/'), path.resolve('/aa/bb/cc'));
});
