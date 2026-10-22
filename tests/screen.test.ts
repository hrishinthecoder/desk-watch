import { describe, expect, it } from 'vitest';
import { authorize, EXTENSION_STALE_MS, fromExtension, newKey, newPairingCode, PORT, usageKey } from '../electron/screen';

describe('pairing check (local server)', () => {
  const code = 'ABCD2345';
  const h = { host: `127.0.0.1:${PORT}`, origin: 'chrome-extension://abcdef', code };
  it('the extension with the right code or its own key is let in', () => {
    expect(authorize(h, [code])).toBe(true);
    expect(authorize({ ...h, code: 'k'.repeat(32) }, [code, 'k'.repeat(32)])).toBe(true);
    expect(authorize({ ...h, origin: undefined }, [code])).toBe(true); // service worker requests may have no Origin
  });
  it('wrong or missing code, a web page, or another host name are refused', () => {
    expect(authorize({ ...h, code: 'ABCD2346' }, [code])).toBe(false);
    expect(authorize({ ...h, code: '' }, [code, ''])).toBe(false);
    expect(authorize({ ...h, code: 'ABC' }, [code])).toBe(false);
    expect(authorize({ ...h, origin: 'https://evil.example' }, [code])).toBe(false);
    expect(authorize({ ...h, host: `evil.example:${PORT}` }, [code])).toBe(false); // DNS rebinding
    expect(authorize(h, [])).toBe(false);
  });
  it('only an extension can ask to connect (a web page or an unnamed caller cannot)', () => {
    expect(fromExtension(h, PORT, true)).toBe(true);
    expect(fromExtension({ ...h, origin: undefined }, PORT, true)).toBe(false);
    expect(fromExtension({ ...h, origin: 'https://evil.example' }, PORT, true)).toBe(false);
    expect(fromExtension({ ...h, origin: 'chrome-extension://abc/../x' }, PORT, true)).toBe(false);
    expect(newKey()).toMatch(/^[a-z0-9]{32}$/);
  });
  it('codes are 8 easy-to-read characters and differ each time', () => {
    const a = newPairingCode(), b = newPairingCode();
    expect(a).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(a).not.toBe(b);
  });
});

describe('time logging key', () => {
  const now = 1_000_000;
  it('a browser in front with a recent tab report counts as that site', () => {
    expect(usageKey({ name: 'Google Chrome', exe: 'chrome.exe' }, { host: 'wikipedia.org', t: now - 1000 }, now)).toEqual({ kind: 'site', name: 'wikipedia.org' });
  });
  it('no recent tab report (extension missing) or another app counts as the app', () => {
    expect(usageKey({ name: 'Google Chrome', exe: 'chrome.exe' }, { host: 'x.com', t: now - EXTENSION_STALE_MS - 1 }, now)).toEqual({ kind: 'app', name: 'Google Chrome' });
    expect(usageKey({ name: 'Word', exe: 'WINWORD.EXE' }, { host: 'x.com', t: now }, now)).toEqual({ kind: 'app', name: 'Word' });
    expect(usageKey(null, null, now)).toBe(null);
  });
});
