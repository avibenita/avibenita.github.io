/**
 * Sampling intervals for overall Pp and Ppk.
 * Pp uses the chi-square interval for an independent normal sample:
 *   lower = Pp × √(χ²(0.025, n−1) / (n−1))
 *   upper = Pp × √(χ²(0.975, n−1) / (n−1))
 * where χ²(p, ν) is the lower-tail quantile.
 * Ppk, for n ≥ 25, uses the normal approximation
 *   SE = √[1/(9n) + Ppk² / (2(n−1))]
 *   two-sided: Ppk ± Φ⁻¹(0.975) × SE
 *   one-sided lower: Ppk − Φ⁻¹(0.95) × SE
 * Negative bounds are kept. An eligible n is not evidence of stability,
 * normality, or independence.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StatisticoCapabilityIntervals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MIN_PPK_N = 25;
  var PPK_UNAVAILABLE = 'Ppk interval unavailable for this method with fewer than 25 observations.';

  function normalInv(p) {
    if (!(p > 0) || !(p < 1)) return p <= 0 ? -Infinity : Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var plow = 0.02425;
    var q;
    var r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - plow) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
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
    var a = c[0];
    var t = x + g + 0.5;
    var i;
    for (i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  function gammaLower(a, x) {
    var gln = logGamma(a);
    if (!(x > 0)) return 0;
    if (x < a + 1) {
      var ap = a;
      var sum = 1 / a;
      var del = sum;
      var n;
      for (n = 0; n < 500; n++) {
        ap += 1;
        del *= x / ap;
        sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
      }
      return Math.min(1, Math.max(0, sum * Math.exp(-x + a * Math.log(x) - gln)));
    }
    var fpmin = 1e-300;
    var b = x + 1 - a;
    var c1 = 1 / fpmin;
    var d1 = 1 / b;
    var h = d1;
    var i2;
    for (i2 = 1; i2 <= 500; i2++) {
      var an = -i2 * (i2 - a);
      b += 2;
      d1 = an * d1 + b;
      if (Math.abs(d1) < fpmin) d1 = fpmin;
      c1 = b + an / c1;
      if (Math.abs(c1) < fpmin) c1 = fpmin;
      d1 = 1 / d1;
      var delta = d1 * c1;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-15) break;
    }
    var upper = Math.exp(-x + a * Math.log(x) - gln) * h;
    return Math.min(1, Math.max(0, 1 - upper));
  }

  function chiSquareCdf(x, df) {
    if (!(df > 0)) return NaN;
    if (!(x > 0)) return 0;
    return gammaLower(df / 2, x / 2);
  }

  function chiSquareQuantile(p, df) {
    if (!(p > 0) || !(p < 1) || !(df > 0)) return NaN;
    var z = normalInv(p);
    var h = 2 / (9 * df);
    var wilson = df * Math.pow(Math.max(1e-8, 1 - h + z * Math.sqrt(h)), 3);
    if (!Number.isFinite(wilson) || !(wilson > 0)) wilson = df;
    var lo = Math.min(wilson * 0.25, df * 0.01);
    var hi = Math.max(wilson * 4, df + 8 * Math.sqrt(2 * df));
    var guard = 0;
    while (chiSquareCdf(lo, df) > p && lo > 1e-18 && guard < 80) {
      lo *= 0.5;
      guard += 1;
    }
    guard = 0;
    while (chiSquareCdf(hi, df) < p && guard < 80) {
      hi *= 1.5;
      guard += 1;
    }
    var i;
    for (i = 0; i < 80; i++) {
      var mid = 0.5 * (lo + hi);
      if (chiSquareCdf(mid, df) < p) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  function ppInterval(pp, n) {
    var nu = n - 1;
    if (!Number.isFinite(pp) || !(n >= 2) || !(nu > 0)) {
      return { available: false, reason: 'unavailable' };
    }
    var lowQ = chiSquareQuantile(0.025, nu);
    var highQ = chiSquareQuantile(0.975, nu);
    if (!(lowQ > 0) || !(highQ > 0)) return { available: false, reason: 'unavailable' };
    return {
      available: true,
      level: 0.95,
      method: 'chi-square',
      low: pp * Math.sqrt(lowQ / nu),
      high: pp * Math.sqrt(highQ / nu)
    };
  }

  function ppkInterval(ppk, n) {
    if (!Number.isFinite(ppk) || !(n >= 2)) return { available: false, reason: 'unavailable' };
    if (n < MIN_PPK_N) {
      return { available: false, reason: 'n', message: PPK_UNAVAILABLE, minN: MIN_PPK_N };
    }
    var se = Math.sqrt((1 / (9 * n)) + ((ppk * ppk) / (2 * (n - 1))));
    var zTwo = normalInv(0.975);
    var zOne = normalInv(0.95);
    if (!Number.isFinite(se) || !Number.isFinite(zTwo) || !Number.isFinite(zOne)) {
      return { available: false, reason: 'unavailable' };
    }
    return {
      available: true,
      level: 0.95,
      method: 'normal-approximation',
      se: se,
      low: ppk - zTwo * se,
      high: ppk + zTwo * se,
      oneSidedLow: ppk - zOne * se,
      minN: MIN_PPK_N
    };
  }

  function twoSidedVerdict(low, high, benchmark) {
    if (!(benchmark > 0) || !Number.isFinite(benchmark) || !Number.isFinite(low) || !Number.isFinite(high)) return null;
    if (low >= benchmark) return 'supports';
    if (high < benchmark) return 'below';
    return 'inconclusive';
  }

  function oneSidedSupports(lower, benchmark) {
    if (!(benchmark > 0) || !Number.isFinite(benchmark) || !Number.isFinite(lower)) return null;
    return lower >= benchmark;
  }

  function rounded(n, digits) {
    return Number(n.toFixed(digits));
  }

  function formatPair(low, high, benchmark, verdict) {
    var digits = 2;
    function consistent(d) {
      if (!verdict || !Number.isFinite(benchmark)) return true;
      var a = rounded(low, d);
      var b = rounded(high, d);
      var g = rounded(benchmark, d);
      if (verdict === 'supports') return a >= g;
      if (verdict === 'below') return b < g;
      return !(a >= g) && !(b < g);
    }
    while (digits < 6 && !consistent(digits)) digits += 1;
    return rounded(low, digits).toFixed(digits) + '\u2013' + rounded(high, digits).toFixed(digits);
  }

  function formatBound(value, benchmark, supports) {
    var digits = 2;
    function consistent(d) {
      if (supports == null || !Number.isFinite(benchmark)) return true;
      var shown = rounded(value, d);
      var g = rounded(benchmark, d);
      return supports ? shown >= g : shown < g;
    }
    while (digits < 6 && !consistent(digits)) digits += 1;
    return rounded(value, digits).toFixed(digits);
  }

  return {
    MIN_PPK_N: MIN_PPK_N,
    PPK_UNAVAILABLE: PPK_UNAVAILABLE,
    normalInv: normalInv,
    chiSquareQuantile: chiSquareQuantile,
    ppInterval: ppInterval,
    ppkInterval: ppkInterval,
    twoSidedVerdict: twoSidedVerdict,
    oneSidedSupports: oneSidedSupports,
    formatPair: formatPair,
    formatBound: formatBound
  };
});
