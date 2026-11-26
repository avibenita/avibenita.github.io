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
          text: 'The normality summary conflicts with the individual results: a pass/fail tally or summary status was recorded, but the completed test results were not supplied. No normality conclusion is drawn.'
        };
      }
      if (input.status === 'failed') {
        return { state: 'unavailable', text: input.reason || 'The normality tests failed, so no normality conclusion is drawn.' };
      }
      if (input.status === 'not_run' && input.verified) {
        return { state: 'not_run', text: input.reason || 'Normality tests have not been run, so this assessment does not conclude that the sample is normal or non-normal.' };
      }
      return {
        state: 'unavailable',
        text: input.reason || 'No completed normality-test results are available for this assessment, so it does not conclude that the sample is normal or non-normal.'
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
    if (hasCount) {
      var countedFail = failCount === null ? 0 : failCount;
      if (countedFail !== below.length) {
        text += ' A separate pass/fail tally does not agree with these p-values, so the conclusion follows the individual results.';
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
    var status = input.status || 'unavailable';
    return coverageNote({
      name: 'Group comparison',
      status: status,
      reason: input.reason || (status === 'not_run'
        ? 'No grouping variable was analysed, so there is no group-consistency finding.'
        : 'the comparison result was not supplied.')
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
      if (input.parameter) bits.push('for the ' + input.parameter);
      if (input.method) bits.push('by the ' + input.method + ' method');
      if (stat !== null) detail = bits.join(' ') + ', statistic ' + formatEstimate(stat);
      else detail = bits.join(' ');
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
    if (finite(input.q1) !== null && finite(input.median) !== null && finite(input.q3) !== null) {
      pushUnique(findings, 'The quartiles are ' + formatEstimate(input.q1) + ', ' + formatEstimate(input.median) + ', and ' + formatEstimate(input.q3) + '.');
    } else if (finite(input.median) !== null) {
      pushUnique(findings, 'The median is ' + formatEstimate(input.median) + '.');
    }
    if (sd !== null && sd !== 0) pushUnique(findings, 'The sample standard deviation is ' + formatEstimate(sd) + '.');
    if (finite(input.min) !== null && finite(input.max) !== null) {
      pushUnique(findings, 'The observed range is ' + formatEstimate(input.min) + ' to ' + formatEstimate(input.max) + '.');
    }
    var outlierLine = outliers.text;
    if (input.sensitivity && input.sensitivity.impact && input.outliers && input.outliers.status === 'unavailable') outlierLine = '';
    if (outlierLine) pushUnique(findings, outlierLine);

    if (finite(input.missing) !== null || finite(input.excluded) !== null) {
      support.push('The analyzed n excludes the counts named in the limitations.');
    }

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
    if (input.sensitivity && input.sensitivity.mode === 'subset' && input.sensitivity.status !== 'failed') {
      limitations.push('Sensitivity analysis: these results describe the chosen subset (' + Math.round(input.sensitivity.retainedN) + ' of ' + Math.round(input.sensitivity.baselineN) + ' eligible cases). Intervals and tests do not adjust for selecting exclusions after inspecting the data. A change in a normality-test result does not establish that the population became normal.');
      if (conclusionParts.length) conclusionParts[0] = 'Sensitivity analysis. ' + conclusionParts[0];
    } else if (input.sensitivity && input.sensitivity.mode === 'all') {
      limitations.push('Flagged cases may be valid observations. Compare results before deciding how to handle them.');
    }
    if (input.sensitivity && input.sensitivity.impact && input.sensitivity.impact.reading) {
      var impact = input.sensitivity.impact;
      if (impact.available === false) {
        pushUnique(findings, impact.reading);
      } else {
        pushUnique(findings, 'Outlier Impact Index is ' + impact.score + '. ' + impact.reading);
      }
      pushUnique(limitations, 'The index describes how far the chosen exclusion moves the mean, the median, the sample standard deviation, and the range. A higher index is not a better result, and it is not a reason to remove a case.');
    }

    var synthesis = [];
    if (mean !== null && finite(input.median) !== null && sd !== null && sd > 0) {
      var centerGap = Math.abs(mean - finite(input.median)) / sd;
      synthesis.push(centerGap < 0.25
        ? 'The mean and the median are close relative to the standard deviation, so they describe a similar center.'
        : 'The mean and the median differ relative to the standard deviation, so the center depends on which summary is used.');
    }
    if (interval.text && !interval.planning && parameterName((input.confidence || {}).parameter) === 'mean' && spread.text) {
      synthesis.push('The mean interval and the middle-50% span answer different questions: one is uncertainty for the mean, and the other is the spread of the observations.');
    }
    var interpretation = synthesis.join(' ');

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

  function outlierFocus(impact) {
    var parts = [
      ['mean', impact.dMean || 0],
      ['median', impact.dMedian || 0],
      ['sd', impact.dSD || 0],
      ['range', impact.dRange || 0]
    ];
    var best = parts[0];
    parts.forEach(function (part) { if (part[1] > best[1]) best = part; });
    return impact.strongest || best[0];
  }

  function outlierAdvice(impact) {
    if (!impact) return 'Leave the flagged cases out, then read which summary moves.';
    if (impact.available === false) return 'At least two observations have to remain. Use Reset to all, or uncheck some rows, before deciding what to do with the flagged values.';
    if (!impact.excluded) {
      return impact.flagged
        ? 'Nothing is left out, so the index stays at 0. That does not mean the flagged cases are harmless. Leave them out and see which summary moves before you decide whether to keep them in the reported sample.'
        : 'This rule flags no case. Keep the full sample. There is no outlier to set aside.';
    }
    var score = impact.display != null ? impact.display : Math.round(Number(impact.score) || 0);
    if (!score) return 'Keep the flagged cases in. Leaving them out does not change the mean, the median, the standard deviation, or the range.';
    var focus = outlierFocus(impact);
    if (focus === 'range') return 'These cases are stretching the minimum or the maximum. If you need the full span, keep them and say the range includes those extremes. If you are describing the typical values, also report the range with those cases left out.';
    if (focus === 'sd') return 'These cases are widening the spread. Keep them when they are real observations and report the larger standard deviation. If the question is the typical case, also report the standard deviation with those cases left out.';
    if (focus === 'median') return 'The middle of the sample moves when these cases are left out, so the typical value depends on them. Report both medians, and check whether those rows are a different situation before you choose one summary.';
    return 'These cases are pulling the mean. Prefer the median for a typical value, or report the mean both with and without them. Check the rows for a data-entry error or a different situation before you leave them out of a later analysis.';
  }

  function outlierNext(impact) {
    if (!impact) return 'Leave the flagged cases out and read the index.';
    if (impact.available === false) return 'Put cases back until at least two observations remain.';
    if (!impact.excluded) return impact.flagged ? 'Check All outliers removed, then read which summary moves.' : 'Keep every eligible value in the reported sample.';
    var score = impact.display != null ? impact.display : Math.round(Number(impact.score) || 0);
    if (!score) return 'Leave the flagged cases in the reported sample.';
    var focus = outlierFocus(impact);
    if (focus === 'range') return 'Report the range with the flagged cases and again without them.';
    if (focus === 'sd') return 'Report the standard deviation with the flagged cases and again without them.';
    if (focus === 'median') return 'Report both medians, then inspect the flagged rows.';
    return 'Report the mean with and without the flagged cases, and compare it with the median.';
  }

  function buildUnivariateViewAssessment(input, view) {
    var full = buildUnivariateAssessment(input);
    var key = String(view || '');
    var bottom = full.sections.CONCLUSION;
    var evidence = full.sections.FINDINGS.slice();
    var meaning = full.sections.INTERPRETATION;
    var checks = [];
    var next = [];
    if (key === 'confidence') {
      bottom = describeInterval(input.confidence || { status: 'not_run', reason: 'No confidence interval has been computed for this view.' }).text;
      evidence = [bottom];
      meaning = 'Read the bound as uncertainty for the stated parameter and method.';
      if (input.planning) checks.push(describeInterval(Object.assign({ planning: true }, input.planning)).text);
    } else if (key === 'normality') {
      bottom = resolveNormality(input.normality || { status: 'not_run' }).text;
      evidence = [bottom];
      meaning = 'A single significant test is evidence about that test. It is not a vote across the battery, and a nonsignificant test does not prove normality.';
    } else if (key === 'outlier-impact') {
      var impactView = input.sensitivity && input.sensitivity.impact;
      if (impactView && impactView.reading) {
        bottom = impactView.available === false
          ? impactView.reading
          : 'Outlier Impact Index is ' + impactView.score + '. ' + impactView.reading;
        evidence = evidence.filter(function (line) {
          return line && line.indexOf('Outlier Impact Index is') !== 0 && line !== impactView.reading;
        });
        evidence.unshift(bottom);
      }
      meaning = outlierAdvice(impactView);
      checks.push('This comparison stays in this view. It does not delete worksheet rows, and the other Univariate views keep the full sample.');
      if (outlierNext(impactView)) next = [outlierNext(impactView)];
    } else if (key === 'outliers' || key === 'boxplot-outliers') {
      bottom = describeOutliers(Object.assign({ n: input.n }, input.outliers || { status: 'not_run' }));
      bottom = bottom.text;
      evidence = [bottom];
      meaning = 'The flag uses the selected rule only. A count of zero means that rule flagged nothing in this sample.';
    } else if (key === 'hypothesis') {
      bottom = describeHypothesis(input.hypothesis);
      evidence = [bottom];
      meaning = finite((input.hypothesis || {}).pValue) !== null
        ? 'The p-value compares the sample with the stated reference under the selected method. It does not by itself describe how far the estimate sits from that reference.'
        : '';
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
        NEXT: next
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
    var confidence = { status: 'unavailable', reason: 'No confidence-interval result is available for this assessment.' };
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
    var outliers = { status: 'unavailable', reason: 'No outlier-rule result is available for this assessment.' };
    if (outlierSource && (outlierSource.count != null || outlierSource.flagged != null || Array.isArray(outlierSource.outliers))) {
      outliers = {
        status: 'completed',
        method: outlierSource.method || outlierSource.rule || 'IQR',
        flagged: pickNumber(outlierSource.count, outlierSource.flagged, Array.isArray(outlierSource.outliers) ? outlierSource.outliers.length : null),
        n: pickNumber(outlierSource.n, n)
      };
    }
    var normality = { status: 'unavailable', reason: 'No completed normality-test results are available for this assessment.' };
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
    var groups = sources.groups || groupsFromContext(null);
    var hypothesis = sources.hypothesis || { status: 'unavailable', reason: 'No completed reference-value test is available for this assessment.' };
    var median = pickNumber(descriptive.median, computed.med, computed.median);
    var minValue = pickNumber(descriptive.min, computed.min);
    var maxValue = pickNumber(descriptive.max, computed.max);
    var sensitivity = sources.sensitivity || null;
    if (sensitivity && sensitivity.mode === 'subset' && sensitivity.status !== 'failed' && sensitivity.active) {
      var activeSample = sensitivity.active;
      n = pickNumber(activeSample.n, n);
      mean = pickNumber(activeSample.mean, mean);
      sd = pickNumber(activeSample.sd, sd);
      median = pickNumber(activeSample.median, median);
      minValue = pickNumber(activeSample.min, minValue);
      maxValue = pickNumber(activeSample.max, maxValue);
      skew = null;
      kurt = null;
      q1 = null;
      q3 = null;
      iqr = null;
      confidence = { status: 'unavailable', reason: 'The interval was not recomputed for this sensitivity reading.' };
    }
    var excludedCount = pickNumber(stored.excludedCount, stored.excluded);
    if (excludedCount === null && stored.rowFilterActive && Array.isArray(stored.sourceRowsAll) && Array.isArray(stored.sourceRows)) {
      var droppedRows = stored.sourceRowsAll.length - stored.sourceRows.length;
      if (droppedRows > 0) excludedCount = droppedRows;
    }
    return {
      variable: stored.column || stored.variableName || stored.variable || computed.varName || 'the variable',
      unit: stored.unit || stored.units || null,
      n: n,
      mean: mean,
      sd: sd,
      median: median,
      q1: q1,
      q3: q3,
      iqr: iqr,
      min: minValue,
      max: maxValue,
      skew: skew,
      kurt: kurt,
      missing: pickNumber(stored.missingCount, stored.missing, stored.excludedMissing),
      excluded: excludedCount,
      confidence: confidence,
      planning: ciSource && ciSource.planning && typeof ciSource.planning === 'object' ? ciSource.planning : null,
      outliers: outliers,
      normality: normality,
      groups: groups,
      hypothesis: hypothesis,
      qqplot: collected.qqplot || null,
      imageInspected: false,
      sensitivity: sensitivity
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

  function groupsFromContext(ctx) {
    if (!ctx || ctx.available === false || !ctx.status) {
      return {
        status: 'unavailable',
        reason: (ctx && ctx.reason) || 'the comparison result was not supplied.'
      };
    }
    var status = ctx.status;
    var summary = [status.label, status.hint, ctx.differsText, ctx.warningText].filter(Boolean).join('. ');
    if (!summary) {
      return { status: 'unavailable', reason: 'the comparison result was not supplied.' };
    }
    return { status: 'completed', summary: summary, descriptive: status.descriptive !== false };
  }

  function hypothesisFromRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var p = finite(raw.pValue != null ? raw.pValue : raw.p);
    if (p === null && !raw.testType && !raw.name) return null;
    return {
      status: 'completed',
      name: raw.testType || raw.name || 'The reference-value test',
      statistic: finite(raw.testStat != null ? raw.testStat : raw.statistic),
      pValue: p,
      nullValue: raw.h0Value != null ? raw.h0Value : raw.nullValue,
      alternative: raw.orientation || raw.alternative || null,
      alpha: finite(raw.alpha),
      method: raw.method || null,
      parameter: raw.parameter || null
    };
  }

  function ruled(parts) {
    parts = parts || {};
    return {
      sections: {
        CONCLUSION: parts.conclusion || '',
        FINDINGS: parts.findings || [],
        SUPPORT: parts.support || [],
        DIAGNOSTICS: parts.diagnostics || [],
        INTERPRETATION: parts.interpretation || '',
        LIMITATIONS: parts.limitations || [],
        GROUP_CONSISTENCY: parts.groups || '',
        ACTION: [],
        REPORT: parts.conclusion || ''
      },
      meta: {
        ruleBased: true,
        omitStrengthBadge: true,
        primarySignal: parts.signal || '',
        strengthLevel: null,
        strengthNote: '',
        source: parts.source || ''
      }
    };
  }

  function numText(value) {
    var text = formatEstimate(value);
    return text === null ? null : text;
  }

  function buildLogisticAssessment(payload) {
    payload = payload || {};
    var fit = payload.fit || {};
    var outcome = payload.outcome || {};
    if (finite(fit.observations) === null && !(payload.coefficients || []).length) return null;
    var event = outcome.eventLevel != null ? String(outcome.eventLevel) : null;
    var nonEvent = outcome.nonEventLevel != null ? String(outcome.nonEventLevel) : null;
    var n = finite(fit.observations);
    var events = finite(fit.events);
    var conclusion = 'Logistic model'
      + (outcome.name ? ' for ' + outcome.name : '')
      + (event ? ', with event level ' + event + (nonEvent ? ' and non-event level ' + nonEvent : '') : '')
      + (n !== null ? '. The fit uses ' + Math.round(n) + ' observations' : '')
      + (events !== null ? ' and ' + Math.round(events) + ' events' : '')
      + '.';
    var findings = logisticStatements(payload).slice();
    (payload.coefficients || []).filter(function (row) {
      return row && String(row.name || '').toLowerCase() !== 'intercept' && row.inModel !== false && finite(row.oddsRatio) !== null;
    }).slice(0, 6).forEach(function (row) {
      var ci = Array.isArray(row.orCi95) ? row.orCi95 : [];
      var line = row.name + ' has odds ratio ' + numText(row.oddsRatio);
      if (finite(ci[0]) !== null && finite(ci[1]) !== null) line += ' [' + numText(ci[0]) + ', ' + numText(ci[1]) + ']';
      if (row.reference) line += ' versus reference ' + row.reference;
      if (formatP(row.p)) line += ', ' + formatP(row.p);
      findings.push(line + '.');
    });
    var diagnostics = [];
    if (finite(fit.auc) !== null) diagnostics.push('AUC ' + numText(fit.auc) + ' describes discrimination. It is not a calibration result.');
    if (finite(fit.brier) !== null || finite(fit.calibrationMeanAbsoluteError) !== null) {
      diagnostics.push('Calibration is reported separately'
        + (finite(fit.brier) !== null ? ' (Brier ' + numText(fit.brier) + ')' : '')
        + (finite(fit.calibrationMeanAbsoluteError) !== null ? ' (mean absolute calibration error ' + numText(fit.calibrationMeanAbsoluteError) + ')' : '')
        + '.');
    }
    var cls = payload.classificationAtThreshold || {};
    if (cls.threshold != null) diagnostics.push('Classification at threshold ' + cls.threshold + ' is threshold-dependent. Those counts are not the odds ratios.');
    var checks = payload.dataChecks || {};
    if (checks.separationRisk) diagnostics.push('Separation risk: ' + checks.separationRisk + '.');
    var limitations = [];
    if (payload.validation) limitations.push(String(payload.validation));
    limitations.push('An odds ratio is not a risk or a probability. Reversing the event level reverses the odds-ratio direction.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'The coefficients describe association with the modeled event under the fitted link. They do not establish a cause.',
      limitations: limitations,
      signal: event ? 'Event ' + event : 'Logistic model',
      source: 'logistic'
    });
  }

  function buildIndependentAssessment(payload) {
    payload = payload || {};
    var results = payload.results || {};
    var omnibus = results.omnibus || {};
    var decision = results.decision || {};
    var primary = decision.primary || {};
    var groups = payload.groups || {};
    var summary = groups.summary || {};
    if (finite(summary.totalN) === null && finite(primary.p) === null) return null;
    var alpha = finite((payload.setup || {}).alpha);
    if (alpha === null) alpha = finite(decision.alpha);
    var design = payload.design || {};
    var testName = primary.test === 'kruskal-wallis' ? 'Kruskal–Wallis' : 'one-way ANOVA';
    var conclusion = testName + ' compares ' + (design.k || 'the') + ' independent groups'
      + (finite(summary.totalN) !== null ? ' (total n = ' + Math.round(summary.totalN) + ')' : '')
      + (formatP(primary.p) ? ', ' + formatP(primary.p) : '')
      + (alpha !== null ? ' at alpha = ' + formatAlpha(alpha) : '')
      + '.';
    var effects = ((payload.effects || {}).kplus) || {};
    var findings = [];
    if (finite(effects.eta2) !== null) findings.push('Eta-squared is ' + numText(effects.eta2) + '. That is a description of variance among groups, not a cause.');
    var post = payload.posthoc || {};
    if (post.available) findings.push(describePairwise({ procedure: post.method, correction: post.correction, familySize: (post.rows || []).length }));
    var diagnostics = [];
    var levene = ((payload.assumptions || {}).homogeneity || {}).levene || {};
    if (formatP(levene.p)) diagnostics.push('Levene ' + formatP(levene.p) + '. A p-value that is not below alpha does not prove equal variances.');
    var welch = omnibus.welch || {};
    if (formatP(welch.p)) diagnostics.push('Welch ANOVA ' + formatP(welch.p) + '. It is a separate check from the primary ANOVA p-value.');
    var limitations = ['The groups are treated as independent samples. Pairwise results do not replace the omnibus test, and the omnibus test does not name the pairs.'];
    if (finite(summary.totalMissing) !== null && summary.totalMissing > 0) limitations.push(Math.round(summary.totalMissing) + ' values are recorded as missing under the per-group policy.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'A difference among means is an association with the grouping factor in this sample. It does not establish why the groups differ.',
      limitations: limitations,
      signal: testName,
      source: 'independent'
    });
  }

  function buildRepeatedAssessment(payload) {
    payload = payload || {};
    var model = payload.model_and_results || {};
    var primary = model.primary_test || {};
    var stat = primary.statistic || primary;
    var p = finite(stat.p);
    if (p === null && !(payload.descriptives || []).length) return null;
    var alpha = finite(((payload.analysis || {}).reporting || {}).alpha);
    var name = primary.name || stat.name || 'The repeated-measures test';
    var conclusion = name + ' uses the repeated measurements on the same subjects'
      + (formatP(p) ? ', ' + formatP(p) : '')
      + (alpha !== null ? ' at alpha = ' + formatAlpha(alpha) : '')
      + '.';
    var findings = [];
    (payload.descriptives || []).slice(0, 6).forEach(function (row) {
      if (!row) return;
      var bit = row.level + (finite(row.n) !== null ? ' n = ' + Math.round(row.n) : '') + (finite(row.mean) !== null ? ', mean ' + numText(row.mean) : '');
      if (bit.trim()) findings.push(bit + '.');
    });
    var post = payload.posthoc || {};
    var adjustment = (post.rows && post.rows[0] && (post.rows[0].adjustment || post.rows[0].method)) || post.correction;
    if ((post.rows || []).length) findings.push(describePairwise({ procedure: post.method || adjustment, correction: adjustment, familySize: post.rows.length }));
    var assumptions = payload.assumptions || {};
    var sphere = assumptions.sphericity || {};
    var diagnostics = [];
    if (formatP(sphere.p)) {
      diagnostics.push('Mauchly ' + formatP(sphere.p) + '. A p-value that is not below alpha does not prove sphericity.');
      if (sphere.epsilons) diagnostics.push('Greenhouse–Geisser epsilon ' + numText(sphere.epsilons.GG) + ' and Huynh–Feldt epsilon ' + numText(sphere.epsilons.HF) + ' are the sphericity corrections supplied with the fit.');
    }
    var power = payload.power || {};
    var limitations = ['Repeated measurements are not independent sample units. The subject count, not the number of repeated rows, is the sample size for the subjects.'];
    if (power.observed && power.observed.reported) limitations.push('Observed power from this same test is not additional evidence for the test result.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'The omnibus result says whether the repeated conditions differ. It does not name which conditions differ, and it does not establish a cause.',
      limitations: limitations,
      signal: name,
      source: 'repeated'
    });
  }

  function buildRegressionAssessment(payload) {
    payload = payload || {};
    var results = payload.results || payload;
    if (finite(results.observations) === null && finite(results.rSquared) === null) return null;
    var conclusion = 'Linear model for ' + (results.yVariable || 'the outcome')
      + (finite(results.observations) !== null ? ', n = ' + Math.round(results.observations) : '')
      + (finite(results.rSquared) !== null ? ', R² = ' + numText(results.rSquared) : '')
      + (formatP(results.fPValue) ? ', overall ' + formatP(results.fPValue) : '')
      + '.';
    var findings = [];
    var coefs = results.coefficients;
    var rows = Array.isArray(coefs) ? coefs : [];
    rows.slice(0, 6).forEach(function (row) {
      if (!row) return;
      var name = row.name || row.term || row.variable || row.Variable;
      var estimate = finite(row.estimate != null ? row.estimate : row.coefficient != null ? row.coefficient : row.b);
      if (!name || estimate === null) return;
      var line = name + ' estimate ' + numText(estimate);
      var p = formatP(row.p != null ? row.p : row.pValue);
      if (p) line += ', ' + p;
      if (row.reference || row.Reference) line += ', reference ' + (row.reference || row.Reference);
      findings.push(line + '.');
    });
    var temporary = describeTemporaryRefit(payload.temporaryRefit || {});
    if (temporary) findings.unshift(temporary);
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: ['The overall fit and an individual coefficient answer different questions. A coefficient is not the model R².'],
      interpretation: 'The coefficients describe association in the fitted model. They do not establish that a predictor causes the outcome.',
      limitations: ['Units follow the stored outcome and predictors. A temporary case-omission refit, when present, is not the original fit.'],
      signal: results.yVariable || 'Regression',
      source: 'regression'
    });
  }

  function buildContingencyAssessment(payload) {
    payload = payload || {};
    if (finite(payload.representedN) === null && !payload.tests) return null;
    var n = finite(payload.representedN);
    var conclusion = (payload.rowVar || 'Rows') + ' by ' + (payload.colVar || 'columns')
      + (n !== null ? ', represented n = ' + Math.round(n) : '')
      + (payload.nRows && payload.nCols ? ' (' + payload.nRows + ' by ' + payload.nCols + ')' : '')
      + '.';
    var findings = [];
    var tests = payload.tests || {};
    if (payload.testsAvailable === false) {
      findings.push('Association tests are unavailable' + (payload.testsUnavailableReason ? ': ' + payload.testsUnavailableReason : '.'));
    } else if (tests.pearson && formatP(tests.pearson.p)) {
      findings.push('Pearson chi-square ' + (finite(tests.pearson.stat) !== null ? numText(tests.pearson.stat) + ', ' : '') + formatP(tests.pearson.p) + (finite(tests.pearson.df) !== null ? ', df = ' + Math.round(tests.pearson.df) : '') + '.');
    }
    if (tests.fisher && (tests.fisher.p != null || tests.fisher.method)) {
      findings.push('Fisher' + (formatP(tests.fisher.p) ? ' ' + formatP(tests.fisher.p) : '') + (tests.fisher.method ? ' (' + tests.fisher.method + ')' : '') + '.');
    }
    var measures = payload.measures2x2 || {};
    var layout = measures.layout || {};
    if (layout.rowIndex || layout.colEvent) {
      findings.push('The index row is ' + (layout.rowIndex || 'the first row') + ' and the reference row is ' + (layout.rowReference || 'the second row') + '. The event column is ' + (layout.colEvent || 'the first column') + '.');
    }
    if (measures.oddsRatio && measures.oddsRatio.available && finite(measures.oddsRatio.value) !== null) {
      findings.push('Odds ratio ' + numText(measures.oddsRatio.value) + ' compares odds, not risk.');
    }
    if (measures.riskRatio && measures.riskRatio.available && finite(measures.riskRatio.value) !== null) {
      findings.push('Risk ratio ' + numText(measures.riskRatio.value) + ' compares risks. It is not the odds ratio.');
    } else if (measures.riskRatio && measures.riskRatio.reason) {
      findings.push(measures.riskRatio.reason);
    }
    var diagnostics = [];
    if (payload.limitations) diagnostics.push(String(payload.limitations));
    if (payload.frequencyWeightingApplied) diagnostics.push('The represented n uses the frequency weights. It is not the number of worksheet rows.');
    var limitations = ['Swapping the index and reference rows reverses the ratio direction. Expected counts, not the observed counts alone, determine whether the chi-square approximation is comfortable.'];
    if (finite(payload.excludedMissing) !== null) limitations.push(Math.round(payload.excludedMissing) + ' missing values are outside the table.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'The association describes the table that was analyzed. It does not establish that one classification causes the other.',
      limitations: limitations,
      signal: (payload.rowVar || 'Table') + ' × ' + (payload.colVar || ''),
      source: 'contingency'
    });
  }

  function buildCapabilityAssessment(payload) {
    payload = payload || {};
    var overall = payload.overall;
    if (!overall || overall.ok === false) return null;
    var conclusion = 'For ' + (payload.measurement || 'the measurement')
      + ', n = ' + (finite(overall.n) !== null ? Math.round(overall.n) : 'the analyzed sample')
      + ', Pp = ' + numText(overall.pp) + ' and Ppk = ' + numText(overall.ppk) + '.';
    var findings = ['Pp and Ppk use the overall sample standard deviation. They are not within-process Cp and Cpk.'];
    if (overall.lsl != null || overall.usl != null) findings.push('The specification limits are ' + (overall.lsl != null ? 'LSL ' + numText(overall.lsl) : 'no lower limit') + ' and ' + (overall.usl != null ? 'USL ' + numText(overall.usl) : 'no upper limit') + '.');
    if (payload.observedOutOfSpec && finite(payload.observedOutOfSpec.count) !== null) {
      findings.push(Math.round(payload.observedOutOfSpec.count) + ' of ' + Math.round(payload.observedOutOfSpec.n) + ' measurements fall outside the specification. That count is not the normal-model expected PPM.');
    }
    var diagnostics = [];
    if (finite(overall.expectedPpm) !== null) diagnostics.push('Expected PPM ' + numText(overall.expectedPpm) + ' is a normal-model estimate. It is not evidence that the process is stable or normal.');
    var limitations = ['A capability index does not establish stability, normality, or acceptability.'];
    if (payload.planner) limitations.push('The planner scenario is a projection under its assumptions. It is not an observed change to the measurements.');
    var groups = '';
    if (payload.byGroup && payload.byGroup.groupName) {
      groups = 'Group results for ' + payload.byGroup.groupName + ' are descriptive' + (payload.byGroup.status ? ' (' + payload.byGroup.status + ')' : '') + '.';
    }
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'The index compares the specification width with the overall variation. It does not say whether the process is in control.',
      limitations: limitations,
      groups: groups,
      signal: 'Ppk ' + (numText(overall.ppk) || ''),
      source: 'capability'
    });
  }

  function buildMixedAssessment(payload) {
    payload = payload || {};
    if (finite(payload.n) === null && !payload.fixedEffects && !payload.varianceComponents) return null;
    var conclusion = 'Linear mixed model for ' + (payload.outcome || 'the outcome')
      + (finite(payload.n) !== null ? ', with ' + Math.round(payload.n) + ' observations' : '')
      + (finite(payload.nGroups) !== null ? ' in ' + Math.round(payload.nGroups) + ' groups' : '')
      + '.';
    var findings = [];
    if (payload.method || payload.covarianceStructure) findings.push('Estimation is ' + (payload.method || 'the stored method') + ' with covariance structure ' + (payload.covarianceStructure || 'the stored structure') + '.');
    if (finite(payload.ICC) !== null) findings.push('ICC is ' + numText(payload.ICC) + '. It describes the share of variation at the group level in this model.');
    if (payload.converged === false) findings.push('The fit is recorded as not converged. Treat the estimates as unavailable for a firm conclusion.');
    else if (payload.converged === true) findings.push('The fit is recorded as converged. Convergence is not the same as a correct random-effects structure.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: [payload.dfMethod ? 'Denominator degrees of freedom use ' + payload.dfMethod + '.' : 'Denominator degrees of freedom were not named in the payload.'],
      interpretation: 'Fixed-effect estimates are conditional on the random structure. Repeated rows inside a subject are not independent sample units.',
      limitations: ['The observation count is not the number of independent subjects.'],
      signal: payload.outcome || 'Mixed model',
      source: 'mixed'
    });
  }

  function buildReliabilityAssessment(payload) {
    payload = payload || {};
    var observed = payload.observedResults || payload;
    if (finite(observed.alpha) === null && finite(observed.omegaTotal) === null) return null;
    var conclusion = 'Scale reliability uses ' + (finite(observed.itemCount) !== null ? Math.round(observed.itemCount) + ' items and ' : '')
      + (finite(observed.nValid) !== null ? Math.round(observed.nValid) + ' valid respondents' : 'the stored respondents')
      + (finite(observed.alpha) !== null ? '. Cronbach alpha is ' + numText(observed.alpha) : '')
      + (finite(observed.omegaTotal) !== null ? '. McDonald omega total is ' + numText(observed.omegaTotal) : '')
      + '.';
    var findings = ['Omega total comes from a one-factor common-factor model. It is not a PCA variance share.'];
    var ci = observed.alphaCI || {};
    if (finite(ci.lower) !== null && finite(ci.upper) !== null) findings.push('The alpha interval is [' + numText(ci.lower) + ', ' + numText(ci.upper) + '].');
    var diagnostics = [];
    if (observed.weakestItem) diagnostics.push('The weakest stored item signal is ' + (observed.weakestItem.name || observed.weakestItem.item || observed.weakestItem) + '. Deleting an item because alpha would rise is not, by itself, a content decision.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'A reliability coefficient describes consistency among these items. It does not establish that the scale measures the intended construct, and it does not establish that the items form one dimension.',
      limitations: (observed.warnings || []).slice(0, 3).map(String),
      signal: finite(observed.alpha) !== null ? 'Alpha ' + numText(observed.alpha) : 'Reliability',
      source: 'reliability'
    });
  }

  function buildMetaAssessment(payload) {
    payload = payload || {};
    var pooled = payload.pooled || {};
    if (finite(pooled.effect) === null) return null;
    var direction = payload.direction || {};
    var quantity = direction.quantityWord || 'effect';
    var conclusion = (payload.model || 'The') + ' model pools ' + (finite(payload.k) !== null ? Math.round(payload.k) + ' studies' : 'the supplied studies')
      + '. The pooled ' + quantity + ' is ' + numText(pooled.effect)
      + (finite(pooled.ciLower) !== null && finite(pooled.ciUpper) !== null ? ', confidence interval [' + numText(pooled.ciLower) + ', ' + numText(pooled.ciUpper) + ']' : '')
      + (formatP(pooled.p) ? ', ' + formatP(pooled.p) : '')
      + '.';
    var het = payload.heterogeneity || {};
    var findings = [];
    if (finite(pooled.piLower) !== null && finite(pooled.piUpper) !== null) findings.push('The prediction interval is [' + numText(pooled.piLower) + ', ' + numText(pooled.piUpper) + ']. It is wider than the confidence interval because it describes a new study, not the uncertainty of the pooled effect.');
    if (finite(het.I2) !== null) findings.push('I² is ' + numText(het.I2) + (finite(het.tau2) !== null ? ' and tau-squared is ' + numText(het.tau2) : '') + '.');
    var diagnostics = [];
    var bias = payload.bias || {};
    if (bias.available && formatP(bias.p)) diagnostics.push('Egger-type check ' + formatP(bias.p) + '. A nonsignificant result does not prove the absence of small-study effects.');
    else if (bias.reason) diagnostics.push(String(bias.reason));
    var limitations = [];
    if (quantity === 'odds') limitations.push('Describe the pooled result as odds. It is not a risk or a probability change.');
    if (direction.comparison) findings.unshift('The comparison labels are ' + direction.comparison + '.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'The pooled estimate is a weighted summary of the supplied studies. It does not by itself establish a cause.',
      limitations: limitations,
      signal: quantity + ' ' + numText(pooled.effect),
      source: 'meta'
    });
  }

  function buildAnovaAssessment(bundle) {
    bundle = bundle || {};
    var spec = bundle.spec || {};
    var alpha = finite(spec.alpha);
    if (alpha === null) alpha = 0.05;
    var block = bundle.repeated || bundle.twoWay || bundle.oneWay || null;
    if (!block) return null;
    var design = bundle.type === 'repeated' ? 'Repeated-measures ANOVA' : bundle.type === 'two-way' ? 'Two-way ANOVA' : 'One-way ANOVA';
    var stat = bundle.type === 'two-way' ? block.FA : block.F;
    var p = bundle.type === 'two-way' ? block.pA : block.p;
    var n = finite(block.N);
    var conclusion = design + (spec.dv ? ' for ' + spec.dv : '')
      + (n !== null ? ', N = ' + Math.round(n) : '')
      + (formatP(p) ? ', ' + formatP(p) : '')
      + ' at alpha = ' + formatAlpha(alpha)
      + (finite(stat) !== null ? '. The primary F is ' + numText(stat) : '')
      + '.';
    var eta = bundle.type === 'repeated' ? block.etaSqP : bundle.type === 'two-way' ? block.etaSqA : block.etaSq;
    var findings = [];
    if (finite(eta) !== null) findings.push((bundle.type === 'repeated' ? 'Partial eta-squared is ' : 'Eta-squared is ') + numText(eta) + '.');
    var rows = bundle.posthoc || bundle.postHoc || [];
    if (rows.length) findings.push(describePairwise({ procedure: spec.posthocMethod || 'tukey', familySize: rows.length }));
    var descriptives = bundle.descriptives || [];
    descriptives.slice(0, 6).forEach(function (row) {
      if (!row || finite(row.n) === null) return;
      findings.push((row.level || row.name || row.group || 'Group') + ' n = ' + Math.round(row.n) + (finite(row.mean) !== null ? ', mean ' + numText(row.mean) : '') + '.');
    });
    var limitations = ['The omnibus test does not name which groups differ. Pairwise adjustments apply only to the pairwise procedure that was run.'];
    if (bundle.type === 'repeated') limitations.push('Repeated conditions on the same subjects are not independent observations. A sphericity correction is used only when the result object supplies one.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: [],
      interpretation: 'The result is a comparison of means under the stored design. It does not establish why the groups or conditions differ.',
      limitations: limitations,
      signal: design,
      source: 'anova'
    });
  }

  function buildPcaAssessment(bundle) {
    bundle = bundle || {};
    var overview = bundle.overview || bundle;
    if (finite(overview.kmo) === null && !(bundle.eigenvalues || overview.eigenvalues)) return null;
    var conclusion = 'Principal components'
      + (finite(overview.caseCount) !== null ? ' for ' + Math.round(overview.caseCount) + ' cases' : '')
      + (finite(overview.variableCount) !== null ? ' and ' + Math.round(overview.variableCount) + ' variables' : '')
      + (finite(overview.kmo) !== null ? '. KMO is ' + numText(overview.kmo) : '')
      + '.';
    var findings = ['Component variance is variance of the components. It is not factor common variance, and a loading pattern is not a structure matrix unless that matrix was computed.'];
    var eigen = bundle.eigenvalues || overview.eigenvalues || [];
    if (Array.isArray(eigen) && eigen.length) {
      var first = eigen[0];
      var value = finite(first && first.value != null ? first.value : first);
      if (value !== null) findings.push('The first stored eigenvalue is ' + numText(value) + '.');
    }
    var rotation = (bundle.rotation && (bundle.rotation.method || bundle.rotation.rotationMethod)) || overview.rotation;
    if (rotation) findings.push('Rotation method: ' + rotation + '.');
    var diagnostics = [];
    if (formatP(overview.bartlettP)) diagnostics.push('Bartlett ' + formatP(overview.bartlettP) + '. That test concerns the correlation matrix. It does not confirm that the retained components are the right summary.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'The components are a reorganization of the supplied variables. They do not by themselves name a latent cause.',
      limitations: finite(overview.missingRows) !== null ? [Math.round(overview.missingRows) + ' rows are recorded as missing.'] : [],
      signal: finite(overview.kmo) !== null ? 'KMO ' + numText(overview.kmo) : 'PCA',
      source: 'pca'
    });
  }

  function buildFactorAssessment(payload) {
    payload = payload || {};
    var extraction = payload.extraction || {};
    var suitability = payload.suitability || {};
    if (finite(extraction.retainedFactors) === null && finite(suitability.kmo) === null) return null;
    var conclusion = 'Exploratory factor analysis retains ' + (finite(extraction.retainedFactors) !== null ? Math.round(extraction.retainedFactors) + ' factors' : 'the stored factors')
      + (extraction.method ? ' by ' + extraction.method : '')
      + (finite(extraction.cumulativeVariancePct) !== null ? ', cumulative variance ' + numText(extraction.cumulativeVariancePct) + '%' : '')
      + '.';
    var rotation = payload.rotation || {};
    var findings = ['The retained variance is common-factor variance under the extraction method. It is not a principal-component variance share.'];
    if (rotation.method) findings.push('Rotation is ' + rotation.method + '. A pattern loading is not a structure loading unless the structure matrix is the one stored.');
    (rotation.factors || []).slice(0, 4).forEach(function (factor) {
      var top = (factor.topLoadings || [])[0];
      if (top) findings.push(factor.name + ' loads most strongly here on ' + top.variable + ' (' + numText(top.loading) + ').');
    });
    var diagnostics = [];
    if (finite(suitability.kmo) !== null) diagnostics.push('KMO is ' + numText(suitability.kmo) + '. It describes sampling adequacy for the correlations. It is not validity.');
    if (formatP(suitability.bartlettP)) diagnostics.push('Bartlett ' + formatP(suitability.bartlettP) + '.');
    var diag = payload.diagnostics || {};
    if (finite(diag.meanCommunality) !== null) diagnostics.push('Mean communality is ' + numText(diag.meanCommunality) + '.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'Factor names are labels for the loading pattern. The analysis does not establish what construct the items measure.',
      limitations: [],
      signal: finite(extraction.retainedFactors) !== null ? Math.round(extraction.retainedFactors) + ' factors' : 'Factor analysis',
      source: 'factor'
    });
  }

  function buildClusterAssessment(payload) {
    payload = payload || {};
    var setup = payload.setup || {};
    var quality = payload.quality || {};
    if (finite(setup.k) === null && finite(quality.averageSilhouette) === null) return null;
    var conclusion = (setup.method || 'The cluster solution')
      + (finite(setup.k) !== null ? ' with k = ' + Math.round(setup.k) : '')
      + (finite(setup.cases) !== null ? ' on ' + Math.round(setup.cases) + ' cases' : '')
      + (finite(quality.averageSilhouette) !== null ? '. Average silhouette is ' + numText(quality.averageSilhouette) : '')
      + '.';
    var findings = [];
    (payload.clusters || []).slice(0, 6).forEach(function (row) {
      if (!row) return;
      findings.push('Cluster ' + row.cluster + (finite(row.cases) !== null ? ' has ' + Math.round(row.cases) + ' cases' : '') + (finite(row.sharePct) !== null ? ' (' + Math.round(row.sharePct) + '%)' : '') + '.');
    });
    if (finite(quality.explainedVariance) !== null) findings.push('The stored explained-variance share is ' + numText(quality.explainedVariance) + '.');
    var diagnostics = [];
    if (finite(quality.averageSilhouette) !== null) diagnostics.push('The silhouette value is compared with the view thresholds 0.70, 0.50, and 0.25. Those cuts are descriptive. They are not a calibrated certainty.');
    if (quality.converged === false) diagnostics.push('The algorithm is recorded as not converged.');
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: diagnostics,
      interpretation: 'The clusters are a partition of this sample under the stored distance and standardization. They do not establish that the groups exist outside this analysis.',
      limitations: finite(setup.excludedRows) !== null ? [Math.round(setup.excludedRows) + ' rows were excluded before clustering.'] : [],
      signal: finite(setup.k) !== null ? 'k = ' + Math.round(setup.k) : 'Cluster',
      source: 'cluster'
    });
  }

  function joinLabels(names) {
    names = (names || []).filter(Boolean);
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  function proseLabel(name) {
    return String(name || '').toLowerCase();
  }

  function correlationMagnitude(r) {
    var a = Math.abs(finite(r));
    if (a === null) return null;
    if (a < 0.10) return 'negligible';
    if (a < 0.30) return 'modest';
    if (a < 0.50) return 'moderate';
    return 'strong';
  }

  function correlationDirection(r) {
    var n = finite(r);
    if (n === null || Math.abs(n) < 0.10) return '';
    return n < 0 ? 'negative' : 'positive';
  }

  function sentenceCase(text) {
    text = String(text || '');
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function fisherInterval(r, n, controls) {
    var value = finite(r);
    var size = finite(n);
    var k = finite(controls);
    if (k === null) k = 0;
    if (value === null || size === null) return null;
    var denom = size - 3 - k;
    if (denom < 1 || Math.abs(value) >= 0.999) return null;
    var z = Math.atanh(value);
    var se = 1 / Math.sqrt(denom);
    var z95 = 1.959963984540054;
    return { lo: Math.tanh(z - z95 * se), hi: Math.tanh(z + z95 * se) };
  }

  function describePartialComparison(spec) {
    spec = spec || {};
    var x = spec.x || 'The first variable';
    var y = spec.y || 'the second variable';
    var controls = spec.controls || [];
    var r0 = finite(spec.ordinaryR != null ? spec.ordinaryR : (spec.ordinary && spec.ordinary.r));
    var r1 = finite(spec.partialR != null ? spec.partialR : (spec.partial && spec.partial.r));
    var p0 = finite(spec.ordinaryP != null ? spec.ordinaryP : (spec.ordinary && spec.ordinary.p));
    var p1 = finite(spec.partialP != null ? spec.partialP : (spec.partial && spec.partial.p));
    var n = finite(spec.n);
    var alpha = finite(spec.alpha);
    if (alpha === null) alpha = 0.05;
    var held = joinLabels(controls);
    var ci = spec.partialCi || null;
    if (!ci && controls.length) ci = fisherInterval(r1, n, controls.length);
    var ciText = ci && numText(ci.lo) !== null && numText(ci.hi) !== null
      ? '95% CI ' + numText(ci.lo) + ' to ' + numText(ci.hi)
      : '';
    var nText = n !== null ? 'n = ' + Math.round(n) : '';
    var sampleClause = [ciText, nText].filter(Boolean).join('; ');

    function ordinaryClause() {
      if (r0 === null) return x + ' and ' + y + ' do not have an ordinary correlation to report';
      if (Math.abs(r0) < 0.10) return x + ' and ' + y + ' show almost no overall linear association (r = ' + numText(r0) + ')';
      return x + ' and ' + y + ' show a ' + correlationMagnitude(r0) + ' ' + correlationDirection(r0) + ' overall linear association (r = ' + numText(r0) + ')';
    }

    if (!controls.length) {
      return {
        code: 'same',
        badge: 'Unadjusted',
        story: 'Nothing is being adjusted for, so both plots show the same unadjusted relationship.',
        paragraphs: [
          ordinaryClause() + (nText ? ' (' + nText + ')' : '') + '. No variable is held constant, so this is the ordinary Pearson correlation.',
          'Association does not establish causation.'
        ]
      };
    }

    if (r0 === null || r1 === null) {
      return {
        code: 'unknown',
        badge: '—',
        story: 'After accounting for ' + held + ', the partial correlation could not be computed.',
        paragraphs: ['Both values need complete cases on ' + x + ', ' + y + ', and ' + held + '.']
      };
    }

    var abs0 = Math.abs(r0);
    var abs1 = Math.abs(r1);
    var sig0 = p0 !== null && p0 < alpha;
    var sig1 = p1 !== null && p1 < alpha;
    var magnitude = correlationMagnitude(r1);
    var direction = r1 < 0 ? 'negative' : 'positive';
    var described = (magnitude === 'negligible' ? 'negligible' : magnitude + ' ' + direction) + ' association';
    var code = 'similar';
    var partialClause = 'a ' + described + ' remains';
    var badge = sentenceCase(described) + ' is about the same';
    var story = 'After accounting for ' + held + ', the association between ' + x + ' and ' + y + ' is about the same.';
    if (r0 * r1 < 0 && abs0 >= 0.05 && abs1 >= 0.05) {
      code = 'reversed';
      partialClause = 'the association changes sign to a ' + described;
      badge = 'Sign reverses to a ' + described;
      story = 'After accounting for ' + held + ', the association between ' + x + ' and ' + y + ' changes sign.';
    } else if (abs0 < 0.10 && !(sig0 && abs0 >= 0.05) && (abs1 >= 0.10 || sig1)) {
      code = 'emerges';
      partialClause = 'a ' + described + ' appears';
      badge = sentenceCase(described) + ' emerges';
      story = 'After accounting for ' + held + ', a ' + described + ' between ' + x + ' and ' + y + ' emerges.';
    } else if ((abs0 >= 0.10 || sig0) && abs1 < 0.10 && !sig1) {
      code = 'attenuates';
      partialClause = 'little linear association remains';
      badge = 'Association attenuates to near zero';
      story = 'After accounting for ' + held + ', the association between ' + x + ' and ' + y + ' attenuates to near zero.';
    } else if (abs1 > abs0 + 0.05) {
      code = 'stronger';
      partialClause = 'the ' + described + ' is stronger';
      badge = sentenceCase(described) + ' strengthens';
      story = 'After accounting for ' + held + ', the ' + direction + ' association between ' + x + ' and ' + y + ' is stronger. Strength is judged from the absolute correlation.';
    } else if (abs1 < abs0 - 0.05) {
      code = 'weaker';
      partialClause = 'the ' + described + ' is weaker';
      badge = sentenceCase(described) + ' weakens';
      story = 'After accounting for ' + held + ', the ' + direction + ' association between ' + x + ' and ' + y + ' is weaker. Strength is judged from the absolute correlation.';
    }

    var stats = 'partial r = ' + numText(r1) + (sampleClause ? '; ' + sampleClause : '');
    var first = ordinaryClause() + '. After accounting for ' + held + ', ' + partialClause + ' (' + stats + ').';
    var second;
    if (abs1 < 0.10) {
      second = 'Once the part predictable from ' + held + ' is removed, little linear association remains.';
    } else {
      var lean = r1 < 0 ? 'below' : 'above';
      second = 'Among observations with similar ' + held + ', ' + proseLabel(x) + ' above its predicted level tends to accompany ' + proseLabel(y) + ' ' + lean + ' its predicted level.';
    }
    var cases = n !== null ? ' on these ' + Math.round(n) + ' complete cases' : '';
    second += ' This Pearson partial correlation describes an adjusted association' + cases + '; it does not establish causation.';
    return { code: code, badge: badge, story: story, paragraphs: [first, second] };
  }

  function buildPartialAssessment(allData) {
    allData = allData || {};
    var partial = allData.partial || {};
    var controls = partial.controls || [];
    var selected = partial.selected;
    var matrix = allData.matrix;
    var strongest = matrix && (matrix.strongest || matrix.pairs || [])[0];
    if (!controls.length && !selected && !strongest) return null;

    if (!controls.length) {
      var ordinary = 'Nothing is in Adjust for, so this view is still the ordinary Pearson matrix. No partial correlation has been computed';
      if (strongest) ordinary += '. The largest |r| is ' + numText(strongest.r) + ' between ' + strongest.x + ' and ' + strongest.y + ' (pair n = ' + strongest.n + ')';
      return ruled({
        conclusion: ordinary + '.',
        findings: ['Place a variable in Adjust for to hold it constant. The partial r is then compared with the ordinary r on the same complete cases.'],
        interpretation: 'Until a variable is held constant, the partial result is the unadjusted correlation. The view is not yet answering the adjusted question.',
        limitations: ['A partial correlation is not a causal estimate. Which variable is adjusted for changes the question being asked.'],
        signal: 'No adjustment',
        source: 'partial-correlations'
      });
    }

    if (!selected || !selected.unadjusted || !selected.partial || numText(selected.unadjusted.r) === null || numText(selected.partial.r) === null) {
      return ruled({
        conclusion: 'Adjusting for ' + controls.join(', ') + ', but a partial correlation could not be computed for the pairs in view.',
        findings: ['Both values need complete cases on the pair and on every variable in Adjust for.'],
        interpretation: 'The adjustment is set, but there is not yet a partial r to compare with the ordinary correlation.',
        limitations: ['A partial correlation is not a causal estimate.'],
        signal: 'Partial unavailable',
        source: 'partial-correlations'
      });
    }

    var focus = partial.selectedByUser ? 'For the open pair' : 'For the pair whose correlation changes most';
    var pattern = selected.change && selected.change.label
      ? selected.change.label.replace(/\.$/, '')
      : 'The partial correlation differs from the ordinary correlation';
    var delta = numText(selected.deltaR);
    var conclusion = 'After adjusting for ' + controls.join(', ') + ', ' + selected.x + ' and ' + selected.y
      + ' move from r = ' + numText(selected.unadjusted.r) + ' to partial r = ' + numText(selected.partial.r)
      + ' (n = ' + selected.n + '). ' + pattern + '.';
    var findings = [
      focus + ', ordinary r = ' + numText(selected.unadjusted.r)
        + (formatP(selected.unadjusted.p) ? ' (' + formatP(selected.unadjusted.p) + ')' : '')
        + ' and partial r = ' + numText(selected.partial.r)
        + (formatP(selected.partial.p) ? ' (' + formatP(selected.partial.p) + ')' : '')
        + (delta !== null ? '. Change in r = ' + delta : '')
        + '.'
    ];
    (partial.others || []).slice(0, 3).forEach(function (row) {
      if (!row || numText(row.unadjusted && row.unadjusted.r) === null || numText(row.partial && row.partial.r) === null) return;
      findings.push(row.x + ' and ' + row.y + ': r = ' + numText(row.unadjusted.r) + ' to partial r = ' + numText(row.partial.r) + ' (n = ' + row.n + ').');
    });
    if (partial.excluded && partial.excluded.length) {
      findings.push('Left out of the matrix: ' + partial.excluded.join(', ') + '.');
    }
    var limitations = [
      'Both r values use the same complete cases. The difference is the adjustment, not a change in who is included.',
      'A weaker or stronger partial r does not show that the original association was caused by the adjusted variables. The result answers only the adjusted question.'
    ];
    if (partial.headerRows && selected.n != null && Number(selected.n) !== Number(partial.headerRows)) {
      limitations.unshift('Use n = ' + selected.n + ', not the header row count ' + partial.headerRows + '.');
    }
    return ruled({
      conclusion: conclusion,
      findings: findings,
      interpretation: 'Partial r correlates what remains of ' + selected.x + ' and ' + selected.y + ' after the part predictable from ' + controls.join(', ') + ' is removed. Both numbers use the same ' + selected.n + ' complete cases.',
      limitations: limitations,
      signal: 'partial r = ' + numText(selected.partial.r),
      source: 'partial-correlations'
    });
  }

  function buildCorrelationAssessment(allData) {
    allData = allData || {};
    var matrix = allData.matrix;
    if (!matrix || !(matrix.pairs || []).length) return null;
    var strongest = (matrix.strongest || matrix.pairs)[0];
    var conclusion = 'Pearson correlations were computed for ' + ((allData.data && allData.data.variables && allData.data.variables.length) || 'the') + ' variables'
      + (strongest ? '. The largest |r| is ' + numText(strongest.r) + ' between ' + strongest.x + ' and ' + strongest.y + ' (pair n = ' + strongest.n + ')' : '')
      + '.';
    var findings = ['These are Pearson correlations. Association does not establish causation.'];
    var partial = allData.partial && allData.partial.selected;
    if (partial && partial.partial && partial.unadjusted) {
      findings.push((partial.x) + ' and ' + partial.y + ' have unadjusted r = ' + numText(partial.unadjusted.r) + ' and partial r = ' + numText(partial.partial.r) + ' on the same ' + partial.n + ' complete cases'
        + (partial.controls && partial.controls.length ? ' after controlling for ' + partial.controls.join(', ') : '')
        + '. The partial correlation is not the unadjusted correlation.');
      if (allData.partial.headerRows && partial.n !== allData.partial.headerRows) {
        findings.push('The pair uses n = ' + partial.n + '. The header row count is ' + allData.partial.headerRows + ' and is not the pair denominator.');
      }
    }
    var limitations = ['The matrix does not apply a multiplicity adjustment across pairs. A selected pair is not a corrected family of tests.'];
    if (allData.reliability && finite(allData.reliability.alpha) !== null) {
      limitations.push('A Cronbach alpha computed from these columns is a consistency coefficient. It is not evidence of validity.');
    }
    return ruled({
      conclusion: conclusion,
      findings: findings,
      diagnostics: [],
      interpretation: 'Magnitude and pair-specific n belong to the computed coefficient. A partial result answers the adjusted question only.',
      limitations: limitations,
      signal: strongest ? 'r = ' + numText(strongest.r) : 'Correlations',
      source: 'correlations'
    });
  }

  function buildPowerAssessment(payload) {
    payload = payload || {};
    var power = finite(payload.power);
    var nNeeded = finite(payload.nNeeded);
    if (power === null && nNeeded === null) return null;
    var planning = payload.mode === 'n' || payload.mode === 'sample';
    var conclusion = planning
      ? 'Under the stated planning assumptions, the required total N is ' + (nNeeded !== null ? Math.round(nNeeded) : 'not returned') + ' for target power ' + (formatLevel(payload.desired) || 'the stored target') + '.'
      : 'Under the stated planning assumptions, estimated power is ' + formatLevel(power) + ' for f = ' + numText(payload.f) + ', k = ' + payload.k + ', N = ' + payload.N + ', alpha = ' + formatAlpha(payload.alpha) + '.';
    return ruled({
      conclusion: conclusion,
      findings: ['The effect, alpha, number of groups, and one design N are the inputs. The figure is not a second test of an observed result.'],
      diagnostics: ['The calculation uses the noncentral F approximation on this page.'],
      interpretation: payload.fromObserved
        ? 'The effect was taken from an observed analysis and then treated as the planning effect. This power figure is not additional evidence for that test.'
        : 'This is a prospective calculation. It describes the design assumptions, not data that have already been tested.',
      limitations: [],
      signal: planning ? 'Required N' : 'Power ' + (formatLevel(power) || ''),
      source: 'power'
    });
  }

  function buildKnownModuleAssessment(kind, payload) {
    var key = String(kind || '');
    if (key === 'logistic') return buildLogisticAssessment(payload);
    if (key === 'independent') return buildIndependentAssessment(payload);
    if (key === 'repeated' || key === 'dependent') return buildRepeatedAssessment(payload);
    if (key === 'regression') return buildRegressionAssessment(payload);
    if (key === 'contingency') return buildContingencyAssessment(payload);
    if (key === 'capability') return buildCapabilityAssessment(payload);
    if (key === 'mixed' || key === 'mixed-model') return buildMixedAssessment(payload);
    if (key === 'reliability') return buildReliabilityAssessment(payload);
    if (key === 'meta' || key === 'meta-analysis') return buildMetaAssessment(payload);
    if (key === 'anova') return buildAnovaAssessment(payload);
    if (key === 'pca') return buildPcaAssessment(payload);
    if (key === 'factor') return buildFactorAssessment(payload);
    if (key === 'cluster') return buildClusterAssessment(payload);
    if (key === 'correlations') return buildCorrelationAssessment(payload);
    if (key === 'partial-correlations') return buildPartialAssessment(payload);
    if (key === 'power') return buildPowerAssessment(payload);
    return null;
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
    outlierAdvice: outlierAdvice,
    outlierNext: outlierNext,
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
    groupsFromContext: groupsFromContext,
    hypothesisFromRecord: hypothesisFromRecord,
    buildKnownModuleAssessment: buildKnownModuleAssessment,
    describePartialComparison: describePartialComparison,
    enforceRequiredFindings: enforceRequiredFindings,
    moduleGroundRules: moduleGroundRules
  };
});
