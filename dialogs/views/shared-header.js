/**
 * Shared Header Component for Statistico Standalone Views
 * Provides navigation dropdown to other analysis views
 * VERSION: 2026-02-06-taylor
 */

console.log('📦 Loading shared-header.js VERSION 2026-02-06-taylor');

const StatisticoHeader = {
  currentView: 'histogram',
  variableName: 'Variable',
  sampleSize: 0,
  module: 'univariate', // 'univariate' or 'correlations'
  
  /**
   * Initialize the header
   * @param {string} viewName - Current view name (histogram, boxplot, correlation-matrix, etc.)
   * @param {string} variableName - Variable name to display
   * @param {number} sampleSize - Sample size
   * @param {string} module - Module name ('univariate' or 'correlations')
   */
  init(viewName, variableName = 'Variable', sampleSize = 0, module = null) {
    this.currentView = viewName;
    this.variableName = variableName;
    this.sampleSize = sampleSize;
    
    // Auto-detect module from view name if not specified
    if (module) {
      this.module = module;
    } else if (viewName.includes('correlation') || viewName.includes('network')) {
      this.module = 'correlations';
    } else {
      this.module = 'univariate';
    }
    
    this.render();
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
      
      const header = document.querySelector('.statistico-header');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(notice, header.nextSibling);
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
      'correlation-tests': 'Correlation Tests'
    };

    const moduleNames = {
      'univariate': 'Univariate',
      'correlations': 'Correlations'
    };
    
    const headerHTML = `
      <div class="statistico-header">
        <!-- Left: Logo + Module -->
        <div class="header-left">
          <div class="header-logo">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <div class="header-module">
            <div class="header-brand">Statistico</div>
            <div class="header-module-name">${moduleNames[this.module] || 'Analysis'}</div>
          </div>
        </div>
        
        <!-- Center: View Name + Variable -->
        <div class="header-center">
          <div class="header-view-name">${viewTitles[this.currentView] || 'Analysis'}</div>
          <div class="header-variable">
            <span id="headerVariableName">${this.variableName}</span>
            <span id="headerSampleSize">(n=${this.sampleSize})</span>
          </div>
        </div>
        
        <!-- Right: Dropdown Menu -->
        <div class="header-right">
          <button class="dropdown-btn" onclick="StatisticoHeader.toggleDropdown()">
            <span>Advanced Analysis Options</span>
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="dropdown-content" id="dropdownMenu">
            ${this.renderDropdownItems()}
          </div>
        </div>
      </div>
    `;
    
    // Insert into header-container if it exists, otherwise at beginning of body
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      headerContainer.innerHTML = headerHTML;
    } else {
      // Remove any existing header first
      const existingHeader = document.querySelector('.statistico-header');
      if (existingHeader) {
        existingHeader.remove();
      }
      document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }
  },
  
  /**
   * Render dropdown menu items
   */
  renderDropdownItems() {
    const univariateViews = [
      { id: 'histogram', label: 'Interactive Histogram', file: 'univariate/histogram-standalone.html' },
      { id: 'descriptive-stats', label: 'Descriptive Statistics', file: 'univariate/descriptive-stats.html' },
      { id: 'boxplot', label: 'Box Plot Analysis', file: 'univariate/boxplot-standalone.html' },
      { id: 'cdf', label: 'Cumulative Distribution', file: 'univariate/cumulative-distribution.html' },
      { id: 'percentile', label: 'Percentiles', file: 'univariate/percentile-standalone.html' },
      { id: 'outliers', label: 'Outliers Detection', file: 'univariate/outliers-standalone.html' },
      { id: 'separator', label: '---', file: null },
      { id: 'normality', label: 'Tests of Normality', file: 'univariate/normality-standalone.html' },
      { id: 'qqplot', label: 'PP-QQ Plots', file: 'univariate/qqplot-standalone.html' },
      { id: 'hypothesis', label: 'Hypothesis Testing', file: 'univariate/hypothesis-standalone.html' },
      { id: 'confidence', label: 'Confidence Intervals', file: 'univariate/confidence-standalone.html' },
      { id: 'kernel', label: 'Kernel Density', file: 'univariate/kernel-standalone.html' }
    ];

    const correlationViews = [
      { id: 'correlation-matrix', label: 'Correlation Matrix', file: 'correlations/correlation-matrix.html' },
      { id: 'correlation-network', label: 'Correlation Network', file: 'correlations/correlation-network.html' },
      { id: 'taylor-diagram', label: 'Taylor Diagram', file: 'correlations/correlation-taylor.html' },
      { id: 'descriptive-stats', label: 'Descriptive Statistics', file: 'correlations/descriptive-stats.html' },
      { id: 'partial-correlations', label: 'Partial Correlations', file: 'correlations/correlation-partial.html' },
      { id: 'reliability', label: 'Reliability Coefficients', file: 'correlations/correlation-reliability.html' },
      { id: 'separator', label: '---', file: null },
      { id: 'rolling-correlations', label: 'Rolling Correlations', file: null, isDisabled: true },
      { id: 'correlation-tests', label: 'Correlation Tests', file: null, isDisabled: true }
    ];
    
    const views = this.module === 'correlations' ? correlationViews : univariateViews;
    
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
  
  /**
   * Navigate to another view
   */
  navigateTo(filename) {
    console.log('🔄 [v2026-02-05-003] Navigating to:', filename);
    
    // Close dropdown after selection
    this.toggleDropdown();
    
    try {
      
      // Check if Office is available
      const isOfficeAvailable = typeof Office !== 'undefined' && 
                                Office.context && 
                                Office.context.ui;
      
      console.log('Office available:', isOfficeAvailable);
      
      if (isOfficeAvailable) {
        // Office context - send message to parent
        const currentData = localStorage.getItem('univariateResults');
        if (currentData) {
          console.log('✅ Data preserved for new view');
        }
        
        const message = {
          action: 'switchView',
          view: filename
        };
        
        console.log('📤 Sending message to parent:', message);
        Office.context.ui.messageParent(JSON.stringify(message));
        console.log('✅ Message sent successfully');
      } else {
        // Browser mode - direct navigation
        console.log('⚠️ Browser mode - navigating directly');
        const newUrl = filename.startsWith('http') ? filename : `./${filename}`;
        console.log('Navigating to:', newUrl);
        window.location.href = newUrl;
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback to direct navigation
      try {
        const newUrl = filename.startsWith('http') ? filename : `./${filename}`;
        window.location.href = newUrl;
      } catch (fallbackError) {
        console.error('❌ Fallback navigation failed:', fallbackError);
        alert(`Navigation failed. Please manually navigate to: ${filename}`);
      }
    }
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
