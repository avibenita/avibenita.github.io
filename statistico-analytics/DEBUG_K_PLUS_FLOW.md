# K-Plus Data Flow Debug Guide

## Expected Flow for 3 Selected Variables (EngineSize, Horsepower, MSRP)

### 1. Configuration Dialog (`independent-input.html`)
**User selects:**
- Compare mode: "More than 2 groups"
- Selected columns: `["EngineSize", "Horsepower", "MSRP"]`

**Sends to host:**
```javascript
{
  action: "independentModel",
  data: {
    compareMode: "k-plus",
    selectedColumns: ["EngineSize", "Horsepower", "MSRP"],
    primaryFramework: "parametric",
    ...
  }
}
```

### 2. Backend (`taskpane/independent/independent-input-panel.js`)

**buildIndependentBundle() should:**

1. **Line 444-454:** Extract `selectedColumns` from spec
   - Should be: `["EngineSize", "Horsepower", "MSRP"]` (length = 3)

2. **Line 488-498:** Build `grouped` object in k-plus mode
   ```javascript
   grouped = {
     "EngineSize": [array of 110 numeric values],
     "Horsepower": [array of 110 numeric values],
     "MSRP": [array of 110 numeric values]
   }
   ```

3. **Line 528-538:** Build `groupDescriptives`
   ```javascript
   groupDescriptives = [
     { name: "EngineSize", n: 110, mean: X, sd: Y },
     { name: "Horsepower", n: 110, mean: X, sd: Y },
     { name: "MSRP", n: 110, mean: X, sd: Y }
   ]
   ```
   - **Length should be 3** (one per variable)

4. **Line 502-507:** Build `kplusSummary`
   ```javascript
   kplusSummary = {
     variableCount: 3,
     levelsCount: 3,
     totalN: 330,  // 3 * 110
     meanOverall: X
   }
   ```

5. **Line 581-606:** Build `omnibus` with `groupDescriptives`
   ```javascript
   omnibus = {
     levels: ["EngineSize", "Horsepower", "MSRP"],
     N: 330,
     groupDescriptives: [{ name: "EngineSize", n: 110, mean: X, sd: Y }, ...],
     ...
   }
   ```

6. **Line 620-676:** Return bundle with structure:
   ```javascript
   {
     setup: {
       selectedColumns: ["EngineSize", "Horsepower", "MSRP"],
       groupLevels: ["EngineSize", "Horsepower", "MSRP"],  // ⚠️ NOT row indices
       ...
     },
     explore: {
       selectedColumnStats: [...],  // 3 items
       kplusSummary: { variableCount: 3, ... }
     },
     results: {
       omnibus: {
         groupDescriptives: [...],  // ✅ 3 items with n/mean/sd
         ...
       }
     }
   }
   ```

### 3. UI (`independent-results-kplus.html`)

**populateBundle() receives bundle and:**

1. **Line 522-525:** Extract `ob.groupDescriptives`
   - Should be array of 3 objects with `{name, n, mean, sd}`

2. **Line 526-539:** Render header chips
   ```
   Groups: 3
   EngineSize (n=110, μ=3.18)
   Horsepower (n=110, μ=215.48)
   MSRP (n=110, μ=32,774)
   ```

3. **Line 721-727:** Populate Group Summaries panel
   - Variables compared: **3** (not 110!)
   - Total N: 330
   - Levels: 3
   - Overall mean: X

## Common Failure Points

### Issue 1: `groupDescriptives` is empty
**Symptoms:**
- Header shows "Groups: 3" but no variable chips with stats
- Falls back to else block showing only variable names

**Possible Causes:**
- `omnibus` is null (k-plus condition not entered)
- `groupDescriptives` array is not being created
- `groupDescriptives` items fail the filter (n is NaN or 0)

**Debug:**
- Check console logs: `[buildIndependentBundle k-plus] groupDescriptives`
- Check console logs: `[k-plus header] groupDescriptives`

### Issue 2: "Variables compared" shows 110
**Symptoms:**
- Group Summaries panel shows "Variables compared: 110"

**Root Cause:**
- Fallback using `s.groupLevels.length` which contains row indices

**Fix Applied:**
- Changed fallback to use `s.selectedColumns.length` or `ob.groupDescriptives.length`

### Issue 3: Wrong N in `groupDescriptives`
**Symptoms:**
- Each variable chip shows `n=330` instead of `n=110`

**Root Cause:**
- `grouped[colName]` contains ALL rows across columns instead of per-column values

**Check:**
- Line 489-497: Ensure each `colName` maps to its own column index

## Testing Checklist

After refresh with debug logging enabled:

1. ✅ Console shows: `[buildIndependentBundle k-plus] levels: ["EngineSize", "Horsepower", "MSRP"]`
2. ✅ Console shows: `[buildIndependentBundle k-plus] groupDescriptives: [{ name: "EngineSize", n: 110, ... }, ...]`
3. ✅ Console shows: `[k-plus header] groupDescriptives: [{ name: "EngineSize", n: 110, ... }, ...]`
4. ✅ Header displays: `Groups: 3` + 3 chips with stats
5. ✅ Group Summaries shows: `Variables compared: 3`
6. ✅ Group Summaries shows: `Total N: 330`

If any ❌:
- Check which console log is missing/wrong
- Trace backwards from that point
