/**
 * Statistico brand logo — single source for sidebar / header mark.
 * Full artwork PNG (curve scene + wordmark) shared by hub and module sidebars.
 * Load before shared-header.js. Mount with data-statistico-brand-logo on .sb-logo-icon.
 */
(function (global) {
  'use strict';

  var LOGO_VER = '20260717f';
  var LOGO_FILES = {
    default: 'statistico-logo-hub.png',
    analytics: 'statistico-logo-hub.png',
    calculators: 'statistico-logo-hub-yellow.png',
    applications: 'statistico-logo-hub-green.png'
  };

  /** Compact normal curve kept for legacy callers (e.g. Gauss.html demos). */
  var LOGO_GAUSS_CURVE = 'M8 76 C20 76 24 12 38 12 C52 12 56 76 68 76';
  var LOGO_GAUSS_FILL = LOGO_GAUSS_CURVE + ' L8 76 Z';

  function getAssetBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('shared-brand-logo.js') !== -1) {
        return src.replace(/\/[^/]+$/, '/');
      }
    }
    return '';
  }

  function getLogoSrc(cluster) {
    var file = LOGO_FILES[cluster] || LOGO_FILES.default;
    return getAssetBase() + file + '?v=' + LOGO_VER;
  }

  function getLogoHtml(cluster) {
    return '<img class="sb-logo-img sb-logo-full-img" src="' + getLogoSrc(cluster) + '" alt="Statistico Interactive" />';
  }

  function getSvg() {
    return getLogoHtml();
  }

  function getGaussMarkPaths() {
    return { curve: LOGO_GAUSS_CURVE, fill: LOGO_GAUSS_FILL };
  }

  function mount(host, cluster) {
    if (!host) return;
    var clusterId = cluster || host.getAttribute('data-logo-cluster') || 'default';
    if (clusterId === 'default') clusterId = undefined;
    host.innerHTML = getLogoHtml(clusterId);
  }

  function setCluster(cluster, root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-statistico-brand-logo]');
    for (var i = 0; i < nodes.length; i++) {
      mount(nodes[i], cluster);
    }
  }

  function mountAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-statistico-brand-logo]');
    for (var i = 0; i < nodes.length; i++) {
      mount(nodes[i]);
    }
  }

  global.StatisticoBrandLogo = {
    getSvg: getSvg,
    getLogoSrc: getLogoSrc,
    getGaussMarkPaths: getGaussMarkPaths,
    mount: mount,
    mountAll: mountAll,
    setCluster: setCluster
  };

  function autoMount() {
    mountAll(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})(typeof window !== 'undefined' ? window : this);
