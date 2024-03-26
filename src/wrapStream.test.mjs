import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import { test, mock } from 'node:test';
import { PassThrough } from 'node:stream';
import wrapStream from './wrapStream.mjs';

test('wrapStream', () => {
  const handleData = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  const stream = new PassThrough();
  const controller = new AbortController();

  stream.on('data', handleData);
  const write = wrapStream({
    stream,
    signal: controller.signal,
    pause: () => {},
    resume: () => {},
    onError,
    onEnd,
  });
  assert(!stream.destroyed);
  assert.equal(typeof write, 'function');
  assert(stream.eventNames().includes('error'));
  assert(stream.eventNames().includes('end'));
  assert(stream.eventNames().includes('drain'));
  write(Buffer.from('aaa'));
  assert.equal(handleData.mock.calls.length, 1);
  assert.equal(handleData.mock.calls[0].arguments.toString(), 'aaa');
  write(Buffer.from('bbb'));
  assert.equal(handleData.mock.calls.length, 2);
  assert.equal(handleData.mock.calls[1].arguments.toString(), 'bbb');
  controller.abort();
  assert(!stream.eventNames().includes('error'));
  assert(!stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  assert(stream.destroyed);
  assert.throws(
    () => {
      write(Buffer.from('eee'));
    },
    (error) => error instanceof assert.AssertionError,
  );
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(onError.mock.calls.length, 0);
});
