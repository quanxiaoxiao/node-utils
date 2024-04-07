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
    bytes: 0,
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
    if (state.isActive && onDrain) {
      onDrain();
    }
  }

  function handleEnd() {
    state.isEventEndBind = false;
    unbindEventClose();
    unbindEventError();
    unbindEventAbort();
    if (state.isActive && onEnd) {
      onEnd(state.bytes);
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
    state.isActive = false;
  }

  function handleFinish() {
    state.isEventFinishBind = false;
    unbindEventClose();
    unbindEventError();
    unbindEventAbort();
    if (state.isActive && onEnd) {
      onEnd(state.bytes);
    }
    state.isActive = false;
  }

  function handleAbortOnSignal() {
    state.isEventAbortBind = false;
    unbindEventClose();
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

  return (chunk) => {
    assert(!state.isEventEndBind);
    assert(state.isActive);
    assert(!stream.destroyed);
    assert(stream.writable && !stream.writableEnded);
    if (chunk == null) {
      clearEvents();
      if (state.bytes === 0) {
        unbindEventClose();
        unbindEventError();
        state.isActive = false;
        if (onEnd) {
          onEnd(0);
        }
        stream.destroy();
        return null;
      }
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
    state.bytes += Buffer.byteLength(chunk);
    const ret = stream.write(chunk);
    if (onPause && ret === false) {
      onPause();
    }
    return ret;
  };
};
