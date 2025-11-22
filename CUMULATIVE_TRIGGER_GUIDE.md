# Cumulative Probability Chart Trigger Guide

## 🎯 Overview

The **cumulative probability distribution** (CDF) chart needs to be triggered when the column changes, just like the histogram. Currently, it uses `populateKernelDensity()` function but may not be automatically triggered.

---

## 📊 Current Setup

### Cumulative Chart File
- **Location**: `HTMLtemplates/0cumulative-probability-chart.html`
- **Function**: `window.populateKernelDensity(jsonLike)`
- **Purpose**: Displays cumulative distribution function (CDF)

### How It Should Work
```
Column Change
    ↓
autoSendResults() packages data
    ↓
sendToHost('ShowResults', data) → VB6
    ↓
VB6 calls populateHistogram() 
    ↓
(Also should call) populateKernelDensity() for cumulative
    ↓
CDF chart updates
```

---

## 🔗 Integration Points

### 1. **VB6 Side (External)**
When InputX calls `sendToHost('ShowResults', data)`, VB6 should:
```vb
' Send to histogram
Call populateHistogram(jsonData)

' Also send to cumulative  
Call populateCumulativeChart(jsonData)  ' or populateKernelDensity()
```

### 2. **JavaScript Side (InputsXL)**
The `autoSendResults()` function sends data like:
```javascript
sendToHost('ShowResults', JSON.stringify(processedData));
```

The `processedData` object includes all three data arrays:
```javascript
{
  variableName: "Age",
  rawValues: [32, 45, 28, ...],
  trimmedValues: [32, 45, 28, ...],
  transformedValues: [3.46, 3.81, 3.33, ...],
  transformType: "ln",
  trimRange: { min: 20, max: 80 },
  totalDataCount: 500,
  trimApplied: true,
  originalCount: 456,
  keepModule: true
}
```

### 3. **Cumulative Chart Side**
The cumulative chart receives data via:
```javascript
window.populateKernelDensity = function(jsonLike) {
  // Parse data
  // Calculate CDF
  // Update chart
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Cumulative Chart Doesn't Update When Column Changes

**Symptom**: Histogram updates but cumulative chart shows old data

**Cause**: VB6 is only calling `populateHistogram()`, not `populateKernelDensity()`

**Solution**: 
1. In VB6 code, after calling `populateHistogram()`, also call:
```vb
' Get reference to cumulative chart and call its function
If Not cumulativeWebWindow Is Nothing Then
    Call cumulativeWebWindow.Document.parentWindow.populateKernelDensity(jsonData)
End If
```

Or if cumulative is in same page:
```vb
Call cumulativeWebWindow.Document.parentWindow.execScript( _
    "if(window.populateKernelDensity){populateKernelDensity('" & jsonData & "')}")
```

---

### Issue 2: Data Format Wrong for Cumulative Chart

**Symptom**: Cumulative chart gives error "no valid numeric array"

**Cause**: Data structure from InputX might not match what cumulative expects

**Solution**: Check console for error messages:
```
populateKernelDensity (CDF): no valid numeric array found in payload
```

Look at what cumulative chart expects:
```javascript
// The function tries to find valid data in:
var values = payload.transformedValues || 
             payload.rawValues || 
             payload.values || 
             payload.data || 
             [];
```

So ensure one of these keys exists in `processedData`

---

## 📝 Triggers for Cumulative Update

### These events should trigger cumulative update:

1. **Column change** (ddlVariable.onchange)
   - ✅ User selects new column
   - → autoSendResults() → Cumulative should update

2. **Trim slider change** (slMin/slMax)
   - ✅ User moves trim sliders
   - → autoSendResults() → Cumulative should update

3. **Explicit min/max change** (tbMin/tbMax)
   - ✅ User enters min/max values
   - → autoSendResults() → Cumulative should update

4. **Transform change** (Transform radio buttons)
   - ✅ User selects ln, sqrt, etc.
   - → autoSendResults() → Cumulative should update

5. **Group/subgroup change** (ddlGroupValue)
   - ✅ User filters by group
   - → autoSendResults() → Cumulative should update

---

## 📋 Data Format Reference

### What InputX Sends
```javascript
processedData = {
  variableName: "Age",
  rawValues: [32, 45, 28, 51, 38, ...],  // Original data
  trimmedValues: [32, 45, 28, 51, 38],   // After trim range
  transformedValues: [3.46, 3.81, 3.33, 3.93, 3.64, ...],  // After transform
  transformType: "ln",                    // Type of transform
  trimRange: { min: 20, max: 80 },       // Trim settings
  totalDataCount: 100,                    // Total values
  trimApplied: true,                      // Is trim active
  originalCount: 95,                      // Count after filtering
  keepModule: true                        // Flag for persistence
}
```

### What Cumulative Chart Looks For
The `populateKernelDensity()` function expects:
```javascript
// Tries to find numeric array in:
payload.transformedValues  // ← Best choice (already transformed)
payload.rawValues          // ← Fallback (original)
payload.values             // ← Fallback (generic)
payload.data               // ← Fallback (generic)
```

---

## 🔧 Implementation Checklist

- [ ] VB6 receives `ShowResults` message from InputX
- [ ] VB6 parses the processedData JSON correctly
- [ ] VB6 calls `populateHistogram()` with data
- [ ] **VB6 also calls `populateKernelDensity()` with same data**
- [ ] Cumulative chart window receives the function call
- [ ] `populateKernelDensity()` parses the incoming JSON
- [ ] Cumulative chart validates numeric data
- [ ] CDF is calculated from transformedValues
- [ ] Chart updates with new CDF

---

## 📞 Debugging Cumulative Issues

### Step 1: Check Console in Cumulative Chart
1. Open cumulative chart in browser
2. Press F12 → Console tab
3. Look for errors from `populateKernelDensity()`

### Step 2: Monitor Function Calls
Add logging to `populateKernelDensity()`:
```javascript
window.populateKernelDensity = function(jsonLike) {
    console.log('📡 populateKernelDensity CALLED');
    console.log('📦 Received data:', jsonLike);
    
    try {
        var payload = typeof jsonLike === 'string' ? JSON.parse(jsonLike) : jsonLike;
        console.log('✅ Data parsed successfully');
        console.log('📊 Data keys:', Object.keys(payload));
        console.log('📊 Transformed values count:', payload.transformedValues ? payload.transformedValues.length : 'N/A');
        
        // ... rest of function ...
    } catch(e) {
        console.error('❌ Error in populateKernelDensity:', e);
    }
};
```

### Step 3: Check VB6 Communication
In InputX console, monitor sendToHost:
```javascript
// See in console when column changes:
📤 sendToHost result: true  // ← This means VB6 received it
```

If `false`, VB6 connection is broken

### Step 4: Verify Data Structure
In InputX console, check what's being sent:
```javascript
// Type in console:
autoSendResults()  // Force manual trigger
// Watch console for:
📦 Processed data package:
   ├─ Variable: Age
   ├─ Raw values: 100
   ├─ Trimmed values: 98
   ├─ Transformed values: 98  // ← This goes to cumulative
```

---

## 💡 Solution Options

### Option 1: VB6 Triggers Cumulative (Recommended)
**Pro**: Automatic, consistent  
**Con**: Requires VB6 code changes

```vb
' In VB6, after histogram:
If Not objCumulativeWindow Is Nothing Then
    objCumulativeWindow.Document.parentWindow.populateKernelDensity(jsonString)
End If
```

### Option 2: InputX Direct Call (Alternative)
**Pro**: No VB6 changes needed  
**Con**: Requires knowing cumulative window reference

```javascript
// In autoSendResults(), also send directly:
try {
    if(window.opener && window.opener.populateKernelDensity) {
        window.opener.populateKernelDensity(JSON.stringify(processedData));
    }
} catch(e) { /* window not available */ }
```

### Option 3: BroadcastChannel (Modern)
**Pro**: No window references needed  
**Con**: Requires browser support

```javascript
// In InputX:
var bc = new BroadcastChannel('statstico-cumulative');
bc.postMessage(processedData);

// In cumulative chart:
var bc = new BroadcastChannel('statstico-cumulative');
bc.onmessage = (event) => {
    populateKernelDensity(JSON.stringify(event.data));
};
```

---

## 📊 Timing Sequence

```
User selects column
    ↓
[5ms] ddlVariable.onchange
    ↓
[10ms] sendToHost('GetVariableData')
    ↓
[50ms] VB6 returns data
    ↓
[50ms] populateFromVB6() called
    ↓
[60ms] recalc() processes
    ↓
[65ms] autoSendResults() schedules
    ↓
[500ms] Debounce timeout
    ↓
[505ms] sendToHost('ShowResults') to VB6
    ↓
[510ms] VB6 calls populateHistogram()
    ↓
[510ms] VB6 should also call populateKernelDensity()  ← KEY STEP
    ↓
[515ms] Both charts update
```

---

## ✅ Verification

After implementing cumulative trigger, verify:

- [ ] Column change in InputX
- [ ] Histogram updates ✓
- [ ] Cumulative chart also updates ✓
- [ ] Console shows no errors
- [ ] Data counts match between charts
- [ ] Transforms are applied consistently
- [ ] Trim ranges affect both charts

---

## 🔗 Related Files

- `InputsXL-OnePanel-ES5-ordo.html` - Sends data via `autoSendResults()`
- `0cumulative-probability-chart.html` - Receives data via `populateKernelDensity()`
- `0HistogramPlus.html` - Receives data via `populateHistogram()`
- VB6/VBA code - Bridges between InputX and charts

---

## 📚 See Also

- `README_CONSOLE_LOGGING.md` - How to debug with console logs
- `COLUMN_CHANGE_TRIGGER_FLOW.md` - Complete trigger mechanism
- `CONSOLE_DEBUGGING_GUIDE.md` - Debugging troubleshooting

---

## ⚡ Quick Summary

**Current State**: 
- InputX triggers Histogram automatically ✅
- InputX does NOT trigger Cumulative automatically ❌

**To Fix**:
1. **Option A** (Recommended): Add VB6 code to call `populateKernelDensity()` after `populateHistogram()`
2. **Option B**: Add direct JavaScript call in `autoSendResults()` 
3. **Option C**: Use BroadcastChannel for modern communication

**Data Format**: `processedData` object with `transformedValues` array is ready for cumulative

**Timing**: Both should update ~500-520ms after column selection
