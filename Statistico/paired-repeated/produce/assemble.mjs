import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { highlightReport } from '../../video-workflow/overlay/highlight.mjs';

const ROOT = 'e:/OneDrive/GitHub/Statistico/paired-repeated';
const WORK = path.join(ROOT, '04_review/work');
const AUDIO = path.join(ROOT, '03_audio');
const OUT = path.join(ROOT, '04_review');
const FFMPEG = process.env.FFMPEG || 'C:/Users/Avi Benita/AppData/Local/Programs/Python/Python314/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';
const BRIDGE_FADE = 0.38;
const CARD_FADE = 0.6;

const FOCUS = {
  orient: [
    { t0: 0.45, t1: 13.2, z: 1.24, fx: 0.52, fy: 0.24 },
    { t0: 13.9, t1: 23.2, z: 1.42, fx: 0.13, fy: 0.42 },
    { t0: 24.0, t1: 40.0, z: 1.22, fx: 0.58, fy: 0.34 }
  ],
  pairs: [
    { t0: 0.4, t1: 11.0, z: 1.30, fx: 0.72, fy: 0.62 },
    { t0: 11.6, t1: 28.0, z: 1.34, fx: 0.72, fy: 0.62 }
  ],
  assumptions: [
    { t0: 0.4, t1: 8.6, z: 1.36, fx: 0.55, fy: 0.36 },
    { t0: 9.2, t1: 22.0, z: 1.32, fx: 0.55, fy: 0.46 }
  ],
  result: [
    { t0: 0.45, t1: 15.5, z: 1.42, fx: 0.30, fy: 0.55 },
    { t0: 16.2, t1: 34.0, z: 1.38, fx: 0.30, fy: 0.42 }
  ],
  rank: [
    { t0: 0.4, t1: 18.0, z: 1.36, fx: 0.30, fy: 0.68 }
  ]
};

function run(args) {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed\n${(r.stderr || '').slice(-2500)}`);
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

function focusFilter(windows) {
  if (!windows || !windows.length) return '';
  const rise = 0.5;
  const parts = windows.map((w) => {
    const env = `if(between(in_time\\,${w.t0}\\,${w.t1})\\,min(1\\,min((in_time-${w.t0})/${rise}\\,(${w.t1}-in_time)/${rise}))\\,0)`;
    return { env, dz: (w.z - 1).toFixed(4), fx: (w.fx - 0.5).toFixed(4), fy: (w.fy - 0.5).toFixed(4) };
  });
  const z = `1+${parts.map((p) => `${p.dz}*${p.env}`).join('+')}`;
  const fx = `0.5+${parts.map((p) => `${p.fx}*${p.env}`).join('+')}`;
  const fy = `0.5+${parts.map((p) => `${p.fy}*${p.env}`).join('+')}`;
  return `,zoompan=z='${z}':x='max(0\\,min(iw-iw/zoom\\,iw*(${fx})-iw/zoom/2))':y='max(0\\,min(ih-ih/zoom\\,ih*(${fy})-ih/zoom/2))':d=1:s=1728x1080:fps=30`;
}

const scenes = JSON.parse(fs.readFileSync(path.join(WORK, 'scenes.json'), 'utf8'));
const normDir = path.join(WORK, 'norm');
fs.mkdirSync(normDir, { recursive: true });

const reuseNorm = process.argv.includes('--join');
const normalized = [];
for (const scene of scenes) {
  const dest = path.join(normDir, `${scene.id}.mp4`);
  if (!(reuseNorm && fs.existsSync(dest))) {
    const trim = Math.max(0, Number(scene.trim) || 0);
    run([
      '-y', '-i', scene.src,
      '-vf', `trim=start=${trim.toFixed(3)},setpts=PTS-STARTPTS,scale=1728:1080:flags=lanczos,fps=30${focusFilter(FOCUS[scene.id])},format=yuv420p`,
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p',
      dest
    ]);
  }
  const duration = durationOf(dest);
  normalized.push({ ...scene, file: dest, duration });
  console.log(scene.id, duration.toFixed(2));
}

const byId = Object.fromEntries(normalized.map((scene) => [scene.id, scene]));
const card1 = byId.card1;
const card2 = byId.card2;
const bridge = byId.bridge;
if (!bridge) throw new Error('bridge scene is missing');
if (!byId.thanks) throw new Error('thanks scene is missing');

const cardsFile = path.join(normDir, 'cards.mp4');
const cardOffset = Math.max(0, card1.duration - CARD_FADE);
run([
  '-y', '-i', card1.file, '-i', card2.file,
  '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${CARD_FADE}:offset=${cardOffset.toFixed(3)},format=yuv420p[v]`,
  '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p',
  cardsFile
]);
const cardsDuration = durationOf(cardsFile);
const cardsOnly = path.join(OUT, 'paired-repeated__capabilities_two_cards__r001.mp4');
run([
  '-y', '-i', cardsFile,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-an',
  cardsOnly
]);

const sequence = ['open', 'orient', 'pairs', 'assumptions', 'result', 'rank', 'card1', 'card2', 'thanks', 'close'];
const filters = [`[${sequence.length}:v]split=${sequence.length - 2}`];
const splitLabels = [];
for (let i = 0; i < sequence.length - 2; i += 1) {
  splitLabels.push(`[b${i}]`);
}
filters[0] += splitLabels.join('');
let accDur = byId.open.duration;
let prev = '[0:v]';
let bridgeSlot = 0;
const starts = { open: 0 };
for (let i = 1; i < sequence.length; i += 1) {
  const id = sequence[i];
  const prevId = sequence[i - 1];
  const input = `[${sequence.indexOf(id)}:v]`;
  if (prevId === 'card1' && id === 'card2') {
    const offset = accDur - CARD_FADE;
    filters.push(`${prev}${input}xfade=transition=fade:duration=${CARD_FADE}:offset=${offset.toFixed(3)}[j${i}]`);
    starts[id] = offset;
    accDur = accDur + byId[id].duration - CARD_FADE;
    prev = `[j${i}]`;
    continue;
  }
  const bridgeOffset = accDur - BRIDGE_FADE;
  const midDur = accDur + bridge.duration - BRIDGE_FADE;
  const contentOffset = midDur - BRIDGE_FADE;
  filters.push(`${prev}${splitLabels[bridgeSlot]}xfade=transition=fade:duration=${BRIDGE_FADE}:offset=${bridgeOffset.toFixed(3)}[m${i}]`);
  filters.push(`[m${i}]${input}xfade=transition=fade:duration=${BRIDGE_FADE}:offset=${contentOffset.toFixed(3)}[j${i}]`);
  starts[id] = contentOffset;
  accDur = midDur + byId[id].duration - BRIDGE_FADE;
  prev = `[j${i}]`;
  bridgeSlot += 1;
}

filters.push(`${prev}fade=t=out:st=${Math.max(0, accDur - 0.7).toFixed(3)}:d=0.7,format=yuv420p[v]`);

const picture = path.join(normDir, 'picture.mp4');
const inputs = [];
for (const id of sequence) inputs.push('-i', byId[id].file);
inputs.push('-i', bridge.file);
run([
  '-y', ...inputs,
  '-filter_complex', filters.join(';'),
  '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  picture
]);
const pictureDuration = durationOf(picture);

const placed = [];
for (const scene of normalized) {
  if (starts[scene.id] == null) continue;
  for (const cue of scene.cues || []) {
    placed.push({
      id: cue.id,
      file: path.join(AUDIO, `${cue.id}.mp3`),
      at: starts[scene.id] + cue.at
    });
  }
}

const audioInputs = ['-y'];
const audioFilters = [];
const mix = [];
placed.forEach((cue, i) => {
  audioInputs.push('-i', cue.file);
  const ms = Math.round(cue.at * 1000);
  audioFilters.push(`[${i}:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=mono,adelay=${ms}:all=1,apad=pad_dur=${pictureDuration.toFixed(3)}[a${i}]`);
  mix.push(`[a${i}]`);
});
const speech = path.join(normDir, 'speech.wav');
run([
  ...audioInputs,
  '-filter_complex', `${audioFilters.join(';')};${mix.join('')}amix=inputs=${placed.length}:normalize=0:duration=longest:dropout_transition=0[a]`,
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

const film = path.join(OUT, 'paired-repeated__film__review-r001.mp4');
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
  starts,
  filmBytes: fs.statSync(film).size,
  cardsBytes: fs.statSync(cardsOnly).size,
  placed,
  loudness: { integrated: iMatch && iMatch.slice(-1)[0], peak: peakMatch && peakMatch.slice(-1)[0] },
  scenes: normalized.map((s) => ({ id: s.id, duration: s.duration, cues: s.cues })),
  highlight: highlightReport(normalized, starts)
};
fs.writeFileSync(path.join(WORK, 'assemble.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
