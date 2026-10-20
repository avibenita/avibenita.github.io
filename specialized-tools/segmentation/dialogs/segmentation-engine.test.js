/** @jest-environment node */
const SS = require('./segmentation-engine.js');

function loyaltyConfig(extra) {
  const cfg = SS.defaultConfig();
  cfg.xDimension.columns = ['Sat'];
  cfg.yDimension.columns = ['Stay'];
  cfg.xDimension.threshold = 4;
  cfg.yDimension.threshold = 4;
  cfg.xDimension.thresholdMethod = 'custom';
  cfg.yDimension.thresholdMethod = 'custom';
  const more = extra && extra.config ? extra.config : (extra || {});
  Object.keys(more).forEach((key) => {
    const value = more[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && cfg[key] && typeof cfg[key] === 'object' && !Array.isArray(cfg[key])) {
      cfg[key] = Object.assign({}, cfg[key], value);
    } else {
      cfg[key] = value;
    }
  });
  return cfg;
}

function analyzeRows(rows, extra) {
  return SS.analyze(['Sat', 'Stay'].concat((extra && extra.headers) || []), rows, loyaltyConfig(extra && extra.config));
}

describe('Survey segmentation classification', () => {
  test('assigns all four quadrants and treats the threshold as high', () => {
    const headers = ['Sat', 'Stay'];
    const rows = [
      [3, 5],
      [4, 4],
      [2, 2],
      [5, 3],
      [4, 3.9]
    ];
    const result = SS.analyze(headers, rows, loyaltyConfig());
    expect(result.ok).toBe(true);
    expect(result.respondents.map((r) => r.segment)).toEqual([
      'lowXHighY',
      'highXHighY',
      'lowXLowY',
      'highXLowY',
      'highXLowY'
    ]);
    expect(SS.classify(4, 4, 4, 4)).toBe('highXHighY');
    expect(SS.classify(3.999, 4, 4, 4)).toBe('lowXHighY');
    expect(result.overall.highXHighY.n).toBe(1);
    expect(result.overall.lowXHighY.n).toBe(1);
    expect(result.overall.lowXLowY.n).toBe(1);
    expect(result.overall.highXLowY.n).toBe(2);
  });

  test('means multiple items and applies each minimum-valid-items rule', () => {
    const headers = ['Sat1', 'Sat2', 'Sat3', 'Stay'];
    const rows = [
      [5, 5, null, 5],
      [5, null, null, 5],
      [5, 5, 5, null]
    ];
    const base = SS.defaultConfig();
    base.xDimension.columns = ['Sat1', 'Sat2', 'Sat3'];
    base.yDimension.columns = ['Stay'];
    base.xDimension.threshold = 4;
    base.yDimension.threshold = 4;

    base.minimumValidItems = 0.5;
    const half = SS.analyze(headers, rows, base);
    expect(half.validN).toBe(1);
    expect(half.respondents[0].xScore).toBe(5);
    expect(half.respondents[0].segment).toBe('highXHighY');

    base.minimumValidItems = 0.75;
    const most = SS.analyze(headers, rows, base);
    expect(most.ok).toBe(false);
    expect(most.error).toMatch(/No valid respondents/);

    base.minimumValidItems = 1;
    const all = SS.analyze(headers, rows, JSON.parse(JSON.stringify(base)));
    expect(all.ok).toBe(false);

    const twoOfThree = SS.defaultConfig();
    twoOfThree.xDimension.columns = ['Sat1', 'Sat2', 'Sat3'];
    twoOfThree.yDimension.columns = ['Stay'];
    twoOfThree.minimumValidItems = 0.5;
    const kept = SS.analyze(headers, [[5, 1, null, 5]], twoOfThree);
    expect(kept.ok).toBe(true);
    expect(kept.respondents[0].xScore).toBe(3);
    expect(kept.respondents[0].segment).toBe('lowXHighY');

    twoOfThree.minimumValidItems = 1;
    expect(SS.analyze(headers, [[5, 1, null, 5]], twoOfThree).ok).toBe(false);
    expect(SS.compositeScore([5, null, null], 0.5).ok).toBe(false);
    expect(SS.compositeScore([5, 5, null], 0.5).ok).toBe(true);
    expect(SS.compositeScore([5, 5, null], 0.75).ok).toBe(false);
    expect(SS.compositeScore([5, 5, null], 1).ok).toBe(false);
    expect(SS.compositeScore([null, null], 0.5).score).toBe(null);
  });

  test('shows an empty segment as 0% and keeps the other percentages', () => {
    const result = SS.analyze(['Sat', 'Stay'], [[5, 5], [5, 5], [2, 5]], loyaltyConfig());
    expect(result.ok).toBe(true);
    expect(result.overall.highXLowY.n).toBe(0);
    expect(result.overall.highXLowY.pct).toBe(0);
    expect(result.overall.lowXLowY.pct).toBe(0);
    expect(result.emptySegments).toEqual(['highXLowY', 'lowXLowY']);
    expect(SS.formatPct(result.overall.highXHighY.pct)).toBe('66.7%');
    expect(SS.formatPct(result.overall.lowXHighY.pct)).toBe('33.3%');
  });

  test('computes weighted and unweighted percentages that sum to 100', () => {
    const headers = ['Sat', 'Stay', 'Weight'];
    const rows = [
      [5, 5, 3],
      [5, 2, 1],
      [2, 5, 1],
      [2, 2, 1]
    ];
    const weighted = SS.analyze(headers, rows, loyaltyConfig({
      config: { weightColumn: 'Weight' }
    }));
    expect(weighted.weightUsed).toBe(true);
    expect(weighted.overall.highXHighY.pct).toBeCloseTo(50, 5);
    expect(weighted.overall.highXLowY.pct).toBeCloseTo(100 / 6, 5);
    expect(weighted.overall.lowXHighY.pct).toBeCloseTo(100 / 6, 5);
    expect(weighted.overall.lowXLowY.pct).toBeCloseTo(100 / 6, 5);
    const sum = SS.QUADRANT_KEYS.reduce((acc, key) => acc + weighted.overall[key].pct, 0);
    expect(sum).toBeCloseTo(100, 8);
    expect(weighted.overall.highXHighY.n).toBe(1);
    expect(weighted.validN).toBe(4);
    expect(weighted.validWeight).toBe(6);

    const unweighted = SS.analyze(headers, rows, loyaltyConfig());
    expect(unweighted.weightUsed).toBe(false);
    SS.QUADRANT_KEYS.forEach((key) => {
      expect(unweighted.overall[key].pct).toBeCloseTo(25, 5);
    });
    const rounded = SS.QUADRANT_KEYS.reduce((acc, key) => acc + SS.round1(unweighted.overall[key].pct), 0);
    expect(Math.abs(rounded - 100)).toBeLessThanOrEqual(0.2);
  });

  test('aggregates groups and sorts by segment, combined risk, name, and sample size', () => {
    const headers = ['Sat', 'Stay', 'Division'];
    const rows = [];
    function add(group, sat, stay, n) {
      for (let i = 0; i < n; i++) rows.push([sat, stay, group]);
    }
    add('Sales', 5, 5, 2);
    add('Sales', 2, 2, 8);
    add('Corporate', 5, 5, 9);
    add('Corporate', 2, 2, 1);
    add('Ops', 5, 2, 6);
    const result = SS.analyze(headers, rows, loyaltyConfig({ config: { groupColumn: 'Division', smallBaseThreshold: 30 } }));
    expect(result.ok).toBe(true);
    const byName = {};
    result.groups.forEach((g) => { byName[g.name] = g; });
    expect(byName.Corporate.n).toBe(10);
    expect(byName.Corporate.segments.highXHighY.n).toBe(9);
    expect(byName.Sales.segments.lowXLowY.pct).toBeCloseTo(80, 5);
    expect(byName.Ops.segments.highXLowY.n).toBe(6);
    expect(byName.Sales.small).toBe(true);
    expect(byName.Corporate.small).toBe(true);

    const loyal = SS.sortGroups(result.groups, 'highXHighY');
    expect(loyal.map((g) => g.name)).toEqual(['Corporate', 'Sales', 'Ops']);
    const risk = SS.sortGroups(result.groups, 'combinedRisk');
    expect(risk[0].name).toBe('Sales');
    const alpha = SS.sortGroups(result.groups, 'name');
    expect(alpha.map((g) => g.name)).toEqual(['Corporate', 'Ops', 'Sales']);
    const byN = SS.sortGroups(result.groups, 'n');
    expect(byN.map((g) => g.name)).toEqual(['Corporate', 'Sales', 'Ops']);
  });

  test('compares waves in percentage points and keeps one-wave groups off zero', () => {
    const headers = ['Sat', 'Stay', 'Division', 'Wave'];
    const rows = [
      [5, 5, 'Corporate', '2026'],
      [5, 5, 'Corporate', '2026'],
      [2, 2, 'Corporate', '2026'],
      [2, 2, 'Corporate', '2026'],
      [5, 5, 'Field', '2026'],
      [5, 5, 'Corporate', '2025'],
      [2, 2, 'Corporate', '2025'],
      [2, 2, 'Corporate', '2025'],
      [2, 2, 'Archive', '2025']
    ];
    const result = SS.analyze(headers, rows, loyaltyConfig({
      config: {
        groupColumn: 'Division',
        waveColumn: 'Wave',
        currentWave: '2026',
        previousWave: '2025'
      }
    }));
    expect(result.ok).toBe(true);
    expect(result.validN).toBe(5);
    expect(result.overall.highXHighY.pct).toBeCloseTo(60, 5);
    expect(result.change.overall.highXHighY.previousPct).toBeCloseTo(25, 5);
    expect(result.change.overall.highXHighY.pp).toBeCloseTo(35, 5);
    const byName = {};
    result.change.groups.forEach((g) => { byName[g.name] = g; });
    expect(byName.Field.status).toBe('new');
    expect(byName.Field.segments.highXHighY.pp).toBeNull();
    expect(byName.Field.segments.highXHighY.currentPct).toBeCloseTo(100, 5);
    expect(byName.Archive.status).toBe('previous-only');
    expect(byName.Archive.segments.lowXLowY.pp).toBeNull();
    expect(byName.Archive.segments.lowXLowY.previousPct).toBeCloseTo(100, 5);
    expect(byName.Corporate.segments.highXHighY.pp).toBeCloseTo(50 - (100 / 3), 5);

    const same = SS.analyze(headers, rows, loyaltyConfig({
      config: { waveColumn: 'Wave', currentWave: '2026', previousWave: '2026' }
    }));
    expect(same.ok).toBe(true);
    expect(same.change).toBeNull();
    expect(same.warnings.join(' ')).toMatch(/same value/i);
  });

  test('rejects invalid weights and all-zero weights', () => {
    const headers = ['Sat', 'Stay', 'Weight'];
    const mixed = SS.analyze(headers, [
      [5, 5, 2],
      [5, 5, -1],
      [2, 2, 0],
      [2, 5, 'n/a'],
      [4, 4, 'abc']
    ], loyaltyConfig({ config: { weightColumn: 'Weight' } }));
    expect(mixed.ok).toBe(true);
    expect(mixed.validN).toBe(1);
    expect(mixed.overall.highXHighY.pct).toBeCloseTo(100, 5);
    expect(mixed.warnings.join(' ')).toMatch(/negative/);
    expect(mixed.warnings.join(' ')).toMatch(/zero/);
    expect(mixed.warnings.join(' ')).toMatch(/not numeric/);

    const zeros = SS.analyze(headers, [[5, 5, 0], [2, 2, 0]], loyaltyConfig({ config: { weightColumn: 'Weight' } }));
    expect(zeros.ok).toBe(false);
    expect(zeros.error).toMatch(/zero/i);
  });

  test('renaming segments does not change quadrant assignment', () => {
    const rows = [[5, 5], [5, 1], [1, 5], [1, 1]];
    const first = SS.analyze(['Sat', 'Stay'], rows, loyaltyConfig());
    const renamed = loyaltyConfig();
    renamed.segments.highXHighY.label = 'Promoters';
    renamed.segments.highXHighY.color = '#123456';
    renamed.segments.lowXLowY.label = 'Watch';
    const second = SS.analyze(['Sat', 'Stay'], rows, renamed);
    expect(second.respondents.map((r) => r.segment)).toEqual(first.respondents.map((r) => r.segment));
    expect(second.overall.highXHighY.n).toBe(first.overall.highXHighY.n);
    expect(second.config.segments.highXHighY.label).toBe('Promoters');
    expect(first.config.segments.highXHighY.label).toBe('Truly Loyal');
  });

  test('filters update every segment, group, and wave figure from the same rows', () => {
    const headers = ['Sat', 'Stay', 'Division', 'Level', 'Wave'];
    const rows = [
      [5, 5, 'Sales', 'Managers', '2026'],
      [5, 5, 'Sales', 'Managers', '2026'],
      [2, 2, 'Sales', 'Staff', '2026'],
      [2, 2, 'Ops', 'Staff', '2026'],
      [5, 5, 'Sales', 'Managers', '2025'],
      [2, 2, 'Sales', 'Staff', '2025']
    ];
    const cfg = loyaltyConfig({
      config: {
        groupColumn: 'Division',
        waveColumn: 'Wave',
        currentWave: '2026',
        previousWave: '2025',
        filters: { Level: ['Managers'] }
      }
    });
    const filtered = SS.analyze(headers, rows, cfg);
    const managersOnly = rows.filter((row) => row[3] === 'Managers');
    const direct = SS.analyze(headers, managersOnly, loyaltyConfig({
      config: { groupColumn: 'Division', waveColumn: 'Wave', currentWave: '2026', previousWave: '2025' }
    }));
    expect(filtered.ok).toBe(true);
    expect(filtered.validN).toBe(direct.validN);
    expect(filtered.overall.highXHighY.pct).toBe(direct.overall.highXHighY.pct);
    expect(filtered.groups.map((g) => g.name)).toEqual(direct.groups.map((g) => g.name));
    expect(filtered.change.overall.highXHighY.pp).toBe(direct.change.overall.highXHighY.pp);
    expect(filtered.filterDescription).toBe('Level = Managers');
    expect(filtered.validN).toBe(2);
    expect(filtered.previousValidN).toBe(1);
    const open = SS.filterColumns(headers, rows, cfg);
    expect(open.map((col) => col.name)).toEqual(['Level']);
  });

  test('flags non-numeric items, a single group, duplicate IDs, and a threshold outside the scale', () => {
    const bad = SS.analyze(['Sat', 'Stay'], [['high', 5], [4, 4]], loyaltyConfig());
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/Non-numeric/);

    const none = SS.analyze([], [], loyaltyConfig());
    expect(none.ok).toBe(false);
    expect(none.error).toMatch(/No data/);

    const oneGroup = SS.analyze(
      ['Sat', 'Stay', 'Division', 'ID'],
      [[5, 5, 'Sales', 'A'], [2, 2, 'Sales', 'A'], [4, 1, 'Sales', 'B']],
      loyaltyConfig({ config: { groupColumn: 'Division', respondentIdColumn: 'ID' } })
    );
    expect(oneGroup.ok).toBe(true);
    expect(oneGroup.warnings.join(' ')).toMatch(/only one category/);
    expect(oneGroup.duplicateIdCount).toBe(1);
    expect(oneGroup.respondents).toHaveLength(3);

    const outside = SS.analyze(['Sat', 'Stay'], [[1, 1], [2, 2], [3, 3]], loyaltyConfig({
      config: {
        xDimension: { label: 'Satisfaction', columns: ['Sat'], thresholdMethod: 'custom', threshold: 9, highLabel: 'Satisfied', lowLabel: 'Not satisfied' },
        yDimension: { label: 'Intention to stay', columns: ['Stay'], thresholdMethod: 'custom', threshold: 4, highLabel: 'Tending to stay', lowLabel: 'Not tending to stay' }
      }
    }));
    expect(outside.ok).toBe(true);
    expect(outside.warnings.join(' ')).toMatch(/outside the observed scale/);
    expect(outside.overall.lowXLowY.n).toBe(3);
  });

  test('infers a 1–5 favorable threshold of 4 and supports median and midpoint', () => {
    const values = [1, 2, 3, 4, 5, 5];
    expect(SS.inferScale(values)).toEqual({ min: 1, max: 5, known: true });
    expect(SS.resolveThreshold('favorable', null, values).threshold).toBe(4);
    expect(SS.resolveThreshold('custom', null, values).threshold).toBe(4);
    expect(SS.resolveThreshold('midpoint', null, values).threshold).toBe(3);
    expect(SS.resolveThreshold('median', null, values).threshold).toBe(3.5);
    expect(SS.resolveThreshold('custom', 4.5, values).threshold).toBe(4.5);
    const med = SS.analyze(['Sat', 'Stay'], [[1, 1], [2, 2], [3, 3], [4, 5], [5, 5]], loyaltyConfig({
      config: {
        xDimension: { columns: ['Sat'], thresholdMethod: 'median', threshold: null, label: 'Satisfaction', highLabel: 'Satisfied', lowLabel: 'Not satisfied' },
        yDimension: { columns: ['Stay'], thresholdMethod: 'median', threshold: null, label: 'Intention to stay', highLabel: 'Tending to stay', lowLabel: 'Not tending to stay' }
      }
    }));
    expect(med.rules.xThreshold).toBe(3);
    expect(med.rules.xRule).toBe('Satisfied: score ≥ 3.00');
  });

  test('Split Index legend defaults to highest and lower score and keeps a custom pair', () => {
    const legacy = SS.defaultConfig();
    legacy.product = 'split';
    const migrated = SS.normalizeConfig(legacy);
    expect(migrated.yDimension.highLabel).toBe('Highest Intention to stay');
    expect(migrated.yDimension.lowLabel).toBe('Lower Intention to stay');
    const custom = SS.normalizeConfig({
      product: 'split',
      legendLabelsCustom: true,
      yDimension: { highLabel: 'Tending to stay', lowLabel: 'Leavers' }
    });
    expect(custom.yDimension.highLabel).toBe('Tending to stay');
    expect(custom.yDimension.lowLabel).toBe('Leavers');
    expect(SS.normalizeConfig(SS.defaultConfig()).yDimension.highLabel).toBe('Tending to stay');
  });

  test('Split Index runs from the outcome and factors when the second dimension is empty', () => {
    const cfg = SS.defaultConfig();
    cfg.product = 'split';
    cfg.yDimension.columns = ['Stay'];
    cfg.yDimension.thresholdMethod = 'custom';
    cfg.yDimension.threshold = 4;
    cfg.factorColumns = ['A', 'B'];
    const result = SS.analyze(
      ['Stay', 'A', 'B'],
      [[5, 5, 2], [5, 4, 2], [2, 1, 4], [1, 2, 5]],
      cfg
    );
    expect(result.ok).toBe(true);
    expect(result.scoredRespondents).toHaveLength(4);
    expect(result.scoredRespondents[0].factorScores.A).toBe(5);
    expect(result.factors.map((factor) => factor.id)).toEqual(['A', 'B']);
    expect(result.rules.yThreshold).toBe(4);
  });
});
