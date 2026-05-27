/**
 * Shared Office dialog dimension presets for Statistico Analytics.
 *
 * All values are percentages of screen height/width as required by
 * Office.context.ui.displayDialogAsync.
 *
 * IMPORTANT: Office.js mutates the options object passed to displayDialogAsync.
 * Always pass a fresh clone — use DIALOG_SIZES.KEY (returns a new object each
 * access) or getDialogOptions('KEY').
 *
 * Add this script to every taskpane HTML before other scripts:
 *   <script src="./dialog-sizes.js"></script>   (taskpane root)
 *   <script src="../dialog-sizes.js"></script>  (taskpane sub-folders)
 */

const DIALOG_SIZE_PRESETS = {
  SETUP:               { height: 70, width: 25, displayInIframe: false },
  RESULTS:             { height: 92, width: 70, displayInIframe: false },
  RESULTS_HUB:         { height: 96, width: 78, displayInIframe: false },
  RESULTS_CORRELATION: { height: 92, width: 70, displayInIframe: false },
  RESULTS_ANOVA:       { height: 92, width: 72, displayInIframe: false },
  MIXED_BUILDER:       { height: 70, width: 25, displayInIframe: false },
  MIXED_CONFIG_HUB:    { height: 70, width: 25, displayInIframe: false },
  REGRESSION_BUILDER:  { height: 92, width: 30, displayInIframe: false },
  BASE_ANALYTICS:      { height: 80, width: 60, displayInIframe: false },
  RESULTS_IFRAME:      { height: 72, width: 70, displayInIframe: true }
};

function cloneDialogOptions(preset) {
  return {
    height: preset.height,
    width: preset.width,
    displayInIframe: !!preset.displayInIframe
  };
}

function getDialogOptions(key) {
  var preset = DIALOG_SIZE_PRESETS[key] || DIALOG_SIZE_PRESETS.RESULTS;
  return cloneDialogOptions(preset);
}

/** Each property access returns a fresh options object safe for displayDialogAsync. */
const DIALOG_SIZES = window.DIALOG_SIZES = new Proxy(DIALOG_SIZE_PRESETS, {
  get: function (target, prop) {
    if (Object.prototype.hasOwnProperty.call(target, prop)) {
      return cloneDialogOptions(target[prop]);
    }
    return target[prop];
  }
});

window.getDialogOptions = getDialogOptions;
