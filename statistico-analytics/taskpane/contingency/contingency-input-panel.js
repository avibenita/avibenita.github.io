/* global Office, DIALOG_SIZES, HubResultsBridge, StatisticoDialogHost, StatisticoGlobalRange, StatisticoContingency */

function getContingencyRangeValues() {
  if (window.StatisticoGlobalRange) {
    var gr = StatisticoGlobalRange.load();
    if (gr && gr.values && gr.values.length >= 2) {
      return { values: gr.values, address: gr.address || '' };
    }
  }
  if (window.dataInputPanelInstance && window.dataInputPanelInstance.values && window.dataInputPanelInstance.values.length >= 2) {
    return { values: window.dataInputPanelInstance.values, address: window.dataInputPanelInstance.address || '' };
  }
  return null;
}

function getContingencyDialogsBaseUrl() {
  if (typeof getDialogsBaseUrl === 'function') return getDialogsBaseUrl();
  var href = window.location.href;
  if (href.indexOf('/taskpane/') >= 0) return href.split('/taskpane/')[0] + '/dialogs/views/';
  return window.location.origin + '/dialogs/views/';
}

function unwrapContingencySpec(msg) {
  if (!msg) return {};
  var data = msg.payload || msg.data || msg;
  if (data && data.spec) return data.spec;
  return data || {};
}

function ensureContingencyEngine(cb) {
  if (window.StatisticoContingency) { cb(); return; }
  var s = document.createElement('script');
  s.src = getContingencyDialogsBaseUrl() + 'contingency/contingency-engine.js?v=' + Date.now();
  s.onload = function () { cb(); };
  s.onerror = function () { alert('Could not load the contingency engine.'); };
  document.head.appendChild(s);
}

function buildContingencyBundle(headers, rows, spec) {
  if (!window.StatisticoContingency) return { error: 'Contingency engine is not loaded.', analyzable: false };
  return StatisticoContingency.analyze(headers, rows, spec || {});
}

var contingencyDialog = null;
var contingencyResultsDialog = null;

function openContingencyBuilder() {
  var url = getContingencyDialogsBaseUrl() + 'contingency/contingency-input.html?v=' + Date.now();
  Office.context.ui.displayDialogAsync(url, DIALOG_SIZES.REGRESSION_BUILDER, function (result) {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error('Failed to open contingency builder:', result.error && result.error.message);
      return;
    }
    contingencyDialog = result.value;
    contingencyDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      var msg = JSON.parse(arg.message || '{}');
      if (msg.action === 'requestData' || msg.action === 'ready') {
        sendContingencyDialogData();
      } else if (msg.action === 'contingencyModel') {
        handleContingencyModel(unwrapContingencySpec(msg));
        try { contingencyDialog.close(); } catch (_e) {}
        contingencyDialog = null;
      } else if (msg.action === 'close' || msg.action === 'cancel') {
        try { contingencyDialog.close(); } catch (_e2) {}
        contingencyDialog = null;
      }
    });
    contingencyDialog.addEventHandler(Office.EventType.DialogEventReceived, function (arg) {
      if (arg.error === 12006) contingencyDialog = null;
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function sendContingencyDialogData() {
  if (!contingencyDialog) return;
  var range = getContingencyRangeValues();
  if (!range) return;
  contingencyDialog.messageChild(JSON.stringify({
    type: 'CONTINGENCY_DATA',
    payload: {
      headers: range.values[0],
      rows: range.values.slice(1),
      address: range.address,
      savedSpec: null
    }
  }));
}

function handleContingencyModel(spec) {
  sessionStorage.setItem('contingencyModelSpec', JSON.stringify(spec || {}));
  var range = getContingencyRangeValues();
  if (!range) return;
  var headers = range.values[0];
  var rows = range.values.slice(1);
  try { sessionStorage.setItem('contingencySource', JSON.stringify({ headers: headers, rows: rows })); } catch (_e) {}
  ensureContingencyEngine(function () {
    var bundle = buildContingencyBundle(headers, rows, spec);
    bundle.source = { headers: headers, rows: rows };
    openContingencyResultsDialog(bundle);
  });
}

function openContingencyResultsDialog(bundle) {
  sessionStorage.setItem('contingencyBundle', JSON.stringify(bundle));
  var url = getContingencyDialogsBaseUrl() + 'contingency/contingency-results.html?v=' + Date.now();
  Office.context.ui.displayDialogAsync(url, DIALOG_SIZES.RESULTS, function (result) {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error('Failed to open contingency results:', result.error && result.error.message);
      return;
    }
    contingencyResultsDialog = result.value;
    if (window.HubResultsBridge) HubResultsBridge.registerDialog(contingencyResultsDialog);
    contingencyResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      var msg = JSON.parse(arg.message || '{}');
      if (msg.action === 'ready' || msg.action === 'requestData') {
        sendContingencyBundle();
      } else if (msg.action === 'close' || msg.action === 'closeDialog') {
        try { contingencyResultsDialog.close(); } catch (_e) {}
        contingencyResultsDialog = null;
        if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
      }
    });
    contingencyResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, function (arg) {
      if (arg.error === 12006) contingencyResultsDialog = null;
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function sendContingencyBundle() {
  if (!contingencyResultsDialog) return;
  var bundleStr = sessionStorage.getItem('contingencyBundle');
  if (!bundleStr) return;
  var payload = null;
  try { payload = JSON.parse(bundleStr); } catch (_e) { return; }
  contingencyResultsDialog.messageChild(JSON.stringify({ type: 'CONTINGENCY_BUNDLE', payload: payload }));
}

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    var gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})('contingency', function (gr) {
  var spec = {};
  try { spec = JSON.parse(sessionStorage.getItem('contingencyModelSpec') || '{}'); } catch (_e) {}
  var headers = gr.values[0];
  var rows = gr.values.slice(1);
  try { sessionStorage.setItem('contingencySource', JSON.stringify({ headers: headers, rows: rows })); } catch (_e2) {}
  ensureContingencyEngine(function () {
    var bundle = buildContingencyBundle(headers, rows, spec);
    bundle.source = { headers: headers, rows: rows };
    openContingencyResultsDialog(bundle);
  });
  return true;
});
