# Correlation review r002

Picture and voice follow the Correlation review r001 and univariate__film__review-r008. 1728×1080, 30 fps, H.264, AAC. Narration is en-US-AriaNeural at -4%. Loudness target −16.6 LUFS, true-peak limit −1.5 dBTP. Integrated loudness measured -16.61 LUFS, true peak -1.49 dBTP. Duration 174.50s. r001 is unchanged. This file is not wired to the website player.

## Report

Changed files: `record-correlation-film.mjs`, `correlation-network.html` (node labels are offset outward from the graph center, and edge values are offset perpendicular to the link), this transcript, and `correlation__film__review-r002.mp4`.

Orientation speech is 30.31s, before the short return to the matrix. The voice was not sped up.

Business fixture: seed 20260504, source `correlation-demo`, n=72, Ad Spend, Traffic, Revenue, Satisfaction, Churn Risk. Pearson table: Ad Spend–Traffic 0.921, Traffic–Revenue 0.898. Spearman Ad Spend–Traffic 0.928. Scatter keeps the module's own extra precision.

Partial check: displayed Traffic–Revenue with Ad Spend as the only control is 0.501. Independently, the Pearson correlation of residuals after separate intercept regressions of Traffic and Revenue on Ad Spend is 0.5007.

Taylor fixture: seed 20261104, n=72, source `correlation-taylor-forecast`. Observed sales, Forecast A, Forecast B, Forecast C, all the same quantity. Reference SD 11.677. Identical copy sits at r=1. Series: Forecast A r=0.9856, SD=11.947, angle 9.8°; Forecast B r=0.6759, SD=11.521, angle 47.5°; Forecast C r=0, SD=11.677, angle 90°. Angle is arccos of absolute r, which is how the diagram places a point. The business fixture is restored for the partial and descriptive chapters.

Frame checks at 1728×1080: the orientation Taylor plate is the finished forecast diagram, not the empty builder. The Ad Spend/Traffic cell keeps its row and column labels and reads 0.921. The heatmap uses the module palette, with a compact positive/negative key. The scatter dialog shows all 72 points, r 0.9215, p < 0.001, and R² 0.8491, then the linear fit y = 5.25x + 39.18. Spearman prints 0.928. Network labels for all five variables stay apart, and at |r| ≥ 0.70 the banner names Satisfaction and Churn Risk. Partial starts with no control at 0.898, then the comparison dialog shows regular 0.898 and partial 0.501 after Ad Spend is moved into Control. Ad Spend's histogram at 12 bins still shows n 72, mean 68.99, and standard deviation 16.52.

Limitations: normalization is not demonstrated, because toggling it in the recorder previously replaced the Taylor page with a blank document. The diagram therefore keeps the actual standard-deviation radius, not a radius of 1. No scene claims prediction accuracy or causation. Save and retrieve of a configuration exists in the configuration dialog and is omitted here because it was not verified from the analysis views in this film. No control was found that opens a separate product outside Correlation, so none is named. By Group is named only as a menu destination. Reliability is omitted because these variables are not a scale.

Scenes requested and not shown: normalized Taylor radius.

| Start | End | Line |
| --- | --- | --- |
| 0:00.45 | 0:05.01 | Correlation, every relationship, every view that matters. |
| 0:05.81 | 0:36.12 | Correlation Analysis explores how variables move together, and how strong their associations are. Start with a matrix, inspect any pair as a scatter plot, and view the same relationships as a network. The Taylor diagram compares matched series with a reference. Partial correlations show associations after adjustment for selected variables. Descriptive views help you understand each variable before interpreting its relationships. |
| 0:37.57 | 0:49.73 | These are simulated business results. Ad Spend and Traffic show a strong positive linear association. The coefficient is zero point nine two one. |
| 0:49.73 | 0:53.64 | The same correlations, shown in color. |
| 0:53.64 | 1:03.98 | Raise the highlight to zero point seven zero. It marks the stronger relationships. It does not change the coefficients. |
| 1:03.98 | 1:12.47 | Open a pair to inspect the pattern behind the coefficient. The p-value and R squared are shown with the points. |
| 1:12.47 | 1:16.26 | Add a fitted line to summarize the trend. |
| 1:18.91 | 1:23.85 | Switch to a rank-based measure of monotonic association. |
| 1:24.65 | 1:26.52 | Network. |
| 1:27.60 | 1:38.49 | Raise the strength threshold to focus on the strongest connections. At this setting, Satisfaction and Churn Risk have no links reaching the threshold. |
| 1:39.29 | 1:41.45 | Taylor diagram. |
| 1:42.24 | 1:49.12 | Observed sales is the reference. Forecast B and Forecast C are added. |
| 1:49.12 | 1:52.93 | Correlation is read around the outer scale. |
| 1:52.93 | 1:57.63 | Distance from the origin represents standard deviation. |
| 2:02.08 | 2:04.50 | Partial correlations. |
| 2:05.03 | 2:09.15 | Traffic and Revenue are strongly associated. |
| 2:09.15 | 2:12.75 | Now adjust for Ad Spend. |
| 2:12.75 | 2:20.66 | Their association becomes weaker, falling from about zero point nine zero to zero point five zero. |
| 2:24.11 | 2:26.10 | Descriptives. |
| 2:27.06 | 2:36.29 | Inspect each variable's distribution alongside its relationships. Change the bins to explore the shape of Ad Spend. |
