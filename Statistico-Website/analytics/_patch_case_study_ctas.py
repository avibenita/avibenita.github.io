#!/usr/bin/env python3
from pathlib import Path
import re

base = Path(__file__).resolve().parent

CASE = {
    "univariate.html": (
        "Horsepower Distribution — Univariate Analysis",
        "/statistico-analytics/dialogs/views/univariate/histogram-standalone.html?embed=1&demo=1",
    ),
    "correlation.html": (
        "Marketing Mix Drivers — Correlation Analysis",
        "/statistico-analytics/dialogs/views/correlations/correlation-matrix.html?embed=1&demo=1",
    ),
    "independent-means.html": (
        "Treatment vs Control — Independent Means",
        "/statistico-analytics/dialogs/views/independent/independent-results.html?embed=1&demo=1",
    ),
    "paired-repeated.html": (
        "Before–After Intervention — Paired Means",
        "/statistico-analytics/dialogs/views/dependent/dependent-results.html?embed=1&demo=1",
    ),
    "anova.html": (
        "Dose Groups — One-Way ANOVA",
        "/statistico-analytics/dialogs/views/anova/anova-results.html?embed=1&demo=1",
    ),
    "mixed-models.html": (
        "Clinic Visits — Mixed Model",
        "/statistico-analytics/dialogs/views/mixed/mixed-results.html?embed=1&demo=1",
    ),
    "linear-regression.html": (
        "Sales Drivers — Linear Regression",
        "/statistico-analytics/dialogs/views/regression/regression-coefficients.html?embed=1&demo=1",
    ),
    "logistic-regression.html": (
        "Customer Churn — Logistic Regression",
        "/statistico-analytics/dialogs/views/logistic/logistic-results-v3.html?embed=1&demo=1",
    ),
    "factor-analysis.html": (
        "Employee Engagement Survey — Factor Analysis",
        "/statistico-analytics/dialogs/views/factor/factor-results-v3.html?embed=1&demo=1",
    ),
    "pca.html": (
        "Product Attributes — PCA",
        "/statistico-analytics/dialogs/views/pca/pca-analysis.html?embed=1&demo=1",
    ),
    "k-means.html": (
        "Customer Segments — K-Means Clustering",
        "/statistico-analytics/dialogs/views/cluster/cluster-analysis.html?lockedMethod=kmeans&embed=1&demo=1",
    ),
    "hierarchical.html": (
        "Customer Taxonomy — Hierarchical Clustering",
        "/statistico-analytics/dialogs/views/cluster/cluster-analysis.html?lockedMethod=hierarchical&embed=1&demo=1",
    ),
}

for name, (title, url) in CASE.items():
    path = base / name
    text = path.read_text(encoding="utf-8")
    case_btn = (
        f'<a class="btn btn-primary js-case-study" href="{url}" '
        f'title="{title}">Start Case Study <i class="fa-solid fa-play" aria-hidden="true"></i></a>'
    )
    gallery_btn = (
        '<a class="btn btn-ghost" href="#gallery">Explore Module Screens '
        '<i class="fa-solid fa-arrow-down" aria-hidden="true"></i></a>'
    )
    text2, n1 = re.subn(
        r'<div class="hero-cta">\s*<a class="btn btn-primary"[^>]*>.*?</a>\s*<a class="btn btn-ghost"[^>]*>.*?</a>',
        f'<div class="hero-cta">\n        {case_btn}\n        {gallery_btn}',
        text,
        count=1,
        flags=re.S,
    )
    text3, n2 = re.subn(
        r'(<div class="final-cta">.*?<div class="hero-cta">\s*)'
        r'(?:<a class="btn btn-primary"[^>]*>Start Case Study.*?</a>\s*)?'
        r'<a class="btn btn-primary" href="#gallery">Explore Module Screens</a>',
        rf"\1{case_btn}\n            <a class=\"btn btn-ghost\" href=\"#gallery\">Explore Module Screens</a>",
        text2,
        count=1,
        flags=re.S,
    )
    path.write_text(text3, encoding="utf-8")
    print(f"{name}: hero={n1} final={n2}")
