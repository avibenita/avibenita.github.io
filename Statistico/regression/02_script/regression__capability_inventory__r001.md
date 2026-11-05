# Regression capability inventory r001

Verified against the page and an independent OLS fit of the seeded 120-row case study.

Shown in the film:

- Model overview: n, R², and the F conclusion. R² is 0.6563111758, displayed as 65.63%. The independent F tail probability is far below 0.0001. The conclusion and the technical F panel print “< 0.0001”.
- Technical coefficient table from `computeOLS`: coefficient, standard error, t, p, and 95% interval. Ad Spend is 1.759914893, displayed as 1.76, with interval 1.51 to 2.01. Reference category for Region is North, the first sorted level.
- Scenario Ad Spend slider. The change in predicted sales equals the Ad Spend coefficient times the slider change.
- Residual-versus-fitted and normal Q-Q plots drawn from the model residuals.
- Influence table flags rows 18, 61, and 83 by standardized residual above 2. Cook's distance on this screen uses leverage k/n and stays under 0.5.
- Refit Excluding Flagged calls `computeOLS` on the remaining 117 rows. Independent refit R² is 0.6930473813, displayed as 0.6930. RMSE is 17.8640.

Present in the module and not used as a result in the film:

- The overview F chip prints 0.0001 rather than “< 0.0001”.
- The VIF column is an em dash. `computeOLS` is called without the VIF flag.
- Shapiro-Wilk and Breusch-Pagan on the diagnostics overview are random numbers, not tests of these residuals.
- The page Durbin-Watson omits the first squared residual.
- Scenario intervals use 0.3×RMSE and 1.1×RMSE. They are not classical standard errors.
- The scenario region control opens on West, while zero dummies in that control match the North reference row of the coefficient table.
- By Group, interactions, power, correlations, and descriptives are real navigation targets and are outside this two-minute demonstration.
