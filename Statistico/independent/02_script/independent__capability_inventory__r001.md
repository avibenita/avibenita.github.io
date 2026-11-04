# Independent Means capability inventory r001

Verified on the results page with the film fixture (30 + 30 simulated scores, separate columns, seed 110401). A control is listed only when this page shows it.

## Shown and used

- Two score columns, Group A and Group B. Empty cells stay in their own column, so a shared spreadsheet row is not treated as a pair. The page reports “Design is compatible with independent-group comparison.”
- Descriptives: n, mean, standard deviation, min, median, max, plus a histogram for the selected group.
- Comparison chart: means with a 95% interval of the mean, a variance chart, and a box plot.
- Parametric framework locked to Welch’s t-test, two-sided alternative, significance 0.050.
- Mean difference with the on-screen 95% interval, and Hedges g.
- Effect sizes view: Hedges g, Cliff’s delta, rank-biserial correlation, P(X>Y).
- Mann–Whitney U as the non-parametric framework, and as the robustness check beside Welch.
- Power and sample size: noncentral F for two groups, assumed eta-squared, target power 80/85/90/95, required total N raised to a balanced allocation, and power at the current N. The planner is not exact Welch power. Observed eta-squared on this fixture is about 0.085, separate from the assumed planning values.
- Sidebar: Explain this view, and Analyze all results. Both are wired. The film does not call the model.
- View Data, Export Report, Save as PNG, and Download JSON are present in the sidebar.
- Recoding belongs to the companion Data Manipulation module, not to this screen.

## Present in the engine, not offered on this screen

- Student’s t and the permutation test are calculated inside `buildIndependentBundle`, but after the page opens the test list is replaced and disabled. The working choices are Welch or Mann–Whitney.
- The significance slider updates the decision threshold, the power alpha, and the Welch interval. The interval uses the Student t critical value at the selected alpha. The estimate and the Welch p-value stay the same.
- The assumptions tab does not run a Shapiro–Wilk or QQ calculation. It shows the text “Check QQ / Shapiro in Python service” and an equal-variance note.
- The descriptives table’s standard deviation divides by n. The Welch calculation uses the sample standard deviation, which is 10 for both groups. The table shows 9.83.
- There is no field labeled Cohen’s d. Planning is entered as eta-squared. Eta-squared 0.083 is about a standardised difference of 0.60 (Cohen’s f 0.301 on this screen). The solved quantity is total N, not n per group.
- The planner’s own note is an equal-variance noncentral F model. It is not Welch power.
- A separate k-plus results page exists. This two-group film does not open it.
- There is no by-group analysis beyond the two groups being compared.
- Saving a configuration still depends on the host dialog. This page does not reload a saved model by itself.

## Omitted from the cards

Student, permutation, multi-group post-hoc, a user-entered Cohen’s d, per-group sample size, and a confidence level that widens the interval.
