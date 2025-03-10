/* eslint no-use-before-define: 0 */
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import { Readable, Writable } from 'node:stream';

export default ({
  stream,
  signal,
  onPause,
  onDrain,
  onError,
  onEnd,
  onAbort,
}) => {
  assert(stream instanceof Writable);
  assert(stream.writable);
  if (stream instanceof Readable) {
    assert(stream.readable);
  }
  if (signal) {
    assert(!signal.aborted);
  }

  const state = {
    isActive: true,
    isEventEndBind: false,
    isEventDrainBind: true,
    isEventCloseBind: true,
    isEventFinishBind: false,
    isEventAbortBind: !!signal,
    bytes: 0,
  };

  stream.on('error', handleError);
  stream.once('close', handleClose);
  stream.on('drain', handleDrain);

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
    if (!state.isActive) {
      return;
    }
    state.isEventEndBind = false;
    unbindEventClose();
    unbindEventAbort();
    if (onEnd) {
      onEnd(state.bytes);
    }
    if (state._onEnd) {
      state._onEnd(state.bytes);
    }
    state.isActive = false;
  }

  function handleClose() {
    state.isEventCloseBind = false;
    clearEvents();
    unbindEventAbort();
    if (state.isActive && onError) {
      onError(new Error('close error'));
    }
    state.isActive = false;
  }

  function handleError(error) {
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
    unbindEventAbort();
    if (state.isActive) {
      if (onEnd) {
        onEnd(state.bytes);
      }
      if (state._onEnd) {
        state._onEnd(state.bytes);
      }
    }
    state.isActive = false;
  }

  function handleAbortOnSignal() {
    state.isEventAbortBind = false;
    unbindEventClose();
    clearEvents();
    if (!stream.destroyed) {
      stream.destroy();
    }
    state.isActive = false;
    if (onAbort) {
      onAbort();
    }
  }

  if (signal) {
    signal.addEventListener('abort', handleAbortOnSignal, { once: true });
  }

  return (chunk) => {
    assert(!state.isEventEndBind);
    assert(state.isActive);
    assert(!stream.destroyed);
    assert(stream.writable && !stream.writableEnded);
    if (chunk == null || typeof chunk === 'function') {
      clearEvents();
      if (typeof chunk === 'function') {
        state._onEnd = chunk;
      }
      if (state.bytes === 0) {
        unbindEventClose();
        state.isActive = false;
        if (onEnd) {
          onEnd(0);
        }
        if (state._onEnd) {
          state._onEnd(0);
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
