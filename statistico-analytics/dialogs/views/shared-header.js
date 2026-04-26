/**
 * Shared Header Component for Statistico Standalone Views
 * Provides shared navigation across standalone analysis views
 * VERSION: 2026-02-27-laptop-frame
 */

console.log('📦 Loading shared-header.js VERSION 2026-03-08-024 (sidebar-correlations-univariate)');

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
  script.src = resolveAssetUrl('src/shared/js/tooltip-template.js?v=20260420b');
  script.async = true;
  script.onload = initTooltip;
  document.head.appendChild(script);
})();

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
      root.style.setProperty('--surface-0',      '#f8fafa');
      root.style.setProperty('--surface-1',      '#ffffff');
      root.style.setProperty('--surface-2',      '#f0fdf9');
      root.style.setProperty('--border',         '#e5e7eb');
      root.style.setProperty('--accent-1',       '#0d9488');
      root.style.setProperty('--accent-2',       '#0ea5e9');
      root.style.setProperty('--text-primary',   '#111827');
      root.style.setProperty('--text-secondary', '#4b5563');
      root.style.setProperty('--text-muted',     '#6b7280');
      root.style.setProperty('--panel-shadow',   '0 2px 10px rgba(0,0,0,.08)');
      root.style.setProperty('--success',        '#16a34a');
      root.style.setProperty('--warning',        '#d97706');
      root.style.setProperty('--danger',         '#dc2626');
      root.style.setProperty('--header-color',   '#0d9488');
    } else {
      /* Remove inline overrides — let the per-page :root {} take over */
      ['--surface-0','--surface-1','--surface-2','--border',
       '--accent-1','--accent-2','--text-primary','--text-secondary',
       '--text-muted','--panel-shadow','--success','--warning','--danger',
       '--header-color'].forEach(v => root.style.removeProperty(v));
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

    // Apply persisted theme before rendering (avoids flash of wrong theme)
    this.applyTheme(this.getTheme());

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
  },

  /**
   * Update variable name and sample size
   */
  updateVariable(variableName, sampleSize) {
    this.variableName = variableName;
    this.sampleSize = sampleSize;
    document.getElementById('headerVariableName').textContent = variableName;
    
    // Check if sampleSize contains asterisk (indicating trimmed/transformed data)
    const sampleSizeStr = String(sampleSize);
    const hasAsterisk = sampleSizeStr.includes('*');
    
    if (hasAsterisk) {
      // Use innerHTML with superscript for asterisk
      const numericPart = sampleSizeStr.replace('*', '');
      document.getElementById('headerSampleSize').innerHTML = `(n=${numericPart}<sup>*</sup>)`;
      
      // Show notice
      this.showModificationNotice();
    } else {
      document.getElementById('headerSampleSize').textContent = `(n=${sampleSize})`;
      
      // Hide notice
      this.hideModificationNotice();
    }
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
      'histogram': 'Interactive Histogram',
      'boxplot': 'Box Plot Analysis',
      'qqplot': 'QQ/PP Plot Analysis',
      'normality': 'Normality Tests',
      'kernel': 'Kernel Density',
      'descriptive-stats': 'Descriptive Statistics',
      'cdf': 'Cumulative Distribution',
      'confidence': 'Confidence Intervals',
      'hypothesis': 'Hypothesis Testing',
      'outliers': 'Outliers Detection',
      'percentile': 'Percentile Calculator',
      // Correlation views
      'correlation-matrix': 'Correlation Matrix',
      'correlation-network': 'Correlation Network',
      'partial-correlations': 'Partial Correlations',
      'reliability': 'Reliability Coefficients',
      'taylor-diagram': 'Taylor Diagram',
      'rolling-correlations': 'Rolling Correlations',
      'correlation-tests': 'Correlation Tests',
      // Regression views
      'regression-input': 'Model Setup',
      'regression-results': 'Regression Results',
      'regression-residuals': 'Residual Diagnostics',
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
      'dependent-results-kplus': 'Repeated Measures (3+ Timepoints)'
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
      'power': 'Power & Sample Size'
    };
    
    const actionButtonsHtml = this._pendingActions ? this._renderActionButtons(this._pendingActions) : '';
    const headerGlobalControls = this._renderHeaderGlobalControls();

    // All sidebar-based modules hide the shared-header navrow to avoid duplicate navigation.
    const hideNavrow = (this.module === 'independent' || this.module === 'dependent' || this.module === 'logistic' || this.module === 'factor' || this.module === 'pca' || this.module === 'cluster' || this.module === 'anova' || this.module === 'power' || this.module === 'regression' || this.module === 'correlations' || this.module === 'univariate');

    const topHeader = `
      <div class="statistico-header">
        <div class="header-center">
          <div class="header-view-name" id="headerViewName">${viewTitles[this.currentView] || 'Analysis'}</div>
          <div class="header-variable">
            <span id="headerVariableName">${this.variableName}</span>
            <span id="headerSampleSize">(n=${this.sampleSize})</span>
          </div>
        </div>
        <div class="header-right">
          ${hideNavrow ? '' : actionButtonsHtml}
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

    // Inject "All rights reserved" footer at the bottom of the frame (once)
    if (!document.querySelector('.statistico-footer')) {
      const footer = document.createElement('div');
      footer.className = 'statistico-footer';
      footer.innerHTML = `&copy; ${new Date().getFullYear()} Statistico &mdash; All rights reserved.`;
      const frame = document.querySelector('.laptop-frame') || document.body;
      frame.appendChild(footer);
    }
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === 'function') {
      window.StatisticoTooltip.refresh();
    }
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
      { id: 'histogram', label: 'Interactive Histogram', file: 'univariate/histogram-standalone.html' },
      { id: 'boxplot', label: 'Box Plot Analysis', file: 'univariate/boxplot-standalone.html' },
      { id: 'cdf', label: 'Cumulative Distribution', file: 'univariate/cumulative-distribution.html' },
      { id: 'percentile', label: 'Percentiles', file: 'univariate/percentile-standalone.html' },
      { id: 'kernel', label: 'Kernel Density', file: 'univariate/kernel-standalone.html' },
      { id: 'separator-core-advanced', label: '---', file: null, isSeparator: true },
      { id: 'group-advanced', label: 'Advanced Diagnostics', file: null, isGroup: true },
      { id: 'outliers', label: 'Outliers Detection', file: 'univariate/outliers-standalone.html' },
      { id: 'normality', label: 'Tests of Normality', file: 'univariate/normality-standalone.html' },
      { id: 'qqplot', label: 'PP-QQ Plots', file: 'univariate/qqplot-standalone.html' },
      { id: 'hypothesis', label: 'Hypothesis Testing', file: 'univariate/hypothesis-standalone.html' },
      { id: 'confidence', label: 'Confidence Intervals', file: 'univariate/confidence-standalone.html' }
    ];

    const correlationViews = [
      { id: 'correlation-matrix', label: 'Correlation Matrix', file: 'correlations/correlation-matrix.html' },
      { id: 'correlation-network', label: 'Correlation Network', file: 'correlations/correlation-network.html' },
      { id: 'taylor-diagram', label: 'Taylor Diagram', file: 'correlations/correlation-taylor.html' },
      { id: 'descriptive-stats', label: 'Descriptive Statistics', file: 'correlations/descriptive-stats.html' },
      { id: 'partial-correlations', label: 'Partial Correlations', file: 'correlations/correlation-partial.html' },
      { id: 'reliability', label: 'Reliability Coefficients', file: 'correlations/correlation-reliability.html' }
    ];

    const regressionViews = [
      { id: 'regression-results',   label: 'Regression Results',   file: 'regression/regression-coefficients.html' },
      { id: 'regression-residuals', label: 'Residual Diagnostics', file: 'regression/regression-residuals.html' }
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
      const advancedTabs = [];
      let bucket = 'core';
      views.forEach((view) => {
        if (view.isSeparator || view.id === 'separator-core-advanced') {
          bucket = 'advanced';
          return;
        }
        if (view.isGroup) return;
        (bucket === 'core' ? coreTabs : advancedTabs).push(view);
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
    return ['univariate', 'correlations', 'independent', 'dependent', 'logistic', 'factor', 'pca', 'anova', 'power'].includes(this.module);
  },

  _isSidebarItemActive(item) {
    if (item.active === true) return true;
    if (item.view && item.view === this.currentView) return true;
    if (Array.isArray(item.viewIn) && item.viewIn.includes(this.currentView)) return true;
    return false;
  },

  _getSharedSidebarConfig() {
    if (this.module === 'univariate') {
      return {
        logoIcon: 'fa-chart-bar',
        logoSub: 'Univariate',
        menuTitle: 'Menu',
        groups: [
          {
            title: 'Core Descriptive',
            items: [
              { type: 'navigate', view: 'histogram', file: 'univariate/histogram-standalone.html', icon: 'fa-chart-column', label: 'Histogram' },
              { type: 'navigate', view: 'boxplot', file: 'univariate/boxplot-standalone.html', icon: 'fa-chart-gantt', label: 'Box Plot' },
              { type: 'navigate', view: 'cdf', file: 'univariate/cumulative-distribution.html', icon: 'fa-wave-square', label: 'CDF' },
              { type: 'navigate', view: 'percentile', file: 'univariate/percentile-standalone.html', icon: 'fa-percent', label: 'Percentiles' },
              { type: 'navigate', view: 'kernel', file: 'univariate/kernel-standalone.html', icon: 'fa-bezier-curve', label: 'Kernel Density' }
            ]
          },
          {
            title: 'Advanced Diagnostics',
            items: [
              { type: 'navigate', view: 'outliers', file: 'univariate/outliers-standalone.html', icon: 'fa-triangle-exclamation', label: 'Outliers' },
              { type: 'navigate', view: 'normality', file: 'univariate/normality-standalone.html', icon: 'fa-wave-square', label: 'Normality Tests' },
              { type: 'navigate', view: 'qqplot', file: 'univariate/qqplot-standalone.html', icon: 'fa-chart-line', label: 'PP-QQ Plots' },
              { type: 'navigate', view: 'hypothesis', file: 'univariate/hypothesis-standalone.html', icon: 'fa-flask', label: 'Hypothesis' },
              { type: 'navigate', view: 'confidence', file: 'univariate/confidence-standalone.html', icon: 'fa-ruler-horizontal', label: 'Confidence Intervals' }
            ]
          }
        ]
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
              { type: 'navigate', viewIn: ['correlation-matrix'], file: 'correlations/correlation-results.html', icon: 'fa-table-cells', label: 'Matrix' },
              { type: 'navigate', viewIn: ['correlation-network'], file: 'correlations/correlation-network.html', icon: 'fa-circle-nodes', label: 'Network' },
              { type: 'navigate', viewIn: ['taylor-diagram'], file: 'correlations/correlation-taylor.html', icon: 'fa-compass-drafting', label: 'Taylor Diagram' },
              { type: 'navigate', viewIn: ['partial-correlations'], file: 'correlations/correlation-partial.html', icon: 'fa-filter', label: 'Partial' },
              { type: 'navigate', viewIn: ['reliability'], file: 'correlations/correlation-reliability.html', icon: 'fa-check-double', label: 'Reliability' },
              { type: 'navigate', viewIn: ['descriptive-stats'], file: 'correlations/descriptive-stats.html', icon: 'fa-list-ol', label: 'Descriptives' }
            ]
          }
        ]
      };
    }

    if (this.module === 'independent') {
      return {
        logoIcon: 'fa-equals',
        logoSub: 'Independent',
        menuTitle: 'Menu',
        groups: [{
          title: 'Analysis',
          items: [
            { type: 'tab', tab: 'explore', icon: 'fa-chart-column', label: 'Explore', active: true },
            { type: 'tab', tab: 'assumptions', icon: 'fa-shield-halved', label: 'Assumptions' },
            { type: 'tab', tab: 'results', icon: 'fa-square-poll-vertical', label: 'Results' },
            { type: 'tab', tab: 'effects', icon: 'fa-wave-square', label: 'Effects' },
            { type: 'tab', tab: 'power', icon: 'fa-bolt', label: 'Power' },
            { type: 'tab', tab: 'report', icon: 'fa-file-lines', label: 'Report' }
          ]
        }]
      };
    }

    if (this.module === 'dependent') {
      return {
        logoIcon: 'fa-clock-rotate-left',
        logoSub: 'Dependent',
        menuTitle: 'Menu',
        groups: [{
          title: 'Analysis',
          items: [
            { type: 'tab', tab: 'explore', icon: 'fa-chart-column', label: 'Explore', active: true },
            { type: 'tab', tab: 'assumptions', icon: 'fa-shield-halved', label: 'Assumptions' },
            { type: 'tab', tab: 'results', icon: 'fa-square-poll-vertical', label: 'Results' },
            { type: 'tab', tab: 'effects', icon: 'fa-wave-square', label: 'Effects' },
            { type: 'tab', tab: 'power', icon: 'fa-bolt', label: 'Power' },
            { type: 'tab', tab: 'report', icon: 'fa-file-lines', label: 'Report' }
          ]
        }]
      };
    }

    if (this.module === 'logistic') {
      return {
        logoIcon: 'fa-chart-pie',
        logoSub: 'Logistic',
        menuTitle: 'Menu',
        groups: [{
          title: 'Analysis',
          items: [
            { type: 'tab', tab: 'results', icon: 'fa-square-poll-vertical', label: 'Results', active: true },
            { type: 'tab', tab: 'predictions', icon: 'fa-wand-magic-sparkles', label: 'Predictions' },
            { type: 'tab', tab: 'diagnostics', icon: 'fa-stethoscope', label: 'Diagnostics' },
            { type: 'tab', tab: 'roc', icon: 'fa-chart-area', label: 'ROC / AUC' },
            { type: 'tab', tab: 'descriptives', icon: 'fa-chart-bar', label: 'Descriptives' },
            { type: 'tab', tab: 'ai', icon: 'fa-brain', label: 'AI Assessment' }
          ]
        }]
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
            { type: 'tab', tab: 'rotation', icon: 'fa-arrows-rotate', label: 'Rotation' },
            { type: 'tab', tab: 'diagnostics', icon: 'fa-stethoscope', label: 'Diagnostics' },
            { type: 'tab', tab: 'scores', icon: 'fa-chart-scatter', label: 'Scores' },
            { type: 'tab', tab: 'ai', icon: 'fa-brain', label: 'AI Summary' },
            { type: 'tab', tab: 'viewdata', icon: 'fa-table', label: 'View Data' }
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
            { type: 'tab', tab: 'loadings', icon: 'fa-table-columns', label: 'Component Loadings' },
            { type: 'tab', tab: 'rotation', icon: 'fa-arrows-rotate', label: 'Rotation' },
            { type: 'tab', tab: 'biplot', icon: 'fa-circle-dot', label: 'Biplot' },
            { type: 'tab', tab: 'scoreplot', icon: 'fa-chart-scatter', label: 'Score Plot' },
            { type: 'tab', tab: 'contribution', icon: 'fa-chart-column', label: 'Contribution Plot' },
            { type: 'tab', tab: 'outliers', icon: 'fa-map-location-dot', label: 'Outlier Map' }
          ]
        }]
      };
    }

    if (this.module === 'anova') {
      return {
        logoIcon: 'fa-table-cells',
        logoSub: 'ANOVA',
        menuTitle: 'Menu',
        groups: [
          {
            title: 'Overview',
            items: [{ type: 'tab', tab: 'overview', icon: 'fa-circle-info', label: 'Summary', active: true }]
          },
          {
            title: 'Analysis',
            items: [
              { type: 'tab', tab: 'inference', icon: 'fa-table', label: 'Inference' },
              { type: 'tab', tab: 'comparisons', icon: 'fa-code-compare', label: 'Comparisons' },
              { type: 'tab', tab: 'diagnostics', icon: 'fa-shield-halved', label: 'Diagnostics' },
              { type: 'tab', tab: 'visuals', icon: 'fa-chart-column', label: 'Visuals' }
            ]
          },
          {
            title: 'Output',
            items: [{ type: 'tab', tab: 'report', icon: 'fa-file-lines', label: 'Report' }]
          }
        ]
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

  _renderSharedSidebar() {
    const nav = document.getElementById('sidebarNav');
    if (!nav || !this._isSharedSidebarModule()) return;
    const cfg = this._getSharedSidebarConfig();
    if (!cfg) return;

    const groupsHtml = (cfg.groups || []).map((group) => {
      const itemsHtml = (group.items || []).map((item) => {
        const active = this._isSidebarItemActive(item) ? ' active' : '';
        const idAttr = item.id ? ` id="${item.id}"` : '';
        const dataTab = item.tab ? ` data-tab="${item.tab}"` : '';
        const dataView = item.view ? ` data-view="${item.view}"` : '';

        let onclick = '';
        if (item.type === 'navigate' && item.file) {
          onclick = `StatisticoHeader.navigateTo('${item.file}')`;
        } else if (item.type === 'tab' && item.tab) {
          onclick = `switchTab('${item.tab}')`;
        } else if (item.type === 'js' && item.onclick) {
          onclick = item.onclick;
        }
        const onclickAttr = onclick ? ` onclick="${onclick}"` : '';

        return `<button class="sb-item${active}"${idAttr}${dataTab}${dataView}${onclickAttr}><i class="fa-solid ${item.icon || 'fa-circle'} sb-item-icon"></i><span class="sb-item-label">${item.label || ''}</span></button>`;
      }).join('');

      return `<div class="sb-group"><div class="sb-group-title">${group.title || ''}</div><div class="sb-items-rail">${itemsHtml}</div></div>`;
    }).join('');

    nav.innerHTML = `
      <div class="sb-logo">
        <div class="sb-logo-icon"><i class="fa-solid ${cfg.logoIcon || 'fa-chart-line'}"></i></div>
        <div class="sb-logo-text">
          <span class="sb-logo-name">Statistico</span>
          <span class="sb-logo-sub">${cfg.logoSub || this.module}</span>
        </div>
      </div>
      <div class="sb-header">
        <i class="fa-solid fa-bars-staggered sb-menu-icon"></i>
        <span class="sb-menu-title">${cfg.menuTitle || 'Menu'}</span>
        <button class="sb-toggle-btn" onclick="StatisticoHeader.toggleSidebar()" title="Collapse / expand">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
      </div>
      <div class="sb-body">${groupsHtml}</div>
    `;
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
    const idx = pathname.indexOf(marker);
    if (idx !== -1) {
      const rootPath = pathname.slice(0, idx);
      return `${origin}${rootPath}${marker}${filename}`;
    }
    return `./${filename}`;
  },
  
  /**
   * Navigate to another view
   */
  navigateTo(filename) {
    console.log('🔄 Navigating to:', filename);
    // All modules navigate within the same dialog window (no new dialog opened).
    // Persist module data in sessionStorage so the destination page can restore it.
    if (window.correlationData) {
      try { sessionStorage.setItem('correlationData', JSON.stringify(window.correlationData)); } catch(e) {}
    }
    if (window.regressionData) {
      try { sessionStorage.setItem('regressionNavData', JSON.stringify(window.regressionData)); } catch(e) {}
    }
    window.location.href = this.resolveDialogUrl(filename);
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
                         title="Export complete report as standalone HTML file">
                   <i class="fa-solid fa-file-code"></i> HTML
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
    const result = actions.getData();
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
  registerActions({ getData, saveModel, exportHtml, exportJson, moduleName = 'Save model' } = {}) {
    const incoming = { getData, saveModel, exportHtml, exportJson, moduleName };
    this._pendingActions = this._mergeActionsWithFallback(incoming);
    this.render();
    this._mountSidebarUtilities();
  },

  _renderHeaderGlobalControls() {
    const cfg = this._getSharedSidebarConfig ? this._getSharedSidebarConfig() : null;
    const decimalOptions = cfg?.bottomDecimals || ['auto', '0', '1', '2', '3', '4'];
    const persisted = this.getDecimalPreference();
    const selected = decimalOptions.includes(persisted) ? persisted : (cfg?.defaultDecimal || '2');
    const optionsHtml = decimalOptions.map((v) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v === 'auto' ? 'Auto' : v}</option>`).join('');
    const menuItemsHtml = decimalOptions.map((v) => {
      const label = v === 'auto' ? 'Auto' : v;
      return `<button class="header-decimals-option ${v === selected ? 'active' : ''}" onclick="StatisticoHeader.selectDecimalOption('${v}')">${label}</button>`;
    }).join('');
    const theme = this.getTheme();
    const themeIcon = theme === 'light' ? '☀️' : '🌙';

    return `
      <div class="header-global-controls">
        <label class="header-decimals-label" for="headerDecimalBtn">Decimals Precision</label>
        <select id="decimalSelect" class="header-decimals-hidden-select" onchange="StatisticoHeader.onDecimalChange(this.value)">
          ${optionsHtml}
        </select>
        <div class="header-decimals-wrap">
          <button id="headerDecimalBtn" class="header-decimals-btn" onclick="StatisticoHeader.toggleDecimalMenu()" title="Change decimal precision">
            <span id="headerDecimalValue">${selected === 'auto' ? 'Auto' : selected}</span>
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div id="headerDecimalMenu" class="header-decimals-menu">${menuItemsHtml}</div>
        </div>
        <button id="headerThemeBtn" class="header-theme-btn" onclick="StatisticoHeader.toggleTheme()" title="Toggle light / dark theme">
          <span id="headerThemeLabel">Theme</span>
          <span id="headerThemeIcon">${themeIcon}</span>
        </button>
      </div>
    `;
  },

  _mergeActionsWithFallback(actions) {
    if (this.module !== 'univariate') return actions;
    const fallback = this._buildUnivariateFallbackActions();
    const merged = {
      ...fallback,
      ...actions,
      moduleName: actions.moduleName || fallback.moduleName || 'Save model'
    };
    // Always use shared univariate HTML exporter (section checklist + long report),
    // even if a page registers its own exportHtml.
    merged.exportHtml = fallback.exportHtml;
    return merged;
  },

  _ensureDefaultActions() {
    if (this.module === 'univariate') {
      const existing = this._pendingActions || {};
      this._pendingActions = this._mergeActionsWithFallback(existing);
    } else if (this._pendingActions) {
      return;
    }
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
      bodyClone.querySelectorAll('#header-container, .statistico-shell, .sb-nav, #sidebarNav, .statistico-footer').forEach((n) => n.remove());

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
      groups.forEach((group) => {
        (group.items || []).forEach((item) => {
          if (item.type === 'navigate' && item.label) {
            items.push({ id: item.view || item.file || item.label, label: item.label, file: item.file || null });
          }
        });
      });
      return items;
    };

    const pickReportSections = (sections, onConfirm) => {
      const existing = document.getElementById('stReportExportOverlay');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'stReportExportOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:2147483300;display:flex;align-items:center;justify-content:center;padding:16px;';
      const listHtml = sections.map((s) => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">
          <input type="checkbox" data-section-id="${esc(s.id)}" checked />
          <span style="color:#0f172a;">${esc(s.label)}</span>
        </label>
      `).join('');
      overlay.innerHTML = `
        <div style="width:min(560px,95vw);max-height:80vh;overflow:hidden;background:#fff;border-radius:12px;border:1px solid #cbd5e1;box-shadow:0 12px 32px rgba(15,23,42,.3);display:flex;flex-direction:column;">
          <div style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-weight:700;">Export Long HTML Report</div>
          <div style="padding:10px 14px;color:#475569;font-size:12px;">Select the menu sections to include in the report:</div>
          <div style="padding:0 14px 10px;overflow:auto;">${listHtml}</div>
          <div style="padding:10px 14px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;">
            <button id="stReportCancelBtn" style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;">Cancel</button>
            <button id="stReportExportBtn" style="padding:8px 12px;border:1px solid #f97316;border-radius:8px;background:#f97316;color:#fff;cursor:pointer;">Export HTML</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.querySelector('#stReportCancelBtn').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('#stReportExportBtn').addEventListener('click', () => {
        const checked = Array.from(overlay.querySelectorAll('input[data-section-id]:checked')).map((el) => el.getAttribute('data-section-id'));
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
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapedVar} - Long Report</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;max-width:1120px;margin:auto;color:#0f172a}h1{margin-bottom:4px}h2{margin-top:28px}nav{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}section{page-break-inside:avoid;border-top:1px solid #e2e8f0;padding-top:14px}.meta{color:#475569;font-size:13px}.report-frame{width:100%;height:760px;border:1px solid #d1d5db;border-radius:10px;background:#fff}a{color:#0ea5e9;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><h1>Univariate Long Report</h1><p class="meta"><strong>Variable:</strong> ${escapedVar} &nbsp;&middot;&nbsp; <strong>Generated:</strong> ${new Date().toLocaleString()}</p><nav><strong>Included sections</strong><ol>${toc}</ol></nav>${builtSections.join('')}</body></html>`;
            closeProgress();
            downloadBlob(
              new Blob([html], { type: 'text/html' }),
              `Univariate_LongReport_${safeName(data.headers[0])}_${timestamp()}.html`
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
    this._ensureDefaultActions();
    this._mountSidebarUtilities();
    const persistedDecimals = this.getDecimalPreference();
    this._installDecimalOverride();
    setTimeout(() => this.applyDecimalPreferenceToPage(persistedDecimals), 0);
    setTimeout(() => this._injectPerViewAiButton(), 0);
  },

  _mountSidebarUtilities() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;

    const existing = document.getElementById('sbUtilities');
    if (existing) existing.remove();
    const existingAi = document.getElementById('sbAiSection');
    if (existingAi) existingAi.remove();

    const actions = this._pendingActions || {};
    const hasView = typeof actions.getData === 'function';
    const hasHtml = typeof actions.exportHtml === 'function';
    const hasJson = typeof actions.exportJson === 'function';

    // ── AI pill — above utilities, univariate only (not hypothesis) ────────
    if (this.module === 'univariate' && this.currentView !== 'hypothesis') {
      const aiSection = document.createElement('div');
      aiSection.id = 'sbAiSection';
      aiSection.className = 'sb-ai-section-wrap';
      aiSection.innerHTML = `
        <button class="sb-ai-sidebar-pill"
                id="sbAiBtn"
                onclick="StatisticoHeader._sbAiGlobalInterpret()"
                title="Full variable analysis — synthesises all diagnostics into one report">
          <i class="fa-solid fa-brain"></i>
          <span>Full Analysis</span>
          <sup class="sb-ai-sup">AI</sup>
        </button>
      `;
      nav.appendChild(aiSection);
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
              title="${hasHtml ? 'Export complete report as standalone HTML file' : 'HTML export is not available for this page yet'}">
        <i class="fa-solid fa-file-code"></i>
        <span class="sb-item-label">HTML</span>
      </button>
      <button class="sb-bottom-btn sb-bottom-btn--json ${hasJson ? '' : 'sb-bottom-btn--disabled'}"
              id="sbExportJsonBtn"
              ${hasJson ? 'onclick="StatisticoHeader._pendingActions.exportJson()"' : 'disabled'}
              title="${hasJson ? 'Download results as JSON file' : 'JSON export is not available for this page yet'}">
        <i class="fa-solid fa-download"></i>
        <span class="sb-item-label">JSON</span>
      </button>
    `;
    nav.appendChild(utilities);
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === 'function') {
      window.StatisticoTooltip.refresh();
    }
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
  _injectPerViewAiButton() {
    if (this.module !== 'univariate' || this.currentView === 'hypothesis') return;
    if (document.getElementById('sbAiFloatBtn')) return;

    const rightCol = document.querySelector('.right-col');
    if (!rightCol) return;

    const viewLabels = {
      histogram: 'Histogram', boxplot: 'Box Plot', cdf: 'CDF',
      percentile: 'Percentiles', kernel: 'Kernel Density',
      outliers: 'Outliers', normality: 'Normality Tests',
      qqplot: 'QQ / PP Plots', confidence: 'Confidence Intervals'
    };
    const label = viewLabels[this.currentView] || 'View';

    const btn = document.createElement('button');
    btn.id = 'sbAiFloatBtn';
    btn.className = 'sb-ai-float-btn';
    btn.title = `AI Insight — ${label}`;
    btn.innerHTML = `<i class="fa-solid fa-brain"></i><span>Explain ${label}</span><sup class="sb-ai-sup">AI</sup>`;
    btn.addEventListener('click', () => StatisticoHeader._sbAiPerViewInterpret());

    rightCol.style.position = 'relative';
    rightCol.appendChild(btn);
  },

  /**
   * Per-view AI: explains the current chart/analysis in a structured format.
   */
  async _sbAiPerViewInterpret() {
    const btn = document.getElementById('sbAiFloatBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Thinking…</span>';
    }
    try {
      const prompt = this._buildStructuredPrompt(this.currentView, 'per-view');
      if (!prompt) { this._showAiOverlay(null, this.currentView); return; }
      const raw = await this._callAiForSidebar(prompt);
      const sections = this._parseAiStructured(raw);
      this._showAiOverlay(sections, this.currentView, 'per-view');
    } catch (err) {
      this._showAiOverlay({ error: err.message || 'AI request failed.' }, this.currentView, 'per-view');
    } finally {
      const viewLabels = { histogram:'Histogram',boxplot:'Box Plot',cdf:'CDF',percentile:'Percentiles',kernel:'Kernel Density',outliers:'Outliers',normality:'Normality Tests',qqplot:'QQ / PP Plots',confidence:'Confidence Intervals' };
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-brain"></i><span>Explain ${viewLabels[this.currentView] || 'View'}</span><sup class="sb-ai-sup">AI</sup>`;
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
    setLabel('<i class="fa-solid fa-spinner fa-spin"></i><span>Loading views…</span>');

    try {
      // Sweep all views via invisible iframes
      const allData = await this._collectAllViewsViaIframes((done, total, label) => {
        setLabel(`<i class="fa-solid fa-spinner fa-spin"></i><span>${done}/${total} — ${label}</span>`);
      });

      setLabel('<i class="fa-solid fa-brain fa-spin"></i><span>Thinking…</span>');

      const prompt = this._buildStructuredPrompt(this.currentView, 'full', allData);
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
      try { const r = localStorage.getItem('univariateResults'); if (r) existing = JSON.parse(r); } catch (_) {}

      const fresh = {
        ...existing,
        values:       liveValues,
        rawData:      liveValues,
        data:         liveValues,
        variableName: varName,
        column:       varName,
        colName:      varName,
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
      { id: 'histogram',  url: 'univariate/histogram-standalone.html'     },
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
      histogram:'Histogram', boxplot:'Box Plot', cdf:'CDF', percentile:'Percentiles',
      kernel:'Kernel Density', outliers:'Outliers', normality:'Normality Tests',
      qqplot:'QQ / PP Plots', confidence:'Confidence Intervals'
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

      boxplot: `The box plot renders automatically from the data. The left chart includes all data points (with outliers marked as dots beyond the whiskers); the right chart shows the same distribution with outliers excluded, so the core spread is more visible. No manual sliders — navigate to other views using the sidebar.`,

      cdf: `Controls available: (1) Distribution overlay dropdown (None / Normal / Log-Normal / Exponential / Uniform) — adds a theoretical CDF curve for visual comparison; (2) Toggle Distribution button — shows or hides the theoretical overlay; (3) Value slider (noUiSlider) — drag the marker along the x-axis to read F(x), the cumulative probability at any point; (4) Quartile shortcut cards (Q1, Median, Q3, P95) — click to jump the slider to those key positions.`,

      percentile: `Controls available: (1) Interpolation method radios (SAS / Excel-inclusive / Excel-exclusive / Nearest Rank) — different algorithms for computing a percentile from discrete data; (2) Percentile slider (0–100) — drag to query any percentile; (3) Percentile input field — type a value directly; (4) Preset buttons (P25, P50, P75, P90) — one-click common percentiles.`,

      kernel: `Controls available: (1) Kernel Type dropdown (Gaussian / Epanechnikov / Triangular / Uniform) — shape of the smoothing kernel; Gaussian is the standard choice; (2) Bandwidth slider (0.1–3) — controls smoothness: low bandwidth = spiky/noisy curve; high bandwidth = over-smoothed; (3) Reset button — returns bandwidth to auto-selected default.`,

      outliers: `Controls available: (1) Detection method buttons (IQR / Z-Score / Grubbs / MAD) — each uses a different statistical criterion; IQR uses 1.5×IQR fence; Z-Score uses standard deviation multiples; Grubbs is a formal significance test; MAD is robust to non-normality; (2) Sort order buttons (By Index / By Value) — reorder the outlier table; (3) Toggle Table button — show or hide the detailed outlier list.`,

      normality: `Controls available: (1) Alpha slider (0.01–0.15) — sets the significance threshold for all six tests simultaneously; drag left for stricter evidence of non-normality, right for more lenient. The gauge and pass/fail counts update in real time. Six tests run in parallel: Shapiro-Wilk, Anderson-Darling, Kolmogorov-Smirnov, Cramér-von Mises, D'Agostino-Pearson, and Jarque-Bera.`,

      qqplot: `Controls available: (1) Plot type radios (QQ / PP) — QQ plot compares quantiles; PP plot compares cumulative probabilities; (2) Distribution dropdown (Normal / Exponential / Uniform / Log-Normal / Gamma / Weibull) — the theoretical distribution to compare against. Points close to the diagonal line indicate a good fit. The detrended panel below shows residuals from the line.`,

      confidence: `Controls available: (1) Method radios (Classical / Bootstrap) — classical uses t/chi-squared formulas; bootstrap resamples the data; (2) Parameter radios (Mean / Std Dev / Median / Percentile when bootstrap) — what population parameter to estimate; (3) Confidence level selector (90% / 95% / 99%) plus a fine-grained alpha slider; (4) Bootstrap iterations input — higher = more accurate but slower; (5) Optional finite population size — applies finite population correction.`
    };
  },

  /**
   * Build a view-specific or full-analysis prompt.
   * Per-view mode produces two-part output: HOW TO USE + RESULTS.
   * Full-analysis mode produces the five-section structured report.
   */
  _buildStructuredPrompt(view, mode, preCollectedData = null) {
    const d = this._getUnivariateDescriptives();
    if (!d) return null;

    const { n, varName, mean, sd, med, q1, q3, iqr, min, max, skew, kurt, f } = d;

    const statsBlock = [
      `Variable: ${varName}  |  n = ${n}`,
      `Mean = ${f(mean)},  SD = ${f(sd)},  Median = ${f(med)}`,
      `Q1 = ${f(q1)},  Q3 = ${f(q3)},  IQR = ${f(iqr)}`,
      `Min = ${f(min)},  Max = ${f(max)}`,
      skew !== null ? `Skewness = ${f(skew)},  Excess Kurtosis = ${f(kurt)}` : ''
    ].filter(Boolean).join('\n');

    // Collect live view state
    const viewData = this._collectViewData(view);
    const controlsDoc = this._viewControlsDoc();

    // Serialise live view data for the AI
    const viewDataLines = Object.entries(viewData)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => {
        if (typeof v === 'object') {
          // normality tests object
          return Object.entries(v).filter(([, r]) => r?.pValue !== undefined)
            .map(([name, r]) => `  ${name}: p=${f(r.pValue, 4)}, ${r.significant ? 'NON-NORMAL' : 'normal'}`)
            .join('\n');
        }
        return `  ${k}: ${v}`;
      })
      .join('\n');

    if (mode === 'full') {
      // Use iframe-swept data if provided, otherwise fall back to live DOM scan
      const allData = preCollectedData || this._collectAllViewsData();
      const allDataBlock = this._formatAllViewsData(allData, f);

      return `You are a senior statistician writing a full-variable diagnostic report that synthesises ALL available analysis results.

DESCRIPTIVE STATISTICS:
${statsBlock}

RESULTS FROM COMPLETED ANALYSES:
${allDataBlock || '(No additional view results available — base statistics only)'}

TASK: Write a comprehensive diagnostic report integrating every piece of evidence above. Where specific test results or computed values exist, cite them with exact numbers. Do not repeat the same fact twice. Produce a unified narrative: what is the defining characteristic of this variable, what do the diagnostics collectively confirm, what are the practical consequences, and what should the analyst do next.

Reply ONLY in this exact format:
CONCLUSION: [One decisive sentence — the single most important finding, use exact numbers]
EVIDENCE: [fact 1 with number and source view] | [fact 2] | [fact 3] | [fact 4] | [fact 5 if available]
INTERPRETATION: [3 sentences — decisive synthesis across all diagnostics, use exact numbers, no hedging]
IMPLICATIONS: [implication 1] | [implication 2] | [implication 3]
ACTION: [action 1] | [action 2] | [action 3]`;
    }

    // Per-view: two-part output
    const viewName = { histogram:'Histogram', boxplot:'Box Plot', cdf:'Cumulative Distribution Function',
      percentile:'Percentile Calculator', kernel:'Kernel Density Estimation', outliers:'Outlier Detection',
      normality:'Normality Tests', qqplot:'QQ / PP Plot', confidence:'Confidence Intervals' }[view] || view;

    return `You are a senior statistician embedded in a univariate analysis tool. The user is looking at the ${viewName} view.

CONTROLS FOR THIS VIEW:
${controlsDoc[view] || 'No specific controls documented.'}

CURRENT VIEW STATE (live values):
${viewDataLines || '  (no live values available — use descriptive statistics below)'}

DESCRIPTIVE STATISTICS:
${statsBlock}

TASK: Produce TWO sections:

1. HOW TO USE: In 2 sentences, explain what this view shows and which slider/control is most impactful for exploring the data. Be specific — name the control and describe the effect.

2. RESULTS INTERPRETATION: Give a precise, decisive interpretation of what the data shows in this view. Use the live view state and descriptive statistics. Be direct — state facts with exact numbers.

Reply ONLY in this exact format (no extra text):
ABOUT: [2 sentences — what this view reveals + which control to try first and why]
CONCLUSION: [One decisive sentence with exact numbers]
EVIDENCE: [fact 1 with number and meaning] | [fact 2] | [fact 3]
INTERPRETATION: [2 sentences — decisive, no hedging words]
IMPLICATIONS: [implication 1] | [implication 2]
ACTION: [action 1] | [action 2]`;
  },

  // ── AI API call ──────────────────────────────────────────────────────────

  async _callAiForSidebar(prompt) {
    const DEV_MODE    = true;
    const WORKER_URL  = 'https://statistico-ai.avibenita.workers.dev';
    const LICENSE_KEY = (() => { try { return (localStorage.getItem('statistico-license-key') || '').trim() || 'DEV'; } catch (_) { return 'DEV'; } })();

    if (DEV_MODE) {
      const models = ['llama-3.1-8b-instant', 'llama3-8b-8192', 'llama-3.3-70b-versatile'];
      const key = atob('Z3NrX0xmVHdFRUFTYjVoY3l4Z2JteTF4V0dkeWIzRlk5WmRyYlNvZmJLTXNja2d4NUNTUzFnTlY=');
      let lastErr = null;
      for (const model of models) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are an expert statistician. Always follow the exact output format requested. Be decisive, use exact numbers, avoid hedging.' },
                { role: 'user',   content: prompt }
              ],
              max_tokens: 600,
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
    }

    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, licenseKey: LICENSE_KEY })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || `Server error ${resp.status}`);
    return data.text;
  },

  // ── Response parser ──────────────────────────────────────────────────────

  /**
   * Parse the structured CONCLUSION / EVIDENCE / INTERPRETATION / IMPLICATIONS / ACTION
   * format into a plain object. Handles pipe-separated list items.
   */
  _parseAiStructured(raw) {
    if (!raw) return null;
    const sectionKeys = ['ABOUT', 'CONCLUSION', 'EVIDENCE', 'INTERPRETATION', 'IMPLICATIONS', 'ACTION'];
    const result = {};
    const lines = raw.split('\n');
    let current = null;
    const buf = [];

    const flush = () => {
      if (!current) return;
      const joined = buf.join(' ').trim();
      if (['EVIDENCE', 'IMPLICATIONS', 'ACTION'].includes(current)) {
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
    return Object.keys(result).length ? result : { INTERPRETATION: raw };
  },

  // ── Overlay renderer ─────────────────────────────────────────────────────

  _showAiOverlay(sections, view, mode = 'per-view') {
    const existing = document.getElementById('sbAiOverlay');
    if (existing) existing.remove();

    const viewLabels = {
      histogram:'Histogram', boxplot:'Box Plot', cdf:'CDF', percentile:'Percentiles',
      kernel:'Kernel Density', outliers:'Outliers', normality:'Normality Tests',
      qqplot:'QQ / PP Plots', confidence:'Confidence Intervals'
    };
    const viewLabel = viewLabels[view] || view;
    const title = mode === 'full' ? 'Full Variable Analysis' : `AI Insight — ${viewLabel}`;
    const titleIcon = mode === 'full' ? 'fa-brain' : 'fa-lightbulb';

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
        ${sections.ABOUT ? `
        <div class="sb-ai-section sb-ai-section--about">
          <div class="sb-ai-section-label"><i class="fa-solid fa-circle-info"></i> How to use this view</div>
          <div class="sb-ai-section-body">${sections.ABOUT}</div>
        </div>
        <div class="sb-ai-divider"></div>` : ''}
        ${sections.CONCLUSION ? `
        <div class="sb-ai-section sb-ai-section--conclusion">
          <div class="sb-ai-section-label">Conclusion</div>
          <div class="sb-ai-section-body">${sections.CONCLUSION}</div>
        </div>` : ''}
        ${sections.EVIDENCE ? `
        <div class="sb-ai-section sb-ai-section--evidence">
          <div class="sb-ai-section-label">Key Evidence</div>
          <div class="sb-ai-section-body">${renderList(sections.EVIDENCE)}</div>
        </div>` : ''}
        ${sections.INTERPRETATION ? `
        <div class="sb-ai-section sb-ai-section--interpretation">
          <div class="sb-ai-section-label">Interpretation</div>
          <div class="sb-ai-section-body">${sections.INTERPRETATION}</div>
        </div>` : ''}
        ${sections.IMPLICATIONS ? `
        <div class="sb-ai-section sb-ai-section--implications">
          <div class="sb-ai-section-label">Implications</div>
          <div class="sb-ai-section-body">${renderList(sections.IMPLICATIONS)}</div>
        </div>` : ''}
        ${sections.ACTION ? `
        <div class="sb-ai-section sb-ai-section--action">
          <div class="sb-ai-section-label">Recommended Actions</div>
          <div class="sb-ai-section-body">${renderList(sections.ACTION)}</div>
        </div>` : ''}
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
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('sb-ai-overlay--visible'));
  }
};

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ StatisticoHeader loaded and ready');
  
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
