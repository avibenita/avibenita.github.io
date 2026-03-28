# AI Interpretation Button - Integration Guide

This guide explains how to add the AI interpretation button to any HTML dashboard.

## 📦 Quick Start (3 Steps)

### Step 1: Include Required Files

Add these lines to your HTML `<head>` section:

```html
<!-- AI Button Styles -->
<link rel="stylesheet" href="./Ressources/ai-button.css">

<!-- AI Button Functionality -->
<script src="./Ressources/ai-button.js"></script>
```

### Step 2: Add Button HTML

Choose a button variant from `ai-button-template.html` and add it to your HTML.

**Example (Bottom-Right Position):**
```html
<div class="decision-slider-row" style="position: relative;">
  <!-- Your existing content -->
  
  <!-- AI Button -->
  <button id="aiInterpretBtn" 
          class="ai-interpret-btn position-bottom-right" 
          title="AI Interpretation (Beta)">
    <i class="fas fa-sparkles"></i>
    <span>AI</span>
  </button>
</div>
```

### Step 3: Initialize JavaScript

Add initialization code in your JavaScript section:

```javascript
// Option A: Simple initialization for hypothesis tests
document.addEventListener('DOMContentLoaded', function() {
  AIButton.init('aiInterpretBtn', AIButton.buildHypothesisTestData);
});

// Option B: Custom data builder
document.addEventListener('DOMContentLoaded', function() {
  AIButton.init('aiInterpretBtn', function() {
    return {
      testName: 'My Custom Test',
      testStatistic: myTestStat,
      pValue: myPValue,
      // ... your custom data structure
    };
  });
});
```

## 🎨 Position Variants

### 1. Bottom-Right (Recommended for Decision Panels)
```html
<button class="ai-interpret-btn position-bottom-right">
  <i class="fas fa-sparkles"></i>
  <span>AI</span>
</button>
```
- Position: `absolute; bottom: -10px; right: -10px;`
- Use in: Results panels, decision sections

### 2. Top-Right (For Headers)
```html
<button class="ai-interpret-btn position-top-right">
  <i class="fas fa-sparkles"></i>
  <span>AI</span>
</button>
```
- Position: `absolute; top: 10px; right: 10px;`
- Use in: Panel headers, title sections

### 3. Inline (Next to Other Buttons)
```html
<button class="ai-interpret-btn position-inline">
  <i class="fas fa-sparkles"></i>
  <span>AI</span>
</button>
```
- Position: `relative; margin-left: 12px;`
- Use in: Button groups, toolbars

### 4. Custom Position
```html
<button class="ai-interpret-btn" style="position: absolute; top: 50%; right: 0; transform: translateY(-50%);">
  <i class="fas fa-sparkles"></i>
  <span>AI</span>
</button>
```
- Custom positioning with inline styles

## 🔧 JavaScript API

### AIButton.init()
Initialize the button with click handler.

**Signature:**
```javascript
AIButton.init(buttonId, getTestData, options)
```

**Parameters:**
- `buttonId` (string): ID of the button element
- `getTestData` (function): Function that returns test data object
- `options` (object, optional): Configuration options

**Options:**
```javascript
{
  messageName: 'RequestAIInterpretation',  // VB6 message name
  requireTestResults: true,                 // Validate data before sending
  validationMessage: 'No test results...'   // Alert message if validation fails
}
```

**Example:**
```javascript
AIButton.init('aiInterpretBtn', function() {
  return {
    testName: window.currentTest,
    pValue: window.results.pValue,
    // ...
  };
}, {
  messageName: 'CustomAIRequest',
  validationMessage: 'Please run the test first!'
});
```

### AIButton.disable()
Disable the button.

```javascript
AIButton.disable('aiInterpretBtn');
```

### AIButton.enable()
Enable the button.

```javascript
AIButton.enable('aiInterpretBtn', 'Click for AI insights');
```

### AIButton.buildHypothesisTestData()
Pre-built data extractor for hypothesis testing dashboards.

Extracts from:
- `window.testResultsData`
- `window.testConfig`
- DOM elements: `#effectSizeLabel`, `#effectSizeValue`

```javascript
const testData = AIButton.buildHypothesisTestData();
```

## 📋 Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Dashboard</title>
  
  <!-- FontAwesome (required for icon) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <!-- AI Button Styles -->
  <link rel="stylesheet" href="./Ressources/ai-button.css">
</head>
<body>
  
  <!-- Your dashboard content -->
  <div class="results-panel" style="position: relative;">
    <h2>Test Results</h2>
    <div id="results">
      <!-- Results displayed here -->
    </div>
    
    <!-- AI Button -->
    <button id="aiInterpretBtn" 
            class="ai-interpret-btn position-bottom-right" 
            title="AI Interpretation (Beta)">
      <i class="fas fa-sparkles"></i>
      <span>AI</span>
    </button>
  </div>
  
  <!-- AI Button Functionality -->
  <script src="./Ressources/ai-button.js"></script>
  
  <!-- Your dashboard scripts -->
  <script>
    // Global test results
    window.testResultsData = null;
    
    // Run test function
    function runTest() {
      // ... your test logic ...
      window.testResultsData = {
        testName: 'One-Sample t-Test',
        testStatistic: -3.95,
        pValue: 0.0000,
        // ... other results
      };
      
      // Enable AI button after test runs
      AIButton.enable('aiInterpretBtn');
    }
    
    // Initialize AI button (disabled initially)
    document.addEventListener('DOMContentLoaded', function() {
      AIButton.init('aiInterpretBtn', AIButton.buildHypothesisTestData);
      AIButton.disable('aiInterpretBtn');  // Disable until test runs
    });
  </script>
</body>
</html>
```

## 🎯 Integration Checklist

- [ ] Include `ai-button.css` in `<head>`
- [ ] Include `ai-button.js` before closing `</body>`
- [ ] Ensure FontAwesome is loaded
- [ ] Add button HTML with unique ID
- [ ] Parent container has `position: relative` (if using absolute positioning)
- [ ] Initialize button with `AIButton.init()`
- [ ] Test data function returns correct structure
- [ ] VB6 handler (`RequestAIInterpretation`) is ready

## 🐛 Troubleshooting

**Button not showing:**
- Check CSS file is loaded (inspect Network tab)
- Verify parent container has proper positioning

**Button not responding to clicks:**
- Check JavaScript console for errors
- Verify `AIButton.init()` was called
- Ensure `sendToVB6` function exists

**Animation not working:**
- Check browser supports CSS animations
- Verify no CSS conflicts with other styles

**Glow effect not visible:**
- Ensure parent doesn't have `overflow: hidden`
- Check z-index stacking context

## 🎨 Customization

### Change Button Size
```css
.ai-interpret-btn {
  width: 60px;   /* default: 50px */
  height: 60px;  /* default: 50px */
  font-size: 14px;  /* default: 12px */
}
```

### Change Colors
```css
.ai-interpret-btn {
  background: linear-gradient(135deg, #your-color1, #your-color2, #your-color3);
}
```

### Disable Animations
```css
.ai-interpret-btn,
.ai-interpret-btn::before,
.ai-interpret-btn::after,
.ai-interpret-btn i {
  animation: none !important;
}
```

## 📦 Files

- `ai-button.css` - Button styles and animations
- `ai-button.js` - Button functionality and API
- `ai-button-template.html` - HTML snippets
- `ai-button-integration.md` - This guide

## 🔗 Related

- VB6 Handler: `A_llamaAIintegration.HandleHypothesisAIRequest`
- API: Groq LLaMA 3.3 70B Versatile
- Message Format: JSON string with test data

---

**Version:** 1.0  
**Last Updated:** 2024-11-21  
**Compatibility:** All modern HTML dashboards with VB6 backend

