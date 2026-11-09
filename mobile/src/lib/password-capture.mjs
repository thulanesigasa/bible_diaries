// Serialize native calls so a slow enable cannot outlive the final release.
export function createPasswordCapture(capture, key, onError = () => {}) {
  let queue = Promise.resolve(),
    timer,
    disposed = false;
  const reasons = new Set();
  const run = (enable) =>
    (queue = queue
      .then(() =>
        enable
          ? capture.preventScreenCaptureAsync(key)
          : capture.allowScreenCaptureAsync(key),
      )
      .then(() => true)
      .catch(() => { onError(); return false; }));
  return {
    focus(reason = 'focus') {
      clearTimeout(timer);
      if (!disposed) { reasons.add(reason); return run(true); }
    },
    blur(reason = 'focus') {
      clearTimeout(timer);
      reasons.delete(reason);
      timer = setTimeout(() => { if (!reasons.size) run(false); }, 0);
    },
    dispose() {
      disposed = true;
      reasons.clear();
      clearTimeout(timer);
      return run(false);
    },
  };
}
