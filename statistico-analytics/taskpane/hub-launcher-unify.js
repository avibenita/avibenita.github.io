/**
 * Collapse the old Scan / Prepare pair into one Check & Prepare Data button.
 * Survives Excel caching an older hub-app-*.js while still loading this file.
 */
(function unifyPrepareLauncher() {
  'use strict';

  function labelText(el) {
    return String(el && el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isLegacyPrepareBtn(btn) {
    var t = labelText(btn);
    var id = (btn.getAttribute('data-module-id') || '').toLowerCase();
    return t === 'scan data quality' || t === 'prepare dataset' ||
      id === 'prepare-quality' || id === 'prepare-dataset';
  }

  function openUnified() {
    if (window.HubResultsBridge && typeof HubResultsBridge.open === 'function') {
      if (HubResultsBridge.open('prepare-data', 80)) return;
      if (HubResultsBridge.open('prepare-dataset', 80)) return;
      HubResultsBridge.open('prepare-quality', 80);
      return;
    }
    if (typeof navigateToModule === 'function') navigateToModule('prepare-data');
  }

  function unify() {
    var panel = document.querySelector('.hub-accordion-panel[data-section="prepare"] .hub-accordion-body');
    if (!panel) return false;
    var btns = Array.prototype.slice.call(panel.querySelectorAll('.category-module-btn'));
    var legacy = btns.filter(isLegacyPrepareBtn);
    if (!legacy.length) return btns.some(function (b) {
      return (b.getAttribute('data-module-id') || '') === 'prepare-data';
    });
    var keep = legacy[0];
    keep.setAttribute('data-module-id', 'prepare-data');
    keep.setAttribute('data-st-tip', 'Scan the Active Range, then recode, compute, filter, and reshape into a new worksheet.');
    var lab = keep.querySelector('.category-module-label');
    if (lab) lab.textContent = 'Check & Prepare Data';
    keep.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      openUnified();
    };
    for (var i = 1; i < legacy.length; i++) legacy[i].parentNode.removeChild(legacy[i]);
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    if (unify() || ++tries > 48) clearInterval(timer);
  }, 250);
})();
