// Night Desk redesign (2026-10-23): screenshots of one group of screens on a TEST COPY with made-up data, for the owner
// to compare with the Design canvas. The camera area is always hidden (cdp.mjs shot). Full screen is never switched on
// (the main process's full-screen call is recorded instead, as in focus-check.mjs).
//   bash scripts/testing/test-copy.sh start <scratch>; node scripts/testing/seed.mjs
//   node scripts/testing/redesign-shots.mjs <folder> study
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, shot, sleep } from './cdp.mjs';

const [out, group = 'study'] = process.argv.slice(2);
if (!out) { console.log('usage: node scripts/testing/redesign-shots.mjs <folder> <group>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
const snap = (name) => shot(p, join(out, `${group}-${name}.png`));
const tab = (name) => p.click(name, 'nav.tabs .pill-tabs > button');
const noFullScreen = () => main(`(() => { const { ipcMain } = require('electron'); globalThis.__fwReal ??= ipcMain.listeners('focus:window');
  ipcMain.removeAllListeners('focus:window'); ipcMain.on('focus:window', () => {}); return 1; })()`);
const fullScreenBack = () => main(`(() => { const { ipcMain } = require('electron'); ipcMain.removeAllListeners('focus:window'); for (const f of globalThis.__fwReal ?? []) ipcMain.on('focus:window', f); return 1; })()`);
const endSession = async () => {
  await p.ev(`window.confirm = () => true; return 1`);
  await p.click('End session', '.dock button');
  await sleep(1500);
  await p.ev(`if (document.querySelector('.study.done')) [...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session').click(); return 1`);
  await sleep(600);
};
const modeOff = (name) => p.ev(`const b = [...document.querySelectorAll('button.mode')].find((x) => x.textContent.includes(${JSON.stringify(name)})); if (b?.getAttribute('aria-pressed') === 'true') b.click(); return 1`);

if (group === 'study') {
  for (const [theme, language] of [['dark', 'en'], ['dark', 'bn']]) {
    const tag = language === 'bn' ? 'bn-' : '';
    await p.settings({ theme, language, alarmVolume: 0, strictMode: false });
    await tab(language === 'bn' ? 'পড়া' : 'Study');
    await snap(`${tag}ready`);
    if (language === 'bn') continue;
    // camera check fails (the test camera has no face): the dialog
    await p.click('Start', '.dock button.start');
    await sleep(4000);
    await snap('check-failed');
    await p.click('Cancel', '.check-failed button');
    // a panel open in the centre
    await p.click('Task:', '.study-center button');
    await snap('task-panel');
    await p.click('', '.study-panel header button');
    // running, timer only (camera off, so the clock runs)
    await modeOff('Camera mode');
    await p.click('Start', '.dock button.start');
    await sleep(3500);
    await snap('running');
    await p.click('Pause', '.dock button');
    await snap('paused');
    await p.click('Resume', '.dock button');
    await p.click('Break', '.dock button');
    await snap('break');
    await p.click('Back to work', '.dock button');
    await endSession();
    // strict mode: the end dialog
    await p.settings({ strictMode: true });
    await modeOff('Camera mode');
    await p.click('Start', '.dock button.start');
    await sleep(2000);
    await p.click('End session', '.dock button');
    await snap('strict-dialog');
    await p.click('Keep studying', '.dialog button');
    await p.settings({ strictMode: false });
    await endSession();
    // a task's Start → Focus mode asks for the timer first
    await noFullScreen();
    await tab('Planner');
    await p.click('Start', '.task-row .start');
    await sleep(1200);
    await snap('timer-dialog');
    await p.click('Cancel', '.timer-dialog button');
    await fullScreenBack();
    await tab('Study');
  }
  await p.settings({ language: 'en', theme: 'dark' });
}

if (group === 'focus') {
  // The window "in front" comes from the test-only hook (electron/testhooks.ts), never the owner's real windows.
  const front = (name, exe) => main(`globalThis.__testForeground = ${JSON.stringify(name ? { name, exe } : null)}; 1`).then(() => sleep(800));
  const mode = (name, on) => p.ev(`const b = [...document.querySelectorAll('button.mode')].find((x) => x.textContent.includes(${JSON.stringify(name)})); if ((b.getAttribute('aria-pressed') === 'true') !== ${on}) b.click(); return 1`);
  const stopFocus = async () => {
    await p.ev(`[...document.querySelectorAll('.focus button')].find((b) => /Stop|থামান/.test(b.textContent))?.click(); return 1`); await sleep(600);
    await p.ev(`[...document.querySelectorAll('.focus-dialog button')].find((b) => /End session/.test(b.textContent))?.click(); return 1`); await sleep(1200);
    await p.ev(`document.querySelector('.focus-exit')?.click(); return 1`); await sleep(600);
  };
  await p.settings({ theme: 'dark', language: 'en', alarmVolume: 0, strictMode: false });
  await p.ev('window.confirm = () => true; return 1');
  await noFullScreen();
  await front('Google Chrome', 'chrome.exe');
  const list = await p.ev('return await window.deskwatch.getBlocklist()');
  await p.ev(`return await window.deskwatch.setBlocklist(${JSON.stringify([...list.filter((e) => e.pattern !== 'notepad'), { list: 'blocked', kind: 'app', pattern: 'notepad' }])})`);
  await tab('Study');
  // the blocker's warning bar, then its alarm (a blocked app in front)
  await mode('Camera mode', false); await mode('Blocker mode', true);
  await p.click('Start', '.dock button.start'); await sleep(1500);
  await front('Notepad', 'notepad.exe'); await sleep(2500);
  await snap('warn-bar');
  await sleep(10_000);
  await snap('alarm-blocked-app');
  await front('Google Chrome', 'chrome.exe'); await sleep(1500);
  // the reminder bar (as when a routine block starts)
  const id = await p.ev('return (await window.deskwatch.routines())[0]?.id ?? null');
  if (id !== null) {
    await main(`(() => { require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch').webContents.send('planner:reminder', ${id}); return 1; })()`);
    await sleep(1200); await snap('reminder-bar'); await p.click('Dismiss', '.reminder button');
  }
  await endSession();
  // Away alarm on the Study tab (the test camera shows nobody): Start anyway
  await mode('Blocker mode', false); await mode('Camera mode', true);
  await p.click('Start', '.dock button.start'); await sleep(4000);
  await p.click('Start anyway', '.check-failed button'); await sleep(2500);
  await snap('alarm-away');
  await p.click('End session', '.alarm-bar button'); await sleep(1500);
  await p.ev(`if (document.querySelector('.study.done')) [...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session').click(); return 1`); await sleep(600);
  // Focus mode, timer only
  await mode('Camera mode', false);
  await p.click('Focus mode', '.dock button'); await sleep(3500);
  await snap('focus-running');
  await p.click('Pause', '.focus .focus-primary'); await snap('focus-paused');
  await p.click('Resume', '.focus .focus-primary');
  await p.click('Sound', '.focus-bar button'); await snap('focus-sound-panel'); await p.click('Sound', '.focus-bar button');
  await p.click('Exit', '.focus-exit'); await snap('focus-exit-dialog');
  await p.click('Keep going', '.focus-dialog button'); await sleep(1500);
  const miniFile = join(out, `${group}-mini-timer.png`);
  console.log('  mini timer:', await main(`((r) => (async () => { try { const { BrowserWindow } = r('electron'); const w = BrowserWindow.getAllWindows().find((x) => x !== BrowserWindow.getAllWindows().find((y) => y.getTitle() === 'Desk Watch')); if (!w) return 'no window: ' + BrowserWindow.getAllWindows().map((x) => x.getTitle()).join(', '); const img = await w.capturePage(); r('fs').writeFileSync(${JSON.stringify(miniFile)}, img.toPNG()); return 'saved ' + w.getTitle(); } catch (e) { return String(e); } })())(require)`));
  await main(`(() => { require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch').webContents.send('mini:action', 'open'); return 1; })()`); await sleep(1500);
  await stopFocus();
  // Bangla (the language change reloads the page, so Focus mode is opened again)
  await p.settings({ language: 'bn' });
  await p.ev(`if (document.querySelector('.study.done')) document.querySelector('.study.done button.primary').click(); return 1`); await sleep(600);
  await mode('Camera mode', false);
  await p.click('Focus mode', '.dock button'); await sleep(3500);
  await snap('bn-focus-running');
  await stopFocus();
  await p.settings({ language: 'en' });
  // Away alarm in Focus mode
  await tab('Study');
  await p.ev(`if (document.querySelector('.study.done')) [...document.querySelectorAll('button')].find((b) => b.textContent === 'Start a new session').click(); return 1`); await sleep(600);
  await mode('Camera mode', true);
  await p.click('Focus mode', '.dock button'); await sleep(4500);
  await p.click('Start anyway', '.focus button'); await sleep(2500);
  await snap('focus-alarm-away');
  await stopFocus();
  await front(null); await fullScreenBack();
}
if (group === 'final') {
  // The owner's set (2026-10-23): Focus with the task panel, History, Board, an alarm, a long page with its scrollbar;
  // dark + light, English + Bangla, 1280 × 730, the whole window with Windows' buttons (window-shot.ps1). Clicks go by
  // class or position, so they work in both languages. Focus mode uses the real full screen for a few seconds.
  const { execFileSync, execSync } = await import('node:child_process');
  const pid = execSync('netstat -ano').toString().split('\n').find((l) => /127\.0\.0\.1:47616 .*LISTENING/.test(l))?.trim().split(/\s+/).pop();
  const win = (js) => main(`(() => { const w = require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch'); ${js} })()`);
  const wshot = async (name) => {
    await p.ev(`document.querySelectorAll('.stage').forEach((s) => { s.style.visibility = 'hidden'; }); return 1`);
    await win('w.showInactive(); w.moveTop(); return 1'); await sleep(900);
    console.log(execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/testing/window-shot.ps1', '-ProcessId', pid, '-Out', join(out, `${name}.png`)]).toString().trim());
  };
  const nth = (sel, i) => p.ev(`const b = document.querySelectorAll(${JSON.stringify(sel)})[${i}]; if (!b) return 'NO ${sel}'; b.click(); return 'ok'`).then((r) => { if (r !== 'ok') console.log('  ', r); return sleep(900); });
  const tabN = (i) => nth('nav.tabs .pill-tabs > button', i);
  const modeN = (i, on) => p.ev(`const b = document.querySelectorAll('button.mode')[${i}]; if (b && (b.getAttribute('aria-pressed') === 'true') !== ${on}) b.click(); return 1`);
  const done = () => p.ev(`if (document.querySelector('.study.done')) document.querySelector('.study.done button.primary').click(); return 1`).then(() => sleep(600));
  for (const theme of ['dark', 'light']) for (const language of ['en', 'bn']) {
    const tag = `${theme}-${language}`;
    await p.settings({ theme, language, alarmVolume: 0, strictMode: false, focusBg: 'black', lastCamera: false, lastScreen: false });
    await p.ev('window.confirm = () => true; return 1');
    await win('w.setFullScreen(false); w.unmaximize(); w.setContentSize(1280, 730); w.center(); return 1'); await sleep(800);
    await tabN(2); await wshot(`${tag}-history`);
    await tabN(1); await nth('[data-tour="planner-views"] .card', 1); await wshot(`${tag}-board`);
    await tabN(3); await p.ev(`scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.4); return 1`); await sleep(500); await wshot(`${tag}-long-page`);
    // Focus mode on a task that went over its estimate, with Today's tasks open
    await tabN(1); await nth('[data-tour="planner-views"] .card', 0);
    await nth('.task-row .start', 0); await sleep(800);
    await nth('.timer-dialog .focus-primary', 0); await sleep(3000);
    await p.ev(`const b = [...document.querySelectorAll('.focus-bar button')].at(-1); b.click(); return 1`); await sleep(1200);
    await wshot(`${tag}-focus-tasks`);
    await p.ev(`[...document.querySelectorAll('.focus-bar button')].at(-1).click(); return 1`); await sleep(500);
    await nth('.focus-actions button.round.focus-quiet', 0); await nth('.focus-dialog button', 1); await sleep(1200);
    await p.ev(`document.querySelector('.focus-exit')?.click(); return 1`); await sleep(1200);
    await win('w.setFullScreen(false); w.setContentSize(1280, 730); return 1'); await sleep(800);
    // The Away alarm (the test camera shows nobody): Start anyway
    await tabN(0); await done(); await modeN(0, true); await modeN(1, false);
    await nth('.dock button.start', 0); await sleep(4000);
    await nth('.check-failed button', 1); await sleep(2500);
    await wshot(`${tag}-alarm`);
    await p.ev(`[...document.querySelectorAll('.alarm-bar button')].at(-1).click(); return 1`); await sleep(1500); await done();
  }
  await p.settings({ theme: 'dark', language: 'en' });
}

if (group === 'history') {
  const period = (i) => p.ev(`document.querySelectorAll('.history > .cards .card')[${i}].click(); return 1`).then(() => sleep(800));
  for (const [theme, language] of [['dark', 'en'], ['light', 'en'], ['dark', 'bn']]) {
    const tag = `${theme}-${language}`;
    await p.settings({ theme, language, alarmVolume: 0 });
    await p.ev(`document.querySelectorAll('nav.tabs .pill-tabs > button')[2].click(); return 1`); await sleep(900);
    await period(2); await snap(`${tag}-7days`);
    if (tag !== 'dark-en') continue;
    await period(1); await snap(`${tag}-week`);
    await period(4); await snap(`${tag}-alltime`);
    await period(2);
    await p.ev(`const b = [...document.querySelectorAll('.bars .bar')]; b[b.length - 2]?.click(); return 1`); await sleep(900);
    await snap(`${tag}-day`);
    await p.ev(`[...document.querySelectorAll('.history button')].find((b) => /focused/.test(b.textContent))?.click(); return 1`); await sleep(900);
    await snap(`${tag}-report`);
  }
  await p.settings({ theme: 'dark', language: 'en' });
}

if (group === 'settings') {
  const go = (i) => p.ev(`document.querySelectorAll('.settings-nav button')[${i}].click(); return 1`).then(() => sleep(700));
  for (const [theme, language] of [['dark', 'en'], ['light', 'en'], ['dark', 'bn']]) {
    const tag = `${theme}-${language}`;
    await p.settings({ theme, language, alarmVolume: 0 });
    await p.ev(`document.querySelectorAll('nav.tabs .pill-tabs > button')[3].click(); return 1`); await sleep(900);
    await snap(`${tag}-top`);
    if (tag !== 'dark-en') continue;
    await go(3); await snap(`${tag}-pomodoro`);
    await go(4); await snap(`${tag}-data`);
    await go(5); await snap(`${tag}-advanced`);
  }
  await p.settings({ theme: 'dark', language: 'en' });
}

if (group === 'setup') {
  // Needs a FRESH test copy without seed.mjs (a new user sees setup). The camera area stays hidden in every shot.
  const next = () => p.ev(`document.querySelector('.setup-nav button.primary')?.click(); return 1`).then(() => sleep(1500));
  for (const theme of ['dark', 'light']) {
    await p.settings({ theme, language: 'en', alarmVolume: 0, setupDone: false, setupStep: 'welcome' });
    await snap(`${theme}-welcome`);
    if (theme === 'light') break;
    await p.ev(`document.querySelector('.lang-cards .card[lang="bn"]').click(); return 1`); await sleep(900); await snap('bn-welcome');
    await p.ev(`document.querySelector('.lang-cards .card[lang="en"]').click(); return 1`); await sleep(900);
    for (const step of ['camera', 'aim', 'calibrate', 'browser', 'practice']) { await next(); await sleep(1500); await snap(`dark-${step}`); }
  }
  await p.ev(`document.querySelector('.skip-setup')?.click(); return 1`); await sleep(800);
  await p.settings({ theme: 'dark', language: 'en' });
}

if (group === 'light') {
  const tabN = (i) => p.ev(`document.querySelectorAll('nav.tabs .pill-tabs > button')[${i}].click(); return 1`).then(() => sleep(900));
  const viewN = (i) => p.ev(`document.querySelectorAll('[data-tour="planner-views"] .card')[${i}].click(); return 1`).then(() => sleep(900));
  await p.settings({ theme: 'light', language: 'en', alarmVolume: 0, strictMode: false });
  await p.ev('window.confirm = () => true; return 1');
  await tabN(0); await snap('study-ready');
  await p.click('Task:', '.study-center button'); await snap('study-task-panel'); await p.click('', '.study-panel header button');
  await p.ev(`const b = document.querySelectorAll('button.mode')[0]; if (b.getAttribute('aria-pressed') === 'true') b.click(); return 1`); await sleep(300);
  await p.click('Start', '.dock button.start'); await sleep(3000); await snap('study-running');
  await p.click('Pause', '.dock button'); await snap('study-paused'); await p.click('Resume', '.dock button');
  await p.click('End session', '.dock button'); await sleep(1500); await snap('study-done');
  await p.ev(`if (document.querySelector('.study.done')) document.querySelector('.study.done button.primary').click(); return 1`); await sleep(600);
  await tabN(1); await viewN(0); await p.ev(`document.querySelector('.task-row')?.click(); return 1`); await sleep(800); await snap('planner-list');
  await viewN(1); await snap('planner-board');
  await viewN(2); await snap('planner-week');
  await p.click('Edit routine', 'button'); await sleep(800); await snap('planner-routine-editor'); await p.click('Cancel', 'button');
  await viewN(3); await snap('planner-day');
  await noFullScreen();
  await viewN(0); await p.click('Start', '.task-row .start'); await sleep(1200); await snap('focus-timer-dialog');
  await p.click('Cancel', '.timer-dialog button'); await fullScreenBack();
  await p.settings({ theme: 'dark' });
}

if (group === 'planner') {
  const view = (name) => p.click(name, '[aria-label="View"] button');
  for (const language of ['en', 'bn']) {
    const tag = language === 'bn' ? 'bn-' : '';
    await p.settings({ theme: 'dark', language, alarmVolume: 0 });
    await tab(language === 'bn' ? 'পরিকল্পনা' : 'Planner');
    await p.ev(`document.querySelector('[data-tour="planner-views"] .card')?.click(); return 1`); await sleep(500);
    await p.ev(`document.querySelector('.task-row .task-title, .task-row')?.click(); return 1`); await sleep(800);
    await snap(`${tag}list`);
    if (language === 'bn') continue;
    await view('Board'); await snap('board');
    await view('Week'); await snap('week');
    await p.click('Edit routine', 'button'); await sleep(800); await snap('routine-editor');
    await p.click('Cancel', 'button');
    await view('Day'); await snap('day');
  }
  await p.settings({ language: 'en' });
}

// Light Focus mode (owner, 2026-10-23): every light background, the panels, the exit dialog, the Away alarm, Bangla.
if (group === 'lightfocus') {
  const mode = (name, on) => p.ev(`const b = [...document.querySelectorAll('button.mode')].find((x) => x.textContent.includes(${JSON.stringify(name)})); if ((b.getAttribute('aria-pressed') === 'true') !== ${on}) b.click(); return 1`);
  const fresh = () => p.ev(`if (document.querySelector('.study.done')) document.querySelector('.study.done button.primary').click(); return 1`).then(() => sleep(600));
  const stopFocus = async () => {
    await p.ev(`[...document.querySelectorAll('.focus button')].find((b) => /Stop|থামান/.test(b.textContent))?.click(); return 1`); await sleep(600);
    await p.ev(`[...document.querySelectorAll('.focus-dialog button')].find((b) => /End session|Session শেষ/.test(b.textContent))?.click(); return 1`); await sleep(1200);
    await p.ev(`document.querySelector('.focus-exit')?.click(); return 1`); await sleep(600);
  };
  await p.settings({ theme: 'light', language: 'en', alarmVolume: 0, strictMode: false, focusBg: 'black' });
  await p.ev('window.confirm = () => true; return 1');
  await noFullScreen();
  await tab('Study'); await fresh(); await mode('Camera mode', false); await mode('Blocker mode', false);
  await p.click('Focus mode', '.dock button'); await sleep(3500);
  for (const name of ['Warm white', 'Light grey', 'Pale green', 'Pale blue']) {
    await p.click('Background', '.focus-bar button'); await p.click(name, '.focus-pop button');
    await snap(`bg-${name.toLowerCase().replace(' ', '-')}`); await p.click('Background', '.focus-bar button');
  }
  await p.click('Background', '.focus-bar button'); await p.click('Warm white', '.focus-pop button'); await snap('background-panel'); await p.click('Background', '.focus-bar button');
  await p.click('Pause', '.focus .focus-primary'); await snap('paused'); await p.click('Resume', '.focus .focus-primary');
  await p.click("Today's tasks", '.focus-bar button'); await sleep(600); await snap('tasks-drawer'); await p.click("Today's tasks", '.focus-bar button'); await sleep(500);
  await p.click('Exit', '.focus-exit'); await snap('exit-dialog'); await p.click('Keep going', '.focus-dialog button'); await sleep(800);
  await main(`(() => { require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch').webContents.send('mini:action', 'open'); return 1; })()`); await sleep(1500);
  await stopFocus();
  await p.settings({ language: 'bn' }); await fresh(); await mode('Camera mode', false);
  await p.click('Focus mode', '.dock button'); await sleep(3500); await snap('bn-running'); await stopFocus();
  await p.settings({ language: 'en' }); await tab('Study'); await fresh(); await mode('Camera mode', true);
  await p.click('Focus mode', '.dock button'); await sleep(4500);
  await p.click('Start anyway', '.focus button'); await sleep(2500); await snap('alarm-away');
  await stopFocus();
  await fullScreenBack(); await p.settings({ theme: 'dark' });
}
p.close();
console.log('done');
