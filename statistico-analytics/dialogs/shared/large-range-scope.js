/* global Office, document, window, location, Storage, console */
/**
 * Large-range choice for analysis setup dialogs.
 * The default is the full range. A random sample is an explicit option.
 * Browser storage writes are optional and must not cancel the run.
 */
(function () {
  if (typeof Storage !== "undefined" && !Storage.prototype.__statisticoOptionalWrite) {
    var nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      try {
        return nativeSetItem.call(this, key, value);
      } catch (error) {
        console.warn("Optional storage write skipped for " + key);
      }
    };
    Storage.prototype.__statisticoOptionalWrite = true;
  }

  var SEED = 20260927;
  var CHAR_LIMIT = 3500000;
  var SAMPLE_BUDGET = 2800000;
  var plan = null;
  var hooked = false;
  var moduleId = "analysis";

  var COPY = {
    univariate: {
      exact: "the mean, tests, and N stay exact",
      later: "By Group uses those same rows",
      sampled: "every reported statistic then uses the sample"
    },
    regression: {
      exact: "the coefficients, tests, and N stay exact",
      later: "By Group refits this model on those same rows",
      sampled: "every coefficient, test, and N then uses the sample"
    },
    anova: {
      exact: "the means, tests, and N stay exact",
      later: "later comparisons use those same rows",
      sampled: "every mean, test, and N then uses the sample"
    },
    independent: {
      exact: "the means, tests, and N stay exact",
      later: "later comparisons use those same rows",
      sampled: "every mean, test, and N then uses the sample"
    },
    dependent: {
      exact: "the means, tests, and N stay exact",
      later: "later comparisons use those same rows",
      sampled: "every mean, test, and N then uses the sample"
    },
    contingency: {
      exact: "the counts, tests, and N stay exact",
      later: "By Group is calculated from those same rows",
      sampled: "every count, test, and N then uses the sample"
    },
    logistic: {
      exact: "the coefficients, tests, and N stay exact",
      later: "later views use those same rows",
      sampled: "every coefficient, test, and N then uses the sample"
    },
    factor: {
      exact: "the factor solution is fit on every row",
      later: "later views use those same rows",
      sampled: "the factor solution then describes the sample"
    },
    pca: {
      exact: "the components are fit on every row",
      later: "later views use those same rows",
      sampled: "the components then describe the sample"
    },
    cluster: {
      exact: "clusters are fit on every row",
      later: "later views use those same rows",
      sampled: "cluster membership then describes the sample"
    },
    reliability: {
      exact: "the reliability estimates use every row",
      later: "later views use those same rows",
      sampled: "the reliability estimates then describe the sample"
    },
    mixed: {
      exact: "the mixed model is fit on every row",
      later: "later views use those same rows",
      sampled: "the estimates then describe the sample"
    },
    segmentation: {
      exact: "the segmentation uses every row",
      later: "later views use those same rows",
      sampled: "the segments then describe the sample"
    },
    pareto: {
      exact: "the category counts stay exact",
      later: "the chart uses those same rows",
      sampled: "the counts then describe the sample"
    },
    multivariable: {
      exact: "the exploration uses every row",
      later: "later views use those same rows",
      sampled: "the statistics then describe the sample"
    },
    meta: {
      noun: "studies",
      exact: "the pooled estimate uses every study",
      later: "later views use those same studies",
      sampled: "the pooled estimate then describes that sample of studies"
    },
    prepare: { offerSample: false }
  };

  function detectModule() {
    var path = String((location && location.pathname) || "").toLowerCase();
    var mode = "";
    try { mode = new URLSearchParams(location.search).get("mode") || ""; } catch (e) {}
    if (mode === "pca" || path.indexOf("/pca/") >= 0) return "pca";
    if (path.indexOf("/meta-analysis/") >= 0) return "meta";
    var keys = ["univariate", "regression", "anova", "independent", "dependent", "contingency", "logistic", "factor", "reliability", "mixed", "segmentation", "pareto", "multivariable", "prepare", "cluster", "correlations"];
    for (var i = 0; i < keys.length; i++) {
      if (path.indexOf("/" + keys[i] + "/") >= 0) return keys[i];
    }
    return "analysis";
  }

  function nounOf(copy) {
    return (copy && copy.noun) || "rows";
  }

  function ensureStyle() {
    if (document.getElementById("statisticoLargeRangeStyle")) return;
    var style = document.createElement("style");
    style.id = "statisticoLargeRangeStyle";
    style.textContent = [
      ".sample-proposal{border:1px solid rgba(249,115,22,.45);border-radius:8px;background:rgba(249,115,22,.08);padding:8px 10px;display:flex;flex-direction:column;gap:6px;flex-shrink:0;margin:8px 0;}",
      ".sample-proposal h3{margin:0;font-size:12px;font-weight:700;color:#f97316;}",
      ".sample-proposal p{margin:0;font-size:11px;line-height:1.4;color:inherit;}",
      ".sample-choice{display:flex;align-items:flex-start;gap:6px;font-size:11px;line-height:1.35;}"
    ].join("");
    document.head.appendChild(style);
  }

  function estimateChars(headers, rows) {
    if (!rows || !rows.length) return 0;
    var take = Math.min(24, rows.length);
    var step = Math.max(1, Math.floor(rows.length / take));
    var total = 0;
    var counted = 0;
    for (var i = 0; i < rows.length && counted < take; i += step) {
      var obj = {};
      var row = rows[i] || [];
      for (var c = 0; c < row.length; c++) obj[(headers && headers[c]) || ("Col " + (c + 1))] = row[c];
      total += JSON.stringify(obj).length + 1;
      counted++;
    }
    return counted ? Math.round((total / counted) * rows.length) : 0;
  }

  function proposeSampleSize(rowCount, estimated) {
    var perRow = estimated / Math.max(1, rowCount);
    var n = Math.floor(SAMPLE_BUDGET / Math.max(perRow, 1));
    n = Math.min(5000, rowCount, n);
    return Math.max(500, n);
  }

  function panelEl() {
    return document.getElementById("sampleProposal");
  }

  function choice() {
    if (!plan) return null;
    var sample = document.getElementById("scopeSample");
    if (!sample || !sample.checked) return null;
    return {
      mode: "sample",
      method: "random-without-replacement",
      n: plan.n,
      seed: plan.seed,
      sourceRows: plan.sourceRows
    };
  }

  function runButton() {
    return document.getElementById("btnRun") || document.getElementById("runBtn") || document.getElementById("btnRunAnalysis");
  }

  function paintRunLabel() {
    var btn = runButton();
    if (!btn || !plan) return;
    if (!btn.getAttribute("data-run-label")) btn.setAttribute("data-run-label", btn.innerHTML);
    var selected = choice();
    var label = selected
      ? ("Analyze a random sample of " + plan.n.toLocaleString() + " " + nounOf(COPY[moduleId]))
      : ("Analyze all " + plan.sourceRows.toLocaleString() + " " + nounOf(COPY[moduleId]));
    btn.innerHTML = '<i class="fa-solid fa-play"></i> ' + label;
  }

  function restoreRunLabel() {
    var btn = runButton();
    if (!btn) return;
    var original = btn.getAttribute("data-run-label");
    if (original) btn.innerHTML = original;
  }

  function findAnchor() {
    return document.getElementById("obsMonitor")
      || document.getElementById("metaBadge")
      || document.querySelector(".cfg-footer");
  }

  function render(headers, rows) {
    if (moduleId === "correlations") return;
    var copy = COPY[moduleId] || {
      exact: "the results stay exact",
      later: "later views use those same rows",
      sampled: "every reported statistic then uses the sample"
    };
    var count = rows.length;
    var estimated = estimateChars(headers, rows);
    var proposed = proposeSampleSize(count, estimated);
    var offer = copy.offerSample !== false && count > 0 && estimated > CHAR_LIMIT && proposed < count;
    var noteOnly = copy.offerSample === false && estimated > CHAR_LIMIT && count > 0;
    if (!offer && !noteOnly) {
      plan = null;
      var old = panelEl();
      if (old) old.hidden = true;
      restoreRunLabel();
      return;
    }
    ensureStyle();
    var panel = panelEl();
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "sample-proposal";
      panel.id = "sampleProposal";
      var anchor = findAnchor();
      if (anchor && anchor.parentNode) {
        if (anchor.id === "metaBadge") anchor.parentNode.insertBefore(panel, anchor.parentNode.firstChild);
        else anchor.parentNode.insertBefore(panel, anchor.nextSibling);
      } else {
        document.body.appendChild(panel);
      }
    }
    panel.hidden = false;
    var noun = nounOf(copy);
    if (noteOnly) {
      plan = null;
      panel.innerHTML = "<h3>This range has " + count.toLocaleString() + " " + noun + "</h3><p>This check uses all " + count.toLocaleString() + " " + noun + ".</p>";
      restoreRunLabel();
      return;
    }
    plan = { n: proposed, seed: SEED, sourceRows: count };
    panel.innerHTML = ""
      + "<h3>This range has " + count.toLocaleString() + " " + noun + "</h3>"
      + "<p>Analyze all " + count.toLocaleString() + " " + noun + " so " + copy.exact + ". " + copy.later + ". "
      + "A random sample of " + proposed.toLocaleString() + " " + noun + " is available if you want a smaller run. "
      + "It is drawn without replacement (seed " + SEED + "), and " + copy.sampled + ".</p>"
      + '<label class="sample-choice"><input type="radio" name="rowScope" id="scopeAll" value="all" checked> '
      + "<span>Analyze all " + count.toLocaleString() + " " + noun + "</span></label>"
      + '<label class="sample-choice"><input type="radio" name="rowScope" id="scopeSample" value="sample"> '
      + "<span>Analyze a random sample of " + proposed.toLocaleString() + " " + noun + " (seed " + SEED + ")</span></label>";
    panel.querySelectorAll('input[name="rowScope"]').forEach(function (input) {
      input.addEventListener("change", paintRunLabel);
    });
    paintRunLabel();
  }

  function stamp(body) {
    var selected = choice();
    if (!selected || !body || typeof body !== "object") return body;
    body.sample = selected;
    if (body.spec && typeof body.spec === "object") body.spec.sample = selected;
    return body;
  }

  function hookParent() {
    if (hooked) return;
    if (typeof Office === "undefined" || !Office.context || !Office.context.ui || typeof Office.context.ui.messageParent !== "function") return;
    var ui = Office.context.ui;
    var native = ui.messageParent.bind(ui);
    var skip = { ready: 1, requestdata: 1, close: 1, cancel: 1, dataapplied: 1, pickrange: 1, useselection: 1 };
    ui.messageParent = function (raw) {
      try {
        var msg = JSON.parse(raw);
        var action = String(msg && msg.action || "").toLowerCase();
        if (msg && !skip[action]) {
          if (msg.data && typeof msg.data === "object") stamp(msg.data);
          if (msg.payload && typeof msg.payload === "object") stamp(msg.payload);
          raw = JSON.stringify(msg);
        }
      } catch (e) {}
      return native(raw);
    };
    hooked = true;
  }

  function mulberry32(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawSampleRows(rows, n, seed) {
    var body = Array.isArray(rows) ? rows : [];
    var take = Math.min(Math.max(0, n | 0), body.length);
    if (!take || take >= body.length) return body.slice();
    var rand = mulberry32(seed || SEED);
    var order = new Array(body.length);
    var i;
    for (i = 0; i < body.length; i++) order[i] = i;
    for (var k = 0; k < take; k++) {
      var j = k + Math.floor(rand() * (body.length - k));
      var swap = order[k];
      order[k] = order[j];
      order[j] = swap;
    }
    var picked = order.slice(0, take).sort(function (a, b) { return a - b; });
    var out = new Array(picked.length);
    for (i = 0; i < picked.length; i++) out[i] = body[picked[i]];
    return out;
  }

  function sync(rows, headers) {
    moduleId = detectModule();
    if (moduleId === "correlations") return;
    hookParent();
    render(headers || [], Array.isArray(rows) ? rows : []);
  }

  function rowsForRun(rows) {
    var selected = choice();
    if (!selected) return { rows: rows, sample: null };
    var sampled = drawSampleRows(rows, selected.n, selected.seed);
    return {
      rows: sampled,
      sample: {
        mode: "sample",
        method: "random-without-replacement",
        n: sampled.length,
        seed: selected.seed,
        sourceRows: selected.sourceRows,
        sampledRows: sampled.length
      }
    };
  }

  window.StatisticoLargeRange = {
    SEED: SEED,
    sync: sync,
    choice: choice,
    stamp: stamp,
    rowsForRun: rowsForRun,
    drawSampleRows: drawSampleRows
  };
})();
