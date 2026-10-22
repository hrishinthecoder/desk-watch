// Low-power mode (Stage E3 Part 3). Pure, unit-tested in tests/power.test.ts.
import { tk } from '../../electron/i18n';
// Desk Watch aims for 5 checks a second. On a slow computer the models fall behind, so in Auto it
// measures the real speed for 10 seconds (after a 10-second warm-up) and steps down if it is too slow:
//   full    → phone detector efficientdet_lite2 (22 MB) + hand tracking with zoomed hand checks, 5 checks a second
//   lighter → the smaller phone detector efficientdet_lite0 (13 MB), hand tracking kept
//   fewer   → lite0 + hand tracking, but only 2 checks a second (less work for the computer)
// (Until 2026-10-15 the last step switched hand tracking off; on the owner's clips that missed 4 of 5 pickups.)
// The accuracy per level is measured with `npm run replay power=…`.

export type PowerSetting = 'auto' | 'full' | 'low';
export type PowerLevel = 'full' | 'lighter' | 'fewer';
export type Rates = { checks: number; phone: number; hands: number }; // results per second

// Below 2 phone results a second, the 2-second phone wait sees too few checks to be reliable.
export const MIN_RATE = 2;
export const FEWER_CHECKS = 2; // checks a second in the 'fewer' level
export const MEASURE_MS = 10_000;
export const WARMUP_MS = 10_000; // not measured: the first seconds after the models load

export const startLevel = (s: string): PowerLevel => (s === 'low' ? 'fewer' : 'full');

// Auto: the next level after a measurement. Never steps up (a busy moment is not a fast computer;
// the next start measures again). Fewer than 2 checks in the whole window means the camera gave no frames
// (not running): that changes nothing. A very slow computer still makes a few checks, and steps down.
export const MIN_CHECKS = 2 / (MEASURE_MS / 1000);
export function stepDown(level: PowerLevel, r: Rates, minRate = MIN_RATE): PowerLevel {
  if (level === 'fewer' || r.checks < MIN_CHECKS) return level;
  const slowPhone = r.phone < minRate, slowHands = r.hands < minRate;
  if (level === 'full' && slowPhone) return 'lighter'; // the big phone model is the usual bottleneck
  if (slowHands || slowPhone) return 'fewer';
  return level;
}

// English names, shown with t(). "2" is FEWER_CHECKS.
export const LEVEL_TEXT: Record<PowerLevel, string> = {
  full: tk('Full'),
  lighter: tk('Lighter phone model'),
  fewer: tk('Lighter phone model, 2 checks a second'),
};
export const detectorModel = (l: PowerLevel) => (l === 'full' ? 'efficientdet_lite2' : 'efficientdet_lite0');
export const checksPerSec = (l: PowerLevel, normal: number) => (l === 'fewer' ? Math.min(normal, FEWER_CHECKS) : normal);
