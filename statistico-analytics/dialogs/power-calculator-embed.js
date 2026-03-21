/**
 * StatisticoPowerEmbed — open the shared Power & Sample Size calculator (mirrored at
 * /statistico-analytics/embed/index-calculator.html) in an iframe (default: floating panel on results pages).
 * Same flow as ANOVA "Power"; use from any analytics results page.
 */
(function (global) {
  'use strict';

  var EMBED_PATH = '/statistico-analytics/embed/index-calculator.html';
  /** Bump when calculator HTML/JS changes materially (Office/cache). */
  var CACHE_BUSTER = '20260331-1';

  var MODAL_ID = 'statisticoPowerEmbedModal';
  var IFRAME_ID = 'statisticoPowerEmbedIframe';
  var PRESENTATION_ATTR = 'data-statistico-pe-presentation';

  function clearPeLayout(modal) {
    if (!modal) return;
    [
      'position',
      'top',
      'left',
      'right',
      'bottom',
      'width',
      'height',
      'min-height',
      'max-height',
      'z-index',
      'align-items',
      'justify-content',
      'background',
      'backdrop-filter',
      '-webkit-backdrop-filter',
      'pointer-events',
      'padding',
      'display',
    ].forEach(function (k) {
      modal.style.removeProperty(k);
    });
    var panel = modal.querySelector('.statistico-pe-modal-container');
    if (!panel) return;
    [
      'width',
      'height',
      'max-height',
      'max-width',
      'pointer-events',
      'flex',
      'position',
      'top',
      'left',
      'right',
      'bottom',
      'z-index',
      'margin-inline',
      'margin-inline-start',
      'margin-inline-end',
      'cursor',
    ].forEach(function (k) {
      panel.style.removeProperty(k);
    });
    var header = modal.querySelector('.statistico-pe-modal-header');
    if (header) header.style.removeProperty('cursor');
  }

  /**
   * Full-viewport shell (!important) so Office / transformed ancestors do not collapse the overlay (~250px tall).
   * Then floating vs centered modal flex alignment.
   */
  function applyOpenLayout(modal, presentation) {
    clearPeLayout(modal);
    var panel = modal.querySelector('.statistico-pe-modal-container');
    if (!panel) return;

    modal.style.setProperty('position', 'fixed', 'important');
    modal.style.setProperty('top', '0', 'important');
    modal.style.setProperty('left', '0', 'important');
    modal.style.setProperty('right', '0', 'important');
    modal.style.setProperty('bottom', '0', 'important');
    modal.style.setProperty('width', '100%', 'important');
    modal.style.setProperty('height', '100%', 'important');
    modal.style.setProperty('min-height', '100%', 'important');
    modal.style.setProperty('z-index', '10000', 'important');

    if (presentation === 'floating') {
      /* Fixed corner panel: flex + margin-inline is unreliable in Office WebViews; pin with top/left/right/bottom. */
      var narrow = global.innerWidth <= 600;
      var rtl = false;
      try {
        rtl = global.getComputedStyle(document.documentElement).direction === 'rtl';
      } catch (e0) { /* ignore */ }

      modal.style.setProperty('display', 'block', 'important');
      modal.style.setProperty('background', 'transparent', 'important');
      modal.style.setProperty('backdrop-filter', 'none', 'important');
      modal.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
      modal.style.setProperty('pointer-events', 'none', 'important');
      modal.style.setProperty('padding', '0', 'important');

      panel.style.setProperty('position', 'fixed', 'important');
      panel.style.setProperty('z-index', '10001', 'important');
      panel.style.setProperty('pointer-events', 'auto', 'important');
      panel.style.setProperty('top', 'auto', 'important');
      panel.style.setProperty('bottom', '16px', 'important');
      if (narrow) {
        panel.style.setProperty('left', '8px', 'important');
        panel.style.setProperty('right', '8px', 'important');
        panel.style.setProperty('width', 'auto', 'important');
        panel.style.setProperty('max-width', 'none', 'important');
      } else if (rtl) {
        panel.style.setProperty('left', '16px', 'important');
        panel.style.setProperty('right', 'auto', 'important');
        panel.style.setProperty('width', 'min(460px, calc(100vw - 32px))', 'important');
      } else {
        panel.style.setProperty('right', '16px', 'important');
        panel.style.setProperty('left', 'auto', 'important');
        panel.style.setProperty('width', 'min(460px, calc(100vw - 32px))', 'important');
      }
      panel.style.setProperty('height', narrow ? 'min(86vh, 720px)' : 'min(78vh, 720px)', 'important');
      panel.style.setProperty('max-height', narrow ? '90vh' : 'min(85vh, 760px)', 'important');

      var header = modal.querySelector('.statistico-pe-modal-header');
      if (header) header.style.setProperty('cursor', 'move', 'important');
    } else {
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('align-items', 'center', 'important');
      modal.style.setProperty('justify-content', 'center', 'important');
      modal.style.setProperty('pointer-events', 'auto', 'important');
    }
  }

  function injectParams(usp, params) {
    if (!params || typeof params !== 'object') return;
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      usp.set(k, String(v));
    });
  }

  /**
   * Build absolute or relative URL to the calculator with query string.
   * @param {Record<string,string|number|boolean|undefined|null>} params
   */
  function buildCalculatorUrl(params) {
    var usp = new URLSearchParams();
    injectParams(usp, params);
    if (!usp.has('theme')) usp.set('theme', 'light');
    if (!usp.has('_cb')) usp.set('_cb', CACHE_BUSTER);

    if (global.location.protocol === 'file:') {
      /* dialogs/views/<module>/<file>.html → ../../../embed/ */
      return '../../../embed/index-calculator.html?' + usp.toString();
    }
    var href = new URL(EMBED_PATH + '?' + usp.toString(), global.location.origin).href;
    try {
      var u = new URL(href);
      var p = u.pathname || '';
      if (p.indexOf('index-calculator') >= 0 && p.indexOf('/statistico-analytics/embed/') < 0) {
        href = new URL(EMBED_PATH + '?' + usp.toString(), global.location.origin).href;
      }
    } catch (_e) { /* keep href */ }
    return href;
  }

  function ensureModal() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'statistico-pe-modal-overlay statistico-pe-modal-overlay--light';
    modal.innerHTML =
      '<div class="statistico-pe-modal-container statistico-pe-popup-light">' +
      '<div class="statistico-pe-modal-header">' +
      '<div class="statistico-pe-modal-title"><i class="fas fa-calculator"></i> Power &amp; Sample Size Calculator</div>' +
      '<button type="button" class="statistico-pe-modal-close" data-statistico-pe-close title="Close">' +
      '<i class="fas fa-times"></i></button>' +
      '</div>' +
      '<iframe class="statistico-pe-modal-iframe" id="' +
      IFRAME_ID +
      '" title="Power and sample size calculator" src=""></iframe>' +
      '</div>';

    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target !== modal) return;
      if (modal.getAttribute(PRESENTATION_ATTR) === 'floating') return;
      close();
    });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });

    return modal;
  }

  function bindPeClose(modal) {
    var btn = modal.querySelector('[data-statistico-pe-close]');
    if (!btn) return;
    btn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      close();
    };
  }

  /** Drag floating panel by header (Office sometimes mishandles bubbled clicks; header stays above iframe via CSS z-index). */
  function wireFloatingDrag(modal) {
    if (modal.getAttribute('data-statistico-pe-drag-wired') === '1') return;
    modal.setAttribute('data-statistico-pe-drag-wired', '1');
    var header = modal.querySelector('.statistico-pe-modal-header');
    var panel = modal.querySelector('.statistico-pe-modal-container');
    if (!header || !panel) return;

    header.addEventListener('mousedown', function (e) {
      if (modal.getAttribute(PRESENTATION_ATTR) !== 'floating') return;
      if (e.button !== 0) return;
      if (e.target.closest('[data-statistico-pe-close]')) return;
      e.preventDefault();
      var r = panel.getBoundingClientRect();
      var dx = e.clientX - r.left;
      var dy = e.clientY - r.top;

      function move(ev) {
        var nx = ev.clientX - dx;
        var ny = ev.clientY - dy;
        var w = panel.getBoundingClientRect().width;
        var h = panel.getBoundingClientRect().height;
        var maxX = Math.max(0, global.innerWidth - w);
        var maxY = Math.max(0, global.innerHeight - h);
        nx = Math.min(Math.max(0, nx), maxX);
        ny = Math.min(Math.max(0, ny), maxY);
        panel.style.setProperty('position', 'fixed', 'important');
        panel.style.setProperty('left', nx + 'px', 'important');
        panel.style.setProperty('top', ny + 'px', 'important');
        panel.style.setProperty('right', 'auto', 'important');
        panel.style.setProperty('bottom', 'auto', 'important');
      }
      function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  /**
   * Open embed calculator.
   * @param {object} params Query params; must include `test` (e.g. anova, two-sample-mean, one-sample-mean).
   *        Common: alpha, power, autoCalculate, source, alternative, plus test-specific fields.
   *        presentation: 'modal' — optional; omit for floating (corner panel, no dimmer, page scrollable).
   */
  function open(params) {
    var p = Object.assign({}, params || {});
    var presentation = p.presentation === 'modal' ? 'modal' : 'floating';
    delete p.presentation;
    if (!p.test) {
      console.warn('StatisticoPowerEmbed.open: missing test; defaulting to two-sample-mean');
      p.test = 'two-sample-mean';
    }
    if (p.autoCalculate === undefined || p.autoCalculate === true) {
      p.autoCalculate = 'true';
    } else if (p.autoCalculate === false) {
      p.autoCalculate = 'false';
    }

    var href = buildCalculatorUrl(p);
    try {
      console.log('StatisticoPowerEmbed URL:', href);
    } catch (_e) { /* ignore */ }

    var modal = ensureModal();
    wireFloatingDrag(modal);
    bindPeClose(modal);
    modal.setAttribute(PRESENTATION_ATTR, presentation);
    if (presentation === 'floating') {
      modal.classList.add('statistico-pe-modal-overlay--floating');
    } else {
      modal.classList.remove('statistico-pe-modal-overlay--floating');
    }
    applyOpenLayout(modal, presentation);
    var iframe = document.getElementById(IFRAME_ID);
    if (iframe) iframe.src = href;
    modal.classList.add('open');
    document.body.style.overflow = presentation === 'modal' ? 'hidden' : '';
  }

  function close() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.classList.remove('open');
      clearPeLayout(modal);
    }
    document.body.style.overflow = '';
  }

  /** @deprecated Use close */
  function closePowerModal() {
    close();
  }

  global.StatisticoPowerEmbed = {
    open: open,
    close: close,
    closePowerModal: closePowerModal,
    EMBED_PATH: EMBED_PATH,
    CACHE_BUSTER: CACHE_BUSTER,
    buildCalculatorUrl: function (p) {
      return buildCalculatorUrl(p);
    },
  };

  try {
    console.info('[StatisticoPowerEmbed] loaded', CACHE_BUSTER);
  } catch (eLog) { /* ignore */ }
})(typeof window !== 'undefined' ? window : this);
