/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const header = fs.readFileSync(path.join(__dirname, 'shared-header.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'shared-header.css'), 'utf8');

describe('Statistico AI structure (Cursor100)', () => {
  test('keeps two distinct AI actions with different jobs', () => {
    expect(header).toMatch(/Analyze all results/);
    expect(header).toMatch(/sb-ai-sup--all/);
    expect(header).toMatch(/sb-ai-panel--overall/);
    expect(header).toMatch(/Full analysis/);
    expect(header).toMatch(/This view/);
    expect(header).toMatch(/Explain this view/);
    expect(header).toMatch(/View guide/);
    expect(header).toMatch(/Interpret results/);
    expect(header).toMatch(/_mountUnivariateViewActions/);
    expect(header).toMatch(/_mountViewActions/);
    expect(header).toMatch(/About this module/);
    expect(header).toMatch(/logistic: 'logistic regression'/);
    expect(header).toMatch(/_aboutButtonLabel/);
    expect(header).toMatch(/_mountModuleAboutButton/);
    expect(header).toMatch(/header-module-name-row/);
    expect(header).toMatch(/st-module-help/);
    expect(header).toMatch(/st-tt-title/);
    expect(header).toMatch(/Click to open the guide/);
    expect(header).not.toMatch(/class="sb-module-about"/);
    expect(css).toMatch(/\.header-module-name-row/);
    expect(css).toMatch(/\.st-module-help/);
    expect(header).toMatch(/shared\/module-guide\.js/);
    expect(header).toMatch(/shared\/view-guide\.js/);
    expect(css).toMatch(/\.sb-ai-panel--overall/);
    expect(css).toMatch(/#1d4ed8/);
    expect(header).toMatch(/Synthesize findings, diagnostics and limitations across the complete analysis/);
    expect(header).toMatch(/Interpret the results displayed on this page/);
    expect(header).not.toMatch(/<span>Interpret with AI<\/span>/);
    expect(header).not.toMatch(/<span>Explain View<\/span>/);
  });

  test('view guide and interpret results live in the view, not the header', () => {
    expect(header).toMatch(/_placeViewDock/);
    expect(header).toMatch(/sb-view-dock/);
    expect(header).not.toMatch(/How to use and read it/);
    expect(header).not.toMatch(/What the numbers suggest/);
    const mount = header.slice(
      header.indexOf('  _mountViewActionGroup(group) {'),
      header.indexOf('  _supportsInsightGuide() {')
    );
    expect(mount).toMatch(/_placeViewDock\(group\)/);
    expect(mount).not.toMatch(/headerRight\.insertBefore/);
    expect(css).toMatch(/\.sb-view-dock/);
    expect(css).toMatch(/writing-mode:\s*vertical-rl/);
    expect(css).toMatch(/\.sb-view-dock \.sb-ai-float-btn\.sb-ai-local-btn/);
    expect(css).toMatch(/\.sb-guide-btn/);
    expect(css).toMatch(/\.vg-panel/);
    expect(css).toMatch(/\.sb-view-actions/);
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
    expect(header).toMatch(/_reviewedGuideForView/);
    expect(header).toMatch(/How to use and read this view is in/);
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
    expect(header).not.toMatch(/Add to report/);
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
