/**
 * Split Index (Drivers) — pure calculations for two-group factor differentiation.
 * Depends on StatisticoSegmentation helpers; does not touch the DOM.
 */
(function (root, factory) {
  var Seg = (typeof module === 'object' && module.exports)
    ? require('./segmentation-engine.js')
    : root.StatisticoSegmentation;
  factory(Seg);
  if (typeof module === 'object' && module.exports) module.exports = Seg;
  root.StatisticoSegmentation = Seg;
  root.StatisticoSegmentationSplitIndex = true;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Seg) {
  'use strict';

  var EPS = 1e-9;

  function logGamma(x) {
    var g = 7;
    var c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    x -= 1;
    var a = c[0], t = x + g + 0.5;
    for (var i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  function betacf(x, a, b) {
    var MAXIT = 200, EPSb = 3e-9, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d; var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m;
      var aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPSb) break;
    }
    return h;
  }

  function betai(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return (bt * betacf(x, a, b)) / a;
    return 1 - (bt * betacf(1 - x, b, a)) / b;
  }

  function tTwoSidedP(t, df) {
    if (!isFinite(t) || !(df > 0)) return NaN;
    return betai(df / (df + t * t), df / 2, 0.5);
  }

  function tCritical(df, alpha) {
    if (!(df > 0) || !(alpha > 0) || !(alpha < 1)) return NaN;
    var lo = 0, hi = 80;
    for (var i = 0; i < 70; i++) {
      var mid = (lo + hi) / 2;
      if (tTwoSidedP(mid, df) > alpha) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function median(nums) {
    if (!nums.length) return NaN;
    var a = nums.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  function calculateGroupStatistics(values, weights) {
    var xs = [], ws = [];
    for (var i = 0; i < values.length; i++) {
      var x = Seg.toNumber(values[i]);
      if (!isFinite(x)) continue;
      var w = 1;
      if (weights && weights[i] != null) {
        w = Seg.toWeight(weights[i]);
        if (!isFinite(w) || w < 0) continue;
      }
      xs.push(x);
      ws.push(w);
    }
    var n = xs.length;
    if (!n) return { mean: NaN, sd: NaN, variance: NaN, validN: 0, weightedN: 0 };
    var wsum = 0, wx = 0;
    for (var j = 0; j < n; j++) { wsum += ws[j]; wx += ws[j] * xs[j]; }
    var mean = wsum > 0 ? wx / wsum : NaN;
    var sse = 0;
    for (var k = 0; k < n; k++) {
      var d = xs[k] - mean;
      sse += ws[k] * d * d;
    }
    var denom = wsum > 1 ? wsum - 1 : (n > 1 ? n - 1 : 0);
    var variance = denom > 0 ? sse / denom : 0;
    return { mean: mean, sd: Math.sqrt(variance), variance: variance, validN: n, weightedN: wsum };
  }

  function calculateRawSplitIndex(mean1, mean2) {
    if (!isFinite(mean1) || !isFinite(mean2)) return NaN;
    return Math.abs(mean1 - mean2);
  }

  function calculateStandardizedSplitIndex(mean1, mean2, sd1, sd2, n1, n2) {
    if (!isFinite(mean1) || !isFinite(mean2)) return null;
    if (!(n1 >= 2) || !(n2 >= 2)) return null;
    var pooledVar = ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2);
    if (!(pooledVar > 0)) return null;
    return Math.abs(mean1 - mean2) / Math.sqrt(pooledVar);
  }

  function calculateWelchTest(mean1, mean2, sd1, sd2, n1, n2) {
    if (!(n1 >= 2) || !(n2 >= 2)) return { statistic: NaN, degreesOfFreedom: NaN, pValue: NaN, se: NaN };
    var v1 = sd1 * sd1 / n1, v2 = sd2 * sd2 / n2;
    var se = Math.sqrt(v1 + v2);
    var statistic = se > 0 ? (mean1 - mean2) / se : NaN;
    var dfNum = (v1 + v2) * (v1 + v2);
    var dfDen = (v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1);
    var df = dfDen > 0 ? dfNum / dfDen : NaN;
    var pValue = isFinite(statistic) && df > 0 ? tTwoSidedP(statistic, df) : NaN;
    return { statistic: statistic, degreesOfFreedom: df, pValue: pValue, se: se };
  }

  function calculateDifferenceCI(mean1, mean2, se, df, alpha) {
    var diff = mean1 - mean2;
    if (!isFinite(diff) || !isFinite(se) || !isFinite(df) || se <= 0 || df <= 0) {
      return { lower: NaN, upper: NaN };
    }
    var tcrit = tCritical(df, alpha == null ? 0.05 : alpha);
    return { lower: diff - tcrit * se, upper: diff + tcrit * se };
  }

  function adjustPValues(pValues, method) {
    var n = pValues.length;
    var out = pValues.map(function () { return NaN; });
    var items = [];
    for (var i = 0; i < n; i++) {
      if (isFinite(pValues[i])) items.push({ i: i, p: pValues[i] });
    }
    var m = items.length;
    if (!m) return out;
    var mode = method || 'bh';
    items.sort(function (a, b) { return a.p - b.p; });
    if (mode === 'none') {
      items.forEach(function (it) { out[it.i] = it.p; });
      return out;
    }
    if (mode === 'bonferroni') {
      items.forEach(function (it) { out[it.i] = Math.min(1, it.p * m); });
      return out;
    }
    if (mode === 'holm') {
      var holm = [];
      for (var h = 0; h < m; h++) holm[h] = Math.min(1, items[h].p * (m - h));
      for (var h2 = 1; h2 < m; h2++) holm[h2] = Math.max(holm[h2], holm[h2 - 1]);
      for (var h3 = 0; h3 < m; h3++) out[items[h3].i] = holm[h3];
      return out;
    }
    var bh = [];
    for (var b = 0; b < m; b++) bh[b] = Math.min(1, items[b].p * m / (b + 1));
    for (var b2 = m - 2; b2 >= 0; b2--) bh[b2] = Math.min(bh[b2], bh[b2 + 1]);
    for (var b3 = 0; b3 < m; b3++) out[items[b3].i] = bh[b3];
    return out;
  }

  function resolveFactorDefs(spec) {
    if (spec && Array.isArray(spec.factors) && spec.factors.length) {
      return spec.factors.map(function (f, i) {
        return {
          id: f.id || f.label || ('factor_' + i),
          label: f.label || f.id || String(f.columns && f.columns[0]),
          columns: Array.isArray(f.columns) ? f.columns.slice() : [f],
          originalOrder: i
        };
      });
    }
    var cols = (spec && spec.factorColumns) ? spec.factorColumns : [];
    return cols.map(function (name, i) {
      return { id: String(name), label: String(name), columns: [name], originalOrder: i };
    });
  }

  function colIndexList(headers, columns) {
    var names = Array.isArray(columns) ? columns : [columns];
    var out = [];
    names.forEach(function (name) {
      var idx = Seg.colIndex(headers, name);
      if (idx >= 0 && out.indexOf(idx) < 0) out.push(idx);
    });
    return out;
  }

  function classifyFactorPattern(row, ranks, midpoint, medianSI) {
    var si = row.rawSplitIndex;
    var m1 = row.group1.mean, m2 = row.group2.mean;
    var large = isFinite(si) && isFinite(medianSI) && si >= medianSI - EPS;
    var small = isFinite(si) && isFinite(medianSI) && si < medianSI;
    var high1 = isFinite(m1) && m1 >= midpoint;
    var high2 = isFinite(m2) && m2 >= midpoint;
    var low1 = isFinite(m1) && m1 < midpoint;
    var low2 = isFinite(m2) && m2 < midpoint;
    if (ranks.bySI[row.factorId] <= 3) {
      return {
        id: 'strongDifferentiator',
        label: 'Strong differentiator',
        description: 'Ratings differ substantially between the two selected groups. This factor may warrant closer managerial attention.'
      };
    }
    if (small && low1 && low2) {
      return {
        id: 'sharedWeakness',
        label: 'Shared weakness',
        description: 'Both groups rate this factor relatively poorly, but it does not strongly differentiate them.'
      };
    }
    if (small && high1 && high2) {
      return {
        id: 'sharedStrength',
        label: 'Shared strength',
        description: 'Both groups rate this factor positively, so it is unlikely to explain much of the group difference.'
      };
    }
    if (large && ((low1 && !low2) || (low2 && !low1))) {
      return {
        id: 'groupSpecificWeakness',
        label: 'Group-specific weakness',
        description: 'The lower rating is concentrated in one group and contributes strongly to the observed separation.'
      };
    }
    return {
      id: 'descriptive',
      label: 'Descriptive pattern',
      description: 'This factor’s means and Split Index are shown for comparison; the classification is descriptive, not a validated priority score.'
    };
  }

  function sortSplitIndexResults(rows, sortBy) {
    var key = sortBy || 'splitDesc';
    var copy = rows.slice();
    copy.sort(function (a, b) {
      var av = a.displayIndex, bv = b.displayIndex;
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
      if (key === 'splitAsc') return av - bv;
      if (key === 'order' || key === 'questionnaire') return a.originalOrder - b.originalOrder;
      if (key === 'group1') return (b.group1.mean || 0) - (a.group1.mean || 0);
      if (key === 'group2') return (b.group2.mean || 0) - (a.group2.mean || 0);
      if (key === 'name') return String(a.factorLabel).localeCompare(String(b.factorLabel));
      return bv - av;
    });
    return copy;
  }

  function analyzeSplitIndex(headers, rows, spec, options) {
    options = options || {};
    spec = spec || {};
    var factorDefs = resolveFactorDefs(spec);
    if (!factorDefs.length) {
      return { analyzable: false, empty: true, error: 'Select survey factors to calculate the Split Index.' };
    }
    var seg = Seg.analyze(headers, rows, spec);
    if (!seg.analyzable) return { analyzable: false, error: seg.error, warnings: seg.warnings || [] };

    var mode = options.mode || 'stay';
    var indexType = options.indexType || 'raw';
    var missingMode = options.missing || 'available';
    var pAdjust = options.pAdjust || 'bh';
    var waveChoice = options.wave || 'current';
    var respondents = (seg.respondents || []).slice();
    if (seg.waves && seg.waves.configured) {
      var want = waveChoice === 'previous' ? seg.waves.previous : seg.waves.current;
      if (want) respondents = respondents.filter(function (r) { return r.wave === String(want); });
    }

    var cfg = seg.config;
    var g1Label, g2Label, assignGroup;
    if (mode === 'stay') {
      g1Label = cfg.yDimension.highLabel || 'Tending to stay';
      g2Label = cfg.yDimension.lowLabel || 'Not tending to stay';
      assignGroup = function (r) { return r.yScore >= seg.thresholds.y - EPS ? 1 : 2; };
    } else if (mode === 'satisfaction') {
      g1Label = cfg.xDimension.highLabel || 'Satisfied';
      g2Label = cfg.xDimension.lowLabel || 'Not satisfied';
      assignGroup = function (r) { return r.xScore >= seg.thresholds.x - EPS ? 1 : 2; };
    } else if (mode === 'segmentVsOthers') {
      var focus = options.segmentKey || 'highXHighY';
      g1Label = (cfg.segments[focus] && cfg.segments[focus].label) || focus;
      g2Label = 'All other respondents';
      assignGroup = function (r) { return r.segment === focus ? 1 : 2; };
    } else {
      var k1 = options.group1Key || 'highXHighY';
      var k2 = options.group2Key || 'lowXLowY';
      if (k1 === k2) return { analyzable: false, error: 'Choose two different groups to compare.' };
      g1Label = (cfg.segments[k1] && cfg.segments[k1].label) || k1;
      g2Label = (cfg.segments[k2] && cfg.segments[k2].label) || k2;
      assignGroup = function (r) {
        if (r.segment === k1) return 1;
        if (r.segment === k2) return 2;
        return 0;
      };
    }

    var tagged = respondents.map(function (r) {
      return Object.assign({}, r, { splitGroup: assignGroup(r) });
    }).filter(function (r) { return r.splitGroup === 1 || r.splitGroup === 2; });

    var overlap = false;
    var seen = {};
    tagged.forEach(function (r) {
      var id = r.id ? ('id:' + r.id) : ('row:' + r.rowIndex);
      if (seen[id] && seen[id] !== r.splitGroup) overlap = true;
      seen[id] = r.splitGroup;
    });

    var n1 = tagged.filter(function (r) { return r.splitGroup === 1; }).length;
    var n2 = tagged.filter(function (r) { return r.splitGroup === 2; }).length;
    if (!n1 || !n2) {
      return {
        analyzable: false,
        error: 'Both comparison groups need at least one valid respondent.',
        group1: { label: g1Label, n: n1 },
        group2: { label: g2Label, n: n2 }
      };
    }

    var workRows = Seg.applyFilters(rows, headers, spec.filters || {});
    var completeKeep = {};
    if (missingMode === 'complete') {
      tagged.forEach(function (r) {
        completeKeep[r.rowIndex] = factorDefs.every(function (f) {
          var idxs = colIndexList(headers, f.columns);
          var items = idxs.map(function (idx) { return workRows[r.rowIndex] ? workRows[r.rowIndex][idx] : ''; });
          return !Seg.compositeScore(items, cfg.minimumValidItems).excluded;
        });
      });
    }

    var scaleWarn = false;
    var scales = [];
    var rowsOut = factorDefs.map(function (f, order) {
      var idxs = colIndexList(headers, f.columns);
      function collect(groupNo) {
        var vals = [], wts = [];
        tagged.forEach(function (r) {
          if (r.splitGroup !== groupNo) return;
          if (missingMode === 'complete' && !completeKeep[r.rowIndex]) return;
          var items = idxs.map(function (idx) { return workRows[r.rowIndex] ? workRows[r.rowIndex][idx] : ''; });
          var sc = Seg.compositeScore(items, cfg.minimumValidItems);
          if (sc.excluded) return;
          vals.push(sc.score);
          wts.push(r.weight);
        });
        return calculateGroupStatistics(vals, wts);
      }
      var s1 = collect(1), s2 = collect(2);
      var signed = (isFinite(s1.mean) && isFinite(s2.mean)) ? s1.mean - s2.mean : NaN;
      var raw = calculateRawSplitIndex(s1.mean, s2.mean);
      var std = calculateStandardizedSplitIndex(s1.mean, s2.mean, s1.sd, s2.sd, s1.validN, s2.validN);
      var welch = overlap ? { statistic: NaN, degreesOfFreedom: NaN, pValue: NaN, se: NaN } : calculateWelchTest(s1.mean, s2.mean, s1.sd, s2.sd, s1.validN, s2.validN);
      var ci = overlap ? { lower: NaN, upper: NaN } : calculateDifferenceCI(s1.mean, s2.mean, welch.se, welch.degreesOfFreedom, 0.05);
      var itemVals = [];
      tagged.forEach(function (r) {
        idxs.forEach(function (idx) {
          if (workRows[r.rowIndex]) itemVals.push(workRows[r.rowIndex][idx]);
        });
      });
      var sc = Seg.inferScale(itemVals);
      scales.push(sc);
      return {
        factorId: f.id,
        factorLabel: f.label,
        originalOrder: f.originalOrder != null ? f.originalOrder : order,
        group1: { label: g1Label, mean: s1.mean, sd: s1.sd, validN: s1.validN, weightedN: s1.weightedN },
        group2: { label: g2Label, mean: s2.mean, sd: s2.sd, validN: s2.validN, weightedN: s2.weightedN },
        signedDifference: signed,
        rawSplitIndex: raw,
        standardizedSplitIndex: std,
        confidenceInterval: ci,
        welchTest: { statistic: welch.statistic, degreesOfFreedom: welch.degreesOfFreedom, pValue: welch.pValue, adjustedPValue: NaN },
        scale: sc
      };
    });

    if (scales.length >= 2) {
      var maxMax = Math.max.apply(null, scales.map(function (s) { return s.max; }));
      var minMax = Math.min.apply(null, scales.map(function (s) { return s.max; }));
      if (isFinite(maxMax) && isFinite(minMax) && maxMax - minMax > 1.5) scaleWarn = true;
    }

    var pvals = rowsOut.map(function (r) { return r.welchTest.pValue; });
    var adj = adjustPValues(pvals, pAdjust);
    rowsOut.forEach(function (r, i) { r.welchTest.adjustedPValue = adj[i]; });
    rowsOut.forEach(function (r) {
      r.displayIndex = indexType === 'standardized' ? r.standardizedSplitIndex : r.rawSplitIndex;
    });

    var siVals = rowsOut.map(function (r) { return r.rawSplitIndex; }).filter(isFinite).sort(function (a, b) { return a - b; });
    var medianSI = siVals.length ? median(siVals) : 0;
    var ranked = rowsOut.slice().sort(function (a, b) { return (b.rawSplitIndex || 0) - (a.rawSplitIndex || 0); });
    var bySI = {};
    ranked.forEach(function (r, i) { bySI[r.factorId] = i + 1; });
    var midpoint = (seg.scales && seg.scales.x && isFinite(seg.scales.x.midpoint)) ? seg.scales.x.midpoint : 3;
    rowsOut.forEach(function (r) {
      r.pattern = classifyFactorPattern(r, { bySI: bySI }, midpoint, medianSI);
    });

    var sorted = sortSplitIndexResults(rowsOut, options.sortBy || 'splitDesc');
    var topN = options.topN;
    if (topN && topN > 0) sorted = sorted.slice(0, topN);

    var warnings = (seg.warnings || []).slice();
    if (scaleWarn && indexType === 'raw') {
      warnings.push('The selected factors may use different scales. Consider the standardized Split Index.');
    }
    if (overlap) warnings.push('Comparison groups overlap, so an independent-samples test was not computed.');
    if (seg.weighted) warnings.push('Weights were applied to means and standard deviations. Bases shown are unweighted.');

    return {
      analyzable: true,
      empty: false,
      mode: mode,
      indexType: indexType,
      missingMode: missingMode,
      pAdjust: pAdjust,
      weighted: !!seg.weighted,
      wave: waveChoice,
      waveLabel: seg.waves && seg.waves.configured ? (waveChoice === 'previous' ? seg.waves.previous : seg.waves.current) : null,
      group1: { label: g1Label, n: n1 },
      group2: { label: g2Label, n: n2 },
      factors: sorted,
      allFactors: rowsOut,
      filtersActive: seg.filtersActive || [],
      warnings: warnings,
      title: mode === 'stay' ? 'Retention Factors — Split Index' : 'Factor Differentiation — Split Index',
      exclusive: !overlap
    };
  }

  function buildSplitIndexExportTable(result) {
    if (!result || !result.factors) return [];
    return result.factors.map(function (r) {
      return {
        Factor: r.factorLabel,
        FactorOrder: r.originalOrder + 1,
        Group1Label: r.group1.label,
        Group1Mean: r.group1.mean,
        Group1SD: r.group1.sd,
        Group1ValidN: r.group1.validN,
        Group2Label: r.group2.label,
        Group2Mean: r.group2.mean,
        Group2SD: r.group2.sd,
        Group2ValidN: r.group2.validN,
        SignedDifference: r.signedDifference,
        RawSplitIndex: r.rawSplitIndex,
        StandardizedSplitIndex: r.standardizedSplitIndex,
        LowerCL: r.confidenceInterval.lower,
        UpperCL: r.confidenceInterval.upper,
        WelchStatistic: r.welchTest.statistic,
        DegreesOfFreedom: r.welchTest.degreesOfFreedom,
        UnadjustedP: r.welchTest.pValue,
        AdjustedP: r.welchTest.adjustedPValue,
        Pattern: r.pattern ? r.pattern.label : ''
      };
    });
  }

  Seg.calculateGroupStatistics = calculateGroupStatistics;
  Seg.calculateRawSplitIndex = calculateRawSplitIndex;
  Seg.calculateStandardizedSplitIndex = calculateStandardizedSplitIndex;
  Seg.calculateDifferenceCI = calculateDifferenceCI;
  Seg.calculateWelchTest = calculateWelchTest;
  Seg.adjustPValues = adjustPValues;
  Seg.classifyFactorPattern = classifyFactorPattern;
  Seg.sortSplitIndexResults = sortSplitIndexResults;
  Seg.analyzeSplitIndex = analyzeSplitIndex;
  Seg.buildSplitIndexExportTable = buildSplitIndexExportTable;
  Seg.tTwoSidedP = tTwoSidedP;
});
