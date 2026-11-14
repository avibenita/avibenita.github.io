/**
 * Reviewed module guide.
 * One drawer for “About this module”. The same text opens from the setup
 * screen, before a run, and from the results sidebar. It stays closed until
 * asked. View guide explains a screen. Interpret results explains the numbers.
 */
(function () {
  function section(id, title, spec) {
    const source = spec || {};
    return {
      id: id,
      title: title,
      paragraphs: source.paragraphs || [],
      items: source.items || [],
      detail: source.detail || null
    };
  }

  const univariate = {
    title: 'Univariate analysis',
    lead: 'Univariate analysis describes one numeric measurement — for example, monthly spend for a set of customers. It shows where those values sit, how widely they spread, and how the shape compares with a reference. Those descriptions do not establish a cause.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'The same column can be read as a histogram, a cumulative curve, a box plot, or a smoothed density. Later screens add a confidence interval or a test of one summary against a value you choose.',
          'Each of those is still about this one measurement. The module does not estimate how other variables change it.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You have one measurement and want to see its distribution before a comparison or a model.',
          'You want a typical value, a percentile, or a sense of skew and unusual points.',
          'You want a range for the population mean, median, or standard deviation of this one variable.',
          'You want to test one summary against a reference value you already have in mind.',
          'You want that description split by a grouping column, still without a formal test of group differences.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'One numeric column. Each row is one observation of that measurement.',
          'A category, a date, or free text is not the variable to analyse. A grouping column is separate, and it is used only when you open By Group.',
          'Rows without a number are left out of the summaries that need one.',
          'Trimming and the transforms on the setup screen — log, square root, z-score, and the others listed there — apply to this analysis only. The worksheet is not changed.',
          'A short column can still be plotted. Intervals and tests from very few rows are thin.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'The module orders and summarises the observed numbers, then draws them. A histogram counts values that fall in each interval. The cumulative curve shows the share of the sample at or below each value. A box plot marks the quartiles and the whiskers. Kernel density draws a smooth curve through the same values.',
          'The formal screens — normality, a confidence interval, and the one-sample test — use the method you select on that screen, classical or bootstrap where those choices exist.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'The mean and the standard deviation are the usual sample summaries. Skewness describes asymmetry. Kurtosis describes tail weight.',
            'Quartiles come from the ordered sample. The box-plot whiskers use 1.5 times the interquartile range.',
            'A classical interval for the mean uses the sample standard deviation and a t critical value. A bootstrap interval resamples the observed values.',
            'A one-sample test compares the summary you chose with the reference you typed. The p-value belongs to that hypothesis.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Histogram, cumulative curve, percentiles, kernel density, and box plot answer where the values sit and how they are shaped.',
          'Outlier flags answer which points a chosen rule marks as unusual. A flag is not a decision to delete the row.',
          'Normality tests and PP/QQ plots answer whether a reference distribution is a fair sketch. The plot is visual. The tests supply p-values.',
          'By Group repeats the description inside categories and adds a similarity profile. That profile is not a significance test.',
          'A confidence interval answers what range is plausible for one population summary under the method you selected.',
          'A one-sample test answers how this sample sits relative to a reference you specify.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'The rows should be the observations you mean to describe. A trim or a transform changes which numbers are analysed.',
          'Classical intervals and tests rely on their sampling model. A small or strongly skewed sample weakens that reading. Bootstrap changes the calculation, not the way the sample was collected.',
          'A normal curve drawn on a chart is a reference. It is not a normality test.',
          'A confidence interval is not a prediction interval for the next observation. A classical 95% interval describes the method across repeated samples. It is not a 95% probability that this particular interval contains the truth.',
          'A small p-value is not the size of a difference. A large p-value does not prove the null.',
          'Grouped pictures are descriptive. They do not replace a test designed to compare groups.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'Two numeric variables, and the question is association: correlation.',
          'A numeric outcome and one or more predictors: regression.',
          'A yes-or-no outcome and predictors: logistic regression.',
          'A formal comparison of groups on a numeric outcome: independent samples, or ANOVA when there are more than two groups.',
          'The same cases measured twice: dependent samples.',
          'A table of counts across categories: contingency.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The screens use standard one-sample procedures. They do not apply survey weights, clustered standard errors, or an adjustment for other variables. Where a screen offers a population size, that entry is a finite-population correction, not a model of dependence.'
        ],
        items: [
          'Histogram intervals: a manual count from 1 to 15, Sturges (1926), Scott (1979), and Freedman and Diaconis (1981).',
          'Percentiles: SAS, Excel inclusive, Excel exclusive, and nearest rank. The chosen rule can move the reported cut.',
          'Kernel density: Gaussian, Epanechnikov, triangular, and uniform kernels, with a bandwidth multiplier.',
          'Box plot and outliers: Tukey’s 1.5×IQR rule (Tukey, 1977); a z-score rule at |z| > 3; Grubbs’ test for one extreme (Grubbs, 1950); a MAD rule for robust screening.',
          'Normality: Shapiro–Wilk, Anderson–Darling, Kolmogorov–Smirnov, Cramér–von Mises, D’Agostino–Pearson, and Jarque–Bera. The normality summary index is a 0–100 score, not a p-value. Shapiro, S. S., and Wilk, M. B. (1965), Biometrika.',
          'QQ and PP plots compare the sample with a selected reference: normal, exponential, uniform, log-normal, gamma, or Weibull.',
          'Confidence intervals and the one-sample test: a classical formula for the mean or the spread, and a bootstrap alternative (Efron and Tibshirani, 1993). Bootstrap also covers the median and a percentile.'
        ]
      })
    ]
  };

  const correlations = {
    title: 'Correlation analysis',
    lead: 'Correlation analysis describes how numeric variables move together — for example, whether higher satisfaction scores tend to come with higher renewal intent. A correlation is an association in this sample. It does not establish that one variable causes the other.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'Each pair of numeric columns receives a correlation, a p-value, and a place in the matrix. You can switch among Pearson, Spearman, and Kendall.',
          'Partial and semi-partial views ask what remains of a pair after other variables are held constant. A network draws the stronger links. By Group repeats the description inside categories.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You have two or more numeric measurements and want to know which pairs move together.',
          'You want a rank association because the relationship may not be a straight line, or because a few extreme points would dominate Pearson.',
          'You want the association between two variables after accounting for others.',
          'You are screening measurements before a regression, a factor analysis, or a scale.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'At least two numeric columns. Each row is one case, and a pair uses only rows where both values are present.',
          'Pearson is aimed at straight-line association. Spearman and Kendall use the ranks, so they suit monotonic relationships and are less pulled by extreme points.',
          'A partial correlation needs the extra variables you choose to hold constant, on the same rows.',
          'Categories are not correlated here. A table of counts belongs in Contingency Tables.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'The module pairs the selected columns and computes the coefficient you chose. The matrix is symmetric. The diagonal is the variable with itself.',
          'A partial correlation removes the linear overlap with the control variables before relating the pair. A semi-partial correlation removes that overlap from only one member of the pair.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Pearson’s r is the standardized covariance of the two columns. It lies between −1 and 1.',
            'Spearman applies Pearson’s formula to the ranks. Kendall counts concordant and discordant pairs.',
            'The p-value asks whether a correlation of this size is surprising if the true association were zero. It is not the strength of the association.',
            'A partial correlation is a correlation of residuals after the control variables have been regressed out.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'The matrix answers which pairs are positive, negative, or near zero, and how large each coefficient is.',
          'The p-value and confidence display answer whether the sample association is distinguishable from zero. They do not answer which variable matters more.',
          'Partial and semi-partial results answer what is left after other variables are taken into account.',
          'The network answers which variables sit in the same neighborhood of associations.',
          'By Group answers whether the same pair looks similar inside categories. That comparison is descriptive.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'Association is not a mechanism. A third variable can create or hide the link you see.',
          'Pearson can look strong because of one extreme point, or weak because the relationship bends.',
          'A tiny p-value with a tiny coefficient is still a tiny association. A large coefficient in a very small sample is unstable.',
          'Holding variables constant in a partial correlation does not turn the result into a causal effect.',
          'Comparing many pairs inflates the chance of a small p-value. Read the pattern, not a single starred cell.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'One numeric column, and the question is its shape: univariate analysis.',
          'A numeric outcome and several predictors, with adjusted coefficients: regression.',
          'A yes-or-no outcome: logistic regression.',
          'Two categorical variables: contingency tables.',
          'Several items that should form one scale: scale reliability, or factor analysis if you are looking for latent dimensions.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The screens compute Pearson, Spearman, and Kendall correlations, plus partial and semi-partial correlations. They do not adjust for sampling weights or for a clustered design.'
        ],
        items: [
          'Pearson, K. (1896). Mathematical contributions to the theory of evolution. III. Philosophical Transactions of the Royal Society.',
          'Spearman, C. (1904). The proof and measurement of association between two things. American Journal of Psychology.',
          'Kendall, M. G. (1938). A new measure of rank correlation. Biometrika.',
          'Partial and semi-partial correlations follow the standard residual definition. They are linear adjustments, not a full causal model.'
        ]
      })
    ]
  };

  const contingency = {
    title: 'Contingency tables',
    lead: 'Contingency tables describe how two categorical variables occur together — for example, whether renewal (yes or no) lines up with plan type. The tests ask whether the table differs from independence. A difference does not establish why the categories are related.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You assign a row variable and a column variable. The module counts the combinations, then tests independence and reports the strength of the association.',
          'A 2×2 table can also show odds and risk comparisons. By Group repeats the table inside another category, as a description rather than a test of that split.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'Both variables are categories, not measurements.',
          'You want to know whether the row pattern depends on the column, or the reverse.',
          'You want a strength measure that does not grow just because the sample is large.',
          'You have a frequency column of already-counted cases instead of one row per person.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'A row variable and a column variable. Each data row is one observation, unless you assign a frequency column that already holds the counts.',
          'Empty categories and very small expected counts make the chi-square approximation shaky.',
          'A numeric measurement does not belong in either role. Compare groups on a number with independent samples or ANOVA.',
          'Ordered categories are treated as names here. The tests do not use the order.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'The table’s expected counts are what independence would produce from the row and column totals. The chi-square statistics compare the observed counts with those expected counts.',
          'For a 2×2 table with sparse cells, Fisher’s exact test is the safer probability. Cramér’s V rescales the association to run from 0 to 1.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Degrees of freedom are (rows − 1) × (columns − 1).',
            'Pearson’s chi-square sums (observed − expected)² / expected. The likelihood-ratio chi-square uses a different distance to the same independence model.',
            'Cramér’s V divides that association by sample size and table shape, so a large N does not by itself make V large.',
            'In a 2×2 table, phi, the odds ratio, and the risk ratio describe the same four cells on different scales.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'The counts and row or column percentages answer where the observations sit.',
          'Pearson and likelihood-ratio chi-square, and their p-values, answer whether the table is surprising under independence.',
          'Fisher’s exact p-value answers that question for a small 2×2 table without relying on the chi-square curve.',
          'Cramér’s V answers how strong the association is. A 2×2 table also answers the odds or risk comparison.',
          'Expected-count checks answer whether the chi-square approximation is comfortable.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'Independence is a statement about the joint table, not a claim that neither variable has a cause.',
          'A large sample can make a trivial association “significant.” Read V, or the odds ratio, beside the p-value.',
          'Cells with expected counts below 1, or many cells below 5, weaken the chi-square approximation. Prefer Fisher’s exact test for a sparse 2×2 table.',
          'Collapsing categories changes the association. Say which categories you combined.',
          'The by-group display compares descriptive strength. It is not a test that the association differs across groups.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'A numeric outcome and a grouping factor: independent samples, or ANOVA when there are several groups.',
          'A yes-or-no outcome and several predictors: logistic regression.',
          'Two numeric variables: correlation.',
          'Several studies of the same association, to be pooled: meta-analysis.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The screen reports Pearson’s chi-square, the likelihood-ratio chi-square, Fisher’s exact test for 2×2 tables, Cramér’s V, and the 2×2 odds and risk measures. It does not fit a log-linear model or a survey-weighted table.'
        ],
        items: [
          'Pearson, K. (1900). On the criterion that a given system of deviations is such that it can be reasonably supposed to have arisen from random sampling. Philosophical Magazine.',
          'Fisher, R. A. (1922). On the interpretation of χ² from contingency tables, and the calculation of P. Journal of the Royal Statistical Society.',
          'Cramér, H. (1946). Mathematical Methods of Statistics. Princeton University Press.'
        ]
      })
    ]
  };

  const independent = {
    title: 'Independent samples',
    lead: 'Independent samples compare a numeric measurement across separate groups — for example, whether monthly spend differs between two plans when each customer is in only one plan. A difference between groups does not establish what caused it.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'Each numeric column is one group, in wide format. Two groups are compared with a t-test or a rank test. More than two groups open the multi-group results, including Welch ANOVA.',
          'Welch’s t-test is the usual choice for two groups because it does not require equal variances. The Student t-test assumes equal variances. Mann–Whitney compares the ranks.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'The same measurement was taken on separate groups, and each case belongs to one group.',
          'You want a test of the group difference, not only a picture of each group.',
          'The groups were not formed by measuring the same people twice. That design belongs in repeated measures.',
          'You have more than two groups and want a comparison that does not assume equal variances.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'Wide format: one numeric column per group. Rows in different columns are different cases, not repeated measurements.',
          'At least two groups, with more than one observation in each group you want to test.',
          'A categorical label in a single column is not the layout this screen reads. Put each group in its own numeric column.',
          'Very small groups, or groups with almost no spread, make both the t-test and the rank test thin.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'The two-group screen estimates each group’s mean and spread, then tests the difference. Welch uses a separate variance for each group. The Student test pools the variances. Mann–Whitney ranks all of the values and compares the groups’ ranks.',
          'With more than two groups, Welch ANOVA asks whether the means differ without assuming equal variances. Follow-up comparisons still need a look at which groups differ.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Welch’s t uses the difference of means and a standard error built from the two variances and the two sample sizes. The degrees of freedom are approximate.',
            'The equal-variance t-test uses a pooled standard deviation.',
            'Mann–Whitney U is a rank statistic. It does not require normal data. It also does not estimate the difference of means.',
            'An effect size puts the mean difference on a common scale. A small p-value is not that size.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Group means and spreads answer where each group sits.',
          'The chosen test and its p-value answer whether the sample difference is surprising under a null of no difference.',
          'The effect size answers how large the difference is relative to the spread.',
          'The rank test answers the comparison when the values are skewed or the normal model is a poor fit.',
          'Welch ANOVA, when there are more than two groups, answers the overall mean comparison without an equal-variance assumption.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'The groups must be separate cases. Pairing, or the same person in both columns, belongs in repeated measures.',
          'Welch is safer than the equal-variance t-test when the spreads differ. The equal-variance test can misstate the p-value in that case.',
          'A rank test answers a different question than a difference of means. Do not describe it as a t-test.',
          'A significant difference is not a cause. The groups may differ for reasons you did not measure.',
          'With many groups, an overall test does not say which pair differs.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'The same cases measured at two or more times: repeated measures.',
          'Several grouping factors, or a factorial layout: ANOVA.',
          'A numeric outcome and continuous predictors: regression.',
          'Only a description of one group, with no comparison: univariate analysis.',
          'Planning how many cases you need: power and sample size, for the designs it calculates.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'Two-group results offer Welch’s t-test, the equal-variance Student t-test, and the Mann–Whitney U test. Multi-group results include Welch ANOVA. The module does not fit a covariate-adjusted model.'
        ],
        items: [
          'Welch, B. L. (1947). The generalization of “Student’s” problem when several different population variances are involved. Biometrika.',
          'Student (1908). The probable error of a mean. Biometrika.',
          'Mann, H. B., and Whitney, D. R. (1947). On a test of whether one of two random variables is stochastically larger than the other. Annals of Mathematical Statistics.'
        ]
      })
    ]
  };

  const dependent = {
    title: 'Repeated measures',
    lead: 'Repeated measures compare a numeric measurement taken more than once on the same cases — for example, a score before and after a workshop, with each row as one person. A change over time does not, by itself, establish what produced it.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'Each numeric column is one occasion, in wide format. Two occasions are a paired comparison. Three or more occasions are a repeated-measures comparison, with pairwise follow-ups.',
          'The parametric path uses paired differences. The rank path uses the Wilcoxon signed-rank test, and Friedman’s test when there are more than two occasions. Pairwise follow-ups can be adjusted with Holm.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'The same cases were measured at two or more times, or under two or more matched conditions.',
          'Each row lines the occasions up for one case. The columns are not independent groups.',
          'You want a test of the change, not only a plot of each occasion.',
          'You have more than two occasions and want to see which pairs differ after an overall test.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'Wide format: one numeric column per occasion, and one row per case. A missing occasion removes that case from the comparisons that need it.',
          'At least two occasions. A third occasion unlocks the multi-occasion results.',
          'Independent groups in separate columns do not belong here, even if the column names look like time.',
          'A very short series of cases makes the paired test and the rank test unstable.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'For two occasions the module analyses the within-case differences. The paired t-test treats those differences as the sample. The Wilcoxon signed-rank test ranks the differences and sets aside exact zeros.',
          'For more than two occasions, an overall test asks whether the occasions differ. Pairwise follow-ups then compare occasions two at a time, with Holm controlling the set of p-values.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'The paired t statistic is a one-sample t on the differences. Its standard error uses the standard deviation of those differences.',
            'Wilcoxon signed-rank uses the ranks of the absolute differences, signed by direction.',
            'Friedman ranks the occasions inside each case, then compares those ranks across occasions.',
            'Holm orders the pairwise p-values and applies a stepwise threshold. It is a correction for looking at many pairs, not a new effect size.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Occasion means answer where each time sits. The mean difference answers the typical change.',
          'The paired t or Wilcoxon result answers whether the change is surprising under a null of no shift.',
          'The effect size answers the size of the change relative to the spread of the differences.',
          'With more than two occasions, the overall test answers whether any difference is present. The pairwise table answers which occasions differ.',
          'Holm-adjusted p-values answer those pairs with a tighter rule because several were examined.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'Rows must be the same cases. If each column is a different group of people, use independent samples.',
          'A before-after change can reflect time, practice, or anything else that changed with the occasion. The test does not name the cause.',
          'The paired t-test is about the differences. Strong skew in the differences weakens that reading. The rank test is then the more cautious summary, and it is not a mean difference.',
          'Looking at every pair without a correction makes small p-values more likely. Read the Holm column if you are scanning all pairs.',
          'Dropping cases with a missing occasion can change who remains in the comparison.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'Separate groups, each case in only one group: independent samples.',
          'Occasions nested in people, with extra predictors or unequal timing: a linear mixed model.',
          'A factorial design with between-subject factors: ANOVA.',
          'Only a description of one occasion: univariate analysis.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'Two occasions use a paired t-test or the Wilcoxon signed-rank test. More than two occasions add an overall repeated-measures comparison, Friedman’s test, and pairwise follow-ups with Holm. The screen does not fit a mixed model.'
        ],
        items: [
          'Wilcoxon, F. (1945). Individual comparisons by ranking methods. Biometrics Bulletin.',
          'Friedman, M. (1937). The use of ranks to avoid the assumption of normality implicit in the analysis of variance. Journal of the American Statistical Association.',
          'Holm, S. (1979). A simple sequentially rejective multiple test procedure. Scandinavian Journal of Statistics.'
        ]
      })
    ]
  };

  const anova = {
    title: 'ANOVA',
    lead: 'ANOVA compares the mean of a numeric outcome across groups defined by one or more factors — for example, whether test scores differ by teaching method, or by method and campus together. A mean difference is not, by itself, a cause.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You set a dependent variable and one grouping factor for a one-way design, or two factors for a two-way design. A repeated-measures layout uses conditions on the same cases.',
          'The main table is the standard ANOVA. One-way between-subjects results also offer Welch ANOVA when variances differ, Kruskal–Wallis as a rank alternative, and pairwise follow-ups.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'A numeric outcome and at least one categorical factor with two or more levels.',
          'You want an overall test of means, then a look at which levels differ.',
          'Two factors, and you also want their interaction.',
          'The same cases under several conditions, as a repeated-measures design rather than independent groups.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'One numeric dependent variable.',
          'Grouping factors for a between-subjects design: one factor is one-way, two factors are two-way. Each case belongs to one combination of the factor levels.',
          'A repeated-measures design uses the conditions of the same cases. It is not a set of independent groups.',
          'Very small cells, or a factor with a single level, leave the comparison with little to estimate.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'ANOVA splits the outcome’s variation into a part associated with the factors and a residual part. The F statistic compares those parts.',
          'Levene’s test speaks to whether the group variances look equal. When they do not, a one-way design can move to Welch ANOVA and Games–Howell follow-ups. Kruskal–Wallis ranks the outcome instead of modelling the means. Tukey HSD is the equal-variance pairwise follow-up.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'The F ratio is variation among the means relative to variation left inside the cells. A large F is more surprising if the group means were truly equal.',
            'Welch ANOVA changes the denominator so unequal variances do not have to be pooled. It is computed for one-way designs.',
            'Kruskal–Wallis ranks the outcome and compares the groups’ average ranks. It is a one-way, between-subjects procedure here.',
            'Tukey HSD and Games–Howell examine pairs of means. They answer a different question from the overall F.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'The ANOVA table answers whether the factor, or the interaction, accounts for more variation than the residual.',
          'Effect sizes such as eta-squared answer how large that share is. The p-value does not.',
          'Levene’s test answers whether equal variances are a comfortable assumption.',
          'Welch ANOVA and Kruskal–Wallis answer the one-way comparison under a looser model.',
          'Tukey or Games–Howell answers which pairs of means differ.',
          'The group means answer where each level sits, which is the picture the tests are about.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'A significant factor is not an explanation of why the levels differ.',
          'Welch ANOVA and Kruskal–Wallis are not computed for two-way or repeated-measures designs. Those layouts stay with the standard table.',
          'If Levene’s test suggests unequal variances in a one-way design, prefer Welch and Games–Howell over the pooled F and Tukey.',
          'An overall F does not name the pair that differs. Read the follow-ups.',
          'Repeated measures assume the occasions belong to the same cases. Independent groups do not satisfy that.',
          'Mild non-normality is less worrying with larger cells. A small, heavily skewed cell is a weak place for a mean test.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'Exactly two independent groups and a single comparison: independent samples.',
          'Only paired occasions, in wide format: repeated measures.',
          'Extra numeric predictors, or cases nested in sites or people: a linear mixed model, or regression if there is no clustering.',
          'A yes-or-no outcome: logistic regression.',
          'A categorical outcome and a categorical predictor, as counts: contingency tables.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The module fits one-way, two-way, and repeated-measures ANOVA. One-way between-subjects results add Levene’s test, Welch ANOVA, Kruskal–Wallis, Tukey HSD, and Games–Howell. It does not fit a mixed model with random slopes.'
        ],
        items: [
          'Fisher, R. A. (1925). Statistical Methods for Research Workers. Oliver and Boyd.',
          'Welch, B. L. (1951). On the comparison of several mean values: an alternative approach. Biometrika.',
          'Kruskal, W. H., and Wallis, W. A. (1952). Use of ranks in one-criterion variance analysis. Journal of the American Statistical Association.',
          'Tukey, J. W. (1949). Comparing individual means in the analysis of variance. Biometrics.'
        ]
      })
    ]
  };

  const regression = {
    title: 'Linear regression',
    lead: 'Linear regression describes how predictors relate to a numeric outcome — for example, how study hours and section relate to an exam score. The coefficients are adjusted associations. They do not, by themselves, establish a cause.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You set one numeric outcome, numeric predictors, and categorical predictors. The fit is ordinary least squares, with an intercept unless you remove it.',
          'The results show coefficients, intervals, fit, collinearity, residual checks, and influence. By Group repeats the question inside categories.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'The outcome is a number, and you want the adjusted association of each predictor.',
          'You want a fitted value and a sense of how much variation the predictors account for.',
          'Categorical predictors are part of the same linear model, not a separate ANOVA you will ignore.',
          'Cases are independent enough that one row is one observation. Clustered rows belong in a mixed model.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'One numeric outcome. Each row is one case.',
          'Numeric predictors enter as measurements. Categorical predictors enter as groups; each needs more than one level.',
          'Rows missing the outcome or a predictor used in the model drop out of the fit.',
          'More predictors than rows, or predictors that are copies of each other, leave the fit unidentified or unstable.',
          'A yes-or-no outcome does not belong in this module.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'Least squares chooses coefficients so the squared gaps between observed and fitted outcomes are as small as possible. A coefficient is the change in the fitted outcome for a one-unit change in that predictor, with the other predictors held as they are in the model.',
          'Categorical predictors are represented by contrasts among their levels. Residual plots, variance-inflation factors, and Cook’s distance ask whether that straight-line summary is a fair one.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'The fitted outcome is a linear combination of the predictors, plus an intercept when it is included.',
            'Each coefficient has a standard error, a t statistic, and a confidence interval under the usual normal-error model.',
            'R² is the share of outcome variance matched by the fitted values. Adjusted R² penalises extra predictors. Neither is the importance of one predictor.',
            'VIF describes how much a predictor’s variance is inflated by its overlap with the others. Cook’s distance flags cases that pull the coefficients.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Coefficients, standard errors, t statistics, p-values, and intervals answer the adjusted association of each term.',
          'R², adjusted R², and the residual scale answer how tightly the outcome follows the fit.',
          'VIF answers whether predictors are too entangled to separate.',
          'Residual plots answer whether the straight line, and the spread of errors, look reasonable.',
          'Cook’s distance and related flags answer which cases pull the fit.',
          'By Group answers whether the same specification looks similar inside categories.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'A coefficient is not the effect of changing that predictor in the world. It is the association in this fitted model.',
          'Holding other predictors constant is only as complete as the predictors you included. An omitted variable can move every coefficient.',
          'A large sample makes tiny coefficients “significant.” Read the interval and the units.',
          'High VIF means the data do not separate those predictors cleanly. The signs can then be unstable.',
          'Curvature, a fan-shaped residual plot, or a few high-influence points can make the average line a poor summary.',
          'The model treats rows as independent. Repeated measures on the same person violate that unless the design is handled elsewhere.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'A yes-or-no outcome: logistic regression.',
          'Cases nested in people, sites, or waves: a linear mixed model.',
          'Group means with factors and no continuous predictors: ANOVA.',
          'Only pairwise association, without an adjusted model: correlation.',
          'One variable’s distribution: univariate analysis.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The fit is ordinary least squares. Diagnostics include residual summaries, VIF, and Cook’s distance. The module does not fit a robust or penalised regression, and it does not claim a causal graph.'
        ],
        items: [
          'Cook, R. D. (1977). Detection of influential observation in linear regression. Technometrics.',
          'Belsley, D. A., Kuh, E., and Welsch, R. E. (1980). Regression Diagnostics. Wiley. (collinearity and influence)',
          'Draper, N. R., and Smith, H. (1998). Applied Regression Analysis. Wiley.'
        ]
      })
    ]
  };

  const logistic = {
    title: 'Logistic regression',
    lead: 'Logistic regression examines how predictors relate to the probability of a binary outcome — for example, whether a customer renews a subscription. It can describe associations and generate predicted probabilities. Those associations alone do not establish causation.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You set a binary outcome coded 0 and 1, plus numeric and categorical predictors. The model relates those predictors to the log odds of the outcome being 1.',
          'Results include odds ratios, fit summaries such as McFadden and Nagelkerke R², and a ROC view with a classification threshold you can move.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'The outcome is two categories, and you want the probability of one of them.',
          'You have several predictors and want each association adjusted for the others in the model.',
          'You want predicted probabilities, not only a yes-or-no label.',
          'A numeric outcome would belong in linear regression. A table of two categories with no predictors belongs in contingency tables.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'One binary outcome. The setup asks for 0/1. Each row is one case.',
          'Numeric predictors are measurements. Categorical predictors are groups with more than one observed level.',
          'Both outcome values need to occur. A column that is all 0s or all 1s has nothing to model.',
          'Rare events, or many predictors relative to the smaller outcome count, make odds ratios unstable.',
          'Rows missing the outcome or a used predictor are left out of the fit.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'The model writes the log odds of the outcome as a linear combination of the predictors. The odds ratio for a predictor is the multiplicative change in the odds for a one-unit increase, with the other predictors held as they are in the model.',
          'Fitted probabilities are the inverse of that log-odds scale. A threshold turns a probability into a classified 0 or 1. The ROC curve shows the trade-off as that threshold moves.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'If p is the probability of outcome 1, the model uses log(p / (1 − p)).',
            'An odds ratio of 1 is no association on this scale. An interval that contains 1 is compatible with no association, at the stated confidence level.',
            'McFadden R² compares the model’s log likelihood with an intercept-only model. Nagelkerke R² rescales a related likelihood summary so that 1 is the top of the scale. Neither is the R² of a linear regression.',
            'AUC is the area under the ROC curve. A value of 0.5 matches chance ranking of events above non-events.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Coefficients and odds ratios answer the adjusted association of each predictor on the odds scale.',
          'Predicted probabilities answer the model’s chance of outcome 1 for each case.',
          'The ROC curve and AUC answer how well the probabilities rank events above non-events.',
          'The threshold answers what happens if you turn those probabilities into classes at a chosen cutoff. Sensitivity and specificity move together as you move it.',
          'Calibration and fit summaries answer whether the probabilities, not only the ranking, look reasonable.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'An odds ratio is not a risk difference, and it is not a causal effect.',
          'A predictor’s association depends on which other predictors are in the model.',
          'Separation — a predictor that almost perfectly splits 0 from 1 — can send a coefficient toward infinity. Treat a huge odds ratio with a huge interval as a warning, not a finding.',
          'Accuracy at a single threshold can look good when one outcome is rare, even if the model barely ranks the cases. Read AUC and the threshold trade-off.',
          'Pseudo R² values are not “percent of variance explained” in the linear-regression sense.',
          'The model treats rows as independent.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'A numeric outcome: linear regression.',
          'Two categorical variables and no covariate adjustment: contingency tables.',
          'Cases nested in clusters: a mixed model, if the outcome and the clustering match that module.',
          'Only the distribution of one 0/1 column, with no predictors: a simple proportion, not a regression.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The fit is a binary logistic model. Summaries include odds ratios, McFadden and Nagelkerke pseudo R², and ROC/AUC with a movable threshold. It does not fit an ordinal or multinomial outcome.'
        ],
        items: [
          'Hosmer, D. W., Lemeshow, S., and Sturdivant, R. X. (2013). Applied Logistic Regression. Wiley.',
          'McFadden, D. (1974). Conditional logit analysis of qualitative choice behavior. In Frontiers in Econometrics.',
          'Nagelkerke, N. J. D. (1991). A note on a general definition of the coefficient of determination. Biometrika.'
        ]
      })
    ]
  };

  const mixedModel = {
    title: 'Linear mixed model',
    lead: 'A linear mixed model relates predictors to a numeric outcome when rows are clustered — for example, test scores of students who share a classroom. The fixed coefficients are adjusted associations. They do not establish a cause, and the clustering is part of the uncertainty.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You set an outcome, categorical and numeric predictors, and a cluster or subject id. An optional time or wave column marks repeated occasions.',
          'Cases that share an id can have their own intercept. The fit reports fixed effects, variance components, and the intraclass correlation. REML is the default estimation method; maximum likelihood is available when you need it.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'Several rows belong to the same person, team, site, or other cluster.',
          'You want predictor associations that respect that clustering, rather than pretending the rows are independent.',
          'You want to know how much of the outcome’s variation sits between clusters.',
          'A single row per case, with no clustering, is ordinary regression.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'One numeric outcome and a cluster id with more than one row in at least some clusters.',
          'Numeric and categorical predictors, as in a linear model. Categorical predictors need more than one observed level.',
          'Time or wave, if you use it, marks the occasion inside the cluster. It does not replace the subject id.',
          'A cluster with a single row still contributes to the fixed part, but it says little about that cluster’s intercept.',
          'A binary outcome is not what this screen models.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'The fixed part looks like a linear regression. The random part lets each cluster have its own intercept, drawn around a common mean. The residual is what remains inside the cluster.',
          'REML estimates the variance components with less of the downward bias that maximum likelihood can have. The intraclass correlation is the share of variation that sits between clusters.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'The outcome is a fixed linear predictor plus a cluster intercept plus a residual.',
            'The random-intercept variance and the residual variance are the two pieces of that split. ICC is the intercept variance divided by the sum of the two.',
            'Fixed-effect tests use the estimated variances. Degrees of freedom can use a Satterthwaite approximation.',
            'Maximum likelihood and REML answer slightly different estimation problems. Comparing models that change the fixed predictors is a reason to look at maximum likelihood.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Fixed-effect estimates, tests, and intervals answer the average association of each predictor.',
          'Variance components answer how much variation is between clusters and how much is left over.',
          'The ICC answers whether the clustering is large enough to matter. A value near 0 means the rows are barely grouped.',
          'Fitted values and residual checks answer whether the linear summary is reasonable.',
          'The estimation method on the screen answers whether you are looking at REML or maximum likelihood.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'A fixed coefficient is still an association in the model, not a causal effect.',
          'Random intercepts allow clusters to sit higher or lower. They do not automatically fit a different slope in every cluster unless the model says so.',
          'A small number of clusters makes the between-cluster variance, and the fixed-effect standard errors, imprecise.',
          'An ICC near 0 does not prove the rows are independent. It means this outcome shows little clustering.',
          'REML and maximum likelihood can disagree slightly. Do not treat a tiny difference between them as a new finding.',
          'Missing rows are missing occasions or cases. The model does not restore them.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'One row per case and no cluster id: linear regression.',
          'Group means with factors and no random intercept: ANOVA.',
          'Wide-format repeated measures with a few occasions and no extra covariates: the repeated-measures module.',
          'A binary outcome: logistic regression, which does not fit this clustering either.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The screen fits a linear mixed model with random intercepts, using REML or maximum likelihood. It reports fixed effects, variance components, and the ICC. It is not a generalized linear mixed model for binary outcomes.'
        ],
        items: [
          'Laird, N. M., and Ware, J. H. (1982). Random-effects models for longitudinal data. Biometrics.',
          'Satterthwaite, F. E. (1946). An approximate distribution of estimates of variance components. Biometrics Bulletin.',
          'Pinheiro, J. C., and Bates, D. M. (2000). Mixed-Effects Models in S and S-PLUS. Springer.'
        ]
      })
    ]
  };

  const factor = {
    title: 'Factor analysis',
    lead: 'Factor analysis asks whether a set of numeric items reflects a smaller number of latent dimensions — for example, whether ten opinion items line up as two underlying attitudes. A factor is a summary of correlations. It is not proof of a cause.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You choose the numeric items, how many factors to extract, an extraction method, and a rotation. The setup checks whether the correlations are strong enough to factor, using KMO and Bartlett’s test.',
          'Extraction can be principal components or principal axis factoring. Rotation can be Varimax, Promax, Oblimin, or none. Factor scores can be estimated afterward.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You have several items that may express a few shared constructs.',
          'You want loadings, not a prediction equation for a single outcome.',
          'You are exploring structure. A scale you already trust can instead be checked with scale reliability.',
          'You want a compressed representation of variance, without a latent-factor story: principal components.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'At least two numeric items, and in practice more. Each row is one respondent or case.',
          'Items should be comparable measurements. Mixing unrelated units makes the correlations hard to interpret.',
          'KMO and Bartlett’s test need a correlation matrix that is not an identity. A set of nearly unrelated items is a poor candidate.',
          'More cases than items is the comfortable direction. A tiny sample makes loadings unstable.',
          'Categories and a single outcome variable are not the input.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'The module starts from the correlations among the items. Extraction looks for a few dimensions that account for the shared pattern. Rotation turns that solution so the loadings are easier to read.',
          'Varimax keeps factors uncorrelated. Promax and Oblimin allow them to correlate. Principal axis factoring aims at shared variance. A principal-components extraction uses all of the variance, which is a different target.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'KMO summarises how much of each item’s correlation is shared with the others. Bartlett’s test asks whether the correlation matrix differs from an identity matrix.',
            'A loading is the association between an item and a factor after the chosen extraction and rotation.',
            'Communality is the share of an item’s variance associated with the factors. Uniqueness is what remains.',
            'Regression, Bartlett, and Anderson–Rubin are different ways to compute case-level scores. Anderson–Rubin scores are built to be uncorrelated.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'KMO, Bartlett’s test, and the suitability summary answer whether factoring is reasonable.',
          'Eigenvalues and the number of factors answer how many dimensions you are keeping.',
          'The loading table answers which items belong with which factor, under the rotation you chose.',
          'Communalities answer how much of each item the factors account for.',
          'Factor scores, if you compute them, answer where each case sits on those dimensions.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'A factor name is your interpretation of the loadings. The procedure does not name the construct.',
          'Choosing a different number of factors, or a different rotation, can move items from one factor to another.',
          'Principal components and principal axis factoring answer different questions. Do not describe a components solution as shared latent variance.',
          'An oblique rotation means the factors may correlate. Treating them as independent scores would misstate that solution.',
          'A significant Bartlett test only says the items are not all uncorrelated. It does not say the factor story is the right one.',
          'Factor analysis does not validate a scale by itself. Reliability is a different question.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'You want components that summarise total variance, not a latent factor: principal components.',
          'You already have a scale and want alpha or omega: scale reliability.',
          'You want groups of cases, not groups of variables: cluster analysis.',
          'You want one outcome predicted from the items: regression.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The setup offers principal components or principal axis factoring, and Varimax, Promax, Oblimin, or no rotation. Suitability uses KMO and Bartlett’s test of sphericity. The module is exploratory. It does not fit a confirmatory factor model.'
        ],
        items: [
          'Kaiser, H. F. (1970). A second generation little jiffy. Psychometrika. (KMO)',
          'Bartlett, M. S. (1950). Tests of significance in factor analysis. British Journal of Psychology.',
          'Kaiser, H. F. (1958). The varimax criterion for analytic rotation in factor analysis. Psychometrika.',
          'Thurstone, L. L. (1947). Multiple-Factor Analysis. University of Chicago Press.'
        ]
      })
    ]
  };

  const pca = {
    title: 'Principal components',
    lead: 'Principal components compress several numeric variables into a smaller set of scores — for example, six product ratings reduced to two scores that carry most of the variation. A component is a weighted summary of the variables. It is not a latent cause.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You choose the numeric variables and how many components to keep. The analysis builds uncorrelated components ordered by how much variance they carry.',
          'The scree plot and the Kaiser count (eigenvalues at least 1) help you look at that choice. Rotation is optional and, for a pure components solution, often left off.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You have many correlated measurements and want a shorter set of scores.',
          'The goal is to summarise total variance, not to estimate a latent factor from shared variance only.',
          'You want the components uncorrelated, so later steps do not inherit the original overlap.',
          'You are exploring a scale’s latent structure instead: factor analysis.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'At least two numeric variables. Each row is one case.',
          'Variables on very different scales should be treated carefully. A variable with a huge range can dominate the first component if you do not put them on a common scale.',
          'More cases than variables is the comfortable direction.',
          'Categories are not components. A grouping of cases is cluster analysis.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'The first component is the direction in which the variables vary together the most. Each later component is the next-best direction, uncorrelated with the ones before it.',
          'An eigenvalue is the variance that component carries. The scree plot shows those values in order. Kaiser’s rule counts how many are at least 1 when the analysis is on the correlation scale.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Components are eigenvectors of the correlation or covariance structure. The eigenvalue is the variance along that eigenvector.',
            'The proportion of variance explained is the eigenvalue divided by the total of the eigenvalues.',
            'A loading is the association between a variable and a component.',
            'Because later components are built to be uncorrelated with earlier ones, they are not a rotation toward a simple latent story unless you rotate them.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Eigenvalues and the variance chart answer how many components carry meaningful variation.',
          'The scree plot answers where the drop-off after the large components happens.',
          'The Kaiser count answers how many eigenvalues are at least 1. It is a rule of thumb, not a test.',
          'Loadings answer which variables define each component.',
          'Component scores answer where each case sits in that reduced space.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'A component does not name itself. The label is your reading of the loadings.',
          'Kaiser’s rule can keep noise components or drop a useful smaller one. Look at the scree plot beside it.',
          'A variable with a much larger raw scale can take over the first component. Know whether the analysis used correlations or the raw covariances.',
          'Principal components use all of the variance. They are not principal axis factoring and not a confirmatory model.',
          'Uncorrelated components are a property of the extraction. Rotating them gives up that property.',
          'Compression is not explanation. The components do not say why the variables move.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'A latent-factor story, with shared variance and rotation aimed at constructs: factor analysis.',
          'Internal consistency of a scale you already defined: scale reliability.',
          'Groups of cases rather than summaries of variables: cluster analysis.',
          'One outcome and predictors: regression.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The screen extracts principal components, reports eigenvalues, a scree plot with a Kaiser line at 1, loadings, and scores. It does not test a confirmatory structure.'
        ],
        items: [
          'Hotelling, H. (1933). Analysis of a complex of statistical variables into principal components. Journal of Educational Psychology.',
          'Kaiser, H. F. (1960). The application of electronic computers to factor analysis. Educational and Psychological Measurement. (eigenvalues of at least 1)',
          'Jolliffe, I. T. (2002). Principal Component Analysis. Springer.'
        ]
      })
    ]
  };

  const reliability = {
    title: 'Scale reliability',
    lead: 'Scale reliability asks whether a set of items hangs together as one score — for example, whether five agreement items can be added into a single satisfaction score. Consistency is not validity, and it does not say what the score means.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You choose the numeric items that belong on the scale and, where needed, which items are reverse-coded. The module estimates Cronbach’s alpha and McDonald’s omega total.',
          'Item diagnostics show what happens to alpha if an item is removed, and whether an item moves with the others.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You already intend the items to be one scale, and you want a consistency check.',
          'Some items are worded in the opposite direction and need to be reversed before they are summed.',
          'You are deciding whether a weak item is hurting the score.',
          'You do not yet know how many dimensions the items have. That question is factor analysis, before or beside a reliability check.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'At least two numeric items. Three or more is the more useful scale.',
          'Each row is one respondent. A respondent needs values on the items used in the coefficient.',
          'Reverse-coded items need the score range they were written on, so the reversal points the right way.',
          'Items that measure different constructs will not form a high alpha, and they should not be forced into one score.',
          'A single outcome predicted from covariates is not a scale.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'Alpha treats the items as repeated indicators of one score and rises when the items correlate and when there are more of them. Omega total uses a factor summary of the items, then combines the loadings.',
          'Reverse coding flips an item so that a high response means the same direction as the rest of the scale. The worksheet is not rewritten. The reversal is for this analysis.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Cronbach’s alpha depends on the number of items and the average covariance among them, relative to the total variance of the sum.',
            'A negative alpha means the items are negatively related on average. That usually signals a missed reverse code or items that do not belong together.',
            'Omega total is computed from principal-axis loadings. An item’s uniqueness is what the loading does not account for.',
            '“Alpha if deleted” refits the coefficient without that item. A rise means the item was pulling the scale down.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Alpha answers the classic internal-consistency summary, including a confidence interval when it is shown.',
          'Omega total answers a consistency summary that uses the factor loadings rather than alpha’s equal-item assumption.',
          'Item-deleted diagnostics answer which item helps or hurts.',
          'The reversed-item list answers which direction you applied before the coefficients were computed.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'A high alpha is not validity. Items can be consistent and still measure the wrong thing.',
          'Alpha rises with the number of items. A long scale can look reliable even when the typical correlation is modest.',
          'Alpha assumes the items are essentially one dimension with similar relationships. A scale with two clusters of items can mislead it. Omega is the more cautious companion, not a cure for a muddled scale.',
          'Forgetting a reverse code pulls alpha down and can make it negative.',
          'Reliability of this sample is not reliability in every future sample.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'You need to discover how many dimensions the items have: factor analysis.',
          'You want uncorrelated summaries of total variance: principal components.',
          'You want the items as predictors of an outcome: regression.',
          'You want groups of respondents rather than a score: cluster analysis.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The screen estimates Cronbach’s alpha and McDonald’s omega total, with item diagnostics and optional reverse coding. It does not estimate test-retest reliability or inter-rater agreement.'
        ],
        items: [
          'Cronbach, L. J. (1951). Coefficient alpha and the internal structure of tests. Psychometrika.',
          'McDonald, R. P. (1999). Test Theory: A Unified Treatment. Lawrence Erlbaum. (omega)',
          'A negative alpha is reported as a warning about item direction, not as a usable consistency value.'
        ]
      })
    ]
  };

  const cluster = {
    title: 'Cluster analysis',
    lead: 'Cluster analysis puts cases into groups from the variables you choose — for example, customers grouped by how they use three features. The groups are a summary of similarity. They are not true types the data were required to contain, and they are not a cause.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You choose the numeric variables, a method, and the settings that method needs. K-means partitions cases around k centers. Hierarchical clustering builds a merge tree.',
          'Standardizing the variables is on unless you turn it off, so a variable with a large range does not automatically dominate the distance. Results include sizes, profiles, and silhouette summaries.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You want groups of cases, and you do not already have a grouping variable.',
          'K-means suits a chosen number of compact groups of roughly similar size.',
          'Hierarchical clustering suits a look at how cases merge, including several possible values of k on one tree.',
          'You already know the groups and want to compare them: that is a comparison module, not clustering.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'Two or more numeric variables are the usual input. Each row is one case to be grouped.',
          'K-means needs a number of clusters, k. Hierarchical clustering needs a linkage: average (UPGMA), complete, or single.',
          'Variables on different scales should usually stay standardized. Turn that off only when the raw units are already comparable and you mean those units to define distance.',
          'A categorical label is not a clustering variable here. It can be used later to describe the groups the algorithm found.',
          'Outliers and duplicate rows pull distance-based groups.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'K-means starts with k centers, assigns each case to the nearest center, moves the centers to the assigned cases, and repeats. Hierarchical clustering starts with cases and merges the closest clusters according to the linkage you chose.',
          'Average linkage uses the average distance between clusters. Complete linkage uses the farthest pair. Single linkage uses the nearest pair. The silhouette compares a case’s closeness to its own cluster with its closeness to the next-best cluster.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Distance is computed in the space of the selected variables, after standardization if that option is on.',
            'K-means reduces the within-cluster sum of squares. It can stop at a local solution, so a different start can move the groups.',
            'A silhouette near 1 means the case sits clearly in its cluster. A value near 0 means it is on the boundary. A negative value means it is closer to another cluster.',
            'There is no single correct k. The silhouette and the separation of the centers are checks, not a proof.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Cluster sizes answer how the cases were split.',
          'Profiles answer what a typical member of each cluster looks like on the variables you used.',
          'The silhouette answers how cleanly the cases sit in their groups.',
          'For hierarchical clustering, the dendrogram answers the order of merges and what happens at several values of k.',
          'Diagnostics answer whether k-means settled and how much variation the groups capture.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'The algorithm will return groups even when the cases are one cloud. A weak silhouette is a reason to doubt the split.',
          'K-means looks for compact, roughly round groups in the distance you used. Long or uneven shapes can be split awkwardly.',
          'Single linkage can chain cases into a long group. Complete linkage prefers compact groups. The linkage is a choice, not a discovery.',
          'Changing k changes the story. Report the k you used.',
          'Standardizing changes which variables matter. So does leaving a variable in or out.',
          'A cluster profile is not a causal type, and it is not stable proof that the same groups exist in a new sample.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'You already have groups and want to test a numeric outcome: independent samples or ANOVA.',
          'You want to summarise variables rather than group cases: principal components or factor analysis.',
          'You want one outcome predicted from the variables: regression.',
          'You want items to form a score: scale reliability.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The setup runs k-means or hierarchical clustering with average, complete, or single linkage, with optional standardization. Summaries include sizes, profiles, and silhouettes. It does not fit a mixture model with membership probabilities.'
        ],
        items: [
          'MacQueen, J. (1967). Some methods for classification and analysis of multivariate observations. Proceedings of the Fifth Berkeley Symposium.',
          'Sokal, R. R., and Michener, C. D. (1958). A statistical method for evaluating systematic relationships. University of Kansas Science Bulletin. (average linkage)',
          'Rousseeuw, P. J. (1987). Silhouettes: a graphical aid to the interpretation and validation of cluster analysis. Journal of Computational and Applied Mathematics.'
        ]
      })
    ]
  };

  const metaAnalysis = {
    title: 'Meta-analysis',
    lead: 'Meta-analysis pools a quantitative result across studies — for example, the average benefit of a program when each row is one study, not one person. The pooled estimate is only as relevant as the studies you included. It does not create a cause the studies did not have.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You choose a data structure and an effect measure, then assign the columns that structure needs. Continuous studies can use Hedges’ g, a mean difference, or Cohen’s d. Binary studies can use an odds ratio, a risk ratio, or a risk difference. Precomputed effects can be pasted on the scale the screen names.',
          'The pool is fixed-effect or random-effects. Results include the pooled estimate, heterogeneity, a forest plot, and funnel-plot checks.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You have several studies of the same kind of effect, and you want one summary.',
          'The studies report enough numbers to build a common effect measure, or you already have the effects and their standard errors.',
          'You want a picture of how much the studies disagree, not only the average.',
          'A single table or a single experiment is not a meta-analysis. Analyse that dataset in the module that matches its design.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'Each row is a study, or a study arm comparison, not a person — unless you have deliberately built one effect per row.',
          'Continuous input needs the means, spreads, and sample sizes the chosen measure requires. Enter standard deviations where the screen asks for them, not standard errors.',
          'Binary input needs the 2×2 counts. Precomputed input needs the effect on the scale you selected, such as a log odds ratio rather than the odds ratio itself, and a matching standard error.',
          'Hedges’ g is the default standardized mean difference when studies used different scales. A raw mean difference requires the same measurement scale in every study.',
          'A missing spread or a zero count can make an effect undefined. Very small study samples make a standardized difference unstable.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'Each study contributes an effect and a weight. A fixed-effect pool treats the studies as estimates of one common effect. A random-effects pool allows the true effects to differ and estimates that extra variation as τ².',
          'Heterogeneity appears as Q, I², and τ². A prediction interval, under random effects, speaks to a new similar study. Funnel and Egger summaries ask whether small studies sit asymmetrically.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Weights are inverse variances. More precise studies pull the pool more.',
            'I² is the share of observed variation attributed to heterogeneity rather than sampling error. τ² is the variance of the true effects under a random-effects model. Both are zero in a fixed-effect fit.',
            'With Hartung–Knapp, the pooled effect is judged with a t reference on k − 1 degrees of freedom. Otherwise the screen uses a Wald z test.',
            'A 95% confidence interval is about the average effect. A prediction interval is wider when τ² is above zero, and it is not shown for a fixed-effect model.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'The pooled effect and its interval answer the average result on the scale you chose.',
          'The forest plot answers where each study sits relative to that average.',
          'Q, I², and τ² answer how much the studies disagree beyond sampling error.',
          'The prediction interval answers a range for a new similar study under random effects.',
          'The funnel plot and Egger’s test answer whether small studies are asymmetric. Asymmetry is not automatic proof of missing studies.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'Pooling does not repair a biased study. The average of biased studies can still be biased.',
          'Studies have to be similar enough that one effect measure means the same thing. Mixing unlike outcomes produces a number without a subject.',
          'I² at 0% does not prove the studies are identical. With few studies, I², τ², and bias tests are imprecise.',
          'A fixed-effect interval is too narrow if the true effects really differ. A random-effects interval does not fix a bad effect measure.',
          'Funnel asymmetry can be bias, or a real difference between small and large studies, or chance.',
          'Choosing log odds ratios and then typing odds ratios on the raw scale will pool the wrong numbers.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'One study, one sample: the module that matches that design, such as ANOVA, regression, or a two-group comparison.',
          'A single 2×2 table: contingency tables.',
          'Individual participant data with clustering: a mixed model, if you have the rows rather than published summaries.',
          'A descriptive literature review without a common effect: not this calculator.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The screen pools fixed-effect and random-effects summaries for the effect measures named in the setup, with heterogeneity, forest and funnel displays, and Egger’s test. It does not impute missing studies or fit a network meta-analysis.'
        ],
        items: [
          'Hedges, L. V. (1981). Distribution theory for Glass’s estimator of effect size and related estimators. Journal of Educational Statistics.',
          'DerSimonian, R., and Laird, N. (1986). Meta-analysis in clinical trials. Controlled Clinical Trials.',
          'Higgins, J. P. T., and Thompson, S. G. (2002). Quantifying heterogeneity in a meta-analysis. Statistics in Medicine. (I²)',
          'Hartung, J., and Knapp, G. (2001). On tests of the overall treatment effect in meta-analysis with normally distributed responses. Statistics in Medicine.',
          'Egger, M., Davey Smith, G., Schneider, M., and Minder, C. (1997). Bias in meta-analysis detected by a simple, graphical test. BMJ.'
        ]
      })
    ]
  };

  const power = {
    title: 'Power and sample size',
    lead: 'Power and sample size ask whether a study of a stated size is likely to detect an effect of a stated size — for example, how many observations an ANOVA needs to detect a medium group difference at the alpha you choose. The result is a planning number. It is not the probability that a hypothesis is true.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'You can compute power for a chosen sample size, or the sample size that reaches a target power. The calculation that runs today is ANOVA, using Cohen’s f, alpha, and the design inputs on the screen.',
          'The menu also lists means, correlation, proportions, and regression. Those calculations are not available yet. Switching to one of them does not produce a power result.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You are planning an ANOVA and want either the power of a given N or the N for a target power.',
          'You have a smallest effect, as Cohen’s f, that would be worth detecting.',
          'You want the conventional comparison with 80% power, or a higher target you set.',
          'You already have the data and want the test itself. Run ANOVA, not this planning screen.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'No outcome column is required. The inputs are design choices: the test, alpha, the effect size, and either N or the target power.',
          'Cohen’s f is the standardized effect the ANOVA power formula uses. Benchmarks on the screen describe negligible, small, medium, and large values.',
          'The number of groups and the per-group or total sample size have to match the design you intend to run.',
          'A power result for means, correlation, proportions, or regression cannot be read from this screen until those options are calculated.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'Power is the probability of a significant ANOVA if the true effect really is the Cohen’s f you entered, and if the design and alpha match the form. Sample-size mode reverses that question and looks for the N that reaches the power you asked for.',
          'The curve shows how power changes with N for the effect and alpha you set. It is a planning picture, not a fit to observed data.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Alpha is the threshold for a significant result if the true effect is zero. Power is 1 − β, where β is the probability of missing an effect of the stated size.',
            'Cohen’s f expresses the spread of the group means relative to the within-group spread.',
            'A larger effect, a larger N, or a larger alpha each raise power. They do not change what the future sample will actually show.',
            'The 80% line is a convention, not a scientific law.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'In power mode, the percentage answers how often an ANOVA of this size would detect the effect you specified.',
          'β answers the corresponding miss rate.',
          'The gauge answers that percentage against the usual 80% and 90% marks.',
          'In sample-size mode, N answers how many observations the same formula requires for the power you chose.',
          'The curve answers how that power moves as N changes.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'Power is not the probability that the null hypothesis is false, and it is not the probability that a significant result is real.',
          'The number is only as relevant as the effect size you typed. An optimistic f produces an optimistic power.',
          'The calculation assumes the ANOVA model you are planning. Unequal variances, extra factors, or a different test are a different calculation.',
          'Means, correlation, proportions, and regression are listed and marked as not yet calculated. Do not treat a “coming soon” switch as a result.',
          'A high planned power does not guarantee a significant study. It is an average property of the design.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'You have the observations and want the group comparison: ANOVA.',
          'You want a confidence interval from data you already collected: the module for that design.',
          'You need power for a two-group t-test, a correlation, a proportion, or a regression coefficient: those options are not calculated here yet.',
          'You want a description of a sample rather than a plan: univariate analysis or the matching results module.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The working calculation is ANOVA power and sample size from Cohen’s f and alpha. Other test types in the menu are not yet implemented.'
        ],
        items: [
          'Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences. Lawrence Erlbaum. (Cohen’s f)',
          'A conventional target of 80% power is a planning benchmark. The screen also marks 70%, 90%, and 95%.'
        ]
      })
    ]
  };

  const capability = {
    title: 'Process capability',
    lead: 'Process capability compares one numeric measurement with specification limits you set, such as whether etch times stay between a lower and an upper limit. Pp and Ppk use the overall sample standard deviation. They describe this sample. They do not prove the process is stable.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'The module summarises the selected column against a lower limit, an upper limit, and an optional target. Pp describes the spread relative to the width of the specification. Ppk describes the worse side, so a centred process and an off-centre process with the same spread do not receive the same Ppk.',
          'The Capability Planner asks what mean, standard deviation, or outward specification change would reach a Ppk, modeled-yield, or expected-PPM goal. By Group repeats the indices inside categories.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You have one numeric measurement and numeric specification limits.',
          'You want to know whether the current spread and location leave the values inside those limits.',
          'You want a normal-model yield or an expected parts-per-million figure.',
          'You want to see how far the mean or the standard deviation would have to move to reach a goal.',
          'You want the same description split by a grouping column, without a formal test that the groups differ.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'One numeric measurement column. Each row is one observation.',
          'A lower specification limit and an upper specification limit. The target is optional. A blank target uses the midpoint, and that midpoint is used for Cpm.',
          'A grouping column is separate. It is used only when you open By Group.',
          'Rows that are not numbers are left out of the measurement.',
          'The standard deviation is the overall sample standard deviation, with divisor n − 1. This screen has no within-subgroup estimator.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'Pp is the specification width divided by six standard deviations. Cpu and Cpl measure the room from the mean to each limit. Ppk is the smaller of those two. Cpm also penalises distance from the target.',
          'Expected PPM and yield use a normal curve with this mean and this standard deviation. They are model estimates, not a count of the defects in the sample. The planner searches inside the constraints you enter. Process improvement can keep the current standard deviation or reduce it. It does not raise it.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'The standard deviation uses the sample divisor n − 1.',
            'Pp = (USL − LSL) / (6s). Cpu = (USL − mean) / (3s). Cpl = (mean − LSL) / (3s). Ppk = min(Cpu, Cpl).',
            'A Ppk of 1.33 means the nearer specification limit is 3 × 1.33 standard deviations from the mean.',
            'The normal tail uses the same approximation as the process capability calculator. It is not a high-precision normal integral.',
            'The By Group status compares reliable groups. It is a description, not a hypothesis test.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Capability shows the gauge, Pp, Ppk, Cpu, Cpl, Cpm, expected PPM, yield, and the distribution against the limits.',
          'The planner shows whether the goal is reachable at the current standard deviation, the smallest mean shift, the extra margin from centering, or the reduction required when the current standard deviation cannot meet the goal.',
          'By Group shows each level’s indices and whether the limiting specification stays the same.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'Pp and Ppk on this screen are not Cp and Cpk from a within-subgroup standard deviation. Do not report them as within-process capability.',
          'Yield and expected PPM assume a normal distribution. A skewed measurement can make those tails misleading.',
          'A high Ppk does not prove the process is stable, and it does not promise that the next lot will match this sample.',
          'A planner scenario is a calculation. It is not written back to the worksheet, and it is not evidence that the process can be moved there.',
          'By Group is descriptive. It does not test whether the groups differ.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'A formal comparison of group means or variances: independent samples, or ANOVA when there are more than two groups.',
          'A model of how settings change a response: regression, or Process Settings Explorer.',
          'A within-subgroup capability study that uses rational subgroups: not this screen.',
          'One measurement and no specification limits: univariate analysis.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The indices match the process capability calculator. They are the overall, or performance, indices. Within-process Cp and Cpk are not calculated here.'
        ],
        items: [
          'Montgomery, D. C. Introduction to Statistical Quality Control. The overall indices use the standard deviation of all the observations.',
          'Minitab’s Normal Capability Analysis reports overall capability (Pp, Ppk) separately from within capability. This module reports the overall indices only.',
          'The normal tail is the calculator’s approximation, not a high-precision evaluation of the normal distribution.'
        ]
      })
    ]
  };

  const gageRr = {
    title: 'Crossed Gage R&R',
    lead: 'Crossed Gage R&R separates measurement-system variation from part-to-part variation. Each operator measures every part the same number of times. The parts should represent the variation you need to distinguish. The result describes this study.',
    sections: [
      section('does', 'What it does', {
        paragraphs: [
          'The module fits a balanced two-way random-effects model: Part, Operator, Part × Operator, and repeatability. It reports variance, standard deviation, study variation (6 × SD), percent contribution, percent study variation, and percent tolerance when both specification limits are valid.',
          'The number of distinct categories is the truncated value 1.41 × part-to-part SD / Total Gage R&R SD, and at least 1, when the gage standard deviation is positive.'
        ]
      }),
      section('when', 'When to use it', {
        items: [
          'You have continuous readings in long form, one reading per row.',
          'Every operator measured every part the same number of times, at least twice.',
          'You want to see how much of the observed variation comes from the measurement system.',
          'You want to trace a chart point back to the repeat readings and their Excel rows.'
        ]
      }),
      section('data', 'Data requirements', {
        items: [
          'Three different columns: Part, Operator, and Measurement. Part and Operator keep their display labels, including leading zeroes in text.',
          'At least two parts, two operators, and two repeats in every Part × Operator cell.',
          'A blank row is skipped. A partial row, a non-numeric measurement, or a worksheet error blocks the fit and names the Excel row.',
          'Lower and upper specification limits are optional. Both are required before %Tolerance appears, and the upper limit must be greater.'
        ]
      }),
      section('works', 'How it works', {
        paragraphs: [
          'Sums of squares use the grand, part, operator, and cell means, accumulated after centering so a large offset does not hide small within-cell differences. The interaction stays when its right-tail p-value is below 0.05. At 0.05 or above, its sum of squares and degrees of freedom join repeatability.',
          'A negative variance estimate is kept for diagnosis and reported as zero. Percentages use the reported, non-negative components. Parent rows are sums of the components under them and are not added again.'
        ],
        detail: {
          title: 'Mathematical background',
          items: [
            'Degrees of freedom are a−1, b−1, (a−1)(b−1), and ab(r−1) for parts, operators, interaction, and repeatability.',
            'In the full model, Part and Operator are tested against Part × Operator. The interaction is tested against repeatability.',
            'Part variance is [MS(Part) − MS(denominator)] / (operators × repeats). Operator variance uses parts × repeats. Interaction variance is [MS(interaction) − MS(error)] / repeats.',
            'When the interaction is pooled, the pooled mean square replaces the interaction mean square in both main-effect formulas, and the interaction variance is zero.',
            'Study variation is 6 × SD. %Contribution is 100 × variance / total variance. %Study variation is 100 × SD / total SD. %Tolerance is 100 × study variation / (USL − LSL).',
            'A positive mean square over a zero mean square has right-tail probability 0. Zero over zero is unavailable. If both interaction and error mean squares are zero, the zero interaction is pooled and the F test is unavailable.'
          ]
        }
      }),
      section('obtain', 'What you obtain', {
        items: [
          'Overview shows Total Gage R&R as a percent of study variation, %Tolerance when the limits are valid, distinct categories, the component chart, and the variance table.',
          'Diagnostics shows the R chart and the X-bar chart by operator, plus the Part × Operator mean profile. Activating a point lists that cell’s readings, Excel rows, mean, and range.',
          'ANOVA shows the full model and, when pooling is applied, the reduced model, together with the report.'
        ]
      }),
      section('cautions', 'Assumptions and cautions', {
        items: [
          'Version 1 is a balanced crossed study. Nested, unbalanced, and attribute studies are not fit here.',
          'The parts should span the variation you need the measurement system to distinguish. A narrow set of parts makes the gage look worse.',
          'Distinct categories below 5 is a warning about discrimination, not a proof that the process is incapable.',
          'Control limits describe repeatability. An X-bar point outside them can mean the parts differ, which is often what a gage study wants to see.'
        ]
      }),
      section('other', 'When to consider another method', {
        items: [
          'A process mean and spread against specification limits, without operators: Process Capability.',
          'How factor settings move a response: regression, or Process Settings Explorer.',
          'A nested study, an unbalanced study, or attribute agreement: not this screen.'
        ]
      }),
      section('refs', 'Methods and references', {
        paragraphs: [
          'The ANOVA decision, variance components, percentages, and distinct categories follow the crossed Gage R&R ANOVA method. Chart limits use the standard A2, D3, and D4 factors for the repeat count.'
        ],
        items: [
          'Minitab, Methods and formulas for Crossed Gage R&R Study (ANOVA method), variance components, and number of distinct categories.',
          'AIAG, Measurement Systems Analysis. The control-chart factors are the usual variables-chart constants for the subgroup size.'
        ]
      })
    ]
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function blocks(paragraphs, items) {
    const html = [];
    (paragraphs || []).forEach(function (paragraph) {
      html.push('<p>' + escapeHtml(paragraph) + '</p>');
    });
    if (items && items.length) {
      html.push('<ul>' + items.map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join('') + '</ul>');
    }
    return html.join('');
  }

  const StatisticoModuleGuide = {
    _guides: {
      univariate: univariate,
      correlations: correlations,
      contingency: contingency,
      independent: independent,
      dependent: dependent,
      anova: anova,
      regression: regression,
      logistic: logistic,
      'mixed-model': mixedModel,
      factor: factor,
      pca: pca,
      reliability: reliability,
      cluster: cluster,
      'meta-analysis': metaAnalysis,
      power: power,
      capability: capability,
      'gage-rr': gageRr
    },
    _moduleOverride: null,
    _activeModule: 'univariate',
    _returnFocus: null,
    _keyBound: false,

    register: function (moduleName, entry) {
      if (!moduleName || !entry) return;
      this._guides[moduleName] = entry;
    },

    has: function (moduleName) {
      return !!this._guides[moduleName || this._inferModule()];
    },

    _inferModule: function () {
      if (this._moduleOverride) return this._moduleOverride;
      const header = window.StatisticoHeader;
      if (header && header.module) return header.module;
      const marked = document.body && document.body.getAttribute('data-statistico-module');
      return marked || 'univariate';
    },

    resolve: function (moduleName) {
      return this._guides[moduleName || this._inferModule()] || null;
    },

    isOpen: function () {
      const overlay = document.getElementById('moduleGuideOverlay');
      return !!(overlay && overlay.classList.contains('is-open'));
    },

    open: function (moduleName) {
      const ai = document.getElementById('sbAiOverlay');
      if (ai) ai.remove();
      if (window.StatisticoViewGuide && typeof window.StatisticoViewGuide.close === 'function') {
        window.StatisticoViewGuide.close({ silent: true });
      }
      this._activeModule = moduleName || this._inferModule();
      const opener = document.activeElement;
      if (opener && opener.id && (opener.id === 'sbModuleAboutBtn' || opener.id === 'aboutModuleBtn' || opener.id === 'aboutModuleSetup')) {
        this._returnFocus = opener;
      }
      this._ensureCss();
      this._ensureOverlay();
      this._render();
      const overlay = document.getElementById('moduleGuideOverlay');
      if (!overlay) return;
      overlay.hidden = false;
      overlay.classList.add('is-open');
      this._syncButtons();
      this._bindKeys();
      const closeBtn = overlay.querySelector('.mg-close');
      if (closeBtn) closeBtn.focus();
    },

    close: function (opts) {
      const overlay = document.getElementById('moduleGuideOverlay');
      if (overlay) {
        overlay.classList.remove('is-open');
        overlay.hidden = true;
      }
      this._syncButtons();
      const restore = !(opts && opts.silent);
      const back = this._returnFocus;
      this._returnFocus = null;
      if (restore && back && typeof back.focus === 'function' && document.contains(back)) {
        back.focus();
      }
    },

    toggle: function (moduleName) {
      const next = moduleName || this._inferModule();
      if (this.isOpen() && this._activeModule === next) this.close();
      else this.open(next);
    },

    _syncButtons: function () {
      const open = this.isOpen();
      ['sbModuleAboutBtn', 'aboutModuleBtn', 'aboutModuleSetup'].forEach(function (id) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    },

    _bindKeys: function () {
      if (this._keyBound) return;
      this._keyBound = true;
      document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (!StatisticoModuleGuide.isOpen()) return;
        const tag = event.target && event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        StatisticoModuleGuide.close();
      });
    },

    _ensureCss: function () {
      if (document.getElementById('statistico-module-guide-css')) return;
      const script = document.getElementById('statistico-module-guide-js');
      const link = document.createElement('link');
      link.id = 'statistico-module-guide-css';
      link.rel = 'stylesheet';
      link.href = script && script.src
        ? script.src.replace(/\.js(\?.*)?$/, '.css$1')
        : 'module-guide.css';
      (document.head || document.documentElement).appendChild(link);
    },

    _ensureOverlay: function () {
      let overlay = document.getElementById('moduleGuideOverlay');
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'moduleGuideOverlay';
      overlay.className = 'mg-overlay';
      overlay.hidden = true;
      overlay.innerHTML = ''
        + '<div class="mg-panel" role="dialog" aria-modal="true" aria-labelledby="moduleGuideTitle">'
        + '  <div class="mg-header">'
        + '    <div class="mg-header-copy">'
        + '      <span class="mg-kicker">About this module</span>'
        + '      <h2 class="mg-title" id="moduleGuideTitle"></h2>'
        + '    </div>'
        + '    <button type="button" class="mg-close" aria-label="Close module guide">&times;</button>'
        + '  </div>'
        + '  <div class="mg-body" id="moduleGuideBody"></div>'
        + '  <div class="mg-footer">This describes the method. It does not read your current results. Use View guide for a screen, and Interpret results for the numbers.</div>'
        + '</div>';
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) StatisticoModuleGuide.close();
      });
      overlay.querySelector('.mg-close').addEventListener('click', function () {
        StatisticoModuleGuide.close();
      });
      document.body.appendChild(overlay);
      return overlay;
    },

    buttonLabel: function (moduleName) {
      const names = {
        univariate: 'univariate analysis',
        correlations: 'correlation analysis',
        regression: 'linear regression',
        independent: 'independent means',
        dependent: 'repeated measures',
        logistic: 'logistic regression',
        factor: 'factor analysis',
        pca: 'PCA',
        reliability: 'scale reliability',
        cluster: 'cluster analysis',
        anova: 'ANOVA',
        power: 'power and sample size',
        'mixed-model': 'the linear mixed model',
        'meta-analysis': 'meta-analysis',
        contingency: 'contingency tables',
        multivariable: 'the multivariable explorer',
        capability: 'process capability',
        'gage-rr': 'crossed Gage R&R'
      };
      const name = names[moduleName];
      return name ? ('About ' + name) : 'About this module';
    },

    paintAboutButtons: function (root) {
      const scope = root && root.querySelectorAll ? root : document;
      scope.querySelectorAll('.mg-launch').forEach(function (button) {
        let moduleName = button.getAttribute('data-module');
        if (!moduleName && (button.id === 'aboutModuleBtn' || button.id === 'aboutModuleSetup')) moduleName = 'univariate';
        const label = StatisticoModuleGuide.buttonLabel(moduleName);
        const span = button.querySelector('span');
        if (span) span.textContent = label;
        button.title = label;
      });
    },

    _render: function () {
      const overlay = this._ensureOverlay();
      const entry = this.resolve(this._activeModule);
      const title = overlay.querySelector('.mg-title');
      const kicker = overlay.querySelector('.mg-kicker');
      const body = overlay.querySelector('.mg-body');
      if (kicker) kicker.textContent = this.buttonLabel(this._activeModule);
      if (title) title.textContent = (entry && entry.title) || 'This module';
      if (!body) return;
      if (!entry) {
        body.innerHTML = '<p class="mg-empty">A reviewed guide for this module is not available yet.</p>';
        return;
      }
      const sections = (entry.sections || []).map(function (part) {
        const detail = part.detail
          ? '<details class="mg-math"><summary>' + escapeHtml(part.detail.title) + '</summary><div class="mg-section-body">'
            + blocks(part.detail.paragraphs, part.detail.items) + '</div></details>'
          : '';
        return '<details class="mg-section" data-module-section="' + escapeHtml(part.id) + '">'
          + '<summary>' + escapeHtml(part.title) + '</summary>'
          + '<div class="mg-section-body">' + blocks(part.paragraphs, part.items) + detail + '</div>'
          + '</details>';
      }).join('');
      body.innerHTML = '<p class="mg-lead">' + escapeHtml(entry.lead || '') + '</p>' + sections;
    }
  };

  window.StatisticoModuleGuide = StatisticoModuleGuide;
  if (document.querySelectorAll) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { StatisticoModuleGuide.paintAboutButtons(); });
    } else {
      StatisticoModuleGuide.paintAboutButtons();
    }
  }
})();
