// Upgrades a COPY of a Desk Watch database with the built migrations (dist-electron/db.js) and prints what
// changed in the tasks, so a new migration can be checked on real data without touching the original.
//   npm run build, then: node scripts/testing/migrate-copy.mjs <database file> <scratch folder>
// The copy has its main-process keys (browser keys) removed first (CLAUDE.md lesson), and is deleted at the end.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const [src, dir] = process.argv.slice(2);
if (!src || !dir) { console.log('usage: node scripts/testing/migrate-copy.mjs <database file> <scratch folder>'); process.exit(1); }
mkdirSync(dir, { recursive: true });
const file = join(dir, 'copy.db');
copyFileSync(src, file);
const raw = new DatabaseSync(file);
raw.exec("DELETE FROM settings WHERE key LIKE 'main:%'");
const before = {
  version: raw.prepare('PRAGMA user_version').get().user_version,
  tasks: raw.prepare('SELECT * FROM tasks ORDER BY id').all(),
  pomoMin: Number(raw.prepare("SELECT value FROM settings WHERE key = 'pomoMin'").get()?.value) || 25,
  counts: Object.fromEntries(['sessions', 'activity_segments', 'events', 'routines'].map((t) => [t, raw.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n])),
};
raw.close();

const store = createRequire(import.meta.url)('../../dist-electron/db.js');
const db = store.openDb(file);
const after = {
  version: db.prepare('PRAGMA user_version').get().user_version,
  tasks: store.listTasks(db),
  subjects: store.listSubjects(db),
  counts: Object.fromEntries(['sessions', 'activity_segments', 'events', 'routines'].map((t) => [t, db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n])),
  integrity: db.prepare('PRAGMA integrity_check').get().integrity_check,
  fk: db.prepare('PRAGMA foreign_key_check').all().length,
};
db.close();
console.log(`schema ${before.version} -> ${after.version}; integrity ${after.integrity}; foreign key problems ${after.fk}`);
console.log('other tables unchanged:', JSON.stringify(before.counts) === JSON.stringify(after.counts), JSON.stringify(after.counts));
console.log('subjects:', after.subjects.map((s) => s.name).join(', ') || '(none)');
let ok = before.tasks.length === after.tasks.length;
for (const b of before.tasks) {
  const a = after.tasks.find((t) => t.id === b.id);
  // Estimates end in minutes (schema 6): from schema 5, pomodoros × the copy's pomodoro length; from schema 4, through
  // migration 5's rounding up to 25-min pomodoros, then × 25 (or the length).
  const est = before.version >= 5 ? (b.est_pomos > 0 ? b.est_pomos * before.pomoMin : null) : b.est_min > 0 ? Math.min(99, Math.ceil(b.est_min / 25)) * before.pomoMin : null;
  const same = a && a.title === b.title && a.status === b.status && a.due === b.due && a.priority === b.priority &&
    (before.version >= 5 || a.subject === (b.subject ?? '').trim()) && a.est_min === est;
  if (!same) ok = false;
  console.log(`  task ${b.id}: ${same ? 'ok' : 'DIFFERENT'}  est ${b.est_pomos ?? b.est_min} -> ${a?.est_min} min, status ${a?.status}`);
}
console.log(ok ? 'all tasks carried over' : 'TASKS CHANGED');
rmSync(dir, { recursive: true, force: true });
