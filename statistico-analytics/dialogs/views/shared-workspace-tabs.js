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
    'by-group-stats': 'Descriptive stats, kernel densities, histograms, or box plots',
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
  var VIEW_SWITCHER_KICKER = 'EXPLORE VIEWS';
  var HINT_STORAGE_PREFIX = 'statistico-view-switcher-seen:';

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

  function isContainedTabs() {
    return document.documentElement.getAttribute('data-tabs') !== 'classic';
  }

  function visibleTabButtons(list) {
    if (!list) return [];
    return Array.prototype.filter.call(list.querySelectorAll('.ws-mode-tab'), function(tab) {
      return !tab.disabled && tab.getClientRects().length > 0;
    });
  }

  function syncRovingTabindex(list) {
    var tabs = visibleTabButtons(list);
    if (!tabs.length) return;
    var active = list.querySelector('.ws-mode-tab.active, .ws-mode-tab[aria-selected="true"], .ws-mode-tab[aria-current="page"]') || tabs[0];
    tabs.forEach(function(tab) {
      var selected = tab === active;
      if (tab.getAttribute('role') === 'tab') {
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.tabIndex = selected ? 0 : -1;
      }
    });
  }

  function unwrapTabOverflow(bar) {
    if (!bar) return;
    var wrap = bar.querySelector(':scope > .ws-tab-scroll-wrap');
    if (!wrap) return;
    var cluster = wrap.querySelector('.ws-tab-cluster');
    var scroller = wrap.querySelector('.ws-tab-scroll');
    var tabs = [];
    if (cluster) {
      bar.insertBefore(cluster, wrap);
    } else if (scroller) {
      tabs = Array.prototype.filter.call(scroller.children, function(el) {
        return el.classList && el.classList.contains('ws-mode-tab');
      });
      tabs.forEach(function(tab) { bar.insertBefore(tab, wrap); });
    }
    wrap.remove();
  }

  function ensureTabOverflow(bar) {
    if (!bar || isSlantBar(bar)) return;
    if (!isContainedTabs()) {
      unwrapTabOverflow(bar);
      return;
    }

    var wrap = bar.querySelector(':scope > .ws-tab-scroll-wrap');
    var cluster = bar.querySelector(':scope > .ws-tab-cluster') ||
      (wrap && wrap.querySelector('.ws-tab-cluster'));
    var looseTabs = Array.prototype.filter.call(bar.children, function(el) {
      return el.classList && el.classList.contains('ws-mode-tab');
    });

    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'ws-tab-scroll-wrap';

      var prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'ws-tab-scroll-btn ws-tab-scroll-btn--prev';
      prev.setAttribute('aria-label', 'Show previous tabs');
      prev.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';

      var scroller = document.createElement('div');
      scroller.className = 'ws-tab-scroll';

      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'ws-tab-scroll-btn ws-tab-scroll-btn--next';
      next.setAttribute('aria-label', 'Show next tabs');
      next.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';

      if (cluster) scroller.appendChild(cluster);
      else looseTabs.forEach(function(tab) { scroller.appendChild(tab); });

      wrap.appendChild(prev);
      wrap.appendChild(scroller);
      wrap.appendChild(next);
      bar.appendChild(wrap);

      prev.addEventListener('click', function() {
        scroller.scrollBy({ left: Math.max(120, scroller.clientWidth * 0.6) * -1, behavior: 'smooth' });
      });
      next.addEventListener('click', function() {
        scroller.scrollBy({ left: Math.max(120, scroller.clientWidth * 0.6), behavior: 'smooth' });
      });
      scroller.addEventListener('scroll', function() { updateTabOverflow(bar); }, { passive: true });
    }

    updateTabOverflow(bar);
    scrollActiveTabIntoView(bar);
  }

  function updateTabOverflow(bar) {
    if (!bar) return;
    var wrap = bar.querySelector(':scope > .ws-tab-scroll-wrap');
    if (!wrap) return;
    var scroller = wrap.querySelector('.ws-tab-scroll');
    var prev = wrap.querySelector('.ws-tab-scroll-btn--prev');
    var next = wrap.querySelector('.ws-tab-scroll-btn--next');
    if (!scroller) return;
    var overflowing = scroller.scrollWidth > scroller.clientWidth + 1;
    wrap.classList.toggle('is-overflowing', overflowing);
    if (prev) prev.disabled = !overflowing || scroller.scrollLeft <= 1;
    if (next) {
      next.disabled = !overflowing || scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
    }
  }

  function scrollActiveTabIntoView(bar) {
    var scroller = bar && bar.querySelector('.ws-tab-scroll');
    var active = bar && bar.querySelector('.ws-mode-tab.active, .ws-mode-tab[aria-selected="true"]');
    if (!scroller || !active) return;
    var a = active.getBoundingClientRect();
    var s = scroller.getBoundingClientRect();
    if (a.left < s.left + 8) scroller.scrollLeft -= (s.left - a.left + 16);
    else if (a.right > s.right - 8) scroller.scrollLeft += (a.right - s.right + 16);
  }

  function refreshAllOverflow() {
    document.querySelectorAll('.ws-mode-bar--attached, .view-switcher-bar').forEach(function(bar) {
      ensureTabOverflow(bar);
      syncRovingTabindex(bar);
    });
  }

  function bindTablistKeyboard() {
    if (bindTablistKeyboard._bound) return;
    bindTablistKeyboard._bound = true;
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
      var tab = e.target && e.target.closest && e.target.closest('[role="tab"]');
      if (!tab) return;
      var list = tab.closest('[role="tablist"]');
      if (!list) return;
      var tabs = visibleTabButtons(list);
      var index = tabs.indexOf(tab);
      if (index < 0) return;
      var next = index;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === index) return;
      e.preventDefault();
      tabs[next].focus();
      if (isContainedTabs()) tabs[next].click();
    });
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
      refreshAllOverflow();
      document.querySelectorAll('.view-switcher').forEach(updateViewSwitcherDescription);
    });
  }

  function refreshAllIndicators() {
    document.querySelectorAll('.ws-mode-bar--attached').forEach(updateIndicatorForBar);
  }

  function enhanceWorkspaceTabs() {
    document.querySelectorAll('.ws-mode-tab').forEach(function(btn) {
      if (btn.querySelector('.ws-tab-text')) return;
      var labelSpan = btn.querySelector('span:not(.ws-tab-label):not(.ws-tab-sub):not(.view-switcher-glow):not(.view-switcher-mark)');
      if (!labelSpan) return;
      var key = getTabKey(btn);
      var titleAttr = btn.getAttribute('title') || '';
      var skipSub = !!(btn.closest && btn.closest('.uni-view-tabs, .view-switcher-bar'));
      var sub = skipSub ? '' : (subtitles[key] || titleAttr);
      if (sub.length > 42) sub = sub.split('.')[0];
      var text = document.createElement('span');
      text.className = 'ws-tab-text';
      text.innerHTML = '<span class="ws-tab-label">' + labelSpan.textContent + '</span>' +
        (sub ? '<span class="ws-tab-sub">' + sub + '</span>' : '');
      labelSpan.replaceWith(text);
      if (sub && titleAttr && titleAttr.trim().toLowerCase() === sub.trim().toLowerCase()) {
        btn.removeAttribute('title');
      }
    });
  }

  function getActiveViewDescription(bar) {
    if (!bar) return '';
    var active = bar.querySelector('.ws-mode-tab.active') || bar.querySelector('.ws-mode-tab');
    if (!active) return '';
    var key = getTabKey(active);
    var title = (active.getAttribute('title') || '').trim();
    var subEl = active.querySelector('.ws-tab-sub');
    var sub = subEl ? subEl.textContent.trim() : '';
    return title || sub || subtitles[key] || '';
  }

  function updateViewSwitcherDescription(host) {
    if (!host) return;
    var bar = host.querySelector('.view-switcher-bar, .ws-mode-bar');
    var desc = host.querySelector('.view-switcher-desc');
    if (!desc) return;
    var text = getActiveViewDescription(bar);
    var textEl = desc.querySelector('.uni-view-caption-text') || desc;
    if (textEl === desc) {
      desc.textContent = text;
    } else {
      textEl.textContent = text;
    }
    desc.hidden = !text;
  }

  function upgradeToViewSwitcher(bar) {
    if (!bar || !bar.classList || isSlantBar(bar)) return;
    bar.classList.add('view-switcher-bar', 'uni-view-tabs');
    ensureViewSwitcherCtaMarks(bar);
    ensureViewSwitcherGlow(bar);

    var existingHost = bar.closest('.view-switcher');
    if (existingHost) {
      var existingKicker = existingHost.querySelector('.view-switcher-kicker');
      if (existingKicker) existingKicker.textContent = VIEW_SWITCHER_KICKER;
      updateViewSwitcherDescription(existingHost);
      maybeHintViewSwitcher(existingHost);
      return;
    }

    var host = document.createElement('div');
    host.className = 'view-switcher';
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', bar.getAttribute('aria-label') || 'Views of this analysis');

    var row = document.createElement('div');
    row.className = 'view-switcher-row';

    var kicker = document.createElement('span');
    kicker.className = 'view-switcher-kicker';
    kicker.textContent = VIEW_SWITCHER_KICKER;

    var desc = document.createElement('p');
    desc.className = 'view-switcher-desc uni-view-caption';
    var descText = document.createElement('span');
    descText.className = 'uni-view-caption-text';
    desc.appendChild(descText);

    var parent = bar.parentNode;
    if (!parent) return;
    parent.insertBefore(host, bar);
    row.appendChild(kicker);
    row.appendChild(bar);
    row.appendChild(desc);
    host.appendChild(row);
    updateViewSwitcherDescription(host);
    maybeHintViewSwitcher(host);
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function getViewSwitcherModuleKey() {
    var moduleName = '';
    try {
      if (global.StatisticoHeader && StatisticoHeader.module) {
        moduleName = String(StatisticoHeader.module);
      }
    } catch (e) {}
    if (!moduleName) {
      var path = String((location && location.pathname) || '').toLowerCase();
      var match = path.match(/\/(?:dialogs\/)?views\/([^/]+)/);
      moduleName = match ? match[1] : 'default';
    }
    return HINT_STORAGE_PREFIX + moduleName;
  }

  function ensureViewSwitcherCtaMarks(bar) {
    if (!bar) return;
    Array.prototype.forEach.call(bar.querySelectorAll('.ws-mode-tab'), function(btn) {
      if (btn.querySelector('.view-switcher-mark')) return;
      var mark = document.createElement('span');
      mark.className = 'view-switcher-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = '<i class="fa-solid fa-arrow-right view-switcher-go"></i>'
        + '<i class="fa-solid fa-check view-switcher-check"></i>';
      btn.appendChild(mark);
    });
  }

  function ensureViewSwitcherGlow(bar) {
    if (!bar) return;
    Array.prototype.forEach.call(bar.querySelectorAll('.ws-mode-tab'), function(btn) {
      if (btn.querySelector('.view-switcher-glow')) return;
      var glow = document.createElement('span');
      glow.className = 'view-switcher-glow';
      glow.setAttribute('aria-hidden', 'true');
      btn.insertBefore(glow, btn.firstChild);
    });
  }

  var hintStarted = {};

  function maybeHintViewSwitcher(host) {
    if (isContainedTabs()) return;
    var key = getViewSwitcherModuleKey();
    if (hintStarted[key]) return;
    try {
      if (localStorage.getItem(key) === '1') return;
    } catch (e) {}
    if (prefersReducedMotion()) {
      try { localStorage.setItem(key, '1'); } catch (e) {}
      return;
    }
    hintStarted[key] = true;
    window.setTimeout(function() {
      var liveHost = (host && host.isConnected) ? host : document.querySelector('.view-switcher');
      if (!liveHost) return;
      var alts = liveHost.querySelectorAll('.ws-mode-tab:not(.active)');
      if (!alts.length) return;
      try { localStorage.setItem(key, '1'); } catch (e) {}
      Array.prototype.forEach.call(alts, function(btn, i) {
        btn.classList.add('view-switcher-cta-hint');
        btn.style.animationDelay = (0.08 + i * 0.12) + 's';
        var cleared = false;
        var clearHint = function() {
          if (cleared) return;
          cleared = true;
          btn.classList.remove('view-switcher-cta-hint');
          btn.style.animationDelay = '';
          btn.removeEventListener('animationend', clearHint);
        };
        btn.addEventListener('animationend', clearHint);
        window.setTimeout(clearHint, 1600);
      });
    }, 450);
  }

  function bindViewSwitcherUpdates() {
    if (bindViewSwitcherUpdates._bound) return;
    bindViewSwitcherUpdates._bound = true;
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.view-switcher-bar .ws-mode-tab, .view-switcher .ws-mode-tab');
      if (!btn) return;
      var host = btn.closest('.view-switcher');
      window.setTimeout(function() { updateViewSwitcherDescription(host); }, 0);
    }, true);
  }

  function initWorkspaceTabBars(extraSubtitles) {
    if (extraSubtitles) Object.assign(subtitles, extraSubtitles);
    document.querySelectorAll('.ws-mode-bar--attached').forEach(function(bar) {
      ensureConnectedBar(bar);
      unwrapClusterIfSlant(bar);
      ensureCluster(bar);
      upgradeToViewSwitcher(bar);
    });
    enhanceWorkspaceTabs();
    document.querySelectorAll('.view-switcher').forEach(updateViewSwitcherDescription);
    refreshAllIndicators();
    refreshAllOverflow();
    bindViewSwitcherUpdates();
    bindTablistKeyboard();

    if (!initialized) {
      initialized = true;
      window.addEventListener('resize', function() {
        refreshAllIndicators();
        refreshAllOverflow();
      });
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
    refreshOverflow: refreshAllOverflow,
    applyTabStyle: function() {
      refreshAllOverflow();
      refreshAllIndicators();
    },
    onActiveChanged: onTabActiveChanged,
    pulseBody: pulseWsBody,
    setSubtitles: function(map) { Object.assign(subtitles, map); },
    updateViewDescription: function(host) { updateViewSwitcherDescription(host); }
  };
})(typeof window !== 'undefined' ? window : this);
