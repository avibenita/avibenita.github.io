/**
 * Statistico workspace tab navigation — shared init, subtitles, sliding indicator
 */
(function(global) {
  'use strict';

  var DEFAULT_SUBTITLES = {
    'results-overview': 'Executive interpretation',
    'results-detail': 'Statistics & coefficients',
    'pred-overview': 'Observed vs predicted',
    'pred-scenario': 'What-if scenarios',
    'viz-partial': 'How the outcome changes with each predictor',
    'viz-unique': 'Effect after controlling for other predictors',
    'diag-overview': 'Assumption summary',
    'diag-plots': 'QQ & leverage plots',
    'diag-influence': "Cook's distance & flags",
    'ix-summary': 'Interpretation & slopes',
    'ix-viz': 'Interaction plots',
    'ix-details': 'Coefficients & ΔR²',
    overview: 'Executive interpretation',
    technical: 'Statistics & coefficients',
    /* Univariate — section tabs */
    'uni-core': 'Distribution & box plots',
    'uni-group': 'Categorical breakdowns',
    'uni-advanced': 'Normality & tests',
    /* Univariate — view tabs */
    histogram: 'Frequency & shape',
    cdf: 'Cumulative curve',
    percentile: 'Cut points & lookup',
    boxplot: 'Quartiles & outliers',
    kernel: 'Smoothed density',
    normality: 'Formal test battery',
    qqplot: 'Probability plots',
    confidence: 'Mean & median CIs',
    hypothesis: 'Reference value test',
    'by-group-stats': 'Descriptive stats & histograms',
    'by-group-boxplot': 'Compare spread by group',
    'by-group-normality': 'Six tests & NSI by group',
    'roc-thresholds': 'ROC curve & cutoff',
    calibration: 'Observed vs predicted',
    'scenario-engine': 'What-if scenarios',
    'risk-profiles': 'Subgroup comparisons',
    visualization: 'Interaction plots',
    residuals: 'Deviance & Pearson',
    influence: "Cook's & leverage"
  };

  var subtitles = Object.assign({}, DEFAULT_SUBTITLES);
  var initialized = false;

  function getTabKey(btn) {
    return btn.dataset.uniTab || btn.dataset.regTab || btn.dataset.predTab || btn.dataset.vizTab ||
      btn.dataset.diagTab || btn.dataset.ixTab || btn.dataset.sub || '';
  }

  function isSlantBar(bar) {
    return bar && bar.classList && bar.classList.contains('ws-mode-bar--slant');
  }

  function unwrapClusterIfSlant(bar) {
    if (!isSlantBar(bar)) return;
    var cluster = bar.querySelector(':scope > .ws-tab-cluster');
    if (!cluster) return;
    Array.prototype.slice.call(cluster.querySelectorAll('.ws-mode-tab')).forEach(function(tab) {
      bar.insertBefore(tab, cluster);
    });
    cluster.remove();
  }

  function ensureCluster(bar) {
    if (isSlantBar(bar)) return null;
    var looseTabs = Array.prototype.filter.call(bar.children, function(el) {
      return el.classList && el.classList.contains('ws-mode-tab');
    });
    var cluster = bar.querySelector(':scope > .ws-tab-cluster');

    if (cluster && looseTabs.length === 0) {
      if (!cluster.querySelector('.ws-tab-indicator')) {
        var ind = document.createElement('span');
        ind.className = 'ws-tab-indicator';
        ind.setAttribute('aria-hidden', 'true');
        cluster.appendChild(ind);
      }
      return cluster;
    }

    if (cluster && looseTabs.length > 0) cluster.remove();

    if (!looseTabs.length) return cluster || null;

    cluster = document.createElement('div');
    cluster.className = 'ws-tab-cluster';
    looseTabs.forEach(function(tab) { cluster.appendChild(tab); });

    var indicator = document.createElement('span');
    indicator.className = 'ws-tab-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    cluster.appendChild(indicator);

    bar.appendChild(cluster);
    return cluster;
  }

  function isConnectedBar(bar) {
    return bar && bar.classList && bar.classList.contains('ws-mode-bar--connected');
  }

  function ensureConnectedBar(bar) {
    if (!bar || !bar.classList) return;
    if (bar.classList.contains('ws-mode-bar--legacy-slant')) return;
    if (bar.classList.contains('ws-mode-bar--slant')) {
      bar.classList.remove('ws-mode-bar--slant');
    }
    bar.classList.add('ws-mode-bar--connected');
  }

  function updateIndicatorForBar(bar) {
    if (isSlantBar(bar) || isConnectedBar(bar)) return;
    var cluster = bar.querySelector('.ws-tab-cluster');
    if (!cluster) cluster = ensureCluster(bar);
    if (!cluster) return;

    var indicator = cluster.querySelector('.ws-tab-indicator');
    var active = cluster.querySelector('.ws-mode-tab.active');
    if (!indicator || !active) {
      cluster.classList.remove('has-active');
      return;
    }

    cluster.classList.add('has-active');

    function positionIndicator() {
      var clusterRect = cluster.getBoundingClientRect();
      var tabRect = active.getBoundingClientRect();
      indicator.style.width = tabRect.width + 'px';
      indicator.style.transform = 'translateX(' + (tabRect.left - clusterRect.left) + 'px)';
    }

    positionIndicator();
    requestAnimationFrame(positionIndicator);
  }

  function onTabActiveChanged() {
    requestAnimationFrame(function() {
      refreshAllIndicators();
    });
  }

  function refreshAllIndicators() {
    document.querySelectorAll('.ws-mode-bar--attached').forEach(updateIndicatorForBar);
  }

  function enhanceWorkspaceTabs() {
    document.querySelectorAll('.ws-mode-tab').forEach(function(btn) {
      if (btn.querySelector('.ws-tab-text')) return;
      var labelSpan = btn.querySelector('span:not(.ws-tab-label):not(.ws-tab-sub)');
      if (!labelSpan) return;
      var key = getTabKey(btn);
      var titleAttr = btn.getAttribute('title') || '';
      var sub = subtitles[key] || titleAttr;
      if (sub.length > 42) sub = sub.split('.')[0];
      var text = document.createElement('span');
      text.className = 'ws-tab-text';
      text.innerHTML = '<span class="ws-tab-label">' + labelSpan.textContent + '</span>' +
        (sub ? '<span class="ws-tab-sub">' + sub + '</span>' : '');
      labelSpan.replaceWith(text);
      // The subtitle is now rendered inline next to the label, so a hover
      // tooltip showing the same string is redundant. Drop it (only when
      // the title actually duplicates the visible subtitle).
      if (sub && titleAttr && titleAttr.trim().toLowerCase() === sub.trim().toLowerCase()) {
        btn.removeAttribute('title');
      }
    });
  }

  function initWorkspaceTabBars(extraSubtitles) {
    if (extraSubtitles) Object.assign(subtitles, extraSubtitles);
    document.querySelectorAll('.ws-mode-bar--attached').forEach(function(bar) {
      ensureConnectedBar(bar);
      unwrapClusterIfSlant(bar);
      ensureCluster(bar);
    });
    enhanceWorkspaceTabs();
    refreshAllIndicators();

    if (!initialized) {
      initialized = true;
      window.addEventListener('resize', refreshAllIndicators);
    }
  }

  function pulseWsBody(bodyEl) {
    if (!bodyEl) return;
    bodyEl.classList.remove('ws-body-switching');
    void bodyEl.offsetWidth;
    bodyEl.classList.add('ws-body-switching');
    setTimeout(function() { bodyEl.classList.remove('ws-body-switching'); }, 180);
  }

  global.StatisticoWorkspaceTabs = {
    init: initWorkspaceTabBars,
    enhance: enhanceWorkspaceTabs,
    refresh: refreshAllIndicators,
    onActiveChanged: onTabActiveChanged,
    pulseBody: pulseWsBody,
    setSubtitles: function(map) { Object.assign(subtitles, map); }
  };
})(typeof window !== 'undefined' ? window : this);
