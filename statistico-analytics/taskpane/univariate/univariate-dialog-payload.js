/**
 * Full payload for univariate results dialogs (histogram, etc.).
 * Includes source range rows required for Excel-style row filtering.
 */
(function (global) {
  "use strict";

  function buildUnivariateDialogPayload(results) {
    if (!results) return {};
    var r = results;
    return {
      values: r.values || r.rawData || [],
      rawData: r.rawData || r.values || [],
      column: r.column,
      descriptive: r.descriptive,
      n: r.n,
      columnIndex: r.columnIndex != null ? Number(r.columnIndex) : 0,
      transform: r.transform || "none",
      trim: r.trim || { min: 0, max: 100 },
      dataSource: r.dataSource || "",
      sourceHeaders: r.sourceHeaders || null,
      sourceRows: r.sourceRows || null
    };
  }

  global.buildUnivariateDialogPayload = buildUnivariateDialogPayload;
})(typeof window !== "undefined" ? window : this);
