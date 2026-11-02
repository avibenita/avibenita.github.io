import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
const require = createRequire('E:/OneDrive/0EzPaste2026/_tmp_publish_installer/_demo_video/package.json');
const ffmpeg = require('ffmpeg-static');
const web = 'E:/OneDrive/0EzPaste2026/_tmp_publish_installer/Statistico-Website/media/demos/univariate/univariate__capcut__v001-vo2.mp4';
const tmp = web.replace(/\.mp4$/, '-tmp.mp4');
const wav = 'E:/OneDrive/0EzPaste2026/Statistico/univariate/07-publication/audio/mix-loud.wav';
const r = spawnSync(ffmpeg, ['-y', '-i', web, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-ar', '44100', '-movflags', '+faststart', tmp], { encoding: 'utf8' });
if (r.status) {
  console.error((r.stderr || '').slice(-400));
  process.exit(r.status);
}
fs.renameSync(tmp, web);
const info = spawnSync(ffmpeg, ['-i', web], { encoding: 'utf8' });
console.log((info.stderr || '').split('\n').filter((line) => /Duration|Audio:|Video:/.test(line)).join('\n'));
console.log('bytes', fs.statSync(web).size);
const lib = 'E:/OneDrive/0EzPaste2026/Statistico/univariate/07-publication/univariate__capcut__v001-vo2.mp4';
fs.copyFileSync(web, lib);
console.log('copied');
