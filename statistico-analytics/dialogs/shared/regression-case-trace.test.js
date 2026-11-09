/** @jest-environment node */
const { computeOLS } = require('../../src/shared/js/core/regression-compute.js');
const Trace = require('./regression-case-trace.js');

const PAIRS = [
  ['A', 0, 1],
  ['B', 1, 3],
  ['C', 2, 2],
  ['D', 3, 5],
  ['E', 4, 4],
  ['F', 8, 15]
];

function categoriesOf(rows, col) {
  return Array.from(new Set(rows.map(function (row) {
    return row[col] == null || row[col] === '' ? null : String(row[col]);
  }).filter(Boolean))).sort();
}

function simpleSpec(rows, address, extra) {
  const headers = ['id', 'x', 'y'];
  const input = Object.assign({
    headers: headers,
    rows: rows,
    address: address || 'Sheet1!A1:C7',
    yIndex: 2,
    xnIndices: [1],
    categoricalInfo: [],
    interactionInfo: [],
    preExcludedIndexes: []
  }, extra || {});
  return Trace.buildAnalyzedDesign(input);
}

function activeColumns() {
  return [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }];
}

function fitSpec(design, scenarioX) {
  const original = computeOLS(design.xMatrix, design.yVector, true, 0.05);
  return {
    cases: design.cases,
    xMatrix: design.xMatrix,
    yVector: design.yVector,
    includeIntercept: true,
    columns: activeColumns(),
    categoricalInfo: [],
    originalResults: original,
    scenario: {
      ok: true,
      xVector: [scenarioX],
      settingsLabel: 'x = ' + scenarioX,
      inputs: { x: scenarioX }
    },
    computeOLS: computeOLS
  };
}

function coeff(comparison, key) {
  return comparison.coefficients.find(function (row) { return row.key === key; });
}

describe('leave-one-out reference fit', () => {
  test('matches the six-pair OLS reference when F is omitted at x = 3', () => {
    const design = simpleSpec(PAIRS.map(function (row) { return row.slice(); }));
    expect(design.cases.map(function (c) { return c.displayLabel; })).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    const spec = fitSpec(design, 3);
    const calls = [];
    spec.computeOLS = function () {
      calls.push(arguments);
      return computeOLS.apply(null, arguments);
    };
    const comparison = Trace.buildComparison(spec, design.cases[5].caseKey);
    expect(calls.length).toBe(1);
    expect(comparison.status).toBe('ready');
    expect(comparison.nOriginal).toBe(6);
    expect(comparison.nTemporary).toBe(5);
    expect(comparison.modelFit[0].change).toBe(-1);

    const slope = coeff(comparison, 'x');
    expect(slope.estimate.original).toBeCloseTo(1.7, 6);
    expect(slope.estimate.temporary).toBeCloseTo(0.8, 6);
    expect(slope.estimate.change).toBeCloseTo(-0.9, 6);
    expect(slope.ci.original[0]).toBeCloseTo(0.867066, 6);
    expect(slope.ci.original[1]).toBeCloseTo(2.532934, 6);
    expect(slope.ci.temporary[0]).toBeCloseTo(-0.302432, 6);
    expect(slope.ci.temporary[1]).toBeCloseTo(1.902432, 6);
    expect(slope.ci.label).toBe('95% CI');

    const pred = comparison.prediction;
    expect(pred.available).toBe(true);
    expect(pred.settingsLabel).toBe('x = 3');
    expect(pred.ci.label).toBe('Fitted mean 95% CI');
    expect(pred.estimate.original).toBeCloseTo(5, 6);
    expect(pred.estimate.temporary).toBeCloseTo(3.8, 6);
    expect(pred.estimate.change).toBeCloseTo(-1.2, 6);
    expect(pred.ci.original[0]).toBeCloseTo(2.849375, 6);
    expect(pred.ci.original[1]).toBeCloseTo(7.150625, 6);
    expect(pred.ci.temporary[0]).toBeCloseTo(1.890532, 6);
    expect(pred.ci.temporary[1]).toBeCloseTo(5.709468, 6);
    expect(spec.originalResults.n).toBe(6);
  });
});

describe('row identity and pre-excluded rows', () => {
  test('keeps source identity after an incomplete row, a sort, and duplicate display ids', () => {
    const raw = PAIRS.map(function (row) { return row.slice(); });
    raw.splice(2, 0, ['Z', '', '']);
    raw.push(['A', 9, 1]);
    const stamped = Trace.stampIdentity(raw, 'Sheet1!A1:C20', null, ['id', 'x', 'y']);
    const zipped = raw.map(function (row, i) { return { row: row, ident: stamped.entries[i] }; });
    zipped.sort(function (a, b) { return String(a.row[0]).localeCompare(String(b.row[0])); });
    const design = simpleSpec(
      zipped.map(function (item) { return item.row; }),
      'Sheet1!A1:C20',
      { identity: zipped.map(function (item) { return item.ident; }), hostIdsValid: true }
    );
    const labels = design.cases.map(function (c) { return c.displayLabel; });
    expect(design.cases.length).toBe(7);
    const aLabels = labels.filter(function (label) { return label.indexOf('A') === 0; });
    expect(aLabels.length).toBe(2);
    expect(aLabels[0]).not.toBe(aLabels[1]);
    expect(labels).toContain('F');
    expect(new Set(design.cases.map(function (c) { return c.caseKey; })).size).toBe(7);
    const f = design.cases.find(function (c) { return c.displayLabel === 'F'; });
    const spec = fitSpec(design, 3);
    const comparison = Trace.buildComparison(spec, f.caseKey);
    expect(comparison.status).toBe('ready');
    expect(comparison.nOriginal).toBe(7);
    expect(comparison.nTemporary).toBe(6);
    const keptY = spec.yVector.filter(function (_y, i) { return design.cases[i].caseKey !== f.caseKey; });
    expect(keptY).not.toContain(15);
    expect(spec.yVector).toContain(15);
    expect(design.usedOriginalRows.some(function (row) { return row[0] === 'Z'; })).toBe(false);
  });

  test('duplicate host row ids fall back to source position', () => {
    const rows = PAIRS.map(function (row) { return row.slice(); });
    const design = simpleSpec(rows, 'Sheet1!A1:C7', { rowIds: ['same', 'same', 'same', 'same', 'same', 'same'] });
    expect(design.mappingSafe).toBe(true);
    expect(new Set(design.cases.map(function (c) { return c.caseKey; })).size).toBe(6);
  });

  test('leaves a filtered row out of both fits', () => {
    const rows = PAIRS.map(function (row) { return row.slice(); });
    const design = simpleSpec(rows, 'Sheet1!A1:C7', { preExcludedIndexes: [1] });
    expect(design.cases.map(function (c) { return c.displayLabel; })).toEqual(['A', 'C', 'D', 'E', 'F']);
    const f = design.cases.find(function (c) { return c.displayLabel === 'F'; });
    const spec = fitSpec(design, 3);
    const comparison = Trace.buildComparison(spec, f.caseKey);
    expect(comparison.nOriginal).toBe(5);
    expect(comparison.nTemporary).toBe(4);
    expect(spec.yVector).not.toContain(3);
    expect(spec.yVector).toContain(15);
  });
});

describe('ANCOVA estimability', () => {
  function ancova(rows, withInteraction) {
    const headers = ['y', 'x', 'Region'];
    const cats = categoriesOf(rows, 2);
    const categoricalInfo = [{
      name: 'Region',
      index: 2,
      categories: cats,
      dummyNames: cats.slice(1).map(function (cat) { return 'Region_' + cat; })
    }];
    const interactionInfo = withInteraction ? [{
      v1: 'x', v2: 'Region', v1IsNumeric: true, v2IsNumeric: false,
      v1Cat: null, v2Cat: categoricalInfo[0], v1Idx: 1, v2Idx: 2
    }] : [];
    const design = Trace.buildAnalyzedDesign({
      headers: headers,
      rows: rows,
      address: 'Sheet1!A1:C30',
      yIndex: 0,
      xnIndices: [1],
      categoricalInfo: categoricalInfo,
      interactionInfo: interactionInfo
    });
    const columns = [{ key: 'x', name: 'x', kind: 'numeric' }];
    categoricalInfo[0].dummyNames.forEach(function (name, i) {
      columns.push({ key: name, name: name, kind: 'dummy', factor: 'Region', level: cats[i + 1] });
    });
    if (withInteraction) {
      categoricalInfo[0].dummyNames.forEach(function (name, i) {
        columns.push({
          key: 'x × ' + name,
          name: 'x × ' + name,
          kind: 'interaction',
          factors: [
            { kind: 'numeric', name: 'x' },
            { kind: 'dummy', factor: 'Region', level: cats[i + 1] }
          ]
        });
      });
    }
    return { design: design, columns: columns, categoricalInfo: categoricalInfo };
  }

  test('an interaction ANCOVA matches an independent reduced fit', () => {
    const rows = [
      [1, 0, 'North'], [2, 1, 'North'], [4, 2, 'North'], [6, 3, 'North'],
      [2, 0, 'South'], [4, 1, 'South'], [7, 2, 'South'], [9, 4, 'South']
    ];
    const built = ancova(rows, true);
    const original = computeOLS(built.design.xMatrix, built.design.yVector, true, 0.05);
    const omit = built.design.cases.find(function (c) { return c.factors.Region === 'South' && c.analyzedIndex === 5; });
    const comparison = Trace.buildComparison({
      cases: built.design.cases,
      xMatrix: built.design.xMatrix,
      yVector: built.design.yVector,
      includeIntercept: true,
      columns: built.columns,
      categoricalInfo: built.categoricalInfo,
      originalResults: original,
      scenario: { ok: false, reason: 'No valid scenario is available.' }
    }, omit.caseKey);
    expect(comparison.status).toBe('ready');
    expect(comparison.prediction.available).toBe(false);
    const reducedRows = rows.filter(function (_row, i) { return built.design.usedOriginalRowIndices[omit.analyzedIndex] !== i; });
    const independent = ancova(reducedRows, true);
    const indie = computeOLS(independent.design.xMatrix, independent.design.yVector, true, 0.05);
    comparison.coefficients.forEach(function (row, i) {
      expect(row.estimate.temporary).toBeCloseTo(indie.coefficients[i], 8);
    });
    expect(comparison.coefficients.map(function (row) { return row.key; })).toEqual(
      ['Intercept'].concat(built.columns.map(function (col) { return col.key; }))
    );
  });

  test('names the factor level that would disappear', () => {
    const rows = [
      [1, 0, 'North'],
      [2, 1, 'South'], [3, 2, 'South'], [4, 3, 'South'], [6, 4, 'South']
    ];
    const built = ancova(rows, false);
    const original = computeOLS(built.design.xMatrix, built.design.yVector, true, 0.05);
    expect(original.coefficients.every(Number.isFinite)).toBe(true);
    const north = built.design.cases.find(function (c) { return c.factors.Region === 'North'; });
    const comparison = Trace.buildComparison({
      cases: built.design.cases,
      xMatrix: built.design.xMatrix,
      yVector: built.design.yVector,
      includeIntercept: true,
      columns: built.columns,
      categoricalInfo: built.categoricalInfo,
      originalResults: original,
      scenario: { ok: true, xVector: [1, 0], settingsLabel: 'x = 1, Region = South', inputs: { x: 1, Region: 'South' } }
    }, north.caseKey);
    expect(comparison.status).toBe('unavailable');
    expect(comparison.reason).toBe('Without this case, Region North has no observations and the same model cannot be estimated.');
    expect(original.n).toBe(5);
  });
});

describe('joint omission', () => {
  test('one temporary fit drops every selected case and names the rows together', () => {
    const phrase = Trace.casePhrase(['Row 25', 'Row 2']);
    expect(phrase.status).toBe('2 cases selected · Rows 2, 25');
    expect(phrase.andList).toBe('Rows 2 and 25');
    expect(phrase.compare).toBe('Compare without these 2 cases');
    expect(Trace.casePhrase(['Row 2']).compare).toBe('Compare without this case');

    const design = simpleSpec(PAIRS.map(function (row) { return row.slice(); }));
    const spec = fitSpec(design, 3);
    const calls = [];
    spec.computeOLS = function () {
      calls.push(1);
      return computeOLS.apply(null, arguments);
    };
    const e = design.cases[4];
    const f = design.cases[5];
    const comparison = Trace.buildComparison(spec, [f.caseKey, e.caseKey]);
    const reduced = computeOLS(design.xMatrix.slice(0, 4), design.yVector.slice(0, 4), true, 0.05);
    expect(calls.length).toBe(1);
    expect(comparison.status).toBe('ready');
    expect(comparison.omittedLabel).toBe('F and E');
    expect(comparison.nOriginal).toBe(6);
    expect(comparison.nTemporary).toBe(4);
    expect(comparison.modelFit[0].change).toBe(-2);
    expect(coeff(comparison, 'x').estimate.temporary).toBeCloseTo(reduced.coefficients[1], 8);
    expect(spec.originalResults.n).toBe(6);
    expect(comparison.prediction.estimate.temporary).toBeCloseTo(
      reduced.coefficients[0] + reduced.coefficients[1] * 3, 8
    );
  });

  test('changing the checked cases discards the previous temporary fit', async () => {
    const design = simpleSpec(PAIRS.map(function (row) { return row.slice(); }));
    const spec = fitSpec(design, 3);
    const session = Trace.createCaseSession();
    session.datasetReplaced(design);
    const e = design.cases[4];
    const f = design.cases[5];
    session.select(e.caseKey);
    session.toggle(f.caseKey, true);
    expect(session.selectedKeys()).toEqual([e.caseKey, f.caseKey]);
    const pending = session.runCompare(function () { return spec; });
    session.toggle(e.caseKey, false);
    const stale = await pending;
    expect(stale.applied).toBe(false);
    expect(session.selectedKeys()).toEqual([f.caseKey]);
    expect(session.state().comparison).toBe(null);
    const alone = await session.runCompare(function () { return spec; });
    expect(alone.applied).toBe(true);
    expect(alone.payload.nTemporary).toBe(5);
    expect(alone.payload.omittedLabel).toBe('F');
  });
});

describe('failure and stale responses', () => {
  test('a failed refit can be retried, and a stale response is discarded', async () => {
    const design = simpleSpec(PAIRS.map(function (row) { return row.slice(); }));
    const spec = fitSpec(design, 3);
    const session = Trace.createCaseSession();
    session.datasetReplaced(design);
    const f = design.cases.find(function (c) { return c.displayLabel === 'F'; });
    const a = design.cases.find(function (c) { return c.displayLabel === 'A'; });
    session.select(f.caseKey);
    session.armFailure();
    const failed = await session.runCompare(function () { return spec; });
    expect(failed.applied).toBe(true);
    expect(failed.payload.status).toBe('error');
    expect(failed.payload.retryable).toBe(true);
    expect(session.selectedKey()).toBe(f.caseKey);

    const retried = await session.runCompare(function () { return spec; });
    expect(retried.applied).toBe(true);
    expect(retried.payload.status).toBe('ready');
    expect(retried.payload.estimate ? true : retried.payload.coefficients[1].estimate.temporary).toBeCloseTo(0.8, 6);

    const pending = session.runCompare(function () { return spec; });
    session.select(a.caseKey);
    const stale = await pending;
    expect(stale.applied).toBe(false);
    expect(session.state().comparison).toBe(null);

    session.select(f.caseKey);
    const pendingRefresh = session.runCompare(function () { return spec; });
    session.datasetReplaced(design);
    const refreshed = await pendingRefresh;
    expect(refreshed.applied).toBe(false);
    expect(session.selectedKey()).toBe(null);

    session.datasetReplaced(design);
    session.select(f.caseKey);
    const done = await session.runCompare(function () { return spec; });
    expect(done.applied).toBe(true);
    session.closeComparison();
    expect(session.state().comparison).toBe(null);
    expect(session.selectedKey()).toBe(f.caseKey);
    session.dispose();
    const afterClose = await session.runCompare(function () { return spec; });
    expect(afterClose.applied).toBe(false);
  });
});
