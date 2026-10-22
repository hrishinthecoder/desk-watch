// Routines (Stage G3): a routine is a named group of the weekly blocks (`routines` rows), e.g. "HSC weekly" or
// "Exam week". One routine is on at a time. Edits change today and later only; past days keep their blocks.
// One day can be skipped or moved without changing the routine. Pure; used by the main process (database,
// reminders) and the Planner; tested in tests/routines.test.ts.
import { addDaysKey, keyDate, routineProblem, type Routine } from './planner.js';
import { t as tr, weekdayName } from './i18n.js';

export type RoutineSet = { id: number; name: string };
// Which routine is on from a date (set_id null = none). The last entry on or before a day decides that day.
export type LogRow = { from_date: string; set_id: number | null };
// A stored block: one weekday of one slot of one routine, valid from / to a date (null = no limit).
export type BlockRow = Routine & { set_id: number | null; slot: number | null; subject_id: number | null; valid_from: string | null; valid_to: string | null };
// One day's change to one block: skipped, or another start and length on that date only.
export type DayChange = { routine_id: number; date: string; skip: number; start_min: number | null; length_min: number | null };
// A block on a given date, with that day's change applied. `skipped` blocks are still listed (to undo the skip).
export type Block = Routine & { date: string; set_id: number | null; subject_id: number | null; slot: number | null; skipped: boolean; moved: boolean };
// What the editor shows: one time slot, on one or more weekdays.
export type Slot = {
  slot?: number; days: number[]; start_min: number; length_min: number; task_id: number | null; subject_id: number | null;
  camera_mode: number; screen_mode: number; block_set_id: number | null;
};

export function activeOn(log: LogRow[], date: string): number | null {
  let set: number | null = null, at = '';
  for (const l of log) if (l.from_date <= date && l.from_date >= at) { at = l.from_date; set = l.set_id; }
  return set;
}
const validOn = (r: Pick<BlockRow, 'valid_from' | 'valid_to'>, date: string) => (r.valid_from ?? '') <= date && (r.valid_to === null || date <= r.valid_to);

// The blocks of one date: the routine that was (or will be) on that day, its rows valid that day for that weekday,
// with that day's skip or move. Ordered by start time.
export function blocksOn(date: string, rows: BlockRow[], changes: DayChange[], log: LogRow[]): Block[] {
  const set = activeOn(log, date);
  if (set === null) return [];
  const day = keyDate(date).getDay();
  return rows.filter((r) => r.set_id === set && r.day === day && validOn(r, date)).map((r): Block => {
    const c = changes.find((x) => x.routine_id === r.id && x.date === date);
    const moved = !!c && !c.skip && c.start_min !== null;
    return { id: r.id, day: r.day, start_min: moved ? c!.start_min! : r.start_min, length_min: moved ? c!.length_min ?? r.length_min : r.length_min,
      task_id: r.task_id, camera_mode: r.camera_mode, screen_mode: r.screen_mode, block_set_id: r.block_set_id,
      date, set_id: r.set_id, subject_id: r.subject_id, slot: r.slot, skipped: !!c?.skip, moved };
  }).sort((a, b) => a.start_min - b.start_min);
}
export function blocksBetween(from: string, to: string, rows: BlockRow[], changes: DayChange[], log: LogRow[]): Block[] {
  const out: Block[] = [];
  for (let d = from; d <= to; d = addDaysKey(d, 1)) out.push(...blocksOn(d, rows, changes, log));
  return out;
}

// A routine as the editor shows it today: its rows that are valid today or later, one slot per group of rows.
export function currentSlots(rows: BlockRow[], set: number, today: string): Slot[] {
  const slots = new Map<number, Slot>();
  for (const r of rows.filter((x) => x.set_id === set && (x.valid_to === null || x.valid_to >= today)).sort((a, b) => a.start_min - b.start_min || a.day - b.day)) {
    const key = r.slot ?? -r.id;
    const s = slots.get(key);
    if (s) { if (!s.days.includes(r.day)) s.days.push(r.day); continue; }
    slots.set(key, { slot: r.slot ?? undefined, days: [r.day], start_min: r.start_min, length_min: r.length_min, task_id: r.task_id,
      subject_id: r.subject_id, camera_mode: r.camera_mode, screen_mode: r.screen_mode, block_set_id: r.block_set_id });
  }
  return [...slots.values()].map((s) => ({ ...s, days: s.days.sort((a, b) => a - b) }));
}

// "Copy this day to…": every slot on `from` also happens on the `to` days.
export const copyDay = (slots: Slot[], from: number, to: number[]): Slot[] =>
  slots.map((s) => (s.days.includes(from) ? { ...s, days: [...new Set([...s.days, ...to])].sort((a, b) => a - b) } : s));

// Saving a routine's slots from today on: what to end (valid until yesterday), what to delete (rows that only ever
// existed from today on) and what to add. Nothing is saved when there are problems (every clash is named).
export type SavePlan = { problems: string[]; end: number[]; del: number[]; add: (Omit<BlockRow, 'id' | 'slot'> & { slotIndex: number })[] };
export function planSave(rows: BlockRow[], set: number, slots: Slot[], today: string): SavePlan {
  const problems: string[] = [];
  const add: SavePlan['add'] = [];
  slots.forEach((s, i) => {
    if (!s.days.length) problems.push(tr('Time slot {n}: pick at least one day.', { n: i + 1 }));
    for (const day of [...new Set(s.days)]) add.push({ day, start_min: s.start_min, length_min: s.length_min, task_id: s.task_id, subject_id: s.subject_id,
      camera_mode: s.camera_mode ? 1 : 0, screen_mode: s.screen_mode ? 1 : 0, block_set_id: s.block_set_id, set_id: set, valid_from: today, valid_to: null, slotIndex: i });
  });
  // The overlap rule of single blocks, day by day, between the new blocks of this routine.
  add.forEach((r, i) => {
    const others = add.slice(0, i).map((o, j) => ({ ...o, id: j + 1 }));
    const p = routineProblem({ ...r, id: 0 }, others);
    if (p) problems.push(tr('{day}: {problem}', { day: weekdayName(r.day), problem: p }));
  });
  const current = rows.filter((r) => r.set_id === set && (r.valid_to === null || r.valid_to >= today));
  return {
    problems,
    del: current.filter((r) => r.valid_from !== null && r.valid_from >= today).map((r) => r.id),
    end: current.filter((r) => r.valid_from === null || r.valid_from < today).map((r) => r.id),
    add,
  };
}

// A day's change: the moved block must still fit that day (inside the day, no clash with the other blocks).
export function dayChangeProblem(block: Block, start: number, length: number, sameDay: Block[]): string | null {
  return routineProblem({ ...block, start_min: start, length_min: length }, sameDay.filter((b) => !b.skipped));
}

// ---- checking what the page sends (main process, before saving) ----
const int = (v: unknown, lo: number, hi: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : null);
const idOrNull = (v: unknown) => (v === null || v === undefined ? null : int(v, 1, Number.MAX_SAFE_INTEGER));
export const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
// Bad numbers become values the rules refuse (e.g. start -1), so the owner sees a clear problem, not a crash.
export function cleanRoutineSet(x: unknown): { id?: number; name: string; slots: Slot[] } {
  const r = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
  const slots = (Array.isArray(r.slots) ? r.slots.slice(0, 60) : []).map((v): Slot => {
    const s = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
    const days = Array.isArray(s.days) ? [...new Set(s.days.map((d) => int(d, 0, 6)).filter((d): d is number => d !== null))] : [];
    return {
      ...(idOrNull(s.slot) ? { slot: idOrNull(s.slot)! } : {}), days,
      start_min: int(s.start_min, 0, 1439) ?? -1, length_min: int(s.length_min, 0, 1440) ?? 0,
      task_id: idOrNull(s.task_id), subject_id: idOrNull(s.subject_id), block_set_id: idOrNull(s.block_set_id),
      camera_mode: s.camera_mode ? 1 : 0, screen_mode: s.screen_mode ? 1 : 0,
    };
  });
  return { ...(idOrNull(r.id) ? { id: idOrNull(r.id)! } : {}), name: typeof r.name === 'string' ? r.name : '', slots };
}
