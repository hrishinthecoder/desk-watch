// Focus mode (Stage E4 Part 2): a full-screen, black, minimal view of the normal Desk Watch session, so camera
// alarms, the blocker, History and the task's minutes all keep working. Pomodoro / countdown / count-up, breaks
// between pomodoros, background noise, solid backgrounds, today's tasks, and a mini timer outside full screen.
import { useEffect, useRef, useState } from 'react';
import { bridge, type MiniState } from '../bridge';
import type { Task } from '../../electron/planner';
import { ALARM, activityText, alarmText, hms, STUDY } from '../session/accounting';
import { playNoise, NOISES, type Noise } from '../session/noise';
import { playCue } from '../session/sounds';
import type { Session, SessionOpts } from '../session/useSession';
import type { Live } from '../detection/engine';
import type { Settings } from '../state/config';
import { afterPomodoro, backgrounds, backgroundColor, isLight, clockMs, dots, HOLD_ESC_MS, plannedFor, TIMER_MODES, timerMode, type TimerMode } from '../state/focus';
import { cameraGate, CHECK_LIMIT_MS } from '../state/setup';
import { days, estPomos, listTasks, MAX_POMOS, pomosDone, progressOf } from '../state/todo';
import { STRICT_SENTENCE, strictOk } from './Study';
import { AlarmScreen } from './Alarm';
import { Ring } from './Ring';
import { n, t as tr } from '../../electron/i18n'; // "t" is a task in this file
import { Icon, StateIcon, type IconName } from './icons';
import { ClockText } from './ClockText';
import { BlockWarning } from './BlockWarning';

type View = 'full' | 'mini';
type Break = { kind: 'short' | 'long'; endsAt: number; over: boolean };
type Check = { opts: SessionOpts; since: number; failed: boolean };

// All Focus mode state lives at the top of the app, so it keeps going while the mini timer is shown.
export function useFocus(session: Session, settings: Settings, live: Live | null, patch: (p: Partial<Settings>) => void) {
  const [view, setView] = useState<View | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [doneInRun, setDoneInRun] = useState(0); // pomodoros finished since Focus mode was opened
  const [brk, setBrk] = useState<Break | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [finished, setFinished] = useState(false); // a countdown / count-up reached its goal, or a run's last pomodoro
  const [ready, setReady] = useState(false); // the timer is shown before a task's first start
  const s = session;
  const sessionOn = s.phase === 'running' || s.phase === 'break' || s.phase === 'saving';

  useEffect(() => { bridge().focusWindow(view === 'full'); bridge().showMini(view === 'mini'); }, [view]);
  useEffect(() => () => { bridge().focusWindow(false); bridge().showMini(false); }, []);

  const optsFor = (task: number | null): SessionOpts => ({
    plannedMin: plannedFor(settings), cameraMode: settings.lastCamera, screenMode: settings.lastScreen, taskId: task, timer: timerMode(settings.timerMode),
  });
  // Start a session in Focus mode. The first one has the usual camera check; the next pomodoro after a break does not
  // (you were just seen; leaving still rings the away alarm as always).
  function begin(opts: SessionOpts, checkCamera: boolean) {
    setBrk(null); setFinished(false);
    if (s.phase === 'done') s.newSession();
    patch({ lastCamera: opts.cameraMode, lastScreen: opts.screenMode });
    if (opts.cameraMode && checkCamera) setCheck({ opts, since: Date.now(), failed: false });
    else s.start(opts);
  }
  // Open Focus mode: on the running session, or start one (from a task's Start or the Study tab's Focus button).
  // A task's Start (ask) first shows the timer to set: focus and break length, number of pomodoros (owner, 2026-10-21).
  function open(o: { taskId?: number | null; opts?: Partial<SessionOpts>; ask?: boolean } = {}) {
    setView('full');
    if (sessionOn) { setTaskId(s.opts.taskId ?? null); return; }
    const task = o.taskId ?? null;
    setTaskId(task); setDoneInRun(0);
    if (o.ask) { setBrk(null); setFinished(false); setCheck(null); setReady(true); return; }
    begin({ ...optsFor(task), ...o.opts, taskId: task, timer: timerMode(settings.timerMode), plannedMin: plannedFor(settings) }, true);
  }
  // A new run with the timer as set now (from the timer shown before a task's first start, or "Start again").
  function startRun() { setReady(false); setDoneInRun(0); begin(optsFor(taskId), true); }
  function close() { setView(null); setBrk(null); setCheck(null); setFinished(false); setReady(false); }

  // Camera check (as on the Study tab): starts as soon as the face is found; 3 s is the limit.
  useEffect(() => {
    if (!check || check.failed) return;
    const gate = cameraGate(Date.now() - check.since, !!live?.frame.face);
    if (gate === 'start') { setCheck(null); s.start(check.opts); }
    else if (gate === 'fail') setCheck({ ...check, failed: true });
  });

  // A session started in Focus mode ended: a finished pomodoro → its break, or "done" after the run's last one;
  // a countdown or count-up → "done".
  const prevPhase = useRef(s.phase);
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = s.phase;
    // A task switch is over once its new session runs. Cleared here, not when switchTask returns: React may handle
    // the old session's "done" only after that (seen 2026-10-21), and it must not close Focus mode.
    if (s.phase === 'running') switching.current = false;
    if (!view || s.phase !== 'done' || (was !== 'saving' && was !== 'running' && was !== 'break')) return;
    if (!s.reachedGoal) { if (!switching.current) close(); return; } // ended early (Stop): back to the app and its report
    if (s.opts.timer === 'pomodoro') {
      const n = doneInRun + 1;
      setDoneInRun(n);
      const b = afterPomodoro(n, settings);
      if (b) setBrk({ kind: b.kind, endsAt: Date.now() + b.min * 60_000, over: false });
      else { setFinished(true); setView('full'); }
    } else { setFinished(true); setView('full'); }
  }, [s.phase]);
  // Break over: start the next pomodoro by itself (Settings switch) or show "Start next pomodoro" with a short sound.
  useEffect(() => {
    if (!brk || brk.over || Date.now() < brk.endsAt) return;
    if (settings.autoStartNext) begin(optsFor(taskId), false);
    else { setBrk({ ...brk, over: true }); playCue(settings.alarmVolume); }
  });
  const nextPomodoro = () => begin(optsFor(taskId), false);

  // Alarms take over the screen as always: from the mini timer, back to full screen.
  useEffect(() => { if (view === 'mini' && s.alarm) setView('full'); }, [view, s.alarm]);

  // Switching task (Today's tasks panel): during a session it is split so each task gets its own minutes.
  const switching = useRef(false);
  async function switchTask(id: number | null) {
    setTaskId(id);
    if (s.phase !== 'running' && s.phase !== 'break') return;
    switching.current = true;
    try { await s.switchTask(id); } catch (e) { switching.current = false; throw e; }
  }

  // Noise: plays while Focus mode is open (full screen or mini).
  const noise = useRef<ReturnType<typeof playNoise> | null>(null);
  useEffect(() => {
    if (!view || settings.focusSound === 'off') return;
    const n = playNoise(settings.focusSound as Noise, settings.focusVolume);
    noise.current = n;
    return () => { n.stop(); noise.current = null; };
  }, [view === null, settings.focusSound]);
  useEffect(() => { noise.current?.setVolume(settings.focusVolume); }, [settings.focusVolume]);

  // The mini timer shows what the main window sends, four times a second; its button and click come back here.
  // A session started on the Study tab (no timer mode) shows its time left, like a countdown.
  const mode: TimerMode = sessionOn || s.phase === 'done' ? s.opts.timer ?? 'countdown' : timerMode(settings.timerMode);
  const miniState = (): MiniState => {
    const paused = s.phase === 'break' && s.activity === 'PAUSED';
    if (sessionOn) return { time: hms(clockMs(mode, s.focusedMs, s.goalMs) / 1000), label: s.alarm ? alarmText(s.alarm) : paused ? tr('Paused') : s.activity ? activityText(s.activity) : '', button: paused ? 'resume' : 'pause', alarm: !!s.alarm };
    if (brk) return { time: hms(Math.max(0, brk.endsAt - Date.now()) / 1000), label: brk.over ? tr('Break is over') : brk.kind === 'long' ? tr('Long break') : tr('Break'), button: 'next', alarm: false };
    return { time: '--:--', label: finished ? tr('Done') : '', button: null, alarm: false };
  };
  const miniRef = useRef(miniState);
  miniRef.current = miniState;
  useEffect(() => {
    if (view !== 'mini') return;
    const id = setInterval(() => bridge().sendMiniState(miniRef.current()), 250);
    return () => clearInterval(id);
  }, [view]);
  const actions = useRef({ s, nextPomodoro, brk, setView });
  actions.current = { s, nextPomodoro, brk, setView };
  useEffect(() => bridge().onMiniAction((a) => {
    const { s, nextPomodoro, brk, setView } = actions.current;
    if (a === 'open') { setView('full'); return; }
    if (brk) nextPomodoro();
    else if (s.phase === 'break' && s.activity === 'PAUSED') s.resume();
    else if (s.phase === 'running') s.pause();
  }), []);

  return { view, setView, open, close, taskId, switchTask, doneInRun, brk, check, setCheck, finished, ready, startRun, nextPomodoro, sessionOn, mode, begin, optsFor };
}
export type FocusState = ReturnType<typeof useFocus>;

export function Focus({ f, session: s, settings, patch, tasks, reloadTasks, onFixCamera }: {
  f: FocusState; session: Session; settings: Settings; patch: (p: Partial<Settings>) => void; tasks: Task[]; reloadTasks: () => Promise<void>; onFixCamera: () => void;
}) {
  const [panel, setPanel] = useState<'timer' | 'sound' | 'background' | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [typed, setTyped] = useState('');
  const [holding, setHolding] = useState(0); // when Esc started being held (0 = not held)
  const leave = () => (f.sessionOn ? setExiting(true) : f.close());

  // Esc alone does nothing; holding it for 2 s opens "End the session?" (or leaves when nothing runs).
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.repeat) { if (panel || drawer) { setPanel(null); setDrawer(false); } else setHolding(Date.now()); } };
    const up = (e: KeyboardEvent) => { if (e.key === 'Escape') setHolding(0); };
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, [panel, drawer]);
  useEffect(() => {
    if (!holding) return;
    const id = setTimeout(() => { setHolding(0); leave(); }, HOLD_ESC_MS);
    return () => clearTimeout(id);
  }, [holding]);
  useEffect(() => { reloadTasks(); }, [s.phase]); // pomodoros done change when a session ends

  const task = tasks.find((t) => t.id === f.taskId) ?? null;
  const paused = s.phase === 'break' && s.activity === 'PAUSED';
  const liveSec = f.sessionOn && s.opts.taskId === task?.id ? s.focusedMs / 1000 : 0;
  const d = dots(settings, f.doneInRun, task ? { done: pomosDone(task.focused_sec + liveSec, settings.pomoMin), est: task.est_min ? estPomos(task.est_min, settings.pomoMin) : null } : null);
  const light = useLightTheme(settings.theme);
  const style = { '--focus-bg': backgroundColor(settings.focusBg, light) } as React.CSSProperties;
  const end = () => { setExiting(false); setTyped(''); s.end(true); };

  // Alarms take over the whole screen, as on the Study tab.
  if (s.alarm && f.sessionOn) return (
    <AlarmScreen alarm={s.alarm} className="focus" clockLabel={tr('Time')} clock={<ClockText text={hms(clockMs(f.mode, s.focusedMs, s.goalMs) / 1000)} />}>
      {s.alarm === 'Wake up' && <button className="on-alarm" onClick={s.takeBreak}>{tr('Take a {min} min break instead', { min: settings.breakMin })}</button>}
      <button className="on-alarm" onClick={s.pause}>{tr('Pause')}</button>
      <button className="on-alarm" onClick={() => setExiting(true)}>{tr('Stop')}</button>
      {exiting && <ExitDialog settings={settings} typed={typed} setTyped={setTyped} onEnd={end} onMini={() => { setExiting(false); f.setView('mini'); }} onCancel={() => { setExiting(false); setTyped(''); }} />}
    </AlarmScreen>
  );

  // The task's name sits inside the ring (Night Desk B-Focus board); above the timer dialog and the camera check.
  const taskLine = task && <p className="focus-task">{task.subject ? <small>{task.subject}</small> : null}{task.title}</p>;
  // Round icon buttons keep their word for screen readers (and tests) in a hidden span.
  const round = (cls: string, icon: IconName, label: string, onClick: () => void) => (
    <button className={`${cls} round`} title={label} onClick={onClick}><Icon name={icon} size={18} /><span className="sr-only">{label}</span></button>
  );
  let body: React.ReactNode;
  if (f.ready) {
    // Before a task's first start: the same timer as the Timer button, remembered as your last choice.
    body = <>{taskLine}<div className="dialog timer-dialog" role="group" aria-label={tr('Set your timer')}>
      <h2 className="focus-state">{tr('Set your timer')}</h2>
      <div className="focus-ready"><TimerSettings settings={settings} patch={patch} running={false} /></div>
      <div className="actions-end">
        <button className="focus-quiet" onClick={f.close}>{tr('Cancel')}</button>
        <button className="focus-primary" autoFocus onClick={f.startRun}><Icon name="play" />{tr('Start')}</button>
      </div>
    </div></>;
  } else if (f.check) {
    const left = Math.max(1, Math.ceil((CHECK_LIMIT_MS - (Date.now() - f.check.since)) / 1000));
    body = <>{taskLine}{!f.check.failed ? <p className="focus-state"><StateIcon shape="ready" />{tr('Checking the camera… {left}', { left })}</p> : <div className="dialog">
      <p className="focus-state" role="alert"><StateIcon shape="warn" />{tr('The camera can’t see your face')}</p>
      <p className="focus-note">{tr('Start anyway counts you as away, with the clock stopped, until the camera sees your face.')}</p>
      <div className="actions-end">
        <button className="focus-quiet" onClick={() => { f.setCheck(null); f.close(); }}>{tr('Cancel')}</button>
        <button className="focus-quiet" onClick={() => { const o = f.check!.opts; f.setCheck(null); s.start({ ...o, startAway: true }); }}>{tr('Start anyway')}</button>
        <button className="focus-primary" onClick={() => { f.setCheck(null); f.close(); onFixCamera(); }}>{tr('Fix it')}</button>
      </div>
    </div>}</>;
  } else if (f.sessionOn) {
    // A break taken from the Wake up alarm runs here too: its time left, and Back to work.
    const onBreak = s.phase === 'break' && !paused;
    body = <>
      <Ring className="focus-ring" frac={onBreak ? s.breakLeftMs / Math.max(1, settings.breakMin * 60_000) : s.focusedMs / Math.max(1, s.goalMs)}
            label={onBreak ? tr('Break time left') : tr('Progress to your goal')}>
        {taskLine}
        <p className="focus-state">
          <StateIcon shape={paused ? 'paused' : onBreak ? 'break' : s.activity && STUDY.has(s.activity) ? 'focus' : s.activity && ALARM.has(s.activity) ? 'warn' : 'ready'} size={14} />
          {paused ? tr('Paused') : onBreak ? tr('Break') : s.activity ? activityText(s.activity) : tr('Starting')}
          <span className="focus-mode-name">{tr(TIMER_MODES.find(([m]) => m === f.mode)![1])}</span>
        </p>
        <div className="focus-clock" aria-label={onBreak ? tr('Break time left') : f.mode === 'countup' ? tr('Focused time') : tr('Time left')}>
          <ClockText text={hms((onBreak ? s.breakLeftMs : clockMs(f.mode, s.focusedMs, s.goalMs)) / 1000)} />
        </div>
        {f.mode === 'countup' && !onBreak && <p className="focus-note">{tr('Stops at {min} min', { min: s.opts.plannedMin })}</p>}
        <Dots d={d} />
      </Ring>
      <div className="focus-actions">
        {onBreak ? <button className="focus-primary" onClick={s.resume}><Icon name="play" />{tr('Back to work')}</button>
          : round('focus-primary', paused ? 'play' : 'pause', paused ? tr('Resume') : tr('Pause'), paused ? s.resume : s.pause)}
        {round('focus-quiet', 'stop', tr('Stop'), () => setExiting(true))}
      </div>
    </>;
  } else if (f.brk) {
    const left = Math.max(0, f.brk.endsAt - Date.now());
    const total = (f.brk.kind === 'long' ? settings.longBreakMin : settings.shortBreakMin) * 60_000;
    body = <>
      <Ring className="focus-ring brk" frac={left / Math.max(1, total)} label={tr('Break time left')}>
        {taskLine}
        <p className="focus-state"><StateIcon shape="break" size={14} />{f.brk.over ? tr('Break is over') : f.brk.kind === 'long' ? tr('Long break') : tr('Break')}</p>
        <div className="focus-clock" aria-label={tr('Break time left')}><ClockText text={hms(left / 1000)} /></div>
        <Dots d={d} />
      </Ring>
      <p className="focus-note">{f.brk.over ? tr('Ready when you are.') : settings.autoStartNext ? tr('The next pomodoro starts by itself.') : tr('No alarms during your break.')}</p>
      <div className="focus-actions"><button className="focus-primary" onClick={f.nextPomodoro}><Icon name="play" />{tr('Start next pomodoro')}</button></div>
    </>;
  } else {
    body = <>
      <Ring className="focus-ring" frac={null}>
        {taskLine}
        <p className="focus-state"><StateIcon shape="ready" size={14} />{f.finished ? tr('Done') : tr('Session ended')}</p>
        <div className="focus-clock"><ClockText text={hms(s.focusedMs / 1000)} /></div>
        <p className="focus-note">{task ? tr('focused on {task}', { task: task.title }) : tr('focused')}</p>
        {f.finished && f.mode === 'pomodoro' && f.doneInRun > 0 && <p className="focus-note">{tr('{done} of {count} pomodoros done', { done: f.doneInRun, count: Math.max(1, settings.pomoCount) })}</p>}
      </Ring>
      <div className="focus-actions">
        <button className="focus-quiet" onClick={f.startRun}>{tr('Start again')}</button>
        <button className="focus-primary" onClick={f.close}>{tr('Close')}</button>
      </div>
    </>;
  }

  return (
    <div className="focus" style={style} role="dialog" aria-label={tr('Focus mode')}>
      <div className="focus-top">
        <button className="focus-quiet focus-exit" onClick={leave}><Icon name="exit" size={16} />{tr('Exit')}</button>
      </div>
      <BlockWarning screen={s.screen} running={s.phase === 'running'} />
      <main className="focus-center">
        {body}
      </main>
      <span className="focus-hint" aria-live="polite">{holding ? tr('Keep holding Esc to leave…') : tr('Hold Esc to exit')}</span>
      <nav className="focus-bar" aria-label={tr('Focus mode options')}>
        {([['timer', 'timer', tr('Timer')], ['sound', 'sound', tr('Sound')], ['background', 'background', tr('Background')]] as [typeof panel, IconName, string][]).map(([p, icon, label]) => (
          <button key={icon} aria-expanded={panel === p} onClick={() => { setPanel(panel === p ? null : p); setDrawer(false); }}><Icon name={icon} /><span>{label}</span></button>
        ))}
        <button aria-expanded={drawer} onClick={() => { setDrawer(!drawer); setPanel(null); }}><Icon name="tasks" /><span>{tr("Today's tasks")}</span></button>
      </nav>
      {panel && <div className="focus-pop" role="group" aria-label={panel}>
        {panel === 'timer' && <TimerSettings settings={settings} patch={patch} running={f.sessionOn} />}
        {panel === 'sound' && <>
          <div className="focus-cards" role="radiogroup" aria-label={tr('Sound')}>
            {NOISES.map(([k, label]) => <button key={k} role="radio" aria-checked={settings.focusSound === k} onClick={() => patch({ focusSound: k })}>{tr(label)}</button>)}
          </div>
          <label className="focus-field">{tr('Volume')} <input type="range" min={0} max={1} step={0.05} value={settings.focusVolume} onChange={(e) => patch({ focusVolume: Number(e.target.value) })} /></label>
          <small className="focus-note">{tr('Made on this computer; no sound files.')}</small>
        </>}
        {panel === 'background' && <div className="focus-cards" role="radiogroup" aria-label={tr('Background')}>
          {backgrounds(light).map(([k, label, c]) => <button key={k} role="radio" aria-checked={settings.focusBg === k} onClick={() => patch({ focusBg: k })}><span className="swatch" style={{ background: c }} />{tr(label)}</button>)}
        </div>}
      </div>}
      <TodayDrawer open={drawer} tasks={tasks} settings={settings} current={f.taskId} reload={reloadTasks} onSwitch={(id) => { f.switchTask(id); setDrawer(false); }} />
      {exiting && <ExitDialog settings={settings} typed={typed} setTyped={setTyped} onEnd={end} onMini={() => { setExiting(false); f.setView('mini'); }} onCancel={() => { setExiting(false); setTyped(''); }} />}
    </div>
  );
}

const Dots = ({ d }: { d: ReturnType<typeof dots> }) => (
  <p className="focus-dots" aria-label={d.label}>
    {d.of <= MAX_POMOS && <span className="dashes" aria-hidden="true">{Array.from({ length: d.of }, (_, i) => <span key={i} className={i < d.done ? 'on' : ''} />)}</span>}
    <small aria-hidden="true">{d.label}</small>
  </p>
);

// "End the session?" Ending early is recorded as now; strict mode still asks for the sentence.
function ExitDialog({ settings, typed, setTyped, onEnd, onMini, onCancel }: {
  settings: Settings; typed: string; setTyped: (s: string) => void; onEnd: () => void; onMini: () => void; onCancel: () => void;
}) {
  return (
    <div className="focus-dialog-back">
      <div className="focus-dialog" role="alertdialog" aria-label={tr('End the session?')}>
        <h2>{tr('End the session?')}</h2>
        <p className="focus-note">{tr('It is saved as ending now. Or keep going in a small timer on top of your other windows.')}</p>
        {settings.strictMode && <>
          <p className="focus-note">{tr('Strict mode is on. To end early, type this sentence exactly:')} <q>{tr(STRICT_SENTENCE)}</q></p>
          <input aria-label={tr('Sentence')} value={typed} onChange={(e) => setTyped(e.target.value)} onPaste={(e) => e.preventDefault()} autoFocus />
        </>}
        <div className="row">
          <button className="focus-primary" autoFocus={!settings.strictMode} onClick={onMini}>{tr('Keep going in a small window')}</button>
          <button className="focus-quiet danger-text" disabled={settings.strictMode && !strictOk(typed)} onClick={onEnd}>{tr('End session')}</button>
          <button className="focus-quiet" onClick={onCancel}>{tr('Cancel')}</button>
        </div>
      </div>
    </div>
  );
}

// Timer mode and its lengths. Also on Settings → Sessions. A change applies from the next start.
export function TimerSettings({ settings, patch, running }: { settings: Settings; patch: (p: Partial<Settings>) => void; running: boolean }) {
  const mode = timerMode(settings.timerMode);
  const num = (k: 'pomoMin' | 'shortBreakMin' | 'longBreakMin' | 'longEvery' | 'pomoCount' | 'countdownMin' | 'countupMaxMin', label: string, max: number) => (
    <label className="focus-field" key={k}>{label}
      <input type="number" min={1} max={max} value={settings[k]} onChange={(e) => patch({ [k]: Math.max(1, Math.min(max, Math.round(Number(e.target.value) || 1))) })} />
    </label>
  );
  return (
    <div className="timer-settings">
      <div className="focus-cards" role="radiogroup" aria-label={tr('Timer mode')}>
        {TIMER_MODES.map(([m, label, sub]) => <button key={m} role="radio" aria-checked={mode === m} title={tr(sub)} onClick={() => patch({ timerMode: m })}>{tr(label)}</button>)}
      </div>
      <div className="timer-fields">
        {mode === 'pomodoro' && [num('pomoMin', tr('Pomodoro (min)'), 180), num('shortBreakMin', tr('Break (min)'), 60), num('pomoCount', tr('Number of pomodoros'), 12),
          num('longBreakMin', tr('Long break (min)'), 120), num('longEvery', tr('Long break after'), 12)]}
        {mode === 'countdown' && num('countdownMin', tr('Length (min)'), 600)}
        {mode === 'countup' && num('countupMaxMin', tr('Stops at (min)'), 600)}
      </div>
      {mode === 'pomodoro' && <label className="check"><input type="checkbox" checked={settings.autoStartNext} onChange={(e) => patch({ autoStartNext: e.target.checked })} />{tr('Start the next pomodoro after a break by itself')}</label>}
      {running && <small className="focus-note">{tr('Changes apply from the next start.')}</small>}
    </div>
  );
}

// Today's tasks, sliding in from the right: tick one, or switch the session to another without leaving.
function TodayDrawer({ open, tasks, settings, current, reload, onSwitch }: {
  open: boolean; tasks: Task[]; settings: Settings; current: number | null; reload: () => Promise<void>; onSwitch: (id: number | null) => void;
}) {
  const today = listTasks(tasks, 'today', days(new Date(), settings.weekStart));
  const shown = current !== null && !today.some((t) => t.id === current) ? [...tasks.filter((t) => t.id === current), ...today] : today;
  return (
    <aside className={`focus-drawer${open ? ' open' : ''}`} aria-label={tr("Today's tasks")} aria-hidden={!open} inert={!open}>
      <h2>{tr("Today's tasks")}</h2>
      {!shown.length && <p className="focus-note">{tr('Nothing due today.')}</p>}
      <ul>
        {shown.map((t) => (
          <li key={t.id} className={t.id === current ? 'current' : ''}>
            <button className="tick" role="checkbox" aria-checked={t.status === 'done'} aria-label={tr('Complete {title}', { title: t.title })}
                    onClick={async () => { if (t.status !== 'done') await bridge().completeTask(t.id); await reload(); }} />
            <span>{t.title}<small>{[t.subject, progressOf(t.focused_sec, t.est_min)?.text ?? ''].filter(Boolean).join(' · ')}</small></span>
            {t.id === current ? <em>{tr('Now')}</em> : t.status !== 'done' && <button className="focus-quiet" onClick={() => onSwitch(t.id)}>{tr('Switch')}</button>}
          </li>
        ))}
      </ul>
      {current !== null && <button className="focus-quiet" onClick={() => onSwitch(null)}>{tr('No task')}</button>}
    </aside>
  );
}

// Light or dark right now (Settings → Theme, or Windows when it is "system"); follows Windows when it changes.
export function useLightTheme(theme: string) {
  const query = '(prefers-color-scheme: light)';
  const [system, setSystem] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query), f = () => setSystem(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return isLight(theme, system);
}
