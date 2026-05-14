/**
 * Shared Office dialog dimension presets for Statistico Analytics.
 *
 * All values are percentages of screen height/width as required by
 * Office.context.ui.displayDialogAsync.
 *
 * Add this script to every taskpane HTML before other scripts:
 *   <script src="./dialog-sizes.js"></script>   (taskpane root)
 *   <script src="../dialog-sizes.js"></script>  (taskpane sub-folders)
 */

const DIALOG_SIZES = window.DIALOG_SIZES = {
  // Narrow setup / config builder dialogs (most modules)
  SETUP:               { height: 70, width: 25, displayInIframe: false },

  // Standard results dialogs (most modules)
  RESULTS:             { height: 72, width: 70, displayInIframe: false },

  // Hub univariate results (wider vertical footprint)
  RESULTS_HUB:         { height: 90, width: 70, displayInIframe: false },

  // Correlation matrix results (taller than standard)
  RESULTS_CORRELATION: { height: 76, width: 70, displayInIframe: false },

  // ANOVA results (slightly wider than standard)
  RESULTS_ANOVA:       { height: 72, width: 72, displayInIframe: false },

  // Mixed model: full-width input builder dialog
  MIXED_BUILDER:       { height: 73, width: 95, displayInIframe: false },

  // Mixed model: hub-opened config dialog
  MIXED_CONFIG_HUB:    { height: 98, width: 40, displayInIframe: false },

  // Regression model builder (standalone regression.html)
  REGRESSION_BUILDER:  { height: 72, width: 30, displayInIframe: false },

  // base-analytics-office.js generic openDialog
  BASE_ANALYTICS:      { height: 80, width: 60, displayInIframe: false },

  // univariate-input-panel opens results inside an iframe
  RESULTS_IFRAME:      { height: 72, width: 70, displayInIframe: true },
};
