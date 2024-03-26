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

  function handleDrain() {
    assert(state.isActive);
    resume();
  }

  function handleEnd() {
    state.isActive = false;
    stream.off('error', handleError);
    stream.off('drain', handleDrain);
    signal.removeEventListener('abort', handleAbortOnSignal);
    if (onEnd) {
      onEnd();
    }
  }

  function handleAbortOnSignal() {
    state.isActive = false;
    stream.off('error', handleError);
    stream.off('drain', handleDrain);
    stream.off('end', handleEnd);
    if (!stream.destroyed) {
      stream.destroy();
    }
  }

  function handleError(error) {
    state.isActive = false;
    stream.off('drain', handleDrain);
    stream.off('end', handleEnd);
    signal.removeEventListener('abort', handleAbortOnSignal);
    if (!stream.destroyed) {
      stream.destroy();
    }
    if (onError) {
      onError(error);
    } else {
      console.error(error);
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
