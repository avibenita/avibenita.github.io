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
     bindings wholesale once the currently selected Excel range arrives from
     the Hub, so the rest of the engine never needs to know which source it
     is looking at. */
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
     Converts a raw headers/rows payload (as received from the Excel host —
     i.e. the currently selected range) into the same
     { key, label, type, categories } shape used by the built-in demo
     variables, so the rest of the engine never needs to know whether it is
     looking at demo or real data. */

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

  /* Builds { rows, varDefs } from raw headers[] + rows[][] exactly as
     received over messageParent/messageChild from the Excel host. */
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
    }).map(function (v) { return { key: v.key, label: humanizeLabel(v.label), categories: v.categories }; });
    var weightish = varDefs.filter(function (v) { return v.type === "continuous"; })
      .map(function (v) { return { key: v.key, label: humanizeLabel(v.label) }; });
    return { groupDefs: groupish, stratDefs: groupish.slice(), weightDefs: weightish };
  }

  /* Per-dataset memory of variable config, so a re-selection of the same
     range (or a bounce back to the demo set) doesn't discard prior edits. */
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
    state.stratVar = (saved && saved.stratVar && STRAT_VAR_DEFS.some(function (s) { return s.key === saved.stratVar; })) ? saved.stratVar : "";
    state.weightVar = (saved && saved.weightVar && WEIGHT_VAR_DEFS.some(function (w) { return w.key === saved.weightVar; })) ? saved.weightVar : "";
    state.dataSource = kind;

    // Make sure a group var is picked if the current table type needs one
    // and none survived the switch — then auto-exclude it from body rows.
    var td = TABLE_TYPE_DEFAULTS[state.tableType];
    var nextGroup = (saved && saved.groupVar && GROUP_VAR_DEFS.some(function (g) { return g.key === saved.groupVar; })) ? saved.groupVar : "";
    if (td && td.wantsGroup && !nextGroup) nextGroup = pickFallbackGroupVar(td.preferredGroupKey);
    state.groupVar = "";
    applyGroupVarSelection(nextGroup);

    // Drop demo-only caption/abbreviation leftovers when the real range loads.
    syncReportDefaultsForSource(kind);
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

  /* Turn technical Excel headers into publication-ready labels:
     Analytical_Thinking → Analytical thinking, camelCase → spaced words. */
  function humanizeLabel(raw) {
    var s = String(raw == null ? "" : raw).trim();
    if (!s) return s;
    s = s.replace(/[_\-.]+/g, " ");
    s = s.replace(/([a-z])([A-Z])/g, "$1 $2");
    s = s.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
    s = s.replace(/\s+/g, " ").trim().toLowerCase();
    s = s.charAt(0).toUpperCase() + s.slice(1);
    s = s.replace(/\b(bmi|bp|sd|smd|iqr|ldl|egfr)\b/gi, function (m) { return m.toUpperCase(); });
    return s;
  }

  function makeDefaultVarCfg(v, includeDefault) {
    var isCont = v.type === "continuous";
    var cats = isCont ? [] : defaultCategoriesFor(v);
    return {
      label: humanizeLabel(v.label),
      sourceName: v.label,
      typeOverride: "auto",
      format: isCont ? "mean-sd" : "n-percent",
      decimals: 1,
      missingRule: "inherit",
      orderText: isCont ? "" : cats.join(", "),
      categoryMeta: isCont ? null : cats.map(function (c, i) {
        return { value: c, label: String(c), include: true, order: i };
      }),
      expanded: false,
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
    /* overall-only | exclude | missing-column — how to treat rows missing the group var */
    missingGroupMode: "overall-only",
    previewZoom: 100,
    varOrder: [],
    varCfg: {},
    dataSource: null,
    excelDataset: null,
    report: {
      tableNumber: 1,
      title: "Baseline Characteristics of Study Participants",
      subtitle: "",
      notes: "",
      abbreviations: "",
      stylePreset: "clinical",
      decimals: 1,
      percentDecimals: 1,
      custom: { italicTitle: false, captionBold: true, font: "serif", density: "normal", headerStyle: "rule", pLeadingZero: false, indentEm: 1.4 }
    }
  };
  var DEMO_ABBREVIATIONS = "BMI, body mass index; BP, blood pressure; eGFR, estimated glomerular filtration rate; LDL, low-density lipoprotein; SD, standard deviation; SMD, standardized mean difference.";
  var lastAppliedDefaultTitle = state.report.title;
  var lastAppliedDefaultAbbrev = "";

  /* Populate varOrder/varCfg/VAR_DEFS_BY_KEY for the initial demo dataset;
     wireHostMessaging() may swap this out for the currently selected Excel
     range shortly after init(). */
  setDataset("demo", DEMO_DATA, DEMO_VAR_DEFS, DEMO_GROUP_VAR_DEFS, DEMO_STRAT_VAR_DEFS, DEMO_WEIGHT_VAR_DEFS);

  function pickFallbackGroupVar(preferredKey) {
    if (state.groupVar && GROUP_VAR_DEFS.some(function (g) { return g.key === state.groupVar; })) return state.groupVar;
    if (preferredKey && GROUP_VAR_DEFS.some(function (g) { return g.key === preferredKey; })) return preferredKey;
    return GROUP_VAR_DEFS.length ? GROUP_VAR_DEFS[0].key : "";
  }

  /* Abbreviations that actually appear in the current table — never the
     leftover clinical glossary from the demo dataset. */
  function buildContextAbbreviations() {
    var labelBlob = eligibleVarDefs().map(function (v) {
      return (state.varCfg[v.key] && state.varCfg[v.key].label) || v.label || "";
    }).join(" ") + " " + (state.report.title || "");
    var contFormats = {};
    eligibleVarDefs().forEach(function (v) {
      var cfg = state.varCfg[v.key];
      if (effectiveType(v, cfg) === "continuous") contFormats[cfg.format] = true;
    });
    var known = [
      { abbr: "BMI", expand: "body mass index" },
      { abbr: "BP", expand: "blood pressure" },
      { abbr: "eGFR", expand: "estimated glomerular filtration rate" },
      { abbr: "LDL", expand: "low-density lipoprotein" },
      { abbr: "IQR", expand: "interquartile range" },
      { abbr: "SD", expand: "standard deviation" },
      { abbr: "SMD", expand: "standardized mean difference" }
    ];
    var parts = [];
    known.forEach(function (item) {
      var inLabels = new RegExp("\\b" + item.abbr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(labelBlob);
      var inFormats = false;
      if (item.abbr === "SD") inFormats = !!(contFormats["mean-sd"] || contFormats["mean-sd-paren"]);
      if (item.abbr === "IQR") inFormats = !!(contFormats["median-iqr-paren"] || contFormats["median-iqr-bracket"]);
      if (item.abbr === "SMD") inFormats = !!(state.showSMD && state.groupVar);
      if (inLabels || inFormats) parts.push(item.abbr + ", " + item.expand);
    });
    return parts.length ? parts.join("; ") + "." : "";
  }

  function syncReportDefaultsForSource(kind) {
    var nextTitle = kind === "demo"
      ? (TABLE_TYPE_DEFAULTS[state.tableType] || TABLE_TYPE_DEFAULTS.table1).title
      : "Summary of Study Variables";
    if (!state.report.title || state.report.title === lastAppliedDefaultTitle) {
      state.report.title = nextTitle;
      lastAppliedDefaultTitle = nextTitle;
    }
    var nextAbbrev = kind === "demo" ? DEMO_ABBREVIATIONS : buildContextAbbreviations();
    if (!state.report.abbreviations || state.report.abbreviations === lastAppliedDefaultAbbrev || state.report.abbreviations === DEMO_ABBREVIATIONS) {
      state.report.abbreviations = nextAbbrev;
      lastAppliedDefaultAbbrev = nextAbbrev;
    }
  }

  function applyTableTypeDefaults(type) {
    var d = TABLE_TYPE_DEFAULTS[type];
    applyGroupVarSelection(d.wantsGroup ? pickFallbackGroupVar(d.preferredGroupKey) : "");
    state.showOverall = d.showOverall;
    state.showPValue = d.showPValue;
    state.showSMD = d.showSMD && countGroupLevels() === 2;
    if (!state.report.title || state.report.title === lastAppliedDefaultTitle) {
      state.report.title = state.dataSource === "excel" ? "Summary of Study Variables" : d.title;
      lastAppliedDefaultTitle = state.report.title;
    }
    if (state.dataSource === "excel") {
      var nextAbbrev = buildContextAbbreviations();
      if (!state.report.abbreviations || state.report.abbreviations === lastAppliedDefaultAbbrev || state.report.abbreviations === DEMO_ABBREVIATIONS) {
        state.report.abbreviations = nextAbbrev;
        lastAppliedDefaultAbbrev = nextAbbrev;
      }
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
  function isRoleVariable(key) {
    return !!key && (key === state.groupVar || key === state.stratVar || key === state.weightVar);
  }
  function isVariableEligible(v, cfg) {
    if (!cfg || !cfg.include) return false;
    // Group / strat / weight columns belong in the table structure, not as body rows
    // (unless the user explicitly re-includes the group variable as a row).
    if (v.key === state.groupVar && !cfg.forceIncludeGroupRow) return false;
    if (v.key === state.stratVar || v.key === state.weightVar) return false;
    if (state.tableType === "frequency" && effectiveType(v, cfg) === "continuous") return false;
    return true;
  }
  function eligibleVarDefs() { return orderedVarDefs().filter(function (v) { return isVariableEligible(v, state.varCfg[v.key]); }); }

  function ensureCategoryMeta(v, cfg) {
    if (cfg.categoryMeta && cfg.categoryMeta.length) return cfg.categoryMeta;
    var cats = defaultCategoriesFor(v);
    cfg.categoryMeta = cats.map(function (c, i) {
      return { value: String(c), label: String(c), include: true, order: i };
    });
    return cfg.categoryMeta;
  }

  /* Returns [{ value, label }] for included categories in display order. */
  function categoriesFor(v, cfg) {
    var effType = effectiveType(v, cfg);
    if (effType === "continuous") return null;
    var meta = ensureCategoryMeta(v, cfg).slice().sort(function (a, b) { return a.order - b.order; });
    return meta.filter(function (m) { return m.include !== false; });
  }

  function groupAvailability() {
    if (!state.groupVar) return { total: ACTIVE_DATA.length, valid: ACTIVE_DATA.length, missing: 0 };
    var valid = 0, missing = 0;
    ACTIVE_DATA.forEach(function (r) {
      if (isMissing(r[state.groupVar])) missing++; else valid++;
    });
    return { total: ACTIVE_DATA.length, valid: valid, missing: missing };
  }

  function applyGroupVarSelection(newKey) {
    var prev = state.groupVar;
    if (prev && state.varCfg[prev] && state.varCfg[prev]._autoExcludedForGroup) {
      state.varCfg[prev].include = true;
      state.varCfg[prev].forceIncludeGroupRow = false;
      delete state.varCfg[prev]._autoExcludedForGroup;
    }
    state.groupVar = newKey || "";
    if (state.groupVar && state.varCfg[state.groupVar]) {
      var cfg = state.varCfg[state.groupVar];
      if (cfg.include && !cfg.forceIncludeGroupRow) {
        cfg.include = false;
        cfg._autoExcludedForGroup = true;
      }
    }
    // SMD is only meaningful for two-group comparisons in v1
    if (countGroupLevels() !== 2) state.showSMD = false;
  }

  function getWorkingRows() {
    var rows = ACTIVE_DATA;
    if (state.groupVar && state.missingGroupMode === "exclude") {
      rows = rows.filter(function (r) { return !isMissing(r[state.groupVar]); });
    }
    if (state.completeCase) {
      var required = eligibleVarDefs().map(function (v) { return v.key; });
      if (state.groupVar && state.missingGroupMode !== "overall-only") required.push(state.groupVar);
      if (state.stratVar) required.push(state.stratVar);
      rows = rows.filter(function (r) { return required.every(function (k) { return !isMissing(r[k]); }); });
    }
    return rows;
  }

  /* Group columns follow the group variable's category editor (Include /
     Display label / Order). Unchecked levels are omitted as columns; those
     rows still contribute to Overall when that column is shown. */
  function groupLevelsForColumns() {
    if (!state.groupVar) return [];
    var gdef = GROUP_VAR_DEFS.filter(function (g) { return g.key === state.groupVar; })[0];
    if (!gdef) return [];
    var cfg = state.varCfg[state.groupVar];
    var v = VAR_DEFS_BY_KEY[state.groupVar];
    if (cfg && v) {
      var meta = ensureCategoryMeta(v, cfg).slice().sort(function (a, b) { return a.order - b.order; });
      var included = meta.filter(function (m) { return m.include !== false; });
      if (included.length) {
        return included.map(function (m) {
          return { key: String(m.value), label: String(m.label != null && m.label !== "" ? m.label : m.value) };
        });
      }
    }
    return (gdef.categories || []).map(function (lv) {
      return { key: String(lv), label: String(lv) };
    });
  }

  function getColumns() {
    var cols = [];
    if (state.showOverall || !state.groupVar) cols.push({ key: "__overall__", label: "Overall" });
    if (state.groupVar) {
      groupLevelsForColumns().forEach(function (lv) {
        cols.push({ key: lv.key, label: lv.label, isGroup: true });
      });
      if (state.missingGroupMode === "missing-column" && groupAvailability().missing > 0) {
        cols.push({ key: "__missing_group__", label: "Missing group", isGroup: true, isMissingGroup: true });
      }
    }
    return cols;
  }
  function rowsForColumn(baseRows, col) {
    if (col.key === "__overall__") return baseRows;
    if (col.key === "__missing_group__") {
      return baseRows.filter(function (r) { return isMissing(r[state.groupVar]); });
    }
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
      var groupCols = columns.filter(function (c) { return c.isGroup && !c.isMissingGroup; });
      var groupsVals = groupCols.map(function (col) {
        return rowsForColumn(baseRows, col).map(function (r) { return r[v.key]; }).filter(function (x) { return !isMissing(x); }).map(Number);
      });
      var validGroups = groupsVals.filter(function (g) { return g.length >= 2; });
      if (validGroups.length >= 2) {
        if (validGroups.length === 2) {
          test = welchTTest(validGroups[0], validGroups[1]);
          if (state.showSMD) smd = continuousSMD(validGroups[0], validGroups[1]);
        } else {
          test = anovaFTest(validGroups);
          // Multi-group SMD is disabled in v1 (ambiguous single number).
        }
      }
    }
    return { type: "continuous", varKey: v.key, label: cfg.label, cells: cells, test: test, smd: smd };
  }

  function buildCategoricalRow(v, cfg, baseRows, columns) {
    var cats = categoriesFor(v, cfg) || [];
    var pdecimals = cfg.decimals;
    var counts = {}; cats.forEach(function (c) { counts[c.value] = {}; });
    var colTotalN = {}, colValidN = {}, colMissing = {};
    columns.forEach(function (col) {
      var subRows = rowsForColumn(baseRows, col);
      var totalW = 0, validW = 0, missW = 0;
      var local = {}; cats.forEach(function (c) { local[c.value] = 0; });
      subRows.forEach(function (r) {
        var w = state.weightVar ? (Number(r[state.weightVar]) || 0) : 1;
        totalW += w;
        var val = r[v.key];
        if (isMissing(val)) { missW += w; return; }
        var sval = String(val);
        if (!(sval in local)) return;
        local[sval] += w; validW += w;
      });
      cats.forEach(function (c) { counts[c.value][col.key] = local[c.value]; });
      colTotalN[col.key] = totalW; colValidN[col.key] = validW; colMissing[col.key] = missW;
    });

    var effectiveMissingRule = cfg.missingRule === "inherit"
      ? (state.showMissingCategory ? "category" : "exclude")
      : cfg.missingRule;
    var anyMissing = columns.some(function (col) { return colMissing[col.key] > 0; });
    var showMissingRow = effectiveMissingRule === "category" && !state.completeCase && anyMissing;

    var groupCols = columns.filter(function (c) { return c.isGroup && !c.isMissingGroup; });
    function cellFor(catValue, col) {
      var n = counts[catValue][col.key];
      var colN = colTotalN[col.key], validN = colValidN[col.key];
      var rowTotal = groupCols.length ? groupCols.reduce(function (s, c) { return s + counts[catValue][c.key]; }, 0) : colN;
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

    var categoryRows = cats.map(function (cat) {
      return { catLabel: cat.label, cells: columns.map(function (col) { return cellFor(cat.value, col); }) };
    });
    if (showMissingRow) {
      categoryRows.push({ catLabel: state.missingLabel || "Missing", cells: columns.map(function (col) { return String(colMissing[col.key]); }) });
    }

    var test = null, smd = null;
    if (state.groupVar && groupCols.length >= 2) {
      var table = cats.map(function (cat) { return groupCols.map(function (col) { return counts[cat.value][col.key]; }); });
      test = chiSquareTest(table);
      if (state.showSMD && groupCols.length === 2) {
        var cA = cats.map(function (cat) { return counts[cat.value][groupCols[0].key]; });
        var cB = cats.map(function (cat) { return counts[cat.value][groupCols[1].key]; });
        smd = categoricalSMD(cA, cB);
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

  function countGroupLevels() { return getColumns().filter(function (c) { return c.isGroup && !c.isMissingGroup; }).length; }

  /* ═══════════════════════════ 7. HTML / TEXT RENDERING ═══════════════════════════ */

  function autoNoteText() {
    var contFormats = {}, catFormats = {};
    var hasContinuous = false, hasCategorical = false;
    eligibleVarDefs().forEach(function (v) {
      var cfg = state.varCfg[v.key], t = effectiveType(v, cfg);
      if (t === "continuous") { hasContinuous = true; contFormats[cfg.format] = true; }
      else { hasCategorical = true; catFormats[cfg.format] = true; }
    });
    var cParts = [];
    if (contFormats["mean-sd"] || contFormats["mean-sd-paren"]) cParts.push("mean \u00B1 SD");
    if (contFormats["median-iqr-paren"] || contFormats["median-iqr-bracket"]) cParts.push("median (IQR)");
    if (contFormats["median-minmax"] || contFormats.range) cParts.push("median (range)");
    var pieces = [];
    if (hasContinuous && cParts.length) pieces.push("Continuous variables are presented as " + cParts.join(" or ") + ".");
    if (hasCategorical) pieces.push("Categorical variables are presented as n (%) unless otherwise noted.");
    if (state.groupVar && state.showPValue && (hasContinuous || hasCategorical)) {
      var levels = countGroupLevels();
      if (levels >= 2) {
        if (hasContinuous && hasCategorical) {
          pieces.push(levels === 2
            ? "Group comparisons used Welch's t-test for continuous variables and the chi-square test for categorical variables."
            : "Group comparisons used one-way ANOVA for continuous variables and the chi-square test for categorical variables.");
        } else if (hasContinuous) {
          pieces.push(levels === 2
            ? "Group comparisons used Welch's t-test."
            : "Group comparisons used one-way ANOVA.");
        } else {
          pieces.push("Group comparisons used the chi-square test.");
        }
        if (state.showSMD) {
          pieces.push("SMD = standardized mean difference" + (levels > 2 ? " (maximum pairwise value shown)" : "") + "; values above 0.1 suggest meaningful imbalance.");
        }
      }
    }
    if (state.weightVar) pieces.push("Estimates are weighted; unweighted N is shown in each column header.");
    if (state.completeCase) pieces.push("Analysis restricted to a common sample with complete data on all displayed variables.");
    if (state.groupVar) {
      var avail = groupAvailability();
      if (avail.missing > 0) {
        if (state.missingGroupMode === "exclude") {
          pieces.push("Records missing the group variable (n=" + avail.missing + ") were excluded from the table.");
        } else if (state.missingGroupMode === "missing-column") {
          pieces.push("Group variable available for " + avail.valid + " of " + avail.total + " records; missing group shown as its own column.");
        } else {
          pieces.push("Group variable available for " + avail.valid + " of " + avail.total + " records; " + avail.missing + " records are included in Overall only.");
        }
      }
    }
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
    var rowPad = sp.density === "compact" ? "5px 10px" : "8px 12px";
    var fontSize = sp.density === "compact" ? "12.5px" : "14px";
    var headerBorderBottom = sp.headerStyle === "rule" ? "border-bottom:1.5px solid #111;" : "";
    var headerBg = sp.headerStyle === "shade" ? "background:#f0f0f0;" : "";

    var html = '<div style="font-family:' + sp.font + ';color:#111;">';
    html += '<div style="font-weight:' + (sp.captionBold ? "700" : "400") + ';font-size:13px;margin-bottom:2px;letter-spacing:.01em;">Table ' + esc(state.report.tableNumber) + ".</div>";
    html += '<div style="font-size:15px;margin-bottom:6px;font-weight:600;' + (sp.italicTitle ? "font-style:italic;font-weight:500;" : "") + '">' + esc(state.report.title) + "</div>";
    html += state.report.subtitle
      ? '<div style="font-size:12.5px;color:#444;margin-bottom:12px;">' + esc(state.report.subtitle) + "</div>"
      : '<div style="margin-bottom:12px;"></div>';

    var model2 = model || buildModel();
    model2.strata.forEach(function (stratum, sIdx) {
      if (stratum.label) html += '<div style="font-weight:700;font-size:12.5px;margin:' + (sIdx > 0 ? "16px" : "0") + ' 0 6px;">' + esc(stratum.label) + "</div>";
      html += renderBlockTable(stratum.block, sp, rowPad, fontSize, headerBorderBottom, headerBg);
    });

    var noteLines = [state.report.notes ? state.report.notes : autoNoteText()];
    if (state.report.abbreviations) noteLines.push(state.report.abbreviations);
    html += '<div class="pt2-footnote" style="font-size:11px;margin-top:12px;line-height:1.55;color:#333;padding-left:1.2em;text-indent:-1.2em;">' +
      noteLines.map(esc).join("<br>") + "</div>";
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
      var rows = Array.prototype.slice.call(body.querySelectorAll("tr[data-var-key]"));
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r === tr) continue;
        var rect = r.getBoundingClientRect();
        if (e.clientY < rect.top || e.clientY > rect.bottom) continue;
        var before = e.clientY < (rect.top + rect.height / 2);
        // Keep any expanded detail row glued under its parent variable row.
        var expand = body.querySelector('tr.pt2-expand-row[data-expand-for="' + tr.dataset.varKey + '"]');
        body.insertBefore(tr, before ? r : r.nextSibling);
        if (expand) body.insertBefore(expand, tr.nextSibling);
        break;
      }
    });

    function endDrag(e) {
      if (!pointerDrag || (e && e.pointerId !== pointerDrag.pointerId)) return;
      pointerDrag.tr.classList.remove("pt2-dragging");
      document.body.classList.remove("pt2-noselect");
      try { pointerDrag.handle.releasePointerCapture(pointerDrag.pointerId); } catch (err) {}
      var newOrder = Array.prototype.slice.call(body.querySelectorAll("tr[data-var-key]")).map(function (r) { return r.dataset.varKey; });
      pointerDrag = null;
      if (newOrder.length === state.varOrder.length) state.varOrder = newOrder;
      renderAll();
    }
    body.addEventListener("pointerup", endDrag);
    body.addEventListener("pointercancel", endDrag);
  }

  var catEditKey = null;

  function formatLabelFor(formatCode, formats) {
    for (var i = 0; i < formats.length; i++) if (formats[i].value === formatCode) return formats[i].label;
    return formatCode;
  }

  function openCategoryEditor(varKey) {
    var v = VAR_DEFS_BY_KEY[varKey];
    var cfg = state.varCfg[varKey];
    if (!v || !cfg) return;
    catEditKey = varKey;
    var meta = ensureCategoryMeta(v, cfg).slice().sort(function (a, b) { return a.order - b.order; });
    var body = $("pt2CatEditBody");
    body.innerHTML = "";
    $("pt2CatEditTitle").textContent = "Edit categories — " + (cfg.label || v.label);
    meta.forEach(function (m, idx) {
      var tr = document.createElement("tr");
      tr.dataset.idx = String(idx);
      tr.innerHTML =
        '<td><input type="checkbox" class="pt2-cat-inc"' + (m.include !== false ? " checked" : "") + " /></td>" +
        "<td><code>" + esc(m.value) + "</code></td>" +
        '<td><input type="text" class="pt2-cat-label" value="' + esc(m.label) + '" /></td>' +
        '<td><span class="pt2-cat-move">' +
        '<button type="button" class="pt2-cfg-btn pt2-cat-up" title="Move up"><i class="fa-solid fa-caret-up"></i></button>' +
        '<button type="button" class="pt2-cfg-btn pt2-cat-down" title="Move down"><i class="fa-solid fa-caret-down"></i></button>' +
        "</span></td>";
      body.appendChild(tr);
    });
    body.querySelectorAll(".pt2-cat-up").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tr = btn.closest("tr");
        if (tr && tr.previousElementSibling) body.insertBefore(tr, tr.previousElementSibling);
      });
    });
    body.querySelectorAll(".pt2-cat-down").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tr = btn.closest("tr");
        if (tr && tr.nextElementSibling) body.insertBefore(tr.nextElementSibling, tr);
      });
    });
    $("pt2CatEditOverlay").classList.add("open");
  }

  function applyCategoryEditor() {
    if (!catEditKey) return;
    var cfg = state.varCfg[catEditKey];
    var v = VAR_DEFS_BY_KEY[catEditKey];
    if (!cfg || !v) return;
    var rows = Array.prototype.slice.call($("pt2CatEditBody").children);
    cfg.categoryMeta = rows.map(function (tr, i) {
      var valueCell = tr.querySelector("code");
      return {
        value: valueCell ? valueCell.textContent : "",
        label: (tr.querySelector(".pt2-cat-label") || {}).value || "",
        include: !!(tr.querySelector(".pt2-cat-inc") || {}).checked,
        order: i
      };
    });
    cfg.orderText = cfg.categoryMeta.filter(function (m) { return m.include; }).map(function (m) { return m.label; }).join(", ");
    $("pt2CatEditOverlay").classList.remove("open");
    catEditKey = null;
    renderAll();
  }

  function renderVarGrid() {
    var body = $("pt2VarGridBody");
    body.innerHTML = "";
    $("pt2FreqHint").style.display = state.tableType === "frequency" ? "" : "none";
    var tableRowCounter = 0;
    orderedVarDefs().forEach(function (v) {
      var cfg = state.varCfg[v.key];
      if (!cfg) return;
      var effType = effectiveType(v, cfg);
      var disabledForType = state.tableType === "frequency" && effType === "continuous";
      var isCatLike = effType !== "continuous";
      var formats = effType === "continuous" ? CONTINUOUS_FORMATS : CATEGORICAL_FORMATS;
      var willAppearInTable = isVariableEligible(v, cfg);
      if (willAppearInTable) tableRowCounter += 1;
      var isGroupRow = v.key === state.groupVar;

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
      var handle = document.createElement("span");
      handle.className = "pt2-drag-handle";
      handle.title = "Drag to reorder";
      handle.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
      dragCell.appendChild(orderNum);
      dragCell.appendChild(handle);
      tdDrag.appendChild(dragCell);
      tr.appendChild(tdDrag);

      var tdInclude = document.createElement("td");
      var chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = isGroupRow ? !!cfg.forceIncludeGroupRow : !!cfg.include;
      chk.title = isGroupRow
        ? "Group variable is omitted from the table body by default. Check to include it as a row anyway."
        : "Include in the published table";
      chk.addEventListener("change", function () {
        if (isGroupRow) {
          cfg.forceIncludeGroupRow = chk.checked;
          cfg.include = chk.checked;
          delete cfg._autoExcludedForGroup;
        } else {
          cfg.include = chk.checked;
        }
        renderAll();
      });
      tdInclude.appendChild(chk);
      tr.appendChild(tdInclude);

      var tdVar = document.createElement("td");
      var labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = cfg.label;
      labelInput.title = cfg.sourceName && cfg.sourceName !== cfg.label ? ("Original: " + cfg.sourceName) : "";
      labelInput.addEventListener("input", function () { cfg.label = labelInput.value; renderPreview(); });
      tdVar.appendChild(labelInput);
      if (isGroupRow) {
        var tag = document.createElement("span");
        tag.className = "pt2-role-tag";
        tag.textContent = "group";
        tdVar.appendChild(tag);
      }
      tr.appendChild(tdVar);

      var tdSummary = document.createElement("td");
      var summary = document.createElement("div");
      summary.className = "pt2-var-summary";
      summary.innerHTML = '<span class="pt2-type-badge pt2-type-' + esc(v.type) + '">' + esc(v.type) + "</span> · <strong>" +
        esc(formatLabelFor(cfg.format, formats)) + "</strong> · " + esc(String(cfg.decimals)) + " decimal" + (cfg.decimals === 1 ? "" : "s");
      tdSummary.appendChild(summary);
      tr.appendChild(tdSummary);

      var tdCfg = document.createElement("td");
      var cfgBtn = document.createElement("button");
      cfgBtn.type = "button";
      cfgBtn.className = "pt2-cfg-btn" + (cfg.expanded ? " open" : "");
      cfgBtn.textContent = cfg.expanded ? "Hide" : "Configure";
      cfgBtn.addEventListener("click", function () { cfg.expanded = !cfg.expanded; renderVarGrid(); });
      tdCfg.appendChild(cfgBtn);
      tr.appendChild(tdCfg);
      body.appendChild(tr);

      if (cfg.expanded) {
        var exp = document.createElement("tr");
        exp.className = "pt2-expand-row";
        exp.dataset.expandFor = v.key;
        var expTd = document.createElement("td");
        expTd.colSpan = 5;
        var grid = document.createElement("div");
        grid.className = "pt2-expand-grid";

        function field(label, node) {
          var wrap = document.createElement("div");
          var lab = document.createElement("label");
          lab.className = "cfg-label";
          lab.textContent = label;
          wrap.appendChild(lab);
          wrap.appendChild(node);
          grid.appendChild(wrap);
        }

        var overrideSel = document.createElement("select");
        overrideSel.className = "cfg-select";
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
            if (!nowContinuous) ensureCategoryMeta(v, cfg);
          }
          renderAll();
        });
        field("Type override", overrideSel);

        var formatSel = document.createElement("select");
        formatSel.className = "cfg-select";
        formats.forEach(function (f) {
          var o = document.createElement("option"); o.value = f.value; o.textContent = f.label;
          if (cfg.format === f.value) o.selected = true;
          formatSel.appendChild(o);
        });
        formatSel.addEventListener("change", function () { cfg.format = formatSel.value; renderAll(); });
        field("Summary format", formatSel);

        var decInput = document.createElement("input");
        decInput.className = "cfg-input";
        decInput.type = "number"; decInput.min = "0"; decInput.max = "6"; decInput.value = cfg.decimals;
        decInput.addEventListener("input", function () { cfg.decimals = parseInt(decInput.value, 10) || 0; renderPreview(); renderVarGrid(); });
        field("Decimals", decInput);

        var missSel = document.createElement("select");
        missSel.className = "cfg-select";
        [["inherit", "Use global setting"], ["category", "Show as category"], ["exclude", "Exclude"]].forEach(function (pair) {
          var o = document.createElement("option"); o.value = pair[0]; o.textContent = pair[1];
          if (cfg.missingRule === pair[0]) o.selected = true;
          missSel.appendChild(o);
        });
        missSel.addEventListener("change", function () { cfg.missingRule = missSel.value; renderPreview(); });
        field("Missing rule", missSel);

        if (isCatLike) {
          var catBtn = document.createElement("button");
          catBtn.type = "button";
          catBtn.className = "pt2-cfg-btn";
          var nCats = ensureCategoryMeta(v, cfg).filter(function (m) { return m.include !== false; }).length;
          catBtn.innerHTML = '<i class="fa-solid fa-list-ol"></i> Edit categories (' + nCats + ")";
          catBtn.addEventListener("click", function () { openCategoryEditor(v.key); });
          field("Categories", catBtn);
        }

        if (cfg.sourceName) {
          var src = document.createElement("div");
          src.className = "cfg-hint";
          src.textContent = "Excel name: " + cfg.sourceName;
          grid.appendChild(src);
        }

        expTd.appendChild(grid);
        exp.appendChild(expTd);
        body.appendChild(exp);
      }
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
    var gDef = state.groupVar ? GROUP_VAR_DEFS.filter(function (g) { return g.key === state.groupVar; })[0] : null;
    var sDef = state.stratVar ? STRAT_VAR_DEFS.filter(function (s) { return s.key === state.stratVar; })[0] : null;
    chip.textContent = sourceLabel() + " · N=" + ACTIVE_DATA.length + " · " + eligibleVarDefs().length + " variable(s) summarized" +
      (gDef ? " · grouped by " + gDef.label : "") +
      (sDef ? " · stratified by " + sDef.label : "");

    var existingPaper = wrap.querySelector(".pt2-paper");
    if (!existingPaper) { existingPaper = document.createElement("div"); existingPaper.className = "pt2-paper"; wrap.appendChild(existingPaper); }

    if (!eligibleVarDefs().length) {
      existingPaper.innerHTML = '<div class="pt2-error">No variables are currently included in this table. Go to the Build tab and include at least one variable.</div>';
      applyPreviewZoom();
      return;
    }
    existingPaper.innerHTML = renderModelHtml(model);
    applyPreviewZoom();
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
        var df = "\u2014";
        if (row.test && row.test.df != null) {
          df = typeof row.test.df === "number" ? fmtNum(row.test.df, 2) : String(row.test.df);
        }
        var p = row.test ? fmtP(row.test.p, { pLeadingZero: true }) : "\u2014";
        var testName = row.test ? row.test.name : "\u2014";
        var smd = row.smd != null && isFinite(row.smd) ? Math.abs(row.smd).toFixed(2) : "\u2014";
        tr.innerHTML = "<td>" + esc(label) + "</td><td>" + esc(row.type) + "</td><td>" + esc(testName) + "</td><td>" + esc(stat) + "</td><td>" + esc(df) + "</td><td>" + esc(p) + "</td><td>" + esc(smd) + "</td>";
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

  function sourceLabel() {
    if (state.dataSource === "excel" && state.excelDataset) {
      return "Your Excel data" + (state.excelDataset.address ? " (" + state.excelDataset.address + ")" : "");
    }
    return "Demo dataset";
  }

  function refreshDefaultAbbreviations() {
    if (state.dataSource !== "excel") return;
    if (state.report.abbreviations && state.report.abbreviations !== lastAppliedDefaultAbbrev && state.report.abbreviations !== DEMO_ABBREVIATIONS) return;
    var next = buildContextAbbreviations();
    if (next !== state.report.abbreviations) {
      state.report.abbreviations = next;
      lastAppliedDefaultAbbrev = next;
      var el = $("pt2Abbrev");
      if (el) el.value = next;
    }
  }

  function renderAll() {
    refreshDefaultAbbreviations();
    syncStructureHints();
    renderVarGrid();
    renderPreview();
    if (state.tab === "details") renderDetails();
    var badge = $("pt2SourceBadge");
    if (badge) badge.textContent = sourceLabel() + " \u00B7 N=" + ACTIVE_DATA.length;
  }

  function syncStructureHints() {
    var levels = countGroupLevels();
    var smdEl = $("pt2ShowSMD");
    var smdHint = $("pt2SmdHint");
    var smdAllowed = !!state.groupVar && levels === 2;
    if (smdEl) {
      smdEl.disabled = !smdAllowed;
      if (!smdAllowed) { state.showSMD = false; smdEl.checked = false; }
    }
    if (smdHint) smdHint.style.display = state.groupVar && levels !== 2 ? "" : "none";

    var pEl = $("pt2ShowPValue");
    if (pEl) pEl.disabled = !state.groupVar || levels < 2;

    var warn = $("pt2GroupWarn");
    if (warn) {
      if (state.groupVar && state.varCfg[state.groupVar] && !state.varCfg[state.groupVar].forceIncludeGroupRow) {
        var gLabel = (GROUP_VAR_DEFS.filter(function (g) { return g.key === state.groupVar; })[0] || {}).label || state.groupVar;
        warn.style.display = "";
        warn.textContent = gLabel + " is used as the group variable and has been removed from the table body.";
      } else {
        warn.style.display = "none";
      }
    }

    var mgBlock = $("pt2MissingGroupBlock");
    var mgHint = $("pt2MissingGroupHint");
    var mgMode = $("pt2MissingGroupMode");
    if (mgBlock && mgMode) {
      var avail = groupAvailability();
      var showMg = !!state.groupVar && avail.missing > 0;
      mgBlock.style.display = showMg ? "" : "none";
      mgMode.value = state.missingGroupMode;
      if (mgHint && showMg) {
        mgHint.textContent = "Group variable available for " + avail.valid + " of " + avail.total +
          " records; " + avail.missing + " records are missing the group value.";
      }
    }
  }

  function applyPreviewZoom() {
    var wrap = $("pt2PaperWrap");
    var paper = wrap && wrap.querySelector(".pt2-paper");
    if (!wrap || !paper) return;
    var zoom = state.previewZoom;
    wrap.classList.toggle("fit-width", zoom === "fit");
    /* CSS zoom, not transform: scale — a transformed paper keeps its unscaled
       layout box, so 125% was clipped on both sides with nothing to scroll to
       and 75% left a dead gap below the table. */
    paper.style.transform = "";
    if (zoom === "fit") {
      paper.style.zoom = "";
      paper.style.width = "100%";
      paper.style.maxWidth = "none";
    } else {
      paper.style.maxWidth = "";
      paper.style.width = "";
      paper.style.zoom = Number(zoom) / 100;
    }
    document.querySelectorAll(".pt2-zoom-bar [data-zoom]").forEach(function (btn) {
      btn.classList.toggle("active", String(btn.getAttribute("data-zoom")) === String(zoom));
    });
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
    syncStructureHints();

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

  function helpItem(title, bodyHtml) {
    return '<div class="pt2-help-item"><h4>' + title + "</h4><p>" + bodyHtml + "</p></div>";
  }

  var PANEL_HELP = {
    "table-type": {
      title: "Table Type",
      icon: "fa-shapes",
      html:
        helpItem("Descriptive Summary",
          "A single-column overview of every selected variable — no grouping or comparison. Continuous variables show a summary statistic (mean \u00B1 SD, median, etc.); categorical variables show category counts and percentages.") +
        helpItem("Frequency Distribution",
          "Counts and percentages for categorical / ordinal / binary variables only. Continuous variables are hidden unless you override their type in Configure.") +
        helpItem("Baseline Characteristics — Table 1",
          "The classic clinical Table 1: an Overall column plus one column per group level, with optional P values and standardized differences (SMD) to describe balance between groups.") +
        helpItem("Group Comparison",
          "Like Table 1, but focused on between-group differences — Overall is off by default so attention stays on how groups differ.") +
        helpItem("Switching types",
          "Changing the table type resets grouping / comparison defaults (group variable, Overall, P value, SMD). Your per-variable settings (include, labels, formats) are kept.")
    },
    structure: {
      title: "Structure",
      icon: "fa-diagram-project",
      html:
        helpItem("Group variable",
          "Splits the table into columns — one for each included level of this categorical variable (e.g. treatment arm, sex). Use <strong>Edit categories</strong> on that variable to hide a level (uncheck Include) or rename column headers. The group variable is automatically removed from the table body; you can override that in the Variables list.") +
        helpItem("Stratification variable",
          "Optional second split. When set, the table is repeated within each stratum (e.g. Region: North, Region: South), each with its own block of columns.") +
        helpItem("Weight variable",
          "Optional sampling or analysis weight. Continuous summaries become weighted means / medians; categorical percentages use weighted counts. Column headers still show the unweighted N.") +
        helpItem("Show Overall column",
          "Adds a combined column across all groups. Usually on for Table 1; often off for Group Comparison.") +
        helpItem("Show P value column",
          "Adds a column with the automatic group test for each row. Available when at least two valid group levels exist. Continuous variables use Welch\u2019s t-test (2 groups) or one-way ANOVA (3+); categorical variables use the chi-square test.") +
        helpItem("Show standardized difference (SMD)",
          "Adds an absolute standardized mean difference column. Enabled only for two-group comparisons in this version (multi-group SMD is ambiguous as a single number). Values above about 0.1 often suggest meaningful imbalance.")
    },
    missing: {
      title: "Missing Data",
      icon: "fa-circle-question",
      html:
        helpItem("Use a common analysis sample for all rows",
          "When on, any record missing at least one displayed variable is dropped from the whole table, so every row shares the same N. When off (default), each row uses all observations available for that variable — the usual approach for Table 1.") +
        helpItem("Show \"Missing\" as its own category",
          "Default rule for categorical variables: if any values are blank, a Missing row is added under that variable. Per-variable Configure can override this (inherit / show as category / exclude).") +
        helpItem("Missing-category label",
          "The text used for that Missing row (default: Missing). Change it for another language or journal style.") +
        helpItem("Records missing the group variable",
          "Appears only when some rows lack the group value. <strong>Include in Overall only</strong> (default) keeps them in Overall but out of group columns. <strong>Exclude from the entire table</strong> drops them everywhere. <strong>Add a Missing group column</strong> shows them as their own column. The preview note reports how many records were affected.")
    },
    variables: {
      title: "Variables to Summarize",
      icon: "fa-list-check",
      html:
        helpItem("Row order (# and drag handle)",
          "The number is the row position in the published table. Drag the grip handle to reorder. Variables that are not included show an em dash instead of a number.") +
        helpItem("Include",
          "Checked variables appear in the table. The group / stratification / weight variables are omitted from the body by default; for the group variable you can re-check Include to force it back in as a row.") +
        helpItem("Variable (display label)",
          "Editable publication label. Excel names like Analytical_Thinking are cleaned automatically to Analytical thinking. Hover the field to see the original column name.") +
        helpItem("Summary",
          "Shows detected type, current summary format, and decimals at a glance.") +
        helpItem("Configure",
          "Opens advanced settings for that variable: <strong>Type override</strong> (force continuous / categorical / ordinal / binary), <strong>Summary format</strong> (Mean \u00B1 SD, Median (Q1, Q3), n (%), etc.), <strong>Decimals</strong>, <strong>Missing rule</strong>, and for categorical variables an <strong>Edit categories</strong> dialog to rename, reorder, or hide levels.") +
        helpItem("Category editor",
          "Each level has: Include (hide empty or unwanted levels), Original value (linked to the data), Display label (what readers see), and Order (up / down). When the variable is also the group variable, Include controls which group columns appear in the table (not only body-row categories).")
    },
    caption: {
      title: "Caption &amp; Notes",
      icon: "fa-heading",
      html:
        helpItem("Table number",
          "Printed as \u201CTable N.\u201D above the title. Use the same numbering as your manuscript.") +
        helpItem("Title",
          "Main caption under the table number. Switching table type may refresh the default title if you have not customized it.") +
        helpItem("Subtitle",
          "Optional second line (population, time point, or data source).") +
        helpItem("Notes",
          "Footnote under the table. Leave blank to use the auto-generated methods note (summary formats, tests, missing-group handling, N). Type your own text to replace it entirely.") +
        helpItem("Abbreviations",
          "Second footnote line for expansions (SD, SMD, BMI, \u2026). With Excel data this is built from terms that actually appear in the table; edit freely for your journal.")
    },
    style: {
      title: "Style &amp; Formatting",
      icon: "fa-swatchbook",
      html:
        helpItem("Style preset",
          "<strong>Clinical Table 1</strong> — Times, bold caption, horizontal rules. <strong>APA descriptive</strong> — italic title. <strong>Journal minimal</strong> — shaded header, leading zero in p-values. <strong>Compact report</strong> — denser Arial layout. <strong>Custom</strong> — unlocks the extra options below.") +
        helpItem("Default decimals / % decimals",
          "Defaults for continuous values and percentages. Click <strong>Apply to all variables</strong> to push these into every variable\u2019s Decimals setting; individual Configure values can still differ afterward.") +
        helpItem("Custom options",
          "Italic title, bold caption label, leading zero in p-values (0.05 vs .05), serif vs sans font, row density, and header style (rule vs shaded).") +
        helpItem("Preview zoom",
          "Use 75% / 100% / 125% / Fit width above the manuscript page to inspect wide grouped tables.")
    },
    export: {
      title: "Copy &amp; Export",
      icon: "fa-share-nodes",
      html:
        helpItem("Copy as Text",
          "Tab-delimited plain text for Excel, text editors, or unformatted paste.") +
        helpItem("Copy Formatted Table",
          "Formatted HTML table placed on the clipboard for rich paste into Word, Outlook, or Google Docs — this is usually what you want for the manuscript.") +
        helpItem("Copy as HTML",
          "Raw HTML source as plain text, for embedding in a webpage or inspecting markup.") +
        helpItem("View as HTML table",
          "Opens a full viewer of the table as styled HTML. Choose a theme (Manuscript, Journal, Compact, Striped, Slate), then Copy, Download HTML, Print, or export to Word from that view.") +
        helpItem("Export Word Document",
          "Downloads a Word-compatible .doc file wrapping the HTML table. For final production many journals still prefer Copy Formatted Table into a native Word table.")
    },
    methods: {
      title: "Methods",
      icon: "fa-book-open",
      html:
        helpItem("What this panel shows",
          "A prose summary of the analysis decisions currently driving the table: how continuous and categorical variables are presented, which tests are used, weighting, missing-data policy, and N. It updates live as you change Build options.") +
        helpItem("How to use it",
          "Copy into your manuscript Methods or table footnote, or leave the Preview Notes field blank so a similar auto-note is printed under the table.")
    },
    audit: {
      title: "Per-Variable Test Audit",
      icon: "fa-flask",
      html:
        helpItem("Purpose",
          "A diagnostic view of every summarized row: the type used, the test name, the test statistic, degrees of freedom, P value, and SMD (when applicable). Use it to verify that automatic test selection matches your analysis plan.") +
        helpItem("Reading the columns",
          "<strong>Statistic</strong> is t, F, or \u03C7\u00B2 depending on the test. <strong>df</strong> is Welch\u2019s approximate degrees of freedom (2 decimals), ANOVA df as \u201Cbetween, within\u201D, or chi-square df. <strong>SMD</strong> is blank when not shown or not defined (e.g. more than two groups).")
    },
    dictionary: {
      title: "Data Dictionary",
      icon: "fa-database",
      html:
        helpItem("Purpose",
          "Lists every column available from the current dataset (Excel range or demo), its role in the table, detected type, and categories or numeric range.") +
        helpItem("Roles",
          "<strong>Summarized</strong> — included in the table body. <strong>Available (not summarized)</strong> — present in the data but unchecked. <strong>Group / stratification / weight variable</strong> — used in Structure rather than as a body row.")
    }
  };

  function wirePanelHelp() {
    var overlay = $("pt2PanelHelpOverlay");
    var titleEl = $("pt2PanelHelpTitle");
    var bodyEl = $("pt2PanelHelpBody");
    var iconEl = $("pt2PanelHelpIcon");
    var closeBtn = $("pt2PanelHelpCloseBtn");
    if (!overlay || !bodyEl) return;
    function close() { overlay.classList.remove("open"); }
    function openTopic(topic) {
      var help = PANEL_HELP[topic];
      if (!help) return;
      titleEl.textContent = help.title;
      bodyEl.innerHTML = help.html;
      if (iconEl) iconEl.className = "fa-solid " + (help.icon || "fa-circle-info");
      overlay.classList.add("open");
    }
    document.querySelectorAll(".pt2-help-btn[data-help]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openTopic(btn.getAttribute("data-help"));
      });
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  function wireCategoryEditor() {
    var overlay = $("pt2CatEditOverlay");
    if (!overlay) return;
    function close() { overlay.classList.remove("open"); catEditKey = null; }
    $("pt2CatEditCloseBtn").addEventListener("click", close);
    $("pt2CatEditCancelBtn").addEventListener("click", close);
    $("pt2CatEditApplyBtn").addEventListener("click", applyCategoryEditor);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }

  function showTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".pt2-tab-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    ["build", "preview", "details"].forEach(function (t) {
      var el = $("pt2View" + t.charAt(0).toUpperCase() + t.slice(1));
      if (el) el.classList.toggle("active", t === tab);
    });
    if (tab === "details") renderDetails();
    if (tab === "preview") renderPreview();

    var view = $("pt2View" + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (view) {
      view.querySelectorAll(".pt2-layout, .pt2-main, .pt2-sidebar, .pt2-paper-wrap").forEach(function (el) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      });
    }
  }

  function wireTabs() {
    document.querySelectorAll(".pt2-tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showTab(btn.getAttribute("data-tab"));
      });
    });
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
    $("pt2GroupVar").addEventListener("change", function (e) {
      applyGroupVarSelection(e.target.value);
      syncControlsFromState();
      renderAll();
    });
    $("pt2StratVar").addEventListener("change", function (e) { state.stratVar = e.target.value; renderAll(); });
    $("pt2WeightVar").addEventListener("change", function (e) { state.weightVar = e.target.value; renderAll(); });
    $("pt2ShowOverall").addEventListener("change", function (e) { state.showOverall = e.target.checked; renderAll(); });
    $("pt2ShowPValue").addEventListener("change", function (e) { state.showPValue = e.target.checked; renderAll(); });
    $("pt2ShowSMD").addEventListener("change", function (e) { state.showSMD = e.target.checked; renderAll(); });
    $("pt2CompleteCase").addEventListener("change", function (e) { state.completeCase = e.target.checked; renderAll(); });
    $("pt2ShowMissingCat").addEventListener("change", function (e) { state.showMissingCategory = e.target.checked; renderAll(); });
    $("pt2MissingLabel").addEventListener("input", function (e) { state.missingLabel = e.target.value; renderPreview(); });
    var mgMode = $("pt2MissingGroupMode");
    if (mgMode) mgMode.addEventListener("change", function (e) { state.missingGroupMode = e.target.value; renderAll(); });
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
    document.querySelectorAll(".pt2-zoom-bar [data-zoom]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var z = btn.getAttribute("data-zoom");
        state.previewZoom = z === "fit" ? "fit" : parseInt(z, 10) || 100;
        applyPreviewZoom();
      });
    });
  }

  /* ═══════════════════════════ 8b. LOAD THE CURRENTLY SELECTED RANGE ═══════════════════════════
     No manual "Data" tab: the Hub already knows which range is active, and
     pushes it to this dialog the moment it opens. If a usable range is
     found we swap straight to it; otherwise the demo dataset stays put. */

  function officeHostAvailable() { return typeof Office !== "undefined" && !!Office.context && !!Office.context.ui; }

  function onExcelDataReceived(payload) {
    var headers = payload.headers || [];
    var rowArrays = payload.rows || [];
    if (!headers.length || !rowArrays.length) return;
    var address = payload.address || "";
    var already = state.excelDataset;
    if (already && already.address === address && already.n === rowArrays.length) return;

    var built = buildExcelDataset(headers, rowArrays);
    var aux = computeAuxVarDefs(built.varDefs);
    state.excelDataset = {
      rows: built.rows, varDefs: built.varDefs,
      groupDefs: aux.groupDefs, stratDefs: aux.stratDefs, weightDefs: aux.weightDefs,
      address: address, n: built.rows.length
    };
    setDataset("excel", built.rows, built.varDefs, aux.groupDefs, aux.stratDefs, aux.weightDefs);
    syncControlsFromState();
    renderAll();
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
    if (!officeHostAvailable()) return;
    var badge = $("pt2SourceBadge");
    if (badge && state.dataSource !== "excel") {
      badge.textContent = "Loading Excel data\u2026";
    }
    try {
      Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, function (arg) {
        handleHostMessage(arg.message);
      }, function () {
        // Handler registered — ask again in case the Hub's first push raced us.
        sendToHost({ action: "ready" });
        sendToHost({ action: "requestData" });
      });
    } catch (e) {}
    sendToHost({ action: "ready" });
    sendToHost({ action: "requestData" });
    var attempts = 0;
    excelRequestRetryTimer = setInterval(function () {
      attempts += 1;
      if (state.excelDataset || attempts > 20) {
        stopExcelRequestRetry();
        // No usable range arrived — restore the demo badge so it doesn't
        // linger on "Loading Excel data…".
        if (!state.excelDataset) renderAll();
        return;
      }
      sendToHost({ action: "requestData" });
    }, 700);
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

  var HTML_VIEW_THEMES = {
    manuscript: {
      label: "Manuscript",
      font: "'Times New Roman', Times, serif",
      pageBg: "#ffffff", text: "#111", muted: "#333",
      border: "#111", headerBg: "transparent", headerBorder: "1.5px solid #111",
      rowBorder: "none", stripe: "transparent", accent: "#111",
      captionWeight: "700", titleItalic: false, density: "normal"
    },
    journal: {
      label: "Journal",
      font: "Georgia, 'Times New Roman', serif",
      pageBg: "#ffffff", text: "#1a1a1a", muted: "#444",
      border: "#333", headerBg: "#f0f0f0", headerBorder: "1px solid #333",
      rowBorder: "1px solid #e5e5e5", stripe: "transparent", accent: "#1a1a1a",
      captionWeight: "400", titleItalic: false, density: "normal"
    },
    compact: {
      label: "Compact",
      font: "Arial, Helvetica, sans-serif",
      pageBg: "#ffffff", text: "#111", muted: "#444",
      border: "#222", headerBg: "transparent", headerBorder: "1px solid #222",
      rowBorder: "1px solid #eee", stripe: "transparent", accent: "#222",
      captionWeight: "700", titleItalic: false, density: "compact"
    },
    striped: {
      label: "Striped",
      font: "Segoe UI, Arial, sans-serif",
      pageBg: "#ffffff", text: "#0f172a", muted: "#475569",
      border: "#cbd5e1", headerBg: "#0f766e", headerBorder: "none",
      rowBorder: "1px solid #e2e8f0", stripe: "#f0fdfa", accent: "#0f766e",
      captionWeight: "700", titleItalic: false, density: "normal", headerColor: "#ffffff"
    },
    slate: {
      label: "Slate",
      font: "Segoe UI, Arial, sans-serif",
      pageBg: "#ffffff", text: "#0f172a", muted: "#475569",
      border: "#334155", headerBg: "#1e293b", headerBorder: "none",
      rowBorder: "1px solid #e2e8f0", stripe: "#f8fafc", accent: "#334155",
      captionWeight: "700", titleItalic: false, density: "normal", headerColor: "#f8fafc"
    }
  };

  var htmlViewerTheme = "manuscript";

  function renderThemedHtmlDocument(themeId, model) {
    var th = HTML_VIEW_THEMES[themeId] || HTML_VIEW_THEMES.manuscript;
    var rowPad = th.density === "compact" ? "4px 8px" : "8px 12px";
    var fontSize = th.density === "compact" ? "12px" : "13.5px";
    var headerColor = th.headerColor || th.text;
    var showTest = state.showPValue;
    var showSmdCol = state.showSMD;
    var m = model || buildModel();

    var css =
      "body{margin:0;padding:24px;background:#f1f5f9;color:" + th.text + ";font-family:" + th.font + ";}" +
      ".page{max-width:860px;margin:0 auto;background:" + th.pageBg + ";padding:28px 32px;box-shadow:0 4px 24px rgba(15,23,42,.08);}" +
      ".caption{font-weight:" + th.captionWeight + ";font-size:13px;margin-bottom:2px;}" +
      ".title{font-size:15px;margin-bottom:6px;font-weight:600;" + (th.titleItalic ? "font-style:italic;" : "") + "}" +
      ".subtitle{font-size:12.5px;color:" + th.muted + ";margin-bottom:14px;}" +
      "table{width:100%;border-collapse:collapse;font-size:" + fontSize + ";border-top:2px solid " + th.border + ";border-bottom:2px solid " + th.border + ";}" +
      "th{text-align:center;padding:" + rowPad + ";border-bottom:" + th.headerBorder + ";background:" + th.headerBg + ";color:" + headerColor + ";font-weight:700;}" +
      "th:first-child,td:first-child{text-align:left;}" +
      "td{padding:" + rowPad + ";text-align:center;border-bottom:" + th.rowBorder + ";color:" + th.text + ";}" +
      "tbody tr:nth-child(even) td{background:" + th.stripe + ";}" +
      ".varhead{font-weight:600;text-align:left;}" +
      ".cat{padding-left:1.4em;text-align:left;}" +
      ".note{font-size:11px;margin-top:12px;line-height:1.55;color:" + th.muted + ";padding-left:1.2em;text-indent:-1.2em;}" +
      "@media print{body{background:#fff;padding:0;}.page{box-shadow:none;max-width:none;}}";

    var body = '<div class="page">';
    body += '<div class="caption">Table ' + esc(state.report.tableNumber) + ".</div>";
    body += '<div class="title">' + esc(state.report.title) + "</div>";
    body += state.report.subtitle ? '<div class="subtitle">' + esc(state.report.subtitle) + "</div>" : "";

    m.strata.forEach(function (stratum, sIdx) {
      if (stratum.label) body += '<div style="font-weight:700;font-size:12.5px;margin:' + (sIdx ? "16px" : "0") + ' 0 6px;">' + esc(stratum.label) + "</div>";
      var block = stratum.block;
      var hasTest = showTest && block.rows.some(function (r) { return r.test; });
      var hasSmd = showSmdCol && block.rows.some(function (r) { return r.smd != null && isFinite(r.smd); });
      body += "<table><thead><tr><th>Characteristic</th>";
      block.columns.forEach(function (col) {
        body += "<th>" + esc(col.label) + "<br><span style=\"font-weight:400;font-size:.82em;\">(N=" + block.columnN[col.key] + ")</span></th>";
      });
      if (hasTest) body += "<th>P value</th>";
      if (hasSmd) body += "<th>SMD</th>";
      body += "</tr></thead><tbody>";
      block.rows.forEach(function (row) {
        if (row.type === "continuous") {
          body += "<tr><td>" + esc(row.label) + "</td>";
          row.cells.forEach(function (c) { body += "<td>" + esc(c) + "</td>"; });
          if (hasTest) body += "<td>" + (row.test ? fmtP(row.test.p, { pLeadingZero: true }) : "\u2014") + "</td>";
          if (hasSmd) body += "<td>" + (row.smd != null && isFinite(row.smd) ? Math.abs(row.smd).toFixed(2) : "\u2014") + "</td>";
          body += "</tr>";
        } else {
          var colspan = 1 + block.columns.length + (hasTest ? 1 : 0) + (hasSmd ? 1 : 0);
          body += '<tr><td class="varhead" colspan="' + colspan + '">' + esc(row.label) + "</td></tr>";
          row.categoryRows.forEach(function (cr, idx) {
            body += '<tr><td class="cat">' + esc(cr.catLabel) + "</td>";
            cr.cells.forEach(function (c) { body += "<td>" + esc(c) + "</td>"; });
            if (hasTest) body += "<td>" + (idx === 0 && row.test ? fmtP(row.test.p, { pLeadingZero: true }) : "") + "</td>";
            if (hasSmd) body += "<td>" + (idx === 0 && row.smd != null && isFinite(row.smd) ? Math.abs(row.smd).toFixed(2) : "") + "</td>";
            body += "</tr>";
          });
        }
      });
      body += "</tbody></table>";
    });

    var noteLines = [state.report.notes ? state.report.notes : autoNoteText()];
    if (state.report.abbreviations) noteLines.push(state.report.abbreviations);
    body += '<div class="note">' + noteLines.map(esc).join("<br>") + "</div></div>";

    return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Publication Table</title><style>" + css + "</style></head><body>" + body + "</body></html>";
  }

  function renderHtmlViewerFrame() {
    var frame = $("pt2HtmlViewerFrame");
    if (!frame) return;
    var th = HTML_VIEW_THEMES[htmlViewerTheme] || HTML_VIEW_THEMES.manuscript;
    var doc = renderThemedHtmlDocument(htmlViewerTheme, buildModel());
    var match = doc.match(/<div class="page">([\s\S]*)<\/div>\s*<\/body>/i);
    var pageInner = match ? match[1] : "";
    var rowPad = th.density === "compact" ? "4px 8px" : "8px 12px";
    var fontSize = th.density === "compact" ? "12px" : "13.5px";
    var headerColor = th.headerColor || th.text;
    var css =
      "#pt2HtmlViewerFrame{font-family:" + th.font + ";color:" + th.text + ";background:" + th.pageBg + ";}" +
      "#pt2HtmlViewerFrame .caption{font-weight:" + th.captionWeight + ";font-size:13px;margin-bottom:2px;}" +
      "#pt2HtmlViewerFrame .title{font-size:15px;margin-bottom:6px;font-weight:600;" + (th.titleItalic ? "font-style:italic;" : "") + "}" +
      "#pt2HtmlViewerFrame .subtitle{font-size:12.5px;color:" + th.muted + ";margin-bottom:14px;}" +
      "#pt2HtmlViewerFrame table{width:100%;border-collapse:collapse;font-size:" + fontSize + ";border-top:2px solid " + th.border + ";border-bottom:2px solid " + th.border + ";}" +
      "#pt2HtmlViewerFrame th{text-align:center;padding:" + rowPad + ";border-bottom:" + th.headerBorder + ";background:" + th.headerBg + ";color:" + headerColor + ";font-weight:700;}" +
      "#pt2HtmlViewerFrame th:first-child,#pt2HtmlViewerFrame td:first-child{text-align:left;}" +
      "#pt2HtmlViewerFrame td{padding:" + rowPad + ";text-align:center;border-bottom:" + th.rowBorder + ";}" +
      "#pt2HtmlViewerFrame tbody tr:nth-child(even) td{background:" + th.stripe + ";}" +
      "#pt2HtmlViewerFrame .varhead{font-weight:600;text-align:left;}" +
      "#pt2HtmlViewerFrame .cat{padding-left:1.4em;text-align:left;}" +
      "#pt2HtmlViewerFrame .note{font-size:11px;margin-top:12px;line-height:1.55;color:" + th.muted + ";padding-left:1.2em;text-indent:-1.2em;}";
    frame.innerHTML = "<style>" + css + "</style>" + pageInner;
  }

  function openHtmlViewer() {
    var overlay = $("pt2HtmlViewerOverlay");
    var themeSel = $("pt2HtmlTheme");
    if (!overlay) return;
    if (themeSel) themeSel.value = htmlViewerTheme;
    renderHtmlViewerFrame();
    overlay.classList.add("open");
  }

  function wireHtmlViewer() {
    var overlay = $("pt2HtmlViewerOverlay");
    if (!overlay) return;
    function close() { overlay.classList.remove("open"); }
    var openBtn = $("pt2ViewHtmlBtn");
    if (openBtn) openBtn.addEventListener("click", openHtmlViewer);
    var closeBtn = $("pt2HtmlViewerCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    var themeSel = $("pt2HtmlTheme");
    if (themeSel) themeSel.addEventListener("change", function () {
      htmlViewerTheme = themeSel.value;
      renderHtmlViewerFrame();
    });
    $("pt2HtmlCopyBtn").addEventListener("click", function () {
      var doc = renderThemedHtmlDocument(htmlViewerTheme, buildModel());
      var match = doc.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      var fragment = match ? match[1] : doc;
      copyHtmlToClipboard(fragment, buildPlainTextExport(buildModel()));
      flashButton($("pt2HtmlCopyBtn"), "Copied");
    });
    $("pt2HtmlDownloadBtn").addEventListener("click", function () {
      var doc = renderThemedHtmlDocument(htmlViewerTheme, buildModel());
      downloadBlob(doc, "text/html;charset=utf-8", "publication-table.html");
      flashButton($("pt2HtmlDownloadBtn"), "Downloaded");
    });
    $("pt2HtmlPrintBtn").addEventListener("click", function () {
      var doc = renderThemedHtmlDocument(htmlViewerTheme, buildModel());
      var w = window.open("", "_blank");
      if (!w) return;
      w.document.open();
      w.document.write(doc);
      w.document.close();
      setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 250);
    });
    $("pt2HtmlWordBtn").addEventListener("click", function () {
      var doc = renderThemedHtmlDocument(htmlViewerTheme, buildModel());
      var match = doc.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      var fragment = match ? match[1] : doc;
      downloadBlob(officeWrapper(fragment, "word"), "application/msword", "publication-table.doc");
      flashButton($("pt2HtmlWordBtn"), "Exported");
    });
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
    wireHtmlViewer();
    $("pt2ExportWordBtn").addEventListener("click", function () {
      var html = renderModelHtml(buildModel());
      downloadBlob(officeWrapper(html, "word"), "application/msword", "publication-table.doc");
      flashButton($("pt2ExportWordBtn"), "Exported");
    });
  }

  /* ═══════════════════════════ 10. AI ASSISTANT ═══════════════════════════
     Suggestions only — every analytical change needs Accept.
     Excel WebView often ignores AbortController on hung fetch, so every call
     uses Promise.race with a hard deadline and a local fallback. */

  var AI_PROXY_URL = "https://statistico-ai.statistico.workers.dev/";
  var GROQ_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
  var AI_HARD_TIMEOUT_MS = 10000;
  var aiSession = {
    action: null, payload: null, busy: false,
    abort: null, statusTimer: null, timeoutHandle: null, requestId: 0
  };

  function extractAiJson(raw) {
    if (!raw) return null;
    var cleaned = String(raw).replace(/```json|```/gi, "").trim();
    var s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
    if (s < 0 || e <= s) return null;
    try { return JSON.parse(cleaned.slice(s, e + 1)); } catch (err) { return null; }
  }

  function clearAiStatusTimer() {
    if (aiSession.statusTimer) { clearInterval(aiSession.statusTimer); aiSession.statusTimer = null; }
  }

  function clearAiTimeoutHandle() {
    if (aiSession.timeoutHandle) { clearTimeout(aiSession.timeoutHandle); aiSession.timeoutHandle = null; }
  }

  function beginAiStatus(label) {
    clearAiStatusTimer();
    var started = Date.now();
    var hardSec = Math.round(AI_HARD_TIMEOUT_MS / 1000);
    function tick() {
      var el = $("pt2AiStatus");
      if (!el || !aiSession.busy) return;
      var sec = Math.round((Date.now() - started) / 1000);
      el.classList.remove("error");
      el.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (label || "Thinking") +
        "\u2026" + (sec >= 2 ? " (" + sec + "s / " + hardSec + "s)" : "");
    }
    tick();
    aiSession.statusTimer = setInterval(tick, 500);
  }

  function abortAiRequest() {
    clearAiTimeoutHandle();
    if (aiSession.abort) {
      try { aiSession.abort.abort(); } catch (e) {}
      aiSession.abort = null;
    }
    aiSession.requestId += 1; /* invalidate any late responses */
  }

  function callPublicationAi(prompt, maxTokens) {
    var requestId = ++aiSession.requestId;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    aiSession.abort = controller;
    clearAiTimeoutHandle();

    function fetchWithModel(model) {
      return fetch(AI_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a senior biostatistics editor helping researchers build publication-ready tables inside Statistico. Propose recommendations only. Never claim clinical importance from p-values alone. Reply with STRICT JSON only — no markdown fences, no commentary outside JSON. Keep replies short."
            },
            { role: "user", content: prompt }
          ],
          max_tokens: maxTokens || 500,
          temperature: 0.2
        }),
        signal: controller ? controller.signal : undefined
      }).then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (e) {
            throw new Error((e && e.error && (e.error.message || e.error)) || ("HTTP " + r.status));
          });
        }
        return r.json().then(function (d) {
          var text = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
          text = text && String(text).trim();
          if (!text) throw new Error("Empty AI response");
          return text;
        });
      });
    }

    function fetchWithFallback(index) {
      return fetchWithModel(GROQ_MODELS[index]).catch(function (err) {
        if (err && err.name === "AbortError") throw err;
        if (index + 1 < GROQ_MODELS.length) return fetchWithFallback(index + 1);
        throw err;
      });
    }

    var fetchPromise = fetchWithFallback(0);

    var timeoutPromise = new Promise(function (_resolve, reject) {
      aiSession.timeoutHandle = setTimeout(function () {
        if (controller) {
          try { controller.abort(); } catch (e) {}
        }
        reject(new Error("AI timed out after " + Math.round(AI_HARD_TIMEOUT_MS / 1000) + "s"));
      }, AI_HARD_TIMEOUT_MS);
    });

    /* Promise.race is required: AbortController alone does not always settle hung fetches in Excel WebView. */
    return Promise.race([fetchPromise, timeoutPromise]).then(function (text) {
      clearAiTimeoutHandle();
      if (requestId !== aiSession.requestId) throw new Error("AI request cancelled");
      aiSession.abort = null;
      return text;
    }, function (err) {
      clearAiTimeoutHandle();
      aiSession.abort = null;
      if (requestId !== aiSession.requestId) throw new Error("AI request cancelled");
      var msg = (err && err.message) || "AI request failed";
      if (err && err.name === "AbortError") msg = "AI timed out after " + Math.round(AI_HARD_TIMEOUT_MS / 1000) + "s";
      throw new Error(msg);
    });
  }

  function columnProfile(key) {
    var vals = ACTIVE_DATA.map(function (r) { return r[key]; });
    var nonMiss = vals.filter(function (v) { return !isMissing(v); });
    var distinct = {};
    nonMiss.forEach(function (v) { distinct[String(v)] = (distinct[String(v)] || 0) + 1; });
    var levels = Object.keys(distinct).sort(function (a, b) { return distinct[b] - distinct[a]; });
    var sample = levels.slice(0, 8).map(function (lv) { return { value: lv, n: distinct[lv] }; });
    var nums = nonMiss.map(Number).filter(isFinite);
    var skewHint = null;
    if (nums.length >= 8) {
      var sorted = nums.slice().sort(function (a, b) { return a - b; });
      var m = mean(sorted);
      var med = percentileSorted(sorted, 50);
      var sd = sampleSd(sorted, m);
      if (isFinite(sd) && sd > 0) {
        var g1 = sorted.reduce(function (a, x) { return a + Math.pow((x - m) / sd, 3); }, 0) / sorted.length;
        skewHint = Math.abs(g1) > 1 ? "skewed" : (Math.abs(g1) > 0.5 ? "mild_skew" : "approx_symmetric");
        if (Math.abs(m - med) > 0.35 * sd) skewHint = "skewed";
      }
    }
    return {
      n: ACTIVE_DATA.length,
      nonMissing: nonMiss.length,
      missing: ACTIVE_DATA.length - nonMiss.length,
      nDistinct: levels.length,
      topLevels: sample,
      skewHint: skewHint
    };
  }

  function buildAiVariableSnapshot() {
    return state.varOrder.slice(0, 24).map(function (key) {
      var v = VAR_DEFS_BY_KEY[key];
      var cfg = state.varCfg[key];
      if (!v || !cfg) return null;
      var profile = columnProfile(key);
      var cats = null;
      if (effectiveType(v, cfg) !== "continuous") {
        cats = ensureCategoryMeta(v, cfg).slice().sort(function (a, b) { return a.order - b.order; })
          .slice(0, 8).map(function (m) {
            return { value: String(m.value).slice(0, 32), label: String(m.label).slice(0, 32), include: m.include !== false };
          });
      }
      return {
        key: key,
        sourceName: String(cfg.sourceName || v.label || "").slice(0, 48),
        currentLabel: String(cfg.label || "").slice(0, 48),
        inferredType: v.type,
        typeOverride: cfg.typeOverride || "auto",
        format: cfg.format,
        include: !!cfg.include,
        isGroupVar: key === state.groupVar,
        categories: cats,
        profile: {
          missing: profile.missing,
          nDistinct: profile.nDistinct,
          topLevels: (profile.topLevels || []).slice(0, 4),
          skewHint: profile.skewHint
        }
      };
    }).filter(Boolean);
  }

  function buildAiTableSignals() {
    var model = buildModel();
    var block = model.strata[0] && model.strata[0].block;
    var avail = groupAvailability();
    var audit = [];
    if (block) {
      block.rows.slice(0, 20).forEach(function (row) {
        audit.push({
          variable: row.label,
          type: row.type,
          p: row.test && isFinite(row.test.p) ? Number(row.test.p.toPrecision(4)) : null,
          test: row.test && row.test.name ? row.test.name : null,
          smd: isFinite(row.smd) ? Number(row.smd.toFixed(3)) : null
        });
      });
    }
    var gLabel = "";
    if (state.groupVar) {
      var gdef = GROUP_VAR_DEFS.filter(function (g) { return g.key === state.groupVar; })[0];
      gLabel = (gdef && gdef.label) || state.groupVar;
    }
    var varNames = eligibleVarDefs().slice(0, 16).map(function (v) {
      return (state.varCfg[v.key] && state.varCfg[v.key].label) || v.label;
    });
    return {
      tableType: state.tableType,
      nTotal: ACTIVE_DATA.length,
      groupVar: state.groupVar || null,
      groupLabel: gLabel || null,
      groupAvailability: avail,
      missingGroupMode: state.missingGroupMode,
      showOverall: state.showOverall,
      showPValue: state.showPValue,
      showSMD: state.showSMD,
      completeCase: state.completeCase,
      title: state.report.title,
      notes: state.report.notes || autoNoteText(),
      abbreviations: (state.report.abbreviations || "").slice(0, 300),
      columns: block ? block.columns.map(function (c) { return { label: c.label, n: block.columnN[c.key] }; }) : [],
      variables: varNames,
      audit: audit
    };
  }

  function setAiBusy(busy) {
    aiSession.busy = busy;
    var btn = $("pt2AiBtn");
    if (btn) btn.disabled = busy;
    document.querySelectorAll("[data-ai-action]").forEach(function (b) { b.disabled = busy; });
    var cancelBtn = $("pt2AiCancelBtn");
    if (cancelBtn) cancelBtn.style.display = busy ? "" : "none";
    if (!busy) {
      clearAiStatusTimer();
      clearAiTimeoutHandle();
    }
  }

  function showAiHome() {
    abortAiRequest();
    clearAiStatusTimer();
    aiSession.action = null;
    aiSession.payload = null;
    aiSession.busy = false;
    $("pt2AiHome").style.display = "";
    $("pt2AiWork").style.display = "none";
    $("pt2AiFooter").style.display = "none";
    $("pt2AiResult").innerHTML = "";
    $("pt2AiStatus").textContent = "";
    $("pt2AiStatus").classList.remove("error");
    $("pt2AiTitle").textContent = "AI Assistant";
    var cancelBtn = $("pt2AiCancelBtn");
    if (cancelBtn) cancelBtn.style.display = "none";
    var openBtn = $("pt2AiBtn");
    if (openBtn) openBtn.disabled = false;
    document.querySelectorAll("[data-ai-action]").forEach(function (b) { b.disabled = false; });
  }

  function showAiWork(title) {
    $("pt2AiHome").style.display = "none";
    $("pt2AiWork").style.display = "";
    $("pt2AiWorkTitle").textContent = title;
    $("pt2AiFooter").style.display = "none";
    $("pt2AiResult").innerHTML = "";
    $("pt2AiStatus").classList.remove("error");
    beginAiStatus("Thinking");
  }

  function renderAiProposalList(items) {
    if (!items || !items.length) {
      $("pt2AiResult").innerHTML = '<p class="cfg-hint">No changes suggested.</p>';
      $("pt2AiFooter").style.display = "none";
      return;
    }
    var html = '<div class="pt2-ai-list">';
    items.forEach(function (it, idx) {
      html += '<div class="pt2-ai-item">' +
        '<input type="checkbox" class="pt2-ai-check" data-idx="' + idx + '" id="pt2AiChk' + idx + '" checked />' +
        '<label for="pt2AiChk' + idx + '"><strong>' + esc(it.title || it.key || ("Suggestion " + (idx + 1))) + "</strong>" +
        (it.change ? '<span class="chg">' + esc(it.change) + "</span>" : "") +
        (it.reason ? '<span class="why">' + esc(it.reason) + "</span>" : "") +
        "</label></div>";
    });
    html += "</div>";
    $("pt2AiResult").innerHTML = html;
    $("pt2AiFooter").style.display = "flex";
    $("pt2AiAcceptBtn").textContent = "Accept selected";
  }

  function selectedAiIndexes() {
    var idxs = [];
    document.querySelectorAll(".pt2-ai-check").forEach(function (cb) {
      if (cb.checked) idxs.push(parseInt(cb.getAttribute("data-idx"), 10));
    });
    return idxs;
  }

  function showReviewFindings(findings, statusMsg) {
    clearAiStatusTimer();
    aiSession.action = "review";
    aiSession.payload = findings || [];
    if (!findings || !findings.length) {
      $("pt2AiStatus").textContent = statusMsg || "No major publication issues flagged.";
      $("pt2AiResult").innerHTML = '<p class="cfg-hint">The review did not find high-priority inconsistencies. Still verify denominators and footnotes before submission.</p>';
      $("pt2AiFooter").style.display = "none";
      return;
    }
    $("pt2AiStatus").textContent = statusMsg || (findings.length + " finding" + (findings.length === 1 ? "" : "s") + " — informational only (nothing auto-applied).");
    var html = "";
    findings.forEach(function (f) {
      var sev = (f.severity || "medium").toLowerCase();
      if (sev !== "high" && sev !== "low") sev = "medium";
      html += '<div class="pt2-ai-finding ' + sev + '"><strong>' + esc(f.title || "Finding") +
        '</strong><p>' + esc(f.detail || "") + "</p></div>";
    });
    $("pt2AiResult").innerHTML = html;
    $("pt2AiFooter").style.display = "none";
  }

  function localReviewFallback(signals) {
    var findings = [];
    if ((signals.tableType === "table1" || signals.tableType === "groupcompare") && !signals.groupVar) {
      findings.push({
        severity: "high",
        title: "No group variable selected",
        detail: "This table type normally compares groups, but Group variable is None. Choose a grouping variable or switch to Descriptive Summary.",
        topic: "other"
      });
    }
    if (signals.groupAvailability && signals.groupAvailability.missing > 0) {
      findings.push({
        severity: "high",
        title: "Missing group values affect denominators",
        detail: "Group variable available for " + signals.groupAvailability.valid + " of " +
          signals.groupAvailability.total + " records (" + signals.groupAvailability.missing +
          " missing). Current mode: " + signals.missingGroupMode +
          ". Consider Exclude missing group rows or add a Missing-group column so Overall and group Ns stay coherent.",
        topic: "missingness"
      });
    }
    if (signals.columns && signals.columns.length) {
      var ns = signals.columns.map(function (c) { return c.n; }).filter(function (n) { return n != null; });
      if (ns.length >= 2) {
        var maxN = Math.max.apply(null, ns), minN = Math.min.apply(null, ns);
        if (maxN - minN >= Math.max(5, Math.round(0.1 * maxN))) {
          findings.push({
            severity: "medium",
            title: "Column sample sizes differ",
            detail: "Column Ns range from " + minN + " to " + maxN +
              ". Check missing data handling and whether Overall should include rows lacking a group value.",
            topic: "denominators"
          });
        }
      }
    }
    if (signals.showSMD && signals.columns) {
      var groupCols = signals.columns.filter(function (c) {
        return c.label && !/overall/i.test(c.label) && !/missing/i.test(c.label);
      });
      if (groupCols.length !== 2) {
        findings.push({
          severity: "medium",
          title: "SMD is intended for two groups",
          detail: "SMD is on, but the table does not clearly have exactly two group columns. Turn SMD off or use a two-level group variable.",
          topic: "smd"
        });
      }
    }
    if (signals.audit) {
      signals.audit.forEach(function (row) {
        if (row.smd != null && Math.abs(row.smd) >= 0.2) {
          findings.push({
            severity: "low",
            title: "Possible imbalance: " + row.variable,
            detail: "SMD = " + row.smd + ". Values around 0.2 or higher often warrant a note about group imbalance; do not treat this as clinical importance by itself.",
            topic: "smd"
          });
        }
      });
    }
    var longLabels = (signals.variables || []).filter(function (n) { return String(n).length > 48; });
    if (longLabels.length) {
      findings.push({
        severity: "low",
        title: "Long variable labels",
        detail: longLabels.length + " included label(s) exceed 48 characters. Shorten for journal tables.",
        topic: "labels"
      });
    }
    if (!findings.length) {
      findings.push({
        severity: "low",
        title: "Local review complete",
        detail: "No high-priority structural issues detected offline. Re-check footnotes, decimal precision, and category coding before publication.",
        topic: "other"
      });
    }
    return findings.slice(0, 6);
  }

  function localSetupFallback(snap) {
    var suggestions = [];
    if ((state.tableType === "table1" || state.tableType === "groupcompare") && !state.groupVar && GROUP_VAR_DEFS.length) {
      var g = GROUP_VAR_DEFS[0];
      suggestions.push({
        kind: "groupVar", key: "", value: g.key,
        title: "Set group variable",
        change: "None → " + (g.label || g.key),
        reason: "Table type expects a grouping variable. Candidate chosen from available categorical fields."
      });
    }
    snap.forEach(function (v) {
      if (!v.include) return;
      var src = String(v.sourceName || v.key).toLowerCase();
      if (/(^id$|_id$|uuid|subject|participant.?id|record.?id)/i.test(src) || (v.profile && v.profile.nDistinct >= Math.max(50, ACTIVE_DATA.length * 0.9))) {
        suggestions.push({
          kind: "exclude", key: v.key, value: false,
          title: "Exclude likely ID: " + v.currentLabel,
          change: "Include → Exclude",
          reason: "High cardinality / ID-like name — usually omitted from descriptive tables."
        });
      }
      if (v.profile && v.profile.skewHint === "skewed" && v.format && v.format.indexOf("mean") === 0) {
        suggestions.push({
          kind: "format", key: v.key, value: "median-iqr-paren",
          title: "Prefer median for " + v.currentLabel,
          change: v.format + " → median-iqr-paren",
          reason: "Distribution looks skewed; median (Q1, Q3) is often more appropriate than mean ± SD."
        });
      }
      var nicer = humanizeLabel(v.sourceName || v.key);
      if (nicer && nicer !== v.currentLabel && /_|[a-z][A-Z]/.test(String(v.sourceName || ""))) {
        suggestions.push({
          kind: "label", key: v.key, value: nicer,
          title: "Clean label: " + v.key,
          change: v.currentLabel + " → " + nicer,
          reason: "Publication-friendly label from the source field name."
        });
      }
    });
    return suggestions.slice(0, 8);
  }

  function localLabelsFallback(snap) {
    var suggestions = [];
    snap.forEach(function (v) {
      var nicer = humanizeLabel(v.sourceName || v.key);
      if (nicer && nicer !== v.currentLabel) {
        suggestions.push({
          kind: "label", key: v.key, value: nicer,
          title: v.key + " — label",
          change: v.currentLabel + " → " + nicer,
          reason: "Cleaner publication label."
        });
      }
      if (v.categories && v.categories.length === 2) {
        var vals = v.categories.map(function (c) { return String(c.value); });
        if (vals.indexOf("0") >= 0 && vals.indexOf("1") >= 0) {
          suggestions.push({
            kind: "categoryLabel", key: v.key, categoryValue: "0", value: "No",
            title: v.currentLabel + " — code 0",
            change: "0 → No",
            reason: "Binary code mapped to a readable label (review before accepting)."
          });
          suggestions.push({
            kind: "categoryLabel", key: v.key, categoryValue: "1", value: "Yes",
            title: v.currentLabel + " — code 1",
            change: "1 → Yes",
            reason: "Binary code mapped to a readable label (review before accepting)."
          });
        }
      }
    });
    return suggestions.slice(0, 10);
  }

  function finishProposal(action, suggestions, statusMsg) {
    clearAiStatusTimer();
    aiSession.action = action;
    aiSession.payload = suggestions;
    $("pt2AiStatus").classList.remove("error");
    $("pt2AiStatus").textContent = statusMsg || (suggestions.length
      ? "Review each suggestion, then accept those you want."
      : "No changes suggested.");
    renderAiProposalList(suggestions);
  }

  function runAiSetup() {
    showAiWork("Set up my table");
    setAiBusy(true);
    beginAiStatus("Setting up");
    var snap = buildAiVariableSnapshot();
    var prompt =
      "Task: propose an initial publication-table setup.\n" +
      "Current table type: " + state.tableType + "\n" +
      "Current group variable: " + (state.groupVar || "none") + "\n" +
      "Variables JSON:\n" + JSON.stringify(snap) + "\n\n" +
      "Return JSON:\n" +
      '{"suggestions":[{"kind":"groupVar|include|exclude|type|format|label","key":"varKey","value":"proposed value","title":"short title","change":"from → to","reason":"why"}]}\n' +
      "Rules: at most 6 suggestions; at most one groupVar; mark ID-like columns for exclude; prefer median-iqr-paren when skewHint is skewed.";
    return callPublicationAi(prompt, 500).then(function (raw) {
      var parsed = extractAiJson(raw) || {};
      var suggestions = (parsed.suggestions || []).filter(function (s) {
        return s && s.kind && (s.kind === "groupVar" || snap.some(function (v) { return v.key === s.key; }));
      }).map(function (s) {
        return {
          kind: s.kind, key: s.key || "", value: s.value,
          title: s.title || (s.kind + (s.key ? ": " + s.key : "")),
          change: s.change || String(s.value == null ? "" : s.value),
          reason: s.reason || ""
        };
      });
      finishProposal("setup", suggestions);
    }).catch(function (err) {
      if (!aiSession.busy) return;
      finishProposal("setup", localSetupFallback(snap),
        "AI unavailable (" + ((err && err.message) || "error") + "). Showing local setup suggestions.");
    });
  }

  function runAiLabels() {
    showAiWork("Improve labels & categories");
    setAiBusy(true);
    beginAiStatus("Improving labels");
    var snap = buildAiVariableSnapshot();
    var prompt =
      "Task: improve publication-friendly variable labels and category display labels.\n" +
      "Variables JSON:\n" + JSON.stringify(snap) + "\n\n" +
      "Return JSON:\n" +
      '{"suggestions":[{"kind":"label|categoryLabel|type","key":"varKey","value":"new label or type","categoryValue":"original category if kind=categoryLabel","title":"...","change":"...","reason":"..."}]}\n' +
      "Rules: at most 8 suggestions; keep units; map coded 0/1 when obvious; do not merge/drop categories.";
    return callPublicationAi(prompt, 500).then(function (raw) {
      var parsed = extractAiJson(raw) || {};
      var suggestions = (parsed.suggestions || []).filter(function (s) {
        return s && s.key && state.varCfg[s.key] && (s.kind === "label" || s.kind === "categoryLabel" || s.kind === "type");
      }).map(function (s) {
        return {
          kind: s.kind, key: s.key, value: s.value, categoryValue: s.categoryValue,
          title: s.title || (s.key + " — " + s.kind),
          change: s.change || String(s.value == null ? "" : s.value),
          reason: s.reason || ""
        };
      });
      finishProposal("labels", suggestions, suggestions.length
        ? "Select label/category updates to apply."
        : "Labels already look publication-ready.");
    }).catch(function (err) {
      if (!aiSession.busy) return;
      var local = localLabelsFallback(snap);
      finishProposal("labels", local,
        "AI unavailable (" + ((err && err.message) || "error") + "). Showing local label suggestions.");
    });
  }

  function runAiReview() {
    showAiWork("Review this table");
    setAiBusy(true);
    beginAiStatus("Reviewing table");
    var signals;
    try { signals = buildAiTableSignals(); }
    catch (buildErr) {
      return Promise.resolve().then(function () {
        showReviewFindings([{
          severity: "high",
          title: "Could not build table signals",
          detail: (buildErr && buildErr.message) || "Unexpected error while preparing the review."
        }], "Local review only — table signals failed.");
      });
    }
    var prompt =
      "Task: quality-control review of a finished publication table. Identify concrete problems.\n" +
      "Signals JSON:\n" + JSON.stringify(signals) + "\n\n" +
      "Return JSON:\n" +
      '{"findings":[{"severity":"high|medium|low","title":"...","detail":"specific issue and what to consider","topic":"missingness|denominators|labels|tests|smd|sparse|format|other"}]}\n' +
      "Rules: at most 5 findings; be specific with Ns; do not recompute p-values.";
    return callPublicationAi(prompt, 500).then(function (raw) {
      var parsed = extractAiJson(raw) || {};
      showReviewFindings(parsed.findings || []);
    }).catch(function (err) {
      if (!aiSession.busy) return;
      showReviewFindings(localReviewFallback(signals),
        "AI unavailable (" + ((err && err.message) || "error") + "). Showing local review findings.");
    });
  }

  function localDraftFallback(signals) {
    var gPart = signals.groupLabel ? (" by " + signals.groupLabel) : "";
    var title = state.tableType === "frequency"
      ? "Frequency Distribution of Study Variables"
      : (signals.groupLabel
        ? ("Baseline characteristics" + gPart)
        : (state.report.title || "Summary of Study Variables"));
    var nLine = "The sample included " + signals.nTotal + " observations";
    if (signals.groupAvailability && signals.groupAvailability.missing > 0) {
      nLine += "; the grouping variable was available for " + signals.groupAvailability.valid +
        " observations (" + signals.groupAvailability.missing + " missing)";
    }
    nLine += ".";
    return {
      tableNumber: state.report.tableNumber || 1,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      subtitle: signals.groupLabel ? ("Grouped by " + signals.groupLabel) : "",
      notes: signals.notes || autoNoteText(),
      abbreviations: signals.abbreviations || buildContextAbbreviations(),
      resultsDraft: nLine + " Values are summarized in Table " + (state.report.tableNumber || 1) +
        ". This paragraph is a draft for author review and does not claim statistical or clinical importance.",
      disclaimer: "Local draft (AI unavailable) — edit before use."
    };
  }

  function showDraftForm(parsed, statusMsg) {
    clearAiStatusTimer();
    aiSession.action = "draft";
    aiSession.payload = parsed;
    $("pt2AiStatus").classList.remove("error");
    $("pt2AiStatus").textContent = statusMsg || "Edit the draft below, then accept to fill Caption & Notes.";
    $("pt2AiResult").innerHTML =
      '<div class="pt2-ai-draft-block"><label>Table number</label><input id="pt2AiDraftNum" type="number" min="1" value="' + esc(parsed.tableNumber || state.report.tableNumber) + '" /></div>' +
      '<div class="pt2-ai-draft-block"><label>Title</label><input id="pt2AiDraftTitle" type="text" value="' + esc(parsed.title || "") + '" /></div>' +
      '<div class="pt2-ai-draft-block"><label>Subtitle</label><input id="pt2AiDraftSubtitle" type="text" value="' + esc(parsed.subtitle || "") + '" /></div>' +
      '<div class="pt2-ai-draft-block"><label>Notes / footnotes</label><textarea id="pt2AiDraftNotes">' + esc(parsed.notes || "") + "</textarea></div>" +
      '<div class="pt2-ai-draft-block"><label>Abbreviations</label><textarea id="pt2AiDraftAbbrev">' + esc(parsed.abbreviations || "") + "</textarea></div>" +
      '<div class="pt2-ai-draft-block"><label>Results draft (not inserted into the table)</label><textarea id="pt2AiDraftResults">' + esc(parsed.resultsDraft || "") + "</textarea></div>" +
      '<p class="cfg-hint">' + esc(parsed.disclaimer || "Draft for author review — verify against the table before use.") + "</p>";
    $("pt2AiFooter").style.display = "flex";
    $("pt2AiAcceptBtn").textContent = "Apply to Caption & Notes";
  }

  function runAiDraft() {
    showAiWork("Draft title, notes & Results");
    setAiBusy(true);
    beginAiStatus("Drafting");
    var signals;
    try { signals = buildAiTableSignals(); }
    catch (e) { signals = { nTotal: ACTIVE_DATA.length, groupLabel: null, groupAvailability: groupAvailability(), notes: autoNoteText(), abbreviations: state.report.abbreviations || "" }; }
    var prompt =
      "Task: draft table caption elements and a short Results paragraph.\n" +
      "Signals JSON:\n" + JSON.stringify(signals) + "\n\n" +
      "Return JSON:\n" +
      '{"tableNumber":1,"title":"...","subtitle":"...","notes":"...","abbreviations":"...","resultsDraft":"...","disclaimer":"Draft for author review"}\n' +
      "Rules: concise; keep each field under 300 characters; Results draft cautious.";
    return callPublicationAi(prompt, 500).then(function (raw) {
      var parsed = extractAiJson(raw);
      if (!parsed) throw new Error("Could not parse AI draft");
      showDraftForm(parsed);
    }).catch(function (err) {
      if (!aiSession.busy) return;
      showDraftForm(localDraftFallback(signals),
        "AI unavailable (" + ((err && err.message) || "error") + "). Showing a local draft you can edit.");
    });
  }

  function applyAiSetup(selected) {
    selected.forEach(function (s) {
      if (s.kind === "groupVar" && s.value) {
        if (GROUP_VAR_DEFS.some(function (g) { return g.key === s.value; })) {
          applyGroupVarSelection(s.value);
        }
        return;
      }
      var cfg = state.varCfg[s.key];
      if (!cfg) return;
      if (s.kind === "include") cfg.include = true;
      else if (s.kind === "exclude") {
        cfg.include = false;
        if (s.key === state.groupVar) cfg.forceIncludeGroupRow = false;
      } else if (s.kind === "type" && s.value) {
        var allowed = { auto: 1, continuous: 1, categorical: 1, ordinal: 1, binary: 1 };
        if (allowed[s.value]) cfg.typeOverride = s.value;
      } else if (s.kind === "format" && s.value) {
        var formats = CONTINUOUS_FORMATS.concat(CATEGORICAL_FORMATS).map(function (f) { return f.value; });
        if (formats.indexOf(s.value) >= 0) cfg.format = s.value;
      } else if (s.kind === "label" && s.value) {
        cfg.label = String(s.value);
      }
    });
  }

  function applyAiLabels(selected) {
    selected.forEach(function (s) {
      var cfg = state.varCfg[s.key];
      var v = VAR_DEFS_BY_KEY[s.key];
      if (!cfg || !v) return;
      if (s.kind === "label" && s.value) {
        cfg.label = String(s.value);
      } else if (s.kind === "type" && s.value) {
        var allowed = { auto: 1, continuous: 1, categorical: 1, ordinal: 1, binary: 1 };
        if (allowed[s.value]) cfg.typeOverride = s.value;
      } else if (s.kind === "categoryLabel" && s.categoryValue != null && s.value != null) {
        var meta = ensureCategoryMeta(v, cfg);
        meta.forEach(function (m) {
          if (String(m.value) === String(s.categoryValue)) m.label = String(s.value);
        });
        cfg.orderText = meta.slice().sort(function (a, b) { return a.order - b.order; })
          .map(function (m) { return m.label; }).join(", ");
      }
    });
  }

  function applyAiDraftFromForm() {
    var num = parseInt(($("pt2AiDraftNum") || {}).value, 10);
    state.report.tableNumber = isFinite(num) && num > 0 ? num : state.report.tableNumber;
    state.report.title = ($("pt2AiDraftTitle") || {}).value || state.report.title;
    state.report.subtitle = ($("pt2AiDraftSubtitle") || {}).value || "";
    state.report.notes = ($("pt2AiDraftNotes") || {}).value || "";
    state.report.abbreviations = ($("pt2AiDraftAbbrev") || {}).value || "";
    lastAppliedDefaultTitle = state.report.title;
    lastAppliedDefaultAbbrev = state.report.abbreviations;
    var draft = ($("pt2AiDraftResults") || {}).value || "";
    if (draft) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(draft);
      } catch (e) {}
    }
  }

  function acceptAiSession() {
    if (!aiSession.action || !aiSession.payload) return;
    if (aiSession.action === "draft") {
      applyAiDraftFromForm();
      syncControlsFromState();
      renderAll();
      showTab("preview");
      $("pt2AiStatus").textContent = "Caption & Notes updated. Results draft copied to clipboard when available.";
      return;
    }
    if (aiSession.action === "review") return;
    var idxs = selectedAiIndexes();
    var selected = idxs.map(function (i) { return aiSession.payload[i]; }).filter(Boolean);
    if (!selected.length) {
      $("pt2AiStatus").textContent = "Select at least one suggestion to accept.";
      $("pt2AiStatus").classList.add("error");
      return;
    }
    if (aiSession.action === "setup") applyAiSetup(selected);
    if (aiSession.action === "labels") applyAiLabels(selected);
    syncControlsFromState();
    renderAll();
    $("pt2AiStatus").classList.remove("error");
    $("pt2AiStatus").textContent = "Applied " + selected.length + " suggestion" + (selected.length === 1 ? "" : "s") + ".";
    $("pt2AiFooter").style.display = "none";
    $("pt2AiResult").innerHTML = '<p class="cfg-hint">Changes applied. You can run AI again or close this panel.</p>';
  }

  function runAiAction(action) {
    if (aiSession.busy) return;
    var runner = {
      setup: runAiSetup,
      labels: runAiLabels,
      review: runAiReview,
      draft: runAiDraft
    }[action];
    if (!runner) return;
    var p;
    try { p = runner(); }
    catch (syncErr) {
      clearAiStatusTimer();
      $("pt2AiStatus").classList.add("error");
      $("pt2AiStatus").textContent = (syncErr && syncErr.message) || "AI action failed.";
      setAiBusy(false);
      return;
    }
    Promise.resolve(p).catch(function (err) {
      clearAiStatusTimer();
      if (!aiSession.busy) return;
      $("pt2AiStatus").classList.add("error");
      $("pt2AiStatus").textContent = (err && err.message) ? err.message : "AI request failed.";
      $("pt2AiResult").innerHTML = '<p class="cfg-hint">Network or AI proxy issue. Cancel and retry, or continue editing the table manually.</p>';
      $("pt2AiFooter").style.display = "none";
    }).then(function () {
      setAiBusy(false);
    });
  }

  function wireAiAssistant() {
    var overlay = $("pt2AiOverlay");
    var openBtn = $("pt2AiBtn");
    if (!overlay || !openBtn) return;
    function open() { showAiHome(); overlay.classList.add("open"); }
    function forceClose() {
      abortAiRequest();
      setAiBusy(false);
      overlay.classList.remove("open");
      showAiHome();
    }
    function close() {
      if (aiSession.busy) forceClose();
      else { overlay.classList.remove("open"); showAiHome(); }
    }
    openBtn.addEventListener("click", open);
    $("pt2AiCloseBtn").addEventListener("click", close);
    var cancelBtn = $("pt2AiCancelBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", forceClose);
    $("pt2AiBackBtn").addEventListener("click", function () {
      if (aiSession.busy) forceClose();
      else showAiHome();
    });
    $("pt2AiDiscardBtn").addEventListener("click", function () { if (!aiSession.busy) showAiHome(); });
    $("pt2AiAcceptBtn").addEventListener("click", acceptAiSession);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.querySelectorAll("[data-ai-action]").forEach(function (btn) {
      btn.addEventListener("click", function () { runAiAction(btn.getAttribute("data-ai-action")); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  /* ═══════════════════════════ 11. INIT ═══════════════════════════ */

  function sendToHost(payload) {
    try { if (Office && Office.context && Office.context.ui) Office.context.ui.messageParent(JSON.stringify(payload)); } catch (e) {}
  }

  function init() {
    wireTabs();
    wireBuildControls();
    wirePreviewControls();
    wireExportControls();
    wireVarGridDragDrop();
    wirePanelHelp();
    wireCategoryEditor();
    wireAiAssistant();
    syncControlsFromState();
    renderAll();
    if (window.__PT2_WEB_DEMO__) {
      showTab("preview");
      try {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch (e) {}
    }

    var closeBtn = $("pt2CloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", function () { sendToHost({ action: "close" }); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* Office.context isn't guaranteed to exist until Office.onReady() resolves,
     so the host-messaging handshake (which needs Office.context.ui) waits
     for that instead of running unconditionally inside init(). Everything
     else in init() runs immediately so the demo table shows up without
     delay if no range is selected (or this opens outside Excel). */
  /* Skip Office host handshake on website demos — office.js is not loaded. */
  if (!window.__PT2_WEB_DEMO__ && typeof Office !== "undefined" && Office.onReady) {
    Office.onReady().then(wireHostMessaging).catch(function () {});
  }
})();
