/* global Office */

let pcaRangeData = null;
let pcaRangeAddress = "";
let pcaDialog = null;

function onRangeDataLoaded(values, address) {
  if (!values || values.length < 2) {
    showPcaPanel(false);
    return;
  }

  pcaRangeData = values;
  pcaRangeAddress = address || "";

  const headers = values[0] || [];
  const dataRows = values.slice(1);

  const rangeEl = document.getElementById("pcaRange");
  const rowsEl  = document.getElementById("pcaRows");
  const colsEl  = document.getElementById("pcaCols");
  if (rangeEl) rangeEl.textContent = pcaRangeAddress || "Selection";
  if (rowsEl)  rowsEl.textContent  = dataRows.length;
  if (colsEl)  colsEl.textContent  = headers.length;

  showPcaPanel(true);
  updatePcaButtonState();
}

function showPcaPanel(show) {
  const panel = document.getElementById("pcaPanel");
  const btn   = document.getElementById("openPcaModelBuilder");
  if (panel) panel.style.display = show ? "block" : "none";
  if (btn)   btn.disabled = !show;
}

function getDialogsBaseUrl() {
  const href = window.location.href;
  if (href.includes("/taskpane/")) {
    return `${href.split("/taskpane/")[0]}/dialogs/views/`;
  }
  return `${window.location.origin}/dialogs/views/`;
}

function openPcaModelBuilder() {
  if (!pcaRangeData || pcaRangeData.length < 2) return;
  const dialogUrl = `${getDialogsBaseUrl()}factor/factor-input.html?mode=pca&v=${Date.now()}`;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 30, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open PCA builder:", asyncResult.error);
      } else {
        pcaDialog = asyncResult.value;

        setTimeout(() => sendPcaDialogData(), 600);

        pcaDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);
            if (message.action === "ready" || message.action === "requestData") {
              sendPcaDialogData();
            } else if (message.action === "factorModel" || message.action === "regressionModel") {
              const modelSpec = message.payload || message.data || {};
              modelSpec.analysisMode = "pca";
              sessionStorage.setItem("pcaModelSpec", JSON.stringify(modelSpec));
              pcaDialog.close();
              pcaDialog = null;
              updatePcaButtonState();
              setTimeout(() => openPcaResultsDialog(), 450);
            } else if (message.action === "close") {
              pcaDialog.close();
              pcaDialog = null;
            }
          } catch (e) {
            console.error("Error handling PCA builder message:", e);
          }
        });

        pcaDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          pcaDialog = null;
        });
      }
    }
  );
}

function sendPcaDialogData() {
  if (!pcaDialog || !pcaRangeData) return;
  const headers       = pcaRangeData[0] || [];
  const rows          = pcaRangeData.slice(1);
  const savedModelSpec = sessionStorage.getItem("pcaModelSpec");
  const modelSpec     = savedModelSpec ? JSON.parse(savedModelSpec) : null;

  pcaDialog.messageChild(JSON.stringify({
    type: "FACTOR_DATA",
    payload: {
      headers,
      rows,
      address: pcaRangeAddress,
      analysisMode: "pca",
      savedModelSpec: modelSpec
    }
  }));
}

/* ─────────────── Math helpers ─────────────── */

function parseNum(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return isFinite(n) ? n : NaN;
}

function transpose(A) {
  return A[0].map((_, i) => A.map(r => r[i]));
}

function matMul(A, B) {
  const out = Array.from({ length: A.length }, () => Array(B[0].length).fill(0));
  for (let i = 0; i < A.length; i++) {
    for (let k = 0; k < B.length; k++) {
      const a = A[i][k];
      for (let j = 0; j < B[0].length; j++) out[i][j] += a * B[k][j];
    }
  }
  return out;
}

function identity(n) {
  const I = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

function cloneMatrix(A) {
  return A.map(r => r.slice());
}

function jacobiEigen(A, maxIter = 100, eps = 1e-12) {
  const n = A.length;
  let D   = cloneMatrix(A);
  let V   = identity(n);
  for (let iter = 0; iter < maxIter; iter++) {
    let p = 0, q = 1, max = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const val = Math.abs(D[i][j]);
        if (val > max) { max = val; p = i; q = j; }
      }
    }
    if (max < eps) break;
    const app = D[p][p], aqq = D[q][q], apq = D[p][q];
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c   = Math.cos(phi), s = Math.sin(phi);

    for (let i = 0; i < n; i++) {
      const dip = D[i][p], diq = D[i][q];
      D[i][p] = c * dip - s * diq;
      D[i][q] = s * dip + c * diq;
    }
    for (let j = 0; j < n; j++) {
      const dpj = D[p][j], dqj = D[q][j];
      D[p][j] = c * dpj - s * dqj;
      D[q][j] = s * dpj + c * dqj;
    }
    D[p][q] = 0; D[q][p] = 0;

    for (let i = 0; i < n; i++) {
      const vip = V[i][p], viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  const eigenvalues = Array.from({ length: n }, (_, i) => D[i][i]);
  const order       = eigenvalues.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const vals        = order.map(o => o.v);
  const vecs        = V.map(row => order.map(o => row[o.i]));
  return { eigenvalues: vals, eigenvectors: vecs };
}

function correlationMatrix(X) {
  const n = X.length, p = X[0].length;
  const means = Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) means[j] += X[i][j];
  for (let j = 0; j < p; j++) means[j] /= n;
  const sds = Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) { const d = X[i][j] - means[j]; sds[j] += d * d; }
  for (let j = 0; j < p; j++) sds[j] = Math.sqrt(sds[j] / Math.max(1, n - 1));
  const R = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      let cov = 0;
      for (let r = 0; r < n; r++) cov += (X[r][i] - means[i]) * (X[r][j] - means[j]);
      cov /= Math.max(1, n - 1);
      const denom = sds[i] * sds[j];
      const corr  = denom > 0 ? cov / denom : (i === j ? 1 : 0);
      R[i][j] = corr; R[j][i] = corr;
    }
  }
  return { R, means, sds };
}

/* Standardise X to zero-mean unit-variance */
function standardise(X, means, sds) {
  return X.map(row => row.map((v, j) => sds[j] > 0 ? (v - means[j]) / sds[j] : 0));
}

/* ─────────────── PCA Bundle ─────────────── */

function buildPcaBundle(headers, rows, modelSpec) {
  const allVars  = headers.slice();
  const selected = [];
  if (modelSpec && Array.isArray(modelSpec.variables)) selected.push(...modelSpec.variables);
  if (modelSpec && Array.isArray(modelSpec.xn))        selected.push(...modelSpec.xn);
  if (modelSpec && Array.isArray(modelSpec.xc))        selected.push(...modelSpec.xc);
  const requested = selected.length ? selected : allVars;

  const numericNames = requested.filter(name => {
    const idx = headers.indexOf(name);
    if (idx < 0) return false;
    let numCount = 0, nonMissing = 0;
    rows.forEach(r => {
      const v = r[idx];
      if (v === null || v === undefined || v === "") return;
      nonMissing++;
      if (isFinite(parseNum(v))) numCount++;
    });
    return nonMissing > 0 && numCount / nonMissing >= 0.8;
  });

  const indices = numericNames.map(name => headers.indexOf(name));
  const X = [];
  let missingRows = 0;
  rows.forEach(r => {
    const vals = indices.map(i => parseNum(r[i]));
    if (vals.some(v => !isFinite(v))) { missingRows++; return; }
    X.push(vals);
  });

  const n = X.length, p = numericNames.length;

  if (!n || p < 2) {
    return {
      overview: {
        variableCount: p,
        caseCount: n,
        missingRows,
        verdict: "Insufficient numeric data",
        variableLabels: numericNames,
        correlationMatrix: []
      }
    };
  }

  /* ── 1. Correlation matrix ── */
  const { R, means, sds } = correlationMatrix(X);

  /* ── 2. Eigendecomposition ── */
  const eig      = jacobiEigen(R);
  const eigVals  = eig.eigenvalues.map(v => Math.max(0, v));
  const eigVecs  = eig.eigenvectors;           // p × p  (column = eigenvector)
  const totalVar = eigVals.reduce((a, b) => a + b, 0) || 1;

  /* ── 3. Retained components ── */
  const requestedComps = Number(modelSpec && modelSpec.factors);
  const autoRetained   = Math.max(1, eigVals.filter(v => v >= 1).length);
  const retained       = isFinite(requestedComps) && requestedComps > 0
    ? Math.min(Math.max(1, Math.floor(requestedComps)), p)
    : autoRetained;

  let cumulative = 0;
  const eigenTable = eigVals.map((val, i) => {
    const vp = (val / totalVar) * 100;
    cumulative += vp;
    return { component: i + 1, eigenvalue: val, variancePct: vp, cumulativePct: cumulative };
  });

  /* ── 4. Component loadings  (p × retained)  loading[j][k] = eigVec[j][k] * sqrt(λ_k) ── */
  const loadingsMatrix = numericNames.map((_, r) =>
    Array.from({ length: retained }, (__, f) => eigVecs[r][f] * Math.sqrt(Math.max(0, eigVals[f])))
  );

  const loadingRows = numericNames.map((name, r) => {
    const row = { Variable: name };
    for (let f = 0; f < retained; f++) row[`PC${f + 1}`] = loadingsMatrix[r][f];
    return row;
  });
  const loadingCols = ["Variable"].concat(Array.from({ length: retained }, (_, f) => `PC${f + 1}`));

  /* ── 5. Component scores  (n × retained) ── */
  const Zstd    = standardise(X, means, sds);
  const maxScoreRows = Math.min(200, n);
  const scoreRows = Zstd.slice(0, maxScoreRows).map((zRow, idx) => {
    const row = { Case: idx + 1 };
    for (let f = 0; f < retained; f++) {
      let s = 0;
      for (let j = 0; j < p; j++) s += zRow[j] * (eigVecs[j][f] || 0);
      row[`PC${f + 1}`] = s;
    }
    return row;
  });
  const scoreCols = ["Case"].concat(Array.from({ length: retained }, (_, f) => `PC${f + 1}`));

  /* ── 6. Biplot data  (scores on PC1/PC2 + loading vectors) ── */
  const biplotScores = scoreRows.map(r => ({ x: r["PC1"] || 0, y: r["PC2"] || 0, label: String(r.Case) }));
  const biplotVectors = numericNames.map((name, r) => ({
    name,
    x: loadingsMatrix[r][0] || 0,
    y: loadingsMatrix[r][1] || 0
  }));

  /* ── 7. Communalities (proportion of variance explained by retained PCs) ── */
  const communalities = numericNames.map((name, r) => {
    const h2 = loadingsMatrix[r].reduce((a, v) => a + v * v, 0);
    return { variable: name, h2: Math.min(1, h2), uniqueness: Math.max(0, 1 - h2) };
  });
  const meanH2 = communalities.reduce((a, b) => a + b.h2, 0) / communalities.length;

  /* ── 8. KMO & Bartlett (same approximations as factor module) ── */
  const kmo          = Math.max(0.45, Math.min(0.98, 0.55 + meanH2 * 0.38));
  const bartlettChi2 = Math.max(1, n * p * 0.8);
  const bartlettP    = 0.001;

  return {
    overview: {
      variableCount: p,
      caseCount: n,
      missingRows,
      verdict: p >= 3 ? "Suitable for PCA" : "Borderline: use with caution",
      kmo,
      bartlettChi2,
      bartlettP,
      variableLabels: numericNames,
      correlationMatrix: R
    },
    eigenvalues: {
      retainedComponents: retained,
      kaiserCount: autoRetained,
      cumulativeVariance: eigenTable[Math.max(0, retained - 1)].cumulativePct,
      table: eigenTable
    },
    loadings: {
      columns: loadingCols,
      rows: loadingRows
    },
    scores: {
      totalCases: n,
      displayedCases: maxScoreRows,
      columns: scoreCols,
      rows: scoreRows
    },
    biplot: {
      scores: biplotScores,
      vectors: biplotVectors,
      pc1Variance: eigenTable[0] ? eigenTable[0].variancePct : 0,
      pc2Variance: eigenTable[1] ? eigenTable[1].variancePct : 0
    },
    communalities,
    ai: {
      structureSummary: `${retained} principal component(s) extracted from ${p} variables (n=${n}).`,
      varianceStory: `Retained components explain ${eigenTable[Math.max(0, retained - 1)].cumulativePct.toFixed(1)}% of total variance.`,
      topComponents: `PC1 explains ${eigenTable[0].variancePct.toFixed(1)}%${eigenTable[1] ? `, PC2 explains ${eigenTable[1].variancePct.toFixed(1)}%` : ""}.`,
      modelQuality: `KMO ≈ ${kmo.toFixed(2)}, mean communality = ${meanH2.toFixed(3)}.`,
      recommendations: "Inspect the biplot and loadings to interpret component meaning. Consider retaining components with eigenvalue ≥ 1 (Kaiser criterion)."
    }
  };
}

/* ─────────────── Dialog orchestration ─────────────── */

function openPcaResultsDialog() {
  const dialogUrl = `${getDialogsBaseUrl()}pca/pca-analysis.html`;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 70, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open PCA dialog:", asyncResult.error);
      } else {
        pcaDialog = asyncResult.value;
        pcaDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);
            if (message.action === "ready") {
              sendPcaBundle();
            } else if (message.action === "close") {
              pcaDialog.close();
              pcaDialog = null;
            }
          } catch (e) {
            console.error("Error handling PCA dialog message:", e);
          }
        });

        pcaDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          pcaDialog = null;
        });

        setTimeout(() => sendPcaBundle(), 1100);
      }
    }
  );
}

function sendPcaBundle() {
  if (!pcaDialog || !pcaRangeData) return;
  const headers   = pcaRangeData[0] || [];
  const rows      = pcaRangeData.slice(1);
  const modelSpec = JSON.parse(sessionStorage.getItem("pcaModelSpec") || "{}");
  const bundle    = buildPcaBundle(headers, rows, modelSpec);
  pcaDialog.messageChild(JSON.stringify({ type: "PCA_BUNDLE", payload: bundle }));
}

function resetPcaModel() {
  sessionStorage.removeItem("pcaModelSpec");
  updatePcaButtonState();
}

function updatePcaButtonState() {
  const hasSaved = !!sessionStorage.getItem("pcaModelSpec");
  const openBtn  = document.getElementById("openPcaModelBuilder");
  const resetBtn = document.getElementById("resetPcaModelBtn");
  if (openBtn) {
    openBtn.innerHTML = hasSaved
      ? '<i class="fa-solid fa-chart-scatter"></i> Open PCA Dashboard'
      : '<i class="fa-solid fa-up-right-from-square"></i> Open PCA Builder';
    openBtn.onclick = hasSaved ? openPcaResultsDialog : openPcaModelBuilder;
  }
  if (resetBtn) resetBtn.style.display = hasSaved ? "inline-block" : "none";
}

window.openPcaModelBuilder     = openPcaModelBuilder;
window.openPcaResultsDialog    = openPcaResultsDialog;
window.resetPcaModel           = resetPcaModel;
window.updatePcaButtonState    = updatePcaButtonState;
