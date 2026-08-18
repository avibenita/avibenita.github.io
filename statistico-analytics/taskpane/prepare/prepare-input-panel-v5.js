/* global Excel, Office, DIALOG_SIZES, HubResultsBridge, StatisticoDialogHost, StatisticoGlobalRange, StatisticoPrepare, StatisticoPrepareIntent */

function getPrepareRangeValues() {
  if (window.StatisticoGlobalRange) {
    var gr = StatisticoGlobalRange.load();
    if (gr && gr.values && gr.values.length >= 2) {
      return { values: gr.values, address: gr.address || '', mode: gr.mode || '' };
    }
  }
  return null;
}

function getPrepareDialogsBaseUrl() {
  if (typeof getDialogsBaseUrl === 'function') return getDialogsBaseUrl();
  var href = window.location.href;
  if (href.indexOf('/taskpane/') >= 0) return href.split('/taskpane/')[0] + '/dialogs/views/';
  return window.location.origin + '/dialogs/views/';
}

function loadPrepareEngine(cb) {
  if (window.StatisticoPrepare) { cb(); return; }
  var s = document.createElement('script');
  s.src = getPrepareDialogsBaseUrl() + 'prepare/prepare-engine.js?v=' + Date.now();
  s.onload = function () { cb(); };
  s.onerror = function () { cb(new Error('Could not load the preparation engine.')); };
  document.head.appendChild(s);
}

function listWorksheetNames() {
  if (typeof Excel === 'undefined') return Promise.resolve([]);
  return Excel.run(function (ctx) {
    var sheets = ctx.workbook.worksheets;
    sheets.load('items/name');
    return ctx.sync().then(function () {
      return sheets.items.map(function (sh) { return sh.name; });
    });
  }).catch(function () { return []; });
}

function buildPreparePayload(extra) {
  var range = getPrepareRangeValues();
  var recipe = window.StatisticoPrepareIntent ? StatisticoPrepareIntent.getRecipe() : { steps: [] };
  var intent = extra && extra.keepIntent
    ? (window.StatisticoPrepareIntent && StatisticoPrepareIntent.peek())
    : (window.StatisticoPrepareIntent && StatisticoPrepareIntent.consume());
  return {
    headers: range ? (range.values[0] || []) : [],
    rows: range ? range.values.slice(1) : [],
    address: range ? range.address : '',
    worksheetName: range && range.address ? String(range.address).split('!')[0].replace(/'/g, '') : '',
    recipe: recipe,
    intent: intent || null
  };
}

function sendPrepareDialogData(dialog, type, extra) {
  if (!dialog) return;
  listWorksheetNames().then(function (names) {
    var payload = buildPreparePayload(extra || {});
    payload.sheetNames = names || [];
    dialog.messageChild(JSON.stringify({ type: type, payload: payload }));
  });
}

var prepareDialog = null;

function openPrepareBuilder(kind) {
  var moduleId = kind === 'quality' ? 'prepare-quality' : 'prepare-dataset';
  var path = kind === 'quality' ? 'prepare/prepare-quality-input.html' : 'prepare/prepare-dataset-tri.html';
  var dataType = kind === 'quality' ? 'PREPARE_QUALITY_DATA' : 'PREPARE_DATASET_DATA';
  if (typeof setSelectedModuleCard === 'function') setSelectedModuleCard(moduleId, true);
  var url = getPrepareDialogsBaseUrl() + path + '?v=' + Date.now();
  var opts = (typeof DIALOG_SIZES !== 'undefined' && DIALOG_SIZES.REGRESSION_BUILDER)
    ? DIALOG_SIZES.REGRESSION_BUILDER
    : { height: 74, width: 30, displayInIframe: false };

  Office.context.ui.displayDialogAsync(url, opts, function (result) {
    if (result.status === Office.AsyncResultStatus.Failed) {
      if (typeof setSelectedModuleCard === 'function') setSelectedModuleCard(moduleId, false);
      try {
        window.alert('Could not open Prepare Data.\n\n' + ((result.error && result.error.message) || 'Unknown error'));
      } catch (e) {}
      return;
    }
    prepareDialog = result.value;
    var dlg = prepareDialog;
    if (window.HubResultsBridge) HubResultsBridge.registerDialog(dlg);
    var send = function () { sendPrepareDialogData(dlg, dataType, { keepIntent: false }); };
    setTimeout(send, 550);
    dlg.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      var msg = {};
      try { msg = JSON.parse(arg.message || '{}'); } catch (e) { return; }
      if (msg.action === 'ready' || msg.action === 'requestData') {
        send();
        return;
      }
      if (msg.action === 'saveRecipe') {
        if (window.StatisticoPrepareIntent) {
          StatisticoPrepareIntent.setRecipe({ steps: (msg.payload && msg.payload.steps) || [] });
        }
        return;
      }
      if (msg.action === 'transferToRecipe' || msg.action === 'openPrepareDataset') {
        if (window.StatisticoPrepareIntent && msg.payload && msg.payload.steps) {
          StatisticoPrepareIntent.appendSteps(msg.payload.steps);
        }
        try { dlg.close(); } catch (e) {}
        prepareDialog = null;
        setTimeout(function () { openPrepareBuilder('dataset'); }, 220);
        return;
      }
      if (msg.action === 'createPreparedSheet') {
        var payload = msg.payload || msg.data || {};
        try { dlg.close(); } catch (e2) {}
        prepareDialog = null;
        writePreparedWorksheet(payload).then(function (res) {
          if (typeof setSelectedModuleCard === 'function') setSelectedModuleCard(moduleId, false);
          if (!res.ok) {
            try { window.alert(res.error || 'Could not create the prepared worksheet.'); } catch (e3) {}
            return;
          }
          try {
            window.alert(
              'Created worksheet “' + res.sheetName + '”.\n' +
              res.nRows + ' rows × ' + res.nVars + ' variables.\n' +
              res.stepCount + ' preparation step' + (res.stepCount === 1 ? '' : 's') + ' applied.\n\n' +
              'The original worksheet and Active Range were not changed.'
            );
          } catch (e4) {}
        });
        return;
      }
      if (msg.action === 'close' || msg.action === 'cancel') {
        try { dlg.close(); } catch (e5) {}
        prepareDialog = null;
        if (typeof setSelectedModuleCard === 'function') setSelectedModuleCard(moduleId, false);
      }
    });
    dlg.addEventHandler(Office.EventType.DialogEventReceived, function () {
      prepareDialog = null;
      if (typeof setSelectedModuleCard === 'function') setSelectedModuleCard(moduleId, false);
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
  return true;
}

function writePreparedWorksheet(payload) {
  payload = payload || {};
  var values = payload.values;
  if (!values || !values.length || !values[0] || !values[0].length) {
    return Promise.resolve({ ok: false, error: 'There is no prepared table to write.' });
  }
  if (typeof Excel === 'undefined') {
    return Promise.resolve({ ok: false, error: 'Excel is not available.' });
  }
  var preferred = payload.sheetName || 'Prepared_Data';
  return Excel.run(function (ctx) {
    var sheets = ctx.workbook.worksheets;
    sheets.load('items/name');
    return ctx.sync().then(function () {
      var existing = sheets.items.map(function (sh) { return sh.name; });
      var name = (window.StatisticoPrepare && StatisticoPrepare.uniqueSheetName)
        ? StatisticoPrepare.uniqueSheetName(existing, preferred)
        : preferred;
      var sheet = sheets.add(name);
      var range = sheet.getRangeByIndexes(0, 0, values.length, values[0].length);
      range.values = values;
      range.getRow(0).format.font.bold = true;
      range.format.autofitColumns();
      sheet.activate();
      return ctx.sync().then(function () {
        return {
          ok: true,
          sheetName: name,
          nRows: Math.max(0, values.length - 1),
          nVars: values[0].length,
          stepCount: (payload.stepCount != null) ? payload.stepCount : ((payload.steps && payload.steps.length) || 0)
        };
      });
    });
  }).catch(function (err) {
    return { ok: false, error: (err && err.message) || String(err) };
  });
}

function runPrepareQualityFromHub() {
  loadPrepareEngine(function (err) {
    if (err) { try { window.alert(err.message); } catch (e) {} return; }
    openPrepareBuilder('quality');
  });
  return true;
}

function runPrepareDatasetFromHub() {
  loadPrepareEngine(function (err) {
    if (err) { try { window.alert(err.message); } catch (e) {} return; }
    openPrepareBuilder('dataset');
  });
  return true;
}

window.StatisticoHubResults = window.StatisticoHubResults || {};
window.StatisticoHubResults['prepare-quality'] = runPrepareQualityFromHub;
window.StatisticoHubResults['prepare-dataset'] = runPrepareDatasetFromHub;
window.StatisticoPrepareWrite = {
  writeSheet: writePreparedWorksheet,
  openQuality: runPrepareQualityFromHub,
  openDataset: runPrepareDatasetFromHub
};
