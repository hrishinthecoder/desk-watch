// To-do list (Stage E4 Part 1): which tasks are in which list, counts and time left, the quick-add parser and
// search. Pure, unit-tested in tests/todo.test.ts. Dates are "YYYY-MM-DD" keys in local time (electron/planner.ts).
import { addDaysKey, dateKey, keyDate, type Subject, type Task } from '../../electron/planner';
import { fmtDate, plural, t, tk } from '../../electron/i18n';

export type ListId = 'today' | 'tomorrow' | 'week' | 'planned' | 'all' | 'completed' | `subject:${number}`;
// Names are English (tk) and shown with t().
export const LISTS: [ListId, string][] = [['today', tk('Today')], ['tomorrow', tk('Tomorrow')], ['week', tk('This week')], ['planned', tk('Planned')], ['all', tk('All tasks')], ['completed', tk('Completed')]];

export type Days = { today: string; tomorrow: string; weekFrom: string; weekTo: string };
// weekStart: 0 = Sunday ... 6 = Saturday (Settings → Week starts on).
export function days(now: Date, weekStart: number): Days {
  const today = dateKey(now);
  const weekFrom = addDaysKey(today, -((now.getDay() - weekStart + 7) % 7));
  return { today, tomorrow: addDaysKey(today, 1), weekFrom, weekTo: addDaysKey(weekFrom, 6) };
}

const open = (t: Task) => t.status !== 'done';
export const isOverdue = (t: Task, d: Days) => open(t) && t.due !== null && t.due < d.today;

export function inList(t: Task, list: ListId, d: Days): boolean {
  if (list === 'completed') return !open(t);
  if (!open(t)) return false;
  if (list === 'today') return t.due !== null && t.due <= d.today;
  if (list === 'tomorrow') return t.due === d.tomorrow;
  if (list === 'week') return t.due !== null && t.due >= d.weekFrom && t.due <= d.weekTo;
  if (list === 'planned') return t.due !== null;
  if (list === 'all') return true;
  return t.subject_id === Number(list.slice(8));
}

// The tasks of a list in order: the hand-made order; overdue first in Today; Completed newest first.
export function listTasks(tasks: Task[], list: ListId, d: Days): Task[] {
  const ts = tasks.filter((t) => inList(t, list, d));
  if (list === 'completed') return ts.sort((a, b) => (b.done_at ?? 0) - (a.done_at ?? 0) || b.id - a.id);
  return ts.sort((a, b) => (list === 'today' ? +isOverdue(b, d) - +isOverdue(a, d) : 0) || a.sort - b.sort || a.id - b.id);
}

// A pomodoro = one pomodoro length of camera-checked focused time (owner-review decision 1 in PLAN.md).
export const pomosDone = (focusedSec: number, pomoMin: number) => Math.floor(focusedSec / (Math.max(1, pomoMin) * 60));
// Estimated minutes still to go: each open task's estimate minus its focused minutes so far.
export const minutesLeft = (tasks: Task[]) =>
  tasks.filter(open).reduce((a, t) => a + Math.max(0, (t.est_min ?? 0) - Math.floor(t.focused_sec / 60)), 0);
export const hoursMin = (min: number) => (min < 60 ? t('{m} min', { m: min }) : min % 60 ? t('{h} h {m} min', { h: Math.floor(min / 60), m: min % 60 }) : t('{h} h', { h: min / 60 }));
// Estimates are stored in minutes, fixed when they are set: pomodoros × the pomodoro length at that time (owner,
// 2026-10-21). They are shown as pomodoros of today's length, rounded (at least 1), with the minutes too.
export const estMinutes = (pomos: number, pomoMin: number) => pomos * Math.max(1, pomoMin);
export const estPomos = (estMin: number, pomoMin: number) => Math.max(1, Math.round(estMin / Math.max(1, pomoMin)));
export const estText = (estMin: number, pomoMin: number) => {
  const p = estPomos(estMin, pomoMin);
  return `${t(plural(p, '{n} pomodoro', '{n} pomodoros'), { n: p })} · ${hoursMin(estMin)}`;
};

// The most pomodoros anywhere: a run (Set your timer, Settings) and an estimate (owner, 2026-10-23).
export const MAX_POMOS = 12;
// Progress of a task, always with its unit and plainly when it goes over (owner, 2026-10-23): "171 of 75 min ·
// +96 min over". Minutes, not pomodoros, so a change of pomodoro length never changes it. null = nothing to show.
export function progressOf(focusedSec: number, estMin: number | null) {
  const done = Math.floor(focusedSec / 60);
  if (!estMin) return done ? { text: t('{done} min focused', { done }), over: 0, frac: null } : null;
  const over = Math.max(0, done - estMin);
  return { text: t('{done} of {est} min', { done, est: estMin }) + (over ? ` · ${t('+{over} min over', { over })}` : ''), over, frac: Math.min(1, done / estMin) };
}

// Search (Ctrl+K): every word must appear in the title, the notes or a subtask.
export function search(tasks: Task[], q: string): Task[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return tasks.filter((t) => {
    const text = [t.title, t.notes, t.subject, ...t.subtasks.map((s) => s.title)].join('\n').toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

// ---- quick add ----
// "Essay #English friday !1 ~3" → title "Essay", subject English, due the coming Friday, high priority, 3 pomodoros.
// Each recognised word becomes a chip; a chip's × keeps that word as plain text (its index goes into `keep`).
export type Chip = { i: number; kind: 'due' | 'subject' | 'priority' | 'pomos'; label: string };
export type Parsed = { title: string; due: string | null; subject: string | null; newSubject: boolean; priority: number | null; pomos: number | null; chips: Chip[] };
// The date words work in English and in Bangla (and Bangla digits in !১ and ~৩), whichever language is chosen.
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const BN_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি']; // + "বার" for the full name
const TODAY = ['today', 'আজ'], TOMORROW = ['tomorrow', 'আগামীকাল'];
const asciiDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
const PRIORITY = ['', tk('High priority'), tk('Normal priority'), tk('Low priority')];
export const shortDate = (k: string) => fmtDate(keyDate(k), { weekday: 'short', day: 'numeric', month: 'short' });

export function parseQuick(text: string, today: string, subjects: Pick<Subject, 'name'>[], keep: Set<number> = new Set()): Parsed {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const p: Parsed = { title: '', due: null, subject: null, newSubject: false, priority: null, pomos: null, chips: [] };
  const chip = (i: number, kind: Chip['kind'], label: string) => { p.chips = [...p.chips.filter((c) => c.kind !== kind), { i, kind, label }]; };
  words.forEach((w, i) => {
    const lw = asciiDigits(w.toLowerCase());
    let m: RegExpExecArray | null;
    const en = WEEKDAYS.findIndex((d) => lw === d || lw === d.slice(0, 3));
    const day = en >= 0 ? en : BN_WEEKDAYS.findIndex((d) => lw === d || lw === d + 'বার');
    if (keep.has(i)) return;
    if (TODAY.includes(lw) || TOMORROW.includes(lw)) {
      const isToday = TODAY.includes(lw);
      p.due = isToday ? today : addDaysKey(today, 1);
      chip(i, 'due', t(isToday ? 'Due today' : 'Due tomorrow'));
    } else if (day >= 0) {
      p.due = addDaysKey(today, (day - keyDate(today).getDay() + 7) % 7); // the coming one, today included
      chip(i, 'due', t('Due {date}', { date: shortDate(p.due) }));
    } else if ((m = /^#(\S{1,40})$/.exec(w))) {
      const found = subjects.find((s) => s.name.toLowerCase() === m![1].toLowerCase());
      p.subject = found?.name ?? m[1];
      p.newSubject = !found;
      chip(i, 'subject', found ? `#${p.subject}` : t('#{name} (new)', { name: p.subject }));
    } else if ((m = /^!([1-3])$/.exec(lw))) {
      p.priority = Number(m[1]);
      chip(i, 'priority', t(PRIORITY[p.priority]));
    } else if ((m = /^~(\d{1,2})$/.exec(lw)) && Number(m[1]) >= 1) {
      p.pomos = Math.min(MAX_POMOS, Number(m[1]));
      chip(i, 'pomos', t(plural(p.pomos, '{n} pomodoro', '{n} pomodoros'), { n: p.pomos }));
    }
  });
  // A repeated shortcut: the last one wins, the earlier ones stay in the title.
  const used = new Set(p.chips.map((c) => c.i));
  p.title = words.filter((_, i) => !used.has(i)).join(' ');
  return p;
}

// What a new task from quick add gets from the list it is typed into (owner-review decision 6).
export function listDefaults(list: ListId, d: Days): { due: string | null; subject_id: number | null } {
  if (list === 'tomorrow') return { due: d.tomorrow, subject_id: null };
  if (list === 'today' || list === 'week' || list === 'planned') return { due: d.today, subject_id: null };
  if (list.startsWith('subject:')) return { due: null, subject_id: Number(list.slice(8)) };
  return { due: null, subject_id: null };
}
