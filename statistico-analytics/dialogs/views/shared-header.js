/**
 * Shared Header Component for Statistico Standalone Views
 * Provides shared navigation across standalone analysis views
 * VERSION: 2026-02-27-laptop-frame
 */

console.log('📦 Loading shared-header.js VERSION 2026-03-08-024 (sidebar-correlations-univariate)');

(function () {
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
        let parsed = null;
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

        let values = pickValues(parsed || {});
        if (!values.length) {
          values = coerceNumericVector(
            window.currentDataArray ||
            window.originalData ||
            window.currentData ||
            window.data ||
            []
          );
        }
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
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${escAttr(sourceUrl)}">${headClone.innerHTML}</head><body>${payload}</body></html>`;
    };
    const captureSectionSnapshot = (url) => new Promise((resolve) => {
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
        setTimeout(() => tryCapture(Date.now()), 500);
      }, { once: true });
      timer = setTimeout(() => finish('', false), 15000);
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
          (async () => {
            const builtSections = [];
            for (let i = 0; i < selected.length; i += 1) {
              const s = selected[i];
              if (!s.file) {
                builtSections.push(`
                  <section id="sec_${i + 1}">
                    <h2>${i + 1}. ${esc(s.label)}</h2>
                    <p class="meta">No page file mapped for this section.</p>
                  </section>
                `);
                continue;
              }
              const url = this.resolveDialogUrl(s.file);
              const snap = await captureSectionSnapshot(url);
              builtSections.push(`
                <section id="sec_${i + 1}">
                  <h2>${i + 1}. ${esc(s.label)}</h2>
                  <p class="meta">${snap.ok ? 'Embedded rich page snapshot.' : 'Could not snapshot this page; open directly in a new tab.'}</p>
                  ${snap.ok ? `<iframe class="report-frame" srcdoc="${escAttr(snap.snapshotHtml)}"></iframe>` : ''}
                  ${snap.ok ? '' : '<p class="meta">Section preview unavailable in this export.</p>'}
                </section>
              `);
            }
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapedVar} - Long Report</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;max-width:1120px;margin:auto;color:#0f172a}h1{margin-bottom:4px}h2{margin-top:28px}nav{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}section{page-break-inside:avoid;border-top:1px solid #e2e8f0;padding-top:14px}.meta{color:#475569;font-size:13px}.report-frame{width:100%;height:760px;border:1px solid #d1d5db;border-radius:10px;background:#fff}a{color:#0ea5e9;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><h1>Univariate Long Report</h1><p class="meta"><strong>Variable:</strong> ${escapedVar} &nbsp;&middot;&nbsp; <strong>Generated:</strong> ${new Date().toLocaleString()}</p><nav><strong>Included sections</strong><ol>${toc}</ol></nav>${builtSections.join('')}</body></html>`;
            downloadBlob(
              new Blob([html], { type: 'text/html' }),
              `Univariate_LongReport_${safeName(data.headers[0])}_${timestamp()}.html`
            );
          })();
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
  },

  _mountSidebarUtilities() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;

    const existing = document.getElementById('sbUtilities');
    if (existing) existing.remove();

    const actions = this._pendingActions || {};
    const hasView = typeof actions.getData === 'function';
    const hasHtml = typeof actions.exportHtml === 'function';
    const hasJson = typeof actions.exportJson === 'function';

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
