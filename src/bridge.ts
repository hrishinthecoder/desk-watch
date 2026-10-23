import type { Block, RoutineSet, Slot } from '../electron/routines';
import type { Routine, Subject, Task } from '../electron/planner';
// What the preload script exposes to the page (see electron/preload.ts).
export type Range = {
  sessions: { id: number; started_at: number; ended_at: number | null; planned_min: number; camera_mode: number; focused_sec: number | null; ended_early: number | null; task_id: number | null }[];
  segments: { session_id: number; activity: string; start: number; end: number }[];
  events: { session_id: number; type: string; at: number; detail: string | null }[];
  usage: { session_id: number; kind: 'site' | 'app'; name: string; start: number; end: number }[];
};

type Bridge = {
  reportSelftest(text: string): void;
  saveClip(label: string, bytes: ArrayBuffer, holdout: boolean, tags?: { ev?: number; glasses?: boolean }): Promise<string>;
  openClipsFolder(): Promise<string>;
  listClips(): Promise<{ label: string; name: string }[]>;
  readClip(label: string, name: string): Promise<Uint8Array>;
  resetDataset(): Promise<void>;
  saveDatasetImage(set: 'train' | 'holdout', cls: string, name: string, bytes: ArrayBuffer): Promise<void>;
  replayProgress(line: string): void;
  replayResult(text: string, json: string): void;

  getSettings(): Record<string, unknown>;
  setSettings(own: Record<string, unknown>): Promise<void>;

  sessionStart(o: { startedAt: number; plannedMin: number; cameraMode: boolean; screenMode: boolean; taskId?: number | null }): Promise<number>;
  segmentStart(id: number, activity: string, at: number): Promise<number>;
  segmentExtend(segId: number, at: number): Promise<void>;
  sessionEvent(id: number, type: string, at: number): Promise<void>;
  sessionFinish(id: number, at: number, early: boolean): Promise<void>;
  range(from: number, to: number): Promise<Range>;
  attention(title: string, body: string): void;

  getLogin(): Promise<boolean>;
  setLogin(on: boolean): Promise<void>;
  dataPath(): Promise<string>;
  openDataFolder(): Promise<void>;
  exportJson(): Promise<string | null>;
  exportCsv(): Promise<string | null>;
  importJson(): Promise<string | null>; // 'ok', null (cancelled) or an error message
  deleteAll(): Promise<string>;
  backups(): Promise<{ name: string; at: number; size: number }[]>; // newest first
  backupNow(): Promise<string>;           // 'ok' or why it failed
  openBackupsFolder(): Promise<string>;
  restoreBackup(name: string): Promise<string>; // 'ok' or why nothing was changed

  setBlocking(on: boolean): void;
  windowsToastsOff(): Promise<boolean>; // every app's Windows notifications are switched off already
  openDoNotDisturb(): Promise<void>;     // opens Windows' notification settings (Do not disturb is there)
  screenInfo(): Promise<{ code: string; port: number; lastSeen: number; serverError: string; browsers: { name: string; origin: string; added: number }[] } | null>;
  answerPair(allow: boolean): void;
  removeBrowser(origin: string): Promise<void>;
  onPairRequest(f: (name: string) => void): () => void;
  newPairingCode(): Promise<string | null>;
  openExtensionFolder(): Promise<string>;
  getBlocklist(): Promise<ListEntry[]>;
  setBlocklist(entries: ListEntry[]): Promise<ListEntry[]>;
  blockSets(): Promise<BlockSets>;
  changeBlockSet(op: 'pick' | 'create' | 'rename' | 'delete', id?: number, name?: string): Promise<BlockSets>;

  focusWindow(on: boolean): void;      // Focus mode: full screen and on top
  windowColors(c: { color: string; symbolColor: string }): void; // the title bar's colours (the theme)
  showMini(on: boolean): void;         // the mini timer window
  sendMiniState(s: MiniState): void;
  miniAction(a: 'toggle' | 'open'): void;
  onMiniState(f: (s: MiniState) => void): () => void;
  onMiniAction(f: (a: 'toggle' | 'open') => void): () => void;

  tasks(): Promise<Task[]>;
  saveTask(t: Partial<Task>): Promise<number>;
  deleteTask(id: number): Promise<void>;
  completeTask(id: number): Promise<number | null>; // the next copy of a repeating task, or null
  uncompleteTask(id: number, status: string, copy: number | null): Promise<void>;
  reorderTasks(ids: number[]): Promise<void>;
  subjects(): Promise<Subject[]>;
  saveSubject(name: string, id?: number): Promise<string | null>; // the problem, or null when saved
  deleteSubject(id: number): Promise<void>;
  routines(): Promise<Routine[]>;
  saveRoutine(r: Omit<Routine, 'id'> & { id?: number }): Promise<string | null>; // the problem, or null when saved
  deleteRoutine(id: number): Promise<void>;
  // Routines (Stage G3): blocks of each date (with that day's skip or move), named routines, one on at a time.
  blocks(from: string, to: string): Promise<Block[]>;
  routineSets(): Promise<(RoutineSet & { active: boolean; slots: Slot[] })[]>;
  saveRoutineSet(x: { id?: number; name: string; slots: Slot[] }): Promise<{ problems: string[]; id?: number }>;
  activateRoutine(id: number | null): Promise<void>;
  deleteRoutineSet(id: number): Promise<void>;
  dayChange(id: number, date: string, change: { skip: true } | { start_min: number; length_min: number }): Promise<string | null>;
  clearDayChange(id: number, date: string): Promise<void>;
  onOpenBlock(f: (id: number) => void): () => void;
  onReminder(f: (id: number) => void): () => void; // a routine block just started
  onScreenStatus(f: (s: ScreenStatus) => void): () => void;
};

// What the mini timer shows: the time, a word, and whether its button pauses, resumes or starts the next pomodoro.
export type MiniState = { time: string; label: string; button: 'pause' | 'resume' | 'next' | null; alarm: boolean };
export type ListEntry = { list: 'blocked' | 'productive'; kind: 'site' | 'app'; pattern: string };
export type BlockSets = { sets: { id: number; name: string }[]; active: number | null; locked: boolean };
// Blocker mode's status (electron/screen.ts): blockedApp = the alarm after the warning; appWarning = the 10 s warning;
// site = a blocked site's warning or alarm (Stage G4).
export type ScreenStatus = {
  blockedApp: string | null; missingExtension: boolean;
  appWarning: { name: string; left: number } | null; site: { host: string; mode: 'warn' | 'alarm' } | null;
};

declare global {
  interface Window { deskwatch: Bridge }
}

export const bridge = () => window.deskwatch;
