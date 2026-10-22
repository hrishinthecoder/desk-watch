import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../state/config';
import type { FaceGeo, Hand, PhoneBox } from '../state/phone';
import { createRules, rulesOnInput, type CheckInput, type Outcome, type Rules } from '../state/rules';
import type { Shapes } from '../state/activities';
import { checksPerSec, detectorModel, MEASURE_MS, startLevel, stepDown, WARMUP_MS, type PowerLevel, type Rates } from '../state/power';
import type { CropModel, DetectorBox, FromWorker, Result, Task, ToWorker } from './vision.worker';
import { t } from '../../electron/i18n';

export type Box = DetectorBox;

export type Frame = {
  W: number; H: number;   // video size in pixels
  boxes: Box[];           // latest full-frame detector result (phones + people)
  phoneFull: number;      // best full-frame phone score anywhere (before the "in hand" rule)
  personScore: number;
  face: boolean;
  pitch: number | null;
  yaw: number | null;
  shapes: Shapes | null;  // eye, eyelid and mouth movement (0-1 each)
  faceGeo: FaceGeo | null;
  hands: Hand[];
  crops: PhoneBox[];      // phones found in the zoomed hand crops (frame pixels)
  ms: { face: number; det: number; hands: number }; // model time per frame
  seq: { det: number; hands: number };              // results so far (to measure real rates)
};

export type Engine = {
  delegate: 'GPU' | 'CPU';
  loadMs: number;
  level: PowerLevel;
  detect(video: HTMLVideoElement, handPad: number): Frame;
  stop(): void; // ends the worker threads (when switching power level)
};

// One worker thread per model. Each check hands an idle worker the current camera frame
// and reads the latest result from all of them, so a slow model never delays the others.
function startWorker(base: string, task: Task, onError: (msg: string) => void, cropModel?: CropModel, detModel?: string) {
  const w = new Worker(new URL('./vision.worker.ts', import.meta.url), { type: 'module' });
  const s = { result: null as Result | null, ms: 0, seq: 0, busy: false };
  let isReady = false;
  const ready = new Promise<{ delegate: 'GPU' | 'CPU'; loadMs: number }>((resolve, reject) => {
    w.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.type === 'ready') { isReady = true; resolve(m); }
      else if (m.type === 'error') {
        s.busy = false;
        if (!isReady) reject(new Error(m.message));
        onError(t('The {model} model failed: {error}', { model: task, error: m.message }));
      } else { s.result = m.result; s.ms = m.ms; s.seq++; s.busy = false; }
    };
    w.onerror = (e) => { reject(new Error(e.message)); onError(t('The {model} model stopped: {error}', { model: task, error: e.message })); };
  });
  w.postMessage({ base, task, cropModel, detModel } satisfies ToWorker);
  const feed = (video: HTMLVideoElement, t: number, handPad: number) => {
    if (s.busy) return;
    s.busy = true;
    createImageBitmap(video).then((bitmap) => w.postMessage({ bitmap, t, handPad } satisfies ToWorker, [bitmap]), () => { s.busy = false; });
  };
  return { s, ready, feed, stop: () => w.terminate() };
}

// All files come from the app's own folder (public/ -> dist/). No CDN, no network.
// level (low-power mode, src/state/power.ts): 'full', or the smaller phone model ('lighter', 'fewer').
export async function createEngine(onError: (msg: string) => void, level: PowerLevel = 'full'): Promise<Engine> {
  const started = performance.now();
  const base = new URL('./', location.href).href;
  const cropModel = (new URLSearchParams(location.search).get('crop') ?? 'lite0-cpu') as CropModel; // replay can compare
  const det = startWorker(base, 'detector', onError, undefined, detectorModel(level));
  const face = startWorker(base, 'face', onError);
  const hands = startWorker(base, 'hands', onError, cropModel);
  const workers = [det, face, hands];
  const [{ delegate }] = await Promise.all(workers.map((w) => w.ready));
  let lastT = 0;

  return {
    delegate,
    loadMs: Math.round(performance.now() - started),
    level,
    stop: () => workers.forEach((w) => w.stop()),
    detect(video, handPad) {
      const t = Math.max(performance.now(), lastT + 1); // MediaPipe needs increasing timestamps
      lastT = t;
      for (const w of workers) w.feed(video, t, handPad);
      const boxes = det.s.result && 'boxes' in det.s.result ? det.s.result.boxes : [];
      const f = face.s.result && 'face' in face.s.result ? face.s.result : { face: false, pitch: null, yaw: null, geo: null, shapes: null };
      const h = hands.s.result && 'hands' in hands.s.result ? hands.s.result : { hands: [], crops: [] };
      const best = (label: string) => Math.max(0, ...boxes.filter((b) => b.label === label).map((b) => b.score));
      return {
        W: video.videoWidth, H: video.videoHeight,
        boxes,
        phoneFull: best('cell phone'),
        personScore: best('person'),
        face: f.face, pitch: f.pitch, yaw: f.yaw, shapes: f.shapes, faceGeo: f.geo,
        hands: h.hands, crops: h.crops,
        ms: { face: face.s.ms, det: det.s.ms, hands: hands.s.ms },
        seq: { det: det.s.seq, hands: hands.s.seq },
      };
    },
  };
}

export type Live = Outcome & { frame: Frame; t: number };
export { createRules, type CheckInput, type Rules };

// One check: run the models on the current video frame and feed the rules.
// Shared by the live camera loop and the clip replay, so both measure the same thing.
export function runCheck(engine: Engine, video: HTMLVideoElement, rules: Rules, s: Settings): Live {
  const frame = engine.detect(video, s.handPad);
  const t = Date.now();
  return { frame, t, ...rulesOnInput(checkInput(frame, t, s), rules, s) };
}

// Everything after the models is pure (src/state/rules.ts), so the replay can save these
// inputs and the scripts can re-run the rules offline with other thresholds.
export const checkInput = (frame: Frame, t: number, s: Settings): CheckInput => ({
  t, W: frame.W, H: frame.H,
  fullPhones: frame.boxes.filter((b) => b.label === 'cell phone'),
  cropPhones: frame.crops,
  hands: frame.hands,
  face: frame.faceGeo,
  person: frame.face || frame.personScore >= s.personScore || frame.hands.length > 0,
  pitch: frame.pitch,
  yaw: frame.yaw,
  shapes: frame.shapes,
});

// Runs the camera + checks at settings.checksPerSec. Lives at the top of the app so it
// keeps running whichever screen is open, and while the window is hidden.
export function useDetection(settings: Settings) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [error, setError] = useState('');
  // The browser's error name when the camera would not open (e.g. NotReadableError = busy), '' when it is fine.
  const [cameraError, setCameraError] = useState('');
  const [cameraTry, setCameraTry] = useState(0);
  const [live, setLive] = useState<Live | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const listeners = useRef(new Set<(l: Live) => void>());

  // Low-power mode: Auto starts full and steps down after measuring; Full and Low power are fixed.
  const [level, setLevel] = useState<PowerLevel>(startLevel(settings.powerMode));
  const [rates, setRates] = useState<Rates | null>(null);
  useEffect(() => { setLevel(startLevel(settings.powerMode)); setRates(null); }, [settings.powerMode]);
  useEffect(() => {
    let stopped = false, made: Engine | null = null;
    setEngine(null);
    createEngine(setError, level).then((e) => { if (stopped) e.stop(); else { made = e; setEngine(e); } },
      (e) => setError(t('Could not load the detection models: {error}', { error: String(e) })));
    return () => { stopped = true; made?.stop(); };
  }, [level]);
  // Measure the real speed for 10 s, after a 10 s warm-up (models settling, and a busy computer just after
  // logging in to Windows would otherwise look slow).
  useEffect(() => {
    if (!engine) return;
    // Model results counted between the first and the last check of the window.
    let checks = 0, first: Frame['seq'] | null = null, last: Frame['seq'] | null = null;
    const count = (l: Live) => { checks++; first ??= l.frame.seq; last = l.frame.seq; };
    const warm = setTimeout(() => listeners.current.add(count), WARMUP_MS);
    const id = setTimeout(() => {
      const sec = MEASURE_MS / 1000;
      const r: Rates = first && last
        ? { checks: checks / sec, phone: (last.det - first.det) / sec, hands: (last.hands - first.hands) / sec }
        : { checks: 0, phone: 0, hands: 0 };
      setRates(r);
      if (settingsRef.current.powerMode === 'auto') {
        // Test copies only: localStorage 'deskwatch-test-minRate' = 100 makes a fast computer count as slow, so the
        // real measure-and-step-down path can be tested end to end. The app itself never sets it.
        const minRate = Number(localStorage.getItem('deskwatch-test-minRate')) || undefined;
        const next = stepDown(engine.level, r, minRate);
        if (next !== engine.level) setLevel(next);
      }
    }, WARMUP_MS + MEASURE_MS);
    return () => { clearTimeout(warm); clearTimeout(id); listeners.current.delete(count); };
    // Also measure again when the Performance choice changes (Full → Auto keeps the same models).
  }, [engine, settings.powerMode]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    setCameraError('');
    navigator.mediaDevices
      .getUserMedia({
        video: { deviceId: settings.cameraId ? { exact: settings.cameraId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = videoRef.current!;
        v.srcObject = s;
        return v.play();
      })
      .catch((e) => { if (!stopped) setCameraError(e?.name || String(e)); });
    return () => { stopped = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [settings.cameraId, cameraTry]);

  useEffect(() => {
    if (!engine) return;
    const rules = createRules();
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) return;
      const l = runCheck(engine, v, rules, settingsRef.current);
      setLive(l);
      listeners.current.forEach((f) => f(l));
    }, 1000 / checksPerSec(engine.level, settings.checksPerSec));
    return () => clearInterval(id);
  }, [engine, settings.checksPerSec]);

  return { videoRef, engine, error, cameraError, retryCamera: () => setCameraTry((n) => n + 1), live, listeners: listeners.current,
    power: { level, rates } };
}