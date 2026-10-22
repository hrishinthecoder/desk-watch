// Automatic weekly backups and restore (Stage E3 Part 1). Main process only.
// Backups are made with VACUUM INTO, never a file copy: SQLite writes a complete, consistent
// copy even while a session is saving, so a backup can never be half-written.
// Tested in tests/backup.test.ts (keep/prune rules, backup → change → restore round trip, bad files).
import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { t as tr } from './i18n.js';
import { MIGRATIONS } from './db.js';

export const KEEP = 4;
export const EVERY_MS = 7 * 24 * 3600_000;
const NAME = /^deskwatch-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})(-before-restore)?\.db$/;

const pad = (n: number) => String(n).padStart(2, '0');
export const backupName = (at: number, beforeRestore = false) => {
  const d = new Date(at);
  return `deskwatch-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${beforeRestore ? '-before-restore' : ''}.db`;
};
// When a backup was made, read from its name (local time). null = not one of ours.
export const backupTime = (name: string) => {
  const m = NAME.exec(name);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : null;
};

export type Backup = { name: string; at: number; size: number };
export function listBackups(dir: string): Backup[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const at = backupTime(name);
    return at === null ? [] : [{ name, at, size: statSync(join(dir, name)).size }];
  }).sort((a, b) => b.at - a.at); // newest first
}

// Due when there is data worth keeping and the newest backup is a week old (or there is none).
export const backupDue = (newest: number | null, now: number, hasData: boolean) => hasData && (newest === null || now - newest >= EVERY_MS);
// Names to delete (list is newest first): all but the newest KEEP. `keep` (the backup being restored
// from) is never deleted, so for a moment there can be KEEP + 1; the next backup tidies up.
export const toPrune = (backups: Backup[], keep?: string) => backups.filter((b) => b.name !== keep).slice(KEEP).map((b) => b.name);

export const hasData = (db: DatabaseSync) =>
  (db.prepare('SELECT (SELECT COUNT(*) FROM sessions) + (SELECT COUNT(*) FROM tasks) AS n').get() as { n: number }).n > 0;

export function makeBackup(db: DatabaseSync, dir: string, now = Date.now(), opts: { beforeRestore?: boolean; keep?: string } = {}) {
  mkdirSync(dir, { recursive: true });
  const name = backupName(now, opts.beforeRestore);
  const part = join(dir, name + '.part');
  rmSync(part, { force: true });
  db.exec(`VACUUM INTO '${part.replace(/'/g, "''")}'`);
  renameSync(part, join(dir, name)); // only a finished backup gets a real name
  for (const old of toPrune(listBackups(dir), opts.keep)) rmSync(join(dir, old), { force: true });
  return name;
}

// A backup is only restored if SQLite says it is intact and it is not from a newer Desk Watch.
export function checkBackup(file: string): string | null {
  let b: DatabaseSync | null = null;
  try {
    b = new DatabaseSync(file, { readOnly: true });
    const ok = (b.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check;
    if (ok !== 'ok') return tr('This backup is damaged.');
    const v = (b.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    if (v < 1) return tr('This is not a Desk Watch backup.');
    if (v > MIGRATIONS.length) return tr('This backup was made by a newer version of Desk Watch.');
    return null;
  } catch {
    return tr('This file could not be read as a Desk Watch backup.');
  } finally {
    b?.close();
  }
}

// Restore: check the backup, back up the current data first ("before-restore"), close the database,
// put the backup in its place, and let the caller reopen it (older backups are upgraded on open).
// Returns null when done, or why nothing was changed.
export function restoreBackup(db: DatabaseSync, dbFile: string, dir: string, name: string, now = Date.now()): string | null {
  if (backupTime(name) === null || !existsSync(join(dir, name))) return tr('Backup not found.');
  const problem = checkBackup(join(dir, name));
  if (problem) return problem;
  makeBackup(db, dir, now, { beforeRestore: true, keep: name });
  db.close();
  const tmp = dbFile + '.restoring';
  copyFileSync(join(dir, name), tmp); // the backup file is closed and not in use: a plain copy is safe here
  for (const f of [dbFile + '-wal', dbFile + '-shm', dbFile + '-journal']) rmSync(f, { force: true });
  renameSync(tmp, dbFile);
  return null;
}
