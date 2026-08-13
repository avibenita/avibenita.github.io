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

  // Keep raw data on the bundle so Results can switch effect measures interactively.
  bundle.source = { headers: headers, rows: rows };
  try {
    sessionStorage.setItem("metaSource", JSON.stringify(bundle.source));
  } catch (_e) {}
  
  // Open results dialog
  openMetaResultsDialog(bundle);
}

function _metaNum(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : NaN;
}

function _metaExtractStudyEffect(row, spec) {
  const effectType = spec.effectType || "continuous";
  const measure = spec.effectMeasure || (effectType === "binary" ? "rr" : effectType === "direct" ? "generic" : "smd");
  let yi = null, vi = null;
  let arms = { sourceKind: effectType };

  if (effectType === "continuous") {
    const mean1 = _metaNum(row[spec.mean1Col]);
    const sd1 = _metaNum(row[spec.sd1Col]);
    const n1 = _metaNum(row[spec.n1Col]);
    const mean2 = _metaNum(row[spec.mean2Col]);
    const sd2 = _metaNum(row[spec.sd2Col]);
    const n2 = _metaNum(row[spec.n2Col]);
    if (![mean1, sd1, n1, mean2, sd2, n2].every(isFinite) || n1 < 2 || n2 < 2 || sd1 < 0 || sd2 < 0) {
      return null;
    }
    arms = {
      sourceKind: "continuous",
      n1: n1,
      n2: n2,
      mean1: mean1,
      sd1: sd1,
      mean2: mean2,
      sd2: sd2,
      totalN: n1 + n2
    };
    if (measure === "md") {
      yi = mean1 - mean2;
      vi = (sd1 * sd1) / n1 + (sd2 * sd2) / n2;
    } else if (measure === "rom") {
      if (!(mean1 > 0 && mean2 > 0)) return null;
      yi = Math.log(mean1 / mean2);
      vi = (sd1 * sd1) / (n1 * mean1 * mean1) + (sd2 * sd2) / (n2 * mean2 * mean2);
    } else if (measure === "cohend") {
      // Cohen's d (uncorrected)
      const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
      if (!(pooledSD > 0)) return null;
      yi = (mean1 - mean2) / pooledSD;
      vi = (n1 + n2) / (n1 * n2) + (yi * yi) / (2 * (n1 + n2));
    } else {
      // Hedges' g (bias-corrected SMD)
      const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
      if (!(pooledSD > 0)) return null;
      const d = (mean1 - mean2) / pooledSD;
      const j = 1 - (3 / (4 * (n1 + n2 - 2) - 1));
      yi = j * d;
      vi = ((n1 + n2) / (n1 * n2) + (yi * yi) / (2 * (n1 + n2))) * j * j;
    }
  } else if (effectType === "binary") {
    let a = _metaNum(row[spec.aCol]);
    let c = _metaNum(row[spec.cCol]);
    let b, d;
    const fmt = spec.binaryFormat || ((spec.bCol != null && spec.dCol != null) ? "events_nonevents" : "events_total");
    if (fmt === "events_nonevents") {
      b = _metaNum(row[spec.bCol]);
      d = _metaNum(row[spec.dCol]);
    } else {
      const n1 = _metaNum(row[spec.n1Col]);
      const n2 = _metaNum(row[spec.n2Col]);
      if (![a, c, n1, n2].every(isFinite) || a < 0 || c < 0 || n1 <= 0 || n2 <= 0 || a > n1 || c > n2) {
        return null;
      }
      b = n1 - a;
      d = n2 - c;
    }
    if (![a, b, c, d].every(isFinite) || a < 0 || b < 0 || c < 0 || d < 0 || a + b === 0 || c + d === 0) {
      return null;
    }
    // Continuity correction for zero cells on ratio measures
    let aa = a, bb = b, cc = c, dd = d;
    if (measure !== "rd" && (aa === 0 || bb === 0 || cc === 0 || dd === 0)) {
      aa += 0.5; bb += 0.5; cc += 0.5; dd += 0.5;
    }
    const n1t = aa + bb, n2t = cc + dd;
    arms = {
      sourceKind: "binary",
      n1: a + b,
      n2: c + d,
      events1: a,
      events2: c,
      totalN: a + b + c + d
    };
    if (measure === "rr") {
      const p1 = aa / n1t, p2 = cc / n2t;
      if (!(p1 > 0 && p2 > 0)) return null;
      yi = Math.log(p1 / p2);
      vi = (1 / aa - 1 / n1t) + (1 / cc - 1 / n2t);
    } else if (measure === "rd") {
      const p1 = a / (a + b), p2 = c / (c + d);
      yi = p1 - p2;
      vi = p1 * (1 - p1) / (a + b) + p2 * (1 - p2) / (c + d);
      if (!(vi > 0)) vi = 1e-12;
    } else {
      // log OR
      yi = Math.log((aa * dd) / (bb * cc));
      vi = 1 / aa + 1 / bb + 1 / cc + 1 / dd;
    }
  } else if (effectType === "direct") {
    yi = _metaNum(row[spec.effectCol]);
    const unc = spec.uncertaintyType || "se";
    if (unc === "variance") {
      vi = _metaNum(row[spec.varCol]);
    } else if (unc === "ci") {
      const lo = _metaNum(row[spec.loCol]);
      const hi = _metaNum(row[spec.hiCol]);
      if (![yi, lo, hi].every(isFinite) || !(hi > lo)) return null;
      // Assume 95% CI → SE = (hi - lo) / (2 * 1.96)
      const se = (hi - lo) / (2 * 1.96);
      vi = se * se;
    } else {
      const se = _metaNum(row[spec.seCol]);
      vi = se * se;
    }
    if (!isFinite(yi) || !isFinite(vi) || !(vi > 0)) return null;
    arms = { sourceKind: "direct" };
  } else {
    return null;
  }

  // outcomeBetter / legacy effectDirection affect interpretation labels only — never flip yi.
  if (!(isFinite(yi) && isFinite(vi) && vi > 0)) return null;
  return Object.assign({ yi: yi, vi: vi, se: Math.sqrt(vi) }, arms);
}

function _metaTau2DL(yi, vi) {
  const k = yi.length;
  const wi = vi.map(function (v) { return 1 / v; });
  const sw = wi.reduce(function (a, b) { return a + b; }, 0);
  const theta = yi.reduce(function (s, y, i) { return s + wi[i] * y; }, 0) / sw;
  const Q = yi.reduce(function (s, y, i) { return s + wi[i] * Math.pow(y - theta, 2); }, 0);
  const sw2 = wi.reduce(function (s, w) { return s + w * w; }, 0);
  const C = sw - sw2 / sw;
  const df = k - 1;
  return { tau2: C > 0 ? Math.max(0, (Q - df) / C) : 0, Q: Q, df: df, thetaFixed: theta, sw: sw };
}

function _metaTau2REML(yi, vi) {
  // Iterative REML (Fisher scoring), seeded with DL.
  const k = yi.length;
  let tau2 = _metaTau2DL(yi, vi).tau2;
  for (let iter = 0; iter < 80; iter++) {
    const wi = vi.map(function (v) { return 1 / (v + tau2); });
    const sw = wi.reduce(function (a, b) { return a + b; }, 0);
    const theta = yi.reduce(function (s, y, i) { return s + wi[i] * y; }, 0) / sw;
    let A = 0, B = 0, R = 0;
    for (let i = 0; i < k; i++) {
      const w = wi[i];
      const r = yi[i] - theta;
      A += w * w;
      B += w * w * w;
      R += w * w * r * r;
    }
    // Score & information for REML restricted likelihood
    const dll = -0.5 * sw + 0.5 * R + 0.5 * (A / sw);
    const d2ll = 0.5 * A - B / sw + 0.5 * (A * A) / (sw * sw);
    if (!(d2ll > 1e-14)) break;
    const step = dll / d2ll;
    const next = Math.max(0, tau2 + step);
    if (Math.abs(next - tau2) < 1e-10) { tau2 = next; break; }
    tau2 = next;
  }
  return tau2;
}

function _metaTCritApprox(df, alphaHalf) {
  // Approximate two-sided t critical (α/2) for common df; falls back to 1.96.
  if (!(df > 0)) return 1.959964;
  // Rough Cornish-Fisher style for 0.025 (95% CI)
  const z = 1.959964;
  const g1 = (Math.pow(z, 3) + z) / (4 * df);
  const g2 = (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
  return z + g1 + g2;
}

function buildMetaBundle(headers, rows, spec) {
  // Core meta-analysis computation
  try {
    const effectType = spec.effectType || "continuous";
    const model = spec.model || "random";
    const tauEstimator = spec.tauEstimator === "dl" ? "dl" : "reml";
    const useHK = model === "random" && spec.hartungKnapp !== false;
    const studyCol = spec.studyCol;
    const effectMeasure = spec.effectMeasure || (effectType === "binary" ? "rr" : effectType === "direct" ? "generic" : "smd");

    const studies = [];
    rows.forEach(function (row, idx) {
      const studyName = row[studyCol] || ("Study " + (idx + 1));
      const extracted = _metaExtractStudyEffect(row, spec);
      if (!extracted) return;
      studies.push(Object.assign({
        name: String(studyName),
        rowIndex: idx,
        yi: extracted.yi,
        vi: extracted.vi,
        se: extracted.se
      }, extracted));
    });

    if (studies.length < 2) {
      return { error: "Need at least 2 valid studies for meta-analysis" };
    }

    const yi = studies.map(function (s) { return s.yi; });
    const vi = studies.map(function (s) { return s.vi; });
    const dl = _metaTau2DL(yi, vi);
    const Q = dl.Q;
    const df = dl.df;
    let tau2 = 0;
    if (model === "random") {
      tau2 = tauEstimator === "dl" ? dl.tau2 : _metaTau2REML(yi, vi);
    }

    const wi = studies.map(function (s) { return 1 / (s.vi + tau2); });
    const sumWi = wi.reduce(function (a, b) { return a + b; }, 0);
    const theta = studies.reduce(function (sum, s, i) { return sum + wi[i] * s.yi; }, 0) / sumWi;

    let se_theta = Math.sqrt(1 / sumWi);
    let crit = 1.959964;
    let p, zOrT;
    if (useHK && df > 0) {
      // Hartung–Knapp–Sidik–Jonkman
      const q = studies.reduce(function (sum, s, i) {
        return sum + wi[i] * Math.pow(s.yi - theta, 2);
      }, 0) / df;
      se_theta = Math.sqrt(Math.max(q, 0) / sumWi);
      crit = _metaTCritApprox(df, 0.025);
      zOrT = se_theta > 0 ? theta / se_theta : 0;
      // Approximate two-sided p with normal for display (t p without full t-CDF)
      p = 2 * (1 - approximateNormalCDF(Math.abs(zOrT) * (1 - 1 / (4 * df))));
    } else {
      zOrT = se_theta > 0 ? theta / se_theta : 0;
      p = 2 * (1 - approximateNormalCDF(Math.abs(zOrT)));
    }
    const ciLower = theta - crit * se_theta;
    const ciUpper = theta + crit * se_theta;

    // 95% prediction interval (random-effects): θ ± t √(SE² + τ²)
    let piLower = null;
    let piUpper = null;
    if (model === "random" && df > 0) {
      const piCrit = useHK ? crit : _metaTCritApprox(df, 0.025);
      const piSe = Math.sqrt(se_theta * se_theta + tau2);
      piLower = theta - piCrit * piSe;
      piUpper = theta + piCrit * piSe;
    }

    const pQ = approximateChiSquare(Q, df);
    const I2 = Q > 0 ? Math.max(0, Math.min(100, 100 * (Q - df) / Q)) : 0;
    const H2 = df > 0 ? Q / df : 1;

    studies.forEach(function (s, i) {
      s.weight = wi[i];
      s.weightPct = (wi[i] / sumWi) * 100;
      s.ciLower = s.yi - 1.96 * s.se;
      s.ciUpper = s.yi + 1.96 * s.se;
    });

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
        piLower: piLower,
        piUpper: piUpper,
        z: zOrT,
        p: p,
        df: useHK ? df : null,
        method: useHK ? "hartung-knapp" : "wald",
        crit: crit
      },
      heterogeneity: {
        Q: Q,
        df: df,
        pQ: pQ,
        I2: I2,
        H2: H2,
        tau2: tau2,
        tau: Math.sqrt(tau2),
        tauEstimator: model === "random" ? tauEstimator : null
      },
      bias: bias,
      model: model,
      effectType: effectType,
      effectMeasure: effectMeasure,
      hartungKnapp: useHK
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
  const df = n - 2;
  const p = 2 * (1 - approximateNormalCDF(Math.abs(t)));
  return {
    available: true,
    intercept: intercept,
    se: seIntercept,
    t: t,
    df: df,
    p: p,
    slope: slope,
    n: n
  };
}

function approximateChiSquare(chiSq, df) {
  // Upper-tail p = P(χ²_df > chiSq) via Wilson–Hilferty normal approximation.
  if (!isFinite(chiSq) || !isFinite(df) || df <= 0) return 1;
  if (chiSq <= 0) return 1;
  const cubeRoot = Math.pow(chiSq / df, 1 / 3);
  const mu = 1 - 2 / (9 * df);
  const sigma = Math.sqrt(2 / (9 * df));
  if (!(sigma > 0)) return 1;
  const z = (cubeRoot - mu) / sigma;
  const p = 1 - approximateNormalCDF(z);
  if (!isFinite(p)) return 1;
  return Math.min(1, Math.max(0, p));
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
      } else if (msg.action === "changeEffectMeasure") {
        var nextM = msg.effectMeasure || (msg.data && msg.data.effectMeasure);
        var nextSpec = msg.spec || (msg.data && msg.data.spec) || null;
        recalculateMetaWithMeasure(nextM, nextSpec);
      } else if (msg.action === "syncMetaSpec" && msg.spec) {
        try { sessionStorage.setItem("metaModelSpec", JSON.stringify(msg.spec)); } catch (_e) {}
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
  let payload = null;
  try { payload = JSON.parse(bundleStr); } catch (_e) { return; }
  if (!payload.source) {
    try {
      const src = JSON.parse(sessionStorage.getItem("metaSource") || "null");
      if (src && src.headers && src.rows) payload.source = src;
    } catch (_e2) {}
  }
  
  metaResultsDialog.messageChild(JSON.stringify({
    type: "META_BUNDLE",
    payload: payload
  }));
}

function recalculateMetaWithMeasure(effectMeasure, incomingSpec) {
  if (!effectMeasure && !(incomingSpec && incomingSpec.effectMeasure)) return;
  let spec = {};
  try { spec = JSON.parse(sessionStorage.getItem("metaModelSpec") || "{}"); } catch (_e) {}
  if (incomingSpec && typeof incomingSpec === "object") {
    spec = Object.assign({}, spec, incomingSpec);
  }
  if (effectMeasure) spec.effectMeasure = effectMeasure;
  sessionStorage.setItem("metaModelSpec", JSON.stringify(spec));

  let headers = null, rows = null;
  try {
    const src = JSON.parse(sessionStorage.getItem("metaSource") || "null");
    if (src && src.headers && src.rows) { headers = src.headers; rows = src.rows; }
  } catch (_e2) {}
  if (!headers) {
    try {
      const prev = JSON.parse(sessionStorage.getItem("metaBundle") || "null");
      if (prev && prev.source && prev.source.headers && prev.source.rows) {
        headers = prev.source.headers;
        rows = prev.source.rows;
      }
    } catch (_e2b) {}
  }
  if (!headers) {
    const range = getMetaRangeValues();
    if (!range) {
      console.warn("[meta] recalculateMetaWithMeasure: no source data");
      return;
    }
    headers = range.values[0];
    rows = range.values.slice(1);
  }

  const bundle = buildMetaBundle(headers, rows, spec);
  if (bundle.error) {
    alert("Error: " + bundle.error);
    return;
  }
  bundle.source = { headers: headers, rows: rows };
  try { sessionStorage.setItem("metaSource", JSON.stringify(bundle.source)); } catch (_e3) {}
  sessionStorage.setItem("metaBundle", JSON.stringify(bundle));
  sendMetaBundle();
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
  bundle.source = { headers: gr.values[0], rows: gr.values.slice(1) };
  try { sessionStorage.setItem('metaSource', JSON.stringify(bundle.source)); } catch (_e) {}
  openMetaResultsDialog(bundle);
  return true;
});
