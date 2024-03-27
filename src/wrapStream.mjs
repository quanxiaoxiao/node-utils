/* eslint no-use-before-define: 0 */
import assert from 'node:assert';

export default ({
  stream,
  pause,
  resume,
  signal,
  onError,
  onEnd,
}) => {
  assert(stream.readable);
  assert(stream.writable);
  assert(!signal.aborted);
  assert(typeof pause === 'function');
  assert(typeof resume === 'function');

  const state = {
    isActive: true,
  };

  stream.once('error', handleError);
  stream.once('end', handleEnd);
  stream.on('drain', handleDrain);
  stream.once('close', handleClose);

  function handleDrain() {
    assert(state.isActive);
    resume();
  }

  function handleEnd() {
    state.isActive = false;
    stream.off('error', handleError);
    stream.off('close', handleClose);
    stream.off('drain', handleDrain);
    signal.removeEventListener('abort', handleAbortOnSignal);
    if (onEnd) {
      onEnd();
    }
  }

  function handleClose() {
    stream.off('drain', handleDrain);
    stream.off('end', handleEnd);
    stream.off('error', handleError);
    signal.removeEventListener('abort', handleAbortOnSignal);
    if (state.isActive) {
      state.isActive = false;
      onError(new Error('close error'));
    }
  }

  function handleError(error) {
    stream.off('drain', handleDrain);
    stream.off('end', handleEnd);
    stream.off('close', handleClose);
    signal.removeEventListener('abort', handleAbortOnSignal);
    if (!stream.destroyed) {
      stream.destroy();
    }
    if (onError) {
      if (state.isActive) {
        onError(error);
      }
    } else {
      console.error(error);
    }
    if (state.isActive) {
      state.isActive = false;
    }
  }

  function handleAbortOnSignal() {
    state.isActive = false;
    if (!stream.destroyed) {
      stream.destroy();
    }
  }

  signal.addEventListener('abort', handleAbortOnSignal, { once: true });

  return (chunk) => {
    assert(state.isActive && stream.writable && !stream.writableEnded);
    if (chunk == null) {
      stream.end();
    }
    const ret = stream.write(chunk);
    if (ret === false) {
      pause();
    }
  };
};
