// Lists the English texts that have no Bangla line yet, and the Bangla lines whose English text is gone
// (the two things tests/i18n.test.ts checks), so a change can add and remove them in one go.
//   node scripts/bangla-missing.mjs        (run from the project folder)
import { readFileSync } from 'node:fs';
import { keys, untranslated } from './i18n-keys.mjs';

const bn = readFileSync('electron/bn.ts', 'utf8');
const inBn = new Set([...bn.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((m) => JSON.parse(`"${m[1]}"`)));
const used = keys();
console.log('missing Bangla:', JSON.stringify([...used.keys()].filter((k) => !inBn.has(k)), null, 1));
console.log('left over in bn.ts:', JSON.stringify([...inBn].filter((k) => !used.has(k)), null, 1));
console.log('not through t():', JSON.stringify(untranslated(), null, 1));
