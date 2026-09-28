/* global window, sessionStorage, console, Storage */
/**
 * Shared workbook range for the Statistico task pane: pick once on the hub (or any module),
 * restore when opening another module so configuration can open immediately.
 * Browser storage is a cache. A failed write keeps the range in memory for this task pane.
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
})();

(function () {
  var KEY = "statisticoGlobalWorkbookRange_v1";
  var MAX_LEN = 4500000;
  var SAMPLE_SEED = 20260927;
  var memory = null;
  var runOverride = null;

  function pack(values, address, mode, sample) {
    return {
      values: values,
      address: address || "",
      mode: mode || "used",
      sample: sample || null,
      savedAt: Date.now()
    };
  }

  function save(values, address, mode) {
    if (!values || !Array.isArray(values) || values.length < 2) return false;
    memory = pack(values, address, mode, null);
    try {
      var s = JSON.stringify(memory);
      if (s.length > MAX_LEN) {
        console.warn("StatisticoGlobalRange: payload too large for sessionStorage; kept in memory");
        return false;
      }
      sessionStorage.setItem(KEY, s);
      return true;
    } catch (e) {
      console.warn("StatisticoGlobalRange.save", e);
      return false;
    }
  }

  function loadStored() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.values || !Array.isArray(o.values) || o.values.length < 2) return null;
      return pack(o.values, o.address, o.mode, null);
    } catch (e) {
      return null;
    }
  }

  function loadFull() {
    if (memory && memory.values && memory.values.length >= 2) return memory;
    var stored = loadStored();
    if (stored) memory = stored;
    return stored;
  }

  function load() {
    if (runOverride && runOverride.values && runOverride.values.length >= 2) return runOverride;
    return loadFull();
  }

  function beginRun(values, address, mode, sample) {
    if (!values || !Array.isArray(values) || values.length < 2) return null;
    runOverride = pack(values, address, mode, sample || null);
    return runOverride;
  }

  function endRun() {
    runOverride = null;
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
    var rand = mulberry32(seed || SAMPLE_SEED);
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

  function drawSample(values, n, seed) {
    var header = (values && values[0]) || [];
    return [header].concat(drawSampleRows((values || []).slice(1), n, seed));
  }

  function clear() {
    memory = null;
    runOverride = null;
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
      SAMPLE_SEED: SAMPLE_SEED,
      save: save,
      load: load,
      loadFull: loadFull,
      beginRun: beginRun,
      endRun: endRun,
      drawSample: drawSample,
      drawSampleRows: drawSampleRows,
      clear: clear,
      syncRangeModeUI: syncRangeModeUI,
      shouldAutoOpenConfigFromHub: shouldAutoOpenConfigFromHub
    };
  }
})();
