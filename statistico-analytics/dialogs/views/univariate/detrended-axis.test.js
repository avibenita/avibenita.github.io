/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const Axis = require('./detrended-axis.js');

const PP_PAIRS = [
  { caseId: 4, theoretical: 0.180, observed: 0.005 },
  { caseId: 12, theoretical: 0.447, observed: 0.545 },
  { caseId: 7, theoretical: 0.500, observed: 0.620 },
  { caseId: 3, theoretical: 0.950, observed: 0.925 }
];

function ppModel(zoom) {
  return Axis.modelFromPairs(PP_PAIRS, { mode: 'pp', zoom: zoom == null ? 1 : zoom });
}

describe('detrended P–P / Q–Q axis', () => {
  test('P–P fixture residuals and auto limits show every point', () => {
    const model = ppModel(1);
    expect(model.ok).toBe(true);
    expect(model.points.map((p) => p.residual)).toEqual([-0.175, 0.098, 0.12, -0.025]);
    expect(model.rawHalfRange).toBeCloseTo(0.1925, 10);
    expect(model.lAuto).toBeCloseTo(0.2, 10);
    expect(model.bounds.min).toBeCloseTo(-0.2, 10);
    expect(model.bounds.max).toBeCloseTo(0.2, 10);
    expect(model.counts.outside).toBe(0);
    expect(model.counts.plotted).toBe(4);
    expect(model.notice.visible).toBe(false);
    expect(model.yTitle).toBe('Probability difference');
    expect(model.zoom).toBe(1);
    expect(model.rangeLabel).toBe('Y: \u22120.20 to +0.20');
    model.points.forEach((point) => {
      expect(Math.abs(point.residual)).toBeLessThan(model.lAuto);
    });
  });

  test('manual zoom counts points outside the viewport and keeps residual values', () => {
    const auto = ppModel(1);
    const residuals = auto.points.map((p) => p.residual);
    const ids = auto.points.map((p) => p.caseId);
    const at2 = Axis.withZoom(auto, 2);
    expect(at2.bounds.min).toBeCloseTo(-0.1, 10);
    expect(at2.bounds.max).toBeCloseTo(0.1, 10);
    expect(at2.counts).toMatchObject({ above: 1, below: 1, outside: 2, plotted: 4 });
    expect(at2.notice.text).toBe('2 points outside view');
    expect(at2.notice.aboveText).toBe('\u2191 1 above');
    expect(at2.notice.belowText).toBe('\u2193 1 below');
    expect(at2.points.map((p) => p.residual)).toEqual(residuals);
    expect(at2.points.map((p) => p.caseId)).toEqual(ids);

    const at4 = Axis.withZoom(auto, 4);
    expect(at4.bounds.max).toBeCloseTo(0.05, 10);
    expect(at4.counts).toMatchObject({ above: 2, below: 1, outside: 3, plotted: 4 });
    expect(at4.notice.text).toBe('3 points outside view');
    expect(at4.notice.aboveText).toBe('\u2191 2 above');
    expect(at4.points.map((p) => p.residual)).toEqual(residuals);

    const reset = Axis.withZoom(at4, 1);
    expect(reset.zoom).toBe(1);
    expect(reset.counts.outside).toBe(0);
    expect(reset.bounds.max).toBeCloseTo(0.2, 10);
    expect(reset.points.map((p) => p.residual)).toEqual(residuals);
    expect(reset.controls.resetVisible).toBe(false);
    expect(reset.controls.outDisabled).toBe(true);
    expect(reset.controls.inDisabled).toBe(false);
  });

  test('a residual exactly on the viewport edge stays inside', () => {
    expect(Axis.outsideCounts([-0.1, 0.1], -0.1, 0.1)).toMatchObject({
      above: 0, below: 0, outside: 0, plotted: 2
    });
    expect(Axis.outsideCounts([-0.1 - 1e-9, 0.1 + 1e-9], -0.1, 0.1)).toMatchObject({
      above: 1, below: 1, outside: 2
    });
  });

  test('zoom steps stay on 1, 2, 4 and 8 and the axis matches the factor', () => {
    expect(Axis.stepZoom(1, 1)).toBe(2);
    expect(Axis.stepZoom(2, 1)).toBe(4);
    expect(Axis.stepZoom(4, 1)).toBe(8);
    expect(Axis.stepZoom(8, 1)).toBe(8);
    expect(Axis.stepZoom(8, -1)).toBe(4);
    expect(Axis.stepZoom(2, -1)).toBe(1);
    expect(Axis.stepZoom(1, -1)).toBe(1);
    const at8 = Axis.withZoom(ppModel(1), 8);
    expect(at8.controls.inDisabled).toBe(true);
    expect(at8.controls.outDisabled).toBe(false);
    expect(at8.controls.factorLabel).toBe('8\u00d7');
    expect(at8.controls.resetVisible).toBe(true);
    expect(at8.bounds.max).toBeCloseTo(0.025, 10);
    expect(at8.rangeLabel).toBe('Y: \u22120.025 to +0.025');
    expect(at8.rangeLabel).not.toMatch(/0\.00/);
    const axis = Axis.yAxisOptions(at8);
    expect(axis.startOnTick).toBe(false);
    expect(axis.endOnTick).toBe(false);
    expect(axis.minPadding).toBe(0);
    expect(axis.maxPadding).toBe(0);
    expect(axis.tickPositions[0]).toBeCloseTo(axis.min, 12);
    expect(axis.tickPositions[axis.tickPositions.length - 1]).toBeCloseTo(axis.max, 12);
    expect(Axis.formatAxisTick(0.025)).toBe('0.025');
    expect(Axis.formatAxisTick(-0.025)).toBe('\u22120.025');
  });

  test('all-zero residuals keep a nonzero symmetric axis', () => {
    const pp = Axis.modelFromPairs(
      [{ caseId: 1, theoretical: 0.4, observed: 0.4 }],
      { mode: 'pp' }
    );
    expect(pp.ok).toBe(true);
    expect(pp.lAuto).toBeCloseTo(0.01, 12);
    expect(pp.bounds.min).toBeCloseTo(-pp.bounds.max, 12);
    expect(pp.counts.outside).toBe(0);
    expect(pp.points[0].residual).toBe(0);

    const qq = Axis.modelFromPairs(
      [
        { caseId: 1, theoretical: 1, observed: 1 },
        { caseId: 2, theoretical: 2, observed: 2 }
      ],
      { mode: 'qq', sampleSd: 10 }
    );
    expect(qq.ok).toBe(true);
    expect(qq.lAuto).toBeCloseTo(0.5, 10);
    expect(qq.counts.outside).toBe(0);
    expect(qq.yTitle).toBe('Quantile difference');

    const standardized = Axis.modelFromPairs(
      [{ caseId: 1, theoretical: 0, observed: 0 }],
      { mode: 'qq', standardized: true }
    );
    expect(standardized.lAuto).toBeCloseTo(0.05, 12);
    expect(standardized.yTitle).toBe('Standardized quantile difference');

    const undefinedScale = Axis.modelFromPairs(
      [{ caseId: 1, theoretical: 3, observed: 3 }],
      { mode: 'qq', sampleSd: 0 }
    );
    expect(undefinedScale.ok).toBe(false);
    expect(undefinedScale.reason).toBe('undefined-scale');
    expect(Axis.modelFromPairs([], { mode: 'pp' }).reason).toBe('empty');
    expect(Axis.zoomControlState(1, false).controlsDisabled).toBe(true);
  });

  test('Q–Q residual uses the reference line in observed units', () => {
    const model = Axis.modelFromPairs([
      { caseId: 5, theoretical: 1, observed: 13 },
      { caseId: 6, theoretical: 1, observed: 12 }
    ], {
      mode: 'qq',
      reference: { intercept: 10, slope: 2 },
      sampleSd: 4
    });
    expect(model.points[0].residual).toBe(1);
    expect(model.points[1].residual).toBe(0);
    expect(model.yTitle).toBe('Quantile difference');
    expect(model.yTitle).not.toBe('Probability difference');
    const lines = Axis.tooltipLines(model.points[0], 'qq');
    expect(lines[0]).toBe('Case 5');
    expect(lines[1]).toMatch(/Theoretical quantile/);
    expect(lines[2]).toMatch(/Observed quantile/);
    expect(lines[3]).toBe('Quantile difference: +1.00');
  });

  test('P–P tooltip names the probability difference', () => {
    const model = ppModel(1);
    const lines = Axis.tooltipLines(model.points[1], 'pp');
    expect(lines).toEqual([
      'Case 12',
      'Theoretical probability: 0.447',
      'Sample probability: 0.545',
      'Probability difference: +0.098'
    ]);
  });

  test('changing mode or data returns zoom to auto', () => {
    const dataKey = Axis.contextKey({
      mode: 'pp',
      distribution: 'normal',
      variable: 'Waiting_Time_min',
      signature: Axis.dataSignature([1, 2, 3])
    });
    const same = Axis.contextKey({
      mode: 'pp',
      distribution: 'normal',
      variable: 'Waiting_Time_min',
      signature: Axis.dataSignature([1, 2, 3])
    });
    const switched = Axis.contextKey({
      mode: 'qq',
      distribution: 'normal',
      variable: 'Waiting_Time_min',
      signature: Axis.dataSignature([1, 2, 3])
    });
    const refit = Axis.contextKey({
      mode: 'pp',
      distribution: 'gamma',
      variable: 'Waiting_Time_min',
      signature: Axis.dataSignature([1, 2, 3])
    });
    expect(Axis.zoomForContext(4, dataKey, same)).toBe(4);
    expect(Axis.zoomForContext(4, dataKey, switched)).toBe(1);
    expect(Axis.zoomForContext(8, dataKey, refit)).toBe(1);
    expect(Axis.dataSignature([1, 2, 3])).not.toBe(Axis.dataSignature([1, 2, 4]));
  });

  test('very small limits are not labeled 0.00', () => {
    expect(Axis.formatRange(-1.2e-6, 1.2e-6)).toMatch(/e/);
    expect(Axis.formatRange(-1.2e-6, 1.2e-6)).not.toMatch(/0\.00/);
    expect(Axis.formatSigned(-0.05)).toBe('\u22120.05');
    expect(Axis.formatRange(-0.05, 0.05)).toBe('Y: \u22120.05 to +0.05');
  });

  test('the P–P page no longer hard-codes a ±0.10 detrended axis', () => {
    const html = fs.readFileSync(path.join(__dirname, 'qqplot-standalone.html'), 'utf8');
    expect(html).not.toMatch(/residualYAxisMax\s*=\s*0\.10/);
    expect(html).not.toMatch(/confidenceBand/);
    expect(html).toContain('detrended-axis.js');
    expect(html).toContain('Zoom Y in');
    expect(html).toContain('Zoom Y out');
    expect(html).toContain('Reset to Auto');
    expect(html).toContain('Y-zoom magnifies deviations. Check the axis values when assessing their size.');
    expect(html).toContain("currentPlotType === 'pp' ? 0 : undefined");
    expect(html).toContain('DetrendedAxis.modelFromPairs');
  });
});
