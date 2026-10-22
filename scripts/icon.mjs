// Writes build/icon.png (256 × 256) for the installer: the same green circle with a white pupil that the app draws
// in code for its window and tray (electron/main.ts appIcon). No image tools needed: a small PNG writer.
//   node scripts/icon.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const N = 256, rows = [];
for (let y = 0; y < N; y++) {
  const row = Buffer.alloc(1 + N * 4); // filter byte 0, then RGBA
  for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - (N - 1) / 2, y - (N - 1) / 2) / N; // as a share of the size, like appIcon's 32 px grid
    const edge = Math.min(1, Math.max(0, (14.5 / 32 - d) * N)); // smooth edge
    const pupil = Math.min(1, Math.max(0, (6 / 32 - d) * N));
    const [r, g, b] = [0x1f + (255 - 0x1f) * pupil, 0x9d + (255 - 0x9d) * pupil, 0x55 + (255 - 0x55) * pupil];
    row.set([r, g, b, 255 * edge].map(Math.round), 1 + x * 4);
  }
  rows.push(row);
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
mkdirSync('build', { recursive: true });
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
writeFileSync('build/icon.png', png);
// The same picture as a Windows .ico (one 256 px PNG inside, allowed since Windows Vista). With it the installer build
// skips electron-builder's own PNG → ICO step, which failed twice with "WebAssembly.Memory(): could not allocate memory"
// when the computer was low on free memory (2026-10-22).
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); // header: icon file, 1 image
ico[6] = 0; ico[7] = 0; // width and height 0 = 256
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); // colour planes, bits per pixel
ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18); // image size and where it starts
writeFileSync('build/icon.ico', Buffer.concat([ico, png]));
console.log('wrote build/icon.png and build/icon.ico');
