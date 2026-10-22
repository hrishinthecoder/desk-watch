import { describe, expect, it } from 'vitest';
import { appVerdict, isBlockPage, siteVerdict, WARN_MS } from '../electron/blockrules';

const S = 1000, MIN = 60 * S;
describe('blocker: a warning first, then the alarm (G4)', () => {
  it('a blocked app: the warning for 10 s, counting down, then the alarm', () => {
    expect(appVerdict(0, 0)).toEqual({ state: 'warn', left: WARN_MS });
    expect(appVerdict(0, 9.9 * S).state).toBe('warn');
    expect(appVerdict(0, 10 * S)).toEqual({ state: 'alarm', left: 0 });
    expect(appVerdict(0, 60 * S).state).toBe('alarm');
  });
  it('a blocked site: a warning the first time', () => {
    expect(siteVerdict([], 'youtube.com', 0)).toBe('warn');
  });
  it('back to the same site within 2 minutes of its block page: the alarm; later: a warning', () => {
    const before = [{ host: 'youtube.com', at: 0 }];
    expect(siteVerdict(before, 'youtube.com', 2 * MIN)).toBe('alarm');
    expect(siteVerdict(before, 'youtube.com', 2 * MIN + 1)).toBe('warn');
    expect(siteVerdict(before, 'instagram.com', 30 * S)).toBe('warn'); // another site soon after: still a warning
  });
  it('the 3rd blocked visit in a session rings the alarm, whatever the sites and times', () => {
    expect(siteVerdict([{ host: 'a.com', at: 0 }, { host: 'b.com', at: 10 * MIN }], 'c.com', 30 * MIN)).toBe('alarm');
    expect(siteVerdict([{ host: 'a.com', at: 0 }, { host: 'b.com', at: 10 * MIN }, { host: 'a.com', at: 20 * MIN }], 'd.com', 60 * MIN)).toBe('alarm');
  });
  it("knows the extension's own block page", () => {
    expect(isBlockPage('chrome-extension://abcdef/blocked.html?site=youtube.com')).toBe(true);
    expect(isBlockPage('extension://abcdef/blocked.html?site=x')).toBe(true);
    expect(isBlockPage('https://youtube.com/blocked.html')).toBe(false);
    expect(isBlockPage('chrome-extension://abcdef/options.html')).toBe(false);
  });
});
