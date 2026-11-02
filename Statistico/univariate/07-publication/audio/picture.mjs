import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire('E:/OneDrive/0EzPaste2026/_tmp_publish_installer/_demo_video/package.json');
const ffmpeg = require('ffmpeg-static');
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const src = 'E:/OneDrive/0EzPaste2026/_tmp_publish_installer/Statistico-Website/media/demos/univariate/univariate__capcut__v001-web.mp4';
const wav = path.join(dir, 'mix-loud.wav');
const dest = process.argv[2];
const dur = process.argv[3];

const zooms = [
  { t0: 19.9, t1: 24.2, z: 1.16, cx: 864, cy: 760 },
  { t0: 27.2, t1: 29.4, z: 2.0, cx: 260, cy: 250 },
  { t0: 29.5, t1: 32.05, z: 1.4, cx: 560, cy: 640 },
  { t0: 42.0, t1: 45.4, z: 1.9, cx: 1200, cy: 310 },
  { t0: 57.7, t1: 62.2, z: 1.55, cx: 864, cy: 730 },
  { t0: 62.3, t1: 65.35, z: 2.2, cx: 1160, cy: 200 },
  { t0: 74.4, t1: 88.4, z: 2.2, cx: 1260, cy: 330 },
  { t0: 94.6, t1: 104.1, z: 1.75, cx: 340, cy: 230 },
  { t0: 104.7, t1: 114.2, z: 1.32, cx: 680, cy: 400 },
  { t0: 116.1, t1: 119.0, z: 1.4, cx: 620, cy: 280 },
  { t0: 119.2, t1: 130.0, z: 1.3, cx: 864, cy: 420 },
  { t0: 134.7, t1: 143.1, z: 1.5, cx: 680, cy: 400 },
  { t0: 143.2, t1: 148.4, z: 1.35, cx: 864, cy: 640 },
  { t0: 149.5, t1: 155.2, z: 1.38, cx: 864, cy: 400 },
  { t0: 155.5, t1: 160.9, z: 1.55, cx: 640, cy: 380 },
  { t0: 162.0, t1: 167.2, z: 1.42, cx: 1100, cy: 420 }
];

const captions = [
  [4.08, 6.15, 'Change the bins or the range.'],
  [6.21, 16.7, 'More bins reveal finer detail.'],
  [19.95, 23.15, 'Outliers sit beyond the fences.'],
  [23.35, 26.65, 'These are potential outliers.'],
  [26.85, 31.9, 'Flagged observations.'],
  [35.25, 41.4, 'A smooth curve through the same points.'],
  [41.65, 50.6, 'A smaller bandwidth redraws the curve.'],
  [54.05, 57.55, 'Compared with a normal reference.'],
  [57.75, 65.6, 'Cumulative probabilities.'],
  [69.0, 75.5, 'Each test, one normal reference.'],
  [75.85, 91.32, 'Alpha changes the threshold.'],
  [96.4, 104.6, '95 percent confidence, centered on the mean.'],
  [105.0, 119.2, 'Higher confidence, wider interval.'],
  [119.6, 125.2, 'Bootstrap the median.'],
  [125.5, 131.6, 'The center follows the resamples.'],
  [135.0, 149.6, 'Is the mean different from 200?'],
  [150.4, 155.2, 'Observed statistic and rejection regions.'],
  [161.7, 166.8, 'Required sample size, 139.']
];

function ease(t0, t1, zMax) {
  const a = 0.4;
  const rise = (zMax - 1).toFixed(4);
  const h0 = (t0 + a).toFixed(2);
  const h1 = (t1 - a).toFixed(2);
  return `if(lt(t,${t0}),0,if(lt(t,${h0}),(t-${t0})/${a}*${rise},if(lt(t,${h1}),${rise},if(lt(t,${t1}),(1-(t-${h1})/${a})*${rise},0))))`;
}

const zExpr = `1+${zooms.map((z) => ease(z.t0, z.t1, z.z)).join('+')}`;

function axis(zoom, center, outCenter, full) {
  const local = `(1+${ease(zoom.t0, zoom.t1, zoom.z)})`;
  const denom = zoom.z - 1;
  const expr = `(${center}*${local}-${outCenter})-((${center}-${outCenter})*(${zoom.z}-${local})/${denom})`;
  return `if(between(t,${zoom.t0},${zoom.t1}),${expr},`;
}

let xExpr = zooms.map((z) => axis(z, z.cx, 864, 1728)).join('');
xExpr += '0' + ')'.repeat(zooms.length);
let yExpr = zooms.map((z) => axis(z, z.cy, 540, 1080)).join('');
yExpr += '0' + ')'.repeat(zooms.length);

const boxOn = captions.map(([a, b]) => `between(t,${a},${b})`).join('+');

const covers = [
  { file: 'card-qq.png', at: 51.05, t0: 50.52, t1: 50.86 },
  { file: 'card-norm.png', at: 65.95, t0: 65.52, t1: 65.88 },
  { file: 'card-ci.png', at: 91.78, t0: 91.36, t1: 91.7 },
  { file: 'card-test.png', at: 132.08, t0: 131.62, t1: 132.0 }
];
const stillDir = 'E:/OneDrive/0EzPaste2026/Statistico/univariate/07-publication/qa-web/trans';
for (const cover of covers) {
  const png = path.join(stillDir, cover.file);
  const shot = spawnSync(ffmpeg, ['-y', '-ss', String(cover.at), '-i', src, '-frames:v', '1', '-update', '1', png], { encoding: 'utf8' });
  if (shot.status) {
    console.error((shot.stderr || '').slice(-300));
    process.exit(shot.status);
  }
}
let covered = '[0:v]';
const overlays = covers.map((cover, i) => {
  const out = `c${i}`;
  const line = `${covered}[${i + 1}:v]overlay=eof_action=pass:repeatlast=0[${out}]`;
  covered = `[${out}]`;
  return line;
});
const tail = [
  `${covered}drawbox=x=0:y=948:w=iw:h=132:color=0x0E141B:t=fill:enable='between(t,3.4,167.7)'[cap];[cap]scale=w='trunc(in_w*(${zExpr})/2)*2':h='trunc(in_h*(${zExpr})/2)*2':eval=frame:flags=lanczos`,
  `crop=1728:1080:x='trunc(max(0,min(trunc(1728*(${zExpr})/2)*2-1728,${xExpr})))':y='trunc(max(0,min(trunc(1080*(${zExpr})/2)*2-1080,${yExpr})))'`,
  `drawbox=x=0:y=948:w=iw:h=132:color=0x0E141B:t=fill:enable='between(t,3.4,167.7)'`
].join(',') + '[vout]';
const filter = overlays.join(';') + ';' + tail;

const filterPath = path.join(dir, 'picture.txt');
fs.writeFileSync(filterPath, filter);
const args = ['-y', '-i', src];
for (const cover of covers) {
  const span = (cover.t1 - cover.t0).toFixed(3);
  args.push('-loop', '1', '-framerate', '30', '-itsoffset', String(cover.t0), '-t', span, '-i', path.join(stillDir, cover.file));
}
const withAudio = fs.existsSync(wav) && !dur;
if (withAudio) args.push('-i', wav);
args.push('-filter_complex_script', filterPath, '-map', '[vout]');
if (withAudio) args.push('-map', `${covers.length + 1}:a:0`);
else args.push('-an');
args.push('-t', dur || '171.25');
args.push(
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-r', '30'
);
if (withAudio) args.push('-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-ar', '44100');
args.push('-movflags', '+faststart', dest);
const r = spawnSync(ffmpeg, args, { encoding: 'utf8' });
if (r.status) {
  console.error((r.stderr || '').slice(-1200));
  process.exit(r.status);
}
console.log('wrote', dest);
