import { describe, expect, it } from 'vitest';
import { cameraAdvice, cameraProblem, type CameraStats } from '../src/state/camera';

const GOOD: CameraStats = { faceShare: 1, faceWidth: 0.15, faceY: 0.35, handsShare: 0.9, brightness: 130, faceBrightness: 140 };
const bad = (s: Partial<CameraStats>) => cameraAdvice({ ...GOOD, ...s }).filter((a) => !a.ok).map((a) => a.text);

describe('camera position check', () => {
  it('a good setup passes every check', () => {
    expect(cameraAdvice(GOOD).every((a) => a.ok)).toBe(true);
  });
  it('flags each problem on its own', () => {
    expect(bad({ faceShare: 0.5 })[0]).toMatch(/face is often not found/);
    expect(bad({ faceWidth: 0.05 })[0]).toMatch(/far from the camera/);
    expect(bad({ faceWidth: 0.4 })[0]).toMatch(/too close/);
    expect(bad({ faceY: 0.6 })[0]).toMatch(/lower half/);
    expect(bad({ faceY: 0.1 })[0]).toMatch(/top edge/);
    expect(bad({ handsShare: 0.2 })[0]).toMatch(/hands on the desk are not visible/);
    expect(bad({ brightness: 40, faceBrightness: 40 })[0]).toMatch(/dark/);
    expect(bad({ brightness: 150, faceBrightness: 90 })[0]).toMatch(/light is behind you/);
  });
});

describe('cameraProblem', () => {
  it('names the usual causes in plain words', () => {
    expect(cameraProblem('NotReadableError').title).toBe('Camera is busy: another app is using it');
    expect(cameraProblem('NotAllowedError').title).toBe('Camera is blocked');
    expect(cameraProblem('NotFoundError').title).toBe('No camera found');
    expect(cameraProblem('Whatever').title).toBe('The camera did not start');
  });
});
