// Focus mode (Stage E4 Part 2): a full-screen view of the normal Desk Watch session. Pure timer maths, unit-tested in
// tests/focus.test.ts. Labels are English (tk) and shown with t(). Every timer mode counts camera-checked focused time, like every session; only the display and
// what happens at the end differ.
import { t, tk } from '../../electron/i18n';
export type TimerMode = 'pomodoro' | 'countdown' | 'countup';
export const TIMER_MODES: [TimerMode, string, string][] = [
  ['pomodoro', tk('Pomodoro'), tk('Work, then a short break; a long break after a few')],
  ['countdown', tk('Countdown'), tk('Any length, counts down')],
  ['countup', tk('Count-up'), tk('A stopwatch, up to a limit')],
];
export type TimerCfg = { timerMode: string; pomoMin: number; shortBreakMin: number; longBreakMin: number; longEvery: number; pomoCount: number; countdownMin: number; countupMaxMin: number };
export const timerMode = (s: string): TimerMode => (TIMER_MODES.some(([m]) => m === s) ? (s as TimerMode) : 'pomodoro');

// The session's goal in minutes for a timer mode (count-up: its upper limit).
export const plannedFor = (c: TimerCfg) => ({ pomodoro: c.pomoMin, countdown: c.countdownMin, countup: c.countupMaxMin })[timerMode(c.timerMode)];

// What the big clock shows: time left, or (count-up) the time so far.
export const clockMs = (mode: TimerMode, focusedMs: number, goalMs: number) => (mode === 'countup' ? focusedMs : Math.max(0, goalMs - focusedMs));

// After the n-th pomodoro of a run (n ≥ 1): a long break after every `longEvery`, a short one otherwise.
export const breakAfter = (n: number, c: Pick<TimerCfg, 'longEvery' | 'shortBreakMin' | 'longBreakMin'>) =>
  n > 0 && n % Math.max(1, c.longEvery) === 0 ? { kind: 'long' as const, min: c.longBreakMin } : { kind: 'short' as const, min: c.shortBreakMin };

// The dots under the clock: with an estimate, the task's pomodoros done of its estimate; otherwise where you are in
// the run (the pomodoro in progress counts as the next one).
export function dots(c: Pick<TimerCfg, 'pomoCount'>, doneInRun: number, task: { done: number; est: number | null } | null) {
  if (task && task.est) return { done: task.done, of: task.est, label: t('{done} of {est} pomodoros', { done: task.done, est: task.est }) };
  const every = Math.max(1, c.pomoCount);
  return { done: Math.min(doneInRun, every), of: every, label: t('pomodoro {k} of {every}', { k: Math.min(doneInRun + 1, every), every }) };
}

// After the n-th pomodoro of a run: null when the run is over (its number of pomodoros is done), otherwise its break.
// Owner, 2026-10-21: a run of 4 or fewer ends with no long break; a run of 8 has one long break, after pomodoro 4.
export const afterPomodoro = (n: number, c: Pick<TimerCfg, 'pomoCount' | 'longEvery' | 'shortBreakMin' | 'longBreakMin'>) =>
  n >= Math.max(1, c.pomoCount) ? null : breakAfter(n, c);

// Hold Esc this long to leave (Esc alone does nothing).
export const HOLD_ESC_MS = 2000;

export type Background = 'black' | 'grey' | 'green' | 'blue';
export const BACKGROUNDS: [Background, string, string][] = [
  ['black', tk('Black'), '#000000'], ['grey', tk('Dark grey'), '#1f201f'], ['green', tk('Deep green'), '#0e2a20'], ['blue', tk('Deep blue'), '#0e1b30'],
];
export const backgroundColor = (b: string) => (BACKGROUNDS.find(([k]) => k === b) ?? BACKGROUNDS[0])[2];
