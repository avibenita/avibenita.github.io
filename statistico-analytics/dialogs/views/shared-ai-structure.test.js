/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const header = fs.readFileSync(path.join(__dirname, 'shared-header.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'shared-header.css'), 'utf8');

describe('Statistico AI structure (Cursor100)', () => {
  test('keeps two distinct AI actions with different jobs', () => {
    expect(header).toMatch(/Analyze all results/);
    expect(header).toMatch(/Explain this view/);
    expect(header).toMatch(/Synthesize findings, diagnostics and limitations across the complete analysis/);
    expect(header).toMatch(/Interpret the results displayed on this page/);
    expect(header).not.toMatch(/<span>Interpret with AI<\/span>/);
    expect(header).not.toMatch(/<span>Explain View<\/span>/);
  });

  test('local button mounts beside the view title, not as a filled float', () => {
    expect(header).toMatch(/_mountLocalAiButton/);
    expect(header).toMatch(/header-right/);
    expect(header).toMatch(/sb-ai-local-btn--header/);
    expect(header).toMatch(/sb-ai-local-sep/);
    expect(header).toMatch(/View insight/);
    expect(header).toMatch(/_wireLocalAiCompactLabel/);
    expect(css).toMatch(/\.sb-ai-local-btn--header/);
    expect(css).toMatch(/\.sb-ai-local-sep/);
    expect(css).toMatch(/@media \(max-width:\s*1400px\)/);
    expect(css).toMatch(/background:\s*rgba\(139,92,246,\.12\)/);
  });

  test('drawer stays readable and sized for comparison with the result', () => {
    expect(css).toMatch(/width:\s*min\(520px,\s*92vw\)/);
    expect(css).toMatch(/background:\s*rgba\(15,\s*23,\s*42,\s*\.28\)/);
    expect(css).toMatch(/backdrop-filter:\s*blur\(1px\)/);
  });

  test('local panel is interpretation-first with collapsed About this view', () => {
    expect(header).toMatch(/Bottom line/);
    expect(header).toMatch(/Evidence from this view/);
    expect(header).toMatch(/What it means/);
    expect(header).toMatch(/Checks and cautions/);
    expect(header).toMatch(/Suggested next step/);
    expect(header).toMatch(/About this view/);
    expect(header).toMatch(/BOTTOMLINE:/);
    expect(header).toMatch(/Start with the current result/);
  });

  test('overall panel is decision-oriented and module-aware', () => {
    expect(header).toMatch(/Overall assessment —/);
    expect(header).toMatch(/Overall conclusion/);
    expect(header).toMatch(/Evidence strength/);
    expect(header).toMatch(/Main findings/);
    expect(header).toMatch(/Supporting evidence/);
    expect(header).toMatch(/Diagnostics and assumptions/);
    expect(header).toMatch(/Practical interpretation/);
    expect(header).toMatch(/Limitations/);
    expect(header).toMatch(/Recommended next steps/);
    expect(header).toMatch(/Report-ready summary/);
    expect(header).toMatch(/_overallAssessmentEmphasis/);
    expect(header).toMatch(/Do not mention Cronbach alpha/);
  });

  test('overlay actions and short disclaimer are present', () => {
    expect(header).toMatch(/data-ai-action="copy"/);
    expect(header).toMatch(/Add to report/);
    expect(header).toMatch(/data-ai-action="refresh"/);
    expect(header).toMatch(/AI-generated interpretation\. Verify critical decisions and domain conclusions\./);
    expect(header).toMatch(/Out of date/);
    expect(header).toMatch(/_storeAiCache/);
  });

  test('parser accepts JSON, new keys, and legacy KEY lines', () => {
    expect(header).toMatch(/_normalizeAiJson/);
    expect(header).toMatch(/BOTTOMLINE/);
    expect(header).toMatch(/FINDINGS/);
    expect(header).toMatch(/LIMITATIONS/);
    expect(header).toMatch(/JSON\.parse/);
  });
});
