// Notification block checks (owner, 2026-10-23) on a TEST COPY with made-up data:
//  - the answer to the extension says quiet only while a session runs (not paused, not after it ends, not with the switch off);
//  - the Windows "Do not disturb" bar: shown once per session, its button asks Windows to open the setting, × and
//    "Don't remind me" work. The Windows setting is never really opened: the main process's handler is replaced.
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/quiet-check.mjs <screenshot folder>
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/quiet-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const PORT = 47616, EXT = 'chrome-extension://abcdefghijklmnop';
const secret = await p.ev('return (await window.deskwatch.screenInfo()).code');
const answer = async () => {
  const r = await fetch(`http://127.0.0.1:${PORT}/v1/tab`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: EXT, 'X-Desk-Watch-Code': secret }, body: JSON.stringify({ url: 'https://en.wikipedia.org/wiki/Physics' }) });
  return r.json();
};
// What this PC really says (read only), then Windows' answer replaced so the bar can be checked; the "open" is recorded.
const realOff = await p.ev('return await window.deskwatch.windowsToastsOff()');
console.log('  this PC: Windows notifications all off =', realOff);
await main(`(() => { const { ipcMain } = require('electron'); globalThis.__dndOpened = 0;
  ipcMain.removeHandler('windows:toasts-off'); ipcMain.handle('windows:toasts-off', () => false);
  ipcMain.removeHandler('windows:open-dnd'); ipcMain.handle('windows:open-dnd', () => { globalThis.__dndOpened++; }); return 1; })()`);

await p.settings({ theme: 'dark', language: 'en', alarmVolume: 0, lastCamera: false, lastScreen: false, quietSites: true, dndReminder: true });
await p.ev('window.confirm = () => true; return 1');
const fresh = () => p.ev(`if (document.querySelector('.study.done')) [...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session').click(); return 1`).then(() => sleep(500));
const bar = () => p.text('.dnd-hint');
const camOff = () => p.ev(`const b = [...document.querySelectorAll('button.mode')][0]; if (b?.getAttribute('aria-pressed') === 'true') b.click(); return 1`).then(() => sleep(300));
const start = async () => { await fresh(); await camOff(); await p.ev(`document.querySelector('.dock button.start').click(); return 1`); await sleep(1500); };
await p.click('Study'); await fresh();
ok('no session: not quiet', (await answer()).quiet === false, await answer());
await start();
ok('session running: quiet (Blocker mode off too)', (await answer()).quiet === true, await answer());
ok('the Do not disturb bar shows', /Turn on Do not disturb/.test(await bar() ?? ''), await bar());
await shot(p, join(out, 'dnd-bar.png'));
await p.click('Open Windows setting', '.dnd-hint button'); await sleep(500);
ok('its button asks Windows to open the setting, and the bar goes', (await main('globalThis.__dndOpened')) === 1 && !(await bar()), [await main('globalThis.__dndOpened'), await bar()]);
await p.click('Pause', '.dock button'); await sleep(800);
ok('paused: not quiet', (await answer()).quiet === false, await answer());
await p.click('Resume', '.dock button'); await sleep(800);
ok('resumed: quiet again', (await answer()).quiet === true, await answer());
ok('…and the bar stays closed for this session', !(await bar()), await bar());
await p.click('End session', '.dock button'); await sleep(1500);
ok('session ended: not quiet', (await answer()).quiet === false, await answer());

// A new session: the bar again; × closes it; "Don't remind me" switches the setting off
await fresh();
await start();
ok('a new session: the bar again', /Do not disturb/.test(await bar() ?? ''), await bar());
await p.ev(`document.querySelector('.dnd-hint .icon-btn').click(); return 1`); await sleep(300);
ok('× closes it', !(await bar()), await bar());
await p.click('End session', '.dock button'); await sleep(1500); await fresh();
await start();
await p.click('Don’t remind me', '.dnd-hint button'); await sleep(500);
ok('"Don’t remind me": the bar goes', !(await bar()), await bar());
await p.click('End session', '.dock button'); await sleep(1500); await fresh();
await start();
ok('…and the next session has no bar', !(await bar()), await bar());
await p.click('End session', '.dock button'); await sleep(1500);

// The switch off: never quiet; Bangla texts in Settings
await p.settings({ quietSites: false, dndReminder: true, language: 'bn' });
await p.ev('window.confirm = () => true; return 1'); // the reload brought back the real confirm box
await fresh();
await start();
ok('"Block website notifications" off: not quiet during a session', (await answer()).quiet === false, await answer());
ok('Bangla: the bar in Bangla', /Do not disturb চালু করবেন/.test(await bar() ?? ''), await bar());
await shot(p, join(out, 'bn-dnd-bar.png'));
await p.click('সেটিংস');
const st = await p.ev('return document.body.innerText');
ok('Bangla: both switches in Settings', /ওয়েবসাইটের notification বন্ধ রাখুন/.test(st) && /Do not disturb চালু করতে মনে করিয়ে দিন/.test(st), null);
await p.ev(`document.getElementById('set-sessions')?.scrollIntoView(); return 1`); await sleep(400);
await shot(p, join(out, 'bn-settings-sessions.png'));
await p.click('পড়া');
await p.ev(`[...document.querySelectorAll('.dock button')].find((b) => /Session শেষ/.test(b.textContent))?.click(); return 1`); await sleep(1500);
await p.settings({ language: 'en', quietSites: true });
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
