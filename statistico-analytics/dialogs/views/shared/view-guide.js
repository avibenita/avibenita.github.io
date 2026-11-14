/**
 * Reviewed view guide.
 * One drawer for every analytical view. Content is swapped when the view
 * changes. The drawer stays closed until the user opens View guide.
 * Item definitions stay on the control (the i mark). Result interpretation
 * stays on Interpret results.
 */
(function () {
  function guide(title, purpose, interact, read, limits) {
    return {
      title: title,
      sections: [
        { id: 'purpose', title: 'Purpose', paragraphs: [].concat(purpose) },
        { id: 'interact', title: 'How to interact', items: interact },
        { id: 'read', title: 'How to read the results', items: read },
        { id: 'limits', title: 'Limits', items: limits }
      ]
    };
  }

  const univariate = {
    histogram: guide(
      'Histogram',
      'Shows how often values fall into intervals, so you can see where the sample sits, how wide it is, and whether the shape is simple or lumpy.',
      [
        'Binning Method sets how the bars are cut. Manual follows the Bins slider (1–15). Sturges, Scott, and Freedman–Diaconis choose the number from the data.',
        'Normal, Mean, and Median add reference marks. Those checkboxes sit on the chart controls.',
        'Data Range limits which observations are drawn. The n= figure is how many remain. Reset restores the full range.'
      ],
      [
        'Bar height is the count in that interval. A tall middle and thinning tails is a common single peak. Two separated piles suggest more than one cluster.',
        'The summary cards report the sample: centre, spread, skewness, and kurtosis. Skewness describes asymmetry. Kurtosis describes tail weight.',
        'The normal curve, when it is on, is drawn from this sample’s mean and standard deviation.'
      ],
      [
        'A different binning method can make the same data look smoother or choppier. The bars are a display, not a test.',
        'The normal curve is a reference. It does not test normality.',
        'Narrowing Data Range hides values on this chart. It does not drop them from the analysis.'
      ]
    ),

    cdf: guide(
      'Cumulative distribution',
      'Shows the share of the sample at or below each value.',
      [
        'Drag the cursor along the axis to read the cumulative share at that value.',
        'Q1, Median, Q3, and 95th Percentile jump the cursor to those points. Average shows the mean and does not jump.',
        'Theoretical Distribution overlays a reference curve: Normal, Log-Normal, Exponential, or Uniform. None leaves only the sample curve.'
      ],
      [
        'The curve runs from near 0 to near 1. A steep rise is a dense region. A flat stretch is a gap.',
        'The readout is the proportion of this sample at or below the chosen value.',
        'A sample curve that tracks a theoretical curve is a visual resemblance, not a formal fit.'
      ],
      [
        'This is the empirical distribution of the current sample. It is not the probability of a new observation from a known population.',
        'Closeness to a theoretical curve is not a goodness-of-fit test. Use Tests for that.'
      ]
    ),

    percentile: guide(
      'Percentiles',
      'Looks up the sample value at a percentile you choose.',
      [
        'The method radios — SAS Method, Excel Inclusive, Excel Exclusive, and Nearest Rank — change how the percentile is interpolated. The names are on the control.',
        'Move the slider, type a percentile, or use P25, P50 (Median), P75, and P90.'
      ],
      [
        'The result is the value at that rank in this sample. P50 is the median for the method you selected.',
        'The methods can disagree a little, especially in a small sample or in the tails. Nearest Rank stays on an observed value. The others can fall between observations.'
      ],
      [
        'A percentile describes this sample. It is not a confidence interval and not a test against a reference value.',
        'Changing the method changes the reported cut. Say which method you used if the exact value matters.'
      ]
    ),

    kernel: guide(
      'Kernel density',
      'Draws a smoothed curve of the distribution that does not depend on histogram bins.',
      [
        'Kernel chooses the shape of the smoother. Gaussian is the usual starting point. Epanechnikov, Triangular, and Uniform are alternatives.',
        'Bandwidth is a multiplier of the automatic width. Lower is more wiggly. Higher is smoother. Reset returns the multiplier to 1.'
      ],
      [
        'Height is relative density, not a count. A wider spread lowers the curve.',
        'Extra bumps can be real clusters, or an artifact of a bandwidth that is too small.'
      ],
      [
        'The curve describes this sample. Bandwidth is a display choice, not a test.',
        'A smooth single peak does not prove normality.'
      ]
    ),

    boxplot: guide(
      'Box plot',
      'Summarises the middle half of the data, the whiskers, and points that sit outside the usual fences. A second chart shows the same summary with those points set aside.',
      [
        'Stay on Box plot for this summary. Outliers, in the view bar, opens the detection methods. The tab names are on the bar.',
        'Hover a chart for the five-number values and the count used in that chart.'
      ],
      [
        'The box runs from the first quartile to the third. The line inside is the median. Whiskers extend toward the most extreme values still inside the 1.5×IQR fences.',
        'Points beyond the fences are flagged by that rule. A long box, or a median that is not centred, shows spread and skew.',
        'The second chart repeats the box after the flagged points are set aside, so you can see how far they stretch the picture.'
      ],
      [
        'The fence is a convention. A flagged point is not automatically an error.',
        'Setting points aside on the second chart does not delete them from the data.',
        'One box plot does not compare groups. Use By Group for that.'
      ]
    ),

    'boxplot-outliers': guide(
      'Outliers',
      'Applies several unusual-value rules to the same variable, so you can see which points each rule flags.',
      [
        'IQR Method (1.5×IQR), Z-Score (|z| > 3), Grubbs Test, and MAD are the method buttons. The rule is written under each name.',
        'By Index and By Value reorder the chart. Show Details opens the list of flagged points. Those controls sit on the visualization panel.'
      ],
      [
        'The count is how many points the selected rule flags. The comparison beside it shows how the rules differ.',
        'IQR and MAD do not assume a normal shape. Z-Score and Grubbs lean on a more normal picture, so they can disagree with the robust rules.',
        'The same point can be flagged by one method and left alone by another.'
      ],
      [
        'A flag marks statistical unusualness. It is not a decision to delete the row.',
        'Grubbs looks for a single extreme. Several extremes can hide one another.',
        'These rules do not say why a value is extreme.'
      ]
    ),

    outliers: guide(
      'Outliers',
      'Applies several unusual-value rules to the same variable, so you can see which points each rule flags.',
      [
        'IQR Method (1.5×IQR), Z-Score (|z| > 3), Grubbs Test, and MAD are the method buttons. The rule is written under each name.',
        'By Index and By Value reorder the chart. Show Details opens the list of flagged points.'
      ],
      [
        'The count is how many points the selected rule flags.',
        'IQR and MAD do not assume a normal shape. Z-Score and Grubbs can disagree with them when the distribution is skewed or heavy-tailed.',
        'A point flagged by only one method is a softer signal than a point flagged by several.'
      ],
      [
        'A flag is not a reason, by itself, to drop the observation.',
        'Grubbs is aimed at one extreme value. A cluster of extremes can mask one another.',
        'The screen does not establish why the value occurred.'
      ]
    ),

    'by-group-stats': guide(
      'Grouped statistics',
      'Compares one numeric variable across the levels of a grouping column: centre, spread, shape, and the distribution picture.',
      [
        'Group by chooses the grouping column. Change reopens that choice. Level checkboxes and the minimum group size are in the same dialog.',
        'Kernel, Histograms, and Boxplots switch the chart. The line beside the toggle says what the current picture shows.',
        'Select a group in the table, or a histogram card, to zoom that group. Click again, press Esc, or click outside to close the zoom.'
      ],
      [
        'Each row is one level: count, mean, interval, spread, and shape. A small count makes the mean and the interval less stable.',
        'Kernel curves share one value scale. Histograms are one panel per group. Boxplots put the quartiles on one axis.',
        'Overlap does not mean the groups are the same, and a visible gap is not a significance test.'
      ],
      [
        'This view describes the groups. It does not test whether the means differ.',
        'Groups with very different counts are not equally precise.',
        'Filters and the minimum group size change who is included. Read the counts before comparing levels.'
      ]
    ),

    'by-group-boxplot': guide(
      'Grouped box plots',
      'Compares quartiles, medians, and whiskers for every included group on one shared scale.',
      [
        'This picture is the Boxplots choice on the Statistics chart toggle. Kernel and Histograms are the other two pictures.',
        'Group by and Change choose which levels are included. Those controls stay on the page.'
      ],
      [
        'Each box is one group. Compare the medians, the length of the boxes, and whether the whiskers overlap.',
        'A point beyond a whisker is outside that group’s 1.5×IQR fence.'
      ],
      [
        'The chart is descriptive. It does not test group differences.',
        'A fence is a display rule, not proof that a point is an error.'
      ]
    ),

    'by-group-normality': guide(
      'Group normality',
      'Asks, separately for each group, whether the distribution is close enough to normal for methods that assume it.',
      [
        'Group by and Change are the same grouping dialog as the other tabs.',
        'Alpha is fixed at 0.05 on this tab. Each column has the group, its count, a sparkline, a verdict, six tests, and NSI. The i beside NSI is the short definition of that index.'
      ],
      [
        'A pass means that test did not find enough evidence against normality at α = 0.05. It does not prove the group is normal.',
        'The verdict is the plain-language summary. When Shapiro–Wilk is marked unreliable because of ties, the verdict does not lean on it.',
        'NSI is a 0–100 score of how strongly the usable tests support approximate normality. Higher means stronger support. It is not a p-value.'
      ],
      [
        'A large group can fail over a tiny departure. A small group can pass while still looking irregular.',
        'One normal group and one non-normal group are not, by themselves, a test that the groups differ.',
        'NSI summarises the tests. It does not replace them.'
      ]
    ),

    'by-group-similarity': guide(
      'Similarity Profile',
      'Describes how alike the groups are in location, spread, and shape, on a 0–100 scale.',
      [
        'The gauge is the overall similarity across pairs. The chart toggle — Kernel, Histograms, Boxplots — matches the Statistics tab.',
        'Click a row in the pairwise table for that pair’s three-part profile. The i on this tab is the short definition of the score.'
      ],
      [
        '90–100 is Very similar, 75–89 Mostly similar, 50–74 Mixed similarity, and below 50 Substantially different.',
        'A mixed pair can be close on one part and far on another. Read location, spread, and shape, not only the overall number.',
        'Group labels include the level and its count. Overall is not one of the groups being compared.'
      ],
      [
        'The scores are descriptive. They are not a test that groups differ, and they are not a published coefficient.',
        'A similar shape is not evidence of a common cause.',
        'Very small groups make the profile unstable.'
      ]
    ),

    normality: guide(
      'Normality tests',
      'Runs six formal tests of whether this sample is consistent with a normal distribution, and summarises them with NSI.',
      [
        'The significance slider sets α for every test at once, from 0.01 to 0.15. Pass and fail counts update with it. The slider is on the summary strip.',
        'The i beside NSI defines that index. Each test card shows its statistic, p-value, and critical value.'
      ],
      [
        'Fail means the p-value is below the current α. The six tests are Shapiro–Wilk, Anderson–Darling, Kolmogorov–Smirnov, Cramér–von Mises, D’Agostino–Pearson, and Jarque–Bera. They emphasise different departures, so they can disagree.',
        'NSI combines the usable outcomes into a 0–100 score. Higher means stronger support for approximate normality.',
        'Pass and fail counts are a tally at the current α, not a measure of how large the departure is.'
      ],
      [
        'Failure is evidence against normality. It does not say how much that departure would matter for a later method.',
        'A large sample can fail on a trivial wiggle. A small sample can pass while still looking irregular.',
        'Agreement among the tests is not, by itself, permission for every later procedure. Check the assumption that procedure actually uses.'
      ]
    ),

    qqplot: guide(
      'PP / QQ plot',
      'Compares the sample with a reference distribution. QQ compares quantiles. PP compares cumulative probabilities.',
      [
        'QQ Plot and PP Plot are the two choices, with Quantile-Quantile and Probability-Probability written under the names.',
        'Distribution chooses the reference: Normal, Exponential, Uniform, Log-Normal, Gamma, or Weibull.'
      ],
      [
        'On the main chart, points near the diagonal support that reference. A bend in the tails, or a curve through the middle, is the usual sign of a poor match.',
        'The detrended plot is the leftover distance from that line. A cloud around zero, without a bend, is the calmer picture.',
        'QQ is more sensitive to the tails. PP is more sensitive to the middle of the distribution.'
      ],
      [
        'This is a visual check. It is not a p-value. Use Tests for the formal battery.',
        'A straight line in a small sample is only weak support for the reference.',
        'The reference is the distribution you selected. The plot does not choose it for you.'
      ]
    ),

    confidence: guide(
      'Confidence interval',
      'Gives a range of plausible values for one population summary, given this sample and the method you select.',
      [
        'Method is Classical or Bootstrap. Bootstrap shows Iterations and the refresh control beside it.',
        'Classical estimates the mean or the standard deviation. Bootstrap also unlocks the median and a percentile.',
        'Confidence Level offers 90%, 95%, and 99%. The slider fine-tunes α. Population Size is optional; leave it blank when you are not correcting for a finite population.'
      ],
      [
        'The large figure is the point estimate plus or minus the margin of error. LCL and UCL are the ends of the interval. The bar draws that same interval.',
        'A higher confidence level makes a wider interval. A larger sample, all else equal, makes it narrower.',
        'A classical mean interval uses the sample standard deviation and a t critical value. A bootstrap interval is built by resampling the sample.'
      ],
      [
        'The interval is about the summary you selected. It is not a prediction interval for the next observation.',
        'Under the usual classical reading, 95% describes the method across repeated samples. It is not a 95% probability that this particular interval contains the truth.',
        'An empty population size means no finite-population correction. Bootstrap results move a little from run to run, especially with few iterations.'
      ]
    ),

    hypothesis: guide(
      'One-sample test',
      'Tests whether a population mean or variance is consistent with a reference value you specify.',
      [
        'Set Method, Test Parameter, the null value, and the alternative (<, ≠, or >) on the configuration cards. Run the Test computes the result. Change the setup and run it again. That button stays on the page.',
        'Classical tests the mean or the variance. Bootstrap also unlocks the median and a percentile, and shows Iterations and Refresh.',
        'After a result, the α slider changes the decision threshold. Power Analysis and Visualize open those extras. Population size, if you enter one, is a finite-population correction.'
      ],
      [
        'H0 is the reference you typed, such as mean = 0. H1 is the alternative you selected.',
        'The decision rejects H0 when the p-value is below α. Otherwise this sample does not supply enough evidence against that null, at this α.',
        'The moments row is the sample, not the hypothesis. The test statistic, p-value, and effect size say how the sample sits relative to the reference.'
      ],
      [
        'A small p-value is not the size of the difference. A large p-value does not prove the null.',
        'The test applies to the parameter and the alternative you set. It does not compare groups.',
        'A classical mean test relies on the sampling model behind that formula. A small, badly non-normal sample weakens that reading. Bootstrap changes the calculation, not the way the sample was obtained.'
      ]
    )
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const moduleGuides = {
    independent: {
      'independent-results': guide(
        'Test results',
        'Compares a numeric measurement across separate groups and states whether the sample difference is large enough to reject a null of no difference.',
        [
          'Framework chooses the parametric mean comparison or the rank comparison. The primary test follows that choice.',
          'The alternative sets whether the difference is less than, not equal to, or greater than zero. Significance is the α slider.',
          'With more than two groups this page is the overall comparison, including Welch ANOVA. Pairwise comparisons are a separate view.'
        ],
        [
          'The mean difference and its interval are the result. The p-value says whether a difference of zero is surprising, not how large the gap is.',
          'Welch compares means and allows the groups to have different spreads. Mann–Whitney answers a separate question about ranks. Agreement between them is not a second test of the mean.',
          'A margin drawn on the interval is exploratory until an equivalence test is run.'
        ],
        [
          'A small p-value is not the size of the difference. Read the effect size for that.',
          'The groups are separate cases. The same person in both columns belongs in repeated measures.',
          'A significant difference is not a cause. The groups may differ for reasons that were not measured.'
        ]
      ),
      'independent-assumptions': guide(
        'Assumptions',
        'Shows whether the chosen test’s sampling model is a reasonable reading of these groups.',
        [
          'The first question is whether the same people or items appear in both groups. Row alignment is a reason to ask, not proof that the observations are paired.',
          'The Q–Q plots and the sample SDs describe each group. Welch compares means without requiring the spreads to match.'
        ],
        [
          'A curved Q–Q plot means a mean is a weaker one-number summary, especially in a small group. The rank comparison does not need that normal model.',
          'Unequal sample SDs do not block Welch. They also do not, by themselves, show that the groups differ.'
        ],
        [
          'These checks are about the test you are about to trust. They are not a finding about the group difference.',
          'A check that passes does not prove the groups were randomly assigned or that nothing else differs between them.'
        ]
      ),
      'independent-explore': guide(
        'Descriptives',
        'Summarises each group before the test: where it sits, how wide it is, and how its shape looks.',
        [
          'Each column is one group, in wide format. The table and charts use those columns.',
          'This view does not run the comparison. Test Results does that.'
        ],
        [
          'Compare centres, spreads, and sample sizes. A large gap in the means can still be a small effect if the spread is wide.',
          'Skew and extreme values tell you whether a mean is a fair one-number summary of that group.'
        ],
        [
          'Descriptives do not test a hypothesis. Two groups can look different here and still fail to reject the null.',
          'A categorical label in one column is not the layout this module reads. Each group needs its own numeric column.'
        ]
      ),
      'independent-effects': guide(
        'Effect sizes',
        'Puts the group difference on a common scale so “significant” is not confused with “large”.',
        [
          'Read the mean difference and its interval first. Hedges’ g puts that difference in sample-SD units. Cliff’s delta and the independent rank-biserial are the same rank comparison.',
          'With more than two groups, the effect belongs to the overall comparison, not to one pair.'
        ],
        [
          'A larger absolute effect means the groups are farther apart relative to their spread. The sign says which side is higher.',
          'The p-value on Test Results answers a different question: whether the sample gap is surprising under no difference.'
        ],
        [
          'Effect size is not a cause and not a practical importance you have not defined.',
          'A rank effect is not a difference of means. Do not describe it as one.'
        ]
      ),
      'independent-posthoc': guide(
        'Pairwise comparisons',
        'After an overall comparison of more than two groups, shows which pairs differ.',
        [
          'The table lists pair, statistic, raw p, adjusted p, and the estimate. The adjustment is the one selected for this analysis.',
          'This view appears for the multi-group results. Two groups do not need a follow-up pair list.'
        ],
        [
          'Use the adjusted p-value for the decision about a pair. The raw p-value ignores the fact that several pairs were examined.',
          'The estimate is the size of that pair’s difference. A small adjusted p is not that size.'
        ],
        [
          'An overall test can be significant while a particular pair is not, and the reverse can happen before adjustment.',
          'These pairs are still separate groups. They are not a repeated measurement of the same cases.'
        ]
      ),
      'independent-power': guide(
        'Power analysis',
        'Plans how many cases the between-groups comparison needs, or how much power the current group sizes have.',
        [
          'Read achieved power at the current group sizes, the N per group for the target marks, and the smallest effect the design can pick up.',
          'The curve shows power as the group size grows. The technical note holds the formula.'
        ],
        [
          'Power is the chance of detecting an effect of the size you assumed, if that effect is real. It is not the probability that the hypothesis is true.',
          'A study that already rejected the null is not “more true” because the observed power is high.'
        ],
        [
          'The calculation uses the effect and design you planned with. A different effect size moves the curve.',
          'This does not replace the test result. It answers a planning question.'
        ]
      )
    },
    dependent: {
      'dependent-results': guide(
        'Test results',
        'Tests change within the same cases: two occasions as a paired comparison, or more occasions as a repeated-measures comparison.',
        [
          'Each column is one occasion, and each row is one case. The test uses the complete cases for that comparison.',
          'Two occasions use a paired t-test or the Wilcoxon signed-rank check. Three or more use the overall repeated-measures comparison.',
          'Significance is the decision threshold on this page.'
        ],
        [
          'The result is about the change, not about whether two unrelated groups differ.',
          'A paired t-test is a mean change. The signed-rank test is a rank reading of the same paired differences.',
          'With three or more occasions, the overall result does not name which pair of occasions differs. Pairwise comparisons do that.'
        ],
        [
          'A small p-value is not the size of the change. Read the effect size for that.',
          'Independent groups, where each case is in only one column, belong in Independent Means.',
          'The test does not establish what caused the change.'
        ]
      ),
      'dependent-assumptions': guide(
        'Assumptions',
        'Checks the sampling model behind the paired or repeated-measures test.',
        [
          'For two occasions, read the checks on the paired differences.',
          'For three or more occasions, read sphericity and the related repeated-measures checks. The recommendation names the route the page is using.'
        ],
        [
          'A paired t-test reads the differences as a sample from a roughly symmetric population. A badly skewed set of differences weakens that reading.',
          'Sphericity is about the variances of the contrasts among occasions. When it fails, the page’s corrected or rank route is the safer overall test.'
        ],
        [
          'A passed check is not evidence that the occasions were assigned fairly or that the change has a cause.',
          'These diagnostics do not themselves estimate the size of the change.'
        ]
      ),
      'dependent-explore': guide(
        'Descriptives',
        'Summarises each occasion and how many cases have a complete pair or a complete series.',
        [
          'Read the occasion summaries and the count of cases that actually enter the test.',
          'Missing an occasion removes that case from a comparison that needs every occasion.'
        ],
        [
          'Compare the occasion means and spreads before reading the test. A visible shift can still be small relative to the person-to-person differences.',
          'The complete-case count is the sample the test uses, which can be smaller than the number of rows.'
        ],
        [
          'Descriptives do not test the change.',
          'Summaries of occasions are not a comparison of independent groups.'
        ]
      ),
      'dependent-trajectories': guide(
        'Trajectories',
        'Shows how the same cases move across occasions.',
        [
          'Each line is a case, or a summary of cases, across the occasion order on the page.',
          'Use this view to see the shape of change before the pairwise table.'
        ],
        [
          'A fan of lines in the same direction is a shared change. Lines that cross mean the average change hides different people.',
          'The average path can rise while many individual paths do not.'
        ],
        [
          'The picture is descriptive. The test of the overall change is on Test Results.',
          'Occasion order is the order in the data. The chart does not invent a time scale that was not measured.'
        ]
      ),
      'dependent-posthoc': guide(
        'Pairwise comparisons',
        'After an overall repeated-measures result with three or more occasions, shows which pairs of occasions differ.',
        [
          'Read the pair, the statistic, and the adjusted p-value. Holm is the correction this module uses for these follow-ups.',
          'Two occasions do not have this follow-up. Their comparison is the test result itself.'
        ],
        [
          'The adjusted p-value is the one to use for the pair. The raw p-value does not account for the number of pairs.',
          'A pair that differs does not say why the occasion changed.'
        ],
        [
          'An overall result can be significant while a particular pair is not.',
          'These are occasions on the same cases, not independent groups.'
        ]
      ),
      'dependent-effects': guide(
        'Effect sizes',
        'Describes how large the within-case change is, separate from the p-value.',
        [
          'Read the effect printed beside the paired result, or the repeated-measures effect when there are three or more occasions.',
          'Keep the effect next to the test you are reporting. A rank test and a mean test do not share one effect.'
        ],
        [
          'A larger absolute effect means the change is bigger relative to the variation of the differences.',
          'The p-value answers whether the sample change is surprising under no change. The effect answers how big it is.'
        ],
        [
          'Effect size is not a cause.',
          'On the two-occasion page, do not borrow a multi-occasion effect that this screen does not calculate.'
        ]
      ),
      'dependent-power': guide(
        'Power analysis',
        'Plans sample size for a repeated-measures design when that calculation is on the page.',
        [
          'On the three-or-more page, read achieved power, required N, and the power curve. Target marks are the usual 80, 90, and 95 percent chips.',
          'On the two-occasion page this planning calculation is not run. The test result is still on Test Results.'
        ],
        [
          'Power is the chance of detecting an assumed effect, not the probability that the result is true.',
          'A rank route may convert the rank effect into a planning effect. That conversion is an approximation for planning.'
        ],
        [
          'Do not read a two-occasion power number from this view. It is not calculated there.',
          'Planning power does not reinterpret the p-value of the test you already ran.'
        ]
      ),
      'dependent-report': guide(
        'APA report',
        'Writes the paired result in a report sentence you can check against the numbers on Test Results.',
        [
          'Read the sentence next to the statistic, the degrees of freedom or rank result, the p-value, and the effect.',
          'If you change the test or the data, come back and read the sentence again. It describes the current result.'
        ],
        [
          'The sentence should name the test that was run and the direction of the change. It should not add a cause.',
          'Numbers in the sentence should match the results view. If they do not, trust the results view.'
        ],
        [
          'The report is wording, not a new analysis.',
          'It does not cover a design this page did not test.'
        ]
      )
    },
    correlations: {
      'correlation-matrix': guide(
        'Pairwise matrix',
        'Shows the association between each pair of numeric variables.',
        [
          'Each cell is one pair. The method on the page is Pearson, Spearman, or Kendall, and it applies to the cells you are reading.',
          'Open a cell’s scatter when the page offers it, so a single number is not the only view of that pair.',
          'Scatters draws every pair at once. The number on each plot is that pair’s correlation.'
        ],
        [
          'The sign is the direction. The absolute value is the strength on that coefficient’s scale. The p-value is about that pair alone.',
          'Pearson describes a straight line and is pulled by outliers. Spearman and Kendall describe rank agreement.'
        ],
        [
          'Association is not causation.',
          'Many pairs inflate the chance of a small p-value. A starred cell is not a finding you selected in advance.',
          'A correlation does not say what happens after you hold other variables fixed. Partial r does that.'
        ]
      ),
      'correlation-network': guide(
        'Network graph',
        'Draws the stronger associations as links so clusters of variables and isolated variables are visible.',
        [
          'Use the threshold or display control on the page to decide which links are drawn. A higher bar shows fewer links.',
          'Select a node to see which variables it is tied to.'
        ],
        [
          'A link is an association that passed the display rule, not a path from a cause to an effect.',
          'Variables in a tight cluster move together. An isolated variable has no link at the current threshold.'
        ],
        [
          'Hiding a weak link does not mean the association is zero.',
          'The layout is a picture of the matrix. It does not test whether two clusters differ.'
        ]
      ),
      'partial-correlations': guide(
        'Partial correlation',
        'Shows the association between two variables after the linear contribution of the selected covariates is removed.',
        [
          'Choose the pair and the covariates to hold fixed. The partial coefficient uses that choice.',
          'Semi-partial, when the page shows it, removes the covariates from only one side of the pair.'
        ],
        [
          'Compare the partial value with the ordinary correlation. A link that shrinks was partly shared with the covariates.',
          'The sign is the remaining direction. The p-value is about that adjusted association.'
        ],
        [
          'Holding a variable fixed statistically is not an experiment that sets it.',
          'The adjustment is linear. A curved relationship can remain.',
          'This is not a regression coefficient and not a causal effect.'
        ]
      ),
      'taylor-diagram': guide(
        'Taylor diagram',
        'Compares each variable with a reference signal using correlation, spread, and the distance that combines them.',
        [
          'The reference is the benchmark on the page. Each other variable is a point.',
          'Read the radial correlation and the distance from the reference point together.'
        ],
        [
          'A point near the reference matches both the pattern and the spread. A point with a high correlation can still sit far away if its spread differs.',
          'The diagram does not show the sign of a bias in the mean. It is about pattern and variance.'
        ],
        [
          'Closeness to the reference is not a significance test.',
          'The reference has to be a meaningful benchmark. A convenient column is not automatically the truth.'
        ]
      ),
      'descriptive-stats': guide(
        'Descriptives',
        'Summarises each variable before you read the associations.',
        [
          'Read the mean, spread, shape, and missing count for every variable in the correlation set.',
          'A variable with almost no spread cannot show a stable correlation.'
        ],
        [
          'Skew and outliers warn you that Pearson will be fragile for that column.',
          'Missing values reduce the pairs that enter each correlation. Two cells in the matrix can rest on different numbers of cases.'
        ],
        [
          'These summaries are not correlations.',
          'Standardising for display does not change the correlation, which is already scale-free. It can change how a scatter looks.'
        ]
      ),
      reliability: guide(
        'Reliability',
        'Estimates how consistently the selected items hang together as one scale, using the correlations among them.',
        [
          'This view is reached from the correlation analysis. It uses the items in the current set.',
          'Read alpha, and omega when it is shown, next to the item set. Changing which items are included changes the coefficient.'
        ],
        [
          'A higher alpha means the items agree more, or that there are more of them. It is not a validity coefficient.',
          'A negative alpha is a warning about direction or about items that do not belong, not a strength score.'
        ],
        [
          'Internal consistency is not test-retest reliability and not agreement between raters.',
          'A high alpha does not mean the items measure one cause.'
        ]
      ),
      'correlation-by-group': guide(
        'Correlations by group',
        'Shows the same associations inside each level of a grouping variable.',
        [
          'Group by chooses the grouping column. Each level is a separate correlation summary.',
          'The table tab is the numeric comparison. Similarity Profile is the descriptive comparison of those patterns.'
        ],
        [
          'A coefficient in a group describes that group only. It is not a test that the correlation differs between groups.',
          'Small groups make a correlation noisy. Read the group size beside the coefficient.'
        ],
        [
          'This is not a test of interaction or of a difference between correlations.',
          'Overall, when it is shown, is the pooled set. It is not another group.'
        ]
      ),
      'correlation-by-group-similarity': guide(
        'Similarity profile',
        'Compares the pattern of correlations across groups with a 0–100 descriptive score.',
        [
          'Overall is omitted. Each row is a pair of groups.',
          'Click a row for the pattern, strength, and sign profile. 90–100 is very similar, 75–89 mostly similar, 50–74 mixed, and below 50 substantially different.'
        ],
        [
          'Pattern is whether the pairs of variables line up. Strength is whether the associations are similarly large. Sign is whether they point the same way.',
          'A mixed score means the groups agree on one of those pieces and not the others.'
        ],
        [
          'The score is not a p-value and not a published coefficient.',
          'It does not test whether two correlations are different.'
        ]
      )
    },
    contingency: {
      'contingency-analysis': guide(
        'Analysis',
        'Tests whether two categorical variables are associated, and shows the table the test is based on.',
        [
          'The row variable and the column variable define the table. A frequency column, when you used one, supplies the counts.',
          'Read the counts or percents together with the chi-square, the likelihood-ratio chi-square, and Cramér’s V. A 2×2 table can also show Fisher’s exact test.'
        ],
        [
          'The p-value is about association in this table, not about which cell caused it.',
          'Cramér’s V is the strength on a 0–1 scale. A small p-value with a tiny V is a weak association in a large sample.',
          'Expected counts tell you whether the chi-square approximation is comfortable. Sparse cells make it less so.'
        ],
        [
          'Association is not causation.',
          'Ordered categories are treated as names here. The test does not use their order.',
          'This is not a test that the association differs across a third grouping variable. By group is descriptive.'
        ]
      ),
      'contingency-diagnostics': guide(
        'Diagnostics and visualization',
        'Shows where the association sits in the table: which cells are larger than expected, and whether the picture matches the test.',
        [
          'Use the residual map and the chart controls on this view. The test statistic stays on Analysis.',
          'Expected-count flags mark cells that make the chi-square approximation thin.'
        ],
        [
          'A large adjusted residual means that cell has more, or fewer, cases than independence would suggest.',
          'A chart of percentages can look dramatic when a cell has very few cases. Read the count beside the percent.'
        ],
        [
          'A residual is not a separate significance test for that cell unless the page says so.',
          'The picture does not establish a cause for the association.'
        ]
      ),
      'contingency-twobytwo': guide(
        '2×2 measures',
        'Adds odds, risk, and their ratios for a table that has two rows and two columns.',
        [
          'This view is available when the table is 2×2. Larger tables stay on Analysis.',
          'Read the odds ratio, the risk ratio, and the risk difference next to the counts. The direction depends on which cell is the event and which column is the exposed group.'
        ],
        [
          'An odds ratio of 1, a risk ratio of 1, and a risk difference of 0 are the nulls of no association on those scales.',
          'The interval says how precise the ratio is. A wide interval is a thin table, even if the point estimate looks large.'
        ],
        [
          'These ratios describe the table. They do not by themselves say which variable was the exposure.',
          'Fisher’s exact test and the chi-square test can disagree in a very small table. Report the one you chose and the counts.'
        ]
      ),
      'contingency-by-group': guide(
        'Association by group',
        'Repeats the row-by-column association inside each level of a grouping variable.',
        [
          'Each row is one group, plus an Overall row for the included levels. χ², p, and Cramér’s V in a row describe that group only.',
          'The expected-count check flags a subgroup whose chi-square approximation is thin even when Overall is comfortable.'
        ],
        [
          'Evidence here is “association detected” or “not detected” inside that group, at the α on the page.',
          'Strength bars compare V descriptively. They are not a test that the association differs between groups.'
        ],
        [
          'This does not test an interaction and does not test homogeneity of the association.',
          'A group with few cases can fail to detect an association that Overall detects.'
        ]
      ),
      'contingency-by-group-table': guide(
        'Tables by group',
        'Lays the group tables side by side so the compositions can be compared.',
        [
          'Main columns chooses whether the grouping variable or the column variable is the outer header.',
          'Column % is the comparison default. Count, row %, and adjusted residuals are the other displays. Pills switch among the combined table, Overall, and one level.'
        ],
        [
          'Compare percentages when the groups differ in size. Compare counts when you need the actual number of cases.',
          'An adjusted residual highlights a cell that departs from independence inside that slice.'
        ],
        [
          'The combined table is descriptive. It is not a test that the associations differ.',
          'Combined comparison is hidden when there are too many levels to sit side by side.'
        ]
      ),
      'contingency-by-group-chart': guide(
        'Charts by group',
        'Draws the same composition, or the same residual pattern, once for each group.',
        [
          'Distribution is a 100% stacked bar for each group, on the same 0–100 scale.',
          'Association pattern is an adjusted-residual heat map on one shared colour scale.'
        ],
        [
          'Taller segments are a larger share of that bar, not a larger count, unless the chart says counts.',
          'A darker residual cell is a larger departure from independence. Compare colours across groups only because the scale is shared.'
        ],
        [
          'Neither chart tests whether the association differs between groups.',
          'A group with a handful of cases can produce an extreme percent or an extreme residual.'
        ]
      ),
      'contingency-by-group-similarity': guide(
        'Similarity profile',
        'Scores how alike the group association patterns are, from 0 to 100.',
        [
          'Overall is omitted. Pattern uses the aligned adjusted residuals, strength uses Cramér’s V, and sign agreement uses the residual signs.',
          'Click a pair for the three-part profile. 90–100 is very similar, 75–89 mostly similar, 50–74 mixed, and below 50 substantially different.'
        ],
        [
          'A high score means the tables have a similar shape of association, not that the groups have the same counts.',
          'A mixed score means the groups agree on one component and disagree on another.'
        ],
        [
          'The score is descriptive. It is not a homogeneity test or an interaction test.',
          'It is not a p-value.'
        ]
      )
    },
    anova: {
      'anova-overview': guide(
        'Summary',
        'States the ANOVA design and the headline conclusion before the tables.',
        [
          'Confirm the outcome, the factors, and whether the design is one-way, two-way, or repeated measures.',
          'The detailed test, the assumptions, and the pairwise table are separate views.'
        ],
        [
          'The headline is the omnibus decision: whether the means differ somewhere in the design. It does not name the pair.',
          'Read the sample size and the factor levels beside the conclusion. A thin cell makes the headline fragile.'
        ],
        [
          'A significant omnibus result is not a specific contrast and not a cause.',
          'Welch and Kruskal–Wallis, when they appear, are the one-way between-subjects checks. They are not computed for two-way or repeated measures.'
        ]
      ),
      'anova-results': guide(
        'Test results',
        'Shows the omnibus test for the design on this page.',
        [
          'Read the statistic, the degrees of freedom, the p-value, and the effect attached to that test.',
          'One-way between-subjects can also show Welch ANOVA and Kruskal–Wallis. Two-way and repeated-measures pages do not compute those substitutes.'
        ],
        [
          'The omnibus p-value asks whether the means are all equal, or whether the repeated-measures factor is flat. It does not say which levels differ.',
          'The effect size is the magnitude of that overall difference. A small p-value is not the magnitude.'
        ],
        [
          'Follow a significant omnibus result with the pairwise view when that view is on the page.',
          'A repeated-measures result is not a comparison of independent groups.'
        ]
      ),
      'anova-assumptions': guide(
        'Assumptions',
        'Checks the model behind the ANOVA you are reading.',
        [
          'Levene and the related spread checks apply to the one-way between-subjects design. Read the note on the page for two-way and repeated measures.',
          'Residual plots, when they are shown, are the place to see curvature, unequal spread, and odd points.'
        ],
        [
          'Unequal spread is a reason to prefer the Welch route on a one-way design. It does not create a Welch result on a two-way design.',
          'A failed check weakens the p-value from the model that needed the check. It is not itself the finding.'
        ],
        [
          'A passed check does not prove the groups were formed by random assignment.',
          'Do not treat a one-way diagnostic as if it had been computed for a factorial or repeated-measures model.'
        ]
      ),
      'anova-comparisons': guide(
        'Pairwise comparisons',
        'Shows which levels differ after the omnibus test.',
        [
          'Tukey HSD is the equal-variance pairwise follow-up. Read the pair, the estimate, and the adjusted p-value.',
          'Games–Howell, when it is present, is the one-way follow-up that does not assume equal variances.'
        ],
        [
          'Use the adjusted p-value. Several pairs were examined.',
          'The estimate is the difference for that pair. Report it with the decision.'
        ],
        [
          'A pairwise difference is not a cause.',
          'Tukey assumes the equal-variance model. If that model is a poor fit, do not lean on Tukey alone.'
        ]
      ),
      'anova-patterns': guide(
        'Descriptives',
        'Shows the level means, spreads, and, on a repeated-measures design, the trajectories.',
        [
          'Between-subjects designs show group summaries. Repeated measures with three or more occasions show the paths across conditions.',
          'Use this view to see the pattern. The test of that pattern is on Test Results.'
        ],
        [
          'Overlapping spreads can sit next to a significant test when the sample is large, and a wide visual gap can sit next to a non-significant test when the sample is small.',
          'On a trajectory plot, the average path can hide paths that go the other way.'
        ],
        [
          'The picture is not the omnibus test.',
          'Two-way interaction, when that view exists, is a separate plot. This summary does not replace it.'
        ]
      ),
      'anova-interactions': guide(
        'Interactions',
        'Shows whether the effect of one factor depends on the level of the other.',
        [
          'This plot is on the two-way design. Each line is one level of the second factor across the first factor.',
          'Read it with the interaction term in the test results, not instead of that term.'
        ],
        [
          'Parallel lines mean the factors add. Lines that diverge or cross mean the effect of one factor changes with the other.',
          'A crossing picture still needs the interaction test. A small sample can draw a cross that the test does not support.'
        ],
        [
          'The plot is not a causal diagram.',
          'Simple effects of one factor at one level of the other are not the omnibus interaction p-value.'
        ]
      ),
      'anova-power': guide(
        'Power and sample size',
        'Plans how many cases this ANOVA needs for an assumed effect, or how much power the current N has.',
        [
          'Read achieved power, the total N for the target marks, and the curve of power against sample size.',
          'The calculation uses Cohen’s f, or the η² converted to it, and the α on the page.'
        ],
        [
          'Power is the chance of detecting the assumed effect if it is real. It is not the probability that the hypothesis is true.',
          'The marks at 80, 90, and 95 percent are conventions. 80 percent is the usual planning target, not a property of the data.'
        ],
        [
          'This is a planning number. It does not replace the test you already ran.',
          'A different effect size or a different number of groups moves the required N.'
        ]
      )
    },
    regression: {
      'regression-results-overview': guide(
        'Model results — overview',
        'Says whether the linear model as a whole is worth reading, before the coefficient table.',
        [
          'Read the fit summary: R², adjusted R², the overall F test, RMSE, and the number of observations.',
          'The technical view holds the coefficient table. Diagnostics holds the residual checks.'
        ],
        [
          'R² is the share of outcome variance the model lines up with in this sample. Adjusted R² penalises extra predictors.',
          'The overall p-value asks whether the predictors together beat an intercept-only model. It does not say which predictor matters.'
        ],
        [
          'A significant model is not a cause and not a licence to predict outside the observed range.',
          'Rows are treated as independent. Clustered cases belong in a mixed model.'
        ]
      ),
      'regression-results-detail': guide(
        'Model results — technical',
        'Lists each coefficient with its standard error, t statistic, p-value, and interval.',
        [
          'Read one row at a time. A categorical predictor has one row per contrast against its reference level.',
          'VIF, when it is shown, is the collinearity warning for that predictor. ANOVA decomposition is the model’s sum of squares, not a second study.'
        ],
        [
          'The coefficient is the change in the outcome for a one-unit change in that predictor, with the others held fixed. The interval is the precision of that number.',
          'A small p-value means the estimate is far from zero relative to its standard error. It is not the size of the effect. Read the coefficient for the size.'
        ],
        [
          'Holding other predictors fixed is a statistical statement, not an experiment.',
          'A coefficient can look precise and still be unstable when predictors are entangled. Check VIF and the influence view.'
        ]
      ),
      'regression-pred-overview': guide(
        'Predictions — overview',
        'Shows how close the model’s fitted values are to the observed outcomes.',
        [
          'Read the observed-versus-predicted plot and the fit numbers on this view: RMSE, MAE, and R².',
          'Which predictor matters is the model-results and visualization views, not this one.'
        ],
        [
          'Points on the diagonal are outcomes the model reproduced. A curve in the cloud means the straight-line model is missing a bend.',
          'RMSE is the typical size of a miss, in the units of the outcome.'
        ],
        [
          'A tight fit in this sample is not accuracy on new cases.',
          'The plot does not show the unique contribution of one predictor.'
        ]
      ),
      'regression-pred-scenario': guide(
        'Predictions — scenario',
        'Builds one fitted value from predictor settings you choose.',
        [
          'Move the inputs, then read the point prediction. Reset to means returns the baseline case.',
          'The page shows a confidence interval for the mean response and a prediction interval for one new case. They are not the same band.'
        ],
        [
          'The prediction interval is wider because it includes the leftover scatter around the line.',
          'The number is the model’s fitted value at that setting. It is not a causal effect of moving the slider.'
        ],
        [
          'Settings outside the observed data are extrapolation. The interval does not repair that.',
          'Changing two inputs at once is not an interaction test unless an interaction term is in the model.'
        ]
      ),
      'regression-viz-partial': guide(
        'Predictor effects',
        'Shows the adjusted association of one predictor with the outcome, with the other predictors at their means.',
        [
          'Click a coefficient row, or use the predictor control, to change which effect is drawn.',
          'The strip above the chart is that predictor’s coefficient, standard error, t, p-value, and interval.'
        ],
        [
          'The line is the adjusted change in the fitted outcome. The band is a 95% confidence band for that mean line, not a prediction interval for one case.',
          'Scatter around the line is leftover variation. Global R² and RMSE live on Predictions, not here.'
        ],
        [
          'The slope is an adjusted association. It is not a unique percentage of variance. Unique contribution is the other visualization.',
          'A categorical predictor is a contrast against its reference level, not a one-unit slope on a continuous scale.'
        ]
      ),
      'regression-viz-unique': guide(
        'Unique contribution',
        'Shows the adjusted relationship as an added-variable plot: both axes are what remains after the other predictors.',
        [
          'Each small chart is one predictor. The x-axis is that predictor after the others. The y-axis is the outcome after the others.',
          'Read the sentence under the title for the adjusted association and its p-value. Hover a point for where that case sits relative to the line.'
        ],
        [
          'The slope of the line equals that predictor’s coefficient in the full model. The annotation is the slope and its standard error.',
          'A point to the right is higher on the predictor than the other predictors expected. A point above the line is higher on the outcome than this adjusted line expected.',
          'Negative axis values are differences from what was expected. They are not negative measurements.'
        ],
        [
          'This view does not display the percentage of variance uniquely explained by the predictor.',
          'It illustrates the adjusted relationship. It is not a test that the predictor causes the outcome.'
        ]
      ),
      'regression-diag-overview': guide(
        'Diagnostics — overview',
        'Gives the assumption verdict before the residual plots.',
        [
          'Read the verdict strip and the residual histogram with the normal overlay.',
          'The plot panels and the influence list are the next views when a verdict is uneasy.'
        ],
        [
          'The histogram is the leftover errors, not the outcome. A pile far from the overlay means the normal-error model is strained.',
          'The verdict is a reading of these checks. It is not a pass or fail for the scientific question.'
        ],
        [
          'A comfortable residual picture does not make the coefficients causal.',
          'Overview can look calm while one point on the influence view moves the fit.'
        ]
      ),
      'regression-diag-plots': guide(
        'Residual plots',
        'Shows the leftover pattern: tails, curvature, and spread against the fitted values.',
        [
          'Read the QQ plot, residuals versus fitted, scale-location, and leverage panels as a set.',
          'A single odd panel is a place to look. It is not, by itself, a deleted case.'
        ],
        [
          'QQ points along the line support a roughly normal residual. Curvature in residuals versus fitted means the straight model is missing shape.',
          'A fan shape means the spread changes with the fitted value. Leverage marks cases with unusual predictor combinations.'
        ],
        [
          'These plots do not report coefficients.',
          'A patterned residual weakens the intervals and p-values. It does not tell you the correct new model.'
        ]
      ),
      'regression-diag-influence': guide(
        'Influence',
        'Flags cases that pull the coefficients more than the rest.',
        [
          'Cook’s distance is drawn against the 0.5 and 1.0 guides. The table lists the flagged rows.',
          'A flag is a reason to look at the case. It is not a decision to delete it.'
        ],
        [
          'A tall bar is a case whose removal would move the fit. The table identifies that row.',
          'Leverage without a large residual may not move the coefficients. Cook’s distance combines the two ideas.'
        ],
        [
          'Thresholds are rules of thumb, not tests that the case is wrong.',
          'Deleting a flagged case and refitting is a new analysis. This view does not do that deletion for you.'
        ]
      ),
      'regression-ix-summary': guide(
        'Interactions — overview',
        'Says whether a moderator changes the slope of a focal predictor.',
        [
          'Read the interaction card and the simple-slopes summary for the term in the model.',
          'The plot of those slopes is the visualization view. The coefficient and the change in R² are the technical view.'
        ],
        [
          'A simple slope is the focal predictor’s effect at one level of the moderator. Different slopes are the interaction.',
          'The interaction p-value is about that product term, not about either predictor alone.'
        ],
        [
          'An interaction is not a cause and not a licence to tell a mechanism the design did not include.',
          'If the model has no interaction term, this view has nothing to interpret.'
        ]
      ),
      'regression-ix-viz': guide(
        'Interactions — visualization',
        'Draws the fitted lines at representative levels of the moderator.',
        [
          'The focal predictor is on the x-axis. Each line is one moderator level.',
          'Read the picture with the interaction test. The picture alone is not the p-value.'
        ],
        [
          'Lines that diverge or cross are a visible interaction. Parallel lines are a weak or absent interaction.',
          'The vertical gap at a chosen x is the fitted difference at that point, not a new contrast you tested.'
        ],
        [
          'The lines are fitted means from the model, not raw group means, unless the page says so.',
          'A cross outside the observed range is extrapolation.'
        ]
      ),
      'regression-ix-details': guide(
        'Interactions — technical',
        'Gives the interaction coefficient and how much fit it adds.',
        [
          'Read the coefficient, its interval, and the change in R² for the interaction term.',
          'Coding notes on the page say how the moderator and the focal predictor were centred or contrasted.'
        ],
        [
          'The coefficient is the change in the focal slope for a one-unit change in the moderator, on the coding the model used.',
          'Delta R² is the extra sample fit from adding the term. It can be small even when the slope change is interesting in the units of the outcome.'
        ],
        [
          'A significant product term is not a causal moderation.',
          'The coding changes the number. Do not compare the coefficient with a model that centred the variables differently.'
        ]
      ),
      'regression-ancova-results': guide(
        'ANCOVA — results',
        'Compares group means after a covariate is held fixed.',
        [
          'Read the model formula, the Type III table, and the key finding on this view.',
          'The adjusted means and the slope picture are on the visualization view. The slope check is on Assumptions.'
        ],
        [
          'A group row is the difference between levels after the covariate. It is not the raw mean difference.',
          'The covariate row is the association of that covariate with the outcome, not the group effect.'
        ],
        [
          'Adjustment is not an experiment that equalises the covariate.',
          'If the slopes are not parallel, the single adjusted difference is the wrong summary. Check Assumptions.'
        ]
      ),
      'regression-ancova-assumptions': guide(
        'ANCOVA — assumptions',
        'Checks whether one adjusted comparison is fair: parallel slopes, and residuals that are not patterned.',
        [
          'Read the homogeneity-of-slopes verdict first. Then the residual histogram, QQ plot, and residuals versus fitted.',
          'A failed slope check means the group difference depends on the covariate. The visualization shows that.'
        ],
        [
          'Parallel slopes support one adjusted mean difference. Diverging slopes mean you should describe the difference at stated values of the covariate.',
          'Residual checks are the same idea as in linear regression: shape, spread, and odd points.'
        ],
        [
          'A passed slope test in a small sample is weak comfort.',
          'These checks do not make the group difference causal.'
        ]
      ),
      'regression-ancova-viz': guide(
        'ANCOVA — visualization',
        'Shows the adjusted means and the group lines against the covariate.',
        [
          'Read the adjusted means, the adjusted difference when there are two levels, and the lines chart.',
          'Parallel lines support the ANCOVA summary. Diverging lines are a factor-by-covariate interaction.'
        ],
        [
          'The dot and its interval are the fitted mean at the covariate value the page used, not the raw group mean.',
          'The gap between lines can change along the covariate. Quote the gap at a stated value.'
        ],
        [
          'A picture of parallel lines is not a substitute for the slope test when the sample is small.',
          'The lines do not show individual cases unless the page draws them.'
        ]
      ),
      'regression-power': guide(
        'Power and sample size',
        'Plans how many observations the regression needs for an assumed R², or how much power the current N has.',
        [
          'Read achieved power for the observed or assumed R², the N for the target marks, and the smallest detectable R².',
          'The curve uses the number of predictors. Adding predictors moves the required N.'
        ],
        [
          'Power here is about the model’s overall association, converted to Cohen’s f². It is not the power of one coefficient unless the page says so.',
          'It is not the probability that the model is true.'
        ],
        [
          'Planning power does not reinterpret the coefficients.',
          'The calculation treats the rows as independent observations.'
        ]
      ),
      'regression-correlations': guide(
        'Correlations',
        'Shows the pairwise associations among the variables in the regression, before you read the adjusted coefficients.',
        [
          'Each cell is an ordinary correlation. The coefficient table is a different view.',
          'Use this to see which predictors already move together.'
        ],
        [
          'Two predictors that are strongly correlated will share credit in the regression. Their individual coefficients become harder to separate.',
          'A predictor can correlate with the outcome and still have a small adjusted coefficient, or the reverse, once the other predictors are in the model.'
        ],
        [
          'These correlations are not the regression coefficients and not VIFs, though they warn you when VIF may be high.',
          'Association among the predictors is not a causal path.'
        ]
      ),
      'regression-descriptive': guide(
        'Descriptives',
        'Summarises the outcome and the predictors that entered the model.',
        [
          'Read the mean, spread, shape, and missingness for each variable.',
          'The model uses the complete rows for the variables it needs. The count here can be larger than the model n.'
        ],
        [
          'A skewed outcome or a predictor with a few extreme values is a reason to look at the residual and influence views.',
          'Units on this table are the units of the coefficient. A one-unit change means one unit of the scale you see here.'
        ],
        [
          'Descriptives are not the fit and not the coefficients.',
          'A variable that was excluded from the model is not in this summary unless the page shows it.'
        ]
      ),
      'regression-by-group': guide(
        'Regression by group',
        'Fits the same specification separately inside each group and puts the coefficients side by side.',
        [
          'Overall is the pooled fit. Each other column is that group’s own ordinary least-squares fit.',
          'Read β, its interval, and its p-value inside the group. The similarity tab compares the coefficient patterns. It is not this table.'
        ],
        [
          'A sign that flips between groups is a stability flag, not an interaction test.',
          'R² and RMSE in a column describe that group’s fit only.'
        ],
        [
          'This is not a Chow test and not a test of a group-by-predictor interaction.',
          'A small group can produce a wild coefficient. Read the group size before the β.'
        ]
      ),
      'regression-by-group-similarity': guide(
        'Similarity profile',
        'Scores how alike the groups’ coefficient patterns are, from 0 to 100.',
        [
          'Overall is omitted, and the intercept is omitted. Click a pair for pattern, strength, and sign.',
          '90–100 is very similar, 75–89 mostly similar, 50–74 mixed, and below 50 substantially different.'
        ],
        [
          'Pattern is the alignment of the coefficient vectors. Strength compares their average size. Sign is whether they point the same way.',
          'A term that does not vary inside a group is skipped. That group’s score is not based on that term.'
        ],
        [
          'The score is not a Chow test, not an interaction test, and not a p-value.',
          'It is a descriptive comparison of the fitted coefficients.'
        ]
      )
    },
    logistic: {
      'logistic-model-results-overview': guide(
        'Model results — overview',
        'Summarises a model for a binary outcome: how the sample is split, whether the model beats a null, and the direction of each predictor on the odds.',
        [
          'Read Sample, model structure, overall fit, and the pseudo-R² figures before the coefficient table.',
          'AUC, the ROC curve, and sensitivity at a threshold live on Predictive performance, not here.'
        ],
        [
          'The likelihood-ratio test asks whether the predictors together improve on a model with no predictors. Pseudo-R² is not linear-regression R².',
          'An odds ratio above 1 means higher odds of the event as that predictor increases, for a numeric predictor, or versus the reference level, for a category. The p-value is about that coefficient.'
        ],
        [
          'Associations do not establish causation.',
          'This page does not print a trust score or a readiness rating.',
          'Separation can send a coefficient toward a huge odds ratio. Treat an enormous estimate as a warning, not as a precise effect.'
        ]
      ),
      'logistic-model-results-technical': guide(
        'Coefficients and statistics',
        'Shows the model on the log-odds scale, with odds ratios, intervals, and the omnibus tests.',
        [
          'Read beta, the odds ratio and its interval, the Wald statistic, and the p-value. The model equation is the same fit written out.',
          'The likelihood-ratio, Wald, and score omnibus statistics are three readings of the whole model. They can differ in a small or separated sample.'
        ],
        [
          'Beta is a change in log odds. The odds ratio is e to that power. A interval for the odds ratio that crosses 1 agrees with a p-value that does not reject zero for beta.',
          'The reference category is the level missing from a set of category rows. Those rows are contrasts against it.'
        ],
        [
          'Pseudo-R² values on the overview are not repeated as linear R² here.',
          'Do not rank predictors by the size of beta when they are in different units.'
        ]
      ),
      'logistic-predictive-performance-overview': guide(
        'Predictive performance — overview',
        'Scores how the fitted probabilities classify cases at the current cutoff.',
        [
          'Read AUC, sensitivity, specificity, precision, accuracy, and F1, plus the confusion-matrix counts.',
          'The threshold on this summary is the cutoff those counts used. The ROC view moves that cutoff.'
        ],
        [
          'Sensitivity is the share of events caught. Specificity is the share of non-events left alone. Precision is the share of positive calls that were events.',
          'AUC summarises discrimination across cutoffs. The counts summarise one cutoff.'
        ],
        [
          'A high accuracy can hide a model that never finds the rare event. Read sensitivity and precision with the event rate.',
          'These figures describe this sample’s fitted values. They are not accuracy on future cases unless you held cases out.'
        ]
      ),
      'logistic-predictive-performance-roc-thresholds': guide(
        'ROC and thresholds',
        'Plots sensitivity against the false-positive rate across cutoffs, and lets you pick an operating point.',
        [
          'The curve is every cutoff. The slider reads sensitivity, specificity, and Youden’s J at the cutoff you choose.',
          'AUC is the area under that curve. 0.5 is chance discrimination. 1 is perfect separation in this sample.'
        ],
        [
          'A curve that bows toward the top-left discriminates better than a diagonal.',
          'Moving the slider trades misses against false alarms. There is no universally correct cutoff. It depends on which mistake is costlier.'
        ],
        [
          'AUC is not the accuracy at the slider’s cutoff.',
          'A pretty ROC in the same sample that fitted the model is an optimistic description, not a validation.'
        ]
      ),
      'logistic-predictive-performance-calibration': guide(
        'Calibration',
        'Checks whether a predicted probability matches the observed event rate.',
        [
          'Cases are binned by predicted probability. Each point is that bin’s observed event rate against its predicted rate.',
          'The dashed diagonal is perfect calibration.'
        ],
        [
          'Points above the diagonal are under-predicted events. Points below are over-predicted events.',
          'Read the curve of the points, not a single bin. A small bin jumps around.'
        ],
        [
          'Good discrimination and good calibration are different. A model can rank cases well and still be over-confident.',
          'This is not the Hosmer–Lemeshow test. The page shows the plot.'
        ]
      ),
      'logistic-probabilities-overview': guide(
        'Predicted probabilities',
        'Shows the spread of fitted probabilities, optionally split by the observed outcome.',
        [
          'Read the distribution of predicted probabilities for the fitted model.',
          'A split by the observed outcome shows whether events and non-events landed in different parts of the scale.'
        ],
        [
          'Two piles, one near 0 and one near 1, mean the model separates the classes. A pile around 0.5 means many cases are uncertain.',
          'Probabilities piled at the extremes can be separation: the model is nearly certain because a predictor almost determines the outcome.'
        ],
        [
          'The histogram is not the ROC and not a calibration plot.',
          'A separated fit can look decisive and still have a coefficient that is not estimated precisely.'
        ]
      ),
      'logistic-probabilities-scenario-engine': guide(
        'Scenario engine',
        'Computes the predicted probability for one case whose predictors you set.',
        [
          'Change the inputs and read the probability, the odds, and the log odds for that synthetic case.',
          'The values use the fitted model. They do not refit it.'
        ],
        [
          'The probability is the model’s fitted chance of the event at that setting. The odds are that probability divided by one minus it.',
          'Moving one input shows that predictor’s association on the probability scale, which is not a constant odds ratio along the whole range.'
        ],
        [
          'This is not a causal effect of the slider.',
          'Settings outside the observed data are extrapolation.'
        ]
      ),
      'logistic-probabilities-predictions': guide(
        'Predictions',
        'Lists the fitted class next to the observed class for the cases in the model.',
        [
          'Each row is a case, with the predicted probability and the class at the current cutoff.',
          'Use this to see individual agreements and misses. The counts of those misses are on Predictive performance.'
        ],
        [
          'A case called positive has a probability at or above the cutoff. The observed column is what happened, not what the model prefers.',
          'Cases near the cutoff flip class when the threshold moves. Cases near 0 or 1 do not.'
        ],
        [
          'A correct row is not a validation on new data.',
          'Do not read a single surprising row as influence. The influence view is for that.'
        ]
      ),
      'logistic-interactions-overview': guide(
        'Interactions — overview',
        'Says whether a moderator changes a predictor’s association with the log odds of the event.',
        [
          'Read the card for each predictor-by-moderator term that is in the model.',
          'The curves are on the visualization view. The coefficient is on the technical view.'
        ],
        [
          'A simple slope here is the focal predictor’s log-odds effect at one moderator level.',
          'The interaction test is about that product term. It is not the test of either predictor alone.'
        ],
        [
          'If you did not add an interaction term, this view stays empty. That is not a finding that there is no interaction.',
          'A log-odds interaction is not automatically large on the probability scale. Look at the plot.'
        ]
      ),
      'logistic-interactions-visualization': guide(
        'Interactions — visualization',
        'Draws predicted probability curves at representative moderator levels.',
        [
          'The focal predictor is on the x-axis. Each curve is one moderator level.',
          'Read the spread on the probability scale. Parallel curves are a weak interaction. Curves that fan out are a stronger one.'
        ],
        [
          'Probability curves can look bent even when the log-odds model is linear, because the probability scale compresses near 0 and 1.',
          'A gap between curves is a difference in fitted probability at that x, not a new tested contrast.'
        ],
        [
          'The curves are model fits, not raw rates, unless the page says otherwise.',
          'They do not establish a causal interaction.'
        ]
      ),
      'logistic-interactions-technical': guide(
        'Interactions — technical',
        'Gives the interaction coefficient on the log-odds scale and the test of that term.',
        [
          'Read the coefficient, its interval, and the likelihood-ratio comparison for the interaction.',
          'Coding notes say how the two predictors were represented.'
        ],
        [
          'The coefficient is the change in the focal log-odds slope for a one-unit change in the moderator, on that coding.',
          'The likelihood-ratio test compares the model with and without the term. It is the preferred whole-term check when several coding columns make one interaction.'
        ],
        [
          'Do not interpret the product coefficient as a change in probability.',
          'A significant interaction is not a mechanism.'
        ]
      ),
      'logistic-diagnostics-overview': guide(
        'Diagnostics — overview',
        'Flags separation, sparse patterns, and cases that may be pulling the fit.',
        [
          'Read the checks table and any warning above it. Residual and influence details are the other two views.',
          'Use the computed notes for whether influence was actually calculated.'
        ],
        [
          'A separation warning means a predictor nearly determines the outcome. Coefficients then grow and intervals become untrustworthy.',
          'Sparse cells mean a category combination has very few events. The odds ratio for that contrast is thin.'
        ],
        [
          'The page does not print a trust or readiness score.',
          'A quiet overview does not prove the model is calibrated. Calibration is a different view.'
        ]
      ),
      'logistic-diagnostics-residuals': guide(
        'Residuals',
        'Shows deviance and Pearson residuals from the binary fit.',
        [
          'Scan the residual display, including any split by predicted-probability bins.',
          'A single large residual is a case to look up. A pattern across bins is a model problem.'
        ],
        [
          'Curvature or a run of large residuals at one end suggests the linear log-odds model is missing shape.',
          'Binary residuals are awkward. A case with probability 0.9 that was a non-event is a large surprise even when the model is reasonable.'
        ],
        [
          'Residual size is not Cook’s distance. Influence is the next view.',
          'Do not delete a large residual from this picture alone.'
        ]
      ),
      'logistic-diagnostics-influence': guide(
        'Influence',
        'Shows which cases move the logistic coefficients.',
        [
          'Read Cook’s distance, leverage, and DFBETAS against the guides on the page, and the flagged rows in the table.',
          'A flag marks a case to inspect. It does not remove the case.'
        ],
        [
          'Leverage is an unusual predictor pattern. Cook’s distance is that unusualness combined with a surprising outcome.',
          'DFBETAS says which coefficient moves when that case is set aside in the diagnostic, not a refit you have already accepted.'
        ],
        [
          'Rules of thumb are not tests that the case is an error.',
          'Influence in the fitting sample is not a statement about future cases.'
        ]
      ),
      'logistic-power': guide(
        'Power and sample size',
        'Plans whether the binary model has enough events, using the method selected on the page.',
        [
          'Events-per-predictor is an adequacy check: events divided by predictors. It does not report a power percentage.',
          'Power for one predictor uses the stated prevalence, exposure, odds ratio, and α. The multiple-predictor option, when you run it, is a simulation and moves a little from run to run.'
        ],
        [
          'About 10 to 15 events per predictor is a stability rule of thumb, not a hypothesis test.',
          'A power figure from the one-predictor method is the chance of detecting that assumed odds ratio. It is not the probability the predictor matters in this sample.'
        ],
        [
          'The events-per-predictor card is not statistical power. Do not quote it as a percent.',
          'Planning numbers do not replace the fitted coefficients.'
        ]
      ),
      'logistic-correlations': guide(
        'Correlations',
        'A quick look at associations among the variables before the adjusted logistic model.',
        [
          'Read the pairwise screen as a sketch. The odds ratios are on Model results.',
          'A binary outcome makes some of these associations awkward. Use them to spot predictors that move together.'
        ],
        [
          'Predictors that are strongly tied will share the adjusted association. Their separate odds ratios get less precise.',
          'A simple association with the outcome can shrink once the other predictors are in the model.'
        ],
        [
          'This screen is not the logistic model and not a test of the odds ratios.',
          'Correlation with a 0/1 outcome is not an odds ratio.'
        ]
      ),
      'logistic-descriptives': guide(
        'Descriptives',
        'Summarises the outcome and the predictors that entered the logistic model.',
        [
          'Read the event count, the event rate, and the predictor summaries.',
          'The model n is the complete rows. It can be smaller than the number of rows in the source.'
        ],
        [
          'A rare event means every odds ratio is estimated from few events. Check events per predictor on the power view.',
          'A categorical predictor with a nearly empty level is a sparse cell waiting to happen.'
        ],
        [
          'Descriptives do not estimate the model.',
          'The event coding is the page’s 0/1 coding. Confirm which level is the event before you read an odds ratio.'
        ]
      )
    },
    factor: {
      'factor-suitability': guide(
        'Suitability',
        'Asks whether the correlations are strong and patterned enough for a factor analysis.',
        [
          'Read the verdict, KMO, Bartlett’s test, and the per-item MSA bars.',
          'The refinement note suggests items that are weakly related to the others. Removing an item is a new analysis. This view does not remove it from the worksheet.'
        ],
        [
          'A higher KMO means the variables share enough correlation to factor. Bartlett asks whether the correlation matrix differs from an identity matrix.',
          'A low MSA for one item means that item does not belong in the shared pattern, even if the overall KMO is acceptable.'
        ],
        [
          'Suitable correlations are not evidence of a particular number of factors and not evidence of a cause.',
          'A significant Bartlett test is easy in a large sample. It does not mean the factor solution will be clear.'
        ]
      ),
      'factor-extraction': guide(
        'Extraction',
        'Chooses how many factors to keep and shows what they account for.',
        [
          'Read the eigenvalues, the variance explained, and the communalities. Extraction on this module is principal components or principal axis factoring, as set in the analysis.',
          'Kaiser’s rule keeps eigenvalues at least 1. The scree is the plot of those eigenvalues. They can disagree. The choice is yours.'
        ],
        [
          'A communality is the share of an item’s variance the factors account for. A low communality is an item the solution barely uses.',
          'Variance explained is in the extracted solution, before you interpret the rotated pattern.'
        ],
        [
          'Extracting more factors always accounts for more variance. That is not a reason to keep them.',
          'This is exploratory. It does not confirm a structure you specified in advance.'
        ]
      ),
      'factor-rotation': guide(
        'Structure and rotation',
        'Rotates the extracted factors so the loadings are easier to read.',
        [
          'Rotation is Varimax, Promax, Oblimin, or none, as set for this analysis. Varimax keeps the factors uncorrelated. Promax and Oblimin allow correlation.',
          'Read the loading matrix. A simple structure has each item loading strongly on one factor and weakly on the others.'
        ],
        [
          'The loading is the association between the item and the factor after rotation. The sign is arbitrary unless you have a reason to flip the factor.',
          'If an oblique rotation was used, the factor correlations are part of the solution. Do not describe those factors as uncorrelated.'
        ],
        [
          'Rotation does not change the number of factors or the overall fit of the extracted space. It changes the view.',
          'A clean loading pattern is not proof that the factors are real causes.'
        ]
      ),
      'factor-interpretation': guide(
        'Interpretation',
        'Names the factors from the loading pattern and lists items that sit on more than one factor.',
        [
          'Use the loading table on Structure and rotation as the source. This view collects the naming notes and the cross-loadings.',
          'A cross-loading is an item that is not a clean member of one factor. It is a naming problem, not a second result.'
        ],
        [
          'A factor name is a label for the items that load on it. The name is not evidence beyond those items.',
          'Cross-loading items make a name less sharp. Say so rather than forcing the item into one factor.'
        ],
        [
          'Naming is a reading of the pattern. It is not a confirmatory test.',
          'Do not treat an AI naming note, if one is shown, as a new extraction.'
        ]
      ),
      'factor-diagnostics': guide(
        'Diagnostics',
        'Checks residuals, odd loadings, and items that do not fit the solution.',
        [
          'Read residual correlations, fit notes, and the list of problematic items on this view.',
          'Go back to extraction or suitability if the residuals say the solution is missing a factor or including a stray item.'
        ],
        [
          'A large residual correlation means two items still agree after the factors are accounted for.',
          'An item with a low communality and no strong loading is not carrying a factor.'
        ],
        [
          'Diagnostics do not confirm a pre-specified structure.',
          'A tidy residual matrix in a very small sample is not strong evidence.'
        ]
      ),
      'factor-scores': guide(
        'Factor scores',
        'Gives each case a score on the extracted factors.',
        [
          'The scoring method is the one set for the analysis: regression, Bartlett, or Anderson–Rubin. Anderson–Rubin scores are uncorrelated when that method is used.',
          'Read the distribution and the score table. Export, when you use it, writes the scores for this analysis. It does not change the items.'
        ],
        [
          'A high score means the case looks like the items that define that factor, on the scoring method’s scale.',
          'Score correlations should match the rotation. Uncorrelated scores from an oblique rotation are a property of Anderson–Rubin, not of the factors themselves.'
        ],
        [
          'Scores are estimates. They are not observed measurements.',
          'They inherit a bad extraction. Fix the solution before you interpret a case’s score.'
        ]
      )
    },
    pca: {
      'pca-summary': guide(
        'Summary',
        'Shows how much of the variables’ variance a few components capture.',
        [
          'Read the sample size, the variables, and the share of variance in the retained components.',
          'Components, loadings, and scores are the following views.'
        ],
        [
          'A component is a direction in the variables, not a latent cause. The first component is the direction with the most variance.',
          'The cumulative percent is how much of the total variance those components keep. What “enough” means depends on what you will use the scores for.'
        ],
        [
          'This is not principal-axis factor analysis and not a model of hidden causes.',
          'Variables on very different scales can dominate the first component if they were not standardised. Check how the analysis was scaled.'
        ]
      ),
      'pca-components': guide(
        'Components',
        'Helps you decide how many components to keep.',
        [
          'Read the scree plot and the eigenvalues. Kaiser’s rule keeps components with eigenvalues at least 1.',
          'The percent beside a component is its share of the total variance.'
        ],
        [
          'A sharp elbow in the scree is a place people stop. A slow decline means there is no obvious cut.',
          'Kaiser’s rule and the elbow can disagree. The page shows both so you can choose.'
        ],
        [
          'Keeping more components always retains more variance. That is not a scientific result.',
          'The cut does not test a hypothesis about the number of components.'
        ]
      ),
      'pca-interpretation': guide(
        'Loadings and rotation',
        'Shows which variables define each component, before or after rotation.',
        [
          'Rotation is often none for PCA. If a rotation is on, the loadings are the rotated ones and the page names the method.',
          'Read the loading matrix and the communalities. A variable’s communality is the share of its variance the retained components keep.'
        ],
        [
          'A large loading, positive or negative, means that variable pulls that component. The sign is a direction, not a value judgment.',
          'Simple structure means each variable loads on one component. PCA does not always provide it, especially without rotation.'
        ],
        [
          'A loading is not a cause and not a factor loading from a factor analysis.',
          'Rotating components spreads the variance across them. Do not compare a rotated loading with the unrotated variance shares as if nothing changed.'
        ]
      ),
      'pca-scores': guide(
        'Scores',
        'Places each case in the component space.',
        [
          'Read the score plot or biplot and the score table together.',
          'In a biplot, variable directions and case positions are drawn in the same plane. A case far along a variable’s arrow is high on that combination.'
        ],
        [
          'Clusters of cases are groups with similar profiles on the retained components. A case far from the cloud is unusual in this plane.',
          'The axis percent is the variance that component keeps. A plot of component 1 against 2 ignores the rest.'
        ],
        [
          'Distance on the plot is distance in the retained space, not distance on the original variables, unless the page says so.',
          'A pattern in the scores is descriptive. It is not a cluster test and not a significance test.'
        ]
      ),
      'pca-diagnostics': guide(
        'Diagnostics',
        'Flags cases that sit far from the centre of the retained component space.',
        [
          'Read the distance plot. A case with a large distance is poorly represented by the components you kept, or it is an outlier in them.',
          'Go back to Components if many cases are far out. You may be keeping too little of the space.'
        ],
        [
          'Distance here is in the component space, not a test statistic with a p-value, unless the page prints one.',
          'One far case can be a data error or a real unusual profile. The plot does not decide which.'
        ],
        [
          'A small distance does not mean the case is typical on variables the components discarded.',
          'This is not a residual from a regression.'
        ]
      )
    },
    reliability: {
      'reliability-overview': guide(
        'Overview',
        'Estimates how consistently the selected items form one scale.',
        [
          'Read Cronbach’s alpha and, when it is shown, its interval. McDonald’s omega, when it is shown, comes from the principal-axis loadings.',
          'Reverse coding on this page applies to the analysis only. It does not rewrite the worksheet.'
        ],
        [
          'A higher alpha means the items agree more. Alpha also rises just because there are more items.',
          'Omega is a different consistency estimate. If the two disagree, the items may not be one simple scale. Look at Scale structure.'
        ],
        [
          'Alpha is not validity and not test-retest reliability.',
          'A negative alpha is a direction or membership warning, not a score to report as consistency.',
          'Two items can produce a number. Three or more is a more serious scale. The page will still compute from two.'
        ]
      ),
      'reliability-items': guide(
        'Item diagnostics',
        'Shows what happens to the scale if each item is removed, and which items disagree.',
        [
          'Read the item-total association and alpha-if-deleted for each item.',
          'An item marked for reverse coding is scored in the opposite direction for this analysis only.'
        ],
        [
          'Alpha-if-deleted higher than the current alpha means the scale agrees more without that item.',
          'A weak or negative item-total association means the item does not follow the others.'
        ],
        [
          'Dropping an item because alpha rises is a new scale. It is not proof the item is bad in the world.',
          'Item diagnostics do not show whether the items measure the intended construct.'
        ]
      ),
      'reliability-matrix': guide(
        'Inter-item matrix',
        'Shows the correlations among the items in the scale.',
        [
          'Each cell is a pair of items. The diagonal is the item with itself.',
          'Use the matrix to see pockets of items that agree with each other and not with the rest.'
        ],
        [
          'Positive correlations are items that move together, after any reverse coding this analysis applied.',
          'A block of strong correlations inside a larger weak matrix suggests more than one cluster of items.'
        ],
        [
          'The matrix is not alpha. Alpha is the summary. The matrix is the reason the summary is high or low.',
          'A high correlation between two items can be redundant wording, not evidence of a broad construct.'
        ]
      ),
      'reliability-structure': guide(
        'Scale structure',
        'Asks whether one dimension is a fair summary of the items.',
        [
          'Read the eigenvalues or the scree for the items, and the loadings when they are shown.',
          'Omega on the overview uses a principal-axis solution. This view is where that structure is visible.'
        ],
        [
          'A dominant first eigenvalue and a flat rest support a single scale. A second large eigenvalue means alpha is averaging across more than one dimension.',
          'Loadings are associations with that component or factor. They are not the item-total correlations from Item diagnostics.'
        ],
        [
          'This is not a full factor analysis. Suitability, rotation, and confirmatory tests are not this page.',
          'One plausible dimension is not validity.'
        ]
      ),
      'reliability-by-group': guide(
        'Reliability by group',
        'Repeats the consistency estimate inside each level of a grouping variable.',
        [
          'Each group uses the same items. Read alpha, and omega when it is shown, beside the group size.',
          'A group with few cases produces an unstable coefficient.'
        ],
        [
          'Compare the coefficients descriptively. A lower alpha in one group means the items agree less there.',
          'This is not a test that the alphas differ.'
        ],
        [
          'A difference in alpha can come from a difference in spread, not from a different construct.',
          'Reverse coding is still only for this analysis.'
        ]
      )
    },
    cluster: {
      'cluster-km-overview': guide(
        'K-means — overview',
        'Summarises a k-means partition: how many clusters, how tight they are, and whether the sizes are usable.',
        [
          'Read the settings first: variables, cases, distance, k, and whether the variables were standardised.',
          'Then read the quality panel: convergence, iterations, within-cluster sum of squares, explained variance, and the average silhouette.'
        ],
        [
          'A higher average silhouette means cases sit closer to their own cluster than to the next one. Around 0.5 is a solid structure. Below about 0.25 is weak.',
          'Explained variance is how much of the spread sits between clusters. It rises with k even when the extra clusters are not meaningful.'
        ],
        [
          'There is no single correct k. The verdict is a reading of these numbers, not a test.',
          'K-means can stop at a local solution. A different start can move the clusters.',
          'Standardising, when it is on, stops a large-scale variable from dominating the distance.'
        ]
      ),
      'cluster-km-sizes': guide(
        'K-means — sizes',
        'Shows how many cases fell into each cluster and which case is in which cluster.',
        [
          'Read the size bars and the assignment table.',
          'Use the table to trace a case back to the worksheet.'
        ],
        [
          'A huge cluster next to a tiny one may be one real group plus a handful of outliers, or a k that is too large.',
          'Similar sizes are not, by themselves, better clusters. They are easier to describe.'
        ],
        [
          'Size is not separation. Two large clusters can still overlap. The map shows that.',
          'Assignments are from the current solution. They are not true labels.'
        ]
      ),
      'cluster-km-profiles': guide(
        'K-means — profiles',
        'Shows what each cluster is high or low on.',
        [
          'The line chart has one line per cluster across the variables. The table under it is the same centres.',
          'Standardised means are z-scores, so variables can be compared. Raw means are in the original units. By separation puts the variables that differ most between clusters first.'
        ],
        [
          'A variable where the lines sit far apart is one that distinguishes the clusters. A variable where they pile up does not.',
          'Read a high standardised mean as “above the sample average on that variable,” not as a high raw score.'
        ],
        [
          'The profile is a description of the centres. It is not a test of mean differences.',
          'Raw means on different units cannot be compared by eye. Switch to standardised for that comparison.'
        ]
      ),
      'cluster-km-map': guide(
        'K-means — separation and map',
        'Shows whether the clusters actually sit apart, in a plane and as distances between centres.',
        [
          'The map plots each case, coloured by cluster, with a marker at the centre. PCA mode uses the first two components of the analysis matrix. Variables mode uses two original variables.',
          'The heatmap below is the distance between centres. Deeper blue is farther apart. Drag to zoom. Click a legend entry to isolate a cluster.'
        ],
        [
          'A pale heatmap cell is a pair of centres that are close. Look at that pair on the map to see whether their cases intermingle.',
          'The axis percents in PCA mode are shares of variance. A dominant first axis often means the variables were not on a common scale.'
        ],
        [
          'Overlap on the map can be real overlap or a side effect of looking at only two dimensions.',
          'Centre trails, when they are on, show the algorithm’s path. They are not a time trend in the data.'
        ]
      ),
      'cluster-km-diagnostics': guide(
        'K-means — diagnostics',
        'Shows whether the algorithm settled and how strong the structure is.',
        [
          'Read the converged flag, the iteration count, and the within-cluster sum of squares path.',
          'The silhouette table gives a plain-language reading for each cluster.'
        ],
        [
          'A curve that has flattened, and a reassignment count that has reached zero, is a settled solution.',
          'A curve that is still falling at the last iteration explains a not-converged flag. The clusters may still move.'
        ],
        [
          'Convergence means the algorithm stopped, not that k is right.',
          'Silhouette and explained variance can disagree. A high explained variance with a poor silhouette is often one dominant variable or a forced extra cluster.'
        ]
      ),
      'cluster-hi-overview': guide(
        'Hierarchical — overview',
        'Summarises the cut of a hierarchical clustering at the chosen number of clusters.',
        [
          'Read the linkage, the distance, k, and whether variables were standardised.',
          'Then read explained variance, the average silhouette, and the cluster-size summary.'
        ],
        [
          'The solution is the groups formed by cutting the tree at this k. A different k is a different cut of the same tree, until you change the linkage.',
          'The silhouette and the size balance are readings of this cut, not of every possible cut.'
        ],
        [
          'There is no single correct k.',
          'Single linkage can chain cases into long groups. Average and complete linkage do not chain in the same way. The linkage on the page is the one that was used.'
        ]
      ),
      'cluster-hi-dendrogram': guide(
        'Dendrogram',
        'Shows the order in which cases and groups were merged.',
        [
          'Leaves are cases. The height of a join is the distance at which those groups merged.',
          'The cut line is movable. Drag it to preview how many clusters that height yields. Apply re-runs the module at that k.'
        ],
        [
          'A tall gap before the next merge is a place where the groups being joined are far apart. Cutting in that gap is the usual visual choice.',
          'A tree with no gaps is a weak structure. Forcing a k still produces clusters.'
        ],
        [
          'The preview is not applied until you apply it. The other views stay on the current k until then.',
          'Height depends on the linkage and the distance. Do not compare heights from two different linkages.'
        ]
      ),
      'cluster-hi-clusters': guide(
        'Hierarchical — clusters',
        'Describes the groups at the current cut, and whether that cut matches the tree.',
        [
          'Read the sizes, the quality stats, and the suggested-k pills. A pill re-runs the module at that k.',
          'The merge-distance chart marks the current cut. The cophenetic correlation says how faithfully the tree preserves the original distances.'
        ],
        [
          'A jump in merge height just after the cut means the next merge would force apart groups together. A smooth rise means the cut is arbitrary.',
          'A cophenetic correlation above about 0.75 means the tree is a fair summary of the pairwise distances. Below that, the picture is distorting them.'
        ],
        [
          'Suggested k is a reading of the largest jumps. It is not a test.',
          'Re-running at a new k replaces the solution. It does not keep the previous cut beside it.'
        ]
      ),
      'cluster-hi-profiles': guide(
        'Hierarchical — profiles',
        'Shows what each cluster at the current cut is high or low on.',
        [
          'One line per cluster, with the centroid table under the chart.',
          'Standardised means are comparable across variables. Raw means are in the original units. By separation puts the most distinguishing variables first.'
        ],
        [
          'Read a separation the same way as in k-means: variables where the lines split define the clusters.',
          'The profiles change when you change the cut. They describe this k only.'
        ],
        [
          'The lines are centres, not significance tests.',
          'A variable that does not split is not evidence against the clustering. It is unused by this cut.'
        ]
      ),
      'cluster-hi-map': guide(
        'Hierarchical — separation and map',
        'Shows the current cut in a plane, with the next merges drawn when you ask for them.',
        [
          'Cases are coloured by the cluster at this cut. PCA mode projects the variables. Variables mode plots two raw variables.',
          'Merge trails, when they are on, connect clusters that the tree would join next. The heatmap is the distance between centroids.'
        ],
        [
          'A short connector is a pair a smaller k would fuse. A long connector is a pair the cut is right to keep apart.',
          'A pale heatmap cell names the closest pair. The map shows whether their members overlap.'
        ],
        [
          'The plane can hide separation that exists in other dimensions.',
          'Trails are the hierarchy above the cut. They are not a data trend.'
        ]
      )
    },
    'meta-analysis': {
      'meta-summary': guide(
        'Summary',
        'Shows the pooled effect and whether the studies agree enough to read that pool as one number.',
        [
          'Read the model first: fixed-effect or random-effects, and the effect scale (Hedges’ g, mean difference, Cohen’s d, odds ratio, risk ratio, or risk difference).',
          'Then read the pooled estimate, its interval, the number of studies, and I².'
        ],
        [
          'The diamond or the pooled row is the combined effect. The interval is its precision, not the spread of the studies.',
          'A prediction interval, when it is shown, is a random-effects statement about a new study. It is wider than the confidence interval and it is not shown for a fixed-effect model.'
        ],
        [
          'The pool is not a cause and not a licence to ignore a study that used a different design.',
          'I² of 0% does not prove the studies are identical. With few studies the heterogeneity statistics are imprecise.',
          'Precomputed effects must already be on the scale the page names, with matching standard errors.'
        ]
      ),
      'meta-forest': guide(
        'Forest plot',
        'Draws each study’s effect and the pooled effect on one axis.',
        [
          'Each study is a point with a horizontal interval. The pooled effect is the diamond or the reference mark.',
          'The size of a point, when it varies, reflects the study’s weight. A larger weight pulls the pool more.'
        ],
        [
          'Studies on the same side of the null agree in direction. Intervals that barely overlap are studies in tension.',
          'The null is 0 for a difference and for a log ratio, and 1 for a ratio that is plotted on the raw scale. Read the axis label.'
        ],
        [
          'This view does not report the small-study test. That is the bias view.',
          'A study far from the pool is not automatically an error. Read its sample and its methods before you set it aside.'
        ]
      ),
      'meta-heterogeneity': guide(
        'Heterogeneity',
        'Describes how much the study effects differ beyond sampling error.',
        [
          'Read Q, its degrees of freedom and p-value, I², τ² or τ, and the number of studies.',
          'Keep the pooled interval on the summary view. This view is about the scatter among studies.'
        ],
        [
          'I² is the share of the observed scatter that the random-effects model attributes to real differences among studies. τ is the standard deviation of those differences, on the effect scale.',
          'A non-significant Q does not prove homogeneity, especially when there are few studies.'
        ],
        [
          'Do not switch between fixed and random effects only because Q is not significant or I² is zero.',
          'With a handful of studies, I² and τ are rough. Say so.'
        ]
      ),
      'meta-bias': guide(
        'Small-study effects',
        'Looks for a relationship between the study effect and its precision, using Egger’s test and a funnel plot.',
        [
          'Read Egger’s intercept, its standard error, the t or z statistic, the p-value, and the number of studies.',
          'The funnel plots the effect against its standard error, with the pooled line and the pseudo-95% limits.'
        ],
        [
          'Points inside the funnel are where studies of that precision usually fall. A pile of small studies on one side is the pattern Egger is sensitive to.',
          'The pseudo limits are expected funnel bounds. They are not a confidence interval for the pooled effect.'
        ],
        [
          'Asymmetry is not only publication bias. It can be real differences between small and large studies.',
          'With fewer than about ten studies the test is unstable. A non-significant Egger test is not proof of no bias.'
        ]
      ),
      'meta-studies': guide(
        'Study details',
        'Lists each study’s effect, interval, and weight, and lets you see which studies dominate the pool.',
        [
          'Read the study, its sample, the effect, the interval, and the weight. Technical columns add the standard error and the variance when they are on.',
          'A sensitivity note appears if studies were unchecked. The pool on the summary then matches the studies that remain.'
        ],
        [
          'A large weight means the study pulls the pooled estimate. Identify that study before you describe the pool as “the literature.”',
          'The footer row is the pool, not another study.'
        ],
        [
          'Unchecking a study is a sensitivity analysis, not a correction.',
          'This table does not impute missing studies and it is not a network meta-analysis.'
        ]
      )
    },
    power: {
      'power-sbAnova': guide(
        'ANOVA power',
        'Calculates power or the required sample size for a one-way ANOVA from Cohen’s f and α.',
        [
          'Compute Power uses a sample size you enter and returns power. Find Sample Size uses a target power and returns N.',
          'Set Cohen’s f, or η² where the page converts it, the number of groups, and α. The curve is power against N.',
          'The 70, 80, 90, and 95 percent marks are guides. 80 percent is the usual planning convention.'
        ],
        [
          'Power is the chance that a study of this size detects an effect as large as the f you entered, if that effect is real and the model holds.',
          'Required N is the size that reaches the target power under those assumptions. It is a planning number.'
        ],
        [
          'Power is not the probability that the hypothesis is true.',
          'Means, correlation, proportions, and regression in this menu are not calculated. Those screens say coming soon.',
          'The curve is for the ANOVA design on this page. It is not the power of a test you already ran in another module, unless you launched it with that module’s effect filled in.'
        ]
      ),
      'power-sbMeans': guide(
        'Means power',
        'The two-means power calculation is listed and is not available yet.',
        [
          'Choosing Means shows the coming-soon note. The ANOVA calculation remains the one this module runs.',
          'Switch back to ANOVA to compute power or required N.'
        ],
        [
          'There is no power, no required N, and no curve for a t-test on this screen.',
          'Do not read the ANOVA numbers as if they were a two-group t-test.'
        ],
        [
          'A coming-soon label is not a result of zero power.',
          'Planning a t-test needs a tool that calculates it. This menu item does not.'
        ]
      ),
      'power-sbCorr': guide(
        'Correlation power',
        'The correlation power calculation is listed and is not available yet.',
        [
          'Choosing Correlation shows the coming-soon note.',
          'The working calculation in this module is ANOVA power.'
        ],
        [
          'There is no power for an assumed correlation on this screen.',
          'Do not reuse the ANOVA curve as a correlation curve.'
        ],
        [
          'Coming soon is not a calculated power of zero.',
          'Sample-size advice for a correlation is not produced here.'
        ]
      ),
      'power-sbProp': guide(
        'Proportion power',
        'The two-proportion power calculation is listed and is not available yet.',
        [
          'Choosing Proportions shows the coming-soon note.',
          'Use ANOVA only for the ANOVA design. It does not plan a comparison of percentages.'
        ],
        [
          'There is no power and no required N for two proportions on this screen.',
          'The ANOVA inputs are Cohen’s f and groups, not two percentages.'
        ],
        [
          'Coming soon is not a result.',
          'Do not report a proportion sample size from this page.'
        ]
      ),
      'power-sbReg': guide(
        'Regression power',
        'The regression power calculation is listed and is not available yet.',
        [
          'Choosing Regression shows the coming-soon note.',
          'Regression results have their own power view inside the regression module. This menu item is not that view.'
        ],
        [
          'There is no R² power curve on this screen.',
          'The ANOVA calculation does not become a regression calculation because the menu item is selected.'
        ],
        [
          'Coming soon is not a calculated power.',
          'Do not quote an ANOVA N as the N required for a regression.'
        ]
      )
    },
    'mixed-model': {
      'mixed-model-overview': guide(
        'Model summary',
        'States whether the mixed model converged and what the fixed effects and the clustering look like at a glance.',
        [
          'Read the conclusion, the convergence note, and the intraclass correlation before the coefficient table.',
          'Effects and tests, marginal means, and diagnostics are separate views.'
        ],
        [
          'The ICC is the share of leftover variation that sits between clusters. A high ICC means observations in the same cluster are not independent.',
          'A fixed-effect p-value on the summary is the test after the random intercept. It is not an ordinary regression p-value.'
        ],
        [
          'Failure to converge means the estimates are not trustworthy. Do not report the coefficients from a model that did not converge.',
          'This is a linear mixed model with random intercepts. It is not a model for a binary outcome and it does not automatically add random slopes.'
        ]
      ),
      'mixed-model-model-effects': guide(
        'Effects and tests',
        'Shows the tests of the fixed effects and the coefficient estimates.',
        [
          'Read the Type III tests for the fixed terms, then the estimates, standard errors, and intervals.',
          'Degrees of freedom may be Satterthwaite approximations. The page names the method it used.'
        ],
        [
          'A fixed effect is the average association after the random intercept absorbs cluster differences.',
          'The random-effect variance is not a coefficient you interpret as a slope. It is a spread.'
        ],
        [
          'These tests assume the random-intercept model fitted. They are not robust standard errors from an ordinary regression.',
          'A categorical fixed effect is a contrast against its reference level.'
        ]
      ),
      'mixed-model-marginal-means': guide(
        'Estimated marginal means',
        'Shows the fitted means of a categorical fixed effect, averaged in the way the model specifies.',
        [
          'Read the means plot and the pairwise contrasts. The contrasts are differences of those fitted means.',
          'The covariate values used for the means, if any, are the ones the page states.'
        ],
        [
          'An estimated marginal mean is not the raw group mean when the clusters or the covariates are unbalanced.',
          'A pairwise contrast inherits the model’s degrees of freedom and its random intercept. It is not a separate t-test.'
        ],
        [
          'The means are only as good as the model. Check convergence and the residual view.',
          'A contrast is not a cause.'
        ]
      ),
      'mixed-model-diagnostics': guide(
        'Diagnostics',
        'Checks the residuals of the linear mixed model.',
        [
          'Read the residual plots for shape, spread, and odd points, and any convergence or variance warning.',
          'A random-intercept model expects leftovers that are roughly symmetric once the cluster effect is removed.'
        ],
        [
          'A fan shape or a curve means the fixed part of the model is missing something, or the spread is not constant.',
          'A cluster that is entirely off the cloud may be a group the random intercept is struggling to absorb, or a data problem.'
        ],
        [
          'Quiet residuals do not prove the random structure is complete. Random slopes are not in the model unless the page fitted them.',
          'Do not delete a cluster from the diagnostic plot alone.'
        ]
      ),
      'mixed-model-advanced': guide(
        'Estimation details',
        'Shows how the model was estimated: REML or ML, the covariance pieces, and the information criteria.',
        [
          'REML is the default. ML is available. The page names which one produced these estimates.',
          'Read AIC and BIC as comparisons between models fitted the same way. Do not compare an REML AIC with an ML AIC.'
        ],
        [
          'The variance components split leftover variation into the cluster piece and the observation piece. The ICC is their ratio.',
          'A variance component sitting on zero means the data are not supporting that random term.'
        ],
        [
          'Information criteria do not test a coefficient. The tests are on Effects and tests.',
          'REML and ML change the variance estimates. Quote the method with the numbers.'
        ]
      ),
      'mixed-model-power': guide(
        'Power and sample size',
        'Plans a fixed effect in the mixed model, counting clusters rather than raw rows.',
        [
          'Read achieved power and the number of subjects, meaning clusters, required for the target marks.',
          'The ICC and the measurements per subject show how repeated rows are discounted into an effective sample size.'
        ],
        [
          'Adding rows inside a cluster helps less than adding clusters when the ICC is high.',
          'Power is the chance of detecting the assumed fixed effect. It is not the probability the effect is real.'
        ],
        [
          'The plan uses the random-intercept design. It does not plan a random slope you did not fit.',
          'It does not replace the test of the fitted model.'
        ]
      )
    },
    multivariable: {
      'multivariable-quadrant': guide(
        'Quadrant chart',
        'Places each case on two numeric axes and splits the plane into four regions.',
        [
          'Variables assigns which column is X, which is Y, which is bubble size, and which is colour.',
          'Quadrants sets how the divider lines are drawn and what the four regions are called. Click a bubble to inspect it. Ctrl+click adds to the selection.'
        ],
        [
          'A case’s region is which side of both dividers it falls on. Bubble size is the third variable, not a count of cases.',
          'Colour, when it is a group, shows whether a group collects in one region or spreads across them.'
        ],
        [
          'The dividers are a display rule. They are not a significance test and not a cluster solution.',
          'A point in a “high” region is high relative to the divider, not necessarily high in any practical sense you have not defined.'
        ]
      ),
      'multivariable-bubble': guide(
        'Bubble chart',
        'Plots cases on two axes, with size as a third variable and colour as a group or a scale.',
        [
          'Hover a bubble for its values. Click to select it. A legend click focuses a group. Ctrl+click hides a group. Double-click isolates it.',
          'Variables remaps which column is which role.'
        ],
        [
          'Position is the two axes. Area is the size variable. Do not read a big bubble as “more important” unless that variable is the one you meant.',
          'Overlap means similar X and Y, not necessarily a similar size.'
        ],
        [
          'The chart does not fit a model and does not test a correlation. A visual trend is a reason to open a correlation or a regression.',
          'Hiding a group removes it from view. It does not remove it from the data.'
        ]
      ),
      'multivariable-true3d': guide(
        '3D scatter',
        'Plots three numeric variables at once, with bubble size as a fourth encoding.',
        [
          'Drag the plot to rotate it. Use the sliders for the viewing angles and the depth.',
          'Map Z in Variables. A pattern that is hidden in X and Y can separate along Z.'
        ],
        [
          'Apparent clusters depend on the angle. Rotate before you decide two groups are separate.',
          'Size is still a fourth variable, not the distance from the viewer, unless you set it that way.'
        ],
        [
          'The projection can make distant points look close. Rotation is the check.',
          'This view does not test a group difference or fit a plane.'
        ]
      )
    },
    segmentation: {
      'segmentation-overview': guide(
        'Loyalty matrix',
        'Splits cases into four segments using two cut-offs on the loyalty measures.',
        [
          'The two cut-offs define the four quadrants. Read the segment shares on the matrix.',
          'Group comparison and Change are separate views. Change appears when a previous period is available.'
        ],
        [
          'A segment’s percentage is the share of cases on that side of both cut-offs.',
          'Moving a cut-off moves people between segments. The share is not a property of the cases independent of the cut.'
        ],
        [
          'The shares are descriptive. They are not significance tests.',
          'A larger segment is not a better segment. The names are positions relative to the cut-offs.'
        ]
      ),
      'segmentation-groups': guide(
        'Group comparison',
        'Compares the segment mix across groups.',
        [
          'Each group is a stacked bar of the four segments, on a common percent scale.',
          'Read the mix, not a test statistic. This view does not print one.'
        ],
        [
          'A taller segment band is a larger share of that group. Compare shares rather than counts when the groups differ in size.',
          'A group that is mostly one segment has a more concentrated mix.'
        ],
        [
          'A difference in percentages is not a significance test.',
          'The comparison uses the same cut-offs as the matrix. It does not refit them per group.'
        ]
      ),
      'segmentation-change': guide(
        'Change',
        'Compares the current period with the previous period, in percentage points.',
        [
          'This view is available when a previous period is selected. Each figure is a change in share, not a new segment.',
          'Read the direction and the number of points. A gain in one segment is a loss somewhere else if the shares still add to 100.'
        ],
        [
          'Percentage points are the difference of two percents. They are not a percent change and not a p-value.',
          'A small movement in a large segment can be many cases. A large movement in a small segment can be few cases.'
        ],
        [
          'The change is descriptive. It is not a test that the period differs.',
          'It does not say why the mix moved.'
        ]
      ),
      'segmentation-drivers': guide(
        'Split Index',
        'Shows which factors separate the high group from the low group on the splitting factor.',
        [
          'The left axis is each factor’s mean, in that factor’s own units. The right axis is the Split Index. Blue and red are the two groups.',
          'Standardized puts the means on a common scale. Use it when the factors are not in the same units. Highlight, when you turn it on, marks factors whose Split Index stands above the rest.'
        ],
        [
          'A larger Split Index means the factor separates the two groups more. The means show which group is higher, in the factor’s own units.',
          'The splitting factor’s cut-off, range, and the number of cases in each group are the definition of the two groups. They are not a result about the other factors.'
        ],
        [
          'The index is descriptive. It is not a significance test and not a cause.',
          'Factors on smaller scales look compressed on the raw chart. That is the scale, not a smaller difference. Open Standardized before you compare those lines by eye.',
          'An explaining-factor mark, when highlight is on, means the index is high relative to the other indexes. It does not prove an explanation.'
        ]
      ),
      'segmentation-periods': guide(
        'Across periods',
        'Compares the Split Index of each factor in every survey period.',
        [
          'Each cluster of columns is a factor. Each column is a period.',
          'Read the height as that period’s Split Index for that factor.'
        ],
        [
          'A taller column means the factor separated the two groups more in that period.',
          'Compare columns within a factor. Comparing raw heights across factors is fair here because each column is already an index, not a raw mean.'
        ],
        [
          'The comparison is descriptive. It is not a test that the periods differ.',
          'A period with few cases produces a jumpy index.'
        ]
      ),
      'segmentation-standardized': guide(
        'Standardized',
        'Puts each group’s factor means on a common scale so factors with different units can be compared.',
        [
          'A point is a group mean in standard-deviation units: the group mean minus the factor’s overall mean, divided by the factor’s overall standard deviation.',
          'The columns remain the Split Index. The gap between the two lines is not the column height.'
        ],
        [
          'A point at +0.60 means that group sits 0.60 standard deviations above the factor’s overall mean.',
          'The overall mean and standard deviation use every included case. They do not change when the cut-off moves. The group means do.'
        ],
        [
          'These are descriptive comparisons, not tests and not causes.',
          'Standardising does not make factors equally important. It only puts them in comparable units.'
        ]
      )
    },
    capability: {
      'capability-setup': guide(
        'Input and setup',
        'Chooses the measurement and the specification limits before Pp and Ppk are calculated.',
        [
          'Drag one numeric column into Measurement. The same column is used for the results, the planner, and By Group.',
          'Enter the lower and upper specification limits. Leave Target blank to use the midpoint. That midpoint is used for Cpm.',
          'Use demo process, Use Excel selection, Pick a range, and Refresh worksheet data change the rows. They do not change the limits you typed.',
          'Run analysis opens the capability results. Cancel closes the dialog.'
        ],
        [
          'Nothing on this screen is a capability index. The equation strip names the measurement that will be analysed.',
          'A category, a date, or free text cannot be the measurement. A grouping column stays in the variable list until you open By Group.'
        ],
        [
          'The limits are the specification you intend to judge. The module does not estimate them from the data.',
          'Running the analysis does not write the scenario, the limits, or a transformed column back to the worksheet.'
        ]
      ),
      'capability-results': guide(
        'Process capability',
        'Shows how the analysed measurement sits against the specification, using the overall sample standard deviation.',
        [
          'LSL, USL, and Target can be edited here. The results recalculate from the same rows. Leave Target blank to use the midpoint.',
          'Find settings opens the Capability Planner for the index on the gauge.',
          'Histogram draws the observed values. The bins slider sets the number of intervals. Normal curve overlays the normal model. Histogram off and Normal curve on leaves the smooth curve.'
        ],
        [
          'The gauge is Ppk. Pp is the spread relative to the specification width, as if the mean were centred. Ppk is the worse of Cpu and Cpl.',
          'Cpu is the room to the upper limit. Cpl is the room to the lower limit. The smaller one is the binding side.',
          'Expected PPM and Yield are the tails of a normal curve with this mean and this standard deviation. They are not a count of the points outside the limits.',
          'Bars outside the specification are the observed values beyond the limits. The orange curve is the normal model, not a second sample.'
        ],
        [
          'Pp and Ppk use the overall sample standard deviation (n − 1). They are not within-process Cp and Cpk.',
          'The normal yield and expected PPM can mislead when the measurement is skewed or has more than one peak.',
          'A high Ppk describes this sample. It does not prove that the process is stable.'
        ]
      ),
      'capability-planner': guide(
        'Capability Planner',
        'Finds a mean, a standard deviation, or an outward specification change that would reach the goal you enter.',
        [
          'Metric chooses Ppk, modeled yield, or expected PPM. Goal is the value to reach. Mode chooses process improvement or a specification what-if. Change chooses whether the mean, the standard deviation, or both may move.',
          'Constraints holds optional mean bounds and a practical minimum standard deviation. A blank bound adds no further constraint. The summary names the bounds that are active.',
          'Find settings runs the search. After a result, the two current-SD presets are the smallest mean shift and the most margin from centering, when those settings differ. The slider and the scenario-mean field select a custom mean.',
          'Changing the metric, the goal, or a constraint clears the solved result until you choose Find settings again.'
        ],
        [
          'The opening sentence says whether the goal is reachable at the current standard deviation, and the mean interval that meets it when that interval exists.',
          'Current and Selected scenario show the mean, the standard deviation, the metric, and the normal-model yield or expected PPM. Both charts use that same selected mean and standard deviation.',
          'Scenario SD is the standard deviation of the selected setting. Maximum SD for the goal is how wide the process could be at that mean and still meet the goal. The current SD caps a process-improvement scenario, so the search does not propose a larger standard deviation.',
          'Settings that meet the goal shades the mean and standard-deviation pairs that satisfy the goal. The current marker is labeled when the analysed process is below the goal.'
        ],
        [
          'Yield and expected PPM are normal-model estimates. A very small expected PPM is not a promise of zero defects.',
          'The scenario stays in this view. The worksheet and the capability results keep the analysed values.',
          'An unreachable goal names the binding constraint and the best point the search could reach. That point is not a recommendation that the process can be operated there.'
        ]
      ),
      'capability-by-group': guide(
        'By-group capability',
        'Repeats Pp and Ppk inside the categories of a grouping column.',
        [
          'Choose the grouping column in the group dialog. Recommended columns are listed first. Include or leave out levels, and set the minimum group size, before Compare groups.',
          'The table lists Overall and each included level. The bars compare Ppk. The method note under the table states how the status was decided.'
        ],
        [
          'The status says whether Ppk stays in a similar band, varies in magnitude, or changes which specification limit is binding.',
          'Limited by names the worse side for that row: USL, LSL, or neither when the two sides are close.',
          'A level marked small is shown and is not used in the consistency status.'
        ],
        [
          'The comparison is descriptive. It is not a test that the groups differ in mean, spread, or capability.',
          'Each group still uses the overall sample standard deviation of its own rows, not a within-subgroup estimator.',
          'More than 15 levels is refused. A formal comparison of means or variances belongs in another module.'
        ]
      )
    },
    'gage-rr': {
      'gage-rr-setup': guide(
        'Input and setup',
        'Maps Part, Operator, and Measurement and checks that the crossed study is balanced before any variance is fit.',
        [
          'Choose three different columns. Part and Operator are identifiers. Measurement is the numeric reading. One row is one reading.',
          'The count grid lists every Part × Operator cell. Highlighted cells are empty or do not share the common repeat count.',
          'Lower and upper specification limits are optional. Use demo data, Use Excel selection, Pick a range, and Refresh worksheet data replace the rows.',
          'Run analysis opens the overview only when the design is valid. Cancel closes the dialog.'
        ],
        [
          'The status line counts parts, operators, repeats per cell, and complete readings. It is not a variance result.',
          'A message that names an Excel row is a block. That row is not dropped, so it cannot change the fit quietly.'
        ],
        [
          'Every operator must measure every part the same number of times, at least twice. A nested or unbalanced study is not analyzed here.',
          'The limits are the specification you enter. The module does not estimate them from the data, and running the analysis does not write back to the worksheet.'
        ]
      ),
      'gage-rr-overview': guide(
        'Overview',
        'Shows how much of the study variation comes from the measurement system, then the components that add up to that total.',
        [
          'The three cards are Total Gage R&R as a percent of study variation, %Tolerance when both limits are valid, and the number of distinct categories.',
          'Edit the specification limits here to update %Tolerance only. The ANOVA and the percent of study variation stay on the same fit.',
          'The bars are the components that add to 100 percent. Total Gage R&R and Reproducibility are sums, so they are not drawn again.'
        ],
        [
          '%Contribution divides each variance by the total variance. %Study variation divides each standard deviation by the total standard deviation. %Tolerance divides 6 × SD by the specification width.',
          'A zero with a note was a negative estimate set to zero. Unavailable means the denominator was zero, not that the value is zero.',
          'Distinct categories uses 1.41 × part-to-part SD / Total Gage R&R SD, truncated, and at least 1. The parts should represent the variation you need to distinguish.'
        ],
        [
          'Parent rows repeat the sum of the rows under them. Adding a parent to its components counts that variation twice.',
          'Percent of study variation is not a confidence interval, and distinct categories is not a capability index.'
        ]
      ),
      'gage-rr-diagnostics': guide(
        'Diagnostics',
        'Plots each Part × Operator cell on an R chart, an X-bar chart, and an interaction profile, and opens the repeats behind a point.',
        [
          'Each point is one cell. Click it, or focus it and press Enter or Space, to select that Part × Operator pair on all three charts.',
          'The detail lists the repeat readings, their Excel rows, the mean, and the range. Clear selection restores the unselected view.',
          'Selection changes highlighting and the detail only. It does not change the fit or the export.'
        ],
        [
          'The R chart is centered at the mean of the cell ranges, with limits D3 and D4 times that mean. The X-bar chart is the grand mean plus or minus A2 times the mean range.',
          'An X-bar point beyond the limits can show that parts differ relative to repeatability. That is often the pattern a gage study is looking for.',
          'The interaction profile is the cell mean by part, with one line per operator. Nearly parallel lines agree with a small interaction.'
        ],
        [
          'If factors are not available for the repeat count, the points stay and the limits are omitted. The fitted study is unchanged.',
          'A selected point is not a separate analysis. The report still contains the full study.'
        ]
      ),
      'gage-rr-anova': guide(
        'ANOVA',
        'Shows the full two-way model, the decision to keep or pool the interaction, and the report of the fitted study.',
        [
          'Read the decision sentence first. It names the selected model and the mean square used afterward.',
          'The full table always includes the interaction test. The reduced table appears only when the interaction was pooled.',
          'The report repeats the study size, the method, the decision, any valid limits, the variance table, and both ANOVA tables. Export uses that report and stays off until a fit succeeds.'
        ],
        [
          'Part and Operator are tested against the interaction mean square while the interaction stays, and against the pooled repeatability mean square after it is pooled.',
          'A p-value of 0 is the limiting right tail when the numerator is positive and the denominator mean square is zero. Unavailable means zero divided by zero.',
          'Pooling adds the interaction sum of squares and degrees of freedom to repeatability. The interaction variance is then zero.'
        ],
        [
          'The ANOVA describes this balanced study. It is not a confidence interval for the variance components.',
          'Refresh or a new column mapping clears the previous fit. The old report cannot be exported until the new fit succeeds.'
        ]
      )
    }
  };


  const StatisticoViewGuide = {
    _guides: Object.assign({ univariate: univariate }, moduleGuides),
    _contextOverride: null,
    _returnFocus: null,
    _keyBound: false,

    register: function (moduleName, map) {
      if (!moduleName || !map) return;
      this._guides[moduleName] = Object.assign({}, this._guides[moduleName] || {}, map);
    },

    getContext: function () {
      if (typeof this._contextOverride === 'function') return this._contextOverride();
      const header = window.StatisticoHeader;
      const moduleName = (header && header.module) || 'univariate';
      let key = moduleName === 'univariate' ? 'histogram' : '';
      if (header && typeof header._getInsightGuideViewKey === 'function') {
        try { key = header._getInsightGuideViewKey() || key; } catch (_e) {}
      }
      let label = key;
      if (header && typeof header._getInsightGuideLabel === 'function') {
        try { label = header._getInsightGuideLabel() || label; } catch (_e) {}
      }
      return { module: moduleName, key: key, label: label };
    },

    resolve: function (ctx) {
      const context = ctx || this.getContext();
      const moduleName = context.module || 'univariate';
      let key = context.key || '';
      if (moduleName === 'univariate' && (key === 'by-group' || key === 'by-group-stats')) {
        key = key === 'by-group' ? 'by-group-stats' : key;
      }
      const table = this._guides[moduleName] || {};
      return table[key] || null;
    },

    isOpen: function () {
      const overlay = document.getElementById('viewGuideOverlay');
      return !!(overlay && overlay.classList.contains('is-open'));
    },

    sync: function () {
      this._syncButton();
      if (!this.isOpen()) return;
      this._render();
    },

    open: function () {
      const ai = document.getElementById('sbAiOverlay');
      if (ai) ai.remove();
      if (window.StatisticoModuleGuide && typeof window.StatisticoModuleGuide.close === 'function') {
        window.StatisticoModuleGuide.close({ silent: true });
      }
      const guideBtn = document.getElementById('sbViewGuideBtn');
      if (guideBtn && document.activeElement !== guideBtn) this._returnFocus = guideBtn;
      else if (guideBtn) this._returnFocus = guideBtn;
      this._ensureOverlay();
      this._render();
      const overlay = document.getElementById('viewGuideOverlay');
      if (!overlay) return;
      overlay.hidden = false;
      overlay.classList.add('is-open');
      this._syncButton();
      this._bindKeys();
      const closeBtn = overlay.querySelector('.vg-close');
      if (closeBtn) closeBtn.focus();
    },

    close: function (opts) {
      const overlay = document.getElementById('viewGuideOverlay');
      if (overlay) {
        overlay.classList.remove('is-open');
        overlay.hidden = true;
      }
      this._syncButton();
      const restore = !(opts && opts.silent);
      const back = this._returnFocus;
      this._returnFocus = null;
      if (restore && back && typeof back.focus === 'function' && document.contains(back)) {
        back.focus();
      }
    },

    toggle: function () {
      if (this.isOpen()) this.close();
      else this.open();
    },

    _syncButton: function () {
      const btn = document.getElementById('sbViewGuideBtn');
      if (!btn) return;
      const open = this.isOpen();
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    },

    _bindKeys: function () {
      if (this._keyBound) return;
      this._keyBound = true;
      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (!StatisticoViewGuide.isOpen()) return;
        const tag = event.target && event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        StatisticoViewGuide.close();
      });
    },

    _ensureOverlay: function () {
      let overlay = document.getElementById('viewGuideOverlay');
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'viewGuideOverlay';
      overlay.className = 'vg-overlay';
      overlay.hidden = true;
      overlay.innerHTML = ''
        + '<div class="vg-panel" role="dialog" aria-modal="true" aria-labelledby="viewGuideTitle">'
        + '  <div class="vg-header">'
        + '    <div class="vg-header-copy">'
        + '      <span class="vg-kicker">View guide</span>'
        + '      <h2 class="vg-title" id="viewGuideTitle"></h2>'
        + '    </div>'
        + '    <button type="button" class="vg-close" aria-label="Close view guide">&times;</button>'
        + '  </div>'
        + '  <div class="vg-body" id="viewGuideBody"></div>'
        + '  <div class="vg-footer">Reviewed guidance for this view. It does not interpret your current numbers. Use Interpret results for that.</div>'
        + '</div>';
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) StatisticoViewGuide.close();
      });
      overlay.querySelector('.vg-close').addEventListener('click', function () {
        StatisticoViewGuide.close();
      });
      document.body.appendChild(overlay);
      return overlay;
    },

    _render: function () {
      const overlay = this._ensureOverlay();
      const ctx = this.getContext();
      const entry = this.resolve(ctx);
      const title = overlay.querySelector('.vg-title');
      const body = overlay.querySelector('.vg-body');
      const heading = (entry && entry.title) || ctx.label || 'This view';
      if (title) title.textContent = heading;
      if (!body) return;
      if (!entry) {
        body.innerHTML = '<p class="vg-empty">A reviewed guide for this view is not available yet.</p>';
        return;
      }
      body.innerHTML = entry.sections.map(function (section) {
        const blocks = [];
        (section.paragraphs || []).forEach(function (paragraph) {
          blocks.push('<p>' + escapeHtml(paragraph) + '</p>');
        });
        if (section.items && section.items.length) {
          blocks.push('<ul>' + section.items.map(function (item) {
            return '<li>' + escapeHtml(item) + '</li>';
          }).join('') + '</ul>');
        }
        return '<section class="vg-section" data-guide-section="' + escapeHtml(section.id) + '">'
          + '<h3>' + escapeHtml(section.title) + '</h3>'
          + blocks.join('')
          + '</section>';
      }).join('');
    }
  };

  window.StatisticoViewGuide = StatisticoViewGuide;
})();
