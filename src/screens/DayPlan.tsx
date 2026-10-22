// Day view (Stage E4 Part 3): one day on a time line. Left: what was scheduled (weekly blocks, tasks with a time).
// Right: what was done (real sessions, with focused minutes and task). Click a session for its report.
import { useEffect, useRef, useState } from 'react';
import { bridge, type Range } from '../bridge';
import { addDaysKey, dateKey, keyDate, type Subject, type Task } from '../../electron/planner';
import type { Block } from '../../electron/routines';
import { dayItems, hourRange, type Item } from '../state/day';
import { SessionReport } from './Report';
import { fmtDate, n, t, tk } from '../../electron/i18n';

const HOUR_PX = 44;

export function DayPlan({ tasks, subjects, pomoMin }: { tasks: Task[]; subjects: Subject[]; pomoMin: number }) {
  const today = dateKey(new Date());
  const [date, setDate] = useState(today);
  const [sessions, setSessions] = useState<Range['sessions']>([]);
  const [report, setReport] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]); // that date's blocks (Stage G3: with that day's skip or move)
  useEffect(() => {
    const d0 = keyDate(date).getTime();
    bridge().range(d0, d0 + 86_400_000).then((r) => setSessions(r.sessions));
    bridge().blocks(date, date).then((b) => setBlocks(b.filter((x) => !x.skipped)));
    setReport(null);
  }, [date]);
  const { scheduled, done } = dayItems(date, blocks, tasks, sessions, pomoMin, Date.now(), subjects);
  const [from, to] = hourRange([...scheduled, ...done]);
  const height = (to - from) * HOUR_PX;
  const place = (i: Item) => ({ top: ((i.start - from * 60) / 60) * HOUR_PX, height: Math.max(22, ((i.end - i.start) / 60) * HOUR_PX - 2) });
  // The time line scrolls by itself; it opens an hour before the first item (today: before now, if that is earlier).
  const grid = useRef<HTMLDivElement>(null);
  const firstMin = Math.min(...[...scheduled, ...done].map((i) => i.start), date === today ? new Date().getHours() * 60 : 1440);
  useEffect(() => { grid.current?.scrollTo({ top: Math.max(0, ((firstMin - from * 60) / 60 - 1) * HOUR_PX) }); }, [date, firstMin === 1440, sessions.length]);
  const label = fmtDate(keyDate(date), { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="day-plan">
      <div className="row day-nav">
        <button aria-label={t('Previous day')} onClick={() => setDate(addDaysKey(date, -1))}>‹</button>
        <input type="date" aria-label={t('Day')} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button aria-label={t('Next day')} onClick={() => setDate(addDaysKey(date, 1))}>›</button>
        <button className="link" disabled={date === today} onClick={() => setDate(today)}>{t('Today')}</button>
        <h3>{date === today ? t('Today, {date}', { date: label }) : label}</h3>
      </div>
      <div className="day-grid" ref={grid}>
        <div className="day-hours" style={{ height }} aria-hidden="true">
          {Array.from({ length: to - from }, (_, k) => <span key={k} style={{ top: k * HOUR_PX }}>{n(`${String(from + k).padStart(2, '0')}:00`)}</span>)}
        </div>
        {([[tk('Scheduled'), scheduled, tk('Nothing scheduled: no weekly block on this weekday and no task with a time.')],
           [tk('Done'), done, tk('No sessions on this day.')]] as [string, Item[], string][]).map(([title, items, empty]) => (
          <section key={title} className="day-col" aria-label={t(title)}>
            <h3>{t(title)}</h3>
            <div className="day-lane" style={{ height }}>
              {Array.from({ length: to - from }, (_, k) => <span key={k} className="hour-line" style={{ top: k * HOUR_PX }} />)}
              {!items.length && <p className="muted day-empty">{t(empty)}</p>}
              {items.map((i) => i.kind === 'session'
                ? <button key={i.id} className={`day-item ${i.kind}${report === i.startedAt ? ' on' : ''}`} style={place(i)} onClick={() => setReport(report === i.startedAt ? null : i.startedAt!)}
                          aria-label={t('{title}, {sub}. Show the report', { title: i.title, sub: i.sub })}><b>{i.title}</b><small>{i.sub}</small></button>
                : <div key={i.id} className={`day-item ${i.kind}`} style={place(i)} title={`${i.title} · ${i.sub}`}><b>{i.title}</b><small>{i.sub}</small></div>)}
            </div>
          </section>
        ))}
      </div>
      {report !== null && <div className="day-report">
        <button className="link self-start" onClick={() => setReport(null)}>{t('Close the report')}</button>
        <SessionReport key={report} startedAt={report} />
      </div>}
    </div>
  );
}
