# `embed/` — power calculator mirror for GitHub Pages

**Canonical source in git:** `statistico-calculators/power-sample-size-calculator/`

On each deploy, `.github/workflows/static.yml` copies `index-calculator.html` and
`index-formulas.html` into this folder so they ship with the Pages artifact. Files are
listed in `.gitignore` here so the mirror is **CI-only**, not duplicated in commits.

**URL used by ANOVA (hosted):**

- `/statistico-analytics/embed/index-calculator.html`

That path lives next to `dialogs/views/...` on the same origin, which avoids **404** on
some hosts where `/statistico-calculators/...` is missing or not routed.

Direct calculators URLs still work when that tree is deployed:

- `/statistico-calculators/power-sample-size-calculator/index-calculator.html`
