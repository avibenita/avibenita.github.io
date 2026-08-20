const Rel = require('./reliability-engine.js');

function perfectlyConsistent(n, k) {
  const headers = [];
  for (let i = 0; i < k; i++) headers.push('Q' + (i + 1));
  const rows = [];
  for (let r = 0; r < n; r++) {
    const v = 1 + (r % 5);
    rows.push(headers.map(() => v));
  }
  return { headers, rows };
}

function unrelatedItems(n, k) {
  const headers = [];
  for (let i = 0; i < k; i++) headers.push('Q' + (i + 1));
  const rows = [];
  let seed = 7;
  const rng = function () {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let r = 0; r < n; r++) {
    rows.push(headers.map(() => 1 + Math.floor(rng() * 5)));
  }
  return { headers, rows };
}

function reverseKeyedSet() {
  const headers = ['Q1', 'Q2', 'Q3', 'Q4'];
  const rows = [];
  for (let r = 0; r < 80; r++) {
    const t = 1 + (r % 5);
    rows.push([t, t, t, 6 - t]);
  }
  return { headers, rows };
}

describe('Scale Reliability engine', () => {
  test('1. perfectly consistent items produce very high alpha', () => {
    const data = perfectlyConsistent(60, 5);
    const out = Rel.analyze(data.headers, data.rows, { items: data.headers, rngSeed: 1, bootstrapSamples: 80 });
    expect(out.ok).toBe(true);
    expect(out.observedResults.alpha).toBeGreaterThan(0.95);
  });

  test('2. unrelated items produce low alpha', () => {
    const data = unrelatedItems(80, 6);
    const out = Rel.analyze(data.headers, data.rows, { items: data.headers, rngSeed: 2, bootstrapSamples: 40 });
    expect(out.ok).toBe(true);
    expect(out.observedResults.alpha).toBeLessThan(0.60);
  });

  test('3. reverse-keyed item hurts alpha until reversed', () => {
    const data = reverseKeyedSet();
    const before = Rel.analyze(data.headers, data.rows, {
      items: data.headers,
      reverseItems: [],
      bootstrapSamples: 0,
      coefficients: { alpha: true, omegaTotal: true, standardizedAlpha: true, confidenceInterval: false }
    });
    const after = Rel.analyze(data.headers, data.rows, {
      items: data.headers,
      reverseItems: ['Q4'],
      scoreRange: { min: 1, max: 5 },
      bootstrapSamples: 0,
      coefficients: { alpha: true, omegaTotal: true, standardizedAlpha: true, confidenceInterval: false }
    });
    expect(before.ok).toBe(true);
    expect(after.ok).toBe(true);
    expect(before.observedResults.alpha).toBeLessThan(0.20);
    expect(after.observedResults.alpha).toBeGreaterThan(0.90);
    expect(after.observedResults.alpha).toBeGreaterThan(before.observedResults.alpha);
  });

  test('4. alpha-if-deleted is defined and leave-one-out is coherent', () => {
    const demo = Rel.demoLikertScale({ n: 120, seed: 9 });
    const cfg = Object.assign({}, demo.suggestedConfig, {
      bootstrapSamples: 0,
      coefficients: { alpha: true, omegaTotal: true, standardizedAlpha: true, confidenceInterval: false }
    });
    const out = Rel.analyze(demo.headers, demo.rows, cfg);
    expect(out.ok).toBe(true);
    const items = out.observedResults.items;
    expect(items.length).toBe(8);
    items.forEach((it) => {
      expect(it.alphaIfDeleted === null || Number.isFinite(it.alphaIfDeleted)).toBe(true);
    });
    const weak = items.find((it) => it.item === 'Q8');
    expect(weak).toBeTruthy();
    expect(weak.alphaIfDeleted).toBeGreaterThan(out.observedResults.alpha - 0.02);
  });

  test('5. corrected item-total excludes the item from its own total', () => {
    const headers = ['A', 'B', 'C'];
    const rows = [
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
      [5, 5, 5],
      [1, 2, 1],
      [5, 4, 5]
    ];
    const out = Rel.analyze(headers, rows, {
      items: headers,
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: false }
    });
    expect(out.ok).toBe(true);
    out.observedResults.items.forEach((it) => {
      expect(it.itemTotalCorrelation).not.toBeNull();
      expect(it.itemTotalCorrelation).toBeGreaterThan(0.5);
      expect(it.itemTotalCorrelation).toBeLessThanOrEqual(1);
    });
  });

  test('6. raw versus standardized alpha are distinct fields', () => {
    const headers = ['A', 'B', 'C'];
    const rows = [];
    for (let i = 0; i < 40; i++) {
      const t = i % 5;
      rows.push([t, t * 10, t * 2 + 1]);
    }
    const out = Rel.analyze(headers, rows, {
      items: headers,
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: true }
    });
    expect(out.ok).toBe(true);
    expect(out.observedResults.alpha).not.toBeNull();
    expect(out.observedResults.standardizedAlpha).not.toBeNull();
    expect(out.observedResults.alpha).not.toBe(out.observedResults.standardizedAlpha);
  });

  test('7. listwise missing-data handling uses complete respondents only', () => {
    const headers = ['Q1', 'Q2', 'Q3'];
    const rows = [
      [1, 2, 3],
      [2, 3, 4],
      [3, '', 5],
      [4, 5, 4],
      [5, 4, 3],
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3]
    ];
    const out = Rel.analyze(headers, rows, {
      items: headers,
      missingMethod: 'listwise',
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: false }
    });
    expect(out.ok).toBe(true);
    expect(out.observedResults.nOriginal).toBe(8);
    expect(out.observedResults.nValid).toBe(7);
    expect(out.observedResults.nListwise).toBe(7);
  });

  test('8. pairwise missing-data handling retains available pairs and exposes pairwise N', () => {
    const headers = ['Q1', 'Q2', 'Q3'];
    const rows = [
      [1, 2, 3],
      [2, 3, ''],
      [3, '', 5],
      [4, 5, 4],
      [5, 4, 3],
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
      [4, 4, 4],
      [5, 5, 5]
    ];
    const out = Rel.analyze(headers, rows, {
      items: headers,
      missingMethod: 'pairwise',
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: false }
    });
    expect(out.ok).toBe(true);
    expect(out.observedResults.nValid).toBeGreaterThan(out.observedResults.nListwise);
    expect(out.observedResults.pairwiseN.length).toBe(3);
    expect(out.observedResults.pairwiseN[0][1]).toBeGreaterThan(0);
  });

  test('9. zero-variance item blocks the analysis', () => {
    const headers = ['Q1', 'Q2', 'Q3'];
    const rows = [
      [1, 3, 5],
      [2, 3, 4],
      [3, 3, 3],
      [4, 3, 2],
      [5, 3, 1]
    ];
    const out = Rel.analyze(headers, rows, { items: headers, bootstrapSamples: 0 });
    expect(out.ok).toBe(false);
    expect(out.blocking).toBe(true);
    expect(out.errors.some((e) => e.code === 'zero_variance' || /zero variance/i.test(e.message))).toBe(true);
  });

  test('10. omega estimation succeeds on a coherent scale and fails on a degenerate matrix', () => {
    const demo = Rel.demoLikertScale({ n: 100, seed: 3 });
    const ok = Rel.analyze(demo.headers, demo.rows, Object.assign({}, demo.suggestedConfig, {
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: false }
    }));
    expect(ok.ok).toBe(true);
    expect(ok.observedResults.omegaTotal).not.toBeNull();
    expect(ok.observedResults.omegaStatus).toMatch(/estimated/);
    expect(ok.observedResults.omegaTotal).not.toBe(ok.observedResults.alpha);

    const Rbad = [
      [1, 2, 2],
      [2, 1, 2],
      [2, 2, 1]
    ];
    const failed = Rel.omegaFromCorrelation(Rbad);
    expect(failed.omega).toBeNull();
    expect(failed.status).toBe('not_estimable');
  });

  test('11. bootstrap confidence intervals contain the alpha estimate', () => {
    const demo = Rel.demoLikertScale({ n: 80, seed: 11 });
    const out = Rel.analyze(demo.headers, demo.rows, Object.assign({}, demo.suggestedConfig, {
      rngSeed: 11,
      bootstrapSamples: 120,
      confidenceLevel: 0.95
    }));
    expect(out.ok).toBe(true);
    const ci = out.observedResults.alphaCI;
    expect(ci).toBeTruthy();
    expect(ci.successful).toBeGreaterThan(50);
    expect(ci.lower).toBeLessThanOrEqual(out.observedResults.alpha + 1e-9);
    expect(ci.upper).toBeGreaterThanOrEqual(out.observedResults.alpha - 1e-9);
    expect(ci.level).toBe(0.95);
  });

  test('12. by-group calculations return per-group alpha and N', () => {
    const demo = Rel.demoLikertScale({ n: 90, seed: 5 });
    const out = Rel.analyze(demo.headers, demo.rows, Object.assign({}, demo.suggestedConfig, {
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: false }
    }));
    expect(out.ok).toBe(true);
    expect(out.observedResults.groups.length).toBe(3);
    out.observedResults.groups.forEach((g) => {
      expect(g.validN).toBeGreaterThan(10);
      expect(['North', 'South', 'West']).toContain(g.group);
    });
  });

  test('13. suspicious meta-analysis-like columns produce a suitability warning', () => {
    const demo = Rel.demoUnsuitableMeta();
    const out = Rel.analyze(demo.headers, demo.rows, Object.assign({}, demo.suggestedConfig, {
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: false }
    }));
    expect(out.warnings.some((w) => w.code === 'suspicious_names')).toBe(true);
    expect(out.warnings.find((w) => w.code === 'suspicious_names').message).toMatch(/may not be questionnaire items/i);
    const cols = out.warnings.find((w) => w.code === 'suspicious_names').columns;
    expect(cols).toEqual(expect.arrayContaining(['Year', 'Effect_yi', 'SE_yi', 'Variance', 'IV_Weight']));
  });

  test('14. small-N warnings fire below 30 respondents', () => {
    const headers = ['Q1', 'Q2', 'Q3'];
    const rows = [];
    for (let i = 0; i < 12; i++) rows.push([1 + (i % 5), 2 + (i % 4), 1 + ((i * 2) % 5)]);
    const out = Rel.analyze(headers, rows, {
      items: headers,
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: false }
    });
    expect(out.ok).toBe(true);
    expect(out.warnings.some((w) => w.code === 'small_n')).toBe(true);
  });

  test('15. negative alpha is flagged as a diagnostic problem, not merely low', () => {
    const headers = ['Q1', 'Q2', 'Q3'];
    const rows = [];
    for (let i = 0; i < 40; i++) {
      const a = 1 + (i % 5);
      rows.push([a, 6 - a, a % 2 ? 1 : 5]);
    }
    const out = Rel.analyze(headers, rows, {
      items: headers,
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: true, standardizedAlpha: false }
    });
    expect(out.ok).toBe(true);
    expect(out.observedResults.alpha).toBeLessThan(0);
    expect(out.observedResults.alphaBand.key).toBe('negative');
    expect(out.warnings.some((w) => w.code === 'negative_alpha')).toBe(true);
  });

  test('16. no NaN or Infinity leaks into JSON-serializable results', () => {
    const demo = Rel.demoLikertScale({ n: 40, seed: 8 });
    const out = Rel.analyze(demo.headers, demo.rows, Object.assign({}, demo.suggestedConfig, {
      rngSeed: 8,
      bootstrapSamples: 30
    }));
    const json = JSON.stringify(out);
    expect(json).not.toMatch(/NaN/);
    expect(json).not.toMatch(/Infinity/);
    const parsed = JSON.parse(json);
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === 'object') return Object.values(node).forEach(walk);
      if (typeof node === 'number') {
        expect(Number.isFinite(node)).toBe(true);
      }
    };
    walk(parsed);
  });

  test('reverse scoring uses min + max − original and does not mutate source rows', () => {
    expect(Rel.reverseValue(1, 1, 5)).toBe(5);
    expect(Rel.reverseValue(5, 1, 5)).toBe(1);
    expect(Rel.reverseValue(3, 1, 5)).toBe(3);
    const snapshot = [[1, 2, 3]];
    Rel.analyze(['Q1', 'Q2', 'Q3'], snapshot, {
      items: ['Q1', 'Q2', 'Q3'],
      reverseItems: ['Q1'],
      scoreRange: { min: 1, max: 5 },
      bootstrapSamples: 0,
      coefficients: { confidenceInterval: false, alpha: true, omegaTotal: false, standardizedAlpha: false }
    });
    expect(snapshot).toEqual([[1, 2, 3]]);
  });

  test('blocking errors for invalid reverse range, group-as-item, and too few items', () => {
    const headers = ['Q1', 'Q2', 'G'];
    const rows = [[1, 2, 'A'], [2, 3, 'B'], [3, 4, 'A']];
    const few = Rel.analyze(headers, rows, { items: ['Q1'] });
    expect(few.ok).toBe(false);
    expect(few.errors.some((e) => e.code === 'too_few_items')).toBe(true);

    const group = Rel.analyze(headers, rows, { items: ['Q1', 'Q2'], groupVariable: 'Q1' });
    expect(group.ok).toBe(false);
    expect(group.errors.some((e) => e.code === 'group_is_item')).toBe(true);

    const range = Rel.analyze(headers, rows, {
      items: ['Q1', 'Q2'],
      reverseItems: ['Q1'],
      scoreRange: { min: 5, max: 1 }
    });
    expect(range.ok).toBe(false);
    expect(range.errors.some((e) => e.code === 'invalid_score_range')).toBe(true);
  });

  test('demo Likert dataset has reverse item, weak item, groups, and missing values', () => {
    const demo = Rel.demoLikertScale({ n: 160, seed: 1 });
    expect(demo.headers).toEqual(expect.arrayContaining(['Q1', 'Q7', 'Q8', 'Site']));
    expect(demo.rows.length).toBe(160);
    expect(demo.notes.reverseItem).toBe('Q7');
    expect(demo.notes.weakItem).toBe('Q8');
    const missing = demo.rows.some((r) => r.some((v) => v === ''));
    expect(missing).toBe(true);
  });
});
