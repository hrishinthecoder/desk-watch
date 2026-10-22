import { useState } from 'react';
import { deleteWorkstation, saveWorkstation, switchWorkstation, type Settings } from '../state/config';
import { n, t, tk } from '../../electron/i18n';

type P = { settings: Settings; setSettings: (s: Settings) => void };

// Shown with t().
export const RECALIBRATE_HINT = tk('Same desk, same chair and the camera where it was? Your saved calibration still fits, no need to calibrate again. Moved the laptop or camera, changed chair, or you sit differently? Calibrate again and update the workstation.');

const TEMP = '';

const NEW = '+new';

// Which place is in use, "+ New place…" to add one, and Delete for the selected one (its
// calibration stays in use until you pick another place or calibrate again).
export function WorkstationPicker({ settings, setSettings, onNew }: P & { onNew: () => void }) {
  const hasCal = settings.calibratedPitch !== null || settings.activityCal !== null;
  if (!settings.workstations.length) return <button onClick={onNew}>{t('+ New place')}</button>;
  const sel = settings.workstation;
  return (
    <div className="row">
      <label className="field grow">{t('Workstation')}
        <select value={sel} onChange={(e) => e.target.value === NEW ? onNew() : e.target.value !== TEMP && setSettings(switchWorkstation(settings, e.target.value))}>
          {sel === TEMP && <option value={TEMP}>{hasCal ? t('Not saved (this time only)') : t('Not calibrated')}</option>}
          {settings.workstations.map((w) => <option key={w.name} value={w.name}>{w.name}</option>)}
          <option value={NEW}>{t('+ New place…')}</option>
        </select>
      </label>
      {sel !== TEMP && <button className="danger" onClick={() => confirm(t('Delete the workstation “{name}”?', { name: sel })) && setSettings(deleteWorkstation(settings, sel))}>{t('Delete')}</button>}
    </div>
  );
}

// A calibration not saved to any place yet: give it a name to keep it.
export function SaveCalibration({ settings, setSettings }: P) {
  const [name, setName] = useState('');
  if (settings.workstation || (settings.calibratedPitch === null && settings.activityCal === null)) return null;
  const save = () => { setSettings(saveWorkstation(settings, name)); setName(''); };
  return (
    <div className="row">
      <span className="note">{t('Not saved:')}</span>
      <input className="grow" placeholder={t('Name, e.g. Desk at home')} value={name} maxLength={40}
             onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && save()} />
      <button disabled={!name.trim()} onClick={save}>{t('Save as workstation')}</button>
    </div>
  );
}

// Settings: the list, with use and delete.
export function WorkstationList({ settings, setSettings }: P) {
  return (
    <>
      <p className="note">{t(RECALIBRATE_HINT)}</p>
      {settings.workstations.length === 0
        ? <p className="note">{t('No saved workstations yet. Calibrate on the Study tab (Place and calibration), then save it with a name.')}</p>
        : <ul className="sessions">
            {settings.workstations.map((w) => (
              <li key={w.name} className="row">
                <b>{w.name}</b>
                <small className="note">{t('reading angle {angle}° · activities {state}', { angle: w.calibratedPitch === null ? '—' : n(w.calibratedPitch), state: w.activityCal ? t('calibrated') : t('not calibrated') })}</small>
                {settings.workstation === w.name ? <span className="note">{t('in use')}</span>
                  : <button onClick={() => setSettings(switchWorkstation(settings, w.name))}>{t('Use')}</button>}
                <button className="danger" onClick={() => confirm(t('Delete the workstation “{name}”?', { name: w.name })) && setSettings(deleteWorkstation(settings, w.name))}>{t('Delete')}</button>
              </li>
            ))}
          </ul>}
      <SaveCalibration settings={settings} setSettings={setSettings} />
    </>
  );
}
