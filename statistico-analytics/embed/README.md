# Embedded power UI (GitHub Pages only)

There is **no** `index-calculator.html` in git here. The **canonical source** is:

**`statistic-calculators/power-sample-size-calculator/index-calculator.html`**  
**`statistic-calculators/power-sample-size-calculator/index-formulas.html`**

Before each deploy, **`.github/workflows/static.yml`** copies those files into this folder so **statistico.live** can serve:

- `/statistico-analytics/embed/index-calculator.html`
- `/statistico-analytics/embed/index-formulas.html`

**Local dev:** run `scripts/sync-embed-from-calculators.ps1` (or `.sh`) after editing the calculator.
