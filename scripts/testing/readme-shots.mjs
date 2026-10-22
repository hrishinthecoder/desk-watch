// README screenshots (Stage F) from a TEST COPY with made-up data: the window only (scripts/testing/window-shot.ps1),
// title bar included, the camera area always hidden (.stage). Never run against the owner's app.
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/readme-shots.mjs <folder>
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/readme-shots.mjs <folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const pid = execSync('netstat -ano').toString().split('\n').find((l) => /127\.0\.0\.1:47616 .*LISTENING/.test(l))?.trim().split(/\s+/).pop();
if (!pid) throw new Error('no test copy on port 47616');
const p = await page();
const win = (js) => main(`(() => { const w = require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch'); ${js} })()`);
const shot = async (name) => {
  await p.ev(`document.querySelectorAll('.stage').forEach((s) => { s.style.visibility = 'hidden'; }); scrollTo(0, 0); return 1`);
  await win('w.showInactive(); w.moveTop(); return 1');
  await sleep(700);
  console.log(execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/testing/window-shot.ps1', '-ProcessId', pid, '-Out', join(out, `${name}.png`)]).toString().trim());
};
const tab = async (name) => { await p.click(name, 'nav.tabs .pill-tabs > button'); await sleep(700); };
const view = async (name) => { await p.click(name, '[aria-label="View"] button'); await sleep(700); };

for (const theme of ['light', 'dark']) {
  await p.settings({ theme, language: 'en', alarmVolume: 0, lastCamera: false, lastScreen: false });
  await win('w.setFullScreen(false); w.unmaximize(); w.setContentSize(1280, 760); w.center(); return 1');
  await tab('Study');
  // The test camera has no face, so Camera mode would show "can't see your face". The README shows the plain state
  // with Camera mode off rather than faking a detection.
  await p.ev(`const b = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Camera mode')); if (b && / On|On$/.test(b.textContent)) b.click(); return 1`);
  await sleep(700);
  await shot(`${theme}-study`);
  if (theme === 'dark') continue;
  await tab('History');
  await p.click('7 days', 'button');
  await shot('history');
  // a session report: the newest session of the last 7 days
  await p.ev(`const b = [...document.querySelectorAll('.bars .bar')]; b[b.length - 2]?.click(); return 1`);
  await sleep(800);
  await p.ev(`const rows = [...document.querySelectorAll('.history button')].filter((b) => /focused/.test(b.textContent)); rows[0]?.click(); return 1`);
  await sleep(900);
  await shot('report');
  await p.ev(`location.hash = ''; return 1`);
  await tab('Planner');
  await view('List');
  await p.click('All tasks', '.list-item');
  await shot('todo');
  await view('Board');
  await shot('board');
  await view('Week');
  await shot('routines');
}
// Focus mode in real full screen (covers the screen for a few seconds)
await tab('Study');
await p.click('Focus mode', 'button');
await sleep(2500);
await shot('focus');
await p.ev(`[...document.querySelectorAll('.focus button')].find((b) => /Stop/.test(b.textContent))?.click(); return 1`);
await sleep(500);
await p.ev(`[...document.querySelectorAll('.focus-dialog button')].find((b) => /End session/.test(b.textContent))?.click(); return 1`);
await sleep(800);
await p.ev(`document.querySelector('.focus-exit')?.click(); return 1`);
await sleep(800);
await win('w.setFullScreen(false); return 1');
await p.settings({ theme: 'light' });
p.close();
