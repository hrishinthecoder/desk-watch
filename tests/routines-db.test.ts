import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  activateRoutine, blocksBetween, clearDayChange, deleteRoutineSet, exportAll, importAll, listRoutines, MIGRATIONS, openDb,
  routineSets, saveRoutineSet, sessionsBetween, setDayChange, startSession,
} from '../electron/db';
import { copyDay, type Slot } from '../electron/routines';

const tmpFile = () => join(mkdtempSync(join(tmpdir(), 'deskwatch-')), 'deskwatch.db');
const slot = (x: Partial<Slot>): Slot => ({ days: [1], start_min: 17 * 60, length_min: 60, task_id: null, subject_id: null, camera_mode: 1, screen_mode: 0, block_set_id: null, ...x });
const times = (db: ReturnType<typeof openDb>, date: string) => blocksBetween(db, date, date).map((b) => `${b.start_min / 60}${b.skipped ? ' skipped' : ''}`);
// October 2026: Wednesdays are the 14th, 21st and 28th; Mondays the 12th and 19th.
const LAST_WED = '2026-10-14', TODAY = '2026-10-21', NEXT_WED = '2026-10-28';

describe('routines in the database (G3)', () => {
  it('migration 7: existing blocks become "My routine" (on, each block its own slot), with a backup first', () => {
    const file = tmpFile();
    const v6 = openDb(file, MIGRATIONS.slice(0, 6));
    v6.prepare('INSERT INTO routines (day, start_min, length_min) VALUES (1, 600, 60), (3, 1020, 90)').run();
    v6.close();
    const db = openDb(file);
    expect(existsSync(`${file}.bak-v6`)).toBe(true);
    expect(routineSets(db, TODAY)).toMatchObject([{ id: 1, name: 'My routine', active: true, slots: [{ days: [1], start_min: 600 }, { days: [3], start_min: 1020 }] }]);
    expect(times(db, LAST_WED)).toEqual(['17']); // also on past days: it was on since the start
    expect(listRoutines(db, TODAY).map((b) => [b.date, b.start_min])).toEqual([['2026-10-21', 1020], ['2026-10-26', 600]]);
  });
  it('an empty database gets no routine; the first one saved is switched on', () => {
    const db = openDb(':memory:');
    expect(routineSets(db, TODAY)).toEqual([]);
    expect(saveRoutineSet(db, { name: 'HSC weekly', slots: [slot({ days: [1, 3] })] }, TODAY)).toEqual({ problems: [], id: 1 });
    expect(routineSets(db, TODAY)).toMatchObject([{ name: 'HSC weekly', active: true, slots: [{ days: [1, 3] }] }]);
  });
  it('editing changes today and later only: past days keep their blocks, sessions are untouched', () => {
    const db = openDb(':memory:');
    const { id } = saveRoutineSet(db, { name: 'HSC weekly', slots: [slot({ days: [1, 3] })] }, LAST_WED);
    startSession(db, { startedAt: new Date(2026, 9, 14, 17).getTime(), plannedMin: 60, cameraMode: true, screenMode: false });
    const before = sessionsBetween(db, 0, Date.now() * 2);
    expect(saveRoutineSet(db, { id, name: 'HSC weekly', slots: [slot({ days: [3], start_min: 18 * 60 })] }, TODAY).problems).toEqual([]);
    expect(times(db, LAST_WED)).toEqual(['17']); // last week: as it was
    expect(times(db, '2026-10-19')).toEqual(['17']); // Monday before today: as it was
    expect(times(db, TODAY)).toEqual(['18']);
    expect(times(db, '2026-10-26')).toEqual([]); // Monday is gone from today on
    expect(sessionsBetween(db, 0, Date.now() * 2)).toEqual(before);
    // edited twice on the same day: today's rows are replaced, not stacked
    saveRoutineSet(db, { id, name: 'HSC weekly', slots: [slot({ days: [3], start_min: 19 * 60 })] }, TODAY);
    expect(times(db, TODAY)).toEqual(['19']);
    expect(times(db, LAST_WED)).toEqual(['17']);
  });
  it('only one routine is on at a time; switching changes today and later only', () => {
    const db = openDb(':memory:');
    const term = saveRoutineSet(db, { name: 'Term', slots: [slot({ days: [3], start_min: 17 * 60 })] }, LAST_WED).id!;
    const exam = saveRoutineSet(db, { name: 'Exam week', slots: [slot({ days: [3], start_min: 9 * 60 })] }, LAST_WED).id!;
    expect(routineSets(db, LAST_WED).map((s) => [s.name, s.active])).toEqual([['Term', true], ['Exam week', false]]); // a second one is not switched on
    activateRoutine(db, exam, TODAY);
    expect([times(db, LAST_WED), times(db, TODAY), times(db, NEXT_WED)]).toEqual([['17'], ['9'], ['9']]);
    expect(routineSets(db, TODAY).map((s) => s.active)).toEqual([false, true]);
    activateRoutine(db, null, NEXT_WED);
    expect([times(db, TODAY), times(db, NEXT_WED)]).toEqual([['9'], []]);
    expect(term).not.toBe(exam);
  });
  it('one day can be skipped or moved, and undone, without changing the routine', () => {
    const db = openDb(':memory:');
    saveRoutineSet(db, { name: 'R', slots: [slot({ days: [3] }), slot({ days: [3], start_min: 19 * 60 })] }, LAST_WED);
    const [a] = blocksBetween(db, TODAY, TODAY);
    expect(setDayChange(db, a.id, TODAY, { skip: true })).toBe(null);
    expect(times(db, TODAY)).toEqual(['17 skipped', '19']);
    expect(times(db, NEXT_WED)).toEqual(['17', '19']);
    expect(listRoutines(db, TODAY).filter((b) => b.date === TODAY).map((b) => b.start_min)).toEqual([19 * 60]); // reminders skip it
    expect(setDayChange(db, a.id, TODAY, { start_min: 18 * 60 + 30, length_min: 60 })).toMatch(/overlaps/); // must still fit that day
    expect(setDayChange(db, a.id, TODAY, { start_min: 15 * 60, length_min: 45 })).toBe(null);
    expect(blocksBetween(db, TODAY, TODAY)[0]).toMatchObject({ start_min: 15 * 60, length_min: 45, moved: true, skipped: false });
    clearDayChange(db, a.id, TODAY);
    expect(times(db, TODAY)).toEqual(['17', '19']);
    expect(setDayChange(db, a.id, '2026-10-20', { skip: true })).toMatch(/not on that day/); // a Tuesday
  });
  it("a coming day's change stays when the routine is edited", () => {
    const db = openDb(':memory:');
    const { id } = saveRoutineSet(db, { name: 'R', slots: [slot({ days: [3] })] }, LAST_WED);
    setDayChange(db, blocksBetween(db, NEXT_WED, NEXT_WED)[0].id, NEXT_WED, { skip: true });
    const slots = routineSets(db, TODAY)[0].slots;
    saveRoutineSet(db, { id, name: 'R', slots: [{ ...slots[0], length_min: 90 }] }, TODAY);
    expect(blocksBetween(db, NEXT_WED, NEXT_WED)[0]).toMatchObject({ skipped: true, length_min: 90 });
  });
  it('copy this day to other days, and nothing is saved when anything clashes', () => {
    const db = openDb(':memory:');
    const { id } = saveRoutineSet(db, { name: 'R', slots: [slot({ days: [1] }), slot({ days: [2], start_min: 17 * 60 + 30 })] }, TODAY);
    const slots = routineSets(db, TODAY)[0].slots;
    const clash = saveRoutineSet(db, { id, name: 'R', slots: copyDay(slots, 1, [2, 4]) }, TODAY);
    expect(clash.problems).toEqual(['Tuesday: It overlaps the block at 17:00–18:00.']); // the copied block, met first
    expect(routineSets(db, TODAY)[0].slots.map((s) => s.days)).toEqual([[1], [2]]); // unchanged
    expect(saveRoutineSet(db, { id, name: 'R', slots: copyDay(slots, 1, [4, 5]) }, TODAY).problems).toEqual([]);
    expect(routineSets(db, TODAY)[0].slots.map((s) => s.days)).toEqual([[1, 4, 5], [2]]);
    expect(saveRoutineSet(db, { name: 'New', slots: [slot({ days: [] })] }, TODAY).problems).toEqual(['Time slot 1: pick at least one day.']);
    expect(routineSets(db, TODAY).map((s) => s.name)).toEqual(['R']); // the new routine was not made
    expect(saveRoutineSet(db, { name: ' r ', slots: [] }, TODAY).problems).toEqual(['A routine with that name already exists.']);
  });
  it('export and import keep routines; a schema-6 file gets "My routine"; deleting a routine', () => {
    const db = openDb(':memory:');
    const { id } = saveRoutineSet(db, { name: 'R', slots: [slot({ days: [3] })] }, LAST_WED);
    setDayChange(db, blocksBetween(db, TODAY, TODAY)[0].id, TODAY, { skip: true });
    const again = openDb(':memory:');
    importAll(again, exportAll(db));
    expect(blocksBetween(again, LAST_WED, NEXT_WED)).toEqual(blocksBetween(db, LAST_WED, NEXT_WED));
    const old = openDb(':memory:');
    importAll(old, { app: 'desk-watch', schema: 6, tables: { routines: [{ id: 5, day: 3, start_min: 600, length_min: 30, task_id: null, camera_mode: 1, screen_mode: 0, block_set_id: null }] } });
    expect(routineSets(old, TODAY)).toMatchObject([{ name: 'My routine', active: true, slots: [{ days: [3], start_min: 600 }] }]);
    deleteRoutineSet(db, id!, TODAY);
    expect([routineSets(db, TODAY), times(db, TODAY), times(db, LAST_WED)]).toEqual([[], [], []]);
  });
});
