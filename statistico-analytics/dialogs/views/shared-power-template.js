(function(){
  function esc(v){ return String(v == null ? "" : v); }
  function id(map, key, fallback){ return esc((map && map[key]) || fallback || ""); }

  var _customTimer = null;

  var CHIPS = [
    { pct: '80',     key: 'req80',     fallback: 'powReq80'      },
    { pct: '85',     key: 'req85',     fallback: 'powReq85'      },
    { pct: '90',     key: 'req90',     fallback: 'powReq90'      },
    { pct: '95',     key: 'req95',     fallback: 'powReq95'      },
    { pct: 'Custom', key: 'reqCustom', fallback: 'customRequiredN' }
  ];

  function _formatTargetLabel(pct) {
    if (pct === 'Custom') {
      var inp = document.getElementById('customPowerInput');
      var v = inp ? parseFloat(inp.value) : NaN;
      if (isFinite(v)) return Math.round(v * 100) + '%';
      return 'Custom';
    }
    return pct + '%';
  }

  function _updatePlanningCard(pct, n) {
    var label  = document.getElementById('pwstd-reqN-label');
    var reqEl  = document.getElementById('powRequired');
    var target = _formatTargetLabel(pct);
    if (label) label.textContent = 'Required N (' + target + ' target)';
    if (reqEl && n != null) reqEl.textContent = n;
    var selEl = document.getElementById('pwstd-selected-target');
    if (selEl) selEl.textContent = target;
  }

  function _scheduleCustomCompute() {
    var chip = document.querySelector('.pwstd-chip--selected[data-pct="Custom"]');
    if (!chip) return;
    clearTimeout(_customTimer);
    _customTimer = setTimeout(function(){
      if (typeof window.StatisticoPowerTemplate._customComputeFn === 'function') {
        window.StatisticoPowerTemplate._customComputeFn();
      }
    }, 450);
  }

  function render(container, opts){
    if (!container) return;
    var o   = opts || {};
    var ids = o.ids || {};
    var title = o.title || "Power & Sample Size";
    var customHandler = esc(o.customHandler || 'calculateCustomPower()');

    var chipHtml = CHIPS.map(function(c){
      var valueId = id(ids, c.key, c.fallback);
      var isDefault = c.pct === '85';

      if (c.pct === 'Custom') {
        return ''
          + '<div class="pwstd-chip pwstd-chip--selectable pwstd-chip--custom" data-pct="Custom" data-value-id="' + valueId + '"'
          + ' onclick="window.StatisticoPowerTemplate._onChipClick(this)">'
          + '  <div class="pwstd-chip-check"><i class="fa-solid fa-check"></i></div>'
          + '  <div class="pwstd-chip-label">Custom</div>'
          + '  <div class="pwstd-chip-custom-ctrl" onclick="event.stopPropagation()">'
          + '    <input class="pwstd-select pwstd-chip-input" type="number" id="' + id(ids,'customInput','customPowerInput') + '"'
          + ' min="0.5" max="0.99" step="0.01" value="0.85"'
          + ' oninput="window.StatisticoPowerTemplate._onCustomInput()"'
          + ' onclick="event.stopPropagation()">'
          + '    <button type="button" class="pwstd-chip-btn" onclick="event.stopPropagation();' + customHandler + '" title="Recalculate">'
          + '      <i class="fa-solid fa-sync" id="' + id(ids,'customIcon','customPowerIcon') + '"></i>'
          + '    </button>'
          + '  </div>'
          + '  <div class="pwstd-chip-value" id="' + valueId + '">--</div>'
          + '</div>';
      }

      return ''
        + '<div class="pwstd-chip pwstd-chip--selectable' + (isDefault ? ' pwstd-chip--selected' : '') + '"'
        + ' data-pct="' + c.pct + '" data-value-id="' + valueId + '"'
        + ' onclick="window.StatisticoPowerTemplate._onChipClick(this)">'
        + '  <div class="pwstd-chip-check"><i class="fa-solid fa-check"></i></div>'
        + '  <div class="pwstd-chip-label">' + c.pct + '%</div>'
        + '  <div class="pwstd-chip-value" id="' + valueId + '">...</div>'
        + '</div>';
    }).join('\n          ');

    container.innerHTML = [
      '<div class="pwstd-shell pwstd-mode-fromN" id="pwstd-shell">',
      '  <h2 class="pwstd-title"><i class="fa-solid fa-bolt"></i> ' + esc(title) + '</h2>',
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
      '  <div class="pwstd-grid pwstd-grid--technicals">',
      '    <div class="pwstd-card pwstd-card--technicals">',
      '      <div class="pwstd-card-h">Technicals</div>',
      '      <div class="pwstd-card-b pwstd-card-b--technicals">',
      '        <div class="pwstd-row"><span class="pwstd-label">Average correlation among repeated measures</span><span class="pwstd-value" id="' + id(ids,'avgCorrelation','powAvgCorrelation') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Nonsphericity correction ε</span><span class="pwstd-value" id="' + id(ids,'epsilon','powEpsilon') + '">...</span></div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="pwstd-planning-suite" id="pwstd-planning-suite">',
      '  <div class="pwstd-grid pwstd-grid--bottom">',
      '    <div class="pwstd-card pwstd-card--planning" id="pwstd-card-planning">',
      '      <div class="pwstd-card-h" id="pwstd-head-planning">Sample Size Planning</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-row pwstd-for-main">',
      '          <span class="pwstd-label">Selected target</span>',
      '          <span class="pwstd-value" id="pwstd-selected-target">85%</span>',
      '        </div>',
      '        <div class="pwstd-row pwstd-for-main">',
      '          <span class="pwstd-label" id="pwstd-reqN-label">Required N</span>',
      '          <span class="pwstd-value" id="' + id(ids,'requiredN','powRequired') + '">...</span>',
      '        </div>',
      '        <div class="pwstd-row pwstd-for-main">',
      '          <span class="pwstd-label">Partial η² used</span>',
      '          <span class="pwstd-value" id="' + id(ids,'partialEta','powPartialEta') + '">...</span>',
      '        </div>',
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
      '    <div class="pwstd-card pwstd-card--targets" id="pwstd-card-targets">',
      '      <div class="pwstd-card-h">Power Targets — click to select</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-targets">' + chipHtml + '</div>',
      '        <span id="' + id(ids,'customStatus','customPowerStatus') + '" class="pwstd-custom-status"><i class="fa-solid fa-spinner fa-spin"></i> Calculating...</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  </div>',
      '  <div class="pwstd-band" id="' + id(ids,'status','powStatusMessage') + '">Run analysis to populate power results.</div>',
      '  <div class="pwstd-engine"><i class="fa-solid fa-cloud"></i> <span id="' + id(ids,'engineNote','powEngineNote') + '">Power engine configured per module.</span></div>',
      '</div>'
    ].join('\n');

    _syncTaskUI('fromN');
  }

  function _onChipClick(chipEl) {
    document.querySelectorAll('.pwstd-chip--selectable').forEach(function(c){
      c.classList.remove('pwstd-chip--selected');
    });
    chipEl.classList.add('pwstd-chip--selected');

    var pct     = chipEl.getAttribute('data-pct');
    var valueId = chipEl.getAttribute('data-value-id');
    var valEl   = valueId ? document.getElementById(valueId) : null;
    var n       = valEl ? valEl.textContent : '...';

    _updatePlanningCard(pct, n);

    if (pct === 'Custom') {
      var inp = document.getElementById('customPowerInput');
      if (inp) inp.focus();
      _scheduleCustomCompute();
    }
  }

  function _onCustomInput() {
    var customChip = document.querySelector('.pwstd-chip--selected[data-pct="Custom"]');
    if (!customChip) return;
    var valEl = document.getElementById('customRequiredN');
    var n = valEl ? valEl.textContent : '--';
    _updatePlanningCard('Custom', n);
    _scheduleCustomCompute();
  }

  function _onCustomComplete(n) {
    var customChip = document.querySelector('.pwstd-chip--selected[data-pct="Custom"]');
    if (!customChip) return;
    _updatePlanningCard('Custom', n);
  }

  function _syncDefaultChip() {
    var chip = document.querySelector('.pwstd-chip--selected');
    if (!chip) {
      chip = document.querySelector('.pwstd-chip[data-pct="85"]');
      if (chip) chip.classList.add('pwstd-chip--selected');
    }
    if (!chip) return;
    var valueId = chip.getAttribute('data-value-id');
    var valEl   = valueId ? document.getElementById(valueId) : null;
    if (valEl) _updatePlanningCard(chip.getAttribute('data-pct'), valEl.textContent);
  }

  function _syncTaskUI(mode) {
    var shell = document.getElementById('pwstd-shell');
    if (!shell) return;

    shell.classList.remove('pwstd-mode-fromN', 'pwstd-mode-requiredN', 'pwstd-mode-detectable');
    shell.classList.add('pwstd-mode-' + mode);

    var obsCard  = document.getElementById('pwstd-card-observed');
    var obsHead  = document.getElementById('pwstd-head-observed');
    var planCard = document.getElementById('pwstd-card-planning');
    var planHead = document.getElementById('pwstd-head-planning');
    var suite    = document.getElementById('pwstd-planning-suite');
    var targets  = document.getElementById('pwstd-card-targets');

    if (suite) {
      suite.classList.remove('pwstd-planning-suite--active', 'pwstd-planning-suite--dim');
      if (mode === 'requiredN' || mode === 'detectable') {
        suite.classList.add('pwstd-planning-suite--active');
      } else if (mode === 'fromN') {
        suite.classList.add('pwstd-planning-suite--dim');
      }
    }
    if (planCard) planCard.classList.remove('pwstd-card--primary');
    if (targets)  targets.classList.remove('pwstd-card--primary');

    if (mode === 'fromN') {
      _setCard(obsCard,  true);
      if (obsHead)  obsHead.textContent  = 'Observed Data Power';
      if (planHead) planHead.textContent = 'Sample Size Reference';
    } else if (mode === 'requiredN') {
      _setCard(obsCard,  false);
      if (obsHead)  obsHead.textContent  = 'Current Study Power';
      if (planHead) planHead.textContent = 'Sample Size Planning';
    } else if (mode === 'detectable') {
      _setCard(obsCard,  false);
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
      render(document.getElementById(containerId), opts);
    },
    render: render,
    syncTaskUI:       _syncTaskUI,
    syncDefaultChip:  _syncDefaultChip,
    onCustomComplete: _onCustomComplete,
    _customComputeFn: null,
    _onTaskChange:    function(mode){ _syncTaskUI(mode); },
    _onChipClick:     _onChipClick,
    _onCustomInput:   _onCustomInput,
    _computeDetectable: null
  };
})();
