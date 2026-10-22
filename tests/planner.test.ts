import { describe, expect, it } from 'vitest';
import { dueToday, hhmm, isOverdue, moveStatus, nextToday, routineProblem, sortTasks, startedBetween, type Routine, type Task } from '../electron/planner';

const task = (id: number, x: Partial<Task> = {}): Task =>
  ({ id, subject_id: null, subject: '', title: `t${id}`, notes: '', subtasks: [], due: null, due_min: null, repeat: 'none', priority: 2,
     est_min: null, status: 'todo', created_at: id, done_at: null, sort: id, focused_sec: 0, ...x });
const block = (id: number, day: number, start: string, length: number): Routine => {
  const [h, m] = start.split(':').map(Number);
  return { id, day, start_min: h * 60 + m, length_min: length, task_id: null, camera_mode: 1, screen_mode: 0, block_set_id: null };
};
// Saturday 10 October 2026, local time
const at = (h: number, m: number, s = 0) => new Date(2026, 9, 10, h, m, s);

describe('routine time maths', () => {
  it('formats minutes as a clock time', () => {
    expect(hhmm(0)).toBe('00:00');
    expect(hhmm(17 * 60 + 5)).toBe('17:05');
  });
  it('refuses overlaps on the same day, allows touching blocks and other days', () => {
    const week = [block(1, 1, '17:00', 60)];
    expect(routineProblem(block(2, 1, '17:30', 60), week)).toMatch(/overlaps the block at 17:00–18:00/);
    expect(routineProblem(block(2, 1, '16:30', 31), week)).toMatch(/overlaps/);
    expect(routineProblem(block(2, 1, '18:00', 60), week)).toBe(null);
    expect(routineProblem(block(2, 1, '16:00', 60), week)).toBe(null);
    expect(routineProblem(block(2, 2, '17:30', 60), week)).toBe(null);
    expect(routineProblem({ ...block(1, 1, '17:15', 30) }, week)).toBe(null); // editing itself is not a clash
  });
  it('a block stays inside one day and has a sensible length', () => {
    expect(routineProblem(block(1, 1, '23:30', 60), [])).toMatch(/midnight/);
    expect(routineProblem(block(1, 1, '23:00', 60), [])).toBe(null);
    expect(routineProblem(block(1, 1, '10:00', 2), [])).toMatch(/5 to 600/);
    expect(routineProblem(block(1, 7, '10:00', 30), [])).toMatch(/day/);
  });
  it('next block today: the first one that has not started', () => {
    const week = [block(1, 6, '09:00', 60), block(2, 6, '17:00', 60), block(3, 6, '14:00', 30), block(4, 0, '15:00', 30)];
    expect(nextToday(week, at(13, 0))?.id).toBe(3);
    expect(nextToday(week, at(14, 0))?.id).toBe(3); // starting this minute still counts as next
    expect(nextToday(week, at(18, 0))).toBe(null);
  });
  it('reminders: a block that started since the last check, once; not if the PC slept through it', () => {
    const week = [block(1, 6, '17:00', 60)];
    expect(startedBetween(week, at(16, 59, 50).getTime(), at(17, 0, 5).getTime()).map((r) => r.id)).toEqual([1]);
    expect(startedBetween(week, at(17, 0, 5).getTime(), at(17, 0, 20).getTime())).toEqual([]); // already reminded
    expect(startedBetween(week, at(16, 0).getTime(), at(17, 30).getTime())).toEqual([]);         // 30 min late: skip
    expect(startedBetween([block(2, 0, '00:00', 30)], at(23, 59, 50).getTime(), new Date(2026, 9, 11, 0, 0, 5).getTime()).map((r) => r.id)).toEqual([2]); // over midnight
  });
});

describe('tasks', () => {
  it('board order: open first, then the hand-made order', () => {
    const l = sortTasks([task(1, { status: 'done', sort: 0 }), task(2, { sort: 9 }), task(3, { sort: 4 }), task(4, { sort: 4 })]);
    expect(l.map((t) => t.id)).toEqual([3, 4, 2, 1]);
  });
  it('overdue and due today ignore done tasks', () => {
    expect(isOverdue(task(1, { due: '2026-10-09' }), '2026-10-10')).toBe(true);
    expect(isOverdue(task(1, { due: '2026-10-10' }), '2026-10-10')).toBe(false);
    expect(isOverdue(task(1, { due: '2026-10-09', status: 'done' }), '2026-10-10')).toBe(false);
    expect(dueToday([task(1, { due: '2026-10-10' }), task(2, { due: '2026-10-10', status: 'done' }), task(3, { due: '2026-10-11' })], '2026-10-10')).toBe(1);
  });
  it('board buttons move one column and stop at the edges', () => {
    expect(moveStatus('todo', 1)).toBe('doing');
    expect(moveStatus('doing', 1)).toBe('done');
    expect(moveStatus('done', 1)).toBe('done');
    expect(moveStatus('todo', -1)).toBe('todo');
  });
});

describe('checking what the page sends', () => {
  it('tasks: title required, dates and numbers checked, the rest defaulted', async () => {
    const { cleanTask } = await import('../electron/planner');
    expect(cleanTask({ title: '  ' })).toBe('Give the task a title.');
    expect(cleanTask({ title: 'x', due: '12/10/2026' })).toMatch(/date/);
    expect(cleanTask({ title: 'x', est_min: 99999 })).toMatch(/1 to 9999/);
    expect(cleanTask({ title: 'x', due_min: 2000 })).toMatch(/time/);
    expect(cleanTask({ title: ' Essay ', subject_id: 'x', due: '', priority: 9, status: 'hacked', est_min: '', repeat: 'yearly',
      notes: 5, subtasks: [{ title: ' Plan ', done: 'yes' }, { title: '' }, 'junk'] }))
      .toEqual({ title: 'Essay', subject_id: null, due: null, due_min: null, priority: 2, status: 'todo', est_min: null, repeat: 'none',
        notes: '', subtasks: [{ title: 'Plan', done: false }] });
    expect(cleanTask({ id: 4, title: 'x', status: 'done', priority: 1, est_min: 3, repeat: 'weekdays', subject_id: 2, due_min: 600 }))
      .toMatchObject({ id: 4, status: 'done', priority: 1, est_min: 3, repeat: 'weekdays', subject_id: 2, due_min: 600 });
  });
  it('routines: bad numbers become values the overlap check refuses', async () => {
    const { cleanRoutine, routineProblem } = await import('../electron/planner');
    const r = cleanRoutine({ day: '1', start_min: 600.5, length_min: 60, camera_mode: true, block_set_id: 'x' });
    expect(r).toMatchObject({ day: -1, start_min: -1, camera_mode: 1, screen_mode: 0, block_set_id: null });
    expect(routineProblem(r, [])).toBeTruthy();
  });
});
