/**
 * Shared Header Component for Statistico Standalone Views
 * Provides shared navigation across standalone analysis views
 * VERSION: 2026-02-27-laptop-frame
 */

console.log('Loading shared-header.js VERSION 2026-06-02-uniw');

(function () {
  function sanitizeDialogHostInfoParam() {
    try {
      if (!window.location || !window.location.search) return;
      const url = new URL(window.location.href);
      if (!url.searchParams.has('_host_Info')) return;
      url.searchParams.delete('_host_Info');
      const nextQuery = url.searchParams.toString();
      const cleanUrl = `${url.pathname}${nextQuery ? `?${nextQuery}` : ''}${url.hash || ''}`;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (e) {}
  }

  sanitizeDialogHostInfoParam();

  function resolveAssetUrl(relPath) {
    const { origin, pathname } = window.location;
    if (pathname.includes('/dialogs/views/')) {
      return `${origin}${pathname.split('/dialogs/views/')[0]}/${relPath}`;
    }
    if (pathname.includes('/taskpane/')) {
      return `${origin}${pathname.split('/taskpane/')[0]}/${relPath}`;
    }
    return `${origin}/${relPath}`;
  }

  function initTooltip() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', initTooltip, { once: true });
      return;
    }
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.init === 'function') {
      window.StatisticoTooltip.init();
      window.StatisticoTooltip.refresh();
    }
  }

  if (window.StatisticoTooltip) {
    initTooltip();
    return;
  }
  if (document.getElementById('st-tooltip-template-script')) return;

  const script = document.createElement('script');
  script.id = 'st-tooltip-template-script';
  script.src = resolveAssetUrl('src/shared/js/tooltip-template.js?v=20260610b');
  script.async = true;
  script.onload = initTooltip;
  document.head.appendChild(script);
})();

if (typeof window !== 'undefined' && typeof window.switchTab !== 'function') {
  window.switchTab = function switchSharedSidebarTab(tab) {
    if (!tab) return;

    const tabTitles = {
      explore: 'Descriptives',
      trajectories: 'Trajectories',
      assumptions: 'Assumptions',
      results: 'Test Results',
      posthoc: 'Pairwise Comparisons',
      effects: 'Effect Sizes',
      power: 'Power Analysis',
      report: 'APA Report',
      'ai-interpretation': 'AI Interpretation'
    };

    if (tabTitles[tab] && typeof StatisticoHeader !== 'undefined' && typeof StatisticoHeader.updateTitle === 'function') {
      StatisticoHeader.updateTitle(tabTitles[tab]);
    }

    document.querySelectorAll('.sb-item[data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tab}`);
    });

    if (typeof window.syncExploreChrome === 'function') {
      window.syncExploreChrome(tab);
    }

    const fitLayout =
      window.fitIndependentLayout ||
      window.fitDependentKplusLayout ||
      window.fitDependentLayout ||
      window.fitLayout;
    if (typeof fitLayout === 'function') requestAnimationFrame(fitLayout);
  };
}

const StatisticoHeader = {
  currentView: 'histogram',
  variableName: 'Variable',
  sampleSize: 0,
  module: 'univariate', // 'univariate' | 'correlations' | 'regression'

  /* ── Theme helpers ──────────────────────────────────────────── */
  /**
   * Read persisted theme preference (default: dark)
   */
  getTheme() {
    try { return localStorage.getItem('statistico-theme') || 'dark'; } catch(e) { return 'dark'; }
  },

  /**
   * Apply theme to the document and update the toggle button state.
   * Injects CSS custom-property values directly onto <html> style so they
   * always win over any per-page :root { } block, regardless of order.
   * @param {'dark'|'light'} theme
   */
  applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    /* ── Inject CSS variables directly so they beat page-level :root {} ── */
    if (theme === 'light') {
      root.style.setProperty('--surface-0',      '#f4f5f7');
      root.style.setProperty('--surface-1',      '#ffffff');
      root.style.setProperty('--surface-2',      '#f8f9fb');
      root.style.setProperty('--border',         '#e2e5ea');
      root.style.setProperty('--accent-1',       '#0d9488');
      root.style.setProperty('--accent-2',       '#0ea5e9');
      root.style.setProperty('--text-primary',   '#111827');
      root.style.setProperty('--text-secondary', '#4b5563');
      root.style.setProperty('--text-muted',     '#6b7280');
      root.style.setProperty('--panel-shadow',   'none');
      root.style.setProperty('--success',        '#16a34a');
      root.style.setProperty('--warning',        '#d97706');
      root.style.setProperty('--danger',         '#dc2626');
      root.style.setProperty('--header-color',   '#0d9488');
    } else {
      root.style.setProperty('--surface-0',      '#0f1115');
      root.style.setProperty('--surface-1',      '#181b22');
      root.style.setProperty('--surface-2',      '#1e222a');
      root.style.setProperty('--border',         '#2a303c');
      root.style.setProperty('--accent-1',       'rgb(255,165,120)');
      root.style.setProperty('--accent-2',       '#818cf8');
      root.style.setProperty('--text-primary',   '#ffffff');
      root.style.setProperty('--text-secondary', 'rgba(255,255,255,.72)');
      root.style.setProperty('--text-muted',     'rgba(255,255,255,.52)');
      root.style.setProperty('--panel-shadow',   'none');
      root.style.setProperty('--success',        '#34d399');
      root.style.setProperty('--warning',        '#fbbf24');
      root.style.setProperty('--danger',         '#fb7185');
      root.style.setProperty('--header-color',   'rgb(255,165,120)');
    }

    try { localStorage.setItem('statistico-theme', theme); } catch(e) {}

    // Update compact header theme control (if present)
    const headerThemeIcon = document.getElementById('headerThemeIcon');
    const headerThemeLabel = document.getElementById('headerThemeLabel');
    if (headerThemeIcon) headerThemeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
    if (headerThemeLabel) headerThemeLabel.textContent = theme === 'light' ? 'Light' : 'Dark';

    // Backward-compatible top-bar theme button (if present)
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      const icon  = btn.querySelector('.toggle-icon');
      const label = btn.querySelector('.toggle-label');
      if (icon)  icon.textContent  = theme === 'light' ? '☀️' : '🌙';
      if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
    }
    // Update sidebar utility theme button (if present)
    const sidebarThemeBtn = document.getElementById('sbThemeToggleBtn');
    if (sidebarThemeBtn) {
      const icon = sidebarThemeBtn.querySelector('.sb-utility-theme-icon');
      const label = sidebarThemeBtn.querySelector('.sb-utility-theme-label');
      if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
      if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
    }
    // Fire an event so individual pages can react (e.g. reflow Highcharts)
    document.dispatchEvent(new CustomEvent('statistico-theme-changed', { detail: { theme } }));
  },

  /**
   * Toggle between light and dark themes.
   */
  toggleTheme() {
    const next = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  },
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Initialize the header
   * @param {string} viewName - Current view name (histogram, boxplot, correlation-matrix, etc.)
   * @param {string} variableName - Variable name to display
   * @param {number} sampleSize - Sample size
   * @param {string} module - Module name ('univariate' | 'correlations' | 'regression')
   */
  init(viewName, variableName = 'Variable', sampleSize = 0, module = null) {
    this.currentView = viewName;
    this.variableName = variableName;
    this.sampleSize = sampleSize;
    
    // Auto-detect module from view name if not specified
    if (module) {
      this.module = module;
    } else if (viewName.includes('regression')) {
      this.module = 'regression';
    } else if (viewName.includes('correlation') || viewName.includes('network')) {
      this.module = 'correlations';
    } else if (viewName.includes('logistic')) {
      this.module = 'logistic';
    } else if (viewName.includes('factor')) {
      this.module = 'factor';
    } else if (viewName.includes('cluster')) {
      this.module = 'cluster';
    } else if (viewName.includes('independent')) {
      this.module = 'independent';
    } else if (viewName.includes('dependent')) {
      this.module = 'dependent';
    } else {
      this.module = 'univariate';
    }

    this._installActiveRowFilterStorageInterceptor();
    this._installRowFilterMessagePayloadInterceptor();
    this._clearLegacyPersistentRowFilterState(this.module);
    this._applyActiveRowFilterToModuleStorage(this.module);

    // Apply persisted theme before rendering (avoids flash of wrong theme)
    this.applyTheme(this.getTheme());
    this._ensureMinimalStyles();
    this._ensureWorkspaceTabAssets();
    this._ensurePlainTabUnderlineStyles();

    // Keep univariate result dialogs visually capped to a laptop-like viewport.
    this.ensureLaptopFrame();
    
    this.render();
  },

  /**
   * Wrap body content in a constrained centered frame for large monitors.
   */
  ensureLaptopFrame() {
    if (document.querySelector('.laptop-frame')) return;

    document.body.classList.add('statistico-dialog-sized');

    const frame = document.createElement('div');
    frame.className = 'laptop-frame';

    const bodyChildren = Array.from(document.body.children).filter((node) => {
      const tag = node.tagName;
      return tag !== 'SCRIPT' && !node.classList.contains('laptop-frame');
    });

    bodyChildren.forEach((node) => {
      // Mark content divs (non-custom-elements) as lf-content for universal fill
      if (node.nodeType === 1 && node.tagName.indexOf('-') === -1) {
        node.classList.add('lf-content');
      }
      frame.appendChild(node);
    });

    const firstScript = document.body.querySelector('script');
    if (firstScript) {
      document.body.insertBefore(frame, firstScript);
    } else {
      document.body.appendChild(frame);
    }
  },
  
  /**
   * Update the header center title (view name shown in the dark bar)
   */
  updateTitle(title) {
    const el = document.getElementById('headerViewName');
    if (el) el.textContent = title;
    this._refreshQuestionsAnsweredControl(title);
  },

  /**
   * Update variable name and sample size
   */
  updateVariable(variableName, sampleSize) {
    this.variableName = variableName;
    this.sampleSize = sampleSize;
    const varEl = document.getElementById('headerVariableName');
    const nEl = document.getElementById('headerSampleSize');
    if (varEl) varEl.textContent = variableName;

    // Check if sampleSize contains asterisk (indicating trimmed/transformed data)
    const sampleSizeStr = String(sampleSize);
    const hasAsterisk = sampleSizeStr.includes('*');

    if (nEl) {
      if (hasAsterisk) {
        // Use innerHTML with superscript for asterisk
        const numericPart = sampleSizeStr.replace('*', '');
        nEl.innerHTML = `(n=${numericPart}<sup>*</sup>)`;
      } else {
        nEl.textContent = `(n=${sampleSize})`;
      }
    }

    if (hasAsterisk) {
      this.showModificationNotice();
    } else {
      this.hideModificationNotice();
    }
  },

  setAnovaSidebarContext(ctx) {
    this.anovaSidebarContext = Object.assign({}, this.anovaSidebarContext || {}, ctx || {});
    if (this.module !== 'anova') return;
    this._renderSharedSidebar();
    this._mountSidebarUtilities();
  },

  _getBrandLogoSvg() {
    if (typeof StatisticoBrandLogo !== 'undefined' && StatisticoBrandLogo.getSvg) {
      return StatisticoBrandLogo.getSvg();
    }
    return '';
  },

  _getModuleDisplayName() {
    const moduleNames = {
      'univariate': 'Univariate',
      'correlations': 'Correlations',
      'regression': 'Regression',
      'independent': 'Independent Means',
      'dependent': 'Dependent Means',
      'logistic': 'Logistic Regression',
      'factor': 'Factor Analysis',
      'pca': 'PCA',
      'cluster': 'Cluster Analysis',
      'anova': 'ANOVA',
      'power': 'Power & Sample Size',
      'mixed-model': 'Linear Mixed Model'
    };
    return moduleNames[this.module] || this.module || 'Analytics';
  },
  
  showModificationNotice() {
    let notice = document.getElementById('header-modification-notice');
    if (!notice) {
      // Create notice element if it doesn't exist
      notice = document.createElement('div');
      notice.id = 'header-modification-notice';
      notice.style.cssText = `
        font-size: 11px;
        font-weight: 600;
        color: #ffa578;
        text-align: center;
        padding: 8px 12px;
        background: linear-gradient(135deg, rgba(255, 165, 120, 0.15), rgba(255, 165, 120, 0.25));
        border-bottom: 2px solid rgba(255, 165, 120, 0.6);
        border-top: 1px solid rgba(255, 165, 120, 0.3);
        box-shadow: 0 2px 8px rgba(255, 165, 120, 0.2);
        letter-spacing: 0.3px;
      `;
      notice.innerHTML = '<i class="fa-solid fa-exclamation-triangle" style="margin-right: 6px;"></i>* Data has been trimmed or transformed';
      
      const headerTarget = document.querySelector('.statistico-shell') || document.querySelector('.statistico-header');
      if (headerTarget && headerTarget.parentNode) {
        headerTarget.parentNode.insertBefore(notice, headerTarget.nextSibling);
      }
    }
    notice.style.display = 'block';
  },
  
  hideModificationNotice() {
    const notice = document.getElementById('header-modification-notice');
    if (notice) {
      notice.style.display = 'none';
    }
  },
  
  /**
   * Render the header HTML
   */
  render() {
    const viewTitles = {
      // Univariate views
      'histogram': 'Distribution · Histogram',
      'boxplot': 'Box Plot & Outliers',
      'qqplot': 'Normality · PP/QQ',
      'normality': 'Normality · Tests',
      'kernel': 'Kernel',
      'descriptive-stats': 'Descriptive Statistics',
      'by-group': 'Grouped Analysis',
      'cdf': 'Distribution · CDF',
      'confidence': 'Confidence Intervals',
      'hypothesis': 'One-Sample Test',
      'outliers': 'Outliers',
      'percentile': 'Distribution · Percentiles',
      // Correlation views
      'correlation-matrix': 'Correlation Matrix',
      'correlation-network': 'Correlation Network',
      'partial-correlations': 'Partial Correlations',
      'reliability': 'Reliability Coefficients',
      'taylor-diagram': 'Taylor Diagram',
      'correlation-by-group': 'Correlations by Group',
      'rolling-correlations': 'Rolling Correlations',
      'correlation-tests': 'Correlation Tests',
      // Regression views
      'regression-input': 'Model Setup',
      'regression-results': 'Regression Results',
      'regression-residuals': 'Residual Diagnostics',
      'regression-by-group': 'Regression by Group',
      // Logistic regression views
      'logistic-results': 'Logistic Regression',

      // Factor analysis views
      'factor-analysis': 'Factor Analysis',

      // PCA views
      'pca-analysis': 'Principal Component Analysis',

      // Cluster analysis
      'cluster-analysis': 'Cluster Analysis',

      // ANOVA views
      'anova-results': 'ANOVA',
      // Power & Sample Size
      'power-results': 'Power & Sample Size',

      // Independent means views
      'independent-results': 'Independent Means (2 Groups)',
      'independent-results-kplus': 'Independent Means (K+ Groups)',
      // Dependent means / repeated measures views
      'dependent-results': 'Dependent Means (Paired)',
      'dependent-results-kplus': 'Repeated Measures (3+ Timepoints)',
      // Mixed model views
      'overview': 'Overview',
      'model-effects': 'Model Effects',
      'marginal-means': 'Marginal Means',
      'diagnostics': 'Diagnostics',
      'advanced': 'Advanced',
      'model-structure': 'Model Structure'
    };

    const moduleNames = {
      'univariate': 'Univariate',
      'correlations': 'Correlations',
      'regression': 'Regression',
      'independent': 'Independent Means',
      'dependent': 'Dependent Means',
      'logistic': 'Logistic Regression',
      'factor': 'Factor Analysis',
      'pca': 'PCA',
      'cluster': 'Cluster Analysis',
      'anova': 'ANOVA',
      'power': 'Power & Sample Size',
      'mixed-model': 'Linear Mixed Model'
    };
    const moduleName = moduleNames[this.module] || this._getModuleDisplayName();
    
    const actionButtonsHtml = this._pendingActions ? this._renderActionButtons(this._pendingActions) : '';
    const headerGlobalControls = this._renderHeaderGlobalControls();
    const questionsAnsweredHtml = this._renderQuestionsAnsweredControl();

    // All sidebar-based modules hide the shared-header navrow to avoid duplicate navigation.
    const hideNavrow = (this.module === 'independent' || this.module === 'dependent' || this.module === 'logistic' || this.module === 'factor' || this.module === 'pca' || this.module === 'cluster' || this.module === 'anova' || this.module === 'power' || this.module === 'regression' || this.module === 'correlations' || this.module === 'univariate' || this.module === 'mixed-model');

    const topHeader = `
      <div class="statistico-header">
        <div class="header-left">
          <div class="header-module-frame">
            <div class="header-module-kicker">Module</div>
            <div class="header-module-name" id="headerModuleName">${moduleName}</div>
          </div>
        </div>
        <div class="header-center">
          <div class="header-view-name" id="headerViewName">${viewTitles[this.currentView] || 'Analysis'}</div>
          <div class="header-variable">
            <span id="headerVariableName">${this.variableName}</span>
            <span id="headerSampleSize">(n=${this.sampleSize})</span>
          </div>
        </div>
        <div class="header-right">
          ${hideNavrow ? '' : actionButtonsHtml}
          ${questionsAnsweredHtml}
          ${headerGlobalControls}
        </div>
      </div>
    `;

    const headerHTML = `
      <div class="statistico-shell">
        ${topHeader}
        ${hideNavrow ? '' : `
        <div class="statistico-navrow">
          <div class="navrow-tabs" role="tablist" aria-label="${this.module === 'univariate' ? 'Univariate workflow views' : this.module === 'correlations' ? 'Correlations views' : 'Regression views'}" style="width:100%;">
            ${this.renderNavigation()}
          </div>
        </div>`}
      </div>
      <div id="uni-filter-active-notice"></div>
    `;
    
    // Insert into header-container if it exists, otherwise at beginning of body
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      headerContainer.innerHTML = headerHTML;
      // header-container is only a thin mount-point — must not grow like lf-content
      headerContainer.classList.remove('lf-content');
      headerContainer.style.flex = '0 0 auto';
    } else {
      // Remove any existing header first
      const existingShell = document.querySelector('.statistico-shell');
      if (existingShell) existingShell.remove();
      const existingHeader = document.querySelector('.statistico-header');
      if (existingHeader) existingHeader.remove();
      // Remove leftover <statistico-header> custom elements (they are empty after render)
      document.querySelectorAll('statistico-header').forEach(el => el.remove());
      const mountRoot = document.querySelector('.laptop-frame') || document.body;
      mountRoot.insertAdjacentHTML('afterbegin', headerHTML);
    }

    // Trigger subtle module-name reveal animation
    this.revealModuleName();
    // Trigger view-name slide-in animation
    this.revealViewName();

    // Re-populate the row-filter notice banner now that the header DOM was
    // (re-)mounted. The banner div is part of the header template so it gets
    // wiped on every render; this ensures it stays in sync with state.
    try {
      if (typeof this.updateUniFilterChrome === 'function') {
        this.updateUniFilterChrome();
      }
    } catch (_e) {}

    try {
      this._renderUnivariateResultsTabs();
    } catch (_e) {}

    // Inject website link into the footer (create footer if absent)
    (function injectSiteLink() {
      const SITE_URL = 'https://avibenita.github.io/Statistico-Website/index.html';
      const LINK_CLASS = 'statistico-footer-site-link';

      let footer = document.querySelector('.statistico-footer');
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'statistico-footer';
        const yr = new Date().getFullYear();
        footer.appendChild(document.createTextNode(`${yr} Statistico-Interactive (TM) - All rights reserved`));
        const frame = document.querySelector('.laptop-frame') || document.body;
        frame.appendChild(footer);
      }

      // Add site link only once — use target="_blank" so WebView2 passes it to the system browser
      if (!footer.querySelector('.' + LINK_CLASS)) {
        footer.appendChild(document.createTextNode('\u00a0\u00a0'));
        const link = document.createElement('a');
        link.className = LINK_CLASS;
        link.href = SITE_URL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = 'Visit the Statistico website';
        link.innerHTML = '<i class="fas fa-arrow-up-right-from-square"></i> statistico.live';
        footer.appendChild(link);
      }
    })();
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === 'function') {
      window.StatisticoTooltip.refresh();
    }
    setTimeout(() => this._injectPerViewAiButton(), 0);
    this._syncRowFilterHeader();
    this._wireQuestionsAnsweredEvents();
    this._refreshQuestionsAnsweredControl();
  },

  _normalizeQuestionKey(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  _getQuestionsAnsweredContent(forcedTitle = null) {
    const titleText = forcedTitle || (document.getElementById('headerViewName')?.textContent || '');
    const viewKey = this._getInsightGuideViewKey();
    const key = this._normalizeQuestionKey(viewKey);
    const titleKey = this._normalizeQuestionKey(titleText);
    const module = this.module || 'univariate';

    const byView = {
      'histogram': [
        'Is the variable roughly symmetric, skewed, or multi-peaked?',
        'Where are most observations concentrated, and how wide is the spread?',
        'Are there sparse regions, heavy tails, or unusual spikes worth investigating?',
        'Would a transformation or robust method likely improve downstream analysis?'
      ],
      'cdf': [
        'What proportion of observations falls below any chosen cutoff?',
        'At which value do we reach key thresholds (for example 50%, 80%, 95%)?',
        'How quickly does the cumulative curve rise, and where does it flatten?',
        'How can this variable be translated into probability-style statements for stakeholders?'
      ],
      'percentile': [
        'What are the concrete values at key percentiles (P25, median, P75, P90, etc.)?',
        'How can an individual score be interpreted relative to the sample?',
        'Where do natural low/typical/high bands begin and end?',
        'Which percentile cutoffs are appropriate for reporting or decision rules?'
      ],
      'boxplot': [
        'Where is the median, and how wide is the interquartile range?',
        'Is variability balanced on both sides, or is the distribution skewed?',
        'Which points are flagged as potential outliers by IQR rules?',
        'Does spread appear stable enough for methods assuming similar variance?'
      ],
      'kernel': [
        'What smooth distribution pattern emerges beyond histogram bin choices?',
        'Are there hidden sub-peaks suggesting mixed subpopulations?',
        'How do tail behaviors compare between left and right sides?',
        'Is the overall shape consistent with assumptions behind planned tests/models?'
      ],
      'by-group': [
        'How does the variable differ across groups in center, spread, and shape?',
        'Which groups look practically different before formal testing?',
        'Are outliers or skew concentrated in specific groups?',
        'Do visual patterns support the test family selected in the Results section?'
      ],
      'by-group-stats': [
        'Which groups differ in mean/median and variability?',
        'Are observed group gaps large enough to be practically meaningful?',
        'Do sample-size differences make some group summaries less stable?',
        'Which group comparisons should be prioritized in follow-up tests?'
      ],
      'by-group-boxplot': [
        'Which groups show the highest/lowest central tendency?',
        'Where is variability widest or tightest across groups?',
        'Are outliers concentrated in particular groups?',
        'Do group distribution differences suggest unequal-variance procedures?'
      ],
      'by-group-normality': [
        'Which groups satisfy normality assumptions, and which do not?',
        'Are departures mild (tail effects) or strong enough to change test choice?',
        'Is assumption failure isolated to one group or systemic across groups?',
        'Should analysis proceed with parametric, robust, or non-parametric methods?'
      ],
      'qqplot': [
        'How closely do observed quantiles track the theoretical normal line?',
        'Are deviations mainly in tails, center, or both?',
        'Do deviations suggest skewness, heavy tails, or outlier influence?',
        'Is a normal-theory test/model still acceptable for this variable?'
      ],
      'normality': [
        'What do formal normality tests agree on, and where do they differ?',
        'How strong is the statistical evidence against normality?',
        'Could sample size be making tiny deviations look significant?',
        'Should we keep parametric methods or switch to robust/non-parametric alternatives?'
      ],
      'outliers': [
        'Which cases are statistically unusual, and by what rule are they flagged?',
        'Are extreme values isolated errors, valid rare events, or subgroup effects?',
        'How sensitive are summary statistics/tests to these observations?',
        'What is the most defensible handling choice (keep, winsorize, transform, analyze separately)?'
      ],
      'confidence': [
        'What range of population values is plausible given this sample?',
        'How precise is the estimate, and is precision adequate for decisions?',
        'Would a larger sample materially narrow uncertainty?',
        'Does the interval imply practical importance, not just statistical significance?'
      ],
      'hypothesis': [
        'Is the observed sample evidence consistent with the null reference value?',
        'What is the effect direction and magnitude, beyond p-value alone?',
        'How does uncertainty affect confidence in the decision?',
        'Is the finding statistically significant and practically meaningful?'
      ],
      'correlation matrix': [
        'Which variable pairs are most strongly associated?',
        'Are associations positive or negative and how stable are they?',
        'Do patterns suggest multicollinearity or latent structure?'
      ],
      'partial correlations': [
        'Do associations remain after controlling for covariates?',
        'Which relationships are direct vs confounded?',
        'How much unique association remains after adjustment?'
      ],
      'correlation network': [
        'Which variables are central in the dependency structure?',
        'Are there clusters/communities of related variables?',
        'Where are the strongest links in the system?'
      ],
      'anova': [
        'Do group means differ overall?',
        'Which pairs/groups differ and by how much?',
        'Are assumptions sufficiently met for this conclusion?'
      ],
      'marginal means': [
        'What are adjusted means for each factor level?',
        'Which levels differ after controlling for other terms?',
        'Which pairwise differences remain significant after correction?'
      ],
      'diagnostics': [
        'Are model assumptions reasonably satisfied?',
        'Are influential observations driving results?',
        'Can model-based conclusions be trusted?'
      ],
      'model effects': [
        'Which fixed effects are statistically supported?',
        'How large are estimated effects and uncertainty intervals?',
        'Which terms are practically meaningful vs negligible?'
      ],
      'regression results': [
        'Which predictors explain outcome variance?',
        'What is each predictor effect direction and magnitude?',
        'How well does the model fit overall?'
      ],
      'residual diagnostics': [
        'Are residuals approximately random and unbiased?',
        'Is variance roughly constant across fitted values?',
        'Are there influential points or structure left unexplained?'
      ],
      'logistic regression': [
        'How well does the model separate classes?',
        'Which threshold balances sensitivity and specificity?',
        'Which predictors most affect event odds?'
      ],
      'logistic-power': [
        'Does my study have enough outcome events per predictor (EPV)?',
        'What sample size is needed to detect a given odds ratio with 80% power?',
        'How much power does a multivariable model have for a specific coefficient?',
        'Which planning method fits my design: EPV rule-of-thumb, single-predictor formula, or simulation?'
      ],
      'regression-power': [
        'What power did the fitted model have to detect its observed R²?',
        'How many observations are needed to reach 80/90/95% power?',
        'What is the smallest effect (f² / R²) this sample can reliably detect?',
        'How does power change as the sample grows (power curve)?'
      ],
      'anova-power': [
        'What power did the design have to detect the observed group effect?',
        'How many participants are needed per group to reach 80/90/95% power?',
        'What is the smallest effect (η² / Cohen\u2019s f) this design can reliably detect?',
        'How does power change with total N (power curve)?'
      ],
      'dependent-power': [
        'What power did the repeated-measures design have for the observed within-subject effect?',
        'How many subjects are needed to reach 80/90/95% power?',
        'What is the smallest within-subject effect this sample can reliably detect?',
        'How does the effect size (dz / η² / rank effect) translate into planning terms?'
      ],
      'independent-power': [
        'What power did the group comparison have for the observed effect?',
        'How many participants per group are needed to reach 80/90/95% power?',
        'What is the smallest group difference (Cohen\u2019s d / f) this sample can reliably detect?',
        'How does power change as group sizes grow (power curve)?'
      ],
      'mixed-model-power': [
        'What power did the mixed model have for the selected fixed effect?',
        'How many subjects (not just observations) are needed for 80/90/95% power?',
        'How do ICC and measurements per subject affect the effective sample size?',
        'Is it more efficient to add subjects or add repeated measurements?'
      ],
      'factor analysis': [
        'Which variables define each latent factor?',
        'Are there problematic cross-loadings?',
        'Can factors be interpreted coherently?'
      ],
      'principal component analysis': [
        'How many components capture most variance?',
        'Which variables drive each component?',
        'Can dimensionality be reduced with minimal information loss?'
      ],
      'cluster analysis': [
        'How many meaningful clusters are present?',
        'How distinct and compact are discovered clusters?',
        'Which variables differentiate clusters most strongly?'
      ]
    };

    const byModule = {
      'univariate': [
        'What does this variable look like in terms of center, spread, and shape?',
        'Which assumptions seem acceptable, and which require caution?',
        'Which observations or regions are atypical and potentially influential?',
        'What clear, stakeholder-ready takeaway should this specific view support?'
      ],
      'correlations': [
        'Which variables are associated and in what direction?',
        'Which relationships remain after controls or subgrouping?',
        'Which associations are strongest and actionable?'
      ],
      'regression': [
        'Which predictors materially explain the outcome?',
        'How reliable and stable are coefficient estimates?',
        'Is model fit adequate for inference or prediction?'
      ],
      'independent': [
        'Do groups differ on the outcome?',
        'How large are those differences in practical terms?',
        'Which comparisons remain significant after correction?'
      ],
      'dependent': [
        'Do repeated/paired measurements change over conditions or time?',
        'Where are the largest within-subject differences?',
        'Are assumptions acceptable for repeated-measures conclusions?'
      ],
      'anova': [
        'Is there an overall group effect?',
        'Which groups/levels drive the effect?',
        'How robust is the conclusion under assumption checks?'
      ],
      'mixed-model': [
        'Which fixed effects are supported after accounting for hierarchy?',
        'How much variance is attributable to random structure (ICC)?',
        'Which adjusted means/contrasts are substantively important?'
      ],
      'logistic': [
        'How well does the model classify outcomes?',
        'Which predictors most affect event probability?',
        'What operating threshold is most appropriate?'
      ],
      'factor': [
        'What latent dimensions explain covariance patterns?',
        'Which indicators map cleanly to each factor?',
        'Is the factor solution interpretable and stable?'
      ],
      'pca': [
        'How many components summarize most variance?',
        'Which loadings define each component?',
        'Is reduced-dimensional representation adequate?'
      ],
      'cluster': [
        'Are natural subgroups present in the data?',
        'How separated are clusters?',
        'Which features characterize each cluster?'
      ],
      'power': [
        'Is planned sample size sufficient for target power/precision?',
        'How sensitive are conclusions to effect-size assumptions?',
        'What design changes most improve power efficiency?'
      ]
    };

    const keys = [key, titleKey].filter(Boolean);
    for (const k of keys) {
      if (byView[k]) return byView[k];
    }
    return byModule[module] || [];
  },

  _renderQuestionsAnsweredControl() {
    // Header chip removed — questions list lives in the AI Explain overlay only.
    return '';
  },

  _refreshQuestionsAnsweredControl(forcedTitle = null) {
    const wrap = document.getElementById('headerQaWrap');
    const list = document.getElementById('headerQaList');
    if (!wrap || !list) return;
    const items = this._getQuestionsAnsweredContent(forcedTitle);
    if (!items.length) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = '';
    list.innerHTML = items.map((q) => `<li>${q}</li>`).join('');
  },

  _toggleQuestionsAnsweredPanel(evt) {
    if (evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    const panel = document.getElementById('headerQaPanel');
    const btn = document.getElementById('headerQaBtn');
    if (!panel || !btn) return;
    const open = !panel.classList.contains('show');
    panel.classList.toggle('show', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  },

  _wireQuestionsAnsweredEvents() {
    if (this._qaOutsideBound) return;
    this._qaOutsideBound = true;
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('headerQaWrap');
      const panel = document.getElementById('headerQaPanel');
      const btn = document.getElementById('headerQaBtn');
      if (!wrap || !panel || !btn) return;
      if (wrap.contains(e.target)) return;
      panel.classList.remove('show');
      btn.setAttribute('aria-expanded', 'false');
    });
  },

  _syncRowFilterHeader() {
    if (this._isHeaderRowFilterSuppressed()) {
      this.updateUniFilterChrome();
      return;
    }
    this._injectUniFilterAssets();
    this.updateUniFilterChrome();
    // _injectUniFilterAssets loads UniRowFilter / Filter API asynchronously
    // and runs _initUniRowFilterFromStorage on script onload. The first
    // updateUniFilterChrome above can fire before any of that has finished,
    // leaving the banner empty even though the persisted state says a row
    // filter is active. Schedule a couple of follow-up refreshes so the
    // banner picks up the live UniRowFilter meta once it lands.
    if (typeof requestAnimationFrame === 'function') {
      try { requestAnimationFrame(() => { try { this.updateUniFilterChrome(); } catch (_e) {} }); } catch (_e) {}
    }
    try { setTimeout(() => { try { this.updateUniFilterChrome(); } catch (_e) {} }, 80); } catch (_e) {}
    try { setTimeout(() => { try { this.updateUniFilterChrome(); } catch (_e) {} }, 320); } catch (_e) {}
    try { setTimeout(() => { try { this.updateUniFilterChrome(); } catch (_e) {} }, 900); } catch (_e) {}
  },

  _syncUniFilterHeader() {
    this._syncRowFilterHeader();
  },
  
  /**
   * Trigger the module-name reveal animation (re-triggereable)
   */
  revealModuleName() {
    const el = document.getElementById('headerModuleName');
    if (!el) return;
    el.classList.remove('is-revealing');
    void el.offsetWidth; // force reflow to restart the animation
    el.classList.add('is-revealing');
  },

  /**
   * Trigger the view-name slide-from-left animation (re-triggereable)
   */
  revealViewName() {
    const el = document.getElementById('headerViewName');
    if (!el) return;
    el.classList.remove('is-sliding-in');
    void el.offsetWidth; // force reflow
    el.classList.add('is-sliding-in');
  },

  /**
   * Build navigation entries for current module
   */
  getNavigationItems() {
    const univariateViews = [
      { id: 'group-core', label: 'Core Descriptive', file: null, isGroup: true },
      { id: 'histogram', label: 'Histogram', file: 'univariate/histogram-standalone-v2.html' },
      { id: 'cdf', label: 'CDF', file: 'univariate/cumulative-distribution.html' },
      { id: 'percentile', label: 'Percentiles', file: 'univariate/percentile-standalone.html' },
      { id: 'boxplot', label: 'Box Plot & Outliers', file: 'univariate/boxplot-standalone.html' },
      { id: 'kernel', label: 'Kernel', file: 'univariate/kernel-standalone.html' },
      { id: 'separator-core-by-group', label: '---', file: null, isSeparator: true },
      { id: 'group-by-group', label: 'Grouped Analysis', file: null, isGroup: true },
      { id: 'by-group', label: 'Grouped Analysis', file: 'univariate/by-group.html' },
      { id: 'separator-by-group-advanced', label: '---', file: null, isSeparator: true },
      { id: 'group-advanced', label: 'Advanced Diagnostics', file: null, isGroup: true },
      { id: 'outliers', label: 'Outliers', file: 'univariate/outliers-standalone.html' },
      { id: 'normality', label: 'Tests', file: 'univariate/normality-standalone.html' },
      { id: 'qqplot', label: 'PP/QQ', file: 'univariate/qqplot-standalone.html' },
      { id: 'confidence', label: 'Confidence Intervals', file: 'univariate/confidence-standalone.html' },
      { id: 'hypothesis', label: 'One-Sample Test', file: 'univariate/hypothesis-standalone.html' }
    ];

    const correlationViews = [
      { id: 'correlation-matrix', label: 'Correlation Matrix', file: 'correlations/correlation-matrix-v2.html' },
      { id: 'correlation-network', label: 'Correlation Network', file: 'correlations/correlation-network.html' },
      { id: 'partial-correlations', label: 'Partial Correlations', file: 'correlations/correlation-partial.html' },
      { id: 'reliability', label: 'Reliability Coefficients', file: 'correlations/correlation-reliability.html' },
      { id: 'taylor-diagram', label: 'Taylor Diagram', file: 'correlations/correlation-taylor.html' },
      { id: 'descriptive-stats', label: 'Descriptive Statistics', file: 'correlations/descriptive-stats.html' },
      { id: 'correlation-by-group', label: 'Correlations by Group', file: 'correlations/by-group.html' }
    ];

    const regressionViews = [
      { id: 'regression-results',   label: 'Regression Results',   file: 'regression/regression-coefficients.html' },
      { id: 'regression-residuals', label: 'Residual Diagnostics', file: 'regression/regression-residuals.html' },
      { id: 'regression-by-group',  label: 'Regression by Group',  file: 'regression/regression-by-group.html' }
    ];

    const independentViews = [
      { id: 'independent-results',       label: '2 Groups',   file: 'independent/independent-results.html' },
      { id: 'independent-results-kplus', label: 'K+ Groups',  file: 'independent/independent-results-kplus.html' }
    ];
    
    return this.module === 'correlations' ? correlationViews :
           this.module === 'regression'   ? regressionViews  :
           this.module === 'independent'  ? independentViews : univariateViews;
  },

  /**
   * Render right-side navigation.
   * Univariate uses tab navigation, correlations keeps dropdown behavior.
   */
  renderNavigation() {
    if (this.module === 'univariate') {
      const views = this.getNavigationItems();
      const coreTabs = [];
      const byGroupTabs = [];
      const advancedTabs = [];
      let bucket = 'core';
      views.forEach((view) => {
        if (view.isSeparator) {
          if (view.id === 'separator-core-by-group') bucket = 'byGroup';
          else if (view.id === 'separator-by-group-advanced') bucket = 'advanced';
          return;
        }
        if (view.isGroup) return;
        if (bucket === 'core') coreTabs.push(view);
        else if (bucket === 'byGroup') byGroupTabs.push(view);
        else advancedTabs.push(view);
      });

      const renderTabButton = (view) => {
        const isDisabled = !view.file;
        const isActive = view.id === this.currentView;
        return `
          <button class="header-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
                  role="tab"
                  aria-selected="${isActive ? 'true' : 'false'}"
                  ${isDisabled ? 'disabled' : ''}
                  ${!isDisabled ? `onclick="StatisticoHeader.navigateTo('${view.file}')"` : ''}>
            ${view.label}
          </button>
        `;
      };

      return `
        <div class="header-tabs-stack">
          <div class="header-tabs-row">
            <span class="header-tab-group header-tab-group--core">Core Descriptive</span>
            <div class="header-tab-row-tabs" role="tablist" aria-label="Core descriptive views">
              ${coreTabs.map(renderTabButton).join('')}
            </div>
          </div>
          <div class="header-tabs-row">
            <span class="header-tab-group header-tab-group--by-group">Grouped Analysis</span>
            <div class="header-tab-row-tabs" role="tablist" aria-label="Grouped analysis views">
              ${byGroupTabs.map(renderTabButton).join('')}
            </div>
          </div>
          <div class="header-tabs-row">
            <span class="header-tab-group header-tab-group--advanced">Advanced Diagnostics</span>
            <div class="header-tab-row-tabs" role="tablist" aria-label="Advanced diagnostic views">
              ${advancedTabs.map(renderTabButton).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // Correlations & Regression modules — render as a single row of tabs
    const views = this.getNavigationItems();
    const renderTabButton = (view) => {
      if (view.id === 'separator' || view.isSeparator) return '';
      const isDisabled = !view.file || view.isDisabled;
      const isActive = view.id === this.currentView;
      return `
        <button class="header-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
                role="tab"
                aria-selected="${isActive ? 'true' : 'false'}"
                ${isDisabled ? 'disabled' : ''}
                ${!isDisabled ? `onclick="StatisticoHeader.navigateTo('${view.file}')"` : ''}>
          ${view.label}${isDisabled ? ' <span style="opacity:0.5;font-size:10px;">(Soon)</span>' : ''}
        </button>
      `;
    };

    return `
      <div class="header-tab-row-tabs" role="tablist" aria-label="Correlations views">
        ${views.map(renderTabButton).join('')}
      </div>
    `;
  },

  _isSharedSidebarModule() {
    return ['univariate', 'correlations', 'independent', 'dependent', 'logistic', 'factor', 'pca', 'anova', 'power', 'regression'].includes(this.module);
  },

  _isSidebarItemActive(item) {
    if (item.active === true) return true;
    if (item.view && item.view === this.currentView) return true;
    if (Array.isArray(item.viewIn) && item.viewIn.includes(this.currentView)) return true;
    if (Array.isArray(item.facets) && item.facets.some((f) => f.view === this.currentView)) return true;
    return false;
  },

  _getSidebarItemDescription(item) {
    if (!item) return '';
    if (item.description) return item.description;

    const key = String(item.tab || item.view || item.label || item.id || '').toLowerCase();
    const descriptions = {
      explore: 'Summary stats, histograms, and group profiles.',
      assumptions: 'Check trust assumptions and warnings.',
      results: 'Review ANOVA, Welch, and Kruskal-Wallis.',
      posthoc: 'Pairwise contrasts after a significant omnibus test.',
      effects: 'Magnitude of the group difference.',
      power: 'Observed power and sample-size planning.',
      report: 'APA-style narrative and export.',
      predictions: 'Score cases and inspect predicted risk.',
      diagnostics: 'Inspect fit, residuals, and warnings.',
      roc: 'Evaluate classification performance.',
      descriptives: 'Summarize variables before modeling.',
      ai: 'Get a concise AI interpretation.',
      suitability: 'Check whether factor analysis is appropriate.',
      extraction: 'Choose factors and extraction details.',
      rotation: 'Apply rotation and interpret the loading pattern.',
      scores: 'Inspect computed factor scores.',
      'factor scores': 'Distribution, map, and export of case-level factor scores.',
      viewdata: 'Open the analysis data table.',
      summary: 'See the main analysis snapshot.',
      components: 'Review retained components.',
      interpretation: 'Rotation, loadings, and contributions.',
      loadings: 'Inspect variable contributions.',
      biplot: 'Map scores and loadings together.',
      scoreplot: 'Visualize cases in component space.',
      contribution: 'Rank variable influence.',
      outliers: 'Flag unusual observations.',
      overview: 'Start with the analysis summary.',
      inference: 'Review ANOVA, Welch, and Kruskal-Wallis.',
      comparisons: 'Inspect pairwise contrasts.',
      visuals: 'Explore charts and patterns.',
      patterns: 'Compare group descriptives visually.',
      details: 'Descriptives, raw data, and technical rows.',
      'correlation-matrix': 'Scan pairwise relationships.',
      'correlation-network': 'View relationship structure.',
      'taylor-diagram': 'Compare agreement with a reference.',
      'partial-correlations': 'Control variables and compare residual links.',
      reliability: 'Evaluate internal consistency.',
      'descriptive-stats': 'Summarize variables and distributions.',
      'correlation-by-group': 'Compare pairwise r across group levels.',
      'regression-by-group': 'Compare coefficients and residual normality across group levels.',
      histogram: 'Frequency view of the distribution.',
      boxplot: 'Quartiles, whiskers, and outliers.',
      cdf: 'Empirical cumulative distribution.',
      percentile: 'Percentile cut points.',
      kernel: 'Smoothed density estimate.',
      'by-group': 'Compare distributions across groups.',
      normality: 'Shapiro-Wilk, Anderson-Darling, and friends.',
      qqplot: 'PP and QQ probability plots.',
      hypothesis: 'One-sample mean / median test.',
      confidence: 'Interval estimates for mean / median.',
      sbmeans: 'Power for mean comparisons.',
      sbanova: 'Power for ANOVA tests.',
      sbcorr: 'Power for correlations.',
      sbprop: 'Power for proportions.',
      sbreg: 'Power for regression models.',
      sbmodepower: 'Compute achieved or planned power.',
      sbmoden: 'Find sample size for target power.'
    };

    return descriptions[key] || 'Open this analysis section.';
  },

  _getSharedSidebarConfig() {
    if (this.module === 'univariate') {
      return {
        logoIcon: 'fa-chart-bar',
        logoSub: 'Univariate',
        menuTitle: 'Menu',
        groups: [
          {
            title: 'Core descriptive',
            items: [
              {
                type: 'navigate',
                view: 'distribution',
                icon: 'fa-chart-area',
                label: 'Distribution',
                description: 'Histogram, CDF, and percentile views.',
                facets: [
                  { view: 'histogram',  file: 'univariate/histogram-standalone-v2.html', label: 'Histogram' },
                  { view: 'cdf',        file: 'univariate/cumulative-distribution.html', label: 'CDF' },
                  { view: 'percentile', file: 'univariate/percentile-standalone.html',   label: 'Percentiles' }
                ]
              },
              { type: 'navigate', view: 'boxplot', file: 'univariate/boxplot-standalone.html', icon: 'fa-chart-gantt',  label: 'Box plot & outliers', description: 'Quartiles, whiskers, and outlier detection.' },
              { type: 'navigate', view: 'kernel',  file: 'univariate/kernel-standalone.html',  icon: 'fa-bezier-curve', label: 'Kernel', description: 'Smoothed density estimate.' }
            ]
          },
          {
            title: 'Advanced diagnostics',
            items: [
              {
                type: 'navigate',
                view: 'normality-group',
                icon: 'fa-wave-square',
                label: 'Normality',
                description: 'Formal tests and PP/QQ probability plots.',
                facets: [
                  { view: 'normality', file: 'univariate/normality-standalone.html', label: 'Tests' },
                  { view: 'qqplot',    file: 'univariate/qqplot-standalone.html',    label: 'PP / QQ' }
                ]
              },
              { type: 'navigate', view: 'confidence', file: 'univariate/confidence-standalone.html', icon: 'fa-ruler-horizontal', label: 'Confidence intervals', description: 'Interval estimates for mean or median.' },
              { type: 'navigate', view: 'hypothesis', file: 'univariate/hypothesis-standalone.html', icon: 'fa-flask',             label: 'One-sample test', description: 'Test against a reference value.' }
            ]
          }
        ],
        pinnedNav: {
          items: [
            { type: 'navigate', view: 'by-group', file: 'univariate/by-group.html', icon: 'fa-layer-group', label: 'Grouped Analysis', description: 'Compare distributions across groups.' }
          ]
        }
      };
    }

    if (this.module === 'correlations') {
      return {
        logoIcon: 'fa-chart-scatter',
        logoSub: 'Correlations',
        menuTitle: 'Menu',
        groups: [
          {
            title: 'Analysis Views',
            items: [
              { type: 'navigate', viewIn: ['correlation-matrix'], file: 'correlations/correlation-matrix-v2.html', icon: 'fa-table-cells', label: 'Pairwise Matrix', description: 'All r-values, p-values, and scatterplots side by side.' },
              { type: 'navigate', viewIn: ['correlation-network'], file: 'correlations/correlation-network.html', icon: 'fa-circle-nodes', label: 'Network Graph', description: 'Strong correlations as a graph: spot clusters and isolates.' },
              { type: 'navigate', viewIn: ['partial-correlations'], file: 'correlations/correlation-partial.html', icon: 'fa-filter', label: 'Partial r', description: 'Net relationships after holding selected covariates fixed.' },
              { type: 'navigate', viewIn: ['reliability'], file: 'correlations/correlation-reliability.html', icon: 'fa-check-double', label: 'Scale Reliability', description: 'Cronbach alpha, omega, and item-total diagnostics.' },
              { type: 'navigate', viewIn: ['taylor-diagram'], file: 'correlations/correlation-taylor.html', icon: 'fa-compass-drafting', label: 'Taylor Diagram', description: 'Benchmark each variable against a reference signal.' }
            ]
          },
          {
            title: 'Descriptives',
            items: [
              { type: 'navigate', viewIn: ['descriptive-stats'], file: 'correlations/descriptive-stats.html', icon: 'fa-list-ol', label: 'Descriptives', description: 'Per-variable mean, SD, skew, and missingness.' }
            ]
          }
        ],
        pinnedNav: {
          items: [
            { type: 'navigate', view: 'correlation-by-group', file: 'correlations/by-group.html', icon: 'fa-sitemap', label: 'By Group', description: 'Compare pairwise r across group levels with pattern sparklines.' }
          ]
        }
      };
    }

    if (this.module === 'independent') {
      const analysisItems = [
        { type: 'tab', tab: 'results', icon: 'fa-square-poll-vertical', label: 'Test Results', active: true },
        { type: 'tab', tab: 'assumptions', icon: 'fa-shield-halved', label: 'Assumptions' },
      ];
      if (this.currentView === 'independent-results-kplus') {
        analysisItems.push({ type: 'tab', tab: 'posthoc', icon: 'fa-table-cells', label: 'Pairwise Comparisons' });
      }
      analysisItems.push(
        { type: 'tab', tab: 'effects', icon: 'fa-wave-square', label: 'Effect Sizes' },
        { type: 'tab', tab: 'power', icon: 'fa-bolt', label: 'Power Analysis' }
      );
      return {
        logoIcon: 'fa-equals',
        logoSub: 'Independent',
        menuTitle: 'Menu',
        groups: [
          {
            title: 'Analysis',
            items: analysisItems
          },
          {
            title: 'Tools',
            items: [
              { type: 'tab', tab: 'explore', icon: 'fa-chart-column', label: 'Descriptives' }
            ]
          }
        ]
      };
    }

    if (this.module === 'regression') {
      return {
        logoIcon: 'fa-chart-line',
        logoSub: 'Regression',
        menuTitle: 'Menu',
        groups: [
          {
            title: 'Model',
            items: [
              { type: 'tab', tab: 'results-overview', navTab: 'model-results', id: 'modelResultsNavBtn', icon: 'fa-square-poll-vertical', label: 'Model Results', description: 'Overview & technical specification', active: true },
              { type: 'tab', tab: 'ix-summary', navTab: 'interactions', id: 'interactionsNavBtn', icon: 'fa-arrows-split-up-and-left', label: 'Interactions', description: 'Moderation, plots & tests' },
              { type: 'tab', tab: 'pred-overview', navTab: 'predictions', icon: 'fa-crosshairs', label: 'Predictions', description: 'Fit, what-if & intervals' },
              { type: 'tab', tab: 'viz-partial', navTab: 'visualization', icon: 'fa-chart-line', label: 'Visualization', description: 'Predictor effects & unique contribution' },
              { type: 'tab', tab: 'diag-overview', navTab: 'diagnostics', icon: 'fa-stethoscope', label: 'Diagnostics', description: 'Assumptions & residuals' },
              { type: 'tab', tab: 'power', navTab: 'power', id: 'regPowerNavBtn', icon: 'fa-bolt', label: 'Power & Sample Size', description: 'Required N, achieved power & detectable R²' }
            ]
          },
          {
            title: 'Descriptives',
            items: [
              { type: 'tab', tab: 'correlations', icon: 'fa-diagram-project', label: 'Correlations', description: 'Pairwise r among variables' },
              { type: 'tab', tab: 'descriptive', icon: 'fa-chart-column', label: 'Descriptives', description: 'Mean, SD, skew & missingness' }
            ]
          }
        ],
        pinnedNav: {
          items: [
            { type: 'navigate', view: 'regression-by-group', file: 'regression/regression-by-group.html', icon: 'fa-sitemap', label: 'By Group', description: 'Coefficients & residuals by level' }
          ]
        }
      };
    }

    if (this.module === 'dependent') {
      const isKplus = this.currentView === 'dependent-results-kplus';
      const analysisItems = [
        { type: 'tab', tab: 'results', icon: 'fa-square-poll-vertical', label: isKplus ? 'Overview' : 'Test Results', active: true },
        { type: 'tab', tab: 'assumptions', icon: 'fa-shield-halved', label: 'Assumptions' }
      ];
      if (isKplus) {
        analysisItems.splice(1, 0, { type: 'tab', tab: 'trajectories', icon: 'fa-chart-line', label: 'Trajectories' });
        analysisItems.push({ type: 'tab', tab: 'posthoc', icon: 'fa-table-cells', label: 'Pairwise Comparisons' });
      }
      if (isKplus) {
        analysisItems.push(
          { type: 'tab', tab: 'effects', icon: 'fa-wave-square', label: 'Effect Sizes' },
          { type: 'tab', tab: 'power', icon: 'fa-bolt', label: 'Power & Sample Size' }
        );
      } else {
        analysisItems.push(
          { type: 'tab', tab: 'effects', icon: 'fa-wave-square', label: 'Effect Sizes' },
          { type: 'tab', tab: 'power', icon: 'fa-bolt', label: 'Power Analysis' },
          { type: 'tab', tab: 'report', icon: 'fa-file-lines', label: 'APA Report' }
        );
      }
      return {
        logoIcon: 'fa-clock-rotate-left',
        logoSub: 'Repeated',
        menuTitle: 'Menu',
        groups: [
          {
            title: 'Analysis',
            items: analysisItems
          },
          {
            title: 'Tools',
            items: [
              { type: 'tab', tab: 'explore', icon: 'fa-chart-column', label: 'Descriptives' }
            ]
          }
        ]
      };
    }

    if (this.module === 'logistic') {
      return {
        logoIcon: 'fa-chart-pie',
        logoSub: 'Logistic',
        menuTitle: 'Menu',
        groups: [
          {
            title: 'Model',
            items: [
              { type: 'tab', tab: 'model-results', icon: 'fa-square-poll-vertical', label: 'Model Results', active: true },
              { type: 'tab', tab: 'predictive-performance', icon: 'fa-chart-area', label: 'Predictive Performance' },
              { type: 'tab', tab: 'probabilities', icon: 'fa-wand-magic-sparkles', label: 'Probabilities' },
              { type: 'tab', tab: 'interactions', icon: 'fa-brain', label: 'Interactions' },
              { type: 'tab', tab: 'diagnostics', icon: 'fa-stethoscope', label: 'Diagnostics' },
              { type: 'tab', tab: 'power', icon: 'fa-bolt', label: 'Power & Sample Size', description: 'Required N, achieved power & detectable R²' }
            ]
          },
          {
            title: 'Descriptives',
            items: [
              { type: 'tab', tab: 'correlations', icon: 'fa-diagram-project', label: 'Correlations' },
              { type: 'tab', tab: 'descriptives', icon: 'fa-chart-bar', label: 'Descriptives' }
            ]
          }
        ]
      };
    }

    if (this.module === 'factor') {
      return {
        logoIcon: 'fa-layer-group',
        logoSub: 'Factor',
        menuTitle: 'Menu',
        groups: [{
          title: 'Analysis',
          items: [
            { type: 'tab', tab: 'suitability', icon: 'fa-circle-check', label: 'Suitability', active: true },
            { type: 'tab', tab: 'extraction', icon: 'fa-magnifying-glass-chart', label: 'Extraction' },
            { type: 'tab', tab: 'rotation', icon: 'fa-diagram-project', label: 'Structure and Rotation', description: 'Apply rotation and interpret the loading pattern.' },
            { type: 'tab', tab: 'interpretation', icon: 'fa-lightbulb', label: 'Interpretation', description: 'Name factors, AI details & cross-loadings.' },
            { type: 'tab', tab: 'diagnostics', icon: 'fa-stethoscope', label: 'Diagnostics' },
            { type: 'tab', tab: 'scores', icon: 'fa-chart-scatter', label: 'Factor Scores', description: 'Distribution, map, and export of case-level factor scores.' }
          ]
        }]
      };
    }

    if (this.module === 'pca') {
      return {
        logoIcon: 'fa-chart-scatter',
        logoSub: 'PCA',
        menuTitle: 'Menu',
        groups: [{
          title: 'Principal Component Analysis',
          items: [
            { type: 'tab', tab: 'summary', icon: 'fa-clipboard-check', label: 'Summary', active: true },
            { type: 'tab', tab: 'components', icon: 'fa-chart-line', label: 'Components' },
            { type: 'tab', tab: 'interpretation', icon: 'fa-table-columns', label: 'Loadings & Rotation' },
            { type: 'tab', tab: 'scores', icon: 'fa-chart-scatter', label: 'Scores' },
            { type: 'tab', tab: 'diagnostics', icon: 'fa-stethoscope', label: 'Diagnostics' }
          ]
        }]
      };
    }

    if (this.module === 'anova') {
      const ctx = this.anovaSidebarContext || {};
      const anovaType = String(ctx.type || '').toLowerCase();
      const conditionCount = Number(ctx.conditionCount || 0);
      const isRepeated = anovaType === 'repeated';
      const isPaired = isRepeated && conditionCount === 2;
      const isRepeatedKplus = isRepeated && conditionCount >= 3;
      const resultLabel = isPaired ? 'Paired Test' : 'Test Results';
      const analysisItems = [
        { type: 'tab', tab: 'overview', icon: 'fa-circle-info', label: 'Summary', active: true, description: 'Start with the analysis summary.' },
        { type: 'tab', tab: 'results', icon: 'fa-square-poll-vertical', label: resultLabel, description: isPaired ? 'Read paired test statistics, p-value, and confidence interval.' : 'Read omnibus statistics and decision metrics.' },
        { type: 'tab', tab: 'assumptions', icon: 'fa-shield-halved', label: 'Assumptions', description: 'Check model assumptions and warnings.' }
      ];

      if (isRepeatedKplus) {
        analysisItems.splice(2, 0, { type: 'tab', tab: 'patterns', icon: 'fa-chart-line', label: 'Trajectories', description: 'Inspect condition trajectories across repeated measurements.' });
      }
      analysisItems.push({ type: 'tab', tab: 'power', icon: 'fa-bolt', label: 'Power & Sample Size', description: 'Required N, achieved power & detectable η²' });
      if (!isPaired) {
        analysisItems.push({ type: 'tab', tab: 'comparisons', icon: 'fa-code-compare', label: 'Pairwise Comparisons', description: 'Inspect pairwise contrasts after omnibus testing.' });
      }
      const groups = [
        {
          title: 'Analysis',
          items: analysisItems
        }
      ];
      if (!isRepeatedKplus) {
        groups.push({
          title: 'Tools',
          items: [
            { type: 'tab', tab: 'patterns', icon: 'fa-chart-column', label: 'Descriptives', description: 'Compare group descriptives visually.' }
          ]
        });
      }

      return {
        logoIcon: 'fa-table-cells',
        logoSub: 'ANOVA',
        menuTitle: 'Menu',
        groups: groups
      };
    }

    if (this.module === 'power') {
      return {
        logoIcon: 'fa-bolt',
        logoSub: 'Power',
        menuTitle: 'Power Module',
        groups: [
          {
            title: 'Test Type',
            items: [
              { type: 'js', id: 'sbMeans', onclick: "switchTest('means')", icon: 'fa-equals', label: 'Means (t-test)' },
              { type: 'js', id: 'sbAnova', onclick: "switchTest('anova')", icon: 'fa-table', label: 'ANOVA', active: true },
              { type: 'js', id: 'sbCorr', onclick: "switchTest('correlation')", icon: 'fa-arrow-trend-up', label: 'Correlation' },
              { type: 'js', id: 'sbProp', onclick: "switchTest('proportion')", icon: 'fa-percent', label: 'Proportions' },
              { type: 'js', id: 'sbReg', onclick: "switchTest('regression')", icon: 'fa-chart-line', label: 'Regression' }
            ]
          },
          {
            title: 'Mode',
            items: [
              { type: 'js', id: 'sbModePower', onclick: "setMode('power')", icon: 'fa-bolt', label: 'Compute Power', active: true },
              { type: 'js', id: 'sbModeN', onclick: "setMode('n')", icon: 'fa-users', label: 'Find Sample Size' }
            ]
          }
        ],
        bottomDecimals: ['2', '3', '4'],
        defaultDecimal: '3'
      };
    }

    return null;
  },

  _getUnivariateResultsSections() {
    return [
      {
        id: 'core',
        tabKey: 'uni-core',
        label: 'Core descriptive',
        icon: 'fa-chart-area',
        views: ['histogram', 'cdf', 'percentile', 'boxplot', 'kernel'],
        defaultFile: 'univariate/histogram-standalone-v2.html',
        tabs: [
          { view: 'histogram', tabKey: 'histogram', label: 'Histogram', icon: 'fa-chart-column', file: 'univariate/histogram-standalone-v2.html' },
          { view: 'cdf', tabKey: 'cdf', label: 'CDF', icon: 'fa-chart-line', file: 'univariate/cumulative-distribution.html' },
          { view: 'percentile', tabKey: 'percentile', label: 'Percentiles', icon: 'fa-percent', file: 'univariate/percentile-standalone.html' },
          { view: 'boxplot', tabKey: 'boxplot', label: 'Box plot & outliers', icon: 'fa-chart-gantt', file: 'univariate/boxplot-standalone.html' },
          { view: 'kernel', tabKey: 'kernel', label: 'Kernel', icon: 'fa-bezier-curve', file: 'univariate/kernel-standalone.html' }
        ]
      },
      {
        id: 'group',
        tabKey: 'uni-group',
        label: 'Grouped Analysis',
        icon: 'fa-layer-group',
        views: ['by-group'],
        defaultFile: 'univariate/by-group.html',
        resultTabLimit: 3,
        tabs: [
          { tabKey: 'by-group-stats', label: 'Statistics', icon: 'fa-table', panel: 'stats', inPage: true },
          { tabKey: 'by-group-boxplot', label: 'Box plot', icon: 'fa-chart-gantt', panel: 'boxplot', inPage: true },
          { tabKey: 'by-group-normality', label: 'Normality', icon: 'fa-wave-square', panel: 'normality', inPage: true }
        ]
      },
      {
        id: 'advanced',
        tabKey: 'uni-advanced',
        label: 'Advanced diagnostics',
        icon: 'fa-shield-halved',
        views: ['normality', 'qqplot', 'confidence', 'hypothesis', 'outliers'],
        defaultFile: 'univariate/normality-standalone.html',
        resultTabLimit: 2,
        tabs: [
          { view: 'normality', tabKey: 'normality', label: 'Tests', icon: 'fa-wave-square', file: 'univariate/normality-standalone.html' },
          { view: 'qqplot', tabKey: 'qqplot', label: 'PP / QQ', icon: 'fa-chart-simple', file: 'univariate/qqplot-standalone.html' },
          { view: 'confidence', tabKey: 'confidence', label: 'Confidence intervals', icon: 'fa-ruler-horizontal', file: 'univariate/confidence-standalone.html' },
          { view: 'hypothesis', tabKey: 'hypothesis', label: 'One-sample test', icon: 'fa-vial', file: 'univariate/hypothesis-standalone.html' }
        ]
      }
    ];
  },

  _getActiveUnivariateSection() {
    const sections = this._getUnivariateResultsSections();
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].views.indexOf(this.currentView) !== -1) return sections[i];
    }
    return sections[0];
  },

  _getUniTabSubtitle(tabKey) {
    const subs = {
      histogram: 'Frequency & shape',
      cdf: 'Cumulative curve',
      percentile: 'Cut points & lookup',
      boxplot: 'Quartiles & outliers',
      'boxplot-main': 'Full range & IQR view',
      'boxplot-outliers': 'Detection methods & table',
      kernel: 'Smoothed density',
      normality: 'Formal test battery',
      qqplot: 'Probability plots',
      confidence: 'Mean & median CIs',
      hypothesis: 'Reference value test',
      'by-group-stats': 'Descriptive stats & histograms',
      'by-group-boxplot': 'Compare spread by group',
      'by-group-normality': 'Six tests & NSI by group'
    };
    return subs[tabKey] || '';
  },

  _buildUniWsTabBtn(opts) {
    const active = opts.active ? ' active' : '';
    let onclick = '';
    if (opts.inPage && opts.panel) {
      if (opts.tabKey && opts.tabKey.indexOf('boxplot-') === 0) {
        onclick = ` onclick="StatisticoHeader.setBoxplotResultsTab('${opts.panel}')"`;
      } else {
        onclick = ` onclick="StatisticoHeader.setByGroupResultsTab('${opts.panel}')"`;
      }
    } else if (opts.file) {
      onclick = ` onclick="StatisticoHeader.navigateTo('${opts.file}')"`;
    } else if (opts.onSection) {
      onclick = ` onclick="StatisticoHeader.navigateTo('${opts.onSection}')"`;
    }
    const titleAttr = opts.title ? ` title="${opts.title.replace(/"/g, '&quot;')}"` : '';
    const sub = this._getUniTabSubtitle(opts.tabKey);
    return `<button type="button" class="ws-mode-tab${active}" role="tab"`
      + ` aria-selected="${opts.active ? 'true' : 'false'}"`
      + ` data-uni-tab="${opts.tabKey}"${titleAttr}${onclick}>`
      + `<i class="fa-solid ${opts.icon}" aria-hidden="true"></i>`
      + `<span class="ws-tab-text">`
      + `<span class="ws-tab-label">${opts.label}</span>`
      + (sub ? `<span class="ws-tab-sub">${sub}</span>` : '')
      + `</span></button>`;
  },

  setByGroupResultsTab(panel) {
    globalThis.__byGroupActiveTab = panel || 'stats';
    if (typeof globalThis.switchByGroupTab === 'function') {
      globalThis.switchByGroupTab(panel);
    }
    try { this._renderUnivariateResultsTabs(); } catch (_e) {}
  },

  setBoxplotResultsTab(panel) {
    globalThis.__boxplotActiveTab = panel || 'main';
    if (typeof globalThis.switchBoxplotTab === 'function') {
      globalThis.switchBoxplotTab(panel);
    }
    try { this._renderUnivariateResultsTabs(); } catch (_e) {}
  },

  _TAB_ASSET_VER: '20260716export',

  _prepareExportSnapshotBody(bodyClone) {
    bodyClone.querySelectorAll(
      '#header-container, .statistico-shell, .sb-nav, #sidebarNav, .statistico-footer,'
      + '#uniResultsViewTabs, .uni-results-tab-stack, .ws-shell--view-tabs,'
      + '.navrow-tabs, .sb-facets'
    ).forEach((n) => n.remove());
    bodyClone.querySelectorAll('.sb-ai-float-btn, .sb-ai-overlay, .loading-overlay, #dialogLoading').forEach((n) => n.remove());
    bodyClone.querySelectorAll('button, select, input, textarea').forEach((el) => {
      el.setAttribute('disabled', 'disabled');
      el.setAttribute('tabindex', '-1');
      ['onclick', 'onchange', 'oninput', 'onmousedown', 'onmouseup', 'onfocus', 'onblur', 'onkeydown', 'onkeyup'].forEach((ev) => el.removeAttribute(ev));
    });
    const snapshotStyle = document.createElement('style');
    snapshotStyle.textContent = `
      button, select, input, textarea {
        pointer-events: none !important;
        cursor: default !important;
        opacity: 0.48 !important;
        filter: grayscale(30%) !important;
        user-select: none !important;
      }
      button:hover, select:hover, input:hover {
        background: inherit !important;
        box-shadow: none !important;
        transform: none !important;
      }
      #uniResultsViewTabs, .uni-results-tab-stack, .ws-shell--view-tabs,
      .navrow-tabs, .sb-facets, .ws-mode-bar, .uni-view-tabs, .ws-chrome--attached {
        display: none !important;
      }
      .highcharts-exporting-group, .highcharts-button,
      .sb-ai-float-btn, .sb-ai-overlay, .loading-overlay, #dialogLoading {
        display: none !important;
      }
    `;
    bodyClone.prepend(snapshotStyle);
  },

  _ensurePlainTabUnderlineStyles() {
    const id = 'statistico-tab-underline-fix';
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = [
      '.overview-subtab-btn.active::before,',
      '.ws-mode-bar--slant .ws-mode-tab.active::before {',
      '  background: #ffffff !important;',
      '  box-shadow: none !important;',
      '}',
      'html[data-theme="light"] .overview-subtab-btn.active::before,',
      'html[data-theme="light"] .ws-mode-bar--slant .ws-mode-tab.active::before {',
      '  background: #ffffff !important;',
      '  box-shadow: none !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant) .ws-tab-indicator,',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant) .ws-tab-cluster.has-active .ws-tab-indicator {',
      '  display: none !important;',
      '  opacity: 0 !important;',
      '  height: 0 !important;',
      '}',
      '',
      '/* Connected workspace tabs — dark inactive, white active panel bridge */',
      '.ws-mode-bar--connected {',
      '  --ws-connected-tab-active-h: 56px;',
      '  --ws-connected-tab-inactive-h: calc(var(--ws-connected-tab-active-h) * 0.9);',
      '}',
      '.ws-mode-bar--connected.ws-mode-bar--attached {',
      '  align-items: flex-end !important;',
      '  padding: 10px 16px 0 !important;',
      '  border-bottom: 3px solid #8b5cf6 !important;',
      '  background: var(--surface-1, #1a1f2e) !important;',
      '}',
      '.ws-shell:has(.ws-mode-bar--connected) {',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '}',
      '.ws-shell:has(.ws-mode-bar--connected) > .ws-body {',
      '  background: var(--surface-1, #1a1f2e) !important;',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '  margin-top: 0 !important;',
      '}',
      '.ws-mode-bar--connected .ws-tab-cluster {',
      '  align-items: flex-end !important;',
      '  background: transparent !important;',
      '  border: none !important;',
      '  box-shadow: none !important;',
      '  padding: 0 !important;',
      '  gap: 10px !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab:not(.active) {',
      '  box-sizing: border-box !important;',
      '  height: var(--ws-connected-tab-inactive-h) !important;',
      '  min-height: var(--ws-connected-tab-inactive-h) !important;',
      '  max-height: var(--ws-connected-tab-inactive-h) !important;',
      '  padding: 8px 18px 10px !important;',
      '  background: linear-gradient(180deg, #232b3a 0%, #151b28 100%) !important;',
      '  border: 1px solid rgba(255, 255, 255, 0.1) !important;',
      '  border-bottom-color: transparent !important;',
      '  border-radius: 8px 8px 0 0 !important;',
      '  color: rgba(226, 232, 240, 0.9) !important;',
      '  margin-bottom: 0 !important;',
      '  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab:not(.active) .ws-tab-label {',
      '  color: rgba(226, 232, 240, 0.92) !important;',
      '  font-size: 12px !important;',
      '  font-weight: 600 !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab:not(.active) .ws-tab-sub {',
      '  color: rgba(148, 163, 184, 0.88) !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab:not(.active) > i {',
      '  color: #a78bfa !important;',
      '  opacity: 0.85 !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab.active {',
      '  position: relative !important;',
      '  box-sizing: border-box !important;',
      '  background: #ffffff !important;',
      '  background-image: none !important;',
      '  border: 3px solid #8b5cf6 !important;',
      '  border-bottom: 3px solid var(--surface-1, #1a1f2e) !important;',
      '  border-radius: 8px 8px 0 0 !important;',
      '  margin-bottom: -3px !important;',
      '  padding: 10px 18px 12px !important;',
      '  height: var(--ws-connected-tab-active-h) !important;',
      '  min-height: var(--ws-connected-tab-active-h) !important;',
      '  max-height: var(--ws-connected-tab-active-h) !important;',
      '  z-index: 2 !important;',
      '  color: #0f172a !important;',
      '  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12) !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab.active .ws-tab-text {',
      '  gap: 3px !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab.active .ws-tab-label {',
      '  color: #0f172a !important;',
      '  font-size: 14.5px !important;',
      '  font-weight: 800 !important;',
      '  line-height: 1.15 !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab.active .ws-tab-sub {',
      '  color: #475569 !important;',
      '  line-height: 1.15 !important;',
      '  margin-bottom: 0 !important;',
      '}',
      '.ws-mode-bar--connected .ws-mode-tab.active > i {',
      '  color: #7c3aed !important;',
      '  opacity: 1 !important;',
      '}',
      '',
      '/* Generic chip tabs (non-connected) */',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:not(.active),',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:not(.active) {',
      '  background: #dbe3ec !important;',
      '  background-image: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%) !important;',
      '  border: 1px solid #b8c4d4 !important;',
      '  color: #334155 !important;',
      '  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.45) !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:not(.active) .ws-tab-label,',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:not(.active) .ws-tab-label {',
      '  color: #334155 !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:not(.active) .ws-tab-sub,',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:not(.active) .ws-tab-sub {',
      '  color: #64748b !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:not(.active) > i,',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:not(.active) > i {',
      '  color: #7c3aed !important;',
      '  opacity: 0.78 !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:hover:not(.active),',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab:hover:not(.active) {',
      '  background: #e8eef4 !important;',
      '  background-image: linear-gradient(180deg, #eef2f7 0%, #dde4ed 100%) !important;',
      '  border-color: #94a3b8 !important;',
      '  color: #1e293b !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab.active,',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab.active {',
      '  background: #ffffff !important;',
      '  background-image: linear-gradient(165deg, #ffffff 0%, #f8fafc 40%, #fff7ed 100%) !important;',
      '  border-color: #8b5cf6 !important;',
      '  color: #0f172a !important;',
      '  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 1) !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab.active .ws-tab-label,',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab.active .ws-tab-label {',
      '  color: #0f172a !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab.active .ws-tab-sub,',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab.active .ws-tab-sub {',
      '  color: #475569 !important;',
      '}',
      '.ws-mode-bar--attached:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab.active > i,',
      '.ws-mode-bar:not(.ws-mode-bar--slant):not(.ws-mode-bar--connected) .ws-mode-tab.active > i {',
      '  color: #7c3aed !important;',
      '  opacity: 1 !important;',
      '}'
    ].join('\n');
  },

  _ensureMinimalStyles() {
    const ver = this._TAB_ASSET_VER;
    const href = this.resolveDialogUrl('shared-minimal.css?v=' + ver);
    let link = document.getElementById('statistico-minimal-css');
    if (link) {
      link.href = href;
      return;
    }
    link = document.createElement('link');
    link.id = 'statistico-minimal-css';
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  },

  _ensureWorkspaceTabAssets() {
    const ver = this._TAB_ASSET_VER;
    let link = document.getElementById('statistico-ws-tabs-css');
    const cssHref = this.resolveDialogUrl('shared-workspace-tabs.css?v=' + ver);
    if (link) {
      link.href = cssHref;
    } else {
      link = document.createElement('link');
      link.id = 'statistico-ws-tabs-css';
      link.rel = 'stylesheet';
      link.href = cssHref;
      document.head.appendChild(link);
    }

    const runInit = () => {
      try {
        if (globalThis.StatisticoWorkspaceTabs) {
          globalThis.StatisticoWorkspaceTabs.init();
        }
      } catch (_e) {}
    };

    if (!document.getElementById('statistico-ws-tabs-js') && !globalThis.StatisticoWorkspaceTabs) {
      const script = document.createElement('script');
      script.id = 'statistico-ws-tabs-js';
      script.src = this.resolveDialogUrl('shared-workspace-tabs.js?v=' + ver);
      script.onload = runInit;
      document.head.appendChild(script);
    } else {
      runInit();
    }
  },

  _ensureUnivariateWorkspaceTabAssets() {
    this._ensureWorkspaceTabAssets();
  },

  _getUnivariateResultsViewTabs(section) {
    if (!section || !Array.isArray(section.tabs) || !section.tabs.length) return [];
    if (section.id === 'core' && this.currentView === 'boxplot') {
      return [
        { tabKey: 'boxplot-main', label: 'Box plot', icon: 'fa-chart-gantt', panel: 'main', inPage: true },
        { tabKey: 'boxplot-outliers', label: 'Outliers', icon: 'fa-map-location-dot', panel: 'outliers', inPage: true }
      ];
    }
    const limit = typeof section.resultTabLimit === 'number' ? section.resultTabLimit : 3;
    return section.tabs.slice(0, limit);
  },

  _shouldShowUnivariateResultsTabs(activeSection) {
    const viewTabs = this._getUnivariateResultsViewTabs(activeSection);
    if (!viewTabs.length) return false;
    if (activeSection.id === 'group' && this.currentView === 'by-group') return true;
    if (activeSection.id === 'core' && this.currentView === 'boxplot') return true;
    return viewTabs.some((t) => t.view === this.currentView);
  },

  _renderUnivariateResultsTabs() {
    if (this.module !== 'univariate') return;
    this._ensureUnivariateWorkspaceTabAssets();
    const rightCol = document.querySelector('.right-col');
    if (!rightCol) return;

    const activeSection = this._getActiveUnivariateSection();
    const viewTabs = this._getUnivariateResultsViewTabs(activeSection);
    const showTabs = this._shouldShowUnivariateResultsTabs(activeSection);

    let stack = document.getElementById('uniResultsViewTabs');
    if (!showTabs) {
      if (stack) stack.remove();
      return;
    }

    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'uniResultsViewTabs';
      stack.className = 'uni-results-tab-stack';
      const header = document.getElementById('header-container');
      const results = document.getElementById('results-container') || rightCol.querySelector('.results-container');
      if (header) {
        header.insertAdjacentElement('afterend', stack);
      } else if (results) {
        results.insertAdjacentElement('beforebegin', stack);
      } else {
        rightCol.insertBefore(stack, rightCol.firstChild);
      }
    }

    const activeInPageTab = this.currentView === 'boxplot'
      ? (globalThis.__boxplotActiveTab || 'main')
      : (globalThis.__byGroupActiveTab || 'stats');

    const tabTitles = {
      histogram: 'Frequency distribution and shape',
      cdf: 'Cumulative distribution curve',
      percentile: 'Cut points and percentile lookup',
      normality: 'Formal normality test battery',
      qqplot: 'PP and QQ probability plots',
      confidence: 'Interval estimates for mean or median',
      'boxplot-main': 'Both box plots: full range and IQR fence',
      'boxplot-outliers': 'IQR, Z-Score, Grubbs, and MAD detection',
      'by-group-stats': 'Descriptive stats & histograms',
      'by-group-boxplot': 'Compare spread by group',
      'by-group-normality': 'Verdicts, tests & mini histograms'
    };

    const tabsHtml = viewTabs.map((t) => this._buildUniWsTabBtn({
      tabKey: t.tabKey,
      label: t.label,
      icon: t.icon,
      active: t.inPage ? t.panel === activeInPageTab : t.view === this.currentView,
      file: t.file,
      inPage: t.inPage,
      panel: t.panel,
      title: tabTitles[t.tabKey] || tabTitles[t.view] || ''
    })).join('');

    const ariaLabel = activeSection.id === 'advanced'
      ? 'Normality and inference views'
      : activeSection.id === 'group'
        ? 'Grouped analysis views'
        : (this.currentView === 'boxplot')
          ? 'Box plot views'
          : 'Distribution views';

    stack.innerHTML =
      '<div class="ws-shell ws-shell--view-tabs">'
      + '<div class="ws-chrome ws-chrome--attached">'
      + '<nav class="ws-mode-bar ws-mode-bar--attached ws-mode-bar--connected uni-view-tabs" role="tablist" aria-label="' + ariaLabel + '">'
      + tabsHtml
      + '</nav></div></div>';

    if (globalThis.StatisticoWorkspaceTabs) {
      try { globalThis.StatisticoWorkspaceTabs.init(); } catch (_e) {}
    }
    this._ensurePlainTabUnderlineStyles();
  },

  _renderSidebarNavItem(item) {
    const active = this._isSidebarItemActive(item) ? ' active' : '';
    const idAttr = item.id ? ` id="${item.id}"` : '';
    const dataTab = (item.navTab || item.tab) ? ` data-tab="${item.navTab || item.tab}"` : '';
    const dataView = item.view ? ` data-view="${item.view}"` : '';

    if (Array.isArray(item.facets) && item.facets.length > 0) {
      const isGroupActive = !!active;
      const activeFacet = item.facets.find((f) => f.view === this.currentView);
      const targetFacet = activeFacet || item.facets[0];
      const navFile = targetFacet?.file || '';
      const parentNavAttr = navFile ? ` data-nav-file="${navFile}"` : '';
      const parentOnclick = navFile ? ` onclick="StatisticoHeader.navigateTo('${navFile}')"` : '';
      const description = this._getSidebarItemDescription(item);
      const facetsHtml = (this.module === 'univariate')
        ? ''
        : (isGroupActive
        ? `<div class="sb-facets" role="tablist">${item.facets.map((f) => {
            const isActive = f.view === this.currentView;
            return `<button type="button" class="sb-facet${isActive ? ' active' : ''}"`
              + ` role="tab" aria-selected="${isActive ? 'true' : 'false'}"`
              + ` data-view="${f.view}" data-nav-file="${f.file}"`
              + ` onclick="StatisticoHeader.navigateTo('${f.file}')">${f.label}</button>`;
          }).join('')}</div>`
        : '');
      return `<div class="sb-faceted${isGroupActive ? ' is-active-group' : ''}">`
        + `<button type="button" class="sb-item${active}"${idAttr}${dataTab}${dataView}${parentNavAttr}${parentOnclick}>`
        + `<i class="fa-solid ${item.icon || 'fa-circle'} sb-item-icon"></i>`
        + `<span class="sb-item-copy"><span class="sb-item-label">${item.label || ''}</span>`
        + `<span class="sb-item-description">${description}</span></span></button>`
        + facetsHtml
        + `</div>`;
    }

    let onclick = '';
    let navFileAttr = '';
    if (item.type === 'navigate' && item.file) {
      onclick = `StatisticoHeader.navigateTo('${item.file}')`;
      navFileAttr = ` data-nav-file="${item.file}"`;
    } else if (item.type === 'tab' && item.tab) {
      onclick = `switchTab('${item.tab}')`;
    } else if (item.type === 'js' && item.onclick) {
      onclick = item.onclick;
    }
    const onclickAttr = onclick ? ` onclick="${onclick}"` : '';
    const description = this._getSidebarItemDescription(item);

    return `<button type="button" class="sb-item${active}"${idAttr}${dataTab}${dataView}${navFileAttr}${onclickAttr}><i class="fa-solid ${item.icon || 'fa-circle'} sb-item-icon"></i><span class="sb-item-copy"><span class="sb-item-label">${item.label || ''}</span><span class="sb-item-description">${description}</span></span></button>`;
  },

  _renderSidebarPinnedNav(cfg) {
    const pinned = cfg && cfg.pinnedNav;
    if (!pinned || !Array.isArray(pinned.items) || !pinned.items.length) return '';

    const itemsHtml = pinned.items.map((item) => this._renderSidebarNavItem(item)).join('');

    return `<div class="sb-pinned-items" role="navigation" aria-label="Grouped analysis">`
      + `<div class="sb-pinned-separator" role="presentation"></div>`
      + `<div class="sb-pinned-rail">${itemsHtml}</div></div>`;
  },

  _renderSharedSidebar() {
    const nav = document.getElementById('sidebarNav');
    if (!nav || !this._isSharedSidebarModule()) return;
    const cfg = this._getSharedSidebarConfig();
    if (!cfg) return;

    const groupsHtml = (cfg.groups || []).map((group) => {
      const itemsHtml = (group.items || []).map((item) => this._renderSidebarNavItem(item)).join('');

      if (!itemsHtml) return '';
      return `<div class="sb-group"><div class="sb-group-title">${group.title || ''}</div><div class="sb-items-rail">${itemsHtml}</div></div>`;
    }).join('');

    nav.innerHTML = `
      <div class="sb-logo">
        <div class="sb-logo-icon" data-statistico-brand-logo></div>
        <button class="sb-toggle-btn sb-toggle-btn--logo" onclick="StatisticoHeader.toggleSidebar()" title="Collapse / expand sidebar" aria-label="Collapse sidebar">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
      </div>
      <div class="sb-body">${groupsHtml}${this._renderSidebarPinnedNav(cfg)}</div>
    `;
    if (typeof StatisticoBrandLogo !== 'undefined' && StatisticoBrandLogo.mountAll) {
      StatisticoBrandLogo.mountAll(nav);
    }
  },

  /**
   * Render dropdown menu items (kept for correlations and legacy).
   */
  renderDropdownItems() {
    const views = this.getNavigationItems();
    
    return views.map(view => {
      if (view.id === 'separator') {
        return '<div class="analysis-separator"></div>';
      }
      
      const isDisabled = !view.file;
      const isActive = view.id === this.currentView;
      
      return `
        <div class="analysis-option ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" 
             ${!isDisabled ? `onclick="StatisticoHeader.navigateTo('${view.file}')"` : ''}>
          ${isActive ? '<i class="fa-solid fa-check" style="margin-right: 8px; color: var(--accent-1);"></i>' : ''}
          ${view.label}
          ${isDisabled ? ' <span style="opacity:0.5; margin-left: 8px;">(Coming Soon)</span>' : ''}
        </div>
      `;
    }).join('');
  },
  
  /**
   * Toggle dropdown visibility
   */
  toggleDropdown() {
    const dropdown = document.getElementById('dropdownMenu');
    if (!dropdown) return;
    dropdown.classList.toggle('show');
    
    // Close when clicking outside
    if (dropdown.classList.contains('show')) {
      setTimeout(() => {
        document.addEventListener('click', this.closeDropdownOnClickOutside, true);
      }, 10);
    }
  },
  
  /**
   * Close dropdown when clicking outside
   */
  closeDropdownOnClickOutside(e) {
    const dropdown = document.getElementById('dropdownMenu');
    const button = document.querySelector('.dropdown-btn');
    if (!dropdown || !button) return;
    
    if (!dropdown.contains(e.target) && !button.contains(e.target)) {
      dropdown.classList.remove('show');
      document.removeEventListener('click', StatisticoHeader.closeDropdownOnClickOutside, true);
    }
  },
  
  /**
   * Refresh current view
   */
  refreshView() {
    console.log('🔄 Refreshing view...');
    window.location.reload();
  },

  resolveDialogUrl(filename) {
    if (!filename) return window.location.href;
    if (filename.startsWith('http')) return filename;
    const { origin, pathname } = window.location;
    const marker = '/dialogs/views/';
    const preserveParams = ['embed', 'theme', 'demo'];
    const appendPreservedParams = (url) => {
      try {
        const out = new URL(url, window.location.href);
        const current = new URLSearchParams(window.location.search);
        preserveParams.forEach((key) => {
          if (current.has(key) && !out.searchParams.has(key)) {
            out.searchParams.set(key, current.get(key));
          }
        });
        if (!out.searchParams.has('build')) {
          out.searchParams.set('build', '20260522r');
        }
        return out.href;
      } catch (e) {
        return url;
      }
    };
    const idx = pathname.indexOf(marker);
    if (idx !== -1) {
      const rootPath = pathname.slice(0, idx);
      return appendPreservedParams(`${origin}${rootPath}${marker}${filename}`);
    }
    return appendPreservedParams(`./${filename}`);
  },
  
  /**
   * Navigate to another view
   */
  navigateTo(filename) {
    console.log('🔄 Navigating to:', filename);
    const targetUrlRaw = this.resolveDialogUrl(filename);
    let targetUrl = targetUrlRaw;
    try {
      const navUrl = new URL(targetUrlRaw, window.location.href);
      navUrl.searchParams.set('cb', Date.now().toString());
      targetUrl = navUrl.href;
    } catch (_e) {}
    // All modules navigate within the same dialog window (no new dialog opened).
    // Persist module data in sessionStorage so the destination page can restore it.
    try {
      if (window.correlationData) {
        try { sessionStorage.setItem('correlationData', JSON.stringify(window.correlationData)); } catch(e) {}
      } else {
        try {
          const storedCorrelationData = sessionStorage.getItem('correlationData');
          if (storedCorrelationData) {
            window.correlationData = JSON.parse(storedCorrelationData);
            sessionStorage.setItem('correlationData', storedCorrelationData);
          }
        } catch(e) {}
      }
      this._syncRegressionNavStorage();
      if (this.module === 'univariate') {
        this._syncLiveDataToStorage();
      }
    } catch (e) {
      console.warn('Navigation storage sync failed; continuing navigation.', e);
    }
    window.location.assign(targetUrl);
  },

  /**
   * Decide whether a fresh CORRELATION_DATA payload from the parent should
   * be accepted by a correlation child view. When the matrix has applied a
   * row filter and persisted it to sessionStorage, the parent task pane
   * still holds the ORIGINAL unfiltered dataset and re-sends it whenever
   * the child posts {action:'ready'}. Accepting that payload would silently
   * revert the filter for Network / Taylor / Partial / Reliability /
   * Descriptives / etc. when navigating between views.
   *
   * Returns true if the incoming payload should overwrite local state,
   * false to keep the locally-stored (filtered) data.
   */
  shouldAcceptCorrelationPayload(incoming) {
    try {
      const stored = JSON.parse(sessionStorage.getItem('correlationData') || 'null');
      if (!stored) return true;
      const localFiltered = stored.rowFilterActive === true ||
        (Array.isArray(stored.sourceRows) && Array.isArray(stored.sourceRowsAll) &&
          stored.sourceRows.length > 0 && stored.sourceRows.length < stored.sourceRowsAll.length);
      const incomingFiltered = !!(incoming && (
        incoming.rowFilterActive === true ||
        (Array.isArray(incoming.sourceRows) && Array.isArray(incoming.sourceRowsAll) &&
          incoming.sourceRows.length > 0 && incoming.sourceRows.length < incoming.sourceRowsAll.length)
      ));
      if (localFiltered && !incomingFiltered) {
        console.warn('[CORR] Ignoring parent CORRELATION_DATA payload while row filter is active', {
          localUsedRows: Array.isArray(stored.sourceRows) ? stored.sourceRows.length : (Array.isArray(stored.data) ? stored.data.length : null),
          localTotalRows: Array.isArray(stored.sourceRowsAll) ? stored.sourceRowsAll.length : null,
          incomingRows: incoming && Array.isArray(incoming.data) ? incoming.data.length : null
        });
        return false;
      }
    } catch (_e) {}
    return true;
  },

  /**
   * Build the HTML string for action buttons in the header-right area.
   * Groups: [View] | [Model, HTML] | [Theme toggle]  — separated by dividers.
   * @private
   */
  _renderActionButtons({ getData, saveModel, exportHtml, exportJson, moduleName = 'Save model' } = {}) {
    const hasView  = !!getData;
    const hasSaves = !!(saveModel || exportHtml || exportJson);

    let html = '';

    // ── View group ──────────────────────────────────────────────
    if (hasView) {
      html += `<div class="header-action-group">
        <button class="header-action-btn header-action-btn--data"
                id="headerViewDataBtn"
                onclick="StatisticoHeader._toggleViewData()"
                title="Toggle between used observations and all observations">
          <i class="fa-solid fa-eye"></i> View Data
        </button>
      </div>`;
    }

    // ── Divider between View and Saves ──────────────────────────
    if (hasView && hasSaves) {
      html += `<div class="header-action-sep"></div>`;
    }

    // ── Save group ──────────────────────────────────────────────
    if (hasSaves) {
      html += `<div class="header-action-group">`;
      if (saveModel) {
        html += `<button class="header-action-btn header-action-btn--save"
                         onclick="StatisticoHeader._pendingActions.saveModel()"
                         title="${moduleName}">
                   <i class="fa-solid fa-floppy-disk"></i> Model
                 </button>`;
      }
      if (exportHtml) {
        html += `<button class="header-action-btn header-action-btn--html"
                         onclick="StatisticoHeader._pendingActions.exportHtml()"
                         title="Export full analysis as HTML, PDF, or Word">
                   <i class="fa-solid fa-file-export"></i> Export Report
                 </button>`;
      }
      if (exportJson) {
        html += `<button class="header-action-btn header-action-btn--json"
                         onclick="StatisticoHeader._pendingActions.exportJson()"
                         title="Download results as JSON file">
                   <i class="fa-solid fa-download"></i> JSON
                 </button>`;
      }
      html += `</div>`;
    }

    // ── Divider before Theme toggle ─────────────────────────────
    if (hasView || hasSaves) {
      html += `<div class="header-action-sep"></div>`;
    }

    return html;
  },

  /** Open/close the View Data modal (like the Repeated Measures module). */
  _viewDataMode: 'all',   // 'used' | 'all'  — default: show all records

  _toggleViewData() {
    // If modal is already open, close it
    const existing = document.getElementById('hdpModal');
    if (existing) { existing.remove(); this._resetViewBtn(); return; }

    const actions = this._pendingActions;
    if (!actions || !actions.getData) return;
    const result = this._applyHeaderRowFilterToDataResult(actions.getData());
    if (!result) { console.warn('No data available yet'); return; }

    this._viewDataMode = 'all';   // always open on All obs
    this._lastDataResult = result;

    // Mark button active
    const headerBtn = document.getElementById('headerViewDataBtn');
    if (headerBtn) headerBtn.classList.add('header-action-btn--data-active');
    const sidebarBtn = document.getElementById('sbViewDataBtn');
    if (sidebarBtn) sidebarBtn.classList.add('sb-bottom-btn--active');

    this._buildDataModal(result, 'used');
  },

  /** Toggle between used / all inside the modal */
  _switchDataMode(mode) {
    if (!this._lastDataResult) return;
    this._viewDataMode = mode;
    this._populateDataModal(this._lastDataResult, mode);
  },

  /** Build the modal overlay once, then fill it */
  _buildDataModal(result, mode) {
    const modal = document.createElement('div');
    modal.id = 'hdpModal';
    modal.className = 'hdp-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="hdp-modal-content">
        <div class="hdp-modal-header">
          <span id="hdpModalTitle"><i class="fa-solid fa-table"></i> Data Viewer</span>
          <span class="hdp-modal-close"
                onclick="document.getElementById('hdpModal').remove(); StatisticoHeader._resetViewBtn();"
                title="Close">&times;</span>
        </div>
        <div class="hdp-modal-body">
          <div class="hdp-stats-bar">
            <div class="hdp-stat"><div class="hdp-stat-value" id="hdpStatN">--</div><div class="hdp-stat-label">Rows Shown</div></div>
            <div class="hdp-stat"><div class="hdp-stat-value" id="hdpStatCols">--</div><div class="hdp-stat-label">Variables</div></div>
            <div class="hdp-stat"><div class="hdp-stat-value" id="hdpStatExcluded">--</div><div class="hdp-stat-label">Excluded (Missing)</div></div>
            <div class="hdp-stat hdp-stat--right">
              <div class="hdp-mode-toggle">
                <button class="hdp-mode-btn" id="hdpBtnUsed" onclick="StatisticoHeader._switchDataMode('used')">Used obs</button>
                <button class="hdp-mode-btn" id="hdpBtnAll"  onclick="StatisticoHeader._switchDataMode('all')">All obs</button>
              </div>
              <button class="hdp-copy-btn" onclick="StatisticoHeader._copyModalData()" title="Copy to clipboard">
                <i class="fa-solid fa-copy"></i> Copy
              </button>
            </div>
          </div>
          <div class="hdp-range-bar" id="hdpRangeBar"></div>
          <div class="hdp-table-wrap">
            <table class="hdp-modal-table" id="hdpTable">
              <thead><tr id="hdpThead"></tr></thead>
              <tbody id="hdpTbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._populateDataModal(result, mode);
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { modal.remove(); this._resetViewBtn(); }
    });
  },

  _populateDataModal(result, mode) {
    const { usedRows, allRows, headers, usedRange, fullRange, columnRoles, notice } = result;
    const isUsed    = mode === 'used';
    const rows      = isUsed ? usedRows : allRows;
    const range     = isUsed ? (usedRange || fullRange) : fullRange;
    const otherRange = isUsed ? fullRange : usedRange;
    const excluded  = (allRows || []).length - (usedRows || []).length;

    // Stats bar
    const el = (id) => document.getElementById(id);
    if (el('hdpStatN'))        el('hdpStatN').textContent        = rows.length;
    if (el('hdpStatCols'))     el('hdpStatCols').textContent     = headers.length;
    if (el('hdpStatExcluded')) el('hdpStatExcluded').textContent = Math.max(0, excluded);

    // Modal title
    const title = el('hdpModalTitle');
    if (title) title.innerHTML = `<i class="fa-solid fa-table"></i> ${isUsed ? 'Used Observations' : 'All Observations'}`;

    // Toggle buttons
    const btnUsed = el('hdpBtnUsed'); const btnAll = el('hdpBtnAll');
    if (btnUsed) { btnUsed.classList.toggle('hdp-mode-btn--active', isUsed);  btnUsed.classList.toggle('hdp-mode-btn--used', isUsed); }
    if (btnAll)  { btnAll.classList.toggle('hdp-mode-btn--active', !isUsed);  btnAll.classList.toggle('hdp-mode-btn--all', !isUsed); }

    // Range bar + optional config notice
    const rb = el('hdpRangeBar');
    if (rb) {
      const rangeHtml = range
        ? `<i class="fa-solid fa-table-cells-large"></i>
           <span class="hdp-range-label">${isUsed ? 'Used range' : 'Full range'}:</span>
           <span class="hdp-range">${range}</span>
           ${otherRange && otherRange !== range
             ? `<span class="hdp-range-secondary">&nbsp;&middot;&nbsp;${isUsed ? 'full range' : 'used range'}: <strong>${otherRange}</strong></span>`
             : ''}`
        : '';
      const noticeHtml = notice
        ? `<span class="hdp-notice"><i class="fa-solid fa-triangle-exclamation"></i> ${notice}</span>`
        : '';
      rb.innerHTML = rangeHtml || noticeHtml
        ? `<div class="hdp-range-row">${rangeHtml}</div>${noticeHtml}`
        : '';
    }

    // Table header
    const thead = el('hdpThead');
    if (thead) {
      thead.innerHTML = '<th class="hdp-th-num">#</th>' +
        headers.map((h, i) => {
          const role = columnRoles ? columnRoles[i] : null;
          const cls  = role === 'y' ? ' hdp-col-y' : role === 'xn' ? ' hdp-col-xn' : role === 'xc' ? ' hdp-col-xc' : '';
          return `<th class="hdp-th${cls}">${h}</th>`;
        }).join('');
    }

    // Table body
    const tbody = el('hdpTbody');
    if (tbody) {
      const cap = 500;
      const display = rows.slice(0, cap);
      tbody.innerHTML = display.map((row, ri) => {
        const tds = row.map((v, ci) => {
          const role = columnRoles ? columnRoles[ci] : null;
          const cls  = role === 'y' ? ' hdp-col-y' : role === 'xn' ? ' hdp-col-xn' : role === 'xc' ? ' hdp-col-xc' : '';
          const val  = (v === null || v === undefined || v === '') ? '<span class="hdp-missing">—</span>' : v;
          return `<td class="hdp-td${cls}">${val}</td>`;
        }).join('');
        return `<tr class="hdp-tr"><td class="hdp-td hdp-td-num">${ri + 1}</td>${tds}</tr>`;
      }).join('');
      if (rows.length > cap) {
        tbody.innerHTML += `<tr><td class="hdp-more" colspan="${headers.length + 1}">Showing first ${cap} of ${rows.length} rows</td></tr>`;
      }
    }

    this._currentModalRows    = rows;
    this._currentModalHeaders = headers;
  },

  _copyModalData() {
    const rows = this._currentModalRows; const h = this._currentModalHeaders;
    if (!rows || !h) return;
    let text = 'Row\t' + h.join('\t') + '\n';
    rows.forEach((row, i) => { text += (i + 1) + '\t' + row.map(v => v == null ? '' : v).join('\t') + '\n'; });
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector('.hdp-copy-btn');
      if (btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!'; setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy'; }, 2000); }
    }).catch(() => alert('Failed to copy to clipboard'));
  },

  _resetViewBtn() {
    this._viewDataMode = 'all';
    this._lastDataResult = null;
    const headerBtn = document.getElementById('headerViewDataBtn');
    if (headerBtn) {
      headerBtn.classList.remove('header-action-btn--data-active');
      headerBtn.innerHTML = `<i class="fa-solid fa-eye"></i> View Data`;
      headerBtn.title = 'View model data';
    }
    const sidebarBtn = document.getElementById('sbViewDataBtn');
    if (sidebarBtn) {
      sidebarBtn.classList.remove('sb-bottom-btn--active');
      sidebarBtn.innerHTML = `<i class="fa-solid fa-eye"></i><span class="sb-item-label">View Data</span>`;
      sidebarBtn.title = 'View model data';
    }
  },

  /**
   * Register action buttons (View Data / Model / HTML) into the header top bar.
   * Call this right after StatisticoHeader.init().
   */
  registerActions({ getData, saveModel, exportHtml, exportJson, filterRows, onFilterRows, moduleName = 'Save model' } = {}) {
    const incoming = { getData, saveModel, exportHtml, exportJson, filterRows, onFilterRows, moduleName };
    this._pendingActions = this._mergeActionsWithFallback(incoming);
    this.render();
    this._mountSidebarUtilities();
    this._syncRowFilterHeader();
  },

  /**
   * Enable or disable the AI pill button in the sidebar.
   * Call setAiReady(false) on load and setAiReady(true) once results arrive.
   */
  setAiReady(ready) {
    const btn = document.getElementById('sbAiBtn');
    if (!btn) return;
    if (ready) {
      btn.removeAttribute('disabled');
    } else {
      btn.setAttribute('disabled', 'disabled');
    }
  },

  /**
   * Show a section picker overlay so the user can choose which sections to
   * include in an exported report.  Same UI as the internal univariate /
   * correlation pickers; exposed here so individual result pages can call it
   * directly without going through a fallback builder.
   *
   * @param {Array<{id:string, label:string}>} sections
   * @param {function(string[]): void} onConfirm  receives array of selected ids
   */
  pickReportSections(sections, onConfirm) {
    const esc = (value) => String(value ?? '').replace(/[<>&"]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m]));
    const existing = document.getElementById('stReportExportOverlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'stReportExportOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:2147483300;display:flex;align-items:center;justify-content:center;padding:16px;';
    const sectionListHtml = sections.map((s) => `
      <label style="display:flex;align-items:center;gap:8px;padding:5px 4px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:13px;cursor:pointer;">
        <input type="checkbox" data-section-id="${esc(s.id)}" checked style="cursor:pointer;accent-color:#f97316;" />
        <span>${esc(s.label)}</span>
      </label>
    `).join('');
    overlay.innerHTML = `
      <div style="width:min(560px,95vw);max-height:88vh;background:#fff;border-radius:14px;border:1px solid #cbd5e1;box-shadow:0 16px 40px rgba(15,23,42,.32);display:flex;flex-direction:column;overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;">
          <i class="fa-solid fa-file-export" style="color:#f97316;font-size:16px;"></i>
          <span style="font-size:15px;font-weight:700;color:#0f172a;">Export Report</span>
        </div>
        <div style="padding:10px 18px 4px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#64748b;margin-bottom:6px;">Sections to include</div>
        </div>
        <div style="padding:0 18px 8px;overflow-y:auto;flex:1;">${sectionListHtml}</div>
        <div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;">
          <button id="stReportCancelBtn" style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#374151;font-size:13px;font-weight:500;cursor:pointer;">Cancel</button>
          <button id="stReportExportBtn" style="padding:8px 16px;border:1px solid #f97316;border-radius:8px;background:#f97316;color:#fff;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-file-export"></i> Export HTML
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#stReportCancelBtn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#stReportExportBtn').addEventListener('click', () => {
      const checked = Array.from(overlay.querySelectorAll('input[data-section-id]:checked'))
        .map((el) => el.getAttribute('data-section-id'));
      if (!checked.length) return;
      close();
      onConfirm(checked);
    });
  },

  _renderHeaderGlobalControls() {
    const cfg = this._getSharedSidebarConfig ? this._getSharedSidebarConfig() : null;
    const decimalOptions = cfg?.bottomDecimals || ['auto', '0', '1', '2', '3', '4'];
    const persisted = this.getDecimalPreference();
    const selected = decimalOptions.includes(persisted) ? persisted : (cfg?.defaultDecimal || '2');
    const optionsHtml = decimalOptions.map((v) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v === 'auto' ? 'Auto' : v}</option>`).join('');
    const theme = this.getTheme();
    const themeIcon = theme === 'light' ? '☀️' : '🌙';
    const uniFilterHtml = this._shouldRenderHeaderRowFilter()
      ? `
        <div class="header-uni-filter-wrap" id="headerUniFilterWrap">
          <button type="button" class="header-uni-filter-info" id="uniFilterHelpBtn"
            onclick="StatisticoHeader.openUniFilterHelp()"
            title="How row filtering works" aria-label="Filter help">
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          </button>
          <button type="button" class="header-uni-filter-btn uni-filter-btn" id="uniFilterBtn"
            onclick="StatisticoHeader.openUniRowFilter()"
            title="Filter rows from the workbook range (Excel-style column filters)"
            disabled>
            <i class="fa-solid fa-filter" aria-hidden="true"></i>
            <span class="header-uni-filter-label">Filter</span>
            <span data-uni-filter-badge>—</span>
          </button>
        </div>`
      : '';

    return `
      <div class="header-global-controls">
        ${uniFilterHtml}
        <select id="decimalSelect" class="header-decimals-hidden-select" aria-hidden="true" tabindex="-1" onchange="StatisticoHeader.onDecimalChange(this.value)">
          ${optionsHtml}
        </select>
        <button id="headerThemeBtn" class="header-theme-btn" onclick="StatisticoHeader.toggleTheme()" title="Toggle light / dark theme">
          <span id="headerThemeLabel">Theme</span>
          <span id="headerThemeIcon">${themeIcon}</span>
        </button>
      </div>
    `;
  },

  _shouldRenderHeaderRowFilter() {
    return !this._isHeaderRowFilterSuppressed();
  },

  _isHeaderRowFilterSuppressed() {
    return this.module === 'mixed-model' || this.module === 'independent' || this.module === 'dependent' || this.module === 'regression';
  },

  _mergeActionsWithFallback(actions) {
    let result = { ...actions };

    if (this.module === 'correlations') {
      const fallback = this._buildCorrelationFallbackActions();
      result = {
        ...fallback,
        ...actions,
        moduleName: actions.moduleName || fallback.moduleName || 'Save correlation model',
        getData:    actions.getData    || fallback.getData,
        exportJson: actions.exportJson || fallback.exportJson,
        exportHtml: fallback.exportHtml
      };
    } else if (this.module === 'univariate') {
      const fallback = this._buildUnivariateFallbackActions();
      result = { ...fallback, ...actions, moduleName: actions.moduleName || fallback.moduleName || 'Save model' };
      // Always use shared univariate HTML exporter (section checklist + long report),
      // even if a page registers its own exportHtml.
      result.exportHtml = fallback.exportHtml;
    }

    // Generic: auto-supply exportJson for any module that has getData but no exportJson.
    // This ensures the JSON button is enabled for every analysis module without
    // requiring each page to implement its own download handler.
    if (typeof result.getData === 'function' && typeof result.exportJson !== 'function') {
      result.exportJson = this._buildGenericJsonExport(result.getData, this.module);
    }

    return result;
  },

  /**
   * Returns a generic exportJson callback that downloads the current getData()
   * payload as a JSON file.  Used as a fallback for any module that registers
   * getData but does not supply its own exportJson.
   */
  _buildGenericJsonExport(getData, moduleName) {
    return () => {
      const data = getData();
      if (!data) { alert('No data available for export yet.'); return; }
      const ts   = new Date().toISOString().replace(/[:.TZ]/g, '').replace(/-/g, '').slice(0, 14);
      const safe = String(moduleName || 'data').replace(/[^a-z0-9]/gi, '_');
      const payload = {
        module:      moduleName,
        exportedAt:  new Date().toISOString(),
        headers:     data.headers,
        usedRows:    data.usedRows,
        allRows:     data.allRows,
        columnRoles: data.columnRoles || {},
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `${safe}_data_${ts}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    };
  },

  _ensureDefaultActions() {
    if (this.module === 'univariate') {
      const existing = this._pendingActions || {};
      this._pendingActions = this._mergeActionsWithFallback(existing);
    } else if (this.module === 'correlations') {
      const existing = this._pendingActions || {};
      this._pendingActions = this._mergeActionsWithFallback(existing);
    } else if (this._pendingActions) {
      return;
    }
  },

  _buildCorrelationFallbackActions() {
    const safeName = (name) => String(name || 'Correlations').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
    const timestamp = () => new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
    const downloadBlob = (blob, filename) => {
      if (typeof window.navigator !== 'undefined' && typeof window.navigator.msSaveOrOpenBlob === 'function') {
        window.navigator.msSaveOrOpenBlob(blob, filename);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    };
    const esc = (value) => String(value ?? '').replace(/[<>&"]/g, (m) => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;' }[m]));
    const escAttr = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const absolutize = (value, baseUrl) => {
      if (!value) return value;
      const raw = String(value).trim();
      if (!raw || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('javascript:')) return raw;
      try { return new URL(raw, baseUrl).href; } catch (e) { return raw; }
    };
    const normalizeAssetUrls = (root, baseUrl) => {
      if (!root) return;
      ['href', 'src', 'poster'].forEach((attr) => {
        root.querySelectorAll(`[${attr}]`).forEach((el) => {
          const raw = el.getAttribute(attr);
          if (raw) el.setAttribute(attr, absolutize(raw, baseUrl));
        });
      });
    };
    const appendQueryParam = (url, key, value) => {
      try {
        const u = new URL(url, window.location.href);
        u.searchParams.set(key, value);
        return u.href;
      } catch (e) {
        return url;
      }
    };
    const getCorrelationData = () => {
      if (window.correlationData && window.correlationData.headers && window.correlationData.data) return window.correlationData;
      try {
        const stored = sessionStorage.getItem('correlationData');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      try {
        const stored = localStorage.getItem('correlationData') || localStorage.getItem('correlationResults');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return null;
    };
    const getFallbackData = () => {
      const payload = getCorrelationData();
      if (!payload || !Array.isArray(payload.headers) || !Array.isArray(payload.data)) return null;
      const headers = payload.headers.slice();
      const rows = payload.data.map((row) => headers.map((header) => row && typeof row === 'object' ? row[header] : null));
      // Forward source-level filter fields when they exist on the persisted
      // correlationData so the row-filter UI can see the FULL source range
      // (sourceHeaders / sourceRowsAll, e.g. 19 cols × 128 rows) and not
      // just the analysis subset (e.g. 7 cols × 95 rows). Without this,
      // child views like Taylor / Reliability / Descriptives that rely on
      // this fallback would lose the full-source view, so the banner and
      // Excel-style filter table would think nothing is filtered.
      const out = {
        headers,
        allRows: rows,
        usedRows: rows,
        fullRange: null,
        usedRange: null,
        columnRoles: headers.map(() => 'variable'),
        notice: null
      };
      if (Array.isArray(payload.sourceHeaders) && payload.sourceHeaders.length) {
        out.sourceHeaders = payload.sourceHeaders.slice();
      }
      if (Array.isArray(payload.sourceRowsAll) && payload.sourceRowsAll.length) {
        out.sourceRowsAll = payload.sourceRowsAll.map((r) => Array.isArray(r) ? r.slice() : r);
      }
      if (Array.isArray(payload.sourceRows)) {
        out.sourceRows = payload.sourceRows.map((r) => Array.isArray(r) ? r.slice() : r);
      }
      if (typeof payload.rowFilterActive === 'boolean') {
        out.rowFilterActive = payload.rowFilterActive;
      }
      if (payload.columnFilters && typeof payload.columnFilters === 'object') {
        out.columnFilters = payload.columnFilters;
      }
      if (Array.isArray(payload.analysisHeaders) && payload.analysisHeaders.length) {
        out.analysisHeaders = payload.analysisHeaders.slice();
      }
      return out;
    };
    const getCorrelationMenuItems = () => ([
      { id: 'matrix', label: 'Correlation Matrix', file: 'correlations/correlation-matrix-v2.html' },
      { id: 'network', label: 'Correlation Network', file: 'correlations/correlation-network.html' },
      { id: 'partial', label: 'Partial Correlations', file: 'correlations/correlation-partial.html' },
      { id: 'reliability', label: 'Reliability Coefficients', file: 'correlations/correlation-reliability.html' },
      { id: 'taylor', label: 'Taylor Diagram', file: 'correlations/correlation-taylor.html' },
      { id: 'descriptives', label: 'Descriptive Statistics', file: 'correlations/descriptive-stats.html' },
      { id: 'by-group', label: 'Correlations by Group', file: 'correlations/by-group.html' }
    ]);
    const pickReportSections = (sections, onConfirm) => {
      const existing = document.getElementById('stReportExportOverlay');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'stReportExportOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:2147483300;display:flex;align-items:center;justify-content:center;padding:16px;';
      const sectionListHtml = sections.map((s) => `
        <label style="display:flex;align-items:center;gap:8px;padding:5px 4px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:13px;cursor:pointer;">
          <input type="checkbox" data-section-id="${esc(s.id)}" checked style="cursor:pointer;accent-color:#f97316;" />
          <span>${esc(s.label)}</span>
        </label>
      `).join('');
      overlay.innerHTML = `
        <div style="width:min(560px,95vw);max-height:88vh;background:#fff;border-radius:14px;border:1px solid #cbd5e1;box-shadow:0 16px 40px rgba(15,23,42,.32);display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-file-export" style="color:#f97316;font-size:16px;"></i>
            <span style="font-size:15px;font-weight:700;color:#0f172a;">Export Report</span>
          </div>
          <div style="padding:10px 18px 4px;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#64748b;margin-bottom:6px;">Sections to include</div>
          </div>
          <div style="padding:0 18px 8px;overflow-y:auto;flex:1;">${sectionListHtml}</div>
          <div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;">
            <button id="stReportCancelBtn" style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#374151;font-size:13px;font-weight:500;cursor:pointer;">Cancel</button>
            <button id="stReportExportBtn" style="padding:8px 16px;border:1px solid #f97316;border-radius:8px;background:#f97316;color:#fff;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
              <i class="fa-solid fa-file-export"></i> Export HTML
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.querySelector('#stReportCancelBtn').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('#stReportExportBtn').addEventListener('click', () => {
        const checked = Array.from(overlay.querySelectorAll('input[data-section-id]:checked'))
          .map((el) => el.getAttribute('data-section-id'));
        if (!checked.length) return;
        close();
        onConfirm(checked);
      });
    };
    const extractRichSnapshot = (doc, sourceUrl) => {
      const headClone = (doc.head ? doc.head.cloneNode(true) : document.createElement('head'));
      headClone.querySelectorAll('script, noscript').forEach((n) => n.remove());
      normalizeAssetUrls(headClone, sourceUrl);
      const bodyClone = (doc.body ? doc.body.cloneNode(true) : document.createElement('body'));
      bodyClone.querySelectorAll('script, noscript').forEach((n) => n.remove());
      normalizeAssetUrls(bodyClone, sourceUrl);
      this._prepareExportSnapshotBody(bodyClone);
      const primary = bodyClone.querySelector('.right-col') || bodyClone.querySelector('.container') || bodyClone;
      const payload = primary === bodyClone ? bodyClone.innerHTML : primary.outerHTML;
      return `<!DOCTYPE html><html><head><meta charset="utf-8">${headClone.innerHTML}</head><body>${payload}</body></html>`;
    };
    const captureSectionSnapshot = (url, liveData) => new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-99999px;top:-99999px;width:1360px;height:900px;opacity:0;pointer-events:none;';
      iframe.setAttribute('aria-hidden', 'true');
      let settled = false;
      let timer = null;
      const finish = (snapshotHtml, ok) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        try { iframe.remove(); } catch (e) {}
        resolve({ snapshotHtml, ok });
      };
      const tryCapture = (startedAt) => {
        try {
          const doc = iframe.contentDocument;
          if (!doc) return finish('', false);
          doc.querySelectorAll('#uniResultsViewTabs, .uni-results-tab-stack, .navrow-tabs').forEach((n) => n.remove());
          const hasRenderable = !!doc.querySelector('svg, canvas, .highcharts-root, .highcharts-container, table');
          if (hasRenderable || (Date.now() - startedAt) > 9000) {
            finish(extractRichSnapshot(doc, url), true);
          } else {
            setTimeout(() => tryCapture(startedAt), 250);
          }
        } catch (e) {
          finish('', false);
        }
      };
      iframe.addEventListener('load', () => {
        try {
          if (liveData && typeof iframe.contentWindow.handleDataReceived === 'function') {
            iframe.contentWindow.handleDataReceived(liveData);
          }
        } catch (_) {}
        setTimeout(() => tryCapture(Date.now()), liveData ? 1800 : 800);
      }, { once: true });
      timer = setTimeout(() => finish('', false), 12000);
      iframe.src = url;
      document.body.appendChild(iframe);
    });
    const fallbackDataSection = (data) => {
      const rows = data.allRows.slice(0, 500).map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
      const head = data.headers.map((header) => `<th>${esc(header)}</th>`).join('');
      return `<section><h2>Data Snapshot</h2><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>${data.allRows.length > 500 ? '<p class="meta">Only the first 500 rows are shown.</p>' : ''}</section>`;
    };
    return {
      moduleName: 'Correlation analysis',
      getData: getFallbackData,
      exportJson: () => {
        const payload = getCorrelationData();
        if (!payload) { alert('No correlation data available for export yet.'); return; }
        downloadBlob(
          new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
          `Correlation_Data_${timestamp()}.json`
        );
      },
      exportHtml: () => {
        const data = getFallbackData();
        const liveData = getCorrelationData();
        if (!data || !liveData) { alert('No correlation data available for export yet.'); return; }
        const sections = getCorrelationMenuItems();
        pickReportSections(sections, (selectedIds) => {
          const selected = sections.filter((s) => selectedIds.includes(String(s.id)));
          const toc = selected.map((s, i) => `<li><a href="#sec_${i + 1}">${esc(s.label)}</a></li>`).join('');

          const progressOverlay = document.createElement('div');
          progressOverlay.id = 'stExportProgressOverlay';
          progressOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:2147483400;display:flex;align-items:center;justify-content:center;padding:16px;';
          progressOverlay.innerHTML = `
            <div style="min-width:280px;max-width:440px;padding:16px 18px;border-radius:12px;border:1px solid rgba(148,163,184,.4);background:#111827;color:#e5e7eb;box-shadow:0 12px 28px rgba(2,6,23,.5);display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span id="stExportSpinner" style="width:16px;height:16px;border:2px solid rgba(148,163,184,.3);border-top-color:#f97316;border-radius:999px;display:inline-block;animation:stExSpin .75s linear infinite;flex-shrink:0;"></span>
                <span id="stExportProgressLabel" style="font-size:13px;font-weight:600;letter-spacing:.2px;">Preparing export...</span>
              </div>
              <div style="height:4px;background:rgba(148,163,184,.2);border-radius:4px;overflow:hidden;">
                <div id="stExportProgressBar" style="height:100%;width:0%;background:#f97316;border-radius:4px;transition:width .3s ease;"></div>
              </div>
              <div id="stExportProgressSub" style="font-size:11px;color:#94a3b8;"></div>
            </div>
            <style>@keyframes stExSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
          `;
          document.body.appendChild(progressOverlay);
          const setProgress = (done, total, label) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const bar = document.getElementById('stExportProgressBar');
            const lbl = document.getElementById('stExportProgressLabel');
            const sub = document.getElementById('stExportProgressSub');
            if (bar) bar.style.width = pct + '%';
            if (lbl && label) lbl.textContent = label;
            if (sub) sub.textContent = `${done} of ${total} sections captured`;
          };
          const closeProgress = () => {
            const el = document.getElementById('stExportProgressOverlay');
            if (el) el.remove();
          };

          (async () => {
            try { sessionStorage.setItem('correlationData', JSON.stringify(liveData)); } catch (_) {}
            const snapshotResults = [];
            for (let i = 0; i < selected.length; i += 1) {
              const s = selected[i];
              setProgress(i, selected.length, `Capturing: ${esc(s.label)}...`);
              const url = appendQueryParam(this.resolveDialogUrl(s.file), 'embed', '1');
              snapshotResults.push(await captureSectionSnapshot(url, liveData));
            }
            setProgress(selected.length, selected.length, 'Building report...');
            const builtSections = selected.map((s, i) => {
              const snap = snapshotResults[i] || { ok: false, snapshotHtml: '' };
              return `
                <section id="sec_${i + 1}">
                  <h2>${i + 1}. ${esc(s.label)}</h2>
                  <p class="meta">${snap.ok ? 'Embedded rich page snapshot.' : 'Section preview unavailable in this export.'}</p>
                  ${snap.ok ? `<iframe class="report-frame" srcdoc="${escAttr(snap.snapshotHtml)}"></iframe>` : ''}
                </section>
              `;
            });
            const reportCss = `body{font-family:Segoe UI,Arial,sans-serif;padding:24px;max-width:1120px;margin:auto;color:#0f172a}h1{margin-bottom:4px}h2{margin-top:28px}nav{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}section{page-break-inside:avoid;border-top:1px solid #e2e8f0;padding-top:14px}.meta{color:#475569;font-size:13px}.report-frame{width:100%;height:760px;border:1px solid #d1d5db;border-radius:10px;background:#fff}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:center}th{background:#f1f5f9}a{color:#0ea5e9;text-decoration:none}a:hover{text-decoration:underline}`;
            const reportBody = `<h1>Correlation Long Report</h1><p class="meta"><strong>Variables:</strong> ${data.headers.length} &nbsp;&middot;&nbsp; <strong>Rows:</strong> ${data.allRows.length} &nbsp;&middot;&nbsp; <strong>Generated:</strong> ${new Date().toLocaleString()}</p><nav><strong>Included sections</strong><ol>${toc}</ol></nav>${builtSections.join('')}${fallbackDataSection(data)}`;
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Correlation Long Report</title><style>${reportCss}</style></head><body>${reportBody}</body></html>`;
            closeProgress();
            downloadBlob(
              new Blob([html], { type: 'text/html' }),
              `Correlation_Report_${safeName(this.currentTitle || 'Correlation')}_${timestamp()}.html`
            );
          })().catch(() => closeProgress());
        });
      }
    };
  },

  _buildUnivariateFallbackActions() {
    const coerceNumericVector = (input) => {
      if (!Array.isArray(input)) return [];
      if (!input.length) return [];
      const source = Array.isArray(input[0]) ? input.map((r) => (Array.isArray(r) ? r[0] : r)) : input;
      return source
        .map((v) => (v === null || v === undefined || v === '' ? null : Number(v)))
        .filter((v) => v === null || Number.isFinite(v));
    };

    const pickValues = (obj) => {
      if (!obj || typeof obj !== 'object') return [];
      return coerceNumericVector(
        obj.rawData ||
        obj.values ||
        obj.data?.rawData ||
        obj.data?.values ||
        obj.data ||
        obj.series ||
        []
      );
    };

    const getFallbackData = () => {
      try {
        // Prefer live in-memory globals over potentially stale localStorage
        const liveValues = coerceNumericVector(
          window.currentDataArray ||
          window.originalData ||
          window.currentData ||
          window.data ||
          []
        );

        let parsed = null;
        if (!liveValues.length) {
          // No live data — fall back to storage
          try {
            const raw = localStorage.getItem('univariateResults');
            if (raw) parsed = JSON.parse(raw);
          } catch (e) {}
          if (!parsed) {
            try {
              const rawSession = sessionStorage.getItem('univariateResults');
              if (rawSession) parsed = JSON.parse(rawSession);
            } catch (e) {}
          }
          if (!parsed && window.__statisticoLastUnivariateData && typeof window.__statisticoLastUnivariateData === 'object') {
            parsed = window.__statisticoLastUnivariateData;
          }
        }

        let values = liveValues.length ? liveValues : pickValues(parsed || {});
        if (!values.length) return null;

        const varName =
          (parsed && (parsed.column || parsed.variableName || parsed.variable || parsed.colName)) ||
          this.variableName ||
          'Variable';
        const allRows = values.map((v) => [v === null || v === undefined ? null : v]);
        return {
          headers: [varName],
          allRows,
          usedRows: allRows,
          fullRange: null,
          usedRange: null,
          columnRoles: ['y'],
          notice: null
        };
      } catch (e) {
        return null;
      }
    };

    const downloadBlob = (blob, filename) => {
      // msSaveOrOpenBlob works in WebView2 / Office Add-in without triggering
      // the "open this blob link" dialog that URL.createObjectURL causes
      if (typeof window.navigator !== 'undefined' && typeof window.navigator.msSaveOrOpenBlob === 'function') {
        window.navigator.msSaveOrOpenBlob(blob, filename);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    };

    const timestamp = () => new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
    const safeName = (name) => String(name || 'Variable').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30);
    const esc = (value) => String(value ?? '').replace(/[<>&"]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m]));
    const escAttr = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const absolutize = (value, baseUrl) => {
      if (!value) return value;
      const raw = String(value).trim();
      if (!raw || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('javascript:')) return raw;
      try { return new URL(raw, baseUrl).href; } catch (e) { return raw; }
    };
    const normalizeAssetUrls = (root, baseUrl) => {
      if (!root) return;
      ['href', 'src', 'poster'].forEach((attr) => {
        root.querySelectorAll(`[${attr}]`).forEach((el) => {
          const raw = el.getAttribute(attr);
          if (!raw) return;
          el.setAttribute(attr, absolutize(raw, baseUrl));
        });
      });
    };
    const appendQueryParam = (url, key, value) => {
      try {
        const u = new URL(url, window.location.href);
        u.searchParams.set(key, value);
        return u.href;
      } catch (e) {
        return url;
      }
    };
    const extractRichSnapshot = (doc, sourceUrl) => {
      const headClone = (doc.head ? doc.head.cloneNode(true) : document.createElement('head'));
      headClone.querySelectorAll('script, noscript').forEach((n) => n.remove());
      normalizeAssetUrls(headClone, sourceUrl);

      const bodyClone = (doc.body ? doc.body.cloneNode(true) : document.createElement('body'));
      bodyClone.querySelectorAll('script, noscript').forEach((n) => n.remove());
      normalizeAssetUrls(bodyClone, sourceUrl);
      this._prepareExportSnapshotBody(bodyClone);

      const primary =
        bodyClone.querySelector('.right-col') ||
        bodyClone.querySelector('.main-content') ||
        bodyClone.querySelector('.content') ||
        bodyClone.querySelector('.container') ||
        bodyClone;

      const payload = primary === bodyClone ? bodyClone.innerHTML : primary.outerHTML;
      return `<!DOCTYPE html><html><head><meta charset="utf-8">${headClone.innerHTML}</head><body>${payload}</body></html>`;
    };
    const captureSectionSnapshot = (url, liveData) => new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-99999px;top:-99999px;width:1360px;height:900px;opacity:0;pointer-events:none;';
      iframe.setAttribute('aria-hidden', 'true');
      let settled = false;
      let timer = null;
      const finish = (snapshotHtml, ok) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        try { iframe.remove(); } catch (e) {}
        resolve({ snapshotHtml, ok });
      };
      const tryCapture = (startedAt) => {
        try {
          const doc = iframe.contentDocument;
          if (!doc) return finish('', false);
          doc.querySelectorAll('#uniResultsViewTabs, .uni-results-tab-stack').forEach((n) => n.remove());
          if (url.indexOf('boxplot-standalone') !== -1) {
            const main = doc.getElementById('boxplotPanel-main');
            const outliers = doc.getElementById('boxplotPanel-outliers');
            if (main) {
              main.classList.add('is-active');
              main.style.display = '';
            }
            if (outliers) {
              outliers.classList.remove('is-active');
              outliers.style.display = 'none';
            }
          }
          const hasRenderable = !!doc.querySelector('svg, canvas, .highcharts-root, .highcharts-container, .chart, table');
          if (hasRenderable || (Date.now() - startedAt) > 9000) {
            const snapshot = extractRichSnapshot(doc, url);
            finish(snapshot, true);
            return;
          }
          setTimeout(() => tryCapture(startedAt), 250);
        } catch (e) {
          finish('', false);
        }
      };
      iframe.addEventListener('load', () => {
        // Inject live data to override any sample-data fallback loaded by the page
        try {
          if (liveData && typeof iframe.contentWindow.handleDataReceived === 'function') {
            iframe.contentWindow.handleDataReceived(liveData);
          }
        } catch (_) {}
        // Wait longer after data injection so charts have time to re-render
        setTimeout(() => tryCapture(Date.now()), liveData ? 1800 : 500);
      }, { once: true });
      timer = setTimeout(() => finish('', false), 6000);
      iframe.src = url;
      document.body.appendChild(iframe);
    });

    const computeStats = (values) => {
      const numeric = (values || []).filter((v) => Number.isFinite(v));
      if (!numeric.length) return null;
      const sorted = [...numeric].sort((a, b) => a - b);
      const n = sorted.length;
      const mean = sorted.reduce((a, b) => a + b, 0) / n;
      const variance = n > 1 ? sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0;
      const q = (p) => {
        const pos = (n - 1) * p;
        const base = Math.floor(pos);
        const rest = pos - base;
        return sorted[base + 1] !== undefined
          ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
          : sorted[base];
      };
      return {
        n,
        mean,
        sd: Math.sqrt(variance),
        min: sorted[0],
        q1: q(0.25),
        median: q(0.5),
        q3: q(0.75),
        max: sorted[n - 1]
      };
    };

    const getUnivariateMenuItems = () => {
      const cfg = this._getSharedSidebarConfig ? this._getSharedSidebarConfig() : null;
      const groups = (cfg && Array.isArray(cfg.groups)) ? cfg.groups : [];
      const items = [];
      const pushNavigate = (entry) => {
        if (!entry || !entry.label) return;
        items.push({
          id: entry.view || entry.file || entry.label,
          label: entry.label,
          file: entry.file || null
        });
      };
      groups.forEach((group) => {
        (group.items || []).forEach((item) => {
          if (item.type !== 'navigate' || !item.label) return;
          if (Array.isArray(item.facets) && item.facets.length) {
            item.facets.forEach((facet) => pushNavigate(facet));
          } else {
            pushNavigate(item);
          }
        });
      });
      const pinned = cfg && cfg.pinnedNav && cfg.pinnedNav.items;
      if (Array.isArray(pinned)) {
        pinned.forEach((item) => {
          if (item.type === 'navigate') pushNavigate(item);
        });
      }
      return items;
    };

    const pickReportSections = (sections, onConfirm) => {
      const existing = document.getElementById('stReportExportOverlay');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'stReportExportOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:2147483300;display:flex;align-items:center;justify-content:center;padding:16px;';

      const sectionListHtml = sections.map((s) => `
        <label style="display:flex;align-items:center;gap:8px;padding:5px 4px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:13px;cursor:pointer;">
          <input type="checkbox" data-section-id="${esc(s.id)}" checked style="cursor:pointer;accent-color:#f97316;" />
          <span>${esc(s.label)}</span>
        </label>
      `).join('');

      overlay.innerHTML = `
        <div style="width:min(560px,95vw);max-height:88vh;background:#fff;border-radius:14px;border:1px solid #cbd5e1;box-shadow:0 16px 40px rgba(15,23,42,.32);display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-file-export" style="color:#f97316;font-size:16px;"></i>
            <span style="font-size:15px;font-weight:700;color:#0f172a;">Export Report</span>
          </div>
          <div style="padding:10px 18px 4px;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#64748b;margin-bottom:6px;">Sections to include</div>
          </div>
          <div style="padding:0 18px 8px;overflow-y:auto;flex:1;">${sectionListHtml}</div>
          <div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;">
            <button id="stReportCancelBtn" style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#374151;font-size:13px;font-weight:500;cursor:pointer;">Cancel</button>
            <button id="stReportExportBtn" style="padding:8px 16px;border:1px solid #f97316;border-radius:8px;background:#f97316;color:#fff;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
              <i class="fa-solid fa-file-export"></i> Export HTML
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.querySelector('#stReportCancelBtn').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('#stReportExportBtn').addEventListener('click', () => {
        const checked = Array.from(overlay.querySelectorAll('input[data-section-id]:checked'))
                             .map((el) => el.getAttribute('data-section-id'));
        if (!checked.length) return;
        close();
        onConfirm(checked);
      });
    };

    const percentile = (sorted, p) => {
      if (!sorted.length) return null;
      const pos = (sorted.length - 1) * p;
      const base = Math.floor(pos);
      const rest = pos - base;
      return sorted[base + 1] !== undefined
        ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
        : sorted[base];
    };

    const sectionSpecificHtml = (sectionId, sectionLabel, values, stats, variableName) => {
      const sorted = [...values].sort((a, b) => a - b);
      const n = values.length;
      const commonStatsTable = stats ? `
        <table><thead><tr><th>n</th><th>Mean</th><th>SD</th><th>Min</th><th>Q1</th><th>Median</th><th>Q3</th><th>Max</th></tr></thead>
        <tbody><tr><td>${stats.n}</td><td>${stats.mean.toFixed(4)}</td><td>${stats.sd.toFixed(4)}</td><td>${stats.min.toFixed(4)}</td><td>${stats.q1.toFixed(4)}</td><td>${stats.median.toFixed(4)}</td><td>${stats.q3.toFixed(4)}</td><td>${stats.max.toFixed(4)}</td></tr></tbody></table>
      ` : '<p>No numeric summary available.</p>';

      if (sectionId === 'histogram') {
        if (!n) return '<p>No data for histogram.</p>';
        const bins = Math.max(5, Math.min(12, Math.round(Math.sqrt(n))));
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const width = (max - min) / bins || 1;
        const counts = Array.from({ length: bins }, () => 0);
        values.forEach((v) => {
          const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / width)));
          counts[idx] += 1;
        });
        const rows = counts.map((c, i) => {
          const lo = min + i * width;
          const hi = i === bins - 1 ? max : lo + width;
          return `<tr><td>${lo.toFixed(4)} - ${hi.toFixed(4)}</td><td>${c}</td></tr>`;
        }).join('');
        return `<p>Histogram distribution for <strong>${esc(variableName)}</strong>.</p><table><thead><tr><th>Bin range</th><th>Frequency</th></tr></thead><tbody>${rows}</tbody></table>`;
      }

      if (sectionId === 'boxplot') {
        return `<p>Box plot five-number summary and spread indicators.</p>${commonStatsTable}`;
      }

      if (sectionId === 'cdf') {
        const points = [0.1, 0.25, 0.5, 0.75, 0.9].map((p) => {
          const x = percentile(sorted, p);
          return `<tr><td>${(p * 100).toFixed(0)}%</td><td>${x !== null ? x.toFixed(4) : '--'}</td></tr>`;
        }).join('');
        return `<p>Cumulative distribution checkpoints.</p><table><thead><tr><th>Percentile</th><th>Value</th></tr></thead><tbody>${points}</tbody></table>`;
      }

      if (sectionId === 'percentile') {
        const points = [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99].map((p) => {
          const x = percentile(sorted, p);
          return `<tr><td>P${(p * 100).toFixed(0)}</td><td>${x !== null ? x.toFixed(4) : '--'}</td></tr>`;
        }).join('');
        return `<p>Detailed percentile table.</p><table><thead><tr><th>Percentile</th><th>Value</th></tr></thead><tbody>${points}</tbody></table>`;
      }

      if (sectionId === 'kernel') {
        return `<p>Kernel density section (smoothed distribution overview).</p>${commonStatsTable}`;
      }

      if (sectionId === 'outliers') {
        if (!stats) return '<p>No outlier analysis available.</p>';
        const iqr = stats.q3 - stats.q1;
        const lower = stats.q1 - 1.5 * iqr;
        const upper = stats.q3 + 1.5 * iqr;
        const outliers = values.filter((v) => v < lower || v > upper);
        const outRows = outliers.length ? outliers.map((v, i) => `<tr><td>${i + 1}</td><td>${v.toFixed(4)}</td></tr>`).join('') : '<tr><td colspan="2">No outliers detected.</td></tr>';
        return `<p>IQR-based outlier detection (fences: ${lower.toFixed(4)} to ${upper.toFixed(4)}).</p><table><thead><tr><th>#</th><th>Outlier value</th></tr></thead><tbody>${outRows}</tbody></table>`;
      }

      if (sectionId === 'normality') {
        if (!stats || stats.sd === 0) return '<p>Normality metrics unavailable.</p>';
        const m3 = values.reduce((acc, v) => acc + Math.pow(v - stats.mean, 3), 0) / n;
        const m4 = values.reduce((acc, v) => acc + Math.pow(v - stats.mean, 4), 0) / n;
        const skew = m3 / Math.pow(stats.sd, 3);
        const kurt = (m4 / Math.pow(stats.sd, 4)) - 3;
        return `<p>Distribution shape diagnostics.</p><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody><tr><td>Skewness</td><td>${skew.toFixed(4)}</td></tr><tr><td>Excess Kurtosis</td><td>${kurt.toFixed(4)}</td></tr></tbody></table>`;
      }

      if (sectionId === 'qqplot') {
        const samples = [0.1, 0.25, 0.5, 0.75, 0.9].map((p) => {
          const obs = percentile(sorted, p);
          return `<tr><td>${(p * 100).toFixed(0)}%</td><td>${obs !== null ? obs.toFixed(4) : '--'}</td></tr>`;
        }).join('');
        return `<p>Quantile comparison points for PP/QQ interpretation.</p><table><thead><tr><th>Quantile</th><th>Observed value</th></tr></thead><tbody>${samples}</tbody></table>`;
      }

      if (sectionId === 'hypothesis') {
        if (!stats || n < 2) return '<p>Hypothesis summary unavailable.</p>';
        const se = stats.sd / Math.sqrt(n);
        const t = se ? stats.mean / se : 0;
        return `<p>One-sample hypothesis snapshot (H0: mean = 0).</p><table><thead><tr><th>Statistic</th><th>Value</th></tr></thead><tbody><tr><td>Mean</td><td>${stats.mean.toFixed(4)}</td></tr><tr><td>SE</td><td>${se.toFixed(4)}</td></tr><tr><td>t-stat</td><td>${t.toFixed(4)}</td></tr></tbody></table>`;
      }

      if (sectionId === 'confidence') {
        if (!stats || n < 2) return '<p>Confidence interval unavailable.</p>';
        const se = stats.sd / Math.sqrt(n);
        const z = 1.96;
        const lo = stats.mean - z * se;
        const hi = stats.mean + z * se;
        return `<p>95% confidence interval for the mean.</p><table><thead><tr><th>Mean</th><th>Lower</th><th>Upper</th></tr></thead><tbody><tr><td>${stats.mean.toFixed(4)}</td><td>${lo.toFixed(4)}</td><td>${hi.toFixed(4)}</td></tr></tbody></table>`;
      }

      return `<p>${esc(sectionLabel)} summary.</p>${commonStatsTable}`;
    };

    return {
      getData: () => getFallbackData(),
      exportJson: () => {
        const data = getFallbackData();
        if (!data) { alert('No data available for export yet.'); return; }
        const payload = {
          variableName: data.headers[0],
          sampleSize: data.allRows.length,
          values: data.allRows.map((r) => r[0])
        };
        downloadBlob(
          new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
          `Univariate_${safeName(data.headers[0])}_${timestamp()}.json`
        );
      },
      exportHtml: () => {
        const data = getFallbackData();
        if (!data) { alert('No data available for export yet.'); return; }
        const sections = getUnivariateMenuItems();
        if (!sections.length) {
          alert('No report sections available from the current menu.');
          return;
        }
        pickReportSections(sections, (selectedIds) => {
          const selected = sections.filter((s) => selectedIds.includes(String(s.id)));
          const escapedVar = esc(data.headers[0]);
          const toc = selected.map((s, i) => `<li><a href="#sec_${i + 1}">${esc(s.label)}</a></li>`).join('');

          // ── Progress overlay ──────────────────────────────────────────────
          const progressOverlay = document.createElement('div');
          progressOverlay.id = 'stExportProgressOverlay';
          progressOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:2147483400;display:flex;align-items:center;justify-content:center;padding:16px;';
          progressOverlay.innerHTML = `
            <div style="min-width:280px;max-width:440px;padding:16px 18px;border-radius:12px;border:1px solid rgba(148,163,184,.4);background:#111827;color:#e5e7eb;box-shadow:0 12px 28px rgba(2,6,23,.5);display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span id="stExportSpinner" style="width:16px;height:16px;border:2px solid rgba(148,163,184,.3);border-top-color:#f97316;border-radius:999px;display:inline-block;animation:stExSpin .75s linear infinite;flex-shrink:0;"></span>
                <span id="stExportProgressLabel" style="font-size:13px;font-weight:600;letter-spacing:.2px;">Preparing export…</span>
              </div>
              <div style="height:4px;background:rgba(148,163,184,.2);border-radius:4px;overflow:hidden;">
                <div id="stExportProgressBar" style="height:100%;width:0%;background:#f97316;border-radius:4px;transition:width .3s ease;"></div>
              </div>
              <div id="stExportProgressSub" style="font-size:11px;color:#94a3b8;"></div>
            </div>
            <style>@keyframes stExSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
          `;
          document.body.appendChild(progressOverlay);

          const setProgress = (done, total, label) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const bar = document.getElementById('stExportProgressBar');
            const lbl = document.getElementById('stExportProgressLabel');
            const sub = document.getElementById('stExportProgressSub');
            if (bar) bar.style.width = pct + '%';
            if (lbl && label) lbl.textContent = label;
            if (sub) sub.textContent = `${done} of ${total} sections captured`;
          };
          const closeProgress = () => {
            const el = document.getElementById('stExportProgressOverlay');
            if (el) el.remove();
          };
          // ─────────────────────────────────────────────────────────────────

          (async () => {
            const total = selected.length;
            const snapshotResults = [];

            // Ensure every iframe sees the current session's live data
            this._syncLiveDataToStorage();

            // Read it back as the payload to inject directly into each iframe
            let liveData = null;
            try { const r = localStorage.getItem('univariateResults'); if (r) liveData = JSON.parse(r); } catch (_) {}
            for (let i = 0; i < total; i += 1) {
              const s = selected[i];
              setProgress(i, total, `Capturing: ${esc(s.label)}…`);
              if (!s.file) {
                snapshotResults.push({ ok: false, snapshotHtml: '', noFile: true });
              } else {
                const url = appendQueryParam(this.resolveDialogUrl(s.file), 'embed', '1');
                snapshotResults.push(await captureSectionSnapshot(url, liveData));
              }
            }
            setProgress(total, total, 'Building report…');

            const builtSections = selected.map((s, i) => {
              const snap = snapshotResults[i] || { ok: false, snapshotHtml: '' };
              if (!s.file || snap.noFile) {
                return `
                  <section id="sec_${i + 1}">
                    <h2>${i + 1}. ${esc(s.label)}</h2>
                    <p class="meta">No page file mapped for this section.</p>
                  </section>
                `;
              }
              return `
                <section id="sec_${i + 1}">
                  <h2>${i + 1}. ${esc(s.label)}</h2>
                  <p class="meta">${snap.ok ? 'Embedded rich page snapshot.' : 'Section preview unavailable in this export.'}</p>
                  ${snap.ok ? `<iframe class="report-frame" srcdoc="${escAttr(snap.snapshotHtml)}"></iframe>` : ''}
                </section>
              `;
            });

            const reportCss = `body{font-family:Segoe UI,Arial,sans-serif;padding:24px;max-width:1120px;margin:auto;color:#0f172a}h1{margin-bottom:4px}h2{margin-top:28px}nav{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}section{page-break-inside:avoid;border-top:1px solid #e2e8f0;padding-top:14px}.meta{color:#475569;font-size:13px}.report-frame{width:100%;height:760px;border:1px solid #d1d5db;border-radius:10px;background:#fff}a{color:#0ea5e9;text-decoration:none}a:hover{text-decoration:underline}`;
            const reportBody = `<h1>Univariate Long Report</h1><p class="meta"><strong>Variable:</strong> ${escapedVar} &nbsp;&middot;&nbsp; <strong>Generated:</strong> ${new Date().toLocaleString()}</p><nav><strong>Included sections</strong><ol>${toc}</ol></nav>${builtSections.join('')}`;
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapedVar} - Long Report</title><style>${reportCss}</style></head><body>${reportBody}</body></html>`;

            closeProgress();
            downloadBlob(
              new Blob([html], { type: 'text/html' }),
              `Univariate_Report_${safeName(data.headers[0])}_${timestamp()}.html`
            );
          })().catch(() => closeProgress());
        });
      }
    };
  },

  getDecimalPreference() {
    try { return localStorage.getItem('statistico-decimals') || 'auto'; } catch (e) { return 'auto'; }
  },

  setDecimalPreference(value) {
    const normalized = value === undefined || value === null || value === '' ? 'auto' : String(value);
    try { localStorage.setItem('statistico-decimals', normalized); } catch (e) {}
    return normalized;
  },

  _installDecimalOverride() {
    if (typeof Number.prototype.__statisticoToFixedOriginal === 'function') return;
    Number.prototype.__statisticoToFixedOriginal = Number.prototype.toFixed;
    Number.prototype.toFixed = function (digits) {
      try {
        const pref = localStorage.getItem('statistico-decimals') || 'auto';
        if (pref !== 'auto') {
          const forced = Math.max(0, parseInt(pref, 10) || 0);
          return Number.prototype.__statisticoToFixedOriginal.call(this, forced);
        }
      } catch (e) {}
      return Number.prototype.__statisticoToFixedOriginal.call(this, digits);
    };
  },

  applyDecimalPreferenceToPage(value, options = {}) {
    const normalized = this.setDecimalPreference(value);
    this._installDecimalOverride();
    const headerSelect = document.getElementById('decimalSelect');
    if (headerSelect && headerSelect.value !== normalized) headerSelect.value = normalized;
    const headerValue = document.getElementById('headerDecimalValue');
    if (headerValue) headerValue.textContent = normalized === 'auto' ? 'Auto' : normalized;
    const headerMenu = document.getElementById('headerDecimalMenu');
    if (headerMenu) {
      headerMenu.querySelectorAll('.header-decimals-option').forEach((btn) => {
        const valueText = (btn.textContent || '').trim();
        const optionValue = valueText.toLowerCase() === 'auto' ? 'auto' : valueText;
        btn.classList.toggle('active', optionValue === normalized);
      });
    }

    const numericValue = normalized === 'auto' ? null : String(Math.max(0, parseInt(normalized, 10) || 0));
    const localSelect = document.getElementById('decimals');
    if (localSelect && numericValue !== null && localSelect.value !== numericValue) {
      localSelect.value = numericValue;
      if (typeof window.updateVisualization === 'function') window.updateVisualization();
    }
    const legacySelect = document.getElementById('decimalsSelect');
    if (legacySelect && numericValue !== null && legacySelect.value !== numericValue) {
      legacySelect.value = numericValue;
      if (typeof window.updateDecimals === 'function') window.updateDecimals(numericValue);
    }

    const hasSetter = typeof window.setDecimalPrecision === 'function';
    const hasUpdater = typeof window.updateDecimalPrecision === 'function';
    if (hasSetter) window.setDecimalPrecision();
    else if (hasUpdater) window.updateDecimalPrecision();
    else if (options && options.isUserChange) {
      // Some pages use hardcoded toFixed(...) only. Reload once to re-render with the shared override.
      window.location.reload();
      return;
    }

    document.dispatchEvent(new CustomEvent('statistico-decimals-changed', { detail: { value: normalized } }));
  },

  onDecimalChange(value) {
    this.applyDecimalPreferenceToPage(value, { isUserChange: true });
  },

  toggleDecimalMenu() {
    const menu = document.getElementById('headerDecimalMenu');
    if (!menu) return;
    menu.classList.toggle('show');
  },

  closeDecimalMenu() {
    const menu = document.getElementById('headerDecimalMenu');
    if (menu) menu.classList.remove('show');
  },

  selectDecimalOption(value) {
    this.onDecimalChange(value);
    this.closeDecimalMenu();
  },

  _uniFilterAssetBase() {
    const { origin, pathname } = window.location;
    if (pathname.includes('/dialogs/views/')) {
      return `${origin}${pathname.split('/dialogs/views/')[0]}/dialogs/views/shared/`;
    }
    return `${origin}/dialogs/views/shared/`;
  },

  _injectUniFilterAssets() {
    const v = '20260524e';
    const base = this._uniFilterAssetBase();
    const cssHref = `${base}uni-filter-shared.css?v=${v}`;
    const existingCss = document.querySelector('link[data-uni-filter-shared-css]');
    if (!existingCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      link.setAttribute('data-uni-filter-shared-css', '1');
      document.head.appendChild(link);
    } else if (existingCss.getAttribute('href') !== cssHref) {
      existingCss.setAttribute('href', cssHref);
    }
    const scriptSrc = `${base}uni-row-filter.js?v=${v}`;
    const filterApiSrc = `${base}filter.js?v=${v}`;

    // Load the lean Filter API. It has no side effects — just exposes
    // window.Filter — so it's safe to load even on pages that don't use
    // it directly. Migrated views call Filter.attach themselves; legacy
    // views still rely on _initUniRowFilterFromStorage.
    const ensureFilterApi = () => {
      // Trust window.Filter once it is fully loaded. Pages may preload
      // filter.js with a relative href to avoid the boot-time flicker.
      if (window.Filter && typeof window.Filter.attach === 'function') return;
      const existing = document.querySelector('script[data-filter-api]') ||
        document.querySelector('script[src*="/shared/filter.js"]');
      if (existing) return; // already loading
      const fs = document.createElement('script');
      fs.src = filterApiSrc;
      fs.setAttribute('data-filter-api', '1');
      document.head.appendChild(fs);
    };

    const boot = () => {
      try {
        this._ensureUniFilterOverlay();
        this._ensureUniFilterHelpOverlay();
        this._ensureUniFilterInHeader();
        ensureFilterApi();
        // Only run the storage-driven init the FIRST time UniRowFilter is
        // wired up. Re-running it on every header render() races with
        // finishAndClose: it resets _appliedRows back to the full dataset,
        // which would silently revert filters in correlations / regression /
        // ANOVA / etc. Subsequent boots only refresh chrome.
        if (!this._uniFilterBootstrapped) {
          this._initUniRowFilterFromStorage();
          this._installUniFilterChangeListener();
          this._uniFilterBootstrapped = true;
        } else {
          this._ensureUniFilterInHeader();
        }
      } catch (e) {
        console.warn('Row filter bootstrap deferred:', e);
      }
    };
    const existingScript = document.querySelector('script[data-uni-row-filter]') ||
      document.querySelector('script[src*="/shared/uni-row-filter.js"]') ||
      document.querySelector('script[src*="uni-row-filter.js"]');
    // Trust window.UniRowFilter once it is fully loaded (init + finishAndClose
    // exposed). Pages may preload uni-row-filter.js with a relative href
    // (e.g. "../shared/uni-row-filter.js") to eliminate the boot-time
    // "FILTER —" flicker; a stricter URL check would needlessly reload
    // them and reset the closure state.
    const needsReload =
      !window.UniRowFilter ||
      typeof window.UniRowFilter.init !== 'function' ||
      typeof window.UniRowFilter.finishAndClose !== 'function' ||
      !existingScript;
    if (!needsReload) {
      boot();
      return;
    }
    this._uniFilterBootstrapped = false;
    if (existingScript && existingScript.parentNode) existingScript.parentNode.removeChild(existingScript);
    const s = document.createElement('script');
    s.src = scriptSrc;
    s.setAttribute('data-uni-row-filter', '1');
    s.onload = boot;
    document.head.appendChild(s);
  },

  _ensureUniFilterOverlay() {
    const overlayVersion = 'v3';
    const existing = document.getElementById('uniFilterOverlay');
    if (existing && existing.getAttribute('data-overlay-version') === overlayVersion) return;
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.innerHTML = [
      '<div class="sb-ai-overlay" id="uniFilterOverlay" data-overlay-version="v3" onclick="UniRowFilter.close(event)">',
      '<div class="sb-ai-panel" style="width:min(1020px,97vw);max-height:88vh;display:flex;flex-direction:column;" onclick="event.stopPropagation()">',
      '<div style="display:flex;align-items:center;justify-content:flex-start;margin-bottom:12px;">',
      '<span style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--accent-1);">',
      '<i class="fa-solid fa-filter" style="margin-right:6px;"></i>Filter Source Range</span>',
      '</div>',
      '<div class="uni-filt-help-panel">',
      '<h4><i class="fa-solid fa-lightbulb"></i> Step-by-step</h4>',
      '<ol>',
      (this.module === 'univariate'
        ? '<li>The table below is your <strong>hub workbook range</strong> (all columns). The analysis column is marked with ★.</li>'
        : '<li>The table below is your <strong>source range</strong> (all columns).</li>'),
      '<li>Click <strong>▼</strong> on a column header to choose which values to keep (Excel-style).</li>',
      '<li>Press <strong>OK</strong> on the dropdown to preview updates in the filter table.</li>',
      '<li>Press <strong>Finish &amp; Apply</strong> to freeze the dataset this module uses.</li>',
      '<li><strong>Filter</strong> controls which rows are analyzed. It is separate from chart zoom/range controls.</li>',
      '<li><strong>Clear all filters</strong> restores every row from the original range.</li>',
      '</ol>',
      '</div>',
      '<div class="uni-filt-toolbar"><div class="uni-filt-summary" id="uniFilterSummary">Filter rows from the workbook range.</div>',
      '<button type="button" class="uni-filt-clear-btn" onclick="StatisticoHeader.clearAllRowFiltersAndApply()">Clear all filters</button></div>',
      '<div id="uniFilterContent" style="overflow:auto;flex:1;min-height:0;max-height:none;border:1px solid rgba(148,163,184,.25);border-radius:8px;"></div>',
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">',
      '<button type="button" onclick="UniRowFilter.close()" style="padding:7px 12px;border:1px solid var(--border);border-radius:7px;background:transparent;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;">Exit</button>',
      '<button type="button" id="uniFilterApplyBtn" onclick="StatisticoHeader.applyUniRowFilterAndClose()" style="padding:7px 12px;border:1px solid rgba(255,165,120,.5);border-radius:7px;background:rgba(255,165,120,.18);color:#ffd8be;font-size:12px;font-weight:700;cursor:pointer;">Finish &amp; Apply</button>',
      '</div>',
      '</div></div>'
    ].join('');
    while (el.firstChild) document.body.appendChild(el.firstChild);
  },

  _ensureUniFilterHelpOverlay() {
    if (document.getElementById('uniFilterHelpOverlay')) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div class="sb-ai-overlay" id="uniFilterHelpOverlay" onclick="StatisticoHeader.closeUniFilterHelp(event)">' +
      '<div class="uni-filter-help-panel" onclick="event.stopPropagation()">' +
      '<h3><i class="fa-solid fa-circle-info"></i> How to filter & what updates</h3>' +
      '<p><strong>Filter</strong> picks <em>which source rows</em> from the workbook range are shown or analysed. ' +
      'When a module exposes a recalculation hook, the visible results update from the filtered rows.</p>' +
      '<ol>' +
      '<li>Click <strong>Filter</strong> in the header (info icon opens this guide).</li>' +
      '<li>Click <strong>▼</strong> on a column header, choose values, then <strong>OK</strong>.</li>' +
      '<li>Click <strong>Finish &amp; Apply</strong> to freeze the filtered dataset used by this module.</li>' +
      '<li><strong>Clear all filters</strong> restores all rows from the original range.</li>' +
      '<li>Use <strong>View Data</strong> to inspect the currently frozen rows in scope.</li>' +
      '</ol>' +
      '<div class="uni-filter-help-outcomes"><strong>What updates:</strong> View Data and module results refresh after Finish &amp; Apply.</div>' +
      '<button type="button" class="uni-filter-help-close" onclick="StatisticoHeader.closeUniFilterHelp()">Got it</button>' +
      '</div></div>');
  },

  openUniFilterHelp() {
    this._ensureUniFilterHelpOverlay();
    const o = document.getElementById('uniFilterHelpOverlay');
    if (o) o.classList.add('sb-ai-overlay--visible');
  },

  closeUniFilterHelp(e) {
    if (e && e.target && e.target.id !== 'uniFilterHelpOverlay') return;
    const o = document.getElementById('uniFilterHelpOverlay');
    if (o) o.classList.remove('sb-ai-overlay--visible');
  },

  /**
   * One-click "Clear all filters" — resets the staging criteria, commits
   * the cleared (full) dataset to the page (so the page's onApply
   * handler runs, which in turn updates window.<moduleData>, persists
   * to sessionStorage, and publishes the global row-filter state to
   * inactive), and KEEPS the filter table panel open so the user can
   * inspect the cleared state and apply new filters without having to
   * re-open the panel.
   *
   * Replaces the previous UX where "Clear all filters" only reset the
   * staging area and required a separate "Finish & Apply" click — that
   * extra step was easy to miss and caused the filter to look cleared
   * locally while the rest of the session still saw it active. With
   * this single action the rule "filter from any view, clear from any
   * view" holds: clearing is symmetric to filtering.
   */
  clearAllRowFiltersAndApply() {
    try {
      if (typeof UniRowFilter === 'undefined') return;
      if (typeof UniRowFilter.clearAll === 'function') {
        UniRowFilter.clearAll();
      }
      // clearAll resets _columnFilters and rebuilds _filteredRows to
      // the full _allRows, but does NOT touch _appliedRows. Commit
      // without closing so _appliedRows = full set and the page's
      // onApply(allRows) fires — that's the single chokepoint every
      // view (matrix, network, taylor, partial, reliability,
      // descriptives, regression, ANOVA, PCA, …) routes through to
      // update its own data layer + the global filter state.
      if (typeof UniRowFilter.applyWithoutClosing === 'function') {
        UniRowFilter.applyWithoutClosing();
      } else if (typeof UniRowFilter.finishAndClose === 'function') {
        // Older builds without applyWithoutClosing — fall back to
        // the closing variant so at least the clear takes effect.
        UniRowFilter.finishAndClose();
      }
      // Defensive: even if the page's onApply chain failed for some
      // reason, force the global state to inactive so other modules
      // / views don't resurrect the filter on next load.
      try { this._setGenericRowFilterState(null); } catch (_e) {}
      // Re-render the filter table so the user sees the now-full row
      // set straight away (the panel stays open).
      try {
        if (typeof UniRowFilter.renderFilterTable === 'function') {
          UniRowFilter.renderFilterTable();
        }
      } catch (_e) {}
      if (typeof this.updateUniFilterChrome === 'function') {
        try { this.updateUniFilterChrome(); } catch (_e) {}
      }
    } catch (e) {
      console.warn('clearAllRowFiltersAndApply failed:', e);
    }
  },

  applyUniRowFilterAndClose() {
    try {
      if (typeof UniRowFilter === 'undefined' || typeof UniRowFilter.finishAndClose !== 'function') return;
      const metaBefore = (typeof UniRowFilter.getSourceMeta === 'function') ? UniRowFilter.getSourceMeta() : null;
      // Snapshot the filtered rows BEFORE finishAndClose, since the apply
      // path may trigger a render that re-initialises UniRowFilter and
      // clobbers _appliedRows back to the full dataset (race observed in
      // correlations).
      const filteredSnapshot = (typeof UniRowFilter.getSourceMeta === 'function')
        ? (metaBefore && Array.isArray(metaBefore.filteredRows) ? metaBefore.filteredRows.slice() : null)
        : null;
      UniRowFilter.finishAndClose();
      try {
        const total = metaBefore && Array.isArray(metaBefore.allRows) ? metaBefore.allRows.length : 0;
        const shown = filteredSnapshot ? filteredSnapshot.length : 0;
        this._showRowFilterToast(shown, total);
      } catch (_e) {}
      // NOTE: We deliberately do NOT re-publish here. `finishAndClose` already
      // invoked `_onApply` synchronously, which routes through whichever
      // handler the module installed (publishHeaderRowFilterChange for
      // correlations, publishUniFilterChange for univariate). A second publish
      // here used to race against re-init inside render() and reverted
      // correlations to the full dataset.
    } catch (e) {
      console.warn('applyUniRowFilterAndClose failed:', e);
    }
  },

  _showRowFilterToast(shown, total) {
    const wrap = document.getElementById('uniFilterToast') || (() => {
      const el = document.createElement('div');
      el.id = 'uniFilterToast';
      el.style.position = 'fixed';
      el.style.right = '16px';
      el.style.bottom = '16px';
      el.style.zIndex = '99999';
      el.style.padding = '8px 12px';
      el.style.borderRadius = '8px';
      el.style.border = '1px solid rgba(255,165,120,.45)';
      el.style.background = 'rgba(13,21,38,.92)';
      el.style.color = '#ffd8be';
      el.style.fontSize = '12px';
      el.style.fontWeight = '700';
      el.style.boxShadow = '0 8px 24px rgba(0,0,0,.35)';
      el.style.opacity = '0';
      el.style.transition = 'opacity .18s ease';
      document.body.appendChild(el);
      return el;
    })();
    const safeShown = Number.isFinite(Number(shown)) ? Number(shown) : 0;
    const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0;
    wrap.textContent = `Applied row filter: ${safeShown} of ${safeTotal} rows`;
    wrap.style.opacity = '1';
    if (this._uniFilterToastTimer) clearTimeout(this._uniFilterToastTimer);
    this._uniFilterToastTimer = setTimeout(() => {
      wrap.style.opacity = '0';
    }, 2000);
  },

  _getUniStored() {
    try {
      const sessionRaw = sessionStorage.getItem('univariateResults');
      if (sessionRaw) return JSON.parse(sessionRaw);
      const localRaw = localStorage.getItem('univariateResults');
      if (!localRaw) return null;
      const parsed = JSON.parse(localRaw);
      if (parsed && parsed.rowFilterActive) {
        const cleaned = this._clearLegacyUniPayloadFilter(parsed);
        try { localStorage.setItem('univariateResults', JSON.stringify(cleaned)); } catch (_e) {}
        return cleaned;
      }
      return parsed;
    } catch (_e) { return null; }
  },

  _clearLegacyUniPayloadFilter(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const headers = Array.isArray(payload.sourceHeaders) && payload.sourceHeaders.length
      ? payload.sourceHeaders
      : payload.headers;
    const allRows = Array.isArray(headers)
      ? this._normalizeRowFilterRows(payload.sourceRowsAll || payload.allRows || payload.sourceRows || payload.usedRows, headers)
      : [];
    const clean = { ...payload };
    delete clean.columnFilters;
    clean.rowFilterActive = false;
    if (headers && allRows.length) {
      const columnIndex = payload.columnIndex != null ? Number(payload.columnIndex) : 0;
      const values = this._extractRowFilterValues(allRows, columnIndex, payload.transform, payload.trim);
      clean.sourceHeaders = headers.slice();
      clean.sourceRowsAll = allRows.map((r) => r.slice());
      clean.sourceRows = allRows.map((r) => r.slice());
      clean.usedRows = allRows.map((r) => r.slice());
      clean.values = values;
      clean.data = values;
      clean.rawData = values;
      clean.n = values.length;
    }
    return clean;
  },

  /* ─────────────────────────────────────────────────────────────────
     Row-filter state is GLOBAL across all modules and all views.
     A single sessionStorage entry (`statistico-row-filter::active`)
     is the single source of truth. The `moduleName` argument that
     the rest of the codebase passes around is preserved purely for
     diagnostics / `state.module` / `state.view` annotations — the
     storage location and in-memory cache key are the same regardless
     of caller. This guarantees that a filter applied in correlations
     is immediately visible to univariate / regression / ANOVA / …
     and vice versa, until cleared or invalidated by a fresh analysis
     on a different source range (different headers).
  ───────────────────────────────────────────────────────────────── */
  _rowFilterKey(_moduleName) {
    return 'active';
  },

  _rowFilterStorageKey(_moduleName) {
    return 'statistico-row-filter::active';
  },

  _isHeaderRowFilterStateCompatible(state, headers) {
    if (!state || !Array.isArray(state.headers) || !Array.isArray(headers)) return false;
    if (state.headers.length !== headers.length) return false;
    for (let i = 0; i < headers.length; i += 1) {
      if (String(state.headers[i]) !== String(headers[i])) return false;
    }
    return true;
  },

  _normalizeRowFilterRows(rows, headers) {
    const width = Array.isArray(headers) ? headers.length : 0;
    return (Array.isArray(rows) ? rows : []).map((row) => {
      if (Array.isArray(row)) {
        if (!width) return row.slice();
        if (row.length > width) {
          // Some filter UIs include a leading helper/index column.
          // If detected, drop that first column instead of truncating a real data column.
          if (row.length === width + 1) {
            const first = row[0];
            const n = typeof first === 'number' ? first : parseFloat(first);
            if (Number.isFinite(n)) return row.slice(1, 1 + width);
          }
        }
        return row.slice(0, width);
      }
      if (row && typeof row === 'object') {
        return (headers || Object.keys(row)).map((h) => row[h]);
      }
      return [row];
    });
  },

  _cloneRowFilterCriteria(criteria) {
    const MAX_FILTER_VALUES = 400;
    const out = {};
    Object.keys(criteria || {}).forEach((key) => {
      const value = criteria[key];
      if (Array.isArray(value)) {
        if (value.indexOf('__SHOW_NOTHING__') >= 0) out[key] = ['__SHOW_NOTHING__'];
        else out[key] = value.length > MAX_FILTER_VALUES ? [] : value.slice();
      } else if (value && typeof value === 'object') {
        const sourceValues = Array.isArray(value.values) ? value.values : [];
        out[key] = {
          mode: value.mode || 'include',
          values: sourceValues.length > MAX_FILTER_VALUES ? [] : sourceValues.slice()
        };
      } else {
        out[key] = [];
      }
    });
    return out;
  },

  _getCurrentRowFilterCriteria() {
    if (typeof UniRowFilter !== 'undefined' && typeof UniRowFilter.getColumnFilters === 'function') {
      return this._cloneRowFilterCriteria(UniRowFilter.getColumnFilters());
    }
    const state = this._getGenericRowFilterState();
    return this._cloneRowFilterCriteria(state && state.columnFilters);
  },

  _hasActiveRowFilterCriteria(criteria) {
    return Object.keys(criteria || {}).some((key) => {
      const value = criteria[key];
      return (Array.isArray(value) && value.length > 0) ||
        (value && typeof value === 'object' && Array.isArray(value.values) && value.values.length > 0);
    });
  },

  _cellFilterValue(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  },

  _applyRowFilterCriteria(rows, criteria) {
    if (!this._hasActiveRowFilterCriteria(criteria)) return (rows || []).map((r) => Array.isArray(r) ? r.slice() : r);
    const compiled = {};
    Object.keys(criteria || {}).forEach((key) => {
      const filter = criteria[key];
      if (Array.isArray(filter)) {
        if (!filter.length) return;
        if (filter.indexOf('__SHOW_NOTHING__') >= 0) {
          compiled[key] = { mode: 'none', values: null };
          return;
        }
        const selected = {};
        filter.forEach((v) => { selected[this._cellFilterValue(v)] = true; });
        compiled[key] = { mode: 'include', values: selected };
      } else if (filter && typeof filter === 'object') {
        const values = Array.isArray(filter.values) ? filter.values : [];
        if (!values.length) return;
        const selected = {};
        values.forEach((v) => { selected[this._cellFilterValue(v)] = true; });
        compiled[key] = { mode: filter.mode === 'exclude' ? 'exclude' : 'include', values: selected };
      }
    });
    return (rows || []).filter((row) => {
      for (const key of Object.keys(compiled)) {
        const filter = compiled[key];
        const idx = Number(key);
        const value = this._cellFilterValue(Array.isArray(row) ? row[idx] : row && row[idx]);
        if (filter.mode === 'none') return false;
        const matched = !!(filter.values && filter.values[value]);
        if (filter.mode === 'exclude' ? matched : !matched) return false;
      }
      return true;
    }).map((r) => Array.isArray(r) ? r.slice() : r);
  },

  _resolveFilteredRowsForState(headers, allRows, state) {
    if (!state || !this._isHeaderRowFilterStateCompatible(state, headers)) {
      return { rows: allRows.map((r) => r.slice()), active: false };
    }
    const criteria = this._cloneRowFilterCriteria(state.columnFilters);
    if (this._hasActiveRowFilterCriteria(criteria)) {
      const rows = this._applyRowFilterCriteria(allRows, criteria);
      return { rows, active: rows.length !== allRows.length };
    }
    if (state.rowFilterActive && Array.isArray(state.usedRows)) {
      return { rows: this._normalizeRowFilterRows(state.usedRows, headers), active: true };
    }
    return { rows: allRows.map((r) => r.slice()), active: false };
  },

  _getGenericRowFilterState(moduleName) {
    const key = this._rowFilterKey(moduleName);
    const state = this._rowFilterStates || {};
    if (state[key]) return state[key];
    try {
      const storageKey = this._rowFilterStorageKey(moduleName);
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      this._rowFilterStates = this._rowFilterStates || {};
      this._rowFilterStates[key] = parsed;
      return parsed;
    } catch (_e) { return null; }
  },

  _setGenericRowFilterState(state, moduleName) {
    this._rowFilterStates = this._rowFilterStates || {};
    const key = this._rowFilterKey(moduleName);
    const nextState = state && typeof state === 'object'
      ? {
        ...state,
        columnFilters: this._cloneRowFilterCriteria(state.columnFilters)
      }
      : state;
    if (nextState) this._rowFilterStates[key] = nextState;
    else delete this._rowFilterStates[key];
    try {
      const storageKey = this._rowFilterStorageKey(moduleName);
      if (nextState) sessionStorage.setItem(storageKey, JSON.stringify(nextState));
      else sessionStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey);
    } catch (_e) {}
  },

  _clearGenericRowFilterState(moduleName) {
    this._setGenericRowFilterState(null, moduleName);
  },

  _clearLegacyPersistentRowFilterState(moduleName) {
    try { localStorage.removeItem(this._rowFilterStorageKey(moduleName)); } catch (_e) {}
    // One-time migration: legacy installations stored the filter under
    // per-module keys (statistico-row-filter::correlations, ::univariate,
    // ::regression, …). Now that the filter is global these are stale
    // and would compete with the unified key. Sweep them.
    if (this.__statisticoLegacyKeysSwept) return;
    this.__statisticoLegacyKeysSwept = true;
    const legacyModules = [
      'univariate', 'correlations', 'regression', 'logistic', 'mixed',
      'anova', 'independent', 'dependent', 'pca', 'factor', 'cluster',
      'pareto', 'power'
    ];
    legacyModules.forEach((m) => {
      const k = `statistico-row-filter::${m}`;
      try { sessionStorage.removeItem(k); } catch (_e) {}
      try { localStorage.removeItem(k); } catch (_e) {}
    });
  },

  /**
   * PUBLIC: clear the global active row filter. Any view's "Clear all
   * filters" button, or any code path that wants to reset the session
   * to full data, can call this. After this returns the next view
   * load (or UniRowFilter re-init) will see no filter at all.
   *
   * Returns true if a filter was cleared, false if there was nothing
   * to clear.
   */
  clearActiveRowFilter() {
    const had = !!this._getGenericRowFilterState();
    this._setGenericRowFilterState(null);
    try {
      if (typeof UniRowFilter !== 'undefined' && typeof UniRowFilter.clearAll === 'function') {
        UniRowFilter.clearAll();
      }
    } catch (_e) {}
    if (typeof this.updateUniFilterChrome === 'function') {
      try { this.updateUniFilterChrome(); } catch (_e) {}
    }
    if (had) {
      try {
        document.dispatchEvent(new CustomEvent('statistico-row-filter-cleared'));
      } catch (_e) {}
    }
    return had;
  },

  /**
   * Build a row-filter "result" object from the persisted correlationData
   * in sessionStorage. Used as a fallback for correlation child views
   * (Network / Taylor / Partial / Reliability / Descriptives) that don't
   * own the matrix's full getData() registration but still need the
   * filter UI (badge, column highlighting, Clear, panel restoration) to
   * reflect the active filter.
   */
  _getCorrelationRowFilterDataFromStorage() {
    try {
      const raw = sessionStorage.getItem('correlationData');
      if (!raw) return null;
      const cd = JSON.parse(raw);
      if (!cd || typeof cd !== 'object') return null;
      const sourceHeaders = (Array.isArray(cd.sourceHeaders) && cd.sourceHeaders.length)
        ? cd.sourceHeaders.slice()
        : (Array.isArray(cd.headers) ? cd.headers.slice() : null);
      const sourceRowsAll = Array.isArray(cd.sourceRowsAll) && cd.sourceRowsAll.length
        ? cd.sourceRowsAll
        : null;
      const sourceRows = Array.isArray(cd.sourceRows) ? cd.sourceRows : null;
      if (!sourceHeaders || !sourceRowsAll) return null;
      const allRows = sourceRowsAll.map((r) => Array.isArray(r) ? r.slice() : r);
      const usedRows = (sourceRows && sourceRows.length)
        ? sourceRows.map((r) => Array.isArray(r) ? r.slice() : r)
        : allRows.map((r) => Array.isArray(r) ? r.slice() : r);
      const rowFilterActive = !!cd.rowFilterActive ||
        (usedRows.length > 0 && usedRows.length < allRows.length);
      return {
        headers: sourceHeaders,
        allRows,
        usedRows,
        sourceHeaders,
        sourceRowsAll: allRows,
        sourceRows: usedRows,
        rowFilterActive
      };
    } catch (_e) {
      return null;
    }
  },

  _getHeaderRowFilterData() {
    if (this.module === 'univariate') return this._getUniStored();
    try {
      const actions = this._pendingActions || {};
      let result = null;
      if (typeof actions.getData === 'function') {
        try { result = actions.getData(); } catch (_e) { result = null; }
      }
      // Fallback for correlation child views (Network / Taylor / Partial /
      // Reliability / Descriptives) that don't register a getData action:
      // read the persisted correlationData from sessionStorage so the
      // shared filter UI can still show badge / blue column / Clear, and
      // restore the active filter on panel re-open.
      if ((!result || typeof result !== 'object') && this.module === 'correlations') {
        result = this._getCorrelationRowFilterDataFromStorage();
      }
      if (!result || typeof result !== 'object') return null;
      const sourceHeaders = Array.isArray(result.sourceHeaders) && result.sourceHeaders.length
        ? result.sourceHeaders
        : result.headers;
      if (!Array.isArray(sourceHeaders) || !sourceHeaders.length) return null;

      const headers = sourceHeaders.slice();
      const state = this._getGenericRowFilterState();
      const canReuseState = this._isHeaderRowFilterStateCompatible(state, headers);
      const payloadRows = this._normalizeRowFilterRows(
        result.sourceRowsAll || result.allRows || result.rows || result.usedRows,
        headers
      );
      const stateAllRows = canReuseState && Array.isArray(state.allRows)
        ? state.allRows.map((r) => Array.isArray(r) ? r.slice() : r)
        : null;
      const stateUsedCount = canReuseState && Array.isArray(state.usedRows) ? state.usedRows.length : 0;
      const allRows = stateAllRows && (!payloadRows.length || (stateUsedCount && payloadRows.length <= stateUsedCount))
        ? stateAllRows
        : payloadRows;
      if (!allRows.length) return null;
      if (state && !canReuseState) this._setGenericRowFilterState(null);
      const resolved = canReuseState
        ? this._resolveFilteredRowsForState(headers, allRows, state)
        : { rows: this._normalizeRowFilterRows(result.sourceRows || result.usedRows || allRows, headers), active: !!result.rowFilterActive };
      let usedRows = resolved.rows;
      let rowFilterActive = resolved.active;

      // Compact generic state stores neither usedRows nor reproducible
      // criteria, so canReuseState may resolve to "all rows / inactive"
      // even when the page (e.g. correlation matrix) holds a real
      // filtered subset. Trust the page's own getData() output in that
      // case — it is the authoritative source of truth.
      if (!rowFilterActive) {
        const liveUsedRows = this._normalizeRowFilterRows(result.sourceRows || result.usedRows || [], headers);
        if (liveUsedRows.length > 0 && liveUsedRows.length < allRows.length) {
          usedRows = liveUsedRows;
          rowFilterActive = true;
        } else if (result.rowFilterActive && liveUsedRows.length > 0) {
          usedRows = liveUsedRows;
          rowFilterActive = true;
        }
      }

      return {
        ...result,
        headers,
        allRows,
        usedRows,
        sourceHeaders: headers,
        sourceRowsAll: allRows,
        sourceRows: usedRows,
        rowFilterActive
      };
    } catch (e) {
      console.warn('Row filter data unavailable:', e);
      return null;
    }
  },

  /**
   * Auto-rebuild correlationData in sessionStorage from a filter payload
   * dispatched by UniRowFilter. Mirrors the matrix's
   * rebuildCorrelationFromSourceRows() logic but lives in shared-header
   * so non-matrix correlation views inherit the same behaviour without
   * having to register onFilterRows themselves.
   *
   * Dispatches `statistico-correlation-data-changed` so views that want
   * to live-refresh on filter change can listen for it.
   */
  _autoRebuildCorrelationDataFromFilter(payload) {
    if (!payload || !Array.isArray(payload.usedRows)) return;
    let cd = null;
    try { cd = JSON.parse(sessionStorage.getItem('correlationData') || 'null'); } catch (_e) {}
    if (!cd || typeof cd !== 'object') {
      cd = (typeof window !== 'undefined' && window.correlationData) ? window.correlationData : null;
    }
    if (!cd || !Array.isArray(cd.headers) || !cd.headers.length) return;

    const sourceHeaders = (Array.isArray(cd.sourceHeaders) && cd.sourceHeaders.length)
      ? cd.sourceHeaders.slice()
      : (Array.isArray(payload.sourceHeaders) && payload.sourceHeaders.length
        ? payload.sourceHeaders.slice()
        : (Array.isArray(payload.headers) ? payload.headers.slice() : cd.headers.slice()));
    const analysisHeaders = cd.headers.slice();
    const headerIndex = {};
    sourceHeaders.forEach((h, i) => { headerIndex[h] = i; });
    const canProject = analysisHeaders.every((h) => Object.prototype.hasOwnProperty.call(headerIndex, h));
    const usedRows = payload.usedRows.map((r) => Array.isArray(r) ? r.slice() : r);
    const allRows = (Array.isArray(payload.allRows) && payload.allRows.length
      ? payload.allRows
      : (Array.isArray(cd.sourceRowsAll) ? cd.sourceRowsAll : usedRows)
    ).map((r) => Array.isArray(r) ? r.slice() : r);

    const projectedData = canProject
      ? usedRows.map((row) => {
        const obj = {};
        analysisHeaders.forEach((h) => {
          obj[h] = Array.isArray(row) ? row[headerIndex[h]] : (row && row[h]);
        });
        return obj;
      })
      : usedRows.map((row) => {
        const obj = {};
        analysisHeaders.forEach((h, idx) => {
          obj[h] = Array.isArray(row) ? row[idx] : (row && row[h]);
        });
        return obj;
      });
    const isFiltered = usedRows.length !== allRows.length;

    const next = {
      ...cd,
      headers: analysisHeaders,
      data: projectedData,
      sourceHeaders,
      sourceRowsAll: allRows,
      sourceRows: usedRows,
      rowFilterActive: isFiltered
    };
    if (typeof window !== 'undefined') window.correlationData = next;
    try { sessionStorage.setItem('correlationData', JSON.stringify(next)); } catch (_e) {}

    try {
      document.dispatchEvent(new CustomEvent('statistico-correlation-data-changed', {
        detail: { correlationData: next, rowFilterActive: isFiltered, usedRows: usedRows.length, allRows: allRows.length }
      }));
    } catch (_e) {}

    console.warn('[ROWFILTER][autoRebuild]', {
      analysisHeaders: analysisHeaders.length,
      sourceHeaders: sourceHeaders.length,
      allRows: allRows.length,
      usedRows: usedRows.length,
      rowFilterActive: isFiltered,
      canProject
    });
  },

  _applyGenericHeaderRowFilterFallback(payload) {
    if (!payload || !Array.isArray(payload.headers) || !Array.isArray(payload.usedRows)) return;
    const headers = payload.headers.slice();
    const usedRows = payload.usedRows.map((r) => Array.isArray(r) ? r.slice() : []);
    const headersMatch = (candidateHeaders) => {
      if (!Array.isArray(candidateHeaders) || candidateHeaders.length !== headers.length) return false;
      for (let i = 0; i < headers.length; i += 1) {
        if (String(candidateHeaders[i]) !== String(headers[i])) return false;
      }
      return true;
    };
    const table = [headers].concat(usedRows);
    try {
      Object.keys(window).forEach((key) => {
        if (!/RangeData$/i.test(key)) return;
        const value = window[key];
        if (!Array.isArray(value) || !Array.isArray(value[0])) return;
        if (!headersMatch(value[0])) return;
        window[key] = table.map((row) => row.slice());
      });
    } catch (_e) {}
  },

  _rowFilterRowsToObjects(headers, rows) {
    return (Array.isArray(rows) ? rows : []).map((row) => {
      const out = {};
      headers.forEach((header, idx) => {
        out[header] = Array.isArray(row) ? row[idx] : (row && row[header]);
      });
      return out;
    });
  },

  _inferRowFilterModuleFromStorageKey(key) {
    const k = String(key || '').toLowerCase();
    if (k.includes('univariate')) return 'univariate';
    if (k.includes('correlation')) return 'correlations';
    if (k.includes('regression')) return 'regression';
    if (k.includes('logistic')) return 'logistic';
    if (k.includes('mixed')) return 'mixed';
    if (k.includes('anova')) return 'anova';
    if (k.includes('independent')) return 'independent';
    if (k.includes('dependent')) return 'dependent';
    if (k.includes('pca')) return 'pca';
    if (k.includes('factor')) return 'factor';
    if (k.includes('cluster')) return 'cluster';
    if (k.includes('pareto')) return 'pareto';
    if (k.includes('power')) return 'power';
    return null;
  },

  _inferRowFilterModuleFromMessageType(type) {
    const t = String(type || '').toLowerCase();
    if (t.includes('univariate')) return 'univariate';
    if (t.includes('correlation')) return 'correlations';
    if (t.includes('regression')) return 'regression';
    if (t.includes('logistic')) return 'logistic';
    if (t.includes('mixed')) return 'mixed';
    if (t.includes('anova')) return 'anova';
    if (t.includes('independent')) return 'independent';
    if (t.includes('dependent')) return 'dependent';
    if (t.includes('pca')) return 'pca';
    if (t.includes('factor')) return 'factor';
    if (t.includes('cluster')) return 'cluster';
    if (t.includes('pareto')) return 'pareto';
    if (t.includes('power')) return 'power';
    return null;
  },

  _firstPayloadRows(payload) {
    if (!payload || typeof payload !== 'object') return null;
    return payload.data || payload.rows || payload.usedRows || payload.sourceRows || payload.allRows || payload.sourceRowsAll || null;
  },

  _rowsForPayloadShape(headers, originalRows, filteredRows) {
    const first = Array.isArray(originalRows) ? originalRows[0] : null;
    if (first && !Array.isArray(first) && typeof first === 'object') {
      return this._rowFilterRowsToObjects(headers, filteredRows);
    }
    return filteredRows.map((r) => Array.isArray(r) ? r.slice() : headers.map((h) => r && r[h]));
  },

  _isWorkbookTablePayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!Array.isArray(payload.headers) || !payload.headers.length || !Array.isArray(payload.data)) return false;
    const first = payload.data[0];
    return Array.isArray(first) || (!!first && typeof first === 'object');
  },

  _applyActiveRowFilterToWorkbookTablePayload(payload, moduleName) {
    if (!payload || typeof payload !== 'object') return payload;
    const headers = Array.isArray(payload.sourceHeaders) && payload.sourceHeaders.length
      ? payload.sourceHeaders
      : payload.headers;
    if (!Array.isArray(headers) || !headers.length) return payload;
    const state = this._getGenericRowFilterState(moduleName);
    if (!state || !state.rowFilterActive) return payload;
    if (!this._isHeaderRowFilterStateCompatible(state, headers)) return payload;
    const allRows = this._normalizeRowFilterRows(payload.sourceRowsAll || payload.allRows || payload.data || state.allRows, headers);
    if (!allRows.length) return payload;
    const resolved = this._resolveFilteredRowsForState(headers, allRows, state);
    const filteredRows = resolved.rows;
    return {
      ...payload,
      headers: headers.slice(),
      sourceHeaders: headers.slice(),
      data: this._rowsForPayloadShape(headers, payload.data, filteredRows),
      allRows,
      sourceRowsAll: allRows,
      sourceRows: filteredRows.map((r) => r.slice()),
      usedRows: filteredRows.map((r) => r.slice()),
      rowFilterActive: resolved.active
    };
  },

  _extractRowFilterValues(rows, columnIndex, transform, trim) {
    const idx = Number(columnIndex || 0);
    let values = (rows || [])
      .map((row) => Array.isArray(row) ? row[idx] : row && row[idx])
      .filter((v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(parseFloat(v)))
      .map((v) => parseFloat(v));
    const tcfg = trim || { min: 0, max: 100 };
    const minPct = Number(tcfg.min || 0);
    const maxPct = Number(tcfg.max == null ? 100 : tcfg.max);
    if (values.length && (minPct > 0 || maxPct < 100)) {
      const sorted = values.slice().sort((a, b) => a - b);
      const minVal = sorted[Math.floor((sorted.length - 1) * minPct / 100)];
      const maxVal = sorted[Math.floor((sorted.length - 1) * maxPct / 100)];
      values = values.filter((v) => v >= minVal && v <= maxVal);
    }
    const op = transform || 'none';
    if (op === 'ln') values = values.map((v) => (v > 0 ? Math.log(v) : null)).filter((v) => v !== null);
    else if (op === 'log10') values = values.map((v) => (v > 0 ? Math.log10(v) : null)).filter((v) => v !== null);
    else if (op === 'sqrt') values = values.map((v) => (v >= 0 ? Math.sqrt(v) : null)).filter((v) => v !== null);
    else if (op === 'square') values = values.map((v) => v * v);
    return values;
  },

  _applyActiveRowFilterToUnivariatePayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    if (this._isWorkbookTablePayload(payload)) {
      return this._applyActiveRowFilterToWorkbookTablePayload(payload, 'univariate');
    }
    const headers = Array.isArray(payload.sourceHeaders) && payload.sourceHeaders.length
      ? payload.sourceHeaders
      : payload.headers;
    if (!Array.isArray(headers) || !headers.length) return payload;
    const state = this._getGenericRowFilterState('univariate');
    if (!state || !state.rowFilterActive) return payload;
    // Headers don't match → skip; clear-on-incompatible is handled by
    // _looksLikeFreshRowFilterPayload at ingress, not here.
    if (!this._isHeaderRowFilterStateCompatible(state, headers)) return payload;
    // Compact state (set by correlations / regression / etc.) carries
    // only columnFilters, not usedRows — _resolveFilteredRowsForState
    // will replay the criteria against allRows. Skip only if neither
    // form of filter is materialised.
    if (!Array.isArray(state.usedRows) && !this._hasActiveRowFilterCriteria(state.columnFilters)) return payload;
    const payloadAllRows = this._normalizeRowFilterRows(payload.sourceRowsAll || payload.allRows || state.allRows || payload.sourceRows || state.usedRows, headers);
    const sourceRowsAll = payloadAllRows.length ? payloadAllRows : (Array.isArray(state.allRows) ? state.allRows.map((r) => r.slice()) : null);
    const resolved = this._resolveFilteredRowsForState(headers, sourceRowsAll || [], state);
    const sourceRows = resolved.rows;
    const columnIndex = payload.columnIndex != null ? Number(payload.columnIndex) : (state.columnIndex != null ? Number(state.columnIndex) : 0);
    const values = this._extractRowFilterValues(sourceRows, columnIndex, payload.transform, payload.trim);
    return {
      ...payload,
      sourceHeaders: headers.slice(),
      sourceRowsAll,
      sourceRows,
      values,
      data: values,
      rawData: values,
      n: values.length,
      rowFilterActive: resolved.active
    };
  },

  _applyActiveRowFilterToPayload(payload, moduleName) {
    if (!payload || typeof payload !== 'object') return payload;
    if (!moduleName) return payload;
    // The page can assert "this payload is already in the unfiltered
    // state" by setting `rowFilterActive: false` explicitly. This is
    // exactly what the Clear-all-filters → Finish & Apply flow does,
    // and we MUST honour it: otherwise the storage interceptor (which
    // fires on setItem before publishHeaderRowFilterChange has a chance
    // to flip the global state to inactive) would re-apply the old
    // criteria and silently resurrect the filter the user just cleared.
    if (payload.rowFilterActive === false) return payload;
    if ((moduleName || this.module) === 'univariate') {
      return this._applyActiveRowFilterToUnivariatePayload(payload);
    }
    const headers = Array.isArray(payload.sourceHeaders) && payload.sourceHeaders.length
      ? payload.sourceHeaders
      : payload.headers;
    if (!Array.isArray(headers) || !headers.length) return payload;
    const state = this._getGenericRowFilterState(moduleName);
    if (!state || !state.rowFilterActive) return payload;
    // Headers don't match the active global filter → don't apply the
    // filter (and don't clear here either — clearing is handled by
    // _looksLikeFreshRowFilterPayload at the storage / message ingress
    // points, which sees genuinely-new analyses; calling clear here
    // would wipe the filter on incidental reads of stale storage).
    if (!this._isHeaderRowFilterStateCompatible(state, headers)) return payload;
    // Compact state (set by publishHeaderRowFilterChange) has only
    // columnFilters; full state (set by publishUniFilterChange) also
    // has usedRows. Either form is valid — the resolve step replays
    // criteria against allRows when usedRows is missing.
    if (!Array.isArray(state.usedRows) && !this._hasActiveRowFilterCriteria(state.columnFilters)) return payload;

    const filteredHeaders = state.headers.slice();
    const payloadAllRows = this._normalizeRowFilterRows(payload.sourceRowsAll || payload.allRows || payload.data || payload.rows, filteredHeaders);
    const stateAllRows = Array.isArray(state.allRows) ? state.allRows.map((r) => Array.isArray(r) ? r.slice() : r) : null;
    const stateUsedCount = Array.isArray(state.usedRows) ? state.usedRows.length : 0;
    const sourceRowsAll = stateAllRows && (!payloadAllRows.length || (stateUsedCount && payloadAllRows.length <= stateUsedCount))
      ? stateAllRows
      : (payloadAllRows.length ? payloadAllRows : stateAllRows);
    const resolved = this._resolveFilteredRowsForState(filteredHeaders, sourceRowsAll || [], state);
    const filteredRows = resolved.rows;
    const sourceRows = filteredRows.map((r) => r.slice());
    const shapedRows = this._rowsForPayloadShape(filteredHeaders, this._firstPayloadRows(payload), filteredRows);

    if (moduleName === 'correlations') {
      const idxByHeader = {};
      filteredHeaders.forEach((h, i) => { idxByHeader[h] = i; });
      let analysisHeaders = Array.isArray(payload.analysisHeaders) && payload.analysisHeaders.length
        ? payload.analysisHeaders.slice()
        : (Array.isArray(payload.headers) ? payload.headers.slice() : []);
      if (!analysisHeaders.length || !analysisHeaders.every((h) => Object.prototype.hasOwnProperty.call(idxByHeader, h))) {
        analysisHeaders = filteredHeaders.slice();
      }
      const projectedRows = analysisHeaders.every((h) => Object.prototype.hasOwnProperty.call(idxByHeader, h))
        ? filteredRows.map((row) => analysisHeaders.map((h) => row[idxByHeader[h]]))
        : filteredRows.map((r) => r.slice());
      const projectedShaped = this._rowsForPayloadShape(analysisHeaders, payload.data, projectedRows);
      const corrOut = {
        ...payload,
        headers: analysisHeaders,
        analysisHeaders: analysisHeaders.slice(),
        sourceHeaders: filteredHeaders,
        sourceRowsAll,
        sourceRows,
        usedRows: projectedRows.map((r) => r.slice()),
        rowFilterActive: resolved.active
      };
      if (Array.isArray(payload.data)) corrOut.data = projectedShaped;
      if (Array.isArray(payload.rows)) corrOut.rows = projectedShaped;
      if (Array.isArray(payload.allRows)) corrOut.allRows = sourceRowsAll || sourceRows;
      return corrOut;
    }

    const out = {
      ...payload,
      headers: filteredHeaders,
      sourceHeaders: filteredHeaders,
      sourceRowsAll,
      sourceRows,
      usedRows: sourceRows,
      rowFilterActive: resolved.active
    };
    if (Array.isArray(payload.data)) out.data = shapedRows;
    if (Array.isArray(payload.rows)) out.rows = shapedRows;
    if (Array.isArray(payload.allRows)) out.allRows = sourceRowsAll || sourceRows;
    return out;
  },

  _applyActiveRowFilterToModuleStorage(moduleName) {
    const keysByModule = {
      univariate: ['univariateResults'],
      correlations: ['correlationData', 'correlationResults'],
      regression: ['regressionNavData', 'regressionData'],
      logistic: ['logisticData', 'logisticResults'],
      mixed: ['mixedData', 'mixedResults'],
      anova: ['anovaData', 'anovaResults'],
      independent: ['independentData', 'independentResults'],
      dependent: ['dependentData', 'dependentResults'],
      pca: ['pcaData', 'pcaResults'],
      factor: ['factorData', 'factorResults'],
      cluster: ['clusterData', 'clusterResults'],
      pareto: ['paretoData', 'paretoResults'],
      power: ['powerData', 'powerResults']
    };
    (keysByModule[moduleName] || []).forEach((key) => {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return;
        const filtered = this._applyActiveRowFilterToPayload(JSON.parse(raw), moduleName);
        if (filtered) {
          sessionStorage.setItem(key, JSON.stringify(filtered));
          if (moduleName === 'correlations' && key === 'correlationData') window.correlationData = filtered;
        }
      } catch (_e) {}
    });
  },

  _persistActiveRowFilterPayload(moduleName, storageKey) {
    const state = this._getGenericRowFilterState(moduleName);
    if (!state || !state.rowFilterActive) return false;
    try {
      const key = storageKey || (moduleName === 'univariate' ? 'univariateResults' : null);
      if (!key) return false;
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const payload = this._applyActiveRowFilterToPayload(parsed, moduleName);
      if (!payload || payload === parsed) return false;
      const next = JSON.stringify(payload);
      sessionStorage.setItem(key, next);
      return true;
    } catch (_e) {
      return false;
    }
  },

  /**
   * "Fresh" = a brand-new analysis whose source range (headers) is
   * incompatible with the currently-active global filter. In a
   * single-global-filter world we ONLY want to clear the active
   * filter when the user has actually loaded a different dataset;
   * a re-broadcast of the same range (e.g. parent re-sending
   * CORRELATION_DATA when a child view posts {action:'ready'})
   * must NOT wipe the filter, even though the payload itself has
   * no rowFilterActive flag on it.
   */
  _looksLikeFreshRowFilterPayload(payload, moduleName) {
    if (!moduleName || !payload || typeof payload !== 'object') return false;
    if (payload.rowFilterActive || payload.columnFilters) return false;
    const headers = Array.isArray(payload.sourceHeaders) && payload.sourceHeaders.length
      ? payload.sourceHeaders
      : payload.headers;
    if (!Array.isArray(headers) || !headers.length) return false;
    const rows = this._firstPayloadRows(payload);
    if (!Array.isArray(rows) || !rows.length) return false;
    // Only treat as "fresh" if there's actually an active filter to
    // potentially invalidate. No filter? Nothing to do.
    const state = this._getGenericRowFilterState();
    if (!state || !state.rowFilterActive) return false;
    // Same source range as the active filter → just a re-broadcast
    // of the same dataset. Keep the filter; the storage / message
    // interceptor will then apply it to the payload via
    // _applyActiveRowFilterToPayload. Different headers → genuinely
    // new analysis on a different range → clear the filter.
    return !this._isHeaderRowFilterStateCompatible(state, headers);
  },

  _installActiveRowFilterStorageInterceptor() {
    if (window.__statisticoRowFilterStorageInterceptorInstalled) return;
    if (!window.Storage || !Storage.prototype) return;
    window.__statisticoRowFilterStorageInterceptorInstalled = true;
    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) {
      const raw = nativeGetItem.call(this, key);
      try {
        if (!raw || String(key || '').indexOf('statistico-row-filter::') === 0 || !window.StatisticoHeader) return raw;
        const moduleName = window.StatisticoHeader._inferRowFilterModuleFromStorageKey(key);
        if (!moduleName) return raw;
        const parsed = JSON.parse(raw);
        const filtered = window.StatisticoHeader._applyActiveRowFilterToPayload(parsed, moduleName);
        return filtered === parsed ? raw : JSON.stringify(filtered);
      } catch (_e) {
        return raw;
      }
    };
    Storage.prototype.setItem = function(key, value) {
      let nextValue = value;
      try {
        if (String(key || '').indexOf('statistico-row-filter::') !== 0 && window.StatisticoHeader) {
          const moduleName = window.StatisticoHeader._inferRowFilterModuleFromStorageKey(key);
          if (!moduleName) return nativeSetItem.call(this, key, nextValue);
          const parsed = JSON.parse(String(value));
          if (window.StatisticoHeader._looksLikeFreshRowFilterPayload(parsed, moduleName)) {
            window.StatisticoHeader._clearGenericRowFilterState(moduleName);
            return nativeSetItem.call(this, key, nextValue);
          }
          const filtered = window.StatisticoHeader._applyActiveRowFilterToPayload(parsed, moduleName);
          if (filtered !== parsed) nextValue = JSON.stringify(filtered);
        }
      } catch (_e) {}
      return nativeSetItem.call(this, key, nextValue);
    };
  },

  _installRowFilterMessagePayloadInterceptor() {
    if (window.__statisticoRowFilterMessageInterceptorInstalled) return;
    if (!window.Office || !Office.context || !Office.context.ui || typeof Office.context.ui.addHandlerAsync !== 'function') return;
    window.__statisticoRowFilterMessageInterceptorInstalled = true;
    const originalAddHandlerAsync = Office.context.ui.addHandlerAsync.bind(Office.context.ui);
    Office.context.ui.addHandlerAsync = function(eventType, handler, options, callback) {
      const isDialogMessage = Office.EventType && eventType === Office.EventType.DialogParentMessageReceived;
      if (!isDialogMessage || typeof handler !== 'function') {
        return originalAddHandlerAsync(eventType, handler, options, callback);
      }
      const wrappedHandler = function(arg) {
        try {
          const message = JSON.parse(arg && arg.message ? arg.message : '{}');
          if (message && window.StatisticoHeader) {
            const moduleName = window.StatisticoHeader._inferRowFilterModuleFromMessageType(message.module || message.moduleName || message.type || '');
            if (!moduleName) return handler(arg);
            if (message.payload) {
              if (window.StatisticoHeader._looksLikeFreshRowFilterPayload(message.payload, moduleName)) {
                window.StatisticoHeader._clearGenericRowFilterState(moduleName);
                return handler(arg);
              }
              message.payload = window.StatisticoHeader._applyActiveRowFilterToPayload(message.payload, moduleName);
            }
            if (message.data) {
              if (window.StatisticoHeader._looksLikeFreshRowFilterPayload(message.data, moduleName)) {
                window.StatisticoHeader._clearGenericRowFilterState(moduleName);
                return handler(arg);
              }
              message.data = window.StatisticoHeader._applyActiveRowFilterToPayload(message.data, moduleName);
            }
            if (message.payload || message.data) {
              const wrappedArg = Object.create(arg || {});
              wrappedArg.message = JSON.stringify(message);
              return handler(wrappedArg);
            }
          }
        } catch (_e) {}
        return handler(arg);
      };
      return originalAddHandlerAsync(eventType, wrappedHandler, options, callback);
    };
  },

  _applyHeaderRowFilterToDataResult(result) {
    if (!result || this.module === 'univariate') return result;
    const state = this._getGenericRowFilterState();
    if (!state || !state.rowFilterActive) return result;
    if (!this._isHeaderRowFilterStateCompatible(state, result.headers || [])) return result;
    const notice = [
      result.notice,
      `Row filter active: showing ${state.usedRows.length} of ${state.allRows.length} source rows.`
    ].filter(Boolean).join(' ');
    return {
      ...result,
      headers: state.headers.slice(),
      allRows: state.allRows.map((r) => r.slice()),
      usedRows: state.usedRows.map((r) => r.slice()),
      notice
    };
  },

  _setUniFilterMeta(data) {
    if (!data) return;
    this._uniFilterMeta = {
      column: data.column || data.variableName || 'Variable',
      columnIndex: data.columnIndex != null ? Number(data.columnIndex) : 0,
      transform: data.transform || 'none',
      trim: data.trim || { min: 0, max: 100 },
      dataSource: data.dataSource || null,
      sourceHeaders: data.sourceHeaders || null,
      sourceRowsAll: data.sourceRowsAll || data.sourceRows || null
    };
  },

  _uniPayloadSignature(data, viewKey) {
    const d = data || {};
    const values = Array.isArray(d) ? d :
      (Array.isArray(d.values) ? d.values :
        (Array.isArray(d.data) ? d.data :
          (Array.isArray(d.rawData) ? d.rawData :
            (Array.isArray(d.trimmedValues) ? d.trimmedValues :
              (Array.isArray(d.transformedValues) ? d.transformedValues :
                (d.values && Array.isArray(d.values.values) ? d.values.values : []))))));
    const len = values.length;
    const table = Array.isArray(d.descriptiveTable) ? d.descriptiveTable : [];
    const sample = len
      ? [values[0], values[Math.floor(len / 2)], values[len - 1]].map((v) => Number(v).toPrecision ? Number(v).toPrecision(8) : String(v)).join('|')
      : (table.length ? `${table.length}|${table[0].Variable || table[0].name || ''}|${table[0].N || ''}` : '');
    const trim = d.trim ? `${d.trim.min || 0}-${d.trim.max || 100}` : '';
    return [
      viewKey || this.currentView || '',
      d.column || d.variableName || d.variable || d.colName || '',
      len || table.length,
      sample,
      d.transform || '',
      trim,
      d.rowFilterActive ? 'filtered' : '',
      d.sourceRows ? d.sourceRows.length : '',
      d.sourceRowsAll ? d.sourceRowsAll.length : ''
    ].join('::');
  },

  shouldProcessUniPayload(data, viewKey, windowMs = 2500) {
    try {
      const filtered = this._applyActiveRowFilterToPayload(data, 'univariate');
      if (filtered && filtered !== data && data && typeof data === 'object' && !Array.isArray(data)) {
        Object.keys(data).forEach((key) => { delete data[key]; });
        Object.assign(data, filtered);
      }
    } catch (_e) {}
    const sig = this._uniPayloadSignature(data, viewKey);
    const now = Date.now();
    const last = this._lastUniPayload || {};
    if (last.sig === sig && (now - last.time) < windowMs) {
      console.log('Skipping duplicate univariate payload:', viewKey || this.currentView || '');
      return false;
    }
    this._lastUniPayload = { sig, time: now };
    return true;
  },

  _extractUniValues(rows) {
    const m = this._uniFilterMeta || {};
    if (m.columnIndex == null) return [];
    const idx = Number(m.columnIndex);
    let data = (rows || []).map((r) => r[idx])
      .filter((v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(parseFloat(v)))
      .map((v) => parseFloat(v));
    if (!data.length) return [];
    const trim = m.trim || { min: 0, max: 100 };
    if (trim.min > 0 || trim.max < 100) {
      const sorted = [...data].sort((a, b) => a - b);
      const minVal = sorted[Math.floor((sorted.length - 1) * trim.min / 100)];
      const maxVal = sorted[Math.floor((sorted.length - 1) * trim.max / 100)];
      data = data.filter((v) => v >= minVal && v <= maxVal);
    }
    const t = m.transform || 'none';
    if (t === 'ln') data = data.map((v) => (v > 0 ? Math.log(v) : null)).filter((v) => v !== null);
    else if (t === 'log10') data = data.map((v) => (v > 0 ? Math.log10(v) : null)).filter((v) => v !== null);
    else if (t === 'sqrt') data = data.map((v) => (v >= 0 ? Math.sqrt(v) : null)).filter((v) => v !== null);
    else if (t === 'square') data = data.map((v) => v * v);
    return data;
  },

  publishUniFilterChange(filteredRows, skipDispatch) {
    if (this.module !== 'univariate') {
      return this.publishHeaderRowFilterChange(filteredRows, skipDispatch);
    }
    const m = this._uniFilterMeta || {};
    const allRows = m.sourceRowsAll || filteredRows;
    const values = this._extractUniValues(filteredRows);
    if (!values.length) {
      alert('No numeric values remain after filtering. Adjust filters or clear them.');
      return;
    }
    const payload = {
      column: m.column || 'Variable',
      variableName: m.column || 'Variable',
      columnIndex: m.columnIndex,
      transform: m.transform,
      trim: m.trim,
      dataSource: m.dataSource,
      sourceHeaders: m.sourceHeaders,
      sourceRowsAll: allRows,
      sourceRows: filteredRows,
      values,
      data: values,
      rawData: values,
      n: values.length,
      rowFilterActive: typeof UniRowFilter !== 'undefined' && UniRowFilter.hasActiveFilters()
    };
    this._setGenericRowFilterState({
      headers: (m.sourceHeaders || []).slice ? m.sourceHeaders.slice() : (m.sourceHeaders || []),
      allRows: (allRows || []).map((r) => Array.isArray(r) ? r.slice() : r),
      usedRows: (filteredRows || []).map((r) => Array.isArray(r) ? r.slice() : r),
      columnFilters: this._getCurrentRowFilterCriteria(),
      sourceHeaders: m.sourceHeaders,
      sourceRowsAll: allRows,
      sourceRows: filteredRows,
      columnIndex: m.columnIndex,
      rowFilterActive: payload.rowFilterActive,
      module: 'univariate',
      view: this.currentView
    }, 'univariate');
    try {
      sessionStorage.setItem('univariateResults', JSON.stringify(payload));
    } catch (_e) {}
    this.updateUniFilterChrome(payload);
    if (!skipDispatch) {
      document.dispatchEvent(new CustomEvent('statistico-uni-filter-changed', { detail: payload }));
    }
    return payload;
  },

  publishHeaderRowFilterChange(filteredRows, skipDispatch) {
    const meta = (typeof UniRowFilter !== 'undefined' && typeof UniRowFilter.getSourceMeta === 'function')
      ? UniRowFilter.getSourceMeta()
      : null;
    const data = this._getHeaderRowFilterData();
    const headers = (meta && Array.isArray(meta.headers) && meta.headers.length)
      ? meta.headers.slice()
      : (data && Array.isArray(data.headers) ? data.headers.slice() : []);
    if (!headers.length) return null;
    const rows = this._normalizeRowFilterRows(filteredRows, headers);
    const allRows = (meta && Array.isArray(meta.allRows) && meta.allRows.length)
      ? this._normalizeRowFilterRows(meta.allRows, headers)
      : (data && (data.allRows || data.sourceRowsAll)
        ? this._normalizeRowFilterRows(data.allRows || data.sourceRowsAll, headers)
        : rows);
    const active = typeof UniRowFilter !== 'undefined'
      ? UniRowFilter.hasActiveFilters()
      : rows.length !== allRows.length;
    const allRowsCopy = allRows.map((r) => r.slice());
    const rowsCopy = rows.map((r) => r.slice());
    const payload = {
      ...(data || {}),
      headers: headers.slice(),
      allRows: allRowsCopy,
      usedRows: rowsCopy,
      columnFilters: this._getCurrentRowFilterCriteria(),
      sourceHeaders: headers.slice(),
      sourceRowsAll: allRowsCopy,
      sourceRows: rowsCopy,
      rowFilterActive: active,
      module: this.module,
      view: this.currentView
    };
    try {
      console.warn('[ROWFILTER][dispatch]', {
        module: this.module,
        view: this.currentView,
        headers: headers.length,
        allRows: allRowsCopy.length,
        usedRows: rowsCopy.length,
        active
      });
    } catch (_e) {}
    // Keep shared row-filter state compact: criteria + header identity only.
    // Storing full row matrices here can freeze on large datasets.
    this._setGenericRowFilterState({
      headers: headers.slice(),
      columnFilters: payload.columnFilters,
      rowFilterActive: active,
      module: this.module,
      view: this.currentView
    });
    this.updateUniFilterChrome(payload);

    const actions = this._pendingActions || {};
    const handler = actions.onFilterRows || actions.filterRows;
    if (typeof handler === 'function') {
      try {
        console.warn('[ROWFILTER][handler] invoking module-specific handler', {
          module: this.module,
          hasOnFilterRows: typeof actions.onFilterRows === 'function',
          hasFilterRows: typeof actions.filterRows === 'function'
        });
        handler(payload);
      } catch (e) { console.warn('Row filter handler failed:', e); }
    } else if (this.module === 'correlations') {
      // Non-matrix correlation views (Network / Taylor / Partial /
      // Reliability / Descriptives) don't register an onFilterRows
      // handler. Auto-rebuild correlationData in sessionStorage so the
      // shared filter UI stays coherent and dispatch a custom event so
      // the page can re-render itself.
      console.warn('[ROWFILTER][handler] using correlation auto-rebuild fallback', { module: this.module });
      this._autoRebuildCorrelationDataFromFilter(payload);
    } else {
      console.warn('[ROWFILTER][handler] using generic fallback', { module: this.module });
      this._applyGenericHeaderRowFilterFallback(payload);
    }
    if (!skipDispatch) {
      document.dispatchEvent(new CustomEvent('statistico-row-filter-changed', { detail: payload }));
    }
    if (document.getElementById('hdpModal')) {
      this._lastDataResult = this._applyHeaderRowFilterToDataResult(data);
      this._populateDataModal(this._lastDataResult, 'used');
    }
    return payload;
  },

  updateUniFilterChrome(payload) {
    if (this._isHeaderRowFilterSuppressed()) {
      const notice = document.getElementById('uni-filter-active-notice');
      if (notice) {
        notice.className = '';
        notice.innerHTML = '';
      }
      const wrap = document.getElementById('headerUniFilterWrap');
      if (wrap) {
        wrap.hidden = true;
        wrap.style.display = 'none';
      }
      const varEl = document.getElementById('headerVariableName');
      if (varEl) varEl.textContent = this.variableName || 'Variable';
      const nEl = document.getElementById('headerSampleSize');
      if (nEl) nEl.textContent = `(n=${this.sampleSize || 0})`;
      return;
    }

    payload = payload || (this.module === 'univariate' ? this._getUniStored() : this._getHeaderRowFilterData());
    const meta = typeof UniRowFilter !== 'undefined' ? UniRowFilter.getSourceMeta() : null;
    const hasSource = !!(payload && payload.sourceRowsAll && payload.sourceRowsAll.length) ||
      !!(payload && payload.allRows && payload.allRows.length) ||
      !!(meta && meta.allRows && meta.allRows.length);
    const active = (typeof UniRowFilter !== 'undefined' && UniRowFilter.hasActiveFilters()) ||
      !!(payload && payload.rowFilterActive);
    // Prefer the live UniRowFilter meta when it has real data; otherwise
    // fall back to the payload. Without this fallback, render() can fire
    // updateUniFilterChrome() before Filter.attach has had a chance to
    // initialise UniRowFilter, leaving meta.allRows empty and total=0,
    // which suppresses the banner even when the page payload says the
    // filter is active.
    const total = (meta && Array.isArray(meta.allRows) && meta.allRows.length)
      ? meta.allRows.length
      : (payload && payload.sourceRowsAll ? payload.sourceRowsAll.length : (payload && payload.allRows ? payload.allRows.length : 0));
    const showing = (meta && Array.isArray(meta.filteredRows) && meta.filteredRows.length)
      ? meta.filteredRows.length
      : (payload && payload.sourceRows ? payload.sourceRows.length : (payload && payload.usedRows ? payload.usedRows.length : 0));
    const isByGroup = this.module === 'univariate' && this.currentView === 'by-group';
    const headerIdx = payload && payload.columnIndex != null ? Number(payload.columnIndex) : null;
    const headerVarName = (payload && Array.isArray(payload.sourceHeaders) && headerIdx != null && payload.sourceHeaders[headerIdx])
      ? payload.sourceHeaders[headerIdx]
      : null;
    const varName = isByGroup
      ? (this.variableName || headerVarName || (payload && (payload.column || payload.variableName)) || 'Variable')
      : ((payload && (payload.column || payload.variableName)) || this.variableName || headerVarName || 'Variable');
    const n = isByGroup
      ? (this.sampleSize || 0)
      : (payload && payload.values ? payload.values.length : this.sampleSize);

    const varEl = document.getElementById('headerVariableName');
    if (varEl) {
      varEl.innerHTML = active
        ? `<i class="fa-solid fa-filter uni-title-filter-icon" title="Row filter active"></i>${varName}`
        : varName;
    }
    const nEl = document.getElementById('headerSampleSize');
    if (nEl) {
      if (this.module === 'univariate') {
        // Univariate views recompute on filter (see rebuildFromSourceRows
        // in histogram), so payload.values.length IS the analysis N.
        nEl.textContent = `(n=${n})`;
      } else {
        // For everyone else (correlations, ANOVA, regression, PCA, …)
        // the page is the source of truth for what N means in the title:
        // it calls updateVariable() whenever its analysis N changes.
        // Don't override with the row-filter `showing` count — modules
        // that don't recompute on filter (ANOVA, factor, …) would then
        // show a lie next to their precomputed stats.
        nEl.textContent = `(n=${this.sampleSize || showing || n || 0})`;
      }
    }

    let notice = document.getElementById('uni-filter-active-notice');
    if (!notice) {
      // Fallback for pages whose header HTML predates the in-template notice div.
      notice = document.createElement('div');
      notice.id = 'uni-filter-active-notice';
      const headerContainer = document.getElementById('header-container');
      if (headerContainer) {
        headerContainer.appendChild(notice);
      } else {
        const anchor = document.querySelector('.statistico-shell') || document.querySelector('.statistico-header');
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(notice, anchor.nextSibling);
      }
    } else if (!notice.isConnected) {
      // The element exists in JS memory but was detached from the DOM
      // (e.g. by header-container.innerHTML reassignment during render).
      // Re-attach it so the banner is visible again.
      const headerContainer = document.getElementById('header-container');
      if (headerContainer) {
        headerContainer.appendChild(notice);
      } else {
        const anchor = document.querySelector('.statistico-shell') || document.querySelector('.statistico-header');
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(notice, anchor.nextSibling);
      }
    }
    if (active && total) {
      notice.className = 'is-visible';
      const scope = this.module === 'univariate' ? ' from the hub range (all univariate views)' : ' from the source range';
      notice.innerHTML = `<i class="fa-solid fa-filter"></i> Row filter active — showing <strong>${showing}</strong> of <strong>${total}</strong> rows${scope}`;
    } else {
      notice.className = '';
      notice.innerHTML = '';
    }

    const btn = document.getElementById('uniFilterBtn');
    const wrap = document.getElementById('headerUniFilterWrap');
    if (wrap) { wrap.hidden = false; wrap.style.display = 'inline-flex'; }
    if (btn) {
      btn.disabled = !hasSource;
      btn.classList.toggle('disabled', !hasSource);
    }
    if (typeof UniRowFilter !== 'undefined' && hasSource) UniRowFilter.updateBadge();
    else if (btn) {
      const badge = btn.querySelector('[data-uni-filter-badge]');
      if (badge) badge.textContent = hasSource ? `${total || n} rows` : 'no range';
    }
  },

  _ensureUniFilterInHeader() {
    document.querySelectorAll('.panel-heading .uni-filter-btn, .panel-heading-actions .uni-filter-btn').forEach((el) => el.remove());
  },

  _initUniRowFilterFromStorage() {
    if (this._isHeaderRowFilterSuppressed()) return;
    if (this.module !== 'univariate') {
      const data = this._getHeaderRowFilterData();
      if (!data || !data.headers || !(data.allRows || data.sourceRowsAll)) return;
      if (typeof UniRowFilter === 'undefined') return;
      const allRows = data.allRows || data.sourceRowsAll;
      const dataUsedRows = Array.isArray(data.usedRows) ? data.usedRows
        : (Array.isArray(data.sourceRows) ? data.sourceRows : null);
      const dataIsFiltered = !!data.rowFilterActive || (
        Array.isArray(dataUsedRows) && Array.isArray(allRows) &&
        dataUsedRows.length > 0 && dataUsedRows.length < allRows.length
      );
      const existing = this._getGenericRowFilterState();
      const canReuseState = this._isHeaderRowFilterStateCompatible(existing, data.headers);
      UniRowFilter.init({
        headers: data.headers,
        rows: allRows,
        // Non-univariate modules (regression, ANOVA, PCA, factor, cluster…)
        // have no single analysis column; suppress the ★ marker by passing
        // an out-of-range index.
        columnIndex: -1,
        onApply: (rows) => this.publishHeaderRowFilterChange(rows)
      });
      // Restore the filter UI to reflect the active filtered dataset.
      // Prefer the page's own data (correlationData.sourceRows) over the
      // generic compact state, which may not have stored full usedRows
      // (compact-by-design to avoid freezes on large datasets).
      console.warn('[ROWFILTER][initFromStorage]', {
        module: this.module,
        headers: Array.isArray(data.headers) ? data.headers.length : 0,
        allRows: Array.isArray(allRows) ? allRows.length : 0,
        dataUsedRows: Array.isArray(dataUsedRows) ? dataUsedRows.length : null,
        dataIsFiltered,
        canReuseState,
        existingActive: !!(existing && existing.rowFilterActive)
      });
      if (dataIsFiltered && Array.isArray(dataUsedRows) && UniRowFilter.setFilteredRows) {
        if (canReuseState && existing.columnFilters && UniRowFilter.setColumnFilters) {
          UniRowFilter.setColumnFilters(existing.columnFilters, true);
        }
        UniRowFilter.setFilteredRows(dataUsedRows);
      } else if (canReuseState && existing.rowFilterActive && existing.usedRows && UniRowFilter.setFilteredRows) {
        if (existing.columnFilters && UniRowFilter.setColumnFilters) UniRowFilter.setColumnFilters(existing.columnFilters, true);
        UniRowFilter.setFilteredRows(this._resolveFilteredRowsForState(data.headers, allRows, existing).rows);
      }
      this.updateUniFilterChrome(canReuseState ? existing : data);
      if (canReuseState && existing.rowFilterActive && Array.isArray(existing.usedRows)) {
        this.publishHeaderRowFilterChange(this._resolveFilteredRowsForState(data.headers, allRows, existing).rows, true);
      }
      return;
    }
    const data = this._getUniStored();
    if (!data || !data.sourceHeaders || !(data.sourceRowsAll || data.sourceRows)) return;
    this._setUniFilterMeta(data);
    if (typeof UniRowFilter === 'undefined') return;
    const allRows = data.sourceRowsAll || data.sourceRows;
    UniRowFilter.init({
      headers: data.sourceHeaders,
      rows: allRows,
      columnIndex: data.columnIndex != null ? Number(data.columnIndex) : 0,
      onApply: (rows) => this.publishUniFilterChange(rows)
    });
    const existing = this._getGenericRowFilterState('univariate');
    const canReuseState = this._isHeaderRowFilterStateCompatible(existing, data.sourceHeaders);
    if (canReuseState && existing.columnFilters && UniRowFilter.setColumnFilters) {
      UniRowFilter.setColumnFilters(existing.columnFilters, true);
      if (UniRowFilter.setFilteredRows) {
        UniRowFilter.setFilteredRows(this._resolveFilteredRowsForState(data.sourceHeaders, allRows, existing).rows);
      }
    }
    if (data.sourceRows && data.sourceRows.length < allRows.length && UniRowFilter.setFilteredRows) {
      UniRowFilter.setFilteredRows(data.sourceRows);
    }
    if (!canReuseState && data.sourceRows && data.sourceRows.length < allRows.length) {
      this._setGenericRowFilterState({
        headers: data.sourceHeaders.slice(),
        allRows: allRows.map((r) => Array.isArray(r) ? r.slice() : r),
        usedRows: data.sourceRows.map((r) => Array.isArray(r) ? r.slice() : r),
        columnFilters: this._getCurrentRowFilterCriteria(),
        sourceHeaders: data.sourceHeaders,
        sourceRowsAll: allRows,
        sourceRows: data.sourceRows,
        columnIndex: data.columnIndex != null ? Number(data.columnIndex) : 0,
        rowFilterActive: true,
        module: 'univariate',
        view: this.currentView
      }, 'univariate');
    }
    this.updateUniFilterChrome(data);
  },

  _installUniFilterChangeListener() {
    if (this._uniFilterListenerInstalled) return;
    this._uniFilterListenerInstalled = true;
    document.addEventListener('statistico-uni-filter-changed', (e) => {
      if (e.detail && typeof window.handleDataReceived === 'function') {
        window.handleDataReceived(e.detail);
      }
    });
  },

  openUniRowFilter() {
    if (typeof UniRowFilter === 'undefined') {
      alert('Filter module failed to load. Reload the add-in.');
      return;
    }
    const data = this.module === 'univariate' ? this._getUniStored() : this._getHeaderRowFilterData();
    if (!data || !(data.sourceRowsAll || data.sourceRows || data.allRows)) {
      const moduleName = this.module === 'univariate' ? 'Univariate' : 'this module';
      alert(`Row filtering needs source rows from the workbook range.\n\nRun ${moduleName} with a selected range, then use Filter.`);
      return;
    }
    // If a view (e.g. histogram via its own UniRowFilter.init, or any
    // correlation view via Filter.attach) has already wired UniRowFilter
    // with rows + onApply, do NOT re-init here — that would clobber the
    // page's onApply and reset _appliedRows back to the
    // full dataset. But if UniRowFilter is empty (most univariate views
    // don't wire it themselves and the boot-time storage init may have
    // run before loadData arrived), re-run the storage-driven init now
    // so the panel actually has rows to display.
    const meta = (typeof UniRowFilter.getSourceMeta === 'function') ? UniRowFilter.getSourceMeta() : null;
    const alreadyWired = !!(meta && Array.isArray(meta.allRows) && meta.allRows.length);
    if (!alreadyWired) {
      this._initUniRowFilterFromStorage();
    }
    this._ensureUniFilterOverlay();
    UniRowFilter.open();
  },

  /* ─────────────────────────────────────────────────────────────────
     Shared Sidebar Utilities
     Used by modules that include a vertical .sb-nav sidebar.
     Call StatisticoHeader.initSidebarPage() once after init().
  ───────────────────────────────────────────────────────────────── */

  /**
   * Mark the body as a sidebar-layout page so shared CSS rules apply.
   * Also adds the .sb-layout div around the sidebar + right column if
   * the page uses the standard:
   *   <body>
   *     <div id="header-container"></div>
   *     <nav class="sb-nav" id="sidebarNav">…</nav>
   *     <div class="right-col">…</div>
   *   </body>
   */
  initSidebarPage() {
    document.body.classList.add('sb-page');

    // If the page hasn't wrapped in sb-layout yet, do it now.
    const nav = document.getElementById('sidebarNav');
    const rightCol = document.querySelector('.right-col');
    if (nav && rightCol && !document.querySelector('.sb-layout')) {
      const layout = document.createElement('div');
      layout.className = 'sb-layout lf-content';
      nav.parentNode.insertBefore(layout, nav);
      layout.appendChild(nav);
      layout.appendChild(rightCol);
    }
    this._renderSharedSidebar();
    this._ensureMinimalStyles();
    this._ensureWorkspaceTabAssets();
    this._ensurePlainTabUnderlineStyles();
    this._ensureDefaultActions();
    this._mountSidebarUtilities();
    try { this._renderUnivariateResultsTabs(); } catch (_e) {}
    const persistedDecimals = this.getDecimalPreference();
    this._installDecimalOverride();
    setTimeout(() => this.applyDecimalPreferenceToPage(persistedDecimals), 0);
    setTimeout(() => this._injectPerViewAiButton(), 0);
    this._injectUniFilterAssets();
  },

  _isValidRegressionNavPayload(payload) {
    return !!(payload && payload.modelSpec && payload.modelSpec.y
      && Array.isArray(payload.headers) && payload.headers.length
      && (Array.isArray(payload.rows) ? payload.rows.length : (Array.isArray(payload.sourceRows) && payload.sourceRows.length)));
  },

  _syncRegressionNavStorage() {
    try {
      let payload = null;
      if (window.regressionNavData && this._isValidRegressionNavPayload(window.regressionNavData)) {
        payload = window.regressionNavData;
      }
      if (!payload) {
        const raw = sessionStorage.getItem('regressionNavData');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (this._isValidRegressionNavPayload(parsed)) payload = parsed;
        }
      }
      if (!payload && window.regressionHeaders && window.regressionRows && window.regressionModelSpec) {
        payload = {
          results: window.regressionResults || null,
          headers: window.regressionHeaders,
          rows: window.regressionRows,
          address: window.regressionAddress || '',
          modelSpec: window.regressionModelSpec
        };
      }
      if (payload && this._isValidRegressionNavPayload(payload)) {
        if (!Array.isArray(payload.rows) && Array.isArray(payload.sourceRows)) {
          payload.rows = payload.sourceRows;
        }
        sessionStorage.setItem('regressionNavData', JSON.stringify(payload));
        window.regressionNavData = payload;
      }
    } catch (e) {
      console.warn('Regression nav storage sync failed.', e);
    }
  },

  _ensureRegressionAncovaNav(nav) {
    if (this.module !== 'regression' || !nav) return;
    if (document.getElementById('ancovaGroupNav')) return;
    const body = nav.querySelector('.sb-body');
    if (!body) return;
    const wrap = document.createElement('div');
    wrap.id = 'ancovaGroupNav';
    wrap.style.display = 'none';
    wrap.innerHTML = ''
      + '<button type="button" class="sb-item" id="ancovaNavBtn" onclick="switchTab(\'ancova-results\')"'
      + ' data-tab="ancova" title="Adjusted group differences with covariate control.">'
      + '<i class="fa-solid fa-layer-group sb-item-icon"></i>'
      + '<span class="sb-item-copy"><span class="sb-item-label">ANCOVA</span>'
      + '<span class="sb-item-description">Adjusted means, assumptions &amp; plots</span></span>'
      + '</button>';
    const groups = body.querySelectorAll('.sb-group');
    if (groups.length >= 2) body.insertBefore(wrap, groups[1]);
    else body.appendChild(wrap);
  },

  _ensureRegressionPowerNav(nav) {
    if (this.module !== 'regression' || !nav) return;
    if (document.getElementById('regPowerNavBtn')) return;
    const rail = nav.querySelector('.sb-group .sb-items-rail')
      || (document.getElementById('regSidebarMain') && document.getElementById('regSidebarMain').querySelector('.sb-group .sb-items-rail'));
    if (!rail) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sb-item';
    btn.id = 'regPowerNavBtn';
    btn.setAttribute('data-tab', 'power');
    btn.setAttribute('title', 'Required sample size, achieved power, and detectable R².');
    btn.setAttribute('onclick', "switchTab('power')");
    btn.innerHTML = ''
      + '<i class="fa-solid fa-bolt sb-item-icon"></i>'
      + '<span class="sb-item-copy"><span class="sb-item-label">Power &amp; Sample Size</span>'
      + '<span class="sb-item-description">Required N, achieved power &amp; detectable R²</span></span>';
    rail.appendChild(btn);
  },

  _ensureAnovaPowerNav(nav) {
    if (this.module !== 'anova' || !nav) return;
    if (nav.querySelector('.sb-item[data-tab="power"]')) return;
    const rails = nav.querySelectorAll('.sb-group .sb-items-rail');
    const analysisRail = rails[0];
    if (!analysisRail) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sb-item';
    btn.id = 'anovaPowerNavBtn';
    btn.setAttribute('data-tab', 'power');
    btn.setAttribute('title', 'Required sample size, achieved power, and detectable η².');
    btn.setAttribute('onclick', "switchTab('power')");
    btn.innerHTML = ''
      + '<i class="fa-solid fa-bolt sb-item-icon"></i>'
      + '<span class="sb-item-copy"><span class="sb-item-label">Power &amp; Sample Size</span>'
      + '<span class="sb-item-description">Required N, achieved power &amp; detectable η²</span></span>';
    const comparisonsBtn = analysisRail.querySelector('.sb-item[data-tab="comparisons"]');
    if (comparisonsBtn) analysisRail.insertBefore(btn, comparisonsBtn);
    else analysisRail.appendChild(btn);
  },

  _ensureRegressionByGroupNav(nav) {
    if (this.module !== 'regression' || !nav) return;
    if (document.getElementById('regByGroupNav')) return;
    if (!document.getElementById('regSidebarMain')) return;
    const main = document.getElementById('regSidebarMain');
    const body = nav.querySelector('.sb-body');
    const anchor = main || body;
    if (!anchor) return;
    if (document.getElementById('regByGroupNav')) return;
    const pinned = document.createElement('div');
    pinned.id = 'regByGroupNav';
    pinned.className = 'sb-pinned-items';
    pinned.innerHTML = `
      <div class="sb-pinned-separator" role="presentation"></div>
      <div class="sb-pinned-rail">
        <button type="button" class="sb-item" id="regByGroupNavBtn"
                onclick="StatisticoHeader.navigateTo('regression/regression-by-group.html')"
                data-nav-file="regression/regression-by-group.html"
                title="Compare coefficients and residual normality across group levels.">
          <i class="fa-solid fa-sitemap sb-item-icon"></i>
          <span class="sb-item-copy"><span class="sb-item-label">By Group</span><span class="sb-item-description">Coefficients &amp; residuals by level</span></span>
        </button>
      </div>`;
    anchor.appendChild(pinned);
  },

  _mountSidebarUtilities() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    this._ensureRegressionByGroupNav(nav);
    this._ensureRegressionAncovaNav(nav);
    this._ensureRegressionPowerNav(nav);
    this._ensureAnovaPowerNav(nav);
    if (this.module === 'regression' && nav && !document.getElementById('regSidebarScrollHint')) {
      const hint = document.createElement('div');
      hint.id = 'regSidebarScrollHint';
      hint.className = 'sb-scroll-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = '<i class="fa-solid fa-chevron-down"></i><span>More items below</span>';
      nav.appendChild(hint);
    }
    this._bindSidebarNavigation(nav);

    const existing = document.getElementById('sbUtilities');
    if (existing) existing.remove();
    const existingAi = document.getElementById('sbAiSection');
    if (existingAi) existingAi.remove();
    const existingProductFooter = document.getElementById('sbProductFooter');
    if (existingProductFooter) existingProductFooter.remove();
    const existingFooter = document.getElementById('sbNavFooter');
    if (existingFooter) existingFooter.remove();

    const footer = document.createElement('div');
    footer.id = 'sbNavFooter';
    footer.className = 'sb-nav-footer';

    const actions = this._pendingActions || {};
    const hasView = typeof actions.getData === 'function';
    const hasHtml = typeof actions.exportHtml === 'function';
    const hasJson = typeof actions.exportJson === 'function';

    // ── AI pill — above utilities ─────────────────────────────────────────
    const isDependentKplus = this.module === 'dependent' && this.currentView === 'dependent-results-kplus';
    const supportsIndependentAi = this.module === 'independent';
    const supportsMixedAi = this.module === 'mixed-model';
    const supportsFactorAi = this.module === 'factor';
    const supportsClusterAi = this.module === 'cluster';
    const supportsSharedAi = (this.module === 'univariate' && this.currentView !== 'hypothesis') || this.module === 'correlations' || supportsIndependentAi || supportsMixedAi || supportsFactorAi || supportsClusterAi;
    const supportsFullAiPill = supportsIndependentAi || isDependentKplus;
    if (supportsSharedAi || isDependentKplus) {
      const aiSection = document.createElement('div');
      aiSection.id = 'sbAiSection';
      aiSection.className = 'sb-ai-section-wrap';
      const isCorrelation = this.module === 'correlations';
      const aiClick = supportsIndependentAi
        ? 'StatisticoHeader._sbAiIndependentInterpret()'
        : isDependentKplus
          ? 'StatisticoHeader._sbAiDependentKplusInterpret()'
        : supportsMixedAi
          ? 'requestMixedModelAI()'
        : supportsFactorAi
          ? 'requestFactorModuleAI()'
        : supportsClusterAi
          ? 'requestClusterModuleAI()'
          : 'StatisticoHeader._sbAiGlobalInterpret()';
      const aiTitle = supportsIndependentAi
        ? 'AI statistical summary for this independent means analysis'
        : isDependentKplus
          ? 'Full AI interpretation of this repeated-measures analysis'
        : supportsMixedAi
          ? 'AI interpretation of the mixed model results'
        : supportsFactorAi
          ? 'Full factor analysis - synthesises suitability, extraction, rotation & diagnostics into one report'
        : supportsClusterAi
          ? 'Full cluster analysis - synthesises quality, sizes, profiles & separation into one report'
          : (isCorrelation ? 'Full correlation analysis - synthesises all correlation views into one report' : 'Full variable analysis - synthesises all diagnostics into one report');
      const aiLabel = supportsFullAiPill ? 'Full AI Analysis' : 'Full Analysis';
      const aiBadge = supportsFullAiPill ? 'ALL' : 'AI';
      aiSection.innerHTML = `
        <button class="sb-ai-sidebar-pill ${supportsFullAiPill ? 'sb-ai-sidebar-pill--full' : ''}"
                id="sbAiBtn"
                onclick="${aiClick}"
                title="${aiTitle}">
          <i class="fa-solid ${supportsFullAiPill ? 'fa-layer-group' : 'fa-brain'}"></i>
          <span>${aiLabel}</span>
          <sup class="sb-ai-sup">${aiBadge}</sup>
        </button>
      `;
      footer.appendChild(aiSection);
    }

    // ── Utilities ──────────────────────────────────────────────────────────
    const utilities = document.createElement('div');
    utilities.id = 'sbUtilities';
    utilities.className = 'sb-bottom';
    utilities.innerHTML = `
      <div class="sb-bottom-row">
        <i class="fa-solid fa-wand-magic-sparkles sb-bottom-icon"></i>
        <span class="sb-bottom-label">Utilities</span>
      </div>
      <button class="sb-bottom-btn sb-bottom-btn--data ${hasView ? '' : 'sb-bottom-btn--disabled'}"
              id="sbViewDataBtn"
              ${hasView ? 'onclick="StatisticoHeader._toggleViewData()"' : 'disabled'}
              title="${hasView ? 'Toggle between used observations and all observations' : 'View Data is not available for this page yet'}">
        <i class="fa-solid fa-eye"></i>
        <span class="sb-item-label">View Data</span>
      </button>
      <button class="sb-bottom-btn sb-bottom-btn--html ${hasHtml ? '' : 'sb-bottom-btn--disabled'}"
              id="sbExportHtmlBtn"
              ${hasHtml ? 'onclick="StatisticoHeader._pendingActions.exportHtml()"' : 'disabled'}
              title="${hasHtml ? 'Export full analysis as HTML, PDF, or Word' : 'Export Report is not available for this page yet'}">
        <i class="fa-solid fa-file-export"></i>
        <span class="sb-item-label">Export Report</span>
      </button>
      <button class="sb-bottom-btn sb-bottom-btn--json ${hasJson ? '' : 'sb-bottom-btn--disabled'}"
              id="sbExportJsonBtn"
              ${hasJson ? 'onclick="StatisticoHeader._pendingActions.exportJson()"' : 'disabled'}
              title="${hasJson ? 'Download results as JSON file' : 'JSON export is not available for this page yet'}">
        <i class="fa-solid fa-download"></i>
        <span class="sb-item-label">JSON</span>
      </button>
    `;
    footer.appendChild(utilities);
    nav.appendChild(footer);

    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === 'function') {
      window.StatisticoTooltip.refresh();
    }
  },

  _bindSidebarNavigation(nav) {
    if (!nav) return;
    nav.querySelectorAll('.sb-item[onclick*="StatisticoHeader.navigateTo"]').forEach((btn) => {
      if (btn.getAttribute('data-nav-file')) return;
      const raw = btn.getAttribute('onclick') || '';
      const match = raw.match(/navigateTo\(['"]([^'"]+)['"]\)/);
      if (match && match[1]) btn.setAttribute('data-nav-file', match[1]);
    });

    if (document.documentElement.dataset.statisticoNavBound !== '1') {
      document.documentElement.dataset.statisticoNavBound = '1';
      const routeSidebarEvent = (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('.sb-item[data-nav-file]') : null;
        const navBtn = btn || this._sidebarButtonAtPoint(e);
        if (!navBtn) return;
        e.preventDefault();
        e.stopPropagation();
        this.navigateTo(navBtn.getAttribute('data-nav-file'));
      };
      document.addEventListener('pointerdown', routeSidebarEvent, true);
      document.addEventListener('mousedown', routeSidebarEvent, true);
      document.addEventListener('click', routeSidebarEvent, true);
    }

    if (nav.dataset.statisticoNavBound === '1') return;
    nav.dataset.statisticoNavBound = '1';
    nav.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('.sb-item[data-nav-file]') : null;
      if (!btn || !nav.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      this.navigateTo(btn.getAttribute('data-nav-file'));
    }, true);
  },

  _sidebarButtonAtPoint(e) {
    if (!e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return null;
    const nav = document.getElementById('sidebarNav');
    if (!nav) return null;
    const navRect = nav.getBoundingClientRect();
    if (e.clientX < navRect.left || e.clientX > navRect.right || e.clientY < navRect.top || e.clientY > navRect.bottom) {
      return null;
    }
    const buttons = nav.querySelectorAll('.sb-item[data-nav-file]');
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        return btn;
      }
    }
    return null;
  },

  /**
   * Toggle the sidebar collapsed/expanded state.
   * Pages can wire this to the sb-toggle-btn onclick.
   */
  toggleSidebar() {
    const nav = document.getElementById('sidebarNav');
    if (nav) nav.classList.toggle('collapsed');
  },

  // ── Global AI Interpretation (univariate sidebar) ────────────────────────

  /**
   * Inject a contextual floating "Explain this view" button into .right-col.
   * Only shown for univariate views that are not hypothesis.
   */
  _mountFloatingAiButton(btn) {
    if (!btn) return;
    btn.type = 'button';
    let host = document.getElementById('sbAiFloatHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'sbAiFloatHost';
      host.className = 'sb-ai-float-host';
      document.documentElement.appendChild(host);
    }
    host.appendChild(btn);
    this._wireSbAiFloatDrag(btn);
  },

  _wireSbAiFloatDrag(btn) {
    if (!btn || btn.dataset.floatDragWired === '1') return;
    btn.dataset.floatDragWired = '1';
    const storageKey = 'statistico.sbAiFloatPos.v2';
    if (!btn.title.includes('Drag to reposition')) {
      btn.title = (btn.title ? btn.title + ' — ' : '') + 'Drag to reposition';
    }

    const applySavedPos = (saved) => {
      if (!saved || !Number.isFinite(saved.left) || !Number.isFinite(saved.top)) return;
      const maxLeft = Math.max(8, window.innerWidth - btn.offsetWidth - 8);
      const maxTop = Math.max(8, window.innerHeight - btn.offsetHeight - 8);
      const left = Math.min(Math.max(8, saved.left), maxLeft);
      const top = Math.min(Math.max(8, saved.top), maxTop);
      btn.style.left = left + 'px';
      btn.style.top = top + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
      btn.style.width = 'max-content';
      btn.classList.add('is-floating-free');
    };

    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      requestAnimationFrame(() => applySavedPos(saved));
    } catch (_e) {}

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      const rect = btn.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      if (!btn.classList.contains('is-floating-free')) {
        btn.style.left = rect.left + 'px';
        btn.style.top = rect.top + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
        btn.style.width = 'max-content';
        btn.classList.add('is-floating-free');
      }
      startLeft = parseFloat(btn.style.left) || rect.left;
      startTop = parseFloat(btn.style.top) || rect.top;
      btn.classList.add('sb-ai-float-btn--dragging');
      try { btn.setPointerCapture(e.pointerId); } catch (_e) {}
    });

    btn.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      moved = true;
      e.preventDefault();
      btn.style.left = clamp(startLeft + dx, 8, window.innerWidth - btn.offsetWidth - 8) + 'px';
      btn.style.top = clamp(startTop + dy, 8, window.innerHeight - btn.offsetHeight - 8) + 'px';
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      btn.classList.remove('sb-ai-float-btn--dragging');
      try { btn.releasePointerCapture(e.pointerId); } catch (_e) {}
      if (moved) {
        sessionStorage.setItem(storageKey, JSON.stringify({
          left: parseFloat(btn.style.left),
          top: parseFloat(btn.style.top)
        }));
        btn.dataset.suppressClick = '1';
        setTimeout(() => { delete btn.dataset.suppressClick; }, 0);
      }
    };

    btn.addEventListener('pointerup', endDrag);
    btn.addEventListener('pointercancel', endDrag);

    btn.addEventListener('click', (e) => {
      if (btn.dataset.suppressClick) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  },

  _injectPerViewAiButton() {
    if (!this._supportsInsightGuide()) return;
    if (document.getElementById('sbAiFloatBtn')) return;

    if (this.module === 'independent') {
      const btn = document.createElement('button');
      btn.id = 'sbAiFloatBtn';
      btn.className = 'sb-ai-float-btn sb-ai-float-btn--tab';
      btn.title = 'Start explaining the active Independent Means view';
      btn.innerHTML = '<i class="fa-solid fa-compass"></i><span>Explain View</span><sup class="sb-ai-sup">AI</sup>';
      btn.addEventListener('click', () => StatisticoHeader._sbAiIndependentTabInterpret());
      this._mountFloatingAiButton(btn);
      return;
    }

    const label = this._getInsightGuideLabel();

    const btn = document.createElement('button');
    btn.id = 'sbAiFloatBtn';
    btn.className = 'sb-ai-float-btn';
    btn.title = `Start explaining the ${label} view`;
    btn.innerHTML = `<i class="fa-solid fa-compass"></i><span>Explain View</span><sup class="sb-ai-sup">AI</sup>`;
    btn.addEventListener('click', () => StatisticoHeader._sbAiPerViewInterpret());

    this._mountFloatingAiButton(btn);
  },

  _supportsInsightGuide() {
    if (this.module === 'univariate') return true;
    if (this.module === 'cluster') return true;
    return this._isSharedSidebarModule();
  },

  _getUnivariateViewLabels() {
    return {
      histogram: 'Histogram',
      boxplot: 'Box Plot & Outliers',
      cdf: 'CDF',
      percentile: 'Percentiles',
      kernel: 'Kernel',
      'by-group': 'Grouped Analysis',
      'by-group-stats': 'Grouped Statistics',
      'by-group-boxplot': 'Grouped Box Plots',
      'by-group-normality': 'Group Normality Analysis',
      outliers: 'Outliers',
      normality: 'Tests',
      qqplot: 'PP/QQ',
      confidence: 'Confidence Intervals',
      hypothesis: 'One-Sample Test'
    };
  },

  _getInsightGuideViewKey() {
    if (this.module === 'univariate' && this.currentView === 'by-group') {
      const tab = globalThis.__byGroupActiveTab || 'stats';
      return `by-group-${tab}`;
    }
    if (this.module === 'univariate' || this.module === 'correlations') return this.currentView;
    if (this.module === 'independent') return `independent-${this._getIndependentActiveTab()}`;
    if (this.module === 'cluster') {
      // The cluster results dialog navigates via data-nav-key (km-map, hi-profiles, ...).
      const activeNav = document.querySelector('.sb-cluster-nav.active[data-nav-key]');
      if (activeNav) return `cluster-${activeNav.getAttribute('data-nav-key')}`;
    }
    const activeSidebar = document.querySelector('.sb-item.active[data-tab], .sb-item.active[id]');
    const tab = activeSidebar?.dataset?.tab || activeSidebar?.id || this._getIndependentActiveTab();

    // For modules that host an in-page workspace tab bar (regression, etc.),
    // prefer the active inner tab so the Insight Guide can describe the
    // specific chart the user is looking at (e.g. Predictor Effects vs
    // Unique Contribution) instead of the broader sidebar section.
    if (this.module === 'regression') {
      const innerTab = document.querySelector(
        '.tab-content.active .ws-mode-tab.active[data-viz-tab], ' +
        '.tab-content.active .ws-mode-tab.active[data-pred-tab], ' +
        '.tab-content.active .ws-mode-tab.active[data-diag-tab], ' +
        '.tab-content.active .ws-mode-tab.active[data-reg-tab], ' +
        '.tab-content.active .ws-mode-tab.active[data-ix-tab], ' +
        '.tab-content.active .ws-mode-tab.active[data-ancova-tab]'
      );
      const innerKey = innerTab && (
        innerTab.dataset.vizTab ||
        innerTab.dataset.predTab ||
        innerTab.dataset.diagTab ||
        innerTab.dataset.regTab ||
        innerTab.dataset.ixTab ||
        innerTab.dataset.ancovaTab
      );
      if (innerKey) return `regression-${innerKey}`;
    }

    // Logistic results uses a parent-sidebar tab (e.g. model-results) plus an
    // inner sub-view selected by data-sub on workspace tabs. Combine them so
    // the AI prompt is anchored on the actual sub-view (overview, technical,
    // roc-thresholds, calibration, scenario-engine, risk-profiles, etc.).
    if (this.module === 'logistic' && tab) {
      const subBtn = document.querySelector('.ws-mode-tab.active[data-sub]');
      const sub = subBtn?.dataset?.sub;
      if (sub && sub !== 'overview') return `logistic-${tab}-${sub}`;
      if (sub === 'overview') return `logistic-${tab}-overview`;
    }

    return `${this.module}-${tab || this.currentView || 'view'}`;
  },

  _getInsightGuideLabel() {
    const key = this._getInsightGuideViewKey();
    const labels = {
      ...this._getUnivariateViewLabels(),
      ...this._correlationViewLabels(),
      ...this._independentViewLabels(),
      ...this._genericModuleViewLabels()
    };
    return labels[key] || labels[this.currentView] || key.replace(/^[^-]+-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  },

  _genericModuleViewLabels() {
    return {
      'dependent-explore': 'Descriptives',
      'dependent-trajectories': 'Trajectories',
      'dependent-assumptions': 'Assumptions',
      'dependent-results': 'Test Results',
      'dependent-posthoc': 'Pairwise Comparisons',
      'dependent-effects': 'Effect Sizes',
      'dependent-power': 'Power Analysis',
      'dependent-report': 'APA Report',
      'dependent-ai-interpretation': 'AI Interpretation',
      'logistic-model-results': 'Model Results',
      'logistic-predictive-performance': 'Predictive Performance',
      'logistic-probabilities': 'Probabilities',
      'logistic-interactions': 'Interactions',
      'logistic-diagnostics': 'Diagnostics',
      'logistic-correlations': 'Correlations',
      'logistic-descriptives': 'Descriptives',
      'logistic-model-results-overview':       'Model Results — Overview',
      'logistic-model-results-technical':      'Model Results — Technical',
      'logistic-predictive-performance-overview':       'Predictive Performance — Overview',
      'logistic-predictive-performance-roc-thresholds': 'Predictive Performance — ROC & Thresholds',
      'logistic-predictive-performance-calibration':    'Predictive Performance — Calibration',
      'logistic-probabilities-overview':       'Probabilities — Overview',
      'logistic-probabilities-scenario-engine':'Probabilities — Scenario Engine',
      'logistic-probabilities-risk-profiles':  'Probabilities — Risk Profiles',
      'logistic-interactions-overview':        'Interactions — Overview',
      'logistic-interactions-visualization':   'Interactions — Visualization',
      'logistic-interactions-technical':       'Interactions — Technical',
      'logistic-diagnostics-overview':         'Diagnostics — Overview',
      'logistic-diagnostics-residuals':        'Diagnostics — Residuals',
      'logistic-diagnostics-influence':        'Diagnostics — Influence',
      'logistic-power':                        'Power & Sample Size',
      'factor-suitability': 'Suitability',
      'factor-extraction': 'Extraction',
      'factor-rotation': 'Structure and Rotation',
      'factor-diagnostics': 'Diagnostics',
      'factor-scores': 'Scores',
      'factor-ai': 'AI Summary',
      'factor-viewdata': 'View Data',
      'pca-summary': 'Summary',
      'pca-components': 'Components',
      'pca-interpretation': 'Loadings & Rotation',
      'pca-scores': 'Scores',
      'pca-diagnostics': 'Diagnostics',
      'anova-overview': 'Summary',
      'anova-inference': 'Inference',
      'anova-comparisons': 'Comparisons',
      'anova-diagnostics': 'Diagnostics',
      'anova-visuals': 'Visuals',
      'anova-report': 'Report',
      'anova-power': 'Power & Sample Size',
      'regression-power': 'Power & Sample Size',
      'mixed-model-power': 'Power & Sample Size',
      'power-sbMeans': 'Means Power',
      'power-sbAnova': 'ANOVA Power',
      'power-sbCorr': 'Correlation Power',
      'power-sbProp': 'Proportion Power',
      'power-sbReg': 'Regression Power',
      'regression-results': 'Regression Results',
      'regression-overview': 'Results Overview',
      'regression-detail': 'Results Detail',
      'regression-diagnostics': 'Diagnostics',
      'regression-residuals': 'Residuals',
      'regression-results-overview': 'Model Results — Overview',
      'regression-results-detail':   'Model Results — Technical',
      'regression-pred-overview':    'Predictions — Overview',
      'regression-pred-scenario':    'Predictions — Scenario Engine',
      'regression-viz-partial':      'Visualization — Predictor Effects',
      'regression-viz-unique':       'Visualization — Unique Contribution',
      'regression-diag-overview':    'Diagnostics — Overview',
      'regression-diag-plots':       'Diagnostics — Residual Plots',
      'regression-diag-influence':   'Diagnostics — Influence',
      'regression-ix-summary':       'Interactions — Overview',
      'regression-ix-viz':           'Interactions — Visualization',
      'regression-ix-details':       'Interactions — Technical',
      'regression-ancova-results':     'ANCOVA — Results',
      'regression-ancova-assumptions': 'ANCOVA — Assumptions',
      'regression-ancova-viz':         'ANCOVA — Visualization',
      'cluster-km-overview':    'K-means — Overview',
      'cluster-km-sizes':       'K-means — Sizes & Assignments',
      'cluster-km-profiles':    'K-means — Profiles & Centers',
      'cluster-km-map':         'K-means — Separation & Map',
      'cluster-km-diagnostics': 'K-means — Diagnostics',
      'cluster-hi-overview':    'Hierarchical — Overview',
      'cluster-hi-dendrogram':  'Hierarchical — Dendrogram',
      'cluster-hi-clusters':    'Hierarchical — Clusters',
      'cluster-hi-profiles':    'Hierarchical — Profiles & Centroids',
      'cluster-hi-map':         'Hierarchical — Separation & Map'
    };
  },

  _genericModuleControlsDoc(key) {
    const moduleName = this._getModuleDisplayName();
    const label = this._getInsightGuideLabel();
    const docs = {
      'dependent-explore': 'Review paired or repeated-measures descriptives, missingness, and within-subject patterns before interpreting the test.',
      'dependent-trajectories': 'Inspect individual and group trajectories across timepoints to understand change patterns.',
      'dependent-assumptions': 'Check normality of differences, sphericity or related diagnostics, and the recommended testing route.',
      'dependent-results': 'Read the paired/repeated-measures test statistic, p-value, confidence interval, and decision against alpha.',
      'dependent-posthoc': 'Review pairwise comparisons with correction when the omnibus test is significant.',
      'dependent-effects': 'Use the effect-size panel to distinguish practical magnitude from statistical significance.',
      'dependent-power':
        'Power & sample-size planning for the repeated-measures / paired design. Read the metric cards (Achieved Power at the current number of subjects, required N, observed effect size), pick a target power with the 80/90/95% chips, and follow the power curve to see how power grows with N. '
        + 'For nonparametric routes (e.g. Friedman) the engine converts the rank effect (Kendall\u2019s W) to a planning effect f — an approximation for planning, not an exact nonparametric power. Expand Technicals for the formulas, effect-size conversions, and method notes.',
      'independent-power':
        'Power & sample-size planning for the between-groups comparison. Read Achieved Power at the current group sizes, the required N per group for the 80/90/95% target chips, and the smallest detectable effect (Cohen\u2019s d or f). The power curve shows how power grows as group sizes increase. Expand Technicals for formulas and assumptions.',
      'anova-power':
        'Power & sample-size planning for the ANOVA design. Read Achieved Power for the observed group effect (η² / Cohen\u2019s f), the total N required for the 80/90/95% target chips, and the power curve over sample size. Calculations use the noncentral F distribution. Expand Technicals for formulas and effect-size conversions.',
      'regression-power':
        'Power & sample-size planning for the regression model. Read Achieved Power for the observed model R² (converted to Cohen\u2019s f²), the number of observations required for the 80/90/95% target chips, and the smallest detectable R². The power curve shows power versus sample size given the number of predictors. Expand Technicals for formulas.',
      'mixed-model-power':
        'Power & sample-size planning for a fixed effect in the mixed model. Power is planned primarily in SUBJECTS (clustering units), not total observations: the ICC and measurements-per-subject cards show how repeated measurements are discounted into an effective sample size. Read Achieved Power for the selected fixed effect (partial η² / f²) and the subjects required for the 80/90/95% targets. Expand Technicals for the method.',
      'dependent-report': 'Use the APA report view for publication-ready wording and consistency checks.',
      'dependent-ai-interpretation': 'Get an AI-assisted interpretation of the repeated-measures analysis.',
      'logistic-model-results': 'Review effect directions, odds ratios, confidence intervals, and model significance together.',
      'logistic-predictive-performance': 'Evaluate classification quality, ROC trade-offs, and threshold-dependent performance.',
      'logistic-probabilities': 'Inspect predicted probabilities and risk patterns across observations and scenarios.',
      'logistic-interactions': 'Examine interaction effects on event probability for combined predictor conditions.',
      'logistic-diagnostics': 'Use residual and influence diagnostics to check separation, leverage, and model stability.',
      'logistic-power':
        'Plan sample size for logistic regression with one of three methods, chosen from the Method dropdown. '
        + '(1) EPV Assessment — a rule-of-thumb adequacy check: EPV = outcome events / predictors, targeting roughly 10-15 events per predictor. It reports adequacy (adequate / borderline / insufficient), NOT a power percentage, because it is a coefficient-stability heuristic (Peduzzi et al. 1996), not a hypothesis test — there is no effect size or alpha, so no power term exists. '
        + '(2) Power for One Predictor — the Hsieh et al. (1998) formula: given outcome prevalence, exposure prevalence, odds ratio, and alpha, it returns explicit statistical power at your N (or the N needed for target power). '
        + '(3) Power for Multiple Predictors (Simulation) — Monte Carlo: simulates datasets under assumed odds ratios and predictor correlation, refits the model repeatedly, and reports the proportion of replications where the tested coefficient reaches significance. '
        + 'When launched from a fitted model, the "Model detected" card auto-fills N, events, predictors, prevalence, and odds ratio.',
      'logistic-correlations': 'Inspect quick correlation-style screening indicators before deeper model interpretation.',
      'power-sbMeans':
        'Standalone power calculator for a two-means comparison (t-test). Switch between Compute Power (given N) and Required N (given target power) in the sidebar, set effect size (Cohen\u2019s d), α, and tails, then read achieved power or required sample size and the power curve.',
      'power-sbAnova':
        'Standalone power calculator for a one-way ANOVA. Switch between Compute Power and Required N modes, set the effect size (Cohen\u2019s f or η²), number of groups, and α, then read achieved power or required total N and the power curve (noncentral F).',
      'power-sbCorr':
        'Standalone power calculator for a correlation test. Set the expected correlation r, α, and tails, then read achieved power at a given N or the N required for target power.',
      'power-sbProp':
        'Standalone power calculator for a proportions comparison. Set the two expected proportions and α, then read achieved power at given group sizes or the N required for target power.',
      'power-sbReg':
        'Standalone power calculator for multiple regression. Set R² (or f²), the number of predictors, and α, then read achieved power at a given N or the N required for target power.',
      'factor-suitability':
        'Read the evidence-driven verdict banner, KMO, Bartlett, determinant, correlation heatmap (Avg |r|), MSA summary bars, suggested refinement panel, and optional Optimize Variables path. Explain whether factor analysis is appropriate and which variables to remove — use exact MSA and KMO values.',
      'factor-extraction': 'Review eigenvalues, variance explained, communalities, and extraction choice.',
      'factor-rotation': 'Apply rotation (Varimax, Promax, etc.) and inspect rotated loadings for simple structure.',
      'factor-diagnostics': 'Check residuals, model fit, cross-loadings, and problematic variables.',
      'factor-scores': 'Read estimated factor scores per case + their summary statistics. Use this view to inspect score distributions, between-factor correlations of scores, and any saved-score export options.',
      'factor-ai': 'Read an AI-assisted narrative summary of the factor solution: extraction quality, factor labels, and reporting suggestions. Use this view to draft the write-up, not to make extraction decisions.',
      'factor-viewdata': 'Inspect the raw data window used for the analysis (rows, columns, missingness). Use this view to verify the input rather than interpret factors.',
      'pca-summary': 'Review sample adequacy, total variance, and the high-level component solution.',
      'pca-components': 'Use scree/eigenvalue views to judge how many components are worth retaining.',
      'pca-interpretation': 'Interpret the component solution: rotation choice (varimax, promax, etc.), loading matrix, communalities, Φ matrix, variable contributions, and simple-structure diagnostics. Use this view to decide what each component means.',
      'pca-scores': 'Read the biplot, score plot, and case-wise score table together: variables and observations in component space, clusters, gradients, and unusual cases.',
      'pca-diagnostics': 'Use the distance-in-PC-space plot to flag observations that sit far from the centre of the retained component space.',
      'anova-overview': 'Review model setup, group structure, alpha, and high-level conclusion.',
      'anova-inference': 'Read omnibus statistics, p-values, degrees of freedom, and variance decomposition.',
      'anova-comparisons': 'Inspect post-hoc contrasts and correction methods to locate group differences.',
      'anova-diagnostics': 'Check residual assumptions, variance homogeneity, and influential patterns.',
      'anova-visuals': 'Use group plots to compare means, spread, intervals, and outliers visually.',
      'anova-report': 'Use report wording to verify the statistical story is coherent and complete.',

      // Regression — workspace sub-views (chart-aware so the AI explanation
      // matches what the user actually sees, not the coefficients table).
      'regression-results-overview':
        'Read the conclusion card, KPI strip (R^2, Adj R^2, F-test p, RMSE, n), and headline interpretation. Use this view to decide whether the model is worth reporting before drilling into individual coefficients.',
      'regression-results-detail':
        'Read the coefficients table (estimate, SE, t, p, 95% CI), ANOVA decomposition, and inference details. Use this view to interpret each predictor numerically once the overall model is supported.',
      'regression-pred-overview':
        'Inspect observed-vs-predicted, residual scatter, and overall fit quality (RMSE / MAE / R^2). Use this view to judge how well the model reproduces the sample, not which predictors matter.',
      'regression-pred-scenario':
        'Use the what-if sliders/inputs to generate a single point prediction with confidence and prediction intervals. Reset to means returns a baseline scenario.',
      'regression-viz-partial':
        'Each small chart shows the partial effect of one predictor on the outcome with the others held at their means. The axes are on the original scale of the outcome and predictor; the slope is the predictor coefficient. Read steeper / flatter lines and the spread of points around them — not standard errors or p-values.',
      'regression-viz-unique':
        'Each small chart is a partial regression (added-variable) plot: the x-axis shows the predictor after removing the linear influence of all other predictors (e(x | others)), and the y-axis shows the outcome with the same adjustment (e(y | others)). The slope is exactly the multiple-regression coefficient for that predictor. Read whether the line is clearly tilted (unique contribution), whether it is flat (no effect after controlling), and whether points hug the line tightly or scatter widely (how much remains unexplained).',
      'regression-diag-overview':
        'Read the assumption verdict strip, the residual histogram with normal overlay, and the high-level test summary. Use this view to decide if the model is trustworthy before interpreting coefficients.',
      'regression-diag-plots':
        'Inspect QQ plot, residuals vs fitted, scale-location, and leverage panels for pattern, spread, and tails. Use this view to localise where assumption violations come from.',
      'regression-diag-influence':
        'Read Cook\'s distance per observation against the 0.5 / 1.0 thresholds and the flagged-observations table. Use this view to identify single points that move the coefficients disproportionately.',
      'regression-ix-summary':
        'Read interaction interpretation cards and the simple-slopes summary. Use this view to understand whether and how a moderator changes the effect of the focal predictor.',
      'regression-ix-viz':
        'Inspect the interaction plot — fitted lines for representative moderator levels with the focal predictor on the x-axis. Diverging lines indicate a stronger moderation; parallel lines indicate weak/no moderation.',
      'regression-ix-details':
        'Read interaction coefficients, delta-R^2 for the interaction term, and any coding notes. Use this view for the technical write-up.',
      'regression-ancova-results':
        'Read the KPI strip, model formula, ANCOVA Type III table, and the auto-generated key finding. Use this view to report group differences after controlling for covariates.',
      'regression-ancova-assumptions':
        'Read the homogeneity-of-slopes verdict and the residual-diagnostic mini charts (histogram, QQ, residuals vs fitted). Use this view to decide if the ANCOVA result is trustworthy.',
      'regression-ancova-viz':
        'Read the adjusted means, the adjusted mean difference (when there are two levels), the means-with-CI dot plot, and the group regression-lines chart. Parallel lines support homogeneity of slopes; diverging lines suggest a Factor x Covariate interaction.',

      // Logistic — workspace sub-views (each describes the actual chart/table
      // shown, not a generic "logistic regression" overview).
      'logistic-model-results-overview':
        'Read the headline conclusion (model converged? overall significant?), the discrimination band (AUC), and a one-line summary of the strongest effect. Use this view to decide whether the logistic model is worth interpreting in detail.',
      'logistic-model-results-technical':
        'Read the coefficient table on the log-odds scale, plus odds ratios with 95% CI, Wald z, p, and the omnibus likelihood-ratio chi-square. Use this view to interpret each predictor numerically.',
      'logistic-predictive-performance-overview':
        'Read accuracy, sensitivity, specificity, PPV, NPV, and the confusion matrix at the chosen cutoff. Use this view to judge classification quality at the operating threshold, not separation.',
      'logistic-predictive-performance-roc-thresholds':
        'The ROC curve plots sensitivity (true positive rate) against 1 - specificity across all possible cutoffs. AUC summarises overall discrimination (0.5 = chance, 1.0 = perfect). Use the threshold slider to read sensitivity / specificity / Youden\'s J at any cutoff and pick an operating point.',
      'logistic-predictive-performance-calibration':
        'A calibration plot bins observations by predicted probability and plots the observed event rate per bin against the predicted rate. The 45-degree dashed line is perfect calibration; systematic deviation above means under-prediction and below means over-prediction. Read curvature, not single points.',
      'logistic-probabilities-overview':
        'Read the distribution of predicted probabilities for the fitted model, optionally split by the observed outcome. Use this view to spot bimodality (good separation), pile-up near 0.5 (poor separation), or extreme probabilities (possible separation issues).',
      'logistic-probabilities-scenario-engine':
        'Adjust the predictor sliders / inputs to generate the predicted probability for one synthetic case, with its odds and log-odds. Use this view to communicate "if the predictor changes by X, the probability becomes Y" to a non-technical audience.',
      'logistic-probabilities-risk-profiles':
        'Compare predicted probabilities across user-defined subgroups or covariate strata. Read whether the absolute risk gap between profiles is clinically meaningful, not only whether the predictor is statistically significant.',
      'logistic-interactions-overview':
        'Read the interpretation cards and simple-slopes summary for each Predictor x Moderator term. Use this view to understand whether and how a moderator changes the effect of the focal predictor on the log-odds.',
      'logistic-interactions-visualization':
        'Inspect the interaction plot — predicted probability curves at representative moderator levels with the focal predictor on the x-axis. Diverging curves indicate stronger moderation; parallel curves indicate weak/no moderation. Read the spread on the probability scale, not just the log-odds.',
      'logistic-interactions-technical':
        'Read interaction coefficients on the log-odds scale, the likelihood-ratio test for the interaction term, and any coding notes. Use this view for the technical write-up.',
      'logistic-diagnostics-overview':
        'Read the assumption verdict (separation, multicollinearity, sample size per cell), and the high-level health summary. Use this view to flag warnings before trusting coefficients or probabilities.',
      'logistic-diagnostics-residuals':
        'Inspect deviance and Pearson residuals, optionally stratified by predicted probability bins. Patterns (curvature, large residuals at the extremes) suggest mis-specification rather than random noise.',
      'logistic-diagnostics-influence':
        'Read Cook\'s distance, leverage, and DFBETAS per observation against the usual thresholds. Use this view to identify single points that move the coefficients disproportionately and flag them in the table.',

      // Cluster (K-means / Hierarchical) — the Separation & Map views get the
      // most elaborate docs because they carry the visual separation story.
      'cluster-km-overview':
        'Read the analysis summary (variables, cases, excluded rows, distance metric, k, standardisation), the Cluster quality panel (convergence, iterations, WCSS, between-cluster SS, explained variance, average silhouette), the generated verdict (an automatic interpretation combining silhouette strength, explained variance, and size balance), and the Cluster summary table (size, share, dominant profile per cluster). Use this view to judge whether the solution is trustworthy before exploring the clusters.',
      'cluster-km-sizes':
        'Read the bar chart of cluster sizes with percentage labels and the Assignments table listing which cluster each case belongs to. Use this view to spot degenerate solutions (one giant cluster, or tiny clusters that may be outlier groups) and to trace individual cases back to the worksheet.',
      'cluster-km-profiles':
        'Read the profile line chart (one line per cluster across all variables) together with the centers table below it. The Standardised / Raw means toggle switches BOTH: standardised shows mean z-scores (comparable across variables, colour-coded by sign), raw shows original units (comparable to SPSS Final Cluster Centers). The Original order / By separation toggle reorders variables by discriminatory power — the spread of cluster means — so the variables that most distinguish the clusters come first. Use this view to characterise what each cluster IS — which variables it sits high or low on.',
      'cluster-km-map':
        'This page combines the two separation views. TOP — the cluster map: every case is a dot coloured by its assigned cluster, with larger semi-transparent markers at each cluster center. In PCA (auto) mode the axes are the first two principal components of the analysis matrix (the flattest 2-D view of the full variable space; the axis percentages are each component\u2019s share of total variance — a very dominant PC1 usually means unstandardised variables). In Variables mode any two original variables form the axes in raw units. The Center trails checkbox (PCA view) overlays each center\u2019s dashed walk from its random starting seed to its final position. Drag to zoom; click legend entries to isolate clusters. BOTTOM — the centroid-distance heatmap: pairwise distances between cluster centers in the setup metric, shaded on a blue scale where deeper blue means farther apart (better separated) and the palest cells are the closest, least-distinct pairs. Read the two together: a pale heatmap cell names the suspicious pair, and the map shows whether those clusters actually intermingle or are merely adjacent.',
      'cluster-km-diagnostics':
        'Read convergence (converged flag, iterations, WCSS), the variance decomposition (total / within / between SS and explained variance), the convergence-process chart (WCSS line falling and flattening per iteration, columns counting cases reassigned each round and reaching zero at convergence), and the per-cluster silhouette table with plain-language readings. Use this view to quantify solution quality: silhouette above ~0.5 is solid structure, below ~0.25 is weak; low explained variance means clusters capture little of the data\u2019s spread; a WCSS curve still sloping at the last iteration explains a non-converged flag.',
      'cluster-hi-overview':
        'Read the analysis summary (variables, cases, distance metric, linkage, k, standardisation), the Cluster quality panel (explained variance, average silhouette), the verdict, and the Cluster summary table. Use this view to judge whether the hierarchical solution is trustworthy before exploring the tree.',
      'cluster-hi-dendrogram':
        'Read the dendrogram: leaves are cases, and each join shows the distance (height) at which two groups merge. Long vertical gaps before a merge indicate well-separated groups; cutting the tree where gaps are largest suggests a natural k. The dashed cut line is INTERACTIVE: dragging it up or down previews how many clusters each level yields, and the Apply button re-runs the whole module at that k, refreshing every page. Use this view to judge whether the chosen k respects the tree structure and to explore alternative cuts.',
      'cluster-hi-clusters':
        'Read cluster sizes at the chosen cut, the quality stats (WCSS, between-cluster SS, explained variance, average silhouette, and the cophenetic correlation — how faithfully the dendrogram preserves the original pairwise distances, with values above ~0.75 indicating a good fit), the Suggested k panel (candidate k values scored by the largest linkage jump; pills re-run the module at that k when clicked), the merge-distance progression chart (merge height over the final merges with the cut at k marked — a sharp jump right of the marker means the cut stopped before forcing genuinely different clusters together, while a smooth rise with no jump suggests weak structure), the per-cluster silhouette table with plain-language readings, the merge-steps table, and case assignments. Use this view to judge whether the chosen k respects the tree structure and to understand the composition of each cluster.',
      'cluster-hi-profiles':
        'Read the profile line chart (one line per cluster at the chosen cut) with the centroid table below it. The Standardised / Raw means toggle switches both together: standardised shows mean z-scores colour-coded by sign, raw shows original units. The Original order / By separation toggle reorders variables by discriminatory power, putting the most cluster-separating variables first. Use this view to characterise what each hierarchical cluster represents.',
      'cluster-hi-map':
        'This page combines the two separation views for the hierarchical solution at the chosen cut. TOP — the cluster map: each dot is a case coloured by its cluster, with larger semi-transparent markers at the centroids (mean vectors). PCA (auto) projects all variables onto the two directions preserving the most variance (axis percentages = share of variance; a dominant PC1 usually signals unstandardised inputs); Variables mode plots any two raw variables instead. The Merge trails checkbox overlays the hierarchy above the cut: dashed amber connectors run from each pair of clusters to the centroid of their union, in the order the tree would merge them next — short connectors flag pairs that are nearly one group (what a smaller k would fuse), long connectors mean the cut separates genuinely distant groups. Drag to zoom; click legend entries to isolate clusters. BOTTOM — the centroid-distance heatmap: pairwise distances between centroids on a blue scale, deeper blue meaning farther apart (better separated) and the palest cells marking the closest, least-distinct pairs. Read them together — a pale cell names the weakest pair, the map shows whether their members truly overlap — and cross-check ambiguous cases against the dendrogram\u2019s merge heights.'
    };
    return docs[key] || `This ${moduleName} ${label} view summarizes the active analysis section. Use the visible controls, tables, and plots to understand the current model state and diagnostics.`;
  },

  _collectGenericInsightSnapshot() {
    const activePanel = document.querySelector('.tab-panel.active, .tab-content.active, .panel.active, section.active') ||
      document.querySelector('.right-col .view-container') ||
      document.querySelector('.right-col') ||
      document.body;
    const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();
    const visibleText = clean(activePanel?.innerText || '').slice(0, 2600);
    const controls = Array.from((activePanel || document).querySelectorAll('button, select, input[type="radio"], input[type="checkbox"], input[type="range"]'))
      .map((el) => clean(el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || el.id || el.name || el.value))
      .filter(Boolean)
      .slice(0, 18);
    let payload = null;
    if (typeof window.buildAIPayload === 'function') {
      try { payload = window.buildAIPayload(); } catch (_) { payload = null; }
    }
    return {
      visibleText,
      controls,
      payload: payload ? JSON.stringify(payload).slice(0, 2200) : ''
    };
  },

  _buildGenericInsightGuidePrompt(viewKey) {
    const label = this._getInsightGuideLabel();
    const moduleName = this._getModuleDisplayName();
    const controlsDoc = this._genericModuleControlsDoc(viewKey);
    const snapshot = this._collectGenericInsightSnapshot();
    this._lastAiMeta = { primarySignal: `${moduleName} - ${label}` };

    // Some module sub-views are chart-driven (partial regression, ROC,
    // calibration, residual diagnostics, interaction plots, scenario
    // sliders, etc.). Without a guardrail the LLM tends to fall back to
    // "coefficient + standard error + p-value" boilerplate from the
    // coefficients table. Inject a per-view nudge that names the chart
    // and tells the model to describe the visual structure, not the
    // numeric estimate cards from a different view.
    const POWER_PLANNING_GUARD =
      'This is a power & sample-size PLANNING tool, not a results table: metric cards (Achieved Power, sample size, effect size), 80/90/95% target-power chips, a power-vs-N curve, and a collapsible Technicals panel. '
      + 'Explain achieved power vs required N, how the target chips and the power curve are read, and what the smallest detectable effect means. '
      + 'Do not interpret the module\u2019s test results, coefficients, or p-values here — only the power planning question.';

    const chartGuards = {
      'regression-viz-partial':
        'Each small chart shows how the predicted outcome changes as a single predictor changes, with the others held at their means. Describe slopes and the spread of points around them, not coefficients / SE / p-values.',
      'regression-viz-unique':
        'Axes are residualised: e(x | others) on x and e(y | others) on y. The slope of the fitted line equals the predictor\'s multiple-regression coefficient. Describe slopes and scatter, not coefficients / SE / p-values.',
      'regression-pred-overview':
        'This is an observed-vs-predicted scatter with overall fit metrics (RMSE, MAE, R^2). Describe the diagonal alignment, scatter, and any systematic curvature — not coefficient values.',
      'regression-pred-scenario':
        'This is an interactive what-if tool with sliders/inputs that emit one prediction with confidence and prediction intervals. Describe how the controls move the prediction, not what the coefficients table says.',
      'regression-diag-plots':
        'These are residual diagnostic charts (QQ, residuals vs fitted, scale-location, leverage). Describe pattern, spread, and tail behaviour — not estimate values.',
      'regression-diag-influence':
        'This is a Cook\'s distance bar chart with the 0.5 / 1.0 thresholds and a flagged-observations table. Describe the per-observation pattern and the flagged rows, not coefficient inference.',
      'regression-ix-viz':
        'This is an interaction plot with predicted lines at representative moderator levels. Describe whether the lines diverge, are parallel, or cross — not the coefficient table.',
      'regression-ancova-viz':
        'This view shows adjusted means with CI, an adjusted mean difference, and group regression lines. Describe the visual story (parallelism, gap between groups) — not coefficient values.',
      'logistic-predictive-performance-roc-thresholds':
        'This is an ROC curve with a threshold slider. Describe the curve shape, AUC band, and the trade-off the slider exposes — not coefficient inference.',
      'logistic-predictive-performance-calibration':
        'This is a calibration plot of observed vs predicted probability per bin. Describe deviation from the 45-degree line, not coefficient inference.',
      'logistic-probabilities-overview':
        'This is a histogram / density of predicted probabilities, often split by outcome. Describe separation, bimodality, or pile-up — not coefficients.',
      'logistic-probabilities-scenario-engine':
        'This is an interactive predictor-input panel that emits a single probability + odds. Describe how the controls move the probability, not the coefficient table.',
      'logistic-probabilities-risk-profiles':
        'This compares predicted probabilities across subgroups / covariate strata. Describe absolute risk gaps, not coefficient inference.',
      'logistic-interactions-visualization':
        'This is an interaction plot of predicted probability at representative moderator levels. Describe diverging vs parallel curves on the probability scale, not coefficient inference.',
      'logistic-diagnostics-residuals':
        'These are deviance/Pearson residual plots, often by probability bin. Describe pattern, large residuals, and curvature — not coefficient values.',
      'logistic-diagnostics-influence':
        'This is per-observation Cook\'s distance + leverage + DFBETAS with thresholds. Describe flagged points and the influence pattern, not coefficient inference.',
      'logistic-power':
        'This is a planning tool with a Method dropdown (EPV Assessment, Power for One Predictor, Power for Multiple Predictors via simulation), an input panel, a results card, and an interpretation panel. '
        + 'Explain clearly what each of the three methods computes and when to prefer each. '
        + 'Explicitly explain why EPV Assessment shows NO power percentage: it is a rule-of-thumb adequacy check (events per predictor vs a 10-15 target) for coefficient stability — it involves no effect size, no alpha, and no hypothesis test, so a power term is undefined for it; formal power appears only in the other two methods. '
        + 'Do not describe fitted-model coefficients or classification metrics — those belong to other views.',
      'cluster-km-map':
        'This is a two-part visual page: an interactive scatter (cluster map) with a PCA/Variables axis toggle, plus a centroid-distance heatmap below it. '
        + 'Describe the visual separation story: tightness of same-coloured groups, gaps or overlap between clusters, where the centers sit, what the PCA axis percentages imply, and which heatmap pairs are palest (closest — deeper blue means farther apart). '
        + 'Do not recite WCSS / silhouette / iteration numbers here — those belong to the Diagnostics view.',
      'cluster-hi-map':
        'This is a two-part visual page for the hierarchical cut: an interactive scatter (cluster map) with a PCA/Variables axis toggle and an optional Merge trails overlay (dashed connectors showing which clusters the tree would merge next), plus a centroid-distance heatmap below it. '
        + 'Describe the visual separation story: cohesion and overlap of the coloured groups, centroid positions, what the PCA axis percentages imply, and which centroid pairs the heatmap flags as closest (palest cells — deeper blue means farther apart). '
        + 'Do not recite merge-step or silhouette numbers here — those belong to the Clusters and Diagnostics views.',
      'cluster-hi-dendrogram':
        'This is a dendrogram (merge tree) with a draggable cut line the user can apply to re-run at a new k. Describe merge heights, long stems, and where cutting the tree gives well-separated groups — and, if the current cut looks suboptimal, say where a better cut would fall — not numeric tables from other views.',
      'regression-power': POWER_PLANNING_GUARD,
      'anova-power': POWER_PLANNING_GUARD,
      'dependent-power': POWER_PLANNING_GUARD
        + ' If the analysis is nonparametric (e.g. Friedman), note that power is an approximation obtained by converting the rank effect (Kendall\u2019s W) to a parametric planning effect f.',
      'independent-power': POWER_PLANNING_GUARD,
      'mixed-model-power': POWER_PLANNING_GUARD
        + ' Emphasise that mixed-model power is planned in SUBJECTS, not total observations: ICC and measurements-per-subject determine the effective sample size, so adding subjects usually helps more than adding repeats.'
    };
    const chartGuard = chartGuards[viewKey];
    const partialPlotGuard = chartGuard
      ? `
THIS VIEW IS A CHART / INTERACTIVE TOOL — NOT A COEFFICIENTS TABLE
- ${chartGuard}
- Do NOT instruct the user to read coefficient values, standard errors, or p-values from this view; that information lives on the dedicated coefficients / model-results view.
- Do NOT suggest navigating to other views.
`
      : '';

    return `You are explaining the "${label}" view inside the ${moduleName} module of Statistico.

WHAT THIS VIEW DOES:
${controlsDoc}
${partialPlotGuard}
VISIBLE STATE FROM THE CURRENT VIEW:
${snapshot.visibleText || '(No visible text captured.)'}

VISIBLE CONTROLS:
${snapshot.controls.length ? snapshot.controls.map((c) => `- ${c}`).join('\n') : '(No visible controls captured.)'}

COMPUTED PAYLOAD WHEN AVAILABLE:
${snapshot.payload || '(No structured payload exposed by this page.)'}

YOUR TASK:
1. Explain what this specific view reveals.
2. Describe how to interact with the available controls or table/chart elements.
3. List the patterns a practitioner should look for in this view.
4. Give a brief reading of the current visible state without inventing values.

RULES:
- Keep the explanation specific to this active view, not the full module.
- Do not infer causality.
- If values are absent, describe what to inspect rather than inventing numbers.
- Keep each section concise and practical.

Reply ONLY in this exact format:
ABOUT: [2-3 sentences explaining what this view answers]
CONTROLS: [Control or interaction: what it does + when to use it] | [next control/interaction] | [next control/interaction]
PATTERNS: [Pattern description -> what it means analytically] | [next pattern] | [next pattern]
READING: [1-2 sentences about what the currently visible state suggests, using exact values only if present]`;
  },

  async _sbAiDependentKplusInterpret() {
    const sidebarBtn = document.getElementById('sbAiBtn');
    const setBusy = (busy) => {
      if (!sidebarBtn) return;
      sidebarBtn.disabled = busy;
      sidebarBtn.innerHTML = busy
        ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Generating...</span>'
        : '<i class="fa-solid fa-layer-group"></i><span>Full AI Analysis</span><sup class="sb-ai-sup">ALL</sup>';
    };
    if (typeof switchTab === 'function') switchTab('ai-interpretation');
    setBusy(true);
    try {
      if (typeof generateAIInterpretation === 'function') {
        await generateAIInterpretation();
      }
    } finally {
      setBusy(false);
    }
  },

  async _sbAiIndependentInterpret() {
    const sidebarBtn = document.getElementById('sbAiBtn');
    const floatBtn = document.getElementById('sbAiFloatBtn');
    const legacyBtn = document.getElementById('aiSummaryBtn');
    const setBusy = (busy) => {
      [sidebarBtn, legacyBtn].forEach((btn) => {
        if (!btn) return;
        btn.disabled = busy;
        btn.innerHTML = busy
          ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Generating...</span>'
          : '<i class="fa-solid fa-layer-group"></i><span>Full AI Analysis</span><sup class="sb-ai-sup">ALL</sup>';
      });
      if (floatBtn) floatBtn.disabled = busy;
    };
    setBusy(true);
    try {
      this._lastAiMeta = null;
      const payload = this._getIndependentAiPayload();
      const browsedViews = this._independentFullAnalysisViews(payload);
      for (let i = 0; i < browsedViews.length; i += 1) {
        const label = browsedViews[i];
        [sidebarBtn, legacyBtn].forEach((btn) => {
          if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>${i + 1}/${browsedViews.length} - ${label}</span>`;
        });
        await new Promise((resolve) => setTimeout(resolve, 90));
      }
      [sidebarBtn, legacyBtn].forEach((btn) => {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-brain fa-spin"></i><span>Synthesizing all views...</span>';
      });
      const prompt = this._buildIndependentStructuredPrompt(payload);
      if (!prompt) { this._showAiOverlay(null, this.currentView, 'full'); return; }
      const raw = await this._callAiForSidebar(prompt);
      const sections = this._parseAiStructured(raw);
      this._showAiOverlay(sections, this.currentView, 'full', this._lastAiMeta);
    } catch (err) {
      this._showAiOverlay({ error: err.message || 'AI request failed.' }, this.currentView, 'full', this._lastAiMeta);
    } finally {
      setBusy(false);
    }
  },

  async _sbAiIndependentTabInterpret() {
    const btn = document.getElementById('sbAiFloatBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Explaining view...</span>';
    }
    try {
      this._lastAiMeta = null;
      const payload = this._getIndependentAiPayload();
      const activeTab = this._getIndependentActiveTab();
      const prompt = this._buildIndependentTabPrompt(payload, activeTab);
      if (!prompt) { this._showAiOverlay(null, `independent-${activeTab}`, 'per-view'); return; }
      const raw = await this._callAiForSidebar(prompt);
      const sections = this._parseAiStructured(raw);
      this._showAiOverlay(sections, `independent-${activeTab}`, 'per-view', this._lastAiMeta);
    } catch (err) {
      const activeTab = this._getIndependentActiveTab();
      this._showAiOverlay({ error: err.message || 'AI request failed.' }, `independent-${activeTab}`, 'per-view', this._lastAiMeta);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-compass"></i><span>Explain View</span><sup class="sb-ai-sup">AI</sup>';
      }
    }
  },

  _independentViewLabels() {
    return {
      'independent-setup': 'Setup',
      'independent-explore': 'Descriptives',
      'independent-assumptions': 'Assumptions',
      'independent-results': 'Test Results',
      'independent-posthoc': 'Pairwise Comparisons',
      'independent-effects': 'Effect Sizes',
      'independent-power': 'Power Analysis'
    };
  },

  _getIndependentActiveTab() {
    const panel = document.querySelector('.tab-panel.active[id^="tab-"]');
    return panel?.id?.replace(/^tab-/, '') || 'results';
  },

  _independentFullAnalysisViews(payload) {
    const hasPosthoc = !!(payload?.posthoc?.available || payload?.posthoc?.rows?.length);
    const hasPower = payload?.power?.available !== false;
    return [
      'Setup',
      'Descriptives',
      'Assumptions',
      'Test Results',
      ...(hasPosthoc ? ['Pairwise Comparisons'] : []),
      'Effect Sizes',
      ...(hasPower ? ['Power Analysis'] : [])
    ];
  },

  _getIndependentAiPayload() {
    if (typeof window.buildAIPayload !== 'function') return null;
    try {
      return window.buildAIPayload();
    } catch (err) {
      console.error('Failed to build independent AI payload:', err);
      return null;
    }
  },

  _compactIndependentAiPayload(payload) {
    const compact = JSON.parse(JSON.stringify(payload || {}));
    if (compact.groups?.variables?.length > 12) {
      compact.groups.variables = compact.groups.variables.slice(0, 12);
      compact.groups.variablesTruncated = true;
    }
    if (compact.posthoc?.rows?.length > 20) {
      compact.posthoc.totalRows = compact.posthoc.rows.length;
      compact.posthoc.rows = compact.posthoc.rows.slice(0, 20);
      compact.posthoc.rowsTruncated = true;
    }
    return compact;
  },

  _independentPrimarySignal(payload) {
    if (!payload) return '';
    const f = (value, digits = 3) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : 'N/A';
    const compareMode = payload.design?.compareMode || '';
    const designMode = compareMode === 'k-plus' || Number(payload.design?.k) > 2 || (payload.groups?.variables?.length || 0) > 2
      ? 'k-plus'
      : 'two-group';
    if (designMode === 'k-plus') {
      const primary = payload.results?.decision?.primary || {};
      const effect = payload.effects?.kplus || {};
      const effectValue = effect.eta2 ?? effect.omega2 ?? effect.epsilon2;
      const effectLabel = effect.eta2 !== undefined ? 'eta2' : effect.omega2 !== undefined ? 'omega2' : 'epsilon2';
      return `${payload.design?.k || payload.groups?.variables?.length || 'K'} groups · ${primary.test || 'primary test'} p=${f(primary.p, 4)} · ${effectLabel}=${f(effectValue)}`;
    }
    const framework = payload.design?.primaryFramework || payload.setup?.framework || 'primary';
    const p = framework === 'nonparametric'
      ? payload.results?.nonparametric?.mannWhitneyU?.p
      : payload.results?.parametric?.welch?.p ?? payload.results?.parametric?.student?.p;
    const effect = payload.effects?.hedgesG ?? payload.effects?.cliffsDelta ?? payload.effects?.rankBiserial;
    return `2 groups · ${framework} p=${f(p, 4)} · effect=${f(effect)}`;
  },

  _buildIndependentStructuredPrompt(payload) {
    if (!payload) return null;
    const compact = this._compactIndependentAiPayload(payload);
    const primarySignal = this._independentPrimarySignal(payload);
    const viewsBrowsed = this._independentFullAnalysisViews(payload);
    this._lastAiMeta = {
      primarySignal,
      viewsBrowsed,
      strengthLevel: null,
      strengthNote: null
    };

    return `You are interpreting a Statistico Independent Means analysis from pre-computed results.

Do not recompute any statistic. Use only the values in the JSON. Be conservative: independent group comparisons do not imply causality.
If a field is null or unavailable, do not invent it. If assumptions are mixed, say that interpretation depends on the robust/nonparametric result.

Primary signal: ${primarySignal || 'available in JSON'}
Views browsed for this full analysis: ${viewsBrowsed.join(', ')}

Computed independent-means payload:
${JSON.stringify(compact, null, 2)}

Reply ONLY in this exact format:
CONCLUSION: [One decisive sentence - the single most important independent-means finding]
EVIDENCE: [specific group or test finding with number] | [specific assumption or robustness finding] | [specific effect-size or post-hoc finding] | [specific sample/design finding]
INTERPRETATION: [3 sentences - unified synthesis in plain language, no causality claims]
IMPLICATIONS: [analytical implication 1] | [analytical implication 2] | [analytical implication 3]
ACTION: [conditional next step 1] | [conditional next step 2] | [conditional next step 3]
STRENGTH: [High, Moderate, or Low - short reason based on p-values, effect size, assumptions, and sample balance]`;
  },

  _buildIndependentTabPrompt(payload, tab) {
    if (!payload) return null;
    const compact = this._compactIndependentAiPayload(payload);
    const labels = this._independentViewLabels();
    const label = labels[`independent-${tab}`] || 'Current Tab';
    const focusMap = {
      setup: 'analysis design, selected framework, alpha, confidence, and comparison setup',
      explore: 'group descriptives, sample sizes, balance, means, medians, spread, and missingness',
      assumptions: 'normality, homogeneity, recommendation, and whether the selected framework is robust',
      results: 'primary parametric/nonparametric test result, p-value, confidence interval, and decision',
      posthoc: 'pairwise post-hoc comparisons, correction method, and which groups differ',
      effects: 'effect sizes and practical magnitude, not only statistical significance',
      power: 'power & sample-size PLANNING: achieved power at the current group sizes, the N required for the 80/90/95% target-power chips, the smallest detectable effect (Cohen\u2019s d / f), and how the power-vs-N curve is read — do not reinterpret the test result or p-values here',
      report: 'publication-ready interpretation and consistency across reported results'
    };

    this._lastAiMeta = {
      primarySignal: `${label} tab`,
      strengthLevel: null,
      strengthNote: null
    };

    return `You are interpreting only the active "${label}" tab of a Statistico Independent Means analysis.

Focus on: ${focusMap[tab] || focusMap.results}.
Use the JSON only as supporting computed data. Do not turn this into the full all-tabs analysis; keep it local to this tab.
Do not infer causality. If a value is null or unavailable, say it is not available.

Computed independent-means payload:
${JSON.stringify(compact, null, 2)}

Reply ONLY in this exact format:
ABOUT: [2-3 sentences explaining what this view answers]
CONTROLS: [Control or interaction: what it does + when to use it] | [next control/interaction] | [next control/interaction]
PATTERNS: [Pattern description -> what it means analytically] | [next pattern] | [next pattern]
READING: [1-2 sentences about what the current tab shows, using exact values where available]`;
  },

  /**
   * Per-view AI: explains the current chart/analysis in a structured format.
   */
  async _sbAiPerViewInterpret() {
    const btn = document.getElementById('sbAiFloatBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Explaining view...</span>';
    }
    const viewKey = this._getInsightGuideViewKey();
    try {
      let prompt;
      if (this.module === 'factor' && viewKey === 'factor-suitability' &&
          typeof window.buildFactorSuitabilityAiPrompt === 'function') {
        prompt = window.buildFactorSuitabilityAiPrompt();
      } else {
        prompt = this.module === 'correlations'
          ? this._buildCorrelationStructuredPrompt(this.currentView, 'per-view')
          : this.module === 'univariate'
            ? this._buildStructuredPrompt(viewKey, 'per-view')
            : this._buildGenericInsightGuidePrompt(viewKey);
      }
      if (!prompt) { this._showAiOverlay(null, viewKey); return; }
      const raw = await this._callAiForSidebar(prompt);
      const sections = this._parseAiStructured(raw);
      this._showAiOverlay(sections, viewKey, 'per-view', this._lastAiMeta);
    } catch (err) {
      this._showAiOverlay({ error: err.message || 'AI request failed.' }, viewKey, 'per-view', this._lastAiMeta);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-compass"></i><span>Explain View</span><sup class="sb-ai-sup">AI</sup>';
      }
    }
  },

  /**
   * Full-analysis AI: sweeps all 9 views via hidden iframes, aggregates their
   * real computed data, then synthesises into one diagnostic report.
   */
  async _sbAiGlobalInterpret() {
    const btn = document.getElementById('sbAiBtn');

    const setLabel = (html) => {
      if (btn) btn.innerHTML = html;
    };

    if (btn) btn.disabled = true;
    setLabel(`<i class="fa-solid fa-spinner fa-spin"></i><span>${this.module === 'correlations' ? 'Collecting views…' : 'Loading views…'}</span>`);

    try {
      const allData = this.module === 'correlations'
        ? this._collectAllCorrelationViewsData()
        : await this._collectAllViewsViaIframes((done, total, label) => {
            setLabel(`<i class="fa-solid fa-spinner fa-spin"></i><span>${done}/${total} — ${label}</span>`);
          });

      setLabel('<i class="fa-solid fa-brain fa-spin"></i><span>Thinking…</span>');

      const prompt = this.module === 'correlations'
        ? this._buildCorrelationStructuredPrompt(this.currentView, 'full', allData)
        : this._buildStructuredPrompt(
            (this.module === 'univariate' && this.currentView === 'by-group')
              ? this._getInsightGuideViewKey()
              : this.currentView,
            'full',
            allData
          );
      if (!prompt) { this._showAiOverlay(null, this.currentView, 'full'); return; }

      const raw = await this._callAiForSidebar(prompt);
      const sections = this._parseAiStructured(raw);
      this._showAiOverlay(sections, this.currentView, 'full');
    } catch (err) {
      this._showAiOverlay({ error: err.message || 'AI request failed.' }, this.currentView, 'full');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-brain"></i><span>Full Analysis</span><sup class="sb-ai-sup">AI</sup>';
      }
    }
  },

  // ── Data helpers ─────────────────────────────────────────────────────────

  _getUnivariateDescriptives() {
    let parsed = null;
    try { const r = localStorage.getItem('univariateResults'); if (r) parsed = JSON.parse(r); } catch (_) {}
    if (!parsed) { try { const r = sessionStorage.getItem('univariateResults'); if (r) parsed = JSON.parse(r); } catch (_) {} }

    const coerce = (arr) => {
      if (!Array.isArray(arr)) return [];
      const src = Array.isArray(arr[0]) ? arr.map((r) => (Array.isArray(r) ? r[0] : r)) : arr;
      return src.map((v) => (v === null || v === undefined || v === '' ? null : Number(v))).filter((v) => v === null || Number.isFinite(v));
    };
    const values = (parsed
      ? coerce(parsed.rawData || parsed.values || parsed.data?.rawData || parsed.data?.values || parsed.data || [])
      : coerce(window.currentDataArray || window.originalData || window.data || [])
    ).filter((v) => v !== null && Number.isFinite(v));

    if (!values.length) return null;

    const n    = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const sd   = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1));
    const srt  = [...values].sort((a, b) => a - b);
    const med  = srt[Math.floor(n * 0.5)];
    const q1   = srt[Math.floor(n * 0.25)];
    const q3   = srt[Math.floor(n * 0.75)];
    const iqr  = q3 - q1;
    let skew = null, kurt = null;
    if (n >= 3 && sd > 0) skew = (n / ((n - 1) * (n - 2))) * values.reduce((a, v) => a + ((v - mean) / sd) ** 3, 0);
    if (n >= 4 && sd > 0) kurt = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * values.reduce((a, v) => a + ((v - mean) / sd) ** 4, 0) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));

    const varName = (parsed && (parsed.column || parsed.variableName || parsed.variable || parsed.colName)) || this.variableName || 'Variable';
    const f = (v, dp = 3) => (v === null || !Number.isFinite(v)) ? 'N/A' : Number(v).toFixed(dp);

    return { n, varName, mean, sd, med, q1, q3, iqr, min: srt[0], max: srt[n-1], skew, kurt, f };
  },

  /**
   * Read live DOM / window values from the active view so the AI can
   * comment on the exact state the user sees (slider positions, results).
   */
  _collectViewData(view) {
    const el  = (id) => document.getElementById(id);
    const txt = (id) => { const e = el(id); return e ? (e.textContent || e.value || '').trim() : null; };
    const val = (id) => { const e = el(id); return e ? e.value : null; };
    const d   = {};

    if (view === 'histogram') {
      d.binMethod      = val('binningMethod');
      d.numBins        = val('numBins');
      d.showNormalCurve = el('showNormalCurve')?.checked ? 'yes' : 'no';
      d.leftTrunc      = val('leftTruncation');
      d.rightTrunc     = val('rightTruncation');
      d.remainingN     = txt('remainingN');
      d.mean           = txt('stat-mean');
      d.stddev         = txt('stat-stddev');
      d.skewness       = txt('stat-skewness');
      d.kurtosis       = txt('stat-kurtosis');
      d.min            = txt('stat-min');
      d.q25            = txt('stat-q25');
      d.median         = txt('stat-median');
      d.q75            = txt('stat-q75');
      d.max            = txt('stat-max');
    }

    if (view === 'kernel') {
      d.kernelType = val('kernelType');
      d.bandwidth  = val('bandwidth');
      d.mean       = txt('statMean');
      d.stddev     = txt('statStdDev');
      d.min        = txt('statMin');
      d.max        = txt('statMax');
    }

    if (view === 'cdf') {
      d.distributionOverlay = val('distribution-select') || 'none';
      d.q1     = txt('q1-value');
      d.median = txt('median-value');
      d.avg    = txt('avg-value');
      d.q3     = txt('q3-value');
      d.p95    = txt('p95-value');
      d.currentX  = txt('x-value');
      d.currentFx = txt('probability');
    }

    if (view === 'percentile') {
      d.percentileQueried = val('percentile-value') || val('percentile-slider');
      d.result = txt('arrow-text');
      const active = document.querySelector('.method-option.active, [data-method].active');
      d.method = active?.dataset?.method || null;
    }

    if (view === 'normality' && window.currentNormalityResults) {
      d.tests     = window.currentNormalityResults;
      d.passCount = txt('pass-count');
      d.failCount = txt('fail-count');
      d.alpha     = txt('significance');
    }

    if (view === 'outliers') {
      d.outlierSummary = txt('outlierCount');
      const mBtn = document.querySelector('.method-btn.active, [class*="method"][class*="active"]');
      d.method = mBtn?.textContent?.trim() || null;
    }

    if (view === 'confidence') {
      d.lcl          = txt('stat-lcl');
      d.center       = txt('stat-center');
      d.ucl          = txt('stat-ucl');
      d.confidenceLevel = txt('stat-confidence');
      d.method       = txt('stat-method');
      d.pointEstimate = txt('point-estimate');
      d.marginError  = txt('margin-error');
    }

    if (view === 'qqplot') {
      const qqRadio = document.querySelector('input[name="plotType"]:checked');
      d.plotType    = qqRadio?.value || 'qq';
      d.distribution = val('distributionSelect');
    }

    if (view === 'boxplot') {
      d.footerNote = txt('boxplot-footer');
    }

    if (view === 'by-group' || (typeof view === 'string' && view.startsWith('by-group-'))) {
      const ctx = globalThis.__byGroupAiContext;
      if (ctx) {
        d.variable = ctx.variable;
        d.groupingColumn = ctx.groupingColumn;
        d.activeTab = ctx.activeTab;
        d.groupCount = ctx.groupCount;
        d.totalRows = ctx.totalRows;
        d.groups = ctx.groups;
        d.normality = ctx.normality;
      }
    }

    return d;
  },

  /**
   * Write the current page's live in-memory data to localStorage so that
   * any iframe spawned for export or AI analysis picks up the correct data
   * rather than a stale or sample-data fallback.
   *
   * Priority: live window globals → DOM stat cells → existing localStorage.
   * If nothing is found, localStorage is left unchanged.
   */
  _syncLiveDataToStorage() {
    try {
      if (this.module === 'univariate' && this._persistActiveRowFilterPayload('univariate', 'univariateResults')) {
        return;
      }
      // 1. Try live in-memory arrays (set by individual view pages after data loads)
      const coerce = (arr) => {
        if (!Array.isArray(arr)) return [];
        const src = Array.isArray(arr[0]) ? arr.map((r) => (Array.isArray(r) ? r[0] : r)) : arr;
        return src.map((v) => (v === null || v === undefined || v === '' ? null : Number(v)))
                  .filter((v) => v === null || Number.isFinite(v));
      };

      const liveValues = coerce(
        window.currentDataArray || window.originalData || window.currentData || window.data || []
      ).filter((v) => v !== null && Number.isFinite(v));

      if (!liveValues.length) return;   // nothing to write — leave storage as-is

      // 2. Get variable name from the header or page globals
      const varName = this.variableName ||
        document.getElementById('headerVariableName')?.textContent?.trim() ||
        window.currentVariableName || 'Variable';

      // 3. Merge into existing stored object so we don't lose keys other views need
      let existing = {};
      try { const r = sessionStorage.getItem('univariateResults') || localStorage.getItem('univariateResults'); if (r) existing = JSON.parse(r); } catch (_) {}
      const {
        rowFilterActive: _rowFilterActive,
        columnFilters: _columnFilters,
        sourceRows: _sourceRows,
        usedRows: _usedRows,
        ...existingClean
      } = existing || {};

      const fresh = {
        ...existingClean,
        values:       liveValues,
        rawData:      liveValues,
        data:         liveValues,
        variableName: varName,
        column:       varName,
        colName:      varName,
        rowFilterActive: false,
        _syncedAt:    Date.now()
      };

      localStorage.setItem('univariateResults', JSON.stringify(fresh));
      try { sessionStorage.setItem('univariateResults', JSON.stringify(fresh)); } catch (_) {}
    } catch (_) {}
  },

  // ── Prompt builders ──────────────────────────────────────────────────────

  /**
   * Spin a hidden iframe for every non-hypothesis univariate view, wait for
   * the page to render its results (data loads from localStorage), extract
   * the key values, then resolve with the aggregated object.
   *
   * @param {Function} onProgress  - called with (completed, total, viewLabel)
   * @returns {Promise<Object>}    - same shape as _collectAllViewsData()
   */
  async _collectAllViewsViaIframes(onProgress) {
    const views = [
      { id: 'histogram',  url: 'univariate/histogram-standalone-v2.html'     },
      { id: 'boxplot',    url: 'univariate/boxplot-standalone.html'        },
      { id: 'cdf',        url: 'univariate/cumulative-distribution.html'   },
      { id: 'percentile', url: 'univariate/percentile-standalone.html'     },
      { id: 'kernel',     url: 'univariate/kernel-standalone.html'         },
      { id: 'outliers',   url: 'univariate/outliers-standalone.html'       },
      { id: 'normality',  url: 'univariate/normality-standalone.html'      },
      { id: 'qqplot',     url: 'univariate/qqplot-standalone.html'         },
      { id: 'confidence', url: 'univariate/confidence-standalone.html'     }
    ];
    const labels = {
      histogram:'Histogram', boxplot:'Box Plot & Outliers', cdf:'CDF', percentile:'Percentiles',
      kernel:'Kernel', outliers:'Outliers', normality:'Tests',
      qqplot:'PP/QQ', confidence:'Confidence Intervals', hypothesis:'One-Sample Test'
    };

    const total = views.length;
    let done = 0;
    const allData = {};

    // Ensure iframes see the current session's data, not a stale fallback
    this._syncLiveDataToStorage();

    // Read the live data payload once so all iframes get the same injection
    let liveData = null;
    try { const r = localStorage.getItem('univariateResults'); if (r) liveData = JSON.parse(r); } catch (_) {}

    // Run in parallel batches of 3 to keep it fast without hammering the browser
    const batchSize = 3;
    for (let i = 0; i < views.length; i += batchSize) {
      const batch = views.slice(i, i + batchSize);
      await Promise.all(batch.map(async (view) => {
        const url = this.resolveDialogUrl(view.url);
        const data = await this._captureViewDataFromIframe(url, view.id, liveData);
        if (data && Object.keys(data).length) allData[view.id] = data;
        done++;
        if (onProgress) onProgress(done, total, labels[view.id] || view.id);
      }));
    }

    return allData;
  },

  /**
   * Load one view URL in a hidden iframe, wait for results to render,
   * then extract the data values from its document / window.
   * Resolves with null on timeout or error.
   *
   * @param {string} url
   * @param {string} viewId
   * @returns {Promise<Object|null>}
   */
  _captureViewDataFromIframe(url, viewId, liveData) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-99999px;top:-99999px;width:1360px;height:900px;opacity:0;pointer-events:none;';
      iframe.setAttribute('aria-hidden', 'true');
      let settled = false;

      const finish = (data) => {
        if (settled) return;
        settled = true;
        try { iframe.remove(); } catch (_) {}
        resolve(data);
      };

      const tryExtract = (startedAt) => {
        try {
          const doc = iframe.contentDocument;
          const win = iframe.contentWindow;
          if (!doc || !win) return finish(null);

          // Wait until the results are visible or the page has had enough time
          const resultsReady = !!(
            doc.querySelector('.results-container.show, .main-content, .right-col') &&
            (doc.querySelector('svg, canvas, .highcharts-root, table') ||
             (Date.now() - startedAt) > 5000)
          );

          if (resultsReady || (Date.now() - startedAt) > 9000) {
            finish(this._extractViewDataFromIframe(doc, win, viewId));
          } else {
            setTimeout(() => tryExtract(startedAt), 300);
          }
        } catch (_) {
          finish(null);
        }
      };

      iframe.addEventListener('load', () => {
        // Inject live data to override any sample-data fallback loaded by the page
        try {
          if (liveData && typeof iframe.contentWindow.handleDataReceived === 'function') {
            iframe.contentWindow.handleDataReceived(liveData);
          }
        } catch (_) {}
        setTimeout(() => tryExtract(Date.now()), liveData ? 1800 : 800);
      }, { once: true });
      setTimeout(() => finish(null), 12000);   // hard cap per view

      iframe.src = url;
      document.body.appendChild(iframe);
    });
  },

  /**
   * Read DOM elements and window globals from an iframe's document/window.
   * Mirror of _collectViewData but operates on an external doc/win pair.
   */
  _extractViewDataFromIframe(doc, win, viewId) {
    const txt = (id) => { const e = doc.getElementById(id); return e ? (e.textContent || '').trim() || null : null; };
    const val = (id) => { const e = doc.getElementById(id); return e ? e.value || null : null; };
    const d   = {};

    if (viewId === 'histogram') {
      d.mean      = txt('stat-mean');
      d.stddev    = txt('stat-stddev');
      d.skewness  = txt('stat-skewness');
      d.kurtosis  = txt('stat-kurtosis');
      d.min       = txt('stat-min');
      d.q25       = txt('stat-q25');
      d.median    = txt('stat-median');
      d.q75       = txt('stat-q75');
      d.max       = txt('stat-max');
      d.binMethod = val('binningMethod');
      d.numBins   = val('numBins');
      d.remainingN = txt('remainingN');
      d.showNormalCurve = doc.getElementById('showNormalCurve')?.checked ? 'yes' : 'no';
    }

    if (viewId === 'kernel') {
      d.kernelType = val('kernelType');
      d.bandwidth  = val('bandwidth');
      d.mean       = txt('statMean');
      d.stddev     = txt('statStdDev');
      d.min        = txt('statMin');
      d.max        = txt('statMax');
    }

    if (viewId === 'cdf') {
      d.q1              = txt('q1-value');
      d.median          = txt('median-value');
      d.avg             = txt('avg-value');
      d.q3              = txt('q3-value');
      d.p95             = txt('p95-value');
      d.distributionOverlay = val('distribution-select') || 'none';
    }

    if (viewId === 'percentile') {
      d.percentileQueried = val('percentile-value') || val('percentile-slider');
      d.result   = txt('arrow-text');
      const active = doc.querySelector('.method-option.active, [data-method].active');
      d.method   = active?.dataset?.method || null;
    }

    if (viewId === 'normality') {
      d.passCount = txt('pass-count');
      d.failCount = txt('fail-count');
      d.alpha     = txt('significance');
      if (win.currentNormalityResults) d.tests = win.currentNormalityResults;
    }

    if (viewId === 'outliers') {
      d.summary = txt('outlierCount');
      const mBtn = doc.querySelector('.method-btn.active, button[class*="method"][class*="active"]');
      d.method  = mBtn?.textContent?.trim() || null;
      if (win.currentOutliersData) {
        const od = win.currentOutliersData;
        d.count       = od.outliers?.length ?? od.count;
        d.method      = d.method || od.method;
        if (od.bounds) { d.lowerBound = od.bounds.lower; d.upperBound = od.bounds.upper; }
      }
    }

    if (viewId === 'confidence') {
      d.lcl            = txt('stat-lcl');
      d.ucl            = txt('stat-ucl');
      d.center         = txt('stat-center');
      d.confidenceLevel = txt('stat-confidence');
      d.method         = txt('stat-method');
      d.pointEstimate  = txt('point-estimate');
      d.marginError    = txt('margin-error');
      if (win.currentCIResults) {
        const ci = win.currentCIResults;
        d.lcl    = d.lcl    || String(ci.lower);
        d.ucl    = d.ucl    || String(ci.upper);
        d.level  = ci.level;
        d.method = d.method || ci.method;
        d.estimate = ci.estimate;
      }
    }

    if (viewId === 'qqplot') {
      const qqRadio = doc.querySelector('input[name="plotType"]:checked');
      d.plotType    = qqRadio?.value || 'qq';
      d.distribution = val('distributionSelect');
    }

    if (viewId === 'boxplot') {
      d.footerNote = txt('boxplot-footer');
    }

    // Return null if nothing was captured (page didn't load results)
    return Object.values(d).some((v) => v !== null && v !== undefined) ? d : null;
  },

  /**
   * Collect results from ALL views that have been computed this session.
   * Works regardless of which view is currently active — reads every
   * available global and DOM element across the full univariate suite.
   */
  _collectAllViewsData() {
    const el  = (id) => document.getElementById(id);
    const txt = (id) => { const e = el(id); return e ? (e.textContent || '').trim() || null : null; };
    const val = (id) => { const e = el(id); return e ? e.value || null : null; };
    const out = {};

    // ── Histogram ─────────────────────────────────────────────────────────
    const histMean = txt('stat-mean');
    if (histMean) {
      out.histogram = {
        binMethod:     val('binningMethod'),
        numBins:       val('numBins'),
        normalOverlay: el('showNormalCurve')?.checked ? 'yes' : 'no',
        leftTrunc:     val('leftTruncation'),
        rightTrunc:    val('rightTruncation'),
        remainingN:    txt('remainingN'),
        mean:          histMean,
        stddev:        txt('stat-stddev'),
        skewness:      txt('stat-skewness'),
        kurtosis:      txt('stat-kurtosis'),
        min:           txt('stat-min'),
        q25:           txt('stat-q25'),
        median:        txt('stat-median'),
        q75:           txt('stat-q75'),
        max:           txt('stat-max')
      };
    }

    // ── Kernel density ────────────────────────────────────────────────────
    const kdeMean = txt('statMean');
    if (kdeMean) {
      out.kernel = {
        kernelType: val('kernelType'),
        bandwidth:  val('bandwidth'),
        mean:       kdeMean,
        stddev:     txt('statStdDev'),
        min:        txt('statMin'),
        max:        txt('statMax')
      };
    }

    // ── CDF ───────────────────────────────────────────────────────────────
    const cdfQ1 = txt('q1-value');
    if (cdfQ1) {
      out.cdf = {
        distributionOverlay: val('distribution-select') || 'none',
        q1:      cdfQ1,
        median:  txt('median-value'),
        avg:     txt('avg-value'),
        q3:      txt('q3-value'),
        p95:     txt('p95-value'),
        currentX:  txt('x-value'),
        currentFx: txt('probability')
      };
    }

    // ── Percentile ────────────────────────────────────────────────────────
    const pctResult = txt('arrow-text');
    if (pctResult) {
      const activeMethod = document.querySelector('.method-option.active, [data-method].active');
      out.percentile = {
        percentileQueried: val('percentile-value') || val('percentile-slider'),
        result:  pctResult,
        method:  activeMethod?.dataset?.method || null
      };
    }

    // ── Normality ─────────────────────────────────────────────────────────
    if (window.currentNormalityResults) {
      out.normality = {
        alpha:      txt('significance'),
        passCount:  txt('pass-count'),
        failCount:  txt('fail-count'),
        tests:      window.currentNormalityResults
      };
    }

    // ── Outliers ──────────────────────────────────────────────────────────
    const outlierSummary = txt('outlierCount');
    if (outlierSummary) {
      const mBtn = document.querySelector('.method-btn.active, [class*="method"][class*="active"]');
      out.outliers = {
        summary: outlierSummary,
        method:  mBtn?.textContent?.trim() || null
      };
    }
    if (window.currentOutliersData) {
      const od = window.currentOutliersData;
      out.outliers = out.outliers || {};
      out.outliers.count  = od.outliers?.length ?? od.count;
      out.outliers.method = out.outliers.method || od.method;
      if (od.bounds) { out.outliers.lowerBound = od.bounds.lower; out.outliers.upperBound = od.bounds.upper; }
    }

    // ── Confidence intervals ───────────────────────────────────────────────
    const ciLcl = txt('stat-lcl');
    if (ciLcl) {
      out.confidence = {
        lcl:              ciLcl,
        center:           txt('stat-center'),
        ucl:              txt('stat-ucl'),
        confidenceLevel:  txt('stat-confidence'),
        method:           txt('stat-method'),
        pointEstimate:    txt('point-estimate'),
        marginError:      txt('margin-error')
      };
    }
    if (window.currentCIResults) {
      const ci = window.currentCIResults;
      out.confidence = out.confidence || {};
      Object.assign(out.confidence, {
        lcl: ci.lower, ucl: ci.upper, level: ci.level, method: ci.method, estimate: ci.estimate
      });
    }

    // ── QQ / PP ───────────────────────────────────────────────────────────
    const qqRadio = document.querySelector('input[name="plotType"]:checked');
    if (qqRadio || el('distributionSelect')) {
      out.qqplot = {
        plotType:     qqRadio?.value || 'qq',
        distribution: val('distributionSelect')
      };
    }

    return out;
  },

  _correlationViewLabels() {
    return {
      'correlation-matrix': 'Matrix',
      'correlation-network': 'Network',
      'partial-correlations': 'Partial',
      reliability: 'Reliability',
      'taylor-diagram': 'Taylor Diagram',
      'descriptive-stats': 'Descriptives',
      'correlation-by-group': 'By Group',
      correlations: 'Correlations'
    };
  },

  _getCorrelationDataset() {
    let payload = window.correlationData || null;
    if (!payload) {
      try {
        const stored = sessionStorage.getItem('correlationData');
        if (stored) payload = JSON.parse(stored);
      } catch (e) {}
    }
    if (!payload) {
      try {
        const stored = localStorage.getItem('correlationData') || localStorage.getItem('correlationResults');
        if (stored) payload = JSON.parse(stored);
      } catch (e) {}
    }
    if (!payload || !Array.isArray(payload.headers) || !Array.isArray(payload.data)) return null;
    const headers = payload.headers.slice();
    const rows = payload.data
      .map((row) => headers.map((header) => Number(row?.[header])))
      .filter((row) => row.some((value) => Number.isFinite(value)));
    if (!headers.length || !rows.length) return null;
    return { headers, rows, raw: payload };
  },

  _pearsonFromPairs(x, y) {
    const pairs = x.map((xi, i) => [Number(xi), Number(y[i])]).filter(([xi, yi]) => Number.isFinite(xi) && Number.isFinite(yi));
    const n = pairs.length;
    if (n < 2) return null;
    const xs = pairs.map((p) => p[0]);
    const ys = pairs.map((p) => p[1]);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((acc, xi, i) => acc + (xi - mx) * (ys[i] - my), 0);
    const den = Math.sqrt(xs.reduce((acc, xi) => acc + (xi - mx) ** 2, 0) * ys.reduce((acc, yi) => acc + (yi - my) ** 2, 0));
    if (!den) return null;
    return { r: num / den, n };
  },

  _computeCorrelationMatrixData(dataset) {
    if (!dataset) return null;
    const cols = dataset.headers.map((_, idx) => dataset.rows.map((row) => row[idx]));
    const pairs = [];
    for (let i = 0; i < dataset.headers.length; i += 1) {
      for (let j = i + 1; j < dataset.headers.length; j += 1) {
        const result = this._pearsonFromPairs(cols[i], cols[j]);
        if (result) {
          pairs.push({
            x: dataset.headers[i],
            y: dataset.headers[j],
            r: result.r,
            abs: Math.abs(result.r),
            n: result.n
          });
        }
      }
    }
    pairs.sort((a, b) => b.abs - a.abs);
    const avgAbs = pairs.length ? pairs.reduce((acc, p) => acc + p.abs, 0) / pairs.length : null;
    return { pairs, strongest: pairs.slice(0, 10), avgAbs };
  },

  _computeCorrelationDescriptives(dataset) {
    if (!dataset) return [];
    const f = (v, d = 3) => Number.isFinite(v) ? Number(v).toFixed(d) : 'N/A';
    return dataset.headers.map((header, idx) => {
      const values = dataset.rows.map((row) => row[idx]).filter((v) => Number.isFinite(v));
      const n = values.length;
      if (!n) return { variable: header, n: 0 };
      const sorted = values.slice().sort((a, b) => a - b);
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const sd = n > 1 ? Math.sqrt(values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1)) : 0;
      return { variable: header, n, mean: f(mean), sd: f(sd), min: f(sorted[0]), max: f(sorted[n - 1]) };
    });
  },

  _computeCorrelationReliability(dataset) {
    if (!dataset || dataset.headers.length < 2 || dataset.rows.length < 2) return null;
    const completeRows = dataset.rows.filter((row) => row.every((value) => Number.isFinite(value)));
    if (completeRows.length < 2) return null;
    const variance = (arr) => {
      if (!arr || arr.length < 2) return NaN;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (arr.length - 1);
    };
    const itemVars = dataset.headers.map((_, idx) => variance(completeRows.map((row) => row[idx])));
    const totalScores = completeRows.map((row) => row.reduce((acc, v) => acc + v, 0));
    const totalVar = variance(totalScores);
    const k = dataset.headers.length;
    const alpha = Number.isFinite(totalVar) && totalVar > 0 && itemVars.every(Number.isFinite)
      ? (k / (k - 1)) * (1 - itemVars.reduce((a, b) => a + b, 0) / totalVar)
      : NaN;
    const matrix = this._computeCorrelationMatrixData(dataset);
    const avgR = matrix?.pairs?.length ? matrix.pairs.reduce((acc, p) => acc + p.r, 0) / matrix.pairs.length : NaN;
    const standardizedAlpha = Number.isFinite(avgR) ? (k * avgR) / (1 + (k - 1) * avgR) : NaN;
    return { alpha, standardizedAlpha, items: k, subjects: completeRows.length };
  },

  _collectAllCorrelationViewsData() {
    const dataset = this._getCorrelationDataset();
    if (!dataset) return null;
    const matrix = this._computeCorrelationMatrixData(dataset);
    const descriptives = this._computeCorrelationDescriptives(dataset);
    const reliability = this._computeCorrelationReliability(dataset);
    const threshold = Number(document.getElementById('networkThresholdSlider')?.value || window.networkThreshold || 0.3);
    const connectedNames = new Set();
    (matrix?.pairs || []).forEach((pair) => {
      if (pair.abs >= threshold) {
        connectedNames.add(pair.x);
        connectedNames.add(pair.y);
      }
    });
    let savedPartialRoles = null;
    try { savedPartialRoles = JSON.parse(sessionStorage.getItem('partialCorrelationRoles') || 'null'); } catch (e) {}
    const controls = (Array.isArray(window.partialControlVariables) ? window.partialControlVariables
      : Array.isArray(savedPartialRoles?.controls) ? savedPartialRoles.controls
      : Array.from(document.querySelectorAll('#controlCheckboxes input[type="checkbox"]:checked')))
        .map((input) => typeof input === 'string' ? input : (input.value || input.dataset?.varName || input.parentElement?.textContent?.trim()))
        .filter(Boolean);
    const excluded = Array.isArray(window.partialExcludedVariables) ? window.partialExcludedVariables
      : Array.isArray(savedPartialRoles?.excluded) ? savedPartialRoles.excluded
      : [];
    const pca = window.pcaData ? {
      firstComponentVariance: window.pcaData.firstComponentVariance,
      eigenvalues: window.pcaData.eigenvalues
    } : null;
    return {
      data: { variables: dataset.headers, rows: dataset.rows.length },
      matrix,
      network: {
        threshold,
        connected: connectedNames.size,
        disconnected: dataset.headers.filter((name) => !connectedNames.has(name))
      },
      descriptives,
      partial: { controls, excluded },
      reliability,
      pca
    };
  },

  _formatCorrelationViewsData(allData) {
    if (!allData) return null;
    const f = (value, digits = 3) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : 'N/A';
    const lines = [];
    lines.push(`[ Data ] Variables=${allData.data.variables.length}; Rows=${allData.data.rows}`);
    if (allData.matrix) {
      lines.push('[ Matrix ]');
      lines.push(`  Pair count=${allData.matrix.pairs.length}; Average |r|=${f(allData.matrix.avgAbs)}`);
      allData.matrix.strongest.slice(0, 6).forEach((pair) => {
        lines.push(`  ${pair.x} vs ${pair.y}: r=${f(pair.r)}, n=${pair.n}`);
      });
    }
    if (allData.network) {
      lines.push('[ Network ]');
      lines.push(`  Threshold |r|>=${f(allData.network.threshold, 2)}; Connected variables=${allData.network.connected}; Disconnected=${allData.network.disconnected.join(', ') || 'none'}`);
    }
    if (allData.reliability) {
      lines.push('[ Reliability ]');
      lines.push(`  Cronbach alpha=${f(allData.reliability.alpha)}; Standardized alpha=${f(allData.reliability.standardizedAlpha)}; Items=${allData.reliability.items}; Subjects=${allData.reliability.subjects}`);
    }
    if (allData.pca) {
      lines.push('[ PCA / Taylor dimensionality cue ]');
      lines.push(`  First component variance=${f(allData.pca.firstComponentVariance, 1)}%; Eigenvalues=${(allData.pca.eigenvalues || []).slice(0, 6).map((v) => f(v, 2)).join(', ')}`);
    }
    if (allData.partial?.controls?.length) {
      lines.push('[ Partial Correlations ]');
      lines.push(`  Current control variables=${allData.partial.controls.join(', ')}`);
      if (allData.partial.excluded?.length) lines.push(`  Excluded variables=${allData.partial.excluded.join(', ')}`);
    } else if (allData.partial?.excluded?.length) {
      lines.push('[ Partial Correlations ]');
      lines.push(`  Excluded variables=${allData.partial.excluded.join(', ')}`);
    }
    if (allData.descriptives?.length) {
      lines.push('[ Descriptives ]');
      allData.descriptives.slice(0, 8).forEach((d) => {
        lines.push(`  ${d.variable}: n=${d.n}, mean=${d.mean}, sd=${d.sd}, range=[${d.min}, ${d.max}]`);
      });
    }
    return lines.join('\n');
  },

  /**
   * Serialise the collected cross-view data into a readable text block
   * for insertion into the AI prompt.
   */
  _formatAllViewsData(allData, f) {
    if (!allData || !Object.keys(allData).length) return null;
    const lines = [];

    if (allData.histogram) {
      const h = allData.histogram;
      lines.push('[ Histogram ]');
      if (h.mean)      lines.push(`  Mean=${h.mean}, SD=${h.stddev}, Skewness=${h.skewness}, Kurtosis=${h.kurtosis}`);
      if (h.min)       lines.push(`  Min=${h.min}, Q25=${h.q25}, Median=${h.median}, Q75=${h.q75}, Max=${h.max}`);
      if (h.binMethod) lines.push(`  Binning: ${h.binMethod}${h.numBins ? ', bins=' + h.numBins : ''}`);
      if (h.remainingN) lines.push(`  Data after truncation: n=${h.remainingN}`);
    }

    if (allData.kernel) {
      const k = allData.kernel;
      lines.push('[ Kernel Density ]');
      if (k.kernelType) lines.push(`  Kernel: ${k.kernelType}, Bandwidth: ${k.bandwidth}`);
      if (k.mean)       lines.push(`  Mean=${k.mean}, SD=${k.stddev}, Range=[${k.min}, ${k.max}]`);
    }

    if (allData.cdf) {
      const c = allData.cdf;
      lines.push('[ CDF ]');
      if (c.q1)   lines.push(`  Q1=${c.q1}, Median=${c.median}, Mean=${c.avg}, Q3=${c.q3}, P95=${c.p95}`);
      if (c.currentX && c.currentFx) lines.push(`  At x=${c.currentX}: F(x)=${c.currentFx}`);
      if (c.distributionOverlay && c.distributionOverlay !== 'none') lines.push(`  Overlay: ${c.distributionOverlay}`);
    }

    if (allData.percentile) {
      const p = allData.percentile;
      lines.push('[ Percentile ]');
      if (p.percentileQueried) lines.push(`  P${p.percentileQueried} = ${p.result} (method: ${p.method || 'unknown'})`);
    }

    if (allData.normality) {
      const n = allData.normality;
      lines.push('[ Normality Tests ]');
      lines.push(`  Alpha=${n.alpha || '0.05'}, Pass=${n.passCount || '?'}, Fail=${n.failCount || '?'}`);
      if (n.tests && typeof n.tests === 'object') {
        Object.entries(n.tests).forEach(([name, r]) => {
          if (r?.pValue !== undefined) {
            const fp = (v) => (Number.isFinite(v) ? Number(v).toFixed(4) : 'N/A');
            lines.push(`  ${name}: p=${fp(r.pValue)} → ${r.significant ? 'NON-NORMAL' : 'normal'}`);
          }
        });
      }
    }

    if (allData.outliers) {
      const o = allData.outliers;
      lines.push('[ Outliers ]');
      const cnt = o.count ?? o.summary ?? '?';
      lines.push(`  Detected: ${cnt}${o.method ? ' (method: ' + o.method + ')' : ''}`);
      if (o.lowerBound !== undefined) lines.push(`  Bounds: [${f(o.lowerBound)}, ${f(o.upperBound)}]`);
    }

    if (allData.confidence) {
      const ci = allData.confidence;
      lines.push('[ Confidence Interval ]');
      const lcl = ci.lcl ?? ci.lower; const ucl = ci.ucl ?? ci.upper;
      if (lcl) lines.push(`  CI: [${f(lcl)}, ${f(ucl)}], level=${ci.confidenceLevel || ci.level || '95%'}, method=${ci.method || '?'}`);
      if (ci.pointEstimate || ci.estimate) lines.push(`  Estimate=${ci.pointEstimate || f(ci.estimate)}, Margin=${ci.marginError || '?'}`);
    }

    if (allData.qqplot) {
      const q = allData.qqplot;
      lines.push('[ QQ/PP Plot ]');
      lines.push(`  Type: ${q.plotType?.toUpperCase() || 'QQ'}, compared against: ${q.distribution || 'Normal'}`);
    }

    return lines.join('\n');
  },

  /**
   * Controls reference for each view — passed to AI so it can describe
   * how the user interacts with this view.
   */
  _viewControlsDoc() {
    return {
      histogram: `Controls available: (1) Binning Method dropdown (Manual / Sturges / Scott / Freedman-Diaconis) — changes how bars are grouped; (2) Bin Count slider (1–50, only active in Manual mode) — drag to increase/decrease bar count; (3) Show Normal Curve checkbox — toggles a theoretical normal overlay on the histogram; (4) Left/Right Truncation sliders — trim extreme observations by percentile to focus on the core distribution.`,

      boxplot: `Two tabbed views under Box plot: (1) Box plot — stacked charts showing the full data range and the IQR-fence view together; (2) Outliers — the full outlier detection module (IQR, Z-Score, Grubbs, MAD) with scatter visualization and detail table. Switch tabs in the header bar.`,

      cdf: `Controls available: (1) Distribution overlay dropdown (None / Normal / Log-Normal / Exponential / Uniform) — adds a theoretical CDF curve for visual comparison; (2) Toggle Distribution button — shows or hides the theoretical overlay; (3) Value slider (noUiSlider) — drag the marker along the x-axis to read F(x), the cumulative probability at any point; (4) Quartile shortcut cards (Q1, Median, Q3, P95) — click to jump the slider to those key positions.`,

      percentile: `Controls available: (1) Interpolation method radios (SAS / Excel-inclusive / Excel-exclusive / Nearest Rank) — different algorithms for computing a percentile from discrete data; (2) Percentile slider (0–100) — drag to query any percentile; (3) Percentile input field — type a value directly; (4) Preset buttons (P25, P50, P75, P90) — one-click common percentiles.`,

      kernel: `Controls available: (1) Kernel Type dropdown (Gaussian / Epanechnikov / Triangular / Uniform) — shape of the smoothing kernel; Gaussian is the standard choice; (2) Bandwidth slider (0.1–3) — controls smoothness: low bandwidth = spiky/noisy curve; high bandwidth = over-smoothed; (3) Reset button — returns bandwidth to auto-selected default.`,

      outliers: `Controls available: (1) Detection method buttons (IQR / Z-Score / Grubbs / MAD) — each uses a different statistical criterion; IQR uses 1.5×IQR fence; Z-Score uses standard deviation multiples; Grubbs is a formal significance test; MAD is robust to non-normality; (2) Sort order buttons (By Index / By Value) — reorder the outlier table; (3) Toggle Table button — show or hide the detailed outlier list.`,

      normality: `Controls available: (1) Alpha slider (0.01–0.15) — sets the significance threshold for all six tests simultaneously; drag left for stricter evidence of non-normality, right for more lenient. The gauge and pass/fail counts update in real time. Six tests run in parallel: Shapiro-Wilk, Anderson-Darling, Kolmogorov-Smirnov, Cramér-von Mises, D'Agostino-Pearson, and Jarque-Bera.`,

      qqplot: `Controls available: (1) Plot type radios (QQ / PP) — QQ plot compares quantiles; PP plot compares cumulative probabilities; (2) Distribution dropdown (Normal / Exponential / Uniform / Log-Normal / Gamma / Weibull) — the theoretical distribution to compare against. Points close to the diagonal line indicate a good fit. The detrended panel below shows residuals from the line.`,

      confidence: `Controls available: (1) Method radios (Classical / Bootstrap) — classical uses t/chi-squared formulas; bootstrap resamples the data; (2) Parameter radios (Mean / Std Dev / Median / Percentile when bootstrap) — what population parameter to estimate; (3) Confidence level selector (90% / 95% / 99%) plus a fine-grained alpha slider; (4) Bootstrap iterations input — higher = more accurate but slower; (5) Optional finite population size — applies finite population correction.`,

      hypothesis: `Controls available: hypothesis-test setup fields define the null and alternative hypothesis, alpha sets the decision threshold, and test-specific inputs determine the statistic and p-value. Use this view to connect the formal decision rule to the practical interpretation of the sample evidence.`,

      'by-group-stats': `Controls available: (1) Choose Group button — pick the categorical column that splits the numeric variable; (2) Group level checkboxes in the dialog — include or exclude specific levels; (3) Source row filter (header) — limits which rows enter every group. The table shows per-group N, mean, CI, spread, and shape statistics; histograms below use a shared bin scale for fair comparison.`,

      'by-group-boxplot': `Controls available: (1) Choose Group — same grouping column as other tabs; (2) Group level filter — subset levels; (3) Source row filter — shared filtered rows. One combined box plot compares quartiles, medians, and whiskers across groups on a common y-axis.`,

      'by-group-normality': `Controls available: (1) Choose Group and level filters — same as other tabs; (2) Fixed α = 0.05 for all six tests. Each column shows group name, n, a distribution sparkline, a plain-English Verdict row, six formal normality p-values, and NSI. Shapiro–Wilk is flagged (⚠) when tied/discrete scores make it unreliable; the Verdict row ignores it in that case.`
    };
  },

  _buildByGroupStructuredPrompt(view, mode) {
    const ctx = globalThis.__byGroupAiContext;
    if (!ctx || !Array.isArray(ctx.groups) || !ctx.groups.length) return null;

    const tab = (typeof view === 'string' && view.startsWith('by-group-'))
      ? view.replace('by-group-', '')
      : (ctx.activeTab || 'stats');
    const f = (v, dp = 3) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? 'N/A' : Number(v).toFixed(dp));
    const fp = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? 'N/A' : Number(v).toFixed(4));

    const groupStatsBlock = ctx.groups.map((g) => [
      `${g.name} (n=${g.n})`,
      `  mean=${f(g.mean)}, SD=${f(g.stdDev)}, median=${f(g.median)}`,
      `  Q1=${f(g.q1)}, Q3=${f(g.q3)}, min=${f(g.min)}, max=${f(g.max)}`,
      `  skew=${f(g.skew)}, kurtosis=${f(g.kurtosis)}`,
      g.lcl !== undefined ? `  95% CI for mean: [${f(g.lcl)}, ${f(g.ucl)}]` : ''
    ].filter(Boolean).join('\n')).join('\n\n');

    const means = ctx.groups.map((g) => ({ name: g.name, mean: g.mean, n: g.n }));
    const meanSpread = means.length > 1
      ? Math.max(...means.map((m) => m.mean)) - Math.min(...means.map((m) => m.mean))
      : 0;
    const highest = means.reduce((a, b) => (b.mean > a.mean ? b : a), means[0]);
    const lowest = means.reduce((a, b) => (b.mean < a.mean ? b : a), means[0]);

    let tabBlock = '';
    if (tab === 'stats') {
      tabBlock = [
        'ACTIVE TAB: Grouped Statistics (descriptive table + per-group histograms)',
        `Compare ${ctx.groups.length} groups on ${ctx.variable} split by ${ctx.groupingColumn}.`,
        `Mean spread across groups: ${f(meanSpread)} (${lowest.name}=${f(lowest.mean)} vs ${highest.name}=${f(highest.mean)}).`,
        'Focus READING on whether central tendency, spread, and shape differ meaningfully between named groups — not on a single pooled sample.'
      ].join('\n');
    } else if (tab === 'boxplot') {
      tabBlock = [
        'ACTIVE TAB: Grouped Box Plots (one chart, all groups)',
        ctx.groups.map((g) => `${g.name} (n=${g.n}): median=${f(g.median)}, IQR=[${f(g.q1)}, ${f(g.q3)}], range=[${f(g.min)}, ${f(g.max)}]`).join('\n'),
        'Focus READING on relative spread, median shifts, and whether whiskers/boxes overlap between groups.'
      ].join('\n\n');
    } else if (tab === 'normality') {
      const normLines = (ctx.normality || []).map((gr) => {
        const testSummary = (gr.tests || [])
          .map((t) => `${t.name}: p=${fp(t.pValue)}${t.unreliable ? ' (unreliable ⚠)' : ''} → ${t.pass ? 'pass' : 'fail'}`)
          .join('; ');
        return [
          `${gr.group} (n=${gr.n}) — Verdict: ${gr.verdict}${gr.hasTies ? ' [ties present]' : ''}`,
          `  NSI=${gr.nsi}`,
          `  Tests: ${testSummary || 'n/a'}`
        ].join('\n');
      }).join('\n\n');
      tabBlock = [
        'ACTIVE TAB: Group Normality Analysis (verdict + six tests per group)',
        normLines,
        'Focus READING on each group\'s Verdict and whether groups differ in normality support. Mention Shapiro–Wilk caution when ties are flagged.'
      ].join('\n\n');
    }

    const viewNames = {
      stats: 'Grouped Statistics',
      boxplot: 'Grouped Box Plots',
      normality: 'Group Normality Analysis'
    };
    const viewName = viewNames[tab] || 'Grouped Analysis';
    const controlsDoc = this._viewControlsDoc();
    const controlsKey = `by-group-${tab}`;

    if (mode === 'full') {
      const boxplotLines = ctx.groups.map((g) => `${g.name} (n=${g.n}): median=${f(g.median)}, IQR=[${f(g.q1)}, ${f(g.q3)}]`).join('\n');
      const normLines = (ctx.normality || []).map((gr) => {
        const passes = (gr.tests || []).filter((t) => t.pass && !t.unreliable).length;
        return `${gr.group} (n=${gr.n}): Verdict=${gr.verdict}, NSI=${gr.nsi}, reliable passes=${passes}/${(gr.tests || []).filter((t) => !t.unreliable).length}`;
      }).join('\n');
      return `You are a senior statistician writing a grouped comparison report for "${ctx.variable}" split by "${ctx.groupingColumn}".

GROUPED DATA (${ctx.totalRows} rows across ${ctx.groupCount} groups — do NOT treat as one pooled sample):
${groupStatsBlock}

[ Statistics tab ]
Mean spread: ${f(meanSpread)} (${lowest.name}=${f(lowest.mean)} vs ${highest.name}=${f(highest.mean)})

[ Box plot tab ]
${boxplotLines}

[ Normality tab ]
${normLines || '(Run normality tab to populate)'}

RULES:
- Compare groups by name; always cite n per group
- Do NOT report a single overall mean/SD as if there is one sample

Reply ONLY in this exact format:
CONCLUSION: [One sentence — main between-group finding]
EVIDENCE: [group-specific fact with number] | [group-specific fact] | [group-specific fact]
INTERPRETATION: [3 sentences comparing groups]
IMPLICATIONS: [implication 1] | [implication 2] | [implication 3]
ACTION: [next step 1] | [next step 2] | [next step 3]`;
    }

    return `You are explaining the "${viewName}" tab inside Statistico Grouped Analysis. The user is comparing "${ctx.variable}" across groups defined by "${ctx.groupingColumn}".

THIS IS A GROUPED COMPARISON — NOT a single-sample univariate view.
Total filtered rows: ${ctx.totalRows} across ${ctx.groupCount} groups.

PER-GROUP STATISTICS:
${groupStatsBlock}

${tabBlock}

CONTROLS FOR THIS TAB:
${controlsDoc[controlsKey] || controlsDoc['by-group-stats']}

RULES:
- Compare groups explicitly (e.g., Control vs Treatment); cite n= for each group mentioned
- Do NOT describe one pooled mean, SD, or median for all ${ctx.totalRows} observations
- Do NOT say "the data" as a single entity — say "each group" or name groups
- Use exact numbers from PER-GROUP STATISTICS / ACTIVE TAB blocks above
- Be specific to this tab (${viewName}), not generic univariate advice

Reply ONLY in this exact format — each key on its own line:
ABOUT: [2–3 sentences — what this tab shows for comparing groups and why it matters]
CONTROLS: [Control name: what it does + when to use it] | [next control] | [next control if applicable]
PATTERNS: [Between-group pattern → analytical meaning] | [next pattern] | [next pattern]
READING: [1–2 sentences comparing the named groups using exact per-group numbers from the data above]`;
  },

  _correlationControlsDoc() {
    return {
      'correlation-matrix': 'Matrix view shows all pairwise correlations. Sort or scan for strongest positive and negative relationships, then use Network/Partial/Reliability for follow-up.',
      'correlation-network': 'Network view highlights relationships above the threshold, can show only connected variables, and uses chart scale to inspect dense graphs.',
      'partial-correlations': 'Partial view recalculates pairwise correlations while controlling selected variables and omitting excluded variables. Use it to check whether a relationship persists after confounders are held constant.',
      reliability: 'Reliability view evaluates whether selected variables behave like a consistent scale using alpha, omega, item-total correlations, alpha-if-deleted, and PCA dimensionality cues.',
      'taylor-diagram': 'Taylor view compares variables against a reference using correlation, standard deviation, and centered RMSE-style geometry.',
      'descriptive-stats': 'Descriptives summarize each variable before interpreting the correlation structure.',
      'correlation-by-group': 'By Group compares overall and per-level r for each variable pair, with n per group and a sparkline of group-specific correlations.'
    };
  },

  _buildCorrelationStructuredPrompt(view, mode, preCollectedData = null) {
    const allData = preCollectedData || this._collectAllCorrelationViewsData();
    if (!allData) return null;
    const dataBlock = this._formatCorrelationViewsData(allData);
    const labels = this._correlationViewLabels();
    const viewLabel = labels[view] || labels.correlations;
    const controls = this._correlationControlsDoc();

    if (mode === 'full') {
      return `You are a senior statistician writing a full correlation-analysis report that synthesises ALL available correlation views.

RESULTS FROM ALL CORRELATION VIEWS:
${dataBlock}

RULES:
- Treat the data above as authoritative.
- Synthesize Matrix, Network, Descriptives, Reliability, Partial controls, and PCA/Taylor dimensionality cues when present.
- Cite exact values where useful.
- Do not overclaim causality; these are associations.
- Mention disconnected variables or weak reliability if present.

Reply ONLY in this exact format:
CONCLUSION: [One decisive sentence - the single most important correlation finding]
EVIDENCE: [specific numeric finding] | [specific numeric finding] | [specific numeric finding] | [specific numeric finding]
INTERPRETATION: [3 sentences - unified synthesis across the views]
IMPLICATIONS: [analytical implication 1] | [analytical implication 2] | [analytical implication 3]
ACTION: [next step 1] | [next step 2] | [next step 3]`;
    }

    return `You are explaining the "${viewLabel}" correlation view to a data analyst.

WHAT THIS VIEW DOES:
${controls[view] || controls['correlation-matrix']}

ALL AVAILABLE CORRELATION RESULTS:
${dataBlock}

RULES:
- Explain this current view first, but use the broader results as context.
- Be practical and concise.
- Do not overclaim causality.
- Mention exact values when they clarify the reading.

Reply ONLY in this exact format:
ABOUT: [2-3 sentences explaining what this view answers]
CONTROLS: [Control or interaction: what it does + when to use it] | [next control/interaction] | [next control/interaction]
PATTERNS: [Pattern description -> what it means analytically] | [next pattern] | [next pattern]
READING: [1-2 sentences about what the current correlation results suggest, using exact values where available]`;
  },

  /**
   * Build a view-specific or full-analysis prompt.
   * Per-view mode produces two-part output: HOW TO USE + RESULTS.
   * Full-analysis mode produces the five-section structured report.
   */
  _buildStructuredPrompt(view, mode, preCollectedData = null) {
    if (view === 'by-group' || (typeof view === 'string' && view.startsWith('by-group-'))) {
      return this._buildByGroupStructuredPrompt(view, mode);
    }

    const d = this._getUnivariateDescriptives();
    if (!d) return null;

    const { n, varName, mean, sd, med, q1, q3, iqr, min, max, skew, kurt, f } = d;

    // ── Step 1: Compute numeric ratios ───────────────────────────────────────
    const cvNum    = (mean !== 0 && sd > 0) ? Math.abs(sd / mean) : null;
    const mmGapNum = sd > 0 ? (mean - med) / sd : null;
    const iqrSdNum = sd > 0 ? iqr / sd : null;

    // ── Step 2: Derive diagnostic signals (JS decides truth) ─────────────────
    const symmetry =
      mmGapNum !== null && skew !== null
        ? (Math.abs(mmGapNum) < 0.1 && Math.abs(skew) < 0.2 ? 'strong'
          : Math.abs(mmGapNum) < 0.25 && Math.abs(skew) < 0.5 ? 'moderate'
          : 'low')
        : 'unknown';

    const dispersion =
      cvNum !== null
        ? (cvNum > 0.5 ? 'high' : cvNum > 0.25 ? 'moderate' : 'low')
        : 'unknown';

    const middleSpread =
      iqrSdNum !== null
        ? (iqrSdNum > 1.5 ? 'wide' : iqrSdNum > 1.2 ? 'slightly_elevated' : 'normal')
        : 'unknown';

    const tailBehavior =
      kurt !== null
        ? (kurt > 1 ? 'heavy' : kurt < -1 ? 'light' : 'normal')
        : 'unknown';

    const heterogeneityRisk =
      (dispersion === 'high' && middleSpread === 'wide') ? 'possible' : 'unlikely';

    // Normality status — only "confirmed" or "rejected" if formal tests were run
    const viewData = this._collectViewData(view);
    let normalityStatus = 'not_tested';
    if (viewData && typeof viewData === 'object' && viewData.normalityTests) {
      const tests = Object.values(viewData.normalityTests).filter((r) => r?.pValue !== undefined);
      if (tests.length > 0) {
        normalityStatus = tests.some((r) => r.significant) ? 'rejected' : 'confirmed';
      }
    }

    // ── Step 3: JS-computed Insight Strength (AI does NOT decide this) ───────
    const strengthLevel =
      (symmetry === 'strong' && dispersion === 'low' && normalityStatus !== 'rejected') ? 'High'
      : (symmetry === 'low' || dispersion === 'high' || normalityStatus === 'rejected') ? 'Low'
      : 'Moderate';

    const strengthNote =
      strengthLevel === 'High'
        ? `Symmetry indicators align consistently and spread is well-controlled (n=${n}).`
        : strengthLevel === 'Low'
        ? `${symmetry === 'low' ? 'Distributional asymmetry' : 'High variability'} limits confidence; formal testing is required to go further (n=${n}).`
        : `Symmetry is ${symmetry} but ${dispersion === 'high' ? 'high dispersion reduces confidence in distributional assumptions' : normalityStatus === 'not_tested' ? 'normality has not been formally tested' : 'mixed evidence exists'} (n=${n}).`;

    // ── Step 4: JS-computed Primary Signal (cognitive anchor for the panel) ──
    const sigParts = [];
    if (symmetry === 'strong') sigParts.push('Strong symmetry');
    else if (symmetry === 'moderate') sigParts.push('Moderate symmetry');
    else if (symmetry === 'low') sigParts.push('Asymmetric distribution');
    if (dispersion === 'high') sigParts.push('high dispersion');
    else if (dispersion === 'moderate') sigParts.push('moderate spread');
    else if (dispersion === 'low') sigParts.push('tight concentration');
    if (heterogeneityRisk === 'possible') sigParts.push('heterogeneity suspected');
    if (normalityStatus === 'rejected') sigParts.push('non-normality confirmed');
    const primarySignal = sigParts.join(' · ');

    // Store meta so _showAiOverlay can display JS-computed values
    this._lastAiMeta = { primarySignal, strengthLevel, strengthNote };

    // ── Step 5: Build signals block for AI (AI translates, not computes) ─────
    const statsBlock = [
      `Variable: ${varName}  |  n = ${n}`,
      `Mean = ${f(mean)},  SD = ${f(sd)},  Median = ${f(med)}`,
      `Q1 = ${f(q1)},  Q3 = ${f(q3)},  IQR = ${f(iqr)}`,
      `Min = ${f(min)},  Max = ${f(max)}`,
      skew !== null ? `Skewness = ${f(skew)},  Excess Kurtosis = ${f(kurt)}` : '',
    ].filter(Boolean).join('\n');

    const signalsJson = JSON.stringify({
      symmetry,
      dispersion,
      middle_spread:       middleSpread,
      tail_behavior:       tailBehavior,
      heterogeneity_risk:  heterogeneityRisk,
      normality_status:    normalityStatus,
      sample_size:         n,
    }, null, 2);

    // Serialise live view state for additional context
    const viewDataLines = Object.entries(viewData)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => {
        if (typeof v === 'object') {
          return Object.entries(v).filter(([, r]) => r?.pValue !== undefined)
            .map(([name, r]) => `  ${name}: p=${f(r.pValue, 4)}, ${r.significant ? 'NON-NORMAL' : 'normal'}`)
            .join('\n');
        }
        return `  ${k}: ${v}`;
      })
      .join('\n');

    if (mode === 'full') {
      const allData = preCollectedData || this._collectAllViewsData();
      const allDataBlock = this._formatAllViewsData(allData, f);

      return `You are a senior statistician writing a full-variable diagnostic report that synthesises ALL available analysis results.

DIAGNOSTIC SIGNALS (pre-computed, authoritative):
${signalsJson}

RAW STATISTICS (cite numbers when useful):
${statsBlock}

RESULTS FROM COMPLETED ANALYSES:
${allDataBlock || '(No additional view results available — base statistics only)'}

RULES:
- If normality_status = "not_tested", do NOT conclude normality or non-normality
- Do NOT recompute or question the signals
- Do NOT repeat the same fact across sections
- Do NOT mention formula names (CV, IQR/SD, etc.) — describe patterns in plain language

TASK: Write a comprehensive diagnostic report. Synthesise signals and results into a unified narrative. Where test results exist, cite exact numbers. Cover: the defining characteristic, what diagnostics collectively confirm, practical consequences, and what to do next.

Reply ONLY in this exact format:
CONCLUSION: [One decisive sentence — the single most important finding]
EVIDENCE: [specific finding with number] | [specific finding] | [specific finding] | [specific finding]
INTERPRETATION: [3 sentences — unified synthesis, plain language, no formula names]
IMPLICATIONS: [analytical implication 1] | [analytical implication 2] | [analytical implication 3]
ACTION: [conditional step 1] | [conditional step 2] | [conditional step 3]`;
    }

    // ── Per-view: Insight Guide (elaborate view explanation + controls guidance) ──
    const viewName = { histogram:'Histogram', boxplot:'Box Plot & Outliers', cdf:'Cumulative Distribution Function',
      percentile:'Percentiles', kernel:'Kernel', outliers:'Outliers',
      normality:'Tests', qqplot:'PP/QQ', confidence:'Confidence Intervals',
      hypothesis:'One-Sample Test' }[view] || view;

    const controlsDoc = this._viewControlsDoc();

    return `You are explaining the "${viewName}" view inside Statistico, a statistical analytics platform, to a data practitioner who has just opened this view.

CONTROLS FOR THIS VIEW:
${controlsDoc[view] || 'No specific controls documented.'}

CURRENT DATA STATE (live values from this view):
${viewDataLines || '  (no live values)'}

DESCRIPTIVE STATISTICS:
n = ${n}, Mean = ${f(mean)}, SD = ${f(sd)}, Median = ${f(med)}, Skewness = ${skew !== null ? f(skew) : 'n/a'}

YOUR TASK:
1. Explain what this view reveals — specifically and concretely, not generically.
2. Describe each control and give a practical tip on when and how to use it effectively.
3. List the key patterns a practitioner should look for in this view and what each pattern indicates analytically.
4. Give a brief 1–2 sentence reading of what this specific data currently shows in this view.

RULES:
- Be concrete and specific to this view type — not a generic stats lesson
- For controls: name each one, say what it does, and give a practical usage tip
- For patterns: describe the visual/statistical pattern, then explain its analytical meaning
- Do NOT mention other views or suggest navigating elsewhere
- Do NOT be vague — every sentence should give actionable information

Reply ONLY in this exact format — each key on its own line:
ABOUT: [2–3 sentences — what specific analytical question this view answers and what kind of information it exposes that other views do not]
CONTROLS: [Control name: what it does + when to use it] | [next control] | [next control if applicable]
PATTERNS: [Pattern description → what it means analytically] | [next pattern] | [next pattern] | [next pattern if applicable]
READING: [1–2 sentences — what the current data state in this view specifically shows, using exact numbers where available]`;
  },

  // ── AI API call ──────────────────────────────────────────────────────────

  async _callAiForSidebar(prompt) {
    const PROXY_URL = 'https://statistico-ai.statistico.workers.dev/';

    let lastErr = null;
    for (const model of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-8b-8192']) {
      try {
        const r = await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: `You are a senior statistical analyst embedded inside Statistico, a professional analytics platform used by data practitioners.
Your task is to translate pre-computed diagnostic signals into clear, human analytical insight.

CRITICAL RULES (strictly enforced):
- Do NOT recompute or question the signals you are given — they are authoritative
- If normality_status = "not_tested", you MUST NOT imply normality or non-normality
- Use cautious language ("suggests", "indicates", "appears to") unless certainty is "confirmed" or "rejected"
- Do NOT mention formula names or ratio names (e.g. do not say "CV", "IQR/SD ratio", "skewness value") — describe patterns in plain language
- Do NOT repeat the same idea across sections
- Do NOT give UI instructions or mention charts, sliders, or interface elements unless the user prompt explicitly asks for CONTROLS / PATTERNS guidance
- "What to Check Next" must use conditional reasoning ("If X, then run Y") — not a plain test list

Always follow the exact output format requested.` },
              { role: 'user',   content: prompt }
            ],
            max_tokens: 700,
            temperature: 0.3
          })
        });
        if (!r.ok) { const e = await r.json().catch(() => ({})); lastErr = new Error(e?.error?.message || `HTTP ${r.status}`); if (r.status === 404) continue; throw lastErr; }
        const d = await r.json();
        const text = d?.choices?.[0]?.message?.content?.trim();
        if (!text) { lastErr = new Error('Empty response'); continue; }
        return text;
      } catch (err) { lastErr = err; if (err.message?.includes('not found')) continue; throw err; }
    }
    throw lastErr || new Error('No AI model available');
  },

  // ── Response parser ──────────────────────────────────────────────────────

  /**
   * Parse the structured CONCLUSION / EVIDENCE / INTERPRETATION / IMPLICATIONS / ACTION
   * format into a plain object. Handles pipe-separated list items.
   */
  _parseAiStructured(raw) {
    if (!raw) return null;
    // Full-view keys + per-view keys (union)
    const sectionKeys = ['ABOUT', 'CONCLUSION', 'EVIDENCE', 'INTERPRETATION', 'IMPLICATIONS', 'ACTION',
                         'INSIGHT', 'MEANS', 'NEXT', 'STRENGTH',
                         'CONTROLS', 'PATTERNS', 'READING'];
    const result = {};
    const lines = raw.split('\n');
    let current = null;
    const buf = [];

    const flush = () => {
      if (!current) return;
      const joined = buf.join(' ').trim();
      if (['EVIDENCE', 'IMPLICATIONS', 'ACTION', 'NEXT', 'CONTROLS', 'PATTERNS'].includes(current)) {
        result[current] = joined.split('|').map((s) => s.trim()).filter(Boolean);
      } else {
        result[current] = joined;
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      let matched = false;
      for (const key of sectionKeys) {
        if (trimmed.toUpperCase().startsWith(key + ':')) {
          flush(); current = key; buf.length = 0;
          buf.push(trimmed.slice(key.length + 1).trim());
          matched = true; break;
        }
      }
      if (!matched && current) buf.push(trimmed);
    });
    flush();
    return Object.keys(result).length ? result : { INSIGHT: raw };
  },

  // ── Overlay renderer ─────────────────────────────────────────────────────

  _showAiOverlay(sections, view, mode = 'per-view', meta = null) {
    const existing = document.getElementById('sbAiOverlay');
    if (existing) existing.remove();

    const viewLabels = {
      histogram:'Histogram', boxplot:'Box Plot & Outliers', cdf:'CDF', percentile:'Percentiles',
      kernel:'Kernel', outliers:'Outliers', normality:'Tests',
      qqplot:'PP/QQ', confidence:'Confidence Intervals', hypothesis:'One-Sample Test',
      'by-group-stats':'Grouped Statistics', 'by-group-boxplot':'Grouped Box Plots',
      'by-group-normality':'Group Normality Analysis', 'by-group':'Grouped Analysis',
      ...this._correlationViewLabels(),
      ...this._independentViewLabels(),
      ...this._genericModuleViewLabels()
    };
    const viewLabel = viewLabels[view] || view;
    const title = mode === 'full'
      ? (this.module === 'correlations' ? 'Full Correlation Analysis' : (this.module === 'independent' ? 'Independent Means Analysis' : (this.module === 'factor' ? 'Full Factor Analysis' : 'Full Variable Analysis')))
      : mode === 'per-view' ? `Insight Guide — ${viewLabel}`
      : `AI Insight — ${viewLabel}`;
    const titleIcon = mode === 'full' ? 'fa-brain' : 'fa-compass';

    let bodyHtml;

    if (!sections) {
      bodyHtml = '<p class="sb-ai-empty">No analysis data available. Run the analysis first.</p>';
    } else if (sections.error) {
      bodyHtml = `<p class="sb-ai-empty sb-ai-error"><i class="fa-solid fa-triangle-exclamation"></i> ${sections.error}</p>`;
    } else {
      const renderList = (items) =>
        Array.isArray(items)
          ? `<ul class="sb-ai-list">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
          : `<p>${items}</p>`;

      bodyHtml = `
        ${(meta?.primarySignal && mode !== 'per-view') ? `
        <div class="sb-ai-primary-signal">
          <span class="sb-ai-signal-label">Primary Signal</span>
          <span class="sb-ai-signal-value">${meta.primarySignal}</span>
        </div>` : ''}
        ${(meta?.viewsBrowsed?.length && mode !== 'per-view') ? `
        <div class="sb-ai-views-browsed">
          <div class="sb-ai-views-label"><i class="fa-solid fa-layer-group"></i> Views Browsed</div>
          <div class="sb-ai-view-chips">
            ${meta.viewsBrowsed.map((label) => `<span class="sb-ai-view-chip">${label}</span>`).join('')}
          </div>
        </div>` : ''}
        ${sections.ABOUT ? `
        <div class="sb-ai-section sb-ai-section--about sb-ai-about-hero">
          <div class="sb-ai-section-body sb-ai-about-line">${sections.ABOUT}</div>
        </div>` : ''}

        ${/* ── What Questions This View Answers (static, per-view only) ── */ ''}
        ${mode === 'per-view' ? (() => {
          const qs = this._getQuestionsAnsweredContent();
          if (!qs.length) return '';
          return `<div class="sb-ai-section sb-ai-section--questions">
            <div class="sb-ai-section-label"><i class="fa-solid fa-circle-question" style="margin-right:5px;"></i>What Questions This View Answers</div>
            <div class="sb-ai-section-body"><ul class="sb-ai-list">${qs.map(q => `<li>${q}</li>`).join('')}</ul></div>
          </div>`;
        })() : ''}
        <div class="sb-ai-divider"></div>

        ${/* ── Per-view structure ── */ ''}
        ${sections.INSIGHT ? `
        <div class="sb-ai-section sb-ai-section--insight">
          <div class="sb-ai-section-label"><i class="fa-solid fa-brain"></i> AI Insight</div>
          <div class="sb-ai-section-body sb-ai-insight-body">${sections.INSIGHT}</div>
        </div>` : ''}
        ${sections.MEANS ? `
        <div class="sb-ai-section sb-ai-section--means">
          <div class="sb-ai-section-label">What This Means</div>
          <div class="sb-ai-section-body">${sections.MEANS}</div>
        </div>` : ''}
        ${sections.NEXT ? `
        <div class="sb-ai-section sb-ai-section--next">
          <div class="sb-ai-section-label">What to Check Next</div>
          <div class="sb-ai-section-body">${renderList(sections.NEXT)}</div>
        </div>` : ''}

        ${/* ── Insight Guide sections (per-view explain mode) ── */ ''}
        ${sections.CONTROLS ? `
        <div class="sb-ai-section sb-ai-section--controls sb-ai-collapsible">
          <div class="sb-ai-collapsible-hdr" data-target="sb-ctrl">
            <span><i class="fa-solid fa-sliders"></i> How to Interact</span>
            <i class="fa-solid fa-chevron-down sb-ai-chevron"></i>
          </div>
          <div class="sb-ai-collapsible-body" id="sb-ctrl">${renderList(sections.CONTROLS)}</div>
        </div>` : ''}
        ${sections.PATTERNS ? `
        <div class="sb-ai-section sb-ai-section--patterns sb-ai-collapsible">
          <div class="sb-ai-collapsible-hdr" data-target="sb-patt">
            <span><i class="fa-solid fa-chart-line"></i> What to Look For</span>
            <i class="fa-solid fa-chevron-down sb-ai-chevron"></i>
          </div>
          <div class="sb-ai-collapsible-body" id="sb-patt">${renderList(sections.PATTERNS)}</div>
        </div>` : ''}
        ${sections.READING ? `
        <div class="sb-ai-section sb-ai-section--reading sb-ai-collapsible">
          <div class="sb-ai-collapsible-hdr" data-target="sb-read">
            <span><i class="fa-solid fa-magnifying-glass-chart"></i> Current Reading</span>
            <i class="fa-solid fa-chevron-down sb-ai-chevron"></i>
          </div>
          <div class="sb-ai-collapsible-body" id="sb-read"><p class="sb-ai-insight-body">${sections.READING}</p></div>
        </div>` : ''}

        ${/* ── Full-view structure ── */ ''}
        ${sections.CONCLUSION ? `
        <div class="sb-ai-section sb-ai-section--conclusion">
          <div class="sb-ai-section-label">Core Finding</div>
          <div class="sb-ai-section-body sb-ai-insight-body">${sections.CONCLUSION}</div>
        </div>` : ''}
        ${sections.EVIDENCE ? `
        <div class="sb-ai-section sb-ai-section--evidence">
          <div class="sb-ai-section-label">Key Evidence</div>
          <div class="sb-ai-section-body">${renderList(sections.EVIDENCE)}</div>
        </div>` : ''}
        ${sections.INTERPRETATION ? `
        <div class="sb-ai-section sb-ai-section--interpretation">
          <div class="sb-ai-section-label">Diagnostic Interpretation</div>
          <div class="sb-ai-section-body">${sections.INTERPRETATION}</div>
        </div>` : ''}
        ${sections.IMPLICATIONS ? `
        <div class="sb-ai-section sb-ai-section--implications">
          <div class="sb-ai-section-label">Analytical Implications</div>
          <div class="sb-ai-section-body">${renderList(sections.IMPLICATIONS)}</div>
        </div>` : ''}
        ${sections.ACTION ? `
        <div class="sb-ai-section sb-ai-section--action">
          <div class="sb-ai-section-label">Next Analytical Steps</div>
          <div class="sb-ai-section-body">${renderList(sections.ACTION)}</div>
        </div>` : ''}

        ${/* ── Insight Strength: JS-computed for per-view, AI-parsed for full ── */ ''}
        ${mode !== 'per-view' ? (() => {
          const jsLevel = meta?.strengthLevel;
          const raw     = !jsLevel ? sections.STRENGTH : null;
          const level   = jsLevel
            ? jsLevel.toLowerCase()
            : raw ? (/^high/i.test(raw) ? 'high' : /^low/i.test(raw) ? 'low' : 'moderate') : null;
          const label   = level ? (level.charAt(0).toUpperCase() + level.slice(1)) : null;
          const note    = meta?.strengthNote || (raw ? raw.replace(/^(high|moderate|low)\s*[—–-]?\s*/i, '') : null);
          if (!level) return '';
          return `<div class="sb-ai-divider"></div>
        <div class="sb-ai-section sb-ai-section--strength">
          <div class="sb-ai-section-label">Insight Strength</div>
          <div class="sb-ai-section-body sb-ai-strength-body">
            <span class="sb-ai-strength-badge sb-ai-strength-${level}">${label}</span>
            <span class="sb-ai-strength-note">${note}</span>
          </div>
        </div>`;
        })() : ''}
      `;
    }

    const overlay = document.createElement('div');
    overlay.id = 'sbAiOverlay';
    overlay.className = 'sb-ai-overlay';
    overlay.innerHTML = `
      <div class="sb-ai-panel">
        <div class="sb-ai-header">
          <span class="sb-ai-title"><i class="fa-solid ${titleIcon}"></i> ${title}</span>
          <button class="sb-ai-close" onclick="document.getElementById('sbAiOverlay').remove()" title="Close">&times;</button>
        </div>
        <div class="sb-ai-body">${bodyHtml}</div>
        <div class="sb-ai-footer">AI interpretations are decision aids — verify critical findings with domain experts.</div>
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.remove(); return; }
      const hdr = e.target.closest('.sb-ai-collapsible-hdr');
      if (!hdr) return;
      const id   = hdr.dataset.target;
      const body = document.getElementById(id);
      if (!body) return;
      const open = body.classList.toggle('sb-ai-collapsible-body--open');
      hdr.querySelector('.sb-ai-chevron')?.classList.toggle('sb-ai-chevron--open', open);
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('sb-ai-overlay--visible'));
  }
};

window.openUniSourceFilter = function () { StatisticoHeader.openUniRowFilter(); };
window.openUniFilterHelp = function () { StatisticoHeader.openUniFilterHelp(); };
window.updateUniFilterButtonState = function () { StatisticoHeader.updateUniFilterChrome(); };

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ StatisticoHeader loaded and ready');

  // Recovery: if logistic results page inline script crashed, reload from v3
  (function _logisticRecovery() {
    try {
      var href = window.location.href || '';
      if (href.indexOf('logistic-results') === -1) return;
      if (window.switchTab) return; // inline script initialized fine
      console.warn('[shared-header] Logistic results page script failed — fetching v3 recovery...');
      var base = href.split('/logistic/')[0] + '/logistic/';
      var v3url = base + 'logistic-results-v3.html?recovered=1&cb=' + Date.now();
      var xhr = new XMLHttpRequest();
      xhr.open('GET', v3url, true);
      xhr.onload = function () {
        if (xhr.status === 200 && xhr.responseText.length > 500) {
          document.open();
          document.write(xhr.responseText);
          document.close();
        }
      };
      xhr.send();
    } catch (_e) { console.error('[shared-header] recovery error', _e); }
  })();
  
  // Add keyboard shortcut for refresh
  document.addEventListener('keydown', (e) => {
    // Ctrl+R or Cmd+R or F5
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      StatisticoHeader.refreshView();
    } else if (e.key === 'F5') {
      e.preventDefault();
      StatisticoHeader.refreshView();
    }
  });

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('headerDecimalMenu');
    const btn = document.getElementById('headerDecimalBtn');
    if (!menu || !btn) return;
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      StatisticoHeader.closeDecimalMenu();
    }
  });
});
