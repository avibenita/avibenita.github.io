# Contingency capability inventory r001

Checked in the results page, the shared sidebar, the engine, and a demo open of By-Group Analysis.

## On card 1

- Tables and percentages: observed counts, expected counts, row %, column %, total %, adjusted residuals. The first selected measure is drawn largest. Row and column names can be dragged.
- Association: Pearson chi-square without a Yates control, likelihood-ratio chi-square, ordinary Cramér’s V = sqrt(χ² / (N × min(rows−1, columns−1))). Fisher’s exact test on integer 2×2 tables. The two-sided p is the sum of hypergeometric probabilities at least as small as the observed table.
- Cell diagnostics: Haberman adjusted residuals, expected-count warning when any expected count is below 1 or more than 20% are below 5, and a blue/orange color map.
- 2×2: odds ratio, risk ratio, risk difference, and their intervals. Group of interest, event column, and Beneficial/Harmful labeling. Odds-ratio and risk-ratio intervals are log-Wald. The risk-difference interval is Wald and is shown in percentage points. A 0.5 continuity correction is applied to the odds ratio only when a cell is zero. This film’s examples have no zero cells.
- Charts used in the film: clustered, stacked, and 100% stacked columns, plus clustered and stacked bars, axis choice, and data labels. Lines, smooth lines, and areas also exist and were left off the card.
- Input: row and column assignment, optional frequency column, and By-Group Analysis. By Group opened on the built-in Treatment × Response demo and offered Site (2 levels, n = 100) as the grouping column.

## On card 2

- Explain this view, for the open view.
- Analyze all results, for the whole analysis. These stay separate.
- Input-step missing-value rule and category selection.
- View Data, HTML report with chosen sections, Copy table, CSV, JSON, and Save as PNG.

## Not advertised

- Mosaic or association plots. The public overview mentions them. The results chart list does not.
- A Yates checkbox. Pearson χ² on this page is the uncorrected sum of (O−E)²/E.
- Monte Carlo. The engine and the separate 2×2 calculator can run it. The results page filmed here does not.
- Power, and a save/reload settings file on this page.
- Data Manipulation. It is a separate module and is not opened from this results page.
- One odds ratio or risk ratio for the 3×3 table. That menu item is absent, and the engine returns no 2×2 measures.
