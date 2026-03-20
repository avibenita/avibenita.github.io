# Power & Sample Size Button Integration Guide

## Quick Update for ANOVA Dashboard

If your "Power & Sample Size" button is pointing to an old version, update it using one of these methods:

### Method 1: Using the Helper Function (Recommended)

**Include the helper script in your HTML:**
```html
<script src="../statistico-calculators/calculator-helper.js"></script>
```

**Update your button's onclick handler:**
```html
<button class="power-button" onclick="navigateToCalculator('anova', {
    numGroups: 3,  // Update based on your actual number of groups
    effectSizeF: 0.25,  // Update based on your effect size
    alpha: 0.05,  // From your design table
    power: 0.80  // Default power
})">
    <i class="fas fa-bolt"></i> Power & Sample Size
</button>
```

### Method 2: Direct URL (If helper script not available)

```html
<button class="power-button" onclick="window.location.href = '../statistico-calculators/SampleSizeCalculator.html?test=anova&numGroups=3&effectSizeF=0.25&alpha=0.05&power=0.80&autoCalculate=true'">
    <i class="fas fa-bolt"></i> Power & Sample Size
</button>
```

### Method 3: Dynamic Values from Your Analysis

If you need to extract values dynamically from your ANOVA results:

```javascript
function openPowerCalculator() {
    // Extract values from your current analysis
    const numGroups = getNumberOfGroups(); // Your function to get groups
    const effectSizeF = calculateEffectSizeF(); // Your function to calculate f
    const alpha = getAlpha(); // From design table (e.g., 0.05)
    
    navigateToCalculator('anova', {
        numGroups: numGroups,
        effectSizeF: effectSizeF,
        alpha: alpha,
        power: 0.80
    });
}
```

Then in your HTML:
```html
<button class="power-button" onclick="openPowerCalculator()">
    <i class="fas fa-bolt"></i> Power & Sample Size
</button>
```

## For Two-Way Factorial ANOVA

**Note:** The current calculator supports One-Way ANOVA. For Two-Way Factorial ANOVA, you may need to:
1. Use the One-Way ANOVA option with the total number of groups (Factor A × Factor B)
2. Or calculate effect size based on your η² value

**Example for Two-Way Factorial:**
```javascript
// If you have Factor A with 2 levels and Factor B with 3 levels
const factorA = 2;
const factorB = 3;
const totalGroups = factorA * factorB; // 6 groups

// Convert η² to Cohen's f if needed
// f = sqrt(η² / (1 - η²))
const etaSquared = 0.203; // From your results
const cohensF = Math.sqrt(etaSquared / (1 - etaSquared));

navigateToCalculator('anova', {
    numGroups: totalGroups,
    effectSizeF: cohensF,
    alpha: 0.05,
    power: 0.80
});
```

## Path Adjustments

Adjust the path to `calculator-helper.js` based on your file structure:

- If calculator is at: `statistico-calculators/SampleSizeCalculator.html`
- And your ANOVA page is at: `statistico-anova/index.html`
- Use: `<script src="../statistico-calculators/calculator-helper.js"></script>`

Or use absolute path:
```html
<script src="/statistico-calculators/calculator-helper.js"></script>
```

## Complete Example

```html
<!DOCTYPE html>
<html>
<head>
    <script src="../statistico-calculators/calculator-helper.js"></script>
</head>
<body>
    <!-- Your ANOVA results here -->
    
    <div class="decision-bar">
        <span>sig p < .001</span>
        <button class="power-button" 
                onclick="navigateToCalculator('anova', {
                    numGroups: 6,  // Factor A (2) × Factor B (3)
                    effectSizeF: 0.51,  // Calculated from η² = 0.203
                    alpha: 0.05,
                    power: 0.80
                })">
            <i class="fas fa-bolt"></i> Power & Sample Size
        </button>
    </div>
</body>
</html>
```
