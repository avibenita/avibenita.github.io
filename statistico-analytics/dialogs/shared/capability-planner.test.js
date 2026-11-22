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

  test('etch time keeps the current SD and offers the two mean presets', () => {
    const etch = { lsl: 50, usl: 93, mean: 50, sd: 4.1, nominal: '' };
    const base = Planner.metricsOf(50, 93, 50, 4.1, '');
    expect(base.index).toBeCloseTo(0, 6);

    const found = ask({ baseline: etch });
    expect(found.status).toBe('reachable');
    expect(found.atCurrentSd.meets).toBe(true);
    expect(found.atCurrentSd.lo).toBeCloseTo(66.359, 3);
    expect(found.atCurrentSd.hi).toBeCloseTo(76.641, 3);
    expect(Planner.indexOf(found.atCurrentSd.lo, 4.1, 50, 93)).toBeGreaterThanOrEqual(1.33 - Planner.INDEX_TOL);
    expect(Planner.indexOf(found.atCurrentSd.hi, 4.1, 50, 93)).toBeGreaterThanOrEqual(1.33 - Planner.INDEX_TOL);
    expect(found.candidates.map(function (item) { return item.id; })).toEqual(['smallest-shift', 'most-margin']);
    expect(found.candidates[0].mean).toBeCloseTo(66.359, 3);
    expect(found.candidates[0].sd).toBe(4.1);
    expect(found.candidates[0].index).toBeCloseTo(1.33, 3);
    expect(found.candidates[1].mean).toBeCloseTo(71.5, 6);
    expect(found.candidates[1].sd).toBe(4.1);
    expect(found.candidates[1].index).toBeCloseTo(1.748, 3);
    expect(found.candidates[1].ppm).toBeCloseTo(0.16, 2);
    expect(Planner.answerText(found, { indexLabel: 'Ppk', goal: 1.33, digits: 2, unit: 's' })).toBe(
      'Ppk 1.33 is reachable at the current SD of 4.10 s. A mean from 66.36 to 76.64 s meets the goal.'
    );

    const custom = Planner.previewMean(Object.assign({
      metric: 'index', goal: 1.33, mode: 'process', adjust: 'both', baseline: etch,
      meanMin: '', meanMax: '', sdMin: ''
    }), 76.23);
    expect(custom.mean).toBe(76.23);
    expect(custom.sd).toBe(4.1);
    expect(custom.meets).toBe(true);
    expect(custom.index).toBeCloseTo(1.3634, 3);
    expect(custom.ppm).toBeCloseTo(21.55, 1);
    expect(custom.sdGoal).toBeCloseTo(4.203, 3);
    expect(custom.cappedByCurrent).toBe(true);

    const capped = ask({ baseline: etch, meanMax: 60 });
    expect(capped.atCurrentSd.meets).toBe(false);
    expect(capped.candidates.some(function (item) { return item.id === 'smallest-shift' && item.sd === 4.1; })).toBe(false);
    expect(capped.candidates[0].title).toBe('Least SD reduction');
    expect(capped.candidates[0].mean).toBeCloseTo(60, 6);
    expect(capped.candidates[0].sd).toBeCloseTo(2.506, 3);
    expect(Planner.answerText(capped, { indexLabel: 'Ppk', goal: 1.33, digits: 2, unit: 's' })).toMatch(/has to be reduced/);

    const blocked = ask({ baseline: etch, meanMax: 60, sdMin: 3 });
    expect(blocked.status).toBe('unreachable');
    expect(blocked.best.mean).toBeCloseTo(60, 6);
    expect(blocked.best.sd).toBeCloseTo(3, 6);
    expect(blocked.best.index).toBeCloseTo(1.111, 3);
  });

  test('a goal already met at the current SD starts from the current process', () => {
    const found = ask({ baseline: { lsl: 50, usl: 93, mean: 71.5, sd: 4.1, nominal: '' } });
    expect(found.status).toBe('already-met');
    expect(found.candidates[0].id).toBe('current');
    expect(found.candidates[0].mean).toBe(71.5);
    expect(found.candidates[0].sd).toBe(4.1);
    expect(Planner.answerText(found, { indexLabel: 'Ppk', goal: 1.33, digits: 2, unit: 's' })).toMatch(/already meets the goal/);
  });

  test('a single feasible mean collapses the two current-SD presets', () => {
    const sd = 43 / (6 * 1.33);
    const found = ask({ baseline: { lsl: 50, usl: 93, mean: 50, sd: sd, nominal: '' } });
    expect(found.status).toBe('reachable');
    expect(found.candidates).toHaveLength(1);
    expect(found.candidates[0].mean).toBeCloseTo(71.5, 6);
    expect(found.candidates[0].sd).toBeCloseTo(sd, 8);
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

const screen = { lsl: 10, usl: 20, mean: 15.679, sd: 1.422, nominal: '' };

function screenAsk(extra) {
  return Planner.describePlan(Object.assign({
    metric: 'index',
    goal: 1.33,
    mode: 'process',
    adjust: 'sd',
    baseline: screen,
    meanMin: '',
    meanMax: '',
    sdMin: '',
    unlockLower: true,
    unlockUpper: true,
    lowerOut: '',
    upperOut: ''
  }, extra));
}

describe('capability planner basic Ppk contract', () => {
  test('fixture baseline, reduce variation, shift, both, and specification sides', () => {
    const base = Planner.metricsOf(10, 20, 15.679, 1.422, '');
    expect(base.index).toBeCloseTo(1.0128926395, 8);

    const reduced = screenAsk({ adjust: 'sd' });
    expect(reduced.status).toBe('reachable');
    expect(reduced.proposal.sd).toBeCloseTo(1.0829573935, 8);
    expect(reduced.proposal.mean).toBeCloseTo(15.679, 8);
    expect(reduced.proposal.sdReductionPct).toBeCloseTo(23.8426586861, 6);
    expect(reduced.proposal.index).toBeCloseTo(1.33, 8);
    expect(reduced.overlay).toBe('curve');
    expect(Planner.planCopy(reduced)).toMatch(/Required SD: at most/);
    expect(Planner.planStrip(reduced).parts.map((part) => part.text).join(' | ')).toBe('Reduce SD by 23.8% | SD 1.42 → 1.08 | Ppk 1.01 → 1.33');

    const shifted = screenAsk({ adjust: 'mean' });
    expect(shifted.status).toBe('unreachable');
    expect(shifted.proposal).toBeNull();
    expect(shifted.overlay).toBe('none');
    expect(shifted.bestIndex).toBeCloseTo(1.1720581341, 8);
    expect(shifted.bestMean).toBeCloseTo(15, 8);
    expect(Planner.planCopy(shifted)).toBe('Shifting alone cannot reach Ppk 1.33. Even at the centre, the maximum is approximately 1.17. Try reducing variation as well.');
    expect(Planner.planStrip(shifted).text).toBe(Planner.planCopy(shifted));

    const both = screenAsk({ adjust: 'both' });
    expect(both.status).toBe('reachable');
    expect(both.proposal.mean).toBeCloseTo(15, 8);
    expect(both.proposal.sd).toBeCloseTo(1.2531328321, 8);
    expect(both.proposal.sdReductionPct).toBeCloseTo(11.8753282644, 6);
    expect(both.proposal.index).toBeCloseTo(1.33, 8);
    expect(Planner.planCopy(both)).toMatch(/unrestricted mean movement/);
    expect(Planner.planStrip(both).parts.map((part) => part.text).join(' | ')).toBe('Reduce SD by 11.9% | Mean 15.68 → 15.00 | SD 1.42 → 1.25 | Ppk 1.01 → 1.33');

    const lowerOnly = screenAsk({ mode: 'spec', unlockLower: true, unlockUpper: false });
    expect(lowerOnly.status).toBe('unreachable');
    expect(lowerOnly.proposal).toBeNull();
    expect(lowerOnly.sideIndex).toBeCloseTo(1.0128926395, 8);
    expect(Planner.planCopy(lowerOnly)).toMatch(/upper limit is locked/);

    const outward = screenAsk({ mode: 'spec', unlockLower: true, unlockUpper: true });
    expect(outward.status).toBe('reachable');
    expect(outward.overlay).toBe('specs');
    expect(outward.proposal.lsl).toBeCloseTo(10, 8);
    expect(outward.proposal.usl).toBeCloseTo(21.35278, 4);
    expect(outward.proposal.mean).toBeCloseTo(15.679, 8);
    expect(outward.proposal.sd).toBeCloseTo(1.422, 8);
    expect(outward.proposal.index).toBeCloseTo(1.33, 8);
    expect(Planner.planCopy(outward)).toMatch(/does not improve production/);
    expect(Planner.planCopy(outward)).toMatch(/lower limit already satisfies/);
  });

  test('an already-met goal proposes no change for the basic methods', () => {
    const met = { lsl: 10, usl: 20, mean: 15, sd: 1, nominal: '' };
    expect(Planner.metricsOf(10, 20, 15, 1, '').index).toBeCloseTo(1.6666666667, 8);
    ['sd', 'mean', 'both'].forEach((adjust) => {
      const found = screenAsk({ adjust: adjust, baseline: met });
      expect(found.status).toBe('already-met');
      expect(found.proposal).toBeNull();
      expect(found.overlay).toBe('none');
      expect(Planner.planCopy(found)).toBe('Your current process already meets this goal. No change is required.');
    });
  });

  test('shift mean on an exact boundary returns that single mean', () => {
    const found = screenAsk({
      adjust: 'mean',
      goal: 1,
      baseline: { lsl: 0, usl: 6, mean: 2, sd: 1, nominal: '' }
    });
    expect(found.status).toBe('reachable');
    expect(found.proposal.mean).toBeCloseTo(3, 8);
    expect(found.proposal.sd).toBeCloseTo(1, 8);
    expect(found.proposal.index).toBeCloseTo(1, 8);
    expect(found.feasibleMean.lo).toBeCloseTo(3, 6);
    expect(found.feasibleMean.hi).toBeCloseTo(3, 6);
  });

  test('a mean outside the limits is not solved by reducing variation', () => {
    const found = screenAsk({
      adjust: 'sd',
      baseline: { lsl: 10, usl: 20, mean: 21, sd: 1, nominal: '' }
    });
    expect(found.status).toBe('unreachable');
    expect(found.proposal).toBeNull();
    expect(Planner.planCopy(found)).toMatch(/mean must move inside the specifications/);
  });

  test('nominal value does not change Ppk', () => {
    const plain = Planner.metricsOf(10, 20, 15.679, 1.422, '');
    const named = Planner.metricsOf(10, 20, 15.679, 1.422, 15);
    expect(named.index).toBeCloseTo(plain.index, 12);
    expect(named.index).not.toBe(named.spread);
  });

  test('a changed goal, method, or dataset drops a saved proposal', () => {
    const state = {
      baseline: screen,
      goal: '1.33',
      altGoal: '',
      method: 'sd',
      mode: 'process',
      metric: 'index',
      action: 'ppk',
      meanMin: '',
      meanMax: '',
      sdMin: '',
      unlockLower: true,
      unlockUpper: true,
      lowerOut: '',
      upperOut: ''
    };
    const saved = Planner.controlSignature(state);
    expect(Planner.proposalCurrent(saved, state)).toBe(true);
    expect(Planner.proposalCurrent(saved, Object.assign({}, state, { goal: '1.67' }))).toBe(false);
    expect(Planner.proposalCurrent(saved, Object.assign({}, state, { method: 'both' }))).toBe(false);
    expect(Planner.proposalCurrent(saved, Object.assign({}, state, {
      baseline: Object.assign({}, screen, { mean: 15.2 })
    }))).toBe(false);
    expect(Planner.proposalCurrent('', state)).toBe(false);
    expect(Planner.proposalCurrent(null, state)).toBe(false);
  });
});
