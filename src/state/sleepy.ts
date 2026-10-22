// Drowsy signs (Stage A3), pure: an eye closure of 1.5 s up to the sleepy alarm time is a sign (normal blinks are
// 0.1-0.4 s; on the owner's clips reading never closed the eyes longer than 0.4 s, slow blinks 2-3 s, yawns up to
// 1.8 s). Three signs within 5 minutes → one quiet hint "You look sleepy. Take a short break?"; then quiet for
// 5 minutes. No alarm, the clock keeps running.
export const SIGN_MIN_SEC = 1.5;
export const SIGN_WINDOW_MS = 5 * 60_000;
export const SIGNS_FOR_HINT = 3;

export function createDrowsy() {
  let signs: number[] = [];
  let lastHint = -Infinity;
  // closure: seconds of an eye closure that just ended (Status.closure), 0 otherwise. Returns true when the hint shows.
  return (t: number, closure: number, sleepySec: number): boolean => {
    if (closure >= SIGN_MIN_SEC && closure < sleepySec) signs.push(t);
    signs = signs.filter((x) => t - x < SIGN_WINDOW_MS);
    if (signs.length < SIGNS_FOR_HINT || t - lastHint < SIGN_WINDOW_MS) return false;
    lastHint = t;
    signs = [];
    return true;
  };
}
