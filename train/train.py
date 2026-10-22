"""Train the hand-object model: "what is in this hand?" -> phone, pen, calculator, book, none.

Input:  hand crops exported by `npm run dataset`
        (%APPDATA%/Desk Watch/dataset/{train,holdout}/<class>/*.jpg)
Output: public/models/desk_objects.tflite (+ desk_objects.labels.json), bundled with the app.

Usage:  npm run train      (or: train/.venv/Scripts/python train/train.py [dataset_dir] [out_dir])

Only the images stay on this computer. The one network access is Keras downloading the
public ImageNet starting weights for MobileNetV3-Small the first time (transfer learning).
"""
import json
import os
import pathlib
import sys
import tempfile

import numpy as np
import tensorflow as tf
import keras
from keras import layers

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(os.environ["APPDATA"]) / "Desk Watch" / "dataset"
OUT = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "public" / "models"
CLASSES = ["book", "calculator", "none", "pen", "phone"]  # fixed order = model output order
IMG = 224
keras.utils.set_random_seed(1)


def load(split, shuffle):
    d = DATA / split
    if not any(d.glob("*/*.jpg")):
        return None
    for c in CLASSES:  # a class with no images still needs its folder
        (d / c).mkdir(parents=True, exist_ok=True)
    return keras.utils.image_dataset_from_directory(
        d, class_names=CLASSES, image_size=(IMG, IMG), batch_size=32, shuffle=shuffle, seed=1)


def counts(split):
    return {c: len(list((DATA / split / c).glob("*.jpg"))) for c in CLASSES}


def confusion(y_true, y_pred):
    m = np.zeros((len(CLASSES), len(CLASSES)), int)
    for t, p in zip(y_true, y_pred):
        m[t, p] += 1
    print("\n  rows = true class, columns = predicted")
    print("  " + "".join(f"{c[:6]:>8}" for c in CLASSES) + "   correct")
    for i, c in enumerate(CLASSES):
        n = m[i].sum()
        print(f"  {c[:10]:<10}" + "".join(f"{v:>8}" for v in m[i]) + (f"   {100 * m[i, i] / n:5.1f}%" if n else "      -"))
    print(f"  overall: {100 * np.trace(m) / max(m.sum(), 1):.1f}% of {m.sum()} images")
    return np.trace(m) / max(m.sum(), 1)


train_raw = load("train", True)
if train_raw is None:
    sys.exit(f"No training images in {DATA / 'train'}. Run `npm run dataset` first.")
holdout = load("holdout", False)
print("train images:", counts("train"))
print("kept-aside images:", counts("holdout") if holdout else "none (validation will use 15% of the training images)")

if holdout is None:
    # Frames from the same clip are near-duplicates, so this score will look too good.
    train_raw = keras.utils.image_dataset_from_directory(
        DATA / "train", class_names=CLASSES, image_size=(IMG, IMG), batch_size=32,
        validation_split=0.15, subset="training", seed=1)
    holdout = keras.utils.image_dataset_from_directory(
        DATA / "train", class_names=CLASSES, image_size=(IMG, IMG), batch_size=32,
        validation_split=0.15, subset="validation", seed=1)  # shuffled split: every class appears

# Balance classes: rarer classes count more per image.
n = counts("train")
total = sum(n.values())
class_weight = {i: (total / (len(CLASSES) * n[c]) if n[c] else 0.0) for i, c in enumerate(CLASSES)}

# Augmentation: small changes in angle, size, light and mirroring, so the model does not
# just memorise the exact frames.
augment = keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.08),
    layers.RandomZoom(0.15),
    layers.RandomBrightness(0.25, value_range=(0, 255)),
    layers.RandomContrast(0.2),
])
train = train_raw.map(lambda x, y: (augment(x, training=True), y)).prefetch(tf.data.AUTOTUNE)

# Transfer learning: MobileNetV2 already knows general shapes from ImageNet; we only teach
# it our 5 classes. (MobileNetV3 was tried first: its 8-bit export does not run in
# XNNPACK, the CPU engine MediaPipe uses.) The model takes raw 0-255 RGB pixels and
# scales them itself, so MediaPipe can feed it camera pixels directly.
base = keras.applications.MobileNetV2(input_shape=(IMG, IMG, 3), include_top=False, weights="imagenet", pooling="avg", alpha=0.5)
base.trainable = False
inp = keras.Input((IMG, IMG, 3))
x = layers.Rescaling(1 / 127.5, offset=-1)(inp)  # 0..255 -> -1..1, what MobileNetV2 expects
x = base(x, training=False)  # keep batch-norm statistics frozen, also while fine-tuning
x = layers.Dropout(0.3)(x)
out = layers.Dense(len(CLASSES), activation="softmax")(x)
model = keras.Model(inp, out)

model.compile(optimizer=keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
print("\nStep 1/2: training the new last layer")
model.fit(train, validation_data=holdout, epochs=12, class_weight=class_weight, verbose=2)

base.trainable = True
for layer in base.layers[:-40]:
    layer.trainable = False
model.compile(optimizer=keras.optimizers.Adam(1e-5), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
print("\nStep 2/2: fine-tuning the top of the network")
model.fit(train, validation_data=holdout, epochs=6, class_weight=class_weight, verbose=2)

# One pass over the kept-aside images: labels and predictions must come from the same pass.
X, y_true = [], []
for xb, yb in holdout:
    X.append(xb.numpy().astype(np.uint8))
    y_true.append(yb.numpy())
X, y_true = np.concatenate(X), np.concatenate(y_true)
print("\nKeras model on the kept-aside images:")
confusion(y_true, model.predict(X.astype(np.float32), verbose=0).argmax(1))
# Two exports from the same trained model; the one that scores better on the kept-aside
# images goes into the app. Both take raw 0-255 uint8 pixels, so MediaPipe needs no extra
# normalisation settings.
def score_tflite(tflite):
    interp = tf.lite.Interpreter(model_content=tflite)  # uses XNNPACK, like MediaPipe
    interp.allocate_tensors()
    inp_d, out_d = interp.get_input_details()[0], interp.get_output_details()[0]
    preds = []
    for img in X:
        interp.set_tensor(inp_d["index"], img[None])
        interp.invoke()
        preds.append(int(interp.get_tensor(out_d["index"])[0].argmax()))
    return confusion(y_true, np.array(preds))


def convert(keras_model, setup):
    with tempfile.TemporaryDirectory() as tmp:
        keras_model.export(tmp, verbose=False)
        conv = tf.lite.TFLiteConverter.from_saved_model(tmp)
        setup(conv)
        return conv.convert()


def int8_setup(conv):
    # 8-bit: smallest and fastest, but rounding costs some accuracy.
    conv.optimizations = [tf.lite.Optimize.DEFAULT]

    def representative():
        for xb, _ in train_raw.take(20):
            for i in range(xb.shape[0]):
                yield [xb[i:i + 1].numpy().astype(np.float32)]

    conv.representative_dataset = representative
    conv.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    conv.inference_input_type = tf.uint8
    conv.inference_output_type = tf.uint8


def float16_setup(conv):
    # 16-bit weights, normal float maths: about twice the size, no rounding of results.
    conv.optimizations = [tf.lite.Optimize.DEFAULT]
    conv.target_spec.supported_types = [tf.float16]


# For the 16-bit export, put a uint8 -> float step in front so the input stays raw pixels.
u8 = keras.Input((IMG, IMG, 3), dtype="uint8")
u8_model = keras.Model(u8, model(keras.ops.cast(u8, "float32")))

candidates = {}
for name, km, setup in [("8-bit", model, int8_setup), ("16-bit", u8_model, float16_setup)]:
    tfl = convert(km, setup)
    print(f"\nExported {name} model ({len(tfl) // 1024} KB) on the kept-aside images:")
    candidates[name] = (score_tflite(tfl), tfl)

best = max(candidates, key=lambda k: (candidates[k][0], k == "8-bit"))  # tie -> smaller 8-bit
tflite = candidates[best][1]
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "desk_objects.tflite").write_bytes(tflite)
(OUT / "desk_objects.labels.json").write_text(json.dumps({"labels": CLASSES}))
print(f"\nChose the {best} model. Saved {OUT / 'desk_objects.tflite'} ({len(tflite) // 1024} KB)")