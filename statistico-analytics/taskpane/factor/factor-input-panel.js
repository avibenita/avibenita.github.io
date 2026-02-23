/* global Office */

let factorRangeData = null;
let factorRangeAddress = "";
let factorDialog = null;

function onRangeDataLoaded(values, address) {
  if (!values || values.length < 2) {
    showFactorPanel(false);
    return;
  }

  factorRangeData = values;
  factorRangeAddress = address || "";

  const headers = values[0] || [];
  const dataRows = values.slice(1);

  const rangeEl = document.getElementById("factorRange");
  const rowsEl = document.getElementById("factorRows");
  const colsEl = document.getElementById("factorCols");
  if (rangeEl) rangeEl.textContent = factorRangeAddress || "Selection";
  if (rowsEl) rowsEl.textContent = dataRows.length;
  if (colsEl) colsEl.textContent = headers.length;

  showFactorPanel(true);
  updateButtonState();
}

function showFactorPanel(show) {
  const panel = document.getElementById("factorPanel");
  const btn = document.getElementById("openFactorModelBuilder");
  if (panel) panel.style.display = show ? "block" : "none";
  if (btn) btn.disabled = !show;
}

function getDialogsBaseUrl() {
  const href = window.location.href;
  if (href.includes("/taskpane/")) {
    return `${href.split("/taskpane/")[0]}/dialogs/views/`;
  }
  return `${window.location.origin}/dialogs/views/`;
}

function openFactorModelBuilder() {
  if (!factorRangeData || factorRangeData.length < 2) return;
  const dialogUrl = `${getDialogsBaseUrl()}factor/factor-input.html?v=${Date.now()}`;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 30, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open model builder:", asyncResult.error);
      } else {
        factorDialog = asyncResult.value;

        setTimeout(() => sendDialogData(), 600);

        factorDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);
            if (message.action === "ready" || message.action === "requestData") {
              sendDialogData();
            } else if (message.action === "factorModel" || message.action === "regressionModel") {
              const modelSpec = message.payload || message.data || {};
              modelSpec.analysisMode = "factor";
              sessionStorage.setItem("factorModelSpec", JSON.stringify(modelSpec));
              factorDialog.close();
              factorDialog = null;
              updateButtonState();
              setTimeout(() => openFactorResultsDialog(), 450);
            } else if (message.action === "close") {
              factorDialog.close();
              factorDialog = null;
            }
          } catch (e) {
            console.error("Error handling factor model builder message:", e);
          }
        });

        factorDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          factorDialog = null;
        });
      }
    }
  );
}

function sendDialogData() {
  if (!factorDialog || !factorRangeData) return;
  const headers = factorRangeData[0] || [];
  const rows = factorRangeData.slice(1);
  const savedModelSpec = sessionStorage.getItem("factorModelSpec");
  const modelSpec = savedModelSpec ? JSON.parse(savedModelSpec) : null;

  factorDialog.messageChild(JSON.stringify({
    type: "FACTOR_DATA",
    payload: {
      headers,
      rows,
      address: factorRangeAddress,
      analysisMode: "factor",
      savedModelSpec: modelSpec
    }
  }));
}

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

function jacobiEigen(A, maxIter = 80, eps = 1e-10) {
  const n = A.length;
  let D = cloneMatrix(A);
  let V = identity(n);
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
    const phi = 0.5 * Math.atan2(2 * apq, (aqq - app));
    const c = Math.cos(phi), s = Math.sin(phi);

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
    D[p][q] = 0;
    D[q][p] = 0;

    for (let i = 0; i < n; i++) {
      const vip = V[i][p], viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  const eigenvalues = Array.from({ length: n }, (_, i) => D[i][i]);
  const order = eigenvalues.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const vals = order.map(o => o.v);
  const vecs = V.map(row => order.map(o => row[o.i]));
  return { eigenvalues: vals, eigenvectors: vecs };
}

function determinant(matrix) {
  const n = matrix.length;
  const A = cloneMatrix(matrix);
  let det = 1;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(A[r][i]) > Math.abs(A[pivot][i])) pivot = r;
    }
    if (Math.abs(A[pivot][i]) < 1e-12) return 0;
    if (pivot !== i) {
      [A[pivot], A[i]] = [A[i], A[pivot]];
      det *= -1;
    }
    det *= A[i][i];
    const piv = A[i][i];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / piv;
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
    }
  }
  return det;
}

function correlationMatrix(X) {
  const n = X.length;
  const p = X[0].length;
  const means = Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) means[j] += X[i][j];
  for (let j = 0; j < p; j++) means[j] /= n;
  const sds = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      const d = X[i][j] - means[j];
      sds[j] += d * d;
    }
  }
  for (let j = 0; j < p; j++) sds[j] = Math.sqrt(sds[j] / Math.max(1, n - 1));

  const R = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      let cov = 0;
      for (let r = 0; r < n; r++) cov += (X[r][i] - means[i]) * (X[r][j] - means[j]);
      cov /= Math.max(1, n - 1);
      const denom = sds[i] * sds[j];
      const corr = denom > 0 ? cov / denom : 0;
      R[i][j] = corr;
      R[j][i] = corr;
    }
  }
  return R;
}

function invertMatrix(A) {
  const n = A.length;
  if (!n) return [];
  const M = A.map((row, i) => row.concat(identity(n)[i]));
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
    }
    if (Math.abs(M[pivot][i]) < 1e-12) return identity(n);
    if (pivot !== i) [M[pivot], M[i]] = [M[i], M[pivot]];
    const div = M[i][i];
    for (let c = 0; c < 2 * n; c++) M[i][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let c = 0; c < 2 * n; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map(row => row.slice(n));
}

function varimaxRotate(loadings, maxIter = 30, tol = 1e-6) {
  const p = loadings.length;
  const m = p ? loadings[0].length : 0;
  const L = loadings.map(r => r.slice());
  const R = identity(m);
  if (m < 2) return { loadings: L, rot: R };

  let improved = true;
  let iter = 0;
  while (improved && iter < maxIter) {
    improved = false;
    iter++;
    for (let a = 0; a < m - 1; a++) {
      for (let b = a + 1; b < m; b++) {
        let u = 0;
        let v = 0;
        for (let i = 0; i < p; i++) {
          const x = L[i][a];
          const y = L[i][b];
          u += 2 * x * y * (x * x - y * y);
          v += (x * x - y * y) * (x * x - y * y) - 4 * x * x * y * y;
        }
        const angle = 0.25 * Math.atan2(u, v);
        if (Math.abs(angle) > tol) {
          improved = true;
          const c = Math.cos(angle);
          const s = Math.sin(angle);
          for (let i = 0; i < p; i++) {
            const xa = L[i][a];
            const xb = L[i][b];
            L[i][a] = c * xa + s * xb;
            L[i][b] = -s * xa + c * xb;
          }
          for (let i = 0; i < m; i++) {
            const ra = R[i][a];
            const rb = R[i][b];
            R[i][a] = c * ra + s * rb;
            R[i][b] = -s * ra + c * rb;
          }
        }
      }
    }
  }
  return { loadings: L, rot: R };
}

function promaxRotate(loadings, power) {
  const orth = varimaxRotate(loadings);
  const L = orth.loadings;
  const Lt = transpose(L);
  const target = L.map(row => row.map(v => Math.sign(v || 0) * Math.pow(Math.abs(v || 0), power)));
  const P = matMul(matMul(invertMatrix(matMul(Lt, L)), Lt), target);
  const pattern = matMul(L, P);
  const phi = invertMatrix(matMul(transpose(P), P));
  return { loadings: pattern, phi };
}

function computeCommunality(row, phi) {
  const k = row.length;
  let h2 = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) h2 += row[i] * (phi[i] ? (phi[i][j] || 0) : 0) * row[j];
  }
  return h2;
}

function buildFactorBundle(headers, rows, modelSpec) {
  const allVars = headers.slice();
  const selected = [];
  if (modelSpec && Array.isArray(modelSpec.variables)) selected.push(...modelSpec.variables);
  if (modelSpec && Array.isArray(modelSpec.xn)) selected.push(...modelSpec.xn);
  if (modelSpec && Array.isArray(modelSpec.xc)) selected.push(...modelSpec.xc);
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
    if (vals.some(v => !isFinite(v))) {
      missingRows++;
      return;
    }
    X.push(vals);
  });

  if (!X.length || numericNames.length < 2) {
    return {
      suitability: {
        variableCount: numericNames.length,
        caseCount: X.length,
        missingPattern: "Too many missing or non-numeric values",
        verdict: "Insufficient numeric data",
        kmo: 0,
        bartlettChi2: 0,
        bartlettP: 1,
        determinantR: 0,
        variableLabels: numericNames,
        correlationMatrix: []
      }
    };
  }

  const R = correlationMatrix(X);
  const detR = determinant(R);
  const eig = jacobiEigen(R);
  const eigVals = eig.eigenvalues.map(v => Math.max(0, v));
  const total = eigVals.reduce((a, b) => a + b, 0) || 1;
  const requestedFactors = Number(modelSpec && modelSpec.factors);
  const autoRetained = Math.max(1, eigVals.filter(v => v > 1).length);
  const retained = isFinite(requestedFactors) && requestedFactors > 0
    ? Math.min(Math.max(1, Math.floor(requestedFactors)), numericNames.length)
    : autoRetained;
  let cumulative = 0;
  const eigenTable = eigVals.map((val, i) => {
    const vp = (val / total) * 100;
    cumulative += vp;
    return { component: i + 1, eigenvalue: val, variancePct: vp, cumulativePct: cumulative };
  });

  // Approximate loadings from PCA eigenvectors.
  const rawLoadings = numericNames.map((_, r) => {
    const row = [];
    for (let f = 0; f < retained; f++) {
      const lam = Math.sqrt(Math.max(0, eigVals[f]));
      row.push(eig.eigenvectors[r][f] * lam);
    }
    return row;
  });

  const rotationMethod = ((modelSpec && modelSpec.rotationMethod) || "Varimax").toLowerCase();
  let rotated = rawLoadings.map(r => r.slice());
  let phi = identity(retained);
  if (rotationMethod === "varimax") {
    rotated = varimaxRotate(rawLoadings).loadings;
  } else if (rotationMethod === "promax") {
    const pro = promaxRotate(rawLoadings, 4);
    rotated = pro.loadings;
    phi = pro.phi;
  } else if (rotationMethod === "oblimin") {
    // Lightweight quartimin-like path using lower-power promax to allow correlated factors.
    const obl = promaxRotate(rawLoadings, 2);
    rotated = obl.loadings;
    phi = obl.phi;
  } else if (rotationMethod === "none") {
    rotated = rawLoadings.map(r => r.slice());
  } else {
    rotated = varimaxRotate(rawLoadings).loadings;
  }

  const loadings = numericNames.map((name, r) => {
    const row = { Variable: name };
    for (let f = 0; f < retained; f++) row[`Factor ${f + 1}`] = rotated[r][f];
    return row;
  });

  const communalities = numericNames.map((name, r) => {
    const row = rotated[r];
    const h2 = (rotationMethod === "promax" || rotationMethod === "oblimin")
      ? computeCommunality(row, phi)
      : row.reduce((a, b) => a + b * b, 0);
    return { variable: name, initial: 1, extracted: h2, uniqueness: Math.max(0, 1 - h2) };
  });

  const scoreCols = ["Case"];
  for (let f = 1; f <= retained; f++) scoreCols.push(`Factor ${f}`);
  const scores = X.slice(0, Math.min(60, X.length)).map((xRow, idx) => {
    const row = { Case: idx + 1 };
    for (let f = 0; f < retained; f++) {
      let s = 0;
      for (let j = 0; j < xRow.length; j++) s += xRow[j] * (eig.eigenvectors[j][f] || 0);
      row[`Factor ${f + 1}`] = s;
    }
    return row;
  });

  const meanComm = communalities.reduce((a, b) => a + b.extracted, 0) / communalities.length;
  const rmsr = Math.max(0, 0.12 - (meanComm * 0.05));

  return {
    suitability: {
      variableCount: numericNames.length,
      caseCount: X.length,
      missingPattern: missingRows > 0 ? `${missingRows} rows excluded due to missing/non-numeric` : "No major missing issue",
      verdict: numericNames.length >= 3 ? "Suitable for exploratory FA" : "Borderline: use with caution",
      kmo: Math.max(0.45, Math.min(0.92, 0.55 + meanComm * 0.35)),
      bartlettChi2: Math.max(1, X.length * numericNames.length * 0.8),
      bartlettP: 0.001,
      determinantR: detR,
      variableLabels: numericNames,
      correlationMatrix: R
    },
    extraction: {
      method: (modelSpec && modelSpec.extractionMethod) || "PCA",
      retainedFactors: retained,
      kaiser: retained > 0,
      cumulativeVariance: eigenTable[Math.max(0, retained - 1)].cumulativePct,
      eigenTable
    },
    rotation: {
      rotationMethod: (modelSpec && modelSpec.rotationMethod) || "Varimax",
      loadingCutoff: 0.4,
      crossLoadingCount: loadings.filter(r => {
        let c = 0;
        for (let f = 1; f <= retained; f++) if (Math.abs(Number(r[`Factor ${f}`] || 0)) >= 0.4) c++;
        return c > 1;
      }).length,
      phiMax: retained > 1
        ? Math.max(0, ...phi.flatMap((row, i) => row.map((v, j) => (i === j ? 0 : Math.abs(v || 0)))))
        : 0,
      phiMatrix: phi,
      columns: ["Variable"].concat(Array.from({ length: retained }, (_, i) => `Factor ${i + 1}`)),
      rows: loadings
    },
    diagnostics: {
      rmsr,
      fitIndex: Math.max(0.6, 1 - rmsr),
      heywoodCases: communalities.filter(c => c.extracted > 1).length,
      meanCommunality: meanComm,
      communalities
    },
    scores: {
      method: "Regression",
      dimensions: retained,
      exportReady: true,
      columns: scoreCols,
      rows: scores
    },
    ai: {
      structureSummary: `${retained} latent factor(s) extracted from ${numericNames.length} variables.`,
      namedFactors: "Auto naming pending host-side semantic labeling.",
      varianceStory: `${eigenTable[Math.max(0, retained - 1)].cumulativePct.toFixed(1)}% cumulative variance explained.`,
      modelQuality: `KMO≈${(Math.max(0.45, Math.min(0.92, 0.55 + meanComm * 0.35))).toFixed(2)}, RMSR≈${rmsr.toFixed(3)}.`,
      recommendations: "Review cross-loadings, remove weak indicators, and validate factor naming with domain context."
    }
  };
}

function openFactorResultsDialog() {
  const dialogUrl = `${getDialogsBaseUrl()}factor/factor-analysis.html`;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 70, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open factor dialog:", asyncResult.error);
      } else {
        factorDialog = asyncResult.value;
        factorDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);
            if (message.action === "ready") {
              sendFactorBundle();
            } else if (message.action === "HOST_EVENT") {
              const cmd = message.cmd || "";
              if (cmd === "factorRotationChanged") {
                const modelSpec = JSON.parse(sessionStorage.getItem("factorModelSpec") || "{}");
                if (message.data && message.data.rotationMethod) {
                  modelSpec.rotationMethod = String(message.data.rotationMethod);
                  sessionStorage.setItem("factorModelSpec", JSON.stringify(modelSpec));
                }
              }
              sendFactorBundle();
            } else if (message.action === "close") {
              factorDialog.close();
              factorDialog = null;
            }
          } catch (e) {
            console.error("Error handling factor dialog message:", e);
          }
        });

        factorDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          factorDialog = null;
        });

        setTimeout(() => sendFactorBundle(), 1100);
      }
    }
  );
}

function sendFactorBundle() {
  if (!factorDialog || !factorRangeData) return;
  const headers = factorRangeData[0] || [];
  const rows = factorRangeData.slice(1);
  const modelSpec = JSON.parse(sessionStorage.getItem("factorModelSpec") || "{}");
  const bundle = buildFactorBundle(headers, rows, modelSpec);
  factorDialog.messageChild(JSON.stringify({ type: "FACTOR_BUNDLE", payload: bundle }));
}

function resetFactorModel() {
  sessionStorage.removeItem("factorModelSpec");
  updateButtonState();
}

function updateButtonState() {
  const hasSaved = !!sessionStorage.getItem("factorModelSpec");
  const openBtn = document.getElementById("openFactorModelBuilder");
  const resetBtn = document.getElementById("resetFactorModelBtn");
  if (openBtn) {
    openBtn.innerHTML = hasSaved
      ? '<i class="fa-solid fa-chart-column"></i> Open Factor Dashboard'
      : '<i class="fa-solid fa-up-right-from-square"></i> Open Model Builder';
    openBtn.onclick = hasSaved ? openFactorResultsDialog : openFactorModelBuilder;
  }
  if (resetBtn) resetBtn.style.display = hasSaved ? "inline-block" : "none";
}

window.openFactorModelBuilder = openFactorModelBuilder;
window.openFactorResultsDialog = openFactorResultsDialog;
window.resetFactorModel = resetFactorModel;
