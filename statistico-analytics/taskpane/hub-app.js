/* global Office */
/**
 * Analytics hub: loads module cards from modules.config.json (single source of truth).
 * Ribbon entries are declared separately in manifest.xml — see modules.config.json → ribbonMenu.
 */

let MODULES = [];

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

function makeCard(m) {
  const div = document.createElement("div");
  div.className = "module-card";
  div.onclick = function() { navigateToModule(m.id); };
  div.innerHTML =
    '<div class="module-icon">' +
    '  <i class="fa-solid ' + m.icon + '"></i>' +
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

function navigateToModule(id) {
  window.location.href = "./" + id + "/" + id + ".html?v=" + Date.now();
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
      MODULES = list;
      renderModules(MODULES);
    })
    .catch(function(err) {
      console.error("Hub config load failed:", err);
      showError("Could not load modules.config.json. Check the task pane URL and network.");
    });
});
