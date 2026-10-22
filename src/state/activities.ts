// Activity estimates (Stage C): writing, reading, speaking, idle, looking away, phone in lap.
// Pure, no camera or DOM. Tested in tests/activities.test.ts; thresholds in config.ts.
import type { Hand } from './phone';

// Face movements read from the face model (MediaPipe "blendshapes"), each 0-1.
export const SHAPES = [
  'eyeLookDownLeft', 'eyeLookDownRight', 'eyeLookUpLeft', 'eyeLookUpRight',
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeSquintLeft', 'eyeSquintRight',
  'jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthSmileLeft', 'mouthSmileRight',
] as const;
export type Shapes = Record<(typeof SHAPES)[number], number>;

// Easy-to-read summaries for the debug screen.
export const eyesDown = (s: Shapes) => (s.eyeLookDownLeft + s.eyeLookDownRight) / 2;
export const eyelids = (s: Shapes) => (s.eyeBlinkLeft + s.eyeBlinkRight) / 2; // 1 = closed (also when looking far down)
export const eyesSide = (s: Shapes) => Math.max((s.eyeLookOutLeft + s.eyeLookInRight) / 2, (s.eyeLookInLeft + s.eyeLookOutRight) / 2);

export type FeatureInput = { t: number; pitch: number | null; yaw: number | null; shapes: Shapes | null; hands: Hand[]; person: boolean };

// Per-check clues, some averaged over the last `windowMs` (movement needs time to see).
export type Features = {
  face: boolean;
  pitch: number | null;
  yaw: number | null;      // degrees, + or - is left/right
  eyesDown: number;        // 0-1
  eyesSide: number;        // 0-1
  lids: number;            // 0-1, 1 = closed
  jawMove: number;         // how much the mouth opens and closes (std of jawOpen over the window)
  handMove: number;        // fingertip speed, share of frame width per second (window average)
  hands: number;           // hands visible now
  handsSeen: number;       // share of the window with a hand visible
};

const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};
const tip = (h: Hand) => h.pts[8] ?? h.pts[0]; // index fingertip (a pen moves with it)

export function createFeatures(windowMs = 1500) {
  let win: { t: number; jaw: number | null; speed: number | null; hand: boolean }[] = [];
  let prev: { t: number; tips: { x: number; y: number }[] } | null = null;

  return function features(i: FeatureInput): Features {
    // Fingertip speed: each fingertip now vs the nearest one at the previous check.
    const tips = i.hands.map(tip);
    let speed: number | null = null;
    if (prev && tips.length && prev.tips.length && i.t > prev.t) {
      const d = tips.map((p) => Math.min(...prev!.tips.map((q) => Math.hypot(p.x - q.x, p.y - q.y))));
      speed = Math.max(...d) / ((i.t - prev.t) / 1000);
    }
    prev = { t: i.t, tips };
    win.push({ t: i.t, jaw: i.shapes?.jawOpen ?? null, speed, hand: tips.length > 0 });
    win = win.filter((w) => i.t - w.t < windowMs);
    const speeds = win.map((w) => w.speed).filter((s): s is number => s !== null);
    const s = i.shapes;
    return {
      face: s !== null,
      pitch: i.pitch,
      yaw: i.yaw,
      eyesDown: s ? eyesDown(s) : 0,
      eyesSide: s ? eyesSide(s) : 0,
      lids: s ? eyelids(s) : 0,
      jawMove: std(win.map((w) => w.jaw).filter((j): j is number => j !== null)),
      handMove: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      hands: tips.length,
      handsSeen: win.filter((w) => w.hand).length / win.length,
    };
  };
}

// ---- rules ----
export type Activity = 'WRITING' | 'READING' | 'SPEAKING' | 'IDLE' | 'LOOKING_AWAY';
export type ActivityThresholds = {
  speakJaw: number;      // mouth movement (jawMove) at/above this = speaking
  awayEyes: number;      // eyes sideways at/above this = looking away
  awayYaw: number;       // or head turned more than this many degrees
  writeMove: number;     // a visible fingertip moving at least this fast = writing
  readEyes: number;      // eyes down or eyelids lowered at/above this = reading
  lapEyes: number;       // phone in lap: eyes at most this far down (you bend your head, not your eyes)
};

// Your eyes look down at a book or notebook on the desk, but for a phone in your lap you bend
// the whole head and your eyes stay level (seen on your test clips: eyes down 0.22-0.43 while
// reading or writing, 0.00-0.03 with a phone in the lap). Combined with the head angle.
export const eyesLevel = (f: Features, th: ActivityThresholds) =>
  f.face && f.eyesDown < th.lapEyes && f.lids < th.lapEyes + 0.05;

// Looking away and speaking use fixed rules (they worked for everyone's face the same way).
// Writing, reading and idle use your calibration when you have one, else fixed rules.
export function activityOf(f: Features, th: ActivityThresholds, cal?: ActivityCal | null): Activity {
  if (f.face && (f.eyesSide >= th.awayEyes || Math.abs(f.yaw ?? 0) >= th.awayYaw)) return 'LOOKING_AWAY';
  if (f.jawMove >= th.speakJaw) return 'SPEAKING';
  if (cal) return nearest(f, cal);
  if (f.hands > 0 && f.handMove >= th.writeMove) return 'WRITING';
  if (f.face && (f.eyesDown >= th.readEyes || f.lids >= th.readEyes)) return 'READING';
  return 'IDLE';
}

// Majority over the last `windowMs`, so one odd check does not flip the activity.
export function createActivity(windowMs = 2000) {
  let win: { t: number; a: Activity }[] = [];
  return (t: number, a: Activity) => {
    win.push({ t, a });
    win = win.filter((w) => t - w.t < windowMs);
    const n: Partial<Record<Activity, number>> = {};
    for (const w of win) n[w.a] = (n[w.a] ?? 0) + 1;
    const [best, count] = Object.entries(n).sort((x, y) => y[1] - x[1])[0] as [Activity, number];
    return { activity: best, confidence: count / win.length };
  };
}

// ---- personal calibration (wizard: 10 s each of writing, reading, sitting idle) ----
// Your own average clues per activity; each check then picks the closest one. Measured on your
// clips: 74% right on kept-aside clips, against 39% for fixed thresholds.
export const CALIBRATED = ['WRITING', 'READING', 'IDLE'] as const;
export type ActivityCal = Record<(typeof CALIBRATED)[number], number[]>;

export const featureVector = (f: Features) => [(f.pitch ?? 40) / 30, f.eyesDown, f.lids, f.handsSeen, Math.min(1, f.handMove * 5)];

export const averageVector = (vs: number[][]) =>
  vs.length ? vs[0].map((_, k) => vs.reduce((a, v) => a + v[k], 0) / vs.length) : null;

export const isActivityCal = (x: unknown): x is ActivityCal =>
  typeof x === 'object' && x !== null &&
  CALIBRATED.every((a) => Array.isArray((x as ActivityCal)[a]) && (x as ActivityCal)[a].length === 5 && (x as ActivityCal)[a].every(Number.isFinite));

export function nearest(f: Features, cal: ActivityCal): Activity {
  const v = featureVector(f);
  const dist = (c: number[]) => c.reduce((a, x, k) => a + (x - v[k]) ** 2, 0);
  return CALIBRATED.reduce((best, a) => (dist(cal[a]) < dist(cal[best]) ? a : best), CALIBRATED[0] as Activity & (typeof CALIBRATED)[number]);
}
