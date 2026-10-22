// Small helpers for driving a TEST COPY of Desk Watch over the DevTools port (9333) and the main-process
// inspector (9334). Never point these at the owner's real app. See CLAUDE.md, "Testing".
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function page() {
  let ws, id = 0;
  const pending = new Map();
  const connect = async () => {
    const pages = await (await fetch('http://127.0.0.1:9333/json', { signal: AbortSignal.timeout(15_000) }).catch((e) => {
      throw new Error(`TEST COPY DID NOT ANSWER (DevTools list, 15 s): ${e.message}  (run node scripts/testing/hang-probe.mjs)`); })).json();
    ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((r, no) => { ws.addEventListener('open', r); setTimeout(() => no(new Error('TEST COPY DID NOT ANSWER (page connection, 15 s)')), 15_000).unref(); });
    ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); });
  };
  await connect();
  // Never drive a copy that is using the owner's real data (CLAUDE.md, incident of 2026-10-15).
  const where = await new Promise((r, no) => {
    setTimeout(() => no(new Error('TEST COPY DID NOT ANSWER (data folder check, 15 s)')), 15_000).unref();
    const i = 999999; pending.set(i, (d) => r(d.result?.result?.value));
    ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: 'window.deskwatch.dataPath()', awaitPromise: true, returnByValue: true } }));
  });
  if (/[\\/]AppData[\\/]Roaming[\\/]Desk Watch[\\/]/i.test(String(where))) { ws.close(); throw new Error(`REFUSED: this copy uses the real data (${where})`); }
  // Every request has a time limit (2026-10-21: test copies froze 3 times during seeding and the scripts waited for
  // ever). A frozen copy now fails fast with a clear message; set CDP_TIMEOUT_MS for a longer limit.
  const LIMIT = Number(process.env.CDP_TIMEOUT_MS) || 60_000;
  const send = (method, params = {}) => new Promise((r, no) => {
    const i = ++id;
    const what = method === 'Runtime.evaluate' ? String(params.expression).replace(/\s+/g, ' ').slice(0, 120) : method;
    const timer = setTimeout(() => { pending.delete(i); no(new Error(`TEST COPY DID NOT ANSWER within ${LIMIT / 1000} s: ${what}  (run node scripts/testing/hang-probe.mjs before stopping it)`)); }, LIMIT);
    pending.set(i, (d) => { clearTimeout(timer); pending.delete(i); r(d); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const p = {
    send,
    // Runs `body` (an async function body: use `return`) in the page.
    ev: async (body) => {
      const d = await send('Runtime.evaluate', { expression: `(async () => { ${body} })()`, awaitPromise: true, returnByValue: true });
      return d.result?.result?.value ?? d.result?.exceptionDetails?.exception?.description;
    },
    // Clicks the first enabled element matching `sel` whose text starts with `text`.
    click: async (text, sel = 'button') => {
      const r = await p.ev(`const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}) && !b.disabled); if (!b) return 'NO ' + ${JSON.stringify(text)}; b.click(); return 'ok'`);
      if (r !== 'ok') console.log('  (click)', r);
      await sleep(700);
      return r;
    },
    text: (sel) => p.ev(`return document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`),
    // Saves settings (merged with the current ones) and reloads the page.
    settings: async (patch) => {
      await p.ev(`await window.deskwatch.setSettings({ ...window.deskwatch.getSettings(), ...${JSON.stringify(patch)} }); location.reload(); return 1`);
      await sleep(1500); ws.close(); pending.clear(); await connect(); await sleep(2500);
    },
    close: () => ws.close(),
  };
  return p;
}

// Runs `expr` in the main process (needs --inspect=9334). A promise is waited for.
export async function main(expr) {
  const list = await (await fetch('http://127.0.0.1:9334/json')).json();
  const m = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((r) => m.addEventListener('open', r));
  const res = new Promise((r) => m.addEventListener('message', (x) => { const d = JSON.parse(x.data); if (d.id === 1) r(d.result?.result?.value); }));
  m.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true } }));
  const LIMIT = Number(process.env.CDP_TIMEOUT_MS) || 60_000;
  let timer;
  const late = new Promise((_, no) => { timer = setTimeout(() => no(new Error(`MAIN PROCESS DID NOT ANSWER within ${LIMIT / 1000} s: ${expr.replace(/\s+/g, ' ').slice(0, 120)}`)), LIMIT); });
  try { return await Promise.race([res, late]); } finally { clearTimeout(timer); m.close(); }
}

// Screenshot of the test copy at the owner's window size (1280 × 730). The camera area is always hidden.
// full = whole page height (for long screens).
export async function shot(p, file, full = false) {
  const { writeFileSync } = await import('node:fs');
  await p.ev(`const s = document.querySelector('.stage'); if (s) s.style.visibility = 'hidden'; return 1`);
  await main(`(() => { const w = require('electron').BrowserWindow.getAllWindows()[0]; if (w.isMinimized()) w.restore(); if (!w.isVisible()) w.showInactive(); w.unmaximize(); w.setContentSize(1280, 730); return 1; })()`);
  await sleep(400);
  let params = { format: 'png' };
  if (full) {
    const m = await p.send('Page.getLayoutMetrics');
    params = { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1280, height: Math.min(4000, Math.ceil(m.result.cssContentSize.height)), scale: 1 } };
  }
  const d = await p.send('Page.captureScreenshot', params);
  writeFileSync(file, Buffer.from(d.result.data, 'base64'));
  console.log('  saved', file.split(/[\\/]/).pop());
}
