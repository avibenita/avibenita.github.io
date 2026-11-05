import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { ffmpegText, REPO_ROOT, sha256File, writeJson } from './util.mjs';
import { glowDeltaIssue, highlightIssuesFromManifest, meanChannelDelta } from './overlay/highlight.mjs';

function hasFaststart(file) {
  const buf = fs.readFileSync(file);
  const moov = buf.indexOf(Buffer.from('moov'));
  const mdat = buf.indexOf(Buffer.from('mdat'));
  return moov >= 0 && (mdat < 0 || moov < mdat);
}

export const DETECTION_LIMITS = [
  'Overview frames are a bounded sample, not a complete motion review. Unsampled intervals are listed with the evidence.',
  'Blank results and cropped labels are not measured by a local pixel oracle. They are visible to the vision review when that review runs, and they remain unassessed when it does not.',
  'A transcript does not prove voice naturalness, pronunciation, absence of music or noise, or pleasant transitions. Those stay on the human listening and motion pass.',
  'Script cue times are placement times, not measured word timings, unless a timestamped transcript of the rendered audio is attached.'
];

export function probeMedia(ffmpeg, file) {
  const text = ffmpegText(ffmpeg, ['-hide_banner', '-i', file]);
  const duration = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
  const video = /Video: (\w+).*?(\d{3,5})x(\d{3,5}).*?(\d+(?:\.\d+)?) fps/.exec(text);
  const audio = /Audio: (\w+)/.exec(text);
  if (!duration || !video) {
    throw new Error(`The file did not decode as a video: ${file}`);
  }
  return {
    duration: Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]),
    codec: video[1],
    width: Number(video[2]),
    height: Number(video[3]),
    fps: Number(video[4]),
    audioCodec: audio ? audio[1] : null,
    faststart: hasFaststart(file),
    raw: text.slice(-1500)
  };
}

export function measureLoudness(ffmpeg, file) {
  const text = ffmpegText(ffmpeg, ['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const integrated = [...text.matchAll(/I:\s+(-?\d+(?:\.\d+)?)\s+LUFS/g)].pop();
  const peak = [...text.matchAll(/Peak:\s+(-?\d+(?:\.\d+)?)\s+dBFS/g)].pop();
  return {
    integratedLufs: integrated ? Number(integrated[1]) : null,
    peakDbfs: peak ? Number(peak[1]) : null,
    rawTail: text.slice(-800)
  };
}

export function detectSilence(ffmpeg, file) {
  const text = ffmpegText(ffmpeg, [
    '-hide_banner', '-i', file,
    '-af', 'silencedetect=noise=-50dB:d=0.4',
    '-f', 'null', '-'
  ]);
  const intervals = [];
  const starts = [...text.matchAll(/silence_start: (-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  const ends = [...text.matchAll(/silence_end: (-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  for (let i = 0; i < starts.length; i += 1) {
    intervals.push({ start: Math.max(0, starts[i]), end: ends[i] ?? null });
  }
  return intervals;
}

export function classifySilence(intervals, scenes, duration) {
  const findings = [];
  for (const interval of intervals || []) {
    const end = interval.end ?? duration;
    const sceneEnd = (scene) => scene.end ?? duration;
    const intentional = (scenes || []).find((scene) => scene.intentionalSilence && overlapRatio(interval.start, end, scene.start, sceneEnd(scene)) >= 0.6);
    if (intentional) continue;
    const speech = (scenes || []).find((scene) => {
      if (scene.intentionalSilence) return false;
      const span = Math.max(0.001, sceneEnd(scene) - scene.start);
      const overlap = Math.max(0, Math.min(end, sceneEnd(scene)) - Math.max(interval.start, scene.start));
      const eatsOpening = interval.start <= scene.start + span * 0.25;
      return eatsOpening && overlap / span >= 0.5;
    });
    if (speech) {
      findings.push({
        id: `silence-${speech.id}`,
        severity: 'required',
        scene: speech.id,
        start: interval.start,
        end,
        observed: `Unexpected silence in ${speech.id}, which is not an intentional silent card.`
      });
    }
  }
  return findings;
}

function overlapRatio(a0, a1, b0, b1) {
  const left = Math.max(a0, b0);
  const right = Math.min(a1, b1);
  const overlap = Math.max(0, right - left);
  const width = Math.max(0.001, a1 - a0);
  return overlap / width;
}

export function technicalIssues(probe, loudness, moduleConfig) {
  const issues = [];
  const frame = moduleConfig.frame || {};
  if (frame.width && probe.width !== frame.width) issues.push(`width ${probe.width}, expected ${frame.width}`);
  if (frame.height && probe.height !== frame.height) issues.push(`height ${probe.height}, expected ${frame.height}`);
  if (frame.fps && Math.abs(probe.fps - frame.fps) > 0.2) issues.push(`frame rate ${probe.fps}, expected ${frame.fps}`);
  if (frame.codec === 'h264' && !/h264|avc1/i.test(probe.codec)) issues.push(`codec ${probe.codec}, expected H.264`);
  const band = moduleConfig.loudness;
  if (!moduleConfig.skipLoudness && band && loudness.integratedLufs != null) {
    if (loudness.integratedLufs < band.minLufs || loudness.integratedLufs > band.maxLufs) {
      issues.push(`integrated loudness ${loudness.integratedLufs} LUFS is outside ${band.minLufs} to ${band.maxLufs}`);
    }
  }
  if (!moduleConfig.skipLoudness && band && loudness.peakDbfs != null && loudness.peakDbfs > band.maxTruePeakDbtp) {
    issues.push(`peak ${loudness.peakDbfs} dBFS is above ${band.maxTruePeakDbtp} dBTP`);
  }
  return issues;
}

export function highlightTechnicalIssues(manifest, moduleConfig) {
  return highlightIssuesFromManifest(manifest, moduleConfig);
}

const RECITED_VALUE = /\d|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|hundred|thousand|percent|percentage)\b|\br-squared\b|\bp-?value\b/i;

export function recitedNarrationIssues(lines) {
  const issues = [];
  for (const line of lines || []) {
    if (RECITED_VALUE.test(line.spoken || '')) issues.push(`${line.id || 'narration'} recites a displayed value: ${line.spoken}`);
  }
  return issues;
}

function narrationLines(moduleConfig) {
  if (!moduleConfig?.narrationMeaningOnly || !moduleConfig.narration) return [];
  const file = path.join(REPO_ROOT, moduleConfig.narration);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function rawCrop(ffmpeg, mp4, t, crop) {
  const result = spawnSync(ffmpeg, [
    '-v', 'error', '-ss', t.toFixed(3), '-i', mp4, '-frames:v', '1',
    '-vf', `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'
  ], { maxBuffer: 1024 * 1024 });
  return result.stdout && result.stdout.length ? result.stdout : null;
}

function clampCrop(x, y, w, h, videoW, videoH) {
  const cx = Math.max(0, Math.min(videoW - w, Math.round(x)));
  const cy = Math.max(0, Math.min(videoH - h, Math.round(y)));
  return { x: cx, y: cy, w, h };
}

export function encodedGlowMotion(ffmpeg, mp4, highlight, videoW, videoH) {
  const events = highlight?.events || [];
  const candidates = events.filter((event, index) => {
    if (event.action !== 'show' || event.filmAt == null || !event.frame) return false;
    if (event.zoom != null && Number(event.zoom) > 1.01) return false;
    const next = events[index + 1];
    const end = next && next.filmAt != null ? Number(next.filmAt) : Number(event.filmAt) + 3;
    return end - Number(event.filmAt) >= 2.2;
  });
  const preferred = candidates.find((event) => /predictedValue|res-outliers-table|filmFlagged/.test(event.selector || '')) || candidates[0];
  if (!preferred) return { checked: false, note: 'No stationary highlight lasted long enough to sample the breathing glow.' };
  const t0 = Number(preferred.filmAt) + 0.55;
  const t1 = t0 + 1.2;
  const glow = clampCrop(preferred.frame.x + preferred.frame.w / 2 - 12, preferred.frame.y - 18, 24, 14, videoW, videoH);
  const interior = clampCrop(preferred.frame.x + 14, preferred.frame.y + 14, 18, 14, videoW, videoH);
  const glowA = rawCrop(ffmpeg, mp4, t0, glow);
  const glowB = rawCrop(ffmpeg, mp4, t1, glow);
  const insideA = rawCrop(ffmpeg, mp4, t0, interior);
  const insideB = rawCrop(ffmpeg, mp4, t1, interior);
  const glowDelta = meanChannelDelta(glowA, glowB);
  const interiorDelta = meanChannelDelta(insideA, insideB);
  const report = { checked: true, selector: preferred.selector, t0, t1, glowDelta, interiorDelta };
  if (glowDelta == null) return { ...report, issue: 'The encoded highlight sample could not be read.' };
  if (interiorDelta != null && interiorDelta > 12) {
    return { ...report, note: 'The target content changed between glow samples, so the breathing check was not applied.' };
  }
  const glowIssue = glowDeltaIssue(glowA, glowB);
  if (glowIssue) return { ...report, issue: `The breathing glow is not visible in the encoded picture (${glowIssue}).` };
  return report;
}

export function samplePlan(duration, scenes, caps) {
  const overviewCap = caps.overviewFrameCap || 160;
  const detailCap = caps.detailFrameCap || 80;
  const overview = [];
  const step = Math.max(duration / overviewCap, 0.5);
  for (let t = 0; t < duration && overview.length < overviewCap; t += step) overview.push(Number(t.toFixed(3)));
  const detail = [];
  for (const scene of scenes || []) {
    if (detail.length >= detailCap) break;
    detail.push(Number(Math.min(duration - 0.04, scene.start + 0.2).toFixed(3)));
    if (scene.holdSeconds) detail.push(Number(Math.min(duration - 0.04, scene.end - 0.3).toFixed(3)));
  }
  const sampled = [...new Set([...overview, ...detail])].sort((a, b) => a - b);
  const unsampled = [];
  let cursor = 0;
  for (const t of sampled) {
    if (t - cursor > step * 1.5) unsampled.push({ start: Number(cursor.toFixed(3)), end: Number(t.toFixed(3)) });
    cursor = t;
  }
  if (duration - cursor > step * 1.5) unsampled.push({ start: Number(cursor.toFixed(3)), end: Number(duration.toFixed(3)) });
  return { sampled, overview, detail: detail.slice(0, detailCap), unsampled };
}

export async function packageEvidence({ ffmpeg, mp4, manifest, moduleConfig, runDir, round, limits, numerical }) {
  const probe = probeMedia(ffmpeg, mp4);
  const loudness = measureLoudness(ffmpeg, mp4);
  const silence = detectSilence(ffmpeg, mp4);
  const scenes = normalizeScenes(manifest, probe.duration, moduleConfig);
  const silenceFindings = classifySilence(silence, scenes, probe.duration);
  const highlight = manifest?.highlight || null;
  const glowMotion = highlight ? encodedGlowMotion(ffmpeg, mp4, highlight, probe.width, probe.height) : { checked: false };
  const spoken = narrationLines(moduleConfig);
  const tech = technicalIssues(probe, loudness, moduleConfig)
    .concat(highlightTechnicalIssues(manifest, moduleConfig))
    .concat(spoken == null ? ['Narration file is missing.'] : recitedNarrationIssues(spoken));
  if (moduleConfig?.highlightRequired && glowMotion.issue) tech.push(glowMotion.issue);
  if (moduleConfig?.highlightRequired && glowMotion.checked === false && glowMotion.note) tech.push(glowMotion.note);
  const plan = samplePlan(probe.duration, scenes, limits || {});
  const frameDir = path.join(runDir, 'evidence', `v${round}`);
  fs.mkdirSync(frameDir, { recursive: true });
  const frames = [];
  const chosen = plan.sampled.filter((t) => t >= 0 && t < probe.duration).slice(0, (limits?.overviewFrameCap || 160) + (limits?.detailFrameCap || 80));
  for (const t of chosen) {
    const name = `t${String(t).replace('.', '_')}.jpg`;
    const dest = path.join(frameDir, name);
    ffmpegText(ffmpeg, ['-y', '-ss', String(t), '-i', mp4, '-frames:v', '1', '-q:v', '3', dest]);
    if (fs.existsSync(dest)) frames.push({ t, file: dest, kind: plan.detail.includes(t) ? 'detail' : 'overview' });
  }
  const crop = frames.find((frame) => frame.kind === 'detail') || frames[0];
  const crops = [];
  if (crop) {
    const dest = path.join(frameDir, 'detail-crop.jpg');
    ffmpegText(ffmpeg, ['-y', '-i', crop.file, '-vf', 'crop=960:540:40:40', dest]);
    if (fs.existsSync(dest)) {
      crops.push({ t: crop.t, file: dest, x: 40, y: 40, width: 960, height: 540, source: crop.file });
    }
  }
  const evidence = {
    mp4,
    sha256: sha256File(mp4),
    bytes: fs.statSync(mp4).size,
    probe,
    scenes,
    loudness,
    silence,
    silenceFindings,
    technicalIssues: tech,
    frames: frames.map((frame) => ({ t: frame.t, file: path.basename(frame.file), kind: frame.kind })),
    crops: crops.map((item) => ({ ...item, file: path.basename(item.file), source: path.basename(item.source) })),
    frameDir,
    unsampled: plan.unsampled,
    numerical: numerical || null,
    highlight,
    highlightMotion: glowMotion,
    transcript: { status: 'not_run', reason: 'Transcription runs only during a paid review of this exact MP4.' },
    detectionLimits: DETECTION_LIMITS,
    samplingNote: 'Sampling is not a complete motion review.'
  };
  writeJson(path.join(frameDir, 'evidence.json'), evidence);
  return evidence;
}

export function normalizeScenes(manifest, duration, moduleConfig) {
  const listed = Array.isArray(manifest?.scenes) ? manifest.scenes : [];
  const starts = manifest?.starts && typeof manifest.starts === 'object' && !Array.isArray(manifest.starts) ? manifest.starts : null;
  if (listed.length && listed[0]?.id) {
    return listed.filter((scene) => scene.id !== 'bridge').map((scene) => {
      const mapped = starts && starts[scene.id] != null ? Number(starts[scene.id]) : null;
      const start = scene.start != null ? Number(scene.start) : (mapped ?? 0);
      const end = scene.end != null
        ? Number(scene.end)
        : start + Number(scene.duration || 0);
      return {
        id: scene.id,
        start,
        end: end || duration || start,
        holdSeconds: scene.holdSeconds ?? null,
        intentionalSilence: Boolean(
          scene.intentionalSilence
          || (moduleConfig.intentionalSilenceSceneIds || []).includes(scene.id)
          || (Array.isArray(scene.cues) && scene.cues.length === 0)
        )
      };
    });
  }
  return Object.keys(starts || {}).map((id) => ({
    id,
    start: Number(starts[id]),
    end: duration || null,
    holdSeconds: null,
    intentionalSilence: (moduleConfig.intentionalSilenceSceneIds || []).includes(id)
  }));
}

export function makeClip(ffmpeg, dest, seconds, { silent = true } = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const args = ['-y', '-f', 'lavfi', '-i', `color=c=0x0e1b2e:s=320x180:r=30:d=${seconds}`];
  if (silent) args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
  else args.push('-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=48000:duration=${seconds}`);
  args.push('-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', dest);
  const text = ffmpegText(ffmpeg, args);
  if (!fs.existsSync(dest)) throw new Error(`ffmpeg did not write ${dest}\n${text.slice(-500)}`);
  return dest;
}
