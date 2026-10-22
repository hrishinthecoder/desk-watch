// Window screenshots of a TEST COPY, title bar and scrollbars included (scripts/testing/window-shot.ps1), for the
// before/after of the UI fix (2026-10-22): dark Settings scrolled, the Planner list with its side panel, Focus mode in
// real full screen (it covers the screen for a few seconds), and the same in Bangla.
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/chrome-shots.mjs <folder> <before|after>
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, sleep } from './cdp.mjs';

const [out, label] = process.argv.slice(2);
if (!out || !label) { console.log('usage: node scripts/testing/chrome-shots.mjs <folder> <before|after>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const pid = execSync('netstat -ano').toString().split('\n').find((l) => /127\.0\.0\.1:47616 .*LISTENING/.test(l))?.trim().split(/\s+/).pop();
if (!pid) throw new Error('no test copy on port 47616');
const p = await page();
const win = (js) => main(`(() => { const w = require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch'); ${js} })()`);
const shot = async (name) => {
  await win('w.showInactive(); w.moveTop(); return 1');
  await sleep(700);
  console.log(execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/testing/window-shot.ps1', '-ProcessId', pid, '-Out', join(out, `${label}-${name}.png`)]).toString().trim());
};
const tab = async (name) => { await p.click(name, 'nav.tabs .pill-tabs > button'); await sleep(600); };

for (const lang of ['en', 'bn']) {
  await p.settings({ theme: 'dark', language: lang, alarmVolume: 0, lastCamera: false, lastScreen: false });
  await win('w.setFullScreen(false); w.unmaximize(); w.setContentSize(1280, 730); w.center(); return 1');
  await p.ev('window.confirm = () => true; return 1');
  const T = lang === 'en' ? { s: 'Settings', p: 'Planner', st: 'Study', all: 'All tasks', focus: 'Focus mode' } : { s: 'সেটিংস', p: 'পরিকল্পনা', st: 'পড়া', all: 'সব কাজ', focus: 'Focus mode' };
  await tab(T.s);
  await p.ev('scrollTo(0, 500); return 1');
  await shot(`${lang}-settings`);
  await tab(T.p);
  await p.click(T.all, '.list-item');
  for (let i = 0; i < 3 && !(await p.ev(`return !!document.querySelector('.task-panel')`)); i++) { await p.ev(`document.querySelector('.task-row .task-main')?.click(); return 1`); await sleep(700); }
  await shot(`${lang}-planner-panel`);
  // Focus mode in real full screen (covers the screen for a few seconds)
  await tab(T.st);
  await p.click(T.focus, 'button');
  await sleep(2500);
  await shot(`${lang}-focus-fullscreen`);
  await p.ev(`[...document.querySelectorAll('.focus button')].find((b) => /Stop|থামান|শেষ/.test(b.textContent))?.click(); return 1`);
  await sleep(500);
  await p.ev(`[...document.querySelectorAll('.focus-dialog button')].find((b) => /End session|সেশন শেষ/.test(b.textContent))?.click(); return 1`);
  await sleep(800);
  await p.ev(`document.querySelector('.focus-exit')?.click(); return 1`);
  await sleep(800);
}
await p.settings({ language: 'en', theme: 'light' });
await win('w.setFullScreen(false); return 1');
p.close();
