#!/usr/bin/env bash
# Runs every test-copy check in TESTING.md order, each on a FRESH scratch test copy (port 47616), then stops it.
#   bash scripts/testing/run-all.sh <scratch folder>      (screenshots go to <scratch folder>/shots-<check>)
# Run from the project folder, after `npm run build`. Never uses the owner's real data (test-copy.sh refuses it).
set -u
ROOT="${1:-}"
test -n "$ROOT" || { echo "usage: run-all.sh <scratch folder>"; exit 1; }
mkdir -p "$ROOT" || exit 1
for c in power tabs todo board routines blocker focus day stats bangla extra debug-cam calib-sound sleepy-ui quiet; do
  DIR="$ROOT/tc-$c"
  rm -rf "$DIR" "$DIR.log"
  bash scripts/testing/test-copy.sh start "$DIR" || { echo "== $c: test copy did not start"; continue; }
  [ "$c" = power ] || node scripts/testing/seed.mjs > /dev/null || echo "== $c: seed failed"
  sleep 3 # the page settles after seeding (bangla-check's first click once came too early)
  echo "== $c"
  timeout 900 node "scripts/testing/$c-check.mjs" "$ROOT/shots-$c"
  bash scripts/testing/test-copy.sh stop
done
echo "== guard"
node scripts/testing/guard-check.mjs "$ROOT/guard"
