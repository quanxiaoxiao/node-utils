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
    isEventErrorBind: true,
    isEventEndBind: true,
    isEventDrainBind: true,
    isEventCloseBind: true,
    isEventAbortBind: true,
  };

  stream.once('error', handleError);
  stream.once('end', handleEnd);
  stream.on('drain', handleDrain);
  stream.once('close', handleClose);

  function clearEvents() {
    if (state.isEventAbortBind) {
      state.isEventAbortBind = false;
      signal.removeEventListener('abort', handleAbortOnSignal);
    }
    if (state.isEventDrainBind) {
      state.isEventDrainBind = false;
      stream.off('drain', handleDrain);
    }
    if (state.isEventEndBind) {
      state.isEventEndBind = false;
      stream.off('end', handleEnd);
    }
    if (state.isEventCloseBind) {
      state.isEventCloseBind = false;
      stream.off('close', handleClose);
    }
    if (state.isEventErrorBind) {
      state.isEventErrorBind = false;
      stream.off('error', handleError);
    }
  }

  function setClose() {
    assert(state.isActive);
    state.isActive = false;
    clearEvents();
  }

  function handleDrain() {
    assert(state.isActive);
    resume();
  }

  function handleEnd() {
    state.isEventEndBind = false;
    setClose();
    if (onEnd) {
      onEnd();
    }
  }

  function handleClose() {
    state.isEventCloseBind = false;
    setClose();
    if (onError) {
      onError(new Error('close error'));
    }
  }

  function handleError(error) {
    state.isEventErrorBind = false;
    setClose();
    if (!stream.destroyed) {
      stream.destroy();
    }
    if (onError) {
      onError(error);
    } else {
      console.error(error);
    }
  }

  function handleAbortOnSignal() {
    state.isEventAbortBind = false;
    setClose();
    if (!stream.destroyed) {
      stream.destroy();
    }
  }

  signal.addEventListener('abort', handleAbortOnSignal, { once: true });

  return (chunk) => {
    assert(state.isActive && !stream.writableEnded);
    assert(stream.writable);
    if (chunk == null) {
      stream.end();
    }
    const ret = stream.write(chunk);
    if (ret === false) {
      pause();
    }
  };
};
