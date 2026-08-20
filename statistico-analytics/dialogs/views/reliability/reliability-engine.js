/**
 * Scale Reliability engine for Statistico.
 * Computes Cronbach’s alpha, standardized alpha, McDonald’s omega total,
 * item diagnostics, inter-item correlations, a PCA dimensionality diagnostic,
 * bootstrap confidence intervals, and optional by-group summaries.
 *
 * Never mutates the caller’s source arrays. Returns null (not NaN/Infinity)
 * for inestimable numeric fields.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoReliability = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MODULE_ID = 'scaleReliability';
  var MODULE_NAME = 'Scale Reliability';
  var MODULE_SUBTITLE = 'Assess the internal consistency and structure of multi-item scales';
  var EPS = 1e-12;
  var PD_EPS = 1e-8;

  var SUSPICIOUS_NAME_RE = /^(id|ids|year|date|dt|total|totals|weight|weights|variance|var|se|stderr|std\s*err|effect|effect_yi|se_yi|iv_weight|n|n_obs|sample\s*size|samplesize)$/i;
  var SUSPICIOUS_TOKEN_RE = /(^|[_-\s])(id|year|date|total|weight|variance|se|effect)($|[_-\s\d])/i;

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function isBlank(v) {
    if (v == null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function asNumber(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') {
      var s = v.trim().replace(/,/g, '');
      if (s === '') return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function finiteOrNull(v) {
    return typeof v === 'number' && isFinite(v) ? v : null;
  }

  function round(v, d) {
    var n = finiteOrNull(v);
    if (n == null) return null;
    var f = Math.pow(10, d == null ? 6 : d);
    return Math.round(n * f) / f;
  }

  function headerIndex(headers, name) {
    var want = String(name == null ? '' : name).trim().toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i] == null ? '' : headers[i]).trim().toLowerCase() === want) return i;
    }
    return -1;
  }

  function mean(arr) {
    if (!arr || !arr.length) return null;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  function sampleVariance(arr) {
    if (!arr || arr.length < 2) return null;
    var m = mean(arr);
    var ss = 0;
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i] - m;
      ss += d * d;
    }
    return ss / (arr.length - 1);
  }

  function sampleSd(arr) {
    var v = sampleVariance(arr);
    return v == null ? null : Math.sqrt(Math.max(0, v));
  }

  function pearson(x, y) {
    if (!x || !y || x.length !== y.length || x.length < 2) return null;
    var n = x.length;
    var mx = 0;
    var my = 0;
    var i;
    for (i = 0; i < n; i++) {
      mx += x[i];
      my += y[i];
    }
    mx /= n;
    my /= n;
    var num = 0;
    var sx = 0;
    var sy = 0;
    for (i = 0; i < n; i++) {
      var dx = x[i] - mx;
      var dy = y[i] - my;
      num += dx * dy;
      sx += dx * dx;
      sy += dy * dy;
    }
    var den = Math.sqrt(sx * sy);
    if (!(den > 0)) return null;
    var r = num / den;
    return isFinite(r) ? r : null;
  }

  function mulberry32(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function defaultConfig(overrides) {
    var cfg = {
      items: [],
      reverseItems: [],
      scoreRange: null,
      groupVariable: null,
      missingMethod: 'listwise',
      coefficients: {
        alpha: true,
        omegaTotal: true,
        standardizedAlpha: false,
        confidenceInterval: true
      },
      confidenceLevel: 0.95,
      bootstrapSamples: 1000,
      weakItemThreshold: 0.30,
      itemDiagnostics: {
        itemTotal: true,
        alphaIfDeleted: true,
        omegaIfDeleted: true,
        interItemMatrix: true,
        flagWeak: true
      },
      structure: {
        unidimensionality: true,
        scree: true
      },
      rngSeed: null
    };
    if (!overrides || typeof overrides !== 'object') return cfg;
    Object.keys(overrides).forEach(function (k) {
      if (overrides[k] && typeof overrides[k] === 'object' && !Array.isArray(overrides[k]) && k !== 'scoreRange') {
        cfg[k] = Object.assign(cfg[k] || {}, overrides[k]);
      } else {
        cfg[k] = overrides[k];
      }
    });
    return cfg;
  }

  function isSuspiciousName(name) {
    var s = String(name == null ? '' : name).trim();
    if (!s) return false;
    if (SUSPICIOUS_NAME_RE.test(s)) return true;
    if (SUSPICIOUS_TOKEN_RE.test(s)) return true;
    return false;
  }

  function reverseValue(value, min, max) {
    var n = asNumber(value);
    if (n == null) return null;
    return min + max - n;
  }

  function inferScoreRange(values) {
    var nums = [];
    var allInt = true;
    for (var i = 0; i < values.length; i++) {
      var n = asNumber(values[i]);
      if (n == null) continue;
      nums.push(n);
      if (Math.abs(n - Math.round(n)) > 1e-9) allInt = false;
    }
    if (!nums.length) return null;
    var mn = Math.min.apply(null, nums);
    var mx = Math.max.apply(null, nums);
    if (allInt) {
      return { min: mn, max: mx, inferred: true, integer: true };
    }
    return { min: mn, max: mx, inferred: true, integer: false };
  }

  function alphaBand(alpha) {
    if (alpha == null || !isFinite(alpha)) return { label: 'Not estimable', key: 'na' };
    if (alpha < 0) return { label: 'Negative', key: 'negative' };
    if (alpha < 0.60) return { label: 'Low', key: 'low' };
    if (alpha < 0.70) return { label: 'Questionable', key: 'questionable' };
    if (alpha < 0.80) return { label: 'Acceptable', key: 'acceptable' };
    if (alpha < 0.90) return { label: 'Good', key: 'good' };
    return { label: 'Very high', key: 'veryHigh' };
  }

  function identity(n) {
    var I = [];
    for (var i = 0; i < n; i++) {
      I[i] = [];
      for (var j = 0; j < n; j++) I[i][j] = i === j ? 1 : 0;
    }
    return I;
  }

  function cloneMatrix(A) {
    return A.map(function (r) { return r.slice(); });
  }

  function jacobiEigen(A, maxIter, eps) {
    maxIter = maxIter == null ? 120 : maxIter;
    eps = eps == null ? 1e-12 : eps;
    var n = A.length;
    var D = cloneMatrix(A);
    var V = identity(n);
    var iter;
    var i;
    var j;
    for (iter = 0; iter < maxIter; iter++) {
      var p = 0;
      var q = 1;
      var max = 0;
      for (i = 0; i < n; i++) {
        for (j = i + 1; j < n; j++) {
          var aij = Math.abs(D[i][j]);
          if (aij > max) {
            max = aij;
            p = i;
            q = j;
          }
        }
      }
      if (max < eps) break;
      var app = D[p][p];
      var aqq = D[q][q];
      var apq = D[p][q];
      var theta = 0.5 * Math.atan2(2 * apq, aqq - app);
      var c = Math.cos(theta);
      var s = Math.sin(theta);
      for (i = 0; i < n; i++) {
        if (i !== p && i !== q) {
          var aip = D[i][p];
          var aiq = D[i][q];
          D[i][p] = D[p][i] = c * aip - s * aiq;
          D[i][q] = D[q][i] = s * aip + c * aiq;
        }
      }
      D[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      D[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
      D[p][q] = D[q][p] = 0;
      for (i = 0; i < n; i++) {
        var vip = V[i][p];
        var viq = V[i][q];
        V[i][p] = c * vip - s * viq;
        V[i][q] = s * vip + c * viq;
      }
    }
    var eigenvalues = [];
    var eigenvectors = [];
    for (i = 0; i < n; i++) {
      eigenvalues.push(D[i][i]);
      eigenvectors.push([]);
    }
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) eigenvectors[i][j] = V[i][j];
    }
    var order = eigenvalues.map(function (v, idx) { return { v: v, i: idx }; });
    order.sort(function (a, b) { return b.v - a.v; });
    var sortedVals = [];
    var sortedVecs = [];
    for (i = 0; i < n; i++) {
      sortedVecs[i] = [];
    }
    for (j = 0; j < n; j++) {
      sortedVals[j] = order[j].v;
      for (i = 0; i < n; i++) sortedVecs[i][j] = eigenvectors[i][order[j].i];
    }
    return { eigenvalues: sortedVals, eigenvectors: sortedVecs };
  }

  function pairwiseMoments(colA, colB) {
    var xs = [];
    var ys = [];
    var n = Math.min(colA.length, colB.length);
    for (var i = 0; i < n; i++) {
      var a = colA[i];
      var b = colB[i];
      if (a == null || b == null) continue;
      xs.push(a);
      ys.push(b);
    }
    var m = xs.length;
    if (m < 2) {
      return { n: m, cov: null, r: null, varA: null, varB: null };
    }
    var mx = mean(xs);
    var my = mean(ys);
    var c = 0;
    var va = 0;
    var vb = 0;
    for (var j = 0; j < m; j++) {
      var dx = xs[j] - mx;
      var dy = ys[j] - my;
      c += dx * dy;
      va += dx * dx;
      vb += dy * dy;
    }
    return {
      n: m,
      cov: c / (m - 1),
      r: (va > 0 && vb > 0) ? (c / Math.sqrt(va * vb)) : null,
      varA: va / (m - 1),
      varB: vb / (m - 1)
    };
  }

  function covarianceMatrix(columns, pairwise) {
    var k = columns.length;
    var S = [];
    var N = [];
    var i;
    var j;
    for (i = 0; i < k; i++) {
      S[i] = [];
      N[i] = [];
      for (j = 0; j < k; j++) {
        S[i][j] = null;
        N[i][j] = 0;
      }
    }
    if (!pairwise) {
      var n = columns[0] ? columns[0].length : 0;
      for (i = 0; i < k; i++) {
        for (j = i; j < k; j++) {
          var mom = pairwiseMoments(columns[i], columns[j]);
          S[i][j] = S[j][i] = mom.cov;
          N[i][j] = N[j][i] = mom.n;
        }
      }
      return { matrix: S, pairwiseN: N, n: n };
    }
    for (i = 0; i < k; i++) {
      for (j = i; j < k; j++) {
        var m2 = pairwiseMoments(columns[i], columns[j]);
        S[i][j] = S[j][i] = m2.cov;
        N[i][j] = N[j][i] = m2.n;
      }
    }
    return { matrix: S, pairwiseN: N, n: null };
  }

  function correlationFromCov(S) {
    var k = S.length;
    var R = [];
    var i;
    var j;
    for (i = 0; i < k; i++) {
      R[i] = [];
      for (j = 0; j < k; j++) {
        var vii = S[i][i];
        var vjj = S[j][j];
        var cij = S[i][j];
        if (vii == null || vjj == null || cij == null || !(vii > 0) || !(vjj > 0)) {
          R[i][j] = i === j ? 1 : null;
        } else if (i === j) {
          R[i][j] = 1;
        } else {
          var r = cij / Math.sqrt(vii * vjj);
          R[i][j] = isFinite(r) ? Math.max(-1, Math.min(1, r)) : null;
        }
      }
    }
    return R;
  }

  function matrixHasNull(M) {
    for (var i = 0; i < M.length; i++) {
      for (var j = 0; j < M[i].length; j++) {
        if (M[i][j] == null || !isFinite(M[i][j])) return true;
      }
    }
    return false;
  }

  function cronbachAlphaFromCov(S) {
    if (!S || S.length < 2) return null;
    var k = S.length;
    var sumVar = 0;
    var sumAll = 0;
    var i;
    var j;
    for (i = 0; i < k; i++) {
      if (S[i][i] == null || !isFinite(S[i][i])) return null;
      sumVar += S[i][i];
      for (j = 0; j < k; j++) {
        if (S[i][j] == null || !isFinite(S[i][j])) return null;
        sumAll += S[i][j];
      }
    }
    if (!(sumAll > 0) && !(sumAll < 0) && sumAll !== 0) return null;
    if (Math.abs(sumAll) < EPS) return null;
    var alpha = (k / (k - 1)) * (1 - sumVar / sumAll);
    return isFinite(alpha) ? alpha : null;
  }

  function standardizedAlphaFromR(R) {
    if (!R || R.length < 2) return null;
    var k = R.length;
    var sum = 0;
    var count = 0;
    var i;
    var j;
    for (i = 0; i < k; i++) {
      for (j = i + 1; j < k; j++) {
        if (R[i][j] == null || !isFinite(R[i][j])) continue;
        sum += R[i][j];
        count++;
      }
    }
    if (!count) return null;
    var rBar = sum / count;
    var den = 1 + (k - 1) * rBar;
    if (Math.abs(den) < EPS) return null;
    var alpha = (k * rBar) / den;
    return isFinite(alpha) ? alpha : null;
  }

  function averageOffDiagonal(R) {
    if (!R || R.length < 2) return { mean: null, min: null, max: null, negatives: 0, weak: 0, high: 0, count: 0 };
    var k = R.length;
    var vals = [];
    var negatives = 0;
    var weak = 0;
    var high = 0;
    for (var i = 0; i < k; i++) {
      for (var j = i + 1; j < k; j++) {
        var r = R[i][j];
        if (r == null || !isFinite(r)) continue;
        vals.push(r);
        if (r < 0) negatives++;
        if (Math.abs(r) < 0.20) weak++;
        if (r > 0.90) high++;
      }
    }
    if (!vals.length) return { mean: null, min: null, max: null, negatives: 0, weak: 0, high: 0, count: 0 };
    return {
      mean: mean(vals),
      min: Math.min.apply(null, vals),
      max: Math.max.apply(null, vals),
      negatives: negatives,
      weak: weak,
      high: high,
      count: vals.length
    };
  }

  function omegaFromCorrelation(R) {
    var fail = function (reason) {
      return {
        omega: null,
        status: 'not_estimable',
        reason: reason,
        method: 'one_factor_pca_correlation',
        extraction: 'principal_component_first_factor',
        uniquenesses: null,
        loadings: null
      };
    };
    if (!R || R.length < 2) return fail('Fewer than two items.');
    if (matrixHasNull(R)) return fail('Correlation matrix is incomplete.');
    var eig;
    try {
      eig = jacobiEigen(R);
    } catch (e) {
      return fail('Eigen decomposition failed.');
    }
    var evals = eig.eigenvalues || [];
    if (!evals.length || evals[0] == null || !isFinite(evals[0]) || evals[0] <= PD_EPS) {
      return fail('First eigenvalue is not positive.');
    }
    var minEig = Math.min.apply(null, evals);
    var notPd = minEig < -PD_EPS;
    var k = R.length;
    var loadings = [];
    var uniquenesses = [];
    var i;
    var lam1 = Math.sqrt(Math.max(0, evals[0]));
    for (i = 0; i < k; i++) {
      var loading = (eig.eigenvectors[i][0] || 0) * lam1;
      if (!isFinite(loading)) return fail('Invalid factor loading.');
      loadings.push(loading);
      var u = 1 - loading * loading;
      uniquenesses.push(u);
    }
    var sign = 0;
    for (i = 0; i < k; i++) sign += loadings[i];
    if (sign < 0) {
      for (i = 0; i < k; i++) loadings[i] = -loadings[i];
    }
    var sumL = 0;
    var sumU = 0;
    var heywood = 0;
    for (i = 0; i < k; i++) {
      sumL += loadings[i];
      var ui = uniquenesses[i];
      if (ui < -0.05) heywood++;
      sumU += Math.max(0, ui);
    }
    var den = (sumL * sumL) + sumU;
    if (!(den > 0)) return fail('Omega denominator is zero.');
    if (notPd) return fail('Correlation matrix is not positive definite.');
    var omega = (sumL * sumL) / den;
    if (!isFinite(omega)) return fail('Omega was not finite.');
    var status = 'estimated';
    var reason = 'McDonald omega total from a one-factor principal-component model on the inter-item correlation matrix. Unique/error variances are 1 − λ².';
    if (heywood) {
      status = 'estimated_with_warning';
      reason += ' One or more uniqueness estimates were negative (Heywood-like).';
    }
    return {
      omega: omega,
      status: status,
      reason: reason,
      method: 'one_factor_pca_correlation',
      extraction: 'principal_component_first_factor',
      uniquenesses: uniquenesses,
      loadings: loadings,
      firstEigenvalue: evals[0],
      notPositiveDefinite: notPd
    };
  }

  function structureFromCov(S) {
    var empty = {
      eigenvalues: [],
      variancePercent: [],
      firstComponentVariance: null,
      firstComponentDominance: null,
      dominantItem: null,
      notPositiveDefinite: false,
      status: 'not_estimable'
    };
    if (!S || S.length < 2 || matrixHasNull(S)) return empty;
    var R = correlationFromCov(S);
    if (matrixHasNull(R)) return empty;
    var eig;
    try {
      eig = jacobiEigen(R);
    } catch (e) {
      return empty;
    }
    var evals = (eig.eigenvalues || []).map(function (v) {
      return Math.max(0, isFinite(v) ? v : 0);
    });
    var total = evals.reduce(function (a, b) { return a + b; }, 0);
    if (!(total > 0)) return empty;
    var pct = evals.map(function (v) { return 100 * v / total; });
    var k = R.length;
    var loadings = [];
    var lam1 = Math.sqrt(Math.max(0, evals[0]));
    var i;
    for (i = 0; i < k; i++) loadings.push((eig.eigenvectors[i][0] || 0) * lam1);
    var absLoad = loadings.map(function (v) { return Math.abs(v); });
    var maxLoad = Math.max.apply(null, absLoad);
    var sumSq = absLoad.reduce(function (a, b) { return a + b * b; }, 0) || 1;
    var maxShare = (maxLoad * maxLoad) / sumSq;
    var dominantIndex = absLoad.indexOf(maxLoad);
    var minEigRaw = Math.min.apply(null, eig.eigenvalues);
    return {
      eigenvalues: evals,
      variancePercent: pct,
      firstComponentVariance: pct[0],
      firstComponentDominance: maxShare,
      dominantItemIndex: dominantIndex,
      notPositiveDefinite: minEigRaw < -PD_EPS,
      status: 'estimated'
    };
  }

  function dropIndex(matrix, idx) {
    return matrix.filter(function (_, i) { return i !== idx; }).map(function (row) {
      return row.filter(function (_, j) { return j !== idx; });
    });
  }

  function itemTotalFromCov(S, i) {
    var k = S.length;
    var j;
    var m;
    var covItemRest = 0;
    for (j = 0; j < k; j++) {
      if (j === i) continue;
      if (S[i][j] == null || !isFinite(S[i][j])) return null;
      covItemRest += S[i][j];
    }
    var varItem = S[i][i];
    var varRest = 0;
    for (j = 0; j < k; j++) {
      if (j === i) continue;
      for (m = 0; m < k; m++) {
        if (m === i) continue;
        if (S[j][m] == null || !isFinite(S[j][m])) return null;
        varRest += S[j][m];
      }
    }
    if (varItem == null || !(varItem > 0) || !(varRest > 0)) return null;
    var r = covItemRest / Math.sqrt(varItem * varRest);
    return isFinite(r) ? r : null;
  }

  function itemFlag(item, overallAlpha, threshold) {
    var r = item.itemTotalCorrelation;
    var aDel = item.alphaIfDeleted;
    if (item.validN != null && item.validN < 2) return 'Insufficient data';
    if (r != null && r < 0) return 'Negative relationship';
    if (r != null && r < threshold) return 'Weak relationship';
    if (aDel != null && overallAlpha != null && aDel > overallAlpha + 0.02 && r != null && r < 0.20) {
      return 'Review reverse coding';
    }
    if (r != null && r > 0.90) return 'Potentially redundant';
    return 'Good';
  }

  function percentile(sorted, p) {
    if (!sorted.length) return null;
    var idx = (sorted.length - 1) * p;
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    var w = idx - lo;
    return sorted[lo] * (1 - w) + sorted[hi] * w;
  }

  function bootstrapCi(rowMatrix, options) {
    var samples = options.bootstrapSamples || 1000;
    var level = options.confidenceLevel || 0.95;
    var rng = options.rng || Math.random;
    var wantOmega = !!options.omega;
    var n = rowMatrix.length;
    var k = rowMatrix[0] ? rowMatrix[0].length : 0;
    if (n < 2 || k < 2) {
      return {
        alpha: { lower: null, upper: null, successful: 0, requested: samples, level: level },
        omega: { lower: null, upper: null, successful: 0, requested: samples, level: level },
        warning: 'Too few respondents for bootstrap resampling.'
      };
    }
    var alphaDraws = [];
    var omegaDraws = [];
    var failed = 0;
    var t;
    var i;
    var r;
    for (t = 0; t < samples; t++) {
      var boot = [];
      for (i = 0; i < n; i++) {
        r = Math.floor(rng() * n);
        if (r >= n) r = n - 1;
        boot.push(rowMatrix[r]);
      }
      var cols = [];
      var j;
      for (j = 0; j < k; j++) {
        cols[j] = [];
        for (i = 0; i < n; i++) cols[j].push(boot[i][j]);
      }
      var cov = covarianceMatrix(cols, false);
      var a = cronbachAlphaFromCov(cov.matrix);
      if (a == null) {
        failed++;
        continue;
      }
      alphaDraws.push(a);
      if (wantOmega) {
        var om = omegaFromCorrelation(correlationFromCov(cov.matrix));
        if (om.omega != null) omegaDraws.push(om.omega);
      }
    }
    alphaDraws.sort(function (a, b) { return a - b; });
    omegaDraws.sort(function (a, b) { return a - b; });
    var tail = (1 - level) / 2;
    var alphaOut = {
      lower: alphaDraws.length ? percentile(alphaDraws, tail) : null,
      upper: alphaDraws.length ? percentile(alphaDraws, 1 - tail) : null,
      successful: alphaDraws.length,
      requested: samples,
      level: level
    };
    var omegaOut = {
      lower: omegaDraws.length ? percentile(omegaDraws, tail) : null,
      upper: omegaDraws.length ? percentile(omegaDraws, 1 - tail) : null,
      successful: omegaDraws.length,
      requested: samples,
      level: level
    };
    var warning = null;
    if (alphaDraws.length < samples * 0.8) {
      warning = 'Too many bootstrap samples failed; interpret the confidence interval cautiously.';
    }
    return { alpha: alphaOut, omega: omegaOut, warning: warning, failed: failed };
  }

  function listwiseRows(itemCols) {
    var n = itemCols[0] ? itemCols[0].length : 0;
    var k = itemCols.length;
    var rows = [];
    var i;
    var j;
    for (i = 0; i < n; i++) {
      var row = [];
      var ok = true;
      for (j = 0; j < k; j++) {
        var v = itemCols[j][i];
        if (v == null) { ok = false; break; }
        row.push(v);
      }
      if (ok) rows.push(row);
    }
    return rows;
  }

  function columnsFromRows(rows, k) {
    var cols = [];
    var j;
    var i;
    for (j = 0; j < k; j++) {
      cols[j] = [];
      for (i = 0; i < rows.length; i++) cols[j].push(rows[i][j]);
    }
    return cols;
  }

  function analyzeGroup(itemNames, itemCols, cfg) {
    var k = itemNames.length;
    var pairwise = cfg.missingMethod === 'pairwise';
    var warnings = [];
    var listwise = listwiseRows(itemCols);
    var nValid = pairwise
      ? (function () {
        var seen = 0;
        var n = itemCols[0] ? itemCols[0].length : 0;
        for (var i = 0; i < n; i++) {
          var any = false;
          for (var j = 0; j < k; j++) if (itemCols[j][i] != null) { any = true; break; }
          if (any) seen++;
        }
        return seen;
      }())
      : listwise.length;

    if (nValid < 2) {
      return { ok: false, error: 'No valid respondents remain.', nValid: nValid };
    }

    var covPack = pairwise
      ? covarianceMatrix(itemCols, true)
      : covarianceMatrix(columnsFromRows(listwise, k), false);

    var zeroVar = [];
    var i;
    for (i = 0; i < k; i++) {
      if (!(covPack.matrix[i][i] > EPS)) zeroVar.push(itemNames[i]);
    }
    if (zeroVar.length) {
      return {
        ok: false,
        error: 'Zero-variance item(s): ' + zeroVar.join(', '),
        nValid: nValid,
        zeroVarianceItems: zeroVar
      };
    }

    var R = correlationFromCov(covPack.matrix);
    var alpha = cronbachAlphaFromCov(covPack.matrix);
    var stdAlpha = standardizedAlphaFromR(R);
    var inter = averageOffDiagonal(R);
    var omegaPack = omegaFromCorrelation(R);
    var structure = structureFromCov(covPack.matrix);

    var items = [];
    for (i = 0; i < k; i++) {
      var col = pairwise ? itemCols[i].filter(function (v) { return v != null; }) : columnsFromRows(listwise, k)[i];
      var reduced = dropIndex(covPack.matrix, i);
      var alphaDel = k > 2 ? cronbachAlphaFromCov(reduced) : null;
      var omegaDel = null;
      var omegaDelStatus = 'not_requested';
      if (cfg.itemDiagnostics.omegaIfDeleted && k > 2) {
        var omDel = omegaFromCorrelation(correlationFromCov(reduced));
        omegaDel = omDel.omega;
        omegaDelStatus = omDel.status;
      }
      var item = {
        item: itemNames[i],
        mean: finiteOrNull(mean(col)),
        sd: finiteOrNull(sampleSd(col)),
        validN: col.length,
        itemTotalCorrelation: itemTotalFromCov(covPack.matrix, i),
        alphaIfDeleted: alphaDel,
        omegaIfDeleted: omegaDel,
        omegaIfDeletedStatus: omegaDelStatus
      };
      item.flag = itemFlag(item, alpha, cfg.weakItemThreshold);
      items.push(item);
    }

    var pairNs = [];
    covPack.pairwiseN.forEach(function (row) {
      row.forEach(function (nn, j, arr) {
        if (j > 0 || arr.length) {
          /* collect off-diagonal */
        }
      });
    });
    for (i = 0; i < k; i++) {
      for (var j = i + 1; j < k; j++) pairNs.push(covPack.pairwiseN[i][j]);
    }
    var minPair = pairNs.length ? Math.min.apply(null, pairNs) : nValid;
    var maxPair = pairNs.length ? Math.max.apply(null, pairNs) : nValid;
    if (pairwise && maxPair - minPair >= Math.max(5, 0.1 * maxPair)) {
      warnings.push({
        code: 'pairwise_n_differs',
        message: 'Pairwise deletion produces materially different pairwise sample sizes (N from ' + minPair + ' to ' + maxPair + ').'
      });
    }
    if (structure.notPositiveDefinite) {
      warnings.push({
        code: 'matrix_not_pd',
        message: 'The covariance or correlation matrix is singular or not positive definite.'
      });
    }
    if (omegaPack.status !== 'estimated' && omegaPack.status !== 'estimated_with_warning') {
      warnings.push({
        code: 'omega_failed',
        message: 'Omega cannot be estimated reliably. ' + (omegaPack.reason || '')
      });
    } else if (omegaPack.status === 'estimated_with_warning') {
      warnings.push({
        code: 'omega_heywood',
        message: omegaPack.reason
      });
    }
    if (alpha != null && alpha < 0) {
      warnings.push({
        code: 'negative_alpha',
        message: 'Negative alpha indicates that items are negatively related on average. Check item direction, reverse coding, and whether the items belong to one scale.'
      });
    }
    if (inter.mean != null && inter.mean < 0) {
      warnings.push({
        code: 'negative_average_r',
        message: 'Average inter-item correlation is negative.'
      });
    }
    var negItemTotal = items.filter(function (it) { return it.itemTotalCorrelation != null && it.itemTotalCorrelation < 0; });
    if (negItemTotal.length) {
      warnings.push({
        code: 'negative_item_total',
        message: 'One or more items have negative corrected item–total correlations: ' + negItemTotal.map(function (it) { return it.item; }).join(', ') + '.'
      });
    }
    if (structure.firstComponentDominance != null && structure.firstComponentDominance >= 0.70 && structure.dominantItemIndex != null) {
      warnings.push({
        code: 'item_dominates_pc1',
        message: 'One item dominates the first principal component (' + itemNames[structure.dominantItemIndex] + ').'
      });
    }

    var weakest = items.slice().sort(function (a, b) {
      var ra = a.itemTotalCorrelation;
      var rb = b.itemTotalCorrelation;
      if (ra == null && rb == null) return 0;
      if (ra == null) return 1;
      if (rb == null) return -1;
      return ra - rb;
    })[0] || null;

    return {
      ok: true,
      nValid: nValid,
      nListwise: listwise.length,
      itemCount: k,
      alpha: alpha,
      standardizedAlpha: stdAlpha,
      omegaTotal: omegaPack.omega,
      omegaStatus: omegaPack.status,
      omegaMeta: {
        method: omegaPack.method,
        extraction: omegaPack.extraction,
        reason: omegaPack.reason
      },
      averageInterItemCorrelation: inter.mean,
      interItem: inter,
      items: items,
      correlationMatrix: R,
      covarianceMatrix: covPack.matrix,
      pairwiseN: covPack.pairwiseN,
      structure: Object.assign({}, structure, {
        dominantItem: structure.dominantItemIndex != null ? itemNames[structure.dominantItemIndex] : null
      }),
      warnings: warnings,
      listwiseRows: listwise,
      weakestItem: weakest
    };
  }

  function sanitizeTree(node) {
    if (Array.isArray(node)) {
      return node.map(sanitizeTree);
    }
    if (node && typeof node === 'object') {
      var out = {};
      Object.keys(node).forEach(function (k) {
        if (k === 'listwiseRows' || k === 'covarianceMatrix') return;
        out[k] = sanitizeTree(node[k]);
      });
      return out;
    }
    if (typeof node === 'number' && !isFinite(node)) return null;
    return node;
  }

  function analyze(headers, rows, userConfig) {
    var cfg = defaultConfig(userConfig);
    var errors = [];
    var warnings = [];
    var itemNames = (cfg.items || []).map(function (n) { return String(n); });
    if (itemNames.length < 2) {
      errors.push({
        code: 'too_few_items',
        message: 'Reliability requires multiple items intended to measure the same construct.'
      });
    }

    var reverseNames = (cfg.reverseItems || []).map(function (n) { return String(n); });
    reverseNames.forEach(function (name) {
      if (itemNames.indexOf(name) < 0) {
        errors.push({
          code: 'reverse_not_in_scale',
          message: 'Reverse-coded variable "' + name + '" is not included in Scale items.'
        });
      }
    });

    if (cfg.groupVariable && itemNames.indexOf(String(cfg.groupVariable)) >= 0) {
      errors.push({
        code: 'group_is_item',
        message: 'The group variable cannot also be a scale item.'
      });
    }

    var scoreRange = cfg.scoreRange && typeof cfg.scoreRange === 'object' ? cfg.scoreRange : null;
    if (scoreRange && !(asNumber(scoreRange.min) < asNumber(scoreRange.max))) {
      errors.push({
        code: 'invalid_score_range',
        message: 'Minimum possible score must be smaller than maximum possible score.'
      });
    }

    var itemIdx = itemNames.map(function (name) { return headerIndex(headers, name); });
    itemIdx.forEach(function (idx, i) {
      if (idx < 0) {
        errors.push({
          code: 'missing_column',
          message: 'Scale item "' + itemNames[i] + '" was not found in the data.'
        });
      }
    });

    var groupIdx = cfg.groupVariable ? headerIndex(headers, cfg.groupVariable) : -1;
    if (cfg.groupVariable && groupIdx < 0) {
      errors.push({
        code: 'missing_group',
        message: 'Grouping variable "' + cfg.groupVariable + '" was not found in the data.'
      });
    }

    var analysisConfig = {
      module: MODULE_ID,
      items: itemNames.slice(),
      reverseItems: reverseNames.slice(),
      scoreRange: scoreRange ? { min: asNumber(scoreRange.min), max: asNumber(scoreRange.max) } : null,
      groupVariable: cfg.groupVariable || null,
      missingMethod: cfg.missingMethod === 'pairwise' ? 'pairwise' : 'listwise',
      confidenceLevel: cfg.confidenceLevel,
      bootstrapSamples: cfg.bootstrapSamples,
      weakItemThreshold: cfg.weakItemThreshold,
      coefficients: clone(cfg.coefficients)
    };

    if (errors.length) {
      return {
        ok: false,
        blocking: true,
        errors: errors,
        warnings: warnings,
        analysisConfig: analysisConfig,
        observedResults: null,
        aiPackage: buildAiPackage(analysisConfig, null, warnings, errors)
      };
    }

    var nOriginal = Array.isArray(rows) ? rows.length : 0;
    var rawCols = itemNames.map(function () { return []; });
    var groupValues = [];
    var r;
    var c;
    for (r = 0; r < nOriginal; r++) {
      var row = rows[r] || [];
      for (c = 0; c < itemNames.length; c++) {
        rawCols[c].push(asNumber(row[itemIdx[c]]));
      }
      groupValues.push(groupIdx >= 0 ? row[groupIdx] : null);
    }

    var suspicious = itemNames.filter(isSuspiciousName);
    if (suspicious.length) {
      warnings.push({
        code: 'suspicious_names',
        message: 'These columns may not be questionnaire items. Reliability analysis should contain items intended to measure the same construct.',
        columns: suspicious
      });
    }

    if (itemNames.length < 3) {
      warnings.push({
        code: 'few_items',
        message: 'Fewer than 3 items are selected. Three or more items are preferable for a multi-item scale.'
      });
    }

    var analysisCols = rawCols.map(function (col, ci) {
      var name = itemNames[ci];
      var shouldReverse = reverseNames.indexOf(name) >= 0;
      if (!shouldReverse) return col.slice();
      var min = scoreRange ? asNumber(scoreRange.min) : null;
      var max = scoreRange ? asNumber(scoreRange.max) : null;
      if (min == null || max == null) {
        var inferred = inferScoreRange(col);
        if (inferred) {
          min = inferred.min;
          max = inferred.max;
        }
      }
      return col.map(function (v) {
        if (v == null) return null;
        return reverseValue(v, min, max);
      });
    });

    if (reverseNames.length && scoreRange) {
      var minS = asNumber(scoreRange.min);
      var maxS = asNumber(scoreRange.max);
      reverseNames.forEach(function (name) {
        var ci = itemNames.indexOf(name);
        var outside = 0;
        var seen = 0;
        rawCols[ci].forEach(function (v) {
          if (v == null) return;
          seen++;
          if (v < minS - EPS || v > maxS + EPS) outside++;
        });
        if (seen && outside === seen) {
          errors.push({
            code: 'reverse_out_of_range',
            message: 'All values for reverse-coded item "' + name + '" fall outside the declared score range.'
          });
        } else if (outside) {
          warnings.push({
            code: 'some_out_of_range',
            message: 'Some values for "' + name + '" fall outside the declared score range.'
          });
        }
      });
    }

    var ranges = itemNames.map(function (name, ci) {
      var nums = rawCols[ci].filter(function (v) { return v != null; });
      if (!nums.length) return null;
      return Math.max.apply(null, nums) - Math.min.apply(null, nums);
    }).filter(function (v) { return v != null && v > 0; });
    if (ranges.length >= 2) {
      var rMin = Math.min.apply(null, ranges);
      var rMax = Math.max.apply(null, ranges);
      if (rMin > 0 && rMax / rMin >= 8) {
        warnings.push({
          code: 'mixed_ranges',
          message: 'Selected variables have extremely different ranges or apparent measurement units.'
        });
      }
    }

    if (errors.length) {
      return {
        ok: false,
        blocking: true,
        errors: errors,
        warnings: warnings,
        analysisConfig: analysisConfig,
        observedResults: null,
        aiPackage: buildAiPackage(analysisConfig, null, warnings, errors)
      };
    }

    var core = analyzeGroup(itemNames, analysisCols, cfg);
    if (!core.ok) {
      errors.push({ code: 'analysis_failed', message: core.error || 'Reliability could not be estimated.' });
      if (core.zeroVarianceItems) {
        errors.push({
          code: 'zero_variance',
          message: 'One or more selected items have zero variance: ' + core.zeroVarianceItems.join(', ') + '.'
        });
      }
      return {
        ok: false,
        blocking: true,
        errors: errors,
        warnings: warnings,
        analysisConfig: analysisConfig,
        observedResults: {
          nOriginal: nOriginal,
          nValid: core.nValid || 0,
          itemCount: itemNames.length,
          alpha: null,
          omegaTotal: null,
          omegaStatus: 'not_estimable'
        },
        aiPackage: buildAiPackage(analysisConfig, null, warnings, errors)
      };
    }

    if (core.nValid < 30) {
      warnings.push({
        code: 'small_n',
        message: 'Total valid N is below 30. Reliability estimates are unstable in small samples.'
      });
    }
    warnings = warnings.concat(core.warnings || []);

    var ci = {
      alpha: null,
      omega: null
    };
    if (cfg.coefficients.confidenceInterval) {
      var rng = cfg.rngSeed != null ? mulberry32(cfg.rngSeed) : Math.random;
      var bootRows = core.listwiseRows;
      if (bootRows && bootRows.length >= 2) {
        var boot = bootstrapCi(bootRows, {
          bootstrapSamples: cfg.bootstrapSamples,
          confidenceLevel: cfg.confidenceLevel,
          omega: cfg.coefficients.omegaTotal,
          rng: rng
        });
        ci.alpha = boot.alpha;
        ci.omega = boot.omega;
        if (boot.warning) warnings.push({ code: 'bootstrap_failures', message: boot.warning });
      }
    }

    var groups = [];
    if (groupIdx >= 0) {
      var buckets = {};
      for (r = 0; r < nOriginal; r++) {
        var gv = groupValues[r];
        if (isBlank(gv)) continue;
        var key = String(gv).trim();
        if (!buckets[key]) buckets[key] = itemNames.map(function () { return []; });
        for (c = 0; c < itemNames.length; c++) buckets[key][c].push(analysisCols[c][r]);
      }
      Object.keys(buckets).sort().forEach(function (key) {
        var g = analyzeGroup(itemNames, buckets[key], cfg);
        var status = 'ok';
        var gWarnings = [];
        if (!g.ok) {
          status = 'not_estimable';
          gWarnings.push(g.error || 'Coefficient not estimable');
        } else {
          if (g.nValid < 20) {
            status = 'small_sample';
            gWarnings.push('Small group sample');
          }
          gWarnings = gWarnings.concat((g.warnings || []).map(function (w) { return w.message; }));
        }
        groups.push({
          group: key,
          validN: g.nValid || 0,
          itemCount: itemNames.length,
          alpha: g.ok ? g.alpha : null,
          alphaCI: null,
          omega: g.ok ? g.omegaTotal : null,
          averageInterItemCorrelation: g.ok ? g.averageInterItemCorrelation : null,
          status: status,
          warnings: gWarnings
        });
      });
    }

    if (cfg.coefficients.confidenceInterval && groups.length) {
      groups.forEach(function (g) {
        /* Group CIs are omitted unless listwise N is large enough; filled below when we re-run. */
      });
      Object.keys((function () {
        var buckets = {};
        for (r = 0; r < nOriginal; r++) {
          var gv2 = groupValues[r];
          if (isBlank(gv2)) continue;
          var key2 = String(gv2).trim();
          if (!buckets[key2]) buckets[key2] = [];
          var row2 = [];
          var ok2 = true;
          for (c = 0; c < itemNames.length; c++) {
            if (analysisCols[c][r] == null) { ok2 = false; break; }
            row2.push(analysisCols[c][r]);
          }
          if (ok2) buckets[key2].push(row2);
        }
        return buckets;
      }())).forEach(function (key) {
        /* handled below */
      });
    }

    if (cfg.coefficients.confidenceInterval) {
      var groupBuckets = {};
      for (r = 0; r < nOriginal; r++) {
        if (groupIdx < 0) break;
        var gvx = groupValues[r];
        if (isBlank(gvx)) continue;
        var gk = String(gvx).trim();
        if (!groupBuckets[gk]) groupBuckets[gk] = [];
        var grow = [];
        var gok = true;
        for (c = 0; c < itemNames.length; c++) {
          if (analysisCols[c][r] == null) { gok = false; break; }
          grow.push(analysisCols[c][r]);
        }
        if (gok) groupBuckets[gk].push(grow);
      }
      groups.forEach(function (g) {
        var mat = groupBuckets[g.group];
        if (!mat || mat.length < 8) return;
        var gBoot = bootstrapCi(mat, {
          bootstrapSamples: Math.min(500, cfg.bootstrapSamples || 500),
          confidenceLevel: cfg.confidenceLevel,
          omega: false,
          rng: cfg.rngSeed != null ? mulberry32(cfg.rngSeed + g.group.length) : Math.random
        });
        g.alphaCI = {
          lower: gBoot.alpha.lower,
          upper: gBoot.alpha.upper,
          level: cfg.confidenceLevel,
          successful: gBoot.alpha.successful
        };
      });
    }

    var observed = {
      nOriginal: nOriginal,
      nValid: core.nValid,
      nListwise: core.nListwise,
      itemCount: itemNames.length,
      alpha: core.alpha,
      alphaCI: ci.alpha ? {
        lower: ci.alpha.lower,
        upper: ci.alpha.upper,
        level: ci.alpha.level,
        successful: ci.alpha.successful,
        requested: ci.alpha.requested
      } : null,
      standardizedAlpha: cfg.coefficients.standardizedAlpha ? core.standardizedAlpha : core.standardizedAlpha,
      omegaTotal: core.omegaTotal,
      omegaStatus: core.omegaStatus,
      omegaCI: ci.omega && core.omegaTotal != null ? {
        lower: ci.omega.lower,
        upper: ci.omega.upper,
        level: ci.omega.level,
        successful: ci.omega.successful,
        requested: ci.omega.requested
      } : null,
      omegaMeta: core.omegaMeta,
      averageInterItemCorrelation: core.averageInterItemCorrelation,
      interItem: core.interItem,
      items: core.items,
      correlationMatrix: core.correlationMatrix,
      pairwiseN: core.pairwiseN,
      structure: core.structure,
      groups: groups,
      warnings: warnings,
      missingMethod: analysisConfig.missingMethod,
      weakestItem: core.weakestItem,
      alphaBand: alphaBand(core.alpha)
    };

    var result = {
      ok: true,
      blocking: false,
      errors: [],
      warnings: warnings,
      analysisConfig: analysisConfig,
      observedResults: sanitizeTree(observed),
      aiPackage: null
    };
    result.aiPackage = buildAiPackage(analysisConfig, result.observedResults, warnings, []);
    return result;
  }

  function buildAiPackage(config, observed, warnings, errors) {
    return {
      module: MODULE_NAME,
      subtitle: MODULE_SUBTITLE,
      guidance: [
        'Do not treat .70 as an absolute pass/fail rule; bands are rough conventions.',
        'Mention sample size and uncertainty, including confidence intervals when available.',
        'Distinguish reliability from validity: internal consistency is not evidence that the scale measures the intended construct.',
        'Distinguish reliability from unidimensionality: coefficients do not establish a single dimension.',
        'Do not recommend deleting an item solely because alpha-if-deleted increases; content validity matters.',
        'Identify possible reverse-coded items when item–total correlations are negative.',
        'Mention possible redundancy when reliability is extremely high (.90+).',
        'Never describe unrelated columns (IDs, years, weights, standard errors, effect sizes) as a valid psychological or survey scale.'
      ],
      analysisConfig: config,
      observedResults: observed,
      warnings: warnings || [],
      errors: errors || []
    };
  }

  function makeLatentRow(rng, theta, loadings, reverseIndex, weakIndex) {
    var row = [];
    for (var i = 0; i < loadings.length; i++) {
      var noise = (rng() - 0.5) * (i === weakIndex ? 3.2 : 0.9);
      var raw = 3 + loadings[i] * theta + noise;
      var v = Math.max(1, Math.min(5, Math.round(raw)));
      if (i === reverseIndex) v = 6 - v;
      row.push(v);
    }
    return row;
  }

  function demoLikertScale(options) {
    options = options || {};
    var n = options.n || 150;
    var seed = options.seed == null ? 42 : options.seed;
    var rng = mulberry32(seed);
    var headers = ['ID', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Site'];
    var sites = ['North', 'South', 'West'];
    var rows = [];
    var i;
    for (i = 0; i < n; i++) {
      var theta = (rng() + rng() + rng() + rng() - 2) * 0.9;
      var items = makeLatentRow(rng, theta, [1.1, 1.0, 0.95, 1.05, 0.9, 1.0, 1.05, 0.15], 6, 7);
      if (rng() < 0.06) items[2] = '';
      if (rng() < 0.04) items[5] = '';
      rows.push([i + 1].concat(items).concat([sites[i % 3]]));
    }
    return {
      headers: headers,
      rows: rows,
      suggestedConfig: {
        items: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'],
        reverseItems: ['Q7'],
        scoreRange: { min: 1, max: 5 },
        groupVariable: 'Site',
        missingMethod: 'listwise'
      },
      notes: {
        reverseItem: 'Q7',
        weakItem: 'Q8',
        groupVariable: 'Site'
      }
    };
  }

  function demoUnsuitableMeta() {
    return {
      headers: ['Study', 'Year', 'Effect_yi', 'SE_yi', 'Variance', 'IV_Weight'],
      rows: [
        ['A', 2014, 0.21, 0.08, 0.0064, 156.25],
        ['B', 2016, 0.05, 0.11, 0.0121, 82.64],
        ['C', 2018, 0.33, 0.09, 0.0081, 123.46],
        ['D', 2019, -0.04, 0.12, 0.0144, 69.44],
        ['E', 2021, 0.18, 0.07, 0.0049, 204.08],
        ['F', 2022, 0.27, 0.10, 0.0100, 100.00],
        ['G', 2023, 0.12, 0.06, 0.0036, 277.78]
      ],
      suggestedConfig: {
        items: ['Year', 'Effect_yi', 'SE_yi', 'Variance', 'IV_Weight'],
        reverseItems: [],
        groupVariable: null,
        missingMethod: 'listwise'
      }
    };
  }

  return {
    MODULE_ID: MODULE_ID,
    MODULE_NAME: MODULE_NAME,
    MODULE_SUBTITLE: MODULE_SUBTITLE,
    defaultConfig: defaultConfig,
    analyze: analyze,
    cronbachAlphaFromCov: cronbachAlphaFromCov,
    standardizedAlphaFromR: standardizedAlphaFromR,
    omegaFromCorrelation: omegaFromCorrelation,
    covarianceMatrix: covarianceMatrix,
    correlationFromCov: correlationFromCov,
    reverseValue: reverseValue,
    inferScoreRange: inferScoreRange,
    isSuspiciousName: isSuspiciousName,
    alphaBand: alphaBand,
    finiteOrNull: finiteOrNull,
    demoLikertScale: demoLikertScale,
    demoUnsuitableMeta: demoUnsuitableMeta,
    jacobiEigen: jacobiEigen
  };
});
