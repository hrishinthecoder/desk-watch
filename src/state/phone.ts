// Pure phone evidence: combines the full-frame detector, the hand-crop detector, hand
// pose and face position into one 0-1 "phone" number and a "call" flag per check.
// No camera, no models, so everything here is unit-tested (tests/phone.test.ts).
// Head pitch is NOT used here: phone detection must not depend on where you look.
import type { Config } from './config';

export type Pt = { x: number; y: number };                 // normalised 0-1
export type Rect = { x: number; y: number; w: number; h: number }; // pixels
// 21 hand landmarks, plus the image classifier's top guesses for what the hand holds
// (ImageNet labels, best first), when the hand worker ran it.
export type Hand = { pts: Pt[]; top?: [string, number][] };

// What is in the hand. Two possible classifiers: your own trained model (labels phone, pen,
// calculator, book, none) or the generic ImageNet one (1000 labels; these are the ones that
// matter at a desk; it has no "calculator", so calculators land on the "device" labels).
export type ObjectKind = 'phone' | 'pen' | 'calculator' | 'book' | 'device' | 'empty' | 'unknown';
const KINDS: Record<string, ObjectKind> = {
  phone: 'phone', pen: 'pen', calculator: 'calculator', book: 'book', // own model ("none" -> unknown)
  'cellular telephone': 'phone',
  ballpoint: 'pen', 'fountain pen': 'pen',
  'book jacket': 'book', 'comic book': 'book',
  'remote control': 'device', 'hand-held computer': 'device', abacus: 'device',
};
export const KIND_TEXT: Record<ObjectKind, string> = { phone: 'phone', pen: 'pen', calculator: 'calculator', book: 'book', device: 'calculator or other device', empty: 'nothing', unknown: '—' };
const NOT_PHONE: ObjectKind[] = ['pen', 'calculator', 'book', 'device', 'empty'];

// Best desk-relevant guess among the classifier's top labels, if it is confident enough.
// Own model only: "none" first means an empty hand. At or above emptyMin it counts as 'empty'
// (vetoes phone boxes in that hand, e.g. a hand resting on the head); below, 'unknown'.
export function heldObject(top: [string, number][] | undefined, minScore: number, emptyMin = 0): { kind: ObjectKind; score: number } {
  for (const [label, score] of top ?? []) {
    if (label === 'none') return { kind: emptyMin > 0 && score >= emptyMin ? 'empty' : 'unknown', score };
    const kind = KINDS[label];
    if (kind && score >= minScore) return { kind, score };
  }
  return { kind: 'unknown', score: 0 };
}
export type FaceGeo = { left: Pt; right: Pt; top: number; chin: number; width: number }; // normalised
export type PhoneBox = Rect & { score: number };

export type PhoneInput = {
  t: number;
  W: number; H: number;   // frame size in pixels
  fullPhones: PhoneBox[]; // full-frame detector "cell phone" boxes
  cropPhones: PhoneBox[]; // hand-crop detector "cell phone" boxes, in frame pixels
  hands: Hand[];
  face: FaceGeo | null;
};

export type PhoneSignals = {
  phone: number;    // 0-1 evidence used by the PHONE rule
  inHand: number;   // best full-frame phone near a hand
  crop: number;     // best phone found in a hand crop
  pose: boolean;    // raised, still hand
  call: boolean;    // hand (or phone) at an ear
  held: ObjectKind; // what the classifier thinks is in a hand (for the screen)
};

const centre = (pts: Pt[]) => ({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length });

export function handRect(pts: Pt[], W: number, H: number): Rect {
  const xs = pts.map((p) => p.x * W), ys = pts.map((p) => p.y * H);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// Square crop around a hand, `pad` times the hand's larger side (a phone sticks out past
// the fingers), kept inside the frame. Used by the hand worker to zoom in on held objects.
export function cropRect(pts: Pt[], W: number, H: number, pad: number): Rect {
  const r = handRect(pts, W, H);
  const side = Math.min(Math.max(r.w, r.h) * pad, W, H);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const x = Math.min(Math.max(cx - side / 2, 0), W - side);
  const y = Math.min(Math.max(cy - side / 2, 0), H - side);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(side), h: Math.round(side) };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Grow a rect by `k` of its size on every side.
const grow = (r: Rect, k: number): Rect => ({ x: r.x - r.w * k, y: r.y - r.h * k, w: r.w * (1 + 2 * k), h: r.h * (1 + 2 * k) });

const ears = (f: FaceGeo) => (f.left.x < f.right.x ? [f.left, f.right] : [f.right, f.left]);

// Hand held to an ear: some finger point within `reach` face-widths of an ear, and the
// hand's centre out beside the face (holding a phone to the ear puts the palm below and
// beside the ear). A hand on the cheek or chin, in front of the face, does not count.
// From the test clips: a phone at the ear puts a finger ~0.1-0.3 face-widths from the ear.
// `side`: how far (in face-widths) past the ear line the hand centre must be. A pen held
// against the cheek has its hand centre only just outside the face; a phone at the ear
// puts it clearly beside the head.
export function handAtEar(h: Hand, face: FaceGeo, reach: number, W: number, H: number, side = 0): boolean {
  const [lo, hi] = ears(face);
  const c = centre(h.pts);
  const dist = (p: Pt, e: Pt) => Math.hypot(p.x - e.x, ((p.y - e.y) * H) / W) / face.width;
  const beside = c.x < lo.x - side * face.width || c.x > hi.x + side * face.width;
  return beside && h.pts.some((p) => dist(p, lo) < reach || dist(p, hi) < reach);
}

// A detected phone held to an ear: the box CENTRE within `reach` face-widths of an ear, and
// beside the face. (Measuring from the box edge let a calculator held up in front of the
// chest count, because its box reached ear height. From the test clips: phones at the ear
// sit 0.3-0.6 face-widths away; a phone or calculator held up in front, 0.8-1.4.)
export function boxAtEar(b: Rect, face: FaceGeo, reach: number, W: number, H: number): boolean {
  const [lo, hi] = ears(face);
  const c = { x: (b.x + b.w / 2) / W, y: (b.y + b.h / 2) / H };
  const dist = (e: Pt) => Math.hypot(c.x - e.x, ((c.y - e.y) * H) / W) / face.width;
  return (c.x < lo.x || c.x > hi.x) && (dist(lo) < reach || dist(hi) < reach);
}

// Stateful because "held still" needs a few seconds of history.
export function createPhoneSignals() {
  let history: { t: number; c: Pt[] }[] = [];

  return function signals(i: PhoneInput, cfg: Config): PhoneSignals {
    const handRects = i.hands.map((h) => grow(handRect(h.pts, i.W, i.H), 0.5));

    // "Only in hand": a full-frame phone counts if it touches a hand. If no hand is visible
    // (the phone can hide it), only an upright (portrait) phone counts; a phone lying flat
    // on the desk looks wide and short to the camera, so it is ignored.
    // Object veto: if the classifier says the hand holding it is a calculator/other device
    // or a book, a phone-looking box there does not count.
    const kinds = i.hands.map((h) => heldObject(h.top, cfg.objectMinScore, cfg.emptyMin).kind);
    const notPhone = (k: number) => cfg.objectVeto && NOT_PHONE.includes(kinds[k]);
    const vetoed = (b: Rect) => handRects.some((r, k) => overlaps(r, b) && notPhone(k));
    const inHand = Math.max(0, ...i.fullPhones
      .filter((b) => (handRects.length ? handRects.some((r) => overlaps(r, b)) && !vetoed(b) : b.h >= 1.2 * b.w))
      .map((b) => b.score));
    const cropPhones = i.cropPhones.filter((b) => !vetoed(b));
    const crop = Math.max(0, ...cropPhones.map((b) => b.score));

    // Pose: a raised hand (at or above chin height, where you hold a phone to look at it)
    // held still for poseStillSec. Hands resting on the desk or in the lap are never "raised".
    const centres = i.hands.map((h) => centre(h.pts));
    history.push({ t: i.t, c: centres });
    history = history.filter((h) => i.t - h.t <= cfg.poseStillSec * 1000);
    const raisedLine = i.face ? i.face.chin : 0.5;
    const covered = history.length > 1 && i.t - history[0].t >= cfg.poseStillSec * 1000 - 250;
    const pose = covered && centres.some((c) =>
      c.y < raisedLine && history.every((h) => h.c.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < cfg.poseStillMove)));

    let phone = cfg.cropsForPhone ? Math.max(inHand, crop) : inHand;
    if (cfg.usePose && pose && crop >= cfg.poseMinPhone) phone = Math.max(phone, cfg.phoneEnter);

    const face = i.face;
    // The object veto applies here too: a calculator held against the cheek is not a call.
    // A hand at the ear alone can be a hand resting on the head; with callBoxMin > 0 it also needs
    // phone evidence at that hand: a phone box touching it, or the object model naming a phone.
    const phoneAt = (k: number) => cfg.callBoxMin <= 0 || kinds[k] === 'phone' ||
      [...i.fullPhones, ...cropPhones].some((b) => b.score >= cfg.callBoxMin && overlaps(handRects[k], b));
    const call = face !== null && (
      i.hands.some((h, k) => !notPhone(k) && phoneAt(k) && handAtEar(h, face, cfg.earReach, i.W, i.H, cfg.earSide)) ||
      [...i.fullPhones, ...cropPhones].some((b) => b.score >= cfg.phoneExit && !vetoed(b) && boxAtEar(b, face, cfg.earBoxReach, i.W, i.H)));

    const held = kinds.find((k) => k === 'phone') ?? kinds.find((k) => k !== 'unknown') ?? 'unknown';
    return { phone, inHand, crop, pose, call, held };
  };
}
