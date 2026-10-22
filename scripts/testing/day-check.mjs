// Day view and goals checks (Stage E4 Part 3) on a TEST COPY with made-up data, then screenshots (light + dark).
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/day-check.mjs <screenshot folder>
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/day-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const now = new Date();
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const items = (col) => p.ev(`return [...document.querySelectorAll('.day-col[aria-label="${col}"] .day-item')].map((i) => i.querySelector('b').textContent + ' | ' + i.querySelector('small').textContent)`);

// Something scheduled today: a weekly block for today's weekday and a task at 19:30 with 2 pomodoros.
await p.ev(`return await window.deskwatch.saveRoutine({ day: ${now.getDay()}, start_min: 1200, length_min: 90, task_id: null, camera_mode: 1, screen_mode: 0, block_set_id: null })`);
await p.ev(`return await window.deskwatch.saveTask({ title: 'Past papers', notes: '', subtasks: [], due: '${key(now)}', due_min: 1170, repeat: 'none', priority: 2, est_min: 50, status: 'todo', subject_id: null })`);
const today = await p.ev(`const d = new Date(); d.setHours(0, 0, 0, 0); return (await window.deskwatch.range(d.getTime(), Date.now() + 1)).sessions.length`);

await p.click('Planner');
await p.click('Day', '[aria-label="View"] button');
await sleep(600);
const sched = await items('Scheduled'), done = await items('Done');
// (seed.mjs also has weekly blocks on some weekdays, so other items may be there too: look for the two added here.)
const iPaper = sched.findIndex((x) => x.startsWith('Past papers | 19:30 · 2 pomodoros · 50 min')), iBlock = sched.findIndex((x) => x.startsWith('Study block | 20:00–21:30 · weekly block'));
ok('Scheduled: the weekly block and the task with a time, in time order', iPaper >= 0 && iBlock === iPaper + 1, sched);
if (today === 0) console.log("SKIP today's sessions: seed.mjs has no room for them just after midnight (before about 01:10)");
else {
  ok("Done: today's sessions with their focused minutes", done.length === today && done.every((x) => /min focused|running/.test(x)), [today, done]);
  await p.ev(`document.querySelector('.day-item.session').click(); return 1`);
  await sleep(800);
  ok('clicking a session shows its report', /minutes focused|focused/.test((await p.text('.day-report')) ?? ''), (await p.text('.day-report'))?.slice(0, 120));
}
await shot(p, join(out, 'light-day.png'));
await p.ev(`document.querySelector('[aria-label="Previous day"]').click(); return 1`);
await sleep(600);
const y = new Date(now); y.setDate(y.getDate() - 1);
const yd = await p.ev(`const d = new Date(${y.getTime()}); d.setHours(0, 0, 0, 0); return (await window.deskwatch.range(d.getTime(), d.getTime() + 86400000)).sessions.length`);
ok('‹ goes to yesterday: its sessions, and no report left open', (await p.ev(`return document.querySelector('[aria-label="Day"]').value`)) === key(y) && (await items('Done')).length === yd && !(await p.text('.day-report')), [yd, await items('Done')]);
await p.click('Today', '.day-nav button');

// Daily goal in the stats row; changed in Settings
await p.click('List', '[aria-label="View"] button');
const focusedSec = await p.ev(`const d = new Date(); d.setHours(0, 0, 0, 0); const r = await window.deskwatch.range(d.getTime(), Date.now() + 1);
  return r.segments.filter((s) => ['FOCUSED', 'WRITING', 'READING', 'SPEAKING', 'IDLE'].includes(s.activity)).reduce((a, s) => a + (s.end - s.start) / 1000, 0)`);
const goal = () => p.ev(`return [...document.querySelectorAll('.stats-row div')].find((x) => x.querySelector('dt').textContent === 'Daily goal')?.querySelector('dd').textContent`);
ok('stats row: "N of 8" pomodoros today', (await goal()) === `${Math.floor(focusedSec / 1500)} of 8`, [await goal(), focusedSec]);
await p.settings({ dailyPomos: 4 });
await p.click('Planner');
ok('Settings → Daily goal 4: "of 4"', (await goal())?.endsWith('of 4'), await goal());

// Completing a task with an estimate says how it went
await p.click('All tasks', '.list-item');
await p.ev(`[...document.querySelectorAll('.task-row')].find((r) => r.getAttribute('aria-label') === 'Chapter 3 exercises').querySelector('.tick').click(); return 1`);
await sleep(1200);
const ch = (await p.ev('return await window.deskwatch.tasks()')).find((t) => t.title === 'Chapter 3 exercises');
ok('completing: "Estimated 4 pomodoros (1 h 40 min), took N."', (await p.text('.toast span')) === `Done: Chapter 3 exercises. Estimated 4 pomodoros (1 h 40 min), took ${Math.floor(ch.focused_sec / 1500)}.`, await p.text('.toast span'));
await shot(p, join(out, 'light-todo-goal.png'));

// Dark
await p.settings({ theme: 'dark' });
await p.click('Planner');
await p.click('Day', '[aria-label="View"] button');
await sleep(500);
await p.ev(`document.querySelector('.day-item.session')?.click(); return 1`);
await sleep(600);
await shot(p, join(out, 'dark-day.png'));
await p.click('List', '[aria-label="View"] button');
await shot(p, join(out, 'dark-todo-goal.png'));
await p.settings({ theme: 'light' });
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
