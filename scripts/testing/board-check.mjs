// Board checks (Stage G2) on a TEST COPY with made-up data, then screenshots (light + dark).
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/board-check.mjs <screenshot folder>
// Keys go through DevTools input events (like a real keyboard); drag and drop is a synthetic drag (real mouse dragging = owner).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/board-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const col = (name) => p.ev(`return [...document.querySelectorAll('.board .col[aria-label="${name}"] .task-card')].map((c) => c.getAttribute('aria-label'))`);
const card = (title) => `[...document.querySelectorAll('.task-card')].find((c) => c.getAttribute('aria-label') === ${JSON.stringify(title)})`;
const tasks = () => p.ev('return await window.deskwatch.tasks()');
const drag = (from, to) => p.ev(`const a = ${from}, b = ${to}; const dt = new DataTransfer();
  a.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  b.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
  b.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); return 1`).then(() => sleep(900));
const key = async (k, code) => { await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code: k, windowsVirtualKeyCode: code });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code }); await sleep(700); };
const filter = async (value) => { await p.ev(`const s = document.querySelector('.board-filter select'); const o = [...s.options].find((x) => x.textContent === ${JSON.stringify(value)});
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, o.value); s.dispatchEvent(new Event('change', { bubbles: true })); return 1`); await sleep(400); };

await p.settings({ theme: 'light', language: 'en', pomoMin: 25 });
await p.click('Planner');
await p.click('Board', '[aria-label="View"] button');
await sleep(600);

// The SAME tasks as the list, by status
const all = await tasks();
const byStatus = (s) => all.filter((t) => t.status === s).map((t) => t.title).sort();
const cols = { todo: await col('To do'), doing: await col('Doing'), done: await col('Done') };
ok('three columns hold exactly the to-do list\'s tasks by status', ['todo', 'doing', 'done'].every((s) => JSON.stringify([...cols[s]].sort()) === JSON.stringify(byStatus(s))), cols);

// Compact card: subject, estimate, progress
const meta = await p.ev(`return ${card('Chapter 3 exercises')}.querySelector('.card-meta').textContent`);
const ch = all.find((t) => t.title === 'Chapter 3 exercises');
// Progress in minutes with its unit, and "over" said plainly (owner, 2026-10-23)
const doneMin = Math.floor(ch.focused_sec / 60), over = doneMin - ch.est_min;
ok('card: subject · "N of M min" (and "+K min over" when over)', meta === `Physics · ${doneMin} of ${ch.est_min} min${over > 0 ? ` · +${over} min over` : ''}`, meta);
const overCard = all.find((t) => t.est_min && Math.floor(t.focused_sec / 60) > t.est_min);
if (overCard) ok('a task over its estimate: amber bar and "+K min over"', await p.ev(`const c = ${card(overCard.title)}; return !!c.querySelector('.card-progress.over') && /min over/.test(c.textContent)`), overCard.title);
ok('card: a progress bar when there is an estimate', await p.ev(`return !!${card('Chapter 3 exercises')}.querySelector('.card-progress span')`), null);
await shot(p, join(out, 'light-board.png'));

// Subject filter
await filter('Physics');
const phys = [...await col('To do'), ...await col('Doing'), ...await col('Done')];
ok('filter Physics: only Physics tasks', phys.length > 0 && phys.every((x) => all.find((t) => t.title === x).subject === 'Physics') && phys.length === all.filter((t) => t.subject === 'Physics').length, phys);
await filter('No subject');
const none = [...await col('To do'), ...await col('Doing'), ...await col('Done')];
ok('filter No subject: only tasks without one', JSON.stringify(none) === JSON.stringify(all.filter((t) => !t.subject_id).map((t) => t.title)), none);
await filter('All subjects');

// Click a card → the list's side panel; it saves
await p.ev(`${card('Lab report')}.click(); return 1`);
await sleep(600);
ok('click a card: the same side panel as the list, for that task', (await p.ev(`return document.querySelector('.board-view .task-panel input')?.value`)) === 'Lab report', await p.ev(`return document.querySelector('.task-panel')?.textContent.slice(0, 60)`));
await shot(p, join(out, 'light-board-panel.png'));
// (notes are saved when the box loses focus, so: focus it, type, then leave it)
await p.ev(`document.querySelector('.task-panel textarea').focus(); return 1`);
await p.send('Input.insertText', { text: 'from the board' });
await sleep(300);
await p.ev(`document.querySelector('.task-panel textarea').blur(); return 1`);
await sleep(1200);
await p.ev(`document.querySelector('.task-panel [aria-label="Close"]').click(); return 1`);
await sleep(400);
ok('the panel saved the notes (same task data)', (await tasks()).find((t) => t.title === 'Lab report').notes === 'from the board', (await tasks()).find((t) => t.title === 'Lab report').notes);

// Reorder inside a column: the last To do card onto the first; the list (All tasks) shows the same order
const before = await col('To do');
await drag(card(before.at(-1)), card(before[0]));
const after = await col('To do');
ok('drag inside a column: the last card goes first, the others keep their order', JSON.stringify(after) === JSON.stringify([before.at(-1), ...before.slice(0, -1)]), [before, after]);
await p.click('List', '[aria-label="View"] button');
await p.click('All tasks', '.list-item');
await sleep(500);
const listOrder = await p.ev(`return [...document.querySelectorAll('.task-row')].map((r) => r.getAttribute('aria-label'))`);
ok('the list uses the same order (one data source)', JSON.stringify(listOrder.filter((x) => after.includes(x))) === JSON.stringify(after), [after, listOrder]);
await p.click('Board', '[aria-label="View"] button');
await sleep(500);

// Drag to another column's empty space: status changes, at the end of that column
const mover = (await col('To do'))[0];
await drag(card(mover), `document.querySelector('.board .col[aria-label="Doing"]')`);
ok('drag to Doing: status doing, at the end of the column', (await tasks()).find((t) => t.title === mover).status === 'doing' && (await col('Doing')).at(-1) === mover, await col('Doing'));

// Keys: → moves to the next column; Enter opens the panel
await p.ev(`${card(mover)}.focus(); return 1`);
await key('ArrowRight', 39);
const moved = (await tasks()).find((t) => t.title === mover);
ok('→ on a card: to Done = completed (completion time set)', moved.status === 'done' && moved.done_at > 0, moved);
await p.ev(`${card(mover)}.focus(); return 1`);
await key('ArrowLeft', 37);
ok('← back from Done: open again', (await tasks()).find((t) => t.title === mover).status === 'doing', (await tasks()).find((t) => t.title === mover).status);
await p.ev(`${card(mover)}.focus(); return 1`);
await key('Enter', 13);
ok('Enter on a card opens its panel', (await p.ev(`return document.querySelector('.board-view .task-panel input')?.value`)) === mover, null);

// Dark
await p.settings({ theme: 'dark' });
await p.click('Planner');
await p.click('Board', '[aria-label="View"] button');
await sleep(500);
await shot(p, join(out, 'dark-board.png'));
await p.settings({ theme: 'light' });
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
