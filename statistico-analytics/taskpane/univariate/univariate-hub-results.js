/* global Office, DIALOG_SIZES, HubResultsBridge, StatisticoDialogHost, buildUnivariateDialogPayload */
(function (global) {
  'use strict';

  var pendingViewUrl = null;
  var currentResults = null;
  var resultsDialog = null;

  function getDialogsBaseUrl() {
    var href = global.location.href;
    if (href.indexOf('/taskpane/') >= 0) return href.split('/taskpane/')[0] + '/dialogs/views/';
    return global.location.origin + '/dialogs/views/';
  }

  function loadStoredResults() {
    var raw = null;
    try { raw = global.sessionStorage.getItem('univariateHubRunData'); } catch (_e) {}
    if (!raw) {
      try { raw = global.localStorage.getItem('univariateRunResultPayload'); } catch (_e2) {}
    }
    if (!raw) return null;
    try {
      var payload = JSON.parse(raw);
      if (payload && payload.data) return payload.data;
    } catch (_e3) {}
    return null;
  }

  function buildPayload(results) {
    if (typeof global.buildUnivariateDialogPayload === 'function') {
      return global.buildUnivariateDialogPayload(results);
    }
    return {
      values: results.rawData || results.values,
      column: results.column,
      descriptive: results.descriptive,
      n: results.n,
      columnIndex: results.columnIndex,
      transform: results.transform,
      trim: results.trim,
      dataSource: results.dataSource,
      sourceHeaders: results.sourceHeaders,
      sourceRows: results.sourceRows
    };
  }

  function queueViewSwitch(viewPath) {
    pendingViewUrl = getDialogsBaseUrl() + viewPath;
    if (resultsDialog) {
      try { resultsDialog.close(); } catch (_e) {}
      return;
    }
    if (pendingViewUrl && currentResults) {
      var target = pendingViewUrl;
      pendingViewUrl = null;
      openResultsAt(target, currentResults);
    }
  }

  function openResultsAt(dialogUrl, results) {
    currentResults = results;
    global.Office.context.ui.displayDialogAsync(dialogUrl, global.DIALOG_SIZES.RESULTS_HUB, function (res) {
      if (res.status !== global.Office.AsyncResultStatus.Succeeded) return;
      var dialog = res.value;
      resultsDialog = dialog;
      if (global.HubResultsBridge) global.HubResultsBridge.registerDialog(dialog);

      function sendData() {
        if (!dialog) return;
        dialog.messageChild(JSON.stringify({
          action: 'loadData',
          data: buildPayload(results)
        }));
      }

      global.setTimeout(sendData, 1000);

      dialog.addEventHandler(global.Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var message = JSON.parse(arg.message || '{}');
          if (message.status === 'ready') {
            sendData();
          } else if (message.action === 'switchView') {
            if (dialog !== resultsDialog) return;
            queueViewSwitch(message.view);
          } else if (message.action === 'close' || message.action === 'closeDialog') {
            pendingViewUrl = null;
            if (dialog === resultsDialog) {
              if (global.StatisticoDialogHost) {
                global.StatisticoDialogHost.closeFromMessage(dialog, function () { resultsDialog = null; });
              } else {
                dialog.close();
                resultsDialog = null;
              }
            }
          }
        } catch (_e2) {}
      });

      dialog.addEventHandler(global.Office.EventType.DialogEventReceived, function () {
        if (dialog === resultsDialog) resultsDialog = null;
        if (global.StatisticoDialogHost) global.StatisticoDialogHost.releaseTaskpaneAfterDialog();
        if (pendingViewUrl && !resultsDialog && currentResults) {
          var next = pendingViewUrl;
          pendingViewUrl = null;
          global.setTimeout(function () { openResultsAt(next, currentResults); }, 120);
        }
      });
    });
  }

  function resolveUnivariateStartViewPath() {
    var startPath = 'univariate/histogram-standalone-v2.html';
    try {
      var specRaw = global.sessionStorage.getItem('univariateModelSpec');
      if (specRaw) {
        var spec = JSON.parse(specRaw);
        if (spec && spec.startView) startPath = spec.startView;
      }
    } catch (_e) {}
    return startPath;
  }

  function openUnivariateResultsFromHub() {
    var results = loadStoredResults();
    if (!results) return false;
    try { global.sessionStorage.removeItem('univariateHubRunData'); } catch (_e) {}
    openResultsAt(getDialogsBaseUrl() + resolveUnivariateStartViewPath() + '?cb=' + Date.now(), results);
    return true;
  }

  global.StatisticoHubResults = global.StatisticoHubResults || {};
  global.StatisticoHubResults.univariate = openUnivariateResultsFromHub;
})(window);
