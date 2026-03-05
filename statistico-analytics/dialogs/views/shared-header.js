/**
 * Shared Header Component for Statistico Standalone Views
 * Provides shared navigation across standalone analysis views
 * VERSION: 2026-03-05-action-buttons
 */

console.log('📦 Loading shared-header.js VERSION 2026-03-05-b');

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

    // Update button label/icon if it exists
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      const icon  = btn.querySelector('.toggle-icon');
      const label = btn.querySelector('.toggle-label');
      if (icon)  icon.textContent  = theme === 'light' ? '☀️' : '🌙';
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
      'regression-residuals': 'Residual Diagnostics'
    };

    const moduleNames = {
      'univariate': 'Univariate',
      'correlations': 'Correlations',
      'regression': 'Regression'
    };
    
    const currentTheme = this.getTheme();
    const themeIcon    = currentTheme === 'light' ? '☀️' : '🌙';
    const themeLabel   = currentTheme === 'light' ? 'Light' : 'Dark';

    const topHeader = `
      <div class="statistico-header">
        <div class="header-left">
          <div class="header-logo">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <div class="header-module">
            <div class="header-brand">Statistico-Analytics</div>
            <div class="header-module-name" id="headerModuleName">${moduleNames[this.module] || 'Analysis'}</div>
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
          <button id="themeToggleBtn"
                  class="theme-toggle-btn"
                  onclick="StatisticoHeader.toggleTheme()"
                  title="Toggle light / dark theme">
            <span class="toggle-icon">${themeIcon}</span>
            <div class="toggle-track"><div class="toggle-thumb"></div></div>
            <span class="toggle-label">${themeLabel}</span>
          </button>
        </div>
      </div>
    `;

    const headerHTML = `
      <div class="statistico-shell">
        ${topHeader}
        <div class="statistico-navrow">
          <div class="navrow-tabs" role="tablist" aria-label="${this.module === 'univariate' ? 'Univariate workflow views' : this.module === 'correlations' ? 'Correlations views' : 'Regression views'}">
            ${this.renderNavigation()}
          </div>
        </div>
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
    
    return this.module === 'correlations' ? correlationViews :
           this.module === 'regression'   ? regressionViews  : univariateViews;
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

  // ================================================================
  // ACTION BUTTONS  (View Data / Model / HTML)
  // Injected into the right side of the header-right area so they
  // appear on EVERY result dialog without per-page wiring.
  // Call StatisticoHeader.registerActions({ getData, saveModel, exportHtml })
  // from each page after StatisticoHeader.init().
  // ================================================================

  /**
   * Register page-level action callbacks and render the three buttons.
   * @param {object} cfg
   *   cfg.getData()      → returns { headers: string[], rows: any[][] } or null
   *   cfg.saveModel()    → saves the model (async ok)
   *   cfg.exportHtml()   → exports HTML report (async ok)
   *   cfg.moduleName     → optional label override for the Model button tooltip
   */
  registerActions(cfg = {}) {
    this._actionCfg = cfg;

    // Inject action buttons into header-right
    const right = document.querySelector('.header-right');
    if (!right) return;

    // Remove any previously injected action group
    const old = right.querySelector('.sh-action-group');
    if (old) old.remove();

    const group = document.createElement('div');
    group.className = 'sh-action-group';
    group.innerHTML = `
      <button class="sh-action-btn sh-view-data" title="View the input data used in this analysis"
              onclick="StatisticoHeader._openDataModal()">
        <i class="fa-solid fa-eye"></i> View Data
      </button>
      <span class="sh-action-divider"></span>
      <button class="sh-action-btn sh-model" title="${cfg.moduleName || 'Save model configuration'}"
              onclick="StatisticoHeader._doSaveModel()">
        <i class="fa-solid fa-floppy-disk"></i> Model
      </button>
      <button class="sh-action-btn sh-html" title="Export complete report as standalone HTML file"
              onclick="StatisticoHeader._doExportHtml()">
        <i class="fa-solid fa-floppy-disk"></i> HTML
      </button>
    `;

    // Insert before the theme toggle button
    const themeBtn = right.querySelector('#themeToggleBtn');
    if (themeBtn) right.insertBefore(group, themeBtn);
    else right.appendChild(group);

    // Ensure data modal overlay exists in DOM
    this._ensureDataModal();
  },

  _doSaveModel() {
    if (this._actionCfg && typeof this._actionCfg.saveModel === 'function') {
      this._actionCfg.saveModel();
    }
  },

  _doExportHtml() {
    if (this._actionCfg && typeof this._actionCfg.exportHtml === 'function') {
      this._actionCfg.exportHtml();
    } else {
      // Default: snapshot the current page as a standalone HTML file
      const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const title = document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'report';
      a.download = `${title}.html`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
    }
  },

  // ── Data modal ──────────────────────────────────────────────────
  _ensureDataModal() {
    if (document.getElementById('sh-data-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'sh-data-modal-overlay';
    overlay.className = 'sh-data-modal-overlay sh-hidden';
    overlay.innerHTML = `
      <div class="sh-data-modal" role="dialog" aria-modal="true" aria-label="Input Dataset">
        <div class="sh-data-modal-header">
          <span><i class="fa-solid fa-eye" style="margin-right:7px;color:#67e8f9;"></i>Input Dataset</span>
          <div class="sh-data-modal-header-right">
            <div class="sh-row-filter" title="Filter which rows are shown">
              <button class="sh-row-filter-btn sh-active" id="sh-btn-used" onclick="StatisticoHeader._setDataModalFilter(false)">
                <i class="fa-solid fa-check-circle"></i> Used obs
              </button>
              <button class="sh-row-filter-btn" id="sh-btn-all" onclick="StatisticoHeader._setDataModalFilter(true)">
                <i class="fa-solid fa-list"></i> All rows
              </button>
            </div>
            <button class="sh-data-modal-close" onclick="StatisticoHeader._closeDataModal()">&times;</button>
          </div>
        </div>
        <div class="sh-data-modal-body" id="sh-data-modal-body"></div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closeDataModal(); });
    const frame = document.querySelector('.laptop-frame') || document.body;
    frame.appendChild(overlay);
  },

  _openDataModal() {
    this._ensureDataModal();
    const cfg = this._actionCfg || {};
    let data = null;
    if (typeof cfg.getData === 'function') data = cfg.getData();

    if (!data || !data.headers) {
      alert('No data available yet — please run the analysis first.');
      return;
    }

    this._dataModalFull = data;
    this._renderDataModal(false);
    document.getElementById('sh-data-modal-overlay').classList.remove('sh-hidden');
  },

  _closeDataModal() {
    const el = document.getElementById('sh-data-modal-overlay');
    if (el) el.classList.add('sh-hidden');
  },

  _applyDataModalFilter() {
    const showAll = document.getElementById('sh-show-all-toggle').checked;
    this._renderDataModal(showAll);
  },

  _setDataModalFilter(showAll) {
    const btnUsed = document.getElementById('sh-btn-used');
    const btnAll  = document.getElementById('sh-btn-all');
    if (btnUsed) btnUsed.classList.toggle('sh-active', !showAll);
    if (btnAll)  btnAll.classList.toggle('sh-active',  showAll);
    this._renderDataModal(showAll);
  },

  _renderDataModal(showAll) {
    const data = this._dataModalFull;
    if (!data) return;
    const { headers, rows } = data;

    // A row is "used" (complete) when every cell has a real value
    const isComplete = row => row.every(v => v !== null && v !== undefined && v !== '' && v !== '—' && v !== '\u2014');

    let html = '';

    if (showAll) {
      // Show all rows; highlight incomplete ones
      const usedCount = rows.filter(isComplete).length;
      html += `<div class="sh-data-modal-meta">${rows.length} total rows &nbsp;·&nbsp; <span style="color:#4ade80;">${usedCount} used</span> &nbsp;·&nbsp; <span style="color:rgba(255,255,255,.35);">${rows.length - usedCount} excluded (missing values)</span></div>`;
      html += '<div class="sh-data-modal-table-wrap"><table class="sh-data-modal-table"><thead><tr><th>#</th>';
      headers.forEach(h => { html += `<th>${h ?? ''}</th>`; });
      html += '</tr></thead><tbody>';
      rows.forEach((row, i) => {
        const complete = isComplete(row);
        html += `<tr class="${complete ? '' : 'sh-row-excluded'}"><td class="sh-row-num">${i + 1}</td>`;
        headers.forEach((_, ci) => {
          const v = row[ci];
          const empty = v === null || v === undefined || v === '' || v === '—' || v === '\u2014';
          html += `<td${empty ? ' class="sh-cell-empty"' : ''}>${empty ? '—' : v}</td>`;
        });
        html += '</tr>';
      });
    } else {
      // Show only complete rows
      const usedRows = rows.filter(isComplete);
      html += `<div class="sh-data-modal-meta">${usedRows.length} used rows × ${headers.length} columns &nbsp;<span style="opacity:.5;font-size:10px;">(rows with missing values excluded)</span></div>`;
      html += '<div class="sh-data-modal-table-wrap"><table class="sh-data-modal-table"><thead><tr><th>#</th>';
      headers.forEach(h => { html += `<th>${h ?? ''}</th>`; });
      html += '</tr></thead><tbody>';
      usedRows.forEach((row, i) => {
        html += `<tr><td class="sh-row-num">${i + 1}</td>`;
        headers.forEach((_, ci) => {
          const v = row[ci];
          html += `<td>${v ?? ''}</td>`;
        });
        html += '</tr>';
      });
    }

    html += '</tbody></table></div>';
    document.getElementById('sh-data-modal-body').innerHTML = html;
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
});
