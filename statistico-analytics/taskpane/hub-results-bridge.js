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
    logistic: ['logistic/logistic-input-panel.js'],
    'meta-analysis': ['meta-analysis/meta-analysis-input-panel.js'],
    cluster: ['cluster/cluster-config.js', 'cluster/cluster-input-panel.js'],
    mixed: ['mixed/mixed-hub-results.js']
  };

  var CACHE_BUST = 'v=20260530';
  var loaded = {};
  var loading = {};
  var activeDialog = null;

  function getDialogsBaseUrl() {
    var href = global.location.href;
    if (href.indexOf('/taskpane/') >= 0) return href.split('/taskpane/')[0] + '/dialogs/views/';
    return global.location.origin + '/dialogs/views/';
  }

  function registerDialog(dialog) {
    activeDialog = dialog || null;
    if (dialog && global.StatisticoDialogHost) {
      global.StatisticoDialogHost.onUserClosed(dialog, function () {
        if (activeDialog === dialog) activeDialog = null;
      });
    }
  }

  function dismissAll() {
    if (activeDialog) {
      try { activeDialog.close(); } catch (_e) {}
      activeDialog = null;
    }
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
    if (key === 'pareto') return cb(null);
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

  function openParetoResultsFromHub() {
    var raw;
    try { raw = global.sessionStorage.getItem('paretoHubRunData'); } catch (_e) {}
    if (!raw) return false;
    var runData;
    try {
      runData = JSON.parse(raw);
      global.sessionStorage.removeItem('paretoHubRunData');
    } catch (_e2) {
      return false;
    }
    if (!global.Office || !global.Office.context || !global.Office.context.ui) return false;
    var url = getDialogsBaseUrl() + 'pareto/pareto-results.html?' + CACHE_BUST;
    global.Office.context.ui.displayDialogAsync(url, global.DIALOG_SIZES.RESULTS, function (res) {
      if (res.status !== global.Office.AsyncResultStatus.Succeeded) return;
      var dlg = res.value;
      registerDialog(dlg);
      dlg.addEventHandler(global.Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || '{}');
          if (msg.action === 'ready') {
            dlg.messageChild(JSON.stringify({ type: 'PARETO_RUN_DATA', payload: runData }));
          }
        } catch (_e3) {}
      });
    });
    return true;
  }

  function open(key, delayMs) {
    delayMs = typeof delayMs === 'number' ? delayMs : 500;
    global.setTimeout(function () {
      if (key === 'pareto') {
        openParetoResultsFromHub();
        return;
      }
      ensurePanel(key, function () {
        var runner = global.StatisticoHubResults && global.StatisticoHubResults[key];
        if (typeof runner === 'function') runner();
      });
    }, delayMs);
  }

  global.HubResultsBridge = {
    open: open,
    registerDialog: registerDialog,
    dismissAll: dismissAll,
    hasActive: hasActive
  };
})(window);
