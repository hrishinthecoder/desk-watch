# Desk Watch design rules

Keep every screen to these rules. **Night Desk** redesign (owner chose it 2026-10-23; mockups on the claude.ai Design canvas
linked in CLAUDE.md). Being built in groups; earlier rules below still hold where they do not conflict.
The tokens live at the top of `src/styles.css`; old token names (`--muted`, `--line`, `--alert` …) are kept as aliases.

## Look
- **Calm and minimal, dark first.** Near-black background, raised surfaces, one periwinkle accent, one typeface,
  a 4px spacing base (28px gutter).
- **No** gradients, glow, glass effects, emojis or decorative icons. Radius: 8 chips, 10 inputs, 12 buttons and cards,
  16 dock and dialogs. Buttons are filled (no border); primary = accent, secondary = raised grey, danger = red outline.
- **Red is only for alarms.** Amber is for warnings (blocker countdown, overdue). Never as decoration.
- **Typeface:** Anek Bangla (bundled, `public/fonts/`, OFL 1.1; Latin and Bangla in one family). Numbers that
  change (clocks, timers) always use `font-variant-numeric: tabular-nums`, and Bangla clock digits are boxed (`ClockText`)
  so they never jump. Sizes: clock 160/120, display 40, title 24, heading 18, body 15, small 13.
- **Tab bar** 48px, pill tabs; it is also the window's drag area (Windows' own buttons sit at its right end).

## Colour (contrast measured, WCAG 2)
| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--bg` | `#101114` | `#F6F6F8` | page background (Focus mode: `--focus-bg` `#000` / `#FBFAF7`) |
| `--surface` / `--surface-2` | `#16181C` / `#1F2228` | `#FFFFFF` / `#ECEEF3` | cards, inputs / raised |
| `--border` | `#2A2E37` | `#D9DBE2` | dividers only |
| `--text` | `#ECEDF1` | `#15171C` | text (16.1:1 / 16.6:1 on bg) |
| `--text-2` | `#A6AAB5` | `#555B68` | secondary text (8.1:1 / 6.3:1) |
| `--text-3` | `#8B909C` | `#6A7080` | quiet labels (5.9:1 / 4.6:1) |
| `--accent` | `#8FA8FF` | `#3B55D0` | selection, focus, primary button (8.3:1 / 5.7:1 on bg) |
| `--on-accent` | `#0B1030` | `#FFFFFF` | text on accent (8.1:1 / 6.2:1) |
| `--alarm` | `#FF6B6B` | `#C42B30` | alarms only (6.9:1 on the alarm background / 5.6:1) |
| `--warn` | `#F2B24C` | `#8A5200` | warnings (10.1:1 / 5.9:1) |
Every text pair is at least 4.5:1 (WCAG AA).

## Never colour alone
Some people cannot tell green from red. Every state has a **word** and a **shape** (or a position):
- circle (filled) = studying (Focused, Writing, Reading, Speaking, Idle); ring = ready;
- square = Break or Paused;
- triangle = alarm or a problem (Phone, Away, Looking down, camera can't see you).
Selected cards have a thicker border and a tint, and mode cards also say **On** / **Off**.
The report timeline (Part 2) also uses labels or position, not colour alone.

## Layout and words
- One **primary** button per screen. Every other action is quieter (outlined, or an underlined text button).
- At most two short sentences of help text per screen. Longer help goes behind a small info button.
- Cards for choices (session length, modes, block sets, alarm sounds). A selected card must be obvious.
- Content is centred in wide windows (max 900px) and must work at 1024 × 600.
- Real empty states for a new user (Part 2).

## Study screen
- **Ready:** the clock (session length), one state line, length cards (25 / 50 / 90 / Custom), mode cards
  (Camera, Screen), Start. Task, place and calibration, block lists and the camera preview are one click away
  (underlined links under Start). The camera preview is hidden unless asked for; the camera keeps running.
- **Running:** state word with its shape, the clock, a progress bar, "to go", then Break / Pause / End session.
- **Break / Paused:** square, grey word, the clock, one primary button back to work.
- **Alarm:** the whole window turns red: triangle + a huge word + what to do, the clock, Pause and End session.
  Impossible to miss; you can still pause or end.

## Reports and History
- **One plain sentence** above a session report: "38 of 50 minutes focused. Your phone cost you 7 minutes."
  Minutes rounded down. No praise, no emojis, no advice. Camera off: says distractions were not checked.
- **Three numbers, everywhere** (session, a day, Today / 7 days / 30 days): Focused (time + % of total),
  Distractions (one count, breakdown line without zero kinds), Longest focus streak.
- **Timeline:** three labelled rows (Studying, Distracted, Break / Pause). Blocked sites and apps are thin marks in the
  Distracted row. Every block is reachable with Tab; hover or focus says what it was, when and how long.
- Details (time per activity, sites and apps) only behind "Show details".
- History bars are buttons; today's bar is labelled "Today".

## Empty states
Say what will appear and the one thing to do: History "No sessions yet" + Go to Study; Planner "No tasks yet",
"No routine blocks yet" (explains what a block is).

## To-do list (E4 Part 1)
- Three columns: lists (with count and time left) | the list | the side panel of the open task (only when open).
  The Planner may use up to 1180px wide so the panel fits; everything still works at 1024 × 600.
- Stats row under the title: four plain numbers separated by thin lines, no cards.
- A task row: round checkbox (tick drawn inside, short pop; none with reduced motion), title, a quiet line with
  subject, date, "repeats", steps; pomodoros done/estimated; ↑ ↓ appear on hover or focus; Start is a small quiet button.
- **Overdue is a word in bold, never red.** Red stays for alarms.
- Quick add chips use the accent tint; each has × to keep the word as text.
- Undo toast at the bottom centre for 5 seconds (dark on light, light on dark).

## Focus mode (E4 Part 2)
- The one screen with its own background: Black by default (Dark grey, Deep green, Deep blue; solid colours only).
  Always the dark palette, whatever the app theme. Red still only for alarms (the alarm takes over Focus mode too).
- Centre: subject (small caps) and task, the state word with its shape and the timer mode, the huge clock (tabular
  digits), dots (task pomodoros of its estimate, or the place in the set of 4), **Pause/Resume** as the one primary
  button, a quiet underlined **Stop**. Top right: a quiet **Exit**. Bottom: Timer, Sound, Background, Today's tasks
  (line icons with words). Popovers open above the bar; Today's tasks slides in from the right (no slide with reduced motion).
- Esc alone does nothing; holding it 2 s (a line at the top says "Keep holding Esc to leave…") asks "End the session?".
- Mini timer: 236 × 56, black, a dotted drag handle, the time with a word under it, one round pause/play button.

## Day view (E4 Part 3)
- Planner's fourth view. Hours on the left; two columns: Scheduled (weekly blocks tinted with the accent, tasks with a
  time dashed and outlined) and Done (sessions filled with the accent; they are buttons that open the report below).
- The time line scrolls on its own (6:00–22:00, wider when needed) and opens an hour before the first thing that day.
- Daily goal: a fifth number in the to-do stats row, "3 of 8".

## Bangla (E3 Part 4)
- Same font (Anek Bangla has both scripts). Bangla text is often longer: leave room (the to-do list column is 228px).
- Big clocks: each Bangla digit sits in a 0.77em box (`src/screens/ClockText.tsx`), because the Bangla digits are not
  equal width; English digits use tabular-nums as before.
- Language cards show each language in its own script: English, বাংলা.

## Settings
Sections separated by lines: Sessions, Alarm (sound cards, hear on click), App (theme cards), Your data.
**Advanced** (closed): Show Debug tab, browser connection, workstations, detection thresholds.
"Delete all my data" last, in red, with its own line of explanation.

## Camera problems
The Study state line shows a triangle and the cause in words (busy, blocked, not found), one line of advice and
**Try again**.

## First-run setup and tours
- Setup: Welcome → Camera → Aim → Calibrate → Browser (optional) → Practice (optional). One step at a time,
  "Step n of 6", Next / Back, "Skip setup" on every step. Aim and calibration say "Skip this step" until they are good.
- Aim check: Face, Hands, Desk, each with a shape (circle = OK, triangle = fix) and one short fix.
- Tour: everything dimmed except one real control; title, one sentence, Next / Back / Skip tour; Escape skips.
  At most 7 steps. Study tour after setup; Planner, History and Settings tours on their first visit; all from Help.
- Camera check before a session: ring + "Checking the camera… 3"; triangle + Fix it (primary) / Start anyway / Cancel.

## Access
- Everything works with the keyboard; focus is always visible (2px accent outline).
- Light and dark themes (Settings, or follow Windows).
- Windows "reduce motion" switches all animation off. Otherwise motion is short and calm
  (the alarm's triangle pulses slowly).
