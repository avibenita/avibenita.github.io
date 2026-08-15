const Seg = require('./segmentation-engine.js');

function row(sat, stay, group, wave, weight, id) {
  return [id || '', sat, stay, group || '', wave || '', weight == null ? 1 : weight];
}

const HEADERS = ['ID', 'Sat', 'Stay', 'Group', 'Wave', 'Weight'];

function analyze(rows, extra) {
  return Seg.analyze(HEADERS, rows, Object.assign({
    xDimension: { columns: ['Sat'], thresholdMethod: 'custom', threshold: 4 },
    yDimension: { columns: ['Stay'], thresholdMethod: 'custom', threshold: 4 }
  }, extra || {}));
}

describe('Survey Segmentation Matrix engine', () => {
  test('classifies all four quadrants', () => {
    const rows = [
      row(5, 5, 'A'),
      row(5, 2, 'A'),
      row(2, 5, 'A'),
      row(2, 2, 'A')
    ];
    const r = analyze(rows);
    expect(r.analyzable).toBe(true);
    expect(r.overall.segments.highXHighY.n).toBe(1);
    expect(r.overall.segments.highXLowY.n).toBe(1);
    expect(r.overall.segments.lowXHighY.n).toBe(1);
    expect(r.overall.segments.lowXLowY.n).toBe(1);
    expect(r.overall.segments.highXHighY.label).toBe('Truly Loyal');
    expect(r.overall.segments.highXLowY.label).toBe('Accessible');
    expect(r.overall.segments.lowXHighY.label).toBe('Trapped');
    expect(r.overall.segments.lowXLowY.label).toBe('High Risk');
  });

  test('values exactly equal to the threshold belong to the high category', () => {
    expect(Seg.assignSegment(4, 4, 4, 4)).toBe('highXHighY');
    expect(Seg.assignSegment(4, 3.99, 4, 4)).toBe('highXLowY');
    expect(Seg.assignSegment(3.99, 4, 4, 4)).toBe('lowXHighY');
    const r = analyze([row(4, 4), row(4, 3.9), row(3.9, 4), row(3.9, 3.9)]);
    expect(r.overall.segments.highXHighY.n).toBe(1);
    expect(r.overall.segments.highXLowY.n).toBe(1);
    expect(r.overall.segments.lowXHighY.n).toBe(1);
    expect(r.overall.segments.lowXLowY.n).toBe(1);
  });

  test('minimum valid items: 50%, 75%, and all', () => {
    const headers = ['Sat1', 'Sat2', 'Sat3', 'Stay'];
    const rows = [[5, '', '', 5]];
    const spec50 = {
      xDimension: { columns: ['Sat1', 'Sat2', 'Sat3'], threshold: 4 },
      yDimension: { columns: ['Stay'], threshold: 4 },
      minimumValidItems: 0.5
    };
    expect(Seg.analyze(headers, rows, spec50).analyzable).toBe(false);

    const rows2 = [[5, 4, '', 5]];
    expect(Seg.analyze(headers, rows2, spec50).analyzable).toBe(true);

    const spec75 = Object.assign({}, spec50, { minimumValidItems: 0.75 });
    expect(Seg.analyze(headers, rows2, spec75).analyzable).toBe(false);
    expect(Seg.analyze(headers, [[5, 4, 4, 5]], spec75).analyzable).toBe(true);

    const specAll = Object.assign({}, spec50, { minimumValidItems: 1 });
    expect(Seg.analyze(headers, rows2, specAll).analyzable).toBe(false);
    expect(Seg.analyze(headers, [[5, 4, 3, 5]], specAll).analyzable).toBe(true);
  });

  test('does not replace missing values with zero', () => {
    const s = Seg.compositeScore([4, '', 2], 0.5);
    expect(s.score).toBe(3);
    expect(s.validCount).toBe(2);
  });

  test('empty segment displays as 0.0% rather than an error', () => {
    const r = analyze([row(5, 5), row(5, 5), row(5, 2)]);
    expect(r.analyzable).toBe(true);
    expect(r.overall.segments.lowXLowY.n).toBe(0);
    expect(r.overall.segments.lowXLowY.pct).toBe(0);
    expect(r.overall.segments.lowXHighY.pct).toBe(0);
    expect(r.warnings.some((w) => /empty segment/i.test(w))).toBe(true);
  });

  test('unweighted percentages use respondent counts', () => {
    const r = analyze([row(5, 5), row(5, 5), row(5, 2), row(2, 2)]);
    expect(r.overall.segments.highXHighY.pct).toBe(50);
    expect(r.overall.segments.highXLowY.pct).toBe(25);
    expect(r.overall.segments.lowXLowY.pct).toBe(25);
  });

  test('weighted percentages use sum of weights', () => {
    const r = analyze([
      row(5, 5, 'A', '2026', 3),
      row(2, 2, 'A', '2026', 1)
    ], { weightColumn: 'Weight' });
    expect(r.weighted).toBe(true);
    expect(r.overall.segments.highXHighY.pct).toBe(75);
    expect(r.overall.segments.lowXLowY.pct).toBe(25);
    expect(r.overall.segments.highXHighY.n).toBe(1);
    expect(r.overall.segments.highXHighY.weightedN).toBe(3);
  });

  test('percentages sum to 100 allowing only rounding differences', () => {
    const rows = [];
    for (let i = 0; i < 3; i++) rows.push(row(5, 5));
    for (let i = 0; i < 3; i++) rows.push(row(5, 2));
    for (let i = 0; i < 3; i++) rows.push(row(2, 5));
    rows.push(row(2, 2));
    const r = analyze(rows);
    const sum = Seg.SEGMENT_KEYS.reduce((s, k) => s + r.overall.segments[k].pct, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  test('roundToHundred uses largest remainder so 1-decimal values sum to 100', () => {
    const rounded = Seg.roundToHundred({ a: 1, b: 1, c: 1 }, 1);
    expect(rounded.a + rounded.b + rounded.c).toBeCloseTo(100, 6);
  });

  test('group aggregation', () => {
    const r = analyze([
      row(5, 5, 'Corporate'),
      row(5, 5, 'Corporate'),
      row(2, 2, 'Sales'),
      row(5, 2, 'Sales')
    ], { groupColumn: 'Group' });
    expect(r.groups).toHaveLength(2);
    const corp = r.groups.find((g) => g.name === 'Corporate');
    const sales = r.groups.find((g) => g.name === 'Sales');
    expect(corp.segments.highXHighY.pct).toBe(100);
    expect(sales.segments.lowXLowY.pct).toBe(50);
    expect(sales.segments.highXLowY.pct).toBe(50);
  });

  test('current versus previous percentage-point change', () => {
    const r = analyze([
      row(5, 5, 'A', '2026'),
      row(5, 5, 'A', '2026'),
      row(5, 5, 'A', '2025'),
      row(2, 2, 'A', '2025')
    ], {
      waveColumn: 'Wave',
      currentWave: '2026',
      previousWave: '2025'
    });
    expect(r.waves.enabled).toBe(true);
    expect(r.overall.segments.highXHighY.pct).toBe(100);
    expect(r.overall.segments.highXHighY.prevPct).toBe(50);
    expect(r.overall.segments.highXHighY.ppChange).toBe(50);
  });

  test('group present in only one wave is flagged and not treated as zero', () => {
    const r = analyze([
      row(5, 5, 'Field', '2026'),
      row(5, 5, 'Corporate', '2026'),
      row(5, 5, 'Corporate', '2025'),
      row(2, 2, 'Legacy', '2025')
    ], {
      groupColumn: 'Group',
      waveColumn: 'Wave',
      currentWave: '2026',
      previousWave: '2025'
    });
    const field = r.groups.find((g) => g.name === 'Field');
    const legacy = r.groups.find((g) => g.name === 'Legacy');
    expect(field.comparability).toBe('new');
    expect(legacy.comparability).toBe('missingCurrent');
    expect(legacy.n).toBe(0);
    expect(legacy.segments.lowXLowY.prevPct).toBe(100);
    expect(legacy.segments.lowXLowY.pct).toBe(0);
  });

  test('invalid or zero weights', () => {
    const zero = analyze([
      row(5, 5, 'A', '2026', 0),
      row(2, 2, 'A', '2026', 0)
    ], { weightColumn: 'Weight' });
    expect(zero.analyzable).toBe(false);

    const mixed = analyze([
      row(5, 5, 'A', '2026', 2),
      row(2, 2, 'A', '2026', -1),
      row(5, 2, 'A', '2026', 'x')
    ], { weightColumn: 'Weight' });
    expect(mixed.analyzable).toBe(true);
    expect(mixed.overall.n).toBe(1);
    expect(mixed.warnings.some((w) => /weight/i.test(w))).toBe(true);
  });

  test('editable labels do not change classification', () => {
    const r = analyze([row(5, 5), row(2, 2)]);
    const relabeled = Seg.relabel(r, {
      highXHighY: { label: 'Champions', color: '#123456' }
    });
    expect(relabeled.overall.segments.highXHighY.n).toBe(r.overall.segments.highXHighY.n);
    expect(relabeled.overall.segments.highXHighY.pct).toBe(r.overall.segments.highXHighY.pct);
    expect(relabeled.overall.segments.highXHighY.label).toBe('Champions');
    expect(relabeled.overall.segments.highXHighY.color).toBe('#123456');
    expect(r.overall.segments.highXHighY.label).toBe('Truly Loyal');
  });

  test('filtering updates calculations consistently', () => {
    const rows = [
      row(5, 5, 'Corporate'),
      row(5, 5, 'Corporate'),
      row(2, 2, 'Sales')
    ];
    const all = analyze(rows, { groupColumn: 'Group' });
    const filtered = analyze(rows, {
      groupColumn: 'Group',
      filters: { Group: ['Corporate'] }
    });
    expect(all.totals.nValid).toBe(3);
    expect(filtered.totals.nValid).toBe(2);
    expect(filtered.overall.segments.highXHighY.pct).toBe(100);
    expect(filtered.filtersActive[0]).toMatch(/Corporate/);
  });

  test('same current and previous wave disables change comparison', () => {
    const r = analyze([row(5, 5, 'A', '2026')], {
      waveColumn: 'Wave',
      currentWave: '2026',
      previousWave: '2026'
    });
    expect(r.waves.enabled).toBe(false);
    expect(r.warnings.some((w) => /same value/i.test(w))).toBe(true);
  });

  test('duplicate respondent IDs warn but do not drop rows', () => {
    const r = analyze([
      row(5, 5, 'A', '2026', 1, 'E1'),
      row(2, 2, 'A', '2026', 1, 'E1')
    ], { respondentIdColumn: 'ID' });
    expect(r.totals.nValid).toBe(2);
    expect(r.warnings.some((w) => /Duplicate respondent IDs/i.test(w))).toBe(true);
  });
});

const Split = require('./segmentation-split-index.js');

function splitRows() {
  const headers = ['ID', 'Sat', 'Stay', 'Career', 'Pay', 'Noise', 'Weight'];
  const rows = [];
  [5, 5, 4, 4, 5].forEach((c, i) => rows.push(['S' + i, 5, 5, c, 4, 3, 2]));
  [3, 3, 2, 2, 3].forEach((c, i) => rows.push(['L' + i, 2, 2, c, 4, 3, 1]));
  const spec = {
    xDimension: { columns: ['Sat'], threshold: 4 },
    yDimension: { columns: ['Stay'], threshold: 4 },
    factorColumns: ['Career', 'Pay', 'Noise']
  };
  return { headers, rows, spec };
}

describe('Split Index (Drivers)', () => {
  const base = splitRows();

  test('raw Split Index equals the absolute difference between group means', () => {
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, { mode: 'stay' });
    const career = r.factors.find((f) => f.factorId === 'Career');
    expect(career.group1.mean).toBeCloseTo(4.6, 8);
    expect(career.group2.mean).toBeCloseTo(2.6, 8);
    expect(career.rawSplitIndex).toBeCloseTo(2.0, 8);
    expect(career.rawSplitIndex).toBeCloseTo(Math.abs(career.group1.mean - career.group2.mean), 12);
  });

  test('signed difference retains the correct direction', () => {
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, { mode: 'stay' });
    const career = r.factors.find((f) => f.factorId === 'Career');
    expect(career.signedDifference).toBeCloseTo(2.0, 8);
    expect(career.signedDifference).toBeGreaterThan(0);
  });

  test('standardized Split Index uses the pooled standard deviation', () => {
    const g1 = [5, 5, 4, 4, 5];
    const g2 = [3, 3, 2, 2, 3];
    const s1 = Split.calculateGroupStatistics(g1);
    const s2 = Split.calculateGroupStatistics(g2);
    const std = Split.calculateStandardizedSplitIndex(s1.mean, s2.mean, s1.sd, s2.sd, 5, 5);
    const pooled = Math.sqrt(((4 * s1.sd * s1.sd) + (4 * s2.sd * s2.sd)) / 8);
    expect(std).toBeCloseTo(Math.abs(s1.mean - s2.mean) / pooled, 10);
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, { mode: 'stay', indexType: 'standardized' });
    expect(r.factors.find((f) => f.factorId === 'Career').standardizedSplitIndex).toBeCloseTo(std, 8);
  });

  test('equal group means produce a Split Index of zero', () => {
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, { mode: 'stay' });
    const pay = r.factors.find((f) => f.factorId === 'Pay');
    expect(pay.rawSplitIndex).toBe(0);
    expect(pay.signedDifference).toBe(0);
  });

  test('zero pooled variance does not cause division by zero', () => {
    expect(Split.calculateStandardizedSplitIndex(4, 4, 0, 0, 5, 5)).toBeNull();
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, { mode: 'stay' });
    const noise = r.factors.find((f) => f.factorId === 'Noise');
    expect(noise.rawSplitIndex).toBe(0);
    expect(noise.standardizedSplitIndex).toBeNull();
  });

  test('missing observations produce factor-specific bases', () => {
    const headers = ['Sat', 'Stay', 'A', 'B'];
    const rows = [
      [5, 5, 5, 5],
      [5, 5, '', 4],
      [2, 2, 2, 2],
      [2, 2, 3, '']
    ];
    const spec = { xDimension: { columns: ['Sat'], threshold: 4 }, yDimension: { columns: ['Stay'], threshold: 4 }, factorColumns: ['A', 'B'] };
    const r = Split.analyzeSplitIndex(headers, rows, spec, { mode: 'stay', missing: 'available' });
    expect(r.factors.find((f) => f.factorId === 'A').group1.validN).toBe(1);
    expect(r.factors.find((f) => f.factorId === 'B').group1.validN).toBe(2);
  });

  test('complete-case and available-case options produce the expected samples', () => {
    const headers = ['Sat', 'Stay', 'A', 'B'];
    const rows = [
      [5, 5, 5, 5],
      [5, 5, '', 4],
      [2, 2, 2, 2],
      [2, 2, 3, 3]
    ];
    const spec = { xDimension: { columns: ['Sat'], threshold: 4 }, yDimension: { columns: ['Stay'], threshold: 4 }, factorColumns: ['A', 'B'] };
    const avail = Split.analyzeSplitIndex(headers, rows, spec, { mode: 'stay', missing: 'available' });
    const complete = Split.analyzeSplitIndex(headers, rows, spec, { mode: 'stay', missing: 'complete' });
    expect(avail.factors.find((f) => f.factorId === 'B').group1.validN).toBe(2);
    expect(complete.factors.find((f) => f.factorId === 'B').group1.validN).toBe(1);
  });

  test('weighted means are calculated correctly', () => {
    const stats = Split.calculateGroupStatistics([1, 5], [1, 3]);
    expect(stats.mean).toBeCloseTo(4, 8);
    expect(stats.validN).toBe(2);
    expect(stats.weightedN).toBe(4);
    const spec = Object.assign({}, base.spec, { weightColumn: 'Weight' });
    const r = Split.analyzeSplitIndex(base.headers, base.rows, spec, { mode: 'stay' });
    expect(r.weighted).toBe(true);
    expect(r.group1.n).toBe(5);
  });

  test('segment-pair comparisons use mutually exclusive respondents', () => {
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, {
      mode: 'segments',
      group1Key: 'highXHighY',
      group2Key: 'lowXLowY'
    });
    expect(r.exclusive).toBe(true);
    expect(r.group1.n + r.group2.n).toBe(10);
  });

  test('threshold changes update stay/leave membership', () => {
    const low = Split.analyzeSplitIndex(base.headers, base.rows, {
      ...base.spec,
      yDimension: { columns: ['Stay'], threshold: 4 }
    }, { mode: 'stay' });
    const high = Split.analyzeSplitIndex(base.headers, base.rows, {
      ...base.spec,
      yDimension: { columns: ['Stay'], threshold: 6 }
    }, { mode: 'stay' });
    expect(low.group1.n).toBe(5);
    expect(high.group1.n).toBe(0);
  });

  test('editable segment labels do not change calculations', () => {
    const a = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, {
      mode: 'segments', group1Key: 'highXHighY', group2Key: 'lowXLowY'
    });
    const b = Split.analyzeSplitIndex(base.headers, base.rows, Object.assign({}, base.spec, {
      segments: { highXHighY: { label: 'Champions' }, lowXLowY: { label: 'Risk' } }
    }), { mode: 'segments', group1Key: 'highXHighY', group2Key: 'lowXLowY' });
    const ca = a.factors.find((f) => f.factorId === 'Career');
    const cb = b.factors.find((f) => f.factorId === 'Career');
    expect(cb.rawSplitIndex).toBeCloseTo(ca.rawSplitIndex, 12);
    expect(b.group1.label).toBe('Champions');
  });

  test('questionnaire order is preserved when selected', () => {
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, { mode: 'stay', sortBy: 'order' });
    expect(r.factors.map((f) => f.factorId)).toEqual(['Career', 'Pay', 'Noise']);
  });

  test('descending Split Index sorting works', () => {
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, { mode: 'stay', sortBy: 'splitDesc' });
    expect(r.factors[0].factorId).toBe('Career');
    expect(r.factors[0].rawSplitIndex).toBeGreaterThanOrEqual(r.factors[1].rawSplitIndex);
  });

  test('Top 5 and Top 10 filters return the correct factors', () => {
    const spec = Object.assign({}, base.spec, { factorColumns: ['Career', 'Pay', 'Noise', 'Sat', 'Stay'] });
    const top = Split.analyzeSplitIndex(base.headers, base.rows, spec, { mode: 'stay', topN: 2 });
    expect(top.factors).toHaveLength(2);
    expect(top.allFactors.length).toBeGreaterThan(2);
  });

  test('Welch test and confidence interval match a trusted reference calculation', () => {
    const s1 = Split.calculateGroupStatistics([5, 5, 4, 4, 5]);
    const s2 = Split.calculateGroupStatistics([3, 3, 2, 2, 3]);
    const w = Split.calculateWelchTest(s1.mean, s2.mean, s1.sd, s2.sd, 5, 5);
    const se = Math.sqrt(s1.sd * s1.sd / 5 + s2.sd * s2.sd / 5);
    expect(w.se).toBeCloseTo(se, 12);
    expect(w.statistic).toBeCloseTo((s1.mean - s2.mean) / se, 10);
    expect(w.pValue).toBeLessThan(0.01);
    const ci = Split.calculateDifferenceCI(s1.mean, s2.mean, w.se, w.degreesOfFreedom, 0.05);
    expect(ci.lower).toBeLessThan(2);
    expect(ci.upper).toBeGreaterThan(2);
  });

  test('FDR, Holm and Bonferroni adjustments work correctly', () => {
    const p = [0.01, 0.04, 0.03];
    const none = Split.adjustPValues(p, 'none');
    expect(none).toEqual([0.01, 0.04, 0.03]);
    const bonf = Split.adjustPValues(p, 'bonferroni');
    expect(bonf[0]).toBeCloseTo(0.03, 10);
    expect(bonf[1]).toBeCloseTo(0.12, 10);
    const holm = Split.adjustPValues(p, 'holm');
    expect(holm[0]).toBeCloseTo(0.03, 10);
    expect(holm[1]).toBeCloseTo(0.06, 10);
    const bh = Split.adjustPValues(p, 'bh');
    expect(bh[0]).toBeCloseTo(0.03, 10);
    expect(bh[1]).toBeCloseTo(0.04, 10);
    expect(bh[2]).toBeCloseTo(0.04, 10);
  });

  test('Drivers respects demographic filters', () => {
    const headers = ['Sat', 'Stay', 'Career', 'Group'];
    const rows = [
      [5, 5, 5, 'A'], [5, 5, 5, 'A'], [2, 2, 2, 'A'],
      [5, 5, 1, 'B'], [2, 2, 5, 'B']
    ];
    const spec = { xDimension: { columns: ['Sat'], threshold: 4 }, yDimension: { columns: ['Stay'], threshold: 4 }, factorColumns: ['Career'] };
    const all = Split.analyzeSplitIndex(headers, rows, spec, { mode: 'stay' });
    const filtered = Split.analyzeSplitIndex(headers, rows, Object.assign({}, spec, { filters: { Group: ['A'] } }), { mode: 'stay' });
    expect(filtered.group1.n + filtered.group2.n).toBeLessThan(all.group1.n + all.group2.n);
    expect(filtered.group1.n + filtered.group2.n).toBe(3);
  });

  test('exported results contain both raw and standardized indices', () => {
    const r = Split.analyzeSplitIndex(base.headers, base.rows, base.spec, { mode: 'stay' });
    const table = Split.buildSplitIndexExportTable(r);
    expect(table[0].RawSplitIndex).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(table[0], 'StandardizedSplitIndex')).toBe(true);
    expect(table[0].Group1ValidN).toBeGreaterThan(0);
  });

  test('long factor labels remain in the exported table', () => {
    const headers = ['Sat', 'Stay', 'Career development opportunities and advancement'];
    const rows = [
      [5, 5, 5], [5, 5, 4], [2, 2, 2], [2, 2, 3]
    ];
    const spec = {
      xDimension: { columns: ['Sat'], threshold: 4 },
      yDimension: { columns: ['Stay'], threshold: 4 },
      factorColumns: ['Career development opportunities and advancement']
    };
    const r = Split.analyzeSplitIndex(headers, rows, spec, { mode: 'stay' });
    const table = Split.buildSplitIndexExportTable(r);
    expect(table[0].Factor).toBe('Career development opportunities and advancement');
    expect(r.factors[0].factorLabel).toBe('Career development opportunities and advancement');
  });
});
