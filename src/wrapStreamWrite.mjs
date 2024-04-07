/* eslint no-use-before-define: 0 */
import assert from 'node:assert';
import { Readable } from 'node:stream';

export default ({
  stream,
  signal,
  onPause,
  onDrain,
  onError,
  onEnd,
}) => {
  assert(stream.writable);
  if (stream instanceof Readable) {
    assert(stream.readable);
  }
  if (signal) {
    assert(!signal.aborted);
  }

  const state = {
    isActive: true,
    isEventErrorBind: true,
    isEventEndBind: false,
    isEventDrainBind: true,
    isEventCloseBind: true,
    isEventFinishBind: false,
    isEventAbortBind: !!signal,
  };

  stream.once('error', handleError);
  stream.once('close', handleClose);
  stream.on('drain', handleDrain);

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

  function unbindEventClose() {
    if (state.isEventCloseBind) {
      state.isEventCloseBind = false;
      stream.off('close', handleClose);
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
    if (state.isEventEndBind) {
      state.isEventEndBind = false;
      stream.off('end', handleEnd);
    }
    if (state.isEventFinishBind) {
      state.isEventFinishBind = false;
      stream.off('finish', handleFinish);
    }
  }

  function handleDrain() {
    assert(state.isActive);
    if (onDrain) {
      onDrain();
    }
  }

  function handleEnd() {
    assert(state.isActive);
    state.isEventEndBind = false;
    state.isActive = false;
    unbindEventClose();
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
    unbindEventClose();
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
    if (state.isActive) {
      state.isActive = false;
    }
  }

  function handleFinish() {
    assert(state.isActive);
    state.isEventFinishBind = false;
    state.isActive = false;
    unbindEventClose();
    unbindEventError();
    unbindEventAbort();
    if (onEnd) {
      onEnd();
    }
  }

  function handleAbortOnSignal() {
    assert(state.isActive);
    state.isActive = false;
    state.isEventAbortBind = false;
    unbindEventClose();
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
      if (stream instanceof Readable) {
        state.isEventEndBind = true;
        stream.once('end', handleEnd);
      } else {
        state.isEventFinishBind = true;
        stream.once('finish', handleFinish);
      }
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
