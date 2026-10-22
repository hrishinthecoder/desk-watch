import { tk } from '../../electron/i18n';
// Background noise for Focus mode (E4 Part 2): white, pink or brown noise made with Web Audio. No sound files,
// nothing downloaded. A few seconds of noise are generated once and played in a loop.
export type Noise = 'white' | 'pink' | 'brown';
export const NOISES: [Noise | 'off', string][] = [['off', tk('Off')], ['white', tk('White')], ['pink', tk('Pink')], ['brown', tk('Brown')]]; // shown with t()

// The samples (pure, tested). Pink: Paul Kellet's filter; brown: integrated white noise. The loop is made seamless
// (brown drifts, so its slope is removed so the last sample meets the first), then scaled to peak at 0.9.
export function noiseSamples(kind: Noise, n: number, rand: () => number = Math.random): Float32Array {
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const w = rand() * 2 - 1;
    if (kind === 'white') out[i] = w;
    else if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    } else out[i] = last = (last + 0.02 * w) / 1.02;
  }
  const step = (out[n - 1] - out[0]) / Math.max(1, n - 1);
  if (kind === 'brown') for (let i = 0; i < n; i++) out[i] -= step * i;
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] *= 0.9 / peak;
  return out;
}

// Plays one kind of noise until stop(). Volume 0-1 (kept quiet: at most 0.5 of full scale).
export function playNoise(kind: Noise, volume: number) {
  const ctx = new AudioContext();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 8, ctx.sampleRate);
  buf.copyToChannel(noiseSamples(kind, buf.length) as Float32Array<ArrayBuffer>, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = volume * 0.5;
  src.connect(gain).connect(ctx.destination);
  src.start();
  return {
    setVolume: (v: number) => gain.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05),
    stop: () => { src.stop(); ctx.close(); },
  };
}
