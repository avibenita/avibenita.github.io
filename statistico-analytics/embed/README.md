# Embedded power UI (GitHub Pages)

These two files are **generated on deploy** (and optional local sync) from:

**`statistico-calculators/power-sample-size-calculator/index-calculator.html`**  
**`statistico-calculators/power-sample-size-calculator/index-formulas.html`**

Before each deploy, **`.github/workflows/static.yml`** copies them here so **statistico.live** can serve:

- `/statistico-analytics/embed/index-calculator.html`
- `/statistico-analytics/embed/index-formulas.html`

**Why not link straight to `statistico-calculators/...` on the live site?**  
GitHub Pages has been returning **404** for nested paths under `statistico-calculators/` while `statistico-analytics/` paths (including this folder) deploy reliably — so ANOVA and legacy redirects use **embed** as the runtime URL.

**Local dev:** run `scripts/sync-embed-from-calculators.ps1` (or `.sh`) after editing the calculator.
