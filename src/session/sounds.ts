import { tk } from '../../electron/i18n';
// Alarm and goal sounds, generated with Web Audio (no sound files). Each alarm call plays
// about one second; the session repeats it until you are back.
import type { AlarmSound } from '../state/config';

let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());

function tone(freq: number, at: number, dur: number, volume: number, type: OscillatorType, toFreq = freq) {
  const c = ac(), o = c.createOscillator(), g = c.createGain();
  const t = c.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.linearRampToValueAtTime(toFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t + 0.01);
  g.gain.setValueAtTime(Math.max(0.0001, volume), t + dur - 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const ALARM_SOUNDS: Record<AlarmSound, string> = { beep: tk('Beeping'), siren: tk('Siren'), chime: tk('Loud chime') }; // shown with t()

export function playAlarm(kind: AlarmSound, volume: number) {
  const v = Math.min(1, Math.max(0, volume)) * 0.5; // square/saw waves are loud; 0.5 keeps 100% from clipping
  if (kind === 'beep') for (let i = 0; i < 4; i++) tone(1760, i * 0.22, 0.12, v, 'square');
  if (kind === 'siren') { tone(600, 0, 0.5, v, 'sawtooth', 1400); tone(1400, 0.5, 0.5, v, 'sawtooth', 600); }
  if (kind === 'chime') [988, 784, 988, 784].forEach((f, i) => tone(f, i * 0.25, 0.24, v * 1.6, 'triangle'));
}

export function playGoal(volume: number) {
  const v = Math.min(1, Math.max(0, volume)) * 0.6;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.15, i === 3 ? 0.6 : 0.16, v, 'triangle'));
}

// Calibration: one soft beep when a 10 s part ends ("switch now")...
export function playStep(volume: number) {
  const v = Math.min(1, Math.max(0, volume)) * 0.25;
  if (!v) return;
  tone(784, 0, 0.2, v, 'sine');
}

// ...and two soft, falling tones when it is all over. Much quieter than the alarms. Uses the alarm volume; 0 = silent.
export function playDone(volume: number) {
  const v = Math.min(1, Math.max(0, volume)) * 0.25;
  if (!v) return;
  tone(660, 0, 0.18, v, 'sine');
  tone(523, 0.2, 0.4, v, 'sine');
}

// Recorder cue (A2 clips): two short rising beeps that mean "do it now".
export function playCue(volume: number) {
  const v = Math.min(1, Math.max(0, volume)) * 0.6;
  tone(880, 0, 0.15, v, 'sine');
  tone(1320, 0.18, 0.3, v, 'sine');
}
