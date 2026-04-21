/* global Office */

let univariateRangeData = null;
let univariateRangeAddress = '';
let univariateDialog = null;
let univariateResultsDialog = null;
let univariateCurrentResults = null;
let pendingUnivariateViewUrl = null;
let _uniEmbedMessageHandler = null;
let _univariateDialogDataPump = null;
const RESULT_DIALOG_OPTIONS = { height: 90, width: 70, displayInIframe: false };

function notifyConfigDialogClosed() {
  if (typeof window.onUnivariateConfigDialogClosed === 'function') {
    try { window.onUnivariateConfigDialogClosed(); } catch (_e) {}
  }
}

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

function setUnivariateConfigVisible(show) {
  document.body.classList.toggle('config-active', !!show);
  const host = document.getElementById('univariateConfigHost');
  if (host) host.classList.toggle('visible', !!show);
}

function detachUniEmbedListener() {
  if (_uniEmbedMessageHandler) {
    window.removeEventListener('message', _uniEmbedMessageHandler);
    _uniEmbedMessageHandler = null;
  }
}

function hideUnivariateConfigEmbed() {
  detachUniEmbedListener();
  stopUnivariateDialogDataPump();
  setUnivariateConfigVisible(false);
  const frame = document.getElementById('univariateConfigFrame');
  if (frame) {
    try { frame.src = 'about:blank'; } catch (_e) {}
  }
}

function stopUnivariateDialogDataPump() {
  if (_univariateDialogDataPump) {
    clearInterval(_univariateDialogDataPump);
    _univariateDialogDataPump = null;
  }
}

function sendDialogDataToEmbed() {
  const frame = document.getElementById('univariateConfigFrame');
  if (!frame || !frame.contentWindow || !univariateRangeData) return;
  const headers = univariateRangeData[0] || [];
  const rows = univariateRangeData.slice(1);
  const savedSpec = JSON.parse(sessionStorage.getItem('univariateModelSpec') || 'null');
  frame.contentWindow.postMessage(
    {
      statisticoUnivariateHost: true,
      body: JSON.stringify({
        type: 'UNIVARIATE_DATA',
        payload: { headers, rows, address: univariateRangeAddress, savedSpec }
      })
    },
    '*'
  );
}

function attachUniEmbedListener() {
  detachUniEmbedListener();
  _uniEmbedMessageHandler = function (ev) {
    const d = ev.data;
    if (!d || d.statisticoUnivariateEmbed !== true) return;
    let message;
    try {
      message = JSON.parse(d.body || '{}');
    } catch (_e) {
      return;
    }
    if (message.action === 'ready' || message.action === 'requestData') {
      sendDialogDataToEmbed();
      return;
    }
    if (message.action === 'univariateResults') {
      sessionStorage.setItem('univariateModelSpec', JSON.stringify(message.spec || {}));
      hideUnivariateConfigEmbed();
      updateButtonState();
      setTimeout(() => openResultsDialog(message.data), 380);
      return;
    }
    if (message.action === 'close') {
      hideUnivariateConfigEmbed();
    }
  };
  window.addEventListener('message', _uniEmbedMessageHandler);
}

// ─── OPEN CONFIG: DIALOG FALLBACK ────────────────────────────────────────────
function openUnivariateBuilderDialog() {
  if (!univariateRangeData || univariateRangeData.length < 2) return;
  stopUnivariateDialogDataPump();
  if (univariateDialog) {
    try { univariateDialog.close(); } catch (_e) {}
    univariateDialog = null;
  }
  if (univariateResultsDialog) {
    try { univariateResultsDialog.close(); } catch (_e) {}
    univariateResultsDialog = null;
  }
  try {
    const payload = {
      headers: univariateRangeData[0] || [],
      rows: univariateRangeData.slice(1),
      address: univariateRangeAddress,
      savedSpec: JSON.parse(sessionStorage.getItem('univariateModelSpec') || 'null')
    };
    localStorage.setItem('univariateConfigPayload', JSON.stringify(payload));
  } catch (_e) {}
  const dialogUrl = `${getDialogsBaseUrl()}univariate/univariate-input.html?v=${Date.now()}`;
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 88, width: 25, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to open univariate config dialog:', asyncResult.error.message);
        notifyConfigDialogClosed();
        return;
      }
      univariateDialog = asyncResult.value;
      let runHandled = false;
      let dataApplied = false;
      let pumpAttempts = 0;
      // Retry sends because Office dialogs sometimes miss the first payload after reopen.
      [550, 1200, 2000].forEach((delay) => setTimeout(sendDialogData, delay));
      _univariateDialogDataPump = setInterval(() => {
        if (!univariateDialog || dataApplied || pumpAttempts >= 10) {
          stopUnivariateDialogDataPump();
          return;
        }
        pumpAttempts += 1;
        sendDialogData();
      }, 700);
      univariateDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || '{}');
          if (message.action === 'ready' || message.action === 'requestData') {
            sendDialogData();
          } else if (message.action === 'dataApplied') {
            dataApplied = true;
            stopUnivariateDialogDataPump();
          } else if (message.action === 'univariateResultsReady') {
            if (runHandled) return;
            const stored = consumeUnivariateResultsFromStorage();
            if (!stored || !stored.data) return;
            runHandled = true;
            sessionStorage.setItem('univariateModelSpec', JSON.stringify(stored.spec || {}));
            univariateDialog.close();
            univariateDialog = null;
            stopUnivariateDialogDataPump();
            notifyConfigDialogClosed();
            updateButtonState();
            setTimeout(() => openResultsDialog(stored.data), 380);
          } else if (message.action === 'univariateResults') {
            if (runHandled) return;
            runHandled = true;
            sessionStorage.setItem('univariateModelSpec', JSON.stringify(message.spec || {}));
            univariateDialog.close();
            univariateDialog = null;
            stopUnivariateDialogDataPump();
            notifyConfigDialogClosed();
            updateButtonState();
            setTimeout(() => openResultsDialog(message.data), 380);
          } else if (message.action === 'close') {
            univariateDialog.close();
            univariateDialog = null;
            stopUnivariateDialogDataPump();
            notifyConfigDialogClosed();
          }
        } catch (_e) {}
      });
      univariateDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        univariateDialog = null;
        stopUnivariateDialogDataPump();
        notifyConfigDialogClosed();
      });
    }
  );
}

// ─── OPEN CONFIG EMBED (PRIMARY) ─────────────────────────────────────────────
function openUnivariateBuilder() {
  openUnivariateBuilderDialog();
}

function sendDialogData() {
  if (!univariateDialog || !univariateRangeData) return;
  const headers = univariateRangeData[0] || [];
  const rows = univariateRangeData.slice(1);
  const savedSpec = JSON.parse(sessionStorage.getItem('univariateModelSpec') || 'null');
  try {
    localStorage.setItem('univariateConfigPayload', JSON.stringify({
      headers, rows, address: univariateRangeAddress, savedSpec
    }));
  } catch (_e) {}
  try {
    univariateDialog.messageChild(JSON.stringify({
      type: 'UNIVARIATE_DATA',
      payload: { headers, rows, address: univariateRangeAddress, savedSpec }
    }));
  } catch (_e) {}
}

function consumeUnivariateResultsFromStorage() {
  try {
    const raw = localStorage.getItem('univariateRunResultPayload');
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || !payload.data) return null;
    return payload;
  } catch (_e) {
    return null;
  }
}

function queueResultsViewSwitch(viewPath) {
  pendingUnivariateViewUrl = `${getDialogsBaseUrl()}${viewPath}`;
  if (univariateResultsDialog) {
    try { univariateResultsDialog.close(); } catch (_e) {}
    return;
  }
  if (pendingUnivariateViewUrl && univariateCurrentResults) {
    const target = pendingUnivariateViewUrl;
    pendingUnivariateViewUrl = null;
    openNewView(target, univariateCurrentResults);
  }
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
      const dialog = asyncResult.value;
      univariateResultsDialog = dialog;

      const sendData = () => {
        if (!dialog) return;
        dialog.messageChild(JSON.stringify({
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

      dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message);
          if (message.status === 'ready') {
            sendData();
          } else if (message.action === 'switchView') {
            if (dialog !== univariateResultsDialog) return;
            queueResultsViewSwitch(message.view);
          } else if (message.action === 'close' || message.action === 'closeDialog') {
            pendingUnivariateViewUrl = null;
            if (dialog === univariateResultsDialog) {
              dialog.close();
              univariateResultsDialog = null;
            }
          }
        } catch (_e) {}
      });

      dialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        if (dialog === univariateResultsDialog) {
          univariateResultsDialog = null;
        }
        if (pendingUnivariateViewUrl && !univariateResultsDialog && univariateCurrentResults) {
          const target = pendingUnivariateViewUrl;
          pendingUnivariateViewUrl = null;
          setTimeout(() => openNewView(target, univariateCurrentResults), 120);
        }
      });
    }
  );
}

function openNewView(dialogUrl, results) {
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    RESULT_DIALOG_OPTIONS,
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to switch univariate view:', asyncResult.error && asyncResult.error.message);
        return;
      }
      const dialog = asyncResult.value;
      univariateResultsDialog = dialog;

      const sendData = () => {
        if (!dialog) return;
        dialog.messageChild(JSON.stringify({
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

      dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message);
          if (message.status === 'ready') {
            sendData();
          } else if (message.action === 'switchView') {
            if (dialog !== univariateResultsDialog) return;
            queueResultsViewSwitch(message.view);
          } else if (message.action === 'close' || message.action === 'closeDialog') {
            pendingUnivariateViewUrl = null;
            if (dialog === univariateResultsDialog) {
              dialog.close();
              univariateResultsDialog = null;
            }
          }
        } catch (_e) {}
      });

      dialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        if (dialog === univariateResultsDialog) {
          univariateResultsDialog = null;
        }
        if (pendingUnivariateViewUrl && !univariateResultsDialog && univariateCurrentResults) {
          const target = pendingUnivariateViewUrl;
          pendingUnivariateViewUrl = null;
          setTimeout(() => openNewView(target, univariateCurrentResults), 120);
        }
      });
    }
  );
}

