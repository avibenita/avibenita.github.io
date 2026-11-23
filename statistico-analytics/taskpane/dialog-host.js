/**
 * Shared Office dialog lifecycle helpers for Statistico taskpanes.
 * Ensures taskpane UI is restored after any dialog closes (X button or message).
 */
(function (global) {
  'use strict';

  function releaseTaskpaneAfterDialog() {
    if (global.document && global.document.body) {
      global.document.body.classList.remove('direct-config-opening');
    }
    [global.onModuleDialogClosed, global.onUnivariateConfigDialogClosed].forEach(function (fn) {
      if (typeof fn === 'function') {
        try { fn(); } catch (_e) {}
      }
    });
    if (typeof global.unlockTaskpaneUI === 'function') {
      try { global.unlockTaskpaneUI(); } catch (_e2) {}
    }
  }

  function safeCloseDialog(dialog) {
    if (!dialog) return;
    try { dialog.close(); } catch (_e) {}
  }

  /** User dismissed dialog via Office chrome (X). */
  function onUserClosed(dialog, onClosed) {
    if (!dialog || !global.Office || !global.Office.EventType) return;
    dialog.addEventHandler(global.Office.EventType.DialogEventReceived, function () {
      if (typeof onClosed === 'function') onClosed();
      releaseTaskpaneAfterDialog();
    });
  }

  /** Dialog sent { action: "close" } — close, clear ref, restore taskpane. */
  function closeFromMessage(dialog, onClosed) {
    safeCloseDialog(dialog);
    if (typeof onClosed === 'function') onClosed();
    releaseTaskpaneAfterDialog();
  }

  var openDialogs = 0;

  function hasOpenDialog() {
    return openDialogs > 0;
  }

  function notifyViewsClosed() {
    global.setTimeout(function () {
      if (openDialogs > 0) return;
      if (typeof global.hubRefreshInputAfterViewsClosed === 'function') {
        try { global.hubRefreshInputAfterViewsClosed(); } catch (_e) {}
      }
    }, 350);
  }

  function trackDialog(dialog) {
    if (!dialog || dialog.__statisticoTracked) return;
    dialog.__statisticoTracked = true;
    openDialogs += 1;
    if (!global.Office || !global.Office.EventType) return;
    try {
      dialog.addEventHandler(global.Office.EventType.DialogEventReceived, function (arg) {
        var code = arg && (arg.error != null ? arg.error : arg.errorCode);
        if (code != null && Number(code) !== 12006) return;
        if (dialog.__statisticoClosed) return;
        dialog.__statisticoClosed = true;
        openDialogs = Math.max(0, openDialogs - 1);
        if (openDialogs === 0) notifyViewsClosed();
      });
    } catch (_e) {}
  }

  function installDialogTracking() {
    var ui = global.Office && global.Office.context && global.Office.context.ui;
    if (!ui || ui.__statisticoDialogTrack || typeof ui.displayDialogAsync !== 'function') return;
    var native = ui.displayDialogAsync.bind(ui);
    ui.displayDialogAsync = function (url, options, callback) {
      var userCb = typeof options === 'function' ? options : callback;
      function wrapped(result) {
        try {
          if (result && result.status === global.Office.AsyncResultStatus.Succeeded && result.value) {
            trackDialog(result.value);
          }
        } catch (_e) {}
        if (typeof userCb === 'function') userCb(result);
      }
      if (typeof options === 'function' || arguments.length < 3) return native(url, wrapped);
      return native(url, options, wrapped);
    };
    ui.__statisticoDialogTrack = true;
  }

  if (global.Office && typeof global.Office.onReady === 'function') {
    global.Office.onReady(function () { installDialogTracking(); });
  }

  global.StatisticoDialogHost = {
    releaseTaskpaneAfterDialog: releaseTaskpaneAfterDialog,
    safeCloseDialog: safeCloseDialog,
    onUserClosed: onUserClosed,
    closeFromMessage: closeFromMessage,
    hasOpenDialog: hasOpenDialog,
    installDialogTracking: installDialogTracking
  };
})(window);
