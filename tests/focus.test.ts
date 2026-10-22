import { describe, expect, it } from 'vitest';
import { afterPomodoro, breakAfter, clockMs, dots, plannedFor, timerMode } from '../src/state/focus';
import { noiseSamples } from '../src/session/noise';

const cfg = { timerMode: 'pomodoro', pomoMin: 25, shortBreakMin: 5, longBreakMin: 15, longEvery: 4, pomoCount: 4, countdownMin: 40, countupMaxMin: 120 };

describe('pomodoro cycle maths', () => {
  it('short breaks, and a long one after every 4th pomodoro', () => {
    expect([1, 2, 3, 4, 5, 8].map((n) => breakAfter(n, cfg))).toEqual([
      { kind: 'short', min: 5 }, { kind: 'short', min: 5 }, { kind: 'short', min: 5 }, { kind: 'long', min: 15 },
      { kind: 'short', min: 5 }, { kind: 'long', min: 15 }]);
    expect(breakAfter(2, { ...cfg, longEvery: 2 }).kind).toBe('long');
    expect(breakAfter(1, { ...cfg, longEvery: 0 }).kind).toBe('long'); // a broken value acts like "every time"
  });
  it('each timer mode sets the session goal', () => {
    expect(plannedFor(cfg)).toBe(25);
    expect(plannedFor({ ...cfg, timerMode: 'countdown' })).toBe(40);
    expect(plannedFor({ ...cfg, timerMode: 'countup' })).toBe(120);
    expect(timerMode('nonsense')).toBe('pomodoro');
  });
  it('the clock counts down, or up for the stopwatch', () => {
    expect(clockMs('pomodoro', 10 * 60_000, 25 * 60_000)).toBe(15 * 60_000);
    expect(clockMs('countdown', 50 * 60_000, 40 * 60_000)).toBe(0);
    expect(clockMs('countup', 10 * 60_000, 120 * 60_000)).toBe(10 * 60_000);
  });
  it('dots: the task estimate when there is one, otherwise the place in the run', () => {
    expect(dots(cfg, 0, { done: 2, est: 4 })).toMatchObject({ done: 2, of: 4, label: '2 of 4 pomodoros' });
    expect(dots(cfg, 0, null)).toMatchObject({ done: 0, of: 4, label: 'pomodoro 1 of 4' });
    expect(dots(cfg, 1, { done: 3, est: null })).toMatchObject({ done: 1, of: 4, label: 'pomodoro 2 of 4' });
    expect(dots({ pomoCount: 6 }, 2, null)).toMatchObject({ done: 2, of: 6, label: 'pomodoro 3 of 6' });
    expect(dots(cfg, 4, null)).toMatchObject({ done: 4, of: 4, label: 'pomodoro 4 of 4' }); // the run is over
  });
  it('a run ends after its number of pomodoros; long break after every 4th, unchanged (owner, 2026-10-21)', () => {
    const run = (count: number) => Array.from({ length: count }, (_, i) => afterPomodoro(i + 1, { ...cfg, pomoCount: count })?.kind ?? 'end');
    expect(run(4)).toEqual(['short', 'short', 'short', 'end']); // 4: no long break
    expect(run(2)).toEqual(['short', 'end']);
    expect(run(1)).toEqual(['end']);
    expect(run(8)).toEqual(['short', 'short', 'short', 'long', 'short', 'short', 'short', 'end']); // one long break, after 4
    expect(run(5)).toEqual(['short', 'short', 'short', 'long', 'end']);
    expect(afterPomodoro(1, { ...cfg, pomoCount: 0 })).toBeNull(); // a broken value acts like 1
  });
});

describe('noise', () => {
  let seed = 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const roughness = (x: Float32Array) => x.slice(1).reduce((a, v, i) => a + Math.abs(v - x[i]), 0) / (x.length - 1);
  it('stays in range, and brown is smoother than pink, pink smoother than white', () => {
    const [w, p, b] = (['white', 'pink', 'brown'] as const).map((k) => noiseSamples(k, 48_000, rand));
    for (const x of [w, p, b]) expect(Math.max(...x.map(Math.abs))).toBeCloseTo(0.9, 5);
    expect(roughness(b)).toBeLessThan(roughness(p));
    expect(roughness(p)).toBeLessThan(roughness(w));
  });
  it('brown noise loops without a jump', () => {
    const b = noiseSamples('brown', 48_000, rand);
    expect(Math.abs(b[b.length - 1] - b[0])).toBeLessThan(0.01);
  });
});
