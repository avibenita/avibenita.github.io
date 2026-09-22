/** @jest-environment node */
const Meta = require('./meta-engine.js');

function holtSpec(overrides) {
  return Object.assign({
    effectType: 'direct',
    effectMeasure: 'logor',
    numeratorLabel: 'Stronger social relationships',
    referenceLabel: 'Weaker social relationships',
    eventLabel: 'Survival',
    outcomeBetter: 'higher'
  }, overrides);
}

describe('parseNumber Unicode / whitespace', () => {
  test('reads Unicode minus and thin/nbsp so Holt-Lunstad lnOR cells stay numeric', () => {
    const values = [
      0.12, -0.04, '\u22120.318', ' 0.55 ', '\u00A0\u22120.091\u00A0',
      '\u20130.220', '1,25'
    ];
    const parsed = values.map(Meta.parseNumber);
    expect(parsed.every(isFinite)).toBe(true);
    expect(parsed[2]).toBeCloseTo(-0.318, 10);
    expect(parsed[4]).toBeCloseTo(-0.091, 10);
    expect(parsed[5]).toBeCloseTo(-0.220, 10);
    expect(parsed[6]).toBeCloseTo(1.25, 10);
  });

  test('does not treat age-band text as a number', () => {
    expect(Number.isFinite(Meta.parseNumber('35–49'))).toBe(false);
    expect(Number.isFinite(Meta.parseNumber('65+'))).toBe(false);
  });
});

describe('precomputed ratio defaults', () => {
  test('log OR defaults to Group A / Group B / Event / not specified', () => {
    const d = Meta.defaultDirectionLabels({ effectType: 'direct', effectMeasure: 'logor' });
    expect(d.numeratorLabel).toBe('Group A');
    expect(d.referenceLabel).toBe('Group B');
    expect(d.eventLabel).toBe('Event');
    expect(d.outcomeBetter).toBe('none');
  });

  test('binary keeps Treatment / Control and adverse-by-default event meaning', () => {
    const d = Meta.defaultDirectionLabels({ effectType: 'binary', effectMeasure: 'or' });
    expect(d.numeratorLabel).toBe('Treatment');
    expect(d.referenceLabel).toBe('Control');
    expect(d.outcomeBetter).toBe('lower');
  });

  test('generic effect does not assume Treatment / Control', () => {
    const spec = { effectType: 'direct', effectMeasure: 'generic' };
    expect(Meta.comparisonLabel(spec)).toBe('Negative effect / Positive effect');
    expect(Meta.forestFavorLabels(spec)).toEqual({
      left: 'Negative effect',
      right: 'Positive effect'
    });
  });
});

describe('direction logic for ratios', () => {
  const or = { effectType: 'direct', effectMeasure: 'logor' };

  test('OR > 1 with beneficial event favours numerator', () => {
    const spec = Object.assign({}, or, {
      numeratorLabel: 'Group A',
      referenceLabel: 'Group B',
      eventLabel: 'Recovery',
      outcomeBetter: 'higher'
    });
    expect(Meta.favoredGroup(1.55, spec)).toBe('Group A');
    expect(Meta.forestFavorLabels(spec)).toEqual({
      left: 'Favours Group B',
      right: 'Favours Group A'
    });
    const text = Meta.interpretRatio(spec, 1.55, 1.46, 1.64).lead;
    expect(text).toMatch(/greater odds of Recovery/);
    expect(text).not.toMatch(/risk/i);
  });

  test('OR > 1 with adverse event favours reference', () => {
    const spec = Object.assign({}, or, {
      numeratorLabel: 'Treatment',
      referenceLabel: 'Control',
      eventLabel: 'Death',
      outcomeBetter: 'lower'
    });
    expect(Meta.favoredGroup(1.55, spec)).toBe('Control');
    expect(Meta.forestFavorLabels(spec)).toEqual({
      left: 'Favours Treatment',
      right: 'Favours Control'
    });
    const text = Meta.interpretRatio(spec, 1.55, 1.46, 1.64).lead;
    expect(text).toMatch(/greater odds of Death/);
    expect(text).not.toMatch(/risk/i);
  });

  test('OR < 1 with beneficial event favours reference', () => {
    const spec = Object.assign({}, or, {
      numeratorLabel: 'Group A',
      referenceLabel: 'Group B',
      eventLabel: 'Survival',
      outcomeBetter: 'higher'
    });
    expect(Meta.favoredGroup(0.70, spec)).toBe('Group B');
    const text = Meta.interpretRatio(spec, 0.70, 0.55, 0.88).lead;
    expect(text).toMatch(/lower odds of Survival/);
    expect(text).not.toMatch(/risk/i);
  });

  test('OR < 1 with adverse event favours numerator', () => {
    const spec = Object.assign({}, or, {
      numeratorLabel: 'Treatment',
      referenceLabel: 'Control',
      eventLabel: 'Relapse',
      outcomeBetter: 'lower'
    });
    expect(Meta.favoredGroup(0.70, spec)).toBe('Treatment');
    const text = Meta.interpretRatio(spec, 0.70, 0.55, 0.88).lead;
    expect(text).toMatch(/lower odds of Relapse/);
    expect(text).not.toMatch(/risk/i);
  });

  test('unspecified event meaning hides favours and uses lower/higher ratio labels', () => {
    const spec = Object.assign({}, or, { outcomeBetter: 'none' });
    expect(Meta.favoredGroup(1.55, spec)).toBe(null);
    expect(Meta.forestFavorLabels(spec)).toEqual({
      left: 'Lower ratio',
      right: 'Higher ratio'
    });
    const interp = Meta.interpretRatio(spec, 1.55, 1.46, 1.64);
    expect(interp.favored).toBe(null);
    expect(interp.lead).not.toMatch(/favour/i);
    expect(interp.change).toBe('55% higher odds');
    expect(interp.lead).not.toMatch(/risk/i);
  });

  test('custom observational group labels appear in the header', () => {
    const spec = holtSpec({ outcomeBetter: 'higher' });
    const header = Meta.resultsHeader(spec);
    expect(header.comparison).toBe('Stronger social relationships / Weaker social relationships');
    expect(header.outcomeLine).toBe('Outcome: Survival · Beneficial');
  });
});

describe('binary raw-count labels stay editable defaults', () => {
  test('Treatment / Control remain the binary defaults and OR still says odds', () => {
    const spec = {
      effectType: 'binary',
      effectMeasure: 'or',
      numeratorLabel: 'Drug',
      referenceLabel: 'Placebo',
      eventLabel: 'Relapse',
      outcomeBetter: 'lower'
    };
    expect(Meta.defaultDirectionLabels({ effectType: 'binary', effectMeasure: 'or' }).numeratorLabel).toBe('Treatment');
    expect(Meta.favoredGroup(0.70, spec)).toBe('Drug');
    expect(Meta.interpretRatio(spec, 0.70, 0.55, 0.88).lead).toMatch(/lower odds of Relapse/);
    expect(Meta.interpretRatio(spec, 0.70, 0.55, 0.88).lead).not.toMatch(/risk/i);
  });
});

describe('OR vs RR wording', () => {
  test('OR wording uses odds, never risk', () => {
    const spec = { effectType: 'direct', effectMeasure: 'logor', outcomeBetter: 'none' };
    expect(Meta.ratioQuantityWord(spec)).toBe('odds');
    expect(Meta.describeRatioChange(spec, 1.55)).toBe('55% higher odds');
    expect(Meta.interpretRatio(spec, 1.55, 1.46, 1.64).lead).not.toMatch(/risk/i);
  });

  test('RR wording uses risk', () => {
    const spec = { effectType: 'direct', effectMeasure: 'logrr', outcomeBetter: 'none' };
    expect(Meta.ratioQuantityWord(spec)).toBe('risk');
    expect(Meta.describeRatioChange(spec, 1.55)).toBe('55% higher risk');
    expect(Meta.interpretRatio(spec, 1.55, 1.46, 1.64).lead).toMatch(/risk/);
  });
});

describe('Holt-Lunstad beneficial OR', () => {
  test('association sentence uses custom labels and odds', () => {
    const spec = holtSpec({ outcomeBetter: 'higher' });
    const interp = Meta.interpretRatio(spec, 1.55, 1.46, 1.64);
    expect(interp.lead).toBe(
      'Stronger social relationships were associated with greater odds of Survival, OR = 1.550, 95% CI [1.460, 1.640]'
    );
    expect(interp.favored).toBe('Stronger social relationships');
    expect(interp.forest).toEqual({
      left: 'Favours Weaker social relationships',
      right: 'Favours Stronger social relationships'
    });
    expect(interp.lead).not.toMatch(/risk/i);
    expect(interp.lead).not.toMatch(/Treatment|Control/);
  });
});

describe('Holt-Lunstad sized import', () => {
  test('all 148 lnOR values parse when 9 use Unicode minus / nbsp', () => {
    const headers = ['Study', 'lnOR', 'SE'];
    const rows = [];
    for (let i = 0; i < 148; i++) {
      const yi = (i % 11 === 0) ? -0.12 - i / 400 : 0.08 + i / 500;
      const raw = (i % 16 === 0)
        ? ('\u2212' + Math.abs(yi).toFixed(4))
        : (i % 19 === 0)
          ? ('\u00A0' + yi.toFixed(4) + '\u00A0')
          : yi;
      rows.push(['Study ' + (i + 1), raw, 0.12 + (i % 7) * 0.01]);
    }
    const spec = {
      effectType: 'direct',
      effectMeasure: 'logor',
      studyCol: 0,
      effectCol: 1,
      seCol: 2,
      uncertaintyType: 'se',
      model: 'random',
      tauEstimator: 'dl',
      hartungKnapp: false,
      outcomeBetter: 'none'
    };
    const bundle = Meta.buildMetaBundle(headers, rows, spec);
    expect(bundle.error).toBeFalsy();
    expect(bundle.k).toBe(148);
    expect(bundle.studies).toHaveLength(148);
  });
});

describe('extractStudyEffect numeric import', () => {
  test('accepts Unicode minus in precomputed log OR + SE', () => {
    const spec = {
      effectType: 'direct',
      effectMeasure: 'logor',
      effectCol: 0,
      seCol: 1,
      uncertaintyType: 'se'
    };
    const ok = Meta.extractStudyEffect(['\u22120.437', '0.11'], spec);
    expect(ok).not.toBe(null);
    expect(ok.yi).toBeCloseTo(-0.437, 10);
    const dropped = Meta.extractStudyEffect(['35–49', '0.11'], spec);
    expect(dropped).toBe(null);
  });
});
