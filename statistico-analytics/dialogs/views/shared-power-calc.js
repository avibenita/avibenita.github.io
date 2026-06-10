/**
 * Shared Cohen f² / noncentral-F power calculations (linear & logistic omnibus tests).
 */
(function (global) {
  'use strict';

  function f2FromR2(r2) {
    if (!isFinite(r2) || r2 <= 0) return 0;
    if (r2 >= 1) return Infinity;
    return r2 / (1 - r2);
  }

  function r2FromF2(f2) {
    if (!isFinite(f2) || f2 <= 0) return 0;
    return f2 / (1 + f2);
  }

  function cohenMagnitude(f2) {
    if (!isFinite(f2) || f2 <= 0) return '';
    if (f2 < 0.02) return 'negligible';
    if (f2 < 0.15) return 'small';
    if (f2 < 0.35) return 'medium';
    return 'large';
  }

  function buildContext(n, p, r2, alpha, withIntercept) {
    alpha = alpha != null ? alpha : 0.05;
    withIntercept = withIntercept !== false;
    if (!n || n < 3 || !p || p < 1 || !isFinite(r2) || r2 < 0) return null;
    var f2 = f2FromR2(r2);
    var df1 = p;
    var df2 = withIntercept ? (n - p - 1) : (n - p);
    if (df2 < 1) return null;
    return { n: n, p: p, r2: r2, f2: f2, alpha: alpha, withIntercept: withIntercept, df1: df1, df2: df2 };
  }

  function noncentralFCdf(f, df1, df2, ncp) {
    if (!isFinite(f) || f <= 0 || !df1 || !df2 || df1 <= 0 || df2 <= 0) return 0;
    if (typeof jStat === 'undefined' || !jStat.centralF || !jStat.beta || !jStat.beta.cdf) {
      return jStat.centralF.cdf(f, df1, df2);
    }
    if (!ncp || ncp <= 0) return jStat.centralF.cdf(f, df1, df2);
    var bx = (f * df1) / (f * df1 + df2);
    var b0 = df2 / 2;
    var sum = 0;
    var w = Math.exp(-ncp / 2);
    for (var j = 0; j < 300; j++) {
      if (j > 0) w *= (ncp / 2) / j;
      sum += w * jStat.beta.cdf(bx, df1 / 2 + j, b0);
      if (w < 1e-15) break;
    }
    return Math.max(0, Math.min(1, sum));
  }

  function powerAtF2(n, p, f2, alpha, withIntercept) {
    if (!f2 || f2 <= 0 || !n || !p || p < 1) return 0;
    if (typeof jStat === 'undefined' || !jStat.centralF || !jStat.centralF.inv) return 0;
    var df1 = p;
    var df2 = withIntercept ? (n - p - 1) : (n - p);
    if (df2 < 1) return 0;
    var ncp = n * f2;
    var fcrit = jStat.centralF.inv(1 - (alpha || 0.05), df1, df2);
    return Math.max(0, Math.min(1, 1 - noncentralFCdf(fcrit, df1, df2, ncp)));
  }

  function estimateRequiredN(f2, p, targetPower, alpha, withIntercept) {
    if (!f2 || f2 <= 0 || !p || p < 1) return 0;
    var nMin = Math.max(p + (withIntercept ? 2 : 1), 5);
    var nMax = 5000;
    for (var iter = 0; iter < 60; iter++) {
      var n = Math.floor((nMin + nMax) / 2);
      var power = powerAtF2(n, p, f2, alpha, withIntercept);
      if (Math.abs(power - targetPower) < 0.005) return n;
      if (power < targetPower) nMin = n + 1;
      else nMax = n - 1;
    }
    return Math.max(nMin, 1);
  }

  function estimateDetectableF2(n, p, targetPower, alpha, withIntercept) {
    if (!n || n < 3 || !p || p < 1) return 0;
    var lo = 0.0001;
    var hi = 50;
    for (var i = 0; i < 60; i++) {
      var f2 = (lo + hi) / 2;
      var pw = powerAtF2(n, p, f2, alpha, withIntercept);
      if (pw >= targetPower) hi = f2;
      else lo = f2;
    }
    return (lo + hi) / 2;
  }

  function buildOutputParams(ctx, f2, power) {
    if (!ctx || !f2 || f2 <= 0) return null;
    var critF = null;
    if (typeof jStat !== 'undefined' && jStat.centralF && jStat.centralF.inv) {
      critF = jStat.centralF.inv(1 - ctx.alpha, ctx.df1, ctx.df2);
    }
    return {
      lambda: ctx.n * f2,
      critical_f: critF,
      df1: ctx.df1,
      df2: ctx.df2,
      n: ctx.n,
      actual_power: power,
      pillai_v: null
    };
  }

  function detectableR2(ctx, targetPower) {
    if (!ctx) return NaN;
    return r2FromF2(estimateDetectableF2(ctx.n, ctx.p, targetPower, ctx.alpha, ctx.withIntercept));
  }

  global.StatisticoPowerCalc = {
    f2FromR2: f2FromR2,
    r2FromF2: r2FromF2,
    cohenMagnitude: cohenMagnitude,
    buildContext: buildContext,
    noncentralFCdf: noncentralFCdf,
    powerAtF2: powerAtF2,
    estimateRequiredN: estimateRequiredN,
    estimateDetectableF2: estimateDetectableF2,
    buildOutputParams: buildOutputParams,
    detectableR2: detectableR2
  };
})(typeof window !== 'undefined' ? window : this);
