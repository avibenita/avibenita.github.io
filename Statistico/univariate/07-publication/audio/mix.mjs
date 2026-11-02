import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire('E:/OneDrive/0EzPaste2026/_tmp_publish_installer/_demo_video/package.json');
const ffmpeg = require('ffmpeg-static');
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const cues = JSON.parse(fs.readFileSync(path.join(dir, 'cues.json'), 'utf8'));
const SR = 44100;
const DUR = 171.25;
const N = Math.ceil(DUR * SR);

function pcm(file) {
  const r = spawnSync(ffmpeg, ['-i', file, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 32 * 1024 * 1024 });
  if (r.status) throw new Error(r.stderr.toString().slice(-300));
  return r.stdout;
}

function tempo(file, factor, dest) {
  const r = spawnSync(ffmpeg, ['-y', '-i', file, '-filter:a', `atempo=${factor.toFixed(4)}`, dest]);
  if (r.status) throw new Error(r.stderr.toString().slice(-300));
}

const voice = new Float64Array(N);
let cursor = 0;
for (const cue of cues) {
  const src = path.join(dir, 'lines', `${cue.id}.mp3`);
  const samples = pcm(src);
  const dur = samples.length / 2 / SR;
  const start = Math.max(cue.at, cursor);
  const at = Math.floor(start * SR);
  for (let i = 0; i < samples.length; i += 2) {
    const idx = at + (i >> 1);
    if (idx >= N) break;
    const head = Math.min(1, (i / 2) / (SR * 0.02));
    const tail = Math.min(1, ((samples.length - i) / 2) / (SR * 0.04));
    voice[idx] += (samples.readInt16LE(i) / 32768) * Math.min(head, tail);
  }
  cursor = start + dur + 0.12;
  console.log(cue.id, 'at', start.toFixed(2), 'dur', dur.toFixed(2), 'end', (start + dur).toFixed(2));
}

let peak = 0;
for (let i = 0; i < N; i++) {
  voice[i] *= 0.92;
  peak = Math.max(peak, Math.abs(voice[i]));
}
const gain = peak > 0.95 ? 0.95 / peak : 1;
const out = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(voice[i] * gain * 32767))), i * 2);
const pcmPath = path.join(dir, 'mix.pcm');
const wavPath = path.join(dir, 'mix.wav');
fs.writeFileSync(pcmPath, out);
const wav = spawnSync(ffmpeg, ['-y', '-f', 's16le', '-ar', String(SR), '-ac', '1', '-i', pcmPath, wavPath]);
if (wav.status) throw new Error(wav.stderr.toString().slice(-300));
console.log('peak', peak.toFixed(3), 'gain', gain.toFixed(3), 'wav', fs.statSync(wavPath).size);
