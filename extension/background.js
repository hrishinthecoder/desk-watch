// Desk Watch blocker: sends the active tab's address to the Desk Watch app on this computer
// (127.0.0.1 only) when it changes and every 30 s. If the app answers "block", the tab is sent
// to the "Back to work" page. Nothing is sent anywhere else; only the connection key and the
// last connection status are stored.
// Website notifications: while Desk Watch says "quiet" (a running session), every site's notifications are blocked
// with Chrome's own site setting; they come back when the session ends, pauses, or Desk Watch cannot be reached.
const APP = 'http://127.0.0.1:47615';

const browserName = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/')) return 'Opera';
  if (navigator.brave) return 'Brave';
  return 'Chrome';
};
const setStatus = (status) => chrome.storage.local.set({ status });

// Sets or clears only this extension's own block, so your own per-site choices come back untouched.
async function setQuiet(quiet) {
  const { quiet: was } = await chrome.storage.local.get('quiet');
  if (!!was === quiet) return;
  if (quiet) await chrome.contentSettings.notifications.set({ primaryPattern: '<all_urls>', setting: 'block' });
  else await chrome.contentSettings.notifications.clear({});
  await chrome.storage.local.set({ quiet });
}

// Asks Desk Watch to connect; you click Allow there. `manual`: you pressed Connect in the options.
async function pair(manual = false) {
  const { key, declined } = await chrome.storage.local.get(['key', 'declined']);
  if (key || (declined && !manual)) return;
  await setStatus('Asking Desk Watch to connect… click Allow in the Desk Watch window.');
  try {
    const r = await fetch(`${APP}/v1/pair`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ browser: browserName() }),
    });
    if (r.ok) {
      await chrome.storage.local.set({ key: (await r.json()).key, declined: false });
      await setStatus('Connected to Desk Watch.');
      report(await activeTab({ lastFocusedWindow: true }));
    } else if (r.status === 429) {
      await setStatus('Desk Watch is answering another browser; try again in a moment.');
    } else {
      await chrome.storage.local.set({ declined: true });
      await setStatus('Not allowed in Desk Watch. Click Connect to ask again.');
    }
  } catch {
    await setStatus('Desk Watch is not running. Open it, then click Connect.');
  }
}

async function report(tab) {
  if (!tab || !tab.active || typeof tab.url !== 'string') return;
  const { key, code } = await chrome.storage.local.get(['key', 'code']);
  const secret = key || code;
  if (!secret) return pair();
  try {
    const r = await fetch(`${APP}/v1/tab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Desk-Watch-Code': secret },
      body: JSON.stringify({ url: tab.url }),
    });
    if (r.status === 403) {
      // Disconnected in Desk Watch (or the code changed): stop until you click Connect.
      await chrome.storage.local.set({ key: '', declined: true });
      await setQuiet(false);
      return setStatus('Disconnected from Desk Watch. Click Connect to connect again.');
    }
    if (!r.ok) { await setQuiet(false); return setStatus(`Desk Watch answered with an error (${r.status}).`); }
    const res = await r.json();
    await chrome.storage.local.set({ status: 'Connected to Desk Watch.', seen: Date.now() });
    await setQuiet(res.quiet === true);
    if (res.block) {
      const site = new URL(tab.url).hostname.replace(/^www\./, '');
      await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(site) });
    }
  } catch {
    await setQuiet(false);
    await setStatus('Desk Watch is not running (or not reachable on this computer).');
  }
}

const activeTab = async (query) => (await chrome.tabs.query({ active: true, ...query }))[0];

// A fresh install or update starts with notifications as you set them.
chrome.runtime.onInstalled.addListener(async () => { await chrome.contentSettings.notifications.clear({}); await chrome.storage.local.set({ quiet: false }); pair(); });
chrome.runtime.onStartup.addListener(() => pair());
chrome.tabs.onActivated.addListener(async ({ tabId }) => report(await chrome.tabs.get(tabId)));
chrome.tabs.onUpdated.addListener((_id, info, tab) => { if (info.url) report(tab); });
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) report(await activeTab({ windowId }));
});
// Heartbeat: lets Desk Watch know the extension is installed, blocks a tab that was already
// open when the session started, and connects once Desk Watch is started.
chrome.alarms.create('heartbeat', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async () => report(await activeTab({ lastFocusedWindow: true })));
chrome.runtime.onMessage.addListener((msg) => {
  if (msg === 'connect') pair(true);
  if (msg === 'test') activeTab({ lastFocusedWindow: true }).then(report);
});
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
