// Calibration "finished" sound (owner request 2026-10-22) on a TEST COPY. Tones are recorded, never played (the
// check replaces OscillatorNode.start), so nothing sounds on the owner's speakers. The test camera has no face, so
// calibration ends by itself after its first step ("face not found"): that end must play the two end tones, and no
// "switch" beep (that one comes only after a part that measured a face). Cancel must not; alarm volume 0 must not.
// The "switch" beeps after writing and reading need a real face: only the owner can hear those.
//   bash scripts/testing/test-copy.sh start <scratch>; node scripts/testing/seed.mjs; node scripts/testing/calib-sound-check.mjs
import { page, sleep } from './cdp.mjs';

let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const p = await page();
// start is replaced so nothing plays; stop too (the real stop throws when start never ran, which cut tone 2 off once)
const record = () => p.ev(`window.__tones = []; OscillatorNode.prototype.start = function () { window.__tones.push(this.type); }; OscillatorNode.prototype.stop = function () {}; return 1`);
const tones = () => p.ev(`return window.__tones.slice()`);
const calibrate = () => p.ev(`const b = [...document.querySelectorAll('.debug button')].find((b) => /^(Start calibration|Calibrate again)$/.test(b.textContent.trim())); if (!b) return 'none'; b.click(); return 'ok'`);
const msg = () => p.ev(`return [...document.querySelectorAll('.debug .clips p')].map((x) => x.textContent).join(' | ')`);
const open = async (volume) => {
  await p.settings({ showDebug: true, alarmVolume: volume });
  await p.click('Debug', 'nav.tabs .pill-tabs > button');
  await sleep(2500); // the camera and models must be running (the button waits for them)
  await record();
};

await open(0.8);
ok('calibration starts', (await calibrate()) === 'ok', null);
await sleep(16_000);
ok('it ended by itself (the test camera has no face)', /not found often enough/.test(await msg()), await msg());
ok('the end played the soft sound: two sine tones', JSON.stringify(await tones()) === '["sine","sine"]', await tones());

await record();
await calibrate();
await sleep(1500);
await p.click('Cancel', '.debug button');
await sleep(2500);
ok('Cancel: "cancelled" message, no sound', /cancelled/.test(await msg()) && (await tones()).length === 0, { msg: await msg(), tones: await tones() });

await open(0);
await calibrate();
await sleep(16_000);
ok('alarm volume 0: it ended, no sound', /not found often enough/.test(await msg()) && (await tones()).length === 0, { msg: await msg(), tones: await tones() });

await p.settings({ language: 'bn', alarmVolume: 0 });
await p.click('Debug', 'nav.tabs .pill-tabs > button');
await sleep(1500);
const bn = await p.ev(`return document.querySelector('.debug .info-card')?.textContent ?? ''`);
ok('Bangla: the info card tells about the beeps', bn.includes('নরম বিপ'), bn.slice(0, 200));
await p.settings({ language: 'en' });
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
