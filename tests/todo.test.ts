import { describe, expect, it } from 'vitest';
import { moved, nextDue, reorder, type Task } from '../electron/planner';
import { days, estMinutes, estPomos, estText, inList, listDefaults, listTasks, minutesLeft, parseQuick, pomosDone, search } from '../src/state/todo';

const task = (id: number, x: Partial<Task> = {}): Task => ({
  id, subject_id: null, subject: '', title: `t${id}`, notes: '', subtasks: [], due: null, due_min: null, repeat: 'none',
  priority: 2, est_min: null, status: 'todo', created_at: id, done_at: null, sort: id, focused_sec: 0, ...x,
});
// Thursday 15 October 2026, local time; the week starts on Monday 12 October.
const NOW = new Date(2026, 9, 15, 10, 0);
const D = days(NOW, 1);
const subjects = [{ name: 'Physics' }, { name: 'English' }];

describe('quick-add parser', () => {
  it('reads every shortcut and leaves the title', () => {
    const p = parseQuick('Essay draft #english friday !1 ~3', D.today, subjects);
    expect(p).toMatchObject({ title: 'Essay draft', subject: 'English', newSubject: false, due: '2026-10-16', priority: 1, pomos: 3 });
    expect(p.chips.map((c) => c.label)).toEqual(['#English', 'Due Fri 16 Oct', 'High priority', '3 pomodoros']);
  });
  it('today, tomorrow and a weekday: the coming one, today included', () => {
    expect(parseQuick('x today', D.today, []).due).toBe('2026-10-15');
    expect(parseQuick('x tomorrow', D.today, []).due).toBe('2026-10-16');
    expect(parseQuick('x thu', D.today, []).due).toBe('2026-10-15'); // today is Thursday
    expect(parseQuick('x Wednesday', D.today, []).due).toBe('2026-10-21');
    expect(parseQuick('x mon', D.today, []).due).toBe('2026-10-19');
  });
  it('a new subject is marked new; words inside other words are not shortcuts', () => {
    expect(parseQuick('Lab #Chemistry', D.today, subjects)).toMatchObject({ subject: 'Chemistry', newSubject: true, title: 'Lab' });
    expect(parseQuick("today's homework ~ !4 ~0 #", D.today, subjects)).toMatchObject({ title: "today's homework ~ !4 ~0 #", due: null, priority: null, pomos: null });
  });
  it('a repeated shortcut: the last one wins, the earlier one stays in the title', () => {
    expect(parseQuick('Read today tomorrow', D.today, [])).toMatchObject({ title: 'Read today', due: '2026-10-16' });
  });
  it('a chip removed with × keeps its word as text', () => {
    const p = parseQuick('Read about today !2', D.today, [], new Set([2]));
    expect(p).toMatchObject({ title: 'Read about today', due: null, priority: 2 });
  });
});

describe('lists', () => {
  const tasks = [
    task(1, { due: '2026-10-15' }),                          // today
    task(2, { due: '2026-10-10' }),                          // overdue (last week)
    task(3, { due: '2026-10-16', subject_id: 7 }),           // tomorrow
    task(4, { due: '2026-10-18' }),                          // Sunday: still this week
    task(5, { due: '2026-10-19' }),                          // next Monday
    task(6, {}),                                             // no date
    task(7, { status: 'done', due: '2026-10-15', done_at: 2 }),
    task(8, { status: 'done', done_at: 5 }),
  ];
  const ids = (l: Parameters<typeof listTasks>[1]) => listTasks(tasks, l, D).map((t) => t.id);
  it('each list holds the right open tasks; overdue first in Today; Completed newest first', () => {
    expect(ids('today')).toEqual([2, 1]);
    expect(ids('tomorrow')).toEqual([3]);
    expect(ids('week')).toEqual([1, 3, 4]);
    expect(ids('planned')).toEqual([1, 2, 3, 4, 5]);
    expect(ids('all')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ids('completed')).toEqual([8, 7]);
    expect(ids('subject:7')).toEqual([3]);
  });
  it('This week follows "Week starts on"', () => {
    expect(days(NOW, 6)).toMatchObject({ weekFrom: '2026-10-10', weekTo: '2026-10-16' }); // Saturday
    expect(days(NOW, 0)).toMatchObject({ weekFrom: '2026-10-11', weekTo: '2026-10-17' }); // Sunday
    expect(listTasks(tasks, 'week', days(NOW, 6)).map((t) => t.id)).toEqual([1, 2, 3]);
  });
  it('the hand-made order is used', () => {
    const t = [task(1, { sort: 3 }), task(2, { sort: 1 }), task(3, { sort: 2 })];
    expect(listTasks(t, 'all', D).map((x) => x.id)).toEqual([2, 3, 1]);
  });
  it('quick add saves into the list being viewed', () => {
    expect(listDefaults('today', D)).toEqual({ due: '2026-10-15', subject_id: null });
    expect(listDefaults('tomorrow', D)).toEqual({ due: '2026-10-16', subject_id: null });
    expect(listDefaults('subject:4', D)).toEqual({ due: null, subject_id: 4 });
    expect(listDefaults('all', D)).toEqual({ due: null, subject_id: null });
    expect(inList(task(1, { due: '2026-10-15', status: 'done' }), 'today', D)).toBe(false);
  });
});

describe('time totals', () => {
  it('pomodoros done = focused time ÷ pomodoro length, rounded down', () => {
    expect(pomosDone(0, 25)).toBe(0);
    expect(pomosDone(24 * 60 + 59, 25)).toBe(0);
    expect(pomosDone(50 * 60, 25)).toBe(2);
    expect(pomosDone(50 * 60, 50)).toBe(1);
  });
  it('estimates: set as pomodoros × the length then, shown as pomodoros of the current length, rounded, with the minutes', () => {
    expect(estMinutes(3, 25)).toBe(75);
    expect(estPomos(75, 25)).toBe(3);
    expect(estPomos(75, 50)).toBe(2); // 1.5 rounds to 2
    expect(estPomos(20, 50)).toBe(1); // never 0
    expect(estText(75, 25)).toBe('3 pomodoros · 1 h 15 min');
    expect(estText(25, 25)).toBe('1 pomodoro · 25 min');
  });
  it('time left counts the estimate not done yet, open tasks only', () => {
    const t = [task(1, { est_min: 100, focused_sec: 50 * 60 }), task(2, { est_min: 25, focused_sec: 80 * 60 }), task(3, { est_min: 50, status: 'done' }), task(4)];
    expect(minutesLeft(t)).toBe(50); // 50 min left of task 1; task 2 went over; task 3 done; task 4 no estimate
  });
  it('search finds words in titles, notes and subtasks', () => {
    const t = [task(1, { title: 'Essay', notes: 'about Hamlet' }), task(2, { subtasks: [{ title: 'Read act 3', done: false }] }), task(3)];
    expect(search(t, 'hamlet essay').map((x) => x.id)).toEqual([1]);
    expect(search(t, 'ACT').map((x) => x.id)).toEqual([2]);
    expect(search(t, '  ')).toEqual([]);
  });
});

describe('repeat rule', () => {
  it('moves on from the old due date to the first date after today', () => {
    expect(nextDue('2026-10-15', 'daily', '2026-10-15')).toBe('2026-10-16');
    expect(nextDue('2026-10-10', 'daily', '2026-10-15')).toBe('2026-10-16'); // overdue: not into the past again
    expect(nextDue('2026-10-15', 'weekly', '2026-10-15')).toBe('2026-10-22');
    expect(nextDue('2026-10-01', 'weekly', '2026-10-15')).toBe('2026-10-22');
    expect(nextDue('2026-10-20', 'weekly', '2026-10-15')).toBe('2026-10-27'); // done early: a week after its date
    expect(nextDue(null, 'daily', '2026-10-15')).toBe('2026-10-16');
    expect(nextDue('2026-10-15', 'none', '2026-10-15')).toBe(null);
  });
  it('weekdays skip Saturday and Sunday', () => {
    expect(nextDue('2026-10-16', 'weekdays', '2026-10-16')).toBe('2026-10-19'); // Friday → Monday
    expect(nextDue('2026-10-15', 'weekdays', '2026-10-15')).toBe('2026-10-16');
    expect(nextDue(null, 'weekdays', '2026-10-17')).toBe('2026-10-19'); // a Saturday, no date
  });
});

describe('ordering', () => {
  it('moves one step or before another task', () => {
    expect(moved([1, 2, 3, 4], 3, { dir: -1 })).toEqual([1, 3, 2, 4]);
    expect(moved([1, 2, 3, 4], 1, { dir: -1 })).toEqual([1, 2, 3, 4]);
    expect(moved([1, 2, 3, 4], 4, { dir: 1 })).toEqual([1, 2, 3, 4]);
    expect(moved([1, 2, 3, 4], 1, { before: 4 })).toEqual([2, 3, 1, 4]);
    expect(moved([1, 2, 3, 4], 2, { before: null })).toEqual([1, 3, 4, 2]);
  });
  it("a list's tasks swap their own sort numbers, so hidden tasks keep their places", () => {
    const all = [{ id: 1, sort: 1 }, { id: 2, sort: 2 }, { id: 3, sort: 5 }, { id: 4, sort: 9 }];
    // list shows 1, 3, 4 (task 2 is in another list); move 4 to the top
    expect(reorder([4, 1, 3], all)).toEqual([[4, 1], [1, 5], [3, 9]]);
  });
});
