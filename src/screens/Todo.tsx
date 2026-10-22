// To-do list (Stage E4 Part 1): lists on the left, the stats row, quick add and the tasks; a task opens in a side
// panel. Replaces the Planner's old List view. Rules in src/state/todo.ts; storage in electron/db.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import { bridge } from '../bridge';
import { hhmm, moved, REPEATS, type Repeat, type Subject, type Task } from '../../electron/planner';
import { hms, STUDY } from '../session/accounting';
import { estimateLine, goalLine } from '../state/day';
import {
  days, estMinutes, estPomos, estText, hoursMin, inList, isOverdue, listDefaults, listTasks, LISTS, minutesLeft, MAX_POMOS, parseQuick, pomosDone, progressOf, search, shortDate,
  type Days, type ListId,
} from '../state/todo';
import { n, plural, t as tr, tk } from '../../electron/i18n'; // "t" is a task in this file

const PRIORITY_TEXT: Record<number, string> = { 1: tk('High'), 2: tk('Normal'), 3: tk('Low') };
const REPEAT_TEXT: Record<Repeat, string> = { none: tk('Does not repeat'), daily: tk('Every day'), weekdays: tk('Every weekday (Mon–Fri)'), weekly: tk('Every week') };
const UNDO_MS = 5000;
const TICK_MS = 350; // the tick animation, before the task moves to Completed
const errText = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const typing = (e: EventTarget | null) => e instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) || e.isContentEditable);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const reload = async () => setSubjects(await bridge().subjects());
  useEffect(() => { reload(); }, []);
  return { subjects, reloadSubjects: reload };
};

// Study time today, from the saved segments (a running session is included up to its last save, ≤ 10 s ago).
function useFocusedToday(tasks: Task[]) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    bridge().range(from.getTime(), Date.now() + 1).then((r) =>
      setSec(r.segments.filter((s) => STUDY.has(s.activity)).reduce((a, s) => a + (s.end - s.start) / 1000, 0)));
  }, [tasks]);
  return sec;
}

type Toast = { text: string; undo?: () => Promise<void>; expire?: () => Promise<void> };

export function Todo({ tasks, reload, weekStart, pomoMin, dailyPomos, onStart }: {
  tasks: Task[]; reload: () => Promise<void>; weekStart: number; pomoMin: number; dailyPomos: number; onStart: (t: Task) => void;
}) {
  const [list, setList] = useState<ListId>('today');
  const [openId, setOpenId] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set()); // deleted, waiting for Undo
  const [ticking, setTicking] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [searching, setSearching] = useState(false);
  const { subjects, reloadSubjects } = useSubjects();
  const focusedToday = useFocusedToday(tasks);
  const quickRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const d = days(new Date(), weekStart);
  const live = tasks.filter((t) => !hidden.has(t.id));
  const shown = listTasks(live, list, d);
  const open = live.find((t) => t.id === openId) ?? null;

  // A toast is replaced by the next one; the replaced one's pending action (a delete) happens at once.
  const toastRef = useRef<Toast | null>(null);
  const showToast = (t: Toast | null) => { toastRef.current?.expire?.(); toastRef.current = t; setToast(t); };
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => { toast.expire?.(); if (toastRef.current === toast) { toastRef.current = null; setToast(null); } }, UNDO_MS);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => () => { toastRef.current?.expire?.(); }, []); // leaving the Planner: a pending delete happens now

  async function complete(t: Task) {
    if (t.status === 'done') {
      await bridge().uncompleteTask(t.id, 'todo', null);
      await reload();
      return;
    }
    setTicking(t.id);
    await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : TICK_MS));
    const copy = await bridge().completeTask(t.id);
    setTicking(null);
    await reload();
    showToast({
      text: [tr('Done: {title}.', { title: t.title }), estimateLine(t.est_min, t.focused_sec, pomoMin), copy ? tr('The next one is planned.') : ''].filter(Boolean).join(' '),
      undo: async () => { await bridge().uncompleteTask(t.id, t.status, copy); await reload(); },
    });
  }
  function remove(t: Task) {
    setHidden((h) => new Set(h).add(t.id));
    if (openId === t.id) setOpenId(null);
    let done = false;
    showToast({
      text: tr('Deleted: {title}', { title: t.title }),
      undo: async () => { done = true; setHidden((h) => { const n = new Set(h); n.delete(t.id); return n; }); },
      expire: async () => { if (done) return; done = true; await bridge().deleteTask(t.id); await reload(); },
    });
  }
  async function move(id: number, to: { dir: -1 | 1 } | { before: number | null }) {
    await bridge().reorderTasks(moved(shown.map((t) => t.id), id, to));
    await reload();
  }

  // Keys: N new task, Ctrl+K search; on a task: Enter open, Space complete, Delete, ↑ ↓ to the next task.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching(true); return; }
      if (typing(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.toLowerCase() === 'n' && !searching) { e.preventDefault(); quickRef.current?.focus(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [searching]);
  const onRowKey = (e: React.KeyboardEvent, t: Task) => {
    if (e.target !== e.currentTarget) return; // a button inside the row
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>('.task-row') ?? [])];
    const i = rows.indexOf(e.currentTarget as HTMLElement);
    if (e.key === 'Enter') setOpenId(t.id);
    else if (e.key === ' ') complete(t);
    else if (e.key === 'Delete') { rows[i + 1]?.focus() ?? rows[i - 1]?.focus(); remove(t); }
    else if (e.key === 'ArrowDown') rows[i + 1]?.focus();
    else if (e.key === 'ArrowUp') rows[i - 1]?.focus();
    else return;
    e.preventDefault();
  };

  const listName = list.startsWith('subject:') ? subjects.find((s) => `subject:${s.id}` === list)?.name ?? tr('Subject') : tr(LISTS.find(([l]) => l === list)![1]);
  const doneToday = live.filter((t) => t.done_at !== null && new Date(t.done_at).toDateString() === new Date().toDateString()).length;
  const openInList = shown.filter((t) => t.status !== 'done');

  return (
    <div className={`todo${open ? ' with-panel' : ''}`}>
      <Lists tasks={live} d={d} list={list} setList={setList} subjects={subjects} reloadSubjects={reloadSubjects} reload={reload} pomoMin={pomoMin} />
      <section className="todo-main" aria-label={listName}>
        <h2>{listName}</h2>
        <dl className="stats-row">
          <div><dt>{tr('Estimated time')}</dt><dd>{hoursMin(minutesLeft(openInList))}</dd></div>
          <div><dt>{tr('Tasks left')}</dt><dd>{n(openInList.length)}</dd></div>
          <div><dt>{tr('Focused today')}</dt><dd>{hoursMin(Math.floor(focusedToday / 60))}</dd></div>
          <div><dt>{tr('Completed today')}</dt><dd>{n(doneToday)}</dd></div>
          <div><dt>{tr('Daily goal')}</dt><dd title={tr('Pomodoros of focused time today, of your goal (Settings → Pomodoro)')}>{goalLine(focusedToday, pomoMin, dailyPomos)}</dd></div>
        </dl>
        <QuickAdd inputRef={quickRef} list={list} d={d} pomoMin={pomoMin} subjects={subjects} reloadSubjects={reloadSubjects} reload={reload} />
        {shown.length > 0 && <ul className="task-rows" ref={listRef} aria-label={tr('{list} tasks', { list: listName })}>
          {shown.map((t, i) => (
            <li key={t.id} className={`task-row${t.status === 'done' ? ' done' : ''}${ticking === t.id ? ' ticking' : ''}${openId === t.id ? ' selected' : ''}`}
                tabIndex={0} draggable={list !== 'completed'} aria-label={t.title}
                onClick={() => setOpenId(t.id)} onKeyDown={(e) => onRowKey(e, t)}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(t.id))} onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const id = Number(e.dataTransfer.getData('text/plain')); if (id && id !== t.id) move(id, { before: t.id }); }}>
              <button className="tick" role="checkbox" aria-checked={t.status === 'done' || ticking === t.id} aria-label={tr('Complete {title}', { title: t.title })}
                      onClick={(e) => { e.stopPropagation(); complete(t); }} />
              <span className="task-main">
                <span className="task-title">{t.title}</span>
                <TaskMeta t={t} d={d} />
              </span>
              {progressOf(t.focused_sec, t.est_min) && <span className={`pomos${progressOf(t.focused_sec, t.est_min)!.over ? ' over' : ''}`}>{progressOf(t.focused_sec, t.est_min)!.text}</span>}
              {list !== 'completed' && <span className="move" onClick={(e) => e.stopPropagation()}>
                <button aria-label={tr('Move {title} up', { title: t.title })} disabled={i === 0} onClick={() => move(t.id, { dir: -1 })}>↑</button>
                <button aria-label={tr('Move {title} down', { title: t.title })} disabled={i === shown.length - 1} onClick={() => move(t.id, { dir: 1 })}>↓</button>
              </span>}
              {t.status !== 'done' && <button className="start" onClick={(e) => { e.stopPropagation(); onStart(t); }}>{tr('Start')}</button>}
            </li>
          ))}
        </ul>}
        {!shown.length && <EmptyList list={list} anyTasks={tasks.length > 0} />}
        <p className="muted keys">{tr('Keys: N new task · Ctrl+K search · on a task: Enter open, Space complete, Delete')}</p>
      </section>
      {open && <TaskPanel key={open.id} task={open} subjects={subjects} pomoMin={pomoMin} reload={reload} onClose={() => setOpenId(null)}
                          onStart={() => onStart(open)} onDelete={() => remove(open)} onComplete={() => complete(open)} />}
      {toast && <div className="toast" role="status">
        <span>{toast.text}</span>
        {toast.undo && <button onClick={async () => { const u = toast.undo!; toastRef.current = null; setToast(null); await u(); }}>{tr('Undo')}</button>}
      </div>}
      {searching && <Search tasks={live} onClose={() => setSearching(false)} onOpen={(id) => { setSearching(false); setOpenId(id); }} />}
    </div>
  );
}

function TaskMeta({ t, d }: { t: Task; d: Days }) {
  const due = t.due === null ? '' : t.due === d.today ? tr('Today') : t.due === d.tomorrow ? tr('Tomorrow') : shortDate(t.due);
  const bits = [t.subject, due && `${due}${t.due_min !== null ? ` ${hhmm(t.due_min)}` : ''}`, t.repeat !== 'none' ? tr('repeats') : '',
    t.subtasks.length ? tr('{done}/{all} steps', { done: t.subtasks.filter((s) => s.done).length, all: t.subtasks.length }) : ''].filter(Boolean);
  if (!bits.length && !isOverdue(t, d)) return null;
  return <small className="task-meta">{isOverdue(t, d) && <b className="overdue">{tr('Overdue')}</b>}{bits.join(' · ')}</small>;
}

function EmptyList({ list, anyTasks }: { list: ListId; anyTasks: boolean }) {
  const [title, text] = !anyTasks ? [tk('No tasks yet'), tk('Type a task above and press Enter. Start it to study for it with the camera on; its minutes add up here.')]
    : list === 'completed' ? [tk('Nothing completed yet'), tk('Tick a task and it moves here.')]
    : list === 'today' ? [tk('Nothing due today'), tk('Tasks due today or earlier show here.')]
    : list === 'tomorrow' ? [tk('Nothing due tomorrow'), tk('Type “tomorrow” in a task, or add it here.')]
    : list === 'week' ? [tk('Nothing due this week'), tk('Tasks with a due date this week show here.')]
    : list === 'planned' ? [tk('No tasks with a due date'), tk('Give a task a due date and it shows here.')]
    : [tk('No open tasks here'), tk('Add one above.')];
  return <div className="empty"><h3>{tr(title)}</h3><p className="muted">{tr(text)}</p></div>;
}

// Left column: the lists with their counts and time left, then the subjects you made.
function Lists({ tasks, d, list, setList, subjects, reloadSubjects, reload, pomoMin }: {
  tasks: Task[]; d: Days; list: ListId; setList: (l: ListId) => void; subjects: Subject[]; reloadSubjects: () => Promise<void>; reload: () => Promise<void>; pomoMin: number;
}) {
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const item = (id: ListId, name: string) => {
    const ts = tasks.filter((t) => inList(t, id, d));
    const left = id === 'completed' ? 0 : minutesLeft(ts);
    return (
      <button key={id} className="list-item" aria-current={list === id ? 'true' : undefined} onClick={() => setList(id)}>
        <span>{name}</span><small>{left ? hoursMin(left) : ''}</small><b>{n(ts.length)}</b>
      </button>
    );
  };
  async function save(name: string, id?: number) {
    const p = await bridge().saveSubject(name, id);
    setMsg(p ?? '');
    if (!p) { setAdding(false); setRenaming(null); await reloadSubjects(); await reload(); }
  }
  return (
    <nav className="todo-lists" aria-label={tr('Lists')} data-tour="todo-lists">
      {LISTS.map(([id, name]) => item(id, tr(name)))}
      <h3>{tr('Subjects')}</h3>
      {subjects.map((s) => renaming === s.id
        ? <NameBox key={s.id} value={s.name} label={tr('New name for {name}', { name: s.name })} onSave={(v) => save(v, s.id)} onCancel={() => setRenaming(null)} />
        : <div key={s.id} className="subject-item">
            {item(`subject:${s.id}`, s.name)}
            <span className="subject-tools">
              <button className="link" aria-label={tr('Rename {name}', { name: s.name })} onClick={() => setRenaming(s.id)}>{tr('Rename')}</button>
              <button className="link" aria-label={tr('Delete {name}', { name: s.name })} onClick={async () => {
                if (!confirm(tr('Delete the subject “{name}”? Its tasks stay, without a subject.', { name: s.name }))) return;
                await bridge().deleteSubject(s.id); if (list === `subject:${s.id}`) setList('all'); await reloadSubjects(); await reload();
              }}>×</button>
            </span>
          </div>)}
      {adding ? <NameBox value="" label={tr('New subject')} onSave={(v) => save(v)} onCancel={() => { setAdding(false); setMsg(''); }} />
        : <button className="link add-subject" onClick={() => setAdding(true)}>{tr('+ Subject')}</button>}
      {msg && <p className="warn">{msg}</p>}
    </nav>
  );
}
function NameBox({ value, label, onSave, onCancel }: { value: string; label: string; onSave: (n: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value);
  return <input className="name-box" aria-label={label} placeholder={tr('Subject name')} autoFocus value={v} onChange={(e) => setV(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSave(v); if (e.key === 'Escape') onCancel(); }} onBlur={() => (v.trim() && v !== value ? onSave(v) : onCancel())} />;
}

// One input: Enter saves into the list being viewed. Shortcuts become chips before saving.
export function QuickAdd({ inputRef, list, d, pomoMin, subjects, reloadSubjects, reload }: {
  inputRef?: React.RefObject<HTMLInputElement | null>; list: ListId; d: Days; pomoMin: number; subjects: Subject[]; reloadSubjects: () => Promise<void>; reload: () => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [keep, setKeep] = useState<Set<string>>(new Set()); // "index:word" of chips turned back into text
  const [pomos, setPomos] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const words = text.trim().split(/\s+/);
  const keepIdx = new Set(words.flatMap((w, i) => (keep.has(`${i}:${w}`) ? [i] : [])));
  const p = useMemo(() => parseQuick(text, d.today, subjects, keepIdx), [text, keep, subjects, d.today]);
  async function add() {
    if (!p.title) return;
    try {
      let subjectId = listDefaults(list, d).subject_id;
      if (p.subject) {
        if (p.newSubject) { const problem = await bridge().saveSubject(p.subject); if (problem) throw new Error(problem); await reloadSubjects(); }
        subjectId = (await bridge().subjects()).find((s) => s.name.toLowerCase() === p.subject!.toLowerCase())?.id ?? null;
      }
      await bridge().saveTask({ title: p.title, notes: '', subtasks: [], due: p.due ?? listDefaults(list, d).due, due_min: null, repeat: 'none',
        priority: p.priority ?? 2, est_min: (p.pomos ?? pomos) ? estMinutes((p.pomos ?? pomos)!, pomoMin) : null, status: 'todo', subject_id: subjectId });
      setText(''); setKeep(new Set()); setPomos(null); setMsg('');
      await reload();
    } catch (e) { setMsg(errText(e)); }
  }
  return (
    <div className="quick-add" data-tour="task-form">
      <input ref={inputRef} className="quick-input" aria-label={tr('New task')} placeholder={tr('Add a task, e.g. “Essay #English friday ~3”')}
             value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setText(''); }} />
      <div className="row quick-extras">
        {p.chips.map((c) => (
          <span key={c.kind} className="chip quick-chip">{c.label}
            <button aria-label={tr('Keep “{word}” as text', { word: words[c.i] })} onClick={() => setKeep(new Set(keep).add(`${c.i}:${words[c.i]}`))}>×</button>
          </span>
        ))}
        {p.pomos === null && <><span className="estimate-label">{tr('Estimate')}</span><PomoPicker value={pomos} onChange={setPomos} /></>}
        {text.trim() && <small className="muted">{p.due || listDefaults(list, d).due ? tr('Enter to add') : tr('Enter to add (no due date)')}</small>}
      </div>
      {msg && <p className="warn">{msg}</p>}
    </div>
  );
}

// 1–8 small circles; clicking the chosen one again clears it.
export function PomoPicker({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <span className="pomo-picker" role="radiogroup" aria-label={tr('Estimated pomodoros')}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
        <button key={k} role="radio" aria-checked={value === k} aria-label={tr(plural(k, '{n} pomodoro', '{n} pomodoros'), { n: k })}
                className={value !== null && k <= value ? 'on' : ''} onClick={() => onChange(value === k ? null : k)} />
      ))}
      {value !== null && value > 8 && <small>{n(value)}</small>}
    </span>
  );
}

export function TaskPanel({ task, subjects, pomoMin, reload, onClose, onStart, onDelete, onComplete }: {
  task: Task; subjects: Subject[]; pomoMin: number; reload: () => Promise<void>; onClose: () => void; onStart: () => void; onDelete: () => void; onComplete: () => void;
}) {
  const [t, setT] = useState(task);
  const [step, setStep] = useState('');
  const [msg, setMsg] = useState('');
  const save = async (patch: Partial<Task>) => {
    const next = { ...t, ...patch };
    setT(next);
    try { await bridge().saveTask(next); setMsg(''); await reload(); } catch (e) { setMsg(errText(e)); }
  };
  const [h, m] = [Math.floor((t.due_min ?? 0) / 60), (t.due_min ?? 0) % 60];
  return (
    <aside className="task-panel" aria-label={tr('Task details')} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="row panel-head">
        <button className="tick" role="checkbox" aria-checked={task.status === 'done'} aria-label={tr('Complete {title}', { title: t.title })} onClick={onComplete} />
        <input className="panel-title" aria-label={tr('Title')} value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} onBlur={() => t.title.trim() && t.title !== task.title && save({})} />
        <button className="link" aria-label={tr('Close')} onClick={onClose}>×</button>
      </div>
      <label className="field-block">{tr('Notes')}
        <textarea rows={3} value={t.notes} onChange={(e) => setT({ ...t, notes: e.target.value })} onBlur={() => t.notes !== task.notes && save({})} />
      </label>
      <div className="field-block">
        <span>{tr('Steps')}</span>
        <ul className="subtasks">
          {t.subtasks.map((s, i) => (
            <li key={i} className="check">
              <input type="checkbox" checked={s.done} aria-label={s.title} onChange={() => save({ subtasks: t.subtasks.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })} />
              <span className={s.done ? 'done' : ''}>{s.title}</span>
              <button className="link" aria-label={tr('Remove step {title}', { title: s.title })} onClick={() => save({ subtasks: t.subtasks.filter((_, j) => j !== i) })}>×</button>
            </li>
          ))}
        </ul>
        <input aria-label={tr('Add a step')} placeholder={tr('Add a step and press Enter')} value={step} onChange={(e) => setStep(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter' && step.trim()) { save({ subtasks: [...t.subtasks, { title: step.trim(), done: false }] }); setStep(''); } }} />
      </div>
      <div className="row">
        <label className="field-block">{tr('Due date')}<input type="date" value={t.due ?? ''} onChange={(e) => save({ due: e.target.value || null, ...(e.target.value ? {} : { due_min: null }) })} /></label>
        <label className="field-block">{tr('Time')}<input type="time" disabled={!t.due} value={t.due_min === null ? '' : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`}
          onChange={(e) => { const [a, b] = e.target.value.split(':').map(Number); save({ due_min: e.target.value ? a * 60 + b : null }); }} /></label>
      </div>
      <label className="field-block">{tr('Repeat')}
        <select value={t.repeat} onChange={(e) => save({ repeat: e.target.value as Repeat })}>{REPEATS.map((r) => <option key={r} value={r}>{tr(REPEAT_TEXT[r])}</option>)}</select>
      </label>
      <div className="row">
        <label className="field-block">{tr('Subject')}
          <select value={t.subject_id ?? ''} onChange={(e) => save({ subject_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{tr('None')}</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </label>
        <label className="field-block">{tr('Priority')}
          <select value={t.priority} onChange={(e) => save({ priority: Number(e.target.value) })}>{[1, 2, 3].map((p) => <option key={p} value={p}>{tr(PRIORITY_TEXT[p])}</option>)}</select>
        </label>
      </div>
      <div className="field-block"><span>{tr('Estimate')}</span>
        <PomoPicker value={t.est_min ? estPomos(t.est_min, pomoMin) : null} onChange={(v) => save({ est_min: v === null ? null : estMinutes(v, pomoMin) })} />
        {t.est_min ? <small className="muted">{estText(t.est_min, pomoMin)}</small> : null}</div>
      <p className="muted">{tr(plural(pomosDone(t.focused_sec, pomoMin), 'Focused on this task: {time} ({n} pomodoro of {min} min), camera-checked', 'Focused on this task: {time} ({n} pomodoros of {min} min), camera-checked'), { time: hms(t.focused_sec), n: pomosDone(t.focused_sec, pomoMin), min: pomoMin })}</p>
      {msg && <p className="warn">{msg}</p>}
      <div className="row">
        {t.status !== 'done' && <button className="primary" onClick={onStart}>{tr('Start')}</button>}
        <button className="link danger" onClick={onDelete}>{tr('Delete task')}</button>
      </div>
    </aside>
  );
}

function Search({ tasks, onClose, onOpen }: { tasks: Task[]; onClose: () => void; onOpen: (id: number) => void }) {
  const [q, setQ] = useState('');
  const found = search(tasks, q).slice(0, 30);
  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="search" role="dialog" aria-label={tr('Search tasks')} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
        <input autoFocus aria-label={tr('Search tasks')} placeholder={tr('Search titles, notes and steps')} value={q} onChange={(e) => setQ(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter' && found[0]) onOpen(found[0].id); }} />
        {q.trim() && !found.length && <p className="muted">{tr('Nothing found.')}</p>}
        <ul>{found.map((t) => <li key={t.id}><button onClick={() => onOpen(t.id)}><span className={t.status === 'done' ? 'done' : ''}>{t.title}</span>{t.subject && <small>{t.subject}</small>}</button></li>)}</ul>
      </div>
    </div>
  );
}
