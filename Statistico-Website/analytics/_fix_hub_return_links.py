#!/usr/bin/env python3
from pathlib import Path
import re

MAP = {
    "univariate.html": "univariate",
    "correlation.html": "correlations",
    "independent-means.html": "independent",
    "paired-repeated.html": "dependent",
    "anova.html": "anova",
    "mixed-models.html": "mixed",
    "linear-regression.html": "regression",
    "logistic-regression.html": "logistic",
    "factor-analysis.html": "factor",
    "pca.html": "pca",
    "k-means.html": "kmeans",
    "hierarchical.html": "hierarchical",
}

ROOT = Path(__file__).resolve().parent


def main() -> None:
    for name, key in MAP.items():
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        hub = f"/Statistico-Website/index-Analytics.html?module={key}#module-cap-section"
        text2 = re.sub(
            r'href="/Statistico-Website/index-Analytics\.html"(?![^>]*module=)',
            f'href="{hub}"',
            text,
        )
        if text2 != text:
            path.write_text(text2, encoding="utf-8")
            print("fixed", name)
        else:
            print("no change", name)


if __name__ == "__main__":
    main()
