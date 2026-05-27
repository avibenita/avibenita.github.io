/* global Office, Excel, document, StatisticoGlobalRange */
/**
 * Hub-only: compact Active Range bar; persists via StatisticoGlobalRange.
 */
(function () {
  var rangeMode = "used";

  var MODE_LABELS = {
    used: "Active region",
    selection: "Selected range",
    named: "Named range"
  };

  function hubSyncRangeModeUI(mode) {
    mode = mode || "used";
    ["hubPickSelection", "hubPickUsed", "hubPickNamed"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      var active =
        (id === "hubPickSelection" && mode === "selection") ||
        (id === "hubPickUsed" && mode === "used") ||
        (id === "hubPickNamed" && mode === "named");
      btn.classList.toggle("is-active", active);
    });
    var namedPanel = document.getElementById("hubNamedRangePanel");
    if (namedPanel) namedPanel.style.display = mode === "named" ? "block" : "none";
    updateSourceLabel();
  }

  function updateSourceLabel() {
    var el = document.getElementById("hubRangeSourceLabel");
    if (!el) return;
    if (rangeMode === "named") {
      var sel = document.getElementById("hubNamedRangeSelect");
      el.textContent = sel && sel.value ? sel.value : MODE_LABELS.named;
    } else {
      el.textContent = MODE_LABELS[rangeMode] || "";
    }
  }

  function setRangeMode(mode) {
    rangeMode = mode;
    hubSyncRangeModeUI(mode);
    if (mode === "used") autoDetectRange();
    else if (mode === "selection") useSelection();
  }

  function pickRangeMode(mode) {
    if (mode === "named") {
      rangeMode = "named";
      hubSyncRangeModeUI("named");
      loadNamedRanges();
      var pop = document.getElementById("hubRangePopover");
      if (pop) pop.classList.add("open");
      return;
    }
    closeRangePicker();
    setRangeMode(mode);
  }

  async function loadNamedRanges() {
    try {
      await Excel.run(async function (ctx) {
        var names = ctx.workbook.names.load("items");
        await ctx.sync();
        var sel = document.getElementById("hubNamedRangeSelect");
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select a named range —</option>';
        names.items.forEach(function (n) {
          var o = document.createElement("option");
          o.value = o.textContent = n.name;
          sel.appendChild(o);
        });
      });
    } catch (e) {
      console.warn("Hub named ranges:", e);
    }
  }

  async function loadFromNamedRange() {
    var name = document.getElementById("hubNamedRangeSelect").value;
    if (!name) return;
    showRangeState("Loading…", false);
    try {
      await Excel.run(async function (ctx) {
        var rng = ctx.workbook.names.getItem(name).getRange();
        rng.load(["values", "address"]);
        await ctx.sync();
        rangeMode = "named";
        applyRangeData(rng.values, rng.address);
        closeRangePicker();
      });
    } catch (e) {
      showRangeState("Could not load: " + e.message, true);
    }
  }

  async function autoDetectRange() {
    showRangeState("Loading…", false);
    try {
      await Excel.run(async function (ctx) {
        var rng = ctx.workbook.worksheets.getActiveWorksheet().getUsedRange();
        rng.load(["values", "address"]);
        await ctx.sync();
        applyRangeData(rng.values, rng.address);
      });
    } catch (e) {
      showRangeState("Could not read worksheet range", true);
    }
  }

  async function useSelection() {
    showRangeState("Loading…", false);
    try {
      await Excel.run(async function (ctx) {
        var rng = ctx.workbook.getSelectedRange();
        rng.load(["values", "address"]);
        await ctx.sync();
        if (!rng.values || rng.values.length < 2) {
          return showRangeState("Selection too small — needs header + data", true);
        }
        applyRangeData(rng.values, rng.address);
      });
    } catch (e) {
      showRangeState("Could not read selection", true);
    }
  }

  async function watchSelection() {
    try {
      await Excel.run(async function (ctx) {
        ctx.workbook.onSelectionChanged.add(async function () {
          if (rangeMode === "selection") await useSelection();
        });
        await ctx.sync();
      });
    } catch (e) {}
  }

  function applyRangeData(values, address) {
    if (!values || values.length < 2) {
      return showRangeState("Need header row + at least 1 data row", true);
    }
    var addr = (address || "").trim();
    showRangeState(addr || "Range loaded", false);
    if (window.StatisticoGlobalRange) {
      StatisticoGlobalRange.save(values, address || "", rangeMode);
    }
  }

  function showRangeState(text, isError) {
    var addrEl = document.getElementById("hubRangeBadgeText");
    var okIcon = document.getElementById("hubRangeOkIcon");
    var bar = document.getElementById("hubWdataBar");
    if (addrEl) addrEl.textContent = text;
    if (okIcon) {
      var pending = /loading|detecting/i.test(text);
      okIcon.style.display = isError || pending ? "none" : "";
    }
    if (bar) bar.classList.toggle("is-error", !!isError);
    updateSourceLabel();
    if (isError && window.StatisticoGlobalRange) {
      StatisticoGlobalRange.clear();
    }
  }

  function toggleRangePicker(event) {
    if (event) event.stopPropagation();
    closeRangeInfo();
    var pop = document.getElementById("hubRangePopover");
    if (!pop) return;
    var opening = !pop.classList.contains("open");
    pop.classList.toggle("open");
    if (opening) hubSyncRangeModeUI(rangeMode);
    else {
      var namedPanel = document.getElementById("hubNamedRangePanel");
      if (namedPanel && rangeMode !== "named") namedPanel.style.display = "none";
    }
  }

  function closeRangePicker() {
    var pop = document.getElementById("hubRangePopover");
    if (pop) pop.classList.remove("open");
  }

  function toggleRangeInfo(event) {
    if (event) event.stopPropagation();
    closeRangePicker();
    var box = document.getElementById("hubRangeInfo");
    if (box) box.classList.toggle("open");
  }

  function closeRangeInfo() {
    var box = document.getElementById("hubRangeInfo");
    if (box) box.classList.remove("open");
  }

  Office.onReady(async function (info) {
    if (info.host !== Office.HostType.Excel) return;
    await loadNamedRanges();
    await watchSelection();
    var gr = window.StatisticoGlobalRange && StatisticoGlobalRange.load();
    if (gr && gr.values && gr.values.length >= 2) {
      rangeMode = gr.mode === "manual" ? "used" : (gr.mode || "used");
      hubSyncRangeModeUI(rangeMode);
      applyRangeData(gr.values, gr.address);
    } else {
      await autoDetectRange();
    }
  });

  window.hubSetRangeMode = setRangeMode;
  window.hubPickRangeMode = pickRangeMode;
  window.hubLoadFromNamedRange = loadFromNamedRange;
  window.hubToggleRangePicker = toggleRangePicker;
  window.hubToggleRangeInfo = toggleRangeInfo;

  document.addEventListener("click", function (ev) {
    var pop = document.getElementById("hubRangePopover");
    var customizeBtn = document.getElementById("hubRangeCustomizeBtn");
    var infoBox = document.getElementById("hubRangeInfo");
    var infoBtn = document.getElementById("hubRangeInfoBtn");
    if (pop && customizeBtn && !pop.contains(ev.target) && !customizeBtn.contains(ev.target)) {
      closeRangePicker();
    }
    if (infoBox && infoBtn && !infoBox.contains(ev.target) && !infoBtn.contains(ev.target)) {
      closeRangeInfo();
    }
  });
})();
