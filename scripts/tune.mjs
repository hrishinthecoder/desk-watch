// Offline rule tuning. Re-runs the pure rules (src/state) on the raw model outputs that
// `npm run replay` saved, with different thresholds, in seconds instead of minutes.
//   node scripts/tune.mjs <replay-result.json> [<another.json> ...]
// Each file is one replay (e.g. Lite0 crops vs Lite2 crops); each variant is a set of
// threshold overrides. Prints accuracy per label for every file x variant.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { DEFAULTS } = await vite.ssrLoadModule('/src/state/config.ts');
const { createRules, rulesOnInput } = await vite.ssrLoadModule('/src/state/rules.ts');
const { CLIP_LABELS, checkCorrect, eventSecOf, isHoldout, LEAVE_SEC, scoredState } = await vite.ssrLoadModule('/src/detection/clips.ts');
await vite.close();

// Same short rule times as the replay, so 15-20 s clips can reach their state.
const BASE = { ...DEFAULTS, phoneSec: 4, callSec: 4, downSec: 5, awaySec: 5, lookAwaySec: 5 };
// noCrops: drop hand-crop phones entirely.
const VARIANTS = {
  'defaults (uncalibrated)': {},
  'defaults + your calibration 26.7': { calibratedPitch: 26.7 },
  'calibration, crops off': { cropsForPhone: false, calibratedPitch: 26.7 },
  'calibration, call needs phone 0.15': { calibratedPitch: 26.7, callBoxMin: 0.15 },
  'calibration, call needs phone 0.25': { calibratedPitch: 26.7, callBoxMin: 0.25 },
  'calibration, call needs phone 0.35': { calibratedPitch: 26.7, callBoxMin: 0.35 },
  'call 0.25 + empty hand 0.6': { calibratedPitch: 26.7, callBoxMin: 0.25, emptyMin: 0.6 },
  'call 0.25 + empty hand 0.8': { calibratedPitch: 26.7, callBoxMin: 0.25, emptyMin: 0.8 },
  'call 0.25 + empty hand 0.95': { calibratedPitch: 26.7, callBoxMin: 0.25, emptyMin: 0.95 },
};

function score(clips, v) {
  const cfg = { ...BASE, ...v };
  const per = {};
  for (const c of clips) {
    const rules = createRules();
    const wait = c.expect === 'EMPTY' ? LEAVE_SEC : c.expect === 'DOWN' ? cfg.downSec : cfg.phoneSec, ev = eventSecOf(c.name);
    const p = (per[c.label] ??= { ok: 0, n: 0 });
    for (const i of c.inputs) {
      const { status } = rulesOnInput(v.noCrops ? { ...i, cropPhones: [] } : i, rules, cfg);
      const ok = checkCorrect(c.expect, scoredState(c.expect, status.state, i.person), i.sec, ev, wait);
      if (ok === null) continue;
      p.n++;
      if (ok) p.ok++;
    }
  }
  return per;
}

const pct = (p) => (p && p.n ? Math.round((100 * p.ok) / p.n) + '%' : '—');
const labels = CLIP_LABELS.filter((l) => l.expect !== 'SLEEPY').map((l) => l.id); // A3 clips: scored in Stage A3
// Optional: --after=2026-10-09 / --before=2026-10-09 keep clips recorded after/before that time.
const opt = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const stamp = (c) => c.name.replace(/^holdout-/, '');
for (const file of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
  // Tune on tuning clips only. --holdout scores the kept-aside clips instead: the fair test, run once at the end.
  const clips = JSON.parse(readFileSync(file, 'utf8')).filter((c) => c.inputs?.length && isHoldout(c.name) === process.argv.includes('--holdout') &&
    (!opt('after') || stamp(c) >= opt('after')) && (!opt('before') || stamp(c) < opt('before')));
  console.log(`\n${basename(file)}  (${clips.length} clips)`);
  console.log('variant'.padEnd(32) + labels.map((l) => l.slice(0, 10).padEnd(11)).join('') + 'ALL');
  for (const [name, v] of Object.entries(VARIANTS)) {
    const per = score(clips, v);
    const all = labels.map((l) => per[l]).filter(Boolean).reduce((a, p) => ({ ok: a.ok + p.ok, n: a.n + p.n }), { ok: 0, n: 0 });
    console.log(name.padEnd(32) + labels.map((l) => pct(per[l]).padEnd(11)).join('') + pct(all));
  }
}
