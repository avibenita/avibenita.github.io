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

  global.StatisticoDialogHost = {
    releaseTaskpaneAfterDialog: releaseTaskpaneAfterDialog,
    safeCloseDialog: safeCloseDialog,
    onUserClosed: onUserClosed,
    closeFromMessage: closeFromMessage
  };
})(window);
