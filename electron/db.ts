// Local database: one SQLite file in the userData folder, built-in node:sqlite, main process only.
// Tested in tests/db.test.ts (migrations, export -> import round trip, bad imports).
import { DatabaseSync } from 'node:sqlite';
import { rmSync } from 'node:fs';
import { t as tr } from './i18n.js';
import { addDaysKey, dateKey, nextDue, reorder, type RoutineInput, type Subject, type Subtask, type Task, type TaskInput } from './planner.js';
import { activeOn, blocksBetween as blocksBetweenRule, currentSlots, dayChangeProblem, planSave, type Block, type BlockRow, type DayChange, type LogRow, type RoutineSet, type Slot } from './routines.js';

type Row = Record<string, string | number | null>;

// Numbered schema changes, tracked with PRAGMA user_version. Never edit one that has
// shipped; add a new entry instead. Each runs in its own transaction.
export const MIGRATIONS: string[] = [
  `CREATE TABLE tasks (
     id INTEGER PRIMARY KEY, subject TEXT NOT NULL DEFAULT '', title TEXT NOT NULL, due TEXT,
     priority INTEGER NOT NULL DEFAULT 2, est_min INTEGER, status TEXT NOT NULL DEFAULT 'todo', created_at INTEGER NOT NULL);
   CREATE TABLE sessions (
     id INTEGER PRIMARY KEY, started_at INTEGER NOT NULL, ended_at INTEGER, planned_min INTEGER NOT NULL,
     camera_mode INTEGER NOT NULL, screen_mode INTEGER NOT NULL,
     task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL, focused_sec REAL, ended_early INTEGER);
   CREATE TABLE activity_segments (
     id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
     activity TEXT NOT NULL, start_at INTEGER NOT NULL, end_at INTEGER NOT NULL, confidence REAL);
   CREATE INDEX segments_by_session ON activity_segments(session_id);
   CREATE TABLE events (
     id INTEGER PRIMARY KEY, session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
     type TEXT NOT NULL, at INTEGER NOT NULL, detail TEXT);
   CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
   CREATE TABLE blocklist (
     id INTEGER PRIMARY KEY, list TEXT NOT NULL CHECK (list IN ('blocked', 'productive')),
     kind TEXT NOT NULL CHECK (kind IN ('site', 'app')), pattern TEXT NOT NULL, UNIQUE (list, kind, pattern));
   CREATE TABLE app_usage (
     id INTEGER PRIMARY KEY, session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
     kind TEXT NOT NULL, name TEXT NOT NULL, start_at INTEGER NOT NULL, end_at INTEGER NOT NULL);
   CREATE TABLE routines (
     id INTEGER PRIMARY KEY, day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6), start_min INTEGER NOT NULL,
     length_min INTEGER NOT NULL, task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
     camera_mode INTEGER NOT NULL DEFAULT 1, screen_mode INTEGER NOT NULL DEFAULT 0);`,
  // 2: default block list (Stage D), and focused time recounted with the Stage C activities.
  `INSERT OR IGNORE INTO blocklist (list, kind, pattern) VALUES
     ('blocked', 'site', 'instagram.com'), ('blocked', 'site', 'facebook.com'), ('blocked', 'site', 'tiktok.com'),
     ('blocked', 'site', 'x.com'), ('blocked', 'site', 'twitter.com'), ('blocked', 'site', 'reddit.com'),
     ('blocked', 'site', 'netflix.com'), ('productive', 'site', 'youtube.com');
   CREATE INDEX usage_by_session ON app_usage(session_id);
   UPDATE sessions SET focused_sec = (SELECT COALESCE(SUM(end_at - start_at), 0) / 1000.0 FROM activity_segments
     WHERE session_id = sessions.id AND activity IN ('FOCUSED', 'WRITING', 'READING', 'SPEAKING', 'IDLE'))
   WHERE ended_at IS NOT NULL;`,
  // 3: block sets (Stage D2). The old list becomes "My list"; Exam mode and Light mode are added.
  `CREATE TABLE block_sets (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
   INSERT INTO block_sets (id, name) VALUES (1, 'My list'), (2, 'Exam mode'), (3, 'Light mode');
   CREATE TABLE blocklist_new (
     id INTEGER PRIMARY KEY, set_id INTEGER NOT NULL DEFAULT 1 REFERENCES block_sets(id) ON DELETE CASCADE,
     list TEXT NOT NULL CHECK (list IN ('blocked', 'productive')),
     kind TEXT NOT NULL CHECK (kind IN ('site', 'app')), pattern TEXT NOT NULL, UNIQUE (set_id, list, kind, pattern));
   INSERT INTO blocklist_new (set_id, list, kind, pattern) SELECT 1, list, kind, pattern FROM blocklist;
   DROP TABLE blocklist;
   ALTER TABLE blocklist_new RENAME TO blocklist;
   INSERT INTO blocklist (set_id, list, kind, pattern) VALUES
     (2, 'blocked', 'site', 'instagram.com'), (2, 'blocked', 'site', 'facebook.com'), (2, 'blocked', 'site', 'tiktok.com'),
     (2, 'blocked', 'site', 'youtube.com/shorts'), (2, 'blocked', 'site', 'x.com'), (2, 'blocked', 'site', 'twitter.com'),
     (2, 'blocked', 'site', 'reddit.com'), (2, 'blocked', 'site', 'netflix.com'), (2, 'productive', 'site', 'youtube.com'),
     (3, 'blocked', 'site', 'instagram.com'), (3, 'blocked', 'site', 'facebook.com'), (3, 'blocked', 'site', 'tiktok.com'),
     (3, 'blocked', 'site', 'youtube.com/shorts'), (3, 'productive', 'site', 'youtube.com');`,
  // 4: a routine block can name a block set (Stage E). NULL = the set chosen on the Study tab.
  `ALTER TABLE routines ADD COLUMN block_set_id INTEGER REFERENCES block_sets(id) ON DELETE SET NULL;`,
  // 5: to-do list (Stage E4). Subjects become their own list; estimates are in pomodoros (25 min, rounded up);
  // tasks get notes, subtasks (JSON list), repeat, an optional time, a completion time and a hand-made order.
  `CREATE TABLE subjects (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, sort INTEGER NOT NULL DEFAULT 0);
   INSERT OR IGNORE INTO subjects (name, sort) SELECT trim(subject), MIN(id) FROM tasks WHERE trim(subject) <> '' GROUP BY lower(trim(subject)) ORDER BY MIN(id);
   ALTER TABLE tasks ADD COLUMN subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL;
   UPDATE tasks SET subject_id = (SELECT id FROM subjects WHERE name = trim(tasks.subject));
   ALTER TABLE tasks DROP COLUMN subject;
   ALTER TABLE tasks ADD COLUMN est_pomos INTEGER;
   UPDATE tasks SET est_pomos = MIN(99, (est_min + 24) / 25) WHERE est_min > 0;
   ALTER TABLE tasks DROP COLUMN est_min;
   ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT '';
   ALTER TABLE tasks ADD COLUMN subtasks TEXT NOT NULL DEFAULT '[]';
   ALTER TABLE tasks ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none';
   ALTER TABLE tasks ADD COLUMN due_min INTEGER;
   ALTER TABLE tasks ADD COLUMN done_at INTEGER;
   ALTER TABLE tasks ADD COLUMN sort INTEGER NOT NULL DEFAULT 0;
   UPDATE tasks SET sort = id;`,
  // 6: estimates are stored in minutes, fixed when they are set (owner, 2026-10-21): pomodoros × the pomodoro length
  // at that time, so a later change of the length does not change old estimates. Here: × today's length.
  `ALTER TABLE tasks ADD COLUMN est_min INTEGER;
   UPDATE tasks SET est_min = est_pomos * COALESCE((SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'pomoMin'), 25) WHERE est_pomos > 0;
   ALTER TABLE tasks DROP COLUMN est_pomos;`,
  // 7: routines (Stage G3, owner 2026-10-21). A routine groups the weekly blocks; one is on at a time (routine_log:
  // which one is on from which day); blocks are valid from / to a date, so edits change today and later only; one
  // day's skip or move is in routine_changes. The existing blocks become "My routine", on since the start of time,
  // each block its own slot (a slot = the blocks made together, one per weekday).
  `CREATE TABLE routine_sets (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
   CREATE TABLE routine_log (id INTEGER PRIMARY KEY, from_date TEXT NOT NULL, set_id INTEGER REFERENCES routine_sets(id) ON DELETE SET NULL);
   ALTER TABLE routines ADD COLUMN set_id INTEGER REFERENCES routine_sets(id) ON DELETE CASCADE;
   ALTER TABLE routines ADD COLUMN slot INTEGER;
   ALTER TABLE routines ADD COLUMN subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL;
   ALTER TABLE routines ADD COLUMN valid_from TEXT;
   ALTER TABLE routines ADD COLUMN valid_to TEXT;
   CREATE TABLE routine_changes (
     id INTEGER PRIMARY KEY, routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE, date TEXT NOT NULL,
     skip INTEGER NOT NULL DEFAULT 0, start_min INTEGER, length_min INTEGER, UNIQUE (routine_id, date));
   INSERT INTO routine_sets (id, name) SELECT 1, 'My routine' WHERE EXISTS (SELECT 1 FROM routines);
   INSERT INTO routine_log (from_date, set_id) SELECT '0000-01-01', 1 WHERE EXISTS (SELECT 1 FROM routines);
   UPDATE routines SET set_id = 1, slot = id;`,
];

// Activities that count as study time (same as STUDY in src/session/accounting.ts).
const STUDY_SQL = "('FOCUSED', 'WRITING', 'READING', 'SPEAKING', 'IDLE')";

// Parents before children, so imports satisfy the foreign keys.
export const TABLES = ['subjects', 'tasks', 'sessions', 'activity_segments', 'events', 'settings', 'block_sets', 'blocklist', 'app_usage', 'routine_sets', 'routine_log', 'routines', 'routine_changes'];

const version = (db: DatabaseSync) => (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;

// `caught`: after the rollback, turns an expected error into the answer (e.g. "nothing saved, these are the problems").
function transaction<T>(db: DatabaseSync, f: () => T, caught?: (e: unknown) => T | null): T {
  db.exec('BEGIN');
  try { const r = f(); db.exec('COMMIT'); return r; } catch (e) {
    db.exec('ROLLBACK');
    const answer = caught?.(e);
    if (answer !== undefined && answer !== null) return answer;
    throw e;
  }
}

// Brings the file up to the latest schema. Before upgrading existing data, a copy is saved
// next to it as deskwatch.db.bak-v<old version>. A failed step rolls back and stops.
export function migrate(db: DatabaseSync, file?: string, migrations = MIGRATIONS) {
  const v = version(db);
  if (v > migrations.length) throw new Error(tr('This data was made by a newer version of Desk Watch (database version {v}). Please update the app.', { v }));
  if (v === migrations.length) return;
  if (file && v > 0) {
    const bak = `${file}.bak-v${v}`;
    rmSync(bak, { force: true });
    db.exec(`VACUUM INTO '${bak.replace(/'/g, "''")}'`);
  }
  for (let i = v; i < migrations.length; i++) {
    transaction(db, () => { db.exec(migrations[i]); db.exec(`PRAGMA user_version = ${i + 1}`); });
  }
}

export function openDb(file: string, migrations = MIGRATIONS) {
  // If another program holds the file for a moment, wait up to 5 s instead of failing at once with "database is
  // locked" (2026-10-21: that error, thrown in a timer, froze test copies behind Electron's error box).
  const db = new DatabaseSync(file, { timeout: 5000 });
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db, file === ':memory:' ? undefined : file, migrations);
  return db;
}

// ---- sessions ----
export function startSession(db: DatabaseSync, s: { startedAt: number; plannedMin: number; cameraMode: boolean; screenMode: boolean; taskId?: number | null }) {
  const r = db.prepare('INSERT INTO sessions (started_at, planned_min, camera_mode, screen_mode, task_id) VALUES (?, ?, ?, ?, ?)')
    .run(s.startedAt, s.plannedMin, s.cameraMode ? 1 : 0, s.screenMode ? 1 : 0, s.taskId ?? null);
  return Number(r.lastInsertRowid);
}

// A segment row is written when an activity starts and its end time is moved forward
// every few seconds, so a crash or power cut loses at most those few seconds.
export function startSegment(db: DatabaseSync, sessionId: number, activity: string, at: number) {
  return Number(db.prepare('INSERT INTO activity_segments (session_id, activity, start_at, end_at) VALUES (?, ?, ?, ?)')
    .run(sessionId, activity, at, at).lastInsertRowid);
}
export function extendSegment(db: DatabaseSync, id: number, at: number) {
  db.prepare('UPDATE activity_segments SET end_at = MAX(end_at, ?) WHERE id = ?').run(at, id);
}
export function addEvent(db: DatabaseSync, sessionId: number, type: string, at: number, detail: string | null = null) {
  db.prepare('INSERT INTO events (session_id, type, at, detail) VALUES (?, ?, ?, ?)').run(sessionId, type, at, detail);
}

// Closes a session. `at` = null means "when its last segment ended" (used at startup for
// sessions that were open when the app was killed).
export function finishSession(db: DatabaseSync, id: number, at: number | null, early: boolean) {
  transaction(db, () => {
    if (at !== null) db.prepare('UPDATE activity_segments SET end_at = MAX(end_at, ?) WHERE id = (SELECT MAX(id) FROM activity_segments WHERE session_id = ?)').run(at, id);
    db.prepare(`UPDATE sessions SET
        ended_at = COALESCE(?, (SELECT MAX(end_at) FROM activity_segments WHERE session_id = sessions.id), started_at),
        focused_sec = (SELECT COALESCE(SUM(end_at - start_at), 0) / 1000.0 FROM activity_segments WHERE session_id = sessions.id AND activity IN ${STUDY_SQL}),
        ended_early = ?
      WHERE id = ?`).run(at, early ? 1 : 0, id);
  });
}
export function closeOpenSessions(db: DatabaseSync) {
  for (const { id } of db.prepare('SELECT id FROM sessions WHERE ended_at IS NULL').all() as { id: number }[]) finishSession(db, id, null, true);
}

export function sessionsBetween(db: DatabaseSync, from: number, to: number) {
  const sessions = db.prepare('SELECT * FROM sessions WHERE started_at >= ? AND started_at < ? ORDER BY started_at').all(from, to) as Row[];
  const ids = sessions.map((s) => s.id as number);
  const where = `session_id IN (${ids.map(() => '?').join(',') || 'NULL'})`;
  return {
    sessions,
    segments: db.prepare(`SELECT session_id, activity, start_at AS start, end_at AS end FROM activity_segments WHERE ${where} ORDER BY start_at`).all(...ids) as Row[],
    events: db.prepare(`SELECT session_id, type, at, detail FROM events WHERE ${where} ORDER BY at`).all(...ids) as Row[],
    usage: db.prepare(`SELECT session_id, kind, name, start_at AS start, end_at AS end FROM app_usage WHERE ${where} ORDER BY start_at`).all(...ids) as Row[],
  };
}

// ---- settings: one row per value you changed (see parseSettings in src/state/config.ts) ----
// Keys starting with "main:" belong to the main process (e.g. the extension pairing code)
// and are never touched by the page's settings.
export function getSettings(db: DatabaseSync): Record<string, unknown> {
  return Object.fromEntries((db.prepare("SELECT key, value FROM settings WHERE key NOT LIKE 'main:%'").all() as { key: string; value: string }[]).map((r) => [r.key, JSON.parse(r.value)]));
}
export function setSettings(db: DatabaseSync, own: Record<string, unknown>) {
  transaction(db, () => {
    db.exec("DELETE FROM settings WHERE key NOT LIKE 'main:%'");
    const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(own)) ins.run(k, JSON.stringify(v));
  });
}

export function getMainValue(db: DatabaseSync, key: string): string | null {
  return (db.prepare('SELECT value FROM settings WHERE key = ?').get(`main:${key}`) as { value: string } | undefined)?.value ?? null;
}
export function setMainValue(db: DatabaseSync, key: string, value: string) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(`main:${key}`, value);
}

// ---- Blocker mode: block list and time per site/app ----
// Each block set has its own rows; the chosen set (main:blockSet) is the list in use.
export type ListEntry = { list: 'blocked' | 'productive'; kind: 'site' | 'app'; pattern: string };
export type BlockSet = { id: number; name: string };
export const blockSets = (db: DatabaseSync) => db.prepare('SELECT id, name FROM block_sets ORDER BY id').all() as BlockSet[];
// The chosen set, or the first one if it was deleted or never chosen. null only when there are no sets.
export function activeSet(db: DatabaseSync): number | null {
  const ids = blockSets(db).map((s) => s.id);
  const chosen = Number(getMainValue(db, 'blockSet'));
  return ids.includes(chosen) ? chosen : ids[0] ?? null;
}
export function pickSet(db: DatabaseSync, id: number) {
  if (!blockSets(db).some((s) => s.id === id)) throw new Error(tr('No such block set.'));
  setMainValue(db, 'blockSet', String(id));
}
export const getBlocklist = (db: DatabaseSync) =>
  db.prepare('SELECT list, kind, pattern FROM blocklist WHERE set_id = ? ORDER BY kind, list, pattern').all(activeSet(db)) as ListEntry[];
export function setBlocklist(db: DatabaseSync, entries: ListEntry[]) {
  const id = activeSet(db);
  if (id === null) throw new Error(tr('There is no block set. Make one first.'));
  transaction(db, () => {
    db.prepare('DELETE FROM blocklist WHERE set_id = ?').run(id);
    const ins = db.prepare('INSERT OR IGNORE INTO blocklist (set_id, list, kind, pattern) VALUES (?, ?, ?, ?)');
    for (const e of entries) ins.run(id, e.list, e.kind, e.pattern);
  });
}
const cleanName = (name: string) => {
  const n = name.trim().slice(0, 40);
  if (!n) throw new Error(tr('Give the set a name.'));
  return n;
};
const nameTaken = (db: DatabaseSync, name: string, except = -1) =>
  blockSets(db).some((s) => s.id !== except && s.name.toLowerCase() === name.toLowerCase());
// A new set starts as a copy of the one in use, and becomes the one in use.
export function createSet(db: DatabaseSync, name: string) {
  const n = cleanName(name);
  if (nameTaken(db, n)) throw new Error(tr('There is already a set called "{name}".', { name: n }));
  const from = activeSet(db);
  transaction(db, () => {
    const id = Number(db.prepare('INSERT INTO block_sets (name) VALUES (?)').run(n).lastInsertRowid);
    db.prepare('INSERT INTO blocklist (set_id, list, kind, pattern) SELECT ?, list, kind, pattern FROM blocklist WHERE set_id = ?').run(id, from);
    setMainValue(db, 'blockSet', String(id));
  });
}
export function renameSet(db: DatabaseSync, id: number, name: string) {
  const n = cleanName(name);
  if (nameTaken(db, n, id)) throw new Error(tr('There is already a set called "{name}".', { name: n }));
  db.prepare('UPDATE block_sets SET name = ? WHERE id = ?').run(n, id);
}
export function deleteSet(db: DatabaseSync, id: number) {
  if (blockSets(db).length <= 1) throw new Error(tr('Keep at least one block set.'));
  db.prepare('DELETE FROM block_sets WHERE id = ?').run(id); // its rows go too (ON DELETE CASCADE)
}
// Same pattern as segments: written when it starts, end time moved forward as it goes.
export function startUsage(db: DatabaseSync, sessionId: number, kind: 'site' | 'app', name: string, at: number) {
  return Number(db.prepare('INSERT INTO app_usage (session_id, kind, name, start_at, end_at) VALUES (?, ?, ?, ?, ?)')
    .run(sessionId, kind, name, at, at).lastInsertRowid);
}
export function extendUsage(db: DatabaseSync, id: number, at: number) {
  db.prepare('UPDATE app_usage SET end_at = MAX(end_at, ?) WHERE id = ?').run(at, id);
}

// ---- export / import ----
export function exportAll(db: DatabaseSync) {
  return {
    app: 'desk-watch',
    schema: version(db),
    exportedAt: new Date().toISOString(),
    tables: Object.fromEntries(TABLES.map((t) => [t, db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()])),
  };
}

// Replaces ALL data with the file's contents, or changes nothing if anything is wrong.
// The file comes from the user's disk, so every table, column and value is checked.
export function importAll(db: DatabaseSync, data: unknown) {
  const d = data as { app?: unknown; schema?: unknown; tables?: unknown };
  if (!d || d.app !== 'desk-watch' || typeof d.tables !== 'object' || d.tables === null) throw new Error(tr('This is not a Desk Watch export file.'));
  if (!Number.isInteger(d.schema) || (d.schema as number) > version(db)) throw new Error(tr('This file was made by a newer version of Desk Watch.'));
  const tables = { ...(d.tables as Record<string, unknown>) };
  for (const t of Object.keys(tables)) if (!TABLES.includes(t)) throw new Error(tr('Unknown table "{name}" in the file.', { name: t }));
  // Files from before block sets (schema 2): their list goes into "My list" (set_id defaults to 1).
  tables.block_sets ??= [{ id: 1, name: 'My list' }];
  if ((d.schema as number) < 5) upgradeTasks(tables);
  else if ((d.schema as number) === 5) upgradeEstimates(tables);
  if ((d.schema as number) < 7) upgradeRoutines(tables);
  transaction(db, () => {
    for (const t of [...TABLES].reverse()) db.exec(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      const rows = tables[t] ?? [];
      if (!Array.isArray(rows)) throw new Error(tr('"{name}" is not a list.', { name: t }));
      const cols = new Set((db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name));
      for (const row of rows) {
        if (typeof row !== 'object' || row === null || Array.isArray(row)) throw new Error(tr('Bad row in "{name}".', { name: t }));
        const entries = Object.entries(row as Record<string, unknown>);
        for (const [k, v] of entries) {
          if (!cols.has(k)) throw new Error(tr('Unknown column "{col}" in "{name}".', { col: k, name: t }));
          if (v !== null && typeof v !== 'string' && typeof v !== 'number') throw new Error(tr('Bad value for "{col}" in "{name}".', { col: k, name: t }));
        }
        db.prepare(`INSERT INTO ${t} (${entries.map(([k]) => k).join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`)
          .run(...entries.map(([, v]) => v as string | number | null));
      }
    }
  });
}

// Files from before the to-do list (schema 4 and older): the same change as migration 5, made on the file's rows.
// Their estimates were already in minutes (est_min), which is what schema 6 stores again.
export function upgradeTasks(tables: Record<string, unknown>) {
  if (!Array.isArray(tables.tasks)) return;
  const subjects: { id: number; name: string; sort: number }[] = [];
  tables.tasks = tables.tasks.map((row: unknown) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return row; // refused by the checks later
    const { subject, est_min, ...r } = row as Record<string, unknown>;
    const name = typeof subject === 'string' ? subject.trim() : '';
    let s = subjects.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (name && !s) subjects.push(s = { id: subjects.length + 1, name, sort: subjects.length + 1 });
    return { ...r, subject_id: s?.id ?? null, est_min: typeof est_min === 'number' && est_min > 0 ? est_min : null, sort: typeof r.id === 'number' ? r.id : 0 };
  });
  tables.subjects = subjects;
}
// Files from before routines (schema 6 and older): the same change as migration 7, made on the file's rows.
export function upgradeRoutines(tables: Record<string, unknown>) {
  if (!Array.isArray(tables.routines) || !tables.routines.length) return;
  tables.routine_sets = [{ id: 1, name: 'My routine' }];
  tables.routine_log = [{ from_date: '0000-01-01', set_id: 1 }];
  tables.routines = tables.routines.map((row: unknown) => (typeof row === 'object' && row !== null && !Array.isArray(row)
    ? { ...(row as Record<string, unknown>), set_id: 1, slot: (row as { id?: unknown }).id ?? null } : row)); // refused by the checks later
}
// Files of schema 5 (estimates in pomodoros): the same change as migration 6, with the file's own pomodoro length.
export function upgradeEstimates(tables: Record<string, unknown>) {
  if (!Array.isArray(tables.tasks)) return;
  const setting = Array.isArray(tables.settings) ? (tables.settings as { key?: unknown; value?: unknown }[]).find((r) => r?.key === 'pomoMin') : undefined;
  const len = Number(setting?.value) > 0 ? Number(setting!.value) : 25;
  tables.tasks = tables.tasks.map((row: unknown) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return row;
    const { est_pomos, ...r } = row as Record<string, unknown>;
    return { ...r, est_min: typeof est_pomos === 'number' && est_pomos > 0 ? est_pomos * len : null };
  });
}

// One line per session, for spreadsheets.
export function sessionsCsv(db: DatabaseSync) {
  const rows = db.prepare(`SELECT s.started_at, s.ended_at, s.planned_min, s.focused_sec, s.camera_mode, s.ended_early,
      (SELECT COUNT(*) FROM events e WHERE e.session_id = s.id AND e.type = 'phone_pickup') AS pickups,
      (SELECT COUNT(*) FROM events e WHERE e.session_id = s.id AND e.type = 'left_desk') AS left_desk
    FROM sessions s ORDER BY s.started_at`).all() as Row[];
  const iso = (ms: unknown) => (typeof ms === 'number' ? new Date(ms).toISOString() : '');
  const min = (sec: number) => (sec / 60).toFixed(1);
  return [
    'start,end,planned_min,total_min,focused_min,camera,ended_early,phone_pickups,left_desk',
    ...rows.map((r) => [iso(r.started_at), iso(r.ended_at), r.planned_min,
      r.ended_at ? min(((r.ended_at as number) - (r.started_at as number)) / 1000) : '', min(Number(r.focused_sec ?? 0)),
      r.camera_mode ? 'on' : 'off', r.ended_early ? 'yes' : 'no', r.pickups, r.left_desk].join(',')),
  ].join('\n') + '\n';
}

// ---- planner (Stage E, to-do list E4): subjects, tasks and weekly routine blocks ----
// Values come already checked by cleanTask / cleanRoutine (electron/planner.ts).
const subtaskList = (json: unknown): Subtask[] => { try { const v = JSON.parse(String(json)); return Array.isArray(v) ? v : []; } catch { return []; } };
export const listTasks = (db: DatabaseSync) => (db.prepare(`SELECT t.id, t.subject_id, COALESCE(j.name, '') AS subject, t.title, t.notes,
    t.subtasks, t.due, t.due_min, t.repeat, t.priority, t.est_min, t.status, t.created_at, t.done_at, t.sort,
    COALESCE((SELECT SUM(s.focused_sec) FROM sessions s WHERE s.task_id = t.id), 0) AS focused_sec
  FROM tasks t LEFT JOIN subjects j ON j.id = t.subject_id ORDER BY t.sort, t.id`).all() as Row[])
  .map((r) => ({ ...r, subtasks: subtaskList(r.subtasks) }) as unknown as Task);
// done_at is set when a task becomes done and cleared when it is not done any more. New tasks go to the bottom.
export function saveTask(db: DatabaseSync, t: TaskInput, now = Date.now()): number {
  if (t.subject_id !== null && !db.prepare('SELECT 1 FROM subjects WHERE id = ?').get(t.subject_id)) throw new Error(tr('That subject no longer exists.'));
  const v = [t.subject_id, t.title, t.notes, JSON.stringify(t.subtasks), t.due, t.due_min, t.repeat, t.priority, t.est_min, t.status];
  if (t.id) {
    db.prepare(`UPDATE tasks SET subject_id = ?, title = ?, notes = ?, subtasks = ?, due = ?, due_min = ?, repeat = ?, priority = ?,
        est_min = ?, status = ?, done_at = CASE WHEN ? = 'done' THEN COALESCE(done_at, ?) ELSE NULL END WHERE id = ?`)
      .run(...v, t.status, now, t.id);
    return t.id;
  }
  return Number(db.prepare(`INSERT INTO tasks (subject_id, title, notes, subtasks, due, due_min, repeat, priority, est_min, status,
      created_at, done_at, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM tasks))`)
    .run(...v, now, t.status === 'done' ? now : null).lastInsertRowid);
}
export const deleteTask = (db: DatabaseSync, id: number) => { db.prepare('DELETE FROM tasks WHERE id = ?').run(id); };
// Ticking a task: done now; a repeating task also gets its next copy (its id is returned, so Undo can remove it).
export function completeTask(db: DatabaseSync, id: number, now = Date.now()): number | null {
  return transaction(db, () => {
    const t = listTasks(db).find((x) => x.id === id);
    if (!t || t.status === 'done') return null;
    db.prepare("UPDATE tasks SET status = 'done', done_at = ? WHERE id = ?").run(now, id);
    const due = nextDue(t.due, t.repeat, dateKey(new Date(now)));
    if (!due) return null;
    return saveTask(db, { ...t, id: undefined, due, status: 'todo', subtasks: t.subtasks.map((s) => ({ ...s, done: false })) }, now);
  });
}
// Undo of a tick: back to its old status, and the repeat copy (if any) removed.
export function uncompleteTask(db: DatabaseSync, id: number, status: string, copy: number | null) {
  transaction(db, () => {
    db.prepare('UPDATE tasks SET status = ?, done_at = NULL WHERE id = ?').run(status === 'doing' ? 'doing' : 'todo', id);
    if (copy !== null) deleteTask(db, copy);
  });
}
export function reorderTasks(db: DatabaseSync, ids: number[]) {
  const upd = db.prepare('UPDATE tasks SET sort = ? WHERE id = ?');
  const tasks = listTasks(db);
  transaction(db, () => { for (const [id, sort] of reorder(ids, tasks)) upd.run(sort, id); });
}

export const listSubjects = (db: DatabaseSync) => db.prepare('SELECT id, name, sort FROM subjects ORDER BY sort, id').all() as Subject[];
// A new subject (no id) or a new name. Returns the problem, or null when saved.
export function saveSubject(db: DatabaseSync, name: string, id?: number): string | null {
  const n = name.trim().replace(/^#/, '').trim().slice(0, 40);
  if (!n) return tr('Give the subject a name.');
  if (listSubjects(db).some((s) => s.id !== id && s.name.toLowerCase() === n.toLowerCase())) return tr('There is already a subject called "{name}".', { name: n });
  if (id) db.prepare('UPDATE subjects SET name = ? WHERE id = ?').run(n, id);
  else db.prepare('INSERT INTO subjects (name, sort) VALUES (?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM subjects))').run(n);
  return null;
}
// Its tasks stay, without a subject (ON DELETE SET NULL).
export const deleteSubject = (db: DatabaseSync, id: number) => { db.prepare('DELETE FROM subjects WHERE id = ?').run(id); };

// ---- routines (Stage G3): named groups of weekly blocks; see electron/routines.ts for the rules ----
const today0 = () => dateKey(new Date());
const blockRows = (db: DatabaseSync) => db.prepare(`SELECT id, day, start_min, length_min, task_id, camera_mode, screen_mode, block_set_id,
  set_id, slot, subject_id, valid_from, valid_to FROM routines ORDER BY day, start_min`).all() as BlockRow[];
const routineLog = (db: DatabaseSync) => db.prepare('SELECT from_date, set_id FROM routine_log ORDER BY from_date, id').all() as LogRow[];
const dayChanges = (db: DatabaseSync) => db.prepare('SELECT routine_id, date, skip, start_min, length_min FROM routine_changes').all() as DayChange[];
// The blocks of each date from `from` to `to` (dates "YYYY-MM-DD"), with each day's skip or move.
export const blocksBetween = (db: DatabaseSync, from: string, to: string) => blocksBetweenRule(from, to, blockRows(db), dayChanges(db), routineLog(db));
// The blocks of the coming 7 days (today first), skipped ones left out: what reminders, the Study tab and old callers use.
export const listRoutines = (db: DatabaseSync, today = today0()): Block[] => blocksBetween(db, today, addDaysKey(today, 6)).filter((b) => !b.skipped);

export function routineSets(db: DatabaseSync, today = today0()) {
  const active = activeOn(routineLog(db), today), rows = blockRows(db);
  return (db.prepare('SELECT id, name FROM routine_sets ORDER BY id').all() as RoutineSet[])
    .map((s) => ({ ...s, active: s.id === active, slots: currentSlots(rows, s.id, today) }));
}
// Saves a routine (new when it has no id): its name and slots, from today on. Returns the problems (nothing saved),
// or the routine's id. A new routine is switched on when no routine is on.
export function saveRoutineSet(db: DatabaseSync, x: { id?: number; name: string; slots: Slot[] }, today = today0()): { problems: string[]; id?: number } {
  const name = x.name.trim().slice(0, 60);
  if (!name) return { problems: [tr('Give the routine a name.')] };
  if (x.id && !db.prepare('SELECT 1 FROM routine_sets WHERE id = ?').get(x.id)) return { problems: [tr('That routine no longer exists.')] };
  if (db.prepare('SELECT 1 FROM routine_sets WHERE lower(name) = lower(?) AND id <> ?').get(name, x.id ?? 0)) return { problems: [tr('A routine with that name already exists.')] };
  return transaction(db, () => {
    const id = x.id ?? Number(db.prepare('INSERT INTO routine_sets (name) VALUES (?)').run(name).lastInsertRowid);
    db.prepare('UPDATE routine_sets SET name = ? WHERE id = ?').run(name, id);
    const problems = saveSlots(db, id, x.slots, today);
    if (problems.length) throw Object.assign(new Error('problems'), { problems }); // rolls back the new routine too
    if (!x.id && activeOn(routineLog(db), today) === null) activateRoutine(db, id, today);
    return { problems: [], id };
  }, (e) => ('problems' in (e as object) ? { problems: (e as { problems: string[] }).problems } : null));
}
// Writes a routine's slots from today on (future-only, electron/routines.ts planSave). One day's changes still to come
// move to the new block of the same slot and weekday.
function saveSlots(db: DatabaseSync, set: number, slots: Slot[], today: string): string[] {
  const rows = blockRows(db);
  const plan = planSave(rows, set, slots, today);
  const missing = (sql: string, id: number | null) => id !== null && !db.prepare(sql).get(id);
  for (const r of plan.add) {
    if (missing('SELECT 1 FROM tasks WHERE id = ?', r.task_id)) plan.problems.push(tr('That task no longer exists.'));
    if (missing('SELECT 1 FROM subjects WHERE id = ?', r.subject_id)) plan.problems.push(tr('That subject no longer exists.'));
    if (r.block_set_id !== null && !blockSets(db).some((s) => s.id === r.block_set_id)) plan.problems.push(tr('That block set no longer exists.'));
  }
  if (plan.problems.length) return [...new Set(plan.problems)];
  const yesterday = addDaysKey(today, -1);
  let next = Number((db.prepare('SELECT COALESCE(MAX(slot), 0) + 1 AS n FROM routines').get() as { n: number }).n);
  const slotIds = slots.map((s) => s.slot ?? next++);
  const ins = db.prepare(`INSERT INTO routines (day, start_min, length_min, task_id, camera_mode, screen_mode, block_set_id, set_id, slot, subject_id, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`);
  const added = plan.add.map((r) => ({ id: Number(ins.run(r.day, r.start_min, r.length_min, r.task_id, r.camera_mode, r.screen_mode, r.block_set_id, set, slotIds[r.slotIndex], r.subject_id, today).lastInsertRowid), day: r.day, slot: slotIds[r.slotIndex] }));
  const move = db.prepare('UPDATE routine_changes SET routine_id = ? WHERE routine_id = ? AND date >= ?');
  for (const old of rows.filter((r) => plan.end.includes(r.id) || plan.del.includes(r.id))) {
    const to = added.find((a) => a.slot === old.slot && a.day === old.day);
    if (to) move.run(to.id, old.id, today);
  }
  for (const id of plan.end) db.prepare('UPDATE routines SET valid_to = ? WHERE id = ?').run(yesterday, id);
  for (const id of plan.del) db.prepare('DELETE FROM routines WHERE id = ?').run(id);
  return [];
}
// Switches a routine on from today (null = none); past days keep the routine that was on then.
export function activateRoutine(db: DatabaseSync, id: number | null, today = today0()) {
  db.prepare('DELETE FROM routine_log WHERE from_date = ?').run(today);
  db.prepare('INSERT INTO routine_log (from_date, set_id) VALUES (?, ?)').run(today, id);
}
// Deletes a routine and its blocks (also from past days' plan; sessions and stats do not depend on it).
export function deleteRoutineSet(db: DatabaseSync, id: number, today = today0()) {
  transaction(db, () => {
    const wasOn = activeOn(routineLog(db), today) === id;
    db.prepare('DELETE FROM routines WHERE set_id = ?').run(id);
    db.prepare('DELETE FROM routine_sets WHERE id = ?').run(id);
    if (wasOn) activateRoutine(db, null, today);
  });
}
// One day only: skip a block, or give it another start and length on that date. Returns the problem, or null.
export function setDayChange(db: DatabaseSync, routineId: number, date: string, change: { skip: true } | { start_min: number; length_min: number }): string | null {
  const day = blocksBetween(db, date, date);
  const block = day.find((b) => b.id === routineId);
  if (!block) return tr('That block is not on that day.');
  if ('start_min' in change) {
    const problem = dayChangeProblem(block, change.start_min, change.length_min, day);
    if (problem) return problem;
  }
  db.prepare(`INSERT INTO routine_changes (routine_id, date, skip, start_min, length_min) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (routine_id, date) DO UPDATE SET skip = excluded.skip, start_min = excluded.start_min, length_min = excluded.length_min`)
    .run(routineId, date, 'skip' in change ? 1 : 0, 'start_min' in change ? change.start_min : null, 'start_min' in change ? change.length_min : null);
  return null;
}
export const clearDayChange = (db: DatabaseSync, routineId: number, date: string) => { db.prepare('DELETE FROM routine_changes WHERE routine_id = ? AND date = ?').run(routineId, date); };

// The single-block calls (Week view before G3, tests and scripts): they change the routine that is on today, from
// today on. With no routine on, a "My routine" is made and switched on. Returns the problem, or null when saved.
function onRoutine(db: DatabaseSync, today: string): number {
  const on = activeOn(routineLog(db), today);
  if (on !== null) return on;
  const id = Number(db.prepare('INSERT INTO routine_sets (name) VALUES (?)').run(tr('My routine')).lastInsertRowid);
  activateRoutine(db, id, today);
  return id;
}
export function saveRoutine(db: DatabaseSync, r: RoutineInput, today = today0()): string | null {
  return transaction(db, () => {
    const set = onRoutine(db, today);
    const rows = blockRows(db), slots = currentSlots(rows, set, today);
    const fields = { start_min: r.start_min, length_min: r.length_min, task_id: r.task_id, subject_id: null, camera_mode: r.camera_mode, screen_mode: r.screen_mode, block_set_id: r.block_set_id };
    const old = r.id ? rows.find((x) => x.id === r.id && x.set_id === set) : undefined;
    const i = old ? slots.findIndex((s) => s.slot === old.slot) : -1;
    if (i >= 0 && slots[i].days.length === 1) slots[i] = { ...slots[i], ...fields, days: [r.day] };
    else {
      if (i >= 0) slots[i] = { ...slots[i], days: slots[i].days.filter((d) => d !== old!.day) };
      slots.push({ ...fields, days: [r.day] });
    }
    const problems = saveSlots(db, set, slots, today);
    if (problems.length) throw Object.assign(new Error('problems'), { problems });
    return null;
  }, (e) => ('problems' in (e as object) ? (e as { problems: string[] }).problems[0] : null));
}
export function deleteRoutine(db: DatabaseSync, id: number, today = today0()) {
  const row = blockRows(db).find((x) => x.id === id);
  if (!row || row.set_id === null) return;
  const slots = currentSlots(blockRows(db), row.set_id, today).map((s) => (s.slot === row.slot ? { ...s, days: s.days.filter((d) => d !== row.day) } : s)).filter((s) => s.days.length);
  transaction(db, () => { saveSlots(db, row.set_id!, slots, today); });
}
