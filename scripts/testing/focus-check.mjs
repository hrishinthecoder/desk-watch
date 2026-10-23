// Focus mode checks (Stage E4 Part 2) on a TEST COPY with made-up data, then screenshots.
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/focus-check.mjs <screenshot folder>
// Real full screen + always on top would cover the owner's whole screen for minutes, so the main process's
// "focus:window" handler is swapped (over the inspector) for one that only records the calls; the real one is put
// back at the end and checked for about 2 seconds. The mini timer window does appear (small, top right).
// Pomodoros are set to 1 minute (camera off = timer only, so the clock runs), so this takes about 4 minutes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/focus-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const esc = async (holdMs) => {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(holdMs);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(300);
};
const clock = () => p.text('.focus .focus-clock');
const secs = (t) => t ? t.split(':').reduce((a, x) => a * 60 + Number(x), 0) : NaN;
const sessions = () => p.ev(`return (await window.deskwatch.range(0, Date.now() + 1)).sessions`);
const MINI = `require('electron').BrowserWindow.getAllWindows().find((w) => w.getTitle() === 'Desk Watch timer')`;
const miniJs = (js) => main(`(async () => { const m = ${MINI}; return m ? await m.webContents.executeJavaScript(${JSON.stringify(js)}) : 'NO MINI'; })()`);

// Record instead of going full screen (see the top of this file).
await main(`(() => { const { ipcMain } = require('electron'); globalThis.__fwReal = ipcMain.listeners('focus:window'); globalThis.__fw = [];
  ipcMain.removeAllListeners('focus:window'); ipcMain.on('focus:window', (_e, on) => globalThis.__fw.push(on)); return 1; })()`);
const fw = () => main('globalThis.__fw.slice()');
// A number field of the timer (Focus mode's Timer, or the timer shown before a task starts), read or typed into.
const FIELD = (label) => `const l = [...document.querySelectorAll('.timer-fields label')].find((x) => x.textContent.startsWith(${JSON.stringify(label)})); const i = l?.querySelector('input');`;
const field = (label) => p.ev(`${FIELD(label)} return i?.value ?? null`);
const setField = (label, v) => p.ev(`${FIELD(label)} Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '${v}');
  i.dispatchEvent(new Event('input', { bubbles: true })); return 1`);

await p.settings({ theme: 'light', lastCamera: false, lastScreen: false, pomoMin: 1, shortBreakMin: 1, longBreakMin: 2, longEvery: 2, focusSound: 'off', timerMode: 'pomodoro', focusBg: 'black' });
const tasks = await p.ev('return await window.deskwatch.tasks()');
const lab = tasks.find((t) => t.title === 'Lab report');
const n0 = (await sessions()).length;

// Start from a task
await p.click('Planner');
await p.click('All tasks', '.list-item');
await p.ev(`[...document.querySelectorAll('.task-row')].find((r) => r.getAttribute('aria-label') === 'Lab report').querySelector('.start').click(); return 1`);
await sleep(1000);
// First the timer to set (owner, 2026-10-21): the Timer button's own fields, nothing started yet.
ok('a task\'s Start first shows "Set your timer": focus, break and number of pomodoros (default 4); nothing started',
  (await p.text('.focus-state'))?.includes('Set your timer') && (await field('Pomodoro (min)')) === '1' && (await field('Break (min)')) === '1'
  && (await field('Number of pomodoros')) === '4' && (await sessions()).length === n0,
  [await p.text('.focus-state'), await field('Pomodoro (min)'), await field('Break (min)'), await field('Number of pomodoros')]);
await shot(p, join(out, 'focus-set-timer.png'));
await p.click('Start', '.focus-primary');
await sleep(1500);
ok('a task\'s Start opens Focus mode full screen and starts a pomodoro for it', !!(await p.text('.focus')) && (await fw()).at(-1) === true && (await p.text('.focus-task'))?.includes('Lab report'), [await fw(), await p.text('.focus-task')]);
const c1 = secs(await clock()); await sleep(2200); const c2 = secs(await clock());
ok('the clock counts down from 1:00', c1 <= 60 && c1 >= 55 && c2 < c1, [c1, c2]);
// Lab report's estimate is 75 min (3 × 25 when it was set); with this test's 1-minute pomodoros that is 75 of them.
ok('pomodoro dots show the task\'s pomodoros of its estimate (at the current length)', /of 75 pomodoros$/.test(await p.ev(`return document.querySelector('.focus-dots').getAttribute('aria-label')`)), await p.ev(`return document.querySelector('.focus-dots').getAttribute('aria-label')`));
await shot(p, join(out, 'focus-running.png'));

await p.click('Pause', '.focus-primary');
ok('Pause: "Paused", the button says Resume', (await p.text('.focus-state'))?.includes('Paused') && (await p.text('.focus-primary')) === 'Resume', await p.text('.focus-state'));
await p.click('Resume', '.focus-primary');

// Leaving
await esc(300);
ok('Esc alone does nothing', !(await p.text('.focus-dialog')) && !!(await p.text('.focus')), null);
await esc(2400);
ok('holding Esc 2 s asks "End the session?"', (await p.text('.focus-dialog h2')) === 'End the session?', await p.text('.focus-dialog h2'));
await shot(p, join(out, 'focus-exit-dialog.png'));
await p.click('Cancel', '.focus-dialog button');
await p.click('Exit', '.focus-exit');
await p.click('Keep going', '.focus-dialog button');
await sleep(2500);
const miniTime = await miniJs(`document.querySelector('.mini-time b')?.textContent`);
ok('"Keep going in a small window": full screen off, mini timer shows the time', (await fw()).at(-1) === false && /^\d+:\d\d$/.test(miniTime) && !(await p.text('.focus')), [await fw(), miniTime]);
const pos = await main(`${MINI}.getPosition()`);
await main(`${MINI}.setPosition(${pos[0] - 120}, ${pos[1] + 40})`); await sleep(800);
await miniJs(`document.querySelector('.mini-toggle').click(); 1`); await sleep(800);
ok('mini timer pause button pauses the session', (await p.ev(`return document.querySelector('.state-word')?.textContent`))?.includes('Paused') || (await miniJs(`document.querySelector('.mini-time small').textContent`)) === 'Paused', await miniJs(`document.querySelector('.mini-time small').textContent`));
writeFileSync(join(out, 'mini-timer.png'), Buffer.from(await main(`(async () => (await ${MINI}.webContents.capturePage()).toPNG().toString('base64'))()`), 'base64'));
await miniJs(`document.querySelector('.mini-toggle').click(); 1`); await sleep(800);
ok('…and resumes it', (await miniJs(`document.querySelector('.mini-time small').textContent`)) !== 'Paused', await miniJs(`document.querySelector('.mini-time small').textContent`));
await miniJs(`document.querySelector('.mini-time').click(); 1`); await sleep(1500);
ok('clicking the mini time: back to full screen, mini closed', (await fw()).at(-1) === true && !!(await p.text('.focus')) && (await main(`String(!!${MINI})`)) === 'false', await fw());
const savedPos = await main(`(() => { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(require('path').join(require('electron').app.getPath('userData'), 'deskwatch.db')); const v = d.prepare("SELECT value FROM settings WHERE key = 'main:miniPos'").get()?.value; d.close(); return v; })()`);
ok('the mini timer remembers where it was moved (saved when it closes too)', JSON.stringify(JSON.parse(savedPos ?? 'null')) === JSON.stringify({ x: pos[0] - 120, y: pos[1] + 40 }), [savedPos, pos]);
await main(`(() => { const w = require('electron').BrowserWindow.getAllWindows()[0]; w.restore(); return 1; })()`);

// Background (solid colours only)
await p.click('Background', '.focus-bar button');
await p.click('Pale green', '.focus-pop button'); // the light theme: Focus mode uses the light backgrounds
ok('Background: Pale green is used (light theme)', (await p.ev(`return getComputedStyle(document.querySelector('.focus')).backgroundColor`)) === 'rgb(233, 243, 236)', await p.ev(`return getComputedStyle(document.querySelector('.focus')).backgroundColor`));
await shot(p, join(out, 'focus-background.png'));
await p.click('Background', '.focus-bar button');

// Sound (cannot be heard here: the setting, and no errors)
await p.click('Sound', '.focus-bar button');
await p.click('Brown', '.focus-pop button');
ok('Sound: brown noise chosen (it cannot be heard here)', (await p.ev('return window.deskwatch.getSettings().focusSound')) === 'brown', await p.ev('return window.deskwatch.getSettings().focusSound'));
await shot(p, join(out, 'focus-sound.png'));
await p.click('Off', '.focus-pop button');
await p.click('Sound', '.focus-bar button');

// The pomodoro ends by itself → a full-screen break; the session is saved for the task
for (let t = 0; t < 80 && !(await p.text('.focus-state'))?.includes('Break'); t++) await sleep(1000);
const s1 = (await sessions()).slice(n0);
ok('after 1 focused minute: "Break" with Start next pomodoro; the pomodoro is saved for the task', (await p.text('.focus-state'))?.includes('Break') && (await p.text('.focus-primary'))?.includes('Start next pomodoro') && s1.length === 1 && s1[0].ended_early === 0 && s1[0].task_id === lab.id, [await p.text('.focus-state'), s1]);
await shot(p, join(out, 'focus-break.png'));

// Next pomodoro, then switch task from Today's tasks
await p.click('Start next pomodoro', '.focus-primary');
await sleep(1500);
ok('Start next pomodoro: a new session, no camera check', (await sessions()).length === n0 + 2 && /^0:5\d$|^1:00$/.test(await clock()), [await clock()]);
await p.click("Today's tasks", '.focus-bar button');
await sleep(500);
const drawer = await p.ev(`return [...document.querySelectorAll('.focus-drawer li')].map((l) => l.textContent)`);
ok("Today's tasks slides in: the current task (Now) and today's tasks", drawer[0]?.includes('Lab report') && drawer[0].includes('Now') && drawer.some((x) => x.includes('Chapter 3 exercises')), drawer);
await shot(p, join(out, 'focus-today.png'));
await p.ev(`[...document.querySelectorAll('.focus-drawer li')].find((l) => l.textContent.includes('Chapter 3 exercises')).querySelector('.focus-quiet').click(); return 1`);
await sleep(2000);
const s2 = (await sessions()).slice(n0);
const switchEv = await p.ev(`const r = await window.deskwatch.range(0, Date.now() + 1); return r.events.filter((e) => e.type === 'task_switch').length`);
const chapter = tasks.find((t) => t.title === 'Chapter 3 exercises');
ok('switching task: the session so far stays with Lab report; a new one goes on for Chapter 3', s2.length === 3 && s2[1].task_id === lab.id && s2[1].ended_at && s2[2].task_id === chapter.id && switchEv === 1 && (await p.text('.focus-task'))?.includes('Chapter 3'), [s2, switchEv]);
// The second pomodoro of the run ends → the long break (every 2nd here)
for (let t = 0; t < 80 && !(await p.text('.focus-state'))?.includes('Long break'); t++) await sleep(1000);
ok('after the 2nd pomodoro: "Long break" (long break after 2 in this test)', (await p.text('.focus-state'))?.includes('Long break'), await p.text('.focus-state'));

// Timer: Count-up, then leave (nothing running: Exit leaves at once)
await p.click('Timer', '.focus-bar button');
await p.click('Count-up', '.focus-pop button');
await shot(p, join(out, 'focus-timer.png'));
await p.click('Timer', '.focus-bar button');
await p.click('Exit', '.focus-exit');
ok('Exit during a break leaves at once (nothing to end)', !(await p.text('.focus')) && (await fw()).at(-1) === false, await fw());

// From the Study tab: Focus mode with Count-up, camera off
await p.click('Study');
await p.ev(`if (document.querySelector('.study.done')) [...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session').click(); return 1`);
await sleep(500);
await p.ev(`const c = [...document.querySelectorAll('button.mode')].find((b) => b.textContent.includes('Camera mode')); if (c.getAttribute('aria-pressed') === 'true') c.click(); return 1`);
await sleep(300);
await p.click('Focus mode', 'button');
await sleep(1500);
const u1 = secs(await clock()); await sleep(2200); const u2 = secs(await clock());
ok('Study tab → Focus mode: Count-up counts up, "Stops at 120 min"', u2 > u1 && u1 <= 3 && (await p.text('.focus .focus-note'))?.includes('Stops at 120 min'), [u1, u2, await p.text('.focus .focus-note')]);
await p.click('Stop', '.focus-quiet');
await p.click('End session', '.focus-dialog button');
await sleep(1500);
const last = (await sessions()).at(-1);
ok('Stop → End session: saved as ended now (early), back to the report', last.ended_early === 1 && Date.now() - last.ended_at < 5000 && !(await p.text('.focus')), last);

// A run of 1 pomodoro, set before the start: it ends with "Done", no break; the choice is remembered.
await p.settings({ timerMode: 'pomodoro', pomoMin: 1 });
await p.click('Planner');
await p.click('All tasks', '.list-item');
await p.ev(`[...document.querySelectorAll('.task-row')].find((r) => r.getAttribute('aria-label') === 'Lab report').querySelector('.start').click(); return 1`);
await sleep(1000);
await setField('Number of pomodoros', 1);
await sleep(500);
ok('the number of pomodoros set before the start is saved', (await p.ev('return window.deskwatch.getSettings().pomoCount')) === 1, await p.ev('return window.deskwatch.getSettings().pomoCount'));
await p.click('Start', '.focus-primary');
for (let t = 0; t < 80 && !(await p.text('.focus-state'))?.includes('Done'); t++) await sleep(1000);
ok('after the run\'s last pomodoro: "Done", "1 of 1 pomodoros done", no break', (await p.text('.focus-state'))?.includes('Done')
  && (await p.ev(`return [...document.querySelectorAll('.focus .focus-note')].some((x) => x.textContent === '1 of 1 pomodoros done')`)) && !(await p.text('.focus-state'))?.includes('reak'),
  [await p.text('.focus-state'), await p.ev(`return [...document.querySelectorAll('.focus .focus-note')].map((x) => x.textContent)`)]);
await shot(p, join(out, 'focus-run-done.png'));
await p.click('Close', '.focus-primary');
await p.ev(`[...document.querySelectorAll('.task-row')].find((r) => r.getAttribute('aria-label') === 'Lab report').querySelector('.start').click(); return 1`);
await sleep(1000);
ok('next time the timer shows the last choice (1 pomodoro)', (await field('Number of pomodoros')) === '1', await field('Number of pomodoros'));
const nRun = (await sessions()).length;
await setField('Number of pomodoros', 4);
await p.click('Cancel', '.focus-quiet');
await sleep(500);
// (4 is the default, and settings are saved as differences from the defaults: nothing stored = 4)
ok('Cancel leaves without starting anything', !(await p.text('.focus')) && (await p.ev('return window.deskwatch.getSettings().pomoCount ?? 4')) === 4 && (await sessions()).length === nRun,
  [await p.text('.focus-state'), await p.ev('return window.deskwatch.getSettings().pomoCount')]);

// Camera on, fake camera (no face): the camera check fails; Start anyway → the away alarm takes over Focus mode
await p.settings({ timerMode: 'pomodoro', pomoMin: 25 });
await p.click('Study');
await p.ev(`if (document.querySelector('.study.done')) [...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session').click(); return 1`);
await sleep(500);
await p.ev(`const c = [...document.querySelectorAll('button.mode')].find((b) => b.textContent.includes('Camera mode')); if (c.getAttribute('aria-pressed') !== 'true') c.click(); return 1`);
await p.click('Focus mode', 'button');
await sleep(4200);
ok('camera check in Focus mode fails after 3 s with Fix it / Start anyway', (await p.text('.focus-state'))?.includes('can’t see your face') && !!(await p.click('Start anyway', '.focus-quiet')), await p.text('.focus-state'));
await sleep(1500);
ok('Start anyway → the Away alarm takes over the screen (red)', (await p.text('.focus.alarm-screen .state-word')) === 'Away', await p.text('.focus.alarm-screen .state-word'));
await shot(p, join(out, 'focus-alarm.png'));
await p.click('Stop', '.focus.alarm-screen button');
await p.click('End session', '.focus-dialog button');
await sleep(1000);

// The real full-screen handler, for about 2 seconds
await main(`(() => { const { ipcMain } = require('electron'); ipcMain.removeAllListeners('focus:window'); for (const f of globalThis.__fwReal) ipcMain.on('focus:window', f); return 1; })()`);
await p.ev('window.deskwatch.focusWindow(true); return 1'); await sleep(1500);
const real = await main(`(() => { const w = require('electron').BrowserWindow.getAllWindows()[0]; return [w.isFullScreen(), w.isAlwaysOnTop()]; })()`);
await p.ev('window.deskwatch.focusWindow(false); return 1'); await sleep(1500);
const back = await main(`(() => { const w = require('electron').BrowserWindow.getAllWindows()[0]; return [w.isFullScreen(), w.isAlwaysOnTop()]; })()`);
ok('the real switch: full screen and on top, then back to normal', real.join() === 'true,true' && back.join() === 'false,false', [real, back]);

// Study and Settings, light and dark
for (const theme of ['light', 'dark']) {
  await p.settings({ theme });
  await p.click('Study');
  await p.ev(`if (document.querySelector('.study.done')) [...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session').click(); return 1`);
  await sleep(400);
  await shot(p, join(out, `${theme}-study-focus-button.png`));
  await p.click('Settings');
  await p.ev(`[...document.querySelectorAll('h3')].find((h) => h.textContent === 'Pomodoro').scrollIntoView({ block: 'start' }); return 1`);
  await shot(p, join(out, `${theme}-settings-pomodoro.png`));
}
await p.settings({ theme: 'light' });
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
