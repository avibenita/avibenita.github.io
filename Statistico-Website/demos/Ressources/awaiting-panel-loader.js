/**
 * Awaiting Panel Loader
 * Dynamically loads the awaiting data panel HTML
 * 
 * Usage:
 *   <div id="awaiting-panel-container"></div>
 *   <script src="awaiting-panel-loader.js"></script>
 * 
 * Or manually:
 *   loadAwaitingPanel('awaiting-panel-container');
 */

(function() {
  'use strict';

  /**
   * Load the awaiting panel HTML into a container
   * @param {string} containerId - ID of the container element
   * @param {function} callback - Optional callback when loaded
   */
  window.loadAwaitingPanel = function(containerId, callback) {
    containerId = containerId || 'awaiting-panel-container';
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error('❌ Awaiting panel container not found:', containerId);
      return false;
    }

    // Try to load via fetch
    fetch('awaiting-data-panel.html')
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to load awaiting panel: ' + response.status);
        }
        return response.text();
      })
      .then(function(html) {
        container.innerHTML = html;
        console.log('✅ Awaiting panel loaded into:', containerId);
        if (callback) callback();
      })
      .catch(function(error) {
        console.error('❌ Error loading awaiting panel:', error);
        // Fallback: create minimal awaiting panel inline
        container.innerHTML = createFallbackAwaitingPanel();
        console.log('⚠️ Using fallback awaiting panel');
        if (callback) callback();
      });
    
    return true;
  };

  /**
   * Create a minimal fallback awaiting panel if file can't be loaded
   */
  function createFallbackAwaitingPanel() {
    return `
      <style>
        .await-hero { text-align: center; padding: 40px; }
        .await-title { font-size: 2rem; font-weight: 700; color: var(--accent-1, rgb(255,165,120)); margin-bottom: 20px; }
        .await-instruction { font-size: 14px; color: var(--text-secondary, rgba(255,255,255,0.8)); line-height: 1.5; max-width: 360px; margin: 0 auto; }
        .loading-dots::after { content: ''; animation: ellipsis 1.5s infinite; }
        @keyframes ellipsis { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: ''; } }
      </style>
      <div class="panel-row" id="awaiting-panel" style="display: flex;">
        <div class="panel" style="width: 100%; min-height: calc(100vh - 200px);">
          <div class="panel-body" style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 40px;">
            <div class="await-hero">
              <div class="await-title">Awaiting Data<span class="loading-dots"></span></div>
              <div class="await-instruction">
                Please select a range and variable in the input panel to display results.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Auto-load if container exists
   */
  function autoLoad() {
    const container = document.getElementById('awaiting-panel-container');
    if (container) {
      console.log('🔄 Auto-loading awaiting panel...');
      window.loadAwaitingPanel('awaiting-panel-container');
    }
  }

  // Auto-load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLoad);
  } else {
    autoLoad();
  }

})();

