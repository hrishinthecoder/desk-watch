// Labels for test clips: the state each label should produce (for `npm run replay`) and
// what is in the hand (for training the hand-object model, `npm run train`).
// SLEEPY: Stage A3 clips (eyes closed, head down on the desk), scored since A3 was built.
// EMPTY: nobody at the desk after the beep (scored on presence itself, not on the Away alarm: its wait is as long as a clip).
export type Expect = 'PHONE' | 'PHONE_CALL' | 'DOWN' | 'NOT_PHONE' | 'SLEEPY' | 'EMPTY';
export type HandClass = 'phone' | 'pen' | 'calculator' | 'book' | 'none';
// What you were doing (Stage C activity estimates). Older clips get the closest match.
export type ActivityLabel = 'WRITING' | 'READING' | 'SPEAKING' | 'IDLE' | 'LOOKING_AWAY' | 'PHONE_SCROLLING' | 'PHONE' | 'PHONE_CALL' | 'OTHER';

// `event`: the recorder counts down and beeps at EVENT_SEC; this is what to do at the beep.
// The clip then shows the label's state only after the beep (before it: normal studying).
export const CLIP_LABELS: { id: string; text: string; expect: Expect; hand: HandClass | null; activity: ActivityLabel; event?: string }[] = [
  { id: 'phone_upright', text: 'Phone held up, using it', expect: 'PHONE', hand: 'phone', activity: 'PHONE', event: 'Pick up the phone' },
  { id: 'phone_back', text: 'Phone held up, back facing the camera', expect: 'PHONE', hand: 'phone', activity: 'PHONE', event: 'Pick up the phone, back to the camera' },
  { id: 'phone_flat_desk', text: 'Phone flat on desk, not used', expect: 'NOT_PHONE', hand: 'none', activity: 'OTHER' },
  { id: 'phone_at_ear', text: 'Phone at ear (call)', expect: 'PHONE_CALL', hand: 'phone', activity: 'PHONE_CALL', event: 'Phone to your ear' },
  { id: 'phone_in_lap', text: 'Phone in lap, head down', expect: 'DOWN', hand: 'phone', activity: 'PHONE_SCROLLING', event: 'Use the phone in your lap' },
  { id: 'no_phone', text: 'No phone (read/write normally, head down too)', expect: 'NOT_PHONE', hand: 'none', activity: 'OTHER' },
  { id: 'chin_on_hand', text: 'Chin or cheek resting on hand', expect: 'NOT_PHONE', hand: 'none', activity: 'OTHER' },
  { id: 'hand_on_head', text: 'Hand on head or next to the ear, no phone', expect: 'NOT_PHONE', hand: 'none', activity: 'OTHER' },
  { id: 'pen', text: 'Holding a pen', expect: 'NOT_PHONE', hand: 'pen', activity: 'OTHER' },
  { id: 'pen_at_face', text: 'Pen held against the face', expect: 'NOT_PHONE', hand: 'pen', activity: 'OTHER' },
  { id: 'calculator', text: 'Holding a calculator', expect: 'NOT_PHONE', hand: 'calculator', activity: 'OTHER' },
  { id: 'calc_at_face', text: 'Calculator held next to the face', expect: 'NOT_PHONE', hand: 'calculator', activity: 'OTHER' },
  { id: 'book', text: 'Holding a book', expect: 'NOT_PHONE', hand: 'book', activity: 'OTHER' },
  // Stage C: what you do while studying. Record these at your normal desk, camera where it usually is.
  { id: 'writing', text: 'Writing in a notebook', expect: 'NOT_PHONE', hand: 'pen', activity: 'WRITING' },
  { id: 'reading', text: 'Reading a book or notes on the desk (not writing)', expect: 'NOT_PHONE', hand: null, activity: 'READING' },
  { id: 'reading_screen', text: 'Reading on the laptop screen', expect: 'NOT_PHONE', hand: null, activity: 'READING' },
  { id: 'speaking', text: 'Speaking (reading aloud, explaining to yourself)', expect: 'NOT_PHONE', hand: null, activity: 'SPEAKING' },
  { id: 'idle', text: 'Sitting still, thinking (not writing or reading)', expect: 'NOT_PHONE', hand: null, activity: 'IDLE' },
  { id: 'looking_away', text: 'Looking away (to the side, out the window, at a TV)', expect: 'NOT_PHONE', hand: null, activity: 'LOOKING_AWAY' },
  // A2: an empty chair must count as nobody (owner 2026-10-22: the cushion behind once showed as "person 0.22").
  { id: 'empty_desk', text: 'Nobody at the desk (leave at the beep; cushion in view)', expect: 'EMPTY', hand: null, activity: 'OTHER', event: 'Stand up and leave the desk' },
  // Stage A3 (sleepy detection).
  { id: 'eyes_closed_up', text: 'Eyes closed, sitting up (dozing)', expect: 'SLEEPY', hand: null, activity: 'OTHER', event: 'Close your eyes' },
  { id: 'eyes_closed_desk', text: 'Eyes closed, head down on the desk', expect: 'SLEEPY', hand: null, activity: 'OTHER', event: 'Head down on the desk, eyes closed' },
  { id: 'reading_eyes_down', text: 'Reading a book flat on the desk, eyes lowered', expect: 'NOT_PHONE', hand: null, activity: 'READING' },
  { id: 'blinking', text: 'Looking at the screen, blinking normally', expect: 'NOT_PHONE', hand: null, activity: 'READING' },
  { id: 'slow_blinks', text: 'Slow blinks: eyes closed about 2 s, 4 times', expect: 'NOT_PHONE', hand: null, activity: 'OTHER' },
  { id: 'yawning', text: 'Yawning twice', expect: 'NOT_PHONE', hand: null, activity: 'OTHER' },
];

// File-name markers added by the recorder: "-ev10" = the beep came 10 s in; "-glasses" = glasses on.
export const EVENT_SEC = 10;
export const eventSecOf = (name: string) => { const m = /-ev(\d+)/.exec(name); return m ? Number(m[1]) : null; };
export const hasGlasses = (name: string) => name.includes('-glasses');

// Per-check score. Clips with a beep: before it the expected state is "no alarm"; the wait
// after it is skipped; after that the label's state is expected. Older clips: the first
// `waitSec` + 2 s are skipped. null = not scored.
export function checkCorrect(expect: Expect, state: string, sec: number, eventSec: number | null, waitSec: number): boolean | null {
  const from = (eventSec ?? 0) + waitSec + 2;
  if (eventSec !== null && sec < eventSec) return sec >= 2 ? isCorrect('NOT_PHONE', state) : null;
  if (expect === 'NOT_PHONE' && eventSec === null) return sec >= 2 ? isCorrect(expect, state) : null;
  return sec >= from ? isCorrect(expect, state) : null;
}

// Per-event score (A2): seconds from the event (phone picked up) to the first alarm state,
// or null = never caught in the clip. `checks` are [seconds, state], in order.
export const PICKUP_ALARMS = ['PHONE', 'PHONE_CALL', 'DOWN'];
export function secondsToAlarm(checks: [number, string][], eventSec: number): number | null {
  const hit = checks.find(([sec, state]) => sec >= eventSec && PICKUP_ALARMS.includes(state));
  return hit ? Math.round((hit[0] - eventSec) * 10) / 10 : null;
}
// A false start: an alarm before the event (the phone was not up yet).
export const alarmBefore = (checks: [number, string][], eventSec: number) =>
  checks.some(([sec, state]) => sec < eventSec && PICKUP_ALARMS.includes(state));

// Clips recorded with "keep aside for the final test" start with this. They are never used
// for tuning or training, so their score is a fair measure of real-life accuracy.
export const HOLDOUT_PREFIX = 'holdout-';
export const isHoldout = (name: string) => name.startsWith(HOLDOUT_PREFIX);

const PHONE_STATES = ['PHONE', 'PHONE_CALL'];
// NOT_PHONE clips must also not ring the head-down alarm (that alarm means "phone in lap?").
export function isCorrect(expect: Expect, state: string) {
  if (expect === 'EMPTY') return state === 'NOBODY';
  // A3: a sleepy alarm on a clip that is not about sleeping is a false alarm too.
  return expect === 'NOT_PHONE' ? !PHONE_STATES.includes(state) && state !== 'DOWN' && state !== 'SLEEPY' : state === expect;
}
// The state a check is scored on: EMPTY clips use the app's own presence test (a face, a person box at
// settings.personScore or more, or a hand = someone), the others the rules' state.
export const scoredState = (expect: Expect, state: string, person: boolean) => (expect === 'EMPTY' ? (person ? 'SOMEONE' : 'NOBODY') : state);
// Seconds to skip after the beep before an EMPTY clip is scored: time to walk out of the picture.
export const LEAVE_SEC = 1;
