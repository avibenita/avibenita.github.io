/**
 * Classical mean confidence interval and sample-size projection.
 *
 * Sample SD is the unbiased estimator (denominator n − 1).
 * Finite-population correction, when N is a fixed population sampled
 * without replacement, multiplies the standard error by sqrt((N − n) / N).
 * At n = N the sampling margin is exactly 0.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ConfidencePrecision = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var LANCZOS = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  function logGamma(z) {
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    var x = 0.99999999999980993;
    for (var i = 0; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i + 1);
    var t = z + LANCZOS.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function betacf(a, b, x) {
    var MAX = 200;
    var EPS = 3e-14;
    var FPMIN = 1e-30;
    var qab = a + b;
    var qap = a + 1;
    var qam = a - 1;
    var c = 1;
    var d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAX; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  function regularizedIncompleteBeta(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    if (x < (a + 1) / (a + b + 2)) {
      var front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta);
      return front * betacf(a, b, x) / a;
    }
    var back = Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lnBeta);
    return 1 - back * betacf(b, a, 1 - x) / b;
  }

  function studentTTwoSidedP(t, df) {
    if (!(t >= 0) || !(df > 0)) return NaN;
    if (t === 0) return 1;
    var x = df / (df + t * t);
    return regularizedIncompleteBeta(df / 2, 0.5, x);
  }

  /** Upper quantile of Student's t. probability 0.975, df 99 → about 1.984217. */
  function studentTQuantile(probability, df) {
    if (!(probability > 0) || !(probability < 1) || !(df > 0)) return NaN;
    var targetTwoSided = 2 * (1 - probability);
    if (targetTwoSided >= 1) return 0;
    var lo = 0;
    var hi = 1;
    var guard = 0;
    while (studentTTwoSidedP(hi, df) > targetTwoSided && guard < 60) {
      hi *= 2;
      guard += 1;
    }
    for (var i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2;
      if (studentTTwoSidedP(mid, df) > targetTwoSided) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /**
   * Margin of error for a classical mean.
   * N null means no finite-population correction.
   * ns === N returns 0.
   */
  function marginOfError(ns, confidence, s, N) {
    if (!(ns >= 2) || !isFinite(ns) || !isFinite(confidence) || !isFinite(s) || s < 0) return NaN;
    if (N != null && (!(N >= ns))) return NaN;
    if (s === 0) return 0;
    if (N != null && ns === N) return 0;
    var t = studentTQuantile((1 + confidence) / 2, ns - 1);
    var margin = t * s / Math.sqrt(ns);
    if (N != null) margin *= Math.sqrt((N - ns) / N);
    return margin;
  }

  function scenarioMaximum(n0, N) {
    if (N != null) return N;
    return Math.max(1000000, n0);
  }

  /**
   * Smallest integer n >= n0 whose margin is at most target.
   * status: met | solved | unattainable
   */
  function requiredSampleSize(n0, confidence, s, N, target) {
    var limit = scenarioMaximum(n0, N);
    var atCurrent = marginOfError(n0, confidence, s, N);
    if (atCurrent <= target) return { status: 'met', n: n0, maximum: limit };
    var atLimit = marginOfError(limit, confidence, s, N);
    if (!(atLimit <= target)) return { status: 'unattainable', n: null, maximum: limit };
    var lo = n0;
    var hi = limit;
    while (lo + 1 < hi) {
      var mid = Math.floor((lo + hi) / 2);
      if (marginOfError(mid, confidence, s, N) <= target) hi = mid;
      else lo = mid;
    }
    return { status: 'solved', n: hi, maximum: limit };
  }

  function parsePopulation(raw, n0) {
    var text = String(raw == null ? '' : raw).trim();
    if (!text) return { ok: true, N: null };
    if (!/^[0-9]+$/.test(text)) {
      return { ok: false, N: null, reason: 'Population size must be a whole number at least as large as the sample (' + n0 + ').' };
    }
    var N = parseInt(text, 10);
    if (!(N >= n0)) {
      return { ok: false, N: null, reason: 'Population size must be a whole number at least as large as the sample (' + n0 + ').' };
    }
    return { ok: true, N: N };
  }

  function parseScenarioN(raw, minN, maxN) {
    var text = String(raw == null ? '' : raw).trim();
    if (!/^[0-9]+$/.test(text)) {
      return { ok: false, reason: 'Enter a whole number from ' + minN + ' to ' + maxN + '.' };
    }
    var n = parseInt(text, 10);
    if (n < minN || n > maxN) {
      return { ok: false, n: n, reason: 'Enter a whole number from ' + minN + ' to ' + maxN + '.' };
    }
    return { ok: true, n: n };
  }

  function sliderToN(position, minN, maxN) {
    if (!(maxN > minN)) return minN;
    var p = Math.min(1, Math.max(0, position));
    var value = Math.exp(Math.log(minN) + p * (Math.log(maxN) - Math.log(minN)));
    return Math.min(maxN, Math.max(minN, Math.round(value)));
  }

  function nToSlider(n, minN, maxN) {
    if (!(maxN > minN)) return 0;
    var clamped = Math.min(maxN, Math.max(minN, n));
    return (Math.log(clamped) - Math.log(minN)) / (Math.log(maxN) - Math.log(minN));
  }

  function widthChange(currentWidth, scenarioWidth) {
    if (!(currentWidth > 0) || !isFinite(scenarioWidth)) {
      return { text: '', comparable: false };
    }
    var pct = 100 * (scenarioWidth / currentWidth - 1);
    if (Math.abs(pct) < 0.05) return { text: 'Unchanged', comparable: true, percent: pct };
    var abs = Math.abs(pct);
    var shown = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
    return {
      text: shown + '% ' + (pct < 0 ? 'narrower' : 'wider'),
      comparable: true,
      percent: pct
    };
  }

  return {
    studentTQuantile: studentTQuantile,
    studentTTwoSidedP: studentTTwoSidedP,
    marginOfError: marginOfError,
    requiredSampleSize: requiredSampleSize,
    scenarioMaximum: scenarioMaximum,
    parsePopulation: parsePopulation,
    parseScenarioN: parseScenarioN,
    sliderToN: sliderToN,
    nToSlider: nToSlider,
    widthChange: widthChange
  };
});
