// The whole rule chain for one check, from model outputs to state and activity. Pure, so the
// live app, the clip replay and the offline scripts (scripts/*.mjs) all run exactly this.
import { activityOf, createActivity, createFeatures, eyesLevel, type Activity, type Features, type Shapes } from './activities';
import { createClassifier, type Status } from './classifier';
import { pitchLimit, type Config } from './config';
import { createPhoneSignals, type PhoneInput, type PhoneSignals } from './phone';

export type CheckInput = PhoneInput & { person: boolean; pitch: number | null; yaw: number | null; shapes: Shapes | null };

export type Rules = {
  step: ReturnType<typeof createClassifier>;
  phone: ReturnType<typeof createPhoneSignals>;
  features: ReturnType<typeof createFeatures>;
  activity: ReturnType<typeof createActivity>;
};
export const createRules = (): Rules => ({ step: createClassifier(), phone: createPhoneSignals(), features: createFeatures(), activity: createActivity() });

// Head angle where "phone in lap" starts, if your eyes stay level.
export const lapPitch = (s: Config) => (s.calibratedPitch ?? s.defaultPitchLimit - s.pitchMargin) + s.lapMargin;

export type Outcome = { signals: PhoneSignals; status: Status; features: Features; activity: { activity: Activity; confidence: number } };

export function rulesOnInput(i: CheckInput, rules: Rules, s: Config): Outcome {
  const signals = rules.phone(i, s);
  const features = rules.features(i);
  const activity = rules.activity(i.t, activityOf(features, s, s.activityCal));
  // Head down = bent far past your reading angle (as before), or bent a little past it with
  // your eyes level. No face found: null, the classifier then counts it as head down.
  const down = i.pitch === null ? null : i.pitch > pitchLimit(s) || (i.pitch > lapPitch(s) && eyesLevel(features, s));
  const status = rules.step(
    { t: i.t, person: i.person, phone: signals.phone, call: signals.call, pitch: i.pitch, down, lookAway: activity.activity === 'LOOKING_AWAY',
      lids: i.shapes ? Math.min(i.shapes.eyeBlinkLeft, i.shapes.eyeBlinkRight) : null, // both eyes closed = the less closed one
      hands: i.hands.length },
    { ...s, pitchLimit: pitchLimit(s) },
  );
  return { signals, status, features, activity };
}
