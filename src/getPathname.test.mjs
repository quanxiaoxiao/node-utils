import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import getPathname from './getPathname.mjs';

test('getPathname null', () => {
  assert.equal(getPathname(12), null);
  assert.equal(getPathname(), null);
});

test('getPathname ~', () => {
  assert.equal(getPathname('~'), os.homedir());
  assert.equal(getPathname('~/'), os.homedir());
  assert.equal(getPathname('~/aaa'), path.resolve(os.homedir(), 'aaa'));
  assert.equal(getPathname('~/a/'), path.resolve(os.homedir(), 'a'));
  assert.equal(getPathname('~/a/b'), path.resolve(os.homedir(), 'a', 'b'));
  assert.equal(getPathname('~/a/b/'), path.resolve(os.homedir(), 'a', 'b'));
});

test('getPathname *', () => {
  assert.equal(getPathname('.'), process.cwd());
  assert.equal(getPathname('./'), process.cwd());
  assert.equal(getPathname('../'), path.resolve(process.cwd(), '..'));
  assert.equal(getPathname('..'), path.resolve(process.cwd(), '..'));
  assert.equal(getPathname('.test'), path.resolve(process.cwd(), '.test'));
  assert.equal(getPathname('.test/..'), path.resolve(process.cwd()));
  assert.equal(getPathname('a/b'), path.resolve(process.cwd(), 'a', 'b'));
  assert.equal(getPathname('a/b/'), path.resolve(process.cwd(), 'a', 'b'));
});

test('getPathname /', () => {
  assert.equal(getPathname('/'), path.resolve('/'));
  assert.equal(getPathname('/aa'), path.resolve('/aa'));
  assert.equal(getPathname('/aa/bb/cc'), path.resolve('/aa/bb/cc'));
  assert.equal(getPathname('/aa/bb/cc/'), path.resolve('/aa/bb/cc'));
});
