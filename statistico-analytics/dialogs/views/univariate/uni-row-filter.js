/**
 * Excel-style row filtering for univariate results (source range rows).
 * Call UniRowFilter.init({ headers, rows, columnIndex, onApply }) after load.
 */
(function (global) {
  'use strict';

  var _headers = [];
  var _allRows = [];
  var _filteredRows = [];
  var _columnFilters = {};
  var _columnIndex = 0;
  var _onApply = null;
  var _dropIgnoreClose = false;
  var _uniqueCache = {};
  var MAX_RENDER_ROWS = 500;
  var MAX_DROPDOWN_VALUES = 250;
  var MAX_UNIQUE_SCAN_VALUES = 2500;
  var MAX_UNIQUE_SCAN_ROWS = 8000;
  var MAX_FILTER_VALUES = 400;

  function cellStr(val) {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  }

  function valKey(val) {
    return cellStr(val);
  }

  function filterSelSet(filterArr) {
    var set = {};
    var values = Array.isArray(filterArr) ? filterArr : (filterArr && Array.isArray(filterArr.values) ? filterArr.values : []);
    values.forEach(function (v) {
      if (v !== '__SHOW_NOTHING__') set[valKey(v)] = true;
    });
    return set;
  }

  function cloneColumnFilters(filters) {
    var out = {};
    Object.keys(filters || {}).forEach(function (key) {
      out[key] = sanitizeFilterEntry(filters[key]);
    });
    return out;
  }

  function sanitizeFilterEntry(filter) {
    if (Array.isArray(filter)) {
      if (filter.indexOf('__SHOW_NOTHING__') >= 0) return ['__SHOW_NOTHING__'];
      if (filter.length > MAX_FILTER_VALUES) return [];
      return filter.slice();
    }
    if (filter && typeof filter === 'object') {
      var sourceValues = Array.isArray(filter.values) ? filter.values : [];
      if (sourceValues.length > MAX_FILTER_VALUES) return [];
      var values = sourceValues.slice();
      return { mode: filter.mode === 'exclude' ? 'exclude' : 'include', values: values };
    }
    return [];
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getColumnIndices() {
    return _headers.map(function (_, i) { return i; });
  }

  function uniqueValues(colIdx, requiredValues) {
    var cacheKey = String(colIdx);
    var cached = _uniqueCache[cacheKey];
    if (!cached) {
      var seen = {};
      var base = [];
      var rows = _allRows || [];
      for (var i = 0; i < rows.length && base.length < MAX_UNIQUE_SCAN_VALUES && i < MAX_UNIQUE_SCAN_ROWS; i++) {
        var row = rows[i];
        var s = cellStr(row[colIdx]);
        if (!Object.prototype.hasOwnProperty.call(seen, s)) {
          seen[s] = true;
          base.push(s);
        }
      }
      base.sort();
      cached = {
        values: base,
        truncated: rows.length > MAX_UNIQUE_SCAN_ROWS || base.length >= MAX_UNIQUE_SCAN_VALUES
      };
      _uniqueCache[cacheKey] = cached;
    }
    var out = cached.values.slice();
    var seenOut = {};
    out.forEach(function (v) { seenOut[v] = true; });
    Object.keys(requiredValues || {}).forEach(function (key) {
      if (!seenOut[key]) out.push(key);
    });
    out.sort();
    var truncated = cached.truncated || out.length > MAX_UNIQUE_SCAN_VALUES;
    if (out.length > MAX_UNIQUE_SCAN_VALUES) out = out.slice(0, MAX_UNIQUE_SCAN_VALUES);
    out._truncated = truncated;
    return out;
  }

  function visibleValueSlice(values, term) {
    var q = String(term || '').toLowerCase();
    var matched = !q ? values : values.filter(function (v) {
      return String(v).toLowerCase().indexOf(q) >= 0;
    });
    return {
      values: matched.slice(0, MAX_DROPDOWN_VALUES),
      total: matched.length
    };
  }

  function syncSelectAllState(valuesWrap, selectAllCb) {
    var valueCbs = valuesWrap.querySelectorAll('.uni-filt-val-row input[type=checkbox]');
    var total = valueCbs.length;
    var checked = 0;
    valueCbs.forEach(function (cb) { if (cb.checked) checked++; });
    if (!total) {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = false;
      return;
    }
    if (checked === 0) {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = false;
    } else if (checked === total) {
      selectAllCb.checked = true;
      selectAllCb.indeterminate = false;
    } else {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = true;
    }
  }

  function applyAllFilters() {
    var included = getColumnIndices();
    var filterSets = {};
    var activeColumns = [];
    included.forEach(function (ci) {
      var filter = _columnFilters[ci];
      if (Array.isArray(filter) && filter.length && filter.indexOf('__SHOW_NOTHING__') < 0) {
        filterSets[ci] = filterSelSet(filter);
        activeColumns.push(ci);
      } else if (filter && typeof filter === 'object' && Array.isArray(filter.values) && filter.values.length) {
        filterSets[ci] = filterSelSet(filter);
        activeColumns.push(ci);
      } else if (Array.isArray(filter) && filter.indexOf('__SHOW_NOTHING__') >= 0) {
        activeColumns.push(ci);
      }
    });
    if (!activeColumns.length) {
      _filteredRows = (_allRows || []).slice();
      updateBadge();
      var overlayIdle = document.getElementById('uniFilterOverlay');
      if (overlayIdle && overlayIdle.classList.contains('sb-ai-overlay--visible')) {
        renderFilterTable();
      }
      if (typeof _onApply === 'function') _onApply(_filteredRows.slice());
      return;
    }
    _filteredRows = (_allRows || []).filter(function (row) {
      for (var k = 0; k < activeColumns.length; k++) {
        var ci = activeColumns[k];
        var filter = _columnFilters[ci];
        if (!filter) continue;
        if (Array.isArray(filter)) {
          if (!filter.length) continue;
          if (filter.indexOf('__SHOW_NOTHING__') >= 0) return false;
          if (!filterSets[ci] || !filterSets[ci][cellStr(row[ci])]) return false;
        } else if (filter && typeof filter === 'object') {
          if (!filter.values || !filter.values.length) continue;
          var matched = !!(filterSets[ci] && filterSets[ci][cellStr(row[ci])]);
          if (filter.mode === 'exclude' ? matched : !matched) return false;
        }
      }
      return true;
    });
    updateBadge();
    var overlay = document.getElementById('uniFilterOverlay');
    if (overlay && overlay.classList.contains('sb-ai-overlay--visible')) {
      renderFilterTable();
    }
    if (typeof _onApply === 'function') {
      _onApply(_filteredRows.slice());
    }
  }

  function hasActiveFilters() {
    var total = (_allRows || []).length;
    var showing = (_filteredRows || []).length;
    return total > 0 && showing !== total;
  }

  function updateBadge() {
    var badges = document.querySelectorAll('[data-uni-filter-badge]');
    var btns = document.querySelectorAll('.uni-filter-btn');
    var total = (_allRows || []).length;
    var showing = (_filteredRows || []).length;
    var active = hasActiveFilters();
    btns.forEach(function (b) { b.classList.toggle('active', active); });
    var label = !total ? '—' : (active ? (showing + ' of ' + total) : (total + ' rows'));
    badges.forEach(function (badge) { badge.textContent = label; });
    var summary = document.getElementById('uniFilterSummary');
    if (summary) {
      var activeCols = 0;
      getColumnIndices().forEach(function (i) {
        var f = _columnFilters[i];
        if ((Array.isArray(f) && f.length) || (f && typeof f === 'object' && f.values && f.values.length)) activeCols++;
      });
      if (active) {
        summary.textContent = 'Showing ' + showing + ' of ' + total + ' rows from the selected range'
          + (activeCols ? ' (' + activeCols + ' column filter' + (activeCols > 1 ? 's' : '') + ' active).' : '.')
          + ' Click ▼ on a column header to adjust.';
      } else {
        summary.textContent = 'Filter rows from the workbook range. Analysis updates when you apply filters.';
      }
    }
  }

  function closeColDropdown() {
    var dd = document.querySelector('.uni-excel-filter-dropdown');
    if (dd) dd.remove();
    document.removeEventListener('mousedown', closeColDropdownOnOutside, true);
  }

  function closeColDropdownOnOutside(ev) {
    if (_dropIgnoreClose) return;
    var dd = document.querySelector('.uni-excel-filter-dropdown');
    if (dd && !dd.contains(ev.target) && !ev.target.closest('.uni-filt-th')) {
      closeColDropdown();
    }
  }

  function positionDropdown(dd, anchorEl) {
    if (!anchorEl || !anchorEl.getBoundingClientRect) return;
    var rect = anchorEl.getBoundingClientRect();
    var ddW = 280;
    var maxH = 320;
    var pad = 8;
    var left = rect.left;
    var top = rect.bottom + 2;
    if (left + ddW > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - ddW - pad);
    }
    if (left < pad) left = pad;
    if (top + maxH > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - maxH - 2);
    }
    dd.style.position = 'fixed';
    dd.style.left = left + 'px';
    dd.style.top = top + 'px';
    dd.style.minWidth = Math.max(rect.width, 200) + 'px';
  }

  function applyColFilter(colIdx) {
    var dd = document.querySelector('.uni-excel-filter-dropdown');
    if (!dd) return;
    if (dd._selectionMode === 'all') {
      _columnFilters[colIdx] = [];
      closeColDropdown();
      applyAllFilters();
      return;
    }
    if (dd._selectionMode === 'none') {
      _columnFilters[colIdx] = ['__SHOW_NOTHING__'];
      closeColDropdown();
      applyAllFilters();
      return;
    }
    if (dd._selectionMode === 'exclude') {
      var excluded = Object.keys(dd._excludedValues || {});
      _columnFilters[colIdx] = excluded.length ? { mode: 'exclude', values: excluded } : [];
      closeColDropdown();
      applyAllFilters();
      return;
    }
    var checked = [];
    Object.keys(dd._selectedValues || {}).forEach(function (key) {
      if (dd._selectedValues[key]) checked.push(key);
    });
    if (!checked.length) _columnFilters[colIdx] = ['__SHOW_NOTHING__'];
    else _columnFilters[colIdx] = checked.slice();
    closeColDropdown();
    applyAllFilters();
  }

  function toggleColFilter(colIdx, ev, anchorEl) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    closeColDropdown();
    var current = _columnFilters[colIdx] || [];
    var isExclude = !!(current && typeof current === 'object' && !Array.isArray(current) && current.mode === 'exclude');
    var showNothing = Array.isArray(current) && current.indexOf('__SHOW_NOTHING__') >= 0;
    var isAll = Array.isArray(current) && !current.length && !showNothing;
    var selSet = filterSelSet(current);
    var excludedSet = isExclude ? filterSelSet(current) : {};
    var unique = uniqueValues(colIdx, isExclude ? excludedSet : selSet);

    var dd = document.createElement('div');
    dd.className = 'uni-excel-filter-dropdown';
    dd.setAttribute('data-col-idx', String(colIdx));

    var search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search...';
    search.className = 'uni-filt-search';
    search.addEventListener('input', function () {
      renderDropdownValues(search.value);
    });
    dd.appendChild(search);

    var valuesWrap = document.createElement('div');
    valuesWrap.className = 'uni-filt-values';
    dd._selectionMode = showNothing ? 'none' : (isExclude ? 'exclude' : (isAll ? 'all' : 'include'));
    dd._selectedValues = {};
    dd._excludedValues = {};
    Object.keys(selSet).forEach(function (key) { dd._selectedValues[key] = true; });
    Object.keys(excludedSet).forEach(function (key) { dd._excludedValues[key] = true; });

    var selectAllLbl = document.createElement('label');
    var selectAllCb = document.createElement('input');
    selectAllCb.type = 'checkbox';
    selectAllCb.checked = isAll;
    selectAllLbl.appendChild(selectAllCb);
    selectAllLbl.appendChild(document.createTextNode(' Select All'));
    selectAllLbl.style.fontWeight = '700';
    selectAllLbl.style.marginBottom = '6px';
    selectAllCb.style.pointerEvents = 'none';
    selectAllLbl.addEventListener('click', function (e) {
      e.preventDefault();
      var on = !selectAllCb.checked;
      selectAllCb.checked = on;
      selectAllCb.indeterminate = false;
      dd._selectionMode = on ? 'all' : 'none';
      dd._selectedValues = {};
      renderDropdownValues(search.value);
    });
    valuesWrap.appendChild(selectAllLbl);

    function isValueSelected(val) {
      if (dd._selectionMode === 'all') return true;
      if (dd._selectionMode === 'none') return false;
      if (dd._selectionMode === 'exclude') return !dd._excludedValues[valKey(val)];
      return !!dd._selectedValues[valKey(val)];
    }

    function syncRenderedSelectAll() {
      var valueCbs = valuesWrap.querySelectorAll('.uni-filt-val-row input[type=checkbox]');
      var total = valueCbs.length;
      var checked = 0;
      valueCbs.forEach(function (cb) { if (cb.checked) checked++; });
      if (dd._selectionMode === 'all' || dd._selectionMode === 'exclude') {
        selectAllCb.checked = true;
        selectAllCb.indeterminate = dd._selectionMode === 'exclude' && Object.keys(dd._excludedValues || {}).length > 0;
      } else if (dd._selectionMode === 'none') {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = false;
      } else if (total && checked === total) {
        selectAllCb.checked = true;
        selectAllCb.indeterminate = false;
      } else if (checked === 0) {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = false;
      } else {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = true;
      }
    }

    function renderDropdownValues(term) {
      var slice = visibleValueSlice(unique, term);
      valuesWrap.innerHTML = '';
      valuesWrap.appendChild(selectAllLbl);
      slice.values.forEach(function (val) {
        var key = valKey(val);
        var lbl = document.createElement('label');
        lbl.className = 'uni-filt-val-row';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = val;
        cb.setAttribute('data-filter-value', val);
        cb.style.pointerEvents = 'none';
        cb.checked = isValueSelected(val);
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(' ' + (val === '' ? '(Blank)' : val)));
        lbl.addEventListener('click', function (e) {
          e.preventDefault();
          cb.checked = !cb.checked;
          if (dd._selectionMode === 'all' || dd._selectionMode === 'exclude') {
            dd._selectionMode = 'exclude';
            dd._selectedValues = {};
            if (cb.checked) delete dd._excludedValues[key];
            else dd._excludedValues[key] = true;
          } else {
            dd._selectionMode = 'include';
            dd._selectedValues[key] = cb.checked;
            if (!cb.checked) delete dd._selectedValues[key];
          }
          syncRenderedSelectAll();
        });
        valuesWrap.appendChild(lbl);
      });
      if (slice.total > slice.values.length) {
        var note = document.createElement('div');
        note.className = 'uni-filt-more-note';
        note.textContent = 'Showing ' + slice.values.length + ' of ' + slice.total + ' matching values. Type to narrow the list.';
        valuesWrap.appendChild(note);
      } else if (unique._truncated) {
        var capNote = document.createElement('div');
        capNote.className = 'uni-filt-more-note';
        capNote.textContent = 'High-cardinality column: showing a capped value list to keep filtering responsive.';
        valuesWrap.appendChild(capNote);
      }
      syncRenderedSelectAll();
    }

    renderDropdownValues('');
    dd.appendChild(valuesWrap);

    var actions = document.createElement('div');
    actions.className = 'uni-filt-actions';
    var okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'uni-filt-ok';
    okBtn.textContent = 'OK';
    okBtn.addEventListener('click', function () { applyColFilter(colIdx); });
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'uni-filt-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', closeColDropdown);
    actions.appendChild(okBtn);
    actions.appendChild(cancelBtn);
    dd.appendChild(actions);
    dd.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    dd.addEventListener('click', function (e) { e.stopPropagation(); });

    document.body.appendChild(dd);
    positionDropdown(dd, anchorEl);

    var scrollEl = document.getElementById('uniFilterContent');
    if (scrollEl) {
      scrollEl.addEventListener('scroll', closeColDropdown, { once: true });
    }

    _dropIgnoreClose = true;
    setTimeout(function () {
      _dropIgnoreClose = false;
      document.addEventListener('mousedown', closeColDropdownOnOutside, true);
    }, 120);
  }

  function bindFilterTableHandlers() {
    var el = document.getElementById('uniFilterContent');
    if (!el || el._uniFiltBound) return;
    el._uniFiltBound = true;
    function resolveHeaderCell(target) {
      if (!target) return null;
      var node = target;
      if (node.nodeType === 3) node = node.parentElement; // text node -> element
      if (!node) return null;
      var th = null;
      if (typeof node.closest === 'function') th = node.closest('.uni-filt-th');
      if (!th) {
        while (node && node !== el) {
          if (node.classList && node.classList.contains('uni-filt-th')) { th = node; break; }
          node = node.parentElement;
        }
      }
      if (!th || !el.contains(th)) return null;
      return th;
    }
    function openColumnFilter(e) {
      if (e.type === 'click' && el._uniFiltMouseOpened) {
        el._uniFiltMouseOpened = false;
        return;
      }
      var th = resolveHeaderCell(e.target);
      if (!th) return;
      var idx = th.getAttribute('data-col-idx');
      if (idx === null || idx === '') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'mousedown') el._uniFiltMouseOpened = true;
      toggleColFilter(parseInt(idx, 10), e, th);
    }
    el.addEventListener('mousedown', openColumnFilter);
    el.addEventListener('click', openColumnFilter);
  }

  function clickHeaderByIndex(colIdx, ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    var el = document.getElementById('uniFilterContent');
    if (!el) return;
    var th = el.querySelector('.uni-filt-th[data-col-idx="' + String(colIdx) + '"]');
    if (!th) return;
    toggleColFilter(Number(colIdx), ev || null, th);
  }

  function renderFilterTable() {
    var el = document.getElementById('uniFilterContent');
    if (!el) return;
    var rows = _filteredRows || [];
    if (!_headers.length) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text-secondary);">No source range data available.</p>';
      return;
    }

    var isLight = document.documentElement.getAttribute('data-theme') === 'light';
    var headerBg = isLight ? '#f1f5f9' : '#1a1f2e';
    var rowBg = isLight ? '#fff' : '#242938';
    var altBg = isLight ? '#f9fafb' : '#1e2333';
    var textC = isLight ? '#111827' : '#e2e8f0';
    var thStyle = 'padding:7px 10px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;'
      + 'letter-spacing:.08em;background:' + headerBg + ';border:1px solid var(--border);position:sticky;top:0;z-index:2;';

    var headerCells = _headers.map(function (h, i) {
      var cf = _columnFilters[i];
      var filtered = (Array.isArray(cf) && cf.length > 0) || (cf && typeof cf === 'object' && cf.values && cf.values.length > 0);
      var icon = filtered ? '🔽' : '▼';
      var cls = 'uni-filt-th' + (filtered ? ' filtered' : '');
      var highlight = i === _columnIndex ? ' outline:1px solid rgba(129,140,248,.5);' : '';
      return '<th class="' + cls + '" data-col-idx="' + i + '" style="' + thStyle + highlight
        + 'cursor:pointer;pointer-events:auto;user-select:none;'
        + 'color:' + (filtered ? '#4ade80' : (i === _columnIndex ? '#a5b4fc' : '#ffa578')) + ';" '
        + 'title="Click to filter ' + escHtml(h) + '">'
        + escHtml(h) + (i === _columnIndex ? ' ★' : '') + '<span class="uni-filt-icon" style="pointer-events:none;">' + icon + '</span></th>';
    }).join('');

    var displayRows = rows.slice(0, MAX_RENDER_ROWS);
    var bodyRows = displayRows.map(function (row, ri) {
      var bg = ri % 2 === 0 ? rowBg : altBg;
      var cells = _headers.map(function (_, ci) {
        var val = row[ci];
        var raw = (val === null || val === undefined) ? '' : String(val);
        var display = escHtml(raw.length > 40 ? raw.substring(0, 40) + '\u2026' : raw);
        var tdStyle = ci === _columnIndex
          ? 'font-weight:600;color:' + (isLight ? '#4338ca' : '#c4b5fd') + ';'
          : 'color:' + textC + ';';
        return '<td style="padding:6px 10px;border:1px solid var(--border);' + tdStyle + '">' + display + '</td>';
      }).join('');
      return '<tr style="background:' + bg + '">' + cells + '</tr>';
    }).join('');

    var limitNote = rows.length > displayRows.length
      ? '<div class="uni-filt-more-note">Showing first ' + displayRows.length + ' of ' + rows.length + ' rows. Filters apply to the full source range.</div>'
      : '';
    el.innerHTML = limitNote + '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
      + '<thead><tr>' + headerCells + '</tr></thead>'
      + '<tbody>' + bodyRows + '</tbody></table>';
  }

  function openFilter() {
    renderFilterTable();
    bindFilterTableHandlers();
    updateBadge();
    var overlay = document.getElementById('uniFilterOverlay');
    if (overlay) overlay.classList.add('sb-ai-overlay--visible');
  }

  function closeFilter(e) {
    if (e && e.target !== document.getElementById('uniFilterOverlay')) return;
    closeColDropdown();
    var overlay = document.getElementById('uniFilterOverlay');
    if (overlay) overlay.classList.remove('sb-ai-overlay--visible');
  }

  function clearAllFilters() {
    getColumnIndices().forEach(function (i) { _columnFilters[i] = []; });
    applyAllFilters();
  }

  function init(opts) {
    opts = opts || {};
    _headers = (opts.headers || []).slice();
    _allRows = (opts.rows || []).map(function (r) { return r.slice(); });
    _columnIndex = opts.columnIndex != null ? Number(opts.columnIndex) : 0;
    _onApply = opts.onApply || null;
    _columnFilters = {};
    _uniqueCache = {};
    getColumnIndices().forEach(function (i) { _columnFilters[i] = []; });
    _filteredRows = _allRows.slice();
    updateBadge();
    return _filteredRows.slice();
  }

  function getColumnFilters() {
    return cloneColumnFilters(_columnFilters);
  }

  function setColumnFilters(filters, skipApply) {
    _columnFilters = {};
    getColumnIndices().forEach(function (i) {
      var v = filters && (filters[i] || filters[String(i)]);
      _columnFilters[i] = sanitizeFilterEntry(v);
    });
    if (!skipApply) applyAllFilters();
  }

  function setFilteredRows(rows) {
    _filteredRows = (rows || []).map(function (r) { return r.slice(); });
    updateBadge();
  }

  function getFilteredRows() {
    return (_filteredRows || []).slice();
  }

  function getSourceMeta() {
    return {
      headers: _headers.slice(),
      allRows: _allRows.slice(),
      filteredRows: getFilteredRows(),
      columnIndex: _columnIndex,
      hasActiveFilters: hasActiveFilters()
    };
  }

  global.UniRowFilter = {
    init: init,
    open: openFilter,
    close: closeFilter,
    clearAll: clearAllFilters,
    getFilteredRows: getFilteredRows,
    getSourceMeta: getSourceMeta,
    hasActiveFilters: hasActiveFilters,
    updateBadge: updateBadge,
    setFilteredRows: setFilteredRows,
    getColumnFilters: getColumnFilters,
    setColumnFilters: setColumnFilters,
    clickHeaderByIndex: clickHeaderByIndex
  };
})(typeof window !== 'undefined' ? window : this);
