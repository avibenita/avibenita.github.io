/**
 * Independent Means numerical contract.
 * Loaded as a classic script by the results page and as an ES module by the
 * video-workflow validator. Welch probability and intervals use the Student t
 * distribution. Mann–Whitney uses the asymptotic normal approximation without
 * a continuity correction. Planning totals are raised to a balanced allocation.
 */
(function (root) {
  function mean(a) {
    return a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  }

  function variance(a) {
    if (a.length < 2) return 0;
    const m = mean(a);
    let s = 0;
    for (let i = 0; i < a.length; i += 1) s += (a[i] - m) * (a[i] - m);
    return s / (a.length - 1);
  }

  function lnGamma(z) {
    const p = [
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
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    let x = p[0];
    const zz = z - 1;
    for (let i = 1; i < p.length; i += 1) x += p[i] / (zz + i);
    const t = zz + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function betacf(a, b, x) {
    const maxIt = 200;
    const eps = 3e-14;
    const fpmin = 1e-300;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < fpmin) d = fpmin;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= maxIt; m += 1) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < fpmin) d = fpmin;
      c = 1 + aa / c;
      if (Math.abs(c) < fpmin) c = fpmin;
      d = 1 / d;
      h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < fpmin) d = fpmin;
      c = 1 + aa / c;
      if (Math.abs(c) < fpmin) c = fpmin;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < eps) break;
    }
    return h;
  }

  function regularizedIncompleteBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
    const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta);
    if (x < (a + 1) / (a + b + 2)) return (front * betacf(a, b, x)) / a;
    return 1 - (front * betacf(b, a, 1 - x)) / b;
  }

  function studentTTwoSidedP(t, df) {
    if (!isFinite(t) || !isFinite(df) || df <= 0) return NaN;
    const x = df / (df + t * t);
    return Math.max(0, Math.min(1, regularizedIncompleteBeta(x, df / 2, 0.5)));
  }

  function studentTCdf(t, df) {
    const two = studentTTwoSidedP(t, df);
    const tail = two / 2;
    return t >= 0 ? 1 - tail : tail;
  }

  function studentTCritical(df, alpha) {
    const a = alpha > 0 && alpha < 1 ? alpha : 0.05;
    let lo = 0;
    let hi = 1;
    while (studentTTwoSidedP(hi, df) > a) hi *= 2;
    for (let i = 0; i < 80; i += 1) {
      const mid = (lo + hi) / 2;
      if (studentTTwoSidedP(mid, df) > a) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function interval(diff, se, df, alpha) {
    const crit = studentTCritical(df, alpha);
    return { lo: diff - crit * se, hi: diff + crit * se, critical: crit };
  }

  function tailP(stat, alt, twoSided) {
    if (alt === 'greater') return stat >= 0 ? twoSided / 2 : 1 - twoSided / 2;
    if (alt === 'less') return stat <= 0 ? twoSided / 2 : 1 - twoSided / 2;
    return twoSided;
  }

  function computeWelch(x, y, alt, alpha) {
    const n1 = x.length;
    const n2 = y.length;
    const m1 = mean(x);
    const m2 = mean(y);
    const v1 = variance(x);
    const v2 = variance(y);
    const se = Math.sqrt(v1 / n1 + v2 / n2);
    const t = se > 0 ? (m1 - m2) / se : 0;
    const num = (v1 / n1 + v2 / n2) ** 2;
    const den = (v1 / n1) ** 2 / Math.max(1, n1 - 1) + (v2 / n2) ** 2 / Math.max(1, n2 - 1);
    const df = den > 0 ? num / den : Math.max(1, n1 + n2 - 2);
    const a = alpha > 0 && alpha < 1 ? alpha : 0.05;
    const p = tailP(t, alt, studentTTwoSidedP(t, df));
    const span = interval(m1 - m2, se, df, a);
    return {
      t,
      df,
      se,
      p: Math.max(0, Math.min(1, p)),
      diff: m1 - m2,
      ciLow: span.lo,
      ciHigh: span.hi,
      alpha: a,
      critical: span.critical
    };
  }

  function computeStudent(x, y, alt, alpha) {
    const n1 = x.length;
    const n2 = y.length;
    const m1 = mean(x);
    const m2 = mean(y);
    const v1 = variance(x);
    const v2 = variance(y);
    const sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / Math.max(1, n1 + n2 - 2);
    const se = Math.sqrt(Math.max(0, sp2) * (1 / Math.max(1, n1) + 1 / Math.max(1, n2)));
    const t = se > 0 ? (m1 - m2) / se : 0;
    const df = Math.max(1, n1 + n2 - 2);
    const a = alpha > 0 && alpha < 1 ? alpha : 0.05;
    const p = tailP(t, alt, studentTTwoSidedP(t, df));
    const span = interval(m1 - m2, se, df, a);
    return {
      t,
      df,
      se,
      p: Math.max(0, Math.min(1, p)),
      diff: m1 - m2,
      ciLow: span.lo,
      ciHigh: span.hi,
      alpha: a,
      pooled: true
    };
  }

  function erf(x) {
    const sign = x < 0 ? -1 : 1;
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const ax = Math.abs(x);
    const t = 1 / (1 + p * ax);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  function normalCdf(z) {
    return 0.5 * (1 + erf(z / Math.sqrt(2)));
  }

  function computeMannWhitney(x, y, alt) {
    const all = [];
    x.forEach((v) => all.push({ v, g: 1 }));
    y.forEach((v) => all.push({ v, g: 2 }));
    all.sort((a, b) => a.v - b.v);
    let i = 0;
    while (i < all.length) {
      let j = i + 1;
      while (j < all.length && all[j].v === all[i].v) j += 1;
      const rank = (i + 1 + j) / 2;
      for (let k = i; k < j; k += 1) all[k].rank = rank;
      i = j;
    }
    const r1 = all.filter((d) => d.g === 1).reduce((s, d) => s + d.rank, 0);
    const n1 = x.length;
    const n2 = y.length;
    const u = r1 - (n1 * (n1 + 1)) / 2;
    const mu = (n1 * n2) / 2;
    const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = sigma > 0 ? (u - mu) / sigma : 0;
    const two = 2 * (1 - normalCdf(Math.abs(z)));
    let p = two;
    if (alt === 'greater') p = 1 - normalCdf(z);
    if (alt === 'less') p = normalCdf(z);
    return {
      u,
      z,
      p: Math.max(0, Math.min(1, p)),
      continuity: 'none',
      method: 'asymptotic-normal'
    };
  }

  function etaSquared(x, y) {
    const n1 = x.length;
    const n2 = y.length;
    const m1 = mean(x);
    const m2 = mean(y);
    const grand = (n1 * m1 + n2 * m2) / Math.max(1, n1 + n2);
    const ssBetween = n1 * (m1 - grand) ** 2 + n2 * (m2 - grand) ** 2;
    const ssWithin = (n1 - 1) * variance(x) + (n2 - 1) * variance(y);
    const total = ssBetween + ssWithin;
    return total > 0 ? ssBetween / total : NaN;
  }

  function balanceGroupTotal(n, k) {
    const total = Number(n);
    const groups = Number(k);
    if (!isFinite(total) || total <= 0 || !isFinite(groups) || groups < 2) return total;
    const rem = total % groups;
    return rem === 0 ? total : total + (groups - rem);
  }

  function parseNum(v) {
    if (v === null || v === undefined || v === '') return NaN;
    const n = Number(String(v).trim().replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }

  function groupsFromFixture(fixture) {
    const headers = fixture.headers;
    const aIdx = headers.indexOf(fixture.spec.groupA);
    const bIdx = headers.indexOf(fixture.spec.groupB);
    const a = [];
    const b = [];
    for (const row of fixture.rows) {
      const av = parseNum(row[aIdx]);
      const bv = parseNum(row[bIdx]);
      if (isFinite(av)) a.push(av);
      if (isFinite(bv)) b.push(bv);
    }
    return { a, b };
  }

  root.StatisticoIndependentContract = {
    mean,
    variance,
    studentTTwoSidedP,
    studentTCdf,
    studentTCritical,
    interval,
    computeWelch,
    computeStudent,
    computeMannWhitney,
    etaSquared,
    balanceGroupTotal,
    groupsFromFixture
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
