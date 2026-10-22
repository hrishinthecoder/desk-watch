// Prints the activity clues (src/state/activities.ts) per clip from a replay result, so rules
// can be chosen from real numbers.   node scripts/features.mjs <replay-result.json> [--holdout]
// Without --holdout only tuning clips are shown; kept-aside clips stay unseen until the final test.
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { createFeatures } = await vite.ssrLoadModule('/src/state/activities.ts');
const { isHoldout } = await vite.ssrLoadModule('/src/detection/clips.ts');
await vite.close();

const showHoldout = process.argv.includes('--holdout');
const clips = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  .filter((c) => c.inputs?.length && isHoldout(c.name) === showHoldout)
  .sort((a, b) => a.label.localeCompare(b.label));

const q = (xs, f) => { const s = xs.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const cols = ['pitch', 'yaw|', 'eyesDown', 'eyesSide', 'lids', 'jawMove', 'handMove', 'handsSeen'];
console.log('label'.padEnd(16) + 'clip'.padEnd(10) + 'face%  ' + cols.map((c) => c.replace('|', '').padEnd(10)).join('') + '  (medians; [p10-p90] for pitch)');
for (const c of clips) {
  const f = createFeatures();
  const rows = c.inputs.map((i) => f(i)).filter((_, k) => c.inputs[k].sec >= 2);
  const med = (k) => q(rows.map((r) => (k === 'yaw|' ? Math.abs(r.yaw ?? NaN) : r[k])), 0.5);
  const fmt = (v) => (Number.isNaN(v) ? '—' : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)).padEnd(10);
  const face = Math.round((100 * rows.filter((r) => r.face).length) / rows.length);
  console.log(c.label.padEnd(16) + c.name.slice(11, 19).padEnd(10) + `${face}%`.padEnd(7) + cols.map((k) => fmt(med(k))).join('') +
    `  [${fmt(q(rows.map((r) => r.pitch), 0.1)).trim()}-${fmt(q(rows.map((r) => r.pitch), 0.9)).trim()}]`);
}
