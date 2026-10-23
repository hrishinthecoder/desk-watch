import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, nativeTheme, net, Notification, powerSaveBlocker, protocol, screen as displays, session, shell, Tray } from 'electron';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import * as store from './db.js';
import { normalizeApp, normalizeSite, onlyAddsBlocked, type Entry } from './blocklist.js';
import { createScreen } from './screen.js';
import { cleanRoutine, cleanTask, hhmm, startedBetween } from './planner.js';
import { cleanRoutineSet, isDateKey } from './routines.js';
import { backupDue, hasData, listBackups, makeBackup, restoreBackup } from './backup.js';
import { dataDirProblem } from './guard.js';
import { setLang, t as tr } from './i18n.js';

const devUrl = process.env.VITE_DEV_SERVER_URL;
const selftest = process.argv.includes('--selftest');
const replay = process.argv.includes('--replay');
const headless = selftest || replay;
// The title bar's colours (the page's --bg and --text, src/styles.css) and its height (the tab bar's top part).
const WINDOW_COLORS = { light: { color: '#f5f4ef', symbolColor: '#1c1d1a' }, dark: { color: '#121412', symbolColor: '#e8e9e3' } };
const TITLE_BAR_H = 40;
const distDir = normalize(join(__dirname, '../dist'));

// Watching must stay full speed when the window is hidden in the tray or minimised.
// Without these, Chromium lowers the hidden renderer's priority and checks get ~4x slower.
for (const s of ['disable-renderer-backgrounding', 'disable-background-timer-throttling', 'disable-backgrounding-occluded-windows']) {
  app.commandLine.appendSwitch(s);
}

// Built files are served from app:// instead of file:// because Chromium will not
// fetch() WASM or model files over file://. Everything still comes from local disk.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; media-src 'self' blob: mediastream:; connect-src 'self'";

// A test copy whose own data folder could not be used must never open the real data: quit at once (exit code 3).
const dataProblem = dataDirProblem(process.argv, process.env, app.getPath('userData'));
if (dataProblem) { console.error('DESK WATCH REFUSED TO START: ' + dataProblem); app.exit(3); }

// One database file with all sessions, settings and (later) tasks. Never leaves this computer.
const dbFile = join(app.getPath('userData'), 'deskwatch.db');
const backupDir = join(app.getPath('userData'), 'backups'); // weekly copies (Stage E3), newest 4 kept
let db: DatabaseSync;
let activeSession: number | null = null; // a study session is running
let keepAwake: number | null = null;
let quitting = false;
let win: BrowserWindow;
let tray: Tray | null = null;
let screen: ReturnType<typeof createScreen> | null = null; // Blocker mode (Stage D)
let screenMode = false; // the running session uses Blocker mode
let focusFull = false; // Focus mode is full screen (E4): the window stays on top
let mini: BrowserWindow | null = null; // the mini timer (Focus mode left during a session)

function openDatabase() {
  db = store.openDb(dbFile);
  store.closeOpenSessions(db); // sessions left open by a crash or power cut
  setLang(store.getSettings(db).language);
}
// The tray menu, in the chosen language (rebuilt when it changes).
function trayMenu() {
  tray?.setContextMenu(Menu.buildFromTemplate([
    { label: tr('Open Desk Watch'), click: showWindow },
    { label: tr('Quit'), click: () => { quitting = true; app.quit(); } },
  ]));
}

// Green circle with a white pupil, drawn in code so there is no icon file to ship.
function appIcon() {
  const n = 32, buf = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5), i = (y * n + x) * 4, pupil = d < 6;
    buf[i] = pupil ? 255 : 0x55; buf[i + 1] = pupil ? 255 : 0x9d; buf[i + 2] = pupil ? 255 : 0x1f; // BGRA
    buf[i + 3] = d < 14.5 ? 255 : 0;
  }
  return nativeImage.createFromBitmap(buf, { width: n, height: n });
}

function showWindow() {
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

app.whenReady().then(() => {
  if (dataProblem) return; // quitting (see the top of this file)
  try {
    openDatabase();
  } catch (e) {
    dialog.showErrorBox(tr('Desk Watch cannot open its data'), `${e}\n\n${tr('File: {path}', { path: dbFile })}`);
    app.exit(1);
    return;
  }

  protocol.handle('app', async (req) => {
    const file = normalize(join(distDir, decodeURIComponent(new URL(req.url).pathname)));
    if (!file.startsWith(distDir)) return new Response('', { status: 403 });
    const res = await net.fetch(pathToFileURL(file).toString()).catch(() => null);
    if (!res) return new Response('', { status: 404 }); // e.g. optional trained model not created yet
    const headers = new Headers(res.headers);
    headers.set('Content-Security-Policy', CSP);
    return new Response(res.body, { status: res.status, headers });
  });

  // No network, ever. This also blocks MediaPipe's built-in usage logging, which would
  // otherwise POST model timing stats to odml.pa.googleapis.com every 60 s.
  // Dev mode additionally allows the local Vite server on localhost.
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
    const ok = /^(app|file|devtools|data|blob):/.test(d.url) ||
      (devUrl !== undefined && /^(https?|wss?):\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(d.url));
    if (!ok) console.log('Blocked network request:', d.url);
    cb({ cancel: !ok });
  });

  // Only the camera may be requested. Nothing else (geolocation, mic, etc.).
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb, details) =>
    cb(permission === 'media' && (details as { mediaTypes?: string[] }).mediaTypes?.every((t) => t === 'video') === true));

  // The title bar is the app's own colour (2026-10-22: the white Windows one looked bad on the dark app): the page draws
  // the top area (its tab bar is the place to drag the window), and Windows keeps its real minimise / maximise / close
  // buttons on top, in the theme's colours (`window:colors` from the page). Full screen has no title bar at all.
  const dark = (store.getSettings(db).theme ?? 'system') === 'dark' || ((store.getSettings(db).theme ?? 'system') === 'system' && nativeTheme.shouldUseDarkColors);
  const colors = dark ? WINDOW_COLORS.dark : WINDOW_COLORS.light;
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: appIcon(),
    show: !headless || process.argv.includes('--show'),
    title: 'Desk Watch',
    autoHideMenuBar: true,
    backgroundColor: colors.color, // no white flash while starting or switching to full screen
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: colors.color, symbolColor: colors.symbolColor, height: TITLE_BAR_H },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: true,
      contextIsolation: true,
      backgroundThrottling: false, // keep checking 5x/sec when minimised or hidden in the tray
    },
  });
  // e.g. `electron . --selftest secs=20` -> ?selftest&secs=20 ; `--replay` -> ?replay
  const mode = selftest ? 'selftest' : replay ? 'replay' : '';
  const extra = process.argv.slice(process.argv.indexOf('--' + mode) + 1).filter((a) => !a.startsWith('--'));
  const query = mode ? '?' + [mode, ...extra].join('&') : '';
  win.loadURL(devUrl ? devUrl + query : `app://desk-watch/index.html${query}`);
  win.on('closed', () => closeMini());

  if (!headless) {
    // Closing the window during a session hides it to the tray; the session keeps running.
    win.on('close', (e) => {
      if (activeSession === null || quitting) return;
      e.preventDefault();
      win.hide();
      new Notification({ title: tr('Desk Watch is still watching'), body: tr('Your session keeps running. Click the tray icon to open it, or end the session first to quit.'), silent: true }).show();
    });
    tray = new Tray(appIcon());
    tray.setToolTip('Desk Watch');
    tray.on('click', showWindow);
    trayMenu();
    screen = createScreen({ db: () => db, appRoot: app.getAppPath(), onStatus: (st) => win.webContents.send('screen:status', st), askPair });
    startReminders();
    startBackups();
  }

  if (selftest) {
    ipcMain.on('selftest-result', (_e, text: string) => { console.log(text); app.exit(0); });
    setTimeout(() => { console.log('SELFTEST TIMEOUT'); app.exit(1); }, 90_000);
  }
  if (replay) {
    ipcMain.on('replay-progress', (_e, line: string) => console.log(line));
    ipcMain.on('replay-result', (_e, text: string, json: string) => {
      console.log(text);
      const out = join(clipsDir, 'results');
      mkdirSync(out, { recursive: true });
      const file = join(out, `replay-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      writeFileSync(file, json);
      console.log('Saved', file);
      app.exit(0);
    });
  }
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  quitting = true;
  closeMini();
  screen?.stop();
  if (activeSession !== null) store.finishSession(db, activeSession, Date.now(), true);
  activeSession = null;
});

// ---- settings ----
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
ipcMain.on('settings:get', (e) => { e.returnValue = store.getSettings(db); });
ipcMain.handle('settings:set', (_e, own: unknown) => {
  if (!isObject(own)) throw new Error('bad settings');
  store.setSettings(db, own);
  setLang(own.language); // the main process speaks the page's language (notifications, tray, messages)
  trayMenu();
});

// ---- sessions ----
const num = (x: unknown) => { if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error('bad number'); return x; };
const ACTIVITY = /^[A-Z_]{2,20}$/;
ipcMain.handle('session:start', (_e, o: { startedAt: number; plannedMin: number; cameraMode: boolean; screenMode: boolean; taskId?: number | null }) => {
  if (activeSession !== null) store.finishSession(db, activeSession, Date.now(), true);
  activeSession = store.startSession(db, { startedAt: num(o.startedAt), plannedMin: num(o.plannedMin), cameraMode: !!o.cameraMode, screenMode: !!o.screenMode,
    taskId: o.taskId === null || o.taskId === undefined ? null : num(o.taskId) });
  screenMode = !!o.screenMode;
  screen?.setState({ sessionId: activeSession, screenMode, blocking: screenMode, quiet: quietSites() });
  keepAwake ??= powerSaveBlocker.start('prevent-display-sleep'); // keeps the PC and screen awake during sessions
  tray?.setToolTip(tr('Desk Watch: session running'));
  return activeSession;
});
ipcMain.handle('session:segment', (_e, id: number, activity: string, at: number) => {
  if (!ACTIVITY.test(activity)) throw new Error('bad activity');
  return store.startSegment(db, num(id), activity, num(at));
});
ipcMain.handle('session:extend', (_e, segId: number, at: number) => store.extendSegment(db, num(segId), num(at)));
ipcMain.handle('session:event', (_e, id: number, type: string, at: number) => {
  if (!/^[a-z_]{2,30}$/.test(type)) throw new Error('bad event');
  store.addEvent(db, num(id), type, num(at));
});
ipcMain.handle('session:finish', (_e, id: number, at: number, early: boolean) => {
  store.finishSession(db, num(id), num(at), !!early);
  if (id === activeSession) { activeSession = null; screenMode = false; screen?.setState({ sessionId: null, screenMode: false, blocking: false, quiet: false }); }
  if (keepAwake !== null) { powerSaveBlocker.stop(keepAwake); keepAwake = null; }
  tray?.setToolTip('Desk Watch');
});
// "Allow this browser?" A newly installed extension asks to connect; the answer comes from a
// dialog in the Desk Watch window.
let pairAnswer: ((allow: boolean) => void) | null = null;
function askPair(name: string) {
  return new Promise<boolean>((resolve) => {
    pairAnswer?.(false);
    pairAnswer = resolve;
    showWindow();
    win.webContents.send('screen:pair-request', name);
  });
}
ipcMain.on('screen:pair-answer', (_e, allow: boolean) => { pairAnswer?.(allow === true); pairAnswer = null; });
ipcMain.handle('screen:remove-browser', (_e, origin: string) => screen?.removeBrowser(String(origin)));

// Website notifications are blocked during a running session (Settings → Sessions); read when a session starts or resumes.
const quietSites = () => store.getSettings(db).quietSites !== false;
// Blocking pauses during a break or a pause, and comes back when you resume.
ipcMain.on('screen:blocking', (_e, on: boolean) => {
  if (activeSession !== null) screen?.setState({ sessionId: activeSession, screenMode, blocking: screenMode && !!on, quiet: quietSites() && !!on });
});
ipcMain.handle('screen:info', () => screen?.info() ?? null);
ipcMain.handle('screen:new-code', () => screen?.newCode() ?? null);
// The extension's folder: next to the installed app (resources/extension), or in the source folder.
ipcMain.handle('screen:open-extension-folder', () => shell.openPath(app.isPackaged ? join(process.resourcesPath, 'extension') : join(app.getAppPath(), 'extension')));
// Windows notifications (owner, 2026-10-23): an app cannot switch Do not disturb on by itself, so the page shows a
// bar that opens the setting. Not needed when every app's notifications are already off (ToastEnabled = 0; read only).
ipcMain.handle('windows:toasts-off', () => new Promise<boolean>((resolve) => {
  if (process.platform !== 'win32') return resolve(true);
  execFile('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications', '/v', 'ToastEnabled'],
    { windowsHide: true, timeout: 3000 }, (err, out) => resolve(!err && /ToastEnabled\s+REG_DWORD\s+0x0\b/.test(out)));
}));
ipcMain.handle('windows:open-dnd', () => shell.openExternal('ms-settings:notifications'));
ipcMain.handle('blocklist:get', () => store.getBlocklist(db));
// Entries come from the page: each one is checked and cleaned before it is stored.
ipcMain.handle('blocklist:set', (_e, entries: unknown) => {
  if (!Array.isArray(entries) || entries.length > 500) throw new Error('bad list');
  const clean: Entry[] = entries.flatMap((x: Entry) => {
    if (!isObject(x) || !['blocked', 'productive'].includes(x.list) || !['site', 'app'].includes(x.kind) || typeof x.pattern !== 'string') return [];
    const pattern = (x.kind === 'site' ? normalizeSite(x.pattern) : normalizeApp(x.pattern)).slice(0, 200);
    return pattern ? [{ list: x.list, kind: x.kind, pattern }] : [];
  });
  // Owner's rule (Stage D2): during a session you may only add blocked sites and apps.
  if (activeSession !== null && !onlyAddsBlocked(store.getBlocklist(db), clean)) throw new Error(tr('During a session you can only add blocked sites and apps.'));
  store.setBlocklist(db, clean);
  screen?.reloadList();
  return store.getBlocklist(db);
});
// Block sets (Stage D2): pick, new (copy of the one in use), rename, delete. All locked during a session.
const setsState = () => ({ sets: store.blockSets(db), active: store.activeSet(db), locked: activeSession !== null });
ipcMain.handle('blocksets:get', setsState);
ipcMain.handle('blocksets:change', (_e, op: unknown, id: unknown, name: unknown) => {
  if (activeSession !== null) throw new Error(tr('Block sets cannot be changed during a session.'));
  const n = typeof name === 'string' ? name : '';
  if (op === 'pick') store.pickSet(db, num(id));
  else if (op === 'create') store.createSet(db, n);
  else if (op === 'rename') store.renameSet(db, num(id), n);
  else if (op === 'delete') store.deleteSet(db, num(id));
  else throw new Error('bad op');
  screen?.reloadList();
  return setsState();
});
ipcMain.handle('db:range', (_e, from: number, to: number) => store.sessionsBetween(db, num(from), num(to)));

// Alarm: bring the window to the front and show a notification (the sound plays in the page).
ipcMain.on('attention', (_e, title: string, body: string) => {
  showWindow();
  win.setAlwaysOnTop(true); if (!focusFull) win.setAlwaysOnTop(false); // lets Windows bring it in front of other apps
  win.flashFrame(true);
  new Notification({ title: String(title).slice(0, 100), body: String(body).slice(0, 300), silent: true }).show();
});

// ---- Focus mode (E4 Part 2) ----
// Full screen and on top of other windows while Focus mode is shown.
// The title bar follows the page's theme (its --bg and --text): Windows' buttons and the window's own background.
ipcMain.on('window:colors', (_e, c: unknown) => {
  const hex = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);
  const color = isObject(c) ? hex(c.color) : null, symbolColor = isObject(c) ? hex(c.symbolColor) : null;
  if (!color || !symbolColor || !win || win.isDestroyed()) return;
  overlay = { color, symbolColor };
  paintOverlay();
  win.setBackgroundColor(color);
});
// The page sends the colour of whatever fills the top of the window (the page, an alarm, Focus mode). In Focus mode's
// full screen Windows' buttons are hidden: the same colour as the screen and no height (owner, 2026-10-23).
let overlay = { color: '#101114', symbolColor: '#ECEDF1' };
function paintOverlay() {
  if (!win || win.isDestroyed()) return;
  try {
    win.setTitleBarOverlay(focusFull ? { color: overlay.color, symbolColor: overlay.color, height: 1 } : { ...overlay, height: TITLE_BAR_H });
  } catch (e) { console.error('title bar:', e); }
}
ipcMain.on('focus:window', (_e, on: unknown) => {
  focusFull = on === true;
  if (focusFull) showWindow();
  win.setAlwaysOnTop(focusFull);
  win.setFullScreen(focusFull);
  paintOverlay();
});
// Mini timer: a small always-on-top box (time + pause/play; click the time to go back), draggable, at its last place.
function miniBounds() {
  const W = 236, H = 56;
  try {
    const p = JSON.parse(store.getMainValue(db, 'miniPos') ?? 'null') as { x: number; y: number } | null;
    if (p && displays.getAllDisplays().some((d) => p.x >= d.workArea.x && p.y >= d.workArea.y && p.x + W <= d.workArea.x + d.workArea.width && p.y + H <= d.workArea.y + d.workArea.height)) return { ...p, width: W, height: H };
  } catch { /* a damaged value: use the default place */ }
  const a = displays.getPrimaryDisplay().workArea;
  return { x: a.x + a.width - W - 24, y: a.y + 24, width: W, height: H };
}
// Its place is saved when it is dragged and when it closes.
const saveMiniPos = () => { if (mini && !mini.isDestroyed()) { const [x, y] = mini.getPosition(); store.setMainValue(db, 'miniPos', JSON.stringify({ x, y })); } };
function closeMini() { saveMiniPos(); mini?.destroy(); mini = null; }
ipcMain.on('mini:show', (_e, on: unknown) => {
  if (on !== true) { closeMini(); return; }
  if (mini) return;
  mini = new BrowserWindow({
    ...miniBounds(), frame: false, resizable: false, maximizable: false, minimizable: false, fullscreenable: false, alwaysOnTop: true,
    skipTaskbar: true, show: false, title: 'Desk Watch timer', backgroundColor: '#000000',
    webPreferences: { preload: join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true },
  });
  mini.setAlwaysOnTop(true, 'floating');
  mini.loadURL(devUrl ? devUrl + '?mini' : 'app://desk-watch/index.html?mini');
  mini.once('ready-to-show', () => mini?.showInactive());
  let saveId: ReturnType<typeof setTimeout> | undefined;
  mini.on('move', () => {
    clearTimeout(saveId);
    saveId = setTimeout(saveMiniPos, 300);
  });
  mini.on('closed', () => { mini = null; });
  win.minimize(); // out of the way; the mini timer stays on top
});
ipcMain.on('mini:state', (_e, s: unknown) => { if (isObject(s)) mini?.webContents.send('mini:state', s); });
ipcMain.on('mini:action', (_e, a: unknown) => {
  if (a !== 'toggle' && a !== 'open') return;
  if (a === 'open') showWindow();
  win.webContents.send('mini:action', a);
});

// ---- start with Windows ----
// In development the app is started as `electron <folder>`, so the folder is passed too.
const login = () => ({ path: process.execPath, args: app.isPackaged ? [] : [app.getAppPath()] });
ipcMain.handle('login:get', () => app.getLoginItemSettings(login()).openAtLogin);
ipcMain.handle('login:set', (_e, on: boolean) => app.setLoginItemSettings({ ...login(), openAtLogin: !!on }));

// ---- your data ----
const stamp = () => new Date().toISOString().slice(0, 10);
async function saveAs(name: string, ext: string, text: string) {
  const r = await dialog.showSaveDialog(win, { defaultPath: join(app.getPath('documents'), name), filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  if (r.canceled || !r.filePath) return null;
  writeFileSync(r.filePath, text);
  return r.filePath;
}
ipcMain.handle('data:path', () => dbFile);
ipcMain.handle('data:open-folder', () => shell.showItemInFolder(dbFile));
ipcMain.handle('data:export-json', () => saveAs(`desk-watch-${stamp()}.json`, 'json', JSON.stringify(store.exportAll(db), null, 1)));
ipcMain.handle('data:export-csv', () => saveAs(`desk-watch-sessions-${stamp()}.csv`, 'csv', store.sessionsCsv(db)));
ipcMain.handle('data:import-json', async () => {
  if (activeSession !== null) return tr('End your session first.');
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try {
    store.importAll(db, JSON.parse(readFileSync(r.filePaths[0], 'utf8')));
    screen?.reloadList();
    return 'ok';
  } catch (e) {
    return `${tr('Nothing was changed.')} ${e instanceof Error ? e.message : e}`;
  }
});
// Weekly automatic backup: checked at start and every 3 hours; made only when the newest is a week old.
const BACKUP_CHECK_MS = 3 * 3600_000;
function autoBackup() {
  try {
    const newest = listBackups(backupDir)[0]?.at ?? null;
    if (backupDue(newest, Date.now(), hasData(db))) makeBackup(db, backupDir);
  } catch (e) {
    console.log('Backup failed:', e); // tried again at the next check
  }
}
function startBackups() {
  autoBackup();
  setInterval(autoBackup, BACKUP_CHECK_MS);
}
ipcMain.handle('backup:list', () => listBackups(backupDir));
ipcMain.handle('backup:now', () => {
  try { makeBackup(db, backupDir); return 'ok'; } catch (e) { return `${tr('Backup failed.')} ${e instanceof Error ? e.message : e}`; }
});
ipcMain.handle('backup:open-folder', () => { mkdirSync(backupDir, { recursive: true }); return shell.openPath(backupDir); });
// Restore: the current data is backed up first ("before restore"), then replaced. Never during a session.
ipcMain.handle('backup:restore', (_e, name: unknown) => {
  if (activeSession !== null) return tr('End your session first.');
  if (typeof name !== 'string') return tr('Backup not found.');
  try {
    const problem = restoreBackup(db, dbFile, backupDir, name);
    if (problem) return problem;
  } catch (e) {
    return `${tr('Restore failed.')} ${e instanceof Error ? e.message : e}`;
  } finally {
    if (!db.isOpen) openDatabase(); // the restored file, or the old one if putting it in place failed
  }
  screen?.reloadList();
  return 'ok';
});

// Deletes the database file, its upgrade backups and the weekly backups, then starts with an empty one.
// Test clips and training images are separate (Debug screen) and are not touched.
ipcMain.handle('data:delete-all', () => {
  if (activeSession !== null) return tr('End your session first.');
  db.close();
  for (const f of readdirSync(dirname(dbFile))) if (f.startsWith(basename(dbFile))) rmSync(join(dirname(dbFile), f), { force: true });
  rmSync(backupDir, { recursive: true, force: true }); // "delete everything" includes the weekly backups
  openDatabase();
  screen?.reloadList();
  return 'ok';
});

// Test clips (Stage A). Saved only when the user presses Record in the debug screen.
// They stay in the userData folder, never in the project or a release.
const clipsDir = join(app.getPath('userData'), 'clips');
const LABEL = /^[a-z_]+$/;

// tags: "-ev<s>" = the recorder beeped at that second (A2 per-event score), "-glasses" = glasses on (A3).
ipcMain.handle('clips:save', (_e, label: string, bytes: ArrayBuffer, holdout: boolean, tags: unknown) => {
  if (!LABEL.test(label)) throw new Error('bad label');
  const dir = join(clipsDir, label);
  mkdirSync(dir, { recursive: true });
  const t = isObject(tags) ? tags : {};
  const ev = Number.isInteger(t.ev) && (t.ev as number) > 0 && (t.ev as number) < 60 ? `-ev${t.ev}` : '';
  const file = join(dir, `${holdout ? 'holdout-' : ''}${new Date().toISOString().replace(/[:.]/g, '-')}${ev}${t.glasses === true ? '-glasses' : ''}.webm`);
  writeFileSync(file, Buffer.from(bytes));
  return file;
});
ipcMain.handle('clips:open-folder', () => { mkdirSync(clipsDir, { recursive: true }); return shell.openPath(clipsDir); });
ipcMain.handle('clips:list', () => {
  mkdirSync(clipsDir, { recursive: true });
  return readdirSync(clipsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && LABEL.test(d.name) && d.name !== 'results')
    .flatMap((d) => readdirSync(join(clipsDir, d.name)).filter((f) => f.endsWith('.webm')).map((f) => ({ label: d.name, name: f })));
});
// Training images (hand crops cut from the clips) for `npm run train`. Same privacy as
// clips: userData only. `dataset:reset` deletes the previous export (it is regenerated).
const datasetDir = join(app.getPath('userData'), 'dataset');
ipcMain.handle('dataset:reset', () => rmSync(datasetDir, { recursive: true, force: true }));
ipcMain.handle('dataset:save', (_e, set: string, cls: string, name: string, bytes: ArrayBuffer) => {
  if (!['train', 'holdout'].includes(set) || !LABEL.test(cls) || !/^[\w.-]+\.jpg$/.test(name)) throw new Error('bad dataset path');
  const dir = join(datasetDir, set, cls);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), Buffer.from(bytes));
});

ipcMain.handle('clips:read', (_e, label: string, name: string) => {
  if (!LABEL.test(label) || !/^[\w.-]+\.webm$/.test(name)) throw new Error('bad clip');
  return readFileSync(join(clipsDir, label, name));
});

// ---- planner (Stage E) ----
ipcMain.handle('planner:tasks', () => store.listTasks(db));
ipcMain.handle('planner:save-task', (_e, x: unknown) => {
  const t = cleanTask(x);
  if (typeof t === 'string') throw new Error(t);
  return store.saveTask(db, t);
});
ipcMain.handle('planner:delete-task', (_e, id: unknown) => store.deleteTask(db, num(id)));
// To-do list (Stage E4)
ipcMain.handle('planner:complete-task', (_e, id: unknown) => store.completeTask(db, num(id))); // the repeat copy's id, or null
ipcMain.handle('planner:uncomplete-task', (_e, id: unknown, status: unknown, copy: unknown) =>
  store.uncompleteTask(db, num(id), String(status), copy === null ? null : num(copy)));
ipcMain.handle('planner:reorder', (_e, ids: unknown) => {
  if (!Array.isArray(ids) || ids.length > 5000) throw new Error('bad order');
  store.reorderTasks(db, ids.map(num));
});
ipcMain.handle('planner:subjects', () => store.listSubjects(db));
ipcMain.handle('planner:save-subject', (_e, name: unknown, id: unknown) =>
  store.saveSubject(db, typeof name === 'string' ? name : '', id === undefined || id === null ? undefined : num(id))); // the problem, or null
ipcMain.handle('planner:delete-subject', (_e, id: unknown) => store.deleteSubject(db, num(id)));
ipcMain.handle('planner:routines', () => store.listRoutines(db));
ipcMain.handle('planner:save-routine', (_e, x: unknown) => store.saveRoutine(db, cleanRoutine(x))); // the problem, or null
ipcMain.handle('planner:delete-routine', (_e, id: unknown) => store.deleteRoutine(db, num(id)));
// Routines (Stage G3)
const dateArg = (v: unknown) => { if (!isDateKey(v)) throw new Error('bad date'); return v; };
ipcMain.handle('planner:blocks', (_e, from: unknown, to: unknown) => store.blocksBetween(db, dateArg(from), dateArg(to)));
ipcMain.handle('planner:routine-sets', () => store.routineSets(db));
ipcMain.handle('planner:save-routine-set', (_e, x: unknown) => store.saveRoutineSet(db, cleanRoutineSet(x))); // { problems, id }
ipcMain.handle('planner:activate-routine', (_e, id: unknown) => store.activateRoutine(db, id === null ? null : num(id)));
ipcMain.handle('planner:delete-routine-set', (_e, id: unknown) => store.deleteRoutineSet(db, num(id)));
ipcMain.handle('planner:day-change', (_e, id: unknown, date: unknown, change: unknown) => {
  const c = isObject(change) ? change : {};
  return store.setDayChange(db, num(id), dateArg(date), c.skip === true ? { skip: true } : { start_min: num(c.start_min), length_min: num(c.length_min) });
}); // the problem, or null
ipcMain.handle('planner:clear-day-change', (_e, id: unknown, date: unknown) => store.clearDayChange(db, num(id), dateArg(date)));

// Routine reminders when a block starts. Not while a session runs; off with a Settings switch.
// - In the app (works with Windows notifications switched off, as on the owner's PC): the window comes
//   to the front (taskbar button flashes if Windows refuses), the page plays a sound and shows a reminder bar.
// - Also a Windows notification. Either one's "get it ready" fills in the Study tab; the owner presses Start.
const shown: Notification[] = []; // kept referenced, or Windows may drop the click
function startReminders() {
  let last = Date.now();
  setInterval(() => { try { remind(); } catch (e) { console.warn('Reminder check failed:', e); } }, 15_000); // never an error box
  function remind() {
    const now = Date.now();
    const due = startedBetween(store.listRoutines(db), last, now);
    last = now;
    if (!due.length || activeSession !== null || store.getSettings(db).routineReminders === false) return;
    const tasks = store.listTasks(db);
    for (const r of due) {
      const task = tasks.find((t) => t.id === r.task_id);
      const n = new Notification({ title: tr('Study block at {time}: {task}', { time: hhmm(r.start_min), task: task ? task.title : tr('study') }), body: tr('{min} min. Click to get it ready in Desk Watch.', { min: r.length_min }) });
      n.on('click', () => { showWindow(); win.webContents.send('planner:open-block', r.id); });
      n.show();
      shown.push(n);
      if (shown.length > 10) shown.shift();
      win.webContents.send('planner:reminder', r.id);
    }
    showWindow();
    win.flashFrame(true); // stops by itself when the window gets focus
  }
}
