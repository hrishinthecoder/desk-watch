# Camera clips guide (Stages A2 and A3)

Desk Watch learns and is tested with short videos ("clips") of you at your desk. Two stages wait for them:

- **A2: phone detection follow-up.** It fixes the calculator-at-face false alarm, measures how fast a phone is caught,
  and adds more fair-test clips.
- **A3: sleepy detection.** It needs clips of closed eyes, slow blinks and yawns, plus reading clips that must **not**
  count as sleepy.

When all clips are in, tell Claude **"clips ready"**. Claude retrains the model **once**, runs the accuracy test and
reports (one round only), then builds A3.

## Privacy (read first)

- [ ] Clips **never leave this computer**. Nothing is uploaded; Desk Watch has no account and no cloud.
- [ ] Clips are **never committed to git**: `.gitignore` excludes the `clips/` folder and every `.webm` file.
- [ ] Clips show your face and room. Never put them in the public repo, a release, or a chat.
- [ ] You can delete any clip at any time (Debug tab → Open clips folder → delete the file).

## How to record (with Desk Watch itself, no other app)

1. Settings → Advanced → tick **Show Debug tab** (once).
2. Open the **Debug** tab. The camera preview is shown there.
3. In **Record test clip**, pick the label (the list below uses the same names).
4. Tick **Keep aside for the final test** when the table says *keep aside: yes*. These clips are the fair test: they are
   never used for tuning or training.
5. Tick **Glasses on** if you wear glasses in that clip.
6. Press **Record**.
   - **Countdown** clips: study normally; at the **beep (10 s)** do the action; the clip stops by itself at **30 s**.
   - Other clips: about **20 s**; press **Stop** when 20 s is reached (the button shows the seconds; 30 s is the limit).
7. "Saved …" appears. That's it: do **not** rename or move files.

**When:** between study sessions, or in a break, at your real desk with your real lighting. Each clip must
show the one thing its label says, so it has to be done on purpose, not caught by chance. Do a few at a time: 10
minutes now and then is fine.

**Where they go (automatic):**
`C:\Users\<you>\AppData\Roaming\Desk Watch\clips\<label>\`
**File names (automatic):** `[holdout-]<date and time>[-ev10][-glasses].webm`
- `holdout-` = kept aside;
- `-ev10` = the beep came at 10 s;
- `-glasses` = glasses on.

**Format:** WebM video (VP8), made by the recorder. Don't record with another app: the name markers and the beep
timing would be missing.

## Camera, light and background

- [ ] Camera where it **normally** is when you study (same height, same angle). Your head and shoulders, both hands
      and the desk in front of you in the picture.
- [ ] About an arm's length away (50–80 cm). Whole face visible, not cut off at the top.
- [ ] Light **in front of you or from the side**, not behind you (a bright window behind you makes your face dark).
- [ ] Your normal background. No other person in the picture.
- [ ] For the 3 *keep aside* clips of a label, change one thing each time:
  1. daylight;
  2. evening with your usual lamp;
  3. your other desk.

## Good vs bad clips

| Good | Useless (delete and record again) |
|---|---|
| The action happens clearly, as the label says | The action is missing, or something else happens (e.g. you pick up the phone in a "no_phone" clip) |
| Face and hands visible most of the time | Face out of the picture, camera covered, very dark |
| For countdown clips, the action starts right at the beep | Action long before the beep, or clip stopped before the beep |
| One label = one kind of action | Two labels mixed in one clip |
| Normal speed, like real studying | Very fast or exaggerated movements |

## The checklist

Totals: **98 clips, about 43 minutes.** Tick each clip as you go. "3 + 2" = 3 kept aside + 2 normal.

### A2: phones and things that look like phones (countdown = beep at 10 s, stops at 30 s)

| Label (in the Debug tab) | Clips | Length | Keep aside | What to do |
|---|---|---|---|---|
| phone_upright | 3 ☐☐☐ | countdown | yes | Study, no phone in view. At the beep: pick it up, hold it up, scroll |
| phone_back | 3 ☐☐☐ | countdown | yes | Same, back of the phone towards the camera |
| phone_at_ear | 3 ☐☐☐ | countdown | yes | At the beep: phone to your ear, talk |
| phone_in_lap | 3 ☐☐☐ | countdown | yes | At the beep: use the phone in your lap, below the desk |
| phone_flat_desk | 3 ☐☐☐ | 20 s | yes | Phone flat on the desk; study; glance down at it twice; never pick it up |
| no_phone | 3 ☐☐☐ | 20 s | yes | Read and write normally; head down sometimes |
| chin_on_hand | 3 ☐☐☐ | 20 s | yes | Chin or cheek resting on your hand |
| hand_on_head | 3 ☐☐☐ | 20 s | yes | Hand on your head or next to your ear; no phone |
| pen | 3 ☐☐☐ | 20 s | yes | Hold a pen up, turn it in your fingers |
| pen_at_face | 3 ☐☐☐ | 20 s | yes | Pen held against your cheek or lips |
| calculator | 3 ☐☐☐ | 20 s | yes | Hold the calculator up and type on it |
| calc_at_face | 3 ☐☐☐ | 20 s | yes | Calculator held next to your face, looking at it |
| book | 3 ☐☐☐ | 20 s | yes | Hold a book up and read it |
| writing | 3 ☐☐☐ | 20 s | yes | Write in a notebook |
| reading | 3 ☐☐☐ | 20 s | yes | Read a book or notes lying on the desk |
| reading_screen | 3 ☐☐☐ | 20 s | yes | Read on the laptop screen |
| speaking | 3 ☐☐☐ | 20 s | yes | Read aloud or explain something to yourself |
| idle | 3 ☐☐☐ | 20 s | yes | Sit still and think |
| looking_away | 3 ☐☐☐ | 20 s | yes | Look to the side or out of the window |
| calc_at_face | +4 ☐☐☐☐ | 20 s | **no** (training) | Each with a different calculator, angle or hand |
| calculator | +2 ☐☐ | 20 s | **no** (training) | Hold it up and type; a different angle each time |

### A2: nobody at the desk (the "person 0.22" cushion)

Checks that an empty chair really counts as **away**, and that the cushion corner behind you (seen once as a weak
"person 0.22" box in the Debug view) never counts as a person. Label **empty_desk** (countdown: beep at 10 s, stops
at 30 s). In the Debug tab it is called *Nobody at the desk (leave at the beep; cushion in view)*.

| Label | Clips | Length | Keep aside | What to do |
|---|---|---|---|---|
| empty_desk | 3 + 2 ☐☐☐ ☐☐ | countdown | 3 yes, 2 no | Sit and study. At the beep: stand up and walk out of the picture; stay out until the clip stops |

- [ ] Camera in its normal place, so the **cushion corner behind you is in the picture** in every one of these clips.
      Don't move or hide the cushion.
- [ ] Vary one thing per clip: chair pushed in / chair left out / evening lamp / daylight / cushion moved a little.
- [ ] Nobody else (and no pet) walks through the picture.

### A3: sleepy, and things that must not count as sleepy

| Label | Clips | Length | Keep aside | What to do |
|---|---|---|---|---|
| eyes_closed_up | 3 + 2 ☐☐☐ ☐☐ | countdown | 3 yes, 2 no | Look at the screen. At the beep: close your eyes, sitting up, as if dozing; let your head droop a little |
| eyes_closed_desk | 3 + 2 ☐☐☐ ☐☐ | countdown | 3 yes, 2 no | Study. At the beep: head down on your arms on the desk, eyes closed |
| reading_eyes_down | 3 + 2 ☐☐☐ ☐☐ | 20 s | 3 yes, 2 no | Read a book flat on the desk, eyes lowered, head still; turn one page |
| blinking | 3 + 2 ☐☐☐ ☐☐ | 20 s | 3 yes, 2 no | Look at the screen, blink normally; add 3 quick double blinks |
| slow_blinks | 3 + 2 ☐☐☐ ☐☐ | 20 s | 3 yes, 2 no | 4 times: close your eyes for about 2 s, then open for about 3 s |
| yawning | 3 + 2 ☐☐☐ ☐☐ | 20 s | 3 yes, 2 no | Yawn twice, naturally; cover your mouth for one of them |

### Glasses

- [ ] If you usually wear glasses: wear them for **every** clip and tick **Glasses on**.
- [ ] If you don't, but can borrow a pair: record 1 extra kept-aside clip each of eyes_closed_up, reading_eyes_down,
      blinking and slow_blinks with glasses on and **Glasses on** ticked. Without any glasses clips, A3 cannot be
      checked with glasses (Claude will say so in the report).

## When you are done

- [ ] Debug tab → **Open clips folder**: every label folder from the tables above is there.
- [ ] Tell Claude **"clips ready"**. Claude then:
  1. runs the accuracy test with the **current** model first (`npm run replay`): the "before" table;
  2. retrains **once** (`npm run dataset`, `npm run train`) and runs the test again: the "after" table;
  3. shows you both side by side (each label, the kept-aside clips, phone pickups caught and how fast, the empty-desk
     clips and the highest "person" score the cushion got);
  4. rebuilds the installer and re-runs the release check (`npm run release-check`);
  5. builds A3 (sleepy detection) with its own plan first.
