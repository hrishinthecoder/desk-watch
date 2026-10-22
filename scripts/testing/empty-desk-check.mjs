// The empty_desk clip label end to end on a TEST COPY (Stage A2, 2026-10-22). The test camera (grey moving bars)
// shows nobody, so its clip is a real empty-desk clip:
//   1. Debug tab: the label is in the list and has a countdown; record one kept-aside clip (30 s).
//   2. stop the copy, then `electron . --replay label=empty_desk` on the same scratch folder: the EMPTY DESK line.
//   bash scripts/testing/test-copy.sh start <scratch>/tc ; node scripts/testing/empty-desk-check.mjs <scratch>/tc
import { execFileSync, execSync } from 'node:child_process';
import { page, sleep } from './cdp.mjs';

const dir = process.argv[2];
if (!dir) { console.log('usage: node scripts/testing/empty-desk-check.mjs <test copy data folder>'); process.exit(1); }
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };

const p = await page();
await p.settings({ showDebug: true, alarmVolume: 0 });
await p.click('Debug', 'nav.tabs .pill-tabs > button');
await sleep(1500);
// the recorder's own box (the Debug tab has other fieldsets)
const REC = `[...document.querySelectorAll('fieldset')].find((f) => f.querySelector('legend')?.textContent === 'Record test clip')`;
const option = await p.ev(`const o = [...${REC}.querySelectorAll('select option')].find((o) => o.value === 'empty_desk'); return o ? o.textContent : null`);
ok('Debug tab: the empty_desk label is in the list', !!option, option);
// pick it the React way, keep it aside, record
await p.ev(`const s = ${REC}.querySelector('select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'empty_desk'); s.dispatchEvent(new Event('change', { bubbles: true })); return 1`);
await sleep(500);
await p.ev(`const c = [...${REC}.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith('Keep aside')).querySelector('input'); if (!c.checked) c.click(); return 1`);
await sleep(300);
const button = await p.ev(`return [...${REC}.querySelectorAll('button')].map((b) => b.textContent).join(' | ')`);
ok('it records with a countdown', /countdown/.test(button), button);
await p.click('Record', 'fieldset button');
await sleep(34_000);
const saved = await p.ev(`return ${REC}?.textContent ?? ''`);
ok('the clip was saved as a kept-aside countdown clip', /Saved .*holdout-.*-ev10\.webm/.test(saved), saved.slice(-160));
p.close();

// replay needs the copy stopped (one app per data folder)
execSync('bash scripts/testing/test-copy.sh stop', { stdio: 'inherit' });
await sleep(2000);
const out = execFileSync('npx', ['electron', '.', '--replay', 'label=empty_desk', `--user-data-dir=${dir}`], { shell: true, timeout: 180_000 }).toString();
const line = out.split('\n').find((l) => /nobody seen/.test(l)) ?? '';
console.log(out.split('\n').filter((l) => /EMPTY DESK|nobody seen|^empty_desk|KEPT-ASIDE/.test(l)).join('\n'));
ok('replay: an EMPTY DESK line with "nobody seen" and the highest person score', /kept aside .*nobody seen \d+%\s+highest person score \d\.\d\d/.test(line), line);
ok('replay: the test camera shows nobody, so nobody seen is 100%', /nobody seen 100%/.test(line), line);
console.log(fails ? `${fails} FAILED` : 'all passed');
