# Column Change Flow: InputX → Histogram

## Overview
When a user changes the column (variable) in the InputX dropdown, it triggers a chain reaction that ultimately sends updated data to the Histogram for visualization.

---

## Step-by-Step Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. USER SELECTS NEW COLUMN IN DROPDOWN                              │
│    (ddlVariable.onchange event fires)                               │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. EVENT HANDLER TRIGGERED (Line 1203-1230)                         │
│    Location: InputsXL-OnePanel-ES5-ordo.html                        │
│                                                                      │
│    qs('ddlVariable').onchange = function() {                        │
│      var r = qs('tbRange').value || '';  // Get range              │
│      var v = this.value || '';           // Get selected column     │
│      if(r && v) {                        // If both range & col set  │
│        S.rawValues = [];                 // Clear old data           │
│        renderStats([]);                  // Show empty stats         │
│        sendToHost('GetVariableData', ... // REQUEST DATA FROM VB6   │
│      }                                                              │
│    }                                                                │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. SEND REQUEST TO VB6 HOST                                         │
│                                                                      │
│    sendToHost('GetVariableData',                                    │
│      JSON.stringify({ range: r, variable: v }))                    │
│                                                                      │
│    This calls: window.vbHost.RaiseMessageEvent(action, payload)    │
│                                                                      │
│    → VB6 code retrieves data from Excel for this variable          │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. VB6 EXTRACTS DATA AND RETURNS TO HTML                            │
│                                                                      │
│    VB6 processes and calls:                                         │
│    → populateFromVB6(jsonString)  {VB6 sends data back}            │
│                                                                      │
│    Data structure:                                                  │
│    {                                                                │
│      values: [array of numeric values],                            │
│      groups: [optional grouping array],                            │
│      filtered: boolean,                                            │
│      hiddenRows: number,                                           │
│      visibleRows: number                                           │
│    }                                                                │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 5. POPULATE DATA INTO STATE OBJECT (Line 986-1136)                  │
│                                                                      │
│    populateFromVB6(jsonString) {                                    │
│      var d = JSON.parse(jsonString);  // Parse VB6 JSON            │
│      S.rawValues = validData;         // Store numeric values       │
│      S.rawGroups = d.groups;          // Store groups if present    │
│      S.totalDataCount = d.values.length;  // Track total            │
│      S.isFiltered = d.filtered;       // Track if filtered          │
│      ...                                                            │
│      enableTabs();                    // Re-enable processing tabs  │
│      recalc();                        // CALCULATE & UPDATE          │
│    }                                                                │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 6. RECALCULATE ALL DERIVED VALUES (Line 683-720)                    │
│                                                                      │
│    recalc() {                                                       │
│      // Apply any active trim/transform settings:                  │
│      S.valuesTrimmed = [];  // Apply min/max trim                   │
│      S.values = [];         // Apply transformations (ln, sqrt...)  │
│                                                                      │
│      renderStats(S.valuesTrimmed);      // Update statistics        │
│      renderDatasetSummary();            // Update summary display   │
│      syncSliderLabels();                // Update slider labels      │
│      updateTabIndicators();             // Update tab indicators     │
│      statusDirty();                     // Mark as needs update      │
│                                                                      │
│      autoSendResults();  // ◄── AUTO-TRIGGER HISTOGRAM UPDATE       │
│    }                                                                │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 7. AUTO-SEND RESULTS TO HISTOGRAM (Line 629-681)                    │
│                                                                      │
│    autoSendResults() {                                              │
│      if (!autoUpdateEnabled) return;   // Check if auto-update on   │
│                                                                      │
│      if (autoUpdateTimer) {                                         │
│        clearTimeout(autoUpdateTimer);  // Debounce: cancel old      │
│      }                                                              │
│                                                                      │
│      showUpdateIndicator();            // Show "Updating..." banner │
│                                                                      │
│      // Wait 500ms after last change (debounce):                   │
│      autoUpdateTimer = setTimeout(function() {                     │
│        var processedData = {                                        │
│          variableName: selectedVar,                                │
│          rawValues: S.rawValues.slice(0),                          │
│          trimmedValues: S.valuesTrimmed.slice(0),                  │
│          transformedValues: S.values.slice(0),                     │
│          transformType: transformType,                             │
│          trimRange: { min, max },                                  │
│          totalDataCount: S.totalDataCount,                         │
│          trimApplied: isTrimApplied,                               │
│          keepModule: true                                          │
│        };                                                          │
│                                                                      │
│        sendToHost('ShowResults',        // ◄── SEND TO HISTOGRAM    │
│          JSON.stringify(processedData));                           │
│        hideUpdateIndicator();                                       │
│      }, 500);  // 500ms debounce                                   │
│    }                                                                │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 8. HISTOGRAM RECEIVES & DISPLAYS DATA (0HistogramPlus.html)         │
│                                                                      │
│    VB6 calls: populateHistogram(jsonString, numBins)               │
│                                                                      │
│    populateHistogram() receives the processedData:                  │
│    → Extracts S.values (transformed values for visualization)      │
│    → Calculates histogram bins                                      │
│    → Updates Chart.js graph                                         │
│    → Updates statistics panels                                      │
│    → Renders all related charts (KDE, QQ-plot, etc.)               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Code Locations

### 1. **Column Selection Handler** (InputsXL-OnePanel-ES5-ordo.html: 1203-1230)
```javascript
qs('ddlVariable').onchange = function() {
  var r = qs('tbRange').value || '';
  var v = this.value || '';
  if(r && v) {
    S.rawValues = [];
    sendToHost('GetVariableData', JSON.stringify({ range: r, variable: v }));
  }
};
```

### 2. **VB6 Data Population** (InputsXL-OnePanel-ES5-ordo.html: 986-1136)
```javascript
window.populateFromVB6 = function(jsonString) {
  var d = JSON.parse(jsonString);
  S.rawValues = [...];  // Valid numeric values
  S.totalDataCount = d.values.length;
  enableTabs();
  recalc();  // Triggers autoSendResults()
};
```

### 3. **Recalculate Function** (InputsXL-OnePanel-ES5-ordo.html: 683-720)
```javascript
function recalc() {
  // Apply trim and transform
  S.valuesTrimmed = [];  // Trimmed data
  S.values = [];         // Transformed data
  
  // Update UI
  renderStats(S.valuesTrimmed);
  renderDatasetSummary();
  statusDirty();
  
  autoSendResults();  // ◄── TRIGGERS HISTOGRAM UPDATE
}
```

### 4. **Auto-Send Results** (InputsXL-OnePanel-ES5-ordo.html: 629-681)
```javascript
function autoSendResults() {
  if (!autoUpdateEnabled || !S.rawValues.length) return;
  
  showUpdateIndicator();
  
  autoUpdateTimer = setTimeout(function() {
    var processedData = {
      variableName: selectedVar,
      rawValues: S.rawValues,
      trimmedValues: S.valuesTrimmed,
      transformedValues: S.values,
      transformType: transformType,
      trimRange: { min: trimMin, max: trimMax },
      keepModule: true
    };
    
    sendToHost('ShowResults', JSON.stringify(processedData));
    hideUpdateIndicator();
  }, 500);  // 500ms debounce
}
```

### 5. **Histogram Population** (0HistogramPlus.html: 2170+)
```javascript
function populateHistogram(jsonString, numBins) {
  var data = JSON.parse(jsonString);
  // Extract S.values (transformed data)
  // Calculate bins
  // Update Chart.js graph
  // Render all visualizations
}
```

---

## Data Flow Summary

| Stage | Variable | Contains |
|-------|----------|----------|
| **1. User Input** | Column name selected | "Age", "Salary", etc. |
| **2. Request** | `{ range, variable }` | "Sheet1!A1:D100", "Age" |
| **3. VB6 Extraction** | `d.values` | Raw data array from Excel |
| **4. Filtering** | `S.rawValues` | Numeric values only |
| **5. Trimming** | `S.valuesTrimmed` | After min/max trim applied |
| **6. Transform** | `S.values` | After ln/sqrt/etc. applied |
| **7. Send to Histogram** | `processedData` | All three arrays + metadata |
| **8. Display** | Chart | Histogram visualization |

---

## Key Points

✅ **Automatic Updates**: When column changes, histogram updates automatically (no "Run" button needed)  
✅ **Debouncing**: 500ms delay prevents excessive updates when multiple changes occur rapidly  
✅ **Data Validation**: Only numeric values are passed to histogram  
✅ **Preserve Transforms**: Active trim/transform settings are automatically applied  
✅ **State Management**: Global `S` object tracks rawValues, valuesTrimmed, and transformed values  
✅ **VB6 Integration**: All Excel data retrieval happens via `sendToHost` / `RaiseMessageEvent`

---

## Related Events That Also Trigger `autoSendResults()`

1. **Slider Change** (Line 1236): Moving trim sliders
2. **Text Input Change** (Line 1237): Typing explicit min/max values
3. **Transform Selection** (Line 1240): Changing transformation function (ln, sqrt, etc.)
4. **Group Selection** (Line 1234): Selecting different subgroup

All these call `recalc()` → `autoSendResults()` → Histogram updates
