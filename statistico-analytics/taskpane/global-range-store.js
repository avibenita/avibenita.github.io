/* global window, sessionStorage, console */
/**
 * Shared workbook range for the Statistico task pane: pick once on the hub (or any module),
 * restore when opening another module so configuration can open immediately.
 */
(function () {
  var KEY = "statisticoGlobalWorkbookRange_v1";
  var MAX_LEN = 4500000;

  function save(values, address, mode) {
    try {
      if (!values || !Array.isArray(values) || values.length < 2) return false;
      var payload = {
        values: values,
        address: address || "",
        mode: mode || "used",
        savedAt: Date.now()
      };
      var s = JSON.stringify(payload);
      if (s.length > MAX_LEN) {
        console.warn("StatisticoGlobalRange: payload too large for sessionStorage");
        return false;
      }
      sessionStorage.setItem(KEY, s);
      return true;
    } catch (e) {
      console.warn("StatisticoGlobalRange.save", e);
      return false;
    }
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.values || !Array.isArray(o.values) || o.values.length < 2) return null;
      return {
        values: o.values,
        address: o.address || "",
        mode: o.mode || "used"
      };
    } catch (e) {
      return null;
    }
  }

  function clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) {}
  }

  /** True when hub navigation appended ?autoConfig=1 (valid global range at click time). */
  function shouldAutoOpenConfigFromHub() {
    try {
      return new URLSearchParams(window.location.search).get("autoConfig") === "1";
    } catch (e) {
      return false;
    }
  }

  function syncRangeModeUI(mode) {
    mode = mode || "used";
    var map = { named: "lblNamed", used: "lblUsed", selection: "lblSelection" };
    Object.keys(map).forEach(function (m) {
      var el = document.getElementById(map[m]);
      if (el) el.classList.toggle("active", mode === m);
    });
    var inp = document.querySelector('input[name="rm"][value="' + mode + '"]');
    if (inp) inp.checked = true;
    var panel = document.getElementById("namedRangePanel");
    if (panel) panel.style.display = mode === "named" ? "block" : "none";
  }

  if (typeof window !== "undefined") {
    window.StatisticoGlobalRange = {
      KEY: KEY,
      save: save,
      load: load,
      clear: clear,
      syncRangeModeUI: syncRangeModeUI,
      shouldAutoOpenConfigFromHub: shouldAutoOpenConfigFromHub
    };
  }
})();
