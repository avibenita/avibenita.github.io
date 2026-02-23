# Module Creation Guide

Step-by-step guide to creating a new analysis module in Statistico Analytics.

## Table of Contents

- [Overview](#overview)
- [Step 1: Setup](#step-1-setup)
- [Step 2: HTML Structure](#step-2-html-structure)
- [Step 3: JavaScript Implementation](#step-3-javascript-implementation)
- [Step 4: Styling](#step-4-styling)
- [Step 5: Testing](#step-5-testing)
- [Step 6: Documentation](#step-6-documentation)
- [Step 7: Integration](#step-7-integration)
- [Example Module](#example-module)

## Overview

### What You'll Build

A fully functional analysis module that:
- Extends `BaseAnalyticsModule`
- Uses shared components (InputPanel, ResultsPopup)
- Follows project conventions
- Integrates with the hub

### Time Required

- Basic module: 2-4 hours
- Complex module: 1-2 days

## Step 1: Setup

### 1.1 Copy Template

```bash
# Navigate to modules directory
cd src/modules

# Create new module directory
mkdir my-analysis

# Copy template files
cp ../templates/module-template.html my-analysis/my-analysis.html
cp ../templates/module-template.js my-analysis/my-analysis.js
```

### 1.2 Update File Names and Paths

**my-analysis.html**:
```html
<title>My Analysis - Statistico Analytics</title>

<!-- Update imports -->
<script type="module">
  import { MyAnalysis } from './my-analysis.js';
  
  document.addEventListener('DOMContentLoaded', () => {
    const module = new MyAnalysis();
    module.initialize();
    window.analysisModule = module;
  });
</script>
```

**my-analysis.js**:
```javascript
export class MyAnalysis extends BaseAnalyticsModule {
  constructor() {
    super('My Analysis', { /* config */ });
  }
}
```

## Step 2: HTML Structure

### 2.1 Header Section

```html
<div class="header-section">
  <div class="header-content">
    <h1>
      <i class="fa fa-chart-line"></i>
      My Analysis
    </h1>
    <div class="dropdown">
      <button class="dropbtn" onclick="toggleDropdown()">
        Advanced Analysis Options ▼
      </button>
      <div class="dropdown-content" id="dropdown-content">
        <!-- Further analysis options -->
        <a href="#" data-analysis="descriptive-stats">Descriptive Statistics</a>
        <a href="#" data-analysis="correlations">Correlations</a>
      </div>
    </div>
  </div>
</div>
```

### 2.2 Configuration Card

```html
<div class="card">
  <div class="card-head">
    <div><i class="fa fa-cog"></i> Configuration</div>
  </div>
  <div class="card-body">
    <!-- Input Panel Component -->
    <div id="inputPanel"></div>
    
    <!-- Module-specific options -->
    <div class="input-section">
      <div class="input-section-title">
        <i class="fa fa-sliders-h"></i>
        Analysis Options
      </div>
      
      <div class="input-group">
        <label for="myOption">My Option</label>
        <select id="myOption">
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
        </select>
      </div>
      
      <div class="input-group">
        <label for="alpha">Significance Level (α)</label>
        <input type="number" id="alpha" value="0.05" step="0.01" min="0" max="1">
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button class="btn btn-primary" id="runAnalysis">
        <i class="fa fa-play"></i>
        Run Analysis
      </button>
    </div>
  </div>
</div>
```

### 2.3 Error Container

```html
<div id="errorContainer"></div>
```

## Step 3: JavaScript Implementation

### 3.1 Class Structure

```javascript
import { BaseAnalyticsModule } from '../../shared/js/analytics/base-analytics.js';
import { dataHandler } from '../../shared/js/core/data-handler.js';
import { validateVariableSelection } from '../../shared/js/core/validation.js';
import { formatNumber } from '../../shared/js/core/utils.js';

export class MyAnalysis extends BaseAnalyticsModule {
  constructor() {
    super('My Analysis', {
      inputPanelId: 'inputPanel',
      errorContainerId: 'errorContainer',
      showResultsInPopup: true,
      enableVB6Communication: true
    });
    
    // Module-specific properties
    this.options = {
      myOption: 'option1',
      alpha: 0.05
    };
  }

  // ... implement required methods
}
```

### 3.2 Initialization

```javascript
onInitialize() {
  console.log('🚀 Initializing My Analysis...');
  
  // Setup module-specific event listeners
  this.setupOptions();
}

setupOptions() {
  // My Option
  const myOptionSelect = document.getElementById('myOption');
  if (myOptionSelect) {
    myOptionSelect.addEventListener('change', (e) => {
      this.options.myOption = e.target.value;
    });
  }

  // Alpha
  const alphaInput = document.getElementById('alpha');
  if (alphaInput) {
    alphaInput.addEventListener('change', (e) => {
      this.options.alpha = parseFloat(e.target.value);
    });
  }
}
```

### 3.3 Input Panel Configuration

```javascript
getInputPanelConfig() {
  return {
    showDataOptions: true,
    allowMultipleSelection: true,
    minSelection: 2,    // Minimum variables required
    maxSelection: 10    // Maximum variables allowed
  };
}
```

### 3.4 Validation

```javascript
validateInputs() {
  const errors = [];
  
  // Validate variable selection
  const selectedVars = this.inputPanel.getSelectedVariables();
  const varValidation = validateVariableSelection(selectedVars, 2, 10);
  if (!varValidation.valid) {
    errors.push(...varValidation.errors);
  }

  // Validate data availability
  if (!dataHandler.rawData || dataHandler.rawData.length === 0) {
    errors.push('No data available. Please load data first.');
  }

  // Validate each variable
  selectedVars.forEach(varName => {
    const data = dataHandler.getVariable(varName);
    if (data.length < 3) {
      errors.push(`${varName}: Insufficient data (minimum 3 observations required)`);
    }
  });

  // Validate module-specific options
  if (this.options.alpha <= 0 || this.options.alpha >= 1) {
    errors.push('Alpha must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : 'Validation passed',
    errors
  };
}
```

### 3.5 Analysis Implementation

```javascript
async performAnalysis() {
  console.log('▶️ Starting my analysis...');
  
  // Get selected variables
  const selectedVars = this.inputPanel.getSelectedVariables();
  
  // Get data for each variable
  const data = {};
  selectedVars.forEach(varName => {
    data[varName] = dataHandler.getVariable(varName);
  });

  // Perform your statistical analysis here
  const results = {
    variables: selectedVars,
    data: data,
    options: this.options,
    // Add your analysis results
    statistics: this.calculateStatistics(data),
    tests: this.performTests(data),
    timestamp: new Date().toISOString()
  };

  console.log('✅ Analysis completed:', results);
  return results;
}

calculateStatistics(data) {
  // Your statistical calculations
  const stats = {};
  
  Object.keys(data).forEach(varName => {
    const values = data[varName];
    stats[varName] = {
      mean: this.calculateMean(values),
      stdDev: this.calculateStdDev(values),
      // ... more statistics
    };
  });
  
  return stats;
}

performTests(data) {
  // Your statistical tests
  return {
    // test results
  };
}
```

### 3.6 Results Display

```javascript
displayResults(results) {
  console.log('📊 Displaying results');

  if (!this.resultsPopup) {
    console.error('Results popup not initialized');
    return;
  }

  // Set title
  this.resultsPopup.setTitle(`${this.moduleName} Results`);

  // Build HTML content
  let html = '<div class="results-container">';
  
  // Summary section
  html += this.buildSummarySection(results);
  
  // Statistical results table
  html += this.buildStatisticsTable(results);
  
  // Tests results
  html += this.buildTestsSection(results);
  
  html += '</div>';

  // Display
  this.resultsPopup.setContent(html);
  this.resultsPopup.open();
  
  // Store results
  this.results = results;
}

buildSummarySection(results) {
  return `
    <div class="results-section">
      <div class="results-section-title">
        <i class="fa fa-info-circle"></i>
        Analysis Summary
      </div>
      <div class="table-wrap">
        <table>
          <tr>
            <td><strong>Variables:</strong></td>
            <td>${results.variables.join(', ')}</td>
          </tr>
          <tr>
            <td><strong>Sample Size:</strong></td>
            <td>${results.data[results.variables[0]].length}</td>
          </tr>
          <tr>
            <td><strong>Alpha Level:</strong></td>
            <td>${results.options.alpha}</td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

buildStatisticsTable(results) {
  let html = `
    <div class="results-section">
      <div class="results-section-title">
        <i class="fa fa-table"></i>
        Descriptive Statistics
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Variable</th>
              <th>Mean</th>
              <th>Std Dev</th>
              <th>N</th>
            </tr>
          </thead>
          <tbody>
  `;

  results.variables.forEach(varName => {
    const stats = results.statistics[varName];
    html += `
      <tr>
        <td>${varName}</td>
        <td>${this.formatNumber(stats.mean)}</td>
        <td>${this.formatNumber(stats.stdDev)}</td>
        <td>${results.data[varName].length}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  return html;
}
```

## Step 4: Styling

### 4.1 Module-Specific CSS

Create `my-analysis.css` if needed:

```css
/* Module-specific styles only */
/* Global styles are in shared/css/ */

.my-analysis-specific-class {
  /* Custom styles */
}

.my-custom-table {
  /* Override table styles if needed */
}
```

Include in HTML:

```html
<link rel="stylesheet" href="./my-analysis.css" />
```

## Step 5: Testing

### 5.1 Create Test File

`tests/modules/my-analysis.test.js`:

```javascript
import { MyAnalysis } from '../../src/modules/my-analysis/my-analysis.js';

describe('MyAnalysis', () => {
  let module;
  
  beforeEach(() => {
    module = new MyAnalysis();
  });

  describe('initialization', () => {
    it('should create instance with correct name', () => {
      expect(module.moduleName).toBe('My Analysis');
    });
  });

  describe('validation', () => {
    it('should require at least 2 variables', () => {
      module.inputPanel = {
        getSelectedVariables: () => ['var1']
      };
      
      const result = module.validateInputs();
      expect(result.valid).toBe(false);
    });
  });

  describe('analysis', () => {
    it('should perform analysis correctly', async () => {
      // Setup test data
      // ...
      
      const results = await module.performAnalysis();
      expect(results).toBeDefined();
      expect(results.statistics).toBeDefined();
    });
  });
});
```

### 5.2 Run Tests

```bash
npm test my-analysis.test.js
```

## Step 6: Documentation

### 6.1 JSDoc Comments

```javascript
/**
 * My Analysis Module
 * Performs [description of analysis]
 * 
 * @module MyAnalysis
 * @extends BaseAnalyticsModule
 * 
 * @example
 * const module = new MyAnalysis();
 * module.initialize();
 */
export class MyAnalysis extends BaseAnalyticsModule {
  /**
   * Performs the analysis
   * @returns {Promise<Object>} Analysis results
   */
  async performAnalysis() {
    // ...
  }
}
```

### 6.2 README

Create `src/modules/my-analysis/README.md`:

```markdown
# My Analysis Module

## Description

Brief description of what this module does.

## Usage

1. Select variables
2. Configure options
3. Run analysis

## Options

- **My Option**: Description
- **Alpha**: Significance level

## Output

Description of results.

## References

- Statistical methodology references
```

## Step 7: Integration

### 7.1 Add to Hub

Edit `src/hub/index.html`:

```html
<div class="module-card" onclick="navigateTo('my-analysis')">
  <div class="module-icon">
    <i class="fa fa-chart-line"></i>
  </div>
  <h2 class="module-title">My Analysis</h2>
  <p class="module-description">
    Brief description of your analysis module.
  </p>
  <ul class="module-features">
    <li><i class="fa fa-check"></i> Feature 1</li>
    <li><i class="fa fa-check"></i> Feature 2</li>
    <li><i class="fa fa-check"></i> Feature 3</li>
  </ul>
</div>
```

Add to navigation function:

```javascript
const moduleUrls = {
  // ... existing modules
  'my-analysis': '../modules/my-analysis/my-analysis.html'
};
```

### 7.2 Update package.json

If needed, add build scripts:

```json
"scripts": {
  "build:my-analysis": "node build/build-module.js my-analysis"
}
```

### 7.3 Commit

```bash
git add src/modules/my-analysis/
git commit -m "feat: add my analysis module"
```

## Example Module

See complete working example in `src/modules/correlations/` directory.

## Checklist

- [ ] Files created from template
- [ ] Class extends BaseAnalyticsModule
- [ ] Required methods implemented
- [ ] Input panel configured
- [ ] Validation implemented
- [ ] Analysis logic complete
- [ ] Results display working
- [ ] Tests written
- [ ] Documentation added
- [ ] Added to hub
- [ ] Tested in browser
- [ ] Code reviewed
- [ ] Committed to Git

## Common Issues

**Module not loading?**
- Check import paths
- Verify ES6 module syntax
- Check browser console

**Shared components not working?**
- Ensure correct import paths
- Check that base class is imported

**Styles not applying?**
- Verify CSS import order
- Check CSS variable names

## Next Steps

- Add charts/visualizations (D3.js, Highcharts)
- Add export functionality
- Add VB6 integration
- Optimize performance

---

**Need help?** Check [Development Guide](development-guide.md) or open an issue on GitHub.
