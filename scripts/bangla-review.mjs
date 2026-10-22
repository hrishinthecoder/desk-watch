// The owner's Bangla review file (Stage E3 Part 4). Run from the project folder.
//   node scripts/bangla-review.mjs          writes docs/BANGLA_REVIEW.md: every Bangla line next to its English
//   node scripts/bangla-review.mjs import   reads the (corrected) Bangla column back into electron/bn.ts
// Only the Bangla column is read back; keep the {placeholders} (the test checks them).
import { readFileSync, writeFileSync } from 'node:fs';
import { keys } from './i18n-keys.mjs';

const FILE = 'docs/BANGLA_REVIEW.md';
const BN_FILE = 'electron/bn.ts';
const cell = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
const uncell = (s) => s.trim().replace(/<br>/g, '\n').replace(/\\\|/g, '|');

// electron/bn.ts has one entry per line:   "English": "Bangla",
const ENTRY = /^\s*("(?:[^"\\]|\\.)*"): ("(?:[^"\\]|\\.)*"),\s*$/;
function readBn() {
  const map = new Map();
  for (const line of readFileSync(BN_FILE, 'utf8').split('\n')) {
    const m = ENTRY.exec(line);
    if (m) map.set(JSON.parse(m[1]), JSON.parse(m[2]));
  }
  return map;
}

if (process.argv[2] === 'import') {
  const fixed = new Map();
  for (const line of readFileSync(FILE, 'utf8').split('\n')) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    fixed.set(uncell(cells[2]), uncell(cells[3]));
  }
  let changed = 0;
  const out = readFileSync(BN_FILE, 'utf8').split('\n').map((line) => {
    const m = ENTRY.exec(line);
    if (!m) return line;
    const en = JSON.parse(m[1]), bn = JSON.parse(m[2]);
    const nb = fixed.get(en);
    if (nb === undefined || nb === bn) return line;
    changed++;
    return line.replace(m[2], JSON.stringify(nb));
  });
  writeFileSync(BN_FILE, out.join('\n'));
  console.log(`${changed} Bangla line(s) updated in ${BN_FILE}. Now run npm test (it checks the placeholders).`);
} else {
  const bn = readBn();
  const where = keys();
  const screen = (f) => f.replace(/^.*\//, '').replace(/\.tsx?$/, '');
  const rows = [...bn.entries()].map(([en, b], i) => `| ${i + 1} | ${[...(where.get(en) ?? [])].map(screen).join(', ')} | ${cell(en)} | ${cell(b)} |`);
  writeFileSync(FILE, `# Bangla review (Desk Watch)

Every Bangla line in the app, next to its English. **Correct only the last column (বাংলা)** and keep:
- the words in curly brackets exactly as they are (\`{name}\`, \`{n}\`, \`{time}\`…): the app fills them in;
- "Desk Watch", Chrome, Edge, Windows and web addresses in English.

Numbers are turned into Bangla digits by the app itself, and dates and weekday names come from the built-in Bangla
calendar names, so they are not in this list. The Debug tab stays in English.

When you are done, tell Claude, or run \`node scripts/bangla-review.mjs import\` and then \`npm test\`.
"Where" is the file the line is used in (Study = Study tab, Todo = the to-do list, Focus = Focus mode, and so on).

${bn.size} lines. Made by \`node scripts/bangla-review.mjs\`.

| # | Where | English | বাংলা |
|---|---|---|---|
${rows.join('\n')}
`);
  console.log(`wrote ${FILE}: ${bn.size} lines`);
}
