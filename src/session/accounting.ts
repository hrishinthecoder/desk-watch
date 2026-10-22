// Time accounting for reports, Day view and History. Pure, tested in tests/accounting.test.ts.
import { n, plural, t, tk } from '../../electron/i18n';

export type Activity = 'FOCUSED' | 'WRITING' | 'READING' | 'SPEAKING' | 'IDLE' | 'LOOKING_AWAY' | 'PHONE' | 'PHONE_CALL' | 'DOWN' | 'AWAY' | 'SLEEPY' | 'BREAK' | 'PAUSED';
export type Segment = { activity: string; start: number; end: number }; // ms

// English names (also the alarm's internal name); shown with activityText() in the chosen language.
export const ACTIVITY_TEXT: Record<Activity, string> = {
  FOCUSED: tk('Focused'), WRITING: tk('Writing'), READING: tk('Reading'), SPEAKING: tk('Speaking'), IDLE: tk('Idle'), LOOKING_AWAY: tk('Looking away'),
  PHONE: tk('Phone'), PHONE_CALL: tk('Phone call'), DOWN: tk('Looking down'), AWAY: tk('Away'), SLEEPY: tk('Sleepy'), BREAK: tk('Break'), PAUSED: tk('Paused'),
};
// What the alarm says for an activity (usually its name). Sleepy says what to do.
export const alarmFor = (a: Activity) => (a === 'SLEEPY' ? tk('Wake up') : ACTIVITY_TEXT[a]);
export const activityText = (a: string) => t(ACTIVITY_TEXT[a as Activity] ?? a);
// The session's alarm text (English inside the app, e.g. "Blocked app: steam.exe"), in the chosen language.
export const alarmText = (alarm: string) => (alarm.startsWith('Blocked app: ') ? t('Blocked app: {name}', { name: alarm.slice(13) })
  : alarm.startsWith('Blocked site: ') ? t('Blocked site: {name}', { name: alarm.slice(14) }) : t(alarm));
tk('Break is over');
// Counts toward the study clock. FOCUSED is from sessions saved before activities existed.
export const STUDY = new Set(['FOCUSED', 'WRITING', 'READING', 'SPEAKING', 'IDLE']);
// The alarm rings while one of these lasts.
export const ALARM = new Set(['PHONE', 'PHONE_CALL', 'DOWN', 'AWAY', 'LOOKING_AWAY', 'SLEEPY']);
const PHONE = new Set(['PHONE', 'PHONE_CALL']);

// Segments closer than this count as one continuous stretch.
const JOIN_MS = 1500;

export type Summary = {
  totalSec: number;      // time inside sessions, breaks included (gaps between sessions are not)
  focusedSec: number;
  bySec: Record<string, number>;
  phonePickups: number;  // times a phone state started (phone -> call counts once)
  phoneSec: number;
  leftDesk: number;      // times AWAY started
  lookDowns: number;     // times DOWN (looking down, e.g. at a phone on the desk) started
  downSec: number;
  lookAways: number;     // times LOOKING_AWAY started
  sleepy: number;        // times SLEEPY started (Stage A3)
  sleepySec: number;
  longestFocusSec: number;
};

export function summarize(segments: Segment[]): Summary {
  const segs = [...segments].sort((a, b) => a.start - b.start);
  const bySec: Record<string, number> = {};
  let phonePickups = 0, leftDesk = 0, lookDowns = 0, lookAways = 0, sleepy = 0, longest = 0, streak = 0;
  let prev: Segment | null = null;
  for (const s of segs) {
    const sec = Math.max(0, s.end - s.start) / 1000;
    bySec[s.activity] = (bySec[s.activity] ?? 0) + sec;
    const joined = prev !== null && s.start - prev.end <= JOIN_MS;
    if (PHONE.has(s.activity) && !(joined && PHONE.has(prev!.activity))) phonePickups++;
    if (s.activity === 'AWAY' && !(joined && prev!.activity === 'AWAY')) leftDesk++;
    if (s.activity === 'DOWN' && !(joined && prev!.activity === 'DOWN')) lookDowns++;
    if (s.activity === 'LOOKING_AWAY' && !(joined && prev!.activity === 'LOOKING_AWAY')) lookAways++;
    if (s.activity === 'SLEEPY' && !(joined && prev!.activity === 'SLEEPY')) sleepy++;
    if (STUDY.has(s.activity)) {
      streak = (joined && STUDY.has(prev!.activity) ? streak : 0) + sec;
      longest = Math.max(longest, streak);
    }
    prev = s;
  }
  const sum = (set: Set<string>) => Object.entries(bySec).filter(([k]) => set.has(k)).reduce((a, [, v]) => a + v, 0);
  return {
    totalSec: Object.values(bySec).reduce((a, v) => a + v, 0),
    focusedSec: sum(STUDY),
    bySec,
    phonePickups,
    phoneSec: sum(PHONE),
    leftDesk,
    lookDowns,
    downSec: bySec.DOWN ?? 0,
    lookAways,
    sleepy,
    sleepySec: bySec.SLEEPY ?? 0,
    longestFocusSec: longest,
  };
}

// Distractions in reports: one total, and a one-line breakdown without the kinds that are zero,
// e.g. "4 phone · 2 looking down · 1 left · 1 sleepy · 3 blocked sites".
export type Event = { type: string; detail: string | null };
// name: the kind (shown with t() as the top distraction); one/many: the breakdown text.
const DISTRACTIONS: { name: string; one: string; many: string; count: (s: Summary, e: Event[]) => number }[] = [
  { name: tk('phone'), one: tk('{n} phone'), many: tk('{n} phone'), count: (s) => s.phonePickups },
  { name: tk('looking down'), one: tk('{n} looking down'), many: tk('{n} looking down'), count: (s) => s.lookDowns },
  { name: tk('left'), one: tk('{n} left'), many: tk('{n} left'), count: (s) => s.leftDesk },
  { name: tk('looking away'), one: tk('{n} looking away'), many: tk('{n} looking away'), count: (s) => s.lookAways },
  { name: tk('sleepy'), one: tk('{n} sleepy'), many: tk('{n} sleepy'), count: (s) => s.sleepy ?? 0 },
  { name: tk('blocked site'), one: tk('{n} blocked site'), many: tk('{n} blocked sites'), count: (_, e) => blocked(e, 'site:') },
  { name: tk('blocked app'), one: tk('{n} blocked app'), many: tk('{n} blocked apps'), count: (_, e) => blocked(e, 'app:') },
];
const blocked = (events: Event[], kind: string) => events.filter((e) => e.type === 'blocked_attempt' && e.detail?.startsWith(kind)).length;

export function distractions(s: Summary, events: Event[]) {
  const parts = DISTRACTIONS.map((d) => ({ d, n: d.count(s, events) })).filter((x) => x.n > 0);
  // The most frequent kind (the first in the list wins a tie), for the weekly review.
  const top = parts.reduce<(typeof parts)[number] | undefined>((best, x) => (!best || x.n > best.n ? x : best), undefined);
  return {
    total: parts.reduce((a, x) => a + x.n, 0),
    line: parts.map((x) => t(plural(x.n, x.d.one, x.d.many), { n: x.n })).join(' · '),
    top: top && { name: top.d.name, n: top.n }, // English name; shown with t()
  };
}

const amount = (sec: number) => sec < 60
  ? t(plural(Math.round(sec), '{n} second', '{n} seconds'), { n: Math.round(sec) })
  : t(plural(Math.round(sec / 60), '{n} minute', '{n} minutes'), { n: Math.round(sec / 60) });

// One plain sentence above a session report: what happened, no praise and no advice.
// Minutes are rounded down, so it never says "50 of 50" before the goal was really reached.
export function reportSentence(s: Summary, plannedMin: number, cameraMode: boolean) {
  const first = t('{n} of {planned} minutes focused.', { n: Math.floor(s.focusedSec / 60), planned: plannedMin });
  if (!cameraMode) return `${first} ${t('The camera was off, so distractions were not checked.')}`;
  const costs: [string, number][] = [
    [tk('Your phone cost you {amount}.'), s.phoneSec], [tk('Looking down cost you {amount}.'), s.downSec],
    [tk('Leaving the desk cost you {amount}.'), s.bySec.AWAY ?? 0], [tk('Looking away cost you {amount}.'), s.bySec.LOOKING_AWAY ?? 0],
    [tk('Sleepiness cost you {amount}.'), s.bySec.SLEEPY ?? 0],
  ];
  const [who, sec] = costs.sort((a, b) => b[1] - a[1])[0];
  return sec >= 1 ? `${first} ${t(who, { amount: amount(sec) })}` : `${first} ${t('No distractions seen.')}`;
}

// Timeline rows: position (and a label) tells them apart, not colour alone. Neighbouring
// segments of the same kind become one block; every study activity is one "Studying" block.
export type Lane = 'study' | 'distracted' | 'break';
export type Block = { lane: Lane; text: string; start: number; end: number };
export const laneOf = (activity: string): Lane => (activity === 'BREAK' || activity === 'PAUSED' ? 'break' : ALARM.has(activity) ? 'distracted' : 'study');

export function timelineBlocks(segments: Segment[], events: (Event & { at: number })[] = []): Block[] {
  const out: Block[] = [];
  for (const s of [...segments].sort((a, b) => a.start - b.start)) {
    const lane = laneOf(s.activity);
    const text = lane === 'study' ? t('Studying') : activityText(s.activity);
    const last = out[out.length - 1];
    if (last && last.text === text && s.start - last.end <= JOIN_MS) last.end = Math.max(last.end, s.end);
    else out.push({ lane, text, start: s.start, end: s.end });
  }
  // A blocked site or app is a moment, not a stretch: a thin mark in the Distracted row.
  for (const e of events) {
    if (e.type !== 'blocked_attempt' || !e.detail) continue;
    const [kind, name] = [e.detail.slice(0, e.detail.indexOf(':')), e.detail.slice(e.detail.indexOf(':') + 1)];
    out.push({ lane: 'distracted', text: t(kind === 'app' ? 'Blocked app: {name}' : 'Blocked site: {name}', { name }), start: e.at, end: e.at });
  }
  return out.sort((a, b) => a.start - b.start);
}

// Local calendar day, e.g. "2026-10-09".
export const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const addDays = (ms: number, n: number) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };

// Focused minutes per day for the last `days` days, oldest first. A segment that crosses
// midnight is split between the two days.
export function dailyFocus(segments: Segment[], days: number, now: number) {
  const first = addDays(startOfDay(now), -(days - 1));
  const out = Array.from({ length: days }, (_, i) => ({ day: dayKey(addDays(first, i)), start: addDays(first, i), min: 0 }));
  for (const s of segments) {
    if (!STUDY.has(s.activity)) continue;
    for (const d of out) {
      const end = addDays(d.start, 1);
      const overlap = Math.min(s.end, end) - Math.max(s.start, d.start);
      if (overlap > 0) d.min += overlap / 60000;
    }
  }
  return out.map(({ day, min }) => ({ day, min }));
}

// Days in a row with at least `minMin` focused minutes, counting back from today.
// Today not studied yet does not break the streak; yesterday missed does.
export function streak(daily: { min: number }[], minMin = 1) {
  let i = daily.length - 1;
  if (i >= 0 && daily[i].min < minMin) i--;
  let n = 0;
  while (i >= 0 && daily[i].min >= minMin) { n++; i--; }
  return n;
}

export const hms = (sec: number) => {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return n(h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`);
};

// What a session counts right now. `holdAway`: started with "Start anyway" after the camera
// check failed, so it stays Away (clock stopped, alarm as if you walked off) until the camera
// sees your face. Without it, a session with no camera picture counts as focused (timer only).
export type Seen = { state: string; activity: string; face: boolean };
export function observedActivity(cameraMode: boolean, l: Seen | null, holdAway: boolean): Activity {
  if (!cameraMode) return 'FOCUSED';
  if (holdAway && !l?.face) return 'AWAY';
  if (!l) return 'FOCUSED';
  if (l.state !== 'FOCUSED') return l.state as Activity;
  return l.activity === 'LOOKING_AWAY' ? 'IDLE' : (l.activity as Activity);
}

// ---- Weeks (Stage E3 Part 2). weekStart: 0 = Sunday, 1 = Monday, 6 = Saturday (like Date.getDay()).
// Any of the 7 days (Settings drop-down, 2026-10-21; it was Saturday / Sunday / Monday). A damaged value → Monday.
export const validWeekStart = (n: number) => (Number.isInteger(n) && n >= 0 && n <= 6 ? n : 1);
// The seven days of a week in order, as Date.getDay() numbers.
export const weekDays = (weekStart: number) => Array.from({ length: 7 }, (_, i) => (validWeekStart(weekStart) + i) % 7);
// Midnight at the start of the week that contains `ms` (local time).
export function weekStartOf(ms: number, weekStart: number) {
  const day = startOfDay(ms);
  return addDays(day, -((new Date(day).getDay() - validWeekStart(weekStart) + 7) % 7));
}

// This week so far, and last week's phone pickups to compare with. Counted from segment and event start times.
export type WeekReview = {
  start: number; segments: Segment[]; events: (Event & { at: number })[];
  bestDay: { day: number; sec: number } | null;
  top: { name: string; n: number } | undefined;
  pickups: number; lastPickups: number;
};
export function weeklyReview(segments: Segment[], events: (Event & { at: number })[], now: number, weekStart: number): WeekReview {
  const start = weekStartOf(now, weekStart), lastStart = addDays(start, -7);
  const inWeek = (t: number, from: number) => t >= from && t < addDays(from, 7);
  const segs = segments.filter((s) => inWeek(s.start, start));
  const evs = events.filter((e) => inWeek(e.at, start));
  const s = summarize(segs);
  let bestDay: WeekReview['bestDay'] = null;
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    const sec = summarize(segs.filter((g) => g.start >= day && g.start < addDays(day, 1))).focusedSec;
    if (sec > 0 && (!bestDay || sec > bestDay.sec)) bestDay = { day, sec };
  }
  return {
    start, segments: segs, events: evs, bestDay,
    top: distractions(s, evs).top,
    pickups: s.phonePickups,
    lastPickups: summarize(segments.filter((g) => inWeek(g.start, lastStart))).phonePickups,
  };
}
// Plain words, no praise: "12 this week, 5 fewer than last week."
export function pickupsLine(now: number, last: number) {
  if (now === 0 && last === 0) return t('No phone pickups this week or last week.');
  if (now === last) return t('{now} this week, the same as last week.', { now });
  return t(now < last ? '{now} this week, {diff} fewer than last week.' : '{now} this week, {diff} more than last week.', { now, diff: Math.abs(now - last) });
}

// ---- Stats per task and per subject (Stage G1) ----
// A pomodoro = one pomodoro length of focused time, as everywhere else (src/state/todo.ts pomosDone).
export const pomodoros = (focusedSec: number, pomoMin: number) => Math.floor(focusedSec / (Math.max(1, pomoMin) * 60));
export type StatRow = { key: string; name: string; none: boolean; focusedSec: number; pomodoros: number; sessions: number; distractions: number };
type StatData = {
  sessions: { id: number; task_id: number | null }[];
  segments: (Segment & { session_id: number })[];
  events: (Event & { session_id: number })[];
};
// One row per task (or per subject) for the given sessions; sessions without a task (or whose task has no subject, or
// was deleted) go into one "none" row. Most focused time first; the "none" row last.
export function statsBy(data: StatData, tasks: { id: number; title: string; subject_id: number | null; subject: string }[], by: 'task' | 'subject', pomoMin: number): StatRow[] {
  const groups = new Map<string, { name: string; ids: Set<number> }>();
  for (const s of data.sessions) {
    const task = tasks.find((x) => x.id === s.task_id);
    const key = by === 'task' ? (task ? `t${task.id}` : 'none') : task?.subject_id != null ? `s${task.subject_id}` : 'none';
    const name = key === 'none' ? '' : by === 'task' ? task!.title : task!.subject;
    if (!groups.has(key)) groups.set(key, { name, ids: new Set() });
    groups.get(key)!.ids.add(s.id);
  }
  return [...groups].map(([key, g]) => {
    const sum = summarize(data.segments.filter((x) => g.ids.has(x.session_id)));
    const focusedSec = sum.focusedSec;
    return { key, name: g.name, none: key === 'none', focusedSec, pomodoros: pomodoros(focusedSec, pomoMin), sessions: g.ids.size,
      distractions: distractions(sum, data.events.filter((e) => g.ids.has(e.session_id))).total };
  }).sort((a, b) => +a.none - +b.none || b.focusedSec - a.focusedSec || a.name.localeCompare(b.name));
}
