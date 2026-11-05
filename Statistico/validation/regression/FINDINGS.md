# Regression calculation findings

This folder records outstanding Regression findings for a later validation project. Video production does not remediate them, does not run a formal validation sign-off, and does not claim the module is independently validated.

The film's production check still confirms that the seeded page loads, that moving a predictor changes the scenario, and that Refit Excluding Flagged shows a comparison. Those checks guard the recording. They are not a validation certificate.

## Deferred

- The overview F-test chip prints `0.0001`. The conclusion text is below 0.0001.
- The scenario region control opens on West. Its dummy coding drops the first encountered level, so the displayed level matches the North reference predictor.
- Scenario interval widths use 0.3×RMSE and 1.1×RMSE with t = 1.96. They are not classical mean and prediction standard errors. The profile chart draws those same widths.
- Shapiro–Wilk and Breusch–Pagan on the diagnostics overview are random draws. An outside Shapiro–Wilk on the seeded residuals is about W 0.9881, p 0.3828.
- Durbin–Watson on the page drops the first squared residual. An outside statistic on the seeded residuals is about 1.7124.
- Cook's distance on screen uses leverage k/n for every row. The page maximum is about 0.0676. Classical hat-value Cook's distance peaks near 0.1186.
- VIF is not computed. The coefficient table shows an em dash.
- There is no click-to-select control for an individual observation or chart point. The screen flags rows from its residual rule, and Refit Excluding Flagged drops that set. Restore Original removes the comparison.
- There is no control that changes the confidence level.

No remediation is started here.
