import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIST, isBrowser, listForApp, listForSite, normalizeApp, normalizeSite, onlyAddsBlocked, parseEntry, QUICK_ADD,
  quickOn, siteOf, toggleQuick, type Entry,
} from '../electron/blocklist';

const site = (list: Entry['list'], pattern: string): Entry => ({ list, kind: 'site', pattern });
const app = (list: Entry['list'], pattern: string): Entry => ({ list, kind: 'app', pattern });

describe('sites', () => {
  it('a domain matches itself and its subdomains, not look-alikes', () => {
    const l = [site('blocked', 'instagram.com')];
    expect(listForSite(l, 'https://instagram.com/')).toBe('blocked');
    expect(listForSite(l, 'https://www.instagram.com/reel/123')).toBe('blocked');
    expect(listForSite(l, 'https://m.instagram.com')).toBe('blocked');
    expect(listForSite(l, 'https://notinstagram.com')).toBe(null);
    expect(listForSite(l, 'https://instagram.com.evil.net')).toBe(null);
  });
  it('a pattern with a path blocks only that part of the site', () => {
    const l = [site('blocked', 'youtube.com/shorts')];
    expect(listForSite(l, 'https://www.youtube.com/shorts/abc')).toBe('blocked');
    expect(listForSite(l, 'https://www.youtube.com/shorts')).toBe('blocked');
    expect(listForSite(l, 'https://www.youtube.com/shortsfake')).toBe(null);
    expect(listForSite(l, 'https://www.youtube.com/watch?v=1')).toBe(null);
  });
  it('the more specific entry wins; equal length counts as productive', () => {
    const l = [site('productive', 'youtube.com'), site('blocked', 'youtube.com/shorts')];
    expect(listForSite(l, 'https://youtube.com/shorts/1')).toBe('blocked');
    expect(listForSite(l, 'https://youtube.com/watch?v=1')).toBe('productive');
    expect(listForSite([site('blocked', 'a.com'), site('productive', 'a.com')], 'https://a.com')).toBe('productive');
  });
  it('only web pages are checked (not the browser own pages or files)', () => {
    expect(siteOf('chrome://settings')).toBe(null);
    expect(siteOf('file:///C:/x.html')).toBe(null);
    expect(siteOf('not a url')).toBe(null);
    expect(listForSite(DEFAULT_LIST, 'chrome-extension://abc/blocked.html')).toBe(null);
  });
  it('typed entries are cleaned up; junk is refused', () => {
    expect(normalizeSite(' https://www.Instagram.com/ ')).toBe('instagram.com');
    expect(normalizeSite('YouTube.com/Shorts/')).toBe('youtube.com/shorts');
    expect(normalizeSite('reddit.com?x=1')).toBe('reddit.com');
    expect(normalizeSite('hello')).toBe('');
    expect(normalizeSite('')).toBe('');
  });
  it('defaults block the listed social sites and count YouTube as productive', () => {
    expect(listForSite(DEFAULT_LIST, 'https://www.reddit.com/r/x')).toBe('blocked');
    expect(listForSite(DEFAULT_LIST, 'https://x.com/home')).toBe('blocked');
    expect(listForSite(DEFAULT_LIST, 'https://www.youtube.com/watch?v=1')).toBe('productive');
    expect(listForSite(DEFAULT_LIST, 'https://en.wikipedia.org')).toBe(null);
  });
});

describe('Stage D2: editing', () => {
  it('one box: web addresses become sites, other names become apps', () => {
    expect(parseEntry('reddit.com')).toEqual({ kind: 'site', pattern: 'reddit.com' });
    expect(parseEntry(' https://www.YouTube.com/shorts/ ')).toEqual({ kind: 'site', pattern: 'youtube.com/shorts' });
    expect(parseEntry('Discord')).toEqual({ kind: 'app', pattern: 'discord' });
    expect(parseEntry('steam.exe')).toEqual({ kind: 'app', pattern: 'steam' });
    expect(parseEntry('Epic Games Launcher')).toEqual({ kind: 'app', pattern: 'epic games launcher' });
    expect(parseEntry('   ')).toBe(null);
    expect(parseEntry('C:\\Games\\x.exe')).toBe(null);
  });
  it('a quick-add card toggles all its sites; X covers x.com and twitter.com', () => {
    const x = QUICK_ADD.find((c) => c.name === 'X')!;
    const on = toggleQuick([], x);
    expect(on).toEqual([site('blocked', 'x.com'), site('blocked', 'twitter.com')]);
    expect(quickOn(on, x)).toBe(true);
    expect(quickOn([site('blocked', 'x.com')], x)).toBe(false); // half on counts as off...
    expect(toggleQuick([site('blocked', 'x.com')], x)).toHaveLength(2); // ...and a tap adds only the missing one
    expect(toggleQuick(on, x)).toEqual([]);
    expect(quickOn([site('productive', 'x.com'), site('productive', 'twitter.com')], x)).toBe(false);
  });
  it('YouTube Shorts is blocked while the rest of YouTube stays productive', () => {
    const l = toggleQuick(DEFAULT_LIST, QUICK_ADD.find((c) => c.name === 'YouTube Shorts')!);
    expect(listForSite(l, 'https://www.youtube.com/shorts/abc')).toBe('blocked');
    expect(listForSite(l, 'https://www.youtube.com/watch?v=1')).toBe('productive');
  });
  it('during a session the list may only gain blocked entries', () => {
    const before = [site('blocked', 'a.com'), site('productive', 'b.com')];
    expect(onlyAddsBlocked(before, [...before, app('blocked', 'steam')])).toBe(true);
    expect(onlyAddsBlocked(before, before)).toBe(true);
    expect(onlyAddsBlocked(before, [before[1]])).toBe(false); // removed one
    expect(onlyAddsBlocked(before, [...before, site('productive', 'a.com')])).toBe(false); // would unblock a.com
    expect(onlyAddsBlocked(before, [site('productive', 'a.com'), before[1]])).toBe(false); // moved to the other list
  });
});

describe('apps', () => {
  it('matches the program name or its .exe, any case', () => {
    const l = [app('blocked', 'discord')];
    expect(listForApp(l, 'Discord', 'Discord.exe')).toBe('blocked');
    expect(listForApp(l, 'Something', 'DISCORD.EXE')).toBe('blocked');
    expect(listForApp(l, 'Discord Helper', 'helper.exe')).toBe(null);
    expect(normalizeApp(' Steam.exe ')).toBe('steam');
  });
  it('knows the common browsers', () => {
    expect(isBrowser('chrome.exe')).toBe(true);
    expect(isBrowser('msedge.exe')).toBe(true);
    expect(isBrowser('notepad.exe')).toBe(false);
  });
});
