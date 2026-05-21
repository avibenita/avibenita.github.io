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

  function cellStr(val) {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  }

  function valKey(val) {
    return cellStr(val);
  }

  function filterSelSet(filterArr) {
    var set = {};
    (filterArr || []).forEach(function (v) {
      if (v !== '__SHOW_NOTHING__') set[valKey(v)] = true;
    });
    return set;
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

  function uniqueValues(colIdx) {
    var seen = {};
    var out = [];
    (_allRows || []).forEach(function (row) {
      var s = cellStr(row[colIdx]);
      if (!Object.prototype.hasOwnProperty.call(seen, s)) {
        seen[s] = true;
        out.push(s);
      }
    });
    out.sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true });
    });
    return out;
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
    _filteredRows = (_allRows || []).filter(function (row) {
      for (var k = 0; k < included.length; k++) {
        var ci = included[k];
        var filter = _columnFilters[ci];
        if (!filter || !filter.length) continue;
        if (filter.indexOf('__SHOW_NOTHING__') >= 0) return false;
        if (filter.indexOf(cellStr(row[ci])) < 0) return false;
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
        if (f && f.length) activeCols++;
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
    var checked = [];
    dd.querySelectorAll('.uni-filt-val-row input[type=checkbox]').forEach(function (cb) {
      if (!cb.checked) return;
      var v = cb.getAttribute('data-filter-value');
      checked.push(v !== null ? v : cb.value);
    });
    var allVals = uniqueValues(colIdx);
    if (!checked.length) _columnFilters[colIdx] = ['__SHOW_NOTHING__'];
    else if (checked.length >= allVals.length) _columnFilters[colIdx] = [];
    else _columnFilters[colIdx] = checked.slice();
    closeColDropdown();
    applyAllFilters();
  }

  function toggleColFilter(colIdx, ev, anchorEl) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    closeColDropdown();
    var unique = uniqueValues(colIdx);
    var current = _columnFilters[colIdx] || [];
    var showNothing = current.indexOf('__SHOW_NOTHING__') >= 0;
    var isAll = !current.length && !showNothing;
    var selSet = filterSelSet(current);

    var dd = document.createElement('div');
    dd.className = 'uni-excel-filter-dropdown';
    dd.setAttribute('data-col-idx', String(colIdx));

    var search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search...';
    search.className = 'uni-filt-search';
    search.addEventListener('input', function () {
      var term = search.value.toLowerCase();
      dd.querySelectorAll('.uni-filt-val-row').forEach(function (lbl) {
        lbl.style.display = lbl.textContent.toLowerCase().indexOf(term) >= 0 ? 'flex' : 'none';
      });
    });
    dd.appendChild(search);

    var valuesWrap = document.createElement('div');
    valuesWrap.className = 'uni-filt-values';

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
      valuesWrap.querySelectorAll('.uni-filt-val-row input[type=checkbox]').forEach(function (cb) {
        cb.checked = on;
      });
    });
    valuesWrap.appendChild(selectAllLbl);

    unique.forEach(function (val) {
      var lbl = document.createElement('label');
      lbl.className = 'uni-filt-val-row';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = val;
      cb.setAttribute('data-filter-value', val);
      cb.style.pointerEvents = 'none';
      cb.checked = !showNothing && (isAll || !!selSet[valKey(val)]);
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(' ' + (val === '' ? '(Blank)' : val)));
      lbl.addEventListener('click', function (e) {
        e.preventDefault();
        cb.checked = !cb.checked;
        syncSelectAllState(valuesWrap, selectAllCb);
      });
      valuesWrap.appendChild(lbl);
    });
    syncSelectAllState(valuesWrap, selectAllCb);
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
      var th = resolveHeaderCell(e.target);
      if (!th) return;
      var idx = th.getAttribute('data-col-idx');
      if (idx === null || idx === '') return;
      e.preventDefault();
      e.stopPropagation();
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
      var filtered = _columnFilters[i] && _columnFilters[i].length > 0;
      var icon = filtered ? '🔽' : '▼';
      var cls = 'uni-filt-th' + (filtered ? ' filtered' : '');
      var highlight = i === _columnIndex ? ' outline:1px solid rgba(129,140,248,.5);' : '';
      return '<th class="' + cls + '" data-col-idx="' + i + '" style="' + thStyle + highlight
        + 'cursor:pointer;pointer-events:auto;user-select:none;'
        + 'color:' + (filtered ? '#4ade80' : (i === _columnIndex ? '#a5b4fc' : '#ffa578')) + ';" '
        + 'onclick="UniRowFilter.clickHeaderByIndex(' + i + ', event)" '
        + 'onmousedown="UniRowFilter.clickHeaderByIndex(' + i + ', event)" '
        + 'title="Click to filter ' + escHtml(h) + '">'
        + escHtml(h) + (i === _columnIndex ? ' ★' : '') + '<span class="uni-filt-icon" style="pointer-events:none;">' + icon + '</span></th>';
    }).join('');

    var bodyRows = rows.map(function (row, ri) {
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

    el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
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
    getColumnIndices().forEach(function (i) { _columnFilters[i] = []; });
    _filteredRows = _allRows.slice();
    updateBadge();
    return _filteredRows.slice();
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
    clickHeaderByIndex: clickHeaderByIndex
  };
})(typeof window !== 'undefined' ? window : this);
