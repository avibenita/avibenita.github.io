/**
 * Survey Segmentation Matrix engine.
 *
 * Pure functions: composite scores, thresholds, quadrant assignment,
 * weighted aggregation, group and wave comparison. No DOM or chart code.
 *
 * Quadrant keys are generic (highXHighY, highXLowY, lowXHighY, lowXLowY).
 * Display labels such as "Truly Loyal" are configuration only.
 *
 * Excel assumptions are documented on StatisticoSegmentation.ASSUMPTIONS.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoSegmentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STACK_ORDER = ['highXHighY', 'highXLowY', 'lowXHighY', 'lowXLowY'];
  var QUADRANT_KEYS = STACK_ORDER.slice();

  var DEFAULT_COLORS = {
    highXHighY: '#2f9e62',
    highXLowY: '#c4922a',
    lowXHighY: '#6b7280',
    lowXLowY: '#c4725a'
  };

  var ASSUMPTIONS = [
    'The first row is column headers and each following row is one respondent.',
    'Dimension items are numeric survey scores. Blank cells, NA, and Excel errors are missing and are not replaced with zero.',
    'A dimension score is the arithmetic mean of the respondent’s valid items on that dimension.',
    'A score exactly equal to the threshold is classified as high.',
    'When a survey wave is set, Overview and Group Comparison use the current wave. Thresholds are shared across both waves.',
    'With no weight column, every valid respondent has weight 1. Non-positive or non-numeric weights are excluded.',
    'Duplicate respondent IDs are kept as separate rows and reported as a warning.'
  ];

  function isMissing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'number' && !isFinite(v)) return true;
    if (typeof v === 'object') {
      if (v.error != null) return isMissing(v.error);
      return false;
    }
    var s = String(v).trim();
    if (!s) return true;
    var u = s.toUpperCase();
    if (u === 'NA' || u === 'N/A' || u === '#N/A' || u === '#NA' || u === 'NULL' || u === '.' || u === 'NAN') return true;
    if (u.charAt(0) === '#' && (u === '#NULL!' || u === '#VALUE!' || u === '#REF!' || u === '#DIV/0!' || u === '#NAME?' || u === '#NUM!')) return true;
    return false;
  }

  function toNumber(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'boolean' || v == null) return null;
    var s = String(v).trim().replace(/\s/g, '');
    if (!s || isMissing(s)) return null;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function cellText(v) {
    if (isMissing(v)) return '';
    return String(v).trim();
  }

  function defaultConfig() {
    return {
      template: 'employeeLoyalty',
      product: 'loyalty',
      title: 'Loyalty Matrix',
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
        highXHighY: { label: 'Truly Loyal', color: DEFAULT_COLORS.highXHighY },
        highXLowY: { label: 'Accessible', color: DEFAULT_COLORS.highXLowY },
        lowXHighY: { label: 'Trapped', color: DEFAULT_COLORS.lowXHighY },
        lowXLowY: { label: 'High Risk', color: DEFAULT_COLORS.lowXLowY }
      },
      groupColumn: null,
      waveColumn: null,
      currentWave: null,
      previousWave: null,
      respondentIdColumn: null,
      weightColumn: null,
      factorColumns: [],
      factors: [],
      minimumValidItems: 0.5,
      smallBaseThreshold: 30,
      filters: {}
    };
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  var SPLIT_HIGH_LABEL = 'Highest score';
  var SPLIT_LOW_LABEL = 'Lower score';

  function applySplitLegendDefaults(spec) {
    if (!spec || spec.product !== 'split' || !spec.yDimension || spec.legendLabelsCustom) return spec;
    var high = spec.yDimension.highLabel;
    var low = spec.yDimension.lowLabel;
    if (!high || high === 'Tending to stay') spec.yDimension.highLabel = SPLIT_HIGH_LABEL;
    if (!low || low === 'Not tending to stay') spec.yDimension.lowLabel = SPLIT_LOW_LABEL;
    return spec;
  }

  function normalizeConfig(config) {
    var base = defaultConfig();
    var c = config || {};
    var out = clone(base);
    out.template = c.template || base.template;
    out.product = c.product === 'split' ? 'split' : 'loyalty';
    out.title = c.title ? String(c.title) : (out.product === 'split' ? 'Split Index™' : 'Loyalty Matrix');
    out.chartTitle = c.chartTitle ? String(c.chartTitle) : '';
    out.chartSubtitle = c.chartSubtitle ? String(c.chartSubtitle) : '';
    out.legendLabelsCustom = !!c.legendLabelsCustom;
    ['xDimension', 'yDimension'].forEach(function (key) {
      var src = c[key] || {};
      out[key].label = src.label || base[key].label;
      out[key].columns = Array.isArray(src.columns) ? src.columns.slice() : [];
      out[key].thresholdMethod = src.thresholdMethod || 'custom';
      out[key].threshold = src.threshold == null || src.threshold === '' ? null : Number(src.threshold);
      out[key].highLabel = src.highLabel || base[key].highLabel;
      out[key].lowLabel = src.lowLabel || base[key].lowLabel;
    });
    applySplitLegendDefaults(out);
    QUADRANT_KEYS.forEach(function (key) {
      var src = (c.segments && c.segments[key]) || {};
      if (src.label) out.segments[key].label = String(src.label);
      if (src.color) out.segments[key].color = String(src.color);
    });
    out.groupColumn = c.groupColumn || null;
    out.waveColumn = c.waveColumn || null;
    out.currentWave = c.currentWave == null || c.currentWave === '' ? null : String(c.currentWave);
    out.previousWave = c.previousWave == null || c.previousWave === '' ? null : String(c.previousWave);
    out.respondentIdColumn = c.respondentIdColumn || null;
    out.weightColumn = c.weightColumn || null;
    out.factorColumns = Array.isArray(c.factorColumns) ? c.factorColumns.filter(Boolean).map(function (name) { return String(name); }) : [];
    out.factors = Array.isArray(c.factors) ? c.factors.map(function (factor, index) {
      var columns = factor && Array.isArray(factor.columns) ? factor.columns.filter(Boolean).map(function (name) { return String(name); }) : [];
      return {
        id: factor && factor.id ? String(factor.id) : (columns.join('+') || ('factor' + (index + 1))),
        label: factor && factor.label ? String(factor.label) : (columns.join(' + ') || ('Factor ' + (index + 1))),
        columns: columns
      };
    }).filter(function (factor) { return factor.columns.length; }) : [];
    var minItems = Number(c.minimumValidItems);
    out.minimumValidItems = isFinite(minItems) && minItems > 0 ? Math.min(1, minItems) : 0.5;
    var small = Number(c.smallBaseThreshold);
    out.smallBaseThreshold = isFinite(small) && small >= 0 ? small : 30;
    out.filters = {};
    var filters = c.filters || {};
    Object.keys(filters).forEach(function (name) {
      var list = filters[name];
      if (Array.isArray(list) && list.length) out.filters[name] = list.map(function (v) { return String(v); });
    });
    return out;
  }

  function headerIndex(headers, name) {
    if (name == null || name === '') return -1;
    var target = String(name);
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === target) return i;
    }
    return -1;
  }

  function requiredCount(nItems, fraction) {
    var n = nItems | 0;
    if (n <= 0) return 1;
    var f = Number(fraction);
    if (!isFinite(f) || f <= 0) f = 0.5;
    if (f > 1) f = 1;
    return Math.ceil(f * n - 1e-9);
  }

  function compositeScore(values, fraction) {
    var nums = [];
    var nonNumeric = 0;
    (values || []).forEach(function (v) {
      if (isMissing(v)) return;
      var n = toNumber(v);
      if (n == null) {
        nonNumeric += 1;
        return;
      }
      nums.push(n);
    });
    var need = requiredCount(values ? values.length : 0, fraction);
    var sum = 0;
    nums.forEach(function (n) { sum += n; });
    return {
      score: nums.length ? sum / nums.length : null,
      validCount: nums.length,
      nItems: values ? values.length : 0,
      required: need,
      ok: nums.length >= need && nums.length > 0,
      nonNumeric: nonNumeric
    };
  }

  function inferScale(values) {
    if (!values || !values.length) return null;
    var min = values[0];
    var max = values[0];
    values.forEach(function (n) {
      if (n < min) min = n;
      if (n > max) max = n;
    });
    function within(a, b) { return min >= a - 1e-6 && max <= b + 1e-6; }
    if (within(1, 5)) return { min: 1, max: 5, known: true };
    if (within(1, 7)) return { min: 1, max: 7, known: true };
    if (within(1, 6)) return { min: 1, max: 6, known: true };
    if (within(0, 10)) return { min: 0, max: 10, known: true };
    if (within(1, 10)) return { min: 1, max: 10, known: true };
    if (within(0, 100) && max > 10) return { min: 0, max: 100, known: true };
    return { min: min, max: max, known: false };
  }

  function favorableCut(scale) {
    if (!scale) return null;
    if (scale.max === 100 && scale.min === 0) return 75;
    if (scale.max - scale.min >= 2) return scale.max - 1;
    return (scale.min + scale.max) / 2;
  }

  function median(values) {
    if (!values || !values.length) return null;
    var a = values.slice().sort(function (x, y) { return x - y; });
    var n = a.length;
    var mid = Math.floor(n / 2);
    if (n % 2) return a[mid];
    return (a[mid - 1] + a[mid]) / 2;
  }

  function resolveThreshold(method, custom, values) {
    var nums = (values || []).filter(function (n) { return typeof n === 'number' && isFinite(n); });
    var scale = inferScale(nums);
    var fav = favorableCut(scale);
    var mid = scale ? (scale.min + scale.max) / 2 : null;
    var med = median(nums);
    var chosen;
    var used = method || 'custom';
    if (used === 'median') chosen = med;
    else if (used === 'midpoint') chosen = mid;
    else if (used === 'favorable') chosen = fav;
    else {
      used = 'custom';
      chosen = custom != null && isFinite(Number(custom)) ? Number(custom) : fav;
    }
    if (chosen == null || !isFinite(chosen)) chosen = med != null ? med : 0;
    var outside = false;
    if (scale && scale.known) outside = chosen < scale.min - 1e-9 || chosen > scale.max + 1e-9;
    else if (nums.length) outside = chosen < Math.min.apply(null, nums) - 1e-9 || chosen > Math.max.apply(null, nums) + 1e-9;
    return {
      method: used,
      threshold: chosen,
      scale: scale,
      outside: outside,
      observedMin: nums.length ? Math.min.apply(null, nums) : null,
      observedMax: nums.length ? Math.max.apply(null, nums) : null
    };
  }

  function classify(xScore, yScore, xThreshold, yThreshold) {
    var xHigh = xScore >= xThreshold;
    var yHigh = yScore >= yThreshold;
    if (xHigh && yHigh) return 'highXHighY';
    if (xHigh && !yHigh) return 'highXLowY';
    if (!xHigh && yHigh) return 'lowXHighY';
    return 'lowXLowY';
  }

  function columnMostlyNumeric(headers, rows, name) {
    var idx = headerIndex(headers, name);
    if (idx < 0) return { ok: false, reason: 'missing', index: -1, values: [] };
    var numeric = 0;
    var present = 0;
    var values = [];
    rows.forEach(function (row) {
      var v = row[idx];
      if (isMissing(v)) return;
      present += 1;
      var n = toNumber(v);
      if (n == null) return;
      numeric += 1;
      values.push(n);
    });
    if (present === 0) return { ok: true, index: idx, values: values, present: 0, numeric: 0, empty: true };
    var ok = numeric / present >= 0.8 && values.length > 0;
    return { ok: ok, index: idx, values: values, present: present, numeric: numeric };
  }

  function profileColumns(headers, rows) {
    return (headers || []).map(function (name, index) {
      var numeric = 0;
      var present = 0;
      var levels = {};
      (rows || []).forEach(function (row) {
        var v = row[index];
        if (isMissing(v)) return;
        present += 1;
        var n = toNumber(v);
        if (n != null) numeric += 1;
        var key = cellText(v);
        if (key) levels[key] = (levels[key] || 0) + 1;
      });
      var nLevels = Object.keys(levels).length;
      return {
        name: String(name),
        index: index,
        numeric: present > 0 && numeric / present >= 0.8,
        n: present,
        nLevels: nLevels,
        categorical: nLevels >= 1 && nLevels <= 30 && !(present > 0 && numeric === present && nLevels > 12)
      };
    });
  }

  function applyCategoricalFilters(headers, rows, filters) {
    var spec = filters || {};
    var rules = [];
    Object.keys(spec).forEach(function (name) {
      var allowed = spec[name];
      if (!Array.isArray(allowed) || !allowed.length) return;
      var idx = headerIndex(headers, name);
      if (idx < 0) return;
      var set = {};
      allowed.forEach(function (v) { set[String(v)] = true; });
      rules.push({ index: idx, set: set });
    });
    if (!rules.length) return (rows || []).slice();
    return (rows || []).filter(function (row) {
      for (var i = 0; i < rules.length; i++) {
        if (!rules[i].set[cellText(row[rules[i].index])]) return false;
      }
      return true;
    });
  }

  function formatNum(n) {
    if (n == null || !isFinite(n)) return '—';
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  function round1(n) {
    if (n == null || !isFinite(n)) return 0;
    return Math.round(n * 10) / 10;
  }

  function formatPct(n) {
    return round1(n).toFixed(1) + '%';
  }

  function formatPp(n) {
    var r = round1(n);
    var body = r.toFixed(1);
    if (r > 0) body = '+' + body;
    return body + ' pp';
  }

  function emptySegmentBucket() {
    var out = {};
    QUADRANT_KEYS.forEach(function (key) {
      out[key] = { key: key, n: 0, weight: 0, pct: 0 };
    });
    return out;
  }

  function pctOf(part, whole) {
    if (!whole) return 0;
    return (part / whole) * 100;
  }

  function fillPercents(bucket, weightUsed, validN, validWeight) {
    var denom = weightUsed ? validWeight : validN;
    QUADRANT_KEYS.forEach(function (key) {
      var part = weightUsed ? bucket[key].weight : bucket[key].n;
      bucket[key].pct = pctOf(part, denom);
    });
    return bucket;
  }

  function roundedSum(bucket) {
    var sum = 0;
    QUADRANT_KEYS.forEach(function (key) { sum += round1(bucket[key].pct); });
    return Math.round(sum * 10) / 10;
  }

  function ruleText(highLabel, threshold) {
    return highLabel + ': score ≥ ' + formatNum(threshold);
  }

  function waveLabel(v) {
    return cellText(v);
  }

  function inferWavePair(values) {
    var seen = {};
    var list = [];
    values.forEach(function (v) {
      var key = waveLabel(v);
      if (!key || seen[key]) return;
      seen[key] = true;
      list.push(key);
    });
    if (list.length < 2) return { values: list, current: list[0] || null, previous: null };
    var sorted = list.slice().sort(function (a, b) {
      var na = toNumber(a);
      var nb = toNumber(b);
      if (na != null && nb != null) return na - nb;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    return {
      values: sorted,
      current: sorted[sorted.length - 1],
      previous: sorted[sorted.length - 2]
    };
  }

  function collectColumnValues(headers, rows, name) {
    var idx = headerIndex(headers, name);
    var values = [];
    if (idx < 0) return values;
    rows.forEach(function (row) {
      if (!isMissing(row[idx])) values.push(row[idx]);
    });
    return values;
  }

  function factorDefinitions(config) {
    if (config && Array.isArray(config.factors) && config.factors.length) {
      return config.factors.map(function (factor, index) {
        var columns = Array.isArray(factor.columns) ? factor.columns.slice() : [];
        return {
          id: factor.id || columns.join('+') || ('factor' + (index + 1)),
          label: factor.label || columns.join(' + ') || ('Factor ' + (index + 1)),
          columns: columns,
          originalOrder: index
        };
      });
    }
    return ((config && config.factorColumns) || []).map(function (name, index) {
      return { id: String(name), label: String(name), columns: [String(name)], originalOrder: index };
    });
  }

  function scoreRespondents(headers, rows, config) {
    var xIdx = config.xDimension.columns.map(function (name) { return headerIndex(headers, name); });
    var yIdx = config.yDimension.columns.map(function (name) { return headerIndex(headers, name); });
    var gIdx = headerIndex(headers, config.groupColumn);
    var wIdx = headerIndex(headers, config.waveColumn);
    var idIdx = headerIndex(headers, config.respondentIdColumn);
    var wtIdx = headerIndex(headers, config.weightColumn);
    var factorDefs = factorDefinitions(config);
    var respondents = [];
    var excluded = { items: 0, weight: 0, zeroWeight: 0, negativeWeight: 0, nonNumericWeight: 0 };
    var xValues = [];
    var yValues = [];

    var needX = config.xDimension.columns.length > 0;
    var needY = config.yDimension.columns.length > 0;
    rows.forEach(function (row, index) {
      var xParts = xIdx.map(function (i) { return i < 0 ? null : row[i]; });
      var yParts = yIdx.map(function (i) { return i < 0 ? null : row[i]; });
      var x = compositeScore(xParts, config.minimumValidItems);
      var y = compositeScore(yParts, config.minimumValidItems);
      if ((!needX && !needY) || (needX && !x.ok) || (needY && !y.ok)) {
        excluded.items += 1;
        return;
      }
      var weight = 1;
      if (wtIdx >= 0) {
        var rawW = row[wtIdx];
        if (isMissing(rawW)) {
          excluded.weight += 1;
          excluded.nonNumericWeight += 1;
          return;
        }
        var parsed = toNumber(rawW);
        if (parsed == null) {
          excluded.weight += 1;
          excluded.nonNumericWeight += 1;
          return;
        }
        if (parsed < 0) {
          excluded.weight += 1;
          excluded.negativeWeight += 1;
          return;
        }
        if (parsed === 0) {
          excluded.weight += 1;
          excluded.zeroWeight += 1;
          return;
        }
        weight = parsed;
      }
      if (x.ok) xValues.push(x.score);
      if (y.ok) yValues.push(y.score);
      var factorScores = {};
      factorDefs.forEach(function (factor) {
        var parts = factor.columns.map(function (name) {
          var idx = headerIndex(headers, name);
          return idx < 0 ? null : row[idx];
        });
        var scored = compositeScore(parts, config.minimumValidItems);
        factorScores[factor.id] = scored.ok ? scored.score : null;
      });
      respondents.push({
        index: index,
        id: idIdx >= 0 ? cellText(row[idIdx]) : '',
        xScore: x.score,
        yScore: y.score,
        xValidCount: x.validCount,
        yValidCount: y.validCount,
        weight: weight,
        group: gIdx >= 0 ? (cellText(row[gIdx]) || '(Missing)') : null,
        wave: wIdx >= 0 ? waveLabel(row[wIdx]) : null,
        factorScores: factorScores
      });
    });

    return {
      respondents: respondents,
      excluded: excluded,
      xValues: xValues,
      yValues: yValues
    };
  }

  function assignSegments(respondents, xThreshold, yThreshold) {
    respondents.forEach(function (r) {
      r.segment = classify(r.xScore, r.yScore, xThreshold, yThreshold);
    });
  }

  function duplicateIdCount(respondents) {
    var counts = {};
    var dupes = 0;
    respondents.forEach(function (r) {
      if (!r.id) return;
      counts[r.id] = (counts[r.id] || 0) + 1;
    });
    Object.keys(counts).forEach(function (id) {
      if (counts[id] > 1) dupes += 1;
    });
    return dupes;
  }

  function aggregate(respondents, weightUsed) {
    var bucket = emptySegmentBucket();
    var validN = respondents.length;
    var validWeight = 0;
    respondents.forEach(function (r) {
      validWeight += r.weight;
      var cell = bucket[r.segment];
      if (!cell) return;
      cell.n += 1;
      cell.weight += r.weight;
    });
    fillPercents(bucket, weightUsed, validN, validWeight);
    return { segments: bucket, validN: validN, validWeight: validWeight };
  }

  function aggregateGroups(respondents, weightUsed, smallBase) {
    var map = {};
    var order = [];
    respondents.forEach(function (r) {
      var name = r.group == null ? '(All)' : r.group;
      if (!map[name]) {
        map[name] = [];
        order.push(name);
      }
      map[name].push(r);
    });
    return order.map(function (name) {
      var agg = aggregate(map[name], weightUsed);
      return {
        name: name,
        n: agg.validN,
        weight: agg.validWeight,
        small: agg.validN < smallBase,
        segments: agg.segments
      };
    });
  }

  function segmentChange(current, previous) {
    var out = {};
    QUADRANT_KEYS.forEach(function (key) {
      var cur = current && current.segments ? current.segments[key] : null;
      var prev = previous && previous.segments ? previous.segments[key] : null;
      var currentPct = cur ? cur.pct : 0;
      var previousPct = prev ? prev.pct : 0;
      out[key] = {
        key: key,
        currentPct: currentPct,
        previousPct: previousPct,
        pp: currentPct - previousPct,
        currentN: cur ? cur.n : 0,
        previousN: prev ? prev.n : 0,
        currentWeight: cur ? cur.weight : 0,
        previousWeight: prev ? prev.weight : 0
      };
    });
    return out;
  }

  function groupChange(currentGroups, previousGroups) {
    var names = {};
    currentGroups.forEach(function (g) { names[g.name] = true; });
    previousGroups.forEach(function (g) { names[g.name] = true; });
    var curMap = {};
    var prevMap = {};
    currentGroups.forEach(function (g) { curMap[g.name] = g; });
    previousGroups.forEach(function (g) { prevMap[g.name] = g; });
    return Object.keys(names).map(function (name) {
      var cur = curMap[name] || null;
      var prev = prevMap[name] || null;
      var status = 'both';
      var statusLabel = '';
      if (cur && !prev) {
        status = 'new';
        statusLabel = 'New group';
      } else if (!cur && prev) {
        status = 'previous-only';
        statusLabel = 'Not available in current wave';
      }
      var segments = {};
      QUADRANT_KEYS.forEach(function (key) {
        if (!cur || !prev) {
          segments[key] = {
            key: key,
            currentPct: cur ? cur.segments[key].pct : null,
            previousPct: prev ? prev.segments[key].pct : null,
            pp: null,
            currentN: cur ? cur.segments[key].n : null,
            previousN: prev ? prev.segments[key].n : null
          };
        } else {
          segments[key] = {
            key: key,
            currentPct: cur.segments[key].pct,
            previousPct: prev.segments[key].pct,
            pp: cur.segments[key].pct - prev.segments[key].pct,
            currentN: cur.segments[key].n,
            previousN: prev.segments[key].n
          };
        }
      });
      if (cur && !prev) statusLabel = 'New group — not available in previous wave';
      return {
        name: name,
        status: status,
        statusLabel: statusLabel,
        currentN: cur ? cur.n : null,
        previousN: prev ? prev.n : null,
        small: cur ? cur.small : (prev ? prev.small : false),
        segments: segments
      };
    });
  }

  function sortGroups(groups, mode, segmentKey) {
    var list = (groups || []).slice();
    var key = segmentKey || 'highXHighY';
    function pct(g, k) {
      if (!g || !g.segments || !g.segments[k]) return 0;
      return g.segments[k].pct || 0;
    }
    var sortKey = QUADRANT_KEYS.indexOf(mode) >= 0 ? mode : key;
    list.sort(function (a, b) {
      var d = 0;
      if (mode === 'name') d = String(a.name).localeCompare(String(b.name));
      else if (mode === 'n') d = (b.n || 0) - (a.n || 0);
      else if (mode === 'combinedRisk') d = (pct(b, 'lowXHighY') + pct(b, 'lowXLowY')) - (pct(a, 'lowXHighY') + pct(a, 'lowXLowY'));
      else d = pct(b, sortKey) - pct(a, sortKey);
      if (d) return d;
      return String(a.name).localeCompare(String(b.name));
    });
    return list;
  }

  function filterDescription(filters) {
    var parts = [];
    Object.keys(filters || {}).forEach(function (name) {
      var list = filters[name];
      if (!list || !list.length) return;
      parts.push(name + ' = ' + list.join(', '));
    });
    return parts.join(' · ');
  }

  function analyze(headers, rows, config) {
    var cfg = normalizeConfig(config);
    var warnings = [];
    var sourceHeaders = Array.isArray(headers) ? headers : [];
    var sourceRows = Array.isArray(rows) ? rows : [];
    if (!sourceHeaders.length || !sourceRows.length) {
      return { ok: false, error: 'No data selected. Choose an Excel range with a header row and respondent rows.', warnings: warnings, config: cfg };
    }
    var splitWithFactors = cfg.product === 'split' && (cfg.factorColumns.length > 0 || cfg.factors.length > 0);
    if (splitWithFactors) {
      if (!cfg.yDimension.columns.length) {
        return { ok: false, error: 'Select the outcome dimension and at least one factor.', warnings: warnings, config: cfg };
      }
    } else if (!cfg.xDimension.columns.length || !cfg.yDimension.columns.length) {
      return { ok: false, error: 'Select at least one numeric column for each dimension.', warnings: warnings, config: cfg };
    }

    var filteredRows = applyCategoricalFilters(sourceHeaders, sourceRows, cfg.filters);
    if (!filteredRows.length) {
      return { ok: false, error: 'No respondents remain after the active filters.', warnings: warnings, config: cfg, filterDescription: filterDescription(cfg.filters) };
    }

    var missingCols = [];
    cfg.xDimension.columns.concat(cfg.yDimension.columns).forEach(function (name) {
      if (headerIndex(sourceHeaders, name) < 0) missingCols.push(name);
    });
    if (missingCols.length) {
      return { ok: false, error: 'These columns are not in the selected range: ' + missingCols.join(', ') + '.', warnings: warnings, config: cfg };
    }

    var nonNumeric = [];
    cfg.xDimension.columns.concat(cfg.yDimension.columns).forEach(function (name) {
      var profile = columnMostlyNumeric(sourceHeaders, filteredRows, name);
      if (!profile.ok) nonNumeric.push(name);
    });
    if (nonNumeric.length) {
      return {
        ok: false,
        error: 'Non-numeric dimension column' + (nonNumeric.length > 1 ? 's' : '') + ': ' + nonNumeric.join(', ') + '. Choose numeric survey items.',
        warnings: warnings,
        config: cfg
      };
    }

    var scoredAll = scoreRespondents(sourceHeaders, filteredRows, cfg);
    if (cfg.weightColumn && scoredAll.excluded.zeroWeight && !scoredAll.respondents.length && scoredAll.excluded.negativeWeight === 0 && scoredAll.excluded.nonNumericWeight === 0) {
      return { ok: false, error: 'All weights equal zero. Choose a weight column with positive values, or leave weight unset.', warnings: warnings, config: cfg };
    }
    if (cfg.weightColumn && !scoredAll.respondents.length && (scoredAll.excluded.negativeWeight || scoredAll.excluded.nonNumericWeight || scoredAll.excluded.zeroWeight)) {
      return { ok: false, error: 'No valid positive weights remain. Negative, zero, and non-numeric weights are excluded.', warnings: warnings, config: cfg };
    }
    if (!scoredAll.respondents.length) {
      return {
        ok: false,
        error: 'No valid respondents after the missing-item rule. A respondent needs enough answered items on both dimensions. Missing answers are not treated as zero.',
        warnings: warnings,
        config: cfg
      };
    }

    var xResolved = resolveThreshold(cfg.xDimension.thresholdMethod, cfg.xDimension.threshold, scoredAll.xValues);
    var yResolved = resolveThreshold(cfg.yDimension.thresholdMethod, cfg.yDimension.threshold, scoredAll.yValues);
    cfg.xDimension.threshold = xResolved.threshold;
    cfg.xDimension.thresholdMethod = xResolved.method;
    cfg.yDimension.threshold = yResolved.threshold;
    cfg.yDimension.thresholdMethod = yResolved.method;
    assignSegments(scoredAll.respondents, xResolved.threshold, yResolved.threshold);

    if (cfg.xDimension.columns.length && xResolved.outside) warnings.push(cfg.xDimension.label + ' threshold ' + formatNum(xResolved.threshold) + ' is outside the observed scale.');
    if (cfg.yDimension.columns.length && yResolved.outside) warnings.push(cfg.yDimension.label + ' threshold ' + formatNum(yResolved.threshold) + ' is outside the observed scale.');
    if (scoredAll.excluded.negativeWeight) warnings.push(scoredAll.excluded.negativeWeight + ' respondent' + (scoredAll.excluded.negativeWeight === 1 ? '' : 's') + ' excluded because the weight is negative.');
    if (scoredAll.excluded.nonNumericWeight) warnings.push(scoredAll.excluded.nonNumericWeight + ' respondent' + (scoredAll.excluded.nonNumericWeight === 1 ? '' : 's') + ' excluded because the weight is missing or not numeric.');
    if (scoredAll.excluded.zeroWeight) warnings.push(scoredAll.excluded.zeroWeight + ' respondent' + (scoredAll.excluded.zeroWeight === 1 ? '' : 's') + ' excluded because the weight is zero.');

    var dupes = duplicateIdCount(scoredAll.respondents);
    if (dupes) warnings.push(dupes + (dupes === 1 ? ' respondent ID appears' : ' respondent IDs appear') + ' more than once. Each row is kept as a separate respondent.');

    var waveConfigured = !!(cfg.waveColumn && cfg.currentWave);
    if (cfg.waveColumn && cfg.currentWave && cfg.previousWave && cfg.currentWave === cfg.previousWave) {
      warnings.push('Current and previous wave are the same value. Change is not calculated.');
      waveConfigured = true;
      cfg.previousWave = null;
    }

    var scope = scoredAll.respondents;
    var previousRows = [];
    var scopeLabel = 'All respondents';
    if (cfg.waveColumn && cfg.currentWave) {
      scope = scoredAll.respondents.filter(function (r) { return r.wave === cfg.currentWave; });
      scopeLabel = cfg.currentWave;
      if (cfg.previousWave) {
        previousRows = scoredAll.respondents.filter(function (r) { return r.wave === cfg.previousWave; });
      }
      if (!scope.length) {
        return { ok: false, error: 'No valid respondents in the current wave (“' + cfg.currentWave + '”).', warnings: warnings, config: cfg };
      }
      if (cfg.previousWave && !previousRows.length) {
        warnings.push('No valid respondents in the previous wave (“' + cfg.previousWave + '”). Change is hidden.');
        cfg.previousWave = null;
        previousRows = [];
      }
    }

    var weightUsed = !!cfg.weightColumn;
    var overall = aggregate(scope, weightUsed);
    var groups = cfg.groupColumn ? aggregateGroups(scope, weightUsed, cfg.smallBaseThreshold) : [];
    var previous = previousRows.length ? aggregate(previousRows, weightUsed) : null;
    var previousGroups = previous && cfg.groupColumn ? aggregateGroups(previousRows, weightUsed, cfg.smallBaseThreshold) : [];

    if (cfg.groupColumn && groups.length === 1) {
      warnings.push('The group variable has only one category (' + groups[0].name + '). A comparison needs at least two groups.');
    }
    if (groups.length > 20) {
      warnings.push(groups.length + ' groups. The chart scrolls so the labels stay readable.');
    }
    var emptySegments = QUADRANT_KEYS.filter(function (key) { return overall.segments[key].n === 0; });
    var roundingNote = roundedSum(overall.segments) !== 100;

    var change = null;
    if (previous) {
      change = {
        overall: segmentChange(overall, previous),
        groups: cfg.groupColumn ? groupChange(groups, previousGroups) : []
      };
    }

    var scopedInput = filteredRows;
    if (cfg.waveColumn && cfg.currentWave) {
      var waveIdx = headerIndex(sourceHeaders, cfg.waveColumn);
      scopedInput = filteredRows.filter(function (row) { return waveLabel(row[waveIdx]) === cfg.currentWave; });
    }

    return {
      ok: true,
      error: null,
      warnings: warnings,
      config: cfg,
      assumptions: ASSUMPTIONS,
      rules: {
        xRule: ruleText(cfg.xDimension.highLabel, xResolved.threshold),
        yRule: ruleText(cfg.yDimension.highLabel, yResolved.threshold),
        xThreshold: xResolved.threshold,
        yThreshold: yResolved.threshold,
        xScale: xResolved.scale,
        yScale: yResolved.scale
      },
      weightUsed: weightUsed,
      scopeLabel: scopeLabel,
      totalRows: filteredRows.length,
      scopedRows: scopedInput.length,
      validN: overall.validN,
      validWeight: overall.validWeight,
      excludedN: scopedInput.length - overall.validN,
      overall: overall.segments,
      groups: groups,
      previousOverall: previous ? previous.segments : null,
      previousValidN: previous ? previous.validN : null,
      previousValidWeight: previous ? previous.validWeight : null,
      change: change,
      roundingNote: roundingNote,
      emptySegments: emptySegments,
      filterDescription: filterDescription(cfg.filters),
      duplicateIdCount: dupes,
      factors: factorDefinitions(cfg),
      respondents: scope.map(slimRespondent),
      scoredRespondents: scoredAll.respondents.map(slimRespondent)
    };
  }

  function slimRespondent(r) {
    return {
      index: r.index,
      id: r.id,
      segment: r.segment,
      group: r.group,
      wave: r.wave,
      weight: r.weight,
      xScore: r.xScore,
      yScore: r.yScore,
      factorScores: r.factorScores || {}
    };
  }

  function filterColumns(headers, rows, config) {
    var cfg = normalizeConfig(config);
    var blocked = {};
    cfg.xDimension.columns.forEach(function (n) { blocked[n] = true; });
    cfg.yDimension.columns.forEach(function (n) { blocked[n] = true; });
    [cfg.groupColumn, cfg.waveColumn, cfg.respondentIdColumn, cfg.weightColumn].forEach(function (n) {
      if (n) blocked[n] = true;
    });
    return profileColumns(headers, rows).filter(function (col) {
      if (blocked[col.name]) return false;
      if (col.numeric && col.nLevels > 8) return false;
      return col.nLevels >= 2 && col.nLevels <= 20;
    }).map(function (col) {
      var idx = col.index;
      var counts = {};
      (rows || []).forEach(function (row) {
        var key = cellText(row[idx]);
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
      var levels = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
      return { name: col.name, levels: levels.map(function (value) { return { value: value, n: counts[value] }; }) };
    });
  }

  function resultsTable(bundle, groups) {
    if (!bundle || !bundle.ok) return [];
    var cfg = bundle.config;
    var list = [{ name: 'Overall', n: bundle.validN, weight: bundle.validWeight, small: false, segments: bundle.overall }];
    (groups || bundle.groups || []).forEach(function (g) { list.push(g); });
    if (bundle.change && bundle.change.groups) {
      bundle.change.groups.forEach(function (g) {
        if (g.status !== 'previous-only') return;
        var segments = emptySegmentBucket();
        QUADRANT_KEYS.forEach(function (key) {
          var prevPct = g.segments[key].previousPct;
          segments[key].pct = 0;
          segments[key].previousHold = prevPct;
        });
        list.push({ name: g.name, n: 0, weight: 0, small: false, previousOnly: true, segments: segments });
      });
    }
    var rows = [];
    list.forEach(function (g) {
      QUADRANT_KEYS.forEach(function (key) {
        var cell = g.segments[key];
        var prev = null;
        var pp = null;
        if (bundle.change && g.name === 'Overall' && bundle.change.overall[key]) {
          prev = bundle.change.overall[key].previousPct;
          pp = bundle.change.overall[key].pp;
        } else if (bundle.change && g.name !== 'Overall') {
          var match = (bundle.change.groups || []).filter(function (row) { return row.name === g.name; })[0];
          if (match && match.segments[key]) {
            prev = match.segments[key].previousPct;
            pp = match.status === 'both' ? match.segments[key].pp : null;
          }
        }
        var record = {
          Group: g.name,
          Segment: cfg.segments[key].label,
          'Unweighted n': g.previousOnly ? '' : cell.n,
          Percentage: g.previousOnly ? '' : round1(cell.pct).toFixed(1),
          'Small-base flag': (function () {
            if (g.previousOnly) return 'Not available in current wave';
            var parts = [];
            if (g.small) parts.push('Yes');
            if (match && match.status === 'new') parts.push('New group');
            if (!parts.length) parts.push('No');
            return parts.join('; ');
          })()
        };
        if (bundle.weightUsed) record['Weighted n'] = Math.round(cell.weight * 100) / 100;
        if (bundle.change) {
          record['Previous percentage'] = prev == null ? '' : round1(prev).toFixed(1);
          record['Percentage-point change'] = pp == null ? '' : round1(pp).toFixed(1);
        }
        rows.push(record);
      });
    });
    return rows;
  }

  function interpretationSummary(bundle) {
    if (!bundle || !bundle.ok) return bundle && bundle.error ? bundle.error : '';
    var cfg = bundle.config;
    var lines = [];
    lines.push('Survey Segmentation Matrix');
    lines.push(bundle.rules.xRule);
    lines.push(bundle.rules.yRule);
    var base = 'Valid respondents: ' + bundle.validN + ' of ' + bundle.scopedRows;
    if (bundle.scopeLabel && bundle.scopeLabel !== 'All respondents') base += ' (' + bundle.scopeLabel + ')';
    if (bundle.weightUsed) base += '; weighted n = ' + formatNum(bundle.validWeight);
    lines.push(base);
    if (bundle.filterDescription) lines.push('Active filters: ' + bundle.filterDescription);
    QUADRANT_KEYS.forEach(function (key) {
      var cell = bundle.overall[key];
      var line = cfg.segments[key].label + ': ' + formatPct(cell.pct) + ' (n = ' + cell.n + ')';
      if (bundle.change && bundle.change.overall[key]) {
        var ch = bundle.change.overall[key];
        line += ', ' + formatPp(ch.pp) + ' versus previous (' + formatPct(ch.previousPct) + ')';
      }
      lines.push(line);
    });
    lines.push('Percentages use ' + (bundle.weightUsed ? 'survey weights' : 'unweighted respondents') + '. An increase or decrease is a difference in percentage points, not a significance test.');
    if (bundle.roundingNote) lines.push('Figures are rounded to 1 decimal place and may not sum to exactly 100%.');
    return lines.join('\n');
  }

  return {
    ASSUMPTIONS: ASSUMPTIONS,
    STACK_ORDER: STACK_ORDER,
    QUADRANT_KEYS: QUADRANT_KEYS,
    DEFAULT_COLORS: DEFAULT_COLORS,
    defaultConfig: defaultConfig,
    normalizeConfig: normalizeConfig,
    applySplitLegendDefaults: applySplitLegendDefaults,
    SPLIT_HIGH_LABEL: SPLIT_HIGH_LABEL,
    SPLIT_LOW_LABEL: SPLIT_LOW_LABEL,
    isMissing: isMissing,
    toNumber: toNumber,
    compositeScore: compositeScore,
    requiredCount: requiredCount,
    inferScale: inferScale,
    resolveThreshold: resolveThreshold,
    classify: classify,
    profileColumns: profileColumns,
    applyCategoricalFilters: applyCategoricalFilters,
    sortGroups: sortGroups,
    inferWavePair: inferWavePair,
    collectColumnValues: collectColumnValues,
    filterColumns: filterColumns,
    formatPct: formatPct,
    formatPp: formatPp,
    formatNum: formatNum,
    round1: round1,
    factorDefinitions: factorDefinitions,
    analyze: analyze,
    resultsTable: resultsTable,
    interpretationSummary: interpretationSummary,
    filterDescription: filterDescription
  };
});
