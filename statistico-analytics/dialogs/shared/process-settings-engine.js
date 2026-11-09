/**
 * Process Settings Explorer — session model for one continuous response.
 *
 * Reuses the production regression path:
 *   StatisticoCaseTrace.buildAnalyzedDesign  (complete-case rows, dummy and interaction encoding)
 *   computeOLS                                 (ordinary unweighted least squares)
 *   StatisticoCaseTrace.designRowFromInputs
 *   StatisticoCaseTrace.meanResponse           (mean and confidence interval from XtX inverse)
 *
 * Moving a candidate or editing specifications does not call computeOLS.
 * State lives on the session object and is discarded with the dialog.
 */
(function (root, factory) {
  var Trace = root && root.StatisticoCaseTrace;
  var ols = typeof (root && root.computeOLS) === 'function' ? root.computeOLS : null;
  var columnsApi = root && root.StatisticoColumnType;
  if (!Trace || !ols || !columnsApi) {
    var lib = require('../../src/shared/js/core/regression-compute.js');
    ols = lib.computeOLS;
    Trace = require('./regression-case-trace.js');
    columnsApi = require('./column-type.js');
  }
  var api = factory(Trace, ols, columnsApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StatisticoProcessSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Trace, computeOLS, ColumnType) {
  'use strict';

  var EPS = 1e-7;

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function finiteOrNull(value) {
    if (value == null || value === '') return null;
    var n = typeof value === 'number' ? value : Number(String(value).replace(/\u2212/g, '-'));
    return Number.isFinite(n) ? n : NaN;
  }

  function roundDisplay(value, digits) {
    if (!Number.isFinite(value)) return null;
    var p = Math.pow(10, digits);
    return Math.round((value + Number.EPSILON) * p) / p;
  }

  function formatTrim(value, digits) {
    if (!Number.isFinite(value)) return 'Unavailable';
    var rounded = roundDisplay(value, digits);
    if (Object.is(rounded, -0) || rounded === 0) return '0';
    var neg = rounded < 0;
    var toFixed = Number.prototype.__statisticoToFixedOriginal || Number.prototype.toFixed;
    var text = toFixed.call(Math.abs(rounded), digits).replace(/\.?0+$/, '');
    return (neg ? '\u2212' : '') + text;
  }

  function formatSignedTrim(value, digits) {
    if (!Number.isFinite(value)) return 'Unavailable';
    var rounded = roundDisplay(value, digits);
    if (rounded === 0) return '0';
    var body = formatTrim(Math.abs(rounded), digits);
    return (rounded > 0 ? '+' : '\u2212') + body;
  }

  function uniqueCategories(rows, colIndex) {
    var seen = Object.create(null);
    var list = [];
    (rows || []).forEach(function (row) {
      if (!row) return;
      var val = row[colIndex];
      if (val == null || val === '') return;
      var text = String(val);
      if (seen[text]) return;
      seen[text] = true;
      list.push(text);
    });
    return list.sort();
  }

  function suggestKind(rows, index) {
    var numeric = 0;
    var other = 0;
    (rows || []).forEach(function (row) {
      var value = row ? row[index] : null;
      if (value == null || value === '') return;
      if (ColumnType.isNumericCell(value)) numeric += 1;
      else other += 1;
    });
    if (numeric === 0 && other === 0) return 'empty';
    if (other === 0) return 'numeric';
    return 'categorical';
  }

  function columnChoices(headers, rows) {
    return (headers || []).map(function (header, index) {
      return {
        name: String(header == null ? '' : header),
        index: index,
        kind: suggestKind(rows, index)
      };
    }).filter(function (col) { return col.name && col.kind !== 'empty'; });
  }

  function normalizeScale(scale) {
    var src = scale || {};
    var kind = src.kind === 'percent' ? 'percent' : 'number';
    var min = finiteOrNull(src.min);
    var max = finiteOrNull(src.max);
    if (kind === 'percent') {
      if (!Number.isFinite(min)) min = 0;
      if (!Number.isFinite(max)) max = 100;
    } else {
      min = null;
      max = null;
    }
    return {
      kind: kind,
      min: min,
      max: max,
      unit: src.unit == null ? '' : String(src.unit)
    };
  }

  function normalizeConfig(config) {
    var src = config || {};
    var numeric = (src.numeric || []).map(String);
    var categorical = (src.categorical || []).map(String);
    var roles = {};
    var units = {};
    numeric.concat(categorical).forEach(function (name) {
      var role = src.roles && src.roles[name];
      roles[name] = role === 'fixed' ? 'fixed' : 'adjustable';
      units[name] = src.units && src.units[name] ? String(src.units[name]) : '';
    });
    var interactions = (src.interactions || []).map(function (ix) {
      return { var1: String(ix.var1), var2: String(ix.var2) };
    }).filter(function (ix) { return ix.var1 && ix.var2 && ix.var1 !== ix.var2; });
    return {
      response: src.response ? String(src.response) : '',
      numeric: numeric,
      categorical: categorical,
      roles: roles,
      units: units,
      interactions: interactions,
      responseScale: normalizeScale(src.responseScale),
      includeIntercept: src.includeIntercept !== false
    };
  }

  function structureKey(config) {
    return JSON.stringify({
      response: config.response,
      numeric: config.numeric,
      categorical: config.categorical,
      interactions: config.interactions,
      includeIntercept: config.includeIntercept
    });
  }

  function normalizeSpec(spec) {
    var src = spec || {};
    return {
      lsl: finiteOrNull(src.lsl),
      usl: finiteOrNull(src.usl),
      target: finiteOrNull(src.target)
    };
  }

  function validateSpec(spec) {
    if (Number.isNaN(spec.lsl) || Number.isNaN(spec.usl) || Number.isNaN(spec.target)) {
      return 'Enter a finite number.';
    }
    if (spec.lsl != null && spec.usl != null && !(spec.lsl < spec.usl)) {
      return 'The lower specification limit must be less than the upper specification limit.';
    }
    if (spec.target != null && spec.lsl != null && spec.target < spec.lsl) {
      return 'The target must lie within the specification limits.';
    }
    if (spec.target != null && spec.usl != null && spec.target > spec.usl) {
      return 'The target must lie within the specification limits.';
    }
    return '';
  }

  function unitPhrase(scale) {
    if (scale && scale.kind === 'percent') return 'percentage points';
    return '';
  }

  function withUnitPhrase(text, scale) {
    var phrase = unitPhrase(scale);
    return phrase ? (text + ' ' + phrase) : text;
  }

  function locationLabel(mean, spec) {
    if (spec.lsl == null && spec.usl == null) return '';
    var atL = spec.lsl != null && Math.abs(mean - spec.lsl) <= EPS;
    var atU = spec.usl != null && Math.abs(mean - spec.usl) <= EPS;
    if (atL || atU) return 'Predicted mean at limit';
    if (spec.lsl != null && mean < spec.lsl) return 'Predicted mean below LSL';
    if (spec.usl != null && mean > spec.usl) return 'Predicted mean above USL';
    return 'Predicted mean within limits';
  }

  function marginOf(mean, spec) {
    if (spec.lsl == null && spec.usl == null) {
      return { unavailable: true, value: null, side: '', text: 'Unavailable' };
    }
    var lower = spec.lsl == null ? null : mean - spec.lsl;
    var upper = spec.usl == null ? null : spec.usl - mean;
    var value;
    var side;
    if (lower != null && upper != null) {
      if (Math.abs(lower - upper) <= EPS) {
        value = lower;
        side = 'both limits';
      } else if (lower < upper) {
        value = lower;
        side = 'lower limit';
      } else {
        value = upper;
        side = 'upper limit';
      }
    } else if (lower != null) {
      value = lower;
      side = 'lower limit';
    } else {
      value = upper;
      side = 'upper limit';
    }
    return { unavailable: false, value: value, side: side };
  }

  function rangeFlag(mean, scale) {
    if (!scale || scale.kind !== 'percent') return '';
    if (!Number.isFinite(scale.min) || !Number.isFinite(scale.max)) return '';
    if (mean < scale.min || mean > scale.max) {
      return 'The predicted mean is outside the meaningful response range (' +
        formatTrim(scale.min, 4) + ' to ' + formatTrim(scale.max, 4) +
        '). The model value is unchanged.';
    }
    return '';
  }

  function buildColumns(numeric, categoricalInfo, interactionInfo) {
    var columns = [];
    function push(spec) {
      spec.sourceIndex = columns.length;
      columns.push(spec);
    }
    (numeric || []).forEach(function (name) {
      push({ key: name, name: name, kind: 'numeric' });
    });
    (categoricalInfo || []).forEach(function (catInfo) {
      (catInfo.dummyNames || []).forEach(function (dummyName, di) {
        push({
          key: dummyName,
          name: dummyName,
          kind: 'dummy',
          factor: catInfo.name,
          level: String(catInfo.categories[di + 1])
        });
      });
    });
    (interactionInfo || []).forEach(function (ixi) {
      var ixKey = ixi.v1 + ' \u00d7 ' + ixi.v2;
      if (ixi.v1IsNumeric && ixi.v2IsNumeric) {
        push({
          key: ixKey, name: ixKey, kind: 'interaction', ixKey: ixKey,
          factors: [{ kind: 'numeric', name: ixi.v1 }, { kind: 'numeric', name: ixi.v2 }]
        });
      } else if (ixi.v1IsNumeric && ixi.v2Cat) {
        ixi.v2Cat.dummyNames.forEach(function (d, i) {
          push({
            key: ixi.v1 + ' \u00d7 ' + d,
            name: ixi.v1 + ' \u00d7 ' + d,
            kind: 'interaction',
            ixKey: ixKey,
            factors: [
              { kind: 'numeric', name: ixi.v1 },
              { kind: 'dummy', factor: ixi.v2Cat.name, level: String(ixi.v2Cat.categories[i + 1]) }
            ]
          });
        });
      } else if (ixi.v1Cat && ixi.v2IsNumeric) {
        ixi.v1Cat.dummyNames.forEach(function (d, i) {
          push({
            key: d + ' \u00d7 ' + ixi.v2,
            name: d + ' \u00d7 ' + ixi.v2,
            kind: 'interaction',
            ixKey: ixKey,
            factors: [
              { kind: 'dummy', factor: ixi.v1Cat.name, level: String(ixi.v1Cat.categories[i + 1]) },
              { kind: 'numeric', name: ixi.v2 }
            ]
          });
        });
      } else if (ixi.v1Cat && ixi.v2Cat) {
        ixi.v1Cat.dummyNames.forEach(function (d1, i) {
          ixi.v2Cat.dummyNames.forEach(function (d2, j) {
            push({
              key: d1 + ' \u00d7 ' + d2,
              name: d1 + ' \u00d7 ' + d2,
              kind: 'interaction',
              ixKey: ixKey,
              factors: [
                { kind: 'dummy', factor: ixi.v1Cat.name, level: String(ixi.v1Cat.categories[i + 1]) },
                { kind: 'dummy', factor: ixi.v2Cat.name, level: String(ixi.v2Cat.categories[j + 1]) }
              ]
            });
          });
        });
      }
    });
    return columns;
  }

  function prepareDesign(table, config) {
    var headers = table.headers || [];
    var rows = table.rows || [];
    if (!config.response) return { ok: false, reason: 'Choose a response.' };
    if (!config.numeric.length && !config.categorical.length) {
      return { ok: false, reason: 'Choose at least one predictor.' };
    }
    var yIndex = headers.indexOf(config.response);
    if (yIndex < 0) return { ok: false, reason: 'The response is not in this table.' };
    var missingName = config.numeric.concat(config.categorical).filter(function (name) {
      return headers.indexOf(name) < 0;
    });
    if (missingName.length) return { ok: false, reason: 'A predictor is not in this table.' };
    if (config.numeric.indexOf(config.response) >= 0 || config.categorical.indexOf(config.response) >= 0) {
      return { ok: false, reason: 'The response cannot also be a predictor.' };
    }

    var numeric = config.numeric.slice().sort(function (a, b) {
      return headers.indexOf(a) - headers.indexOf(b);
    });
    var categorical = config.categorical.slice().sort(function (a, b) {
      return headers.indexOf(a) - headers.indexOf(b);
    });
    var categoricalInfo = [];
    for (var c = 0; c < categorical.length; c++) {
      var name = categorical[c];
      var index = headers.indexOf(name);
      var categories = uniqueCategories(rows, index);
      if (categories.length < 2) {
        return { ok: false, reason: name + ' has fewer than two categories after removing missing values, so it cannot be estimated.' };
      }
      categoricalInfo.push({
        name: name,
        index: index,
        categories: categories,
        dummyNames: categories.slice(1).map(function (cat) { return name + '_' + cat; })
      });
    }
    var interactionInfo = (config.interactions || []).map(function (ix) {
      var v1Cat = null;
      var v2Cat = null;
      categoricalInfo.forEach(function (info) {
        if (info.name === ix.var1) v1Cat = info;
        if (info.name === ix.var2) v2Cat = info;
      });
      return {
        v1: ix.var1,
        v2: ix.var2,
        v1IsNumeric: numeric.indexOf(ix.var1) >= 0,
        v2IsNumeric: numeric.indexOf(ix.var2) >= 0,
        v1Cat: v1Cat,
        v2Cat: v2Cat,
        v1Idx: headers.indexOf(ix.var1),
        v2Idx: headers.indexOf(ix.var2)
      };
    }).filter(function (ixi) {
      return (ixi.v1IsNumeric || ixi.v1Cat) && (ixi.v2IsNumeric || ixi.v2Cat);
    });

    var traced = Trace.buildAnalyzedDesign({
      headers: headers,
      rows: rows,
      address: table.address || '',
      yIndex: yIndex,
      xnIndices: numeric.map(function (n) { return headers.indexOf(n); }),
      categoricalInfo: categoricalInfo,
      interactionInfo: interactionInfo
    });
    if (!traced.ok) return { ok: false, reason: traced.mappingReason || 'The rows could not be prepared.' };
    if (!traced.xMatrix.length) {
      return { ok: false, reason: 'No valid observations after removing missing values.' };
    }
    var columns = buildColumns(numeric, categoricalInfo, interactionInfo);
    if (!traced.xMatrix[0] || columns.length !== traced.xMatrix[0].length) {
      return { ok: false, reason: 'The design matrix does not match the model terms.' };
    }
    var analyzed = traced.cases.map(function (entry, i) {
      var row = traced.usedOriginalRows[i] || [];
      var settings = {};
      numeric.forEach(function (n) {
        settings[n] = parseFloat(row[headers.indexOf(n)]);
      });
      categorical.forEach(function (n) {
        settings[n] = String(row[headers.indexOf(n)]);
      });
      return {
        caseKey: entry.caseKey,
        label: entry.displayLabel || ('Row ' + (i + 1)),
        sourceIndex: entry.sourceIndex,
        settings: settings,
        response: traced.yVector[i]
      };
    });
    return {
      ok: true,
      numeric: numeric,
      categorical: categorical,
      categoricalInfo: categoricalInfo,
      interactionInfo: interactionInfo,
      columns: columns,
      traced: traced,
      analyzed: analyzed
    };
  }

  function observedFrom(prepared) {
    var ranges = {};
    var levels = {};
    prepared.numeric.forEach(function (name) {
      var vals = prepared.analyzed.map(function (row) { return row.settings[name]; });
      ranges[name] = { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
    });
    prepared.categorical.forEach(function (name) {
      var info = prepared.categoricalInfo.filter(function (cat) { return cat.name === name; })[0];
      levels[name] = info ? info.categories.slice() : [];
    });
    return { ranges: ranges, levels: levels };
  }

  function defaultLimits(observed, config) {
    var limits = {};
    (config.numeric || []).forEach(function (name) {
      var range = observed.ranges[name] || { min: 0, max: 0 };
      limits[name] = { min: range.min, max: range.max };
    });
    (config.categorical || []).forEach(function (name) {
      limits[name] = { levels: (observed.levels[name] || []).slice() };
    });
    return limits;
  }

  function sameNumber(a, b) {
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= EPS;
  }

  function supportFor(analyzed, config, settings) {
    var caveat = 'An in-range result alone does not establish joint support.';
    var cats = config.categorical || [];
    var matching = (analyzed || []).filter(function (row) {
      return cats.every(function (name) {
        return String(row.settings[name]) === String(settings[name]);
      });
    });
    var advisories = [];
    if (cats.length && !matching.length) {
      advisories.push('This combination of categories was not in the analyzed rows. This is a range check.');
    } else {
      (config.numeric || []).forEach(function (name) {
        var pool = matching.length ? matching : (analyzed || []);
        if (!pool.length) return;
        var vals = pool.map(function (row) { return Number(row.settings[name]); });
        var lo = Math.min.apply(null, vals);
        var hi = Math.max.apply(null, vals);
        var value = Number(settings[name]);
        if (value < lo - EPS || value > hi + EPS) {
          var where = cats.length ? ' for this category combination' : '';
          advisories.push(name + ' is outside the analyzed range' + where + '. This is a range check.');
        }
      });
    }
    return { advisories: advisories, caveat: caveat };
  }

  function demoTable() {
    var headers = ['Yield', 'Temperature', 'Recipe'];
    var cells = [
      [90, 'A', 66],
      [100, 'A', 70],
      [110, 'A', 74],
      [90, 'B', 66],
      [100, 'B', 72],
      [110, 'B', 78]
    ];
    var rows = [];
    cells.forEach(function (cell) {
      rows.push([cell[2] - 1, cell[0], cell[1]]);
      rows.push([cell[2] + 1, cell[0], cell[1]]);
    });
    return { headers: headers, rows: rows, address: 'Demo!A1:C13' };
  }

  function demoPreset() {
    return {
      table: demoTable(),
      config: {
        response: 'Yield',
        numeric: ['Temperature'],
        categorical: ['Recipe'],
        roles: { Temperature: 'adjustable', Recipe: 'adjustable' },
        units: { Temperature: '', Recipe: '' },
        interactions: [{ var1: 'Temperature', var2: 'Recipe' }],
        responseScale: { kind: 'number', unit: '' },
        includeIntercept: true
      },
      specifications: { lsl: 68, usl: 75, target: 72 },
      current: { Temperature: 90, Recipe: 'A' }
    };
  }

  function createSession(options) {
    var runOls = (options && options.computeOLS) || computeOLS;
    var state = {
      serial: 0,
      dataId: 0,
      configId: 0,
      pinSerial: 0,
      fitCount: 0,
      table: { headers: [], rows: [], address: '' },
      config: normalizeConfig({}),
      spec: { lsl: null, usl: null, target: null },
      specError: '',
      confidence: 0.95,
      limits: {},
      explicitLimits: {},
      preview: null,
      previewError: '',
      model: null,
      currentDraft: {},
      pin: null,
      candidateDraft: {},
      yScale: null,
      scaleEpoch: ''
    };

    function bumpSerial() {
      state.serial += 1;
    }

    function clearComparison() {
      state.pin = null;
      state.candidateDraft = {};
      state.yScale = null;
      state.scaleEpoch = '';
    }

    function unpin() {
      clearComparison();
      return { ok: true };
    }

    function clearModel() {
      state.model = null;
      clearComparison();
    }

    function refreshPreview() {
      if (!state.table.headers.length) {
        state.preview = null;
        state.previewError = state.table.rows && state.table.rows.length ? '' : 'There is no worksheet data yet.';
        return;
      }
      var prepared = prepareDesign(state.table, state.config);
      if (!prepared.ok) {
        state.preview = null;
        state.previewError = prepared.reason;
        return;
      }
      state.preview = prepared;
      state.previewError = '';
      var observed = observedFrom(prepared);
      var defaults = defaultLimits(observed, state.config);
      Object.keys(defaults).forEach(function (name) {
        if (!state.explicitLimits[name]) state.limits[name] = defaults[name];
      });
    }

    function loadData(table) {
      bumpSerial();
      state.dataId += 1;
      state.table = {
        headers: (table && table.headers ? table.headers : []).map(function (h) { return String(h == null ? '' : h); }),
        rows: table && table.rows ? table.rows.map(function (row) { return row.slice(); }) : [],
        address: table && table.address ? String(table.address) : ''
      };
      state.explicitLimits = {};
      state.limits = {};
      state.currentDraft = {};
      clearModel();
      refreshPreview();
      return { ok: true, dataId: state.dataId };
    }

    function configure(config) {
      var next = normalizeConfig(config);
      var nextStructure = structureKey(next);
      var prevStructure = structureKey(state.config);
      var rolesChanged = JSON.stringify(next.roles) !== JSON.stringify(state.config.roles);
      state.config = next;
      if (nextStructure !== prevStructure) {
        bumpSerial();
        state.configId += 1;
        state.explicitLimits = {};
        state.limits = {};
        state.currentDraft = {};
        clearModel();
      } else if (rolesChanged) {
        clearComparison();
      }
      refreshPreview();
      return {
        ok: !state.previewError,
        error: state.previewError,
        modelCleared: nextStructure !== prevStructure,
        pinCleared: nextStructure !== prevStructure || rolesChanged
      };
    }

    function setOperatingLimits(limits) {
      var next = copy(state.limits);
      var error = '';
      Object.keys(limits || {}).forEach(function (name) {
        var spec = limits[name] || {};
        if (state.config.numeric.indexOf(name) >= 0) {
          var min = finiteOrNull(spec.min);
          var max = finiteOrNull(spec.max);
          if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
            error = name + ' needs a finite lower bound at or below its upper bound.';
            return;
          }
          next[name] = { min: min, max: max };
          state.explicitLimits[name] = true;
        } else if (state.config.categorical.indexOf(name) >= 0) {
          var levels = (spec.levels || []).map(String).filter(Boolean);
          var known = state.preview && state.preview.categoricalInfo
            ? (state.preview.categoricalInfo.filter(function (cat) { return cat.name === name; })[0] || {}).categories || []
            : levels;
          levels = levels.filter(function (level) { return known.indexOf(level) >= 0; });
          if (!levels.length) {
            error = name + ' needs at least one category from the fitted levels.';
            return;
          }
          next[name] = { levels: levels };
          state.explicitLimits[name] = true;
        }
      });
      if (error) return { ok: false, error: error };
      state.limits = next;
      if (state.pin && !boundsAllow(state.pin.settings).ok) clearComparison();
      return { ok: true };
    }

    function boundsAllow(settings) {
      var errors = [];
      (state.config.numeric || []).forEach(function (name) {
        if (state.config.roles[name] === 'fixed') return;
        var limit = state.limits[name];
        var value = finiteOrNull(settings[name]);
        if (!Number.isFinite(value)) {
          errors.push({ name: name, message: 'Enter a finite number for ' + name + '.' });
          return;
        }
        if (limit && (value < limit.min - EPS || value > limit.max + EPS)) {
          errors.push({
            name: name,
            message: name + ' is outside the allowed operating bounds (' +
              formatTrim(limit.min, 4) + ' to ' + formatTrim(limit.max, 4) + ').'
          });
        }
      });
      (state.config.categorical || []).forEach(function (name) {
        if (state.config.roles[name] === 'fixed') return;
        var limit = state.limits[name];
        var value = settings[name] == null ? '' : String(settings[name]);
        var allowed = limit && limit.levels ? limit.levels.map(String) : [];
        if (!value || allowed.indexOf(value) < 0) {
          errors.push({ name: name, message: name + ' is not one of the allowed choices.' });
        }
      });
      return { ok: !errors.length, errors: errors };
    }

    function fixedMatch(settings, baseline) {
      var errors = [];
      Object.keys(state.config.roles || {}).forEach(function (name) {
        if (state.config.roles[name] !== 'fixed') return;
        var left = settings[name];
        var right = baseline[name];
        var numeric = state.config.numeric.indexOf(name) >= 0;
        var same = numeric ? sameNumber(Number(left), Number(right)) : String(left) === String(right);
        if (!same) {
          errors.push({
            name: name,
            message: name + ' is a fixed condition. Edit current settings and pin again to change it.'
          });
        }
      });
      return errors;
    }

    function completeSettings(settings) {
      var errors = [];
      (state.config.numeric || []).forEach(function (name) {
        if (!Number.isFinite(finiteOrNull(settings[name]))) {
          errors.push({ name: name, message: 'Enter a finite number for ' + name + '.' });
        }
      });
      (state.config.categorical || []).forEach(function (name) {
        var value = settings[name];
        var known = state.model ? (state.model.observed.levels[name] || []) : [];
        if (value == null || value === '' || (known.length && known.map(String).indexOf(String(value)) < 0)) {
          errors.push({ name: name, message: name + ' needs a category from the fitted model.' });
        }
      });
      return errors;
    }

    function setSpecifications(spec) {
      var next = normalizeSpec(spec);
      var error = validateSpec(next);
      if (error) {
        state.specError = error;
        return { ok: false, error: error };
      }
      state.spec = next;
      state.specError = '';
      return { ok: true };
    }

    function setConfidence(level) {
      var value = Number(level);
      if (!(value > 0 && value < 1)) return { ok: false, error: 'Choose a confidence level between 0 and 1.' };
      state.confidence = value;
      if (state.model && state.model.results) state.model.results.alpha = 1 - value;
      return { ok: true };
    }

    function setCurrentSettings(partial) {
      Object.keys(partial || {}).forEach(function (name) {
        state.currentDraft[name] = partial[name];
      });
      return { ok: true };
    }

    function applyAnalyzedRow(index) {
      if (!state.model) return { ok: false, error: 'Fit the model before choosing a source row.' };
      var row = state.model.analyzed[index];
      if (!row) return { ok: false, error: 'That row is not in the analyzed sample.' };
      state.currentDraft = copy(row.settings);
      return { ok: true, settings: copy(row.settings), label: row.label };
    }

    function beginFit() {
      bumpSerial();
      clearModel();
      return { serial: state.serial, dataId: state.dataId, configId: state.configId };
    }

    function finishFit(token) {
      if (!token || token.serial !== state.serial || token.dataId !== state.dataId || token.configId !== state.configId) {
        return { applied: false, reason: 'stale' };
      }
      refreshPreview();
      if (!state.preview) {
        clearModel();
        return { applied: false, reason: state.previewError || 'The model cannot be estimated.' };
      }
      var prepared = state.preview;
      var alpha = 1 - state.confidence;
      state.fitCount += 1;
      var results;
      try {
        results = runOls(prepared.traced.xMatrix, prepared.traced.yVector, state.config.includeIntercept !== false, alpha);
      } catch (err) {
        clearModel();
        return {
          applied: false,
          reason: 'This model cannot be estimated from the analyzed rows. ' + (err && err.message ? err.message : '')
        };
      }
      if (!results || !Array.isArray(results.coefficients) || results.coefficients.some(function (v) { return !Number.isFinite(v); })) {
        clearModel();
        return { applied: false, reason: 'This model cannot be estimated from the analyzed rows.' };
      }
      results.alpha = alpha;
      var observed = observedFrom(prepared);
      var names = ['Intercept'].concat(prepared.columns.map(function (col) { return col.name; }));
      if (!state.config.includeIntercept) names = prepared.columns.map(function (col) { return col.name; });
      state.model = {
        id: 'm' + state.serial,
        results: results,
        columns: prepared.columns,
        analyzed: prepared.analyzed,
        observed: observed,
        numeric: prepared.numeric,
        categorical: prepared.categorical,
        categoricalInfo: prepared.categoricalInfo,
        n: results.n,
        fitCountAtFit: state.fitCount,
        fitConfidence: state.confidence,
        fitted: results.Y_fit ? results.Y_fit.slice() : [],
        residuals: results.residuals ? results.residuals.slice() : [],
        coefficients: results.coefficients.map(function (estimate, i) {
          return {
            name: names[i] || ('Term ' + (i + 1)),
            estimate: estimate,
            se: results.std_errors[i],
            t: results.t_values ? results.t_values[i] : null,
            p: results.p_values ? results.p_values[i] : null,
            ciLow: results.CI_lower ? results.CI_lower[i] : null,
            ciHigh: results.CI_upper ? results.CI_upper[i] : null
          };
        })
      };
      if (!Object.keys(state.currentDraft).length && prepared.analyzed[0]) {
        state.currentDraft = copy(prepared.analyzed[0].settings);
      }
      return { applied: true, modelId: state.model.id, n: results.n };
    }

    function pin() {
      if (!state.model) return { ok: false, error: 'Fit the model before pinning current settings.' };
      var settings = copy(state.currentDraft);
      var errors = completeSettings(settings).concat(boundsAllow(settings).errors);
      if (errors.length) return { ok: false, error: errors[0].message, errors: errors };
      state.pinSerial += 1;
      state.pin = { id: 'p' + state.pinSerial, settings: settings, modelId: state.model.id };
      state.candidateDraft = copy(settings);
      state.yScale = null;
      state.scaleEpoch = '';
      return { ok: true, pinId: state.pin.id };
    }

    function editCurrent() {
      if (state.pin) state.currentDraft = copy(state.pin.settings);
      clearComparison();
      return { ok: true };
    }

    function mergedCandidate() {
      var base = state.pin ? copy(state.pin.settings) : {};
      Object.keys(state.candidateDraft || {}).forEach(function (name) {
        if (state.config.roles[name] === 'fixed') return;
        base[name] = state.candidateDraft[name];
      });
      return base;
    }

    function setCandidate(partial) {
      if (!state.pin) return { ok: false, error: 'Pin current settings before exploring a candidate.' };
      var draft = copy(state.candidateDraft);
      Object.keys(partial || {}).forEach(function (name) {
        draft[name] = partial[name];
      });
      state.candidateDraft = draft;
      return { ok: true };
    }

    function resetCandidate() {
      if (!state.pin) return { ok: false, error: 'Pin current settings before resetting the candidate.' };
      state.candidateDraft = copy(state.pin.settings);
      return { ok: true };
    }

    function predict(settings) {
      if (!state.model) return { ok: false, reason: 'The fitted mean is not available for this model.' };
      var row = Trace.designRowFromInputs(settings, state.model.columns);
      var mean = Trace.meanResponse(state.model.results, row, state.config.includeIntercept !== false);
      if (!mean.ok) return mean;
      var level = state.confidence;
      return {
        ok: true,
        modelId: state.model.id,
        estimate: mean.estimate,
        se: mean.se,
        ci: mean.ci,
        ciReason: mean.ci ? '' : (mean.ciReason || 'The confidence interval for the mean response is unavailable for this fit.'),
        level: level
      };
    }

    function cardFor(settings) {
      var pred = predict(settings);
      if (!pred.ok) {
        return { available: false, reason: pred.reason || 'The fitted mean is unavailable for this scenario.' };
      }
      var scale = state.config.responseScale;
      var margin = marginOf(pred.estimate, state.spec);
      var marginText = margin.unavailable
        ? 'Unavailable'
        : withUnitPhrase(formatSignedTrim(margin.value, 4), scale) + ', ' + margin.side;
      var targetDelta = state.spec.target == null ? null : pred.estimate - state.spec.target;
      var support = supportFor(state.model.analyzed, state.config, settings);
      return {
        available: true,
        modelId: pred.modelId,
        settings: copy(settings),
        mean: pred.estimate,
        meanText: formatTrim(pred.estimate, 6),
        ci: pred.ci,
        ciText: pred.ci ? ('[' + formatTrim(pred.ci[0], 6) + ', ' + formatTrim(pred.ci[1], 6) + ']') : 'Unavailable',
        ciLabel: Math.round(state.confidence * 100) + '% confidence interval for the mean response',
        ciReason: pred.ciReason,
        margin: margin,
        marginText: marginText,
        locationLabel: locationLabel(pred.estimate, state.spec),
        targetDelta: targetDelta,
        targetText: targetDelta == null ? '' : ('Difference from target: ' + withUnitPhrase(formatSignedTrim(targetDelta, 4), scale)),
        atTarget: targetDelta != null && Math.abs(targetDelta) <= EPS,
        support: support,
        rangeFlag: rangeFlag(pred.estimate, scale)
      };
    }

    function changedInputs(current, candidate) {
      var changed = [];
      (state.config.numeric || []).concat(state.config.categorical || []).forEach(function (name) {
        if (state.config.roles[name] === 'fixed') return;
        var from = current[name];
        var to = candidate[name];
        var numeric = state.config.numeric.indexOf(name) >= 0;
        var different = numeric ? !sameNumber(Number(from), Number(to)) : String(from) !== String(to);
        if (!different) return;
        changed.push({
          name: name,
          unit: state.config.units[name] || '',
          from: from,
          to: to,
          fromText: numeric ? formatTrim(Number(from), 4) : String(from),
          toText: numeric ? formatTrim(Number(to), 4) : String(to)
        });
      });
      return changed;
    }

    function profileFor(name, candidateSettings) {
      var held = [];
      (state.config.numeric || []).concat(state.config.categorical || []).forEach(function (other) {
        if (other === name) return;
        held.push({
          name: other,
          value: candidateSettings[other],
          text: state.config.numeric.indexOf(other) >= 0
            ? formatTrim(Number(candidateSettings[other]), 4)
            : String(candidateSettings[other])
        });
      });
      if (state.config.categorical.indexOf(name) >= 0) {
        var levels = (state.limits[name] && state.limits[name].levels) || [];
        var marks = levels.map(function (level) {
          var settings = copy(candidateSettings);
          settings[name] = level;
          var pred = predict(settings);
          return {
            level: level,
            mean: pred.ok ? pred.estimate : null,
            ci: pred.ok ? pred.ci : null,
            active: String(level) === String(candidateSettings[name])
          };
        });
        return {
          name: name,
          unit: state.config.units[name] || '',
          kind: 'categorical',
          modelId: state.model.id,
          activeLevel: String(candidateSettings[name]),
          marks: marks,
          held: held
        };
      }
      var limit = state.limits[name] || { min: candidateSettings[name], max: candidateSettings[name] };
      var steps = 20;
      var points = [];
      var span = limit.max - limit.min;
      var count = span <= EPS ? 0 : steps;
      for (var i = 0; i <= count; i++) {
        var x = count === 0 ? limit.min : limit.min + span * (i / count);
        var settings = copy(candidateSettings);
        settings[name] = x;
        var pred = predict(settings);
        if (!pred.ok) continue;
        points.push({ x: x, mean: pred.estimate, ci: pred.ci });
      }
      return {
        name: name,
        unit: state.config.units[name] || '',
        kind: 'numeric',
        modelId: state.model.id,
        active: Number(candidateSettings[name]),
        locked: !!(limit && Math.abs(limit.max - limit.min) <= EPS),
        points: points,
        held: held
      };
    }

    function expandScale(profiles, cards) {
      var epoch = (state.model ? state.model.id : '') + ':' + (state.pin ? state.pin.id : '');
      if (epoch !== state.scaleEpoch) {
        state.yScale = null;
        state.scaleEpoch = epoch;
      }
      var lo = Infinity;
      var hi = -Infinity;
      function take(value) {
        if (!Number.isFinite(value)) return;
        if (value < lo) lo = value;
        if (value > hi) hi = value;
      }
      take(state.spec.lsl);
      take(state.spec.usl);
      take(state.spec.target);
      cards.forEach(function (card) {
        if (!card || !card.available) return;
        take(card.mean);
        if (card.ci) { take(card.ci[0]); take(card.ci[1]); }
      });
      (profiles || []).forEach(function (profile) {
        (profile.points || []).forEach(function (point) {
          take(point.mean);
          if (point.ci) { take(point.ci[0]); take(point.ci[1]); }
        });
        (profile.marks || []).forEach(function (mark) {
          take(mark.mean);
          if (mark.ci) { take(mark.ci[0]); take(mark.ci[1]); }
        });
      });
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
      if (Math.abs(hi - lo) <= EPS) { lo -= 1; hi += 1; }
      var pad = Math.max((hi - lo) * 0.12, 0.5);
      var next = { min: lo - pad, max: hi + pad };
      if (!state.yScale) state.yScale = next;
      else {
        state.yScale = {
          min: Math.min(state.yScale.min, next.min),
          max: Math.max(state.yScale.max, next.max)
        };
      }
    }

    function read() {
      var pinned = !!state.pin;
      var exploreSettings = copy(state.currentDraft);
      var exploreErrors = state.model ? completeSettings(exploreSettings).concat(boundsAllow(exploreSettings).errors) : [];
      var candidateSettings = pinned ? mergedCandidate() : (state.model ? exploreSettings : null);
      var boundErrors = [];
      if (pinned) {
        boundErrors = candidateSettings ? boundsAllow(candidateSettings).errors : [];
        var fixedErrors = candidateSettings ? fixedMatch(state.candidateDraft, state.pin.settings) : [];
        if (fixedErrors.length) {
          Object.keys(state.candidateDraft || {}).forEach(function (name) {
            if (state.config.roles[name] !== 'fixed') return;
            if (String(state.candidateDraft[name]) !== String(state.pin.settings[name])) boundErrors.push(fixedErrors[0]);
          });
        }
      } else if (state.model) {
        boundErrors = exploreErrors;
      }
      var scenarioValid = !!(state.model && candidateSettings && !boundErrors.length && (pinned || exploreErrors.length === 0));
      var currentCard = pinned ? cardFor(state.pin.settings) : null;
      var scenarioCard = scenarioValid ? cardFor(candidateSettings) : null;
      if (scenarioCard && scenarioCard.available === false) {
        scenarioValid = false;
        boundErrors = [{ name: '', message: scenarioCard.reason }];
        scenarioCard = null;
      }
      var candidateCard = pinned ? scenarioCard : null;
      var exploreCard = pinned ? null : scenarioCard;
      var profiles = [];
      if (scenarioValid && state.model && (!pinned || state.model.id === state.pin.modelId)) {
        (state.config.numeric || []).concat(state.config.categorical || []).forEach(function (name) {
          if (state.config.roles[name] === 'fixed') return;
          profiles.push(profileFor(name, candidateSettings));
        });
      }
      var cards = [currentCard, scenarioCard].filter(Boolean);
      if (scenarioCard && scenarioCard.available) expandScale(profiles, cards);
      var delta = currentCard && candidateCard && currentCard.available && candidateCard.available
        ? candidateCard.mean - currentCard.mean
        : null;
      var phase = 'setup';
      if (!state.table.headers.length) phase = 'empty';
      else if (pinned && candidateSettings && !scenarioValid) phase = 'withheld';
      else if (pinned) phase = 'pinned';
      else if (state.model && scenarioValid) phase = 'exploring';
      else if (state.model) phase = 'needs-input';
      var withheld = '';
      if (phase === 'withheld') withheld = boundErrors.length ? boundErrors[0].message : 'The candidate is outside the allowed inputs, so the comparison is withheld.';
      else if (phase === 'needs-input') withheld = boundErrors.length ? boundErrors[0].message : 'Enter the remaining settings to predict.';
      return {
        phase: phase,
        message: state.previewError || '',
        fitCount: state.fitCount,
        table: {
          headers: state.table.headers.slice(),
          address: state.table.address,
          nRows: state.table.rows.length
        },
        columns: columnChoices(state.table.headers, state.table.rows),
        config: copy(state.config),
        spec: copy(state.spec),
        specError: state.specError,
        confidence: state.confidence,
        limits: copy(state.limits),
        observed: state.model ? copy(state.model.observed) : (state.preview ? observedFrom(state.preview) : { ranges: {}, levels: {} }),
        previewN: state.preview ? state.preview.analyzed.length : 0,
        model: state.model ? {
          id: state.model.id,
          n: state.model.n,
          df: state.model.results.df,
          r2: state.model.results.R2,
          adjR2: state.model.results.R2_adj,
          rmse: state.model.results.RMSE,
          f: state.model.results.F_stat,
          fp: state.model.results.F_pvalue,
          coefficients: state.model.coefficients.map(function (row) {
            return {
              name: row.name,
              estimate: row.estimate,
              se: row.se,
              t: row.t,
              p: row.p,
              ciLow: row.ciLow,
              ciHigh: row.ciHigh
            };
          }),
          fitCountAtFit: state.model.fitCountAtFit,
          fitConfidence: state.model.fitConfidence,
          fitted: state.model.fitted.slice(),
          residuals: state.model.residuals.slice(),
          references: (state.model.categoricalInfo || []).map(function (cat) {
            return {
              name: cat.name,
              reference: (cat.categories && cat.categories[0]) || '',
              levels: (cat.categories || []).slice()
            };
          })
        } : null,
        analyzedRows: state.model ? state.model.analyzed.map(function (row) {
          return { label: row.label, settings: copy(row.settings), response: row.response, caseKey: row.caseKey };
        }) : [],
        currentDraft: copy(state.currentDraft),
        pin: state.pin ? { id: state.pin.id, modelId: state.pin.modelId, settings: copy(state.pin.settings) } : null,
        candidateDraft: copy(state.candidateDraft),
        candidateErrors: boundErrors,
        currentCard: currentCard,
        exploreCard: exploreCard,
        candidateCard: candidateCard,
        withheldReason: withheld,
        deltaMean: delta,
        deltaText: delta == null ? '' : withUnitPhrase(formatSignedTrim(delta, 4), state.config.responseScale),
        atTarget: !!(candidateCard && candidateCard.atTarget),
        changed: delta == null ? [] : changedInputs(state.pin.settings, candidateSettings),
        profiles: profiles,
        yScale: state.yScale ? { min: state.yScale.min, max: state.yScale.max } : null,
        caveat: 'An in-range result alone does not establish joint support.'
      };
    }

    return {
      loadData: loadData,
      configure: configure,
      setOperatingLimits: setOperatingLimits,
      setSpecifications: setSpecifications,
      setConfidence: setConfidence,
      setCurrentSettings: setCurrentSettings,
      applyAnalyzedRow: applyAnalyzedRow,
      beginFit: beginFit,
      finishFit: finishFit,
      pin: pin,
      unpin: unpin,
      predict: predict,
      editCurrent: editCurrent,
      setCandidate: setCandidate,
      resetCandidate: resetCandidate,
      fitCount: function () { return state.fitCount; },
      read: read
    };
  }

  return {
    createSession: createSession,
    demoTable: demoTable,
    demoPreset: demoPreset,
    columnChoices: columnChoices
  };
});
