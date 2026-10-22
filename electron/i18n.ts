// Languages (Stage E3 Part 4): English and Bangla. Shared by the main process and the page.
// The English text itself is the key (like gettext): t('Start'). Bangla lines live in electron/bn.ts; a test checks that
// every t()/tk() text has one, with the same {placeholders}. Bangla mode also uses Bangla digits and Bangla dates.
// The Debug tab is not translated (owner, 2026-10-14). Unit-tested in tests/i18n.test.ts.
import { BN } from './bn.js';

export type Lang = 'en' | 'bn';
export const LANGS: [Lang, string][] = [['en', 'English'], ['bn', 'বাংলা']];
let lang: Lang = 'en';
export const setLang = (l: unknown) => { lang = l === 'bn' ? 'bn' : 'en'; };
export const getLang = () => lang;

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
// Digits in the current language (Bangla mode: ০-৯). Only for numbers and texts the app makes, never for what you typed.
export const n = (x: number | string, l: Lang = lang) => (l === 'bn' ? String(x).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : String(x));

// Translates an English text. {name} is filled from vars: numbers get the language's digits, other values are kept
// exactly (a task title you typed keeps its own digits).
export function t(en: string, vars?: Record<string, string | number>): string {
  const s = n(lang === 'bn' ? BN[en] ?? en : en);
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? (typeof vars[k] === 'number' ? n(vars[k]) : String(vars[k])) : m)) : s;
}
// Marks a text for translation where it is defined (a table of labels); t() translates it where it is shown.
export const tk = (en: string) => en;
// One or many: t(plural(count, '{n} task', '{n} tasks'), { n: count }).
export const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export const locale = () => (lang === 'bn' ? 'bn-BD' : 'en-GB');
// Dates follow the language (bn-BD: Bangla month and day names, Bangla digits).
export const fmtDate = (d: Date | number, o: Intl.DateTimeFormatOptions) => new Date(d).toLocaleDateString(locale(), o);
// A weekday's name in the chosen language (0 = Sunday … 6 = Saturday, like Date.getDay()).
export const weekdayName = (day: number, style: 'long' | 'short' = 'long') => fmtDate(new Date(2026, 9, 11 + day), { weekday: style });
export const fmtTime = (d: Date | number) => new Date(d).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false });
