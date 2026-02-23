/* global Office */

let independentRangeData = null;
let independentRangeAddress = "";
let independentDialog = null;

function onRangeDataLoaded(values, address) {
  if (!values || values.length < 2) return showPanel(false);
  independentRangeData = values;
  independentRangeAddress = address || "";
  const headers = values[0] || [];
  const rows = values.slice(1);
  const r = document.getElementById("indRange");
  const n = document.getElementById("indRows");
  const c = document.getElementById("indCols");
  if (r) r.textContent = independentRangeAddress || "Selection";
  if (n) n.textContent = rows.length;
  if (c) c.textContent = headers.length;
  showPanel(true);
  updateButtonState();
}

function showPanel(show) {
  const panel = document.getElementById("indPanel");
  const btn = document.getElementById("openIndependentBuilder");
  if (panel) panel.style.display = show ? "block" : "none";
  if (btn) btn.disabled = !show;
}

function getDialogsBaseUrl() {
  const href = window.location.href;
  if (href.includes("/taskpane/")) return `${href.split("/taskpane/")[0]}/dialogs/views/`;
  return `${window.location.origin}/dialogs/views/`;
}

function openIndependentBuilder() {
  console.log("=== openIndependentBuilder CLICKED ===");
  console.log("independentRangeData:", independentRangeData);
  if (!independentRangeData || independentRangeData.length < 2) {
    console.log("openIndependentBuilder: early exit, no data");
    return;
  }
  console.log("Opening configuration dialog...");
  Office.context.ui.displayDialogAsync(
    `${getDialogsBaseUrl()}independent/independent-input.html?v=${Date.now()}`,
    { height: 90, width: 30, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
      independentDialog = asyncResult.value;
      setTimeout(sendDialogData, 550);
      independentDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || "{}");
          if (message.action === "ready" || message.action === "requestData") sendDialogData();
          else if (message.action === "independentModel") {
            console.log("=== Received independentModel from config dialog ===");
            console.log("message.data:", message.data);
            sessionStorage.setItem("independentModelSpec", JSON.stringify(message.data || message.payload || {}));
            console.log("Saved to sessionStorage, closing config dialog...");
            independentDialog.close();
            independentDialog = null;
            updateButtonState();
            console.log("Calling openIndependentResultsDialog in 380ms...");
            setTimeout(openIndependentResultsDialog, 380);
          } else if (message.action === "close") {
            independentDialog.close();
            independentDialog = null;
          }
        } catch (_e) {}
      });
    }
  );
}

function sendDialogData() {
  if (!independentDialog || !independentRangeData) return;
  const headers = independentRangeData[0] || [];
  const rows = independentRangeData.slice(1);
  const savedModelSpec = JSON.parse(sessionStorage.getItem("independentModelSpec") || "null");
  independentDialog.messageChild(JSON.stringify({
    type: "INDEPENDENT_DATA",
    payload: { headers, rows, address: independentRangeAddress, savedModelSpec }
  }));
}

function parseNum(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}

function mean(a) { return a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); }
function variance(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
  return s / (a.length - 1);
}
function sd(a) { return Math.sqrt(Math.max(0, variance(a))); }
function median(a) {
  const s = a.slice().sort((x, y) => x - y);
  if (!s.length) return NaN;
  const k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}
function quantile(a, q) {
  const s = a.slice().sort((x, y) => x - y);
  if (!s.length) return NaN;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax));
  return sign * y;
}
function normalCdf(z) { return 0.5 * (1 + erf(z / Math.sqrt(2))); }

function chiSquareUpperTailApprox(x, df) {
  if (!isFinite(x) || !isFinite(df) || df <= 0) return NaN;
  const z = (Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return Math.max(0, Math.min(1, 1 - normalCdf(z)));
}

function pearsonCorrelation(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length < 3) return NaN;
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den > 0 ? (num / den) : NaN;
}

function detectTwoVarsDesign(rows, aIdx, bIdx, n1, n2) {
  if (aIdx < 0 || bIdx < 0) {
    return {
      status: "invalid",
      badge: "Invalid design",
      message: "Selected columns are missing. Reopen configuration and pick valid variables."
    };
  }
  if (aIdx === bIdx) {
    return {
      status: "invalid",
      badge: "Invalid design",
      message: "The same variable was selected twice. Choose two different variables."
    };
  }

  const a = [];
  const b = [];
  let pairedCount = 0;
  rows.forEach((r) => {
    const va = parseNum(r[aIdx]);
    const vb = parseNum(r[bIdx]);
    if (isFinite(va) && isFinite(vb)) {
      pairedCount++;
      a.push(va);
      b.push(vb);
    }
  });

  const minN = Math.max(1, Math.min(n1, n2));
  const overlap = pairedCount / minN;
  const corr = pearsonCorrelation(a, b);
  const highPairing = pairedCount >= 10 && overlap >= 0.85;

  if (highPairing) {
    return {
      status: "paired-warning",
      badge: "Paired-like structure",
      pairedCount,
      overlap,
      corr,
      message: "Warning: this test is intended for independent variables. These columns appear case-aligned from the same dataset; consider switching to the Dependent/Paired module instead."
    };
  }

  return {
    status: "independent",
    badge: "Independent",
    pairedCount,
    overlap,
    corr,
    message: "Design is compatible with independent-group comparison."
  };
}

function computeWelch(x, y, alt) {
  const n1 = x.length, n2 = y.length;
  const m1 = mean(x), m2 = mean(y);
  const v1 = variance(x), v2 = variance(y);
  const se = Math.sqrt((v1 / n1) + (v2 / n2));
  const t = se > 0 ? (m1 - m2) / se : 0;
  const num = Math.pow((v1 / n1) + (v2 / n2), 2);
  const den = (Math.pow(v1 / n1, 2) / Math.max(1, n1 - 1)) + (Math.pow(v2 / n2, 2) / Math.max(1, n2 - 1));
  const df = den > 0 ? num / den : Math.max(1, n1 + n2 - 2);
  const z = Math.abs(t);
  let p = 2 * (1 - normalCdf(z));
  if (alt === "greater") p = 1 - normalCdf(t);
  if (alt === "less") p = normalCdf(t);
  const zcrit = 1.959964;
  return { t, df, p: Math.max(0, Math.min(1, p)), diff: m1 - m2, ciLow: (m1 - m2) - zcrit * se, ciHigh: (m1 - m2) + zcrit * se };
}

function computeStudent(x, y, alt) {
  const n1 = x.length, n2 = y.length;
  const m1 = mean(x), m2 = mean(y);
  const v1 = variance(x), v2 = variance(y);
  const sp2 = ((((n1 - 1) * v1) + ((n2 - 1) * v2)) / Math.max(1, (n1 + n2 - 2)));
  const se = Math.sqrt(Math.max(0, sp2) * ((1 / Math.max(1, n1)) + (1 / Math.max(1, n2))));
  const t = se > 0 ? (m1 - m2) / se : 0;
  const df = Math.max(1, n1 + n2 - 2);
  let p = 2 * (1 - normalCdf(Math.abs(t)));
  if (alt === "greater") p = 1 - normalCdf(t);
  if (alt === "less") p = normalCdf(t);
  const zcrit = 1.959964;
  return { t, df, p: Math.max(0, Math.min(1, p)), diff: m1 - m2, ciLow: (m1 - m2) - zcrit * se, ciHigh: (m1 - m2) + zcrit * se };
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

function computePermutationT(x, y, alt, iterations) {
  const n1 = x.length;
  const pooled = x.concat(y);
  const obs = mean(x) - mean(y);
  const absObs = Math.abs(obs);
  const B = Math.max(200, Math.min(4000, Number(iterations) || 1200));
  let extreme = 0;
  for (let b = 0; b < B; b++) {
    const sample = pooled.slice();
    shuffleInPlace(sample);
    const xa = sample.slice(0, n1);
    const xb = sample.slice(n1);
    const d = mean(xa) - mean(xb);
    if (alt === "greater") {
      if (d >= obs) extreme++;
    } else if (alt === "less") {
      if (d <= obs) extreme++;
    } else if (Math.abs(d) >= absObs) {
      extreme++;
    }
  }
  const p = (extreme + 1) / (B + 1);
  return { diff: obs, p: Math.max(0, Math.min(1, p)), iterations: B };
}

function computeMannWhitney(x, y, alt) {
  const all = [];
  x.forEach(v => all.push({ v, g: 1 }));
  y.forEach(v => all.push({ v, g: 2 }));
  all.sort((a, b) => a.v - b.v);
  let i = 0;
  while (i < all.length) {
    let j = i + 1;
    while (j < all.length && all[j].v === all[i].v) j++;
    const r = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) all[k].rank = r;
    i = j;
  }
  const r1 = all.filter(d => d.g === 1).reduce((s, d) => s + d.rank, 0);
  const n1 = x.length, n2 = y.length;
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const mu = n1 * n2 / 2;
  const sigma = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
  const z = sigma > 0 ? (u1 - mu) / sigma : 0;
  let p = 2 * (1 - normalCdf(Math.abs(z)));
  if (alt === "greater") p = 1 - normalCdf(z);
  if (alt === "less") p = normalCdf(z);
  return { u: u1, z, p: Math.max(0, Math.min(1, p)) };
}

function cliffsDelta(x, y) {
  let gt = 0, lt = 0;
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < y.length; j++) {
      if (x[i] > y[j]) gt++;
      else if (x[i] < y[j]) lt++;
    }
  }
  return (gt - lt) / Math.max(1, x.length * y.length);
}

function adjustPValues(raw, method) {
  const m = raw.length;
  if (!m) return [];
  if (method === "none") return raw.slice();
  if (method === "bonferroni") return raw.map(p => Math.min(1, p * m));
  if (method === "holm") {
    const idx = raw.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
    const out = Array(m).fill(1);
    let running = 0;
    for (let k = 0; k < m; k++) {
      const adj = Math.min(1, (m - k) * idx[k].p);
      running = Math.max(running, adj);
      out[idx[k].i] = running;
    }
    return out;
  }
  if (method === "bh") {
    const idx = raw.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
    const out = Array(m).fill(1);
    let running = 1;
    for (let k = m - 1; k >= 0; k--) {
      const adj = Math.min(1, (m / (k + 1)) * idx[k].p);
      running = Math.min(running, adj);
      out[idx[k].i] = running;
    }
    return out;
  }
  return raw.slice();
}

function computePosthocRows(grouped, levels, framework, correction) {
  const rows = [];
  const rawP = [];
  for (let i = 0; i < levels.length - 1; i++) {
    for (let j = i + 1; j < levels.length; j++) {
      const a = grouped[levels[i]] || [];
      const b = grouped[levels[j]] || [];
      if (framework === "nonparametric") {
        const mw = computeMannWhitney(a, b, "two-sided");
        rows.push({
          comparison: `${levels[i]} vs ${levels[j]}`,
          statistic: `U=${mw.u.toFixed(2)}`,
          rawP: mw.p,
          estimate: (2 * (mw.u / Math.max(1, a.length * b.length)) - 1)
        });
        rawP.push(mw.p);
      } else {
        const w = computeWelch(a, b, "two-sided");
        rows.push({
          comparison: `${levels[i]} vs ${levels[j]}`,
          statistic: `t=${w.t.toFixed(2)}`,
          rawP: w.p,
          estimate: w.diff
        });
        rawP.push(w.p);
      }
    }
  }
  const adj = adjustPValues(rawP, correction);
  return rows.map((r, i) => ({
    comparison: r.comparison,
    statistic: r.statistic,
    rawP: r.rawP,
    adjP: adj[i],
    estimate: r.estimate
  }));
}

function computeOneWayAnovaFromArrays(arrays) {
  const clean = (arrays || []).filter(a => Array.isArray(a) && a.length > 0);
  const k = clean.length;
  if (k < 2) return null;
  const N = clean.reduce((s, a) => s + a.length, 0);
  const grand = clean.reduce((acc, arr) => acc.concat(arr), []);
  const grandMean = mean(grand);
  let ssBetween = 0;
  let ssWithin = 0;
  clean.forEach(arr => {
    const m = mean(arr);
    ssBetween += arr.length * Math.pow(m - grandMean, 2);
    arr.forEach(v => { ssWithin += Math.pow(v - m, 2); });
  });
  const ssTotal = ssBetween + ssWithin;
  const df1 = Math.max(1, k - 1);
  const df2 = Math.max(1, N - k);
  const msBetween = ssBetween / df1;
  const msWithin = ssWithin / df2;
  const f = msWithin > 0 ? (msBetween / msWithin) : 0;
  const p = chiSquareUpperTailApprox(f * df1, df1);
  return { k, N, ssBetween, ssWithin, ssTotal, df1, df2, msBetween, msWithin, f, p };
}

function computeLeveneLike(grouped, levels, useMedianCenter) {
  const devArrays = (levels || []).map((lv) => {
    const arr = (grouped[lv] || []).filter(v => isFinite(v));
    if (!arr.length) return [];
    const c = useMedianCenter ? median(arr) : mean(arr);
    return arr.map(v => Math.abs(v - c));
  }).filter(a => a.length > 0);
  const out = computeOneWayAnovaFromArrays(devArrays);
  if (!out) return null;
  return {
    f: out.f,
    df1: out.df1,
    df2: out.df2,
    p: out.p
  };
}

function computeWelchAnova(grouped, levels) {
  const rows = (levels || []).map((lv) => {
    const arr = (grouped[lv] || []).filter(v => isFinite(v));
    if (arr.length < 2) return null;
    const v = variance(arr);
    return {
      n: arr.length,
      mean: mean(arr),
      variance: Math.max(v, 1e-12)
    };
  }).filter(Boolean);
  const k = rows.length;
  if (k < 2) return null;
  const w = rows.map(r => r.n / r.variance);
  const wSum = w.reduce((s, x) => s + x, 0);
  if (!(wSum > 0)) return null;
  const yBarW = rows.reduce((s, r, i) => s + w[i] * r.mean, 0) / wSum;
  const df1 = k - 1;
  let a = 0;
  for (let i = 0; i < k; i++) a += w[i] * Math.pow(rows[i].mean - yBarW, 2);
  a = a / Math.max(1e-12, df1);
  let uSum = 0;
  for (let i = 0; i < k; i++) {
    const ni = rows[i].n;
    const wi = w[i];
    uSum += (1 / Math.max(1, ni - 1)) * Math.pow(1 - wi / wSum, 2);
  }
  const c = 1 + (2 * Math.max(0, k - 2) / Math.max(1e-12, (k * k - 1))) * uSum;
  const f = c > 0 ? a / c : 0;
  const df2 = uSum > 0 ? ((k * k - 1) / (3 * uSum)) : 1;
  const p = chiSquareUpperTailApprox(f * df1, df1);
  return { f, df1, df2: Math.max(1, df2), p };
}

function buildIndependentBundle(headers, rows, spec) {
  console.log("=== buildIndependentBundle START ===");
  console.log("spec:", spec);
  const compareMode = spec.compareMode || (spec.mode === "k-plus" ? "k-plus" : "two-vars");
  console.log("compareMode:", compareMode);
  const mode = compareMode === "k-plus" ? "k-plus" : "two-column";
  const primaryFramework = spec.primaryFramework || "parametric";
  const posthocMethod = spec.posthocMethod || (primaryFramework === "nonparametric" ? "dunn" : "games-howell");
  const posthocCorrection = spec.posthocCorrection || "holm";
  const primaryTest = spec.primaryTest || "welch";
  let selectedColumns = Array.isArray(spec.selectedColumns) && spec.selectedColumns.length
    ? spec.selectedColumns.filter(name => headers.indexOf(name) >= 0)
    : headers.slice();
  console.log("selectedColumns (before k-plus check):", selectedColumns);
  if (compareMode === "k-plus" && (!Array.isArray(spec.selectedColumns) || !spec.selectedColumns.length)) {
    // Do not silently expand to all columns in k-plus mode.
    const seeded = [spec.valueColumn, spec.groupColumn]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .filter((name) => headers.indexOf(name) >= 0);
    selectedColumns = seeded.length >= 3 ? seeded : headers.slice(0, Math.min(3, headers.length));
    console.log("selectedColumns (k-plus fallback applied):", selectedColumns);
  }
  console.log("selectedColumns (final):", selectedColumns);
  console.log("headers:", headers);
  const selectedColumnStats = selectedColumns.map((name) => {
    const idx = headers.indexOf(name);
    const values = [];
    rows.forEach((r) => {
      const v = parseNum(r[idx]);
      if (isFinite(v)) values.push(v);
    });
    return {
      name,
      n: values.length,
      mean: values.length ? mean(values) : NaN,
      sd: values.length ? sd(values) : NaN
    };
  });
  let g1 = [], g2 = [];
  let grouped = {};
  let kplusSummary = null;
  let designValidation = {
    status: "independent",
    badge: "Independent",
    message: "Design is compatible with independent-group comparison."
  };
  if (compareMode === "two-vars") {
    const aIdx = headers.indexOf(spec.groupA || selectedColumns[0] || headers[0]);
    const bIdx = headers.indexOf(spec.groupB || selectedColumns[1] || selectedColumns[0] || headers[1] || headers[0]);
    rows.forEach(r => {
      const a = parseNum(r[aIdx]);
      const b = parseNum(r[bIdx]);
      if (isFinite(a)) g1.push(a);
      if (isFinite(b)) g2.push(b);
    });
    designValidation = detectTwoVarsDesign(rows, aIdx, bIdx, g1.length, g2.length);
  } else {
    // In k-plus mode, each selected variable is treated as one independent group.
    selectedColumns.forEach((colName) => {
      const colIdx = headers.indexOf(colName);
      if (colIdx < 0) return;
      const vals = [];
      rows.forEach((r) => {
        const v = parseNum(r[colIdx]);
        if (isFinite(v)) vals.push(v);
      });
      if (vals.length) grouped[colName] = vals;
    });
    const levels = Object.keys(grouped).filter(k => grouped[k].length > 0);
    const allVals = [];
    levels.forEach((lv) => (grouped[lv] || []).forEach((v) => allVals.push(v)));
    kplusSummary = {
      variableCount: levels.length,
      levelsCount: levels.length,
      totalN: allVals.length,
      meanOverall: allVals.length ? mean(allVals) : NaN
    };
    if (levels.length >= 2) {
      g1 = grouped[levels[0]].slice();
      g2 = grouped[levels[1]].slice();
    }
  }
  const alt = spec.hypothesis || "two-sided";
  const welch = computeWelch(g1, g2, alt);
  const student = computeStudent(g1, g2, alt);
  const permutation = computePermutationT(g1, g2, alt, spec.permutationIterations || 1200);
  const mw = computeMannWhitney(g1, g2, alt);
  const n1 = g1.length, n2 = g2.length;
  const sp = Math.sqrt((((Math.max(0, n1 - 1)) * variance(g1)) + ((Math.max(0, n2 - 1)) * variance(g2))) / Math.max(1, n1 + n2 - 2));
  const d = sp > 0 ? (mean(g1) - mean(g2)) / sp : 0;
  const g = d * (1 - (3 / Math.max(1, (4 * (n1 + n2) - 9))));
  const delta = cliffsDelta(g1, g2);
  const rrb = 2 * (mw.u / Math.max(1, n1 * n2)) - 1;
  const ps = (delta + 1) / 2;
  let omnibus = null;
  let posthoc = { enabled: false, method: posthocMethod, correction: posthocCorrection, rows: [] };
  if (compareMode === "k-plus") {
    const levels = Object.keys(grouped).filter(k => grouped[k].length > 0);
    const arrays = levels.map(k => grouped[k]);
    const groupDescriptives = levels.map((lv) => {
      const arr = grouped[lv] || [];
      return {
        name: lv,
        n: arr.length,
        mean: arr.length ? mean(arr) : NaN,
        sd: arr.length > 1 ? sd(arr) : NaN
      };
    });
    console.log("[buildIndependentBundle k-plus] levels:", levels);
    console.log("[buildIndependentBundle k-plus] groupDescriptives:", groupDescriptives);
    const anova = computeOneWayAnovaFromArrays(arrays);
    const N = anova ? anova.N : 0;
    const df1 = anova ? anova.df1 : Math.max(1, levels.length - 1);
    const df2 = anova ? anova.df2 : Math.max(1, N - levels.length);
    const f = anova ? anova.f : 0;
    const pAnova = anova ? anova.p : NaN;

    // Kruskal-Wallis
    const pooled = [];
    levels.forEach((lv, gi) => grouped[lv].forEach(v => pooled.push({ v, gi })));
    pooled.sort((a, b) => a.v - b.v);
    let i = 0;
    while (i < pooled.length) {
      let j = i + 1;
      while (j < pooled.length && pooled[j].v === pooled[i].v) j++;
      const r = (i + 1 + j) / 2;
      for (let k = i; k < j; k++) pooled[k].rank = r;
      i = j;
    }
    const rankSums = Array(levels.length).fill(0);
    pooled.forEach(p => { rankSums[p.gi] += p.rank; });
    let H = 0;
    const meanRanks = {};
    for (let g = 0; g < levels.length; g++) {
      const ng = grouped[levels[g]].length;
      H += (rankSums[g] * rankSums[g]) / Math.max(1, ng);
      meanRanks[levels[g]] = rankSums[g] / Math.max(1, ng);
    }
    H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
    const pKw = chiSquareUpperTailApprox(H, df1);
    const etaSquared = (anova && (anova.ssBetween + anova.ssWithin) > 0) ? (anova.ssBetween / (anova.ssBetween + anova.ssWithin)) : NaN;
    const omegaSquared = (anova && (anova.ssTotal + anova.msWithin) > 0)
      ? Math.max(0, (anova.ssBetween - (anova.df1 * anova.msWithin)) / (anova.ssTotal + anova.msWithin))
      : NaN;
    const cohenF = (isFinite(etaSquared) && etaSquared >= 0 && etaSquared < 1) ? Math.sqrt(etaSquared / Math.max(1e-12, (1 - etaSquared))) : NaN;
    const epsilonSquared = (N > levels.length)
      ? Math.max(0, (H - levels.length + 1) / Math.max(1e-12, (N - levels.length)))
      : NaN;
    const etaSquaredH = N > 1 ? Math.max(0, H / Math.max(1, N - 1)) : NaN;
    const levene = computeLeveneLike(grouped, levels, false);
    const brownForsythe = computeLeveneLike(grouped, levels, true);
    const welchAnova = computeWelchAnova(grouped, levels);
    omnibus = {
      levels,
      N,
      anovaF: f,
      anovaDf1: df1,
      anovaDf2: df2,
      anovaP: pAnova,
      anovaSSBetween: anova ? anova.ssBetween : NaN,
      anovaSSWithin: anova ? anova.ssWithin : NaN,
      anovaSSTotal: anova ? anova.ssTotal : NaN,
      anovaMSBetween: anova ? anova.msBetween : NaN,
      anovaMSWithin: anova ? anova.msWithin : NaN,
      etaSquared,
      omegaSquared,
      cohenF,
      kwH: H,
      kwDf: df1,
      kwP: pKw,
      epsilonSquared,
      etaSquaredH,
      meanRanks,
      groupDescriptives,
      levene,
      brownForsythe,
      welchAnova
    };
    posthoc = {
      enabled: true,
      method: posthocMethod,
      correction: posthocCorrection,
      rows: computePosthocRows(grouped, levels, primaryFramework, posthocCorrection)
    };
  }
  const recommendation = designValidation.status === "paired-warning"
    ? "Potential matched-pairs structure detected. Independent Means is for independent variables; consider using the Dependent/Paired module."
    : (designValidation.status === "invalid"
      ? "Invalid design selection. Reconfigure variables before interpreting results."
      : "Welch t-test primary; Mann-Whitney as robustness check.");

  return {
    setup: {
      mode,
      compareMode,
      primaryFramework,
      hypothesis: alt,
      confidence: Number(spec.confidence || 0.95),
      posthocMethod,
      posthocCorrection,
      primaryTest,
      selectedColumns: selectedColumns.slice(),
      groupA: spec.groupA || "",
      groupB: spec.groupB || "",
      valueColumn: spec.valueColumn || "",
      groupColumn: spec.groupColumn || "",
      groupALabel: spec.groupALabel || "Group A",
      groupBLabel: spec.groupBLabel || "Group B",
      headers: selectedColumns.slice(),
      groupLevels: Object.keys(grouped || {}),
      designValidation
    },
    explore: {
      n1, n2, mean1: mean(g1), mean2: mean(g2), med1: median(g1), med2: median(g2),
      sd1: sd(g1), sd2: sd(g2), iqr1: quantile(g1, 0.75) - quantile(g1, 0.25), iqr2: quantile(g2, 0.75) - quantile(g2, 0.25),
      selectedColumnStats,
      kplusSummary
    },
    assumptions: {
      normalityA: n1 >= 8 ? "Check QQ / Shapiro in Python service" : "Sample too small",
      normalityB: n2 >= 8 ? "Check QQ / Shapiro in Python service" : "Sample too small",
      equalVariance: Math.abs((sd(g1) || 0) - (sd(g2) || 0)) < 0.25 * Math.max(sd(g1) || 1, sd(g2) || 1) ? "Likely similar" : "Likely different",
      recommendation
    },
    results: {
      primary: "Welch t-test",
      welchT: welch.t, welchDf: welch.df, welchP: welch.p,
      studentT: student.t, studentDf: student.df, studentP: student.p,
      permutationP: permutation.p, permutationIterations: permutation.iterations,
      meanDiff: welch.diff, ciLow: welch.ciLow, ciHigh: welch.ciHigh,
      u: mw.u, mwP: mw.p,
      omnibus,
      posthoc
    },
    effects: {
      hedgesG: g, cliffsDelta: delta, rankBiserial: rrb, probabilitySuperiority: ps
    },
    power: {
      note: "Python-backed power endpoint can be attached to this panel.",
      suggestedEndpoint: "POST /power/two-sample",
      placeholderPower: Math.min(0.99, Math.max(0.05, 0.5 + Math.abs(g) * 0.3))
    },
    report: {
      apaWelch: `Welch's t-test showed ${welch.p < 0.05 ? "a significant" : "no significant"} difference, t(${welch.df.toFixed(2)})=${welch.t.toFixed(2)}, p=${welch.p.toFixed(4)}.`,
      apaMW: `Mann-Whitney U indicated ${mw.p < 0.05 ? "a significant" : "no significant"} shift, U=${mw.u.toFixed(2)}, p=${mw.p.toFixed(4)}.`,
      consistency: (welch.p < 0.05) === (mw.p < 0.05) ? "Parametric and nonparametric conclusions agree." : "Tests disagree; inspect distributions and outliers."
    }
  };
}

function openIndependentResultsDialog() {
  const modelSpec = JSON.parse(sessionStorage.getItem("independentModelSpec") || "{}");
  console.log("=== openIndependentResultsDialog ===");
  console.log("modelSpec from sessionStorage:", modelSpec);
  const isKPlus = (modelSpec.compareMode || modelSpec.mode) === "k-plus";
  console.log("isKPlus:", isKPlus);
  const resultsPage = isKPlus ? "independent-results-kplus.html" : "independent-results.html";
  console.log("Opening results page:", resultsPage);
  Office.context.ui.displayDialogAsync(
    `${getDialogsBaseUrl()}independent/${resultsPage}?v=${Date.now()}`,
    { height: 90, width: 70, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
      independentDialog = asyncResult.value;
      independentDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || "{}");
          console.log("[Results dialog message]", message.action);
          if (message.action === "ready") sendIndependentBundle();
          else if (message.action === "HOST_EVENT") {
            if (message.cmd === "independentSettingsChanged" && message.data) {
              const current = JSON.parse(sessionStorage.getItem("independentModelSpec") || "{}");
              const next = Object.assign({}, current, message.data);
              sessionStorage.setItem("independentModelSpec", JSON.stringify(next));
            }
            sendIndependentBundle();
          }
          else if (message.action === "close") { independentDialog.close(); independentDialog = null; }
        } catch (_e) { console.error("Results dialog message error:", _e); }
      });
      setTimeout(sendIndependentBundle, 1100);
    }
  );
}

function sendIndependentBundle() {
  console.log("=== sendIndependentBundle called ===");
  if (!independentDialog || !independentRangeData) {
    console.log("sendIndependentBundle: early exit", { independentDialog: !!independentDialog, independentRangeData: !!independentRangeData });
    return;
  }
  const headers = independentRangeData[0] || [];
  const rows = independentRangeData.slice(1);
  const modelSpec = JSON.parse(sessionStorage.getItem("independentModelSpec") || "{}");
  console.log("sendIndependentBundle: calling buildIndependentBundle with modelSpec:", modelSpec);
  const bundle = buildIndependentBundle(headers, rows, modelSpec);
  console.log("sendIndependentBundle: bundle built, sending to dialog");
  independentDialog.messageChild(JSON.stringify({ 
    type: "INDEPENDENT_BUNDLE", 
    payload: bundle,
    rawData: independentRangeData  // Include raw data for descriptive stats
  }));
}

function resetIndependentModel() {
  sessionStorage.removeItem("independentModelSpec");
  updateButtonState();
}

function updateButtonState() {
  const has = !!sessionStorage.getItem("independentModelSpec");
  const openBtn = document.getElementById("openIndependentBuilder");
  const resetBtn = document.getElementById("resetIndependentModelBtn");
  if (openBtn) {
    openBtn.innerHTML = has
      ? '<i class="fa-solid fa-sliders"></i> Open Configuration'
      : '<i class="fa-solid fa-up-right-from-square"></i> Open Configuration';
    openBtn.onclick = openIndependentBuilder;
    openBtn.disabled = !independentRangeData || independentRangeData.length < 2;
  }
  if (resetBtn) resetBtn.style.display = has ? "inline-block" : "none";
}

window.openIndependentBuilder = openIndependentBuilder;
window.openIndependentResultsDialog = openIndependentResultsDialog;
window.resetIndependentModel = resetIndependentModel;
