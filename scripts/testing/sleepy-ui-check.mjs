// Stage A3 on a TEST COPY: the Sleepy alarm switch (on by default, saved when unticked) and its times in Settings,
// in English and Bangla. The alarm itself cannot be shown here: the test camera has no face (detection is never faked);
// its rules are unit-tested (tests/sleepy.test.ts) and replayed on the owner's clips.
//   bash scripts/testing/test-copy.sh start <scratch>; node scripts/testing/seed.mjs; node scripts/testing/sleepy-ui-check.mjs
import { page, sleep } from './cdp.mjs';

let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
const p = await page();
const box = (text) => `[...document.querySelectorAll('.settings label.check')].find((l) => l.textContent.includes(${JSON.stringify(text)}))`;

await p.click('Settings', 'nav.tabs .pill-tabs > button');
await sleep(800);
ok('Settings → Sessions has "Sleepy alarm", ticked by default', (await p.ev(`return ${box('Sleepy alarm')}?.querySelector('input').checked ?? null`)) === true, null);
ok('it says the two times', /eyes closed 6 s, or head down on the desk 15 s/.test(await p.ev(`return ${box('Sleepy alarm')}?.textContent ?? ''`)), await p.ev(`return ${box('Sleepy alarm')}?.textContent ?? ''`));
await p.ev(`${box('Sleepy alarm')}.querySelector('input').click(); return 1`);
await sleep(800);
ok('unticking saves sleepyAlarm = false', (await p.ev('return window.deskwatch.getSettings().sleepyAlarm')) === false, await p.ev('return window.deskwatch.getSettings()'));
await p.ev(`${box('Sleepy alarm')}.querySelector('input').click(); return 1`);
await sleep(800);
ok('ticking it again goes back to the default (nothing stored)', (await p.ev('return window.deskwatch.getSettings().sleepyAlarm')) === undefined, null);
const adv = await p.ev(`return document.querySelector('.settings')?.textContent ?? ''`);
ok('Advanced lists the eyes-closed and head-down times', /Sleepy: eyes closed, seconds before the alarm/.test(adv) && /Sleepy: head down on the desk, seconds before the alarm/.test(adv), null);

await p.settings({ language: 'bn' });
await p.click('সেটিংস', 'nav.tabs .pill-tabs > button');
await sleep(800);
const bn = await p.ev(`return ${box('ঘুমের অ্যালার্ম')}?.textContent ?? ''`);
ok('Bangla: "ঘুমের অ্যালার্ম" with the times in Bangla digits', /ঘুমের অ্যালার্ম/.test(bn) && /৬/.test(bn) && /১৫/.test(bn), bn);
await p.settings({ language: 'en' });
p.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
