import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
const require = createRequire('E:/OneDrive/0EzPaste2026/_tmp_publish_installer/_demo_video/package.json');
const ffmpeg = require('ffmpeg-static');
const src = 'E:/OneDrive/0EzPaste2026/_tmp_publish_installer/Statistico-Website/media/demos/univariate/univariate__capcut__v001-web.mp4';
const dir = 'E:/OneDrive/0EzPaste2026/Statistico/univariate/07-publication/qa-web/trans';
fs.mkdirSync(dir, { recursive: true });
const times = [];
for (let t = 88; t <= 98; t += 0.5) times.push(t);
for (const t of [14, 16, 17, 18, 30, 32, 33, 34, 48, 50, 51, 52, 53, 63, 65, 66, 67, 68, 128, 130, 132, 133, 134, 135]) times.push(t);
for (const t of times) {
  const name = dir + '/t' + String(t).replace('.', 'p') + '.png';
  spawnSync(ffmpeg, ['-y', '-ss', String(t), '-i', src, '-frames:v', '1', '-update', '1', name]);
}
console.log('frames', times.length);
