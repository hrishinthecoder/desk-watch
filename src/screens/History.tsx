import { useEffect, useState } from 'react';
import { bridge, type Range } from '../bridge';
import { addDays, dailyFocus, dayKey, hms, pickupsLine, pomodoros, startOfDay, statsBy, streak, weeklyReview } from '../session/accounting';
import type { Task } from '../../electron/planner';
import { DayView, SessionReport, ThreeNumbers } from './Report';
import { fmtDate, n, plural, t, tk } from '../../electron/i18n';

type Period = 'today' | 'week' | 7 | 30 | 'all';
type View = { kind: 'list' } | { kind: 'day'; day: number } | { kind: 'session'; startedAt: number; day: number | null };
const PERIODS: [Period, string][] = [['today', tk('Today')], ['week', tk('This week')], [7, tk('7 days')], [30, tk('30 days')], ['all', tk('All time')]];

export function History({ onStudy, weekStart, pomoMin }: { onStudy: () => void; weekStart: number; pomoMin: number }) {
  const [period, setPeriod] = useState<Period>(7);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [data, setData] = useState<Range | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const now = Date.now();
  const today = startOfDay(now);

  // Everything is loaded: "All time" needs it, and the streak is right whatever period is shown.
  useEffect(() => { bridge().range(0, now + 1).then(setData); bridge().tasks().then(setTasks); }, [view.kind]);

  if (view.kind !== 'list') {
    const back = view.kind === 'session' && view.day !== null ? () => setView({ kind: 'day', day: view.day! }) : () => setView({ kind: 'list' });
    return (
      <div className="history">
        <button className="link back" onClick={back}>← {t('Back')}</button>
        {view.kind === 'day'
          ? <DayView day={view.day} onOpen={(startedAt) => setView({ kind: 'session', startedAt, day: view.day })} />
          : <SessionReport startedAt={view.startedAt} />}
      </div>
    );
  }

  if (!data) return <p className="muted">{t('Loading…')}</p>;
  // A new user: say what will appear here, and the one thing to do.
  if (!data.sessions.length) return (
    <div className="history empty">
      <h2>{t('No sessions yet')}</h2>
      <p className="muted">{t('Your first session will show up here.')}</p>
      <button className="primary" onClick={onStudy}>{t('Go to Study')}</button>
    </div>
  );

  const year = dailyFocus(data.segments, 366, now);
  const days = typeof period === 'number' ? period : 1;
  const from = period === 'all' ? 0 : addDays(today, -(days - 1));
  const inPeriod = { sessions: data.sessions.filter((s) => s.started_at >= from), segments: data.segments.filter((s) => s.start >= from), events: data.events.filter((e) => e.at >= from) };
  const shown = year.slice(-days);
  const max = Math.max(30, ...shown.map((d) => d.min));
  const longDate = (ms: number) => fmtDate(ms, { weekday: 'long', day: 'numeric', month: 'long' });
  const streakDays = streak(year);

  return (
    <div className="history">
      <div className="cards compact" role="radiogroup" aria-label={t('Period')} data-tour="history-period">
        {PERIODS.map(([p, text]) => (
          <button key={p} role="radio" aria-checked={period === p} className="card" onClick={() => setPeriod(p)}><b>{t(text)}</b></button>
        ))}
      </div>
      {period === 'week' && <WeekReview data={data} now={now} weekStart={weekStart} tasks={tasks} pomoMin={pomoMin} />}
      {period === 'week' ? null : period === 'today'
        ? <DayView day={today} title={false} onOpen={(startedAt) => setView({ kind: 'session', startedAt, day: null })} />
        : <div className="history-grid">
          <div className="history-main">
          <ThreeNumbers segments={inPeriod.segments} events={inPeriod.events} />
          <section className="chart-card">
          {period !== 'all' && <h3>{t('Focused minutes per day')}</h3>}
          {period !== 'all' && <div className="bars" data-tour="bars" role="group" aria-label={t('Focused minutes per day, last {days} days', { days })}>
            {shown.map((d, i) => {
              const dayStart = addDays(from, i);
              const isToday = d.day === dayKey(now);
              const label = isToday ? t('Today') : fmtDate(dayStart, days <= 7 ? { weekday: 'short' } : { day: 'numeric' });
              const p = pomodoros(d.min * 60, pomoMin);
              return (
                <button key={d.day} className={isToday ? 'bar today' : 'bar'} aria-label={t('{date}: {m} focused minutes, {p} pomodoros', { date: longDate(dayStart), m: Math.round(d.min), p })}
                        title={t('{m} focused min · {p} pomodoros', { m: Math.round(d.min), p })} onClick={() => setView({ kind: 'day', day: dayStart })}>
                  <small className="bar-pomos" aria-hidden="true">{p ? n(p) : ''}</small>
                  <span className="bar-track"><span className="bar-fill" style={{ height: `${(d.min / max) * 100}%` }} /></span>
                  <small>{days <= 7 || isToday || i % 5 === 0 ? label : ''}</small>
                </button>
              );
            })}
          </div>}
          <p className="muted">{period !== 'all' && <>{t('Click a day to see its sessions.')} {t('The number above a day is its pomodoros.')} </>}{streakDays ? t(plural(streakDays, 'Day streak: {n} day.', 'Day streak: {n} days.'), { n: streakDays }) : ''}</p>
          </section>
          </div>
          <ByTable data={inPeriod} tasks={tasks} pomoMin={pomoMin} />
        </div>}
    </div>
  );
}

const dayName = (ms: number) => fmtDate(ms, { weekday: 'long' });
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// This week so far (Stage E3): the same three numbers, then best day, top distraction and
// phone pickups against last week. Plain sentences, no praise.
function WeekReview({ data, now, weekStart, tasks, pomoMin }: { data: Range; now: number; weekStart: number; tasks: Task[]; pomoMin: number }) {
  const r = weeklyReview(data.segments, data.events, now, weekStart);
  const week = { sessions: data.sessions.filter((s) => s.started_at >= r.start), segments: data.segments.filter((s) => s.start >= r.start), events: data.events.filter((e) => e.at >= r.start) };
  const from = fmtDate(r.start, { weekday: 'long', day: 'numeric', month: 'long' });
  if (!r.segments.length) return <p className="muted">{t('No sessions this week yet (the week started on {date}).', { date: from })}</p>;
  return (
    <div className="history-grid">
      <div className="history-main">
      <ThreeNumbers segments={r.segments} events={r.events} />
      <dl className="review chart-card">
        <dt>{t('Best day')}</dt>
        <dd>{r.bestDay ? t('{day}, {time} focused.', { day: dayName(r.bestDay.day), time: hms(r.bestDay.sec) }) : t('No focused time yet.')}</dd>
        <dt>{t('Top distraction')}</dt>
        <dd>{r.top ? t(plural(r.top.n, '{name}, {n} time.', '{name}, {n} times.'), { name: cap(t(r.top.name)), n: r.top.n }) : t('None this week.')}</dd>
        <dt>{t('Phone pickups')}</dt>
        <dd>{pickupsLine(r.pickups, r.lastPickups)}</dd>
      </dl>
      <p className="muted">{t('The week started on {date}.', { date: from })}</p>
      </div>
      <ByTable data={week} tasks={tasks} pomoMin={pomoMin} />
    </div>
  );
}

// Focused time, pomodoros, sessions and distractions per task or per subject (Stage G1).
const BY: ['task' | 'subject', string, string][] = [['task', tk('By task'), tk('Task')], ['subject', tk('By subject'), tk('Subject')]];
function ByTable({ data, tasks, pomoMin }: { data: Pick<Range, 'sessions' | 'segments' | 'events'>; tasks: Task[]; pomoMin: number }) {
  const [by, setBy] = useState<'task' | 'subject'>('task');
  const rows = statsBy(data, tasks, by, pomoMin);
  if (!rows.length) return null;
  return (
    <section className="by-table">
      <header><h3>{t('Breakdown')}</h3>
      <div className="cards compact" role="radiogroup" aria-label={t('Stats')}>
        {BY.map(([k, text]) => <button key={k} role="radio" aria-checked={by === k} className="card" onClick={() => setBy(k)}><b>{t(text)}</b></button>)}
      </div></header>
      <table>
        <thead><tr><th>{t(BY.find(([k]) => k === by)![2])}</th><th>{t('Focused')}</th><th>{t('Pomodoros')}</th><th>{t('Sessions')}</th><th>{t('Distractions')}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.none ? 'muted' : undefined}>
              <td>{r.none ? (by === 'task' ? t('No task') : t('No subject')) : r.name}</td>
              <td>{hms(r.focusedSec)}</td><td>{n(r.pomodoros)}</td><td>{n(r.sessions)}</td><td>{n(r.distractions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
