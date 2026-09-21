/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const header = fs.readFileSync(path.join(__dirname, 'shared-header.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'shared-header.css'), 'utf8');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, rel), 'utf8');
}

describe('shared export overlay', () => {
  test('paints overlay checkboxes so the dark native box is not the hit target', () => {
    expect(header).toMatch(/class="st-export-check" id="stCoverEnabled"/);
    expect(header).toMatch(/class="st-export-check" id="stCoverIncludeLogo"/);
    expect(header).toMatch(/#stReportExportOverlay\{color-scheme:light;\}/);
    expect(header).toMatch(/#stReportExportOverlay \.st-export-check-row::before\{/);
    expect(header).toMatch(/label\.closest\('#stReportExportOverlay'\)/);
    expect(header).toMatch(/exportInput\.checked = !exportInput\.checked/);
    expect(css).toMatch(/#stReportExportOverlay \{\s*color-scheme:\s*light;/);
    expect(css).toMatch(/#stReportExportOverlay \.st-export-check-row::before/);
    expect(css).toMatch(/#stReportExportOverlay \.st-export-check-row input\[type="checkbox"\]/);
    expect(css).toMatch(/pointer-events:\s*none !important/);
  });

  test('theme switcher only cancels clicks on its own buttons', () => {
    // <html> carries data-theme-pref too; a bare [data-theme-pref] match would
    // preventDefault() every click on the page (radios, file inputs, links).
    expect(header).toMatch(/closest\('button\[data-theme-pref\]'\)/);
    expect(header).not.toMatch(/closest\('\[data-theme-pref\]'\)/);
    expect(header).toMatch(/root\.setAttribute\('data-theme-pref', preference\)/);
  });

  test('offers include/exclude all for report sections', () => {
    expect(header).toMatch(/id="stExportIncludeAll"/);
    expect(header).toMatch(/id="stExportExcludeAll"/);
    expect(header).toMatch(/Include all/);
    expect(header).toMatch(/Exclude all/);
    expect(header).toMatch(/setAllSections/);
    expect(header).toMatch(/syncExportBtn/);
  });

  test('public picker is the same overlay as the internal one, with cover', () => {
    expect(header).toMatch(/pickReportSections\(sections, onConfirm, options = \{\}\)/);
    expect(header).toMatch(/this\._pickReportSections\(rows, \(ids, cover\) =>/);
    expect(header).not.toMatch(/hideCover:\s*true/);
  });

  test('section-picker modules call pickReportSections instead of a custom first dialog', () => {
    const mixed = read('mixed/mixed-results.html');
    const regression = read('regression/regression-coefficients.html');
    const pareto = read('pareto/pareto-results.html');
    const contingency = read('contingency/contingency-results.html');
    const correlations = header;
    const univariate = header;

    [mixed, regression, pareto, contingency].forEach((src) => {
      expect(src).toMatch(/StatisticoHeader\.pickReportSections\(/);
      expect(src).not.toMatch(/_showExportOptionsDialog/);
      expect(src).not.toMatch(/_showRegressionExportOptionsDialog/);
      expect(src).not.toMatch(/_prtShowExportOptions/);
    });

    expect(correlations).toMatch(/this\._pickReportSections\(sections, \(selectedIds, cover\) =>/);
    expect(univariate).toMatch(/this\._pickReportSections\(sections, \(selectedIds, cover\) =>/);
    expect(mixed).toMatch(/coverDefaults/);
    expect(regression).toMatch(/coverDefaults/);
    expect(pareto).toMatch(/coverDefaults/);
    expect(contingency).toMatch(/coverDefaults/);
  });
});
