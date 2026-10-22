import { describe, expect, it } from 'vitest';
import { dataDirProblem } from '../electron/guard';

const REAL = 'C:\\Users\\me\\AppData\\Roaming\\Desk Watch';
const SCRATCH = 'C:\\Temp\\tc-focus';

describe('test copies never use the real data folder', () => {
  it('the normal app (no flags) uses its folder', () => {
    expect(dataDirProblem(['electron.exe', '.'], {}, REAL, 'win32')).toBe(null);
  });
  it('a test copy whose folder was used: fine (case and slashes do not matter)', () => {
    expect(dataDirProblem(['e', '.', `--user-data-dir=${SCRATCH}`, '--remote-debugging-port=9333'], { DESKWATCH_PORT: '47616' }, 'c:/temp/TC-FOCUS/', 'win32')).toBe(null);
    expect(dataDirProblem(['e', '.', '--user-data-dir', SCRATCH], {}, SCRATCH, 'win32')).toBe(null);
  });
  it('Electron fell back to the real folder (the 2026-10-15 incident): refused', () => {
    expect(dataDirProblem(['e', '.', '--user-data-dir=C:\\Program Files\\Git\\tc-focus'], {}, REAL, 'win32')).toMatch(/will not fall back/);
  });
  it('test flags without a data folder: refused', () => {
    expect(dataDirProblem(['e', '.', '--remote-debugging-port=9333'], {}, REAL, 'win32')).toMatch(/without its own data folder/);
    expect(dataDirProblem(['e', '.', '--inspect=9334'], {}, REAL, 'win32')).toMatch(/without its own data folder/);
    expect(dataDirProblem(['e', '.'], { DESKWATCH_PORT: '47616' }, REAL, 'win32')).toMatch(/without its own data folder/);
    expect(dataDirProblem(['e', '.', '--use-file-for-fake-video-capture=x.y4m'], {}, REAL, 'win32')).toMatch(/without its own data folder/);
  });
  it('an empty folder name, or two different folders: refused', () => {
    expect(dataDirProblem(['e', '.', '--user-data-dir='], {}, REAL, 'win32')).toMatch(/will not fall back/);
    expect(dataDirProblem(['e', '.', `--user-data-dir=${SCRATCH}`, '--user-data-dir=C:\\Temp\\other'], {}, SCRATCH, 'win32')).toMatch(/other/);
  });
  it('replay on the real clips (npm run replay, no flags) still works', () => {
    expect(dataDirProblem(['e', '.', '--replay', 'power=fewer'], {}, REAL, 'win32')).toBe(null);
  });
});
