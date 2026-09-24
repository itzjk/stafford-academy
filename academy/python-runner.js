// Runs student code in a Pyodide web worker, with a time limit so an endless
// loop never freezes the page.
(function (root) {
  'use strict';

  var WORKER_URL = 'python-worker.js';
  var DEFAULT_TIMEOUT = 8000;
  var BOOT_MS = 6000;

  var worker = null;
  var seq = 0;
  var pending = {};
  var booting = null;

  function workerPath() {
    if (root.chrome && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL('academy/' + WORKER_URL);
    }
    return WORKER_URL;
  }

  function spawn() {
    worker = new Worker(workerPath(), { type: 'module' });
    worker.onmessage = function (ev) {
      var m = ev.data || {};
      if (m.type === 'ready' || m.type === 'boot-failed') {
        if (booting) { booting.settle(m); booting = null; }
        return;
      }
      var job = pending[m.id];
      if (!job) return;
      if (m.type === 'started') {
        clearTimeout(job.timer);
        job.timer = setTimeout(job.giveUp, job.limit);
        return;
      }
      delete pending[m.id];
      clearTimeout(job.timer);
      job.resolve({ ok: !!m.ok, stdout: m.stdout || '', stderr: m.stderr || '', timedOut: false, fatal: !!m.fatal });
    };
    worker.onerror = function (e) {
      var msg = 'The Python runtime crashed: ' + (e && e.message || 'unknown error');
      Object.keys(pending).forEach(function (id) {
        clearTimeout(pending[id].timer);
        pending[id].resolve({ ok: false, stdout: '', stderr: msg, timedOut: false, fatal: true });
        delete pending[id];
      });
      if (booting) { booting.settle({ type: 'boot-failed', error: msg }); booting = null; }
      kill();
    };
    return worker;
  }

  function kill(rewarm) {
    if (worker) { try { worker.terminate(); } catch (e) {} }
    worker = null;
    booting = null;
    if (rewarm) setTimeout(function () { PY.warmUp(); }, 50);
  }

  function ensure() {
    if (!worker) spawn();
    return worker;
  }

  var PY = {};

  PY.warmUp = function () {
    if (booting) return booting.promise;
    var w = ensure();
    var box = {};
    box.promise = new Promise(function (resolve) {
      box.settle = function (m) { resolve(m.type === 'ready'); };
    });
    booting = box;
    w.postMessage({ type: 'boot' });
    return box.promise;
  };

  PY.run = function (code, opts) {
    opts = opts || {};
    var w = ensure();
    var id = ++seq;
    var limit = opts.timeoutMs || DEFAULT_TIMEOUT;

    return new Promise(function (resolve) {
      function giveUp() {
        delete pending[id];
        resolve({
          ok: false,
          stdout: '',
          stderr: 'Your program was still running after ' + Math.round(limit / 1000) + ' seconds and was stopped. A loop that never ends is the usual cause.',
          timedOut: true,
          fatal: false
        });
        kill(true);
      }
      pending[id] = {
        resolve: resolve,
        giveUp: giveUp,
        limit: limit,
        timer: setTimeout(giveUp, limit + BOOT_MS)
      };
      w.postMessage({ type: 'run', id: id, code: String(code || ''), stdin: opts.stdin || '' });
    });
  };

  PY.reset = kill;

  root.PythonRunner = PY;
})(typeof window !== 'undefined' ? window : self);
