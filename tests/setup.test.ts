import { describe, expect, it } from 'vitest';
import {
  aimCheck, ALARM_WAIT_MS, cameraGate, markSeen, nextStep, PICKUP_AT_MS, practiceGuide, prevStep, PRIVACY_SENTENCE,
  seenTours, setupOnStart, TOURS, type Guide,
} from '../src/state/setup';
import { observedActivity } from '../src/session/accounting';

describe('setup', () => {
  it('runs for a new user, resumes where it was closed, never runs for an existing user', () => {
    expect(setupOnStart({ setupDone: false, setupStep: '' }, false)).toBe('welcome');
    expect(setupOnStart({ setupDone: false, setupStep: 'aim' }, true)).toBe('aim');
    expect(setupOnStart({ setupDone: false, setupStep: '' }, true)).toBe('skip-existing');
    expect(setupOnStart({ setupDone: true, setupStep: '' }, false)).toBe('none');
    expect(setupOnStart({ setupDone: false, setupStep: 'nonsense' }, false)).toBe('welcome');
  });
  it('steps in order', () => {
    expect(nextStep('welcome')).toBe('camera');
    expect(nextStep('practice')).toBeNull();
    expect(prevStep('welcome')).toBeNull();
  });
  it('privacy sentence is one sentence and names the only exception', () => {
    expect(PRIVACY_SENTENCE.match(/\./g)).toHaveLength(1);
    expect(PRIVACY_SENTENCE).toContain('never uploaded');
    expect(PRIVACY_SENTENCE).toContain('Debug tab');
  });
});

describe('aim check', () => {
  const f = (face: boolean, ...handsY: number[]) => ({ face, handsY });
  const ok = (frames: ReturnType<typeof f>[]) => Object.fromEntries(aimCheck(frames).map((a) => [a.key, a.ok]));
  it('all good: face, hands, hands low in the picture', () => {
    expect(ok([f(true, 0.7, 0.8), f(true, 0.75), f(true, 0.8)])).toEqual({ face: true, hands: true, desk: true });
  });
  it('hands seen but high in the picture: no desk', () => {
    expect(ok([f(true, 0.3), f(true, 0.35), f(true, 0.4)])).toEqual({ face: true, hands: true, desk: false });
  });
  it('nothing seen', () => {
    expect(ok([f(false), f(false)])).toEqual({ face: false, hands: false, desk: false });
    expect(ok([])).toEqual({ face: false, hands: false, desk: false });
  });
});

describe('guided practice', () => {
  const run = (steps: [number, boolean, boolean][]) => steps.reduce<Guide>((g, [t, alarm, clock]) => practiceGuide(g, t, alarm, clock), { stage: 'study', since: 0 });
  it('pick up → alarm → put down → clock runs again', () => {
    expect(run([[10_000, false, true]]).stage).toBe('study');
    expect(run([[PICKUP_AT_MS, false, true]]).stage).toBe('pickup');
    expect(run([[PICKUP_AT_MS, false, true], [PICKUP_AT_MS + 3000, true, false]]).stage).toBe('putdown');
    expect(run([[PICKUP_AT_MS, false, true], [PICKUP_AT_MS + 3000, true, false], [PICKUP_AT_MS + 6000, false, true]]).stage).toBe('works');
  });
  it('says so honestly when the alarm does not ring within 10 s', () => {
    expect(run([[PICKUP_AT_MS, false, true], [PICKUP_AT_MS + ALARM_WAIT_MS - 1, false, true]]).stage).toBe('pickup');
    expect(run([[PICKUP_AT_MS, false, true], [PICKUP_AT_MS + ALARM_WAIT_MS, false, true]]).stage).toBe('nofire');
  });
  it('an alarm before the prompt does not count', () => {
    expect(run([[5000, true, false]]).stage).toBe('study');
  });
});

describe('camera check before a session', () => {
  it('starts as soon as the face is found; 3 s is the limit', () => {
    expect(cameraGate(200, true)).toBe('start');
    expect(cameraGate(2999, false)).toBe('wait');
    expect(cameraGate(3000, false)).toBe('fail');
  });
  it('"Start anyway" starts in Away with the clock stopped until the camera sees your face', () => {
    const face = { state: 'FOCUSED', activity: 'READING', face: true };
    expect(observedActivity(true, null, true)).toBe('AWAY');                         // no camera at all
    expect(observedActivity(true, { ...face, face: false }, true)).toBe('AWAY');     // camera, no face
    expect(observedActivity(true, face, true)).toBe('READING');                      // face found: normal again
    expect(observedActivity(true, null, false)).toBe('FOCUSED');                     // normal session, unchanged
    expect(observedActivity(false, null, true)).toBe('FOCUSED');                     // camera mode off: timer only
  });
});

describe('tours', () => {
  it('at most 7 steps each, targets unique', () => {
    for (const steps of Object.values(TOURS)) {
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.length).toBeLessThanOrEqual(7);
      expect(new Set(steps.map((s) => s.target)).size).toBe(steps.length);
    }
  });
  it('remembers which tours were shown', () => {
    expect([...seenTours(markSeen(markSeen('', 'planner'), 'planner'))]).toEqual(['planner']);
    expect(seenTours(markSeen('planner', 'history')).has('history')).toBe(true);
  });
});

describe('aim check wording', () => {
  it('never says "your hands are high" when no hands are seen', () => {
    expect(aimCheck([{ face: true, handsY: [] }]).find((a) => a.key === 'desk')!.fix).not.toContain('high');
    expect(aimCheck([{ face: true, handsY: [0.2] }]).find((a) => a.key === 'desk')!.fix).toContain('high');
  });
});
