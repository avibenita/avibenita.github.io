/* global Office */
/**
 * Analytics hub: loads module cards from modules.config.json (single source of truth).
 * Ribbon entries are declared separately in manifest.xml — see modules.config.json → ribbonMenu.
 */

let MODULES = [];
let hubConfigDialog = null;
let hubResultsDialog = null;
let hubCurrentUnivariateResults = null;
let hubPendingResultsViewUrl = null;
let hubPendingUnivariateResults = null;
let hubUnivariateFlowActive = false;
let hubRegressionFlowActive = false;
let hubRegressionConfigDialog = null;
let hubRegressionResultsDialog = null;
let hubRegressionModelSpec = null;
let hubRegressionDataPayload = null;
let hubAnovaFlowActive = false;
let hubAnovaDialog = null;
let hubIndependentFlowActive = false;
let hubIndependentDialog = null;
let hubCorrelationFlowActive = false;
let hubCorrelationDialog = null;
const HUB_RESULT_DIALOG_OPTIONS = { height: 90, width: 70, displayInIframe: false };
const HUB_CATEGORY_TILES = [
  {
    id: "explore-data",
    title: "Explore data",
    icon: "fa-chart-bar",
    color: "#f97316",
    colorDark: "#c2410c",
    subtitle: "Inspect distributions and associations",
    modules: [
      { id: "univariate", label: "Univariate", tip: "Distribution summaries, outliers, and normality checks for single variables." },
      { id: "correlations", label: "Correlation", tip: "Pairwise associations and correlation matrix between numeric variables." }
    ]
  },
  {
    id: "compare-groups",
    title: "Compare groups",
    icon: "fa-scale-balanced",
    color: "#10b981",
    colorDark: "#0f766e",
    subtitle: "Compare means across groups",
    subgroups: [
      {
        label: "Multi-group models",
        modules: [
          { id: "anova", label: "ANOVA", tip: "Compare means across 3+ groups with post-hoc support." },
          { id: "mixed", label: "Mixed", tip: "Mixed-effects models for grouped or repeated-measures style data." }
        ]
      },
      {
        label: "Two-condition means",
        modules: [
          { id: "independent", label: "Independent Means", tip: "Compare two independent groups on a numeric outcome." },
          { id: "dependent", label: "Repeated Means", tip: "Compare paired/repeated measurements for the same cases." }
        ]
      }
    ]
  },
  {
    id: "model-relationships",
    title: "Model relationships",
    icon: "fa-chart-line",
    color: "#3b82f6",
    colorDark: "#1d4ed8",
    subtitle: "Predict outcomes and estimate effects",
    modules: [
      { id: "regression", label: "Regression", tip: "Linear regression with coefficients, intervals, and diagnostics." },
      { id: "logistic", label: "Logistic", tip: "Binary outcome modeling with odds ratios and model fit metrics." }
    ]
  },
  {
    id: "reduce-dimensions",
    title: "Reduce dimensions",
    icon: "fa-layer-group",
    color: "#8b5cf6",
    colorDark: "#6d28d9",
    subtitle: "Compress and reveal latent structure",
    modules: [
      { id: "factor", label: "Factor", tip: "Latent factor extraction and rotation for construct discovery." },
      { id: "pca", label: "PCA", tip: "Principal component reduction for compact feature representation." }
    ]
  },
  {
    id: "segment-data",
    title: "Segment data",
    icon: "fa-object-group",
    color: "#14b8a6",
    colorDark: "#0f766e",
    subtitle: "Group similar observations",
    modules: [
      { id: "cluster", label: "Clustering", tip: "K-means and hierarchical clustering to segment observations." }
    ]
  }
];

/** Ensures Cluster appears even if a cached or older modules.config.json omits it (inserted after PCA). */
var CLUSTER_MODULE_CARD = {
  id: "cluster",
  group: "multivariate",
  icon: "fa-object-group",
  color: "#14b8a6",
  bg: "rgba(20,184,166,.12)",
  name: "Cluster Analysis",
  desc: "Partition observations into groups using K-means or hierarchical agglomerative clustering on numeric inputs.",
  info: [
    "K-means (Euclidean, standardisation optional)",
    "Hierarchical: average, complete, single linkage",
    "Cluster sizes & case assignments",
    "Correlation heatmap of inputs",
    "Runs in the task pane — no cloud round-trip"
  ]
};

function ensureClusterModule(list) {
  var out = list.slice();
  if (out.some(function(m) { return m.id === "cluster"; })) return out;
  var pcaIdx = out.findIndex(function(m) { return m.id === "pca"; });
  if (pcaIdx >= 0) out.splice(pcaIdx + 1, 0, CLUSTER_MODULE_CARD);
  else out.push(CLUSTER_MODULE_CARD);
  return out;
}

async function loadModulesConfig() {
  const url = new URL("modules.config.json", window.location.href);
  url.searchParams.set("v", String(Date.now()));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const list = data && Array.isArray(data.modules) ? data.modules : [];
  if (!list.length) throw new Error("No modules in config");
  return list;
}

function renderModules(list) {
  ["descriptive", "comparisons", "multivariate"].forEach(function(g) {
    const block = document.querySelector('.group-block[data-group="' + g + '"]');
    if (!block) return;
    block.querySelectorAll(".module-card").forEach(function(c) { c.remove(); });
    const cards = list.filter(function(m) { return m.group === g; });
    cards.forEach(function(m) { block.appendChild(makeCard(m)); });
    block.classList.toggle("hidden", cards.length === 0);
  });
  const noResults = document.getElementById("noResults");
  if (noResults) noResults.style.display = list.length ? "none" : "block";
}

function renderCategoryTiles(query) {
  var holder = document.getElementById("categoryTiles");
  var noResults = document.getElementById("noResults");
  if (!holder) return;
  var q = (query || "").trim().toLowerCase();
  var list = HUB_CATEGORY_TILES.filter(function (c) {
    var mods = getCategoryModules(c);
    if (!q) return true;
    if (c.title.toLowerCase().indexOf(q) >= 0) return true;
    return mods.some(function (m) { return m.label.toLowerCase().indexOf(q) >= 0; });
  });
  holder.innerHTML = list.map(function (c) {
    var color = c.color || "#f97316";
    var colorDark = c.colorDark || "#c2410c";
    var icon = c.icon || "fa-table-cells-large";
    return (
      '<div class="category-tile" style="--cat-color:' + escapeHtml(color) + ";--cat-color-dark:" + escapeHtml(colorDark) + ';">' +
      '<div class="category-title-row">' +
      '<div class="category-icon"><i class="fa-solid ' + escapeHtml(icon) + '"></i></div>' +
      '<div class="category-title">' + escapeHtml(c.title) + "</div>" +
      "</div>" +
      '<div class="category-subtitle">' + escapeHtml(c.subtitle) + "</div>" +
      renderCategoryGroups(c) +
      "</div>"
    );
  }).join("");
  if (noResults) noResults.style.display = list.length ? "none" : "block";
}

function getCategoryModules(category) {
  if (Array.isArray(category.modules)) return category.modules;
  if (Array.isArray(category.subgroups)) {
    return category.subgroups.reduce(function (all, g) {
      return all.concat(Array.isArray(g.modules) ? g.modules : []);
    }, []);
  }
  return [];
}

function renderCategoryGroups(category) {
  if (Array.isArray(category.subgroups) && category.subgroups.length) {
    return category.subgroups.map(function (g, idx) {
      return (
        '<div class="category-subgroup' + (idx > 0 ? " with-divider" : "") + '">' +
        '<div class="category-subgroup-label">' + escapeHtml(g.label || "") + "</div>" +
        '<div class="category-modules">' +
        ((g.modules || []).map(renderCategoryModuleBtn).join("")) +
        "</div></div>"
      );
    }).join("");
  }
  return '<div class="category-modules">' + getCategoryModules(category).map(renderCategoryModuleBtn).join("") + "</div>";
}

function renderCategoryModuleBtn(m) {
  var tip = m.tip || m.label;
  return '<button class="category-module-btn" data-module-id="' + escapeHtml(m.id) + '" data-tip="' + escapeHtml(tip) + '" title="' + escapeHtml(tip) + '" onclick="navigateToModule(\'' + escapeHtml(m.id) + '\')">' + escapeHtml(m.label) + "</button>";
}

var GROUP_COLORS = {
  descriptive: { color: "#f97316", bg: "rgba(249,115,22,.1)" },
  comparisons: { color: "#10b981", bg: "rgba(16,185,129,.1)" },
  multivariate: { color: "#8b5cf6", bg: "rgba(139,92,246,.1)" }
};

function makeCard(m) {
  const div = document.createElement("div");
  div.className = "module-card";
  div.setAttribute("data-module-id", m.id);
  div.onclick = function() { navigateToModule(m.id); };
  var gc = GROUP_COLORS[m.group] || GROUP_COLORS.descriptive;
  var iconBg = gc.bg;
  var iconColor = gc.color;
  var wrapSt = ' style="background:' + iconBg + ' !important"';
  var iSt = ' style="color:' + iconColor + ' !important"';
  div.innerHTML =
    '<div class="module-icon"' + wrapSt + ">" +
    '  <i class="fa-solid ' + m.icon + '"' + iSt + "></i>" +
    "</div>" +
    '<div class="module-name">' + escapeHtml(m.name) + "</div>" +
    '<button class="mod-info-btn" type="button" title="What\'s included">i</button>' +
    '<i class="fa-solid fa-chevron-right module-arrow"></i>';

  div.querySelector(".mod-info-btn").addEventListener("click", function(e) {
    e.stopPropagation();
    showPopup(m, this);
  });
  return div;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const popup = document.getElementById("infoPopup");
const ptitle = document.getElementById("popupTitle");
const plist = document.getElementById("popupList");
let _activeBtn = null;

function showPopup(m, btn) {
  if (_activeBtn === btn && popup && popup.classList.contains("open")) {
    closePopup();
    return;
  }
  _activeBtn = btn;
  if (ptitle) {
    ptitle.innerHTML =
      '<i class="fa-solid ' + m.icon + '" style="color:var(--accent-1);font-size:11px;"></i> ' + escapeHtml(m.name);
  }
  const pdesc = document.getElementById("popupDesc");
  if (pdesc) pdesc.textContent = m.desc || "";
  if (plist) {
    plist.innerHTML = (m.info || []).map(function(b) { return "<li>" + escapeHtml(b) + "</li>"; }).join("");
  }
  if (popup && btn) {
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const W = 220;
    let left = r.right - W;
    if (left < 6) left = 6;
    if (left + W > vw - 6) left = vw - W - 6;
    popup.style.left = left + "px";
    popup.style.top = r.bottom + 5 + "px";
    popup.classList.add("open");
  }
}

function closePopup() {
  if (popup) popup.classList.remove("open");
  _activeBtn = null;
}

document.addEventListener("click", function(e) {
  if (popup && !popup.contains(e.target)) closePopup();
});

function filterModules(q) {
  renderCategoryTiles(q || "");
}

function getDialogsBaseUrl() {
  var href = window.location.href;
  if (href.includes("/taskpane/")) return href.split("/taskpane/")[0] + "/dialogs/views/";
  return window.location.origin + "/dialogs/views/";
}

function getGlobalRangePayload() {
  try {
    if (!window.StatisticoGlobalRange || typeof StatisticoGlobalRange.load !== "function") return null;
    var gr = StatisticoGlobalRange.load();
    if (!gr || !gr.values || !Array.isArray(gr.values) || gr.values.length < 2) return null;
    return gr;
  } catch (e) {
    return null;
  }
}

function setSelectedModuleCard(moduleId, active) {
  document.querySelectorAll('[data-module-id="' + moduleId + '"]').forEach(function (el) {
    el.classList.toggle("selected", !!active);
  });
}

function finishHubUnivariateFlow() {
  hubUnivariateFlowActive = false;
  hubPendingResultsViewUrl = null;
  hubPendingUnivariateResults = null;
  if (!hubConfigDialog && !hubResultsDialog) setSelectedModuleCard("univariate", false);
}

function finishHubRegressionFlow() {
  hubRegressionFlowActive = false;
  hubRegressionModelSpec = null;
  hubRegressionDataPayload = null;
  if (!hubRegressionConfigDialog && !hubRegressionResultsDialog) setSelectedModuleCard("regression", false);
}

function finishHubAnovaFlow() {
  hubAnovaFlowActive = false;
  if (!hubAnovaDialog) setSelectedModuleCard("anova", false);
}

function finishHubIndependentFlow() {
  hubIndependentFlowActive = false;
  if (!hubIndependentDialog) setSelectedModuleCard("independent", false);
}

function finishHubCorrelationFlow() {
  hubCorrelationFlowActive = false;
  if (!hubCorrelationDialog) setSelectedModuleCard("correlations", false);
}

function sendUnivariateDialogData() {
  var gr = getGlobalRangePayload();
  if (!hubConfigDialog || !gr) return;
  var headers = gr.values[0] || [];
  var rows = gr.values.slice(1);
  var savedSpec = null;
  try { savedSpec = JSON.parse(sessionStorage.getItem("univariateModelSpec") || "null"); } catch (e) {}
  hubConfigDialog.messageChild(JSON.stringify({
    type: "UNIVARIATE_DATA",
    payload: { headers: headers, rows: rows, address: gr.address || "", savedSpec: savedSpec }
  }));
}

function queueHubResultsViewSwitch(viewPath) {
  hubPendingResultsViewUrl = getDialogsBaseUrl() + viewPath;
  if (hubResultsDialog) {
    try { hubResultsDialog.close(); } catch (e) {}
    return;
  }
  if (hubPendingResultsViewUrl && hubCurrentUnivariateResults) {
    var target = hubPendingResultsViewUrl;
    hubPendingResultsViewUrl = null;
    openHubUnivariateResultsAt(target, hubCurrentUnivariateResults);
  }
}

function openHubUnivariateResultsAt(dialogUrl, results) {
  Office.context.ui.displayDialogAsync(dialogUrl, HUB_RESULT_DIALOG_OPTIONS, function (asyncResult) {
    if (asyncResult.status === Office.AsyncResultStatus.Failed) {
      console.error("Failed to open univariate results:", asyncResult.error && asyncResult.error.message);
      finishHubUnivariateFlow();
      return;
    }
    var dialog = asyncResult.value;
    hubResultsDialog = dialog;
    var sendData = function () {
      if (!dialog) return;
      dialog.messageChild(JSON.stringify({
        action: "loadData",
        data: {
          values: results.rawData,
          column: results.column,
          descriptive: results.descriptive,
          n: results.n
        }
      }));
    };
    setTimeout(sendData, 1000);
    dialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
      try {
        var message = JSON.parse(arg.message || "{}");
        if (message.status === "ready") {
          sendData();
        } else if (message.action === "switchView") {
          if (dialog !== hubResultsDialog) return;
          queueHubResultsViewSwitch(message.view);
        } else if (message.action === "close" || message.action === "closeDialog") {
          hubPendingResultsViewUrl = null;
          if (dialog === hubResultsDialog) {
            dialog.close();
            hubResultsDialog = null;
            finishHubUnivariateFlow();
          }
        }
      } catch (e) {}
    });
    dialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
      if (dialog === hubResultsDialog) hubResultsDialog = null;
      if (hubPendingResultsViewUrl && !hubResultsDialog && hubCurrentUnivariateResults) {
        var next = hubPendingResultsViewUrl;
        hubPendingResultsViewUrl = null;
        setTimeout(function () { openHubUnivariateResultsAt(next, hubCurrentUnivariateResults); }, 120);
        return;
      }
      if (!hubPendingResultsViewUrl) finishHubUnivariateFlow();
    });
  });
}

function openHubUnivariateResults(results) {
  hubCurrentUnivariateResults = results;
  openHubUnivariateResultsAt(getDialogsBaseUrl() + "univariate/histogram-standalone.html", results);
}

function openUnivariateConfigFromHub() {
  var gr = getGlobalRangePayload();
  if (!gr) return false;
  hubUnivariateFlowActive = true;
  setSelectedModuleCard("univariate", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "univariate/univariate-input.html?v=" + Date.now(),
    { height: 88, width: 25, displayInIframe: false },
    function (asyncResult) {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open univariate config dialog:", asyncResult.error && asyncResult.error.message);
        finishHubUnivariateFlow();
        return;
      }
      hubConfigDialog = asyncResult.value;
      setTimeout(sendUnivariateDialogData, 550);
      hubConfigDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var message = JSON.parse(arg.message || "{}");
          if (message.action === "ready" || message.action === "requestData") {
            sendUnivariateDialogData();
          } else if (message.action === "univariateResults") {
            hubPendingUnivariateResults = message.data;
            sessionStorage.setItem("univariateModelSpec", JSON.stringify(message.spec || {}));
            var cfg = hubConfigDialog;
            try { if (cfg) cfg.close(); } catch (e) {}
            hubConfigDialog = null;
            // Fallback: some Office hosts miss DialogEventReceived occasionally.
            // If still pending shortly after close, open results anyway.
            setTimeout(function () {
              if (hubPendingUnivariateResults && !hubResultsDialog) {
                var lateResults = hubPendingUnivariateResults;
                hubPendingUnivariateResults = null;
                openHubUnivariateResults(lateResults);
              }
            }, 900);
          } else if (message.action === "close") {
            hubPendingUnivariateResults = null;
            hubConfigDialog.close();
            hubConfigDialog = null;
            if (!hubResultsDialog) finishHubUnivariateFlow();
          }
        } catch (e) {}
      });
      hubConfigDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubConfigDialog = null;
        if (hubPendingUnivariateResults) {
          var readyResults = hubPendingUnivariateResults;
          hubPendingUnivariateResults = null;
          setTimeout(function () { openHubUnivariateResults(readyResults); }, 120);
          return;
        }
        if (!hubResultsDialog) finishHubUnivariateFlow();
      });
    }
  );
  return true;
}

function sendRegressionBuilderDataFromHub() {
  if (!hubRegressionConfigDialog || !hubRegressionDataPayload) return;
  hubRegressionConfigDialog.messageChild(JSON.stringify({
    type: "REGRESSION_DATA",
    payload: hubRegressionDataPayload
  }));
}

function sendRegressionResultsDataFromHub() {
  if (!hubRegressionResultsDialog || !hubRegressionDataPayload) return;
  hubRegressionResultsDialog.messageChild(JSON.stringify({
    type: "REGRESSION_RESULTS",
    payload: {
      headers: hubRegressionDataPayload.headers || [],
      rows: hubRegressionDataPayload.rows || [],
      address: hubRegressionDataPayload.address || "",
      modelSpec: hubRegressionModelSpec || {}
    }
  }));
}

function openRegressionResultsFromHub() {
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "regression/regression-coefficients.html?cb=" + Date.now(),
    { height: 90, width: 70, displayInIframe: false },
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        console.error("Could not open regression results:", res.error && res.error.message);
        finishHubRegressionFlow();
        return;
      }
      hubRegressionResultsDialog = res.value;
      hubRegressionResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") sendRegressionResultsDataFromHub();
          else if (msg.action === "close") {
            hubRegressionResultsDialog.close();
            hubRegressionResultsDialog = null;
            finishHubRegressionFlow();
          }
        } catch (e) {}
      });
      hubRegressionResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubRegressionResultsDialog = null;
        finishHubRegressionFlow();
      });
      setTimeout(sendRegressionResultsDataFromHub, 1200);
    }
  );
}

function openRegressionConfigFromHub() {
  var gr = getGlobalRangePayload();
  if (!gr) return false;
  hubRegressionDataPayload = {
    headers: gr.values[0] || [],
    rows: gr.values.slice(1),
    address: gr.address || "",
    savedModelSpec: null
  };
  hubRegressionFlowActive = true;
  setSelectedModuleCard("regression", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "regression/regression-input.html?v=" + Date.now(),
    { height: 90, width: 30, displayInIframe: false },
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        console.error("Could not open regression config:", res.error && res.error.message);
        finishHubRegressionFlow();
        return;
      }
      hubRegressionConfigDialog = res.value;
      setTimeout(sendRegressionBuilderDataFromHub, 600);
      setTimeout(sendRegressionBuilderDataFromHub, 1200);
      setTimeout(sendRegressionBuilderDataFromHub, 2000);
      hubRegressionConfigDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendRegressionBuilderDataFromHub();
          } else if (msg.action === "regressionModel") {
            hubRegressionModelSpec = msg.payload || msg.data || {};
            hubRegressionConfigDialog.close();
            hubRegressionConfigDialog = null;
            setTimeout(openRegressionResultsFromHub, 500);
          } else if (msg.action === "close") {
            hubRegressionConfigDialog.close();
            hubRegressionConfigDialog = null;
            finishHubRegressionFlow();
          }
        } catch (e) {}
      });
      hubRegressionConfigDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubRegressionConfigDialog = null;
        if (!hubRegressionResultsDialog) finishHubRegressionFlow();
      });
    }
  );
  return true;
}

function openAnovaConfigFromHub() {
  var gr = getGlobalRangePayload();
  if (!gr) return false;
  hubAnovaFlowActive = true;
  setSelectedModuleCard("anova", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "anova/anova-input.html?v=" + Date.now(),
    { height: 88, width: 26, displayInIframe: false },
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        finishHubAnovaFlow();
        return;
      }
      hubAnovaDialog = res.value;
      var sendAnovaData = function () {
        if (!hubAnovaDialog || !gr) return;
        var savedModelSpec = null;
        try { savedModelSpec = JSON.parse(sessionStorage.getItem("anovaModelSpec") || "null"); } catch (e) {}
        hubAnovaDialog.messageChild(JSON.stringify({
          type: "ANOVA_DATA",
          payload: {
            headers: gr.values[0] || [],
            rows: gr.values.slice(1),
            address: gr.address || "",
            savedModelSpec: savedModelSpec
          }
        }));
      };
      setTimeout(sendAnovaData, 550);
      hubAnovaDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendAnovaData();
          } else if (msg.action === "anovaModel") {
            sessionStorage.setItem("anovaModelSpec", JSON.stringify(msg.data || msg.payload || {}));
            try { hubAnovaDialog.close(); } catch (e) {}
            hubAnovaDialog = null;
            window.location.href = "./anova/anova.html?v=" + Date.now() + "&fromHub=1&autoConfig=1&directDialog=1&openResults=1";
          } else if (msg.action === "close") {
            try { hubAnovaDialog.close(); } catch (e) {}
            hubAnovaDialog = null;
            finishHubAnovaFlow();
          }
        } catch (e) {}
      });
      hubAnovaDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubAnovaDialog = null;
        finishHubAnovaFlow();
      });
    }
  );
  return true;
}

function openIndependentConfigFromHub() {
  var gr = getGlobalRangePayload();
  if (!gr) return false;
  hubIndependentFlowActive = true;
  setSelectedModuleCard("independent", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "independent/independent-input.html?v=" + Date.now(),
    { height: 88, width: 25, displayInIframe: false },
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        finishHubIndependentFlow();
        return;
      }
      hubIndependentDialog = res.value;
      var sendIndependentData = function () {
        if (!hubIndependentDialog || !gr) return;
        var savedModelSpec = null;
        try { savedModelSpec = JSON.parse(sessionStorage.getItem("independentModelSpec") || "null"); } catch (e) {}
        hubIndependentDialog.messageChild(JSON.stringify({
          type: "INDEPENDENT_DATA",
          payload: {
            headers: gr.values[0] || [],
            rows: gr.values.slice(1),
            address: gr.address || "",
            savedModelSpec: savedModelSpec
          }
        }));
      };
      setTimeout(sendIndependentData, 550);
      hubIndependentDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendIndependentData();
          } else if (msg.action === "independentModel") {
            sessionStorage.setItem("independentModelSpec", JSON.stringify(msg.data || msg.payload || {}));
            try { hubIndependentDialog.close(); } catch (e) {}
            hubIndependentDialog = null;
            window.location.href = "./independent/independent.html?v=" + Date.now() + "&fromHub=1&autoConfig=1&directDialog=1&openResults=1";
          } else if (msg.action === "close") {
            try { hubIndependentDialog.close(); } catch (e) {}
            hubIndependentDialog = null;
            finishHubIndependentFlow();
          }
        } catch (e) {}
      });
      hubIndependentDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubIndependentDialog = null;
        finishHubIndependentFlow();
      });
    }
  );
  return true;
}

function openCorrelationConfigFromHub() {
  var gr = getGlobalRangePayload();
  if (!gr) return false;
  hubCorrelationFlowActive = true;
  setSelectedModuleCard("correlations", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "correlations/correlation-config.html?v=" + Date.now(),
    { height: 88, width: 25, displayInIframe: false },
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        finishHubCorrelationFlow();
        return;
      }
      hubCorrelationDialog = res.value;
      var sendCorrelationData = function () {
        if (!hubCorrelationDialog || !gr) return;
        hubCorrelationDialog.messageChild(JSON.stringify({
          type: "CORRELATION_DATA",
          payload: { values: gr.values, address: gr.address || "" }
        }));
      };
      setTimeout(sendCorrelationData, 550);
      hubCorrelationDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendCorrelationData();
          } else if (msg.action === "runAnalysis") {
            sessionStorage.setItem("correlationHubRunData", JSON.stringify(msg.data || {}));
            try { hubCorrelationDialog.close(); } catch (e) {}
            hubCorrelationDialog = null;
            window.location.href = "./correlations/correlations.html?v=" + Date.now() + "&fromHub=1&autoConfig=1&directDialog=1&openResults=1";
          } else if (msg.action === "close") {
            try { hubCorrelationDialog.close(); } catch (e) {}
            hubCorrelationDialog = null;
            finishHubCorrelationFlow();
          }
        } catch (e) {}
      });
      hubCorrelationDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubCorrelationDialog = null;
        finishHubCorrelationFlow();
      });
    }
  );
  return true;
}

function openBuilderDialogFromHub(options) {
  var gr = getGlobalRangePayload();
  if (!gr) return false;
  setSelectedModuleCard(options.moduleId, true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + options.dialogPath + (options.dialogPath.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now(),
    options.dialogOptions || { height: 88, width: 25, displayInIframe: false },
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        setSelectedModuleCard(options.moduleId, false);
        return;
      }
      var dlg = res.value;
      var sendPayload = function () {
        if (!dlg) return;
        dlg.messageChild(JSON.stringify({
          type: options.dataType,
          payload: options.payloadBuilder ? options.payloadBuilder(gr) : {}
        }));
      };
      setTimeout(sendPayload, options.initialDelayMs || 550);
      if (options.retryDelayMs) setTimeout(sendPayload, options.retryDelayMs);
      dlg.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendPayload();
            return;
          }
          var modelActions = options.modelActions || [];
          if (modelActions.indexOf(msg.action) >= 0) {
            if (typeof options.onModel === "function") options.onModel(msg);
            try { dlg.close(); } catch (e) {}
            dlg = null;
            setTimeout(function () {
              window.location.href = options.nextUrl();
            }, options.nextDelayMs || 380);
            return;
          }
          var closeActions = options.closeActions || ["close"];
          if (closeActions.indexOf(msg.action) >= 0) {
            try { dlg.close(); } catch (e) {}
            dlg = null;
            setSelectedModuleCard(options.moduleId, false);
          }
        } catch (e) {}
      });
      dlg.addEventHandler(Office.EventType.DialogEventReceived, function () {
        dlg = null;
        setSelectedModuleCard(options.moduleId, false);
      });
    }
  );
  return true;
}

function nextModuleResultUrl(moduleId) {
  return "./" + moduleId + "/" + moduleId + ".html?v=" + Date.now() + "&fromHub=1&autoConfig=1&directDialog=1&openResults=1";
}

function openDependentConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "dependent",
    dialogPath: "dependent/dependent-input.html",
    dialogOptions: { height: 88, width: 25, displayInIframe: false },
    dataType: "DEPENDENT_DATA",
    payloadBuilder: function (gr) {
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem("dependentModelSpec") || "null"); } catch (e) {}
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", savedModelSpec: saved };
    },
    modelActions: ["dependentModel"],
    onModel: function (msg) {
      sessionStorage.setItem("dependentModelSpec", JSON.stringify(msg.data || msg.payload || {}));
    },
    nextUrl: function () { return nextModuleResultUrl("dependent"); }
  });
}

function openFactorConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "factor",
    dialogPath: "factor/factor-input.html",
    dialogOptions: { height: 88, width: 25, displayInIframe: false },
    dataType: "FACTOR_DATA",
    payloadBuilder: function (gr) {
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem("factorModelSpec") || "null"); } catch (e) {}
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", analysisMode: "factor", savedModelSpec: saved };
    },
    modelActions: ["factorModel", "regressionModel"],
    onModel: function (msg) {
      var spec = msg.payload || msg.data || {};
      spec.analysisMode = "factor";
      sessionStorage.setItem("factorModelSpec", JSON.stringify(spec));
    },
    nextUrl: function () { return nextModuleResultUrl("factor"); },
    nextDelayMs: 450
  });
}

function openLogisticConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "logistic",
    dialogPath: "logistic/logistic-input.html",
    dialogOptions: { height: 88, width: 25, displayInIframe: false },
    dataType: "LOGISTIC_DATA",
    payloadBuilder: function (gr) {
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem("logisticModelSpec") || "null"); } catch (e) {}
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", analysisMode: "logistic", savedModelSpec: saved };
    },
    modelActions: ["logisticModel", "regressionModel"],
    onModel: function (msg) {
      var spec = msg.payload || msg.data || {};
      spec.analysisMode = "logistic";
      sessionStorage.setItem("logisticModelSpec", JSON.stringify(spec));
    },
    nextUrl: function () { return nextModuleResultUrl("logistic"); },
    nextDelayMs: 450
  });
}

function openPcaConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "pca",
    dialogPath: "factor/factor-input.html?mode=pca",
    dialogOptions: { height: 90, width: 30, displayInIframe: false },
    dataType: "FACTOR_DATA",
    payloadBuilder: function (gr) {
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem("pcaModelSpec") || "null"); } catch (e) {}
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", analysisMode: "pca", savedModelSpec: saved };
    },
    modelActions: ["factorModel", "regressionModel"],
    onModel: function (msg) {
      var spec = msg.payload || msg.data || {};
      spec.analysisMode = "pca";
      sessionStorage.setItem("pcaModelSpec", JSON.stringify(spec));
    },
    nextUrl: function () { return nextModuleResultUrl("pca"); },
    nextDelayMs: 450
  });
}

function openMixedConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "mixed",
    dialogPath: "mixed/mixed-input.html",
    dialogOptions: { height: 92, width: 30, displayInIframe: false },
    dataType: "MIXED_DATA",
    payloadBuilder: function (gr) {
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem("mixedModelSpec") || "null"); } catch (e) {}
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", savedModelSpec: saved };
    },
    modelActions: ["mixedModel"],
    onModel: function (msg) {
      sessionStorage.setItem("mixedModelSpec", JSON.stringify(msg.payload || msg.data || {}));
    },
    nextUrl: function () { return nextModuleResultUrl("mixed"); },
    nextDelayMs: 500
  });
}

function openMetaConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "meta-analysis",
    dialogPath: "meta-analysis/meta-input.html",
    dialogOptions: { height: 88, width: 25, displayInIframe: false },
    dataType: "META_DATA",
    payloadBuilder: function (gr) {
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem("metaModelSpec") || "null"); } catch (e) {}
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", savedSpec: saved };
    },
    modelActions: ["metaModel"],
    onModel: function (msg) {
      sessionStorage.setItem("metaModelSpec", JSON.stringify(msg.spec || msg.payload || msg.data || {}));
    },
    nextUrl: function () { return nextModuleResultUrl("meta-analysis"); }
  });
}

function buildClusterNumericCandidates(gr, threshold) {
  var values = (gr && gr.values) || [];
  if (!values.length) return [];
  var headers = values[0] || [];
  var rows = values.slice(1);
  var th = isFinite(Number(threshold)) ? Number(threshold) : 0.8;
  var out = [];
  headers.forEach(function (h, j) {
    var num = 0, nm = 0;
    rows.forEach(function (r) {
      var v = r[j];
      if (v === null || v === undefined || v === "") return;
      nm++;
      var n = Number(v);
      if (isFinite(n)) num++;
    });
    if (nm > 0 && num / nm >= th) out.push({ index: j, label: String(h || ("V" + (j + 1))) });
  });
  return out;
}

function openClusterConfigFromHub() {
  var gr = getGlobalRangePayload();
  if (!gr) return false;
  setSelectedModuleCard("cluster", true);
  fetch("./cluster/cluster.module.json?v=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (moduleConfig) {
      if (!moduleConfig) throw new Error("cluster.module.json missing");
      Office.context.ui.displayDialogAsync(
        getDialogsBaseUrl() + "cluster/cluster-setup-dialog.html?v=" + Date.now(),
        {
          height: Number((moduleConfig.dialog && moduleConfig.dialog.setupHeightPercent) || 66),
          width: Number((moduleConfig.dialog && moduleConfig.dialog.setupWidthPercent) || 56),
          displayInIframe: false
        },
        function (res) {
          if (res.status === Office.AsyncResultStatus.Failed) {
            setSelectedModuleCard("cluster", false);
            return;
          }
          var dlg = res.value;
          var sendInit = function () {
            if (!dlg) return;
            var savedClusterSpec = null;
            try { savedClusterSpec = JSON.parse(sessionStorage.getItem("clusterSpec") || "null"); } catch (e) {}
            dlg.messageChild(JSON.stringify({
              action: "clusterSetupInit",
              payload: {
                moduleConfig: moduleConfig,
                rangeAddress: gr.address || "",
                dataRows: Math.max(0, (gr.values || []).length - 1),
                dataCols: ((gr.values && gr.values[0]) || []).length,
                variableCandidates: buildClusterNumericCandidates(gr, moduleConfig.analysis && moduleConfig.analysis.numericColumnThreshold),
                savedSpec: savedClusterSpec
              }
            }));
          };
          setTimeout(sendInit, 600);
          dlg.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
            try {
              var msg = JSON.parse(arg.message || "{}");
              if (msg.action === "requestClusterSetup") sendInit();
              else if (msg.action === "clusterSetupRun") {
                sessionStorage.setItem("clusterSpec", JSON.stringify(msg.spec || msg.payload || {}));
                try { dlg.close(); } catch (e) {}
                dlg = null;
                setTimeout(function () {
                  window.location.href = nextModuleResultUrl("cluster");
                }, 480);
              } else if (msg.action === "clusterSetupClose" || msg.action === "close") {
                try { dlg.close(); } catch (e) {}
                dlg = null;
                setSelectedModuleCard("cluster", false);
              }
            } catch (e) {}
          });
          dlg.addEventHandler(Office.EventType.DialogEventReceived, function () {
            dlg = null;
            setSelectedModuleCard("cluster", false);
          });
        }
      );
    })
    .catch(function () {
      setSelectedModuleCard("cluster", false);
    });
  return true;
}

function navigateToModule(id) {
  var gr = getGlobalRangePayload();
  if (id === "univariate" && gr && gr.values && gr.values.length >= 2) {
    if (openUnivariateConfigFromHub()) return;
  }
  if (id === "regression" && gr && gr.values && gr.values.length >= 2) {
    if (openRegressionConfigFromHub()) return;
  }
  if (id === "anova" && gr && gr.values && gr.values.length >= 2) {
    if (openAnovaConfigFromHub()) return;
  }
  if (id === "independent" && gr && gr.values && gr.values.length >= 2) {
    if (openIndependentConfigFromHub()) return;
  }
  if (id === "correlations" && gr && gr.values && gr.values.length >= 2) {
    if (openCorrelationConfigFromHub()) return;
  }
  if (id === "dependent" && gr && gr.values && gr.values.length >= 2) {
    if (openDependentConfigFromHub()) return;
  }
  if (id === "factor" && gr && gr.values && gr.values.length >= 2) {
    if (openFactorConfigFromHub()) return;
  }
  if (id === "logistic" && gr && gr.values && gr.values.length >= 2) {
    if (openLogisticConfigFromHub()) return;
  }
  if (id === "pca" && gr && gr.values && gr.values.length >= 2) {
    if (openPcaConfigFromHub()) return;
  }
  if (id === "meta-analysis" && gr && gr.values && gr.values.length >= 2) {
    if (openMetaConfigFromHub()) return;
  }
  if (id === "mixed" && gr && gr.values && gr.values.length >= 2) {
    if (openMixedConfigFromHub()) return;
  }
  if (id === "cluster" && gr && gr.values && gr.values.length >= 2) {
    if (openClusterConfigFromHub()) return;
  }
  var url = "./" + id + "/" + id + ".html?v=" + Date.now() + "&fromHub=1";
  if (gr && gr.values && gr.values.length >= 2) url += "&autoConfig=1&directDialog=1";
  window.location.href = url;
}

function showAdvisor() {
  window.alert(
    "AI Test Advisor coming soon!\n\nIt will guide you to the right analysis based on your data type and research goal."
  );
}

function showError(msg) {
  const list = document.getElementById("categoryTiles");
  if (list) {
    list.innerHTML =
      '<div style="text-align:center;padding:24px;color:#ef4444;font-size:12px;">' +
      '<i class="fa-solid fa-triangle-exclamation" style="font-size:28px;margin-bottom:10px;display:block;"></i>' +
      escapeHtml(msg) +
      "</div>";
  }
}

window.navigateToModule = navigateToModule;
window.filterModules = filterModules;
window.showAdvisor = showAdvisor;

Office.onReady(function(info) {
  if (info.host !== Office.HostType.Excel) {
    showError("This add-in is designed for Excel only.");
    return;
  }
  loadModulesConfig()
    .then(function(list) {
      MODULES = ensureClusterModule(list);
      renderCategoryTiles("");
    })
    .catch(function(err) {
      console.error("Hub config load failed:", err);
      showError("Could not load modules.config.json. Check the task pane URL and network.");
    });
});
