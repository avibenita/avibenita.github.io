/**
 * Shared univariate normality test battery (Royston Shapiro–Wilk, matches normality-standalone).
 */
(function (global) {
  'use strict';

  function mean(arr) {
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  function sampleStd(arr) {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  }

  function countUnique(values) {
    const seen = new Set();
    for (let i = 0; i < values.length; i++) {
      seen.add(values[i]);
    }
    return seen.size;
  }

  function hasTies(values) {
    return countUnique(values) < values.length;
  }

  function andersonDarlingCritical(alpha) {
    const table = [[0.10, 0.631], [0.05, 0.752], [0.025, 0.873], [0.01, 1.035]];
    for (let i = 0; i < table.length; i++) {
      if (alpha >= table[i][0]) return table[i][1];
    }
    return 1.035;
  }

  function cramerVonMisesCritical(alpha) {
    const table = [[0.10, 0.347], [0.05, 0.461], [0.025, 0.743], [0.01, 1.167]];
    for (let i = 0; i < table.length; i++) {
      if (alpha >= table[i][0]) return table[i][1];
    }
    return 1.167;
  }

  function shapiroWilkTest(data, opts) {
    const options = opts || {};
    const n = data.length;
    if (n < 3 || n > 5000 || typeof global.jStat === 'undefined') {
      return { statistic: NaN, pValue: NaN, unreliable: false };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const m = mean(sorted);
    const ss = sorted.reduce((s, v) => s + (v - m) ** 2, 0);
    if (ss === 0) return { statistic: NaN, pValue: NaN, unreliable: false };

    const k = Math.floor(n / 2);
    const cn = [];
    for (let i = 1; i <= k; i++) {
      cn.push(global.jStat.normal.inv((i - 0.375) / (n + 0.25), 0, 1));
    }
    const phi = cn.reduce((s, v) => s + v * v, 0);
    const u = 1 / Math.sqrt(n);
    const poly = (coef, x) => coef.reduce((s, ci) => s * x + ci, 0);
    const an = poly([-2.706056, 4.434685, -2.071190, -0.147981, 0.221157, cn[k - 1]], u);
    const a = new Array(k);
    a[k - 1] = an;
    if (k >= 2) a[k - 2] = poly([-3.582633, 5.682633, -1.752461, -0.293762, 0.042981, k >= 2 ? cn[1] : cn[0]], u);
    const phi2 = Math.max(0, phi - 2 * an * an - (k >= 2 ? 2 * a[k - 2] * a[k - 2] : 0));
    for (let i = 0; i < k - 2; i++) {
      a[i] = phi2 > 0 ? -cn[i] / Math.sqrt(phi * phi2) : 0;
    }

    let b = 0;
    for (let i = 0; i < k; i++) b += a[i] * (sorted[n - 1 - i] - sorted[i]);
    const W = Math.min(1, Math.max(0, (b * b) / ss));
    if (!isFinite(W)) return { statistic: NaN, pValue: NaN, unreliable: false };

    const lnW = Math.log(1 - W);
    const lnN = Math.log(n);
    let pValue;
    if (n <= 11) {
      const z = (-lnW - 0.8 - 0.15 * lnN) / (0.6 + 0.12 * lnN);
      pValue = 1 - global.jStat.normal.cdf(z, 0, 1);
    } else {
      const mu = -1.5861 - 0.31082 * lnN - 0.083751 * lnN ** 2 + 0.0038915 * lnN ** 3;
      const sig = Math.exp(-0.4803 - 0.082676 * lnN + 0.0030302 * lnN ** 2);
      pValue = 1 - global.jStat.normal.cdf((lnW - mu) / sig, 0, 1);
    }
    pValue = Math.max(1e-12, Math.min(1 - 1e-12, pValue));

    const tied = hasTies(data);
    const unreliable = tied && !options.allowTies;
    return { statistic: W, pValue, unreliable, tied, uniqueN: countUnique(data) };
  }

  function jarqueBeraTest(data) {
    const n = data.length;
    const m = mean(data);
    const s2 = data.reduce((s, v) => s + (v - m) ** 2, 0) / n;
    const sd = Math.sqrt(s2);
    const s3 = data.reduce((s, v) => s + ((v - m) / sd) ** 3, 0) / n;
    const s4 = data.reduce((s, v) => s + ((v - m) / sd) ** 4, 0) / n;
    const JB = (n / 6) * (s3 ** 2 + (s4 - 3) ** 2 / 4);
    return { statistic: JB, pValue: 1 - global.jStat.chisquare.cdf(JB, 2) };
  }

  function kolmogorovSmirnovTest(data) {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const m = mean(data);
    const sd = sampleStd(data);
    if (!(sd > 0)) return { statistic: NaN, pValue: NaN };

    let maxD = 0;
    for (let i = 0; i < n; i++) {
      const Ft = global.jStat.normal.cdf((sorted[i] - m) / sd, 0, 1);
      maxD = Math.max(maxD, Math.abs((i + 1) / n - Ft), Math.abs(i / n - Ft));
    }
    const sqN = Math.sqrt(n);
    const lam = (sqN + 0.12 + 0.11 / sqN) * maxD;
    let pValue = 0;
    for (let k = 1; k <= 100; k++) {
      const term = (k % 2 === 1 ? 1 : -1) * Math.exp(-2 * k * k * lam * lam);
      pValue += term;
      if (Math.abs(term) < 1e-10) break;
    }
    return { statistic: maxD, pValue: Math.max(0, Math.min(1, 2 * pValue)) };
  }

  function andersonDarlingTest(data) {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const m = mean(data);
    const sd = sampleStd(data);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const Fi = global.jStat.normal.cdf((sorted[i] - m) / sd, 0, 1);
      const Fni = global.jStat.normal.cdf((sorted[n - 1 - i] - m) / sd, 0, 1);
      sum += (2 * i + 1) * (Math.log(Math.max(Fi, 1e-300)) + Math.log(Math.max(1 - Fni, 1e-300)));
    }
    const A2s = (-n - sum / n) * (1 + 0.75 / n + 2.25 / (n * n));
    let pValue;
    if (A2s < 0.2) pValue = 1 - Math.exp(-13.436 + 101.14 * A2s - 223.73 * A2s ** 2);
    else if (A2s < 0.34) pValue = 1 - Math.exp(-8.318 + 42.796 * A2s - 59.938 * A2s ** 2);
    else if (A2s < 0.6) pValue = Math.exp(0.9177 - 4.279 * A2s - 1.38 * A2s ** 2);
    else if (A2s < 13) pValue = Math.exp(1.2937 - 5.709 * A2s + 0.0186 * A2s ** 2);
    else pValue = 0;
    return { statistic: A2s, pValue: Math.max(0, Math.min(1, pValue)) };
  }

  function cramerVonMisesTest(data) {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const m = mean(data);
    const sd = sampleStd(data);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const Fi = global.jStat.normal.cdf((sorted[i] - m) / sd, 0, 1);
      sum += (Fi - (2 * i + 1) / (2 * n)) ** 2;
    }
    const W2s = (sum + 1 / (12 * n)) * (1 + 0.5 / n);
    let pValue;
    if (W2s <= 0.0275) pValue = 1 - Math.exp(-13.953 + 775.5 * W2s - 12542.6 * W2s ** 2);
    else if (W2s <= 0.0516) pValue = 1 - Math.exp(-5.903 + 179.546 * W2s - 1515.29 * W2s ** 2);
    else if (W2s <= 0.1954) pValue = Math.exp(0.886 - 31.62 * W2s + 10.897 * W2s ** 2);
    else pValue = Math.exp(1.111 - 34.242 * W2s + 12.832 * W2s ** 2);
    return { statistic: W2s, pValue: Math.max(0, Math.min(1, pValue)) };
  }

  function dagostinoPearsonTest(data) {
    const n = data.length;
    if (n < 8) return { statistic: NaN, pValue: NaN };

    const m = mean(data);
    const s2 = data.reduce((s, v) => s + (v - m) ** 2, 0) / n;
    const sd = Math.sqrt(s2);
    const b1 = data.reduce((s, v) => s + ((v - m) / sd) ** 3, 0) / n;
    const Y = b1 * Math.sqrt((n + 1) * (n + 3) / (6 * (n - 2)));
    const B2s = 3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3) / ((n - 2) * (n + 5) * (n + 7) * (n + 9));
    const W2 = -1 + Math.sqrt(2 * (B2s - 1));
    const del = 1 / Math.sqrt(Math.log(Math.sqrt(W2)));
    const A = Math.sqrt(2 / (W2 - 1));
    const Zs = del * Math.log(Y / A + Math.sqrt((Y / A) ** 2 + 1));
    const b2 = data.reduce((s, v) => s + ((v - m) / sd) ** 4, 0) / n;
    const Ek = 3 * (n - 1) / (n + 1);
    const Vk = 24 * n * (n - 2) * (n - 3) / ((n + 1) ** 2 * (n + 3) * (n + 5));
    const X = (b2 - Ek) / Math.sqrt(Vk);
    const sqb = 6 * (n * n - 5 * n + 2) / ((n + 7) * (n + 9)) * Math.sqrt(6 * (n + 3) * (n + 5) / (n * (n - 2) * (n - 3)));
    const Ak = 6 + (8 / sqb) * (2 / sqb + Math.sqrt(1 + 4 / sqb ** 2));
    const t1 = 2 / (9 * Ak);
    const t2 = (1 - 2 / Ak) / (1 + X * Math.sqrt(2 / (Ak - 4)));
    const Zk = ((1 - t1) - Math.cbrt(t2 < 0 ? -Math.abs(t2) : t2)) / Math.sqrt(t1);
    const K2 = Zs ** 2 + Zk ** 2;
    return { statistic: K2, pValue: Math.max(0, Math.min(1, 1 - global.jStat.chisquare.cdf(K2, 2))) };
  }

  function runAll(data, alpha) {
    const sw = shapiroWilkTest(data);
    const tests = [
      { name: 'Shapiro-Wilk', id: 'sw', ...sw, weight: sw.unreliable ? 0.35 : 1.0 },
      { name: 'Anderson-Darling', id: 'ad', ...andersonDarlingTest(data), weight: 0.9 },
      { name: 'Kolmogorov-Smirnov', id: 'ks', ...kolmogorovSmirnovTest(data), weight: 0.8 },
      { name: 'Cramer-von Mises', id: 'cvm', ...cramerVonMisesTest(data), weight: 0.7 },
      { name: "D'Agostino-Pearson", id: 'dp', ...dagostinoPearsonTest(data), weight: 1.0 },
      { name: 'Jarque-Bera', id: 'jb', ...jarqueBeraTest(data), weight: 0.9 }
    ];
    tests.alpha = typeof alpha === 'number' ? alpha : 0.05;
    tests.hasTies = hasTies(data);
    tests.uniqueN = countUnique(data);
    tests.n = data.length;
    return tests;
  }

  function calculateNSI(tests) {
    let totalWeight = 0;
    let weightedScore = 0;
    tests.forEach((test) => {
      const p = test.pValue;
      const w = test.weight;
      if (p === null || !Number.isFinite(p)) return;
      let score = 0;
      if (p < 0.001) score = 0;
      else if (p < 0.05) {
        const logScale = Math.log10(p) - Math.log10(0.001);
        const maxLogScale = Math.log10(0.05) - Math.log10(0.001);
        score = 10 + (30 * logScale / maxLogScale);
      } else if (p < 0.5) {
        const logScale = Math.log10(p) - Math.log10(0.05);
        const maxLogScale = Math.log10(0.5) - Math.log10(0.05);
        score = 40 + (40 * logScale / maxLogScale);
      } else {
        score = 80 + (20 * (p - 0.5) / 0.5);
      }
      weightedScore += score * w;
      totalWeight += w;
    });
    return Math.round(totalWeight > 0 ? weightedScore / totalWeight : 50);
  }

  /**
   * Plain-English normality verdict from the test battery.
   * Unreliable Shapiro-Wilk (ties/discrete data) is excluded from the vote.
   */
  function calculateVerdict(tests, alpha) {
    const cutoff = typeof alpha === 'number' ? alpha : 0.05;
    let pool = tests.filter((t) => {
      if (t.name === 'Shapiro-Wilk' && t.unreliable) return false;
      return Number.isFinite(t.pValue);
    });
    if (!pool.length) {
      pool = tests.filter((t) => Number.isFinite(t.pValue));
    }
    if (!pool.length) return { label: 'Insufficient Data', tone: 'na' };

    const pass = pool.filter((t) => t.pValue >= cutoff).length;
    const ratio = pass / pool.length;
    if (ratio >= 0.67) return { label: 'Approximately Normal', tone: 'pass' };
    if (ratio >= 0.4) return { label: 'Mixed Evidence', tone: 'mixed' };
    return { label: 'Likely Non-Normal', tone: 'fail' };
  }

  function getCritical(testId, alpha, n) {
    const a = typeof alpha === 'number' ? alpha : 0.05;
    switch (testId) {
      case 'sw':
        return 0.95;
      case 'ad':
        return andersonDarlingCritical(a);
      case 'ks':
        return n > 0 ? 1.36 / Math.sqrt(n) : null;
      case 'cvm':
        return cramerVonMisesCritical(a);
      case 'dp':
        return andersonDarlingCritical(a);
      case 'jb':
        return typeof global.jStat !== 'undefined'
          ? global.jStat.chisquare.inv(1 - a, 2)
          : null;
      default:
        return null;
    }
  }

  /** Legacy card shape used by descriptive-stats modals and VB6 callbacks. */
  function toCardResults(tests, alpha) {
    const a = typeof alpha === 'number' ? alpha : (tests.alpha || 0.05);
    const n = tests.n;
    return tests
      .filter((t) => t && t.name)
      .map((t) => ({
        name: t.name,
        stat: Number.isFinite(t.statistic) ? t.statistic : null,
        pval: Number.isFinite(t.pValue) ? t.pValue : null,
        crit: getCritical(t.id, a, n)
      }));
  }

  function countPassFail(tests, alpha) {
    const cutoff = typeof alpha === 'number' ? alpha : 0.05;
    let pass = 0;
    let fail = 0;
    tests.forEach((t) => {
      if (!Number.isFinite(t.pValue)) return;
      if (t.pValue >= cutoff) pass += 1;
      else fail += 1;
    });
    return { pass, fail };
  }

  global.UniNormalityTests = {
    runAll,
    calculateNSI,
    calculateVerdict,
    countPassFail,
    getCritical,
    toCardResults,
    hasTies,
    countUnique,
    shapiroWilkTest
  };
}(typeof window !== 'undefined' ? window : globalThis));
