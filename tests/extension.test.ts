// The browser extension's website-notification block (owner, 2026-10-23): background.js runs here with a fake
// Chrome API and a fake Desk Watch, and the test reads which site settings it set or cleared.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

function load(answer: () => Promise<{ status: number; body?: object }>) {
  const store: Record<string, unknown> = { key: 'k' };
  const calls: string[] = [];
  const handlers: Record<string, (...a: unknown[]) => unknown> = {};
  const on = (name: string) => ({ addListener: (f: (...a: unknown[]) => unknown) => { handlers[name] = f; } });
  const chrome = {
    storage: { local: {
      get: async (keys: string | string[]) => Object.fromEntries([keys].flat().map((k) => [k, store[k]])),
      set: async (o: object) => { Object.assign(store, o); },
    } },
    contentSettings: { notifications: {
      set: async (o: { primaryPattern: string; setting: string }) => { calls.push(`set ${o.primaryPattern} ${o.setting}`); },
      clear: async () => { calls.push('clear'); },
    } },
    runtime: { onInstalled: on('installed'), onStartup: on('startup'), onMessage: on('message'), getURL: (p: string) => p, openOptionsPage: () => {} },
    tabs: { onActivated: on('activated'), onUpdated: on('updated'), query: async () => [], get: async () => null, update: async () => {} },
    windows: { onFocusChanged: on('focus'), WINDOW_ID_NONE: -1 },
    alarms: { create: () => {}, onAlarm: on('alarm') },
    action: { onClicked: on('clicked') },
  };
  const fetch = async () => {
    const a = await answer();
    return { status: a.status, ok: a.status === 200, json: async () => a.body };
  };
  const ctx: Record<string, unknown> = { chrome, fetch, navigator: { userAgent: 'Chrome' }, URL, encodeURIComponent };
  runInNewContext(readFileSync('extension/background.js', 'utf8'), ctx);
  const tab = { id: 1, active: true, url: 'https://en.wikipedia.org/wiki/Physics' };
  return { calls, store, handlers, report: () => (ctx.report as (t: object) => Promise<void>)(tab) };
}

describe('extension: website notifications', () => {
  it('blocks every site while Desk Watch says quiet, once, and clears when the session is over', async () => {
    let quiet = true;
    const x = load(async () => ({ status: 200, body: { block: false, active: false, quiet } }));
    await x.report(); await x.report();
    expect(x.calls).toEqual(['set <all_urls> block']);
    quiet = false;
    await x.report();
    expect(x.calls).toEqual(['set <all_urls> block', 'clear']);
  });
  it('an older Desk Watch (no "quiet" in the answer) never blocks', async () => {
    const x = load(async () => ({ status: 200, body: { block: false, active: true } }));
    await x.report();
    expect(x.calls).toEqual([]);
  });
  it('Desk Watch closed or not reachable: notifications come back', async () => {
    let up = true;
    const x = load(async () => { if (!up) throw new Error('refused'); return { status: 200, body: { quiet: true } }; });
    await x.report();
    up = false;
    await x.report();
    expect(x.calls).toEqual(['set <all_urls> block', 'clear']);
  });
  it('disconnected in Desk Watch (403): notifications come back', async () => {
    let status = 200;
    const x = load(async () => ({ status, body: { quiet: true } }));
    await x.report();
    status = 403;
    await x.report();
    expect(x.calls).toEqual(['set <all_urls> block', 'clear']);
  });
  it('a fresh install or update starts by clearing its own block', async () => {
    const x = load(async () => ({ status: 200, body: { quiet: false } }));
    await x.handlers.installed();
    expect(x.calls[0]).toBe('clear');
    expect(x.store.quiet).toBe(false);
  });
});
