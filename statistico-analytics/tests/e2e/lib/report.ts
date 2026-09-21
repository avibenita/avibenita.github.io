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

export function writeMarkdown(rows: CheckboxRow[]): string {
  const discovered = rows.filter((r) => r.checkbox !== '(page)' && r.checkbox !== '(none discovered)');
  const tested = discovered.filter((r) => r.result !== 'NOT_REACHED');
  const pagesMissed = [...new Set(rows.filter((r) => r.result === 'NOT_REACHED').map((r) => r.module))];

  const summary = [
    `# Statistico checkbox interaction audit`,
    ``,
    `Generated ${new Date().toISOString()}. Production behavior was not changed.`,
    ``,
    `## Findings`,
    ``,
    `1. **Shared painted checkboxes are not directly clickable.** \`dialogs/views/shared-header.js\` hides native inputs with \`opacity:0\` and \`pointer-events:none\`. Playwright clicks without \`force:true\` fail. **Label clicks still toggle state.**`,
    `2. **Keyboard Space often does not toggle painted checkboxes** after programmatic focus. The smallest safe fix is to keep the 16×16 input in the tab order with \`pointer-events:auto\` (visually hidden via opacity only), or make the painted \`::before\` box a real button with \`role="checkbox"\` and a Space handler.`,
    `3. **Unpainted native checkboxes work.** Reliability options, regression/logistic intercept, meta Hartung–Knapp, and Prepare “Changed rows only” passed click, label, and keyboard. They are \`NEEDS_EXPECTATION\` only because downstream analysis output was not asserted.`,
    `4. **Many modules stay \`NOT_REACHED\` without Excel.** Input forms keep \`#mainContent { display:none }\` until Office data arrives. Dynamic checkboxes (group levels, study include, export overlay, factorability) need a selected dataset.`,
    `5. **ANOVA \`#chkDescriptives\`, \`#chkAssumptions\`, \`#chkNonParam\`** are \`display:none\` state holders, not user controls (\`INTENTIONALLY_DISABLED\`).`,
    `6. **Univariate demo path throws \`ReferenceError: coun is not defined\`** in \`createHistogram\` when loaded with \`?demo=1\`. Separate from checkbox clickability; do not fix in this audit.`,
    ``,
    `## Totals`,
    ``,
    `| Metric | Count |`,
    `|---|---:|`,
    `| Checkboxes discovered | ${discovered.length} |`,
    `| Tested | ${tested.length} |`,
    `| PASS | ${count(rows, 'PASS')} |`,
    `| FAIL_CLICK | ${count(rows, 'FAIL_CLICK')} |`,
    `| FAIL_STATE | ${count(rows, 'FAIL_STATE')} |`,
    `| FAIL_EFFECT | ${count(rows, 'FAIL_EFFECT')} |`,
    `| FAIL_KEYBOARD | ${count(rows, 'FAIL_KEYBOARD')} |`,
    `| INTENTIONALLY_DISABLED | ${count(rows, 'INTENTIONALLY_DISABLED')} |`,
    `| NEEDS_EXPECTATION | ${count(rows, 'NEEDS_EXPECTATION')} |`,
    `| NOT_REACHED | ${count(rows, 'NOT_REACHED')} |`,
    `| Pages with unreached controls | ${pagesMissed.length} |`,
    ``,
    `## Results`,
    ``,
    `| Module | Checkbox | Click | Label | Keyboard | State changed | Intended effect | Console error | Result |`,
    `|---|---|---|---|---|---|---|---|---|`
  ];

  for (const row of rows) {
    const consoleErr = row.consoleError ? row.consoleError.replace(/\|/g, '/') : '';
    summary.push(
      `| ${esc(row.module)} (${esc(row.viewport)}) | ${esc(row.checkbox)} | ${row.click} | ${row.label} | ${row.keyboard} | ${row.stateChanged} | ${esc(row.intendedEffect)} | ${esc(consoleErr)} | ${row.result} |`
    );
  }

  const failures = rows.filter((r) => r.result.startsWith('FAIL'));
  summary.push('', '## Failures and proposed fixes', '');
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
      if (row.screenshot) summary.push(`- Screenshot: \`${row.screenshot}\``);
      if (row.proposedFix) summary.push(`- Proposed fix: ${row.proposedFix}`);
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
