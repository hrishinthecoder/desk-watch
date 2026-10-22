// Planner (Stage E): the to-do list (Stage E4, src/screens/Todo.tsx), a board, the week with routines (Stage G3,
// src/screens/Routines.tsx) and the Day view.
// Clicking a routine block fills in the Study tab (you still press Start).
import { useEffect, useRef, useState } from 'react';
import { bridge } from '../bridge';
import { hhmm, moved, moveStatus, sortTasks, STATUSES, type Routine, type Status, type Subject, type Task } from '../../electron/planner';
import { days, estPomos, hoursMin, pomosDone, progressOf } from '../state/todo';
import { QuickAdd, TaskPanel, Todo, useSubjects } from './Todo';
import { DayPlan } from './DayPlan';
import { Routines } from './Routines';
import { playCue } from '../session/sounds';
import { Icon } from './icons';
import { n, t as tr, tk } from '../../electron/i18n'; // "t" is a task in this file

type View = 'list' | 'board' | 'week' | 'day';
const STATUS_TEXT: Record<Status, string> = { todo: tk('To do'), doing: tk('Doing'), done: tk('Done') };
const VIEW_TEXT: Record<View, string> = { list: tk('List'), board: tk('Board'), week: tk('Week'), day: tk('Day') };

export function usePlanner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const reload = async () => { setTasks(await bridge().tasks()); setRoutines(await bridge().routines()); };
  useEffect(() => { reload(); }, []);
  return { tasks, routines, reload };
}

export function Planner({ onOpenBlock, onStartTask, weekStart, pomoMin, dailyPomos }: { onOpenBlock: (id: number) => void; onStartTask: (t: Task) => void; weekStart: number; pomoMin: number; dailyPomos: number }) {
  const [view, setView] = useState<View>('list');
  const { tasks, routines, reload } = usePlanner();
  const { subjects, reloadSubjects } = useSubjects();
  return (
    <div className="planner">
      <div className="cards compact" role="radiogroup" aria-label={tr('View')} data-tour="planner-views">
        {(['list', 'board', 'week', 'day'] as View[]).map((v) => (
          <button key={v} role="radio" className="card" aria-checked={view === v} onClick={() => setView(v)}><b>{tr(VIEW_TEXT[v])}</b></button>
        ))}
      </div>
      {view === 'list' && <Todo tasks={tasks} reload={reload} weekStart={weekStart} pomoMin={pomoMin} dailyPomos={dailyPomos} onStart={onStartTask} />}
      {view === 'day' && <DayPlan tasks={tasks} subjects={subjects} pomoMin={pomoMin} />}
      {view === 'board' && <QuickAdd list="all" d={days(new Date(), weekStart)} pomoMin={pomoMin} subjects={subjects} reloadSubjects={reloadSubjects} reload={reload} />}
      {view === 'board' && !tasks.length && <Empty title={tr('No tasks yet')} text={tr('Type a task above and press Enter. Drag it from To do to Doing to Done.')} />}
      {view === 'board' && tasks.length > 0 && <Board tasks={tasks} reload={reload} subjects={subjects} pomoMin={pomoMin} onStart={onStartTask} />}
      {view === 'week' && <Routines tasks={tasks} subjects={subjects} weekStart={weekStart} onOpenBlock={onOpenBlock} reload={reload} />}
    </div>
  );
}

// What a new user sees instead of an empty table.
const Empty = ({ title, text }: { title: string; text: string }) => <div className="empty"><h3>{title}</h3><p className="muted">{text}</p></div>;

// The board (Stage G2): the SAME tasks as the to-do list, one column per status. Compact cards (subject, estimate,
// progress); a click (or Enter) opens the list's side panel; dragging inside a column reorders it with the list's own
// order (`sort`), dragging to another column changes the status (Done = completed, as in the list); ← → move a card.
const ALL = 'all', NONE = 'none';
function Board({ tasks, reload, subjects, pomoMin, onStart }: { tasks: Task[]; reload: () => Promise<void>; subjects: Subject[]; pomoMin: number; onStart: (t: Task) => void }) {
  const [subject, setSubject] = useState(ALL);
  const [openId, setOpenId] = useState<number | null>(null);
  const shown = tasks.filter((t) => subject === ALL || (subject === NONE ? t.subject_id === null : t.subject_id === Number(subject)));
  const column = (s: Status) => sortTasks(shown.filter((t) => t.status === s));
  const open = tasks.find((t) => t.id === openId) ?? null;
  const setStatus = async (t: Task, status: Status) => {
    if (status === t.status) return;
    if (status === 'done') await bridge().completeTask(t.id);
    else if (t.status === 'done') await bridge().uncompleteTask(t.id, status, null);
    else await bridge().saveTask({ ...t, status });
  };
  // Dropped on a card: before it (in that card's column); dropped on a column's empty space: at its end.
  async function drop(id: number, s: Status, before: number | null) {
    const t = tasks.find((x) => x.id === id);
    if (!t || id === before) return;
    await setStatus(t, s);
    await bridge().reorderTasks(moved(column(s).map((x) => x.id).filter((x) => x !== id).concat(id), id, { before }));
    await reload();
  }
  const move = async (t: Task, status: Status) => { await setStatus(t, status); await reload(); };
  const onKey = (e: React.KeyboardEvent, t: Task) => {
    if (e.target !== e.currentTarget) return; // a button inside the card
    if (e.key === 'Enter') setOpenId(t.id);
    else if (e.key === 'ArrowLeft' && t.status !== 'todo') move(t, moveStatus(t.status, -1));
    else if (e.key === 'ArrowRight' && t.status !== 'done') move(t, moveStatus(t.status, 1));
    else return;
    e.preventDefault();
  };
  return (
    <div className={`board-view${open ? ' with-panel' : ''}`}>
      <label className="field board-filter">{tr('Subject')}
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value={ALL}>{tr('All subjects')}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          <option value={NONE}>{tr('No subject')}</option>
        </select>
      </label>
      <div className="board">
        {STATUSES.map((s) => (
          <section key={s} className="col" aria-label={tr(STATUS_TEXT[s])} onDragOver={(e) => e.preventDefault()}
                   onDrop={(e) => { e.preventDefault(); drop(Number(e.dataTransfer.getData('text/plain')), s, null); }}>
            <h3>{tr(STATUS_TEXT[s])}</h3>
            {column(s).map((t) => {
              const prog = progressOf(t.focused_sec, t.est_min);
              return (
                <div key={t.id} className={`task-card${openId === t.id ? ' open' : ''}`} draggable tabIndex={0} aria-label={t.title}
                     onDragStart={(e) => e.dataTransfer.setData('text/plain', String(t.id))}
                     onDragOver={(e) => e.preventDefault()}
                     onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(Number(e.dataTransfer.getData('text/plain')), s, t.id); }}
                     onClick={() => setOpenId(t.id)} onKeyDown={(e) => onKey(e, t)}>
                  <span className="card-title">{t.title}</span>
                  <small className="card-meta">
                    {[t.subject, prog?.text ?? ''].filter(Boolean).join(' · ')}
                  </small>
                  {prog?.frac != null ? <span className={`card-progress${prog.over ? ' over' : ''}`} aria-hidden="true"><span style={{ width: `${100 * prog.frac}%` }} /></span> : null}
                  <span className="row card-move" onClick={(e) => e.stopPropagation()}>
                    <button aria-label={tr('Move {title} left', { title: t.title })} disabled={s === 'todo'} onClick={() => move(t, moveStatus(s, -1))}>←</button>
                    <button aria-label={tr('Move {title} right', { title: t.title })} disabled={s === 'done'} onClick={() => move(t, moveStatus(s, 1))}>→</button>
                  </span>
                </div>
              );
            })}
          </section>
        ))}
      </div>
      {open && <TaskPanel key={open.id} task={open} subjects={subjects} pomoMin={pomoMin} reload={reload} onClose={() => setOpenId(null)}
                          onStart={() => onStart(open)} onComplete={async () => { await move(open, open.status === 'done' ? 'todo' : 'done'); }}
                          onDelete={async () => { if (!confirm(tr('Delete “{title}”?', { title: open.title }))) return; setOpenId(null); await bridge().deleteTask(open.id); await reload(); }} />}
    </div>
  );
}

// In-app reminder when a routine block starts (works with Windows notifications switched off):
// a bar above every tab and a short sound. "Get it ready" fills in the Study tab; you press Start.
export function ReminderBar({ volume, onReady }: { volume: number; onReady: (id: number) => void }) {
  const [r, setR] = useState<{ id: number; text: string } | null>(null);
  const vol = useRef(volume);
  vol.current = volume;
  useEffect(() => bridge().onReminder(async (id) => {
    const [routines, tasks] = await Promise.all([bridge().routines(), bridge().tasks()]);
    const b = routines.find((x) => x.id === id);
    if (!b) return;
    setR({ id, text: tr('Study block at {time}: {task} ({min} min)', { time: hhmm(b.start_min), task: tasks.find((t) => t.id === b.task_id)?.title ?? tr('study'), min: b.length_min }) });
    playCue(vol.current);
  }), []);
  if (!r) return null;
  return (
    <div className="reminder note-bar remind" role="alert">
      <Icon name="clock" size={18} /><span>{r.text}</span><span className="grow-gap" />
      <button className="small quiet" onClick={() => setR(null)}>{tr('Dismiss')}</button>
      <button className="small primary-sm" onClick={() => { onReady(r.id); setR(null); }}>{tr('Get it ready')}</button>
    </div>
  );
}
