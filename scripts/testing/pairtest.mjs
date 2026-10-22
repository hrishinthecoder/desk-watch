// Acts like a newly installed extension: asks to connect, then uses its key.
const APP = `http://127.0.0.1:${process.env.DESKWATCH_PORT ?? 47616}`; // test copy port (DESKWATCH_PORT)
const origin = 'chrome-extension://abcdefghijklmnop';
const post = (path, body, headers = {}) => fetch(APP + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(body) });

// A web page may not ask to connect.
let r = await fetch(APP + '/v1/pair', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' });
console.log('web page asks to connect ->', r.status);

console.log('extension asks to connect (waiting for Allow in Desk Watch)…');
r = await post('/v1/pair', { browser: 'Chrome' });
const body = await r.json();
console.log('pair ->', r.status, body.key ? `key of ${body.key.length} chars` : JSON.stringify(body));
if (!body.key) process.exit(0);
r = await post('/v1/tab', { url: 'https://www.instagram.com/' }, { 'X-Desk-Watch-Code': body.key });
console.log('tab with key ->', r.status, await r.text());
r = await post('/v1/tab', { url: 'https://www.instagram.com/' }, { 'X-Desk-Watch-Code': 'x'.repeat(32) });
console.log('tab with a made-up key ->', r.status);
console.log('KEY', body.key);
