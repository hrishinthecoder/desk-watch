// Test copies must never touch the real data (incident 2026-10-15: Electron could not create the test folder and
// silently used the real one). Checked at start, before the database opens; Desk Watch quits if there is a problem.
// Pure, unit-tested in tests/guard.test.ts.
import { posix, win32 } from 'node:path';

// Flags only test copies use (Claude's test-copy.sh, replays on a scratch folder).
const TEST_FLAG = /^--(remote-debugging-port|remote-debugging-address|inspect(-brk)?|use-fake-device-for-media-stream|use-fake-ui-for-media-stream|use-file-for-fake-video-capture)(=|$)/;

// The problem, or null when it is safe to open the data in `userData` (Electron's real data folder).
export function dataDirProblem(argv: string[], env: Record<string, string | undefined>, userData: string, platform: string = process.platform): string | null {
  const dirs = argv.flatMap((a, i) => (a.startsWith('--user-data-dir=') ? [a.slice('--user-data-dir='.length)] : a === '--user-data-dir' ? [argv[i + 1] ?? ''] : []));
  const testCopy = argv.some((a) => TEST_FLAG.test(a)) || !!env.DESKWATCH_PORT;
  if (!dirs.length) return testCopy ? 'A test copy was started without its own data folder (--user-data-dir).' : null;
  const path = platform === 'win32' ? win32 : posix;
  const norm = (p: string) => { const r = path.resolve(p.replace(/^"|"$/g, '')).replace(/[\\/]+$/, ''); return platform === 'win32' ? r.toLowerCase() : r; };
  const wrong = dirs.find((d) => !d.trim() || norm(d) !== norm(userData));
  return wrong === undefined ? null : `Desk Watch was told to keep its data in "${wrong}", but would use "${userData}". It will not fall back to another folder.`;
}
