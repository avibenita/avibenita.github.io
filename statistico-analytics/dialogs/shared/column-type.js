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

  function isNumericCell(value) {
    if (typeof value === 'number') return isFinite(value);
    if (typeof value === 'boolean') return false;
    if (value == null) return false;
    var s = String(value).trim();
    if (s === '') return false;
    var n = Number(s);
    if (isFinite(n)) return true;
    if (s.indexOf(',') >= 0 && s.indexOf('.') < 0) {
      n = Number(s.replace(',', '.'));
      return isFinite(n);
    }
    return false;
  }

  return { isNumericCell: isNumericCell };
});
