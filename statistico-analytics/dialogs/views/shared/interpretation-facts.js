/**
 * Deterministic interpretation facts.
 * Statistical decisions and availability live here. Narrative text may only
 * report what these functions derive from supplied results.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StatisticoInterpretation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function finite(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() && !/[a-z%/]/i.test(value)) {
      var parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  function formatEstimate(value) {
    var n = finite(value);
    if (n === null) return null;
    if (Math.abs(n - Math.round(n)) < 1e-9 && (Math.abs(n) >= 1 || n === 0)) return String(Math.round(n));
    var digits = Math.abs(n) >= 1 ? 2 : 3;
    return n.toFixed(digits);
  }

  function formatP(value) {
    var n = finite(value);
    if (n === null) return null;
    if (n < 0) return null;
    if (n === 0 || n < 0.001) return 'p < .001';
    var body = n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    return 'p = ' + body.replace(/^0(?=\.)/, '');
  }

  function formatLevel(level) {
    var n = finite(level);
    if (n === null) return null;
    var pct = n > 1 ? n : n * 100;
    var rounded = Math.round(pct * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded)) + '%';
    return rounded.toFixed(1) + '%';
  }

  function formatAlpha(alpha) {
    var n = finite(alpha);
    if (n === null) return null;
    if (n === 0 || n < 0.001) return '< .001';
    var text = n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    if (text.indexOf('.') === -1) text += '.0';
    return text.replace(/^0(?=\.)/, '');
  }

  function words(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean);
  }

  function usableNarrative(text, variableName) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (words(t).length < 2) return '';
    if (variableName && t.toLowerCase() === String(variableName).toLowerCase()) return '';
    return t;
  }

  function unitPhrase(unit, count) {
    var u = String(unit || '').trim();
    if (!u) return count === 1 ? 'unit' : 'units';
    return u;
  }

  function describeShape(input) {
    input = input || {};
    var skew = finite(input.skew);
    if (skew === null) skew = finite(input.skewness);
    var kurt = finite(input.kurt);
    if (kurt === null) kurt = finite(input.kurtosis);
    if (kurt === null) kurt = finite(input.excessKurtosis);
    var parts = [];
    if (skew === null) {
      parts.push('Skewness is not available for this sample.');
    } else if (Math.abs(skew) < 0.2) {
      parts.push('Skewness of ' + formatEstimate(skew) + ' suggests approximate symmetry.');
    } else if (Math.abs(skew) < 0.5) {
      parts.push('Skewness of ' + formatEstimate(skew) + ' suggests mild asymmetry.');
    } else if (skew > 0) {
      parts.push('Skewness of ' + formatEstimate(skew) + ' indicates a longer right tail.');
    } else {
      parts.push('Skewness of ' + formatEstimate(skew) + ' indicates a longer left tail.');
    }
    if (kurt !== null) {
      if (kurt <= -0.5) {
        parts.push('Excess kurtosis of ' + formatEstimate(kurt) + ' indicates lighter tails than a normal curve. Approximate symmetry and lighter tails can occur together with a departure from normality.');
      } else if (kurt >= 0.5) {
        parts.push('Excess kurtosis of ' + formatEstimate(kurt) + ' indicates heavier tails than a normal curve.');
      } else {
        parts.push('Excess kurtosis of ' + formatEstimate(kurt) + ' does not by itself show markedly heavy or light tails.');
      }
    }
    return { text: parts.join(' '), skew: skew, kurtosis: kurt };
  }

  function describeSpread(input) {
    input = input || {};
    var iqr = finite(input.iqr);
    if (iqr === null && finite(input.q1) !== null && finite(input.q3) !== null) {
      iqr = finite(input.q3) - finite(input.q1);
    }
    if (iqr === null) return { text: '', iqr: null };
    var noun = input.variable ? String(input.variable) : 'the observations';
    var text = 'The middle 50% of ' + noun + ' span ' + formatEstimate(iqr) + ' ' + unitPhrase(input.unit, iqr) + '.';
    text += ' That span describes the observations. It is not the uncertainty of the mean.';
    return { text: text, iqr: iqr };
  }

  function describeOutliers(input) {
    input = input || {};
    if (input.status === 'not_run' || input.status === 'not_applicable') {
      return { text: input.reason || 'No outlier rule has been applied.' };
    }
    if (input.status === 'failed' || input.status === 'unavailable') {
      return { text: input.reason || 'The outlier rule did not return a result.' };
    }
    var flagged = finite(input.flagged);
    if (flagged === null) flagged = finite(input.count);
    if (flagged === null && Array.isArray(input.outliers)) flagged = input.outliers.length;
    if (flagged === null) return { text: 'An outlier rule was not applied, so no outlier conclusion is included.' };
    var method = String(input.method || input.rule || 'the selected rule');
    var n = finite(input.n);
    var countBit = n !== null ? ' (' + formatEstimate(flagged) + ' of ' + String(Math.round(n)) + ')' : '';
    if (flagged === 0) {
      return { text: 'No observations were flagged by the selected ' + method + ' rule' + countBit + '. A flag count does not certify data quality or the absence of influential observations.' };
    }
    return { text: formatEstimate(flagged) + ' observation' + (flagged === 1 ? ' was' : 's were') + ' flagged by the selected ' + method + ' rule' + countBit + '. A flag is a rule result, not a decision that the observation is an error.' };
  }

  function sideOf(ci) {
    var side = String(ci.side || ci.intervalSide || 'two-sided').toLowerCase();
    if (side === 'two' || side === 'both' || side === 'two_sided') return 'two-sided';
    if (side.indexOf('upper') !== -1) return 'upper';
    if (side.indexOf('lower') !== -1) return 'lower';
    return 'two-sided';
  }

  function parameterName(parameter) {
    var key = String(parameter || 'mean').toLowerCase();
    if (key === 'sd' || key === 'stdev' || key === 'standard deviation') return 'standard deviation';
    if (key === 'median') return 'median';
    if (key === 'percentile') return 'percentile';
    if (key === 'variance') return 'variance';
    return 'mean';
  }

  function methodName(method) {
    var key = String(method || '').toLowerCase();
    if (!key) return null;
    if (key.indexOf('boot') !== -1) return 'bootstrap';
    if (key.indexOf('classic') !== -1 || key.indexOf('t ') !== -1 || key === 't') return 'classical';
    return key;
  }

  function describeInterval(ci) {
    ci = ci || {};
    if (ci.status === 'not_run' || ci.status === 'not_applicable') {
      return { text: ci.reason || 'No confidence interval has been computed.', planning: false };
    }
    if (ci.status === 'failed' || ci.status === 'unavailable' || ci.status === 'invalid') {
      return { text: ci.reason || 'The confidence interval is unavailable.', planning: false };
    }
    var planning = !!(ci.planning || ci.role === 'projection');
    var level = formatLevel(ci.level != null ? ci.level : ci.confidenceLevel);
    var parameter = parameterName(ci.parameter);
    var method = methodName(ci.method);
    var side = sideOf(ci);
    var estimate = finite(ci.estimate);
    if (estimate === null) estimate = finite(ci.center);
    var lower = finite(ci.lower);
    if (lower === null) lower = finite(ci.lcl);
    var upper = finite(ci.upper);
    if (upper === null) upper = finite(ci.ucl);
    var bound = finite(ci.bound);
    var methodBit = method ? method + ' ' : '';
    var levelBit = level ? level + ' ' : '';
    var lead = planning
      ? 'Under the stated planning assumptions, a projected ' + methodBit + levelBit
      : 'The ' + methodBit + levelBit;
    var text;
    if (side === 'upper') {
      var upperBound = bound !== null ? bound : upper;
      if (upperBound === null) return { text: 'An upper confidence bound was requested, but no finite bound was returned.', planning: planning };
      text = lead + 'upper confidence bound for the ' + parameter + ' is ' + formatEstimate(upperBound) + '.';
    } else if (side === 'lower') {
      var lowerBound = bound !== null ? bound : lower;
      if (lowerBound === null) return { text: 'A lower confidence bound was requested, but no finite bound was returned.', planning: planning };
      text = lead + 'lower confidence bound for the ' + parameter + ' is ' + formatEstimate(lowerBound) + '.';
    } else {
      if (lower === null || upper === null) {
        return { text: 'A two-sided interval was requested, but both endpoints were not available.', planning: planning };
      }
      text = lead + 'two-sided confidence interval for the ' + parameter + ' is [' + formatEstimate(lower) + ', ' + formatEstimate(upper) + '].';
    }
    if (estimate !== null && !planning) {
      text += ' The estimate is ' + formatEstimate(estimate) + '.';
    }
    if (planning) {
      text += ' This is a projection, not an observed result.';
    } else if (parameter === 'mean' && side === 'two-sided') {
      var stated = level || 'the stated confidence';
      text += ' The interval describes uncertainty in the mean. It does not say that ' + stated + ' of the individual observations fall inside it, and it does not assign that confidence as a probability for the fixed population mean.';
    } else if (parameter === 'mean') {
      text += ' The bound describes uncertainty in the mean. It is not a range for individual observations, and it does not assign a probability to the fixed population mean.';
    }
    if (!method) text += ' The estimation method was not recorded with the interval.';
    return { text: text, planning: planning, side: side, parameter: parameter, method: method };
  }

  function listTests(tests) {
    if (!tests) return [];
    var rows = Array.isArray(tests) ? tests : Object.keys(tests).map(function (name) {
      var row = tests[name] || {};
      return Object.assign({ name: name }, row);
    });
    return rows.map(function (row) {
      if (!row) return null;
      var p = finite(row.pValue);
      if (p === null) p = finite(row.p);
      return {
        name: row.name || row.test || 'Test',
        pValue: p,
        status: row.status || (p === null ? 'unavailable' : 'completed'),
        valid: row.valid !== false && row.status !== 'failed' && row.status !== 'invalid'
      };
    }).filter(Boolean);
  }

  function resolveNormality(input) {
    input = input || {};
    var alpha = finite(input.alpha);
    var tests = listTests(input.tests);
    var completed = tests.filter(function (row) {
      return row.valid && row.status !== 'unavailable' && row.pValue !== null;
    });
    var aggregate = input.aggregateStatus != null ? String(input.aggregateStatus) : '';
    var failCount = finite(input.failCount);
    var passCount = finite(input.passCount);
    var hasCount = failCount !== null || passCount !== null;
    var aggregateSaysUnrun = /not[_\s-]*tested|not[_\s-]*run|unavailable/i.test(aggregate);

    if (!completed.length) {
      if (hasCount || (aggregate && !aggregateSaysUnrun)) {
        return {
          state: 'conflict',
          text: 'The normality records conflict'
            + (aggregate ? ' (aggregate status ' + aggregate.replace(/_/g, ' ') + ')' : '')
            + (hasCount ? ', with a recorded pass/fail count' : '')
            + ', and no individual completed test results were supplied. No normality conclusion is drawn.'
        };
      }
      if (input.status === 'failed') {
        return { state: 'unavailable', text: input.reason || 'The normality tests failed, so no normality conclusion is drawn.' };
      }
      return {
        state: 'not_run',
        text: input.reason || 'Normality tests have not been run, so this assessment does not conclude that the sample is normal or non-normal.'
      };
    }

    var alphaText = alpha === null ? 'the recorded significance level' : 'alpha = ' + formatAlpha(alpha);
    var below = completed.filter(function (row) { return alpha === null ? false : row.pValue < alpha; });
    var above = completed.filter(function (row) { return alpha === null ? true : row.pValue >= alpha; });
    if (alpha === null) {
      return {
        state: 'conflict',
        text: 'Completed normality tests were supplied, but no significance level was recorded with them. No departure decision is drawn.'
      };
    }
    var namesBelow = below.map(function (row) { return row.name + ' (' + formatP(row.pValue) + ')'; });
    var namesAbove = above.map(function (row) { return row.name + ' (' + formatP(row.pValue) + ')'; });
    var text = completed.length + ' normality test' + (completed.length === 1 ? '' : 's') + ' completed at ' + alphaText + '. ';
    if (below.length && above.length) {
      text += below.length + ' of them have a p-value below alpha (' + namesBelow.join('; ') + '), and ' + above.length + (above.length === 1 ? ' does not (' : ' do not (') + namesAbove.join('; ') + '). ';
      text += 'The tests share this sample, so the count is not a vote and the tests are not independent confirmations. ';
      text += 'The pattern is evidence of departure from normality. A p-value that is not below alpha does not establish normality.';
    } else if (below.length) {
      text += 'Each completed test has a p-value below alpha (' + namesBelow.join('; ') + '). ';
      text += 'The tests share this sample, so they are not independent confirmations. Together they are evidence of departure from normality.';
    } else {
      text += 'None have a p-value below alpha (' + namesAbove.join('; ') + '). ';
      text += 'That is no clear evidence of departure from normality. It does not establish that the distribution is normal.';
    }
    if (aggregateSaysUnrun) {
      text += ' A stale aggregate status was ignored because the individual test results are present.';
    }
    if (hasCount) {
      var countedFail = failCount === null ? 0 : failCount;
      if (countedFail !== below.length) {
        text += ' The stored pass/fail count does not match these p-values, so the count is not used.';
      }
    }
    return { state: 'completed', text: text, below: below.length, completed: completed.length, alpha: alpha };
  }

  function coverageNote(input) {
    input = input || {};
    var name = input.name || 'This analysis';
    var status = String(input.status || 'not_run');
    if (status === 'completed' || status === 'computed') return input.summary || '';
    if (status === 'not_applicable' || status === 'inapplicable') {
      return name + ' does not apply here' + (input.reason ? ': ' + input.reason : '.');
    }
    if (status === 'failed' || status === 'invalid' || status === 'unavailable') {
      return name + ' is unavailable' + (input.reason ? ': ' + input.reason : '.');
    }
    if (status === 'loading') return name + ' is still computing.';
    if (status === 'stale') return name + ' changed after this text was generated.';
    return name + ' has not been run' + (input.reason ? '. ' + input.reason : '.');
  }

  function describeGroups(input) {
    input = input || {};
    if (input.summary && (input.status === 'completed' || input.status === 'computed')) {
      var text = input.summary;
      if (input.descriptive !== false) {
        text += ' Visible group differences are descriptive unless a formal comparison supports them.';
      }
      return text;
    }
    return coverageNote({
      name: 'Group comparison',
      status: input.status || 'not_run',
      reason: input.reason || 'No grouping variable was analysed, so there is no group-consistency finding.'
    });
  }

  function describeHypothesis(input) {
    input = input || {};
    if (input.status === 'completed' || (finite(input.pValue) !== null && input.name)) {
      var bits = [input.name || 'The reference-value test'];
      if (input.nullValue != null) bits.push('compares the estimate with ' + input.nullValue);
      if (input.alternative) bits.push('(' + input.alternative + ')');
      var p = formatP(input.pValue);
      var stat = finite(input.statistic);
      var detail = bits.join(' ');
      if (stat !== null) detail += ', statistic ' + formatEstimate(stat);
      if (p) detail += ', ' + p;
      if (finite(input.alpha) !== null) detail += ' at alpha = ' + formatAlpha(input.alpha);
      detail += '.';
      return detail;
    }
    if (input.reason) return input.reason;
    return coverageNote({
      name: 'A reference-value test',
      status: input.status || 'not_run',
      reason: 'No test conclusion is included.'
    });
  }

  function consequenceForMeanInterval(normality, sample) {
    if (!normality || normality.state !== 'completed') return '';
    if (!/evidence of departure/.test(normality.text) || /no clear evidence of departure/.test(normality.text)) return '';
    var n = sample && finite(sample.n);
    var skew = sample && finite(sample.skew);
    var sizeBit = n !== null ? ' The analyzed sample size is ' + Math.round(n) + '.' : '';
    var skewBit = skew !== null ? ' Skewness is ' + formatEstimate(skew) + '.' : '';
    return 'Evidence of departure from normality does not by itself make a mean interval unusable.' + sizeBit + skewBit
      + ' Usefulness also depends on the interval method, extreme values, and the parameter being estimated. These summaries do not establish independence or representative sampling.';
  }

  function pushUnique(list, text) {
    var cleaned = usableNarrative(text);
    if (!cleaned) return;
    if (list.indexOf(cleaned) !== -1) return;
    list.push(cleaned);
  }

  function buildUnivariateAssessment(input) {
    input = input || {};
    var variable = input.variable || input.varName || 'the variable';
    var n = finite(input.n);
    var mean = finite(input.mean);
    var sd = finite(input.sd);
    if (sd === null) sd = finite(input.stdDev);
    var limitations = [];
    var findings = [];
    var support = [];
    var diagnostics = [];

    if (finite(input.missing) !== null || finite(input.excluded) !== null) {
      var miss = finite(input.missing);
      var excluded = finite(input.excluded);
      var bits = [];
      if (miss !== null) bits.push(Math.round(miss) + ' missing');
      if (excluded !== null) bits.push(Math.round(excluded) + ' excluded');
      limitations.push(bits.join(' and ') + ' values are outside this analyzed sample.');
    }

    if (n === null || n < 2) {
      return {
        sections: {
          CONCLUSION: 'The analyzed sample is too small for a mean interval or for these distributional diagnostics.',
          FINDINGS: [],
          SUPPORT: n === null ? [] : ['n = ' + Math.round(n)],
          DIAGNOSTICS: [],
          INTERPRETATION: '',
          LIMITATIONS: ['No inferential result is invented from an insufficient sample.'],
          GROUP_CONSISTENCY: describeGroups(input.groups),
          ACTION: [],
          REPORT: ''
        },
        meta: { ruleBased: true, omitStrengthBadge: true, primarySignal: variable, strengthLevel: null, strengthNote: '' }
      };
    }

    var shape = describeShape(input);
    var spread = describeSpread(Object.assign({ variable: variable, unit: input.unit || null }, input));
    var outliers = describeOutliers(Object.assign({ n: n }, input.outliers || { status: 'not_run', reason: 'No outlier rule has been applied.' }));
    var interval = describeInterval(input.confidence || { status: 'not_run', reason: 'No confidence interval has been computed.' });
    var planning = input.planning ? describeInterval(Object.assign({ planning: true, role: 'projection' }, input.planning)) : null;
    var normality = resolveNormality(input.normality || { status: 'not_run' });
    var hypothesis = describeHypothesis(input.hypothesis);
    var groups = describeGroups(input.groups);

    if (sd === 0) {
      limitations.push('The sample standard deviation is 0. Shape ratios that divide by the standard deviation are undefined, and a normal-theory interval for the mean is not produced from that standard deviation.');
    }

    var conclusionParts = [];
    conclusionParts.push('For ' + variable + ', n = ' + Math.round(n) + (mean !== null ? ' and the sample mean is ' + formatEstimate(mean) : '') + '.');
    var intervalReported = !!(input.confidence && input.confidence.status !== 'not_run' && input.confidence.status !== 'failed' && input.confidence.status !== 'unavailable' && input.confidence.status !== 'invalid');
    if (interval.text && intervalReported) conclusionParts.push(interval.text);
    else if (interval.text) limitations.push(interval.text);

    pushUnique(findings, shape.text);
    pushUnique(findings, spread.text);
    if (finite(input.median) !== null) pushUnique(findings, 'The median is ' + formatEstimate(input.median) + '.');
    if (sd !== null && sd !== 0) pushUnique(findings, 'The sample standard deviation is ' + formatEstimate(sd) + '.');
    if (finite(input.min) !== null && finite(input.max) !== null) {
      pushUnique(findings, 'The observed range is ' + formatEstimate(input.min) + ' to ' + formatEstimate(input.max) + '.');
    }
    pushUnique(findings, outliers.text);

    if (mean !== null) support.push('n = ' + Math.round(n) + ', mean = ' + formatEstimate(mean));
    if (shape.skew !== null) support.push('skewness = ' + formatEstimate(shape.skew));
    if (spread.iqr !== null) support.push('IQR = ' + formatEstimate(spread.iqr));
    if (interval.text && !interval.planning && input.confidence && input.confidence.status !== 'not_run') support.push(interval.text);

    pushUnique(diagnostics, normality.text);
    if (!input.imageInspected) {
      pushUnique(diagnostics, 'No plot image was supplied to this interpretation, so the reading uses the numeric results only.');
    }
    var consequence = consequenceForMeanInterval(normality, { n: n, skew: shape.skew });
    if (consequence && intervalReported && parameterName(input.confidence.parameter) === 'mean' && !interval.planning) {
      pushUnique(diagnostics, consequence);
    }
    pushUnique(limitations, hypothesis);
    if (planning && planning.text) pushUnique(limitations, planning.text);
    limitations.push('These summaries do not establish that the observations are independent or that the sample is representative.');

    var interpretation = '';
    if (interval.text && !interval.planning && parameterName((input.confidence || {}).parameter) === 'mean') {
      interpretation = 'The mean interval and the middle-50% span answer different questions: one is uncertainty for the mean, and the other is the spread of the observations.';
    }

    var report = [conclusionParts.join(' '), findings[0] || '', diagnostics[0] || ''].filter(Boolean).join(' ');

    return {
      sections: {
        CONCLUSION: conclusionParts.join(' '),
        FINDINGS: findings,
        SUPPORT: support,
        DIAGNOSTICS: diagnostics,
        INTERPRETATION: usableNarrative(interpretation, variable),
        LIMITATIONS: limitations.filter(function (line, index, all) { return line && all.indexOf(line) === index; }),
        GROUP_CONSISTENCY: groups,
        ACTION: [],
        REPORT: report
      },
      meta: {
        ruleBased: true,
        omitStrengthBadge: true,
        primarySignal: (mean !== null ? 'Mean ' + formatEstimate(mean) : variable) + (n !== null ? ', n = ' + Math.round(n) : ''),
        strengthLevel: null,
        strengthNote: '',
        viewsBrowsed: input.viewsBrowsed || []
      }
    };
  }

  function buildUnivariateViewAssessment(input, view) {
    var full = buildUnivariateAssessment(input);
    var key = String(view || '');
    var bottom = full.sections.CONCLUSION;
    var evidence = full.sections.FINDINGS.slice();
    var meaning = full.sections.INTERPRETATION;
    var checks = [];
    if (key === 'confidence') {
      bottom = describeInterval(input.confidence || { status: 'not_run', reason: 'No confidence interval has been computed for this view.' }).text;
      evidence = [bottom];
      meaning = 'Read the bound as uncertainty for the stated parameter and method.';
      if (input.planning) checks.push(describeInterval(Object.assign({ planning: true }, input.planning)).text);
    } else if (key === 'normality') {
      bottom = resolveNormality(input.normality || { status: 'not_run' }).text;
      evidence = [bottom];
      meaning = 'A single significant test is evidence about that test. It is not a vote across the battery, and a nonsignificant test does not prove normality.';
    } else if (key === 'outliers' || key === 'boxplot-outliers') {
      bottom = describeOutliers(Object.assign({ n: input.n }, input.outliers || { status: 'not_run' }));
      bottom = bottom.text;
      evidence = [bottom];
      meaning = 'The flag uses the selected rule only.';
    } else if (key === 'hypothesis') {
      bottom = describeHypothesis(input.hypothesis);
      evidence = [bottom];
      meaning = '';
    } else if (key === 'qqplot') {
      var reference = input.qqplot && (input.qqplot.referenceDistribution || input.qqplot.distribution);
      bottom = reference
        ? 'This view compares the sample with the selected ' + reference + ' reference. No plot image was supplied, so the interpretation does not claim a visual inspection.'
        : 'No plot image was supplied, so this interpretation does not claim a visual inspection of the reference plot.';
      evidence = [describeShape(input).text];
      meaning = '';
    }
    return {
      sections: {
        BOTTOMLINE: bottom,
        EVIDENCE: evidence.filter(Boolean),
        MEANING: meaning,
        CHECKS: checks,
        NEXT: []
      },
      meta: { ruleBased: true, omitStrengthBadge: true, primarySignal: full.meta.primarySignal }
    };
  }

  function pickNumber() {
    for (var i = 0; i < arguments.length; i += 1) {
      var n = finite(arguments[i]);
      if (n !== null) return n;
    }
    return null;
  }

  function assembleUnivariateInput(sources) {
    sources = sources || {};
    var stored = sources.stored || {};
    var descriptive = stored.descriptive || stored.stats || {};
    var computed = sources.descriptives || {};
    var collected = sources.collected || {};
    var n = pickNumber(descriptive.n, stored.n, computed.n);
    var mean = pickNumber(descriptive.mean, computed.mean);
    var sd = pickNumber(descriptive.stdDev, descriptive.sd, computed.sd);
    var skew = pickNumber(descriptive.skewness, descriptive.skew, computed.skew);
    var kurt = pickNumber(descriptive.kurtosis, descriptive.kurt, computed.kurt);
    if (n !== null && n < 4) kurt = null;
    if (n !== null && n < 3) skew = null;
    var q1 = pickNumber(descriptive.q1, computed.q1);
    var q3 = pickNumber(descriptive.q3, computed.q3);
    var iqr = pickNumber(descriptive.iqr, computed.iqr);
    if (iqr === null && q1 !== null && q3 !== null) iqr = q3 - q1;
    var ciSource = collected.confidence && collected.confidence.numeric ? collected.confidence.numeric : null;
    var outlierSource = (collected.outliers && collected.outliers.numeric) || collected.outliers || null;
    var normalitySource = collected.normality || null;
    var confidence = { status: 'not_run', reason: 'No confidence interval has been computed.' };
    if (ciSource && (typeof ciSource.lower === 'number' || typeof ciSource.lcl === 'number' || typeof ciSource.upper === 'number' || typeof ciSource.ucl === 'number' || typeof ciSource.bound === 'number' || typeof ciSource.estimate === 'number' || typeof ciSource.center === 'number')) {
      confidence = {
        status: ciSource.status || 'completed',
        method: ciSource.method,
        parameter: ciSource.parameter,
        level: ciSource.level != null ? ciSource.level : ciSource.confidence,
        side: ciSource.side || ciSource.intervalSide,
        estimate: pickNumber(ciSource.estimate, ciSource.center),
        lower: ciSource.side === 'upper' ? null : pickNumber(ciSource.lower, ciSource.lcl),
        upper: ciSource.side === 'lower' ? null : pickNumber(ciSource.upper, ciSource.ucl),
        bound: pickNumber(ciSource.bound),
        planning: false
      };
    }
    var outliers = { status: 'not_run', reason: 'No outlier rule has been applied.' };
    if (outlierSource && (outlierSource.count != null || outlierSource.flagged != null || Array.isArray(outlierSource.outliers))) {
      outliers = {
        status: 'completed',
        method: outlierSource.method || outlierSource.rule || 'IQR',
        flagged: pickNumber(outlierSource.count, outlierSource.flagged, Array.isArray(outlierSource.outliers) ? outlierSource.outliers.length : null),
        n: pickNumber(outlierSource.n, n)
      };
    }
    var normality = { status: 'not_run', reason: 'Normality tests have not been run.' };
    if (normalitySource && (normalitySource.tests || normalitySource.meta)) {
      var meta = normalitySource.meta || {};
      normality = {
        tests: normalitySource.tests,
        alpha: pickNumber(meta.alpha, normalitySource.alphaValue, normalitySource.alpha),
        aggregateStatus: meta.aggregateStatus || normalitySource.aggregateStatus || null,
        failCount: pickNumber(normalitySource.failCount),
        passCount: pickNumber(normalitySource.passCount)
      };
    }
    var groups = sources.groups;
    if (!groups) groups = { status: 'not_run', reason: 'No grouping variable was analysed, so there is no group-consistency finding.' };
    var hypothesis = sources.hypothesis || { status: 'not_run', reason: 'No reference-value test was run, so no test conclusion is included.' };
    return {
      variable: stored.column || stored.variableName || stored.variable || computed.varName || 'the variable',
      unit: stored.unit || stored.units || null,
      n: n,
      mean: mean,
      sd: sd,
      median: pickNumber(descriptive.median, computed.med, computed.median),
      q1: q1,
      q3: q3,
      iqr: iqr,
      min: pickNumber(descriptive.min, computed.min),
      max: pickNumber(descriptive.max, computed.max),
      skew: skew,
      kurt: kurt,
      missing: pickNumber(stored.missingCount, stored.missing),
      excluded: pickNumber(stored.excludedCount, stored.excluded),
      confidence: confidence,
      planning: ciSource && ciSource.planning && typeof ciSource.planning === 'object' ? ciSource.planning : null,
      outliers: outliers,
      normality: normality,
      groups: groups,
      hypothesis: hypothesis,
      qqplot: collected.qqplot || null,
      imageInspected: false
    };
  }

  function assessmentPlainText(result) {
    var sections = (result && result.sections) || {};
    var chunks = [];
    ['CONCLUSION', 'BOTTOMLINE', 'MEANING', 'INTERPRETATION', 'GROUP_CONSISTENCY', 'REPORT'].forEach(function (key) {
      if (sections[key]) chunks.push(sections[key]);
    });
    ['FINDINGS', 'EVIDENCE', 'SUPPORT', 'DIAGNOSTICS', 'LIMITATIONS', 'CHECKS', 'ACTION'].forEach(function (key) {
      if (Array.isArray(sections[key])) chunks.push(sections[key].join(' '));
    });
    return chunks.join('\n');
  }

  function acceptResponse(requestFingerprint, currentFingerprint) {
    return String(requestFingerprint) === String(currentFingerprint);
  }

  function shouldRequestOnControlChange() {
    return false;
  }

  function textForCopy(state) {
    state = state || {};
    var text = String(state.text || '');
    if (!state.stale && state.fingerprint === state.currentFingerprint) return text;
    if (!text) return '';
    if (/out of date/i.test(text)) return text;
    return 'Out of date — results changed since this assessment was generated.\n\n' + text;
  }

  function textForExport(state) {
    state = state || {};
    if (state.stale || state.fingerprint !== state.currentFingerprint) return null;
    return state.text || null;
  }

  function classifyInterpretationResponse(input) {
    input = input || {};
    if (input.error) {
      return { ok: false, error: 'The interpretation service failed. The previous text is not a completed assessment. Retry to generate one.' };
    }
    var parsed = input.parsed;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'The interpretation response was incomplete, so it is not shown as an assessment.' };
    }
    if (parsed.error) return { ok: false, error: String(parsed.error) };
    if (input.mode === 'full' && !input.ruleBased) {
      var hasConclusion = !!usableNarrative(parsed.CONCLUSION);
      var hasFindings = Array.isArray(parsed.FINDINGS) && parsed.FINDINGS.length > 0;
      if (!hasConclusion && !hasFindings) {
        return { ok: false, error: 'The interpretation response was incomplete, so it is not shown as an assessment.' };
      }
    }
    return { ok: true, sections: parsed };
  }

  function describePairwise(input) {
    input = input || {};
    var procedure = String(input.procedure || input.method || '').toLowerCase();
    var correction = String(input.correction || input.adjustment || '').toLowerCase();
    var family = finite(input.familySize);
    var familyBit = family !== null ? ' across ' + Math.round(family) + ' pairwise tests' : '';
    var builtin = procedure === 'tukey' || procedure === 'tukey-kramer' || procedure === 'games-howell' || correction === 'builtin';
    if (builtin) {
      var name = procedure === 'games-howell' ? 'Games–Howell' : 'Tukey–Kramer';
      if (procedure && procedure.indexOf('games') !== -1) name = 'Games–Howell';
      if (procedure && procedure.indexOf('tukey') !== -1) name = 'Tukey–Kramer';
      var extra = correction && correction !== 'builtin' && correction !== 'none' && correction !== procedure
        ? ' A second ' + correction + ' correction is not applied on top of that adjustment.'
        : '';
      return name + ' already adjusts the pairwise comparisons' + familyBit + '.' + extra + ' An adjusted p-value is not the unadjusted pairwise p-value. An omnibus result does not name which pairs differ.';
    }
    if (!correction || correction === 'none' || correction === 'unadjusted') {
      return 'These pairwise p-values are not multiplicity-adjusted' + familyBit + '. They are not a corrected family of tests. An omnibus result does not name which pairs differ.';
    }
    var label = correction === 'holm' ? 'Holm'
      : correction === 'bonferroni' ? 'Bonferroni'
      : correction === 'bh' || correction === 'benjamini-hochberg' ? 'Benjamini–Hochberg'
      : correction;
    return 'The pairwise p-values use a ' + label + ' adjustment' + familyBit + '. They are not the unadjusted pairwise p-values. An omnibus result does not name which pairs differ.';
  }

  function logisticStatements(state) {
    state = state || {};
    var outcome = state.outcome || (state.dataContext && state.dataContext.modelSpec) || {};
    var recode = outcome.yRecode || (state.dataContext && state.dataContext.modelSpec && state.dataContext.modelSpec.yRecode) || {};
    var eventLevel = outcome.eventLevel != null ? String(outcome.eventLevel) : (recode.level1 != null ? String(recode.level1) : null);
    var nonEvent = outcome.nonEventLevel != null ? String(outcome.nonEventLevel) : (recode.level0 != null ? String(recode.level0) : null);
    if (!eventLevel) return [];
    var sentence = 'The modeled event level is ' + eventLevel
      + (nonEvent ? ', and the non-event level is ' + nonEvent : '')
      + '. Odds ratios compare odds of that event, not a risk ratio. Reversing the event coding reverses the odds-ratio direction.';
    return [sentence];
  }

  function describeTemporaryRefit(payload) {
    payload = payload || {};
    if (payload.status && payload.status !== 'ready') {
      return payload.reason || 'The temporary refit is not available. The original fit is unchanged.';
    }
    if (payload.nOriginal == null && payload.nTemporary == null && !payload.omittedLabel) return '';
    var omitted = payload.omittedLabel || 'the omitted case';
    return 'A temporary refit omits ' + omitted
      + (payload.nOriginal != null ? ' (original n = ' + payload.nOriginal : '')
      + (payload.nTemporary != null ? (payload.nOriginal != null ? ', temporary n = ' + payload.nTemporary + ')' : ' (temporary n = ' + payload.nTemporary + ')') : (payload.nOriginal != null ? ')' : ''))
      + '. Those temporary estimates are not the original fit. The original fit is unchanged.';
  }

  function regressionStatements(scope) {
    scope = scope || {};
    var session = scope._regCaseSession;
    var comparison = session && typeof session.state === 'function' ? session.state().comparison : scope.comparison;
    var payload = comparison && comparison.payload ? comparison.payload : scope.temporaryRefit;
    if (!payload) return [];
    var text = describeTemporaryRefit(payload);
    return text ? [text] : [];
  }

  function enforceRequiredFindings(sections, required) {
    var next = Object.assign({}, sections || {});
    var findings = Array.isArray(next.FINDINGS) ? next.FINDINGS.slice() : [];
    (required || []).forEach(function (sentence) {
      if (!sentence) return;
      var already = findings.some(function (line) { return String(line).indexOf(sentence.slice(0, 48)) !== -1; });
      if (!already) findings.unshift(sentence);
    });
    next.FINDINGS = findings;
    return next;
  }

  function moduleGroundRules() {
    return [
      'Use only supplied results. Do not invent a statistic, a test, or a sample size.',
      'A missing value is not zero, and a missing p-value is not a nonsignificant result.',
      'Never print p = 0. Use the small-p convention.',
      'Do not assign an unqualified Strong, High, or calibrated certainty label.',
      'Do not call data normal because a test failed to reject normality.',
      'Do not treat association, a coefficient, or a group difference as a cause.',
      'If group results are absent, say they have not been run. Do not call that absence a consistency finding, and do not say to open By Group when the comparison is already computed or does not apply.',
      'A one-sided bound is one bound. Do not turn it into a two-sided interval or a plus-or-minus statement.',
      'A planning or What If figure is conditional on its assumptions. It is not an observed result.',
      'Separate observation spread from uncertainty in an estimate.',
      'For pairwise results, name the actual multiplicity adjustment. Adjusted p-values are not unadjusted p-values, and an omnibus test does not identify the pairs.',
      'For logistic results, name the event level and the reference level. An odds ratio is not a risk ratio. Reversing the event level reverses the odds-ratio direction.',
      'A temporary case-omission refit is not the original regression fit. Keep its estimates separate and say the original fit is unchanged.',
      'Do not treat repeated measures as independent observations.',
      'Reliability is not validity. A capability index does not establish stability or normality.',
      'Observed power is not extra evidence for the same test result.'
    ].join('\n');
  }

  return {
    formatEstimate: formatEstimate,
    formatP: formatP,
    formatLevel: formatLevel,
    usableNarrative: usableNarrative,
    describeShape: describeShape,
    describeSpread: describeSpread,
    describeOutliers: describeOutliers,
    describeInterval: describeInterval,
    resolveNormality: resolveNormality,
    coverageNote: coverageNote,
    describeGroups: describeGroups,
    describeHypothesis: describeHypothesis,
    buildUnivariateAssessment: buildUnivariateAssessment,
    buildUnivariateViewAssessment: buildUnivariateViewAssessment,
    assembleUnivariateInput: assembleUnivariateInput,
    assessmentPlainText: assessmentPlainText,
    acceptResponse: acceptResponse,
    shouldRequestOnControlChange: shouldRequestOnControlChange,
    textForCopy: textForCopy,
    textForExport: textForExport,
    classifyInterpretationResponse: classifyInterpretationResponse,
    describePairwise: describePairwise,
    logisticStatements: logisticStatements,
    describeTemporaryRefit: describeTemporaryRefit,
    regressionStatements: regressionStatements,
    enforceRequiredFindings: enforceRequiredFindings,
    moduleGroundRules: moduleGroundRules
  };
});
