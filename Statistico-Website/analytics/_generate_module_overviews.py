#!/usr/bin/env python3
"""Generate Statistico Analytics module overview pages from a shared template."""

from __future__ import annotations

from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent

# accent RGB tuples used for CSS theming
ACCENTS = {
    "orange": ((255, 165, 120), (120, 200, 255)),
    "cyan": ((6, 182, 212), (120, 200, 255)),
    "green": ((52, 211, 153), (120, 200, 255)),
    "blue": ((56, 189, 248), (120, 200, 255)),
    "purple": ((196, 165, 255), (120, 200, 255)),
    "indigo": ((165, 180, 252), (120, 200, 255)),
    "teal": ((45, 212, 191), (120, 200, 255)),
}

MODULES = [
    {
        "slug": "univariate",
        "file": "univariate.html",
        "key": "univariate",
        "title": "Univariate Analysis",
        "short": "Univariate",
        "family": "Explore Data",
        "family_icon": "fa-chart-pie",
        "accent": "orange",
        "meta_desc": "Explore Univariate Analysis in Statistico with interactive histograms, box plots, QQ plots, normality checks, outliers, percentiles, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive univariate analysis module inside Excel: histogram, box plot, QQ, kernel density, normality index, outliers, percentiles, confidence intervals, and hypothesis testing.",
        "hero_subline": "Experience a completed Univariate Analysis exactly as it appears inside Statistico.",
        "hero_lead": "Understand one variable in depth — reshape bins, overlays, and tests live across histogram, box plot, QQ, density, normality, and outlier views.",
        "why_chain": ["Inspect distribution", "Check normality", "Flag outliers", "Estimate intervals", "Run tests", "Interpret results"],
        "why_brand": "From raw values to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-chart-column", "Binning"),
            ("fa-sliders", "Overlays"),
            ("fa-chart-line", "QQ updates"),
            ("fa-flask", "Tests respond"),
        ],
        "caps": [
            ("fa-chart-column", "Interactive histogram with auto-binning"),
            ("fa-box", "Box plot with outlier flagging"),
            ("fa-chart-line", "QQ and PP normality plots"),
            ("fa-wave-square", "Kernel density estimation"),
            ("fa-list-check", "Descriptives and percentiles"),
            ("fa-stethoscope", "Six-test normality index"),
            ("fa-bullseye", "Confidence intervals and hypothesis tests"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One variable. Connected views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same selected variable, so there's no re-running the analysis to move between them.",
        "views": [
            ("histogram", "fa-chart-column", "Histogram", "Reshape bins and overlays live. The histogram remains the primary surface for shape, gaps, and density."),
            ("boxplot", "fa-box", "Box Plot", "Quartiles, whiskers, and outlier flags compress the distribution into a fast diagnostic read."),
            ("qq", "fa-chart-line", "QQ Plot", "Compare sample quantiles with a normal reference before trusting normal-based procedures."),
            ("density", "fa-wave-square", "Kernel Density", "Smooth the distribution without forcing fixed histogram bins."),
            ("normality", "fa-stethoscope", "Normality", "Six normality tests summarized as one strength index, with supporting detail available."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of shape, outliers, and next checks — see the caution below."),
        ],
        "feature_kicker": "Distribution",
        "feature_title": "Distribution exploration is part of the workflow",
        "feature_lead": "Histogram, density, and box-plot views stay linked to the same variable, so shape, spread, and unusual observations can be reviewed together rather than in separate tools.",
        "feature_chips": ["Auto-binning", "Overlays", "Kernel density", "Box plot", "Outlier flags", "Percentiles"],
        "feature_shot": "histogram",
        "assess_kicker": "Assessment",
        "assess_title": "Assess normality, outliers, and inferential readiness",
        "assess_lead": "Normality, intervals, and hypothesis tests sit alongside the visual views, so readiness checks are not a separate export step.",
        "assess_chips": ["QQ / PP plots", "Normality index", "Outlier review", "Confidence intervals", "Hypothesis testing", "Bootstrap support", "Descriptives"],
        "extra_kicker": "Inference",
        "extra_title": "Move from description to inference without leaving the module",
        "extra_lead": "Confidence intervals and hypothesis tests use the same selected variable and options already in the workspace, so exploration and inference stay connected.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes distribution shape, outliers, and normality evidence, and suggests next steps drawn from the same output already in the workspace.",
        "related_title": "Other Explore Data and related modules",
        "related": [
            ("correlation.html", "Correlation", "Pairwise relationships and significance."),
            ("independent-means.html", "Independent Means", "Compare groups on a numeric outcome."),
            ("linear-regression.html", "Linear Regression", "Continuous outcomes and diagnostics."),
            ("anova.html", "ANOVA", "Multi-group comparisons and post-hoc."),
        ],
        "final_cta": "Explore Univariate Analysis as an interactive module",
    },
    {
        "slug": "correlation",
        "file": "correlation.html",
        "key": "correlations",
        "title": "Correlation Analysis",
        "short": "Correlation",
        "family": "Explore Data",
        "family_icon": "fa-chart-pie",
        "accent": "orange",
        "meta_desc": "Explore Correlation Analysis in Statistico with Pearson, Spearman, and Kendall matrices, heatmaps, network graphs, partial correlations, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive correlation module inside Excel: matrix and heatmap views, click-through scatter analysis, network graph, Taylor diagram, partial correlations, and reliability coefficients.",
        "hero_subline": "Experience a completed Correlation Analysis exactly as it appears inside Statistico.",
        "hero_lead": "Scan pairwise associations in one interactive workspace — switch coefficient types, open any cell into a full scatter analysis, and explore network structure live.",
        "why_chain": ["Build matrix", "Switch coefficient", "Open scatter", "Inspect network", "Check partials", "Interpret results"],
        "why_brand": "From coefficient table to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-table-cells", "Matrix"),
            ("fa-sliders", "Coefficient type"),
            ("fa-chart-scatter", "Scatter opens"),
            ("fa-diagram-project", "Network updates"),
        ],
        "caps": [
            ("fa-table-cells", "Pearson, Spearman & Kendall matrices"),
            ("fa-border-all", "Table and heatmap display modes"),
            ("fa-chart-scatter", "Click-through scatter analysis"),
            ("fa-diagram-project", "Correlation network graph"),
            ("fa-bullseye", "Taylor diagram view"),
            ("fa-link", "Partial correlations"),
            ("fa-shield-halved", "Reliability coefficients"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One matrix. Connected relationship views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same correlation workspace, so there's no re-running the analysis to move between them.",
        "views": [
            ("matrix", "fa-table-cells", "Correlation Matrix", "Scan coefficients in table or heatmap mode, switch correlation type, show p-values, and click any cell for a full scatter view."),
            ("network", "fa-diagram-project", "Network", "Turn the matrix into a relationship graph and adjust the edge threshold to reveal the strongest structure."),
            ("taylor", "fa-bullseye", "Taylor Diagram", "Compare variables against a reference using correlation angle and standard deviation in one compact diagnostic view."),
            ("descriptives", "fa-list-check", "Descriptives", "Review variable-level descriptive statistics before interpreting pairwise relationships."),
            ("partial", "fa-link", "Partial Correlations", "Estimate unique relationships after controlling for other variables."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of strong links, redundancy, and next checks — see the caution below."),
        ],
        "feature_kicker": "Exploration",
        "feature_title": "Click-through scatter analysis is part of the workflow",
        "feature_lead": "Any coefficient cell opens a full scatter analysis with fit, p-value, and R² — so the shape behind each association is never hidden by a single number.",
        "feature_chips": ["Pearson", "Spearman", "Kendall", "Heatmap", "P-values", "Threshold highlighting", "Scatter modal"],
        "feature_shot": "matrix",
        "assess_kicker": "Structure",
        "assess_title": "Assess redundancy, unique links, and network structure",
        "assess_lead": "Network, Taylor, partial, and reliability views sit alongside the matrix so structure decisions are not a separate export step.",
        "assess_chips": ["Network edges", "Taylor diagram", "Partial correlations", "Reliability coefficients", "Descriptives", "Significance filters"],
        "extra_kicker": "Significance",
        "extra_title": "Separate reliable associations from noise",
        "extra_lead": "P-value display and coefficient thresholds help focus on associations worth following into regression, factor analysis, or reporting.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes strong associations, possible redundancy, and next steps drawn from the same matrix already in the workspace.",
        "related_title": "Other Explore Data and related modules",
        "related": [
            ("univariate.html", "Univariate", "Distribution shape, outliers, and normality."),
            ("reliability.html", "Scale Reliability", "Alpha, omega, and item diagnostics."),
            ("factor-analysis.html", "Factor Analysis", "Latent structure and rotation."),
            ("pca.html", "PCA", "Component retention and biplots."),
        ],
        "final_cta": "Explore Correlation Analysis as an interactive module",
    },
    {
        "slug": "independent-means",
        "file": "independent-means.html",
        "key": "independent",
        "title": "Independent Means",
        "short": "Independent Means",
        "family": "Compare Means",
        "family_icon": "fa-arrows-left-right",
        "accent": "cyan",
        "meta_desc": "Explore Independent Means comparisons in Statistico with group exploration, assumptions, effect sizes, power analysis, APA reporting, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive independent-means module inside Excel: explore group distributions, assumptions, primary results, robustness checks, effect sizes, power, and APA-ready reporting.",
        "hero_subline": "Experience a completed Independent Means analysis exactly as it appears inside Statistico.",
        "hero_lead": "Move from exploring group distributions to test results, effect sizes, and power in one continuous workflow — without leaving Excel.",
        "why_chain": ["Explore groups", "Check assumptions", "Run test", "Review effects", "Estimate power", "Export report"],
        "why_brand": "From group comparison to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-chart-column", "Group visuals"),
            ("fa-stethoscope", "Assumptions"),
            ("fa-flask", "Results"),
            ("fa-bolt", "Power"),
        ],
        "caps": [
            ("fa-chart-column", "Interactive group descriptives and visuals"),
            ("fa-stethoscope", "Assumption and diagnostics checks"),
            ("fa-flask", "Primary results plus robustness checks"),
            ("fa-table", "Post-hoc pairwise comparisons when relevant"),
            ("fa-ruler-horizontal", "Effect sizes with confidence intervals"),
            ("fa-bolt", "Power and sample-size workflow"),
            ("fa-file-lines", "APA-ready report output"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One comparison. Connected inferential views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same comparison, so there's no re-running the analysis to move between them.",
        "views": [
            ("explore", "fa-chart-column", "Explore", "Review descriptive tables and distribution visuals before relying on a group comparison."),
            ("assumptions", "fa-stethoscope", "Assumptions", "Check normality, spread, and diagnostics so the selected comparison method is defensible."),
            ("results", "fa-flask", "Results", "Separate the main statistical result from supporting details and robustness checks."),
            ("effects", "fa-ruler-horizontal", "Effect Sizes", "Translate statistical significance into practical magnitude and uncertainty."),
            ("power", "fa-bolt", "Power Analysis", "Estimate achieved power or required sample size from the same workflow."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of the comparison and next checks — see the caution below."),
        ],
        "feature_kicker": "Exploration",
        "feature_title": "Explore groups before committing to a test",
        "feature_lead": "Descriptives and comparison-of-means visuals stay linked to the same grouping, so distribution shape informs the inferential choice rather than appearing after the fact.",
        "feature_chips": ["Group tables", "Histograms", "Comparison charts", "Sortable descriptives", "Outlier cues"],
        "feature_shot": "explore",
        "assess_kicker": "Inference",
        "assess_title": "Assess results, robustness, and practical magnitude",
        "assess_lead": "Primary results, robustness checks, effect sizes, and power sit together so significance is never the only decision surface.",
        "assess_chips": ["Primary test", "Robustness checks", "Post-hoc pairs", "Effect sizes", "Confidence intervals", "Power / N", "APA report"],
        "extra_kicker": "Reporting",
        "extra_title": "Move from results to an APA-ready report",
        "extra_lead": "The report draws on the same assumptions, effects, and power checks already in the workspace, so publishing does not restart the analysis.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes the comparison, effect size, and assumption flags, and suggests next steps from the same output already in the workspace.",
        "related_title": "Other Compare Means and related modules",
        "related": [
            ("paired-repeated.html", "Paired / Repeated", "Within-subject change over time."),
            ("anova.html", "ANOVA", "Multi-group comparisons and post-hoc."),
            ("univariate.html", "Univariate", "Distribution shape and normality."),
            ("mixed-models.html", "Mixed Models", "Clustered and repeated designs."),
        ],
        "final_cta": "Explore Independent Means as an interactive module",
    },
    {
        "slug": "paired-repeated",
        "file": "paired-repeated.html",
        "key": "dependent",
        "title": "Paired / Repeated Means",
        "short": "Paired / Repeated",
        "family": "Compare Means",
        "family_icon": "fa-arrows-left-right",
        "accent": "cyan",
        "meta_desc": "Explore Paired and Repeated Measures analysis in Statistico with trajectories, assumptions, effect sizes, power analysis, APA reporting, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive paired and repeated-measures module inside Excel: explore change, assumptions, results, trajectories, effect sizes, power, and APA-ready reporting.",
        "hero_subline": "Experience a completed Paired / Repeated Means analysis exactly as it appears inside Statistico.",
        "hero_lead": "Follow within-subject change live — from trajectories and assumptions to effects, power, and reporting in one continuous workflow.",
        "why_chain": ["Align pairs", "Explore change", "Check assumptions", "Estimate effects", "Review power", "Export report"],
        "why_brand": "From paired observations to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-chart-line", "Trajectories"),
            ("fa-stethoscope", "Assumptions"),
            ("fa-flask", "Results"),
            ("fa-bolt", "Power"),
        ],
        "caps": [
            ("fa-link", "Paired and repeated-measures setup"),
            ("fa-chart-line", "Trajectories for within-subject change"),
            ("fa-stethoscope", "Assumption and diagnostics checks"),
            ("fa-flask", "Within-subject results and post-hoc detail"),
            ("fa-ruler-horizontal", "Effect size reporting"),
            ("fa-bolt", "Power analysis for repeated designs"),
            ("fa-file-lines", "APA-ready report output"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One design. Connected within-subject views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same paired or repeated design, so there's no re-running the analysis to move between them.",
        "views": [
            ("explore", "fa-chart-column", "Explore", "Keep paired observations together while reviewing descriptives and distribution cues."),
            ("assumptions", "fa-stethoscope", "Assumptions", "Check diagnostics so the selected within-subject method is defensible."),
            ("results", "fa-flask", "Results", "Review the primary within-subject result alongside supporting detail."),
            ("trajectories", "fa-chart-line", "Trajectories", "Visualize change across occasions for repeated-measures variants."),
            ("effects", "fa-ruler-horizontal", "Effect Sizes", "Report practical magnitude for paired or repeated designs."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of change and next checks — see the caution below."),
        ],
        "feature_kicker": "Change",
        "feature_title": "Trajectories are part of the inferential workflow",
        "feature_lead": "Trajectory views stay linked to the same paired cases, so pattern of change informs the result rather than living in a separate charting tool.",
        "feature_chips": ["Paired setup", "Repeated measures", "Trajectories", "Post-hoc detail", "Descriptives"],
        "feature_shot": "trajectories",
        "assess_kicker": "Inference",
        "assess_title": "Assess change, magnitude, and power together",
        "assess_lead": "Results, effect sizes, and power sit alongside assumptions so within-subject inference is never reduced to a single p-value.",
        "assess_chips": ["Assumptions", "Primary result", "Effect sizes", "Power / N", "APA report", "Post-hoc detail"],
        "extra_kicker": "Reporting",
        "extra_title": "Move from within-subject results to a complete report",
        "extra_lead": "The APA-ready report draws on the same assumptions, effects, and power checks already in the workspace.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes within-subject change, effect size, and assumption flags from the same output already in the workspace.",
        "related_title": "Other Compare Means and related modules",
        "related": [
            ("independent-means.html", "Independent Means", "Between-group comparisons."),
            ("mixed-models.html", "Mixed Models", "Clustered and hierarchical designs."),
            ("anova.html", "ANOVA", "Multi-group comparisons and post-hoc."),
            ("univariate.html", "Univariate", "Distribution shape and normality."),
        ],
        "final_cta": "Explore Paired / Repeated Means as an interactive module",
    },
    {
        "slug": "anova",
        "file": "anova.html",
        "key": "anova",
        "title": "ANOVA",
        "short": "ANOVA",
        "family": "Advanced Comparisons",
        "family_icon": "fa-scale-balanced",
        "accent": "green",
        "meta_desc": "Explore ANOVA in Statistico with interactive multi-group comparisons, post-hoc matrices, diagnostics, visuals, power tools, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive ANOVA module inside Excel: ANOVA table, inference, post-hoc comparisons, diagnostics, visuals with effect-size badges, power tools, and reporting.",
        "hero_subline": "Experience a completed ANOVA analysis exactly as it appears inside Statistico.",
        "hero_lead": "Compare groups interactively — refine the model and watch the ANOVA table, post-hoc matrices, diagnostics, and power tools update together.",
        "why_chain": ["Specify design", "Inspect ANOVA", "Run post-hoc", "Check diagnostics", "Estimate power", "Interpret results"],
        "why_brand": "From multi-group design to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-table", "ANOVA table"),
            ("fa-table-cells", "Post-hoc"),
            ("fa-stethoscope", "Diagnostics"),
            ("fa-bolt", "Power"),
        ],
        "caps": [
            ("fa-table", "ANOVA table with optional technical rows"),
            ("fa-flask", "Inference and comparison tabs"),
            ("fa-table-cells", "Post-hoc matrices with adjusted p-values"),
            ("fa-stethoscope", "Diagnostics and assumption checks"),
            ("fa-chart-column", "Visuals with effect-size badges"),
            ("fa-bolt", "Power tools for compute power or N"),
            ("fa-file-lines", "Report view"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One design. Connected multi-group views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same fitted ANOVA, so there's no re-running the analysis to move between them.",
        "views": [
            ("summary", "fa-list-check", "Summary", "Start with the module-level verdict, data checks, and the most important statistics."),
            ("inference", "fa-flask", "Inference", "Inspect the formal ANOVA table and decide which inferential result should lead."),
            ("comparisons", "fa-table-cells", "Comparisons", "Drill into pairwise or post-hoc differences after the omnibus result."),
            ("diagnostics", "fa-stethoscope", "Diagnostics", "Check residuals, assumptions, and observations that may affect the comparison."),
            ("visuals", "fa-chart-column", "Visuals", "Use charts and effect-size badges to turn the comparison into a faster diagnostic read."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of the omnibus result and next checks — see the caution below."),
        ],
        "feature_kicker": "Post-hoc",
        "feature_title": "Post-hoc comparisons are part of the model workflow",
        "feature_lead": "Post-hoc matrices with mean differences, SE, and adjusted p-values sit next to the omnibus result, so follow-up comparisons are not a separate re-analysis.",
        "feature_chips": ["Mean differences", "SE", "Adjusted p-values", "Comparison charts", "Effect-size badges"],
        "feature_shot": "comparisons",
        "assess_kicker": "Model assessment",
        "assess_title": "Assess omnibus evidence, diagnostics, and power",
        "assess_lead": "Technical ANOVA rows can be shown or hidden by audience, while diagnostics and power stay available in the same surface.",
        "assess_chips": ["ANOVA table", "Post-hoc matrix", "Diagnostics", "Visuals", "Power / N", "Report", "View data"],
        "extra_kicker": "Power",
        "extra_title": "Compute power or required N inside the results surface",
        "extra_lead": "Power tools use the same design already fitted, so sample-size planning stays connected to the comparison you just ran.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes the omnibus result, post-hoc pattern, and diagnostic flags from the same output already in the workspace.",
        "related_title": "Other comparison and design-based modules",
        "related": [
            ("independent-means.html", "Independent Means", "Two-group and k-group comparisons."),
            ("mixed-models.html", "Mixed Models", "Fixed and random effects."),
            ("paired-repeated.html", "Paired / Repeated", "Within-subject change."),
            ("linear-regression.html", "Linear Regression", "Continuous outcomes and covariates."),
        ],
        "final_cta": "Explore ANOVA as an interactive module",
    },
    {
        "slug": "mixed-models",
        "file": "mixed-models.html",
        "key": "mixed",
        "title": "Mixed Models",
        "short": "Mixed Models",
        "family": "Advanced Comparisons",
        "family_icon": "fa-scale-balanced",
        "accent": "green",
        "meta_desc": "Explore Mixed Models in Statistico with fixed and random effects, ICC, BLUPs, marginal means, diagnostics, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive mixed-models module inside Excel: ICC narrative, fixed effects, random effects, BLUPs, marginal means, likelihood-ratio tests, and fit statistics.",
        "hero_subline": "Experience a completed Mixed Models analysis exactly as it appears inside Statistico.",
        "hero_lead": "Explore fixed and random effects together and watch the model story update as you adjust structure — ideal for clustered, repeated, and hierarchical data.",
        "why_chain": ["Set structure", "Review ICC", "Inspect fixed effects", "Inspect random effects", "Compare means", "Interpret fit"],
        "why_brand": "From multilevel structure to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-sitemap", "Structure"),
            ("fa-chart-line", "Fixed effects"),
            ("fa-layer-group", "Random effects"),
            ("fa-table", "Marginal means"),
        ],
        "caps": [
            ("fa-circle-nodes", "Convergence and ICC narrative"),
            ("fa-chart-line", "Fixed effects with Satterthwaite DF notes"),
            ("fa-layer-group", "Random effects, variance components, BLUPs"),
            ("fa-table", "Estimated marginal means and pairwise contrasts"),
            ("fa-scale-balanced", "Likelihood-ratio and information criteria"),
            ("fa-percent", "Marginal and conditional R²"),
            ("fa-stethoscope", "Diagnostics panel"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One multilevel model. Connected views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same fitted mixed model, so there's no re-running the analysis to move between them.",
        "views": [
            ("overview", "fa-list-check", "Overview", "Explain ICC magnitude and convergence directly in the opening narrative."),
            ("effects", "fa-chart-line", "Model Effects", "Separate fixed effects, random effects, variance components, and BLUPs."),
            ("means", "fa-table", "Marginal Means", "Compare estimated marginal means and pairwise contrasts after model adjustment."),
            ("diagnostics", "fa-stethoscope", "Diagnostics", "Review residual and model-quality diagnostics for the multilevel fit."),
            ("advanced", "fa-sliders", "Advanced", "Inspect likelihood-ratio tests, AIC/BIC, and marginal versus conditional fit."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of structure, ICC, and next checks — see the caution below."),
        ],
        "feature_kicker": "Structure",
        "feature_title": "Fixed and random effects stay in one model story",
        "feature_lead": "Adjusting structure updates fixed effects, random effects, and fit statistics together, so multilevel decisions remain visible rather than buried in separate printouts.",
        "feature_chips": ["ICC", "Fixed effects", "Random effects", "BLUPs", "Variance components", "EMMs"],
        "feature_shot": "effects",
        "assess_kicker": "Model assessment",
        "assess_title": "Assess clustering, fit, and model comparison",
        "assess_lead": "ICC narrative, likelihood-ratio tests, and information criteria sit alongside effect tables so model choice is inspectable.",
        "assess_chips": ["ICC", "LRT", "AIC / BIC", "Marginal R²", "Conditional R²", "Diagnostics", "Model structure"],
        "extra_kicker": "Comparisons",
        "extra_title": "Move from multilevel fit to marginal means",
        "extra_lead": "Estimated marginal means and pairwise contrasts stay tied to the same fitted structure, so adjusted comparisons do not restart the workflow.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes clustering, fixed effects, and fit statistics from the same multilevel output already in the workspace.",
        "related_title": "Other comparison and design-based modules",
        "related": [
            ("anova.html", "ANOVA", "Multi-group comparisons and post-hoc."),
            ("paired-repeated.html", "Paired / Repeated", "Within-subject change."),
            ("linear-regression.html", "Linear Regression", "Single-level continuous outcomes."),
            ("independent-means.html", "Independent Means", "Between-group comparisons."),
        ],
        "final_cta": "Explore Mixed Models as an interactive module",
    },
    {
        "slug": "linear-regression",
        "file": "linear-regression.html",
        "key": "regression",
        "title": "Linear Regression",
        "short": "Linear Regression",
        "family": "Model Relationships",
        "family_icon": "fa-chart-line",
        "accent": "blue",
        "meta_desc": "Explore Linear Regression in Statistico with coefficients, partial plots, residual diagnostics, influential cases, predictions, interactions, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive linear regression module inside Excel: coefficients, partial regression plots, residual diagnostics, influential cases, predictions, interactions, and AI insights.",
        "hero_subline": "Experience a completed Linear Regression analysis exactly as it appears inside Statistico.",
        "hero_lead": "Explore the model live — coefficients, assumptions, diagnostics, partial plots, and predictions evolve together as you refine the specification.",
        "why_chain": ["Specify model", "Inspect coefficients", "Check residuals", "Review influence", "Predict scenarios", "Interpret results"],
        "why_brand": "From fitted equation to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-sliders", "Predictors"),
            ("fa-chart-line", "Coefficients"),
            ("fa-stethoscope", "Residuals"),
            ("fa-flask", "Predictions"),
        ],
        "caps": [
            ("fa-hand-pointer", "Drag-and-drop Y / X / categorical setup"),
            ("fa-table", "Detailed coefficients with p-value styling"),
            ("fa-chart-scatter", "Partial regression plots"),
            ("fa-stethoscope", "Residual diagnostics and influence"),
            ("fa-diagram-project", "Interactions and ANCOVA branches"),
            ("fa-flask", "Prediction scenarios"),
            ("fa-chart-area", "Model visualization"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One model. Connected regression views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same fitted model, so there's no re-running the analysis to move between them.",
        "views": [
            ("overview", "fa-list-check", "Overview", "Start with model fit, key coefficients, and the analytical verdict."),
            ("results", "fa-table", "Detailed Results", "Read coefficient-level results with significance styling and model context."),
            ("partial", "fa-chart-scatter", "Partial Plots", "Show each predictor contribution after accounting for the rest of the model."),
            ("residuals", "fa-stethoscope", "Residual Diagnostics", "Check residual patterns, diagnostic plots, and assumption-related warnings."),
            ("influence", "fa-magnifying-glass", "Influential Cases", "Find observations that may be pulling the fitted regression model."),
            ("ai", "fa-wand-magic-sparkles", "AI Insights", "Plain-language summary of fit, coefficients, and next checks — see the caution below."),
        ],
        "feature_kicker": "Diagnostics",
        "feature_title": "Residuals and influence are part of the model workflow",
        "feature_lead": "Residual overview, diagnostic plots, and influential observations sit next to coefficients, so model quality is inspected rather than assumed.",
        "feature_chips": ["Residuals", "QQ / scale-location", "Cook's distance", "Leverage", "Influence flags", "Partial plots"],
        "feature_shot": "residuals",
        "assess_kicker": "Model assessment",
        "assess_title": "Assess fit, contribution, and stability",
        "assess_lead": "Coefficients, partial plots, and influence diagnostics provide complementary evidence before predictions are trusted.",
        "assess_chips": ["R² / adj. R²", "Coefficients", "Partial plots", "Residuals", "Influential cases", "Interactions", "ANCOVA"],
        "extra_kicker": "Predictions",
        "extra_title": "Move from fitted model to prediction scenarios",
        "extra_lead": "Prediction controls use the same coefficients already fitted, so scenarios can be compared without leaving the workflow.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes coefficients, diagnostics, and next steps from the same regression output already in the workspace.",
        "related_title": "Other Model Relationships and related modules",
        "related": [
            ("logistic-regression.html", "Logistic Regression", "Binary outcomes, ROC/AUC, and thresholds."),
            ("correlation.html", "Correlation", "Pairwise relationships before modeling."),
            ("anova.html", "ANOVA", "Multi-group comparisons."),
            ("mixed-models.html", "Mixed Models", "Clustered and hierarchical data."),
        ],
        "final_cta": "Explore Linear Regression as an interactive module",
    },
    {
        "slug": "pca",
        "file": "pca.html",
        "key": "pca",
        "title": "Principal Component Analysis",
        "short": "PCA",
        "family": "Reduce Dimensions",
        "family_icon": "fa-layer-group",
        "accent": "purple",
        "meta_desc": "Explore PCA in Statistico with eigenvalues, scree guidance, loadings, rotation, biplots, score plots, contribution plots, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive PCA module inside Excel: adequacy checks, eigenvalue retention, loadings, rotation, biplot, score plot, contribution plot, and outlier map.",
        "hero_subline": "Experience a completed Principal Component Analysis exactly as it appears inside Statistico.",
        "hero_lead": "Adjust retention and rotation interactively; eigenvalues, scree evidence, loadings, biplots, and score plots respond together.",
        "why_chain": ["Check adequacy", "Retain components", "Inspect loadings", "Rotate solution", "Map scores", "Interpret structure"],
        "why_brand": "From correlation structure to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-chart-simple", "Scree"),
            ("fa-sliders", "Retention"),
            ("fa-table-cells", "Loadings"),
            ("fa-chart-scatter", "Biplot"),
        ],
        "caps": [
            ("fa-magnifying-glass", "Adequacy and retention guidance"),
            ("fa-chart-simple", "Eigenvalue table with scree evidence"),
            ("fa-table-cells", "Component and rotated loading matrices"),
            ("fa-diagram-project", "Component correlation (Phi) matrix"),
            ("fa-chart-scatter", "Biplot and score plot"),
            ("fa-bullseye", "Contribution plot and outlier map"),
            ("fa-border-all", "Correlation-matrix heatmap"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One reduction. Connected component views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same PCA solution, so there's no re-running the analysis to move between them.",
        "views": [
            ("summary", "fa-list-check", "Summary", "Connect adequacy, retention guidance, and correlation structure before extraction decisions harden."),
            ("components", "fa-chart-simple", "Components", "Use eigenvalues and variance evidence to decide retained components."),
            ("loadings", "fa-table-cells", "Loadings", "Read loading matrices to understand which variables define each component."),
            ("biplot", "fa-chart-scatter", "Biplot", "Place observations and variable loadings in one map to explain dimensional structure."),
            ("scores", "fa-bullseye", "Score Plot", "Map cases in component-score space to reveal structure or outliers."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of retention and structure — see the caution below."),
        ],
        "feature_kicker": "Retention",
        "feature_title": "Retention guidance is part of the PCA workflow",
        "feature_lead": "Kaiser and scree-elbow guidance sit next to the eigenvalue table, and hovering a scree point can highlight the matching row so retention is a visible decision.",
        "feature_chips": ["Kaiser criterion", "Scree elbow", "Variance explained", "Hover sync", "Correlation heatmap"],
        "feature_shot": "components",
        "assess_kicker": "Structure",
        "assess_title": "Assess loadings, rotation, and case-level maps",
        "assess_lead": "Loadings, biplot, contribution, and outlier views keep variable structure and case behavior connected.",
        "assess_chips": ["Loadings", "Rotation", "Phi matrix", "Biplot", "Contribution plot", "Outlier map", "Scores"],
        "extra_kicker": "Visualization",
        "extra_title": "Move from components to biplots and score maps",
        "extra_lead": "Biplot and score views use the same retained solution, so visualization does not restart the reduction.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes retention, loadings, and structure cues from the same PCA output already in the workspace.",
        "related_title": "Other Reduce Dimensions and related modules",
        "related": [
            ("factor-analysis.html", "Factor Analysis", "Latent factors and rotation."),
            ("reliability.html", "Scale Reliability", "Alpha, omega, and item diagnostics."),
            ("correlation.html", "Correlation", "Pairwise relationships and redundancy."),
            ("k-means.html", "K-Means", "Partition cases into segments."),
        ],
        "final_cta": "Explore PCA as an interactive module",
    },
    {
        "slug": "reliability",
        "file": "reliability.html",
        "key": "reliability",
        "title": "Scale Reliability",
        "short": "Scale Reliability",
        "family": "Reduce Dimensions",
        "family_icon": "fa-layer-group",
        "accent": "purple",
        "meta_desc": "Explore Scale Reliability in Statistico: Cronbach’s alpha, McDonald’s omega, item diagnostics, reverse coding, and bootstrap intervals inside Excel.",
        "app_desc": "Interactive scale reliability module inside Excel: Cronbach’s alpha, standardized alpha, McDonald’s omega total from a one-factor model, item diagnostics, inter-item matrix, dimensionality scree, scale-score descriptives, and optional by-group reliability.",
        "hero_subline": "Experience a completed Scale Reliability analysis exactly as it appears inside Statistico.",
        "hero_lead": "Assess whether selected items behave as one consistent scale — coefficients, weak items, reverse-coding cues, and a dimensionality diagnostic stay in the same workspace.",
        "why_chain": ["Select items", "Reverse-code if needed", "Read alpha and omega", "Inspect weak items", "Check structure", "Compare groups"],
        "why_brand": "From item set to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-clipboard-check", "Overview"),
            ("fa-list-check", "Item diagnostics"),
            ("fa-table-cells", "Inter-item matrix"),
            ("fa-chart-line", "Scale structure"),
        ],
        "caps": [
            ("fa-check-double", "Cronbach’s alpha with bootstrap confidence interval"),
            ("fa-sigma", "McDonald’s omega total from a one-factor common-factor model"),
            ("fa-list-check", "Item–total correlations and alpha / omega if deleted"),
            ("fa-right-left", "Reverse-keyed items with an explicit score range"),
            ("fa-table-cells", "Inter-item correlation matrix with heatmap"),
            ("fa-chart-simple", "Dimensionality diagnostic (scree) with a Factor Analysis hand-off"),
            ("fa-layer-group", "Optional reliability by group"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One scale. Connected reliability views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same item set, so there's no re-running the analysis to move between them.",
        "views": [
            ("overview", "fa-clipboard-check", "Overview", "Read alpha, omega, uncertainty, scale-score descriptives, and a suitability note before inspecting items."),
            ("items", "fa-list-check", "Item Diagnostics", "Find weak, inconsistent, or potentially reversed items with item–total correlations and if-deleted coefficients."),
            ("matrix", "fa-table-cells", "Inter-item Matrix", "Examine Pearson correlations among the selected items as values, a heatmap, or both."),
            ("structure", "fa-chart-line", "Scale Structure", "A PCA scree diagnostic for whether one dominant dimension is plausible — not a substitute for Factor Analysis."),
            ("by-group", "fa-layer-group", "By Group", "Compare alpha and omega across levels of an optional grouping variable."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of consistency, weak items, and next checks — see the caution below."),
        ],
        "feature_kicker": "Coefficients",
        "feature_title": "Alpha and omega sit on the same scale",
        "feature_lead": "Cronbach’s alpha, standardized alpha, and McDonald’s omega total are reported together, with omega estimated from a one-factor common-factor model rather than a PCA approximation.",
        "feature_chips": ["Cronbach’s alpha", "Standardized alpha", "McDonald’s omega total", "Bootstrap CI", "Average inter-item r"],
        "feature_shot": "overview",
        "assess_kicker": "Item review",
        "assess_title": "Assess weak items before deleting them",
        "assess_lead": "Item–total correlations, alpha-if-deleted, and reverse-coding flags stay next to the coefficients, and the module does not treat a higher alpha-if-deleted as a deletion instruction.",
        "assess_chips": ["Item–total r", "Alpha if deleted", "Omega if deleted", "Reverse-keyed items", "Weak-item flags", "Missing-data notes"],
        "extra_kicker": "Structure",
        "extra_title": "Reliability is not unidimensionality",
        "extra_lead": "The structure view offers a scree diagnostic and a hand-off into Factor Analysis, so internal consistency is not mistaken for a single latent dimension.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes alpha, omega, weak items, and reverse-coding cues from the same reliability output already in the workspace, and distinguishes reliability from validity.",
        "related_title": "Other Reduce Dimensions and related modules",
        "related": [
            ("factor-analysis.html", "Factor Analysis", "Latent factors, rotation, and construct structure."),
            ("pca.html", "PCA", "Component retention, scree, and biplots."),
            ("correlation.html", "Correlation", "Pairwise relationships before forming a scale."),
            ("data-manipulation.html", "Data Manipulation", "Reverse-score Likert items and build composites."),
        ],
        "final_cta": "Explore Scale Reliability as an interactive module",
    },
    {
        "slug": "k-means",
        "file": "k-means.html",
        "key": "kmeans",
        "title": "K-Means Clustering",
        "short": "K-Means",
        "family": "Find Segments",
        "family_icon": "fa-object-group",
        "accent": "teal",
        "meta_desc": "Explore K-Means Clustering in Statistico with interactive k selection, centroids, cluster profiles, diagnostics, separation maps, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive K-means clustering module inside Excel: cluster sizes, centers, mean z-score profiles, WCSS diagnostics, assignments, and separation map.",
        "hero_subline": "Experience a completed K-Means Clustering analysis exactly as it appears inside Statistico.",
        "hero_lead": "Partition cases into k groups around centroids and watch sizes, centers, profiles, and diagnostics reorganize live as you change k and distance.",
        "why_chain": ["Choose features", "Set k", "Inspect sizes", "Compare centers", "Review profiles", "Check separation"],
        "why_brand": "From partitioning to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-sliders", "Change k"),
            ("fa-bullseye", "Centroids"),
            ("fa-chart-bar", "Profiles"),
            ("fa-map", "Separation map"),
        ],
        "caps": [
            ("fa-list-check", "Data, options, and verdict overview"),
            ("fa-chart-pie", "Cluster sizes"),
            ("fa-bullseye", "Cluster centers / centroids"),
            ("fa-chart-bar", "Mean z-score profiles by cluster"),
            ("fa-stethoscope", "WCSS and assignment diagnostics"),
            ("fa-map", "Separation and cluster map"),
            ("fa-ruler-combined", "Distance and standardisation controls"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One partition. Connected cluster views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same K-means solution, so there's no re-running the analysis to move between them.",
        "views": [
            ("overview", "fa-list-check", "Overview", "Show selected distance, k, and standardisation beside the segmentation verdict."),
            ("sizes", "fa-chart-pie", "Sizes", "Compare how many cases land in each cluster after the current run."),
            ("centers", "fa-bullseye", "Centers", "Compare cluster centers to understand what defines each segment."),
            ("profiles", "fa-chart-bar", "Profiles", "Read mean z-score profiles across variables for each cluster."),
            ("diagnostics", "fa-stethoscope", "Diagnostics", "Inspect WCSS, iterations, and assignment diagnostics for solution quality."),
            ("map", "fa-map", "Separation & Map", "Explore how separated the clusters appear in reduced space."),
        ],
        "feature_kicker": "Segmentation",
        "feature_title": "Centroids and profiles stay linked to the same k",
        "feature_lead": "Changing k updates sizes, centers, and profiles together, so segment meaning is inspected across views rather than inferred from a single table.",
        "feature_chips": ["k selection", "Distance", "Standardisation", "Centers", "Profiles", "Assignments"],
        "feature_shot": "profiles",
        "assess_kicker": "Diagnostics",
        "assess_title": "Assess compactness, iterations, and separation",
        "assess_lead": "WCSS, iteration history, and the separation map provide complementary evidence before segments are used downstream.",
        "assess_chips": ["WCSS", "Iterations", "Assignments", "Sizes", "Centers", "Separation map"],
        "extra_kicker": "Profiles",
        "extra_title": "Move from partition to interpretable segment profiles",
        "extra_lead": "Mean z-score profiles translate centroid geometry into variable-level segment stories without leaving the clustering module.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes segment differences, diagnostics, and next checks from the same clustering output already in the workspace.",
        "related_title": "Other Find Segments and related modules",
        "related": [
            ("hierarchical.html", "Hierarchical", "Merge-tree clustering and dendrogram."),
            ("pca.html", "PCA", "Reduce dimensions before or after clustering."),
            ("factor-analysis.html", "Factor Analysis", "Latent structure discovery."),
            ("correlation.html", "Correlation", "Feature associations before clustering."),
        ],
        "final_cta": "Explore K-Means Clustering as an interactive module",
    },
    {
        "slug": "hierarchical",
        "file": "hierarchical.html",
        "key": "hierarchical",
        "title": "Hierarchical Clustering",
        "short": "Hierarchical",
        "family": "Find Segments",
        "family_icon": "fa-object-group",
        "accent": "teal",
        "meta_desc": "Explore Hierarchical Clustering in Statistico with dendrograms, linkage choices, tree cuts, cluster profiles, separation maps, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive hierarchical clustering module inside Excel: dendrogram, linkage and distance controls, tree cut at k, cluster sizes, merge steps, profiles, and separation map.",
        "hero_subline": "Experience a completed Hierarchical Clustering analysis exactly as it appears inside Statistico.",
        "hero_lead": "Build a merge tree and cut it at k — dendrogram, cluster sizes, and profiles update together as you change distance and linkage.",
        "why_chain": ["Choose features", "Pick linkage", "Inspect dendrogram", "Cut at k", "Review profiles", "Check separation"],
        "why_brand": "From merge tree to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-sitemap", "Dendrogram"),
            ("fa-sliders", "Tree cut"),
            ("fa-chart-bar", "Profiles"),
            ("fa-map", "Separation map"),
        ],
        "caps": [
            ("fa-list-check", "Data, options, and verdict overview"),
            ("fa-sitemap", "Dendrogram of the merge structure"),
            ("fa-scissors", "Tree cut at chosen k"),
            ("fa-chart-pie", "Cluster sizes and merge steps"),
            ("fa-chart-bar", "Mean z-score profiles by cluster"),
            ("fa-map", "Separation and cluster map"),
            ("fa-diagram-project", "Average, complete, or single linkage"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One merge tree. Connected cluster views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same hierarchical solution, so there's no re-running the analysis to move between them.",
        "views": [
            ("overview", "fa-list-check", "Overview", "Show distance, linkage, and standardisation beside the segmentation verdict."),
            ("dendrogram", "fa-sitemap", "Dendrogram", "Inspect the merge structure behind hierarchical clusters."),
            ("clusters", "fa-chart-pie", "Clusters", "Review sizes, merge steps, and assignments at the chosen tree cut."),
            ("profiles", "fa-chart-bar", "Profiles", "Read mean z-score profiles across variables for each cluster."),
            ("map", "fa-map", "Separation & Map", "Explore how separated the cut clusters appear in reduced space."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of the merge structure and next checks — see the caution below."),
        ],
        "feature_kicker": "Dendrogram",
        "feature_title": "The merge tree is part of the clustering workflow",
        "feature_lead": "Cutting the dendrogram at k updates sizes, assignments, and profiles together, so structure exploration and segment labeling stay connected.",
        "feature_chips": ["Dendrogram", "Average linkage", "Complete linkage", "Single linkage", "Tree cut", "Merge steps"],
        "feature_shot": "dendrogram",
        "assess_kicker": "Segmentation",
        "assess_title": "Assess structure at several cuts before committing",
        "assess_lead": "Dendrogram height, cluster sizes, and profiles provide complementary evidence for where to cut the tree.",
        "assess_chips": ["Dendrogram", "Linkage", "Distance", "Sizes at k", "Profiles", "Separation map"],
        "extra_kicker": "Profiles",
        "extra_title": "Move from merge structure to interpretable clusters",
        "extra_lead": "Once the tree is cut, profiles and the separation map translate hierarchy into segment stories without leaving the module.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes merge structure, the chosen cut, and next checks from the same hierarchical output already in the workspace.",
        "related_title": "Other Find Segments and related modules",
        "related": [
            ("k-means.html", "K-Means", "Partition cases into k groups."),
            ("pca.html", "PCA", "Reduce dimensions before or after clustering."),
            ("factor-analysis.html", "Factor Analysis", "Latent structure discovery."),
            ("correlation.html", "Correlation", "Feature associations before clustering."),
        ],
        "final_cta": "Explore Hierarchical Clustering as an interactive module",
    },
    {
        "slug": "meta-analysis",
        "file": "meta-analysis.html",
        "key": "metaanalysis",
        "title": "Meta-Analysis",
        "short": "Meta-Analysis",
        "family": "Synthesize",
        "family_icon": "fa-layer-group",
        "accent": "indigo",
        "meta_desc": "Explore Meta-Analysis in Statistico: pool study-level effects with forest plots, heterogeneity, funnel plots, Egger tests, and AI-assisted interpretation inside Excel.",
        "app_desc": "Interactive meta-analysis module inside Excel: Hedges' g, risk ratios, forest plots, I² / Q heterogeneity, funnel plots, Egger tests, and random-effects pooling.",
        "hero_subline": "Experience a completed Meta-Analysis exactly as it appears inside Statistico.",
        "hero_lead": "Pool study-level effects into one estimate and inspect the forest plot, heterogeneity, and small-study checks together — without leaving Excel.",
        "why_chain": ["Assign studies", "Choose measure", "Pool effects", "Inspect forest", "Check heterogeneity", "Review bias"],
        "why_brand": "From study rows to statistical reasoning — this is Interactive Statistical Computing, not a sequence of static outputs.",
        "live_steps": [
            ("fa-table", "Study rows"),
            ("fa-scale-balanced", "Pooled effect"),
            ("fa-chart-simple", "Forest plot"),
            ("fa-triangle-exclamation", "Bias checks"),
        ],
        "caps": [
            ("fa-chart-line", "Continuous effects (Hedges’ g / SMD)"),
            ("fa-toggle-on", "Binary effects (odds and risk ratios)"),
            ("fa-link", "Correlations and precomputed effect + SE"),
            ("fa-scale-balanced", "Fixed and random effects (REML / DL, Hartung–Knapp)"),
            ("fa-chart-simple", "Forest plot with study weights"),
            ("fa-chart-pie", "I² / Q heterogeneity diagnostics"),
            ("fa-filter", "Funnel plot and Egger’s test"),
            ("fa-wand-magic-sparkles", "AI-assisted interpretation"),
        ],
        "workflow_title": "One synthesis. Connected views.",
        "workflow_lead": "Click a stage to inspect it — each view stays inside the same pooled analysis, so there's no re-running the meta-analysis to move between them.",
        "views": [
            ("summary", "fa-chart-bar", "Summary", "Start with the pooled effect, confidence interval, and model choice in one opening narrative."),
            ("forest", "fa-chart-simple", "Forest Plot", "See each study’s effect, confidence interval, and weight beside the pooled diamond."),
            ("heterogeneity", "fa-chart-pie", "Heterogeneity", "Inspect I², Q, and τ² so between-study variation is visible before you report a single number."),
            ("bias", "fa-triangle-exclamation", "Small-study Effects", "Review the funnel plot and Egger’s regression for funnel asymmetry and small-study skew."),
            ("studies", "fa-table", "Study Details", "Audit study-level rows, weights, and sensitivity notes from the Active Range."),
            ("ai", "fa-wand-magic-sparkles", "AI Interpretation", "Plain-language summary of the pooled effect, heterogeneity, and bias checks — see the caution below."),
        ],
        "feature_kicker": "Pooling",
        "feature_title": "Study effects stay in one synthesis story",
        "feature_lead": "Switching fixed versus random effects updates the pooled estimate, forest weights, and heterogeneity together, so model choice remains visible rather than buried in a separate printout.",
        "feature_chips": ["Hedges’ g", "Odds / risk ratios", "REML / DL", "Hartung–Knapp", "Forest weights", "Pooled CI"],
        "feature_shot": "forest",
        "assess_kicker": "Evidence assessment",
        "assess_title": "Assess heterogeneity and small-study effects",
        "assess_lead": "I² / Q, the funnel plot, and Egger’s test sit alongside the pooled estimate so consistency and bias checks are inspectable before reporting.",
        "assess_chips": ["I²", "Cochran’s Q", "τ²", "Funnel plot", "Egger’s test", "Study weights", "Sensitivity"],
        "extra_kicker": "Study audit",
        "extra_title": "Move from pooled estimate to study-level rows",
        "extra_lead": "Study Details keeps weights, effects, and source rows tied to the same synthesis, so audit and leave-one-out checks do not restart the workflow.",
        "ai_title": "Interpretation within the analytical workflow",
        "ai_lead": "Statistico's AI-assisted assessment summarizes the pooled effect, heterogeneity, and small-study findings from the same meta-analysis output already in the workspace.",
        "related_title": "Other comparison and modelling modules",
        "related": [
            ("anova.html", "ANOVA", "Multi-group comparisons and post-hoc."),
            ("independent-means.html", "Independent Means", "Between-group comparisons."),
            ("logistic-regression.html", "Logistic Regression", "Binary outcomes and odds ratios."),
            ("mixed-models.html", "Mixed Models", "Fixed and random effects."),
        ],
        "final_cta": "Explore Meta-Analysis as an interactive module",
    },
]


def rgba(rgb: tuple[int, int, int], a: float) -> str:
    r, g, b = rgb
    return f"rgba({r},{g},{b},{a})"


def css_block(a1: tuple[int, int, int], a2: tuple[int, int, int]) -> str:
    return f"""    :root{{
      --surface-0: var(--site-surface-0, #0c1624);
      --surface-1: var(--site-surface-1, #1a1f2e);
      --surface-2: var(--site-surface-2, #242938);
      --border: var(--site-border, #2d3748);
      --accent-1: rgb({a1[0]},{a1[1]},{a1[2]});
      --accent-2: rgb({a2[0]},{a2[1]},{a2[2]});
      --text-1: var(--site-text-primary, #ffffff);
      --text-2: var(--site-text-secondary, rgba(255,255,255,0.8));
      --text-muted: var(--site-text-muted, rgba(255,255,255,0.6));
      --shadow-xl: var(--site-shadow-xl, 0px 4px 20px rgba(0, 0, 0, 0.4));
      --radius-xl: 18px;
      --radius-lg: 14px;
      --radius-md: 12px;
    }}

    *{{box-sizing:border-box}}
    html,body{{margin:0}}
    body{{
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: var(--surface-0);
      background:
        radial-gradient(1200px 600px at 20% -10%, rgba(255,165,120,.08), transparent 60%),
        radial-gradient(1000px 500px at 80% 20%, rgba(120,200,255,.05), transparent 60%),
        linear-gradient(180deg, var(--surface-0) 0%, var(--surface-0) 100%);
      color: var(--text-1);
      overflow-x: hidden;
    }}
    a{{ color: var(--accent-1); text-decoration:none; }}
    a:hover{{ filter:brightness(1.1); }}
    img{{ max-width:100%; display:block; }}

    .container{{ max-width:1160px; margin:0 auto; padding:0 20px; }}

    :is(a, button, [tabindex]):focus-visible{{
      outline: 2px solid rgba(120,200,255,.9);
      outline-offset: 3px;
      border-radius: 8px;
    }}

    .lr-breadcrumb{{ padding: 10px 0 0; }}
    .lr-breadcrumb ol{{
      display:flex; flex-wrap:wrap; align-items:center; gap:6px;
      list-style:none; margin:0; padding:0;
      font-size:.78rem; color: var(--text-muted);
    }}
    .lr-breadcrumb a{{ color: rgba(255,210,170,.78); font-weight:500; }}
    .lr-breadcrumb a:hover{{ color: var(--text-1); text-decoration: underline; }}
    .lr-breadcrumb li:not(:last-child)::after{{
      content:"/"; margin-left:6px; color: rgba(255,255,255,.22);
    }}
    .lr-breadcrumb li[aria-current]{{ color: var(--text-muted); font-weight:600; }}

    .hero{{
      --grid-size: 24px;
      --grid-major: 120px;
      position: relative;
      overflow: hidden;
      padding: 16px 0 20px;
      border-bottom: 1px solid rgba(255, 165, 120, 0.18);
      background:
        radial-gradient(1000px 500px at 18% -15%, rgba(255,165,120,0.24), transparent 62%),
        radial-gradient(900px 480px at 85% 10%, rgba(120,200,255,0.14), transparent 62%),
        linear-gradient(165deg, #141018 0%, #121820 48%, #0c1320 100%);
    }}
    .hero.grid::after{{
      content:"";
      position:absolute; inset:0; pointer-events:none;
      background-image:
        linear-gradient(to right, rgba(255,165,120,.16) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,165,120,.16) 1px, transparent 1px),
        linear-gradient(to right, rgba(120,200,255,.18) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(120,200,255,.18) 1px, transparent 1px);
      background-size:
        var(--grid-size) var(--grid-size),
        var(--grid-size) var(--grid-size),
        var(--grid-major) var(--grid-major),
        var(--grid-major) var(--grid-major);
      opacity:.5;
    }}
    .hero > .container{{ position:relative; z-index:1; }}
    .hero-kicker{{
      display:inline-flex; align-items:center; gap:8px;
      font-size:.72rem; font-weight:650; text-transform:uppercase; letter-spacing:.12em;
      color: rgba(255,214,180,.94);
      padding:5px 10px; border-radius:999px;
      background: rgba(255,165,120,.10);
      border: 1px solid rgba(255,165,120,.32);
      margin-bottom: 12px;
    }}
    .hero h1{{
      margin: 0 0 10px;
      font-size: clamp(1.85rem, 3vw, 2.5rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.18;
      color: #fff;
    }}
    .hero-subline{{
      max-width: 980px; margin: 0 0 8px;
      font-size: clamp(.95rem, 1.15vw, 1.08rem);
      font-weight: 400; line-height: 1.55;
      color: rgba(255,236,220,0.92);
    }}
    .hero-lead{{
      max-width: 980px; margin: 0 0 8px;
      font-size: clamp(.92rem, 1.1vw, 1.02rem);
      line-height: 1.55; color: rgba(236,228,220,0.76);
    }}
    .hero-sub{{
      max-width: 980px; margin: 0 0 16px;
      font-size: .86rem; color: rgba(228,214,200,0.58);
    }}
    .hero-cta{{
      display:flex; flex-wrap:wrap; align-items:center; gap:10px;
    }}
    .btn{{
      display:inline-flex; align-items:center; justify-content:center; gap:8px;
      border-radius:999px; padding:10px 18px;
      font-size:.88rem; font-weight:650;
      border:1px solid transparent;
      transition: transform .18s ease, filter .18s ease, background .18s ease, border-color .18s ease;
      cursor:pointer; text-decoration:none; font-family:inherit;
    }}
    .btn:hover{{ transform: translateY(-1px); filter: brightness(1.06); }}
    .btn-primary{{
      background: rgba(255,165,120,.16);
      border-color: rgba(255,165,120,.48);
      color:#ffe8d6;
    }}
    .btn-ghost{{
      background: transparent;
      border-color: rgba(255,220,190,.22);
      color: rgba(255,236,220,.82);
    }}

    .why-section{{ padding: 18px 0 6px; }}
    .why-panel{{
      padding: 18px 20px 20px;
      border-radius: var(--radius-xl);
      border: 1px solid rgba(255,165,120,.12);
      background:
        radial-gradient(480px 200px at 8% 0%, rgba(255,165,120,.07), transparent 65%),
        rgba(255,255,255,.02);
    }}
    .why-panel h2{{ margin: 0 0 8px; font-size: clamp(1.15rem, 1.8vw, 1.4rem); font-weight:700; color:#fff; }}
    .why-panel p{{ max-width: 980px; margin: 0 0 10px; font-size: .94rem; line-height:1.55; color: rgba(228,236,248,0.72); }}
    .why-panel .why-position{{ max-width: 980px; font-size: .94rem; font-weight: 400; color: rgba(228,236,248,0.86); }}
    .why-chain{{
      display:flex; flex-wrap:wrap; align-items:center; gap:8px;
      margin: 0 0 12px;
      font-size: .82rem; font-weight:600; color: rgba(255,255,255,.72);
    }}
    .why-chain span{{
      padding: 5px 11px; border-radius:999px;
      background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.10);
      white-space: nowrap;
    }}
    .why-chain i{{ color: rgba(255,255,255,.22); font-size:.72rem; }}
    .why-brand{{
      margin:0; font-size: .9rem; font-weight:500;
      color: rgba(255,224,198,0.78);
      border-left: 2px solid rgba(255,165,120,.4);
      padding-left: 12px;
    }}

    .live-strip{{
      display:flex; flex-wrap:wrap; align-items:center; gap:0;
      margin-top: 14px;
    }}
    .live-step{{
      display:flex; flex-direction:column; align-items:center; gap:6px;
      text-align:center; min-width: 108px;
      padding: 12px 10px;
    }}
    .live-step .dot{{
      width:38px; height:38px; border-radius:50%;
      display:grid; place-items:center;
      background: {rgba(a1, .10)}; border:1px solid {rgba(a1, .28)};
      color: var(--accent-1); font-size:.92rem;
      animation: liveDotPulse 2.6s ease-in-out infinite;
    }}
    .live-step:nth-child(3) .dot{{ animation-delay: .3s; }}
    .live-step:nth-child(5) .dot{{ animation-delay: .6s; }}
    .live-step:nth-child(7) .dot{{ animation-delay: .9s; }}
    @keyframes liveDotPulse{{
      0%, 100% {{ box-shadow: 0 0 0 0 {rgba(a1, .18)}; }}
      50% {{ box-shadow: 0 0 0 5px {rgba(a1, .05)}; }}
    }}
    .live-step span{{ font-size:.74rem; font-weight:600; color: rgba(228,236,248,0.68); }}
    .live-arrow{{ color: rgba(255,255,255,.18); font-size:.92rem; }}
    @media (max-width: 768px){{
      .live-strip{{ flex-direction:column; }}
      .live-arrow{{ transform: rotate(90deg); }}
    }}

    section{{ padding: 22px 0; }}
    .section-kicker-label{{
      display:block; font-size:.72rem; font-weight:650; letter-spacing:.12em; text-transform:uppercase;
      color: rgba(255,196,150,.7); margin-bottom:8px;
    }}
    .section-title{{
      margin: 0 0 8px;
      font-size: clamp(1.2rem, 2vw, 1.5rem);
      font-weight: 700;
      letter-spacing: -0.015em;
      color: #fff;
    }}
    .section-lead{{
      max-width: 980px;
      color: rgba(228,236,248,0.72);
      font-size: .94rem;
      line-height: 1.55;
      margin: 0 0 14px;
    }}

    .cap-grid{{
      display:grid;
      grid-template-columns: repeat(4, minmax(0,1fr));
      gap:14px;
    }}
    .cap-item{{
      display:flex; align-items:flex-start; gap:12px;
      padding:14px 15px;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.018);
    }}
    .cap-item i{{
      flex-shrink:0; margin-top:2px;
      color: rgba(120,200,255,.72);
      font-size: .95rem;
      width: 22px; text-align:center;
    }}
    .cap-item span{{ font-size:.86rem; color: rgba(228,236,248,0.72); line-height:1.45; font-weight:500; }}

    .lr-flow{{
      display:flex; flex-wrap:wrap; align-items:stretch; gap:10px;
    }}
    .lr-flow-step{{
      flex:1 1 150px;
      display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px;
      padding: 16px 12px;
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.018);
      position: relative;
      appearance: none;
      font-family: inherit;
      cursor: pointer;
      transition: background .18s ease, border-color .18s ease, transform .18s ease;
    }}
    .lr-flow-step:hover{{ border-color: rgba(120,200,255,.28); transform: translateY(-1px); }}
    .lr-flow-step.is-active{{
      background: {rgba(a1, .10)};
      border-color: {rgba(a1, .36)};
    }}
    .lr-flow-step i{{ color: var(--accent-1); font-size:1.05rem; }}
    .lr-flow-step span{{ font-size:.8rem; font-weight:600; color: rgba(255,255,255,.88); }}
    .lr-flow-arrow{{
      display:flex; align-items:center; justify-content:center;
      color: rgba(255,255,255,.22); font-size:1rem;
      flex: 0 0 auto;
    }}
    @media (max-width: 768px){{
      .lr-flow{{ flex-direction:column; }}
      .lr-flow-arrow{{ transform: rotate(90deg); }}
    }}

    .gallery-panels{{ margin-top: 14px; }}
    .gallery-panel{{ display:none; }}
    .gallery-panel.is-active{{
      display:grid;
      grid-template-columns: minmax(0,1.35fr) minmax(0,1fr);
      gap: 22px;
      align-items: start;
    }}
    .shot-frame{{
      position:relative;
      width:100%;
      aspect-ratio: 16 / 10;
      border-radius: var(--radius-xl);
      overflow:hidden;
      border: 1px solid rgba(255,255,255,.08);
      background:
        radial-gradient(circle at 18% 12%, {rgba(a1, .08)}, transparent 34%),
        radial-gradient(circle at 82% 10%, {rgba(a2, .06)}, transparent 36%),
        linear-gradient(160deg, rgba(8,16,30,.92), rgba(3,8,18,.96));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 14px 32px rgba(0,0,0,.22);
    }}
    .shot-frame img{{ width:100%; height:100%; object-fit:cover; }}
    .shot-missing{{
      display:none;
      position:absolute; inset:0;
      flex-direction:column; align-items:center; justify-content:center; gap:8px;
      text-align:center; padding: 20px;
      color: rgba(255,255,255,.45);
    }}
    .shot-missing i{{ font-size:1.4rem; color: {rgba(a1, .42)}; }}
    .shot-missing span{{ font-size:.8rem; font-weight:600; color: rgba(255,255,255,.58); }}
    .shot-missing code{{
      font-size:.7rem; color: rgba(255,255,255,.35);
      background: rgba(255,255,255,.04); border-radius:6px; padding:3px 8px;
    }}
    .gallery-copy{{ padding-left: 4px; transform: translateZ(0); }}
    .gallery-copy h3{{ margin: 0 0 10px; font-size:1.05rem; font-weight:700; color:#fff; }}
    .gallery-copy p{{ margin:0 0 14px; color: rgba(228,236,248,0.72); font-size:.9rem; line-height:1.65; }}
    @media (max-width: 900px){{
      .gallery-panel.is-active{{ grid-template-columns: 1fr; }}
    }}

    .split{{
      display:grid;
      grid-template-columns: minmax(0,1fr) minmax(0,1fr);
      gap: 22px;
      align-items: start;
    }}
    @media (max-width: 900px){{ .split{{ grid-template-columns: 1fr; }} }}

    .chip-list{{ display:flex; flex-wrap:wrap; gap:8px; margin: 4px 0 12px; }}
    .chip{{
      font-size:.74rem; font-weight:600; color: rgba(228,236,248,0.68);
      background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
      border-radius:999px; padding:5px 11px;
    }}

    .ai-caution{{
      display:flex; align-items:flex-start; gap:12px;
      margin-top: 18px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255,165,120,.22);
      background: rgba(255,165,120,.05);
      color: rgba(255,224,204,.82);
      font-size:.84rem; font-weight:500; line-height:1.55;
      max-width: 620px;
    }}
    .ai-caution i{{ color: rgba(255,165,120,.85); margin-top:2px; }}

    .position-grid{{
      display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:16px;
    }}
    .position-item{{
      padding: 18px; border-radius: var(--radius-lg);
      border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.018);
    }}
    .position-item i{{ color: rgba(120,200,255,.72); font-size:1rem; margin-bottom:10px; display:block; }}
    .position-item p{{ margin:0; font-size:.88rem; color: rgba(228,236,248,0.72); line-height:1.55; font-weight:500; }}
    @media (max-width: 768px){{ .position-grid{{ grid-template-columns: 1fr; }} }}

    .related-grid{{
      display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:14px;
    }}
    .related-card{{
      display:block; padding: 16px 15px; border-radius: var(--radius-lg);
      border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.018);
      transition: border-color .18s ease, transform .18s ease;
    }}
    a.related-card:hover{{ border-color: {rgba(a1, .32)}; transform: translateY(-1px); }}
    .related-card h4{{ margin:0 0 6px; font-size:.9rem; font-weight:650; color:#fff; }}
    .related-card p{{ margin:0; font-size:.78rem; color: var(--text-muted); line-height:1.45; }}
    @media (max-width: 900px){{ .related-grid{{ grid-template-columns: repeat(2, minmax(0,1fr)); }} }}
    @media (max-width: 480px){{ .related-grid{{ grid-template-columns: 1fr; }} }}

    .final-cta{{
      text-align:center;
      padding: 24px 20px;
      border-radius: var(--radius-xl);
      border: 1px solid rgba(255,165,120,.14);
      background:
        radial-gradient(600px 260px at 50% 0%, rgba(255,165,120,.10), transparent 68%),
        rgba(255,255,255,.018);
    }}
    .final-cta h2{{ margin:0 0 8px; font-size: clamp(1.2rem, 2vw, 1.5rem); font-weight:700; color:#fff; }}
    .final-cta .hero-cta{{ justify-content:center; margin-top: 12px; }}

    @media (max-width: 1024px){{
      .cap-grid{{ grid-template-columns: repeat(2, minmax(0,1fr)); }}
    }}
    @media (max-width: 768px){{
      section{{ padding: 18px 0; }}
      .hero{{ padding: 14px 0 18px; }}
      .why-section{{ padding: 14px 0 4px; }}
      .cap-grid{{ grid-template-columns: 1fr; }}
      .position-grid{{ grid-template-columns: 1fr; }}
    }}

    @media (prefers-reduced-motion: reduce){{
      *{{ animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }}
    }}
"""


def shot_name(slug: str, view_id: str) -> str:
    return f"{slug}-{view_id}.webp"


def render_page(m: dict) -> str:
    a1, a2 = ACCENTS[m["accent"]]
    base = f"https://statistico.live/Statistico-Website/analytics/{m['file']}"
    page_title = f"{m['title']} Software for Excel | Statistico Analytics"
    chain_html = "".join(
        f"<span>{step}</span>" + ('<i class="fa-solid fa-chevron-right"></i>' if i < len(m["why_chain"]) - 1 else "")
        for i, step in enumerate(m["why_chain"])
    )
    live_parts = []
    for i, (icon, label) in enumerate(m["live_steps"]):
        live_parts.append(
            f'<div class="live-step" role="listitem"><div class="dot"><i class="fa-solid {icon}" aria-hidden="true"></i></div><span>{label}</span></div>'
        )
        if i < len(m["live_steps"]) - 1:
            live_parts.append('<div class="live-arrow" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></div>')
    caps_html = "\n".join(
        f'          <div class="cap-item"><i class="fa-solid {icon}" aria-hidden="true"></i><span>{label}</span></div>'
        for icon, label in m["caps"]
    )

    tab_parts = []
    panel_parts = []
    for i, (vid, icon, label, copy) in enumerate(m["views"]):
        active = i == 0
        tab_parts.append(
            f'<button type="button" class="lr-flow-step{" is-active" if active else ""}" id="tab-{vid}" role="tab" aria-selected="{"true" if active else "false"}" aria-controls="panel-{vid}" tabindex="{"0" if active else "-1"}"><i class="fa-solid {icon}" aria-hidden="true"></i><span>{label}</span></button>'
        )
        if i < len(m["views"]) - 1:
            tab_parts.append('<div class="lr-flow-arrow" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></div>')
        img = shot_name(m["slug"], vid)
        panel_parts.append(
            f"""          <div class="gallery-panel{" is-active" if active else ""}" id="panel-{vid}" role="tabpanel" aria-labelledby="tab-{vid}" tabindex="0"{"" if active else " hidden"}>
            <figure class="shot-frame">
              <img src="/Statistico-Website/assets/images/analytics/{img}" alt="Statistico {m['title']} {label} view" width="960" height="600" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
              <div class="shot-missing"><i class="fa-solid fa-image" aria-hidden="true"></i><span>Screenshot pending</span><code>{img}</code></div>
            </figure>
            <div class="gallery-copy">
              <h3>{label}</h3>
              <p>{copy}</p>
            </div>
          </div>"""
        )

    feature_img = shot_name(m["slug"], m["feature_shot"])
    feature_chips = "\n".join(f'            <span class="chip">{c}</span>' for c in m["feature_chips"])
    assess_chips = "\n".join(f'          <span class="chip">{c}</span>' for c in m["assess_chips"])
    related = "\n".join(
        f"""          <a class="related-card" href="/Statistico-Website/analytics/{href}">
            <h4>{title}</h4>
            <p>{desc}</p>
          </a>"""
        for href, title, desc in m["related"]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{page_title}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon-max.svg?v=2026-05-07-red-contour" />
  <meta name="description" content="{m['meta_desc']}" />
  <link rel="canonical" href="{base}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Statistico™" />
  <meta property="og:title" content="{page_title}" />
  <meta property="og:description" content="{m['meta_desc']}" />
  <meta property="og:url" content="{base}" />
  <meta property="og:image" content="https://statistico.live/Statistico-Website/assets/img/statistico-og-image.png?v=2" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{page_title}" />
  <meta name="twitter:description" content="{m['meta_desc']}" />
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
        "name": "{page_title}",
        "description": "{m['meta_desc']}",
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
          {{ "@type": "ListItem", "position": 1, "name": "Analytics Suite", "item": "https://statistico.live/Statistico-Website/index-Analytics.html" }},
          {{ "@type": "ListItem", "position": 2, "name": "{m['family']}", "item": "https://statistico.live/Statistico-Website/index-Analytics.html" }},
          {{ "@type": "ListItem", "position": 3, "name": "{m['title']}", "item": "{base}" }}
        ]
      }},
      {{
        "@type": "SoftwareApplication",
        "name": "Statistico {m['title']}",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Statistical Analysis Software",
        "operatingSystem": "Windows, Microsoft Excel",
        "url": "{base}",
        "description": "{m['app_desc']}",
        "publisher": {{ "@type": "Organization", "name": "Statistico" }}
      }}
    ]
  }}
  </script>

  <style>
{css_block(a1, a2)}
  </style>
</head>
<body>

  <div id="nav-placeholder"></div>

  <nav class="lr-breadcrumb container" aria-label="Breadcrumb">
    <ol>
      <li><a href="/Statistico-Website/index-Analytics.html?module={m['key']}#module-cap-section">Analytics Suite</a></li>
      <li><a href="/Statistico-Website/index-Analytics.html?module={m['key']}#module-cap-section">{m['family']}</a></li>
      <li aria-current="page">{m['title']}</li>
    </ol>
  </nav>

  <header class="hero grid">
    <div class="container">
      <div class="hero-kicker"><i class="fa-solid {m['family_icon']}" aria-hidden="true"></i> {m['family']}</div>
      <h1>{m['title']}</h1>
      <p class="hero-subline">{m['hero_subline']}</p>
      <p class="hero-lead">{m['hero_lead']}</p>
      <p class="hero-sub">Designed for serious statistical analysis inside Excel.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#gallery">Explore Module Screens <i class="fa-solid fa-arrow-down" aria-hidden="true"></i></a>
        <a class="btn btn-ghost" href="/Statistico-Website/index-Analytics.html?module={m['key']}#module-cap-section">View Analytics Suite</a>
      </div>
    </div>
  </header>

  <main>
    <section class="why-section" aria-labelledby="why-heading">
      <div class="container">
        <div class="why-panel">
          <h2 id="why-heading">Why analysts choose Statistico</h2>
          <p class="why-position">Instead of isolated statistical outputs, Statistico keeps every stage of {m['title']} connected — without leaving the analytical workflow.</p>
          <div class="why-chain" aria-hidden="true">
            {chain_html}
          </div>
          <p class="why-brand">{m['why_brand']}</p>

          <div class="live-strip" role="list" aria-label="Live interaction sequence">
            {''.join(live_parts)}
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="cap-heading">
      <div class="container">
        <h2 id="cap-heading" class="section-title" style="font-size:1.1rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted);">What the module provides</h2>
        <div class="cap-grid">
{caps_html}
        </div>
      </div>
    </section>

    <section id="gallery" aria-labelledby="workflow-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">Interactive workflow</span>
        <h2 id="workflow-heading" class="section-title">{m['workflow_title']}</h2>
        <p class="section-lead">{m['workflow_lead']}</p>
        <div class="lr-flow" role="tablist" aria-label="{m['title']} analytical workflow">
          {''.join(tab_parts)}
        </div>

        <div class="gallery-panels">
{chr(10).join(panel_parts)}
        </div>
      </div>
    </section>

    <section aria-labelledby="feature-heading" style="border-top:1px solid var(--border);">
      <div class="container split">
        <div>
          <span class="section-kicker-label">{m['feature_kicker']}</span>
          <h2 id="feature-heading" class="section-title">{m['feature_title']}</h2>
          <p class="section-lead" style="margin-bottom:14px;">{m['feature_lead']}</p>
          <div class="chip-list" style="margin-top:0;">
{feature_chips}
          </div>
        </div>
        <figure class="shot-frame">
          <img src="/Statistico-Website/assets/images/analytics/{feature_img}" alt="Statistico {m['title']} highlight view" width="960" height="600" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="shot-missing"><i class="fa-solid fa-image" aria-hidden="true"></i><span>Screenshot pending</span><code>{feature_img}</code></div>
        </figure>
      </div>
    </section>

    <section aria-labelledby="assess-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">{m['assess_kicker']}</span>
        <h2 id="assess-heading" class="section-title">{m['assess_title']}</h2>
        <p class="section-lead">{m['assess_lead']}</p>
        <div class="chip-list">
{assess_chips}
        </div>
      </div>
    </section>

    <section aria-labelledby="extra-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">{m['extra_kicker']}</span>
        <h2 id="extra-heading" class="section-title">{m['extra_title']}</h2>
        <p class="section-lead" style="margin-bottom:0;">{m['extra_lead']}</p>
      </div>
    </section>

    <section aria-labelledby="ai-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">Interpretation</span>
        <h2 id="ai-heading" class="section-title">{m['ai_title']}</h2>
        <p class="section-lead" style="margin-bottom:0;">{m['ai_lead']}</p>
        <div class="ai-caution">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <span>AI-assisted interpretation supports, but does not replace, statistical judgment.</span>
        </div>
      </div>
    </section>

    <section aria-labelledby="position-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">Why Statistico</span>
        <h2 id="position-heading" class="section-title">Built for analysts who already know the method</h2>
        <div class="position-grid">
          <div class="position-item">
            <i class="fa-solid fa-table" aria-hidden="true"></i>
            <p>Excel remains the working data environment.</p>
          </div>
          <div class="position-item">
            <i class="fa-solid fa-eye" aria-hidden="true"></i>
            <p>Statistical outputs remain visible and inspectable.</p>
          </div>
          <div class="position-item">
            <i class="fa-solid fa-hand-pointer" aria-hidden="true"></i>
            <p>Interaction supports analysis rather than hiding it.</p>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="related-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <span class="section-kicker-label">Related modules</span>
        <h2 id="related-heading" class="section-title">{m['related_title']}</h2>
        <div class="related-grid">
{related}
        </div>
      </div>
    </section>

    <section aria-labelledby="final-cta-heading" style="border-top:1px solid var(--border);">
      <div class="container">
        <div class="final-cta">
          <h2 id="final-cta-heading">{m['final_cta']}</h2>
          <div class="hero-cta">
            <a class="btn btn-primary" href="#gallery">Explore Module Screens</a>
            <a class="btn btn-ghost" href="/Statistico-Website/index-Analytics.html?module={m['key']}#module-cap-section">Return to Analytics Suite</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div id="footer-placeholder"></div>

  <script src="/Statistico-Website/assets/js/nav-template.js?v=20260820rel"></script>
  <script>
    (function () {{
      const tabs = Array.from(document.querySelectorAll('.lr-flow-step[role="tab"]'));
      const panels = Array.from(document.querySelectorAll('.gallery-panel'));

      function activate(tab, focus) {{
        tabs.forEach(t => {{
          const isActive = t === tab;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
          t.tabIndex = isActive ? 0 : -1;
        }});
        panels.forEach(p => {{
          const match = p.getAttribute('aria-labelledby') === tab.id;
          p.classList.toggle('is-active', match);
          if (match) {{ p.removeAttribute('hidden'); }} else {{ p.setAttribute('hidden', ''); }}
        }});
        if (focus) tab.focus();
      }}

      tabs.forEach((tab, i) => {{
        tab.addEventListener('click', () => activate(tab, false));
        tab.addEventListener('keydown', (e) => {{
          let idx = i;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') idx = (i + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') idx = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') idx = 0;
          else if (e.key === 'End') idx = tabs.length - 1;
          else return;
          e.preventDefault();
          activate(tabs[idx], true);
        }});
      }});
    }})();
  </script>
</body>
</html>
"""


def main() -> None:
    for m in MODULES:
        path = OUT_DIR / m["file"]
        path.write_text(render_page(m), encoding="utf-8")
        print(f"wrote {path.name}")


if __name__ == "__main__":
    main()
