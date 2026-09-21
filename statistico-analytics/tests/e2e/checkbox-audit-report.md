# Statistico checkbox interaction audit

Generated 2026-09-21T10:13:16.991Z. Production checkbox CSS and shared-header.js were not changed.

## How to read the totals

The previous run reported Discovered 206, Tested 78, and NOT_REACHED 145 as if they were one population. They were not:

- **206** counted every discovered checkbox node **once per viewport** (and included hidden DOM nodes that were never user-visible).
- **78** counted executions that left `NOT_REACHED` (again doubled when both viewports ran).
- **145** counted remaining executions, including page-level “none discovered” rows. `78 + 145 = 223` total report rows, not 206.

This report splits **unique checkboxes** (module + selector, one row) from **executions** (unique × viewports that actually ran).

## Totals

| Metric | Unique checkboxes | Executions (viewports) |
|---|---:|---:|
| Discovered (checkbox nodes) | 124 | 222 |
| Tested (not NOT_REACHED) | 63 | 102 |
| INTERACTION_PASS | 0 | 0 |
| EFFECT_PASS | 0 | 0 |
| NEEDS_EXPECTATION | 14 | 27 |
| FAIL_VISIBLE_CLICK | 10 | 20 |
| FAIL_KEYBOARD | 36 | 49 |
| INTENTIONALLY_DISABLED | 3 | 6 |
| NOT_REACHED | 78 | 137 |
| Pages with unreached controls | 35 | |

Visible-target clicks are used. Hidden native inputs with `pointer-events:none` are not scored as click failures.

## Separate defects

- SEPARATE_DEFECT: Univariate createHistogram throws ReferenceError: coun is not defined (not a checkbox bug)

## Results

| Module | Checkbox | Click | Label | Keyboard | Focus | State changed | Intended effect | Console error | Result |
|---|---|---|---|---|---|---|---|---|---|
| Analytics Hub (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Univariate Workspace (full-1366x768) | Normal | yes | yes | no | input#showNormalCurve (visible) | yes | Histogram redraws with a normal-curve overlay | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie | FAIL_KEYBOARD |
| Univariate Workspace (full-1366x768) | Mean | yes | yes | no | input#showMeanLine (visible) | yes | Histogram redraws with a mean line | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie | FAIL_KEYBOARD |
| Univariate Workspace (full-1366x768) | Median | yes | yes | no | input#showMedianLine (visible) | yes | Histogram redraws with a median line | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie | FAIL_KEYBOARD |
| Univariate Workspace (taskpane-400x768) | Normal | yes | yes | no | input#showNormalCurve (visible) | yes | Histogram redraws with a normal-curve overlay | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie | FAIL_KEYBOARD |
| Univariate Workspace (taskpane-400x768) | Mean | yes | yes | no | input#showMeanLine (visible) | yes | Histogram redraws with a mean line | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie | FAIL_KEYBOARD |
| Univariate Workspace (taskpane-400x768) | Median | yes | yes | no | input#showMedianLine (visible) | yes | Histogram redraws with a median line | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie | FAIL_KEYBOARD |
| Univariate Input (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Univariate Histogram (full-1366x768) | Normal | yes | yes | no | input#showNormalCurve (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Univariate Histogram (full-1366x768) | Mean | yes | yes | no | input#showMeanLine (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Univariate Histogram (full-1366x768) | Median | yes | yes | no | input#showMedianLine (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Univariate Histogram (taskpane-400x768) | Normal | yes | yes | no | input#showNormalCurve (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Univariate Histogram (taskpane-400x768) | Mean | yes | yes | no | input#showMeanLine (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Univariate Histogram (taskpane-400x768) | Median | yes | yes | no | input#showMedianLine (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation Matrix (full-1366x768) | p-value | yes | yes | no | input#showPValue (visible) | yes | Correlation table shows or hides p-value cells via toggleDisplay() |  | FAIL_KEYBOARD |
| Correlation Matrix (full-1366x768) | N | yes | yes | no | input#showN (visible) | yes | Correlation table shows or hides pairwise N via toggleDisplay() |  | FAIL_KEYBOARD |
| Correlation Matrix (full-1366x768) | Show r values | n/a | n/a | n/a |  | n/a | Network edges show correlation values |  | NOT_REACHED |
| Correlation Matrix (full-1366x768) | Only connected variables | n/a | n/a | n/a |  | n/a | Isolated network nodes are hidden |  | NOT_REACHED |
| Correlation Matrix (taskpane-400x768) | p-value | yes | yes | no | input#showPValue (visible) | yes | Correlation table shows or hides p-value cells via toggleDisplay() |  | FAIL_KEYBOARD |
| Correlation Matrix (taskpane-400x768) | N | yes | yes | no | input#showN (visible) | yes | Correlation table shows or hides pairwise N via toggleDisplay() |  | FAIL_KEYBOARD |
| Correlation Matrix (taskpane-400x768) | Show r values | n/a | n/a | n/a |  | n/a | Network edges show correlation values |  | NOT_REACHED |
| Correlation Matrix (taskpane-400x768) | Only connected variables | n/a | n/a | n/a |  | n/a | Isolated network nodes are hidden |  | NOT_REACHED |
| Partial Correlation (full-1366x768) | Show p-values | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Partial Correlation (full-1366x768) | Show df | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Partial Correlation (taskpane-400x768) | Show p-values | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Partial Correlation (taskpane-400x768) | Show df | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Taylor Diagram (full-1366x768) | Normalize to SD=1.0 ACTIVE | yes | yes | no | input#normalize-toggle (visible) | yes | Taylor reference panel shows the ACTIVE badge when normalized |  | FAIL_KEYBOARD |
| Taylor Diagram (taskpane-400x768) | Normalize to SD=1.0 ACTIVE | yes | yes | no | input#normalize-toggle (visible) | yes | Taylor reference panel shows the ACTIVE badge when normalized |  | FAIL_KEYBOARD |
| Correlation Network (full-1366x768) | Show r | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Network (full-1366x768) | Only connected variables | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Network (taskpane-400x768) | Show r | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Network (taskpane-400x768) | Only connected variables | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Results (full-1366x768) | Show p-value | yes | yes | no | input#showPValue (visible) | yes | NEEDS_EXPECTATION | Invalid correlation data / Invalid correlation data / Invalid correlation data / Invalid correlation data | FAIL_KEYBOARD |
| Correlation Results (full-1366x768) | Show n | yes | yes | no | input#showN (visible) | yes | NEEDS_EXPECTATION | Invalid correlation data / Invalid correlation data / Invalid correlation data / Invalid correlation data | FAIL_KEYBOARD |
| Correlation Results (full-1366x768) | Show r | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Results (taskpane-400x768) | Show p-value | yes | yes | no | input#showPValue (visible) | yes | NEEDS_EXPECTATION | Invalid correlation data / Invalid correlation data / Invalid correlation data / Invalid correlation data | FAIL_KEYBOARD |
| Correlation Results (taskpane-400x768) | Show n | yes | yes | no | input#showN (visible) | yes | NEEDS_EXPECTATION | Invalid correlation data / Invalid correlation data / Invalid correlation data / Invalid correlation data | FAIL_KEYBOARD |
| Correlation Results (taskpane-400x768) | Show r | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation By Group (full-1366x768) | All curves in one chart | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation By Group (taskpane-400x768) | All curves in one chart | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation By Group (taskpane-400x768) | Age="23" n=2 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation By Group (taskpane-400x768) | Age="24" n=1 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation By Group (taskpane-400x768) | Age="26" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="27" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="28" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="29" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="31" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="36" n=3 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="37" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="38" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="39" n=3 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="40" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="42" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="43" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="44" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="45" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="49" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="50" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="52" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="54" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="55" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="56" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="57" n=4 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="58" n=2 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="59" n=1 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation By Group (taskpane-400x768) | Age="61" n=4 | yes | yes | no |  | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Correlation Reliability (full-1366x768) | Show Mean / SD | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Reliability (taskpane-400x768) | Show Mean / SD | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression Input (full-1366x768) | Include intercept (β₀) | yes | yes | yes | input#chkIncludeIntercept (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Regression Input (taskpane-400x768) | Include intercept (β₀) | yes | yes | yes | input#chkIncludeIntercept (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Regression Coefficients (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Regression By Group (full-1366x768) | Show 95% CI | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (full-1366x768) | Show overall model | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (full-1366x768) | 95% CI for the mean | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (taskpane-400x768) | Show 95% CI | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (taskpane-400x768) | Show overall model | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (taskpane-400x768) | 95% CI for the mean | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Reliability Input (full-1366x768) | Cronbach’s alpha | yes | yes | no | input#optOmega (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Reliability Input (full-1366x768) | McDonald’s omega total (one-factor common-factor model) | yes | yes | yes | input#optOmega (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Standardized alpha | yes | yes | yes | input#optStdAlpha (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Confidence interval | yes | yes | yes | input#optCI (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Corrected item–total correlation | yes | yes | yes | input#optITC (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Alpha if item deleted | yes | yes | yes | input#optAlphaDel (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Omega if item deleted | yes | yes | yes | input#optOmegaDel (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Inter-item correlation matrix | yes | yes | yes | input#optMatrix (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Flag weak item–total correlations below | yes | yes | yes | input#optFlagWeak (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Unidimensionality check (diagnostic) | yes | yes | yes | input#optUni (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Scree plot | yes | yes | yes | input#optScree (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Cronbach’s alpha | yes | yes | no | input#optOmega (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Reliability Input (taskpane-400x768) | McDonald’s omega total (one-factor common-factor model) | yes | yes | yes | input#optOmega (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Standardized alpha | yes | yes | yes | input#optStdAlpha (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Confidence interval | yes | yes | yes | input#optCI (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Corrected item–total correlation | yes | yes | yes | input#optITC (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Alpha if item deleted | yes | yes | yes | input#optAlphaDel (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Omega if item deleted | yes | yes | yes | input#optOmegaDel (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Inter-item correlation matrix | yes | yes | yes | input#optMatrix (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Flag weak item–total correlations below | yes | yes | yes | input#optFlagWeak (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Unidimensionality check (diagnostic) | yes | yes | yes | input#optUni (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Scree plot | yes | yes | yes | input#optScree (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Reliability Analysis (full-1366x768) | Pairwise N | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Reliability Analysis (taskpane-400x768) | Pairwise N | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Mixed Model Input (full-1366x768) | Type III Fixed Effects | no | no | yes | input#chkTypeIII (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (full-1366x768) | Fixed Effect Coefficients | no | no | yes | input#chkCoeffs (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (full-1366x768) | Variance Components | no | no | yes | input#chkVarComp (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (full-1366x768) | Estimated Marginal Means | no | no | yes | input#chkEMM (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (full-1366x768) | Pairwise Contrasts | no | no | yes | input#chkPairwise (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (full-1366x768) | BLUPs (Random Predictions) | no | no | yes | input#chkBLUP (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (full-1366x768) | Residual Diagnostics | no | no | yes | input#chkResid (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (full-1366x768) | Information Criteria (AIC/BIC) | no | no | yes | input#chkIC (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (full-1366x768) | Pseudo R² (marginal & conditional) | no | no | yes | input#chkPseudoR2 (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | Type III Fixed Effects | no | no | yes | input#chkTypeIII (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | Fixed Effect Coefficients | no | no | yes | input#chkCoeffs (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | Variance Components | no | no | yes | input#chkVarComp (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | Estimated Marginal Means | no | no | yes | input#chkEMM (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | Pairwise Contrasts | no | no | yes | input#chkPairwise (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | BLUPs (Random Predictions) | no | no | yes | input#chkBLUP (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | Residual Diagnostics | no | no | yes | input#chkResid (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | Information Criteria (AIC/BIC) | no | no | yes | input#chkIC (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Input (taskpane-400x768) | Pseudo R² (marginal & conditional) | no | no | yes | input#chkPseudoR2 (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Mixed Model Results (full-1366x768) | Overlay Results | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Mixed Model Results (taskpane-400x768) | Overlay Results | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| PCA (full-1366x768) | Show | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| PCA (taskpane-400x768) | Show | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (full-1366x768) | optCumLine | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (full-1366x768) | optThreshLine | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (full-1366x768) | optLabels | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (taskpane-400x768) | optCumLine | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (taskpane-400x768) | optThreshLine | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (taskpane-400x768) | optLabels | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Input (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Segmentation Input (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Segmentation Results (full-1366x768) | Show overall benchmark | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Segmentation Results (full-1366x768) | Show statistical evidence | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Segmentation Results (taskpane-400x768) | Show overall benchmark | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Segmentation Results (taskpane-400x768) | Show statistical evidence | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Input (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | Data labels | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | Data labels | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency By Group (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Meta-Analysis Input (full-1366x768) | Hartung–Knapp adjustment (recommended for random-effects) iAdjusts the SE of the pooled effect using observed between-study dispersion. Useful with few studies; can be conservative. | yes | yes | yes | input#hartungKnapp (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Meta-Analysis Input (taskpane-400x768) | Hartung–Knapp adjustment (recommended for random-effects) iAdjusts the SE of the pooled effect using observed between-study dispersion. Useful with few studies; can be conservative. | yes | yes | yes | input#hartungKnapp (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Meta-Analysis Results (full-1366x768) | Include Anderson 2019 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Chen 2020 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Rivera 2021 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Okada 2022 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Müller 2023 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Patel 2024 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Anderson 2019 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Chen 2020 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Rivera 2021 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Okada 2022 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Müller 2023 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Patel 2024 | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Cluster Input (full-1366x768) | Standardise variables (recommended) iRescales every variable to mean 0, SD 1 before computing distances. Strongly recommended when variables use different units — otherwise the largest-scale variable dominates. Untick to match SPSS QUICK CLUSTER, which uses raw values. | no | no | yes | input#clusterStandardize (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Cluster Input (taskpane-400x768) | Standardise variables (recommended) iRescales every variable to mean 0, SD 1 before computing distances. Strongly recommended when variables use different units — otherwise the largest-scale variable dominates. Untick to match SPSS QUICK CLUSTER, which uses raw values. | no | no | yes | input#clusterStandardize (visible) | yes | NEEDS_EXPECTATION |  | FAIL_VISIBLE_CLICK |
| Cluster Analysis (full-1366x768) | Center trails | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Cluster Analysis (full-1366x768) | Merge trails | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Cluster Analysis (taskpane-400x768) | Center trails | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Cluster Analysis (taskpane-400x768) | Merge trails | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Factor Analysis Input (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Factor Analysis Results (full-1366x768) | 95% ellipse | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Factor Analysis Results (taskpane-400x768) | 95% ellipse | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Show Overall column | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Show P value column | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Show standardized difference (SMD) | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Use a common analysis sample for all rows | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Show "Missing" as its own category by default | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Italic title | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Bold caption label | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Leading zero in p-values | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Show Overall column | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Show P value column | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Show standardized difference (SMD) | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Use a common analysis sample for all rows | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Show "Missing" as its own category by default | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Italic title | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Bold caption label | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Leading zero in p-values | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (full-1366x768) | Changed rows only | yes | yes | yes | input#changedOnly (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Prepare Dataset (taskpane-400x768) | Changed rows only | yes | yes | yes | input#changedOnly (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Prepare Quality (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Logistic Input (full-1366x768) | Include intercept (β₀) | yes | yes | yes | input#chkIncludeIntercept (visible) | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Logistic Input (taskpane-400x768) | Include intercept (β₀) | yes | yes | no | div (visible) | yes | NEEDS_EXPECTATION |  | FAIL_KEYBOARD |
| Logistic Results (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | p-value | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | n | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | p-value | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | n | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | Show rows with missing data | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | p-value | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | n | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | p-value | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | n | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | Show rows with missing data | n/a | n/a | n/a |  | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Input (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| ANOVA Input (full-1366x768) | chkDescriptives | n/a | n/a | n/a |  | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (full-1366x768) | chkAssumptions | n/a | n/a | n/a |  | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (full-1366x768) | chkNonParam | n/a | n/a | n/a |  | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (taskpane-400x768) | chkDescriptives | n/a | n/a | n/a |  | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (taskpane-400x768) | chkAssumptions | n/a | n/a | n/a |  | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (taskpane-400x768) | chkNonParam | n/a | n/a | n/a |  | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Results (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Independent Means Input (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Independent Means Results (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Multivariable Input (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Multivariable Results (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Power Results (full-1366x768) | (none discovered) | n/a | n/a | n/a |  | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |

## Failures

### FAIL_KEYBOARD: Univariate Workspace — Normal

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showNormalCurve` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-univariate-workspace-showNormalCurve.png`

### FAIL_KEYBOARD: Univariate Workspace — Mean

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showMeanLine` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-univariate-workspace-showMeanLine.png`

### FAIL_KEYBOARD: Univariate Workspace — Median

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showMedianLine` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-univariate-workspace-showMedianLine.png`

### FAIL_KEYBOARD: Univariate Workspace — Normal

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showNormalCurve` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-univariate-workspace-showNormalCurve.png`

### FAIL_KEYBOARD: Univariate Workspace — Mean

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showMeanLine` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-univariate-workspace-showMeanLine.png`

### FAIL_KEYBOARD: Univariate Workspace — Median

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showMedianLine` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-univariate-workspace-showMedianLine.png`

### FAIL_KEYBOARD: Univariate Histogram — Normal

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showNormalCurve` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-histogram-v2-showNormalCurve.png`

### FAIL_KEYBOARD: Univariate Histogram — Mean

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showMeanLine` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-histogram-v2-showMeanLine.png`

### FAIL_KEYBOARD: Univariate Histogram — Median

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showMedianLine` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-histogram-v2-showMedianLine.png`

### FAIL_KEYBOARD: Univariate Histogram — Normal

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showNormalCurve` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-histogram-v2-showNormalCurve.png`

### FAIL_KEYBOARD: Univariate Histogram — Mean

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showMeanLine` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-histogram-v2-showMeanLine.png`

### FAIL_KEYBOARD: Univariate Histogram — Median

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showMedianLine` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-histogram-v2-showMedianLine.png`

### FAIL_KEYBOARD: Correlation Matrix — p-value

- Route: `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1`
- Source: `dialogs/views/correlations/correlation-matrix.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showPValue` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-matrix-showPValue.png`

### FAIL_KEYBOARD: Correlation Matrix — N

- Route: `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1`
- Source: `dialogs/views/correlations/correlation-matrix.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showN` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-matrix-showN.png`

### FAIL_KEYBOARD: Correlation Matrix — p-value

- Route: `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1`
- Source: `dialogs/views/correlations/correlation-matrix.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showPValue` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-matrix-showPValue.png`

### FAIL_KEYBOARD: Correlation Matrix — N

- Route: `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1`
- Source: `dialogs/views/correlations/correlation-matrix.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showN` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-matrix-showN.png`

### FAIL_KEYBOARD: Taylor Diagram — Normalize to SD=1.0 ACTIVE

- Route: `/dialogs/views/correlations/correlation-taylor.html?demo=1`
- Source: `dialogs/views/correlations/correlation-taylor.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#normalize-toggle` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-taylor-normalize-toggle.png`

### FAIL_KEYBOARD: Taylor Diagram — Normalize to SD=1.0 ACTIVE

- Route: `/dialogs/views/correlations/correlation-taylor.html?demo=1`
- Source: `dialogs/views/correlations/correlation-taylor.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#normalize-toggle` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-taylor-normalize-toggle.png`

### FAIL_KEYBOARD: Correlation Results — Show p-value

- Route: `/dialogs/views/correlations/correlation-results.html?demo=1`
- Source: `dialogs/views/correlations/correlation-results.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showPValue` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-results-showPValue.png`

### FAIL_KEYBOARD: Correlation Results — Show n

- Route: `/dialogs/views/correlations/correlation-results.html?demo=1`
- Source: `dialogs/views/correlations/correlation-results.html`
- Viewport: full-1366x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showN` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-results-showN.png`

### FAIL_KEYBOARD: Correlation Results — Show p-value

- Route: `/dialogs/views/correlations/correlation-results.html?demo=1`
- Source: `dialogs/views/correlations/correlation-results.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showPValue` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-results-showPValue.png`

### FAIL_KEYBOARD: Correlation Results — Show n

- Route: `/dialogs/views/correlations/correlation-results.html?demo=1`
- Source: `dialogs/views/correlations/correlation-results.html`
- Viewport: taskpane-400x768
- Likely cause: Space after Tab focus did not toggle
- Focus after Tab: `input#showN` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-results-showN.png`

### FAIL_KEYBOARD: Correlation By Group — Age="26" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-2.png`

### FAIL_KEYBOARD: Correlation By Group — Age="27" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-3.png`

### FAIL_KEYBOARD: Correlation By Group — Age="28" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-4.png`

### FAIL_KEYBOARD: Correlation By Group — Age="29" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-5.png`

### FAIL_KEYBOARD: Correlation By Group — Age="31" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-6.png`

### FAIL_KEYBOARD: Correlation By Group — Age="36" n=3

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-7.png`

### FAIL_KEYBOARD: Correlation By Group — Age="37" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-8.png`

### FAIL_KEYBOARD: Correlation By Group — Age="38" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-9.png`

### FAIL_KEYBOARD: Correlation By Group — Age="39" n=3

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-10.png`

### FAIL_KEYBOARD: Correlation By Group — Age="40" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-11.png`

### FAIL_KEYBOARD: Correlation By Group — Age="42" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-12.png`

### FAIL_KEYBOARD: Correlation By Group — Age="43" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-13.png`

### FAIL_KEYBOARD: Correlation By Group — Age="44" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-14.png`

### FAIL_KEYBOARD: Correlation By Group — Age="45" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-15.png`

### FAIL_KEYBOARD: Correlation By Group — Age="49" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-16.png`

### FAIL_KEYBOARD: Correlation By Group — Age="50" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-17.png`

### FAIL_KEYBOARD: Correlation By Group — Age="52" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-18.png`

### FAIL_KEYBOARD: Correlation By Group — Age="54" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-19.png`

### FAIL_KEYBOARD: Correlation By Group — Age="55" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-20.png`

### FAIL_KEYBOARD: Correlation By Group — Age="56" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-21.png`

### FAIL_KEYBOARD: Correlation By Group — Age="57" n=4

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-22.png`

### FAIL_KEYBOARD: Correlation By Group — Age="58" n=2

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-23.png`

### FAIL_KEYBOARD: Correlation By Group — Age="59" n=1

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-24.png`

### FAIL_KEYBOARD: Correlation By Group — Age="61" n=4

- Route: `/dialogs/views/correlations/by-group.html?demo=1`
- Source: `dialogs/views/correlations/by-group.html`
- Viewport: taskpane-400x768
- Likely cause: Visible target is the only labeled surface · Tab did not reach the control (focus landed on none)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-by-group-25.png`

### FAIL_KEYBOARD: Reliability Input — Cronbach’s alpha

- Route: `/dialogs/views/reliability/reliability-input.html?demo=1`
- Source: `dialogs/views/reliability/reliability-input.html`
- Viewport: full-1366x768
- Likely cause: Tab did not reach the control (focus landed on input#optOmega)
- Focus after Tab: `input#optOmega` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-reliability-input-optAlpha.png`

### FAIL_KEYBOARD: Reliability Input — Cronbach’s alpha

- Route: `/dialogs/views/reliability/reliability-input.html?demo=1`
- Source: `dialogs/views/reliability/reliability-input.html`
- Viewport: taskpane-400x768
- Likely cause: Tab did not reach the control (focus landed on input#optOmega)
- Focus after Tab: `input#optOmega` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-reliability-input-optAlpha.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Type III Fixed Effects

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkTypeIII` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkTypeIII.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Fixed Effect Coefficients

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkCoeffs` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkCoeffs.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Variance Components

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkVarComp` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkVarComp.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Estimated Marginal Means

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkEMM` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkEMM.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Pairwise Contrasts

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkPairwise` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkPairwise.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — BLUPs (Random Predictions)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkBLUP` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkBLUP.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Residual Diagnostics

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkResid` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkResid.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Information Criteria (AIC/BIC)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkIC` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkIC.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Pseudo R² (marginal & conditional)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkPseudoR2` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkPseudoR2.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Type III Fixed Effects

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkTypeIII` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkTypeIII.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Fixed Effect Coefficients

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkCoeffs` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkCoeffs.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Variance Components

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkVarComp` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkVarComp.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Estimated Marginal Means

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkEMM` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkEMM.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Pairwise Contrasts

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkPairwise` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkPairwise.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — BLUPs (Random Predictions)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkBLUP` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkBLUP.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Residual Diagnostics

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkResid` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkResid.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Information Criteria (AIC/BIC)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkIC` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkIC.png`

### FAIL_VISIBLE_CLICK: Mixed Model Input — Pseudo R² (marginal & conditional)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#chkPseudoR2` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkPseudoR2.png`

### FAIL_VISIBLE_CLICK: Cluster Input — Standardise variables (recommended) iRescales every variable to mean 0, SD 1 before computing distances. Strongly recommended when variables use different units — otherwise the largest-scale variable dominates. Untick to match SPSS QUICK CLUSTER, which uses raw values.

- Route: `/dialogs/views/cluster/cluster-input.html?demo=1`
- Source: `dialogs/views/cluster/cluster-input.html`
- Viewport: full-1366x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#clusterStandardize` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-cluster-input-clusterStandardize.png`

### FAIL_VISIBLE_CLICK: Cluster Input — Standardise variables (recommended) iRescales every variable to mean 0, SD 1 before computing distances. Strongly recommended when variables use different units — otherwise the largest-scale variable dominates. Untick to match SPSS QUICK CLUSTER, which uses raw values.

- Route: `/dialogs/views/cluster/cluster-input.html?demo=1`
- Source: `dialogs/views/cluster/cluster-input.html`
- Viewport: taskpane-400x768
- Likely cause: Visible click failed: TimeoutError: locator.click: Timeout 2000ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Focus after Tab: `input#clusterStandardize` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-cluster-input-clusterStandardize.png`

### FAIL_KEYBOARD: Logistic Input — Include intercept (β₀)

- Route: `/dialogs/views/logistic/logistic-input.html?demo=1`
- Source: `dialogs/views/logistic/logistic-input.html`
- Viewport: taskpane-400x768
- Likely cause: Tab did not reach the control (focus landed on div)
- Focus after Tab: `div` (indicator: yes)
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-logistic-input-chkIncludeIntercept.png`

## Pages that could not expose checkboxes

- Analytics Hub
- Univariate Input
- Correlation Matrix
- Partial Correlation
- Correlation Network
- Correlation Results
- Correlation By Group
- Correlation Reliability
- Regression Coefficients
- Regression By Group
- Reliability Analysis
- Mixed Model Results
- PCA
- Pareto Results
- Pareto Input
- Segmentation Input
- Segmentation Results
- Contingency Input
- Contingency Results
- Contingency By Group
- Meta-Analysis Results
- Cluster Analysis
- Factor Analysis Input
- Factor Analysis Results
- Publication Tables
- Prepare Quality
- Logistic Results
- Repeated Measures Results
- Repeated Measures Input
- ANOVA Results
- Independent Means Input
- Independent Means Results
- Multivariable Input
- Multivariable Results
- Power Results

