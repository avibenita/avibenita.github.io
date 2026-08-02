/* Publication Tables — Builder engine
 * Self-contained: demo data generator, descriptive/inferential statistics,
 * hierarchical table model + renderer, and export/copy helpers.
 */
(function () {
  "use strict";

  /* ═══════════════════════════ 1. DEMO DATA ═══════════════════════════ */

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNormalSampler(rng) {
    return function (m, sd) {
      var u1 = 0, u2;
      while (u1 === 0) u1 = rng();
      u2 = rng();
      var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return m + z * sd;
    };
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pick(rng, cutoffs, values) {
    var r = rng();
    for (var i = 0; i < cutoffs.length; i++) { if (r < cutoffs[i]) return values[i]; }
    return values[values.length - 1];
  }

  function buildDemoData() {
    var rng = mulberry32(20260802);
    var randn = makeNormalSampler(rng);
    var N = 240;
    var treatments = ["Placebo", "Treatment A", "Treatment B"];
    var rows = [];
    for (var i = 0; i < N; i++) {
      var treatment = treatments[i % 3];
      var region = rng() < 0.52 ? "North" : "South";
      var sex = pick(rng, [0.47, 0.98, 1], ["Male", "Female", "Other"]);
      var age = clamp(randn(63, 9), 34, 89);
      var bmi = clamp(randn(28.4, 5.1), 17, 46);
      var sbpShift = treatment === "Placebo" ? 0 : (treatment === "Treatment A" ? -6 : -9.5);
      var sbp = clamp(randn(142 + sbpShift, 14), 96, 196);
      var ldl = clamp(randn(118, 34), 40, 260);
      var egfr = clamp(randn(74, 21), 12, 130);
      var smoking = pick(rng, [0.46, 0.79, 1], ["Never", "Former", "Current"]);
      var miBase = treatment === "Placebo" ? 0.24 : 0.15;
      var priorMI = rng() < miBase ? "Yes" : "No";
      var durMean = treatment === "Placebo" ? 14.5 : 12.1;
      var diabetesDuration = rng() < 0.09 ? null : clamp(randn(durMean, 7.4), 0, 38);
      var sampleWeight = clamp(randn(1, 0.28), 0.35, 2.1);
      rows.push({
        age: age, sex: sex, bmi: bmi, diabetesDuration: diabetesDuration, sbp: sbp, ldl: ldl,
        smoking: smoking, priorMI: priorMI, egfr: egfr,
        treatment: treatment, region: region, sampleWeight: sampleWeight
      });
    }
    return rows;
  }

  var DEMO_DATA = buildDemoData();

  var DEMO_VAR_DEFS = [
    { key: "age", label: "Age, years", type: "continuous" },
    { key: "sex", label: "Sex", type: "categorical", categories: ["Male", "Female", "Other"] },
    { key: "bmi", label: "BMI, kg/m\u00B2", type: "continuous" },
    { key: "diabetesDuration", label: "Diabetes duration, years", type: "continuous" },
    { key: "sbp", label: "Systolic BP, mmHg", type: "continuous" },
    { key: "ldl", label: "LDL cholesterol, mg/dL", type: "continuous" },
    { key: "smoking", label: "Smoking status", type: "ordinal", categories: ["Never", "Former", "Current"] },
    { key: "priorMI", label: "Prior myocardial infarction", type: "binary", categories: ["No", "Yes"] },
    { key: "egfr", label: "eGFR, mL/min/1.73m\u00B2", type: "continuous" }
  ];
  var DEMO_GROUP_VAR_DEFS = [{ key: "treatment", label: "Treatment group", categories: ["Placebo", "Treatment A", "Treatment B"] }];
  var DEMO_STRAT_VAR_DEFS = [{ key: "region", label: "Region", categories: ["North", "South"] }];
  var DEMO_WEIGHT_VAR_DEFS = [{ key: "sampleWeight", label: "Sample weight" }];
  var DEMO_DEFAULT_SELECTED = ["age", "sex", "bmi", "diabetesDuration", "sbp", "smoking", "priorMI"];

  /* ── Active dataset (mutable) ─────────────────────────────────────────────
     Starts pointed at the built-in demo dataset. setDataset() swaps these
     bindings wholesale when the user switches to real Excel data (or back). */
  var ACTIVE_DATA = DEMO_DATA;
  var VAR_DEFS = DEMO_VAR_DEFS;
  var GROUP_VAR_DEFS = DEMO_GROUP_VAR_DEFS;
  var STRAT_VAR_DEFS = DEMO_STRAT_VAR_DEFS;
  var WEIGHT_VAR_DEFS = DEMO_WEIGHT_VAR_DEFS;
  var VAR_DEFS_BY_KEY = {};

  /* ═══════════════════════════ 2. MATH HELPERS ═══════════════════════════ */

  function isMissing(v) { return v === null || v === undefined || v === ""; }
  function mean(arr) { return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; }
  function sampleSd(arr, m) {
    if (arr.length < 2) return NaN;
    var mm = m === undefined ? mean(arr) : m;
    var ss = arr.reduce(function (a, b) { return a + (b - mm) * (b - mm); }, 0);
    return Math.sqrt(ss / (arr.length - 1));
  }
  function percentileSorted(sorted, p) {
    var n = sorted.length;
    if (!n) return NaN;
    var idx = (p / 100) * (n - 1);
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  function transpose(A) { return A[0].map(function (_, j) { return A.map(function (row) { return row[j]; }); }); }
  function matMul(A, B) {
    var r = A.length, c = B[0].length, k = B.length, out = [];
    for (var i = 0; i < r; i++) {
      out.push([]);
      for (var j = 0; j < c; j++) {
        var s = 0;
        for (var x = 0; x < k; x++) s += A[i][x] * B[x][j];
        out[i].push(s);
      }
    }
    return out;
  }
  function invertMatrix(M) {
    var n = M.length;
    var A = M.map(function (row, i) {
      var out = row.slice();
      for (var j = 0; j < n; j++) out.push(i === j ? 1 : 0);
      return out;
    });
    for (var col = 0; col < n; col++) {
      var pivotRow = col;
      for (var r = col + 1; r < n; r++) { if (Math.abs(A[r][col]) > Math.abs(A[pivotRow][col])) pivotRow = r; }
      if (Math.abs(A[pivotRow][col]) < 1e-12) return null;
      var tmp = A[col]; A[col] = A[pivotRow]; A[pivotRow] = tmp;
      var pivotVal = A[col][col];
      for (var j2 = 0; j2 < 2 * n; j2++) A[col][j2] /= pivotVal;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === col) continue;
        var factor = A[r2][col];
        if (factor === 0) continue;
        for (var j3 = 0; j3 < 2 * n; j3++) A[r2][j3] -= factor * A[col][j3];
      }
    }
    return A.map(function (row) { return row.slice(n); });
  }

  function logGamma(x) {
    var g = 7;
    var c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (x < 0.5) { return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x); }
    x -= 1;
    var a = c[0], t = x + g + 0.5;
    for (var i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(x, a, b) {
    var MAXIT = 200, EPS = 3e-9, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d; var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m;
      var aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function betai(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return (bt * betacf(x, a, b)) / a;
    return 1 - (bt * betacf(1 - x, b, a)) / b;
  }
  function tTwoSidedP(t, df) { return betai(df / (df + t * t), df / 2, 0.5); }

  function gammserSeries(a, x) {
    var gln = logGamma(a);
    if (x <= 0) return { gamser: 0, gln: gln };
    var ap = a, sum = 1 / a, del = sum;
    for (var n = 0; n < 300; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-9) break;
    }
    return { gamser: sum * Math.exp(-x + a * Math.log(x) - gln), gln: gln };
  }
  function gammcfCF(a, x) {
    var gln = logGamma(a), FPMIN = 1e-300, EPS = 3e-9;
    var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (var i = 1; i <= 300; i++) {
      var an = -i * (i - a);
      b += 2; d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; var del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return { gammcf: Math.exp(-x + a * Math.log(x) - gln) * h, gln: gln };
  }
  function gammq(a, x) {
    if (x < 0 || a <= 0) return NaN;
    if (x < a + 1) return 1 - gammserSeries(a, x).gamser;
    return gammcfCF(a, x).gammcf;
  }

  /* ═══════════════════════════ 3. INFERENTIAL TESTS ═══════════════════════════ */

  function welchTTest(a, b) {
    if (a.length < 2 || b.length < 2) return null;
    var ma = mean(a), mb = mean(b);
    var va = Math.pow(sampleSd(a, ma), 2), vb = Math.pow(sampleSd(b, mb), 2);
    var na = a.length, nb = b.length;
    var se = Math.sqrt(va / na + vb / nb);
    var t = se > 0 ? (ma - mb) / se : NaN;
    var df = Math.pow(va / na + vb / nb, 2) / (Math.pow(va / na, 2) / (na - 1) + Math.pow(vb / nb, 2) / (nb - 1));
    var p = isFinite(t) && df > 0 ? tTwoSidedP(t, df) : NaN;
    return { stat: t, df: df, p: p, name: "Welch's t-test" };
  }
  function anovaFTest(groups) {
    var k = groups.length;
    var all = [].concat.apply([], groups);
    var N = all.length;
    var grandMean = mean(all);
    var ssB = 0, ssW = 0;
    groups.forEach(function (g) {
      var m = mean(g);
      ssB += g.length * (m - grandMean) * (m - grandMean);
      g.forEach(function (v) { ssW += (v - m) * (v - m); });
    });
    var df1 = k - 1, df2 = N - k;
    if (df2 <= 0 || df1 <= 0) return null;
    var msB = ssB / df1, msW = ssW / df2;
    var F = msW > 0 ? msB / msW : NaN;
    var p = isFinite(F) ? betai(df2 / (df2 + df1 * F), df2 / 2, df1 / 2) : NaN;
    return { stat: F, df: df1 + ", " + df2, p: p, name: "One-way ANOVA (F-test)" };
  }
  function chiSquareTest(table) {
    var rows = table.length, cols = table[0] ? table[0].length : 0;
    if (!rows || !cols) return null;
    var rowTotals = table.map(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
    var colTotals = [];
    for (var j = 0; j < cols; j++) colTotals.push(table.reduce(function (s, r) { return s + r[j]; }, 0));
    var grand = rowTotals.reduce(function (a, b) { return a + b; }, 0);
    if (!grand) return null;
    var chi2 = 0;
    for (var i = 0; i < rows; i++) {
      for (var jj = 0; jj < cols; jj++) {
        var exp = (rowTotals[i] * colTotals[jj]) / grand;
        if (exp > 0) chi2 += Math.pow(table[i][jj] - exp, 2) / exp;
      }
    }
    var df = (rows - 1) * (cols - 1);
    if (df <= 0) return null;
    var p = gammq(df / 2, chi2 / 2);
    return { stat: chi2, df: df, p: p, name: "Chi-square test" };
  }
  function continuousSMD(a, b) {
    if (a.length < 2 || b.length < 2) return NaN;
    var ma = mean(a), mb = mean(b);
    var sda = sampleSd(a, ma), sdb = sampleSd(b, mb);
    var pooled = Math.sqrt((sda * sda + sdb * sdb) / 2);
    return pooled > 0 ? (ma - mb) / pooled : NaN;
  }
  /* Categorical SMD via the multinomial covariance formula (Yang & Dalton, 2012). */
  function categoricalSMD(countsA, countsB) {
    var totalA = countsA.reduce(function (a, b) { return a + b; }, 0);
    var totalB = countsB.reduce(function (a, b) { return a + b; }, 0);
    if (!totalA || !totalB) return NaN;
    var k = countsA.length, m = k - 1;
    if (m <= 0) return NaN;
    var pA = countsA.map(function (c) { return c / totalA; });
    var pB = countsB.map(function (c) { return c / totalB; });
    var diff = []; for (var i = 0; i < m; i++) diff.push([pA[i] - pB[i]]);
    function cov(p) {
      var S = [];
      for (var r = 0; r < m; r++) {
        S.push([]);
        for (var c2 = 0; c2 < m; c2++) S[r].push(r === c2 ? p[r] * (1 - p[r]) : -p[r] * p[c2]);
      }
      return S;
    }
    var SA = cov(pA), SB = cov(pB);
    var Savg = SA.map(function (row, r) { return row.map(function (v, c3) { return (v + SB[r][c3]) / 2; }); });
    var inv = invertMatrix(Savg);
    if (!inv) return NaN;
    var res = matMul(matMul(transpose(diff), inv), diff);
    return Math.sqrt(Math.max(0, res[0][0]));
  }

  /* ═══════════════════════════ 4. FORMATTING HELPERS ═══════════════════════════ */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtNum(x, decimals) {
    if (x === null || x === undefined || !isFinite(x)) return "\u2014";
    return x.toFixed(decimals);
  }
  function fmtP(p, sp) {
    if (p === null || p === undefined || !isFinite(p)) return "\u2014";
    var decimals = 3;
    if (p < Math.pow(10, -decimals)) {
      var frac = "0".repeat(decimals - 1) + "1";
      return (sp.pLeadingZero ? "<0." : "<.") + frac;
    }
    var s = p.toFixed(decimals);
    return sp.pLeadingZero ? s : s.replace(/^0\./, ".");
  }

  /* ═══════════════════════════ 4b. EXCEL DATA IMPORT ═══════════════════════════
     Converts a raw headers/rows payload (as received from the Excel host)
     into the same { key, label, type, categories } shape used by the built-in
     demo variables, so the rest of the engine never needs to know whether it
     is looking at demo or real data. */

  function sanitizeHeaderKey(header, idx, used) {
    var base = String(header == null ? "" : header).trim() || ("Column " + (idx + 1));
    var key = base, n = 2;
    while (used[key]) { key = base + " (" + n + ")"; n++; }
    used[key] = true;
    return { key: key, label: base };
  }

  function inferColumnType(values) {
    var nonMissing = values.filter(function (v) { return !isMissing(v); });
    var n = nonMissing.length;
    var numericCount = 0;
    var distinctSet = {};
    nonMissing.forEach(function (v) {
      var isNum = typeof v === "number" ? isFinite(v) : (String(v).trim() !== "" && isFinite(Number(v)));
      if (isNum) numericCount++;
      distinctSet[String(v).trim()] = true;
    });
    var distinctVals = Object.keys(distinctSet);
    var numericRatio = n ? numericCount / n : 0;
    var isContinuous = n > 0 && numericRatio >= 0.85 && distinctVals.length > 8;
    if (isContinuous) return { type: "continuous", missing: values.length - n };
    var allNum = distinctVals.length > 0 && distinctVals.every(function (s) { return isFinite(Number(s)); });
    distinctVals.sort(function (a, b) { return allNum ? Number(a) - Number(b) : a.localeCompare(b); });
    return {
      type: distinctVals.length === 2 ? "binary" : "categorical",
      categories: distinctVals,
      missing: values.length - n
    };
  }

  /* Builds { rows, varDefs } from raw headers[] + rows[][] exactly as received
     over messageParent/messageChild from the Excel host. */
  function buildExcelDataset(headers, rowArrays) {
    var used = {};
    var cols = headers.map(function (h, i) { return sanitizeHeaderKey(h, i, used); });
    var rows = rowArrays.map(function (arr) {
      var obj = {};
      cols.forEach(function (c, i) {
        var raw = arr ? arr[i] : undefined;
        obj[c.key] = (raw === "" || raw === undefined) ? null : raw;
      });
      return obj;
    });
    var varDefs = cols.map(function (c) {
      var vals = rows.map(function (r) { return r[c.key]; });
      var inferred = inferColumnType(vals);
      var def = { key: c.key, label: c.label, type: inferred.type };
      if (inferred.categories) def.categories = inferred.categories;
      return def;
    });
    return { rows: rows, varDefs: varDefs };
  }

  /* Group/stratification candidates: any categorical-ish column with a
     manageable number of levels. Weight candidates: any continuous column. */
  function computeAuxVarDefs(varDefs) {
    var groupish = varDefs.filter(function (v) {
      return v.type !== "continuous" && v.categories && v.categories.length >= 2 && v.categories.length <= 12;
    }).map(function (v) { return { key: v.key, label: v.label, categories: v.categories }; });
    var weightish = varDefs.filter(function (v) { return v.type === "continuous"; })
      .map(function (v) { return { key: v.key, label: v.label }; });
    return { groupDefs: groupish, stratDefs: groupish.slice(), weightDefs: weightish };
  }

  /* Per-dataset memory of variable config, so toggling Demo <-> Excel (or
     re-fetching the same Excel range) doesn't discard the user's edits. */
  var savedDatasetConfigs = { demo: null, excel: null };

  function setDataset(kind, rows, varDefs, groupDefs, stratDefs, weightDefs) {
    if (state.dataSource && state.varCfg) {
      savedDatasetConfigs[state.dataSource] = {
        order: state.varOrder, cfg: state.varCfg,
        groupVar: state.groupVar, stratVar: state.stratVar, weightVar: state.weightVar
      };
    }

    ACTIVE_DATA = rows;
    VAR_DEFS = varDefs;
    GROUP_VAR_DEFS = groupDefs;
    STRAT_VAR_DEFS = stratDefs;
    WEIGHT_VAR_DEFS = weightDefs;
    VAR_DEFS_BY_KEY = {};
    VAR_DEFS.forEach(function (v) { VAR_DEFS_BY_KEY[v.key] = v; });

    var saved = savedDatasetConfigs[kind];
    var newOrder = [], newCfg = {};
    (saved ? saved.order : []).forEach(function (k) {
      if (VAR_DEFS_BY_KEY[k]) { newOrder.push(k); newCfg[k] = saved.cfg[k]; }
    });
    VAR_DEFS.forEach(function (v, idx) {
      if (!newCfg[v.key]) {
        var includeDefault = kind === "demo" ? (DEMO_DEFAULT_SELECTED.indexOf(v.key) >= 0) : (idx < 15);
        newCfg[v.key] = makeDefaultVarCfg(v, includeDefault);
        newOrder.push(v.key);
      }
    });
    state.varOrder = newOrder;
    state.varCfg = newCfg;
    state.groupVar = (saved && saved.groupVar && GROUP_VAR_DEFS.some(function (g) { return g.key === saved.groupVar; })) ? saved.groupVar : "";
    state.stratVar = (saved && saved.stratVar && STRAT_VAR_DEFS.some(function (s) { return s.key === saved.stratVar; })) ? saved.stratVar : "";
    state.weightVar = (saved && saved.weightVar && WEIGHT_VAR_DEFS.some(function (w) { return w.key === saved.weightVar; })) ? saved.weightVar : "";
    state.dataSource = kind;

    // Preserve the user's show-overall/p-value/SMD/title choices across a
    // dataset switch — only make sure a group var is picked if the current
    // table type needs one and none survived the switch.
    var td = TABLE_TYPE_DEFAULTS[state.tableType];
    if (td && td.wantsGroup && !state.groupVar) state.groupVar = pickFallbackGroupVar(td.preferredGroupKey);
  }

  /* ═══════════════════════════ 5. APP STATE ═══════════════════════════ */

  var CONTINUOUS_FORMATS = [
    { value: "mean-sd", label: "Mean \u00B1 SD" },
    { value: "mean-sd-paren", label: "Mean (SD)" },
    { value: "median-iqr-paren", label: "Median (Q1, Q3)" },
    { value: "median-iqr-bracket", label: "Median [IQR]" },
    { value: "median-minmax", label: "Median (min, max)" },
    { value: "range", label: "Min\u2013max" }
  ];
  var CATEGORICAL_FORMATS = [
    { value: "n-percent", label: "n (%)" },
    { value: "n-over-N-percent", label: "n/N (%)" },
    { value: "count", label: "Count only" },
    { value: "row-percent", label: "Row percentage" },
    { value: "col-percent", label: "Column percentage" },
    { value: "valid-percent", label: "Valid percentage" }
  ];
  var FORMAT_SUFFIX = {
    "n-percent": "n (%)", "n-over-N-percent": "n/N (%)", count: "n",
    "row-percent": "row %", "col-percent": "column %", "valid-percent": "valid %"
  };

  function deriveCategories(key) {
    var set = {};
    ACTIVE_DATA.forEach(function (r) { var v = r[key]; if (!isMissing(v)) set[String(v)] = true; });
    var arr = Object.keys(set);
    var allNum = arr.every(function (s) { return isFinite(Number(s)); });
    arr.sort(function (a, b) { return allNum ? Number(a) - Number(b) : a.localeCompare(b); });
    return arr;
  }
  function defaultCategoriesFor(v) { return v.categories ? v.categories.slice() : deriveCategories(v.key); }

  function makeDefaultVarCfg(v, includeDefault) {
    var isCont = v.type === "continuous";
    return {
      label: v.label,
      typeOverride: "auto",
      format: isCont ? "mean-sd" : "n-percent",
      decimals: 1,
      missingRule: "inherit",
      orderText: isCont ? "" : defaultCategoriesFor(v).join(", "),
      include: !!includeDefault
    };
  }

  var TABLE_TYPE_DEFAULTS = {
    descriptive: { wantsGroup: false, showOverall: true, showPValue: false, showSMD: false, title: "Descriptive Summary of Study Variables" },
    frequency: { wantsGroup: false, showOverall: true, showPValue: false, showSMD: false, title: "Frequency Distribution of Study Variables" },
    table1: { wantsGroup: true, preferredGroupKey: "treatment", showOverall: true, showPValue: true, showSMD: true, title: "Baseline Characteristics of Study Participants" },
    groupcompare: { wantsGroup: true, preferredGroupKey: "treatment", showOverall: false, showPValue: true, showSMD: true, title: "Comparison of Participant Characteristics by Treatment Group" }
  };

  var state = {
    tab: "build",
    tableType: "table1",
    groupVar: "treatment",
    stratVar: "",
    weightVar: "",
    showOverall: true,
    showPValue: true,
    showSMD: true,
    completeCase: false,
    showMissingCategory: true,
    missingLabel: "Missing",
    varOrder: [],
    varCfg: {},
    dataChoice: "demo",
    dataSource: null,
    excelDataset: null,
    report: {
      tableNumber: 1,
      title: "Baseline Characteristics of Study Participants",
      subtitle: "",
      notes: "",
      abbreviations: "BMI, body mass index; BP, blood pressure; eGFR, estimated glomerular filtration rate; LDL, low-density lipoprotein; SD, standard deviation; SMD, standardized mean difference.",
      stylePreset: "clinical",
      decimals: 1,
      percentDecimals: 1,
      custom: { italicTitle: false, captionBold: true, font: "serif", density: "normal", headerStyle: "rule", pLeadingZero: false, indentEm: 1.4 }
    }
  };
  var lastAppliedDefaultTitle = state.report.title;

  /* Populate varOrder/varCfg/VAR_DEFS_BY_KEY for the initial demo dataset. */
  setDataset("demo", DEMO_DATA, DEMO_VAR_DEFS, DEMO_GROUP_VAR_DEFS, DEMO_STRAT_VAR_DEFS, DEMO_WEIGHT_VAR_DEFS);

  function pickFallbackGroupVar(preferredKey) {
    if (state.groupVar && GROUP_VAR_DEFS.some(function (g) { return g.key === state.groupVar; })) return state.groupVar;
    if (preferredKey && GROUP_VAR_DEFS.some(function (g) { return g.key === preferredKey; })) return preferredKey;
    return GROUP_VAR_DEFS.length ? GROUP_VAR_DEFS[0].key : "";
  }

  function applyTableTypeDefaults(type) {
    var d = TABLE_TYPE_DEFAULTS[type];
    state.groupVar = d.wantsGroup ? pickFallbackGroupVar(d.preferredGroupKey) : "";
    state.showOverall = d.showOverall;
    state.showPValue = d.showPValue;
    state.showSMD = d.showSMD;
    if (!state.report.title || state.report.title === lastAppliedDefaultTitle) {
      state.report.title = d.title;
      lastAppliedDefaultTitle = d.title;
    }
  }

  var STYLE_PRESETS = {
    clinical: { font: "'Times New Roman', Times, serif", italicTitle: false, captionBold: true, density: "normal", headerStyle: "rule", pLeadingZero: false, indentEm: 1.4 },
    apa7: { font: "'Times New Roman', Times, serif", italicTitle: true, captionBold: true, density: "normal", headerStyle: "rule", pLeadingZero: false, indentEm: 1.2 },
    journal: { font: "Georgia, 'Times New Roman', serif", italicTitle: false, captionBold: false, density: "normal", headerStyle: "shade", pLeadingZero: true, indentEm: 1.2 },
    compact: { font: "Arial, Helvetica, sans-serif", italicTitle: false, captionBold: true, density: "compact", headerStyle: "rule", pLeadingZero: true, indentEm: 1.0 }
  };
  function effectiveStyle() {
    if (state.report.stylePreset === "custom") {
      var c = state.report.custom;
      return {
        font: c.font === "sans" ? "Arial, Helvetica, sans-serif" : "'Times New Roman', Times, serif",
        italicTitle: c.italicTitle, captionBold: c.captionBold, density: c.density,
        headerStyle: c.headerStyle, pLeadingZero: c.pLeadingZero, indentEm: c.indentEm
      };
    }
    return STYLE_PRESETS[state.report.stylePreset] || STYLE_PRESETS.clinical;
  }

  /* ═══════════════════════════ 6. TABLE MODEL BUILDER ═══════════════════════════ */

  /* state.varOrder controls the row order of the grid AND the published table;
     drag-and-drop in the Build tab reorders this array directly. */
  function orderedVarDefs() { return state.varOrder.map(function (k) { return VAR_DEFS_BY_KEY[k]; }); }

  function effectiveType(v, cfg) { return (cfg.typeOverride && cfg.typeOverride !== "auto") ? cfg.typeOverride : v.type; }
  function isVariableEligible(v, cfg) {
    if (!cfg.include) return false;
    if (state.tableType === "frequency" && effectiveType(v, cfg) === "continuous") return false;
    return true;
  }
  function eligibleVarDefs() { return orderedVarDefs().filter(function (v) { return isVariableEligible(v, state.varCfg[v.key]); }); }

  function categoriesFor(v, cfg) {
    var effType = effectiveType(v, cfg);
    if (effType === "continuous") return null;
    if (cfg.orderText && cfg.orderText.trim()) {
      return cfg.orderText.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return defaultCategoriesFor(v);
  }

  function getWorkingRows() {
    var rows = ACTIVE_DATA;
    if (state.completeCase) {
      var required = eligibleVarDefs().map(function (v) { return v.key; });
      if (state.groupVar) required.push(state.groupVar);
      if (state.stratVar) required.push(state.stratVar);
      rows = rows.filter(function (r) { return required.every(function (k) { return !isMissing(r[k]); }); });
    }
    return rows;
  }

  function getColumns() {
    var cols = [];
    if (state.showOverall || !state.groupVar) cols.push({ key: "__overall__", label: "Overall" });
    if (state.groupVar) {
      var gdef = GROUP_VAR_DEFS.filter(function (g) { return g.key === state.groupVar; })[0];
      gdef.categories.forEach(function (lv) { cols.push({ key: lv, label: lv, isGroup: true }); });
    }
    return cols;
  }
  function rowsForColumn(baseRows, col) {
    if (col.key === "__overall__") return baseRows;
    // String-coerce: Excel-sourced group columns may hold numbers (e.g. 0/1)
    // while category keys are always strings.
    return baseRows.filter(function (r) { return !isMissing(r[state.groupVar]) && String(r[state.groupVar]) === col.key; });
  }

  function continuousStats(values, weights) {
    var n = values.length;
    if (!n) return { n: 0 };
    if (!weights) {
      var m = mean(values), sd = sampleSd(values, m);
      var sorted = values.slice().sort(function (a, b) { return a - b; });
      return { n: n, mean: m, sd: sd, median: percentileSorted(sorted, 50), q1: percentileSorted(sorted, 25), q3: percentileSorted(sorted, 75), min: sorted[0], max: sorted[n - 1] };
    }
    var totalW = weights.reduce(function (a, b) { return a + b; }, 0);
    if (totalW <= 0) return { n: 0 };
    var wm = weights.reduce(function (s, w, i) { return s + w * values[i]; }, 0) / totalW;
    var varNum = weights.reduce(function (s, w, i) { return s + w * Math.pow(values[i] - wm, 2); }, 0);
    var wsd = Math.sqrt(varNum / totalW);
    var paired = values.map(function (v, i) { return { v: v, w: weights[i] }; }).sort(function (a, b) { return a.v - b.v; });
    function wPct(p) {
      var target = (p / 100) * totalW, cum = 0;
      for (var i = 0; i < paired.length; i++) { cum += paired[i].w; if (cum >= target) return paired[i].v; }
      return paired[paired.length - 1].v;
    }
    return { n: n, mean: wm, sd: wsd, median: wPct(50), q1: wPct(25), q3: wPct(75), min: paired[0].v, max: paired[paired.length - 1].v };
  }
  function formatContinuous(stats, formatCode, decimals) {
    if (!stats || !stats.n) return "\u2014";
    var f = function (x) { return fmtNum(x, decimals); };
    switch (formatCode) {
      case "mean-sd": return f(stats.mean) + " \u00B1 " + f(stats.sd);
      case "mean-sd-paren": return f(stats.mean) + " (" + f(stats.sd) + ")";
      case "median-iqr-paren": return f(stats.median) + " (" + f(stats.q1) + ", " + f(stats.q3) + ")";
      case "median-iqr-bracket": return f(stats.median) + " [" + f(stats.q3 - stats.q1) + "]";
      case "median-minmax": return f(stats.median) + " (" + f(stats.min) + ", " + f(stats.max) + ")";
      case "range": return f(stats.min) + "\u2013" + f(stats.max);
      default: return f(stats.mean) + " \u00B1 " + f(stats.sd);
    }
  }

  function buildContinuousRow(v, cfg, baseRows, columns) {
    var decimals = cfg.decimals;
    var cells = columns.map(function (col) {
      var subRows = rowsForColumn(baseRows, col);
      var vals = [], weights = state.weightVar ? [] : null;
      subRows.forEach(function (r) {
        var x = r[v.key];
        if (isMissing(x)) return;
        vals.push(Number(x));
        if (weights) weights.push(Number(r[state.weightVar]) || 0);
      });
      var stats = continuousStats(vals, weights);
      return formatContinuous(stats, cfg.format, decimals);
    });
    var test = null, smd = null;
    if (state.groupVar) {
      var groupCols = columns.filter(function (c) { return c.isGroup; });
      var groupsVals = groupCols.map(function (col) {
        return rowsForColumn(baseRows, col).map(function (r) { return r[v.key]; }).filter(function (x) { return !isMissing(x); }).map(Number);
      });
      var validGroups = groupsVals.filter(function (g) { return g.length >= 2; });
      if (validGroups.length >= 2) {
        if (validGroups.length === 2) {
          test = welchTTest(validGroups[0], validGroups[1]);
          smd = continuousSMD(validGroups[0], validGroups[1]);
        } else {
          test = anovaFTest(validGroups);
          var maxSmd = 0;
          for (var i = 0; i < validGroups.length; i++) {
            for (var j = i + 1; j < validGroups.length; j++) {
              var d = Math.abs(continuousSMD(validGroups[i], validGroups[j]));
              if (isFinite(d) && d > maxSmd) maxSmd = d;
            }
          }
          smd = maxSmd;
        }
      }
    }
    return { type: "continuous", varKey: v.key, label: cfg.label, cells: cells, test: test, smd: smd };
  }

  function buildCategoricalRow(v, cfg, baseRows, columns) {
    var cats = categoriesFor(v, cfg);
    var pdecimals = cfg.decimals;
    var counts = {}; cats.forEach(function (c) { counts[c] = {}; });
    var colTotalN = {}, colValidN = {}, colMissing = {};
    columns.forEach(function (col) {
      var subRows = rowsForColumn(baseRows, col);
      var totalW = 0, validW = 0, missW = 0;
      var local = {}; cats.forEach(function (c) { local[c] = 0; });
      subRows.forEach(function (r) {
        var w = state.weightVar ? (Number(r[state.weightVar]) || 0) : 1;
        totalW += w;
        var val = r[v.key];
        if (isMissing(val)) { missW += w; return; }
        var sval = String(val);
        if (!(sval in local)) return;
        local[sval] += w; validW += w;
      });
      cats.forEach(function (c) { counts[c][col.key] = local[c]; });
      colTotalN[col.key] = totalW; colValidN[col.key] = validW; colMissing[col.key] = missW;
    });

    var effectiveMissingRule = cfg.missingRule === "inherit"
      ? (state.showMissingCategory ? "category" : "exclude")
      : cfg.missingRule;
    var anyMissing = columns.some(function (col) { return colMissing[col.key] > 0; });
    var showMissingRow = effectiveMissingRule === "category" && !state.completeCase && anyMissing;

    var groupCols = columns.filter(function (c) { return c.isGroup; });
    function cellFor(cat, col) {
      var n = counts[cat][col.key];
      var colN = colTotalN[col.key], validN = colValidN[col.key];
      var rowTotal = groupCols.length ? groupCols.reduce(function (s, c) { return s + counts[cat][c.key]; }, 0) : colN;
      switch (cfg.format) {
        case "n-percent": return n + " (" + fmtNum(validN > 0 ? (n / validN) * 100 : 0, pdecimals) + "%)";
        case "n-over-N-percent": return n + "/" + colN + " (" + fmtNum(colN > 0 ? (n / colN) * 100 : 0, pdecimals) + "%)";
        case "count": return String(n);
        case "row-percent": return fmtNum(rowTotal > 0 ? (n / rowTotal) * 100 : 0, pdecimals) + "%";
        case "col-percent": return fmtNum(colN > 0 ? (n / colN) * 100 : 0, pdecimals) + "%";
        case "valid-percent": return fmtNum(validN > 0 ? (n / validN) * 100 : 0, pdecimals) + "%";
        default: return n + " (" + fmtNum(validN > 0 ? (n / validN) * 100 : 0, pdecimals) + "%)";
      }
    }

    var categoryRows = cats.map(function (cat) { return { catLabel: cat, cells: columns.map(function (col) { return cellFor(cat, col); }) }; });
    if (showMissingRow) {
      categoryRows.push({ catLabel: state.missingLabel || "Missing", cells: columns.map(function (col) { return String(colMissing[col.key]); }) });
    }

    var test = null, smd = null;
    if (state.groupVar && groupCols.length >= 2) {
      var table = cats.map(function (cat) { return groupCols.map(function (col) { return counts[cat][col.key]; }); });
      test = chiSquareTest(table);
      if (groupCols.length === 2) {
        var cA = cats.map(function (cat) { return counts[cat][groupCols[0].key]; });
        var cB = cats.map(function (cat) { return counts[cat][groupCols[1].key]; });
        smd = categoricalSMD(cA, cB);
      } else {
        var maxS = 0;
        for (var i = 0; i < groupCols.length; i++) {
          for (var j = i + 1; j < groupCols.length; j++) {
            var cA2 = cats.map(function (cat) { return counts[cat][groupCols[i].key]; });
            var cB2 = cats.map(function (cat) { return counts[cat][groupCols[j].key]; });
            var d2 = categoricalSMD(cA2, cB2);
            if (isFinite(d2) && Math.abs(d2) > maxS) maxS = Math.abs(d2);
          }
        }
        smd = maxS;
      }
    }

    return { type: "categorical", varKey: v.key, label: cfg.label + ", " + (FORMAT_SUFFIX[cfg.format] || "n (%)"), categoryRows: categoryRows, test: test, smd: smd };
  }

  function buildTableBlock(baseRows) {
    var columns = getColumns();
    var vars = eligibleVarDefs();
    var columnN = {};
    columns.forEach(function (col) { columnN[col.key] = rowsForColumn(baseRows, col).length; });
    var rows = vars.map(function (v) {
      var cfg = state.varCfg[v.key];
      return effectiveType(v, cfg) === "continuous" ? buildContinuousRow(v, cfg, baseRows, columns) : buildCategoricalRow(v, cfg, baseRows, columns);
    });
    return { columns: columns, rows: rows, n: baseRows.length, columnN: columnN };
  }

  function buildModel() {
    var baseRows = getWorkingRows();
    if (!state.stratVar) return { strata: [{ label: null, block: buildTableBlock(baseRows) }] };
    var sdef = STRAT_VAR_DEFS.filter(function (s) { return s.key === state.stratVar; })[0];
    var strata = sdef.categories.map(function (level) {
      var subRows = baseRows.filter(function (r) { return !isMissing(r[state.stratVar]) && String(r[state.stratVar]) === level; });
      return { label: sdef.label + ": " + level, block: buildTableBlock(subRows) };
    });
    return { strata: strata };
  }

  function countGroupLevels() { return getColumns().filter(function (c) { return c.isGroup; }).length; }

  /* ═══════════════════════════ 7. HTML / TEXT RENDERING ═══════════════════════════ */

  function autoNoteText() {
    var contFormats = {}, catFormats = {};
    eligibleVarDefs().forEach(function (v) {
      var cfg = state.varCfg[v.key], t = effectiveType(v, cfg);
      if (t === "continuous") contFormats[cfg.format] = true; else catFormats[cfg.format] = true;
    });
    var cParts = [];
    if (contFormats["mean-sd"] || contFormats["mean-sd-paren"]) cParts.push("mean \u00B1 SD");
    if (contFormats["median-iqr-paren"] || contFormats["median-iqr-bracket"]) cParts.push("median (IQR)");
    if (contFormats["median-minmax"] || contFormats.range) cParts.push("median (range)");
    var pieces = [];
    if (cParts.length) pieces.push("Continuous variables are presented as " + cParts.join(" or ") + ".");
    if (Object.keys(catFormats).length) pieces.push("Categorical variables are presented as n (%) unless otherwise noted.");
    if (state.groupVar) {
      var levels = countGroupLevels();
      pieces.push(levels === 2
        ? "Group comparisons used Welch's t-test for continuous variables and the chi-square test for categorical variables."
        : "Group comparisons used one-way ANOVA for continuous variables and the chi-square test for categorical variables.");
      if (state.showSMD) pieces.push("SMD = standardized mean difference" + (levels > 2 ? " (maximum pairwise value shown)" : "") + "; values above 0.1 suggest meaningful imbalance.");
    }
    if (state.weightVar) pieces.push("Estimates are weighted; unweighted N is shown in each column header.");
    if (state.completeCase) pieces.push("Analysis restricted to participants with complete data on all displayed variables.");
    else if (state.showMissingCategory) pieces.push("Missing values are shown as a separate category where present.");
    pieces.push("N = " + getWorkingRows().length + ".");
    return pieces.join(" ");
  }

  function renderBlockTable(block, sp, rowPad, fontSize, headerBorderBottom, headerBg) {
    var showTest = state.showPValue && block.rows.some(function (r) { return r.test; });
    var showSmdCol = state.showSMD && block.rows.some(function (r) { return r.smd != null && isFinite(r.smd); });
    var html = '<table style="width:100%;border-collapse:collapse;font-size:' + fontSize + ';border-top:2px solid #111;border-bottom:2px solid #111;">';
    html += "<thead><tr>";
    html += '<th style="text-align:left;padding:' + rowPad + ";" + headerBorderBottom + headerBg + '">Characteristic</th>';
    block.columns.forEach(function (col) {
      html += '<th style="text-align:center;padding:' + rowPad + ";" + headerBorderBottom + headerBg + '">' + esc(col.label) +
        '<br><span style="font-weight:400;font-size:.82em;">(N=' + block.columnN[col.key] + ")</span></th>";
    });
    if (showTest) html += '<th style="text-align:center;padding:' + rowPad + ";" + headerBorderBottom + headerBg + '">P value</th>';
    if (showSmdCol) html += '<th style="text-align:center;padding:' + rowPad + ";" + headerBorderBottom + headerBg + '">SMD</th>';
    html += "</tr></thead><tbody>";

    block.rows.forEach(function (row) {
      if (row.type === "continuous") {
        html += '<tr><td style="padding:' + rowPad + ';">' + esc(row.label) + "</td>";
        row.cells.forEach(function (c) { html += '<td style="padding:' + rowPad + ';text-align:center;">' + esc(c) + "</td>"; });
        if (showTest) html += '<td style="padding:' + rowPad + ';text-align:center;">' + (row.test ? fmtP(row.test.p, sp) : "\u2014") + "</td>";
        if (showSmdCol) html += '<td style="padding:' + rowPad + ';text-align:center;">' + (row.smd != null && isFinite(row.smd) ? Math.abs(row.smd).toFixed(2) : "\u2014") + "</td>";
        html += "</tr>";
      } else {
        var colspan = 1 + block.columns.length + (showTest ? 1 : 0) + (showSmdCol ? 1 : 0);
        html += '<tr><td colspan="' + colspan + '" style="padding:' + rowPad + ';font-weight:600;">' + esc(row.label) + "</td></tr>";
        row.categoryRows.forEach(function (cr, idx) {
          html += '<tr><td style="padding:' + rowPad + ";padding-left:" + (sp.indentEm + 0.4) + 'em;">' + esc(cr.catLabel) + "</td>";
          cr.cells.forEach(function (c) { html += '<td style="padding:' + rowPad + ';text-align:center;">' + esc(c) + "</td>"; });
          if (showTest) html += '<td style="padding:' + rowPad + ';text-align:center;">' + (idx === 0 && row.test ? fmtP(row.test.p, sp) : "") + "</td>";
          if (showSmdCol) html += '<td style="padding:' + rowPad + ';text-align:center;">' + (idx === 0 && row.smd != null && isFinite(row.smd) ? Math.abs(row.smd).toFixed(2) : "") + "</td>";
          html += "</tr>";
        });
      }
    });
    html += "</tbody></table>";
    return html;
  }

  function renderModelHtml(model) {
    var sp = effectiveStyle();
    var rowPad = sp.density === "compact" ? "3px 8px" : "6px 10px";
    var fontSize = sp.density === "compact" ? "11.5px" : "13px";
    var headerBorderBottom = sp.headerStyle === "rule" ? "border-bottom:1px solid #111;" : "";
    var headerBg = sp.headerStyle === "shade" ? "background:#f0f0f0;" : "";

    var html = '<div style="font-family:' + sp.font + ';color:#111;">';
    html += '<div style="font-weight:' + (sp.captionBold ? "700" : "400") + ';font-size:14px;margin-bottom:2px;">Table ' + esc(state.report.tableNumber) + ".</div>";
    html += '<div style="font-size:14px;margin-bottom:4px;' + (sp.italicTitle ? "font-style:italic;" : "") + '">' + esc(state.report.title) + "</div>";
    html += state.report.subtitle
      ? '<div style="font-size:12.5px;color:#333;margin-bottom:10px;">' + esc(state.report.subtitle) + "</div>"
      : '<div style="margin-bottom:10px;"></div>';

    var model2 = model || buildModel();
    model2.strata.forEach(function (stratum, sIdx) {
      if (stratum.label) html += '<div style="font-weight:700;font-size:12.5px;margin:' + (sIdx > 0 ? "16px" : "0") + ' 0 6px;">' + esc(stratum.label) + "</div>";
      html += renderBlockTable(stratum.block, sp, rowPad, fontSize, headerBorderBottom, headerBg);
    });

    var noteLines = [state.report.notes ? state.report.notes : autoNoteText()];
    if (state.report.abbreviations) noteLines.push(state.report.abbreviations);
    html += '<div style="font-size:11.5px;margin-top:10px;line-height:1.5;">' + noteLines.map(esc).join("<br>") + "</div>";
    html += "</div>";
    return html;
  }

  function buildPlainTextExport(model) {
    var sp = effectiveStyle();
    var lines = ["Table " + state.report.tableNumber + ".", state.report.title];
    if (state.report.subtitle) lines.push(state.report.subtitle);
    lines.push("");
    model.strata.forEach(function (stratum) {
      if (stratum.label) lines.push(stratum.label);
      var block = stratum.block;
      var showTest = state.showPValue && block.rows.some(function (r) { return r.test; });
      var showSmdCol = state.showSMD && block.rows.some(function (r) { return r.smd != null && isFinite(r.smd); });
      var header = ["Characteristic"].concat(block.columns.map(function (c) { return c.label + " (N=" + block.columnN[c.key] + ")"; }));
      if (showTest) header.push("P value");
      if (showSmdCol) header.push("SMD");
      lines.push(header.join("\t"));
      block.rows.forEach(function (row) {
        if (row.type === "continuous") {
          var cells = [row.label].concat(row.cells);
          if (showTest) cells.push(row.test ? fmtP(row.test.p, sp) : "");
          if (showSmdCol) cells.push(row.smd != null && isFinite(row.smd) ? Math.abs(row.smd).toFixed(2) : "");
          lines.push(cells.join("\t"));
        } else {
          lines.push(row.label);
          row.categoryRows.forEach(function (cr, idx) {
            var cells = ["  " + cr.catLabel].concat(cr.cells);
            if (showTest) cells.push(idx === 0 && row.test ? fmtP(row.test.p, sp) : "");
            if (showSmdCol) cells.push(idx === 0 && row.smd != null && isFinite(row.smd) ? Math.abs(row.smd).toFixed(2) : "");
            lines.push(cells.join("\t"));
          });
        }
      });
      lines.push("");
    });
    lines.push(state.report.notes || autoNoteText());
    if (state.report.abbreviations) lines.push(state.report.abbreviations);
    return lines.join("\n");
  }

  /* ═══════════════════════════ 8. UI WIRING ═══════════════════════════ */

  var $ = function (id) { return document.getElementById(id); };

  /* Click-based fallback for environments where dragging is inconvenient
     (e.g. touch, accessibility, or a host that blocks pointer capture). */
  function moveVarByOffset(key, offset) {
    var order = state.varOrder;
    var idx = order.indexOf(key);
    if (idx === -1) return;
    var target = idx + offset;
    if (target < 0 || target >= order.length) return;
    order.splice(idx, 1);
    order.splice(target, 0, key);
    renderAll();
  }

  /* Reordering is implemented with raw pointer events (not the native HTML5
     drag-and-drop API). Native DnD depends on the OS's drag session, which
     is frequently broken inside remote-desktop sessions, VMs, and some
     embedded/webview hosts (shows a "not-allowed" cursor and silently does
     nothing). Tracking pointerdown/move/up ourselves and moving the <tr>
     directly works everywhere the mouse itself works. */
  var pointerDrag = null;

  function wireVarGridDragDrop() {
    var body = $("pt2VarGridBody");

    body.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      var handle = e.target.closest(".pt2-drag-handle");
      if (!handle) return;
      var tr = handle.closest("tr");
      if (!tr) return;
      e.preventDefault();
      pointerDrag = { pointerId: e.pointerId, tr: tr, handle: handle };
      tr.classList.add("pt2-dragging");
      document.body.classList.add("pt2-noselect");
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });

    body.addEventListener("pointermove", function (e) {
      if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
      var tr = pointerDrag.tr;
      var rows = Array.prototype.slice.call(body.children);
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r === tr) continue;
        var rect = r.getBoundingClientRect();
        if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
        var before = e.clientY < (rect.top + rect.height / 2);
        body.insertBefore(tr, before ? r : r.nextSibling);
        break;
      }
    });

    function endDrag(e) {
      if (!pointerDrag || (e && e.pointerId !== pointerDrag.pointerId)) return;
      pointerDrag.tr.classList.remove("pt2-dragging");
      document.body.classList.remove("pt2-noselect");
      try { pointerDrag.handle.releasePointerCapture(pointerDrag.pointerId); } catch (err) {}
      var newOrder = Array.prototype.slice.call(body.children).map(function (r) { return r.dataset.varKey; });
      pointerDrag = null;
      if (newOrder.length === state.varOrder.length) state.varOrder = newOrder;
      renderAll();
    }
    body.addEventListener("pointerup", endDrag);
    body.addEventListener("pointercancel", endDrag);
  }

  function renderVarGrid() {
    var body = $("pt2VarGridBody");
    body.innerHTML = "";
    $("pt2FreqHint").style.display = state.tableType === "frequency" ? "" : "none";
    var tableRowCounter = 0;
    orderedVarDefs().forEach(function (v) {
      var cfg = state.varCfg[v.key];
      var effType = effectiveType(v, cfg);
      var disabledForType = state.tableType === "frequency" && effType === "continuous";
      var isCatLike = effType !== "continuous";
      var formats = effType === "continuous" ? CONTINUOUS_FORMATS : CATEGORICAL_FORMATS;
      var willAppearInTable = isVariableEligible(v, cfg);
      if (willAppearInTable) tableRowCounter += 1;

      var tr = document.createElement("tr");
      tr.dataset.varKey = v.key;
      if (disabledForType) tr.className = "pt2-row-disabled";

      var tdDrag = document.createElement("td");
      tdDrag.className = "pt2-drag-col";
      var dragCell = document.createElement("span");
      dragCell.className = "pt2-drag-cell";
      var orderNum = document.createElement("span");
      orderNum.className = "pt2-drag-order";
      orderNum.textContent = willAppearInTable ? String(tableRowCounter) : "\u2014";
      orderNum.title = willAppearInTable ? "Row " + tableRowCounter + " in the published table" : "Not currently included in the table";
      var handle = document.createElement("span");
      handle.className = "pt2-drag-handle";
      handle.title = "Drag to change the order this variable appears in the table";
      handle.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
      var orderBtns = document.createElement("span");
      orderBtns.className = "pt2-order-btns";
      var idxInOrder = state.varOrder.indexOf(v.key);
      var upBtn = document.createElement("button");
      upBtn.type = "button"; upBtn.className = "pt2-order-btn"; upBtn.title = "Move up";
      upBtn.innerHTML = '<i class="fa-solid fa-caret-up"></i>';
      upBtn.disabled = idxInOrder <= 0;
      upBtn.addEventListener("click", function () { moveVarByOffset(v.key, -1); });
      var downBtn = document.createElement("button");
      downBtn.type = "button"; downBtn.className = "pt2-order-btn"; downBtn.title = "Move down";
      downBtn.innerHTML = '<i class="fa-solid fa-caret-down"></i>';
      downBtn.disabled = idxInOrder >= state.varOrder.length - 1;
      downBtn.addEventListener("click", function () { moveVarByOffset(v.key, 1); });
      orderBtns.appendChild(upBtn);
      orderBtns.appendChild(downBtn);

      dragCell.appendChild(orderNum);
      dragCell.appendChild(handle);
      dragCell.appendChild(orderBtns);
      tdDrag.appendChild(dragCell);
      tr.appendChild(tdDrag);

      var tdInclude = document.createElement("td");
      var chk = document.createElement("input");
      chk.type = "checkbox"; chk.checked = cfg.include;
      chk.addEventListener("change", function () { cfg.include = chk.checked; renderAll(); });
      tdInclude.appendChild(chk);
      tr.appendChild(tdInclude);

      var tdLabel = document.createElement("td");
      var labelInput = document.createElement("input");
      labelInput.type = "text"; labelInput.value = cfg.label;
      labelInput.addEventListener("input", function () { cfg.label = labelInput.value; renderPreview(); });
      tdLabel.appendChild(labelInput);
      tr.appendChild(tdLabel);

      var tdDetected = document.createElement("td");
      var badge = document.createElement("span");
      badge.className = "pt2-type-badge pt2-type-" + v.type;
      badge.textContent = v.type;
      tdDetected.appendChild(badge);
      tr.appendChild(tdDetected);

      var tdOverride = document.createElement("td");
      var overrideSel = document.createElement("select");
      ["auto", "continuous", "categorical", "ordinal", "binary"].forEach(function (opt) {
        var o = document.createElement("option"); o.value = opt;
        o.textContent = opt === "auto" ? "Auto (" + v.type + ")" : opt.charAt(0).toUpperCase() + opt.slice(1);
        if (cfg.typeOverride === opt) o.selected = true;
        overrideSel.appendChild(o);
      });
      overrideSel.addEventListener("change", function () {
        var wasContinuous = effectiveType(v, cfg) === "continuous";
        cfg.typeOverride = overrideSel.value;
        var nowContinuous = effectiveType(v, cfg) === "continuous";
        if (wasContinuous !== nowContinuous) {
          cfg.format = nowContinuous ? "mean-sd" : "n-percent";
          if (!nowContinuous && !cfg.orderText) cfg.orderText = deriveCategories(v.key).join(", ");
        }
        renderVarGrid(); renderAll();
      });
      tdOverride.appendChild(overrideSel);
      tr.appendChild(tdOverride);

      var tdFormat = document.createElement("td");
      var formatSel = document.createElement("select");
      formats.forEach(function (f) {
        var o = document.createElement("option"); o.value = f.value; o.textContent = f.label;
        if (cfg.format === f.value) o.selected = true;
        formatSel.appendChild(o);
      });
      formatSel.addEventListener("change", function () { cfg.format = formatSel.value; renderPreview(); });
      tdFormat.appendChild(formatSel);
      tr.appendChild(tdFormat);

      var tdDecimals = document.createElement("td");
      var decInput = document.createElement("input");
      decInput.type = "number"; decInput.min = "0"; decInput.max = "6"; decInput.value = cfg.decimals;
      decInput.addEventListener("input", function () { cfg.decimals = parseInt(decInput.value, 10) || 0; renderPreview(); });
      tdDecimals.appendChild(decInput);
      tr.appendChild(tdDecimals);

      var tdMissing = document.createElement("td");
      var missSel = document.createElement("select");
      [["inherit", "Use global setting"], ["category", "Show as category"], ["exclude", "Exclude"]].forEach(function (pair) {
        var o = document.createElement("option"); o.value = pair[0]; o.textContent = pair[1];
        if (cfg.missingRule === pair[0]) o.selected = true;
        missSel.appendChild(o);
      });
      missSel.addEventListener("change", function () { cfg.missingRule = missSel.value; renderPreview(); });
      tdMissing.appendChild(missSel);
      tr.appendChild(tdMissing);

      var tdOrder = document.createElement("td");
      var orderInput = document.createElement("input");
      orderInput.type = "text";
      orderInput.value = isCatLike ? (cfg.orderText || defaultCategoriesFor(v).join(", ")) : "";
      orderInput.placeholder = isCatLike ? "" : "N/A for continuous";
      orderInput.disabled = !isCatLike;
      orderInput.addEventListener("input", function () { cfg.orderText = orderInput.value; renderPreview(); });
      tdOrder.appendChild(orderInput);
      tr.appendChild(tdOrder);

      body.appendChild(tr);
    });
  }

  function populateSelect(sel, defs, currentValue, noneLabel) {
    sel.innerHTML = "";
    var noneOpt = document.createElement("option"); noneOpt.value = ""; noneOpt.textContent = noneLabel;
    sel.appendChild(noneOpt);
    defs.forEach(function (d) {
      var o = document.createElement("option"); o.value = d.key; o.textContent = d.label;
      sel.appendChild(o);
    });
    sel.value = currentValue || "";
  }

  function renderPreview() {
    var model = buildModel();
    var wrap = $("pt2PaperWrap");
    var chip = $("pt2SourceChip");
    chip.textContent = (state.dataSource === "excel" ? "Your Excel data" : "Demo dataset") + " · N=" + ACTIVE_DATA.length + " · " + eligibleVarDefs().length + " variable(s) summarized" +
      (state.groupVar ? " · grouped by " + GROUP_VAR_DEFS.filter(function (g) { return g.key === state.groupVar; })[0].label : "") +
      (state.stratVar ? " · stratified by " + STRAT_VAR_DEFS.filter(function (s) { return s.key === state.stratVar; })[0].label : "");

    var existingPaper = wrap.querySelector(".pt2-paper");
    if (!existingPaper) { existingPaper = document.createElement("div"); existingPaper.className = "pt2-paper"; wrap.appendChild(existingPaper); }

    if (!eligibleVarDefs().length) {
      existingPaper.innerHTML = '<div class="pt2-error">No variables are currently included in this table. Go to the Build tab and include at least one variable.</div>';
      return;
    }
    existingPaper.innerHTML = renderModelHtml(model);
  }

  function renderDetails() {
    $("pt2MethodsProse").textContent = autoNoteText() + " Weight variable: " + (state.weightVar ? WEIGHT_VAR_DEFS.filter(function (w) { return w.key === state.weightVar; })[0].label : "none") + ".";

    var model = buildModel();
    var auditBody = $("pt2AuditBody");
    auditBody.innerHTML = "";
    model.strata.forEach(function (stratum) {
      stratum.block.rows.forEach(function (row) {
        var tr = document.createElement("tr");
        var label = (stratum.label ? stratum.label + " \u2013 " : "") + row.label;
        var stat = row.test ? fmtNum(row.test.stat, 2) : "\u2014";
        var df = row.test ? row.test.df : "\u2014";
        var p = row.test ? fmtP(row.test.p, { pLeadingZero: true }) : "\u2014";
        var testName = row.test ? row.test.name : "\u2014";
        var smd = row.smd != null && isFinite(row.smd) ? Math.abs(row.smd).toFixed(2) : "\u2014";
        tr.innerHTML = "<td>" + esc(label) + "</td><td>" + esc(row.type) + "</td><td>" + esc(testName) + "</td><td>" + esc(stat) + "</td><td>" + esc(String(df)) + "</td><td>" + esc(p) + "</td><td>" + esc(smd) + "</td>";
        auditBody.appendChild(tr);
      });
    });

    var dictBody = $("pt2DictBody");
    dictBody.innerHTML = "";
    function dictRow(key, label, role, type, extra) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + esc(label) + "</td><td>" + esc(role) + "</td><td>" + esc(type) + "</td><td>" + esc(extra) + "</td>";
      dictBody.appendChild(tr);
    }
    VAR_DEFS.forEach(function (v) {
      var cfg = state.varCfg[v.key];
      var role = cfg.include ? "Summarized" : "Available (not summarized)";
      var extra = v.categories ? v.categories.join(", ") : "continuous range";
      dictRow(v.key, v.label, role, v.type, extra);
    });
    GROUP_VAR_DEFS.forEach(function (g) { dictRow(g.key, g.label, state.groupVar === g.key ? "Group variable (active)" : "Available group variable", "categorical", g.categories.join(", ")); });
    STRAT_VAR_DEFS.forEach(function (s) { dictRow(s.key, s.label, state.stratVar === s.key ? "Stratification variable (active)" : "Available stratification variable", "categorical", s.categories.join(", ")); });
    WEIGHT_VAR_DEFS.forEach(function (w) {
      var vals = ACTIVE_DATA.map(function (r) { return Number(r[w.key]); }).filter(function (x) { return isFinite(x); });
      var range = vals.length ? ("\u2248 " + Math.min.apply(null, vals).toFixed(2) + "\u2013" + Math.max.apply(null, vals).toFixed(2)) : "continuous";
      dictRow(w.key, w.label, state.weightVar === w.key ? "Weight variable (active)" : "Available weight variable", "continuous", range);
    });
  }

  function renderAll() {
    renderVarGrid();
    renderPreview();
    if (state.tab === "details") renderDetails();
    var badge = $("pt2SourceBadge");
    if (badge) badge.textContent = (state.dataSource === "excel" ? "Your Excel data" : "Demo dataset") + " \u00B7 N=" + ACTIVE_DATA.length;
  }

  function syncControlsFromState() {
    $("pt2ShowOverall").checked = state.showOverall;
    $("pt2ShowPValue").checked = state.showPValue;
    $("pt2ShowSMD").checked = state.showSMD;
    populateSelect($("pt2GroupVar"), GROUP_VAR_DEFS, state.groupVar, "None");
    populateSelect($("pt2StratVar"), STRAT_VAR_DEFS, state.stratVar, "None");
    populateSelect($("pt2WeightVar"), WEIGHT_VAR_DEFS, state.weightVar, "None (unweighted)");
    $("pt2CompleteCase").checked = state.completeCase;
    $("pt2ShowMissingCat").checked = state.showMissingCategory;
    $("pt2MissingLabel").value = state.missingLabel;

    $("pt2TableNumber").value = state.report.tableNumber;
    $("pt2Title").value = state.report.title;
    $("pt2Subtitle").value = state.report.subtitle;
    $("pt2Notes").value = state.report.notes;
    $("pt2Abbrev").value = state.report.abbreviations;
    $("pt2StylePreset").value = state.report.stylePreset;
    $("pt2DefaultDecimals").value = state.report.decimals;
    $("pt2DefaultPctDecimals").value = state.report.percentDecimals;
    $("pt2CustomItalic").checked = state.report.custom.italicTitle;
    $("pt2CustomBoldCaption").checked = state.report.custom.captionBold;
    $("pt2CustomLeadingZero").checked = state.report.custom.pLeadingZero;
    $("pt2CustomFont").value = state.report.custom.font;
    $("pt2CustomDensity").value = state.report.custom.density;
    $("pt2CustomHeaderStyle").value = state.report.custom.headerStyle;
    $("pt2CustomExtra").classList.toggle("visible", state.report.stylePreset === "custom");
  }

  function wireTypeHelpModal() {
    var overlay = $("pt2TypeHelpOverlay");
    var openBtn = $("pt2TypeHelpBtn");
    var closeBtn = $("pt2TypeHelpCloseBtn");
    if (!overlay || !openBtn) return;
    function open() { overlay.classList.add("open"); }
    function close() { overlay.classList.remove("open"); }
    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  function wireTabs() {
    var btns = document.querySelectorAll(".pt2-tab-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-tab");
        state.tab = tab;
        btns.forEach(function (b) { b.classList.toggle("active", b === btn); });
        ["data", "build", "preview", "details"].forEach(function (t) {
          $("pt2View" + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle("active", t === tab);
        });
        if (tab === "details") renderDetails();
        if (tab === "preview") renderPreview();
        if (tab === "data") renderDataTab();
      });
    });
  }

  /* ═══════════════════════════ 8b. DATA TAB (real Excel data) ═══════════════════════════ */

  function officeHostAvailable() { return typeof Office !== "undefined" && !!Office.context && !!Office.context.ui; }

  function chooseDataSource(kind) {
    state.dataChoice = kind;
    if (kind === "demo") {
      setDataset("demo", DEMO_DATA, DEMO_VAR_DEFS, DEMO_GROUP_VAR_DEFS, DEMO_STRAT_VAR_DEFS, DEMO_WEIGHT_VAR_DEFS);
      syncControlsFromState();
      renderAll();
    } else if (kind === "excel" && state.excelDataset) {
      var ed = state.excelDataset;
      setDataset("excel", ed.rows, ed.varDefs, ed.groupDefs, ed.stratDefs, ed.weightDefs);
      syncControlsFromState();
      renderAll();
    }
    renderDataTab();
  }

  function onExcelDataReceived(payload) {
    var headers = payload.headers || [];
    var rowArrays = payload.rows || [];
    if (!headers.length || !rowArrays.length) {
      renderDataTab();
      return;
    }
    var built = buildExcelDataset(headers, rowArrays);
    var aux = computeAuxVarDefs(built.varDefs);
    state.excelDataset = {
      rows: built.rows, varDefs: built.varDefs,
      groupDefs: aux.groupDefs, stratDefs: aux.stratDefs, weightDefs: aux.weightDefs,
      address: payload.address || "", n: built.rows.length
    };
    if (state.dataChoice === "excel") {
      setDataset("excel", built.rows, built.varDefs, aux.groupDefs, aux.stratDefs, aux.weightDefs);
      syncControlsFromState();
      renderAll();
    }
    renderDataTab();
  }

  function renderDataTab() {
    var statusEl = $("pt2ExcelStatus");
    var previewPanel = $("pt2ExcelPreviewPanel");
    var previewBody = $("pt2ExcelPreviewBody");
    if (!statusEl) return;
    statusEl.className = "pt2-excel-status";

    if (!officeHostAvailable()) {
      statusEl.classList.add("is-nohost");
      statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Real Excel data is only available when this module is opened from the Statistico Hub inside Excel. Using the demo dataset here.';
      if (previewPanel) previewPanel.style.display = "none";
      return;
    }

    var ed = state.excelDataset;
    if (!ed) {
      statusEl.classList.add("is-waiting");
      statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Waiting for data from Excel\u2026 make sure a range with header names is selected (or the active sheet has a used range), then try \u201cRefresh from sheet\u201d.';
      if (previewPanel) previewPanel.style.display = "none";
      return;
    }

    statusEl.classList.add("is-ready");
    statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + (ed.address ? "<strong>" + esc(ed.address) + "</strong> \u2014 " : "") +
      ed.n + " row(s) \u00d7 " + ed.varDefs.length + " column(s) detected." +
      (state.dataChoice === "excel" ? " Currently in use for the table below." : ' Select \u201cMy Excel data\u201d above to use it.');

    if (previewPanel) previewPanel.style.display = "";
    if (previewBody) {
      previewBody.innerHTML = "";
      ed.varDefs.forEach(function (v) {
        var vals = ed.rows.map(function (r) { return r[v.key]; });
        var missing = vals.filter(isMissing).length;
        var distinct = v.categories ? v.categories.length : "\u2014";
        var tr = document.createElement("tr");
        tr.innerHTML = "<td>" + esc(v.label) + "</td><td><span class=\"pt2-type-badge pt2-type-" + v.type + "\">" + esc(v.type) + "</span></td><td>" + esc(String(distinct)) + "</td><td>" + missing + "</td>";
        previewBody.appendChild(tr);
      });
    }
  }

  function wireDataSourceControls() {
    var demoRadio = $("pt2DataSourceDemo");
    var excelRadio = $("pt2DataSourceExcel");
    if (demoRadio) demoRadio.addEventListener("change", function () { if (demoRadio.checked) chooseDataSource("demo"); });
    if (excelRadio) excelRadio.addEventListener("change", function () { if (excelRadio.checked) chooseDataSource("excel"); });
    var refreshBtn = $("pt2RefreshExcelBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", function () {
      flashButton(refreshBtn, "Requesting\u2026");
      sendToHost({ action: "refreshData" });
    });
  }

  var excelRequestRetryTimer = null;

  function stopExcelRequestRetry() {
    if (excelRequestRetryTimer) { clearInterval(excelRequestRetryTimer); excelRequestRetryTimer = null; }
  }

  function handleHostMessage(rawMessage) {
    try {
      var msg = JSON.parse(rawMessage || "{}");
      if (msg.type === "PUBTABLES_DATA" && msg.payload) {
        stopExcelRequestRetry();
        onExcelDataReceived(msg.payload);
      }
    } catch (e) {}
  }

  function wireHostMessaging() {
    if (!officeHostAvailable()) { renderDataTab(); return; }
    try {
      Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, function (arg) {
        handleHostMessage(arg.message);
      });
    } catch (e) {}
    sendToHost({ action: "ready" });
    sendToHost({ action: "requestData" });
    var attempts = 0;
    excelRequestRetryTimer = setInterval(function () {
      attempts += 1;
      if (state.excelDataset || attempts > 20) { stopExcelRequestRetry(); return; }
      sendToHost({ action: "requestData" });
    }, 700);
  }

  function wireBuildControls() {
    document.querySelectorAll('input[name="pt2Type"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        if (!radio.checked) return;
        state.tableType = radio.value;
        applyTableTypeDefaults(state.tableType);
        syncControlsFromState();
        renderAll();
      });
    });
    $("pt2GroupVar").addEventListener("change", function (e) { state.groupVar = e.target.value; renderAll(); });
    $("pt2StratVar").addEventListener("change", function (e) { state.stratVar = e.target.value; renderAll(); });
    $("pt2WeightVar").addEventListener("change", function (e) { state.weightVar = e.target.value; renderAll(); });
    $("pt2ShowOverall").addEventListener("change", function (e) { state.showOverall = e.target.checked; renderAll(); });
    $("pt2ShowPValue").addEventListener("change", function (e) { state.showPValue = e.target.checked; renderAll(); });
    $("pt2ShowSMD").addEventListener("change", function (e) { state.showSMD = e.target.checked; renderAll(); });
    $("pt2CompleteCase").addEventListener("change", function (e) { state.completeCase = e.target.checked; renderAll(); });
    $("pt2ShowMissingCat").addEventListener("change", function (e) { state.showMissingCategory = e.target.checked; renderAll(); });
    $("pt2MissingLabel").addEventListener("input", function (e) { state.missingLabel = e.target.value; renderPreview(); });
  }

  function wirePreviewControls() {
    $("pt2TableNumber").addEventListener("input", function (e) { state.report.tableNumber = e.target.value; renderPreview(); });
    $("pt2Title").addEventListener("input", function (e) { state.report.title = e.target.value; renderPreview(); });
    $("pt2Subtitle").addEventListener("input", function (e) { state.report.subtitle = e.target.value; renderPreview(); });
    $("pt2Notes").addEventListener("input", function (e) { state.report.notes = e.target.value; renderPreview(); });
    $("pt2Abbrev").addEventListener("input", function (e) { state.report.abbreviations = e.target.value; renderPreview(); });
    $("pt2StylePreset").addEventListener("change", function (e) {
      state.report.stylePreset = e.target.value;
      $("pt2CustomExtra").classList.toggle("visible", state.report.stylePreset === "custom");
      renderPreview();
    });
    $("pt2DefaultDecimals").addEventListener("input", function (e) { state.report.decimals = parseInt(e.target.value, 10) || 0; });
    $("pt2DefaultPctDecimals").addEventListener("input", function (e) { state.report.percentDecimals = parseInt(e.target.value, 10) || 0; });
    $("pt2ApplyDecimalsBtn").addEventListener("click", function () {
      VAR_DEFS.forEach(function (v) {
        var cfg = state.varCfg[v.key];
        cfg.decimals = effectiveType(v, cfg) === "continuous" ? state.report.decimals : state.report.percentDecimals;
      });
      renderVarGrid(); renderPreview();
    });
    $("pt2CustomItalic").addEventListener("change", function (e) { state.report.custom.italicTitle = e.target.checked; renderPreview(); });
    $("pt2CustomBoldCaption").addEventListener("change", function (e) { state.report.custom.captionBold = e.target.checked; renderPreview(); });
    $("pt2CustomLeadingZero").addEventListener("change", function (e) { state.report.custom.pLeadingZero = e.target.checked; renderPreview(); });
    $("pt2CustomFont").addEventListener("change", function (e) { state.report.custom.font = e.target.value; renderPreview(); });
    $("pt2CustomDensity").addEventListener("change", function (e) { state.report.custom.density = e.target.value; renderPreview(); });
    $("pt2CustomHeaderStyle").addEventListener("change", function (e) { state.report.custom.headerStyle = e.target.value; renderPreview(); });
  }

  /* ═══════════════════════════ 9. COPY / EXPORT ═══════════════════════════ */

  function flashButton(btn, label) {
    var original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> ' + label;
    btn.classList.add("pt2-copy-flash");
    setTimeout(function () { btn.innerHTML = original; btn.classList.remove("pt2-copy-flash"); }, 1400);
  }
  function copyViaExecCommand(html, plain) {
    var container = document.createElement("div");
    container.style.position = "fixed"; container.style.left = "-9999px";
    container.innerHTML = html;
    document.body.appendChild(container);
    var range = document.createRange();
    range.selectNodeContents(container);
    var sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    sel.removeAllRanges();
    document.body.removeChild(container);
    if (!ok && navigator.clipboard) navigator.clipboard.writeText(plain).catch(function () {});
    return ok;
  }
  function copyHtmlToClipboard(html, plain) {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      var item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" })
      });
      return navigator.clipboard.write([item]).catch(function () { copyViaExecCommand(html, plain); });
    }
    copyViaExecCommand(html, plain);
    return Promise.resolve();
  }
  function copyPlainText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(function () { copyViaExecCommand("<pre>" + esc(text) + "</pre>", text); });
    copyViaExecCommand("<pre>" + esc(text) + "</pre>", text);
    return Promise.resolve();
  }
  function downloadBlob(content, mime, filename) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 250);
  }
  function officeWrapper(bodyHtml, kind) {
    var xmlns = kind === "word"
      ? "xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'"
      : "xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'";
    return "<html " + xmlns + "><head><meta charset='utf-8'><title>Publication Table</title></head><body>" + bodyHtml + "</body></html>";
  }

  function wireExportControls() {
    $("pt2CopyTextBtn").addEventListener("click", function () {
      var text = buildPlainTextExport(buildModel());
      copyPlainText(text);
      flashButton($("pt2CopyTextBtn"), "Copied");
    });
    $("pt2CopyHtmlBtn").addEventListener("click", function () {
      var html = renderModelHtml(buildModel());
      var text = buildPlainTextExport(buildModel());
      copyHtmlToClipboard(html, text);
      flashButton($("pt2CopyHtmlBtn"), "Copied");
    });
    $("pt2CopySourceBtn").addEventListener("click", function () {
      var html = renderModelHtml(buildModel());
      var pretty = html.replace(/></g, ">\n<");
      copyPlainText(pretty);
      flashButton($("pt2CopySourceBtn"), "Copied");
    });
    $("pt2ExportExcelBtn").addEventListener("click", function () {
      var html = renderModelHtml(buildModel());
      downloadBlob(officeWrapper(html, "excel"), "application/vnd.ms-excel", "publication-table.xls");
      flashButton($("pt2ExportExcelBtn"), "Exported");
    });
    $("pt2ExportWordBtn").addEventListener("click", function () {
      var html = renderModelHtml(buildModel());
      downloadBlob(officeWrapper(html, "word"), "application/msword", "publication-table.doc");
      flashButton($("pt2ExportWordBtn"), "Exported");
    });
  }

  /* ═══════════════════════════ 10. INIT ═══════════════════════════ */

  function sendToHost(payload) {
    try { if (Office && Office.context && Office.context.ui) Office.context.ui.messageParent(JSON.stringify(payload)); } catch (e) {}
  }

  function init() {
    wireTabs();
    wireBuildControls();
    wirePreviewControls();
    wireExportControls();
    wireVarGridDragDrop();
    wireTypeHelpModal();
    wireDataSourceControls();
    syncControlsFromState();
    renderAll();
    renderDataTab();

    var closeBtn = $("pt2CloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", function () { sendToHost({ action: "close" }); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* Office.context isn't guaranteed to exist until Office.onReady() resolves,
     so the host-messaging handshake (which needs Office.context.ui) waits for
     that instead of running unconditionally inside init(). Everything else in
     init() runs immediately so the demo table shows up without delay. */
  if (typeof Office !== "undefined" && Office.onReady) {
    Office.onReady().then(wireHostMessaging).catch(function () { renderDataTab(); });
  } else {
    renderDataTab();
  }
})();
