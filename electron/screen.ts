// Blocker mode (Stage D): which app is in front, time per site/app, blocking, and the local
// server the browser extension talks to. No screenshots or screen recording, ever: only the
// app's name is read (not window titles), and the extension sends the address of the active tab.
import { appVerdict, isBlockPage, siteVerdict, WARN_MS, type Visit } from './blockrules.js';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { isBrowser, listForApp, listForSite, siteOf, type Entry } from './blocklist.js';
import * as store from './db.js';
import { app } from 'electron';

// The extension always uses 47615. Test copies are started with DESKWATCH_PORT=47616 so the
// owner's real browser extension can never reach them (it once disconnected itself that way).
export const PORT = Number(process.env.DESKWATCH_PORT) || 47615;
const POLL_MS = 333;               // foreground app checked 3x per second
const SAVE_MS = 10_000;            // open usage row's end time saved this often
export const EXTENSION_STALE_MS = 90_000; // no word from the extension this long = missing

// ---- pure parts (tests/screen.test.ts) ----

// Only the extension may talk to the app: the request must be addressed to this computer
// (blocks DNS-rebinding tricks), must not come from a web page, and must carry a secret: the
// key a browser got when you clicked Allow, or the manual pairing code.
type Headers = { host?: string; origin?: string; code?: string };
export function fromExtension(h: Headers, port = PORT, originRequired = false): boolean {
  if (h.host !== `127.0.0.1:${port}` && h.host !== `localhost:${port}`) return false;
  if (!h.origin) return !originRequired;
  return /^(chrome|moz)-extension:\/\/[a-z0-9-]+$/i.test(h.origin);
}
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function authorize(h: Headers, secrets: string[], port = PORT): boolean {
  if (!fromExtension(h, port) || !h.code) return false;
  return secrets.some((s) => !!s && same(h.code!, s));
}
export const newKey = () => Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)]).join('');

export const newPairingCode = () =>
  Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');

// What the time goes to right now: a site when a browser is in front and the extension told
// us its tab recently; else the app's name.
export function usageKey(fg: { name: string; exe: string } | null, tab: { host: string; t: number } | null, now: number) {
  if (!fg) return null;
  if (isBrowser(fg.exe) && tab && now - tab.t < EXTENSION_STALE_MS) return { kind: 'site' as const, name: tab.host };
  return { kind: 'app' as const, name: fg.name || fg.exe };
}

// ---- the running part ----

// blockedApp: the alarm for a blocked app (after its warning); appWarning: the 10 s warning before it, with seconds left;
// site: a blocked site's warning or alarm (Stage G4, electron/blockrules.ts).
export type ScreenStatus = {
  blockedApp: string | null; missingExtension: boolean;
  appWarning: { name: string; left: number } | null; site: { host: string; mode: 'warn' | 'alarm' } | null;
};
const NO_STATUS: ScreenStatus = { blockedApp: null, missingExtension: false, appWarning: null, site: null };
export type Browser = { key: string; name: string; origin: string; added: number };
const PAIR_WAIT_MS = 120_000; // you have 2 minutes to click Allow
type Fg = { name: string; exe: string };

// The prebuilt Windows binding of get-windows is loaded directly: its own loader pulls in
// @mapbox/node-pre-gyp (install-time tooling) which is not needed to run it.
// The installer ships only get-windows' Windows binary (resources/native, package.json build.extraResources), none of
// its install-time tools; from source it is the one in node_modules.
function foregroundReader(appRoot: string): () => Fg | null {
  const require = createRequire(__filename);
  let addon: { getActiveWindow(): { owner?: { name?: string; path?: string } } | undefined } | null = null;
  // Test copies only: a check can say which window is in front (electron/testhooks.ts). Never loaded by an installed
  // app, and the file is not in the installer at all.
  const hooks: typeof import('./testhooks.js') | null = !app.isPackaged && process.env.DESKWATCH_PORT ? require('./testhooks.js') : null;
  try {
    if (process.platform === 'win32') addon = require(app.isPackaged ? join(process.resourcesPath, 'native/node-get-windows.node')
      : join(appRoot, 'node_modules/get-windows/lib/binding/napi-9-win32-unknown-x64/node-get-windows.node'));
  } catch (e) {
    console.warn('Foreground app reader not available:', e);
  }
  // ponytail: Windows only for now; macOS/Linux (get-windows' other backends) come with Stage F packaging.
  return () => {
    const fake = hooks?.testForeground();
    if (fake !== undefined) return fake;
    const w = addon?.getActiveWindow();
    if (!w?.owner) return null;
    const exe = (w.owner.path ?? '').split(/[\\/]/).pop() ?? '';
    return { name: w.owner.name ?? exe, exe };
  };
}

export function createScreen(opts: {
  db: () => DatabaseSync; appRoot: string; onStatus: (s: ScreenStatus) => void;
  askPair: (name: string) => Promise<boolean>; // shows "Allow this browser?" in Desk Watch
}) {
  const readFg = foregroundReader(opts.appRoot);
  // quiet: the extension blocks websites' notifications (a running session with "Block website notifications" on).
  let state = { sessionId: null as number | null, screenMode: false, blocking: false, quiet: false };
  let list: Entry[] = store.getBlocklist(opts.db());
  let tab: { host: string; t: number } | null = null;
  let lastSeen = 0; // last request from the extension
  let usage: { kind: string; name: string; id: number; saved: number } | null = null;
  let status: ScreenStatus = NO_STATUS;
  // Stage G4: this session's blocked site visits, the blocked app in front since when, a blocked site's warning or alarm.
  let visits: Visit[] = [];
  let app: { name: string; since: number } | null = null;
  let shown: { host: string; mode: 'warn' | 'alarm'; at: number } | null = null; // a blocked site's warning or alarm
  let lastBlockedSite = { host: '', t: 0 };
  let serverError = '';

  const browsers = (): Browser[] => { try { return JSON.parse(store.getMainValue(opts.db(), 'browsers') ?? '[]'); } catch { return []; } };
  const setBrowsers = (b: Browser[]) => store.setMainValue(opts.db(), 'browsers', JSON.stringify(b));
  let pairing = false;

  // A newly installed extension asks to connect; you answer in Desk Watch. On Allow it gets its
  // own random key (stored only here and in that browser).
  async function pair(origin: string, name: string): Promise<{ status: number; body: object }> {
    if (pairing) return { status: 429, body: { error: 'another browser is waiting for an answer' } };
    pairing = true;
    try {
      const allow = await Promise.race([opts.askPair(name), new Promise<boolean>((r) => setTimeout(() => r(false), PAIR_WAIT_MS))]);
      if (!allow) return { status: 403, body: { error: 'not allowed in Desk Watch' } };
      const key = newKey();
      setBrowsers([...browsers().filter((b) => b.origin !== origin), { key, name, origin, added: Date.now() }]);
      lastSeen = Date.now();
      return { status: 200, body: { key } };
    } finally {
      pairing = false;
    }
  }

  const code = () => {
    let c = store.getMainValue(opts.db(), 'pairingCode');
    if (!c) { c = newPairingCode(); store.setMainValue(opts.db(), 'pairingCode', c); }
    return c;
  };

  function closeUsage(now: number) {
    if (usage) store.extendUsage(opts.db(), usage.id, now);
    usage = null;
  }

  function tick() {
    const now = Date.now();
    const on = state.sessionId !== null && state.screenMode;
    if (!on || !state.blocking) { app = null; shown = null; }
    if (!on) { closeUsage(now); return setStatus(NO_STATUS); }
    const fg = readFg();
    const key = usageKey(fg, tab, now);
    if (!key || key.kind !== usage?.kind || key.name !== usage.name) {
      closeUsage(now);
      if (key) usage = { ...key, id: store.startUsage(opts.db(), state.sessionId!, key.kind, key.name, now), saved: now };
    } else if (now - usage.saved >= SAVE_MS) {
      store.extendUsage(opts.db(), usage.id, now);
      usage.saved = now;
    }
    // A blocked app in front: a warning first, the alarm after 10 s, until it leaves the front.
    const inFront = state.blocking && fg && listForApp(list, fg.name, fg.exe) === 'blocked' ? fg.name : null;
    if (inFront && inFront !== app?.name) { app = { name: inFront, since: now }; store.addEvent(opts.db(), state.sessionId!, 'blocked_attempt', now, `app:${inFront}`); }
    if (!inFront) app = null;
    const v = app && appVerdict(app.since, now);
    // A blocked site: its warning ends after 10 s; its alarm ends when you leave the browser.
    if (shown?.mode === 'warn' && now - shown.at >= WARN_MS) shown = null;
    if (shown?.mode === 'alarm' && fg && !isBrowser(fg.exe)) shown = null;
    const missingExtension = state.blocking && !!fg && isBrowser(fg.exe) && now - lastSeen > EXTENSION_STALE_MS;
    setStatus({
      blockedApp: v?.state === 'alarm' ? app!.name : null, missingExtension,
      appWarning: v?.state === 'warn' ? { name: app!.name, left: Math.ceil(v.left / 1000) } : null,
      site: shown && { host: shown.host, mode: shown.mode },
    });
  }

  function setStatus(s: ScreenStatus) {
    if (JSON.stringify(s) === JSON.stringify(status)) return;
    status = s;
    opts.onStatus(s);
  }

  // The extension reports the active tab's address whenever it changes, and every 30 s.
  function onTab(url: string) {
    const now = Date.now();
    lastSeen = now;
    const site = siteOf(url);
    tab = site ? { host: site.host, t: now } : null;
    const block = state.blocking && listForSite(list, url) === 'blocked';
    if (block && site && state.sessionId !== null && (site.host !== lastBlockedSite.host || now - lastBlockedSite.t > 5000)) {
      store.addEvent(opts.db(), state.sessionId, 'blocked_attempt', now, `site:${site.host}`);
      lastBlockedSite = { host: site.host, t: now };
      // A warning the first time; the alarm when you come back within 2 minutes, or on the 3rd visit (blockrules.ts).
      shown = { host: site.host, mode: siteVerdict(visits, site.host, now), at: now };
      visits.push({ host: site.host, at: now });
      tick();
    } else if (!block && shown?.mode === 'alarm' && !isBlockPage(url)) { shown = null; tick(); } // left the blocked site
    return { block, active: state.blocking, quiet: state.quiet };
  }

  const readBody = (req: IncomingMessage) => new Promise<string>((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4096) { reject(new Error('too big')); req.destroy(); } });
    req.on('end', () => resolve(body));
  });

  const server: Server = createServer(async (req, res) => {
    const reply = (status: number, obj: object) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const h = { host: req.headers.host, origin: req.headers.origin, code: String(req.headers['x-desk-watch-code'] ?? '') };
    if (req.method === 'POST' && req.url === '/v1/pair') {
      if (!fromExtension(h, PORT, true)) return reply(403, { error: 'only a browser extension can ask to connect' });
      try {
        const { browser } = JSON.parse(await readBody(req));
        const name = typeof browser === 'string' ? browser.replace(/[^\w .-]/g, '').slice(0, 40) || 'A browser' : 'A browser';
        const r = await pair(h.origin!, name);
        return reply(r.status, r.body);
      } catch {
        return reply(400, { error: 'bad request' });
      }
    }
    if (!authorize(h, [code(), ...browsers().map((b) => b.key)])) return reply(403, { error: 'not connected' });
    if (req.method === 'POST' && req.url === '/v1/tab') {
      try {
        const { url } = JSON.parse(await readBody(req));
        if (typeof url !== 'string' || url.length > 2048) return reply(400, { error: 'bad url' });
        return reply(200, onTab(url));
      } catch {
        return reply(400, { error: 'bad request' });
      }
    }
    reply(404, { error: 'not found' });
  });
  server.on('error', (e) => { serverError = String(e); console.warn('Blocker mode server:', e); });
  server.listen(PORT, '127.0.0.1');
  // A failed check (e.g. the database busy for a moment) is logged and the next one runs; never an error box.
  const timer = setInterval(() => { try { tick(); } catch (e) { console.warn('Blocker mode check failed:', e); } }, POLL_MS);

  return {
    setState(s: typeof state) {
      if (s.sessionId !== state.sessionId) { closeUsage(Date.now()); visits = []; app = null; shown = null; }
      state = s;
      tick();
    },
    reloadList() { list = store.getBlocklist(opts.db()); },
    info: () => ({ code: code(), port: PORT, lastSeen, serverError, browsers: browsers().map(({ name, origin, added }) => ({ name, origin, added })) }),
    removeBrowser(origin: string) { setBrowsers(browsers().filter((b) => b.origin !== origin)); },
    newCode() { store.setMainValue(opts.db(), 'pairingCode', newPairingCode()); return code(); },
    stop() { closeUsage(Date.now()); clearInterval(timer); server.close(); },
  };
}
