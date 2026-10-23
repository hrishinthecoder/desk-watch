// First-run setup (E2 Part 3): welcome, camera, aim check, calibration, browser, guided practice.
// The step is saved after every move, so closing the app resumes here. "Skip setup" is on every step.
import { useEffect, useRef, useState } from 'react';
import { bridge } from '../bridge';
import { ClockText } from './ClockText';
import type { Live } from '../detection/engine';
import type { Session } from '../session/useSession';
import { ACTIVITY_TEXT, activityText, hms, reportSentence, STUDY, summarize } from '../session/accounting';
import type { Settings } from '../state/config';
import {
  aimCheck, GUIDE_TEXT, nextStep, practiceGuide, prevStep, PRIVACY_SENTENCE, SETUP_STEPS, type AimFrame, type Guide, type SetupStep,
} from '../state/setup';
import { Calibrate } from './Calibrate';
import { ThreeNumbers, Timeline } from './Report';
import { useExtensionInfo } from './ScreenMode';
import { Mark } from './Study';
import { Icon } from './icons';
import { AlarmScreen } from './Alarm';
import { LANGS, t, tk } from '../../electron/i18n';

type Props = {
  step: SetupStep; go: (s: SetupStep) => void; finish: (tour: boolean) => void;
  live: Live | null; listeners: Set<(l: Live) => void>; cameraProblem: { title: string; advice: string } | null; onRetryCamera: () => void;
  settings: Settings; setSettings: (s: Settings) => void; session: Session;
};
const TITLES: Record<SetupStep, string> = {
  welcome: tk('Welcome to Desk Watch'), camera: tk('Your camera'), aim: tk('Aim the camera'), calibrate: tk('Calibrate your place'),
  browser: tk('Connect your browser'), practice: tk('Practice session'),
};

export function FirstRun(p: Props) {
  const { step, go, finish } = p;
  const next = nextStep(step), back = prevStep(step);
  const [ready, setReady] = useState(false); // the step's own condition: camera on, aim good, place calibrated
  const move = (s: SetupStep) => { setReady(false); go(s); };
  // Camera must work to go on; aim and calibration can be skipped (they are worth doing, not required).
  const optional = step === 'aim' || step === 'calibrate';
  const canGo = ready || step === 'welcome' || step === 'browser' || optional;
  const skipSetup = async () => {
    if (p.session.phase === 'running' || p.session.phase === 'break') await p.session.end(true);
    p.session.newSession();
    finish(false);
  };
  const k = SETUP_STEPS.indexOf(step);
  return (
    <div className={`first-run step-${step}`}>
      {/* Where you are (Setup boards): the words and a row of short bars, one per step. */}
      <div className="setup-progress">
        <p className="muted">{t('Step {k} of {all}', { k: k + 1, all: SETUP_STEPS.length })}</p>
        <span className="setup-dashes" aria-hidden="true">{SETUP_STEPS.map((s, i) => <span key={s} className={i <= k ? 'on' : ''} />)}</span>
      </div>
      {step === 'welcome' && <svg className="setup-emblem" width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r="40" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        <circle cx="44" cy="44" r="40" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray="190 252" transform="rotate(-90 44 44)" />
        <circle cx="44" cy="44" r="10" fill="var(--accent)" />
      </svg>}
      <h2>{t(TITLES[step])}</h2>
      {step === 'welcome' && <>
        {/* The language comes first, so someone who reads Bangla can read the rest. */}
        <div className="cards lang-cards" role="radiogroup" aria-label={t('Language')}>
          {LANGS.map(([k, name]) => (
            <button key={k} role="radio" lang={k} aria-checked={(p.settings.language === 'bn' ? 'bn' : 'en') === k} className="card" onClick={() => p.setSettings({ ...p.settings, language: k })}><b>{name}</b></button>
          ))}
        </div>
        <p className="lead">{t('Desk Watch watches your study sessions through the camera and rings an alarm when you pick up your phone, leave or look away.')}</p>
        <p className="privacy-card"><Icon name="lock" size={18} />{t(PRIVACY_SENTENCE)}</p>
      </>}
      {step === 'camera' && <CameraStep {...p} onReady={setReady} />}
      {step === 'aim' && <AimStep {...p} onReady={setReady} />}
      {step === 'calibrate' && <>
        <p>{t('30 seconds: 10 writing, 10 reading, 10 thinking. Have a notebook and a book ready. Give this place a name.')}</p>
        <Calibrate live={p.live} settings={p.settings} setSettings={p.setSettings} listeners={p.listeners} newOnly onDone={() => setReady(true)} />
      </>}
      {step === 'browser' && <BrowserStep />}
      {step === 'practice' && <Practice {...p} go={move} onDone={() => finish(true)} />}

      <div className="row setup-nav">
        {step !== 'practice' && back && <button className="quiet" onClick={() => move(back)}>{t('Back')}</button>}
        <button className="quiet skip-setup" onClick={skipSetup}>{t('Skip setup')}</button>
        <span className="grow" />
        {step !== 'practice' && next && <button className="primary" disabled={!canGo} onClick={() => move(next)}>{optional && !ready ? t('Skip this step') : t('Next')}</button>}
      </div>
    </div>
  );
}

function CameraStep({ live, cameraProblem, onRetryCamera, onReady }: Props & { onReady: (ok: boolean) => void }) {
  useEffect(() => onReady(!!live && !cameraProblem), [!!live, !!cameraProblem]);
  if (cameraProblem) return <>
    <p className="state-line" role="alert"><Mark shape="triangle" />{cameraProblem.title}</p>
    <div className="row"><p className="muted">{cameraProblem.advice}</p><button onClick={onRetryCamera}>{t('Try again')}</button></div>
  </>;
  return <p className="state-line"><Mark shape={live ? 'circle' : 'ring'} />{live ? t('The camera is on.') : t('Starting the camera…')}</p>;
}

// Live ticks from the last 2 s of checks: face, hands, desk (hands in the lower part of the picture).
function AimStep({ listeners, onReady }: Props & { onReady: (ok: boolean) => void }) {
  const frames = useRef<AimFrame[]>([]);
  const [aims, setAims] = useState(aimCheck([]));
  useEffect(() => {
    const f = (l: Live) => {
      frames.current = [...frames.current.slice(-9), { face: !!l.frame.face, handsY: l.frame.hands.map((h) => h.pts.reduce((a, q) => a + q.y, 0) / h.pts.length) }];
      setAims(aimCheck(frames.current));
    };
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, [listeners]);
  const all = aims.every((a) => a.ok);
  useEffect(() => onReady(all), [all]);
  return <>
    <p>{t('Sit as you study, both hands on the desk. The picture should show your face at the top and the desk below.')}</p>
    <ul className="aim" aria-live="polite">
      {aims.map((a) => (
        <li key={a.key}><Mark shape={a.ok ? 'circle' : 'triangle'} /><b>{a.label}</b> {a.ok ? <span>{t('OK')}</span> : <span className="muted">{a.fix}</span>}</li>
      ))}
    </ul>
  </>;
}

function BrowserStep() {
  const { connected } = useExtensionInfo();
  return <>
    <p>{t('Optional. Lets Blocker mode block sites in Chrome or Edge. You can do this later in Settings → Advanced.')}</p>
    <ol className="steps">
      <li>{t('Click Open extension folder.')}</li>
      <li>{t('In Chrome open chrome://extensions (Edge: edge://extensions), switch on Developer mode, click Load unpacked and choose that folder.')}</li>
      <li>{t('Desk Watch asks “Connect Chrome?”: click Allow.')}</li>
    </ol>
    <div className="row">
      <button onClick={() => bridge().openExtensionFolder()}>{t('Open extension folder')}</button>
      <span className="state-line"><Mark shape={connected ? 'circle' : 'ring'} />{connected ? t('Connected') : t('Not connected yet')}</span>
    </div>
  </>;
}

// Guided 2-minute practice, never saved. Pick up the phone at 30 s, see and hear the alarm,
// put it down, see the clock restart. If the alarm does not ring within 10 s, say so.
function Practice({ session: s, go, onDone }: Props & { onDone: () => void }) {
  const [guide, setGuide] = useState<Guide>({ stage: 'study', since: 0 });
  const phoneAlarm = s.alarm === ACTIVITY_TEXT.PHONE || s.alarm === ACTIVITY_TEXT.PHONE_CALL;
  const clockRunning = !!s.activity && STUDY.has(s.activity);
  useEffect(() => {
    if (s.phase === 'running') setGuide((g) => practiceGuide(g, Date.now() - s.startedAt, phoneAlarm, clockRunning));
  });
  const start = () => { setGuide({ stage: 'study', since: 0 }); s.start({ plannedMin: 2, cameraMode: true, screenMode: false, practice: true }); };
  const stop = () => s.end(true);

  if (s.phase === 'setup') return <>
    <p>{t('Two minutes with the camera on, so you see how a session works. It is never saved: it does not count in History or your streak.')}</p>
    <p className="muted">{t('Keep your phone near you. After 30 seconds you will be asked to pick it up.')}</p>
    <div className="row setup-nav"><button className="primary" onClick={start}>{t('Start practice')}</button><button onClick={() => onDone()}>{t('Skip practice')}</button></div>
  </>;
  if (s.phase === 'done' || s.phase === 'saving') return <>
    <p className="sentence">{reportSentence(summarize(s.segments), 2, true)}</p>
    <ThreeNumbers segments={s.segments} events={[]} />
    <Timeline segments={s.segments} />
    <p className="muted">{t('This report is not saved.')}</p>
    <div className="row setup-nav"><button className="primary" onClick={() => { s.newSession(); onDone(); }}>{t('Finish')}</button></div>
  </>;
  const text = t(GUIDE_TEXT[guide.stage]);
  const checkAim = guide.stage === 'nofire' && <button className={s.alarm ? 'on-alarm' : 'self-start'} onClick={async () => { await stop(); s.newSession(); go('aim'); }}>{t('Check the aim')}</button>;
  // Any alarm takes the whole window, as in a real session; the guide line stays visible on it.
  if (s.alarm) return (
    <AlarmScreen alarm={s.alarm} className="study" clockLabel={t('Focused time')} clock={<ClockText text={hms(s.focusedMs / 1000)} />}
                 note={guide.stage === 'putdown' || guide.stage === 'nofire' ? text : t('Practice: the alarm stops when you are back to studying.')}>
      {checkAim}<button className="on-alarm" onClick={stop}>{t('End practice')}</button>
    </AlarmScreen>
  );
  return <>
    <p className="state-word"><Mark shape={clockRunning ? 'circle' : 'square'} />{s.activity ? activityText(s.activity) : t('Starting')}</p>
    <div className="clock"><ClockText text={hms(s.focusedMs / 1000)} /></div>
    <p className={`guide ${guide.stage}`} role="status"><Mark shape={guide.stage === 'nofire' ? 'triangle' : guide.stage === 'works' ? 'circle' : 'ring'} />{text}</p>
    {checkAim}
    <div className="row"><button onClick={stop}>{t('End practice')}</button></div>
  </>;
}
