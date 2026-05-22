/**
 * Async wrapper for the analysis worker
 */
let worker = null;
let messageId = 0;
const pendingResolves = new Map();

function getWorker() {
  if (!worker && typeof window !== 'undefined') {
    worker = new Worker(new URL('./analysisWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const resolvePair = pendingResolves.get(id);
      if (resolvePair) {
        if (error) resolvePair.reject(new Error(error));
        else resolvePair.resolve(result);
        pendingResolves.delete(id);
      }
    };
    
    worker.onerror = (err) => {
      console.error('Worker error:', err);
    };
  }
  return worker;
}

/**
 * Runs a statistical calculation in a background Web Worker
 * @param {string} type - The method name (e.g., 'calculateIRT2PL')
 * @param {object} payload - The arguments for the method
 * @returns {Promise}
 */
export function runAsyncAnalysis(type, payload) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    if (!w) {
      reject(new Error('Web Worker not supported in this environment'));
      return;
    }
    const id = ++messageId;
    pendingResolves.set(id, { resolve, reject });
    w.postMessage({ type, payload, id });
  });
}
