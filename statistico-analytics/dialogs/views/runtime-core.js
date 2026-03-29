/**
 * StatisticoRuntime — single mode selector and bootstrap contract for all module pages.
 * Modes: hub-embed, office-dialog, office-taskpane, browser-standalone
 *
 * Load after Office.js (when present). Histogram / other modules call createRuntime(), installOfficeBootstrap(), then whenDomReady(bootstrap).
 */
(function (global) {
  'use strict';

  var MODE = {
    HUB_EMBED: 'hub-embed',
    OFFICE_DIALOG: 'office-dialog',
    OFFICE_TASKPANE: 'office-taskpane',
    BROWSER_STANDALONE: 'browser-standalone'
  };

  function getSearchParams() {
    return new URLSearchParams(global.location.search || '');
  }

  /**
   * After Office.initialize: dialog vs taskpane.
   * Prefer explicit ?dialog=1 on module URLs opened via Office.displayDialogAsync.
   * (Do not use self !== top — many taskpanes run in iframes and would misclassify.)
   */
  function refineOfficeMode(preliminary) {
    if (preliminary === MODE.HUB_EMBED || preliminary === MODE.BROWSER_STANDALONE) {
      return preliminary;
    }
    var params = getSearchParams();
    if (params.get('dialog') === '1') return MODE.OFFICE_DIALOG;
    try {
      if (typeof Office === 'undefined' || !Office.context) return MODE.BROWSER_STANDALONE;
    } catch (e) { /* ignore */ }
    return MODE.OFFICE_TASKPANE;
  }

  /**
   * Synchronous mode hint before Office.initialize (embed and trivial cases only).
   */
  function detectMode() {
    var params = getSearchParams();
    if (params.get('embed') === '1') return MODE.HUB_EMBED;
    if (typeof Office === 'undefined') return MODE.BROWSER_STANDALONE;
    return MODE.OFFICE_TASKPANE;
  }

  function createRuntime() {
    return {
      mode: detectMode(),
      officeMode: null,
      theme: getSearchParams().get('theme'),
      debug: getSearchParams().get('debug') === '1'
    };
  }

  function logRuntime(runtime, label) {
    console.log('[StatisticoRuntime]', label || 'runtime', {
      mode: runtime.mode,
      officeMode: runtime.officeMode,
      hasOffice: typeof Office !== 'undefined',
      hasContext: typeof Office !== 'undefined' && !!Office.context
    });
  }

  /**
   * Apply ?theme=light|dark before StatisticoHeader.init when shared header is present.
   */
  function applyUrlThemeOverride() {
    var t = getSearchParams().get('theme');
    if (t !== 'light' && t !== 'dark') return;
    if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.applyTheme) {
      StatisticoHeader.applyTheme(t);
    }
  }

  /**
   * Register Office.initialize. For hub-embed, no-op. For office/browser-off-Host paths, full init.
   * @param {object} runtime - from createRuntime()
   * @param {object} hooks
   * @param {function(string, object): void} hooks.onOfficeReady - (reason, runtime)
   */
  function installOfficeBootstrap(runtime, hooks) {
    hooks = hooks || {};
    if (runtime.mode === MODE.HUB_EMBED) {
      Office.initialize = function () {
        console.log('[StatisticoRuntime] Office.initialize no-op (hub-embed)');
      };
      return;
    }

    Office.initialize = function (reason) {
      runtime.officeMode = refineOfficeMode(runtime.mode);
      runtime.mode = runtime.officeMode;
      logRuntime(runtime, 'Office.initialize');
      if (hooks.onOfficeReady) hooks.onOfficeReady(reason, runtime);
    };
  }

  function whenDomReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /**
   * Try parse univariate payload from localStorage (office / browser bridge).
   */
  function tryLoadUnivariateFromStorage() {
    try {
      var raw = localStorage.getItem('univariateResults');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  global.StatisticoRuntime = {
    MODE: MODE,
    detectMode: detectMode,
    refineOfficeMode: refineOfficeMode,
    createRuntime: createRuntime,
    installOfficeBootstrap: installOfficeBootstrap,
    whenDomReady: whenDomReady,
    applyUrlThemeOverride: applyUrlThemeOverride,
    tryLoadUnivariateFromStorage: tryLoadUnivariateFromStorage,
    logRuntime: logRuntime
  };
})(typeof window !== 'undefined' ? window : this);
