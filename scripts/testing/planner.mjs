// Stage E check: `node scripts/testing/planner.mjs` against an isolated test copy started with
// DESKWATCH_PORT=47616, CDP 9333 and --inspect=9334 (see CLAUDE.md). Works on a fresh test folder
// or a copy of a schema-3 database. Uses the real page and the real main process; no camera needed.
// OUT OF DATE (kept as a record): written for Stage E. The E2 redesign changed the Study screen and E4 replaced the
// List view, so sections 1, 4, 5 and 6 no longer match the screens. The to-do list is checked by todo-check.mjs.
const pages = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); });
const ev = (expr) => new Promise((r) => { const i = ++id; pending.set(i, (d) => r(d.result?.result?.value ?? d.result?.exceptionDetails?.exception?.description ?? d)); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true } })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, got) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   got: ' + JSON.stringify(got)}`); };
// Runs code in the main process (the inspector on 9334).
async function main(expr) {
  const list = await (await fetch('http://127.0.0.1:9334/json')).json();
  const m = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((r) => m.addEventListener('open', r));
  const out = new Promise((r) => m.addEventListener('message', (x) => { const d = JSON.parse(x.data); if (d.id === 1) r(d.result?.result?.value); }));
  m.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, includeCommandLineAPI: true } }));
  const v = await out; m.close(); return v;
}

await ev(`
  window.t = {
    btn: (txt, root = document) => [...root.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(txt) || b.getAttribute('aria-label') === txt),
    click(txt) { const b = this.btn(txt); if (!b) return 'NO BUTTON ' + txt; b.click(); return 'ok'; },
    set(el, v) {
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, el.type === 'checkbox' ? 'checked' : 'value').set.call(el, v);
      el.dispatchEvent(new Event(el.type === 'checkbox' ? 'click' : el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    },
    q: (s) => document.querySelector(s),
    err: async (p) => { try { await p; return 'no error'; } catch (e) { return String(e.message); } },
  };
  window.confirm = () => true;
  return 'ok';`);
const today = new Date();
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

// 1. Tasks: add, overdue, edit
await ev(`return t.click('Planner')`); await sleep(500);
for (const [title, due, prio] of [['Chapter 3', key(today), '1'], ['Old essay', key(yesterday), '2']]) {
  await ev(`const f = document.querySelector('.task-form');
    t.set(f.querySelector('input[placeholder="Subject"]'), 'Maths');
    t.set(f.querySelector('input.grow'), ${JSON.stringify(title)});
    t.set(f.querySelector('input[type=date]'), ${JSON.stringify(due)});
    t.set(f.querySelector('select'), ${JSON.stringify(prio)});
    t.set(f.querySelector('input.mins'), '30');
    return t.click('Add task');`);
  await sleep(400);
}
const rows = await ev(`return [...document.querySelectorAll('table.tasks tr')].map((r) => r.innerText.replace(/\\s+/g, ' '))`);
check('list: two tasks, sorted by due date (overdue first)', rows.length === 2 && rows[0].startsWith('Old essay') && rows[1].startsWith('Chapter 3'), rows);
check('list: the overdue date is red', await ev(`return document.querySelector('table.tasks tr td.warn')?.innerText`) === key(yesterday), null);
await ev(`const r = [...document.querySelectorAll('table.tasks tr')].find((x) => x.innerText.startsWith('Chapter 3')); t.btn('Edit', r).click(); return 'ok'`); await sleep(300);
await ev(`t.set(document.querySelector('.task-form input.grow'), 'Chapter 3 exercises'); return t.click('Save')`); await sleep(400);
check('edit: title changed, still one form', (await ev(`return (await window.deskwatch.tasks()).map((x) => x.title).sort().join('|')`)) === 'Chapter 3 exercises|Old essay', null);
check('the main process refuses a task without a title', (await ev(`return await t.err(window.deskwatch.saveTask({ title: ' ' }))`)).includes('title'), null);

// 2. Board: buttons and drag and drop
await ev(`return t.click('Board')`); await sleep(300);
await ev(`return t.click('Move Chapter 3 exercises right')`); await sleep(400);
const st = async (title) => ev(`return (await window.deskwatch.tasks()).find((x) => x.title === ${JSON.stringify(title)}).status`);
check('board: → moves To do to Doing', await st('Chapter 3 exercises') === 'doing', await st('Chapter 3 exercises'));
await ev(`const card = [...document.querySelectorAll('.task-card')].find((c) => c.innerText.startsWith('Old essay'));
  const done = [...document.querySelectorAll('.board .col')][2];
  const dt = new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  done.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
  done.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }));
  return 'ok'`); await sleep(400);
check('board: drag and drop into Done', await st('Old essay') === 'done', await st('Old essay'));

// 3. Week: add a block, overlap refused
const taskId = await ev(`return (await window.deskwatch.tasks()).find((x) => x.title === 'Chapter 3 exercises').id`);
await ev(`return t.click('Week')`); await sleep(300);
const startMin = 23 * 60; // late today, so it is "next"
await ev(`const w = document.querySelector('.week-view');
  t.set(w.querySelector('select[aria-label=Day]'), '${today.getDay()}');
  t.set(w.querySelector('input[type=time]'), '23:00');
  t.set(w.querySelector('input.mins'), '45');
  t.set(w.querySelector('select[aria-label=Task]'), '${taskId}');
  const boxes = w.querySelectorAll('input[type=checkbox]'); t.set(boxes[1], true);
  return 'ok'`); await sleep(300);
await ev(`t.set(document.querySelector('select[aria-label="Block set"]'), '2'); return t.click('Add block')`); await sleep(500);
const routines = await ev(`return await window.deskwatch.routines()`);
check('week: block saved with task, Blocker mode and Exam mode', routines.length === 1 && routines[0].start_min === startMin && routines[0].task_id === taskId && routines[0].screen_mode === 1 && routines[0].block_set_id === 2, routines);
await ev(`t.set(document.querySelector('.week-view input[type=time]'), '22:30'); return t.click('Add block')`); await sleep(400);
check('week: an overlapping block is refused with a message', (await ev(`return document.querySelector('.week-view .warn')?.innerText ?? ''`)).includes('overlaps the block at 23:00'), null);
await ev(`t.set(document.querySelector('.week-view input[type=time]'), '23:50'); return t.click('Add block')`); await sleep(400);
check('week: a block past midnight is refused with a message', (await ev(`return document.querySelector('.week-view .warn')?.innerText ?? ''`)).includes('midnight'), null);
check('week: still one block', (await ev(`return (await window.deskwatch.routines()).length`)) === 1, null);

// 4. Clicking the block fills in the Study tab
await ev(`document.querySelector('.block-open').click(); return 'ok'`); await sleep(1200);
const study = await ev(`const s = document.querySelector('.study'); return {
  minutes: s.querySelector('input[type=number]').value,
  task: s.querySelector('label.field select')?.value,
  camera: [...s.querySelectorAll('label.check')].find((l) => l.textContent.includes('Camera mode')).querySelector('input').checked,
  screen: [...s.querySelectorAll('label.check')].find((l) => l.textContent.includes('Blocker mode')).querySelector('input').checked,
  next: s.querySelector('.next-line')?.innerText }`);
const sets = await ev(`return await window.deskwatch.blockSets()`);
check('study: 45 min, the task, camera on, screen on', study.minutes === '45' && study.task === String(taskId) && study.camera && study.screen, study);
check('study: the block\'s set (Exam mode) is selected', sets.active === 2, sets);
check('study: next line shows the block and 1 task due today', study.next === 'Next: 23:00 Chapter 3 exercises · 1 task due today', study.next);

// 5. A reminder click (sent the way the notification sends it) does the same; nothing starts by itself
await ev(`t.click('Planner'); return 'ok'`); await sleep(300);
await main(`require('electron').BrowserWindow.getAllWindows()[0].webContents.send('planner:open-block', ${routines[0].id})`); await sleep(1200);
check('reminder click: Study tab open and filled in, session not started', await ev(`return !!t.btn('Start') && document.querySelector('.study input[type=number]').value === '45'`), null);

// 6. Session with the task, then "Mark this task as done?"
await ev(`const cam = [...document.querySelectorAll('.study label.check')].find((l) => l.textContent.includes('Camera mode')).querySelector('input'); t.set(cam, false); return t.click('Start')`); await sleep(2500);
await main(`require('electron').BrowserWindow.getAllWindows()[0].webContents.send('planner:open-block', ${routines[0].id})`); await sleep(800);
check('reminder click during a session changes nothing', await ev(`return !!t.btn('End session')`), null);
await ev(`return t.click('End session')`); await sleep(2500);
check('session end asks "Mark this task as done?"', (await ev(`return document.querySelector('.mark-done')?.innerText ?? ''`)).includes('Mark this task as done?'), null);
await ev(`return t.click('Yes')`); await sleep(500);
const task = await ev(`return (await window.deskwatch.tasks()).find((x) => x.id === ${taskId})`);
check('Yes marks it done, and the session time is counted on the task', task.status === 'done' && task.focused_sec >= 1, task);

// 7. Settings switch
await ev(`return t.click('Settings')`); await sleep(400);
await ev(`const l = [...document.querySelectorAll('label.check')].find((x) => x.textContent.includes('Routine reminders')); t.set(l.querySelector('input'), false); return 'ok'`); await sleep(400);
check('Settings: reminders switch off is saved', (await ev(`return window.deskwatch.getSettings().routineReminders`)) === false, null);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
ws.close();
