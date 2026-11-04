# Paired Means capability inventory r001

Verified on the two-occasion results page with the film fixture (24 people, Before / After / Follow-up, seed 110402). The film analyses After minus Before. Follow-up stays in the source rows and is not part of this comparison. A control is listed only when this page shows it.

## Shown and used

- Two score columns on the same people. The page reports After (n=24, mean=64.00) and Before (n=24, mean=60.00), and Complete Pairs: 24. Total N on the descriptives header is that pair count.
- An incomplete pair would be dropped together. This fixture has no missing scores, so the missing-data warning stays hidden.
- Descriptives: n, mean, standard deviation, min, median, max, skew, kurtosis, and a histogram of the selected occasion.
- Comparison chart: means, a variance chart, and a box plot. These are two occasion summaries. There is no individual trajectory on this page.
- Parametric framework locked to the paired t-test, two-sided alternative, significance 0.050. The hypothesis line is “Mean change = 0” against “The mean change differs.”
- Mean difference 4.00 with the 95% interval [0.6219, 7.38], t(23.00) = 2.45, two-sided p 0.0223.
- Wilcoxon signed-rank on the robustness panel: W = 225.00, p 0.0321, rank-biserial 0.5000. The two decisions agree at alpha 0.05.
- Assumptions note: “Check normality of differences.” The equal-variance row has no result.
- Written report lines for the paired t and the signed-rank test.
- Sidebar: Explain this view, and Analyze all results. Both are wired. The film does not call the model.
- View Data, Export Report, Save as PNG, and Download JSON are present.

## Present, not filmed as a result

- Hedges g is printed as 0.2860 (small). The engine builds it from a pooled standard deviation of the two columns and a sample size of n1 + n2. That is not Cohen’s dz, which is 0.50 on these change scores. The film does not narrate it.
- The Power Analysis item is on the menu and its panel is still a placeholder. The menu line says it is not calculated on this two-occasion page. It is not opened.
- Effect Sizes also prints Cliff’s delta and P(X>Y). Those fields are empty for this bundle, so that tab is not opened.
- The histogram’s normality note describes the selected occasion, not the distribution of changes.
- Recoding belongs to the companion Data Manipulation module, not to this screen.
- There is no by-group analysis beyond the two occasions being compared.

## Omitted chapters

- Three occasions. The repeated-measures engine decomposes within-person sums of squares, and on this fixture F is 6.721 on (2, 46) with partial eta squared 0.226. The p-value function used for that F is a coarse step, not the F distribution, so the repeated-measures result is not filmed. Individual trajectories live on the three-occasion page and are not on this two-occasion screen.
- Paired power. No working paired-t sample-size calculator was available to film. The placeholder panel is not shown as a result.
- A sign test is not on this page.
