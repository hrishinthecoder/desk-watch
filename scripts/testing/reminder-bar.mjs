// In-app reminder check: `node scripts/testing/reminder-bar.mjs` against a test copy started with
// DESKWATCH_PORT=47616, CDP 9333 and --inspect=9334. About 1.5 minutes. Windows notifications are
// recorded, never shown. Needs a FRESH test folder (its block would overlap one from an earlier run).
// Hides the window first, then checks the reminder brings it back.
const ins = async (expr) => {
  const list = await (await fetch('http://127.0.0.1:9334/json')).json();
  const m = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((r) => m.addEventListener('open', r));
  const out = new Promise((r) => m.addEventListener('message', (x) => { const d = JSON.parse(x.data); if (d.id === 1) r(d.result?.result?.value ?? d.result?.exceptionDetails?.exception?.description); }));
  m.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, includeCommandLineAPI: true, awaitPromise: true } }));
  const v = await out; m.close(); return v;
};
const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); });
const ev = (expr) => new Promise((r) => { const i = ++id; pending.set(i, (d) => r(d.result?.result?.value ?? d.result?.exceptionDetails?.exception?.description)); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true } })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, got) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   got: ' + JSON.stringify(got)}`); };

// Timeline (UTC) for when something fails: notification, window show/hide, page received.
const now = () => new Date().toISOString().slice(11, 23);
await ins(`(() => {
  const t = () => new Date().toISOString().slice(11, 23);
  require('electron').Notification.prototype.show = function () { (globalThis.__shown ??= []).push(this.title); (globalThis.__log ??= []).push('notification ' + t()); };
  const W = require('electron').BrowserWindow.prototype;
  for (const k of ['show', 'hide']) { const o = W[k]; W[k] = function (...a) { (globalThis.__log ??= []).push(k + ' ' + t()); return o.apply(this, a); }; }
  return 1; })()`);
await ev(`window.__rem = []; window.deskwatch.onReminder(() => window.__rem.push(new Date().toISOString().slice(11, 23))); return 1`);
console.log('script start', now());
const taskId = await ev(`return await window.deskwatch.saveTask({ title: 'Reminder test task', status: 'todo', priority: 2 })`);
const d = new Date(); const start = d.getHours() * 60 + d.getMinutes() + 1;
if (start >= 1435) { console.log('Too close to midnight; run again after 00:00.'); process.exit(1); }
const problem = await ev(`return await window.deskwatch.saveRoutine({ day: ${d.getDay()}, start_min: ${start}, length_min: 30, task_id: ${taskId}, camera_mode: 0, screen_mode: 0, block_set_id: null })`);
check('block saved for the next minute', problem == null, problem); // the page helper turns null into undefined
await ins(`require('electron').BrowserWindow.getAllWindows()[0].hide()`);
check('window hidden (as if in the tray)', (await ins(`require('electron').BrowserWindow.getAllWindows()[0].isVisible()`)) === false, null);
await sleep((60 - d.getSeconds()) * 1000 + 20_000);
check('window is back when the block starts', (await ins(`require('electron').BrowserWindow.getAllWindows()[0].isVisible()`)) === true, null);
const bar = await ev(`return document.querySelector('.reminder')?.innerText.replace(/\\s+/g, ' ') ?? ''`);
const hh = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
check('reminder bar shows the block', bar.includes(`Study block at ${hh}: Reminder test task (30 min)`), bar);
check('the Windows notification was also sent', (await ins(`JSON.stringify(globalThis.__shown ?? [])`)).includes('Reminder test task'), null);
await ev(`[...document.querySelectorAll('.reminder button')].find((b) => b.textContent === 'Get it ready').click(); return 1`); await sleep(1200);
const st = await ev(`const s = document.querySelector('.study'); return s ? { minutes: s.querySelector('input[type=number]').value, task: s.querySelector('label.field select')?.value, bar: !!document.querySelector('.reminder'), start: !![...s.querySelectorAll('button')].find((b) => b.textContent === 'Start') } : null`);
check('Get it ready: Study tab filled in (30 min, the task), bar gone, not started', st && st.minutes === '30' && st.task === String(taskId) && !st.bar && st.start, st);
if (fails) console.log('timeline:', await ins(`JSON.stringify(globalThis.__log)`), '| page got the reminder at:', await ev(`return JSON.stringify(window.__rem)`));
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
ws.close();
