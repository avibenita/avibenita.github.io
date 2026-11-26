/** @jest-environment node */
const facts = require('./interpretation-facts.js');

const screenshot = {
  variable: 'Ages',
  unit: null,
  n: 121,
  mean: 45.107,
  skew: 0.094,
  iqr: 32,
  outliers: { method: 'IQR', flagged: 0, n: 121 },
  confidence: {
    parameter: 'mean',
    method: 'classical',
    level: 0.95,
    side: 'two-sided',
    estimate: 45.107,
    lower: 42.021,
    upper: 48.194
  },
  groups: { status: 'not_run', reason: 'No grouping variable was analysed.' },
  hypothesis: { status: 'not_run', reason: 'No reference-value test was run.' },
  imageInspected: false
};

function textOf(input, view) {
  const built = view
    ? facts.buildUnivariateViewAssessment(input, view)
    : facts.buildUnivariateAssessment(input);
  return facts.assessmentPlainText(built);
}

describe('Univariate overall assessment', () => {
  test('screenshot fixture reports the sample, mean, interval, symmetry, and outlier rule', () => {
    const text = textOf(screenshot);
    expect(text).toMatch(/n = 121/);
    expect(text).toMatch(/45\.11/);
    expect(text).toMatch(/\[42\.02, 48\.19\]/);
    expect(text).toMatch(/classical/i);
    expect(text).toMatch(/two-sided/i);
    expect(text).toMatch(/95%/);
    expect(text).toMatch(/Skewness of 0\.094 suggests approximate symmetry/);
    expect(text).toMatch(/middle 50%/);
    expect(text).toMatch(/32 units/);
    expect(text).toMatch(/No observations were flagged by the selected IQR rule \(0 of 121\)/);
    expect(text).not.toMatch(/wide central|strong symmetry|Symmetry is strong/i);
    expect(text).not.toMatch(/Practical interpretation:\s*Ages|^\s*Ages\s*$/im);
    expect(text).not.toMatch(/\byears\b/i);
    expect(text).toMatch(/does not say that 95% of the individual observations/i);
    expect(text).not.toMatch(/95% of individual ages/i);
    expect(text).not.toMatch(/open By Group/i);
    expect(text).toMatch(/Group comparison has not been run/i);
    expect(text).toMatch(/No reference-value test was run/i);
    expect(text).not.toMatch(/bootstrap/i);
  });

  test('valid tests override a stale not-tested aggregate', () => {
    const tests = [
      { name: 'Shapiro-Wilk', pValue: 0.01 },
      { name: 'Anderson-Darling', pValue: 0.004 },
      { name: 'Kolmogorov-Smirnov', pValue: 0.03 },
      { name: 'Cramer-von Mises', pValue: 0.02 },
      { name: "D'Agostino-Pearson", pValue: 0.20 },
      { name: 'Jarque-Bera', pValue: 0.001 }
    ];
    const text = textOf(Object.assign({}, screenshot, {
      normality: { aggregateStatus: 'not_tested', alpha: 0.05, tests: tests, failCount: 0, passCount: 6 }
    }));
    expect(text).not.toMatch(/not tested|not_tested/i);
    expect(text).toMatch(/evidence of departure from normality/i);
    expect(text).toMatch(/not independent confirmations/i);
    expect(text).toMatch(/does not establish normality/i);
    expect(text).toMatch(/pass\/fail tally does not agree/i);
    expect(text).not.toMatch(/stored count was not used|stale aggregate/i);
  });

  test('an unresolved normality conflict is named and not invented away', () => {
    const text = textOf(Object.assign({}, screenshot, {
      normality: { aggregateStatus: 'not_tested', failCount: 5, passCount: 1, tests: [] }
    }));
    expect(text).toMatch(/conflict/i);
    expect(text).toMatch(/No normality conclusion is drawn/i);
    expect(text).not.toMatch(/evidence of departure from normality/i);
  });

  test('symmetric light-tailed data can still depart from normality without voiding the mean interval', () => {
    const text = textOf({
      variable: 'Measure',
      n: 80,
      mean: 10,
      sd: 1.2,
      skew: 0.02,
      kurt: -1.2,
      iqr: 1.4,
      confidence: {
        parameter: 'mean', method: 'classical', level: 0.95, side: 'two-sided',
        estimate: 10, lower: 9.7, upper: 10.3
      },
      normality: {
        alpha: 0.05,
        tests: [
          { name: 'Shapiro-Wilk', pValue: 0.001 },
          { name: 'Anderson-Darling', pValue: 0.002 }
        ]
      },
      outliers: { status: 'not_run', reason: 'No outlier rule has been applied.' },
      groups: { status: 'not_applicable', reason: 'This analysis has no grouping factor.' },
      hypothesis: { status: 'not_run', reason: 'No reference-value test was run.' }
    });
    expect(text).toMatch(/approximate symmetry/i);
    expect(text).toMatch(/lighter tails/i);
    expect(text).toMatch(/evidence of departure from normality/i);
    expect(text).toMatch(/does not by itself make a mean interval unusable/i);
    expect(text).not.toMatch(/data are normal|distribution is normal|confirmed normal/i);
    expect(text).not.toMatch(/interval is unusable|invalidates the mean/i);
    expect(text).toMatch(/does not apply here/i);
  });

  test('already computed results are included when their views were not opened', () => {
    const text = textOf(Object.assign({}, screenshot, { openedViews: [] }));
    expect(text).toMatch(/\[42\.02, 48\.19\]/);
    expect(text).toMatch(/Skewness of 0\.094/);
  });

  test('interval labels follow method, level, parameter, and side', () => {
    const upper = textOf({
      variable: 'Ages', n: 121, mean: 45.107,
      confidence: { parameter: 'mean', method: 'classical', level: 0.99, side: 'upper', bound: 48.194, estimate: 45.107 },
      outliers: { status: 'not_run' }, groups: { status: 'not_run' }, hypothesis: { status: 'not_run' }
    });
    expect(upper).toMatch(/99%/);
    expect(upper).toMatch(/upper confidence bound/i);
    expect(upper).toMatch(/48\.19/);
    expect(upper).not.toMatch(/\[/);
    expect(upper).not.toMatch(/±/);
    expect(upper).not.toMatch(/from .+ to/i);

    const bootstrap = textOf({
      variable: 'Ages', n: 121,
      confidence: { parameter: 'median', method: 'bootstrap', level: 0.95, side: 'two-sided', estimate: 44, lower: 40, upper: 49 },
      outliers: { status: 'not_run' }, groups: { status: 'not_run' }, hypothesis: { status: 'not_run' }
    });
    expect(bootstrap).toMatch(/bootstrap/i);
    expect(bootstrap).toMatch(/median/i);
    expect(bootstrap).not.toMatch(/classical/i);

    const plan = textOf({
      variable: 'Ages', n: 40, mean: 10,
      confidence: { status: 'not_run', reason: 'No confidence interval has been computed.' },
      planning: { parameter: 'mean', method: 'classical', level: 0.95, side: 'two-sided', lower: 9, upper: 11 },
      outliers: { status: 'not_run' }, groups: { status: 'not_run' }, hypothesis: { status: 'not_run' }
    });
    expect(plan).toMatch(/planning assumptions/i);
    expect(plan).toMatch(/not an observed result/i);
    expect(plan).not.toMatch(/The classical 95% two-sided confidence interval for the mean is/);
  });
});

describe('freshness, failures, and boundaries', () => {
  test('a late response is not the current interpretation', () => {
    expect(facts.acceptResponse('A', 'B')).toBe(false);
    expect(facts.acceptResponse('B', 'B')).toBe(true);
    expect(facts.shouldRequestOnControlChange('input')).toBe(false);
    const stale = { text: 'Assessment A', stale: true, fingerprint: 'A', currentFingerprint: 'B' };
    expect(facts.textForExport(stale)).toBeNull();
    expect(facts.textForCopy(stale)).toMatch(/Out of date/);
    expect(facts.textForCopy({ text: 'Assessment B', stale: false, fingerprint: 'B', currentFingerprint: 'B' })).toBe('Assessment B');
  });

  test('small samples, zero variation, missing diagnostics, and bad responses stay limited', () => {
    expect(textOf({ variable: 'Ages', n: 1, mean: 5 })).toMatch(/too small/i);
    const flat = textOf({
      variable: 'Ages', n: 10, mean: 5, sd: 0,
      confidence: { status: 'invalid', reason: 'A normal-theory mean interval is undefined when the standard deviation is 0.' },
      normality: { status: 'unavailable', reason: 'Skewness is undefined for this sample.' },
      outliers: { status: 'failed', reason: 'The outlier rule failed.' },
      groups: { status: 'not_run' }, hypothesis: { status: 'not_run' },
      missing: 4, excluded: 2
    });
    expect(flat).toMatch(/standard deviation is 0/i);
    expect(flat).toMatch(/undefined when the standard deviation is 0/i);
    expect(flat).toMatch(/4 missing and 2 excluded/i);
    expect(flat).not.toMatch(/\[/);

    const provider = facts.classifyInterpretationResponse({ error: new Error('HTTP 500') });
    expect(provider.ok).toBe(false);
    expect(provider.error).toMatch(/failed/i);
    const malformed = facts.classifyInterpretationResponse({ parsed: { INSIGHT: 'Ages' }, mode: 'full' });
    expect(malformed.ok).toBe(false);
    expect(malformed.error).toMatch(/incomplete/i);
  });

  test('a one-word practical line is omitted', () => {
    expect(facts.usableNarrative('Ages', 'Ages')).toBe('');
    expect(facts.usableNarrative('The mean interval is uncertainty for the mean.', 'Ages')).toMatch(/uncertainty/);
  });
});

describe('module distinctions', () => {
  test('pairwise text names the actual adjustment', () => {
    const tukey = facts.describePairwise({ procedure: 'tukey', correction: 'bonferroni', familySize: 6 });
    expect(tukey).toMatch(/Tukey–Kramer already adjusts/);
    expect(tukey).toMatch(/second bonferroni correction is not applied/i);
    expect(tukey).toMatch(/not the unadjusted/i);
    const holm = facts.describePairwise({ procedure: 'mann-whitney', correction: 'holm', familySize: 6 });
    expect(holm).toMatch(/Holm adjustment across 6/);
    expect(holm).toMatch(/not the unadjusted/i);
    const none = facts.describePairwise({ procedure: 'mann-whitney', correction: 'none', familySize: 3 });
    expect(none).toMatch(/not multiplicity-adjusted/i);
  });

  test('logistic event coding follows the supplied event level', () => {
    const forward = facts.logisticStatements({ outcome: { eventLevel: 'yes', nonEventLevel: 'no' } }).join(' ');
    const reversed = facts.logisticStatements({ outcome: { eventLevel: 'no', nonEventLevel: 'yes' } }).join(' ');
    expect(forward).toMatch(/event level is yes/);
    expect(forward).toMatch(/non-event level is no/);
    expect(reversed).toMatch(/event level is no/);
    expect(reversed).toMatch(/non-event level is yes/);
    expect(forward).toMatch(/not a risk ratio/i);
    expect(forward).toMatch(/reverses the odds-ratio direction/i);
    expect(forward).not.toMatch(/modeled event level is no/);
  });

  test('a temporary regression refit stays distinct from the original fit', () => {
    const text = facts.describeTemporaryRefit({
      status: 'ready', omittedLabel: 'row 4', nOriginal: 30, nTemporary: 29
    });
    expect(text).toMatch(/temporary refit omits row 4/i);
    expect(text).toMatch(/original n = 30/);
    expect(text).toMatch(/temporary n = 29/);
    expect(text).toMatch(/original fit is unchanged/i);
    const guarded = facts.enforceRequiredFindings({ FINDINGS: ['The model fits well.'] }, [text]);
    expect(guarded.FINDINGS[0]).toBe(text);
  });

  test('view text stays on that view', () => {
    const view = facts.buildUnivariateViewAssessment(screenshot, 'confidence');
    const body = facts.assessmentPlainText(view);
    expect(body).toMatch(/\[42\.02, 48\.19\]/);
    expect(body).not.toMatch(/Group comparison has not been run/);
    expect(view.meta.ruleBased).toBe(true);
  });

  test('stored numeric results are kept when a view was not the source of the strings', () => {
    const input = facts.assembleUnivariateInput({
      stored: { column: 'Ages', descriptive: { n: 121, mean: 45.107, skewness: 0.094, q1: 30, q3: 62 } },
      collected: {
        confidence: {
          lcl: '42.02',
          ucl: '48.19',
          numeric: {
            method: 'classical', parameter: 'mean', level: 0.95, side: 'two-sided',
            estimate: 45.107, lower: 42.021, upper: 48.194
          }
        },
        outliers: { numeric: { method: 'IQR', count: 0, n: 121 } },
        normality: {
          meta: { alpha: 0.05 },
          tests: [{ name: 'Shapiro-Wilk', pValue: 0.01 }]
        }
      }
    });
    expect(input.mean).toBe(45.107);
    expect(input.confidence.lower).toBe(42.021);
    expect(input.iqr).toBe(32);
    expect(input.outliers.flagged).toBe(0);
    const text = facts.assessmentPlainText(facts.buildUnivariateAssessment(input));
    expect(text).toMatch(/\[42\.02, 48\.19\]/);
    expect(text).toMatch(/evidence of departure/i);
  });

  test('missing group and hypothesis results are not described as not run', () => {
    const input = facts.assembleUnivariateInput({
      stored: {
        column: 'Ages',
        descriptive: { n: 121, mean: 45.107, stdDev: 12, median: 44, min: 18, max: 80, skewness: 0.094, q1: 30, q3: 62 },
        rowFilterActive: true,
        sourceRowsAll: new Array(130),
        sourceRows: new Array(121),
        missingCount: 4
      }
    });
    const text = facts.assessmentPlainText(facts.buildUnivariateAssessment(input));
    expect(text).toMatch(/median|quartiles/i);
    expect(text).toMatch(/standard deviation is 12/i);
    expect(text).toMatch(/range is 18 to 80/i);
    expect(text).toMatch(/4 missing/);
    expect(text).toMatch(/9 excluded/);
    expect(text).toMatch(/not supplied|not available/i);
    expect(text).not.toMatch(/has not been run/i);
    expect(text).toMatch(/mean and the median are close/i);
  });

  test('a completed hypothesis record survives leaving the hypothesis view', () => {
    const record = facts.hypothesisFromRecord({
      testType: 'One-sample t', method: 'classical', parameter: 'mean', h0Value: 40, orientation: 'two-sided', testStat: 2.4, pValue: 0.018, alpha: 0.05
    });
    const text = facts.assessmentPlainText(facts.buildUnivariateAssessment(Object.assign({}, screenshot, { hypothesis: record })));
    expect(text).toMatch(/One-sample t/);
    expect(text).toMatch(/40/);
    expect(text).toMatch(/classical/);
    expect(text).toMatch(/p = \.018/);
    expect(text).not.toMatch(/No reference-value test was run/);
  });

  test('module assessments quote the computed payload', () => {
    const logistic = facts.assessmentPlainText(facts.buildKnownModuleAssessment('logistic', {
      outcome: { name: 'Admit', eventLevel: 'yes', nonEventLevel: 'no' },
      fit: { observations: 200, events: 40, auc: 0.81 },
      coefficients: [{ name: 'Score', inModel: true, oddsRatio: 1.4, orCi95: [1.1, 1.8], p: 0.01, reference: null }],
      classificationAtThreshold: { threshold: '0.50' }
    }));
    expect(logistic).toMatch(/event level yes/i);
    expect(logistic).toMatch(/not a risk/i);
    expect(logistic).toMatch(/Score/);
    expect(logistic).toMatch(/Rule-based|association/i);
    const reversed = facts.assessmentPlainText(facts.buildKnownModuleAssessment('logistic', {
      outcome: { eventLevel: 'no', nonEventLevel: 'yes' }, fit: { observations: 10, events: 3 }, coefficients: []
    }));
    expect(reversed).toMatch(/event level no/i);

    const means = facts.assessmentPlainText(facts.buildKnownModuleAssessment('independent', {
      design: { k: 3 }, setup: { alpha: 0.01 }, groups: { summary: { totalN: 90, totalMissing: 2 } },
      results: { decision: { primary: { test: 'anova', p: 0.004 } }, omnibus: { welch: { p: 0.02 } } },
      assumptions: { homogeneity: { levene: { p: 0.4 } } },
      posthoc: { available: true, method: 'tukey', correction: 'builtin', rows: [{}, {}, {}] },
      effects: { kplus: { eta2: 0.12 } }
    }));
    expect(means).toMatch(/alpha = \.01/);
    expect(means).toMatch(/Tukey–Kramer/);
    expect(means).toMatch(/does not prove equal variances/i);
    expect(means).toMatch(/2 values are recorded as missing/);

    const table = facts.assessmentPlainText(facts.buildKnownModuleAssessment('contingency', {
      rowVar: 'Treatment', colVar: 'Outcome', representedN: 80, nRows: 2, nCols: 2,
      tests: { pearson: { stat: 4.2, df: 1, p: 0.04 } },
      measures2x2: {
        layout: { rowIndex: 'Drug', rowReference: 'Placebo', colEvent: 'Yes' },
        oddsRatio: { available: true, value: 2.5 },
        riskRatio: { available: true, value: 1.8 }
      }
    }));
    expect(table).toMatch(/represented n = 80/);
    expect(table).toMatch(/Odds ratio 2\.5/);
    expect(table).toMatch(/Risk ratio 1\.8/);
    expect(table).toMatch(/not the odds ratio/i);
    expect(table).toMatch(/Drug/);

    const refit = facts.assessmentPlainText(facts.buildKnownModuleAssessment('regression', {
      results: { yVariable: 'Yield', observations: 30, rSquared: 0.62, fPValue: 0.001 },
      temporaryRefit: { status: 'ready', omittedLabel: 'row 4', nOriginal: 30, nTemporary: 29 }
    }));
    expect(refit).toMatch(/original fit is unchanged/i);
    expect(refit).toMatch(/R² = 0\.62/);

    const corr = facts.assessmentPlainText(facts.buildKnownModuleAssessment('correlations', {
      data: { variables: ['A', 'B', 'C'], rows: 40 },
      matrix: { pairs: [{ x: 'A', y: 'B', r: 0.4, n: 28 }], strongest: [{ x: 'A', y: 'B', r: 0.4, n: 28 }] },
      partial: { headerRows: 40, selected: { x: 'A', y: 'B', n: 28, controls: ['C'], unadjusted: { r: 0.4 }, partial: { r: 0.15 } } }
    }));
    expect(corr).toMatch(/Pearson/);
    expect(corr).toMatch(/pair n = 28/);
    expect(corr).toMatch(/partial r = 0\.15/);
    expect(corr).toMatch(/header row count is 40/);
    expect(corr).toMatch(/does not establish causation/i);

    const partialView = facts.assessmentPlainText(facts.buildKnownModuleAssessment('partial-correlations', {
      data: { variables: ['Floor Area', 'Employees', 'Monthly Sales'], rows: 500 },
      matrix: { pairs: [{ x: 'Floor Area', y: 'Employees', r: 0.613, n: 500 }], strongest: [{ x: 'Floor Area', y: 'Employees', r: 0.613, n: 500 }] },
      partial: {
        headerRows: 500,
        controls: ['Monthly Sales'],
        selected: {
          x: 'Floor Area', y: 'Employees', n: 500, controls: ['Monthly Sales'], deltaR: -0.069,
          unadjusted: { r: 0.613, p: 0.0001 }, partial: { r: 0.544, p: 0.0001 },
          change: { code: 'persists', label: 'Association is similar after adjustment.' }
        }
      }
    }));
    expect(partialView).toMatch(/After adjusting for Monthly Sales/);
    expect(partialView).toMatch(/partial r = 0\.544/);
    expect(partialView).toMatch(/similar after adjustment/i);
    expect(partialView).not.toMatch(/largest \|r\|/);

    const noAdjust = facts.assessmentPlainText(facts.buildKnownModuleAssessment('partial-correlations', {
      matrix: { strongest: [{ x: 'A', y: 'B', r: 0.4, n: 28 }] },
      partial: { controls: [] }
    }));
    expect(noAdjust).toMatch(/Nothing is in Adjust for/);
    expect(noAdjust).toMatch(/No partial correlation has been computed/);

    const power = facts.assessmentPlainText(facts.buildKnownModuleAssessment('power', {
      mode: 'power', f: 0.25, k: 3, alpha: 0.05, N: 60, power: 0.72, fromObserved: true
    }));
    expect(power).toMatch(/not additional evidence/i);
    expect(power).toMatch(/72%/);

    const mixed = facts.assessmentPlainText(facts.buildKnownModuleAssessment('mixed', {
      outcome: 'Score', n: 120, nGroups: 30, method: 'REML', covarianceStructure: 'unstructured', converged: true, ICC: 0.2
    }));
    expect(mixed).toMatch(/30 groups/);
    expect(mixed).toMatch(/not independent sample units/i);
  });
});
