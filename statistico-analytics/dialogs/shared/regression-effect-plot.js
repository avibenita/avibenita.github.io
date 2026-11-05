/**
 * Adjusted predictor-effect profiles for the regression visualization.
 *
 * A categorical factor is always represented by a real level. Dummy indicators
 * are never replaced by their column means, which would describe a fractional
 * mix of categories. Other numeric predictors are held at their sample means.
 * Interaction columns are the product of those settings.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoRegressionEffectPlot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function termCatalog(columns, variableNames, categoricalInfo, numericNames) {
    var names = variableNames || [];
    var info = categoricalInfo || [];
    if (Array.isArray(columns) && columns.length && columns.length === names.length) {
      return columns.map(function (col, index) {
        return {
          index: index,
          key: col.key || col.name || names[index],
          name: col.name || names[index],
          kind: col.kind || 'numeric',
          factor: col.factor || null,
          level: col.level != null ? String(col.level) : null,
          factors: col.factors || null
        };
      });
    }
    var numeric = {};
    (numericNames || []).forEach(function (name) { numeric[name] = true; });
    return names.map(function (name, index) {
      var match = null;
      for (var i = 0; i < info.length && !match; i++) {
        var dummies = info[i].dummyNames || [];
        var di = dummies.indexOf(name);
        if (di !== -1) {
          var categories = info[i].categories || [];
          match = {
            kind: 'dummy',
            factor: info[i].name,
            level: categories[di + 1] != null ? String(categories[di + 1]) : name
          };
        }
      }
      if (match) {
        return {
          index: index,
          key: name,
          name: name,
          kind: 'dummy',
          factor: match.factor,
          level: match.level,
          factors: null
        };
      }
      return {
        index: index,
        key: name,
        name: name,
        kind: numeric[name] ? 'numeric' : 'other',
        factor: null,
        level: null,
        factors: null
      };
    });
  }

  function factorsFromTerms(terms, categoricalInfo) {
    var byName = {};
    (categoricalInfo || []).forEach(function (info) { byName[info.name] = info; });
    var order = [];
    var grouped = {};
    (terms || []).forEach(function (term) {
      if (term.kind !== 'dummy' || !term.factor) return;
      if (!grouped[term.factor]) {
        grouped[term.factor] = [];
        order.push(term.factor);
      }
      grouped[term.factor].push(term);
    });
    return order.map(function (name) {
      var info = byName[name];
      var dummies = grouped[name];
      var listed = info && info.categories ? info.categories.map(String) : [];
      var dummyLevels = {};
      dummies.forEach(function (dummy) { dummyLevels[String(dummy.level)] = true; });
      var levels = listed.slice();
      if (!levels.length) {
        levels = dummies.map(function (dummy) { return String(dummy.level); });
      }
      var reference = null;
      for (var i = 0; i < levels.length; i++) {
        if (!dummyLevels[levels[i]]) {
          reference = levels[i];
          break;
        }
      }
      if (reference == null) reference = levels[0];
      var present = levels.filter(function (level) {
        return level === reference || dummyLevels[level];
      });
      return { name: name, levels: present, reference: reference, dummies: dummies };
    });
  }

  function columnMeans(xMatrix) {
    var rows = xMatrix || [];
    if (!rows.length || !rows[0] || !rows[0].length) return [];
    var n = rows.length;
    var p = rows[0].length;
    var means = [];
    for (var j = 0; j < p; j++) {
      var sum = 0;
      for (var i = 0; i < n; i++) sum += Number(rows[i][j]) || 0;
      means.push(sum / n);
    }
    return means;
  }

  function numericValueMap(terms, means) {
    var map = {};
    (terms || []).forEach(function (term) {
      if (term.kind === 'numeric') map[term.name] = means[term.index];
    });
    return map;
  }

  function referenceLevelMap(factors) {
    var map = {};
    (factors || []).forEach(function (factor) { map[factor.name] = factor.reference; });
    return map;
  }

  function defaultFactorLevel(factor) {
    if (!factor || !factor.levels || !factor.levels.length) return null;
    for (var i = 0; i < factor.levels.length; i++) {
      if (String(factor.levels[i]) !== String(factor.reference)) return factor.levels[i];
    }
    return factor.levels[0];
  }

  function selectionFromTerm(term) {
    if (!term) return null;
    if (term.kind === 'dummy' && term.factor) {
      return {
        mode: 'factor',
        factor: term.factor,
        level: term.level,
        name: term.name,
        index: term.index
      };
    }
    if (term.kind === 'numeric') {
      return { mode: 'numeric', name: term.name, index: term.index };
    }
    var fallback = term.name || ('X' + ((term.index || 0) + 1));
    return { mode: 'column', name: fallback, index: term.index };
  }

  function designVector(includeIntercept, terms, numericValues, factorLevels, columnMeans) {
    var x = includeIntercept ? [1] : [];
    var numbers = numericValues || {};
    var levels = factorLevels || {};
    var means = columnMeans || [];
    (terms || []).forEach(function (term) {
      if (term.kind === 'numeric') {
        var value = Number(numbers[term.name]);
        x.push(Number.isFinite(value) ? value : 0);
      } else if (term.kind === 'dummy') {
        x.push(String(levels[term.factor]) === String(term.level) ? 1 : 0);
      } else if (term.kind === 'interaction' && term.factors && term.factors.length) {
        var product = 1;
        term.factors.forEach(function (part) {
          if (part.kind === 'numeric') {
            var numeric = Number(numbers[part.name]);
            product *= Number.isFinite(numeric) ? numeric : 0;
          } else if (part.kind === 'dummy') {
            product *= String(levels[part.factor]) === String(part.level) ? 1 : 0;
          }
        });
        x.push(product);
      } else {
        var mean = Number(means[term.index]);
        x.push(Number.isFinite(mean) ? mean : 0);
      }
    });
    return x;
  }

  function withColumnValue(vector, includeIntercept, columnIndex, columnValue) {
    var next = vector.slice();
    var offset = includeIntercept ? 1 : 0;
    if (columnIndex >= 0 && offset + columnIndex < next.length) next[offset + columnIndex] = columnValue;
    return next;
  }

  function fittedMean(x, beta, xtxInv, mse, tCrit) {
    var yhat = 0;
    var j;
    for (j = 0; j < x.length; j++) yhat += x[j] * (beta[j] || 0);
    var se = 0;
    if (xtxInv && xtxInv.length === x.length) {
      var quad = 0;
      for (var i = 0; i < x.length; i++) {
        var ax = 0;
        for (var k = 0; k < x.length; k++) ax += xtxInv[i][k] * x[k];
        quad += ax * x[i];
      }
      se = Math.sqrt(Math.max(0, quad * (mse || 0)));
    }
    var crit = Number.isFinite(tCrit) ? tCrit : 1.96;
    return { estimate: yhat, se: se, low: yhat - crit * se, high: yhat + crit * se };
  }

  function factorPredictions(spec) {
    var factor = null;
    (spec.factors || []).forEach(function (item) {
      if (item.name === spec.focalFactor) factor = item;
    });
    if (!factor) return [];
    var baseLevels = referenceLevelMap(spec.factors);
    var rows = factor.levels.map(function (level) {
      var levels = {};
      Object.keys(baseLevels).forEach(function (key) { levels[key] = baseLevels[key]; });
      levels[factor.name] = level;
      var x = designVector(spec.includeIntercept, spec.terms, spec.numericMeans, levels, spec.columnMeans);
      var fit = fittedMean(x, spec.beta, spec.xtxInv, spec.mse, spec.tCrit);
      return {
        level: level,
        isReference: String(level) === String(factor.reference),
        x: x,
        estimate: fit.estimate,
        se: fit.se,
        low: fit.low,
        high: fit.high
      };
    });
    var reference = null;
    rows.forEach(function (row) { if (row.isReference) reference = row; });
    rows.forEach(function (row) {
      row.difference = reference ? row.estimate - reference.estimate : null;
    });
    return rows;
  }

  function heldAdjustments(terms, factors, numericMeans, selection) {
    var heldNumerics = [];
    var heldFactors = [];
    var sel = selection || {};
    (terms || []).forEach(function (term) {
      if (term.kind !== 'numeric') return;
      if (sel.mode === 'numeric' && term.name === sel.name) return;
      heldNumerics.push({ name: term.name, value: numericMeans[term.name] });
    });
    (factors || []).forEach(function (factor) {
      if (sel.mode === 'factor' && factor.name === sel.factor) return;
      heldFactors.push({ name: factor.name, level: factor.reference });
    });
    return { heldNumerics: heldNumerics, heldFactors: heldFactors };
  }

  function formatHold(value) {
    if (!Number.isFinite(value)) return '—';
    var abs = Math.abs(value);
    var digits = abs >= 100 ? 1 : (abs >= 1 ? 2 : 3);
    var text = value.toFixed(digits);
    if (text.indexOf('.') !== -1) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text;
  }

  function joinNames(names) {
    var list = names || [];
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + ' and ' + list[1];
    return list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
  }

  function levelAxisLabel(level, reference) {
    return String(level) === String(reference) ? String(level) + ' (reference)' : String(level);
  }

  function chartCopy(opts) {
    var options = opts || {};
    var focal = options.focalName || 'predictor';
    var outcome = options.yName || 'outcome';
    var heldNumerics = options.heldNumerics || [];
    var heldFactors = options.heldFactors || [];
    if (options.mode === 'factor') {
      var adjust = [];
      heldNumerics.forEach(function (item) { adjust.push(item.name); });
      heldFactors.forEach(function (item) { adjust.push(item.name); });
      var title = 'Predicted ' + outcome + ' by ' + focal;
      if (adjust.length) title += ', adjusted for ' + joinNames(adjust);
      title += '.';
      var sentences = [];
      heldNumerics.forEach(function (item) {
        sentences.push(item.name + ' held at its mean, ' + formatHold(item.value));
      });
      heldFactors.forEach(function (item) {
        sentences.push(item.name + ' held at ' + item.level + ', the reference');
      });
      if (options.referenceLevel) {
        sentences.push(options.referenceLevel + ' is the reference level');
      }
      return {
        title: title,
        subtitle: sentences.length ? sentences.join('. ') + '.' : '',
        xAxisTitle: focal
      };
    }
    var bits = [];
    heldNumerics.forEach(function (item) {
      bits.push(item.name + ' held at its mean, ' + formatHold(item.value));
    });
    heldFactors.forEach(function (item) {
      bits.push(item.name + ' held at ' + item.level + ', the reference');
    });
    var others = bits.length;
    return {
      title: others ? 'Adjusted effect of ' + focal : 'Effect of ' + focal,
      subtitle: others ? '(' + bits.join('; ') + ')' : '',
      xAxisTitle: focal
    };
  }

  return {
    termCatalog: termCatalog,
    factorsFromTerms: factorsFromTerms,
    columnMeans: columnMeans,
    numericValueMap: numericValueMap,
    referenceLevelMap: referenceLevelMap,
    defaultFactorLevel: defaultFactorLevel,
    selectionFromTerm: selectionFromTerm,
    designVector: designVector,
    withColumnValue: withColumnValue,
    fittedMean: fittedMean,
    factorPredictions: factorPredictions,
    heldAdjustments: heldAdjustments,
    formatHold: formatHold,
    levelAxisLabel: levelAxisLabel,
    chartCopy: chartCopy
  };
});
