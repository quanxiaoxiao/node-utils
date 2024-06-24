/* eslint no-use-before-define: 0 */
import assert from 'node:assert';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
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

test('wrapStreamRead 2', () => {
  const stream = new PassThrough();
  for (let i = 0; i < 300; i++) {
    stream.write(Buffer.from(`aaaa:${i}`));
  }
  stream.end();
  const onData = mock.fn(() => {
  });
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  wrapStreamRead({
    stream,
    onData,
    onError,
    onEnd,
  });
  assert(stream.eventNames().includes('data'));
  assert(stream.eventNames().includes('error'));
  assert(stream.eventNames().includes('end'));
  assert(stream.eventNames().includes('close'));

  setTimeout(() => {
    assert.equal(onData.mock.calls.length, 300);
    assert.equal(onError.mock.calls.length, 0);
    assert.equal(onEnd.mock.calls.length, 1);
    assert(!stream.eventNames().includes('data'));
    assert(!stream.eventNames().includes('error'));
    assert(!stream.eventNames().includes('end'));
    assert(!stream.eventNames().includes('close'));
  }, 1000);
});

test('wrapStreamRead 3', () => {
  const stream = new PassThrough();
  for (let i = 0; i < 300; i++) {
    stream.write(Buffer.from(`aaaa:${i}`));
  }
  stream.end();
  stream.pause();
  const onData = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  wrapStreamRead({
    stream,
    onData,
    onError,
    onEnd,
  });
  assert(stream.eventNames().includes('data'));
  assert(stream.eventNames().includes('error'));
  assert(stream.eventNames().includes('end'));
  assert(stream.eventNames().includes('close'));

  setTimeout(() => {
    assert.equal(onData.mock.calls.length, 0);
    assert.equal(onError.mock.calls.length, 0);
    assert.equal(onEnd.mock.calls.length, 0);
    assert(stream.eventNames().includes('data'));
    assert(stream.eventNames().includes('error'));
    assert(stream.eventNames().includes('end'));
    assert(stream.eventNames().includes('close'));
    stream.resume();
  }, 1000);
  setTimeout(() => {
    assert.equal(onData.mock.calls.length, 300);
    assert.equal(onError.mock.calls.length, 0);
    assert.equal(onEnd.mock.calls.length, 1);
    assert(!stream.eventNames().includes('data'));
    assert(!stream.eventNames().includes('error'));
    assert(!stream.eventNames().includes('end'));
    assert(!stream.eventNames().includes('close'));
  }, 1500);
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

test('wrapStreamRead abort', () => {
  let i = 0;
  let isPaused = false;
  const content = 'asdfwefasdfw asdfw';
  const stream = new PassThrough();
  const controller = new AbortController();
  const pathname = path.resolve(process.cwd(), 'test_wrapperStreamRead_222');
  const ws = fs.createWriteStream(pathname);
  const handleDrain = mock.fn(() => {
    assert(stream.isPaused());
    isPaused = false;
    stream.resume();
    if (!controller.signal.aborted) {
      walk();
    }
  });
  ws.on('drain', handleDrain);

  const onData = mock.fn((chunk) => ws.write(chunk));
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  const onPause = mock.fn(() => {
    isPaused = true;
  });

  wrapStreamRead({
    signal: controller.signal,
    stream,
    onData,
    onError,
    onEnd,
    onPause,
  });

  function walk() {
    while (!isPaused) {
      const s = `${new Array(800).fill(content).join('')}:${i}`;
      stream.write(s);
      i++;
    }
  }
  setTimeout(() => {
    walk();
  }, 100);

  setTimeout(() => {
    controller.abort();
    ws.end();
    setTimeout(() => {
      assert(stream.destroyed);
      assert.equal(onError.mock.calls.length, 0);
      assert.equal(onEnd.mock.calls.length, 0);
      assert(onData.mock.calls.length > 0);
      assert(onPause.mock.calls.length > 0);
      fs.unlinkSync(pathname);
    }, 100);
  }, 3000);
});

test('wrapStreamRead onData trigger error', () => {
  let i = 0;
  const stream = new PassThrough();
  const onData = mock.fn(() => {
    if (i === 2) {
      throw new Error('xxx');
    }
    i++;
  });
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

  setTimeout(() => {
    stream.write('111');
  }, 20);
  setTimeout(() => {
    stream.write('222');
  }, 30);
  setTimeout(() => {
    stream.write('333');
  }, 40);

  setTimeout(() => {
    assert.equal(onError.mock.calls.length, 1);
    assert.equal(onData.mock.calls.length, 3);
    assert.equal(onEnd.mock.calls.length, 0);
    assert(stream.destroyed);
  }, 100);
});

test('wrapStreamRead 1', () => {
  const pathname = path.resolve(process.cwd(), 'package-lock.json');
  const onData = mock.fn(() => {});
  const ws = fs.createReadStream(pathname);
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {});
  const stream = new PassThrough();
  ws.pause();
  wrapStreamRead({
    stream,
    onData,
    onEnd,
    onError,
  });
  ws.pipe(stream);
  setTimeout(() => {
    assert.equal(onError.mock.calls.length, 0);
    assert(onData.mock.calls.length > 0);
    assert.equal(onEnd.mock.calls.length, 1);
    assert.equal(
      Buffer.concat(onData.mock.calls.map((d) => d.arguments[0])).toString(),
      fs.readFileSync(pathname).toString(),
    );
    onData
  }, 500);
});

test('wrapStreamRead onEnd trigger error', () => {
  const stream = new PassThrough();
  const onData = mock.fn(() => {});
  const onError = mock.fn(() => {});
  const onEnd = mock.fn(() => {
    throw new Error('xxx');
  });
  wrapStreamRead({
    stream,
    onData,
    onEnd,
    onError,
  });
  stream.write('aaa');
  stream.write('bbb');
  stream.end();
  setTimeout(() => {
    assert.equal(onData.mock.calls.length, 2);
    assert.equal(onError.mock.calls.length, 1);
    assert.equal(onError.mock.calls[0].arguments[0].message, 'xxx');
  }, 500);
});
