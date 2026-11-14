/** @jest-environment node */
const Engine = require('./gage-rr-engine.js');

function tableFromCells(cells, address) {
  const rows = [];
  cells.forEach(function (cell) {
    cell.values.forEach(function (value) {
      rows.push([cell.part, cell.operator, value]);
    });
  });
  return {
    headers: ['Part', 'Operator', 'Measurement'],
    rows: rows,
    address: address || 'Sheet1!A1:C' + (rows.length + 1)
  };
}

function study(cells, spec, address) {
  return Engine.analyze(tableFromCells(cells, address), {
    part: 'Part',
    operator: 'Operator',
    measurement: 'Measurement'
  }, spec || { lsl: 80, usl: 120 });
}

const retained = [
  { part: 'P01', operator: 'A', values: [88, 90] },
  { part: 'P01', operator: 'B', values: [90, 92] },
  { part: 'P02', operator: 'A', values: [102, 104] },
  { part: 'P02', operator: 'B', values: [116, 118] }
];
const pooled = [
  { part: 'P01', operator: 'A', values: [85, 87] },
  { part: 'P01', operator: 'B', values: [93, 95] },
  { part: 'P02', operator: 'A', values: [105, 107] },
  { part: 'P02', operator: 'B', values: [113, 115] }
];
const negativeOperator = [
  { part: 'P01', operator: 'A', values: [89, 91] },
  { part: 'P01', operator: 'B', values: [89, 91] },
  { part: 'P02', operator: 'A', values: [109, 111] },
  { part: 'P02', operator: 'B', values: [109, 111] }
];

function expectClean(result) {
  expect(Engine.nonFinitePaths(result)).toEqual([]);
  expect(Engine.nonFinitePaths(Engine.exportData(result))).toEqual([]);
  const text = Engine.reportText(result) + Engine.reportHtml(result);
  expect(text).not.toMatch(/NaN|Infinity/);
}

describe('crossed Gage R&R fixtures', () => {
  test('retains the interaction and matches the variance contract', () => {
    const result = study(retained);
    expectClean(result);
    expect(result.anova.pooled).toBe(false);
    expect(result.anova.interaction.p).toBeCloseTo(0.00388254, 6);
    expect(Engine.component(result, 'repeatability').variance).toBeCloseTo(2, 8);
    expect(Engine.component(result, 'operator').variance).toBeCloseTo(14, 8);
    expect(Engine.component(result, 'interaction').variance).toBeCloseTo(35, 8);
    expect(Engine.component(result, 'part').variance).toBeCloseTo(182, 8);
    expect(Engine.component(result, 'gage').variance).toBeCloseTo(51, 8);
    expect(result.summary.pctContribution).toBeCloseTo(21.8884, 4);
    expect(result.summary.pctStudy).toBeCloseTo(46.7851, 4);
    expect(result.summary.pctTolerance).toBeCloseTo(107.1214, 4);
    expect(result.summary.distinctCategories).toBe(2);
    expect(result.charts.rBar).toBeCloseTo(2, 8);
    expect(result.charts.rLimits.ucl).toBeCloseTo(6.534, 3);
    expect(result.charts.xLimits.center).toBeCloseTo(100, 8);
    const detail = Engine.cellDetail(result, 'P01', 'A');
    expect(detail.values).toEqual([88, 90]);
    expect(detail.mean).toBeCloseTo(89, 8);
    expect(detail.range).toBeCloseTo(2, 8);
    expect(detail.sourceRows).toEqual([2, 3]);
  });

  test('pools a non-significant interaction', () => {
    const result = study(pooled);
    expectClean(result);
    expect(result.anova.pooled).toBe(true);
    expect(result.anova.interaction.p).toBe(1);
    expect(result.anova.reduced.rows.find((row) => row.source === 'Repeatability').df).toBe(5);
    expect(Engine.component(result, 'repeatability').variance).toBeCloseTo(1.6, 8);
    expect(Engine.component(result, 'operator').variance).toBeCloseTo(31.6, 8);
    expect(Engine.component(result, 'interaction').variance).toBe(0);
    expect(Engine.component(result, 'part').variance).toBeCloseTo(199.6, 8);
    expect(Engine.component(result, 'gage').variance).toBeCloseTo(33.2, 8);
    expect(result.summary.pctStudy).toBeCloseTo(37.7640, 4);
    expect(result.summary.pctTolerance).toBeCloseTo(86.4292, 4);
    expect(result.summary.distinctCategories).toBe(3);
  });

  test('reports a negative operator estimate as zero', () => {
    const result = study(negativeOperator);
    expectClean(result);
    expect(result.signedVariance.operator).toBeCloseTo(-0.4, 8);
    expect(Engine.component(result, 'operator').variance).toBe(0);
    expect(Engine.component(result, 'operator').zeroed).toBe(true);
    expect(Engine.component(result, 'gage').variance).toBeCloseTo(1.6, 8);
    expect(Engine.reportText(result)).toMatch(/reported as zero/);
  });

  test('doubling the tolerance width halves %Tolerance and leaves the ANOVA alone', () => {
    const fitted = study(retained, { lsl: 80, usl: 120 });
    const wider = Engine.withTolerance(fitted, { lsl: 60, usl: 140 });
    expect(wider.summary.pctTolerance).toBeCloseTo(fitted.summary.pctTolerance / 2, 8);
    expect(wider.summary.pctStudy).toBe(fitted.summary.pctStudy);
    expect(wider.anova).toBe(fitted.anova);
    expect(Engine.component(wider, 'part').variance).toBe(Engine.component(fitted, 'part').variance);
  });

  test('keeps the same variances when a large offset is added and when rows are permuted', () => {
    const shifted = retained.map((cell) => ({
      part: cell.part,
      operator: cell.operator,
      values: cell.values.map((value) => value + 1e8)
    }));
    const base = study(retained, {});
    const offset = study(shifted, {});
    ['repeatability', 'operator', 'interaction', 'part'].forEach((id) => {
      expect(Engine.component(offset, id).variance).toBeCloseTo(Engine.component(base, id).variance, 6);
    });
    const reversed = tableFromCells(retained.slice().reverse(), 'Data!C5:E12');
    reversed.rows.reverse();
    const flipped = Engine.analyze(reversed, { part: 'Part', operator: 'Operator', measurement: 'Measurement' });
    expect(Engine.component(flipped, 'gage').variance).toBeCloseTo(Engine.component(base, 'gage').variance, 8);
    const trace = Engine.cellDetail(flipped, 'P01', 'A');
    expect(trace.values.slice().sort((a, b) => a - b)).toEqual([88, 90]);
    expect(trace.sourceRows.slice().sort((a, b) => a - b)).toEqual([6, 7]);
  });
});

describe('crossed Gage R&R eligibility', () => {
  test('names the Excel row when a reading, a cell, or a partial row is removed', () => {
    const droppedReading = tableFromCells(retained);
    droppedReading.rows.splice(1, 1);
    const uneven = Engine.analyze(droppedReading, { part: 'Part', operator: 'Operator', measurement: 'Measurement' });
    expect(uneven.ok).toBe(false);
    expect(uneven.error).toMatch(/same number of times|P01 × Operator A/);

    const missingCell = tableFromCells(retained.filter((cell) => !(cell.part === 'P02' && cell.operator === 'B')));
    const gone = Engine.analyze(missingCell, { part: 'Part', operator: 'Operator', measurement: 'Measurement' });
    expect(gone.ok).toBe(false);
    expect(gone.grid.problems.some((cell) => cell.part === 'P02' && cell.operator === 'B' && cell.count === 0)).toBe(true);

    const partial = tableFromCells(retained);
    partial.rows.push(['P01', 'A', '']);
    const blank = Engine.analyze(partial, { part: 'Part', operator: 'Operator', measurement: 'Measurement' });
    expect(blank.ok).toBe(false);
    expect(blank.errors[0].message).toMatch(/Row 10/);
    expect(blank.errors[0].message).toMatch(/blank Measurement/);
  });

  test('preserves text identifiers and skips a fully empty row', () => {
    const table = tableFromCells([{ part: '001', operator: 'A', values: [1, 1] }, { part: '002', operator: 'B', values: [3, 3] }, { part: '001', operator: 'B', values: [1, 1] }, { part: '002', operator: 'A', values: [3, 3] }]);
    table.rows.splice(2, 0, ['', '', '']);
    const result = Engine.analyze(table, { part: 'Part', operator: 'Operator', measurement: 'Measurement' });
    expect(result.ok).toBe(true);
    expect(result.design.partLabels).toEqual(['001', '002']);
    expect(result.skippedEmptyRows).toBe(1);
  });

  test('blocks worksheet errors and does not fit around them', () => {
    const table = tableFromCells(retained);
    table.rows[0][2] = '#DIV/0!';
    const result = Engine.analyze(table, { part: 'Part', operator: 'Operator', measurement: 'Measurement' });
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/worksheet error/);
    expect(result.exportReady).toBeUndefined();
  });

  test('handles constant data, zero repeatability, and invalid limits without non-finite output', () => {
    const constant = study([
      { part: 'P01', operator: 'A', values: [5, 5] },
      { part: 'P01', operator: 'B', values: [5, 5] },
      { part: 'P02', operator: 'A', values: [5, 5] },
      { part: 'P02', operator: 'B', values: [5, 5] }
    ]);
    expectClean(constant);
    expect(constant.summary.pctStudy).toBeNull();
    expect(constant.summary.pctTolerance).toBe(0);
    expect(constant.distinctCategories.state).toBe('unavailable');
    expect(constant.anova.pooled).toBe(true);
    expect(constant.anova.interaction.state).toBe('unavailable');

    const flatRepeats = study([
      { part: 'P01', operator: 'A', values: [10, 10] },
      { part: 'P01', operator: 'B', values: [14, 14] },
      { part: 'P02', operator: 'A', values: [20, 20] },
      { part: 'P02', operator: 'B', values: [16, 16] }
    ]);
    expect(flatRepeats.anova.pooled).toBe(false);
    expect(flatRepeats.anova.interaction.p).toBe(0);
    expect(Engine.component(flatRepeats, 'repeatability').variance).toBe(0);
    expect(Engine.component(flatRepeats, 'part').variance).toBeGreaterThan(0);

    const omitted = study(retained, {});
    expect(omitted.ok).toBe(true);
    expect(omitted.tolerance.omitted).toBe(true);
    expect(omitted.summary.pctTolerance).toBeNull();
    expect(omitted.summary.pctStudy).toBeCloseTo(46.7851, 4);

    const reversed = study(retained, { lsl: 120, usl: 80 });
    expect(reversed.ok).toBe(true);
    expect(reversed.tolerance.message).toMatch(/greater than the lower/);
    expect(reversed.summary.pctStudy).not.toBeNull();
    const equal = study(retained, { lsl: 10, usl: 10 });
    expect(equal.tolerance.valid).toBe(false);
    const oneSided = study(retained, { lsl: 80, usl: '' });
    expect(oneSided.tolerance.message).toMatch(/both/);
    expectClean(reversed);
    expectClean(equal);
    expectClean(oneSided);
  });

  test('leaves the chart without limits when the repeat count has no factors', () => {
    const values = [];
    let i;
    for (i = 0; i < 26; i++) values.push(i);
    const wide = study([
      { part: 'P01', operator: 'A', values: values },
      { part: 'P01', operator: 'B', values: values.map((v) => v + 1) },
      { part: 'P02', operator: 'A', values: values.map((v) => v + 3) },
      { part: 'P02', operator: 'B', values: values.map((v) => v + 4) }
    ], {});
    expect(wide.ok).toBe(true);
    expect(wide.charts.constants.available).toBe(false);
    expect(wide.charts.rLimits).toBeNull();
    expect(wide.charts.points.length).toBe(4);
    expect(Engine.reportText(wide)).toMatch(/not available for 26 repeats/);
  });
});

describe('Minitab GageData benchmark', () => {
  // Public AIAG MSA table shipped by Minitab as GageData.MWX.
  // Rows match the Minitab help excerpt (part 1, operator A: 0.29, 0.41, 0.64)
  // and the CSV mirror at https://limitline.org/validation/aiag-msa4-gage-rr.csv.
  // Published comparison: Minitab crossed Gage R&R example, process tolerance 8.
  const trials = {
    A: [
      [0.29, -0.56, 1.34, 0.47, -0.80, 0.02, 0.59, -0.31, 2.26, -1.36],
      [0.41, -0.68, 1.17, 0.50, -0.92, -0.11, 0.75, -0.20, 1.99, -1.25],
      [0.64, -0.58, 1.27, 0.64, -0.84, -0.21, 0.66, -0.17, 2.01, -1.31]
    ],
    B: [
      [0.08, -0.47, 1.19, 0.01, -0.56, -0.20, 0.47, -0.63, 1.80, -1.68],
      [0.25, -1.22, 0.94, 1.03, -1.20, 0.22, 0.55, 0.08, 2.12, -1.62],
      [0.07, -0.68, 1.34, 0.20, -1.28, 0.06, 0.83, -0.34, 2.19, -1.50]
    ],
    C: [
      [0.04, -1.38, 0.88, 0.14, -1.46, -0.29, 0.02, -0.46, 1.77, -1.49],
      [-0.11, -1.13, 1.09, 0.20, -1.07, -0.67, 0.01, -0.56, 1.45, -1.77],
      [-0.15, -0.96, 0.67, 0.11, -1.45, -0.49, 0.21, -0.49, 1.87, -2.16]
    ]
  };

  test('matches the published pooled ANOVA, %Study Var, and distinct categories', () => {
    const cells = [];
    Object.keys(trials).forEach((operator) => {
      for (let part = 1; part <= 10; part++) {
        cells.push({
          part: String(part),
          operator: operator,
          values: trials[operator].map((trial) => trial[part - 1])
        });
      }
    });
    const result = study(cells, { lsl: 0, usl: 8 });
    expectClean(result);
    expect(result.design.readings).toBe(90);
    expect(result.anova.interaction.p).toBeCloseTo(0.974, 3);
    expect(result.anova.reduced.rows.find((row) => row.source === 'Repeatability').df).toBe(78);
    expect(result.anova.full.rows.find((row) => row.source === 'Part').ss).toBeCloseTo(88.3619, 3);
    expect(result.summary.pctStudy).toBeCloseTo(27.86, 2);
    expect(result.summary.pctTolerance).toBeCloseTo(22.68, 2);
    expect(result.summary.distinctCategories).toBe(4);
    expect(Engine.component(result, 'gage').variance).toBeCloseTo(0.09143, 4);
    expect(Engine.component(result, 'part').pctContribution).toBeCloseTo(92.24, 2);
  });
});
