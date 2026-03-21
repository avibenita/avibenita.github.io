# Power & Sample Size Calculator

**Canonical source in git** for the interactive power / sample-size UI and formula reference.

| File | Role |
|------|------|
| **`index-calculator.html`** | Main calculator — **edit this** for UI/logic. |
| **`index-formulas.html`** | Formula reference (module switcher links here). |
| `calculator-helper.js` | Build URLs with pre-filled query params. |
| `SampleSizeCalculator.html` / `SampleSizeFormulas.html` | Legacy entry names; redirect (https → embed, `file:` → same folder). |

**Parent hub:** [`../README.md`](../README.md) (`statistico-calculators/` — other calculators live alongside this folder.)

**Live site (GitHub Pages):** files are copied to **`/statistico-analytics/embed/`** on deploy so the ANOVA iframe and Office hosts load reliably. See **`.github/workflows/static.yml`**.

**Local preview of embed:** run `scripts/sync-embed-from-calculators.ps1` (or `.sh`) after edits.
