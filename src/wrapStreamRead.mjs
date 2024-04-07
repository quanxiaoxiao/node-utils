/* eslint no-use-before-define: 0 */
import assert from 'node:assert';

export default ({
  stream,
  signal,
  onError,
  onData,
  onEnd,
  onPause,
}) => {
  assert(stream.readable);
  assert(typeof onData === 'function');
  assert(typeof onEnd === 'function');
  if (signal) {
    assert(!signal.aborted);
  }
  const state = {
    isActive: true,
    isEventErrorBind: true,
    isEventDataBind: true,
    isEventEndBind: true,
    isEventCloseBind: true,
    isEventAbortBind: !!signal,
  };

  stream.once('error', handleError);
  stream.once('close', handleClose);
  stream.once('end', handleEnd);
  stream.on('data', handleData);

  function handleData(chunk) {
    if (state.isActive) {
      const ret = onData(chunk);
      if (ret === false && !stream.isPaused()) {
        stream.pause();
        if (onPause) {
          onPause();
        }
      }
    }
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
    if (state.isEventEndBind) {
      state.isEventEndBind = false;
      stream.off('end', handleEnd);
    }
    if (state.isEventDataBind) {
      state.isEventDataBind = false;
      stream.off('data', handleData);
    }
    if (state.isEventCloseBind) {
      state.isEventCloseBind = false;
      stream.off('close', handleClose);
    }
  }

  function handleEnd() {
    state.isEventEndBind = false;
    clearEvents();
    unbindEventError();
    unbindEventAbort();
    if (state.isActive) {
      onEnd();
    }
    state.isActive = false;
  }

  function handleClose() {
    state.isEventCloseBind = false;
    clearEvents();
    unbindEventAbort();
    unbindEventError();
    if (state.isActive && onError) {
      onError(new Error('close error'));
    }
    state.isActive = false;
  }

  function handleError(error) {
    state.isEventErrorBind = false;
    clearEvents();
    unbindEventAbort();
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
    state.isActive = false;
  }

  function handleAbortOnSignal() {
    state.isEventAbortBind = false;
    clearEvents();
    unbindEventError();
    if (!stream.destroyed) {
      stream.destroy();
    }
    state.isActive = false;
  }

  if (signal) {
    signal.addEventListener('abort', handleAbortOnSignal, { once: true });
  }
};
