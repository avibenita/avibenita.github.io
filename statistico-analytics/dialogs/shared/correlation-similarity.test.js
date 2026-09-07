/** @jest-environment node */
const CSI = require('./correlation-similarity.js');

function group(name, r, n) {
  return { group: name, n: n == null ? r.length : n, r: r.slice() };
}

const BASE = [0.62, 0.41, -0.18, 0.55, 0.28, -0.33, 0.71, 0.22];

describe('Correlation Similarity Index', () => {
  test('identical r-vectors score at or near 100 on every component', () => {
    const a = group('A', BASE);
    const b = group('B', BASE.slice());
    const row = CSI.comparePair(a, b);
    expect(row.pattern).toBe(100);
    expect(row.strength).toBe(100);
    expect(row.sign).toBe(100);
    expect(row.overall).toBe(100);
    expect(row.band).toBe('Very similar');
    expect(row.usable).toBe(true);
  });

  test('pattern score is 100 * (1 + cosine) / 2', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(CSI.patternScore(a, b)).toBeCloseTo(50, 8);
    expect(CSI.patternScore(a, a)).toBeCloseTo(100, 8);
    expect(CSI.patternScore(a, [-1, 0, 0])).toBeCloseTo(0, 8);
  });

  test('negated correlations keep strength, drop pattern and sign', () => {
    const a = group('A', BASE);
    const b = group('B', BASE.map((v) => -v));
    const row = CSI.comparePair(a, b);
    expect(row.strength).toBe(100);
    expect(row.pattern).toBe(0);
    expect(row.sign).toBe(0);
    expect(row.overall).toBe(0);
    expect(row.band).toBe('Substantially different');
  });

  test('strength score is symmetric in the mean-|r| ratio', () => {
    const a = group('A', BASE);
    const strong = group('Strong', BASE.map((v) => v * 2));
    const weak = group('Weak', BASE.map((v) => v * 0.5));
    const up = CSI.strengthScore(a.r, strong.r);
    const down = CSI.strengthScore(a.r, weak.r);
    expect(up).toBeCloseTo(down, 6);
    expect(up).toBeLessThan(100);
    expect(up).toBeGreaterThan(40);
  });

  test('sign score treats |r| < 0.10 as the same weak band', () => {
    expect(CSI.signScore([0.04, 0.6], [0.02, 0.7])).toBe(100);
    expect(CSI.signScore([0.6, -0.6], [0.5, 0.5])).toBe(50);
  });

  test('overall is the geometric mean of the three components', () => {
    expect(CSI.overallScore(8, 27, 64)).toBeCloseTo(24, 8);
    expect(CSI.overallScore(90, 80, 70)).toBeCloseTo(Math.pow(90 * 80 * 70, 1 / 3), 8);
  });

  test('descriptive bands match the spec cut points', () => {
    expect(CSI.bandFor(90).label).toBe('Very similar');
    expect(CSI.bandFor(89.9).label).toBe('Mostly similar');
    expect(CSI.bandFor(75).label).toBe('Mostly similar');
    expect(CSI.bandFor(74.9).label).toBe('Mixed similarity');
    expect(CSI.bandFor(50).label).toBe('Mixed similarity');
    expect(CSI.bandFor(49.9).label).toBe('Substantially different');
    expect(CSI.bandFor(null).label).toBe('Not enough data');
  });

  test('pairs with fewer than three overlapping finite r values are not usable', () => {
    const a = group('A', [0.4, 0.2, NaN]);
    const b = group('B', [0.3, NaN, 0.1]);
    const row = CSI.comparePair(a, b);
    expect(row.usable).toBe(false);
    expect(row.pairCount).toBe(1);
  });

  test('alignedPairs drops indices that are missing in either group', () => {
    const aligned = CSI.alignedPairs(
      group('A', [0.4, NaN, 0.2, 0.1]),
      group('B', [0.3, 0.9, NaN, 0.05])
    );
    expect(aligned.n).toBe(2);
    expect(aligned.a).toEqual([0.4, 0.1]);
    expect(aligned.b).toEqual([0.3, 0.05]);
    expect(aligned.index).toEqual([0, 3]);
  });

  test('buildProfile reports most similar, most distinct, and homogeneity', () => {
    const g0 = group('0', BASE, 65);
    const g1 = group('1', BASE.map((v) => v * 0.95), 64);
    const gBlank = group('(blank)', [0.12, -0.55, 0.40, -0.20, 0.31, 0.61, -0.14, 0.33], 70);
    const profile = CSI.buildProfile([g0, g1, gBlank]);
    expect(profile.usablePairCount).toBe(3);
    expect(profile.mostSimilar.a).toBe('0');
    expect(profile.mostSimilar.b).toBe('1');
    expect(profile.mostSimilar.overall).toBeGreaterThan(90);
    expect(profile.mostDistinct.overall).toBeLessThan(profile.mostSimilar.overall);
    expect(profile.homogeneity).toBeGreaterThan(0);
    expect(profile.mostDifferentGroup.group).toBe('(blank)');
  });
});
