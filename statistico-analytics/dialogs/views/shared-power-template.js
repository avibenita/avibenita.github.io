(function(){
  function esc(v){ return String(v == null ? "" : v); }

  function id(map, key, fallback){
    return esc((map && map[key]) || fallback || "");
  }

  function render(container, opts){
    if (!container) return;
    var o = opts || {};
    var ids = o.ids || {};
    var title = o.title || "Power & Sample Size";

    container.innerHTML = ''
      + '<div class="pwstd-shell">'
      + '  <h2 class="pwstd-title"><i class="fa-solid fa-bolt"></i> ' + esc(title) + '</h2>'
      + '  <div class="pwstd-grid">'
      + '    <div class="pwstd-card">'
      + '      <div class="pwstd-card-h">What is being powered?</div>'
      + '      <div class="pwstd-card-b">'
      + '        <div class="pwstd-row"><span class="pwstd-label">Analysis target</span><span class="pwstd-value" id="' + id(ids, "target", "powTargetWhat") + '">Omnibus test</span></div>'
      + '        <div class="pwstd-row"><span class="pwstd-label">Study design</span><span class="pwstd-value" id="' + id(ids, "design", "powDesignType") + '">Repeated measures</span></div>'
      + '        <div class="pwstd-row"><span class="pwstd-label">Effect size source</span><span class="pwstd-value" id="' + id(ids, "effectSource", "powEffectSource") + '">From observed data</span></div>'
      + '        <div class="pwstd-row"><span class="pwstd-label">Power task</span><select class="pwstd-select" id="' + id(ids, "taskMode", "powTaskMode") + '"><option value="fromN">Power from N</option><option value="requiredN">Required N for target power</option><option value="detectable">Detectable effect size</option></select></div>'
      + '      </div>'
      + '    </div>'
      + '    <div class="pwstd-card">'
      + '      <div class="pwstd-card-h">Observed Data Power</div>'
      + '      <div class="pwstd-card-b">'
      + '        <div class="pwstd-row"><span class="pwstd-label">Achieved power</span><span class="pwstd-value" id="' + id(ids, "observed", "powObserved") + '">...</span></div>'
      + '        <div class="pwstd-row"><span class="pwstd-label">Cohen\'s f</span><span class="pwstd-value" id="' + id(ids, "effectSize", "powEffectSize") + '">...</span></div>'
      + '        <div class="pwstd-row"><span class="pwstd-label">Current sample size</span><span class="pwstd-value" id="' + id(ids, "sampleSize", "powSampleSize") + '">...</span></div>'
      + '        <div class="pwstd-row"><span class="pwstd-label">Alpha</span><span class="pwstd-value" id="' + id(ids, "alpha", "powAlpha") + '">0.050</span></div>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '  <div class="pwstd-grid">'
      + '    <div class="pwstd-card">'
      + '      <div class="pwstd-card-h">Sample Size Planning</div>'
      + '      <div class="pwstd-card-b">'
      + '        <div class="pwstd-row"><span class="pwstd-label">Required N</span><span class="pwstd-value" id="' + id(ids, "requiredN", "powRequired") + '">...</span></div>'
      + '        <div class="pwstd-row"><span class="pwstd-label">Partial η² used</span><span class="pwstd-value" id="' + id(ids, "partialEta", "powPartialEta") + '">...</span></div>'
      + '      </div>'
      + '    </div>'
      + '    <div class="pwstd-card">'
      + '      <div class="pwstd-card-h">Power Targets</div>'
      + '      <div class="pwstd-card-b">'
      + '        <div class="pwstd-targets">'
      + '          <div class="pwstd-chip"><div class="pwstd-chip-label">80%</div><div class="pwstd-chip-value" id="' + id(ids, "req80", "powReq80") + '">...</div></div>'
      + '          <div class="pwstd-chip"><div class="pwstd-chip-label">85%</div><div class="pwstd-chip-value" id="' + id(ids, "req85", "powReq85") + '">...</div></div>'
      + '          <div class="pwstd-chip"><div class="pwstd-chip-label">90%</div><div class="pwstd-chip-value" id="' + id(ids, "req90", "powReq90") + '">...</div></div>'
      + '          <div class="pwstd-chip"><div class="pwstd-chip-label">95%</div><div class="pwstd-chip-value" id="' + id(ids, "req95", "powReq95") + '">...</div></div>'
      + '          <div class="pwstd-chip"><div class="pwstd-chip-label">Custom</div><div class="pwstd-chip-value" id="' + id(ids, "reqCustom", "customRequiredN") + '">--</div></div>'
      + '        </div>'
      + '        <div class="pwstd-custom-row">'
      + '          <input class="pwstd-select" type="number" id="' + id(ids, "customInput", "customPowerInput") + '" min="0.5" max="0.99" step="0.01" value="0.85" style="width:80px;">'
      + '          <button type="button" class="hero-action-btn" onclick="' + esc(o.customHandler || "calculateCustomPower()") + '"><i class="fa-solid fa-sync" id="' + id(ids, "customIcon", "customPowerIcon") + '"></i></button>'
      + '          <span id="' + id(ids, "customStatus", "customPowerStatus") + '" style="display:none;color:var(--text-muted);font-size:12px;"><i class="fa-solid fa-spinner fa-spin"></i> Calculating...</span>'
      + '        </div>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '  <div class="pwstd-band" id="' + id(ids, "status", "powStatusMessage") + '">Run analysis to populate power results.</div>'
      + '  <div class="pwstd-engine"><i class="fa-solid fa-cloud"></i> <span id="' + id(ids, "engineNote", "powEngineNote") + '">Power engine configured per module.</span></div>'
      + '</div>';
  }

  window.StatisticoPowerTemplate = {
    renderById: function(containerId, opts){
      var el = document.getElementById(containerId);
      render(el, opts);
    },
    render: render
  };
})();
