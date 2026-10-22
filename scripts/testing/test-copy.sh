#!/usr/bin/env bash
# Start or stop an isolated test copy of Desk Watch (see CLAUDE.md, "Testing without touching the owner's data").
#   bash scripts/testing/test-copy.sh start <data folder>   fresh or existing folder; fake camera; ports 47616 / 9333 / 9334
# The fake camera plays a generated video (moving grey bars, no camera images; scripts/testing/fake-video.mjs).
# Chromium's built-in fake camera kept vanishing from the device list (2026-10-14/15), the file-based one did not.
#   bash scripts/testing/test-copy.sh stop                  stops ONLY the copy listening on 47616 (by PID, never by name)
# Run from the project folder. The owner's real Desk Watch (port 47615) is never touched.
set -u
stop() {
  local pid
  pid=$(netstat -ano | grep -E "127.0.0.1:47616 .*LISTENING" | awk '{print $5}' | head -1)
  if [ -n "$pid" ]; then taskkill //PID "$pid" //T //F > /dev/null && echo "stopped test copy $pid"; sleep 2; fi
}
if [ "${1:-}" = stop ]; then stop; exit 0; fi
if [ "${1:-}" != start ] || [ -z "${2:-}" ]; then echo "usage: test-copy.sh start <data folder> | stop"; exit 1; fi
# Safety (2026-10-15): when Electron cannot use --user-data-dir it silently falls back to the REAL data folder
# (%APPDATA%\Desk Watch). That happened once ("$SP" was empty, so the folder became "/tc-focus" under Program Files,
# which cannot be written). So: the folder must be creatable and writable, and must not be the real one.
case "$(cygpath -w "$2" 2>/dev/null)" in *"\AppData\Roaming\Desk Watch"*) echo "REFUSED: that is the real Desk Watch data folder"; exit 1;; esac
if ! mkdir -p "$2" 2>/dev/null || ! touch "$2/.test-copy" 2>/dev/null; then echo "REFUSED: cannot write to $2 (Electron would fall back to the real data)"; exit 1; fi
stop
VIDEO="${2%/}.y4m"
[ -f "$VIDEO" ] || node scripts/testing/fake-video.mjs "$VIDEO" > /dev/null
DESKWATCH_PORT=47616 nohup npx electron . --user-data-dir="$2" --remote-debugging-address=127.0.0.1 --remote-debugging-port=9333 \
  --inspect=9334 --use-fake-device-for-media-stream --use-fake-ui-for-media-stream \
  "--use-file-for-fake-video-capture=$(cygpath -w "$VIDEO")" > "${2%/}.log" 2>&1 &
for _ in $(seq 1 40); do
  if node -e "fetch('http://127.0.0.1:9333/json').then(() => process.exit(0), () => process.exit(1))" 2>/dev/null; then
    sleep 5
    # Second check: ask the running copy where its data really is; stop it at once if that is not the given folder.
    if [ -n "$(netstat -ano | grep -E '127.0.0.1:9334 .*LISTENING')" ] && ! node scripts/testing/where.mjs "$2"; then stop; exit 1; fi
    echo "test copy up"; exit 0
  fi
  sleep 1
done
echo "test copy did not start"; exit 1
