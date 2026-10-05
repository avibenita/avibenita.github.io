/**
 * Statistico brand logo — single source for sidebar / header mark.
 * Dark theme keeps the badge artwork. Light theme uses the transparent wordmark.
 * Load before shared-header.js. Mount with data-statistico-brand-logo on .sb-logo-icon.
 */
(function (global) {
  'use strict';

  var LOGO_VER = '20261005light1';
  var LOGO_DARK = 'statistico-logo-hub.png';
  var LOGO_LIGHT = 'statistico-logo-light.png';
  var LOGO_FILES = {
    default: LOGO_DARK,
    analytics: LOGO_DARK,
    tools: LOGO_DARK,
    calculators: LOGO_DARK,
    applications: LOGO_DARK
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

  function currentTheme() {
    try {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function logoFile(cluster) {
    if (currentTheme() === 'light') return LOGO_LIGHT;
    return LOGO_FILES[cluster] || LOGO_FILES.default;
  }

  function getLogoSrc(cluster) {
    return getAssetBase() + logoFile(cluster) + '?v=' + LOGO_VER;
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
    if (cluster) host.setAttribute('data-logo-cluster', cluster);
    if (clusterId === 'default') clusterId = undefined;
    var src = getLogoSrc(clusterId);
    var img = host.querySelector('.sb-logo-img');
    if (!img) {
      host.innerHTML = getLogoHtml(clusterId);
      img = host.querySelector('.sb-logo-img');
    }
    if (img) {
      img.loading = 'eager';
      img.decoding = 'sync';
      img.alt = 'Statistico Interactive';
      if (img.getAttribute('src') !== src) img.src = src;
    }
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
    var loose = scope.querySelectorAll('img[data-statistico-logo]');
    var lightSrc = getLogoSrc();
    for (var j = 0; j < loose.length; j++) {
      if (loose[j].getAttribute('src') !== lightSrc) loose[j].src = lightSrc;
    }
  }

  function injectLightLogoCss() {
    if (document.getElementById('statistico-light-logo-css')) return;
    var style = document.createElement('style');
    style.id = 'statistico-light-logo-css';
    style.textContent = [
      'html[data-theme="light"] .sb-logo-img,',
      'html[data-theme="light"] .sb-logo-full-img,',
      'html[data-theme="light"] .hub-brand-logo img,',
      'html[data-theme="light"] .st-calc-logo img,',
      'html[data-theme="light"] .brand img,',
      'html[data-theme="light"] img[data-statistico-logo] {',
      '  mix-blend-mode: normal !important;',
      '  filter: none !important;',
      '  border-radius: 0 !important;',
      '  box-shadow: none !important;',
      '  background: transparent !important;',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  global.StatisticoBrandLogo = {
    getSvg: getSvg,
    getLogoSrc: getLogoSrc,
    getGaussMarkPaths: getGaussMarkPaths,
    mount: mount,
    mountAll: mountAll,
    setCluster: setCluster,
    syncTheme: mountAll
  };

  function autoMount() {
    injectLightLogoCss();
    mountAll(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }

  document.addEventListener('statistico-theme-changed', function () {
    mountAll(document);
  });

  if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    new MutationObserver(function () {
      mountAll(document);
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }
})(typeof window !== 'undefined' ? window : this);
