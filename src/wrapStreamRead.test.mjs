/* eslint no-use-before-define: 0 */
import assert from 'node:assert';
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import { test, mock } from 'node:test';
import { PassThrough } from 'node:stream';
import wrapStreamRead from './wrapStreamRead.mjs';

test('wrapStreamRead', () => {
  const stream = new PassThrough();
  const controller = new AbortController();
  const onData = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  wrapStreamRead({
    signal: controller.signal,
    stream,
    onData,
    onError,
    onEnd,
  });
  assert(stream.eventNames().includes('data'));
  assert(stream.eventNames().includes('error'));
  assert(stream.eventNames().includes('end'));
  assert(stream.eventNames().includes('close'));

  stream.write('aaa');
  setTimeout(() => {
    stream.write('ccc');
  }, 20);
  setTimeout(() => {
    stream.end();
  }, 30);
  setTimeout(() => {
    assert.equal(onData.mock.calls.length, 2);
    assert.equal(onError.mock.calls.length, 0);
    assert.equal(onEnd.mock.calls.length, 1);
    assert(!stream.eventNames().includes('data'));
    assert(!stream.eventNames().includes('error'));
    assert(!stream.eventNames().includes('end'));
    assert(!stream.eventNames().includes('close'));
  }, 1000);
});

test('wrapStreamRead close onError', () => {
  const stream = new PassThrough();
  const onData = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  wrapStreamRead({
    stream,
    onData,
    onError,
    onEnd,
  });

  stream.write('aaa');
  setTimeout(() => {
    stream.write('ccc');
  }, 20);
  setTimeout(() => {
    stream.destroy();
  }, 30);
  setTimeout(() => {
    assert.equal(onData.mock.calls.length, 2);
    assert.equal(onError.mock.calls.length, 1);
    assert.equal(onEnd.mock.calls.length, 0);
    assert(!stream.eventNames().includes('data'));
    assert(!stream.eventNames().includes('error'));
    assert(!stream.eventNames().includes('end'));
    assert(!stream.eventNames().includes('close'));
  }, 1000);
});

test('wrapStreamRead emit error', () => {
  const stream = new PassThrough();
  const onData = mock.fn(() => {});
  const onError = mock.fn((error) => {
    assert.equal(error.message, 'xxx');
  });
  const onEnd = mock.fn(() => {});
  wrapStreamRead({
    stream,
    onData,
    onError,
    onEnd,
  });

  stream.write('aaa');
  setTimeout(() => {
    stream.write('ccc');
  }, 20);
  setTimeout(() => {
    stream.emit('error', new Error('xxx'));
  }, 30);
  setTimeout(() => {
    assert(stream.destroyed);
    assert.equal(onData.mock.calls.length, 2);
    assert.equal(onError.mock.calls.length, 1);
    assert.equal(onEnd.mock.calls.length, 0);
    assert(!stream.eventNames().includes('data'));
    assert(!stream.eventNames().includes('error'));
    assert(!stream.eventNames().includes('end'));
    assert(!stream.eventNames().includes('close'));
  }, 1000);
});

test('wrapStreamRead abort', () => {
  const stream = new PassThrough();
  const controller = new AbortController();
  const onData = mock.fn(() => {});
  const onError = mock.fn((error) => {
    assert.equal(error.message, 'xxx');
  });
  const onEnd = mock.fn(() => {});
  wrapStreamRead({
    signal: controller.signal,
    stream,
    onData,
    onError,
    onEnd,
  });

  stream.write('aaa');
  setTimeout(() => {
    stream.write('ccc');
  }, 20);
  setTimeout(() => {
    controller.abort();
  }, 30);
  setTimeout(() => {
    assert(stream.destroyed);
    assert.equal(onData.mock.calls.length, 2);
    assert.equal(onError.mock.calls.length, 0);
    assert.equal(onEnd.mock.calls.length, 0);
    assert(!stream.eventNames().includes('data'));
    assert(!stream.eventNames().includes('error'));
    assert(!stream.eventNames().includes('end'));
    assert(!stream.eventNames().includes('close'));
  }, 1000);
});

test('wrapStreamRead pause', () => {
  const isPaused = false;
  const count = 3000;
  let i = 0;
  const content = 'asdfwefasdfw asdfw';
  const pathname = path.resolve(process.cwd(), 'test_wrapperStreamRead_111');
  const ws = fs.createWriteStream(pathname);
  const stream = new PassThrough();
  const handleDrain = mock.fn(() => {
    assert(stream.isPaused());
    stream.resume();
    walk();
  });
  ws.on('drain', handleDrain);
  const onData = mock.fn((chunk) => ws.write(chunk));
  const onError = mock.fn(() => {
    throw new Error('asdfw');
  });
  const onPause = mock.fn(() => {});
  const onEnd = mock.fn(() => {
    assert(handleDrain.mock.calls.length > 0);
    assert(onPause.mock.calls.length > 0);
    ws.end();
  });
  ws.on('finish', () => {
    const buf = fs.readFileSync(pathname);
    fs.unlinkSync(pathname);
    assert(new RegExp(`:${count - 1}$`).test(buf.toString()));
  });

  wrapStreamRead({
    stream,
    onData,
    onError,
    onEnd,
    onPause,
  });

  function walk() {
    while (!isPaused && i < count) {
      const s = `${new Array(800).fill(content).join('')}:${i}`;
      stream.write(s);
      i++;
    }
    if (i >= count) {
      if (!stream.writableEnded) {
        stream.end();
      }
    }
  }
  setTimeout(() => {
    walk();
  }, 100);
});
