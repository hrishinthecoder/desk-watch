import { describe, expect, it } from 'vitest';
import { pomodoros, statsBy } from '../src/session/accounting';

const M = 60_000;
// Five sessions: two for "Ch 3" (Physics), one for "Worksheet" (Maths), one without a task, one whose task was deleted.
const seg = (session_id: number, activity: string, start: number, min: number) => ({ session_id, activity, start, end: start + min * M });
const data = {
  sessions: [{ id: 1, task_id: 1 }, { id: 2, task_id: 2 }, { id: 3, task_id: 1 }, { id: 4, task_id: null }, { id: 5, task_id: 9 }],
  segments: [
    seg(1, 'READING', 0, 30), seg(1, 'PHONE', 30 * M, 2), // 30 min focused, 1 phone pickup
    seg(2, 'WRITING', 100 * M, 50),
    seg(3, 'READING', 200 * M, 25),
    seg(4, 'IDLE', 300 * M, 10),
    seg(5, 'READING', 400 * M, 5),
  ],
  events: [{ session_id: 2, type: 'blocked_attempt', at: 110 * M, detail: 'site:youtube.com' }],
};
const tasks = [
  { id: 1, title: 'Ch 3', subject_id: 1, subject: 'Physics' },
  { id: 2, title: 'Worksheet', subject_id: 2, subject: 'Maths' },
];
const rows = (by: 'task' | 'subject') => statsBy(data, tasks, by, 25).map((r) => [r.name, r.none, Math.round(r.focusedSec / 60), r.pomodoros, r.sessions, r.distractions]);

describe('stats per task and per subject (G1)', () => {
  it('by task: focused minutes, pomodoros, sessions and distractions; no task (or a deleted one) last', () => {
    expect(rows('task')).toEqual([
      ['Ch 3', false, 55, 2, 2, 1],      // 30 + 25 min, 1 phone pickup
      ['Worksheet', false, 50, 2, 1, 1], // 1 blocked site
      ['', true, 15, 0, 2, 0],           // the session without a task and the deleted task's one
    ]);
  });
  it('by subject: the same sessions grouped by their task\'s subject', () => {
    expect(rows('subject')).toEqual([['Physics', false, 55, 2, 2, 1], ['Maths', false, 50, 2, 1, 1], ['', true, 15, 0, 2, 0]]);
  });
  it('pomodoros use the current length; nothing in, nothing out', () => {
    expect(statsBy(data, tasks, 'task', 50).map((r) => r.pomodoros)).toEqual([1, 1, 0]);
    expect(statsBy({ sessions: [], segments: [], events: [] }, tasks, 'subject', 25)).toEqual([]);
    expect([pomodoros(24 * 60, 25), pomodoros(25 * 60, 25), pomodoros(100 * 60, 0)]).toEqual([0, 1, 100]); // a broken length acts like 1
  });
});
