// The mini timer (E4 Part 2): its own small always-on-top window while a Focus session runs outside full screen.
// It only shows what the main window sends; click the time to go back, the button pauses or resumes.
import { useEffect, useState } from 'react';
import { bridge, type MiniState } from '../bridge';
import { Icon } from './icons';
import { setLang, t, tk } from '../../electron/i18n';
import { ClockText } from './ClockText';

const BUTTON = { pause: ['pause', tk('Pause')], resume: ['play', tk('Resume')], next: ['play', tk('Start next pomodoro')] } as const;

export function Mini() {
  setLang(bridge().getSettings().language); // its own window: the same language as the app
  const [s, setS] = useState<MiniState | null>(null);
  useEffect(() => bridge().onMiniState(setS), []);
  useEffect(() => { document.documentElement.dataset.theme = 'dark'; document.title = 'Desk Watch timer'; }, []);
  return (
    <div className={`mini${s?.alarm ? ' alarm' : ''}`}>
      <span className="mini-grip" aria-hidden="true" title={t('Drag to move')} />
      <button className="mini-time" title={t('Back to full screen')} onClick={() => bridge().miniAction('open')}>
        <b><ClockText text={s?.time ?? '--:--'} /></b><small>{s?.label ?? ''}</small>
      </button>
      {s?.button && <button className="mini-toggle" aria-label={t(BUTTON[s.button][1])} title={t(BUTTON[s.button][1])} onClick={() => bridge().miniAction('toggle')}><Icon name={BUTTON[s.button][0]} size={16} /></button>}
    </div>
  );
}
