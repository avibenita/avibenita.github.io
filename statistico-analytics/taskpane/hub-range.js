/* global Office, Excel, document, StatisticoGlobalRange */
/**
 * Hub-only: compact Active Range bar; persists via StatisticoGlobalRange.
 */
(function () {
  var rangeMode = "used";
  var lastPromptBindingId = null;

  var MODE_LABELS = {
    prompt: "Sheet picker",
    used: "Active region",
    selection: "Current selection",
    named: "Named range"
  };

  function hubSyncRangeModeUI(mode) {
    mode = mode || "used";
    ["hubPickPrompt", "hubPickSelection", "hubPickUsed", "hubPickNamed"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      var active =
        (id === "hubPickPrompt" && mode === "prompt") ||
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
    if (el) el.textContent = "Active";
  }

  function setRangeMode(mode) {
    rangeMode = mode;
    hubSyncRangeModeUI(mode);
    if (mode === "used") autoDetectRange();
    else if (mode === "selection") useSelection();
    else if (mode === "prompt") pickRangeOnSheet();
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

  function releasePromptBinding(bindingId) {
    if (!bindingId || !Office.context.document.bindings) return;
    try {
      Office.context.document.bindings.releaseByIdAsync(bindingId, function () {});
    } catch (e) {}
  }

  /**
   * Opens Excel’s built-in Select Data prompt so the user can drag/type a range.
   * Reads address + values via the Excel binding API, then releases the binding.
   */
  function pickRangeOnSheet() {
    if (!Office.context.document || !Office.context.document.bindings) {
      showRangeState("Range picker unavailable in this host", true);
      return;
    }
    closeRangePicker();
    showRangeState("Select a range in Excel…", false);

    if (lastPromptBindingId) {
      releasePromptBinding(lastPromptBindingId);
      lastPromptBindingId = null;
    }

    var bindingId = "statisticoRange_" + Date.now();
    Office.context.document.bindings.addFromPromptAsync(
      Office.BindingType.Matrix,
      {
        id: bindingId,
        promptText: "Select the data range for Statistico (header row + data)."
      },
      function (result) {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          var msg =
            (result.error && result.error.message) ||
            "Range selection cancelled";
          console.error("addFromPromptAsync:", msg);
          /* User cancel should not wipe a previously valid range. */
          var gr = window.StatisticoGlobalRange && StatisticoGlobalRange.load();
          if (gr && gr.values && gr.values.length >= 2) {
            rangeMode = gr.mode || rangeMode;
            hubSyncRangeModeUI(rangeMode);
            applyRangeData(gr.values, gr.address);
          } else {
            showRangeState(msg, true);
          }
          return;
        }

        var id = (result.value && result.value.id) || bindingId;
        lastPromptBindingId = id;

        Excel.run(function (ctx) {
          var binding = ctx.workbook.bindings.getItem(id);
          var rng = binding.getRange();
          rng.load(["values", "address"]);
          return ctx.sync().then(function () {
            rangeMode = "prompt";
            hubSyncRangeModeUI("prompt");
            applyRangeData(rng.values, rng.address);
          });
        })
          .catch(function (e) {
            console.warn("prompt binding read failed, trying getDataAsync:", e);
            return readPromptBindingViaCommonApi(id);
          })
          .then(function () {
            releasePromptBinding(id);
            if (lastPromptBindingId === id) lastPromptBindingId = null;
          });
      }
    );
  }

  function readPromptBindingViaCommonApi(id) {
    return new Promise(function (resolve) {
      Office.context.document.bindings.getByIdAsync(id, function (getRes) {
        if (getRes.status !== Office.AsyncResultStatus.Succeeded) {
          showRangeState("Could not read prompted range", true);
          resolve();
          return;
        }
        getRes.value.getDataAsync(
          { coercionType: Office.CoercionType.Matrix },
          function (dataRes) {
            if (dataRes.status !== Office.AsyncResultStatus.Succeeded) {
              showRangeState("Could not read prompted range", true);
              resolve();
              return;
            }
            Excel.run(function (ctx2) {
              var sel = ctx2.workbook.getSelectedRange();
              sel.load("address");
              return ctx2.sync().then(function () {
                rangeMode = "prompt";
                hubSyncRangeModeUI("prompt");
                applyRangeData(dataRes.value, sel.address);
              });
            })
              .catch(function () {
                rangeMode = "prompt";
                hubSyncRangeModeUI("prompt");
                applyRangeData(dataRes.value, "");
              })
              .then(resolve);
          }
        );
      });
    });
  }

  /** Parse Sheet1!A1:B2 / 'My Sheet'!A1:B2 into worksheet + local A1. */
  function resolveAddressParts(address) {
    var raw = (address || "").trim();
    var bang = raw.lastIndexOf("!");
    if (bang <= 0) {
      return { sheetName: null, local: raw };
    }
    var sheetPart = raw.substring(0, bang);
    var local = raw.substring(bang + 1);
    var sheetName = sheetPart;
    if (sheetName.charAt(0) === "'" && sheetName.charAt(sheetName.length - 1) === "'") {
      sheetName = sheetName.slice(1, -1).replace(/''/g, "'");
    }
    return { sheetName: sheetName, local: local };
  }

  /** Re-load a previously prompted range by its stored A1 address. */
  async function loadFromStoredAddress() {
    var gr = window.StatisticoGlobalRange && StatisticoGlobalRange.load();
    var address = gr && gr.address;
    if (!address) {
      showRangeState("No stored sheet range — pick again", true);
      return false;
    }
    showRangeState("Loading…", false);
    try {
      await Excel.run(async function (ctx) {
        var parts = resolveAddressParts(address);
        var rng;
        if (parts.sheetName) {
          rng = ctx.workbook.worksheets.getItem(parts.sheetName).getRange(parts.local);
        } else {
          rng = ctx.workbook.worksheets.getActiveWorksheet().getRange(parts.local);
        }
        rng.load(["values", "address"]);
        await ctx.sync();
        applyRangeData(rng.values, rng.address);
      });
      return true;
    } catch (e) {
      console.warn("loadFromStoredAddress:", e);
      /* Fallback: current selection (prompt usually leaves it selected). */
      await useSelection();
      rangeMode = "prompt";
      hubSyncRangeModeUI("prompt");
      return true;
    }
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

  /**
   * Re-read the range from the LIVE worksheet according to the current mode.
   * Called right before a module launches so edits made while the hub was open
   * are picked up — otherwise modules would run on the snapshot captured when
   * the task pane first loaded.
   */
  async function refreshGlobalRange() {
    try {
      if (rangeMode === "named") {
        var sel = document.getElementById("hubNamedRangeSelect");
        var name = sel && sel.value;
        if (name) {
          await Excel.run(async function (ctx) {
            var rng = ctx.workbook.names.getItem(name).getRange();
            rng.load(["values", "address"]);
            await ctx.sync();
            applyRangeData(rng.values, rng.address);
          });
          return true;
        }
        // Named mode but no resolvable name (e.g. restored session): keep the
        // stored snapshot rather than silently switching to the used range.
        return false;
      }
      if (rangeMode === "prompt") {
        return await loadFromStoredAddress();
      }
      if (rangeMode === "selection") {
        await useSelection();
        return true;
      }
      await autoDetectRange();
      return true;
    } catch (e) {
      console.warn("hubRefreshGlobalRange:", e);
      return false;
    }
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

  /**
   * Read a worksheet range for a module dialog (no hub Active Range bar).
   * mode: "prompt" (Excel Select Data) or "selection" (current Excel selection).
   */
  function captureRangeForDialog(mode, promptText) {
    if (mode === "selection") {
      return Excel.run(function (ctx) {
        var rng = ctx.workbook.getSelectedRange();
        rng.load(["values", "address"]);
        return ctx.sync().then(function () {
          if (!rng.values || rng.values.length < 2) {
            return { error: "Selection too small — needs a header row plus data." };
          }
          rangeMode = "selection";
          applyRangeData(rng.values, rng.address);
          return { values: rng.values, address: rng.address };
        });
      }).catch(function (e) {
        return { error: (e && e.message) || "Could not read the current selection." };
      });
    }

    return new Promise(function (resolve) {
      if (!Office.context.document || !Office.context.document.bindings) {
        resolve({ error: "Range picker unavailable in this host." });
        return;
      }
      if (lastPromptBindingId) {
        releasePromptBinding(lastPromptBindingId);
        lastPromptBindingId = null;
      }
      var bindingId = "statisticoDlgRange_" + Date.now();
      Office.context.document.bindings.addFromPromptAsync(
        Office.BindingType.Matrix,
        {
          id: bindingId,
          promptText: promptText || "Select the table to chart (header row + data)."
        },
        function (result) {
          if (result.status !== Office.AsyncResultStatus.Succeeded) {
            resolve({
              error: (result.error && result.error.message) || "Range selection cancelled."
            });
            return;
          }
          var id = (result.value && result.value.id) || bindingId;
          lastPromptBindingId = id;
          Excel.run(function (ctx) {
            var binding = ctx.workbook.bindings.getItem(id);
            var rng = binding.getRange();
            rng.load(["values", "address"]);
            return ctx.sync().then(function () {
              rangeMode = "prompt";
              applyRangeData(rng.values, rng.address);
              resolve({ values: rng.values, address: rng.address });
            });
          })
            .catch(function () {
              resolve({ error: "Could not read the prompted range." });
            })
            .then(function () {
              releasePromptBinding(id);
              if (lastPromptBindingId === id) lastPromptBindingId = null;
            });
        }
      );
    });
  }

  function showRangeState(text, isError) {
    var addrEl = document.getElementById("hubRangeBadgeText");
    var okIcon = document.getElementById("hubRangeOkIcon");
    var bar = document.getElementById("hubWdataBar");
    var sourceEl = document.getElementById("hubRangeSourceLabel");
    var pending = /loading|detecting|select a range/i.test(text || "");
    if (addrEl) {
      addrEl.textContent = text;
      addrEl.title = text;
    }
    if (okIcon) {
      okIcon.style.display = isError || pending ? "none" : "";
    }
    if (sourceEl) sourceEl.textContent = "Active";
    if (bar) {
      bar.classList.toggle("is-error", !!isError);
      bar.classList.toggle("is-ready", !isError && !pending);
    }
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
      if (rangeMode === "used") {
        // Re-read the live sheet instead of trusting the stored snapshot,
        // which may predate edits made since it was captured.
        await autoDetectRange();
      } else if (rangeMode === "prompt") {
        await loadFromStoredAddress();
      } else {
        applyRangeData(gr.values, gr.address);
      }
    } else {
      await autoDetectRange();
    }
  });

  window.hubSetRangeMode = setRangeMode;
  window.hubPickRangeMode = pickRangeMode;
  window.hubRefreshGlobalRange = refreshGlobalRange;
  window.hubLoadFromNamedRange = loadFromNamedRange;
  window.hubToggleRangePicker = toggleRangePicker;
  window.hubToggleRangeInfo = toggleRangeInfo;
  window.hubCaptureRange = captureRangeForDialog;

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
