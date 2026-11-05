# Regression capability inventory r001

Demonstrated, because the page performs the action:

- Predictor-effect plot. Choosing Store Size changes the selected predictor and redraws the plot. The strip shows that predictor’s standard error and interval from the fitted model.
- Scenario slider for Ad Spend. The prediction and the profile title change with the slider.
- Flagged rows, Refit Excluding Flagged, and Restore Original.

Listed in the catalogue because the module implements them, and not used as a demonstration:

- Overview and technical coefficient table, including standard errors, t statistics, confidence intervals, and ANOVA.
- Clicking a coefficient row to plot that predictor.
- Scenario profile axis, save scenario, and apply scenario.
- Residual versus fitted, normal Q-Q, scale-location, and residuals versus leverage. These are displays. The film does not treat opening the tab as an interaction.
- Added-variable plots.
- Interaction plots and simple slopes when the model includes a product term. The seeded case study has no product term.
- By-group results, power and sample size, descriptives, and correlations.
- Explain this view, Analyze all results, and HTML export.

Marked “Not in this build” on the second catalogue page, and recorded for the validation project:

- Classical scenario intervals, and any adjustable confidence level.
- Clicking a point or a row to select that observation.
- Variance inflation factors.
- Reproducible Shapiro–Wilk and Breusch–Pagan cards.
- Classical Cook’s distance.
- The region scenario control, which does not match the model reference. The film does not move it.

The statistical implementation is unchanged.
