/* global Office, Excel, document, StatisticoGlobalRange */
/**
 * Hub-only: pick workbook range before choosing a module; persists via StatisticoGlobalRange.
 */
(function () {
  var rangeMode = "used";

  function hubSyncRangeModeUI(mode) {
    mode = mode || "used";
    document.getElementById("hubLblNamed").classList.toggle("active", mode === "named");
    document.getElementById("hubLblUsed").classList.toggle("active", mode === "used");
    document.getElementById("hubLblSelection").classList.toggle("active", mode === "selection");
    var inp = document.querySelector('input[name="hubRm"][value="' + mode + '"]');
    if (inp) inp.checked = true;
    document.getElementById("hubNamedRangePanel").style.display = mode === "named" ? "block" : "none";
  }

  function setRangeMode(mode) {
    rangeMode = mode;
    hubSyncRangeModeUI(mode);
    if (mode === "used") autoDetectRange();
    else if (mode === "selection") useSelection();
  }

  async function loadNamedRanges() {
    try {
      await Excel.run(async function (ctx) {
        var names = ctx.workbook.names.load("items");
        await ctx.sync();
        var sel = document.getElementById("hubNamedRangeSelect");
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
    showRangeBadge("Loading…", false);
    try {
      await Excel.run(async function (ctx) {
        var rng = ctx.workbook.names.getItem(name).getRange();
        rng.load(["values", "address"]);
        await ctx.sync();
        applyRangeData(rng.values, rng.address);
      });
    } catch (e) {
      showRangeBadge("Could not load: " + e.message, true);
    }
  }

  async function autoDetectRange() {
    showRangeBadge("Loading…", false);
    try {
      await Excel.run(async function (ctx) {
        var rng = ctx.workbook.worksheets.getActiveWorksheet().getUsedRange();
        rng.load(["values", "address"]);
        await ctx.sync();
        applyRangeData(rng.values, rng.address);
      });
    } catch (e) {
      showRangeBadge("Could not read worksheet range", true);
    }
  }

  async function useSelection() {
    showRangeBadge("Loading…", false);
    try {
      await Excel.run(async function (ctx) {
        var rng = ctx.workbook.getSelectedRange();
        rng.load(["values", "address"]);
        await ctx.sync();
        if (!rng.values || rng.values.length < 2) {
          return showRangeBadge("Selection too small — needs a header row + data", true);
        }
        applyRangeData(rng.values, rng.address);
      });
    } catch (e) {
      showRangeBadge("Could not read selection", true);
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
      return showRangeBadge("Need at least 2 rows (header + 1 data row)", true);
    }
    var cols = (values[0] || []).length;
    var rows = values.length - 1;
    showRangeBadge((address || "") + "  –  " + rows + " rows × " + cols + " cols", false);
    if (window.StatisticoGlobalRange) {
      StatisticoGlobalRange.save(values, address || "", rangeMode);
    }
    var hint = document.getElementById("hubRangeHint");
    if (hint) {
      hint.textContent =
        "Range saved for all modules. Choose an analysis below — its configuration can open right away.";
    }
  }

  function showRangeBadge(text, isError) {
    var badge = document.getElementById("hubRangeBadge");
    badge.className = "hub-range-badge" + (isError ? " error" : "");
    badge.style.display = "block";
    document.getElementById("hubRangeBadgeText").textContent = text;
    if (isError && window.StatisticoGlobalRange) {
      StatisticoGlobalRange.clear();
    }
    var hint = document.getElementById("hubRangeHint");
    if (hint && isError) {
      hint.textContent = "Pick a range above, then open a module.";
    }
  }

  Office.onReady(async function (info) {
    if (info.host !== Office.HostType.Excel) return;
    await loadNamedRanges();
    await watchSelection();
    var gr = window.StatisticoGlobalRange && StatisticoGlobalRange.load();
    if (gr && gr.values && gr.values.length >= 2) {
      rangeMode = gr.mode || "used";
      hubSyncRangeModeUI(rangeMode);
      applyRangeData(gr.values, gr.address);
    } else {
      await autoDetectRange();
    }
  });

  window.hubSetRangeMode = setRangeMode;
  window.hubLoadFromNamedRange = loadFromNamedRange;
})();
