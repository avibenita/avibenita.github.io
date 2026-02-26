/**
 * Responsive Layout Manager for Statistico Views (ROBUST VERSION)
 * Ensures views fit perfectly without scrolling on any screen
 * Handles stacked charts, multiple panels, and dynamic content
 * 
 * Usage: Include after responsive-layout.css
 * <script src="./responsive-layout.js"></script>
 */

const ResponsiveLayout = {
  // Configuration
  config: {
    headerHeight: 52, // statistico-header height
    minChartHeight: 180,
    debugMode: false,
    adjustmentAttempts: 0,
    maxAdjustmentAttempts: 3 // Prevent infinite loops
  },
  
  /**
   * Initialize responsive layout
   * Call this on page load or after DOM ready
   */
  init() {
    console.log('🎨 ResponsiveLayout: Initializing ROBUST mode...');
    
    // Force proper viewport constraints immediately
    this.forceViewportConstraints();
    
    // Calculate and apply optimal layout
    this.calculateOptimalLayout();
    this.reflowCharts();
    
    // Setup resize handler
    this.setupResizeHandler();
    
    // Monitor and adjust if needed (with loop prevention)
    setTimeout(() => this.finalCheck(), 500);
    
    console.log('✅ ResponsiveLayout: Initialized');
  },
  
  /**
   * Force viewport constraints to prevent overflow
   */
  forceViewportConstraints() {
    // Prevent body overflow
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.maxHeight = '100vh';
    document.documentElement.style.overflow = 'hidden';
    
    // Get actual viewport height
    const vh = window.innerHeight;
    const availableHeight = vh - this.config.headerHeight;
    
    // Set CSS variables for use throughout the app
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--available-height', `${availableHeight}px`);
    document.documentElement.style.setProperty('--header-height', `${this.config.headerHeight}px`);
    
    console.log(`📐 Viewport: ${window.innerWidth}x${vh}px, Available: ${availableHeight}px`);
    
    // Force container to fit
    const container = document.querySelector('.responsive-container');
    if (container) {
      container.style.height = `${availableHeight}px`;
      container.style.maxHeight = `${availableHeight}px`;
      container.style.overflow = 'hidden';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
    }
  },
  
  /**
   * Calculate optimal layout based on viewport and content
   */
  calculateOptimalLayout() {
    const vh = window.innerHeight;
    const availableHeight = vh - this.config.headerHeight;
    
    const container = document.querySelector('.responsive-container');
    if (!container) return;
    
    // Find all panels
    const panels = container.querySelectorAll('.responsive-panel');
    
    // Count chart panels vs other panels
    const chartPanels = Array.from(panels).filter(panel => 
      panel.classList.contains('chart-panel') || 
      panel.querySelector('.chart-container, .responsive-chart-container')
    );
    
    const otherPanels = Array.from(panels).filter(panel => !chartPanels.includes(panel));
    
    // Calculate space used by non-chart panels
    let usedHeight = 0;
    otherPanels.forEach(panel => {
      usedHeight += panel.offsetHeight || 50; // Estimate if not rendered
    });
    
    // Account for gaps and padding (with generous buffer)
    const gaps = (panels.length - 1) * 8; // var(--spacing-sm) = 8px
    const containerPadding = 16; // Top and bottom padding
    const safetyBuffer = 20; // Extra buffer for borders, margins, rounding errors
    usedHeight += gaps + containerPadding + safetyBuffer;
    
    // Calculate available height for chart panels
    const chartAreaHeight = availableHeight - usedHeight;
    const heightPerChart = Math.max(
      Math.floor(chartAreaHeight / chartPanels.length),
      this.config.minChartHeight
    );
    
    console.log(`📊 Charts: ${chartPanels.length}, Height per chart: ${heightPerChart}px`);
    
    // Apply heights to chart panels
    chartPanels.forEach(panel => {
      panel.style.flex = '1';
      panel.style.minHeight = `${this.config.minChartHeight}px`;
      panel.style.maxHeight = `${heightPerChart}px`;
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
      panel.style.overflow = 'hidden';
      
      // Find chart container within panel
      const chartContainer = panel.querySelector('.chart-container, .responsive-chart-container, [id*="chart"]');
      if (chartContainer) {
        const panelBody = panel.querySelector('.responsive-panel-body');
        const panelHeader = panel.querySelector('.responsive-panel-heading');
        const headerHeight = panelHeader ? panelHeader.offsetHeight : 30;
        
        const rawChartHeight = heightPerChart - headerHeight - 16; // 16px for padding
        const chartHeight = Math.max(rawChartHeight, 120); // Ensure minimum visibility
        chartContainer.style.height = `${chartHeight}px`;
        chartContainer.style.maxHeight = `${chartHeight}px`;
        
        if (this.config.debugMode) {
          console.log(`  📈 Chart container height: ${chartHeight}px`);
        }
      }
    });
    
    // Make non-chart panels compact
    otherPanels.forEach(panel => {
      panel.style.flex = '0 0 auto';
    });

    // Reflow charts after sizing
    this.reflowCharts();
  },
  
  /**
   * Setup window resize handler
   */
  setupResizeHandler() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.config.adjustmentAttempts = 0; // Reset counter
        this.forceViewportConstraints();
        this.calculateOptimalLayout();
        this.reflowCharts();
      }, 250);
    });
  },
  
  /**
   * Final check after initial load (with loop prevention)
   */
  finalCheck() {
    const bodyHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;
    const overflow = bodyHeight - viewportHeight;
    const tolerance = 10; // Allow 10px tolerance before adjusting
    
    if (overflow > tolerance && this.config.adjustmentAttempts < this.config.maxAdjustmentAttempts) {
      this.config.adjustmentAttempts++;
      console.warn(`⚠️ Content overflow detected (attempt ${this.config.adjustmentAttempts}): ${bodyHeight}px > ${viewportHeight}px (${overflow}px over)`);
      this.adjustForOverflow();
      
      // Check again after adjustment (but not infinitely)
      setTimeout(() => this.finalCheck(), 200);
    } else if (overflow > tolerance && this.config.adjustmentAttempts >= this.config.maxAdjustmentAttempts) {
      console.warn(`🛑 Max adjustment attempts reached, forcing fit... (${overflow}px overflow)`);
      this.forceFit();
    } else {
      if (overflow > 0 && overflow <= tolerance) {
        console.log(`✅ Layout fits within tolerance: ${overflow}px overflow (< ${tolerance}px) - acceptable`);
      } else {
        console.log('✅ Layout fits perfectly - no scrolling');
      }
    }
  },
  
  /**
   * Adjust layout when overflow is detected
   */
  adjustForOverflow() {
    console.log('🔧 Adjusting layout to prevent overflow...');
    
    // Progressive spacing reduction
    const reductions = [
      { selector: '.responsive-container', property: 'padding', value: '4px 8px' },
      { selector: '.responsive-panel', property: 'margin-bottom', value: '4px' },
      { selector: '.responsive-panel-body', property: 'padding', value: '4px 8px' },
      { selector: '.responsive-panel-heading', property: 'padding', value: '4px 8px' },
      { selector: '.responsive-panel-heading h3', property: 'font-size', value: '12px' },
      { selector: '.responsive-panel-heading h3', property: 'margin', value: '0' },
    ];
    
    reductions.forEach(reduction => {
      const elements = document.querySelectorAll(reduction.selector);
      elements.forEach(el => {
        el.style[reduction.property] = reduction.value;
      });
    });
    
    // Recalculate layout with new spacing
    this.calculateOptimalLayout();
    this.reflowCharts();
  },
  
  /**
   * Force fit as last resort (emergency measure)
   */
  forceFit() {
    console.log('🚨 FORCE FIT: Applying emergency layout constraints...');
    
    const vh = window.innerHeight;
    const availableHeight = vh - this.config.headerHeight;
    
    // Moderately compact spacing (not ultra-compact to preserve visibility)
    const style = document.createElement('style');
    style.id = 'force-fit-styles';
    style.textContent = `
      .responsive-container {
        height: ${availableHeight}px !important;
        max-height: ${availableHeight}px !important;
        overflow: hidden !important;
        padding: 3px 8px !important;
      }
      .responsive-panel {
        margin-bottom: 3px !important;
      }
      .responsive-panel-heading {
        padding: 4px 8px !important;
        font-size: 12px !important;
        flex: 0 0 auto !important;
        min-height: 0 !important;
        height: auto !important;
      }
      .responsive-panel-heading h3 {
        font-size: 12px !important;
        margin: 0 !important;
        line-height: 1.2 !important;
      }
      .responsive-panel-body {
        padding: 3px !important;
      }
      .chart-panel {
        flex: 1 1 auto !important;
        min-height: ${this.config.minChartHeight}px !important;
        display: flex !important;
        flex-direction: column !important;
      }
    `;
    
    // Remove old force-fit styles if they exist
    const oldStyle = document.getElementById('force-fit-styles');
    if (oldStyle) oldStyle.remove();
    
    document.head.appendChild(style);
    
    // Force recalculate
    this.calculateOptimalLayout();
    this.reflowCharts();
  },
  
  /**
   * Reflow charts after layout changes
   */
  reflowCharts() {
    // Highcharts
    if (window.Highcharts && Array.isArray(window.Highcharts.charts)) {
      window.Highcharts.charts.forEach(chart => {
        if (chart && typeof chart.reflow === 'function') {
          chart.reflow();
        }
      });
    }
    
    // Plotly
    if (window.Plotly && typeof window.Plotly.Plots?.resize === 'function') {
      document.querySelectorAll('.js-plotly-plot').forEach(plot => {
        window.Plotly.Plots.resize(plot);
      });
    }
  },
  
  /**
   * Get current layout metrics
   */
  getMetrics() {
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      },
      body: {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight
      },
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
    };
  },
  
  /**
   * Log current metrics (debugging)
   */
  logMetrics() {
    const metrics = this.getMetrics();
    console.group('📊 Layout Metrics');
    console.table(metrics);
    console.groupEnd();
    return metrics;
  },
  
  /**
   * Enable debug mode
   */
  enableDebug() {
    this.config.debugMode = true;
    console.log('🐛 Debug mode enabled');
    this.logMetrics();
  }
};

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ResponsiveLayout.init();
  });
} else {
  // DOM already loaded
  ResponsiveLayout.init();
}

// Global shortcut
window.RL = ResponsiveLayout;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponsiveLayout;
}
