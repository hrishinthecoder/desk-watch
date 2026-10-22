import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { listRoutines, openDb } from '../electron/db';

// The test-copy freeze (2026-10-21): another program (seed.mjs) held the file for a moment, the app's 15 s reminder
// check read it, SQLite answered "database is locked" at once, and that error froze the app behind Electron's error box.
// A second process and real files: slow on a first run in a fresh folder, so more than vitest's 5 s default.
describe('a database locked for a moment by another program', { timeout: 30_000 }, () => {
  it('the app waits for it instead of failing at once', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'deskwatch-')), 'deskwatch.db');
    const db = openDb(file);
    const holder = spawn(process.execPath, ['-e', `const { DatabaseSync } = require('node:sqlite');
      const d = new DatabaseSync(${JSON.stringify(file)}); d.exec('BEGIN EXCLUSIVE'); console.log('locked');
      setTimeout(() => { d.exec('ROLLBACK'); d.close(); }, 1200);`]);
    await new Promise((r) => holder.stdout.once('data', r));
    const plain = new DatabaseSync(file); // how the app opened it before: no waiting
    expect(() => plain.prepare('SELECT * FROM routines').all()).toThrow(/locked/);
    plain.close();
    const t0 = Date.now();
    expect(listRoutines(db)).toEqual([]); // waits for the lock to end, then reads
    expect(Date.now() - t0).toBeGreaterThan(300);
    await new Promise((r) => holder.once('exit', r));
    db.close();
  });
});
