import { useEffect, useState } from 'react';
import { ALARM, STUDY, activityText, hms, type Activity } from '../session/accounting';
import type { Session } from '../session/useSession';
import type { Settings } from '../state/config';
import { SessionReport } from './Report';
import type { Live } from '../detection/engine';
import { Calibrate } from './Calibrate';
import { BlockLists, ExtensionStatus } from './ScreenMode';
import { bridge } from '../bridge';
import { usePlanner } from './Planner';
import { dateKey, dueToday, hhmm, nextToday, type Routine, type Task } from '../../electron/planner';
import { cameraGate, CHECK_LIMIT_MS } from '../state/setup';
import type { SessionOpts } from '../session/useSession';
import { n, plural, t, tk } from '../../electron/i18n';
import { ClockText } from './ClockText';
import { Ring } from './Ring';
import { Icon, StateIcon } from './icons';
import { AlarmScreen } from './Alarm';

export const STRICT_SENTENCE = tk('I am choosing to stop before my goal and I accept that.');
// Strict mode: the sentence in the chosen language, or in English (typing Bangla needs a Bangla keyboard).
export const strictOk = (typed: string) => [STRICT_SENTENCE, t(STRICT_SENTENCE)].includes(typed.trim());

// Values from a routine block (Planner or reminder). The Study screen is re-created for each one.
export type Prefill = { plannedMin: number; cameraMode: boolean; screenMode: boolean; taskId: number | null; key: number };
type Props = {
  session: Session; settings: Settings; setSettings: (s: Settings) => void; live: Live | null; listeners: Set<(l: Live) => void>;
  onSettings: () => void; onPlanner: () => void; prefill: Prefill | null;
  onFocus: (o?: { taskId?: number | null; opts?: Partial<SessionOpts> }) => void; // Focus mode (E4)
  cameraShown: boolean; onToggleCamera: () => void;
  cameraProblem: { title: string; advice: string } | null; onRetryCamera: () => void;
};

// Every state has a word and a shape, never colour alone (DESIGN.md):
// circle = studying or ready, square = break or pause, triangle = alarm.
type Shape = 'circle' | 'ring' | 'square' | 'triangle';
const shapeOf = (a: Activity | null): Shape => (a && ALARM.has(a) ? 'triangle' : a === 'BREAK' || a === 'PAUSED' ? 'square' : a && STUDY.has(a) ? 'circle' : 'ring');
export const Mark = ({ shape }: { shape: Shape }) => <span className={`mark mark-${shape}`} aria-hidden="true" />;
// The same states as Night Desk icons (src/screens/icons.tsx).
const iconOf = (a: Activity | null) => (a && ALARM.has(a) ? 'warn' : a && STUDY.has(a) ? 'focus' : 'ready') as 'warn' | 'focus' | 'ready';

const LENGTHS = [25, 50, 90];
type Panel = 'task' | 'place' | 'lists' | null;

// What to do, for the full-screen alarm. The alarm stops by itself when you are back.
export function alarmAdvice(alarm: string) {
  if (alarm.startsWith('Blocked app')) return t('Close it and get back to work.');
  if (alarm === 'Break is over') return t('Time to get back to work.');
  if (alarm === 'Away') return t('Come back to your desk.');
  if (alarm === 'Phone' || alarm === 'Phone call') return t('Put the phone down.');
  if (alarm === 'Wake up') return t('Sit up and open your eyes. If you are very tired, take a break.');
  return t('Eyes back on your work.');
}

// Left column: the camera preview (App's .stage) sits here when shown; otherwise this tile.
const CamTile = ({ onShow }: { onShow: () => void }) => (
  <button className="cam-tile" onClick={onShow}><Icon name="camera" size={18} />{t('Show camera')}</button>
);

export function Study(p: Props) {
  const { session: s, settings } = p;
  const [ending, setEnding] = useState(false);
  const [typed, setTyped] = useState('');
  const [hideHint, setHideHint] = useState(false); // the sleepy hint's ×; it comes back the next time
  useEffect(() => { if (!s.drowsy) setHideHint(false); }, [s.drowsy]);
  // Windows' Do not disturb bar: once per session, not when Windows' notifications are already all off.
  const [toastsOff, setToastsOff] = useState(true);
  useEffect(() => { bridge().windowsToastsOff().then(setToastsOff, () => setToastsOff(false)); }, []);
  const [dndShownFor, setDndShownFor] = useState<number | null>(null); // the session whose bar was closed
  const { tasks, routines } = usePlanner();

  if (s.phase === 'setup') return <Setup {...p} />;
  if (s.phase === 'saving') return <div className="study"><p className="muted">{t('Saving…')}</p></div>;
  if (s.phase === 'done') return (
    <div className="study done">
      {s.reachedGoal && <p className="goal"><Mark shape="circle" />{t('Goal reached')}</p>}
      {s.opts.taskId != null && <MarkDone taskId={s.opts.taskId} />}
      <SessionReport startedAt={s.startedAt} />
      <button className="primary" onClick={() => { setEnding(false); setTyped(''); s.newSession(); }}>{t('Start a new session')}</button>
    </div>
  );

  const left = Math.max(0, s.goalMs - s.focusedMs);
  const confirmEnd = () => {
    if (settings.strictMode) { setEnding(true); return; }
    if (confirm(t('End now? You still have {time} to your goal.', { time: hms(left / 1000) }))) s.end(true);
  };
  const paused = s.phase === 'break' && s.activity === 'PAUSED';
  const onBreak = s.phase === 'break' && !paused;
  const kind = s.alarm ? 'alarm' : paused ? 'paused' : onBreak ? 'break' : 'running';
  const strict = ending && (
    <div className="dialog-back">
      <div className="dialog strict" role="alertdialog" aria-label={t('End session')}>
        <p>{t('Strict mode is on. To end early, type this sentence exactly:')}</p>
        <p className="strict-sentence"><q>{t(STRICT_SENTENCE)}</q></p>
        {t(STRICT_SENTENCE) !== STRICT_SENTENCE && <p className="muted">{t('Or in English:')} <q>{STRICT_SENTENCE}</q></p>}
        <input value={typed} onChange={(e) => setTyped(e.target.value)} onPaste={(e) => e.preventDefault()} autoFocus aria-label={t('Sentence')} />
        <div className="actions-end">
          <button className="quiet" onClick={() => { setEnding(false); setTyped(''); }}>{t('Keep studying')}</button>
          <button className="danger" disabled={!strictOk(typed)} onClick={() => { setEnding(false); setTyped(''); s.end(true); }}>{t('End session')}</button>
        </div>
      </div>
    </div>
  );

  // The alarm takes over the whole window: impossible to miss, and still lets you pause or end.
  if (kind === 'alarm') return (
    <AlarmScreen alarm={s.alarm} className="study" clockLabel={onBreak ? t('Break time left') : t('Focused time')}
                 clock={<ClockText text={hms((onBreak ? s.breakLeftMs : s.focusedMs) / 1000)} />}>
      {onBreak ? <button className="on-alarm" onClick={s.resume}>{t('Back to work')}</button>
        : <>
          {s.alarm === 'Wake up' && <button className="on-alarm" onClick={s.takeBreak}>{t('Take a {min} min break instead', { min: settings.breakMin })}</button>}
          <button className="on-alarm" onClick={s.pause}>{t('Pause')}</button>
          <button className="on-alarm" onClick={confirmEnd}>{t('End session')}</button>
        </>}
      {strict}
    </AlarmScreen>
  );

  const word = paused ? t('Paused') : onBreak ? t('Break') : s.activity ? activityText(s.activity) : t('Starting');
  const task = tasks.find((x) => x.id === s.opts.taskId);
  const breakFrac = Number.isFinite(s.breakLeftMs) ? s.breakLeftMs / Math.max(1, settings.breakMin * 60_000) : 1;
  return (
    <div className={`study study-grid ${kind}`}>
      {!p.cameraShown && <CamTile onShow={p.onToggleCamera} />}
      <div className="study-left">
        <p className="status state-word">
          <StateIcon shape={paused ? 'paused' : onBreak ? 'break' : iconOf(s.activity)} />
          <b>{word}</b>
          {kind === 'running' && s.opts.cameraMode && <span className="hint" title={t('An estimate from the camera. Writing, reading, speaking and idle all count as study time.')}>{t('estimate')}</span>}
        </p>
        {kind === 'running' && !s.opts.cameraMode && <p className="muted">{t('camera off')}</p>}
        {p.cameraShown && <button className="link" onClick={p.onToggleCamera}>{t('Hide camera')}</button>}
      </div>

      <div className="study-center">
        <Ring frac={onBreak ? breakFrac : s.focusedMs / Math.max(1, s.goalMs)} label={onBreak ? t('Break time left') : t('Progress to your goal')}>
          <span className="ring-label">{paused ? t('Paused') : onBreak ? t('Break') : t('Focused time')}</span>
          <div className="clock" aria-label={onBreak ? t('Break time left') : t('Focused time')}><ClockText text={hms((onBreak ? s.breakLeftMs : s.focusedMs) / 1000)} /></div>
          <span className="ring-sub">{kind === 'running'
            ? t('{left} to go · goal {min} min', { left: hms(left / 1000), min: s.opts.plannedMin })
            : paused ? t('Clock and alarms are stopped.') : t('No alarms during your break.')}</span>
        </Ring>
        {task && <p className="ring-task">{t('Task: {task}', { task: task.title })}</p>}
        {kind === 'running' && s.phase === 'running' && s.screen.missingExtension && <p className="note-bar warn"><StateIcon shape="warn" />{t('Browser extension not connected: sites can’t be blocked.')}</p>}
        {kind === 'running' && s.phase === 'running' && s.drowsy && !hideHint && (
          <div className="note-bar drowsy-hint" role="status">
            <Icon name="moon" size={16} />
            <span>{t('You look sleepy. Take a short break?')}</span>
            <button className="small" onClick={s.takeBreak}>{t('Break {min} min', { min: settings.breakMin })}</button>
            <button className="small quiet icon-btn" aria-label={t('Dismiss')} onClick={() => setHideHint(true)}><Icon name="close" size={12} /></button>
          </div>
        )}
        {kind === 'running' && s.phase === 'running' && settings.dndReminder && !toastsOff && dndShownFor !== s.startedAt && (
          <div className="note-bar dnd-hint" role="status">
            <Icon name="bell" size={16} />
            <span>{t('Windows notifications can still pop up. Turn on Do not disturb?')}</span>
            <button className="small" onClick={() => { bridge().openDoNotDisturb(); setDndShownFor(s.startedAt); }}>{t('Open Windows setting')}</button>
            <button className="small quiet" onClick={() => p.setSettings({ ...settings, dndReminder: false })}>{t('Don’t remind me')}</button>
            <button className="small quiet icon-btn" aria-label={t('Dismiss')} onClick={() => setDndShownFor(s.startedAt)}><Icon name="close" size={12} /></button>
          </div>
        )}
        {kind === 'running' && s.opts.screenMode && <details className="more-panel">
          <summary>{t('Block another site or app')}</summary>
          <BlockLists locked />
        </details>}
      </div>

      <div className="study-side">
        <NextLine tasks={tasks} routines={routines} onPlanner={p.onPlanner} />
      </div>

      <div className="dock">
        {kind === 'running' && <>
          <span className="grow" />
          <button className="big" onClick={() => p.onFocus()}>{t('Full screen')}</button>
          <button className="big" onClick={s.takeBreak}>{t('Break {min} min', { min: settings.breakMin })}</button>
          <button className="big" onClick={s.pause} title={t('For the washroom or something urgent: no time limit, no alarm')}><Icon name="pause" size={18} />{t('Pause')}</button>
          <button className="big outline" onClick={confirmEnd}><Icon name="stop" size={16} />{t('End session')}</button>
        </>}
        {paused && <>
          <span className="grow" />
          <button className="big outline" onClick={confirmEnd}>{t('End session')}</button>
          <button className="primary" onClick={s.resume}>{t('Resume')}</button>
        </>}
        {onBreak && <>
          <span className="grow" />
          <button className="primary" onClick={s.resume}>{t('Back to work')}</button>
        </>}
      </div>
      {strict}
    </div>
  );
}

// Ready to start: camera on the left, the ring in the middle, what is next on the right, choices and Start in the dock.
function Setup({ session: s, settings, setSettings, live, listeners, onSettings, onPlanner, prefill, cameraShown, onToggleCamera, cameraProblem, onRetryCamera, onFocus }: Props) {
  const [minutes, setMinutes] = useState(prefill?.plannedMin ?? settings.goalMin);
  const [custom, setCustom] = useState(!LENGTHS.includes(prefill?.plannedMin ?? settings.goalMin));
  const [camera, setCamera] = useState(prefill?.cameraMode ?? true);
  const [screenMode, setScreenMode] = useState(prefill?.screenMode ?? false);
  const [taskId, setTaskId] = useState<number | null>(prefill?.taskId ?? null);
  const [panel, setPanel] = useState<Panel>(null);
  const { tasks, routines } = usePlanner();
  // Camera check before a session: starts as soon as your face is found; 3 s is the limit.
  const [check, setCheck] = useState<{ opts: SessionOpts; since: number; failed: boolean } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!check || check.failed) return;
    const gate = cameraGate(Date.now() - check.since, !!live?.frame.face);
    if (gate === 'start') { setCheck(null); s.start(check.opts); return; }
    if (gate === 'fail') { setCheck({ ...check, failed: true }); return; }
    const id = setTimeout(() => tick((n) => n + 1), 100);
    return () => clearTimeout(id);
  });
  const begin = (opts: SessionOpts) => (opts.cameraMode ? setCheck({ opts, since: Date.now(), failed: false }) : s.start(opts));
  const toggle = (x: Panel) => setPanel(panel === x ? null : x);
  const task = tasks.find((x) => x.id === taskId);
  const openTasks = tasks.filter((x) => x.status !== 'done' || x.id === taskId);

  const seen = !!live?.frame.face;
  const place = settings.workstation ? t('{place} calibrated', { place: settings.workstation }) : settings.calibratedPitch !== null ? t('calibrated') : t('not calibrated yet');
  const broken = camera && cameraProblem;
  const state = !camera ? t('Ready · timer only') : broken ? cameraProblem.title : !live ? t('Starting the camera…') : `${t('Ready')} · ${seen ? t('camera sees you') : t('camera can’t see your face')}`;

  if (check) {
    const left = Math.max(1, Math.ceil((CHECK_LIMIT_MS - (Date.now() - check.since)) / 1000));
    return (
      <div className="study ready check" aria-live="polite">
        <Ring frac={null}>
          <span className="ring-label">{t('Ready')}</span>
          <div className="clock" aria-label={t('Session length')}><ClockText text={hms(check.opts.plannedMin * 60)} /></div>
        </Ring>
        {!check.failed
          ? <p className="status state-line"><StateIcon shape="ready" />{t('Checking the camera… {left}', { left })}</p>
          : <div className="dialog check-failed">
            <p className="status state-line" role="alert"><StateIcon shape="warn" /><b>{cameraProblem ? cameraProblem.title : t('The camera can’t see your face')}</b></p>
            <p>{t('Start anyway counts you as away, with the clock stopped, until the camera sees your face.')}</p>
            <div className="actions-end">
              <button className="quiet" onClick={() => setCheck(null)}>{t('Cancel')}</button>
              <button onClick={() => { const o = check.opts; setCheck(null); s.start({ ...o, startAway: true }); }}>{t('Start anyway')}</button>
              <button className="primary-sm" onClick={() => { setCheck(null); setPanel('place'); if (!cameraShown) onToggleCamera(); }}>{t('Fix it')}</button>
            </div>
          </div>}
      </div>
    );
  }

  const panelTitle = panel === 'task' ? t('Task') : panel === 'place' ? t('Place and calibration') : t('Block lists');
  return (
    <div className="study study-grid ready">
      {!cameraShown && <CamTile onShow={onToggleCamera} />}
      <div className="study-left">
        <p className="status state-line" role={broken ? 'alert' : undefined}>
          <StateIcon shape={broken || (camera && live && !seen) ? 'warn' : 'ready'} /><span>{state}</span>
        </p>
        {broken && <><p className="muted">{cameraProblem.advice}</p><button className="small" onClick={onRetryCamera}>{t('Try again')}</button></>}
        {camera && <p className="muted place-line">{place} · <button className="link" aria-expanded={panel === 'place'} onClick={() => toggle('place')}>{t('Place and calibration')}</button></p>}
        {cameraShown && <button className="link" aria-pressed onClick={onToggleCamera}>{t('Hide camera')}</button>}
      </div>

      <div className="study-center">
        {panel ? (
          <section className="study-panel" aria-label={panelTitle}>
            <header><h2>{panelTitle}</h2><button className="quiet icon-btn" aria-label={t('Close')} onClick={() => setPanel(null)}><Icon name="close" size={14} /></button></header>
            {panel === 'task' && (openTasks.length ? <label className="field">{t('Task')}
              <select value={taskId ?? ''} onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">{t('No task')}</option>
                {openTasks.map((x) => <option key={x.id} value={x.id}>{x.subject ? `${x.subject}: ` : ''}{x.title}</option>)}
              </select>
            </label> : <p className="muted">{t('No tasks yet.')} <button className="link" onClick={onPlanner}>{t('Add one in the Planner')}</button></p>)}
            {panel === 'place' && camera && <Calibrate live={live} settings={settings} setSettings={setSettings} listeners={listeners} />}
            {panel === 'lists' && screenMode && <><ExtensionStatus onSetup={onSettings} /><BlockLists locked={false} /></>}
          </section>
        ) : (
          <Ring frac={null}>
            <span className="ring-label">{t('Ready')}</span>
            <div className="clock" aria-label={t('Session length')}><ClockText text={hms(minutes * 60)} /></div>
          </Ring>
        )}
        <nav className="more" aria-label={t('More options')} data-tour="more">
          <button className="ring-task" aria-expanded={panel === 'task'} onClick={() => toggle('task')}>{t('Task: {task}', { task: task ? task.title : t('none') })}<Icon name="chevron" size={12} /></button>
        </nav>
      </div>

      <div className="study-side">
        <NextLine tasks={tasks} routines={routines} onPlanner={onPlanner} />
        {screenMode && <div className="panel-card">
          <span className="label">{t('Blocker mode')}</span>
          <button className="link" aria-expanded={panel === 'lists'} onClick={() => toggle('lists')}>{t('Block lists')}</button>
        </div>}
      </div>

      <div className="dock">
        <div className="seg" role="radiogroup" aria-label={t('Length')} data-tour="length">
          {LENGTHS.map((m) => (
            <button key={m} role="radio" aria-checked={!custom && minutes === m} aria-label={t('{m} min', { m })} onClick={() => { setCustom(false); setMinutes(m); }}>{n(m)}</button>
          ))}
          <button role="radio" aria-checked={custom} onClick={() => setCustom(true)}>{t('Custom')}</button>
          {custom && <input className="custom-min" type="number" min={1} max={600} value={minutes} autoFocus aria-label={t('Minutes')}
                            onChange={(e) => setMinutes(Math.max(1, Math.min(600, Math.round(Number(e.target.value) || 1))))} />}
        </div>
        <span className="dock-sep" aria-hidden="true" />
        <button className="mode" data-tour="camera-mode" aria-pressed={camera} title={t('Alarm for phone, leaving or looking away')} onClick={() => setCamera(!camera)}>
          <span className="track" aria-hidden="true" />{t('Camera mode')} <small>{camera ? t('On') : t('Off')}</small>
        </button>
        <button className="mode" data-tour="screen-mode" aria-pressed={screenMode} title={t('Blocks the sites and apps on your list')} onClick={() => setScreenMode(!screenMode)}>
          <span className="track" aria-hidden="true" />{t('Blocker mode')} <small>{screenMode ? t('On') : t('Off')}</small>
        </button>
        <span className="grow" />
        <button className="big focus-start" title={t('Full screen, with a pomodoro, countdown or count-up timer (Timer in Focus mode)')}
                onClick={() => onFocus({ taskId, opts: { cameraMode: camera, screenMode } })}>{t('Focus mode')}</button>
        <button className="primary start" data-tour="start" onClick={() => begin({ plannedMin: minutes, cameraMode: camera, screenMode, taskId })}>{t('Start')}</button>
      </div>
    </div>
  );
}

// The next routine block today and the tasks due today, as a card. Click: the Planner.
function NextLine({ tasks, routines, onPlanner }: { tasks: Task[]; routines: Routine[]; onPlanner: () => void }) {
  const now = new Date();
  const next = nextToday(routines, now);
  const due = dueToday(tasks, dateKey(now));
  if (!next && !due) return null;
  const name = next ? tasks.find((x) => x.id === next.task_id)?.title ?? t('study block') : '';
  return (
    <button className="panel-card next-line" onClick={onPlanner}>
      {next ? <span className="value">{t('Next: {time} {name}', { time: hhmm(next.start_min), name })}</span> : <span className="value">{t('No more blocks today')}</span>}
      {due ? <span className="label">{t(plural(due, '{n} task due today', '{n} tasks due today'), { n: due })}</span> : null}
    </button>
  );
}

// After a session linked to a task. The owner decides; the task is never moved automatically.
function MarkDone({ taskId }: { taskId: number }) {
  const [task, setTask] = useState<Task | null>(null);
  useEffect(() => { bridge().tasks().then((l) => setTask(l.find((x) => x.id === taskId && x.status !== 'done') ?? null)); }, [taskId]);
  if (!task) return null;
  return (
    <div className="row mark-done" role="group" aria-label={t('Task')}>
      <span>{t('Mark this task as done?')} <b>{task.title}</b></span>
      <button className="primary-sm" onClick={async () => { await bridge().saveTask({ ...task, status: 'done' }); setTask(null); }}>{t('Yes')}</button>
      <button className="quiet" onClick={() => setTask(null)}>{t('Not yet')}</button>
    </div>
  );
}
