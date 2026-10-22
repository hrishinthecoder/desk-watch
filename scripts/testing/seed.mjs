// Fills a TEST COPY with made-up data: about 40 sessions over the last 30 days (with phone, looking down,
// away, looking away, breaks and blocked sites), 4 subjects, 8 tasks and 4 weekly blocks. Deterministic.
// Usage (test copy running, see test-copy.sh):  node scripts/testing/seed.mjs
import { DatabaseSync } from 'node:sqlite';
import { appendFileSync } from 'node:fs';
import { page } from './cdp.mjs';

// SEED_LOG=<file>: each step with its time, to see where a freeze happened (open issue in CLAUDE.md).
const step = (what) => { if (process.env.SEED_LOG) appendFileSync(process.env.SEED_LOG, `${new Date().toISOString()} ${what}\n`); };
step('connect');

const p = await page();
step('connected');
let r = 7;
const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
const M = 60000, now = Date.now(), day0 = new Date(); day0.setHours(0, 0, 0, 0);
const DISTRACT = ['PHONE', 'DOWN', 'AWAY', 'LOOKING_AWAY'];
const plan = [];
for (let d = 29; d >= 0; d--) {
  if (rnd() < 0.2 && d !== 0) continue; // some days off
  const n = d === 0 ? 2 : 1 + Math.floor(rnd() * 2);
  for (let k = 0; k < n; k++) {
    const len = [25, 50, 50, 90][Math.floor(rnd() * 4)];
    // Today: at 9:00 and 15:00, or (checks run at night, e.g. 02:00) two short ones right after midnight, so "today"
    // has sessions whenever there is room for them (from about 01:10).
    const late = now - day0.getTime() < 17 * 3600000;
    if (d === 0 && late) plan.push({ start: day0.getTime() + [5, 35][k] * M, len: 15, today: true });
    else plan.push({ start: day0.getTime() - d * 86400000 + (d === 0 ? [9, 15][k] : 10 + k * 5) * 3600000, len });
  }
}
const ids = [];
for (const s of plan) {
  if (s.today ? s.start + 35 * M > now : s.start > now - 2 * 3600000) continue; // no session may end in the future
  const segs = []; let t = s.start, focused = 0;
  while (focused < s.len * M) {
    const x = rnd();
    const act = x < 0.08 ? 'PHONE' : x < 0.12 ? 'DOWN' : x < 0.15 ? 'AWAY' : x < 0.18 ? 'LOOKING_AWAY' : x < 0.2 && s.len >= 50 ? 'BREAK'
      : ['READING', 'WRITING', 'READING', 'IDLE', 'SPEAKING'][Math.floor(rnd() * 5)];
    const len = act === 'BREAK' ? 5 * M : DISTRACT.includes(act) ? (0.5 + rnd() * 2.5) * M : (2 + rnd() * 12) * M;
    segs.push([act, t, t + len]); t += len;
    if (!DISTRACT.includes(act) && act !== 'BREAK') focused += len;
  }
  step(`session ${ids.length + 1} (${segs.length} segments)`);
  const sid = await p.ev(`const d = window.deskwatch; const id = await d.sessionStart({ startedAt: ${s.start}, plannedMin: ${s.len}, cameraMode: true, screenMode: false });
    for (const [a, s, e] of ${JSON.stringify(segs)}) { const g = await d.segmentStart(id, a, s); await d.segmentExtend(g, e); }
    await d.sessionFinish(id, ${t}, false); return id`);
  ids.push({ sid, start: s.start, end: t });
}
// Blocked sites/apps and site usage are written straight into the test copy's file (made-up rows).
step('open the database file directly');
const db = new DatabaseSync(await p.ev(`return await window.deskwatch.dataPath()`), { timeout: 5000 }); // waits if the app is writing
const sites = ['youtube.com', 'instagram.com', 'facebook.com'];
for (const { sid, start, end } of ids) {
  db.exec(`UPDATE sessions SET screen_mode = 1 WHERE id = ${sid}`);
  for (let i = 0, n = Math.floor(rnd() * 4); i < n; i++)
    db.prepare('INSERT INTO events (session_id, type, at, detail) VALUES (?, ?, ?, ?)').run(sid, 'blocked_attempt', Math.round(start + rnd() * (end - start)), i === 2 ? 'app:Steam' : 'site:' + sites[Math.floor(rnd() * 3)]);
  const u = db.prepare('INSERT INTO app_usage (session_id, kind, name, start_at, end_at) VALUES (?, ?, ?, ?, ?)');
  u.run(sid, 'app', 'Visual Studio Code', start, start + (end - start) * 0.5);
  u.run(sid, 'site', 'khanacademy.org', start + (end - start) * 0.5, start + (end - start) * 0.8);
}
// Tasks (Stage E4): subjects, due dates around today, estimates in pomodoros, steps, one repeating task.
step('direct writes done');
const key = (n) => { const d = new Date(day0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
for (const s of ['Physics', 'Maths', 'Chemistry', 'English']) await p.ev(`return await window.deskwatch.saveSubject('${s}')`);
const subj = Object.fromEntries((await p.ev('return await window.deskwatch.subjects()')).map((s) => [s.name, s.id]));
const TASKS = [
  // subject, title, due (days from today, null = none), priority, pomodoros, status, repeat, steps
  ['Physics', 'Chapter 3 exercises', 0, 1, 4, 'doing', 'none', ['Questions 1-10', 'Questions 11-20']],
  ['Maths', 'Integration worksheet', -2, 1, 3, 'todo', 'none', []],
  ['Chemistry', 'Read organic chemistry notes', null, 2, 2, 'todo', 'none', []],
  ['English', 'Essay draft', 0, 3, 2, 'done', 'none', []],
  ['Maths', 'Revise formulas', 0, 2, 1, 'todo', 'daily', []],
  ['Physics', 'Lab report', 1, 2, 3, 'todo', 'none', ['Results table', 'Graph', 'Conclusion']],
  ['English', 'Poem analysis', 3, 2, 2, 'todo', 'none', []],
  [null, 'Return library books', 5, 3, null, 'todo', 'none', []],
];
for (const [s, title, due, pr, est, status, repeat, steps] of TASKS)
  await p.ev(`return await window.deskwatch.saveTask(${JSON.stringify({ subject_id: s ? subj[s] : null, title, notes: '', due: due === null ? null : key(due),
    due_min: null, repeat, priority: pr, est_min: est === null ? null : est * 25, status, subtasks: steps.map((t, i) => ({ title: t, done: i === 0 })) })})`);
// Some of the made-up sessions were for the first tasks, so they show studied time and pomodoros done.
step('tasks saved');
const taskIds = (await p.ev('return await window.deskwatch.tasks()')).map((t) => t.id);
ids.slice(-6).forEach(({ sid }, i) => db.exec(`UPDATE sessions SET task_id = ${taskIds[i % 2]} WHERE id = ${sid}`));
db.close();
step('database file closed');
for (const [day, start] of [[1, 17 * 60], [3, 17 * 60], [5, 9 * 60 + 30], [6, 20 * 60]])
  await p.ev(`return await window.deskwatch.saveRoutine({ day: ${day}, start_min: ${start}, length_min: 60, task_id: null, camera_mode: 1, screen_mode: ${day % 2}, block_set_id: null })`);
// Made-up data counts as an existing user: no first-run setup, no tours over the screenshots.
step('routines saved');
await p.settings({ setupDone: true, setupStep: '', toursSeen: 'study,planner,history,settings', alarmVolume: 0 });
p.close();
step('done');
console.log('seeded', ids.length, 'made-up sessions');
