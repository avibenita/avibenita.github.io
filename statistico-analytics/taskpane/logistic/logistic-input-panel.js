/* global Office */

let logisticRangeData = null;
let logisticRangeAddress = "";
let logisticDialog = null;
let logisticComputedState = null;

function onRangeDataLoaded(values, address) {
  if (!values || values.length < 2) {
    showLogisticPanel(false);
    return;
  }

  logisticRangeData = values;
  logisticRangeAddress = address || "";

  const headers = values[0] || [];
  const dataRows = values.slice(1);

  const rangeEl = document.getElementById("logRange");
  const rowsEl = document.getElementById("logRows");
  const colsEl = document.getElementById("logCols");
  if (rangeEl) rangeEl.textContent = logisticRangeAddress || "Selection";
  if (rowsEl) rowsEl.textContent = dataRows.length;
  if (colsEl) colsEl.textContent = headers.length;

  showLogisticPanel(true);
  updateButtonState();
}

function showLogisticPanel(show) {
  const panel = document.getElementById("logisticPanel");
  const btn = document.getElementById("openLogisticModelBuilder");
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

function openLogisticModelBuilder() {
  if (!logisticRangeData || logisticRangeData.length < 2) return;

  const dialogUrl = `${getDialogsBaseUrl()}logistic/logistic-input.html`;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 30, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open model builder:", asyncResult.error);
      } else {
        logisticDialog = asyncResult.value;

        setTimeout(() => sendDialogData(), 600);

        logisticDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);
            if (message.action === "ready" || message.action === "requestData") {
              sendDialogData();
            } else if (message.action === "logisticModel" || message.action === "regressionModel") {
              // Reuse existing model builder output and store under logistic spec key.
              const modelSpec = message.payload || message.data || {};
              modelSpec.analysisMode = "logistic";
              sessionStorage.setItem("logisticModelSpec", JSON.stringify(modelSpec));
              logisticDialog.close();
              logisticDialog = null;
              updateButtonState();
              setTimeout(() => openLogisticResultsDialog(), 450);
            } else if (message.action === "close") {
              logisticDialog.close();
              logisticDialog = null;
            }
          } catch (e) {
            console.error("Error handling logistic model builder message:", e);
          }
        });

        logisticDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          logisticDialog = null;
        });
      }
    }
  );
}

function sendDialogData() {
  if (!logisticDialog || !logisticRangeData) return;
  const headers = logisticRangeData[0] || [];
  const rows = logisticRangeData.slice(1);
  const savedModelSpec = sessionStorage.getItem("logisticModelSpec");
  const modelSpec = savedModelSpec ? JSON.parse(savedModelSpec) : null;

  logisticDialog.messageChild(JSON.stringify({
    type: "LOGISTIC_DATA",
    payload: {
      headers,
      rows,
      address: logisticRangeAddress,
      analysisMode: "logistic",
      savedModelSpec: modelSpec
    }
  }));
}

function openLogisticResultsDialog() {
  const dialogUrl = `${getDialogsBaseUrl()}logistic/logistic-results.html`;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 70, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open logistic dialog:", asyncResult.error);
      } else {
        logisticDialog = asyncResult.value;

        logisticDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);
            if (message.action === "ready") {
              sendLogisticBundle();
            } else if (message.action === "HOST_EVENT") {
              if (message.cmd === "logisticThresholdChanged") {
                const threshold = Number(message.data && message.data.threshold);
                if (isFinite(threshold)) {
                  sendThresholdUpdate(threshold);
                }
              } else {
                console.log("Logistic host event:", message.cmd, message.data);
              }
            } else if (message.action === "close") {
              logisticDialog.close();
              logisticDialog = null;
            }
          } catch (e) {
            console.error("Error handling logistic dialog message:", e);
          }
        });

        logisticDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          logisticDialog = null;
        });

        // Fallback if ready signal is missed.
        setTimeout(() => sendLogisticBundle(), 1100);
      }
    }
  );
}

function sendLogisticBundle() {
  if (!logisticDialog || !logisticRangeData) return;

  const headers = logisticRangeData[0] || [];
  const rows = logisticRangeData.slice(1);
  const modelSpec = JSON.parse(sessionStorage.getItem("logisticModelSpec") || "{}");

  try {
    const computed = computeLogisticBundle(headers, rows, modelSpec, 0.5);
    logisticComputedState = computed.state;
    logisticDialog.messageChild(JSON.stringify({
      type: "LOGISTIC_BUNDLE",
      payload: computed.bundle
    }));
  } catch (err) {
    console.error("Logistic computation failed:", err);
    logisticDialog.messageChild(JSON.stringify({
      type: "LOGISTIC_BUNDLE",
      payload: {
        results: {
          observations: 0,
          events: 0,
          nonEvents: 0,
          predictors: 0,
          includeIntercept: modelSpec.intercept !== false,
          link: "Logit",
          overallPValue: "Computation error"
        },
        coefficients: [],
        predictions: [],
        diagnostics: {},
        descriptives: {
          separationRisk: "Computation error",
          sparseCells: "Computation error",
          missingPattern: "Computation error",
          rows: []
        }
      }
    }));
  }
}

function sendThresholdUpdate(threshold) {
  if (!logisticDialog || !logisticComputedState) return;

  const metrics = computeClassificationMetrics(logisticComputedState.y, logisticComputedState.probabilities, threshold);
  logisticDialog.messageChild(JSON.stringify({ type: "LOGISTIC_RESULTS", payload: metrics.resultsPatch }));
  logisticDialog.messageChild(JSON.stringify({ type: "LOGISTIC_PREDICTIONS", payload: metrics.predictionRows }));
}

function computeLogisticBundle(headers, rows, modelSpec, threshold) {
  const yName = modelSpec.y || headers[0];
  const xn = modelSpec.xn || [];
  const xc = modelSpec.xc || [];
  const includeIntercept = modelSpec.intercept !== false;
  const yIdx = headers.indexOf(yName);

  if (yIdx < 0) throw new Error("Y variable not found in data headers");

  const xnIdx = xn.map(name => ({ name, idx: headers.indexOf(name) })).filter(v => v.idx >= 0);
  const xcIdx = xc.map(name => ({ name, idx: headers.indexOf(name) })).filter(v => v.idx >= 0);

  const catLevels = {};
  xcIdx.forEach(c => {
    const levels = [];
    rows.forEach(r => {
      const v = r[c.idx];
      if (v === null || v === undefined || v === "") return;
      const k = String(v);
      if (levels.indexOf(k) === -1) levels.push(k);
    });
    levels.sort();
    catLevels[c.name] = levels;
  });

  const predictorNames = [];
  xnIdx.forEach(v => predictorNames.push(v.name));
  const referenceMap = {};
  xcIdx.forEach(c => {
    const levels = catLevels[c.name] || [];
    referenceMap[c.name] = levels.length > 0 ? levels[0] : "—";
    for (let i = 1; i < levels.length; i++) {
      predictorNames.push(`${c.name}_${levels[i]}`);
    }
  });

  const X = [];
  const y = [];
  let droppedMissing = 0;

  rows.forEach(r => {
    const yValRaw = r[yIdx];
    if (yValRaw === null || yValRaw === undefined || yValRaw === "") {
      droppedMissing++;
      return;
    }
    const yNum = Number(yValRaw);
    if (!(yNum === 0 || yNum === 1)) {
      droppedMissing++;
      return;
    }

    const xRow = [];

    for (let i = 0; i < xnIdx.length; i++) {
      const val = Number(r[xnIdx[i].idx]);
      if (!isFinite(val)) {
        droppedMissing++;
        return;
      }
      xRow.push(val);
    }

    for (let i = 0; i < xcIdx.length; i++) {
      const c = xcIdx[i];
      const levels = catLevels[c.name] || [];
      const raw = r[c.idx];
      if (raw === null || raw === undefined || raw === "") {
        droppedMissing++;
        return;
      }
      const sval = String(raw);
      for (let j = 1; j < levels.length; j++) {
        xRow.push(sval === levels[j] ? 1 : 0);
      }
    }

    X.push(xRow);
    y.push(yNum);
  });

  if (X.length < 10) throw new Error("Not enough valid observations after filtering");

  const fit = fitLogisticIRLS(X, y, includeIntercept);
  const n = y.length;
  const k = fit.coefficients.length;
  const llFull = logLikelihood(y, fit.probabilities);
  const pNull = Math.min(1 - 1e-9, Math.max(1e-9, y.reduce((a, b) => a + b, 0) / n));
  const llNull = y.reduce((sum, yi) => sum + (yi === 1 ? Math.log(pNull) : Math.log(1 - pNull)), 0);

  const deviance = -2 * llFull;
  const n2ll = deviance;
  const aic = 2 * k - 2 * llFull;
  const bic = Math.log(n) * k - 2 * llFull;
  const lr = Math.max(0, 2 * (llFull - llNull));
  const dfTest = Math.max(1, k - (includeIntercept ? 1 : 0));
  const lrP = chiSquareSurvival(lr, dfTest);

  const mcfadden = llNull === 0 ? 0 : 1 - (llFull / llNull);
  const coxSnell = 1 - Math.exp((2 / n) * (llNull - llFull));
  const maxCoxSnell = 1 - Math.exp((2 / n) * llNull);
  const nagelkerke = maxCoxSnell > 0 ? coxSnell / maxCoxSnell : 0;

  const auc = computeAUC(y, fit.probabilities);
  const gini = 2 * auc - 1;
  const ks = computeKS(y, fit.probabilities);
  const liftGain = computeLiftGain(y, fit.probabilities);

  const coeffRows = buildCoefficientRows(fit, predictorNames, includeIntercept, referenceMap);
  const diagnostics = computeDiagnostics(y, fit.probabilities, fit.X, fit.covariance);
  const descriptives = buildDescriptives(rows, headers, yIdx, xnIdx, xcIdx, droppedMissing);
  const metrics = computeClassificationMetrics(y, fit.probabilities, threshold);

  const results = Object.assign({
    observations: n,
    events: y.reduce((a, b) => a + b, 0),
    nonEvents: n - y.reduce((a, b) => a + b, 0),
    predictors: predictorNames.length,
    includeIntercept: includeIntercept,
    link: "Logit",
    neg2LogLikelihood: fmt(n2ll),
    deviance: fmt(deviance),
    aic: fmt(aic),
    bic: fmt(bic),
    mcfaddenR2: fmt(mcfadden),
    coxSnellR2: fmt(coxSnell),
    nagelkerkeR2: fmt(nagelkerke),
    lrTest: fmt(lr),
    waldTest: fmt(sumWald(fit)),
    scoreTest: fmt(lr),
    overallPValue: fmtP(lrP),
    auc: fmt(auc),
    gini: fmt(gini),
    ks: fmt(ks),
    topDecileLift: fmt(liftGain.topDecileLift),
    gain20: fmtPct(liftGain.gain20),
    gain40: fmtPct(liftGain.gain40)
  }, metrics.resultsPatch);

  return {
    state: {
      y,
      probabilities: fit.probabilities
    },
    bundle: {
      results,
      coefficients: coeffRows,
      predictions: metrics.predictionRows,
      diagnostics,
      descriptives
    }
  };
}

function fitLogisticIRLS(Xraw, y, includeIntercept) {
  const X = includeIntercept ? Xraw.map(r => [1].concat(r)) : Xraw.map(r => r.slice());
  const n = X.length;
  const p = X[0].length;
  let beta = new Array(p).fill(0);
  let covariance = null;
  const maxIter = 60;
  const tol = 1e-6;

  for (let iter = 0; iter < maxIter; iter++) {
    const eta = X.map(r => dot(r, beta));
    const mu = eta.map(sigmoid);
    const w = mu.map(m => Math.max(1e-8, m * (1 - m)));
    const z = eta.map((e, i) => e + (y[i] - mu[i]) / w[i]);

    const XtWX = zeroMatrix(p, p);
    const XtWz = new Array(p).fill(0);

    for (let i = 0; i < n; i++) {
      for (let a = 0; a < p; a++) {
        XtWz[a] += X[i][a] * w[i] * z[i];
        for (let b = 0; b < p; b++) {
          XtWX[a][b] += X[i][a] * w[i] * X[i][b];
        }
      }
    }

    let XtWXInv;
    try {
      XtWXInv = matrixInverseWithRidge(XtWX);
    } catch (_e) {
      throw new Error("Could not invert information matrix");
    }

    const betaNew = multiplyMatrixVector(XtWXInv, XtWz);
    const maxDiff = maxAbsDiff(betaNew, beta);
    beta = betaNew;
    covariance = XtWXInv;

    if (maxDiff < tol) break;
  }

  const eta = X.map(r => dot(r, beta));
  const probabilities = eta.map(sigmoid);
  const se = covariance ? covariance.map((row, i) => Math.sqrt(Math.max(0, row[i]))) : new Array(p).fill(NaN);

  return { X, coefficients: beta, stdErrors: se, covariance, probabilities };
}

function computeClassificationMetrics(y, probabilities, threshold) {
  const t = isFinite(threshold) ? threshold : 0.5;
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const rows = [];

  for (let i = 0; i < y.length; i++) {
    const pred = probabilities[i] >= t ? 1 : 0;
    const obs = y[i];
    if (obs === 1 && pred === 1) tp++;
    else if (obs === 0 && pred === 1) fp++;
    else if (obs === 0 && pred === 0) tn++;
    else fn++;
    rows.push({
      Observed: obs,
      Probability: fmt(probabilities[i]),
      PredictedClass: pred
    });
  }

  const total = Math.max(1, y.length);
  const acc = (tp + tn) / total;
  const sens = tp + fn > 0 ? tp / (tp + fn) : 0;
  const spec = tn + fp > 0 ? tn / (tn + fp) : 0;
  const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
  const f1 = (prec + sens) > 0 ? (2 * prec * sens) / (prec + sens) : 0;

  return {
    predictionRows: rows.slice(0, 500),
    resultsPatch: {
      accuracy: fmtPct(acc),
      sensitivity: fmtPct(sens),
      specificity: fmtPct(spec),
      precision: fmtPct(prec),
      f1: fmtPct(f1),
      tp, fp, tn, fn
    }
  };
}

function buildCoefficientRows(fit, predictorNames, includeIntercept, referenceMap) {
  const rows = [];
  const beta = fit.coefficients;
  const se = fit.stdErrors;

  const names = includeIntercept ? ["Intercept"].concat(predictorNames) : predictorNames.slice();
  for (let i = 0; i < names.length; i++) {
    const b = beta[i];
    const s = se[i];
    const z = s > 0 ? b / s : NaN;
    const p = isFinite(z) ? 2 * (1 - normalCDF(Math.abs(z))) : NaN;
    const ciLow = b - 1.96 * s;
    const ciUp = b + 1.96 * s;

    let reference = "—";
    const varName = names[i];
    const baseName = varName.indexOf("_") > 0 ? varName.split("_")[0] : varName;
    if (referenceMap[baseName] && varName !== "Intercept") {
      reference = referenceMap[baseName];
    }

    rows.push({
      Variable: varName,
      Beta: fmt(b),
      SE: fmt(s),
      WaldZ: fmt(z),
      PValue: fmtP(p),
      OR: fmt(Math.exp(b)),
      OR_CI_Lower: fmt(Math.exp(ciLow)),
      OR_CI_Upper: fmt(Math.exp(ciUp)),
      Reference: reference
    });
  }

  return rows;
}

function computeDiagnostics(y, p, X, covariance) {
  const n = y.length;
  const k = X[0].length;
  const dev = [];
  const pear = [];
  const leverages = [];
  const cooks = [];
  let maxDfbeta = 0;

  for (let i = 0; i < n; i++) {
    const pi = clamp(p[i], 1e-9, 1 - 1e-9);
    const wi = Math.max(1e-8, pi * (1 - pi));
    const yi = y[i];
    const devTerm = 2 * (
      (yi === 1 ? Math.log(1 / pi) : 0) +
      (yi === 0 ? Math.log(1 / (1 - pi)) : 0)
    );
    const dr = (yi - pi >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, devTerm));
    const pr = (yi - pi) / Math.sqrt(wi);
    dev.push(dr);
    pear.push(pr);

    let h = 0;
    if (covariance) {
      const v = multiplyMatrixVector(covariance, X[i]);
      h = wi * dot(X[i], v);
    }
    h = clamp(h, 0, 0.9999);
    leverages.push(h);

    const cook = (pr * pr * h) / (Math.max(1, k) * Math.pow(1 - h, 2));
    cooks.push(cook);

    if (covariance) {
      const scoreScale = (yi - pi) / Math.max(1e-8, (1 - h));
      for (let j = 0; j < covariance.length; j++) {
        const dfb = Math.abs(covariance[j].reduce((s, cij, idx) => s + cij * X[i][idx], 0) * scoreScale);
        if (dfb > maxDfbeta) maxDfbeta = dfb;
      }
    }
  }

  const outlierCount = dev.filter(v => Math.abs(v) > 2).length;

  return {
    devianceResidualMean: fmt(mean(dev)),
    devianceResidualSd: fmt(std(dev)),
    pearsonResidualMean: fmt(mean(pear)),
    pearsonResidualSd: fmt(std(pear)),
    maxLeverage: fmt(max(leverages)),
    maxCooksDistance: fmt(max(cooks)),
    maxDfbeta: fmt(maxDfbeta),
    outlierCount: outlierCount
  };
}

function buildDescriptives(rows, headers, yIdx, xnIdx, xcIdx, droppedMissing) {
  const descriptiveRows = [];
  let sparseCount = 0;
  let separationFlags = [];

  xcIdx.forEach(c => {
    const levelMap = {};
    rows.forEach(r => {
      const yv = Number(r[yIdx]);
      const cv = r[c.idx];
      if (!(yv === 0 || yv === 1) || cv === null || cv === undefined || cv === "") return;
      const key = String(cv);
      if (!levelMap[key]) levelMap[key] = { n: 0, events: 0 };
      levelMap[key].n++;
      levelMap[key].events += yv;
    });

    Object.keys(levelMap).forEach(level => {
      const d = levelMap[level];
      if (d.n < 5) sparseCount++;
      const rate = d.n > 0 ? d.events / d.n : 0;
      if ((rate === 0 || rate === 1) && d.n >= 5) separationFlags.push(`${c.name}:${level}`);
      descriptiveRows.push({
        Predictor: `${c.name}=${level}`,
        EventRate: fmtPct(rate),
        MeanByOutcome: "—",
        Notes: `n=${d.n}`
      });
    });
  });

  xnIdx.forEach(x => {
    let sum0 = 0, n0 = 0, sum1 = 0, n1 = 0;
    rows.forEach(r => {
      const yv = Number(r[yIdx]);
      const xv = Number(r[x.idx]);
      if (!(yv === 0 || yv === 1) || !isFinite(xv)) return;
      if (yv === 1) { sum1 += xv; n1++; } else { sum0 += xv; n0++; }
    });
    descriptiveRows.push({
      Predictor: x.name,
      EventRate: "—",
      MeanByOutcome: `Y=1:${fmt(n1 ? sum1 / n1 : NaN)} | Y=0:${fmt(n0 ? sum0 / n0 : NaN)}`,
      Notes: "Numeric summary"
    });
  });

  return {
    separationRisk: separationFlags.length ? `Potential in ${separationFlags.slice(0, 3).join(", ")}${separationFlags.length > 3 ? "..." : ""}` : "Low",
    sparseCells: sparseCount > 0 ? `${sparseCount} sparse level(s)` : "None detected",
    missingPattern: droppedMissing > 0 ? `${droppedMissing} rows excluded due to missing/non-binary values` : "No exclusions",
    rows: descriptiveRows.slice(0, 300)
  };
}

function logLikelihood(y, p) {
  let ll = 0;
  for (let i = 0; i < y.length; i++) {
    const pi = clamp(p[i], 1e-12, 1 - 1e-12);
    ll += y[i] === 1 ? Math.log(pi) : Math.log(1 - pi);
  }
  return ll;
}

function computeAUC(y, p) {
  let pairs = y.map((yi, i) => ({ y: yi, p: p[i] }));
  pairs.sort((a, b) => a.p - b.p);

  let nPos = 0, nNeg = 0;
  y.forEach(v => (v === 1 ? nPos++ : nNeg++));
  if (nPos === 0 || nNeg === 0) return 0.5;

  let rank = 1;
  let sumRanksPos = 0;
  for (let i = 0; i < pairs.length;) {
    let j = i;
    while (j < pairs.length && pairs[j].p === pairs[i].p) j++;
    const avgRank = (rank + (rank + (j - i) - 1)) / 2;
    for (let k = i; k < j; k++) {
      if (pairs[k].y === 1) sumRanksPos += avgRank;
    }
    rank += (j - i);
    i = j;
  }

  return (sumRanksPos - (nPos * (nPos + 1) / 2)) / (nPos * nNeg);
}

function computeKS(y, p) {
  const pairs = y.map((yi, i) => ({ y: yi, p: p[i] })).sort((a, b) => b.p - a.p);
  const nPos = y.filter(v => v === 1).length;
  const nNeg = y.length - nPos;
  if (nPos === 0 || nNeg === 0) return 0;

  let cumPos = 0, cumNeg = 0, ks = 0;
  pairs.forEach(item => {
    if (item.y === 1) cumPos++;
    else cumNeg++;
    const d = Math.abs(cumPos / nPos - cumNeg / nNeg);
    if (d > ks) ks = d;
  });
  return ks;
}

function computeLiftGain(y, p) {
  const pairs = y.map((yi, i) => ({ y: yi, p: p[i] })).sort((a, b) => b.p - a.p);
  const totalEvents = y.reduce((a, b) => a + b, 0);
  const n = y.length;
  const overallRate = totalEvents / Math.max(1, n);

  const top10 = Math.max(1, Math.floor(0.1 * n));
  const top20 = Math.max(1, Math.floor(0.2 * n));
  const top40 = Math.max(1, Math.floor(0.4 * n));

  const eventsTop10 = pairs.slice(0, top10).reduce((s, r) => s + r.y, 0);
  const eventsTop20 = pairs.slice(0, top20).reduce((s, r) => s + r.y, 0);
  const eventsTop40 = pairs.slice(0, top40).reduce((s, r) => s + r.y, 0);

  return {
    topDecileLift: overallRate > 0 ? (eventsTop10 / top10) / overallRate : 0,
    gain20: totalEvents > 0 ? eventsTop20 / totalEvents : 0,
    gain40: totalEvents > 0 ? eventsTop40 / totalEvents : 0
  };
}

function sumWald(fit) {
  let s = 0;
  for (let i = 1; i < fit.coefficients.length; i++) {
    const se = fit.stdErrors[i];
    if (se > 0) {
      const z = fit.coefficients[i] / se;
      s += z * z;
    }
  }
  return s;
}

// ---------- math helpers ----------
function sigmoid(x) {
  if (x > 35) return 1;
  if (x < -35) return 0;
  return 1 / (1 + Math.exp(-x));
}
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function zeroMatrix(r, c) {
  const m = new Array(r);
  for (let i = 0; i < r; i++) m[i] = new Array(c).fill(0);
  return m;
}
function multiplyMatrixVector(A, v) {
  const out = new Array(A.length).fill(0);
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < v.length; j++) out[i] += A[i][j] * v[j];
  }
  return out;
}
function matrixInverseWithRidge(M) {
  try {
    return matrixInverse(M);
  } catch (_e) {
    const lam = 1e-6;
    const C = M.map((row, i) => row.map((v, j) => v + (i === j ? lam : 0)));
    return matrixInverse(C);
  }
}
function matrixInverse(matrix) {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => row.slice().concat(
    new Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
  ));
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
    }
    const tmp = augmented[i]; augmented[i] = augmented[maxRow]; augmented[maxRow] = tmp;
    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-12) throw new Error("Singular matrix");
    for (let j = 0; j < 2 * n; j++) augmented[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = augmented[k][i];
      for (let j = 0; j < 2 * n; j++) augmented[k][j] -= factor * augmented[i][j];
    }
  }
  return augmented.map(r => r.slice(n));
}
function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}
function erf(x) {
  // Abramowitz & Stegun approximation
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
function chiSquareSurvival(x, k) {
  if (x <= 0) return 1;
  return regularizedGammaQ(k / 2, x / 2);
}
function regularizedGammaQ(a, x) {
  if (x < a + 1) return 1 - regularizedGammaPSeries(a, x);
  return regularizedGammaQCF(a, x);
}
function regularizedGammaPSeries(a, x) {
  let sum = 1 / a;
  let term = sum;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}
function regularizedGammaQCF(a, x) {
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}
function logGamma(z) {
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function maxAbsDiff(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}
function mean(arr) {
  if (!arr.length) return NaN;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) * (x - m), 0) / (arr.length - 1);
  return Math.sqrt(v);
}
function max(arr) {
  return arr.length ? Math.max.apply(null, arr) : NaN;
}
function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}
function fmt(v) {
  if (!isFinite(v)) return "N/A";
  return (Math.abs(v) >= 1000 || Math.abs(v) < 1e-3) ? v.toExponential(3) : v.toFixed(4);
}
function fmtPct(v) {
  if (!isFinite(v)) return "N/A";
  return (v * 100).toFixed(2) + "%";
}
function fmtP(p) {
  if (!isFinite(p)) return "N/A";
  if (p < 0.001) return "<0.001";
  return p.toFixed(4);
}

function resetLogisticModel() {
  sessionStorage.removeItem("logisticModelSpec");
  updateButtonState();
}

function updateButtonState() {
  const hasModel = !!sessionStorage.getItem("logisticModelSpec");
  const openBtn = document.getElementById("openLogisticModelBuilder");
  const resetBtn = document.getElementById("resetLogisticModelBtn");
  if (openBtn) {
    const icon = '<i class="fa-solid fa-up-right-from-square"></i>';
    openBtn.innerHTML = hasModel ? `${icon} Edit Model & Open Results` : `${icon} Open Model Builder`;
  }
  if (resetBtn) resetBtn.style.display = hasModel ? "inline-block" : "none";
}

window.openLogisticModelBuilder = openLogisticModelBuilder;
window.openLogisticResultsDialog = openLogisticResultsDialog;
window.resetLogisticModel = resetLogisticModel;
