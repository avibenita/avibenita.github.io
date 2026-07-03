/**
 * Logistic regression power — UI + Python cloud client.
 * JS collects inputs and displays results; all numeric stats run server-side.
 */
(function (global) {
  "use strict";

  var DEFAULT_URL = "https://logistic-power-359524197306.us-central1.run.app";
  var _currentMode = "epv";
  var _busy = false;
  var _prefill = null;

  var MODE_EXPLAIN = {
    epv: {
      title: "Mode 1 · EPV planner",
      body: "EPV (Events Per Variable) = outcome events ÷ number of predictors. It is a sample-size rule-of-thumb for logistic regression: aim for about 10–15 events per predictor (some use 20 for conservative planning). This mode checks whether your study has enough events relative to model complexity — it does not compute formal statistical power."
    },
    single_predictor: {
      title: "Mode 2 · Single predictor",
      body: "Uses the Hsieh et al. (1999) normal approximation for one binary exposure. Enter prevalence, odds ratio, and α to get observed power at your N, or the N needed for a target power (e.g. 80%). Best when one predictor is the primary hypothesis."
    },
    multivariable_simulation: {
      title: "Mode 3 · Multivariable simulation",
      body: "Monte Carlo power for several predictors. The engine simulates datasets with your assumed odds ratios and predictor correlation, fits logistic models repeatedly, and estimates the chance of detecting a chosen coefficient at α. Use this when the model has multiple covariates or correlated predictors."
    }
  };

  function updateModeExplain(mode) {
    var box = document.getElementById("logPowModeExplain");
    var info = MODE_EXPLAIN[mode] || MODE_EXPLAIN.epv;
    if (!box) return;
    box.innerHTML = [
      '<div class="logpow-mode-explain__title"><i class="fa-solid fa-circle-info"></i> ' + esc(info.title) + '</div>',
      '<p class="logpow-mode-explain__body">' + esc(info.body) + '</p>'
    ].join("");
  }

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

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function pct(v, digits) {
    if (!isFinite(v)) return "—";
    return (v * 100).toFixed(digits == null ? 1 : digits) + "%";
  }

  function adequacyMeta(adequacy) {
    if (adequacy === "adequate") {
      return { type: "success", icon: "fa-circle-check", label: "Adequate", verb: "meets" };
    }
    if (adequacy === "borderline") {
      return { type: "warning", icon: "fa-triangle-exclamation", label: "Borderline", verb: "is close to" };
    }
    if (adequacy === "insufficient") {
      return { type: "error", icon: "fa-circle-xmark", label: "Insufficient", verb: "falls below" };
    }
    return { type: "info", icon: "fa-circle-info", label: "—", verb: "compared to" };
  }

  function powerMeta(p) {
    if (!isFinite(p)) return { type: "info", icon: "fa-circle-info", label: "Unknown", headline: "Power not available" };
    if (p >= 0.9) return { type: "success", icon: "fa-circle-check", label: "Excellent", headline: pct(p) + " power — very likely to detect the effect" };
    if (p >= 0.8) return { type: "success", icon: "fa-circle-check", label: "Good", headline: pct(p) + " power — adequate for most studies" };
    if (p >= 0.6) return { type: "warning", icon: "fa-triangle-exclamation", label: "Moderate", headline: pct(p) + " power — you may miss true effects" };
    if (p >= 0.4) return { type: "error", icon: "fa-circle-xmark", label: "Low", headline: pct(p) + " power — likely to miss true effects" };
    return { type: "error", icon: "fa-circle-xmark", label: "Very low", headline: pct(p) + " power — insufficient for reliable detection" };
  }

  function renderVerdict(id, meta, title, sub) {
    setHtml(id, [
      '<div class="logpow-verdict logpow-verdict--' + meta.type + '">',
      '  <div class="logpow-verdict__icon"><i class="fa-solid ' + esc(meta.icon) + '"></i></div>',
      '  <div class="logpow-verdict__body">',
      '    <p class="logpow-verdict__title">' + esc(title) + '</p>',
      '    <p class="logpow-verdict__sub">' + esc(sub || "") + '</p>',
      '  </div>',
      '</div>'
    ].join(""));
  }

  function renderStatGrid(id, cards) {
    var html = cards.map(function (c) {
      return [
        '<div class="logpow-stat-card">',
        '  <span class="logpow-stat-card__label">' + esc(c.label) + '</span>',
        '  <span class="logpow-stat-card__value">' + esc(c.value) + '</span>',
        c.hint ? ('  <span class="logpow-stat-card__hint">' + esc(c.hint) + '</span>') : "",
        '</div>'
      ].join("");
    }).join("");
    setHtml(id, '<div class="logpow-stat-grid">' + html + '</div>');
  }

  function renderBar(id, current, target, adequacy) {
    if (!isFinite(current) || !isFinite(target) || target <= 0) {
      setHtml(id, "");
      return;
    }
    var ratio = Math.min(1, current / (target * 1.5));
    var targetPos = Math.min(100, (target / (target * 1.5)) * 100);
    var fillClass = adequacy === "adequate" ? "success" : (adequacy === "borderline" ? "warning" : "error");
    setHtml(id, [
      '<div class="logpow-bar-wrap">',
      '  <div class="logpow-bar-labels">',
      '    <span>0 EPV</span>',
      '    <span>Target: ' + esc(String(target)) + '</span>',
      '    <span>' + esc(String(Math.round(target * 1.5))) + '+ EPV</span>',
      '  </div>',
      '  <div class="logpow-bar-track">',
      '    <div class="logpow-bar-fill logpow-bar-fill--' + fillClass + '" style="width:' + (ratio * 100).toFixed(1) + '%"></div>',
      '    <div class="logpow-bar-target" style="left:' + targetPos.toFixed(1) + '%"></div>',
      '  </div>',
      '</div>'
    ].join(""));
  }

  function renderDetailList(id, rows) {
    var items = rows.map(function (r) {
      return '<li><span class="logpow-label">' + esc(r.label) + '</span><span class="logpow-value">' + esc(r.value) + '</span></li>';
    }).join("");
    setHtml(id, '<ul class="logpow-detail-list">' + items + '</ul>');
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
    var n_total = payload.n_total || 0;
    var target = payload.target_epv || 15;
    var epv = n_events / n_predictors;
    var min_events = Math.ceil(target * n_predictors);
    var event_rate = n_total > 0 ? n_events / n_total : null;
    var min_total_n = event_rate && event_rate > 0 ? Math.ceil(min_events / event_rate) : null;
    var adequacy = epv >= target ? "adequate" : (epv >= target * 0.75 ? "borderline" : "insufficient");
    var meta = adequacyMeta(adequacy);
    return {
      mode: "epv",
      n_total: n_total,
      n_events: n_events,
      n_predictors: n_predictors,
      target_epv: target,
      current_epv: Math.round(epv * 100) / 100,
      min_events_recommended: min_events,
      min_total_n_recommended: min_total_n,
      event_rate: event_rate,
      adequacy: adequacy,
      interpretation: "Cloud unavailable — local EPV estimate only. Hard-refresh the page if you still see a CORS error.",
      _local: true,
      _headline: meta.label + ": " + (Math.round(epv * 10) / 10) + " events per predictor (" + meta.verb + " target of " + target + ")"
    };
  }

  function renderEpvResults(r) {
    var meta = adequacyMeta(r.adequacy);
    var epv = r.current_epv;
    var target = r.target_epv || num("logPowEpvTarget", 15);
    var nEvents = r.n_events != null ? r.n_events : int("logPowEpvNEvents", 0);
    var nPred = r.n_predictors != null ? r.n_predictors : int("logPowEpvNPred", 1);
    var headline = r._headline || (
      meta.label + ": " + epv + " events per predictor (" + meta.verb + " your target of " + target + ")"
    );
    var sub = nEvents + " events ÷ " + nPred + " predictors = " + epv + " EPV";

    renderVerdict("logPowEpvVerdict", meta, headline, sub);
    renderStatGrid("logPowEpvStats", [
      { label: "Your EPV", value: isFinite(epv) ? String(epv) : "—", hint: "Events per predictor in this model" },
      { label: "Target EPV", value: String(target), hint: "Common rule-of-thumb minimum" },
      {
        label: "Events needed",
        value: r.min_events_recommended != null ? String(r.min_events_recommended) : "—",
        hint: "Minimum events for target EPV"
      },
      {
        label: "Total N needed",
        value: r.min_total_n_recommended != null ? String(r.min_total_n_recommended) : "—",
        hint: r.event_rate != null ? "At " + pct(r.event_rate, 1) + " event rate" : "Needs event rate from sample"
      }
    ]);
    renderBar("logPowEpvBar", epv, target, r.adequacy);

    var action = "";
    if (r.adequacy === "adequate") {
      action = "Your sample has enough events relative to the number of predictors. EPV is a rule-of-thumb — also check Mode 2 or 3 for formal power.";
    } else if (r.adequacy === "borderline") {
      action = "Consider collecting a few more events or reducing predictors before trusting coefficient estimates.";
    } else {
      action = "Increase events to at least " + (r.min_events_recommended || "?") +
        (r.min_total_n_recommended ? " (about N=" + r.min_total_n_recommended + " total)" : "") +
        ", or reduce the number of predictors.";
    }
    setText("logPowEpvPlain", r.interpretation ? (r.interpretation + " " + action) : action);

    var bandType = meta.type === "info" ? "info" : meta.type;
    setBand(headline + ". " + action, bandType);
  }

  function renderSingleResults(r) {
    var p = r.task === "required_n" ? r.achieved_power : r.observed_power;
    var meta = powerMeta(p);

    if (r.task === "required_n") {
      renderVerdict(
        "logPowSingleVerdict",
        meta,
        "Plan n ≈ " + (r.required_n != null ? r.required_n : "—") + " for " + pct(r.target_power || 0.8, 0) + " power",
        "To detect OR=" + (r.odds_ratio || "—") + " with outcome prevalence " + pct(r.outcome_prevalence, 0) +
          " and exposure prevalence " + pct(r.exposure_prevalence, 0)
      );
      renderStatGrid("logPowSingleStats", [
        { label: "Required N", value: r.required_n != null ? String(r.required_n) : "—", hint: "Total sample size" },
        { label: "Target power", value: pct(r.target_power || 0.8, 0), hint: "What you asked for" },
        { label: "Achieved power", value: pct(r.achieved_power), hint: "At the required N" },
        { label: "Odds ratio", value: r.odds_ratio != null ? String(r.odds_ratio) : "—", hint: "Effect size assumed" }
      ]);
    } else {
      renderVerdict(
        "logPowSingleVerdict",
        meta,
        meta.headline,
        "Single binary predictor · OR=" + (r.odds_ratio || "—") + " · n=" + (r.n || "—") +
          " · α=" + (r.alpha != null ? r.alpha : 0.05)
      );
      renderStatGrid("logPowSingleStats", [
        { label: "Observed power", value: pct(r.observed_power), hint: "At your current sample size" },
        { label: "N for 80% power", value: r.required_n_80 != null ? String(r.required_n_80) : "—", hint: "If you need adequate power" },
        { label: "N for 90% power", value: r.required_n_90 != null ? String(r.required_n_90) : "—", hint: "Higher confidence target" },
        { label: "Odds ratio", value: r.odds_ratio != null ? String(r.odds_ratio) : "—", hint: "Effect being tested" }
      ]);
    }

    renderDetailList("logPowSingleDetails", [
      { label: "Outcome prevalence", value: pct(r.outcome_prevalence, 0) },
      { label: "Exposure prevalence", value: pct(r.exposure_prevalence, 0) },
      { label: "Method", value: r.method || "Hsieh et al. (1999)" }
    ]);
    setText("logPowSinglePlain", r.interpretation || "");
    setBand(r.interpretation || meta.headline, meta.type);
  }

  function renderSimResults(r) {
    var meta = powerMeta(r.simulated_power);
    renderVerdict(
      "logPowSimVerdict",
      meta,
      meta.headline,
      "Monte Carlo test of predictor #" + (r.coefficient_index || "—") +
        " · " + (r.n_simulations_valid || 0) + " valid replications · n=" + (r.n || "—")
    );
    renderStatGrid("logPowSimStats", [
      { label: "Simulated power", value: pct(r.simulated_power), hint: "Share of runs with p < α" },
      { label: "Median p-value", value: r.median_p_value != null ? String(r.median_p_value) : "—", hint: "Typical significance level" },
      { label: "Predictors (p)", value: r.n_predictors != null ? String(r.n_predictors) : "—", hint: "In each simulated model" },
      { label: "Simulations run", value: String(r.n_simulations_valid || 0), hint: "Valid converged fits" }
    ]);
    var ors = (r.effect_odds_ratios || []).join(", ");
    renderDetailList("logPowSimDetails", [
      { label: "Outcome prevalence", value: pct(r.outcome_prevalence, 0) },
      { label: "Predictor correlation (ρ)", value: r.predictor_correlation != null ? String(r.predictor_correlation) : "—" },
      { label: "Assumed ORs", value: ors || "—" },
      { label: "Coefficient tested", value: "#" + (r.coefficient_index || "—") }
    ]);
    setText("logPowSimPlain", r.interpretation || "");
    setBand(r.interpretation || meta.headline, meta.type);
  }

  function renderResults(mode, r) {
    if (mode === "epv") renderEpvResults(r);
    else if (mode === "single_predictor") renderSingleResults(r);
    else if (mode === "multivariable_simulation") renderSimResults(r);

    if (r._local) {
      setEngine("Local EPV estimate — cloud blocked or offline. Refresh page to load latest endpoint.", false);
    } else {
      setEngine(r.method || "Python cloud function (scipy + Monte Carlo)", false);
    }
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
      } else {
        setBand("Cloud error: " + err.message + ". Check network or LOGISTIC_POWER_URL.", "error");
        setEngine("Cloud unavailable — Modes 2 & 3 require the Python service.", false);
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
    document.querySelectorAll(".logpow-result-panel").forEach(function (p) {
      p.classList.toggle("active", p.dataset.mode === mode);
    });
    updateModeExplain(mode);
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

  function resultPanel(mode, inner) {
    return '<div class="logpow-result-panel' + (mode === "epv" ? " active" : "") + '" data-mode="' + mode + '">' + inner + '</div>';
  }

  function mount(containerId, prefill) {
    var host = document.getElementById(containerId);
    if (!host) return;
    host.innerHTML = [
      '<div class="logpow-shell" id="logPowShell">',
      '  <h2 class="logpow-title"><i class="fa-solid fa-bolt"></i> Logistic Power &amp; Sample Size</h2>',
      '  <p class="logpow-hint">Choose a mode, adjust inputs, then Calculate. Results use plain-language verdicts plus key numbers.</p>',
      '  <div class="logpow-modes">',
      '    <button type="button" class="logpow-mode-btn active" data-mode="epv" onclick="StatisticoLogisticPower.switchMode(\'epv\')">Mode 1 · EPV planner</button>',
      '    <button type="button" class="logpow-mode-btn" data-mode="single_predictor" onclick="StatisticoLogisticPower.switchMode(\'single_predictor\')">Mode 2 · Single predictor</button>',
      '    <button type="button" class="logpow-mode-btn" data-mode="multivariable_simulation" onclick="StatisticoLogisticPower.switchMode(\'multivariable_simulation\')">Mode 3 · Multivariable sim</button>',
      '  </div>',
      '  <div class="logpow-mode-explain" id="logPowModeExplain"></div>',
      '  <div class="logpow-grid">',
      '    <div class="logpow-card">',
      '      <div class="logpow-card-h">Inputs</div>',
      '      <div class="logpow-card-b logpow-card-b--inputs">',
      '        <div class="logpow-panel active" data-mode="epv">',
      '          <div class="logpow-row"><span class="logpow-label">Total N</span><input class="logpow-input" id="logPowEpvNTotal" type="number" min="1" step="1" value="100"></div>',
      '          <div class="logpow-row"><span class="logpow-label">Events (Y=1)</span><input class="logpow-input" id="logPowEpvNEvents" type="number" min="0" step="1" value="30"></div>',
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
      '        <div class="logpow-row"><span class="logpow-label">α (significance)</span><input class="logpow-input" id="logPowAlpha" type="number" min="0.001" max="0.25" step="0.005" value="0.05"></div>',
      '        <div class="logpow-actions">',
      '          <button type="button" class="logpow-btn logpow-btn--primary logpow-btn--run" onclick="StatisticoLogisticPower.run()"><i class="fa-solid fa-calculator"></i> Calculate</button>',
      '          <button type="button" class="logpow-btn logpow-btn--run" onclick="StatisticoLogisticPower.prefillFromModel()"><i class="fa-solid fa-rotate"></i> From model</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="logpow-card">',
      '      <div class="logpow-card-h">Results</div>',
      '      <div class="logpow-card-b">',
      resultPanel("epv", [
        '        <div id="logPowEpvVerdict"></div>',
        '        <div id="logPowEpvStats"></div>',
        '        <div id="logPowEpvBar"></div>',
        '        <div class="logpow-plain" id="logPowEpvPlain">Click Calculate to see whether your events-per-predictor ratio is adequate.</div>'
      ].join("\n")),
      resultPanel("single_predictor", [
        '        <div id="logPowSingleVerdict"></div>',
        '        <div id="logPowSingleStats"></div>',
        '        <div id="logPowSingleDetails"></div>',
        '        <div class="logpow-plain" id="logPowSinglePlain">Mode 2 uses the Hsieh single-predictor formula (normal approximation).</div>'
      ].join("\n")),
      resultPanel("multivariable_simulation", [
        '        <div id="logPowSimVerdict"></div>',
        '        <div id="logPowSimStats"></div>',
        '        <div id="logPowSimDetails"></div>',
        '        <div class="logpow-plain" id="logPowSimPlain">Mode 3 simulates datasets and fits logistic models to estimate multivariable power.</div>'
      ].join("\n")),
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="logpow-band" id="logPowStatus">Run a logistic model, click From model, then Calculate.</div>',
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
        setBand("Inputs updated from current logistic model — click Calculate to refresh results.", "info");
      }
    },
    setUrl: function (u) { global.LOGISTIC_POWER_URL = u; }
  };
})(typeof window !== "undefined" ? window : globalThis);
