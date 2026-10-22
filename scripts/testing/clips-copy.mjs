// Makes a SCRATCH data folder for the clip work (A2, "clips ready"): the owner's clips and a copy of their database
// (for the calibration), so `electron . --replay --user-data-dir=<scratch>` and the dataset export never touch the real
// folder. The real database is opened READ-ONLY (SQLite's VACUUM INTO writes only the copy); the copy then loses its
// main-process keys (browser keys: CLAUDE.md lesson). Clips are copied file by file; nothing in the real folder changes.
//   node scripts/testing/clips-copy.mjs <empty scratch folder>
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const out = process.argv[2] && resolve(process.argv[2]);
const real = join(process.env.APPDATA ?? '', 'Desk Watch');
if (!out) { console.log('usage: node scripts/testing/clips-copy.mjs <empty scratch folder>'); process.exit(1); }
if (out.toLowerCase().startsWith(real.toLowerCase())) throw new Error('the scratch folder must not be inside the real data folder');
if (existsSync(out) && readdirSync(out).length) throw new Error(`${out} is not empty`);
mkdirSync(join(out, 'clips'), { recursive: true });

const src = new DatabaseSync(join(real, 'deskwatch.db'), { readOnly: true });
src.exec(`VACUUM INTO '${join(out, 'deskwatch.db').replace(/'/g, "''")}'`);
src.close();
const copy = new DatabaseSync(join(out, 'deskwatch.db'));
const removed = copy.prepare("DELETE FROM settings WHERE key LIKE 'main:%'").run().changes;
const cal = copy.prepare("SELECT key FROM settings WHERE key IN ('activityCal', 'calibratedPitch', 'workstation')").all().map((r) => r.key);
copy.close();

let n = 0;
for (const d of readdirSync(join(real, 'clips'), { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'results')) {
  mkdirSync(join(out, 'clips', d.name), { recursive: true });
  for (const f of readdirSync(join(real, 'clips', d.name)).filter((f) => f.endsWith('.webm'))) { copyFileSync(join(real, 'clips', d.name, f), join(out, 'clips', d.name, f)); n++; }
}
console.log(`copied ${n} clips and the database (main-process keys removed: ${removed}; calibration keys: ${cal.join(', ') || 'none'})`);
