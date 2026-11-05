import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { highlightReport } from '../../video-workflow/overlay/highlight.mjs';

const ROOT = 'e:/OneDrive/GitHub/Statistico/regression';
const WORK = path.join(ROOT, '04_review/work');
const AUDIO = process.env.AUDIO_DIR || path.join(ROOT, '03_audio');
const OUT = path.join(ROOT, '04_review');
const FFMPEG = process.env.FFMPEG || 'C:/Users/Avi Benita/AppData/Local/Programs/Python/Python314/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';
const BRIDGE_FADE = 0.38;

function run(args) {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg failed\n${(r.stderr || '').slice(-2500)}`);
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

function focusFor(scene) {
  const events = (scene.highlights || []).filter((event) => event.action === 'show' && event.zoom > 1.01 && event.nx != null);
  return events.map((event, index) => {
    const next = events[index + 1];
    return {
      t0: Math.max(0, Number(event.at) + 0.15),
      t1: next ? Math.max(Number(event.at) + 1.4, Number(next.at) - 0.1) : Number(event.at) + 9,
      z: event.zoom,
      fx: event.nx,
      fy: event.ny
    };
  }).filter((window) => window.t1 > window.t0 + 0.5);
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

const normalized = [];
for (const scene of scenes) {
  const dest = path.join(normDir, `${scene.id}.mp4`);
  const trim = Math.max(0, Number(scene.trim) || 0);
  run([
    '-y', '-i', scene.src,
    '-vf', `trim=start=${trim.toFixed(3)},setpts=PTS-STARTPTS,scale=1728:1080:flags=lanczos,fps=30${focusFilter(focusFor(scene))},format=yuv420p`,
    '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p',
    dest
  ]);
  const duration = durationOf(dest);
  normalized.push({ ...scene, file: dest, duration });
  console.log(scene.id, duration.toFixed(2));
}

const byId = Object.fromEntries(normalized.map((scene) => [scene.id, scene]));
const bridge = byId.bridge;
if (!bridge) throw new Error('bridge scene is missing');
if (!byId.thanks) throw new Error('thanks scene is missing');

const sequence = ['overview', 'enter', 'effects', 'scenario', 'influence', 'catalogue', 'catalogue2', 'thanks', 'close'];
const filters = [`[${sequence.length}:v]split=${sequence.length - 1}`];
const splitLabels = [];
for (let i = 0; i < sequence.length - 1; i += 1) splitLabels.push(`[b${i}]`);
filters[0] += splitLabels.join('');
const firstId = sequence[0];
if (!byId[firstId]) throw new Error(`${firstId} scene is missing`);
let accDur = byId[firstId].duration;
let prev = '[0:v]';
let bridgeSlot = 0;
const starts = { [firstId]: 0 };
for (let i = 1; i < sequence.length; i += 1) {
  const id = sequence[i];
  const input = `[${sequence.indexOf(id)}:v]`;
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
    placed.push({ id: cue.id, file: path.join(AUDIO, `${cue.id}.mp3`), at: starts[scene.id] + cue.at });
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
const film = process.env.FILM_OUT || path.join(OUT, 'regression__film__review-r001.mp4');
run([
  '-y', '-i', picture, '-i', speechNorm,
  '-map', '0:v:0', '-map', '1:a:0',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-ar', '48000',
  '-movflags', '+faststart',
  film
]);
const summary = {
  pictureDuration,
  starts,
  filmBytes: fs.statSync(film).size,
  placed,
  loudness: { integrated: iMatch && iMatch.slice(-1)[0], peak: peakMatch && peakMatch.slice(-1)[0] },
  scenes: normalized.map((scene) => ({ id: scene.id, duration: scene.duration, cues: scene.cues })),
  highlight: highlightReport(normalized, starts)
};
fs.writeFileSync(path.join(WORK, 'assemble.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
