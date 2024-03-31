/* eslint no-use-before-define: 0 */
import assert from 'node:assert';

export default ({
  stream,
  signal,
  onPause,
  onDrain,
  onError,
  onEnd,
}) => {
  assert(stream.readable);
  assert(stream.writable);
  if (signal) {
    assert(!signal.aborted);
  }

  if (onDrain) {
    assert(typeof onPause === 'function');
  }

  const state = {
    isActive: true,
    isEventErrorBind: true,
    isEventEndBind: false,
    isEventDrainBind: !!onDrain,
    isEventCloseBind: true,
    isEventAbortBind: !!signal,
  };

  stream.once('error', handleError);
  stream.once('close', handleClose);

  if (onDrain) {
    stream.on('drain', handleDrain);
  }

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

  function unbindEventAbort() {
    if (state.isEventAbortBind) {
      state.isEventAbortBind = false;
      signal.removeEventListener('abort', handleAbortOnSignal);
    }
  }

  function clearEvents() {
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
    onDrain();
  }

  function handleEnd() {
    assert(state.isActive);
    state.isEventEndBind = false;
    state.isActive = false;
    unbindEventError();
    unbindEventAbort();
    if (onEnd) {
      onEnd();
    }
  }

  function handleClose() {
    assert(state.isActive);
    state.isActive = false;
    state.isEventCloseBind = false;
    clearEvents();
    unbindEventAbort();
    unbindEventError();
    if (onError) {
      onError(new Error('close error'));
    }
  }

  function handleError(error) {
    state.isEventErrorBind = false;
    clearEvents();
    unbindEventAbort();
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
    assert(!state.isEventEndBind);
    assert(state.isActive);
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
