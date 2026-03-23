/* global Office */

let clusterRangeData = null;
let clusterRangeAddress = "";
let clusterDialog = null;
let clusterSetupDialog = null;

function clusterCfg() {
  if (typeof window.getClusterModuleConfig === "function") {
    return window.getClusterModuleConfig();
  }
  return {};
}

function onRangeDataLoaded(values, address) {
  const configureBtn = document.getElementById("configureClusterBtn");
  const hint = document.getElementById("hintText");
  const ui = (clusterCfg().ui) || {};
  if (!values || values.length < 2) {
    clusterRangeData = null;
    clusterRangeAddress = "";
    if (configureBtn) configureBtn.disabled = true;
    if (hint) hint.textContent = ui.hintNeedRange || "Select a data range to continue";
    return;
  }
  clusterRangeData = values;
  clusterRangeAddress = address || "";
  if (configureBtn) configureBtn.disabled = false;
  if (hint) hint.textContent = ui.hintReadyPick || "Ready — click to open clustering configuration";
}

function getDialogsBaseUrl() {
  const href = window.location.href;
  if (href.includes("/taskpane/")) {
    return `${href.split("/taskpane/")[0]}/dialogs/views/`;
  }
  return `${window.location.origin}/dialogs/views/`;
}

function parseDialogMessage(arg) {
  if (!arg || arg.message == null) return null;
  const m = arg.message;
  if (typeof m === "object") return m;
  try {
    return JSON.parse(String(m));
  } catch (e) {
    return null;
  }
}

function readClusterSpec() {
  const cfg = clusterCfg();
  const lim = cfg.limits || {};
  const def = cfg.defaults || {};
  const kMin = lim.kMin != null ? Number(lim.kMin) : 2;
  const kMax = lim.kMax != null ? Number(lim.kMax) : 50;
  try {
    const raw = sessionStorage.getItem("clusterSpec");
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === "object") {
        let k = parseInt(o.k, 10);
        if (!isFinite(k)) k = def.numClusters != null ? Number(def.numClusters) : 3;
        k = Math.max(kMin, Math.min(kMax, k));
        let standardize = def.standardize !== false;
        if (o.standardize === false) standardize = false;
        if (o.standardize === true) standardize = true;
        const linkage = o.linkage || def.linkage || "average";
        const out = { k, standardize, linkage };
        if (Array.isArray(o.selectedVariableIndices) && o.selectedVariableIndices.length > 0) {
          out.selectedVariableIndices = o.selectedVariableIndices
            .map((x) => Number(x))
            .filter((i) => Number.isInteger(i) && i >= 0);
        }
        return out;
      }
    }
  } catch (e) {}
  let k = def.numClusters != null ? Number(def.numClusters) : 3;
  k = Math.max(kMin, Math.min(kMax, k));
  return { k, standardize: def.standardize !== false, linkage: def.linkage || "average" };
}

function saveClusterSpec() {
  try {
    sessionStorage.setItem("clusterSpec", JSON.stringify(readClusterSpec()));
  } catch (e) {}
}

function persistClusterSpec(spec) {
  if (!spec || typeof spec !== "object") return;
  const cfg = clusterCfg();
  const lim = cfg.limits || {};
  const def = cfg.defaults || {};
  const kMin = lim.kMin != null ? Number(lim.kMin) : 2;
  const kMax = lim.kMax != null ? Number(lim.kMax) : 50;
  let k = parseInt(spec.k, 10);
  if (!isFinite(k)) k = def.numClusters != null ? Number(def.numClusters) : 3;
  k = Math.max(kMin, Math.min(kMax, k));
  let standardize = def.standardize !== false;
  if (spec.standardize === false) standardize = false;
  if (spec.standardize === true) standardize = true;
  const linkage = spec.linkage || def.linkage || "average";
  const obj = { k, standardize, linkage };
  if (Array.isArray(spec.selectedVariableIndices) && spec.selectedVariableIndices.length > 0) {
    obj.selectedVariableIndices = spec.selectedVariableIndices
      .map((x) => Number(x))
      .filter((i) => Number.isInteger(i) && i >= 0);
  }
  try {
    sessionStorage.setItem("clusterSpec", JSON.stringify(obj));
  } catch (e) {}
}

function pushClusterSetupPayload() {
  if (!clusterSetupDialog || !clusterRangeData || clusterRangeData.length < 2) return;
  const headers = clusterRangeData[0] || [];
  const rows = clusterRangeData.length - 1;
  let savedSpec = null;
  try {
    const raw = sessionStorage.getItem("clusterSpec");
    if (raw) savedSpec = JSON.parse(raw);
  } catch (e) {}
  try {
    clusterSetupDialog.messageChild(JSON.stringify({
      action: "clusterSetupInit",
      payload: {
        moduleConfig: clusterCfg(),
        rangeAddress: clusterRangeAddress || "",
        dataRows: rows,
        dataCols: headers.length,
        variableCandidates: buildNumericVariableCandidates(headers, clusterRangeData.slice(1)),
        savedSpec: savedSpec && typeof savedSpec === "object" ? savedSpec : null
      }
    }));
  } catch (e) {
    console.error("clusterSetup messageChild:", e);
  }
}

function openClusterSetupDialog() {
  if (!clusterRangeData || clusterRangeData.length < 2) return;
  const dlg = clusterCfg().dialog || {};
  const setupFile = dlg.setupFilename || "cluster/cluster-setup-dialog.html";
  const hPct = dlg.setupHeightPercent != null ? Number(dlg.setupHeightPercent) : 66;
  const wPct = dlg.setupWidthPercent != null ? Number(dlg.setupWidthPercent) : 56;
  const dialogUrl = `${getDialogsBaseUrl()}${setupFile}?v=${Date.now()}`;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: hPct, width: wPct, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open cluster setup dialog:", asyncResult.error);
        return;
      }
      clusterSetupDialog = asyncResult.value;
      clusterSetupDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = parseDialogMessage(arg);
          if (!message || !message.action) return;
          if (message.action === "requestClusterSetup") {
            pushClusterSetupPayload();
          } else if (message.action === "clusterSetupRun") {
            persistClusterSpec(message.spec || message.payload);
            const setupDlg = clusterSetupDialog;
            clusterSetupDialog = null;
            try {
              if (setupDlg) setupDlg.close();
            } catch (e) {}
            /* Excel/Office often rejects opening a second dialog until the first has finished closing (PCA uses the same delay). */
            setTimeout(() => {
              openClusterResultsDialogOnly();
            }, 480);
          } else if (message.action === "clusterSetupClose") {
            try {
              if (clusterSetupDialog) clusterSetupDialog.close();
            } catch (e) {}
            clusterSetupDialog = null;
          }
        } catch (e) {
          console.error("Cluster setup dialog message:", e);
        }
      });
      clusterSetupDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        clusterSetupDialog = null;
      });
      setTimeout(() => pushClusterSetupPayload(), 800);
    }
  );
}

function parseNum(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return isFinite(n) ? n : NaN;
}

function buildNumericVariableCandidates(headers, rows) {
  if (!headers || !rows || rows.length === 0) return [];
  const an = clusterCfg().analysis || {};
  const th = an.numericColumnThreshold != null ? Number(an.numericColumnThreshold) : 0.8;
  const out = [];
  headers.forEach((h, j) => {
    let num = 0;
    let nm = 0;
    rows.forEach((r) => {
      const v = r[j];
      if (v === null || v === undefined || v === "") return;
      nm++;
      if (isFinite(parseNum(v))) num++;
    });
    if (nm > 0 && num / nm >= th) {
      out.push({ index: j, label: String(h || `V${j + 1}`) });
    }
  });
  return out;
}

function columnMeans(X) {
  const n = X.length;
  const p = X[0].length;
  const m = Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) m[j] += X[i][j];
  for (let j = 0; j < p; j++) m[j] /= Math.max(1, n);
  return m;
}

function columnSds(X, means) {
  const n = X.length;
  const p = X[0].length;
  const s = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      const d = X[i][j] - means[j];
      s[j] += d * d;
    }
  }
  for (let j = 0; j < p; j++) s[j] = Math.sqrt(s[j] / Math.max(1, n - 1));
  return s;
}

function standardise(X) {
  const means = columnMeans(X);
  const sds = columnSds(X, means);
  const Z = X.map((row) => row.map((v, j) => (sds[j] > 1e-12 ? (v - means[j]) / sds[j] : 0)));
  return { Z, means, sds };
}

function distMatrix(X) {
  const n = X.length;
  const d = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let s = 0;
      for (let f = 0; f < X[0].length; f++) {
        const t = X[i][f] - X[j][f];
        s += t * t;
      }
      const r = Math.sqrt(s);
      d[i][j] = r;
      d[j][i] = r;
    }
  }
  return d;
}

function linkDist(membersA, membersB, dist, mode) {
  let sum = 0;
  let cnt = 0;
  let mn = Infinity;
  let mx = -Infinity;
  for (const i of membersA) {
    for (const j of membersB) {
      const dij = dist[i][j];
      if (mode === "single") mn = Math.min(mn, dij);
      else if (mode === "complete") mx = Math.max(mx, dij);
      else {
        sum += dij;
        cnt++;
      }
    }
  }
  if (mode === "single") return mn;
  if (mode === "complete") return mx;
  return cnt ? sum / cnt : 0;
}

function hierarchicalCluster(X, linkageMode, kTarget) {
  const n = X.length;
  const dist = distMatrix(X);
  let clusters = Array.from({ length: n }, (_, i) => ({ members: [i] }));
  const merges = [];
  const kEff = Math.min(Math.max(2, kTarget), n);

  function labelFromClusters(clist) {
    const lab = Array(n).fill(0);
    clist.forEach((c, idx) => {
      c.members.forEach((m) => { lab[m] = idx; });
    });
    return lab;
  }

  let labelsAtK = null;
  if (clusters.length === kEff) labelsAtK = labelFromClusters(clusters);

  while (clusters.length > 1) {
    let best = Infinity;
    let bi = 0;
    let bj = 1;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = linkDist(clusters[i].members, clusters[j].members, dist, linkageMode);
        if (d < best) {
          best = d;
          bi = i;
          bj = j;
        }
      }
    }
    const A = clusters[bi];
    const B = clusters[bj];
    const merged = { members: A.members.concat(B.members) };
    merges.push({
      step: merges.length + 1,
      n1: A.members.length,
      n2: B.members.length,
      nMerged: merged.members.length,
      height: best
    });
    clusters = clusters.filter((_, idx) => idx !== bi && idx !== bj);
    clusters.push(merged);
    if (clusters.length === kEff) labelsAtK = labelFromClusters(clusters);
  }

  if (!labelsAtK) labelsAtK = labelFromClusters(clusters);
  return { merges, labels: labelsAtK, kUsed: kEff };
}

function kmeans(Z, k, maxIter) {
  const n = Z.length;
  const p = Z[0].length;
  const kEff = Math.min(Math.max(2, k), n);
  const centroids = [];
  const used = new Set();
  while (centroids.length < kEff) {
    const idx = Math.floor(Math.random() * n);
    if (used.has(idx)) continue;
    used.add(idx);
    centroids.push(Z[idx].slice());
  }
  let labels = Array(n).fill(0);
  let it = 0;
  let changed = true;
  for (; it < maxIter && changed; it++) {
    changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < kEff; c++) {
        let s = 0;
        for (let f = 0; f < p; f++) {
          const t = Z[i][f] - centroids[c][f];
          s += t * t;
        }
        if (s < bestD) {
          bestD = s;
          best = c;
        }
      }
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    }
    const sums = Array.from({ length: kEff }, () => Array(p).fill(0));
    const counts = Array(kEff).fill(0);
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      counts[c]++;
      for (let f = 0; f < p; f++) sums[c][f] += Z[i][f];
    }
    for (let c = 0; c < kEff; c++) {
      if (counts[c] === 0) continue;
      for (let f = 0; f < p; f++) centroids[c][f] = sums[c][f] / counts[c];
    }
  }
  let wcss = 0;
  for (let i = 0; i < n; i++) {
    const c = labels[i];
    let s = 0;
    for (let f = 0; f < p; f++) {
      const t = Z[i][f] - centroids[c][f];
      s += t * t;
    }
    wcss += s;
  }
  const sizes = Array(kEff).fill(0);
  labels.forEach((c) => { sizes[c]++; });
  return { labels, wcss, iterations: it, kUsed: kEff, sizes };
}

function extractNumericMatrix(headers, rows, spec) {
  const an = clusterCfg().analysis || {};
  const th = an.numericColumnThreshold != null ? Number(an.numericColumnThreshold) : 0.8;
  const numericFlags = headers.map((_, j) => {
    let num = 0;
    let nm = 0;
    rows.forEach((r) => {
      const v = r[j];
      if (v === null || v === undefined || v === "") return;
      nm++;
      if (isFinite(parseNum(v))) num++;
    });
    return nm > 0 && num / nm >= th;
  });
  let indices = numericFlags.map((ok, j) => (ok ? j : -1)).filter((j) => j >= 0);
  const sel = spec && spec.selectedVariableIndices;
  if (Array.isArray(sel) && sel.length > 0) {
    const want = new Set(
      sel.map((x) => Number(x)).filter((i) => Number.isInteger(i) && i >= 0 && i < headers.length)
    );
    indices = indices.filter((j) => want.has(j));
  }
  const names = indices.map((j) => String(headers[j] || `V${j + 1}`));
  const X = [];
  let missingRows = 0;
  rows.forEach((r) => {
    const vals = indices.map((j) => parseNum(r[j]));
    if (vals.some((v) => !isFinite(v))) {
      missingRows++;
      return;
    }
    X.push(vals);
  });
  return { names, X, missingRows, p: names.length };
}

function buildClusterBundle(headers, rows, spec) {
  const kReq = spec && isFinite(spec.k) ? Number(spec.k) : 3;
  const standardize = !(spec && spec.standardize === false);
  const linkage = (spec && spec.linkage) || "average";
  const { names, X, missingRows, p } = extractNumericMatrix(headers, rows, spec);
  const n = X.length;

  if (!n || p < 1) {
    return {
      summary: {
        variableCount: p,
        caseCount: n,
        missingRows,
        k: kReq,
        standardize,
        linkage,
        variableLabels: names,
        verdict: "Insufficient numeric data",
        correlationMatrix: []
      },
      kmeans: null,
      hierarchical: null,
      rawData: { columns: [], rows: [], totalCases: 0, displayedCases: 0 }
    };
  }

  const lim = clusterCfg().limits || {};
  const maxKmIter = lim.maxKmeansIterations != null ? Number(lim.maxKmeansIterations) : 100;
  const maxAssign = lim.maxAssignmentRowsDisplay != null ? Number(lim.maxAssignmentRowsDisplay) : 500;
  const maxRaw = lim.maxRawDataRows != null ? Number(lim.maxRawDataRows) : 500;
  const maxMergeRows = lim.maxHierarchicalMergeRowsDisplay != null ? Number(lim.maxHierarchicalMergeRowsDisplay) : 40;

  const workX = standardize ? standardise(X).Z : X.map((r) => r.slice());
  const km = kmeans(workX, kReq, maxKmIter);
  const hi = hierarchicalCluster(workX, linkage, kReq);

  const maxShow = Math.min(maxAssign, n);
  const kmRows = [];
  for (let i = 0; i < maxShow; i++) {
    kmRows.push({ Case: i + 1, Cluster: km.labels[i] + 1 });
  }
  const hiRows = [];
  for (let i = 0; i < maxShow; i++) {
    hiRows.push({ Case: i + 1, Cluster: hi.labels[i] + 1 });
  }

  const hiSizes = Array(km.kUsed).fill(0);
  hi.labels.forEach((c) => { hiSizes[c]++; });

  const mergeShow = hi.merges.slice(-Math.min(maxMergeRows, hi.merges.length));

  let R = [];
  if (p >= 2 && n >= 2) {
    const { Z: Zc } = standardise(X);
    const means = columnMeans(Zc);
    const sds = columnSds(Zc, means);
    R = Array.from({ length: p }, () => Array(p).fill(0));
    for (let i = 0; i < p; i++) {
      for (let j = i; j < p; j++) {
        let cov = 0;
        for (let r = 0; r < n; r++) {
          cov += (Zc[r][i] - means[i]) * (Zc[r][j] - means[j]);
        }
        cov /= Math.max(1, n - 1);
        const denom = sds[i] * sds[j];
        const corr = denom > 0 ? cov / denom : i === j ? 1 : 0;
        R[i][j] = corr;
        R[j][i] = corr;
      }
    }
  } else if (p === 1) {
    R = [[1]];
  }

  const rawDataRows = X.slice(0, Math.min(maxRaw, n)).map((xRow, idx) => {
    const row = { "#": idx + 1 };
    names.forEach((name, j) => { row[name] = xRow[j]; });
    return row;
  });
  const rawDataCols = ["#"].concat(names);

  return {
    summary: {
      variableCount: p,
      caseCount: n,
      missingRows,
      k: km.kUsed,
      standardize,
      linkage,
      variableLabels: names,
      verdict: n >= kReq ? "Clustering run complete" : "Very small sample — interpret with caution",
      correlationMatrix: R
    },
    kmeans: {
      iterations: km.iterations,
      wcss: km.wcss,
      sizes: km.sizes,
      columns: ["Case", "Cluster"],
      rows: kmRows,
      totalCases: n,
      displayedCases: maxShow
    },
    hierarchical: {
      linkage,
      sizes: hiSizes,
      mergeSteps: mergeShow,
      totalMerges: hi.merges.length,
      columns: ["Case", "Cluster"],
      rows: hiRows,
      totalCases: n,
      displayedCases: maxShow
    },
    rawData: {
      columns: rawDataCols,
      rows: rawDataRows,
      totalCases: n,
      displayedCases: rawDataRows.length
    }
  };
}

function openClusterResultsDialogOnly() {
  if (!clusterRangeData || clusterRangeData.length < 2) return;
  const dlg = clusterCfg().dialog || {};
  const resultsFile = dlg.resultsFilename || "cluster/cluster-analysis.html";
  const dialogUrl = `${getDialogsBaseUrl()}${resultsFile}?v=${Date.now()}`;
  const hPct = dlg.heightPercent != null ? Number(dlg.heightPercent) : 90;
  const wPct = dlg.widthPercent != null ? Number(dlg.widthPercent) : 70;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: hPct, width: wPct, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open cluster dialog:", asyncResult.error);
        return;
      }
      clusterDialog = asyncResult.value;
      clusterDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = parseDialogMessage(arg);
          if (!message) return;
          if (message.action === "ready") sendClusterBundle();
          else if (message.action === "close") {
            clusterDialog.close();
            clusterDialog = null;
          }
        } catch (e) {
          console.error("Cluster dialog message:", e);
        }
      });
      clusterDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        clusterDialog = null;
      });
      setTimeout(() => sendClusterBundle(), 1100);
    }
  );
}

function openClusterResultsDialog() {
  if (!clusterRangeData || clusterRangeData.length < 2) return;
  saveClusterSpec();
  openClusterResultsDialogOnly();
}

function sendClusterBundle() {
  if (!clusterDialog || !clusterRangeData) return;
  const headers = clusterRangeData[0] || [];
  const rows = clusterRangeData.slice(1);
  let spec = {};
  try {
    const raw = sessionStorage.getItem("clusterSpec");
    if (raw) spec = JSON.parse(raw);
  } catch (e) {
    spec = {};
  }
  const bundle = buildClusterBundle(headers, rows, spec);
  const rawData = bundle.rawData;
  const main = Object.assign({}, bundle);
  delete main.rawData;
  clusterDialog.messageChild(JSON.stringify({ type: "CLUSTER_BUNDLE", payload: main }));
  if (rawData) {
    setTimeout(function() {
      clusterDialog.messageChild(JSON.stringify({ type: "CLUSTER_RAW_DATA", payload: rawData }));
    }, 300);
  }
}

window.onRangeDataLoaded = onRangeDataLoaded;
window.openClusterSetupDialog = openClusterSetupDialog;
window.openClusterResultsDialog = openClusterResultsDialog;
window.readClusterSpec = readClusterSpec;
window.saveClusterSpec = saveClusterSpec;
