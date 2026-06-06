(function(){
  function esc(v){ return String(v == null ? "" : v); }
  function id(map, key, fallback){ return esc((map && map[key]) || fallback || ""); }

  /* IDs for the five standard chips */
  var CHIPS = [
    { pct: '80',     key: 'req80',     fallback: 'powReq80'      },
    { pct: '85',     key: 'req85',     fallback: 'powReq85'      },
    { pct: '90',     key: 'req90',     fallback: 'powReq90'      },
    { pct: '95',     key: 'req95',     fallback: 'powReq95'      },
    { pct: 'Custom', key: 'reqCustom', fallback: 'customRequiredN' }
  ];

  function render(container, opts){
    if (!container) return;
    var o   = opts || {};
    var ids = o.ids || {};
    var title = o.title || "Power & Sample Size";

    /* Build chip HTML */
    var chipHtml = CHIPS.map(function(c){
      var valueId = id(ids, c.key, c.fallback);
      var isDefault = c.pct === '85';
      return '<div class="pwstd-chip pwstd-chip--selectable' + (isDefault ? ' pwstd-chip--selected' : '') + '"'
           + ' data-pct="' + c.pct + '" data-value-id="' + valueId + '"'
           + ' onclick="window.StatisticoPowerTemplate._onChipClick(this)">'
           + '<div class="pwstd-chip-label">' + (c.pct === 'Custom' ? 'Custom' : c.pct + '%') + '</div>'
           + '<div class="pwstd-chip-value" id="' + valueId + '">...</div>'
           + '<div class="pwstd-chip-check"><i class="fa-solid fa-check"></i></div>'
           + '</div>';
    }).join('\n          ');

    container.innerHTML = [
      '<div class="pwstd-shell pwstd-mode-fromN" id="pwstd-shell">',

      /* ── Title ── */
      '  <h2 class="pwstd-title"><i class="fa-solid fa-bolt"></i> ' + esc(title) + '</h2>',

      /* ── Row 1: Context  +  Observed ── */
      '  <div class="pwstd-grid pwstd-grid--top">',

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

      /* Observed Power card – PRIMARY in fromN */
      '    <div class="pwstd-card pwstd-card--observed" id="pwstd-card-observed">',
      '      <div class="pwstd-card-h" id="pwstd-head-observed">Observed Data Power</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-row"><span class="pwstd-label">Achieved power</span><span class="pwstd-value" id="' + id(ids,'observed','powObserved') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Cohen\'s f</span><span class="pwstd-value" id="' + id(ids,'effectSize','powEffectSize') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Current sample size</span><span class="pwstd-value" id="' + id(ids,'sampleSize','powSampleSize') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Alpha</span><span class="pwstd-value" id="' + id(ids,'alpha','powAlpha') + '">0.050</span></div>',
      '      </div>',
      '    </div>',

      '  </div>',

      /* ── Technicals (RM-ANOVA design parameters) ── */
      '  <div class="pwstd-grid pwstd-grid--technicals">',
      '    <div class="pwstd-card pwstd-card--technicals">',
      '      <div class="pwstd-card-h">Technicals</div>',
      '      <div class="pwstd-card-b pwstd-card-b--technicals">',
      '        <div class="pwstd-row"><span class="pwstd-label">Average correlation among repeated measures</span><span class="pwstd-value" id="' + id(ids,'avgCorrelation','powAvgCorrelation') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Nonsphericity correction ε</span><span class="pwstd-value" id="' + id(ids,'epsilon','powEpsilon') + '">...</span></div>',
      '      </div>',
      '    </div>',
      '  </div>',

      /* ── Row 2: Planning  +  Targets ── */
      '  <div class="pwstd-grid pwstd-grid--bottom">',

      /* Planning card – PRIMARY in requiredN & detectable */
      '    <div class="pwstd-card pwstd-card--planning" id="pwstd-card-planning">',
      '      <div class="pwstd-card-h" id="pwstd-head-planning">Sample Size Planning</div>',
      '      <div class="pwstd-card-b">',

      /* main rows (fromN + requiredN) */
      '        <div class="pwstd-row pwstd-for-main">',
      '          <span class="pwstd-label" id="pwstd-reqN-label">Required N</span>',
      '          <span class="pwstd-value" id="' + id(ids,'requiredN','powRequired') + '">...</span>',
      '        </div>',
      '        <div class="pwstd-row pwstd-for-main">',
      '          <span class="pwstd-label">Partial η² used</span>',
      '          <span class="pwstd-value" id="' + id(ids,'partialEta','powPartialEta') + '">...</span>',
      '        </div>',

      /* detectable rows */
      '        <div class="pwstd-row pwstd-for-detectable">',
      '          <span class="pwstd-label">Target power</span>',
      '          <span class="pwstd-value" style="display:flex;gap:6px;align-items:center;min-width:unset;background:none;border:none;padding:0;">',
      '            <input class="pwstd-select" type="number" id="' + id(ids,'detectableTarget','powDetectableTarget') + '" min="0.5" max="0.99" step="0.05" value="0.80" style="width:72px;">',
      '          </span>',
      '        </div>',
      '        <div class="pwstd-row pwstd-for-detectable"><span class="pwstd-label">Current sample size</span><span class="pwstd-value" id="pwstd-det-n">...</span></div>',
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

      /* Targets card */
      '    <div class="pwstd-card pwstd-card--targets" id="pwstd-card-targets">',
      '      <div class="pwstd-card-h">Power Targets — click to select</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-targets">',
      '          ' + chipHtml,
      '        </div>',
      '        <div class="pwstd-custom-row">',
      '          <input class="pwstd-select" type="number" id="' + id(ids,'customInput','customPowerInput') + '" min="0.5" max="0.99" step="0.01" value="0.85" style="width:80px;"'
           + ' oninput="window.StatisticoPowerTemplate._onCustomInput()">',
      '          <button type="button" class="hero-action-btn" onclick="' + esc(o.customHandler || 'calculateCustomPower()') + '"><i class="fa-solid fa-sync" id="' + id(ids,'customIcon','customPowerIcon') + '"></i></button>',
      '          <span id="' + id(ids,'customStatus','customPowerStatus') + '" style="display:none;color:var(--text-muted);font-size:12px;"><i class="fa-solid fa-spinner fa-spin"></i> Calculating...</span>',
      '        </div>',
      '      </div>',
      '    </div>',

      '  </div>',

      '  <div class="pwstd-band" id="' + id(ids,'status','powStatusMessage') + '">Run analysis to populate power results.</div>',
      '  <div class="pwstd-engine"><i class="fa-solid fa-cloud"></i> <span id="' + id(ids,'engineNote','powEngineNote') + '">Power engine configured per module.</span></div>',

      '</div>'
    ].join('\n');

    _syncTaskUI('fromN');
  }

  /* ─── Chip selection ─── */
  function _onChipClick(chipEl) {
    /* Deselect all */
    var all = document.querySelectorAll('.pwstd-chip--selectable');
    all.forEach(function(c){ c.classList.remove('pwstd-chip--selected'); });

    /* Select clicked */
    chipEl.classList.add('pwstd-chip--selected');

    /* Read value and pct from chip */
    var pct     = chipEl.getAttribute('data-pct');
    var valueId = chipEl.getAttribute('data-value-id');
    var valEl   = valueId ? document.getElementById(valueId) : null;
    var n       = valEl ? valEl.textContent : '...';

    _updatePlanningCard(pct, n);

    /* If Custom chip selected, also select the custom input row */
    if (pct === 'Custom') {
      var inp = document.getElementById('customPowerInput');
      if (inp) inp.focus();
    }
  }

  /* Called when custom input changes while Custom chip is selected */
  function _onCustomInput() {
    var customChip = document.querySelector('.pwstd-chip--selected[data-pct="Custom"]');
    if (!customChip) return;
    var valueId = customChip.getAttribute('data-value-id');
    var valEl   = valueId ? document.getElementById(valueId) : null;
    var n       = valEl ? valEl.textContent : '--';
    _updatePlanningCard('Custom', n);
  }

  /* Called by host after custom calculation completes — updates planning card if Custom is selected */
  function _onCustomComplete(n) {
    var customChip = document.querySelector('.pwstd-chip--selected[data-pct="Custom"]');
    if (!customChip) return;
    var inp   = document.getElementById('customPowerInput');
    var pct   = inp ? Math.round(parseFloat(inp.value) * 100) + '%' : 'Custom';
    _updatePlanningCard(pct, n);
  }

  function _updatePlanningCard(pct, n) {
    var label  = document.getElementById('pwstd-reqN-label');
    var reqEl  = document.getElementById('powRequired');
    var suffix = pct === 'Custom' ? 'custom target' : (pct + '% target');
    if (label) label.textContent = 'Required N (' + suffix + ')';
    if (reqEl) reqEl.textContent = n;
  }

  /* Sync initial 85% chip → planning card (called after values are populated) */
  function _syncDefaultChip() {
    var chip = document.querySelector('.pwstd-chip--selected[data-pct="85"]');
    if (!chip) return;
    var valueId = chip.getAttribute('data-value-id');
    var valEl   = valueId ? document.getElementById(valueId) : null;
    if (valEl) _updatePlanningCard('85', valEl.textContent);
  }

  /* ─── Mode sync ─── */
  function _syncTaskUI(mode) {
    var shell = document.getElementById('pwstd-shell');
    if (!shell) return;

    shell.classList.remove('pwstd-mode-fromN', 'pwstd-mode-requiredN', 'pwstd-mode-detectable');
    shell.classList.add('pwstd-mode-' + mode);

    var obsCard  = document.getElementById('pwstd-card-observed');
    var obsHead  = document.getElementById('pwstd-head-observed');
    var planCard = document.getElementById('pwstd-card-planning');
    var planHead = document.getElementById('pwstd-head-planning');

    if (mode === 'fromN') {
      _setCard(obsCard,  true);
      _setCard(planCard, false);
      if (obsHead)  obsHead.textContent  = 'Observed Data Power';
      if (planHead) planHead.textContent = 'Sample Size Reference';

    } else if (mode === 'requiredN') {
      _setCard(obsCard,  false);
      _setCard(planCard, true);
      if (obsHead)  obsHead.textContent  = 'Current Study Power';
      if (planHead) planHead.textContent = 'Sample Size Planning';

    } else if (mode === 'detectable') {
      _setCard(obsCard,  false);
      _setCard(planCard, true);
      if (obsHead)  obsHead.textContent  = 'Study Context';
      if (planHead) planHead.textContent = 'Detectable Effect Planning';
      var nEl  = document.getElementById('powSampleSize');
      var detN = document.getElementById('pwstd-det-n');
      if (detN && nEl) detN.textContent = nEl.textContent;
    }

    var sel = document.getElementById('powTaskMode');
    if (sel && sel.value !== mode) sel.value = mode;
  }

  function _setCard(card, isPrimary) {
    if (!card) return;
    if (isPrimary) card.classList.add('pwstd-card--primary');
    else           card.classList.remove('pwstd-card--primary');
  }

  window.StatisticoPowerTemplate = {
    renderById: function(containerId, opts){
      var el = document.getElementById(containerId);
      render(el, opts);
    },
    render: render,
    syncTaskUI:       _syncTaskUI,
    syncDefaultChip:  _syncDefaultChip,
    onCustomComplete: _onCustomComplete,
    _onTaskChange:    function(mode){ _syncTaskUI(mode); },
    _onChipClick:     _onChipClick,
    _onCustomInput:   _onCustomInput,
    _computeDetectable: null
  };
})();
