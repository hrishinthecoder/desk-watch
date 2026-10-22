import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  backupDue, backupName, backupTime, checkBackup, EVERY_MS, hasData, KEEP, listBackups, makeBackup, restoreBackup, toPrune,
} from '../electron/backup';
import { addEvent, exportAll, extendSegment, finishSession, openDb, saveTask, setSettings, startSegment, startSession } from '../electron/db';

const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'deskwatch-backup-'));
  return { dbFile: join(dir, 'deskwatch.db'), backups: join(dir, 'backups') };
};
const DAY = 24 * 3600_000;
const T0 = new Date(2026, 9, 14, 15, 30, 5).getTime();

function fill(db: ReturnType<typeof openDb>, at: number) {
  const id = startSession(db, { startedAt: at, plannedMin: 25, cameraMode: true, screenMode: true });
  extendSegment(db, startSegment(db, id, 'READING', at), at + 60_000);
  extendSegment(db, startSegment(db, id, 'PHONE', at + 60_000), at + 70_000);
  addEvent(db, id, 'blocked_attempt', at + 65_000, 'site:youtube.com');
  finishSession(db, id, at + 70_000, true);
  saveTask(db, { subject_id: null, title: 'Chapter 3', notes: 'n', subtasks: [{ title: 'a', done: true }], due: '2026-10-20', due_min: 600,
    repeat: 'weekly', priority: 1, est_min: 50, status: 'todo' });
  setSettings(db, { goalMin: 40, theme: 'dark' });
}

describe('backup names and rules', () => {
  it('name carries the local date and time, and reads back', () => {
    expect(backupName(T0)).toBe('deskwatch-2026-10-14-153005.db');
    expect(backupTime(backupName(T0))).toBe(T0);
    expect(backupTime(backupName(T0, true))).toBe(T0);
    expect(backupTime('deskwatch.db')).toBeNull();
    expect(backupTime('deskwatch-2026-10-14-153005.db.part')).toBeNull();
  });
  it('due weekly, and only when there is data', () => {
    expect(backupDue(null, T0, true)).toBe(true);
    expect(backupDue(null, T0, false)).toBe(false);
    expect(backupDue(T0, T0 + EVERY_MS - 1, true)).toBe(false);
    expect(backupDue(T0, T0 + EVERY_MS, true)).toBe(true);
  });
  it('keeps the newest 4, never the one being restored from', () => {
    const list = Array.from({ length: 6 }, (_, i) => ({ name: backupName(T0 - i * DAY), at: T0 - i * DAY, size: 1 }));
    expect(toPrune(list)).toEqual([list[4].name, list[5].name]);
    expect(toPrune(list, list[5].name)).toEqual([list[4].name]);
  });
});

// Real files on disk: on a first run in a fresh folder (files scanned by Windows, nothing compiled yet) these took
// just over vitest's 5 s default once, so they get more time.
describe('backup and restore with real files', { timeout: 30_000 }, () => {
  it('backup → change the data → restore: the data matches the backup exactly', () => {
    const { dbFile, backups } = tmp();
    let db = openDb(dbFile);
    fill(db, T0 - DAY);
    expect(hasData(db)).toBe(true);
    const before = exportAll(db).tables;
    const name = makeBackup(db, backups, T0);

    // Later: more data, and some deleted.
    fill(db, T0 + 1000);
    db.exec('DELETE FROM tasks WHERE id = 1');
    expect(exportAll(db).tables).not.toEqual(before);

    expect(restoreBackup(db, dbFile, backups, name, T0 + DAY)).toBeNull();
    db = openDb(dbFile);
    expect(exportAll(db).tables).toEqual(before);
    // The data as it was just before the restore is kept as a safety backup.
    expect(listBackups(backups).map((b) => b.name)).toEqual([backupName(T0 + DAY, true), name]);
    db.close();
  });

  it('the safety backup holds the data from just before the restore', () => {
    const { dbFile, backups } = tmp();
    let db = openDb(dbFile);
    fill(db, T0 - DAY);
    const name = makeBackup(db, backups, T0);
    fill(db, T0 + 1000);
    const latest = exportAll(db).tables;
    restoreBackup(db, dbFile, backups, name, T0 + DAY);
    db = openDb(dbFile);
    expect(restoreBackup(db, dbFile, backups, backupName(T0 + DAY, true), T0 + 2 * DAY)).toBeNull();
    db = openDb(dbFile);
    expect(exportAll(db).tables).toEqual(latest);
    db.close();
  });

  it('keeps 4 on disk and leaves no half-written files', () => {
    const { dbFile, backups } = tmp();
    const db = openDb(dbFile);
    fill(db, T0);
    for (let i = 0; i < 6; i++) makeBackup(db, backups, T0 + i * EVERY_MS);
    expect(listBackups(backups)).toHaveLength(KEEP);
    expect(readdirSync(backups).some((f) => f.endsWith('.part'))).toBe(false);
    expect(listBackups(backups)[0].name).toBe(backupName(T0 + 5 * EVERY_MS));
    db.close();
  });

  it('refuses bad files and changes nothing', () => {
    const { dbFile, backups } = tmp();
    const db = openDb(dbFile);
    fill(db, T0);
    makeBackup(db, backups, T0);
    const before = exportAll(db).tables;
    const junk = backupName(T0 + DAY);
    writeFileSync(join(backups, junk), 'not a database');
    expect(checkBackup(join(backups, junk))).not.toBeNull();
    expect(restoreBackup(db, dbFile, backups, junk)).not.toBeNull();
    expect(restoreBackup(db, dbFile, backups, '../deskwatch.db')).toBe('Backup not found.');
    expect(exportAll(db).tables).toEqual(before); // still open, untouched
    expect(existsSync(join(backups, backupName(T0 + 2 * DAY, true)))).toBe(false);
    db.close();
  });
});
