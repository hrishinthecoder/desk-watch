import { describe, expect, it } from 'vitest';
import { pickupsLine, validWeekStart, weekDays, weeklyReview, weekStartOf, type Segment } from '../src/session/accounting';

const at = (d: number, h = 10, m = 0) => new Date(2026, 9, d, h, m).getTime(); // October 2026; the 14th is a Wednesday
const seg = (activity: string, start: number, min: number): Segment => ({ activity, start, end: start + min * 60_000 });

describe('week start', () => {
  it('Monday, Sunday and Saturday weeks around Wednesday 14 October', () => {
    expect(weekStartOf(at(14, 15), 1)).toBe(at(12, 0)); // Monday 12th
    expect(weekStartOf(at(14, 15), 0)).toBe(at(11, 0)); // Sunday 11th
    expect(weekStartOf(at(14, 15), 6)).toBe(at(10, 0)); // Saturday 10th
    expect(weekStartOf(at(12, 0), 1)).toBe(at(12, 0));  // the first moment of the week belongs to it
    expect(weekStartOf(at(11, 23, 59), 1)).toBe(at(5, 0));
  });
  it('every one of the 7 days can start the week (2026-10-21): the week of Wednesday 14 October', () => {
    // Sunday 11th … Saturday 17th: the week starts on the latest such weekday on or before the 14th.
    const starts = [0, 1, 2, 3, 4, 5, 6].map((k) => new Date(weekStartOf(at(14, 15), k)).getDate());
    expect(starts).toEqual([11, 12, 13, 14, 8, 9, 10]); // Sun 11, Mon 12, Tue 13, Wed 14 (today), Thu 8, Fri 9, Sat 10
    for (let k = 0; k <= 6; k++) {
      expect(weekDays(k)[0]).toBe(k);
      expect([...weekDays(k)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(new Date(weekStartOf(at(14, 15), k)).getDay()).toBe(k);
    }
  });
  it('days in order; only a damaged setting falls back to Monday', () => {
    expect(weekDays(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekDays(6)).toEqual([6, 0, 1, 2, 3, 4, 5]);
    expect(weekDays(3)).toEqual([3, 4, 5, 6, 0, 1, 2]);
    expect(validWeekStart(3)).toBe(3);
    expect([7, -1, 2.5, NaN].map(validWeekStart)).toEqual([1, 1, 1, 1]);
  });
});

describe('weekly review', () => {
  const segments = [
    // last week (Monday 5th – Sunday 11th): 3 pickups
    seg('READING', at(6), 30), seg('PHONE', at(6, 11), 2), seg('READING', at(7), 20), seg('PHONE', at(7, 11), 1), seg('PHONE', at(9, 11), 1),
    // this week: Monday 12th 40 min, Tuesday 13th 70 min (best), Wednesday 14th 10 min; 1 pickup, 2 looking down
    seg('WRITING', at(12), 40), seg('PHONE', at(12, 11), 3),
    seg('READING', at(13), 70), seg('DOWN', at(13, 12), 1), seg('READING', at(13, 12, 1), 5), seg('DOWN', at(13, 13), 1),
    seg('READING', at(14), 10),
  ];
  const events = [
    { type: 'blocked_attempt', detail: 'site:youtube.com', at: at(13, 9) },
    { type: 'blocked_attempt', detail: 'site:youtube.com', at: at(8, 9) }, // last week: not counted
  ];
  const r = weeklyReview(segments, events, at(14, 18), 1);

  it('best day, top distraction, pickups against last week', () => {
    expect(r.start).toBe(at(12, 0));
    expect(r.bestDay).toEqual({ day: at(13, 0), sec: 75 * 60 });
    expect(r.top).toEqual({ name: 'looking down', n: 2 });
    expect(r.pickups).toBe(1);
    expect(r.lastPickups).toBe(3);
    expect(r.events).toHaveLength(1);
  });
  it('a Saturday week moves the boundary', () => {
    const s = weeklyReview(segments, events, at(14, 18), 6); // Saturday 10th – Friday 16th
    expect(s.start).toBe(at(10, 0));
    expect(s.lastPickups).toBe(3); // Saturday 3rd – Friday 9th
  });
  it('an empty week', () => {
    const e = weeklyReview(segments, [], at(21, 9), 1); // Wednesday 21st: nothing yet this week
    expect(e.bestDay).toBeNull();
    expect(e.top).toBeUndefined();
    expect(e.pickups).toBe(0);
    expect(e.lastPickups).toBe(1);
  });
  it('pickups in plain words', () => {
    expect(pickupsLine(12, 17)).toBe('12 this week, 5 fewer than last week.');
    expect(pickupsLine(4, 1)).toBe('4 this week, 3 more than last week.');
    expect(pickupsLine(2, 2)).toBe('2 this week, the same as last week.');
    expect(pickupsLine(0, 0)).toBe('No phone pickups this week or last week.');
  });
});
