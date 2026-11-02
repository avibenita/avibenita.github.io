import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import path from 'path';
const require = createRequire('E:/OneDrive/0EzPaste2026/_tmp_publish_installer/_demo_video/package.json');
const ffmpeg = require('ffmpeg-static');
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const src = path.join(dir, 'mix.wav');
const dest = path.join(dir, 'mix-loud.wav');
const af = 'acompressor=threshold=-18dB:ratio=2.5:attack=15:release=140:makeup=2,loudnorm=I=-16.5:TP=-1.5:LRA=11';
const r = spawnSync(ffmpeg, ['-y', '-i', src, '-af', af, '-ac', '2', dest], { encoding: 'utf8' });
if (r.status) {
  console.error((r.stderr || '').slice(-500));
  process.exit(r.status);
}
const m = spawnSync(ffmpeg, ['-i', dest, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
const lines = (m.stderr || '').split('\n').filter((line) => /I:|LRA:|Peak:|Summary/.test(line));
console.log(lines.slice(-8).join('\n'));
