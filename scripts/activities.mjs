// Scores the activity rules (src/state/activities.ts) on the clips of a replay result.
//   node scripts/activities.mjs <replay-result.json> [--holdout] [key=value ...]
// Tuning clips by default; --holdout scores only the kept-aside clips (the fair test).
// key=value overrides a threshold, e.g. readEyes=0.15. --cal simulates the 30 s calibration wizard
// with the first 10 s of one tuning clip each of writing, reading and idle.
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { createFeatures, activityOf, createActivity, featureVector, averageVector } = await vite.ssrLoadModule('/src/state/activities.ts');
const { CLIP_LABELS, isHoldout } = await vite.ssrLoadModule('/src/detection/clips.ts');
const { DEFAULTS } = await vite.ssrLoadModule('/src/state/config.ts');
await vite.close();

const holdout = process.argv.includes('--holdout');
const th = { ...DEFAULTS };
for (const a of process.argv.slice(3).filter((a) => a.includes('='))) { const [k, v] = a.split('='); th[k] = Number(v); }
const ACTS = ['WRITING', 'READING', 'SPEAKING', 'IDLE', 'LOOKING_AWAY'];
const target = Object.fromEntries(CLIP_LABELS.map((l) => [l.id, l.activity]));
const every = JSON.parse(readFileSync(process.argv[2], 'utf8')).filter((c) => c.inputs?.length);
const clips = every.filter((c) => isHoldout(c.name) === holdout && ACTS.includes(target[c.label]));
let cal = null;
if (process.argv.includes('--cal')) {
  cal = {};
  for (const [act, label] of [['WRITING', 'writing'], ['READING', 'reading'], ['IDLE', 'idle']]) {
    const c = every.find((c) => c.label === label && !isHoldout(c.name));
    const f = createFeatures();
    cal[act] = averageVector(c.inputs.map((i) => ({ sec: i.sec, r: f(i) })).filter((x) => x.sec >= 2 && x.sec < 12 && x.r.face).map((x) => featureVector(x.r)));
  }
}

console.log(`${holdout ? 'KEPT-ASIDE' : 'TUNING'}${cal ? '+cal' : ''} clips ` + ACTS.map((a) => a.slice(0, 8).padEnd(9)).join('') + 'correct');
const tot = { ok: 0, n: 0 };
for (const label of [...new Set(clips.map((c) => c.label))]) {
  const n = Object.fromEntries(ACTS.map((a) => [a, 0]));
  let all = 0;
  for (const c of clips.filter((c) => c.label === label)) {
    const feat = createFeatures(), smooth = createActivity();
    for (const i of c.inputs) {
      const { activity } = smooth(i.t, activityOf(feat(i), th, cal));
      if (i.sec < 2) continue;
      n[activity]++; all++;
    }
  }
  const ok = n[target[label]];
  tot.ok += ok; tot.n += all;
  console.log(label.padEnd(18) + ACTS.map((a) => `${Math.round((100 * n[a]) / all)}%`.padEnd(9)).join('') + `${Math.round((100 * ok) / all)}%`);
}
console.log('ALL'.padEnd(18) + ' '.repeat(45) + `${Math.round((100 * tot.ok) / tot.n)}%`);
