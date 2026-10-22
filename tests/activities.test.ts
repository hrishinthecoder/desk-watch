import { describe, expect, it } from 'vitest';
import { activityOf, createActivity, createFeatures, isActivityCal, nearest, SHAPES, type Features, type Shapes } from '../src/state/activities';
import { createClassifier, type Thresholds } from '../src/state/classifier';
import { DEFAULTS, fromOwn } from '../src/state/config';
import { createRules, lapPitch, rulesOnInput, type CheckInput } from '../src/state/rules';

const shapes = (o: Partial<Shapes> = {}): Shapes => ({ ...Object.fromEntries(SHAPES.map((k) => [k, 0])), ...o }) as Shapes;
const F = (o: Partial<Features> = {}): Features => ({
  face: true, pitch: 10, yaw: 0, eyesDown: 0, eyesSide: 0, lids: 0, jawMove: 0, handMove: 0, hands: 0, handsSeen: 0, ...o,
});
const hand = (x: number, y: number) => ({ pts: Array.from({ length: 21 }, () => ({ x, y })) });

describe('features', () => {
  it('mouth opening and closing = jaw movement; a still mouth = 0', () => {
    const f = createFeatures();
    let r = f({ t: 0, pitch: 0, yaw: 0, shapes: shapes(), hands: [], person: true });
    for (let t = 200; t <= 1400; t += 200) r = f({ t, pitch: 0, yaw: 0, shapes: shapes({ jawOpen: (t / 200) % 2 ? 0.4 : 0 }), hands: [], person: true });
    expect(r.jawMove).toBeGreaterThan(0.15);
    const g = createFeatures();
    for (let t = 0; t <= 1400; t += 200) r = g({ t, pitch: 0, yaw: 0, shapes: shapes({ jawOpen: 0.3 }), hands: [], person: true });
    expect(r.jawMove).toBe(0);
  });
  it('a moving fingertip gives hand movement; no hands gives 0', () => {
    const f = createFeatures();
    let r = f({ t: 0, pitch: 0, yaw: 0, shapes: null, hands: [hand(0.5, 0.8)], person: true });
    r = f({ t: 200, pitch: 0, yaw: 0, shapes: null, hands: [hand(0.52, 0.8)], person: true });
    expect(r.handMove).toBeCloseTo(0.1); // 0.02 of the frame in 0.2 s
    expect(r.hands).toBe(1);
    const g = createFeatures();
    expect(g({ t: 0, pitch: 0, yaw: 0, shapes: null, hands: [], person: true }).handMove).toBe(0);
  });
});

describe('activity rules', () => {
  it('looking away beats everything, then speaking', () => {
    expect(activityOf(F({ eyesSide: 0.6, jawMove: 0.2 }), DEFAULTS)).toBe('LOOKING_AWAY');
    expect(activityOf(F({ yaw: -40 }), DEFAULTS)).toBe('LOOKING_AWAY');
    expect(activityOf(F({ jawMove: 0.1, eyesDown: 0.5 }), DEFAULTS)).toBe('SPEAKING');
  });
  it('without calibration: moving visible hand = writing, eyes down = reading, else idle', () => {
    expect(activityOf(F({ hands: 1, handMove: 0.1 }), DEFAULTS)).toBe('WRITING');
    expect(activityOf(F({ eyesDown: 0.3 }), DEFAULTS)).toBe('READING');
    expect(activityOf(F(), DEFAULTS)).toBe('IDLE');
  });
  it('with calibration: the closest of your own averages', () => {
    const cal = { WRITING: [0.9, 0.3, 0.3, 1, 0.5], READING: [0.9, 0.4, 0.35, 0, 0], IDLE: [-0.1, 0.6, 0.15, 0, 0] };
    expect(nearest(F({ pitch: 27, eyesDown: 0.4, lids: 0.35 }), cal)).toBe('READING');
    expect(nearest(F({ pitch: -3, eyesDown: 0.6, lids: 0.15 }), cal)).toBe('IDLE');
    expect(nearest(F({ pitch: 27, eyesDown: 0.3, lids: 0.3, handsSeen: 1, handMove: 0.1 }), cal)).toBe('WRITING');
    expect(activityOf(F({ jawMove: 0.1 }), DEFAULTS, cal)).toBe('SPEAKING'); // fixed rules still first
  });
  it('majority over 2 s: one odd check does not flip it', () => {
    const a = createActivity();
    for (let t = 0; t < 1800; t += 200) a(t, 'READING');
    expect(a(1800, 'SPEAKING')).toEqual({ activity: 'READING', confidence: 0.9 });
  });
  it('a damaged calibration is never used', () => {
    expect(isActivityCal({ WRITING: [1, 2, 3, 4, 5], READING: [1, 2, 3, 4, 5], IDLE: [1, 2, 3, 4, 5] })).toBe(true);
    expect(isActivityCal({ WRITING: [1, 2], READING: [1, 2, 3, 4, 5], IDLE: [1, 2, 3, 4, 5] })).toBe(false);
    expect(fromOwn({ activityCal: { WRITING: 'x' } }).activityCal).toBe(null);
  });
});

describe('looking away and head down in the state machine', () => {
  const TH: Thresholds = { ...DEFAULTS, pitchLimit: 25, lookAwaySec: 20 };
  const base = { person: true, phone: 0, call: false, pitch: 5 };
  it('looking away for lookAwaySec rings, a shorter glance does not', () => {
    const step = createClassifier();
    let st = '';
    for (let t = 0; t <= 19_000; t += 200) st = step({ t, ...base, lookAway: true }, TH).state;
    expect(st).toBe('FOCUSED');
    for (let t = 19_200; t <= 21_000; t += 200) st = step({ t, ...base, lookAway: true }, TH).state;
    expect(st).toBe('LOOKING_AWAY');
  });
  it('the head-down decision from the rules overrides the plain angle', () => {
    const step = createClassifier();
    let st = '';
    for (let t = 0; t <= 21_000; t += 200) st = step({ t, ...base, pitch: 10, down: true }, TH).state;
    expect(st).toBe('DOWN');
  });
  it('the eyes-level lap rule is off by default (0); on, it flags a slightly bent head with level eyes', () => {
    const input = (t: number): CheckInput => ({
      t, W: 1280, H: 720, fullPhones: [], cropPhones: [], hands: [], face: null, person: true,
      pitch: 28, yaw: 0, shapes: shapes(),
    });
    const run = (s: typeof DEFAULTS) => { const r = createRules(); let st = ''; for (let t = 0; t <= 25_000; t += 200) st = rulesOnInput(input(t), r, s).status.state; return st; };
    const cal = { ...DEFAULTS, calibratedPitch: 26.7 };
    expect(lapPitch(cal)).toBeCloseTo(23.7);
    expect(run(cal)).toBe('FOCUSED');                    // 28° < 38.7° and the eye rule is off
    expect(run({ ...cal, lapEyes: 0.15 })).toBe('DOWN');  // 28° > 23.7° with level eyes
  });
});
