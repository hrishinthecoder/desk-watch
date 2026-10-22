import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../src/state/config';
import { boxAtEar, createPhoneSignals, cropRect, handAtEar, handRect, heldObject, type FaceGeo, type Hand, type PhoneBox, type PhoneInput } from '../src/state/phone';

const W = 1280, H = 720;
// 21 fake landmarks filling a square of side `s` (normalised) centred on (cx, cy)
const hand = (cx: number, cy: number, s = 0.08): Hand => ({
  pts: Array.from({ length: 21 }, (_, i) => ({ x: cx - s / 2 + (s * (i % 5)) / 4, y: cy - s / 2 + (s * Math.floor(i / 5)) / 4 })),
});
// face centred at x 0.5: ears at 0.42 / 0.58, forehead 0.2, chin 0.5
const FACE: FaceGeo = { left: { x: 0.42, y: 0.38 }, right: { x: 0.58, y: 0.38 }, top: 0.2, chin: 0.5, width: 0.16 };
const box = (cx: number, cy: number, w: number, h: number, score: number): PhoneBox => ({ x: cx * W - w / 2, y: cy * H - h / 2, w, h, score });
const input = (p: Partial<PhoneInput>): PhoneInput => ({ t: 0, W, H, fullPhones: [], cropPhones: [], hands: [], face: FACE, ...p });
// The optional signals, switched on, for testing them (both are off by default).
const ALL_ON = { ...DEFAULTS, cropsForPhone: true, usePose: true };

describe('hand crop geometry', () => {
  it('is a square, handPad times the hand size, centred on the hand', () => {
    const h = hand(0.5, 0.5, 0.1);
    const r = handRect(h.pts, W, H);
    const c = cropRect(h.pts, W, H, 2.5);
    expect(c.w).toBe(c.h);
    expect(c.w).toBeCloseTo(Math.max(r.w, r.h) * 2.5, -1);
    expect(c.x + c.w / 2).toBeCloseTo(r.x + r.w / 2, -1);
  });
  it('stays inside the frame at the edges', () => {
    const c = cropRect(hand(0.02, 0.97, 0.1).pts, W, H, 2.5);
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.y + c.h).toBeLessThanOrEqual(H);
  });
  it('never gets bigger than the frame', () => {
    const c = cropRect(hand(0.5, 0.5, 0.6).pts, W, H, 2.5);
    expect(c.h).toBeLessThanOrEqual(H);
    expect(c.y).toBe(0);
  });
});

describe('phone evidence', () => {
  it('counts a full-frame phone touching a hand', () => {
    const s = createPhoneSignals()(input({ hands: [hand(0.5, 0.75)], fullPhones: [box(0.5, 0.7, 80, 150, 0.6)] }), DEFAULTS);
    expect(s.inHand).toBeCloseTo(0.6);
    expect(s.phone).toBeCloseTo(0.6);
  });
  it('ignores a full-frame phone far from every hand (lying on the desk)', () => {
    const s = createPhoneSignals()(input({ hands: [hand(0.2, 0.6)], fullPhones: [box(0.85, 0.9, 140, 60, 0.6)] }), DEFAULTS);
    expect(s.phone).toBe(0);
  });
  it('with no hand visible, counts an upright phone but not a flat one', () => {
    const upright = createPhoneSignals()(input({ fullPhones: [box(0.5, 0.6, 80, 150, 0.6)] }), DEFAULTS);
    const flat = createPhoneSignals()(input({ fullPhones: [box(0.5, 0.9, 150, 60, 0.6)] }), DEFAULTS);
    expect(upright.phone).toBeCloseTo(0.6);
    expect(flat.phone).toBe(0);
  });
  it('with cropsForPhone off, the hand-crop score does not count as phone evidence', () => {
    const s = createPhoneSignals()(input({ hands: [hand(0.5, 0.7)], fullPhones: [box(0.5, 0.7, 80, 150, 0.2)], cropPhones: [box(0.5, 0.7, 80, 150, 0.55)] }), { ...DEFAULTS, cropsForPhone: false });
    expect(s.crop).toBeCloseTo(0.55);
    expect(s.phone).toBeCloseTo(0.2);
  });
  it('by default (cropsForPhone on), uses the hand-crop score when it is higher (phone seen from the back)', () => {
    const s = createPhoneSignals()(input({ hands: [hand(0.5, 0.7)], fullPhones: [box(0.5, 0.7, 80, 150, 0.2)], cropPhones: [box(0.5, 0.7, 80, 150, 0.55)] }), ALL_ON);
    expect(s.phone).toBeCloseTo(0.55);
  });
  it('with usePose on, a raised hand held still with a weak phone in its crop counts as a phone', () => {
    const sig = createPhoneSignals();
    let last;
    for (let t = 0; t <= 2400; t += 200) last = sig(input({ t, hands: [hand(0.5, 0.45)], cropPhones: [box(0.5, 0.45, 80, 150, 0.18)] }), ALL_ON);
    expect(last!.pose).toBe(true);
    expect(last!.phone).toBe(ALL_ON.phoneEnter);
  });
  it('with usePose off (default), the same pose adds nothing', () => {
    const sig = createPhoneSignals();
    let last;
    for (let t = 0; t <= 2400; t += 200) last = sig(input({ t, hands: [hand(0.5, 0.45)], cropPhones: [box(0.5, 0.45, 80, 150, 0.18)] }), DEFAULTS);
    expect(last!.phone).toBeCloseTo(0.18); // just the weak crop score, not lifted to phoneEnter
  });
  it('a still raised hand with nothing phone-like in it does not count (pen, cup)', () => {
    const sig = createPhoneSignals();
    let last;
    for (let t = 0; t <= 2400; t += 200) last = sig(input({ t, hands: [hand(0.5, 0.45)] }), ALL_ON);
    expect(last!.pose).toBe(true);
    expect(last!.phone).toBe(0);
  });
  it('a moving hand is not a "still" pose', () => {
    const sig = createPhoneSignals();
    let last;
    for (let t = 0; t <= 2400; t += 200) last = sig(input({ t, hands: [hand(0.3 + t / 10000, 0.45)], cropPhones: [box(0.5, 0.45, 80, 150, 0.18)] }), DEFAULTS);
    expect(last!.pose).toBe(false);
  });
  it('a hand resting low on the desk is not "raised"', () => {
    const sig = createPhoneSignals();
    let last;
    for (let t = 0; t <= 2400; t += 200) last = sig(input({ t, hands: [hand(0.5, 0.95)], cropPhones: [box(0.5, 0.95, 80, 60, 0.18)] }), DEFAULTS);
    expect(last!.pose).toBe(false);
  });
});

describe('what is in the hand (image classifier)', () => {
  it('maps ImageNet labels to desk objects, best desk label first', () => {
    expect(heldObject([['harmonica', 0.3], ['cellular telephone', 0.2]], 0.05).kind).toBe('phone');
    expect(heldObject([['hand-held computer', 0.4], ['cellular telephone', 0.1]], 0.05).kind).toBe('device');
    expect(heldObject([['fountain pen', 0.5]], 0.05).kind).toBe('pen');
    expect(heldObject([['book jacket', 0.03]], 0.05).kind).toBe('unknown'); // not confident enough
    expect(heldObject(undefined, 0.05).kind).toBe('unknown');
  });
  it('a phone-looking box in a hand the classifier calls a calculator/device does not count', () => {
    const calc = { ...hand(0.5, 0.75), top: [['hand-held computer', 0.4], ['cellular telephone', 0.2]] as [string, number][] };
    const s = createPhoneSignals()(input({ hands: [calc], fullPhones: [box(0.5, 0.7, 80, 150, 0.6)] }), DEFAULTS);
    expect(s.phone).toBe(0);
    expect(s.held).toBe('device');
  });
  it('your own trained model: "calculator" and "pen" veto a phone box, "none" names nothing', () => {
    expect(heldObject([['calculator', 0.9]], 0.05).kind).toBe('calculator');
    expect(heldObject([['none', 0.9], ['phone', 0.06]], 0.05).kind).toBe('unknown');
    expect(heldObject([['phone', 0.6], ['none', 0.3]], 0.05).kind).toBe('phone');
    for (const k of ['calculator', 'pen']) {
      const h = { ...hand(0.5, 0.75), top: [[k, 0.8]] as [string, number][] };
      expect(createPhoneSignals()(input({ hands: [h], fullPhones: [box(0.5, 0.7, 80, 150, 0.6)] }), DEFAULTS).phone).toBe(0);
    }
  });
  it('the same box in a hand the classifier calls a phone counts', () => {
    const ph = { ...hand(0.5, 0.75), top: [['cellular telephone', 0.6]] as [string, number][] };
    const s = createPhoneSignals()(input({ hands: [ph], fullPhones: [box(0.5, 0.7, 80, 150, 0.6)] }), DEFAULTS);
    expect(s.phone).toBeCloseTo(0.6);
    expect(s.held).toBe('phone');
  });
});

describe('phone call (hand at ear)', () => {
  it('a hand beside an ear is a call', () => {
    expect(handAtEar(hand(0.36, 0.42), FACE, DEFAULTS.earReach, W, H)).toBe(true);
    // geometry only: phone evidence at the hand switched off (by default a bare hand is not enough)
    expect(createPhoneSignals()(input({ hands: [hand(0.62, 0.36)] }), { ...DEFAULTS, callBoxMin: 0 }).call).toBe(true);
    expect(createPhoneSignals()(input({ hands: [hand(0.62, 0.36)] }), DEFAULTS).call).toBe(false);
  });
  it('with callBoxMin, a bare hand on the head is not a call; the same hand with a phone (box or object model) is', () => {
    const cfg = { ...DEFAULTS, callBoxMin: 0.25, objectVeto: false };
    const at = hand(0.62, 0.36);
    expect(createPhoneSignals()(input({ hands: [at] }), cfg).call).toBe(false);
    expect(createPhoneSignals()(input({ hands: [at], cropPhones: [box(0.62, 0.36, 60, 120, 0.3)] }), cfg).call).toBe(true);
    expect(createPhoneSignals()(input({ hands: [at], cropPhones: [box(0.62, 0.36, 60, 120, 0.15)] }), cfg).call).toBe(false); // weaker than callBoxMin and phoneExit
    expect(createPhoneSignals()(input({ hands: [{ ...at, top: [['phone', 0.9]] }] }), cfg).call).toBe(true);
  });
  it('a hand the object model is sure is empty ignores phone boxes in it (hand on head, live bug); unsure = not ignored', () => {
    const at = hand(0.62, 0.36);
    const b = box(0.62, 0.36, 60, 120, 0.6);
    expect(createPhoneSignals()(input({ hands: [{ ...at, top: [['none', 0.95]] }], cropPhones: [b] }), DEFAULTS).call).toBe(false);
    expect(createPhoneSignals()(input({ hands: [{ ...at, top: [['none', 0.5], ['phone', 0.4]] }], cropPhones: [b] }), DEFAULTS).call).toBe(true);
    expect(heldObject([['none', 0.95]], 0.05, 0.8).kind).toBe('empty');
    expect(heldObject([['none', 0.95]], 0.05, 0).kind).toBe('unknown');
  });
  it('the palm can sit below the ear as long as a finger reaches it (real clip geometry)', () => {
    // centre about 1 face-width below the ear, fingers reaching up to it
    expect(handAtEar(hand(0.63, 0.50, 0.24), FACE, DEFAULTS.earReach, W, H)).toBe(true);
  });
  it('a phone box touching an ear, beside the face, is a call', () => {
    expect(boxAtEar(box(0.62, 0.42, 60, 130, 0.4), FACE, DEFAULTS.earReach, W, H)).toBe(true);
    expect(boxAtEar(box(0.5, 0.7, 60, 130, 0.4), FACE, DEFAULTS.earReach, W, H)).toBe(false);
  });
  it('a calculator held up beside the chest is not a call even if its box reaches ear height (live bug)', () => {
    // centre well below the ear; top edge (0.6 - 0.21) at ear height 0.38
    expect(boxAtEar(box(0.62, 0.6, 140, 300, 0.53), FACE, DEFAULTS.earBoxReach, W, H)).toBe(false);
    expect(createPhoneSignals()(input({ hands: [hand(0.62, 0.62, 0.1)], cropPhones: [box(0.62, 0.6, 140, 300, 0.53)] }), DEFAULTS).call).toBe(false);
  });
  it('a hand in front of the chin, on the cheek or on the desk is not', () => {
    expect(createPhoneSignals()(input({ hands: [hand(0.5, 0.6)] }), DEFAULTS).call).toBe(false);
    expect(createPhoneSignals()(input({ hands: [hand(0.53, 0.42)] }), DEFAULTS).call).toBe(false);
    expect(createPhoneSignals()(input({ hands: [hand(0.5, 0.9)] }), DEFAULTS).call).toBe(false);
  });
  it('a phone found in a hand crop at the ear is a call even with cropsForPhone off', () => {
    expect(createPhoneSignals()(input({ cropPhones: [box(0.62, 0.42, 60, 130, 0.4)] }), DEFAULTS).call).toBe(true);
  });
  it('a calculator held against the cheek is not a call (object veto, live bug)', () => {
    const calc = { ...hand(0.62, 0.42), top: [['hand-held computer', 0.41]] as [string, number][] };
    expect(createPhoneSignals()(input({ hands: [calc], cropPhones: [box(0.62, 0.4, 60, 130, 0.72)] }), DEFAULTS).call).toBe(false);
  });
  it('a hand only just outside the face line (pen against the cheek) is not a call', () => {
    // centre 0.59: past the ear line 0.58, but less than earSide (0.1 x 0.16 = 0.016) beyond it
    expect(handAtEar(hand(0.59, 0.42), FACE, DEFAULTS.earReach, W, H, DEFAULTS.earSide)).toBe(false);
    expect(handAtEar(hand(0.63, 0.42), FACE, DEFAULTS.earReach, W, H, DEFAULTS.earSide)).toBe(true);
  });
  it('needs a face to know where the ears are', () => {
    expect(createPhoneSignals()(input({ hands: [hand(0.62, 0.36)], face: null }), DEFAULTS).call).toBe(false);
  });
});
