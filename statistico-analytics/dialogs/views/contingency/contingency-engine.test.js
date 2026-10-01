/** @jest-environment node */
const CT = require('./contingency-engine.js');

function expand(rows, freqIndex) {
  const out = [];
  rows.forEach((row) => {
    const n = row[freqIndex];
    for (let i = 0; i < n; i++) out.push([row[0], row[1]]);
  });
  return out;
}

function educationPreference() {
  return {
    headers: ['Education', 'Preference', 'Frequency'],
    rows: [
      ['College', 'Option A', 20],
      ['College', 'Option B', 31],
      ['High school', 'Option A', 14],
      ['High school', 'Option B', 18]
    ]
  };
}

describe('Contingency frequency/count column', () => {
  test('A. no frequency column treats each row as one observation', () => {
    const headers = ['Treatment', 'Response'];
    const rows = [
      ['Drug', 'Improved'], ['Drug', 'Improved'], ['Drug', 'Improved'],
      ['Drug', 'No change'],
      ['Placebo', 'Improved'],
      ['Placebo', 'No change'], ['Placebo', 'No change']
    ];
    const r = CT.analyze(headers, rows, { rowVar: 'Treatment', colVar: 'Response' });
    expect(r.analyzable).toBe(true);
    expect(r.frequencyColumn).toBe(null);
    expect(r.frequencyWeightingApplied).toBe(false);
    expect(r.weightType).toBe(null);
    expect(r.inputRowCount).toBe(7);
    expect(r.representedN).toBe(7);
    expect(r.N).toBe(7);
    expect(r.observed).toEqual([
      [3, 1],
      [1, 2]
    ]);
    expect(Number.isInteger(r.N)).toBe(true);
    expect(r.observed.flat().every((n) => Number.isInteger(n))).toBe(true);
  });

  test('B. valid frequency input matches the expanded row-level analysis', () => {
    const { headers, rows } = educationPreference();
    const freq = CT.analyze(headers, rows, {
      rowVar: 'Education',
      colVar: 'Preference',
      frequencyColumn: 'Frequency'
    });
    const expanded = CT.analyze(headers.slice(0, 2), expand(rows, 2), {
      rowVar: 'Education',
      colVar: 'Preference'
    });
    expect(freq.analyzable).toBe(true);
    expect(freq.frequencyColumn).toBe('Frequency');
    expect(freq.frequencyWeightingApplied).toBe(true);
    expect(freq.weightType).toBe('frequency');
    expect(freq.inputRowCount).toBe(4);
    expect(freq.representedN).toBe(83);
    expect(freq.N).toBe(83);
    expect(freq.observed).toEqual(expanded.observed);
    expect(freq.tests.pearson.stat).toBeCloseTo(expanded.tests.pearson.stat, 10);
    expect(freq.tests.pearson.p).toBeCloseTo(expanded.tests.pearson.p, 12);
    expect(freq.tests.likelihoodRatio.stat).toBeCloseTo(expanded.tests.likelihoodRatio.stat, 10);
    expect(freq.tests.cramersV).toBeCloseTo(expanded.tests.cramersV, 12);
    expect(freq.frequencyNote).toMatch(/Frequency counts were applied/);
    expect(freq.observed.flat().every((n) => Number.isInteger(n))).toBe(true);
  });

  test('B. accepts legacy weightVar / freqVar aliases', () => {
    const { headers, rows } = educationPreference();
    const a = CT.analyze(headers, rows, { rowVar: 'Education', colVar: 'Preference', weightVar: 'Frequency' });
    const b = CT.analyze(headers, rows, { rowVar: 'Education', colVar: 'Preference', freqVar: 'Frequency' });
    expect(a.representedN).toBe(83);
    expect(b.representedN).toBe(83);
    expect(a.frequencyColumn).toBe('Frequency');
  });

  test('C. continuous Performance is blocked and produces no inferential statistics', () => {
    const headers = ['Group', 'Choice', 'Performance'];
    const rows = [
      ['A', 'Yes', 72.4],
      ['A', 'No', 81.1],
      ['B', 'Yes', 65.0],
      ['B', 'No', 90.2]
    ];
    const r = CT.analyze(headers, rows, {
      rowVar: 'Group',
      colVar: 'Choice',
      frequencyColumn: 'Performance'
    });
    expect(r.analyzable).toBe(false);
    expect(r.error).toMatch(/“Performance” cannot be used as a frequency\/count column because it contains non-integer values/);
    expect(r.error).toMatch(/Excel row 2/);
    expect(r.error).toMatch(/72\.4/);
    expect(r.tests).toBeUndefined();
    expect(r.observed).toBeUndefined();
    expect(r.N).toBeUndefined();
    expect(r.tests && r.tests.pearson).toBeFalsy();
  });

  test('D. zero frequency is accepted and contributes nothing', () => {
    const headers = ['Row', 'Col', 'Frequency'];
    const rows = [
      ['A', 'X', 4],
      ['A', 'Y', 0],
      ['B', 'X', 3],
      ['B', 'Y', 5]
    ];
    const r = CT.analyze(headers, rows, {
      rowVar: 'Row',
      colVar: 'Col',
      frequencyColumn: 'Frequency'
    });
    expect(r.analyzable).toBe(true);
    expect(r.inputRowCount).toBe(4);
    expect(r.representedN).toBe(12);
    expect(r.observed[0][1]).toBe(0);
    expect(r.N).toBe(12);
  });

  test('E. negative frequency blocks the analysis', () => {
    const headers = ['Row', 'Col', 'Frequency'];
    const rows = [
      ['A', 'X', 4],
      ['B', 'Y', -2]
    ];
    const r = CT.analyze(headers, rows, {
      rowVar: 'Row',
      colVar: 'Col',
      frequencyColumn: 'Frequency'
    });
    expect(r.analyzable).toBe(false);
    expect(r.error).toMatch(/contains negative values/);
    expect(r.error).toMatch(/Excel row 3/);
    expect(r.error).toMatch(/-2/);
    expect(r.tests).toBeUndefined();
  });

  test('F. missing frequency blocks the analysis and identifies the Excel row', () => {
    const headers = ['Row', 'Col', 'Frequency'];
    const rows = [
      ['A', 'X', 4],
      ['B', 'Y', null]
    ];
    const r = CT.analyze(headers, rows, {
      rowVar: 'Row',
      colVar: 'Col',
      frequencyColumn: 'Frequency'
    });
    expect(r.analyzable).toBe(false);
    expect(r.error).toMatch(/contains missing values/);
    expect(r.error).toMatch(/Excel row 3/);
    expect(r.tests).toBeUndefined();
  });

  test('G. decimal frequency is rejected and not rounded', () => {
    const headers = ['Row', 'Col', 'Frequency'];
    const rows = [
      ['A', 'X', 2],
      ['B', 'Y', 2.5]
    ];
    const r = CT.analyze(headers, rows, {
      rowVar: 'Row',
      colVar: 'Col',
      frequencyColumn: 'Frequency'
    });
    expect(r.analyzable).toBe(false);
    expect(r.error).toMatch(/contains non-integer values/);
    expect(r.error).toMatch(/2\.5/);
    expect(r.representedN).toBe(0);
    expect(r.N).toBeUndefined();
  });

  test('H. totals above the safe integer limit are rejected', () => {
    const headers = ['Row', 'Col', 'Frequency'];
    const rows = [
      ['A', 'X', CT.MAX_REPRESENTED_N],
      ['B', 'Y', 1]
    ];
    const r = CT.analyze(headers, rows, {
      rowVar: 'Row',
      colVar: 'Col',
      frequencyColumn: 'Frequency'
    });
    expect(r.analyzable).toBe(false);
    expect(r.error).toMatch(/exceeds the safe numeric limit/);
    expect(r.tests).toBeUndefined();
  });

  test('H. a single finite but unsafe count is rejected', () => {
    const headers = ['Row', 'Col', 'Frequency'];
    const r = CT.analyze(headers, [['A', 'X', 1e16], ['B', 'Y', 1]], {
      rowVar: 'Row',
      colVar: 'Col',
      frequencyColumn: 'Frequency'
    });
    expect(r.analyzable).toBe(false);
    expect(r.error).toMatch(/exceeds the safe numeric limit|non-integer/);
  });

  test('I. grouped analysis keeps represented and input-row counts per group', () => {
    const headers = ['Education', 'Preference', 'Frequency', 'Site'];
    const rows = [
      ['College', 'Option A', 10, 'North'],
      ['College', 'Option B', 12, 'North'],
      ['High school', 'Option A', 8, 'North'],
      ['High school', 'Option B', 9, 'North'],
      ['College', 'Option A', 10, 'South'],
      ['College', 'Option B', 19, 'South'],
      ['High school', 'Option A', 6, 'South'],
      ['High school', 'Option B', 9, 'South']
    ];
    const spec = { rowVar: 'Education', colVar: 'Preference', frequencyColumn: 'Frequency' };
    const overall = CT.analyze(headers, rows, spec);
    const north = CT.analyze(headers, rows.filter((row) => row[3] === 'North'), spec);
    const south = CT.analyze(headers, rows.filter((row) => row[3] === 'South'), spec);
    expect(overall.inputRowCount).toBe(8);
    expect(overall.representedN).toBe(83);
    expect(north.inputRowCount).toBe(4);
    expect(north.representedN).toBe(39);
    expect(south.inputRowCount).toBe(4);
    expect(south.representedN).toBe(44);
    expect(north.inputRowCount + south.inputRowCount).toBe(overall.inputRowCount);
    expect(north.representedN + south.representedN).toBe(overall.representedN);
    expect(north.tests.cramersV).toBeDefined();
    expect(south.tests.pearson.stat).toBeDefined();
  });

  test('all-zero frequencies are rejected', () => {
    const r = CT.analyze(['R', 'C', 'F'], [['A', 'X', 0], ['B', 'Y', 0]], {
      rowVar: 'R', colVar: 'C', frequencyColumn: 'F'
    });
    expect(r.analyzable).toBe(false);
    expect(r.error).toMatch(/contains only zeros/);
  });

  test('infinite and text frequencies are rejected', () => {
    const inf = CT.analyze(['R', 'C', 'F'], [['A', 'X', Infinity], ['B', 'Y', 1]], {
      rowVar: 'R', colVar: 'C', frequencyColumn: 'F'
    });
    expect(inf.error).toMatch(/contains infinite values/);
    const text = CT.analyze(['R', 'C', 'F'], [['A', 'X', 'n/a'], ['B', 'Y', 1]], {
      rowVar: 'R', colVar: 'C', frequencyColumn: 'F'
    });
    expect(text.error).toMatch(/contains missing values|contains nonnumeric values/);
  });

  test('missing row/column values are applied before frequency checks', () => {
    const r = CT.analyze(
      ['R', 'C', 'F'],
      [[null, 'X', 'bad'], ['A', 'X', 2], ['B', 'Y', 3]],
      { rowVar: 'R', colVar: 'C', frequencyColumn: 'F' }
    );
    expect(r.analyzable).toBe(true);
    expect(r.excludedMissing).toBe(1);
    expect(r.inputRowCount).toBe(2);
    expect(r.representedN).toBe(5);
  });

  test('frequency candidates exclude continuous columns', () => {
    const headers = ['Group', 'Choice', 'Frequency', 'Performance'];
    const rows = [
      ['A', 'Yes', 2, 72.4],
      ['A', 'No', 3, 81],
      ['B', 'Yes', 4, 65.2]
    ];
    const profiles = CT.profileData(headers, rows);
    expect(profiles.find((p) => p.name === 'Frequency').frequencyCandidate).toBe(true);
    expect(profiles.find((p) => p.name === 'Performance').frequencyCandidate).toBe(false);
  });

  test('2×2 headline leads with the percentage-point difference', () => {
    const r = CT.analyzeCounts(
      [[40, 60], [20, 80]],
      ['Group A', 'Group B'],
      ['Event', 'No event'],
      { confidence: 0.95 }
    );
    const summary = CT.summary2x2(r, { design: 'independent' });
    expect(r.measures2x2.riskRatio.value).toBeCloseTo(2, 10);
    expect(r.measures2x2.oddsRatio.value).toBeCloseTo(8 / 3, 10);
    expect(r.measures2x2.riskDifference.value).toBeCloseTo(0.2, 10);
    expect(summary.lead).toBe('40% versus 20% · 20 percentage points higher');
    expect(summary.detail).toBe('Risk ratio 2 · Odds ratio 2.67');
    expect(summary.showRisks).toBe(true);
    const index = r.measures2x2.proportions.index;
    expect(index.method).toBe('wilson');
    expect(index.p).toBeCloseTo(0.4, 10);
    expect(index.ciLower).toBeLessThan(0.4);
    expect(index.ciUpper).toBeGreaterThan(0.4);
    expect(index.ciLower).toBeGreaterThan(0);
    expect(index.ciUpper).toBeLessThan(1);
  });

  test('case-control summary reports the odds ratio and withholds the risk ratio', () => {
    const r = CT.analyzeCounts([[40, 60], [20, 80]], ['Cases', 'Controls'], ['Exposed', 'Unexposed']);
    const summary = CT.summary2x2(r, { design: 'case-control' });
    expect(summary.lead).toBe('Odds ratio 2.67');
    expect(summary.detail).toMatch(/not population risks/);
    expect(summary.detail).toMatch(/risk ratio is not reported/);
    expect(summary.showRisks).toBe(false);
    expect(summary.detail).not.toMatch(/Risk ratio/);
  });

  test('paired 2×2 uses McNemar on the discordant counts', () => {
    const r = CT.analyzeCounts(
      [[30, 12], [4, 54]],
      ['Before: event', 'Before: no event'],
      ['After: event', 'After: no event']
    );
    const mc = CT.mcnemar2x2(12, 4, CT.zCrit(0.95));
    expect(mc.available).toBe(true);
    expect(mc.statistic).toBeCloseTo(4, 10);
    expect(mc.discordant).toBe(16);
    expect(mc.pExact).toBeCloseTo(5034 / 65536, 6);
    expect(mc.preferred).toBe('exact');
    expect(mc.oddsRatio.value).toBeCloseTo(3, 10);
    const summary = CT.summary2x2(r, { design: 'paired' });
    expect(summary.lead).toBe('12 pairs moved from Before: event to After: no event, and 4 moved from Before: no event to After: event.');
    expect(summary.detail).toMatch(/McNemar exact/);
    expect(summary.detail).toMatch(/not used for a paired table/);
    expect(summary.recommendedTest).toBe('mcnemar-exact');
    expect(summary.showRisks).toBe(false);
  });

  test('sparse 2×2 recommends Fisher’s exact test', () => {
    const r = CT.analyzeCounts([[2, 2], [2, 8]], ['A', 'B'], ['Yes', 'No']);
    const summary = CT.summary2x2(r, { design: 'independent' });
    expect(summary.sparse).toBe(true);
    expect(r.tests.fisher.available).toBe(true);
    expect(summary.recommendedTest).toBe('fisher');
  });

  test('Fisher is skipped when a 2×2 margin is huge', () => {
    const r = CT.analyzeCounts([[20000, 20000], [20000, 20000]], ['A', 'B'], ['Yes', 'No']);
    expect(r.analyzable).toBe(true);
    expect(r.tests.pearson.stat).toBeCloseTo(0, 8);
    expect(r.tests.fisher.available).toBe(false);
    expect(r.tests.fisher.reason).toMatch(/10,000/);
  });

  test('weighted 2×2 demo matches the expanded association example', () => {
    const headers = ['Treatment', 'Response', 'Freq'];
    const rows = [
      ['Drug', 'Improved', 30],
      ['Drug', 'No change', 10],
      ['Placebo', 'Improved', 20],
      ['Placebo', 'No change', 40]
    ];
    const freq = CT.analyze(headers, rows, { rowVar: 'Treatment', colVar: 'Response', frequencyColumn: 'Freq' });
    const expanded = CT.analyze(headers.slice(0, 2), expand(rows, 2), { rowVar: 'Treatment', colVar: 'Response' });
    expect(freq.N).toBe(100);
    expect(freq.tests.pearson.stat).toBeCloseTo(expanded.tests.pearson.stat, 10);
    expect(freq.tests.cramersV).toBeCloseTo(0.408, 2);
  });
});

describe('Larger contingency tables', () => {
  test('Stuart–Maxwell on a 2×2 table matches McNemar without continuity correction', () => {
    const table = [[26, 15], [7, 37]];
    const sm = CT.stuartMaxwell(table);
    const mc = CT.mcnemar2x2(15, 7, CT.zCrit(0.95));
    expect(sm.available).toBe(true);
    expect(sm.df).toBe(1);
    expect(sm.statistic).toBeCloseTo(mc.statistic, 8);
    expect(sm.p).toBeCloseTo(mc.p, 8);
  });

  test('equal margins make Stuart–Maxwell zero, and Bowker is a separate symmetry statistic', () => {
    const symmetric = [[10, 2, 1], [2, 12, 3], [1, 3, 14]];
    const sm = CT.stuartMaxwell(symmetric);
    const bowker = CT.bowkerSymmetry(symmetric);
    expect(sm.available).toBe(true);
    expect(sm.statistic).toBeCloseTo(0, 8);
    expect(sm.df).toBe(2);
    expect(bowker.available).toBe(true);
    expect(bowker.statistic).toBeCloseTo(0, 8);
    expect(bowker.df).toBe(3);
    expect(bowker.question).toBe('symmetry');
    expect(sm.question).toBe('marginal homogeneity');
  });

  test('Bowker uses opposite off-diagonal pairs and drops empty pairs from the degrees of freedom', () => {
    const table = [[5, 4, 0], [1, 6, 0], [0, 0, 8]];
    const bowker = CT.bowkerSymmetry(table);
    expect(bowker.df).toBe(1);
    expect(bowker.statistic).toBeCloseTo((4 - 1) * (4 - 1) / 5, 8);
  });

  test('group comparisons contrast each group with the selected reference', () => {
    const observed = [[20, 80], [40, 60], [10, 90]];
    const cmp = CT.binaryGroupComparisons(observed, ['A', 'B', 'C'], ['Event', 'No event'], 0, 0);
    expect(cmp.available).toBe(true);
    expect(cmp.groups).toHaveLength(3);
    expect(cmp.groups[0].reference).toBe(true);
    expect(cmp.groups[0].versusReference).toBeUndefined();
    expect(cmp.groups[1].proportion.p).toBeCloseTo(0.4, 8);
    expect(cmp.groups[1].versusReference.riskDifference.value).toBeCloseTo(0.2, 8);
    expect(cmp.groups[2].versusReference.riskDifference.value).toBeCloseTo(-0.1, 8);
  });

  test('a simulated table keeps the original margins', () => {
    const rowTotals = [8, 7, 5];
    const colTotals = [6, 9, 5];
    const rng = (function () {
      var a = 7;
      return function () {
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();
    const table = CT.randomContingency(rowTotals, colTotals, rng);
    const rowSums = table.map((row) => row.reduce((s, v) => s + v, 0));
    const colSums = colTotals.map((_, j) => table.reduce((s, row) => s + row[j], 0));
    expect(rowSums).toEqual(rowTotals);
    expect(colSums).toEqual(colTotals);
  });

  test('Monte Carlo p-value is small for a strongly associated table and stable for a seed', () => {
    const observed = [[20, 1, 1], [1, 18, 1], [1, 1, 16]];
    const once = CT.monteCarloIndependence(observed, { nSims: 499, seed: 11 });
    const twice = CT.monteCarloIndependence(observed, { nSims: 499, seed: 11 });
    expect(once.available).toBe(true);
    expect(once.p).toBe(twice.p);
    expect(once.p).toBeLessThan(0.02);
  });
});
