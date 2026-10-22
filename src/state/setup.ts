// First-run setup, the aim check, the guided practice session, the camera check before a
// session and the tours (Stage E2 Part 3). Pure, unit-tested in tests/setup.test.ts.
// Texts: tables use tk() and are translated where shown (t()); aimCheck translates itself.
import { t, tk } from '../../electron/i18n';

// Exactly true: frames are only looked at in memory. The only images ever written are clips
// the user records on purpose on the Debug tab.
export const PRIVACY_SENTENCE = tk('Camera images are never uploaded and never saved, except test clips you choose to record on the Debug tab.');

export const SETUP_STEPS = ['welcome', 'camera', 'aim', 'calibrate', 'browser', 'practice'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];
export const isSetupStep = (x: string): x is SetupStep => (SETUP_STEPS as readonly string[]).includes(x);
export const nextStep = (s: SetupStep): SetupStep | null => SETUP_STEPS[SETUP_STEPS.indexOf(s) + 1] ?? null;
export const prevStep = (s: SetupStep): SetupStep | null => SETUP_STEPS[SETUP_STEPS.indexOf(s) - 1] ?? null;

// On start: resume a setup that was closed halfway; never run it for someone who already has
// sessions (they used Desk Watch before setup existed); otherwise a new user starts at Welcome.
export function setupOnStart(s: { setupDone: boolean; setupStep: string }, hasSessions: boolean): 'none' | 'skip-existing' | SetupStep {
  if (s.setupDone) return 'none';
  if (isSetupStep(s.setupStep)) return s.setupStep;
  return hasSessions ? 'skip-existing' : 'welcome';
}

// Aim check from the last ~2 s of checks. "Desk" = hands seen in the lower part of the picture.
export type AimFrame = { face: boolean; handsY: number[] }; // hand centre heights, 0 = top, 1 = bottom
export type Aim = { key: 'face' | 'hands' | 'desk'; label: string; ok: boolean; fix: string };
export const DESK_Y = 0.55;
export function aimCheck(frames: AimFrame[]): Aim[] {
  const n = frames.length || 1;
  const withHands = frames.filter((f) => f.handsY.length);
  const ys = withHands.flatMap((f) => f.handsY).sort((a, b) => a - b);
  const median = ys.length ? ys[Math.floor(ys.length / 2)] : 0;
  return [
    { key: 'face', label: t('Face'), ok: frames.filter((f) => f.face).length / n >= 0.6, fix: t('Raise the camera or tilt it up so it sees your face.') },
    { key: 'hands', label: t('Hands'), ok: withHands.length / n >= 0.5, fix: t('Put both hands on the desk. Tilt the camera down or move it back until it sees them.') },
    { key: 'desk', label: t('Desk'), ok: withHands.length > 0 && median >= DESK_Y, fix: withHands.length ? t('Your hands are high in the picture. Tilt the camera down so the desk fills the lower part.') : t('Tilt the camera down so your desk and hands fill the lower part of the picture.') },
  ];
}

// Guided practice: study for 30 s, then "pick up your phone". The phone alarm must ring
// within 10 s, or we say so honestly. After "put it down", the clock running again ends the guide.
export const PICKUP_AT_MS = 30_000, ALARM_WAIT_MS = 10_000;
export type Guide = { stage: 'study' | 'pickup' | 'putdown' | 'works' | 'nofire'; since: number };
export function practiceGuide(g: Guide, elapsedMs: number, phoneAlarm: boolean, clockRunning: boolean): Guide {
  if (g.stage === 'study' && elapsedMs >= PICKUP_AT_MS) return { stage: 'pickup', since: elapsedMs };
  if (g.stage === 'pickup' && phoneAlarm) return { stage: 'putdown', since: elapsedMs };
  if (g.stage === 'pickup' && elapsedMs - g.since >= ALARM_WAIT_MS) return { stage: 'nofire', since: elapsedMs };
  if (g.stage === 'putdown' && !phoneAlarm && clockRunning) return { stage: 'works', since: elapsedMs };
  return g;
}
export const GUIDE_TEXT: Record<Guide['stage'], string> = {
  study: tk('Study as you normally would. In a moment you will pick up your phone.'),
  pickup: tk('Now pick up your phone and look at it.'),
  putdown: tk('That is the alarm. Put the phone down.'),
  works: tk('The clock is running again. That is how a session works.'),
  nofire: tk('The phone alarm did not ring within 10 seconds. The camera may not see your hands well: check the aim.'),
};

// Before a session: start as soon as the face is found; 3 s is the limit, not the wait.
export const CHECK_LIMIT_MS = 3000;
export const cameraGate = (elapsedMs: number, faceSeen: boolean): 'start' | 'wait' | 'fail' =>
  faceSeen ? 'start' : elapsedMs < CHECK_LIMIT_MS ? 'wait' : 'fail';

// Tours: real controls (data-tour="…"), one at a time. At most 7 steps each.
export type TourId = 'study' | 'planner' | 'history' | 'settings';
export type TourStep = { target: string; title: string; text: string };
export const TOURS: Record<TourId, TourStep[]> = {
  study: [
    { target: 'length', title: tk('Session length'), text: tk('Pick how many focused minutes you want to study.') },
    { target: 'camera-mode', title: tk('Camera mode'), text: tk('Rings an alarm when you pick up your phone, leave or look away.') },
    { target: 'screen-mode', title: tk('Blocker mode'), text: tk('Blocks the sites and apps on your list while you study.') },
    { target: 'start', title: tk('Start'), text: tk('Starts the session. The clock only runs while you are studying.') },
    { target: 'more', title: tk('More options'), text: tk('Link a task, calibrate your place, edit block lists or show the camera.') },
    { target: 'tab-planner', title: tk('Planner'), text: tk('Your tasks and weekly study blocks. A block reminds you when it starts.') },
    { target: 'tab-history', title: tk('History'), text: tk('Every session, with your focused time and what distracted you.') },
  ],
  planner: [
    { target: 'planner-views', title: tk('Four views'), text: tk('Your to-do list, a board (to do, doing, done), your week, and one day on a time line.') },
    { target: 'todo-lists', title: tk('Lists'), text: tk('Today, tomorrow, this week and more, and the subjects you make. Each shows what is left.') },
    { target: 'task-form', title: tk('Add a task'), text: tk('Type it and press Enter. Words like tomorrow, #Physics, !1 or ~3 become chips.') },
  ],
  history: [
    { target: 'history-period', title: tk('Pick a period'), text: tk('Today, the last 7 days or the last 30 days.') },
    { target: 'numbers', title: tk('Three numbers'), text: tk('Focused time, distractions and your longest stretch of focus.') },
    { target: 'bars', title: tk('Each day'), text: tk('Click a day to see its sessions and their reports.') },
  ],
  settings: [
    { target: 'settings-sessions', title: tk('Sessions'), text: tk('Default length, break length and strict mode.') },
    { target: 'settings-advanced', title: tk('Advanced'), text: tk('Detection thresholds, workstations and the Debug tab. Most people never need it.') },
  ],
};
// Tours already shown, kept as a comma list in one setting.
export const seenTours = (s: string) => new Set(s.split(',').filter(Boolean));
export const markSeen = (s: string, id: TourId) => [...new Set([...seenTours(s), id])].join(',');
export const ALL_TOURS = Object.keys(TOURS).join(',');
