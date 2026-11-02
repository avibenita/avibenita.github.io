import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire('E:/OneDrive/0EzPaste2026/_tmp_publish_installer/_demo_video/package.json');
const ffmpeg = require('ffmpeg-static');
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const version = process.argv[2];
if (!version) {
  console.error('usage: node transcript.mjs <version>');
  process.exit(1);
}

const cues = JSON.parse(fs.readFileSync(path.join(dir, 'cues.json'), 'utf8'));

function duration(file) {
  const r = spawnSync(ffmpeg, ['-i', file], { encoding: 'utf8' });
  const match = `${r.stderr || ''}`.match(/Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`no duration for ${file}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function stamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

let cursor = 0;
const rows = cues.map((cue) => {
  const src = path.join(dir, 'lines', `${cue.id}.mp3`);
  const dur = duration(src);
  const start = Math.max(cue.at, cursor);
  cursor = start + dur + 0.12;
  return { id: cue.id, start, end: start + dur, spoken: cue.spoken };
});

const stem = `univariate__capcut__v001-${version}`;
const outDir = path.resolve(dir, '..', 'transcripts');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${stem}.md`);
const lines = [
  `# ${stem}`,
  '',
  'Spoken transcript of the placed narration. Times are the start and end of each line in the mix.',
  '',
  '| Start | End | Spoken |',
  '| --- | --- | --- |',
  ...rows.map((row) => `| ${stamp(row.start)} | ${stamp(row.end)} | ${row.spoken} |`),
  ''
];
fs.writeFileSync(outPath, lines.join('\n'));
console.log(outPath);
for (const row of rows) console.log(row.id, stamp(row.start), stamp(row.end));
