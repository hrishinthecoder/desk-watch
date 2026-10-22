// Drives the running Desk Watch window over the local DevTools port and prints what it sees.
const port = process.argv[2] ?? 9333;
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); });
const ev = (expr) => new Promise((r) => { const i = ++id; pending.set(i, (d) => r(d.result?.result?.value ?? d.result?.exceptionDetails?.text ?? d)); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (text) => ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})); if (!b) return 'NO BUTTON ' + ${JSON.stringify(text)}; b.click(); return 'clicked ' + b.textContent.trim(); })()`);
const text = (sel = 'main > :not(.stage)') => ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(e => e.innerText).join(' | ').replace(/\\s+/g, ' ').slice(0, 700)`);
const setInput = (idx, v) => ev(`(() => { const i = document.querySelectorAll('.study input')[${idx}]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, i.type === 'checkbox' ? 'checked' : 'value').set; set.call(i, ${JSON.stringify(v)}); i.dispatchEvent(new Event(i.type === 'checkbox' ? 'click' : 'input', { bubbles: true })); return 'set'; })()`);

const steps = process.argv.slice(3).join(' ');
for (const step of steps.split(';').map((s) => s.trim()).filter(Boolean)) {
  const [cmd, ...rest] = step.split(' ');
  const arg = rest.join(' ');
  let out;
  if (cmd === 'click') out = await click(arg);
  else if (cmd === 'wait') { await sleep(Number(arg) * 1000); out = `waited ${arg}s`; }
  else if (cmd === 'text') out = await text(arg || undefined);
  else if (cmd === 'eval') out = await ev(arg);
  else if (cmd === 'input') { const [i, v] = arg.split('='); out = await setInput(Number(i), v === 'false' ? false : v === 'true' ? true : v); }
  console.log(`> ${step}\n  ${typeof out === 'string' ? out : JSON.stringify(out)}`);
  await sleep(400);
}
ws.close();
