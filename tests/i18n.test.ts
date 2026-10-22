import { afterEach, describe, expect, it } from 'vitest';
import { fmtDate, n, plural, setLang, t, weekdayName } from '../electron/i18n';
import { BN } from '../electron/bn';
import { hms } from '../src/session/accounting';
import { hhmm } from '../electron/planner';
import { parseQuick } from '../src/state/todo';
// @ts-expect-error: a plain JavaScript helper shared with scripts/bangla-review.mjs
import { keys, untranslated } from '../scripts/i18n-keys.mjs';

afterEach(() => setLang('en'));
const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('languages', () => {
  it('English is the text itself; Bangla comes from the language file, with Bangla digits', () => {
    expect(t('Start')).toBe('Start');
    setLang('bn');
    expect(t('Start')).toBe(BN.Start);
    expect(n(2026)).toBe('২০২৬');
    expect(hms(3723)).toBe('১:০২:০৩');
    expect(hhmm(17 * 60 + 5)).toBe('১৭:০৫');
  });
  it('numbers filled in get the language’s digits; what you typed keeps its own', () => {
    setLang('bn');
    expect(t('Done: {title}.', { title: 'Chapter 3' })).toContain('Chapter 3');
    expect(t('{m} min', { m: 25 })).toContain('২৫');
    setLang('en');
    expect(t(plural(1, '{n} task due today', '{n} tasks due today'), { n: 1 })).toBe('1 task due today');
    expect(t(plural(3, '{n} task due today', '{n} tasks due today'), { n: 3 })).toBe('3 tasks due today');
  });
  it('dates and weekday names follow the language', () => {
    const d = new Date(2026, 9, 16);
    expect(fmtDate(d, { day: 'numeric', month: 'long' })).toBe('16 October');
    expect(weekdayName(0)).toBe('Sunday');
    setLang('bn');
    expect(fmtDate(d, { day: 'numeric', month: 'long' })).toBe('১৬ অক্টোবর');
    expect(weekdayName(5)).toBe('শুক্রবার');
  });
  it('quick add also understands Bangla date words and digits', () => {
    expect(parseQuick('Essay আগামীকাল ~৩', '2026-10-15', [])).toMatchObject({ title: 'Essay', due: '2026-10-16', pomos: 3 });
    expect(parseQuick('Lab শুক্রবার !১', '2026-10-15', [])).toMatchObject({ title: 'Lab', due: '2026-10-16', priority: 1 });
  });
});

describe('the language file', () => {
  const used: Map<string, Set<string>> = keys();
  it('every English text on screen has a Bangla line, with the same {placeholders}', () => {
    const missing = [...used.keys()].filter((k) => !(k in BN));
    expect(missing).toEqual([]);
    const wrong = [...used.keys()].filter((k) => k in BN && holes(k) !== holes(BN[k]));
    expect(wrong).toEqual([]);
  });
  it('no Bangla line is left over for a text that is gone', () => {
    expect(Object.keys(BN).filter((k) => !used.has(k))).toEqual([]);
  });
  it('no screen text bypasses the language files (the Debug tab stays English)', () => {
    expect(untranslated()).toEqual([]);
  });
});
