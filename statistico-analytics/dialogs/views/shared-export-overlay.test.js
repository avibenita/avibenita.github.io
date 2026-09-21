/** @jest-environment node */
const fs = require('fs');
const path = require('path');

const header = fs.readFileSync(path.join(__dirname, 'shared-header.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'shared-header.css'), 'utf8');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, rel), 'utf8');
}

describe('shared export overlay', () => {
  test('keeps native overlay checkboxes clickable and out of the painted skin', () => {
    expect(header).toMatch(/class="st-export-check" id="stCoverEnabled"/);
    expect(header).toMatch(/class="st-export-check" id="stCoverIncludeLogo"/);
    expect(header).toMatch(/cb\.classList\.add\('st-export-check'\)/);
    expect(header).toMatch(/isExportOverlayInput/);
    expect(header).toMatch(/label\.closest\('#stReportExportOverlay'\)/);
    expect(header).toMatch(/#stReportExportOverlay label::before/);
    expect(css).toMatch(/#stReportExportOverlay input\[type="checkbox"\]/);
    expect(css).toMatch(/pointer-events:\s*auto !important/);
    expect(css).toMatch(/#stReportExportOverlay label::before/);
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
