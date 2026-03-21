/**
 * StatisticoPowerEmbed — open the shared Power & Sample Size calculator (mirrored at
 * /statistico-analytics/embed/index-calculator.html) in an iframe (default: floating panel on results pages).
 * Same flow as ANOVA "Power"; use from any analytics results page.
 */
(function (global) {
  'use strict';

  var EMBED_PATH = '/statistico-analytics/embed/index-calculator.html';
  /** Bump when calculator HTML/JS changes materially (Office/cache). */
  var CACHE_BUSTER = '20260325-1';

  var MODAL_ID = 'statisticoPowerEmbedModal';
  var IFRAME_ID = 'statisticoPowerEmbedIframe';
  var PRESENTATION_ATTR = 'data-statistico-pe-presentation';

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
      '<button type="button" class="statistico-pe-modal-close" data-statistico-pe-close title="Close"><i class="fas fa-times"></i></button>' +
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
    modal.querySelector('[data-statistico-pe-close]').addEventListener('click', function (e) {
      e.preventDefault();
      close();
    });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });

    return modal;
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
    modal.setAttribute(PRESENTATION_ATTR, presentation);
    if (presentation === 'floating') {
      modal.classList.add('statistico-pe-modal-overlay--floating');
    } else {
      modal.classList.remove('statistico-pe-modal-overlay--floating');
    }
    var iframe = document.getElementById(IFRAME_ID);
    if (iframe) iframe.src = href;
    modal.classList.add('open');
    document.body.style.overflow = presentation === 'modal' ? 'hidden' : '';
  }

  function close() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove('open');
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
})(typeof window !== 'undefined' ? window : this);
