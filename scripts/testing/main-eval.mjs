// Runs one expression in the Electron main process over the local inspector port.
const list = await (await fetch('http://127.0.0.1:9334/json')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id === 1) { console.log(JSON.stringify(d.result?.result?.value ?? d.result)); ws.close(); }
});
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: process.argv[2], returnByValue: true, includeCommandLineAPI: true } }));
