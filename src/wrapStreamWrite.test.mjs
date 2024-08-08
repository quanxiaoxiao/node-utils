/* eslint no-use-before-define: 0 */
import assert from 'node:assert';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { test, mock } from 'node:test';
import { PassThrough } from 'node:stream';
import wrapStreamWrite from './wrapStreamWrite.mjs';

const waitFor = async (t = 100) => {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, t);
  });
};

test('wrapStreamWrite', async () => {
  const handleData = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  const stream = new PassThrough();
  const controller = new AbortController();

  stream.on('data', handleData);
  const write = wrapStreamWrite({
    stream,
    signal: controller.signal,
    onError,
    onEnd,
  });
  assert(!stream.destroyed);
  assert.equal(typeof write, 'function');
  assert(stream.eventNames().includes('error'));
  assert(stream.eventNames().includes('close'));
  assert(!stream.eventNames().includes('end'));
  assert(stream.eventNames().includes('drain'));
  write(Buffer.from('aaa'));
  assert.equal(handleData.mock.calls.length, 1);
  assert.equal(handleData.mock.calls[0].arguments.toString(), 'aaa');
  write(Buffer.from('bbb'));
  assert.equal(handleData.mock.calls.length, 2);
  assert.equal(handleData.mock.calls[1].arguments.toString(), 'bbb');
  controller.abort();
  await waitFor(100);
  assert(!stream.eventNames().includes('error'));
  assert(!stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  assert(!stream.eventNames().includes('close'));
  assert(stream.destroyed);
  assert.throws(
    () => {
      write(Buffer.from('eee'));
    },
    (error) => error instanceof assert.AssertionError,
  );
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(onError.mock.calls.length, 0);
  assert.equal(handleData.mock.calls.length, 2);
});

test('wrapStreamWrite signal abort', async () => {
  const controller = new AbortController();
  const stream = new PassThrough();
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  const handleData = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'ccc');
  });
  stream.on('data', handleData);
  const write = wrapStreamWrite({
    stream,
    signal: controller.signal,
    onError,
    onEnd,
  });
  write(Buffer.from('ccc'));
  controller.abort();
  assert(stream.eventNames().includes('error'));
  assert(!stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  assert(!stream.eventNames().includes('close'));
  assert(stream.destroyed);
  assert.throws(
    () => {
      write(Buffer.from('bbb'));
    },
    (error) => error instanceof assert.AssertionError,
  );
  await waitFor(200);
  assert(!stream.eventNames().includes('error'));
  assert.equal(onError.mock.calls.length, 0);
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(handleData.mock.calls.length, 1);
});

test('wrapStreamWrite stream destroy', async () => {
  const stream = new PassThrough();
  const onError = mock.fn((error) => {
    assert.equal(error.message, 'close error');
  });
  const onEnd = mock.fn(() => {});
  const handleData = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'ccc');
  });
  stream.on('data', handleData);
  const write = wrapStreamWrite({
    stream,
    onError,
    onEnd,
  });
  write(Buffer.from('ccc'));
  assert(!stream.destroyed);
  stream.destroy();
  assert(stream.destroyed);
  assert(stream.eventNames().includes('error'));
  await waitFor(100);
  assert(!stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  assert(!stream.eventNames().includes('close'));
  assert.equal(onError.mock.calls.length, 1);
  assert.throws(
    () => {
      write(Buffer.from('bbb'));
    },
    (error) => error instanceof assert.AssertionError,
  );
  await waitFor(200);
  assert(!stream.eventNames().includes('error'));
  assert.equal(onError.mock.calls.length, 1);
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(handleData.mock.calls.length, 1);
});

test('wrapStreamWrite stream end', async () => {
  const stream = new PassThrough();
  const onError = mock.fn((error) => {
    assert.equal(error.message, 'close error');
  });
  const onEnd = mock.fn(() => {});
  const handleData = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'ccc');
  });
  stream.on('data', handleData);
  const write = wrapStreamWrite({
    stream,
    onError,
    onEnd,
  });
  write(Buffer.from('ccc'));
  stream.end();
  await waitFor(50);
  assert(stream.destroyed);
  assert(stream.eventNames().includes('error'));
  assert(!stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  assert(!stream.eventNames().includes('close'));
  assert.equal(onError.mock.calls.length, 1);
  assert.throws(
    () => {
      write(Buffer.from('bbb'));
    },
    (error) => error instanceof assert.AssertionError,
  );
  await waitFor(200);
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(handleData.mock.calls.length, 1);
});

test('wrapStreamWrite stream with end', async () => {
  const stream = new PassThrough();
  const onError = mock.fn((error) => {
    assert.equal(error.message, 'close error');
  });
  const onEnd = mock.fn((size) => {
    assert(size > 0);
  });
  const handleData = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'ccc');
  });
  stream.on('data', handleData);
  const controller = new AbortController();
  const write = wrapStreamWrite({
    stream,
    onError,
    onEnd,
    signal: controller.signal,
  });
  write(Buffer.from('ccc'));
  write();
  await waitFor(50);
  assert(stream.destroyed);
  assert(stream.eventNames().includes('error'));
  assert(!stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  assert(!stream.eventNames().includes('close'));
  assert.equal(onError.mock.calls.length, 0);
  assert.throws(
    () => {
      write(Buffer.from('bbb'));
    },
    (error) => error instanceof assert.AssertionError,
  );
  await waitFor(200);
  assert.equal(onError.mock.calls.length, 0);
  assert.equal(onEnd.mock.calls.length, 1);
  assert.equal(handleData.mock.calls.length, 1);
});

test('wrapStreamWrite stream trigger error', async () => {
  const stream = new PassThrough();
  const onError = mock.fn((error) => {
    assert.equal(error.message, 'aaa');
  });
  const onEnd = mock.fn(() => {});
  const handleData = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'ccc');
  });
  stream.on('data', handleData);
  const controller = new AbortController();
  const write = wrapStreamWrite({
    stream,
    onError,
    onEnd,
    signal: controller.signal,
  });
  write(Buffer.from('ccc'));
  stream.emit('error', new Error('aaa'));
  await waitFor(100);
  assert(stream.destroyed);
  assert(!stream.eventNames().includes('error'));
  assert(!stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  assert(!stream.eventNames().includes('close'));
  assert.equal(onError.mock.calls.length, 1);
  assert.throws(
    () => {
      write(Buffer.from('bbb'));
    },
    (error) => error instanceof assert.AssertionError,
  );
  await waitFor(200);
  assert.equal(onError.mock.calls.length, 1);
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(handleData.mock.calls.length, 1);
});

test('wrapStreamWrite stream trigger error 2', async () => {
  const stream = new PassThrough();
  const onEnd = mock.fn(() => {});
  const handleData = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'ccc');
  });
  stream.on('data', handleData);
  const controller = new AbortController();
  const write = wrapStreamWrite({
    stream,
    onEnd,
    signal: controller.signal,
  });
  write(Buffer.from('ccc'));
  stream.emit('error', new Error('aaa'));
  await waitFor(100);
  assert(stream.destroyed);
  assert(!stream.eventNames().includes('error'));
  assert(!stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  assert(!stream.eventNames().includes('close'));
  assert.throws(
    () => {
      write(Buffer.from('bbb'));
    },
    (error) => error instanceof assert.AssertionError,
  );
  await waitFor(200);
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(handleData.mock.calls.length, 1);
});

test('wrapStreamWrite stream pause', async () => {
  const stream = new PassThrough({
    highWaterMark: 5,
  });
  const onEnd = mock.fn(() => {});
  const onPause = mock.fn(() => {});
  const onDrain = mock.fn(() => {});
  const write = wrapStreamWrite({
    stream,
    onEnd,
    onDrain,
    onPause,
  });
  const ret = write(Buffer.from('aaaasdfasd 11asdf'));
  assert(!ret);
  assert.equal(onPause.mock.calls.length, 1);
  assert.equal(onDrain.mock.calls.length, 0);
  assert(!stream.eventNames().includes('end'));
  assert(stream.eventNames().includes('drain'));
  write();
  assert(stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  await waitFor(100);
});

test('wrapStreamWrite stream abort before end', () => {
  const stream = new PassThrough();
  const controller = new AbortController();
  const onEnd = mock.fn(() => {});

  const onError = mock.fn(() => {});

  const write = wrapStreamWrite({
    stream,
    signal: controller.signal,
    onEnd,
    onError,
  });
  write(Buffer.from('aaa'));
  setTimeout(() => {
    write(Buffer.from('bbb'));
  }, 10);
  setTimeout(() => {
    write();
  }, 30);
  setTimeout(() => {
    assert(stream.writableEnded);
    assert(!stream.destroyed);
    controller.abort();
    assert(stream.destroyed);
  }, 100);
  setTimeout(() => {
    assert.equal(onEnd.mock.calls.length, 0);
  }, 150);
});

test('wrapStreamWrite stream destroy', () => {
  const stream = new PassThrough();
  const onEnd = mock.fn(() => {});

  const onError = mock.fn(() => {});

  const write = wrapStreamWrite({
    stream,
    onEnd,
    onError,
  });
  write(Buffer.from('aaa'));
  setTimeout(() => {
    stream.destroy();
  }, 10);
  setTimeout(() => {
    try {
      write(Buffer.from('ccc'));
      throw new Error('xxx');
    } catch (error) {
      assert(error instanceof assert.AssertionError);
      assert(!stream.eventNames().includes('drain'));
      assert(!stream.eventNames().includes('close'));
    }
  }, 30);
});

test('wrapStreamWrite stream no resume', () => {
  const stream = new PassThrough();
  const onEnd = mock.fn(() => {});

  const onError = mock.fn(() => {});

  const write = wrapStreamWrite({
    stream,
    onEnd,
    onError,
  });
  write(Buffer.from('aaa'));
  setTimeout(() => {
    write();
  }, 10);
  setTimeout(() => {
    assert(stream.writableEnded);
    assert(!stream.destroyed);
    assert(stream.eventNames().includes('close'));
    assert(stream.eventNames().includes('end'));
    stream.destroy();
  }, 30);
  setTimeout(() => {
    assert.equal(onEnd.mock.calls.length, 0);
    assert.equal(onError.mock.calls.length, 1);
    assert(!stream.eventNames().includes('close'));
    assert(!stream.eventNames().includes('end'));
  }, 50);
});

test('wrapStreamWrite stream writable', async () => {
  const pathname = path.resolve(process.cwd(), `test_${Date.now()}_111`);
  const ws = fs.createWriteStream(pathname);
  const onEnd = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const write = wrapStreamWrite({
    stream: ws,
    onEnd,
    onError,
  });
  write('111');
  write(Buffer.from('222'));
  write();
  await waitFor(200);
  assert.equal(onEnd.mock.calls.length, 1);
  assert.equal(onError.mock.calls.length, 0);
  const buf = fs.readFileSync(pathname);
  assert.equal(buf.toString(), '111222');
  fs.unlinkSync(pathname);
});

test('wrapStreamWrite stream writable, stream close error', async () => {
  const pathname = path.resolve(process.cwd(), `test_${Date.now()}_222`);
  const ws = fs.createWriteStream(pathname);
  const onEnd = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const write = wrapStreamWrite({
    stream: ws,
    onEnd,
    onError,
  });
  write('111');
  write(Buffer.from('222'));
  await waitFor(100);
  ws.destroy();
  await waitFor(200);
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(onError.mock.calls.length, 1);
  const buf = fs.readFileSync(pathname);
  assert.equal(buf.toString(), '111222');
  fs.unlinkSync(pathname);
});

test('wrapStreamWrite stream writable, onPause', async () => {
  let isPaused = false;
  let isClose = false;
  let i = 0;
  const count = 8000;
  const content = 'adsfasdfw';
  const pathname = path.resolve(process.cwd(), `test_${Date.now()}_333`);
  const ws = fs.createWriteStream(pathname);
  const onEnd = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const onPause = mock.fn(() => {
    isPaused = true;
  });
  const onDrain = mock.fn(() => {
    isPaused = false;
    walk();
  });
  const write = wrapStreamWrite({
    stream: ws,
    onEnd,
    onError,
    onPause,
    onDrain,
  });
  function walk() {
    while (!isPaused && i < count) {
      const s = `${new Array(800).fill(content).join('')}:${i}`;
      write(s);
      i++;
    }
    if (i >= count && !isClose) {
      isClose = true;
      write();
    }
  }
  setTimeout(() => {
    walk();
  }, 10);
  await waitFor(3000);
  assert.equal(onError.mock.calls.length, 0);
  assert(onPause.mock.calls.length > 0);
  assert(onDrain.mock.calls.length > 0);
  assert.equal(onError.mock.calls.length, 0);
  const buf = fs.readFileSync(pathname);
  assert(new RegExp(`:${count - 1}$`).test(buf.toString()));
  fs.unlinkSync(pathname);
});

test('wrapStreamWrite stream writable, abort', async () => {
  let i = 0;
  let isPaused = false;
  const controller = new AbortController();
  const content = 'adsfasdfw';
  const pathname = path.resolve(process.cwd(), `test_${Date.now()}_444`);
  const ws = fs.createWriteStream(pathname);
  const onEnd = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const onPause = mock.fn(() => {
    isPaused = true;
    if (i >= 3000 && !controller.signal.aborted) {
      controller.abort();
      setTimeout(() => {
        fs.unlinkSync(pathname);
        assert(ws.destroyed);
      }, 100);
    }
  });
  const onDrain = mock.fn(() => {
    isPaused = false;
    walk();
  });
  const write = wrapStreamWrite({
    signal: controller.signal,
    stream: ws,
    onEnd,
    onError,
    onPause,
    onDrain,
  });
  function walk() {
    while (!isPaused) {
      const s = `${new Array(800).fill(content).join('')}:${i}`;
      write(s);
      i++;
    }
  }
  setTimeout(() => {
    walk();
  }, 100);
});

test('wrapStreamWrite with empty', () => {
  const stream = new PassThrough();
  const onEnd = mock.fn((size) => {
    assert.equal(size, 0);
  });
  const onError = mock.fn(() => {});
  const write = wrapStreamWrite({
    stream,
    onEnd,
    onError,
  });
  setTimeout(() => {
    write();
  }, 10);
  setTimeout(() => {
    assert.equal(onError.mock.calls.length, 0);
    assert.equal(onEnd.mock.calls.length, 1);
  }, 100);
});

test('wrapStreamWrite write with callback', async () => {
  const stream = new PassThrough();
  const handleData = mock.fn(() => {});
  const onEnd = mock.fn((size) => {
    assert.equal(size, 6);
  });
  const readEnd = mock.fn((size) => {
    assert.equal(size, 6);
  });
  stream.on('data', handleData);
  const onError = mock.fn(() => {});
  const write = wrapStreamWrite({
    stream,
    onEnd,
    onError,
  });
  assert.equal(handleData.mock.calls.length, 0);
  write(Buffer.from('aa'));
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(handleData.mock.calls.length, 1);
  write(Buffer.from('bbce'));
  assert.equal(onEnd.mock.calls.length, 0);
  assert.equal(handleData.mock.calls.length, 2);
  write(readEnd);
  await waitFor(100);
  assert.equal(onEnd.mock.calls.length, 1);
  assert.equal(readEnd.mock.calls.length, 1);
  assert.throws(() => {
    write(() => {});
  });
  await waitFor(100);
  assert.equal(onEnd.mock.calls.length, 1);
  assert.equal(readEnd.mock.calls.length, 1);
});
