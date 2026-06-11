/**
 * Logistic regression power — UI + Python cloud client.
 * JS collects inputs and displays results; all numeric stats run server-side.
 */
(function (global) {
  "use strict";

  var DEFAULT_URL = "https://logistic-power-625149856249.us-central1.run.app";
  var _currentMode = "epv";
  var _busy = false;
  var _prefill = null;

  function url() {
    return global.LOGISTIC_POWER_URL || DEFAULT_URL;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function num(id, fallback) {
    var el = document.getElementById(id);
    var v = el ? parseFloat(el.value) : NaN;
    return isFinite(v) ? v : fallback;
  }

  function int(id, fallback) {
    return Math.round(num(id, fallback));
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setBand(msg, type) {
    var el = document.getElementById("logPowStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = "logpow-band";
    if (type === "success") el.classList.add("logpow-band--success");
    else if (type === "warning") el.classList.add("logpow-band--warning");
    else if (type === "error") el.classList.add("logpow-band--error");
  }

  function setEngine(msg, spinning) {
    var el = document.getElementById("logPowEngine");
    if (!el) return;
    el.innerHTML = spinning
      ? '<i class="fa-solid fa-spinner fa-spin"></i> ' + esc(msg)
      : '<i class="fa-solid fa-cloud"></i> ' + esc(msg);
  }

  function setBusy(busy) {
    _busy = busy;
    document.querySelectorAll(".logpow-btn--run").forEach(function (b) {
      b.disabled = busy;
    });
  }

  async function callCloud(payload) {
    var response = await fetch(url(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok || !data.ok) {
      throw new Error((data && data.error) || ("HTTP " + response.status));
    }
    return data.results || {};
  }

  function localEpvFallback(payload) {
    var n_events = payload.n_events || 0;
    var n_predictors = payload.n_predictors || 1;
    var target = payload.target_epv || 15;
    var epv = n_events / n_predictors;
    var min_events = Math.ceil(target * n_predictors);
    var adequacy = epv >= target ? "adequate" : (epv >= target * 0.75 ? "borderline" : "insufficient");
    return {
      mode: "epv",
      current_epv: Math.round(epv * 100) / 100,
      min_events_recommended: min_events,
      adequacy: adequacy,
      interpretation: "Local EPV fallback (cloud unavailable).",
      _local: true
    };
  }

  function renderResults(mode, r) {
    if (mode === "epv") {
      setText("logPowEpvCurrent", isFinite(r.current_epv) ? String(r.current_epv) : "—");
      setText("logPowEpvMinEvents", r.min_events_recommended != null ? String(r.min_events_recommended) : "—");
      setText("logPowEpvMinN", r.min_total_n_recommended != null ? String(r.min_total_n_recommended) : "—");
      setText("logPowEpvAdequacy", r.adequacy || "—");
      var bandType = r.adequacy === "adequate" ? "success" : (r.adequacy === "borderline" ? "warning" : "error");
      setBand(r.interpretation || "EPV assessment complete.", bandType);
    } else if (mode === "single_predictor") {
      if (r.task === "required_n") {
        setText("logPowSingleKpi", r.required_n != null ? String(r.required_n) : "—");
        setText("logPowSingleKpiSub", "Required N @ " + Math.round((r.target_power || 0.8) * 100) + "% power");
        setText("logPowSinglePower", isFinite(r.achieved_power) ? (r.achieved_power * 100).toFixed(1) + "%" : "—");
        setText("logPowSingleReq80", "—");
        setText("logPowSingleReq90", "—");
      } else {
        setText("logPowSingleKpi", isFinite(r.observed_power) ? (r.observed_power * 100).toFixed(1) + "%" : "—");
        setText("logPowSingleKpiSub", "Observed power (n=" + (r.n || "—") + ")");
        setText("logPowSinglePower", isFinite(r.observed_power) ? (r.observed_power * 100).toFixed(1) + "%" : "—");
        setText("logPowSingleReq80", r.required_n_80 != null ? String(r.required_n_80) : "—");
        setText("logPowSingleReq90", r.required_n_90 != null ? String(r.required_n_90) : "—");
      }
      setBand(r.interpretation || "Single-predictor analysis complete.", powerBandType(r.observed_power || r.achieved_power));
    } else if (mode === "multivariable_simulation") {
      setText("logPowSimKpi", isFinite(r.simulated_power) ? (r.simulated_power * 100).toFixed(1) + "%" : "—");
      setText("logPowSimKpiSub", (r.n_simulations_valid || 0) + " valid simulations");
      setText("logPowSimMedianP", r.median_p_value != null ? String(r.median_p_value) : "—");
      setText("logPowSimCoef", r.coefficient_index != null ? String(r.coefficient_index) : "—");
      setBand(r.interpretation || "Simulation complete.", powerBandType(r.simulated_power));
    }
    setEngine(r._local ? "Local EPV fallback — deploy Python cloud for full accuracy." : (r.method || "Python cloud function (scipy)"));
  }

  function powerBandType(p) {
    if (!isFinite(p)) return "info";
    if (p >= 0.8) return "success";
    if (p >= 0.6) return "warning";
    return "error";
  }

  function buildPayload(mode) {
    var alpha = num("logPowAlpha", 0.05);
    if (mode === "epv") {
      return {
        mode: "epv",
        n_total: int("logPowEpvNTotal", 0),
        n_events: int("logPowEpvNEvents", 0),
        n_predictors: int("logPowEpvNPred", 1),
        target_epv: num("logPowEpvTarget", 15)
      };
    }
    if (mode === "single_predictor") {
      var task = (document.getElementById("logPowSingleTask") || {}).value || "power";
      var base = {
        mode: "single_predictor",
        task: task,
        outcome_prevalence: num("logPowSinglePrev", 0.3),
        exposure_prevalence: num("logPowSingleExpPrev", 0.5),
        odds_ratio: num("logPowSingleOR", 1.5),
        alpha: alpha
      };
      if (task === "required_n") {
        base.target_power = num("logPowSingleTargetPower", 0.8);
      } else {
        base.n = int("logPowSingleN", 100);
      }
      return base;
    }
    var orRaw = (document.getElementById("logPowSimORs") || {}).value || "";
    var ors = orRaw.split(/[,;\s]+/).map(function (x) { return parseFloat(x); }).filter(isFinite);
    return {
      mode: "multivariable_simulation",
      n: int("logPowSimN", 200),
      n_predictors: int("logPowSimNPred", 3),
      outcome_prevalence: num("logPowSimPrev", 0.25),
      effect_odds_ratios: ors.length ? ors : undefined,
      odds_ratio: num("logPowSimDefaultOR", 1.5),
      predictor_correlation: num("logPowSimRho", 0),
      coefficient_index: int("logPowSimCoefIdx", 1),
      n_simulations: int("logPowSimCount", 500),
      alpha: alpha
    };
  }

  async function runAnalysis() {
    if (_busy) return;
    setBusy(true);
    setBand("Computing via Python cloud function…", "info");
    setEngine("Connecting to Python cloud function…", true);
    var payload = buildPayload(_currentMode);
    try {
      var results = await callCloud(payload);
      renderResults(_currentMode, results);
    } catch (err) {
      if (_currentMode === "epv") {
        var local = localEpvFallback(payload);
        renderResults("epv", local);
        setBand(local.interpretation, local.adequacy === "adequate" ? "success" : "warning");
      } else {
        setBand("Cloud error: " + err.message + ". Deploy logistic-power or check LOGISTIC_POWER_URL.", "error");
        setEngine("Cloud unavailable — see cloud-functions/logistic_power/README.md", false);
      }
    } finally {
      setBusy(false);
    }
  }

  function switchMode(mode) {
    _currentMode = mode;
    document.querySelectorAll(".logpow-mode-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
    document.querySelectorAll(".logpow-panel").forEach(function (p) {
      p.classList.toggle("active", p.dataset.mode === mode);
    });
  }

  function applyPrefill(ctx) {
    if (!ctx) return;
    _prefill = ctx;
    var setVal = function (id, v) {
      var el = document.getElementById(id);
      if (el && v != null && isFinite(v)) el.value = String(v);
    };
    setVal("logPowEpvNTotal", ctx.n_total);
    setVal("logPowEpvNEvents", ctx.n_events);
    setVal("logPowEpvNPred", ctx.n_predictors);
    setVal("logPowSingleN", ctx.n_total);
    setVal("logPowSinglePrev", ctx.prevalence);
    setVal("logPowSingleOR", ctx.top_odds_ratio);
    setVal("logPowSimN", ctx.n_total);
    setVal("logPowSimNPred", ctx.n_predictors);
    setVal("logPowSimPrev", ctx.prevalence);
    if (ctx.odds_ratios && ctx.odds_ratios.length) {
      var el = document.getElementById("logPowSimORs");
      if (el) el.value = ctx.odds_ratios.join(", ");
    }
    setVal("logPowAlpha", ctx.alpha || 0.05);
  }

  function mount(containerId, prefill) {
    var host = document.getElementById(containerId);
    if (!host) return;
    host.innerHTML = [
      '<div class="logpow-shell" id="logPowShell">',
      '  <h2 class="logpow-title"><i class="fa-solid fa-bolt"></i> Logistic Power &amp; Sample Size</h2>',
      '  <p class="logpow-hint">UI runs in the browser; power math runs in Python (scipy + simulation). Choose a mode, adjust inputs, then Calculate.</p>',
      '  <div class="logpow-modes">',
      '    <button type="button" class="logpow-mode-btn active" data-mode="epv" onclick="StatisticoLogisticPower.switchMode(\'epv\')">Mode 1 · EPV planner</button>',
      '    <button type="button" class="logpow-mode-btn" data-mode="single_predictor" onclick="StatisticoLogisticPower.switchMode(\'single_predictor\')">Mode 2 · Single predictor</button>',
      '    <button type="button" class="logpow-mode-btn" data-mode="multivariable_simulation" onclick="StatisticoLogisticPower.switchMode(\'multivariable_simulation\')">Mode 3 · Multivariable sim</button>',
      '  </div>',
      '  <div class="logpow-grid">',
      '    <div class="logpow-card">',
      '      <div class="logpow-card-h">Inputs</div>',
      '      <div class="logpow-card-b">',
      '        <div class="logpow-panel active" data-mode="epv">',
      '          <div class="logpow-row"><span class="logpow-label">Total N</span><input class="logpow-input" id="logPowEpvNTotal" type="number" min="1" step="1" value="100"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Events</span><input class="logpow-input" id="logPowEpvNEvents" type="number" min="0" step="1" value="30"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Predictors (p)</span><input class="logpow-input" id="logPowEpvNPred" type="number" min="1" step="1" value="3"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Target EPV</span><input class="logpow-input" id="logPowEpvTarget" type="number" min="5" max="50" step="1" value="15"></div>',
      '        </div>',
      '        <div class="logpow-panel" data-mode="single_predictor">',
      '          <div class="logpow-row"><span class="logpow-label">Task</span><select class="logpow-select" id="logPowSingleTask"><option value="power">Power from N</option><option value="required_n">Required N</option></select></div>',
      '          <div class="logpow-row"><span class="logpow-label">Sample size N</span><input class="logpow-input" id="logPowSingleN" type="number" min="10" step="1" value="100"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Outcome prevalence</span><input class="logpow-input" id="logPowSinglePrev" type="number" min="0.01" max="0.99" step="0.01" value="0.30"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Exposure prevalence</span><input class="logpow-input" id="logPowSingleExpPrev" type="number" min="0.01" max="0.99" step="0.01" value="0.50"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Odds ratio</span><input class="logpow-input" id="logPowSingleOR" type="number" min="0.01" step="0.01" value="1.50"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Target power</span><input class="logpow-input" id="logPowSingleTargetPower" type="number" min="0.5" max="0.99" step="0.05" value="0.80"></div>',
      '        </div>',
      '        <div class="logpow-panel" data-mode="multivariable_simulation">',
      '          <div class="logpow-row"><span class="logpow-label">Sample size N</span><input class="logpow-input" id="logPowSimN" type="number" min="20" step="1" value="200"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Predictors (p)</span><input class="logpow-input" id="logPowSimNPred" type="number" min="1" max="20" step="1" value="3"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Outcome prevalence</span><input class="logpow-input" id="logPowSimPrev" type="number" min="0.02" max="0.98" step="0.01" value="0.25"></div>',
      '          <div class="logpow-row"><span class="logpow-label">ORs (comma-sep)</span><input class="logpow-input logpow-input--wide" id="logPowSimORs" type="text" placeholder="1.5, 1.2, 2.0" value="1.5, 1.2, 2.0"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Default OR</span><input class="logpow-input" id="logPowSimDefaultOR" type="number" min="0.01" step="0.01" value="1.5"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Predictor ρ</span><input class="logpow-input" id="logPowSimRho" type="number" min="-0.95" max="0.95" step="0.05" value="0.00"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Test coefficient #</span><input class="logpow-input" id="logPowSimCoefIdx" type="number" min="1" max="20" step="1" value="1"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Simulations</span><input class="logpow-input" id="logPowSimCount" type="number" min="50" max="5000" step="50" value="500"></div>',
      '        </div>',
      '        <div class="logpow-row"><span class="logpow-label">α</span><input class="logpow-input" id="logPowAlpha" type="number" min="0.001" max="0.25" step="0.005" value="0.05"></div>',
      '        <div class="logpow-actions">',
      '          <button type="button" class="logpow-btn logpow-btn--primary logpow-btn--run" onclick="StatisticoLogisticPower.run()"><i class="fa-solid fa-calculator"></i> Calculate</button>',
      '          <button type="button" class="logpow-btn logpow-btn--run" onclick="StatisticoLogisticPower.prefillFromModel()"><i class="fa-solid fa-rotate"></i> From model</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="logpow-card">',
      '      <div class="logpow-card-h">Results</div>',
      '      <div class="logpow-card-b">',
      '        <div class="logpow-panel active" data-mode="epv">',
      '          <div class="logpow-kpi" id="logPowEpvCurrent">—</div><div class="logpow-kpi-sub">Current EPV</div>',
      '          <div class="logpow-row"><span class="logpow-label">Min events</span><span class="logpow-value" id="logPowEpvMinEvents">—</span></div>',
      '          <div class="logpow-row"><span class="logpow-label">Min total N</span><span class="logpow-value" id="logPowEpvMinN">—</span></div>',
      '          <div class="logpow-row"><span class="logpow-label">Adequacy</span><span class="logpow-value" id="logPowEpvAdequacy">—</span></div>',
      '        </div>',
      '        <div class="logpow-panel" data-mode="single_predictor">',
      '          <div class="logpow-kpi" id="logPowSingleKpi">—</div><div class="logpow-kpi-sub" id="logPowSingleKpiSub">Power / required N</div>',
      '          <div class="logpow-row"><span class="logpow-label">Power</span><span class="logpow-value" id="logPowSinglePower">—</span></div>',
      '          <div class="logpow-row"><span class="logpow-label">N for 80%</span><span class="logpow-value" id="logPowSingleReq80">—</span></div>',
      '          <div class="logpow-row"><span class="logpow-label">N for 90%</span><span class="logpow-value" id="logPowSingleReq90">—</span></div>',
      '        </div>',
      '        <div class="logpow-panel" data-mode="multivariable_simulation">',
      '          <div class="logpow-kpi" id="logPowSimKpi">—</div><div class="logpow-kpi-sub" id="logPowSimKpiSub">Simulated power</div>',
      '          <div class="logpow-row"><span class="logpow-label">Median p-value</span><span class="logpow-value" id="logPowSimMedianP">—</span></div>',
      '          <div class="logpow-row"><span class="logpow-label">Coefficient tested</span><span class="logpow-value" id="logPowSimCoef">—</span></div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="logpow-band" id="logPowStatus">Run a logistic model, then click Calculate (or From model to pre-fill).</div>',
      '  <div class="logpow-engine" id="logPowEngine"><i class="fa-solid fa-cloud"></i> Python cloud function — scipy.stats.norm + Monte Carlo IRLS</div>',
      '</div>'
    ].join("\n");
    switchMode("epv");
    if (prefill) applyPrefill(prefill);
  }

  global.StatisticoLogisticPower = {
    mount: mount,
    switchMode: switchMode,
    run: runAnalysis,
    applyPrefill: applyPrefill,
    prefillFromModel: function () {
      if (typeof global._logisticPowerPrefillFn === "function") {
        applyPrefill(global._logisticPowerPrefillFn());
        setBand("Inputs updated from current logistic model.", "info");
      }
    },
    setUrl: function (u) { global.LOGISTIC_POWER_URL = u; }
  };
})(typeof window !== "undefined" ? window : globalThis);
