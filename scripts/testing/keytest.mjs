// node keytest.mjs <key>: is this browser key still accepted?
const r = await fetch(`http://127.0.0.1:${process.env.DESKWATCH_PORT ?? 47616}/v1/tab`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'chrome-extension://abcdefghijklmnop', 'X-Desk-Watch-Code': process.argv[2] },
  body: JSON.stringify({ url: 'https://x.com/' }),
});
console.log('key accepted?', r.status === 200, `(${r.status})`);
