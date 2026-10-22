import { describe, expect, it } from 'vitest';
import { calibrateTemporarily, finishCalibration, DEFAULTS, deleteWorkstation, fromOwn, parseSettings, saveWorkstation, serializeSettings, switchWorkstation } from '../src/state/config';

describe('settings storage', () => {
  it('saves only what differs from the defaults', () => {
    const json = serializeSettings({ ...DEFAULTS, calibratedPitch: 26.7, downSec: 30 });
    expect(JSON.parse(json)).toEqual({ v: 2, own: { calibratedPitch: 26.7, downSec: 30 } });
  });
  it('round-trips your changes', () => {
    const s = { ...DEFAULTS, cameraId: 'cam1', phoneEnter: 0.5 };
    expect(parseSettings(serializeSettings(s))).toEqual(s);
  });
  it('a later default change reaches you if you never changed that value', () => {
    const json = serializeSettings({ ...DEFAULTS, calibratedPitch: 20 });
    // pretend a new version changed a default: parse still yields the new default
    expect(parseSettings(json).cropsForPhone).toBe(DEFAULTS.cropsForPhone);
  });
  it('old whole-object settings (v1) keep only camera and calibration (live bug: frozen cropsForPhone)', () => {
    const old = JSON.stringify({ cameraId: 'abc', cropsForPhone: false, phoneEnter: 0.35, calibratedPitch: 26.7, phoneScore: 0.35 });
    const s = parseSettings(old);
    expect(s.cameraId).toBe('abc');
    expect(s.calibratedPitch).toBe(26.7);
    expect(s.cropsForPhone).toBe(DEFAULTS.cropsForPhone);
    expect(s.phoneEnter).toBe(DEFAULTS.phoneEnter);
    expect('phoneScore' in s).toBe(false);
  });
  it('values of the wrong type are ignored (damaged or hand-edited data)', () => {
    const s = fromOwn({ phoneSec: 'soon', strictMode: 1, calibratedPitch: 26.7, alarmVolume: 0.3, theme: 'dark' });
    expect(s.phoneSec).toBe(DEFAULTS.phoneSec);
    expect(s.strictMode).toBe(false);
    expect(s.calibratedPitch).toBe(26.7);
    expect(s.alarmVolume).toBe(0.3);
    expect(s.theme).toBe('dark');
    expect(fromOwn({ calibratedPitch: null }).calibratedPitch).toBe(null);
  });
  it('broken or missing data gives the defaults', () => {
    expect(parseSettings(null)).toEqual(DEFAULTS);
    expect(parseSettings('{not json')).toEqual(DEFAULTS);
  });
});

describe('workstations', () => {
  const cal = { WRITING: [1, 0.3, 0.3, 0, 0], READING: [0.9, 0.4, 0.3, 0, 0], IDLE: [0, 0.6, 0.1, 0, 0] };
  const desk = { ...DEFAULTS, calibratedPitch: 26.7, activityCal: cal, cameraId: 'cam-a' };

  it('save, switch away, switch back restores that calibration and camera', () => {
    let s = saveWorkstation(desk, '  Desk ');
    expect(s.workstation).toBe('Desk');
    s = saveWorkstation(calibrateTemporarily({ ...s, cameraId: 'cam-b' }, { calibratedPitch: 10, activityCal: null }), 'Library');
    expect(s.workstations.map((w) => w.name)).toEqual(['Desk', 'Library']);
    s = switchWorkstation(s, 'Desk');
    expect([s.calibratedPitch, s.activityCal, s.cameraId, s.workstation]).toEqual([26.7, cal, 'cam-a', 'Desk']);
  });
  it('saving under an existing name updates it instead of adding a second one', () => {
    let s = saveWorkstation(desk, 'Desk');
    s = saveWorkstation({ ...s, calibratedPitch: 30 }, 'Desk');
    expect(s.workstations).toHaveLength(1);
    expect(s.workstations[0].calibratedPitch).toBe(30);
  });
  it('a temporary calibration is in use but not in the list; deleting the selected one clears the selection', () => {
    let s = calibrateTemporarily(saveWorkstation(desk, 'Desk'), { calibratedPitch: 12, activityCal: null });
    expect([s.calibratedPitch, s.workstation, s.workstations.length]).toEqual([12, '', 1]);
    s = deleteWorkstation(switchWorkstation(s, 'Desk'), 'Desk');
    expect([s.workstation, s.workstations.length]).toEqual(['', 0]);
  });
  it('a new place is calibrated and saved in one go; recalibrating the selected place updates it', () => {
    let s = finishCalibration(saveWorkstation(desk, 'Desk'), { calibratedPitch: 12, activityCal: null }, 'Library');
    expect([s.workstation, s.workstations.map((w) => w.name), s.calibratedPitch]).toEqual(['Library', ['Desk', 'Library'], 12]);
    s = finishCalibration(switchWorkstation(s, 'Desk'), { calibratedPitch: 30, activityCal: cal }, 'Desk');
    expect([s.workstation, s.workstations.length, s.workstations.find((w) => w.name === 'Desk')!.calibratedPitch]).toEqual(['Desk', 2, 30]);
    expect(finishCalibration(s, { calibratedPitch: 5, activityCal: null }, '').workstation).toBe('');
  });
  it('workstations survive storage; a damaged one drops the whole list, never reaches the rules', () => {
    const s = saveWorkstation(desk, 'Desk');
    expect(parseSettings(serializeSettings(s)).workstations).toEqual(s.workstations);
    expect(fromOwn({ workstations: [{ name: 'x', calibratedPitch: 'high', activityCal: null, cameraId: '' }] }).workstations).toEqual([]);
    expect(fromOwn({ workstations: [{ name: '', calibratedPitch: null, activityCal: null, cameraId: '' }] }).workstations).toEqual([]);
  });
});
