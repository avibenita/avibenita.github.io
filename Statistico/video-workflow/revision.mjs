import fs from 'fs';
import path from 'path';
import { findAgent, runProcess, writeJson } from './util.mjs';

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
    'Return a unified diff and do not claim the film is final.',
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

export function proposeWithCursor({ cwd, prompt, timeoutMs }) {
  const agent = findAgent();
  if (!agent) {
    return {
      available: false,
      applied: false,
      blocked: true,
      reason: 'The Cursor agent CLI (agent) is not installed. Fully unattended edits are blocked.',
      note: ISOLATION_NOTE
    };
  }
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  const result = runProcess(agent, ['-p', '--output-format', 'text', prompt], {
    cwd,
    env,
    timeoutMs: timeoutMs || 180000
  });
  return {
    available: true,
    applied: false,
    blocked: false,
    status: result.status,
    proposal: `${result.stdout}\n${result.stderr}`.trim(),
    note: ISOLATION_NOTE
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

export function writeRevisionInstructions(runDir, text, proposal) {
  const file = path.join(runDir, 'revision-request.md');
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(file, `${text}\n\n${proposal ? `Cursor proposal:\n${proposal}\n` : ''}`);
  writeJson(path.join(runDir, 'revision-status.json'), {
    unattendedEdits: 'blocked',
    reason: ISOLATION_NOTE,
    request: file
  });
  return file;
}
