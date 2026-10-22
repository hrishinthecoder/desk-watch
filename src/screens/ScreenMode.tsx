import { useEffect, useState } from 'react';
import { bridge, type BlockSets, type ListEntry, type Range } from '../bridge';
import { listForApp, listForSite, parseEntry, QUICK_ADD, quickOn, toggleQuick } from '../../electron/blocklist';
import { hms } from '../session/accounting';
import { plural, t, tk } from '../../electron/i18n';

const STALE_MS = 90_000;

// Is the browser extension talking to the app? Checked every 5 s while shown.
export function useExtensionInfo() {
  const [info, setInfo] = useState<Awaited<ReturnType<ReturnType<typeof bridge>['screenInfo']>>>(null);
  useEffect(() => {
    const load = () => bridge().screenInfo().then(setInfo);
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);
  const connected = !!info && info.lastSeen > 0 && Date.now() - info.lastSeen < STALE_MS;
  return { info, connected, setInfo };
}

export function ExtensionStatus({ onSetup }: { onSetup?: () => void }) {
  const { info, connected } = useExtensionInfo();
  if (info?.serverError) return <span className="warn">{t('Blocker mode cannot start its local connection: {error}', { error: info.serverError })}</span>;
  return connected
    ? <span className="ok-note">✓ {t('Browser extension connected')}</span>
    : <span className="warn">{t('Browser extension not connected: sites cannot be blocked (apps still can).')}
        {onSetup && <> <button onClick={onSetup}>{t('Set it up')}</button></>}</span>;
}

const GROUPS: { list: ListEntry['list']; kind: ListEntry['kind']; title: string }[] = [
  { list: 'blocked', kind: 'site', title: tk('Blocked sites') },
  { list: 'productive', kind: 'site', title: tk('Productive sites (never blocked)') },
  { list: 'blocked', kind: 'app', title: tk('Blocked apps') },
];
// "Error invoking remote method 'x': Error: text" -> "text"
const errText = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

// Block sets and lists, on the Study tab (Stage D2). During a session (`locked`) the owner's rule
// applies: you can only add blocked sites and apps. The main process enforces it too.
export function BlockLists({ locked: lockedProp }: { locked: boolean }) {
  const [list, setList] = useState<ListEntry[]>([]);
  const [sets, setSets] = useState<BlockSets | null>(null);
  const [typed, setTyped] = useState('');
  const [allow, setAllow] = useState(false);
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');
  const load = async () => { setList(await bridge().getBlocklist()); setSets(await bridge().blockSets()); };
  useEffect(() => { load(); }, []);
  const locked = lockedProp || !!sets?.locked;
  const activeName = sets?.sets.find((s) => s.id === sets.active)?.name ?? '';

  async function run(f: () => Promise<unknown>) {
    setMsg('');
    try { await f(); } catch (e) { setMsg(errText(e)); }
    await load();
  }
  // Each edit starts from the stored list, not this screen's copy, which can be out of date
  // (two panels, or a change made elsewhere). A stale copy would look like a removal mid-session.
  const edit = (f: (cur: ListEntry[]) => ListEntry[]) => run(async () => bridge().setBlocklist(f(await bridge().getBlocklist())));
  const same = (a: ListEntry, b: ListEntry) => a.list === b.list && a.kind === b.kind && a.pattern === b.pattern;
  const changeSet = (op: 'pick' | 'create' | 'rename' | 'delete', id?: number, name?: string) =>
    run(async () => { await bridge().changeBlockSet(op, id, name); setNewName(''); });

  function add() {
    const p = parseEntry(typed);
    if (!p) { setMsg(t('“{typed}” does not look like a web address or a program name.', { typed: typed.trim() })); return; }
    if (allow && !locked && p.kind === 'app') { setMsg(t('Apps can only be blocked, not marked productive.')); return; }
    const to: ListEntry['list'] = allow && !locked ? 'productive' : 'blocked';
    const other = list.find((e) => e.kind === p.kind && e.pattern === p.pattern && e.list !== to);
    if (other && locked) { setMsg(t('{site} is on your productive list. You can move it after the session.', { site: p.pattern })); return; }
    setTyped('');
    const entry = { list: to, kind: p.kind, pattern: p.pattern };
    // Adding a site that is on the other list moves it (not possible mid-session, see above).
    edit((cur) => [...cur.filter((e) => !(e.kind === p.kind && e.pattern === p.pattern)), entry]);
  }

  return (
    <div className="blocklists">
      {!locked && sets && <>
        <div className="cards" role="group" aria-label={t('Block sets')}>
          {sets.sets.map((s) => (
            <button key={s.id} className="card" aria-pressed={s.id === sets.active} onClick={() => changeSet('pick', s.id)}>{s.name}</button>
          ))}
        </div>
        <details>
          <summary className="note">{t('Edit sets')}</summary>
          <div className="row">
            <input className="grow" placeholder={t('Set name')} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button disabled={!newName.trim()} onClick={() => changeSet('create', undefined, newName)}>{t('New set (copy of {name})', { name: activeName })}</button>
            <button disabled={!newName.trim() || sets.active === null} onClick={() => changeSet('rename', sets.active!, newName)}>{t('Rename {name}', { name: activeName })}</button>
            <button className="danger" disabled={sets.sets.length <= 1}
                    onClick={() => confirm(t('Delete the set “{name}”?', { name: activeName })) && changeSet('delete', sets.active!)}>{t('Delete {name}', { name: activeName })}</button>
          </div>
        </details>
      </>}
      {locked && <p className="note">{t('Locked until the session ends: you can only add blocked sites and apps.')}</p>}
      <div className="cards" role="group" aria-label={t('Quick add')}>
        {QUICK_ADD.map((c) => {
          const on = quickOn(list, c);
          return <button key={c.name} className="card" aria-pressed={on} disabled={locked && on} onClick={() => edit((cur) => toggleQuick(cur, c))}>{c.name}</button>;
        })}
      </div>
      {GROUPS.map((g) => {
        const items = list.filter((e) => e.list === g.list && e.kind === g.kind);
        return !!items.length && (
          <div key={g.title} className="list-group">
            <b>{t(g.title)}</b>
            <div className="chips">
              {items.map((e) => (
                <span key={e.pattern} className={`chip ${g.list}`}>{e.pattern}
                  {!locked && <button title={t('Remove')} aria-label={t('Remove {name}', { name: e.pattern })} onClick={() => edit((cur) => cur.filter((x) => !same(x, e)))}>×</button>}</span>
              ))}
            </div>
          </div>
        );
      })}
      <div className="row">
        <input className="grow" placeholder={t('Add site or app, e.g. youtube.com/shorts or Discord')} value={typed}
               onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && typed.trim() && add()} />
        {!locked && <div className="cards" role="group" aria-label={t('Add to')}>
          <button className="card" aria-pressed={!allow} onClick={() => setAllow(false)}>{t('Block')}</button>
          <button className="card" aria-pressed={allow} onClick={() => setAllow(true)}>{t('Always allow')}</button>
        </div>}
        <button disabled={!typed.trim()} onClick={add}>{t('Add')}</button>
      </div>
      {msg && <p className="warn">{msg}</p>}
    </div>
  );
}

// Settings: only the browser connection (Stage D2 moved the lists to the Study tab).
export function ScreenSettings() {
  const { info, connected, setInfo } = useExtensionInfo();
  return (
    <>
      <details className="info">
        <summary><b>{t('Browser extension')}</b> <span className="info-btn" title={t('How to install')}>ⓘ</span></summary>
        <div className="info-card">
          <p>{t('The extension lets Desk Watch see which site is open in Chrome or Edge, and send blocked sites to a “Back to work” page. It only talks to this computer. Firefox is not supported.')}</p>
          <p><b>{t('Install (once):')}</b> {t('1. Click Open extension folder. 2. In Chrome open chrome://extensions (Edge: edge://extensions), switch on Developer mode, click Load unpacked and choose that folder. 3. Desk Watch asks “Connect Chrome?”: click Allow. Done.')}</p>
          <p><b>{t('Pairing code')}</b> {t('(only if the Allow question does not appear): type it in the extension’s options.')}</p>
          <p>{t('For private windows, also switch on Allow in incognito in the extension’s details.')}</p>
        </div>
      </details>
      {connected ? <span className="ok-note">✓ {t('Connected')}</span> : <span className="warn">{t('Not connected yet')}</span>}
      {!!info?.browsers.length && <div className="chips">
        {info.browsers.map((b) => (
          <span key={b.origin} className="chip">{b.name}
            <button title={t('Disconnect')} onClick={async () => { await bridge().removeBrowser(b.origin); setInfo(await bridge().screenInfo()); }}>×</button></span>
        ))}
      </div>}
      <div className="row">
        <span className="note">{t('Pairing code (fallback):')} <b className="code">{info?.code ?? '…'}</b></span>
        <button onClick={async () => { await bridge().newPairingCode(); setInfo(await bridge().screenInfo()); }}>{t('New code')}</button>
        <button onClick={() => bridge().openExtensionFolder()}>{t('Open extension folder')}</button>
      </div>
      <p className="note">{t('Block lists and sets are on the Study tab: tick Blocker mode.')}</p>
    </>
  );
}

// Report: where the time went on the computer, and blocked attempts. Only for Blocker mode sessions.
export function UsageView({ data }: { data: Range }) {
  const [list, setList] = useState<ListEntry[]>([]);
  useEffect(() => { bridge().getBlocklist().then(setList); }, []);
  if (!data.usage.length) return null;
  const by = new Map<string, { kind: string; name: string; sec: number }>();
  for (const u of data.usage) {
    const k = `${u.kind}:${u.name}`;
    const e = by.get(k) ?? { kind: u.kind, name: u.name, sec: 0 };
    e.sec += (u.end - u.start) / 1000;
    by.set(k, e);
  }
  const rows = [...by.values()].filter((e) => e.sec >= 1).sort((a, b) => b.sec - a.sec).slice(0, 10);
  const tag = (e: { kind: string; name: string }) => e.kind === 'site' ? listForSite(list, `https://${e.name}/`) : listForApp(list, e.name, e.name);
  const blocked = data.events.filter((e) => e.type === 'blocked_attempt').length;
  return (
    <div>
      <h3>{t('On the computer')}</h3>
      <p className="note">{t(plural(blocked, '{n} blocked attempt', '{n} blocked attempts'), { n: blocked })}</p>
      <table>
        <tbody>
          {rows.map((e) => {
            const g = tag(e);
            return <tr key={e.kind + e.name}><td>{e.name} <small>{t(e.kind === 'site' ? 'site' : 'app')}</small></td><td>{hms(e.sec)}</td><td>{g && <span className={`chip ${g}`}>{t(g === 'blocked' ? 'blocked' : 'productive')}</span>}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

// "Allow this browser?" shown over every screen when a newly installed extension asks to connect.
export function PairDialog() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => bridge().onPairRequest(setName), []);
  if (name === null) return null;
  const answer = (allow: boolean) => { bridge().answerPair(allow); setName(null); };
  return (
    <div className="modal-back">
      <div className="modal" role="dialog" aria-labelledby="pair-title">
        <h2 id="pair-title">{t('Connect {name}?', { name })}</h2>
        <p>{t('The Desk Watch blocker extension in {name} wants to connect, so Blocker mode can block sites there.', { name })}</p>
        <p className="note">{t('Only allow it if you just installed the extension yourself.')}</p>
        <div className="row">
          <button className="primary-sm" onClick={() => answer(true)}>{t('Allow')}</button>
          <button onClick={() => answer(false)}>{t('Don’t allow')}</button>
        </div>
      </div>
    </div>
  );
}
