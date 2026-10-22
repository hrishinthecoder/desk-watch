// `npm run replay`: plays every recorded test clip, in real time, through the same engine
// and rules as the live camera, then prints accuracy per label.
import { bridge } from './bridge';
import { alarmBefore, checkCorrect, CLIP_LABELS, eventSecOf, isHoldout, LEAVE_SEC, scoredState, secondsToAlarm, type Expect } from './detection/clips';
import { checkInput, createEngine, createRules, runCheck, type CheckInput, type Engine } from './detection/engine';
import { checksPerSec, type PowerLevel } from './state/power';
import { rulesOnInput } from './state/rules';
import { loadSettings, type Config } from './state/config';
import { cropRect, handRect, overlaps, type Hand } from './state/phone';

type ClipResult = {
  label: string; name: string; expect: Expect; secs: number; checks: number; scored: number;
  correct: number; phoneEvidence: number; detectorRuns: number; handRuns: number; states: Record<string, number>;
  falsePhoneBoxes: { x: number; y: number; w: number; h: number; score: number }[];
  // per check: seconds, evidence, full-frame best, near-hand, crop, hands, pose, call, pitch, state
  trace: (string | number | null)[][];
  inputs: (CheckInput & { sec: number })[]; // raw model outputs per check, for scripts/tune.mjs
  // After the beep: the highest person-box score, and what made the app think someone was there (EMPTY clips).
  maxPerson: number; seenBy: { face: number; person: number; hands: number };
};

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) + '%' : '—');
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

export async function runReplay() {
  const b = bridge();
  // Short rule times so that 15-20 s clips can reach the state they show.
  // Detection itself is identical to the live app; only the waiting time is shorter.
  const settings: Config = { ...loadSettings(), phoneSec: 4, callSec: 4, downSec: 5, awaySec: 5, headDownSec: 10 };
  const only = new URLSearchParams(location.search).get('label');
  const clips = (await b.listClips()).filter((c) => !only || c.label === only);
  if (!clips.length) return b.replayResult('No clips found. Record some in the debug screen first.', '[]');

  // `npm run replay -- power=lighter` (or fewer) measures a low-power level (Stage E3), at that level's checks a second.
  const power = (new URLSearchParams(location.search).get('power') ?? 'full') as PowerLevel;
  settings.checksPerSec = checksPerSec(power, settings.checksPerSec);
  const engine = await createEngine((m) => b.replayProgress('ERROR ' + m), power);
  const results: ClipResult[] = [];
  for (const c of clips) {
    const expect = CLIP_LABELS.find((l) => l.id === c.label)?.expect;
    if (!expect) continue;
    const r = await replayClip(engine, c.label, c.name, expect, settings);
    results.push(r);
    b.replayProgress(`${pad(c.label, 16)} ${pad(c.name, 30)} correct ${pad(pct(r.correct, r.scored), 5)} phone-evidence ${pad(pct(r.phoneEvidence, r.scored), 5)} ${JSON.stringify(r.states)}`);
  }

  const crop = new URLSearchParams(location.search).get('crop') ?? 'lite0-cpu';
  const lines = ['', `REPLAY  (rules: phone ${settings.phoneSec} s, call ${settings.callSec} s, down ${settings.downSec} s; detector ${engine.delegate}; hand crops ${crop}; power ${engine.level}, ${settings.checksPerSec} checks/s)`];
  // Tuning clips and kept-aside clips are scored separately: only the kept-aside score is fair.
  for (const [title, set] of [['TUNING CLIPS', results.filter((r) => !isHoldout(r.name))], ['KEPT-ASIDE CLIPS (fair test)', results.filter((r) => isHoldout(r.name))]] as const) {
    if (!set.length) continue;
    lines.push('', title, `${pad('label', 16)}${pad('clips', 7)}${pad('secs', 7)}${pad('correct', 9)}${pad('phone-evid', 12)}${pad('checks/s', 10)}${pad('phone-model/s', 15)}hand-model/s`);
    for (const l of CLIP_LABELS) {
      const rs = set.filter((r) => r.label === l.id);
      if (!rs.length) continue;
      const sum = (f: (r: ClipResult) => number) => rs.reduce((a, r) => a + f(r), 0);
      const secs = sum((r) => r.secs);
      lines.push(`${pad(l.id, 16)}${pad(rs.length, 7)}${pad(secs.toFixed(0), 7)}${pad(pct(sum((r) => r.correct), sum((r) => r.scored)), 9)}` +
        `${pad(pct(sum((r) => r.phoneEvidence), sum((r) => r.scored)), 12)}${pad((sum((r) => r.checks) / secs).toFixed(1), 10)}` +
        `${pad((sum((r) => r.detectorRuns) / secs).toFixed(1), 15)}${(sum((r) => r.handRuns) / secs).toFixed(1)}`);
    }
    const all = (f: (r: ClipResult) => number) => set.reduce((a, r) => a + f(r), 0);
    lines.push(`${pad('ALL', 16)}${pad(set.length, 7)}${pad(all((r) => r.secs).toFixed(0), 7)}${pct(all((r) => r.correct), all((r) => r.scored))}`);
  }
  const fp = results.filter((r) => r.expect === 'NOT_PHONE' || r.expect === 'DOWN').flatMap((r) => r.falsePhoneBoxes.map((x) => ({ ...x, label: r.label })));
  if (fp.length) {
    lines.push('', 'Phone evidence in clips WITHOUT a phone in use (x,y = box centre, 0 = left/top, 1 = right/bottom):');
    for (const x of fp.slice(0, 15)) lines.push(`  ${pad(x.label, 16)} score ${x.score.toFixed(2)}  centre (${(x.x + x.w / 2).toFixed(2)}, ${(x.y + x.h / 2).toFixed(2)})  size ${x.w.toFixed(2)}x${x.h.toFixed(2)}`);
  }
  const empty = results.filter((r) => r.expect === 'EMPTY');
  if (empty.length) {
    lines.push('', `EMPTY DESK (after leaving; a person box counts at ${settings.personScore} or more; the Debug view draws boxes from 0.15)`);
    for (const r of empty) {
      lines.push(`  ${pad((isHoldout(r.name) ? 'kept aside ' : '') + r.name, 62)}nobody seen ${pad(pct(r.correct, r.scored), 5)} highest person score ${r.maxPerson.toFixed(2)}` +
        (r.correct < r.scored ? `  (someone seen by: face ${r.seenBy.face}, person box ${r.seenBy.person}, hands ${r.seenBy.hands} checks)` : ''));
    }
  }
  lines.push(...perEvent(results, loadSettings()));
  lines.push(...sleepyReport(results, loadSettings()));
  b.replayResult(lines.join('\n'), JSON.stringify(results));
}

// Per-event score (A2): the saved model outputs go through the rules again with the app's
// REAL wait times (the per-check table above uses shortened ones), then: seconds from the
// pickup to the first alarm, and pickups never caught. Clips without a beep count from 0 s.
export function perEvent(results: { label: string; name: string; expect: Expect; inputs: (CheckInput & { sec: number })[] }[], real: Config) {
  const lines = ['', `PER EVENT (real wait times: phone ${real.phoneSec} s, call ${real.callSec} s, looking down ${real.downSec} s)`,
    'seconds from the phone appearing to the alarm; "never" = no alarm before the clip ended; * = clip has no beep, counted from 0 s'];
  for (const [title, set] of [['TUNING CLIPS', results.filter((r) => !isHoldout(r.name))], ['KEPT-ASIDE CLIPS (fair test)', results.filter((r) => isHoldout(r.name))]] as const) {
    const phone = set.filter((r) => ['PHONE', 'PHONE_CALL', 'DOWN'].includes(r.expect) && r.inputs.length);
    if (!phone.length) continue;
    lines.push('', title);
    const delays: number[] = [];
    let never = 0;
    for (const r of phone) {
      const rules = createRules();
      const checks = r.inputs.map((i): [number, string] => [i.sec, rulesOnInput(i, rules, real).status.state]);
      const ev = eventSecOf(r.name);
      const d = secondsToAlarm(checks, ev ?? 0);
      if (d === null) never++; else delays.push(d);
      lines.push(`  ${pad(r.label, 16)}${pad(r.name + (ev === null ? ' *' : ''), 46)}${d === null ? 'never' : d.toFixed(1) + ' s'}${ev !== null && alarmBefore(checks, ev) ? '  (alarm BEFORE the pickup)' : ''}`);
    }
    const sorted = [...delays].sort((a, c) => a - c);
    lines.push(`  pickups caught ${delays.length} of ${phone.length}, never caught ${never}` +
      (sorted.length ? `; typical ${sorted[Math.floor(sorted.length / 2)].toFixed(1)} s, worst ${sorted.at(-1)!.toFixed(1)} s` : ''));
  }
  return lines;
}

// Stage A3, with the app's REAL settings (sleepySec, headDownSec): for the sleepy clips, seconds from the beep to the
// first SLEEPY (or "missed"); for every other clip, any SLEEPY at all is a false alarm (listed with its seconds).
export function sleepyReport(results: { label: string; name: string; expect: Expect; inputs: (CheckInput & { sec: number })[] }[], real: Config) {
  const lines = ['', `SLEEPY (real times: eyes closed ${real.sleepySec} s, head down on the desk ${real.headDownSec} s; alarm ${real.sleepyAlarm ? 'on' : 'OFF'})`];
  const run = (r: (typeof results)[number]) => { const rules = createRules(); return r.inputs.map((i): [number, string] => [i.sec, rulesOnInput(i, rules, real).status.state]); };
  for (const [title, set] of [['TUNING CLIPS', results.filter((r) => !isHoldout(r.name))], ['KEPT-ASIDE CLIPS', results.filter((r) => isHoldout(r.name))]] as const) {
    const sleepy = set.filter((r) => r.expect === 'SLEEPY' && r.inputs.length);
    if (sleepy.length) lines.push('', `${title}: sleepy clips`);
    let caught = 0;
    for (const r of sleepy) {
      const ev = eventSecOf(r.name) ?? 0;
      const hit = run(r).find(([sec, st]) => sec >= ev && st === 'SLEEPY');
      if (hit) caught++;
      lines.push(`  ${pad(r.label, 18)}${pad(r.name, 50)}${hit ? `caught ${(hit[0] - ev).toFixed(1)} s after the beep` : 'missed'}`);
    }
    if (sleepy.length) lines.push(`  caught ${caught} of ${sleepy.length}`);
  }
  const others = results.filter((r) => r.expect !== 'SLEEPY' && r.inputs.length);
  const falses = others.map((r) => ({ r, n: run(r).filter(([, st]) => st === 'SLEEPY').length })).filter((x) => x.n > 0);
  lines.push('', `False sleepy alarms on the other ${others.length} clips: ${falses.length}` + (falses.length ? '' : ' (none)'));
  for (const { r, n } of falses) lines.push(`  ${pad(r.label, 18)}${pad(r.name, 50)}${n} checks sleepy`);
  return lines;
}

async function replayClip(engine: Engine, label: string, name: string, expect: Expect, settings: Config): Promise<ClipResult> {
  const bytes = await bridge().readClip(label, name);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'video/webm' }));
  const video = document.createElement('video');
  video.muted = true;
  video.src = url;
  await video.play();

  const eventSec = eventSecOf(name);
  const waitSec = expect === 'EMPTY' ? LEAVE_SEC : expect === 'DOWN' ? settings.downSec : expect === 'SLEEPY' ? settings.headDownSec : settings.phoneSec;
  const rules = createRules();
  const r: ClipResult = { label, name, expect, secs: 0, checks: 0, scored: 0, correct: 0, phoneEvidence: 0, detectorRuns: 0, handRuns: 0, states: {}, falsePhoneBoxes: [], trace: [], inputs: [], maxPerson: 0, seenBy: { face: 0, person: 0, hands: 0 } };
  let first: { det: number; hands: number } | null = null;

  await new Promise<void>((done) => {
    const id = setInterval(() => {
      if (video.ended) { clearInterval(id); done(); return; }
      if (video.readyState < 2) return;
      const l = runCheck(engine, video, rules, settings);
      first ??= { ...l.frame.seq };
      r.detectorRuns = l.frame.seq.det - first.det;
      r.handRuns = l.frame.seq.hands - first.hands;
      r.checks++;
      const sg = l.signals;
      const input = checkInput(l.frame, l.t, settings);
      r.inputs.push({ sec: r2(video.currentTime), ...round(input) });
      r.trace.push([r2(video.currentTime), r2(sg.phone), r2(l.frame.phoneFull), r2(sg.inHand), r2(sg.crop), l.frame.hands.length, +sg.pose, +sg.call, l.frame.pitch === null ? null : Math.round(l.frame.pitch), l.status.state]);
      const state = scoredState(expect, l.status.state, input.person);
      const ok = checkCorrect(expect, state, video.currentTime, eventSec, waitSec);
      if (ok === null) return;
      if (video.currentTime >= (eventSec ?? 0) + waitSec) {
        r.maxPerson = Math.max(r.maxPerson, l.frame.personScore);
        if (l.frame.face) r.seenBy.face++;
        if (l.frame.personScore >= settings.personScore) r.seenBy.person++;
        if (l.frame.hands.length) r.seenBy.hands++;
      }
      r.scored++;
      r.states[state] = (r.states[state] ?? 0) + 1;
      if (ok) r.correct++;
      if (sg.phone >= settings.phoneEnter) r.phoneEvidence++;
      if ((expect === 'NOT_PHONE' || expect === 'DOWN') && sg.phone >= settings.phoneEnter && r.falsePhoneBoxes.length < 5 && r.scored % 5 === 0) {
        const bx = [...l.frame.crops, ...l.frame.boxes.filter((x) => x.label === 'cell phone')].sort((a, c) => c.score - a.score)[0];
        if (bx) r.falsePhoneBoxes.push({ x: bx.x / video.videoWidth, y: bx.y / video.videoHeight, w: bx.w / video.videoWidth, h: bx.h / video.videoHeight, score: bx.score });
      }
    }, 1000 / settings.checksPerSec);
  });
  r.secs = video.duration;
  URL.revokeObjectURL(url);
  return r;
}

// Shrink the saved numbers to 3 decimals (pixels to whole numbers) to keep result files small.
function round<T>(x: T): T {
  return JSON.parse(JSON.stringify(x, (_k, v) => (typeof v === 'number' ? (Math.abs(v) > 2 ? Math.round(v) : Math.round(v * 1000) / 1000) : v)));
}

// `npm run dataset`: cut the hand crops out of every clip (what the hand-object model sees)
// and save them as training images, labelled by the clip's label. Kept-aside clips go to a
// separate "holdout" set that training never sees.
export async function runExport() {
  const b = bridge();
  const settings = loadSettings();
  const clips = await b.listClips();
  if (!clips.length) return b.replayResult('No clips found. Record some in the debug screen first.', '{}');
  await b.resetDataset();
  const engine = await createEngine((m) => b.replayProgress('ERROR ' + m));
  const counts: Record<string, number> = {};
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const c of clips) {
    const lab = CLIP_LABELS.find((l) => l.id === c.label);
    if (!lab?.hand) continue; // activity clips (reading, speaking...) are not object-training data
    const set = isHoldout(c.name) ? 'holdout' : 'train';
    const url = URL.createObjectURL(new Blob([(await b.readClip(c.label, c.name)) as BlobPart], { type: 'video/webm' }));
    const video = document.createElement('video');
    video.muted = true;
    video.src = url;
    await video.play();
    const rules = createRules();
    let n = 0;
    while (!video.ended) {
      await sleep(1000 / settings.checksPerSec);
      // Clips with a beep: the object is only in the hand after it.
      if (video.readyState < 2 || video.currentTime < (eventSecOf(c.name) ?? 0) + 1) continue;
      const l = runCheck(engine, video, rules, settings);
      // In an object clip only the hand holding the object is labelled with it; an empty
      // second hand would be a wrong example. In "none" clips every hand is an example.
      const hands = lab.hand === 'none' ? l.frame.hands : [objectHand(l.frame.hands, [...l.frame.crops, ...l.frame.boxes.filter((x) => x.label === 'cell phone')], l.frame.W, l.frame.H)].filter((h): h is Hand => !!h);
      for (const [k, h] of hands.entries()) {
        const r = cropRect(h.pts, l.frame.W, l.frame.H, settings.handPad);
        if (r.w < 32) continue;
        const bmp = await createImageBitmap(video, r.x, r.y, r.w, r.h, { resizeWidth: 224, resizeHeight: 224 });
        const canvas = new OffscreenCanvas(224, 224);
        canvas.getContext('2d')!.drawImage(bmp, 0, 0);
        bmp.close();
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
        await b.saveDatasetImage(set, lab.hand, `${c.label}_${c.name.replace('.webm', '')}_${n}_${k}.jpg`, await blob.arrayBuffer());
        counts[`${set}/${lab.hand}`] = (counts[`${set}/${lab.hand}`] ?? 0) + 1;
      }
      n++;
    }
    URL.revokeObjectURL(url);
    b.replayProgress(`${pad(c.label, 16)} ${c.name}  -> ${set}/${lab.hand}`);
  }
  const lines = ['', 'DATASET (hand crops, 224x224)', ...Object.entries(counts).sort().map(([k, v]) => `  ${pad(k, 22)} ${v} images`)];
  b.replayResult(lines.join('\n'), JSON.stringify(counts));
}

// The hand holding the object: the one touching a detected phone-like box, else the
// highest hand (objects are held up; the other hand usually rests on the desk).
function objectHand(hands: Hand[], boxes: { x: number; y: number; w: number; h: number }[], W: number, H: number): Hand | undefined {
  if (hands.length < 2) return hands[0];
  const touching = hands.find((h) => boxes.some((b) => overlaps(handRect(h.pts, W, H), b)));
  return touching ?? [...hands].sort((a, c) => Math.min(...a.pts.map((p) => p.y)) - Math.min(...c.pts.map((p) => p.y)))[0];
}