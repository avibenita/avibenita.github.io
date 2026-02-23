/*
  ================================================================
  SHARED DATA INPUT PANEL LOGIC
  ================================================================
  Handles Named Range, Used Range, and Use Selection functionality
  Common across all Statistico Analytics modules
  ================================================================
*/

/* global Excel, Office */

// Global state
let currentRangeData = null;
let currentRangeAddress = null;
let activeRangeOption = 0; // 1 = Named, 2 = Used, 3 = Selection

/**
 * Initialize the data input panel
 * Call this after Office.onReady()
 */
async function initDataInputPanel() {
  // Load named ranges
  await loadNamedRanges();
  
  // Watch for selection changes
  try {
    await Excel.run(async (context) => {
      context.workbook.onSelectionChanged.add(onSelectionChanged);
      await context.sync();
    });
  } catch (error) {
    console.log('Selection change listener not available:', error);
  }
  
  // Initial selection check
  onSelectionChanged();
  
  console.log('Data Input Panel initialized');
}

/**
 * Load named ranges from Excel workbook
 */
async function loadNamedRanges() {
  try {
    await Excel.run(async (context) => {
      const names = context.workbook.names.load('items');
      await context.sync();
      
      const selector = document.getElementById('rangeSelector');
      selector.innerHTML = '<option value="">-- Select Named Range --</option>';
      
      names.items.forEach(name => {
        const option = document.createElement('option');
        option.value = name.name;
        option.textContent = name.name;
        selector.appendChild(option);
      });
      
      console.log(`Loaded ${names.items.length} named ranges`);
    });
  } catch (error) {
    console.error('Failed to load named ranges:', error);
  }
}

// ============================================================================
// RANGE OPTION SELECTION (MUTUALLY EXCLUSIVE)
// ============================================================================

/**
 * Toggle Named Range dropdown
 */
function toggleNamedRangeDropdown() {
  const dropdown = document.getElementById('namedRangeDropdown');
  const isVisible = dropdown.style.display !== 'none';
  
  dropdown.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    setActiveRangeOption(1);
    loadNamedRanges(); // Refresh list
  }
}

/**
 * Load data from selected named range
 */
async function loadFromNamedRange() {
  const selector = document.getElementById('rangeSelector');
  const selectedName = selector.value;
  
  if (!selectedName) return;
  
  setActiveRangeOption(1); // Mark option 1 as active
  
  try {
    await Excel.run(async (context) => {
      const namedItem = context.workbook.names.getItem(selectedName);
      const range = namedItem.getRange();
      range.load(['address', 'values', 'rowCount', 'columnCount']);
      await context.sync();
      
      // Hide dropdown
      document.getElementById('namedRangeDropdown').style.display = 'none';
      
      // Show range display
      showRangeDisplay('Xls Address', range.address, true);
      
      // Process data
      processRangeData(range.values, range.address);
      
    });
  } catch (error) {
    showStatus('error', 'Failed to load named range: ' + error.message);
  }
}

/**
 * Auto-detect used range
 */
async function autoDetectRange() {
  setActiveRangeOption(2); // Mark option 2 as active
  
  try {
    await Excel.run(async (context) => {
      const activeCell = context.workbook.getActiveCell();
      const expandedRange = activeCell.getSurroundingRegion();
      expandedRange.load(['address', 'values', 'rowCount', 'columnCount']);
      await context.sync();
      
      showRangeDisplay('Xls Address', expandedRange.address, false);
      processRangeData(expandedRange.values, expandedRange.address);
    });
  } catch (error) {
    showStatus('error', 'Auto-detect failed: ' + error.message);
  }
}

/**
 * Use current Excel selection
 */
async function useSelection() {
  setActiveRangeOption(3); // Mark option 3 as active
  
  try {
    await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load(['address', 'values', 'rowCount', 'columnCount']);
      await context.sync();
      
      showRangeDisplay('Xls Address', range.address, false);
      processRangeData(range.values, range.address);
    });
  } catch (error) {
    showStatus('error', 'Failed to use selection: ' + error.message);
  }
}

/**
 * Set which button is currently active (mutually exclusive)
 */
function setActiveRangeOption(optionNum) {
  activeRangeOption = optionNum;
  
  // Remove active class from all
  document.getElementById('namedRangeBtn').classList.remove('active');
  document.getElementById('autoDetectBtn').classList.remove('active');
  document.getElementById('useSelectionBtn').classList.remove('active');
  
  // Add active class to selected
  if (optionNum === 1) {
    document.getElementById('namedRangeBtn').classList.add('active');
  } else if (optionNum === 2) {
    document.getElementById('autoDetectBtn').classList.add('active');
  } else if (optionNum === 3) {
    document.getElementById('useSelectionBtn').classList.add('active');
  }
}

/**
 * Show range display info
 */
function showRangeDisplay(title, address, isNamed) {
  const display = document.getElementById('rangeDisplay');
  const icon = document.getElementById('rangeIcon');
  const titleEl = document.getElementById('rangeTitle');
  const details = document.getElementById('rangeDetails');
  
  titleEl.textContent = title;
  details.textContent = address;
  
  // Update icon
  if (isNamed) {
    icon.className = 'fa-solid fa-bookmark';
  } else if (title.includes('Auto')) {
    icon.className = 'fa-solid fa-magic';
  } else {
    icon.className = 'fa-solid fa-check';
  }
  
  display.style.display = 'block';
}

/**
 * Process range data (to be customized by each module)
 */
function processRangeData(values, address) {
  currentRangeData = values;
  currentRangeAddress = address;
  
  console.log('Range data loaded:', {
    address: address,
    rows: values.length,
    cols: values[0]?.length || 0
  });
  
  // Fire custom event for module-specific handling
  const event = new CustomEvent('rangeDataLoaded', {
    detail: {
      values: values,
      address: address
    }
  });
  document.dispatchEvent(event);
  
  // Call module-specific handler if it exists
  if (typeof onRangeDataLoaded === 'function') {
    onRangeDataLoaded(values, address);
  }
}

/**
 * Get current range data
 */
function getCurrentRangeData() {
  return {
    values: currentRangeData,
    address: currentRangeAddress
  };
}

/**
 * Handle Excel selection changes
 */
function onSelectionChanged() {
  if (!Office.context || !Office.context.document) {
    return;
  }
  
  // Debounce
  clearTimeout(window.selectionTimeout);
  window.selectionTimeout = setTimeout(async () => {
    try {
      await Excel.run(async (context) => {
        const range = context.workbook.getSelectedRange();
        range.load(['rowCount', 'columnCount']);
        await context.sync();
        
        const btnUseSelection = document.getElementById('useSelectionBtn');
        if (range.rowCount > 1 && range.columnCount > 0) {
          btnUseSelection.disabled = false;
        } else {
          btnUseSelection.disabled = true;
        }
      });
    } catch (error) {
      // Silently fail if Excel is not ready
    }
  }, 500);
}

/**
 * Show status message (module should implement this)
 */
function showStatus(type, message) {
  console.log(`[${type}] ${message}`);
  
  // If module has showError/showMessage function, use it
  if (type === 'error' && typeof showError === 'function') {
    showError(message);
  } else if (typeof showMessage === 'function') {
    showMessage(message, type);
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('namedRangeDropdown');
  const btn = document.getElementById('namedRangeBtn');
  
  if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});
