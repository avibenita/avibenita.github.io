/**
 * Distribution Similarity Profile — pairwise location / spread / shape scores.
 * Statistico construction: components use recognised measures; the combined
 * index and weighting are original. Safe in both browser and Jest.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoDistributionSimilarity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var GRID_POINTS = 201;
  var MIN_BANDWIDTH = 0.12;
  var KERNEL_PAD = 4;
  var INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

  function finite(n) {
    return typeof n === 'number' && Number.isFinite(n);
  }

  function clamp01(x) {
    if (!finite(x)) return null;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  function round1(x) {
    return finite(x) ? Math.round(x * 10) / 10 : null;
  }

  function groupName(g) {
    return g && (g.group != null ? g.group : g.name);
  }

  function sampleStd(values, mean) {
    var n = values.length;
    if (n < 2) return 0;
    var m = finite(mean) ? mean : values.reduce(function (s, v) { return s + v; }, 0) / n;
    var acc = 0;
    for (var i = 0; i < n; i++) acc += (values[i] - m) * (values[i] - m);
    return Math.sqrt(acc / (n - 1));
  }

  function locationScore(a, b) {
    var n1 = a.n;
    var n2 = b.n;
    var df = n1 + n2 - 2;
    if (df <= 0) return null;
    var v1 = a.stdDev * a.stdDev;
    var v2 = b.stdDev * b.stdDev;
    var pooled = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / df);
    var delta = Math.abs(a.mean - b.mean);
    if (pooled <= 1e-12) return delta <= 1e-12 ? 100 : 0;
    return 100 / (1 + delta / pooled);
  }

  function spreadScore(a, b) {
    var s1 = a.stdDev;
    var s2 = b.stdDev;
    if (s1 <= 1e-12 && s2 <= 1e-12) return 100;
    if (s1 <= 1e-12 || s2 <= 1e-12) return 0;
    return 100 * Math.exp(-Math.abs(Math.log(s1 / s2)));
  }

  function standardize(values, mean, sd) {
    if (!sd || sd <= 1e-12) return values.map(function () { return 0; });
    return values.map(function (v) { return (v - mean) / sd; });
  }

  function silvermanBandwidth(values) {
    var n = values.length;
    if (n < 2) return MIN_BANDWIDTH;
    var sd = sampleStd(values);
    var h = 1.06 * sd * Math.pow(n, -0.2);
    return Math.max(h, MIN_BANDWIDTH);
  }

  function densityOnGrid(values, grid, bandwidth) {
    var n = values.length;
    var h = bandwidth || silvermanBandwidth(values);
    var dens = new Array(grid.length);
    var invNh = 1 / (n * h);
    for (var i = 0; i < grid.length; i++) {
      var x = grid[i];
      var sum = 0;
      for (var j = 0; j < n; j++) {
        var u = (x - values[j]) / h;
        sum += INV_SQRT_2PI * Math.exp(-0.5 * u * u);
      }
      dens[i] = sum * invNh;
    }
    return dens;
  }

  function rangeOf(values) {
    var min = values[0];
    var max = values[0];
    for (var i = 1; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    return { min: min, max: max };
  }

  function makeGrid(min, max, pad, points) {
    var lo = finite(min) ? min : -4;
    var hi = finite(max) ? max : 4;
    var extra = finite(pad) ? pad : 3;
    lo -= extra;
    hi += extra;
    if (hi <= lo) {
      lo -= 1;
      hi += 1;
    }
    var n = points || GRID_POINTS;
    var step = (hi - lo) / (n - 1);
    var grid = new Array(n);
    for (var i = 0; i < n; i++) grid[i] = lo + i * step;
    return { grid: grid, step: step };
  }

  function integrate(dens, step) {
    if (!dens || dens.length < 2 || !finite(step) || step <= 0) return 0;
    var area = 0;
    for (var i = 0; i < dens.length - 1; i++) area += 0.5 * (dens[i] + dens[i + 1]) * step;
    return area;
  }

  function normalizeDensity(dens, step) {
    var area = integrate(dens, step);
    if (area <= 1e-12) return dens;
    return dens.map(function (v) { return v / area; });
  }

  function overlapCoefficient(d1, d2, step) {
    if (!d1 || !d2 || d1.length !== d2.length || d1.length < 2 || !finite(step) || step <= 0) return null;
    return clamp01(integrate(d1.map(function (v, i) { return Math.min(v, d2[i]); }), step));
  }

  function pairedDensities(valuesA, valuesB) {
    var h = Math.max(silvermanBandwidth(valuesA), silvermanBandwidth(valuesB));
    var ra = rangeOf(valuesA);
    var rb = rangeOf(valuesB);
    var spec = makeGrid(Math.min(ra.min, rb.min), Math.max(ra.max, rb.max), KERNEL_PAD * h, GRID_POINTS);
    return {
      grid: spec.grid,
      step: spec.step,
      a: normalizeDensity(densityOnGrid(valuesA, spec.grid, h), spec.step),
      b: normalizeDensity(densityOnGrid(valuesB, spec.grid, h), spec.step)
    };
  }

  function shapeScore(a, b) {
    var dens = pairedDensities(
      standardize(a.values, a.mean, a.stdDev),
      standardize(b.values, b.mean, b.stdDev)
    );
    var ovl = overlapCoefficient(dens.a, dens.b, dens.step);
    return ovl == null ? null : 100 * ovl;
  }

  var COMPONENT_FLOOR = 1;

  function overallScore(location, spread, shape) {
    if (!finite(location) || !finite(spread) || !finite(shape)) return null;
    if (location < 0 || spread < 0 || shape < 0) return null;
    return Math.pow(
      Math.max(location, COMPONENT_FLOOR) *
      Math.max(spread, COMPONENT_FLOOR) *
      Math.max(shape, COMPONENT_FLOOR),
      1 / 3
    );
  }

  function bandFor(score) {
    if (!finite(score)) return { key: 'na', label: 'Not enough data' };
    if (score >= 90) return { key: 'very', label: 'Very similar' };
    if (score >= 75) return { key: 'mostly', label: 'Mostly similar' };
    if (score >= 50) return { key: 'mixed', label: 'Mixed similarity' };
    return { key: 'different', label: 'Substantially different' };
  }

  function usableGroup(g) {
    return !!(g && Array.isArray(g.values) && g.values.length >= 2 && finite(g.mean) && finite(g.stdDev));
  }

  function pairKey(a, b) {
    return String(a) + '\u0000' + String(b);
  }

  function comparePair(a, b) {
    var ok = usableGroup(a) && usableGroup(b);
    var location = ok ? locationScore(a, b) : null;
    var spread = ok ? spreadScore(a, b) : null;
    var shape = ok ? shapeScore(a, b) : null;
    var overall = overallScore(location, spread, shape);
    var band = bandFor(overall);
    return {
      a: groupName(a),
      b: groupName(b),
      nA: a && a.n,
      nB: b && b.n,
      location: round1(location),
      spread: round1(spread),
      shape: round1(shape),
      overall: round1(overall),
      locationRaw: location,
      spreadRaw: spread,
      shapeRaw: shape,
      overallRaw: overall,
      band: band.label,
      bandKey: band.key,
      usable: ok && finite(overall)
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

  function groupValues(g, mode) {
    var useZ = mode === 'shape';
    var values = (g && Array.isArray(g.values)) ? g.values : [];
    if (useZ && values.length && finite(g.mean) && finite(g.stdDev)) {
      return standardize(values, g.mean, g.stdDev);
    }
    return values.slice();
  }

  function namedValueGroups(groups, mode, minN) {
    var list = Array.isArray(groups) ? groups : [];
    var named = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var pts = groupValues(list[i], mode);
      if (pts.length >= minN) named.push({ name: groupName(list[i]), values: pts });
    }
    return named;
  }

  function overlayMany(groups, mode) {
    var useZ = mode === 'shape';
    var named = namedValueGroups(groups, mode, 2);
    if (!named.length) {
      return { grid: [], series: [], step: null, mode: useZ ? 'shape' : 'raw' };
    }
    var all = [];
    var hs = [];
    var i;
    for (i = 0; i < named.length; i++) {
      all = all.concat(named[i].values);
      hs.push(silvermanBandwidth(named[i].values));
    }
    var h = Math.max.apply(null, hs);
    var rng = rangeOf(all);
    var spec = makeGrid(rng.min, rng.max, KERNEL_PAD * h, GRID_POINTS);
    return {
      grid: spec.grid,
      series: named.map(function (g) {
        return {
          name: g.name,
          density: normalizeDensity(densityOnGrid(g.values, spec.grid, h), spec.step)
        };
      }),
      step: spec.step,
      mode: useZ ? 'shape' : 'raw'
    };
  }

  function overlaySeries(a, b, mode) {
    var many = overlayMany([a, b], mode);
    var byName = Object.create(null);
    many.series.forEach(function (s) { byName[s.name] = s.density; });
    return {
      grid: many.grid,
      a: (a && byName[groupName(a)]) || (many.series[0] && many.series[0].density) || [],
      b: (b && byName[groupName(b)]) || (many.series[1] && many.series[1].density) || [],
      series: many.series,
      step: many.step,
      mode: many.mode
    };
  }

  function iqrOf(values) {
    var s = values.slice().sort(function (a, b) { return a - b; });
    var n = s.length;
    if (n < 2) return 0;
    function q(p) {
      var pos = (n - 1) * p;
      var i = Math.floor(pos);
      var f = pos - i;
      return s[i + 1] !== undefined ? s[i] + f * (s[i + 1] - s[i]) : s[i];
    }
    return q(0.75) - q(0.25);
  }

  function fdBinWidth(values) {
    var n = values.length;
    if (n < 2) return 1;
    var width = 2 * iqrOf(values) / Math.pow(n, 1 / 3);
    if (!finite(width) || width <= 0) {
      var sd = sampleStd(values);
      width = 3.5 * sd / Math.pow(n, 1 / 3);
    }
    if (!finite(width) || width <= 0) {
      var r = rangeOf(values);
      width = Math.max((r.max - r.min) / 10, 1e-6);
    }
    return width;
  }

  function formatRangeLabel(lo, hi) {
    function edge(v) {
      if (!finite(v)) return '—';
      var abs = Math.abs(v);
      if (Math.abs(v - Math.round(v)) < 1e-6) return String(Math.round(v));
      if (abs >= 10) return v.toFixed(1);
      return v.toFixed(2);
    }
    return edge(lo) + '–' + edge(hi);
  }

  function histogramOverlay(groups, mode) {
    var useZ = mode === 'shape';
    var named = namedValueGroups(groups, mode, 1);
    if (!named.length) {
      return { centers: [], edges: [], labels: [], width: null, series: [], mode: useZ ? 'shape' : 'raw' };
    }
    var all = [];
    var i;
    var j;
    for (i = 0; i < named.length; i++) all = all.concat(named[i].values);
    var rng = rangeOf(all);
    var width = named.reduce(function (minW, g) {
      var w = fdBinWidth(g.values);
      return w < minW ? w : minW;
    }, fdBinWidth(all));
    var span = rng.max - rng.min;
    if (span <= 0) {
      width = Math.max(width, 1);
      rng.min -= width / 2;
      rng.max += width / 2;
      span = rng.max - rng.min;
    }
    var bins = Math.max(8, Math.min(30, Math.ceil(span / width) || 12));
    width = span / bins;
    var edges = new Array(bins + 1);
    for (i = 0; i <= bins; i++) edges[i] = rng.min + i * width;
    var centers = new Array(bins);
    var labels = new Array(bins);
    for (i = 0; i < bins; i++) {
      centers[i] = (edges[i] + edges[i + 1]) / 2;
      labels[i] = formatRangeLabel(edges[i], edges[i + 1]);
    }
    return {
      centers: centers,
      edges: edges,
      labels: labels,
      width: width,
      series: named.map(function (g) {
        var counts = new Array(bins);
        for (i = 0; i < bins; i++) counts[i] = 0;
        for (j = 0; j < g.values.length; j++) {
          var idx = Math.min(bins - 1, Math.max(0, Math.floor((g.values[j] - rng.min) / width)));
          counts[idx] += 1;
        }
        var n = g.values.length || 1;
        return {
          name: g.name,
          counts: counts,
          density: counts.map(function (c) { return c / (n * width); })
        };
      }),
      mode: useZ ? 'shape' : 'raw'
    };
  }

  return {
    locationScore: locationScore,
    spreadScore: spreadScore,
    shapeScore: shapeScore,
    overallScore: overallScore,
    bandFor: bandFor,
    comparePair: comparePair,
    buildProfile: buildProfile,
    overlaySeries: overlaySeries,
    overlayMany: overlayMany,
    histogramOverlay: histogramOverlay,
    overlapCoefficient: overlapCoefficient
  };
});
