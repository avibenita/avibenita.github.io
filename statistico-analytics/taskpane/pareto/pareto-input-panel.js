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

function readParetoModelSpec() {
  try {
    const raw = sessionStorage.getItem("paretoModelSpec");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function buildParetoRunData(headers, rows, spec) {
  const catIdx = spec.categoryColIndex != null ? Number(spec.categoryColIndex) : headers.indexOf(spec.categoryColName);
  const valIdxRaw = spec.valuesColIndex;
  const valIdx = valIdxRaw != null && valIdxRaw !== "" && Number(valIdxRaw) >= 0 ? Number(valIdxRaw) : null;
  const map = {};

  rows.forEach((row) => {
    const cat = String(row[catIdx] || "").trim();
    if (!cat) return;
    let val = valIdx != null ? parseFloat(row[valIdx]) : 1;
    if (!isFinite(val)) val = 0;
    map[cat] = (map[cat] || 0) + val;
  });

  const paretoData = Object.keys(map).map((k) => ({ cat: k, val: map[k] }));
  paretoData.sort((a, b) => b.val - a.val);

  const includedIndices = Array.isArray(spec.includedIndices)
    ? spec.includedIndices
    : headers.map((_, i) => i);

  return {
    headers,
    includedIndices,
    categoryColIndex: catIdx,
    valuesColIndex: valIdx,
    categoryColName: spec.categoryColName || headers[catIdx] || "",
    valuesColName: valIdx != null ? (spec.valuesColName || headers[valIdx] || "") : "Count",
    paretoData,
    rawValues: [headers].concat(rows)
  };
}

function openParetoResultsDialog(runData) {
  if (!runData || !globalThis.Office?.context?.ui) return;
  const url = `${getDialogsBaseUrl()}pareto/pareto-results.html?v=${Date.now()}`;
  const size = globalThis.DIALOG_SIZES?.RESULTS || { height: 90, width: 70, displayInIframe: false };

  Office.context.ui.displayDialogAsync(url, size, (res) => {
    if (res.status !== Office.AsyncResultStatus.Succeeded) return;
    const dlg = res.value;
    if (window.HubResultsBridge) HubResultsBridge.registerDialog(dlg);
    dlg.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
      const msg = parseDialogMessage(arg);
      if (msg && msg.action === "ready") {
        dlg.messageChild(JSON.stringify({ type: "PARETO_RUN_DATA", payload: runData }));
      }
    });
    dlg.addEventHandler(Office.EventType.DialogEventReceived, () => {
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function runParetoFromHub(gr) {
  const headers = gr.values[0] || [];
  const rows = gr.values.slice(1);
  const spec = readParetoModelSpec();
  if (!spec || spec.categoryColIndex == null && !spec.categoryColName) return false;
  const runData = buildParetoRunData(headers, rows, spec);
  if (!runData.paretoData.length) return false;
  try {
    sessionStorage.setItem("paretoHubRunData", JSON.stringify(runData));
  } catch (e) {}
  openParetoResultsDialog(runData);
  return true;
}

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    const gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})("pareto2080", runParetoFromHub);

window.StatisticoHubResults = window.StatisticoHubResults || {};
window.StatisticoHubResults.pareto = runParetoFromHub;
