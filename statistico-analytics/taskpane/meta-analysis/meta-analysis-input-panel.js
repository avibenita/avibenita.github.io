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

function openMetaBuilder() {
  const url = window.location.origin + window.location.pathname.replace("meta-analysis.html", "../../dialogs/views/meta-analysis/meta-input.html");
  
  Office.context.ui.displayDialogAsync(url, {height: 70, width: 50}, (result) => {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error("Failed to open meta builder dialog:", result.error.message);
      return;
    }
    
    metaDialog = result.value;
    
    metaDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
      const msg = JSON.parse(arg.message || "{}");
      
      if (msg.action === "requestData") {
        sendDialogData();
      } else if (msg.action === "ready") {
        sendDialogData();
      } else if (msg.action === "metaModel") {
        handleMetaModel(msg.spec);
        metaDialog.close();
        metaDialog = null;
      }
    });
    
    metaDialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
      if (arg.error === 12006) { // Dialog closed by user
        metaDialog = null;
      }
    });
  });
}

function sendDialogData() {
  if (!metaDialog) return;
  
  const dataPanel = window.dataInputPanelInstance;
  if (!dataPanel || !dataPanel.values || dataPanel.values.length < 2) {
    console.warn("No data loaded");
    return;
  }
  
  const savedSpec = sessionStorage.getItem("metaModelSpec");
  const spec = savedSpec ? JSON.parse(savedSpec) : null;
  
  const payload = {
    headers: dataPanel.values[0],
    rows: dataPanel.values.slice(1),
    address: dataPanel.address,
    savedSpec: spec
  };
  
  metaDialog.messageChild(JSON.stringify({
    type: "META_DATA",
    payload: payload
  }));
}

function handleMetaModel(spec) {
  sessionStorage.setItem("metaModelSpec", JSON.stringify(spec));
  updateButtonState();
  
  // Build the meta-analysis bundle
  const dataPanel = window.dataInputPanelInstance;
  if (!dataPanel || !dataPanel.values) return;
  
  const headers = dataPanel.values[0];
  const rows = dataPanel.values.slice(1);
  
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
        // 2x2 table: a, b, c, d
        const a = parseInt(row[spec.aCol]);
        const b = parseInt(row[spec.bCol]);
        const c = parseInt(row[spec.cCol]);
        const d = parseInt(row[spec.dCol]);
        
        if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(d) || 
            a + b === 0 || c + d === 0 || a + c === 0 || b + d === 0) {
          return; // Skip invalid rows
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
        studies.push({ name: studyName, yi, vi });
      }
    });
    
    if (studies.length < 2) {
      return { error: "Need at least 2 valid studies for meta-analysis" };
    }
    
    // Compute weights and pooled effect
    let tau2 = 0; // Between-study variance
    
    if (model === "random") {
      // DerSimonian-Laird estimator for tau²
      const wi_fixed = studies.map(s => 1 / s.vi);
      const sumWi = wi_fixed.reduce((a, b) => a + b, 0);
      const sumWiYi = studies.reduce((sum, s, i) => sum + wi_fixed[i] * s.yi, 0);
      const theta_fixed = sumWiYi / sumWi;
      
      const Q = studies.reduce((sum, s, i) => {
        return sum + wi_fixed[i] * Math.pow(s.yi - theta_fixed, 2);
      }, 0);
      
      const df = studies.length - 1;
      const C = sumWi - studies.reduce((sum, w) => sum + w * w, 0) / sumWi;
      
      tau2 = Math.max(0, (Q - df) / C);
    }
    
    // Compute final pooled estimate
    const wi = studies.map(s => 1 / (s.vi + tau2));
    const sumWi = wi.reduce((a, b) => a + b, 0);
    const theta = studies.reduce((sum, s, i) => sum + wi[i] * s.yi, 0) / sumWi;
    const se_theta = Math.sqrt(1 / sumWi);
    const ciLower = theta - 1.96 * se_theta;
    const ciUpper = theta + 1.96 * se_theta;
    const z = theta / se_theta;
    const p = 2 * (1 - approximateNormalCDF(Math.abs(z)));
    
    // Heterogeneity statistics
    const Q = studies.reduce((sum, s, i) => sum + wi[i] * Math.pow(s.yi - theta, 2), 0);
    const df = studies.length - 1;
    const pQ = approximateChiSquare(Q, df);
    const I2 = df > 0 ? Math.max(0, 100 * (Q - df) / Q) : 0;
    const H2 = df > 0 ? Q / df : 1;
    
    // Add weights to studies
    studies.forEach((s, i) => {
      s.weight = wi[i];
      s.weightPct = (wi[i] / sumWi) * 100;
    });
    
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
      model: model
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
  // Save bundle to session
  sessionStorage.setItem("metaBundle", JSON.stringify(bundle));
  
  const url = window.location.origin + window.location.pathname.replace("meta-analysis.html", "../../dialogs/views/meta-analysis/meta-results.html");
  
  Office.context.ui.displayDialogAsync(url, {height: 90, width: 85}, (result) => {
    if (result.status === Office.AsyncResultStatus.Failed) {
      console.error("Failed to open results dialog:", result.error.message);
      return;
    }
    
    metaResultsDialog = result.value;
    
    metaResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
      const msg = JSON.parse(arg.message || "{}");
      
      if (msg.action === "ready") {
        sendMetaBundle();
      }
    });
    
    metaResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
      if (arg.error === 12006) {
        metaResultsDialog = null;
      }
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
