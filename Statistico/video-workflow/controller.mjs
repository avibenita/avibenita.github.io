import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { packageEvidence, classifySilence, normalizeScenes, DETECTION_LIMITS, makeClip } from './evidence.mjs';
import { finish } from './report.mjs';
import { dryRunLines, produceCandidate } from './producer.mjs';
import { estimateReviewUsd, requiredIssues, reviewWithOpenAI, transcribeMp4, validateReview } from './reviewer.mjs';
import { acceptChanges, proposeWithCursor, revisionOutcome, revisionRequest, writeRevisionInstructions } from './revision.mjs';
import { acquireLock, captureBytes, diffBytes, exists, findFfmpeg, ffmpegText, readJson, restoreBytes, runProcess, SETUP_TEXT, sha256File, writeJson } from './util.mjs';

function newId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function say(log, line) {
  log(line);
}

export async function runAuto(options) {
  const log = options.log || ((line) => console.log(line));
  const root = options.root;
  const config = options.config;
  const limits = options.limits;
  const adapters = options.adapters || {};
  if (options.dryRun) {
    for (const line of dryRunLines(root, config, limits)) say(log, line);
    return { status: 'dry-run', code: 0 };
  }

  say(log, 'Checking setup');
  if (!options.demo && !adapters.review && !process.env.OPENAI_API_KEY) {
    const reason = 'OPENAI_API_KEY is not set, so the paid review cannot run. Recording was not started.';
    say(log, `Stopped: ${reason}`);
    say(log, SETUP_TEXT);
    return { status: 'blocked', code: 2, stoppedReason: reason };
  }
  if (!Number.isFinite(limits.maxEstimatedUsd)) {
    const reason = 'maxEstimatedUsd must be a finite number before a paid run.';
    say(log, `Stopped: ${reason}`);
    return { status: 'blocked', code: 2, stoppedReason: reason };
  }

  const output = path.join(root, config.outputDir);
  fs.mkdirSync(output, { recursive: true });
  const lockPath = path.join(output, '.video-auto.lock');
  let release = () => {};
  try {
    release = acquireLock(lockPath);
  } catch (error) {
    say(log, `Stopped: ${error.message}`);
    return { status: 'blocked', code: 2, stoppedReason: error.message };
  }
  const runId = options.resume || newId();
  const runDir = path.join(output, 'runs', runId);
  fs.mkdirSync(runDir, { recursive: true });
  const statePath = path.join(runDir, 'state.json');
  let state = exists(statePath) ? readJson(statePath) : {
    id: runId,
    moduleId: config.id,
    moduleTitle: config.title,
    status: 'setup',
    simulated: Boolean(options.demo),
    completed: {},
    candidates: [],
    reviews: [],
    revisions: [],
    usage: [],
    hashes: {},
    unassessed: [...DETECTION_LIMITS],
    openIssues: []
  };
  const save = () => writeJson(statePath, state);

  try {
    state.hashes = {
      standards: config.standards ? sha256File(path.join(root, config.standards)) : null,
      config: options.configPath && exists(options.configPath) ? sha256File(options.configPath) : null,
      briefs: (config.briefs || []).filter((rel) => exists(path.join(root, rel))).map((rel) => ({ file: rel, sha256: sha256File(path.join(root, rel)) })),
      sourceRevision: config.sourceRevision || null,
      revisionFile: config.revisionFile
    };
    state.completed.setup = true;
    save();

    if (!state.completed.validation) {
      const numerical = adapters.numerical
        ? await adapters.numerical()
        : await runNumerical(root, config);
      state.validationSummary = numerical.summary;
      if (!numerical.ok) {
        throw stop(`numerical check failed: ${numerical.summary}`, 'blocked');
      }
      state.completed.validation = true;
      save();
    }

    let round = state.candidates.length || 0;
    if (!state.candidates.length) {
      const candidate = await renderRound({ root, config, runDir, round: 1, log, adapters, state, options });
      state.candidates.push(candidate);
      state.completed.production = true;
      save();
      round = 1;
    }

    if (options.correction && !state.openIssues.some((issue) => issue.id === 'scenario-readability')) {
      state.openIssues.push({
        id: 'scenario-readability',
        severity: 'required',
        category: 'presentation',
        scene: 'scenario',
        start_seconds: 38.19,
        end_seconds: 50.52,
        evidence: [],
        observed: 'The scenario demonstration does not keep the active slider, the predicted response, and the affected chart clearly readable together.',
        requested_change: String(options.correction),
        acceptance_check: 'The revised scenario shows the active slider, the predicted response, and the affected chart together for the whole action, with enough of the surrounding view to identify it.',
        permitted_edit: 'render',
        confidence: 1
      });
      save();
    }
    let reviewRound = state.reviews.length;
    while (reviewRound < limits.maxCandidateReviews) {
      const candidate = state.candidates[state.candidates.length - 1];
      const alreadyReviewed = Boolean(state.completed[`review-${candidate.round}`]);
      if (!alreadyReviewed) {
        if (candidate.round > 1) say(log, 'Checking revised film');
        const evidencePath = path.join(runDir, 'evidence', `v${candidate.round}`, 'evidence.json');
        const evidence = state.completed[`evidence-${candidate.round}`]
          ? readJson(evidencePath)
          : await buildEvidence({ root, config, limits, runDir, candidate, state, adapters, options });
        if (repairCollapsedTimeline(evidence, candidate.manifest, config)) writeJson(evidencePath, evidence);
        state.completed[`evidence-${candidate.round}`] = true;
        candidate.technicalOk = !evidence.technicalIssues?.length && !evidence.silenceFindings?.length;
        save();
        say(log, 'Reviewing');
        const review = await obtainReview({ evidence, config, limits, root, runDir, round: candidate.round, previous: state.openIssues, adapters, options });
        state.reviews.push({ round: candidate.round, verdict: review.verdict, file: review.file });
        state.openIssues = requiredIssues(review.review);
        for (const item of review.review.requirements || []) {
          if (item.status !== 'missing') continue;
          if (state.openIssues.some((issue) => issue.id === item.id)) continue;
          state.openIssues.push({
            id: item.id,
            severity: 'required',
            category: 'requirement',
            scene: item.scene || 'film',
            start_seconds: Number(item.start_seconds) || 0,
            end_seconds: Number(item.end_seconds) || evidence.probe?.duration || 0,
            evidence: item.evidence || [],
            observed: item.requirement,
            requested_change: `Restore this required element: ${item.requirement}`,
            acceptance_check: 'The next review marks this requirement met, with timestamps, or records why the frames still do not show it.',
            permitted_edit: 'render',
            confidence: 1
          });
        }
        state.unassessed = [...new Set([...(review.review.unassessed_checks || []), ...DETECTION_LIMITS])];
        state.completed[`review-${candidate.round}`] = true;
        save();
        reviewRound += 1;
        if (review.review.verdict === 'blocked') throw stop(review.review.summary || 'review blocked the candidate', 'blocked');
        const missing = (review.review.requirements || []).some((item) => item.status === 'missing');
        if (!state.openIssues.length && !missing && !evidence.technicalIssues?.length && !evidence.silenceFindings?.length) {
          state.status = 'READY_FOR_HUMAN_REVIEW';
          state.recommended = candidate.mp4;
          state.stoppedReason = undefined;
          say(log, 'Ready for your review');
          break;
        }
        const technical = [...(evidence.technicalIssues || []), ...(evidence.silenceFindings || []).map((item) => item.observed)];
        if (technical.length) {
          state.openIssues.push(...technical.map((observed, index) => ({
            id: `TECH-${candidate.round}-${index + 1}`,
            severity: 'required',
            category: 'technical',
            scene: 'film',
            start_seconds: 0,
            end_seconds: evidence.probe?.duration || 0,
            evidence: [],
            observed,
            requested_change: observed,
            acceptance_check: 'The next export no longer reports this measurement, and the earlier candidate is kept.',
            permitted_edit: 'render',
            confidence: 1
          })));
        }
      }
      if (!state.openIssues.length) {
        state.status = 'READY_FOR_HUMAN_REVIEW';
        state.recommended = candidate.mp4;
        state.stoppedReason = undefined;
        say(log, 'Ready for your review');
        break;
      }
      if (options.correction && state.revisions.some((item) => item.accepted) && candidate.round > 1) {
        state.status = 'NEEDS_HUMAN_REVIEW';
        state.recommended = candidate.mp4;
        throw stop('The revised candidate still has required issues after the one correction cycle.', 'NEEDS_HUMAN_REVIEW');
      }
      if (state.revisions.length >= limits.maxRevisionRounds || reviewRound >= limits.maxCandidateReviews) {
        state.status = 'NEEDS_HUMAN_REVIEW';
        state.recommended = earlierCandidate(state) || candidate.mp4;
        throw stop(`required issues remain after ${state.revisions.length} revision round(s). The film is not final.`, 'NEEDS_HUMAN_REVIEW');
      }
      const revisionIndex = state.revisions.length + 1;
      say(log, `Applying revision ${revisionIndex} of ${limits.maxRevisionRounds}`);
      const applied = await applyRevision({ root, config, limits, runDir, issues: state.openIssues, adapters, options });
      state.revisions.push({ round: revisionIndex, ...applied });
      save();
      if (!applied.accepted) {
        if (applied.unattendedBlocked) {
          state.recommended = candidate.mp4;
          throw stop(`${applied.summary} The reviewed candidate was kept and was not re-recorded.`, 'NEEDS_HUMAN_REVIEW');
        }
        state.recommended = candidate.mp4;
        throw stop(applied.summary, 'blocked');
      }
      const next = await renderRound({ root, config, runDir, round: candidate.round + 1, log, adapters, state, options });
      state.candidates.push(next);
      save();
    }
    if (!state.status || state.status === 'setup') state.status = 'NEEDS_HUMAN_REVIEW';
    const report = finish(runDir, state, { reveal: options.reveal !== false && !options.demo });
    return { ...state, report, code: state.status === 'FAILED' || state.status === 'blocked' ? 2 : 0 };
  } catch (error) {
    if (error.stopped) {
      state.status = error.statusCode;
      state.stoppedReason = error.reason;
      const report = finish(runDir, state, { reveal: options.reveal !== false && !options.demo });
      say(log, `Stopped: ${error.reason}`);
      return { ...state, report, code: error.statusCode === 'NEEDS_HUMAN_REVIEW' ? 0 : 2 };
    }
    state.status = 'FAILED';
    state.stoppedReason = error.message;
    const report = finish(runDir, state, { reveal: false });
    say(log, `Stopped: ${error.message}`);
    return { ...state, report, code: 2 };
  } finally {
    release();
  }
}

function stop(reason, statusCode) {
  const error = new Error(reason);
  error.stopped = true;
  error.reason = reason;
  error.statusCode = statusCode;
  return error;
}

function repairCollapsedTimeline(evidence, manifest, moduleConfig) {
  const starts = manifest?.starts;
  if (!starts || Array.isArray(starts) || !evidence?.scenes?.length) return false;
  const collapsed = evidence.scenes.some((scene) => scene.id !== 'open' && scene.id !== 'bridge' && Number(scene.start) === 0 && Number(starts[scene.id]) > 0.05);
  if (!collapsed) return false;
  const scenes = normalizeScenes(manifest, evidence.probe?.duration || 0, moduleConfig);
  if (!scenes.length) return false;
  evidence.scenes = scenes;
  evidence.silenceFindings = classifySilence(evidence.silence || [], scenes, evidence.probe?.duration || 0);
  return true;
}

function earlierCandidate(state) {
  const ready = [...state.candidates].reverse().find((candidate) => candidate.technicalOk);
  return ready?.mp4 || null;
}

async function runNumerical(root, config) {
  const [command, ...args] = config.numericalCommand;
  const result = runProcess(command, args, { cwd: root, timeoutMs: 15 * 60 * 1000 });
  const summary = (result.stdout || result.stderr || '').trim().slice(-2000);
  return { ok: result.status === 0, summary: summary || (result.status === 0 ? 'numerical check passed' : 'numerical check failed') };
}

async function renderRound({ root, config, runDir, round, log, adapters, state, options }) {
  if (options.importFile && round === 1 && !state.candidates.length) {
    const dest = path.join(runDir, 'candidates', 'v1-imported.mp4');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(options.importFile, dest);
    return { round, mp4: dest, manifest: { importedFrom: options.importFile, scenes: [] }, imported: true, technicalOk: false };
  }
  if (state.completed?.production && round === 1 && state.candidates?.length) return state.candidates[0];
  const produced = adapters.produce
    ? await adapters.produce({ root, config, runDir, round, log })
    : await produceCandidate({ root, config, runDir, round, log });
  return { round, ...produced, technicalOk: false };
}

async function buildEvidence({ root, config, limits, runDir, candidate, state, adapters, options }) {
  if (adapters.package) return adapters.package({ candidate, runDir });
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) throw new Error('FFmpeg is not available, so the candidate cannot be packaged.');
  const manifest = candidate.manifest || {};
  return packageEvidence({
    ffmpeg,
    mp4: candidate.mp4,
    manifest,
    moduleConfig: config,
    runDir,
    round: candidate.round,
    limits,
    numerical: { summary: state.validationSummary }
  });
}

async function obtainReview({ evidence, config, limits, root, runDir, round, previous, adapters, options }) {
  const standards = config.standards && exists(path.join(root, config.standards))
    ? fs.readFileSync(path.join(root, config.standards), 'utf8')
    : '';
  const briefs = (config.briefs || []).filter((rel) => exists(path.join(root, rel))).map((rel) => (
    `## ${rel}\n${fs.readFileSync(path.join(root, rel), 'utf8')}`
  )).join('\n\n');
  let result;
  if (adapters.review) {
    result = { review: await adapters.review({ evidence, round, previousIssues: previous }), raw: null, usage: { note: 'fake adapter' }, estimate: null };
    result.review = validateReview(result.review, evidence);
  } else {
    const estimate = estimateReviewUsd(limits, (evidence.frames || []).length, evidence.probe?.duration || 0);
    if (process.env.OPENAI_API_KEY && !evidence.transcript?.segments) {
      try {
        evidence.transcript = await transcribeMp4({
          ffmpeg: findFfmpeg(),
          ffmpegText,
          mp4: evidence.mp4,
          runDir,
          limits,
          apiKey: process.env.OPENAI_API_KEY
        });
      } catch (error) {
        if (error.code === 'AUTH' || error.code === 'QUOTA' || error.status === 401) throw error;
        evidence.transcript = { status: 'failed', reason: error.message };
      }
      if (evidence.frameDir) writeJson(path.join(evidence.frameDir, 'evidence.json'), evidence);
    }
    result = await reviewWithOpenAI({
      evidence,
      standards,
      briefs,
      previousIssues: previous,
      limits,
      apiKey: process.env.OPENAI_API_KEY,
      round
    });
    result.estimate = estimate;
  }
  const file = path.join(runDir, 'reviews', `v${round}.json`);
  writeJson(file, { raw: result.raw, review: result.review, usage: result.usage || null, estimate: result.estimate || null });
  fs.writeFileSync(path.join(runDir, 'reviews', `v${round}.md`), readableReview(result.review));
  return { ...result, file };
}

function readableReview(review) {
  const lines = [`Verdict: ${review.verdict}`, '', review.summary, '', 'Requirements:'];
  for (const item of review.requirements || []) {
    lines.push(`- ${item.id} [${item.status}] ${item.scene} ${item.start_seconds}-${item.end_seconds}s: ${item.requirement}`);
  }
  lines.push('', 'Changes:');
  for (const issue of review.issues || []) {
    lines.push(`- ${issue.id} [${issue.severity}] ${issue.scene}: ${issue.requested_change}`);
  }
  lines.push('', `Resolved: ${(review.resolved_issue_ids || []).join(', ') || 'none'}`);
  lines.push('Unassessed:');
  for (const item of review.unassessed_checks || []) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

async function applyRevision({ root, config, limits, runDir, issues, adapters }) {
  const watched = [...(config.permittedPrefixes || []), ...(config.protectedPrefixes || [])];
  const before = captureBytes(root, watched);
  const scenario = (issues || []).some((issue) => issue.id === 'scenario-readability')
    ? '\n\nFor the scenario readability correction, edit Statistico/regression/produce/capture.mjs. In the scenario recording, keep the Ad Spend slider, the predicted response, and the profile chart visible together for the whole action. Make those three larger than they are in the full-page view, and leave the module header and the Scenario Engine tab visible so the view can be identified. Do not edit statistico-analytics or the statistical engine.'
    : '';
  const request = `${revisionRequest({
    issues,
    permitted: config.permittedPrefixes || [],
    protectedPaths: config.protectedPrefixes || []
  })}${scenario}`;
  const requestFile = path.join(runDir, 'revision-request.md');
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(requestFile, `${request}\n`);
  let summary = 'Revision adapter made no described change.';
  let proposal = null;
  if (adapters.revise) {
    const revised = await adapters.revise({ issues, root, request });
    summary = revised?.summary || summary;
  } else {
    proposal = proposeWithCursor({
      cwd: root,
      prompt: `Read ${requestFile} and apply every required change by editing the permitted files in place. Do not edit the request file, and do not stop after describing the change.`,
      timeoutMs: Math.max(limits.requestTimeoutMs || 0, 360000)
    });
    if (!proposal.available) {
      writeRevisionInstructions(runDir, request, { ...proposal, accepted: false, changes: [] });
      restoreBytes(root, before, watched);
      return { accepted: false, unattendedBlocked: true, summary: proposal.reason, changes: [], command: proposal.command, status: proposal.status };
    }
  }
  const changes = diffBytes(root, before, watched);
  const gate = acceptChanges(changes, config.permittedPrefixes || [], config.protectedPrefixes || []);
  const outcome = proposal
    ? revisionOutcome({ status: proposal.status, changes, pathsAccepted: gate.accepted })
    : {
      accepted: gate.accepted,
      summary: gate.accepted ? summary : `Prohibited diff rejected: ${gate.rejected.map((item) => item.path).join(', ')}`
    };
  if (!outcome.accepted) restoreBytes(root, before, watched);
  const kept = outcome.accepted ? changes : [];
  if (proposal) {
    writeRevisionInstructions(runDir, request, {
      accepted: outcome.accepted,
      exitProvesApplication: false,
      command: proposal.command,
      status: proposal.status,
      signal: proposal.signal,
      error: proposal.error,
      stdout: proposal.stdout,
      stderr: proposal.stderr,
      legacyLaunch: proposal.legacy,
      changes: kept,
      rejected: gate.rejected.map((item) => item.path)
    });
  }
  if (outcome.accepted) writeJson(path.join(runDir, 'revisions', `changes-${Date.now()}.json`), kept);
  return {
    accepted: outcome.accepted,
    unattendedBlocked: Boolean(proposal && !proposal.available),
    summary: outcome.summary,
    changes: kept,
    command: proposal?.command || [],
    status: proposal?.status
  };
}

export async function runDemo(options = {}) {
  const root = fs.mkdtempSync(path.join(options.tmp || path.join('C:/Users/Avi Benita/AppData/Local/Temp'), 'statistico-video-demo-'));
  fs.mkdirSync(path.join(root, 'produce'), { recursive: true });
  fs.mkdirSync(path.join(root, '01_source'), { recursive: true });
  writeJson(path.join(root, 'produce', 'holds.json'), { groups: 2 });
  writeJson(path.join(root, '01_source', 'fixtures.json'), { protected: true, seed: 110401 });
  fs.writeFileSync(path.join(root, 'standards.md'), 'Hold a result for about 2-3 seconds.\n');
  const config = demoConfig();
  const limits = {
    ...readJson(path.join(path.dirname(fileURLToPath(import.meta.url)), 'limits.json')),
    maxRevisionRounds: 2,
    maxCandidateReviews: 3,
    overviewFrameCap: 8,
    detailFrameCap: 4
  };
  const log = options.log || ((line) => console.log(line));
  say(log, 'SIMULATED offline handoff. This is not an Independent Means master.');
  return runAuto({
    root,
    config,
    limits,
    demo: true,
    reveal: false,
    log,
    adapters: demoAdapters(root)
  });
}

export function demoConfig() {
  return {
    id: 'demo-hold',
    title: 'Simulated hold handoff',
    outputDir: '04_review',
    standards: 'standards.md',
    permittedPrefixes: ['produce/'],
    protectedPrefixes: ['01_source/'],
    frame: { width: 320, height: 180, fps: 30, codec: 'h264', faststart: true },
    skipLoudness: true,
    intentionalSilenceSceneIds: ['card1'],
    briefs: []
  };
}

export function demoAdapters() {
  return {
    numerical: async () => ({ ok: true, summary: 'SIMULATED numerical check passed' }),
    produce: async ({ root, runDir, round }) => {
      const ffmpeg = findFfmpeg();
      const holds = readJson(path.join(root, 'produce', 'holds.json'));
      const { mp4 } = { mp4: path.join(runDir, 'candidates', `v${round}.mp4`) };
      makeClip(ffmpeg, mp4, 2, { silent: false });
      return {
        mp4,
        manifest: {
          scenes: [
            { id: 'groups', start: 0, end: 1.2, duration: 1.2, holdSeconds: holds.groups, intentionalSilence: false },
            { id: 'card1', start: 1.2, end: 2, duration: 0.8, intentionalSilence: true }
          ]
        }
      };
    },
    review: async ({ evidence }) => {
      const hold = evidence.scenes.find((scene) => scene.id === 'groups')?.holdSeconds ?? 0;
      const frame = evidence.frames[0]?.file;
      if (hold < 3) {
        return {
          verdict: 'needs_revision',
          summary: 'The groups result is not held long enough to read.',
          issues: [{
            id: 'HOLD-GROUPS',
            severity: 'required',
            category: 'timing',
            scene: 'groups',
            start_seconds: 0,
            end_seconds: 1.2,
            evidence: frame ? [frame] : [],
            observed: `groups hold is ${hold} seconds`,
            requested_change: 'Increase the groups result hold to 3 seconds.',
            acceptance_check: 'groups holdSeconds is at least 3',
            permitted_edit: 'timing',
            confidence: 0.95
          }],
          resolved_issue_ids: [],
          unassessed_checks: ['voice naturalness', 'full motion']
        };
      }
      return {
        verdict: 'ready_for_human_review',
        summary: 'The groups hold is long enough in this simulated candidate.',
        issues: [],
        resolved_issue_ids: ['HOLD-GROUPS'],
        unassessed_checks: ['voice naturalness', 'full motion']
      };
    },
    revise: async ({ root, issues }) => {
      const hit = (issues || []).find((issue) => issue.id === 'HOLD-GROUPS');
      if (!hit) return { summary: 'No permitted timing change was requested.' };
      const file = path.join(root, 'produce', 'holds.json');
      const holds = readJson(file);
      holds.groups = 3;
      writeJson(file, holds);
      return { summary: 'Set produce/holds.json groups hold from 2 seconds to 3 seconds.' };
    }
  };
}
