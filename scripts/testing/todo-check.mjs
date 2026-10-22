// To-do list checks (Stage E4 Part 1) on a TEST COPY with made-up data, then screenshots (light + dark).
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/todo-check.mjs <screenshot folder>
// Keys and typing go through the DevTools input events (like a real keyboard); drag and drop is a synthetic drag.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/todo-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const KEYS = { Enter: 13, ' ': 32, Delete: 46, Escape: 27, ArrowDown: 40, ArrowUp: 38 };
const key = async (k, modifiers = 0) => {
  const code = KEYS[k] ?? k.toUpperCase().charCodeAt(0);
  const text = k.length === 1 && !modifiers ? k : k === 'Enter' ? '\r' : undefined;
  await p.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code: k === ' ' ? 'Space' : k.length === 1 ? `Key${k.toUpperCase()}` : k, windowsVirtualKeyCode: code, modifiers, text });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, windowsVirtualKeyCode: code, modifiers });
  await sleep(300);
};
const type = async (text) => { await p.send('Input.insertText', { text }); await sleep(200); };
const tasks = () => p.ev('return await window.deskwatch.tasks()');
const rows = () => p.ev(`return [...document.querySelectorAll('.task-row')].map((r) => r.getAttribute('aria-label') + (r.querySelector('.overdue') ? ' [Overdue]' : ''))`);
const focusRow = (title) => p.ev(`const r = [...document.querySelectorAll('.task-row')].find((r) => r.getAttribute('aria-label') === ${JSON.stringify(title)}); r.focus(); return !!r`);
const list = (name) => p.click(name, '.list-item');
const stat = (name) => p.ev(`const d = [...document.querySelectorAll('.stats-row div')].find((x) => x.querySelector('dt').textContent === ${JSON.stringify(name)}); return d?.querySelector('dd').textContent`);

await p.ev(`localStorage.clear(); return 1`);
await p.click('Planner');
await sleep(800);

// Lists and the stats row
const counts = await p.ev(`return Object.fromEntries([...document.querySelectorAll('.list-item')].map((b) => [b.querySelector('span').textContent, b.querySelector('b').textContent]))`);
ok('left column: lists and subjects with counts', counts.Today === '3' && counts.Tomorrow === '1' && counts['All tasks'] === '7' && counts.Completed === '1' && counts.Physics === '2', counts);
const today = await rows();
ok('Today: the overdue task first, with the word "Overdue"', today[0] === 'Integration worksheet [Overdue]' && today.length === 3, today);
ok('stats row: estimated time, tasks left, focused today, completed today',
  (await stat('Tasks left')) === '3' && (await stat('Completed today')) === '1' && /min|h/.test(await stat('Focused today')) && (await stat('Estimated time')) !== '0 min',
  [await stat('Estimated time'), await stat('Tasks left'), await stat('Focused today'), await stat('Completed today')]);

// Quick add with shortcuts
await p.ev(`document.querySelector('.quick-input').focus(); return 1`);
await type('Essay plan #History tomorrow !1 ~3');
const chips = await p.ev(`return [...document.querySelectorAll('.quick-chip')].map((c) => c.firstChild.textContent)`);
ok('quick add shows the shortcuts as chips before saving', JSON.stringify(chips) === JSON.stringify(['#History (new)', 'Due tomorrow', 'High priority', '3 pomodoros']), chips);
await key('Enter');
await sleep(500);
const added = (await tasks()).find((t) => t.title === 'Essay plan');
ok('Enter saves it: new subject, due tomorrow, high priority, 3 pomodoros', added?.subject === 'History' && added.priority === 1 && added.est_min === 75 && added.due > new Date().toISOString().slice(0, 10), added);
// A chip's × keeps the word as text; in the Today list a task without a date word is due today.
await p.ev(`document.querySelector('.quick-input').focus(); return 1`);
await type('Read about friday');
await p.ev(`document.querySelector('.quick-chip button').click(); return 1`);
await sleep(200);
await key('Enter');
await sleep(500);
const kept = (await tasks()).find((t) => t.title === 'Read about friday');
ok('a chip × keeps the word in the title; typed into Today = due today', kept?.due === new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10), kept);

// N focuses quick add
await p.ev(`document.activeElement.blur(); return 1`);
await key('n');
ok('N focuses the new-task box', await p.ev(`return document.activeElement.classList.contains('quick-input')`), null);
await key('Escape');

// Complete with Space, Undo
await focusRow('Revise formulas');
await key(' ');
await sleep(700);
let all = await tasks();
const copy = all.find((t) => t.title === 'Revise formulas' && t.status === 'todo');
ok('Space completes; a daily task gets its next copy (due tomorrow)', all.some((t) => t.title === 'Revise formulas' && t.status === 'done') && !!copy, all.filter((t) => t.title === 'Revise formulas'));
ok('toast with Undo', (await p.text('.toast'))?.includes('Undo'), await p.text('.toast'));
await p.click('Undo', '.toast button');
all = await tasks();
ok('Undo: back to open, the copy removed', all.filter((t) => t.title === 'Revise formulas').length === 1 && all.find((t) => t.title === 'Revise formulas').status === 'todo', all.filter((t) => t.title === 'Revise formulas'));

// Delete with Undo, then for real after 5 s
await focusRow('Read about friday');
await key('Delete');
ok('Delete hides the task at once', !(await rows()).includes('Read about friday'), await rows());
await p.click('Undo', '.toast button');
ok('Undo brings it back', (await rows()).includes('Read about friday'), await rows());
await focusRow('Read about friday');
await key('Delete');
await sleep(5800);
ok('after 5 s it is really deleted', !(await tasks()).some((t) => t.title === 'Read about friday'), null);

// Order: ↓ button, and drag and drop
await list('All tasks');
const before = await rows();
await p.ev(`[...document.querySelectorAll('.task-row')][0].querySelector('[aria-label^="Move"][aria-label$="down"]').click(); return 1`);
await sleep(600);
const afterBtn = await rows();
ok('↓ moves a task one place down', afterBtn[0] === before[1] && afterBtn[1] === before[0], [before, afterBtn]);
await p.ev(`const r = [...document.querySelectorAll('.task-row')]; const dt = new DataTransfer();
  r.at(-1).dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  r[0].dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
  r[0].dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); return 1`);
await sleep(700);
const afterDrag = await rows();
ok('drag and drop puts the last task first', afterDrag[0] === afterBtn.at(-1), afterDrag);
await p.settings({});
await p.click('Planner'); await list('All tasks');
ok('the order is saved', JSON.stringify(await rows()) === JSON.stringify(afterDrag), await rows());

// Side panel
await p.ev(`[...document.querySelectorAll('.task-row')].find((r) => r.getAttribute('aria-label') === 'Lab report').click(); return 1`);
await sleep(400);
ok('clicking a task opens the side panel', (await p.ev(`return document.querySelector('.task-panel .panel-title')?.value`)) === 'Lab report', null);
await p.ev(`document.querySelector('[aria-label="Add a step"]').focus(); return 1`);
await type('Check units');
await key('Enter');
await p.ev(`const s = document.querySelector('.task-panel select'); s.value = 'weekdays'; s.dispatchEvent(new Event('change', { bubbles: true })); return 1`);
await p.ev(`const n = document.querySelector('.task-panel textarea'); n.focus(); return 1`);
await type('Use the data from Tuesday');
await p.ev(`document.querySelector('.task-panel textarea').blur(); return 1`);
await sleep(600);
const lab = (await tasks()).find((t) => t.title === 'Lab report');
ok('panel saves steps, repeat and notes', lab.subtasks.length === 4 && lab.subtasks[3].title === 'Check units' && lab.repeat === 'weekdays' && lab.notes === 'Use the data from Tuesday', lab);
await shot(p, join(out, 'light-todo-panel.png'));

// Search
await key('k', 2); // Ctrl+K
await type('units');
const found = await p.ev(`return [...document.querySelectorAll('.search li')].map((l) => l.textContent)`);
ok('Ctrl+K searches steps too', found.length === 1 && found[0].startsWith('Lab report'), found);
await shot(p, join(out, 'light-todo-search.png'));
await key('Escape');

// Start → Focus mode with the task (since E4 Part 2). Real full screen would cover the owner's screen, so the
// main process's full-screen switch is recorded instead (as in focus-check.mjs), then put back.
await main(`(() => { const { ipcMain } = require('electron'); globalThis.__fwReal = ipcMain.listeners('focus:window'); globalThis.__fw = [];
  ipcMain.removeAllListeners('focus:window'); ipcMain.on('focus:window', (_e, on) => globalThis.__fw.push(on)); return 1; })()`);
const title = await p.ev(`return document.querySelector('.task-row').getAttribute('aria-label')`);
await p.click('Start', '.task-row .start');
await sleep(1500);
ok('Start: Focus mode with that task', (await p.text('.focus-task'))?.includes(title) && (await main('globalThis.__fw.at(-1)')) === true, [title, await p.text('.focus-task')]);
// Leave again: the camera check (fake camera, no face) fails after 3 s → Cancel; a session that did start → Exit → End.
await sleep(2500);
await p.ev(`const c = [...document.querySelectorAll('.focus button')].find((b) => b.textContent === 'Cancel'); if (c) c.click(); return 1`);
await sleep(400);
if (await p.text('.focus')) { await p.click('Exit', '.focus-exit'); if (await p.text('.focus-dialog')) await p.click('End session', '.focus-dialog button'); await sleep(800); }
ok('…and back out of Focus mode', !(await p.text('.focus')), await p.text('.focus-state'));
await main(`(() => { const { ipcMain } = require('electron'); ipcMain.removeAllListeners('focus:window'); for (const f of globalThis.__fwReal) ipcMain.on('focus:window', f); return 1; })()`);

// Board: moving to Done completes
await p.click('Planner'); await p.click('Board', '[aria-label="View"] button');
const wk = (await tasks()).find((t) => t.title === 'Poem analysis');
await p.ev(`[...document.querySelectorAll('.task-card')].find((c) => c.textContent.includes('Poem analysis')).querySelector('[aria-label$="right"]').click(); return 1`);
await sleep(400);
await p.ev(`[...document.querySelectorAll('.task-card')].find((c) => c.textContent.includes('Poem analysis')).querySelector('[aria-label$="right"]').click(); return 1`);
await sleep(600);
const poem = (await tasks()).find((t) => t.id === wk.id);
ok('Board: moving a card to Done completes it (completion time set)', poem.status === 'done' && poem.done_at > 0, poem);

// Empty list
await p.click('List', '[aria-label="View"] button');
await p.click('+ Subject', 'button');
await type('Geography'); await key('Enter'); await sleep(400);
await list('Geography');
ok('an empty list says so', (await p.text('.todo-main .empty h3')) === 'No open tasks here', await p.text('.todo-main .empty h3'));

// Screenshots: Today in light and dark, with the panel, and an empty list.
await list('Today');
await shot(p, join(out, 'light-todo.png'));
await p.ev(`document.querySelector('.task-row').click(); return 1`); await sleep(300);
await p.settings({ theme: 'dark' });
await p.click('Planner');
await shot(p, join(out, 'dark-todo.png'));
await p.ev(`[...document.querySelectorAll('.task-row')].find((r) => r.getAttribute('aria-label') === 'Lab report')?.click(); return 1`);
await list('Tomorrow');
await p.ev(`document.querySelector('.task-row')?.click(); return 1`); await sleep(300);
await shot(p, join(out, 'dark-todo-panel.png'));
await list('Geography');
await shot(p, join(out, 'dark-todo-empty.png'));
await p.settings({ theme: 'light' });
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
