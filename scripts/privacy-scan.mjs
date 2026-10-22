// Looks for personal data in the repo AND its whole git history before anything is published (Stage F, owner 2026-10-22).
// Read-only: it never changes files or history. Prints a report; run it again right before pushing.
//   node scripts/privacy-scan.mjs
// Checks every commit of every branch:
//   1. file names that should never be public: databases, backups, clips, logs, dataset crops, keys, .env;
//   2. every image ever committed (to look at by eye);
//   3. big files (over 1 MB);
//   4. text added in any commit: the Windows user folder, e-mail addresses, tokens and private keys;
//   5. the names and e-mails on the commits themselves (they become public with the history).
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { maxBuffer: 1 << 30 }).toString('utf8');
const report = (title, rows) => {
  console.log(`\n## ${title}: ${rows.length ? rows.length : 'none'}`);
  for (const r of rows.slice(0, 60)) console.log('  ' + r);
  if (rows.length > 60) console.log(`  … and ${rows.length - 60} more`);
};

const commits = git('rev-list', '--all').trim().split('\n').filter(Boolean);
console.log(`# Privacy scan: ${commits.length} commits, all branches`);

// 1–3. every path and blob ever in history
const objects = git('rev-list', '--objects', '--all').trim().split('\n').map((l) => { const i = l.indexOf(' '); return i < 0 ? null : [l.slice(0, i), l.slice(i + 1)]; }).filter(Boolean);
const sizes = new Map(execFileSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], { input: objects.map(([o]) => o).join('\n'), maxBuffer: 1 << 30 })
  .toString().trim().split('\n').map((l) => l.split(' ')).filter(([, t]) => t === 'blob').map(([o, , s]) => [o, Number(s)]));
const blobs = objects.filter(([o]) => sizes.has(o));
const paths = [...new Set(blobs.map(([, p]) => p))].sort();
const now = new Set(git('ls-files').trim().split('\n'));
const tag = (p) => (now.has(p) ? p : `${p}  (only in old commits)`);
report('Files that should never be public (db, backup, clip, log, dataset, key, .env)',
  paths.filter((p) => /\.(db|sqlite3?|db-wal|db-shm|webm|mp4|log|pem|key|pfx|p12)$|\.bak|(^|\/)(backups|clips|dataset)\/|(^|\/)\.env|deskwatch\.db/i.test(p)).map(tag));
report('Images ever committed (look at each by eye)', paths.filter((p) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(p)).map(tag));
report('Files over 1 MB', blobs.filter(([o]) => sizes.get(o) > 1e6).map(([o, p]) => `${(sizes.get(o) / 1e6).toFixed(1)} MB  ${tag(p)}`)
  .filter((v, i, a) => a.indexOf(v) === i));

// 4. text added by any commit
const checks = [
  ['Windows user folder (C:\\Users\\<name>)', /[A-Za-z]:[\\/]+Users[\\/]+(?!Public\b|<|\$|%)[^\\/\s"'`<>]+|\/c\/Users\/[^/\s"'`]+|\b[A-Z]{6}~\d\b/gi],
  ['E-mail addresses', /[\w.+-]+@[\w-]+\.[\w.-]+/g],
  ['Tokens and keys', /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|xox[abprs]-[\w-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{20,}/g],
];
const found = checks.map(() => new Map()); // text → { files, first commit }
let commit = '', file = '';
for (const line of git('log', '--all', '-p', '--no-color', '--no-ext-diff', '--format=@@commit %h', '--unified=0').split('\n')) {
  if (line.startsWith('@@commit ')) { commit = line.slice(9); continue; }
  if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
  if (!line.startsWith('+') || line.startsWith('+++')) continue;
  checks.forEach(([, re], i) => {
    for (const m of line.matchAll(re)) {
      const k = m[0].replace(/\s+$/, '');
      const e = found[i].get(k) ?? { files: new Set(), commit };
      e.files.add(file); e.commit = commit; // git log is newest first, so the last one seen is the oldest
      found[i].set(k, e);
    }
  });
}
checks.forEach(([title], i) => report(title, [...found[i]].map(([k, e]) => `${k}  — ${e.files.size} file(s), e.g. ${[...e.files].slice(0, 3).join(', ')}; first in ${e.commit}`)));

// 5. who is on the commits
report('Names and e-mails on the commits (public with the history)',
  [...new Set(git('log', '--all', '--format=author: %an <%ae>%ncommitter: %cn <%ce>').trim().split('\n'))]);
report('Co-author lines', [...new Set(git('log', '--all', '--format=%(trailers:key=Co-Authored-By,valueonly)').trim().split('\n').filter(Boolean))]);
console.log('\nNothing was changed. Rewriting history is a separate step the owner decides on.');
