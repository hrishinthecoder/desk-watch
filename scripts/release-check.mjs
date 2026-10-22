// Checks the BUILT installer before anything is published (Stage F, owner 2026-10-22):
//   1. unpacks release/Desk-Watch-Setup-<version>.exe (7-Zip from electron-builder's own tools) into a scratch folder;
//   2. the test-only hook (electron/testhooks.ts, "which window is in front") is NOT in it: no testhooks.js, and the
//      words __testForeground / testForeground appear in no file of the app;
//   3. what is inside: no npm packages, the Windows binary for "app in front", the extension, the licence; no databases,
//      clips, logs or screenshots;
//   4. starts the unpacked app as a test copy (scratch data folder, port 47616) and asks its main process whether the
//      hook can be loaded: it must not.
//   5. says whether the installer is signed (it is not: no code signing, README explains SmartScreen).
//   npm run dist, then: node scripts/release-check.mjs <scratch folder>
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';

const scratch = process.argv[2];
if (!scratch) { console.log('usage: node scripts/release-check.mjs <scratch folder>'); process.exit(1); }
const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const setup = join('release', `Desk-Watch-Setup-${version}.exe`);
let fails = 0;
const ok = (name, pass, got) => { if (!pass) fails++; console.log(pass ? 'PASS' : 'FAIL', name, pass ? '' : JSON.stringify(got)); };
// 2026-10-22: `npm run dist` failed after its build step had passed, and this check then tested the OLD installer.
// The installer must be newer than the code it is supposed to hold.
const built = statSync(join('dist-electron', 'main.js')).mtimeMs;
ok('the installer is newer than the last build (not a leftover from an older one)', statSync(setup).mtimeMs >= built,
  { installer: new Date(statSync(setup).mtimeMs).toISOString(), build: new Date(built).toISOString() });
// 7-Zip as electron-builder downloads it for building the installer (its cache), or an older node_modules copy.
const cache = join(process.env.LOCALAPPDATA ?? '', 'electron-builder', 'Cache');
const findIn = (d) => { if (!existsSync(d)) return null; for (const e of readdirSync(d, { withFileTypes: true })) {
  const p = join(d, e.name); if (e.isDirectory()) { const r = findIn(p); if (r) return r; } else if (e.name.toLowerCase() === '7za.exe') return p; } return null; };
const sevenZip = findIn(cache) ?? findIn(join('node_modules', '7zip-bin'));
if (!sevenZip) throw new Error('7-Zip (7za.exe) not found: run `npm run dist` once first');

// 1. unpack the installer (it holds app-64.7z, which holds the app)
const out = join(scratch, 'installer');
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
execFileSync(sevenZip, ['x', '-y', `-o${out}`, setup], { stdio: 'ignore' });
// Older 7-Zip shows the installer's inner app-64.7z; newer ones unpack the app's files straight away.
const inner = join(out, '$PLUGINSDIR', 'app-64.7z');
let app = out;
if (existsSync(inner)) {
  app = join(scratch, 'app');
  rmSync(app, { recursive: true, force: true });
  execFileSync(sevenZip, ['x', '-y', `-o${app}`, inner], { stdio: 'ignore' });
}
ok('the installer holds the app (Desk Watch.exe)', existsSync(join(app, 'Desk Watch.exe')), readdirSync(app));
const archive = join(app, 'resources', 'app.asar');
ok('…and the app holds resources/app.asar', existsSync(archive), null);

// 2. the hook is not there
const raw = asar.listPackage(archive); // native paths (backslashes on Windows), as extractFile wants them
const files = raw.map((f) => f.replace(/\\/g, '/'));
const read = (f) => asar.extractFile(archive, raw[files.indexOf(f)].replace(/^[\\/]/, '')).toString('utf8');
ok('no testhooks.js in the app', !files.some((f) => /testhooks/i.test(f)), files.filter((f) => /testhook/i.test(f)));
const texty = files.filter((f) => /\.(js|mjs|cjs|json|html|css|map)$/.test(f));
// The hook is the global __testForeground (read only in testhooks.js). screen.js keeps a call `hooks?.testForeground()`
// whose `hooks` is null when packaged: that is checked live in step 4 (the file cannot even be loaded).
const hits = texty.filter((f) => /__testForeground/.test(read(f)));
ok(`the hook's global "__testForeground" is in none of the app's ${texty.length} code files`, hits.length === 0, hits);
const guard = read('/dist-electron/screen.js');
ok('screen.js loads the hooks only when not packaged', /!\w+\.app\.isPackaged && process\.env\.DESKWATCH_PORT \? require\('\.\/testhooks\.js'\) : null/.test(guard), null);
const loose = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else loose.push(p); } };
walk(join(app, 'resources'));
const looseHits = loose.filter((p) => !p.endsWith('app.asar') && statSync(p).size < 5e6 && /__testForeground/.test(readFileSync(p, 'latin1')));
ok('…nor in any other file next to it', looseHits.length === 0, looseHits.map((p) => relative(app, p)));

// 3. what is inside
ok('no npm packages inside (node_modules)', !files.some((f) => /\/node_modules\//.test(f)), files.filter((f) => /node_modules/.test(f)).slice(0, 5));
ok('the Windows binary for "which app is in front" is next to the app', existsSync(join(app, 'resources', 'native', 'node-get-windows.node')), null);
ok('the browser extension folder is next to the app', existsSync(join(app, 'resources', 'extension', 'manifest.json')), null);
ok('LICENSE and THIRD_PARTY_NOTICES.md are next to the app', ['LICENSE', 'THIRD_PARTY_NOTICES.md'].every((f) => existsSync(join(app, 'resources', f))), null);
const personal = [...files, ...loose.map((p) => relative(app, p))].filter((f) => /\.(db|sqlite|webm|log|bak[\w-]*)$|backups[\\/]|clips[\\/]|deskwatch\.db/i.test(f));
ok('no databases, backups, clips or logs', personal.length === 0, personal);
const images = files.filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f));
ok('no screenshots or photos (images inside: only the app\'s own, if any)', images.every((f) => /\/dist\/(assets|fonts)\//.test(f)), images);
console.log('  inside the app:', files.length, 'files; models:', files.filter((f) => /\/models\//.test(f)).join(', '));

// 4. start the unpacked app as a test copy and ask its main process
const exe = join(app, 'Desk Watch.exe');
const data = join(scratch, 'release-copy');
rmSync(data, { recursive: true, force: true }); mkdirSync(data, { recursive: true });
const child = spawn(exe, [`--user-data-dir=${data}`, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=9333', '--inspect=9334'],
  { env: { ...process.env, DESKWATCH_PORT: '47616' }, stdio: 'ignore' });
const evalMain = async (expr) => {
  const list = await (await fetch('http://127.0.0.1:9334/json')).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  const res = new Promise((r) => ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id === 1) r(d.result?.result?.value ?? d.result); }));
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true, includeCommandLineAPI: true } }));
  try { return await res; } finally { ws.close(); }
};
try {
  let up = false;
  for (let i = 0; i < 40 && !up; i++) { await new Promise((r) => setTimeout(r, 1000)); up = await fetch('http://127.0.0.1:9334/json').then(() => true, () => false); }
  ok('the installed app starts (as a test copy on a scratch folder)', up, null);
  const r = await evalMain(`(() => { const { app } = require('electron'); const path = require('path');
    let hook; try { require(path.join(app.getAppPath(), 'dist-electron', 'testhooks.js')); hook = 'loaded'; } catch { hook = 'missing'; }
    let reader; try { reader = typeof require(path.join(process.resourcesPath, 'native', 'node-get-windows.node')).getActiveWindow; } catch (e) { reader = String(e); }
    return { packaged: app.isPackaged, hook, reader, data: app.getPath('userData') }; })()`);
  ok('in the installed app the hook cannot be loaded (not there), and it knows it is packaged', r?.packaged === true && r.hook === 'missing', r);
  ok('the "app in front" reader loads from resources/native', r?.reader === 'function', r);
  ok('it used the scratch data folder, not the real one', typeof r?.data === 'string' && !/Roaming[\\/]Desk Watch$/i.test(r.data), r?.data);
  await new Promise((res) => setTimeout(res, 4000));
  const page = await (await fetch('http://127.0.0.1:9333/json')).json();
  ok('its window opened the app page', page.some((p) => p.type === 'page' && /index\.html/.test(p.url)), page.map((p) => p.url));
} finally {
  if (child.pid) execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
}

// 5. signed or not
const sig = execFileSync('powershell', ['-NoProfile', '-Command', `(Get-AuthenticodeSignature '${setup}').Status`]).toString().trim();
console.log(`  installer signature: ${sig} (no code signing: Windows SmartScreen warns; README says how to get past it)`);
console.log(fails ? `${fails} FAILED` : 'all passed');
