import assert from 'node:assert';
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
  assert(!stream.eventNames().includes('drain'));
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
  const onResume = mock.fn(() => {});
  const write = wrapStreamWrite({
    stream,
    onEnd,
    onResume,
    onPause,
  });
  const ret = write(Buffer.from('aaaasdfasd fasdfw'));
  assert(!ret);
  assert.equal(onPause.mock.calls.length, 1);
  assert.equal(onResume.mock.calls.length, 0);
  assert(!stream.eventNames().includes('end'));
  assert(stream.eventNames().includes('drain'));
  write();
  assert(stream.eventNames().includes('end'));
  assert(!stream.eventNames().includes('drain'));
  await waitFor(100);
});

test('wrapStreamWrite stream onResume but not set onPause', async () => {
  const stream = new PassThrough();
  const onResume = mock.fn(() => {});
  assert.throws(
    () => {
      wrapStreamWrite({
        stream,
        onResume,
      });
    },
    (error) => error instanceof assert.AssertionError,
  );
});

test('wrapStreamWrite stream abort before end', async () => {
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
