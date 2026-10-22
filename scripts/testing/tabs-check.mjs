// Tab bar checks (bug of 2026-10-21) on a TEST COPY with made-up data, with REAL mouse clicks and wheel scrolls:
//   bash scripts/testing/test-copy.sh start <scratch folder>; node scripts/testing/seed.mjs
//   node scripts/testing/tabs-check.mjs <screenshot folder>
// The window is made short (1280 × 500) so that the Study tab scrolls too, as it did for the owner.
// The bug: the tab bar scrolled away, and a new tab opened at the old scroll position (it looked like no switch).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { main, page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/tabs-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const size = (w, h) => main(`(() => { const w = require('electron').BrowserWindow.getAllWindows()[0]; if (w.isMinimized()) w.restore(); w.unmaximize(); w.setContentSize(${w}, ${h}); return 1; })()`);
const click = async (x, y) => {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await p.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  await sleep(600);
};
const wheel = async () => { await p.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 300, deltaX: 0, deltaY: 5000 }); await sleep(500); };
const current = () => p.ev(`return document.querySelector('nav.tabs button.on')?.textContent.trim().replace(' ●', '')`);
const bar = () => p.ev(`const r = document.querySelector('nav.tabs').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }`);
const scrollY = () => p.ev('return Math.round(scrollY)');
// The tab's centre, and whether a real click there lands on the tab itself
const tab = (name) => p.ev(`const b = [...document.querySelectorAll('nav.tabs .pill-tabs > button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(name)}));
  const r = b.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, e = document.elementFromPoint(x, y);
  return { x, y, hit: !!e && (e === b || b.contains(e)) }`);
const TABS = ['Study', 'Planner', 'History', 'Settings'];

await p.settings({ theme: 'light', alarmVolume: 0 });
await size(1280, 500);
await sleep(500);

// Scroll down on each tab: the bar stays at the top and can still be clicked.
for (const name of TABS) {
  const t = await tab(name); await click(t.x, t.y);
  await wheel();
  const y = await scrollY(), b = await bar();
  ok(`${name}: scrolled down (${y} px), the tab bar stays at the top`, b.top === 0 && b.bottom > 30, [y, b]);
  // Night Desk (2026-10-23): Study fits the window (its dock sticks to the bottom), so the tall tabs carry this check.
  if (name !== 'Study') ok(`${name} scrolls in this window size (so the check means something)`, y > 0, y);
}
// From every tab, scrolled down, a real click on every other tab switches to it and opens it at the top.
for (const from of TABS) for (const to of TABS) {
  if (from === to) continue;
  let t = await tab(from); await click(t.x, t.y);
  await wheel();
  const before = await scrollY();
  t = await tab(to);
  await click(t.x, t.y);
  const now = await current(), y = await scrollY();
  ok(`${from} (scrolled ${before} px) → click ${to}: switched, at the top`, t.hit && now === to && y === 0, [t.hit, now, y]);
}
// Study → Settings, the exact case the owner reported, then a screenshot scrolled down on Settings.
let t = await tab('Study'); await click(t.x, t.y); await wheel();
t = await tab('Settings'); await click(t.x, t.y);
await wheel();
await shot(p, join(out, 'settings-scrolled.png')); // (also sets the window back to 1280 × 730)

// The title bar (2026-10-22): the app's own colour, Windows' buttons over the tab bar's right end, the tab bar drags the
// window, its buttons stay clickable; full screen has neither.
const wco = () => p.ev(`const o = navigator.windowControlsOverlay; const r = o?.getTitlebarAreaRect(); return { visible: !!o?.visible, width: r?.width ?? 0 }`);
const bar0 = await wco();
ok("Windows' minimise / maximise / close are shown over the app's own title bar", bar0.visible && bar0.width > 0 && bar0.width < 1280, bar0);
ok('the tab bar is where you drag the window; its tabs and Help stay clickable', await p.ev(`const s = (e) => getComputedStyle(e).webkitAppRegion ?? getComputedStyle(e).getPropertyValue('-webkit-app-region');
  return s(document.querySelector('nav.tabs')) === 'drag' && [...document.querySelectorAll('nav.tabs .pill-tabs > button, nav.tabs .help')].every((b) => s(b) === 'no-drag')`), null);
ok('Help is left of the window buttons (not under them)', await p.ev(`return document.querySelector('nav.tabs .help').getBoundingClientRect().right <= navigator.windowControlsOverlay.getTitlebarAreaRect().width`), null);
const can = await main(`(() => { const w = require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch'); return [w.isMinimizable(), w.isMaximizable(), w.isClosable(), w.isMovable()]; })()`);
ok('the window can still be minimised, maximised, closed and moved', can.join() === 'true,true,true,true', can);
await main(`(() => { const w = require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch'); w.setFullScreen(true); return 1; })()`);
await sleep(1500);
// (navigator.windowControlsOverlay.visible stays true in full screen, but Windows draws no buttons then: checked on the
// real screen on 2026-10-22. What a check can see: the page covers the whole screen, nothing above it.)
ok('full screen: the page covers the whole screen (no title bar strip)', await p.ev('return window.innerHeight === screen.height && window.innerWidth === screen.width'), await p.ev('return [innerWidth, innerHeight, screen.width, screen.height]'));
await main(`(() => { const w = require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch'); w.setFullScreen(false); return 1; })()`);
await sleep(1200);
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
