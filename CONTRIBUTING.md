# Contributing to Desk Watch

Thank you for helping. Desk Watch is a small project; these few rules keep it safe and working.

## The rules

1. **Privacy first.** All data stays on the user's computer. No accounts, cloud sync, telemetry, leaderboards,
   reward points or chatbots. Never store camera frames, audio or screen images (the only exception is a test clip
   the user records on purpose in the Debug tab). Models are bundled with the app, never loaded from the internet.
2. **Detection is never faked or stubbed.** If something cannot be detected well, say so in the README's Known limits.
3. **Keep what works working.** Add unit tests for new logic. Before a pull request, run:

   ```bash
   npm test
   ```

   ```bash
   npm run build
   ```

4. **Two languages.** Every text the user can see goes through `t()` and gets its Bangla line in `electron/bn.ts`
   in the same change; `npm test` fails otherwise. Run `node scripts/bangla-review.mjs` to refresh
   [docs/BANGLA_REVIEW.md](docs/BANGLA_REVIEW.md). If you don't speak Bangla, leave the English as the Bangla line and
   say so in your pull request.
5. **Rules stay pure.** Code in `src/state/` has no DOM and is shared by the app, the replay and the scripts.
6. **Database changes** go in a new migration in `electron/db.ts` (`MIGRATIONS`); never edit an old one. The app
   makes a backup before it upgrades.
7. Ask (open an issue) before adding a new package or a big feature.

## Testing without touching your own data

Never test on your real Desk Watch data (`%APPDATA%\Desk Watch`). Start an isolated test copy with its own data folder
and its own port, with a fake camera:

```bash
bash scripts/testing/test-copy.sh start <empty scratch folder>
```

The scripts in [scripts/testing/](scripts/testing/) then drive it (for example `node scripts/testing/todo-check.mjs <folder>`),
and `bash scripts/testing/run-all.sh <folder>` runs all of them. Stop the copy with
`bash scripts/testing/test-copy.sh stop`. The app refuses to start when test flags come without a separate data folder.

## Training the phone model on your own clips

The bundled hand-object model (`desk_objects.tflite`) was trained on one person, in one room, with one phone and one
calculator. More people, rooms and phones make it better for everyone. To train it on your own clips:

1. Settings → Advanced → **Show Debug tab**.
2. Record clips in the Debug tab. [docs/CLIPS_GUIDE.md](docs/CLIPS_GUIDE.md) lists which clips to record and how
   (light, background, what each label means). They are saved in `%APPDATA%\Desk Watch\clips\`.
3. Make the hand crops and train (needs Python; see [train/train.py](train/train.py) for the setup):

   ```bash
   npm run dataset
   ```

   ```bash
   npm run train
   ```

4. Check the result on the clips you kept aside:

   ```bash
   npm run replay
   ```

   The table shows how often each label was right and how many phone pickups were caught, and how fast.

**Your clips show your face and your room. Never commit them, and never put them in a pull request.** Clips and
hand crops are saved in `%APPDATA%\Desk Watch\` (`clips\`, `dataset\`), outside the project folder; `*.webm` and
`clips/` are ignored by git too, in case one is copied in. Training overwrites `public/models/desk_objects.tflite`,
which **is** in git: don't commit your retrained model unless the project agreed to it (see below). If you want to share an improved
model, open an issue first and say how it was trained and what the replay table showed; the model file alone holds
no images.

## Pull requests

- One change per pull request, with a short description: what changed, how you tested it, and what you could not test
  (for example "not tested with a real camera").
- Screenshots of a screen change are welcome; use a test copy with made-up data (`node scripts/testing/seed.mjs`) and
  keep the camera area hidden.

By contributing you agree that your contribution is released under the [MIT licence](LICENSE).
