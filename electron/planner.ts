// Planner (Stage E, to-do list Stage E4): tasks and weekly routine blocks. Pure; used by the main process (reminders)
// and the Planner and Study screens, tested in tests/planner.test.ts.
import { n, t as tr } from './i18n.js'; // "t" is often a task here
// Days are 0 = Sunday ... 6 = Saturday (like Date.getDay()); times are minutes after midnight.

export type Status = 'todo' | 'doing' | 'done';
export const STATUSES: Status[] = ['todo', 'doing', 'done'];
export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly';
export const REPEATS: Repeat[] = ['none', 'daily', 'weekdays', 'weekly'];
export type Subtask = { title: string; done: boolean };
export type Subject = { id: number; name: string; sort: number };
export type Task = {
  id: number; subject_id: number | null; subject: string; // subject: its name ('' = none), read only
  title: string; notes: string; subtasks: Subtask[];
  due: string | null; due_min: number | null; // due: "2026-10-12"; due_min: optional time of day (minutes)
  repeat: Repeat; priority: number; est_min: number | null; status: Status; // est_min: fixed when set (pomodoros × the length then)
  created_at: number; done_at: number | null; sort: number; // sort: the hand-made order, shared by every list
  focused_sec: number; // study time of the sessions linked to it
};
export type Routine = {
  id: number; day: number; start_min: number; length_min: number; task_id: number | null;
  camera_mode: number; screen_mode: number; block_set_id: number | null; // null = the set chosen on the Study tab
};

// A clock time for showing (Bangla digits in Bangla mode). Not for <input type="time"> values.
export const hhmm = (min: number) => n(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`);
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const keyDate = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDaysKey = (k: string, n: number) => { const d = keyDate(k); d.setDate(d.getDate() + n); return dateKey(d); };

// Repeat rule (E4): the next copy's due date is the first repeat date after today, counted on from the old due
// date (or from today if it had none). "weekdays" = Monday to Friday.
export function nextDue(due: string | null, repeat: Repeat, today: string): string | null {
  if (repeat === 'none') return null;
  let k = due ?? today;
  do {
    k = addDaysKey(k, repeat === 'weekly' ? 7 : 1);
    if (repeat === 'weekdays') while ([0, 6].includes(keyDate(k).getDay())) k = addDaysKey(k, 1);
  } while (k <= today);
  return k;
}

// Drag or ↑ ↓ in one list: the moved tasks take that list's existing sort numbers in their new order, so tasks
// that are not in the list keep their places relative to them.
export function reorder(ids: number[], tasks: Pick<Task, 'id' | 'sort'>[]): [number, number][] {
  const sorts = ids.map((id) => tasks.find((t) => t.id === id)?.sort ?? 0).sort((a, b) => a - b);
  return ids.map((id, i) => [id, sorts[i]]);
}
// The ids of a list after moving `id` one step (dir) or before `before` (drag and drop).
export function moved(ids: number[], id: number, to: { dir: -1 | 1 } | { before: number | null }): number[] {
  const rest = ids.filter((x) => x !== id);
  const i = 'dir' in to ? Math.max(0, Math.min(rest.length, ids.indexOf(id) + to.dir))
    : to.before === null ? rest.length : rest.indexOf(to.before);
  return [...rest.slice(0, i), id, ...rest.slice(i)];
}

// Board ← → buttons: the next column left or right, or the same at the edge.
export const moveStatus = (s: Status, dir: -1 | 1): Status => STATUSES[Math.min(2, Math.max(0, STATUSES.indexOf(s) + dir))];

// Board order: open tasks first, then the hand-made order.
export const sortTasks = (tasks: Task[]) => [...tasks].sort((a, b) => +(a.status === 'done') - +(b.status === 'done') || a.sort - b.sort || a.id - b.id);
export const isOverdue = (t: Task, today: string) => t.status !== 'done' && t.due !== null && t.due < today;
export const dueToday = (tasks: Task[], today: string) => tasks.filter((t) => t.status !== 'done' && t.due === today).length;

// Why a block cannot be saved, or null. Blocks stay inside one day and never overlap.
export function routineProblem(r: Omit<Routine, 'id'> & { id?: number }, others: Routine[]): string | null {
  if (!Number.isInteger(r.day) || r.day < 0 || r.day > 6) return tr('Pick a day.');
  if (!Number.isInteger(r.start_min) || r.start_min < 0 || r.start_min > 1439) return tr('Pick a start time.');
  if (!Number.isInteger(r.length_min) || r.length_min < 5 || r.length_min > 600) return tr('Length must be 5 to 600 minutes.');
  if (r.start_min + r.length_min > 1440) return tr('A block must end by midnight.');
  const clash = others.find((o) => o.id !== r.id && o.day === r.day &&
    r.start_min < o.start_min + o.length_min && o.start_min < r.start_min + r.length_min);
  return clash ? tr("It overlaps the block at {from}–{to}.", { from: hhmm(clash.start_min), to: hhmm(clash.start_min + clash.length_min) }) : null;
}

// The next block today that has not started yet.
export function nextToday(routines: Routine[], now: Date): Routine | null {
  const min = now.getHours() * 60 + now.getMinutes();
  return routines.filter((r) => r.day === now.getDay() && r.start_min >= min).sort((a, b) => a.start_min - b.start_min)[0] ?? null;
}

// Blocks that started in (from, to]: the reminder check runs every few seconds with the last
// check time as `from`. A start more than 2 minutes ago is skipped (e.g. the PC was asleep).
export function startedBetween(routines: Routine[], from: number, to: number): Routine[] {
  const days = [new Date(from), new Date(to)].map((d) => { d.setHours(0, 0, 0, 0); return d; });
  return routines.filter((r) => days.some((d) => {
    if (d.getDay() !== r.day) return false;
    const at = new Date(d); at.setMinutes(r.start_min);
    const t = at.getTime();
    return t > from && t <= to && to - t <= 120_000;
  }));
}

// ---- checking what the page sends (main process, before saving) ----
export type TaskInput = Omit<Task, 'id' | 'created_at' | 'focused_sec' | 'subject' | 'done_at' | 'sort'> & { id?: number };
export type RoutineInput = Omit<Routine, 'id'> & { id?: number };
const int = (v: unknown, lo: number, hi: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : null);
const idOrNull = (v: unknown) => (v === null || v === undefined ? null : int(v, 1, Number.MAX_SAFE_INTEGER));

// A cleaned task, or a message saying what is wrong.
export function cleanTask(x: unknown): TaskInput | string {
  const t = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
  const title = typeof t.title === 'string' ? t.title.trim().slice(0, 200) : '';
  if (!title) return tr('Give the task a title.');
  const due = t.due === null || t.due === '' || t.due === undefined ? null : typeof t.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : undefined;
  if (due === undefined) return tr('The due date is not a date.');
  const empty = (v: unknown) => v === null || v === undefined || v === '';
  const est = empty(t.est_min) ? null : int(t.est_min, 1, 9999);
  if (est === null && !empty(t.est_min)) return tr('The estimate must be 1 to 9999 minutes.');
  const dueMin = empty(t.due_min) ? null : int(t.due_min, 0, 1439);
  if (dueMin === null && !empty(t.due_min)) return tr('The time is not a time.');
  const subtasks = Array.isArray(t.subtasks) ? t.subtasks.slice(0, 50).flatMap((s: unknown) => {
    const x = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
    const st = typeof x.title === 'string' ? x.title.trim().slice(0, 200) : '';
    return st ? [{ title: st, done: x.done === true }] : [];
  }) : [];
  return {
    ...(t.id !== undefined && t.id !== null ? { id: idOrNull(t.id) ?? undefined } : {}),
    subject_id: idOrNull(t.subject_id),
    title, due, due_min: dueMin, est_min: est,
    notes: typeof t.notes === 'string' ? t.notes.slice(0, 5000) : '',
    subtasks,
    repeat: REPEATS.includes(t.repeat as Repeat) ? (t.repeat as Repeat) : 'none',
    priority: int(t.priority, 1, 3) ?? 2,
    status: STATUSES.includes(t.status as Status) ? (t.status as Status) : 'todo',
  };
}
export function cleanRoutine(x: unknown): RoutineInput {
  const r = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
  return {
    ...(r.id !== undefined && r.id !== null ? { id: idOrNull(r.id) ?? undefined } : {}),
    day: int(r.day, 0, 6) ?? -1, start_min: int(r.start_min, 0, 1439) ?? -1, length_min: int(r.length_min, 0, 1440) ?? 0,
    task_id: idOrNull(r.task_id), block_set_id: idOrNull(r.block_set_id),
    camera_mode: r.camera_mode ? 1 : 0, screen_mode: r.screen_mode ? 1 : 0,
  };
}
