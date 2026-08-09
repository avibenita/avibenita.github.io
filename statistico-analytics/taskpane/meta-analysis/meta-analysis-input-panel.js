// meta-analysis-input-panel.js
// Handles the taskpane logic for meta-analysis module

let metaDialog = null;
let metaResultsDialog = null;

function onRangeDataLoaded(values, address) {
  const panel = document.getElementById("metaPanel");
  if (!panel) return;
  
  panel.style.display = "block";
  
  const numRows = values.length;
  const numCols = values[0] ? values[0].length : 0;
  
  document.getElementById("metaRange").textContent = address || "—";
  document.getElementById("metaStudies").textContent = numRows > 1 ? numRows - 1 : 0; // Exclude header
  document.getElementById("metaCols").textContent = numCols;
  
  const btn = document.getElementById("openMetaBuilder");
  if (btn) {
    btn.disabled = numRows < 2 || numCols < 3; // Need at least study + effect + SE/variance
  }
  
  updateButtonState();
}

function getMetaRangeValues() {
  if (window.StatisticoGlobalRange) {
    var gr = StatisticoGlobalRange.load();
    if (gr && gr.values && gr.values.length >= 2) {
      return { values: gr.values, address: gr.address || "" };
    }
  }
  var dataPanel = window.dataInputPanelInstance;
  if (dataPanel && dataPanel.values && dataPanel.values.length >= 2) {
    return { values: dataPanel.values, address: dataPanel.address || "" };
  }
  return null;
}

function getMetaDialogsBaseUrl() {
  if (typeof getDialogsBaseUrl === "function") return getDialogsBaseUrl();
  const href = window.location.href;
  if (href.includes("/taskpane/")) return `${href.split("/taskpane/")[0]}/dialogs/views/`;
  return `${window.location.origin}/dialogs/views/`;
}

function unwrapMetaModelSpec(msg) {
  if (!msg) return {};
  var data = msg.payload || msg.data || msg;
  if (data && data.spec) return data.spec;
  return data || {};
}

function openMetaBuilder() {
  const url = `${getMetaDialogsBaseUrl()}meta-analysis/meta-input.html?v=${Date.now()}`;
  
  Office.context.ui.displayDialogAsync(url, DIALOG_SIZES.REGRESSION_BUILDER, (result) => {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error("Failed to open meta builder dialog:", result.error.message);
      return;
    }
    
    metaDialog = result.value;
    
    metaDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
      const msg = JSON.parse(arg.message || "{}");
      
      if (msg.action === "requestData" || msg.action === "ready") {
        sendDialogData();
      } else if (msg.action === "metaModel") {
        handleMetaModel(unwrapMetaModelSpec(msg));
        metaDialog.close();
        metaDialog = null;
      } else if (msg.action === "close" || msg.action === "cancel") {
        try { metaDialog.close(); } catch (_e) {}
        metaDialog = null;
      }
    });
    
    metaDialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
      if (arg.error === 12006) metaDialog = null;
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function sendDialogData() {
  if (!metaDialog) return;
  
  const range = getMetaRangeValues();
  if (!range) {
    console.warn("No data loaded");
    return;
  }
  
  const payload = {
    headers: range.values[0],
    rows: range.values.slice(1),
    address: range.address,
    // Always open the builder fresh — saved spec is only used by results dialogs.
    savedSpec: null
  };
  
  metaDialog.messageChild(JSON.stringify({
    type: "META_DATA",
    payload: payload
  }));
}

function handleMetaModel(spec) {
  sessionStorage.setItem("metaModelSpec", JSON.stringify(spec || {}));
  updateButtonState();
  
  // Build the meta-analysis bundle
  const range = getMetaRangeValues();
  if (!range) return;
  
  const headers = range.values[0];
  const rows = range.values.slice(1);
  
  const bundle = buildMetaBundle(headers, rows, spec);
  
  if (bundle.error) {
    alert("Error: " + bundle.error);
    return;
  }
  
  // Open results dialog
  openMetaResultsDialog(bundle);
}

function buildMetaBundle(headers, rows, spec) {
  // Core meta-analysis computation
  try {
    const effectType = spec.effectType || "continuous";
    const model = spec.model || "random";
    const studyCol = spec.studyCol;
    
    // Extract studies
    const studies = [];
    
    rows.forEach((row, idx) => {
      const studyName = row[studyCol] || `Study ${idx + 1}`;
      let yi = null, vi = null;
      
      if (effectType === "continuous") {
        // Extract Mean/SD/N for both groups
        const mean1 = parseFloat(row[spec.mean1Col]);
        const sd1 = parseFloat(row[spec.sd1Col]);
        const n1 = parseInt(row[spec.n1Col]);
        const mean2 = parseFloat(row[spec.mean2Col]);
        const sd2 = parseFloat(row[spec.sd2Col]);
        const n2 = parseFloat(row[spec.n2Col]);
        
        if (!isFinite(mean1) || !isFinite(sd1) || !isFinite(n1) || 
            !isFinite(mean2) || !isFinite(sd2) || !isFinite(n2)) {
          return; // Skip invalid rows
        }
        
        // Compute Hedges' g (standardized mean difference)
        const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
        const d = (mean1 - mean2) / pooledSD;
        const j = 1 - (3 / (4 * (n1 + n2 - 2) - 1)); // Hedges correction
        yi = j * d;
        vi = ((n1 + n2) / (n1 * n2) + (yi * yi) / (2 * (n1 + n2))) * j * j;
        
      } else if (effectType === "binary") {
        // 2x2 table: a, b, c, d (Haldane–Anscombe 0.5 continuity if any cell is 0)
        let a = parseFloat(row[spec.aCol]);
        let b = parseFloat(row[spec.bCol]);
        let c = parseFloat(row[spec.cCol]);
        let d = parseFloat(row[spec.dCol]);
        
        if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(d) ||
            a < 0 || b < 0 || c < 0 || d < 0 ||
            a + b === 0 || c + d === 0) {
          return; // Skip invalid rows
        }

        if (a === 0 || b === 0 || c === 0 || d === 0) {
          a += 0.5; b += 0.5; c += 0.5; d += 0.5;
        }
        
        // Log odds ratio
        yi = Math.log((a * d) / (b * c));
        vi = 1/a + 1/b + 1/c + 1/d;
        
      } else if (effectType === "direct") {
        // Direct effect + SE
        yi = parseFloat(row[spec.effectCol]);
        const se = parseFloat(row[spec.seCol]);
        vi = se * se;
        
        if (!isFinite(yi) || !isFinite(vi)) return;
      }
      
      if (yi !== null && vi !== null && isFinite(yi) && isFinite(vi) && vi > 0) {
        studies.push({ name: String(studyName), yi: yi, vi: vi, se: Math.sqrt(vi) });
      }
    });
    
    if (studies.length < 2) {
      return { error: "Need at least 2 valid studies for meta-analysis" };
    }
    
    // Fixed-effect weights for Q / DL tau² / I²
    const wiFixed = studies.map(function (s) { return 1 / s.vi; });
    const sumWiFixed = wiFixed.reduce(function (a, b) { return a + b; }, 0);
    const thetaFixed = studies.reduce(function (sum, s, i) {
      return sum + wiFixed[i] * s.yi;
    }, 0) / sumWiFixed;
    const Q = studies.reduce(function (sum, s, i) {
      return sum + wiFixed[i] * Math.pow(s.yi - thetaFixed, 2);
    }, 0);
    const df = studies.length - 1;
    const sumWiFixedSq = wiFixed.reduce(function (sum, w) { return sum + w * w; }, 0);
    const C = sumWiFixed - (sumWiFixedSq / sumWiFixed);
    let tau2 = 0;
    if (model === "random" && C > 0) {
      tau2 = Math.max(0, (Q - df) / C);
    }
    
    // Compute final pooled estimate (fixed or DL random)
    const wi = studies.map(function (s) { return 1 / (s.vi + tau2); });
    const sumWi = wi.reduce(function (a, b) { return a + b; }, 0);
    const theta = studies.reduce(function (sum, s, i) { return sum + wi[i] * s.yi; }, 0) / sumWi;
    const se_theta = Math.sqrt(1 / sumWi);
    const ciLower = theta - 1.96 * se_theta;
    const ciUpper = theta + 1.96 * se_theta;
    const z = theta / se_theta;
    const p = 2 * (1 - approximateNormalCDF(Math.abs(z)));
    
    const pQ = approximateChiSquare(Q, df);
    const I2 = Q > 0 ? Math.max(0, Math.min(100, 100 * (Q - df) / Q)) : 0;
    const H2 = df > 0 ? Q / df : 1;
    
    // Add weights to studies
    studies.forEach(function (s, i) {
      s.weight = wi[i];
      s.weightPct = (wi[i] / sumWi) * 100;
      s.ciLower = s.yi - 1.96 * s.se;
      s.ciUpper = s.yi + 1.96 * s.se;
    });

    // Egger's regression test (precision vs standardized effect)
    const bias = computeEggersTest(studies);
    
    return {
      spec: spec,
      studies: studies,
      k: studies.length,
      pooled: {
        effect: theta,
        se: se_theta,
        ciLower: ciLower,
        ciUpper: ciUpper,
        z: z,
        p: p
      },
      heterogeneity: {
        Q: Q,
        df: df,
        pQ: pQ,
        I2: I2,
        H2: H2,
        tau2: tau2,
        tau: Math.sqrt(tau2)
      },
      bias: bias,
      model: model,
      effectType: effectType
    };
    
  } catch (err) {
    return { error: err.message };
  }
}

function approximateNormalCDF(z) {
  // Approximation of standard normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function computeEggersTest(studies) {
  // Regress SND = yi/se on precision = 1/se; Egger's intercept tests asymmetry.
  if (!studies || studies.length < 3) {
    return { available: false, reason: "Need at least 3 studies for Egger's test" };
  }
  const n = studies.length;
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const se = studies[i].se || Math.sqrt(studies[i].vi);
    if (!(se > 0)) continue;
    const x = 1 / se;
    const y = studies[i].yi / se;
    sumX += x; sumY += y; sumXX += x * x; sumXY += x * y; sumYY += y * y;
  }
  const denom = n * sumXX - sumX * sumX;
  if (!(Math.abs(denom) > 1e-12)) {
    return { available: false, reason: "Egger's test could not be estimated" };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const yHatVar = (sumYY - intercept * sumY - slope * sumXY) / Math.max(1, n - 2);
  const seIntercept = Math.sqrt(Math.max(0, yHatVar) * (sumXX / denom));
  if (!(seIntercept > 0)) {
    return { available: false, reason: "Egger's test could not be estimated" };
  }
  const t = intercept / seIntercept;
  const p = 2 * (1 - approximateNormalCDF(Math.abs(t)));
  return {
    available: true,
    intercept: intercept,
    se: seIntercept,
    t: t,
    p: p,
    slope: slope,
    n: n
  };
}

function approximateChiSquare(chiSq, df) {
  // Simple chi-square p-value approximation
  if (!isFinite(chiSq) || chiSq <= 0) return 1;
  if (chiSq > 20) return 0.0001;
  
  if (df === 1) {
    if (chiSq < 2.71) return 0.1;
    if (chiSq < 3.84) return 0.05;
    if (chiSq < 6.63) return 0.01;
    return 0.001;
  } else if (df === 2) {
    if (chiSq < 4.61) return 0.1;
    if (chiSq < 5.99) return 0.05;
    if (chiSq < 9.21) return 0.01;
    return 0.001;
  } else if (df >= 3) {
    if (chiSq < df + 1) return 0.5;
    if (chiSq < df + 2) return 0.2;
    if (chiSq < df + 3) return 0.1;
    if (chiSq < df + 5) return 0.05;
    return 0.01;
  }
  return 0.05;
}

function openMetaResultsDialog(bundle) {
  sessionStorage.setItem("metaBundle", JSON.stringify(bundle));

  function getDialogsBaseUrl() {
    const href = window.location.href;
    if (href.includes("/taskpane/")) return `${href.split("/taskpane/")[0]}/dialogs/views/`;
    return `${window.location.origin}/dialogs/views/`;
  }

  const url = `${getDialogsBaseUrl()}meta-analysis/meta-results.html?v=${Date.now()}`;
  
  Office.context.ui.displayDialogAsync(url, DIALOG_SIZES.RESULTS, (result) => {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error("Failed to open results dialog:", result.error.message);
      return;
    }
    
    metaResultsDialog = result.value;
    if (window.HubResultsBridge) HubResultsBridge.registerDialog(metaResultsDialog);
    
    metaResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
      const msg = JSON.parse(arg.message || "{}");
      
      if (msg.action === "ready" || msg.action === "requestData") {
        sendMetaBundle();
      } else if (msg.action === "close" || msg.action === "closeDialog") {
        try { metaResultsDialog.close(); } catch (_e) {}
        metaResultsDialog = null;
        if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
      }
    });
    
    metaResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
      if (arg.error === 12006) metaResultsDialog = null;
      if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
    });
  });
}

function sendMetaBundle() {
  if (!metaResultsDialog) return;
  
  const bundleStr = sessionStorage.getItem("metaBundle");
  if (!bundleStr) return;
  
  metaResultsDialog.messageChild(JSON.stringify({
    type: "META_BUNDLE",
    payload: JSON.parse(bundleStr)
  }));
}

function resetMetaModel() {
  sessionStorage.removeItem("metaModelSpec");
  updateButtonState();
}

function updateButtonState() {
  const spec = sessionStorage.getItem("metaModelSpec");
  const hasSpec = !!spec;
  
  const openBtn = document.getElementById("openMetaBuilder");
  const resetBtn = document.getElementById("resetMetaModelBtn");
  
  if (openBtn) {
    openBtn.textContent = hasSpec ? "✓ Reconfigure Meta-Analysis" : "Configure Meta-Analysis";
  }
  
  if (resetBtn) {
    resetBtn.style.display = hasSpec ? "inline-block" : "none";
  }
}

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    var gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})('meta-analysis', function (gr) {
  var spec = {};
  try { spec = JSON.parse(sessionStorage.getItem('metaModelSpec') || '{}'); } catch (_e) {}
  var bundle = buildMetaBundle(gr.values[0], gr.values.slice(1), spec);
  if (bundle.error) {
    alert('Error: ' + bundle.error);
    return false;
  }
  openMetaResultsDialog(bundle);
  return true;
});
