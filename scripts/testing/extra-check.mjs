// Two TESTING.md boxes the other checks do not cover (Stage E3 Part 4), on a TEST COPY with made-up data:
// the tray menu in Bangla, and Bangla quick add (`রচনা আগামীকাল ~৩`) typed into the real box.
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/extra-check.mjs
import { main, page, sleep } from './cdp.mjs';

const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };

// The tray menu is rebuilt when the language changes: record the labels it is given.
await main(`(() => { const { Tray } = require('electron'); globalThis.__tray = [];
  const real = Tray.prototype.setContextMenu;
  Tray.prototype.setContextMenu = function (m) { globalThis.__tray.push(m.items.map((i) => i.label)); return real.call(this, m); };
  return 1; })()`);
await p.settings({ language: 'bn', alarmVolume: 0 });
const menus = await main('globalThis.__tray');
ok('tray menu in Bangla', JSON.stringify(menus?.at(-1)) === JSON.stringify(['Desk Watch খুলুন', 'বন্ধ করুন']), menus);

// Bangla quick add, typed like a keyboard
const tomorrow = new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
await p.click('পরিকল্পনা');
await sleep(800);
await p.ev(`document.querySelector('.quick-input').focus(); return 1`);
await p.send('Input.insertText', { text: 'রচনা আগামীকাল ~৩' });
await sleep(300);
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await sleep(800);
const t = (await p.ev('return await window.deskwatch.tasks()')).find((x) => x.title === 'রচনা');
ok('Bangla quick add: due tomorrow, 3 pomodoros', t?.due === tomorrow && t.est_min === 75, t); // 3 × 25 min

// "Week starts on" (2026-10-21): a drop-down with all 7 days, in the chosen language; Wednesday moves the Planner's week.
const weekSelect = `[...document.querySelectorAll('label.field')].find((l) => l.textContent.startsWith(WEEK))?.querySelector('select')`;
const options = (week) => p.ev(`const WEEK = ${JSON.stringify(week)}; return [...(${weekSelect})?.options ?? []].map((o) => o.textContent)`);
await p.click('সেটিংস');
ok('Bangla: the week drop-down lists the 7 days in Bangla', JSON.stringify(await options('সপ্তাহ শুরু হয়')) === JSON.stringify(['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার']), await options('সপ্তাহ শুরু হয়'));
await p.settings({ language: 'en' });
await p.click('Settings');
const days7 = await options('Week starts on');
ok('English: 7 days, Saturday first, Monday chosen (the default)', JSON.stringify(days7) === JSON.stringify(['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
  && (await p.ev(`const WEEK = 'Week starts on'; return ${weekSelect}.value`)) === '1', days7);
await p.ev(`const WEEK = 'Week starts on'; const s = ${weekSelect}; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, '3');
  s.dispatchEvent(new Event('change', { bubbles: true })); return 1`);
await sleep(500);
ok('choosing Wednesday saves it', (await p.ev('return window.deskwatch.getSettings().weekStart')) === 3, await p.ev('return window.deskwatch.getSettings().weekStart'));
await p.click('Planner');
await p.click('Week', '[aria-label="View"] button');
await sleep(500);
const cols = await p.ev(`return [...document.querySelectorAll('.week .col h3')].map((h) => h.textContent.split(' ')[0])`); // headings are "Wed 21" (G3)
ok('Planner → Week starts on Wednesday', JSON.stringify(cols) === JSON.stringify(['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']), cols);
await p.settings({ weekStart: 1 });

await main(`(() => { globalThis.__tray = null; return 1; })()`);
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
