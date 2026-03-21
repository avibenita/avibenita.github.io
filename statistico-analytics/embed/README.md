# Embedded power UI (GitHub Pages)

`index-calculator.html` and `index-formulas.html` here are **copies** of the files in **`statistico-calculators/`** (canonical source in git).

**Why duplicate?** GitHub Pages for this site returns **404** for most files under `/statistico-calculators/`, while paths under **`/statistico-analytics/`** are served correctly. The ANOVA dialog iframe and legacy redirects target **`/statistico-analytics/embed/`** so the calculator loads on **statistico.live**.

The workflow **`.github/workflows/static.yml`** runs `cp` before deploy so embed stays in sync with `statistico-calculators/` when you edit the source there.
