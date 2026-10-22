// Puts every runtime file the detector needs inside public/, so the app never
// touches the network after this. Run once after `npm install` (needs internet).
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const wasmSrc = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const wasmDst = join(root, 'public/wasm');
const modelDst = join(root, 'public/models');
mkdirSync(wasmDst, { recursive: true });
mkdirSync(modelDst, { recursive: true });

for (const f of ['vision_wasm_module_internal.js', 'vision_wasm_module_internal.wasm']) {
  copyFileSync(join(wasmSrc, f), join(wasmDst, f));
}

const models = {
  'efficientdet_lite2.tflite':
    'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float32/latest/efficientdet_lite2.tflite',
  'efficientdet_lite0.tflite':
    'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/latest/efficientdet_lite0.tflite',
  'efficientnet_lite0.tflite':
    'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/latest/efficientnet_lite0.tflite',
  'hand_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
  'face_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
};
for (const [name, url] of Object.entries(models)) {
  const out = join(modelDst, name);
  if (existsSync(out)) continue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log('downloaded', name);
}
console.log('assets ready');
