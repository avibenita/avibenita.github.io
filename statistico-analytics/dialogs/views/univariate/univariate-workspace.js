/* global fitLayout */
(function () {
  'use strict';

  var summary = null;
  var summaryObserver = null;
  var navigationObserver = null;

  function text(id, fallback) {
    var el = document.getElementById(id);
    var value = el ? String(el.textContent || '').trim() : '';
    return value && value !== '--' ? value : fallback;
  }

  function variableName() {
    var title = document.getElementById('histogram-title');
    var value = title ? String(title.textContent || '') : '';
    value = value.replace(/\s*-\s*Interactive Histogram\s*$/i, '').trim();
    return value && value !== 'Variable' ? value : 'Selected variable';
  }

  function insightMarkup() {
    var skew = Number(text('stat-skewness', '0'));
    var mean = Number(text('stat-mean', '0'));
    var median = Number(text('stat-median', '0'));
    var shape = 'approximately symmetric';
    if (Number.isFinite(skew)) {
      if (skew <= -0.5) shape = 'left-skewed';
      else if (skew >= 0.5) shape = 'right-skewed';
      else if (Math.abs(skew) >= 0.2) shape = 'mildly skewed';
    }
    var relationship = '';
    if (Number.isFinite(mean) && Number.isFinite(median)) {
      if (mean < median) relationship = ' · The mean is below the median.';
      else if (mean > median) relationship = ' · The mean is above the median.';
    }
    return '<strong>' + shape.charAt(0).toUpperCase() + shape.slice(1)
      + ' distribution</strong>' + relationship;
  }

  function createMetric(label, id) {
    var item = document.createElement('div');
    item.className = 'uni-workspace-metric';
    item.innerHTML = '<strong data-source-stat="' + id + '">--</strong><span>' + label + '</span>';
    return item;
  }

  function ensureSummary() {
    var results = document.getElementById('results-container');
    var statistics = document.getElementById('statistics-panel');
    if (!results || !statistics) return null;

    summary = document.getElementById('uniWorkspaceSummary');
    if (summary) return summary;

    summary = document.createElement('section');
    summary.id = 'uniWorkspaceSummary';
    summary.className = 'uni-workspace-summary';
    summary.setAttribute('aria-label', 'Analysis summary');

    var intro = document.createElement('div');
    intro.innerHTML =
      '<div class="uni-workspace-summary__eyebrow" id="uniWorkspaceVariable">Selected variable</div>'
      + '<h1 class="uni-workspace-summary__title">Histogram</h1>'
      + '<p class="uni-workspace-summary__insight" id="uniWorkspaceInsight"></p>';

    var right = document.createElement('div');
    right.className = 'uni-workspace-summary__right';
    var metrics = document.createElement('div');
    metrics.className = 'uni-workspace-summary__metrics';
    metrics.appendChild(createMetric('Mean', 'stat-mean'));
    metrics.appendChild(createMetric('Median', 'stat-median'));
    metrics.appendChild(createMetric('SD', 'stat-stddev'));
    metrics.appendChild(createMetric('n', 'stat-n'));

    var actions = document.createElement('div');
    actions.className = 'uni-workspace-summary__actions';
    actions.innerHTML =
      '<button type="button" class="uni-workspace-button" id="uniWorkspaceStatsButton" aria-expanded="false">View statistics</button>'
      + '<button type="button" class="uni-workspace-button" id="uniWorkspaceControlsButton" aria-expanded="true">Hide controls</button>'
      + '<button type="button" class="uni-workspace-button" id="uniWorkspaceFocusButton" aria-pressed="false">Focus view</button>';

    right.appendChild(metrics);
    right.appendChild(actions);
    summary.appendChild(intro);
    summary.appendChild(right);
    results.insertBefore(summary, statistics);

    document.getElementById('uniWorkspaceStatsButton').addEventListener('click', toggleStatistics);
    document.getElementById('uniWorkspaceControlsButton').addEventListener('click', toggleControls);
    document.getElementById('uniWorkspaceFocusButton').addEventListener('click', toggleFocus);

    return summary;
  }

  function syncSummary() {
    if (!ensureSummary()) return;
    var variable = document.getElementById('uniWorkspaceVariable');
    var insight = document.getElementById('uniWorkspaceInsight');
    if (variable) variable.textContent = variableName();
    if (insight) insight.innerHTML = insightMarkup();

    summary.querySelectorAll('[data-source-stat]').forEach(function (target) {
      target.textContent = text(target.getAttribute('data-source-stat'), '--');
    });
  }

  function toggleStatistics(event) {
    var panel = document.getElementById('statistics-panel');
    if (!panel) return;
    var open = panel.classList.toggle('uni-stats-open');
    event.currentTarget.textContent = open ? 'Hide statistics' : 'View statistics';
    event.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
    window.setTimeout(refit, 20);
  }

  function toggleControls(event) {
    var panel = document.getElementById('histogram-panel');
    if (!panel) return;
    var hidden = panel.classList.toggle('uni-controls-hidden');
    event.currentTarget.textContent = hidden ? 'Customize chart' : 'Hide controls';
    event.currentTarget.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    window.setTimeout(refit, 20);
  }

  function toggleFocus(event) {
    var focused = document.body.classList.toggle('uni-workspace-focus');
    event.currentTarget.textContent = focused ? 'Exit focus' : 'Focus view';
    event.currentTarget.setAttribute('aria-pressed', focused ? 'true' : 'false');
    window.setTimeout(refit, 30);
  }

  function refit() {
    if (typeof fitLayout === 'function') {
      try { fitLayout(); } catch (_e) {}
    }
    window.dispatchEvent(new Event('resize'));
  }

  function lockButton(button, isActive) {
    if (!button) return;
    if (isActive) {
      button.removeAttribute('onclick');
      button.removeAttribute('data-nav-file');
      if (!button.dataset.uniWorkspacePinned) {
        button.dataset.uniWorkspacePinned = 'true';
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }, true);
      }
      return;
    }
    if (button.classList.contains('uni-nav-locked')) return;
    button.classList.add('uni-nav-locked');
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('tabindex', '-1');
    button.setAttribute('title', 'This view will be enabled in a later phase');
    button.removeAttribute('onclick');
    button.removeAttribute('data-nav-file');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function lockInactiveNavigation() {
    var nav = document.getElementById('sidebarNav');
    if (nav) {
      nav.querySelectorAll('.sb-item').forEach(function (button) {
        var isDistribution = button.classList.contains('active')
          || button.getAttribute('data-view') === 'distribution';
        lockButton(button, isDistribution);
      });
    }

    document.querySelectorAll('.uni-view-tabs button, .uni-results-tabs-stack button').forEach(function (button) {
      var active = button.classList.contains('active')
        || button.getAttribute('aria-selected') === 'true';
      if (!active) {
        lockButton(button, false);
        button.classList.add('uni-view-tab-locked');
      }
    });
  }

  function observeSummaryValues() {
    if (summaryObserver) return;
    var panel = document.getElementById('statistics-panel');
    var title = document.getElementById('histogram-title');
    if (!panel) return;
    summaryObserver = new MutationObserver(syncSummary);
    summaryObserver.observe(panel, { subtree: true, childList: true, characterData: true });
    if (title) summaryObserver.observe(title, { subtree: true, childList: true, characterData: true });
  }

  function observeNavigation() {
    if (navigationObserver) return;
    navigationObserver = new MutationObserver(lockInactiveNavigation);
    navigationObserver.observe(document.body, { subtree: true, childList: true });
  }

  function init() {
    document.body.classList.add('uni-workspace-v1');
    ensureSummary();
    syncSummary();
    lockInactiveNavigation();
    observeSummaryValues();
    observeNavigation();
    window.setTimeout(function () {
      syncSummary();
      lockInactiveNavigation();
      refit();
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
