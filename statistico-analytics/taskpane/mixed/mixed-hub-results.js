/* global Office, DIALOG_SIZES, HubResultsBridge, StatisticoGlobalRange */
(function (global) {
  'use strict';

  function getDialogsBaseUrl() {
    var href = global.location.href;
    if (href.indexOf('/taskpane/') >= 0) return href.split('/taskpane/')[0] + '/dialogs/views/';
    return global.location.origin + '/dialogs/views/';
  }

  function openMixedResultsFromHub() {
    var gr = global.StatisticoGlobalRange && global.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    var modelSpec = {};
    try { modelSpec = JSON.parse(global.sessionStorage.getItem('mixedModelSpec') || '{}'); } catch (_e) {}

    var url = getDialogsBaseUrl() + 'mixed/mixed-results.html?cb=' + Date.now();
    global.Office.context.ui.displayDialogAsync(url, global.DIALOG_SIZES.RESULTS, function (res) {
      if (res.status !== global.Office.AsyncResultStatus.Succeeded) return;
      var dlg = res.value;
      if (global.HubResultsBridge) global.HubResultsBridge.registerDialog(dlg);

      function sendMixedResults() {
        if (!dlg) return;
        var rows = gr.values.slice(1);
        var sample = modelSpec && modelSpec.sample;
        if (sample && sample.mode === 'sample' && sample.n > 0 && rows.length > sample.n &&
            global.StatisticoGlobalRange && typeof global.StatisticoGlobalRange.drawSampleRows === 'function') {
          rows = global.StatisticoGlobalRange.drawSampleRows(rows, sample.n, sample.seed);
        }
        dlg.messageChild(JSON.stringify({
          type: 'MIXED_RESULTS',
          payload: {
            headers: gr.values[0] || [],
            rows: rows,
            address: gr.address || '',
            modelSpec: modelSpec
          }
        }));
      }

      dlg.addEventHandler(global.Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || '{}');
          if (msg.action === 'ready' || msg.action === 'mixedModelDashboardReady' || msg.action === 'requestData') {
            sendMixedResults();
          } else if (msg.action === 'close') {
            if (global.StatisticoDialogHost) {
              global.StatisticoDialogHost.closeFromMessage(dlg, function () { dlg = null; });
            } else {
              dlg.close();
            }
          }
        } catch (_e2) {}
      });
      global.setTimeout(sendMixedResults, 1200);
    });
    return true;
  }

  global.StatisticoHubResults = global.StatisticoHubResults || {};
  global.StatisticoHubResults.mixed = openMixedResultsFromHub;
})(window);
