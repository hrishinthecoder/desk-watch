import { useEffect, useState } from 'react';
import { bridge, type Range } from '../bridge';
import { UsageView } from './ScreenMode';
import { fmtDate, fmtTime, n, plural, t, tk } from '../../electron/i18n';
import { DEFAULTS } from '../state/config';
import { activityText, distractions, hms, pomodoros, reportSentence, summarize, timelineBlocks, type Activity, type Event, type Lane, type Segment } from '../session/accounting';

const ORDER: Activity[] = ['WRITING', 'READING', 'SPEAKING', 'IDLE', 'FOCUSED', 'LOOKING_AWAY', 'PHONE', 'PHONE_CALL', 'DOWN', 'AWAY', 'BREAK', 'PAUSED'];
const time = (ms: number) => fmtTime(ms);
const DAY = 24 * 3600_000;
type Events = Range['events'];

// Reports lead with three numbers (DESIGN.md): focused time, distractions, longest focus streak.
// History uses the same three, so every screen matches.
export function ThreeNumbers({ segments, events }: { segments: Segment[]; events: Event[] }) {
  const s = summarize(segments);
  const d = distractions(s, events);
  const pct = s.totalSec ? Math.round((100 * s.focusedSec) / s.totalSec) : 0;
  return (
    <div className="numbers" data-tour="numbers">
      <div><b>{hms(s.focusedSec)}</b><small>{t('Focused · {pct}% of {total}', { pct, total: hms(s.totalSec) })}</small></div>
      <div><b>{n(d.total)}</b><small>{t(plural(d.total, 'Distraction', 'Distractions'))}</small>{d.line && <small className="breakdown">{d.line.split(' · ').map((p, i) => <span key={i}>{i ? ' · ' : ''}<span className="nowrap">{p}</span></span>)}</small>}</div>
      <div><b>{hms(s.longestFocusSec)}</b><small>{t('Longest focus streak')}</small></div>
    </div>
  );
}

// Three labelled rows: the row (position) says what kind of time it was, not the colour alone.
// Hover or keyboard focus on a block says exactly what it was, when and how long.
const LANES: [Lane, string][] = [['study', tk('Studying')], ['distracted', tk('Distracted')], ['break', tk('Break / Pause')]];
export function Timeline({ segments, events = [] }: { segments: Segment[]; events?: Events }) {
  const [said, setSaid] = useState('');
  if (!segments.length) return null;
  const blocks = timelineBlocks(segments, events);
  const from = Math.min(...segments.map((s) => s.start));
  const span = Math.max(1, Math.max(...segments.map((s) => s.end)) - from);
  const describe = (b: (typeof blocks)[number]) => b.end > b.start ? `${b.text} · ${time(b.start)} · ${hms((b.end - b.start) / 1000)}` : `${b.text} · ${time(b.start)}`;
  return (
    <div className="timeline">
      {LANES.map(([lane, name]) => (
        <div key={lane} className={`lane lane-${lane}`}>
          <span className="lane-name">{t(name)}</span>
          <div className="lane-track">
            {blocks.filter((b) => b.lane === lane).map((b, i) => (
              <span key={i} tabIndex={0} aria-label={describe(b)} className={b.end > b.start ? 'block' : 'block moment'}
                    style={{ left: `${((b.start - from) / span) * 100}%`, width: `${((b.end - b.start) / span) * 100}%` }}
                    onMouseEnter={() => setSaid(describe(b))} onFocus={() => setSaid(describe(b))}
                    onMouseLeave={() => setSaid('')} onBlur={() => setSaid('')} />
            ))}
          </div>
        </div>
      ))}
      <div className="lane-times"><small>{time(from)}</small><small>{time(from + span)}</small></div>
      <p className="timeline-said muted" aria-live="polite">{said || t('Point at a block, or press Tab, to see what it was.')}</p>
    </div>
  );
}

// Everything else, on demand.
function Details({ segments, data }: { segments: Segment[]; data: Range }) {
  const s = summarize(segments);
  const pct = (sec: number) => (s.totalSec ? Math.round((100 * sec) / s.totalSec) : 0);
  return (
    <details className="more-panel">
      <summary>{t('Show details')}</summary>
      <table>
        <tbody>
          {ORDER.filter((a) => s.bySec[a]).map((a) => (
            <tr key={a}><td>{activityText(a)}</td><td>{hms(s.bySec[a])}</td><td>{n(pct(s.bySec[a]))}%</td></tr>
          ))}
        </tbody>
      </table>
      <UsageView data={data} />
    </details>
  );
}

// After a session: loads it back from the database, so it shows exactly what was saved.
export function SessionReport({ startedAt }: { startedAt: number }) {
  const [data, setData] = useState<Range | null>(null);
  const [task, setTask] = useState<string | null>(null);
  useEffect(() => { bridge().range(startedAt, startedAt + 1).then(async (d) => {
    setData(d);
    const id = d.sessions[0]?.task_id;
    setTask(id ? (await bridge().tasks()).find((x) => x.id === id)?.title ?? null : null);
  }); }, [startedAt]);
  if (!data) return <p className="muted">{t('Loading…')}</p>;
  const sess = data.sessions[0];
  // Pomodoros of this session (Stage G1): its focused time in pomodoros of the current length.
  const pomoMin = { ...DEFAULTS, ...bridge().getSettings() }.pomoMin;
  const p = pomodoros(summarize(data.segments).focusedSec, pomoMin);
  return (
    <div className="report">
      <h2>{t('Session report')}</h2>
      {sess && <p className="muted">{fmtDate(sess.started_at, { weekday: 'short', day: 'numeric', month: 'short' })} {time(sess.started_at)}
        {sess.ended_early ? ` · ${t('ended early')}` : ` · ${t('goal reached')}`}
        {task ? ` · ${t('Task: {title}', { title: task })}` : ''}
        {` · ${t(plural(p, '{n} pomodoro', '{n} pomodoros'), { n: p })}`}</p>}
      {sess && <p className="sentence">{reportSentence(summarize(data.segments), sess.planned_min, !!sess.camera_mode)}</p>}
      <ThreeNumbers segments={data.segments} events={data.events} />
      <section className="chart-card"><h3>{t('Timeline')}</h3><Timeline segments={data.segments} events={data.events} /></section>
      <Details segments={data.segments} data={data} />
    </div>
  );
}

// All sessions of one day added together, then each session on its own.
export function DayView({ day, onOpen, title = true }: { day: number; onOpen: (startedAt: number) => void; title?: boolean }) {
  const [data, setData] = useState<Range | null>(null);
  useEffect(() => { bridge().range(day, day + DAY).then(setData); }, [day]);
  if (!data) return <p className="muted">{t('Loading…')}</p>;
  return (
    <div className="report">
      {title && <h2>{fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>}
      {data.sessions.length === 0 ? <p className="muted">{t('No sessions this day.')}</p> : <>
        <ThreeNumbers segments={data.segments} events={data.events} />
        <h3>{t(plural(data.sessions.length, '{n} session', '{n} sessions'), { n: data.sessions.length })}</h3>
        <ul className="sessions">
          {data.sessions.map((s) => (
            <li key={s.id}>
              <button className="link" onClick={() => onOpen(s.started_at)}>
                {time(s.started_at)}–{s.ended_at ? time(s.ended_at) : '…'} · {t('{time} focused of {min} min', { time: hms(s.focused_sec ?? 0), min: s.planned_min })}
              </button>
              <Timeline segments={data.segments.filter((g) => g.session_id === s.id)} events={data.events.filter((e) => e.session_id === s.id)} />
            </li>
          ))}
        </ul>
        <Details segments={data.segments} data={data} />
      </>}
    </div>
  );
}
