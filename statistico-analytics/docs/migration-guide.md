# Migration Guide

Guide for migrating existing analysis modules to the new unified Statistico Analytics architecture.

## Table of Contents

- [Overview](#overview)
- [Before You Start](#before-you-start)
- [Migration Strategy](#migration-strategy)
- [Step-by-Step Migration](#step-by-step-migration)
- [Component Mapping](#component-mapping)
- [Code Transformations](#code-transformations)
- [Testing Migrated Modules](#testing-migrated-modules)
- [Rollback Plan](#rollback-plan)

## Overview

### What's Changed

**Old Architecture:**
- Monolithic HTML files with embedded CSS and JavaScript
- Duplicated code across modules
- Inconsistent UI/UX
- No shared components

**New Architecture:**
- Modular ES6 JavaScript
- Shared CSS/JS components
- Unified UI/UX
- BaseAnalyticsModule class
- Reusable InputPanel and ResultsPopup components

### Benefits of Migration

✅ **Reduced Code Duplication**: Shared components reduce maintenance
✅ **Consistent UI/UX**: All modules look and behave the same
✅ **Easier Maintenance**: Changes to shared components affect all modules
✅ **Better Testing**: Modular code is easier to test
✅ **Improved Developer Experience**: Clear structure and conventions

## Before You Start

### Prerequisites

1. **Backup**: Create backup of existing module
2. **Review**: Understand the new architecture
3. **Dependencies**: Identify module-specific dependencies
4. **Test Data**: Prepare test data for validation

### Estimated Time

- Simple module: 2-4 hours
- Complex module: 1-2 days

## Migration Strategy

### Approach 1: Incremental (Recommended)

Migrate one module at a time, testing thoroughly before moving to the next.

**Pros:**
- Lower risk
- Easy to rollback
- Learn as you go

**Cons:**
- Takes longer
- Temporary inconsistency

### Approach 2: Big Bang

Migrate all modules at once.

**Pros:**
- Faster overall
- Immediate consistency

**Cons:**
- Higher risk
- Harder to debug issues
- All-or-nothing

## Step-by-Step Migration

### Step 1: Analysis

#### 1.1 Identify Components

Review your existing module and identify:

**HTML Structure:**
```
Old Module (0Descriptive_Stats.html)
├── Header
├── Input Section (custom)
├── Configuration Options
├── Results Display (inline)
└── Modal for additional results
```

**JavaScript:**
```
├── Global variables
├── Initialization code
├── Event handlers
├── Analysis logic
├── Results rendering
└── VB6 communication
```

**CSS:**
```
├── Embedded <style> tags
├── Inline styles
└── External stylesheet (if any)
```

#### 1.2 Extract Core Logic

Identify the core analysis logic that's unique to your module:

```javascript
// OLD CODE - to be preserved
function calculateDescriptiveStats(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  // ... more calculations
  return { mean, median, stdDev, ... };
}
```

This becomes your `performAnalysis()` method.

### Step 2: Setup New Module

#### 2.1 Create Module Directory

```bash
cd src/modules
mkdir descriptive-stats
cd descriptive-stats
```

#### 2.2 Copy Templates

```bash
cp ../../templates/module-template.html descriptive-stats.html
cp ../../templates/module-template.js descriptive-stats.js
```

#### 2.3 Rename Class

In `descriptive-stats.js`:

```javascript
export class DescriptiveStatsAnalysis extends BaseAnalyticsModule {
  constructor() {
    super('Descriptive Statistics', {
      inputPanelId: 'inputPanel',
      errorContainerId: 'errorContainer',
      showResultsInPopup: true,
      enableVB6Communication: true
    });
  }
}
```

### Step 3: Migrate HTML

#### 3.1 Header

**Old:**
```html
<div class="header-section">
  <div class="header-content">
    <h1>Descriptive Statistics</h1>
    <!-- Custom dropdown code -->
  </div>
</div>
```

**New:** (Use template, update title only)
```html
<div class="header-section">
  <div class="header-content">
    <h1>
      <i class="fa fa-chart-bar"></i>
      Descriptive Statistics
    </h1>
    <div class="dropdown">
      <!-- Standard dropdown from template -->
    </div>
  </div>
</div>
```

#### 3.2 Input Section

**Old:** (Custom input UI)
```html
<div id="variable-selection">
  <!-- Custom variable selection code -->
</div>
```

**New:** (Use InputPanel component)
```html
<div id="inputPanel"></div>
```

The InputPanel is initialized in JavaScript:
```javascript
// Automatically initialized by BaseAnalyticsModule
this.inputPanel = new InputPanel('inputPanel', this.getInputPanelConfig());
```

#### 3.3 Configuration Options

**Old:**
```html
<div class="options">
  <label>Decimal Places:</label>
  <input type="range" id="decimal-places" min="0" max="4" value="2">
  <span id="decimal-value">2</span>
</div>
```

**New:** (Keep module-specific options)
```html
<div class="input-section">
  <div class="input-section-title">
    <i class="fa fa-sliders-h"></i>
    Display Options
  </div>
  <div class="input-group">
    <label for="decimal-places">Decimal Places</label>
    <input type="range" id="decimal-places" min="0" max="4" value="2">
    <span id="decimal-value">2</span>
  </div>
</div>
```

#### 3.4 Results

**Old:** (Inline results in main page)
```html
<div id="results-table">
  <!-- Results rendered here -->
</div>
```

**New:** (Results shown in popup)
```javascript
// Results are rendered in ResultsPopup component
displayResults(results) {
  this.resultsPopup.setContent(this.buildResultsHTML(results));
  this.resultsPopup.open();
}
```

### Step 4: Migrate JavaScript

#### 4.1 Global Variables → Class Properties

**Old:**
```javascript
let data = [];
let selectedVariables = [];
let decimalPlaces = 2;
```

**New:**
```javascript
class DescriptiveStatsAnalysis extends BaseAnalyticsModule {
  constructor() {
    super('Descriptive Statistics');
    this.decimalPlaces = 2;
    // data and selectedVariables handled by base class
  }
}
```

#### 4.2 Initialization Code

**Old:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  renderTable();
});
```

**New:**
```javascript
onInitialize() {
  // BaseAnalyticsModule handles data loading and basic setup
  // Only add module-specific initialization here
  this.setupDecimalPlacesSlider();
}

setupDecimalPlacesSlider() {
  const slider = document.getElementById('decimal-places');
  if (slider) {
    slider.addEventListener('input', (e) => {
      this.decimalPlaces = parseInt(e.target.value);
      this.onDecimalPlacesChange(this.decimalPlaces);
    });
  }
}
```

#### 4.3 Analysis Logic

**Old:**
```javascript
function runAnalysis() {
  // Get data
  const data = getData();
  
  // Validate
  if (!validateData(data)) {
    alert('Invalid data');
    return;
  }
  
  // Calculate
  const results = calculateStats(data);
  
  // Display
  displayResults(results);
}
```

**New:**
```javascript
validateInputs() {
  const errors = [];
  const selectedVars = this.inputPanel.getSelectedVariables();
  
  if (selectedVars.length === 0) {
    errors.push('Please select at least one variable');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

async performAnalysis() {
  const selectedVars = this.inputPanel.getSelectedVariables();
  const data = {};
  
  selectedVars.forEach(varName => {
    data[varName] = dataHandler.getVariable(varName);
  });
  
  // Your calculation logic (unchanged)
  const statistics = this.calculateStats(data);
  
  return {
    variables: selectedVars,
    statistics: statistics,
    timestamp: new Date().toISOString()
  };
}

displayResults(results) {
  const html = this.buildResultsHTML(results);
  this.resultsPopup.setContent(html);
  this.resultsPopup.open();
}
```

#### 4.4 VB6 Communication

**Old:**
```javascript
function sendToVB6(action, data) {
  if (typeof vbH === 'function') {
    vbH().RaiseMessageEvent(action, data);
  } else if (window.external) {
    window.external.OrdoWebView1_JSMessage(action + '|' + data);
  }
}

// VB6 callback
window.updateResults = function(resultsJSON) {
  const results = JSON.parse(resultsJSON);
  displayResults(results);
};
```

**New:**
```javascript
// Sending to VB6 (handled by base class)
this.sendMessageToVB6('Case400', variableName);

// Receiving from VB6
onVB6Response(data) {
  // Handle VB6 response
  const results = typeof data === 'string' ? JSON.parse(data) : data;
  this.displayResults(results);
}

// Or register global callback
window.updateModuleResults = function(resultsJSON) {
  if (window.analysisModule) {
    const results = JSON.parse(resultsJSON);
    window.analysisModule.onVB6Response(results);
  }
};
```

### Step 5: Migrate CSS

#### 5.1 Extract Module-Specific Styles

**Old:** (All styles embedded)
```html
<style>
  :root { /* colors */ }
  body { /* layout */ }
  .card { /* components */ }
  .module-specific { /* your styles */ }
</style>
```

**New:** (Only module-specific styles)
```css
/* descriptive-stats.css */
/* Only include styles unique to this module */

.stats-table-wrapper {
  /* Module-specific styling */
}

.histogram-special-feature {
  /* Unique to this module */
}
```

#### 5.2 Use Shared Styles

**Old:**
```css
.card {
  background: #1a1f2e;
  border: 1px solid #2d3748;
  border-radius: 10px;
}
```

**New:** (Use shared classes)
```html
<!-- No custom CSS needed, use .card from main.css -->
<div class="card">
  ...
</div>
```

### Step 6: Testing

#### 6.1 Unit Tests

```javascript
// tests/modules/descriptive-stats.test.js
import { DescriptiveStatsAnalysis } from '../../src/modules/descriptive-stats/descriptive-stats.js';

describe('DescriptiveStatsAnalysis', () => {
  let module;
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="inputPanel"></div><div id="errorContainer"></div>';
    module = new DescriptiveStatsAnalysis();
  });

  test('calculates mean correctly', () => {
    const values = [1, 2, 3, 4, 5];
    const stats = module.calculateStats({ var1: values });
    expect(stats.var1.mean).toBeCloseTo(3, 2);
  });
});
```

#### 6.2 Integration Testing

1. Load module in browser
2. Test data input (all 3 options)
3. Test variable selection
4. Run analysis with various configurations
5. Verify results display
6. Test VB6 communication (if applicable)
7. Test error handling

### Step 7: Side-by-Side Comparison

Keep old and new modules running in parallel:

```
Test Plan:
1. Load same data in both
2. Run same analysis
3. Compare results
4. Verify outputs match
5. Check performance
```

## Component Mapping

### Old → New Component Map

| Old Component | New Component | Location |
|--------------|---------------|----------|
| Custom variable selector | InputPanel | shared/js/components/InputPanel.js |
| Inline results div | ResultsPopup | shared/js/components/ResultsPopup.js |
| Custom dropdown | Standard dropdown | template |
| Manual validation | validateInputs() | Override in module |
| Global data variable | dataHandler | shared/js/core/data-handler.js |
| Custom utilities | utils.js | shared/js/core/utils.js |

## Code Transformations

### Common Patterns

#### Pattern 1: Data Access

**Old:**
```javascript
const data = window.rawData;
const varNames = window.variableNames;
```

**New:**
```javascript
import { dataHandler } from '../shared/js/core/data-handler.js';

const data = dataHandler.getAllData();
const varNames = dataHandler.variableNames;
```

#### Pattern 2: Formatting

**Old:**
```javascript
function format(num) {
  return num.toFixed(2);
}
```

**New:**
```javascript
import { formatNumber } from '../shared/js/core/utils.js';

const formatted = formatNumber(num, 2);
// or use instance method
this.formatNumber(num); // Uses this.decimalPlaces
```

#### Pattern 3: Validation

**Old:**
```javascript
if (selectedVars.length < 2) {
  alert('Select at least 2 variables');
  return;
}
```

**New:**
```javascript
import { validateVariableSelection } from '../shared/js/core/validation.js';

validateInputs() {
  const selectedVars = this.inputPanel.getSelectedVariables();
  const validation = validateVariableSelection(selectedVars, 2);
  
  return {
    valid: validation.valid,
    errors: validation.errors
  };
}
```

## Testing Migrated Modules

### Validation Checklist

- [ ] Module loads without errors
- [ ] Input panel displays correctly
- [ ] Variable selection works
- [ ] All 3 data options function
- [ ] Analysis runs successfully
- [ ] Results display correctly
- [ ] Results popup opens/closes
- [ ] Dropdown menu works
- [ ] Further analysis navigation works
- [ ] VB6 communication works (if applicable)
- [ ] Error handling works
- [ ] Styling is consistent
- [ ] Performance is acceptable

### Regression Testing

Test cases should verify:

1. **Identical Results**: Old and new produce same output
2. **Edge Cases**: Empty data, single variable, large datasets
3. **Error Conditions**: Invalid inputs handled gracefully
4. **UI Interactions**: All buttons, dropdowns, sliders work
5. **Cross-browser**: Works in IE11, Edge, Chrome

## Rollback Plan

If migration fails:

### Option 1: Quick Rollback

Keep old files in `src/modules/[module]/old/`:

```bash
# Rollback
mv src/modules/descriptive-stats/old/* src/modules/descriptive-stats/
```

### Option 2: Git Revert

```bash
git revert <commit-hash>
```

### Option 3: Feature Flag

Use URL parameter to switch:

```javascript
const useNewModule = new URLSearchParams(window.location.search).get('new') === '1';

if (useNewModule) {
  window.location.href = 'descriptive-stats.html';
} else {
  window.location.href = 'old/0Descriptive_Stats.html';
}
```

## Tips and Tricks

### 1. Incremental Approach

Don't try to migrate everything at once. Start with:
1. HTML structure
2. Basic JavaScript class
3. Simple analysis
4. Results display
5. Advanced features

### 2. Console Logging

Add extensive logging during migration:

```javascript
console.log('🔄 [MIGRATION] Step 1: Data loaded', data);
console.log('🔄 [MIGRATION] Step 2: Validation passed');
console.log('🔄 [MIGRATION] Step 3: Analysis complete');
```

### 3. Keep Notes

Document issues and solutions as you go:

```markdown
## Migration Notes - Descriptive Stats

### Issues Found:
1. Custom validation logic needed for skewness threshold
2. VB6 callback signature changed - fixed with adapter

### Solutions:
1. Added validateSkewnessThreshold() override
2. Created wrapper: window.oldCallback = (data) => newCallback(adapt(data))
```

### 4. Leverage Base Class

Don't reimplement what base class provides:

- Data loading: Use `dataHandler`
- Input panel: Use `this.inputPanel`
- Results popup: Use `this.resultsPopup`
- VB6 communication: Use `this.sendMessageToVB6()`
- Number formatting: Use `this.formatNumber()`

## Troubleshooting

### Module doesn't load

**Problem**: Blank page or console errors

**Solutions**:
- Check import paths (ES6 modules are strict)
- Verify file extensions (.js required)
- Check for syntax errors
- Look for missing dependencies

### Shared components not working

**Problem**: InputPanel or ResultsPopup don't render

**Solutions**:
- Verify container elements exist
- Check initialization order (DOM ready?)
- Inspect browser console for errors
- Verify import paths are correct

### Results differ from old module

**Problem**: New module produces different results

**Solutions**:
- Compare calculation logic line-by-line
- Check for floating-point precision issues
- Verify data types (number vs string)
- Test with known datasets

### VB6 communication broken

**Problem**: Can't communicate with VB6

**Solutions**:
- Check callback function names
- Verify message format
- Test with both vbH() and window.external
- Add error handling

## Example Migration

See complete example:

- **Before**: `src/modules/old-examples/0Descriptive_Stats.html`
- **After**: `src/modules/descriptive-stats/descriptive-stats.html`
- **Diff**: `docs/examples/migration-diff.md`

## Next Steps

After successful migration:

1. **Archive old code**: Move to `archive/` folder
2. **Update documentation**: Reflect new structure
3. **Update tests**: Add/update test cases
4. **Performance check**: Profile and optimize if needed
5. **User testing**: Get feedback from users
6. **Migrate next module**: Apply lessons learned

---

**Questions?** Check [Development Guide](development-guide.md) or open an issue on GitHub.
