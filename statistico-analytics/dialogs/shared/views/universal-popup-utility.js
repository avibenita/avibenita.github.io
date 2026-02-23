/**
 * STATISTICO UNIVERSAL POPUP UTILITY
 * ===================================
 * 
 * Provides robust popup layout management for all Statistico dialogs
 * 
 * PRINCIPLES:
 * 1. Maximum display on 14" screens - NO vertical scrolling
 * 2. Automatic scrollbar on smaller displays
 * 
 * USAGE:
 * ```javascript
 * // Apply to any popup
 * StatisticoPopup.init('resultsContent', {
 *   fixedSections: ['#configPanel', '#controlsPanel'],
 *   scrollSections: ['#resultsPanel', '#chartsPanel']
 * });
 * ```
 */

const StatisticoPopup = {
  /**
   * Initialize popup with universal layout
   * @param {string} containerId - Main container element ID
   * @param {Object} options - Configuration options
   */
  init: function(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`StatisticoPopup: Container #${containerId} not found`);
      return;
    }
    
    // Add universal container class
    container.classList.add('statistico-popup-container');
    
    // Apply fixed section classes
    if (options.fixedSections) {
      options.fixedSections.forEach(selector => {
        const element = typeof selector === 'string' 
          ? document.querySelector(selector) 
          : selector;
        if (element) {
          element.classList.add('popup-fixed-section');
        }
      });
    }
    
    // Apply scroll section classes
    if (options.scrollSections) {
      options.scrollSections.forEach(selector => {
        const element = typeof selector === 'string' 
          ? document.querySelector(selector) 
          : selector;
        if (element) {
          element.classList.add('popup-scroll-section');
        }
      });
    }
    
    // Apply compact mode if needed
    this.checkCompactMode();
    
    // Listen for resize events
    window.addEventListener('resize', () => this.checkCompactMode());
    
    console.log('✅ StatisticoPopup initialized:', containerId);
  },
  
  /**
   * Check if compact mode should be enabled
   */
  checkCompactMode: function() {
    const container = document.querySelector('.statistico-popup-container');
    if (!container) return;
    
    const viewportHeight = window.innerHeight;
    
    if (viewportHeight < 700) {
      container.classList.add('compact-mode');
    } else {
      container.classList.remove('compact-mode');
    }
  },
  
  /**
   * Apply classes to existing popup structure
   * @param {string} containerSelector - Container selector
   * @param {string} fixedSelector - Fixed section selector  
   * @param {string} scrollSelector - Scroll section selector
   */
  applyStructure: function(containerSelector, fixedSelector, scrollSelector) {
    const container = document.querySelector(containerSelector);
    const fixed = document.querySelector(fixedSelector);
    const scroll = document.querySelector(scrollSelector);
    
    if (container) container.classList.add('statistico-popup-container');
    if (fixed) fixed.classList.add('popup-fixed-section');
    if (scroll) scroll.classList.add('popup-scroll-section');
    
    this.checkCompactMode();
  },
  
  /**
   * Force scroll section to update
   */
  refreshScroll: function() {
    const scrollSections = document.querySelectorAll('.popup-scroll-section');
    scrollSections.forEach(section => {
      // Force reflow to update scrollbar
      section.style.display = 'none';
      section.offsetHeight; // Trigger reflow
      section.style.display = '';
    });
  },
  
  /**
   * Get recommended height allocation
   * Returns object with fixed and scroll section heights
   */
  getRecommendedHeights: function() {
    const viewportHeight = window.innerHeight;
    const headerFooterHeight = 180;
    const availableHeight = viewportHeight - headerFooterHeight;
    
    return {
      fixed: Math.min(300, availableHeight * 0.4), // Max 300px or 40% of available
      scroll: availableHeight * 0.6, // 60% for scrollable content
      total: availableHeight
    };
  }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatisticoPopup;
}

// Make globally available
window.StatisticoPopup = StatisticoPopup;

console.log('✅ StatisticoPopup utility loaded');
