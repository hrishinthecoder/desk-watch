// For each clip: its longest stretch with no face (5 s or more), and what was seen just before the face went away:
// the face's height in the picture (0 top, 1 bottom), its median over the clip, head pitch, and hands during the stretch.
// Numbers only (replay result file). Helps tell "head down on the desk" from "face hidden by a book" (Stage A3).
//   node scripts/testing/noface-runs.mjs <replay-....json> [label,label]
import { readFileSync } from 'node:fs';

const [file, labels] = process.argv.slice(2);
const want = labels ? new Set(labels.split(',')) : null;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
for (const r of JSON.parse(readFileSync(file, 'utf8'))) {
  if (want && !want.has(r.label)) continue;
  const xs = r.inputs;
  let best = null, start = null;
  xs.forEach((i, k) => {
    if (i.pitch === null) { start ??= k; if (!best || k - start > best[1] - best[0]) best = [start, k]; } else start = null;
  });
  const faceY = (i) => (i.face ? (i.face.top + i.face.chin) / 2 : null);
  const ys = xs.map(faceY).filter((y) => y !== null);
  const len = best ? xs[best[1]].sec - xs[best[0]].sec : 0;
  if (len < 5) { console.log(`${r.label.padEnd(17)} ${r.name.slice(-30).padEnd(31)} no stretch >= 5 s (face ${Math.round(100 * ys.length / xs.length)}%)`); continue; }
  const before = xs.slice(Math.max(0, best[0] - 10), best[0]); // the 2 s before the face went away
  const by = before.map(faceY).filter((y) => y !== null), bp = before.map((i) => i.pitch).filter((p) => p !== null);
  const during = xs.slice(best[0], best[1] + 1);
  console.log(`${r.label.padEnd(17)} ${r.name.slice(-30).padEnd(31)} no face ${len.toFixed(1)} s from ${xs[best[0]].sec} s | face y before ${by.length ? med(by).toFixed(2) : '—'} ` +
    `(clip median ${ys.length ? med(ys).toFixed(2) : '—'}), last y ${by.length ? by.at(-1).toFixed(2) : '—'}, pitch before ${bp.length ? med(bp) : '—'} | hands ${Math.round(100 * during.filter((i) => i.hands.length).length / during.length)}%, person ${Math.round(100 * during.filter((i) => i.person).length / during.length)}%`);
}
