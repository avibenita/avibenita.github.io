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

/** "kmeans" | "hierarchical" when running as a single-method module, else null. */
function clusterLockedMethod() {
  var m = window.CLUSTER_LOCKED_METHOD;
  return m === "kmeans" || m === "hierarchical" ? m : null;
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
    const raw = sessionStorage.getItem("clusterModelSpec") || sessionStorage.getItem("clusterSpec");
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
        const clusterMethod = clusterLockedMethod() || (o.clusterMethod === "hierarchical" ? "hierarchical" : "kmeans");
        const an0 = clusterCfg().analysis || {};
        const distance = o.distance === "manhattan" ? "manhattan" : (o.distance || an0.distance || "euclidean");
        const out = { k, standardize, linkage, clusterMethod, distance };
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
  const an1 = clusterCfg().analysis || {};
  const d0 = an1.distance === "manhattan" ? "manhattan" : "euclidean";
  const m0 = clusterLockedMethod() || (String(def.clusterMethod || "kmeans").toLowerCase() === "hierarchical" ? "hierarchical" : "kmeans");
  return {
    k,
    standardize: def.standardize !== false,
    linkage: def.linkage || "average",
    clusterMethod: m0,
    distance: d0
  };
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
  const clusterMethod = clusterLockedMethod() || (spec.clusterMethod === "hierarchical" ? "hierarchical" : "kmeans");
  const an2 = clusterCfg().analysis || {};
  const distance = spec.distance === "manhattan" ? "manhattan" : (spec.distance || an2.distance || "euclidean");
  const obj = { k, standardize, linkage, clusterMethod, distance };
  if (Array.isArray(spec.variables) && spec.variables.length) obj.variables = spec.variables.slice();
  if (Array.isArray(spec.selectedVariableIndices) && spec.selectedVariableIndices.length > 0) {
    obj.selectedVariableIndices = spec.selectedVariableIndices
      .map((x) => Number(x))
      .filter((i) => Number.isInteger(i) && i >= 0);
  }
  try {
    sessionStorage.setItem("clusterModelSpec", JSON.stringify(obj));
    sessionStorage.setItem("clusterSpec", JSON.stringify(obj));
  } catch (e) {}
}

function normalizeClusterSpec(spec, headers) {
  const out = Object.assign({}, spec || {});
  if (headers && Array.isArray(out.variables) && out.variables.length) {
    const fromNames = out.variables.map((v) => headers.indexOf(v)).filter((i) => i >= 0);
    if (fromNames.length) out.selectedVariableIndices = fromNames;
  }
  return out;
}

function pushClusterSetupPayload() {
  if (!clusterSetupDialog) return;
  const headers = (clusterRangeData && clusterRangeData.length) ? (clusterRangeData[0] || []) : [];
  const setupRows = (clusterRangeData && clusterRangeData.length > 1) ? clusterRangeData.slice(1) : [];
  try {
    clusterSetupDialog.messageChild(JSON.stringify({
      type: "CLUSTER_DATA",
      payload: {
        headers,
        rows: setupRows,
        address: clusterRangeAddress || "",
        // Always open the builder fresh — saved spec is only used by results dialogs.
        savedModelSpec: null,
        lockedMethod: clusterLockedMethod()
      }
    }));
  } catch (e) {
    console.error("clusterSetup messageChild:", e);
  }
}

function openClusterSetupDialog() {
  const dlg = clusterCfg().dialog || {};
  const setupFile = dlg.setupFilename || "cluster/cluster-input.html";
  const dialogUrl = `${getDialogsBaseUrl()}${setupFile}?v=${Date.now()}`;

  const dialogSize = typeof getInputBuilderDialogOptions === "function"
    ? getInputBuilderDialogOptions()
    : (typeof DIALOG_SIZES !== "undefined" ? DIALOG_SIZES.REGRESSION_BUILDER : { height: 74, width: 30, displayInIframe: false });

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    dialogSize,
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
          if (message.action === "requestClusterSetup" || message.action === "ready" || message.action === "requestData") {
            pushClusterSetupPayload();
          } else if (message.action === "clusterModel" || message.action === "clusterSetupRun") {
            persistClusterSpec(message.payload || message.data || message.spec);
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
        if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
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

function distMatrix(X, metric) {
  const n = X.length;
  const d = Array.from({ length: n }, () => Array(n).fill(0));
  const manhattan = metric === "manhattan";
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let v = 0;
      if (manhattan) {
        for (let f = 0; f < X[0].length; f++) v += Math.abs(X[i][f] - X[j][f]);
      } else {
        let s = 0;
        for (let f = 0; f < X[0].length; f++) {
          const t = X[i][f] - X[j][f];
          s += t * t;
        }
        v = Math.sqrt(s);
      }
      d[i][j] = v;
      d[j][i] = v;
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

function hierarchicalCluster(X, linkageMode, kTarget, metric) {
  const n = X.length;
  const dist = distMatrix(X, metric);
  let clusters = Array.from({ length: n }, (_, i) => ({ members: [i], id: i }));
  const merges = [];
  const kEff = Math.min(Math.max(2, kTarget), n);
  let nextId = n;

  // Cophenetic correlation: each pair (a, b) crosses a merge exactly once, at
  // the height where their clusters first join. Accumulate Pearson sums on the
  // fly instead of materialising an n×n cophenetic matrix.
  const doCoph = n >= 3 && n <= 2000;
  let cN = 0, cSx = 0, cSy = 0, cSxx = 0, cSyy = 0, cSxy = 0;

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
    if (doCoph) {
      for (let a = 0; a < A.members.length; a++) {
        for (let b = 0; b < B.members.length; b++) {
          const d0 = dist[A.members[a]][B.members[b]];
          cN++;
          cSx += d0; cSy += best;
          cSxx += d0 * d0; cSyy += best * best; cSxy += d0 * best;
        }
      }
    }
    const merged = { members: A.members.concat(B.members), id: nextId++ };
    merges.push({
      step: merges.length + 1,
      n1: A.members.length,
      n2: B.members.length,
      nMerged: merged.members.length,
      height: best,
      left: A.id,
      right: B.id
    });
    clusters = clusters.filter((_, idx) => idx !== bi && idx !== bj);
    clusters.push(merged);
    if (clusters.length === kEff) labelsAtK = labelFromClusters(clusters);
  }

  if (!labelsAtK) labelsAtK = labelFromClusters(clusters);

  let cophenetic = null;
  if (doCoph && cN > 1) {
    const covXY = cSxy - (cSx * cSy) / cN;
    const varX = cSxx - (cSx * cSx) / cN;
    const varY = cSyy - (cSy * cSy) / cN;
    if (varX > 1e-12 && varY > 1e-12) cophenetic = covXY / Math.sqrt(varX * varY);
  }

  return { merges, labels: labelsAtK, kUsed: kEff, cophenetic };
}

function kmeans(Z, k, maxIter, metric) {
  const n = Z.length;
  const p = Z[0].length;
  const manhattan = metric === "manhattan";
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
  const currentWcss = () => {
    let w = 0;
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      if (manhattan) {
        for (let f = 0; f < p; f++) w += Math.abs(Z[i][f] - centroids[c][f]);
      } else {
        for (let f = 0; f < p; f++) {
          const t = Z[i][f] - centroids[c][f];
          w += t * t;
        }
      }
    }
    return w;
  };
  // Per-iteration trace for the convergence chart and the map's center trails.
  // centroidSnapshots[0] holds the random initial seeds; one snapshot follows
  // each update step. Size stays tiny: iterations x k x p numbers.
  const history = {
    reassigned: [],
    wcss: [],
    centroidSnapshots: [centroids.map((row) => row.slice())]
  };
  for (; it < maxIter && changed; it++) {
    changed = false;
    let moved = 0;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < kEff; c++) {
        let d = 0;
        if (manhattan) {
          for (let f = 0; f < p; f++) d += Math.abs(Z[i][f] - centroids[c][f]);
        } else {
          let s = 0;
          for (let f = 0; f < p; f++) {
            const t = Z[i][f] - centroids[c][f];
            s += t * t;
          }
          d = s;
        }
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
        moved++;
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
    history.reassigned.push(moved);
    history.wcss.push(currentWcss());
    history.centroidSnapshots.push(centroids.map((row) => row.slice()));
  }
  const wcss = currentWcss();
  const sizes = Array(kEff).fill(0);
  labels.forEach((c) => { sizes[c]++; });
  return {
    labels,
    wcss,
    iterations: it,
    kUsed: kEff,
    sizes,
    distanceMetric: manhattan ? "manhattan" : "euclidean",
    centroids: centroids.map((row) => row.slice()),
    history
  };
}

function squaredEuclidean(a, b) {
  let s = 0;
  for (let j = 0; j < a.length; j++) {
    const t = a[j] - b[j];
    s += t * t;
  }
  return s;
}

/**
 * TSS / WCSS / BSS decomposition (squared Euclidean on the analysis matrix)
 * plus cluster mean vectors — works for any labelling (K-means or tree cut).
 */
function varianceDecomposition(workX, labels, k) {
  const n = workX.length;
  if (!n || k < 1) return null;
  const p = workX[0].length;
  const mean = columnMeans(workX);
  let tss = 0;
  for (let i = 0; i < n; i++) tss += squaredEuclidean(workX[i], mean);
  const sums = Array.from({ length: k }, () => Array(p).fill(0));
  const counts = Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (c < 0 || c >= k) continue;
    counts[c]++;
    for (let j = 0; j < p; j++) sums[c][j] += workX[i][j];
  }
  const centers = sums.map((row, c) => row.map((v) => (counts[c] ? v / counts[c] : 0)));
  let wcss = 0;
  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (c < 0 || c >= k) continue;
    wcss += squaredEuclidean(workX[i], centers[c]);
  }
  const bss = Math.max(0, tss - wcss);
  return {
    totalSS: tss,
    withinSS: wcss,
    betweenSS: bss,
    explainedVariance: tss > 1e-12 ? bss / tss : null,
    centers,
    counts
  };
}

/** Average silhouette (O(n²)); skipped above maxN cases to keep the task pane responsive. */
function computeSilhouette(workX, labels, k, metric, maxN) {
  const n = workX.length;
  if (n < 3 || k < 2 || n > (maxN || 1500)) return null;
  const dist = distMatrix(workX, metric);
  const counts = Array(k).fill(0);
  labels.forEach((c) => { if (c >= 0 && c < k) counts[c]++; });
  const sumPer = Array(k).fill(0);
  const cntPer = Array(k).fill(0);
  let total = 0;
  let m = 0;
  for (let i = 0; i < n; i++) {
    const ci = labels[i];
    if (ci < 0 || ci >= k) continue;
    if (counts[ci] <= 1) {
      cntPer[ci]++;
      m++;
      continue;
    }
    const sumsB = Array(k).fill(0);
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const cj = labels[j];
      if (cj < 0 || cj >= k) continue;
      sumsB[cj] += dist[i][j];
    }
    const a = sumsB[ci] / (counts[ci] - 1);
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === ci || !counts[c]) continue;
      b = Math.min(b, sumsB[c] / counts[c]);
    }
    if (!isFinite(b)) continue;
    const s = Math.max(a, b) > 1e-12 ? (b - a) / Math.max(a, b) : 0;
    sumPer[ci] += s;
    cntPer[ci]++;
    total += s;
    m++;
  }
  if (!m) return null;
  return {
    average: total / m,
    perCluster: sumPer.map((s, c) => (cntPer[c] ? s / cntPer[c] : null))
  };
}

/** Pairwise distances between cluster centers, using the analysis metric. */
function centroidDistanceMatrix(centers, metric) {
  if (!centers || !centers.length) return [];
  const k = centers.length;
  const manhattan = metric === "manhattan";
  const D = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      let v = 0;
      if (manhattan) {
        for (let f = 0; f < centers[i].length; f++) v += Math.abs(centers[i][f] - centers[j][f]);
      } else {
        v = Math.sqrt(squaredEuclidean(centers[i], centers[j]));
      }
      D[i][j] = v;
      D[j][i] = v;
    }
  }
  return D;
}

/**
 * Top-2 principal components of the analysis matrix (power iteration with deflation).
 * Used by the cluster map for the auto PCA projection.
 */
function pcaTop2(X) {
  const n = X.length;
  if (!n) return null;
  const p = X[0].length;
  if (p < 2) return null;
  const means = columnMeans(X);
  const Xc = X.map((r) => r.map((v, j) => v - means[j]));
  const C = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) {
      const xa = Xc[i][a];
      for (let b = a; b < p; b++) C[a][b] += xa * Xc[i][b];
    }
  }
  for (let a = 0; a < p; a++) {
    for (let b = a; b < p; b++) {
      const v = C[a][b] / Math.max(1, n - 1);
      C[a][b] = v;
      C[b][a] = v;
    }
  }
  const totalVar = C.reduce((s, row, i) => s + row[i], 0);
  function powerIter(M) {
    let v = Array.from({ length: p }, () => Math.random() - 0.5);
    let lambda = 0;
    for (let it = 0; it < 200; it++) {
      const w = Array(p).fill(0);
      for (let a = 0; a < p; a++) {
        let s = 0;
        for (let b = 0; b < p; b++) s += M[a][b] * v[b];
        w[a] = s;
      }
      const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
      const nv = w.map((x) => x / norm);
      const diff = nv.reduce((s, x, i) => s + Math.abs(x - v[i]), 0);
      v = nv;
      lambda = norm;
      if (diff < 1e-10) break;
    }
    return { vec: v, val: lambda };
  }
  const e1 = powerIter(C);
  const C2 = C.map((row, a) => row.map((val, b) => val - e1.val * e1.vec[a] * e1.vec[b]));
  const e2 = powerIter(C2);
  const scores = Xc.map((r) => {
    let s1 = 0;
    let s2 = 0;
    for (let j = 0; j < p; j++) {
      s1 += r[j] * e1.vec[j];
      s2 += r[j] * e2.vec[j];
    }
    return [s1, s2];
  });
  return {
    scores,
    explained: totalVar > 1e-12 ? [e1.val / totalVar, e2.val / totalVar] : null,
    // Basis for projecting other points (e.g. centroid trails) into PC space.
    means,
    v1: e1.vec,
    v2: e2.vec
  };
}

/** Mean of the raw (unstandardised) variables per cluster — for the raw-means profile toggle. */
function computeRawProfileSeries(X, labels, kUsed, p) {
  if (!X.length || !p || kUsed < 1) return [];
  const n = X.length;
  const sums = Array.from({ length: kUsed }, () => Array(p).fill(0));
  const counts = Array(kUsed).fill(0);
  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (c < 0 || c >= kUsed) continue;
    counts[c]++;
    for (let j = 0; j < p; j++) sums[c][j] += X[i][j];
  }
  const series = [];
  for (let c = 0; c < kUsed; c++) {
    const cnt = counts[c];
    const data = [];
    for (let j = 0; j < p; j++) data.push(cnt > 0 ? sums[c][j] / cnt : null);
    series.push({ name: `Cluster ${c + 1}`, data });
  }
  return series;
}

/** Mean z-score profile per K-means cluster (column-wise z on full X; comparable across variables). */
function computeKmeansProfileSeries(X, labels, kUsed, p) {
  if (!X.length || !p || kUsed < 1) return [];
  const { Z } = standardise(X);
  const n = X.length;
  const sums = Array.from({ length: kUsed }, () => Array(p).fill(0));
  const counts = Array(kUsed).fill(0);
  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (c < 0 || c >= kUsed) continue;
    counts[c]++;
    for (let j = 0; j < p; j++) sums[c][j] += Z[i][j];
  }
  const series = [];
  for (let c = 0; c < kUsed; c++) {
    const cnt = counts[c];
    const data = [];
    for (let j = 0; j < p; j++) {
      data.push(cnt > 0 ? sums[c][j] / cnt : null);
    }
    series.push({ name: `Cluster ${c + 1}`, data });
  }
  return series;
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
  const cm = spec && spec.clusterMethod;
  const lockedMethod = clusterLockedMethod();
  const clusterMethod = lockedMethod || (cm === "hierarchical" ? "hierarchical" : "kmeans");
  const an = clusterCfg().analysis || {};
  const distRaw = (spec && spec.distance) || an.distance || "euclidean";
  const metric = distRaw === "manhattan" ? "manhattan" : "euclidean";
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
        clusterMethod,
        lockedMethod,
        distanceMeasure: metric,
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
  // Locked single-method modules only compute their own method.
  const runKm = !lockedMethod || lockedMethod === "kmeans";
  const runHi = !lockedMethod || lockedMethod === "hierarchical";
  const km = runKm ? kmeans(workX, kReq, maxKmIter, metric) : null;
  const hi = runHi ? hierarchicalCluster(workX, linkage, kReq, metric) : null;

  const maxShow = Math.min(maxAssign, n);
  const kmRows = [];
  if (km) {
    for (let i = 0; i < maxShow; i++) {
      kmRows.push({ Case: i + 1, Cluster: km.labels[i] + 1 });
    }
  }
  const hiRows = [];
  if (hi) {
    for (let i = 0; i < maxShow; i++) {
      hiRows.push({ Case: i + 1, Cluster: hi.labels[i] + 1 });
    }
  }

  const hiK = hi && hi.labels.length ? Math.max.apply(null, hi.labels) + 1 : 0;
  const hiSizes = Array(hiK).fill(0);
  if (hi) hi.labels.forEach((c) => { hiSizes[c]++; });

  const mergeShow = hi ? hi.merges.slice(-Math.min(maxMergeRows, hi.merges.length)) : [];

  const hiProfileSeries = hi ? computeKmeansProfileSeries(X, hi.labels, hiK, p) : [];

  const maxSilhouetteN = lim.maxSilhouetteCases != null ? Number(lim.maxSilhouetteCases) : 1500;
  const kmDecomp = km ? varianceDecomposition(workX, km.labels, km.kUsed) : null;
  const hiDecomp = hi ? varianceDecomposition(workX, hi.labels, hiK) : null;
  const kmSil = km ? computeSilhouette(workX, km.labels, km.kUsed, metric, maxSilhouetteN) : null;
  const hiSil = hi ? computeSilhouette(workX, hi.labels, hiK, metric, maxSilhouetteN) : null;
  const kmQuality = km ? {
    converged: km.iterations < maxKmIter,
    iterations: km.iterations,
    withinSS: kmDecomp ? kmDecomp.withinSS : km.wcss,
    betweenSS: kmDecomp ? kmDecomp.betweenSS : null,
    totalSS: kmDecomp ? kmDecomp.totalSS : null,
    explainedVariance: kmDecomp ? kmDecomp.explainedVariance : null,
    silhouette: kmSil ? kmSil.average : null,
    silhouettePerCluster: kmSil ? kmSil.perCluster : null
  } : null;
  const hiQuality = hi ? {
    withinSS: hiDecomp ? hiDecomp.withinSS : null,
    betweenSS: hiDecomp ? hiDecomp.betweenSS : null,
    totalSS: hiDecomp ? hiDecomp.totalSS : null,
    explainedVariance: hiDecomp ? hiDecomp.explainedVariance : null,
    silhouette: hiSil ? hiSil.average : null,
    silhouettePerCluster: hiSil ? hiSil.perCluster : null
  } : null;
  const kmCentroidDist = km ? centroidDistanceMatrix(km.centroids || (kmDecomp ? kmDecomp.centers : []), metric) : [];
  const hiCentroidDist = hi && hiDecomp ? centroidDistanceMatrix(hiDecomp.centers, metric) : [];
  const kmRawProfile = km ? computeRawProfileSeries(X, km.labels, km.kUsed, p) : [];
  const hiRawProfile = hi ? computeRawProfileSeries(X, hi.labels, hiK, p) : [];

  const maxScatter = lim.maxScatterPoints != null ? Number(lim.maxScatterPoints) : 2000;
  const scatterN = Math.min(n, maxScatter);
  const pca = p >= 2 ? pcaTop2(workX) : null;
  const scatter = {
    varNames: names.slice(),
    points: X.slice(0, scatterN),
    pcaScores: pca ? pca.scores.slice(0, scatterN) : null,
    pcaExplained: pca ? pca.explained : null,
    totalCases: n,
    displayedCases: scatterN
  };

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

  const profileSeries = km ? computeKmeansProfileSeries(X, km.labels, km.kUsed, p) : [];

  // Center trails for the cluster map: project every per-iteration centroid
  // snapshot through the same PCA basis as the case scores, transposed to one
  // path per cluster: trails[c] = [[x,y] at init, [x,y] after iter 1, ...].
  let kmCentroidTrails = null;
  if (km && km.history && pca && pca.v1 && pca.v2) {
    const snaps = km.history.centroidSnapshots || [];
    if (snaps.length > 1) {
      kmCentroidTrails = Array.from({ length: km.kUsed }, (_, c) => snaps.map((snap) => {
        const cen = snap[c];
        let s1 = 0;
        let s2 = 0;
        for (let j = 0; j < p; j++) {
          const v = cen[j] - pca.means[j];
          s1 += v * pca.v1[j];
          s2 += v * pca.v2[j];
        }
        return [s1, s2];
      }));
    }
  }

  return {
    summary: {
      engineBuild: "20260716a",
      variableCount: p,
      caseCount: n,
      missingRows,
      k: km ? km.kUsed : (hi ? hi.kUsed : kReq),
      standardize,
      linkage,
      clusterMethod,
      lockedMethod,
      distanceMeasure: metric,
      variableLabels: names,
      verdict: n >= kReq ? "Clustering run complete" : "Very small sample — interpret with caution",
      correlationMatrix: R
    },
    scatter,
    kmeans: km ? {
      iterations: km.iterations,
      wcss: km.wcss,
      sizes: km.sizes,
      centroids: km.centroids || [],
      quality: kmQuality,
      centroidDistances: kmCentroidDist,
      convergence: km.history ? { reassigned: km.history.reassigned, wcss: km.history.wcss } : null,
      centroidTrails: kmCentroidTrails,
      scatterLabels: km.labels.slice(0, scatterN),
      columns: ["Case", "Cluster"],
      rows: kmRows,
      totalCases: n,
      displayedCases: maxShow,
      profile: {
        categories: names.slice(),
        yLabel: "Mean z-score (pooled SD)",
        series: profileSeries,
        rawSeries: kmRawProfile,
        rawYLabel: "Mean (raw units)"
      }
    } : null,
    hierarchical: hi ? {
      linkage,
      sizes: hiSizes,
      mergeSteps: mergeShow,
      totalMerges: hi.merges.length,
      dendrogramMerges: hi.merges,
      cophenetic: hi.cophenetic != null ? hi.cophenetic : null,
      quality: hiQuality,
      centroidDistances: hiCentroidDist,
      scatterLabels: hi.labels.slice(0, scatterN),
      columns: ["Case", "Cluster"],
      rows: hiRows,
      totalCases: n,
      displayedCases: maxShow,
      profile: {
        categories: names.slice(),
        yLabel: "Mean z-score (pooled SD)",
        series: hiProfileSeries,
        rawSeries: hiRawProfile,
        rawYLabel: "Mean (raw units)"
      }
    } : null,
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
  const lockParam = clusterLockedMethod();
  const dialogUrl = `${getDialogsBaseUrl()}${resultsFile}?v=${Date.now()}${lockParam ? `&lockedMethod=${lockParam}` : ""}`;
  const hPct = dlg.heightPercent != null ? Number(dlg.heightPercent) : DIALOG_SIZES.RESULTS.height;
  const wPct = dlg.widthPercent != null ? Number(dlg.widthPercent) : DIALOG_SIZES.RESULTS.width;

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: hPct, width: wPct, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open cluster dialog:", asyncResult.error);
        return;
      }
      clusterDialog = asyncResult.value;
      if (window.HubResultsBridge) HubResultsBridge.registerDialog(clusterDialog);
      clusterDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = parseDialogMessage(arg);
          if (!message) return;
          if (message.action === "ready") sendClusterBundle();
          else if (message.action === "clusterApplyK") {
            // Interactive dendrogram cut / suggested-k pick: update k in the
            // saved spec and recompute, so the whole module refreshes.
            const newK = Number(message.k);
            if (isFinite(newK) && newK >= 2) {
              try {
                const key = sessionStorage.getItem("clusterModelSpec") != null ? "clusterModelSpec" : "clusterSpec";
                const spec = JSON.parse(sessionStorage.getItem(key) || "{}");
                spec.k = Math.round(newK);
                sessionStorage.setItem(key, JSON.stringify(spec));
              } catch (e) { console.error("clusterApplyK spec update:", e); }
              sendClusterBundle();
            }
          }
          else if (message.action === "close") {
            if (window.StatisticoDialogHost) {
              StatisticoDialogHost.closeFromMessage(clusterDialog, function () { clusterDialog = null; });
            } else {
              clusterDialog.close();
              clusterDialog = null;
            }
          }
        } catch (e) {
          console.error("Cluster dialog message:", e);
        }
      });
      clusterDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
        clusterDialog = null;
        if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
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
    const raw = sessionStorage.getItem("clusterModelSpec") || sessionStorage.getItem("clusterSpec");
    if (raw) spec = JSON.parse(raw);
  } catch (e) {
    spec = {};
  }
  spec = normalizeClusterSpec(spec, headers);
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

(function () {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  function makeRunner(lockedMethod) {
    return function () {
      var gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
      if (!gr || !gr.values || gr.values.length < 2) return false;
      /* On the hub page this script is shared, so the lock is set per run. */
      if (lockedMethod !== undefined) window.CLUSTER_LOCKED_METHOD = lockedMethod;
      onRangeDataLoaded(gr.values, gr.address);
      openClusterResultsDialog();
      return true;
    };
  }
  window.StatisticoHubResults.cluster = makeRunner(undefined);
  window.StatisticoHubResults.kmeans = makeRunner("kmeans");
  window.StatisticoHubResults.hierarchical = makeRunner("hierarchical");
})();
