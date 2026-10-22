#!/usr/bin/env bash
# Tries to reproduce the test-copy freeze during seeding (open issue in CLAUDE.md): starts a fresh TEST COPY and seeds
# it, N times. When seeding fails or takes too long, it keeps the evidence before stopping the copy:
# the seed step log, hang-probe.mjs output, Windows' "Responding" flag and CPU time of the copy's processes, the copy's log.
#   bash scripts/testing/seed-repro.sh <scratch folder> [N=10]
# Run from the project folder. Test copies only (test-copy.sh refuses the real data folder).
set -u
ROOT="${1:-}"
test -n "$ROOT" || { echo "usage: seed-repro.sh <scratch folder> [N]"; exit 1; }
N="${2:-10}"
mkdir -p "$ROOT" || exit 1
for i in $(seq 1 "$N"); do
  DIR="$ROOT/tc-repro"
  rm -rf "$DIR" "$DIR.log"
  bash scripts/testing/test-copy.sh start "$DIR" > /dev/null || { echo "run $i: test copy did not start"; continue; }
  LOG="$ROOT/seed-$i.log"
  START=$(date +%s)
  SEED_LOG="$LOG" CDP_TIMEOUT_MS=30000 timeout 150 node scripts/testing/seed.mjs > "$ROOT/seed-$i.out" 2>&1
  CODE=$?
  echo "run $i: seed exit $CODE in $(( $(date +%s) - START )) s, last step: $(tail -1 "$LOG" 2>/dev/null)"
  if [ "$CODE" != 0 ]; then
    echo "  --- FROZE: evidence kept in $ROOT/freeze-$i.txt"
    {
      echo "seed output:"; cat "$ROOT/seed-$i.out"; echo; echo "seed steps:"; cat "$LOG"; echo
      echo "probe:"; node scripts/testing/hang-probe.mjs
      PID=$(netstat -ano | grep -E "127.0.0.1:47616 .*LISTENING" | awk '{print $5}' | head -1)
      echo "test copy main PID: $PID"
      powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.ParentProcessId -eq $PID -or \$_.ProcessId -eq $PID } | ForEach-Object { \$p = Get-Process -Id \$_.ProcessId -ErrorAction SilentlyContinue; '{0} {1} responding={2} cpu={3:n1}s threads={4} {5}' -f \$_.ProcessId, \$_.Name, \$p.Responding, \$p.CPU, \$p.Threads.Count, (\$_.CommandLine -replace '.*--type=([a-z-]+).*', '\$1') }"
      echo "copy log:"; cat "$DIR.log"
    } > "$ROOT/freeze-$i.txt" 2>&1
  fi
  bash scripts/testing/test-copy.sh stop > /dev/null 2>&1
done
