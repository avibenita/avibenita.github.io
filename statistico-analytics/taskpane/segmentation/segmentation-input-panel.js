/* global Office, DIALOG_SIZES, HubResultsBridge, StatisticoDialogHost, StatisticoGlobalRange, StatisticoSegmentation, StatisticoSegmentationSample */

function getSegmentationRangeValues() {
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

function getSegmentationDialogsBaseUrl() {
  if (typeof getDialogsBaseUrl === 'function') return getDialogsBaseUrl();
  var href = window.location.href;
  if (href.indexOf('/taskpane/') >= 0) return href.split('/taskpane/')[0] + '/dialogs/views/';
  return window.location.origin + '/dialogs/views/';
}

function unwrapSegmentationSpec(msg) {
  if (!msg) return {};
  var data = msg.payload || msg.data || msg;
  if (data && data.spec) return data.spec;
  return data || {};
}

function loadSegScript(file, flag, cb) {
  if (window[flag]) { cb(); return; }
  var s = document.createElement('script');
  s.src = getSegmentationDialogsBaseUrl() + 'segmentation/' + file + '?v=' + Date.now();
  s.onload = function () { cb(); };
  s.onerror = function () { alert('Could not load ' + file + '.'); };
  document.head.appendChild(s);
}

function ensureSegmentationEngine(cb) {
  loadSegScript('segmentation-engine.js', 'StatisticoSegmentation', function () {
    loadSegScript('segmentation-split-index.js', 'StatisticoSegmentationSplitIndex', function () {
      loadSegScript('segmentation-sample-data.js', 'StatisticoSegmentationSample', cb);
    });
  });
}

function buildSegmentationBundle(headers, rows, spec) {
  if (!window.StatisticoSegmentation) return { error: 'Segmentation engine is not loaded.', analyzable: false };
  return StatisticoSegmentation.analyze(headers, rows, spec || {});
}

var segmentationDialog = null;
var segmentationResultsDialog = null;

function openSegmentationBuilder() {
  var url = getSegmentationDialogsBaseUrl() + 'segmentation/segmentation-input.html?v=' + Date.now();
  Office.context.ui.displayDialogAsync(url, DIALOG_SIZES.REGRESSION_BUILDER, function (result) {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error('Failed to open segmentation builder:', result.error && result.error.message);
      return;
    }
    segmentationDialog = result.value;
    segmentationDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      var msg = JSON.parse(arg.message || '{}');
      if (msg.action === 'requestData' || msg.action === 'ready') {
        sendSegmentationDialogData();
      } else if (msg.action === 'segmentationModel') {
        handleSegmentationModel(unwrapSegmentationSpec(msg));
        try { segmentationDialog.close(); } catch (_e) {}
        segmentationDialog = null;
      } else if (msg.action === 'close' || msg.action === 'cancel') {
        try { segmentationDialog.close(); } catch (_e2) {}
        segmentationDialog = null;
      }
    });
    segmentationDialog.addEventHandler(Office.EventType.DialogEventReceived, function (arg) {
      if (arg.error === 12006) segmentationDialog = null;
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function sendSegmentationDialogData() {
  if (!segmentationDialog) return;
  var range = getSegmentationRangeValues();
  if (!range) return;
  segmentationDialog.messageChild(JSON.stringify({
    type: 'SEGMENTATION_DATA',
    payload: {
      headers: range.values[0],
      rows: range.values.slice(1),
      address: range.address,
      savedSpec: null
    }
  }));
}

function handleSegmentationModel(spec) {
  sessionStorage.setItem('segmentationModelSpec', JSON.stringify(spec || {}));
  var range = getSegmentationRangeValues();
  if (!range) return;
  var headers = range.values[0];
  var rows = range.values.slice(1);
  try { sessionStorage.setItem('segmentationSource', JSON.stringify({ headers: headers, rows: rows })); } catch (_e) {}
  ensureSegmentationEngine(function () {
    var bundle = buildSegmentationBundle(headers, rows, spec);
    bundle.source = { headers: headers, rows: rows };
    openSegmentationResultsDialog(bundle);
  });
}

function slimSegmentationBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') return bundle;
  var slim = Object.assign({}, bundle);
  delete slim.respondents;
  return slim;
}

function openSegmentationResultsDialog(bundle) {
  sessionStorage.setItem('segmentationBundle', JSON.stringify(slimSegmentationBundle(bundle)));
  var url = getSegmentationDialogsBaseUrl() + 'segmentation/segmentation-results.html?v=' + Date.now();
  Office.context.ui.displayDialogAsync(url, DIALOG_SIZES.RESULTS, function (result) {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error('Failed to open segmentation results:', result.error && result.error.message);
      return;
    }
    segmentationResultsDialog = result.value;
    if (window.HubResultsBridge) HubResultsBridge.registerDialog(segmentationResultsDialog);
    segmentationResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      var msg = JSON.parse(arg.message || '{}');
      if (msg.action === 'ready' || msg.action === 'requestData') {
        sendSegmentationBundle();
      } else if (msg.action === 'close' || msg.action === 'closeDialog') {
        try { segmentationResultsDialog.close(); } catch (_e) {}
        segmentationResultsDialog = null;
        if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
      }
    });
    segmentationResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, function (arg) {
      if (arg.error === 12006) segmentationResultsDialog = null;
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function sendSegmentationBundle() {
  if (!segmentationResultsDialog) return;
  var bundleStr = sessionStorage.getItem('segmentationBundle');
  if (!bundleStr) return;
  var payload = null;
  try { payload = JSON.parse(bundleStr); } catch (_e) { return; }
  try {
    segmentationResultsDialog.messageChild(JSON.stringify({
      type: 'SEGMENTATION_BUNDLE',
      payload: payload
    }));
  } catch (_e2) {}
}

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    var gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})('segmentation', function (gr) {
  var spec = {};
  try { spec = JSON.parse(sessionStorage.getItem('segmentationModelSpec') || '{}'); } catch (_e) {}
  var headers = gr.values[0];
  var rows = gr.values.slice(1);
  try { sessionStorage.setItem('segmentationSource', JSON.stringify({ headers: headers, rows: rows })); } catch (_e2) {}
  ensureSegmentationEngine(function () {
    var bundle = buildSegmentationBundle(headers, rows, spec);
    bundle.source = { headers: headers, rows: rows };
    openSegmentationResultsDialog(bundle);
  });
  return true;
});

window.StatisticoHubResults = window.StatisticoHubResults || {};
window.StatisticoHubResults['survey-segmentation'] = window.StatisticoHubResults.segmentation;
