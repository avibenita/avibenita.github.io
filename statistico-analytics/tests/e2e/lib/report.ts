import fs from 'fs';
import path from 'path';
import type { AuditResult, CheckboxRow } from './types';

const REPORT_DIR = path.join(process.cwd(), 'tests/e2e/reports');
const JSON_PATH = path.join(REPORT_DIR, 'checkbox-audit.json');
const MD_PATH = path.join(process.cwd(), 'tests/e2e/checkbox-audit-report.md');

export function loadRows(): CheckboxRow[] {
  try {
    return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export function saveRows(rows: CheckboxRow[]): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(JSON_PATH, JSON.stringify(rows, null, 2));
}

export function appendRows(rows: CheckboxRow[]): CheckboxRow[] {
  const all = loadRows().concat(rows);
  saveRows(all);
  return all;
}

function count(rows: CheckboxRow[], result: AuditResult): number {
  return rows.filter((r) => r.result === result).length;
}

function uniqueKey(row: CheckboxRow): string {
  return `${row.module}::${row.selector}::${row.checkbox}`;
}

function uniqueRows(rows: CheckboxRow[]): CheckboxRow[] {
  const seen = new Map<string, CheckboxRow>();
  for (const row of rows) {
    const key = uniqueKey(row);
    if (!seen.has(key) || row.viewport.startsWith('full')) seen.set(key, row);
  }
  return [...seen.values()];
}

export function writeMarkdown(rows: CheckboxRow[]): string {
  const executions = rows;
  const unique = uniqueRows(rows);
  const discoveredExec = executions.filter((r) => r.checkbox !== '(page)' && r.checkbox !== '(none discovered)');
  const discoveredUnique = unique.filter((r) => r.checkbox !== '(page)' && r.checkbox !== '(none discovered)');
  const testedExec = discoveredExec.filter((r) => r.result !== 'NOT_REACHED');
  const testedUnique = discoveredUnique.filter((r) => r.result !== 'NOT_REACHED');
  const pagesMissed = [...new Set(rows.filter((r) => r.result === 'NOT_REACHED').map((r) => r.module))];
  const defects = [...new Set(rows.flatMap((r) => r.defects || []))];

  const summary = [
    `# Statistico checkbox interaction audit`,
    ``,
    `Generated ${new Date().toISOString()}. Production checkbox CSS and shared-header.js were not changed.`,
    ``,
    `## How to read the totals`,
    ``,
    `The previous run reported Discovered 206, Tested 78, and NOT_REACHED 145 as if they were one population. They were not:`,
    ``,
    `- **206** counted every discovered checkbox node **once per viewport** (and included hidden DOM nodes that were never user-visible).`,
    `- **78** counted executions that left \`NOT_REACHED\` (again doubled when both viewports ran).`,
    `- **145** counted remaining executions, including page-level “none discovered” rows. \`78 + 145 = 223\` total report rows, not 206.`,
    ``,
    `This report splits **unique checkboxes** (module + selector, one row) from **executions** (unique × viewports that actually ran).`,
    ``,
    `## Totals`,
    ``,
    `| Metric | Unique checkboxes | Executions (viewports) |`,
    `|---|---:|---:|`,
    `| Discovered (checkbox nodes) | ${discoveredUnique.length} | ${discoveredExec.length} |`,
    `| Tested (not NOT_REACHED) | ${testedUnique.length} | ${testedExec.length} |`,
    `| INTERACTION_PASS | ${count(unique, 'INTERACTION_PASS')} | ${count(executions, 'INTERACTION_PASS')} |`,
    `| EFFECT_PASS | ${count(unique, 'EFFECT_PASS')} | ${count(executions, 'EFFECT_PASS')} |`,
    `| NEEDS_EXPECTATION | ${count(unique, 'NEEDS_EXPECTATION')} | ${count(executions, 'NEEDS_EXPECTATION')} |`,
    `| FAIL_VISIBLE_CLICK | ${count(unique, 'FAIL_VISIBLE_CLICK')} | ${count(executions, 'FAIL_VISIBLE_CLICK')} |`,
    `| FAIL_KEYBOARD | ${count(unique, 'FAIL_KEYBOARD')} | ${count(executions, 'FAIL_KEYBOARD')} |`,
    `| INTENTIONALLY_DISABLED | ${count(unique, 'INTENTIONALLY_DISABLED')} | ${count(executions, 'INTENTIONALLY_DISABLED')} |`,
    `| NOT_REACHED | ${count(unique, 'NOT_REACHED')} | ${count(executions, 'NOT_REACHED')} |`,
    `| Pages with unreached controls | ${pagesMissed.length} | |`,
    ``,
    `Visible-target clicks are used. Hidden native inputs with \`pointer-events:none\` are not scored as click failures.`,
    ``,
    `## Separate defects`,
    ``
  ];

  if (defects.length) {
    for (const d of defects) summary.push(`- ${d}`);
  } else {
    summary.push('- None recorded in this run.');
  }

  summary.push('', '## Results', '');
  summary.push('| Module | Checkbox | Click | Label | Keyboard | Focus | State changed | Intended effect | Console error | Result |');
  summary.push('|---|---|---|---|---|---|---|---|---|---|');

  for (const row of executions) {
    const consoleErr = row.consoleError ? row.consoleError.replace(/\|/g, '/') : '';
    const focus = row.focusTarget ? `${row.focusTarget}${row.focusVisible === 'yes' ? ' (visible)' : ''}` : '';
    summary.push(
      `| ${esc(row.module)} (${esc(row.viewport)}) | ${esc(row.checkbox)} | ${row.click} | ${row.label} | ${row.keyboard} | ${esc(focus)} | ${row.stateChanged} | ${esc(row.intendedEffect)} | ${esc(consoleErr)} | ${row.result} |`
    );
  }

  const failures = executions.filter((r) => r.result.startsWith('FAIL'));
  summary.push('', '## Failures', '');
  if (!failures.length) {
    summary.push('No FAIL_* results in this run.');
  } else {
    for (const row of failures) {
      summary.push(`### ${row.result}: ${row.module} — ${row.checkbox}`);
      summary.push('');
      summary.push(`- Route: \`${row.route}\``);
      summary.push(`- Source: \`${row.source}\``);
      summary.push(`- Viewport: ${row.viewport}`);
      summary.push(`- Likely cause: ${row.notes || 'See result category'}`);
      if (row.focusTarget) summary.push(`- Focus after Tab: \`${row.focusTarget}\` (indicator: ${row.focusVisible})`);
      if (row.screenshot) summary.push(`- Screenshot: \`${row.screenshot}\``);
      summary.push('');
    }
  }

  if (pagesMissed.length) {
    summary.push('## Pages that could not expose checkboxes', '');
    for (const name of pagesMissed) summary.push(`- ${name}`);
    summary.push('');
  }

  const md = summary.join('\n') + '\n';
  fs.writeFileSync(MD_PATH, md);
  return MD_PATH;
}

function esc(value: string): string {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
