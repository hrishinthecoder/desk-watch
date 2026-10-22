// Day view and goals (Stage E4 Part 3). Pure, unit-tested in tests/day.test.ts.
import { hhmm, keyDate, type Routine, type Subject, type Task } from '../../electron/planner';
import { estPomos, estText, hoursMin, pomosDone } from './todo';
import { plural, t } from '../../electron/i18n';
const tr = t; // where "t" is a task

// One block on the Day view's time line; minutes after midnight of that day.
export type Item = { id: string; start: number; end: number; title: string; sub: string; kind: 'block' | 'task' | 'session'; startedAt?: number };
type SessionRow = { started_at: number; ended_at: number | null; focused_sec: number | null; task_id?: number | null; planned_min: number };

const minOfDay = (ms: number, day0: number) => Math.round((ms - day0) / 60_000);
export const TASK_MIN = 30; // a task with a time but no estimate is drawn this long

// Scheduled: the weekly blocks of that weekday and the tasks due that day at a time. Done: that day's sessions.
// A block is named after its task, else its subject (routines, Stage G3), else "Study block".
export function dayItems(date: string, routines: (Routine & { subject_id?: number | null })[], tasks: Task[], sessions: SessionRow[], pomoMin: number, now = Date.now(),
  subjects: Pick<Subject, 'id' | 'name'>[] = []) {
  const d = keyDate(date), day0 = d.getTime();
  const name = (id: number | null | undefined) => tasks.find((t) => t.id === id)?.title;
  const scheduled: Item[] = [
    ...routines.filter((r) => r.day === d.getDay()).map((r): Item => ({
      id: `r${r.id}`, kind: 'block', start: r.start_min, end: r.start_min + r.length_min,
      title: name(r.task_id) ?? subjects.find((s) => s.id === r.subject_id)?.name ?? t('Study block'),
      sub: t('{from}–{to} · weekly block', { from: hhmm(r.start_min), to: hhmm(r.start_min + r.length_min) }),
    })),
    ...tasks.filter((t) => t.due === date && t.due_min !== null).map((t): Item => ({
      id: `t${t.id}`, kind: 'task', start: t.due_min!, end: Math.min(1440, t.due_min! + (t.est_min ?? TASK_MIN)),
      title: t.title, sub: `${hhmm(t.due_min!)} · ${t.status === 'done' ? tr('done') : t.est_min ? estText(t.est_min, pomoMin) : tr('task')}`,
    })),
  ].sort((a, b) => a.start - b.start);
  const done: Item[] = sessions.filter((s) => s.started_at >= day0 && s.started_at < day0 + 86_400_000).map((s): Item => {
    const start = minOfDay(s.started_at, day0), end = Math.max(start + 1, Math.min(1440, minOfDay(s.ended_at ?? now, day0)));
    const focused = s.ended_at === null ? t('running') : t('{m} min focused', { m: Math.floor((s.focused_sec ?? 0) / 60) });
    return { id: `s${s.started_at}`, kind: 'session', start, end, startedAt: s.started_at, title: name(s.task_id) ?? t('Study session'), sub: `${hhmm(start)}–${hhmm(end)} · ${focused}` };
  });
  return { scheduled, done };
}

// The hours the time line shows: 6:00–22:00, widened to fit everything that day.
export function hourRange(items: Item[]): [number, number] {
  const from = Math.min(6, ...items.map((i) => Math.floor(i.start / 60)));
  const to = Math.max(22, ...items.map((i) => Math.ceil(i.end / 60)));
  return [from, Math.min(24, to)];
}

// "3 of 8": pomodoros of focused time today against the daily goal.
export const goalLine = (focusedSec: number, pomoMin: number, goal: number) => t('{n} of {goal}', { n: pomosDone(focusedSec, pomoMin), goal });

// Said when a task with an estimate (minutes) is completed. Plain, no praise.
export function estimateLine(estMin: number | null, focusedSec: number, pomoMin: number) {
  if (!estMin) return '';
  const est = estPomos(estMin, pomoMin), took = pomosDone(focusedSec, pomoMin);
  return t(plural(est, 'Estimated {est} pomodoro ({time}), took {took}.', 'Estimated {est} pomodoros ({time}), took {took}.'), { est, time: hoursMin(estMin), took });
}
