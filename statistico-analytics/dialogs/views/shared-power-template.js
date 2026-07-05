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

  function renderAnalysisLayout(container, opts) {
    if (!container) return;
    var o = opts || {};
    var ids = o.ids || {};
    var title = o.title || 'Power & Sample Size';
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
          + ' oninput="window.StatisticoPowerTemplate._onCustomInput()" onclick="event.stopPropagation()">'
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
    }).join('\n');

    container.innerHTML = [
      '<div class="pwstd-shell pwstd-shell--analysis pwstd-mode-fromN" id="pwstd-shell" data-pwstd-version="20260705d">',
      '  <header class="pwstd-page-header">',
      '    <h2 class="pwstd-title"><i class="fa-solid fa-bolt"></i> ' + esc(title) + '</h2>',
      '    <p class="pwstd-subtitle">Required N, achieved power, and detectable effect</p>',
      '    <div class="pwstd-header-meta">',
      '      <div class="pwstd-meta-strip">',
      '        <span class="pwstd-meta-chip"><span class="pwstd-meta-k">Analysis</span><span class="pwstd-meta-v" id="' + id(ids,'design','powDesignType') + '">Linear regression</span></span>',
      '        <span class="pwstd-meta-chip"><span class="pwstd-meta-k">Target</span><span class="pwstd-meta-v" id="' + id(ids,'target','powTargetWhat') + '">Global model R²</span></span>',
      '        <span class="pwstd-meta-chip"><span class="pwstd-meta-k">Effect</span><span class="pwstd-meta-v" id="' + id(ids,'effectSource','powEffectSource') + '">Observed R²</span></span>',
      '        <span class="pwstd-meta-chip"><span class="pwstd-meta-k">Alpha</span><span class="pwstd-meta-v" id="' + id(ids,'alpha','powAlpha') + '">0.050</span></span>',
      '      </div>',
      '      <div class="pwstd-task-bar" role="group" aria-label="Power analysis task">',
      '        <span class="pwstd-task-label">Task</span>',
      '        <select class="pwstd-select pwstd-select--task" id="' + id(ids,'taskMode','powTaskMode') + '" onchange="window.StatisticoPowerTemplate._onTaskChange(this.value)">',
      '          <option value="fromN">Power from N</option>',
      '          <option value="requiredN">Required N</option>',
      '          <option value="detectable">Detectable effect</option>',
      '        </select>',
      '      </div>',
      '    </div>',
      '  </header>',
      '  <div class="pwstd-exec pwstd-exec--neutral" id="pwstd-exec-summary">Run a regression model to populate power results.</div>',
      '  <div class="pwstd-metrics-row">',
      '    <div class="pwstd-metric-card"><div class="pwstd-metric-label">Achieved Power</div><div class="pwstd-metric-value" id="' + id(ids,'observed','powObserved') + '">—</div></div>',
      '    <div class="pwstd-metric-card"><div class="pwstd-metric-label">Current N</div><div class="pwstd-metric-value" id="' + id(ids,'sampleSize','powSampleSize') + '">—</div></div>',
      '    <div class="pwstd-metric-card"><div class="pwstd-metric-label">Observed R²</div><div class="pwstd-metric-value" id="pwstd-metric-r2">—</div></div>',
      '    <div class="pwstd-metric-card"><div class="pwstd-metric-label">Effect Size f²</div><div class="pwstd-metric-value" id="' + id(ids,'effectSize','powEffectSize') + '">—</div></div>',
      '  </div>',
      '  <div class="pwstd-grid pwstd-grid--analysis">',
      '    <div class="pwstd-card pwstd-card--planning pwstd-card--primary" id="pwstd-card-planning">',
      '      <div class="pwstd-card-h" id="pwstd-head-planning">Sample Size Planning</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-targets">' + chipHtml + '</div>',
      '        <span id="' + id(ids,'customStatus','customPowerStatus') + '" class="pwstd-custom-status"><i class="fa-solid fa-spinner fa-spin"></i> Calculating...</span>',
      '        <div class="pwstd-planning-stats">',
      '          <div class="pwstd-planning-stat"><span>Selected target</span><strong id="pwstd-selected-target">85%</strong></div>',
      '          <div class="pwstd-planning-stat"><span id="pwstd-reqN-label">Required N (85% target)</span><strong id="' + id(ids,'requiredN','powRequired') + '">—</strong></div>',
      '          <div class="pwstd-planning-stat pwstd-for-main"><span>R² used</span><strong id="' + id(ids,'partialEta','powPartialEta') + '">—</strong></div>',
      '        </div>',
      '        <p class="pwstd-planning-summary" id="pwstd-planning-summary">Select a target power to see required sample size.</p>',
      '        <div class="pwstd-for-detectable">',
      '          <div class="pwstd-row"><span class="pwstd-label">Target power</span><input class="pwstd-select" type="number" id="' + id(ids,'detectableTarget','powDetectableTarget') + '" min="0.5" max="0.99" step="0.05" value="0.80"></div>',
      '          <div class="pwstd-row"><span class="pwstd-label">Current N</span><span class="pwstd-value" id="pwstd-det-n">—</span></div>',
      '          <div class="pwstd-row"><span class="pwstd-label">Min detectable f²</span><span class="pwstd-value" id="' + id(ids,'minF','powMinDetectableF') + '">—</span></div>',
      '          <div class="pwstd-row"><span class="pwstd-label">Min detectable R²</span><span class="pwstd-value" id="' + id(ids,'minEta','powMinDetectableEta') + '">—</span></div>',
      '          <p class="pwstd-det-interpret pwstd-for-detectable" id="pwstd-det-interpret"></p>',
      '          <button type="button" class="hero-action-btn pwstd-det-btn" onclick="' + esc(o.detectableHandler || "window.StatisticoPowerTemplate._computeDetectable && window.StatisticoPowerTemplate._computeDetectable()") + '"><i class="fa-solid fa-calculator"></i> Compute</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="pwstd-card pwstd-card--detectable" id="pwstd-card-detectable">',
      '      <div class="pwstd-card-h">Detectable Effect</div>',
      '      <div class="pwstd-card-b">',
      '        <div class="pwstd-detectable-grid">',
      '          <div class="pwstd-detectable-item"><span>Observed R²</span><strong id="pwstd-r2-observed">—</strong></div>',
      '          <div class="pwstd-detectable-item"><span>Detectable R²</span><strong id="pwstd-r2-detectable">—</strong></div>',
      '        </div>',
      '        <p class="pwstd-r2-insight" id="pwstd-r2-insight">Detectable threshold appears after analysis runs.</p>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="pwstd-r2-compare pwstd-for-r2compare" id="pwstd-r2-compare" hidden></div>',
      '  <div class="pwstd-card pwstd-card--curve">',
      '    <div class="pwstd-card-h">Power Curve</div>',
      '    <div class="pwstd-card-b pwstd-curve-wrap">',
      '      <div class="pwstd-curve-interactive">',
      '        <svg id="pwstd-power-curve-svg" class="pwstd-power-curve" viewBox="0 0 640 260" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Power versus sample size curve"></svg>',
      '        <div id="pwstd-curve-tooltip" class="pwstd-curve-tooltip" hidden></div>',
      '      </div>',
      '      <p class="pwstd-curve-note" id="pwstd-curve-note">Exact noncentral F curve at fixed f² and α — hover to read power at any N.</p>',
      '      <div class="pwstd-curve-legend">',
      '        <span><i class="pwstd-legend-line pwstd-legend-line--curve"></i> Power vs N</span>',
      '        <span><i class="pwstd-legend-line pwstd-legend-line--current"></i> Current N</span>',
      '        <span><i class="pwstd-legend-line pwstd-legend-line--target"></i> Target power</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="pwstd-card pwstd-card--technicals pwstd-tech-panel" id="pwstd-tech-panel">',
      '    <button type="button" class="pwstd-card-h pwstd-card-h--toggle" id="pwstd-tech-panel-toggle" aria-expanded="false" onclick="window.StatisticoPowerTemplate._toggleTechPanel()">',
      '      <i class="fa-solid fa-chevron-right pwstd-tech-chevron"></i><span>Technical Details</span><span class="pwstd-tech-panel-hint">click to expand</span>',
      '    </button>',
      '    <div class="pwstd-card-b pwstd-card-b--technicals" id="pwstd-tech-panel-body" hidden>',
      '      <p class="pwstd-tech-note" id="pwstd-tech-note">Power is calculated using the exact noncentral F distribution for the fixed-model regression test.</p>',
      '      <div class="pwstd-row pwstd-row--formula"><span class="pwstd-label">df formulas</span><span class="pwstd-value pwstd-value--formula" id="' + id(ids,'dfFormula','powDfFormula') + '">df1=p · df2=N−p−1</span></div>',
      '      <div class="pwstd-row"><span class="pwstd-label">Noncentrality λ</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outLambda','powOutLambda') + '">—</span></div>',
      '      <div class="pwstd-row"><span class="pwstd-label">df1</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outDf1','powOutDf1') + '">—</span></div>',
      '      <div class="pwstd-row"><span class="pwstd-label">df2</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outDf2','powOutDf2') + '">—</span></div>',
      '      <div class="pwstd-row"><span class="pwstd-label">Critical F</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outCritF','powOutCritF') + '">—</span></div>',
      '      <div class="pwstd-row"><span class="pwstd-label">Sample size</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outN','powOutN') + '">—</span></div>',
      '      <div class="pwstd-row"><span class="pwstd-label">Actual power</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outPower','powOutPower') + '">—</span></div>',
      '    </div>',
      '  </div>',
      '  <div class="pwstd-band pwstd-band--recommend" id="' + id(ids,'status','powStatusMessage') + '">Run analysis to populate power results.</div>',
      '  <div class="pwstd-engine"><i class="fa-solid fa-calculator"></i> <span id="' + id(ids,'engineNote','powEngineNote') + '">Exact noncentral F — post-hoc power is descriptive; use Required N or Detectable R² for planning.</span></div>',
      '</div>'
    ].join('\n');

    _syncTaskUI('fromN');
    _updateDfFormulaLabel(o);
    _applyVariant(o);
    _syncDefaultChip();
  }

  function render(container, opts){
    if (!container) return;
    var o   = opts || {};
    if (o.layout === 'analysis' || o.variant === 'regression' || o.variant === 'logistic' || o.variant === 'anova') {
      renderAnalysisLayout(container, o);
      return;
    }
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
      '<div class="pwstd-shell pwstd-mode-fromN" id="pwstd-shell" data-pwstd-version="20260609e">',
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
      '  <div class="pwstd-r2-compare pwstd-for-r2compare" id="pwstd-r2-compare" hidden>',
      '    <table class="pwstd-mini-table">',
      '      <thead><tr><th>Metric</th><th>Value</th></tr></thead>',
      '      <tbody>',
      '        <tr><td>Observed R²</td><td id="pwstd-r2-observed">—</td></tr>',
      '        <tr><td>Detectable R²</td><td id="pwstd-r2-detectable">—</td></tr>',
      '      </tbody>',
      '    </table>',
      '    <p class="pwstd-r2-insight" id="pwstd-r2-insight"></p>',
      '  </div>',
      '  <div class="pwstd-grid pwstd-grid--technicals">',
      '    <div class="pwstd-card pwstd-card--technicals pwstd-tech-panel" id="pwstd-tech-panel">',
      '      <button type="button" class="pwstd-card-h pwstd-card-h--toggle" id="pwstd-tech-panel-toggle" aria-expanded="false"',
      '        onclick="window.StatisticoPowerTemplate._toggleTechPanel()">',
      '        <i class="fa-solid fa-chevron-right pwstd-tech-chevron" aria-hidden="true"></i>',
      '        <span>Technicals</span>',
      '        <span class="pwstd-tech-panel-hint">click to expand</span>',
      '      </button>',
      '      <div class="pwstd-card-b pwstd-card-b--technicals" id="pwstd-tech-panel-body" hidden>',
      '        <div class="pwstd-row pwstd-row--engine">',
      '          <span class="pwstd-label">Power engine</span>',
      '          <select class="pwstd-select" id="' + id(ids,'powerMethod','powPowerMethod') + '"',
      '            onchange="window.StatisticoPowerTemplate._onPowerMethodChange()">',
      '            <option value="univariate">Univariate RM-ANOVA</option>',
      '            <option value="gpower_manova">G*Power MANOVA-style</option>',
      '          </select>',
      '        </div>',
      '        <div class="pwstd-row pwstd-row--engine pwstd-row--formula"><span class="pwstd-label">df formulas</span>',
      '          <span class="pwstd-value pwstd-value--formula" id="' + id(ids,'dfFormula','powDfFormula') + '">df1=(k−1)·ε · df2=(N−1)(k−1)·ε</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Average correlation among repeated measures</span><span class="pwstd-value" id="' + id(ids,'avgCorrelation','powAvgCorrelation') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Nonsphericity correction ε</span><span class="pwstd-value" id="' + id(ids,'epsilon','powEpsilon') + '">...</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Noncentrality λ</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outLambda','powOutLambda') + '">—</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">df1</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outDf1','powOutDf1') + '">—</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">df2</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outDf2','powOutDf2') + '">—</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Critical F</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outCritF','powOutCritF') + '">—</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Total sample size</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outN','powOutN') + '">—</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Actual power</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outPower','powOutPower') + '">—</span></div>',
      '        <div class="pwstd-row"><span class="pwstd-label">Pillai V</span><span class="pwstd-value pwstd-value--mono" id="' + id(ids,'outPillaiV','powOutPillaiV') + '">—</span></div>',
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
      '        <p class="pwstd-det-interpret pwstd-for-detectable" id="pwstd-det-interpret"></p>',
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
    _updateDfFormulaLabel(o);
    _applyVariant(o);
  }

  function _setRowLabel(valueId, text) {
    var el = document.getElementById(valueId);
    if (!el) return;
    var row = el.closest('.pwstd-row');
    if (!row) return;
    var lbl = row.querySelector('.pwstd-label');
    if (lbl) lbl.textContent = text;
  }

  function _hidePowerRow(valueId) {
    var el = document.getElementById(valueId);
    if (!el) return;
    var row = el.closest('.pwstd-row');
    if (row) row.style.display = 'none';
  }

  function _applyVariant(opts) {
    var o = opts || {};
    var variant = o.variant || 'rm';
    var shell = document.getElementById('pwstd-shell');
    if (!shell) return;
    shell.setAttribute('data-variant', variant);

    if (variant !== 'regression' && variant !== 'logistic') return;

    var target = document.getElementById('powTargetWhat');
    var design = document.getElementById('powDesignType');
    var source = document.getElementById('powEffectSource');
    if (variant === 'logistic') {
      if (target) target.textContent = o.targetLabel || 'Global logistic model (Nagelkerke R²)';
      if (design) design.textContent = o.designLabel || 'Logistic regression';
      if (source) source.textContent = o.effectSourceLabel || 'From observed Nagelkerke R²';
      _setRowLabel('powPartialEta', 'Nagelkerke R² used');
      _setRowLabel('powMinDetectableEta', 'Min detectable Nagelkerke R²');
    } else {
      if (target) target.textContent = o.targetLabel || 'Global regression model (R²)';
      if (design) design.textContent = o.designLabel || 'Linear regression';
      if (source) source.textContent = o.effectSourceLabel || 'Observed R²';
      _setRowLabel('powPartialEta', 'R² used');
      _setRowLabel('powMinDetectableEta', 'Min detectable R²');
    }

    _setRowLabel('powEffectSize', "Cohen's f²");
    _setRowLabel('powMinDetectableF', "Min detectable Cohen's f²");

    ['powPowerMethod', 'powAvgCorrelation', 'powEpsilon', 'powOutPillaiV'].forEach(_hidePowerRow);

    var dfEl = document.getElementById('powDfFormula');
    if (dfEl) dfEl.textContent = 'df1=p · df2=N−p−1';
    var engine = document.getElementById('powEngineNote');
    if (engine) {
      if (variant === 'logistic') {
        engine.innerHTML = '<i class="fa-solid fa-calculator"></i> Omnibus logistic power (Cohen f² approximation): Nagelkerke R² → f²=R²/(1−R²), λ=N·f², exact noncentral F. Post-hoc power is descriptive.';
      } else {
        engine.innerHTML = '<i class="fa-solid fa-calculator"></i> Exact noncentral F — λ=N·f², f²=R²/(1−R²). Cohen benchmarks: 0.02 small, 0.15 medium, 0.35 large.';
      }
    }
  }

  function _updateDfFormulaLabel(opts) {
    var el = document.getElementById('powDfFormula');
    if (!el) return;
    var shell = document.getElementById('pwstd-shell');
    var v = shell && shell.getAttribute('data-variant');
    if (v === 'regression' || v === 'logistic') {
      el.textContent = 'df1=p · df2=N−p−1';
      return;
    }
    var sel = document.getElementById('powPowerMethod');
    if (!sel) return;
    if (sel.value === 'gpower_manova') {
      el.textContent = 'df1=(k−1)·ε · df2=N−groups−df1+1';
    } else {
      el.textContent = 'df1=(k−1)·ε · df2=(N−1)(k−1)·ε';
    }
  }

  function _onPowerMethodChange() {
    _updateDfFormulaLabel();
    if (typeof window.StatisticoPowerTemplate._recalcFn === 'function') {
      window.StatisticoPowerTemplate._recalcFn();
    }
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

    if (typeof window.StatisticoPowerTemplate._updatePlanningSummaryFn === 'function') {
      window.StatisticoPowerTemplate._updatePlanningSummaryFn();
    }

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
    if (typeof window.StatisticoPowerTemplate._updatePlanningSummaryFn === 'function') {
      window.StatisticoPowerTemplate._updatePlanningSummaryFn();
    }
  }

  function _syncTaskUI(mode) {
    var shell = document.getElementById('pwstd-shell');
    if (!shell) return;

    shell.classList.remove('pwstd-mode-fromN', 'pwstd-mode-requiredN', 'pwstd-mode-detectable');
    shell.classList.add('pwstd-mode-' + mode);

    if (shell.classList.contains('pwstd-shell--analysis')) {
      var planCard = document.getElementById('pwstd-card-planning');
      var detectCard = document.getElementById('pwstd-card-detectable');
      if (planCard) planCard.classList.toggle('pwstd-card--primary', mode !== 'detectable');
      if (detectCard) detectCard.classList.toggle('pwstd-card--primary', mode === 'detectable');
      var planHead = document.getElementById('pwstd-head-planning');
      if (planHead) {
        planHead.textContent = mode === 'detectable' ? 'Detectable Effect Planning' : 'Sample Size Planning';
      }
      var sel = document.getElementById('powTaskMode');
      if (sel && sel.value !== mode) sel.value = mode;
      return;
    }

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
      if (obsHead)  obsHead.textContent  = 'Current Study';
      if (planHead) planHead.textContent = 'Detectable Effect Planning';
      var nEl  = document.getElementById('powSampleSize');
      var detN = document.getElementById('pwstd-det-n');
      if (detN && nEl) detN.textContent = nEl.textContent;
    }

    var sel = document.getElementById('powTaskMode');
    if (sel && sel.value !== mode) sel.value = mode;
  }

  function _toggleTechPanel() {
    var body = document.getElementById('pwstd-tech-panel-body');
    var btn  = document.getElementById('pwstd-tech-panel-toggle');
    var card = document.getElementById('pwstd-tech-panel');
    if (!body) return;
    var open = body.hidden;
    body.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (card) card.classList.toggle('pwstd-tech-panel--open', open);
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
    _onTaskChange:    function(mode){
      _syncTaskUI(mode);
      if (typeof window.StatisticoPowerTemplate._recalcFn === 'function') {
        window.StatisticoPowerTemplate._recalcFn();
      }
    },
    _onChipClick:     _onChipClick,
    _onCustomInput:   _onCustomInput,
    _toggleTechDetails: _toggleTechPanel,
    _onPowerMethodChange: _onPowerMethodChange,
    _toggleTechPanel:   _toggleTechPanel,
    _recalcFn: null,
    _computeDetectable: null,
    _updatePlanningSummaryFn: null,
    getSelectedTargetPower: function() {
      var chip = document.querySelector('.pwstd-chip--selected');
      if (!chip) return { pct: '85%', power: 0.85 };
      var pct = chip.getAttribute('data-pct');
      if (pct === 'Custom') {
        var inp = document.getElementById('customPowerInput');
        var v = inp ? parseFloat(inp.value) : 0.85;
        if (!isFinite(v)) v = 0.85;
        return { pct: Math.round(v * 100) + '%', power: v };
      }
      return { pct: pct + '%', power: parseInt(pct, 10) / 100 };
    }
  };
})();
