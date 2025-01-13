/* eslint no-use-before-define: 0 */
import assert from 'node:assert';
import { Readable } from 'node:stream';

export default ({
  stream,
  signal,
  onError,
  onData,
  onEnd,
  onPause,
  onAbort,
}) => {
  assert(stream instanceof Readable);
  assert(stream.readable);
  assert(typeof onData === 'function');
  if (signal) {
    assert(!signal.aborted);
  }
  const state = {
    isActive: true,
    isEventDataBind: true,
    isEventEndBind: true,
    isEventCloseBind: true,
    isEventAbortBind: !!signal,
  };

  stream.on('error', handleError);
  stream.once('close', handleClose);
  stream.once('end', handleEnd);
  stream.on('data', handleData);

  function emitError(error) {
    clearEvents();
    unbindEventAbort();
    if (!stream.destroyed) {
      stream.destroy();
    }
    if (state.isActive) {
      state.isActive = false;
      if (onError) {
        onError(error);
      } else {
        console.error(error);
      }
    }
  }

  function handleData(chunk) {
    if (state.isActive) {
      try {
        const ret = onData(chunk);
        if (ret === false && !stream.isPaused()) {
          stream.pause();
          if (onPause) {
            onPause();
          }
        }
      } catch (error) {
        emitError(error);
      }
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
    unbindEventAbort();
    if (state.isActive) {
      try {
        if (onEnd) {
          onEnd();
        }
        state.isActive = false;
      } catch (error) {
        if (onError) {
          onError(error);
        } else {
          console.error(error);
        }
      }
    }
  }

  function handleClose() {
    state.isEventCloseBind = false;
    emitError(new Error('close error'));
  }

  function handleError(error) {
    emitError(error);
  }

  function handleAbortOnSignal() {
    state.isEventAbortBind = false;
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
};
