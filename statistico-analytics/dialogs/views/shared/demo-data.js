/**
 * Shared "Use demo data" control and module-shaped tables.
 * treatment is the categorical that belongs in a regression equation.
 * site is the categorical left free for by-group analysis.
 */
(function (root) {
  'use strict';

  var TREATMENTS = ['Control', 'Standard', 'Intensive'];
  var SITES = ['North', 'South', 'East'];
  var TREAT_EFFECT = { Control: 0, Standard: 4.5, Intensive: 9 };

  function mulberry32(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function longTable() {
    var headers = [
      'record_id', 'age', 'tenure_months', 'baseline_score', 'monthly_spend',
      'satisfaction', 'response_min', 'outcome_score', 'converted', 'treatment', 'site'
    ];
    var rand = mulberry32(20261117);
    var rows = [];
    var i;
    for (i = 0; i < 36; i++) {
      var treatment = TREATMENTS[i % 3];
      var site = SITES[Math.floor(i / 3) % 3];
      var age = 28 + Math.floor(rand() * 37);
      var tenure = 6 + Math.floor(rand() * 108);
      var baseline = round1(48 + rand() * 28);
      var spend = round2(35 + rand() * 160);
      var satisfaction = 1 + Math.floor(rand() * 7);
      var response = round1(2.5 + rand() * 16);
      var outcome = round1(
        baseline * 0.45 + TREAT_EFFECT[treatment] + (70 - age) * 0.12 + satisfaction * 1.1 + rand() * 5
      );
      var converted = treatment === 'Control' ? (i % 2) : (rand() > 0.28 ? 1 : 0);
      rows.push([i + 1, age, tenure, baseline, spend, satisfaction, response, outcome, converted, treatment, site]);
    }
    return { headers: headers, rows: rows, address: 'Built-in sample' };
  }

  function wideGroups() {
    var headers = ['Control', 'Standard', 'Intensive', 'site'];
    var rand = mulberry32(20261118);
    var rows = [];
    var i;
    for (i = 0; i < 24; i++) {
      var base = 48 + rand() * 8;
      rows.push([
        round1(base + rand() * 4),
        round1(base + 5 + rand() * 4),
        round1(base + 11 + rand() * 4),
        SITES[i % 3]
      ]);
    }
    return { headers: headers, rows: rows, address: 'Built-in sample' };
  }

  function repeatedScores() {
    var headers = ['before', 'after', 'followup', 'site'];
    var rand = mulberry32(20261119);
    var rows = [];
    var i;
    for (i = 0; i < 24; i++) {
      var before = round1(46 + rand() * 16);
      var after = round1(before + 6 + rand() * 5);
      var followup = round1(after - 1.5 + rand() * 3);
      rows.push([before, after, followup, SITES[i % 3]]);
    }
    return { headers: headers, rows: rows, address: 'Built-in sample' };
  }

  function reliabilityTable() {
    var headers = ['item_1', 'item_2', 'item_3', 'item_4', 'item_5', 'site'];
    var rand = mulberry32(20261120);
    var rows = [];
    var i;
    for (i = 0; i < 30; i++) {
      var latent = rand();
      function item() {
        var score = 1 + Math.round(latent * 3 + rand() * 1.4);
        if (score < 1) score = 1;
        if (score > 5) score = 5;
        return score;
      }
      rows.push([item(), item(), item(), item(), item(), SITES[i % 3]]);
    }
    return { headers: headers, rows: rows, address: 'Built-in sample' };
  }

  function metaTable() {
    var headers = ['study', 'mean1', 'sd1', 'n1', 'mean2', 'sd2', 'n2', 'site'];
    var studies = ['Adler 2018', 'Brooks 2019', 'Chen 2020', 'Diaz 2020', 'Evans 2021', 'Foster 2021', 'Grant 2022', 'Hassan 2023'];
    var rand = mulberry32(20261121);
    var rows = studies.map(function (study, i) {
      var n1 = 24 + Math.floor(rand() * 50);
      var n2 = 22 + Math.floor(rand() * 48);
      var mean2 = round1(46 + rand() * 8);
      var mean1 = round1(mean2 + 3.5 + rand() * 4);
      return [study, mean1, round1(7 + rand() * 3), n1, mean2, round1(7 + rand() * 3), n2, SITES[i % 3]];
    });
    return { headers: headers, rows: rows, address: 'Built-in sample' };
  }

  function indexOf(headers, name) {
    return headers.indexOf(name);
  }

  function pack(kind) {
    var table;
    var spec;
    if (kind === 'independent') {
      table = wideGroups();
      spec = { selectedColumns: ['Control', 'Standard', 'Intensive'] };
      return withSpec(table, spec);
    }
    if (kind === 'dependent') {
      table = repeatedScores();
      spec = { selectedColumns: ['before', 'after', 'followup'] };
      return withSpec(table, spec);
    }
    if (kind === 'reliability') {
      table = reliabilityTable();
      spec = {
        items: ['item_1', 'item_2', 'item_3', 'item_4', 'item_5'],
        groupVariable: 'site'
      };
      return withSpec(table, spec);
    }
    if (kind === 'meta') {
      table = metaTable();
      return withSpec(table, null);
    }
    table = longTable();
    if (kind === 'regression') {
      spec = {
        y: 'outcome_score',
        xn: ['age', 'baseline_score', 'monthly_spend'],
        xc: ['treatment'],
        intercept: 1
      };
    } else if (kind === 'logistic') {
      spec = {
        y: 'converted',
        xn: ['age', 'satisfaction', 'monthly_spend'],
        xc: ['treatment'],
        intercept: 1
      };
    } else if (kind === 'univariate') {
      spec = { columnIndex: indexOf(table.headers, 'outcome_score') };
    } else if (kind === 'anova') {
      spec = { dv: 'outcome_score', factor1: 'treatment', type: 'between' };
    } else if (kind === 'factor' || kind === 'cluster') {
      spec = {
        variables: ['age', 'tenure_months', 'baseline_score', 'monthly_spend', 'satisfaction', 'response_min', 'outcome_score']
      };
    } else if (kind === 'contingency') {
      spec = {
        rowVar: 'treatment',
        colVar: 'site',
        rowLevels: TREATMENTS.slice(),
        colLevels: SITES.slice()
      };
    } else if (kind === 'mixed') {
      spec = {
        dep: 'outcome_score',
        fix: ['treatment'],
        cov: ['age', 'baseline_score'],
        rnd: 'site'
      };
    } else if (kind === 'correlation') {
      spec = { selectAllNumeric: true };
    }
    return withSpec(table, spec);
  }

  function withSpec(table, spec) {
    var out = {
      headers: table.headers,
      rows: table.rows,
      address: table.address,
      values: [table.headers].concat(table.rows)
    };
    if (spec) {
      out.savedModelSpec = spec;
      out.savedSpec = spec;
      if (spec.y) out.restoreSavedModel = true;
    }
    return out;
  }

  function fixtures() {
    return root.StatisticoDemoFixtures || null;
  }

  function cloneTable(id) {
    var src = fixtures() && fixtures().tables[id];
    if (!src) return null;
    return {
      id: src.id,
      title: src.title,
      module: src.module,
      groupField: src.groupField,
      mode: src.mode,
      roles: src.roles,
      settings: src.settings,
      headers: src.headers.slice(),
      rows: src.rows.map(function (row) { return row.slice(); })
    };
  }

  function table(id, opts) {
    var src = cloneTable(id);
    if (!src) return null;
    if (opts && opts.groupField && opts.groupValue != null) {
      var idx = src.headers.indexOf(opts.groupField);
      if (idx >= 0) {
        src.rows = src.rows.filter(function (row) { return String(row[idx]) === String(opts.groupValue); });
      }
    }
    src.address = 'Demo data · ' + src.title;
    src.values = [src.headers].concat(src.rows);
    return src;
  }

  function columnIndex(headers, name) {
    return headers.indexOf(name);
  }

  function levelsOf(tableObj, name) {
    var idx = columnIndex(tableObj.headers, name);
    var seen = Object.create(null);
    var out = [];
    if (idx < 0) return out;
    tableObj.rows.forEach(function (row) {
      var value = row[idx];
      if (value == null || value === '') return;
      var key = String(value);
      if (seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    return out;
  }

  function pivotScores(source, factor, value, order) {
    var factorIdx = columnIndex(source.headers, factor);
    var valueIdx = columnIndex(source.headers, value);
    var groups = Object.create(null);
    var names = order.slice();
    source.rows.forEach(function (row) {
      var name = String(row[factorIdx]);
      if (!groups[name]) groups[name] = [];
      groups[name].push(row[valueIdx]);
      if (names.indexOf(name) < 0) names.push(name);
    });
    var height = 0;
    names.forEach(function (name) { height = Math.max(height, (groups[name] || []).length); });
    var rows = [];
    var r;
    for (r = 0; r < height; r++) {
      rows.push(names.map(function (name) {
        var col = groups[name] || [];
        return r < col.length ? col[r] : '';
      }));
    }
    return { headers: names, rows: rows, title: source.title, id: source.id };
  }

  function namedColumns(headers, map) {
    var spec = { colNames: {} };
    Object.keys(map).forEach(function (key) {
      spec.colNames[key] = map[key];
      spec[key] = columnIndex(headers, map[key]);
    });
    return spec;
  }

  function activeMetaMode() {
    var button = document.querySelector('#effectTypeSeg button.active');
    return (button && button.getAttribute('data-type')) || 'continuous';
  }

  function clusterMethodNow() {
    var sel = document.getElementById('clusterMethod');
    if (sel && sel.value === 'hierarchical') return 'hierarchical';
    if (root.CLUSTER_LOCKED_METHOD === 'hierarchical') return 'hierarchical';
    return 'kmeans';
  }

  function build(kind) {
    var src;
    var spec;
    var shaped;
    if (kind === 'univariate') {
      src = table('univariate');
      spec = { columnIndex: columnIndex(src.headers, src.roles.measure) };
      return withSpec(src, spec);
    }
    if (kind === 'correlation') {
      src = table('correlations');
      spec = { variables: src.roles.variables.slice(), selectAllNumeric: false };
      return withSpec(src, spec);
    }
    if (kind === 'factor') {
      var factorId = /(?:^|[?&])mode=pca(?:&|$)/.test(root.location && root.location.search || '') ? 'pca' : 'factor_analysis';
      src = table(factorId);
      spec = { variables: (src.roles.variables || src.roles.items).slice() };
      if (factorId === 'factor_analysis') spec.factors = src.settings.suggested_factor_count || 3;
      return withSpec(src, spec);
    }
    if (kind === 'cluster') {
      var method = clusterMethodNow();
      src = table(method === 'hierarchical' ? 'hierarchical' : 'kmeans');
      spec = {
        variables: src.roles.features.slice(),
        clusterMethod: method,
        k: src.settings.suggested_cluster_count || 3,
        standardize: src.settings.standardize !== false,
        linkage: 'average',
        distance: 'euclidean'
      };
      shaped = withSpec(src, spec);
      var sel = document.getElementById('clusterMethod');
      shaped.lockedMethod = sel && sel.disabled ? sel.value : null;
      return shaped;
    }
    if (kind === 'independent') {
      src = table('independent_groups');
      var order = (src.settings.three_group_levels || []).slice();
      var wide = pivotScores(src, src.roles.comparison_factor, src.roles.outcome, order);
      var two = (src.settings.two_group_levels || order.slice(0, 2)).slice();
      spec = { selectedColumns: two };
      shaped = withSpec(wide, spec);
      shaped.address = 'Demo data · ' + src.title;
      shaped.values = [shaped.headers].concat(shaped.rows);
      return shaped;
    }
    if (kind === 'dependent') {
      src = table('paired_repeated_wide');
      spec = { selectedColumns: src.roles.repeated_measures.slice() };
      return withSpec(src, spec);
    }
    if (kind === 'anova') {
      src = table('anova');
      spec = {
        type: 'between',
        dv: src.roles.outcome,
        factor1: src.roles.factors[0],
        factor2: src.roles.factors[1]
      };
      return withSpec(src, spec);
    }
    if (kind === 'contingency') {
      src = table('contingency_2x2');
      spec = {
        rowVar: src.roles.row,
        colVar: src.roles.column,
        frequencyColumn: src.roles.frequency,
        rowLevels: [src.settings.exposed_level, src.settings.reference_level].filter(Boolean),
        colLevels: levelsOf(src, src.roles.column)
      };
      if (src.settings.event_level) {
        spec.colLevels = [src.settings.event_level].concat(spec.colLevels.filter(function (level) {
          return level !== src.settings.event_level;
        }));
      }
      return withSpec(src, spec);
    }
    if (kind === 'meta') {
      var mode = activeMetaMode();
      if (mode === 'correlation') return null;
      if (mode === 'binary') {
        src = table('meta_binary');
        spec = namedColumns(src.headers, {
          studyCol: src.roles.study,
          aCol: src.roles.intervention_events,
          n1Col: src.roles.intervention_total,
          cCol: src.roles.control_events,
          n2Col: src.roles.control_total
        });
        spec.effectType = 'binary';
        spec.effectMeasure = 'rr';
        spec.binaryFormat = 'events_total';
      } else if (mode === 'direct') {
        src = table('meta_effect_se');
        spec = namedColumns(src.headers, {
          studyCol: src.roles.study,
          effectCol: src.roles.effect,
          seCol: src.roles.standard_error
        });
        spec.effectType = 'direct';
        spec.effectMeasure = 'logrr';
        spec.uncertaintyType = 'se';
      } else {
        src = table('meta_continuous');
        spec = namedColumns(src.headers, {
          studyCol: src.roles.study,
          n1Col: 'intervention_n',
          mean1Col: 'intervention_mean',
          sd1Col: 'intervention_sd',
          n2Col: 'control_n',
          mean2Col: 'control_mean',
          sd2Col: 'control_sd'
        });
        spec.effectType = 'continuous';
        spec.effectMeasure = 'md';
      }
      return withSpec(src, spec);
    }
    if (kind === 'regression') {
      src = table('linear_regression');
      spec = {
        y: src.roles.outcome,
        xn: src.roles.predictors.slice(),
        xc: [src.roles.optional_categorical_predictor],
        intercept: 1
      };
      return withSpec(src, spec);
    }
    if (kind === 'logistic') {
      src = table('logistic_regression');
      spec = {
        y: src.roles.outcome,
        xn: src.roles.predictors.slice(),
        xc: [src.roles.optional_categorical_predictor],
        intercept: 1
      };
      return withSpec(src, spec);
    }
    if (kind === 'mixed') {
      src = table('mixed_models');
      spec = {
        dep: src.roles.outcome,
        fix: [src.roles.fixed_group],
        cov: [src.roles.time, src.roles.covariate],
        rnd: src.roles.random_intercept
      };
      return withSpec(src, spec);
    }
    if (kind === 'reliability') {
      src = table('scale_reliability');
      spec = { items: src.roles.items.slice(), groupVariable: src.groupField };
      return withSpec(src, spec);
    }
    if (kind === 'pareto') {
      src = table('pareto');
      spec = { categoryColName: src.roles.category, valuesColName: src.roles.frequency };
      return withSpec(src, spec);
    }
    if (kind === 'prepare') {
      return withSpec(table('prepare_data'), null);
    }
    if (kind === 'segmentation') {
      if (!/(?:^|[?&])product=split(?:&|$)/i.test(root.location && root.location.search || '')) return null;
      src = table('split_index');
      var splitAt = columnIndex(src.headers, src.roles.binary_split);
      src.rows.forEach(function (row) {
        var label = String(row[splitAt]);
        if (label === src.settings.positive_level) row[splitAt] = 1;
        else if (label === src.settings.reference_level) row[splitAt] = 0;
      });
      spec = {
        product: 'split',
        xDimension: { columns: [] },
        yDimension: {
          columns: [src.roles.binary_split],
          label: src.roles.binary_split,
          thresholdMethod: 'custom',
          threshold: 1,
          highLabel: src.settings.positive_level,
          lowLabel: src.settings.reference_level
        },
        factorColumns: src.roles.factors.slice(),
        legendLabelsCustom: true
      };
      shaped = withSpec(src, null);
      shaped.savedSpec = spec;
      return shaped;
    }
    if (kind === 'multivariable') {
      src = table('charts_3d');
      spec = {
        xColName: src.roles.x,
        yColName: src.roles.y,
        sizeColName: src.roles.z,
        colorColName: src.roles.color,
        labelColName: src.roles.label
      };
      return withSpec(src, spec);
    }
    if (kind === 'publication') {
      return withSpec(table('publication_tables'), null);
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById('statistico-demo-style')) return;
    var style = document.createElement('style');
    style.id = 'statistico-demo-style';
    style.textContent = [
      '#statistico-demo-row{display:flex;flex:0 0 auto;align-items:center;gap:8px;box-sizing:border-box;width:100%;margin:0;padding:6px 16px;min-width:0;position:relative;z-index:1;background:rgba(15,23,42,.04);border-bottom:1px solid rgba(148,163,184,.35);color:#0f172a;}',
      '.cfg-header + #statistico-demo-row{background:#1a212b;color:rgba(255,255,255,.88);border-bottom:1px solid rgba(249,115,22,.22);}',
      '.cfg-demo-btn{flex:0 0 auto;border:1px solid rgba(255,255,255,.45);background:#fff;color:#1e293b;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:650;cursor:pointer;font-family:inherit;line-height:1.2;}',
      '.cfg-demo-btn:hover{background:#f8fafc;}',
      '.cfg-demo-btn:disabled{opacity:.65;cursor:progress;}',
      '.statistico-demo-status{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:650;line-height:1.3;color:inherit;}',
      '.statistico-demo-status.is-error{color:#b91c1c;}',
      '.cfg-header + #statistico-demo-row .statistico-demo-status.is-error{color:#fecaca;}'
    ].join('');
    document.head.appendChild(style);
  }

  function isDemoAddress(address) {
    var text = String(address || '');
    return text.indexOf('Demo') === 0 || text.indexOf('Built-in sample') === 0;
  }

  function isSheetPayload(message) {
    try {
      var msg = JSON.parse(message || '{}');
      var body = msg.payload || msg.data;
      return !!(body && body.headers && !isDemoAddress(body.address));
    } catch (_e) {
      return false;
    }
  }

  var hostKnown = false;
  var officeHost = null;

  function noteHost(info) {
    if (hostKnown) return;
    var host = (info && info.host) || (root.Office && Office.context && Office.context.host) || null;
    officeHost = host || null;
    hostKnown = true;
  }

  function setMethod(obj, key, fn) {
    if (!obj) return false;
    try {
      obj[key] = fn;
      if (obj[key] === fn) return true;
    } catch (_e) {}
    try {
      Object.defineProperty(obj, key, { configurable: true, writable: true, value: fn });
      return obj[key] === fn;
    } catch (_e2) {}
    return false;
  }

  function ensureDialogStubs() {
    try {
      if (!root.Office || !Office.context) return;
      var ctx = Office.context;
      var existing = ctx.ui;
      if (existing && typeof existing.messageParent === 'function' && !existing.messageParent.__demoStub) {
        var liveParent = existing.messageParent.__demoCarrier ? existing.messageParent.__orig : existing.messageParent;
        if (!liveParent || !liveParent.__demoStub) return;
      }
      var current = ctx.ui || {};
      function parentStub() {}
      parentStub.__demoStub = true;
      function addStub(_type, _handler, callback) {
        if (typeof callback === 'function') try { callback({ status: 'succeeded' }); } catch (_cb) {}
      }
      addStub.__demoStub = true;
      var shield = {
        messageParent: parentStub,
        addHandlerAsync: addStub
      };
      var replaced = false;
      try {
        ctx.ui = shield;
        replaced = ctx.ui === shield;
      } catch (_ui) {}
      if (!replaced) {
        if (!ctx.ui) {
          try { ctx.ui = {}; } catch (_make) {}
        }
        if (ctx.ui) {
          if (typeof ctx.ui.messageParent !== 'function' || !ctx.ui.messageParent.__demoStub) setMethod(ctx.ui, 'messageParent', parentStub);
          if (typeof ctx.ui.addHandlerAsync !== 'function' || !ctx.ui.addHandlerAsync.__demoStub) setMethod(ctx.ui, 'addHandlerAsync', addStub);
        }
      }
      void current;
    } catch (_e) {}
  }

  var DEMO_SKIP = { ready: 1, requestData: 1, close: 1, cancel: 1 };

  function attachDemo(message) {
    var text = typeof message === 'string' ? message : JSON.stringify(message || {});
    if (!root.__statisticoDemo || !root.__statisticoDemo.headers || !root.__statisticoDemo.rows) return text;
    try {
      var parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.action || DEMO_SKIP[parsed.action]) return text;
      parsed.demo = {
        headers: root.__statisticoDemo.headers,
        rows: root.__statisticoDemo.rows,
        address: root.__statisticoDemo.address || 'Built-in sample'
      };
      return JSON.stringify(parsed);
    } catch (_e) {
      return text;
    }
  }

  function deliver(message) {
    var ui = root.Office && Office.context && Office.context.ui;
    if (!ui || typeof ui.messageParent !== 'function') return false;
    ui.messageParent(attachDemo(message));
    return true;
  }

  function installCarrier() {
    function arm(info) {
      try {
        noteHost(info);
        if (!root.Office || !Office.context) return;
        if (!realDialogUi()) {
          ensureDialogStubs();
          return;
        }
        var ui = Office.context.ui;
        if (!ui || (ui.addHandlerAsync && ui.addHandlerAsync.__demoStub)) return;
        if (typeof ui.addHandlerAsync === 'function' && !ui.addHandlerAsync.__demoGuard) {
          var origAdd = ui.addHandlerAsync.bind(ui);
          var guardedAdd = function (type, handler, callback) {
            var guarded = function (arg) {
              if (root.__statisticoDemoLock && type === Office.EventType.DialogParentMessageReceived && isSheetPayload(arg && arg.message)) return;
              return handler(arg);
            };
            return origAdd(type, guarded, callback);
          };
          guardedAdd.__demoGuard = true;
          if (setMethod(ui, 'addHandlerAsync', guardedAdd)) ui.addHandlerAsync.__demoGuard = true;
        }
        if (typeof ui.messageParent !== 'function' || ui.messageParent.__demoCarrier || ui.messageParent.__demoStub) return;
        var orig = ui.messageParent.bind(ui);
        function wrapped(message) {
          return orig(attachDemo(message));
        }
        wrapped.__demoCarrier = true;
        wrapped.__orig = orig;
        setMethod(ui, 'messageParent', wrapped);
      } catch (_arm) {}
    }
    if (typeof root.Office !== 'undefined' && typeof Office.onReady === 'function') {
      try { Office.onReady(arm); }
      catch (_e3) { arm(); }
    } else {
      arm();
    }
  }

  installCarrier();

  function remember(pack) {
    root.__statisticoDemoLock = true;
    root.__statisticoDemo = {
      headers: pack.headers.slice(),
      rows: pack.rows.map(function (row) { return row.slice(); }),
      address: pack.address || 'Built-in sample'
    };
    installCarrier();
  }

  var ROUTES = {
    regression: function (pack) { root.applyRegressionPayload(pack); },
    logistic: function (pack) { root.applyRegressionPayload(pack); },
    univariate: function (pack) { root.applyPayload(pack); },
    anova: function (pack) { root.loadAnovaPayload(pack); },
    correlation: function (pack) { root.loadCorrelationPayload(pack); },
    independent: function (pack) { root.applyPayload(pack); },
    dependent: function (pack) { root.applyPayload(pack); },
    factor: function (pack) { root.applyPayload(pack); },
    cluster: function (pack) { root.applyPayload(pack); },
    contingency: function (pack) { root.applyPayload(pack); },
    meta: function (pack) { root.applyPayload(pack); },
    reliability: function (pack) { root.applyPayload(pack); },
    mixed: function (pack) { root.loadMixedModelData(pack); },
    pareto: function (pack) { root.applyPayload(pack); },
    prepare: function (pack) { root.applyPayload(pack); },
    segmentation: function (pack) { root.applyPayload(pack); },
    multivariable: function (pack) { root.applyPayload(pack); },
    publication: function (pack) {
      if (!root.StatisticoPublicationDemo || typeof root.StatisticoPublicationDemo.load !== 'function') {
        throw new Error('publication demo is not ready');
      }
      root.StatisticoPublicationDemo.load(pack);
    }
  };

  var APPLY_NAME = {
    regression: 'applyRegressionPayload',
    logistic: 'applyRegressionPayload',
    univariate: 'applyPayload',
    anova: 'loadAnovaPayload',
    correlation: 'loadCorrelationPayload',
    independent: 'applyPayload',
    dependent: 'applyPayload',
    factor: 'applyPayload',
    cluster: 'applyPayload',
    contingency: 'applyPayload',
    meta: 'applyPayload',
    reliability: 'applyPayload',
    mixed: 'loadMixedModelData',
    pareto: 'applyPayload',
    prepare: 'applyPayload',
    segmentation: 'applyPayload',
    multivariable: 'applyPayload'
  };

  var pageDraft = null;
  var loadSerial = 0;
  var statusNode = null;
  var returnNode = null;
  var demoButton = null;

  function clonePack(pack) {
    if (!pack) return null;
    var copy = {
      headers: (pack.headers || []).slice(),
      rows: (pack.rows || []).map(function (row) { return Array.isArray(row) ? row.slice() : row; }),
      address: pack.address || '',
      savedModelSpec: pack.savedModelSpec || null,
      savedSpec: pack.savedSpec || null,
      values: pack.values || null,
      lockedMethod: pack.lockedMethod
    };
    if (copy.values) copy.values = copy.values.map(function (row) { return row.slice(); });
    return copy;
  }

  function wrapApply(kind) {
    var name = APPLY_NAME[kind];
    if (!name || typeof root[name] !== 'function' || root[name].__demoWrapped) return;
    var orig = root[name];
    function wrapped(pack) {
      if (pack && !isDemoAddress(pack.address)) pageDraft = clonePack(pack);
      return orig(pack);
    }
    wrapped.__demoWrapped = true;
    wrapped.__orig = orig;
    root[name] = wrapped;
  }

  var autostarted = {};

  function realDialogUi() {
    try {
      var ui = root.Office && Office.context && Office.context.ui;
      if (!ui || typeof ui.messageParent !== 'function' || typeof ui.addHandlerAsync !== 'function') return false;
      if (ui.messageParent.__demoStub || ui.addHandlerAsync.__demoStub) return false;
      var parent = ui.messageParent.__demoCarrier ? ui.messageParent.__orig : ui.messageParent;
      if (parent && parent.__demoStub) return false;
      return true;
    } catch (_e) {
      return false;
    }
  }

  function inOfficeDialog() {
    return realDialogUi();
  }

  function setStatus(text, isError) {
    if (!statusNode) return;
    statusNode.textContent = text || '';
    statusNode.classList.toggle('is-error', !!isError);
  }

  function showReturn(on) {
    if (!returnNode) return;
    returnNode.hidden = !on;
  }

  function runDemo(kind) {
    if (!ROUTES[kind]) return;
    if (!realDialogUi()) ensureDialogStubs();
    var serial = ++loadSerial;
    if (demoButton) {
      demoButton.disabled = true;
      demoButton.setAttribute('aria-busy', 'true');
    }
    setStatus('Loading demo data…', false);
    root.setTimeout(function () {
      if (serial !== loadSerial) return;
      try {
        var pack = build(kind);
        if (!pack || !pack.headers) throw new Error('missing fixture');
        remember(pack);
        ROUTES[kind](pack);
        if (serial !== loadSerial) return;
        setStatus(pack.address, false);
        showReturn(true);
      } catch (err) {
        console.error(err);
        if (serial !== loadSerial) return;
        setStatus('Couldn’t load demo data. Try again.', true);
      }
      if (demoButton) {
        demoButton.disabled = false;
        demoButton.removeAttribute('aria-busy');
      }
    }, 0);
  }

  function restoreDraft(kind) {
    var serial = ++loadSerial;
    root.__statisticoDemoLock = false;
    root.__statisticoDemo = null;
    var prior = kind === 'publication' ? (root.__statisticoPublicationUser || null) : pageDraft;
    var empty = { headers: [], rows: [], address: '', savedModelSpec: null, savedSpec: null, values: [[]] };
    var payload = prior ? clonePack(prior) : empty;
    try {
      var name = APPLY_NAME[kind];
      var fn = name && root[name];
      if (kind === 'publication' && root.StatisticoPublicationDemo) root.StatisticoPublicationDemo.load(payload);
      else if (fn && fn.__orig) fn.__orig(payload);
      else if (ROUTES[kind]) ROUTES[kind](payload);
    } catch (err) {
      console.error(err);
      setStatus('Couldn’t load demo data. Try again.', true);
      return;
    }
    if (serial !== loadSerial) return;
    setStatus(prior && prior.address ? prior.address : '', false);
    showReturn(false);
  }

  // Browser and website opens have Office.js but no dialog parent, so the
  // setup would sit on "Loading data…" forever. Open the demo once the host
  // is known. Inside an Excel dialog, wait for the worksheet payload.
  function autostart(kind) {
    if (!ROUTES[kind] || autostarted[kind]) return;
    autostarted[kind] = true;
    function go() {
      if (inOfficeDialog() || root.__statisticoDemoLock) return;
      try { runDemo(kind); }
      catch (err) { console.error(err); }
    }
    function arm() {
      if (typeof root.Office === 'undefined' || typeof Office.onReady !== 'function') {
        go();
        return;
      }
      try {
        Office.onReady(function (info) {
          noteHost(info);
          go();
        });
      } catch (_e) { go(); }
    }
    setTimeout(arm, 0);
  }

  function mount(kind) {
    function place() {
      try { injectStyles(); } catch (_style) {}
      try { installCarrier(); } catch (_carrier) {}
      try { wrapApply(kind); } catch (_wrap) {}
      var title = document.querySelector('.cfg-header-title') || document.querySelector('.pt2-uni-module');
      if (!title || !title.parentNode) return;
      ['use-selection', 'pick-range', 'refresh-data'].forEach(function (id) {
        var extra = document.getElementById(id);
        if (extra && extra.parentNode) extra.parentNode.removeChild(extra);
      });
      var row = document.getElementById('statistico-demo-row');
      if (!row) {
        row = document.createElement('div');
        row.id = 'statistico-demo-row';
      }
      var existing = document.getElementById('use-demo');
      var btn = existing || document.createElement('button');
      btn.type = 'button';
      btn.id = 'use-demo';
      btn.className = 'cfg-demo-btn';
      btn.textContent = 'Load demo data';
      btn.title = 'Load a fixed sample shipped with this module. It does not read the cells selected in Excel.';
      demoButton = btn;
      if (!returnNode) {
        returnNode = document.createElement('button');
        returnNode.type = 'button';
        returnNode.id = 'statistico-demo-return';
        returnNode.className = 'cfg-demo-btn';
        returnNode.textContent = 'Return to my data';
        returnNode.hidden = true;
      }
      if (!statusNode) {
        statusNode = document.createElement('span');
        statusNode.id = 'statistico-demo-status';
        statusNode.className = 'statistico-demo-status';
      }
      row.appendChild(btn);
      row.appendChild(returnNode);
      row.appendChild(statusNode);
      var header = title.closest ? title.closest('.cfg-header') : null;
      if (header && header.parentNode) {
        if (row.parentNode !== header.parentNode || row.previousElementSibling !== header) {
          header.parentNode.insertBefore(row, header.nextSibling);
        }
      } else if (row.parentNode !== title.parentNode) {
        title.parentNode.insertBefore(row, title.nextSibling);
      }
      var wrap = document.querySelector('.ps-data-actions');
      if (wrap && wrap.parentNode && !wrap.querySelector('button')) wrap.parentNode.removeChild(wrap);
      if (!ROUTES[kind]) return;
      if (!btn.__demoBound) {
        btn.__demoBound = true;
        btn.addEventListener('click', function () { runDemo(kind); });
      }
      if (!returnNode.__demoBound) {
        returnNode.__demoBound = true;
        returnNode.addEventListener('click', function () { restoreDraft(kind); });
      }
      if (kind === 'segmentation' && !/(?:^|[?&])product=split(?:&|$)/i.test(root.location && root.location.search || '')) {
        btn.hidden = true;
        returnNode.hidden = true;
        return;
      }
      autostart(kind);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
    else place();
  }

  root.StatisticoDemo = {
    deliver: deliver,
    pack: function (kind) {
      var fromZip = build(kind);
      if (!fromZip || !fromZip.headers) throw new Error('No demo fixture for ' + kind);
      return fromZip;
    },
    table: table,
    mount: mount,
    remember: remember,
    longTable: longTable,
    build: build
  };
})(window);
