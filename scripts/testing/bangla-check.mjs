// Bangla checks (Stage E3 Part 4) on a TEST COPY with made-up data, then screenshots (light + dark).
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/bangla-check.mjs <screenshot folder>
// Also lists any English words left on each screen (besides names, brands and the made-up English task data).
// Focus mode's real full screen is recorded instead of shown (it would cover the owner's screen), as in focus-check.mjs.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/bangla-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
// Words that stay in English on purpose: names, brands, keys, file types, Chrome's own menu names, and the
// made-up data (block set names, task titles and subjects typed in English by seed.mjs).
const KEEP = new Set(`Desk Watch Chrome Edge Windows Firefox CSV JSON Esc Tab Enter Ctrl Space Delete N K Developer mode Load unpacked
  Allow in incognito options details Settings Privacy security Camera Discord youtube com shorts Instagram Facebook TikTok YouTube Shorts
  X Reddit Netflix My list Exam Light Physics Maths Chemistry English History Chapter exercises Integration worksheet Read organic chemistry
  notes Essay draft Revise formulas Lab report Poem analysis Return library books Questions Results table Graph Conclusion Study fake
  file capture video y4m Users AppData Local Temp claude scratchpad deskwatch db tc bn HRISHI desk watch C
  Focus Screen Blocker Strict mode Pomodoro Break Long break Board Calibration calibrate Countdown Count up Debug Dark White Pink Brown noise Session`.split(/\s+/));
// The last line: app terms kept in Latin script in Bangla on purpose (owner's wording rule, 2026-10-23; scripts/bangla-terms.mjs).
// The page text without file paths (<code>) and the camera list (the fake camera's file name).
const english = () => p.ev(`const b = document.body.cloneNode(true); b.querySelectorAll('code, select, .stage').forEach((e) => e.remove());
  document.body.append(b); b.style.position = 'absolute'; b.style.left = '-99999px';
  const t = b.innerText; b.remove(); return [...new Set((t.match(/[A-Za-z][A-Za-z'’]*/g) ?? []))]`);
const keep = new Set([...KEEP].map((w) => w.toLowerCase()));
const leftover = async (where) => {
  const words = (await english()).filter((w) => !keep.has(w.toLowerCase()) && !/^[A-Z]$/.test(w));
  ok(`${where}: no English words left`, words.length === 0, words);
};
const bnDigits = (s) => /[০-৯]/.test(s ?? '') && !/[0-9]/.test(s ?? '');

await main(`(() => { const { ipcMain } = require('electron'); globalThis.__fwReal = ipcMain.listeners('focus:window'); globalThis.__fw = [];
  ipcMain.removeAllListeners('focus:window'); ipcMain.on('focus:window', (_e, on) => globalThis.__fw.push(on)); return 1; })()`);
await p.settings({ theme: 'light', language: 'en', lastCamera: false, alarmVolume: 0 });

// Switch in Settings → App, the real way
await p.click('Settings');
await p.click('বাংলা', '[aria-label="Language"] button');
await sleep(600);
ok('Settings → App → বাংলা: the screen changes at once and the choice is saved', (await p.text('.tabs button')) === 'পড়া' && (await p.ev('return window.deskwatch.getSettings().language')) === 'bn', [await p.text('.tabs button')]);
await p.ev(`[...document.querySelectorAll('h3')].find((h) => h.textContent === 'অ্যাপ').scrollIntoView({ block: 'start' }); return 1`);
await shot(p, join(out, 'light-bn-settings.png'));
await leftover('Settings');

// Study
await p.click('পড়া');
await sleep(500);
// The big clock must not change width as the digits change (DESIGN.md): every Bangla digit as wide as the others.
const widths = await p.ev(`const s = document.createElement('span'); s.className = 'clock'; s.style.position = 'absolute'; document.body.append(s);
  const w = [...'০১২৩৪৫৬৭৮৯'].map((d) => { s.innerHTML = '<span class="dg">' + d + '</span>'.repeat(1) + ':' + '<span class="dg">' + d + '</span>'; return Math.round(s.getBoundingClientRect().width * 10) / 10; }); s.remove(); return w`); // drawn as ClockText draws it
ok('Bangla clock digits are all the same width (tabular)', new Set(widths).size === 1, widths);
ok('Study: Bangla words and Bangla digits on the clock', (await p.text('.primary.start')) === 'শুরু করুন' && bnDigits(await p.text('.clock')), [await p.text('.primary.start'), await p.text('.clock')]);
await shot(p, join(out, 'light-bn-study.png'));
await leftover('Study');

// Planner: lists, stats, Bangla dates
await p.click('পরিকল্পনা');
await sleep(600);
const meta = await p.ev(`return [...document.querySelectorAll('.task-meta')].map((m) => m.textContent).join(' | ')`);
ok('Planner: list names, stats and dates in Bangla', (await p.text('.todo-main h2')) === 'আজ' && bnDigits(await p.text('.stats-row dd')) && /অক্টো|নভে|সেপ্টে/.test(meta), [await p.text('.todo-main h2'), await p.text('.stats-row dd'), meta]);
await shot(p, join(out, 'light-bn-todo.png'));
await leftover('Planner');
await p.click('দিন', '[aria-label="দেখার ধরন"] button');
await sleep(500);
ok('Day view: Bangla date title and hours', /অক্টোবর|নভেম্বর|সেপ্টেম্বর/.test((await p.text('.day-nav h3')) ?? '') && bnDigits(await p.text('.day-hours span')), [await p.text('.day-nav h3'), await p.text('.day-hours span')]);
await p.click('সপ্তাহ', '[aria-label="দেখার ধরন"] button');
ok('Week view: Bangla weekday names', /রবি|সোম/.test((await p.ev(`return [...document.querySelectorAll('.week h3')].map((h) => h.textContent).join(' ')`)) ?? ''), await p.ev(`return [...document.querySelectorAll('.week h3')].map((h) => h.textContent).join(' ')`));

// History
await p.click('ইতিহাস');
await p.click('এই সপ্তাহ', '[aria-label="সময়কাল"] button');
await sleep(500);
ok('History → This week: Bangla sentences and weekday name', /সেরা দিন/.test((await p.text('.review')) ?? '') && /বার/.test((await p.text('.review dd')) ?? ''), (await p.text('.review'))?.slice(0, 120));
await shot(p, join(out, 'light-bn-history.png'));
await leftover('History');

// A message from the main process comes back in Bangla
ok('Main-process messages are in Bangla too', (await p.ev(`return await window.deskwatch.saveSubject('  ')`)) === 'বিষয়টির একটি নাম দিন।', await p.ev(`return await window.deskwatch.saveSubject('  ')`));

// Focus mode (full screen recorded, not shown)
await p.click('পরিকল্পনা');
await p.click('তালিকা', '[aria-label="দেখার ধরন"] button');
await p.ev(`document.querySelector('.task-row .start').click(); return 1`);
await sleep(1000);
ok('Focus mode: the timer before the start is in Bangla', (await p.text('.focus-state'))?.includes('টাইমার ঠিক করুন'), await p.text('.focus-state'));
await leftover('Focus mode timer');
await p.click('শুরু করুন', '.focus-primary');
await sleep(1500);
ok('Focus mode: Bangla buttons and clock', (await p.text('.focus-primary'))?.includes('থামান') && bnDigits(await p.text('.focus-clock')), [await p.text('.focus-primary'), await p.text('.focus-clock')]);
await shot(p, join(out, 'bn-focus.png'));
await leftover('Focus mode');
await p.click('শেষ করুন', '.focus-quiet');
await p.click('সেশন শেষ করুন', '.focus-dialog button');
await sleep(1500);

// The Debug tab stays English
await p.settings({ showDebug: true });
await p.click('Debug');
await sleep(500);
ok('Debug tab stays English', (await p.ev(`return document.querySelector('.debug')?.innerText ?? ''`)).match(/Record|clip|Checks/i) !== null, (await p.ev(`return document.querySelector('.debug')?.innerText ?? ''`)).slice(0, 80));
await p.settings({ showDebug: false });

// Setup's Welcome step offers the language first
await p.click('সাহায্য');
await p.click('আবার সেটআপ চালান', '.help-menu button');
await sleep(600);
ok('Setup Welcome: the language cards first, in Bangla', (await p.text('.first-run h2')) === 'Desk Watch-এ স্বাগতম' && !!(await p.text('.first-run [aria-label="ভাষা"]')), await p.text('.first-run h2'));
await shot(p, join(out, 'light-bn-welcome.png'));
await p.click('সেটআপ বাদ দিন', '.skip-setup');

// Dark theme screenshots
await p.settings({ theme: 'dark' });
for (const [tab, file] of [['পড়া', 'dark-bn-study.png'], ['পরিকল্পনা', 'dark-bn-todo.png'], ['ইতিহাস', 'dark-bn-history.png']]) {
  await p.click(tab); await sleep(500);
  await shot(p, join(out, file));
}

// Back to English
await p.click('সেটিংস');
await p.click('English', '[aria-label="ভাষা"] button');
await sleep(500);
ok('English again: tabs and digits back', (await p.text('.tabs button')) === 'Study' && ((await p.ev('return window.deskwatch.getSettings().language')) ?? 'en') === 'en', await p.text('.tabs button')); // 'en' is the default, so it is not stored
await p.settings({ theme: 'light' });
await main(`(() => { const { ipcMain } = require('electron'); ipcMain.removeAllListeners('focus:window'); for (const f of globalThis.__fwReal) ipcMain.on('focus:window', f); return 1; })()`);
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
