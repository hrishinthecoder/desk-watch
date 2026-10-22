// Routine checks (Stage G3) on a TEST COPY with made-up data, through the real screen, then screenshots
// (the editor in light and dark, for the owner).
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/routines-check.mjs <screenshot folder>
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/routines-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(), today = key(now), wd = now.getDay();
const plus = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return key(d); };
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Sets a form value the way typing does (React listens to input/change events).
const set = (sel, value, i = 0) => p.ev(`const e = [...document.querySelectorAll(${JSON.stringify(sel)})][${i}]; const proto = Object.getPrototypeOf(e);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, ${JSON.stringify(String(value))});
  e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return 1`).then(() => sleep(250));
const chip = (row, day) => p.ev(`[...document.querySelectorAll('.slots tbody tr')][${row}].querySelector('.day-chips [aria-label="${day}"]').click(); return 1`).then(() => sleep(150));
const blocksOf = (date) => p.ev(`return (await window.deskwatch.blocks('${date}', '${date}')).map((b) => [b.start_min, b.skipped, b.moved])`);
const sets = () => p.ev('return await window.deskwatch.routineSets()');
const openWeek = async (bn = false) => { await p.click(bn ? 'পরিকল্পনা' : 'Planner'); await p.click(bn ? 'সপ্তাহ' : 'Week', '.planner > .cards button'); await sleep(700); };

await p.settings({ theme: 'light', language: 'en' });
await openWeek();
const lastWeek = await blocksOf(plus(-7)); // before any new routine or switch
let s = await sets();
ok('the made-up blocks are "My routine", on', s.length === 1 && s[0].name === 'My routine' && s[0].active, s.map((x) => [x.name, x.active]));
ok('the routine picker shows it', (await p.ev(`return document.querySelector('.routine-pick select').selectedOptions[0].textContent`)) === 'My routine', null);
const cols = await p.ev(`return [...document.querySelectorAll('.week .col')].map((c) => c.getAttribute('aria-label'))`);
ok('the week shows 7 real dates, today marked', cols.length === 7 && (await p.ev(`return document.querySelectorAll('.week .col.today').length`)) === 1, cols);

// A new routine through the editor: two slots, one on 3 days; copy a day; a clash is refused with nothing saved
await p.click('New routine', 'button');
await set('.routine-editor input[maxlength="60"]', 'HSC weekly');
await chip(0, DAYS[1]); // the first slot starts on the week's first day; set it to Monday, Wednesday, Friday + today
await p.ev(`const r = document.querySelector('.slots tbody tr'); for (const b of r.querySelectorAll('.day-chips button')) if (b.getAttribute('aria-pressed') === 'true') b.click(); return 1`);
await sleep(200);
for (const d of new Set([1, 3, 5, wd])) await chip(0, DAYS[d]);
await set('.slots input[type="time"]', '17:00', 0);
await set('.slots input[type="time"]', '18:30', 1);
await set('.slots select', (await p.ev(`return [...document.querySelector('.slots select').options].find((o) => o.textContent === 'Physics')?.value`)) ?? '');
await p.click('+ Time slot', 'button');
await p.ev(`const r = [...document.querySelectorAll('.slots tbody tr')][1]; for (const b of r.querySelectorAll('.day-chips button')) if (b.getAttribute('aria-pressed') === 'true') b.click(); return 1`);
await chip(1, DAYS[(wd + 1) % 7] === DAYS[1] ? DAYS[2] : DAYS[1]); // Monday (or Tuesday when tomorrow is Monday)
await set('.slots input[type="time"]', '17:30', 2);
await set('.slots input[type="time"]', '18:00', 3);
await shot(p, join(out, 'light-routine-editor.png'), true);
await p.click('Save routine', 'button');
await sleep(600);
const warn = await p.text('.routine-editor .warn');
ok('a clash: "Nothing was saved" and the day and time named', /Nothing was saved/.test(warn ?? '') && /(Monday|Tuesday): It overlaps the block at 17:00–18:30\./.test(warn ?? ''), warn);
ok('…and really nothing was saved', (await sets()).length === 1, (await sets()).map((x) => x.name));
await p.ev(`[...document.querySelectorAll('.slots tbody tr')][1].querySelector('[aria-label^="Remove time slot"]').click(); return 1`);
await sleep(200);
// Copy this day: the first day of the routine to Tuesday and Saturday
await set('.copy-day select', '1');
for (const d of [2, 6].filter((d) => d !== 1)) await p.ev(`document.querySelector('.copy-day .day-chips [aria-label="${DAYS[d]}"]').click(); return 1`);
await p.click('Copy', '.copy-day button');
const days0 = await p.ev(`return [...document.querySelectorAll('.slots tbody tr')][0].querySelectorAll('.day-chips [aria-pressed="true"]').length`);
ok('copy Monday to Tuesday and Saturday: the slot now has those days too', days0 === new Set([1, 3, 5, wd, 2, 6]).size, days0);
await p.click('Save routine', 'button');
await sleep(900);
s = await sets();
const hsc = s.find((x) => x.name === 'HSC weekly');
ok('saved; not switched on (another routine is on)', !!hsc && !hsc.active && s.find((x) => x.name === 'My routine').active, s.map((x) => [x.name, x.active]));
ok('one slot, on several days, Physics, 17:00–18:30', hsc?.slots.length === 1 && hsc.slots[0].start_min === 1020 && hsc.slots[0].length_min === 90 && hsc.slots[0].subject_id !== null, hsc?.slots);

// Only one on: switch with the picker; today and later change, the routine's blocks show
await set('.routine-pick select', String(hsc.id));
await sleep(700);
s = await sets();
ok('switching: HSC weekly on, My routine off', s.find((x) => x.name === 'HSC weekly').active && !s.find((x) => x.name === 'My routine').active, s.map((x) => [x.name, x.active]));
ok("today's blocks are HSC weekly's", JSON.stringify(await blocksOf(today)) === JSON.stringify([[1020, false, false]]), await blocksOf(today));
const names = await p.ev(`return [...document.querySelectorAll('.week .col.today .block-open span')].map((x) => x.textContent)`);
ok('the week shows it, named after its subject', JSON.stringify(names) === JSON.stringify(['Physics']), names);

// One day: skip today's block, undo; move it, the same weekday next week is unchanged
await p.click('Skip this day', '.week .col.today button');
await sleep(600);
ok('skip this day: skipped, shown as "Skipped this day"', (await blocksOf(today))[0]?.[1] === true && /Skipped this day/.test(await p.text('.week .col.today') ?? ''), await blocksOf(today));
await p.click('Undo', '.week .col.today button');
await sleep(600);
ok('undo: back', (await blocksOf(today))[0]?.[1] === false, await blocksOf(today));
await p.click('Change this day', '.week .col.today button');
await set('.week .col.today .block-move input', '20:00', 0);
await set('.week .col.today .block-move input', '21:00', 1);
await p.click('Save', '.week .col.today .block-move button');
await sleep(700);
ok('change this day: 20:00 today only', JSON.stringify(await blocksOf(today)) === JSON.stringify([[1200, false, true]]) && JSON.stringify(await blocksOf(plus(7))) === JSON.stringify([[1020, false, false]]), [await blocksOf(today), await blocksOf(plus(7))]);
await p.ev(`return (await window.deskwatch.routines()).filter((b) => b.date === '${today}').map((b) => b.start_min)`).then((r) => ok('the Study tab and reminders see the moved time', JSON.stringify(r) === '[1200]', r));

// Edit the routine: future only. Change 17:00 → 16:00: the moved day stays moved, next week is 16:00
await p.click('Edit routine', 'button');
await set('.slots input[type="time"]', '16:00', 0);
await set('.slots input[type="time"]', '17:30', 1);
await p.click('Save routine', 'button');
await sleep(800);
ok('edit: next week at 16:00; today keeps its own move', JSON.stringify(await blocksOf(plus(7))) === JSON.stringify([[960, false, false]]) && (await blocksOf(today))[0]?.[0] === 1200, [await blocksOf(today), await blocksOf(plus(7))]);
ok('last week unchanged through the new routine, the switch and the edit', JSON.stringify(await blocksOf(plus(-7))) === JSON.stringify(lastWeek), [lastWeek, await blocksOf(plus(-7))]);

// Bangla: the screen and the editor
await p.settings({ language: 'bn' });
await openWeek(true);
await p.click('রুটিন বদলান', 'button');
await shot(p, join(out, 'bn-routine-editor.png'), true);
const bn = await p.ev(`return [...new Set((document.querySelector('.routine-editor').innerText.match(/[A-Za-z][A-Za-z'’]*/g) ?? []))]`);
ok('Bangla editor: no English words (besides the made-up names)', bn.every((w) => ['HSC', 'weekly', 'Physics', 'Maths', 'Chemistry', 'English', 'Exam', 'Light', 'My', 'list', 'mode', 'Chapter', 'exercises', 'Integration', 'worksheet', 'Read', 'organic', 'chemistry', 'notes', 'Lab', 'report', 'Poem', 'analysis', 'Revise', 'formulas', 'Return', 'library', 'books', 'Essay', 'draft', 'Session', 'Camera', 'Blocker', 'Pomodoro', 'Break'].includes(w)), bn);
await p.settings({ language: 'en', theme: 'dark' });
await openWeek();
await shot(p, join(out, 'dark-week.png'));
await p.click('Edit routine', 'button');
await shot(p, join(out, 'dark-routine-editor.png'), true);
await p.settings({ theme: 'light' });
await openWeek();
await shot(p, join(out, 'light-week.png'));
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
