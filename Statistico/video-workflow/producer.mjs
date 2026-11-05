import fs from 'fs';
import path from 'path';
import { exists, findAgent, findFfmpeg, keyState, readJson, runProcess, sha256File, sha256Text, spawnTracked, writeJson } from './util.mjs';

export function narrationStemReport(root, config) {
  const cues = readJson(path.join(root, config.narration));
  const audio = path.join(root, config.audioDir);
  const manifestPath = path.join(audio, 'stems.json');
  const manifest = exists(manifestPath) ? readJson(manifestPath) : { cues: {} };
  const stale = [];
  for (const cue of cues) {
    const hash = sha256Text(`${config.voice.voice}|${config.voice.rate}|${cue.spoken}`);
    const recorded = manifest.cues?.[cue.id];
    const mp3 = path.join(audio, `${cue.id}.mp3`);
    if (!exists(mp3) || !recorded || recorded.hash !== hash) stale.push({ id: cue.id, hash, mp3 });
  }
  return stale;
}

export async function regenerateStems(root, config, stale) {
  const cues = readJson(path.join(root, config.narration)).filter((cue) => stale.some((item) => item.id === cue.id));
  const temp = path.join(root, config.workDir, 'stale-cues.json');
  writeJson(temp, cues);
  const script = path.join(root, config.voice.script);
  const audio = path.join(root, config.audioDir);
  const result = runProcess('py', ['-3', script, temp, audio, '--force'], { cwd: root, timeoutMs: 180000 });
  if (result.status !== 0) {
    throw new Error(`Narration regeneration failed. edge-tts did not write the changed stems.\n${(result.stderr || result.stdout).slice(-1500)}`);
  }
  const manifestPath = path.join(audio, 'stems.json');
  const manifest = exists(manifestPath) ? readJson(manifestPath) : { voice: config.voice, cues: {} };
  for (const item of stale) {
    manifest.cues[item.id] = { hash: item.hash, file: `${item.id}.mp3` };
  }
  writeJson(manifestPath, manifest);
}

export async function produceCandidate({ root, config, runDir, round, log }) {
  const ffmpeg = findFfmpeg();
  const stale = config.narration ? narrationStemReport(root, config) : [];
  if (stale.length) {
    log(`Narration text changed for ${stale.map((item) => item.id).join(', ')}. Regenerating those voice stems.`);
    await regenerateStems(root, config, stale);
  }
  log('Recording');
  const capture = spawnTracked(config.captureCommand[0], config.captureCommand.slice(1), { cwd: root, timeoutMs: 30 * 60 * 1000 });
  const captured = await capture.done;
  if (captured.status !== 0) throw new Error(`Recording failed.\n${captured.stderr.slice(-2000)}`);
  log('Assembling');
  const candidate = path.join(runDir, 'candidates', `v${round}.mp4`);
  const cards = path.join(runDir, 'candidates', `cards-v${round}.mp4`);
  fs.mkdirSync(path.dirname(candidate), { recursive: true });
  const env = { ...process.env, FFMPEG: ffmpeg || process.env.FFMPEG, FILM_OUT: candidate, CARDS_OUT: cards };
  const assembled = spawnTracked(config.assembleCommand[0], config.assembleCommand.slice(1), { cwd: root, env, timeoutMs: 30 * 60 * 1000 });
  const result = await assembled.done;
  if (result.status !== 0 || !exists(candidate)) {
    throw new Error(`Assembly failed.\n${result.stderr.slice(-2000)}`);
  }
  const manifestPath = path.join(root, config.workDir, 'assemble.json');
  const manifest = exists(manifestPath) ? readJson(manifestPath) : { scenes: [] };
  return { mp4: candidate, manifest, imported: false, ffmpeg };
}

export function doctorLines(root, config, limits) {
  const lines = ['Checking setup'];
  lines.push(`Node: ${process.version}`);
  const ffmpeg = findFfmpeg();
  lines.push(ffmpeg ? `FFmpeg: ${ffmpeg}` : 'FFmpeg: missing');
  let playwright = 'missing';
  try {
    const resolved = path.join(root, 'statistico-analytics', 'node_modules', 'playwright', 'package.json');
    if (exists(resolved)) playwright = `present (${sha256File(resolved).slice(0, 8)})`;
  } catch (_error) {
    playwright = 'missing';
  }
  lines.push(`Playwright: ${playwright}`);
  const py = runProcess('py', ['-3', '-c', 'import edge_tts; print("ok")'], { cwd: root });
  lines.push(py.status === 0 ? 'edge-tts: present, not used by this check' : 'edge-tts: missing');
  const agent = findAgent();
  lines.push(agent ? `Cursor agent CLI: ${agent} (authentication is not tested by this check)` : 'Cursor agent CLI: not installed. Fully unattended edits are blocked.');
  lines.push(`OpenAI API key: ${keyState('OPENAI_API_KEY')}`);
  lines.push(`Cursor API key: ${keyState('CURSOR_API_KEY')}`);
  const missing = [];
  for (const rel of [...(config.briefs || []), config.standards, config.fixture, config.narration, config.limits]) {
    if (rel && !exists(path.join(root, rel))) missing.push(rel);
  }
  lines.push(missing.length ? `Inputs missing: ${missing.join(', ')}` : 'Inputs: present');
  const output = path.join(root, config.outputDir);
  fs.mkdirSync(output, { recursive: true });
  const probe = path.join(output, '.write-probe');
  fs.writeFileSync(probe, 'ok');
  fs.rmSync(probe);
  lines.push(`Output directory writable: ${output}`);
  lines.push(Number.isFinite(limits.maxEstimatedUsd) ? `Spend ceiling: $${limits.maxEstimatedUsd} local estimate` : 'Spend ceiling: missing');
  if (config.narration && config.audioDir && config.voice) {
    const stale = narrationStemReport(root, config);
    lines.push(stale.length
      ? `Narration stems stale: ${stale.map((item) => item.id).join(', ')}. The next production regenerates only those lines.`
      : 'Narration stems: match the current spoken text');
  }
  const numericalArgs = [...(config.numericalCommand || []).slice(1)];
  if (numericalArgs.some((arg) => String(arg).includes('validate-independent.mjs')) && !numericalArgs.includes('--offline')) {
    numericalArgs.push('--offline');
  }
  const numerical = config.numericalCommand?.length
    ? runProcess(config.numericalCommand[0], numericalArgs, { cwd: root, timeoutMs: 180000 })
    : { status: 1, stdout: '', stderr: 'No numerical command' };
  lines.push(numerical.status === 0 ? 'Numerical contract: passed' : `Numerical contract: failed\n${(numerical.stderr || numerical.stdout).slice(-800)}`);
  lines.push('Approved folder is not written by doctor.');
  const failed = !ffmpeg || missing.length > 0 || numerical.status !== 0 || !Number.isFinite(limits.maxEstimatedUsd);
  return { lines, failed };
}

export function dryRunLines(root, config, limits) {
  return [
    'Checking setup',
    'Dry run. No render, no paid API call, and no production file changes.',
    `Module: ${config.id}`,
    `Capture: ${(config.captureCommand || []).join(' ')}`,
    `Assemble: ${(config.assembleCommand || []).join(' ')}`,
    `Numerical check: ${(config.numericalCommand || []).join(' ')}`,
    `Output: ${path.join(root, config.outputDir, 'runs')}`,
    `Permitted edits: ${(config.permittedPrefixes || []).join(', ')}`,
    `Protected: ${(config.protectedPrefixes || []).join(', ')}`,
    `Frame: ${config.frame.width}x${config.frame.height} ${config.frame.fps} fps`,
    `Review model: ${limits.reviewModel}; transcription: ${limits.transcriptionModel}`,
    `Sample caps: ${limits.overviewFrameCap} overview + ${limits.detailFrameCap} detail frames`,
    `Revision rounds: ${limits.maxRevisionRounds}; candidate reviews: ${limits.maxCandidateReviews}`,
    `Estimated spend ceiling: $${limits.maxEstimatedUsd} (estimate, not a bill)`,
    `OpenAI API key: ${keyState('OPENAI_API_KEY')}`,
    keyState('OPENAI_API_KEY') === 'absent'
      ? 'A normal run stops before recording until OPENAI_API_KEY is set.'
      : 'A normal run may call the paid review API.',
    'Planned stages: setup, numerical validation, recording, assembling, evidence, review, at most two revisions, human viewing.',
    'CapCut approval and the approved folder stay with you.'
  ];
}
