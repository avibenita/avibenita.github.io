/**
 * Filter — lean cross-module row-filter API.
 *
 * This is the new (post-refactor) entry point for row filtering. It is a
 * thin orchestration layer over the existing UniRowFilter UI engine, with
 * NO hidden state in sessionStorage and NO storage / message interceptors.
 *
 * Per-page contract (recommended):
 *
 *   Filter.attach({
 *     headers: data.sourceHeaders,        // string[]
 *     rows:    data.sourceRowsAll,        // any[][]
 *     initial: {                          // optional — restore previous state
 *       columnFilters: data.columnFilters,
 *       sourceRows:    data.sourceRows,
 *     },
 *     onApply: function (filteredRows, columnFilters) {
 *       // Page-local: update payload, persist, re-render.
 *       data.sourceRows      = filteredRows;
 *       data.columnFilters   = columnFilters;
 *       data.rowFilterActive = filteredRows.length < data.sourceRowsAll.length;
 *       sessionStorage.setItem('myModuleData', JSON.stringify(data));
 *       rerender();
 *     }
 *   });
 *
 * Hub-side cross-module persistence:
 *
 *   // When launching a downstream analysis, copy filter fields if compatible.
 *   Filter.copyFields(prevPayload, nextPayload);
 *
 * That's it. ~5 lines of glue per view, ~10 lines in the hub. No global
 * state, no interceptors, no auto-clear logic — the caller owns the data.
 */
(function (global) {
  'use strict';

  // The set of fields that travel with a payload as the "filter snapshot".
  // Pages and the hub use this list to know what to copy across modules.
  var FILTER_FIELDS = [
    'sourceHeaders',
    'sourceRowsAll',
    'sourceRows',
    'columnFilters',
    'rowFilterActive'
  ];

  function _hasUniRowFilter() {
    return typeof global.UniRowFilter !== 'undefined' &&
      typeof global.UniRowFilter.init === 'function';
  }

  function _refreshChrome() {
    if (typeof global.StatisticoHeader !== 'undefined' &&
        typeof global.StatisticoHeader.updateUniFilterChrome === 'function') {
      try { global.StatisticoHeader.updateUniFilterChrome(); } catch (_e) {}
    }
  }

  /**
   * Attach the filter to a page's source data.
   *
   * Re-callable: each call re-initialises UniRowFilter with the new dataset.
   * Pages typically call attach() each time their data payload changes.
   */
  function attach(opts) {
    opts = opts || {};
    if (!_hasUniRowFilter()) {
      console.warn('Filter.attach: UniRowFilter not loaded yet');
      return false;
    }
    var headers = Array.isArray(opts.headers) ? opts.headers.slice() : [];
    var rows = Array.isArray(opts.rows) ? opts.rows.slice() : [];
    if (!headers.length || !rows.length) return false;

    var initial = opts.initial || {};
    var initialFilters = initial.columnFilters || null;
    var initialRows = Array.isArray(initial.sourceRows) ? initial.sourceRows : null;

    // columnIndex < 0 ⇒ multi-variable module: no ★ analysis-column marker.
    // Univariate callers can pass an explicit non-negative index.
    var columnIndex = (opts.columnIndex != null && Number.isFinite(Number(opts.columnIndex)))
      ? Number(opts.columnIndex)
      : -1;

    global.UniRowFilter.init({
      headers: headers,
      rows: rows,
      columnIndex: columnIndex,
      onApply: function (filteredRows) {
        var criteria = (typeof global.UniRowFilter.getColumnFilters === 'function')
          ? global.UniRowFilter.getColumnFilters()
          : {};
        if (typeof opts.onApply === 'function') {
          try {
            opts.onApply(filteredRows, criteria);
          } catch (e) {
            console.warn('Filter.attach onApply threw:', e);
          }
        }
        _refreshChrome();
      }
    });

    // Restore the persisted state. Order matters: setColumnFilters must
    // run BEFORE setFilteredRows so the criteria get stamped into the
    // applied state (otherwise opening the panel would reset them).
    if (initialFilters && typeof global.UniRowFilter.setColumnFilters === 'function') {
      try { global.UniRowFilter.setColumnFilters(initialFilters, true); } catch (_e) {}
    }
    if (initialRows && initialRows.length && initialRows.length < rows.length &&
        typeof global.UniRowFilter.setFilteredRows === 'function') {
      try { global.UniRowFilter.setFilteredRows(initialRows); } catch (_e) {}
    }

    _refreshChrome();
    return true;
  }

  /**
   * Clear the active filter and fire onApply with the full row set.
   * Leaves the panel state in "no filters" but does not close the overlay.
   */
  function clear() {
    if (!_hasUniRowFilter()) return;
    try {
      if (typeof global.UniRowFilter.clearAll === 'function') {
        global.UniRowFilter.clearAll();
      }
      if (typeof global.UniRowFilter.applyWithoutClosing === 'function') {
        global.UniRowFilter.applyWithoutClosing();
      } else if (typeof global.UniRowFilter.finishAndClose === 'function') {
        global.UniRowFilter.finishAndClose();
      }
    } catch (e) {
      console.warn('Filter.clear failed:', e);
    }
    _refreshChrome();
  }

  /** Read the current applied filter state from the live UI engine. */
  function getCurrent() {
    if (!_hasUniRowFilter()) return null;
    var meta = (typeof global.UniRowFilter.getSourceMeta === 'function')
      ? global.UniRowFilter.getSourceMeta()
      : null;
    var criteria = (typeof global.UniRowFilter.getColumnFilters === 'function')
      ? global.UniRowFilter.getColumnFilters()
      : {};
    return {
      headers:         meta ? meta.headers.slice()     : [],
      sourceHeaders:   meta ? meta.headers.slice()     : [],
      sourceRowsAll:   meta ? meta.allRows.slice()     : [],
      sourceRows:      meta ? meta.filteredRows.slice(): [],
      columnFilters:   criteria,
      rowFilterActive: !!(meta && meta.hasActiveFilters)
    };
  }

  /**
   * Headers compatibility check. The candidate is "compatible" if every
   * header in `candidateHeaders` exists in `baseHeaders` — i.e. the new
   * analysis is a subset of (or equal to) the base, so the active row
   * filter can be safely projected onto it.
   */
  function isCompatible(baseHeaders, candidateHeaders) {
    if (!Array.isArray(baseHeaders) || !Array.isArray(candidateHeaders)) return false;
    if (!baseHeaders.length || !candidateHeaders.length) return false;
    var idx = {};
    baseHeaders.forEach(function (h) { idx[h] = true; });
    return candidateHeaders.every(function (h) { return Object.prototype.hasOwnProperty.call(idx, h); });
  }

  /**
   * Copy the filter snapshot fields from `src` payload to `dst` payload.
   * Returns `dst` for chaining.
   *
   * By default, only copies if the destination is filter-compatible with
   * the source (its analysis headers are a subset of the source's filter
   * headers). On incompatibility, dst.rowFilterActive is forced to false
   * so the new module starts unfiltered.
   *
   * Pass `{ force: true }` to bypass the compatibility check (e.g. when
   * you've already validated externally).
   */
  function copyFields(src, dst, opts) {
    if (!src || !dst) return dst;
    opts = opts || {};
    if (!opts.force) {
      var srcHeaders = src.sourceHeaders || src.headers;
      var dstHeaders = dst.sourceHeaders || dst.headers;
      if (!isCompatible(srcHeaders, dstHeaders)) {
        dst.rowFilterActive = false;
        return dst;
      }
    }
    FILTER_FIELDS.forEach(function (f) {
      if (Object.prototype.hasOwnProperty.call(src, f)) {
        dst[f] = src[f];
      }
    });
    return dst;
  }

  function open() {
    if (_hasUniRowFilter() && typeof global.UniRowFilter.open === 'function') {
      global.UniRowFilter.open();
    }
  }

  function close() {
    if (_hasUniRowFilter() && typeof global.UniRowFilter.close === 'function') {
      global.UniRowFilter.close();
    }
  }

  global.Filter = {
    attach:       attach,
    clear:        clear,
    getCurrent:   getCurrent,
    copyFields:   copyFields,
    isCompatible: isCompatible,
    open:         open,
    close:        close,
    FIELDS:       FILTER_FIELDS.slice()
  };
})(typeof window !== 'undefined' ? window : this);
