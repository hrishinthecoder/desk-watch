// The blocker's warning (Stage G4): before the alarm, a bar says what is blocked and what happens next.
// Shown above every tab and in Focus mode, only while a session runs (not in breaks or pauses).
// Night Desk: an amber bar; for a blocked app the seconds left also run down on a small track.
import type { ScreenStatus } from '../bridge';
import { WARN_MS } from '../../electron/blockrules';
import { StateIcon } from './icons';
import { n, t } from '../../electron/i18n';

export function BlockWarning({ screen, running }: { screen: ScreenStatus; running: boolean }) {
  if (!running) return null;
  const app = screen.appWarning;
  const text = app
    ? t('{name} is blocked. Close it, or the alarm rings in {s} s.', { name: app.name, s: n(String(app.left)) })
    : screen.site?.mode === 'warn'
      ? t('{site} is blocked. Going back to it within 2 minutes, or a 3rd blocked visit this session, rings the alarm.', { site: screen.site.host })
      : '';
  if (!text) return null;
  return (
    <div className="block-warning note-bar warn" role="alert">
      <StateIcon shape="warn" size={18} /><span>{text}</span>
      {app && <><span className="grow-gap" /><span className="countdown-track" aria-hidden="true"><span style={{ width: `${Math.min(100, (app.left * 1000 / WARN_MS) * 100)}%` }} /></span></>}
    </div>
  );
}
