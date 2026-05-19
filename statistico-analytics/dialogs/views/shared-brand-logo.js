/**
 * Statistico brand logo — single source for sidebar / header mark.
 * Load before shared-header.js. Mount with data-statistico-brand-logo on .sb-logo-icon.
 */
(function (global) {
  'use strict';

  var BRAND_LOGO_SVG = ''
    + '<svg class="sb-logo-svg" viewBox="0 -6 300 122" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Statistico Interactive">'
    + '<defs>'
    + '<linearGradient id="sbLogoBlue" x1="0%" y1="0%" x2="0%" y2="100%">'
    + '<stop offset="0%" stop-color="#3d8aff"/><stop offset="100%" stop-color="#0ea5e9"/>'
    + '</linearGradient>'
    + '<linearGradient id="sbLogoTeal" x1="0%" y1="0%" x2="0%" y2="100%">'
    + '<stop offset="0%" stop-color="#5ff5e2"/><stop offset="100%" stop-color="#00b8c8"/>'
    + '</linearGradient>'
    + '<radialGradient id="sbLogoSlider" cx="35%" cy="30%" r="70%">'
    + '<stop offset="0%" stop-color="#d7f3ff"/>'
    + '<stop offset="52%" stop-color="#6fb7ff"/>'
    + '<stop offset="100%" stop-color="#2d76ff"/>'
    + '</radialGradient>'
    + '<linearGradient id="sbReflectFade" x1="0" y1="82" x2="0" y2="122" gradientUnits="userSpaceOnUse">'
    + '<stop offset="0%" stop-color="white" stop-opacity="0.65"/>'
    + '<stop offset="55%" stop-color="white" stop-opacity="0.22"/>'
    + '<stop offset="100%" stop-color="white" stop-opacity="0"/>'
    + '</linearGradient>'
    + '<mask id="sbReflectMask" maskUnits="userSpaceOnUse">'
    + '<rect x="0" y="82" width="72" height="40" fill="url(#sbReflectFade)"/>'
    + '</mask>'
    + '<filter id="sbLogoCurveShadow" x="-20%" y="-20%" width="160%" height="160%">'
    + '<feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#001020" flood-opacity="0.55"/>'
    + '</filter>'
    + '</defs>'
    + '<g id="sbLogoMark" class="sb-logo-mark">'
    + '<path d="M58 15 C58 6 47 2 35 2 C19 2 8 12 8 25 C8 37 19 43 35 43" stroke="#001838" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.45" transform="translate(2.5,3.5)"/>'
    + '<path d="M35 43 C51 43 64 49 64 61 C64 75 51 82 35 82 C20 82 10 75 9 64" stroke="#001838" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.45" transform="translate(2.5,3.5)"/>'
    + '<path d="M58 15 C58 6 47 2 35 2 C19 2 8 12 8 25 C8 37 19 43 35 43" stroke="url(#sbLogoBlue)" stroke-width="10" fill="none" stroke-linecap="round" filter="url(#sbLogoCurveShadow)"/>'
    + '<path d="M35 43 C51 43 64 49 64 61 C64 75 51 82 35 82 C20 82 10 75 9 64" stroke="url(#sbLogoBlue)" stroke-width="10" fill="none" stroke-linecap="round" filter="url(#sbLogoCurveShadow)"/>'
    + '<path d="M58 15 C58 6 47 2 35 2 C19 2 8 12 8 25 C8 37 19 43 35 43" stroke="rgba(160,210,255,0.55)" stroke-width="3" fill="none" stroke-linecap="round" transform="translate(-0.7,-1.2)"/>'
    + '<path d="M35 43 C51 43 64 49 64 61 C64 75 51 82 35 82 C20 82 10 75 9 64" stroke="rgba(160,210,255,0.45)" stroke-width="3" fill="none" stroke-linecap="round" transform="translate(-0.7,-1.2)"/>'
    + '<g class="sb-logo-stats-hint">'
    + '<line x1="17" y1="73" x2="58" y2="73" stroke="#8ef8f0" stroke-width="1.2" opacity="0.55"/>'
    + '<line x1="17" y1="73" x2="17" y2="44" stroke="#8ef8f0" stroke-width="1.2" opacity="0.38"/>'
    + '<line x1="17" y1="73" x2="58" y2="45" stroke="#8ef8f0" stroke-width="0.9" stroke-dasharray="2.5 2" opacity="0.3"/>'
    + '<path d="M17 73 C22 72 27 64 33 52 C40 47 50 44 58 44" stroke="#a8fff9" stroke-width="2.2" fill="none" opacity="0.88" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="23" cy="67" r="2" fill="#d4fffb" opacity="0.95"/>'
    + '<circle cx="29" cy="56" r="1.6" fill="#a8fff9" opacity="0.82"/>'
    + '<circle cx="35" cy="50" r="1.3" fill="#7ef0e8" opacity="0.65"/>'
    + '</g>'
    + '</g>'
    + '<g mask="url(#sbReflectMask)">'
    + '<use href="#sbLogoMark" xlink:href="#sbLogoMark" transform="translate(0,164) scale(1,-1)"/>'
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
