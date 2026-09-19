/** @jest-environment node */
const RSI = require('./regression-similarity.js');

function group(name, r, n) {
  return { group: name, n: n == null ? r.length : n, r: r.slice() };
}

const BASE = [10.8, 23.6, -2.1, 0.75];

describe('Regression Similarity Index', () => {
  test('identical β-vectors score at or near 100 on every component', () => {
    const a = group('high', BASE);
    const b = group('low', BASE.slice());
    const row = RSI.comparePair(a, b);
    expect(row.pattern).toBe(100);
    expect(row.strength).toBe(100);
    expect(row.sign).toBe(100);
    expect(row.overall).toBe(100);
    expect(row.band).toBe('Very similar');
    expect(row.usable).toBe(true);
  });

  test('a single overlapping coefficient is usable', () => {
    const a = group('A', [4.2, NaN]);
    const b = group('B', [4.1, NaN]);
    const row = RSI.comparePair(a, b);
    expect(row.usable).toBe(true);
    expect(row.pairCount).toBe(1);
    expect(row.sign).toBe(100);
  });

  test('pattern score is 100 * (1 + cosine) / 2', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(RSI.patternScore(a, b)).toBeCloseTo(50, 8);
    expect(RSI.patternScore(a, a)).toBeCloseTo(100, 8);
    expect(RSI.patternScore(a, [-1, 0, 0])).toBeCloseTo(0, 8);
  });

  test('negated coefficients keep strength, drop pattern and sign', () => {
    const a = group('A', BASE);
    const b = group('B', BASE.map((v) => -v));
    const row = RSI.comparePair(a, b);
    expect(row.strength).toBe(100);
    expect(row.pattern).toBe(0);
    expect(row.sign).toBe(0);
    expect(row.overall).toBeCloseTo(4.6, 5);
    expect(row.band).toBe('Substantially different');
  });

  test('strength score is symmetric in the mean-|β| ratio', () => {
    const a = group('A', BASE);
    const strong = group('Strong', BASE.map((v) => v * 2));
    const weak = group('Weak', BASE.map((v) => v * 0.5));
    const up = RSI.strengthScore(a.r, strong.r);
    const down = RSI.strengthScore(a.r, weak.r);
    expect(up).toBeCloseTo(down, 6);
    expect(up).toBeLessThan(100);
    expect(up).toBeGreaterThan(40);
  });

  test('sign score treats |β| < 1e-8 as the same weak band', () => {
    expect(RSI.signScore([1e-9, 6], [2e-9, 7])).toBe(100);
    expect(RSI.signScore([0.6, -0.6], [0.5, 0.5])).toBe(50);
  });

  test('overall is the geometric mean of the three components', () => {
    expect(RSI.overallScore(8, 27, 64)).toBeCloseTo(24, 8);
    expect(RSI.overallScore(90, 80, 70)).toBeCloseTo(Math.pow(90 * 80 * 70, 1 / 3), 8);
  });

  test('descriptive bands match the spec cut points', () => {
    expect(RSI.bandFor(90).label).toBe('Very similar');
    expect(RSI.bandFor(89.9).label).toBe('Mostly similar');
    expect(RSI.bandFor(75).label).toBe('Mostly similar');
    expect(RSI.bandFor(74.9).label).toBe('Mixed similarity');
    expect(RSI.bandFor(50).label).toBe('Mixed similarity');
    expect(RSI.bandFor(49.9).label).toBe('Substantially different');
    expect(RSI.bandFor(null).label).toBe('Not enough data');
  });

  test('alignedPairs drops indices that are missing in either group', () => {
    const aligned = RSI.alignedPairs(
      group('A', [10.8, NaN, 2.2, 0.1]),
      group('B', [10.3, 0.9, NaN, 0.05])
    );
    expect(aligned.n).toBe(2);
    expect(aligned.a).toEqual([10.8, 0.1]);
    expect(aligned.b).toEqual([10.3, 0.05]);
    expect(aligned.index).toEqual([0, 3]);
  });

  test('same-band pairs are not ranked as most similar vs most distinct', () => {
    const g0 = group('high', BASE, 61);
    const g1 = group('low', BASE.map((v) => v * 0.97), 59);
    const profile = RSI.buildProfile([g0, g1]);
    expect(profile.usablePairCount).toBe(1);
    expect(profile.rangeContrast).toBe(false);
    expect(profile.mostDistinct).toBeNull();
    expect(profile.mostDifferentGroup).toBeNull();
    expect(profile.mostSimilar.bandKey).toBe('very');
  });

  test('buildProfile names extremes only when ranges differ', () => {
    const g0 = group('high', BASE, 61);
    const g1 = group('low', BASE.map((v) => v * 0.95), 59);
    const gOther = group('other', [1.2, -8.5, 4.0, -12.2], 40);
    const profile = RSI.buildProfile([g0, g1, gOther]);
    expect(profile.usablePairCount).toBe(3);
    expect(profile.mostSimilar.a).toBe('high');
    expect(profile.mostSimilar.b).toBe('low');
    expect(profile.mostSimilar.bandKey).toBe('very');
    expect(profile.rangeContrast).toBe(true);
    expect(RSI.bandRank(profile.mostDistinct.bandKey)).toBeLessThan(RSI.bandRank(profile.mostSimilar.bandKey));
    expect(profile.homogeneity).toBeGreaterThan(0);
    expect(profile.mostDifferentGroup.group).toBe('other');
  });
});
