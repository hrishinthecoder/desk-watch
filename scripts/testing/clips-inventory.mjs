// READ-ONLY: counts the owner's clips per label (training / kept aside, glasses, beep), with their dates.
// Never writes anything. Default folder: %APPDATA%\Desk Watch\clips.
//   node scripts/testing/clips-inventory.mjs [clips folder]
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? join(process.env.APPDATA ?? '', 'Desk Watch', 'clips');
if (!existsSync(dir)) { console.log('no clips folder:', dir); process.exit(1); }
let total = 0, bytes = 0;
const rows = [];
for (const d of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'results')) {
  const files = readdirSync(join(dir, d.name)).filter((f) => f.endsWith('.webm'));
  const days = new Set(files.map((f) => f.replace(/^holdout-/, '').slice(0, 10)));
  const size = files.reduce((a, f) => a + statSync(join(dir, d.name, f)).size, 0);
  total += files.length; bytes += size;
  rows.push([d.name, files.filter((f) => !f.startsWith('holdout-')).length, files.filter((f) => f.startsWith('holdout-')).length,
    files.filter((f) => f.includes('-glasses')).length, files.filter((f) => f.includes('-ev')).length, [...days].sort().join(' ')]);
}
console.log('label'.padEnd(20), 'train', 'kept', 'glasses', 'beep', 'days');
for (const r of rows.sort()) console.log(String(r[0]).padEnd(20), String(r[1]).padEnd(5), String(r[2]).padEnd(4), String(r[3]).padEnd(7), String(r[4]).padEnd(4), r[5]);
console.log(`${total} clips, ${(bytes / 1e6).toFixed(0)} MB`);
