/**
 * Contingency Tables engine — Pearson / LR chi-square, Fisher (2×2),
 * association measures, residuals, and 2×2 risk/odds estimates.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoContingency = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MISSING_LABEL = '(Missing)';
  var MAX_LEVELS = 50;
  var NUMERIC_WARN_LEVELS = 20;
  var EPS = 1e-12;
  var MAX_REPRESENTED_N = 9007199254740991; // Number.MAX_SAFE_INTEGER

  function isMissing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'object') {
      if (v.error != null) return isMissing(v.error);
      if (typeof v.toString === 'function' && v.toString !== Object.prototype.toString) {
        v = v.toString();
      } else {
        return false;
      }
    }
    var s = String(v).trim();
    if (!s) return true;
    var u = s.toUpperCase();
    if (u === 'NA' || u === 'N/A' || u === '#N/A' || u === '#NA' || u === 'NULL' || u === '.' || u === 'NAN') return true;
    if (u.charAt(0) === '#' && (u === '#NULL!' || u === '#VALUE!' || u === '#REF!' || u === '#DIV/0!' || u === '#NAME?' || u === '#NUM!')) return true;
    return false;
  }

  function stripMarkup(v) {
    var s = String(v == null ? '' : v);
    if (s.indexOf('<') < 0 && s.indexOf('&') < 0) return s;
    s = s.replace(/<[^>]*>/g, ' ');
    s = s.replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return s.replace(/\s+/g, ' ').trim();
  }

  function catLabel(v) {
    if (typeof v === 'number' && isFinite(v)) {
      if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
      var t = String(v);
      return t.length > 12 ? v.toPrecision(6) : t;
    }
    return stripMarkup(v).trim();
  }

  function isIntegerCount(value) {
    return Number.isFinite(value) &&
      value >= 0 &&
      Math.abs(value - Math.round(value)) < 1e-9;
  }

  function parseFrequency(v) {
    if (isMissing(v)) return { ok: false, reason: 'missing', value: v };
    var n;
    if (typeof v === 'number') {
      n = v;
    } else if (typeof v === 'boolean') {
      return { ok: false, reason: 'nonnumeric', value: v };
    } else {
      var s = String(v).trim().replace(/,/g, '');
      if (!s) return { ok: false, reason: 'missing', value: v };
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) {
        return { ok: false, reason: 'nonnumeric', value: v };
      }
      n = Number(s);
    }
    if (n === Infinity || n === -Infinity) return { ok: false, reason: 'infinite', value: n };
    if (!Number.isFinite(n)) return { ok: false, reason: 'nonnumeric', value: v };
    if (n < 0) return { ok: false, reason: 'negative', value: n };
    if (!isIntegerCount(n)) return { ok: false, reason: 'noninteger', value: n };
    var count = Math.round(n);
    if (count > MAX_REPRESENTED_N) return { ok: false, reason: 'overflow', value: n };
    return { ok: true, value: count };
  }

  function resolveFrequencyColumn(spec) {
    if (!spec) return null;
    return spec.frequencyColumn || spec.freqVar || spec.weightVar || null;
  }

  function frequencyReasonText(reason) {
    if (reason === 'missing') return 'contains missing values';
    if (reason === 'negative') return 'contains negative values';
    if (reason === 'nonnumeric') return 'contains nonnumeric values';
    if (reason === 'infinite') return 'contains infinite values';
    if (reason === 'noninteger') return 'contains non-integer values';
    if (reason === 'zeros') return 'contains only zeros';
    if (reason === 'overflow') return 'exceeds the safe numeric limit';
    return 'is not a valid frequency/count column';
  }

  function formatFrequencyError(columnName, reason, excelRow, value) {
    var extra = '';
    if (excelRow != null && reason !== 'zeros') {
      extra = ' (Excel row ' + excelRow;
      if (value !== undefined && value !== null && String(value) !== '') extra += ', value ' + String(value);
      extra += ')';
    }
    return '“' + columnName + '” cannot be used as a frequency/count column because it ' +
      frequencyReasonText(reason) + extra +
      '. Select a column containing nonnegative integer counts, or leave the frequency field empty to analyze one case per row.';
  }

  function frequencyErrorResult(columnName, reason, excelRow, value) {
    return {
      error: formatFrequencyError(columnName, reason, excelRow, value),
      analyzable: false,
      frequencyColumn: columnName,
      frequencyWeightingApplied: false,
      weightType: null,
      inputRowCount: 0,
      representedN: 0,
      originalExcelRows: null,
      excludedMissing: 0,
      eligibleInputRows: 0
    };
  }

  function isFrequencyCandidateColumn(headers, rows, j) {
    var seen = 0;
    for (var i = 0; i < (rows || []).length; i++) {
      var v = rows[i] ? rows[i][j] : null;
      if (isMissing(v)) continue;
      if (!parseFrequency(v).ok) return false;
      seen++;
    }
    return seen > 0;
  }

  function viewCell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (typeof v === 'string') return stripMarkup(v);
    if (typeof v === 'object') {
      if (v.error != null) return viewCell(v.error);
      if (typeof v.valueOf === 'function') {
        var n = v.valueOf();
        if (typeof n === 'number' && isFinite(n)) return n;
      }
      if (typeof v.toString === 'function' && v.toString !== Object.prototype.toString) return String(v);
    }
    return String(v);
  }

  function colIndex(headers, name) {
    if (name == null || name === '') return -1;
    var i = headers.indexOf(name);
    if (i >= 0) return i;
    var want = String(name).trim().toLowerCase();
    for (var k = 0; k < headers.length; k++) {
      if (String(headers[k] == null ? '' : headers[k]).trim().toLowerCase() === want) return k;
    }
    var asNum = Number(name);
    if (isFinite(asNum) && asNum >= 0 && asNum < headers.length && String(asNum) === String(name)) return asNum;
    return -1;
  }

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

  function gammserSeries(a, x) {
    var gln = logGamma(a);
    if (x <= 0) return { gamser: 0, gln: gln };
    var ap = a, sum = 1 / a, del = sum;
    for (var n = 0; n < 300; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-9) break;
    }
    return { gamser: sum * Math.exp(-x + a * Math.log(x) - gln), gln: gln };
  }

  function gammcfCF(a, x) {
    var gln = logGamma(a), FPMIN = 1e-300, EPSG = 3e-9;
    var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (var i = 1; i <= 300; i++) {
      var an = -i * (i - a);
      b += 2; d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPSG) break;
    }
    return { gammcf: Math.exp(-x + a * Math.log(x) - gln) * h, gln: gln };
  }

  function gammq(a, x) {
    if (!(x >= 0) || !(a > 0)) return NaN;
    if (x < a + 1) return 1 - gammserSeries(a, x).gamser;
    return gammcfCF(a, x).gammcf;
  }

  function chiSquareUpperP(chi2, df) {
    if (!(chi2 >= 0) || !(df > 0)) return NaN;
    if (chi2 === 0) return 1;
    return gammq(df / 2, chi2 / 2);
  }

  function logChoose(n, k) {
    if (k < 0 || k > n) return -Infinity;
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  }

  function invNormApprox(p) {
    if (p <= 0 || p >= 1) return p <= 0 ? -Infinity : Infinity;
    var a1 = -39.69683028665376, a2 = 220.9460984245205, a3 = -275.9285104469687;
    var a4 = 138.3577518672690, a5 = -30.66479806614716, a6 = 2.506628277459239;
    var b1 = -54.47609879822406, b2 = 161.5858368580409, b3 = -155.6989798598866;
    var b4 = 66.80131188771972, b5 = -13.28068155288572;
    var c1 = -0.007784894002430293, c2 = -0.3223964580411365, c3 = -2.400758277161838;
    var c4 = -2.549732539343734, c5 = 4.374664141464968, c6 = 2.938163982698783;
    var d1 = 0.007784695709041462, d2 = 0.3224671290700398, d3 = 2.445134137142996;
    var d4 = 3.754408661907416;
    var plow = 0.02425, phigh = 1 - plow, q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    if (p <= phigh) {
      q = p - 0.5; r = q * q;
      return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
        (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  function zCrit(confidence) {
    var c = isFinite(confidence) ? confidence : 0.95;
    if (c > 1) c = c / 100;
    if (!(c > 0 && c < 1)) c = 0.95;
    return invNormApprox(0.5 + c / 2);
  }

  function residualBand(r) {
    var a = Math.abs(r);
    if (!(a >= 0) || !isFinite(a)) return 'empty';
    if (a < 2) return 'neutral';
    if (a < 3) return 'moderate';
    return 'strong';
  }

  function uniqueInOrder(values) {
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (seen[v]) continue;
      seen[v] = true;
      out.push(v);
    }
    return out;
  }

  function looksNumericSeries(values) {
    var n = 0, num = 0;
    for (var i = 0; i < values.length; i++) {
      if (isMissing(values[i])) continue;
      n++;
      var x = typeof values[i] === 'number' ? values[i] : parseFloat(String(values[i]).replace(/,/g, ''));
      if (isFinite(x)) num++;
    }
    return n > 0 && num / n >= 0.9;
  }

  function profileColumn(headers, rows, j) {
    var vals = [];
    var missing = 0;
    for (var i = 0; i < rows.length; i++) {
      var v = rows[i] ? rows[i][j] : null;
      if (isMissing(v)) { missing++; continue; }
      vals.push(catLabel(v));
    }
    var levels = uniqueInOrder(vals);
    return {
      index: j,
      name: String(headers[j] == null ? ('V' + (j + 1)) : headers[j]),
      n: vals.length,
      missing: missing,
      levels: levels,
      nLevels: levels.length,
      numeric: looksNumericSeries(rows.map(function (r) { return r ? r[j] : null; })),
      frequencyCandidate: isFrequencyCandidateColumn(headers, rows, j),
      categoricalOk: levels.length >= 2 && levels.length <= MAX_LEVELS
    };
  }

  function profileData(headers, rows) {
    return (headers || []).map(function (_h, j) { return profileColumn(headers, rows, j); });
  }

  function logHyper2x2(x, n1, n2, n, N) {
    var y = n1 - x;
    var z = n - x;
    var w = n2 - z;
    if (x < 0 || y < 0 || z < 0 || w < 0) return -Infinity;
    return logChoose(n1, x) + logChoose(n2, z) - logChoose(N, n);
  }

  function fisherExact2x2(a, b, c, d) {
    var aa = Math.round(a), bb = Math.round(b), cc = Math.round(c), dd = Math.round(d);
    if (Math.abs(a - aa) > 1e-6 || Math.abs(b - bb) > 1e-6 || Math.abs(c - cc) > 1e-6 || Math.abs(d - dd) > 1e-6) {
      return { available: false, reason: "Fisher's exact test requires integer cell counts." };
    }
    a = aa; b = bb; c = cc; d = dd;
    var n1 = a + b, n2 = c + d, n = a + c, N = a + b + c + d;
    if (N <= 0 || n1 <= 0 || n2 <= 0 || n <= 0 || (N - n) <= 0) {
      return { available: false, reason: "Fisher's exact test needs a 2×2 table with positive margins." };
    }
    var minA = Math.max(0, n1 + n - N);
    var maxA = Math.min(n1, n);
    if (maxA - minA > 10000) {
      return {
        available: false,
        reason: 'Fisher’s exact test is not computed when a margin exceeds 10,000. The Pearson chi-square p-value is still reported.'
      };
    }
    var logPobs = logHyper2x2(a, n1, n2, n, N);
    var pTwo = 0, pOneLess = 0, pOneGreater = 0;
    for (var x = minA; x <= maxA; x++) {
      var lp = logHyper2x2(x, n1, n2, n, N);
      var px = Math.exp(lp);
      if (lp <= logPobs + 1e-10) pTwo += px;
      if (x <= a) pOneLess += px;
      if (x >= a) pOneGreater += px;
    }
    return {
      available: true,
      p: Math.min(1, Math.max(0, pTwo)),
      pLess: Math.min(1, Math.max(0, pOneLess)),
      pGreater: Math.min(1, Math.max(0, pOneGreater)),
      method: 'fisher-exact'
    };
  }

  function measures2x2(a, b, c, d, z, rowLabels, colLabels) {
    var n1 = a + b, n2 = c + d, N = n1 + n2;
    var p1 = n1 > 0 ? a / n1 : NaN;
    var p2 = n2 > 0 ? c / n2 : NaN;
    var out = {
      available: true,
      layout: {
        rowIndex: rowLabels[0],
        rowReference: rowLabels[1],
        colEvent: colLabels[0],
        colReference: colLabels[1],
        cells: { a: a, b: b, c: c, d: d }
      },
      oddsRatio: { available: false },
      riskRatio: { available: false },
      riskDifference: { available: false }
    };

    var aa = a, bb = b, cc = c, dd = d, orCorrected = false;
    if (aa === 0 || bb === 0 || cc === 0 || dd === 0) {
      aa += 0.5; bb += 0.5; cc += 0.5; dd += 0.5;
      orCorrected = true;
    }
    var or = (aa * dd) / (bb * cc);
    if (isFinite(or) && or > 0) {
      var seLogOr = Math.sqrt(1 / aa + 1 / bb + 1 / cc + 1 / dd);
      var logOr = Math.log(or);
      out.oddsRatio = {
        available: true,
        value: or,
        logValue: logOr,
        seLog: seLogOr,
        ciLower: Math.exp(logOr - z * seLogOr),
        ciUpper: Math.exp(logOr + z * seLogOr),
        continuityCorrection: orCorrected,
        formula: 'OR = (a·d) / (b·c)  comparing ' + rowLabels[0] + ' vs ' + rowLabels[1] +
          ' for event ' + colLabels[0]
      };
    } else {
      out.oddsRatio = { available: false, reason: 'Odds ratio is not estimable from these cell counts.' };
    }

    if (n1 > 0 && n2 > 0 && p1 >= 0 && p2 >= 0) {
      if (p1 > 0 && p2 > 0) {
        var rr = p1 / p2;
        var seLogRr = Math.sqrt((1 - p1) / (n1 * p1) + (1 - p2) / (n2 * p2));
        var logRr = Math.log(rr);
        out.riskRatio = {
          available: true,
          value: rr,
          logValue: logRr,
          seLog: seLogRr,
          ciLower: Math.exp(logRr - z * seLogRr),
          ciUpper: Math.exp(logRr + z * seLogRr),
          formula: 'RR = P(event | ' + rowLabels[0] + ') / P(event | ' + rowLabels[1] + ')'
        };
      } else {
        out.riskRatio = {
          available: false,
          reason: p2 === 0 && p1 > 0
            ? 'Risk ratio is infinite because the reference-row event rate is 0.'
            : p1 === 0 && p2 > 0
              ? 'Risk ratio is 0 because the index-row event rate is 0; a confidence interval is not reported.'
              : 'Risk ratio is not estimable because both event rates are 0.'
        };
      }
      var rd = p1 - p2;
      var seRd = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
      if (!(seRd > 0)) seRd = 0;
      out.riskDifference = {
        available: true,
        value: rd,
        se: seRd,
        ciLower: rd - z * seRd,
        ciUpper: rd + z * seRd,
        pIndex: p1,
        pReference: p2,
        formula: 'RD = P(event | ' + rowLabels[0] + ') − P(event | ' + rowLabels[1] + ')'
      };
    }
    out.proportions = {
      index: wilsonProportion(a, n1, z),
      reference: wilsonProportion(c, n2, z)
    };
    return out;
  }

  function wilsonProportion(events, n, z) {
    if (!(n > 0) || !isFinite(events) || events < 0 || events > n + 1e-9) {
      return { available: false, p: NaN, n: n, events: events, ciLower: NaN, ciUpper: NaN, method: 'wilson' };
    }
    var p = events / n;
    var z2 = z * z;
    var denom = 1 + z2 / n;
    var center = (p + z2 / (2 * n)) / denom;
    var half = z * Math.sqrt((p * (1 - p) / n) + (z2 / (4 * n * n))) / denom;
    return {
      available: true,
      p: p,
      n: n,
      events: events,
      ciLower: Math.max(0, center - half),
      ciUpper: Math.min(1, center + half),
      method: 'wilson'
    };
  }

  function mcnemar2x2(b, c, z) {
    if (!isIntegerCount(b) || !isIntegerCount(c)) {
      return { available: false, reason: 'McNemar’s test requires integer discordant counts.' };
    }
    b = Math.round(b);
    c = Math.round(c);
    var n = b + c;
    if (n <= 0) {
      return { available: false, reason: 'McNemar’s test needs at least one discordant pair.' };
    }
    var diff = b - c;
    var stat = (diff * diff) / n;
    var statCc = Math.pow(Math.max(Math.abs(diff) - 1, 0), 2) / n;
    var pExact = NaN;
    var preferred = n < 25 ? 'exact' : 'continuity';
    if (n <= 5000) {
      var logPobs = logChoose(n, b) - n * Math.LN2;
      pExact = 0;
      for (var k = 0; k <= n; k++) {
        var lp = logChoose(n, k) - n * Math.LN2;
        if (lp <= logPobs + 1e-10) pExact += Math.exp(lp);
      }
      pExact = Math.min(1, Math.max(0, pExact));
    } else {
      preferred = 'continuity';
    }
    var bb = b;
    var cc = c;
    var corrected = false;
    if (bb === 0 || cc === 0) {
      bb += 0.5;
      cc += 0.5;
      corrected = true;
    }
    var or = bb / cc;
    var se = Math.sqrt(1 / bb + 1 / cc);
    var logOr = Math.log(or);
    var zz = isFinite(z) ? z : zCrit(0.95);
    return {
      available: true,
      b: b,
      c: c,
      discordant: n,
      statistic: stat,
      statisticContinuity: statCc,
      df: 1,
      p: chiSquareUpperP(stat, 1),
      pContinuity: chiSquareUpperP(statCc, 1),
      pExact: pExact,
      preferred: preferred,
      oddsRatio: {
        available: isFinite(or) && or > 0,
        value: or,
        ciLower: Math.exp(logOr - zz * se),
        ciUpper: Math.exp(logOr + zz * se),
        continuityCorrection: corrected,
        formula: 'OR = b / c on the discordant pairs'
      }
    };
  }

  function fmtPctLabel(p) {
    if (!isFinite(p)) return '—';
    var t = Math.round(p * 1000) / 10;
    if (Math.abs(t - Math.round(t)) < 1e-9) return String(Math.round(t)) + '%';
    return t.toFixed(1) + '%';
  }

  function fmtPpLabel(diff) {
    var t = Math.round(Math.abs(diff) * 1000) / 10;
    if (Math.abs(t - Math.round(t)) < 1e-9) return String(Math.round(t));
    return t.toFixed(1);
  }

  function fmtRatioLabel(x) {
    if (!isFinite(x)) return '—';
    var r = Math.round(x * 100) / 100;
    if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
    return r.toFixed(2);
  }

  function fmtPLabel(p) {
    if (!isFinite(p)) return 'p unavailable';
    if (p < 0.001) return 'p < .001';
    return 'p = ' + p.toFixed(3);
  }

  function summary2x2(result, options) {
    options = options || {};
    var design = options.design === 'case-control' || options.design === 'paired' ? options.design : 'independent';
    var empty = {
      design: design,
      lead: 'Enter counts in all four cells.',
      detail: '',
      showRisks: design === 'independent',
      mcnemar: null,
      sparse: false,
      recommendedTest: design === 'paired' ? 'mcnemar' : 'pearson'
    };
    if (!result || !result.analyzable || !result.measures2x2 || !result.measures2x2.layout) return empty;
    var m = result.measures2x2;
    var lay = m.layout;
    var rd = m.riskDifference;
    var rr = m.riskRatio;
    var or = m.oddsRatio;
    var showRisks = design === 'independent';
    var lead = '';
    var detail = '';
    var mcnemar = null;
    if (design === 'paired') {
      mcnemar = mcnemar2x2(lay.cells.b, lay.cells.c, zCrit(result.confidence));
      if (mcnemar.available) {
        lead = mcnemar.b + ' pairs moved from ' + lay.rowIndex + ' to ' + lay.colReference +
          ', and ' + mcnemar.c + ' moved from ' + lay.rowReference + ' to ' + lay.colEvent + '.';
        var pShow = mcnemar.preferred === 'exact' ? mcnemar.pExact : mcnemar.pContinuity;
        var pName = mcnemar.preferred === 'exact' ? 'McNemar exact' : 'McNemar continuity-corrected';
        detail = pName + ' ' + fmtPLabel(pShow) + '. Independent-groups tests are not used for a paired table.';
      } else {
        lead = mcnemar.reason || 'Paired comparison is not estimable.';
        detail = 'Independent-groups tests are not used for a paired table.';
      }
    } else if (rd && rd.available && showRisks) {
      if (Math.abs(rd.value) < 1e-12) {
        lead = fmtPctLabel(rd.pIndex) + ' versus ' + fmtPctLabel(rd.pReference) + ' · no percentage-point difference';
      } else {
        var dir = rd.value > 0 ? 'higher' : 'lower';
        lead = fmtPctLabel(rd.pIndex) + ' versus ' + fmtPctLabel(rd.pReference) + ' · ' +
          fmtPpLabel(rd.value) + ' percentage points ' + dir;
      }
      var bits = [];
      if (rr && rr.available) bits.push('Risk ratio ' + fmtRatioLabel(rr.value));
      else if (rr && rr.reason) bits.push(rr.reason);
      if (or && or.available) bits.push('Odds ratio ' + fmtRatioLabel(or.value));
      detail = bits.join(' · ');
    } else if (design === 'case-control') {
      lead = 'Odds ratio ' + (or && or.available ? fmtRatioLabel(or.value) : 'not estimable');
      detail = 'These row percentages describe the sample. They are not population risks, and a risk ratio is not reported.';
    } else {
      lead = 'This table cannot be compared yet.';
    }
    var diag = result.diagnostics || {};
    var fisher = (result.tests && result.tests.fisher) || {};
    var sparse = !!(diag.nExpectedBelow1 > 0 || (diag.pctExpectedBelow5 > 20) || (diag.minExpected < 5));
    var recommended = design === 'paired'
      ? (mcnemar && mcnemar.preferred === 'exact' ? 'mcnemar-exact' : 'mcnemar')
      : (fisher.available && sparse ? 'fisher' : 'pearson');
    return {
      design: design,
      lead: lead,
      detail: detail,
      showRisks: showRisks,
      mcnemar: mcnemar,
      sparse: sparse,
      recommendedTest: recommended
    };
  }

  function buildInterpretation(result) {
    var tests = result.tests || {};
    var pearson = tests.pearson || {};
    var v = tests.cramersV;
    var alpha = 1 - (result.confidence || 0.95);
    var assoc = isFinite(pearson.p) && pearson.p < alpha;
    if (result.error) return { summary: result.error, details: [], associated: false };

    var pTxt = !isFinite(pearson.p) ? '' : (pearson.p < 0.001 ? 'p < .001' : 'p = ' + pearson.p.toFixed(3));
    var vTxt = isFinite(v) ? ', V = ' + v.toFixed(3) : '';
    var summary;
    if (assoc) {
      summary = 'Association detected between ' + result.rowVar + ' and ' + result.colVar +
        ' (χ² = ' + pearson.stat.toFixed(2) + ', df = ' + pearson.df + ', ' + pTxt + vTxt + ').';
    } else if (isFinite(pearson.p)) {
      summary = 'No association detected between ' + result.rowVar + ' and ' + result.colVar +
        ' (χ² = ' + pearson.stat.toFixed(2) + ', df = ' + pearson.df + ', ' + pTxt + vTxt + ').';
    } else {
      summary = 'The table was analyzed.';
    }
    return { summary: summary, details: [], associated: !!assoc };
  }

  function analyzeCounts(observed, rowLabels, colLabels, options) {
    options = options || {};
    var nRows = observed.length;
    var nCols = observed[0] ? observed[0].length : 0;
    var confidence = options.confidence > 1 ? options.confidence / 100 : (options.confidence || 0.95);
    if (!(confidence > 0 && confidence < 1)) confidence = 0.95;
    var z = zCrit(confidence);

    var rowTotals = [];
    var colTotals = [];
    var N = 0;
    var i, j;
    for (j = 0; j < nCols; j++) colTotals[j] = 0;
    for (i = 0; i < nRows; i++) {
      var rt = 0;
      for (j = 0; j < nCols; j++) {
        var v = Number(observed[i][j]) || 0;
        if (v < 0) {
          return { error: 'Cell counts cannot be negative.', analyzable: false };
        }
        rt += v;
        colTotals[j] += v;
      }
      rowTotals[i] = rt;
      N += rt;
    }

    var keepRows = [];
    var keepCols = [];
    for (i = 0; i < nRows; i++) if (rowTotals[i] > 0) keepRows.push(i);
    for (j = 0; j < nCols; j++) if (colTotals[j] > 0) keepCols.push(j);

    if (keepRows.length !== nRows || keepCols.length !== nCols) {
      var obs2 = keepRows.map(function (ri) {
        return keepCols.map(function (cj) { return observed[ri][cj]; });
      });
      return analyzeCounts(
        obs2,
        keepRows.map(function (ri) { return rowLabels[ri]; }),
        keepCols.map(function (cj) { return colLabels[cj]; }),
        options
      );
    }

    if (!(N > 0)) {
      return { error: 'No observations remain after applying missing-value and frequency rules.', analyzable: false };
    }
    if (nRows < 2 || nCols < 2) {
      return {
        error: 'A contingency analysis needs at least two non-empty row categories and two non-empty column categories. After dropping empty categories this table is ' + nRows + '×' + nCols + '.',
        analyzable: false,
        nRows: nRows,
        nCols: nCols,
        N: N,
        rowLabels: rowLabels,
        colLabels: colLabels,
        observed: observed,
        rowTotals: rowTotals,
        colTotals: colTotals
      };
    }

    var expected = [];
    var pearsonResid = [];
    var stdResid = [];
    var rowPct = [];
    var colPct = [];
    var totPct = [];
    var chi2 = 0;
    var g2 = 0;
    var nExpLt5 = 0;
    var nExpLt1 = 0;
    var minExp = Infinity;
    var cells = [];
    var nCells = nRows * nCols;

    for (i = 0; i < nRows; i++) {
      expected[i] = [];
      pearsonResid[i] = [];
      stdResid[i] = [];
      rowPct[i] = [];
      colPct[i] = [];
      totPct[i] = [];
      for (j = 0; j < nCols; j++) {
        var O = observed[i][j];
        var E = (rowTotals[i] * colTotals[j]) / N;
        expected[i][j] = E;
        if (E < minExp) minExp = E;
        if (E < 5) nExpLt5++;
        if (E < 1) nExpLt1++;
        var pr = E > 0 ? (O - E) / Math.sqrt(E) : NaN;
        var adjDen = E > 0 ? Math.sqrt(E * (1 - rowTotals[i] / N) * (1 - colTotals[j] / N)) : 0;
        var sr = adjDen > 0 ? (O - E) / adjDen : NaN;
        pearsonResid[i][j] = pr;
        stdResid[i][j] = sr;
        rowPct[i][j] = rowTotals[i] > 0 ? 100 * O / rowTotals[i] : NaN;
        colPct[i][j] = colTotals[j] > 0 ? 100 * O / colTotals[j] : NaN;
        totPct[i][j] = 100 * O / N;
        if (E > 0) chi2 += (O - E) * (O - E) / E;
        if (O > 0 && E > 0) g2 += O * Math.log(O / E);
        cells.push({
          row: rowLabels[i],
          col: colLabels[j],
          i: i,
          j: j,
          observed: O,
          expected: E,
          rowPct: rowPct[i][j],
          colPct: colPct[i][j],
          totPct: totPct[i][j],
          pearsonResidual: pr,
          stdResidual: sr,
          band: residualBand(sr)
        });
      }
    }
    g2 *= 2;
    var df = (nRows - 1) * (nCols - 1);
    var pPearson = chiSquareUpperP(chi2, df);
    var pLr = chiSquareUpperP(g2, df);
    var kMin = Math.min(nRows - 1, nCols - 1);
    var cramersV = (N > 0 && kMin > 0 && chi2 >= 0) ? Math.sqrt(chi2 / (N * kMin)) : NaN;
    var contingencyC = (chi2 + N) > 0 ? Math.sqrt(chi2 / (chi2 + N)) : NaN;
    var is2x2 = nRows === 2 && nCols === 2;
    var phi = NaN;
    if (is2x2 && N > 0) {
      var a0 = observed[0][0], b0 = observed[0][1], c0 = observed[1][0], d0 = observed[1][1];
      var den = Math.sqrt((a0 + b0) * (c0 + d0) * (a0 + c0) * (b0 + d0));
      phi = den > 0 ? (a0 * d0 - b0 * c0) / den : NaN;
    }

    var pctLt5 = 100 * nExpLt5 / nCells;
    var assumptionWarning = null;
    if (nExpLt1 > 0 || pctLt5 > 20) {
      assumptionWarning =
        'The chi-square approximation may be unreliable: ' +
        (nExpLt1 > 0 ? 'at least one expected count is below 1' : '') +
        (nExpLt1 > 0 && pctLt5 > 20 ? ', and ' : '') +
        (pctLt5 > 20 ? (pctLt5.toFixed(0) + '% of cells have expected counts below 5') : '') +
        '. For 2×2 tables, Fisher’s exact test is reported when counts are integers.';
    }

    var fisher = { available: false };
    if (is2x2) fisher = fisherExact2x2(observed[0][0], observed[0][1], observed[1][0], observed[1][1]);

    var result = {
      analyzable: true,
      nRows: nRows,
      nCols: nCols,
      N: N,
      rowLabels: rowLabels,
      colLabels: colLabels,
      observed: observed,
      expected: expected,
      rowPct: rowPct,
      colPct: colPct,
      totPct: totPct,
      pearsonResiduals: pearsonResid,
      stdResiduals: stdResid,
      rowTotals: rowTotals,
      colTotals: colTotals,
      cells: cells,
      confidence: confidence,
      tests: {
        pearson: { name: 'Pearson chi-square', stat: chi2, df: df, p: pPearson },
        likelihoodRatio: { name: 'Likelihood-ratio chi-square', stat: g2, df: df, p: pLr },
        fisher: fisher,
        phi: is2x2 && isFinite(phi) ? phi : null,
        cramersV: cramersV,
        contingencyC: contingencyC
      },
      diagnostics: {
        nCells: nCells,
        nExpectedBelow5: nExpLt5,
        pctExpectedBelow5: pctLt5,
        nExpectedBelow1: nExpLt1,
        minExpected: minExp,
        assumptionWarning: assumptionWarning
      },
      measures2x2: null
    };

    if (is2x2) {
      result.measures2x2 = measures2x2(
        observed[0][0], observed[0][1], observed[1][0], observed[1][1],
        z, rowLabels, colLabels
      );
    }

    result.interpretation = buildInterpretation(result);
    return result;
  }

  function remap2x2(result, rowIndexLabel, colEventLabel) {
    if (!result || !result.analyzable || result.nRows !== 2 || result.nCols !== 2) return result;
    var rows = result.rowLabels.slice();
    var cols = result.colLabels.slice();
    var obs = result.observed.map(function (r) { return r.slice(); });
    if (rowIndexLabel && rows[0] !== rowIndexLabel && rows[1] === rowIndexLabel) {
      rows = [rows[1], rows[0]];
      obs = [obs[1], obs[0]];
    }
    if (colEventLabel && cols[0] !== colEventLabel && cols[1] === colEventLabel) {
      cols = [cols[1], cols[0]];
      obs = [
        [obs[0][1], obs[0][0]],
        [obs[1][1], obs[1][0]]
      ];
    }
    var next = analyzeCounts(obs, rows, cols, { confidence: result.confidence });
    next.rowVar = result.rowVar;
    next.colVar = result.colVar;
    next.weightVar = result.frequencyColumn || result.weightVar || null;
    next.frequencyColumn = result.frequencyColumn || next.weightVar;
    next.frequencyWeightingApplied = !!result.frequencyWeightingApplied;
    next.weightType = result.weightType || (next.frequencyColumn ? 'frequency' : null);
    next.inputRowCount = result.inputRowCount;
    next.representedN = result.representedN;
    next.originalExcelRows = result.originalExcelRows;
    next.excludedMissing = result.excludedMissing;
    next.eligibleInputRows = result.eligibleInputRows;
    next.frequencyNote = result.frequencyNote;
    next.missingMode = result.missingMode;
    next.dropped = result.dropped;
    next.warnings = result.warnings;
    next.sourceN = result.sourceN;
    next.usedRows = result.usedRows;
    next.viewHeaders = result.viewHeaders;
    next.allViewRows = result.allViewRows;
    next.usedViewRows = result.usedViewRows;
    next.interpretation = buildInterpretation(next);
    return next;
  }

  function analyze(headers, rows, spec) {
    spec = spec || {};
    headers = headers || [];
    rows = rows || [];
    var warnings = [];
    var rowName = spec.rowVar;
    var colName = spec.colVar;
    var freqName = resolveFrequencyColumn(spec);
    var missingMode = spec.missing === 'category' || spec.missingMode === 'category' ? 'category' : 'exclude';
    var confidence = spec.confidence != null ? spec.confidence : 0.95;

    function toAllow(list) {
      if (!list || !list.length) return null;
      var o = Object.create(null);
      for (var i = 0; i < list.length; i++) o[String(list[i])] = true;
      return o;
    }
    var rowAllow = toAllow(spec.rowLevels);
    var colAllow = toAllow(spec.colLevels);

    if (!rowName || !colName) {
      return { error: 'Select both a row variable and a column variable.', analyzable: false };
    }
    if (String(rowName) === String(colName)) {
      return { error: 'Row and column variables must be different.', analyzable: false };
    }

    var ri = colIndex(headers, rowName);
    var ci = colIndex(headers, colName);
    var fi = freqName ? colIndex(headers, freqName) : -1;
    if (ri < 0) return { error: 'Row variable “' + rowName + '” was not found in the data.', analyzable: false };
    if (ci < 0) return { error: 'Column variable “' + colName + '” was not found in the data.', analyzable: false };
    if (freqName && fi < 0) {
      return {
        error: 'Frequency/count column “' + freqName + '” was not found in the data.',
        analyzable: false,
        frequencyColumn: String(freqName),
        frequencyWeightingApplied: false,
        weightType: null
      };
    }

    var rowProf = profileColumn(headers, rows, ri);
    var colProf = profileColumn(headers, rows, ci);
    if (rowProf.nLevels > MAX_LEVELS) {
      return { error: 'Row variable “' + rowProf.name + '” has ' + rowProf.nLevels + ' distinct values. Contingency tables are for categorical variables (or numeric variables with a limited number of levels).', analyzable: false };
    }
    if (colProf.nLevels > MAX_LEVELS) {
      return { error: 'Column variable “' + colProf.name + '” has ' + colProf.nLevels + ' distinct values. Contingency tables are for categorical variables (or numeric variables with a limited number of levels).', analyzable: false };
    }
    if (rowProf.numeric && rowProf.nLevels > NUMERIC_WARN_LEVELS) {
      warnings.push('Row variable “' + rowProf.name + '” looks numeric with ' + rowProf.nLevels + ' distinct values. Results treat each distinct value as a category.');
    }
    if (colProf.numeric && colProf.nLevels > NUMERIC_WARN_LEVELS) {
      warnings.push('Column variable “' + colProf.name + '” looks numeric with ' + colProf.nLevels + ' distinct values. Results treat each distinct value as a category.');
    }

    var map = Object.create(null);
    var rowOrder = [];
    var colOrder = [];
    var droppedMissing = 0;
    var droppedLevel = 0;
    var used = 0;
    var representedN = 0;
    var sourceN = rows.length;
    var freqDisplayName = fi >= 0 ? String(headers[fi]) : null;
    var viewHeaders = [rowProf.name, colProf.name];
    if (fi >= 0) viewHeaders.push(freqDisplayName);
    var allViewRows = [];
    var usedViewRows = [];

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r] || [];
      var rv = row[ri];
      var cv = row[ci];
      var viewRow = [viewCell(rv), viewCell(cv)];
      if (fi >= 0) viewRow.push(viewCell(row[fi]));
      allViewRows.push(viewRow);
      var rowMiss = isMissing(rv);
      var colMiss = isMissing(cv);
      if (rowMiss || colMiss) {
        if (missingMode === 'exclude') { droppedMissing++; continue; }
        if (rowMiss) rv = MISSING_LABEL;
        if (colMiss) cv = MISSING_LABEL;
      }
      var rl = catLabel(rv);
      var cl = catLabel(cv);
      if (rowAllow && !rowAllow[rl]) { droppedLevel++; continue; }
      if (colAllow && !colAllow[cl]) { droppedLevel++; continue; }
      var w = 1;
      if (fi >= 0) {
        var parsed = parseFrequency(row[fi]);
        if (!parsed.ok) {
          return frequencyErrorResult(freqDisplayName, parsed.reason, r + 2, parsed.value);
        }
        w = parsed.value;
      }
      if (representedN + w > MAX_REPRESENTED_N || !Number.isFinite(representedN + w)) {
        return frequencyErrorResult(freqDisplayName || 'Frequency', 'overflow', r + 2, w);
      }
      representedN += w;
      if (rowOrder.indexOf(rl) < 0) rowOrder.push(rl);
      if (colOrder.indexOf(cl) < 0) colOrder.push(cl);
      var key = rl + '\u0000' + cl;
      map[key] = (map[key] || 0) + w;
      used++;
      usedViewRows.push(viewRow);
    }

    if (fi >= 0 && used > 0 && representedN === 0) {
      return frequencyErrorResult(freqDisplayName, 'zeros');
    }
    if (missingMode === 'exclude' && droppedMissing) {
      warnings.push(droppedMissing + ' row' + (droppedMissing === 1 ? '' : 's') + ' dropped because the row or column value was missing.');
    }
    if (droppedLevel) {
      warnings.push(droppedLevel + ' row' + (droppedLevel === 1 ? '' : 's') + ' dropped because a category was not selected.');
    }

    var observed = rowOrder.map(function (rl) {
      return colOrder.map(function (cl) {
        return map[rl + '\u0000' + cl] || 0;
      });
    });

    var result = analyzeCounts(observed, rowOrder, colOrder, { confidence: confidence });
    result.rowVar = rowProf.name;
    result.colVar = colProf.name;
    result.frequencyColumn = freqDisplayName;
    result.frequencyWeightingApplied = fi >= 0;
    result.weightType = fi >= 0 ? 'frequency' : null;
    result.inputRowCount = used;
    result.representedN = fi >= 0 ? representedN : used;
    result.originalExcelRows = sourceN;
    result.excludedMissing = droppedMissing;
    result.eligibleInputRows = used;
    result.frequencyNote = fi >= 0
      ? 'Frequency counts were applied. Each input row may represent multiple identical observations.'
      : null;
    result.missingMode = missingMode;
    result.dropped = { missing: droppedMissing, level: droppedLevel };
    result.rowLevels = rowOrder.slice();
    result.colLevels = colOrder.slice();
    result.viewHeaders = viewHeaders;
    result.allViewRows = allViewRows;
    result.usedViewRows = usedViewRows;
    result.usedRows = used;
    result.sourceN = sourceN;
    result.warnings = warnings;
    if (result.analyzable) result.interpretation = buildInterpretation(result);
    if (spec.rowIndex || spec.colEvent) {
      result = remap2x2(result, spec.rowIndex || spec.rowEvent, spec.colEvent);
    }
    return result;
  }

  function invertMatrix(source) {
    var n = source.length;
    if (!n) return null;
    var m = source.map(function (row, i) {
      var out = row.slice();
      var j;
      for (j = 0; j < n; j++) out.push(i === j ? 1 : 0);
      return out;
    });
    var col, row, pivot, div, factor, j;
    for (col = 0; col < n; col++) {
      pivot = col;
      for (row = col + 1; row < n; row++) {
        if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
      }
      if (!(Math.abs(m[pivot][col]) > 1e-10)) return null;
      if (pivot !== col) {
        var swap = m[col];
        m[col] = m[pivot];
        m[pivot] = swap;
      }
      div = m[col][col];
      for (j = col; j < n * 2; j++) m[col][j] /= div;
      for (row = 0; row < n; row++) {
        if (row === col) continue;
        factor = m[row][col];
        if (factor === 0) continue;
        for (j = col; j < n * 2; j++) m[row][j] -= factor * m[col][j];
      }
    }
    return m.map(function (line) { return line.slice(n); });
  }

  function marginsOf(observed) {
    var nRows = observed.length;
    var nCols = observed[0] ? observed[0].length : 0;
    var rowTotals = [];
    var colTotals = [];
    var N = 0;
    var i, j;
    for (j = 0; j < nCols; j++) colTotals[j] = 0;
    for (i = 0; i < nRows; i++) {
      var rt = 0;
      for (j = 0; j < nCols; j++) {
        var v = observed[i][j];
        if (!isIntegerCount(v) || v < 0) return null;
        v = Math.round(v);
        rt += v;
        colTotals[j] += v;
      }
      rowTotals[i] = rt;
      N += rt;
    }
    return { nRows: nRows, nCols: nCols, rowTotals: rowTotals, colTotals: colTotals, N: N };
  }

  function chiSquareStatistic(observed, rowTotals, colTotals, N) {
    if (!(N > 0)) return NaN;
    var chi = 0;
    for (var i = 0; i < observed.length; i++) {
      for (var j = 0; j < observed[i].length; j++) {
        var E = rowTotals[i] * colTotals[j] / N;
        if (E > 0) {
          var d = observed[i][j] - E;
          chi += d * d / E;
        }
      }
    }
    return chi;
  }

  function sampleHypergeometric(population, marked, draws, rng) {
    var lo = Math.max(0, draws - (population - marked));
    var hi = Math.min(draws, marked);
    if (lo >= hi) return lo;
    var maxLog = -Infinity;
    var logs = [];
    var x;
    for (x = lo; x <= hi; x++) {
      var lp = logChoose(marked, x) + logChoose(population - marked, draws - x) - logChoose(population, draws);
      logs.push(lp);
      if (lp > maxLog) maxLog = lp;
    }
    var sum = 0;
    var weights = logs.map(function (lp) {
      var w = Math.exp(lp - maxLog);
      sum += w;
      return w;
    });
    var u = rng() * sum;
    var acc = 0;
    for (var i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (u <= acc) return lo + i;
    }
    return hi;
  }

  function randomContingency(rowTotals, colTotals, rng) {
    var nRows = rowTotals.length;
    var nCols = colTotals.length;
    var table = [];
    var cs = colTotals.slice();
    var i, j;
    for (i = 0; i < nRows - 1; i++) {
      table[i] = [];
      var remainingRow = rowTotals[i];
      var remainingN = 0;
      for (j = 0; j < nCols; j++) remainingN += cs[j];
      for (j = 0; j < nCols - 1; j++) {
        var x = sampleHypergeometric(remainingN, cs[j], remainingRow, rng);
        table[i][j] = x;
        remainingRow -= x;
        remainingN -= cs[j];
        cs[j] -= x;
      }
      table[i][nCols - 1] = remainingRow;
      cs[nCols - 1] -= remainingRow;
    }
    table[nRows - 1] = cs.slice();
    return table;
  }

  function hashCounts(observed) {
    var h = 2166136261;
    for (var i = 0; i < observed.length; i++) {
      for (var j = 0; j < observed[i].length; j++) {
        h ^= (observed[i][j] + 1 + i * 131 + j * 17);
        h = Math.imul(h, 16777619);
      }
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function monteCarloIndependence(observed, options) {
    options = options || {};
    var margins = marginsOf(observed);
    if (!margins) {
      return { available: false, reason: 'Simulation needs whole-number cell counts.' };
    }
    if (margins.nRows < 2 || margins.nCols < 2 || !(margins.N > 0)) {
      return { available: false, reason: 'Simulation needs a complete table with row and column totals.' };
    }
    if (margins.N > 800) {
      return {
        available: false,
        reason: 'Simulation in this calculator is limited to tables of 800 observations. Larger tables belong in the Excel contingency analysis.'
      };
    }
    var chiObs = chiSquareStatistic(observed, margins.rowTotals, margins.colTotals, margins.N);
    var nSims = options.nSims || 1999;
    var rng = mulberry32(options.seed != null ? options.seed : hashCounts(observed));
    var extreme = 0;
    for (var s = 0; s < nSims; s++) {
      var sim = randomContingency(margins.rowTotals, margins.colTotals, rng);
      var chi = chiSquareStatistic(sim, margins.rowTotals, margins.colTotals, margins.N);
      if (chi + 1e-9 >= chiObs) extreme++;
    }
    return {
      available: true,
      method: 'monte-carlo-fixed-margins',
      nSims: nSims,
      nExtreme: extreme,
      observedChi2: chiObs,
      p: (extreme + 1) / (nSims + 1)
    };
  }

  function binaryGroupComparisons(observed, rowLabels, colLabels, refRow, eventCol) {
    var nRows = observed.length;
    var nCols = observed[0] ? observed[0].length : 0;
    if (nCols !== 2 || nRows < 2) {
      return { available: false, reason: 'These comparisons need two outcome columns and at least two groups.' };
    }
    if (eventCol !== 0 && eventCol !== 1) eventCol = 0;
    if (!(refRow >= 0 && refRow < nRows)) refRow = 0;
    var other = 1 - eventCol;
    var z = zCrit(0.95);
    var groups = [];
    for (var i = 0; i < nRows; i++) {
      var events = Number(observed[i][eventCol]) || 0;
      var complement = Number(observed[i][other]) || 0;
      var n = events + complement;
      var item = {
        i: i,
        row: rowLabels[i],
        events: events,
        n: n,
        reference: i === refRow,
        proportion: wilsonProportion(events, n, z)
      };
      if (i !== refRow) {
        var a = observed[i][eventCol];
        var b = observed[i][other];
        var c = observed[refRow][eventCol];
        var d = observed[refRow][other];
        var rows = [rowLabels[i], rowLabels[refRow]];
        var cols = [colLabels[eventCol], colLabels[other]];
        var measures = measures2x2(a, b, c, d, z, rows, cols);
        var sub = analyzeCounts([[a, b], [c, d]], rows, cols, { confidence: 0.95 });
        item.versusReference = {
          riskDifference: measures.riskDifference,
          riskRatio: measures.riskRatio,
          oddsRatio: measures.oddsRatio,
          pearson: sub.analyzable ? sub.tests.pearson : null,
          fisher: sub.analyzable ? sub.tests.fisher : null
        };
      }
      groups.push(item);
    }
    return {
      available: true,
      reference: rowLabels[refRow],
      referenceIndex: refRow,
      event: colLabels[eventCol],
      groups: groups
    };
  }

  function stuartMaxwell(observed) {
    var k = observed.length;
    if (k < 2 || observed.some(function (row) { return !row || row.length !== k; })) {
      return { available: false, reason: 'Stuart–Maxwell needs a square table of the same categories.' };
    }
    var margins = marginsOf(observed);
    if (!margins) return { available: false, reason: 'Stuart–Maxwell needs whole-number cell counts.' };
    var df = k - 1;
    var d = [];
    var i, j;
    for (i = 0; i < df; i++) d.push(margins.rowTotals[i] - margins.colTotals[i]);
    var V = [];
    for (i = 0; i < df; i++) {
      V[i] = [];
      for (j = 0; j < df; j++) {
        V[i][j] = i === j
          ? margins.rowTotals[i] + margins.colTotals[i] - 2 * observed[i][i]
          : -(observed[i][j] + observed[j][i]);
      }
    }
    var inv = invertMatrix(V);
    if (!inv) {
      return {
        available: false,
        reason: 'The two margins do not vary enough for Stuart–Maxwell. That happens when almost every observation stayed on the diagonal.',
        df: df
      };
    }
    var stat = 0;
    for (i = 0; i < df; i++) {
      var acc = 0;
      for (j = 0; j < df; j++) acc += inv[i][j] * d[j];
      stat += d[i] * acc;
    }
    if (stat < 0 && stat > -1e-8) stat = 0;
    return {
      available: true,
      name: 'Stuart–Maxwell',
      statistic: stat,
      df: df,
      p: chiSquareUpperP(stat, df),
      rowTotals: margins.rowTotals,
      colTotals: margins.colTotals,
      question: 'marginal homogeneity'
    };
  }

  function bowkerSymmetry(observed) {
    var k = observed.length;
    if (k < 2 || observed.some(function (row) { return !row || row.length !== k; })) {
      return { available: false, reason: 'Bowker’s test needs a square table.' };
    }
    if (!marginsOf(observed)) return { available: false, reason: 'Bowker’s test needs whole-number cell counts.' };
    var stat = 0;
    var df = 0;
    for (var i = 0; i < k; i++) {
      for (var j = i + 1; j < k; j++) {
        var sum = observed[i][j] + observed[j][i];
        if (sum > 0) {
          var diff = observed[i][j] - observed[j][i];
          stat += diff * diff / sum;
          df++;
        }
      }
    }
    if (!(df > 0)) {
      return { available: false, reason: 'Bowker’s test needs at least one pair of opposite off-diagonal counts.', df: 0 };
    }
    return {
      available: true,
      name: 'Bowker',
      statistic: stat,
      df: df,
      p: chiSquareUpperP(stat, df),
      question: 'symmetry'
    };
  }

  return {
    MAX_LEVELS: MAX_LEVELS,
    MAX_REPRESENTED_N: MAX_REPRESENTED_N,
    profileData: profileData,
    profileColumn: profileColumn,
    analyze: analyze,
    analyzeCounts: analyzeCounts,
    remap2x2: remap2x2,
    wilsonProportion: wilsonProportion,
    mcnemar2x2: mcnemar2x2,
    summary2x2: summary2x2,
    binaryGroupComparisons: binaryGroupComparisons,
    monteCarloIndependence: monteCarloIndependence,
    stuartMaxwell: stuartMaxwell,
    bowkerSymmetry: bowkerSymmetry,
    randomContingency: randomContingency,
    residualBand: residualBand,
    chiSquareUpperP: chiSquareUpperP,
    zCrit: zCrit,
    isMissing: isMissing,
    catLabel: catLabel,
    isIntegerCount: isIntegerCount,
    parseFrequency: parseFrequency,
    resolveFrequencyColumn: resolveFrequencyColumn,
    isFrequencyCandidateColumn: isFrequencyCandidateColumn,
    formatFrequencyError: formatFrequencyError
  };
});
