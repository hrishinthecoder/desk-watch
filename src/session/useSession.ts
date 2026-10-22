// A study session: the focused-time clock, break, alarm and goal. Runs in the page (so it
// keeps going while the window is hidden in the tray) and saves to the database as it goes.
import { useEffect, useRef, useState } from 'react';
import { bridge, type ScreenStatus } from '../bridge';
import type { Live } from '../detection/engine';
import type { Settings } from '../state/config';
import { ALARM, STUDY, alarmFor, observedActivity, type Activity, type Segment } from './accounting';
import { createDrowsy } from '../state/sleepy';
import { playAlarm, playCue, playGoal } from './sounds';
import type { TimerMode } from '../state/focus';
import { alarmText } from './accounting';
import { t as tr } from '../../electron/i18n'; // "t" is a time here

// practice: the guided 2-minute practice in setup, never saved anywhere.
// startAway: "Start anyway" after a failed camera check (see observedActivity).
// timer: started from Focus mode (E4) with this timer mode (how the clock is shown; not saved).
export type SessionOpts = { plannedMin: number; cameraMode: boolean; screenMode: boolean; taskId?: number | null; practice?: boolean; startAway?: boolean; timer?: TimerMode };
export type Phase = 'setup' | 'running' | 'break' | 'saving' | 'done';

const TICK_MS = 250;
const SAVE_EVERY_MS = 10_000; // the open segment's end time is saved this often
const ALARM_EVERY_MS = 1300;
const PHONE = new Set(['PHONE', 'PHONE_CALL']);

type Cur = { activity: Activity; start: number; segId: Promise<number> };
// A practice session saves nothing: every database call becomes a no-op.
const NOT_SAVED = { segmentStart: async () => 0, segmentExtend: async () => {}, sessionEvent: async () => {}, sessionFinish: async () => {}, setBlocking: () => {}, attention: () => {} };
type S = {
  phase: Phase; id: number; opts: SessionOpts; startedAt: number;
  focusedClosedMs: number; cur: Cur | null; breakEnds: number;
  alarm: string; warning: string; lastBeep: number; lastSave: number; reachedGoal: boolean; warnedExtension: boolean;
  holdAway: boolean; segments: Segment[]; // kept in memory too (the practice report reads them)
};

export function useSession(live: Live | null, settings: Settings) {
  const s = useRef<S>({
    phase: 'setup', id: 0, opts: { plannedMin: settings.goalMin, cameraMode: true, screenMode: false }, startedAt: 0,
    focusedClosedMs: 0, cur: null, breakEnds: 0, alarm: '', warning: '', lastBeep: 0, lastSave: 0, reachedGoal: false, warnedExtension: false, holdAway: false, segments: [],
  });
  // Blocker mode news from the main process: a blocked app in front, or the extension missing.
  const screenRef = useRef<ScreenStatus>({ blockedApp: null, missingExtension: false, appWarning: null, site: null });
  useEffect(() => bridge().onScreenStatus((st) => { screenRef.current = st; render((n) => n + 1); }), []);
  const liveRef = useRef(live);
  liveRef.current = live;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [, render] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Drowsy signs (Stage A3): checked on every camera check while studying; the quiet hint shows for a minute.
  const drowsy = useRef(createDrowsy());
  const drowsyAt = useRef(-Infinity);
  useEffect(() => {
    const st = s.current;
    if (!live || st.phase !== 'running' || !st.opts.cameraMode || !settingsRef.current.sleepyAlarm) return;
    if (drowsy.current(Date.now(), live.status.closure, settingsRef.current.sleepySec)) drowsyAt.current = Date.now();
  }, [live]);

  // What you are doing right now, as the session sees it.
  // While focused, the activity estimate (writing, reading...). A glance away shorter than
  // the look-away alarm time counts as idle, so it costs no study time.
  const observed = (): Activity => {
    const l = liveRef.current;
    const r = s.current;
    if (r.holdAway && l?.frame.face) r.holdAway = false; // the camera sees you: back to normal
    return observedActivity(r.opts.cameraMode, l && { state: l.status.state, activity: l.activity.activity, face: !!l.frame.face }, r.holdAway);
  };
  const db = () => (s.current.opts.practice ? NOT_SAVED : bridge());

  function switchTo(activity: Activity, t: number) {
    const r = s.current;
    const prev = r.cur;
    if (prev) {
      prev.segId.then((id) => db().segmentExtend(id, t));
      if (STUDY.has(prev.activity)) r.focusedClosedMs += t - prev.start;
      if (PHONE.has(activity) && !PHONE.has(prev.activity)) db().sessionEvent(r.id, 'phone_pickup', t);
      if (activity === 'AWAY') db().sessionEvent(r.id, 'left_desk', t);
    }
    if (prev) r.segments.push({ activity: prev.activity, start: prev.start, end: t });
    r.cur = { activity, start: t, segId: db().segmentStart(r.id, activity, t) };
    r.lastSave = t;
  }

  const focusedMs = (t: number) => {
    const r = s.current;
    return r.focusedClosedMs + (r.cur && STUDY.has(r.cur.activity) ? t - r.cur.start : 0);
  };

  async function start(opts: SessionOpts) {
    const r = s.current;
    const t = Date.now();
    r.id = opts.practice ? 0 : await bridge().sessionStart({ plannedMin: opts.plannedMin, cameraMode: opts.cameraMode, screenMode: opts.screenMode, taskId: opts.taskId, startedAt: t });
    Object.assign(r, { phase: 'running', opts, startedAt: t, focusedClosedMs: 0, cur: null, alarm: '', reachedGoal: false, warnedExtension: false,
      holdAway: !!opts.startAway && opts.cameraMode, segments: [] });
    switchTo(observed(), t);
    render((n) => n + 1);
  }

  // A break counts down and rings when it runs out. A pause (washroom, urgent call) has no
  // time limit and never rings; the clock and the alarms simply wait until you resume.
  function takeBreak(pause = false) {
    const r = s.current;
    const t = Date.now();
    db().sessionEvent(r.id, pause ? 'pause' : 'break', t);
    switchTo(pause ? 'PAUSED' : 'BREAK', t);
    r.phase = 'break';
    db().setBlocking(false); // sites and apps are not blocked during a break or a pause
    r.breakEnds = pause ? Infinity : t + settingsRef.current.breakMin * 60_000;
    render((n) => n + 1);
  }
  const pause = () => takeBreak(true);

  function resume() {
    const r = s.current;
    switchTo(observed(), Date.now());
    r.phase = 'running';
    db().setBlocking(true);
    render((n) => n + 1);
  }

  async function end(early: boolean) {
    const r = s.current;
    if (r.phase !== 'running' && r.phase !== 'break') return;
    r.phase = 'saving'; // stops the tick from ending it twice
    const t = Date.now();
    if (r.cur && STUDY.has(r.cur.activity)) r.focusedClosedMs += t - r.cur.start;
    const segId = r.cur ? await r.cur.segId : null;
    if (segId !== null) await db().segmentExtend(segId, t);
    if (r.cur) r.segments.push({ activity: r.cur.activity, start: r.cur.start, end: t });
    if (!early) await db().sessionEvent(r.id, 'goal_reached', t);
    await db().sessionFinish(r.id, t, early);
    Object.assign(r, { phase: 'done', cur: null, alarm: '', reachedGoal: !early });
    if (!early && !r.opts.practice) {
      playGoal(settingsRef.current.alarmVolume);
      db().attention(tr('Goal reached!'), tr('You studied {min} focused minutes.', { min: r.opts.plannedMin }));
    }
    render((n) => n + 1);
  }

  const newSession = () => { s.current.phase = 'setup'; render((n) => n + 1); };

  // Focus mode's task switch (E4): the session so far stays with the old task; a new session with the same
  // settings goes on for the time left (whole minutes), so every minute counts for the right task.
  async function switchTask(taskId: number | null) {
    const r = s.current;
    if (r.phase !== 'running' && r.phase !== 'break') return;
    const opts = r.opts, left = opts.plannedMin * 60_000 - focusedMs(Date.now());
    await db().sessionEvent(r.id, 'task_switch', Date.now());
    await end(true);
    await start({ ...opts, taskId, startAway: false, plannedMin: Math.max(1, Math.ceil(left / 60_000)) });
  }

  useEffect(() => {
    const id = setInterval(() => {
      const r = s.current;
      const t = Date.now();
      setNow(t);
      if (r.phase !== 'running' && r.phase !== 'break') return;

      if (r.phase === 'running') {
        const act = observed();
        if (act !== r.cur?.activity) switchTo(act, t);
        if (focusedMs(t) >= r.opts.plannedMin * 60_000) { end(false); return; }
      }
      if (t - r.lastSave >= SAVE_EVERY_MS && r.cur) {
        r.lastSave = t;
        r.cur.segId.then((sid) => db().segmentExtend(sid, t));
      }

      // The alarm rings while you are on the phone, looking down, away, in a blocked app
      // (Blocker mode), or past the break.
      // Blocker mode (Stage G4): a blocked app or site first gets a warning (no alarm); these are the alarms after it.
      const sc = screenRef.current;
      const blockedApp = r.phase === 'running' ? sc.blockedApp : null;
      const blockedSite = r.phase === 'running' && sc.site?.mode === 'alarm' ? sc.site.host : null;
      const warning = r.phase === 'running' ? (sc.appWarning ? `app:${sc.appWarning.name}` : sc.site?.mode === 'warn' ? `site:${sc.site.host}` : '') : '';
      if (warning && warning !== r.warning) playCue(settingsRef.current.alarmVolume); // a soft sound once, not the alarm
      r.warning = warning;
      const alarm = blockedApp ? `Blocked app: ${blockedApp}` : blockedSite ? `Blocked site: ${blockedSite}`
        : r.phase === 'running' && r.cur && ALARM.has(r.cur.activity) ? alarmFor(r.cur.activity)
        : r.phase === 'break' && t >= r.breakEnds ? 'Break is over' : '';
      if (alarm && alarm !== r.alarm) {
        db().attention(`Desk Watch: ${alarmText(alarm)}`, alarm === 'Break is over' ? tr('Time to get back to work.') : tr('Back to your studies!'));
      }
      r.alarm = alarm;
      if (r.phase === 'running' && screenRef.current.missingExtension && !r.warnedExtension) {
        r.warnedExtension = true;
        db().attention(tr('Desk Watch: browser extension not connected'), tr('Sites cannot be blocked in this browser. Set up the extension in Settings → Blocker mode.'));
      }
      if (alarm && t - r.lastBeep >= ALARM_EVERY_MS) {
        r.lastBeep = t;
        playAlarm(settingsRef.current.alarmSound, settingsRef.current.alarmVolume);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const r = s.current;
  return {
    phase: r.phase,
    opts: r.opts,
    startedAt: r.startedAt,
    sessionId: r.id,
    activity: r.cur?.activity ?? null,
    focusedMs: focusedMs(now),
    goalMs: r.opts.plannedMin * 60_000,
    breakLeftMs: Math.max(0, r.breakEnds - now), // Infinity while paused
    alarm: r.alarm,
    drowsy: now - drowsyAt.current < 60_000, // "You look sleepy. Take a short break?"
    reachedGoal: r.reachedGoal,
    screen: screenRef.current,
    segments: r.segments,
    start, takeBreak: () => takeBreak(), pause, resume, end, newSession, switchTask,
  };
}
export type Session = ReturnType<typeof useSession>;
