/**
 * Univariate outlier screening and temporary sensitivity subsets.
 *
 * Quartile convention: the box plot and the outlier view read Q1 and Q3 as
 * sorted[floor(n * p)]. The task pane and the by-group view instead interpolate
 * at (n - 1) * p. This screen follows the box plot so a flagged point is the
 * same point the box plot draws outside its fences. Neither convention is changed.
 *
 * Fences are Q1 - k * IQR and Q3 + k * IQR. A value is flagged only when it is
 * strictly outside. k is 1.5 or 3. Flags stay frozen for the baseline sample.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StatisticoOutlierSensitivity = api.attach(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STATE_KEY = 'statisticoUniOutlierSensitivity';
  var RESULT_KEY = 'univariateResults';
  var QUARTILE_CONVENTION = 'Quartiles use the box plot convention: the ordered value at floor(n × p). The task pane’s linear quartile is left unchanged.';

  function quartile(sorted, p) {
    if (!sorted.length) return null;
    return sorted[Math.floor(sorted.length * p)];
  }

  function numericOf(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (value === null || value === undefined || value === true || value === false) return null;
    var text = String(value).trim();
    if (!text) return null;
    var normalized = text.replace(/\s/g, '');
    if (normalized.indexOf(',') >= 0 && normalized.indexOf('.') < 0) normalized = normalized.replace(',', '.');
    if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(normalized)) return null;
    var n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  function fences(q1, q3, k) {
    var iqr = q3 - q1;
    return {
      q1: q1,
      q3: q3,
      iqr: iqr,
      lower: q1 - k * iqr,
      upper: q3 + k * iqr,
      zeroIqr: iqr === 0
    };
  }

  function classify(value, bounds) {
    if (value < bounds.lower) return 'low';
    if (value > bounds.upper) return 'high';
    return null;
  }

  function screenCases(cases, k) {
    var values = cases.map(function (c) { return c.value; });
    if (values.length < 4) {
      return {
        ok: false,
        message: 'Outlier screening requires at least 4 observations.',
        flagged: [],
        bounds: null
      };
    }
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var bounds = fences(quartile(sorted, 0.25), quartile(sorted, 0.75), k);
    var flagged = [];
    cases.forEach(function (c) {
      var reason = classify(c.value, bounds);
      if (!reason) return;
      flagged.push({
        id: c.id,
        label: c.label,
        sourceIndex: c.sourceIndex,
        value: c.value,
        reason: reason
      });
    });
    return {
      ok: true,
      message: bounds.zeroIqr
        ? 'IQR is zero; flags identify values outside the middle 50% range. Review repeated values carefully.'
        : '',
      flagged: flagged,
      bounds: bounds
    };
  }

  function medianOf(values) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    if (!sorted.length) return null;
    return sorted[Math.floor(sorted.length * 0.5)];
  }

  function summarize(values) {
    var n = values.length;
    if (!n) return { n: 0, mean: null, median: null, sd: null, min: null, max: null, ci: null };
    var sum = 0;
    var min = values[0];
    var max = values[0];
    for (var i = 0; i < n; i++) {
      sum += values[i];
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    var mean = sum / n;
    var sd = null;
    if (n >= 2) {
      var ss = 0;
      for (var j = 0; j < n; j++) ss += (values[j] - mean) * (values[j] - mean);
      sd = Math.sqrt(ss / (n - 1));
    }
    var ci = null;
    var host = typeof globalThis !== 'undefined' ? globalThis : null;
    var precision = host && host.ConfidencePrecision;
    if (n >= 2 && sd !== null && Number.isFinite(sd) && precision && typeof precision.marginOfError === 'function') {
      var margin = precision.marginOfError(n, 0.95, sd, null);
      if (Number.isFinite(margin)) ci = { lower: mean - margin, upper: mean + margin, level: 0.95 };
    }
    return { n: n, mean: mean, median: medianOf(values), sd: sd, min: min, max: max, ci: ci };
  }

  function sameList(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function rowText(row) {
    try { return JSON.stringify(row); } catch (_e) { return String(row); }
  }

  function alignIndexes(allRows, rows) {
    var indexes = [];
    var cursor = 0;
    var source = Array.isArray(allRows) && allRows.length ? allRows : rows;
    for (var i = 0; i < rows.length; i++) {
      var target = rowText(rows[i]);
      var found = -1;
      for (var j = cursor; j < source.length; j++) {
        if (rowText(source[j]) === target) { found = j; break; }
      }
      if (found < 0) {
        for (var k = 0; k < source.length; k++) {
          if (rowText(source[k]) === target) { found = k; break; }
        }
      }
      if (found < 0) found = i;
      indexes.push(found);
      cursor = found + 1;
    }
    return indexes;
  }

  function worksheetStart(dataSource) {
    var match = String(dataSource || '').match(/![A-Za-z]+(\d+)\s*:/);
    return match ? Number(match[1]) : null;
  }

  function caseLabel(index, start) {
    return 'Row ' + (start == null ? (index + 1) : (start + index));
  }

  function metaOf(payload) {
    return {
      column: payload.column || payload.variableName || '',
      columnIndex: payload.columnIndex != null ? Number(payload.columnIndex) : 0,
      transform: payload.transform || 'none',
      trim: payload.trim || null,
      dataSource: payload.dataSource || '',
      filterKey: JSON.stringify(payload.columnFilters || null) + '|' + (payload.rowFilterActive ? '1' : '0')
    };
  }

  function datasetKey(cases, meta) {
    return [
      meta.column,
      meta.columnIndex,
      meta.transform,
      JSON.stringify(meta.trim),
      meta.dataSource,
      meta.filterKey,
      cases.map(function (c) { return c.id + '=' + String(c.value); }).join(',')
    ].join('|');
  }

  function casesFromPayload(payload, context) {
    context = context || {};
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { unavailable: 'empty', reason: 'No eligible values.', cases: [], meta: null };
    }
    if (payload.weighted === true || (Array.isArray(payload.weights) && payload.weights.length)) {
      return {
        unavailable: 'weighted',
        reason: 'Outlier sensitivity is not available for grouped or weighted analyses yet.',
        cases: [],
        meta: metaOf(payload)
      };
    }
    if (context.grouped || payload.byGroup === true || payload.analysisMode === 'grouped') {
      return {
        unavailable: 'grouped',
        reason: 'Outlier sensitivity is not available for grouped or weighted analyses yet.',
        cases: [],
        meta: metaOf(payload)
      };
    }
    var meta = metaOf(payload);
    var start = worksheetStart(payload.dataSource);
    var allRows = Array.isArray(payload.sourceRowsAll) ? payload.sourceRowsAll : null;
    var rows = Array.isArray(payload.sourceRows) ? payload.sourceRows : allRows;
    if (rows && rows.length && Array.isArray(rows[0])) {
      var indexes = alignIndexes(allRows || rows, rows);
      var fromRows = [];
      rows.forEach(function (row, i) {
        var value = numericOf(row[meta.columnIndex]);
        if (value === null) return;
        var sourceIndex = indexes[i];
        fromRows.push({
          id: 'case:' + sourceIndex,
          sourceIndex: sourceIndex,
          label: caseLabel(sourceIndex, start),
          value: value
        });
      });
      return { cases: fromRows, meta: meta, unavailable: null, reason: '' };
    }
    var raw = Array.isArray(payload.values) ? payload.values
      : (Array.isArray(payload.rawData) ? payload.rawData : (Array.isArray(payload.data) ? payload.data : []));
    var fromValues = [];
    raw.forEach(function (value, index) {
      var n = numericOf(value);
      if (n === null) return;
      fromValues.push({
        id: 'case:' + index,
        sourceIndex: index,
        label: caseLabel(index, start),
        value: n
      });
    });
    if (!fromValues.length) {
      return { unavailable: 'empty', reason: 'No eligible values.', cases: [], meta: meta };
    }
    return { cases: fromValues, meta: meta, unavailable: null, reason: '' };
  }

  function valuesOf(cases, selected, subset) {
    var drop = {};
    if (subset) (selected || []).forEach(function (id) { drop[id] = true; });
    var values = [];
    cases.forEach(function (c) {
      if (!drop[c.id]) values.push(c.value);
    });
    return values;
  }

  function createSession(storage) {
    var generation = 0;
    var state = null;

    function persist() {
      if (!storage || !state) return;
      try { storage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_e) {}
    }

    function load() {
      if (!storage) return null;
      try {
        var raw = storage.getItem(STATE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_e) { return null; }
    }

    function blank(extracted) {
      var screened = extracted.unavailable ? null : screenCases(extracted.cases, 1.5);
      var flagged = screened && screened.flagged ? screened.flagged : [];
      return {
        datasetKey: extracted.unavailable ? ('unavailable:' + extracted.unavailable) : datasetKey(extracted.cases, extracted.meta),
        unavailable: extracted.unavailable || null,
        reason: extracted.reason || '',
        cases: extracted.cases || [],
        k: 1.5,
        mode: 'all',
        status: 'ready',
        error: '',
        screen: screened,
        flagged: flagged,
        selectedIds: flagged.map(function (f) { return f.id; }),
        highlightId: null,
        cache: {},
        settings: ''
      };
    }

    function ensure() {
      if (state) return state;
      state = load();
      return state;
    }

    function sync(payload, context) {
      if (context && context.grouped) return publicState();
      var extracted = casesFromPayload(payload, context);
      var key = extracted.unavailable ? ('unavailable:' + extracted.unavailable) : datasetKey(extracted.cases, extracted.meta);
      var previous = ensure();
      if (!previous || previous.datasetKey !== key) {
        state = blank(extracted);
        persist();
        return publicState();
      }
      state = previous;
      state.cases = extracted.cases;
      state.unavailable = extracted.unavailable;
      state.reason = extracted.reason || '';
      if (!extracted.unavailable) {
        var eligible = {};
        extracted.cases.forEach(function (c) { eligible[c.id] = true; });
        state.selectedIds = (state.selectedIds || []).filter(function (id) { return eligible[id]; });
        if (state.mode === 'subset' && !state.selectedIds.length) state.mode = 'all';
      }
      persist();
      return publicState();
    }

    function cacheKey(mode) {
      var ids = mode === 'subset' ? state.selectedIds.slice().sort().join(',') : '';
      return [state.datasetKey, mode, state.k, ids, state.settings || ''].join('~');
    }

    function summary(mode) {
      ensure();
      if (!state || state.unavailable) return null;
      var key = cacheKey(mode);
      if (state.cache[key] && state.cache[key].summary) return state.cache[key].summary;
      var summaryValue = summarize(valuesOf(state.cases, state.selectedIds, mode === 'subset'));
      state.cache[key] = Object.assign({}, state.cache[key], { summary: summaryValue, status: 'ready' });
      persist();
      return summaryValue;
    }

    function setK(k) {
      ensure();
      if (!state || state.unavailable || !state.screen || !state.screen.ok) return publicState();
      var next = Number(k);
      if (next !== 1.5 && next !== 3) return publicState();
      state.k = next;
      state.screen = screenCases(state.cases, next);
      state.flagged = state.screen.flagged || [];
      state.selectedIds = state.flagged.map(function (f) { return f.id; });
      state.mode = 'all';
      state.status = 'ready';
      state.error = '';
      state.cache = {};
      generation += 1;
      persist();
      return publicState();
    }

    function setMode(mode) {
      ensure();
      if (!state || state.unavailable) return { ok: false, state: publicState() };
      if (mode === 'subset') {
        if (!state.screen || !state.screen.ok || !state.selectedIds.length) return { ok: false, state: publicState() };
        if (state.forceFail) {
          state.mode = 'all';
          state.status = 'failed';
          state.error = 'The subset could not be calculated.';
          generation += 1;
          persist();
          return { ok: false, failed: true, state: publicState() };
        }
      }
      state.mode = mode === 'subset' ? 'subset' : 'all';
      state.status = 'ready';
      state.error = '';
      generation += 1;
      persist();
      return { ok: true, generation: generation, state: publicState() };
    }

    function setSelected(ids) {
      ensure();
      if (!state || state.unavailable) return publicState();
      var allowed = {};
      (state.flagged || []).forEach(function (f) { allowed[f.id] = true; });
      state.selectedIds = [];
      (ids || []).forEach(function (id) {
        if (allowed[id] && state.selectedIds.indexOf(id) < 0) state.selectedIds.push(id);
      });
      if (!state.selectedIds.length && state.mode === 'subset') state.mode = 'all';
      if (state.mode === 'subset') generation += 1;
      persist();
      return publicState();
    }

    function reset() {
      ensure();
      if (!state || state.unavailable) return publicState();
      var cases = state.cases.slice();
      var keptKey = state.datasetKey;
      state.k = 1.5;
      state.mode = 'all';
      state.status = 'ready';
      state.error = '';
      state.cases = cases;
      state.datasetKey = keptKey;
      state.screen = screenCases(cases, 1.5);
      state.flagged = state.screen && state.screen.ok ? state.screen.flagged : [];
      state.selectedIds = state.flagged.map(function (f) { return f.id; });
      state.cache = {};
      state.highlightId = null;
      generation += 1;
      persist();
      return publicState();
    }

    function project(payload) {
      ensure();
      if (!payload || !state || state.mode !== 'subset' || state.status === 'failed' || state.unavailable) return payload;
      var drop = {};
      state.selectedIds.forEach(function (id) { drop[id] = true; });
      var kept = state.cases.filter(function (c) { return !drop[c.id]; });
      var values = kept.map(function (c) { return c.value; });
      var next = Object.assign({}, payload);
      next.values = values.slice();
      next.data = values.slice();
      next.rawData = values.slice();
      next.n = values.length;
      delete next.descriptive;
      delete next.stats;
      if (Array.isArray(payload.sourceRows)) {
        var dropIndex = {};
        state.cases.forEach(function (c) { if (drop[c.id]) dropIndex[c.sourceIndex] = true; });
        var allRows = Array.isArray(payload.sourceRowsAll) ? payload.sourceRowsAll : payload.sourceRows;
        var indexes = alignIndexes(allRows, payload.sourceRows);
        var keptRows = payload.sourceRows.filter(function (_row, index) {
          return !dropIndex[indexes[index]];
        }).map(function (row) { return row.slice(); });
        // Present one sample to the view. A shorter sourceRows array beside the
        // full sourceRowsAll is the existing row-filter signal, and this
        // exclusion must not become an upstream filter.
        next.sourceRows = keptRows;
        next.sourceRowsAll = keptRows.map(function (row) { return row.slice(); });
        next.rowFilterActive = false;
      }
      next.__uniSensitivityProjection = true;
      next.sensitivity = exportMeta();
      return next;
    }

    function isEcho(baseline, incoming) {
      ensure();
      if (!state || state.mode !== 'subset' || !baseline || !incoming) return false;
      var projected = project(baseline);
      var incomingValues = Array.isArray(incoming.values) ? incoming.values : incoming.data;
      return !!(projected && projected.__uniSensitivityProjection && sameList(projected.values, incomingValues));
    }

    function exportMeta() {
      ensure();
      if (!state) return null;
      var active = state.mode === 'subset' ? summary('subset') : summary('all');
      var baseline = summary('all');
      return {
        mode: state.status === 'failed' ? 'failed' : state.mode,
        status: state.status,
        rule: 'IQR fences',
        k: state.k,
        quartileConvention: QUARTILE_CONVENTION,
        fences: state.screen && state.screen.bounds ? {
          lower: state.screen.bounds.lower,
          upper: state.screen.bounds.upper,
          q1: state.screen.bounds.q1,
          q3: state.screen.bounds.q3,
          iqr: state.screen.bounds.iqr
        } : null,
        zeroIqr: !!(state.screen && state.screen.bounds && state.screen.bounds.zeroIqr),
        baselineN: baseline ? baseline.n : 0,
        retainedN: active ? active.n : 0,
        excludedIds: state.mode === 'subset' ? state.selectedIds.slice() : [],
        excludedCount: state.mode === 'subset' ? state.selectedIds.length : 0,
        flaggedCount: (state.flagged || []).length,
        note: 'Flagged cases may be valid observations. Intervals and tests describe the chosen sample and do not adjust for selecting exclusions after inspecting the data.'
      };
    }

    function compare() {
      ensure();
      if (!state || state.unavailable || !state.screen || !state.screen.ok) return null;
      if (!state.selectedIds.length) return null;
      var baseline = summary('all');
      var subset = summarize(valuesOf(state.cases, state.selectedIds, true));
      function row(metric, a, b, kind) {
        return {
          metric: metric,
          baseline: a,
          subset: b,
          change: kind === 'interval' || a === null || b === null ? null : (b - a)
        };
      }
      return {
        meta: exportMeta(),
        rows: [
          row('Eligible n', baseline.n, subset.n),
          row('Mean', baseline.mean, subset.mean),
          row('Median', baseline.median, subset.median),
          row('Sample SD', baseline.sd, subset.sd),
          row('Minimum', baseline.min, subset.min),
          row('Maximum', baseline.max, subset.max),
          {
            metric: '95% confidence interval for the mean',
            baseline: baseline.ci,
            subset: subset.ci,
            change: null
          }
        ]
      };
    }

    function chartPoints() {
      ensure();
      if (!state || state.unavailable) return [];
      var drop = {};
      if (state.mode === 'subset') state.selectedIds.forEach(function (id) { drop[id] = true; });
      var active = state.cases.filter(function (c) { return !drop[c.id]; });
      var activeScreen = screenCases(active, 1.5);
      var activeReason = {};
      (activeScreen.flagged || []).forEach(function (f) { activeReason[f.id] = f.reason; });
      var baselineReason = {};
      (state.flagged || []).forEach(function (f) { baselineReason[f.id] = f.reason; });
      return active.filter(function (c) { return baselineReason[c.id] || activeReason[c.id]; }).map(function (c) {
        return {
          id: c.id,
          label: c.label,
          value: c.value,
          baselineReason: baselineReason[c.id] || null,
          activeReason: activeReason[c.id] || null
        };
      });
    }

    function publicState() {
      ensure();
      if (!state) return { unavailable: true, reason: 'No eligible values.', mode: 'all' };
      var baseline = state.unavailable ? null : summary('all');
      return {
        unavailable: state.unavailable,
        reason: state.reason,
        mode: state.mode,
        status: state.status,
        error: state.error,
        k: state.k,
        cases: state.cases,
        flagged: state.flagged || [],
        selectedIds: (state.selectedIds || []).slice(),
        highlightId: state.highlightId,
        screen: state.screen,
        baselineN: baseline ? baseline.n : (state.cases ? state.cases.length : 0),
        convention: QUARTILE_CONVENTION,
        generation: generation
      };
    }

    return {
      sync: sync,
      load: function () { state = load(); return publicState(); },
      setK: setK,
      setMode: setMode,
      setSelected: setSelected,
      selectAll: function () {
        ensure();
        if (!state) return publicState();
        return setSelected((state.flagged || []).map(function (f) { return f.id; }));
      },
      clearSelection: function () { return setSelected([]); },
      reset: reset,
      summary: summary,
      compare: compare,
      project: project,
      isEcho: isEcho,
      exportMeta: exportMeta,
      chartPoints: chartPoints,
      highlight: function (id) {
        ensure();
        if (!state) return null;
        state.highlightId = id;
        persist();
        return id;
      },
      beginUpdate: function () { generation += 1; return generation; },
      isCurrent: function (gen) { return gen === generation; },
      acceptResult: function (gen, result) {
        if (gen !== generation) return false;
        ensure();
        if (!state) return false;
        var key = cacheKey(state.mode);
        state.cache[key] = Object.assign({}, state.cache[key], { accepted: result, status: 'ready' });
        state.status = 'ready';
        persist();
        return true;
      },
      markFailed: function (message) {
        ensure();
        if (!state) return;
        state.status = 'failed';
        state.error = message || 'The subset could not be calculated.';
        state.mode = 'all';
        generation += 1;
        persist();
      },
      rememberStochastic: function (mode, data) {
        ensure();
        if (!state) return;
        var key = cacheKey(mode || state.mode);
        state.cache[key] = Object.assign({}, state.cache[key], { stochastic: data });
        persist();
      },
      recallStochastic: function (mode) {
        ensure();
        if (!state) return null;
        var hit = state.cache[cacheKey(mode || state.mode)];
        return hit ? hit.stochastic || null : null;
      },
      setSettings: function (settings) {
        ensure();
        if (!state) return;
        var text = String(settings || '');
        if (text === state.settings) return;
        state.settings = text;
        persist();
      },
      debugFailSubset: function (on) {
        ensure();
        if (state) state.forceFail = !!on;
      },
      fingerprint: function () {
        ensure();
        if (!state) return 'none';
        return [state.datasetKey, state.mode, state.k, (state.selectedIds || []).join(','), state.status].join('~');
      },
      interpretationInput: function () {
        ensure();
        if (!state || state.unavailable) return null;
        var baseline = summary('all');
        var active = state.mode === 'subset' ? summary('subset') : baseline;
        return {
          mode: state.mode,
          status: state.status,
          baselineN: baseline ? baseline.n : 0,
          retainedN: active ? active.n : 0,
          excluded: state.mode === 'subset' ? state.selectedIds.length : 0,
          k: state.k,
          flagged: (state.flagged || []).length
        };
      },
      annotateDataView: function (result) {
        ensure();
        if (!result || !state || state.unavailable || !Array.isArray(result.headers) || !Array.isArray(result.allRows)) return result;
        var copy = Object.assign({}, result);
        var headers = result.headers.slice();
        var screenAt = headers.indexOf('Screening');
        if (screenAt < 0) {
          headers.push('Screening');
          screenAt = headers.length - 1;
        }
        copy.headers = headers;
        var flagged = {};
        (state.flagged || []).forEach(function (f) { flagged[f.id] = f; });
        var selected = {};
        (state.selectedIds || []).forEach(function (id) { selected[id] = true; });
        function decorate(rows, indexes) {
          return (rows || []).map(function (row, index) {
            var sourceIndex = indexes ? indexes[index] : index;
            var id = 'case:' + sourceIndex;
            var cells = row.slice();
            var reason = flagged[id];
            var text = 'Not eligible';
            if (reason) {
              text = (reason.reason === 'low' ? 'Low flag' : 'High flag');
              if (selected[id] && state.mode === 'subset') text += ' · Excluded';
              else if (selected[id]) text += ' · Selected';
            } else if (state.cases.some(function (c) { return c.id === id; })) {
              text = 'Eligible';
            }
            if (cells.length > screenAt && result.headers.indexOf('Screening') >= 0) cells[screenAt] = text;
            else cells.push(text);
            return cells;
          });
        }
        var allIndexes = result.allRows.map(function (_row, index) { return index; });
        var usedIndexes = alignIndexes(result.allRows, result.usedRows || []);
        copy.allRows = decorate(result.allRows, allIndexes);
        copy.usedRows = decorate(result.usedRows || [], usedIndexes);
        copy.caseKeys = allIndexes.map(function (index) { return 'case:' + index; });
        copy.usedCaseKeys = usedIndexes.map(function (index) { return 'case:' + index; });
        if (state.mode === 'subset') {
          copy.notice = (result.notice ? result.notice + ' ' : '')
            + 'Sensitivity analysis. Baseline rows stay listed; excluded cases are marked.';
        }
        return copy;
      },
      orderedFlagged: function (order) {
        ensure();
        if (!state) return [];
        var rows = (state.flagged || []).slice();
        rows.sort(function (a, b) {
          if (order === 'value') return a.value - b.value || a.sourceIndex - b.sourceIndex;
          return a.sourceIndex - b.sourceIndex;
        });
        return rows;
      },
      snapshot: function () { return publicState(); }
    };
  }

  function memoryStorage(initial) {
    var data = Object.assign({}, initial || {});
    return {
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
      setItem: function (key, value) { data[key] = String(value); },
      removeItem: function (key) { delete data[key]; }
    };
  }

  function restoreSample(baseline, incoming) {
    var next = Object.assign({}, incoming);
    ['values', 'data', 'rawData', 'sourceRows', 'sourceRowsAll', 'n', 'descriptive', 'stats', 'rowFilterActive', 'columnFilters'].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(baseline, key)) next[key] = baseline[key];
      else delete next[key];
    });
    delete next.__uniSensitivityProjection;
    delete next.sensitivity;
    return next;
  }

  function stripProjection(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    var next = Object.assign({}, payload);
    delete next.__uniSensitivityProjection;
    delete next.sensitivity;
    return next;
  }

  function mergeStored(current, incoming, session) {
    if (!incoming || typeof incoming !== 'object') return incoming;
    var clean = stripProjection(incoming);
    if (!current) return clean;
    if (incoming.__uniReplaceBaseline) return clean;
    if (incoming.__uniSensitivityProjection || (session && session.isEcho(current, incoming))) {
      return restoreSample(current, incoming);
    }
    return clean;
  }

  function formatNumber(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
    var abs = Math.abs(value);
    var digits = abs >= 100 ? 2 : (abs >= 1 ? 4 : 6);
    return value.toFixed(digits);
  }

  function formatChange(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    var text = formatNumber(value);
    if (value > 0) return '+' + text;
    return text;
  }

  function formatInterval(ci) {
    if (!ci || !Number.isFinite(ci.lower) || !Number.isFinite(ci.upper)) return '—';
    return formatNumber(ci.lower) + ' to ' + formatNumber(ci.upper);
  }

  function attach(rootObject) {
    var storage = rootObject && rootObject.sessionStorage ? rootObject.sessionStorage : memoryStorage();
    var session = createSession(storage);
    var applying = false;
    var mounted = false;

    var BASELINE_KEY = 'statisticoUniOutlierBaseline';

    function rememberBaseline(payload) {
      if (!payload || payload.__uniSensitivityProjection || !rootObject.sessionStorage) return;
      try {
        var copy = Object.assign({}, payload);
        delete copy.__uniSensitivityProjection;
        delete copy.sensitivity;
        rootObject.sessionStorage.setItem(BASELINE_KEY, JSON.stringify(copy));
      } catch (_e) {}
    }

    function readBaseline() {
      if (rootObject && rootObject.sessionStorage) {
        try {
          var saved = rootObject.sessionStorage.getItem(BASELINE_KEY);
          if (saved) return JSON.parse(saved);
        } catch (_e) {}
      }
      var stores = [];
      if (rootObject && rootObject.localStorage) stores.push(rootObject.localStorage);
      if (rootObject && rootObject.sessionStorage) stores.push(rootObject.sessionStorage);
      for (var i = 0; i < stores.length; i++) {
        var store = stores[i];
        store.__uniBaselineRead = true;
        try {
          var raw = store.getItem(RESULT_KEY);
          if (raw) return JSON.parse(raw);
        } catch (_e2) {}
        finally { store.__uniBaselineRead = false; }
      }
      return null;
    }

    function pageContext(header) {
      var view = header && header.currentView;
      return { grouped: view === 'by-group' || view === 'bygroup' };
    }

    function settingsText() {
      if (!rootObject || !rootObject.document) return '';
      var ids = ['alpha-slider', 'bootstrap-iterations-input', 'significance'];
      return ids.map(function (id) {
        var el = rootObject.document.getElementById(id);
        return el ? (id + '=' + el.value) : '';
      }).filter(Boolean).join('&');
    }

    function installStorage() {
      if (!rootObject || typeof rootObject.Storage === 'undefined') return;
      var proto = rootObject.Storage.prototype;
      if (proto.__uniOutlierGuard === proto.setItem) return;
      var getItem = proto.getItem;
      var setItem = proto.setItem;
      proto.getItem = function (key) {
        var raw = getItem.call(this, key);
        if (key !== RESULT_KEY || raw == null || this.__uniBaselineRead) return raw;
        try {
          var parsed = JSON.parse(raw);
          var view = session.project(parsed);
          if (!view || view === parsed || !view.__uniSensitivityProjection) return raw;
          return JSON.stringify(view);
        } catch (_e) { return raw; }
      };
      var wrappedSet = function (key, value) {
        if (key !== RESULT_KEY) return setItem.call(this, key, value);
        try {
          var incoming = JSON.parse(value);
          this.__uniBaselineRead = true;
          var currentRaw = getItem.call(this, key);
          this.__uniBaselineRead = false;
          var current = currentRaw ? JSON.parse(currentRaw) : null;
          if (!current) current = readBaseline();
          var merged = mergeStored(current, incoming, session);
          return setItem.call(this, key, JSON.stringify(merged));
        } catch (_e) {
          this.__uniBaselineRead = false;
          return setItem.call(this, key, value);
        }
      };
      proto.setItem = wrappedSet;
      proto.__uniOutlierGuard = wrappedSet;
    }

    function invalidateInterpretation(header) {
      if (!header) return;
      header._aiRunNonce = (header._aiRunNonce || 0) + 1;
      header._lastAiMeta = null;
      if (typeof header.markOpenAiStale === 'function') {
        try { header.markOpenAiStale(); } catch (_e) {}
      }
      if (typeof header.setAiReady === 'function') {
        try { header.setAiReady(false); } catch (_e2) {}
      }
    }

    function applySample(header) {
      var gen = session.beginUpdate();
      var baseline = readBaseline();
      if (!baseline || typeof rootObject.handleDataReceived !== 'function') {
        render(header);
        return gen;
      }
      session.setSettings(settingsText());
      var mode = session.snapshot().mode;
      var replay = session.recallStochastic(mode);
      var recorded = [];
      var originalRandom = Math.random;
      var cursor = 0;
      var log = replay && Array.isArray(replay.randomLog) ? replay.randomLog : null;
      Math.random = function () {
        if (log && cursor < log.length) return log[cursor++];
        var value = originalRandom();
        recorded.push(value);
        return value;
      };
      applying = true;
      var failed = null;
      try {
        rootObject.handleDataReceived(session.project(baseline));
      } catch (error) {
        failed = error;
      } finally {
        Math.random = originalRandom;
        applying = false;
      }
      if (!session.isCurrent(gen)) return gen;
      if (failed) {
        session.markFailed(failed.message || 'The subset could not be calculated.');
      } else if (!log) {
        session.rememberStochastic(mode, { randomLog: recorded });
      }
      invalidateInterpretation(header);
      render(header);
      return gen;
    }

    function wrapDataReceiver() {
      if (!rootObject || rootObject.handleDataReceived === undefined) return;
      if (!rootObject.handleDataReceived || rootObject.handleDataReceived.__uniSens) return;
      var original = rootObject.handleDataReceived;
      var wrapped = function (data) {
        var result = original.apply(this, arguments);
        if (!applying && data && !data.__uniSensitivityProjection) {
          var remembered = readBaseline();
          if (!(remembered && session.isEcho(remembered, data))) {
            session.sync(data, pageContext(rootObject.StatisticoHeader));
            rememberBaseline(data);
          }
          render(rootObject.StatisticoHeader);
        }
        return result;
      };
      wrapped.__uniSens = true;
      rootObject.handleDataReceived = wrapped;
    }

    function wrapActions(header) {
      if (!header || header.__uniSensActions) return;
      var original = header.registerActions.bind(header);
      header.registerActions = function (actions) {
        actions = actions || {};
        var wrapped = Object.assign({}, actions);
        if (typeof actions.getData === 'function') {
          wrapped.getData = function () {
            var result = actions.getData();
            var baseline = readBaseline();
            var snap = session.snapshot();
            if (baseline && snap && snap.mode === 'subset' && result && Array.isArray(baseline.sourceRowsAll)) {
              result = Object.assign({}, result, {
                headers: Array.isArray(baseline.sourceHeaders) ? baseline.sourceHeaders.slice() : result.headers,
                allRows: baseline.sourceRowsAll.map(function (row) { return row.slice(); }),
                usedRows: Array.isArray(result.usedRows) ? result.usedRows : result.allRows
              });
            }
            return session.annotateDataView(result);
          };
        }
        if (typeof actions.exportJson === 'function') {
          wrapped.exportJson = function () {
            var snap = session.snapshot();
            if (snap.status === 'failed') {
              throw new Error('Subset results are not ready to export.');
            }
            var BlobCtor = rootObject.Blob;
            if (typeof BlobCtor === 'function' && snap.mode === 'subset') {
              var meta = session.exportMeta();
              rootObject.Blob = function (parts, options) {
                try {
                  if (parts && typeof parts[0] === 'string' && parts[0].charAt(0) === '{') {
                    var parsed = JSON.parse(parts[0]);
                    if (parsed && !parsed.sensitivity) {
                      parsed.sensitivity = meta;
                      parsed.sampleLabel = 'Sensitivity analysis';
                      parts = [JSON.stringify(parsed, null, 2)];
                    }
                  }
                } catch (_e) {}
                return new BlobCtor(parts, options);
              };
            }
            try { return actions.exportJson(); }
            finally { rootObject.Blob = BlobCtor; }
          };
        }
        return original(wrapped);
      };
      header.__uniSensActions = true;
    }

    function place(strip, chip) {
      var doc = rootObject.document;
      if (!chip) chip = doc.getElementById('uniOsHeader');
      if (chip) {
        var row = doc.querySelector('.statistico-header .view-switcher-row');
        var headerRight = doc.querySelector('.statistico-header .header-right');
        var headerBar = doc.querySelector('.statistico-header');
        var host = row || headerRight || headerBar;
        if (host && chip.parentNode !== host) {
          if (host === headerRight) host.insertBefore(chip, host.firstChild);
          else host.appendChild(chip);
        }
      }
      if (!strip) return;
      var results = doc.getElementById('results-container') || doc.querySelector('.results-container');
      if (results) {
        if (strip.parentNode !== results) results.insertBefore(strip, results.firstChild);
        return;
      }
      var right = doc.querySelector('.right-col');
      if (right && strip.parentNode !== right) right.insertBefore(strip, right.firstChild);
    }

    function render(header) {
      if (!rootObject.document) return;
      ensureDom(header);
      var doc = rootObject.document;
      var strip = doc.getElementById('uniOutlierSensitivity');
      var chip = doc.getElementById('uniOsHeader');
      if (!strip && !chip) return;
      var snap = session.snapshot();
      if (pageContext(header).grouped) {
        snap = { unavailable: true, reason: 'Outlier sensitivity is not available for grouped or weighted analyses yet.', mode: 'all' };
      }
      var toggle = chip && chip.querySelector('[data-role="exclude-toggle"]');
      var nActive = chip && chip.querySelector('[data-role="n-active"]');
      var nBase = chip && chip.querySelector('[data-role="n-base"]');
      var infoText = chip && chip.querySelector('[data-role="info-text"]');
      var compareBtn = chip && chip.querySelector('[data-role="compare"]');
      var reviewBtn = chip && chip.querySelector('[data-role="review"]');
      var settingsBtn = chip && chip.querySelector('[data-role="settings"]');
      var excluding = snap.mode === 'subset' && snap.status !== 'failed';
      if (doc.documentElement) doc.documentElement.classList.toggle('uni-os-on', excluding);
      if (chip) chip.classList.toggle('is-on', excluding);
      if (snap.unavailable) {
        if (toggle) {
          toggle.checked = false;
          toggle.disabled = true;
        }
        if (nActive) nActive.textContent = '—';
        if (nBase) nBase.textContent = '—';
        if (infoText) infoText.textContent = snap.reason || 'Outlier sensitivity is unavailable.';
        if (compareBtn) compareBtn.disabled = true;
        if (reviewBtn) reviewBtn.disabled = true;
        if (settingsBtn) settingsBtn.disabled = true;
        if (strip) strip.hidden = true;
        return;
      }
      var flaggedN = (snap.flagged || []).length;
      var selectedN = (snap.selectedIds || []).length;
      var subset = excluding ? session.summary('subset') : null;
      var activeN = subset && subset.n != null ? subset.n : snap.baselineN;
      if (toggle) {
        toggle.checked = excluding;
        toggle.disabled = !snap.screen || !snap.screen.ok || selectedN === 0;
      }
      if (nActive) nActive.textContent = activeN == null ? '—' : String(activeN);
      if (nBase) nBase.textContent = snap.baselineN == null ? '—' : String(snap.baselineN);
      if (compareBtn) compareBtn.disabled = selectedN === 0 || !snap.screen || !snap.screen.ok;
      if (reviewBtn) reviewBtn.disabled = !snap.screen || !snap.screen.ok;
      if (settingsBtn) settingsBtn.disabled = false;
      if (infoText) {
        if (snap.status === 'failed') {
          infoText.textContent = (snap.error || 'The subset could not be calculated.') + ' Showing all cases.';
        } else if (!snap.screen || !snap.screen.ok) {
          infoText.textContent = (snap.screen && snap.screen.message) || 'Outlier screening requires at least 4 observations.';
        } else if (excluding) {
          infoText.textContent = 'Sensitivity analysis. ' + selectedN + ' excluded. n = ' + (subset ? subset.n : '—') + ' of ' + snap.baselineN + '. Flagged cases may be valid observations. Intervals and tests describe this subset and do not adjust for selecting exclusions after inspecting the data.';
        } else {
          infoText.textContent = flaggedN + ' flagged, ' + selectedN + ' selected. Flagged cases may be valid observations. Compare results before deciding how to handle them.';
        }
      }
      var openPanel = strip && strip.querySelector('.uni-os-panel:not([hidden])');
      if (strip) strip.hidden = !openPanel;
      if (strip) {
        renderReview(strip, snap);
        renderSettings(strip, snap);
        renderCompare(strip);
      }
      if (header && typeof header.syncCaseSelection === 'function' && snap.highlightId) {
        header._caseTrace = caseTrace();
        try { header.syncCaseSelection(); } catch (_e) {}
      }
    }

    function caseTrace() {
      var id = session.snapshot().highlightId;
      return {
        selectedKeys: function () { return id ? [id] : []; },
        onSelect: function (key) { session.highlight(key); },
        highlightLabel: function () {
          var snap = session.snapshot();
          var found = (snap.cases || []).filter(function (c) { return c.id === snap.highlightId; })[0];
          return found ? found.label : '';
        }
      };
    }

    function renderReview(strip, snap) {
      var panel = strip.querySelector('[data-role="review-panel"]');
      if (!panel || panel.hidden) return;
      var body = panel.querySelector('[data-role="review-body"]');
      if (!body) return;
      var rows = (snap.flagged || []).slice();
      var sort = panel.getAttribute('data-sort') || 'source';
      rows.sort(function (a, b) {
        if (sort === 'value') return a.value - b.value || a.sourceIndex - b.sourceIndex;
        return a.sourceIndex - b.sourceIndex;
      });
      var selected = {};
      snap.selectedIds.forEach(function (id) { selected[id] = true; });
      body.innerHTML = rows.map(function (row) {
        var checked = selected[row.id] ? ' checked' : '';
        var reason = row.reason === 'low' ? 'Below lower fence' : 'Above upper fence';
        return '<tr data-case-id="' + row.id + '">'
          + '<td><input type="checkbox" data-role="pick" data-id="' + row.id + '"' + checked + ' aria-label="Exclude ' + row.label + '"></td>'
          + '<td><button type="button" data-role="focus" data-id="' + row.id + '">' + row.label + '</button></td>'
          + '<td>' + formatNumber(row.value) + '</td>'
          + '<td>' + reason + '</td>'
          + '</tr>';
      }).join('') || '<tr><td colspan="4">No flagged cases.</td></tr>';
    }

    function renderSettings(strip, snap) {
      var panel = strip.querySelector('[data-role="settings-panel"]');
      if (!panel || panel.hidden) return;
      var bounds = snap.screen && snap.screen.bounds;
      panel.querySelector('[data-role="convention"]').textContent = QUARTILE_CONVENTION;
      panel.querySelector('[data-role="fences"]').textContent = bounds
        ? ('Lower fence ' + formatNumber(bounds.lower) + ' · Upper fence ' + formatNumber(bounds.upper))
        : (snap.screen && snap.screen.message ? snap.screen.message : 'Fences are not available.');
      var note = panel.querySelector('[data-role="zero-note"]');
      if (note) {
        note.hidden = !(bounds && bounds.zeroIqr);
        note.textContent = snap.screen && snap.screen.message ? snap.screen.message : '';
      }
      panel.querySelectorAll('input[name="uniOutK"]').forEach(function (input) {
        input.checked = Number(input.value) === snap.k;
        input.disabled = !(snap.screen && snap.screen.ok);
      });
    }

    function renderCompare(strip) {
      var panel = strip.querySelector('[data-role="compare-panel"]');
      if (!panel || panel.hidden) return;
      var table = session.compare();
      var body = panel.querySelector('[data-role="compare-body"]');
      var meta = panel.querySelector('[data-role="compare-meta"]');
      if (!table) {
        if (body) body.innerHTML = '';
        if (meta) meta.textContent = 'Select at least one flagged case to compare.';
        return;
      }
      if (meta) {
        var fencesText = table.meta.fences
          ? ('Fences ' + formatNumber(table.meta.fences.lower) + ' and ' + formatNumber(table.meta.fences.upper))
          : '';
        meta.textContent = 'IQR × ' + table.meta.k + '. ' + fencesText
          + '. Excluded ' + table.meta.excludedCount + ' (' + table.meta.excludedIds.join(', ') + '). '
          + 'Intervals and tests describe the chosen subset and do not adjust for selecting exclusions after inspecting the data. '
          + 'A switch in normality-test significance does not establish that the population became normal.';
      }
      if (!body) return;
      body.innerHTML = table.rows.map(function (row) {
        var baseline = row.metric.indexOf('interval') >= 0 ? formatInterval(row.baseline) : formatNumber(row.baseline);
        var subset = row.metric.indexOf('interval') >= 0 ? formatInterval(row.subset) : formatNumber(row.subset);
        var change = row.metric.indexOf('interval') >= 0 ? '—' : formatChange(row.change);
        return '<tr><th scope="row">' + row.metric + '</th><td>' + baseline + '</td><td>' + subset + '</td><td>' + change + '</td></tr>';
      }).join('');
    }

    function controlClick(header, event) {
      var target = event.target && event.target.closest ? event.target.closest('[data-role]') : null;
      if (!target) return;
      var role = target.getAttribute('data-role');
      if (!role || role === 'exclude-toggle') return;
      var doc = rootObject.document;
      var strip = doc.getElementById('uniOutlierSensitivity');
      var chip = doc.getElementById('uniOsHeader');
      if (role === 'info') {
        var pop = chip && chip.querySelector('[data-role="info-pop"]');
        if (pop) {
          pop.hidden = !pop.hidden;
          target.setAttribute('aria-expanded', pop.hidden ? 'false' : 'true');
        }
        return;
      }
      if (role === 'review' || role === 'settings' || role === 'compare') {
        var panel = strip && strip.querySelector('[data-role="' + (role === 'review' ? 'review-panel' : role === 'settings' ? 'settings-panel' : 'compare-panel') + '"]');
        if (panel) panel.hidden = !panel.hidden;
        var popClose = chip && chip.querySelector('[data-role="info-pop"]');
        if (popClose) popClose.hidden = true;
        render(header);
      } else if (role === 'reset') {
        session.reset();
        session.setMode('all');
        applySample(header);
      } else if (role === 'retry') {
        session.debugFailSubset(false);
        var again = session.setMode('subset');
        if (again.ok) applySample(header);
        else render(header);
      } else if (role === 'select-all') {
        session.selectAll();
        if (session.snapshot().mode === 'subset') applySample(header);
        else render(header);
      } else if (role === 'clear') {
        session.clearSelection();
        applySample(header);
      } else if (role === 'sort-source' || role === 'sort-value') {
        var review = strip && strip.querySelector('[data-role="review-panel"]');
        if (review) review.setAttribute('data-sort', role === 'sort-value' ? 'value' : 'source');
        render(header);
      } else if (role === 'focus') {
        session.highlight(target.getAttribute('data-id'));
        var traceHeader = header || rootObject.StatisticoHeader;
        if (traceHeader) {
          traceHeader._caseTrace = caseTrace();
          if (typeof traceHeader.syncCaseSelection === 'function') traceHeader.syncCaseSelection();
        }
        try {
          doc.dispatchEvent(new rootObject.CustomEvent('uni-outlier-highlight', { detail: { id: target.getAttribute('data-id') } }));
        } catch (_e) {}
      }
    }

    function onExcludeToggle(header, event) {
      var input = event.target;
      if (!input || !input.getAttribute || input.getAttribute('data-role') !== 'exclude-toggle') return;
      if (input.checked) {
        var chosen = session.setMode('subset');
        if (chosen.ok) applySample(header);
        else render(header);
      } else {
        session.setMode('all');
        applySample(header);
      }
    }

    function ensureDom(header) {
      var doc = rootObject.document;
      if (!doc) return null;
      if (!doc.getElementById('uniOutlierSensitivityStyle')) {
        var style = doc.createElement('style');
        style.id = 'uniOutlierSensitivityStyle';
        style.textContent = [
          '#uniOsHeader{position:relative;box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;max-width:100%;margin:0 0 0 auto;padding:4px 6px 4px 8px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.04));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 18px rgba(0,0,0,.22);color:inherit;z-index:30}',
          '#uniOsHeader.is-on{border-color:rgba(255,150,140,.72);background:linear-gradient(180deg,rgba(176,48,48,.72),rgba(110,24,32,.82));box-shadow:inset 0 1px 0 rgba(255,210,200,.28),0 8px 18px rgba(80,10,16,.35)}',
          '#uniOsHeader *{box-sizing:border-box}',
          '#uniOsHeader .uni-os-switch{position:relative;display:inline-flex;width:36px;height:20px;flex:0 0 auto}',
          '#uniOsHeader .uni-os-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}',
          '#uniOsHeader .uni-os-switch input:disabled{cursor:not-allowed}',
          '#uniOsHeader .uni-os-track{position:absolute;inset:0;border-radius:999px;background:rgba(255,255,255,.18);box-shadow:inset 0 1px 2px rgba(0,0,0,.35);transition:background .18s ease}',
          '#uniOsHeader .uni-os-track:before{content:"";position:absolute;width:14px;height:14px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .18s ease}',
          '#uniOsHeader .uni-os-switch input:checked + .uni-os-track{background:linear-gradient(180deg,#ffb1a6,#e25b4a)}',
          '#uniOsHeader .uni-os-switch input:checked + .uni-os-track:before{transform:translateX(16px)}',
          '#uniOsHeader .uni-os-switch input:focus-visible + .uni-os-track{outline:2px solid #fff;outline-offset:2px}',
          '#uniOsHeader .uni-os-ns{display:inline-flex;align-items:baseline;gap:8px;min-width:0;font-size:12px;line-height:1;font-variant-numeric:tabular-nums}',
          '#uniOsHeader .uni-os-n{display:inline-flex;align-items:baseline;gap:3px;white-space:nowrap}',
          '#uniOsHeader .uni-os-n abbr{font-size:10px;font-weight:700;letter-spacing:.04em;text-decoration:none;opacity:.72}',
          '#uniOsHeader .uni-os-n b{font-size:13px;font-weight:700}',
          '#uniOsHeader .uni-os-info{width:20px;height:20px;flex:0 0 auto;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:inherit;font:italic 700 12px/18px Georgia,"Times New Roman",serif;cursor:pointer}',
          '#uniOsHeader .uni-os-info[aria-expanded="true"]{background:rgba(255,255,255,.2)}',
          '#uniOsHeader .uni-os-pop{position:absolute;top:calc(100% + 8px);right:0;width:min(320px,calc(100vw - 24px));padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:#1a222c;color:#e8eef6;box-shadow:0 16px 36px rgba(0,0,0,.4);text-align:left}',
          '#uniOsHeader .uni-os-pop p{margin:0 0 8px;font-size:12px;line-height:1.4}',
          '#uniOsHeader .uni-os-links{display:flex;flex-wrap:wrap;gap:6px}',
          '#uniOsHeader .uni-os-links button{font:inherit;font-size:12px;color:inherit;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:4px 8px;cursor:pointer}',
          '#uniOsHeader .uni-os-links button:disabled{opacity:.45;cursor:not-allowed}',
          '.view-switcher{position:relative}',
          '.view-switcher-row > #uniOsHeader{position:absolute;top:50%;right:8px;margin:0;transform:translateY(-50%);z-index:40}',
          'html[data-tabs="contained"] .statistico-header .view-switcher-row > .view-switcher-bar.ws-mode-bar--connected.ws-mode-bar--attached,html[data-tabs="contained"] .statistico-header .view-switcher-row > .ws-mode-bar.ws-mode-bar--connected{width:calc(100% - 188px) !important;max-width:calc(100% - 188px) !important}',
          'html[data-tabs="contained"] .statistico-header .view-switcher-bar .ws-tab-scroll-wrap,html[data-tabs="contained"] .statistico-header .view-switcher-bar .ws-tab-scroll{max-width:100% !important;overflow:hidden !important}',
          'html[data-tabs="contained"] .statistico-header .view-switcher-bar.ws-mode-bar--connected .ws-tab-cluster{width:100% !important;max-width:100% !important}',
          'html[data-tabs="contained"] .statistico-header .view-switcher-bar.ws-mode-bar--connected .ws-mode-tab{flex:1 1 0 !important;min-width:0 !important;width:auto !important;padding-left:8px !important;padding-right:8px !important}',
          'html[data-tabs="contained"] .statistico-header .ws-tab-scroll-btn{display:none !important}',
          '#uniOutlierSensitivity{box-sizing:border-box;max-width:100%;margin:0 0 12px;padding:8px 10px;border:1px solid rgba(255,165,120,.45);border-radius:10px;display:flex;flex-direction:column;gap:8px;font:inherit;color:inherit;background:rgba(20,16,18,.35)}',
          '#uniOutlierSensitivity[hidden]{display:none}',
          '#uniOutlierSensitivity *{box-sizing:border-box}',
          '#uniOutlierSensitivity .uni-os-links{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
          '#uniOutlierSensitivity button,#uniOutlierSensitivity label{font:inherit;color:inherit}',
          '#uniOutlierSensitivity .uni-os-panel{max-width:100%;overflow:auto}',
          '#uniOutlierSensitivity table{width:100%;border-collapse:collapse;font-size:.92em}',
          '#uniOutlierSensitivity th,#uniOutlierSensitivity td{text-align:left;padding:4px 6px;vertical-align:top;white-space:normal}',
          'html.uni-os-on .right-col,html.uni-os-on .results-container,html.uni-os-on #results-container,html.uni-os-on .view-wrap,html.uni-os-on .content-area,html.uni-os-on .main-content{background-color:#3a1c20 !important}',
          'html.uni-os-on #results-container .panel,html.uni-os-on #results-container .card,html.uni-os-on #results-container .stat-panel,html.uni-os-on .results-container .panel,html.uni-os-on .results-container .card{background-color:#32181c !important;border-color:rgba(255,160,150,.28) !important}',
          'html.uni-os-on .statistico-header,html.uni-os-on .statistico-shell,html.uni-os-on .view-switcher-host,html.uni-os-on .uni-results-tab-stack{background-color:var(--surface-0,#0E141B) !important}',
          'html[data-theme="light"] #uniOsHeader{background:linear-gradient(180deg,#fff,#f4f6f8);border-color:rgba(20,24,32,.12);color:#1c2430;box-shadow:inset 0 1px 0 #fff,0 6px 14px rgba(20,24,32,.08)}',
          'html[data-theme="light"] #uniOsHeader.is-on{background:linear-gradient(180deg,#fde8e4,#f6cfc9);border-color:rgba(176,48,48,.45);color:#3a1418}',
          'html[data-theme="light"] #uniOsHeader .uni-os-track{background:rgba(20,24,32,.16)}',
          'html[data-theme="light"] #uniOsHeader .uni-os-info{border-color:rgba(20,24,32,.2);background:rgba(20,24,32,.04)}',
          'html[data-theme="light"] #uniOsHeader .uni-os-pop{background:#fff;color:#1c2430;border-color:rgba(20,24,32,.12)}',
          'html[data-theme="light"] #uniOsHeader .uni-os-links button{background:rgba(20,24,32,.04);border-color:rgba(20,24,32,.12)}',
          'html[data-theme="light"].uni-os-on .right-col,html[data-theme="light"].uni-os-on .results-container,html[data-theme="light"].uni-os-on #results-container{background-color:#f8e6e4 !important}',
          'html[data-theme="light"].uni-os-on #results-container .panel,html[data-theme="light"].uni-os-on #results-container .card,html[data-theme="light"].uni-os-on .results-container .panel{background-color:#fbf1ef !important;border-color:rgba(176,48,48,.28) !important}',
          'html[data-theme="light"].uni-os-on .statistico-header,html[data-theme="light"].uni-os-on .statistico-shell,html[data-theme="light"].uni-os-on .view-switcher-host{background-color:var(--surface-0,#fff) !important}'
        ].join('');
        doc.head.appendChild(style);
      }
      var chip = doc.getElementById('uniOsHeader');
      if (!chip) {
        chip = doc.createElement('div');
        chip.id = 'uniOsHeader';
        chip.className = 'uni-os-chip';
        chip.setAttribute('role', 'group');
        chip.setAttribute('aria-label', 'Outlier sensitivity');
        chip.innerHTML = [
          '<label class="uni-os-switch">',
          '<input type="checkbox" data-role="exclude-toggle" aria-label="Exclude selected outliers">',
          '<span class="uni-os-track" aria-hidden="true"></span>',
          '</label>',
          '<span class="uni-os-ns">',
          '<span class="uni-os-n" title="Cases in the current result"><abbr>n</abbr> <b data-role="n-active">—</b></span>',
          '<span class="uni-os-n" title="Eligible cases"><abbr>N</abbr> <b data-role="n-base">—</b></span>',
          '</span>',
          '<button type="button" class="uni-os-info" data-role="info" aria-expanded="false" aria-label="Outlier sensitivity details">i</button>',
          '<div class="uni-os-pop" data-role="info-pop" hidden>',
          '<p data-role="info-text"></p>',
          '<div class="uni-os-links">',
          '<button type="button" data-role="review">Review cases</button>',
          '<button type="button" data-role="settings">Settings</button>',
          '<button type="button" data-role="compare">Compare</button>',
          '<button type="button" data-role="reset">Reset</button>',
          '</div></div>'
        ].join('');
        chip.addEventListener('click', function (event) { controlClick(header, event); });
        chip.addEventListener('change', function (event) { onExcludeToggle(header, event); });
      }
      if (!doc.documentElement.__uniOsOutside) {
        doc.documentElement.__uniOsOutside = true;
        doc.addEventListener('click', function (event) {
          var liveChip = doc.getElementById('uniOsHeader');
          var pop = liveChip && liveChip.querySelector('[data-role="info-pop"]');
          if (!pop || pop.hidden) return;
          if (liveChip.contains(event.target)) return;
          pop.hidden = true;
          var info = liveChip.querySelector('[data-role="info"]');
          if (info) info.setAttribute('aria-expanded', 'false');
        });
      }
      var strip = doc.getElementById('uniOutlierSensitivity');
      if (!strip) {
      strip = doc.createElement('section');
      strip.id = 'uniOutlierSensitivity';
      strip.hidden = true;
      strip.setAttribute('aria-label', 'Outliers and sensitivity');
      strip.innerHTML = [
        '<div class="uni-os-panel" data-role="review-panel" hidden>',
        '<p>Flagged cases may be valid observations. Compare results before deciding how to handle them. Baseline screening flags stay fixed. Points that look unusual only after a case is removed are active-sample box plot marks, and they are not added to the selection.</p>',
        '<button type="button" data-role="select-all">Select all flagged</button>',
        '<button type="button" data-role="clear">Clear selection</button>',
        '<button type="button" data-role="sort-source">Sort by source row</button>',
        '<button type="button" data-role="sort-value">Sort by value</button>',
        '<table><thead><tr><th>Exclude</th><th>Source</th><th>Value</th><th>Baseline flag</th></tr></thead><tbody data-role="review-body"></tbody></table>',
        '</div>',
        '<div class="uni-os-panel" data-role="settings-panel" hidden>',
        '<fieldset><legend>IQR multiplier</legend>',
        '<label><input type="radio" name="uniOutK" value="1.5" checked> 1.5 × IQR</label>',
        '<label><input type="radio" name="uniOutK" value="3"> 3 × IQR</label>',
        '</fieldset>',
        '<p data-role="convention"></p>',
        '<p data-role="fences"></p>',
        '<p data-role="zero-note" hidden></p>',
        '</div>',
        '<div class="uni-os-panel" data-role="compare-panel" hidden>',
        '<p data-role="compare-meta"></p>',
        '<table><thead><tr><th>Metric</th><th>All cases</th><th>Excluding selected</th><th>Change</th></tr></thead><tbody data-role="compare-body"></tbody></table>',
        '</div>'
      ].join('');
      strip.addEventListener('click', function (event) { controlClick(header, event); });
      strip.addEventListener('change', function (event) {
        var target = event.target;
        if (target && target.getAttribute && target.getAttribute('data-role') === 'pick') {
          var ids = [];
          strip.querySelectorAll('[data-role="pick"]').forEach(function (box) {
            if (box.checked) ids.push(box.getAttribute('data-id'));
          });
          var before = session.snapshot().mode;
          session.setSelected(ids);
          if (before === 'subset' || session.snapshot().mode !== before) applySample(header);
          else render(header);
          return;
        }
        if (target.name === 'uniOutK') {
          session.setK(target.value);
          applySample(header);
        }
      });
      }
      place(strip, chip);
      return strip;
    }

    function mount(header) {
      installStorage();
      wrapActions(header);
      wrapDataReceiver();
      if (!rootObject.document) return;
      if (pageContext(header).grouped) {
        ensureDom(header);
        render(header);
        return;
      }
      installStorage();
      var baseline = readBaseline();
      if (baseline) {
        session.sync(baseline, pageContext(header));
        rememberBaseline(baseline);
      } else session.sync(null, pageContext(header));
      ensureDom(header);
      if (!rootObject.ConfidencePrecision && header && header.module === 'univariate' && !rootObject.document.getElementById('uniConfidencePrecision')) {
        var precision = rootObject.document.createElement('script');
        precision.id = 'uniConfidencePrecision';
        precision.src = 'confidence-precision.js';
        precision.onload = function () { render(header); };
        rootObject.document.head.appendChild(precision);
      }
      render(header);
      mounted = true;
      rootObject.setTimeout(wrapDataReceiver, 0);
    }

    installStorage();
    if (rootObject && rootObject.document) {
      if (rootObject.document.readyState === 'loading') {
        rootObject.document.addEventListener('DOMContentLoaded', function () {
          if (rootObject.StatisticoHeader) mount(rootObject.StatisticoHeader);
        });
      }
    }

    return {
      quartile: quartile,
      fences: fences,
      classify: classify,
      screenCases: screenCases,
      summarize: summarize,
      casesFromPayload: casesFromPayload,
      createSession: createSession,
      memoryStorage: memoryStorage,
      mergeStored: mergeStored,
      convention: QUARTILE_CONVENTION,
      mount: mount,
      session: function () { return session; },
      fingerprint: function () { return session.fingerprint(); },
      interpretationInput: function () { return session.interpretationInput(); },
      chartPoints: function () { return session.chartPoints(); },
      exportMeta: function () { return session.exportMeta(); },
      project: function (payload) { return session.project(payload); },
      highlight: function (id) { return session.highlight(id); }
    };
  }

  return {
    quartile: quartile,
    fences: fences,
    classify: classify,
    screenCases: screenCases,
    summarize: summarize,
    casesFromPayload: casesFromPayload,
    createSession: createSession,
    memoryStorage: memoryStorage,
    mergeStored: mergeStored,
    convention: QUARTILE_CONVENTION,
    attach: attach
  };
});
