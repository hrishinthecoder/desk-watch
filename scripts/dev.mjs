// Dev mode: compile the Electron side, start Vite with hot reload, launch Electron on it.
import { execSync, spawn } from 'node:child_process';
import { createServer } from 'vite';
import electron from 'electron';

execSync('npx tsc -p electron', { stdio: 'inherit' });
const server = await createServer();
await server.listen();
const child = spawn(electron, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: server.resolvedUrls.local[0] },
});
child.on('exit', (code) => { server.close(); process.exit(code ?? 0); });
