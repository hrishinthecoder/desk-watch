import { describe, expect, it } from 'vitest';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  addEvent, closeOpenSessions, exportAll, finishSession, importAll, MIGRATIONS, openDb, sessionsBetween,
  sessionsCsv, startSegment, extendSegment, startSession, getSettings, setSettings, TABLES,
  getBlocklist, setBlocklist, getMainValue, setMainValue, startUsage, extendUsage,
  activeSet, blockSets, createSet, deleteSet, pickSet, renameSet,
  listTasks, saveTask, deleteTask, listRoutines, saveRoutine, deleteRoutine, listSubjects, saveSubject, deleteSubject, completeTask,
  uncompleteTask, reorderTasks,
} from '../electron/db';
import { QUICK_ADD } from '../electron/blocklist';

const tmpFile = () => join(mkdtempSync(join(tmpdir(), 'deskwatch-')), 'deskwatch.db');

function sample(db: DatabaseSync) {
  const id = startSession(db, { startedAt: 1000, plannedMin: 15, cameraMode: true, screenMode: false });
  const a = startSegment(db, id, 'FOCUSED', 1000); extendSegment(db, a, 61_000);
  const b = startSegment(db, id, 'PHONE', 61_000); extendSegment(db, b, 71_000);
  addEvent(db, id, 'phone_pickup', 61_000);
  return id;
}

describe('migrations', () => {
  it('fresh install creates every table at the latest version', () => {
    const db = openDb(':memory:');
    expect((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(MIGRATIONS.length);
    const names = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((r) => r.name);
    for (const t of TABLES) expect(names).toContain(t);
  });

  it('upgrade keeps existing rows and saves a backup first', () => {
    const file = tmpFile();
    const v1 = openDb(file);
    sample(v1);
    v1.close();
    const v2 = openDb(file, [...MIGRATIONS, 'ALTER TABLE sessions ADD COLUMN note TEXT']);
    expect((v2.prepare('SELECT COUNT(*) AS n FROM activity_segments').get() as { n: number }).n).toBe(2);
    expect((v2.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(MIGRATIONS.length + 1);
    expect(existsSync(`${file}.bak-v${MIGRATIONS.length}`)).toBe(true);
    v2.close();
  });

  it('a failing migration rolls back and leaves the data and version as they were', () => {
    const file = tmpFile();
    const v1 = openDb(file);
    sample(v1);
    v1.close();
    expect(() => openDb(file, [...MIGRATIONS, 'ALTER TABLE sessions ADD COLUMN note TEXT; THIS IS NOT SQL'])).toThrow();
    const again = new DatabaseSync(file);
    expect((again.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(MIGRATIONS.length);
    const cols = (again.prepare('PRAGMA table_info(sessions)').all() as { name: string }[]).map((c) => c.name);
    expect(cols).not.toContain('note');
    expect((again.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n).toBe(1);
  });

  it('refuses data from a newer version instead of damaging it', () => {
    const file = tmpFile();
    openDb(file, [...MIGRATIONS, 'SELECT 1']).close();
    expect(() => openDb(file)).toThrow(/newer version/);
  });
});

describe('sessions', () => {
  it('finishing a session totals focused time from its segments', () => {
    const db = openDb(':memory:');
    const id = sample(db);
    finishSession(db, id, 80_000, false);
    const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, number>;
    expect(s.ended_at).toBe(80_000);
    expect(s.focused_sec).toBe(60);
    expect(s.ended_early).toBe(0);
    // the last segment was stretched to the end time
    expect(sessionsBetween(db, 0, 1e9).segments.at(-1)!.end).toBe(80_000);
  });

  it('a session left open by a crash is closed at its last saved segment', () => {
    const db = openDb(':memory:');
    const id = sample(db);
    closeOpenSessions(db);
    const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, number>;
    expect(s.ended_at).toBe(71_000);
    expect(s.focused_sec).toBe(60);
  });

  it('settings keep only what is stored, with types', () => {
    const db = openDb(':memory:');
    setSettings(db, { calibratedPitch: 26.7, cameraId: 'abc', strictMode: true });
    expect(getSettings(db)).toEqual({ calibratedPitch: 26.7, cameraId: 'abc', strictMode: true });
    setSettings(db, { cameraId: 'x' });
    expect(getSettings(db)).toEqual({ cameraId: 'x' });
  });

  it('CSV has one line per session', () => {
    const db = openDb(':memory:');
    finishSession(db, sample(db), 80_000, false);
    const lines = sessionsCsv(db).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(',15,1.3,1.0,on,no,1,0');
  });
});

describe('export / import', () => {
  it('round trip gives back identical data', () => {
    const a = openDb(':memory:');
    finishSession(a, sample(a), 80_000, false);
    setSettings(a, { downSec: 30 });
    const json = JSON.parse(JSON.stringify(exportAll(a)));
    const b = openDb(':memory:');
    sample(b); sample(b); // existing data is replaced, not merged
    importAll(b, json);
    expect(exportAll(b).tables).toEqual(exportAll(a).tables);
  });

  it('a bad file changes nothing', () => {
    const db = openDb(':memory:');
    sample(db);
    const before = exportAll(db).tables;
    const good = exportAll(db);
    expect(() => importAll(db, { hello: 1 })).toThrow(/not a Desk Watch/);
    expect(() => importAll(db, { ...good, schema: 999 })).toThrow(/newer version/);
    expect(() => importAll(db, { ...good, tables: { evil: [] } })).toThrow(/Unknown table/);
    expect(() => importAll(db, { ...good, tables: { sessions: [{ 'id; DROP TABLE x': 1 }] } })).toThrow(/Unknown column/);
    expect(() => importAll(db, { ...good, tables: { sessions: [{ id: 1, started_at: {} }] } })).toThrow(/Bad value/);
    // breaks a NOT NULL rule half way through: everything rolls back
    expect(() => importAll(db, { ...good, tables: { ...good.tables, events: [{ type: null, at: 1 }] } })).toThrow();
    expect(exportAll(db).tables).toEqual(before);
  });
});

describe('Stage D storage', () => {
  it('a new database starts with the default block list', () => {
    const db = openDb(':memory:');
    const l = getBlocklist(db);
    expect(l).toContainEqual({ list: 'blocked', kind: 'site', pattern: 'instagram.com' });
    expect(l).toContainEqual({ list: 'productive', kind: 'site', pattern: 'youtube.com' });
    setBlocklist(db, [{ list: 'blocked', kind: 'app', pattern: 'steam' }, { list: 'blocked', kind: 'app', pattern: 'steam' }]);
    expect(getBlocklist(db)).toEqual([{ list: 'blocked', kind: 'app', pattern: 'steam' }]);
  });
  it('focused time counts Writing, Reading, Speaking and Idle (Stage C bug), and upgrading fixes old sessions', () => {
    const file = tmpFile();
    const v1 = openDb(file, MIGRATIONS.slice(0, 1));
    const id = startSession(v1, { startedAt: 0, plannedMin: 5, cameraMode: true, screenMode: false });
    extendSegment(v1, startSegment(v1, id, 'READING', 0), 30_000);
    extendSegment(v1, startSegment(v1, id, 'PHONE', 30_000), 40_000);
    extendSegment(v1, startSegment(v1, id, 'WRITING', 40_000), 60_000);
    v1.prepare('UPDATE sessions SET ended_at = 60000, focused_sec = 0 WHERE id = ?').run(id); // what the old code saved
    v1.close();
    const v2 = openDb(file);
    expect((v2.prepare('SELECT focused_sec FROM sessions').get() as { focused_sec: number }).focused_sec).toBe(50);
    const id2 = startSession(v2, { startedAt: 100_000, plannedMin: 5, cameraMode: true, screenMode: false });
    extendSegment(v2, startSegment(v2, id2, 'SPEAKING', 100_000), 110_000);
    finishSession(v2, id2, 110_000, false);
    expect((v2.prepare('SELECT focused_sec FROM sessions WHERE id = ?').get(id2) as { focused_sec: number }).focused_sec).toBe(10);
  });
  it('the pairing code is kept when the page saves its settings, and not shown to the page', () => {
    const db = openDb(':memory:');
    setMainValue(db, 'pairingCode', 'ABCD1234');
    setSettings(db, { theme: 'dark' });
    expect(getMainValue(db, 'pairingCode')).toBe('ABCD1234');
    expect(getSettings(db)).toEqual({ theme: 'dark' });
  });
  it('Stage D2: upgrading puts the old list into "My list" and adds Exam mode and Light mode', () => {
    const file = tmpFile();
    const v2 = openDb(file, MIGRATIONS.slice(0, 2));
    v2.prepare("INSERT INTO blocklist (list, kind, pattern) VALUES ('blocked', 'app', 'steam')").run();
    v2.close();
    const db = openDb(file);
    expect(blockSets(db)).toEqual([{ id: 1, name: 'My list' }, { id: 2, name: 'Exam mode' }, { id: 3, name: 'Light mode' }]);
    expect(activeSet(db)).toBe(1);
    expect(getBlocklist(db)).toContainEqual({ list: 'blocked', kind: 'app', pattern: 'steam' });
    expect(getBlocklist(db)).toContainEqual({ list: 'blocked', kind: 'site', pattern: 'netflix.com' });
    pickSet(db, 2);
    const exam = getBlocklist(db);
    for (const c of QUICK_ADD) for (const p of c.sites) expect(exam).toContainEqual({ list: 'blocked', kind: 'site', pattern: p });
    expect(exam).toContainEqual({ list: 'productive', kind: 'site', pattern: 'youtube.com' });
    pickSet(db, 3);
    expect(getBlocklist(db).filter((e) => e.list === 'blocked').map((e) => e.pattern).sort())
      .toEqual(['facebook.com', 'instagram.com', 'tiktok.com', 'youtube.com/shorts']);
  });
  it('Stage D2: sets are separate lists; new, rename and delete', () => {
    const db = openDb(':memory:');
    pickSet(db, 3);
    setBlocklist(db, [{ list: 'blocked', kind: 'app', pattern: 'discord' }]);
    pickSet(db, 2);
    expect(getBlocklist(db)).not.toContainEqual({ list: 'blocked', kind: 'app', pattern: 'discord' }); // Exam mode untouched
    pickSet(db, 3);
    createSet(db, '  Weekend ');
    expect(blockSets(db).at(-1)!.name).toBe('Weekend');
    expect(getBlocklist(db)).toEqual([{ list: 'blocked', kind: 'app', pattern: 'discord' }]); // copy of Light mode, now in use
    expect(() => createSet(db, 'weekend')).toThrow(/already/);
    expect(() => createSet(db, '  ')).toThrow(/name/);
    const id = activeSet(db)!;
    renameSet(db, id, 'Sunday');
    expect(blockSets(db).find((s) => s.id === id)!.name).toBe('Sunday');
    deleteSet(db, id);
    expect(activeSet(db)).toBe(1); // the deleted set was in use: the first set takes over
    expect((db.prepare('SELECT COUNT(*) AS n FROM blocklist WHERE set_id = ?').get(id) as { n: number }).n).toBe(0);
    deleteSet(db, 2); deleteSet(db, 3);
    expect(() => deleteSet(db, 1)).toThrow(/at least one/);
    expect(() => pickSet(db, 99)).toThrow();
  });
  it('Stage D2: an export from before block sets still imports, into "My list"', () => {
    const db = openDb(':memory:');
    importAll(db, { app: 'desk-watch', schema: 2, tables: { blocklist: [{ id: 5, list: 'blocked', kind: 'site', pattern: 'old.com' }] } });
    expect(blockSets(db)).toEqual([{ id: 1, name: 'My list' }]);
    expect(getBlocklist(db)).toEqual([{ list: 'blocked', kind: 'site', pattern: 'old.com' }]);
    const again = openDb(':memory:');
    importAll(again, exportAll(db));
    expect(getBlocklist(again)).toEqual(getBlocklist(db));
  });
  it('Stage E: upgrading adds an optional block set to routine blocks, with a backup first', () => {
    const file = tmpFile();
    const v3 = openDb(file, MIGRATIONS.slice(0, 3));
    v3.prepare('INSERT INTO routines (day, start_min, length_min) VALUES (1, 600, 60)').run();
    v3.close();
    const db = openDb(file);
    expect(existsSync(`${file}.bak-v3`)).toBe(true);
    expect(listRoutines(db)).toMatchObject([{ id: 1, day: 1, start_min: 600, length_min: 60, task_id: null, camera_mode: 1, screen_mode: 0, block_set_id: null }]);
  });
  it('Stage E: tasks add up the focused time of their sessions', () => {
    const db = openDb(':memory:');
    const id = saveTask(db, { subject_id: null, title: 'Chapter 3', notes: '', subtasks: [], due: '2026-10-12', due_min: null, repeat: 'none', priority: 1, est_min: 50, status: 'todo' });
    const s1 = startSession(db, { startedAt: 0, plannedMin: 5, cameraMode: false, screenMode: false, taskId: id });
    extendSegment(db, startSegment(db, s1, 'FOCUSED', 0), 120_000);
    finishSession(db, s1, 120_000, false);
    startSession(db, { startedAt: 200_000, plannedMin: 5, cameraMode: false, screenMode: false }); // no task
    expect(listTasks(db)[0]).toMatchObject({ id, title: 'Chapter 3', status: 'todo', focused_sec: 120 });
    saveTask(db, { subject_id: null, title: 'Chapter 3', notes: '', subtasks: [], due: null, due_min: null, repeat: 'none', priority: 1, est_min: 50, status: 'done', id: id });
    expect(listTasks(db)[0]).toMatchObject({ status: 'done', due: null });
    deleteTask(db, id);
    expect(listTasks(db)).toEqual([]);
    expect((db.prepare('SELECT task_id FROM sessions WHERE id = ?').get(s1) as { task_id: number | null }).task_id).toBe(null); // time kept
  });
  it('Stage E: routine blocks refuse overlaps; a deleted task or block set leaves the block without one', () => {
    const db = openDb(':memory:');
    const task = saveTask(db, { subject_id: null, title: 'Essay', notes: '', subtasks: [], due: null, due_min: null, repeat: 'none', priority: 2, est_min: null, status: 'todo' });
    const base = { day: 2, start_min: 17 * 60, length_min: 60, task_id: task, camera_mode: 1, screen_mode: 1, block_set_id: 2 };
    expect(saveRoutine(db, base)).toBe(null);
    expect(saveRoutine(db, { ...base, start_min: 17 * 60 + 30 })).toMatch(/overlaps/);
    expect(saveRoutine(db, { ...base, start_min: 9 * 60, block_set_id: 99 })).toMatch(/block set/);
    const id = listRoutines(db)[0].id;
    expect(saveRoutine(db, { ...base, id, length_min: 90 })).toBe(null); // editing itself is fine
    deleteTask(db, task);
    deleteSet(db, 2);
    expect(listRoutines(db)[0]).toMatchObject({ length_min: 90, task_id: null, block_set_id: null });
    deleteRoutine(db, listRoutines(db)[0].id); // (edited today, so today's block replaced the old one: a new id)
    expect(listRoutines(db)).toEqual([]);
  });
  it('migration 6: estimates become minutes with the pomodoro length of that moment, a backup first (owner, 2026-10-21)', () => {
    const file = tmpFile();
    const v5 = openDb(file, MIGRATIONS.slice(0, 5));
    v5.prepare("INSERT INTO settings (key, value) VALUES ('pomoMin', '50')").run();
    const ins = v5.prepare('INSERT INTO tasks (title, est_pomos, status, created_at) VALUES (?, ?, ?, 0)');
    ins.run('a', 3, 'todo'); ins.run('b', null, 'todo');
    v5.close();
    const db = openDb(file);
    expect(existsSync(`${file}.bak-v5`)).toBe(true);
    expect(listTasks(db).map((t) => [t.title, t.est_min])).toEqual([['a', 150], ['b', null]]);
    // an export of schema 5 is converted with its own pomodoro length (25 when it has none)
    const again = openDb(':memory:');
    importAll(again, { app: 'desk-watch', schema: 5, tables: { settings: [{ key: 'pomoMin', value: '30' }],
      tasks: [{ id: 1, subject_id: null, title: 'x', notes: '', subtasks: '[]', due: null, due_min: null, repeat: 'none', priority: 2, est_pomos: 2, status: 'todo', created_at: 1, done_at: null, sort: 1 }] } });
    expect(listTasks(again)[0].est_min).toBe(60);
    importAll(again, { app: 'desk-watch', schema: 5, tables: { tasks: [{ id: 1, title: 'x', est_pomos: 2, status: 'todo', created_at: 1 }] } });
    expect(listTasks(again)[0].est_min).toBe(50);
  });
  it('E4 migration 5: subjects from the old subject text, estimates in pomodoros, a backup first', () => {
    const file = tmpFile();
    const v4 = openDb(file, MIGRATIONS.slice(0, 4));
    const ins = v4.prepare('INSERT INTO tasks (subject, title, est_min, status, created_at) VALUES (?, ?, ?, ?, 0)');
    ins.run('Maths', 'a', 40, 'todo'); ins.run(' maths ', 'b', null, 'done'); ins.run('', 'c', 25, 'todo'); ins.run('Physics', 'd', 3000, 'doing');
    v4.close();
    const db = openDb(file);
    expect(existsSync(`${file}.bak-v4`)).toBe(true);
    expect(listSubjects(db).map((s) => s.name)).toEqual(['Maths', 'Physics']);
    expect(listTasks(db).map((t) => [t.title, t.subject, t.est_min, t.status, t.sort, t.notes, t.subtasks, t.repeat]))
      .toEqual([['a', 'Maths', 50, 'todo', 1, '', [], 'none'], ['b', 'Maths', null, 'done', 2, '', [], 'none'], ['c', '', 25, 'todo', 3, '', [], 'none'], ['d', 'Physics', 2475, 'doing', 4, '', [], 'none']]); // via 5 (pomodoros) and 6 (× 25 min)
  });
  it('E4: an export made before the to-do list (schema 4) still imports', () => {
    const db = openDb(':memory:');
    importAll(db, { app: 'desk-watch', schema: 4, tables: { tasks: [
      { id: 3, subject: 'English', title: 'Essay', due: null, priority: 2, est_min: 50, status: 'todo', created_at: 1 },
      { id: 5, subject: 'english', title: 'Poem', due: null, priority: 2, est_min: null, status: 'todo', created_at: 2 }] } });
    expect(listSubjects(db)).toEqual([{ id: 1, name: 'English', sort: 1 }]);
    expect(listTasks(db).map((t) => [t.id, t.subject_id, t.est_min, t.sort])).toEqual([[3, 1, 50, 3], [5, 1, null, 5]]); // minutes, as before schema 5
  });
  it('E4: completing, Undo, repeats, order and subjects', () => {
    const db = openDb(':memory:');
    expect(saveSubject(db, '#Physics')).toBe(null);
    expect(saveSubject(db, 'physics')).toMatch(/already/);
    const phys = listSubjects(db)[0].id;
    const base = { subject_id: phys, title: 'Lab', notes: 'n', subtasks: [{ title: 's', done: true }], due: '2026-10-15', due_min: null,
      repeat: 'weekly' as const, priority: 1, est_min: 50, status: 'todo' as const };
    const a = saveTask(db, base, 1000);
    const b = saveTask(db, { ...base, repeat: 'none', title: 'Other' }, 1000);
    const now = new Date(2026, 9, 15, 12).getTime();
    const copy = completeTask(db, a, now);
    const all = () => listTasks(db);
    expect(all().find((t) => t.id === a)).toMatchObject({ status: 'done', done_at: now });
    expect(all().find((t) => t.id === copy)).toMatchObject({ title: 'Lab', due: '2026-10-22', status: 'todo', subtasks: [{ title: 's', done: false }], subject: 'Physics', sort: 3 });
    expect(completeTask(db, a, now)).toBe(null); // already done: nothing happens twice
    uncompleteTask(db, a, 'todo', copy);
    expect(all().map((t) => [t.id, t.status, t.done_at])).toEqual([[a, 'todo', null], [b, 'todo', null]]);
    reorderTasks(db, [b, a]);
    expect(all().map((t) => t.id)).toEqual([b, a]);
    saveTask(db, { ...base, id: b, status: 'done' }, 5);
    expect(all().find((t) => t.id === b)?.done_at).toBe(5);
    saveTask(db, { ...base, id: b, status: 'doing' }, 6);
    expect(all().find((t) => t.id === b)?.done_at).toBe(null);
    expect(() => saveTask(db, { ...base, subject_id: 99 })).toThrow(/subject/);
    deleteSubject(db, phys);
    expect(all().every((t) => t.subject_id === null && t.subject === '')).toBe(true);
    const again = openDb(':memory:');
    importAll(again, exportAll(db));
    expect(listTasks(again)).toEqual(listTasks(db));
  });
  it('Stage E: routines with their block set survive export and import', () => {
    const db = openDb(':memory:');
    saveRoutine(db, { day: 3, start_min: 600, length_min: 45, task_id: null, camera_mode: 1, screen_mode: 1, block_set_id: 3 });
    const again = openDb(':memory:');
    importAll(again, exportAll(db));
    expect(listRoutines(again)).toEqual(listRoutines(db));
  });
  it('time per site/app is saved per session', () => {
    const db = openDb(':memory:');
    const id = startSession(db, { startedAt: 0, plannedMin: 5, cameraMode: false, screenMode: true });
    extendUsage(db, startUsage(db, id, 'site', 'wikipedia.org', 0), 5000);
    expect(sessionsBetween(db, 0, 1).usage).toEqual([{ session_id: id, kind: 'site', name: 'wikipedia.org', start: 0, end: 5000 }]);
  });
});
