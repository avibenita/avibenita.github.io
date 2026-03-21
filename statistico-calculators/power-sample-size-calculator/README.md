# Power & Sample Size Calculator

**Canonical source in git** for the interactive power / sample-size UI and formula reference.

| File | Role |
|------|------|
| **`index-calculator.html`** | Main calculator — **edit this** for UI/logic. |
| **`index-formulas.html`** | Formula reference (module switcher links here). |
| `calculator-helper.js` | Build URLs with pre-filled query params. |
| `SampleSizeCalculator.html` / `SampleSizeFormulas.html` | Legacy entry names; redirect (https → `/statistico-analytics/embed/`, `file:` → same folder). |

**Repo layout:** This folder is the calculator package under `statistico-calculators/`.

**Live site (GitHub Pages):** **`/statistico-analytics/embed/index-calculator.html`** (and `index-formulas.html`) — CI copies from this folder before deploy. **Source of truth** remains the files here; deep paths under `/statistico-calculators/...` may 404 on statistico.live.

**Local preview of embed:** run `scripts/sync-embed-from-calculators.ps1` (or `.sh`) after edits (matches CI).
