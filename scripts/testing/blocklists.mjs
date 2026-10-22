// Stage D2 check: `node scripts/testing/blocklists.mjs` against an isolated test copy (CDP 9333, Blocker mode server 47616: start the test copy with DESKWATCH_PORT=47616).
// Works on a fresh test folder or on a copy of a schema-2 database (remove its main:browsers row first).
const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); });
const ev = (expr) => new Promise((r) => { const i = ++id; pending.set(i, (d) => r(d.result?.result?.value ?? d.result?.exceptionDetails?.exception?.description ?? d)); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true } })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, got) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   got: ' + JSON.stringify(got)}`); };

// helpers in the page
await ev(`
  window.t = {
    btn: (txt) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(txt)),
    click(txt) { const b = this.btn(txt); if (!b) return 'NO BUTTON ' + txt; b.click(); return 'ok'; },
    type(sel, v) { const i = document.querySelector(sel); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })); },
    tick(labelText, on) { const l = [...document.querySelectorAll('label.check')].find((x) => x.textContent.includes(labelText)); const c = l.querySelector('input'); if (c.checked !== on) c.click(); },
    pressed: (txt) => window.t.btn(txt)?.getAttribute('aria-pressed'),
    err: async (p) => { try { await p; return 'no error'; } catch (e) { return String(e.message); } },
  };
  window.confirm = () => true;
  return 'ok';`);
const code = await ev(`return (await window.deskwatch.screenInfo()).code`);
const tab = async (url) => {
  const r = await fetch(`http://127.0.0.1:${process.env.DESKWATCH_PORT ?? 47616}/v1/tab`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'chrome-extension://abcdefghijklmnop', 'X-Desk-Watch-Code': code }, body: JSON.stringify({ url }) });
  return (await r.json()).block;
};

// 1. Upgrade of the copied database
const st = await ev(`return await window.deskwatch.blockSets()`);
check('upgraded db has My list, Exam mode, Light mode; My list in use', JSON.stringify(st.sets.map((s) => s.name)) === '["My list","Exam mode","Light mode"]' && st.active === 1 && !st.locked, st);
console.log('      My list entries after upgrade:', await ev(`return (await window.deskwatch.getBlocklist()).length`));

// 2. Panel on the Study tab
await ev(`t.tick('Camera mode', false); t.tick('Blocker mode', true); return 'ok'`);
await sleep(600);
console.log('      panel:', await ev(`return document.querySelector('.blockpanel')?.innerText.replace(/\\s+/g, ' ').slice(0, 400)`));
check('set cards + quick-add cards shown', await ev(`return !!t.btn('Exam mode') && !!t.btn('YouTube Shorts') && !!t.btn('Netflix')`), null);
await ev(`return t.click('Light mode')`); await sleep(500);
check('tap Light mode selects it', await ev(`return t.pressed('Light mode')`) === 'true', await ev(`return t.pressed('Light mode')`));
check('Light mode quick cards: Facebook on, Reddit off', await ev(`return t.pressed('Facebook') + ',' + t.pressed('Reddit')`) === 'true,false', await ev(`return t.pressed('Facebook') + ',' + t.pressed('Reddit')`));
await ev(`t.type('.blocklists input.grow[placeholder^="Add"]', 'Discord'); return t.click('Add')`); await sleep(500);
check('add box: "Discord" lands in Blocked apps', await ev(`return (await window.deskwatch.getBlocklist()).some((e) => e.kind === 'app' && e.pattern === 'discord')`), null);
await ev(`document.querySelector('[aria-label="Remove discord"]').click(); return 'ok'`); await sleep(500);
check('× removes it', await ev(`return !(await window.deskwatch.getBlocklist()).some((e) => e.pattern === 'discord')`), null);
await ev(`t.click('Always allow'); t.type('.blocklists input.grow[placeholder^="Add"]', 'Steam.exe'); return t.click('Add')`); await sleep(500);
check('"Always allow" + an app is refused with a message', await ev(`return document.querySelector('.blocklists .warn')?.innerText ?? ''`) === 'Apps can only be blocked, not marked productive.', await ev(`return document.querySelector('.blocklists .warn')?.innerText`));
await ev(`t.click('Block'); t.type('.blocklists input.grow[placeholder^="Add"]', ''); return 'ok'`);

// 3. Blocking follows the set in use
await ev(`return t.click('Start')`); await sleep(1500);
check('Light mode in a session: youtube.com/shorts blocked', await tab('https://www.youtube.com/shorts/abc') === true, null);
check('... youtube.com/watch allowed', await tab('https://www.youtube.com/watch?v=1') === false, null);
check('... reddit.com allowed', await tab('https://www.reddit.com/') === false, null);

// 4. The lock (main process)
const s2 = await ev(`return await window.deskwatch.blockSets()`);
check('sets report locked during the session', s2.locked === true, s2);
check('removing an entry is refused', (await ev(`const l = await window.deskwatch.getBlocklist(); return await t.err(window.deskwatch.setBlocklist(l.slice(1)))`)).includes('only add blocked'), null);
check('adding a productive entry is refused', (await ev(`const l = await window.deskwatch.getBlocklist(); return await t.err(window.deskwatch.setBlocklist([...l, { list: 'productive', kind: 'site', pattern: 'reddit.com' }]))`)).includes('only add blocked'), null);
check('switching sets is refused', (await ev(`return await t.err(window.deskwatch.changeBlockSet('pick', 2))`)).includes('cannot be changed'), null);
check('adding a blocked app is allowed', (await ev(`const l = await window.deskwatch.getBlocklist(); return await t.err(window.deskwatch.setBlocklist([...l, { list: 'blocked', kind: 'app', pattern: 'steam' }]))`)) === 'no error', null);

// 5. The in-session panel
await ev(`document.querySelector('details.blockpanel').open = true; return 'ok'`); await sleep(500);
check('in session: no remove buttons, no set cards, on-cards disabled', await ev(`const p = document.querySelector('details.blockpanel'); return !p.querySelector('[aria-label^="Remove"]') && !t.btn('Exam mode') && t.btn('Facebook').disabled && !t.btn('Reddit').disabled`), null);
await ev(`return t.click('Reddit')`); await sleep(500);
check('in session: Reddit quick card adds it and it is blocked at once', await tab('https://www.reddit.com/r/x') === true, null);

// 6. After the session
await ev(`return t.click('End session')`); await sleep(1500);
await ev(`return t.click('Start a new session')`); await sleep(800);
await ev(`t.tick('Blocker mode', true); return 'ok'`); await sleep(500);
check('after the session: Reddit stays in Light mode (added mid-session)', await ev(`return t.pressed('Reddit')`) === 'true', null);
const after = await ev(`return await t.err(window.deskwatch.changeBlockSet('pick', 2))`);
check('after the session: switching sets works again', after === 'no error', after);
await ev(`document.querySelector('.blocklists details').open = true; return 'ok'`); await sleep(300);
await ev(`t.type('.blocklists details input', 'Weekend'); return t.click('New set')`); await sleep(500);
const s3 = await ev(`return await window.deskwatch.blockSets()`);
check('New set: "Weekend" made from Exam mode and selected', s3.sets.at(-1).name === 'Weekend' && s3.active === s3.sets.at(-1).id && await ev(`return t.pressed('Netflix')`) === 'true', s3);
await ev(`return t.click('Delete Weekend')`); await sleep(500);
check('Delete: Weekend gone, first set in use', JSON.stringify((await ev(`return await window.deskwatch.blockSets()`)).sets.map((s) => s.name)) === '["My list","Exam mode","Light mode"]', null);

// 7. Settings keeps only the connection
await ev(`return t.click('Settings')`); await sleep(500);
const settingsText = await ev(`return [...document.querySelectorAll('.settings section')].find((s) => s.innerText.startsWith('Blocker mode')).innerText.replace(/\\s+/g, ' ')`);
check('Settings: connection controls, no lists', settingsText.includes('Open extension folder') && !settingsText.includes('Blocked sites') && !settingsText.includes('Add'), settingsText);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
ws.close();
