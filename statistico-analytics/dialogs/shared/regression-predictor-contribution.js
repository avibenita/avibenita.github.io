/**
 * Drop in ordinary R² when each source predictor is removed from an
 * intercept OLS / ANCOVA fit. The active sample, response, and retained
 * encoding stay fixed. This does not replace the active fit.
 *
 * Drop = full R² − reduced R², using one centered response sum of squares.
 * The same quantity is (reduced residual SS − full residual SS) / SST.
 * Solver roundoff matches matrixInverse (1e-10).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoPredictorContribution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ROUNDOFF = 1e-10;

  function logger(spec) {
    if (spec && typeof spec.log === 'function') return spec.log;
    return function (message) {
      if (typeof console !== 'undefined' && console.warn) console.warn(message);
    };
  }

  function hasIntercept(spec) {
    return !!(spec && (spec.includeIntercept === true || spec.includeIntercept === 1));
  }

  function usesWeights(spec) {
    var weights = spec && spec.weighted;
    if (Array.isArray(weights)) return weights.length > 0;
    return !!weights;
  }

  function finiteVector(values) {
    if (!Array.isArray(values) || !values.length) return false;
    for (var i = 0; i < values.length; i++) {
      if (!Number.isFinite(values[i])) return false;
    }
    return true;
  }

  function matrixOk(xMatrix, y, columns) {
    if (!Array.isArray(xMatrix) || xMatrix.length !== y.length) return false;
    var width = xMatrix[0] ? xMatrix[0].length : 0;
    for (var r = 0; r < xMatrix.length; r++) {
      var row = xMatrix[r];
      if (!Array.isArray(row) || row.length !== width) return false;
      for (var c = 0; c < width; c++) {
        if (!Number.isFinite(row[c])) return false;
      }
    }
    for (var i = 0; i < columns.length; i++) {
      var idx = columns[i].sourceIndex;
      if (typeof idx !== 'number' || !Number.isFinite(idx) || idx < 0 || idx % 1 !== 0 || idx >= width) return false;
    }
    return true;
  }

  function responseSst(y) {
    var n = y.length;
    var mean = 0;
    for (var i = 0; i < n; i++) mean += y[i];
    mean /= n;
    var sst = 0;
    for (var j = 0; j < n; j++) {
      var d = y[j] - mean;
      sst += d * d;
    }
    return sst;
  }

  function copyColumns(columns) {
    return (columns || []).map(function (col) {
      var factors = null;
      if (Array.isArray(col.factors)) {
        factors = col.factors.map(function (factor) {
          return {
            kind: factor && factor.kind,
            name: factor && factor.name,
            factor: factor && factor.factor,
            level: factor && factor.level != null ? String(factor.level) : factor && factor.level
          };
        });
      }
      var key = col.key || col.name;
      var name = col.name || col.key;
      return {
        key: key,
        name: name,
        kind: col.kind,
        factor: col.factor,
        level: col.level != null ? String(col.level) : col.level,
        sourceIndex: col.sourceIndex,
        factors: factors
      };
    });
  }

  function buildGroups(columns) {
    var groups = [];
    var byId = Object.create(null);
    var pending = [];

    function addMain(id, name, kind) {
      var existing = byId[id];
      if (existing) {
        if (existing.kind !== kind) return null;
        return existing;
      }
      var group = {
        id: id,
        name: name,
        kind: kind,
        order: groups.length,
        mainKeys: [],
        columns: []
      };
      byId[id] = group;
      groups.push(group);
      return group;
    }

    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      if (!col || !col.key || !col.name) return null;
      if (col.kind === 'numeric') {
        var numeric = addMain(String(col.name), String(col.name), 'numeric');
        if (!numeric) return null;
        numeric.mainKeys.push(col.key);
        numeric.columns.push(col);
      } else if (col.kind === 'dummy') {
        if (!col.factor) return null;
        var factor = addMain(String(col.factor), String(col.factor), 'factor');
        if (!factor) return null;
        factor.mainKeys.push(col.key);
        factor.columns.push(col);
      } else if (col.kind === 'interaction') {
        if (!Array.isArray(col.factors) || !col.factors.length) return null;
        var owners = [];
        var seen = Object.create(null);
        for (var f = 0; f < col.factors.length; f++) {
          var part = col.factors[f];
          var ownerId = null;
          if (part && part.kind === 'numeric' && part.name) ownerId = String(part.name);
          else if (part && part.kind === 'dummy' && part.factor) ownerId = String(part.factor);
          if (!ownerId || seen[ownerId]) {
            if (!ownerId) return null;
            continue;
          }
          seen[ownerId] = true;
          owners.push(ownerId);
        }
        if (!owners.length) return null;
        pending.push({ col: col, owners: owners });
      } else {
        return null;
      }
    }

    for (var p = 0; p < pending.length; p++) {
      var item = pending[p];
      for (var o = 0; o < item.owners.length; o++) {
        var owner = byId[item.owners[o]];
        if (!owner) return null;
        owner.columns.push(item.col);
      }
    }

    return groups;
  }

  function removedFrom(columns, group) {
    var drop = Object.create(null);
    group.columns.forEach(function (col) { drop[col.key] = true; });
    var main = Object.create(null);
    group.mainKeys.forEach(function (key) { main[key] = true; });
    var removed = [];
    columns.forEach(function (col) {
      if (drop[col.key]) removed.push(col);
    });
    return {
      removed: removed,
      broader: removed.some(function (col) { return !main[col.key]; }),
      keep: columns.filter(function (col) { return !drop[col.key]; }).map(function (col) { return col.sourceIndex; })
    };
  }

  function omit(reason) {
    return { status: 'omit', reason: reason };
  }

  function unavailable(reason) {
    return { status: 'unavailable', reason: reason };
  }

  function assess(spec) {
    spec = spec || {};
    if (!hasIntercept(spec)) return { status: 'omit', result: omit('no-intercept') };
    if (usesWeights(spec)) return { status: 'omit', result: omit('weighted') };
    if (typeof spec.computeOLS !== 'function') {
      return { status: 'unavailable', result: unavailable('The regression solver is not available, so predictor contributions are unavailable.') };
    }
    var y = spec.yVector;
    if (!finiteVector(y)) {
      return { status: 'unavailable', result: unavailable('This fit has no analyzed rows, so predictor contributions are unavailable.') };
    }
    var columns = copyColumns(spec.columns || []);
    if (!matrixOk(spec.xMatrix, y, columns)) {
      return { status: 'unavailable', result: unavailable('The design matrix does not match the fitted terms, so predictor contributions are unavailable.') };
    }
    if (spec.groupingUnsafe) {
      return { status: 'unavailable', result: unavailable('Term grouping could not be established, so predictor contributions are unavailable.') };
    }
    if (!columns.length) return { status: 'omit', result: omit('intercept-only') };
    var groups = buildGroups(columns);
    if (!groups) {
      return { status: 'unavailable', result: unavailable('Term grouping could not be established, so predictor contributions are unavailable.') };
    }
    if (!groups.length) return { status: 'omit', result: omit('intercept-only') };
    var sst = responseSst(y);
    if (!(sst > 0) || !Number.isFinite(sst)) {
      return { status: 'unavailable', result: unavailable('The response does not vary, so a drop in R² is undefined.') };
    }
    var prepared = groups.map(function (group) {
      var removed = removedFrom(columns, group);
      return {
        id: group.id,
        name: group.name,
        order: group.order,
        keep: removed.keep,
        removedKeys: removed.removed.map(function (col) { return col.key; }),
        removedNames: removed.removed.map(function (col) { return col.name; }),
        broaderThanMainEffect: removed.broader
      };
    });
    return {
      status: 'compute',
      plan: {
        yVector: y.slice(),
        xMatrix: spec.xMatrix.map(function (row) { return row.slice(); }),
        columns: columns,
        groups: prepared,
        keepAll: columns.map(function (col) { return col.sourceIndex; }),
        sst: sst,
        computeOLS: spec.computeOLS,
        fullResults: spec.fullResults || null,
        log: logger(spec)
      }
    };
  }

  function fitDesign(computeOLS, xMatrix, y, indexes) {
    if (!indexes.length) {
      var ones = y.map(function () { return [1]; });
      var interceptOnly = computeOLS(ones, y, false, 0.05);
      interceptOnly.includeIntercept = true;
      return interceptOnly;
    }
    var reduced = xMatrix.map(function (row) {
      return indexes.map(function (idx) { return row[idx]; });
    });
    return computeOLS(reduced, y, true, 0.05);
  }

  function usableFit(fit, n, parameterCount) {
    if (!fit || fit.n !== n || !Number.isFinite(fit.SSR)) return false;
    if (parameterCount != null && fit.k !== parameterCount) return false;
    if (!Array.isArray(fit.coefficients) || fit.coefficients.length !== fit.k) return false;
    for (var i = 0; i < fit.coefficients.length; i++) {
      if (!Number.isFinite(fit.coefficients[i])) return false;
    }
    return true;
  }

  function rSquared(ssr, sst) {
    return 1 - ssr / sst;
  }

  function baseline(plan) {
    var provided = plan.fullResults;
    var n = plan.yVector.length;
    var parameters = plan.keepAll.length + 1;
    if (usableFit(provided, n, parameters) && provided.includeIntercept !== false) {
      return provided;
    }
    return fitDesign(plan.computeOLS, plan.xMatrix, plan.yVector, plan.keepAll);
  }

  function groupEntry(plan, group) {
    try {
      var fit = fitDesign(plan.computeOLS, plan.xMatrix, plan.yVector, group.keep);
      var parameters = group.keep.length ? group.keep.length + 1 : 1;
      if (!usableFit(fit, plan.yVector.length, parameters)) {
        plan.log('Predictor contribution for ' + group.name + ' did not produce a finite reduced fit.');
        return {
          status: 'unavailable',
          id: group.id,
          name: group.name,
          order: group.order,
          reason: 'The reduced fit did not produce a finite R².'
        };
      }
      var reducedR2 = rSquared(fit.SSR, plan.sst);
      var drop = plan.fullR2 - reducedR2;
      if (!Number.isFinite(reducedR2) || !Number.isFinite(drop)) {
        plan.log('Predictor contribution for ' + group.name + ' was not finite and is unavailable.');
        return {
          status: 'unavailable',
          id: group.id,
          name: group.name,
          order: group.order,
          reason: 'The reduced fit did not produce a finite R².'
        };
      }
      if (drop < -ROUNDOFF) {
        plan.log('Predictor contribution for ' + group.name + ' was materially negative (' + drop + ') and is unavailable.');
        return {
          status: 'unavailable',
          id: group.id,
          name: group.name,
          order: group.order,
          reason: 'The reduced fit is not a valid comparison for this predictor.'
        };
      }
      if (drop < 0) drop = 0;
      return {
        status: 'ready',
        id: group.id,
        name: group.name,
        order: group.order,
        drop: drop,
        reducedR2: plan.fullR2 - drop,
        removedKeys: group.removedKeys.slice(),
        removedNames: group.removedNames.slice(),
        broaderThanMainEffect: group.broaderThanMainEffect
      };
    } catch (err) {
      plan.log('Predictor contribution for ' + group.name + ' could not be computed: ' + (err && err.message ? err.message : err));
      return {
        status: 'unavailable',
        id: group.id,
        name: group.name,
        order: group.order,
        reason: 'The reduced fit could not be computed.'
      };
    }
  }

  function finish(plan, entries) {
    var bars = [];
    var missing = [];
    entries.forEach(function (entry) {
      if (entry.status === 'ready') bars.push(entry);
      else missing.push(entry);
    });
    bars.sort(function (a, b) {
      if (a.drop < b.drop) return 1;
      if (a.drop > b.drop) return -1;
      return a.order - b.order;
    });
    missing.sort(function (a, b) { return a.order - b.order; });
    return {
      status: 'ready',
      n: plan.yVector.length,
      fullR2: plan.fullR2,
      sst: plan.sst,
      bars: bars,
      unavailable: missing
    };
  }

  function createSession(spec) {
    var gate = assess(spec);
    if (gate.status !== 'compute') return { done: true, result: gate.result };
    var plan = gate.plan;
    var full;
    try {
      full = baseline(plan);
    } catch (err) {
      plan.log('Predictor contribution baseline fit failed: ' + (err && err.message ? err.message : err));
      return {
        done: true,
        result: unavailable('The baseline fit is not usable, so predictor contributions are unavailable.')
      };
    }
    if (!usableFit(full, plan.yVector.length, plan.keepAll.length + 1)) {
      plan.log('Predictor contribution baseline fit was not usable.');
      return {
        done: true,
        result: unavailable('The baseline fit is not usable, so predictor contributions are unavailable.')
      };
    }
    var fullR2 = rSquared(full.SSR, plan.sst);
    if (!Number.isFinite(fullR2) || fullR2 < -ROUNDOFF || fullR2 > 1 + 1e-8) {
      plan.log('Predictor contribution baseline R² was not usable (' + fullR2 + ').');
      return {
        done: true,
        result: unavailable('The baseline fit is not usable, so predictor contributions are unavailable.')
      };
    }
    if (fullR2 < 0) fullR2 = 0;
    if (fullR2 > 1) fullR2 = 1;
    plan.fullR2 = fullR2;
    var index = 0;
    var entries = [];
    var session = {
      done: false,
      result: null,
      step: function () {
        if (session.done) return;
        if (index < plan.groups.length) {
          entries.push(groupEntry(plan, plan.groups[index]));
          index += 1;
        }
        if (index >= plan.groups.length) {
          session.done = true;
          session.result = finish(plan, entries);
        }
      }
    };
    return session;
  }

  function compute(spec) {
    try {
      var session = createSession(spec);
      while (!session.done) session.step();
      return session.result;
    } catch (err) {
      logger(spec)('Predictor contributions could not be calculated: ' + (err && err.message ? err.message : err));
      return {
        status: 'error',
        retryable: true,
        reason: 'Predictor contributions could not be calculated.'
      };
    }
  }

  function createTokenSource() {
    var current = 0;
    return {
      begin: function () {
        current += 1;
        return current;
      },
      isCurrent: function (token) {
        return token === current;
      }
    };
  }

  return {
    roundoff: ROUNDOFF,
    assess: assess,
    compute: compute,
    createSession: createSession,
    createTokenSource: createTokenSource
  };
});
