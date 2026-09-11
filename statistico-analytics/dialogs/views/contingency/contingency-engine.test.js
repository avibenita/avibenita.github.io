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
