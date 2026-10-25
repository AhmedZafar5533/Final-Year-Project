// Share a small search concurrency limit across script requests and worker jobs in
// this process. Waiting requests can be cancelled without consuming a slot.
export function createSearchGate(limit = 2) {
  let active = 0;
  const waiting = [];
  function drain() {
    while (active < limit && waiting.length) {
      const task = waiting.shift();
      task.signal?.removeEventListener('abort', task.abort);
      if (task.signal?.aborted) { task.reject(task.signal.reason); continue; }
      active++;
      Promise.resolve().then(task.action).then(task.resolve, task.reject).finally(() => { active--; drain(); });
    }
  }
  return (action, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return; }
    const task = { action, signal, resolve, reject, abort: () => {
      const index = waiting.indexOf(task);
      if (index >= 0) waiting.splice(index, 1);
      reject(signal.reason);
    } };
    waiting.push(task);
    signal?.addEventListener('abort', task.abort, { once: true });
    drain();
  });
}
