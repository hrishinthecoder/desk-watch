// Stage E reminder check: `node scripts/testing/reminders.mjs` against a test copy started with DESKWATCH_PORT=47616,
// CDP 9333 and --inspect=9334. Takes about 4 minutes. Notifications are recorded, never shown.
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

console.log('patch:', await ins(`(() => { const N = require('electron').Notification; N.prototype.show = function () { (globalThis.__shown ??= []).push(this.title); }; return 'notifications recorded, not shown'; })()`));
const addBlockNextMinute = async () => {
  await ev(`for (const r of await window.deskwatch.routines()) if (r.start_min < 1380) await window.deskwatch.deleteRoutine(r.id); return 'cleared'`);
  const d = new Date(); const start = d.getHours() * 60 + d.getMinutes() + 1;
  const p = await ev(`return await window.deskwatch.saveRoutine({ day: ${d.getDay()}, start_min: ${start}, length_min: 5, task_id: null, camera_mode: 1, screen_mode: 0, block_set_id: null })`);
  console.log(`block at minute ${start}: ${p ?? 'saved'}`);
  return (60 - d.getSeconds()) * 1000;
};
const waitFor = async (ms) => { await sleep(ms + 20_000); return ins(`JSON.stringify(globalThis.__shown ?? [])`); };

// 1. reminders ON (the earlier test switched them off)
const own = await ev(`return window.deskwatch.getSettings()`);
await ev(`const o = window.deskwatch.getSettings(); delete o.routineReminders; await window.deskwatch.setSettings(o); return 'on'`);
console.log('reminders on: shown =', await waitFor(await addBlockNextMinute()));
// 2. reminders OFF
await ev(`await window.deskwatch.setSettings({ ...window.deskwatch.getSettings(), routineReminders: false }); return 'off'`);
await ins(`globalThis.__shown = []`);
console.log('reminders off: shown =', await waitFor(await addBlockNextMinute()));
await ev(`const o = window.deskwatch.getSettings(); delete o.routineReminders; await window.deskwatch.setSettings(o); return 'on'`);
await ins(`globalThis.__shown = []`);
const sid = await ev(`return await window.deskwatch.sessionStart({ startedAt: Date.now(), plannedMin: 5, cameraMode: false, screenMode: false })`);
console.log('session running:', sid);
console.log('reminders on, during a session: shown =', await waitFor(await addBlockNextMinute()));
await ev(`await window.deskwatch.sessionFinish(${sid}, Date.now(), true); return 'ended'`);
ws.close();
