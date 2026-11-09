/** @jest-environment node */
const Engine = require('./process-settings-engine.js');

function pointNear(profile, x) {
  return profile.points.reduce(function (best, point) {
    return Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best;
  });
}

function sessionFromPreset() {
  const session = Engine.createSession();
  const demo = Engine.demoPreset();
  session.loadData(demo.table);
  session.configure(demo.config);
  session.setSpecifications(demo.specifications);
  const token = session.beginFit();
  const fitted = session.finishFit(token);
  expect(fitted.applied).toBe(true);
  session.setCurrentSettings(demo.current);
  expect(session.pin().ok).toBe(true);
  return session;
}

describe('process settings numerical fixture', () => {
  test('matches the independent OLS reference and does not refit while exploring', () => {
    const session = sessionFromPreset();
    const fitted = session.read();
    expect(fitted.model.n).toBe(12);
    expect(fitted.fitCount).toBe(1);
    const coef = {};
    fitted.model.coefficients.forEach(function (row) { coef[row.name] = row.estimate; });
    expect(coef.Intercept).toBeCloseTo(30, 6);
    expect(coef.Temperature).toBeCloseTo(0.4, 6);
    expect(coef.Recipe_B).toBeCloseTo(-18, 6);
    expect(coef['Temperature \u00d7 Recipe_B']).toBeCloseTo(0.2, 6);

    const current = fitted.currentCard;
    expect(current.mean).toBeCloseTo(66, 6);
    expect(current.ci[0]).toBeCloseTo(64.176944, 6);
    expect(current.ci[1]).toBeCloseTo(67.823056, 6);
    expect(current.margin.value).toBeCloseTo(-2, 6);
    expect(current.margin.side).toBe('lower limit');
    expect(current.locationLabel).toBe('Predicted mean below LSL');
    expect(current.ciLabel).toBe('95% confidence interval for the mean response');

    session.setCandidate({ Temperature: 100, Recipe: 'B' });
    const candidate = session.read();
    expect(candidate.candidateCard.mean).toBeCloseTo(72, 6);
    expect(candidate.candidateCard.ci[0]).toBeCloseTo(70.846998, 6);
    expect(candidate.candidateCard.ci[1]).toBeCloseTo(73.153002, 6);
    expect(candidate.candidateCard.margin.value).toBeCloseTo(3, 6);
    expect(candidate.candidateCard.margin.side).toBe('upper limit');
    expect(candidate.candidateCard.locationLabel).toBe('Predicted mean within limits');
    expect(candidate.deltaMean).toBeCloseTo(6, 6);
    expect(candidate.candidateCard.atTarget).toBe(true);
    expect(candidate.candidateCard.targetText).toMatch(/Difference from target: 0/);
    expect(candidate.fitCount).toBe(1);
    expect(candidate.model.id).toBe(fitted.model.id);
    expect(candidate.profiles.every(function (profile) { return profile.modelId === fitted.model.id; })).toBe(true);

    const temperature = candidate.profiles.filter(function (profile) { return profile.name === 'Temperature'; })[0];
    expect(temperature.kind).toBe('numeric');
    expect(pointNear(temperature, 90).mean).toBeCloseTo(66, 6);
    expect(pointNear(temperature, 100).mean).toBeCloseTo(72, 6);
    expect(pointNear(temperature, 110).mean).toBeCloseTo(78, 6);
    expect((pointNear(temperature, 110).mean - pointNear(temperature, 90).mean) / 20).toBeCloseTo(0.6, 6);
    const recipe = candidate.profiles.filter(function (profile) { return profile.name === 'Recipe'; })[0];
    expect(recipe.kind).toBe('categorical');
    expect(recipe.marks.map(function (mark) { return mark.level; })).toEqual(['A', 'B']);
    expect(recipe.points).toBeUndefined();

    session.setCandidate({ Temperature: 110, Recipe: 'B' });
    session.setSpecifications({ lsl: 60, usl: 80, target: 70 });
    session.setSpecifications({ lsl: 68, usl: 75, target: 72 });
    const moved = session.read();
    expect(moved.candidateCard.mean).toBeCloseTo(78, 6);
    expect(moved.candidateCard.ci[0]).toBeCloseTo(76.176944, 6);
    expect(moved.candidateCard.ci[1]).toBeCloseTo(79.823056, 6);
    expect(moved.candidateCard.margin.value).toBeCloseTo(-3, 6);
    expect(moved.candidateCard.margin.side).toBe('upper limit');
    expect(moved.candidateCard.locationLabel).toBe('Predicted mean above USL');
    expect(moved.fitCount).toBe(1);
    expect(moved.model.coefficients.map(function (row) { return row.estimate; })).toEqual(
      fitted.model.coefficients.map(function (row) { return row.estimate; })
    );
    expect(moved.model.n).toBe(12);

    const beforeLevel = moved.candidateCard.ci.slice();
    expect(session.setConfidence(0.9).ok).toBe(true);
    const narrower = session.read().candidateCard.ci;
    expect(session.fitCount()).toBe(1);
    expect(narrower[1] - narrower[0]).toBeLessThan(beforeLevel[1] - beforeLevel[0]);
    expect(session.read().candidateCard.ciLabel).toBe('90% confidence interval for the mean response');
  });

  test('drops incomplete rows and keeps the same analyzed sample for both predictions', () => {
    const demo = Engine.demoPreset();
    const rows = demo.table.rows.concat([[null, 90, 'A'], [70, 100, '']]);
    const session = Engine.createSession();
    session.loadData({ headers: demo.table.headers, rows: rows, address: demo.table.address });
    session.configure(demo.config);
    expect(session.finishFit(session.beginFit()).applied).toBe(true);
    expect(session.read().model.n).toBe(12);
  });
});

describe('specification boundaries and units', () => {
  test('covers one limit, no limits, target only, reversed limits, a limit hit, and invalid settings', () => {
    const session = sessionFromPreset();
    session.setCandidate({ Temperature: 100, Recipe: 'B' });

    expect(session.setSpecifications({ lsl: 68, usl: null, target: null }).ok).toBe(true);
    let view = session.read();
    expect(view.candidateCard.margin.value).toBeCloseTo(4, 6);
    expect(view.candidateCard.margin.side).toBe('lower limit');
    expect(view.candidateCard.locationLabel).toBe('Predicted mean within limits');
    expect(view.currentCard.locationLabel).toBe('Predicted mean below LSL');

    expect(session.setSpecifications({ lsl: null, usl: 75, target: null }).ok).toBe(true);
    view = session.read();
    expect(view.candidateCard.margin.value).toBeCloseTo(3, 6);
    expect(view.candidateCard.margin.side).toBe('upper limit');
    expect(view.candidateCard.locationLabel).toBe('Predicted mean within limits');

    expect(session.setSpecifications({ lsl: null, usl: null, target: null }).ok).toBe(true);
    view = session.read();
    expect(view.candidateCard.mean).toBeCloseTo(72, 6);
    expect(view.candidateCard.margin.unavailable).toBe(true);
    expect(view.candidateCard.marginText).toBe('Unavailable');
    expect(view.candidateCard.locationLabel).toBe('');

    expect(session.setSpecifications({ lsl: null, usl: null, target: 70 }).ok).toBe(true);
    view = session.read();
    expect(view.candidateCard.margin.unavailable).toBe(true);
    expect(view.candidateCard.targetDelta).toBeCloseTo(2, 6);
    expect(view.candidateCard.locationLabel).toBe('');

    const kept = session.read().spec;
    const reversed = session.setSpecifications({ lsl: 80, usl: 70, target: 75 });
    expect(reversed.ok).toBe(false);
    expect(reversed.error).toMatch(/lower specification limit/);
    expect(session.read().spec).toEqual(kept);
    expect(session.fitCount()).toBe(1);

    const mean = session.read().candidateCard.mean;
    expect(session.setSpecifications({ lsl: 68, usl: mean, target: 70 }).ok).toBe(true);
    view = session.read();
    expect(view.candidateCard.locationLabel).toBe('Predicted mean at limit');
    expect(view.candidateCard.margin.value).toBeCloseTo(0, 6);
    expect(view.candidateCard.margin.side).toBe('upper limit');

    session.setSpecifications({ lsl: 68, usl: 75, target: 72 });
    session.setCandidate({ Temperature: 100, Recipe: 'C' });
    view = session.read();
    expect(view.phase).toBe('withheld');
    expect(view.candidateCard).toBeNull();
    expect(view.withheldReason).toMatch(/allowed choices/);
    expect(view.currentCard.mean).toBeCloseTo(66, 6);
    expect(view.deltaMean).toBeNull();

    session.setCandidate({ Temperature: 70, Recipe: 'B' });
    view = session.read();
    expect(view.phase).toBe('withheld');
    expect(view.withheldReason).toMatch(/operating bounds/);
    expect(view.candidateCard).toBeNull();
  });

  test('expresses a percentage response in percentage points and does not clamp it', () => {
    const session = Engine.createSession();
    session.loadData({
      headers: ['Yield', 'Temp'],
      rows: [[80, 1], [90, 2], [100, 3], [80, 1], [90, 2], [100, 3]],
      address: 'Percent!A1:B7'
    });
    session.configure({
      response: 'Yield',
      numeric: ['Temp'],
      categorical: [],
      roles: { Temp: 'adjustable' },
      responseScale: { kind: 'percent', min: 0, max: 100, unit: '%' }
    });
    session.setSpecifications({ lsl: 0, usl: 100, target: 90 });
    expect(session.finishFit(session.beginFit()).applied).toBe(true);
    session.setCurrentSettings({ Temp: 1 });
    expect(session.pin().ok).toBe(true);
    expect(session.setOperatingLimits({ Temp: { min: 1, max: 5 } }).ok).toBe(true);
    session.setCandidate({ Temp: 4 });
    const view = session.read();
    expect(view.candidateCard.mean).toBeCloseTo(110, 6);
    expect(view.candidateCard.mean).not.toBe(100);
    expect(view.candidateCard.rangeFlag).toMatch(/outside the meaningful response range/);
    expect(view.candidateCard.rangeFlag).toMatch(/unchanged/);
    expect(view.deltaText).toBe('+30 percentage points');
    expect(view.candidateCard.marginText).toMatch(/percentage points, upper limit/);
    expect(view.fitCount).toBe(1);
  });
});

describe('data support', () => {
  test('warns for extrapolation and an unobserved combination, then blocks operating-bound violations', () => {
    const session = sessionFromPreset();
    expect(session.setOperatingLimits({
      Temperature: { min: 80, max: 120 },
      Recipe: { levels: ['A', 'B'] }
    }).ok).toBe(true);
    session.setCandidate({ Temperature: 80, Recipe: 'A' });
    let view = session.read();
    expect(view.candidateCard.mean).toBeCloseTo(62, 6);
    expect(view.candidateCard.support.advisories.join(' ')).toMatch(/outside the analyzed range/);
    expect(view.candidateCard.support.advisories.join(' ')).toMatch(/range check/);
    expect(view.candidateCard.support.caveat).toMatch(/does not establish joint support/);
    expect(view.fitCount).toBe(1);

    session.setCandidate({ Temperature: 70, Recipe: 'A' });
    view = session.read();
    expect(view.phase).toBe('withheld');
    expect(view.candidateCard).toBeNull();
    expect(view.withheldReason).toMatch(/operating bounds/);
    expect(view.withheldReason).not.toMatch(/analyzed range/);

    const combo = Engine.createSession();
    combo.loadData({
      headers: ['Y', 'Color', 'Line', 'X'],
      rows: [
        [10, 'A', '1', 1],
        [12, 'A', '1', 2],
        [20, 'B', '1', 1],
        [22, 'B', '1', 2],
        [30, 'B', '2', 1],
        [31, 'B', '2', 1]
      ],
      address: 'Combo!A1:D7'
    });
    combo.configure({
      response: 'Y',
      numeric: ['X'],
      categorical: ['Color', 'Line'],
      roles: { X: 'adjustable', Color: 'adjustable', Line: 'adjustable' },
      interactions: []
    });
    expect(combo.finishFit(combo.beginFit()).applied).toBe(true);
    combo.setCurrentSettings({ X: 1, Color: 'B', Line: '1' });
    expect(combo.pin().ok).toBe(true);
    combo.setCandidate({ X: 2, Color: 'A', Line: '2' });
    view = combo.read();
    expect(view.candidateCard).not.toBeNull();
    expect(Number.isFinite(view.candidateCard.mean)).toBe(true);
    expect(view.candidateCard.support.advisories.join(' ')).toMatch(/combination of categories was not in the analyzed rows/);
    expect(view.fitCount).toBe(1);

    combo.setCandidate({ X: 2, Color: 'B', Line: '2' });
    view = combo.read();
    expect(view.candidateCard.support.advisories.join(' ')).toMatch(/outside the analyzed range for this category combination/);
    expect(view.candidateCard.mean).not.toBeNull();

    expect(combo.setOperatingLimits({ X: { min: 1, max: 1 } }).ok).toBe(true);
    combo.setCandidate({ X: 2, Color: 'B', Line: '2' });
    view = combo.read();
    expect(view.phase).toBe('withheld');
    expect(view.candidateCard).toBeNull();
    expect(view.withheldReason).toMatch(/operating bounds/);
  });
});

describe('session identity', () => {
  test('pins, resets, edits fixed conditions, and ignores a stale fit', () => {
    const session = sessionFromPreset();
    const modelId = session.read().model.id;
    session.setCandidate({ Temperature: 110, Recipe: 'B' });
    expect(session.read().changed.map(function (row) { return row.name; }).sort()).toEqual(['Recipe', 'Temperature']);
    expect(session.resetCandidate().ok).toBe(true);
    expect(session.read().deltaMean).toBeCloseTo(0, 8);
    expect(session.fitCount()).toBe(1);

    session.editCurrent();
    expect(session.read().pin).toBeNull();
    expect(session.read().model.id).toBe(modelId);
    session.setCurrentSettings({ Temperature: 100, Recipe: 'B' });
    expect(session.pin().ok).toBe(true);
    expect(session.read().currentCard.mean).toBeCloseTo(72, 6);
    expect(session.read().model.id).toBe(modelId);
    expect(session.fitCount()).toBe(1);

    const fixed = session.read().config;
    fixed.roles = { Temperature: 'adjustable', Recipe: 'fixed' };
    const configured = session.configure(fixed);
    expect(configured.modelCleared).toBe(false);
    expect(session.read().model.id).toBe(modelId);
    expect(session.read().pin).toBeNull();
    session.setCurrentSettings({ Temperature: 100, Recipe: 'A' });
    expect(session.pin().ok).toBe(true);
    session.setCandidate({ Temperature: 110, Recipe: 'B' });
    const held = session.read();
    expect(held.withheldReason).toMatch(/fixed condition/);
    expect(session.fitCount()).toBe(1);

    session.resetCandidate();
    session.setCandidate({ Temperature: 110 });
    const slope = session.read().profiles.filter(function (profile) { return profile.name === 'Temperature'; })[0];
    expect((pointNear(slope, 110).mean - pointNear(slope, 90).mean) / 20).toBeCloseTo(0.4, 6);
    expect(session.read().changed.map(function (row) { return row.name; })).toEqual(['Temperature']);

    const token = session.beginFit();
    session.loadData(Engine.demoTable());
    expect(session.finishFit(token).reason).toBe('stale');
    expect(session.read().model).toBeNull();
    expect(session.read().pin).toBeNull();
    expect(session.fitCount()).toBe(1);

    const again = session.beginFit();
    const later = session.beginFit();
    expect(session.finishFit(again).reason).toBe('stale');
    expect(session.finishFit(later).applied).toBe(true);
    expect(session.read().model.id).not.toBe(modelId);
    expect(session.fitCount()).toBe(2);
  });

  test('reports an empty table and an unestimable fit without keeping the old comparison', () => {
    const session = sessionFromPreset();
    const token = session.beginFit();
    expect(session.read().model).toBeNull();
    expect(session.finishFit(token).applied).toBe(true);

    session.loadData({ headers: ['Y', 'X'], rows: [[1, 1]], address: 'Tiny!A1:B2' });
    session.configure({ response: 'Y', numeric: ['X'], categorical: [], roles: { X: 'adjustable' } });
    const failed = session.finishFit(session.beginFit());
    expect(failed.applied).toBe(false);
    expect(failed.reason).toMatch(/cannot be estimated|singular|missing/i);
    expect(session.read().model).toBeNull();
    expect(session.read().currentCard).toBeNull();

    session.loadData({ headers: ['Y', 'X'], rows: [], address: '' });
    const empty = session.finishFit(session.beginFit());
    expect(empty.applied).toBe(false);
    expect(empty.reason).toMatch(/No valid observations|no worksheet data|Choose/i);
  });
});
