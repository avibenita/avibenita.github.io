/** @jest-environment node */
const Planner = require('./capability-planner.js');

const temp = { lsl: 154, usl: 190, mean: 179.832, sd: 14.141, nominal: '' };

function ask(extra) {
  return Planner.solve(Object.assign({
    metric: 'index',
    goal: 1.33,
    mode: 'process',
    adjust: 'both',
    baseline: temp,
    meanMin: '',
    meanMax: '',
    sdMin: '',
    unlockLower: true,
    unlockUpper: true,
    lowerOut: '',
    upperOut: ''
  }, extra));
}

describe('capability planner', () => {
  test('labels overall sample SD as Ppk and Pp', () => {
    expect(Planner.labels('overall').index).toBe('Ppk');
    expect(Planner.labels('overall').spread).toBe('Pp');
    expect(Planner.labels('within').index).toBe('Cpk');
    expect(Planner.labels('overall').basis).toMatch(/n − 1/);
  });

  test('matches the temperature baseline', () => {
    const scored = Planner.metricsOf(temp.lsl, temp.usl, temp.mean, temp.sd, '');
    expect(scored.index).toBeCloseTo(0.240, 3);
    expect(scored.ppm).toBeCloseTo(269926, -1);
  });

  test('mean-only 1.33 is unreachable and peaks at the midpoint', () => {
    const found = ask({ adjust: 'mean' });
    expect(found.ok).toBe(true);
    expect(found.status).toBe('unreachable');
    expect(found.reason).toMatch(/Cannot reach goal with these constraints/);
    expect(found.best.attained).toBe(true);
    expect(found.best.mean).toBeCloseTo(172, 6);
    expect(found.best.index).toBeCloseTo(0.424, 3);
  });

  test('SD-only and mean plus SD match the temperature goal', () => {
    const sdOnly = ask({ adjust: 'sd' });
    expect(sdOnly.status).toBe('reachable');
    expect(sdOnly.candidates[0].sd).toBeCloseTo(2.5484, 4);
    expect(sdOnly.candidates[0].approximate).toBe(true);

    const both = ask({ adjust: 'both' });
    expect(both.status).toBe('reachable');
    expect(both.candidates[0].mean).toBeCloseTo(172, 6);
    expect(both.candidates[0].sd).toBeCloseTo(4.5113, 4);
    expect(both.candidates[0].minimizes).toMatch(/standard deviation/);

    const limited = ask({ adjust: 'both', meanMin: 175 });
    expect(limited.status).toBe('reachable');
    expect(limited.candidates[0].mean).toBeCloseTo(175, 6);
    expect(limited.candidates[0].sd).toBeCloseTo(3.7594, 4);

    const blocked = ask({ adjust: 'both', meanMin: 175, sdMin: 4 });
    expect(blocked.status).toBe('unreachable');
    expect(blocked.reason).toMatch(/Cannot reach goal with these constraints/);
    expect(blocked.best.index).toBeCloseTo(1.25, 3);
  });

  test('specification what-if moves both limits or reports the lock', () => {
    const both = ask({ mode: 'spec', unlockLower: true, unlockUpper: true });
    expect(both.status).toBe('reachable');
    expect(both.candidates[0].title).toMatch(/proposed specifications/);
    expect(both.candidates[0].lsl).toBeCloseTo(123.4094, 4);
    expect(both.candidates[0].usl).toBeCloseTo(236.2546, 4);

    const lockLower = ask({ mode: 'spec', unlockLower: false, unlockUpper: true });
    expect(lockLower.status).toBe('unreachable');
    expect(lockLower.limiting).toBe('lower specification');
    const lockUpper = ask({ mode: 'spec', unlockLower: true, unlockUpper: false });
    expect(lockUpper.status).toBe('unreachable');
    expect(lockUpper.limiting).toBe('upper specification');
  });

  test('solves a normal-model PPM goal and the outside-mean minimum', () => {
    const centered = { lsl: 154, usl: 190, mean: 172, sd: 14.141, nominal: '' };
    const at6 = Planner.metricsOf(154, 190, 172, 6, '');
    expect(at6.ppm).toBeCloseTo(2699.796, 0);
    expect(at6.yieldPct).toBeCloseTo(99.7300204, 4);

    const solved = ask({
      metric: 'ppm',
      goal: 2700,
      adjust: 'sd',
      baseline: centered
    });
    expect(solved.status).toBe('reachable');
    expect(solved.candidates[0].sd).toBeCloseTo(6, 2);
    expect(solved.candidates[0].ppm).toBeLessThanOrEqual(2700 + 0.001);

    const outside = { lsl: 154, usl: 190, mean: 150, sd: 25, nominal: '' };
    const minSd = Math.sqrt((40 * 40 - 4 * 4) / (2 * Math.log(40 / 4)));
    expect(minSd).toBeCloseTo(18.5462, 4);
    const atMin = Planner.metricsOf(154, 190, 150, minSd, '');
    expect(atMin.ppm).toBeCloseTo(600892, -1);

    const at20 = Planner.metricsOf(154, 190, 150, 20, '');
    const at25 = Planner.metricsOf(154, 190, 150, 25, '');
    expect(atMin.ppm).toBeLessThan(at20.ppm);
    expect(at20.ppm).toBeLessThan(at25.ppm);
    const between = (at20.ppm + at25.ppm) / 2;
    const tightRange = ask({ metric: 'ppm', goal: between, adjust: 'sd', baseline: outside, sdMin: 20 });
    expect(tightRange.status).toBe('reachable');
    expect(tightRange.candidates[0].sd).toBeGreaterThanOrEqual(20);
    expect(tightRange.candidates[0].sd).toBeLessThan(25);
    const tooTight = ask({ metric: 'ppm', goal: at20.ppm - 1000, adjust: 'sd', baseline: outside, sdMin: 20 });
    expect(tooTight.status).toBe('unreachable');
    expect(tooTight.best.attained).toBe(true);
    expect(tooTight.best.sd).toBeCloseTo(20, 6);
  });

  test('rejects missing limits, zero SD, invalid goals, and crossed mean bounds', () => {
    expect(ask({ baseline: Object.assign({}, temp, { lsl: null }) }).error).toMatch(/both specification/);
    expect(ask({ baseline: Object.assign({}, temp, { sd: 0 }) }).error).toMatch(/greater than 0/);
    expect(ask({ goal: 0 }).error).toMatch(/positive/);
    expect(ask({ metric: 'yield', goal: 100 }).error).toMatch(/less than 100/);
    expect(ask({ metric: 'ppm', goal: 1000000 }).error).toMatch(/1,000,000/);
    expect(ask({ meanMin: 180, meanMax: 170 }).error).toMatch(/minimum mean/);
  });

  test('reports an already-met goal without changing the process', () => {
    const found = ask({
      baseline: { lsl: 154, usl: 190, mean: 172, sd: 2, nominal: '' },
      adjust: 'mean'
    });
    expect(found.status).toBe('already-met');
    expect(found.candidates[0].mean).toBe(172);
    expect(found.candidates[0].sd).toBe(2);
  });

  test('yield specification what-if names the equal-widening policy', () => {
    const found = ask({
      metric: 'yield',
      goal: 99,
      mode: 'spec',
      unlockLower: true,
      unlockUpper: true
    });
    expect(found.status).toBe('reachable');
    expect(found.policy).toBe('Equal widening until a limit is reached');
    expect(found.candidates[0].title).toMatch(/proposed specifications/);
  });
});
