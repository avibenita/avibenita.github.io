# Data Input Panel - Usage Guide

## Overview

The **Data Input Panel** is a shared, reusable component that provides consistent data selection across all Statistico Analytics modules.

It includes three mutually exclusive options:
1. **Named Range** - Select from Excel named ranges
2. **Used Range** - Auto-detect continuous data
3. **Use Selection** - Use currently selected cells

---

## Files

- `src/shared/components/data-input-panel.html` - HTML structure
- `src/shared/css/data-input-panel.css` - Styling (matches regression module)
- `src/shared/js/components/DataInputPanel.js` - JavaScript logic

---

## How to Use in Your Module

### Step 1: Include Required Files in HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Office.js -->
  <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
  
  <!-- Font Awesome (Required for icons) -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet" />
  
  <!-- Shared Data Input Panel CSS -->
  <link rel="stylesheet" href="../../src/shared/css/data-input-panel.css">
  
  <!-- Module-specific styles -->
  <style>
    /* Your module styles here */
  </style>
</head>
<body>
  <!-- Include the data input panel HTML -->
  <div id="dataInputContainer"></div>
  
  <!-- Shared Data Input Panel JS -->
  <script src="../../src/shared/js/components/DataInputPanel.js"></script>
  
  <!-- Module-specific JS -->
  <script src="your-module.js"></script>
</body>
</html>
```

### Step 2: Load the HTML Component

```javascript
// In your module's initialization
Office.onReady(async (info) => {
  if (info.host === Office.HostType.Excel) {
    // Load the shared data input panel
    await loadDataInputPanel();
    
    // Initialize it
    await initDataInputPanel();
    
    // Your module-specific initialization
    initYourModule();
  }
});

async function loadDataInputPanel() {
  const container = document.getElementById('dataInputContainer');
  const response = await fetch('../../src/shared/components/data-input-panel.html');
  const html = await response.text();
  container.innerHTML = html;
}
```

### Step 3: Handle Data Loading (Two Methods)

#### Method A: Custom Event Listener

```javascript
document.addEventListener('rangeDataLoaded', (event) => {
  const { values, address } = event.detail;
  
  console.log('Data loaded:', values);
  console.log('From address:', address);
  
  // Process your data here
  processYourData(values);
});
```

#### Method B: Callback Function

```javascript
// Define this function globally in your module
function onRangeDataLoaded(values, address) {
  console.log('Data loaded:', values);
  console.log('From address:', address);
  
  // Process your data here
  processYourData(values);
}
```

### Step 4: Access Current Data Anytime

```javascript
// Get currently loaded data
const { values, address } = getCurrentRangeData();

if (values) {
  console.log('Current data:', values);
} else {
  console.log('No data loaded yet');
}
```

---

## Complete Example: Univariate Module

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Univariate Analysis</title>
  
  <!-- Office.js -->
  <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
  
  <!-- Font Awesome -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet" />
  
  <!-- Shared Styles -->
  <link rel="stylesheet" href="../../src/shared/css/data-input-panel.css">
  
  <style>
    body {
      background: var(--surface-0);
      color: var(--text-primary);
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    
    .main-container {
      padding: 20px;
    }
    
    .run-button {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.1em;
      font-weight: 600;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="main-container">
    <h1>Univariate Analysis</h1>
    
    <!-- Data Input Panel (loaded dynamically) -->
    <div id="dataInputContainer"></div>
    
    <!-- Your module-specific UI -->
    <button class="run-button" onclick="runAnalysis()">Run Analysis</button>
  </div>
  
  <!-- Shared Data Input Panel JS -->
  <script src="../../src/shared/js/components/DataInputPanel.js"></script>
  
  <script>
    Office.onReady(async (info) => {
      if (info.host === Office.HostType.Excel) {
        await loadDataInputPanel();
        await initDataInputPanel();
      }
    });
    
    async function loadDataInputPanel() {
      const container = document.getElementById('dataInputContainer');
      const response = await fetch('../../src/shared/components/data-input-panel.html');
      const html = await response.text();
      container.innerHTML = html;
    }
    
    // Handle data loading
    document.addEventListener('rangeDataLoaded', (event) => {
      const { values, address } = event.detail;
      console.log('Data loaded for univariate analysis:', values);
    });
    
    function runAnalysis() {
      const { values, address } = getCurrentRangeData();
      
      if (!values) {
        alert('Please select data first');
        return;
      }
      
      // Run your analysis
      console.log('Running analysis on:', values);
    }
  </script>
</body>
</html>
```

---

## Benefits

✅ **Consistent UX** - All modules use the same data selection interface  
✅ **Maintainability** - Fix bugs once, all modules benefit  
✅ **Matches Regression Module** - Uses exact same styling and behavior  
✅ **Reusable** - Drop into any new module with minimal code  

---

## Customization

Each module can customize what happens after data is loaded by implementing:

```javascript
function onRangeDataLoaded(values, address) {
  // Your module-specific processing
  if (isValidForMyModule(values)) {
    processData(values);
  } else {
    showError('Invalid data for this analysis');
  }
}
```

---

## API Reference

### Functions

- `initDataInputPanel()` - Initialize the panel (call after Office.onReady)
- `loadNamedRanges()` - Refresh the named ranges list
- `toggleNamedRangeDropdown()` - Show/hide named range dropdown
- `loadFromNamedRange()` - Load data from selected named range
- `autoDetectRange()` - Auto-detect continuous data range
- `useSelection()` - Use currently selected Excel range
- `getCurrentRangeData()` - Get currently loaded data `{ values, address }`
- `setActiveRangeOption(num)` - Set active button (1=Named, 2=Used, 3=Selection)
- `showRangeDisplay(title, address, isNamed)` - Show the range info display

### Events

- `rangeDataLoaded` - Fired when new data is loaded
  - `event.detail.values` - 2D array of cell values
  - `event.detail.address` - Excel address string

### Global Variables

- `currentRangeData` - Currently loaded 2D array
- `currentRangeAddress` - Currently loaded address string
- `activeRangeOption` - Active button (1, 2, or 3)
