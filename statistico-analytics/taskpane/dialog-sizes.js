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

/** All *-input.html / model-builder Office dialogs (Multiple Regression reference size). */
function inputBuilderSize() {
  return { height: 74, width: 30, displayInIframe: false };
}

const DIALOG_SIZE_PRESETS = {
  /** @deprecated Use REGRESSION_BUILDER or getInputBuilderDialogOptions() for input dialogs. */
  SETUP:               inputBuilderSize(),
  INPUT_BUILDER:       inputBuilderSize(),
  MIXED_SETUP:         inputBuilderSize(),
  RESULTS:             { height: 92, width: 70, displayInIframe: false },
  RESULTS_HUB:         { height: 96, width: 78, displayInIframe: false },
  RESULTS_CORRELATION: { height: 92, width: 70, displayInIframe: false },
  RESULTS_ANOVA:       { height: 92, width: 72, displayInIframe: false },
  MIXED_BUILDER:       inputBuilderSize(),
  MIXED_CONFIG_HUB:    inputBuilderSize(),
  REGRESSION_BUILDER:  inputBuilderSize(),
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

/** Fresh options for every model-builder / config input dialog (74% × 30%). */
function getInputBuilderDialogOptions() {
  return getDialogOptions('REGRESSION_BUILDER');
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
window.getInputBuilderDialogOptions = getInputBuilderDialogOptions;
