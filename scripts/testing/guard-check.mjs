// Live check of the start-up guard (electron/guard.ts), using scratch folders only:
// Desk Watch is started with two different --user-data-dir folders, so whichever one Electron uses, the other does
// not match: it must quit at once (exit code 3, "REFUSED") without creating a database in either folder.
// (The real fallback case would point at the owner's real data, so it is covered by tests/guard.test.ts only.)
//   npm run build, then: node scripts/testing/guard-check.mjs <scratch folder>
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2];
if (!base) { console.log('usage: node scripts/testing/guard-check.mjs <scratch folder>'); process.exit(1); }
const a = join(base, 'guard-a'), b = join(base, 'guard-b');
for (const d of [a, b]) mkdirSync(d, { recursive: true });
const t0 = Date.now();
const r = spawnSync('npx', ['electron', '.', `--user-data-dir=${a}`, `--user-data-dir=${b}`], {
  env: { ...process.env, DESKWATCH_PORT: '47616' }, encoding: 'utf8', timeout: 30_000, shell: true,
});
const out = `${r.stdout}${r.stderr}`;
const made = [a, b].filter((d) => existsSync(join(d, 'deskwatch.db')));
const pass = r.status === 3 && out.includes('DESK WATCH REFUSED TO START') && !made.length;
console.log(pass ? 'PASS' : 'FAIL', `two different data folders: quits with code ${r.status} in ${Date.now() - t0} ms, no database made`, pass ? '' : JSON.stringify({ out: out.slice(0, 400), made }));
for (const d of [a, b]) rmSync(d, { recursive: true, force: true });
process.exit(pass ? 0 : 1);
