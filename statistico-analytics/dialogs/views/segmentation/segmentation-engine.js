/**
 * Survey Segmentation Matrix engine — generic two-dimension quadrant
 * classification, weighted aggregation, group comparison, and wave change.
 *
 * Internal keys stay generic (highXHighY, …). Display labels are config only.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoSegmentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SEGMENT_KEYS = ['highXHighY', 'highXLowY', 'lowXHighY', 'lowXLowY'];
  var STACK_ORDER = ['highXHighY', 'highXLowY', 'lowXHighY', 'lowXLowY'];
  var MAX_GROUPS_COMPACT = 20;
  var EPS = 1e-9;

  var DEFAULT_COLORS = {
    highXHighY: '#5d9a72',
    highXLowY: '#c4922a',
    lowXHighY: '#6b7280',
    lowXLowY: '#c46a4a'
  };

  var DEFAULT_LABELS = {
    highXHighY: 'Truly Loyal',
    highXLowY: 'Accessible',
    lowXHighY: 'Trapped',
    lowXLowY: 'High Risk'
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function defaultConfig() {
    return {
      template: 'employeeLoyalty',
      xDimension: {
        label: 'Satisfaction',
        columns: [],
        thresholdMethod: 'custom',
        threshold: 4,
        highLabel: 'Satisfied',
        lowLabel: 'Not satisfied'
      },
      yDimension: {
        label: 'Intention to stay',
        columns: [],
        thresholdMethod: 'custom',
        threshold: 4,
        highLabel: 'Tending to stay',
        lowLabel: 'Not tending to stay'
      },
      segments: {
        highXHighY: { label: DEFAULT_LABELS.highXHighY, color: DEFAULT_COLORS.highXHighY },
        highXLowY: { label: DEFAULT_LABELS.highXLowY, color: DEFAULT_COLORS.highXLowY },
        lowXHighY: { label: DEFAULT_LABELS.lowXHighY, color: DEFAULT_COLORS.lowXHighY },
        lowXLowY: { label: DEFAULT_LABELS.lowXLowY, color: DEFAULT_COLORS.lowXLowY }
      },
      groupColumn: null,
      waveColumn: null,
      currentWave: null,
      previousWave: null,
      respondentIdColumn: null,
      weightColumn: null,
      minimumValidItems: 0.5,
      smallBaseThreshold: 30,
      filters: {},
      factorColumns: []
    };
  }

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

  function toNumber(v) {
    if (isMissing(v)) return NaN;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'object') {
      if (typeof v.valueOf === 'function') {
        var n = v.valueOf();
        if (typeof n === 'number' && isFinite(n)) return n;
      }
    }
    var s = String(v).trim().replace(/,/g, '');
    if (!s) return NaN;
    var parsed = parseFloat(s);
    return isFinite(parsed) ? parsed : NaN;
  }

  function toWeight(v) {
    var n = toNumber(v);
    return isFinite(n) ? n : NaN;
  }

  function catLabel(v) {
    if (isMissing(v)) return '';
    if (typeof v === 'number' && isFinite(v)) {
      if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
      var t = String(v);
      return t.length > 12 ? v.toPrecision(6) : t;
    }
    return String(v).trim();
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

  function resolveColumns(headers, columns) {
    var names = Array.isArray(columns) ? columns : (columns ? [columns] : []);
    var out = [];
    names.forEach(function (name) {
      var idx = typeof name === 'number' ? name : colIndex(headers, name);
      if (idx >= 0 && idx < headers.length && out.indexOf(idx) < 0) out.push(idx);
    });
    return out;
  }

  function compositeScore(itemValues, minimumValidItems) {
    var total = itemValues.length;
    if (!total) return { score: NaN, validCount: 0, total: 0, excluded: true };
    var valid = [];
    for (var i = 0; i < itemValues.length; i++) {
      var n = toNumber(itemValues[i]);
      if (isFinite(n)) valid.push(n);
    }
    var ratio = typeof minimumValidItems === 'number' ? minimumValidItems : 0.5;
    if (ratio > 1) ratio = 1;
    if (ratio < 0) ratio = 0;
    var ok = valid.length / total >= ratio - EPS;
    if (!ok) return { score: NaN, validCount: valid.length, total: total, excluded: true };
    var sum = 0;
    for (var j = 0; j < valid.length; j++) sum += valid[j];
    return { score: sum / valid.length, validCount: valid.length, total: total, excluded: false };
  }

  function inferScale(values) {
    var nums = [];
    for (var i = 0; i < values.length; i++) {
      var n = toNumber(values[i]);
      if (isFinite(n)) nums.push(n);
    }
    if (!nums.length) {
      return { min: 1, max: 5, integerLike: true, suggestedCustom: 4, midpoint: 3, favorable: 4 };
    }
    var lo = Math.min.apply(null, nums);
    var hi = Math.max.apply(null, nums);
    var integerLike = nums.every(function (n) { return Math.abs(n - Math.round(n)) < 1e-6; });
    var span = hi - lo;
    var midpoint = (lo + hi) / 2;
    var favorable = midpoint;
    if (integerLike && span <= 10 && hi <= 11) {
      var scaleMin = Math.round(lo);
      var scaleMax = Math.round(hi);
      midpoint = (scaleMin + scaleMax) / 2;
      if (scaleMin === 1 && scaleMax === 5) favorable = 4;
      else if (scaleMin === 1 && scaleMax === 7) favorable = 6;
      else if (scaleMin === 0 && scaleMax === 10) favorable = 7;
      else favorable = Math.max(scaleMin, scaleMax - 1);
      return {
        min: scaleMin,
        max: scaleMax,
        integerLike: true,
        suggestedCustom: favorable,
        midpoint: midpoint,
        favorable: favorable
      };
    }
    return {
      min: lo,
      max: hi,
      integerLike: integerLike,
      suggestedCustom: favorable,
      midpoint: midpoint,
      favorable: favorable
    };
  }

  function median(nums) {
    if (!nums.length) return NaN;
    var a = nums.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  function resolveThreshold(method, custom, scores, scale) {
    var m = method || 'custom';
    var sc = scale || inferScale(scores);
    if (m === 'midpoint' || m === 'scaleMidpoint') return sc.midpoint;
    if (m === 'median') return median(scores.filter(function (n) { return isFinite(n); }));
    if (m === 'favorable' || m === 'favorableResponse') return sc.favorable;
    var t = toNumber(custom);
    if (!isFinite(t)) t = sc.suggestedCustom;
    return t;
  }

  function assignSegment(xScore, yScore, xThresh, yThresh) {
    if (!isFinite(xScore) || !isFinite(yScore) || !isFinite(xThresh) || !isFinite(yThresh)) return null;
    var highX = xScore >= xThresh - EPS;
    var highY = yScore >= yThresh - EPS;
    if (highX && highY) return 'highXHighY';
    if (highX && !highY) return 'highXLowY';
    if (!highX && highY) return 'lowXHighY';
    return 'lowXLowY';
  }

  function emptySegmentBucket() {
    return { n: 0, weightedN: 0, pct: 0 };
  }

  function emptySegmentMap() {
    var map = {};
    SEGMENT_KEYS.forEach(function (k) { map[k] = emptySegmentBucket(); });
    return map;
  }

  /**
   * Largest-remainder rounding so displayed 1-decimal percentages sum to 100.0.
   */
  function roundToHundred(pcts, decimals) {
    var d = decimals == null ? 1 : decimals;
    var factor = Math.pow(10, d);
    var keys = Object.keys(pcts);
    var raw = keys.map(function (k) { return { key: k, value: Number(pcts[k]) || 0 }; });
    var sum = raw.reduce(function (s, r) { return s + r.value; }, 0);
    if (sum <= 0) {
      var zero = {};
      keys.forEach(function (k) { zero[k] = 0; });
      return zero;
    }
    raw.forEach(function (r) { r.value = (r.value / sum) * 100; });
    var target = 100 * factor;
    raw.forEach(function (r) {
      r.scaled = r.value * factor;
      r.base = Math.floor(r.scaled + EPS);
      r.frac = r.scaled - r.base;
    });
    var used = raw.reduce(function (s, r) { return s + r.base; }, 0);
    var remain = Math.round(target - used);
    raw.sort(function (a, b) { return b.frac - a.frac; });
    for (var i = 0; i < remain; i++) raw[i].base += 1;
    var out = {};
    raw.forEach(function (r) { out[r.key] = r.base / factor; });
    return out;
  }

  function finalizePercents(map) {
    var raw = {};
    var totalW = 0;
    SEGMENT_KEYS.forEach(function (k) {
      totalW += map[k].weightedN;
      raw[k] = map[k].weightedN;
    });
    var rounded = roundToHundred(raw, 1);
    SEGMENT_KEYS.forEach(function (k) {
      map[k].pct = totalW > 0 ? rounded[k] : 0;
      map[k].rawPct = totalW > 0 ? (map[k].weightedN / totalW) * 100 : 0;
    });
    map._totalN = SEGMENT_KEYS.reduce(function (s, k) { return s + map[k].n; }, 0);
    map._totalW = totalW;
    return map;
  }

  function addToBucket(map, key, weight) {
    if (!map[key]) map[key] = emptySegmentBucket();
    map[key].n += 1;
    map[key].weightedN += weight;
  }

  function applyFilters(rows, headers, filters) {
    if (!filters || !Object.keys(filters).length) return rows.slice();
    var indexes = {};
    Object.keys(filters).forEach(function (col) {
      indexes[col] = colIndex(headers, col);
    });
    return rows.filter(function (row) {
      return Object.keys(filters).every(function (col) {
        var allowed = filters[col];
        if (!allowed || !allowed.length) return true;
        var idx = indexes[col];
        if (idx < 0) return true;
        var lab = catLabel(row[idx]);
        return allowed.indexOf(lab) >= 0;
      });
    });
  }

  function uniqueLabels(rows, idx) {
    var seen = {};
    var out = [];
    rows.forEach(function (row) {
      var lab = catLabel(row[idx]);
      if (!lab) return;
      if (!seen[lab]) {
        seen[lab] = true;
        out.push(lab);
      }
    });
    return out;
  }

  function contrastText(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return '#0f172a';
    var r = parseInt(h.slice(0, 2), 16) / 255;
    var g = parseInt(h.slice(2, 4), 16) / 255;
    var b = parseInt(h.slice(4, 6), 16) / 255;
    var lin = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.45 ? '#0f172a' : '#f8fafc';
  }

  function segmentMeta(config, key) {
    var seg = (config.segments && config.segments[key]) || {};
    var color = seg.color || DEFAULT_COLORS[key];
    return {
      key: key,
      label: seg.label || DEFAULT_LABELS[key],
      color: color,
      textColor: contrastText(color)
    };
  }

  function collectDimensionValues(rows, colIdxs) {
    var vals = [];
    rows.forEach(function (row) {
      colIdxs.forEach(function (idx) {
        vals.push(row[idx]);
      });
    });
    return vals;
  }

  function collectScores(scored, field) {
    var out = [];
    scored.forEach(function (r) {
      if (isFinite(r[field])) out.push(r[field]);
    });
    return out;
  }

  function decorateSegments(map, config, previousMap) {
    var out = {};
    SEGMENT_KEYS.forEach(function (k) {
      var meta = segmentMeta(config, k);
      var prev = previousMap && previousMap[k] ? previousMap[k].pct : null;
      var pct = map[k] ? map[k].pct : 0;
      out[k] = {
        key: k,
        label: meta.label,
        color: meta.color,
        textColor: meta.textColor,
        n: map[k] ? map[k].n : 0,
        weightedN: map[k] ? map[k].weightedN : 0,
        pct: pct,
        rawPct: map[k] ? map[k].rawPct : 0,
        prevPct: prev,
        ppChange: prev == null ? null : Math.round((pct - prev) * 10) / 10
      };
    });
    return out;
  }

  function sortGroups(groups, sortBy, selectedKey) {
    var key = sortBy || (selectedKey ? selectedKey : 'highXHighY');
    var copy = groups.slice();
    copy.sort(function (a, b) {
      if (key === 'name') return String(a.name).localeCompare(String(b.name));
      if (key === 'n' || key === 'sampleSize') return b.n - a.n;
      if (key === 'combinedRisk') {
        var ar = (a.segments.lowXHighY.pct || 0) + (a.segments.lowXLowY.pct || 0);
        var br = (b.segments.lowXHighY.pct || 0) + (b.segments.lowXLowY.pct || 0);
        return br - ar;
      }
      var ak = a.segments[key] ? a.segments[key].pct : 0;
      var bk = b.segments[key] ? b.segments[key].pct : 0;
      if (bk !== ak) return bk - ak;
      return String(a.name).localeCompare(String(b.name));
    });
    return copy;
  }

  function buildExportTable(result) {
    var rows = [];
    function push(groupName, segs, smallBase, n) {
      SEGMENT_KEYS.forEach(function (k) {
        var s = segs[k];
        rows.push({
          Group: groupName,
          Segment: s.label,
          SegmentKey: k,
          UnweightedN: s.n,
          WeightedN: result.weighted ? s.weightedN : null,
          Percentage: s.pct,
          PreviousPercentage: s.prevPct,
          PercentagePointChange: s.ppChange,
          SmallBase: !!smallBase,
          GroupN: n
        });
      });
    }
    push('Overall', result.overall.segments, false, result.totals.nValid);
    (result.groups || []).forEach(function (g) {
      push(g.name, g.segments, g.smallBase, g.n);
    });
    return rows;
  }

  function interpretationSummary(result) {
    if (!result || !result.analyzable) {
      return result && result.error ? String(result.error) : 'No segmentation results are available.';
    }
    var cfg = result.config;
    var segs = result.overall.segments;
    var lines = [];
    lines.push('Survey Segmentation Matrix');
    lines.push(cfg.xDimension.label + ' ≥ ' + result.thresholds.x.toFixed(2) + ' (' + cfg.xDimension.highLabel + ')');
    lines.push(cfg.yDimension.label + ' ≥ ' + result.thresholds.y.toFixed(2) + ' (' + cfg.yDimension.highLabel + ')');
    lines.push('Valid respondents: ' + result.totals.nValid + ' of ' + result.totals.nRows);
    if (result.filtersActive && result.filtersActive.length) {
      lines.push('Active filters: ' + result.filtersActive.join(' · '));
    }
    if (result.waves && result.waves.enabled) {
      lines.push('Current wave: ' + result.waves.current + (result.waves.previous ? '; previous: ' + result.waves.previous : ''));
    }
    SEGMENT_KEYS.forEach(function (k) {
      var s = segs[k];
      var line = s.label + ': ' + s.pct.toFixed(1) + '% (n = ' + s.n + ')';
      if (s.ppChange != null) {
        var sign = s.ppChange > 0 ? '+' : '';
        line += '; ' + sign + s.ppChange.toFixed(1) + ' pp vs previous';
      }
      lines.push(line);
    });
    return lines.join('\n');
  }

  function analyze(headers, rows, spec) {
    var config = Object.assign(defaultConfig(), spec || {});
    config.xDimension = Object.assign(defaultConfig().xDimension, (spec && spec.xDimension) || {});
    config.yDimension = Object.assign(defaultConfig().yDimension, (spec && spec.yDimension) || {});
    config.segments = Object.assign(defaultConfig().segments, (spec && spec.segments) || {});
    SEGMENT_KEYS.forEach(function (k) {
      config.segments[k] = Object.assign(
        { label: DEFAULT_LABELS[k], color: DEFAULT_COLORS[k] },
        (spec && spec.segments && spec.segments[k]) || {},
        config.segments[k]
      );
      if (!config.segments[k].color) config.segments[k].color = DEFAULT_COLORS[k];
      if (!config.segments[k].label) config.segments[k].label = DEFAULT_LABELS[k];
    });

    var warnings = [];
    headers = headers || [];
    rows = Array.isArray(rows) ? rows : [];

    if (!headers.length || !rows.length) {
      return { analyzable: false, error: 'No data selected. Choose a worksheet range with a header row and at least one data row.', warnings: warnings, config: config };
    }

    var xCols = resolveColumns(headers, config.xDimension.columns);
    var yCols = resolveColumns(headers, config.yDimension.columns);
    if (!xCols.length || !yCols.length) {
      return { analyzable: false, error: 'Select at least one numeric column for each dimension.', warnings: warnings, config: config };
    }

    var groupIdx = config.groupColumn ? colIndex(headers, config.groupColumn) : -1;
    var waveIdx = config.waveColumn ? colIndex(headers, config.waveColumn) : -1;
    var idIdx = config.respondentIdColumn ? colIndex(headers, config.respondentIdColumn) : -1;
    var weightIdx = config.weightColumn ? colIndex(headers, config.weightColumn) : -1;
    var weighted = weightIdx >= 0;

    var filteredRows = applyFilters(rows, headers, config.filters);
    var filtersActive = [];
    if (config.filters) {
      Object.keys(config.filters).forEach(function (col) {
        var vals = config.filters[col];
        if (vals && vals.length) filtersActive.push(col + ' = ' + vals.join(', '));
      });
    }

    var xItemValues = collectDimensionValues(filteredRows, xCols);
    var yItemValues = collectDimensionValues(filteredRows, yCols);
    var xNumericShare = xItemValues.filter(function (v) { return isFinite(toNumber(v)); }).length / Math.max(1, xItemValues.length);
    var yNumericShare = yItemValues.filter(function (v) { return isFinite(toNumber(v)); }).length / Math.max(1, yItemValues.length);
    if (xNumericShare < 0.5) warnings.push('Satisfaction dimension columns look mostly non-numeric. Scores use only numeric values.');
    if (yNumericShare < 0.5) warnings.push('Intention-to-stay dimension columns look mostly non-numeric. Scores use only numeric values.');

    var xScale = inferScale(xItemValues);
    var yScale = inferScale(yItemValues);
    if (config.xDimension.threshold == null) config.xDimension.threshold = xScale.suggestedCustom;
    if (config.yDimension.threshold == null) config.yDimension.threshold = yScale.suggestedCustom;

    var minValid = config.minimumValidItems == null ? 0.5 : Number(config.minimumValidItems);
    var smallBase = isFinite(Number(config.smallBaseThreshold)) ? Number(config.smallBaseThreshold) : 30;

    var currentWave = config.currentWave != null && String(config.currentWave) !== '' ? String(config.currentWave) : null;
    var previousWave = config.previousWave != null && String(config.previousWave) !== '' ? String(config.previousWave) : null;
    var waveEnabled = waveIdx >= 0 && !!currentWave;
    if (waveEnabled && previousWave && currentWave === previousWave) {
      warnings.push('Current and previous wave are the same value. Change comparison is disabled.');
      previousWave = null;
    }

    var currentInputCount = filteredRows.length;
    if (waveEnabled) {
      currentInputCount = 0;
      filteredRows.forEach(function (row) {
        if (catLabel(row[waveIdx]) === String(currentWave)) currentInputCount += 1;
      });
    }

    var scored = [];
    var excludedMissing = 0;
    var excludedWeight = 0;
    var weightAllZero = true;
    var idCounts = {};
    var xScores = [];
    var yScores = [];

    filteredRows.forEach(function (row, rowIndex) {
      var xItems = xCols.map(function (i) { return row[i]; });
      var yItems = yCols.map(function (i) { return row[i]; });
      var xs = compositeScore(xItems, minValid);
      var ys = compositeScore(yItems, minValid);
      if (xs.excluded || ys.excluded) {
        excludedMissing += 1;
        return;
      }
      var w = 1;
      if (weighted) {
        w = toWeight(row[weightIdx]);
        if (!isFinite(w) || w < 0) {
          excludedWeight += 1;
          return;
        }
        if (w > 0) weightAllZero = false;
      } else {
        weightAllZero = false;
      }
      var rec = {
        rowIndex: rowIndex,
        xScore: xs.score,
        yScore: ys.score,
        weight: w,
        group: groupIdx >= 0 ? catLabel(row[groupIdx]) : '',
        wave: waveIdx >= 0 ? catLabel(row[waveIdx]) : '',
        id: idIdx >= 0 ? catLabel(row[idIdx]) : ''
      };
      if (rec.id) idCounts[rec.id] = (idCounts[rec.id] || 0) + 1;
      xScores.push(xs.score);
      yScores.push(ys.score);
      scored.push(rec);
    });

    if (weighted && scored.length && weightAllZero) {
      return {
        analyzable: false,
        error: 'All selected weights are zero. Choose a different weight column or clear the weight.',
        warnings: warnings,
        config: config,
        totals: { nRows: filteredRows.length, nValid: 0, nExcluded: filteredRows.length }
      };
    }
    if (weighted && excludedWeight) {
      warnings.push(excludedWeight + ' respondent' + (excludedWeight === 1 ? '' : 's') + ' excluded because of negative or non-numeric weights.');
    }

    var dupIds = Object.keys(idCounts).filter(function (id) { return idCounts[id] > 1; });
    if (dupIds.length) {
      warnings.push('Duplicate respondent IDs were found (' + dupIds.length + ' ID' + (dupIds.length === 1 ? '' : 's') + '). Version 1 still treats each row independently.');
    }

    var xThresh = resolveThreshold(config.xDimension.thresholdMethod, config.xDimension.threshold, xScores, inferScale(xScores.length ? xScores : xItemValues));
    var yThresh = resolveThreshold(config.yDimension.thresholdMethod, config.yDimension.threshold, yScores, inferScale(yScores.length ? yScores : yItemValues));
    config.xDimension.threshold = xThresh;
    config.yDimension.threshold = yThresh;

    var obsX = xScores.length ? { min: Math.min.apply(null, xScores), max: Math.max.apply(null, xScores) } : { min: NaN, max: NaN };
    var obsY = yScores.length ? { min: Math.min.apply(null, yScores), max: Math.max.apply(null, yScores) } : { min: NaN, max: NaN };
    if (isFinite(obsX.min) && (xThresh < obsX.min - EPS || xThresh > obsX.max + EPS)) {
      warnings.push('Satisfaction threshold ' + xThresh.toFixed(2) + ' is outside the observed score range (' + obsX.min.toFixed(2) + '–' + obsX.max.toFixed(2) + ').');
    }
    if (isFinite(obsY.min) && (yThresh < obsY.min - EPS || yThresh > obsY.max + EPS)) {
      warnings.push('Intention-to-stay threshold ' + yThresh.toFixed(2) + ' is outside the observed score range (' + obsY.min.toFixed(2) + '–' + obsY.max.toFixed(2) + ').');
    }

    scored.forEach(function (r) {
      r.segment = assignSegment(r.xScore, r.yScore, xThresh, yThresh);
    });

    function inWave(r, wave) {
      if (!waveEnabled) return true;
      return r.wave === String(wave);
    }

    var currentRows = scored.filter(function (r) { return inWave(r, currentWave || r.wave); });
    if (waveEnabled) currentRows = scored.filter(function (r) { return r.wave === String(currentWave); });
    var previousRows = (waveEnabled && previousWave) ? scored.filter(function (r) { return r.wave === String(previousWave); }) : [];

    if (!currentRows.length) {
      return {
        analyzable: false,
        error: 'No valid respondents after missing-value rules' + (waveEnabled ? ' for the current wave' : '') + '.',
        warnings: warnings,
        config: config,
        totals: { nRows: filteredRows.length, nValid: 0, nExcluded: filteredRows.length, excludedMissing: excludedMissing, excludedWeight: excludedWeight }
      };
    }

    function aggregate(list) {
      var map = emptySegmentMap();
      list.forEach(function (r) { addToBucket(map, r.segment, r.weight); });
      return finalizePercents(map);
    }

    var currentAgg = aggregate(currentRows);
    var previousAgg = previousRows.length ? aggregate(previousRows) : null;
    var overall = {
      n: currentAgg._totalN,
      weightedN: currentAgg._totalW,
      segments: decorateSegments(currentAgg, config, previousAgg)
    };

    var emptyCount = SEGMENT_KEYS.filter(function (k) { return overall.segments[k].n === 0; }).length;
    if (emptyCount) warnings.push(emptyCount + ' empty segment' + (emptyCount === 1 ? '' : 's') + ' (shown as 0.0%).');

    var groups = [];
    var groupWarnings = [];
    if (groupIdx >= 0) {
      var currentNames = uniqueLabels(currentRows.map(function (r) { return [r.group]; }), 0);
      var previousNames = uniqueLabels(previousRows.map(function (r) { return [r.group]; }), 0);
      var allNames = [];
      var seenG = {};
      currentNames.concat(previousNames).forEach(function (n) {
        if (n && !seenG[n]) { seenG[n] = true; allNames.push(n); }
      });
      if (currentNames.length === 1 && previousNames.length <= 1) {
        groupWarnings.push('The group variable has only one valid category. Comparison still shows a single column.');
      }
      if (allNames.length > MAX_GROUPS_COMPACT) {
        groupWarnings.push('More than ' + MAX_GROUPS_COMPACT + ' groups. The comparison chart scrolls horizontally rather than squeezing labels.');
      }
      allNames.forEach(function (name) {
        var cur = currentRows.filter(function (r) { return r.group === name; });
        var prev = previousRows.filter(function (r) { return r.group === name; });
        var comparability = 'ok';
        if (!cur.length && prev.length) comparability = 'missingCurrent';
        else if (cur.length && !prev.length && previousRows.length) comparability = 'new';
        else if (!cur.length && !prev.length) comparability = 'ok';
        var curAgg = cur.length ? aggregate(cur) : finalizePercents(emptySegmentMap());
        var prevAgg = prev.length ? aggregate(prev) : null;
        groups.push({
          name: name,
          n: curAgg._totalN,
          weightedN: curAgg._totalW,
          previousN: prevAgg ? prevAgg._totalN : 0,
          smallBase: curAgg._totalN > 0 && curAgg._totalN < smallBase,
          comparability: comparability,
          inCurrent: cur.length > 0,
          inPrevious: prev.length > 0,
          segments: decorateSegments(curAgg, config, prevAgg)
        });
      });
      warnings = warnings.concat(groupWarnings);
    }

    var filterColumns = headers.filter(function (h) {
      var name = String(h);
      if (config.xDimension.columns.indexOf(name) >= 0) return false;
      if (config.yDimension.columns.indexOf(name) >= 0) return false;
      if (name === config.groupColumn || name === config.waveColumn) return false;
      if (name === config.respondentIdColumn || name === config.weightColumn) return false;
      var idx = colIndex(headers, name);
      var labels = uniqueLabels(filteredRows, idx);
      return labels.length >= 2 && labels.length <= 40;
    });

    var result = {
      analyzable: true,
      error: null,
      warnings: warnings,
      config: config,
      weighted: weighted,
      thresholds: {
        x: xThresh,
        y: yThresh,
        xMethod: config.xDimension.thresholdMethod,
        yMethod: config.yDimension.thresholdMethod,
        xRule: config.xDimension.highLabel + ': score ≥ ' + Number(xThresh).toFixed(2),
        yRule: config.yDimension.highLabel + ': score ≥ ' + Number(yThresh).toFixed(2)
      },
      scales: { x: xScale, y: yScale, observedX: obsX, observedY: obsY },
      totals: {
        nRows: currentInputCount,
        nSource: rows.length,
        nValid: overall.n,
        nExcluded: currentInputCount - overall.n,
        excludedMissing: excludedMissing,
        excludedWeight: excludedWeight,
        weightedN: overall.weightedN,
        previousValid: previousAgg ? previousAgg._totalN : 0
      },
      overall: overall,
      groups: groups,
      groupCount: groups.length,
      waves: {
        enabled: !!(waveEnabled && previousWave && previousRows.length),
        configured: waveEnabled,
        current: currentWave,
        previous: previousWave,
        labels: waveIdx >= 0 ? uniqueLabels(filteredRows, waveIdx) : []
      },
      filtersActive: filtersActive,
      filterColumns: filterColumns,
      respondents: scored,
      stackOrder: STACK_ORDER.slice(),
      segmentKeys: SEGMENT_KEYS.slice()
    };
    result.exportTable = buildExportTable(result);
    result.summary = interpretationSummary(result);
    return result;
  }

  function relabel(result, segments) {
    if (!result || !result.analyzable) return result;
    var next = clone(result);
    next.config.segments = Object.assign({}, next.config.segments, segments || {});
    SEGMENT_KEYS.forEach(function (k) {
      next.config.segments[k] = Object.assign({}, defaultConfig().segments[k], next.config.segments[k]);
    });
    function apply(map) {
      SEGMENT_KEYS.forEach(function (k) {
        var meta = segmentMeta(next.config, k);
        map[k].label = meta.label;
        map[k].color = meta.color;
        map[k].textColor = meta.textColor;
      });
    }
    apply(next.overall.segments);
    (next.groups || []).forEach(function (g) { apply(g.segments); });
    next.exportTable = buildExportTable(next);
    next.summary = interpretationSummary(next);
    return next;
  }

  return {
    SEGMENT_KEYS: SEGMENT_KEYS,
    STACK_ORDER: STACK_ORDER,
    DEFAULT_COLORS: DEFAULT_COLORS,
    DEFAULT_LABELS: DEFAULT_LABELS,
    MAX_GROUPS_COMPACT: MAX_GROUPS_COMPACT,
    defaultConfig: defaultConfig,
    isMissing: isMissing,
    toNumber: toNumber,
    toWeight: toWeight,
    catLabel: catLabel,
    colIndex: colIndex,
    compositeScore: compositeScore,
    inferScale: inferScale,
    resolveThreshold: resolveThreshold,
    assignSegment: assignSegment,
    roundToHundred: roundToHundred,
    applyFilters: applyFilters,
    sortGroups: sortGroups,
    contrastText: contrastText,
    analyze: analyze,
    relabel: relabel,
    interpretationSummary: interpretationSummary,
    buildExportTable: buildExportTable
  };
});
