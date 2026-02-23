# Cloud Functions Reorganization Plan

## 🎯 Goal
Organize cloud functions by Statistico Analytics modules (not by individual operations) for better maintainability, lower cost, and cleaner architecture.

## 📊 Current vs. Proposed Structure

### Current Structure (Operation-Based)
```
cloud-functions/
├── permutation_engine/          
├── rm_anova_power/              
└── [future duplicates...]
```
❌ Problems:
- Separate function per operation = many cold starts
- Code duplication across functions
- Hard to share utilities
- More expensive (multiple deployments)
- Confusing API structure

### Proposed Structure (Module-Based)
```
cloud-functions/
├── dependent_module/            ✅ NEW
│   ├── main.py                  (All dependent analyses)
│   ├── requirements.txt
│   └── README.md
│
├── independent_module/          (Future)
│   ├── main.py                  (All independent analyses)
│   ├── requirements.txt
│   └── README.md
│
├── correlation_module/          (Future)
├── regression_module/           (Future)
├── factor_module/               (Future)
├── logistic_module/             (Future)
└── univariate_module/           (Future)
```

## 🏗️ Module Breakdown

### 1. Dependent Module (`dependent_module`)
**Handles:** Repeated measures, paired samples, within-subjects

**Operations:**
- `power` - RM-ANOVA power analysis (✅ implemented)
- `permutation` - Paired permutation tests
- `bootstrap` - Paired bootstrap CI
- `effect_sizes` - Paired effect sizes (Cohen's d, etc.)

**URL:** `https://REGION-PROJECT.cloudfunctions.net/dependent-module`

**Request format:**
```json
{
  "operation": "power",
  "mode": "observed",
  ...data...
}
```

### 2. Independent Module (`independent_module`)
**Handles:** Independent samples, between-subjects

**Operations:**
- `power` - Two-sample t-test power
- `permutation` - Independent permutation tests
- `bootstrap` - Independent bootstrap CI
- `welch_exact` - Exact Welch t-test
- `equivalence` - Equivalence tests (TOST)

### 3. Correlation Module (`correlation_module`)
**Operations:**
- `power` - Correlation power analysis
- `permutation` - Permutation correlations
- `bootstrap` - Bootstrap correlation CI
- `matrix` - Correlation matrix operations

### 4. Regression Module (`regression_module`)
**Operations:**
- `power` - Regression power analysis
- `diagnostics` - Advanced diagnostics
- `bootstrap` - Bootstrap coefficients
- `permutation` - Permutation F-test

### 5. Other Modules
- `factor_module` - Factor analysis operations
- `logistic_module` - Logistic regression
- `univariate_module` - Distribution tests

## 💡 Benefits

### Cost Savings
- **Before:** 20+ separate functions = 20 cold starts
- **After:** 7 functions = 7 cold starts
- **Savings:** ~65% fewer cold starts

### Maintainability
- Shared utilities within each module
- Consistent API structure
- Easier to add new operations
- Single deployment per module

### Performance
- Warm containers stay alive longer
- Shared imports and initialization
- Better resource utilization

### Developer Experience
- Clear module boundaries
- Easy to find relevant code
- Consistent patterns across modules

## 🚀 Migration Strategy

### Phase 1: Create Module Structure (✅ Done)
- [x] Create `dependent_module/`
- [x] Implement power analysis in new structure
- [x] Add routing for operations
- [x] Write documentation

### Phase 2: Deploy & Test
1. Deploy `dependent-module` function
2. Update add-in to use new URL with `operation` parameter
3. Test power analysis
4. Verify backwards compatibility

### Phase 3: Migrate Other Operations
1. Move permutation tests to dependent_module
2. Add bootstrap operations
3. Add effect size calculations

### Phase 4: Create Other Modules
1. Implement `independent_module`
2. Implement `correlation_module`
3. Implement remaining modules

### Phase 5: Cleanup
1. Deprecate old functions
2. Remove duplicated code
3. Update all documentation

## 📝 Implementation Details

### Function Entry Point Pattern
```python
def module_name(request):
    """Main entry point"""
    operation = request.get_json().get("operation")
    
    if operation == "power":
        return handle_power_analysis(data)
    elif operation == "permutation":
        return handle_permutation(data)
    # ...
```

### Client Request Pattern
```javascript
const response = await fetch(MODULE_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'power',
    mode: 'observed',
    ...data
  })
});
```

### Backward Compatibility
Keep old function URLs working for 3-6 months:
```python
# Old function can redirect to new module
def rm_anova_power(request):
    # Add operation parameter
    data = request.get_json()
    data['operation'] = 'power'
    # Forward to new module
    return dependent_module(request)
```

## 🎯 Next Steps

1. **Deploy dependent_module** (you're doing this now!)
2. Update `dependent-results-kplus.html` to use:
   ```javascript
   const DEPENDENT_MODULE_URL = 'YOUR-DEPLOYED-URL';
   
   // Power analysis request
   fetch(DEPENDENT_MODULE_URL, {
     method: 'POST',
     body: JSON.stringify({
       operation: 'power',
       mode: 'observed',
       ...
     })
   })
   ```
3. Test thoroughly
4. Create `independent_module` next
5. Gradually migrate all operations

## 📊 Cost Comparison

### Current (After all features)
- 20 functions × $0.40/million invocations = $8/million
- 20 cold starts per user session

### Proposed
- 7 functions × $0.40/million invocations = $2.80/million  
- 7 cold starts per user session
- **~65% cost reduction**

## 🎉 Conclusion

Module-based organization is:
- ✅ More maintainable
- ✅ More cost-effective
- ✅ Better developer experience
- ✅ Easier to extend
- ✅ Cleaner API

**Recommendation: Proceed with module-based architecture!**
