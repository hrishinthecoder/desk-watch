// Debug tab, owner request 2026-10-22: the camera preview stays in view while the controls are scrolled, at the
// owner's window size (1280 x 730), and never covers the clip recorder (label, Keep aside, Record).
//   bash scripts/testing/test-copy.sh start <scratch>; node scripts/testing/seed.mjs; node scripts/testing/debug-cam-check.mjs
import { main, page, sleep } from './cdp.mjs';

let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const p = await page();
await p.settings({ showDebug: true, alarmVolume: 0 });
await p.click('Debug', 'nav.tabs .pill-tabs > button');
await sleep(1500);
// the window can still be settling after start-up: set the size until the page really has it
for (let i = 0; i < 10 && (await p.ev('return innerWidth + "x" + innerHeight')) !== '1280x730'; i++) {
  await main(`(() => { const w = require('electron').BrowserWindow.getAllWindows().find((x) => x.getTitle() === 'Desk Watch'); if (w.isMinimized()) w.restore(); if (!w.isVisible()) w.showInactive(); w.setFullScreen(false); w.unmaximize(); w.setContentSize(1280, 730); return w.getContentSize().join('x'); })()`);
  await sleep(700);
}

const measure = () => p.ev(`
  const s = document.querySelector('.stage .mirror').getBoundingClientRect(), tabs = document.querySelector('nav.tabs').getBoundingClientRect();
  const rec = [...document.querySelectorAll('fieldset')].find((f) => f.querySelector('legend')?.textContent === 'Record test clip');
  const parts = [...rec.querySelectorAll('select, input, button')];
  // every recorder control that is on screen must be the element actually under its own centre (not covered)
  const covered = parts.filter((e) => { const r = e.getBoundingClientRect(); if (r.bottom < tabs.bottom || r.top > innerHeight) return false;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(hit === e || e.contains(hit) || hit?.closest('label')?.contains(e)); }).map((e) => e.textContent || e.tagName);
  return { scrollY: Math.round(scrollY), max: Math.round(document.documentElement.scrollHeight - innerHeight), stageTop: Math.round(s.top), stageBottom: Math.round(s.bottom),
    tabsBottom: Math.round(tabs.bottom), h: innerHeight, w: innerWidth, recVisible: parts.some((e) => { const r = e.getBoundingClientRect(); return r.top >= tabs.bottom && r.bottom <= innerHeight; }), covered };`);

const top = await measure();
ok(`window is the owner's size (1280 x 730): ${top.w} x ${top.h}`, top.w === 1280 && top.h === 730, top);
ok('the Debug tab is taller than the window (it scrolls)', top.max > 100, top);
await p.ev(`scrollTo(0, document.documentElement.scrollHeight); return 1`);
await sleep(600);
const end = await measure();
ok('scrolled to the bottom', end.scrollY > 100 && end.scrollY >= end.max - 2, end);
ok('the camera preview is still fully in view, below the tab bar', end.stageTop >= end.tabsBottom && end.stageBottom <= end.h, end);
ok('the clip recorder is on screen at the bottom', end.recVisible, end);
ok('nothing covers the recorder controls (label, Keep aside, Glasses, Record)', end.covered.length === 0, end.covered);
for (const y of [0.25, 0.5, 0.75]) {
  await p.ev(`scrollTo(0, ${y} * (document.documentElement.scrollHeight - innerHeight)); return 1`);
  await sleep(300);
  const m = await measure();
  ok(`scrolled ${y * 100}%: camera preview in view, nothing covered`, m.stageTop >= m.tabsBottom && m.stageBottom <= m.h && m.covered.length === 0, m);
}
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
