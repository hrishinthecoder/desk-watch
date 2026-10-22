import { useEffect, useRef, useState } from 'react';
import { bridge } from './bridge';
import { Planner, ReminderBar } from './screens/Planner';
import { BlockWarning } from './screens/BlockWarning';
import type { Prefill } from './screens/Study';
import { useDetection, type Live } from './detection/engine';
import { Debug, useBoxes } from './screens/Debug';
import { History } from './screens/History';
import { SettingsScreen } from './screens/Settings';
import { Study } from './screens/Study';
import { PairDialog } from './screens/ScreenMode';
import { useSession } from './session/useSession';
import { loadSettings, saveSettings, type Settings } from './state/config';
import { cameraProblem } from './state/camera';
import { ALL_TOURS, isSetupStep, markSeen, seenTours, setupOnStart, type SetupStep, type TourId } from './state/setup';
import { FirstRun } from './screens/FirstRun';
import { Tour } from './screens/Tour';
import { Focus, useFocus } from './screens/Focus';
import { backgroundColor } from './state/focus';
import { usePlanner } from './screens/Planner';
import { setLang, t as tr, tk } from '../electron/i18n';

type Tab = 'study' | 'planner' | 'history' | 'settings' | 'debug';
// Tab names are translated where shown; the Debug tab stays English (owner, 2026-10-14).
const TABS: [Tab, string][] = [['study', tk('Study')], ['planner', tk('Planner')], ['history', tk('History')], ['settings', tk('Settings')], ['debug', 'Debug']];

export function App() {
  const [settings, setSettingsState] = useState(loadSettings);
  setLang(settings.language); // before anything below is drawn: every t() in this render uses it
  const latest = useRef(settings); // for saves from async code and timers
  const setSettings = (s: Settings) => { latest.current = s; saveSettings(s); setSettingsState(s); };
  const patch = (p: Partial<Settings>) => setSettings({ ...latest.current, ...p });
  const [tab, setTab] = useState<Tab>('study');
  const det = useDetection(settings);
  const canvas = useBoxes(det.live, det.videoRef, settings);
  const session = useSession(det.live, settings);
  const active = session.phase === 'running' || session.phase === 'break' || session.phase === 'saving';
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const focus = useFocus(session, settings, det.live, patch); // Focus mode (E4 Part 2)
  const planner = usePlanner(); // today's tasks for Focus mode

  // A routine block (clicked in the Planner, or its reminder clicked): fill in the Study tab.
  // Never during a session, and never starts one: the owner presses Start.
  async function openBlock(id: number) {
    setTab('study');
    const r = (await bridge().routines()).find((x) => x.id === id);
    if (!r || active) return;
    if (session.phase === 'done') session.newSession();
    if (r.screen_mode && r.block_set_id !== null) await bridge().changeBlockSet('pick', r.block_set_id).catch(() => {});
    setPrefill({ plannedMin: r.length_min, cameraMode: !!r.camera_mode, screenMode: !!r.screen_mode, taskId: r.task_id, key: Date.now() });
  }
  // A task's Start (Planner): Focus mode with that task (or the running session, if one is on).
  const startTask = (t: { id: number }) => focus.open({ taskId: t.id, ask: true });
  const openBlockRef = useRef(openBlock);
  openBlockRef.current = openBlock;
  useEffect(() => bridge().onOpenBlock((id) => openBlockRef.current(id)), []);
  // Used once: after the session starts, the next setup starts from your defaults again.
  useEffect(() => { if (session.phase === 'running') setPrefill(null); }, [session.phase]);

  useSelftest(det.engine?.delegate, det.engine?.loadMs, det.listeners, det.error || (det.cameraError && `Could not open the camera: ${det.cameraError}`)); // selftest output: English
  const camProblem = det.cameraError ? cameraProblem(det.cameraError) : null;
  // The Debug tab is for recording test clips and tuning; hidden unless switched on in Settings → Advanced.
  const tabs = TABS.filter(([t]) => t !== 'debug' || settings.showDebug);
  useEffect(() => { if (tab === 'debug' && !settings.showDebug) setTab('study'); }, [settings.showDebug]);
  // Every tab opens at its top (it used to keep the last tab's scroll position, so a tab change looked like nothing).
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  useEffect(() => { document.documentElement.lang = settings.language === 'bn' ? 'bn' : 'en'; }, [settings.language]);
  useEffect(() => {
    if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);
  // Windows' minimise / maximise / close sit on the colour of whatever fills the top of the window (electron/main.ts,
  // window:colors): the page, the red alarm screen, or Focus mode's background (owner, 2026-10-23: never a white box).
  const screenTop = session.alarm ? 'alarm' : focus.view === 'full' ? 'focus' : 'page';
  useEffect(() => {
    const paint = () => {
      const css = getComputedStyle(document.documentElement);
      const color = screenTop === 'alarm' ? css.getPropertyValue('--alarm-bg') : screenTop === 'focus' ? backgroundColor(settings.focusBg) : css.getPropertyValue('--bg');
      bridge().windowColors({ color: color.trim(), symbolColor: (screenTop === 'focus' ? '#ECEDF1' : css.getPropertyValue('--text')).trim() });
    };
    paint();
    const system = matchMedia('(prefers-color-scheme: dark)');
    system.addEventListener('change', paint);
    return () => system.removeEventListener('change', paint);
  }, [settings.theme, screenTop, settings.focusBg]);

  // First-run setup: resumes at the saved step; never runs for someone who already has sessions.
  const [setup, setSetup] = useState<SetupStep | null>(() => (!settings.setupDone && isSetupStep(settings.setupStep) ? settings.setupStep : null));
  useEffect(() => {
    if (settings.setupDone || isSetupStep(settings.setupStep)) return;
    bridge().range(0, Date.now() + 1).then((r) => {
      const what = setupOnStart(latest.current, r.sessions.length > 0);
      if (what === 'skip-existing') patch({ setupDone: true, toursSeen: ALL_TOURS });
      else if (what !== 'none') goSetup(what);
    });
  }, []);
  const goSetup = (step: SetupStep) => { setSetup(step); patch({ setupDone: false, setupStep: step }); };
  const finishSetup = (tour: boolean) => {
    setSetup(null);
    patch({ setupDone: true, setupStep: '' });
    setTab('study');
    if (tour) setTimeout(() => setTourId('study'), 300);
  };

  // Tours: the Study tour after setup, each other screen's tour on its first visit, any of them from Help.
  const [tourId, setTourId] = useState<TourId | null>(null);
  const endTour = () => { if (tourId) patch({ toursSeen: markSeen(latest.current.toursSeen, tourId) }); setTourId(null); };
  useEffect(() => {
    if (setup || !settings.setupDone || tab === 'study' || tab === 'debug' || seenTours(settings.toursSeen).has(tab)) return;
    const id = setTimeout(() => setTourId(tab), 400);
    return () => clearTimeout(id);
  }, [tab, setup, settings.setupDone]);
  const [help, setHelp] = useState(false);

  // The camera always runs (the session needs it). Its preview shows on Debug, on Study only when asked,
  // and in the setup steps that need it.
  const [cameraShown, setCameraShown] = useState(false);
  const withCamera = setup ? setup === 'camera' || setup === 'aim' || setup === 'calibrate' : tab === 'debug' || (tab === 'study' && cameraShown);
  return (
    <>
      <PairDialog />
      {/* The top strip is the window's title bar (electron/main.ts): the tab bar, or during setup an empty strip. */}
      {setup && <div className="drag-strip" aria-hidden="true" />}
      {!setup && <nav className="tabs" aria-label={tr('Main')}>
        <div className="pill-tabs">
          {tabs.map(([t, text]) => (
            <button key={t} data-tour={`tab-${t}`} className={tab === t ? 'on' : ''} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
              {t === 'debug' ? text : tr(text)}{t === 'study' && active ? ' ●' : ''}
            </button>
          ))}
        </div>
        <div className="help">
          <button aria-expanded={help} aria-haspopup="menu" onClick={() => setHelp(!help)}>{tr('Help')}</button>
          {help && <div className="help-menu" role="menu" onKeyDown={(e) => { if (e.key === 'Escape') setHelp(false); }}>
            {tab !== 'debug' && <button role="menuitem" autoFocus onClick={() => { setHelp(false); setTourId(tab as TourId); }}>{tr('Tour of this screen')}</button>}
            <button role="menuitem" disabled={active} title={active ? tr('End your session first') : undefined}
                    onClick={() => { setHelp(false); goSetup('welcome'); }}>{tr('Run setup again')}</button>
          </div>}
        </div>
      </nav>}
      <ReminderBar volume={settings.alarmVolume} onReady={openBlock} />
      <BlockWarning screen={session.screen} running={session.phase === 'running'} />
      {tourId && <Tour key={tourId} id={tourId} onEnd={endTour} />}
      <main className={withCamera ? `app${!setup && tab === 'debug' ? ' sticky-camera' : ''}` : `app single${!setup && tab === 'planner' ? ' wide' : ''}`}>
        {/* The camera keeps running on every tab (the session needs it); off-tab it is only moved out of view. */}
        <section className={withCamera ? 'stage' : 'stage offscreen'}>
          <div className="mirror">
            <video ref={det.videoRef} muted playsInline />
            <canvas ref={canvas} />
          </div>
          <p className="note">{tr('Camera images stay on this computer. Nothing is recorded or sent, except test clips you record yourself.')}</p>
          {det.error && <p className="warn">{det.error}</p>}
          {camProblem && <p className="warn">{camProblem.title}. {camProblem.advice}</p>}
        </section>
        {setup && <FirstRun step={setup} go={goSetup} finish={finishSetup} live={det.live} listeners={det.listeners}
                            cameraProblem={camProblem} onRetryCamera={det.retryCamera} settings={settings} setSettings={setSettings} session={session} />}
        {!setup && tab === 'study' && <Study key={prefill?.key} prefill={prefill} session={session} settings={settings} setSettings={setSettings} live={det.live} listeners={det.listeners}
                                   onSettings={() => setTab('settings')} onPlanner={() => setTab('planner')} onFocus={focus.open}
                                   cameraShown={cameraShown} onToggleCamera={() => setCameraShown(!cameraShown)}
                                   cameraProblem={camProblem} onRetryCamera={det.retryCamera} />}
        {!setup && tab === 'planner' && <Planner onOpenBlock={openBlock} onStartTask={startTask} weekStart={settings.weekStart} pomoMin={settings.pomoMin} dailyPomos={settings.dailyPomos} />}
        {!setup && tab === 'history' && <History onStudy={() => setTab('study')} weekStart={settings.weekStart} pomoMin={settings.pomoMin} />}
        {!setup && tab === 'settings' && <SettingsScreen power={det.power} settings={settings} setSettings={setSettings} sessionActive={active} onDataChanged={() => location.reload()} />}
        {!setup && tab === 'debug' && <Debug live={det.live} settings={settings} setSettings={setSettings} listeners={det.listeners} videoRef={det.videoRef}
                                   delegate={det.engine?.delegate} loadMs={det.engine?.loadMs} />}
      </main>
      {focus.view === 'full' && <Focus f={focus} session={session} settings={settings} patch={patch} tasks={planner.tasks} reloadTasks={planner.reload}
                                       onFixCamera={() => { setTab('study'); setCameraShown(true); }} />}
    </>
  );
}

// `npm run selftest`: runs the real camera + models for 8 s in a hidden window and
// prints numbers (never images) to the terminal, then quits.
const SECS = Number(new URLSearchParams(location.search).get('secs') ?? 8) * 1000;

function useSelftest(delegate: string | undefined, loadMs: number | undefined, listeners: Set<(l: Live) => void>, error: string) {
  const on = location.search.includes('selftest');
  useEffect(() => {
    if (on && error) window.deskwatch.reportSelftest('SELFTEST ERROR: ' + error);
  }, [error]);
  useEffect(() => {
    if (!on || !delegate) return;
    const frames: Live[] = [];
    const f = (l: Live) => frames.push(l);
    listeners.add(f);
    setTimeout(() => {
      listeners.delete(f);
      const n = frames.length;
      const secs = SECS / 1000;
      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
      const pitches = frames.map((l) => l.frame.pitch).filter((p): p is number => p !== null);
      window.deskwatch.reportSelftest([
        'SELFTEST OK',
        `delegate=${delegate} modelLoadMs=${loadMs}`,
        `checks=${n} in ${secs} s (${(n / secs).toFixed(1)}/s), avgCheckMs=${avg(frames.map((l) => l.frame.ms.face)).toFixed(1)}`,
        `phone checks=${n ? frames[n - 1].frame.seq.det - frames[0].frame.seq.det : 0} (${(n ? (frames[n - 1].frame.seq.det - frames[0].frame.seq.det) / secs : 0).toFixed(1)}/s)`,
        `hand checks=${n ? frames[n - 1].frame.seq.hands - frames[0].frame.seq.hands : 0} (${(n ? (frames[n - 1].frame.seq.hands - frames[0].frame.seq.hands) / secs : 0).toFixed(1)}/s)`,
        `second half: handMs=${avg(frames.slice(Math.floor(n / 2)).map((l) => l.frame.ms.hands)).toFixed(1)} phoneMs=${avg(frames.slice(Math.floor(n / 2)).map((l) => l.frame.ms.det)).toFixed(1)} faceMs=${avg(frames.slice(Math.floor(n / 2)).map((l) => l.frame.ms.face)).toFixed(1)}`,
        `faceFound=${frames.filter((l) => l.frame.face).length}/${n}`,
        `maxPersonScore=${Math.max(0, ...frames.map((l) => l.frame.personScore)).toFixed(2)} maxPhoneScore=${Math.max(0, ...frames.map((l) => l.signals.phone)).toFixed(2)}`,
        `pitch avg=${avg(pitches).toFixed(1)} min=${Math.min(...pitches).toFixed(1)} max=${Math.max(...pitches).toFixed(1)}`,
        `states=${[...new Set(frames.map((l) => l.status.state))].join(',')}`,
      ].join('\n'));
    }, SECS);
  }, [delegate]);
}
