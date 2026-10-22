// Owner's fixes of 2026-10-23: progress always with its unit and "over" shown plainly; pomodoro counts never above 12.
import { describe, expect, it } from 'vitest';
import { MAX_POMOS, parseQuick, progressOf } from '../src/state/todo';
import { DEFAULTS, fromOwn } from '../src/state/config';

describe('progress of a task', () => {
  it('says minutes, with the unit', () => {
    expect(progressOf(40 * 60, 75)).toEqual({ text: '40 of 75 min', over: 0, frac: 40 / 75 });
  });
  it('going over is said plainly and flagged', () => {
    const p = progressOf(171 * 60, 75)!;
    expect(p.text).toBe('171 of 75 min · +96 min over');
    expect(p.over).toBe(96);
    expect(p.frac).toBe(1);
  });
  it('no estimate: only the minutes focused, or nothing', () => {
    expect(progressOf(30 * 60, null)?.text).toBe('30 min focused');
    expect(progressOf(20, null)).toBeNull();
  });
});

describe('pomodoro counts are capped at 12', () => {
  it('saved values above 12 are brought down when loaded; below 1 up to 1', () => {
    expect(fromOwn({ pomoCount: 100, longEvery: 40 })).toMatchObject({ pomoCount: 12, longEvery: 12 });
    expect(fromOwn({ pomoCount: 0 }).pomoCount).toBe(1);
    expect(fromOwn({}).pomoCount).toBe(DEFAULTS.pomoCount);
  });
  it('a quick-add estimate (~N) is at most 12', () => {
    expect(parseQuick('Essay ~99', '2026-10-15', []).pomos).toBe(MAX_POMOS);
    expect(parseQuick('Essay ~3', '2026-10-15', []).pomos).toBe(3);
  });
});
