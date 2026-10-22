import { describe, expect, it } from 'vitest';
import { checksPerSec, detectorModel, FEWER_CHECKS, MIN_RATE, startLevel, stepDown } from '../src/state/power';

const r = (phone: number, hands: number, checks = 5) => ({ checks, phone, hands });

describe('low-power mode', () => {
  it('starts full in Auto and Full, lowest in Low power; unknown values act like Auto', () => {
    expect(startLevel('auto')).toBe('full');
    expect(startLevel('full')).toBe('full');
    expect(startLevel('low')).toBe('fewer');
    expect(startLevel('nonsense')).toBe('full');
  });
  it('a fast computer stays full', () => {
    expect(stepDown('full', r(4.8, 4.9))).toBe('full');
    expect(stepDown('full', r(MIN_RATE, MIN_RATE))).toBe('full');
  });
  it('a slow phone model: smaller model first, then fewer checks a second', () => {
    expect(stepDown('full', r(1.2, 4))).toBe('lighter');
    expect(stepDown('lighter', r(1.5, 4))).toBe('fewer');
    expect(stepDown('lighter', r(3.5, 4))).toBe('lighter');
  });
  it('slow hand tracking goes straight to fewer checks (a smaller phone model would not help it)', () => {
    expect(stepDown('full', r(4, 1))).toBe('fewer');
  });
  it('never steps up, and no checks (camera off) changes nothing', () => {
    expect(stepDown('fewer', r(5, 5))).toBe('fewer');
    expect(stepDown('full', r(0, 0, 0))).toBe('full');
    expect(stepDown('full', r(0, 0, 0.1))).toBe('full'); // 1 check in 10 s: no camera picture
  });
  it('a computer so slow that even the checks crawl still steps down', () => {
    expect(stepDown('full', r(0.3, 0.3, 0.5))).toBe('lighter');
    expect(stepDown('lighter', r(0.3, 0.3, 0.5))).toBe('fewer');
  });
  it('the bar can be raised (test copies only)', () => {
    expect(stepDown('full', r(4.8, 4.9), 100)).toBe('lighter');
  });
  it('models per level', () => {
    expect(detectorModel('full')).toBe('efficientdet_lite2');
    expect(detectorModel('lighter')).toBe('efficientdet_lite0');
    expect(detectorModel('fewer')).toBe('efficientdet_lite0');
  });
});

describe('checks a second per level', () => {
  it('only the last level checks less often, and never more often than the setting', () => {
    expect(checksPerSec('full', 5)).toBe(5);
    expect(checksPerSec('lighter', 5)).toBe(5);
    expect(checksPerSec('fewer', 5)).toBe(FEWER_CHECKS);
    expect(checksPerSec('fewer', 1)).toBe(1);
  });
});
