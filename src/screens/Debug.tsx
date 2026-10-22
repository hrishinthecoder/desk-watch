import { useEffect, useRef, useState } from 'react';
import { bridge } from '../bridge';
import { Calibrate } from './Calibrate';
import { CLIP_LABELS, EVENT_SEC } from '../detection/clips';
import { playCue } from '../session/sounds';
import type { Live } from '../detection/engine';
import { cameraAdvice, type Advice } from '../state/camera';
import { pitchLimit, type Settings } from '../state/config';
import { cropRect, handRect, heldObject, KIND_TEXT } from '../state/phone';
import { CameraSelect } from './Settings';
import { eyelids, eyesDown, eyesSide } from '../state/activities';
import { ACTIVITY_TEXT } from '../session/accounting';
import { lapPitch } from '../state/rules';

const f1 = (n: number | null) => (n === null ? '—' : n.toFixed(1));
const f2 = (n: number) => n.toFixed(2);

type Props = {
  live: Live | null;
  settings: Settings;
  setSettings: (s: Settings) => void;
  listeners: Set<(l: Live) => void>;
  delegate?: string;
  loadMs?: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

export function Debug({ live, settings, setSettings, listeners, delegate, loadMs, videoRef }: Props) {
  const fr = live?.frame;
  const st = live?.status;
  const sg = live?.signals;
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings({ ...settings, [k]: Number(e.target.value) });

  return (
    <div className="debug">
      <div className={`state state-${st?.state ?? 'none'}`}>{st ? ACTIVITY_TEXT[st.state] : 'Starting…'}</div>
      {live && <div className="row">Activity (estimate): <b>{ACTIVITY_TEXT[live.activity.activity]}</b> <small className="note">{Math.round(live.activity.confidence * 100)}% sure</small></div>}

      <table>
        <tbody>
          <tr><td>Phone evidence</td><td className={sg && sg.phone >= settings.phoneEnter ? 'hit' : ''}>{sg ? f2(sg.phone) : '—'} <small>enter ≥ {settings.phoneEnter}, leave &lt; {settings.phoneExit}</small></td></tr>
          <tr><td>…phone near hand</td><td>{sg ? f2(sg.inHand) : '—'} <small>anywhere in frame {fr ? f2(fr.phoneFull) : '—'}</small></td></tr>
          <tr><td>…phone in hand crop</td><td>{sg ? f2(sg.crop) : '—'} <small>{fr ? fr.hands.length : 0} hand(s), still raised hand: {sg?.pose ? 'yes' : 'no'}</small></td></tr>
          <tr><td>In hand, looks like</td><td>{sg ? KIND_TEXT[sg.held] : '—'} <small>{fr?.hands[0]?.top?.[0] ? `top guess: ${fr.hands[0].top[0][0]} ${f2(fr.hands[0].top[0][1])}` : 'pens are too thin to name; Stage C uses your grip'}</small></td></tr>
          <tr><td>Hand at ear</td><td className={sg?.call ? 'hit' : ''}>{sg ? (sg.call ? 'yes' : 'no') : '—'} <small>call after {settings.callSec} s</small></td></tr>
          <tr><td>Person score</td><td>{fr ? f2(fr.personScore) : '—'} <small>need ≥ {settings.personScore}, or a face or hand</small></td></tr>
          <tr><td>Face found</td><td>{fr ? (fr.face ? 'yes' : 'no') : '—'}</td></tr>
          <tr><td>Head pitch</td><td className={fr && (fr.pitch ?? Infinity) > pitchLimit(settings) ? 'hit' : ''}>{fr ? f1(fr.pitch) + '°' : '—'} <small>down if &gt; {f1(pitchLimit(settings))}°</small></td></tr>
          <tr><td>Head turn</td><td>{fr ? f1(fr.yaw) + '°' : '—'} <small>0 = facing the camera</small></td></tr>
          <tr><td>Eyes</td><td>{fr?.shapes ? `down ${f2(eyesDown(fr.shapes))} · sideways ${f2(eyesSide(fr.shapes))} · lids closed ${f2(eyelids(fr.shapes))}` : '—'}</td></tr>
          <tr><td>Phone in lap?</td><td className={fr && fr.pitch !== null && fr.pitch > lapPitch(settings) && live && live.features.eyesDown < settings.lapEyes ? 'hit' : ''}>head past {f1(lapPitch(settings))}° with eyes level <small>{settings.lapEyes > 0 ? `eyes down now ${live ? f2(live.features.eyesDown) : '—'}, need < ${settings.lapEyes}` : 'rule off (Settings)'}</small></td></tr>
          <tr><td>Mouth movement</td><td>{live ? f2(live.features.jawMove) : '—'} <small>speaking ≥ {settings.speakJaw}</small></td></tr>
          <tr><td>Hand movement</td><td>{live ? f2(live.features.handMove) : '—'} <small>writing ≥ {settings.writeMove} (hand must be visible)</small></td></tr>
          <tr><td>Mouth open</td><td>{fr?.shapes ? f2(fr.shapes.jawOpen) : '—'} <small>moves while you speak</small></td></tr>
          <tr><td>Phone building</td><td>{st ? f1(st.held.phone) : '—'} s <small>PHONE at {settings.phoneSec} s</small></td></tr>
          <tr><td>Call building</td><td>{st ? f1(st.held.call) : '—'} s <small>CALL at {settings.callSec} s</small></td></tr>
          <tr><td>Looking down held</td><td>{st ? f1(st.held.down) : '—'} s <small>alarm at {settings.downSec} s</small></td></tr>
          <tr><td>Looking away held</td><td>{st ? f1(st.held.lookAway) : '—'} s <small>alarm at {settings.lookAwaySec} s</small></td></tr>
          <tr><td>Away held</td><td>{st ? f1(st.held.away) : '—'} s <small>alarm at {settings.awaySec} s</small></td></tr>
          <tr><td>Model time</td><td>phone {fr ? Math.round(fr.ms.det) : '—'} · face {fr ? Math.round(fr.ms.face) : '—'} · hands {fr ? Math.round(fr.ms.hands) : '—'} ms <small>{delegate ?? '…'}, loaded in {loadMs ?? '…'} ms</small></td></tr>
        </tbody>
      </table>

      <Calibrate live={live} settings={settings} setSettings={setSettings} listeners={listeners} />

      <CameraSelect settings={settings} setSettings={setSettings} />

      <details>
        <summary>Quick threshold tweaks for testing</summary>
        <label>Phone enter score <input type="number" step="0.05" min="0.05" max="0.95" value={settings.phoneEnter} onChange={set('phoneEnter')} /></label>
        <label>Phone leave score <input type="number" step="0.05" min="0" max="0.95" value={settings.phoneExit} onChange={set('phoneExit')} /></label>
        <label>Call seconds <input type="number" min="0" value={settings.callSec} onChange={set('callSec')} /></label>
        <label>Use hand-crop score for phone <input type="checkbox" checked={settings.cropsForPhone} onChange={(e) => setSettings({ ...settings, cropsForPhone: e.target.checked })} /></label>
        <label>Use "still raised hand" rule <input type="checkbox" checked={settings.usePose} onChange={(e) => setSettings({ ...settings, usePose: e.target.checked })} /></label>
        <label>Phone seconds <input type="number" min="0" value={settings.phoneSec} onChange={set('phoneSec')} /></label>
        <label>Looking-down seconds <input type="number" min="0" value={settings.downSec} onChange={set('downSec')} /></label>
        <label>Away seconds <input type="number" min="0" value={settings.awaySec} onChange={set('awaySec')} /></label>
        <label>Pitch margin ° <input type="number" min="0" value={settings.pitchMargin} onChange={set('pitchMargin')} /></label>
      </details>

      <CameraCheck videoRef={videoRef} listeners={listeners} />

      <ClipRecorder videoRef={videoRef} volume={settings.alarmVolume} />
    </div>
  );
}

// "Check camera position": 5 s with both hands on the desk, then advice (src/state/camera.ts).
function CameraCheck({ videoRef, listeners }: { videoRef: React.RefObject<HTMLVideoElement | null>; listeners: Set<(l: Live) => void> }) {
  const [state, setState] = useState<'idle' | 'running' | Advice[]>('idle');

  function run() {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 36;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const rows: { face: boolean; w: number; y: number; hands: boolean; lum: number; faceLum: number }[] = [];
    const f = (l: Live) => {
      ctx.drawImage(v, 0, 0, 64, 36);
      const px = ctx.getImageData(0, 0, 64, 36).data;
      const g = l.frame.faceGeo;
      let sum = 0, fsum = 0, fn = 0;
      for (let i = 0; i < 64 * 36; i++) {
        const lum = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
        sum += lum;
        const x = (i % 64) / 64, y = Math.floor(i / 64) / 36;
        if (g && x > Math.min(g.left.x, g.right.x) && x < Math.max(g.left.x, g.right.x) && y > g.top && y < g.chin) { fsum += lum; fn++; }
      }
      rows.push({ face: !!g, w: g?.width ?? 0, y: g ? (g.top + g.chin) / 2 : 0, hands: l.frame.hands.length > 0, lum: sum / (64 * 36), faceLum: fn ? fsum / fn : 0 });
    };
    listeners.add(f);
    setState('running');
    setTimeout(() => {
      listeners.delete(f);
      const faces = rows.filter((r) => r.face);
      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
      setState(cameraAdvice({
        faceShare: rows.length ? faces.length / rows.length : 0,
        faceWidth: avg(faces.map((r) => r.w)),
        faceY: avg(faces.map((r) => r.y)),
        handsShare: rows.length ? rows.filter((r) => r.hands).length / rows.length : 0,
        brightness: avg(rows.map((r) => r.lum)),
        faceBrightness: avg(faces.map((r) => r.faceLum)),
      }));
    }, 5000);
  }

  return (
    <fieldset className="clips">
      <legend>Camera position</legend>
      <button onClick={run} disabled={state === 'running'}>
        {state === 'running' ? 'Sit normally, both hands on the desk…' : 'Check camera position (5 s)'}
      </button>
      {Array.isArray(state) && (
        <ul className="advice">
          {state.map((a) => <li key={a.text} className={a.ok ? 'ok' : 'warn'}>{a.ok ? '✓' : '✗'} {a.text}</li>)}
        </ul>
      )}
    </fieldset>
  );
}

const MAX_CLIP_SEC = 30;

// Records a short labelled clip of the camera for `npm run replay`. Only runs when the
// button is pressed; the file stays in the clips folder on this computer.
function ClipRecorder({ videoRef, volume }: { videoRef: React.RefObject<HTMLVideoElement | null>; volume: number }) {
  const [label, setLabel] = useState(CLIP_LABELS[0].id);
  const [secs, setSecs] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [holdout, setHoldout] = useState(false);
  const [glasses, setGlasses] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  // Labels with an event (A2): countdown, a beep at EVENT_SEC ("do it now"), stop at MAX_CLIP_SEC.
  const event = CLIP_LABELS.find((l) => l.id === label)?.event;

  function start() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return setMsg('Camera is not ready yet.');
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 4_000_000 });
    const started = Date.now();
    let beeped = false;
    const tick = setInterval(() => {
      const s = (Date.now() - started) / 1000;
      setSecs(s);
      if (event && !beeped && s >= EVENT_SEC) { beeped = true; playCue(volume); }
      if (s >= MAX_CLIP_SEC) r.stop();
    }, 100);
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = async () => {
      clearInterval(tick);
      setSecs(null);
      // A clip stopped before the beep has no event in it: saved without the marker.
      const bytes = await new Blob(chunks, { type: 'video/webm' }).arrayBuffer();
      setMsg('Saved ' + (await bridge().saveClip(label, bytes, holdout, { ev: beeped ? EVENT_SEC : undefined, glasses })));
    };
    r.start(1000);
    rec.current = r;
    setMsg('');
  }

  const recording = secs !== null;
  return (
    <fieldset className="clips">
      <legend>Record test clip</legend>
      <select value={label} disabled={recording} onChange={(e) => setLabel(e.target.value)}>
        {CLIP_LABELS.map((l) => <option key={l.id} value={l.id}>{l.text}</option>)}
      </select>
      <label><input type="checkbox" checked={holdout} disabled={recording} onChange={(e) => setHoldout(e.target.checked)} /> Keep aside for the final test (never used for tuning or training)</label>
      <label><input type="checkbox" checked={glasses} disabled={recording} onChange={(e) => setGlasses(e.target.checked)} /> Glasses on</label>
      {event && <p className="note">Countdown clip: study normally; at the beep ({EVENT_SEC} s): {event.toLowerCase()}. Stops by itself at {MAX_CLIP_SEC} s.</p>}
      {recording && event && <p className="cue" aria-live="assertive">{secs < EVENT_SEC ? `Study normally… ${Math.ceil(EVENT_SEC - secs)}` : `${event} now!`}</p>}
      <div className="row">
        {recording
          ? <button onClick={() => rec.current?.stop()}>Stop ({secs.toFixed(0)} s)</button>
          : <button onClick={start}>Record ({event ? `${MAX_CLIP_SEC} s, countdown` : `20 s, max ${MAX_CLIP_SEC}`})</button>}
        <button onClick={() => bridge().openClipsFolder()}>Open clips folder</button>
      </div>
      {msg && <small>{msg}</small>}
      <small className="note">Clips show your face. They stay in the clips folder on this computer and are never uploaded.</small>
    </fieldset>
  );
}

// Draws what the models see over the (mirrored) preview: detector boxes (red = phone,
// blue = person), hands (green) and the zoomed hand crops (dashed). Text is un-mirrored.
export function drawBoxes(canvas: HTMLCanvasElement, video: HTMLVideoElement, live: Live, s: Settings) {
  const { frame } = live;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.lineWidth = 4;
  ctx.font = '600 22px system-ui';
  const label = (text: string, x: number, y: number, w: number) => {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.fillText(text, -(x + w), y > 26 ? y - 6 : y + 24);
    ctx.restore();
  };
  for (const b of frame.boxes) {
    const isPhone = b.label === 'cell phone';
    ctx.strokeStyle = ctx.fillStyle = isPhone ? (b.score >= s.phoneEnter ? '#ff3b30' : '#ff9f0a') : 'rgba(120,200,255,0.7)';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    label(`${isPhone ? 'phone' : 'person'} ${b.score.toFixed(2)}`, b.x, b.y, b.w);
  }
  for (const h of frame.hands) {
    const r = handRect(h.pts, frame.W, frame.H);
    ctx.strokeStyle = ctx.fillStyle = '#34c759';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    const kind = heldObject(h.top, s.objectMinScore, s.emptyMin).kind;
    if (kind !== 'unknown') label(KIND_TEXT[kind], r.x, r.y + r.h + 30, r.w);
    const c = cropRect(h.pts, frame.W, frame.H, s.handPad);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(52,199,89,0.6)';
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.setLineDash([]);
  }
  for (const b of frame.crops) {
    ctx.strokeStyle = ctx.fillStyle = b.score >= s.phoneEnter ? '#ff3b30' : '#ff9f0a';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    label(`phone (zoom) ${b.score.toFixed(2)}`, b.x, b.y, b.w);
  }
}

export function useBoxes(live: Live | null, video: React.RefObject<HTMLVideoElement | null>, s: Settings) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (live && canvas.current && video.current) drawBoxes(canvas.current, video.current, live, s);
  }, [live]);
  return canvas;
}