# Statistico checkbox inventory

Static inventory of current production pages. Legacy versioned copies (`*-v2.html`, `hub-prep*`, `descriptive-stats9999.html`, sandbox files) are listed only when they are still the live target.

There is no React/Vue `Checkbox` component. Checkboxes are native `input[type=checkbox]` nodes, plus a few `role="checkbox"` rows in By-Group views. Shared look-and-feel and label click handling live in `dialogs/views/shared-header.js` (`_ensureCheckboxStyles` / `_bindCheckboxToggles`). Painted native inputs use `opacity:0` and `pointer-events:none`.

| Module | Checkbox | Selector | Native / custom | Default | Disabled | Expected effect | Preparation |
|---|---|---|---|---|---|---|---|
| Univariate Workspace | Normal | `#showNormalCurve` | native | checked | no | Redraw histogram with normal overlay | `?demo=1` |
| Univariate Workspace | Mean | `#showMeanLine` | native | unchecked | no | Draw mean line | `?demo=1` |
| Univariate Workspace | Median | `#showMedianLine` | native | unchecked | no | Draw median line | `?demo=1` |
| Histogram v2 | Normal / Mean / Median | `#showNormalCurve`, `#showMeanLine`, `#showMedianLine` | native | Normal on | no | Same overlay redraw | `?demo=1` |
| Correlation Matrix | p-value | `#showPValue` | native | checked | no | `toggleDisplay()` shows p cells | `?demo=1&embed=1` |
| Correlation Matrix | N | `#showN` | native | checked | no | `toggleDisplay()` shows N | `?demo=1&embed=1` |
| Correlation Matrix | Show r values | `#showNetCorrValues` | native | checked | no | Network edge labels | Network tab |
| Correlation Matrix | Only connected variables | `#showOnlyConnectedNetworkNodes` | native | unchecked | no | Hide isolated nodes | Network tab |
| Partial Correlation | Show p-values | `#togglePval` | native | unchecked | no | Extra p-value cells | Demo or Office data |
| Partial Correlation | Show df | `#toggleN` | native | unchecked | no | Extra df cells | Demo or Office data |
| Taylor Diagram | Normalize to SD=1.0 | `#normalize-toggle` | native | unchecked | no | `toggleNormalization()`; ACTIVE badge | Demo or Office data |
| Correlation Network | Show r values | `#showCorrValues` | native | checked | no | `toggleCorrValues()` | Demo or Office data |
| Correlation Network | Only connected variables | `#showOnlyConnected` | native | unchecked | no | Hide isolated nodes | Demo or Office data |
| Correlation Results | p-value / N / r values | `#showPValue`, `#showN`, `#showCorrValues` | native | checked | no | Table / network display | Demo or Office data |
| Correlation By Group | All curves in one chart | `#scatterCombinedToggle` | native switch | unchecked | no | Combined scatter | Open scatter dialog after groups |
| Correlation By Group | Level include | `[role=checkbox][data-level-pos]` | custom | included | no | Include / exclude a group level | Select a grouping variable |
| Regression Input | Include intercept (β₀) | `#chkIncludeIntercept` | native | checked | no | Fit with intercept | Page load |
| Regression Input | Interaction pairs | `[data-v1][data-v2]` | native | varies | no | Add interaction term | Assign ≥2 predictors |
| Regression By Group | Show 95% CI | `#regShowCoefDetails` | native | unchecked | no | Extra coefficient columns | Group results |
| Regression By Group | Show overall model | `#regShowOverallModel` | native | unchecked | no | Overall model block | Group results |
| Regression By Group | 95% CI for the mean | `#regSimCiToggle` | native | checked | no | Simulation CI band | Group results |
| Reliability Input | Cronbach’s alpha | `#optAlpha` | native | checked | no | Include alpha in output | Options tab |
| Reliability Input | McDonald’s omega total | `#optOmega` | native | checked | no | Include omega | Options tab |
| Reliability Input | Standardized alpha | `#optStdAlpha` | native | unchecked | no | Include standardized alpha | Options tab |
| Reliability Input | Confidence interval | `#optCI` | native | checked | no | Include CI | Options tab |
| Reliability Input | Item diagnostics / scree | `#optITC`, `#optAlphaDel`, `#optOmegaDel`, `#optMatrix`, `#optFlagWeak`, `#optUni`, `#optScree` | native | mostly checked | no | Include diagnostic blocks | Options tab |
| Reliability Input | Reverse-coded items | `[data-rev]` | native | varies | no | Reverse item before scoring | Select scale items |
| Reliability Analysis | Pairwise N | `#showPairN` | native | unchecked | no | Show pairwise N in matrix | Results loaded |
| Mixed Input | Output sections | `#chkTypeIII`, `#chkCoeffs`, `#chkVarComp`, `#chkEMM`, `#chkPairwise`, `#chkBLUP`, `#chkResid`, `#chkIC`, `#chkPseudoR2` | native | most checked | no | Include that results section | Page load |
| Mixed Input | Interaction / covariate / variable filters | dynamic | native | varies | no | Include term in model | Assign variables |
| Mixed Results | Overlay Results | `#msdResultsChk` | native (hidden switch) | checked | no | Overlay estimates on path diagram | Results loaded |
| Mixed Results | Residual histogram normal | `#resHistNormal` | native | checked | no | Normal overlay on residual hist | Residual tab |
| PCA | Show loading vectors | `#showVectorsToggle` | native | checked | no | `onVectorsToggleChange()` | Results loaded |
| Pareto Results | Cumulative / threshold / labels | `#optCumLine`, `#optThreshLine`, `#optLabels` | native | checked | no | Chart overlays | `?demo=1` |
| Segmentation Results | Show overall benchmark | `#showBenchmark` | native | unchecked | no | Benchmark series | `?demo=1` |
| Segmentation Results | Show statistical evidence | `#siEvidence` | native | unchecked | no | Evidence annotations | `?demo=1` |
| Segmentation Results | Factor list | `#siFactorList input` | native | varies | no | Include factor in plot | Results loaded |
| Contingency Results | Data labels | `#vizLabels` | native | unchecked | no | Chart labels | `?demo=1` |
| Contingency Results | Category include | dynamic table checkboxes | native | mostly on | no | Include category in table | Results loaded |
| Meta Input | Hartung–Knapp adjustment | `#hartungKnapp` | native | checked | no | HK adjustment for random effects | `?demo=1` |
| Meta Results | Include study | `.studies-include` | native | varies | no | Leave-in / leave-out study | `?demo=1` |
| Cluster Input | Standardise variables | `#clusterStandardize` | native | checked | no | z-score before distances | Page load |
| Cluster Analysis | Center / merge trails | `#kmMapTrails`, `#hiMapTrails` | native | unchecked | no | Trail overlay on map | Results + map tab |
| Factor Results | Show ellipse | `#scoreShowEllipse` | native | unchecked | no | `renderScoreScatter()` | Score plot |
| Factor Results | Factorability exclude | `.fa-remove-cb` | native | varies | no | Drop variable from KMO set | Factorability table |
| Publication Tables | Overall / P / SMD / missing / style | `#pt2ShowOverall`, `#pt2ShowPValue`, `#pt2ShowSMD`, `#pt2CompleteCase`, `#pt2ShowMissingCat`, `#pt2CustomItalic`, `#pt2CustomBoldCaption`, `#pt2CustomLeadingZero` | native | Bold caption on | no | Table columns and typography | `?demo=1` |
| Prepare Dataset | Changed rows only | `#changedOnly` | native | checked | no | Filter preview to changed rows | Preview pane after a step |
| Prepare Dataset | Variable include | `[name=prepVar]` | native | varies | some disabled | Include variable in operation | Data loaded |
| Prepare Quality | Add to recipe | `[data-idx]` | native | unchecked | no | Add correction to recipe | Quality issues present |
| Logistic Input | Include intercept | `#chkIncludeIntercept` | native | checked | no | Fit with intercept | Page load |
| Dependent k+ | Correlation p / N | `#showCorrPValue`, `#showCorrN`, `#trajShowCorrPValue`, `#trajShowCorrN` | native | checked | no | Extra correlation columns | Results loaded |
| Dependent k+ | Show missing | `#showMissingToggle` | native | unchecked | no | Show missing-data rows | Results loaded |
| ANOVA Input | Descriptives / assumptions / nonparam | `#chkDescriptives`, `#chkAssumptions`, `#chkNonParam` | native | checked | hidden | Internal output flags, not a UI control | None — `display:none` |
| Shared export overlay | Section include / cover / logo | `.st-export-check`, `#stCoverEnabled`, `#stCoverIncludeLogo` | native | varies | no | Include section, cover, or logo in the export; Include all / Exclude all toggles every section | Open export overlay |
| Shared header | Painted checkbox skin | `label > input[type=checkbox]` | native + CSS | n/a | n/a | One label click = one toggle + change event | Any header-using page |

## Shared component

`dialogs/views/shared-header.js` is the shared checkbox layer:

- Hides the native input (`opacity:0`, `pointer-events:none`)
- Paints a `::before` box on the wrapping label
- Intercepts label clicks, flips `checked`, dispatches `input` and `change`
- Skips `.highcharts-legend-checkbox` and `.st-export-check`

By-Group pages also render custom `role="checkbox"` level rows in `univariate/by-group.html`, `correlations/by-group.html`, `regression/regression-by-group.html`.
