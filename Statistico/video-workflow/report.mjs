import fs from 'fs';
import path from 'path';
import { openFolder, writeJson } from './util.mjs';

export function writeReport(runDir, state) {
  const lines = [];
  const simulated = state.simulated ? 'SIMULATED. This report was produced by the offline handoff demo, not by a rendered Independent Means pilot.\n\n' : '';
  lines.push(`# ${state.moduleTitle || state.moduleId} video run ${state.id}`);
  lines.push('');
  if (simulated) lines.push(simulated.trim(), '');
  lines.push(`Status: ${state.status}`);
  lines.push(`Recommended candidate: ${state.recommended || 'none'}`);
  lines.push('');
  lines.push('Automated readiness is not publication approval. Watch and listen to the recommended candidate, then decide any CapCut export yourself. This run does not write the approved folder and does not replace website assets.');
  lines.push('');
  lines.push('## What changed');
  if (!state.revisions?.length) lines.push('No source revision was applied.');
  for (const revision of state.revisions || []) {
    lines.push(`- Round ${revision.round}: ${revision.summary}`);
    for (const change of revision.changes || []) lines.push(`  - ${change.change} ${change.path}`);
  }
  lines.push('');
  lines.push('## Required issues still open');
  const open = state.openIssues || [];
  if (!open.length) lines.push('None recorded by the last accepted review.');
  for (const issue of open) lines.push(`- ${issue.id}: ${issue.observed} Change: ${issue.requested_change}`);
  lines.push('');
  lines.push('## Unassessed checks');
  for (const item of state.unassessed || []) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Validation');
  lines.push(state.validationSummary || 'No validation summary was recorded.');
  lines.push('');
  lines.push('## Candidates');
  for (const candidate of state.candidates || []) {
    lines.push(`- v${candidate.round}: ${candidate.mp4}${candidate.imported ? ' (imported existing file)' : ''}`);
  }
  lines.push('');
  lines.push('## What to view and listen to');
  lines.push(state.recommended
    ? `Open ${state.recommended}. Check the picture, the narration, the silent capability cards, and the closing. Confirm the on-screen Welch result, interval, and planning totals against the numerical report.`
    : 'There is no candidate to approve.');
  if (state.stoppedReason) {
    lines.push('');
    lines.push(`Stopped: ${state.stoppedReason}`);
  }
  const report = path.join(runDir, 'REPORT.md');
  fs.writeFileSync(report, `${lines.join('\n')}\n`);
  writeJson(path.join(runDir, 'state.json'), state);
  return report;
}

export function finish(runDir, state, { reveal = true } = {}) {
  const report = writeReport(runDir, state);
  if (reveal && state.status !== 'dry-run') openFolder(runDir);
  return report;
}
