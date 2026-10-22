// One MediaPipe job per worker thread, so inference never freezes the window and the
// models run in parallel:
//   detector: phone/person detector on the full frame (GPU)
//   face:     face landmarker -> head pitch + face/ear position (CPU)
//   hands:    hand landmarker, then a phone detector and an object classifier on a zoomed
//             crop around each hand (CPU)
import { FaceLandmarker, FilesetResolver, HandLandmarker, ImageClassifier, ObjectDetector, type Detection } from '@mediapipe/tasks-vision';
import { pitchFromMatrix, yawFromMatrix } from '../state/classifier';
import { cropRect, type FaceGeo, type Hand, type PhoneBox } from '../state/phone';
import { SHAPES, type Shapes } from '../state/activities';

export type Task = 'detector' | 'face' | 'hands';
export type CropModel = 'lite0-cpu' | 'lite2-gpu';
export type DetectorBox = { label: string; score: number; x: number; y: number; w: number; h: number };
export type Result =
  | { boxes: DetectorBox[] }
  | { face: boolean; pitch: number | null; yaw: number | null; geo: FaceGeo | null; shapes: Shapes | null }
  | { hands: Hand[]; crops: PhoneBox[] };
export type FromWorker =
  | { type: 'ready'; delegate: 'GPU' | 'CPU'; loadMs: number }
  | { type: 'error'; message: string }
  | { type: 'result'; result: Result; ms: number };
export type ToWorker =
  | { base: string; task: Task; cropModel?: CropModel; detModel?: string }
  | { bitmap: ImageBitmap; t: number; handPad: number };

const post = (m: FromWorker) => postMessage(m);
let run: (bitmap: ImageBitmap, t: number, handPad: number) => Promise<Result>;

const toBoxes = (ds: Detection[]): DetectorBox[] => ds.flatMap((x) => {
  const c = x.categories[0], bb = x.boundingBox;
  return c && bb ? [{ label: c.categoryName, score: c.score, x: bb.originX, y: bb.originY, w: bb.width, h: bb.height }] : [];
});

async function init(base: string, task: Task, cropModel: CropModel, detModel: string) {
  const started = performance.now();
  const fileset = await FilesetResolver.forVisionTasks(base + 'wasm', true);
  const detector = (model: string, delegate: 'GPU' | 'CPU', runningMode: 'VIDEO' | 'IMAGE', labels: string[]) =>
    ObjectDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: base + `models/${model}.tflite`, delegate },
      runningMode,
      scoreThreshold: 0.15, // low on purpose: the debug screen shows weak guesses too
      maxResults: 10,
      categoryAllowlist: labels,
    });

  const make = async (delegate: 'GPU' | 'CPU'): Promise<typeof run> => {
    if (task === 'detector') {
      const d = await detector(detModel, delegate, 'VIDEO', ['cell phone', 'person']); // lite2, or lite0 in low-power mode
      return async (b, t) => ({ boxes: toBoxes(d.detectForVideo(b, t).detections) });
    }
    if (task === 'face') {
      const f = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: base + 'models/face_landmarker.task', delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFacialTransformationMatrixes: true,
        outputFaceBlendshapes: true, // eyes, eyelids and mouth, for reading / speaking / lap phone (Stage C)
      });
      return async (b, t) => {
        const r = f.detectForVideo(b, t);
        const m = r.facialTransformationMatrixes?.[0]?.data;
        const lm = r.faceLandmarks[0];
        // 234 / 454: outer cheek points beside each ear; 10: top of forehead; 152: chin.
        const geo = lm ? { left: lm[234], right: lm[454], top: lm[10].y, chin: lm[152].y, width: Math.abs(lm[454].x - lm[234].x) } : null;
        const cats = r.faceBlendshapes?.[0]?.categories ?? [];
        const shapes = cats.length ? Object.fromEntries(SHAPES.map((k) => [k, cats.find((c) => c.categoryName === k)?.score ?? 0])) as Shapes : null;
        return { face: !!lm, pitch: m ? pitchFromMatrix(m) : null, yaw: m ? yawFromMatrix(m) : null, geo, shapes };
      };
    }
    // hands
    const h = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: base + 'models/hand_landmarker.task', delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: 2,
    });
    const [model, cropDelegate, size] = cropModel === 'lite2-gpu' ? ['efficientdet_lite2', 'GPU', 448] as const : ['efficientdet_lite0', 'CPU', 320] as const;
    // MediaPipe's loader clears the global ModuleFactory after creating a task, and the
    // module import is cached, so every further task in the same worker must get it back.
    const wasm = await import(/* @vite-ignore */ base + 'wasm/vision_wasm_module_internal.js');
    const restoreFactory = () => { (self as unknown as { ModuleFactory: unknown }).ModuleFactory = wasm.default; };
    restoreFactory();
    const cropDet = await detector(model, cropDelegate, 'IMAGE', ['cell phone']);
    restoreFactory();
    // Names what the hand holds. Uses your own trained model (`npm run train`:
    // phone / pen / calculator / book / none) when it exists, else the generic ImageNet one.
    const custom = await fetch(base + 'models/desk_objects.labels.json')
      .then((r) => (r.ok ? r.json() : null)).then((j) => (Array.isArray(j?.labels) ? j.labels as string[] : null)).catch(() => null);
    const classifier = await ImageClassifier.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: base + `models/${custom ? 'desk_objects' : 'efficientnet_lite0'}.tflite`, delegate: 'CPU' },
      runningMode: 'IMAGE',
      maxResults: 5,
    });
    return async (b, t, handPad) => {
      const hands: Hand[] = h.detectForVideo(b, t).landmarks.map((pts) => ({ pts: pts.map((p) => ({ x: p.x, y: p.y })) }));
      const crops: PhoneBox[] = [];
      for (const hand of hands) {
        const r = cropRect(hand.pts, b.width, b.height, handPad);
        if (r.w < 8) continue;
        // Cut out the square around the hand and enlarge it to the detector's input size.
        const crop = await createImageBitmap(b, r.x, r.y, r.w, r.h, { resizeWidth: size, resizeHeight: size });
        const k = r.w / size;
        for (const d of toBoxes(cropDet.detect(crop).detections)) {
          crops.push({ score: d.score, x: r.x + d.x * k, y: r.y + d.y * k, w: d.w * k, h: d.h * k });
        }
        hand.top = (classifier.classify(crop).classifications[0]?.categories ?? [])
          .map((c) => [custom ? custom[c.index] : c.categoryName, Math.round(c.score * 1000) / 1000] as [string, number]);
        crop.close();
      }
      return { hands, crops };
    };
  };

  // Detector: GPU (~200 ms vs ~870 ms on CPU on an Intel UHD laptop). Face and hands:
  // CPU is already fast and leaves the GPU to the detector.
  let delegate: 'GPU' | 'CPU' = task === 'detector' ? 'GPU' : 'CPU';
  try {
    run = await make(delegate);
  } catch (e) {
    if (delegate === 'CPU') throw e;
    // ponytail: CPU fallback is ~4x slower (about 1 phone check/s); hand crops still run.
    console.warn('GPU failed, using CPU', e);
    delegate = 'CPU';
    run = await make('CPU');
  }
  post({ type: 'ready', delegate, loadMs: Math.round(performance.now() - started) });
}

onmessage = async (e: MessageEvent<ToWorker>) => {
  const d = e.data;
  if ('base' in d) {
    init(d.base, d.task, d.cropModel ?? 'lite0-cpu', d.detModel ?? 'efficientdet_lite2').catch((err) => post({ type: 'error', message: String(err) }));
    return;
  }
  const t0 = performance.now();
  try {
    post({ type: 'result', result: await run(d.bitmap, d.t, d.handPad), ms: performance.now() - t0 });
  } catch (err) {
    post({ type: 'error', message: String(err) });
  } finally {
    d.bitmap.close();
  }
};
