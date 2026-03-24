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
let hubUnivariateFlowActive = false;
const HUB_RESULT_DIALOG_OPTIONS = { height: 90, width: 70, displayInIframe: false };

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
  const t = q.trim().toLowerCase();
  renderModules(t ? MODULES.filter(function(m) { return m.name.toLowerCase().indexOf(t) >= 0; }) : MODULES);
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
  var card = document.querySelector('.module-card[data-module-id="' + moduleId + '"]');
  if (card) card.classList.toggle("selected", !!active);
}

function finishHubUnivariateFlow() {
  hubUnivariateFlowActive = false;
  hubPendingResultsViewUrl = null;
  if (!hubConfigDialog && !hubResultsDialog) setSelectedModuleCard("univariate", false);
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
            var nextResults = message.data;
            sessionStorage.setItem("univariateModelSpec", JSON.stringify(message.spec || {}));
            hubConfigDialog.close();
            hubConfigDialog = null;
            setTimeout(function () {
              openHubUnivariateResults(nextResults);
            }, 380);
          } else if (message.action === "close") {
            hubConfigDialog.close();
            hubConfigDialog = null;
            if (!hubResultsDialog) finishHubUnivariateFlow();
          }
        } catch (e) {}
      });
      hubConfigDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubConfigDialog = null;
        if (!hubResultsDialog) finishHubUnivariateFlow();
      });
    }
  );
  return true;
}

function navigateToModule(id) {
  var gr = getGlobalRangePayload();
  if (id === "univariate" && gr && gr.values && gr.values.length >= 2) {
    if (openUnivariateConfigFromHub()) return;
  }
  var url = "./" + id + "/" + id + ".html?v=" + Date.now() + "&fromHub=1";
  if (gr && gr.values && gr.values.length >= 2) url += "&autoConfig=1";
  window.location.href = url;
}

function showAdvisor() {
  window.alert(
    "AI Test Advisor coming soon!\n\nIt will guide you to the right analysis based on your data type and research goal."
  );
}

function showError(msg) {
  const list = document.getElementById("modulesList");
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
      renderModules(MODULES);
    })
    .catch(function(err) {
      console.error("Hub config load failed:", err);
      showError("Could not load modules.config.json. Check the task pane URL and network.");
    });
});
