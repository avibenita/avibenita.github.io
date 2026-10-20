/**
 * Split Index for the Survey Segmentation Matrix Drivers tab.
 *
 * Pure calculations. Group ids are generic. Display labels such as
 * "Tending to stay" stay in the configuration and are not used here
 * to decide membership.
 *
 * The displayed Split Index is always non-negative. signedDifference
 * keeps the direction (group 1 mean minus group 2 mean).
 * Standardized values are the absolute pooled-SD mean difference,
 * labeled "Standardized mean difference". Raw and standardized
 * indices are never mixed in one ranking.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoSplitIndex = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var COPY = {
    description: 'Split Index measures how strongly each survey factor differentiates the two selected respondent groups. Larger values indicate greater separation and potentially greater managerial relevance.',
    tooltip: 'A large Split Index indicates an association with group membership. It does not, by itself, establish that the factor causes the outcome.',
    rawHelp: 'Best when all factors use the same response scale.',
    standardizedHelp: 'Accounts for factor variability and supports comparison across different scales.',
    scaleWarning: 'The selected factors may use different scales. Consider the standardized Split Index.',
    empty: 'Select survey factors to calculate the Split Index.',
    significanceNote: 'Statistical significance depends on both the size of the difference and the available sample. Use the Split Index to assess separation and the confidence interval to assess precision.',
    zeroVariance: 'No within-group variation',
    patterns: {
      strong: 'Ratings differ substantially between the two selected groups. This factor may warrant closer managerial attention.',
      sharedWeakness: 'Both groups rate this factor relatively poorly, but it does not strongly differentiate them.',
      sharedStrength: 'Both groups rate this factor positively, so it is unlikely to explain much of the group difference.',
      groupSpecific: 'The lower rating is concentrated in one group and contributes strongly to the observed separation.'
    }
  };

  function isNum(n) {
    return typeof n === 'number' && isFinite(n);
  }

  function logGamma(z) {
    var p = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    var x = p[0];
    var i;
    for (i = 1; i < 9; i++) x += p[i] / (z + i);
    var t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function betacf(a, b, x) {
    var qab = a + b;
    var qap = a + 1;
    var qam = a - 1;
    var c = 1;
    var d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    var h = d;
    var m;
    for (m = 1; m <= 200; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }

  function regularizedIncompleteBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    if (x < (a + 1) / (a + b + 2)) {
      return Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) * betacf(a, b, x) / a;
    }
    return 1 - Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lnBeta) * betacf(b, a, 1 - x) / b;
  }

  function tCdf(t, df) {
    if (!isFinite(t) || !(df > 0)) return null;
    var x = df / (df + t * t);
    var tail = 0.5 * regularizedIncompleteBeta(x, df / 2, 0.5);
    return t >= 0 ? 1 - tail : tail;
  }

  function tCritical(probability, df) {
    if (!(df > 0)) return null;
    var lo = 0;
    var hi = 1;
    while (tCdf(hi, df) < probability) {
      hi *= 2;
      if (hi > 1e6) return null;
    }
    var i;
    for (i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2;
      if (tCdf(mid, df) < probability) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function calculateGroupStatistics(pairs) {
    var list = (pairs || []).filter(function (pair) {
      return pair && isNum(pair.value);
    });
    var validN = list.length;
    if (!validN) {
      return { mean: null, sd: null, variance: null, validN: 0, weightedN: 0, nEff: 0 };
    }
    var wSum = 0;
    var w2 = 0;
    var wx = 0;
    list.forEach(function (pair) {
      var w = isFinite(pair.weight) && pair.weight > 0 ? pair.weight : 0;
      wSum += w;
      w2 += w * w;
      wx += w * pair.value;
    });
    if (!(wSum > 0)) {
      return { mean: null, sd: null, variance: null, validN: validN, weightedN: 0, nEff: 0 };
    }
    var mean = wx / wSum;
    var ss = 0;
    list.forEach(function (pair) {
      var w = isFinite(pair.weight) && pair.weight > 0 ? pair.weight : 0;
      var d = pair.value - mean;
      ss += w * d * d;
    });
    var denom = wSum - (w2 / wSum);
    var variance = validN >= 2 && denom > 1e-12 ? ss / denom : (validN >= 2 ? 0 : null);
    var nEff = w2 > 0 ? (wSum * wSum) / w2 : 0;
    return {
      mean: mean,
      sd: variance == null ? null : Math.sqrt(Math.max(0, variance)),
      variance: variance,
      validN: validN,
      weightedN: wSum,
      nEff: nEff
    };
  }

  function calculateRawSplitIndex(mean1, mean2) {
    if (!isNum(mean1) || !isNum(mean2)) return null;
    return Math.abs(mean1 - mean2);
  }

  function calculateStandardizedSplitIndex(group1, group2) {
    if (!group1 || !group2) return null;
    var n1 = group1.nEff;
    var n2 = group2.nEff;
    if (!(n1 > 1) || !(n2 > 1)) return null;
    if (group1.variance == null || group2.variance == null) return null;
    var den = n1 + n2 - 2;
    if (!(den > 0)) return null;
    var sp = Math.sqrt(((n1 - 1) * group1.variance + (n2 - 1) * group2.variance) / den);
    if (!(sp > 0)) return null;
    return Math.abs(group1.mean - group2.mean) / sp;
  }

  function calculateWelchTest(group1, group2) {
    if (!group1 || !group2 || !isNum(group1.mean) || !isNum(group2.mean)) return null;
    var n1 = group1.nEff;
    var n2 = group2.nEff;
    if (!(n1 > 1) || !(n2 > 1) || group1.variance == null || group2.variance == null) return null;
    var diff = group1.mean - group2.mean;
    var se2 = group1.variance / n1 + group2.variance / n2;
    var se = Math.sqrt(Math.max(0, se2));
    if (!(se > 0)) {
      return { statistic: null, degreesOfFreedom: null, pValue: diff === 0 ? 1 : null, standardError: 0 };
    }
    var statistic = diff / se;
    var den = Math.pow(group1.variance / n1, 2) / (n1 - 1) + Math.pow(group2.variance / n2, 2) / (n2 - 1);
    var df = den > 0 ? (se2 * se2) / den : (n1 + n2 - 2);
    var cdf = tCdf(Math.abs(statistic), df);
    var pValue = cdf == null ? null : Math.max(0, Math.min(1, 2 * (1 - cdf)));
    return { statistic: statistic, degreesOfFreedom: df, pValue: pValue, standardError: se };
  }

  function calculateDifferenceCI(group1, group2, welch) {
    var test = welch || calculateWelchTest(group1, group2);
    if (!test || !isNum(group1.mean) || !isNum(group2.mean)) return null;
    var diff = group1.mean - group2.mean;
    if (!(test.standardError > 0) || !(test.degreesOfFreedom > 0)) {
      return test.standardError === 0 && diff === 0 ? { lower: 0, upper: 0 } : null;
    }
    var critical = tCritical(0.975, test.degreesOfFreedom);
    if (!isFinite(critical)) return null;
    return {
      lower: diff - critical * test.standardError,
      upper: diff + critical * test.standardError
    };
  }

  function adjustPValues(raw, method) {
    var m = raw.length;
    var key = String(method || 'bh').toLowerCase();
    if (!m) return [];
    if (key === 'none') return raw.slice();
    if (key === 'bonferroni') return raw.map(function (p) { return Math.min(1, p * m); });
    var idx = raw.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return a.p - b.p; });
    var out = new Array(m);
    if (key === 'holm') {
      var running = 0;
      var k;
      for (k = 0; k < m; k++) {
        var adj = Math.min(1, (m - k) * idx[k].p);
        running = Math.max(running, adj);
        out[idx[k].i] = running;
      }
      return out;
    }
    var runningBh = 1;
    for (var j = m - 1; j >= 0; j--) {
      var bh = Math.min(1, (m / (j + 1)) * idx[j].p);
      runningBh = Math.min(runningBh, bh);
      out[idx[j].i] = runningBh;
    }
    return out;
  }

  function factorDefinitions(config) {
    var source = config || {};
    if (Array.isArray(source.factors) && source.factors.length) {
      return source.factors.map(function (factor, index) {
        var columns = Array.isArray(factor.columns) ? factor.columns.slice() : [];
        return {
          id: factor.id || columns.join('+') || ('factor' + (index + 1)),
          label: factor.label || columns.join(' + ') || ('Factor ' + (index + 1)),
          columns: columns,
          originalOrder: index
        };
      });
    }
    return (source.factorColumns || []).map(function (name, index) {
      return { id: String(name), label: String(name), columns: [String(name)], originalOrder: index };
    });
  }

  function segmentLabel(config, key) {
    var segment = config && config.segments && config.segments[key];
    return segment && segment.label ? segment.label : key;
  }

  function comparisonSpec(config, options) {
    var mode = (options && options.mode) || 'stay';
    var cfg = config || {};
    var y = cfg.yDimension || {};
    var x = cfg.xDimension || {};
    if (mode === 'satisfaction') {
      return {
        mode: mode,
        group1: { id: 'highX', label: x.highLabel || 'High' },
        group2: { id: 'lowX', label: x.lowLabel || 'Low' },
        title: 'Factor Differentiation — Split Index'
      };
    }
    if (mode === 'segments') {
      var a = options.group1 || 'highXHighY';
      var b = options.group2 || 'lowXLowY';
      return {
        mode: mode,
        group1: { id: a, label: segmentLabel(cfg, a) },
        group2: { id: b, label: segmentLabel(cfg, b) },
        title: 'Factor Differentiation — Split Index',
        sameGroup: a === b
      };
    }
    if (mode === 'segmentVsRest') {
      var key = options.segment || options.group1 || 'highXHighY';
      return {
        mode: mode,
        group1: { id: key, label: segmentLabel(cfg, key) },
        group2: { id: 'rest', label: 'All other respondents' },
        title: 'Factor Differentiation — Split Index'
      };
    }
    return {
      mode: 'stay',
      group1: { id: 'highY', label: y.highLabel || 'High' },
      group2: { id: 'lowY', label: y.lowLabel || 'Low' },
      title: 'Retention Factors — Split Index'
    };
  }

  function inGroup(respondent, which, config, spec) {
    if (spec.mode === 'satisfaction') {
      var highX = respondent.xScore >= config.xDimension.threshold;
      return which === 1 ? highX : !highX;
    }
    if (spec.mode === 'segments') {
      var key = which === 1 ? spec.group1.id : spec.group2.id;
      return respondent.segment === key;
    }
    if (spec.mode === 'segmentVsRest') {
      var selected = respondent.segment === spec.group1.id;
      return which === 1 ? selected : !selected;
    }
    var highY = respondent.yScore >= config.yDimension.threshold;
    return which === 1 ? highY : !highY;
  }

  function inferScale(values) {
    if (!values.length) return null;
    var min = values[0];
    var max = values[0];
    values.forEach(function (n) {
      if (n < min) min = n;
      if (n > max) max = n;
    });
    function within(a, b) { return min >= a - 1e-9 && max <= b + 1e-9; }
    if (within(1, 5)) return { min: 1, max: 5 };
    if (within(1, 7)) return { min: 1, max: 7 };
    if (within(1, 6)) return { min: 1, max: 6 };
    if (within(0, 10)) return { min: 0, max: 10 };
    if (within(1, 10)) return { min: 1, max: 10 };
    if (within(0, 100)) return { min: 0, max: 100 };
    return { min: min, max: max };
  }

  function classifyFactorPattern(factor, rank, cutoff, maxIndex) {
    var index = factor.selectedSplitIndex;
    var large = rank <= 3 && isNum(index) && index > 0 && (!isNum(maxIndex) || maxIndex <= 0 || index >= maxIndex * 0.5);
    var low1 = isNum(factor.group1.mean) && factor.group1.mean < cutoff;
    var low2 = isNum(factor.group2.mean) && factor.group2.mean < cutoff;
    var high1 = isNum(factor.group1.mean) && factor.group1.mean >= cutoff;
    var high2 = isNum(factor.group2.mean) && factor.group2.mean >= cutoff;
    if (large && ((low1 && high2) || (low2 && high1))) {
      var lower = low1 ? factor.group1.label : factor.group2.label;
      return {
        id: 'groupSpecific',
        label: 'Group-specific weakness',
        lowerGroup: lower,
        description: COPY.patterns.groupSpecific
      };
    }
    if (large) {
      return { id: 'strong', label: 'Strong differentiator', description: COPY.patterns.strong };
    }
    if (low1 && low2) {
      return { id: 'sharedWeakness', label: 'Shared weakness', description: COPY.patterns.sharedWeakness };
    }
    if (high1 && high2) {
      return { id: 'sharedStrength', label: 'Shared strength', description: COPY.patterns.sharedStrength };
    }
    return {
      id: 'modest',
      label: 'Modest separation',
      description: 'The ratings differ only modestly relative to the other selected factors. This is a descriptive pattern, not a priority score.'
    };
  }

  function selectedIndex(factor, indexType) {
    return indexType === 'standardized' ? factor.standardizedSplitIndex : factor.rawSplitIndex;
  }

  function sortSplitIndexResults(factors, mode) {
    var list = (factors || []).slice();
    var key = mode || 'splitDesc';
    list.sort(function (a, b) {
      if (key === 'order') return a.originalOrder - b.originalOrder;
      if (key === 'name') return String(a.factorLabel).localeCompare(String(b.factorLabel));
      if (key === 'mean1' || key === 'mean2') {
        var field = key === 'mean1' ? a.group1.mean : a.group2.mean;
        var other = key === 'mean1' ? b.group1.mean : b.group2.mean;
        var d = (other || 0) - (field || 0);
        if (d) return d;
        return a.originalOrder - b.originalOrder;
      }
      var av = a.selectedSplitIndex;
      var bv = b.selectedSplitIndex;
      var aMissing = !isNum(av);
      var bMissing = !isNum(bv);
      if (aMissing && bMissing) return a.originalOrder - b.originalOrder;
      if (aMissing) return 1;
      if (bMissing) return -1;
      var diff = key === 'splitAsc' ? av - bv : bv - av;
      if (diff) return diff;
      return a.originalOrder - b.originalOrder;
    });
    return list;
  }

  function formatFixed(n, digits) {
    if (!isNum(n)) return '';
    return (Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits)).toFixed(digits);
  }

  function formatP(p) {
    if (!isNum(p)) return '';
    if (p < 0.001) return '<0.001';
    return (Math.round(p * 1000) / 1000).toFixed(3);
  }

  function buildFactorTooltip(factor, options) {
    var showStats = !options || options.showEvidence !== false;
    var lines = [factor.factorLabel, ''];
    [factor.group1, factor.group2].forEach(function (group) {
      lines.push(group.label);
      lines.push('Mean: ' + (isNum(group.mean) ? formatFixed(group.mean, 2) : '—') + (factor.weightUsed ? ' (weighted)' : ''));
      lines.push('Valid n: ' + group.validN);
      lines.push('SD: ' + (isNum(group.sd) ? formatFixed(group.sd, 2) : '—'));
      lines.push('');
    });
    var indexName = factor.indexType === 'standardized' ? 'Standardized Split Index' : 'Raw Split Index';
    lines.push(indexName + ': ' + (isNum(factor.selectedSplitIndex) ? formatFixed(factor.selectedSplitIndex, 2) : '—'));
    if (factor.aboveAverageSpread) {
      lines.push('Above the average Split Index + 1 SD' + (isNum(factor.spreadCutoff) ? ' (' + formatFixed(factor.spreadCutoff, 2) + ')' : '') + ', and thus may be an explaining factor.');
    }
    if (isNum(factor.signedDifference)) lines.push('Signed difference: ' + (factor.signedDifference > 0 ? '+' : '') + formatFixed(factor.signedDifference, 2));
    if (factor.standardizedSplitIndex == null && factor.standardizedUnavailable) lines.push(COPY.zeroVariance);
    if (showStats && factor.confidenceInterval) {
      lines.push('95% CI for difference: [' + formatFixed(factor.confidenceInterval.lower, 2) + ', ' + formatFixed(factor.confidenceInterval.upper, 2) + ']');
    }
    if (showStats && factor.welchTest && isNum(factor.welchTest.pValue)) {
      lines.push('Welch p-value: ' + formatP(factor.welchTest.pValue));
    }
    return lines.join('\n').replace(/\n$/, '');
  }

  function calculateSplitIndex(respondents, config, options) {
    var cfg = config || {};
    var opts = options || {};
    var defs = factorDefinitions(cfg);
    var spec = comparisonSpec(cfg, opts);
    if (!defs.length) {
      return { ok: false, empty: true, error: COPY.empty, spec: spec, factors: [], displayed: [] };
    }
    if (spec.sameGroup) {
      return { ok: false, empty: false, error: 'Select two different groups. A group cannot be compared with itself.', spec: spec, factors: [], displayed: [] };
    }
    var wave = opts.wave === 'previous' ? 'previous' : 'current';
    var waveValue = wave === 'previous' ? cfg.previousWave : cfg.currentWave;
    if (wave === 'previous' && !cfg.previousWave) {
      return { ok: false, empty: false, error: 'A previous wave is not available for this analysis.', spec: spec, factors: [], displayed: [] };
    }
    var pool = (respondents || []).filter(function (respondent) {
      if (!cfg.waveColumn || waveValue == null || waveValue === '') return true;
      return String(respondent.wave) === String(waveValue);
    });
    var group1Rows = pool.filter(function (respondent) { return inGroup(respondent, 1, cfg, spec); });
    var group2Rows = pool.filter(function (respondent) { return inGroup(respondent, 2, cfg, spec); });
    var overlap = 0;
    var seen = {};
    function rowKey(respondent, index) {
      if (respondent.index != null) return 'i' + respondent.index;
      return 'r' + index + ':' + (respondent.id || '');
    }
    group1Rows.forEach(function (respondent, index) { seen[rowKey(respondent, index)] = true; });
    group2Rows.forEach(function (respondent, index) {
      if (seen[rowKey(respondent, index)]) overlap += 1;
    });
    var indexType = opts.index === 'standardized' ? 'standardized' : 'raw';
    var missingData = opts.missingData === 'complete' ? 'complete' : 'available';
    var completeIds = null;
    if (missingData === 'complete') {
      completeIds = {};
      pool.forEach(function (respondent, index) {
        var id = respondent.index != null ? ('i' + respondent.index) : ('r' + index + ':' + (respondent.id || ''));
        var complete = defs.every(function (factor) {
          var score = respondent.factorScores && respondent.factorScores[factor.id];
          return isNum(score);
        });
        if (complete) completeIds[id] = true;
      });
    }
    var weightUsed = pool.some(function (respondent) { return respondent.weight != null && respondent.weight !== 1; });
    var factors = defs.map(function (factor) {
      function pairs(rows) {
        var out = [];
        rows.forEach(function (respondent, index) {
          var id = respondent.index != null ? ('i' + respondent.index) : ('r' + index + ':' + (respondent.id || ''));
          if (completeIds && !completeIds[id]) return;
          var score = respondent.factorScores && respondent.factorScores[factor.id];
          if (!isNum(score)) return;
          out.push({ value: score, weight: respondent.weight > 0 ? respondent.weight : 1 });
        });
        return out;
      }
      var g1 = calculateGroupStatistics(pairs(group1Rows));
      var g2 = calculateGroupStatistics(pairs(group2Rows));
      var signed = isNum(g1.mean) && isNum(g2.mean) ? g1.mean - g2.mean : null;
      var raw = calculateRawSplitIndex(g1.mean, g2.mean);
      var standardized = calculateStandardizedSplitIndex(g1, g2);
      var welch = calculateWelchTest(g1, g2);
      var ci = calculateDifferenceCI(g1, g2, welch);
      var scores = [];
      pool.forEach(function (respondent) {
        var score = respondent.factorScores && respondent.factorScores[factor.id];
        if (isNum(score)) scores.push(score);
      });
      var scale = inferScale(scores);
      return {
        factorId: factor.id,
        factorLabel: factor.label,
        originalOrder: factor.originalOrder,
        scale: scale,
        cutoff: scale ? (scale.min + scale.max) / 2 : null,
        weightUsed: weightUsed,
        indexType: indexType,
        group1: {
          id: spec.group1.id,
          label: spec.group1.label,
          mean: g1.mean,
          sd: g1.sd,
          validN: g1.validN,
          weightedN: g1.weightedN
        },
        group2: {
          id: spec.group2.id,
          label: spec.group2.label,
          mean: g2.mean,
          sd: g2.sd,
          validN: g2.validN,
          weightedN: g2.weightedN
        },
        signedDifference: signed,
        rawSplitIndex: raw,
        standardizedSplitIndex: standardized,
        standardizedUnavailable: standardized == null && isFinite(raw),
        selectedSplitIndex: indexType === 'standardized' ? standardized : raw,
        confidenceInterval: ci,
        welchTest: welch ? {
          statistic: welch.statistic,
          degreesOfFreedom: welch.degreesOfFreedom,
          pValue: welch.pValue,
          adjustedPValue: null
        } : null
      };
    });
    var tested = factors.filter(function (factor) { return factor.welchTest && isFinite(factor.welchTest.pValue); });
    var adjusted = adjustPValues(tested.map(function (factor) { return factor.welchTest.pValue; }), opts.adjustment || 'bh');
    tested.forEach(function (factor, index) { factor.welchTest.adjustedPValue = adjusted[index]; });
    var ranked = sortSplitIndexResults(factors.map(function (factor) {
      factor.selectedSplitIndex = selectedIndex(factor, indexType);
      return factor;
    }), 'splitDesc');
    var maxIndex = ranked.reduce(function (max, factor) {
      return isNum(factor.selectedSplitIndex) && factor.selectedSplitIndex > max ? factor.selectedSplitIndex : max;
    }, 0);
    ranked.forEach(function (factor, index) {
      factor.rank = index + 1;
      factor.pattern = classifyFactorPattern(factor, factor.rank, factor.cutoff == null ? (cfg.xDimension && cfg.xDimension.threshold) : factor.cutoff, maxIndex);
    });
    var spread = splitIndexSpread(factors);
    factors.forEach(function (factor) {
      factor.spreadCutoff = spread.cutoff;
      factor.aboveAverageSpread = spread.cutoff != null && isNum(factor.selectedSplitIndex) && factor.selectedSplitIndex > spread.cutoff;
    });
    var scaleKeys = {};
    factors.forEach(function (factor) {
      if (!factor.scale) return;
      scaleKeys[factor.scale.min + ':' + factor.scale.max] = true;
    });
    var sortMode = opts.sort || 'splitDesc';
    var ordered = sortSplitIndexResults(factors, sortMode);
    var topN = Number(opts.topN);
    if (topN === 5 || topN === 10 || topN === 15) {
      var keep = {};
      sortSplitIndexResults(factors, 'splitDesc').slice(0, topN).forEach(function (factor) { keep[factor.factorId] = true; });
      ordered = ordered.filter(function (factor) { return keep[factor.factorId]; });
    }
    return {
      ok: true,
      empty: false,
      error: null,
      overlap: overlap,
      spec: spec,
      title: spec.title,
      indexType: indexType,
      indexLabel: indexType === 'standardized' ? 'Standardized mean difference' : 'Raw mean difference',
      missingData: missingData,
      adjustment: opts.adjustment || 'bh',
      weightUsed: weightUsed,
      wave: wave,
      waveLabel: waveValue || '',
      scalesDiffer: Object.keys(scaleKeys).length > 1,
      group1: { id: spec.group1.id, label: spec.group1.label, validN: group1Rows.length },
      group2: { id: spec.group2.id, label: spec.group2.label, validN: group2Rows.length },
      spread: spread,
      factors: factors,
      displayed: ordered
    };
  }

  function splitIndexSpread(factors) {
    var values = [];
    (factors || []).forEach(function (factor) {
      if (isNum(factor.selectedSplitIndex)) values.push(factor.selectedSplitIndex);
    });
    var n = values.length;
    if (n < 2) return { n: n, mean: n ? values[0] : null, sd: null, cutoff: null };
    var sum = 0;
    values.forEach(function (value) { sum += value; });
    var mean = sum / n;
    var square = 0;
    values.forEach(function (value) {
      var diff = value - mean;
      square += diff * diff;
    });
    var sd = Math.sqrt(square / (n - 1));
    return { n: n, mean: mean, sd: sd, cutoff: mean + sd };
  }

  function spreadLine(result, light) {
    var spread = result && result.spread;
    if (!spread || !isNum(spread.cutoff)) return [];
    return [{
      value: spread.cutoff,
      color: '#e7c56a',
      dashStyle: 'ShortDash',
      width: 1.75,
      zIndex: 5,
      label: {
        text: 'Average + 1 SD',
        align: 'left',
        x: 8,
        y: -8,
        style: { color: light ? '#8a6a1d' : '#e7c56a', fontSize: '12px', fontWeight: '700' }
      }
    }];
  }

  function buildSplitIndexChartOptions(result, presentation) {
    var rows = (result && result.displayed) || [];
    var view = presentation || {};
    var ink = view.ink || '#f8fafc';
    var muted = view.muted || '#cbd5e1';
    var longLabel = rows.some(function (row) { return String(row.factorLabel).length > 22; });
    var indexName = result && result.indexType === 'standardized' ? 'Standardized Split Index' : 'Split Index';
    var groupName = function (group, fallback) {
      if (!group) return fallback;
      var n = group.validN != null ? ' (n = ' + group.validN + ')' : '';
      return (group.label || fallback) + n;
    };
    var angled = longLabel || rows.length > 6;
    var light = ink === '#1c1917';
    var indexInk = light ? '#57534e' : '#d6d3d1';
    var grid = light ? 'rgba(28,25,23,.28)' : 'rgba(226,232,240,.42)';
    var highlight = !!view.highlightSpread;
    return {
      chart: {
        type: 'spline',
        backgroundColor: 'transparent',
        spacingTop: 16,
        spacingRight: 18,
        spacingBottom: 12,
        spacingLeft: 12,
        style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
        scrollablePlotArea: rows.length > 8 ? { minWidth: rows.length * 108, scrollPositionX: 0 } : undefined
      },
      title: {
        text: view.title || null,
        align: 'center',
        margin: 6,
        style: { color: ink, fontSize: '26px', fontWeight: '600', letterSpacing: '0.04em' }
      },
      subtitle: {
        text: view.subtitle || null,
        align: 'center',
        style: { color: muted, fontSize: '13px', fontWeight: '500' }
      },
      credits: { enabled: false },
      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: { color: ink, fontWeight: '600', fontSize: '12px' },
        itemHoverStyle: { color: ink },
        symbolRadius: 2,
        padding: 8
      },
      xAxis: {
        categories: rows.map(function (row) { return row.factorLabel; }),
        gridLineWidth: 1,
        gridLineColor: grid,
        lineWidth: 0,
        tickLength: 0,
        plotBands: highlight ? rows.map(function (row, index) {
          if (!row.aboveAverageSpread) return null;
          return { from: index - 0.5, to: index + 0.5, color: light ? 'rgba(231,197,106,.18)' : 'rgba(231,197,106,.14)', zIndex: 0 };
        }).filter(Boolean) : [],
        labels: {
          rotation: angled ? -40 : 0,
          align: angled ? 'right' : 'center',
          useHTML: true,
          style: { color: muted, fontSize: '12px', fontWeight: '600' },
          formatter: function () {
            var safe = String(this.value == null ? '' : this.value).replace(/[&<>]/g, function (ch) {
              return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch];
            });
            var row = rows[this.pos];
            if (!highlight || !row || !row.aboveAverageSpread) return safe;
            return '<span style="color:#e7c56a;font-weight:800">' + safe + '</span>';
          }
        }
      },
      yAxis: [
        {
          title: { text: 'Dimensions mean score', margin: 16, style: { color: ink, fontWeight: '700', fontSize: '16px' } },
          labels: { style: { color: ink, fontWeight: '700', fontSize: '15px' } },
          gridLineWidth: 1,
          gridLineColor: grid,
          gridLineDashStyle: 'Solid'
        },
        {
          title: { text: indexName, margin: 16, style: { color: indexInk, fontWeight: '700', fontSize: '16px' } },
          opposite: true,
          min: 0,
          alignTicks: false,
          gridLineWidth: 0,
          labels: { style: { color: indexInk, fontWeight: '700', fontSize: '15px' } },
          plotLines: highlight ? spreadLine(result, light) : []
        }
      ],
      tooltip: { shared: false, borderRadius: 8 },
      plotOptions: {
        spline: {
          lineWidth: 2.75,
          zIndex: 3,
          marker: { enabled: true, symbol: 'circle', radius: 10, lineWidth: 0 },
          dataLabels: {
            enabled: rows.length <= 14,
            format: '{y:.2f}',
            y: -12,
            allowOverlap: false,
            style: { color: ink, textOutline: 'none', fontSize: '11px', fontWeight: '700' }
          },
          states: { hover: { lineWidthPlus: 0, halo: { size: 0 } } }
        },
        column: {
          zIndex: 1,
          grouping: false,
          pointPadding: 0.16,
          groupPadding: 0.14,
          maxPointWidth: 34,
          borderWidth: 1,
          borderColor: '#e7c56a',
          borderRadius: 2,
          dataLabels: { enabled: false }
        }
      },
      series: [
        {
          type: 'spline',
          name: groupName(result && result.group1, 'High group'),
          yAxis: 0,
          color: '#3b82f6',
          legendIndex: 2,
          data: rows.map(function (row) { return isNum(row.group1.mean) ? Math.round(row.group1.mean * 100) / 100 : null; })
        },
        {
          type: 'spline',
          name: groupName(result && result.group2, 'Low group'),
          yAxis: 0,
          color: '#ef4444',
          legendIndex: 1,
          data: rows.map(function (row) { return isNum(row.group2.mean) ? Math.round(row.group2.mean * 100) / 100 : null; })
        },
        {
          type: 'column',
          name: indexName,
          yAxis: 1,
          color: 'rgba(214,211,209,0.78)',
          legendIndex: 0,
          data: rows.map(function (row) {
            if (!isNum(row.selectedSplitIndex)) return null;
            var y = Math.round(row.selectedSplitIndex * 100) / 100;
            if (!highlight || !row.aboveAverageSpread) return y;
            return { y: y, color: 'rgba(231,197,106,0.95)', borderColor: '#f8e7b0' };
          })
        }
      ]
    };
  }

  function resultsTable(result) {
    if (!result || !result.ok) return [];
    return (result.factors || []).map(function (factor) {
      var row = {
        Factor: factor.factorLabel,
        'Factor order': factor.originalOrder + 1,
        'Group 1 label': factor.group1.label,
        'Group 1 mean': formatFixed(factor.group1.mean, 2),
        'Group 1 SD': formatFixed(factor.group1.sd, 2),
        'Group 1 valid n': factor.group1.validN,
        'Group 2 label': factor.group2.label,
        'Group 2 mean': formatFixed(factor.group2.mean, 2),
        'Group 2 SD': formatFixed(factor.group2.sd, 2),
        'Group 2 valid n': factor.group2.validN,
        'Signed difference': formatFixed(factor.signedDifference, 2),
        'Raw Split Index': formatFixed(factor.rawSplitIndex, 2),
        'Standardized Split Index': formatFixed(factor.standardizedSplitIndex, 2),
        'Above average + 1 SD': factor.aboveAverageSpread ? 'Yes' : 'No',
        'Lower confidence limit': factor.confidenceInterval ? formatFixed(factor.confidenceInterval.lower, 2) : '',
        'Upper confidence limit': factor.confidenceInterval ? formatFixed(factor.confidenceInterval.upper, 2) : '',
        'Welch statistic': factor.welchTest ? formatFixed(factor.welchTest.statistic, 3) : '',
        'Degrees of freedom': factor.welchTest ? formatFixed(factor.welchTest.degreesOfFreedom, 2) : '',
        'Unadjusted p-value': factor.welchTest ? formatP(factor.welchTest.pValue) : '',
        'Adjusted p-value': factor.welchTest ? formatP(factor.welchTest.adjustedPValue) : '',
        'Pattern classification': factor.pattern ? factor.pattern.label : ''
      };
      if (result.weightUsed) {
        row['Group 1 weighted n'] = formatFixed(factor.group1.weightedN, 2);
        row['Group 2 weighted n'] = formatFixed(factor.group2.weightedN, 2);
      }
      return row;
    });
  }

  return {
    COPY: COPY,
    tCdf: tCdf,
    tCritical: tCritical,
    calculateGroupStatistics: calculateGroupStatistics,
    calculateRawSplitIndex: calculateRawSplitIndex,
    calculateStandardizedSplitIndex: calculateStandardizedSplitIndex,
    calculateDifferenceCI: calculateDifferenceCI,
    calculateWelchTest: calculateWelchTest,
    adjustPValues: adjustPValues,
    classifyFactorPattern: classifyFactorPattern,
    sortSplitIndexResults: sortSplitIndexResults,
    calculateSplitIndex: calculateSplitIndex,
    splitIndexSpread: splitIndexSpread,
    buildFactorTooltip: buildFactorTooltip,
    buildSplitIndexChartOptions: buildSplitIndexChartOptions,
    resultsTable: resultsTable,
    formatFixed: formatFixed
  };
});
