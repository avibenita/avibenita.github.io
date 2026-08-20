#!/usr/bin/env python3
"""Generate Statistico calculator overview pages from a shared template.

The calculators themselves are single-page browser apps: they render their UI
from JavaScript and carry almost no prose, so they are poor landing pages and
robots.txt keeps them out of the index. These overview pages are the indexable
documents that describe each calculator and link into it, mirroring what
analytics/_generate_module_overviews.py does for the Excel modules.

Every fact below is taken from the calculator source. Do not add capabilities
here that the tool does not have.

Usage: python _generate_calculator_overviews.py
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent

# Reuse the analytics page styling so both families look identical.
_ANALYTICS_GEN = OUT_DIR.parent / "analytics" / "_generate_module_overviews.py"
_spec = importlib.util.spec_from_file_location("_module_overviews", _ANALYTICS_GEN)
_analytics = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_analytics)
ACCENTS = _analytics.ACCENTS
css_block = _analytics.css_block

CALCULATORS = [
    {
        "file": "power-sample-size.html",
        "title": "Power &amp; Sample Size Calculator",
        "plain_title": "Power & Sample Size Calculator",
        "family": "Study Planning",
        "family_icon": "fa-bullseye",
        "accent": "cyan",
        "tool_url": "/statistico-calculators/power-sample-size-calculator/PowerCalculator.html",
        "tool_label": "Open the calculator",
        "meta_desc": (
            "Free power and sample size calculator for t-tests, proportions, correlation, one-way ANOVA "
            "and linear regression, with the power curve behind every answer."
        ),
        "app_desc": (
            "Browser-based power and sample size calculator covering one-sample and two-sample means, "
            "one-sample and two-sample proportions, correlation, one-way ANOVA and linear regression, "
            "with non-central distributions and a power curve."
        ),
        "hero_subline": "Plan the study before you collect the data.",
        "hero_lead": (
            "Set your significance level, the power you want to achieve and the effect you expect, and the "
            "calculator returns the sample size that reaches it — together with the power actually achieved "
            "and the curve of sample size against power."
        ),
        "steps": [
            ("fa-percent", "Alpha and hypothesis"),
            ("fa-gauge-high", "Target power"),
            ("fa-sliders", "Study design"),
            ("fa-chart-line", "Required n and power curve"),
        ],
        "caps": [
            ("fa-flask", "Seven test types, from t-tests to regression"),
            ("fa-gauge-high", "Solve for the n a target power requires"),
            ("fa-arrows-left-right", "One-sided or two-sided alternatives"),
            ("fa-scale-unbalanced", "Unequal allocation for two-sample means"),
            ("fa-chart-line", "Power curve with a full-screen view"),
            ("fa-square-root-variable", "Non-central distributions where they matter"),
            ("fa-link", "Shareable links that prefill the inputs"),
            ("fa-circle-half-stroke", "Dark and light themes"),
        ],
        "computes_title": "Every design the calculator covers",
        "computes_lead": (
            "Pick a test type in the sidebar and the design panel changes to the inputs that test needs. "
            "The effect size is always reported alongside the required sample size."
        ),
        "computes": [
            (
                "Means",
                [
                    ("Means (1-sample)", "One-sample t-test against a reference value, reported with Cohen's d."),
                    ("Means (2-sample)", "Two-sample t-test with Cohen's d and an allocation ratio when the groups are not the same size."),
                ],
            ),
            (
                "Proportions",
                [
                    ("Proportion (1-sample)", "A single expected proportion tested against a null value."),
                    ("Proportions (2-sample)", "Two independent proportions, entered as the expected p\u2081 and the comparison p\u2082."),
                ],
            ),
            (
                "Association and models",
                [
                    ("Correlation", "An expected correlation against a null value, planned through Fisher's z transformation."),
                    ("ANOVA", "One-way ANOVA for k groups using the effect size f, planned for the omnibus test."),
                    ("Regression", "Linear regression from the number of predictors and the R\u00b2 you expect to explain."),
                ],
            ),
        ],
        "method_title": "What the numbers rest on",
        "method_lead": "Worth knowing before you quote a sample size in a protocol.",
        "method_points": [
            "Power defaults to 0.80 and is the target the calculator solves for; the power actually achieved at the returned whole-number sample size is reported separately, because rounding up usually overshoots slightly.",
            "One-sample means and one-way ANOVA are computed through non-central distributions rather than a normal approximation, which matters most at small sample sizes.",
            "The power curve plots required sample size against power across the range, so you can see how much a study costs to move from 0.80 to 0.90 before committing.",
            "Results are planning figures for a single primary comparison. They carry no adjustment for dropout, clustering, interim analyses or multiple endpoints.",
        ],
        "faq": [
            (
                "What does this calculator solve for?",
                "The sample size required to reach a target power, given your significance level, hypothesis direction and expected effect. It also reports the power actually achieved at that sample size and draws the sample-size-against-power curve.",
            ),
            (
                "Which tests are supported?",
                "One-sample and two-sample means, one-sample and two-sample proportions, correlation, one-way ANOVA and linear regression.",
            ),
            (
                "Can I plan an unequal allocation between two groups?",
                "Yes, for two-sample means. An allocation field sets the ratio of the second group to the first, and the required size of each group is returned.",
            ),
            (
                "Does it handle non-inferiority, dropout or clustered designs?",
                "No. It plans conventional superiority tests of a single comparison, with no dropout inflation, no intracluster correlation and no equivalence or non-inferiority margins.",
            ),
            (
                "Do I need Excel or an install to use it?",
                "No. It runs in the browser. It is also reachable from inside the Statistico Excel add-in, where a design can be sent straight from an analysis into the calculator.",
            ),
        ],
        "related": [
            ("/Statistico-Website/calculators/precision-sample-size.html", "Precision-Based Sample Size", "Size a study by how narrow the confidence interval must be instead of by power."),
            ("/statistico-calculators/power-sample-size-calculator/index-formulas.html", "Formula reference", "The formulas behind each test, with the effect size guide."),
            ("/Statistico-Website/analytics/independent-means.html", "Independent Means", "Run the two-group comparison you just planned, inside Excel."),
            ("/Statistico-Website/analytics/anova.html", "ANOVA", "Multi-group comparisons with post-hoc tests and effect sizes."),
        ],
        "final_cta": "Size your next study",
    },
    {
        "file": "precision-sample-size.html",
        "title": "Precision-Based Sample Size Calculator",
        "plain_title": "Precision-Based Sample Size Calculator",
        "family": "Study Planning",
        "family_icon": "fa-crosshairs",
        "accent": "teal",
        "tool_url": "/statistico-calculators/Precision-Based%20-Sample/PrecisionSampleCalculator.html",
        "tool_label": "Open the calculator",
        "meta_desc": (
            "Free margin of error and sample size calculator for means and proportions, working in either "
            "direction at 90% to 99.9% confidence."
        ),
        "app_desc": (
            "Browser-based precision planning calculator: converts between margin of error and sample size "
            "for a population mean, a population proportion, a difference of means and a difference of "
            "proportions, at 90%, 95%, 99% and 99.9% confidence."
        ),
        "hero_subline": "Size a study by the precision you need, not by a hypothesis test.",
        "hero_lead": (
            "Not every study exists to reject a null hypothesis. When the goal is to report an estimate with a "
            "stated margin of error, precision is the thing to plan — and it runs in both directions, from "
            "target precision to sample size or from an existing sample to the precision it can support."
        ),
        "steps": [
            ("fa-arrow-right-arrow-left", "Choose a direction"),
            ("fa-list-check", "Pick what you are estimating"),
            ("fa-percent", "Set the confidence level"),
            ("fa-chart-line", "Read n, width and the curve"),
        ],
        "caps": [
            ("fa-arrow-right-arrow-left", "Solve for sample size or for margin of error"),
            ("fa-list-check", "Means, proportions and their differences"),
            ("fa-percent", "90%, 95%, 99% and 99.9% confidence"),
            ("fa-ruler-horizontal", "Confidence interval width alongside the estimate"),
            ("fa-superscript", "The critical value used, shown explicitly"),
            ("fa-chart-line", "Precision curve across the range"),
            ("fa-wand-magic-sparkles", "Quick presets for common precision targets"),
            ("fa-comment-dots", "Plain-language interpretation of the result"),
        ],
        "computes_title": "What you can estimate",
        "computes_lead": (
            "Choose the quantity you intend to report, and the inputs adjust to what that estimate needs."
        ),
        "computes": [
            (
                "Single-group estimates",
                [
                    ("Population Mean (\u03bc)", "Needs the margin of error you will accept and an estimate of the standard deviation."),
                    ("Population Proportion (p)", "Needs the margin of error and a planning value for the proportion."),
                ],
            ),
            (
                "Two-group comparisons",
                [
                    ("Difference of Means (\u03bc\u2081 - \u03bc\u2082)", "Plans the precision of a difference rather than of a single mean."),
                    ("Difference of Proportions (p\u2081 - p\u2082)", "Plans the precision of a risk or rate difference between two groups."),
                ],
            ),
            (
                "Both directions",
                [
                    ("Sample Size", "Give the margin of error you need and read the sample size that delivers it."),
                    ("Margin of Error", "Give the sample size you already have and read the precision it can support."),
                ],
            ),
        ],
        "method_title": "How the estimate is formed",
        "method_lead": "The assumptions are worth stating plainly.",
        "method_points": [
            "Intervals are built from normal critical values, so the result is a large-sample approximation; the critical value in use is displayed with every answer.",
            "When planning a difference of proportions, the second proportion is held at the conservative value of 0.5, which is the choice that maximises the required sample size rather than the one that flatters it.",
            "This is interval precision, not hypothesis-test power. A study sized for a narrow interval is not automatically powered to detect a particular effect, and the reverse is equally true.",
            "The precision curve shows the trade-off directly, which is the fastest way to see that halving a margin of error costs roughly four times the sample.",
        ],
        "faq": [
            (
                "How is this different from a power calculator?",
                "A power calculation asks how many observations you need to detect an effect of a given size. A precision calculation asks how many you need for a confidence interval of a given width. Studies that report an estimate rather than test a hypothesis are planned this way.",
            ),
            (
                "Can I work backwards from a sample I already collected?",
                "Yes. Switch the direction to margin of error, enter the sample size, and the calculator returns the precision that sample supports at your chosen confidence level.",
            ),
            (
                "Which confidence levels are available?",
                "90%, 95%, 99% and 99.9%, with 95% as the default.",
            ),
            (
                "What if I have no idea what the proportion will be?",
                "Use 0.5, which produces the largest sample size and therefore the safest plan. The calculator already applies that convention to the second group when you plan a difference of proportions.",
            ),
        ],
        "related": [
            ("/Statistico-Website/calculators/power-sample-size.html", "Power & Sample Size", "Plan by the effect you need to detect rather than by interval width."),
            ("/Statistico-Website/calculators/distributions.html", "Statistical Distributions", "Critical values and tail probabilities for thirteen distributions."),
            ("/Statistico-Website/analytics/univariate.html", "Univariate Analysis", "Confidence intervals and descriptives once the data arrives."),
            ("/Statistico-Website/analytics/contingency-tables.html", "Frequency & Contingency Tables", "Risk and odds measures for two-group proportions."),
        ],
        "final_cta": "Plan the precision you need",
    },
    {
        "file": "distributions.html",
        "title": "Statistical Distribution Calculators",
        "plain_title": "Statistical Distribution Calculators",
        "family": "Distributions",
        "family_icon": "fa-chart-area",
        "accent": "purple",
        "tool_url": "/statistico-calculators/0Distribution_Calculators/index-distribution.html",
        "tool_label": "Open the distribution suite",
        "meta_desc": (
            "Thirteen interactive distribution calculators: normal, t, chi-square, F, binomial, Poisson, "
            "Weibull and more, with PDF and CDF charts and critical values."
        ),
        "app_desc": (
            "Interactive distribution calculator suite covering normal, uniform, exponential, log-normal, "
            "Weibull, beta, binomial, Poisson, geometric, hypergeometric, chi-square, F and t distributions, "
            "with PDF, CDF and combined charts, quantiles and random sample generation."
        ),
        "hero_subline": "Thirteen distributions, one consistent workspace.",
        "hero_lead": (
            "Enter the parameters, choose whether you want a probability or the value behind a probability, and "
            "read the answer against a chart with the region shaded. Every distribution behaves the same way, "
            "so the second one you open needs no relearning."
        ),
        "steps": [
            ("fa-list", "Pick a distribution"),
            ("fa-sliders", "Set its parameters"),
            ("fa-question", "Choose what to find"),
            ("fa-chart-area", "Read it off the shaded chart"),
        ],
        "caps": [
            ("fa-chart-area", "PDF, CDF and combined chart views"),
            ("fa-fill-drip", "The probability region shaded on the curve"),
            ("fa-right-left", "Probabilities forwards, critical values backwards"),
            ("fa-list-ol", "Summary statistics for the parameters you entered"),
            ("fa-sliders", "Display precision from two to six decimals"),
            ("fa-dice", "Random samples with a table, histogram and statistics"),
            ("fa-copy", "Copy generated samples straight into Excel"),
            ("fa-wand-magic-sparkles", "AI explanation with Interpret, Teach and Apply views"),
        ],
        "computes_title": "The thirteen distributions",
        "computes_lead": (
            "Grouped the way the workspace groups them. Each one gives the density or mass function, the "
            "cumulative function, and the quantile behind a probability you specify."
        ),
        "computes": [
            (
                "Continuous distributions",
                [
                    ("Normal", "Mean and standard deviation, with the chart range set in multiples of sigma."),
                    ("Uniform", "A minimum and a maximum, with constant density between them."),
                    ("Exponential", "A single rate parameter, for waiting times between events."),
                    ("Log-Normal", "Location and scale on the log scale, for right-skewed quantities."),
                    ("Weibull", "Shape and scale, the usual choice for time-to-failure work."),
                    ("Beta", "Alpha and beta on the unit interval, for proportions and rates."),
                ],
            ),
            (
                "Discrete distributions",
                [
                    ("Binomial", "Trials and success probability, with exact, cumulative and interval queries."),
                    ("Poisson", "A rate parameter, for counts in a fixed window."),
                    ("Geometric", "A success probability, for the number of trials until the first success."),
                    ("Hypergeometric", "Population size, success states and sample size, for sampling without replacement."),
                ],
            ),
            (
                "Test distributions",
                [
                    ("Chi-Square", "Degrees of freedom, for goodness-of-fit and contingency tests."),
                    ("F", "Numerator and denominator degrees of freedom, for variance ratios and ANOVA."),
                    ("t", "Degrees of freedom, for means and regression coefficients from small samples."),
                ],
            ),
        ],
        "method_title": "How the questions are phrased",
        "method_lead": "The same three or four questions, on every distribution.",
        "method_points": [
            "Continuous distributions answer the probability below a value, the probability between two values, and the value that sits at a probability you specify.",
            "Discrete distributions add the probability of an exact count, and draw the mass function as spikes with a step cumulative function rather than smooth curves.",
            "Asking for the value behind a probability is what produces a critical value, which is why the chi-square, F and t calculators sit in their own group.",
            "Random samples are drawn from the distribution as parameterised, summarised with a histogram and statistics, and can be copied one value per row for pasting into a worksheet.",
        ],
        "faq": [
            (
                "Which distributions are included?",
                "Normal, uniform, exponential, log-normal, Weibull and beta among the continuous ones; binomial, Poisson, geometric and hypergeometric among the discrete ones; and chi-square, F and t for hypothesis testing.",
            ),
            (
                "Can I get a critical value rather than a probability?",
                "Yes. Choose the option to find the value for a given probability, and the calculator inverts the cumulative function for you. That is how you obtain a t, chi-square or F critical value at a chosen alpha.",
            ),
            (
                "Does it show the distribution, not just the number?",
                "Yes. Each calculator draws the density and cumulative functions, separately or combined, and shades the region the probability refers to.",
            ),
            (
                "Can I generate random data from a distribution?",
                "Yes. Any of the thirteen can generate a random sample, shown as a table with a histogram and summary statistics, and copied one value per row so it pastes into Excel as a column.",
            ),
        ],
        "related": [
            ("/Statistico-Website/calculators/power-sample-size.html", "Power & Sample Size", "Turn an expected effect into the sample size it needs."),
            ("/Statistico-Website/analytics/univariate.html", "Univariate Analysis", "Fit these distributions to real data inside Excel."),
            ("/Statistico-Website/analytics/contingency-tables.html", "Frequency & Contingency Tables", "Where chi-square tests are actually run."),
            ("/Statistico-Website/analytics/anova.html", "ANOVA", "Where the F distribution does its work."),
        ],
        "final_cta": "Open the distribution workspace",
    },
]


EXTRA_CSS = """
    /* Calculator-specific blocks layered on the shared module-page styling. */
    .calc-groups { display: grid; gap: 22px; margin-top: 22px; }
    .calc-group > h3 {
      font-size: .82rem; text-transform: uppercase; letter-spacing: .09em;
      color: var(--accent-1); margin: 0 0 12px;
    }
    .calc-items { display: grid; gap: 10px; }
    .calc-item {
      display: grid; grid-template-columns: minmax(9rem, 15rem) 1fr; gap: 4px 20px;
      padding: 13px 16px; border: 1px solid var(--border); border-radius: 12px;
      background: var(--surface-2);
    }
    .calc-item dt { font-weight: 650; color: var(--text); }
    .calc-item dd { margin: 0; color: var(--text-muted); font-size: .93rem; line-height: 1.55; }
    @media (max-width: 700px) { .calc-item { grid-template-columns: 1fr; } }
    .method-list { margin: 18px 0 0; padding: 0; list-style: none; display: grid; gap: 12px; }
    .method-list li {
      position: relative; padding-left: 30px; color: var(--text-muted);
      font-size: .95rem; line-height: 1.6;
    }
    .method-list li::before {
      content: ""; position: absolute; left: 8px; top: .62em;
      width: 7px; height: 7px; border-radius: 50%; background: var(--accent-1);
    }
    .faq-list { display: grid; gap: 12px; margin-top: 22px; }
    .faq-item {
      border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2);
      padding: 0 18px;
    }
    .faq-item summary {
      cursor: pointer; padding: 15px 0; font-weight: 650; color: var(--text);
      list-style: none; display: flex; justify-content: space-between; gap: 14px;
    }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item summary::after {
      content: "\\002B"; color: var(--accent-1); font-size: 1.15rem; line-height: 1;
    }
    .faq-item[open] summary::after { content: "\\2212"; }
    .faq-item p { margin: 0 0 16px; color: var(--text-muted); font-size: .95rem; line-height: 1.65; }
"""


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def json_str(text: str) -> str:
    """Plain text for JSON-LD: unescape HTML entities we author, escape quotes."""
    plain = text.replace("&amp;", "&").replace("&#8209;", "-")
    return plain.replace("\\", "\\\\").replace('"', '\\"')


def render_page(c: dict) -> str:
    a1, a2 = ACCENTS[c["accent"]]
    base = f"https://statistico.live/Statistico-Website/calculators/{c['file']}"
    page_title = f"{c['title']} | Statistico"
    plain_page_title = f"{c['plain_title']} | Statistico"

    steps_html = []
    for i, (icon, label) in enumerate(c["steps"]):
        steps_html.append(
            f'<div class="live-step" role="listitem"><div class="dot">'
            f'<i class="fa-solid {icon}" aria-hidden="true"></i></div><span>{label}</span></div>'
        )
        if i < len(c["steps"]) - 1:
            steps_html.append(
                '<div class="live-arrow" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></div>'
            )

    caps_html = "\n".join(
        f'          <div class="cap-item"><i class="fa-solid {icon}" aria-hidden="true"></i><span>{label}</span></div>'
        for icon, label in c["caps"]
    )

    groups_html = "\n".join(
        f"""          <div class="calc-group">
            <h3>{group}</h3>
            <dl class="calc-items">
{chr(10).join(f'              <div class="calc-item"><dt>{name}</dt><dd>{detail}</dd></div>' for name, detail in items)}
            </dl>
          </div>"""
        for group, items in c["computes"]
    )

    method_html = "\n".join(f"          <li>{point}</li>" for point in c["method_points"])

    faq_html = "\n".join(
        f"""          <details class="faq-item">
            <summary>{q}</summary>
            <p>{a}</p>
          </details>"""
        for q, a in c["faq"]
    )

    related_html = "\n".join(
        f"""          <a class="related-card" href="{href}">
            <h4>{esc(title)}</h4>
            <p>{desc}</p>
          </a>"""
        for href, title, desc in c["related"]
    )

    faq_ld = ",\n".join(
        f"""          {{
            "@type": "Question",
            "name": "{json_str(q)}",
            "acceptedAnswer": {{ "@type": "Answer", "text": "{json_str(a)}" }}
          }}"""
        for q, a in c["faq"]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{page_title}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon-max.svg?v=2026-05-07-red-contour" />
  <meta name="description" content="{c['meta_desc']}" />
  <link rel="canonical" href="{base}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Statistico\u2122" />
  <meta property="og:title" content="{page_title}" />
  <meta property="og:description" content="{c['meta_desc']}" />
  <meta property="og:url" content="{base}" />
  <meta property="og:image" content="https://statistico.live/Statistico-Website/assets/img/statistico-og-image.png?v=2" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{page_title}" />
  <meta name="twitter:description" content="{c['meta_desc']}" />
  <meta name="twitter:image" content="https://statistico.live/Statistico-Website/assets/img/statistico-og-image.png?v=2" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet"/>

  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "WebPage",
        "@id": "{base}",
        "url": "{base}",
        "name": "{json_str(plain_page_title)}",
        "description": "{json_str(c['meta_desc'])}",
        "isPartOf": {{
          "@type": "WebSite",
          "name": "Statistico",
          "url": "https://statistico.live/"
        }},
        "breadcrumb": {{ "@id": "{base}#breadcrumb" }}
      }},
      {{
        "@type": "BreadcrumbList",
        "@id": "{base}#breadcrumb",
        "itemListElement": [
          {{ "@type": "ListItem", "position": 1, "name": "Statistico", "item": "https://statistico.live/" }},
          {{ "@type": "ListItem", "position": 2, "name": "Calculators", "item": "https://statistico.live/Statistico-Website/index-Calculators.html" }},
          {{ "@type": "ListItem", "position": 3, "name": "{json_str(c['plain_title'])}", "item": "{base}" }}
        ]
      }},
      {{
        "@type": "WebApplication",
        "name": "Statistico {json_str(c['plain_title'])}",
        "applicationCategory": "UtilitiesApplication",
        "applicationSubCategory": "Statistical Calculator",
        "operatingSystem": "Any modern browser",
        "url": "{base}",
        "description": "{json_str(c['app_desc'])}",
        "offers": {{ "@type": "Offer", "price": "0", "priceCurrency": "USD" }},
        "publisher": {{ "@type": "Organization", "name": "Statistico" }}
      }},
      {{
        "@type": "FAQPage",
        "@id": "{base}#faq",
        "mainEntity": [
{faq_ld}
        ]
      }}
    ]
  }}
  </script>

  <style>
{css_block(a1, a2)}
{EXTRA_CSS}
  </style>
</head>
<body>

  <div id="nav-placeholder"></div>

  <nav class="lr-breadcrumb container" aria-label="Breadcrumb">
    <ol>
      <li><a href="/Statistico-Website/index-Calculators.html">Calculators</a></li>
      <li><a href="/Statistico-Website/index-Calculators.html">{c['family']}</a></li>
      <li aria-current="page">{c['title']}</li>
    </ol>
  </nav>

  <header class="hero grid">
    <div class="container">
      <div class="hero-kicker"><i class="fa-solid {c['family_icon']}" aria-hidden="true"></i> {c['family']}</div>
      <h1>{c['title']}</h1>
      <p class="hero-subline">{c['hero_subline']}</p>
      <p class="hero-lead">{c['hero_lead']}</p>
      <p class="hero-sub">Runs in the browser. Nothing to install, no sign-in.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="{c['tool_url']}" target="_blank" rel="noopener">{c['tool_label']} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
        <a class="btn btn-ghost" href="/Statistico-Website/index-Calculators.html">All calculators</a>
      </div>
    </div>
  </header>

  <main>
    <section class="why-section" aria-labelledby="how-heading">
      <div class="container">
        <div class="why-panel">
          <h2 id="how-heading">How it works</h2>
          <p class="why-position">Four steps, in the order the page asks for them.</p>
          <div class="live-strip" role="list" aria-label="Steps">
            {''.join(steps_html)}
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="cap-heading">
      <div class="container">
        <h2 id="cap-heading" class="section-title" style="font-size:1.1rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted);">What the calculator provides</h2>
        <div class="cap-grid">
{caps_html}
        </div>
      </div>
    </section>

    <section id="computes" aria-labelledby="computes-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">Coverage</span>
        <h2 id="computes-heading" class="section-title">{c['computes_title']}</h2>
        <p class="section-lead">{c['computes_lead']}</p>
        <div class="calc-groups">
{groups_html}
        </div>
      </div>
    </section>

    <section aria-labelledby="method-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">Method</span>
        <h2 id="method-heading" class="section-title">{c['method_title']}</h2>
        <p class="section-lead">{c['method_lead']}</p>
        <ul class="method-list">
{method_html}
        </ul>
      </div>
    </section>

    <section aria-labelledby="faq-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">Questions</span>
        <h2 id="faq-heading" class="section-title">Common questions</h2>
        <div class="faq-list">
{faq_html}
        </div>
      </div>
    </section>

    <section aria-labelledby="related-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">Related</span>
        <h2 id="related-heading" class="section-title">Where to go next</h2>
        <div class="related-grid">
{related_html}
        </div>
      </div>
    </section>

    <section aria-labelledby="final-cta-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <div class="final-cta">
          <h2 id="final-cta-heading">{c['final_cta']}</h2>
          <div class="hero-cta">
            <a class="btn btn-primary" href="{c['tool_url']}" target="_blank" rel="noopener">{c['tool_label']}</a>
            <a class="btn btn-ghost" href="/Statistico-Website/index-Calculators.html">Return to Calculators</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div id="footer-placeholder"></div>

  <script src="/Statistico-Website/assets/js/nav-template.js?v=20260820calc"></script>
</body>
</html>
"""


def main() -> None:
    for c in CALCULATORS:
        path = OUT_DIR / c["file"]
        path.write_text(render_page(c), encoding="utf-8")
        print(f"wrote {path.name}")


if __name__ == "__main__":
    main()
