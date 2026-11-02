import { createRequire } from 'module';
import { spawn } from 'child_process';
const require = createRequire('E:/OneDrive/0EzPaste2026/_tmp_publish_installer/_demo_video/package.json');
const ffmpeg = require('ffmpeg-static');
const src = 'E:/OneDrive/0EzPaste2026/_tmp_publish_installer/Statistico-Website/media/demos/univariate/univariate__capcut__v001-web.mp4';
const W = 96;
const H = 60;
const spans = [[49.9, 1.2], [65.2, 1.0], [91.0, 1.0], [131.2, 1.0]];
function scan(start, dur) {
  return new Promise((resolve) => {
    const ff = spawn(ffmpeg, ['-ss', String(start), '-t', String(dur), '-i', src, '-vf', `scale=${W}:${H},fps=30`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'ignore'] });
    const frameBytes = W * H * 3;
    let buf = Buffer.alloc(0);
    let n = 0;
    const hits = [];
    ff.stdout.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= frameBytes) {
        const frame = buf.subarray(0, frameBytes);
        buf = buf.subarray(frameBytes);
        let top = 0;
        let orange = 0;
        let topN = 0;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 3;
            const r = frame[i];
            const g = frame[i + 1];
            const b = frame[i + 2];
            if (y < 22) { top += r + g + b; topN++; }
            if (y > 32 && x < 26 && r > 170 && g > 60 && g < 150 && b < 70) orange++;
          }
        }
        const topMean = top / topN / 3;
        if (topMean < 24 && orange > 6) hits.push((start + n / 30).toFixed(3));
        n++;
      }
    });
    ff.on('close', () => resolve(hits));
  });
}
const all = [];
for (const [start, dur] of spans) all.push(...await scan(start, dur));
console.log(all.join(' ') || 'none');
