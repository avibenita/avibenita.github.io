# Statistico checkbox interaction audit

Generated 2026-09-21T08:54:41.881Z. Production behavior was not changed.

## Findings

1. **Shared painted checkboxes are not directly clickable.** `dialogs/views/shared-header.js` hides native inputs with `opacity:0` and `pointer-events:none`. Playwright clicks without `force:true` fail. **Label clicks still toggle state.**
2. **Keyboard Space often does not toggle painted checkboxes** after programmatic focus. The smallest safe fix is to keep the 16×16 input in the tab order with `pointer-events:auto` (visually hidden via opacity only), or make the painted `::before` box a real button with `role="checkbox"` and a Space handler.
3. **Unpainted native checkboxes work.** Reliability options, regression/logistic intercept, meta Hartung–Knapp, and Prepare “Changed rows only” passed click, label, and keyboard. They are `NEEDS_EXPECTATION` only because downstream analysis output was not asserted.
4. **Many modules stay `NOT_REACHED` without Excel.** Input forms keep `#mainContent { display:none }` until Office data arrives. Dynamic checkboxes (group levels, study include, export overlay, factorability) need a selected dataset.
5. **ANOVA `#chkDescriptives`, `#chkAssumptions`, `#chkNonParam`** are `display:none` state holders, not user controls (`INTENTIONALLY_DISABLED`).
6. **Univariate demo path throws `ReferenceError: coun is not defined`** in `createHistogram` when loaded with `?demo=1`. Separate from checkbox clickability; do not fix in this audit.

## Totals

| Metric | Count |
|---|---:|
| Checkboxes discovered | 206 |
| Tested | 78 |
| PASS | 0 |
| FAIL_CLICK | 42 |
| FAIL_STATE | 0 |
| FAIL_EFFECT | 0 |
| FAIL_KEYBOARD | 0 |
| INTENTIONALLY_DISABLED | 6 |
| NEEDS_EXPECTATION | 30 |
| NOT_REACHED | 145 |
| Pages with unreached controls | 36 |

## Results

| Module | Checkbox | Click | Label | Keyboard | State changed | Intended effect | Console error | Result |
|---|---|---|---|---|---|---|---|---|
| Analytics Hub (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Univariate Workspace (full-1366x768) | Normal | no | yes | no | yes | Histogram redraws with a normal-curve overlay | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / Function window.alert is not supported. / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / coun is not defined / coun is not defined | FAIL_CLICK |
| Univariate Workspace (full-1366x768) | Mean | no | yes | no | yes | Histogram redraws with a mean line | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / Function window.alert is not supported. / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / coun is not defined / coun is not defined / coun is not defined / coun is not defined | FAIL_CLICK |
| Univariate Workspace (full-1366x768) | Median | no | yes | no | yes | Histogram redraws with a median line | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / Function window.alert is not supported. / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / coun is not defined / coun is not defined / coun is not defined / coun is not defined / coun is not defined / coun is not defined | FAIL_CLICK |
| Univariate Workspace (taskpane-400x768) | Normal | no | yes | no | yes | Histogram redraws with a normal-curve overlay | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / Function window.alert is not supported. / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / coun is not defined / coun is not defined | FAIL_CLICK |
| Univariate Workspace (taskpane-400x768) | Mean | no | yes | no | yes | Histogram redraws with a mean line | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / Function window.alert is not supported. / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / coun is not defined / coun is not defined / coun is not defined / coun is not defined | FAIL_CLICK |
| Univariate Workspace (taskpane-400x768) | Median | no | yes | no | yes | Histogram redraws with a median line | ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / Function window.alert is not supported. / ? Error in handleDataReceived: ReferenceError: coun is not defined     at createHistogram (http://127.0.0.1:4173/dialogs/views/univariate/univariate-workspace.html?demo=1:1991:14)     at handleDataReceived (http://127.0.0.1:4173/dialogs/vie / coun is not defined / coun is not defined / coun is not defined / coun is not defined / coun is not defined / coun is not defined | FAIL_CLICK |
| Univariate Input (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'addHandlerAsync') | NOT_REACHED |
| Univariate Histogram (full-1366x768) | Normal | no | yes | no | yes | NEEDS_EXPECTATION | Function window.alert is not supported. | FAIL_CLICK |
| Univariate Histogram (full-1366x768) | Mean | no | yes | no | yes | NEEDS_EXPECTATION | Function window.alert is not supported. | FAIL_CLICK |
| Univariate Histogram (full-1366x768) | Median | no | yes | no | yes | NEEDS_EXPECTATION | Function window.alert is not supported. | FAIL_CLICK |
| Univariate Histogram (taskpane-400x768) | Normal | no | yes | no | yes | NEEDS_EXPECTATION | Function window.alert is not supported. | FAIL_CLICK |
| Univariate Histogram (taskpane-400x768) | Mean | no | yes | no | yes | NEEDS_EXPECTATION | Function window.alert is not supported. | FAIL_CLICK |
| Univariate Histogram (taskpane-400x768) | Median | no | yes | no | yes | NEEDS_EXPECTATION | Function window.alert is not supported. | FAIL_CLICK |
| Correlation Matrix (full-1366x768) | p-value | no | yes | yes | yes | Correlation table shows or hides p-value cells via toggleDisplay() | Office.onReady is not a function | FAIL_CLICK |
| Correlation Matrix (full-1366x768) | N | no | yes | yes | yes | Correlation table shows or hides pairwise N via toggleDisplay() | Office.onReady is not a function | FAIL_CLICK |
| Correlation Matrix (full-1366x768) | Show r values | n/a | n/a | n/a | n/a | Network edges show correlation values |  | NOT_REACHED |
| Correlation Matrix (full-1366x768) | Only connected variables | n/a | n/a | n/a | n/a | Isolated network nodes are hidden |  | NOT_REACHED |
| Correlation Matrix (taskpane-400x768) | p-value | no | yes | yes | yes | Correlation table shows or hides p-value cells via toggleDisplay() | Office.onReady is not a function | FAIL_CLICK |
| Correlation Matrix (taskpane-400x768) | N | no | yes | yes | yes | Correlation table shows or hides pairwise N via toggleDisplay() | Office.onReady is not a function | FAIL_CLICK |
| Correlation Matrix (taskpane-400x768) | Show r values | n/a | n/a | n/a | n/a | Network edges show correlation values |  | NOT_REACHED |
| Correlation Matrix (taskpane-400x768) | Only connected variables | n/a | n/a | n/a | n/a | Isolated network nodes are hidden |  | NOT_REACHED |
| Partial Correlation (full-1366x768) | Show p-values | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Partial Correlation (full-1366x768) | Show df | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Partial Correlation (taskpane-400x768) | Show p-values | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Partial Correlation (taskpane-400x768) | Show df | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Taylor Diagram (full-1366x768) | Normalize to SD=1.0 ACTIVE | no | yes | no | yes | Taylor reference panel shows the ACTIVE badge when normalized | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Taylor Diagram (taskpane-400x768) | Normalize to SD=1.0 ACTIVE | no | yes | no | yes | Taylor reference panel shows the ACTIVE badge when normalized | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Correlation Network (full-1366x768) | Show r | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Network (full-1366x768) | Only connected variables | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Network (taskpane-400x768) | Show r | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Network (taskpane-400x768) | Only connected variables | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Results (full-1366x768) | Show p-value | no | yes | no | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Correlation Results (full-1366x768) | Show n | no | yes | no | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Correlation Results (full-1366x768) | Show r | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Results (taskpane-400x768) | Show p-value | no | yes | no | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Correlation Results (taskpane-400x768) | Show n | no | yes | no | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Correlation Results (taskpane-400x768) | Show r | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation By Group (full-1366x768) | All curves in one chart | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation By Group (taskpane-400x768) | All curves in one chart | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Reliability (full-1366x768) | Show Mean / SD | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Correlation Reliability (taskpane-400x768) | Show Mean / SD | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression Input (full-1366x768) | Include intercept (β₀) | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Regression Input (taskpane-400x768) | Include intercept (β₀) | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Regression Coefficients (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'addHandlerAsync') | NOT_REACHED |
| Regression By Group (full-1366x768) | Show 95% CI | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (full-1366x768) | Show overall model | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (full-1366x768) | 95% CI for the mean | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (taskpane-400x768) | Show 95% CI | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (taskpane-400x768) | Show overall model | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Regression By Group (taskpane-400x768) | 95% CI for the mean | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Reliability Input (full-1366x768) | Cronbach’s alpha | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | McDonald’s omega total (one-factor common-factor model) | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Standardized alpha | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Confidence interval | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Corrected item–total correlation | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Alpha if item deleted | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Omega if item deleted | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Inter-item correlation matrix | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Flag weak item–total correlations below | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Unidimensionality check (diagnostic) | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (full-1366x768) | Scree plot | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Cronbach’s alpha | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | McDonald’s omega total (one-factor common-factor model) | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Standardized alpha | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Confidence interval | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Corrected item–total correlation | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Alpha if item deleted | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Omega if item deleted | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Inter-item correlation matrix | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Flag weak item–total correlations below | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Unidimensionality check (diagnostic) | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Input (taskpane-400x768) | Scree plot | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Reliability Analysis (full-1366x768) | Pairwise N | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Reliability Analysis (taskpane-400x768) | Pairwise N | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Mixed Model Input (full-1366x768) | Type III Fixed Effects | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (full-1366x768) | Fixed Effect Coefficients | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (full-1366x768) | Variance Components | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (full-1366x768) | Estimated Marginal Means | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (full-1366x768) | Pairwise Contrasts | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (full-1366x768) | BLUPs (Random Predictions) | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (full-1366x768) | Residual Diagnostics | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (full-1366x768) | Information Criteria (AIC/BIC) | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (full-1366x768) | Pseudo R² (marginal & conditional) | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | Type III Fixed Effects | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | Fixed Effect Coefficients | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | Variance Components | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | Estimated Marginal Means | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | Pairwise Contrasts | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | BLUPs (Random Predictions) | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | Residual Diagnostics | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | Information Criteria (AIC/BIC) | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Input (taskpane-400x768) | Pseudo R² (marginal & conditional) | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Mixed Model Results (full-1366x768) | Overlay Results | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Mixed Model Results (taskpane-400x768) | Overlay Results | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| PCA (full-1366x768) | Show | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| PCA (taskpane-400x768) | Show | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (full-1366x768) | optCumLine | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (full-1366x768) | optThreshLine | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (full-1366x768) | optLabels | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (taskpane-400x768) | optCumLine | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (taskpane-400x768) | optThreshLine | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Results (taskpane-400x768) | optLabels | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Pareto Input (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'addHandlerAsync') | NOT_REACHED |
| Segmentation Input (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Segmentation Results (full-1366x768) | Show overall benchmark | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Segmentation Results (full-1366x768) | Show statistical evidence | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Segmentation Results (taskpane-400x768) | Show overall benchmark | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Segmentation Results (taskpane-400x768) | Show statistical evidence | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Input (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (full-1366x768) | Data labels | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency Results (taskpane-400x768) | Data labels | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Contingency By Group (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Meta-Analysis Input (full-1366x768) | Hartung–Knapp adjustment (recommended for random-effects) iAdjusts the SE of the pooled effect using observed between-study dispersion. Useful with few studies; can be conservative. | yes | yes | yes | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Meta-Analysis Input (taskpane-400x768) | Hartung–Knapp adjustment (recommended for random-effects) iAdjusts the SE of the pooled effect using observed between-study dispersion. Useful with few studies; can be conservative. | yes | yes | yes | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Meta-Analysis Results (full-1366x768) | Include Anderson 2019 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Chen 2020 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Rivera 2021 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Okada 2022 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Müller 2023 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (full-1366x768) | Include Patel 2024 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Anderson 2019 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Chen 2020 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Rivera 2021 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Okada 2022 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Müller 2023 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Meta-Analysis Results (taskpane-400x768) | Include Patel 2024 | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Cluster Input (full-1366x768) | Standardise variables (recommended) iRescales every variable to mean 0, SD 1 before computing distances. Strongly recommended when variables use different units — otherwise the largest-scale variable dominates. Untick to match SPSS QUICK CLUSTER, which uses raw values. | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Cluster Input (taskpane-400x768) | Standardise variables (recommended) iRescales every variable to mean 0, SD 1 before computing distances. Strongly recommended when variables use different units — otherwise the largest-scale variable dominates. Untick to match SPSS QUICK CLUSTER, which uses raw values. | no | no | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | FAIL_CLICK |
| Cluster Analysis (full-1366x768) | Center trails | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Cluster Analysis (full-1366x768) | Merge trails | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Cluster Analysis (taskpane-400x768) | Center trails | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Cluster Analysis (taskpane-400x768) | Merge trails | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Factor Analysis Input (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'addHandlerAsync') | NOT_REACHED |
| Factor Analysis Results (full-1366x768) | 95% ellipse | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Factor Analysis Results (taskpane-400x768) | 95% ellipse | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Show Overall column | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Show P value column | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Show standardized difference (SMD) | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Use a common analysis sample for all rows | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Show "Missing" as its own category by default | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Italic title | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Bold caption label | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (full-1366x768) | Leading zero in p-values | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Show Overall column | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Show P value column | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Show standardized difference (SMD) | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Use a common analysis sample for all rows | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Show "Missing" as its own category by default | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | unnamed checkbox | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Italic title | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Bold caption label | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Publication Tables (taskpane-400x768) | Leading zero in p-values | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (full-1366x768) | IDUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (full-1366x768) | DepartmentUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (full-1366x768) | SatisfactionUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (full-1366x768) | IntentionUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (full-1366x768) | TenureUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (full-1366x768) | Changed rows only | yes | yes | yes | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Prepare Dataset (taskpane-400x768) | IDUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (taskpane-400x768) | DepartmentUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (taskpane-400x768) | SatisfactionUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (taskpane-400x768) | IntentionUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (taskpane-400x768) | TenureUnchanged | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Prepare Dataset (taskpane-400x768) | Changed rows only | yes | yes | yes | yes | NEEDS_EXPECTATION |  | NEEDS_EXPECTATION |
| Prepare Quality (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Logistic Input (full-1366x768) | Include intercept (β₀) | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Logistic Input (taskpane-400x768) | Include intercept (β₀) | yes | yes | yes | yes | NEEDS_EXPECTATION | Cannot read properties of undefined (reading 'addHandlerAsync') | NEEDS_EXPECTATION |
| Logistic Results (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | p-value | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | n | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | p-value | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | n | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (full-1366x768) | Show rows with missing data | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | p-value | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | n | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | p-value | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | n | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Results (taskpane-400x768) | Show rows with missing data | n/a | n/a | n/a | n/a | NEEDS_EXPECTATION |  | NOT_REACHED |
| Repeated Measures Input (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'addHandlerAsync') | NOT_REACHED |
| ANOVA Input (full-1366x768) | chkDescriptives | n/a | n/a | n/a | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (full-1366x768) | chkAssumptions | n/a | n/a | n/a | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (full-1366x768) | chkNonParam | n/a | n/a | n/a | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (taskpane-400x768) | chkDescriptives | n/a | n/a | n/a | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (taskpane-400x768) | chkAssumptions | n/a | n/a | n/a | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Input (taskpane-400x768) | chkNonParam | n/a | n/a | n/a | n/a | Hidden state holder |  | INTENTIONALLY_DISABLED |
| ANOVA Results (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'messageParent') | NOT_REACHED |
| Independent Means Input (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'addHandlerAsync') | NOT_REACHED |
| Independent Means Results (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'addHandlerAsync') | NOT_REACHED |
| Multivariable Input (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare | Cannot read properties of undefined (reading 'addHandlerAsync') | NOT_REACHED |
| Multivariable Results (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |
| Power Results (full-1366x768) | (none discovered) | n/a | n/a | n/a | n/a | No checkboxes on this page after prepare |  | NOT_REACHED |

## Failures and proposed fixes

### FAIL_CLICK: Univariate Workspace — Normal

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-univariate-workspace-showNormalCurve.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Workspace — Mean

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-univariate-workspace-showMeanLine.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Workspace — Median

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-univariate-workspace-showMedianLine.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Workspace — Normal

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-univariate-workspace-showNormalCurve.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Workspace — Mean

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-univariate-workspace-showMeanLine.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Workspace — Median

- Route: `/dialogs/views/univariate/univariate-workspace.html?demo=1`
- Source: `dialogs/views/univariate/univariate-workspace.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-univariate-workspace-showMedianLine.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Histogram — Normal

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-histogram-v2-showNormalCurve.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Histogram — Mean

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-histogram-v2-showMeanLine.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Histogram — Median

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-histogram-v2-showMedianLine.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Histogram — Normal

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-histogram-v2-showNormalCurve.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Histogram — Mean

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-histogram-v2-showMeanLine.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Univariate Histogram — Median

- Route: `/dialogs/views/univariate/histogram-standalone-v2.html?demo=1`
- Source: `dialogs/views/univariate/histogram-standalone-v2.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-histogram-v2-showMedianLine.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Correlation Matrix — p-value

- Route: `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1`
- Source: `dialogs/views/correlations/correlation-matrix.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-matrix-showPValue.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Correlation Matrix — N

- Route: `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1`
- Source: `dialogs/views/correlations/correlation-matrix.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-matrix-showN.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Correlation Matrix — p-value

- Route: `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1`
- Source: `dialogs/views/correlations/correlation-matrix.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-matrix-showPValue.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Correlation Matrix — N

- Route: `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1`
- Source: `dialogs/views/correlations/correlation-matrix.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-matrix-showN.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Taylor Diagram — Normalize to SD=1.0 ACTIVE

- Route: `/dialogs/views/correlations/correlation-taylor.html?demo=1`
- Source: `dialogs/views/correlations/correlation-taylor.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-taylor-normalize-toggle.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Taylor Diagram — Normalize to SD=1.0 ACTIVE

- Route: `/dialogs/views/correlations/correlation-taylor.html?demo=1`
- Source: `dialogs/views/correlations/correlation-taylor.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-taylor-normalize-toggle.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Correlation Results — Show p-value

- Route: `/dialogs/views/correlations/correlation-results.html?demo=1`
- Source: `dialogs/views/correlations/correlation-results.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-results-showPValue.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Correlation Results — Show n

- Route: `/dialogs/views/correlations/correlation-results.html?demo=1`
- Source: `dialogs/views/correlations/correlation-results.html`
- Viewport: full-1366x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-correlations-results-showN.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Correlation Results — Show p-value

- Route: `/dialogs/views/correlations/correlation-results.html?demo=1`
- Source: `dialogs/views/correlations/correlation-results.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-results-showPValue.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Correlation Results — Show n

- Route: `/dialogs/views/correlations/correlation-results.html?demo=1`
- Source: `dialogs/views/correlations/correlation-results.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click blocked: computed pointer-events:none · Space on focused control did not toggle
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-correlations-results-showN.png`
- Proposed fix: shared-header.js paints checkboxes and sets pointer-events:none on the native input. Restore a 16×16 clickable hit target, or treat the label as the only click surface and keep keyboard support.

### FAIL_CLICK: Mixed Model Input — Type III Fixed Effects

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkTypeIII.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Fixed Effect Coefficients

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkCoeffs.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Variance Components

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkVarComp.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Estimated Marginal Means

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkEMM.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Pairwise Contrasts

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkPairwise.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — BLUPs (Random Predictions)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkBLUP.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Residual Diagnostics

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkResid.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Information Criteria (AIC/BIC)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkIC.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Pseudo R² (marginal & conditional)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-mixed-input-chkPseudoR2.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Type III Fixed Effects

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkTypeIII.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Fixed Effect Coefficients

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkCoeffs.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Variance Components

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkVarComp.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Estimated Marginal Means

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkEMM.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Pairwise Contrasts

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkPairwise.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — BLUPs (Random Predictions)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkBLUP.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Residual Diagnostics

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkResid.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Information Criteria (AIC/BIC)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkIC.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Mixed Model Input — Pseudo R² (marginal & conditional)

- Route: `/dialogs/views/mixed/mixed-input.html?demo=1`
- Source: `dialogs/views/mixed/mixed-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-mixed-input-chkPseudoR2.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Cluster Input — Standardise variables (recommended) iRescales every variable to mean 0, SD 1 before computing distances. Strongly recommended when variables use different units — otherwise the largest-scale variable dominates. Untick to match SPSS QUICK CLUSTER, which uses raw values.

- Route: `/dialogs/views/cluster/cluster-input.html?demo=1`
- Source: `dialogs/views/cluster/cluster-input.html`
- Viewport: full-1366x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/full-1366x768-cluster-input-clusterStandardize.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

### FAIL_CLICK: Cluster Input — Standardise variables (recommended) iRescales every variable to mean 0, SD 1 before computing distances. Strongly recommended when variables use different units — otherwise the largest-scale variable dominates. Untick to match SPSS QUICK CLUSTER, which uses raw values.

- Route: `/dialogs/views/cluster/cluster-input.html?demo=1`
- Source: `dialogs/views/cluster/cluster-input.html`
- Viewport: taskpane-400x768
- Likely cause: Direct click failed: TimeoutError: locator.click: Timeout 1500ms exceeded. · Label click failed: TimeoutError: locator.click: Timeout 2000ms exceeded.
- Screenshot: `tests/e2e/reports/screenshots/taskpane-400x768-cluster-input-clusterStandardize.png`
- Proposed fix: Element is not clickable without force:true. Check covering overlays, disabled state, or painted-checkbox CSS.

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
- Prepare Dataset
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

