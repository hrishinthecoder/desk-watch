// Low-power mode checks (Stage E3 Part 3), then two screenshots, on a FRESH test copy with the fake camera:
//   bash scripts/testing/test-copy.sh start <scratch folder>
//   node scripts/testing/power-check.mjs <screenshot folder>
// One page reload at the start only; modes are switched by clicking the Performance cards (the real UI path).
// Repeated reloads and window resizes can make the test browser's fake camera vanish (CLAUDE.md lesson).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { page, shot, sleep } from './cdp.mjs';

const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/power-check.mjs <screenshot folder>'); process.exit(1); }
mkdirSync(out, { recursive: true });
const p = await page();
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const now = () => p.text('.power-now');
const perf = (t) => p.click(t, '[aria-label="Performance"] button');
const waitMeasured = async (ms = 45_000) => { await sleep(1500); for (let t = 0; t < ms; t += 1000) { const s = await now(); if (s && !s.includes('measuring')) return s; await sleep(1000); } return now(); };
const phoneRate = (s) => Number(/measured ([\d.]+) phone/.exec(s ?? '')?.[1] ?? 0);
const handRate = (s) => Number(/and ([\d.]+) hand/.exec(s ?? '')?.[1] ?? 0);
const camera = () => p.ev(`const v = document.querySelector('video'); return v && v.srcObject ? v.srcObject.getVideoTracks()[0].label : 'none'`);

await p.settings({ powerMode: 'auto', theme: 'light', setupDone: true, toursSeen: 'study,planner,history,settings', alarmVolume: 0 });
console.log('  camera:', await camera());
await p.click('Settings');
await p.ev(`document.querySelector('details.advanced').open = true; document.querySelector('.power-now').scrollIntoView({ block: 'center' }); return 1`);

const a = await waitMeasured();
ok('Auto, fast computer: stays Full; real speeds measured', a?.startsWith('In use: Full · measured') && phoneRate(a) >= 2 && handRate(a) >= 2, a);

await perf('Low power');
const l = await waitMeasured();
ok('Low power: lighter model, 2 checks a second; about 2 phone results a second', l?.startsWith('In use: Lighter phone model, 2 checks a second · measured') && phoneRate(l) > 0 && phoneRate(l) <= 2.5 && handRate(l) > 0, l);

await perf('Full');
const f = await waitMeasured();
ok('Full: back to Full, speeds measured', f?.startsWith('In use: Full · measured') && phoneRate(f) > 0, f);

// Too slow: real measurement and real switching, with the speed bar raised (localStorage test knob, test copies only).
await p.ev(`localStorage.setItem('deskwatch-test-minRate', '100'); return 1`);
await perf('Auto');
const steps = [];
for (let t = 0; t < 110; t++) {
  const s = (await now()) ?? '';
  const head = s.split(' · ')[0];
  if (steps[steps.length - 1] !== head) steps.push(head);
  if (head === 'In use: Lighter phone model, 2 checks a second' && !s.includes('measuring')) break;
  await sleep(1000);
}
ok('Auto, too slow: Full → Lighter phone model → 2 checks a second, by itself',
  steps.join(' > ') === 'In use: Full > In use: Lighter phone model > In use: Lighter phone model, 2 checks a second', steps);
console.log('  camera still on:', await camera());
await p.ev(`localStorage.removeItem('deskwatch-test-minRate'); return 1`);

// Screenshots last (theme switched with the Theme cards, no reload).
await perf('Full'); await perf('Auto'); await waitMeasured();
await shot(p, join(out, 'light-performance.png'));
await p.click('Dark', '[aria-label="Theme"] button'); await sleep(500);
await shot(p, join(out, 'dark-performance.png'));
await p.click('Light', '[aria-label="Theme"] button');
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
