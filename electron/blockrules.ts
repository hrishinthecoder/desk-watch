// Blocker: a warning first, then the alarm (Stage G4, owner 2026-10-21). No admin rights, no system files: the
// browser extension and the foreground-app watcher (electron/screen.ts) stay as they are. Pure; tested in
// tests/blockrules.test.ts.
export const WARN_MS = 10_000; // a blocked app in front: a warning first, the alarm after 10 s
export const RETURN_MS = 120_000; // back to a blocked site within 2 minutes of its block page → the alarm
export const SITE_ALARM_VISITS = 3; // the 3rd blocked visit in one session (any blocked site) → the alarm

export type Visit = { host: string; at: number };
// A blocked site was just opened (the extension shows its block page). `before`: this session's earlier blocked visits.
export function siteVerdict(before: Visit[], host: string, at: number): 'warn' | 'alarm' {
  if (before.length + 1 >= SITE_ALARM_VISITS) return 'alarm';
  return before.some((v) => v.host === host && at - v.at <= RETURN_MS) ? 'alarm' : 'warn';
}
// A blocked app in front since `since`: the warning with the time left, then the alarm.
export function appVerdict(since: number, now: number): { state: 'warn' | 'alarm'; left: number } {
  const left = since + WARN_MS - now;
  return left > 0 ? { state: 'warn', left } : { state: 'alarm', left: 0 };
}
// The extension's own "Back to work" page (shown instead of a blocked site).
export const isBlockPage = (url: string) => /^(chrome-)?extension:\/\/[^/]+\/blocked\.html(\?|$)/.test(url);
