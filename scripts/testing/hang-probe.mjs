// When a TEST COPY stops answering (open issue in CLAUDE.md: freezes during seed.mjs), run this BEFORE stopping it:
//   node scripts/testing/hang-probe.mjs
// It asks the page's DevTools port (9333) and the main process's inspector (9334) for signs of life, in stages, each
// with a time limit, so the output says WHICH part froze:
//   "list" = the port's HTTP list (served off the main thread: if this fails the whole process is stuck or gone),
//   "connect" = opening the debugger connection, "answer" = running one line of JavaScript there (needs its thread free).
const limit = (p, ms, stage) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`${stage}: no answer in ${ms / 1000} s`)), ms).unref())]);
async function probe(port, expr) {
  const t0 = Date.now();
  const list = await limit(fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()), 5000, 'list');
  const target = list.find((t) => t.type === 'page') ?? list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await limit(new Promise((r) => ws.addEventListener('open', r)), 5000, 'connect');
  const res = new Promise((r) => ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id === 1) r(d.result?.result?.value ?? d.result); }));
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, includeCommandLineAPI: true } }));
  try { return `${await limit(res, 5000, 'answer')} (${Date.now() - t0} ms)`; } finally { ws.close(); }
}
for (const [name, port, expr] of [
  ['page', 9333, 'JSON.stringify({ url: location.href, ready: document.readyState, tab: document.querySelector("nav.tabs button.on")?.textContent })'],
  ['main', 9334, `JSON.stringify(require('electron').BrowserWindow.getAllWindows().map((w) => [w.getTitle(), w.isVisible(), w.webContents.isCrashed(), w.webContents.isLoading()]))`],
]) {
  try { console.log(name, 'answers:', await probe(port, expr)); } catch (e) { console.log(name, 'DOES NOT ANSWER at', e.cause?.code ?? e.message); }
}
