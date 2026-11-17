/** @jest-environment node */
const Intervals = require('./capability-intervals.js');
const Engine = require('./capability-range-engine.js');

describe('capability sampling intervals', () => {
  function diameter() {
    const pp = (20 - 10) / (6 * 2.484);
    const cpu = (20 - 15.008) / (3 * 2.484);
    const cpl = (15.008 - 10) / (3 * 2.484);
    const ppk = Math.min(cpu, cpl);
    return { pp: pp, ppk: ppk, n: 39 };
  }

  test('matches the diameter fixture at full precision', () => {
    const sample = diameter();
    expect(sample.ppk).toBeCloseTo(0.669887, 5);
    expect(sample.pp).toBeCloseTo(0.670961, 5);
    const ppk = Intervals.ppkInterval(sample.ppk, sample.n);
    const pp = Intervals.ppInterval(sample.pp, sample.n);
    expect(ppk.available).toBe(true);
    expect(ppk.low).toBeCloseTo(0.486512, 5);
    expect(ppk.high).toBeCloseTo(0.853263, 5);
    expect(ppk.oneSidedLow).toBeCloseTo(0.515994, 5);
    expect(pp.low).toBeCloseTo(0.520618, 5);
    expect(pp.high).toBeCloseTo(0.821002, 5);
    expect(Intervals.formatPair(ppk.low, ppk.high, 1, 'below')).toBe('0.49\u20130.85');
    expect(Intervals.formatPair(pp.low, pp.high, 1, null)).toBe('0.52\u20130.82');
  });

  test('compares the two-sided interval with the benchmark at full precision', () => {
    const ppk = Intervals.ppkInterval(diameter().ppk, 39);
    expect(Intervals.twoSidedVerdict(ppk.low, ppk.high, 1)).toBe('below');
    expect(Intervals.twoSidedVerdict(ppk.low, ppk.high, 0.7)).toBe('inconclusive');
    expect(Intervals.twoSidedVerdict(ppk.low, ppk.high, 0.48)).toBe('supports');
    expect(Intervals.oneSidedSupports(ppk.oneSidedLow, 0.5)).toBe(true);
    expect(Intervals.twoSidedVerdict(ppk.low, ppk.high, 0.5)).toBe('inconclusive');
    expect(Intervals.twoSidedVerdict(ppk.low, ppk.high, ppk.low)).toBe('supports');
    expect(Intervals.twoSidedVerdict(ppk.low, ppk.high, ppk.high)).toBe('inconclusive');
    expect(Intervals.formatPair(ppk.low, ppk.high, 0.49, 'inconclusive')).not.toBe('0.49\u20130.85');
  });

  test('withholds the Ppk approximation below 25 observations and keeps Pp', () => {
    expect(Intervals.ppkInterval(0.8, 24).available).toBe(false);
    expect(Intervals.ppkInterval(0.8, 24).message).toMatch(/fewer than 25/);
    expect(Intervals.ppkInterval(0.8, 25).available).toBe(true);
    expect(Intervals.ppInterval(0.8, 24).available).toBe(true);
    expect(Intervals.ppInterval(0.8, 2).available).toBe(true);
    expect(Intervals.ppInterval(0.8, 1).available).toBe(false);
    expect(Intervals.twoSidedVerdict(0.4, 0.9, 0)).toBeNull();
    expect(Intervals.twoSidedVerdict(0.4, 0.9, -1)).toBeNull();
    const negative = Intervals.ppkInterval(-0.2, 30);
    expect(negative.low).toBeLessThan(0);
  });

  test('the demo diameter sample is the n used for the mean and sample SD', () => {
    const demo = Engine.analyze(Engine.demoTable(), Object.assign({ value: 'Diameter' }, Engine.demoSpec()));
    expect(demo.ok).toBe(true);
    expect(demo.overall.n).toBe(39);
    expect(demo.overall.sdKind).toBe('sample');
    expect(Number(demo.overall.mean.toFixed(3))).toBe(15.008);
    expect(Number(demo.overall.sd.toFixed(3))).toBe(2.484);
    const ppk = Intervals.ppkInterval(demo.overall.cpk, demo.overall.n);
    const pp = Intervals.ppInterval(demo.overall.cp, demo.overall.n);
    expect(Intervals.formatPair(ppk.low, ppk.high, 1, Intervals.twoSidedVerdict(ppk.low, ppk.high, 1))).toBe('0.49\u20130.85');
    expect(Intervals.formatPair(pp.low, pp.high, 1, null)).toBe('0.52\u20130.82');
  });
});
