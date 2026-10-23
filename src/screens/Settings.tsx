import { useEffect, useState } from 'react';
import { bridge } from '../bridge';
import { ALARM_SOUNDS, playAlarm } from '../session/sounds';
import { WorkstationList } from './Workstations';
import { ScreenSettings } from './ScreenMode';
import { LEVEL_TEXT, MIN_RATE, type PowerLevel, type Rates } from '../state/power';
import { DEFAULTS, type AlarmSound, type Settings as Config, type Theme } from '../state/config';
import { fmtDate, LANGS, n, t, tk, weekdayName } from '../../electron/i18n';
import { validWeekStart } from '../session/accounting';

type Props = { settings: Config; setSettings: (s: Config) => void; sessionActive: boolean; onDataChanged: () => void;
  power: { level: PowerLevel; rates: Rates | null } };

// Every detection threshold, in plain words. Order = order on screen. Shown with t().
const THRESHOLDS: [keyof Config, string][] = [
  ['phoneEnter', tk('Phone: evidence needed to count as phone (0-1)')],
  ['phoneExit', tk('Phone: evidence below this counts as phone gone (0-1)')],
  ['phoneSec', tk('Phone: seconds before the Phone alarm')],
  ['phoneGapSec', tk('Phone: short dips forgiven (seconds)')],
  ['phoneExitSec', tk('Phone: seconds without phone to clear it')],
  ['cropsForPhone', tk('Phone: also use the zoomed hand view (catches more phones)')],
  ['objectVeto', tk('Phone: ignore objects that look like a calculator, pen or book')],
  ['objectMinScore', tk('Phone: confidence needed to name an object (0-1)')],
  ['emptyMin', tk('Phone: ignore phone boxes in a hand the object model is this sure is empty (0 = off)')],
  ['usePose', tk('Phone: a raised, still hand adds evidence')],
  ['handPad', tk('Phone: hand view size (× hand size)')],
  ['poseMinPhone', tk('Raised hand: minimum phone evidence')],
  ['poseStillSec', tk('Raised hand: seconds held still')],
  ['poseStillMove', tk('Raised hand: "still" means moving less than (share of width)')],
  ['callSec', tk('Phone call: seconds before the alarm')],
  ['callExitSec', tk('Phone call: seconds to clear it')],
  ['earReach', tk('Phone call: finger distance to ear (face widths)')],
  ['earBoxReach', tk('Phone call: phone distance to ear (face widths)')],
  ['earSide', tk('Phone call: hand must be this far out past the ear (face widths)')],
  ['callBoxMin', tk('Phone call: phone evidence needed at the hand (0 = hand at ear is enough)')],
  ['downSec', tk('Looking down: seconds before the alarm')],
  ['pitchMargin', tk('Looking down: degrees beyond your reading angle')],
  ['defaultPitchLimit', tk('Looking down: angle used until you calibrate (degrees)')],
  ['awaySec', tk('Away: seconds before the alarm')],
  ['lookAwaySec', tk('Looking away: seconds before the alarm')],
  ['sleepySec', tk('Sleepy: eyes closed, seconds before the alarm')],
  ['headDownSec', tk('Sleepy: head down on the desk, seconds before the alarm')],
  ['sleepyLid', tk('Sleepy: eyes count as closed above (0-1)')],
  ['awayEyes', tk('Looking away: eyes sideways (0-1)')],
  ['awayYaw', tk('Looking away: or head turned more than (degrees)')],
  ['speakJaw', tk('Speaking: mouth movement (0-1)')],
  ['readEyes', tk('Reading (before calibration): eyes down (0-1)')],
  ['writeMove', tk('Writing (before calibration): visible hand movement')],
  ['lapEyes', tk('Phone in lap: eyes-level rule (0 = off; try 0.15)')],
  ['lapMargin', tk('Phone in lap: degrees past your reading angle (can be negative)')],
  ['personScore', tk('Person: confidence needed to count you as present (0-1)')],
  ['smoothMs', tk('Smoothing window (milliseconds)')],
  ['checksPerSec', tk('Checks per second')],
];
const THEME_TEXT: [Theme, string][] = [['system', tk('Same as Windows')], ['light', tk('Light')], ['dark', tk('Dark')]];
const POWER_TEXT: [string, string][] = [['auto', tk('Auto')], ['full', tk('Full')], ['low', tk('Low power')]];

export function CameraSelect({ settings, setSettings }: Pick<Props, 'settings' | 'setSettings'>) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => { navigator.mediaDevices.enumerateDevices().then((d) => setCameras(d.filter((x) => x.kind === 'videoinput'))); }, []);
  return (
    <label className="field">{t('Camera')}
      <select value={settings.cameraId} onChange={(e) => setSettings({ ...settings, cameraId: e.target.value })}>
        <option value="">{t('Default camera')}</option>
        {cameras.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label || t('Camera')}</option>)}
      </select>
    </label>
  );
}

// The section list on the left (Night Desk Settings board): each button scrolls to its section.
const SECTIONS: [string, string][] = [['app', tk('App')], ['sessions', tk('Sessions')], ['alarm', tk('Alarm')], ['pomodoro', tk('Pomodoro')], ['data', tk('Your data')], ['advanced', tk('Advanced')]];
function jump(key: string) {
  const el = document.getElementById(`set-${key}`);
  if (el instanceof HTMLDetailsElement) el.open = true;
  el?.scrollIntoView({ block: 'start' });
}

export function SettingsScreen({ settings, setSettings, sessionActive, onDataChanged, power }: Props) {
  const [login, setLogin] = useState<boolean | null>(null);
  const [dbPath, setDbPath] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { bridge().getLogin().then(setLogin); bridge().dataPath().then(setDbPath); }, []);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setSettings({ ...settings, [k]: v });
  const num = (k: keyof Config) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (e.target.value !== '' && Number.isFinite(v) && (v >= 0 || k === 'lapMargin')) set(k, v as never);
  };
  const saved = (p: string | null) => setMsg(p ? t('Saved to {path}', { path: p }) : '');

  async function importJson() {
    if (!confirm(t('Importing REPLACES all your sessions and settings with the ones in the file.\n\nExport your current data first if you may want it back. Continue?'))) return;
    const r = await bridge().importJson();
    if (r === 'ok') { setMsg(t('Imported.')); onDataChanged(); } else if (r) setMsg(r);
  }
  async function deleteAll() {
    if (!confirm(t('Delete ALL your sessions, history and settings? This cannot be undone.'))) return;
    if (!confirm(t('Are you sure? Everything in the database will be gone.'))) return;
    const r = await bridge().deleteAll();
    if (r === 'ok') { setMsg(t('All data deleted.')); onDataChanged(); } else setMsg(r);
  }

  return (
    <div className="settings-page">
      <nav className="settings-nav" aria-label={t('Settings sections')}>
        {SECTIONS.map(([key, text]) => <button key={key} onClick={() => jump(key)}>{t(text)}</button>)}
      </nav>
      <div className="settings">
        <section id="set-app">
          <h3>{t('App')}</h3>
          <div className="field-block">
            <span>{t('Language')}</span>
            <div className="cards compact" role="radiogroup" aria-label={t('Language')}>
              {LANGS.map(([k, name]) => (
                <button key={k} role="radio" lang={k} aria-checked={(settings.language === 'bn' ? 'bn' : 'en') === k} className="card" onClick={() => set('language', k)}><b>{name}</b></button>
              ))}
            </div>
            <small className="muted">{t('Bangla uses Bangla digits and dates. The Debug tab stays in English.')}</small>
          </div>
          <div className="field-block">
            <label className="field">{t('Week starts on')}
              {/* All 7 days (2026-10-21), named in the chosen language; Saturday first, as the week often starts in Bangladesh. */}
              <select value={validWeekStart(settings.weekStart)} onChange={(e) => set('weekStart', Number(e.target.value))}>
                {[6, 0, 1, 2, 3, 4, 5].map((k) => <option key={k} value={k}>{weekdayName(k)}</option>)}
              </select>
            </label>
            <small className="muted">{t('Used by the Planner’s week and History’s “This week”.')}</small>
          </div>
          <div className="field-block">
            <span>{t('Theme')}</span>
            <div className="cards compact" role="radiogroup" aria-label={t('Theme')}>
              {THEME_TEXT.map(([k, label]) => (
                <button key={k} role="radio" aria-checked={settings.theme === k} className="card" onClick={() => set('theme', k)}><b>{t(label)}</b></button>
              ))}
            </div>
          </div>
          <label className="check"><input type="checkbox" disabled={login === null} checked={!!login}
            onChange={async (e) => { await bridge().setLogin(e.target.checked); setLogin(await bridge().getLogin()); }} />
            {t('Start Desk Watch when I log in to Windows')}</label>
          <CameraSelect settings={settings} setSettings={setSettings} />
        </section>
        <section id="set-sessions" data-tour="settings-sessions">
          <h3>{t('Sessions')}</h3>
          <label className="field">{t('Default length (focused minutes)')}<input type="number" min={1} value={settings.goalMin} onChange={num('goalMin')} /></label>
          <label className="field">{t('Break length (minutes)')}<input type="number" min={1} value={settings.breakMin} onChange={num('breakMin')} /></label>
          <label className="check"><input type="checkbox" checked={settings.strictMode} onChange={(e) => set('strictMode', e.target.checked)} />
            {t('Strict mode')} <small>{t('ending a session early needs a typed sentence')}</small></label>
          <label className="check"><input type="checkbox" checked={settings.sleepyAlarm} onChange={(e) => set('sleepyAlarm', e.target.checked)} />
            {t('Sleepy alarm')} <small>{t('eyes closed {eyes} s, or head down on the desk {head} s (times in Advanced)', { eyes: settings.sleepySec, head: settings.headDownSec })}</small></label>
          <label className="check"><input type="checkbox" checked={settings.routineReminders} onChange={(e) => set('routineReminders', e.target.checked)} />
            {t('Routine reminders')} <small>{t('when a block from your weekly plan starts (not during a session)')}</small></label>
          <label className="check"><input type="checkbox" checked={settings.quietSites} onChange={(e) => set('quietSites', e.target.checked)} />
            {t('Block website notifications')} <small>{t('in Chrome or Edge while a session runs; back after it ends, a break or a pause (needs the browser extension)')}</small></label>
          <label className="check"><input type="checkbox" checked={settings.dndReminder} onChange={(e) => set('dndReminder', e.target.checked)} />
            {t('Remind me to turn on Do not disturb')} <small>{t('Windows notifications: Desk Watch cannot switch them off itself, so a bar opens the Windows setting for you')}</small></label>
        </section>
        <section id="set-alarm">
          <h3>{t('Alarm')}</h3>
          <div className="cards" role="radiogroup" aria-label={t('Alarm sound')}>
            {(Object.entries(ALARM_SOUNDS) as [AlarmSound, string][]).map(([k, label]) => (
              <button key={k} role="radio" aria-checked={settings.alarmSound === k} className="card" onClick={() => { set('alarmSound', k); playAlarm(k, settings.alarmVolume); }}>
                <b>{t(label)}</b><small>{settings.alarmSound === k ? t('Chosen') : t('Click to hear')}</small>
              </button>
            ))}
          </div>
          <label className="field">{t('Volume {pct}%', { pct: Math.round(settings.alarmVolume * 100) })}
            <input type="range" min={0} max={1} step={0.05} value={settings.alarmVolume} onChange={(e) => set('alarmVolume', Number(e.target.value))} />
          </label>
          <button className="self-start" onClick={() => playAlarm(settings.alarmSound, settings.alarmVolume)}>{t('Test sound')}</button>
        </section>
        <section id="set-pomodoro">
          <h3>{t('Pomodoro')}</h3>
          <p className="muted">{t('Used by Focus mode and the to-do list: a pomodoro is this many minutes of camera-checked focused time.')}</p>
          <label className="field">{t('Pomodoro length (minutes)')}<input type="number" min={1} max={180} value={settings.pomoMin} onChange={num('pomoMin')} /></label>
          <label className="field">{t('Break (minutes)')}<input type="number" min={1} max={60} value={settings.shortBreakMin} onChange={num('shortBreakMin')} /></label>
          <label className="field">{t('Number of pomodoros')} <small>{t('in a Focus mode run')}</small><input type="number" min={1} max={12} value={settings.pomoCount} onChange={num('pomoCount')} /></label>
          <label className="field">{t('Long break (minutes)')}<input type="number" min={1} max={120} value={settings.longBreakMin} onChange={num('longBreakMin')} /></label>
          <label className="field">{t('Long break after (pomodoros)')}<input type="number" min={1} max={12} value={settings.longEvery} onChange={num('longEvery')} /></label>
          <label className="field">{t('Daily goal (pomodoros)')}<input type="number" min={1} max={40} value={settings.dailyPomos} onChange={num('dailyPomos')} /></label>
          <label className="check"><input type="checkbox" checked={settings.autoStartNext} onChange={(e) => set('autoStartNext', e.target.checked)} />
            {t('Start the next pomodoro by itself')} <small>{t('when a break ends; otherwise press Start next pomodoro')}</small></label>
        </section>
        <section id="set-data">
          <h3>{t('Your data')}</h3>
          <p className="muted">{t('Everything is stored only on this computer, in one file:')} <code>{dbPath}</code>{t(', plus weekly backups of it.')}</p>
          <div className="row">
            <button onClick={() => bridge().openDataFolder()}>{t('Open folder')}</button>
            <button onClick={async () => saved(await bridge().exportCsv())}>{t('Export sessions (CSV)')}</button>
            <button onClick={async () => saved(await bridge().exportJson())}>{t('Export everything (JSON)')}</button>
            <button disabled={sessionActive} onClick={importJson}>{t('Import JSON…')}</button>
          </div>
          {sessionActive && <p className="muted">{t('End your session to import, restore or delete data.')}</p>}
          {msg && <p>{msg}</p>}
          <Backups sessionActive={sessionActive} onDataChanged={onDataChanged} />
        </section>
        <details id="set-advanced" className="advanced" data-tour="settings-advanced">
          <summary>{t('Advanced')}</summary>
          <section>
            <label className="check"><input type="checkbox" checked={settings.showDebug} onChange={(e) => set('showDebug', e.target.checked)} />
              {t('Show Debug tab')} <small>{t('for recording test clips and checking detection')}</small></label>
          </section>
          <section>
            <h3>{t('Performance')}</h3>
            <div className="cards compact" role="radiogroup" aria-label={t('Performance')}>
              {POWER_TEXT.map(([k, label]) => (
                <button key={k} role="radio" aria-checked={settings.powerMode === k} className="card" onClick={() => set('powerMode', k)}><b>{t(label)}</b></button>
              ))}
            </div>
            <p className="muted">{t('Auto measures your computer’s speed after start and uses a lighter mode only if it is too slow. On the test clips the smaller phone model was as good as the full one, and checking 2 times a second instead of 5 caught the same phones, with the alarm about 1 second later.')}</p>
            <p className="power-now"><b>{t('In use: {level}', { level: t(LEVEL_TEXT[power.level]) })}</b>
              {power.rates ? ` · ${t('measured {phone} phone checks and {hands} hand checks a second', { phone: n(power.rates.phone.toFixed(1)), hands: n(power.rates.hands.toFixed(1)) })}${power.level === 'fewer' ? '' : ` ${t('({min} needed)', { min: MIN_RATE })}`}` : ` · ${t('measuring…')}`}</p>
          </section>
          <section>
            <h3>{t('Browser connection')}</h3>
            <ScreenSettings />
          </section>
          <section>
            <h3>{t('Workstations')}</h3>
            <WorkstationList settings={settings} setSettings={setSettings} />
          </section>
          <section>
            <h3>{t('Detection thresholds')}</h3>
            <p className="muted">{t('The defaults were tuned on test clips. Change them only if detection is wrong for you.')}</p>
            {THRESHOLDS.map(([k, text]) => typeof DEFAULTS[k] === 'boolean'
              ? <label key={k} className="check"><input type="checkbox" checked={settings[k] as boolean} onChange={(e) => set(k, e.target.checked as never)} />{t(text)}</label>
              : <label key={k} className="field">{t(text)}<input type="number" step="any" min={k === 'lapMargin' ? undefined : 0} value={settings[k] as number} onChange={num(k)} /></label>)}
            <button className="self-start" onClick={() => setSettings({ ...settings, ...Object.fromEntries(THRESHOLDS.map(([k]) => [k, DEFAULTS[k]])) })}>{t('Reset thresholds to defaults')}</button>
          </section>
        </details>
        <section className="danger-zone">
          <h3>{t('Delete all my data')}</h3>
          <p className="muted">{t('Deletes every session, task, block list, setting and backup. Test clips from the Debug tab are kept in their own folder.')}</p>
          <button disabled={sessionActive} className="danger self-start" onClick={deleteAll}>{t('Delete all my data')}</button>
        </section>
        </div>
    </div>
  );
}

const when = (ms: number) => fmtDate(ms, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const size = (b: number) => (b < 1024 * 1024 ? t('{kb} KB', { kb: Math.max(1, Math.round(b / 1024)) }) : t('{mb} MB', { mb: n((b / 1024 / 1024).toFixed(1)) }));

// Weekly backups (Stage E3): when the last one was made, Back up now, and Restore for each one kept.
function Backups({ sessionActive, onDataChanged }: { sessionActive: boolean; onDataChanged: () => void }) {
  const [list, setList] = useState<{ name: string; at: number; size: number }[] | null>(null);
  const [msg, setMsg] = useState('');
  const load = () => bridge().backups().then(setList);
  useEffect(() => { load(); }, []);
  async function now() {
    const r = await bridge().backupNow();
    setMsg(r === 'ok' ? t('Backup made.') : r);
    load();
  }
  async function restore(b: { name: string; at: number }) {
    if (!confirm(t('Restore the backup from {when}?\n\nYour current data is backed up first, then replaced by this backup. Anything added after that backup will only be in the “before restore” backup.', { when: when(b.at) }))) return;
    const r = await bridge().restoreBackup(b.name);
    if (r === 'ok') onDataChanged(); else setMsg(r);
  }
  if (!list) return null;
  return (
    <div className="backups">
      <h4>{t('Backups')}</h4>
      <p className="muted">{t('A copy of your data is saved once a week; the newest 4 are kept.')}
        {' '}{list.length ? t('Last backup: {when}.', { when: when(list[0].at) }) : t('No backup yet.')}</p>
      <div className="row">
        <button onClick={now}>{t('Back up now')}</button>
        <button onClick={() => bridge().openBackupsFolder()}>{t('Open backups folder')}</button>
      </div>
      {list.length > 0 && <ul className="backup-list">
        {list.map((b) => (
          <li key={b.name}>
            <span>{when(b.at)}{b.name.includes('before-restore') ? ` · ${t('before restore')}` : ''} · {size(b.size)}</span>
            <button className="link" disabled={sessionActive} onClick={() => restore(b)}>{t('Restore…')}</button>
          </li>
        ))}
      </ul>}
      {msg && <p>{msg}</p>}
    </div>
  );
}
