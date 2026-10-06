/**
 * Shared Multivariable Visualisation sample — countries bubble dataset.
 * Used by dialogs (input/results) and the hub taskpane panel.
 */
(function (global) {
  "use strict";

  var HEADERS = ["Country", "Region", "GDP", "LifeExp", "Population", "CO2"];

  var ROWS = [
    ["Norway", "Europe", 89, 83.2, 5.4, 7.2],
    ["Germany", "Europe", 54, 81.1, 83.8, 8.1],
    ["France", "Europe", 46, 82.5, 67.8, 4.6],
    ["Italy", "Europe", 39, 83.0, 58.9, 5.4],
    ["Spain", "Europe", 33, 83.3, 47.4, 5.1],
    ["Poland", "Europe", 22, 76.5, 37.7, 8.0],
    ["USA", "Americas", 76, 77.3, 333, 14.9],
    ["Canada", "Americas", 55, 82.0, 39, 14.2],
    ["Brazil", "Americas", 10, 75.9, 215, 2.2],
    ["Mexico", "Americas", 12, 75.1, 128, 3.6],
    ["Chile", "Americas", 17, 80.2, 19.5, 4.4],
    ["Argentina", "Americas", 14, 76.1, 46, 3.9],
    ["Japan", "Asia", 34, 84.5, 125, 8.5],
    ["South Korea", "Asia", 35, 83.7, 51.7, 11.6],
    ["China", "Asia", 13, 78.2, 1412, 8.0],
    ["India", "Asia", 2.6, 70.8, 1428, 2.0],
    ["Indonesia", "Asia", 5.0, 71.3, 277, 2.3],
    ["Vietnam", "Asia", 4.3, 74.4, 98, 2.9],
    ["Australia", "Oceania", 65, 83.4, 26.3, 15.0],
    ["New Zealand", "Oceania", 49, 82.5, 5.2, 6.6],
    ["Nigeria", "Africa", 2.2, 54.5, 223, 0.6],
    ["South Africa", "Africa", 6.5, 62.3, 60, 7.4],
    ["Egypt", "Africa", 4.0, 71.8, 112, 2.4],
    ["Kenya", "Africa", 2.1, 63.5, 55, 0.4],
    ["Morocco", "Africa", 3.9, 74.3, 37.5, 1.9],
    ["Ghana", "Africa", 2.4, 64.1, 33.5, 0.6]
  ];

  var DEFAULT_SPEC = {
    chartMode: "quadrant",
    xColName: "GDP",
    yColName: "LifeExp",
    sizeColName: "Population",
    colorColName: "Region",
    labelColName: "Country",
    groupColName: null,
    xColIndex: 2,
    yColIndex: 3,
    sizeColIndex: 4,
    colorColIndex: 1,
    labelColIndex: 0,
    groupColIndex: null,
    includedIndices: [0, 1, 2, 3, 4, 5]
  };

  function getTable() {
    return {
      headers: HEADERS.slice(),
      rows: ROWS.map(function (r) { return r.slice(); }),
      values: [HEADERS.slice()].concat(ROWS.map(function (r) { return r.slice(); }))
    };
  }

  function getConfigPayload(address) {
    var t = getTable();
    return {
      headers: t.headers,
      rows: t.rows,
      address: address || "MV Sample (built-in)",
      savedModelSpec: Object.assign({}, DEFAULT_SPEC),
      isSample: true
    };
  }

  function getRunPayload() {
    var t = getTable();
    return {
      headers: t.headers,
      rows: t.rows,
      rawValues: t.values,
      spec: Object.assign({}, DEFAULT_SPEC),
      isSample: true
    };
  }

  global.MvSampleData = {
    SHEET_NAME: "MV Sample",
    headers: HEADERS,
    rows: ROWS,
    defaultSpec: DEFAULT_SPEC,
    getTable: getTable,
    getConfigPayload: getConfigPayload,
    getRunPayload: getRunPayload
  };
})(typeof window !== "undefined" ? window : this);
