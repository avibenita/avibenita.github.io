/* global Office */

let univariateRangeData = null;
let univariateRangeAddress = '';
let univariateDialog = null;
let univariateResultsDialog = null;
let univariateCurrentResults = null;
const RESULT_DIALOG_OPTIONS = { height: 84, width: 82, displayInIframe: false };

// ─── URL RESOLVER ────────────────────────────────────────────────────────────
function getDialogsBaseUrl() {
  const { origin, pathname, href } = window.location;
  if (href.includes('127.0.0.1') || href.includes('localhost')) {
    return 'http://127.0.0.1:8080/dialogs/views/';
  }
  const marker = '/taskpane/';
  const idx = pathname.indexOf(marker);
  if (idx !== -1) {
    return `${origin}${pathname.slice(0, idx)}/dialogs/views/`;
  }
  return `${origin}/dialogs/views/`;
}

// ─── DATA INPUT PANEL CALLBACKS ──────────────────────────────────────────────
function onRangeDataLoaded(values, address) {
  if (!values || values.length < 2) return showPanel(false);
  univariateRangeData = values;
  univariateRangeAddress = address || '';
  const headers = values[0] || [];
  const rows = values.slice(1);
  const r = document.getElementById('uniRange');
  const n = document.getElementById('uniRows');
  const c = document.getElementById('uniCols');
  if (r) r.textContent = univariateRangeAddress || 'Selection';
  if (n) n.textContent = rows.length;
  if (c) c.textContent = headers.length;
  showPanel(true);
  updateButtonState();
}

function showPanel(show) {
  const panel = document.getElementById('uniPanel');
  const btn = document.getElementById('openUnivariateBuilder');
  if (panel) panel.style.display = show ? 'block' : 'none';
  if (btn) btn.disabled = !show;
}

function updateButtonState() {
  const spec = JSON.parse(sessionStorage.getItem('univariateModelSpec') || 'null');
  const resetBtn = document.getElementById('resetUnivariateModelBtn');
  const openBtn = document.getElementById('openUnivariateBuilder');
  if (resetBtn) resetBtn.style.display = spec ? 'inline-flex' : 'none';
  if (openBtn) openBtn.innerHTML = spec
    ? '<i class="fa-solid fa-up-right-from-square"></i> Re-configure'
    : '<i class="fa-solid fa-up-right-from-square"></i> Open Configuration';
}

function resetUnivariateModel() {
  sessionStorage.removeItem('univariateModelSpec');
  updateButtonState();
}

// ─── OPEN CONFIG DIALOG ───────────────────────────────────────────────────────
function openUnivariateBuilder() {
  if (!univariateRangeData || univariateRangeData.length < 2) return;
  const dialogUrl = `${getDialogsBaseUrl()}univariate/univariate-input.html?v=${Date.now()}`;
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 80, width: 30, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to open univariate config dialog:', asyncResult.error.message);
        return;
      }
      univariateDialog = asyncResult.value;
      setTimeout(sendDialogData, 550);
      univariateDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || '{}');
          if (message.action === 'ready' || message.action === 'requestData') {
            sendDialogData();
          } else if (message.action === 'univariateResults') {
            sessionStorage.setItem('univariateModelSpec', JSON.stringify(message.spec || {}));
            univariateDialog.close();
            univariateDialog = null;
            updateButtonState();
            setTimeout(() => openResultsDialog(message.data), 380);
          } else if (message.action === 'close') {
            univariateDialog.close();
            univariateDialog = null;
          }
        } catch (_e) {}
      });
      univariateDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        univariateDialog = null;
      });
    }
  );
}

function sendDialogData() {
  if (!univariateDialog || !univariateRangeData) return;
  const headers = univariateRangeData[0] || [];
  const rows = univariateRangeData.slice(1);
  const savedSpec = JSON.parse(sessionStorage.getItem('univariateModelSpec') || 'null');
  univariateDialog.messageChild(JSON.stringify({
    type: 'UNIVARIATE_DATA',
    payload: { headers, rows, address: univariateRangeAddress, savedSpec }
  }));
}

// ─── RESULTS DIALOG ──────────────────────────────────────────────────────────
function openResultsDialog(results) {
  univariateCurrentResults = results;
  localStorage.removeItem('univariateResults');
  localStorage.setItem('univariateResults', JSON.stringify(results));

  const dialogUrl = `${getDialogsBaseUrl()}univariate/histogram-standalone.html`;
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    RESULT_DIALOG_OPTIONS,
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to open histogram:', asyncResult.error.message);
        return;
      }
      univariateResultsDialog = asyncResult.value;

      const sendData = () => {
        if (!univariateResultsDialog) return;
        univariateResultsDialog.messageChild(JSON.stringify({
          action: 'loadData',
          data: {
            values: results.rawData,
            column: results.column,
            descriptive: results.descriptive,
            n: results.n
          }
        }));
      };

      setTimeout(sendData, 1000);

      univariateResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message);
          if (message.status === 'ready') {
            sendData();
          } else if (message.action === 'switchView') {
            const previousDialog = univariateResultsDialog;
            setTimeout(() => {
              openNewView(`${getDialogsBaseUrl()}${message.view}`, univariateCurrentResults, () => {
                if (previousDialog) previousDialog.close();
              });
            }, 120);
          } else if (message.action === 'close' || message.action === 'closeDialog') {
            if (univariateResultsDialog) { univariateResultsDialog.close(); univariateResultsDialog = null; }
          }
        } catch (_e) {}
      });

      univariateResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        univariateResultsDialog = null;
      });
    }
  );
}

function openNewView(dialogUrl, results, onOpened) {
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    RESULT_DIALOG_OPTIONS,
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to switch univariate view:', asyncResult.error && asyncResult.error.message);
        return;
      }
      univariateResultsDialog = asyncResult.value;
      if (typeof onOpened === 'function') onOpened();

      const sendData = () => {
        if (!univariateResultsDialog) return;
        univariateResultsDialog.messageChild(JSON.stringify({
          action: 'loadData',
          data: {
            values: results.rawData,
            column: results.column,
            descriptive: results.descriptive,
            n: results.n
          }
        }));
      };

      setTimeout(sendData, 1000);

      univariateResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message);
          if (message.status === 'ready') {
            sendData();
          } else if (message.action === 'switchView') {
            const previousDialog = univariateResultsDialog;
            setTimeout(() => {
              openNewView(`${getDialogsBaseUrl()}${message.view}`, univariateCurrentResults, () => {
                if (previousDialog) previousDialog.close();
              });
            }, 120);
          } else if (message.action === 'close' || message.action === 'closeDialog') {
            if (univariateResultsDialog) { univariateResultsDialog.close(); univariateResultsDialog = null; }
          }
        } catch (_e) {}
      });

      univariateResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        univariateResultsDialog = null;
      });
    }
  );
}
