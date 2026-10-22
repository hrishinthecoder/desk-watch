import type { ReactNode } from 'react';
import { alarmText } from '../session/accounting';
import { t } from '../../electron/i18n';
import { alarmAdvice } from './Study';
import { Icon, alarmIcon } from './icons';

// The full-window alarm (Night Desk Alarm boards), on the Study tab and in Focus mode: a red frame, the kind of alarm
// as a word, a symbol, what to do in big letters, and a bar with the clock and the buttons. It stops by itself.
export function AlarmScreen({ alarm, className, clockLabel, clock, children }: {
  alarm: string; className: string; clockLabel: string; clock: ReactNode; children: ReactNode;
}) {
  return (
    <div className={`${className} alarm-screen`} role="alert" aria-live="assertive">
      <p className="state-word alarm-kind">{alarmText(alarm)}</p>
      <div className="alarm-main">
        <span className="alarm-icon"><Icon name={alarmIcon(alarm)} size={44} /></span>
        <h1>{alarmAdvice(alarm)}</h1>
        <p className="alarm-note">{t('The alarm stops by itself when you are back.')}</p>
      </div>
      <div className="alarm-bar">
        <span className="alarm-clock">{clockLabel} <b>{clock}</b></span>
        <span className="grow" />
        {children}
      </div>
    </div>
  );
}
