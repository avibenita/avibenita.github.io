# AI Button Migration Guide

This guide shows how to convert existing files to use the templated AI button approach.

## 🔄 Migration Steps

### Current Implementation (0H0testHypothesis.html)

The current file has **inline CSS and JavaScript** for the AI button. Here's how to migrate it to the template:

---

## Step 1: Remove Inline CSS

### ❌ REMOVE (Lines in `<style>` section):

```css
/* AI Circle Button with Visible Glow & Animation */
.ai-star-btn {
  position: relative;
  width: 50px;
  height: 50px;
  /* ... ~120 lines of CSS ... */
}

@keyframes ai-glow { /* ... */ }
@keyframes ai-pulse { /* ... */ }
@keyframes ai-ring { /* ... */ }
@keyframes ai-sparkle-rotate { /* ... */ }
```

### ✅ REPLACE WITH (In `<head>`):

```html
<!-- AI Button Styles -->
<link rel="stylesheet" href="./Ressources/ai-button.css">
```

---

## Step 2: Update HTML Class Names

### ❌ CURRENT HTML:

```html
<button id="aiInterpretBtn" 
        class="ai-star-btn" 
        style="position: absolute; bottom: -10px; right: -10px; z-index: 10;" 
        title="AI Interpretation (Beta)">
  <i class="fas fa-sparkles"></i>
  <span>AI</span>
</button>
```

### ✅ NEW HTML:

```html
<button id="aiInterpretBtn" 
        class="ai-interpret-btn position-bottom-right" 
        title="AI Interpretation (Beta)">
  <i class="fas fa-sparkles"></i>
  <span>AI</span>
</button>
```

**Changes:**
- `ai-star-btn` → `ai-interpret-btn position-bottom-right`
- Remove inline `style` attribute (positioning is now in CSS class)
- Keep `z-index: 10` if needed (can be in CSS or inline)

---

## Step 3: Extract JavaScript Function

### ❌ CURRENT JavaScript (Inline in file):

```javascript
// AI Interpretation Request
document.getElementById('aiInterpretBtn').addEventListener('click', function() {
  console.log('🤖 AI Interpretation requested');
  
  if (!window.testResultsData) {
    alert('No test results available. Please run a test first.');
    return;
  }

  // Extract effect size
  const effectSizeLabel = document.getElementById('effectSizeLabel').textContent;
  const effectSizeValue = document.getElementById('effectSizeValue').textContent;

  // Build AI request payload
  const aiPayload = {
    testParameter: window.testResultsData.testParameter,
    testName: window.testResultsData.testName,
    testOrientation: window.testResultsData.testOrientation,
    method: window.testConfig.method,
    testStatistic: window.testResultsData.testStatisticH0,
    pValue: window.testResultsData.pValueH0,
    alpha: window.testResultsData.alphaH0,
    effectSizeLabel: effectSizeLabel,
    effectSizeValue: effectSizeValue,
    variableName: window.currentVariableName || 'Variable',
    sampleSize: window.testResultsData.sampleSize || window.currentDataArray.length,
    h0Value: window.testConfig.h0Value,
    decision: window.testResultsData.pValueH0 < window.testResultsData.alphaH0 ? 'Reject H0' : 'Fail to Reject H0'
  };

  console.log('📊 AI Payload:', aiPayload);
  sendToVB6('RequestAIInterpretation', JSON.stringify(aiPayload));
  console.log('📤 AI interpretation request sent to VB6');
});
```

### ✅ NEW JavaScript (2 options):

**Option A: Use Built-in Helper (Recommended)**

```javascript
<!-- Include AI Button Script -->
<script src="./Ressources/ai-button.js"></script>

<script>
  // Initialize AI button with built-in data extractor
  document.addEventListener('DOMContentLoaded', function() {
    AIButton.init('aiInterpretBtn', AIButton.buildHypothesisTestData);
  });
</script>
```

**Option B: Custom Data Function**

```javascript
<!-- Include AI Button Script -->
<script src="./Ressources/ai-button.js"></script>

<script>
  // Custom data builder
  function getMyTestData() {
    if (!window.testResultsData) return null;
    
    return {
      testParameter: window.testResultsData.testParameter,
      testName: window.testResultsData.testName,
      testOrientation: window.testResultsData.testOrientation,
      // ... rest of your custom fields
    };
  }
  
  // Initialize AI button
  document.addEventListener('DOMContentLoaded', function() {
    AIButton.init('aiInterpretBtn', getMyTestData);
  });
</script>
```

---

## 🎯 Complete Migration Checklist for 0H0testHypothesis.html

- [ ] Add `<link rel="stylesheet" href="./Ressources/ai-button.css">` to `<head>`
- [ ] Remove `~120 lines` of `.ai-star-btn` CSS and animations
- [ ] Change button class from `ai-star-btn` to `ai-interpret-btn position-bottom-right`
- [ ] Remove inline `style="position: absolute; bottom: -10px; right: -10px; z-index: 10;"`
- [ ] Add `<script src="./Ressources/ai-button.js"></script>` before existing scripts
- [ ] Replace AI button event listener code with `AIButton.init('aiInterpretBtn', AIButton.buildHypothesisTestData)`
- [ ] Test button functionality

---

## 📊 Size Comparison

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| CSS Lines | ~120 lines | 1 line (link) | **-119 lines** |
| JS Lines | ~35 lines | 3 lines | **-32 lines** |
| Maintainability | Single file | Shared module | **✅ Reusable** |
| Updates | Manual per file | Update once | **✅ Centralized** |

---

## 🔧 Advanced: Custom Styling

If a file needs custom button styling, you can:

1. **Keep using the shared CSS** for core styles
2. **Add file-specific overrides** in a local `<style>` block:

```html
<link rel="stylesheet" href="./Ressources/ai-button.css">

<style>
  /* File-specific AI button customization */
  #aiInterpretBtn {
    width: 60px;           /* Larger than default 50px */
    height: 60px;
    bottom: 5px;           /* Different position */
    right: 5px;
  }
  
  #aiInterpretBtn::before {
    opacity: 0.6;          /* Stronger glow */
  }
</style>
```

---

## 🚀 Quick Reference: Other Files

### For Normality Dashboard (0normality-test-dashboard.html)

```html
<!-- In <head> -->
<link rel="stylesheet" href="./Ressources/ai-button.css">

<!-- In HTML (top-right of results panel) -->
<div class="results-panel" style="position: relative;">
  <button id="aiInterpretBtn" 
          class="ai-interpret-btn position-top-right" 
          title="AI Interpretation (Beta)">
    <i class="fas fa-sparkles"></i>
    <span>AI</span>
  </button>
</div>

<!-- Before </body> -->
<script src="./Ressources/ai-button.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    AIButton.init('aiInterpretBtn', function() {
      return {
        testName: 'Normality Tests',
        // ... normality test data structure
      };
    });
  });
</script>
```

### For Q-Q Plot (0QQ-PP-plot.html)

```html
<!-- In <head> -->
<link rel="stylesheet" href="./Ressources/ai-button.css">

<!-- In HTML (inline with other controls) -->
<div class="controls">
  <button id="plotBtn">Generate Plot</button>
  
  <button id="aiInterpretBtn" 
          class="ai-interpret-btn position-inline" 
          title="AI Interpretation (Beta)">
    <i class="fas fa-sparkles"></i>
    <span>AI</span>
  </button>
</div>

<!-- Before </body> -->
<script src="./Ressources/ai-button.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    AIButton.init('aiInterpretBtn', function() {
      return {
        plotType: 'Q-Q Plot',
        // ... plot interpretation data
      };
    }, {
      validationMessage: 'Please generate a plot first!'
    });
  });
</script>
```

---

## 📝 Notes

1. **Backward Compatibility**: The template approach doesn't break existing files. You can migrate files one at a time.

2. **CSS Specificity**: The shared CSS uses `.ai-interpret-btn` class. If you have conflicts, use more specific selectors:
   ```css
   #myDashboard .ai-interpret-btn { /* overrides */ }
   ```

3. **Multiple Buttons**: If you need multiple AI buttons on one page, use different IDs:
   ```javascript
   AIButton.init('aiBtn1', getTestData1);
   AIButton.init('aiBtn2', getTestData2);
   ```

4. **Testing**: After migration, verify:
   - Button appears with correct styling
   - Animations work (glow, pulse, etc.)
   - Click sends correct data to VB6
   - Console logs show expected output

---

## 🆘 Troubleshooting Migration

**Problem**: Button styling looks different
- Check that `ai-button.css` is loaded (inspect Network tab)
- Verify no CSS conflicts with existing `.ai-star-btn` rules
- Clear browser cache

**Problem**: Button doesn't work after migration
- Check JavaScript console for errors
- Verify `AIButton.init()` is called after DOM loads
- Ensure `sendToVB6` function is still available

**Problem**: Animations missing
- Verify CSS file path is correct (relative to HTML file)
- Check browser supports CSS animations
- Inspect element to confirm classes are applied

---

**Need Help?** See `ai-button-integration.md` for full API documentation.

