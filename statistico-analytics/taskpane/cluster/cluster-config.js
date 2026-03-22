/* global document, window, fetch, console */
/**
 * Loads cluster.module.json and applies theme + form defaults.
 * Exposes window.getClusterModuleConfig() for cluster-input-panel.js.
 * Falls back to CLUSTER_BUILTIN if fetch fails (same shape as cluster.module.json).
 */
(function() {
  "use strict";

  var CLUSTER_BUILTIN = {
    schemaVersion: 1,
    moduleId: "cluster",
    displayName: "Cluster Analysis",
    version: "1.0.0",
    theme: { clr: "#0d9488", clrDark: "#0f766e", clrLight: "#f0fdfa", clrBorder: "#99f6e4" },
    dialog: {
      resultsFilename: "cluster/cluster-analysis.html",
      heightPercent: 90,
      widthPercent: 70
    },
    defaults: { numClusters: 3, standardize: true, linkage: "average" },
    limits: {
      kMin: 2,
      kMax: 50,
      maxKmeansIterations: 100,
      maxAssignmentRowsDisplay: 500,
      maxRawDataRows: 500,
      maxHierarchicalMergeRowsDisplay: 40
    },
    analysis: { numericColumnThreshold: 0.8, distance: "euclidean" },
    linkageOptions: [
      { value: "average", label: "Average (UPGMA)" },
      { value: "complete", label: "Complete" },
      { value: "single", label: "Single" }
    ],
    ui: {
      pageTitle: "Cluster Analysis – Statistico Analytics",
      headerTitle: "Cluster Analysis",
      optionsBlurb: "All numeric columns in the range are used (listwise complete rows). K-means and hierarchical clustering both use the same <em>k</em> and distance on the analysis space.",
      labelK: "Number of clusters <em>k</em>",
      labelLinkage: "Hierarchical linkage",
      labelStandardize: "Standardise variables (recommended)",
      runButtonHtml: "<i class=\"fa-solid fa-chart-diagram\"></i><span>Open cluster dashboard</span>",
      configureClusterButtonHtml: "<i class=\"fa-solid fa-sliders\"></i><span>Configure clustering</span>",
      hintReadyPick: "Ready — click Configure clustering to set options",
      hintDashboard: "Adjust options above, then open the dashboard",
      clusterSetupTitle: "Clustering setup",
      backToRangeButton: "Back to range selection",
      hintNeedRange: "Select a data range to continue"
    }
  };

  function deepMerge(base, over) {
    if (!over || typeof over !== "object") return base;
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (k in over) {
      if (!Object.prototype.hasOwnProperty.call(over, k)) continue;
      var bv = out[k];
      var ov = over[k];
      if (ov && typeof ov === "object" && !Array.isArray(ov) && bv && typeof bv === "object" && !Array.isArray(bv)) {
        out[k] = deepMerge(bv, ov);
      } else {
        out[k] = ov;
      }
    }
    return out;
  }

  function applyClusterModuleConfig(cfg) {
    window.__CLUSTER_MODULE_CONFIG__ = cfg;
    var t = cfg.theme || {};
    var root = document.documentElement;
    if (t.clr) root.style.setProperty("--clr", t.clr);
    if (t.clrDark) root.style.setProperty("--clr-dark", t.clrDark);
    if (t.clrLight) root.style.setProperty("--clr-light", t.clrLight);
    if (t.clrBorder) root.style.setProperty("--clr-border", t.clrBorder);

    var ui = cfg.ui || {};
    var pt = document.getElementById("page-title-cluster");
    if (pt && ui.pageTitle) pt.textContent = ui.pageTitle;
    var hts = document.getElementById("clusterHeaderTitle");
    if (hts && ui.headerTitle) hts.textContent = ui.headerTitle;

    var lim = cfg.limits || {};
    var def = cfg.defaults || {};
    var kEl = document.getElementById("clusterK");
    if (kEl) {
      if (lim.kMin != null) kEl.min = String(lim.kMin);
      if (lim.kMax != null) kEl.max = String(lim.kMax);
      if (def.numClusters != null) kEl.value = String(def.numClusters);
    }
    var stdEl = document.getElementById("clusterStandardize");
    if (stdEl && def.standardize != null) stdEl.checked = !!def.standardize;

    var sel = document.getElementById("clusterLinkage");
    if (sel && Array.isArray(cfg.linkageOptions) && cfg.linkageOptions.length) {
      var v0 = def.linkage || (cfg.linkageOptions[0] && cfg.linkageOptions[0].value);
      sel.innerHTML = "";
      cfg.linkageOptions.forEach(function(opt) {
        var o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label || opt.value;
        sel.appendChild(o);
      });
      if (v0) sel.value = v0;
    }

    var blurb = document.getElementById("clusterOptionsBlurb");
    if (blurb && ui.optionsBlurb) blurb.innerHTML = ui.optionsBlurb;

    var lk = document.getElementById("labelClusterK");
    if (lk && ui.labelK) lk.innerHTML = ui.labelK;

    var ll = document.getElementById("labelClusterLinkage");
    if (ll && ui.labelLinkage) ll.textContent = ui.labelLinkage;

    var ls = document.getElementById("labelClusterStandardize");
    if (ls && ui.labelStandardize) ls.textContent = ui.labelStandardize;

    var runBtn = document.getElementById("runClusterBtn");
    if (runBtn && ui.runButtonHtml) runBtn.innerHTML = ui.runButtonHtml;

    var configureBtn = document.getElementById("configureClusterBtn");
    if (configureBtn && ui.configureClusterButtonHtml) configureBtn.innerHTML = ui.configureClusterButtonHtml;

    var setupTitle = document.getElementById("clusterSetupTitleText");
    if (setupTitle && ui.clusterSetupTitle) setupTitle.textContent = ui.clusterSetupTitle;

    var backBtn = document.getElementById("clusterBackToRangeBtn");
    if (backBtn && ui.backToRangeButton) backBtn.textContent = ui.backToRangeButton;

    var hintDash = document.getElementById("hintDashboardText");
    if (hintDash && ui.hintDashboard) hintDash.textContent = ui.hintDashboard;

    /* hintText is updated when range loads (cluster-input-panel.js) */
  }

  window.getClusterModuleConfig = function() {
    return window.__CLUSTER_MODULE_CONFIG__ || CLUSTER_BUILTIN;
  };

  applyClusterModuleConfig(CLUSTER_BUILTIN);

  var url = new URL("cluster.module.json", window.location.href);
  url.searchParams.set("v", String(Date.now()));
  fetch(url.toString(), { cache: "no-store" })
    .then(function(r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function(json) {
      var merged = deepMerge(CLUSTER_BUILTIN, json);
      applyClusterModuleConfig(merged);
    })
    .catch(function(err) {
      console.warn("cluster.module.json not loaded, using built-in defaults:", err && err.message);
    });
})();
