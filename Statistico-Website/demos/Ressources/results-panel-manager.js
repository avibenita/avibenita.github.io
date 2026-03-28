/**
 * Results Panel Manager Module
 * Handles reset mechanism and "Awaiting Data" overlay for all result panels
 * 
 * Usage:
 * 1. Include this script in your result page HTML
 * 2. Define window.onDataReceived() to specify what happens when data arrives
 * 3. Call window.resetResultsPanel() to reset your specific UI elements
 * 
 * The module will automatically:
 * - Show awaiting overlay on page load
 * - Listen for reset signals from InputsXL (BroadcastChannel, localStorage, postMessage)
 * - Hide awaiting overlay when data arrives
 * - Show awaiting overlay when reset is triggered
 */

(function() {
  'use strict';
  
  console.log('📦 Results Panel Manager loading...');
  
  // Configuration
  const OVERLAY_ID = 'statstico-awaiting-overlay';
  const LOADER_ID = 'statstico-navigation-loader';
  const BROADCAST_CHANNEL_NAME = 'statstico-results';
  const STORAGE_KEY = 'statsticoResetStamp';
  const NAVIGATION_LOADING_KEY = 'statsticoNavigationLoading';
  
  // Create and inject awaiting overlay
  function createAwaitingOverlay() {
    // Check if overlay already exists
    if (document.getElementById(OVERLAY_ID)) {
      console.log('⚠️ Awaiting overlay already exists');
      return;
    }
    
    // Get custom instructions from page (if defined)
    const customInstructions = window.AWAITING_PANEL_INSTRUCTIONS || `
      <div style="text-align: left; color: #8b95a5; font-size: 14px; line-height: 1.8; max-width: 420px; padding: 0 20px;">
        <div style="margin-bottom: 8px;">📊 <strong style="color: #ffa500;">Select a range</strong> in the input panel</div>
        <div style="margin-bottom: 8px;">🎯 <strong style="color: #ffa500;">Choose a variable</strong> to analyze</div>
        <div style="margin-bottom: 8px;">⚡ <strong style="color: #ffa500;">Results update automatically</strong> when data is ready</div>
        <div>🔄 Use the <strong style="color: #ffa500;">dropdown menu</strong> (top right) to switch analyses</div>
      </div>
    `;
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(40, 44, 57, 0.98);
      z-index: 500000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `;
    
    overlay.innerHTML = `
      <style>
        @keyframes ellipsis {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        
        @keyframes bounceHorizontal {
          0%, 100% { transform: translateX(0); opacity: 0.7; }
          50% { transform: translateX(-10px); opacity: 1; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .loading-dots::after {
          content: '';
          animation: ellipsis 1.5s infinite;
        }
        
        .awaiting-content {
          animation: fadeIn 0.6s ease-out;
        }
      </style>
      <div class="awaiting-content">
        <div style="text-align: center; color: #e0e6ed; font-size: 2rem; font-weight: 700; margin-bottom: 30px;">
          Awaiting Data<span class="loading-dots" style="display: inline-block; width: 30px;"></span>
        </div>
        ${customInstructions}
        <div style="margin-top: 30px; text-align: center; color: #ffa500; font-size: 3rem; animation: bounceHorizontal 2s ease-in-out infinite;">
          <i class="fas fa-angles-left"></i>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    console.log('✅ Awaiting overlay created with custom instructions');
  }
  
  // Show awaiting overlay
  function showAwaitingOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.style.display = 'flex';
      console.log('👁️ Awaiting overlay shown');
    } else {
      console.warn('⚠️ Awaiting overlay not found, creating it...');
      createAwaitingOverlay();
    }
    
    // ✅ Clear header completely when showing awaiting panel
    if (typeof window.updateHeaderCenter === 'function') {
      window.updateHeaderCenter({
        analysisName: '',
        variableName: '',
        sampleSize: 0
      });
      console.log('🧹 Header cleared completely - awaiting data');
    }
    
    // ✅ Hide help button when awaiting panel is shown
    const helpButton = document.querySelector('help-button');
    if (helpButton) {
      helpButton.style.setProperty('display', 'none', 'important');
      console.log('🔒 Help button hidden - awaiting data');
    }
  }
  
  // Hide awaiting overlay
  function hideAwaitingOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.style.display = 'none';
      console.log('👁️ Awaiting overlay hidden');
    }
    
    // ✅ Show help button when awaiting panel is hidden
    const helpButton = document.querySelector('help-button');
    if (helpButton) {
      helpButton.style.setProperty('display', 'block', 'important');
      console.log('🔓 Help button shown - data received');
    }
  }
  
  // ========== Navigation Loader (for dashboard transitions) ==========
  
  // Create navigation loader overlay
  function createNavigationLoader() {
    if (document.getElementById(LOADER_ID)) {
      return;
    }
    
    const loader = document.createElement('div');
    loader.id = LOADER_ID;
    loader.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(12, 22, 36, 0.85);
      z-index: 600000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: all;
    `;
    
    loader.innerHTML = `
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .loader-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 165, 120, 0.2);
          border-top: 4px solid rgb(255, 165, 120);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .loader-text {
          margin-top: 20px;
          font-size: 16px;
          color: rgb(255, 165, 120);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          animation: pulse 1.5s ease-in-out infinite;
        }
      </style>
      <div class="loader-spinner"></div>
      <div class="loader-text">Loading Dashboard...</div>
    `;
    
    document.body.appendChild(loader);
    console.log('🔄 Navigation loader created');
  }
  
  // Show navigation loader
  function showNavigationLoader() {
    const loader = document.getElementById(LOADER_ID);
    if (loader) {
      loader.style.display = 'flex';
      console.log('🔄 Navigation loader shown');
    } else {
      createNavigationLoader();
    }
  }
  
  // Hide navigation loader
  function hideNavigationLoader() {
    const loader = document.getElementById(LOADER_ID);
    if (loader) {
      loader.style.display = 'none';
      console.log('✅ Navigation loader hidden');
    }
  }
  
  // ========== End Navigation Loader ==========
  
  // Handle reset event
  function handleReset() {
    console.log('🔄 Results Panel Manager: Reset triggered');
    
    // Show awaiting overlay
    showAwaitingOverlay();
    
    // ✅ Disable dropdown menu (user must select range first)
    if (typeof window.disableAnalysisMenu === 'function') {
      window.disableAnalysisMenu();
      console.log('🔒 Dropdown menu disabled - awaiting data selection');
    }
    
    // Call page-specific reset function if defined
    if (typeof window.resetResultsPanel === 'function') {
      try {
        window.resetResultsPanel();
        console.log('✅ Page-specific resetResultsPanel() executed');
      } catch (err) {
        console.error('❌ Error in resetResultsPanel():', err);
      }
    } else {
      console.warn('⚠️ window.resetResultsPanel() not defined - define it to handle page-specific resets');
    }
  }
  
  // Listen for reset signals via BroadcastChannel
  function setupBroadcastChannelListener() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'RESET_RESULTS_UI') {
            console.log('📡 BroadcastChannel reset received:', event.data);
            handleReset();
          }
        });
        console.log('✅ BroadcastChannel listener registered');
      } catch (err) {
        console.warn('⚠️ BroadcastChannel not available:', err);
      }
    }
  }
  
  // Listen for reset signals via localStorage
  function setupStorageListener() {
    window.addEventListener('storage', function(event) {
      if (event.key === STORAGE_KEY && event.newValue) {
        console.log('📡 localStorage reset received:', event.newValue);
        handleReset();
      }
    });
    console.log('✅ localStorage listener registered');
  }
  
  // Listen for reset signals via postMessage
  function setupPostMessageListener() {
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'RESET_RESULTS_UI') {
        console.log('📡 postMessage reset received:', event.data);
        handleReset();
      }
    });
    console.log('✅ postMessage listener registered');
  }
  
  // Expose global functions
  window.showAwaitingPanel = showAwaitingOverlay;
  window.hideAwaitingPanel = hideAwaitingOverlay;
  window.triggerResultsReset = handleReset;
  window.showNavigationLoader = showNavigationLoader;
  window.hideNavigationLoader = hideNavigationLoader;
  
  // Wrap onDataReceived to auto-hide awaiting overlay
  window.notifyDataReceived = function() {
    console.log('📥 Data received notification');
    hideAwaitingOverlay();
    
    // ✅ Re-enable dropdown menu (data is now available)
    if (typeof window.enableAnalysisMenu === 'function') {
      window.enableAnalysisMenu();
      console.log('🔓 Dropdown menu enabled - data received');
    }
    
    // Call page-specific onDataReceived if defined
    if (typeof window.onDataReceived === 'function') {
      try {
        window.onDataReceived();
        console.log('✅ Page-specific onDataReceived() executed');
      } catch (err) {
        console.error('❌ Error in onDataReceived():', err);
      }
    }
  };
  
  // Initialize on DOMContentLoaded
  function initialize() {
    console.log('🚀 Results Panel Manager initializing...');
    
    // ✅ Check if navigation is in progress
    try {
      const navigationLoading = localStorage.getItem(NAVIGATION_LOADING_KEY);
      if (navigationLoading) {
        console.log('🔄 Navigation in progress, showing loader...');
        createNavigationLoader();
        showNavigationLoader();
        
        // Hide loader after page fully renders
        setTimeout(() => {
          hideNavigationLoader();
          localStorage.removeItem(NAVIGATION_LOADING_KEY);
          console.log('✅ Navigation complete, loader hidden');
        }, 500); // Small delay to ensure smooth transition
      }
    } catch (e) {
      console.warn('⚠️ Could not check navigation loading state:', e);
    }
    
    // Create and show awaiting overlay
    createAwaitingOverlay();
    
    // ✅ Clear header completely on initial load (no data yet)
    if (typeof window.updateHeaderCenter === 'function') {
      window.updateHeaderCenter({
        analysisName: '',
        variableName: '',
        sampleSize: 0
      });
      console.log('🧹 Header cleared completely on init - no data');
    }
    
    showAwaitingOverlay();
    
    // ✅ Disable dropdown menu on initial load (no data selected yet)
    if (typeof window.disableAnalysisMenu === 'function') {
      window.disableAnalysisMenu();
      console.log('🔒 Dropdown menu disabled on init - awaiting first data selection');
    }
    
    // Setup listeners
    setupBroadcastChannelListener();
    setupStorageListener();
    setupPostMessageListener();
    
    console.log('✅ Results Panel Manager ready');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})();

