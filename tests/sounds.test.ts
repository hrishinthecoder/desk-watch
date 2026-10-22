import { beforeAll, describe, expect, it } from 'vitest';

// A stand-in for Web Audio that records each tone and its loudest gain (vitest has no AudioContext).
const tones: { freq: number; type: string; peak: number }[] = [];
beforeAll(() => {
  class FakeContext {
    currentTime = 0;
    destination = {};
    createOscillator() {
      const o = { type: '', frequency: { setValueAtTime: (f: number) => { tone.freq = f; }, linearRampToValueAtTime() {} }, connect: (g: unknown) => g, start() {}, stop() {} };
      const tone = { freq: 0, type: '', peak: 0 };
      tones.push(tone);
      return new Proxy(o, { set: (t, k, v) => { if (k === 'type') tone.type = v; (t as Record<string, unknown>)[k as string] = v; return true; } });
    }
    createGain() {
      const tone = tones.at(-1)!;
      const set = (v: number) => { tone.peak = Math.max(tone.peak, v); };
      return { gain: { setValueAtTime: set, exponentialRampToValueAtTime: set }, connect: () => ({}) };
    }
  }
  (globalThis as { AudioContext?: unknown }).AudioContext = FakeContext;
});

describe('calibration finished sound', () => {
  it('two soft sine tones, quieter than the alarm at the same volume; nothing when muted', async () => {
    const { playAlarm, playDone } = await import('../src/session/sounds');
    tones.length = 0;
    playDone(0);
    expect(tones).toHaveLength(0);

    playDone(0.8);
    expect(tones.map((t) => t.type)).toEqual(['sine', 'sine']);
    const done = Math.max(...tones.map((t) => t.peak));
    expect(done).toBeCloseTo(0.2);

    tones.length = 0;
    playAlarm('beep', 0.8);
    expect(done).toBeLessThan(Math.max(...tones.map((t) => t.peak)));

    tones.length = 0;
    playDone(5); // a damaged setting never plays louder than full volume
    expect(Math.max(...tones.map((t) => t.peak))).toBeCloseTo(0.25);
  });
  it('the "switch now" beep between parts: one soft sine tone, nothing when muted', async () => {
    const { playStep } = await import('../src/session/sounds');
    tones.length = 0;
    playStep(0);
    expect(tones).toHaveLength(0);
    playStep(0.8);
    expect(tones.map((t) => t.type)).toEqual(['sine']);
    expect(tones[0].peak).toBeCloseTo(0.2);
  });
});
