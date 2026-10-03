/**
 * Strict numeric-cell detection for variable-type badges.
 * parseFloat("35–49") / parseFloat("65+") is 35 / 65; Number() on the
 * whole trimmed cell is not, so age bands stay categorical.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoColumnType = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeNumericString(value) {
    if (typeof value === 'number') return isFinite(value) ? String(value) : '';
    if (value == null || typeof value === 'boolean') return '';
    var s = String(value)
      .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
      .replace(/\u2212/g, '-')
      .replace(/^\s+|\s+$/g, '');
    s = s.replace(/^[\u2010\u2011\u2012\u2013\u2014\u2015]+/, '-');
    return s.replace(/^\s+|\s+$/g, '');
  }

  function parseNumericCell(value) {
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    var s = normalizeNumericString(value);
    if (s === '') return NaN;
    var n = Number(s);
    if (isFinite(n)) return n;
    if (s.indexOf(',') >= 0 && s.indexOf('.') < 0) {
      n = Number(s.replace(',', '.'));
      return isFinite(n) ? n : NaN;
    }
    return NaN;
  }

  function isNumericCell(value) {
    if (typeof value === 'boolean') return false;
    return isFinite(parseNumericCell(value));
  }

  // Logistic (and similar) setup dialogs only need type, missingness, and the
  // level list. Office dialog messages are dropped once they get large, which
  // leaves the dialog on "Loading data…". Keep at most this many levels; one
  // past the cap means the column is not a binary outcome and not a categorical
  // predictor (those allow at most 20 levels).
  var CATEGORY_STORE_LIMIT = 21;

  function isBlankCell(value) {
    return value == null || value === '';
  }

  function classifyCell(value) {
    if (isBlankCell(value)) return 'missing';
    if (typeof value === 'number') return isFinite(value) ? 'numeric' : 'missing';
    if (typeof value === 'boolean' || typeof value === 'object') return 'string';
    return isNumericCell(value) ? 'numeric' : 'string';
  }

  function profileColumns(headers, rows) {
    var names = headers || [];
    var body = rows || [];
    var stats = {};
    var colCount = names.length;
    var rowCount = body.length;
    var col;

    for (col = 0; col < colCount; col++) {
      var numeric = 0;
      var stringCnt = 0;
      var missing = 0;
      var cats = Object.create(null);
      var stored = 0;
      var capped = false;
      var rowIdx;
      for (rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        var row = body[rowIdx];
        var value = row ? row[col] : null;
        var kind = classifyCell(value);
        if (kind === 'missing') { missing++; continue; }
        if (kind === 'numeric') numeric++;
        else stringCnt++;
        if (capped) continue;
        var key = String(value);
        if (cats[key]) cats[key]++;
        else if (stored >= CATEGORY_STORE_LIMIT) capped = true;
        else { cats[key] = 1; stored++; }
      }
      var catList = [];
      if (!capped) {
        var keyName;
        for (keyName in cats) {
          if (Object.prototype.hasOwnProperty.call(cats, keyName)) {
            catList.push({ value: keyName, freq: cats[keyName] });
          }
        }
      }
      stats[names[col]] = {
        numeric: numeric,
        string: stringCnt,
        missing: missing,
        categories: catList,
        uniqueCount: capped ? CATEGORY_STORE_LIMIT + 1 : stored,
        categoriesCapped: capped
      };
    }
    return stats;
  }

  function estimateChars(headers, rows) {
    if (!rows || !rows.length) return 0;
    var take = Math.min(24, rows.length);
    var step = Math.max(1, Math.floor(rows.length / take));
    var total = 0;
    var counted = 0;
    var i;
    for (i = 0; i < rows.length && counted < take; i += step) {
      var obj = {};
      var row = rows[i] || [];
      var c;
      for (c = 0; c < row.length; c++) obj[(headers && headers[c]) || ('Col ' + (c + 1))] = row[c];
      total += JSON.stringify(obj).length + 1;
      counted++;
    }
    return counted ? Math.round((total / counted) * rows.length) : 0;
  }

  /**
   * Compact logistic setup payload. `rows` is intentionally empty: the parent
   * keeps the worksheet values and the dialog only needs the profile.
   */
  function logisticDialogPayload(values, address, extras) {
    var table = values || [];
    var headers = table[0] || [];
    var rows = table.length > 1 ? table.slice(1) : [];
    var extra = extras || {};
    return {
      headers: headers,
      rows: [],
      rowCount: rows.length,
      address: address || '',
      columnStats: profileColumns(headers, rows),
      estimatedChars: estimateChars(headers, rows),
      analysisMode: extra.analysisMode || 'logistic',
      savedModelSpec: extra.savedModelSpec == null ? null : extra.savedModelSpec,
      restoreSavedModel: extra.restoreSavedModel === true,
      profiled: true
    };
  }

  return {
    isNumericCell: isNumericCell,
    parseNumericCell: parseNumericCell,
    normalizeNumericString: normalizeNumericString,
    CATEGORY_STORE_LIMIT: CATEGORY_STORE_LIMIT,
    profileColumns: profileColumns,
    estimateChars: estimateChars,
    logisticDialogPayload: logisticDialogPayload
  };
});
