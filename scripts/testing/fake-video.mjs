// Writes a small synthetic video (moving grey bars, no camera images) as a Y4M file, for test copies that use
// Chromium's file-based fake camera (--use-file-for-fake-video-capture). Usage: node fake-video.mjs <out.y4m>
import { openSync, writeSync, closeSync } from 'node:fs';
const out = process.argv[2];
if (!out) { console.log('usage: node scripts/testing/fake-video.mjs <out.y4m>'); process.exit(1); }
const W = 640, H = 360, FRAMES = 60;
const fd = openSync(out, 'w');
writeSync(fd, `YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`);
const y = Buffer.alloc(W * H), uv = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
for (let f = 0; f < FRAMES; f++) {
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) y[r * W + c] = 60 + ((c + f * 8) % 160 < 80 ? 80 : 0);
  writeSync(fd, 'FRAME\n'); writeSync(fd, y); writeSync(fd, uv);
}
closeSync(fd);
console.log('wrote', out);
