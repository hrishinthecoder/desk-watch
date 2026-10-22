# Third-party notices

Desk Watch (MIT, see [LICENSE](LICENSE)) includes the following third-party material. Everything below may be
redistributed with the app; nothing on this list forbids it.

## Inside the app (shipped in the installer)

| What | Version | Licence | Where it is used |
|---|---|---|---|
| [Electron](https://www.electronjs.org) (includes Chromium and Node.js) | 44.7.0 | MIT; Chromium's own licences are in `LICENSES.chromium.html` next to `Desk Watch.exe` | the app itself |
| [React](https://react.dev), React DOM (with `scheduler`) | 19.3.0 | MIT | the screens (bundled into `dist/assets`) |
| [MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe) | 1.1.0 | Apache-2.0 | camera detection (bundled, plus its `wasm` files) |
| [get-windows](https://github.com/sindresorhus/get-windows) (`node-get-windows.node` only) | 9.3.0 | MIT | Screen mode: the **name** of the app in front |
| [Anek Bangla](https://github.com/EkType/Anek) font | variable | SIL Open Font License 1.1 | all text, English and Bangla |

## Detection models (shipped in the installer, `dist/models`)

| Model | From | Licence |
|---|---|---|
| `hand_landmarker.task` | MediaPipe Hand Landmarker | Apache-2.0 |
| `face_landmarker.task` | MediaPipe Face Landmarker | Apache-2.0 |
| `efficientdet_lite0.tflite`, `efficientdet_lite2.tflite` | MediaPipe Object Detector (EfficientDet-Lite, COCO) | Apache-2.0 |
| `efficientnet_lite0.tflite` | MediaPipe Image Classifier (EfficientNet-Lite, ImageNet) | Apache-2.0 |
| `desk_objects.tflite` (+ `.labels.json`) | **Our own**, trained with [train/train.py](train/train.py) on MobileNetV2 (Keras, ImageNet weights, Apache-2.0) | MIT, like the app |

`npm run assets` downloads the MediaPipe models once from Google's model storage. The app never downloads anything
while it runs.

Our own model was trained on one person, one room, one phone and one calculator. It may work less well for you; see
[CONTRIBUTING.md](CONTRIBUTING.md) to train it on your own clips.

## Build tools only (not shipped)

Vite, @vitejs/plugin-react, Vitest, TypeScript (Apache-2.0), electron-builder and the `@types` packages (MIT).
get-windows' install-time helpers (node-pre-gyp, node-gyp, tar) are used only by `npm install` and are not in the installer.

## Anek Bangla (font) details

- Files: `public/fonts/AnekBangla-Variable.ttf`, licence in `public/fonts/AnekBangla-OFL.txt`
- Source: https://github.com/google/fonts/tree/main/ofl/anekbangla (upstream: https://github.com/EkType/Anek)
- Copyright 2021 The Anek Project Authors
- Licence: SIL Open Font License 1.1. Bundling and redistributing it with software is allowed as long as the
  licence travels with it and the font is not sold on its own. No Reserved Font Name.
- SHA-256 of the bundled file: `8b4ec2eaf7400ea9903718a4addf3135475292e6e0b04db7735d0f999289d919`
