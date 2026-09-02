/** @jest-environment node */
const DSP = require('./distribution-similarity.js');

function group(name, values) {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = n > 1
    ? values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n - 1)
    : 0;
  return { group: name, n, mean, stdDev: Math.sqrt(variance), values: values.slice() };
}

function shift(values, d) {
  return values.map((v) => v + d);
}

function scale(values, k) {
  return values.map((v) => v * k);
}

const BASE = [-1.2, -0.4, 0.1, 0.3, 0.6, 1.1, 1.4, 2.0];

describe('Distribution Similarity Profile', () => {
  test('identical groups score at or near 100 on every component', () => {
    const a = group('A', BASE);
    const b = group('B', BASE.slice());
    const row = DSP.comparePair(a, b);
    expect(row.location).toBe(100);
    expect(row.spread).toBe(100);
    expect(row.shape).toBeGreaterThan(99);
    expect(row.overall).toBeGreaterThan(99);
    expect(row.band).toBe('Very similar');
  });

  test('location score is 100 / (1 + Cohen d) for a pure mean shift', () => {
    const a = group('A', BASE);
    const b = group('B', shift(BASE, 2 * a.stdDev));
    const pooled = a.stdDev; // equal n and SD
    const d = Math.abs(a.mean - b.mean) / pooled;
    const expected = 100 / (1 + d);
    const sl = DSP.locationScore(a, b);
    expect(sl).toBeCloseTo(expected, 8);
    expect(DSP.spreadScore(a, b)).toBeCloseTo(100, 8);
  });

  test('spread score is symmetric in the SD ratio', () => {
    const a = group('A', BASE);
    const wide = group('Wide', scale(BASE, 2));
    const narrow = group('Narrow', scale(BASE, 0.5));
    const up = DSP.spreadScore(a, wide);
    const down = DSP.spreadScore(a, narrow);
    expect(up).toBeCloseTo(100 * Math.exp(-Math.log(2)), 8);
    expect(down).toBeCloseTo(up, 8);
  });

  test('overall is the geometric mean of the three components', () => {
    expect(DSP.overallScore(8, 27, 64)).toBeCloseTo(24, 8);
    expect(DSP.overallScore(90, 80, 70)).toBeCloseTo(Math.pow(90 * 80 * 70, 1 / 3), 8);
  });

  test('descriptive bands match the spec cut points', () => {
    expect(DSP.bandFor(90).label).toBe('Very similar');
    expect(DSP.bandFor(89.9).label).toBe('Mostly similar');
    expect(DSP.bandFor(75).label).toBe('Mostly similar');
    expect(DSP.bandFor(74.9).label).toBe('Mixed similarity');
    expect(DSP.bandFor(50).label).toBe('Mixed similarity');
    expect(DSP.bandFor(49.9).label).toBe('Substantially different');
    expect(DSP.bandFor(null).label).toBe('Not enough data');
  });

  test('two constant groups with the same mean are fully similar', () => {
    const a = group('A', [3, 3, 3, 3]);
    const b = group('B', [3, 3, 3, 3]);
    const row = DSP.comparePair(a, b);
    expect(row.location).toBe(100);
    expect(row.spread).toBe(100);
    expect(row.shape).toBeGreaterThan(99);
  });

  test('constant groups with different means have location 0 and spread 100', () => {
    const a = group('A', [1, 1, 1, 1]);
    const b = group('B', [9, 9, 9, 9]);
    const row = DSP.comparePair(a, b);
    expect(row.location).toBe(0);
    expect(row.spread).toBe(100);
  });

  test('shape overlap is high after standardizing a scaled-and-shifted copy', () => {
    const a = group('A', BASE);
    const b = group('B', shift(scale(BASE, 3), 12));
    const sh = DSP.shapeScore(a, b);
    expect(sh).toBeGreaterThan(99);
    expect(DSP.locationScore(a, b)).toBeLessThan(40);
    expect(DSP.spreadScore(a, b)).toBeLessThan(40);
  });

  test('buildProfile reports most similar / distinct pairs and homogeneity', () => {
    const close = group('Close', BASE);
    const twin = group('Twin', BASE.map((v) => v + 0.05));
    const far = group('Far', shift(BASE, 8));
    const profile = DSP.buildProfile([close, twin, far]);
    expect(profile.pairCount).toBe(3);
    expect(profile.mostSimilar.a === 'Close' || profile.mostSimilar.b === 'Close').toBe(true);
    expect(profile.mostSimilar.a === 'Twin' || profile.mostSimilar.b === 'Twin').toBe(true);
    expect(profile.mostDistinct.a === 'Far' || profile.mostDistinct.b === 'Far').toBe(true);
    expect(profile.mostDifferentGroup.group).toBe('Far');
    expect(profile.homogeneity).toBeGreaterThan(0);
    expect(profile.homogeneity).toBeLessThan(profile.mostSimilar.overall);
  });

  test('n < 2 pairs are marked unusable', () => {
    const a = group('A', BASE);
    const b = { group: 'B', n: 1, mean: 4, stdDev: 0, values: [4] };
    const row = DSP.comparePair(a, b);
    expect(row.usable).toBe(false);
    expect(row.overall).toBe(null);
  });
});
