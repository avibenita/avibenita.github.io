/**
 * Session-local case tracing and a temporary leave-one-out regression refit.
 * The original analysis object is never replaced. Identity is the source
 * position (and host row id when that list is unique), not the display label.
 */
(function (root, factory) {
  var ols = typeof computeOLS === 'function' ? computeOLS : null;
  var tInv = typeof tInverse === 'function' ? tInverse : null;
  var api = factory(ols, tInv);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoCaseTrace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (computeOLS, tInverse) {
  'use strict';

  if (typeof computeOLS !== 'function' || typeof tInverse !== 'function') {
    var lib = require('../../src/shared/js/core/regression-compute.js');
    computeOLS = lib.computeOLS;
    tInverse = lib.tInverse;
  }

  var ID_HEADER = /^(id|case|case[\s_-]?id|obs|observation|row[\s_-]?id|rowid)$/i;

  function stampIdentity(rows, address, rowIds, headers) {
    var list = Array.isArray(rows) ? rows : [];
    var idCol = findIdColumn(headers);
    var idTexts = idCol == null ? [] : list.map(function (row) {
      if (!Array.isArray(row)) return '';
      var raw = row[idCol];
      return raw == null || raw === '' ? '' : String(raw);
    });
    var idCounts = Object.create(null);
    idTexts.forEach(function (text) {
      if (!text) return;
      idCounts[text] = (idCounts[text] || 0) + 1;
    });
    var excelRows = excelRowNumbers(address, list.length);
    var hostIds = Array.isArray(rowIds) && rowIds.length === list.length ? rowIds : null;
    var hostUnique = false;
    if (hostIds) {
      var seen = Object.create(null);
      hostUnique = hostIds.every(function (id) {
        if (id == null || id === '') return false;
        var key = String(id);
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
    }
    return {
      hostIdsValid: !hostIds || hostUnique,
      entries: list.map(function (row, i) {
        var excelRow = excelRows ? excelRows[i] : null;
        var sourceLabel = excelRow != null ? ('Row ' + excelRow) : ('Obs ' + (i + 1));
        var displayLabel = sourceLabel;
        if (idCol != null && Array.isArray(row)) {
          var text = idTexts[i];
          if (text && idCounts[text] === 1) displayLabel = text;
          else if (text) displayLabel = text + ' · ' + sourceLabel;
        }
        var caseKey = hostIds && hostUnique
          ? ('id:' + String(hostIds[i]))
          : ('src:' + (address || 'payload') + ':' + i);
        return {
          caseKey: caseKey,
          sourceIndex: i,
          displayLabel: displayLabel,
          sourceLabel: sourceLabel,
          excelRow: excelRow,
          analyzed: false
        };
      })
    };
  }

  function findIdColumn(headers) {
    if (!Array.isArray(headers)) return null;
    for (var i = 0; i < headers.length; i++) {
      if (ID_HEADER.test(String(headers[i] || '').trim())) return i;
    }
    return null;
  }

  function excelRowNumbers(address, n) {
    if (!address || typeof address !== 'string') return null;
    var match = address.match(/^(.*!)?([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/);
    if (!match) return null;
    var dataStart = parseInt(match[3], 10) + 1;
    if (!Number.isFinite(dataStart)) return null;
    var out = [];
    for (var i = 0; i < n; i++) out.push(dataStart + i);
    return out;
  }

  function dummyCodes(value, categories) {
    var dummies = [];
    var strValue = String(value);
    for (var i = 1; i < categories.length; i++) dummies.push(strValue === String(categories[i]) ? 1 : 0);
    return dummies;
  }

  function factorMap(row, categoricalInfo) {
    var factors = {};
    (categoricalInfo || []).forEach(function (cat) {
      factors[cat.name] = row[cat.index] == null ? '' : String(row[cat.index]);
    });
    return factors;
  }

  function buildAnalyzedDesign(input) {
    input = input || {};
    var headers = input.headers;
    var rows = input.rows;
    if (!Array.isArray(headers) || !Array.isArray(rows)) {
      return {
        ok: false,
        mappingSafe: false,
        mappingReason: 'This payload has no row list, so a case cannot be traced.',
        identity: [],
        cases: [],
        xMatrix: [],
        yVector: []
      };
    }
    if (rows.some(function (row) { return !Array.isArray(row); })) {
      return {
        ok: false,
        mappingSafe: false,
        mappingReason: 'This payload mixes non-row records, so a case cannot be traced safely.',
        identity: [],
        cases: [],
        xMatrix: [],
        yVector: []
      };
    }
    var stamped = input.identity
      ? { entries: input.identity, hostIdsValid: input.hostIdsValid !== false }
      : stampIdentity(rows, input.address, input.rowIds, headers);
    if (stamped.entries.length !== rows.length) {
      return {
        ok: false,
        mappingSafe: false,
        mappingReason: 'The stored row identity does not match this payload, so a case cannot be traced safely.',
        identity: [],
        cases: [],
        xMatrix: [],
        yVector: []
      };
    }
    var keySeen = Object.create(null);
    var keysUnique = stamped.entries.every(function (entry) {
      if (!entry || !entry.caseKey || keySeen[entry.caseKey]) return false;
      keySeen[entry.caseKey] = true;
      return true;
    });
    var mappingSafe = keysUnique;
    var mappingReason = mappingSafe
      ? ''
      : 'Row identifiers in this payload are not unique, so a case cannot be traced safely.';

    var yIndex = input.yIndex;
    var xnIndices = input.xnIndices || [];
    var categoricalInfo = input.categoricalInfo || [];
    var interactionInfo = input.interactionInfo || [];
    var preExcluded = {};
    (input.preExcludedIndexes || []).forEach(function (idx) { preExcluded[idx] = true; });

    var xMatrix = [];
    var yVector = [];
    var cases = [];
    var usedOriginalRows = [];
    var usedOriginalRowIndices = [];

    for (var i = 0; i < rows.length; i++) {
      if (preExcluded[i]) continue;
      var row = rows[i];
      var yVal = parseFloat(row[yIndex]);
      if (isNaN(yVal)) continue;
      var xRow = [];
      var validRow = true;
      for (var nx = 0; nx < xnIndices.length; nx++) {
        var val = parseFloat(row[xnIndices[nx]]);
        if (isNaN(val)) { validRow = false; break; }
        xRow.push(val);
      }
      if (!validRow) continue;
      for (var c = 0; c < categoricalInfo.length; c++) {
        var catInfo = categoricalInfo[c];
        var catValue = row[catInfo.index];
        if (catValue === null || catValue === undefined || catValue === '') {
          validRow = false;
          break;
        }
        dummyCodes(catValue, catInfo.categories).forEach(function (d) { xRow.push(d); });
      }
      if (!validRow) continue;
      for (var ix = 0; ix < interactionInfo.length; ix++) {
        var ixi = interactionInfo[ix];
        if (ixi.v1IsNumeric && ixi.v2IsNumeric) {
          xRow.push(parseFloat(row[ixi.v1Idx]) * parseFloat(row[ixi.v2Idx]));
        } else if (ixi.v1IsNumeric && ixi.v2Cat) {
          var v1 = parseFloat(row[ixi.v1Idx]);
          dummyCodes(row[ixi.v2Cat.index], ixi.v2Cat.categories).forEach(function (d) { xRow.push(v1 * d); });
        } else if (ixi.v1Cat && ixi.v2IsNumeric) {
          var v2 = parseFloat(row[ixi.v2Idx]);
          dummyCodes(row[ixi.v1Cat.index], ixi.v1Cat.categories).forEach(function (d) { xRow.push(d * v2); });
        } else if (ixi.v1Cat && ixi.v2Cat) {
          var dums1 = dummyCodes(row[ixi.v1Cat.index], ixi.v1Cat.categories);
          var dums2 = dummyCodes(row[ixi.v2Cat.index], ixi.v2Cat.categories);
          dums1.forEach(function (d1) { dums2.forEach(function (d2) { xRow.push(d1 * d2); }); });
        }
      }
      var ident = Object.assign({}, stamped.entries[i], { analyzed: true, analyzedIndex: cases.length });
      ident.factors = factorMap(row, categoricalInfo);
      cases.push(ident);
      xMatrix.push(xRow);
      yVector.push(yVal);
      usedOriginalRows.push(row);
      usedOriginalRowIndices.push(i);
    }

    return {
      ok: true,
      mappingSafe: mappingSafe,
      mappingReason: mappingReason,
      identity: stamped.entries,
      cases: cases,
      xMatrix: xMatrix,
      yVector: yVector,
      usedOriginalRows: usedOriginalRows,
      usedOriginalRowIndices: usedOriginalRowIndices
    };
  }

  function designRowFromInputs(inputs, columns) {
    inputs = inputs || {};
    return (columns || []).map(function (col) {
      if (col.kind === 'numeric') {
        var num = Number(inputs[col.name]);
        return Number.isFinite(num) ? num : NaN;
      }
      if (col.kind === 'dummy') return String(inputs[col.factor]) === String(col.level) ? 1 : 0;
      if (col.kind === 'interaction') {
        var prod = 1;
        var factors = col.factors || [];
        for (var i = 0; i < factors.length; i++) {
          var f = factors[i];
          if (f.kind === 'numeric') {
            var v = Number(inputs[f.name]);
            if (!Number.isFinite(v)) return NaN;
            prod *= v;
          } else if (f.kind === 'dummy') {
            prod *= String(inputs[f.factor]) === String(f.level) ? 1 : 0;
          }
        }
        return prod;
      }
      return NaN;
    });
  }

  function withIntercept(row, includeIntercept) {
    return includeIntercept ? [1].concat(row) : row.slice();
  }

  function meanResponse(results, xRow, includeIntercept) {
    if (!results || !Array.isArray(results.coefficients) || !results.XtX_inv) {
      return { ok: false, reason: 'The fitted mean is not available for this model.' };
    }
    var x = withIntercept(xRow || [], includeIntercept);
    if (x.length !== results.coefficients.length || x.some(function (v) { return !Number.isFinite(v); })) {
      return { ok: false, reason: 'The scenario does not match this model.' };
    }
    var yhat = 0;
    for (var i = 0; i < x.length; i++) yhat += x[i] * results.coefficients[i];
    var inv = results.XtX_inv;
    var quad = 0;
    for (var r = 0; r < x.length; r++) {
      var inner = 0;
      for (var c = 0; c < x.length; c++) inner += inv[r][c] * x[c];
      quad += x[r] * inner;
    }
    if (!Number.isFinite(yhat)) return { ok: false, reason: 'The fitted mean is undefined for this scenario.' };
    var alpha = Number.isFinite(results.alpha) ? results.alpha : 0.05;
    var df = results.df;
    var mse = results.MSE;
    if (!(quad >= 0) || !Number.isFinite(mse) || !Number.isFinite(df) || df < 1) {
      return { ok: true, estimate: yhat, ci: null, ciReason: 'The confidence interval for the fitted mean is undefined for this fit.', level: 1 - alpha };
    }
    var se = Math.sqrt(mse * quad);
    if (!Number.isFinite(se)) {
      return { ok: true, estimate: yhat, ci: null, ciReason: 'The confidence interval for the fitted mean is undefined for this fit.', level: 1 - alpha };
    }
    var tcrit = tInverse(alpha / 2, df);
    return {
      ok: true,
      estimate: yhat,
      se: se,
      level: 1 - alpha,
      ci: [yhat - tcrit * se, yhat + tcrit * se],
      ciReason: ''
    };
  }

  function factorsUsed(columns, categoricalInfo) {
    var names = Object.create(null);
    if (!columns) {
      (categoricalInfo || []).forEach(function (cat) { names[cat.name] = true; });
      return names;
    }
    columns.forEach(function (col) {
      if (col.kind === 'dummy' && col.factor) names[col.factor] = true;
      (col.factors || []).forEach(function (f) {
        if (f.kind === 'dummy' && f.factor) names[f.factor] = true;
      });
    });
    return names;
  }

  function lostLevel(cases, omittedIndex, columns, categoricalInfo) {
    var skip = Object.create(null);
    if (Array.isArray(omittedIndex)) omittedIndex.forEach(function (i) { skip[i] = true; });
    else skip[omittedIndex] = true;
    var used = factorsUsed(columns, categoricalInfo);
    var before = Object.create(null);
    var after = Object.create(null);
    cases.forEach(function (c, idx) {
      var factors = c.factors || {};
      Object.keys(factors).forEach(function (name) {
        if (!used[name]) return;
        var level = String(factors[name]);
        before[name] = before[name] || Object.create(null);
        before[name][level] = (before[name][level] || 0) + 1;
        if (skip[idx]) return;
        after[name] = after[name] || Object.create(null);
        after[name][level] = (after[name][level] || 0) + 1;
      });
    });
    var lost = [];
    Object.keys(before).forEach(function (name) {
      Object.keys(before[name]).forEach(function (level) {
        if (before[name][level] > 0 && !(after[name] && after[name][level])) lost.push({ factor: name, level: level });
      });
    });
    return lost;
  }

  function termList(columns, includeIntercept) {
    var terms = [];
    if (includeIntercept) terms.push({ key: 'Intercept', name: 'Intercept', kind: 'intercept' });
    (columns || []).forEach(function (col) {
      terms.push({ key: col.key || col.name, name: col.name || col.key, kind: col.kind || 'numeric' });
    });
    return terms;
  }

  function ciPair(results, index) {
    if (!results || !results.CI_lower || !results.CI_upper) return { ci: null, reason: 'Confidence interval is undefined for this term.' };
    var lo = results.CI_lower[index];
    var hi = results.CI_upper[index];
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { ci: null, reason: 'Confidence interval is undefined for this term.' };
    return { ci: [lo, hi], reason: '' };
  }

  function joinAnd(bits) {
    if (bits.length <= 1) return bits[0] || '';
    if (bits.length === 2) return bits[0] + ' and ' + bits[1];
    return bits.slice(0, -1).join(', ') + ', and ' + bits[bits.length - 1];
  }

  function casePhrase(labels) {
    var clean = (labels || []).map(function (label) { return label == null ? '' : String(label); }).filter(Boolean);
    if (!clean.length) {
      return { count: 0, list: '', andList: '', compare: 'Compare without this case', status: '' };
    }
    var parsed = clean.map(function (label) {
      var match = /^(Row|Obs)\s+(\d+)$/.exec(label);
      return match ? { kind: match[1], n: Number(match[2]), rest: match[2] } : null;
    });
    var sameKind = parsed.every(function (item) { return item && item.kind === parsed[0].kind; });
    var list = clean.join(', ');
    var andList = joinAnd(clean);
    if (clean.length === 1) {
      list = clean[0];
      andList = clean[0];
    } else if (sameKind) {
      var ordered = parsed.map(function (item, index) { return { n: item.n, rest: item.rest, label: clean[index] }; });
      ordered.sort(function (a, b) { return a.n - b.n; });
      var noun = parsed[0].kind === 'Row' ? 'Rows' : 'Obs';
      var bits = ordered.map(function (item) { return item.rest; });
      list = noun + ' ' + bits.join(', ');
      andList = noun + ' ' + joinAnd(bits);
    }
    return {
      count: clean.length,
      list: list,
      andList: andList,
      compare: clean.length > 1 ? ('Compare without these ' + clean.length + ' cases') : 'Compare without this case',
      status: clean.length > 1 ? (clean.length + ' cases selected · ' + list) : ('Selected case ' + andList)
    };
  }

  function buildComparison(spec, caseKey) {
    spec = spec || {};
    var cases = spec.cases || [];
    var seenKey = Object.create(null);
    var keys = (Array.isArray(caseKey) ? caseKey : (caseKey ? [caseKey] : [])).filter(function (key) {
      if (!key || seenKey[key]) return false;
      seenKey[key] = true;
      return true;
    });
    if (!keys.length) return { status: 'unavailable', reason: 'Select an analyzed case first.' };
    if (spec.weights && (Array.isArray(spec.weights) ? spec.weights.length : true)) {
      return {
        status: 'unavailable',
        reason: 'This fit uses weights, and the regression engine does not apply weights, so a comparable temporary fit is unavailable.'
      };
    }
    var indices = [];
    var omittedCases = [];
    for (var k = 0; k < keys.length; k++) {
      var foundAt = -1;
      for (var i = 0; i < cases.length; i++) if (cases[i].caseKey === keys[k]) { foundAt = i; break; }
      if (foundAt < 0) {
        return { status: 'unavailable', reason: 'A selected case is not in the analyzed sample, so it cannot be omitted from the fit.' };
      }
      indices.push(foundAt);
      omittedCases.push(cases[foundAt]);
    }
    var many = indices.length > 1;
    var phrase = casePhrase(omittedCases.map(function (c) { return c.displayLabel; }));
    var omittedLabel = phrase.andList;
    var without = many ? 'these cases' : 'this case';
    var xMatrix = spec.xMatrix || [];
    var yVector = spec.yVector || [];
    var includeIntercept = !!spec.includeIntercept;
    var columns = spec.columns || [];
    var kCols = columns.length + (includeIntercept ? 1 : 0);
    if (xMatrix.length !== cases.length || yVector.length !== cases.length) {
      return { status: 'unavailable', reason: 'The analyzed rows no longer match this fit, so the case cannot be traced.' };
    }
    var lost = lostLevel(cases, indices, columns, spec.categoricalInfo || []);
    if (lost.length) {
      var picked = lost[0];
      for (var L = 0; L < lost.length; L++) {
        var onOmitted = omittedCases.some(function (omitted) {
          return String((omitted.factors || {})[lost[L].factor]) === String(lost[L].level);
        });
        if (onOmitted) { picked = lost[L]; break; }
      }
      return {
        status: 'unavailable',
        reason: 'Without ' + without + ', ' + picked.factor + ' ' + picked.level + ' has no observations and the same model cannot be estimated.',
        omittedLabel: omittedLabel,
        omittedCount: indices.length,
        keptCase: true
      };
    }
    var reducedN = cases.length - indices.length;
    if (reducedN - kCols < 1) {
      return {
        status: 'unavailable',
        reason: 'Without ' + without + ', the model has no residual degrees of freedom and the same model cannot be estimated.',
        omittedLabel: omittedLabel,
        omittedCount: indices.length,
        keptCase: true
      };
    }
    var skip = Object.create(null);
    indices.forEach(function (index) { skip[index] = true; });
    var newX = [];
    var newY = [];
    for (var r = 0; r < xMatrix.length; r++) {
      if (skip[r]) continue;
      newX.push(xMatrix[r]);
      newY.push(yVector[r]);
    }
    var alpha = spec.originalResults && Number.isFinite(spec.originalResults.alpha) ? spec.originalResults.alpha : 0.05;
    var temporary;
    try {
      var fitFn = spec.computeOLS || computeOLS;
      temporary = fitFn(newX, newY, includeIntercept, alpha);
    } catch (err) {
      var message = String((err && err.message) || err || '');
      if (/singular|rank/i.test(message)) {
        return {
          status: 'unavailable',
          reason: 'Without ' + without + ', the same model is rank deficient and cannot be estimated.',
          omittedLabel: omittedLabel,
          omittedCount: indices.length,
          keptCase: true
        };
      }
      return { status: 'error', reason: 'The refit failed. The original fit is unchanged.', retryable: true, detail: message };
    }
    if (!temporary || !Array.isArray(temporary.coefficients) || temporary.coefficients.some(function (c) { return !Number.isFinite(c); })) {
      return { status: 'error', reason: 'The refit failed. The original fit is unchanged.', retryable: true };
    }
    var original = spec.originalResults;
    if (!original || !Array.isArray(original.coefficients) || original.coefficients.length !== temporary.coefficients.length) {
      return {
        status: 'unavailable',
        reason: 'Without ' + without + ', the coefficient definitions are not comparable to the original fit.',
        omittedLabel: omittedLabel,
        omittedCount: indices.length
      };
    }
    var level = 1 - alpha;
    var levelLabel = Math.round(level * 100) + '% CI';
    var terms = termList(columns, includeIntercept);
    if (terms.length !== original.coefficients.length) {
      return {
        status: 'unavailable',
        reason: 'Without ' + without + ', the coefficient definitions are not comparable to the original fit.',
        omittedLabel: omittedLabel,
        omittedCount: indices.length
      };
    }
    var sensitivity = false;
    var coefficients = terms.map(function (term, t) {
      var est0 = original.coefficients[t];
      var est1 = temporary.coefficients[t];
      var change = est1 - est0;
      if (change !== 0) sensitivity = true;
      var ci0 = ciPair(original, t);
      var ci1 = ciPair(temporary, t);
      var crosses = false;
      [ci0, ci1].forEach(function (pair) {
        if (pair.ci && pair.ci[0] < 0 && pair.ci[1] > 0) crosses = true;
      });
      if (crosses) sensitivity = true;
      return {
        key: term.key,
        label: term.name,
        estimate: { original: est0, temporary: est1, change: change },
        ci: {
          label: levelLabel,
          method: 't interval',
          original: ci0.ci,
          temporary: ci1.ci,
          originalReason: ci0.reason,
          temporaryReason: ci1.reason
        },
        ciCrossesZero: crosses
      };
    });

    function finiteOrNull(value) { return Number.isFinite(value) ? value : null; }
    var r2ok = Number.isFinite(original.R2) && Number.isFinite(temporary.R2);
    var modelFit = [
      {
        key: 'n',
        label: 'Analyzed N',
        original: original.n,
        temporary: temporary.n,
        change: temporary.n - original.n
      },
      {
        key: 'r2',
        label: 'R²',
        original: finiteOrNull(original.R2),
        temporary: finiteOrNull(temporary.R2),
        change: r2ok ? (temporary.R2 - original.R2) : null,
        unavailableReason: r2ok ? '' : 'R² is undefined for one of these fits.'
      }
    ];

    var prediction = { available: false, reason: 'No valid scenario is available.', settingsLabel: '' };
    var scenario = spec.scenario;
    if (scenario && scenario.ok && Array.isArray(scenario.xVector)) {
      var pred0 = meanResponse(original, scenario.xVector, includeIntercept);
      var pred1 = meanResponse(temporary, scenario.xVector, includeIntercept);
      prediction = {
        available: !!(pred0.ok && pred1.ok && Number.isFinite(pred0.estimate) && Number.isFinite(pred1.estimate)),
        reason: '',
        settingsLabel: scenario.settingsLabel || '',
        inputs: scenario.inputs || {},
        estimate: null,
        ci: null
      };
      if (!prediction.available) {
        prediction.reason = pred0.reason || pred1.reason || 'The fitted mean is unavailable for this scenario.';
      } else {
        prediction.estimate = {
          original: pred0.estimate,
          temporary: pred1.estimate,
          change: pred1.estimate - pred0.estimate
        };
        var bothCi = pred0.ci && pred1.ci;
        prediction.ci = {
          label: 'Fitted mean ' + levelLabel,
          method: 't interval for the mean response',
          original: pred0.ci,
          temporary: pred1.ci,
          reason: bothCi ? '' : (pred0.ciReason || pred1.ciReason || 'The confidence interval for the fitted mean is undefined for this fit.')
        };
        if (prediction.estimate.change !== 0) sensitivity = true;
      }
    } else if (scenario && scenario.reason) {
      prediction.reason = scenario.reason;
    }

    return {
      status: 'ready',
      exploratory: true,
      note: many
        ? 'This comparison shows how sensitive the model is to these observations.'
        : 'This comparison shows how sensitive the model is to this observation.',
      sensitivityNote: sensitivity
        ? 'Exploratory only: an estimate changed, or a confidence interval crosses zero.'
        : 'Exploratory only. This comparison does not replace the fitted model.',
      omittedLabel: omittedLabel,
      omittedCount: indices.length,
      caseKey: omittedCases[0].caseKey,
      caseKeys: omittedCases.map(function (c) { return c.caseKey; }),
      nOriginal: original.n,
      nTemporary: temporary.n,
      modelFit: modelFit,
      coefficients: coefficients,
      prediction: prediction,
      temporaryResults: temporary
    };
  }

  function caseInCatalog(catalog, caseKey) {
    if (!catalog || !caseKey) return null;
    var cases = catalog.cases || [];
    for (var i = 0; i < cases.length; i++) if (cases[i].caseKey === caseKey) return cases[i];
    var identity = catalog.identity || [];
    for (var j = 0; j < identity.length; j++) if (identity[j].caseKey === caseKey) return identity[j];
    return null;
  }

  function createCaseSession() {
    var state = {
      analysisVersion: 0,
      specVersion: 0,
      selectedKeys: [],
      serial: 0,
      disposed: false,
      comparison: null,
      failNext: false,
      catalog: null
    };
    function bump() { state.serial += 1; }
    function keySignature(keys) { return (keys || []).join('\u0001'); }
    function keepAnalyzed(keys) {
      return (keys || []).filter(function (key) {
        var found = caseInCatalog(state.catalog, key);
        return found && found.analyzed !== false;
      });
    }
    return {
      state: function () { return state; },
      selectedKey: function () { return state.selectedKeys[0] || null; },
      selectedKeys: function () { return state.selectedKeys.slice(); },
      dispose: function () {
        state.disposed = true;
        state.comparison = null;
        bump();
      },
      datasetReplaced: function (catalog) {
        state.analysisVersion += 1;
        state.specVersion += 1;
        state.catalog = catalog || null;
        state.selectedKeys = [];
        state.comparison = null;
        bump();
      },
      specChanged: function () {
        state.specVersion += 1;
        state.comparison = null;
        bump();
        state.selectedKeys = keepAnalyzed(state.selectedKeys);
      },
      select: function (caseKey) {
        if (state.disposed) return { ok: false, reason: 'The results dialog has closed.' };
        if (!caseKey) return this.clearSelection();
        var same = state.selectedKeys.length === 1 && state.selectedKeys[0] === caseKey;
        state.selectedKeys = [caseKey];
        if (!same) {
          state.comparison = null;
          bump();
        }
        return { ok: true, caseKey: caseKey };
      },
      toggle: function (caseKey, checked) {
        if (state.disposed) return { ok: false, reason: 'The results dialog has closed.' };
        if (!caseKey) return { ok: false };
        var keys = state.selectedKeys.slice();
        var at = keys.indexOf(caseKey);
        var want = checked == null ? at < 0 : !!checked;
        if (want && at < 0) keys.push(caseKey);
        else if (!want && at >= 0) keys.splice(at, 1);
        else return { ok: true, unchanged: true };
        state.selectedKeys = keys;
        state.comparison = null;
        bump();
        return { ok: true, caseKeys: keys.slice() };
      },
      clearSelection: function () {
        state.selectedKeys = [];
        state.comparison = null;
        bump();
        return { ok: true };
      },
      closeComparison: function () {
        state.comparison = null;
        bump();
        return { ok: true };
      },
      armFailure: function () { state.failNext = true; },
      beginCompare: function () {
        if (state.disposed) return { ok: false, reason: 'The results dialog has closed.' };
        var keys = state.selectedKeys.slice();
        if (!keys.length) return { ok: false, reason: 'Select an analyzed case first.' };
        for (var s = 0; s < keys.length; s++) {
          var found = caseInCatalog(state.catalog, keys[s]);
          if (!found || found.analyzed === false) {
            return {
              ok: false,
              reason: keys.length > 1
                ? 'One of these rows is outside the analyzed sample, so the same model cannot omit them.'
                : 'This row is outside the analyzed sample, so it cannot be omitted from the fit.'
            };
          }
        }
        if (state.catalog && state.catalog.mappingSafe === false) {
          return { ok: false, reason: state.catalog.mappingReason || 'This payload cannot map a case safely.' };
        }
        bump();
        var token = {
          ok: true,
          serial: state.serial,
          caseKey: keys[0],
          caseKeys: keys,
          analysisVersion: state.analysisVersion,
          specVersion: state.specVersion
        };
        state.comparison = { status: 'loading', caseKey: token.caseKey, caseKeys: keys.slice(), serial: token.serial, payload: null };
        return token;
      },
      completeCompare: function (token, payload) {
        if (!token || state.disposed || token.serial !== state.serial) return { applied: false, reason: 'stale' };
        var tokenKeys = token.caseKeys || (token.caseKey ? [token.caseKey] : []);
        if (keySignature(tokenKeys) !== keySignature(state.selectedKeys)) return { applied: false, reason: 'stale' };
        if (token.analysisVersion !== state.analysisVersion || token.specVersion !== state.specVersion) {
          return { applied: false, reason: 'stale' };
        }
        state.comparison = {
          status: payload.status,
          caseKey: token.caseKey,
          serial: token.serial,
          payload: payload
        };
        return { applied: true };
      },
      runCompare: function (getSpec) {
        var token = this.beginCompare();
        if (!token.ok) return Promise.resolve({ applied: false, token: token });
        var self = this;
        return Promise.resolve().then(function () {
          if (state.failNext) {
            state.failNext = false;
            var failed = { status: 'error', reason: 'The refit failed. The original fit is unchanged.', retryable: true };
            return { applied: self.completeCompare(token, failed).applied, token: token, payload: failed };
          }
          var spec;
          try {
            spec = getSpec();
          } catch (err) {
            var broken = { status: 'error', reason: 'The refit failed. The original fit is unchanged.', retryable: true, detail: String(err && err.message || err) };
            return { applied: self.completeCompare(token, broken).applied, token: token, payload: broken };
          }
          var payload;
          try {
            payload = buildComparison(spec, token.caseKeys || token.caseKey);
          } catch (err2) {
            payload = { status: 'error', reason: 'The refit failed. The original fit is unchanged.', retryable: true, detail: String(err2 && err2.message || err2) };
          }
          return { applied: self.completeCompare(token, payload).applied, token: token, payload: payload };
        });
      }
    };
  }

  function formatCount(value) {
    if (!Number.isFinite(value)) return 'Unavailable';
    return String(Math.round(value));
  }

  function formatFixed(value, digits) {
    if (!Number.isFinite(value)) return 'Unavailable';
    var neg = value < 0;
    var text = Math.abs(value).toFixed(digits);
    return (neg ? '\u2212' : '') + text;
  }

  function formatSigned(value, digits) {
    if (!Number.isFinite(value)) return '';
    if (value > 0) return '+' + value.toFixed(digits);
    if (value < 0) return '\u2212' + Math.abs(value).toFixed(digits);
    return (0).toFixed(digits);
  }

  function formatInterval(pair, digits) {
    if (!pair || pair.length !== 2 || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) return 'Unavailable';
    return '[' + formatFixed(pair[0], digits) + ', ' + formatFixed(pair[1], digits) + ']';
  }

  return {
    stampIdentity: stampIdentity,
    buildAnalyzedDesign: buildAnalyzedDesign,
    designRowFromInputs: designRowFromInputs,
    meanResponse: meanResponse,
    buildComparison: buildComparison,
    casePhrase: casePhrase,
    createCaseSession: createCaseSession,
    caseInCatalog: caseInCatalog,
    formatCount: formatCount,
    formatFixed: formatFixed,
    formatSigned: formatSigned,
    formatInterval: formatInterval
  };
});
