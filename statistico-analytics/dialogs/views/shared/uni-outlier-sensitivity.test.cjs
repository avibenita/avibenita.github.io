const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const precisionCode = fs.readFileSync(path.join(__dirname, '../univariate/confidence-precision.js'), 'utf8');
const precisionSandbox = { Math: Math, console: console };
precisionSandbox.globalThis = precisionSandbox;
precisionSandbox.module = { exports: {} };
vm.createContext(precisionSandbox);
vm.runInContext(precisionCode, precisionSandbox);
globalThis.ConfidencePrecision = precisionSandbox.ConfidencePrecision;

require('./uni-outlier-sensitivity.js');
require('./interpretation-facts.js');
const api = globalThis.StatisticoOutlierSensitivity;
const interpretation = globalThis.StatisticoInterpretation;

function close(actual, expected, label) {
  const err = Math.abs(actual - expected);
  assert.ok(err <= 1e-9, label + ' got ' + actual + ' expected ' + expected);
}

function payloadFrom(values, extra) {
  return Object.assign({
    column: 'x',
    columnIndex: 0,
    values: values.slice(),
    sourceHeaders: ['x'],
    sourceRowsAll: values.map(function (value) { return [value]; }),
    sourceRows: values.map(function (value) { return [value]; })
  }, extra || {});
}

function sessionFor(values, extra) {
  const session = api.createSession(api.memoryStorage());
  session.sync(payloadFrom(values, extra));
  return session;
}

const ordinary = [10, 10, 10, 11, 11, 11, 12, 12, 12, 100];
const ordinarySession = sessionFor(ordinary);
const ordinarySnap = ordinarySession.snapshot();
assert.strictEqual(ordinarySnap.flagged.length, 1);
assert.strictEqual(ordinarySnap.flagged[0].value, 100);
assert.strictEqual(ordinarySnap.flagged[0].id, 'case:9');
assert.deepStrictEqual(ordinarySnap.selectedIds, ['case:9']);
assert.strictEqual(ordinarySnap.mode, 'all');
assert.strictEqual(ordinarySnap.screen.bounds.q1, 10);
assert.strictEqual(ordinarySnap.screen.bounds.q3, 12);
assert.strictEqual(ordinarySnap.screen.bounds.iqr, 2);
assert.strictEqual(ordinarySnap.screen.bounds.lower, 7);
assert.strictEqual(ordinarySnap.screen.bounds.upper, 15);

const allSummary = ordinarySession.summary('all');
assert.strictEqual(allSummary.n, 10);
close(allSummary.mean, 19.9, 'all mean');
assert.strictEqual(allSummary.median, 11);
close(allSummary.sd, 28.156112421047524, 'all sd');

assert.strictEqual(ordinarySession.setMode('subset').ok, true);
const subsetSummary = ordinarySession.summary('subset');
assert.strictEqual(subsetSummary.n, 9);
assert.strictEqual(subsetSummary.mean, 11);
assert.strictEqual(subsetSummary.median, 11);
close(subsetSummary.sd, 0.8660254037844386, 'subset sd');

const storedBootstrap = { draws: 4, estimate: 19.9 };
ordinarySession.setMode('all');
ordinarySession.rememberStochastic('all', storedBootstrap);
ordinarySession.setMode('subset');
ordinarySession.setMode('all');
assert.strictEqual(ordinarySession.recallStochastic('all'), storedBootstrap);
assert.strictEqual(ordinarySession.summary('all').mean, allSummary.mean);

const duplicates = [10, 10, 10, 11, 11, 11, 12, 100, 12, 100];
const duplicateSession = sessionFor(duplicates);
const duplicateFlags = duplicateSession.snapshot().flagged.map(function (row) { return row.id; });
assert.deepStrictEqual(duplicateFlags, ['case:7', 'case:9']);
const beforeSelect = duplicateSession.summary('all').mean;
duplicateSession.setSelected(['case:7']);
assert.strictEqual(duplicateSession.summary('all').mean, beforeSelect);
assert.strictEqual(duplicateSession.snapshot().mode, 'all');
duplicateSession.setMode('subset');
assert.deepStrictEqual(duplicateSession.summary('subset'), api.summarize([10, 10, 10, 11, 11, 11, 12, 12, 100]));
const selectedBeforeSort = duplicateSession.snapshot().selectedIds.slice();
duplicateSession.orderedFlagged('value');
duplicateSession.orderedFlagged('source');
assert.deepStrictEqual(duplicateSession.snapshot().selectedIds, selectedBeforeSort);

const bounds = api.fences(10, 12, 1.5);
assert.strictEqual(api.classify(7, bounds), null);
assert.strictEqual(api.classify(15, bounds), null);
assert.strictEqual(api.classify(6.99, bounds), 'low');
assert.strictEqual(api.classify(15.01, bounds), 'high');
const wide = api.fences(10, 12, 3);
assert.strictEqual(wide.lower, 4);
assert.strictEqual(wide.upper, 18);
ordinarySession.setK(3);
assert.strictEqual(ordinarySession.snapshot().mode, 'all');
assert.strictEqual(ordinarySession.snapshot().k, 3);
assert.strictEqual(ordinarySession.snapshot().screen.bounds.lower, 4);
assert.strictEqual(ordinarySession.snapshot().screen.bounds.upper, 18);
ordinarySession.setK(1.5);

const reveal = sessionFor([10, 10, 10, 10, 10, 10, 10, 11, 12, 50]);
const frozenIds = reveal.snapshot().flagged.map(function (row) { return row.id + ':' + row.value; });
assert.deepStrictEqual(frozenIds, ['case:9:50']);
reveal.setMode('subset');
assert.deepStrictEqual(reveal.snapshot().flagged.map(function (row) { return row.value; }), [50]);
const activeMarks = reveal.chartPoints().filter(function (point) { return point.activeReason && !point.baselineReason; });
assert.ok(activeMarks.some(function (point) { return point.value === 12; }));
assert.ok(!reveal.snapshot().selectedIds.some(function (id) { return id === 'case:8'; }));

assert.strictEqual(api.casesFromPayload(null).unavailable, 'empty');
const sparse = sessionFor([1, 2, 3]);
assert.strictEqual(sparse.snapshot().screen.ok, false);
assert.strictEqual(sparse.snapshot().screen.message, 'Outlier screening requires at least 4 observations.');
assert.strictEqual(sparse.setMode('subset').ok, false);
assert.strictEqual(sparse.summary('all').n, 3);

const constant = sessionFor([5, 5, 5, 5, 5]);
assert.strictEqual(constant.snapshot().flagged.length, 0);
assert.strictEqual(constant.snapshot().screen.bounds.iqr, 0);
assert.strictEqual(constant.snapshot().screen.bounds.zeroIqr, true);
assert.ok(constant.snapshot().screen.message.indexOf('IQR is zero') >= 0);

const zeroIqr = sessionFor([5, 5, 5, 5, 5, 5, 5, 100]);
assert.deepStrictEqual(zeroIqr.snapshot().flagged.map(function (row) { return row.value; }), [100]);
assert.strictEqual(zeroIqr.snapshot().screen.bounds.zeroIqr, true);
assert.ok(zeroIqr.snapshot().screen.message.indexOf('IQR is zero') >= 0);

const missing = payloadFrom([10, 10, 10, 11, 11, 11, 12, 12, 12, 100]);
missing.sourceRowsAll.splice(2, 0, ['']);
missing.sourceRows = missing.sourceRowsAll.slice();
const missingSession = api.createSession(api.memoryStorage());
missingSession.sync(missing);
assert.strictEqual(missingSession.snapshot().baselineN, 10);
assert.strictEqual(missingSession.snapshot().flagged.length, 1);
missingSession.setMode('subset');
assert.strictEqual(missingSession.summary('subset').n, 9);
assert.ok(missingSession.project(missing).sourceRows.some(function (row) { return row[0] === ''; }));

const noFlags = sessionFor([1, 2, 3, 4, 5, 6]);
assert.strictEqual(noFlags.snapshot().flagged.length, 0);
assert.strictEqual(noFlags.setMode('subset').ok, false);

const retained = [10, 10, 10, 11, 11, 11, 12, 12, 12];
const fresh = api.summarize(retained);
assert.deepStrictEqual(subsetSummary, fresh);

const firstGen = ordinarySession.beginUpdate();
const secondGen = ordinarySession.beginUpdate();
assert.strictEqual(ordinarySession.acceptResult(firstGen, { n: 1 }), false);
assert.strictEqual(ordinarySession.acceptResult(secondGen, { n: 9 }), true);

const failing = sessionFor(ordinary);
failing.debugFailSubset(true);
assert.strictEqual(failing.setMode('subset').failed, true);
assert.strictEqual(failing.snapshot().status, 'failed');
assert.strictEqual(failing.snapshot().mode, 'all');
assert.notStrictEqual(failing.exportMeta().mode, 'subset');
assert.strictEqual(failing.project(payloadFrom(ordinary)).values.length, 10);

const baseline = payloadFrom(ordinary);
const echoSession = sessionFor(ordinary);
echoSession.setMode('subset');
const projected = echoSession.project(baseline);
const merged = api.mergeStored(baseline, projected, echoSession);
assert.strictEqual(merged.values.length, 10);
assert.strictEqual(merged.values[9], 100);
assert.ok(!merged.__uniSensitivityProjection);

const mixed = api.casesFromPayload({
  column: 'x',
  sourceHeaders: ['x'],
  sourceRowsAll: [[10], [null], ['a'], [12], [11], [100]],
  sourceRows: [[10], [null], ['a'], [12], [11], [100]]
});
assert.strictEqual(mixed.coverage.rangeRows, 6);
assert.strictEqual(mixed.coverage.eligible, 4);
assert.strictEqual(mixed.coverage.blank, 1);
assert.strictEqual(mixed.coverage.nonNumeric, 1);

const grouped = api.casesFromPayload(payloadFrom(ordinary, { weighted: true }));
assert.strictEqual(grouped.unavailable, 'weighted');

const assessed = interpretation.buildUnivariateAssessment({
  variable: 'x',
  n: 9,
  mean: 11,
  sd: 0.8660254037844386,
  median: 11,
  sensitivity: { mode: 'subset', status: 'ready', baselineN: 10, retainedN: 9, excluded: 1, k: 1.5 }
});
const text = interpretation.assessmentPlainText(assessed);
assert.ok(text.indexOf('Sensitivity analysis') >= 0);
assert.ok(text.indexOf('does not establish that the population became normal') >= 0);
assert.ok(!/improvement/i.test(text));

const impact = api.impactIndex(allSummary, subsetSummary);
assert.strictEqual(impact.band, 'strong');
assert.ok(impact.score >= 67 && impact.score <= 100, 'impact score ' + impact.score);
assert.strictEqual(api.impactIndex(allSummary, allSummary).score, 0);
assert.strictEqual(api.impactIndex(allSummary, allSummary).band, 'none');

const impactSession = sessionFor(ordinary);
assert.strictEqual(impactSession.interpretationInput().impact.score, 0);
assert.strictEqual(impactSession.interpretationInput().impact.band, 'none');
impactSession.setMode('subset');
const impactInput = impactSession.interpretationInput();
assert.strictEqual(impactInput.impact.band, 'strong');
assert.ok(impactInput.impact.reading.indexOf('Excluding 1 of 10') >= 0);
assert.ok(impactInput.impact.reading.indexOf('strongest movement') >= 0);

const assessedImpact = interpretation.buildUnivariateAssessment({
  variable: 'x',
  n: 9,
  mean: 11,
  sd: 0.8660254037844386,
  median: 11,
  sensitivity: impactInput
});
const impactText = interpretation.assessmentPlainText(assessedImpact);
assert.ok(impactText.indexOf('Outlier Impact Index is ' + impactInput.impact.score) >= 0);
assert.ok(impactText.indexOf('No outlier-rule result') < 0);
assert.ok(impactText.indexOf('not a better result') >= 0);
assert.ok(!/improvement/i.test(impactText));

const assembled = interpretation.assembleUnivariateInput({
  stored: { column: 'x', n: 10, descriptive: { n: 10, mean: 19.9, sd: 28.156, median: 11, min: 10, max: 100, q1: 10, q3: 12 } },
  sensitivity: impactInput
});
assert.strictEqual(assembled.n, 9);
assert.strictEqual(assembled.mean, 11);
assert.strictEqual(assembled.q1, null);
const assembledText = interpretation.assessmentPlainText(interpretation.buildUnivariateAssessment(assembled));
assert.ok(assembledText.indexOf('Outlier Impact Index is ' + impactInput.impact.score) >= 0);
assert.ok(assembledText.indexOf('No outlier-rule result') < 0);
assert.ok(assembledText.indexOf('n = 9') >= 0);

console.log('uni-outlier-sensitivity tests passed');
