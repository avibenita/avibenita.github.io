/** @jest-environment node */
const SI = require('./segmentation-split-index.js');
const SS = require('./segmentation-engine.js');

function config(extra) {
  const cfg = SS.defaultConfig();
  cfg.xDimension.columns = ['Sat'];
  cfg.yDimension.columns = ['Stay'];
  cfg.xDimension.threshold = 4;
  cfg.yDimension.threshold = 4;
  cfg.factorColumns = ['Career', 'Pay'];
  Object.assign(cfg, extra || {});
  return cfg;
}

function row(index, sat, stay, career, pay, weight) {
  return {
    index: index,
    id: 'R' + index,
    xScore: sat,
    yScore: stay,
    segment: SS.classify(sat, stay, 4, 4),
    weight: weight == null ? 1 : weight,
    wave: '2026',
    factorScores: { Career: career, Pay: pay }
  };
}

describe('Split Index calculations', () => {
  test('raw Split Index is the absolute mean difference and the signed difference keeps direction', () => {
    expect(SI.calculateRawSplitIndex(4.5, 4)).toBeCloseTo(0.5, 8);
    const result = SI.calculateSplitIndex([
      row(0, 5, 5, 5, 3),
      row(1, 5, 5, 4, 3),
      row(2, 2, 2, 2, 3),
      row(3, 2, 2, 3, 3)
    ], config(), { mode: 'stay', index: 'raw' });
    const career = result.factors.filter((f) => f.factorId === 'Career')[0];
    expect(career.group1.mean).toBeCloseTo(4.5, 8);
    expect(career.group2.mean).toBeCloseTo(2.5, 8);
    expect(career.signedDifference).toBeCloseTo(2, 8);
    expect(career.rawSplitIndex).toBeCloseTo(2, 8);
    expect(career.selectedSplitIndex).toBeCloseTo(2, 8);
  });

  test('standardized Split Index uses the pooled standard deviation', () => {
    const g1 = SI.calculateGroupStatistics([{ value: 1, weight: 1 }, { value: 2, weight: 1 }, { value: 3, weight: 1 }]);
    const g2 = SI.calculateGroupStatistics([{ value: 4, weight: 1 }, { value: 5, weight: 1 }, { value: 6, weight: 1 }]);
    expect(g1.mean).toBeCloseTo(2, 8);
    expect(g1.variance).toBeCloseTo(1, 8);
    expect(g2.mean).toBeCloseTo(5, 8);
    expect(SI.calculateStandardizedSplitIndex(g1, g2)).toBeCloseTo(3, 8);
  });

  test('equal means produce a Split Index of zero', () => {
    const result = SI.calculateSplitIndex([
      row(0, 5, 5, 4, 4),
      row(1, 2, 2, 4, 2)
    ], config(), { mode: 'stay' });
    const career = result.factors.filter((f) => f.factorId === 'Career')[0];
    expect(career.rawSplitIndex).toBe(0);
    expect(career.signedDifference).toBe(0);
  });

  test('zero pooled variance does not divide by zero', () => {
    const g1 = SI.calculateGroupStatistics([{ value: 4, weight: 1 }, { value: 4, weight: 1 }]);
    const g2 = SI.calculateGroupStatistics([{ value: 4, weight: 1 }, { value: 4, weight: 1 }]);
    expect(g1.sd).toBe(0);
    expect(SI.calculateStandardizedSplitIndex(g1, g2)).toBeNull();
    const result = SI.calculateSplitIndex([
      row(0, 5, 5, 4, 1),
      row(1, 5, 5, 4, 1),
      row(2, 2, 2, 4, 1),
      row(3, 2, 2, 4, 1)
    ], config(), { index: 'standardized' });
    const career = result.factors.filter((f) => f.factorId === 'Career')[0];
    expect(career.standardizedSplitIndex).toBeNull();
    expect(career.selectedSplitIndex).toBeNull();
    expect(SI.buildFactorTooltip(career, { showEvidence: false })).toMatch(/No within-group variation/);
  });

  test('missing observations produce factor-specific bases', () => {
    const people = [
      row(0, 5, 5, 5, null),
      row(1, 5, 5, 3, 4),
      row(2, 2, 2, null, 2),
      row(3, 2, 2, 1, 2)
    ];
    const result = SI.calculateSplitIndex(people, config(), { missingData: 'available' });
    const career = result.factors.filter((f) => f.factorId === 'Career')[0];
    const pay = result.factors.filter((f) => f.factorId === 'Pay')[0];
    expect(career.group1.validN).toBe(2);
    expect(career.group2.validN).toBe(1);
    expect(pay.group1.validN).toBe(1);
    expect(pay.group2.validN).toBe(2);
    expect(result.group1.validN).toBe(2);
    expect(result.group2.validN).toBe(2);
  });

  test('complete-case analysis keeps only respondents with every factor', () => {
    const people = [
      row(0, 5, 5, 5, 4),
      row(1, 5, 5, 3, null),
      row(2, 2, 2, 1, 2),
      row(3, 2, 2, null, 2)
    ];
    const available = SI.calculateSplitIndex(people, config(), { missingData: 'available' });
    const complete = SI.calculateSplitIndex(people, config(), { missingData: 'complete' });
    expect(available.factors.filter((f) => f.factorId === 'Career')[0].group1.validN).toBe(2);
    expect(complete.factors.filter((f) => f.factorId === 'Career')[0].group1.validN).toBe(1);
    expect(complete.factors.filter((f) => f.factorId === 'Pay')[0].group2.validN).toBe(1);
  });

  test('weighted means use the weights and keep the unweighted base', () => {
    const stats = SI.calculateGroupStatistics([
      { value: 2, weight: 1 },
      { value: 5, weight: 3 }
    ]);
    expect(stats.mean).toBeCloseTo(4.25, 8);
    expect(stats.validN).toBe(2);
    expect(stats.weightedN).toBe(4);
    const result = SI.calculateSplitIndex([
      row(0, 5, 5, 2, 1, 1),
      row(1, 5, 5, 5, 1, 3),
      row(2, 2, 2, 1, 1, 1)
    ], config(), { mode: 'stay' });
    expect(result.weightUsed).toBe(true);
    expect(result.factors.filter((f) => f.factorId === 'Career')[0].group1.mean).toBeCloseTo(4.25, 8);
    expect(result.factors.filter((f) => f.factorId === 'Career')[0].group1.validN).toBe(2);
    expect(result.group1.validN).toBe(2);
  });

  test('segment comparisons are mutually exclusive and reject a group compared with itself', () => {
    const people = [row(0, 5, 5, 5, 3), row(1, 5, 2, 2, 3), row(2, 2, 5, 4, 3), row(3, 2, 2, 1, 3)];
    ['stay', 'satisfaction', 'segmentVsRest'].forEach((mode) => {
      const result = SI.calculateSplitIndex(people, config(), { mode: mode, segment: 'highXHighY' });
      expect(result.overlap).toBe(0);
    });
    const pair = SI.calculateSplitIndex(people, config(), { mode: 'segments', group1: 'highXHighY', group2: 'lowXLowY' });
    expect(pair.overlap).toBe(0);
    expect(pair.group1.validN).toBe(1);
    expect(pair.group2.validN).toBe(1);
    const same = SI.calculateSplitIndex(people, config(), { mode: 'segments', group1: 'highXHighY', group2: 'highXHighY' });
    expect(same.ok).toBe(false);
    expect(same.error).toMatch(/itself/);
  });

  test('threshold changes move stay and leave membership', () => {
    const people = [row(0, 5, 3.5, 5, 3), row(1, 5, 4.5, 2, 3)];
    const lowCut = config();
    lowCut.yDimension = Object.assign({}, lowCut.yDimension, { threshold: 3 });
    const highCut = config();
    highCut.yDimension = Object.assign({}, highCut.yDimension, { threshold: 4 });
    expect(SI.calculateSplitIndex(people, lowCut, { mode: 'stay' }).group1.validN).toBe(2);
    expect(SI.calculateSplitIndex(people, highCut, { mode: 'stay' }).group1.validN).toBe(1);
  });

  test('editable labels do not change the Split Index', () => {
    const people = [row(0, 5, 5, 5, 3), row(1, 2, 2, 2, 3)];
    const renamed = config();
    renamed.yDimension = Object.assign({}, renamed.yDimension, { highLabel: 'Stayers', lowLabel: 'Leavers' });
    renamed.segments = Object.assign({}, renamed.segments, {
      highXHighY: { label: 'Promoters', color: '#111111' }
    });
    const base = SI.calculateSplitIndex(people, config(), { mode: 'stay' });
    const next = SI.calculateSplitIndex(people, renamed, { mode: 'stay' });
    expect(next.factors[0].rawSplitIndex).toBe(base.factors[0].rawSplitIndex);
    expect(next.group1.label).toBe('Stayers');
    expect(next.factors[0].rawSplitIndex).toBe(base.factors[0].rawSplitIndex);
  });

  test('questionnaire order is preserved and descending Split Index sort works', () => {
    const people = [
      row(0, 5, 5, 5, 4),
      row(1, 2, 2, 1, 3)
    ];
    const desc = SI.calculateSplitIndex(people, config(), { sort: 'splitDesc' });
    expect(desc.displayed.map((f) => f.factorId)).toEqual(['Career', 'Pay']);
    const order = SI.calculateSplitIndex(people, config(), { sort: 'order' });
    expect(order.displayed.map((f) => f.factorId)).toEqual(['Career', 'Pay']);
    expect(order.displayed.map((f) => f.originalOrder)).toEqual([0, 1]);
  });

  test('top 5 and top 10 keep the largest Split Index factors', () => {
    const factors = [];
    for (let i = 0; i < 12; i++) factors.push('F' + i);
    const people = [
      row(0, 5, 5, 0, 0),
      row(1, 2, 2, 0, 0)
    ];
    people.forEach((person) => { person.factorScores = {}; });
    factors.forEach((name, i) => {
      people[0].factorScores[name] = 5;
      people[1].factorScores[name] = 5 - (i + 1) * 0.1;
    });
    const cfg = config();
    cfg.factorColumns = factors;
    const top5 = SI.calculateSplitIndex(people, cfg, { topN: 5, sort: 'order' });
    const top10 = SI.calculateSplitIndex(people, cfg, { topN: 10, sort: 'splitDesc' });
    expect(top5.displayed).toHaveLength(5);
    expect(top5.displayed.map((f) => f.factorId)).toEqual(['F7', 'F8', 'F9', 'F10', 'F11']);
    expect(top10.displayed).toHaveLength(10);
    expect(top10.displayed[0].factorId).toBe('F11');
  });

  test('Welch test and confidence interval match the reference calculation', () => {
    const g1 = SI.calculateGroupStatistics([{ value: 1, weight: 1 }, { value: 2, weight: 1 }, { value: 3, weight: 1 }]);
    const g2 = SI.calculateGroupStatistics([{ value: 4, weight: 1 }, { value: 5, weight: 1 }, { value: 6, weight: 1 }]);
    const welch = SI.calculateWelchTest(g1, g2);
    const ci = SI.calculateDifferenceCI(g1, g2, welch);
    expect(welch.degreesOfFreedom).toBeCloseTo(4, 6);
    expect(welch.statistic).toBeCloseTo(-3.674234614, 5);
    expect(SI.tCritical(0.975, 4)).toBeCloseTo(2.776445105, 4);
    expect(ci.lower).toBeCloseTo(-3 - 2.776445105 * Math.sqrt(2 / 3), 4);
    expect(ci.upper).toBeCloseTo(-3 + 2.776445105 * Math.sqrt(2 / 3), 4);
    expect(welch.pValue).toBeGreaterThan(0.02);
    expect(welch.pValue).toBeLessThan(0.03);
  });

  test('FDR, Holm, and Bonferroni adjustments match the sorted p-values', () => {
    const raw = [0.01, 0.04, 0.03];
    expect(SI.adjustPValues(raw, 'bonferroni').map((p) => Math.round(p * 1000) / 1000)).toEqual([0.03, 0.12, 0.09]);
    expect(SI.adjustPValues(raw, 'holm').map((p) => Math.round(p * 1000) / 1000)).toEqual([0.03, 0.06, 0.06]);
    expect(SI.adjustPValues(raw, 'bh').map((p) => Math.round(p * 1000) / 1000)).toEqual([0.03, 0.04, 0.04]);
    expect(SI.adjustPValues(raw, 'none')).toEqual(raw);
  });

  test('Drivers respects demographic filters through the segmentation bundle', () => {
    const headers = ['Sat', 'Stay', 'Career', 'Level'];
    const rows = [
      [5, 5, 5, 'Managers'],
      [5, 5, 1, 'Staff'],
      [2, 2, 1, 'Managers']
    ];
    const cfg = config({ groupColumn: null, filters: { Level: ['Managers'] } });
    const bundle = SS.analyze(headers, rows, cfg);
    const result = SI.calculateSplitIndex(bundle.scoredRespondents, bundle.config, { mode: 'stay' });
    expect(bundle.validN).toBe(2);
    expect(result.group1.validN + result.group2.validN).toBe(2);
    expect(result.factors.filter((f) => f.factorId === 'Career')[0].group1.mean).toBe(5);
  });

  test('exported results contain raw and standardized indices', () => {
    const result = SI.calculateSplitIndex([
      row(0, 5, 5, 5, 4),
      row(1, 5, 5, 4, 4),
      row(2, 2, 2, 2, 3),
      row(3, 2, 2, 3, 3)
    ], config(), { index: 'raw' });
    const table = SI.resultsTable(result);
    expect(table[0]['Raw Split Index']).toBeTruthy();
    expect(table[0]['Standardized Split Index']).toBeTruthy();
    expect(Object.keys(table[0])).toEqual(expect.arrayContaining([
      'Factor', 'Signed difference', 'Raw Split Index', 'Standardized Split Index', 'Pattern classification'
    ]));
  });

  test('long factor labels stay available in the tooltip', () => {
    const people = [row(0, 5, 5, 5, 3), row(1, 2, 2, 2, 3)];
    people.forEach((person) => {
      person.factorScores['Career development opportunities across the organisation'] = person.factorScores.Career;
    });
    const cfg = config();
    cfg.factorColumns = ['Career development opportunities across the organisation'];
    cfg.factors = [];
    const result = SI.calculateSplitIndex(people, cfg, {});
    const text = SI.buildFactorTooltip(result.factors[0], { showEvidence: true });
    expect(text.indexOf('Career development opportunities across the organisation')).toBe(0);
    expect(text).toMatch(/Valid n:/);
  });

  test('the chart uses smooth group lines and Split Index columns on a second axis', () => {
    const result = SI.calculateSplitIndex([
      row(0, 5, 5, 5, 4),
      row(1, 2, 2, 2, 3)
    ], config(), {});
    const options = SI.buildSplitIndexChartOptions(result);
    expect(options.chart.type).toBe('spline');
    expect(options.series.map((series) => series.type)).toEqual(['spline', 'spline', 'column']);
    expect(options.series[0].data).toEqual([5, 4]);
    expect(options.series[2].yAxis).toBe(1);
    expect(options.yAxis[1].opposite).toBe(true);
  });
});
