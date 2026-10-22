import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('deskwatch', {
  reportSelftest: (text: string) => ipcRenderer.send('selftest-result', text),
  saveClip: (label: string, bytes: ArrayBuffer, holdout: boolean, tags?: object) => ipcRenderer.invoke('clips:save', label, bytes, holdout, tags),
  openClipsFolder: () => ipcRenderer.invoke('clips:open-folder'),
  listClips: () => ipcRenderer.invoke('clips:list'),
  readClip: (label: string, name: string) => ipcRenderer.invoke('clips:read', label, name),
  resetDataset: () => ipcRenderer.invoke('dataset:reset'),
  saveDatasetImage: (set: string, cls: string, name: string, bytes: ArrayBuffer) => ipcRenderer.invoke('dataset:save', set, cls, name, bytes),
  replayProgress: (line: string) => ipcRenderer.send('replay-progress', line),
  replayResult: (text: string, json: string) => ipcRenderer.send('replay-result', text, json),

  // Read once at startup, before the first screen draws.
  getSettings: () => ipcRenderer.sendSync('settings:get'),
  setSettings: (own: Record<string, unknown>) => ipcRenderer.invoke('settings:set', own),

  sessionStart: (o: object) => ipcRenderer.invoke('session:start', o),
  segmentStart: (id: number, activity: string, at: number) => ipcRenderer.invoke('session:segment', id, activity, at),
  segmentExtend: (segId: number, at: number) => ipcRenderer.invoke('session:extend', segId, at),
  sessionEvent: (id: number, type: string, at: number) => ipcRenderer.invoke('session:event', id, type, at),
  sessionFinish: (id: number, at: number, early: boolean) => ipcRenderer.invoke('session:finish', id, at, early),
  range: (from: number, to: number) => ipcRenderer.invoke('db:range', from, to),
  attention: (title: string, body: string) => ipcRenderer.send('attention', title, body),

  getLogin: () => ipcRenderer.invoke('login:get'),
  setLogin: (on: boolean) => ipcRenderer.invoke('login:set', on),
  dataPath: () => ipcRenderer.invoke('data:path'),
  openDataFolder: () => ipcRenderer.invoke('data:open-folder'),
  exportJson: () => ipcRenderer.invoke('data:export-json'),
  exportCsv: () => ipcRenderer.invoke('data:export-csv'),
  importJson: () => ipcRenderer.invoke('data:import-json'),
  deleteAll: () => ipcRenderer.invoke('data:delete-all'),
  backups: () => ipcRenderer.invoke('backup:list'),
  backupNow: () => ipcRenderer.invoke('backup:now'),
  openBackupsFolder: () => ipcRenderer.invoke('backup:open-folder'),
  restoreBackup: (name: string) => ipcRenderer.invoke('backup:restore', name),

  // Blocker mode (Stage D)
  setBlocking: (on: boolean) => ipcRenderer.send('screen:blocking', on),
  screenInfo: () => ipcRenderer.invoke('screen:info'),
  newPairingCode: () => ipcRenderer.invoke('screen:new-code'),
  openExtensionFolder: () => ipcRenderer.invoke('screen:open-extension-folder'),
  getBlocklist: () => ipcRenderer.invoke('blocklist:get'),
  setBlocklist: (entries: object[]) => ipcRenderer.invoke('blocklist:set', entries),
  blockSets: () => ipcRenderer.invoke('blocksets:get'),
  changeBlockSet: (op: string, id?: number, name?: string) => ipcRenderer.invoke('blocksets:change', op, id, name),

  // Focus mode (Stage E4)
  focusWindow: (on: boolean) => ipcRenderer.send('focus:window', on),
  windowColors: (c: object) => ipcRenderer.send('window:colors', c),
  showMini: (on: boolean) => ipcRenderer.send('mini:show', on),
  sendMiniState: (s: object) => ipcRenderer.send('mini:state', s),
  miniAction: (a: string) => ipcRenderer.send('mini:action', a),
  onMiniState: (f: (s: object) => void) => {
    const h = (_e: unknown, s: object) => f(s);
    ipcRenderer.on('mini:state', h);
    return () => { ipcRenderer.removeListener('mini:state', h); };
  },
  onMiniAction: (f: (a: string) => void) => {
    const h = (_e: unknown, a: string) => f(a);
    ipcRenderer.on('mini:action', h);
    return () => { ipcRenderer.removeListener('mini:action', h); };
  },

  // Planner (Stage E)
  tasks: () => ipcRenderer.invoke('planner:tasks'),
  saveTask: (t: object) => ipcRenderer.invoke('planner:save-task', t),
  deleteTask: (id: number) => ipcRenderer.invoke('planner:delete-task', id),
  completeTask: (id: number) => ipcRenderer.invoke('planner:complete-task', id),
  uncompleteTask: (id: number, status: string, copy: number | null) => ipcRenderer.invoke('planner:uncomplete-task', id, status, copy),
  reorderTasks: (ids: number[]) => ipcRenderer.invoke('planner:reorder', ids),
  subjects: () => ipcRenderer.invoke('planner:subjects'),
  saveSubject: (name: string, id?: number) => ipcRenderer.invoke('planner:save-subject', name, id),
  deleteSubject: (id: number) => ipcRenderer.invoke('planner:delete-subject', id),
  routines: () => ipcRenderer.invoke('planner:routines'),
  saveRoutine: (r: object) => ipcRenderer.invoke('planner:save-routine', r),
  deleteRoutine: (id: number) => ipcRenderer.invoke('planner:delete-routine', id),
  blocks: (from: string, to: string) => ipcRenderer.invoke('planner:blocks', from, to),
  routineSets: () => ipcRenderer.invoke('planner:routine-sets'),
  saveRoutineSet: (x: object) => ipcRenderer.invoke('planner:save-routine-set', x),
  activateRoutine: (id: number | null) => ipcRenderer.invoke('planner:activate-routine', id),
  deleteRoutineSet: (id: number) => ipcRenderer.invoke('planner:delete-routine-set', id),
  dayChange: (id: number, date: string, change: object) => ipcRenderer.invoke('planner:day-change', id, date, change),
  clearDayChange: (id: number, date: string) => ipcRenderer.invoke('planner:clear-day-change', id, date),
  onOpenBlock: (f: (id: number) => void) => {
    const h = (_e: unknown, id: number) => f(id);
    ipcRenderer.on('planner:open-block', h);
    return () => { ipcRenderer.removeListener('planner:open-block', h); };
  },
  onReminder: (f: (id: number) => void) => {
    const h = (_e: unknown, id: number) => f(id);
    ipcRenderer.on('planner:reminder', h);
    return () => { ipcRenderer.removeListener('planner:reminder', h); };
  },
  answerPair: (allow: boolean) => ipcRenderer.send('screen:pair-answer', allow),
  removeBrowser: (origin: string) => ipcRenderer.invoke('screen:remove-browser', origin),
  onPairRequest: (f: (name: string) => void) => {
    const h = (_e: unknown, name: string) => f(name);
    ipcRenderer.on('screen:pair-request', h);
    return () => { ipcRenderer.removeListener('screen:pair-request', h); };
  },
  onScreenStatus: (f: (s: object) => void) => {
    const h = (_e: unknown, s: object) => f(s);
    ipcRenderer.on('screen:status', h);
    return () => { ipcRenderer.removeListener('screen:status', h); };
  },
});
