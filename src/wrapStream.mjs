/* eslint no-use-before-define: 0 */
import assert from 'node:assert';

export default ({
  stream,
  signal,
  onPause,
  onResume,
  onError,
  onEnd,
}) => {
  assert(stream.readable);
  assert(stream.writable);
  if (signal) {
    assert(!signal.aborted);
  }

  const state = {
    isActive: true,
    isEventErrorBind: true,
    isEventEndBind: false,
    isEventDrainBind: true,
    isEventCloseBind: true,
    isEventAbortBind: !!signal,
  };

  stream.once('error', handleError);
  stream.on('drain', handleDrain);
  stream.once('close', handleClose);

  function unbindEventError() {
    if (state.isEventErrorBind) {
      setTimeout(() => {
        if (state.isEventErrorBind) {
          state.isEventErrorBind = false;
          stream.off('error', handleError);
        }
      }, 100);
    }
  }

  function clearEvents() {
    if (state.isEventAbortBind) {
      state.isEventAbortBind = false;
      signal.removeEventListener('abort', handleAbortOnSignal);
    }
    if (state.isEventDrainBind) {
      state.isEventDrainBind = false;
      stream.off('drain', handleDrain);
    }
    if (state.isEventCloseBind) {
      state.isEventCloseBind = false;
      stream.off('close', handleClose);
    }
  }

  function handleDrain() {
    assert(state.isActive);
    if (onResume) {
      onResume();
    }
  }

  function handleEnd() {
    state.isEventEndBind = false;
    state.isActive = false;
    unbindEventError();
    if (onEnd) {
      onEnd();
    }
  }

  function handleClose() {
    assert(state.isActive);
    state.isActive = false;
    state.isEventCloseBind = false;
    clearEvents();
    unbindEventError();
    if (onError) {
      onError(new Error('close error'));
    }
  }

  function handleError(error) {
    state.isEventErrorBind = false;
    clearEvents();
    if (state.isEventEndBind) {
      state.isEventEndBind = false;
      stream.off('end', handleEnd);
    }
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
    assert(state.isActive);
    state.isActive = false;
    state.isEventAbortBind = false;
    clearEvents();
    unbindEventError();
    if (!stream.destroyed) {
      stream.destroy();
    }
  }

  if (signal) {
    signal.addEventListener('abort', handleAbortOnSignal, { once: true });
  }

  return (chunk) => {
    assert(state.isActive);
    assert(!state.isEventEndBind);
    assert(stream.writable && !stream.writableEnded);
    if (chunk == null) {
      clearEvents();
      state.isEventEndBind = true;
      stream.once('end', handleEnd);
      stream.end();
      return null;
    }
    const ret = stream.write(chunk);
    if (onPause && ret === false) {
      onPause();
    }
    return ret;
  };
};
