/**
 * Load module result runners on the hub and open results dialogs in-place
 * (no navigation to module launcher pages).
 */
(function (global) {
  'use strict';

  var PANEL_SCRIPTS = {
    univariate: ['univariate/univariate-hub-results.js'],
    anova: ['anova/anova-input-panel.js'],
    independent: ['independent/independent-input-panel.js'],
    dependent: ['dependent/dependent-input-panel.js'],
    factor: ['factor/factor-input-panel.js'],
    pca: ['pca/pca-input-panel.js'],
    reliability: [
      '../dialogs/views/reliability/reliability-engine.js',
      'reliability/reliability-input-panel.js'
    ],
    logistic: ['logistic/logistic-input-panel.js'],
    contingency: ['contingency/contingency-input-panel.js'],
    'meta-analysis': ['meta-analysis/meta-analysis-input-panel.js'],
    cluster: ['cluster/cluster-config.js', 'cluster/cluster-input-panel.js'],
    kmeans: ['cluster/cluster-config.js', 'cluster/cluster-input-panel.js'],
    hierarchical: ['cluster/cluster-config.js', 'cluster/cluster-input-panel.js'],
    mixed: ['mixed/mixed-hub-results.js'],
    pareto2080: ['pareto/pareto-input-panel.js'],
    pareto: ['pareto/pareto-input-panel.js'],
    multivariable: ['multivariable/mv-sample-data.js', 'multivariable/mv-input-panel.js'],
    segmentation: ['segmentation/segmentation-input-panel.js'],
    'survey-segmentation': ['segmentation/segmentation-input-panel.js'],
    'prepare-quality': ['prepare/prepare-intent.js', 'prepare/prepare-input-panel-v12.js'],
    'prepare-dataset': ['prepare/prepare-intent.js', 'prepare/prepare-input-panel-v12.js']
  };

  /* Timestamp buster: Office webviews cache ?v= URLs too aggressively across deploys. */
  var CACHE_BUST = 'live=' + Date.now();
  var loaded = {};
  var loading = {};
  var activeDialog = null;
  var activeModuleKey = null;

  function getDialogsBaseUrl() {
    var href = global.location.href;
    if (href.indexOf('/taskpane/') >= 0) return href.split('/taskpane/')[0] + '/dialogs/views/';
    return global.location.origin + '/dialogs/views/';
  }

  function clearModuleSelection(moduleKey) {
    if (!moduleKey) return;
    if (typeof global.setSelectedModuleCard === 'function') {
      try { global.setSelectedModuleCard(moduleKey, false); } catch (_e) {}
    }
  }

  function registerDialog(dialog) {
    activeDialog = dialog || null;
    var moduleKey = activeModuleKey;
    if (dialog && global.StatisticoDialogHost) {
      global.StatisticoDialogHost.onUserClosed(dialog, function () {
        if (activeDialog === dialog) activeDialog = null;
        clearModuleSelection(moduleKey);
        if (activeModuleKey === moduleKey) activeModuleKey = null;
      });
    }
  }

  function dismissAll() {
    if (activeDialog) {
      try { activeDialog.close(); } catch (_e) {}
      activeDialog = null;
    }
    clearModuleSelection(activeModuleKey);
    activeModuleKey = null;
  }

  function hasActive() {
    return !!activeDialog;
  }

  function loadScript(path, cb) {
    var s = global.document.createElement('script');
    s.src = './' + path + (path.indexOf('?') >= 0 ? '' : '?' + CACHE_BUST);
    s.onload = function () { cb(null); };
    s.onerror = function () { cb(new Error('Failed to load ' + path)); };
    global.document.head.appendChild(s);
  }

  function loadPanelScripts(key, cb) {
    var paths = PANEL_SCRIPTS[key];
    if (!paths || !paths.length) return cb(null);
    var i = 0;
    function next(err) {
      if (err) return cb(err);
      if (i >= paths.length) return cb(null);
      loadScript(paths[i++], next);
    }
    next(null);
  }

  function ensurePanel(key, cb) {
    if (loaded[key]) return cb(null);
    if (loading[key]) {
      var wait = global.setInterval(function () {
        if (loaded[key]) {
          global.clearInterval(wait);
          cb(null);
        }
      }, 40);
      return;
    }
    loading[key] = true;
    loadPanelScripts(key, function (err) {
      loading[key] = false;
      if (!err) loaded[key] = true;
      cb(err);
    });
  }

  function open(key, delayMs) {
    delayMs = typeof delayMs === 'number' ? delayMs : 500;
    activeModuleKey = key || null;
    global.setTimeout(function () {
      ensurePanel(key, function (err) {
        if (err) {
          clearModuleSelection(key);
          if (activeModuleKey === key) activeModuleKey = null;
          return;
        }
        var runner = global.StatisticoHubResults && global.StatisticoHubResults[key];
        if (typeof runner !== 'function') {
          clearModuleSelection(key);
          if (activeModuleKey === key) activeModuleKey = null;
          return;
        }
        var opened = false;
        try { opened = runner() !== false; } catch (_e) { opened = false; }
        if (!opened) {
          clearModuleSelection(key);
          if (activeModuleKey === key) activeModuleKey = null;
        }
      });
    }, delayMs);
  }

  global.HubResultsBridge = {
    open: open,
    ensureLoaded: ensurePanel,
    registerDialog: registerDialog,
    dismissAll: dismissAll,
    hasActive: hasActive
  };
})(window);
