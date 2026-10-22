// Stats checks (Stage G1) on a TEST COPY with made-up data, then screenshots (light + dark).
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/stats-check.mjs <screenshot folder>
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/stats-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const secs = (t) => t.split(':').reduce((a, x) => a * 60 + Number(x), 0);
const period = async (name) => { await p.click(name, '.history > .cards .card'); await sleep(400); };
const table = () => p.ev(`return [...document.querySelectorAll('.by-table tbody tr')].map((r) => [...r.cells].map((c) => c.textContent))`);
// The page's own data for a period: sessions that started on or after `from`.
const counts = (fromExpr) => p.ev(`const from = ${fromExpr}; const r = await window.deskwatch.range(0, Date.now() + 1);
  return r.sessions.filter((s) => s.started_at >= from).length`);
const DAY0 = `(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })()`;

await p.settings({ theme: 'light', language: 'en', pomoMin: 25 });
await p.click('History');
await sleep(800);
const periods = await p.ev(`return [...document.querySelectorAll('.history > .cards .card')].map((b) => b.textContent)`);
ok('periods: Today, This week, 7 days, 30 days, All time', JSON.stringify(periods) === JSON.stringify(['Today', 'This week', '7 days', '30 days', 'All time']), periods);

for (const [name, from] of [['7 days', `${DAY0} - 6 * 86400000`], ['30 days', `${DAY0} - 29 * 86400000`], ['All time', '0']]) {
  await period(name);
  const rows = await table();
  const sessions = rows.reduce((a, r) => a + Number(r[3]), 0);
  const focused = rows.reduce((a, r) => a + secs(r[1]), 0);
  const total = secs(await p.text('.numbers > div b'));
  ok(`${name}: every session in exactly one task row (${sessions} sessions)`, sessions === await counts(from) && sessions > 0, [sessions, await counts(from)]);
  ok(`${name}: the rows add up to the focused time above (±1 s per row)`, Math.abs(focused - total) <= rows.length, [focused, total]);
  ok(`${name}: "No task" is the last row, the others most focused first`, rows.at(-1)[0] === 'No task'
    && rows.slice(0, -1).every((r, i, a) => i === 0 || secs(a[i - 1][1]) >= secs(r[1])), rows.map((r) => r.slice(0, 2)));
}
// All time: the tasks the made-up sessions were linked to; pomodoros = focused time / 25 min
let rows = await table();
const ch = rows.find((r) => r[0] === 'Chapter 3 exercises');
ok('All time: "Chapter 3 exercises" with its pomodoros (focused ÷ 25 min, rounded down)', !!ch && Number(ch[2]) === Math.floor(secs(ch[1]) / 1500), ch);
await shot(p, join(out, 'light-history-by-task.png'));
await p.click('By subject', '.by-table .card');
rows = await table();
ok('By subject: Physics and Maths, "No subject" last', rows.some((r) => r[0] === 'Physics') && rows.some((r) => r[0] === 'Maths') && rows.at(-1)[0] === 'No subject', rows.map((r) => r[0]));
await shot(p, join(out, 'light-history-by-subject.png'));

// Bars: each day says its pomodoros
await period('7 days');
const bar = await p.ev(`return [...document.querySelectorAll('.bars .bar')].map((b) => [b.title, b.querySelector('.bar-pomos').textContent])`);
ok('7 days: each bar says its focused minutes and pomodoros; the number above it is the pomodoros',
  bar.length === 7 && bar.every(([title, num]) => { const [, m, pp] = title.match(/^(\d+) focused min · (\d+) pomodoros$/) ?? []; return m !== undefined && Number(pp) === Math.floor(Number(m) / 25) && (num === '' ? pp === '0' : num === pp); }), bar);

// This week: the same table under the week review
await period('This week');
ok('This week: the table is there too (the made-up data has sessions today)', (await p.ev(`return !!document.querySelector('.review') && !!document.querySelector('.by-table')`)) === true, null);

// Session report: the task and the pomodoros
const linked = await p.ev(`const r = await window.deskwatch.range(0, Date.now() + 1); const tasks = await window.deskwatch.tasks();
  const s = r.sessions.filter((x) => x.task_id).at(-1); return { day: new Date(s.started_at).setHours(0, 0, 0, 0), title: tasks.find((t) => t.id === s.task_id).title, focused: s.focused_sec }`);
await p.ev(`location.hash = ''; return 1`);
await period('30 days');
await p.ev(`const b = [...document.querySelectorAll('.bars .bar')]; const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  b[b.length - 1 - Math.round((d0.getTime() - ${linked.day}) / 86400000)].click(); return 1`);
await sleep(800);
await p.ev(`const rows = [...document.querySelectorAll('.history button')].filter((b) => /focused/.test(b.textContent)); (rows.at(-1) ?? rows[0])?.click(); return 1`);
await sleep(800);
const head = await p.text('.report > p.muted');
ok('session report: "Task: …" and its pomodoros', /Task: /.test(head ?? '') && / · \d+ pomodoros?$/.test(head ?? ''), head);
await shot(p, join(out, 'light-session-report.png'));

// Dark
await p.settings({ theme: 'dark' });
await p.click('History');
await period('All time');
await shot(p, join(out, 'dark-history-by-task.png'));
await p.settings({ theme: 'light' });
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
