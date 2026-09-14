/**
 * Regression Similarity Index — pairwise pattern / strength / sign scores.
 * Compares group-level coefficient vectors (aligned β, intercept omitted).
 * Same construction as correlation / contingency Similarity Profile™:
 * Tucker congruence, mean-|β| ratio, sign agreement; overall is a geometric mean.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoRegressionSimilarity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MIN_TERMS = 1;
  var WEAK_BETA = 1e-8;

  function finite(n) {
    return typeof n === 'number' && Number.isFinite(n);
  }

  function round1(x) {
    return finite(x) ? Math.round(x * 10) / 10 : null;
  }

  function groupName(g) {
    return g && (g.group != null ? g.group : g.name);
  }

  function alignedPairs(a, b) {
    var ra = a && Array.isArray(a.r) ? a.r : [];
    var rb = b && Array.isArray(b.r) ? b.r : [];
    var n = Math.min(ra.length, rb.length);
    var left = [];
    var right = [];
    var idx = [];
    for (var i = 0; i < n; i++) {
      if (!finite(ra[i]) || !finite(rb[i])) continue;
      left.push(ra[i]);
      right.push(rb[i]);
      idx.push(i);
    }
    return { a: left, b: right, index: idx, n: left.length };
  }

  function meanAbs(values) {
    if (!values.length) return 0;
    var s = 0;
    for (var i = 0; i < values.length; i++) s += Math.abs(values[i]);
    return s / values.length;
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

  function strengthScore(rA, rB) {
    if (!rA.length || rA.length !== rB.length) return null;
    var m1 = meanAbs(rA);
    var m2 = meanAbs(rB);
    if (m1 <= 1e-12 && m2 <= 1e-12) return 100;
    if (m1 <= 1e-12 || m2 <= 1e-12) return 0;
    return 100 * Math.exp(-Math.abs(Math.log(m1 / m2)));
  }

  function signedBand(b) {
    if (Math.abs(b) < WEAK_BETA) return 0;
    return b > 0 ? 1 : -1;
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

  function bandRank(key) {
    if (key === 'very') return 3;
    if (key === 'mostly') return 2;
    if (key === 'mixed') return 1;
    if (key === 'different') return 0;
    return -1;
  }

  function usableGroup(g) {
    if (!g || !Array.isArray(g.r)) return false;
    var k = 0;
    for (var i = 0; i < g.r.length; i++) if (finite(g.r[i])) k += 1;
    return k >= MIN_TERMS;
  }

  function pairKey(a, b) {
    return String(a) + '\u0000' + String(b);
  }

  function comparePair(a, b) {
    var aligned = alignedPairs(a, b);
    var ok = usableGroup(a) && usableGroup(b) && aligned.n >= MIN_TERMS;
    var pattern = ok ? patternScore(aligned.a, aligned.b) : null;
    var strength = ok ? strengthScore(aligned.a, aligned.b) : null;
    var sign = ok ? signScore(aligned.a, aligned.b) : null;
    var overall = overallScore(pattern, strength, sign);
    var band = bandFor(overall);
    return {
      a: groupName(a),
      b: groupName(b),
      nA: a && a.n,
      nB: b && b.n,
      pairCount: aligned.n,
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
      index: aligned.index
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
    var maxRank = -1;
    var minRank = 4;
    for (i = 0; i < usablePairs.length; i++) {
      var rank = bandRank(usablePairs[i].bandKey);
      if (rank > maxRank) maxRank = rank;
      if (rank >= 0 && rank < minRank) minRank = rank;
    }
    var rangeContrast = maxRank > minRank && minRank >= 0;
    var mostSimilarPairs = usablePairs.filter(function (p) { return bandRank(p.bandKey) === maxRank; });
    var mostDistinctPairs = rangeContrast
      ? usablePairs.filter(function (p) { return bandRank(p.bandKey) === minRank; })
      : [];
    var mostSimilar = mostSimilarPairs[0] || null;
    var mostDistinct = mostDistinctPairs[0] || null;

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
      var meanBand = bandFor(meanSim);
      return {
        group: name,
        n: g.n,
        meanSimilarity: round1(meanSim),
        meanSimilarityRaw: meanSim,
        meanBand: meanBand,
        meanBandKey: meanBand.key
      };
    });

    var groupMaxRank = -1;
    var groupMinRank = 4;
    for (i = 0; i < groupMeans.length; i++) {
      var gRank = bandRank(groupMeans[i].meanBandKey);
      if (gRank < 0) continue;
      if (gRank > groupMaxRank) groupMaxRank = gRank;
      if (gRank < groupMinRank) groupMinRank = gRank;
    }
    var groupRangeContrast = groupMaxRank > groupMinRank && groupMinRank >= 0;
    var mostDifferentGroups = groupRangeContrast
      ? groupMeans.filter(function (gm) { return bandRank(gm.meanBandKey) === groupMinRank; })
      : [];
    var mostDifferentGroup = mostDifferentGroups[0] || null;

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
      mostSimilarPairs: mostSimilarPairs,
      mostDistinctPairs: mostDistinctPairs,
      rangeContrast: rangeContrast,
      mostDifferentGroup: mostDifferentGroup,
      mostDifferentGroups: mostDifferentGroups,
      groupRangeContrast: groupRangeContrast,
      groupMeans: groupMeans,
      pairCount: pairs.length,
      usablePairCount: usablePairs.length
    };
  }

  return {
    MIN_TERMS: MIN_TERMS,
    WEAK_BETA: WEAK_BETA,
    alignedPairs: alignedPairs,
    patternScore: patternScore,
    strengthScore: strengthScore,
    signScore: signScore,
    overallScore: overallScore,
    bandFor: bandFor,
    bandRank: bandRank,
    comparePair: comparePair,
    buildProfile: buildProfile
  };
});
