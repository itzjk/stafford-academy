import { loadPyodide } from '../lib/pyodide/pyodide.mjs';

let pyodide = null;
let out = [];
let err = [];

async function boot() {
  if (pyodide) return pyodide;
  pyodide = await loadPyodide({
    indexURL: new URL('../lib/pyodide/', self.location.href).href,
    stdout: function (line) { out.push(line); },
    stderr: function (line) { err.push(line); }
  });
  return pyodide;
}

function feedStdin(py, text) {
  const lines = String(text == null ? '' : text).split('\n');
  let i = 0;
  py.setStdin({
    stdin: function () { return i < lines.length ? lines[i++] : null; }
  });
}

function cleanTrace(text) {
  const lines = String(text).split('\n');
  const head = lines[0] && lines[0].indexOf('Traceback') === 0 ? lines[0] : null;
  const body = [];
  let inside = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*File "/.test(line)) {
      inside = line.indexOf('File "<exec>"') >= 0 || line.indexOf('File "/home/pyodide') >= 0;
      if (inside) body.push(line.replace('File "<exec>"', 'File "your program"'));
      continue;
    }
    if (/^\s/.test(line)) { if (inside) body.push(line); continue; }
    if (line.trim()) {
      if (line.indexOf('Traceback (most recent call last)') === 0) { inside = false; continue; }
      body.push(line);
      inside = false;
    }
  }
  const out = (head ? [head] : []).concat(body).join('\n').trim();
  return out || String(text).trim().split('\n').pop();
}

self.onmessage = async function (ev) {
  const msg = ev.data || {};
  if (msg.type === 'boot') {
    try { await boot(); self.postMessage({ type: 'ready' }); }
    catch (e) { self.postMessage({ type: 'boot-failed', error: String(e && e.message || e) }); }
    return;
  }
  if (msg.type !== 'run') return;

  out = [];
  err = [];
  let py;
  try { py = await boot(); }
  catch (e) {
    self.postMessage({ id: msg.id, type: 'result', ok: false, stdout: '', stderr: 'The Python runtime could not start: ' + (e && e.message || e), fatal: true });
    return;
  }

  feedStdin(py, msg.stdin);
  self.postMessage({ id: msg.id, type: 'started' });

  let ok = true;
  let trace = '';
  const ns = py.toPy({ __name__: '__main__' });
  try {
    await py.runPythonAsync(String(msg.code || ''), { globals: ns });
  } catch (e) {
    ok = false;
    trace = cleanTrace(e && e.message || e);
  } finally {
    try { ns.destroy(); } catch (e) {}
  }

  self.postMessage({
    id: msg.id,
    type: 'result',
    ok: ok,
    stdout: out.join('\n') + (out.length ? '\n' : ''),
    stderr: (err.join('\n') + (trace ? (err.length ? '\n' : '') + trace : '')).trim()
  });
};
