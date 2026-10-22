import { describe, expect, it } from 'vitest';
import { createClassifier, type Sample, type State, type Thresholds } from '../src/state/classifier';
import { DEFAULTS } from '../src/state/config';
import { createDrowsy } from '../src/state/sleepy';
import { distractions, observedActivity, reportSentence, STUDY, summarize, timelineBlocks } from '../src/session/accounting';

// Stage A3. Defaults: eyes closed 6 s, head down on the desk 15 s, closed = 0.6; looking down 20 s, away 20 s.
const TH: Thresholds = { ...DEFAULTS, pitchLimit: 25 };
const AWAKE = { person: true, phone: 0, call: false, pitch: 5, lids: 0.1 };

function run(secs: number, at: (t: number) => Partial<Omit<Sample, 't'>>, th: Thresholds = TH) {
  const step = createClassifier();
  const out: { t: number; state: State; closure: number }[] = [];
  for (let t = 0; t <= secs * 1000; t += 200) { const s = step({ t, ...AWAKE, ...at(t) }, th); out.push({ t, state: s.state, closure: s.closure }); }
  const stateAt = (sec: number) => out.find((s) => s.t === Math.round(sec * 1000))!.state;
  const ever = (st: State) => out.some((s) => s.state === st);
  return { out, stateAt, ever };
}

describe('A3: eyes closed', () => {
  it('both eyes closed for 6 s → SLEEPY; 5.8 s is not yet', () => {
    const { stateAt } = run(12, (t) => ({ lids: t >= 2000 ? 0.7 : 0.1 }));
    expect(stateAt(7.8)).toBe('FOCUSED');
    expect(stateAt(8)).toBe('SLEEPY');
  });
  it('normal blinks and slow blinks (eyes closed ~3 s, 4 times) never ring', () => {
    expect(run(60, (t) => ({ lids: t % 4000 < 200 ? 0.9 : 0.1 })).ever('SLEEPY')).toBe(false);
    expect(run(30, (t) => ({ lids: t % 5000 < 3200 ? 0.77 : 0.1 })).ever('SLEEPY')).toBe(false); // the owner's slowest: 3.2 s at 0.77
  });
  it('one open-eyed check restarts the count', () => {
    const { ever } = run(30, (t) => ({ lids: t % 5000 === 0 ? 0.2 : 0.7 })); // closed 4.8 s, open for one check, again
    expect(ever('SLEEPY')).toBe(false);
  });
  it('eyes lowered for reading (below 0.6) never count as closed', () => {
    expect(run(60, () => ({ lids: 0.45, pitch: 30 })).ever('SLEEPY')).toBe(false);
  });
  it('a closure that ends reports its length (a drowsy sign when 1.5-6 s)', () => {
    const { out } = run(6, (t) => ({ lids: t >= 1000 && t < 3000 ? 0.7 : 0.1 }));
    expect(out.find((s) => s.closure > 0)!.closure).toBeCloseTo(2, 1);
  });
});

describe('A3: head down on the desk', () => {
  it('face lost while you are still seen for 15 s → SLEEPY (before the 20 s looking-down alarm)', () => {
    const { stateAt } = run(25, (t) => (t >= 2000 ? { pitch: null, lids: null } : {}));
    expect(stateAt(16.8)).toBe('FOCUSED');
    expect(stateAt(17)).toBe('SLEEPY');
    expect(stateAt(25)).toBe('SLEEPY');
  });
  it('the person box missing now and then (65% seen on the owner\'s clip) does not stop it', () => {
    const { stateAt } = run(25, (t) => (t >= 2000 ? { pitch: null, lids: null, person: t % 1000 < 650 } : {}));
    expect(stateAt(17.2)).toBe('SLEEPY');
  });
  it('a book or calculator held in front of the face (hands in view) is not head down', () => {
    expect(run(30, (t) => (t >= 2000 ? { pitch: null, lids: null, hands: 2 } : {})).ever('SLEEPY')).toBe(false);
  });
  it('the face seen again restarts the count', () => {
    expect(run(30, (t) => (t >= 2000 && t % 10000 !== 0 ? { pitch: null, lids: null } : {})).ever('SLEEPY')).toBe(false);
  });
  it('leaving the desk is Away, never sleepy', () => {
    const { stateAt, ever } = run(30, (t) => (t >= 2000 ? { person: false, pitch: null, lids: null } : {}));
    expect(ever('SLEEPY')).toBe(false);
    expect(stateAt(23)).toBe('AWAY');
  });
  it('a phone always wins: phone in the lap with the face lost is PHONE, not sleepy', () => {
    const { stateAt, ever } = run(30, (t) => (t >= 2000 ? { pitch: null, lids: null, phone: 0.6 } : {}));
    expect(ever('SLEEPY')).toBe(false);
    expect(stateAt(25)).toBe('PHONE');
  });
  it('the Sleepy alarm switched off: head down stays the old "looking down" alarm at 20 s', () => {
    const { stateAt, ever } = run(25, (t) => (t >= 2000 ? { pitch: null, lids: null } : {}), { ...TH, sleepyAlarm: false });
    expect(ever('SLEEPY')).toBe(false);
    expect(stateAt(23)).toBe('DOWN');
  });
});

describe('A3: sleepy time is not study time', () => {
  const m = 60_000;
  const segs = [
    { activity: 'WRITING', start: 0, end: 10 * m },
    { activity: 'SLEEPY', start: 10 * m, end: 13 * m }, // head down on the desk
    { activity: 'READING', start: 13 * m, end: 20 * m },
  ];
  it('the session counts SLEEPY as an alarm, never as study', () => {
    expect(STUDY.has('SLEEPY')).toBe(false);
    expect(observedActivity(true, { state: 'SLEEPY', activity: 'READING', face: false }, false)).toBe('SLEEPY');
    const s = summarize(segs);
    expect(s.focusedSec).toBe(17 * 60);
    expect(s.sleepy).toBe(1);
    expect(s.sleepySec).toBe(180);
    expect(s.longestFocusSec).toBe(10 * 60); // the streak breaks there
  });
  it('reports: one sleepy in Distractions, a cost sentence, a Distracted block', () => {
    const s = summarize(segs);
    expect(distractions(s, []).line).toBe('1 sleepy');
    expect(reportSentence(s, 20, true)).toBe('17 of 20 minutes focused. Sleepiness cost you 3 minutes.');
    expect(timelineBlocks(segs).find((b) => b.text === 'Sleepy')?.lane).toBe('distracted');
  });
});

describe('A3: drowsy signs (quiet hint)', () => {
  it('three 1.5-6 s closures within 5 minutes → one hint; blinks and long closures do not count', () => {
    const d = createDrowsy();
    expect(d(0, 0.3, 6)).toBe(false); // a blink
    expect(d(1000, 8, 6)).toBe(false); // that was the sleepy alarm, not a sign
    expect(d(10_000, 2, 6)).toBe(false);
    expect(d(60_000, 3, 6)).toBe(false);
    expect(d(120_000, 1.6, 6)).toBe(true);
    expect(d(130_000, 2, 6)).toBe(false); // quiet for 5 minutes after a hint
  });
  it('signs further apart than 5 minutes never add up', () => {
    const d = createDrowsy();
    expect([0, 200_000, 400_000, 600_000].map((t) => d(t, 2, 6))).toEqual([false, false, false, false]);
  });
});
