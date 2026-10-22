import { describe, expect, it } from 'vitest';
import type { Routine, Task } from '../electron/planner';
import { dayItems, estimateLine, goalLine, hourRange } from '../src/state/day';

const task = (id: number, x: Partial<Task> = {}): Task => ({
  id, subject_id: null, subject: '', title: `t${id}`, notes: '', subtasks: [], due: null, due_min: null, repeat: 'none',
  priority: 2, est_min: null, status: 'todo', created_at: id, done_at: null, sort: id, focused_sec: 0, ...x,
});
const block = (id: number, day: number, start: number, len: number, task_id: number | null = null): Routine =>
  ({ id, day, start_min: start, length_min: len, task_id, camera_mode: 1, screen_mode: 0, block_set_id: null });
const at = (h: number, m = 0) => new Date(2026, 9, 15, h, m).getTime(); // Thursday 15 October 2026

describe('day view', () => {
  const tasks = [task(1, { title: 'Essay', due: '2026-10-15', due_min: 18 * 60, est_min: 50 }), task(2, { due: '2026-10-15' }), task(3, { title: 'Lab', due: '2026-10-15', due_min: 9 * 60 })];
  const routines = [block(1, 4, 17 * 60, 60, 1), block(2, 5, 9 * 60, 60)]; // Thursday, Friday
  const sessions = [
    { started_at: at(10), ended_at: at(10, 50), focused_sec: 2700, task_id: 1, planned_min: 50 },
    { started_at: at(23, 50), ended_at: null, focused_sec: null, task_id: null, planned_min: 25 },
    { started_at: at(10) - 86_400_000, ended_at: at(11) - 86_400_000, focused_sec: 600, planned_min: 25 }, // yesterday
  ];
  const { scheduled, done } = dayItems('2026-10-15', routines, tasks, sessions, 25, at(23, 55));
  it("scheduled: that weekday's blocks and the tasks due that day at a time, in time order", () => {
    expect(scheduled.map((i) => [i.kind, i.title, i.start, i.end])).toEqual([
      ['task', 'Lab', 540, 570], ['block', 'Essay', 1020, 1080], ['task', 'Essay', 1080, 1130]]);
    expect(scheduled[0].sub).toBe('09:00 · task');
    expect(scheduled[2].sub).toBe('18:00 · 2 pomodoros · 50 min');
  });
  it('done: that day\'s sessions with focused minutes and task; a running one so far', () => {
    expect(done.map((i) => [i.title, i.start, i.end, i.sub])).toEqual([
      ['Essay', 600, 650, '10:00–10:50 · 45 min focused'], ['Study session', 1430, 1435, '23:50–23:55 · running']]);
    expect(done[0].startedAt).toBe(at(10));
  });
  it('the time line covers 6:00–22:00, wider when needed', () => {
    expect(hourRange([])).toEqual([6, 22]);
    expect(hourRange([...scheduled, ...done])).toEqual([6, 24]);
    expect(hourRange([{ id: 'x', kind: 'task', start: 5 * 60 + 30, end: 6 * 60, title: '', sub: '' }])).toEqual([5, 22]);
  });
});

describe('goals', () => {
  it('daily goal: pomodoros of focused time today, "3 of 8"', () => {
    expect(goalLine(80 * 60, 25, 8)).toBe('3 of 8');
    expect(goalLine(0, 25, 8)).toBe('0 of 8');
  });
  it('on completing: "Estimated 4 pomodoros (1 h 40 min), took 6." only with an estimate (stored in minutes)', () => {
    expect(estimateLine(100, 150 * 60, 25)).toBe('Estimated 4 pomodoros (1 h 40 min), took 6.');
    expect(estimateLine(25, 10 * 60, 25)).toBe('Estimated 1 pomodoro (25 min), took 0.');
    expect(estimateLine(100, 150 * 60, 50)).toBe('Estimated 2 pomodoros (1 h 40 min), took 3.'); // length changed later
    expect(estimateLine(null, 999, 25)).toBe('');
  });
});
