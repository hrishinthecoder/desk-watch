// Finds the app's texts in the source (Stage E3 Part 4). Used by tests/i18n.test.ts and scripts/bangla-review.mjs.
//  - keys(): every English text passed to t(), tr(), tk() or plural(), with the files it is in.
//  - untranslated(): screen text that is NOT passed through t(): JSX text and placeholder/title/aria-label/alt
//    attributes with English words. The Debug tab stays English (owner, 2026-10-14).
// Run from the project folder.  node scripts/i18n-keys.mjs  → prints what is still untranslated.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['Debug.tsx', 'icons.tsx', 'bn.ts', 'i18n.ts', 'guard.ts', 'preload.ts']);
export function sourceFiles() {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.tsx?$/.test(e.name) && !SKIP.has(e.name) ? [join(d, e.name)] : []));
  return [...walk('src'), ...walk('electron')];
}
const str = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
const unq = (m, i) => (m[i] ?? m[i + 1]).replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1');

export function keys() {
  const out = new Map(); // text → files
  const add = (k, f) => { if (!out.has(k)) out.set(k, new Set()); out.get(k).add(f.replace(/\\/g, '/')); };
  for (const f of sourceFiles()) {
    const c = readFileSync(f, 'utf8');
    for (const m of c.matchAll(new RegExp(String.raw`\b(?:t|tr|tk)\(\s*(?:${str})`, 'g'))) add(unq(m, 1), f);
    // t(cond ? 'a' : 'b')
    for (const m of c.matchAll(new RegExp(String.raw`\b(?:t|tr|tk)\(\s*[^'"()?]*\?\s*(?:${str})\s*:\s*(?:${str})`, 'g'))) { add(unq(m, 1), f); add(unq(m, 3), f); }
    for (const m of c.matchAll(new RegExp(String.raw`\bplural\([^,()]*(?:\([^()]*\))?[^,()]*,\s*(?:${str})\s*,\s*(?:${str})`, 'g'))) { add(unq(m, 1), f); add(unq(m, 3), f); }
  }
  return out;
}

export function untranslated() {
  const found = [];
  for (const f of sourceFiles().filter((x) => x.endsWith('.tsx'))) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const code = line.replace(/\{\/\*.*?\*\/\}/g, '');
      // JSX text between tags: >Some words<   (not inside {…})
      for (const m of code.matchAll(/(?<!=)>([^<>{}]*[A-Za-z]{2,}[^<>{}]*)</g)) { // (not the > of an arrow =>)
        const txt = m[1].trim();
        if (/;|=>|&&|\|\||\bPromise\b|\(e:|Date\.now/.test(txt)) continue; // TypeScript types and code, not text
        if (txt && !/^[\w.-]+$/.test(txt.replace(/\s/g, '')) || /[A-Za-z]{2,}\s+[A-Za-z]/.test(txt) || /^[A-Z][a-z]+$/.test(txt)) found.push(`${f}:${i + 1}  text  ${txt}`);
      }
      for (const m of code.matchAll(/\b(placeholder|title|aria-label|alt)="([^"]*[A-Za-z]{2,}[^"]*)"/g)) found.push(`${f}:${i + 1}  ${m[1]}  ${m[2]}`);
    });
  }
  return found;
}

if (process.argv[1]?.endsWith('i18n-keys.mjs')) {
  const u = untranslated();
  const byFile = {};
  for (const x of u) { const f = x.split(':')[0]; byFile[f] = (byFile[f] ?? 0) + 1; }
  console.log(Object.entries(byFile).sort((a, b) => b[1] - a[1]).map(([f, k]) => `${String(k).padStart(4)} ${f}`).join('\n'));
  if (process.argv[2]) console.log(u.filter((x) => x.includes(process.argv[2])).join('\n'));
  console.log(`${u.length} untranslated, ${keys().size} texts`);
}
