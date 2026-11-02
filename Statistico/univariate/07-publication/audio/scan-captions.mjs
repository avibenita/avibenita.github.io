import { createRequire } from 'module';
import { spawnSync } from 'child_process';
const require = createRequire('E:/OneDrive/0EzPaste2026/_tmp_publish_installer/_demo_video/package.json');
const ffmpeg = require('ffmpeg-static');
const src = process.argv[2];
const t = process.argv[3] || '8';
const r = spawnSync(ffmpeg, ['-ss', t, '-i', src, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 20 * 1024 * 1024 });
const W = 1728;
const H = 1080;
const frame = r.stdout;
console.log('bytes', frame.length);
const rows = [];
for (let y = 860; y < H; y += 4) {
  let bright = 0;
  for (let x = 200; x < 1520; x += 2) {
    const i = (y * W + x) * 3;
    if (frame[i] > 160 && frame[i + 1] > 160 && frame[i + 2] > 160) bright++;
  }
  if (bright > 8) rows.push(y + ':' + bright);
}
console.log(t, rows.join(' '));
