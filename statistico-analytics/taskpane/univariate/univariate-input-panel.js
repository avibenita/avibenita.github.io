/* global Office */

let univariateRangeData = null;
let univariateRangeAddress = '';
let univariateDialog = null;
let univariateResultsDialog = null;
let univariateCurrentResults = null;

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
  sessionStorage.setItem('univariateRangeData', JSON.stringify(values));
  sessionStorage.setItem('univariateRangeAddress', univariateRangeAddress);
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
  if (openBtn) openBtn.textContent = spec
    ? ' Re-configure'
    : ' Open Configuration';
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
          } else if (message.action === 'univariateModel') {
            sessionStorage.setItem('univariateModelSpec', JSON.stringify(message.data || {}));
            univariateDialog.close();
            univariateDialog = null;
            updateButtonState();
            setTimeout(runUnivariateAnalysis, 380);
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

// ─── RUN ANALYSIS (after config dialog closes) ────────────────────────────────
function runUnivariateAnalysis() {
  const spec = JSON.parse(sessionStorage.getItem('univariateModelSpec') || 'null');
  if (!spec || !univariateRangeData) return;

  const { columnIndex, columnName, trimMin, trimMax, transform } = spec;

  // Extract column data (skip header row)
  let data = univariateRangeData.slice(1)
    .map(row => row[columnIndex])
    .filter(v => v !== '' && v !== null && v !== undefined && !isNaN(parseFloat(v)))
    .map(v => parseFloat(v));

  if (!data.length) return;

  // Apply trim
  if (trimMin > 0 || trimMax < 100) {
    const sorted = [...data].sort((a, b) => a - b);
    const minVal = sorted[Math.floor((sorted.length - 1) * trimMin / 100)];
    const maxVal = sorted[Math.floor((sorted.length - 1) * trimMax / 100)];
    data = data.filter(v => v >= minVal && v <= maxVal);
  }

  // Apply transform
  data = applyTransform(data, transform);

  const results = calculateStatistics(data, univariateRangeAddress, columnName, transform, trimMin, trimMax);
  openResultsDialog(results);
}

// ─── TRANSFORM ────────────────────────────────────────────────────────────────
function applyTransform(data, transform) {
  switch (transform) {
    case 'ln':       return data.map(v => Math.log(v));
    case 'log10':    return data.map(v => Math.log10(v));
    case 'sqrt':     return data.map(v => Math.sqrt(v));
    case 'square':   return data.map(v => v * v);
    case 'reciprocal': return data.map(v => 1 / v);
    case 'z': {
      const m = data.reduce((a, b) => a + b, 0) / data.length;
      const sd = Math.sqrt(data.reduce((acc, v) => acc + (v - m) ** 2, 0) / data.length);
      return data.map(v => (v - m) / sd);
    }
    case 'minmax': {
      const mn = Math.min(...data), mx = Math.max(...data);
      return data.map(v => (v - mn) / (mx - mn));
    }
    default: return data;
  }
}

// ─── STATISTICS ───────────────────────────────────────────────────────────────
function calculateStatistics(data, address, columnName, transform, trimMin, trimMax) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = data.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const skewness = calcSkewness(data, mean, stdDev);
  const kurtosis = calcKurtosis(data, mean, stdDev);
  return {
    dataSource: address,
    column: columnName,
    transform,
    trim: { min: trimMin, max: trimMax },
    n,
    values: data,
    rawData: data,
    descriptive: { mean, median, stdDev, variance, min, max, range: max - min, q1, q3, iqr: q3 - q1, skewness, kurtosis }
  };
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function calcSkewness(data, mean, sd) {
  const n = data.length;
  const m3 = data.reduce((acc, v) => acc + (v - mean) ** 3, 0) / n;
  return m3 / sd ** 3;
}

function calcKurtosis(data, mean, sd) {
  const n = data.length;
  const m4 = data.reduce((acc, v) => acc + (v - mean) ** 4, 0) / n;
  return (m4 / sd ** 4) - 3;
}

// ─── RESULTS DIALOG ──────────────────────────────────────────────────────────
function openResultsDialog(results) {
  univariateCurrentResults = results;
  localStorage.removeItem('univariateResults');
  localStorage.setItem('univariateResults', JSON.stringify(results));

  const dialogUrl = `${getDialogsBaseUrl()}univariate/histogram-standalone.html`;
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 95, displayInIframe: false },
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
            if (univariateResultsDialog) { univariateResultsDialog.close(); univariateResultsDialog = null; }
            setTimeout(() => {
              openNewView(`${getDialogsBaseUrl()}${message.view}`, univariateCurrentResults);
            }, 300);
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

function openNewView(dialogUrl, results) {
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 95, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
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
            if (univariateResultsDialog) { univariateResultsDialog.close(); univariateResultsDialog = null; }
            setTimeout(() => openNewView(`${getDialogsBaseUrl()}${message.view}`, univariateCurrentResults), 300);
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
