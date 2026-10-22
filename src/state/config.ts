import { isActivityCal, type ActivityCal } from './activities';
// Every threshold the rules use, plus the app's own preferences. Each one is a user setting,
// saved in the local database (electron/db.ts, settings table).
export type AlarmSound = 'beep' | 'siren' | 'chime';
export type Theme = 'system' | 'light' | 'dark';

export type Config = {
  // Sessions and app
  goalMin: number;       // default session length (focused minutes)
  breakMin: number;
  alarmSound: AlarmSound;
  alarmVolume: number;   // 0-1
  strictMode: boolean;   // ending a session early needs a typed sentence
  theme: Theme;
  language: string;      // 'en' | 'bn' (electron/i18n.ts); Settings → App
  routineReminders: boolean; // a notification when a routine block starts (Stage E)
  showDebug: boolean;    // the Debug tab (test clips, tuning); Settings → Advanced, off for new users
  setupDone: boolean;    // first-run setup finished or skipped (E2 Part 3)
  setupStep: string;     // the setup step to resume at after a restart ('' = not started)
  toursSeen: string;     // tours already shown, e.g. "study,planner"
  weekStart: number;     // 0 = Sunday … 6 = Saturday, any of the 7 (like Date.getDay()); used by the Planner's week and History's week card
  powerMode: string;     // 'auto' | 'full' | 'low' (src/state/power.ts); Settings → Advanced
  pomoMin: number;       // pomodoro length (E4): task estimates are in pomodoros; a pomodoro = this many focused minutes
  // Focus mode (E4 Part 2, src/state/focus.ts)
  timerMode: string;     // 'pomodoro' | 'countdown' | 'countup'
  shortBreakMin: number;
  longBreakMin: number;
  longEvery: number;     // a long break after this many pomodoros
  pomoCount: number;     // pomodoros in a Focus mode run (2026-10-21); after the last one the run ends
  countdownMin: number;
  countupMaxMin: number; // the stopwatch stops (session ends) here
  autoStartNext: boolean; // start the next pomodoro after a break by itself
  focusSound: string;    // 'off' | 'white' | 'pink' | 'brown' (src/session/noise.ts)
  focusVolume: number;   // 0-1
  focusBg: string;       // 'black' | 'grey' | 'green' | 'blue'
  lastCamera: boolean;   // the modes of the last session started, used when a task's Start opens Focus mode
  lastScreen: boolean;
  dailyPomos: number;    // daily goal in pomodoros (E4 Part 3), shown as "3 of 8" in the to-do list

  cameraId: string;
  checksPerSec: number;
  personScore: number;   // 0-1 detector confidence needed to count a person

  // Phone (PHONE state). Evidence is 0-1: the best phone score near a hand, or a raised
  // still hand holding something phone-like.
  phoneEnter: number;    // evidence at/above this counts as "phone"
  phoneExit: number;     // evidence must fall below this to count as "phone gone"
  phoneSec: number;      // phone evidence must hold this long to enter PHONE
  phoneGapSec: number;   // dips shorter than this do not restart the phoneSec timer
  phoneExitSec: number;  // phone must be gone this long to leave PHONE
  handPad: number;       // hand crop size, as a multiple of the hand's size
  cropsForPhone: boolean; // also use the zoomed hand-crop score for PHONE. Catches phones the full-frame
                          // model misses (e.g. back facing the camera); with the object veto a calculator
                          // still counts as a phone ~1 time in 10 on the test clips. Off = fewer false alarms.
  usePose: boolean;      // a raised, still hand adds phone evidence (off: no gain on the test clips)
  objectVeto: boolean;   // ignore a phone-looking box in a hand the classifier calls a device or book
  objectMinScore: number; // classifier confidence needed to name what a hand holds
  emptyMin: number;      // object model this sure the hand is empty -> ignore phone boxes there (0 = off)
  poseMinPhone: number;  // a still raised hand counts only if its crop scores at least this
  poseStillSec: number;  // how long a raised hand must be held still
  poseStillMove: number; // "still" = moves less than this share of the frame width

  // Phone call (PHONE_CALL state): a hand held at the ear.
  callSec: number;
  callExitSec: number;
  earReach: number;      // a finger within this many face-widths of an ear
  earBoxReach: number;   // a phone box centre within this many face-widths of an ear
  earSide: number;       // hand centre must be this many face-widths out past the ear line
  callBoxMin: number;    // hand at the ear also needs a phone box this strong at it, or the object model saying phone (0 = not needed)

  // Looking down (possible phone in lap) and away.
  downSec: number;
  awaySec: number;
  smoothMs: number;      // majority vote window for presence and head pitch
  pitchMargin: number;   // degrees beyond your calibrated reading angle
  defaultPitchLimit: number; // used until you calibrate
  calibratedPitch: number | null;
  lapMargin: number;     // phone in lap: head this many degrees past your reading angle (can be below 0)...
  lapEyes: number;       // ...with eyes level (eyes down below this, 0-1). 0 = rule off

  // Sleepy (Stage A3, SLEEPY state). Chosen on the owner's clips (glasses, night): slow blinks keep the eyes
  // closed up to 3.2 s, a dozing clip 10.4 s; with the head on the desk the face is lost but the person is still seen.
  sleepyAlarm: boolean;  // Settings → Sessions: off = never SLEEPY
  sleepySec: number;     // both eyes closed this long without a break
  headDownSec: number;   // face lost while you are still seen (head down on the desk) this long
  sleepyLid: number;     // "closed" = the less closed eye at/above this (0-1)

  // Activities (Stage C). Estimates from your face and hands; all count as study except looking away.
  speakJaw: number;      // mouth movement at/above this = speaking
  awayEyes: number;      // eyes sideways at/above this (0-1) = looking away...
  awayYaw: number;       // ...or head turned more than this many degrees
  lookAwaySec: number;   // looking away this long rings the alarm
  writeMove: number;     // a visible fingertip moving this fast (share of frame width/s) = writing
  readEyes: number;      // eyes down or eyelids lowered at/above this (0-1) = reading
  activityCal: ActivityCal | null; // your averages from the calibration wizard (Debug screen)

  // Saved calibrations, one per place you study. Choosing one copies its values above.
  workstations: Workstation[];
  workstation: string;   // name of the one in use; '' = current calibration is not saved
};

// A desk + chair + camera position: if that stays the same, its calibration stays valid.
export type Workstation = { name: string; calibratedPitch: number | null; activityCal: ActivityCal | null; cameraId: string };

export type Settings = Config;

export const DEFAULTS: Config = {
  goalMin: 50,
  breakMin: 5,
  alarmSound: 'beep',
  alarmVolume: 0.8,
  strictMode: false,
  theme: 'system',
  language: 'en',
  routineReminders: true,
  showDebug: false,
  setupDone: false,
  setupStep: '',
  toursSeen: '',
  weekStart: 1,
  powerMode: 'auto',
  pomoMin: 25,
  timerMode: 'pomodoro',
  shortBreakMin: 5,
  longBreakMin: 15,
  longEvery: 4,
  pomoCount: 4,
  countdownMin: 50,
  countupMaxMin: 120,
  autoStartNext: false,
  focusSound: 'off',
  focusVolume: 0.4,
  focusBg: 'black',
  lastCamera: true,
  lastScreen: false,
  dailyPomos: 8,
  cameraId: '',
  checksPerSec: 5,
  personScore: 0.5,
  phoneEnter: 0.45, // tuned on the test clips: real phones scored 0.52-0.76, a calculator up to ~0.5
  phoneExit: 0.2,
  phoneSec: 2, // 2 s: no extra false alarms on the test clips vs 4 s, reacts twice as fast
  phoneGapSec: 1.5,
  phoneExitSec: 3,
  handPad: 2.5,
  cropsForPhone: true,
  usePose: false,
  objectVeto: true,
  objectMinScore: 0.05,
  emptyMin: 0.8, // hand-on-head clips: false calls 28% -> 0%, real calls unchanged
  poseMinPhone: 0.15,
  poseStillSec: 2,
  poseStillMove: 0.04,
  callSec: 2,
  callExitSec: 3,
  earReach: 0.5,
  earBoxReach: 0.6,
  earSide: 0.1,
  callBoxMin: 0.25, // a hand at the ear alone is not a call (hand resting on the head)
  downSec: 20,
  awaySec: 20,
  smoothMs: 1000,
  pitchMargin: 12,
  defaultPitchLimit: 25,
  calibratedPitch: null,
  lapMargin: -3,
  lapEyes: 0, // off: on the kept-aside clips it caught 36% of lap phones but wrongly rang in 57-74% of no-phone time
  sleepyAlarm: true,
  sleepySec: 6,
  headDownSec: 15,
  sleepyLid: 0.6,
  speakJaw: 0.05,
  awayEyes: 0.45,
  awayYaw: 35,
  lookAwaySec: 20,
  writeMove: 0.05,
  readEyes: 0.2,
  activityCal: null,
  workstations: [],
  workstation: '',
};

// Only the values you changed are saved, so improved defaults in a new version reach you.
// (Before v2 the whole object was saved, which froze old defaults: e.g. cropsForPhone
// stayed off after the default became on. From such old data only your camera and your
// calibrated reading angle are kept.)
const SETTINGS_VERSION = 2;
const PERSONAL: (keyof Config)[] = ['cameraId', 'calibratedPitch'];

// Keeps only known keys whose type matches the default, so a damaged or hand-edited
// value can never reach the rules (e.g. a text where a number belongs).
const isWorkstation = (w: unknown): w is Workstation => {
  const x = w as Workstation;
  return typeof x === 'object' && x !== null && typeof x.name === 'string' && x.name.trim() !== '' && typeof x.cameraId === 'string' &&
    (x.calibratedPitch === null || Number.isFinite(x.calibratedPitch)) && (x.activityCal === null || isActivityCal(x.activityCal));
};
const valid = (k: string, v: unknown) =>
  k === 'activityCal' ? v === null || isActivityCal(v)
  : k === 'workstations' ? Array.isArray(v) && v.every(isWorkstation)
  : k in DEFAULTS && (typeof v === typeof DEFAULTS[k as keyof Config] || (k === 'calibratedPitch' && (v === null || typeof v === 'number')));
// Pomodoro counts never go above 12 (owner, 2026-10-23): older saved values are brought down when loaded.
const POMO_KEYS = ['pomoCount', 'longEvery'] as const;
export const fromOwn = (own: Record<string, unknown>): Config => {
  const c: Config = { ...DEFAULTS, ...Object.fromEntries(Object.entries(own ?? {}).filter(([k, v]) => valid(k, v))) };
  for (const k of POMO_KEYS) c[k] = Math.max(1, Math.min(12, Math.round(c[k])));
  return c;
};
export const ownSettings = (s: Config) =>
  Object.fromEntries(Object.entries(s).filter(([k, v]) => JSON.stringify(DEFAULTS[k as keyof Config]) !== JSON.stringify(v)));

// Old browser-storage format (before the database), still read once to move it over.
export function parseSettings(json: string | null): Config {
  try {
    const saved = JSON.parse(json ?? '{}');
    return fromOwn(saved.v === SETTINGS_VERSION
      ? saved.own ?? {}
      : Object.fromEntries(PERSONAL.filter((k) => k in saved).map((k) => [k, saved[k]])));
  } catch {
    return DEFAULTS;
  }
}
export const serializeSettings = (s: Config) => JSON.stringify({ v: SETTINGS_VERSION, own: ownSettings(s) });

// From the database. The first time, settings saved by an older version in browser
// storage are moved into the database and removed from browser storage.
export function loadSettings(): Config {
  const own = window.deskwatch.getSettings();
  const old = localStorage.getItem('settings');
  if (old !== null && Object.keys(own).length === 0) {
    const s = parseSettings(old);
    saveSettings(s);
    localStorage.removeItem('settings');
    return s;
  }
  return fromOwn(own);
}
export const saveSettings = (s: Config) => window.deskwatch.setSettings(ownSettings(s));

export const pitchLimit = (s: Config) =>
  s.calibratedPitch === null ? s.defaultPitchLimit : s.calibratedPitch + s.pitchMargin;

// ---- workstations ----
const fromSettings = (s: Config, name: string): Workstation =>
  ({ name, calibratedPitch: s.calibratedPitch, activityCal: s.activityCal, cameraId: s.cameraId });

// Save the calibration in use under `name` (replaces one with the same name) and select it.
export function saveWorkstation(s: Config, name: string): Config {
  const n = name.trim();
  if (!n) return s;
  const others = s.workstations.filter((w) => w.name !== n);
  return { ...s, workstations: [...others, fromSettings(s, n)], workstation: n };
}

// Use a saved workstation: its calibration and camera replace the ones in use.
export function switchWorkstation(s: Config, name: string): Config {
  const w = s.workstations.find((x) => x.name === name);
  return w ? { ...s, calibratedPitch: w.calibratedPitch, activityCal: w.activityCal, cameraId: w.cameraId, workstation: w.name } : s;
}

export const deleteWorkstation = (s: Config, name: string): Config =>
  ({ ...s, workstations: s.workstations.filter((w) => w.name !== name), workstation: s.workstation === name ? '' : s.workstation });

// A new calibration that is not saved yet: in use now, but no workstation selected.
export const calibrateTemporarily = (s: Config, c: Pick<Config, 'calibratedPitch' | 'activityCal'>): Config => ({ ...s, ...c, workstation: '' });

// End of a calibration: saved straight into `place` (a new place, or the one being
// recalibrated), or with no place kept for now only.
export const finishCalibration = (s: Config, c: Pick<Config, 'calibratedPitch' | 'activityCal'>, place: string): Config =>
  place.trim() ? saveWorkstation(calibrateTemporarily(s, c), place) : calibrateTemporarily(s, c);
