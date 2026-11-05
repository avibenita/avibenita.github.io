# Regression capability inventory r001

Used in the film, because the page performs them:

- Scenario sliders for Ad Spend and Store Size. Moving a slider recomputes the displayed prediction and retargets the profile chart to that predictor.
- Profile axis buttons. Choosing Store Size redraws the profile along that predictor.
- The influence table's flagged rows, from the screen's residual rule.
- Refit Excluding Flagged, which refits without that set and shows the original beside the refit.
- Restore Original, which clears the comparison.

Not used, because the module does not support them or the result is a known defect:

- Clicking a chart point or a table row does not select an observation. The Action column is text, not a control.
- There is no confidence-level control. Scenario interval bands use a fixed approximation and are not described.
- The region dropdown does not match the model's reference coding.
- The overview F chip, VIF column, Shapiro–Wilk, Breusch–Pagan, Durbin–Watson, and on-screen Cook's distance are deferred in `Statistico/validation/regression/FINDINGS.md`.

The statistical implementation is unchanged.
