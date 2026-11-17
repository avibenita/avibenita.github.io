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
    return { headers: headers, rows: rows, address: 'Demo data' };
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
    return { headers: headers, rows: rows, address: 'Demo data' };
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
    return { headers: headers, rows: rows, address: 'Demo data' };
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
    return { headers: headers, rows: rows, address: 'Demo data' };
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
    return { headers: headers, rows: rows, address: 'Demo data' };
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

  function injectStyles() {
    if (document.getElementById('statistico-demo-style')) return;
    var style = document.createElement('style');
    style.id = 'statistico-demo-style';
    style.textContent = [
      '.cfg-header-title{flex:0 1 auto;}',
      '.cfg-demo-btn{margin-left:8px;flex:0 0 auto;border:1px solid rgba(255,255,255,.45);background:#fff;color:#1e293b;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:650;cursor:pointer;white-space:nowrap;font-family:inherit;line-height:1.2;}',
      '.cfg-demo-btn:hover{background:#f8fafc;}',
      '.cfg-meta-badge{margin-left:auto;}'
    ].join('');
    document.head.appendChild(style);
  }

  function isSheetPayload(message) {
    try {
      var msg = JSON.parse(message || '{}');
      var body = msg.payload || msg.data;
      return !!(body && body.headers && String(body.address || '').indexOf('Demo') !== 0);
    } catch (_e) {
      return false;
    }
  }

  function ensureDialogStubs() {
    try {
      if (!root.Office || !Office.context) return;
      if (!Office.context.ui) Office.context.ui = {};
      var ui = Office.context.ui;
      if (typeof ui.messageParent !== 'function') {
        function stub() {}
        stub.__demoStub = true;
        ui.messageParent = stub;
      }
      if (typeof ui.addHandlerAsync !== 'function') {
        function addStub(_type, _handler, callback) {
          if (typeof callback === 'function') callback({ status: 'succeeded' });
        }
        addStub.__demoStub = true;
        ui.addHandlerAsync = addStub;
      }
    } catch (_e) {}
  }

  function installCarrier() {
    function arm() {
      if (!root.Office || !Office.context) return;
      if (!inOfficeDialog()) ensureDialogStubs();
      var ui = Office.context.ui;
      if (!ui || (ui.messageParent && ui.messageParent.__demoStub)) return;
      if (typeof ui.addHandlerAsync === 'function' && !ui.addHandlerAsync.__demoGuard) {
        var origAdd = ui.addHandlerAsync.bind(ui);
        ui.addHandlerAsync = function (type, handler, callback) {
          var guarded = function (arg) {
            if (root.__statisticoDemoLock && type === Office.EventType.DialogParentMessageReceived && isSheetPayload(arg && arg.message)) return;
            return handler(arg);
          };
          return origAdd(type, guarded, callback);
        };
        ui.addHandlerAsync.__demoGuard = true;
      }
      if (typeof ui.messageParent !== 'function' || ui.messageParent.__demoCarrier) return;
      var orig = ui.messageParent.bind(ui);
      function wrapped(message) {
        try {
          if (root.__statisticoDemo) {
            var parsed = JSON.parse(message);
            if (parsed && parsed.action && parsed.action !== 'ready' && parsed.action !== 'requestData' && parsed.action !== 'close') {
              parsed.demo = root.__statisticoDemo;
              message = JSON.stringify(parsed);
            }
          }
        } catch (_e2) {}
        return orig(message);
      }
      wrapped.__demoCarrier = true;
      wrapped.__orig = orig;
      ui.messageParent = wrapped;
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
      address: pack.address || 'Demo data'
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
    mixed: function (pack) { root.loadMixedModelData(pack); }
  };

  var autostarted = {};

  function inOfficeDialog() {
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

  function runDemo(kind) {
    ensureDialogStubs();
    var pack = StatisticoDemo.pack(kind);
    remember(pack);
    ROUTES[kind](pack);
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
      try { Office.onReady(go); }
      catch (_e) { go(); }
    }
    setTimeout(arm, 0);
  }

  function mount(kind) {
    function place() {
      injectStyles();
      installCarrier();
      var title = document.querySelector('.cfg-header-title');
      if (!title || !title.parentNode) return;
      ['use-selection', 'pick-range', 'refresh-data'].forEach(function (id) {
        var extra = document.getElementById(id);
        if (extra && extra.parentNode) extra.parentNode.removeChild(extra);
      });
      var existing = document.getElementById('use-demo');
      var btn = existing || document.createElement('button');
      btn.type = 'button';
      btn.id = 'use-demo';
      btn.className = 'cfg-demo-btn';
      btn.textContent = 'Use demo data';
      if (btn.parentNode !== title.parentNode || btn.previousSibling !== title) {
        title.parentNode.insertBefore(btn, title.nextSibling);
      }
      var wrap = document.querySelector('.ps-data-actions');
      if (wrap && wrap.parentNode && !wrap.querySelector('button')) wrap.parentNode.removeChild(wrap);
      if (!ROUTES[kind]) return;
      if (!btn.__demoBound) {
        btn.__demoBound = true;
        btn.addEventListener('click', function () {
          runDemo(kind);
        });
      }
      autostart(kind);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
    else place();
  }

  root.StatisticoDemo = {
    pack: pack,
    mount: mount,
    remember: remember,
    longTable: longTable
  };
})(window);
