// Why did a clip go SLEEPY? Re-runs the rules on a replay result file (numbers only, no video) and prints, for each
// clip with a SLEEPY moment, which rule fired (eyes closed / head down) and the values around it.
//   node scripts/testing/sleepy-why.mjs <replay-....json> [label]      (run from the project folder: uses vite)
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const [file, only] = process.argv.slice(2);
if (!file) { console.log('usage: node scripts/testing/sleepy-why.mjs <replay json> [label]'); process.exit(1); }
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const { createRules, rulesOnInput } = await vite.ssrLoadModule('/src/state/rules.ts');
const { DEFAULTS } = await vite.ssrLoadModule('/src/state/config.ts');
// Summary in the replay's words: sleepy clips caught (seconds after the beep) or missed; false alarms on all others.
const all = JSON.parse(readFileSync(file, 'utf8'));
const sum = { caught: [], missed: [], falses: [], others: 0 };
for (const r of all) {
  const rules = createRules();
  const ev = Number(/-ev(\d+)/.exec(r.name)?.[1] ?? 0);
  const states = r.inputs.map((i) => [i.sec, rulesOnInput(i, rules, DEFAULTS).status.state]);
  if (r.expect === 'SLEEPY') {
    const hit = states.find(([s, st]) => s >= ev && st === 'SLEEPY');
    (hit ? sum.caught : sum.missed).push(`${r.name.startsWith('holdout-') ? 'kept aside ' : ''}${r.label} ${hit ? (hit[0] - ev).toFixed(1) + ' s after the beep' : ''}`);
  } else {
    sum.others++;
    const n = states.filter(([, st]) => st === 'SLEEPY').length;
    if (n) sum.falses.push(`${r.label} ${r.name} (${n} checks)`);
  }
}
console.log(`caught ${sum.caught.length}: ${sum.caught.join('; ')}\nmissed ${sum.missed.length}: ${sum.missed.join('; ')}\nfalse sleepy alarms on ${sum.others} other clips: ${sum.falses.length}${sum.falses.length ? ': ' + sum.falses.join('; ') : ''}\n`);
for (const r of all) {
  if (only && r.label !== only) continue;
  const rules = createRules();
  let first = null, why = '', maxEyes = 0, maxHead = 0;
  for (const i of r.inputs) {
    const st = rulesOnInput(i, rules, DEFAULTS).status;
    maxEyes = Math.max(maxEyes, st.held.eyes); maxHead = Math.max(maxHead, st.held.headDown);
    if (st.state === 'SLEEPY' && first === null) {
      first = i.sec;
      why = st.held.eyes >= DEFAULTS.sleepySec ? `eyes closed ${st.held.eyes.toFixed(1)} s` : `head down (no face) ${st.held.headDown.toFixed(1)} s`;
    }
  }
  if (first === null && r.expect !== 'SLEEPY') continue;
  const lids = r.inputs.filter((i) => i.shapes).map((i) => Math.min(i.shapes.eyeBlinkLeft, i.shapes.eyeBlinkRight));
  const pitches = r.inputs.map((i) => i.pitch).filter((p) => p !== null);
  console.log(`${r.label.padEnd(17)} ${r.name.slice(-36).padEnd(37)} ${first === null ? 'never sleepy' : `SLEEPY at ${first} s: ${why}`}` +
    ` | longest eyes ${maxEyes.toFixed(1)} s, longest no-face ${maxHead.toFixed(1)} s, face ${Math.round(100 * lids.length / r.inputs.length)}%, lids max ${Math.max(0, ...lids).toFixed(2)}, pitch max ${Math.max(-99, ...pitches)}`);
}
await vite.close();
