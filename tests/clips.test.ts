import { describe, expect, it } from 'vitest';
import { alarmBefore, checkCorrect, CLIP_LABELS, eventSecOf, hasGlasses, LEAVE_SEC, scoredState, secondsToAlarm } from '../src/detection/clips';

describe('A2: clip markers', () => {
  it('reads the beep time and glasses from the file name', () => {
    expect(eventSecOf('holdout-2026-10-11T10-00-00-000Z-ev10.webm')).toBe(10);
    expect(eventSecOf('2026-10-11T10-00-00-000Z-ev10-glasses.webm')).toBe(10);
    expect(eventSecOf('holdout-2026-10-09T05-57-36-307Z.webm')).toBe(null);
    expect(hasGlasses('x-ev10-glasses.webm')).toBe(true);
    expect(hasGlasses('x-ev10.webm')).toBe(false);
  });
  it('every phone label and the A3 eyes-closed labels have a countdown', () => {
    for (const id of ['phone_upright', 'phone_back', 'phone_at_ear', 'phone_in_lap', 'eyes_closed_up', 'eyes_closed_desk'])
      expect(CLIP_LABELS.find((l) => l.id === id)?.event).toBeTruthy();
    expect(CLIP_LABELS.find((l) => l.id === 'pen')?.event).toBeUndefined();
  });
});

describe('A2: per-check score', () => {
  it('old clips work as before: skip the wait, then expect the label', () => {
    expect(checkCorrect('PHONE', 'FOCUSED', 5, null, 4)).toBe(null);
    expect(checkCorrect('PHONE', 'PHONE', 6, null, 4)).toBe(true);
    expect(checkCorrect('PHONE', 'FOCUSED', 6, null, 4)).toBe(false);
    expect(checkCorrect('NOT_PHONE', 'FOCUSED', 1, null, 4)).toBe(null);
    expect(checkCorrect('NOT_PHONE', 'DOWN', 3, null, 4)).toBe(false);
  });
  it('clips with a beep: no alarm expected before it, the label after the wait', () => {
    expect(checkCorrect('PHONE', 'FOCUSED', 5, 10, 4)).toBe(true);   // studying before the beep
    expect(checkCorrect('PHONE', 'PHONE', 5, 10, 4)).toBe(false);    // alarm before the phone is up
    expect(checkCorrect('PHONE', 'FOCUSED', 12, 10, 4)).toBe(null);  // still waiting
    expect(checkCorrect('PHONE', 'PHONE', 16, 10, 4)).toBe(true);
    expect(checkCorrect('PHONE', 'FOCUSED', 16, 10, 4)).toBe(false);
  });
  it('empty desk: scored on presence (nobody seen) after leaving, not on the alarm state', () => {
    expect(CLIP_LABELS.find((l) => l.id === 'empty_desk')).toMatchObject({ expect: 'EMPTY', hand: null, event: expect.any(String) });
    const at = (sec: number, person: boolean) => checkCorrect('EMPTY', scoredState('EMPTY', 'FOCUSED', person), sec, 10, LEAVE_SEC);
    expect(at(5, true)).toBe(true);     // still studying before the beep: someone there is right
    expect(at(12, false)).toBe(null);   // walking out of the picture: not scored
    expect(at(15, false)).toBe(true);   // empty chair, nobody seen
    expect(at(15, true)).toBe(false);   // someone seen (e.g. the cushion scored >= 0.5)
    expect(scoredState('PHONE', 'PHONE', false)).toBe('PHONE'); // other labels keep the rules' state
  });
});

describe('A2: per-event score', () => {
  const run = (states: string[], step = 0.2): [number, string][] => states.map((s, i) => [Math.round(i * step * 10) / 10, s]);
  it('seconds from the beep to the first alarm', () => {
    const checks = run([...Array(50).fill('FOCUSED'), ...Array(12).fill('FOCUSED'), ...Array(20).fill('PHONE')]);
    expect(secondsToAlarm(checks, 10)).toBe(2.4);
    expect(alarmBefore(checks, 10)).toBe(false);
  });
  it('never caught = null; an early alarm is reported separately and does not count as the catch', () => {
    expect(secondsToAlarm(run(Array(150).fill('FOCUSED')), 10)).toBe(null);
    const early = run(['FOCUSED', 'PHONE', ...Array(148).fill('FOCUSED')]);
    expect(alarmBefore(early, 10)).toBe(true);
    expect(secondsToAlarm(early, 10)).toBe(null);
  });
  it('a looking-down alarm also counts as caught (phone in lap)', () => {
    expect(secondsToAlarm([[9, 'FOCUSED'], [10, 'FOCUSED'], [31, 'DOWN']], 10)).toBe(21);
  });
});
