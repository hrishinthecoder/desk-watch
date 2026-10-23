// Blocker warning checks (Stage G4) on a TEST COPY with made-up data: this script acts as the browser extension
// (port 47616, the pairing code as its secret) and sends tab changes like the real one does.
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/blocker-check.mjs <screenshot folder>
// The window "in front" is set by this script (globalThis.__testForeground in the test copy's main process, electron/
// screen.ts), so nothing depends on the owner's real windows and no real app is opened.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/blocker-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const PORT = 47616, EXT = 'chrome-extension://abcdefghijklmnop';
const secret = await p.ev('return (await window.deskwatch.screenInfo()).code');
const tab = async (url) => {
  const r = await fetch(`http://127.0.0.1:${PORT}/v1/tab`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: EXT, 'X-Desk-Watch-Code': secret }, body: JSON.stringify({ url }) });
  await sleep(700);
  return (await r.json()).block;
};
const front = (name, exe) => main(`globalThis.__testForeground = ${JSON.stringify(name ? { name, exe } : null)}; 1`).then(() => sleep(800));
// The alarm's label (.alarm-kind) is shown in capitals by CSS, so it is read as text; other places from the page's text.
const PAGE = `[...document.querySelectorAll('.alarm-kind')].map((e) => e.textContent).join(' | ') + ' | ' + document.body.innerText`;
const blockedApp = () => p.ev(`return (${PAGE}).match(/Blocked app: [A-Za-z]+/)?.[0] ?? null`);
const warning = () => p.text('.block-warning');
const alarm = () => p.ev(`return (${PAGE}).match(/Blocked site: [\\w.]+/)?.[0] ?? null`);
const attempts = () => p.ev(`const r = await window.deskwatch.range(Date.now() - 3600000, Date.now() + 1); return r.events.filter((e) => e.type === 'blocked_attempt').length`);

await p.settings({ theme: 'light', language: 'en', alarmVolume: 0, lastCamera: false, lastScreen: true });
await p.ev('window.confirm = () => true; return 1'); // "End the session early?" would block the page
await front('Google Chrome', 'chrome.exe');
// A blocked app for the app checks (added before the session: lists are locked during one, except adding)
const list = await p.ev('return await window.deskwatch.getBlocklist()');
await p.ev(`return await window.deskwatch.setBlocklist(${JSON.stringify([...list.filter((e) => e.pattern !== 'notepad'), { list: 'blocked', kind: 'app', pattern: 'notepad' }])})`);
await p.click('Study');
await p.ev(`if (document.querySelector('.study.done')) [...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session').click(); return 1`);
await sleep(400);
const modes = () => p.ev(`const cards = [...document.querySelectorAll('button.mode')];
  const set = (name, on) => { const c = cards.find((b) => b.textContent.includes(name)); if ((c.getAttribute('aria-pressed') === 'true') !== on) c.click(); };
  set('Camera mode', false); set('Blocker mode', true); return 1`).then(() => sleep(300));
await modes();
await p.click('Start', 'button.primary');
await sleep(1500);
const n0 = await attempts();

// 1st visit: blocked (the block page), a warning, no alarm
ok('a blocked site is blocked (the extension shows its block page)', (await tab('https://www.instagram.com/reels/')) === true, null);
await tab(`${EXT}/blocked.html?site=instagram.com`);
ok('1st visit: a warning bar, no alarm', /instagram\.com is blocked\. Going back to it within 2 minutes/.test(await warning() ?? '') && !(await alarm()), [await warning(), await alarm()]);
await shot(p, join(out, 'light-site-warning.png'));
await sleep(10_500);
ok('the warning goes after 10 s', !(await warning()), await warning());

// Back to the same site within 2 minutes: the alarm, until you leave the site
await tab('https://instagram.com/');
await tab(`${EXT}/blocked.html?site=instagram.com`);
ok('back within 2 minutes: the alarm "Blocked site: instagram.com"', (await alarm()) === 'Blocked site: instagram.com', await alarm());
await shot(p, join(out, 'light-site-alarm.png'));
await sleep(3000);
ok('…it keeps ringing while the block page is open (browser in front)', (await alarm()) === 'Blocked site: instagram.com', await alarm());
await front('Visual Studio Code', 'Code.exe');
ok('another app in front (you left the browser): the alarm stops', !(await alarm()), await alarm());
await front('Google Chrome', 'chrome.exe');
await tab('https://www.instagram.com/');
await tab(`${EXT}/blocked.html?site=instagram.com`);
ok('back to it again: the alarm again', (await alarm()) === 'Blocked site: instagram.com', await alarm());
await tab('https://en.wikipedia.org/wiki/Physics');
ok('leaving the site (another page): the alarm stops', !(await alarm()), await alarm());

// The 3rd blocked visit in the session: the alarm, even for another site
await tab('https://www.facebook.com/');
ok('3rd blocked visit (another site): the alarm at once', (await alarm()) === 'Blocked site: facebook.com', await alarm());
await tab('https://en.wikipedia.org/wiki/Maths');
ok('every visit is in the report', (await attempts()) - n0 === 4, (await attempts()) - n0);

// A blocked app in front: a warning with a countdown, then the alarm after 10 s, until it leaves the front
await front('Notepad', 'notepad.exe');
const w1 = await warning();
ok('blocked app: a warning "Close it, or the alarm rings in N s", no alarm yet', /Notepad is blocked. Close it, or the alarm rings in (9|10) s./.test(w1 ?? '') && !(await blockedApp()), [w1, await blockedApp()]);
await shot(p, join(out, 'light-app-warning.png'));
await sleep(4000);
ok('…counting down', /rings in [4-6] s/.test(await warning() ?? ''), await warning());
await sleep(6500);
ok('after 10 s: the alarm "Blocked app: Notepad"', (await blockedApp()) === 'Blocked app: Notepad' && !(await warning()), [await blockedApp(), await warning()]);
await front('Google Chrome', 'chrome.exe');
// The app reads the window in front about once a second: wait up to 4 s (it once failed after only 0.8 s).
for (let i = 0; i < 8 && (await blockedApp()); i++) await sleep(500);
ok('closed (another window in front): the alarm stops', !(await blockedApp()), await blockedApp());
await front('Notepad', 'notepad.exe');
ok('opened again: a warning first again', /Notepad is blocked/.test(await warning() ?? '') && !(await blockedApp()), [await warning(), await blockedApp()]);
await front('Google Chrome', 'chrome.exe');

// Paused: blocking is off, so no warning and no alarm
await p.click('Pause', 'button');
await sleep(800);
ok('paused: sites are not blocked', (await tab('https://www.instagram.com/')) === false && !(await warning()) && !(await alarm()), [await warning(), await alarm()]);
await p.click('Resume', 'button');
await sleep(800);

// A new session starts counting again: a warning first
await p.click('End', 'button');
await sleep(800);
await p.ev(`[...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session')?.click(); return 1`);
await sleep(400);
await modes(); // a new session starts with the cards as they are on the Ready screen
await p.click('Start', 'button.primary');
await sleep(1500);
await tab('https://www.facebook.com/');
ok('a new session: the 1st visit is a warning again', /facebook\.com is blocked/.test(await warning() ?? '') && !(await alarm()), [await warning(), await alarm()]);

// Bangla, switched in Settings during the session (a page reload would drop the running session)
await p.click('Settings');
await p.click('বাংলা', '[aria-label="Language"] button');
await tab('https://www.instagram.com/');
const bn = await p.text('.block-warning');
ok('Bangla: the warning in Bangla (the 2nd visit of this session: a warning)', /বন্ধ রাখার তালিকায় আছে/.test(bn ?? ''), [bn]);
await p.click('পড়া'); // the alarm takes over the Study tab
await sleep(6000); // (two visits to one site within 5 s count as one)
await tab('https://www.instagram.com/');
ok('Bangla: the alarm text in Bangla', /বন্ধ করা সাইট: instagram.com/.test(await p.ev(`return ${PAGE}`)), null);
await p.click('সেটিংস');
await p.click('English', '[aria-label="ভাষা"] button');
await p.click('Study');
await p.click('End', 'button');
await main('delete globalThis.__testForeground; 1');
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
