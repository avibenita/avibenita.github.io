# Regression narration r001

Voice: en-US-AriaNeural, rate −4%, edge-tts. Stems are voice only.

The spoken lines are `produce/cues.json`. They name only figures checked against the independent fit and the on-screen text:

- n = 120, R² = 65.63%, F test below 0.0001 (conclusion and technical panel).
- Ad Spend coefficient 1.76, 95% interval 1.51 to 2.01.
- Predicted sales 116.37 to 169.67 when Ad Spend is raised to the top of the slider. That change matches the Ad Spend slope.
- Cook's distance on this screen stays under 0.5. Three rows are flagged by standardized residuals above 2.
- Refit R² 0.6563 to 0.6930, n 120 to 117.

The narration does not quote a VIF, a Shapiro-Wilk result, a Breusch-Pagan result, or a classical prediction-interval width. Those are not confirmed results of this build.
