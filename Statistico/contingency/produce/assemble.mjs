import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = 'e:/OneDrive/GitHub/Statistico/contingency';
const WORK = path.join(ROOT, '04_review/work');
const AUDIO = path.join(ROOT, '03_audio');
const OUT = path.join(ROOT, '04_review');
const FFMPEG = process.env.FFMPEG || 'C:/Users/Avi Benita/AppData/Local/Programs/Python/Python314/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';

function run(args, opts = {}) {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed\n${(r.stderr || '').slice(-2000)}`);
  }
  return r;
}

function durationOf(file) {
  const r = spawnSync(FFMPEG, ['-i', file], { encoding: 'utf8' });
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(`${r.stdout || ''}\n${r.stderr || ''}`);
  if (!m) throw new Error(`No duration for ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function loudnormMeasured(file) {
  const r = spawnSync(FFMPEG, ['-i', file, '-af', 'loudnorm=I=-16.6:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const text = `${r.stdout || ''}\n${r.stderr || ''}`;
  const start = text.lastIndexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`loudnorm measure failed\n${text.slice(-1500)}`);
  return JSON.parse(text.slice(start, end + 1));
}

const scenes = JSON.parse(fs.readFileSync(path.join(WORK, 'scenes.json'), 'utf8'));
const normDir = path.join(WORK, 'norm');
fs.mkdirSync(normDir, { recursive: true });

const normalized = [];
for (const scene of scenes) {
  const dest = path.join(normDir, `${scene.id}.mp4`);
  const trim = Math.max(0, Number(scene.trim) || 0);
  run([
    '-y', '-i', scene.src,
    '-vf', `trim=start=${trim.toFixed(3)},setpts=PTS-STARTPTS,scale=1728:1080:flags=lanczos,fps=30,format=yuv420p`,
    '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p',
    dest
  ]);
  const duration = durationOf(dest);
  normalized.push({ ...scene, file: dest, duration });
  console.log(scene.id, duration.toFixed(2));
}

const card1 = normalized.find((s) => s.id === 'card1');
const card2 = normalized.find((s) => s.id === 'card2');
const fade = 0.6;
const offset = Math.max(0, card1.duration - fade);
const cardsFile = path.join(normDir, 'cards.mp4');
run([
  '-y', '-i', card1.file, '-i', card2.file,
  '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(3)},format=yuv420p[v]`,
  '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p',
  cardsFile
]);
const cardsDuration = durationOf(cardsFile);
const cardsOnly = path.join(OUT, 'contingency__capabilities_two_cards__r001.mp4');
run([
  '-y', '-i', cardsFile,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-an',
  cardsOnly
]);

const order = ['open', 'orient', 'percent', 'twobytwo', 'segments', 'pattern', 'sparse'];
const bodyList = path.join(normDir, 'body.txt');
fs.writeFileSync(bodyList, order.map((id) => `file '${normalized.find((s) => s.id === id).file.replace(/\\/g, '/')}'`).join('\n'));
const bodyFile = path.join(normDir, 'body.mp4');
run(['-y', '-f', 'concat', '-safe', '0', '-i', bodyList, '-c', 'copy', bodyFile]);
const bodyDuration = durationOf(bodyFile);
const close = normalized.find((s) => s.id === 'close');

const picture = path.join(normDir, 'picture.mp4');
const closeFade = Math.max(0, close.duration - 0.7);
run([
  '-y', '-i', bodyFile, '-i', cardsFile, '-i', close.file,
  '-filter_complex',
  `[2:v]fade=t=out:st=${closeFade.toFixed(3)}:d=0.7,format=yuv420p[close];` +
  `[0:v][1:v][close]concat=n=3:v=1:a=0,format=yuv420p[v]`,
  '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  picture
]);
const pictureDuration = durationOf(picture);

let cursor = 0;
const placed = [];
for (const scene of normalized) {
  let start = cursor;
  if (scene.id === 'card2') start = cursor - fade;
  if (scene.id === 'close') start = bodyDuration + cardsDuration;
  if (scene.id === 'card1') start = bodyDuration;
  for (const cue of scene.cues || []) {
    placed.push({
      id: cue.id,
      file: path.join(AUDIO, `${cue.id}.mp3`),
      at: start + cue.at
    });
  }
  if (scene.id === 'sparse') cursor = bodyDuration;
  else if (scene.id === 'card1') cursor = bodyDuration + card1.duration;
  else if (scene.id === 'card2') cursor = bodyDuration + cardsDuration;
  else if (!['card1', 'card2', 'close'].includes(scene.id)) cursor += scene.duration;
}

const inputs = ['-y'];
const filters = [];
const mix = [];
placed.forEach((cue, i) => {
  inputs.push('-i', cue.file);
  const ms = Math.round(cue.at * 1000);
  filters.push(`[${i}:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=mono,adelay=${ms}:all=1,apad=pad_dur=${pictureDuration.toFixed(3)}[a${i}]`);
  mix.push(`[a${i}]`);
});
const speech = path.join(normDir, 'speech.wav');
run([
  ...inputs,
  '-filter_complex', `${filters.join(';')};${mix.join('')}amix=inputs=${placed.length}:normalize=0:duration=longest:dropout_transition=0[a]`,
  '-map', '[a]', '-t', pictureDuration.toFixed(3), speech
]);

const measured = loudnormMeasured(speech);
const speechNorm = path.join(normDir, 'speech-norm.wav');
run([
  '-y', '-i', speech,
  '-af', `loudnorm=I=-16.6:TP=-1.5:LRA=11:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`,
  speechNorm
]);
const check = spawnSync(FFMPEG, ['-i', speechNorm, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
const report = `${check.stderr || ''}`;
const iMatch = report.match(/I:\s+(-?\d+(?:\.\d+)?)\s+LUFS/g);
const peakMatch = report.match(/Peak:\s+(-?\d+(?:\.\d+)?)\s+dBFS/g);

const film = path.join(OUT, 'contingency__film__review-r001.mp4');
run([
  '-y', '-i', picture, '-i', speechNorm,
  '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-ar', '48000',
  '-movflags', '+faststart',
  film
]);

const summary = {
  pictureDuration,
  cardsDuration,
  bodyDuration,
  filmBytes: fs.statSync(film).size,
  cardsBytes: fs.statSync(cardsOnly).size,
  placed,
  loudness: { integrated: iMatch && iMatch.slice(-1)[0], peak: peakMatch && peakMatch.slice(-1)[0] },
  scenes: normalized.map((s) => ({ id: s.id, duration: s.duration, cues: s.cues }))
};
fs.writeFileSync(path.join(WORK, 'assemble.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
