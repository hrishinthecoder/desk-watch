// Plain line icons (Night Desk, 2026-10-23), always shown with a word next to them or as the button's name.
// Drawn as SVG so Windows never turns them into coloured emoji.
const P = {
  play: <path d="M7 5v14l12-7z" fill="currentColor" stroke="none" />,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></>,
  sound: <><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" /></>,
  background: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 15l6-4.5 6 4.5 3-2.2 3 2.2" /></>,
  tasks: <><path d="M3 6l2 2 3-3M3 15l2 2 3-3M11 7h10M11 16h10" /></>,
  exit: <path d="M6 6l12 12M18 6L6 18" />,
  close: <path d="M7 7l10 10M17 7L7 17" />,
  chevron: <path d="M7 10l5 5 5-5" />,
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  minus: <path d="M6 12h12" />,
  plus: <path d="M6 12h12M12 6v12" />,
  small: <><rect x="3" y="3" width="18" height="18" rx="3" /><rect x="12" y="12" width="6" height="6" rx="1" fill="currentColor" stroke="none" /></>,
  full: <path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5" />,
  clock: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /></>,
  moon: <path d="M19 15.5A8 8 0 0 1 8.5 5a8 8 0 1 0 10.5 10.5z" />,
  cup: <><path d="M4 12a8 8 0 0 0 16 0" /><path d="M12 3v5" /></>,
  bell: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  camera: <><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="M16 10l5-3v10l-5-3" /></>,
  // Alarm symbols (Alarm-Phone / Alarm-Variants boards)
  phone: <><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M10.5 18.5h3" /></>,
  away: <><circle cx="12" cy="7" r="3.5" /><path d="M5 21c.6-4.6 3.4-7.5 7-7.5s6.4 2.9 7 7.5" strokeDasharray="3 3" /></>,
  eye: <><path d="M2 12c3-5 6.5-7.5 10-7.5s7 2.5 10 7.5c-3 5-6.5 7.5-10 7.5S5 17 2 12z" /><circle cx="16" cy="12" r="2.6" fill="currentColor" stroke="none" /></>,
  sleep: <><path d="M18 15A8 8 0 0 1 8 5a8 8 0 1 0 10 10z" /><path d="M15 3h4l-4 4.5h4" /></>,
  blocked: <><circle cx="12" cy="12" r="9" /><path d="M5.6 18.4L18.4 5.6" /></>,
};
// The symbol in the middle of each full-window alarm.
export const alarmIcon = (alarm: string): IconName => (alarm.startsWith('Blocked') ? 'blocked' : alarm.startsWith('Phone') ? 'phone'
  : alarm === 'Away' ? 'away' : alarm === 'Wake up' ? 'sleep' : alarm === 'Break is over' ? 'clock' : 'eye');
export type IconName = keyof typeof P;
export const Icon = ({ name, size = 20 }: { name: IconName; size?: number }) => (
  <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>
);

// State shapes (DS: "shape + word, colour third"): ready = filled circle with a tick, studying = ring with a dot,
// paused = two bars, break = a cup, warning = an amber triangle, alarm = a red diamond, idle = an empty ring.
export type StateShape = 'ready' | 'focus' | 'paused' | 'break' | 'warn' | 'alarm' | 'idle';
export function StateIcon({ shape, size = 16 }: { shape: StateShape; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true as const, className: `icon state-icon state-${shape}` };
  if (shape === 'ready') return <svg {...s}><circle cx="8" cy="8" r="8" fill="var(--accent)" /><path d="M4.5 8.2l2.3 2.2 4.7-4.8" fill="none" stroke="var(--on-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (shape === 'focus') return <svg {...s}><circle cx="8" cy="8" r="7" fill="none" stroke="var(--accent)" strokeWidth="2" /><circle cx="8" cy="8" r="3" fill="var(--accent)" /></svg>;
  if (shape === 'paused') return <svg {...s}><rect x="3" y="2" width="3.5" height="12" rx="1" fill="var(--text-quiet)" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="var(--text-quiet)" /></svg>;
  if (shape === 'break') return <svg {...s}><path d="M3 9a5 5 0 0 0 10 0" fill="none" stroke="var(--text-quiet)" strokeWidth="1.8" strokeLinecap="round" /><path d="M8 2v4" stroke="var(--text-quiet)" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (shape === 'warn') return <svg {...s} viewBox="0 0 14 13"><path d="M7 1l6 11H1z" fill="none" stroke="var(--warn)" strokeWidth="1.4" strokeLinejoin="round" /><path d="M7 5v3M7 10v.5" stroke="var(--warn)" strokeWidth="1.4" strokeLinecap="round" /></svg>;
  if (shape === 'alarm') return <svg {...s}><path d="M8 1l7 7-7 7-7-7z" fill="var(--alarm)" /><path d="M8 5v3.5M8 11v.2" stroke="var(--alarm-bg)" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  return <svg {...s}><circle cx="8" cy="8" r="7" fill="none" stroke="var(--text-2)" strokeWidth="2" /></svg>;
}
