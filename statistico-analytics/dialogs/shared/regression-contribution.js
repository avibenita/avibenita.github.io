/**
 * Display helpers for one drop-one ordinary R².
 * The fit itself is StatisticoPredictorContribution, the component Regression
 * Results uses. Both screens then publish the same full R² and the same
 * percentage-point drop.
 *
 * 57.81% minus 11.20% is 46.61 percentage points. The chart prints the drop
 * the same way Regression Results does: two decimals of (full R² − reduced R²) × 100.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StatisticoRegressionContribution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function fixed(value, digits) {
    var fn = Number.prototype.__statisticoToFixedOriginal || Number.prototype.toFixed;
    return fn.call(Number(value), digits);
  }

  function percentNumber(fraction) {
    if (!Number.isFinite(fraction)) return NaN;
    return Number(fixed(fraction * 100, 2));
  }

  function reportedDrop(fullR2, reducedR2) {
    var full = percentNumber(fullR2);
    var reduced = percentNumber(reducedR2);
    if (!Number.isFinite(full) || !Number.isFinite(reduced)) return null;
    var points = Number(fixed(full - reduced, 2));
    return {
      full: full,
      reduced: reduced,
      points: points,
      fullText: fixed(full, 2) + '%',
      reducedText: fixed(reduced, 2) + '%',
      pointsText: fixed(points, 2) + ' pp'
    };
  }

  function chartDrop(fullR2, reducedR2) {
    if (!Number.isFinite(fullR2) || !Number.isFinite(reducedR2)) return null;
    var full = Number(fixed(fullR2 * 100, 2));
    var reduced = Number(fixed(reducedR2 * 100, 2));
    var points = Number(fixed((fullR2 - reducedR2) * 100, 2));
    return {
      full: full,
      reduced: reduced,
      points: points,
      fullText: fixed(full, 2) + '%',
      reducedText: fixed(reduced, 2) + '%',
      pointsText: fixed(points, 2) + ' pp'
    };
  }

  function fromPredictorResult(result, predictors) {
    var out = {};
    var names = predictors || [];
    if (!result || result.status !== 'ready') {
      var reason = (result && result.reason) || 'Predictor contributions are unavailable.';
      names.forEach(function (name) {
        out[name] = { ok: false, reason: reason, n: result && result.n };
      });
      return out;
    }
    var seen = Object.create(null);
    (result.bars || []).forEach(function (bar) {
      seen[bar.name] = true;
      out[bar.name] = {
        ok: true,
        fullR2: result.fullR2,
        reducedR2: bar.reducedR2,
        drop: bar.drop,
        n: result.n,
        reason: ''
      };
    });
    (result.unavailable || []).forEach(function (item) {
      seen[item.name] = true;
      out[item.name] = {
        ok: false,
        reason: item.reason || 'The reduced fit did not produce a finite R².',
        n: result.n
      };
    });
    names.forEach(function (name) {
      if (!seen[name]) {
        out[name] = { ok: false, reason: 'This predictor is not in the active model.', n: result.n };
      }
    });
    return out;
  }

  function columnDependsOn(col, predictor) {
    if (!col || predictor == null) return false;
    if (col.kind === 'numeric') return col.name === predictor;
    if (col.kind === 'dummy') return col.factor === predictor;
    if (col.kind === 'interaction') {
      return (col.factors || []).some(function (factor) {
        if (factor.kind === 'numeric') return factor.name === predictor;
        if (factor.kind === 'dummy') return factor.factor === predictor;
        return false;
      });
    }
    return false;
  }

  function predictorContributions(computeOLS, xMatrix, yVector, columns, predictors, includeIntercept, fitted) {
    var full = null;
    if (fitted && Number.isFinite(fitted.R2) && Number.isFinite(fitted.n)) {
      full = fitted;
    } else {
      try {
        full = computeOLS(xMatrix.map(function (row) { return row.slice(); }), yVector.slice(), includeIntercept !== false, 0.05);
      } catch (err) {
        full = null;
      }
    }
    var out = {};
    (predictors || []).forEach(function (name) {
      if (!columns.some(function (col) { return columnDependsOn(col, name); })) {
        out[name] = { ok: false, reason: 'This predictor is not in the active model.' };
        return;
      }
      if (!full || !Number.isFinite(full.R2)) {
        out[name] = { ok: false, reason: 'The full model does not report an ordinary R².' };
        return;
      }
      var keep = [];
      columns.forEach(function (col, index) {
        if (!columnDependsOn(col, name)) keep.push(index);
      });
      var reducedX = xMatrix.map(function (row) {
        return keep.map(function (colIndex) { return row[colIndex]; });
      });
      if (!reducedX.length || (!reducedX[0].length && includeIntercept === false)) {
        out[name] = { ok: false, reason: 'The model without this predictor could not be estimated.' };
        return;
      }
      var reduced = null;
      try {
        reduced = computeOLS(reducedX, yVector.slice(), includeIntercept !== false, 0.05);
      } catch (err) {
        reduced = null;
      }
      if (!reduced || !Number.isFinite(reduced.R2)) {
        out[name] = { ok: false, reason: 'The model without this predictor could not be estimated.' };
        return;
      }
      out[name] = {
        ok: true,
        fullR2: full.R2,
        reducedR2: reduced.R2,
        drop: full.R2 - reduced.R2,
        n: full.n,
        reason: ''
      };
    });
    return out;
  }

  return {
    fixed: fixed,
    percentNumber: percentNumber,
    reportedDrop: reportedDrop,
    chartDrop: chartDrop,
    fromPredictorResult: fromPredictorResult,
    columnDependsOn: columnDependsOn,
    predictorContributions: predictorContributions
  };
});
