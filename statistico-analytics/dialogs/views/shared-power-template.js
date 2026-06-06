(function(){
  function esc(v){ return String(v == null ? "" : v); }
  function id(map, key, fallback){ return esc((map && map[key]) || fallback || ""); }

  function render(container, opts){
    if (!container) return;
    var o = opts || {};
    var ids = o.ids || {};
    var title = o.title || "Power & Sample Size";

    container.innerHTML = [
      '<div class="pwstd-shell pwstd-mode-fromN" id="pwstd-shell">',

      /* ── Title ── */
      '  <h2 class="pwstd-title"><i class="fa-solid fa-bolt"></i> ' + esc(title) + '</h2>',

      /* ── Row 1: Context  +  Primary-result ── */
      '  <div class="pwstd-grid pwstd-grid--top">',

      /* Card: What is being powered? */
      '    <div class="pwstd-card pwstd-card--context">',
      '      <div class="pwstd-card-h">What is being powered?</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-row"><span class="pwstd-label">Analysis target</span><span class="pwstd-value" id="' + id(ids,'target','powTargetWhat') + '">Omnibus test</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Study design</span><span class="pwstd-value" id="' + id(ids,'design','powDesignType') + '">Repeated measures</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Effect size source</span><span class="pwstd-value" id="' + id(ids,'effectSource','powEffectSource') + '">From observed data</span></div>',
      '        <div class="pwstd-row">',
      '          <span class="pwstd-label">Power task</span>',
      '          <select class="pwstd-select" id="' + id(ids,'taskMode','powTaskMode') + '" onchange="window.StatisticoPowerTemplate._onTaskChange(this.value)">',
      '            <option value="fromN">Power from N</option>',
      '            <option value="requiredN">Required N for target power</option>',
      '            <option value="detectable">Detectable effect size</option>',
      '          </select>',
      '        </div>',
      '      </div>',
      '    </div>',

      /* Card: Observed Data Power  (PRIMARY in fromN, secondary otherwise) */
      '    <div class="pwstd-card pwstd-card--observed" id="pwstd-card-observed">',
      '      <div class="pwstd-card-h" id="pwstd-head-observed">Observed Data Power</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-row"><span class="pwstd-label">Achieved power</span><span class="pwstd-value" id="' + id(ids,'observed','powObserved') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Cohen\'s f</span><span class="pwstd-value" id="' + id(ids,'effectSize','powEffectSize') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Current sample size</span><span class="pwstd-value" id="' + id(ids,'sampleSize','powSampleSize') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Alpha</span><span class="pwstd-value" id="' + id(ids,'alpha','powAlpha') + '">0.050</span></div>',
      '      </div>',
      '    </div>',

      '  </div>', /* end top grid */

      /* ── Row 2: Planning / Detectable  +  Power Targets ── */
      '  <div class="pwstd-grid pwstd-grid--bottom">',

      /* Card: Planning / Detectable  (PRIMARY in requiredN & detectable) */
      '    <div class="pwstd-card pwstd-card--planning" id="pwstd-card-planning">',
      '      <div class="pwstd-card-h" id="pwstd-head-planning">Sample Size Planning</div>',
      '      <div class="pwstd-card-b">',

      /* Rows shown in fromN + requiredN modes */
      '        <div class="pwstd-row pwstd-for-main"><span class="pwstd-label" id="pwstd-reqN-label">Required N</span><span class="pwstd-value" id="' + id(ids,'requiredN','powRequired') + '">...</span></div>',
      '        <div class="pwstd-row pwstd-for-main"><span class="pwstd-label">Partial η² used</span><span class="pwstd-value" id="' + id(ids,'partialEta','powPartialEta') + '">...</span></div>',

      /* Rows shown only in detectable mode */
      '        <div class="pwstd-row pwstd-for-detectable">',
      '          <span class="pwstd-label">Target power</span>',
      '          <span class="pwstd-value" style="display:flex;gap:6px;align-items:center;min-width:unset;background:none;border:none;padding:0;">',
      '            <input class="pwstd-select" type="number" id="' + id(ids,'detectableTarget','powDetectableTarget') + '" min="0.5" max="0.99" step="0.05" value="0.80" style="width:72px;">',
      '          </span>',
      '        </div>',
      '        <div class="pwstd-row pwstd-for-detectable">',
      '          <span class="pwstd-label">Current sample size</span>',
      '          <span class="pwstd-value" id="pwstd-det-n">...</span>',
      '        </div>',
      '        <div class="pwstd-row pwstd-for-detectable"><span class="pwstd-label">Min detectable Cohen\'s f</span><span class="pwstd-value" id="' + id(ids,'minF','powMinDetectableF') + '">—</span></div>',
      '        <div class="pwstd-row pwstd-for-detectable"><span class="pwstd-label">Min detectable partial η²</span><span class="pwstd-value" id="' + id(ids,'minEta','powMinDetectableEta') + '">—</span></div>',
      '        <div class="pwstd-row pwstd-for-detectable" style="justify-items:end;">',
      '          <span></span>',
      '          <button type="button" class="hero-action-btn" style="font-size:12px;padding:5px 12px;" onclick="' + esc(o.detectableHandler || "window.StatisticoPowerTemplate._computeDetectable && window.StatisticoPowerTemplate._computeDetectable()") + '">',
      '            <i class="fa-solid fa-calculator"></i>&nbsp;Compute',
      '          </button>',
      '        </div>',

      '      </div>',
      '    </div>',

      /* Card: Power Targets (hidden in detectable mode) */
      '    <div class="pwstd-card pwstd-card--targets" id="pwstd-card-targets">',
      '      <div class="pwstd-card-h">Power Targets</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-targets">',
      '          <div class="pwstd-chip"><div class="pwstd-chip-label">80%</div><div class="pwstd-chip-value" id="' + id(ids,'req80','powReq80') + '">...</div></div>',
      '          <div class="pwstd-chip"><div class="pwstd-chip-label">85%</div><div class="pwstd-chip-value" id="' + id(ids,'req85','powReq85') + '">...</div></div>',
      '          <div class="pwstd-chip"><div class="pwstd-chip-label">90%</div><div class="pwstd-chip-value" id="' + id(ids,'req90','powReq90') + '">...</div></div>',
      '          <div class="pwstd-chip"><div class="pwstd-chip-label">95%</div><div class="pwstd-chip-value" id="' + id(ids,'req95','powReq95') + '">...</div></div>',
      '          <div class="pwstd-chip"><div class="pwstd-chip-label">Custom</div><div class="pwstd-chip-value" id="' + id(ids,'reqCustom','customRequiredN') + '">--</div></div>',
      '        </div>',
      '        <div class="pwstd-custom-row">',
      '          <input class="pwstd-select" type="number" id="' + id(ids,'customInput','customPowerInput') + '" min="0.5" max="0.99" step="0.01" value="0.85" style="width:80px;">',
      '          <button type="button" class="hero-action-btn" onclick="' + esc(o.customHandler || 'calculateCustomPower()') + '"><i class="fa-solid fa-sync" id="' + id(ids,'customIcon','customPowerIcon') + '"></i></button>',
      '          <span id="' + id(ids,'customStatus','customPowerStatus') + '" style="display:none;color:var(--text-muted);font-size:12px;"><i class="fa-solid fa-spinner fa-spin"></i> Calculating...</span>',
      '        </div>',
      '      </div>',
      '    </div>',

      '  </div>', /* end bottom grid */

      /* Status + engine note */
      '  <div class="pwstd-band" id="' + id(ids,'status','powStatusMessage') + '">Run analysis to populate power results.</div>',
      '  <div class="pwstd-engine"><i class="fa-solid fa-cloud"></i> <span id="' + id(ids,'engineNote','powEngineNote') + '">Power engine configured per module.</span></div>',

      '</div>'
    ].join('\n');

    /* Apply initial mode */
    _syncTaskUI('fromN');
  }

  /* ── Mode sync ── */
  function _syncTaskUI(mode) {
    var shell = document.getElementById('pwstd-shell');
    if (!shell) return;

    /* Swap mode class */
    shell.classList.remove('pwstd-mode-fromN', 'pwstd-mode-requiredN', 'pwstd-mode-detectable');
    shell.classList.add('pwstd-mode-' + mode);

    var obsCard      = document.getElementById('pwstd-card-observed');
    var obsHead      = document.getElementById('pwstd-head-observed');
    var planCard     = document.getElementById('pwstd-card-planning');
    var planHead     = document.getElementById('pwstd-head-planning');
    var reqNLabel    = document.getElementById('pwstd-reqN-label');

    if (mode === 'fromN') {
      _setCard(obsCard,  true);
      _setCard(planCard, false);
      if (obsHead)   obsHead.textContent   = 'Observed Data Power';
      if (planHead)  planHead.textContent  = 'Sample Size Reference';
      if (reqNLabel) reqNLabel.textContent = 'Required N (80% target)';

    } else if (mode === 'requiredN') {
      _setCard(obsCard,  false);
      _setCard(planCard, true);
      if (obsHead)   obsHead.textContent   = 'Current Study Power';
      if (planHead)  planHead.textContent  = 'Sample Size Planning';
      if (reqNLabel) reqNLabel.textContent = 'Required N (85% target)';

    } else if (mode === 'detectable') {
      _setCard(obsCard,  false);
      _setCard(planCard, true);
      if (obsHead)   obsHead.textContent   = 'Study Context';
      if (planHead)  planHead.textContent  = 'Detectable Effect Planning';
      /* Mirror current-N from observed card into detectable mirror */
      var nEl  = document.getElementById('powSampleSize');
      var detN = document.getElementById('pwstd-det-n');
      if (detN && nEl) detN.textContent = nEl.textContent;
    }

    /* Sync dropdown */
    var sel = document.getElementById('powTaskMode');
    if (sel && sel.value !== mode) sel.value = mode;
  }

  function _setCard(card, isPrimary) {
    if (!card) return;
    if (isPrimary) card.classList.add('pwstd-card--primary');
    else           card.classList.remove('pwstd-card--primary');
  }

  /* Public API */
  window.StatisticoPowerTemplate = {
    renderById: function(containerId, opts){
      var el = document.getElementById(containerId);
      render(el, opts);
    },
    render: render,
    syncTaskUI: _syncTaskUI,
    _onTaskChange: function(mode){ _syncTaskUI(mode); },
    _computeDetectable: null   /* overridden by host page */
  };
})();
