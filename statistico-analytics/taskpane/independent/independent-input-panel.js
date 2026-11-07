/* global Office */

let independentRangeData = null;
let independentRangeAddress = "";
let independentDialog = null;
// Cache of the last filtered row set (null = no filter active). Settings
// changes (alpha, framework, primary test, ...) call sendIndependentBundle,
// which without this cache would silently revert the analysis to the full
// source range and contradict the still-visible filter banner. With the
// cache, every recompute path — filter apply, filter clear, settings
// change, re-emit on dialog ready — uses the same row set the user sees.
let independentFilteredRows = null;
let _indEmbedMessageHandler = null;

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

function detachIndEmbedListener() {
  if (_indEmbedMessageHandler) {
    window.removeEventListener("message", _indEmbedMessageHandler);
    _indEmbedMessageHandler = null;
  }
}

function hideIndependentConfigEmbed() {
  detachIndEmbedListener();
  const host = document.getElementById("independentConfigHost");
  const frame = document.getElementById("independentConfigFrame");
  if (host) host.classList.remove("visible");
  if (frame) {
    try { frame.src = "about:blank"; } catch (_e) {}
  }
}

function sendDialogDataToEmbed() {
  const frame = document.getElementById("independentConfigFrame");
  if (!frame || !frame.contentWindow) return;
  const headers = (independentRangeData && independentRangeData.length) ? (independentRangeData[0] || []) : [];
  const rows = (independentRangeData && independentRangeData.length > 1) ? independentRangeData.slice(1) : [];
  // Always open the builder fresh.
  const savedModelSpec = null;
  try {
    frame.contentWindow.postMessage(
      {
        statisticoIndependentHost: true,
        body: JSON.stringify({
          type: "INDEPENDENT_DATA",
          payload: { headers, rows, address: independentRangeAddress, savedModelSpec }
        })
      },
      "*"
    );
  } catch (_e) {}
}

function attachIndEmbedListener() {
  detachIndEmbedListener();
  _indEmbedMessageHandler = function (ev) {
    const d = ev.data;
    if (!d || d.statisticoIndependentEmbed !== true) return;
    let message;
    try {
      message = JSON.parse(d.body || "{}");
    } catch (_e) {
      return;
    }
    if (message.action === "ready" || message.action === "requestData") {
      sendDialogDataToEmbed();
      return;
    }
    if (message.action === "independentModel") {
      sessionStorage.setItem("independentModelSpec", JSON.stringify(message.data || message.payload || {}));
      hideIndependentConfigEmbed();
      updateButtonState();
      setTimeout(openIndependentResultsDialog, 380);
      return;
    }
    if (message.action === "close") {
      hideIndependentConfigEmbed();
    }
  };
  window.addEventListener("message", _indEmbedMessageHandler);
}

/** Fallback: floating Office dialog (used only if task pane has no embed host). */
function openIndependentBuilderDialog() {
  Office.context.ui.displayDialogAsync(
    `${getDialogsBaseUrl()}independent/independent-input.html?v=${Date.now()}`,
    DIALOG_SIZES.REGRESSION_BUILDER,
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
      independentDialog = asyncResult.value;
      setTimeout(sendDialogData, 550);
      if (window.StatisticoDialogHost) {
        StatisticoDialogHost.onUserClosed(independentDialog, function () { independentDialog = null; });
      }
      independentDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || "{}");
          if (message.action === "ready" || message.action === "requestData") sendDialogData();
          else if (message.action === "independentModel") {
            sessionStorage.setItem("independentModelSpec", JSON.stringify(message.data || message.payload || {}));
            independentDialog.close();
            independentDialog = null;
            updateButtonState();
            setTimeout(openIndependentResultsDialog, 380);
          } else if (message.action === "close") {
            if (window.StatisticoDialogHost) {
              StatisticoDialogHost.closeFromMessage(independentDialog, function () { independentDialog = null; });
            } else {
              independentDialog.close();
              independentDialog = null;
            }
          }
        } catch (_e) {}
      });
    }
  );
}

function openIndependentBuilder() {
  const host = document.getElementById("independentConfigHost");
  const frame = document.getElementById("independentConfigFrame");
  if (!host || !frame) {
    openIndependentBuilderDialog();
    return;
  }
  host.classList.add("visible");
  attachIndEmbedListener();
  const url = `${getDialogsBaseUrl()}independent/independent-input.html?embed=1&v=${Date.now()}`;
  frame.src = url;
  try {
    frame.focus();
    host.scrollIntoView({ block: "nearest", behavior: "smooth" });
  } catch (_e) {}
}

function sendDialogData() {
  if (!independentDialog) return;
  const headers = (independentRangeData && independentRangeData.length) ? (independentRangeData[0] || []) : [];
  const rows = (independentRangeData && independentRangeData.length > 1) ? independentRangeData.slice(1) : [];
  // Always open the builder fresh.
  const savedModelSpec = null;
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

function gammaLowerSeries(a, x) {
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 1; n <= 200; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

function gammaUpperFraction(a, x) {
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

function chiSquareUpperTail(x, df) {
  if (!isFinite(x) || !isFinite(df) || df <= 0) return NaN;
  if (x <= 0) return 1;
  const a = df / 2;
  const xx = x / 2;
  const q = xx < a + 1 ? 1 - gammaLowerSeries(a, xx) : gammaUpperFraction(a, xx);
  return isFinite(q) ? Math.max(0, Math.min(1, q)) : chiSquareUpperTailApprox(x, df);
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

function computeWelch(x, y, alt, alpha) {
  if (!globalThis.StatisticoIndependentContract) {
    throw new Error("Load independent-contract.js before independent-input-panel.js");
  }
  return globalThis.StatisticoIndependentContract.computeWelch(x, y, alt, alpha);
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
  if (!globalThis.StatisticoIndependentContract) {
    throw new Error("Load independent-contract.js before independent-input-panel.js");
  }
  return globalThis.StatisticoIndependentContract.computeMannWhitney(x, y, alt);
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

function logGammaTukey(z) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return Math.log(2.5066282746310005 * ser / x) - tmp;
}

function rangeCdfTukey(w, k) {
  if (!(w > 0)) return 0;
  const steps = 160, a = -8, b = 8, h = (b - a) / steps;
  let sum = 0;
  for (let i = 0; i <= steps; i++) {
    const x = a + i * h;
    const phi = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const d = Math.max(0, normalCdf(x + w) - normalCdf(x));
    const wt = (i === 0 || i === steps) ? 0.5 : 1;
    sum += wt * k * phi * Math.pow(d, k - 1);
  }
  return Math.max(0, Math.min(1, sum * h));
}

function tukeyCdf(q, k, df) {
  if (!(q > 0) || !(k >= 2) || !(df > 0)) return q <= 0 ? 0 : NaN;
  const steps = 200;
  const a = 0.02;
  const b = Math.max(3.2, 1 + 10 / Math.sqrt(df));
  const h = (b - a) / steps;
  let sum = 0;
  for (let i = 0; i <= steps; i++) {
    const s = a + i * h;
    const half = df / 2;
    const logf = -(half - 1) * Math.LN2 - logGammaTukey(half) + half * Math.log(df) + (df - 1) * Math.log(s) - 0.5 * df * s * s;
    const dens = Math.exp(logf);
    const y = (isFinite(dens) ? dens : 0) * rangeCdfTukey(q * s, k);
    const wt = (i === 0 || i === steps) ? 0.5 : 1;
    sum += wt * y;
  }
  return Math.max(0, Math.min(1, sum * h));
}

function tukeyQuantile(p, k, df) {
  k = Math.max(2, Math.round(k));
  df = Math.max(1, df);
  if (df > 5000) df = 5000;
  let lo = 0.1, hi = 12;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (tukeyCdf(mid, k, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function pooledRankTable(grouped, levels) {
  const pooled = [];
  levels.forEach((lv, gi) => (grouped[lv] || []).forEach(v => pooled.push({ v, gi })));
  pooled.sort((a, b) => a.v - b.v);
  let tieCube = 0;
  let i = 0;
  while (i < pooled.length) {
    let j = i + 1;
    while (j < pooled.length && pooled[j].v === pooled[i].v) j++;
    const t = j - i;
    if (t > 1) tieCube += (t * t * t) - t;
    const r = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) pooled[k].rank = r;
    i = j;
  }
  const N = pooled.length;
  const rankSums = Array(levels.length).fill(0);
  pooled.forEach(p => { rankSums[p.gi] += p.rank; });
  const meanRanks = {};
  levels.forEach((lv, g) => {
    meanRanks[lv] = rankSums[g] / Math.max(1, (grouped[lv] || []).length);
  });
  let hRaw = 0;
  levels.forEach((lv, g) => {
    const ng = (grouped[lv] || []).length;
    hRaw += (rankSums[g] * rankSums[g]) / Math.max(1, ng);
  });
  hRaw = (12 / (N * (N + 1))) * hRaw - 3 * (N + 1);
  const tieDenom = (N * N * N) - N;
  const tieFactor = tieDenom > 0 ? tieCube / tieDenom : 0;
  const correction = tieFactor > 0 && tieFactor < 1 ? 1 - tieFactor : 1;
  const h = correction > 0 && correction < 1 ? hRaw / correction : hRaw;
  return { N, meanRanks, hRaw, h, tieFactor, tieCube, tieCorrection: tieFactor > 0 };
}

function resolvePosthocMethod(requested, framework, primaryTest) {
  if (framework === "nonparametric") {
    return requested === "mann-whitney" ? "mann-whitney" : "dunn";
  }
  if (requested === "games-howell" || requested === "gameshowell" || requested === "games") return "games-howell";
  if (requested === "tukey") return "tukey";
  return primaryTest === "welch" ? "games-howell" : "tukey";
}

function computePosthocRows(grouped, levels, framework, correction, spec) {
  spec = spec || {};
  const method = resolvePosthocMethod(spec.method, framework, spec.primaryTest);
  const k = levels.length;
  const rows = [];
  if (method === "mann-whitney") {
    for (let i = 0; i < k - 1; i++) {
      for (let j = i + 1; j < k; j++) {
        const a = grouped[levels[i]] || [];
        const b = grouped[levels[j]] || [];
        const mw = computeMannWhitney(a, b, "two-sided");
        rows.push({
          comparison: `${levels[i]} vs ${levels[j]}`,
          statistic: `U=${mw.u.toFixed(2)}`,
          rawP: mw.p,
          estimate: (2 * (mw.u / Math.max(1, a.length * b.length)) - 1),
          estimateKind: "rank-biserial",
          intervalKind: "unavailable"
        });
      }
    }
  } else if (method === "dunn") {
    const ranks = pooledRankTable(grouped, levels);
    const N = ranks.N;
    const tieTerm = ranks.tieCube / (12 * Math.max(1, N - 1));
    const base = (N * (N + 1) / 12) - tieTerm;
    for (let i = 0; i < k - 1; i++) {
      for (let j = i + 1; j < k; j++) {
        const ni = (grouped[levels[i]] || []).length;
        const nj = (grouped[levels[j]] || []).length;
        const diff = ranks.meanRanks[levels[i]] - ranks.meanRanks[levels[j]];
        const se = Math.sqrt(Math.max(0, base) * (1 / Math.max(1, ni) + 1 / Math.max(1, nj)));
        const z = se > 0 ? diff / se : 0;
        const p = se > 0 ? 2 * (1 - normalCdf(Math.abs(z))) : NaN;
        rows.push({
          comparison: `${levels[i]} vs ${levels[j]}`,
          statistic: `z=${z.toFixed(2)}`,
          rawP: p,
          estimate: diff,
          estimateKind: "mean-rank-difference",
          intervalKind: "unavailable"
        });
      }
    }
  } else if (method === "games-howell") {
    for (let i = 0; i < k - 1; i++) {
      for (let j = i + 1; j < k; j++) {
        const a = grouped[levels[i]] || [];
        const b = grouped[levels[j]] || [];
        const na = a.length, nb = b.length;
        const va = variance(a), vb = variance(b);
        const diff = mean(a) - mean(b);
        const se = Math.sqrt(0.5 * (va / Math.max(1, na) + vb / Math.max(1, nb)));
        const q = se > 0 ? Math.abs(diff) / se : 0;
        const df = Math.pow(va / na + vb / nb, 2) / (Math.pow(va / na, 2) / Math.max(1, na - 1) + Math.pow(vb / nb, 2) / Math.max(1, nb - 1));
        const p = se > 0 ? 1 - tukeyCdf(q, k, df) : NaN;
        const crit = tukeyQuantile(1 - (spec.alpha || 0.05), k, df);
        const sp = Math.sqrt((((Math.max(0, na - 1)) * va) + ((Math.max(0, nb - 1)) * vb)) / Math.max(1, na + nb - 2));
        rows.push({
          comparison: `${levels[i]} vs ${levels[j]}`,
          statistic: `q=${q.toFixed(2)}`,
          rawP: NaN,
          adjP: p,
          estimate: diff,
          estimateKind: "mean-difference",
          intervalKind: "simultaneous",
          ciLower: diff - crit * se,
          ciUpper: diff + crit * se,
          cohenD: sp > 0 ? diff / sp : 0
        });
      }
    }
  } else {
    const ms = spec.msWithin;
    const df = spec.dfError;
    for (let i = 0; i < k - 1; i++) {
      for (let j = i + 1; j < k; j++) {
        const a = grouped[levels[i]] || [];
        const b = grouped[levels[j]] || [];
        const na = a.length, nb = b.length;
        const diff = mean(a) - mean(b);
        const se = ms > 0 ? Math.sqrt(ms * 0.5 * (1 / Math.max(1, na) + 1 / Math.max(1, nb))) : 0;
        const q = se > 0 ? Math.abs(diff) / se : 0;
        const p = se > 0 ? 1 - tukeyCdf(q, k, df) : NaN;
        const crit = tukeyQuantile(1 - (spec.alpha || 0.05), k, df);
        const sp = Math.sqrt(ms);
        rows.push({
          comparison: `${levels[i]} vs ${levels[j]}`,
          statistic: `q=${q.toFixed(2)}`,
          rawP: NaN,
          adjP: p,
          estimate: diff,
          estimateKind: "mean-difference",
          intervalKind: "simultaneous",
          ciLower: isFinite(crit) ? diff - crit * se : NaN,
          ciUpper: isFinite(crit) ? diff + crit * se : NaN,
          cohenD: sp > 0 ? diff / sp : 0
        });
      }
    }
  }
  const builtin = method === "tukey" || method === "games-howell";
  const familySize = rows.length;
  const adj = builtin ? null : adjustPValues(rows.map(r => r.rawP), correction || "holm");
  const estimateLabel = method === "dunn"
    ? "Mean rank difference"
    : (method === "mann-whitney" ? "Rank-biserial r" : "Mean difference");
  return {
    method,
    correction: builtin ? "builtin" : (correction || "holm"),
    familySize,
    estimateLabel,
    intervalKind: builtin ? "simultaneous" : "unavailable",
    intervalNote: builtin
      ? "Simultaneous interval from the studentized-range critical value."
      : "Interval unavailable for this effect estimator.",
    treatment: method === "mann-whitney"
      ? "Mann–Whitney U uses average ranks for ties and an asymptotic normal p-value with no continuity correction."
      : (method === "dunn" ? "Dunn reports a mean-rank difference. Rank-biserial r is a separate effect estimator." : ""),
    rows: rows.map((r, i) => ({
      comparison: r.comparison,
      statistic: r.statistic,
      rawP: r.rawP,
      adjP: builtin ? r.adjP : adj[i],
      estimate: r.estimate,
      estimateKind: r.estimateKind,
      intervalKind: r.intervalKind || (builtin ? "simultaneous" : "unavailable"),
      ciLower: r.ciLower,
      ciUpper: r.ciUpper,
      cohenD: r.cohenD
    }))
  };
}

function lnGamma(z) {
  const p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = p[0];
  for (let i = 1; i < 9; i++) x += p[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function regularizedIncompleteBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x > (a + 1) / (a + b + 2)) return 1 - regularizedIncompleteBeta(b, a, 1 - x);
  const lbeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  const STOP = 1e-12;
  const TINY = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const m2 = 2 * i;
    let aa = i * (b - i) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = -(a + i) * (qab + i) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < STOP) break;
  }
  return Math.max(0, Math.min(1, front * h));
}

function fUpperTail(f, df1, df2) {
  if (!isFinite(f) || !isFinite(df1) || !isFinite(df2) || df1 <= 0 || df2 <= 0) return NaN;
  if (f <= 0) return 1;
  const x = (df1 * f) / (df1 * f + df2);
  const cdf = regularizedIncompleteBeta(df1 / 2, df2 / 2, x);
  if (!isFinite(cdf)) return NaN;
  return Math.max(0, Math.min(1, 1 - cdf));
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
  const p = fUpperTail(f, df1, df2);
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
  const df2Safe = Math.max(1, df2);
  const p = fUpperTail(f, df1, df2Safe);
  return { f, df1, df2: df2Safe, p };
}

function buildIndependentBundle(headers, rows, spec) {
  console.log("=== buildIndependentBundle START ===");
  console.log("spec:", spec);
  const compareMode = spec.compareMode || (spec.mode === "k-plus" ? "k-plus" : "two-vars");
  console.log("compareMode:", compareMode);
  const mode = compareMode === "k-plus" ? "k-plus" : "two-column";
  const primaryFramework = spec.primaryFramework || "parametric";
  const primaryTest = spec.primaryTest || "welch";
  const posthocMethod = resolvePosthocMethod(spec.posthocMethod, primaryFramework, primaryTest);
  const posthocCorrection = spec.posthocCorrection || "holm";
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
  const alpha = 1 - Number(spec.confidence || 0.95);
  const welch = computeWelch(g1, g2, alt, alpha);
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

    const ranks = pooledRankTable(grouped, levels);
    const H = ranks.h;
    const meanRanks = ranks.meanRanks;
    const pKw = chiSquareUpperTail(H, df1);
    const etaSquared = (anova && (anova.ssBetween + anova.ssWithin) > 0) ? (anova.ssBetween / (anova.ssBetween + anova.ssWithin)) : NaN;
    const omegaSquared = (anova && (anova.ssTotal + anova.msWithin) > 0)
      ? Math.max(0, (anova.ssBetween - (anova.df1 * anova.msWithin)) / (anova.ssTotal + anova.msWithin))
      : NaN;
    const cohenF = (isFinite(etaSquared) && etaSquared >= 0 && etaSquared < 1) ? Math.sqrt(etaSquared / Math.max(1e-12, (1 - etaSquared))) : NaN;
    const epsilonSquared = N > 1 ? Math.max(0, H / (N - 1)) : NaN;
    const etaSquaredH = (N > levels.length)
      ? Math.max(0, (H - levels.length + 1) / (N - levels.length))
      : NaN;
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
      kwHUncorrected: ranks.hRaw,
      kwDf: df1,
      kwP: pKw,
      tieCorrection: ranks.tieCorrection,
      epsilonSquared,
      etaSquaredH,
      meanRanks,
      groupDescriptives,
      levene,
      brownForsythe,
      welchAnova
    };
    const posthocComputed = computePosthocRows(grouped, levels, primaryFramework, posthocCorrection, {
      method: posthocMethod,
      primaryTest,
      msWithin: anova ? anova.msWithin : NaN,
      dfError: anova ? anova.df2 : NaN,
      alpha
    });
    posthoc = {
      enabled: true,
      method: posthocComputed.method,
      correction: posthocComputed.correction,
      familySize: posthocComputed.familySize,
      estimateLabel: posthocComputed.estimateLabel,
      rows: posthocComputed.rows
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
      min1: g1.length ? Math.min.apply(null, g1) : NaN, max1: g1.length ? Math.max.apply(null, g1) : NaN,
      min2: g2.length ? Math.min.apply(null, g2) : NaN, max2: g2.length ? Math.max.apply(null, g2) : NaN,
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
      welchT: welch.t, welchDf: welch.df, welchP: welch.p, welchSe: welch.se,
      studentT: student.t, studentDf: student.df, studentP: student.p,
      permutationP: permutation.p, permutationIterations: permutation.iterations,
      meanDiff: welch.diff, ciLow: welch.ciLow, ciHigh: welch.ciHigh,
      u: mw.u, mwP: mw.p,
      omnibus,
      posthoc
    },
    effects: {
      hedgesG: g, cliffsDelta: delta, rankBiserial: rrb, probabilitySuperiority: ps,
      etaSquared: globalThis.StatisticoIndependentContract.etaSquared(g1, g2),
      eta2: globalThis.StatisticoIndependentContract.etaSquared(g1, g2)
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
    DIALOG_SIZES.RESULTS,
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
      independentDialog = asyncResult.value;
      if (window.HubResultsBridge) HubResultsBridge.registerDialog(independentDialog);
      if (window.StatisticoDialogHost) {
        StatisticoDialogHost.onUserClosed(independentDialog, function () {
          independentDialog = null;
          independentFilteredRows = null;
        });
      }
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
              sendIndependentBundle();
            } else if (message.cmd === "independentRecomputeFromFilter" && message.data) {
              // New "filter as macro" path: dialog has the user's filter
              // criteria applied (UniRowFilter produces filteredRows). The
              // host re-runs the SAME compute fn used at first open and
              // returns a fresh bundle. The dialog renders it via the same
              // populateBundle() path. No per-module recompute logic, no
              // sessionStorage filter state, no banner state-machine.
              recomputeIndependentFromFilteredRows(message.data.filteredRows);
            } else {
              sendIndependentBundle();
            }
          }
          else if (message.action === "close") {
            if (window.StatisticoDialogHost) {
              StatisticoDialogHost.closeFromMessage(independentDialog, function () {
                independentDialog = null;
                independentFilteredRows = null;
              });
            } else {
              independentDialog.close();
              independentDialog = null;
              independentFilteredRows = null;
            }
          }
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
  const fullRows = independentRangeData.slice(1);
  // Honour the cached filter (if any). Settings changes always flow through
  // here — without the cache check they would revert to fullRows and silently
  // unfilter the analysis.
  const isFiltered = !!(independentFilteredRows && independentFilteredRows.length && independentFilteredRows.length < fullRows.length);
  const rows = isFiltered ? independentFilteredRows : fullRows;
  const modelSpec = JSON.parse(sessionStorage.getItem("independentModelSpec") || "{}");
  const bundle = buildIndependentBundle(headers, rows, modelSpec);
  console.log("sendIndependentBundle: rows=" + rows.length + "/" + fullRows.length + (isFiltered ? " (filtered)" : ""));
  independentDialog.messageChild(JSON.stringify({
    type: "INDEPENDENT_BUNDLE",
    payload: bundle,
    rawData: independentRangeData,                                   // full source — filter UI / View Data
    analysisRows: isFiltered ? [headers].concat(rows) : null         // filter-aware — extractVector helpers
  }));
}

// Filter-as-macro recompute: dialog handed us the filtered row set produced
// by UniRowFilter. Cache it (so subsequent settings changes preserve the
// filter) and dispatch through the standard bundle path.
function recomputeIndependentFromFilteredRows(filteredRows) {
  if (!independentDialog || !independentRangeData) return;
  const fullRows = independentRangeData.slice(1);
  const looksFiltered = Array.isArray(filteredRows) && filteredRows.length > 0 && filteredRows.length < fullRows.length;
  independentFilteredRows = looksFiltered ? filteredRows : null;
  sendIndependentBundle();
}

function resetIndependentModel() {
  sessionStorage.removeItem("independentModelSpec");
  independentFilteredRows = null;
  hideIndependentConfigEmbed();
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
window.openIndependentBuilderDialog = openIndependentBuilderDialog;
window.hideIndependentConfigEmbed = hideIndependentConfigEmbed;
window.openIndependentResultsDialog = openIndependentResultsDialog;
window.resetIndependentModel = resetIndependentModel;

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    var gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})('independent', function (gr) {
  onRangeDataLoaded(gr.values, gr.address);
  openIndependentResultsDialog();
  return true;
});
