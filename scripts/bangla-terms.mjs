// Owner's Bangla wording rule (2026-10-23): common app and tech terms stay in Latin script, the way Bengali speakers
// say them ("Focus mode", "Pomodoro", "Break", "Calibration" …); only normal sentences are translated.
// Rewrites the Bangla side of electron/bn.ts and prints every changed line (English key, before, after).
//   node scripts/bangla-terms.mjs          (then node scripts/bangla-review.mjs)
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../electron/bn.ts', import.meta.url);
// Order matters: longer phrases and suffixed forms first. A Bangla suffix after a Latin word gets a hyphen.
const RULES = [
  ['ফোকাস মোডের', 'Focus mode-এর'], ['ফোকাস মোড', 'Focus mode'],
  ['স্ক্রিন মোডের', 'Blocker mode-এর'], ['স্ক্রিন মোডে', 'Blocker mode-এ'], ['স্ক্রিন মোড', 'Blocker mode'],
  ['ক্যামেরা মোড', 'Camera mode'], ['কড়া মোড', 'Strict mode'],
  ['লম্বা বিরতি', 'Long break'], ['বিরতির', 'Break-এর'], ['বিরতি', 'Break'],
  ['পোমোডোরোর', 'Pomodoro-র'], ['পোমোডোরো', 'Pomodoro'],
  ['বোর্ড', 'Board'],
  ['ক্যালিব্রেশনের', 'Calibration-এর'], ['ক্যালিব্রেশন', 'Calibration'], ['ক্যালিব্রেট', 'calibrate'],
  ['উল্টো গণনা', 'Countdown'], ['সোজা গণনার', 'Count-up'], ['সোজা গণনা', 'Count-up'],
  ['ডিবাগ', 'Debug'],
  // 2026-10-23 (owner): Session too.
  ['সেশনগুলো', 'Session-গুলো'], ['সেশনের', 'Session-এর'], ['সেশনে', 'Session-এ'], ['সেশনটি', 'Session-টি'], ['সেশনটা', 'Session-টা'], ['সেশন', 'Session'],
];
// Whole values for single words (noise colours, theme names). The noise names say "noise" (owner, 2026-10-23).
const WHOLE = { White: 'White noise', Pink: 'Pink noise', Brown: 'Brown noise', Light: 'Light', Dark: 'Dark' };
// Not the app's Break: "short dips forgiven".
const SKIP = new Set(['Phone: short dips forgiven (seconds)']);

const lines = readFileSync(FILE, 'utf8').split('\n');
let changed = 0;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(\s*)"(.*)": "(.*)",(\s*)$/);
  if (!m || SKIP.has(m[2])) continue;
  let v = WHOLE[m[2]] ?? m[3];
  if (!WHOLE[m[2]]) for (const [a, b] of RULES) v = v.split(a).join(b);
  v = v.replace(/^calibrate/, 'Calibrate');
  if (v === m[3]) continue;
  console.log(`${m[2]}\n   before: ${m[3]}\n   after:  ${v}`);
  lines[i] = `${m[1]}"${m[2]}": "${v}",${m[4]}`;
  changed++;
}
writeFileSync(FILE, lines.join('\n'));
console.log(`${changed} lines changed`);
