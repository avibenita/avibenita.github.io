/**

 * Shared Office dialog dimension presets for Statistico Analytics.

 *

 * All values are percentages of screen height/width as required by

 * Office.context.ui.displayDialogAsync.

 *

 * INPUT BUILDER HEIGHT — single source of truth for every *-input.html dialog:

 *   taskpane/dialog-sizes.js  →  inputBuilderSize()  →  DIALOG_SIZES.REGRESSION_BUILDER

 *   (also SETUP, INPUT_BUILDER, MIXED_*, etc. — all clone inputBuilderSize())

 *

 * Call sites pass the preset to displayDialogAsync, e.g.:

 *   Office.context.ui.displayDialogAsync(url, DIALOG_SIZES.REGRESSION_BUILDER, cb)

 *   Office.context.ui.displayDialogAsync(url, getInputBuilderDialogOptions(), cb)

 *

 * IMPORTANT: Office.js mutates the options object passed to displayDialogAsync.

 * Always pass a fresh clone — use DIALOG_SIZES.KEY (returns a new object each

 * access) or getDialogOptions('KEY').

 *

 * Add this script to every taskpane HTML before other scripts:

 *   <script src="./dialog-sizes.js?v=20260609j"></script>

 */



/** Bump when changing presets — keep in sync with taskpane HTML ?v= query strings. */

const DIALOG_SIZES_ASSET_VER = '20260609j';



/** All model-builder / *-input.html Office dialogs (% of screen). Was 92; reduced 20% → 74. */

const INPUT_BUILDER_HEIGHT_PERCENT = 74;

const INPUT_BUILDER_WIDTH_PERCENT = 30;



function inputBuilderSize() {

  return {

    height: INPUT_BUILDER_HEIGHT_PERCENT,

    width: INPUT_BUILDER_WIDTH_PERCENT,

    displayInIframe: false

  };

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



/** Fresh options for every model-builder / config input dialog. */

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



window.DIALOG_SIZES_ASSET_VER = DIALOG_SIZES_ASSET_VER;

window.INPUT_BUILDER_HEIGHT_PERCENT = INPUT_BUILDER_HEIGHT_PERCENT;

window.getDialogOptions = getDialogOptions;

window.getInputBuilderDialogOptions = getInputBuilderDialogOptions;


