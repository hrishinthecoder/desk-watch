const $ = (id) => document.getElementById(id);

async function show() {
  const { code = '', status = 'Not connected yet.' } = await chrome.storage.local.get(['code', 'status']);
  if (document.activeElement !== $('code')) $('code').value = code;
  $('status').textContent = status;
}

$('connect').onclick = () => chrome.runtime.sendMessage('connect');
$('test').onclick = async () => {
  await chrome.storage.local.set({ status: 'Checking…' });
  chrome.runtime.sendMessage('test');
};
$('save').onclick = async () => {
  await chrome.storage.local.set({ code: $('code').value.trim().toUpperCase(), key: '', declined: false, status: 'Checking…' });
  chrome.runtime.sendMessage('test');
};
chrome.storage.onChanged.addListener(show);
show();
