/* global Office, Excel, DIALOG_SIZES, MvSampleData */

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
  let headers;
  let rows;
  let spec = readMvModelSpec();

  if (gr && gr.values && gr.values.length >= 2) {
    headers = gr.values[0] || [];
    rows = gr.values.slice(1);
  } else if (window.MvSampleData) {
    const t = MvSampleData.getTable();
    headers = t.headers;
    rows = t.rows;
    if (!spec) spec = Object.assign({}, MvSampleData.defaultSpec);
  } else {
    return false;
  }

  if (!spec || (!spec.xColName && spec.xColIndex == null)) {
    if (window.MvSampleData) spec = Object.assign({}, MvSampleData.defaultSpec);
    else return false;
  }

  const runData = buildMvRunData(headers, rows, spec);
  try {
    sessionStorage.setItem("mvHubRunData", JSON.stringify(runData));
  } catch (e) {}
  openMvResultsDialog(runData);
  return true;
}

/**
 * Write the bubble sample to a worksheet named "MV Sample", select it,
 * and store it as the hub Active Range.
 */
async function insertMvSampleSheet() {
  if (!window.MvSampleData || typeof Excel === "undefined") {
    return { ok: false, error: "Sample data unavailable" };
  }
  const table = MvSampleData.getTable();
  const sheetName = MvSampleData.SHEET_NAME || "MV Sample";
  const values = table.values;

  try {
    let address = sheetName + "!A1";
    await Excel.run(async (ctx) => {
      const sheets = ctx.workbook.worksheets;
      sheets.load("items/name");
      await ctx.sync();

      let sheet = null;
      for (let i = 0; i < sheets.items.length; i++) {
        if (sheets.items[i].name === sheetName) {
          sheet = sheets.items[i];
          break;
        }
      }
      if (!sheet) sheet = sheets.add(sheetName);

      sheet.activate();
      const used = sheet.getUsedRangeOrNullObject();
      used.load("address");
      await ctx.sync();
      if (!used.isNullObject) used.clear();

      const range = sheet.getRangeByIndexes(0, 0, values.length, values[0].length);
      range.values = values;
      range.format.autofitColumns();
      range.getRow(0).format.font.bold = true;
      sheet.getRangeByIndexes(0, 0, values.length, values[0].length).select();
      range.load("address");
      await ctx.sync();
      address = range.address;
    });

    if (window.StatisticoGlobalRange) {
      StatisticoGlobalRange.save(values, address, "used");
    }
    if (typeof window.hubRefreshGlobalRange === "function") {
      try { await window.hubRefreshGlobalRange(); } catch (e) {}
    }
    return { ok: true, address: address, values: values };
  } catch (e) {
    console.warn("insertMvSampleSheet", e);
    return { ok: false, error: (e && e.message) || String(e) };
  }
}

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    const gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    return fn(gr);
  };
})("multivariable", runMultivariableFromHub);

window.StatisticoHubResults = window.StatisticoHubResults || {};
window.StatisticoHubResults.mv = runMultivariableFromHub;
window.StatisticoMvSample = {
  insertSheet: insertMvSampleSheet,
  runFromHub: runMultivariableFromHub
};
