# Statistico demo data pack

28 synthetic CSV files cover the 24 worksheet and reporting modules shown in the Statistico task pane. The pack also contains 45 calculator preset sets, with two scenarios per set. All example values are fictional.

1. Extract this pack into the Statistico working copy or open the extracted folder beside it in Cursor.
2. Give Cursor `Cursor_Implementation.md`. It specifies the input control, grouping behavior, role assignment, and integration checks.
3. Use `catalog.json` for asset paths, field types, grouping fields, role defaults, input modes and calculator settings. Use `reference_checks.json` to check the loaded examples. CSVs use UTF-8, decimal points and a header row. The data-preparation fixture deliberately contains blanks, whitespace, mixed values and duplicates.

## Worksheet and reporting demos

| Module | Example | Grouping field |
| --- | --- | --- |
| Univariate | Skewed urgent-care waits and more symmetric rooming times | Shift |
| Correlations | Wellness measures with an age-adjusted relationship | Program setting |
| PCA | Component geometry and material response | Plant |
| Factor Analysis | Learning questionnaire with three correlated item blocks | Course format |
| Hierarchical Clustering | Customer purchasing profiles | Market |
| K-means | Subscription engagement profiles | Market |
| Independent Groups | Training scores with unequal spreads | Site |
| Paired / Repeated Measures | Mobility at three visits in matching wide and long files | Program |
| ANOVA | Coating adhesion with a temperature interaction | Shift |
| Contingency Tables | Weighted 2×2 and 2×3 response tables | Site or channel |
| Meta-analysis | Binary arms, precomputed log risk ratios and SEs, and continuous arm summaries | Study setting |
| Linear Regression | Store sales and advertising with an influential store | Region |
| Logistic Regression | Subscription churn with both outcomes in each group | Sales channel |
| Mixed Models | Recovery trajectories with missed intermediate visits | Program |
| Pareto Analysis | Packaging defects whose leading cause varies by line | Line |
| Process Optimization | Heat-seal trials measuring strength and cycle time | Line |
| Gage R&R | A complete crossed study on each of two benches | Bench |
| Process Capability | Ordered machined diameters and specification crossings | Line |
| Split Index | Renewal intent and customer survey factors | Purchase channel |
| Scale Reliability | Confidence scale with a weak item and an optional reverse-keyed item | Delivery mode |
| Prepare Data | Orders with dirty labels, mixed units values, blanks and duplicates | Site |
| 3D Charts | Store pricing, promotion and sales | Territory |
| Publication Tables | A two-arm baseline and outcomes table | Study arm |
| EzPaste | A quarterly sales table and source data for a grouped chart | Region |

## Calculator scenarios

- **Distribution calculators** Set up common continuous and discrete distributions at two parameter settings for each distribution.
- **Typed Contingency Tables** Enter 2×2 or 2×3 counts for two sites or channels.
- **Precision / Sample Size** Compare proportion and mean precision scenarios.
- **Power / Sample Size** Try the supported sample-size and power solve modes with two effect assumptions. The planning assumptions use descriptive field names for Cursor to map to the active forms.
- **Effect Size Converter** Compare two standardized mean differences.
- **Call Center Staffing** Compare Midday and Peak in Erlang C and staffing simulation.
- **Process Capability Calculator** Compare summary statistics for the two manufacturing lines. For worksheet Quality Control routes accepting ordered measurements, the capability CSV supplies two separate production streams and consecutive rational subgroups of five.

The calculator inventory uses the [public Calculators Hub](https://statistico.live/Statistico-Website/index-Calculators.html), the [public product FAQ](https://statistico.live/Statistico-Website/faq.html), and the current task-pane screenshots. The active input routes and exact role contracts still need to be verified in the Statistico repository.

## Reading the reference results

The references were computed independently from the CSVs. They are anchors for compatible settings. `pca` and `factor_analysis` report correlation-matrix eigenvalues. Clustering uses standardized inputs, Ward linkage or a seeded K-means fit, and compares cluster sizes independently of label order. Meta-analysis uses fixed inverse-variance weighting for the numerical anchors. The regressions include the optional region or sales-channel factor. The logistic AUC is in-sample. Mixed Models and Split Index references report descriptive data checks. The Gage R&R reference SD pools the within-cell variances, with each bench treated as its own study. The capability reference uses overall sample SD for Ppk and a fitted normal model for Expected PPM. It counts observed failures directly from values strictly below or above the specification limits.
