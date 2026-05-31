/**
 * Statistico brand logo — single source for sidebar / header mark.
 * Bell-curve mark adapted from dialogs/views/Gauss.html (logo-subtle variation).
 * Load before shared-header.js. Mount with data-statistico-brand-logo on .sb-logo-icon.
 */
(function (global) {
  'use strict';

  /** Compact normal curve for the left mark (viewBox coords ~6–70 × 12–76). */
  var LOGO_GAUSS_CURVE = 'M8 76 C20 76 24 12 38 12 C52 12 56 76 68 76';
  var LOGO_GAUSS_FILL = LOGO_GAUSS_CURVE + ' L8 76 Z';

  var BRAND_LOGO_SVG = ''
    + '<svg class="sb-logo-svg" viewBox="0 -2 300 88" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Statistico Interactive">'
    + '<defs>'
    + '<linearGradient id="sbLogoBlue" x1="0%" y1="0%" x2="0%" y2="100%">'
    + '<stop offset="0%" stop-color="#3d8aff"/><stop offset="100%" stop-color="#0ea5e9"/>'
    + '</linearGradient>'
    + '<linearGradient id="sbLogoGaussFill" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="#3d8aff" stop-opacity="0.24"/>'
    + '<stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.04"/>'
    + '</linearGradient>'
    + '<radialGradient id="sbLogoSlider" cx="35%" cy="30%" r="70%">'
    + '<stop offset="0%" stop-color="#d7f3ff"/>'
    + '<stop offset="52%" stop-color="#6fb7ff"/>'
    + '<stop offset="100%" stop-color="#2d76ff"/>'
    + '</radialGradient>'
    + '<filter id="sbLogoCurveShadow" x="-20%" y="-20%" width="160%" height="160%">'
    + '<feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#001020" flood-opacity="0.55"/>'
    + '</filter>'
    + '</defs>'
    + '<g class="sb-logo-mark sb-logo-gauss">'
    + '<path class="sb-logo-gauss-fill" d="' + LOGO_GAUSS_FILL + '" fill="url(#sbLogoGaussFill)"/>'
    + '<path class="sb-logo-gauss-axis" d="M6 76 H70" stroke="#001838" stroke-width="2.2" stroke-linecap="round" opacity="0.22"/>'
    + '<path class="sb-logo-gauss-shadow" d="' + LOGO_GAUSS_CURVE + '" stroke="#001838" stroke-width="6.5" fill="none" stroke-linecap="round" opacity="0.38" transform="translate(2.2,2.8)"/>'
    + '<path class="sb-logo-gauss-curve" d="' + LOGO_GAUSS_CURVE + '" stroke="url(#sbLogoBlue)" stroke-width="4.8" fill="none" stroke-linecap="round" filter="url(#sbLogoCurveShadow)"/>'
    + '<path class="sb-logo-gauss-mean" d="M38 16 V76" stroke="url(#sbLogoBlue)" stroke-width="1.8" stroke-linecap="round" opacity="0.38"/>'
    + '</g>'
    + '<text x="89.5" y="38.5" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="7" fill="#00060f" opacity="0.5">STATISTICO</text>'
    + '<text x="88" y="37" class="sb-logo-title" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="7">STATISTICO</text>'
    + '<g class="sb-logo-subtitle-row">'
    + '<line class="sb-logo-subline" x1="92" y1="63" x2="118" y2="63"/>'
    + '<text x="191" y="68" class="sb-logo-subtitle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="4.6" text-anchor="middle">INTERACTIVE</text>'
    + '<line class="sb-logo-subline" x1="264" y1="63" x2="296" y2="63"/>'
    + '<circle class="sb-logo-slider-knob" cx="282" cy="63" r="5.2" fill="url(#sbLogoSlider)" stroke="rgba(255,255,255,.74)" stroke-width="1.3"/>'
    + '</g>'
    + '</svg>';

  function getSvg() {
    return BRAND_LOGO_SVG;
  }

  function getGaussMarkPaths() {
    return { curve: LOGO_GAUSS_CURVE, fill: LOGO_GAUSS_FILL };
  }

  function mount(host) {
    if (!host) return;
    host.innerHTML = BRAND_LOGO_SVG;
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
    getGaussMarkPaths: getGaussMarkPaths,
    mount: mount,
    mountAll: mountAll
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
