/* global Office, DIALOG_SIZES, HubResultsBridge, StatisticoDialogHost, StatisticoGlobalRange, StatisticoSegmentation */

function getSegmentationRangeValues() {
  if (window.StatisticoGlobalRange) {
    var gr = StatisticoGlobalRange.load();
    if (gr && gr.values && gr.values.length >= 2) {
      return { values: gr.values, address: gr.address || '' };
    }
  }
  return null;
}

function getSegmentationDialogsBaseUrl() {
  if (typeof getDialogsBaseUrl === 'function') return getDialogsBaseUrl();
  var href = window.location.href;
  if (href.indexOf('/taskpane/') >= 0) return href.split('/taskpane/')[0] + '/dialogs/views/';
  return window.location.origin + '/dialogs/views/';
}

function ensureSegmentationEngine(cb) {
  if (window.StatisticoSegmentation) { cb(); return; }
  var s = document.createElement('script');
  s.src = getSegmentationDialogsBaseUrl() + 'segmentation/segmentation-engine.js?v=' + Date.now();
  s.onload = function () { cb(); };
  s.onerror = function () { alert('Could not load the segmentation engine.'); };
  document.head.appendChild(s);
}

function readSegmentationSpec() {
  if (window.__hubSegmentationSpec) return window.__hubSegmentationSpec;
  try { return JSON.parse(sessionStorage.getItem('segmentationModelSpec') || '{}'); } catch (_e) { return {}; }
}

var segmentationResultsDialog = null;
var segmentationLive = null;

function openSegmentationResultsDialog(payload) {
  segmentationLive = payload;
  try {
    sessionStorage.setItem('segmentationModelSpec', JSON.stringify(payload.spec || {}));
    if (payload.rows && payload.rows.length <= 20000) {
      sessionStorage.setItem('segmentationSource', JSON.stringify({
        headers: payload.headers,
        rows: payload.rows,
        address: payload.address || ''
      }));
    }
  } catch (_e) {}
  var product = (payload && payload.spec && payload.spec.product) === 'split' ? 'split' : 'loyalty';
  var url = getSegmentationDialogsBaseUrl() + 'segmentation/segmentation-results.html?v=' + Date.now() + '&product=' + product;
  Office.context.ui.displayDialogAsync(url, DIALOG_SIZES.RESULTS, function (result) {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error('Failed to open segmentation results:', result.error && result.error.message);
      return;
    }
    segmentationResultsDialog = result.value;
    if (window.HubResultsBridge) HubResultsBridge.registerDialog(segmentationResultsDialog);
    segmentationResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      var msg = {};
      try { msg = JSON.parse(arg.message || '{}'); } catch (_e) {}
      if (msg.action === 'ready' || msg.action === 'requestData') sendSegmentationSource();
      else if (msg.action === 'close' || msg.action === 'closeDialog') {
        try { segmentationResultsDialog.close(); } catch (_e2) {}
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

function sendSegmentationSource() {
  if (!segmentationResultsDialog || !segmentationLive) return;
  try {
    segmentationResultsDialog.messageChild(JSON.stringify({
      type: 'SEGMENTATION_SOURCE',
      payload: segmentationLive
    }));
  } catch (_e) {
    try {
      ensureSegmentationEngine(function () {
        var bundle = StatisticoSegmentation.analyze(segmentationLive.headers, segmentationLive.rows, segmentationLive.spec);
        delete bundle.respondents;
        segmentationResultsDialog.messageChild(JSON.stringify({ type: 'SEGMENTATION_RESULT', payload: bundle }));
      });
    } catch (_e2) {}
  }
}

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    var gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})('segmentation', function (gr) {
  var spec = readSegmentationSpec();
  window.__hubSegmentationSpec = spec;
  var headers = gr.values[0];
  var rows = gr.values.slice(1);
  ensureSegmentationEngine(function () {
    openSegmentationResultsDialog({ headers: headers, rows: rows, spec: spec, address: gr.address || '' });
  });
  return true;
});
