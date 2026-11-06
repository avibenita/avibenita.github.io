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

  const StatisticoViewGuide = {
    _guides: { univariate: univariate },
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
