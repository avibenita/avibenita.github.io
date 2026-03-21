# Embedded power UI (GitHub Pages only)

There is **no** `index-calculator.html` in git here. The only canonical copies are:

- **`statistico-calculators/index-calculator.html`**
- **`statistico-calculators/index-formulas.html`**

Before each deploy, **`.github/workflows/static.yml`** copies those files into this folder so **statistico.live** can serve them at:

- `/statistico-analytics/embed/index-calculator.html`
- `/statistico-analytics/embed/index-formulas.html`

(GitHub Pages does not reliably serve the same files under `/statistico-calculators/`.)

**Local dev:** run `scripts/sync-embed-from-calculators.ps1` (or the `.sh` script) after editing the calculator, if you need this folder populated.
