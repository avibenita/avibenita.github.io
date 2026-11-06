import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { exists, runProcess, writeJson } from './util.mjs';

export const ISOLATION_NOTE = 'Fully unattended edits are blocked on this Windows machine. No OS sandbox was available for the Cursor agent. The controller asks for a patch and applies it only when every path is inside the permitted video folders. A prompt is not treated as a write sandbox. The agent is not started with --force against the production tree, and it is not given the OpenAI key.';

export function revisionRequest({ issues, permitted, protectedPaths }) {
  const required = (issues || []).filter((issue) => issue.severity === 'required');
  return [
    'Apply only the required video changes below.',
    'Edit only these path prefixes:',
    ...permitted.map((item) => `- ${item}`),
    'Do not edit statistical engines, fixture data, reference files, CapCut exports, the approved folder, or website assets.',
    'Protected prefixes:',
    ...protectedPaths.map((item) => `- ${item}`),
    'Edit those files in place. Do not stop at a description.',
    'A process exit code does not prove that a correction was applied. The controller keeps the edit only when the file bytes change and every changed path is permitted.',
    'Do not claim the film is final.',
    '',
    ...required.map((issue) => [
      `Issue ${issue.id} (${issue.category}, ${issue.scene}, ${issue.start_seconds}-${issue.end_seconds}s)`,
      `Observed: ${issue.observed}`,
      `Change: ${issue.requested_change}`,
      `Acceptance: ${issue.acceptance_check}`,
      `Permitted edit: ${issue.permitted_edit}`
    ].join('\n'))
  ].join('\n');
}

export function redactSecrets(text) {
  return String(text || '')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(/key_[A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}

export function legacyLaunchDiagnosis() {
  const cmd = path.join(process.env.LOCALAPPDATA || '', 'cursor-agent', 'agent.cmd');
  const result = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
  return {
    command: [cmd, '--version'],
    shell: false,
    status: result.status,
    error: result.error ? result.error.code || result.error.message : null,
    stdout: redactSecrets(result.stdout).slice(0, 500),
    stderr: redactSecrets(result.stderr).slice(0, 500),
    diff: [],
    conclusion: 'The earlier revision started agent.cmd with spawnSync and no shell. Windows returns EINVAL and a null status, so the agent never ran and no diff was possible. The controller also told that invocation not to modify files, then restored the tree.'
  };
}

export function revisionOutcome({ status, changes, pathsAccepted }) {
  const diffCount = (changes || []).length;
  if (!diffCount) {
    return { accepted: false, summary: `The agent exited ${status}. It produced no file diff, so the correction was not applied.` };
  }
  if (!pathsAccepted) {
    return { accepted: false, summary: `The agent exited ${status}. The diff touched a path outside the permitted prefixes and was restored.` };
  }
  if (status !== 0) {
    return { accepted: false, summary: `The agent exited ${status}. A diff existed, but a non-zero exit is not accepted as an applied correction, so the tree was restored.` };
  }
  return { accepted: true, summary: 'The agent edited permitted files. The diff is the evidence that the correction was applied. The exit status alone is not that evidence.' };
}

function agentScript() {
  return path.join(process.env.LOCALAPPDATA || '', 'cursor-agent', 'cursor-agent.ps1');
}

function powershellExe() {
  return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

export function proposeWithCursor({ cwd, prompt, timeoutMs }) {
  const script = agentScript();
  const powershell = powershellExe();
  const legacy = legacyLaunchDiagnosis();
  if (!exists(script) || !exists(powershell)) {
    return {
      available: false,
      applied: false,
      blocked: true,
      status: null,
      reason: 'The Cursor agent CLI is not installed. Fully unattended edits are blocked.',
      legacy,
      command: [],
      stdout: '',
      stderr: ''
    };
  }
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-p', '--trust', '--output-format', 'text', prompt];
  const env = { ...process.env, NODE_OPTIONS: '--use-system-ca' };
  delete env.OPENAI_API_KEY;
  const result = runProcess(powershell, args, { cwd, env, timeoutMs: timeoutMs || 180000 });
  return {
    available: true,
    applied: false,
    blocked: false,
    status: result.status,
    signal: result.signal,
    error: result.error ? redactSecrets(result.error.message || String(result.error)).slice(0, 300) : null,
    command: [powershell, '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-p', '--trust', '--output-format', 'text', `<prompt ${prompt.length} chars>`],
    stdout: redactSecrets(result.stdout).slice(0, 4000),
    stderr: redactSecrets(result.stderr).slice(0, 4000),
    legacy
  };
}

export function acceptChanges(changes, permitted, protectedPaths) {
  const rejected = changes.filter((change) => {
    const rel = change.path.replace(/\\/g, '/');
    const blocked = protectedPaths.some((prefix) => rel.startsWith(prefix));
    const allowed = permitted.some((prefix) => rel.startsWith(prefix));
    return blocked || !allowed;
  });
  return { accepted: rejected.length === 0, rejected };
}

export function writeRevisionInstructions(runDir, text, record) {
  const file = path.join(runDir, 'revision-request.md');
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(file, `${text}\n`);
  writeJson(path.join(runDir, 'revision-status.json'), {
    request: file,
    exitProvesApplication: false,
    ...(record || {})
  });
  return file;
}
