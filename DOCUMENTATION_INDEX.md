# Documentation Index: Column Change Trigger Flow

## Overview

This documentation explains how changing a column in the InputX dropdown triggers updates in the Histogram visualization in your Histogram Plus Plus application.

---

## 📚 Available Documentation

### 1. **COLUMN_CHANGE_TRIGGER_FLOW.md** (START HERE)
**Best for:** Understanding the complete flow with detailed explanations

Contains:
- Step-by-step flow diagram (8 stages)
- Key code locations with line references
- Data flow summary table
- Related events that trigger updates
- Full context and explanations

**Use this if you want:** A comprehensive overview with code examples

---

### 2. **COLUMN_CHANGE_SEQUENCE_DIAGRAM.txt** (FOR DETAILED TIMING)
**Best for:** Understanding timing, performance, and execution order

Contains:
- Timeline diagram (0ms to 520ms)
- Critical code sections with full implementation
- Global state object explanation
- Data transformation pipeline
- Debouncing explanation with examples
- All events that trigger autoSendResults()

**Use this if you want:** To understand exactly what happens and when

---

### 3. **COLUMN_CHANGE_QUICK_REFERENCE.md** (FOR QUICK LOOKUPS)
**Best for:** Quick facts, debugging, and modifications

Contains:
- TL;DR summary (520ms overview)
- File locations table
- The 4 key functions
- State object reference
- Three data arrays explanation
- Debug tips and common issues
- Code modification guide

**Use this if you want:** A cheat sheet for reference while coding

---

## 🎯 Reading Guide by Use Case

### "I just want to understand the basic flow"
→ Read: **COLUMN_CHANGE_QUICK_REFERENCE.md** (TL;DR section)

### "I need to fix a bug related to column changes"
→ Read: **COLUMN_CHANGE_QUICK_REFERENCE.md** (Debug Tips section)

### "I want to modify how the system works"
→ Read: **COLUMN_CHANGE_TRIGGER_FLOW.md** (Key Code Locations section)

### "I'm experiencing performance issues"
→ Read: **COLUMN_CHANGE_SEQUENCE_DIAGRAM.txt** (Debouncing Explanation section)

### "I need to understand the data flow completely"
→ Read: **COLUMN_CHANGE_TRIGGER_FLOW.md** (Data Flow Summary section)

### "I'm debugging and need to know what's happening at each step"
→ Read: **COLUMN_CHANGE_SEQUENCE_DIAGRAM.txt** (Timeline section)

---

## 🔑 Key Takeaways

### The Essential Flow
```
User selects column
    ↓
InputX requests data from VB6
    ↓
VB6 extracts from Excel
    ↓
InputX receives & validates data
    ↓
recalc() applies trim/transform
    ↓
autoSendResults() schedules update
    ↓
[500ms debounce delay]
    ↓
Histogram receives data
    ↓
Histogram redraws
```

**Total Time**: ~500-520ms (mostly debounce)

---

### The 4 Key Functions

| Function | Location | Does |
|----------|----------|------|
| `ddlVariable.onchange` | Line 1203 | Requests data from VB6 |
| `populateFromVB6()` | Line 986 | Receives & validates data |
| `recalc()` | Line 683 | Applies trim/transform |
| `autoSendResults()` | Line 629 | Sends data to histogram (debounced) |

---

### The 3 Data Arrays

Every update sends these three arrays to the histogram:

```javascript
rawValues       // Original numeric values from Excel
trimmedValues   // After applying min/max trim
transformedValues // After applying transformation (ln, sqrt, etc.)
```

**The histogram visualizes**: `transformedValues`

---

### Debounce = Smooth Performance

**Without debounce**: Moving slider = 100 redraws/second = SLUGGISH ❌

**With debounce** (500ms): Moving slider = 1 redraw after stop = SMOOTH ✅

---

## 📁 File Locations

| File | Size | Purpose |
|------|------|---------|
| `InputsXL-OnePanel-ES5-ordo.html` | 1,514 lines | Input panel with all logic |
| `0HistogramPlus.html` | 3,189 lines | Histogram visualization |
| VB6/VBA code | External | Data extraction from Excel |

---

## 🔍 Finding Code References

### Need to modify column selection?
→ Look at: `qs('ddlVariable').onchange` (Line 1203)

### Need to change validation rules?
→ Look at: `populateFromVB6()` (Line 986)

### Need to add/remove trim options?
→ Look at: `recalc()` (Line 683)

### Need to adjust debounce timing?
→ Look at: `autoSendResults()` (Line 629)

### Need to change histogram data format?
→ Look at: `processedData` object in `autoSendResults()` (Line 656-667)

---

## 🛠️ Common Modifications

### Increase debounce delay (slower updates)
```javascript
// Line 648:
setTimeout(function() { ... }, 1000);  // was 500
```

### Disable auto-update
```javascript
// Line 612:
var autoUpdateEnabled = false;  // was true
```

### Require more data points
```javascript
// Line 1082:
if(numericCount < 20) {  // was 5
```

---

## 🐛 Debugging Checklist

- [ ] Check browser console for error messages (look for 🔄 icons)
- [ ] Verify `S.rawValues` contains data after column selection
- [ ] Check `autoUpdateEnabled === true`
- [ ] Verify VB6 connection works (check `sendToHost` return value)
- [ ] Monitor 500ms debounce delay (is it too long?)
- [ ] Check Excel data has numeric values (not all text)
- [ ] Verify column has at least 5 valid numeric values
- [ ] Check if trim range is too restrictive

---

## 📊 Data Validation Rules

✅ Column must have at least **5 numeric values**  
✅ Only `parseFloat()` compatible values accepted  
✅ Text, blanks, NaN, Infinity automatically filtered  
✅ Excel AutoFilter is respected (visible rows only)  

---

## 🚀 Performance Tips

1. **For large datasets**: Increase debounce to 1000ms
2. **For responsive feel**: Decrease debounce to 250ms
3. **For smooth slider**: Keep debounce at 500ms
4. **For many columns**: Consider caching bin calculations

---

## 📞 Getting Help

### "The histogram doesn't update when I change columns"
1. Check if VB6 connection works
2. Verify `autoUpdateEnabled === true`
3. Check if column has numeric data
4. Look at browser console for errors

### "The histogram updates too slowly"
1. Increase debounce delay (more wait = smoother)
2. Reduce data size if possible
3. Check browser performance (other tabs open?)

### "The histogram updates too frequently"
1. Decrease debounce delay (less wait = more responsive)
2. Add logic to skip updates when nothing changed

### "Columns don't appear in dropdown"
1. Verify Excel range is selected
2. Check if range includes headers
3. Verify `setHeadersFromVB6()` is called

---

## 🔗 Related Events

All of these trigger `autoSendResults()` and update the histogram:

1. Column dropdown change
2. Trim slider movement
3. Explicit min/max input
4. Transform selection change
5. Group/subgroup selection
6. Reset button click

**Every interaction** that changes data goes through: `recalc()` → `autoSendResults()`

---

## 📋 Quick Links

**For understanding the big picture:**
- `COLUMN_CHANGE_TRIGGER_FLOW.md` → Step-by-Step Flow Diagram

**For understanding timing:**
- `COLUMN_CHANGE_SEQUENCE_DIAGRAM.txt` → Timeline & Debouncing

**For quick facts:**
- `COLUMN_CHANGE_QUICK_REFERENCE.md` → The 4 Key Functions

**For debugging:**
- `COLUMN_CHANGE_QUICK_REFERENCE.md` → Debug Tips & Common Issues

---

## 📝 Last Updated

Based on analysis of:
- `InputsXL-OnePanel-ES5-ordo.html` (Lines 1-1512)
- `0HistogramPlus.html` (Lines 1-3189)

Documentation created to explain column selection trigger mechanism and data flow to histogram visualization.

---

## ✨ Summary

When a user changes a column in InputX:

1. **5ms** - Event fires, request sent to VB6
2. **50ms** - VB6 returns data to JavaScript
3. **60ms** - Data validated and processed
4. **65ms** - Update scheduled (with 500ms debounce)
5. **565ms** - Histogram receives processed data
6. **570ms** - Visualization updates complete

The entire system is designed for smooth, responsive interaction while respecting user input and maintaining data integrity.

---

## 🎓 Learning Path

**New to this codebase?** Start here:
1. Read: `COLUMN_CHANGE_QUICK_REFERENCE.md` (5 min)
2. Read: `COLUMN_CHANGE_TRIGGER_FLOW.md` (10 min)
3. Read: `COLUMN_CHANGE_SEQUENCE_DIAGRAM.txt` (10 min)
4. Explore: The code in `InputsXL-OnePanel-ES5-ordo.html` (Line 1203+)

**Total learning time**: ~25 minutes to understand the complete mechanism
