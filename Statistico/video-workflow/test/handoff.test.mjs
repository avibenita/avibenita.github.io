import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import { spawn } from 'child_process';
import { classifySilence, DETECTION_LIMITS, moduleStoryIssues, recitedNarrationIssues } from '../evidence.mjs';
import { FILM_HIGHLIGHT_CSS, HIGHLIGHT_SPEC, glowDeltaIssue, highlightCssIssues, highlightEventIssues, highlightStandardIssues } from '../overlay/highlight.mjs';
import { demoAdapters, demoConfig, runAuto } from '../controller.mjs';
import { doctorLines, dryRunLines } from '../producer.mjs';
import { REPO_ROOT, loadModule, readJson, writeJson } from '../util.mjs';

process.env.VIDEO_AUTO_NO_OPEN = '1';

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'statistico-video-'));
  fs.mkdirSync(path.join(root, 'produce'), { recursive: true });
  fs.mkdirSync(path.join(root, '01_source'), { recursive: true });
  writeJson(path.join(root, 'produce', 'holds.json'), { groups: 2 });
  writeJson(path.join(root, '01_source', 'fixtures.json'), { protected: true });
  fs.writeFileSync(path.join(root, 'standards.md'), 'Hold a result for about 2-3 seconds.\n');
  return root;
}

const limits = {
  reviewModel: 'gpt-4.1',
  transcriptionModel: 'whisper-1',
  maxRevisionRounds: 2,
  maxCandidateReviews: 3,
  overviewFrameCap: 6,
  detailFrameCap: 2,
  imageBatchSize: 4,
  tokensPerImage: 100,
  maxEstimatedUsd: 8,
  rates: { 'gpt-4.1': { inputPerMillion: 2, outputPerMillion: 8 }, 'whisper-1': { perMinute: 0.006 } }
};

test('offline numerical contract, doctor, dry-run, and missing key', async () => {
  const numerical = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(REPO_ROOT, 'Statistico', 'video-workflow', 'validate-independent.mjs'), '--offline'], { cwd: REPO_ROOT });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { out += chunk; });
    child.on('close', (code) => resolve({ code, out }));
  });
  assert.equal(numerical.code, 0, numerical.out);

  const { config, limits: moduleLimits } = loadModule('independent-means');
  const doctor = doctorLines(REPO_ROOT, config, moduleLimits);
  assert.equal(doctor.failed, false, doctor.lines.join('\n'));
  assert.match(doctor.lines.join('\n'), /OpenAI API key: (absent|present, not authenticated by this check)/);
  assert.match(doctor.lines.join('\n'), /Checking setup/);

  const dry = dryRunLines(REPO_ROOT, config, moduleLimits).join('\n');
  assert.match(dry, /Dry run/);
  assert.match(dry, /capture\.mjs/);
  assert.match(dry, /1728x1080/);

  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const stopped = await runAuto({
    root: REPO_ROOT,
    config,
    limits: moduleLimits,
    log: () => {},
    reveal: false
  });
  if (saved) process.env.OPENAI_API_KEY = saved;
  assert.equal(stopped.code, 2);
  assert.match(stopped.stoppedReason, /OPENAI_API_KEY/);
});

test('simulated hold revision is re-rendered and the new timing is measured', async () => {
  const root = workspace();
  const lines = [];
  const result = await runAuto({
    root,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    log: (line) => lines.push(line),
    adapters: demoAdapters()
  });
  assert.equal(result.status, 'READY_FOR_HUMAN_REVIEW', result.stoppedReason);
  assert.equal(readJson(path.join(root, 'produce', 'holds.json')).groups, 3);
  const evidence = readJson(path.join(result.report, '..', 'evidence', 'v2', 'evidence.json'));
  assert.ok(evidence.scenes.find((scene) => scene.id === 'groups').holdSeconds >= 3);
  assert.match(lines.join('\n'), /Applying revision 1 of 2/);
  assert.match(lines.join('\n'), /Checking revised film/);
  assert.match(lines.join('\n'), /Ready for your review/);
  assert.match(fs.readFileSync(result.report, 'utf8'), /SIMULATED/);
  assert.match(fs.readFileSync(result.report, 'utf8'), /Blank results and cropped labels/);
  assert.equal(fs.existsSync(path.join(root, '06_approved')), false);
});

test('a protected-file change is restored and rejected', async () => {
  const root = workspace();
  const adapters = demoAdapters();
  adapters.revise = async () => {
    writeJson(path.join(root, '01_source', 'fixtures.json'), { protected: false });
    writeJson(path.join(root, 'produce', 'holds.json'), { groups: 9 });
    return { summary: 'tried to edit the fixture' };
  };
  const result = await runAuto({
    root,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    log: () => {},
    adapters
  });
  assert.equal(result.status, 'blocked');
  assert.match(result.stoppedReason, /Prohibited diff/);
  assert.equal(readJson(path.join(root, '01_source', 'fixtures.json')).protected, true);
  assert.equal(readJson(path.join(root, 'produce', 'holds.json')).groups, 2);
});

test('numerical failure blocks the render', async () => {
  const root = workspace();
  let produced = 0;
  const result = await runAuto({
    root,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    log: () => {},
    adapters: {
      numerical: async () => ({ ok: false, summary: 'Welch p 0.020 does not match 0.02366' }),
      produce: async () => { produced += 1; return { mp4: 'unused', manifest: { scenes: [] } }; }
    }
  });
  assert.equal(produced, 0);
  assert.match(result.stoppedReason, /Welch p/);
});

test('malformed review and an API failure stay failed', async () => {
  const root = workspace();
  const bad = await runAuto({
    root,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    log: () => {},
    adapters: { ...demoAdapters(), review: async () => 'not-a-review' }
  });
  assert.equal(bad.status, 'FAILED');
  assert.match(bad.stoppedReason, /malformed|empty review/);

  const root2 = workspace();
  const api = await runAuto({
    root: root2,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    log: () => {},
    adapters: {
      ...demoAdapters(),
      review: async () => { throw new Error('401 unauthorized'); }
    }
  });
  assert.equal(api.status, 'FAILED');
  assert.notEqual(api.status, 'READY_FOR_HUMAN_REVIEW');
});

test('unresolved issues stop after two revision rounds', async () => {
  const root = workspace();
  let renders = 0;
  const adapters = demoAdapters();
  adapters.produce = async ({ runDir, round }) => {
    renders += 1;
    const produced = await demoAdapters().produce({ root, runDir, round });
    return produced;
  };
  adapters.review = async ({ evidence }) => ({
    verdict: 'needs_revision',
    summary: 'Still short.',
    issues: [{
      id: `STILL-${evidence.scenes[0].holdSeconds}`,
      severity: 'required',
      category: 'timing',
      scene: 'groups',
      start_seconds: 0,
      end_seconds: 1,
      evidence: [],
      observed: 'still short',
      requested_change: 'Hold the result longer.',
      acceptance_check: 'a later human decides',
      permitted_edit: 'timing',
      confidence: 0.4
    }],
    resolved_issue_ids: [],
    unassessed_checks: ['voice naturalness']
  });
  adapters.revise = async ({ root: workspaceRoot }) => {
    const file = path.join(workspaceRoot, 'produce', 'holds.json');
    const holds = readJson(file);
    holds.groups += 0.1;
    writeJson(file, holds);
    return { summary: 'nudged the hold' };
  };
  const result = await runAuto({
    root,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    log: () => {},
    adapters
  });
  assert.equal(result.status, 'NEEDS_HUMAN_REVIEW');
  assert.equal(result.candidates.length, 3);
  assert.equal(renders, 3);
  assert.equal(result.revisions.length, 2);
});

test('resume does not record the first candidate again', async () => {
  const root = workspace();
  let renders = 0;
  const adapters = demoAdapters();
  adapters.produce = async (info) => {
    renders += 1;
    return demoAdapters().produce(info);
  };
  let attempts = 0;
  adapters.review = async (info) => {
    attempts += 1;
    if (attempts === 1) throw new Error('socket hang up');
    return demoAdapters().review(info);
  };
  const first = await runAuto({
    root,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    log: () => {},
    adapters
  });
  assert.equal(first.status, 'FAILED');
  const second = await runAuto({
    root,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    resume: first.id,
    log: () => {},
    adapters
  });
  assert.equal(renders, 2);
  assert.equal(second.candidates[0].mp4, first.candidates[0].mp4);
  assert.equal(second.status, 'READY_FOR_HUMAN_REVIEW');
});

test('a second run cannot take a live lock', async () => {
  const root = workspace();
  fs.mkdirSync(path.join(root, '04_review'), { recursive: true });
  const sleeper = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  writeJson(path.join(root, '04_review', '.video-auto.lock'), { pid: sleeper.pid, at: new Date().toISOString() });
  const result = await runAuto({
    root,
    config: demoConfig(),
    limits,
    demo: true,
    reveal: false,
    log: () => {},
    adapters: demoAdapters()
  });
  sleeper.kill();
  assert.match(result.stoppedReason, /already active/);
});

test('intentional silence is not failed speech, and a speech gap is', () => {
  const scenes = [
    { id: 'groups', start: 0, end: 10, intentionalSilence: false },
    { id: 'card1', start: 10, end: 35, intentionalSilence: true },
    { id: 'card2', start: 35, end: 54, intentionalSilence: true }
  ];
  const cardOnly = classifySilence([{ start: 10.2, end: 34.5 }, { start: 35.2, end: 53.5 }], scenes, 54);
  assert.equal(cardOnly.length, 0);
  const gap = classifySilence([{ start: 1, end: 8 }], scenes, 54);
  assert.equal(gap.length, 1);
  assert.equal(gap[0].scene, 'groups');
  const paced = classifySilence([{ start: 24.3, end: 29.6 }], [{ id: 'orient', start: 5.24, end: 41.47, intentionalSilence: false }], 237);
  assert.equal(paced.length, 0);
  const tail = classifySilence([{ start: 227.29, end: 231.11 }], [{ id: 'thanks', start: 225.55, end: 229.75, intentionalSilence: false }], 237);
  assert.equal(tail.length, 0);
  assert.ok(DETECTION_LIMITS.some((item) => /cropped labels/.test(item)));
});

test('the warm-gold highlight spec matches the shared overlay', () => {
  assert.deepEqual(highlightStandardIssues(), []);
  assert.deepEqual(highlightCssIssues(FILM_HIGHLIGHT_CSS, HIGHLIGHT_SPEC), []);
  const aligned = highlightEventIssues([{
    action: 'show',
    selector: '#kpiStrip',
    color: '#FFD18A',
    outlinePx: 2,
    cornerPx: 4,
    target: { x: 100, y: 80, w: 240, h: 60 },
    frame: { x: 90, y: 70, w: 260, h: 80 }
  }]);
  assert.deepEqual(aligned, []);
  const covering = highlightEventIssues([{
    action: 'show',
    selector: '#kpiStrip',
    color: '#7dd3fc',
    outlinePx: 3,
    cornerPx: 3,
    target: { x: 100, y: 80, w: 40, h: 20 },
    frame: { x: 100, y: 80, w: 40, h: 20 }
  }]);
  assert.ok(covering.length >= 2);
  assert.equal(glowDeltaIssue(Buffer.from([0, 0, 0]), Buffer.from([0, 0, 0])), 'encoded glow changed by 0.00 per channel, below 2.5');
  assert.equal(glowDeltaIssue(Buffer.from([0, 0, 0]), Buffer.from([20, 0, 0])), '');
  const cues = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'Statistico', 'regression', 'produce', 'cues.json'), 'utf8'));
  assert.equal(recitedNarrationIssues(cues).length, 0);
  assert.match(cues.find((cue) => cue.id === 'overview-1').spoken, /one interactive workspace/);
  assert.match(cues.find((cue) => cue.id === 'catalogue-1').spoken, /broader regression toolkit/);
  const story = moduleStoryIssues([
    { id: 'overview', start: 0, end: 12 },
    { id: 'effects', start: 12, end: 30 },
    { id: 'scenario', start: 30, end: 50 }
  ], {
    filmStructure: {
      id: 'module-story',
      overviewSceneId: 'overview',
      demonstrationSceneIds: ['effects', 'scenario', 'influence'],
      catalogueSceneIds: ['catalogue', 'catalogue2']
    }
  });
  assert.ok(story.some((line) => /overview/.test(line)));
  assert.ok(story.some((line) => /catalogue/.test(line)));
  assert.equal(HIGHLIGHT_SPEC.breatheMs, 2400);
  assert.equal(HIGHLIGHT_SPEC.fadeInMs, 300);
});

test('the pre-existing assemble command still targets the r001 review file by default', () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'Statistico', 'independent', 'produce', 'assemble.mjs'), 'utf8');
  assert.match(source, /independent__film__review-r001\.mp4/);
  assert.match(source, /FILM_OUT/);
  const approved = path.join(REPO_ROOT, 'Statistico', 'independent', '06_approved');
  assert.equal(fs.existsSync(approved), false);
});
