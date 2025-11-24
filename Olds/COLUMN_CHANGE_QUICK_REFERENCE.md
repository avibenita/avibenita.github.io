# Quick Reference: Column Change Trigger Mechanism

## TL;DR - What Happens When User Changes Column?

```
User selects new column
         ↓
   [5ms] Event handler runs
         ↓
   [10ms] Request sent to VB6 (GetVariableData)
         ↓
   [50ms] VB6 extracts data from Excel
         ↓
   [50ms] populateFromVB6() receives data
         ↓
   [60ms] recalc() applies trim/transform
         ↓
   [65ms] autoSendResults() schedules update
         ↓
   [505ms] Debounce delay expires
         ↓
   [505ms] Data sent to histogram via sendToHost
         ↓
   [510ms] populateHistogram() renders chart
         ↓
   [520ms] UI updates complete ✓
```

**Total Time: ~500-520ms** (mostly from debounce delay)

---

## File Locations

| File | Purpose | Key Functions |
|------|---------|---|
| `InputsXL-OnePanel-ES5-ordo.html` | Input panel UI | `ddlVariable.onchange`, `recalc()`, `autoSendResults()`, `populateFromVB6()` |
| `0HistogramPlus.html` | Histogram visualization | `populateHistogram()` |
| VB6 Code (VBA) | Data extraction | `RaiseMessageEvent()` handler |

---

## The 4 Key Functions

### 1️⃣ Event Handler: `ddlVariable.onchange` (Line 1203)
```javascript
// Triggered when user selects new column
// DOES: Sends 'GetVariableData' request to VB6
// SENDS: { range, variable }
// TIME: 5-10ms
```

### 2️⃣ Data Population: `populateFromVB6()` (Line 986)
```javascript
// Triggered when VB6 returns data
// DOES: Validates & stores numeric values in S.rawValues
// CALLS: recalc()
// TIME: 50-60ms
```

### 3️⃣ Recalculation: `recalc()` (Line 683)
```javascript
// Apply all trim & transform settings
// DOES: Fills S.valuesTrimmed and S.values
// CALLS: autoSendResults()
// TIME: 60-65ms
```

### 4️⃣ Auto-Update: `autoSendResults()` (Line 629)
```javascript
// Schedule debounced update
// DOES: Packages data and sends 'ShowResults' to VB6
// DEBOUNCE: 500ms delay
// TIME: 65ms + 500ms = 565ms total
```

---

## The Global State Object (S)

Critical object that tracks all data:

```javascript
var S = {
  rawValues: [],        // ← Raw numeric data from Excel
  valuesTrimmed: [],    // ← After applying min/max trim
  values: [],           // ← After applying transformation
  rawGroups: [],        // ← Category/group for each value
  selectedGroup: "__ALL__",
  totalDataCount: 0,
  isFiltered: false,
  hiddenRows: 0,
  visibleRows: 0
};
```

**Flow**: `rawValues` → `valuesTrimmed` → `values` → Histogram

---

## Three Data Arrays Sent to Histogram

When `autoSendResults()` sends data to histogram, it includes:

```javascript
{
  variableName: "Age",
  rawValues: [32, 45, 28, 51, ...],        // Original
  trimmedValues: [32, 45, 28, 51, ...],    // After trim
  transformedValues: [3.46, 3.81, 3.33, ...], // After transform (e.g., ln)
  transformType: "ln",
  trimRange: { min: 20, max: 80 },
  trimApplied: true,
  totalDataCount: 500,
  originalCount: 456,
  keepModule: true
}
```

**Histogram uses**: `transformedValues` (for visualization)

---

## Why 500ms Debounce?

Without debounce: Moving slider = 100 histogram redraws per second = **SLUGGISH**

With debounce: Moving slider = 1 histogram redraw after you stop = **SMOOTH**

---

## All Events That Trigger Histogram Update

| Event | Location | Calls | Result |
|-------|----------|-------|--------|
| Column change | ddlVariable dropdown | populateFromVB6 → recalc | Data refetch + update |
| Trim slider | slMin/slMax | slidersChanged → recalc | Histogram redraws with new range |
| Text input | tbMin/tbMax | explicitValuesChanged → recalc | Histogram redraws with new values |
| Transform | Radio buttons | recalc | Histogram redraws with transformation |
| Group change | ddlGroupValue | recalc | Histogram filters by group |
| Reset button | btnResetTT | recalc | Histogram resets to full data |

**All paths**: `recalc()` → `autoSendResults()` → Histogram update

---

## Communication: JavaScript ↔ VB6

### JavaScript → VB6 (Requests)
```javascript
sendToHost('GetVariableData', JSON.stringify({ range, variable }))
sendToHost('ShowResults', JSON.stringify(processedData))
```

### VB6 → JavaScript (Responses)
```javascript
window.populateFromVB6(jsonString)  // Called by VB6 with data
```

---

## Data Validation Rules

✓ **Minimum 5 numeric values** - Required or tabs disabled  
✓ **Numeric filtering** - Only `parseFloat(value)` that passes `isFinite()`  
✓ **Auto-filtering** - Text, blanks, NaN, Infinity automatically removed  
✓ **Excel filters honored** - Only visible rows processed  

---

## Debug Tips

1. **Check console** for 🔄 messages: `console.log()` statements throughout
2. **Watch S.rawValues** - Should have numeric data after column change
3. **Check autoUpdateEnabled** - Must be `true` for auto-updates
4. **Verify sendToHost** - Should return `true` if VB6 connection works
5. **Look for debounce** - 500ms delay before histogram updates

---

## Common Issues & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Histogram doesn't update | autoUpdateEnabled = false | Enable in code |
| Blank histogram | No numeric data | Select column with numbers |
| Slow updates | Debounce too long | Reduce timeout value |
| Missing data | Trim too aggressive | Adjust min/max sliders |
| VB6 not responding | sendToHost fails | Check Excel macro setup |

---

## Code Entry Points for Debugging

```javascript
// Start here if column won't change:
qs('ddlVariable').onchange

// Start here if data won't load:
window.populateFromVB6

// Start here if histogram won't update:
autoSendResults

// Start here if transform doesn't work:
recalc()

// Start here to trace all messages:
sendToHost()
```

---

## Performance Optimization Ideas

1. **Increase debounce**: `setTimeout(..., 1000)` for very large datasets
2. **Decrease debounce**: `setTimeout(..., 250)` for responsive feel
3. **Limit data size**: Filter `S.rawValues` in `populateFromVB6()`
4. **Cache calculations**: Store previous bin calculations in `S`
5. **Progressive update**: Update UI before sending to histogram

---

## File Size Reference

- `InputsXL-OnePanel-ES5-ordo.html`: ~1,514 lines
- `0HistogramPlus.html`: ~3,189 lines (very large)
- Most of histogram file is Canvas drawing & calculations

---

## Related Functions You Might Need

```javascript
// Disable/enable processing tabs
disableTabs()
enableTabs()

// Show data validation messages
showValidationMessage(type, message, details)

// Render statistics display
renderStats(array)
renderDatasetSummary()

// Update visual indicators
updateTabIndicators()
statusDirty()
showUpdateIndicator()
hideUpdateIndicator()
```

---

## Quick Modification Guide

### To increase debounce delay (slower but smoother):
```javascript
// Line 648, change:
autoUpdateTimer = setTimeout(function() { ... }, 500);
// To:
autoUpdateTimer = setTimeout(function() { ... }, 1000);
```

### To disable auto-update:
```javascript
// Line 612, change:
var autoUpdateEnabled = true;
// To:
var autoUpdateEnabled = false;
```

### To require more data:
```javascript
// Line 1082, change:
if(numericCount < 5) {
// To:
if(numericCount < 20) {
```

### To skip VB6 data validation:
```javascript
// Line 1106, add after line 1106:
// Comment out: showValidationMessage(...)
```
