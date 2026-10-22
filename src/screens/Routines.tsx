// Routines (Stage G3): the Planner's Week view. A routine (e.g. "HSC weekly") is a named set of weekly time slots;
// one routine is on at a time. The week shows the real dates, where one day's block can be skipped or moved.
// The editor changes today and later only (electron/routines.ts); past days and sessions never change.
import { useEffect, useState } from 'react';
import { bridge, type BlockSets } from '../bridge';
import { addDaysKey, dateKey, hhmm, keyDate, type Subject, type Task } from '../../electron/planner';
import { copyDay, type Block, type RoutineSet, type Slot } from '../../electron/routines';
import { days as weekOf } from '../state/todo';
import { fmtDate, n, t as tr, weekdayName } from '../../electron/i18n'; // "t" is a task in this file

type SetInfo = RoutineSet & { active: boolean; slots: Slot[] };
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; // for <input type="time">
const fromTime = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
const newSlot = (day: number): Slot => ({ days: [day], start_min: 17 * 60, length_min: 60, task_id: null, subject_id: null, camera_mode: 1, screen_mode: 0, block_set_id: null });

export function Routines({ tasks, subjects, weekStart, onOpenBlock, reload }: {
  tasks: Task[]; subjects: Subject[]; weekStart: number; onOpenBlock: (id: number) => void; reload: () => Promise<void>;
}) {
  const today = dateKey(new Date());
  const [sets, setSets] = useState<SetInfo[] | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [weekShift, setWeekShift] = useState(0);
  const [editing, setEditing] = useState<SetInfo | 'new' | null>(null);
  const from = addDaysKey(weekOf(new Date(), weekStart).weekFrom, 7 * weekShift);
  const dates = Array.from({ length: 7 }, (_, i) => addDaysKey(from, i));
  const load = async () => {
    setSets(await bridge().routineSets());
    setBlocks(await bridge().blocks(dates[0], dates[6]));
    await reload(); // the rest of the Planner (and the Study tab's "next" line) sees the change
  };
  useEffect(() => { load(); }, [from]);
  const on = sets?.find((s) => s.active) ?? null;

  if (!sets) return <p className="muted">{tr('Loading…')}</p>;
  if (editing) return <RoutineEditor set={editing === 'new' ? null : editing} tasks={tasks} subjects={subjects} weekStart={weekStart}
                                     onDone={async () => { setEditing(null); await load(); }} />;
  return (
    <div className="week-view">
      <div className="row routine-bar">
        <label className="field routine-pick">{tr('Routine')}
          <select value={on?.id ?? ''} onChange={async (e) => { await bridge().activateRoutine(e.target.value ? Number(e.target.value) : null); await load(); }}>
            <option value="">{tr('None (no blocks)')}</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {on && <button onClick={() => setEditing(on)}>{tr('Edit routine')}</button>}
        <button className="primary-sm" onClick={() => setEditing('new')}>{tr('New routine')}</button>
      </div>
      <p className="muted">{tr('One routine is on at a time. Switching or editing changes today and later; past days keep their plan.')}</p>
      <div className="row week-nav">
        <button aria-label={tr('Previous week')} onClick={() => setWeekShift(weekShift - 1)}>‹</button>
        <b>{fmtDate(keyDate(dates[0]), { day: 'numeric', month: 'short' })} – {fmtDate(keyDate(dates[6]), { day: 'numeric', month: 'short' })}</b>
        <button aria-label={tr('Next week')} onClick={() => setWeekShift(weekShift + 1)}>›</button>
        <button className="link" disabled={weekShift === 0} onClick={() => setWeekShift(0)}>{tr('This week')}</button>
      </div>
      {!sets.length && <div className="empty"><h3>{tr('No routine yet')}</h3><p className="muted">{tr('A routine is your study times for a week, e.g. "HSC weekly": each time slot on one or more days. When a block starts, Desk Watch reminds you.')}</p></div>}
      <div className="week">
        {dates.map((d) => (
          <section key={d} className={`col${d === today ? ' today' : ''}`} aria-label={fmtDate(keyDate(d), { weekday: 'long', day: 'numeric', month: 'long' })}>
            <h3>{weekdayName(keyDate(d).getDay(), 'short')} {n(String(keyDate(d).getDate()))}</h3>
            {blocks.filter((b) => b.date === d).map((b) => <WeekBlock key={b.id} b={b} past={d < today} tasks={tasks} subjects={subjects} onOpen={onOpenBlock} onChanged={load} />)}
          </section>
        ))}
      </div>
    </div>
  );
}

// One block on one date: Get it ready (opens the Study tab), and for today or later: skip it or change its time,
// on that date only.
function WeekBlock({ b, past, tasks, subjects, onOpen, onChanged }: { b: Block; past: boolean; tasks: Task[]; subjects: Subject[]; onOpen: (id: number) => void; onChanged: () => Promise<void> }) {
  const [moving, setMoving] = useState(false);
  const [time, setTime] = useState({ start: toTime(b.start_min), end: toTime(b.start_min + b.length_min) });
  const [msg, setMsg] = useState('');
  const name = tasks.find((x) => x.id === b.task_id)?.title ?? subjects.find((s) => s.id === b.subject_id)?.name ?? tr('Study');
  const when = `${hhmm(b.start_min)}–${hhmm(b.start_min + b.length_min)}`;
  async function move() {
    const start = fromTime(time.start);
    const problem = await bridge().dayChange(b.id, b.date, { start_min: start, length_min: fromTime(time.end) - start });
    setMsg(problem ?? '');
    if (!problem) { setMoving(false); await onChanged(); }
  }
  return (
    <div className={`block${b.skipped ? ' skipped' : ''}`}>
      <button className="block-open" disabled={b.skipped} title={tr('Get this block ready on the Study tab')} onClick={() => onOpen(b.id)}>
        <b>{when}</b><span>{name}</span>
        <small>{b.skipped ? tr('Skipped this day') : b.moved ? tr('Moved this day') : [b.camera_mode ? tr('Camera') : '', b.screen_mode ? tr('Screen') : ''].filter(Boolean).join(' · ') || tr('Timer only')}</small>
      </button>
      {!past && <span className="row block-day">
        {b.skipped || b.moved
          ? <button className="link" onClick={async () => { await bridge().clearDayChange(b.id, b.date); await onChanged(); }}>{tr('Undo')}</button>
          : <>
            <button className="link" onClick={async () => { await bridge().dayChange(b.id, b.date, { skip: true }); await onChanged(); }}>{tr('Skip this day')}</button>
            <button className="link" aria-expanded={moving} onClick={() => setMoving(!moving)}>{tr('Change this day')}</button>
          </>}
      </span>}
      {moving && <div className="block-move">
        <input type="time" aria-label={tr('Start time')} value={time.start} onChange={(e) => setTime({ ...time, start: e.target.value })} />
        <input type="time" aria-label={tr('End time')} value={time.end} onChange={(e) => setTime({ ...time, end: e.target.value })} />
        <button className="primary-sm" onClick={move}>{tr('Save')}</button>
        {msg && <p className="warn">{msg}</p>}
      </div>}
    </div>
  );
}

// The routine editor: name, on/off, time slots (days, start, end, subject or task, camera, screen, block set),
// "Copy this day to…". Nothing is saved until every block fits; every clash is named.
function RoutineEditor({ set, tasks, subjects, weekStart, onDone }: { set: SetInfo | null; tasks: Task[]; subjects: Subject[]; weekStart: number; onDone: () => Promise<void> }) {
  const order = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
  const [name, setName] = useState(set?.name ?? '');
  const [active, setActive] = useState(set?.active ?? false);
  const [slots, setSlots] = useState<Slot[]>(set?.slots.length ? set.slots : [newSlot(order[0])]);
  const [copy, setCopy] = useState<{ from: number; to: number[] }>({ from: order[0], to: [] });
  const [problems, setProblems] = useState<string[]>([]);
  const [sets, setBlockSets] = useState<BlockSets | null>(null);
  useEffect(() => { bridge().blockSets().then(setBlockSets); }, []);
  const edit = (i: number, x: Partial<Slot>) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...x } : s)));
  const forValue = (s: Slot) => (s.task_id ? `task:${s.task_id}` : s.subject_id ? `subject:${s.subject_id}` : '');
  const setFor = (i: number, v: string) => edit(i, { task_id: v.startsWith('task:') ? Number(v.slice(5)) : null, subject_id: v.startsWith('subject:') ? Number(v.slice(8)) : null });
  const toggle = (list: number[], d: number) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort((a, b) => a - b));

  async function save() {
    const r = await bridge().saveRoutineSet({ ...(set ? { id: set.id } : {}), name, slots });
    if (r.problems.length) return setProblems(r.problems);
    if (active !== (set?.active ?? false) || (!set && active)) await bridge().activateRoutine(active ? r.id! : null);
    await onDone();
  }
  return (
    <div className="routine-editor" aria-label={tr('Routine editor')}>
      <h2>{set ? tr('Edit routine') : tr('New routine')}</h2>
      <div className="row">
        <label className="field">{tr('Name')}<input value={name} maxLength={60} placeholder={tr('e.g. HSC weekly')} onChange={(e) => setName(e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />{tr('On (switches the others off)')}</label>
      </div>
      <p className="muted">{tr('Changes apply from today; past days keep their plan, and sessions and stats never change.')}</p>
      <table className="slots">
        <thead><tr><th>{tr('Days')}</th><th>{tr('Start time')}</th><th>{tr('End time')}</th><th>{tr('For')}</th><th>{tr('Camera')}</th><th>{tr('Screen')}</th><th /></tr></thead>
        <tbody>
          {slots.map((s, i) => (
            <tr key={i}>
              <td><span className="day-chips" role="group" aria-label={tr('Days of time slot {n}', { n: i + 1 })}>
                {order.map((d) => <button key={d} aria-pressed={s.days.includes(d)} aria-label={weekdayName(d)} onClick={() => edit(i, { days: toggle(s.days, d) })}>{weekdayName(d, 'short')}</button>)}
              </span></td>
              <td><input type="time" aria-label={tr('Start of time slot {n}', { n: i + 1 })} value={toTime(s.start_min)}
                         onChange={(e) => e.target.value && edit(i, { start_min: fromTime(e.target.value), length_min: s.start_min + s.length_min - fromTime(e.target.value) })} /></td>
              <td><input type="time" aria-label={tr('End of time slot {n}', { n: i + 1 })} value={toTime((s.start_min + s.length_min) % 1440)}
                         onChange={(e) => e.target.value && edit(i, { length_min: (fromTime(e.target.value) || 1440) - s.start_min })} /></td>
              <td><select aria-label={tr('What time slot {n} is for', { n: i + 1 })} value={forValue(s)} onChange={(e) => setFor(i, e.target.value)}>
                <option value="">{tr('Study (no subject)')}</option>
                {subjects.length > 0 && <optgroup label={tr('Subjects')}>{subjects.map((x) => <option key={x.id} value={`subject:${x.id}`}>{x.name}</option>)}</optgroup>}
                {tasks.some((x) => x.status !== 'done') && <optgroup label={tr('Tasks')}>{tasks.filter((x) => x.status !== 'done' || x.id === s.task_id).map((x) => <option key={x.id} value={`task:${x.id}`}>{x.title}</option>)}</optgroup>}
              </select></td>
              <td><input type="checkbox" aria-label={tr('Camera mode')} checked={!!s.camera_mode} onChange={(e) => edit(i, { camera_mode: +e.target.checked })} /></td>
              <td><span className="row">
                <input type="checkbox" aria-label={tr('Blocker mode')} checked={!!s.screen_mode} onChange={(e) => edit(i, { screen_mode: +e.target.checked, block_set_id: e.target.checked ? s.block_set_id : null })} />
                {!!s.screen_mode && <select aria-label={tr('Block set')} value={s.block_set_id ?? ''} onChange={(e) => edit(i, { block_set_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">{tr('Set chosen on the Study tab')}</option>
                  {sets?.sets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>}
              </span></td>
              <td><button className="link" aria-label={tr('Remove time slot {n}', { n: i + 1 })} onClick={() => setSlots(slots.filter((_, j) => j !== i))}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setSlots([...slots, newSlot(order[0])])}>{tr('+ Time slot')}</button>
      <div className="row copy-day">
        <label className="field">{tr('Copy this day')}
          <select value={copy.from} onChange={(e) => setCopy({ ...copy, from: Number(e.target.value) })}>{order.map((d) => <option key={d} value={d}>{weekdayName(d)}</option>)}</select>
        </label>
        <span>{tr('to')}</span>
        <span className="day-chips" role="group" aria-label={tr('Copy to these days')}>
          {order.filter((d) => d !== copy.from).map((d) => <button key={d} aria-pressed={copy.to.includes(d)} aria-label={weekdayName(d)} onClick={() => setCopy({ ...copy, to: toggle(copy.to, d) })}>{weekdayName(d, 'short')}</button>)}
        </span>
        <button disabled={!copy.to.length} onClick={() => { setSlots(copyDay(slots, copy.from, copy.to)); setCopy({ ...copy, to: [] }); }}>{tr('Copy')}</button>
      </div>
      {problems.length > 0 && <div className="warn" role="alert"><p>{tr('Nothing was saved:')}</p><ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
      <div className="row">
        <button className="primary" onClick={save}>{tr('Save routine')}</button>
        <button onClick={onDone}>{tr('Cancel')}</button>
        {set && <button className="danger-text" onClick={async () => { if (confirm(tr('Delete the routine “{name}”? Its blocks go too (also from past days’ plan); sessions and stats stay.', { name: set.name }))) { await bridge().deleteRoutineSet(set.id); await onDone(); } }}>{tr('Delete routine')}</button>}
      </div>
    </div>
  );
}
