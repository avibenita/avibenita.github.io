/* global Office, DIALOG_SIZES, StatisticoDialogHost, HubResultsBridge, StatisticoReliability */

var reliabilityRangeData = null;
var reliabilityRangeAddress = "";
var reliabilityDialog = null;

function onRangeDataLoaded(values, address) {
  if (!values || values.length < 2) {
    showReliabilityPanel(false);
    return;
  }
  reliabilityRangeData = values;
  reliabilityRangeAddress = address || "";
  var headers = values[0] || [];
  var dataRows = values.slice(1);
  var rangeEl = document.getElementById("reliabilityRange");
  var rowsEl = document.getElementById("reliabilityRows");
  var colsEl = document.getElementById("reliabilityCols");
  if (rangeEl) rangeEl.textContent = reliabilityRangeAddress || "Selection";
  if (rowsEl) rowsEl.textContent = dataRows.length;
  if (colsEl) colsEl.textContent = headers.length;
  showReliabilityPanel(true);
  updateReliabilityButtonState();
}

function showReliabilityPanel(show) {
  var panel = document.getElementById("reliabilityPanel");
  var btn = document.getElementById("openReliabilityBuilder");
  if (panel) panel.style.display = show ? "block" : "none";
  if (btn) btn.disabled = !show;
}

function getDialogsBaseUrl() {
  var href = window.location.href;
  if (href.indexOf("/taskpane/") >= 0) return href.split("/taskpane/")[0] + "/dialogs/views/";
  return window.location.origin + "/dialogs/views/";
}

function openReliabilityBuilder() {
  var dialogUrl = getDialogsBaseUrl() + "reliability/reliability-input.html?v=" + Date.now();
  Office.context.ui.displayDialogAsync(dialogUrl, DIALOG_SIZES.REGRESSION_BUILDER, function (asyncResult) {
    if (asyncResult.status === Office.AsyncResultStatus.Failed) {
      console.error("Failed to open Scale Reliability setup:", asyncResult.error);
      return;
    }
    reliabilityDialog = asyncResult.value;
    setTimeout(sendReliabilityDialogData, 600);
    reliabilityDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      try {
        var message = JSON.parse(arg.message);
        if (message.action === "ready" || message.action === "requestData") {
          sendReliabilityDialogData();
        } else if (message.action === "reliabilityModel") {
          var spec = message.payload || message.data || {};
          spec.analysisMode = "reliability";
          sessionStorage.setItem("reliabilityModelSpec", JSON.stringify(spec));
          reliabilityDialog.close();
          reliabilityDialog = null;
          updateReliabilityButtonState();
          setTimeout(openReliabilityResultsDialog, 450);
        } else if (message.action === "close") {
          if (window.StatisticoDialogHost) {
            StatisticoDialogHost.closeFromMessage(reliabilityDialog, function () { reliabilityDialog = null; });
          } else {
            reliabilityDialog.close();
            reliabilityDialog = null;
          }
        }
      } catch (e) {
        console.error("Error handling reliability setup message:", e);
      }
    });
    reliabilityDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
      reliabilityDialog = null;
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function sendReliabilityDialogData() {
  if (!reliabilityDialog) return;
  var headers = (reliabilityRangeData && reliabilityRangeData.length) ? (reliabilityRangeData[0] || []) : [];
  var rows = (reliabilityRangeData && reliabilityRangeData.length > 1) ? reliabilityRangeData.slice(1) : [];
  reliabilityDialog.messageChild(JSON.stringify({
    type: "RELIABILITY_DATA",
    payload: {
      headers: headers,
      rows: rows,
      address: reliabilityRangeAddress,
      savedModelSpec: null
    }
  }));
}

function buildReliabilityBundle(headers, rows, modelSpec) {
  if (typeof StatisticoReliability === "undefined" || typeof StatisticoReliability.analyze !== "function") {
    return { ok: false, blocking: true, errors: [{ message: "Reliability engine is not loaded." }] };
  }
  return StatisticoReliability.analyze(headers, rows, modelSpec || {});
}

function openReliabilityResultsDialog() {
  var dialogUrl = getDialogsBaseUrl() + "reliability/reliability-analysis.html?v=" + Date.now();
  Office.context.ui.displayDialogAsync(dialogUrl, DIALOG_SIZES.RESULTS, function (asyncResult) {
    if (asyncResult.status === Office.AsyncResultStatus.Failed) {
      console.error("Failed to open Scale Reliability results:", asyncResult.error);
      return;
    }
    reliabilityDialog = asyncResult.value;
    if (window.HubResultsBridge) HubResultsBridge.registerDialog(reliabilityDialog);
    reliabilityDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      try {
        var message = JSON.parse(arg.message);
        if (message.action === "ready") {
          sendReliabilityBundle();
        } else if (message.action === "openFactorAnalysis") {
          var items = (message.items || message.data && message.data.items || []);
          sessionStorage.setItem("factorModelSpec", JSON.stringify({
            analysisMode: "factor",
            variables: items,
            xn: items
          }));
          if (typeof window.navigateToModule === "function") window.navigateToModule("factor");
        } else if (message.action === "close") {
          if (window.StatisticoDialogHost) {
            StatisticoDialogHost.closeFromMessage(reliabilityDialog, function () { reliabilityDialog = null; });
          } else {
            reliabilityDialog.close();
            reliabilityDialog = null;
          }
        }
      } catch (e) {
        console.error("Error handling reliability results message:", e);
      }
    });
    reliabilityDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
      reliabilityDialog = null;
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
    setTimeout(sendReliabilityBundle, 1100);
  });
}

function sendReliabilityBundle() {
  if (!reliabilityDialog || !reliabilityRangeData) return;
  var headers = reliabilityRangeData[0] || [];
  var rows = reliabilityRangeData.slice(1);
  var modelSpec = JSON.parse(sessionStorage.getItem("reliabilityModelSpec") || "{}");
  var bundle = buildReliabilityBundle(headers, rows, modelSpec);
  reliabilityDialog.messageChild(JSON.stringify({ type: "RELIABILITY_BUNDLE", payload: bundle }));
  var items = (modelSpec.items || []);
  var idxs = items.map(function (name) {
    var want = String(name).toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i] || "").toLowerCase() === want) return i;
    }
    return -1;
  }).filter(function (i) { return i >= 0; });
  var previewRows = rows.slice(0, 500).map(function (row) {
    return idxs.map(function (i) { return row[i]; });
  });
  setTimeout(function () {
    if (!reliabilityDialog) return;
    reliabilityDialog.messageChild(JSON.stringify({
      type: "RELIABILITY_RAW_DATA",
      payload: { headers: items, rows: previewRows }
    }));
  }, 300);
}

function resetReliabilityModel() {
  sessionStorage.removeItem("reliabilityModelSpec");
  updateReliabilityButtonState();
}

function updateReliabilityButtonState() {
  var hasSaved = !!sessionStorage.getItem("reliabilityModelSpec");
  var openBtn = document.getElementById("openReliabilityBuilder");
  var resetBtn = document.getElementById("resetReliabilityBtn");
  if (openBtn) {
    openBtn.innerHTML = hasSaved
      ? '<i class="fa-solid fa-chart-column"></i> Open Reliability Workspace'
      : '<i class="fa-solid fa-up-right-from-square"></i> Open Setup';
    openBtn.onclick = hasSaved ? openReliabilityResultsDialog : openReliabilityBuilder;
  }
  if (resetBtn) resetBtn.style.display = hasSaved ? "inline-block" : "none";
}

window.onRangeDataLoaded = onRangeDataLoaded;
window.openReliabilityBuilder = openReliabilityBuilder;
window.openReliabilityResultsDialog = openReliabilityResultsDialog;
window.resetReliabilityModel = resetReliabilityModel;

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    var gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})("reliability", function (gr) {
  onRangeDataLoaded(gr.values, gr.address);
  openReliabilityResultsDialog();
  return true;
});
