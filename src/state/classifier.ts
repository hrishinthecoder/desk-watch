// Pure state machine: turns per-check signals into FOCUSED / PHONE / PHONE_CALL / DOWN / AWAY / SLEEPY.
// No camera, no DOM, so it is fully unit-tested (tests/classifier.test.ts, tests/sleepy.test.ts).

export type State = 'FOCUSED' | 'PHONE' | 'PHONE_CALL' | 'DOWN' | 'AWAY' | 'LOOKING_AWAY' | 'SLEEPY';

export type Sample = {
  t: number;            // ms timestamp
  person: boolean;      // a face, a person or a hand is in frame
  phone: number;        // 0-1 phone evidence (src/state/phone.ts), independent of head pitch
  call: boolean;        // hand or phone at an ear
  pitch: number | null; // head pitch in degrees, positive = looking down; null = no face found
  down?: boolean | null; // head-down decision made outside (src/state/rules.ts); missing = pitch > pitchLimit
  lookAway?: boolean;    // looking to the side (activity estimate)
  lids?: number | null;  // how closed the less closed eye is, 0 open - 1 closed; null = no face (Stage A3)
  hands?: number;        // hands seen (A3: a hand in view while the face is hidden = holding a book or calculator up, not asleep)
};

export type Thresholds = {
  smoothMs: number;
  phoneEnter: number; phoneExit: number; phoneSec: number; phoneGapSec: number; phoneExitSec: number;
  callSec: number; callExitSec: number;
  downSec: number;
  awaySec: number;
  lookAwaySec?: number;
  pitchLimit: number;
  // Sleepy (Stage A3); missing sleepySec / headDownSec = never SLEEPY
  sleepyAlarm?: boolean; sleepySec?: number; headDownSec?: number; sleepyLid?: number;
};

export type Status = {
  state: State;
  // seconds each condition has been building up (or held), shown on the debug screen
  held: { away: number; phone: number; call: number; down: number; lookAway: number; eyes: number; headDown: number };
  closure: number; // an eye closure that just ended at this check, in seconds (else 0): a drowsy sign when 1.5-6 s
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Hysteresis latch. Turns on after `high` has held enterMs (dips shorter than gapMs are
// forgiven), turns off only after `low` has held exitMs. Values between high and low
// keep whatever state it is in, so a score hovering at the threshold cannot flicker.
type Latch = { active: boolean; since: number | null; last: number | null; lowSince: number | null };
const newLatch = (): Latch => ({ active: false, since: null, last: null, lowSince: null });

function updateLatch(L: Latch, t: number, high: boolean, low: boolean, enterMs: number, gapMs: number, exitMs: number) {
  if (!L.active) {
    if (high) { L.since ??= t; L.last = t; }
    else if (L.last === null || t - L.last > gapMs) { L.since = null; L.last = null; }
    if (L.since !== null && L.last !== null && L.last - L.since >= enterMs) { L.active = true; L.lowSince = null; }
  } else if (low) {
    L.lowSince ??= t;
    if (t - L.lowSince >= exitMs) Object.assign(L, newLatch());
  } else {
    L.lowSince = null;
  }
}
const building = (L: Latch, t: number) => (L.active || L.since === null ? 0 : (t - L.since) / 1000);

export function createClassifier() {
  let win: Sample[] = [];
  const since: Record<'away' | 'down' | 'lookAway' | 'eyes' | 'headDown', number | null> = { away: null, down: null, lookAway: null, eyes: null, headDown: null };
  const phone = newLatch();
  const call = newLatch();

  return function step(s: Sample, th: Thresholds): Status {
    win.push(s);
    win = win.filter((w) => s.t - w.t < th.smoothMs);
    const share = (f: (w: Sample) => boolean) => win.filter(f).length / win.length;

    updateLatch(phone, s.t, s.phone >= th.phoneEnter, s.phone < th.phoneExit, th.phoneSec * 1000, th.phoneGapSec * 1000, th.phoneExitSec * 1000);
    updateLatch(call, s.t, s.call, !s.call, th.callSec * 1000, th.phoneGapSec * 1000, th.callExitSec * 1000);

    const away = share((w) => !w.person) >= 0.5;
    // Person visible but face lost counts as head down: a steep downward tilt
    // is exactly when the face model stops finding the face.
    const downs = win.filter((w) => w.person).map((w) => (w.pitch === null ? true : w.down ?? w.pitch > th.pitchLimit));
    const down = !away && !phone.active && !call.active && downs.length > 0 && downs.filter(Boolean).length / downs.length > 0.5;
    const lookAway = !away && !down && share((w) => !!w.lookAway) > 0.5;

    // Sleepy (A3), each check on its own (no smoothing): one open-eyed check, or the face seen again, restarts
    // the count, so blinks and a glance up never add up. Head down = no face and no hand in view while you are still
    // there (not away). On the owner's clips a book or calculator held in front of the face hid it for 10-18 s, but the
    // hands were seen 94-100% of that time; with the head on the desk, 0%.
    const eyes = s.lids !== null && s.lids !== undefined && s.lids >= (th.sleepyLid ?? 0.6);
    const headDown = !away && s.pitch === null && !s.hands;
    const closure = !eyes && since.eyes !== null ? (s.t - since.eyes) / 1000 : 0;

    const conds = { away, down, lookAway, eyes, headDown };
    const held = { away: 0, down: 0, lookAway: 0, eyes: 0, headDown: 0, phone: building(phone, s.t), call: building(call, s.t) };
    for (const k of ['away', 'down', 'lookAway', 'eyes', 'headDown'] as const) {
      since[k] = conds[k] ? (since[k] ?? s.t) : null;
      held[k] = since[k] === null ? 0 : (s.t - since[k]) / 1000;
    }
    // A phone or a call always wins (the owner, 2026-10-22: a phone in the lap is a phone, never sleepy).
    const sleepy = th.sleepyAlarm !== false && !phone.active && !call.active &&
      (held.eyes >= (th.sleepySec ?? Infinity) || held.headDown >= (th.headDownSec ?? Infinity));

    const state: State =
      call.active ? 'PHONE_CALL'
      : phone.active ? 'PHONE'
      : away && held.away >= th.awaySec ? 'AWAY'
      : sleepy ? 'SLEEPY'
      : down && held.down >= th.downSec ? 'DOWN'
      : lookAway && held.lookAway >= (th.lookAwaySec ?? Infinity) ? 'LOOKING_AWAY'
      : 'FOCUSED';
    return { state, held, closure };
  };
}

// Head pitch from MediaPipe's 4x4 face transform (column-major). The face's forward
// axis is the matrix's third column; its downward tilt gives pitch. Positive = looking down.
export function pitchFromMatrix(m: number[]): number {
  return (Math.atan2(-m[9], m[10]) * 180) / Math.PI;
}

// Head turn left/right from the same matrix, in degrees (0 = facing the camera).
export function yawFromMatrix(m: number[]): number {
  return (Math.atan2(m[8], m[10]) * 180) / Math.PI;
}

// Calibration: your normal reading/writing pitch is the median of ~5 s of samples.
export function calibratedPitch(pitches: number[]): number | null {
  return pitches.length >= 5 ? median(pitches) : null;
}
