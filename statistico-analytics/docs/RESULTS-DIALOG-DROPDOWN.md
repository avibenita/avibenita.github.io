# Universal Results Dialog Dropdown System

## Overview

All Statistico Analytics modules share a **universal dropdown navigation system** in their results dialogs. This provides a consistent user experience and allows users to switch between different analysis views without closing the dialog.

---

## Architecture

### Shared Components

1. **`src/shared/css/results-dialog.css`** - Universal styles for all results dialogs
2. **`src/shared/js/components/ResultsDialog.js`** - Dropdown logic and view switching
3. **Module-specific result files** - e.g., `dialogs/univariate-results.html`

---

## Features

✅ **Dropdown Menu** - Switch between different analysis views  
✅ **Active State** - Highlighted current view  
✅ **Smooth Transitions** - Professional animations  
✅ **Consistent Design** - Same look & feel across all modules  
✅ **localStorage Integration** - Results persist across view switches  

---

## How to Create a Results Dialog for Your Module

### Step 1: Create the HTML File

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Module Results</title>
    
    <!-- Office.js -->
    <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
    
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet" />
    
    <!-- Shared Results Dialog CSS -->
    <link rel="stylesheet" href="../src/shared/css/results-dialog.css">
</head>
<body>
    <div class="results-container">
        <!-- Header with Dropdown -->
        <div class="dialog-header">
            <h1><i class="fa-solid fa-chart-line"></i> <span id="pageTitle">Your Module Results</span></h1>
            <div class="dialog-header-controls">
                <div class="dropdown-container" id="navDropdown">
                    <button class="dropdown-btn" onclick="toggleDropdown()">
                        <i class="fa-solid fa-bars"></i>
                        Analysis Menu
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="dropdown-content">
                        <!-- Add your views here -->
                        <a onclick="showView('overview')" class="selected" id="nav-overview">
                            <span class="nav-icon"><i class="fa-solid fa-table"></i></span>Overview
                        </a>
                        <a onclick="showView('details')" id="nav-details">
                            <span class="nav-icon"><i class="fa-solid fa-list"></i></span>Details
                        </a>
                        <div class="dropdown-separator"></div>
                        <a onclick="showView('visualization')" id="nav-visualization">
                            <span class="nav-icon"><i class="fa-solid fa-chart-bar"></i></span>Visualization
                        </a>
                    </div>
                </div>
                <button class="close-btn" onclick="closeDialog()">
                    <i class="fa-solid fa-times"></i> Close
                </button>
            </div>
        </div>

        <!-- Results Content -->
        <div id="resultsContent">
            <div class="loading">
                <div class="spinner"></div>
                <div>Loading results...</div>
            </div>
        </div>
    </div>

    <!-- Shared Results Dialog JS -->
    <script src="../src/shared/js/components/ResultsDialog.js"></script>
    
    <!-- Your view functions -->
    <script src="your-module-results.js"></script>
</body>
</html>
```

### Step 2: Create View Functions

In your `your-module-results.js`:

```javascript
// Initialize dialog
initResultsDialog({
    defaultView: 'overview',
    storageKey: 'yourModuleResults', // MUST match what taskpane stores
    views: {
        overview: displayOverviewView,
        details: displayDetailsView,
        visualization: displayVisualizationView
    }
});

/**
 * Overview View
 */
function displayOverviewView(data) {
    if (!data) return;
    
    updatePageTitle('Overview');
    
    const html = `
        <div class="stats-container">
            <div class="stat-panel">
                <div class="stat-panel-heading">
                    <i class="fa-solid fa-info-circle"></i> Summary
                </div>
                <div class="stat-panel-body">
                    <div class="stat-field">
                        <span class="stat-label">Sample Size:</span>
                        <span class="stat-value">${data.n}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('resultsContent').innerHTML = html;
}

/**
 * Details View
 */
function displayDetailsView(data) {
    if (!data) return;
    
    updatePageTitle('Detailed Results');
    
    // Your detailed view HTML here
}

/**
 * Visualization View
 */
function displayVisualizationView(data) {
    if (!data) return;
    
    updatePageTitle('Visualization');
    
    // Your visualization HTML here
}
```

### Step 3: Store Results in Taskpane

In your taskpane JavaScript, before opening the dialog:

```javascript
function openResultsDialog(results) {
    // IMPORTANT: Store with matching storageKey
    localStorage.setItem('yourModuleResults', JSON.stringify(results));
    
    const dialogUrl = 'https://www.statistico.live/statistico-analytics/dialogs/your-module-results.html';
    
    Office.context.ui.displayDialogAsync(
        dialogUrl,
        { height: 90, width: 95, displayInIframe: false },
        (asyncResult) => {
            if (asyncResult.status === Office.AsyncResultStatus.Failed) {
                console.error('Failed to open dialog:', asyncResult.error);
            }
        }
    );
}
```

---

## Available Helper Functions

### From `ResultsDialog.js`

- **`toggleDropdown()`** - Toggle dropdown visibility
- **`showView(viewName)`** - Switch to a specific view
- **`updatePageTitle(title)`** - Update the page title
- **`showError(message)`** - Display error message
- **`showLoading(message)`** - Display loading state
- **`closeDialog()`** - Close the dialog window
- **`getCurrentResults()`** - Get current results data
- **`formatNumber(value, decimals)`** - Format numbers
- **`interpretValue(value, thresholds)`** - Generate interpretations

---

## HTML Components Available

### Stats Container

```html
<div class="stats-container">
    <div class="stat-panel">
        <div class="stat-panel-heading">
            <i class="fa-solid fa-info-circle"></i> Panel Title
        </div>
        <div class="stat-panel-body">
            <div class="stat-field">
                <span class="stat-label">Label:</span>
                <span class="stat-value">Value</span>
            </div>
        </div>
    </div>
</div>
```

### Table

```html
<div class="table-container">
    <div class="table-heading">
        <i class="fa-solid fa-table"></i> Table Title
    </div>
    <table>
        <thead>
            <tr>
                <th>Column 1</th>
                <th>Column 2</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Data 1</td>
                <td>Data 2</td>
            </tr>
        </tbody>
    </table>
</div>
```

### Interpretation Box

```html
<div class="interpretation">
    <strong><i class="fa-solid fa-lightbulb"></i> Interpretation:</strong><br><br>
    Your interpretation text here.
</div>
```

### Note Box

```html
<div class="note">
    <strong><i class="fa-solid fa-info-circle"></i> Note:</strong><br><br>
    Your note text here.
</div>
```

### Card

```html
<div class="card">
    <h3><i class="fa-solid fa-chart-bar"></i> Card Title</h3>
    <p>Card content here.</p>
</div>
```

---

## Example Dropdown Menus

### For Univariate Analysis

```html
<div class="dropdown-content">
    <a onclick="showView('descriptive')" class="selected" id="nav-descriptive">
        <span class="nav-icon"><i class="fa-solid fa-table"></i></span>Descriptive Statistics
    </a>
    <a onclick="showView('distribution')" id="nav-distribution">
        <span class="nav-icon"><i class="fa-solid fa-chart-area"></i></span>Distribution Analysis
    </a>
    <a onclick="showView('normality')" id="nav-normality">
        <span class="nav-icon"><i class="fa-solid fa-vial"></i></span>Normality Tests
    </a>
    <div class="dropdown-separator"></div>
    <a onclick="showView('histogram')" id="nav-histogram">
        <span class="nav-icon"><i class="fa-solid fa-chart-column"></i></span>Histogram
    </a>
</div>
```

### For Regression Analysis

```html
<div class="dropdown-content">
    <a onclick="showView('regression')" class="selected" id="nav-regression">
        <span class="nav-icon"><i class="fa-solid fa-chart-line"></i></span>Regression Results
    </a>
    <a onclick="showView('anova')" id="nav-anova">
        <span class="nav-icon"><i class="fa-solid fa-table-cells"></i></span>ANOVA
    </a>
    <a onclick="showView('residuals')" id="nav-residuals">
        <span class="nav-icon"><i class="fa-solid fa-chart-scatter"></i></span>Residual Analysis
    </a>
    <a onclick="showView('diagnostics')" id="nav-diagnostics">
        <span class="nav-icon"><i class="fa-solid fa-stethoscope"></i></span>Diagnostics
    </a>
</div>
```

### For Correlation Analysis

```html
<div class="dropdown-content">
    <a onclick="showView('matrix')" class="selected" id="nav-matrix">
        <span class="nav-icon"><i class="fa-solid fa-table"></i></span>Correlation Matrix
    </a>
    <a onclick="showView('network')" id="nav-network">
        <span class="nav-icon"><i class="fa-solid fa-diagram-project"></i></span>Network Graph
    </a>
    <a onclick="showView('heatmap')" id="nav-heatmap">
        <span class="nav-icon"><i class="fa-solid fa-fire"></i></span>Heatmap
    </a>
</div>
```

---

## Benefits

1. **Consistency** - Same UX across all modules
2. **Maintainability** - Fix bugs once, all modules benefit
3. **Extensibility** - Easy to add new views
4. **Professional** - Modern dropdown with smooth animations
5. **User-Friendly** - No need to close/reopen dialogs

---

## Testing Checklist

- [ ] Dropdown opens/closes smoothly
- [ ] Views switch without errors
- [ ] Active view is highlighted
- [ ] Page title updates correctly
- [ ] Close button works
- [ ] Clicking outside closes dropdown
- [ ] Results persist across view switches
- [ ] Works in Excel desktop
- [ ] Works in Excel Online
- [ ] Mobile-responsive (if applicable)

---

## See Example

**Live Example:** `dialogs/univariate-results.html`

This file demonstrates all features:
- 6 different views
- Dropdown navigation
- Multiple HTML components
- Interpretations and notes
- Professional styling
