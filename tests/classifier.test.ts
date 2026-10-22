import { describe, expect, it } from 'vitest';
import { calibratedPitch, createClassifier, pitchFromMatrix, type Sample, type State, type Thresholds } from '../src/state/classifier';
import { DEFAULTS } from '../src/state/config';

const TH: Thresholds = { ...DEFAULTS, phoneSec: 4, callSec: 4, pitchLimit: 25 }; // phone 4 s in / 3 s out, gap 1.5 s, call 4 s, down 20 s, away 20 s
const FOCUS = { person: true, phone: 0, call: false, pitch: 5 };

// Feed `secs` seconds of samples at 5 checks/s; `at(t)` gives the observation at time t (ms).
function run(secs: number, at: (t: number) => Partial<Omit<Sample, 't'>>, th = TH) {
  const step = createClassifier();
  const states: { t: number; state: State }[] = [];
  for (let t = 0; t <= secs * 1000; t += 200) states.push({ t, state: step({ t, ...FOCUS, ...at(t) }, th).state });
  const stateAt = (sec: number) => states.find((s) => s.t === Math.round(sec * 1000))!.state;
  const all = (st: State, from = 0, to = secs) => states.filter((s) => s.t >= from * 1000 && s.t <= to * 1000).every((s) => s.state === st);
  return { states, stateAt, all };
}

describe('phone rule (hysteresis)', () => {
  it('enters PHONE after phoneSec of evidence', () => {
    const { stateAt } = run(10, (t) => ({ phone: t >= 2000 ? 0.5 : 0 }));
    expect(stateAt(5.8)).toBe('FOCUSED');
    expect(stateAt(6)).toBe('PHONE');
  });

  it('a score hovering around the threshold still enters PHONE (Phase 1 bug)', () => {
    // alternates just above / below the enter score every check: Phase 1 restarted its timer on every dip
    const { stateAt } = run(10, (t) => ({ phone: (t / 200) % 2 ? TH.phoneEnter - 0.1 : TH.phoneEnter + 0.05 }));
    expect(stateAt(4.2)).toBe('PHONE');
  });

  it('a gap longer than phoneGapSec restarts the timer', () => {
    const { stateAt } = run(12, (t) => ({ phone: t < 3000 || t >= 5000 ? 0.5 : 0.25 }));
    expect(stateAt(8.8)).toBe('FOCUSED');
    expect(stateAt(9)).toBe('PHONE');
  });

  it('stays PHONE while evidence sits between leave and enter scores (no flicker)', () => {
    const { all } = run(30, (t) => ({ phone: t < 5000 ? 0.6 : 0.25 }));
    expect(all('PHONE', 4, 30)).toBe(true);
  });

  it('leaves PHONE only after evidence is below the leave score for phoneExitSec', () => {
    const { stateAt } = run(15, (t) => ({ phone: t < 6000 ? 0.6 : 0.05 }));
    expect(stateAt(8.8)).toBe('PHONE');
    expect(stateAt(9)).toBe('FOCUSED');
  });

  it('one stray phone frame never triggers anything', () => {
    expect(run(30, (t) => ({ phone: t === 3000 ? 0.9 : 0 })).all('FOCUSED')).toBe(true);
  });

  it('does not depend on head pitch or on presence', () => {
    const up = run(10, () => ({ phone: 0.5, pitch: -10 }));
    const down = run(10, () => ({ phone: 0.5, pitch: 45 }));
    const hidden = run(10, () => ({ phone: 0.5, person: false, pitch: null }));
    for (const r of [up, down, hidden]) {
      expect(r.stateAt(3.8)).toBe('FOCUSED');
      expect(r.stateAt(4)).toBe('PHONE');
    }
  });
});

describe('phone call rule', () => {
  it('enters PHONE_CALL after callSec of a hand at the ear, and it wins over PHONE', () => {
    const { stateAt } = run(10, () => ({ call: true, phone: 0.5 }));
    expect(stateAt(3.8)).toBe('FOCUSED');
    expect(stateAt(4)).toBe('PHONE_CALL');
  });
  it('leaves PHONE_CALL callExitSec after the hand comes down', () => {
    const { stateAt } = run(15, (t) => ({ call: t < 6000 }));
    expect(stateAt(8.8)).toBe('PHONE_CALL');
    expect(stateAt(9)).toBe('FOCUSED');
  });
});

describe('looking down and away', () => {
  it('flags DOWN after downSec of head below the limit', () => {
    const { stateAt } = run(30, () => ({ pitch: 40 }));
    expect(stateAt(19.8)).toBe('FOCUSED');
    expect(stateAt(20)).toBe('DOWN');
  });

  it('does not flag normal reading below the calibrated limit', () => {
    expect(run(60, () => ({ pitch: 22 }), { ...TH, pitchLimit: 18 + 12 }).all('FOCUSED')).toBe(true);
  });

  it('counts "person visible but face lost" as looking down (Sleepy alarm off); with it on, sleepy comes first (A3)', () => {
    expect(run(25, () => ({ pitch: null }), { ...TH, sleepyAlarm: false }).stateAt(21)).toBe('DOWN');
    expect(run(25, () => ({ pitch: null })).stateAt(21)).toBe('SLEEPY');
  });

  it('flags AWAY after awaySec with nobody in frame', () => {
    const { stateAt } = run(30, () => ({ person: false, pitch: null }));
    expect(stateAt(19.8)).toBe('FOCUSED');
    expect(stateAt(20)).toBe('AWAY');
  });

  it('away timer resets when you come back', () => {
    const { stateAt } = run(40, (t) => (t < 15000 || t >= 17000 ? { person: false, pitch: null } : {}));
    expect(stateAt(30)).toBe('FOCUSED');
    expect(stateAt(37.4)).toBe('AWAY');
  });
});

describe('head pitch', () => {
  // rotation about the x axis by `deg`, as a column-major 4x4
  const rotX = (deg: number) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  };
  it('reads 0 facing the camera and +30 tilted 30° down', () => {
    expect(pitchFromMatrix(rotX(0))).toBeCloseTo(0);
    expect(pitchFromMatrix(rotX(30))).toBeCloseTo(30);
    expect(pitchFromMatrix(rotX(-10))).toBeCloseTo(-10);
  });
  it('calibration is the median, and needs at least 5 samples', () => {
    expect(calibratedPitch([10, 12])).toBeNull();
    expect(calibratedPitch([10, 12, 50, 11, 13])).toBe(12);
  });
});
