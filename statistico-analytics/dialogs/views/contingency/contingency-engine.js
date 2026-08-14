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

  function catLabel(v) {
    if (typeof v === 'number' && isFinite(v)) {
      if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
      var t = String(v);
      return t.length > 12 ? v.toPrecision(6) : t;
    }
    return String(v).trim();
  }

  function toWeight(v) {
    if (isMissing(v)) return NaN;
    var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
    return isFinite(n) ? n : NaN;
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
      return { available: false, reason: "Fisher's exact test requires integer cell counts. Weighted frequencies produced non-integer counts." };
    }
    a = aa; b = bb; c = cc; d = dd;
    var n1 = a + b, n2 = c + d, n = a + c, N = a + b + c + d;
    if (N <= 0 || n1 <= 0 || n2 <= 0 || n <= 0 || (N - n) <= 0) {
      return { available: false, reason: "Fisher's exact test needs a 2×2 table with positive margins." };
    }
    var minA = Math.max(0, n1 + n - N);
    var maxA = Math.min(n1, n);
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
    return out;
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
      return { error: 'No observations remain after applying missing-value and weight rules.', analyzable: false };
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
    next.weightVar = result.weightVar;
    next.missingMode = result.missingMode;
    next.dropped = result.dropped;
    next.warnings = result.warnings;
    next.sourceN = result.sourceN;
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
    var weightName = spec.weightVar || spec.freqVar || null;
    var missingMode = spec.missing === 'category' || spec.missingMode === 'category' ? 'category' : 'exclude';
    var confidence = spec.confidence != null ? spec.confidence : 0.95;

    if (!rowName || !colName) {
      return { error: 'Select both a row variable and a column variable.', analyzable: false };
    }
    if (String(rowName) === String(colName)) {
      return { error: 'Row and column variables must be different.', analyzable: false };
    }

    var ri = colIndex(headers, rowName);
    var ci = colIndex(headers, colName);
    var wi = weightName ? colIndex(headers, weightName) : -1;
    if (ri < 0) return { error: 'Row variable “' + rowName + '” was not found in the data.', analyzable: false };
    if (ci < 0) return { error: 'Column variable “' + colName + '” was not found in the data.', analyzable: false };
    if (weightName && wi < 0) return { error: 'Frequency/weight variable “' + weightName + '” was not found in the data.', analyzable: false };

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
    var droppedWeight = 0;
    var used = 0;
    var sourceN = rows.length;

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r] || [];
      var rv = row[ri];
      var cv = row[ci];
      var rowMiss = isMissing(rv);
      var colMiss = isMissing(cv);
      if (rowMiss || colMiss) {
        if (missingMode === 'exclude') { droppedMissing++; continue; }
        if (rowMiss) rv = MISSING_LABEL;
        if (colMiss) cv = MISSING_LABEL;
      }
      var rl = catLabel(rv);
      var cl = catLabel(cv);
      var w = 1;
      if (wi >= 0) {
        w = toWeight(row[wi]);
        if (!(w > 0) || !isFinite(w)) { droppedWeight++; continue; }
      }
      if (rowOrder.indexOf(rl) < 0) rowOrder.push(rl);
      if (colOrder.indexOf(cl) < 0) colOrder.push(cl);
      var key = rl + '\u0000' + cl;
      map[key] = (map[key] || 0) + w;
      used++;
    }

    if (wi >= 0 && droppedWeight) {
      warnings.push(droppedWeight + ' row' + (droppedWeight === 1 ? '' : 's') + ' dropped because the frequency/weight was missing or not positive.');
    }
    if (missingMode === 'exclude' && droppedMissing) {
      warnings.push(droppedMissing + ' row' + (droppedMissing === 1 ? '' : 's') + ' dropped because the row or column value was missing.');
    }

    var observed = rowOrder.map(function (rl) {
      return colOrder.map(function (cl) {
        return map[rl + '\u0000' + cl] || 0;
      });
    });

    var result = analyzeCounts(observed, rowOrder, colOrder, { confidence: confidence });
    result.rowVar = rowProf.name;
    result.colVar = colProf.name;
    result.weightVar = wi >= 0 ? String(headers[wi]) : null;
    result.missingMode = missingMode;
    result.dropped = { missing: droppedMissing, weight: droppedWeight };
    result.usedRows = used;
    result.sourceN = sourceN;
    result.warnings = warnings;
    if (result.analyzable) result.interpretation = buildInterpretation(result);
    if (spec.rowIndex || spec.colEvent) {
      result = remap2x2(result, spec.rowIndex || spec.rowEvent, spec.colEvent);
    }
    return result;
  }

  return {
    MAX_LEVELS: MAX_LEVELS,
    profileData: profileData,
    profileColumn: profileColumn,
    analyze: analyze,
    analyzeCounts: analyzeCounts,
    remap2x2: remap2x2,
    residualBand: residualBand,
    chiSquareUpperP: chiSquareUpperP,
    zCrit: zCrit,
    isMissing: isMissing
  };
});
