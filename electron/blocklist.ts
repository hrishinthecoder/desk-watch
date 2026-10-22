// Block and productive lists for Blocker mode (Stage D). Pure; used by the main process and the Study tab,
// tested in tests/blocklist.test.ts.
//   site "instagram.com"      matches instagram.com and any subdomain (www., m.), not notinstagram.com
//   site "youtube.com/shorts" matches that address and everything under it (a URL prefix)
//   app  "discord"            matches the program named Discord or Discord.exe
// When a site is on both lists, the more specific (longer) entry wins; a tie counts as productive.

export type ListName = 'blocked' | 'productive';
export type Kind = 'site' | 'app';
export type Entry = { list: ListName; kind: Kind; pattern: string };

export const DEFAULT_LIST: Entry[] = [
  ...['instagram.com', 'facebook.com', 'tiktok.com', 'x.com', 'twitter.com', 'reddit.com', 'netflix.com']
    .map((pattern) => ({ list: 'blocked' as const, kind: 'site' as const, pattern })),
  { list: 'productive', kind: 'site', pattern: 'youtube.com' },
];

// Programs counted as web browsers (for "is the extension missing?" and per-site time).
export const BROWSERS = ['chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi', 'arc'];

const stripWww = (h: string) => h.replace(/^www\./, '');

// "https://www.Instagram.com/reel/1/" -> "instagram.com/reel/1"; junk -> ''
export function normalizeSite(p: string): string {
  const s = p.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  return /^[a-z0-9.-]+\.[a-z0-9-]+(\/[^\s]*)?$/.test(s) ? stripWww(s) : '';
}
export const normalizeApp = (p: string) => p.trim().toLowerCase().replace(/\.exe$/, '');

// Host + path of a web address, without www. Only http(s) pages; '' for anything else.
export function siteOf(url: string): { host: string; path: string } | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return { host: stripWww(u.hostname.toLowerCase()), path: u.pathname.replace(/\/+$/, '').toLowerCase() };
  } catch {
    return null;
  }
}

function siteMatches(pattern: string, host: string, path: string) {
  const slash = pattern.indexOf('/');
  const pHost = slash < 0 ? pattern : pattern.slice(0, slash);
  const pPath = slash < 0 ? '' : pattern.slice(slash);
  const hostOk = host === pHost || host.endsWith('.' + pHost);
  return hostOk && (pPath === '' || path === pPath || path.startsWith(pPath + '/'));
}

function decide(entries: Entry[], matches: (e: Entry) => boolean): ListName | null {
  let best: Entry | null = null;
  for (const e of entries) {
    if (!matches(e)) continue;
    if (!best || e.pattern.length > best.pattern.length || (e.pattern.length === best.pattern.length && e.list === 'productive')) best = e;
  }
  return best?.list ?? null;
}

export const listForSite = (entries: Entry[], url: string): ListName | null => {
  const s = siteOf(url);
  return s ? decide(entries.filter((e) => e.kind === 'site'), (e) => siteMatches(e.pattern, s.host, s.path)) : null;
};

export const listForApp = (entries: Entry[], name: string, exe: string): ListName | null => {
  const n = normalizeApp(name), x = normalizeApp(exe);
  return decide(entries.filter((e) => e.kind === 'app'), (e) => e.pattern === n || e.pattern === x);
};

export const isBrowser = (exe: string) => BROWSERS.includes(normalizeApp(exe));

// ---- Stage D2: editing on the Study tab ----

// One "Add site or app" box: a web address becomes a site, anything else that could be a
// program name becomes an app. "steam.exe" looks like a web address, so .exe is checked first.
export function parseEntry(text: string): { kind: Kind; pattern: string } | null {
  const t = text.trim();
  if (!/\.exe$/i.test(t)) {
    const site = normalizeSite(t);
    if (site) return { kind: 'site', pattern: site };
  }
  const app = normalizeApp(t);
  return app && /^[^\\/:*?"<>|]{1,100}$/.test(app) ? { kind: 'app', pattern: app } : null;
}

// Quick-add cards. A card is "on" when all its sites are on the blocked list.
export const QUICK_ADD: { name: string; sites: string[] }[] = [
  { name: 'Instagram', sites: ['instagram.com'] },
  { name: 'Facebook', sites: ['facebook.com'] },
  { name: 'TikTok', sites: ['tiktok.com'] },
  { name: 'YouTube Shorts', sites: ['youtube.com/shorts'] },
  { name: 'X', sites: ['x.com', 'twitter.com'] },
  { name: 'Reddit', sites: ['reddit.com'] },
  { name: 'Netflix', sites: ['netflix.com'] },
];

const isBlockedSite = (entries: Entry[], pattern: string) =>
  entries.some((e) => e.list === 'blocked' && e.kind === 'site' && e.pattern === pattern);
export const quickOn = (entries: Entry[], card: { sites: string[] }) => card.sites.every((p) => isBlockedSite(entries, p));
export function toggleQuick(entries: Entry[], card: { sites: string[] }): Entry[] {
  if (quickOn(entries, card)) return entries.filter((e) => !(e.list === 'blocked' && e.kind === 'site' && card.sites.includes(e.pattern)));
  return [...entries, ...card.sites.filter((p) => !isBlockedSite(entries, p)).map((pattern) => ({ list: 'blocked' as const, kind: 'site' as const, pattern }))];
}

// During a session the list may only grow, and only with blocked entries: a new "productive"
// entry could unblock a site (productive wins ties), so it counts as a change, not an addition.
const same = (a: Entry, b: Entry) => a.list === b.list && a.kind === b.kind && a.pattern === b.pattern;
export const onlyAddsBlocked = (before: Entry[], after: Entry[]) =>
  before.every((b) => after.some((a) => same(a, b))) && after.every((a) => a.list === 'blocked' || before.some((b) => same(a, b)));
