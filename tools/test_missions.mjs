// End-to-end test of every mission in the real app, in headless Chrome:
// for each mission it opens the mission page, presses "Show solution", then
// "Check", and expects the app to accept the official answer.
//
//   node tools/test_missions.mjs                   # every course
//   node tools/test_missions.mjs programming vision
//
// Needs Node 22+ and Google Chrome (set CHROME to use another binary).
// It serves the repository itself, so no other server is needed.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- a tiny static server for the repository ----------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.zip': 'application/zip' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ---------- a private headless Chrome ----------
// Chrome picks a free debugging port and writes it into our own temporary
// profile, so this can only connect to the browser it started.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'stafford-test-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--mute-audio', 'about:blank'], { stdio: 'ignore' });

let targets;
for (let i = 0; i < 100 && !targets; i++) {
  try {
    const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim();
    targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  } catch { await sleep(100); }
}
if (!targets) throw new Error('Chrome did not start. Set CHROME to your Chrome binary.');
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let nextId = 1;
const pending = new Map();
const waiters = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method === 'Page.loadEventFired') waiters.splice(0).forEach((w) => w());
});
const send = (method, params = {}) => new Promise((r) => { const id = nextId++; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'evaluation failed');
  return r.result?.result?.value;
}
async function open(url) {
  const loaded = new Promise((r) => waiters.push(r));
  await send('Page.navigate', { url: BASE + url });
  await loaded;
}
async function waitFor(expression, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(60);
  }
  return false;
}

await send('Page.enable');

// ---------- the test ----------
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy/courses/catalog.json'), 'utf8'));
const only = process.argv.slice(2);
const courses = catalog.courses.map((c) => c.id).filter((id) => !only.length || only.includes(id));
const failures = [];
let tested = 0;

for (const courseId of courses) {
  const course = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy/courses', courseId + '.json'), 'utf8'));
  const lessons = course.chapters.flatMap((ch) => ch.lessons);
  let courseFailures = 0;
  for (const lesson of lessons) {
    tested++;
    await open(`/academy/lesson.html?c=${encodeURIComponent(courseId)}&l=${encodeURIComponent(lesson.id)}`);
    const ready = await waitFor(`document.getElementById('lessonTitle').textContent === ${JSON.stringify(lesson.title)}`, 10000);
    if (!ready) { failures.push(`${courseId}/${lesson.id}: the mission page did not load`); courseFailures++; continue; }
    await evaluate(`document.getElementById('solutionBtn').click(), document.getElementById('runBtn').click(), true`);
    // Python missions boot Pyodide on the first run, so give them time.
    const done = await waitFor(`/is-(good|bad)/.test(document.getElementById('output').className)`, lesson.check?.type === 'runs' ? 60000 : 5000);
    const result = await evaluate(`({ cls: document.getElementById('output').className, text: document.getElementById('output').innerText.slice(0, 300) })`);
    if (!done || !/is-good/.test(result.cls)) {
      failures.push(`${courseId}/${lesson.id} "${lesson.title}": the official answer was not accepted -> ${result.text.replace(/\s+/g, ' ')}`);
      courseFailures++;
    }
  }
  console.log(`${courseId}: ${lessons.length} missions, ${courseFailures ? courseFailures + ' failed' : 'all accepted'}`);
}

ws.close();
chrome.kill();
server.close();
await sleep(300);
fs.rmSync(profile, { recursive: true, force: true });

for (const f of failures) console.log('  ' + f);
console.log(failures.length ? `${failures.length} of ${tested} missions failed.` : `All ${tested} missions accept their official answer.`);
process.exit(failures.length ? 1 : 0);
