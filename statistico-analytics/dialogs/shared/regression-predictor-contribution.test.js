/** @jest-environment node */
const { computeOLS } = require('../../src/shared/js/core/regression-compute.js');
const Trace = require('./regression-case-trace.js');
const Contribution = require('./regression-predictor-contribution.js');

function fit(spec) {
  return Contribution.compute(Object.assign({
    includeIntercept: true,
    computeOLS: computeOLS,
    log: function () {}
  }, spec));
}

function referenceDesign() {
  const points = [];
  [-1, 1].forEach(function (x) {
    [-1, 1].forEach(function (s) {
      [-1, 1].forEach(function (g) {
        points.push({
          x: x,
          s: s,
          g: g,
          y: 100 + 8 * x + 4 * s + 3 * g + 2 * x * g + x * s * g
        });
      });
    });
  });
  return {
    xMatrix: points.map(function (row) {
      const dummy = String(row.g) === '1' ? 1 : 0;
      return [row.x, row.s, dummy, row.x * dummy];
    }),
    yVector: points.map(function (row) { return row.y; }),
    columns: [
      { key: 'Ad Spend', name: 'Ad Spend', kind: 'numeric', sourceIndex: 0 },
      { key: 'Store Size', name: 'Store Size', kind: 'numeric', sourceIndex: 1 },
      { key: 'Region_1', name: 'Region_1', kind: 'dummy', factor: 'Region', level: '1', sourceIndex: 2 },
      {
        key: 'Ad Spend × Region_1',
        name: 'Ad Spend × Region_1',
        kind: 'interaction',
        factors: [
          { kind: 'numeric', name: 'Ad Spend' },
          { kind: 'dummy', factor: 'Region', level: '1' }
        ],
        sourceIndex: 3
      }
    ]
  };
}

function columnSpecs(xnSorted, categoricalInfo, interactionInfo) {
  const columns = [];
  const push = function (spec) {
    spec.sourceIndex = columns.length;
    columns.push(spec);
  };
  xnSorted.forEach(function (name) { push({ key: name, name: name, kind: 'numeric' }); });
  categoricalInfo.forEach(function (catInfo) {
    catInfo.dummyNames.forEach(function (dummyName, di) {
      push({
        key: dummyName,
        name: dummyName,
        kind: 'dummy',
        factor: catInfo.name,
        level: String(catInfo.categories[di + 1])
      });
    });
  });
  interactionInfo.forEach(function (ixi) {
    const ixKey = ixi.v1 + ' × ' + ixi.v2;
    if (ixi.v1IsNumeric && ixi.v2Cat) {
      ixi.v2Cat.dummyNames.forEach(function (dummyName, i) {
        push({
          key: ixi.v1 + ' × ' + dummyName,
          name: ixi.v1 + ' × ' + dummyName,
          kind: 'interaction',
          ixKey: ixKey,
          factors: [
            { kind: 'numeric', name: ixi.v1 },
            { kind: 'dummy', factor: ixi.v2Cat.name, level: String(ixi.v2Cat.categories[i + 1]) }
          ]
        });
      });
    }
  });
  return columns;
}

function bar(result, name) {
  return result.bars.find(function (item) { return item.name === name; });
}

describe('predictor contribution reference', () => {
  test('ranks the eight-point Ad Spend, Store Size, and Region drops', () => {
    const design = referenceDesign();
    const widths = [];
    const result = fit({
      xMatrix: design.xMatrix,
      yVector: design.yVector,
      columns: design.columns,
      computeOLS: function (X, Y, intercept) {
        widths.push(intercept === false ? 0 : X[0].length);
        expect(Y).toEqual(design.yVector);
        return computeOLS(X, Y, intercept, 0.05);
      }
    });

    expect(result.status).toBe('ready');
    expect(result.n).toBe(8);
    expect(Math.abs(result.fullR2 - 93 / 94)).toBeLessThan(Contribution.roundoff);
    expect(widths).toEqual([4, 2, 3, 2]);
    expect(result.bars.map(function (item) { return item.name; })).toEqual(['Ad Spend', 'Store Size', 'Region']);

    const spend = bar(result, 'Ad Spend');
    const size = bar(result, 'Store Size');
    const region = bar(result, 'Region');
    expect(Math.abs(spend.drop - 68 / 94)).toBeLessThan(Contribution.roundoff);
    expect(Math.abs(spend.reducedR2 - 25 / 94)).toBeLessThan(Contribution.roundoff);
    expect(spend.removedKeys).toEqual(['Ad Spend', 'Ad Spend × Region_1']);
    expect(spend.broaderThanMainEffect).toBe(true);

    expect(Math.abs(size.drop - 16 / 94)).toBeLessThan(Contribution.roundoff);
    expect(Math.abs(size.reducedR2 - 77 / 94)).toBeLessThan(Contribution.roundoff);
    expect(size.removedKeys).toEqual(['Store Size']);
    expect(size.broaderThanMainEffect).toBe(false);

    expect(Math.abs(region.drop - 13 / 94)).toBeLessThan(Contribution.roundoff);
    expect(Math.abs(region.reducedR2 - 80 / 94)).toBeLessThan(Contribution.roundoff);
    expect(region.removedKeys).toEqual(['Region_1', 'Ad Spend × Region_1']);
    expect(region.broaderThanMainEffect).toBe(true);
    expect(result.unavailable).toEqual([]);
  });

  test('drops every contrast and interaction on the analyzed rows only', () => {
    const headers = ['Spend', 'Region', 'Sales'];
    const rows = [
      [0, 'East', 1],
      [1, '', 50],
      [2, 'North', 3],
      [3, 'South', 4],
      [4, 'East', 2],
      [5, 'North', 5],
      [6, 'South', 6],
      [7, 'East', 3],
      [8, 'North', 4],
      [9, null, 9],
      [10, 'South', 7]
    ];
    const categories = ['East', 'North', 'South'];
    const categoricalInfo = [{
      name: 'Region',
      index: 1,
      categories: categories,
      dummyNames: ['Region_North', 'Region_South']
    }];
    const interactionInfo = [{
      v1: 'Spend',
      v2: 'Region',
      v1IsNumeric: true,
      v2IsNumeric: false,
      v1Cat: null,
      v2Cat: categoricalInfo[0],
      v1Idx: 0,
      v2Idx: 1
    }];
    const design = Trace.buildAnalyzedDesign({
      headers: headers,
      rows: rows,
      address: 'Sheet1!A1:C12',
      yIndex: 2,
      xnIndices: [0],
      categoricalInfo: categoricalInfo,
      interactionInfo: interactionInfo
    });
    expect(design.ok).toBe(true);
    expect(design.usedOriginalRowIndices).toEqual([0, 2, 3, 4, 5, 6, 7, 8, 10]);

    const calls = [];
    const result = fit({
      xMatrix: design.xMatrix,
      yVector: design.yVector,
      columns: columnSpecs(['Spend'], categoricalInfo, interactionInfo),
      computeOLS: function (X, Y, intercept) {
        calls.push({
          width: intercept === false ? 0 : X[0].length,
          y: Y.slice()
        });
        return computeOLS(X, Y, intercept, 0.05);
      }
    });

    expect(result.status).toBe('ready');
    expect(result.n).toBe(design.yVector.length);
    expect(result.n).toBe(9);
    calls.forEach(function (call) {
      expect(call.y).toEqual(design.yVector);
      expect(call.y).not.toContain(50);
      expect(call.y).not.toContain(9);
    });
    const region = bar(result, 'Region');
    expect(region.removedKeys).toEqual([
      'Region_North',
      'Region_South',
      'Spend × Region_North',
      'Spend × Region_South'
    ]);
    expect(region.broaderThanMainEffect).toBe(true);
    expect(calls[0].width).toBe(5);
    expect(calls[2].width).toBe(1);
    expect(calls[2].y).toEqual(design.yVector);
  });

  test('removes a higher-order term from every predictor it depends on', () => {
    const design = referenceDesign();
    [-1, 1, 1, -1, 1, -1, -1, 1].forEach(function (value, index) {
      design.xMatrix[index].push(value);
    });
    design.columns.push({
      key: 'Ad Spend × Store Size × Region',
      name: 'Ad Spend × Store Size × Region',
      kind: 'interaction',
      factors: [
        { kind: 'numeric', name: 'Ad Spend' },
        { kind: 'numeric', name: 'Store Size' },
        { kind: 'dummy', factor: 'Region', level: '1' }
      ],
      sourceIndex: 4
    });
    const result = fit(design);
    expect(result.status).toBe('ready');
    ['Ad Spend', 'Store Size', 'Region'].forEach(function (name) {
      expect(bar(result, name).removedKeys).toContain('Ad Spend × Store Size × Region');
    });
  });
});

describe('predictor contribution boundaries', () => {
  test('compares a one-predictor model with an intercept-only refit', () => {
    const result = fit({
      xMatrix: [[1], [2], [3], [4]],
      yVector: [1, 2, 3, 4],
      columns: [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }]
    });
    expect(result.status).toBe('ready');
    expect(result.n).toBe(4);
    expect(result.bars).toHaveLength(1);
    expect(Math.abs(result.bars[0].reducedR2)).toBeLessThan(Contribution.roundoff);
    expect(Math.abs(result.bars[0].drop - result.fullR2)).toBeLessThan(Contribution.roundoff);
    expect(result.bars[0].drop).toBeGreaterThan(0.99);
    expect(result.bars[0].broaderThanMainEffect).toBe(false);
  });

  test('keeps a true zero drop selectable and breaks ties by predictor order', () => {
    const zero = fit({
      xMatrix: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ],
      yVector: [5, 5, 9, 9],
      columns: [
        { key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 },
        { key: 'z', name: 'z', kind: 'numeric', sourceIndex: 1 }
      ]
    });
    expect(zero.status).toBe('ready');
    expect(zero.bars.map(function (item) { return item.name; })).toEqual(['x', 'z']);
    expect(bar(zero, 'z').status).toBe('ready');
    expect(bar(zero, 'z').drop).toBe(0);

    const tied = fit({
      xMatrix: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ],
      yVector: [3, 7, 7, 11],
      columns: [
        { key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 },
        { key: 'z', name: 'z', kind: 'numeric', sourceIndex: 1 }
      ]
    });
    expect(tied.bars.map(function (item) { return item.name; })).toEqual(['x', 'z']);
    expect(Math.abs(bar(tied, 'x').drop - bar(tied, 'z').drop)).toBeLessThan(Contribution.roundoff);
  });

  test('lists a failed reduced fit as unavailable without a zero bar', () => {
    let calls = 0;
    const result = fit({
      xMatrix: [[1, 0], [2, 1], [3, 0], [4, 1]],
      yVector: [1, 2, 3, 6],
      columns: [
        { key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 },
        { key: 'z', name: 'z', kind: 'numeric', sourceIndex: 1 }
      ],
      computeOLS: function (X, Y, intercept) {
        calls += 1;
        if (calls === 2) throw new Error('singular reduced fit');
        return computeOLS(X, Y, intercept, 0.05);
      }
    });
    expect(result.status).toBe('ready');
    expect(result.unavailable.map(function (item) { return item.name; })).toEqual(['x']);
    expect(result.unavailable[0].reason).toMatch(/could not be computed/);
    expect(result.bars.map(function (item) { return item.name; })).toEqual(['z']);
    expect(result.bars.every(function (item) { return item.drop !== 0 || item.name !== 'x'; })).toBe(true);
  });

  test('clamps solver roundoff and rejects a materially negative drop', () => {
    const y = [1, 2, 3, 4];
    const warnings = [];
    const tiny = fit({
      xMatrix: [[1], [2], [3], [4]],
      yVector: y,
      columns: [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }],
      log: function (message) { warnings.push(message); },
      computeOLS: function (X, Y, intercept) {
        if (intercept === false) {
          return { n: 4, k: 1, SSR: 2 - 1e-12, includeIntercept: true, coefficients: [0] };
        }
        return { n: 4, k: 2, SSR: 2, includeIntercept: true, coefficients: [0, 0] };
      }
    });
    expect(tiny.bars[0].drop).toBe(0);
    expect(tiny.bars[0].status).toBe('ready');
    expect(warnings).toEqual([]);

    const logged = [];
    const negative = fit({
      xMatrix: [[1], [2], [3], [4]],
      yVector: y,
      columns: [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }],
      log: function (message) { logged.push(message); },
      computeOLS: function (X, Y, intercept) {
        if (intercept === false) {
          return { n: 4, k: 1, SSR: 1, includeIntercept: true, coefficients: [0] };
        }
        return { n: 4, k: 2, SSR: 2, includeIntercept: true, coefficients: [0, 0] };
      }
    });
    expect(negative.bars).toEqual([]);
    expect(negative.unavailable[0].status).toBe('unavailable');
    expect(logged[0]).toMatch(/materially negative/);
  });

  test('uses the compact unavailable and omit states', () => {
    expect(fit({
      xMatrix: [[1], [2], [3]],
      yVector: [4, 4, 4],
      columns: [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }]
    }).reason).toMatch(/does not vary/);

    expect(fit({
      includeIntercept: false,
      xMatrix: [[1], [2]],
      yVector: [1, 2],
      columns: [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }]
    }).status).toBe('omit');

    expect(fit({
      weighted: [1, 1],
      xMatrix: [[1], [2]],
      yVector: [1, 3],
      columns: [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }]
    }).reason).toBe('weighted');

    expect(fit({
      xMatrix: [[1], [2], [3], [4]],
      yVector: [1, 2, 3, 4],
      columns: []
    }).reason).toBe('intercept-only');

    const unsafe = fit({
      xMatrix: [[1, 0], [2, 1], [3, 1], [4, 0]],
      yVector: [1, 2, 4, 3],
      columns: [
        { key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 },
        {
          key: 'x × Region',
          name: 'x × Region',
          kind: 'interaction',
          factors: [{ kind: 'numeric', name: 'x' }, { kind: 'dummy', factor: 'Region', level: 'B' }],
          sourceIndex: 1
        }
      ]
    });
    expect(unsafe.status).toBe('unavailable');
    expect(unsafe.reason).toMatch(/Term grouping/);

    expect(fit({
      groupingUnsafe: true,
      xMatrix: [[1], [2], [3], [4]],
      yVector: [1, 3, 2, 5],
      columns: [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }]
    }).status).toBe('unavailable');

    expect(fit({
      groupingUnsafe: true,
      xMatrix: [[1, 0], [2, 1], [3, 0], [4, 1]],
      yVector: [1, 2, 3, 4],
      columns: []
    }).reason).toMatch(/Term grouping/);

    const singular = fit({
      xMatrix: [[0], [0], [0], [0]],
      yVector: [1, 2, 3, 4],
      columns: [{ key: 'x', name: 'x', kind: 'numeric', sourceIndex: 0 }]
    });
    expect(singular.status).toBe('unavailable');
    expect(singular.reason).toMatch(/baseline/);
  });

  test('discards a stale fit token after a newer fit starts', () => {
    const tokens = Contribution.createTokenSource();
    const first = tokens.begin();
    const design = referenceDesign();
    const session = Contribution.createSession(Object.assign({ includeIntercept: true, computeOLS: computeOLS }, design));
    const second = tokens.begin();
    while (!session.done) session.step();
    expect(tokens.isCurrent(first)).toBe(false);
    expect(tokens.isCurrent(second)).toBe(true);
    expect(session.result.n).toBe(8);
  });
});
