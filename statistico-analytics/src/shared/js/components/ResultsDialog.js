/*
  ================================================================
  SHARED RESULTS DIALOG LOGIC
  ================================================================
  Universal dropdown navigation and view switching for all results dialogs
  ================================================================
*/

/* global Office */

// Global state
let currentView = null;
let resultsData = null;
let availableViews = {};

/**
 * Initialize results dialog
 * @param {Object} config - Configuration object
 * @param {string} config.defaultView - Initial view name
 * @param {Object} config.views - Object mapping view names to display functions
 * @param {string} config.storageKey - localStorage key for results data
 */
function initResultsDialog(config) {
  const { defaultView, views, storageKey } = config;
  
  currentView = defaultView;
  availableViews = views;
  
  Office.onReady((info) => {
    console.log('✅ Results dialog initialized');
    
    // Load results from localStorage
    loadResults(storageKey);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      const dropdown = document.getElementById('navDropdown');
      if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  });
}

/**
 * Toggle dropdown menu
 */
function toggleDropdown() {
  console.log('🔽 toggleDropdown() called');
  const dropdown = document.getElementById('navDropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
    console.log('Dropdown classes:', dropdown.className);
  } else {
    console.error('❌ Dropdown element not found!');
  }
}

/**
 * Show a specific view
 * @param {string} viewName - Name of the view to display
 */
function showView(viewName) {
  console.log('📄 Switching to view:', viewName);
  
  if (!availableViews[viewName]) {
    console.error(`❌ View '${viewName}' not found!`);
    return;
  }
  
  currentView = viewName;
  
  // Update selected menu item
  document.querySelectorAll('.dropdown-content a').forEach(a => a.classList.remove('selected'));
  const navItem = document.getElementById('nav-' + viewName);
  if (navItem) {
    navItem.classList.add('selected');
  }
  
  // Close dropdown
  const dropdown = document.getElementById('navDropdown');
  if (dropdown) {
    dropdown.classList.remove('open');
  }
  
  // Call the view's display function
  try {
    availableViews[viewName](resultsData);
  } catch (error) {
    console.error(`❌ Error displaying view '${viewName}':`, error);
    showError(`Failed to display ${viewName}: ${error.message}`);
  }
}

/**
 * Load results from localStorage
 * @param {string} storageKey - localStorage key
 */
function loadResults(storageKey) {
  console.log('🔍 Looking for results in localStorage with key:', storageKey);
  
  const resultsJSON = localStorage.getItem(storageKey);
  
  if (resultsJSON) {
    console.log('✅ Found results in localStorage!');
    try {
      resultsData = JSON.parse(resultsJSON);
      console.log('📊 Parsed results:', resultsData);
      
      // Display initial view
      if (currentView && availableViews[currentView]) {
        availableViews[currentView](resultsData);
      }
      
      console.log('💾 Results cached for view switching');
    } catch (e) {
      console.error('❌ Error parsing results:', e);
      showError('Failed to load results: ' + e.message);
    }
  } else {
    console.warn('⚠️ No results found in localStorage');
    showError('No results data found. Please run analysis again.');
  }
}

/**
 * Update page title
 * @param {string} title - New title
 */
function updatePageTitle(title) {
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) {
    titleEl.textContent = title;
  }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  const content = document.getElementById('resultsContent');
  if (content) {
    content.innerHTML = `
      <div class="loading">
        <i class="fa-solid fa-exclamation-triangle" style="font-size: 40px; color: #ff6b6b; margin-bottom: 16px;"></i>
        <div style="color: #ff6b6b;">${message}</div>
      </div>
    `;
  }
}

/**
 * Show loading state
 */
function showLoading(message = 'Loading...') {
  const content = document.getElementById('resultsContent');
  if (content) {
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <div>${message}</div>
      </div>
    `;
  }
}

/**
 * Close the dialog
 */
function closeDialog() {
  console.log('🚪 Closing dialog...');
  try {
    // For Office.js dialogs, send message to parent to close
    if (Office.context.ui) {
      Office.context.ui.messageParent('close');
    }
  } catch (err) {
    console.error('Error closing dialog:', err);
    // Fallback: try window.close
    window.close();
  }
}

/**
 * Get current results data
 * @returns {Object} Current results data
 */
function getCurrentResults() {
  return resultsData;
}

/**
 * Helper: Format number to fixed decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
function formatNumber(value, decimals = 4) {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return parseFloat(value).toFixed(decimals);
}

/**
 * Helper: Create interpretation text based on statistical values
 * @param {number} value - Statistical value
 * @param {Object} thresholds - Threshold object with interpretations
 * @returns {string} Interpretation text
 */
function interpretValue(value, thresholds) {
  for (const [threshold, text] of Object.entries(thresholds)) {
    const [operator, limit] = threshold.split(' ');
    const limitNum = parseFloat(limit);
    
    if (operator === '<' && value < limitNum) return text;
    if (operator === '>' && value > limitNum) return text;
    if (operator === '<=' && value <= limitNum) return text;
    if (operator === '>=' && value >= limitNum) return text;
  }
  
  return thresholds.default || '';
}
