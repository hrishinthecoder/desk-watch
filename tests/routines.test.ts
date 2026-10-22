import { describe, expect, it } from 'vitest';
import { activeOn, blocksBetween, blocksOn, copyDay, currentSlots, dayChangeProblem, planSave, type BlockRow, type Slot } from '../electron/routines';

// October 2026: the 14th and 21st are Wednesdays (day 3); the 19th is a Monday (day 1).
const row = (id: number, x: Partial<BlockRow>): BlockRow => ({ id, day: 1, start_min: 17 * 60, length_min: 60, task_id: null, camera_mode: 1, screen_mode: 0,
  block_set_id: null, set_id: 1, slot: id, subject_id: null, valid_from: null, valid_to: null, ...x });
const slot = (x: Partial<Slot>): Slot => ({ days: [1], start_min: 17 * 60, length_min: 60, task_id: null, subject_id: null, camera_mode: 1, screen_mode: 0, block_set_id: null, ...x });

describe('routines (G3)', () => {
  it('only one routine is on at a time; the last switch on or before a day decides it', () => {
    const log = [{ from_date: '0000-01-01', set_id: 1 }, { from_date: '2026-10-20', set_id: 2 }, { from_date: '2026-10-25', set_id: null }];
    expect(['2026-10-01', '2026-10-19', '2026-10-20', '2026-10-24', '2026-10-25'].map((d) => activeOn(log, d))).toEqual([1, 1, 2, 2, null]);
    expect(activeOn([], '2026-10-20')).toBe(null);
  });
  it("a date's blocks: the routine on that day, its rows valid that day, that weekday, in time order", () => {
    const rows = [row(1, { day: 3, start_min: 18 * 60 }), row(2, { day: 3, start_min: 9 * 60 }), row(3, { day: 1 }), row(4, { day: 3, set_id: 2 }),
      row(5, { day: 3, valid_to: '2026-10-20' }), row(6, { day: 3, valid_from: '2026-10-22' })];
    const log = [{ from_date: '0000-01-01', set_id: 1 }];
    expect(blocksOn('2026-10-21', rows, [], log).map((b) => b.id)).toEqual([2, 1]); // not Monday's, not routine 2's, not ended or later rows
    expect(blocksOn('2026-10-14', rows, [], log).map((b) => b.id)).toEqual([2, 5, 1]); // last week row 5 was still valid
    expect(blocksBetween('2026-10-19', '2026-10-21', rows, [], log).map((b) => [b.date, b.id])).toEqual([['2026-10-19', 3], ['2026-10-21', 2], ['2026-10-21', 1]]);
  });
  it('one day can be skipped or moved; other days are untouched', () => {
    const rows = [row(1, { day: 3 })];
    const log = [{ from_date: '0000-01-01', set_id: 1 }];
    const changes = [{ routine_id: 1, date: '2026-10-21', skip: 1, start_min: null, length_min: null },
      { routine_id: 1, date: '2026-10-28', skip: 0, start_min: 19 * 60, length_min: 30 }];
    expect(blocksOn('2026-10-21', rows, changes, log)[0]).toMatchObject({ skipped: true, start_min: 17 * 60 });
    expect(blocksOn('2026-10-28', rows, changes, log)[0]).toMatchObject({ skipped: false, moved: true, start_min: 19 * 60, length_min: 30 });
    expect(blocksOn('2026-11-04', rows, changes, log)[0]).toMatchObject({ skipped: false, moved: false, start_min: 17 * 60, length_min: 60 });
  });
  it('the editor shows one slot per group of rows, with its days', () => {
    const rows = [row(1, { day: 1, slot: 7 }), row(2, { day: 3, slot: 7 }), row(3, { day: 5, slot: 8, start_min: 600 }), row(4, { day: 2, slot: 9, valid_to: '2026-10-01' })];
    expect(currentSlots(rows, 1, '2026-10-21').map((s) => [s.slot, s.days, s.start_min])).toEqual([[8, [5], 600], [7, [1, 3], 1020]]);
  });
  it('copy this day to other days: every slot of that day also happens on them', () => {
    const slots = [slot({ days: [1, 3] }), slot({ days: [2], start_min: 600 })];
    expect(copyDay(slots, 1, [4, 5, 3]).map((s) => s.days)).toEqual([[1, 3, 4, 5], [2]]);
  });
  it('saving changes today and later only: old rows end yesterday, rows made today are replaced', () => {
    const rows = [row(1, { valid_from: null }), row(2, { valid_from: '2026-10-21' }), row(3, { valid_to: '2026-10-01' }), row(4, { set_id: 2 })];
    const plan = planSave(rows, 1, [slot({ days: [1, 3] })], '2026-10-21');
    expect(plan).toMatchObject({ problems: [], end: [1], del: [2] });
    expect(plan.add.map((r) => [r.day, r.valid_from, r.valid_to, r.set_id, r.slotIndex])).toEqual([[1, '2026-10-21', null, 1, 0], [3, '2026-10-21', null, 1, 0]]);
  });
  it('nothing is saved when slots clash or a slot has no day; every problem is named', () => {
    const plan = planSave([], 1, [slot({ days: [1, 3] }), slot({ days: [3], start_min: 17 * 60 + 30 }), slot({ days: [] }), slot({ days: [2], start_min: 23 * 60 + 30 })], '2026-10-21');
    expect(plan.problems).toEqual(['Time slot 3: pick at least one day.', 'Wednesday: It overlaps the block at 17:00–18:00.', 'Tuesday: A block must end by midnight.']);
  });
  it("a day's move must fit that day", () => {
    const rows = [row(1, { day: 3 }), row(2, { day: 3, start_min: 19 * 60 })];
    const day = blocksOn('2026-10-21', rows, [], [{ from_date: '0000-01-01', set_id: 1 }]);
    expect(dayChangeProblem(day[0], 18 * 60 + 30, 60, day)).toMatch(/overlaps the block at 19:00/);
    expect(dayChangeProblem(day[0], 16 * 60, 60, day)).toBe(null);
    expect(dayChangeProblem(day[0], 18 * 60 + 30, 60, [day[0], { ...day[1], skipped: true }])).toBe(null); // a skipped block is free
  });
});
