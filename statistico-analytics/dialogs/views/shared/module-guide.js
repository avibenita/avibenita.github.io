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
    _guides: { univariate: univariate },
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

    _render: function () {
      const overlay = this._ensureOverlay();
      const entry = this.resolve(this._activeModule);
      const title = overlay.querySelector('.mg-title');
      const body = overlay.querySelector('.mg-body');
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
})();
