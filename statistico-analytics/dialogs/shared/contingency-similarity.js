/**
 * Contingency Similarity Index — pairwise pattern / strength / sign scores.
 * Compares group-level association structures (aligned adjusted residuals
 * and Cramér’s V). Statistico construction: components use recognised
 * measures (Tucker congruence of residuals, V ratio, residual-sign
 * agreement); the combined index is original. Safe in both browser and Jest.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoContingencySimilarity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MIN_CELLS = 4;
  var WEAK_SR = 1;

  function finite(n) {
    return typeof n === 'number' && Number.isFinite(n);
  }

  function round1(x) {
    return finite(x) ? Math.round(x * 10) / 10 : null;
  }

  function groupName(g) {
    return g && (g.group != null ? g.group : g.name);
  }

  function cramersV(g) {
    if (!g) return NaN;
    if (finite(g.v)) return g.v;
    if (finite(g.V)) return g.V;
    if (g.tests && finite(g.tests.cramersV)) return g.tests.cramersV;
    return NaN;
  }

  function residualVector(g) {
    if (!g) return [];
    if (Array.isArray(g.residuals)) return g.residuals;
    var mat = g.stdResiduals;
    if (!Array.isArray(mat)) return [];
    var flat = [];
    for (var i = 0; i < mat.length; i++) {
      var row = mat[i] || [];
      for (var j = 0; j < row.length; j++) flat.push(row[j]);
    }
    return flat;
  }

  function alignedResiduals(a, b) {
    var ra = residualVector(a);
    var rb = residualVector(b);
    var n = Math.min(ra.length, rb.length);
    var left = [];
    var right = [];
    var idx = [];
    var labels = a && Array.isArray(a.labels) ? a.labels : (b && Array.isArray(b.labels) ? b.labels : []);
    for (var i = 0; i < n; i++) {
      if (!finite(ra[i]) || !finite(rb[i])) continue;
      left.push(ra[i]);
      right.push(rb[i]);
      idx.push(i);
    }
    return { a: left, b: right, index: idx, n: left.length, labels: labels };
  }

  function cosine(a, b) {
    var dot = 0;
    var na = 0;
    var nb = 0;
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na <= 1e-18 && nb <= 1e-18) return 1;
    if (na <= 1e-18 || nb <= 1e-18) return 0;
    return dot / Math.sqrt(na * nb);
  }

  function patternScore(rA, rB) {
    if (!rA.length || rA.length !== rB.length) return null;
    var phi = cosine(rA, rB);
    if (!finite(phi)) return null;
    if (phi > 1) phi = 1;
    if (phi < -1) phi = -1;
    return 100 * (1 + phi) / 2;
  }

  function strengthScore(vA, vB) {
    var m1 = Math.abs(vA);
    var m2 = Math.abs(vB);
    if (!finite(m1) || !finite(m2)) return null;
    if (m1 <= 1e-12 && m2 <= 1e-12) return 100;
    if (m1 <= 1e-12 || m2 <= 1e-12) return 0;
    return 100 * Math.exp(-Math.abs(Math.log(m1 / m2)));
  }

  function signedBand(sr) {
    if (Math.abs(sr) < WEAK_SR) return 0;
    return sr > 0 ? 1 : -1;
  }

  function signScore(rA, rB) {
    if (!rA.length || rA.length !== rB.length) return null;
    var same = 0;
    for (var i = 0; i < rA.length; i++) {
      if (signedBand(rA[i]) === signedBand(rB[i])) same += 1;
    }
    return 100 * same / rA.length;
  }

  function overallScore(pattern, strength, sign) {
    if (!finite(pattern) || !finite(strength) || !finite(sign)) return null;
    if (pattern < 0 || strength < 0 || sign < 0) return null;
    return Math.pow(pattern * strength * sign, 1 / 3);
  }

  function bandFor(score) {
    if (!finite(score)) return { key: 'na', label: 'Not enough data' };
    if (score >= 90) return { key: 'very', label: 'Very similar' };
    if (score >= 75) return { key: 'mostly', label: 'Mostly similar' };
    if (score >= 50) return { key: 'mixed', label: 'Mixed similarity' };
    return { key: 'different', label: 'Substantially different' };
  }

  function usableGroup(g) {
    if (!g) return false;
    if (!finite(cramersV(g))) return false;
    var r = residualVector(g);
    var k = 0;
    for (var i = 0; i < r.length; i++) if (finite(r[i])) k += 1;
    return k >= MIN_CELLS;
  }

  function pairKey(a, b) {
    return String(a) + '\u0000' + String(b);
  }

  function comparePair(a, b) {
    var aligned = alignedResiduals(a, b);
    var ok = usableGroup(a) && usableGroup(b) && aligned.n >= MIN_CELLS;
    var pattern = ok ? patternScore(aligned.a, aligned.b) : null;
    var strength = ok ? strengthScore(cramersV(a), cramersV(b)) : null;
    var sign = ok ? signScore(aligned.a, aligned.b) : null;
    var overall = overallScore(pattern, strength, sign);
    var band = bandFor(overall);
    return {
      a: groupName(a),
      b: groupName(b),
      nA: a && a.n,
      nB: b && b.n,
      vA: cramersV(a),
      vB: cramersV(b),
      cellCount: aligned.n,
      pattern: round1(pattern),
      strength: round1(strength),
      sign: round1(sign),
      overall: round1(overall),
      patternRaw: pattern,
      strengthRaw: strength,
      signRaw: sign,
      overallRaw: overall,
      band: band.label,
      bandKey: band.key,
      usable: ok && finite(overall),
      rA: aligned.a,
      rB: aligned.b,
      index: aligned.index,
      labels: aligned.labels
    };
  }

  function geometricMean(values) {
    var prod = 1;
    var k = 0;
    for (var i = 0; i < values.length; i++) {
      if (!finite(values[i]) || values[i] < 0) continue;
      prod *= values[i];
      k += 1;
    }
    if (!k) return null;
    return Math.pow(prod, 1 / k);
  }

  function buildProfile(groups) {
    var list = Array.isArray(groups) ? groups.slice() : [];
    var names = list.map(groupName);
    var pairs = [];
    var lookup = Object.create(null);
    var i;
    var j;

    for (i = 0; i < list.length; i++) {
      for (j = i + 1; j < list.length; j++) {
        var row = comparePair(list[i], list[j]);
        pairs.push(row);
        lookup[pairKey(row.a, row.b)] = row;
        lookup[pairKey(row.b, row.a)] = row;
      }
    }

    var usablePairs = pairs.filter(function (p) { return p.usable; });
    var overalls = usablePairs.map(function (p) { return p.overallRaw; });
    var homogeneity = geometricMean(overalls);
    var mostSimilar = null;
    var mostDistinct = null;
    for (i = 0; i < usablePairs.length; i++) {
      var p = usablePairs[i];
      if (!mostSimilar || p.overallRaw > mostSimilar.overallRaw) mostSimilar = p;
      if (!mostDistinct || p.overallRaw < mostDistinct.overallRaw) mostDistinct = p;
    }

    var groupMeans = list.map(function (g) {
      var name = groupName(g);
      var scores = [];
      for (i = 0; i < list.length; i++) {
        var other = groupName(list[i]);
        if (other === name) continue;
        var pair = lookup[pairKey(name, other)];
        if (pair && finite(pair.overallRaw)) scores.push(pair.overallRaw);
      }
      var meanSim = scores.length
        ? scores.reduce(function (s, v) { return s + v; }, 0) / scores.length
        : null;
      return { group: name, n: g.n, meanSimilarity: round1(meanSim), meanSimilarityRaw: meanSim };
    });

    var mostDifferentGroup = null;
    for (i = 0; i < groupMeans.length; i++) {
      var gm = groupMeans[i];
      if (!finite(gm.meanSimilarityRaw)) continue;
      if (!mostDifferentGroup || gm.meanSimilarityRaw < mostDifferentGroup.meanSimilarityRaw) {
        mostDifferentGroup = gm;
      }
    }

    var matrix = names.map(function (rowName) {
      return names.map(function (colName) {
        if (rowName === colName) return { diagonal: true, overall: 100 };
        return lookup[pairKey(rowName, colName)] || null;
      });
    });

    return {
      groups: names,
      pairs: pairs,
      matrix: matrix,
      homogeneity: round1(homogeneity),
      homogeneityRaw: homogeneity,
      homogeneityBand: bandFor(homogeneity),
      mostSimilar: mostSimilar,
      mostDistinct: mostDistinct,
      mostDifferentGroup: mostDifferentGroup,
      groupMeans: groupMeans,
      pairCount: pairs.length,
      usablePairCount: usablePairs.length
    };
  }

  return {
    MIN_CELLS: MIN_CELLS,
    WEAK_SR: WEAK_SR,
    alignedResiduals: alignedResiduals,
    patternScore: patternScore,
    strengthScore: strengthScore,
    signScore: signScore,
    overallScore: overallScore,
    bandFor: bandFor,
    comparePair: comparePair,
    buildProfile: buildProfile
  };
});
