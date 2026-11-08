// Serialize native calls so a slow enable cannot outlive the final release.
export function createPasswordCapture(capture, key, onError = () => {}) {
  let queue = Promise.resolve(),
    timer,
    disposed = false;
  const run = (enable) =>
    (queue = queue
      .then(() =>
        enable
          ? capture.preventScreenCaptureAsync(key)
          : capture.allowScreenCaptureAsync(key),
      )
      .catch(onError));
  return {
    focus() {
      clearTimeout(timer);
      if (!disposed) return run(true);
    },
    blur() {
      clearTimeout(timer);
      timer = setTimeout(() => run(false), 0);
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      return run(false);
    },
  };
}
