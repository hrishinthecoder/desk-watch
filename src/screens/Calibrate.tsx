import { useRef, useState } from 'react';
import type { Live } from '../detection/engine';
import { averageVector, featureVector, type ActivityCal } from '../state/activities';
import { calibratedPitch } from '../state/classifier';
import { finishCalibration, type Settings } from '../state/config';
import { RECALIBRATE_HINT, SaveCalibration, WorkstationPicker } from './Workstations';
import { n, t, tk } from '../../electron/i18n';
import { playDone, playStep } from '../session/sounds';

// 30 s wizard: 10 s each of writing, reading and sitting idle. Saves your own average clues
// per activity (activity estimates) and, from the reading step, your reading angle.
const STEPS = [
  ['WRITING', tk('Write in your notebook, as you normally do')],
  ['READING', tk('Read your book or notes on the desk')],
  ['IDLE', tk('Sit still and think, looking at the screen')],
] as const;
const GET_READY_MS = 3000, MEASURE_MS = 10_000, MIN_CHECKS = 20;
const CANCEL = Symbol('cancel');

// newOnly (first-run setup): only adds a new place, never recalibrates or replaces an existing one.
// onDone is called with the new place's name once the 30 s are finished and saved.
type Props = { live: Live | null; settings: Settings; setSettings: (s: Settings) => void; listeners: Set<(l: Live) => void>;
  newOnly?: boolean; onDone?: (place: string) => void };

export function Calibrate({ live, settings, setSettings, listeners, newOnly, onDone }: Props) {
  const [msg, setMsg] = useState('');
  const [running, setRunning] = useState(false);
  const [newName, setNewName] = useState<string | null>(newOnly ? '' : null); // adding a new place
  const [saved, setSaved] = useState('');
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const cancelled = useRef(false);

  // `place`: save the result as this place (new, or the one being recalibrated); '' = for now only.
  async function run(place: string) {
    setRunning(true);
    setSaved('');
    cancelled.current = false;
    // One second of countdown; stops the whole calibration if Cancel was pressed.
    const tick = async (text: string) => {
      setMsg(text);
      await new Promise((r) => setTimeout(r, 1000));
      if (cancelled.current) throw CANCEL;
    };
    const cal = {} as ActivityCal;
    let pitches: number[] = [];
    try {
      for (const [act, text] of STEPS) {
        for (let s = GET_READY_MS / 1000; s > 0; s--) await tick(t('Get ready: {what} ({s})', { what: t(text), s }));
        const vs: number[][] = [];
        const ps: number[] = [];
        const f = (l: Live) => {
          if (!l.features.face) return;
          vs.push(featureVector(l.features));
          if (l.frame.pitch !== null) ps.push(l.frame.pitch);
        };
        listeners.add(f);
        try {
          for (let s = MEASURE_MS / 1000; s > 0; s--) await tick(`${t(text)}… ${n(s)}`);
        } finally {
          listeners.delete(f);
        }
        const avg = averageVector(vs);
        if (!avg || vs.length < MIN_CHECKS) {
          setMsg(t('Your face was not found often enough. Raise or tilt the camera so it sees your face, then try again.'));
          playDone(settingsRef.current.alarmVolume); // it has ended: look at the screen
          return;
        }
        cal[act] = avg.map((x) => Math.round(x * 1000) / 1000);
        if (act === 'READING') pitches = ps;
        if (act !== STEPS.at(-1)![0]) playStep(settingsRef.current.alarmVolume); // this part is done: switch to the next
      }
      const p = calibratedPitch(pitches);
      const cur = settingsRef.current;
      const result = { activityCal: cal, calibratedPitch: p === null ? cur.calibratedPitch : Math.round(p * 10) / 10 };
      // Setup must never replace a calibration you have: if the current one is not saved as a place,
      // the new place is only added to the list (pick it when you study there).
      const unsavedCurrent = !cur.workstation && cur.calibratedPitch !== null && cur.activityCal !== null;
      setSettings(newOnly && unsavedCurrent
        ? { ...cur, workstations: [...cur.workstations, { name: place.trim(), cameraId: cur.cameraId, ...result }] }
        : finishCalibration(cur, result, place));
      setMsg('');
      playDone(cur.alarmVolume);
      setNewName(newOnly ? '' : null);
      if (place.trim()) setSaved(`✓ ${t('Saved “{name}”', { name: place.trim() })}`);
      onDone?.(place.trim());
    } catch (e) {
      if (e !== CANCEL) throw e;
      setMsg(t('Calibration cancelled. Nothing was changed.'));
    } finally {
      setRunning(false);
    }
  }

  const calibrated = settings.calibratedPitch !== null && settings.activityCal !== null;
  const taken = newName !== null && settings.workstations.some((w) => w.name === newName.trim());
  return (
    <div className="clips">
      <details className="info">
        <summary><b>{t('Workstation and calibration')}</b> <span className="info-btn" title={t('What is this?')}>ⓘ</span></summary>
        <div className="info-card">
          <p><b>{t('Calibration (30 s):')}</b> {t('10 s writing, 10 s reading, 10 s thinking. Desk Watch learns how you look doing each, and your reading angle, so reading is not mistaken for looking down. Have a notebook and a book ready.')} {t('A soft beep tells you to switch after writing and after reading, and two tones play when it is over (at your alarm volume; none if it is 0).')}</p>
          <p><b>{t('Workstation:')}</b> {t('a saved calibration for one place you study. Pick it before a session; no need to calibrate again.')}</p>
          <p><b>{t('When to calibrate again:')}</b> {t(RECALIBRATE_HINT)}</p>
          <p><b>{t('New place:')}</b> {t('choose “+ New place…”, type its name and calibrate; it is saved when the 30 s are done.')}</p>
          <p><b>{t('Calibrate again')}</b> {t('updates the place that is selected.')}</p>
        </div>
      </details>
      {newName === null ? <>
        <WorkstationPicker settings={settings} setSettings={setSettings} onNew={() => { setNewName(''); setSaved(''); }} />
        <div className="row">
          <button onClick={() => run(settings.workstation)} disabled={running || !live}>{running ? t('Calibrating…') : calibrated ? t('Calibrate again') : t('Start calibration')}</button>
          {running && <button className="danger" onClick={() => { cancelled.current = true; }}>{t('Cancel')}</button>}
          <span className="note">{t('Reading angle {angle} · activities {done}', { angle: settings.calibratedPitch === null ? '—' : n(settings.calibratedPitch) + '°', done: settings.activityCal ? '✓' : '—' })}</span>
          {saved && <span className="ok-note">{saved}</span>}
        </div>
        {!calibrated && !running && <span className="warn">{t('Not calibrated yet: calibrate once before your first session.')}</span>}
      </> : <>
        <b>{t('New place')}</b>
        <div className="row">
          <input className="grow" autoFocus placeholder={t('Name, e.g. Library')} value={newName} maxLength={40} disabled={running} onChange={(e) => setNewName(e.target.value)} />
          <button className="primary-sm" disabled={running || !live || !newName.trim() || (newOnly && taken)} onClick={() => run(newName)}>{running ? t('Calibrating…') : t('Calibrate and save (30 s)')}</button>
          {running
            ? <button className="danger" onClick={() => { cancelled.current = true; }}>{t('Cancel')}</button>
            : !newOnly && <button onClick={() => setNewName(null)}>{t('Cancel')}</button>}
        </div>
        {taken && <span className="warn">{newOnly ? t('You already have a place with this name. Pick another name.') : t('A place with this name exists; it will be replaced.')}</span>}
        <span className="note">{t('Sit at the new place the way you normally study, with a notebook and a book ready.')}</span>
      </>}
      {msg && <p>{msg}</p>}
      {!newOnly && <SaveCalibration settings={settings} setSettings={setSettings} />}
    </div>
  );
}
