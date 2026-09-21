# Statistico checkbox verification queue

Joined from `checkbox-audit-report.md` (run 2026-09-21) and `checkbox-inventory.md`.

One row is one **unique user-facing checkbox** (module + selector). Taskpane and full-viewport executions of the same control are not duplicated.

## Verify these first

Do these 15 controls before the rest of the queue. Items 3–5 are representatives: passing them covers a whole implementation, not just that one checkbox.

1. **Mixed → Options → Type III Fixed Effects** (`#chkTypeIII`) — Open Mixed Model Input with demo data, click **Options**, click the painted box beside **Type III Tests**, confirm one toggle and one change event, then confirm the Type III output section is included or removed.
2. **Mixed → Options → Pairwise Contrasts** (`#chkPairwise`) — Same Options panel; this one starts unchecked. Click the painted box, confirm it checks, then confirm the pairwise block appears in the planned output.
3. **Cluster → Standardise variables** (`#clusterStandardize`) — Open Cluster Input, click the painted box (not the `i` tip), confirm one toggle, then confirm `standardize` in the model spec flips.
4. **Univariate Workspace → Normal** (`#showNormalCurve`) — Shared-header keyboard representative. Tab until the Normal control shows a focus ring, press Space, confirm the native checkbox toggles once. Covers the 11 shared-header keyboard failures listed under K1.
5. **Correlation By Group → one Age level row** (`[role=checkbox][data-level-pos]`) — Select a grouping variable, Tab to one included level, press Space, confirm `aria-checked` flips and that level drops from the analysis. Covers all 26 by-group level rows (K2).
6. **Reliability → Options → Cronbach’s alpha** (`#optAlpha`) — Open Options, Tab through the list, confirm focus lands on Cronbach’s (not Omega), press Space, confirm alpha is included or removed from the run.
7. **Regression Input → Include intercept (β₀)** (`#chkIncludeIntercept`) — Click and Space both work; run the model and confirm the intercept term is present when checked and omitted when not.
8. **Reliability → Options → McDonald’s omega** (`#optOmega`) — Interaction already passed. Run once with omega on and once off; confirm the omega block is included or removed. Same pattern covers the other Options output checkboxes.
9. **Meta Input → Hartung–Knapp** (`#hartungKnapp`) — Toggle it, run a random-effects model, confirm the HK adjustment is applied only when checked.
10. **Prepare Dataset → Changed rows only** (`#changedOnly`) — After any transform step, toggle it and confirm the preview filters to changed rows, then shows all rows.
11. **Logistic Input → Include intercept (β₀)** (`#chkIncludeIntercept`) — Same check as regression: intercept present only when checked.
12. **Correlation Matrix → Network → Show r values** (`#showNetCorrValues`) — Switch to the Network tab, click Show r values, confirm edge labels appear and disappear.
13. **Regression By Group → Show 95% CI** (`#regShowCoefDetails`) — After group results load, toggle it and confirm the extra coefficient CI columns appear.
14. **Meta Results → Include Anderson 2019** (`.studies-include`) — Uncheck one study, confirm the pooled estimate recomputes without it. Covers the other five study include boxes.
15. **PCA → Show loading vectors** (`#showVectorsToggle`) — On a loaded PCA plot, toggle it and confirm the loading vectors draw or hide.

## How to read this queue

| Priority | Meaning |
|---|---|
| P0 | `FAIL_VISIBLE_CLICK` — the visible painted box / label did not accept a click in the audit. |
| P1 | Representative `FAIL_KEYBOARD` (grouped by implementation), or interaction passed but the downstream effect was not verified (`NEEDS_EXPECTATION`). |
| P2 | Important `NOT_REACHED` controls that only appear after a tab, dialog, or results load. |
| P3 | Remaining `NOT_REACHED` controls, including unnamed dynamic extras. |

Excluded from the queue:

- Intentionally disabled ANOVA hidden state-holders: `#chkDescriptives`, `#chkAssumptions`, `#chkNonParam`.
- Duplicate executions of the same checkbox on the other viewport.
- Page-level `(none discovered)` rows.

Separate defect (not a checkbox bug): Univariate `createHistogram` throws `ReferenceError: coun is not defined`. Histogram overlay effects cannot be trusted until that is fixed.

## Keyboard failures — three implementations, not 36 checks

The audit reported **36 unique `FAIL_KEYBOARD`** controls. They are three implementations. Manual work is one representative each. An automated regression for that implementation should later cover every checkbox listed under it.

### K1 — Shared-header painted native checkbox

Source: `dialogs/views/shared-header.js` (`_ensureCheckboxStyles` / `_bindCheckboxToggles`). Native input is `opacity:0` and `pointer-events:none`. Label click is owned by the header script. Space after Tab did not toggle, even when a focus ring was visible.

**Manual representative:** Univariate Workspace `#showNormalCurve` (item 4 above).

**Covered by the eventual K1 regression (11 unique checkboxes):**

| Module | Visible label | Selector |
|---|---|---|
| Univariate Workspace | Normal | `#showNormalCurve` |
| Univariate Workspace | Mean | `#showMeanLine` |
| Univariate Workspace | Median | `#showMedianLine` |
| Univariate Histogram | Normal | `#showNormalCurve` |
| Univariate Histogram | Mean | `#showMeanLine` |
| Univariate Histogram | Median | `#showMedianLine` |
| Correlation Matrix | p-value | `#showPValue` |
| Correlation Matrix | N | `#showN` |
| Taylor Diagram | Normalize to SD=1.0 | `#normalize-toggle` |
| Correlation Results | Show p-value | `#showPValue` |
| Correlation Results | Show n | `#showN` |

Do not ask testers to Tab+Space each of those 11. If K1 is fixed, re-run the Playwright suite.

### K2 — By-group `role="checkbox"` level rows

Source: `dialogs/shared/by-group-standard.js` and the By-Group pages (`correlations/by-group.html`, also `univariate/by-group.html`, `regression/regression-by-group.html`, `contingency/by-group.html`). Custom row, not a native input.

**Manual representative:** one visible Age level on Correlation By Group (item 5 above).

**Covered by the eventual K2 regression (26 unique rows on this audit):** Age="26" through Age="61" (`FAIL_KEYBOARD`, 24 rows) plus Age="23" and Age="24" (`NOT_REACHED` because they were scrolled out of view). Same widget on Univariate / Regression / Contingency By Group when those pages have a grouping variable.

### K3 — Reliability Options tab order

`#optAlpha` (Cronbach’s alpha) is a shared-header painted checkbox, but the failure is different: Tab landed on `#optOmega` and never reached Cronbach’s. The other Reliability Options checkboxes passed keyboard.

**Manual representative:** Reliability `#optAlpha` (item 6 above). Covered set is that one control. Do not re-test Omega through Scree for keyboard.

---

## Queue

Columns: Priority | Module | Visible label | Selector | Page/URL | Current status | Preparation | Expected effect | Why verification is needed | Verification steps

### P0 — visible click failed

These ten unique controls timed out on the visible target and on the label (2 s). Keyboard *did* toggle state in the audit, so the native input is alive; the painted hit target is what must be confirmed by hand.

| Priority | Module | Visible label | Selector | Page/URL | Current status | Preparation | Expected effect | Why verification is needed | Verification steps |
|---|---|---|---|---|---|---|---|---|---|
| P0 | Mixed Model Input | Type III Fixed Effects | `#chkTypeIII` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then click **Options** (`#btnAdvOpts`) | Include the Type III Fixed Effects section in the mixed output | Audit could not click the painted box; this is the representative Mixed output toggle | Open Mixed → Options, click the painted box beside Type III Tests, confirm one toggle and one change event, then confirm the Type III output section is included or removed. |
| P0 | Mixed Model Input | Fixed Effect Coefficients | `#chkCoeffs` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then Options | Include the coefficients table | Same sibling `input` + `label for` row as Type III | After Type III is confirmed, click the painted box beside Fixed Effect Coefficients and confirm that block is included or removed. Do not repeat the full keyboard pass. |
| P0 | Mixed Model Input | Variance Components | `#chkVarComp` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then Options | Include variance-component output | Same Options-row implementation | Click the painted box beside Variance Components; confirm one toggle and that the G/R variance section is included or removed. |
| P0 | Mixed Model Input | Estimated Marginal Means | `#chkEMM` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then Options | Include EMM output | Same Options-row implementation | Click the painted box beside Estimated Marginal Means; confirm the EMM section is included or removed. |
| P0 | Mixed Model Input | Pairwise Contrasts | `#chkPairwise` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then Options; default **unchecked** | Include pairwise contrasts | Same implementation, opposite default | Click the painted box beside Pairwise Contrasts (starts off), confirm it checks, then confirm the pairwise block is added. |
| P0 | Mixed Model Input | BLUPs (Random Predictions) | `#chkBLUP` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then Options; default **unchecked** | Include BLUP output | Same implementation, opposite default | Click the painted box beside BLUPs; confirm it checks and the BLUP section is added. |
| P0 | Mixed Model Input | Residual Diagnostics | `#chkResid` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then Options | Include residual diagnostics | Same Options-row implementation | Click the painted box beside Residual Diagnostics; confirm that section is included or removed. |
| P0 | Mixed Model Input | Information Criteria (AIC/BIC) | `#chkIC` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then Options | Include AIC/BIC | Same Options-row implementation | Click the painted box beside Information Criteria; confirm AIC/BIC is included or removed. |
| P0 | Mixed Model Input | Pseudo R² (marginal & conditional) | `#chkPseudoR2` | `/dialogs/views/mixed/mixed-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load, then Options | Include pseudo-R² | Same Options-row implementation | Click the painted box beside Pseudo R²; confirm that block is included or removed. |
| P0 | Cluster Input | Standardise variables (recommended) | `#clusterStandardize` | `/dialogs/views/cluster/cluster-input.html?demo=1` | FAIL_VISIBLE_CLICK | Page load; wrapping label also contains an `i` tip | z-score variables before distances (`standardize` in the model spec) | Different markup from Mixed (input inside the label plus tooltip). Click timed out on both the input and the label. | Open Cluster Input, click the painted box beside Standardise variables — not the `i` tip — confirm one toggle and one change event, then confirm the next run uses standardised values when checked and raw values when not. |

### P1 — keyboard representatives

| Priority | Module | Visible label | Selector | Page/URL | Current status | Preparation | Expected effect | Why verification is needed | Verification steps |
|---|---|---|---|---|---|---|---|---|---|
| P1 | Univariate Workspace | Normal | `#showNormalCurve` | `/dialogs/views/univariate/univariate-workspace.html?demo=1` | FAIL_KEYBOARD (K1 representative) | `?demo=1`; overlay controls visible | Histogram redraws with a normal-curve overlay | Space after Tab did not toggle. This is the shared-header representative; do not repeat for the other 10 K1 controls. | Open Univariate Workspace with demo data. Click the painted box beside Normal once and confirm the native `#showNormalCurve` flips. Then Tab until a focus ring sits on Normal (not Mean/Median), press Space once, and confirm the same flip. Ignore the `coun is not defined` histogram error for this interaction check. |
| P1 | Correlation By Group | Age level include (one visible row) | `[role=checkbox][data-level-pos]` | `/dialogs/views/correlations/by-group.html?demo=1` | FAIL_KEYBOARD (K2 representative) | `?demo=1`, select a grouping variable, scroll the level list so a row is on screen | Include / exclude that group level from the analysis | 24 visible Age rows failed Space; Age="23" and Age="24" were off-screen (`NOT_REACHED`). One row stands for the widget. | Open Correlation By Group, choose a grouping variable, click one included Age row and confirm it excludes. Tab to another included row until that row shows focus, press Space, confirm `aria-checked` flips and the level is dropped. Do not walk every Age value. |
| P1 | Reliability Input | Cronbach’s alpha | `#optAlpha` | `/dialogs/views/reliability/reliability-input.html?demo=1` | FAIL_KEYBOARD (K3) | Click the Options tab; wait for `#optAlpha` | Include Cronbach’s alpha in the output | Tab skipped Cronbach’s and landed on Omega. Mouse click already works. | Open Reliability → Options. Click the painted box beside Cronbach’s alpha and confirm one toggle. Then Tab from the top of Options and confirm focus reaches Cronbach’s (not Omega first). Press Space and confirm alpha is included or removed from the next run. |

K1 coverage (do not add manual rows): Univariate Workspace Mean/Median; Univariate Histogram Normal/Mean/Median; Correlation Matrix p-value/N; Taylor Diagram Normalize to SD=1.0; Correlation Results Show p-value/Show n.

K2 coverage (do not add manual rows): Correlation By Group Age="23" … Age="61".

### P1 — interaction passed, effect not verified

Click, label, and keyboard succeeded. `EFFECT_VERIFIED` is false because the audit contract only checked the input state, not the analysis output.

| Priority | Module | Visible label | Selector | Page/URL | Current status | Preparation | Expected effect | Why verification is needed | Verification steps |
|---|---|---|---|---|---|---|---|---|---|
| P1 | Regression Input | Include intercept (β₀) | `#chkIncludeIntercept` | `/dialogs/views/regression/regression-input.html?demo=1` | NEEDS_EXPECTATION | Page load | Fit with intercept when checked; omit β₀ when not | Interaction works; the fitted model was never asserted | Open Regression Input, click Include intercept off, run, confirm the coefficients table has no intercept. Turn it back on, run again, confirm β₀ is present. |
| P1 | Logistic Input | Include intercept (β₀) | `#chkIncludeIntercept` | `/dialogs/views/logistic/logistic-input.html?demo=1` | NEEDS_EXPECTATION | Page load | Fit logistic model with intercept only when checked | Same intercept contract as regression, separate page | Open Logistic Input, toggle Include intercept, run both ways, confirm the intercept row is present only when checked. |
| P1 | Reliability Input | McDonald’s omega total | `#optOmega` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Include omega in the output | Interaction passed; output block not asserted | Open Reliability → Options, click McDonald’s omega off, run, confirm the omega section is absent. Turn it on and confirm it returns. |
| P1 | Reliability Input | Standardized alpha | `#optStdAlpha` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab; default unchecked | Include standardized alpha | Interaction passed; output not asserted | Check Standardized alpha, run, confirm that statistic appears; uncheck and confirm it is gone. |
| P1 | Reliability Input | Confidence interval | `#optCI` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Include CI around the reliability estimate | Interaction passed; output not asserted | Toggle Confidence interval, run both ways, confirm CI columns or text appear only when checked. |
| P1 | Reliability Input | Corrected item–total correlation | `#optITC` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Include ITC diagnostics | Interaction passed; output not asserted | Toggle it, run, confirm the item–total column is included or removed. |
| P1 | Reliability Input | Alpha if item deleted | `#optAlphaDel` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Include alpha-if-deleted | Interaction passed; output not asserted | Toggle it, run, confirm that column is included or removed. |
| P1 | Reliability Input | Omega if item deleted | `#optOmegaDel` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Include omega-if-deleted | Interaction passed; output not asserted | Toggle it, run, confirm that column is included or removed. |
| P1 | Reliability Input | Inter-item correlation matrix | `#optMatrix` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Include the inter-item matrix | Interaction passed; output not asserted | Toggle it, run, confirm the matrix block is included or removed. |
| P1 | Reliability Input | Flag weak item–total correlations | `#optFlagWeak` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Flag weak ITC values | Interaction passed; output not asserted | Toggle it, run, confirm weak-item flags appear only when checked. |
| P1 | Reliability Input | Unidimensionality check | `#optUni` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Include the unidimensionality diagnostic | Interaction passed; output not asserted | Toggle it, run, confirm that diagnostic block is included or removed. |
| P1 | Reliability Input | Scree plot | `#optScree` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NEEDS_EXPECTATION | Options tab | Include the scree plot | Interaction passed; output not asserted | Toggle it, run, confirm the scree plot is included or removed. |
| P1 | Meta-Analysis Input | Hartung–Knapp adjustment | `#hartungKnapp` | `/dialogs/views/meta-analysis/meta-input.html?demo=1` | NEEDS_EXPECTATION | `?demo=1` | HK adjustment on the random-effects SE | Interaction passed; pooled SE method not asserted | Open Meta Input, uncheck Hartung–Knapp, run random effects, note the pooled SE. Check it, run again, confirm the SE uses the HK adjustment. |
| P1 | Prepare Dataset | Changed rows only | `#changedOnly` | `/dialogs/views/prepare/prepare-dataset-input.html?demo=1` | NEEDS_EXPECTATION | Preview pane after a transform step | Filter the preview to changed rows | Interaction passed; preview filter not asserted | Apply any step so the preview has changes. Uncheck Changed rows only and confirm every row is listed. Check it again and confirm only changed rows remain. |

### P2 — important dynamic controls the audit never reached

Present in the inventory and usually in the DOM, but hidden until a tab, dialog, or results load. One representative is used where many identical rows share a widget.

| Priority | Module | Visible label | Selector | Page/URL | Current status | Preparation | Expected effect | Why verification is needed | Verification steps |
|---|---|---|---|---|---|---|---|---|---|
| P2 | Correlation Matrix | Show r values | `#showNetCorrValues` | `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1` | NOT_REACHED | `?demo=1&embed=1`, then open the **Network** tab | Network edge labels show *r* | Inventory control; DOM node existed but the Network panel was not shown | Open Correlation Matrix with demo data, switch to Network, click the painted box beside Show r values, confirm edge labels appear and disappear. |
| P2 | Correlation Matrix | Only connected variables | `#showOnlyConnectedNetworkNodes` | `/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1` | NOT_REACHED | Network tab | Hide isolated nodes | Same hidden Network panel | On the Network tab, click Only connected variables and confirm isolated nodes leave the layout, then come back when unchecked. |
| P2 | Correlation Network | Show r values | `#showCorrValues` | `/dialogs/views/correlations/correlation-network.html?demo=1` | NOT_REACHED | Demo or Office data so the network canvas renders | `toggleCorrValues()` shows edge labels | Page loaded without a visible network chrome | Open Correlation Network with demo data, click Show r, confirm labels on the edges. |
| P2 | Correlation Network | Only connected variables | `#showOnlyConnected` | `/dialogs/views/correlations/correlation-network.html?demo=1` | NOT_REACHED | Demo or Office data | Hide isolated nodes | Same hidden network chrome | Click Only connected variables and confirm isolated nodes hide. |
| P2 | Correlation Results | Show r | `#showCorrValues` | `/dialogs/views/correlations/correlation-results.html?demo=1` | NOT_REACHED | Demo data, then the network view on this page | Network edge labels | p-value/N were reached; this control stays on the network view | Open Correlation Results, switch to the network view, click Show r, confirm labels. |
| P2 | Partial Correlation | Show p-values | `#togglePval` | `/dialogs/views/correlations/correlation-partial.html?demo=1` | NOT_REACHED | Demo or Office data so the partial table is visible | Extra p-value cells | Inventory control; still hidden after prepare | Open Partial Correlation with data, click Show p-values, confirm p cells appear in the table. |
| P2 | Partial Correlation | Show df | `#toggleN` | `/dialogs/views/correlations/correlation-partial.html?demo=1` | NOT_REACHED | Demo or Office data | Extra df cells | Same hidden table | Click Show df and confirm the df cells appear and hide. |
| P2 | Correlation By Group | All curves in one chart | `#scatterCombinedToggle` | `/dialogs/views/correlations/by-group.html?demo=1` | NOT_REACHED | Open the scatter dialog after groups exist | Combined scatter of all included levels | Control lives in the scatter dialog, not the main list | Open Correlation By Group, select a grouping variable, open the scatter dialog, click All curves in one chart, confirm one combined chart versus separate curves. |
| P2 | Regression By Group | Show 95% CI | `#regShowCoefDetails` | `/dialogs/views/regression/regression-by-group.html?demo=1` | NOT_REACHED | Group results loaded | Extra coefficient CI columns | Results chrome never became visible | Load Regression By Group results, click Show 95% CI, confirm CI columns appear on the coefficient table. |
| P2 | Regression By Group | Show overall model | `#regShowOverallModel` | `/dialogs/views/regression/regression-by-group.html?demo=1` | NOT_REACHED | Group results loaded | Overall model block | Same hidden results chrome | Click Show overall model and confirm the pooled/overall block appears. |
| P2 | Regression By Group | 95% CI for the mean | `#regSimCiToggle` | `/dialogs/views/regression/regression-by-group.html?demo=1` | NOT_REACHED | Group results loaded; default checked | Simulation CI band on the chart | Same hidden results chrome | Uncheck 95% CI for the mean and confirm the band disappears; check it and confirm it returns. |
| P2 | Reliability Analysis | Pairwise N | `#showPairN` | `/dialogs/views/reliability/reliability-analysis.html?demo=1` | NOT_REACHED | Results loaded | Show pairwise N in the matrix | Results page never exposed the toggle | Open Reliability Analysis with results, click Pairwise N, confirm N appears in the matrix cells. |
| P2 | Mixed Model Results | Overlay Results | `#msdResultsChk` | `/dialogs/views/mixed/mixed-results.html?demo=1` | NOT_REACHED | Results loaded; path diagram visible | Overlay estimates on the path diagram | Hidden switch until results exist | Open Mixed Results with a fitted model, click Overlay Results, confirm estimates paint on and off the diagram. |
| P2 | PCA | Show loading vectors | `#showVectorsToggle` | `/dialogs/views/pca/pca-analysis.html?demo=1` | NOT_REACHED | Results loaded | `onVectorsToggleChange()` draws loading vectors | Plot chrome hidden until a PCA exists | Open PCA with results, click Show loading vectors, confirm vectors draw or hide. |
| P2 | Segmentation Results | Show overall benchmark | `#showBenchmark` | `/dialogs/views/segmentation/segmentation-results.html?demo=1` | NOT_REACHED | `?demo=1` and a rendered chart | Benchmark series on the plot | Chart options hidden until results render | Open Segmentation Results, click Show overall benchmark, confirm the benchmark series appears. |
| P2 | Segmentation Results | Show statistical evidence | `#siEvidence` | `/dialogs/views/segmentation/segmentation-results.html?demo=1` | NOT_REACHED | `?demo=1` and a rendered chart | Evidence annotations | Same hidden chart options | Click Show statistical evidence and confirm annotations appear. |
| P2 | Contingency Results | Data labels | `#vizLabels` | `/dialogs/views/contingency/contingency-results.html?demo=1` | NOT_REACHED | `?demo=1` and a rendered chart | Chart data labels | Chart option hidden until the viz is up | Open Contingency Results, click Data labels, confirm values on the bars/slices. |
| P2 | Contingency Results | Category include (one row) | category table checkboxes | `/dialogs/views/contingency/contingency-results.html?demo=1` | NOT_REACHED | Results loaded | Include that category in the table / chart | Seven unnamed `input[type=checkbox]` nodes were found and hidden. One category stands for the set. | Open Contingency Results, uncheck one category in the include table, confirm that level leaves the analysis, then check it back. Do not walk every unnamed nth-of-type input. |
| P2 | Meta-Analysis Results | Include Anderson 2019 | `.studies-include` (first study) | `/dialogs/views/meta-analysis/meta-results.html?demo=1` | NOT_REACHED | `?demo=1` | Leave-in / leave-out that study | Six identical study includes. One representative. | Open Meta Results, uncheck Include Anderson 2019, confirm the forest plot and pooled effect recompute without it, then check it back. The same widget covers Chen 2020, Rivera 2021, Okada 2022, Müller 2023, and Patel 2024. |
| P2 | Factor Analysis Results | Show ellipse | `#scoreShowEllipse` | `/dialogs/views/factor/factor-results-v3.html?demo=1` | NOT_REACHED | Score-plot tab | `renderScoreScatter()` draws a 95% ellipse | Score-plot chrome hidden | Open Factor Results → score plot, click Show ellipse, confirm the ellipse draws or hides. |
| P2 | Publication Tables | Show Overall column | `#pt2ShowOverall` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | `?demo=1` and a built table | Add/remove the Overall column | Builder options stayed hidden | Open Publication Tables, click Show Overall column, confirm the column appears. |
| P2 | Publication Tables | Show P value column | `#pt2ShowPValue` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | Built table | Add/remove the P column | Same hidden builder | Click Show P value column and confirm P appears or hides. |
| P2 | Publication Tables | Show standardized difference (SMD) | `#pt2ShowSMD` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | Built table | Add/remove the SMD column | Same hidden builder | Click Show SMD and confirm that column appears or hides. |
| P2 | Repeated Measures Results | Show missing | `#showMissingToggle` | `/dialogs/views/dependent/dependent-results-kplus.html?demo=1` | NOT_REACHED | Results loaded | Show missing-data rows | Results chrome hidden | Open Repeated Measures results, click Show rows with missing data, confirm those rows appear. |
| P2 | Repeated Measures Results | Correlation p / N | `#showCorrPValue`, `#showCorrN` | `/dialogs/views/dependent/dependent-results-kplus.html?demo=1` | NOT_REACHED | Results loaded | Extra correlation columns | Hidden until the correlation panel is shown | Open the correlation panel, click p-value and N, confirm those columns appear. Trajectory copies `#trajShowCorrPValue` / `#trajShowCorrN` are the same widget on the trajectory tab — check one of those only if this panel differs. |
| P2 | Regression Input | Interaction pairs | `[data-v1][data-v2]` | `/dialogs/views/regression/regression-input.html?demo=1` | NOT_REACHED (inventory; never discovered) | Assign at least two predictors | Add that interaction term to the model | Dynamic boxes are created after variable assignment | Assign two predictors, click one interaction pair checkbox, run, confirm that interaction term is in the model. |
| P2 | Reliability Input | Reverse-coded items | `[data-rev]` | `/dialogs/views/reliability/reliability-input.html?demo=1` | NOT_REACHED (inventory; never discovered) | Select scale items | Reverse that item before scoring | Dynamic boxes after item selection | Select items, tick one Reverse-coded checkbox, run, confirm that item is reversed in the scoring. |
| P2 | Mixed Model Input | Interaction / covariate / variable filters | dynamic native checkboxes | `/dialogs/views/mixed/mixed-input.html?demo=1` | NOT_REACHED (inventory; never discovered) | Assign variables so term chips appear | Include that term in the model | Created after role assignment | Assign fixed/random terms, click one interaction or covariate filter, confirm the term is in or out of the next run. |
| P2 | Prepare Dataset | Variable include | `[name=prepVar]` | `/dialogs/views/prepare/prepare-dataset-input.html?demo=1` | NOT_REACHED (inventory; never discovered) | Data loaded; some rows may be disabled | Include that variable in the operation | Dynamic; disabled rows are out of scope | Load data, uncheck one enabled variable, run the step, confirm that column is omitted. Do not click disabled rows. |
| P2 | Shared export overlay | Section include / cover / logo | `.st-export-check`, `#stCoverEnabled`, `#stCoverIncludeLogo` | any header-using results page | NOT_REACHED (inventory; never discovered) | Open the export overlay | Include that section, cover, or logo in the export | Overlay is not part of the default prepare path | Open export on any results page, click one section include box, confirm that section enters or leaves the export list. Then toggle cover and logo. |

### P3 — remaining not-reached controls

| Priority | Module | Visible label | Selector | Page/URL | Current status | Preparation | Expected effect | Why verification is needed | Verification steps |
|---|---|---|---|---|---|---|---|---|---|
| P3 | Correlation Reliability | Show Mean / SD | `#showDescriptiveColumns` | `/dialogs/views/correlations/correlation-reliability.html?demo=1` | NOT_REACHED | Demo or Office data | Extra Mean / SD columns | Hidden after prepare; secondary display option | Open Correlation Reliability, click Show Mean / SD, confirm those columns appear. |
| P3 | Pareto Results | Cumulative line | `#optCumLine` | `/dialogs/views/pareto/pareto-results.html?demo=1` | NOT_REACHED | `?demo=1` and a rendered Pareto | Chart cumulative overlay | Chart options hidden | Open Pareto Results, click Cumulative, confirm the cumulative line draws or hides. |
| P3 | Pareto Results | Threshold line | `#optThreshLine` | `/dialogs/views/pareto/pareto-results.html?demo=1` | NOT_REACHED | Rendered Pareto | Chart threshold overlay | Same hidden chart options | Click Threshold and confirm the cutoff line draws or hides. |
| P3 | Pareto Results | Labels | `#optLabels` | `/dialogs/views/pareto/pareto-results.html?demo=1` | NOT_REACHED | Rendered Pareto | Category labels | Same hidden chart options | Click Labels and confirm category labels appear. |
| P3 | Cluster Analysis | Center trails | `#kmMapTrails` | `/dialogs/views/cluster/cluster-analysis.html?demo=1` | NOT_REACHED | Results + map tab | Trail overlay on the k-means map | Map tab never shown | Open Cluster Analysis → map, click Center trails, confirm centroid trails draw. |
| P3 | Cluster Analysis | Merge trails | `#hiMapTrails` | `/dialogs/views/cluster/cluster-analysis.html?demo=1` | NOT_REACHED | Results + hierarchical map tab | Trail overlay on the hierarchical map | Same map tab | Switch to hierarchical map, click Merge trails, confirm merge trails draw. |
| P3 | Publication Tables | Use a common analysis sample | `#pt2CompleteCase` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | Built table | Restrict every row to the complete-case sample | Builder stayed hidden | Click Use a common analysis sample and confirm Ns align across rows. |
| P3 | Publication Tables | Show Missing as its own category | `#pt2ShowMissingCat` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | Built table | Extra Missing category | Same hidden builder | Click Show Missing as its own category and confirm a Missing row/column appears. |
| P3 | Publication Tables | Italic title | `#pt2CustomItalic` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | Style panel | Italic caption title | Typography extras | Open the style panel, click Italic title, confirm the title italicizes. |
| P3 | Publication Tables | Bold caption label | `#pt2CustomBoldCaption` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | Style panel; default on | Bold caption label | Typography extras | Uncheck Bold caption label and confirm the caption weight drops. |
| P3 | Publication Tables | Leading zero in p-values | `#pt2CustomLeadingZero` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | Style panel | p-values as 0.05 versus .05 | Typography extras | Click Leading zero in p-values and confirm the p format changes. |
| P3 | Publication Tables | Extra builder checkboxes | `input[type=checkbox]:nth-of-type(6)`–`(14)` | `/dialogs/views/publication-tables/publication-tables-builder.html?demo=1` | NOT_REACHED | Built table / style panel | Per-column or per-style include | Nine unnamed nodes. Treat as one family once the named Publication toggles work. | After the named Publication boxes are verified, click one remaining unnamed checkbox and confirm its label’s column or style changes. Do not inventory all nine by hand. |
| P3 | Mixed Model Results | Residual histogram normal | `#resHistNormal` | `/dialogs/views/mixed/mixed-results.html?demo=1` | NOT_REACHED (inventory; never discovered) | Residual tab | Normal overlay on the residual histogram | Residual tab not opened in the audit | Open Mixed Results → Residual, click the normal-overlay box, confirm the curve draws or hides. |
| P3 | Segmentation Results | Factor list | `#siFactorList input` | `/dialogs/views/segmentation/segmentation-results.html?demo=1` | NOT_REACHED (inventory; never discovered) | Results loaded | Include that factor in the plot | Dynamic factor rows | Open Segmentation Results, uncheck one factor in the list, confirm it leaves the plot. |
| P3 | Prepare Quality | Add to recipe | `[data-idx]` | `/dialogs/views/prepare/prepare-quality-input.html?demo=1` | NOT_REACHED (inventory; never discovered) | Quality issues present | Add that correction to the recipe | Only exists when issues are flagged | Open Prepare Quality on a dirty dataset, tick Add to recipe on one issue, confirm it appears in the recipe list. |
| P3 | Repeated Measures Results | Trajectory correlation p / N | `#trajShowCorrPValue`, `#trajShowCorrN` | `/dialogs/views/dependent/dependent-results-kplus.html?demo=1` | NOT_REACHED | Trajectory tab | Extra correlation columns on the trajectory view | Duplicate of the main correlation toggles | Only if the trajectory tab is a separate table: click p-value and N there and confirm those columns. Skip if item 15 / the P2 correlation pair already covers this view. |

## Counts

| Bucket | Unique user-facing rows in this queue | Notes |
|---|---:|---|
| P0 FAIL_VISIBLE_CLICK | 10 | 9 Mixed Options + Cluster Standardise |
| P1 keyboard representatives | 3 | Cover 36 `FAIL_KEYBOARD` + 2 off-screen by-group rows |
| P1 effect not verified | 14 | Interaction already passed |
| P2 important NOT_REACHED | 31 | Named inventory controls + one row per identical widget |
| P3 remaining NOT_REACHED | 16 | Secondary viz/style and inventory leftovers |
| Excluded | 3 | ANOVA hidden state-holders (also `INTENTIONALLY_DISABLED`) |

The 36 shared-header / by-group keyboard failures are **not** 36 queue rows. They collapse to K1 + K2 + K3.
