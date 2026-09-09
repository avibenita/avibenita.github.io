/** @jest-environment node */
const CSI = require('./contingency-similarity.js');

function group(name, residuals, v, n) {
  return { group: name, n: n == null ? 40 : n, v: v, residuals: residuals.slice() };
}

const BASE = [2.4, -2.4, -2.4, 2.4];

describe('Contingency Similarity Index', () => {
  test('identical residual patterns and V score at or near 100', () => {
    const a = group('A', BASE, 0.40);
    const b = group('B', BASE.slice(), 0.40);
    const row = CSI.comparePair(a, b);
    expect(row.pattern).toBe(100);
    expect(row.strength).toBe(100);
    expect(row.sign).toBe(100);
    expect(row.overall).toBe(100);
    expect(row.band).toBe('Very similar');
    expect(row.usable).toBe(true);
  });

  test('pattern score is 100 * (1 + cosine) / 2', () => {
    expect(CSI.patternScore([1, 0, 0, 0], [0, 1, 0, 0])).toBeCloseTo(50, 8);
    expect(CSI.patternScore(BASE, BASE)).toBeCloseTo(100, 8);
    expect(CSI.patternScore(BASE, BASE.map((v) => -v))).toBeCloseTo(0, 8);
  });

  test('reversed residuals keep strength, drop pattern and sign', () => {
    const a = group('A', BASE, 0.35);
    const b = group('B', BASE.map((v) => -v), 0.35);
    const row = CSI.comparePair(a, b);
    expect(row.strength).toBe(100);
    expect(row.pattern).toBe(0);
    expect(row.sign).toBe(0);
    expect(row.overall).toBe(0);
    expect(row.band).toBe('Substantially different');
  });

  test('strength score is symmetric in the Cramér’s V ratio', () => {
    const up = CSI.strengthScore(0.20, 0.40);
    const down = CSI.strengthScore(0.40, 0.20);
    expect(up).toBeCloseTo(down, 6);
    expect(up).toBeLessThan(100);
    expect(up).toBeGreaterThan(40);
    expect(CSI.strengthScore(0, 0)).toBe(100);
    expect(CSI.strengthScore(0, 0.4)).toBe(0);
  });

  test('sign score treats |residual| < 1 as the same weak band', () => {
    expect(CSI.signScore([0.4, 2.2, -2.1, 0.2], [0.3, 2.5, -1.8, -0.4])).toBe(100);
    expect(CSI.signScore([2.2, -2.2, -2.2, 2.2], [2.1, 2.1, -2.0, -2.0])).toBe(50);
  });

  test('overall is the geometric mean of the three components', () => {
    expect(CSI.overallScore(8, 27, 64)).toBeCloseTo(24, 8);
  });

  test('descriptive bands match the spec cut points', () => {
    expect(CSI.bandFor(90).label).toBe('Very similar');
    expect(CSI.bandFor(89.9).label).toBe('Mostly similar');
    expect(CSI.bandFor(50).label).toBe('Mixed similarity');
    expect(CSI.bandFor(49.9).label).toBe('Substantially different');
    expect(CSI.bandFor(null).label).toBe('Not enough data');
  });

  test('pairs with fewer than four overlapping finite residuals are not usable', () => {
    const a = group('A', [2, -2, NaN, 1], 0.3);
    const b = group('B', [1.8, NaN, -1, 0.9], 0.3);
    const row = CSI.comparePair(a, b);
    expect(row.usable).toBe(false);
    expect(row.cellCount).toBe(2);
  });

  test('buildProfile reports most similar, most distinct, and homogeneity', () => {
    const g0 = group('North', BASE, 0.42, 44);
    const g1 = group('South', BASE.map((v) => v * 0.9), 0.38, 56);
    const g2 = group('West', BASE.map((v) => -v), 0.41, 48);
    const profile = CSI.buildProfile([g0, g1, g2]);
    expect(profile.usablePairCount).toBe(3);
    expect(profile.mostSimilar.a).toBe('North');
    expect(profile.mostSimilar.b).toBe('South');
    expect(profile.mostSimilar.overall).toBeGreaterThan(90);
    expect(profile.mostDistinct.overall).toBeLessThan(profile.mostSimilar.overall);
    expect(profile.mostDifferentGroup.group).toBe('West');
  });
});
