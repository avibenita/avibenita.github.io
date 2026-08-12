/* global Office, DIALOG_SIZES */

function getDialogsBaseUrl() {
  const href = window.location.href;
  if (href.includes("/taskpane/")) return `${href.split("/taskpane/")[0]}/dialogs/views/`;
  return `${window.location.origin}/dialogs/views/`;
}

function parseDialogMessage(arg) {
  if (!arg || arg.message == null) return null;
  try {
    return typeof arg.message === "object" ? arg.message : JSON.parse(String(arg.message));
  } catch (e) {
    return null;
  }
}

function readMvModelSpec() {
  try {
    const raw = sessionStorage.getItem("mvModelSpec");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function buildMvRunData(headers, rows, spec) {
  return {
    headers: headers || [],
    rows: rows || [],
    rawValues: [headers].concat(rows || []),
    spec: spec || {}
  };
}

function openMvResultsDialog(runData) {
  if (!runData || !globalThis.Office?.context?.ui) return;
  const url = `${getDialogsBaseUrl()}multivariable/mv-results.html?v=${Date.now()}`;
  const size = globalThis.DIALOG_SIZES?.RESULTS || { height: 90, width: 70, displayInIframe: false };

  Office.context.ui.displayDialogAsync(url, size, (res) => {
    if (res.status !== Office.AsyncResultStatus.Succeeded) return;
    const dlg = res.value;
    if (window.HubResultsBridge) HubResultsBridge.registerDialog(dlg);
    dlg.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
      const msg = parseDialogMessage(arg);
      if (msg && msg.action === "ready") {
        dlg.messageChild(JSON.stringify({ type: "MV_RUN_DATA", payload: runData }));
      }
    });
    dlg.addEventHandler(Office.EventType.DialogEventReceived, () => {
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function runMultivariableFromHub(gr) {
  const headers = gr.values[0] || [];
  const rows = gr.values.slice(1);
  const spec = readMvModelSpec();
  if (!spec || (!spec.xColName && spec.xColIndex == null)) return false;
  const runData = buildMvRunData(headers, rows, spec);
  try {
    sessionStorage.setItem("mvHubRunData", JSON.stringify(runData));
  } catch (e) {}
  openMvResultsDialog(runData);
  return true;
}

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    const gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})("multivariable", runMultivariableFromHub);

window.StatisticoHubResults = window.StatisticoHubResults || {};
window.StatisticoHubResults.mv = runMultivariableFromHub;
