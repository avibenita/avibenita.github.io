# statistico-calculators — power engine (single source in git)

| File | Role |
|------|------|
| **`index-calculator.html`** | **Canonical** Power & Sample Size UI — edit this one. |
| **`index-formulas.html`** | **Canonical** formula reference. |
| `calculator-helper.js` | URL helpers for opening the calculator with query params. |
| `SampleSizeCalculator.html` / `SampleSizeFormulas.html` | Legacy URLs; redirect to embed (https) or same-folder file (`file:`). |

**GitHub Pages:** the live site copies these into **`statistico-analytics/embed/`** during deploy (see `.github/workflows/static.yml`). Public URLs:

- `/statistico-analytics/embed/index-calculator.html`
- `/statistico-analytics/embed/index-formulas.html`

**Local:** after editing the calculator, run `scripts/sync-embed-from-calculators.ps1` if you need the `embed/` folder populated for static preview.

There are **no** other full copies of `index-calculator.html` in the repo (removed typo-alias folders and stopped committing generated embed HTML).
