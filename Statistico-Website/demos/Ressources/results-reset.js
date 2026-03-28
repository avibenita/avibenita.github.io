/**
 * Results Reset Module
 * Universal reset mechanism for all result pages
 * 
 * Usage:
 *   <script src="results-reset.js"></script>
 *   
 * Then define your page-specific reset:
 *   window.resetResultsUI = function() {
 *     // Your custom reset logic here
 *     console.log('✅ Results page reset');
 *     return true;
 *   };
 * 
 * The module will automatically:
 * - Listen for explicit resets from InputsXL
 * - Support multiple communication channels (BroadcastChannel, localStorage, postMessage)
 * - NOT reset InputsXL when the results page loads
 */

(function() {
  'use strict';
  
  console.log('📦 Results Reset Module loaded');

  // ==============================================
  // Utility: Show/Hide Awaiting Panel
  // ==============================================
  window.showAwaitingPanel = window.showAwaitingPanel || function() {
    try {
      const awaitingPanel = document.getElementById('awaiting-panel');
      const resultsContainer = document.getElementById('results-container');
      const headerStrip = document.getElementById('header-strip');
      
      if (awaitingPanel) {
        awaitingPanel.style.removeProperty('display');
        awaitingPanel.style.display = 'flex';
      }
      if (resultsContainer) {
        resultsContainer.classList.remove('show');
        resultsContainer.style.removeProperty('display');
        resultsContainer.style.display = 'none';
      }
      if (headerStrip) {
        headerStrip.style.removeProperty('display');
        headerStrip.style.display = 'none';
      }
      
      console.log('👁️ Awaiting panel shown');
      return true;
    } catch(e) {
      console.error('Error showing awaiting panel:', e);
      return false;
    }
  };

  window.hideAwaitingPanel = window.hideAwaitingPanel || function() {
    try {
      const awaitingPanel = document.getElementById('awaiting-panel');
      const resultsContainer = document.getElementById('results-container');
      const headerStrip = document.getElementById('header-strip');
      
      if (awaitingPanel) {
        awaitingPanel.style.display = 'none';
      }
      if (resultsContainer) {
        resultsContainer.classList.add('show');
        resultsContainer.style.removeProperty('display');
        resultsContainer.style.display = 'flex';
      }
      if (headerStrip) {
        headerStrip.style.removeProperty('display');
        headerStrip.style.display = 'flex';
      }
      
      console.log('👁️ Results shown, awaiting panel hidden');
      return true;
    } catch(e) {
      console.error('Error hiding awaiting panel:', e);
      return false;
    }
  };

  // ==============================================
  // Reset Listener Setup
  // ==============================================
  
  /**
   * Set up all reset listeners
   * This will listen for explicit reset requests from InputsXL
   */
  function setupResetListeners() {
    // 1. BroadcastChannel listener (preferred for same-origin)
    try {
      const ch = new BroadcastChannel('statstico-results');
      ch.onmessage = function(ev) {
        const d = ev && ev.data;
        if (d && d.type === 'RESET_RESULTS_UI') {
          // Check if target matches (if specified)
          const target = d.target || 'all';
          if (target === 'all' || shouldResetForTarget(target)) {
            triggerReset('BroadcastChannel');
          }
        }
      };
      console.log('✅ BroadcastChannel reset listener active');
    } catch(e) {
      console.warn('⚠️ BroadcastChannel not available');
    }

    // 2. localStorage listener (cross-process fallback)
    try {
      window.addEventListener('storage', function(ev) {
        if (ev && ev.key === 'statsticoResetStamp') {
          triggerReset('localStorage');
        }
      });
      console.log('✅ localStorage reset listener active');
    } catch(e) {
      console.warn('⚠️ localStorage listener failed:', e);
    }

    // 3. postMessage listener (iframe fallback)
    try {
      window.addEventListener('message', function(ev) {
        const d = ev && ev.data;
        if (d && d.type === 'RESET_RESULTS_UI') {
          triggerReset('postMessage');
        }
      });
      console.log('✅ postMessage reset listener active');
    } catch(e) {
      console.warn('⚠️ postMessage listener failed:', e);
    }
  }

  /**
   * Check if this page should reset based on target
   */
  function shouldResetForTarget(target) {
    const pageName = getPageName();
    const targets = target.toLowerCase().split(',').map(function(t) { return t.trim(); });
    
    return targets.indexOf('all') !== -1 || 
           targets.indexOf(pageName) !== -1;
  }

  /**
   * Get the current page name for target matching
   */
  function getPageName() {
    const path = window.location.pathname.toLowerCase();
    if (path.indexOf('histogram') !== -1) return 'histogram';
    if (path.indexOf('normality') !== -1) return 'normality';
    if (path.indexOf('hypothesis') !== -1) return 'hypothesis';
    if (path.indexOf('boxplot') !== -1) return 'boxplot';
    if (path.indexOf('qq') !== -1 || path.indexOf('pp') !== -1) return 'qqplot';
    return 'unknown';
  }

  /**
   * Trigger the page-specific reset function
   */
  function triggerReset(source) {
    console.log('🔄 Reset triggered via:', source);
    
    try {
      // Call page-specific reset if available
      if (typeof window.resetResultsUI === 'function') {
        window.resetResultsUI();
        console.log('✅ Custom resetResultsUI executed');
      } else if (typeof window.resetHistogramUI === 'function') {
        window.resetHistogramUI();
        console.log('✅ Histogram resetHistogramUI executed');
      } else if (typeof window.resetNormalityDashboard === 'function') {
        window.resetNormalityDashboard();
        console.log('✅ Normality resetNormalityDashboard executed');
      } else {
        // Fallback: just show awaiting panel
        window.showAwaitingPanel();
        console.log('⚠️ No specific reset function found, showing awaiting panel');
      }
      
      return true;
    } catch(e) {
      console.error('❌ Reset failed:', e);
      return false;
    }
  }

  // ==============================================
  // Auto-initialize when DOM is ready
  // ==============================================
  function initialize() {
    console.log('🚀 Initializing Results Reset Module');
    setupResetListeners();
    console.log('✅ Reset listeners ready (waiting for explicit reset requests)');
  }

  // Initialize immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Expose the initialize function for manual setup if needed
  window.initializeResultsReset = initialize;
  
})();

