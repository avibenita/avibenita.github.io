/* global Office */
/**
 * Analytics hub: loads module cards from modules.config.json (single source of truth).
 * Ribbon entries are declared separately in manifest.xml — see modules.config.json → ribbonMenu.
 */

let MODULES = [];
let hubConfigDialog = null;
let hubUnivariateFlowActive = false;
let hubUnivariateModuleId = "univariate";
let hubUnivariateStartView = null;
let hubRegressionFlowActive = false;
let hubRegressionConfigDialog = null;
let hubRegressionResultsDialog = null;
let hubRegressionModelSpec = null;
let hubRegressionDataPayload = null;
let hubAnovaFlowActive = false;
let hubAnovaDialog = null;
let hubIndependentFlowActive = false;
let hubIndependentDialog = null;
let hubCorrelationFlowActive = false;
let hubCorrelationDialog = null;
let hubCorrelationResultsDialog = null;
let hubCorrelationMatrixData = null;
let hubPendingCorrelationRunData = null;
let hubPendingCorrelationViewUrl = null;
let hubParetoFlowActive = false;
let hubParetoConfigDialog = null;
let hubParetoResultsDialog = null;
let hubBuilderDialog = null;
let hubPublicationTablesFlowActive = false;
let hubPublicationTablesResultsDialog = null;
// Dialog dimensions are defined in dialog-sizes.js (DIALOG_SIZES)
const HUB_CATEGORY_TILES = [
  /* ── Explore & Summarize ─────────────────────────────────────────── */
  {
    id: "explore-univariate",
    section: "Explore & Summarize",
    sectionId: "explore",
    sectionSubtitle: "Explore distributions, relationships, and categorical patterns",
    title: "Univariate Analysis",
    icon: "fa-chart-bar",
    accent: "#f97316",
    accentDark: "#c2410c",
    color: "#f97316",
    colorDark: "#c2410c",
    subtitle: "Distributions, percentiles, normality, and outliers",
    desc: "Start here when you need to understand individual variables — descriptive summaries, plots, and assumption checks — before modeling or group tests.",
    info: [
      "Descriptive statistics, box plots, density plots, and percentiles",
      "Normality checks with QQ/PP plots",
      "Works from your Active Range in Excel",
      "Useful first pass before regression or group comparisons"
    ],
    modules: [
      { id: "univariate", label: "Univariate Analysis", tip: "Distribution summaries, outliers, and normality checks for single variables." },
      { id: "univariate-workspace", label: "Univariate Workspace", tip: "Focused live-data histogram workspace with only the Distribution view enabled." }
    ]
  },
  {
    id: "explore-correlations",
    sectionId: "explore",
    title: "Correlations",
    icon: "fa-grip",
    accent: "#f97316",
    accentDark: "#c2410c",
    color: "#f97316",
    colorDark: "#c2410c",
    subtitle: "Pairwise associations and correlation matrices",
    desc: "Measure how numeric variables move together — pairwise associations and a full correlation matrix from your Active Range.",
    info: [
      "Pairwise associations and correlation matrices",
      "Works from your Active Range in Excel",
      "Useful first pass before regression or group comparisons"
    ],
    modules: [
      { id: "correlations", label: "Correlation Analysis", tip: "Pairwise associations and correlation matrix between numeric variables." }
    ]
  },
  {
    id: "explore-contingency",
    sectionId: "explore",
    title: "Frequency & Contingency Tables",
    icon: "fa-table-cells",
    accent: "#f97316",
    accentDark: "#c2410c",
    color: "#8b5cf6",
    colorDark: "#6d28d9",
    subtitle: "Association in two-way tables",
    desc: "Test whether two categorical variables are associated, with χ², residuals, and 2×2 risk measures.",
    info: [
      "Contingency Tables: two-way association, χ², residuals, and 2×2 risk measures",
      "Works from your Active Range in Excel"
    ],
    modules: [
      { id: "contingency", label: "Frequencies & Crosstabs", tip: "Association between two categorical variables — χ², Cramér’s V, residuals, and 2×2 odds/risk measures." }
    ]
  },
  /* ── Compare Groups ──────────────────────────────────────────────── */
  {
    id: "compare-two-groups",
    section: "Compare Groups",
    sectionId: "compare",
    sectionSubtitle: "Compare outcomes across independent, paired or repeated observations",
    title: "Two Independent Groups",
    icon: "fa-arrows-left-right",
    accent: "#10b981",
    accentDark: "#0f766e",
    color: "#06b6d4",
    colorDark: "#0e7490",
    subtitle: "Two-group mean comparison",
    desc: "Compare a numeric outcome across two independent groups. The module recommends parametric or nonparametric methods from your design.",
    info: [
      "Student/Welch t and Mann–Whitney alternatives",
      "Effect sizes and assumption checks",
      "Works from your Active Range in Excel"
    ],
    modules: [
      { id: "independent", label: "Independent Samples t-Test", tip: "Compare two independent groups on a numeric outcome." }
    ]
  },
  {
    id: "compare-paired",
    sectionId: "compare",
    title: "Paired & Repeated Measures",
    icon: "fa-rotate",
    accent: "#10b981",
    accentDark: "#0f766e",
    color: "#06b6d4",
    colorDark: "#0e7490",
    subtitle: "Same cases measured more than once",
    desc: "Compare paired or repeated measurements for the same cases. Parametric and nonparametric alternatives are available inside the module.",
    info: [
      "Paired t, Wilcoxon, and related alternatives",
      "Effect sizes and assumption checks",
      "Works from your Active Range in Excel"
    ],
    modules: [
      { id: "dependent", label: "Paired / Repeated Measures", tip: "Compare paired or repeated measurements for the same cases." }
    ]
  },
  {
    id: "compare-k-groups",
    sectionId: "compare",
    title: "Three or More Groups",
    icon: "fa-scale-balanced",
    accent: "#10b981",
    accentDark: "#0f766e",
    color: "#10b981",
    colorDark: "#0f766e",
    subtitle: "ANOVA with post-hoc comparisons",
    desc: "Test whether means differ across three or more groups, with post-hoc options and effect sizes.",
    info: [
      "ANOVA / Welch and Kruskal–Wallis alternatives",
      "Post-hoc comparisons and effect sizes",
      "Works from your Active Range in Excel"
    ],
    modules: [
      { id: "anova", label: "One-Way ANOVA", tip: "Compare means across 3+ groups with post-hoc support." }
    ]
  },
  /* ── Model & Predict ─────────────────────────────────────────────── */
  {
    id: "model-relationships",
    section: "Model & Predict",
    sectionId: "model",
    sectionSubtitle: "Explain outcomes, estimate effects, and produce predictions",
    title: "Regression Models",
    icon: "fa-chart-line",
    accent: "#0ea5e9",
    accentDark: "#0369a1",
    color: "#0ea5e9",
    colorDark: "#0369a1",
    subtitle: "Model continuous or binary outcomes using fixed predictors.",
    desc: "Explain and predict continuous or binary outcomes from one or more predictors, with coefficients and fit diagnostics.",
    info: [
      "Linear regression: continuous outcomes, coefficients, and diagnostics",
      "Logistic: binary outcomes with odds ratios and classification",
      "Diagnostics stay inside each model rather than as separate modules"
    ],
    modules: [
      { id: "regression", label: "Linear Regression", tip: "Linear regression with coefficients, intervals, and diagnostics." },
      { id: "logistic", label: "Logistic Regression", tip: "Binary outcome modeling with odds ratios and model fit metrics." }
    ]
  },
  {
    id: "model-mixed",
    sectionId: "model",
    title: "Mixed & Multilevel Models",
    icon: "fa-layer-group",
    accent: "#0ea5e9",
    accentDark: "#0369a1",
    color: "#0ea5e9",
    colorDark: "#0369a1",
    subtitle: "Analyse clustered or repeated observations with fixed and random effects.",
    desc: "Model grouped, nested, or repeated-measures data using fixed predictors plus random subject variation.",
    info: [
      "Linear mixed models for clustered or repeated observations",
      "Fixed effects plus random subject variation",
      "Useful when ANOVA-style comparisons are not enough",
      "Diagnostics stay inside the module"
    ],
    modules: [
      { id: "mixed", label: "Mixed-Effects Models", tip: "Mixed-effects models for grouped or repeated-measures style data." }
    ]
  },
  /* ── Discover Structure ──────────────────────────────────────────── */
  {
    id: "reduce-dimensions",
    section: "Discover Structure",
    sectionId: "structure",
    sectionSubtitle: "Uncover latent dimensions, relationships, or groups",
    title: "Latent Structure",
    icon: "fa-layer-group",
    accent: "#ec4899",
    accentDark: "#be185d",
    color: "#ec4899",
    colorDark: "#be185d",
    tabStyle: "soft",
    subtitle: "PCA, factor analysis, and scale reliability",
    desc: "Reduce many correlated variables into fewer components or latent factors, and assess the internal consistency of multi-item scales.",
    info: [
      "Factor analysis: latent constructs and rotations",
      "PCA: variance-maximizing dimension reduction",
      "Scale Reliability: Cronbach’s alpha, omega, and item diagnostics",
      "Scree plots, loadings, and adequacy checks"
    ],
    modules: [
      { id: "factor", label: "Factor Analysis", tip: "Latent factor extraction and rotation for construct discovery." },
      { id: "pca", label: "Principal Component Analysis", tip: "Principal component reduction for compact feature representation." },
      { id: "reliability", label: "Scale Reliability (Alpha / Omega)", tip: "Internal consistency of multi-item scales: alpha, omega, and item diagnostics." }
    ]
  },
  {
    id: "segment-data",
    sectionId: "structure",
    title: "Segmentation",
    icon: "fa-object-group",
    accent: "#ec4899",
    accentDark: "#be185d",
    color: "#14b8a6",
    colorDark: "#0f766e",
    subtitle: "K-means and hierarchical clustering",
    desc: "Group cases into segments based on similarity — either by partitioning into k clusters or by building a merge tree.",
    info: [
      "K-means: partition cases around centroids",
      "Hierarchical: agglomerative tree with dendrogram",
      "Distance metrics and optional standardisation",
      "Cluster sizes, profiles, and case assignments"
    ],
    modules: [
      { id: "kmeans", label: "K-Means Clustering", tip: "Partition cases into k groups around centroids." },
      { id: "hierarchical", label: "Hierarchical Clustering", tip: "Agglomerative merge tree with dendrogram; cut at k." }
    ]
  },
  /* ── Synthesize & Evaluate ───────────────────────────────────────── */
  {
    id: "meta-analysis-tools",
    section: "Synthesize & Evaluate",
    sectionId: "synthesize",
    sectionSubtitle: "Evidence synthesis and method evaluation",
    title: "Meta-Analysis",
    icon: "fa-layer-group",
    accent: "#818cf8",
    accentDark: "#4f46e5",
    color: "#6366f1",
    colorDark: "#4338ca",
    subtitle: "Pool study-level effect sizes into an overall estimate",
    desc: "Combine continuous, binary, or precomputed study effects with fixed or random-effects models — including forest plots, heterogeneity, and publication-bias checks.",
    info: [
      "Continuous (Hedges' g), binary (log OR), or direct effect + SE",
      "Fixed-effects and DerSimonian–Laird random-effects models",
      "Forest plot, I² / Q heterogeneity, and funnel / Egger bias checks",
      "Works from study-level rows in your Active Range"
    ],
    modules: [
      {
        id: "meta-analysis",
        label: "Run Meta-Analysis",
        tip: "Pool study effect sizes with fixed/random effects, forest plot, and heterogeneity diagnostics."
      }
    ]
  }
];
const TOOLS_CATEGORY_TILES = [
  /* ── Cluster 1: Applications ──────────────────────────────────────────
     Specialized modules that work on the Excel range/selection itself. */
  {
    id: "report-tables",
    section: "Applications",
    sectionId: "applications",
    sectionSubtitle: "Build journal-ready tables and run Pareto (80/20) analysis on your Excel data",
    title: "Publication Tables",
    icon: "fa-graduation-cap",
    accent: "#eab308",
    accentDark: "#a16207",
    color: "#eab308",
    colorDark: "#a16207",
    subtitle: "Turn raw data into polished, journal-ready tables",
    desc: "Build Table 1 / baseline-characteristics, frequency, and group-comparison tables — with p-values, standardized differences, and manuscript-ready styling.",
    info: [
      "Table 1 / baseline characteristics",
      "Group comparisons with p-values & SMD",
      "Mixed continuous + hierarchical categorical rows",
      "Clinical, APA, journal & compact styles",
      "Copy to Word/Excel or export .doc/.xls"
    ],
    modules: [
      { id: "publication-tables", label: "Publication-Ready Tables", tip: "Build a publication-ready Table 1 or descriptive summary from your Excel data — formatted for Word and journals." }
    ]
  },
  {
    id: "quality-ops",
    title: "Identify the Vital Few",
    icon: "fa-chart-column",
    iconSvg: '<svg viewBox="0 0 22 19" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" style="display:block"><rect x="0.5" y="5" width="4" height="13" fill="currentColor" opacity="0.9" rx="0.4"/><rect x="5.5" y="8.5" width="4" height="9.5" fill="currentColor" opacity="0.75" rx="0.4"/><rect x="10.5" y="12" width="4" height="6" fill="currentColor" opacity="0.6" rx="0.4"/><rect x="15.5" y="15" width="4" height="3" fill="currentColor" opacity="0.45" rx="0.4"/><path d="M 2.5 18 C 5 7, 12 2, 21 1.5" stroke="rgba(251,146,60,0.95)" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
    accent: "#eab308",
    accentDark: "#a16207",
    color: "#f97316",
    colorDark: "#c2410c",
    subtitle: "Reveal the small number of contributors driving most outcomes.",
    desc: "Use Pareto (80/20) analysis to find the few categories that account for most of the total — ideal for quality, operations, and prioritization.",
    info: [
      "Interactive Pareto chart with cumulative curve",
      "80/20 vital-few highlighting",
      "Works from your Active Range in Excel",
      "Useful for defects, costs, volume, and similar counts"
    ],
    modules: [
      {
        id: "pareto2080",
        label: "Pareto Analysis (80/20)",
        tip: "Identify the vital few contributors using interactive Pareto analysis with the 80/20 rule."
      }
    ]
  },
  {
    id: "survey-tools",
    hidden: true, // temporarily hidden from the hub
    title: "Survey Segmentation Matrix",
    icon: "fa-border-all",
    accent: "#eab308",
    accentDark: "#a16207",
    color: "#0d9488",
    colorDark: "#0f766e",
    subtitle: "Transform two survey dimensions into actionable respondent segments.",
    desc: "Classify respondents into four segments from two survey dimensions, then compare the mix across groups and survey waves.",
    info: [
      "Employee-loyalty template: Satisfaction × Intention to stay",
      "Truly Loyal, Accessible, Trapped, and High Risk segments",
      "Group comparison with 100% stacked composition",
      "Optional current vs previous wave change"
    ],
    modules: [
      {
        id: "segmentation",
        label: "Survey Segmentation Matrix",
        tip: "Classify survey respondents into four segments using two dimensions, then compare groups and waves."
      }
    ]
  },
  /* ── Cluster 2: Calculators & Planning ────────────────────────────────
     Standalone tools driven by entered parameters, not a worksheet range. */
  {
    id: "distribution-tools",
    section: "Calculators & Planning",
    sectionId: "calculators",
    sectionSubtitle: "Standalone calculations, study design, and simulation tools",
    title: "Distribution calculators",
    icon: "fa-chart-area",
    accent: "#38bdf8",
    accentDark: "#0284c7",
    color: "#2563eb",
    colorDark: "#1d4ed8",
    subtitle: "Probability, quantiles, and tails for common distributions",
    desc: "Look up probabilities, critical values, and tail areas for common statistical distributions — no worksheet range required.",
    info: [
      "Normal, t, chi-square, F, and related families",
      "PDF / CDF and quantile calculations",
      "Left-, right-, and two-tailed probabilities",
      "Standalone calculator — enter parameters directly"
    ],
    modules: [
      {
        id: "calc-distribution-hub",
        label: "Distribution Calculators",
        tip: "Open the distribution family hub in a dialog.",
        dialogUrl: "https://statistico.live/statistico-calculators/0Distribution_Calculators/index-distribution.html"
      }
    ]
  },
  {
    id: "sample-planning",
    title: "Sample planning",
    icon: "fa-ruler-combined",
    accent: "#38bdf8",
    accentDark: "#0284c7",
    color: "#0ea5e9",
    colorDark: "#0369a1",
    subtitle: "Precision and power oriented sample size tools",
    desc: "Plan how large a sample you need — either for a target precision (margin of error) or for a desired statistical power.",
    info: [
      "Precision-based sample size estimation",
      "Power-based sample size calculation",
      "Common test families and effect-size inputs",
      "Standalone planning tools — no Active Range needed"
    ],
    modules: [
      {
        id: "calc-precision",
        label: "Sample Size — Precision",
        tip: "Estimate sample size by target precision.",
        dialogUrl: "https://statistico.live/statistico-calculators/Precision-Based%20-Sample/PrecisionSampleCalculator.html"
      },
      {
        id: "calc-power",
        label: "Sample Size — Power",
        tip: "Power-based sample size calculator.",
        dialogUrl: "https://statistico.live/statistico-calculators/power-sample-size-calculator/PowerCalculator.html"
      }
    ]
  },
  {
    id: "effect-size-family",
    hidden: true, // temporarily hidden from the hub
    title: "Effect size converter",
    icon: "fa-right-left",
    accent: "#38bdf8",
    accentDark: "#0284c7",
    color: "#a855f7",
    colorDark: "#7e22ce",
    subtitle: "Translate effect metrics across test families",
    desc: "Convert between common effect-size metrics so you can compare or reuse results across different statistical tests.",
    info: [
      "Convert between common effect-size families",
      "Useful when planning studies or pooling literature",
      "Supports metrics used across t-tests, ANOVA, and correlations",
      "Standalone converter — enter values directly"
    ],
    modules: [
      {
        id: "calc-effect-size",
        label: "Effect Size Converter",
        tip: "Open the effect-size conversion family.",
        dialogUrl: "https://statistico.live/statistico-calculators/hub.html?family=effect"
      }
    ]
  },
  {
    id: "erlang-family",
    title: "Call center staffing",
    icon: "fa-headset",
    accent: "#38bdf8",
    accentDark: "#0284c7",
    color: "#f59e0b",
    colorDark: "#b45309",
    subtitle: "Erlang C and operational staffing design",
    desc: "Estimate how many agents you need to meet service-level targets using Erlang C and related staffing simulations.",
    info: [
      "Erlang C staffing calculations",
      "Service level, wait time, and occupancy trade-offs",
      "Simulation support for operational scenarios",
      "Standalone planning tool for call-center design"
    ],
    modules: [
      {
        id: "calc-erlang",
        label: "Erlang C & Simulation",
        tip: "Open call-center staffing and simulation tools.",
        dialogUrl: "https://statistico.live/statistico-calculators/hub.html?family=erlang"
      }
    ]
  },
  /* ── Specialized visualisation ───────────────────────────────────────
     Applied visual workflow using Excel data. */
  {
    id: "specialized-bubble",
    section: "Specialized Tools",
    sectionId: "applications",
    sectionSubtitle: "Purpose-built tools for analysis and reporting",
    title: "Multivariable Visualisation",
    icon: "fa-chart-scatter",
    accent: "#34d399",
    accentDark: "#059669",
    color: "#14b8a6",
    colorDark: "#0f766e",
    subtitle: "Interactive bubble, quadrant, and 3D scatter charts from your Excel data",
    desc: "Map X, Y, size, color, and labels on a multivariable bubble, quadrant, or 3D scatter chart.",
    info: [
      "Multivariable Visualisation: bubble, quadrant, and 3D scatter (X, Y, size, color)",
      "Guided input dialog: drag columns into roles, or load the built-in sample",
      "Change range from inside the dialog (Use selection / Select range)"
    ],
    modules: [
      { id: "multivariable", label: "Multivar. chart (Bubble)", tip: "Opens a guided input dialog — drag columns into X, Y, Size, Color, and Label. Uses the active range, or pick/load sample inside the dialog." }
    ]
  },
  {
    id: "ezpaste",
    sectionId: "standalone",
    standalone: true,
    title: "EzPaste",
    icon: "fa-bullseye",
    accent: "#34d399",
    accentDark: "#059669",
    color: "#14b8a6",
    colorDark: "#0f766e",
    subtitle: "Batch-export Excel charts and ranges to PowerPoint, Word, and more",
    desc: "Automate exporting Excel charts and tables into PowerPoint, Word, PDF, and HTML — instead of copying one object at a time.",
    info: [
      "Batch-export charts and ranges",
      "Targets PowerPoint, Word, PDF, and HTML",
      "Keeps layout and formatting consistent",
      "Opens the EzPaste workflow from the hub"
    ],
    modules: [
      {
        id: "ezpaste-open",
        label: "EzPaste — XL to PPT automation",
        tip: "Open EzPaste — automate Excel charts and tables into PowerPoint, Word, PDF, and HTML.",
        browserUrl: "https://statistico.live/Statistico-Website/index-EzPaste.html"
      }
    ]
  }
];
const PREPARE_CATEGORY_TILES = [
  {
    id: "prepare-quality",
    section: "Prepare Data",
    sectionId: "prepare",
    sectionSubtitle: "Rewrite variables, cases, and table shape for the analysis you intend to run",
    title: "Data Quality",
    icon: "fa-magnifying-glass-chart",
    accent: "#14b8a6",
    accentDark: "#0f766e",
    color: "#14b8a6",
    colorDark: "#0f766e",
    subtitle: "Find missing values, inconsistent categories, duplicates and structural problems before analysis.",
    desc: "Scan the Active Range for missing values, inconsistent categories, duplicates, and structural problems that commonly weaken statistical analysis. Suggested corrections are never applied automatically.",
    info: [
      "Scan the selected Excel range without changing the source worksheet",
      "Missing values, mixed types, duplicates, and inconsistent labels",
      "Suggested actions can be added to a preparation recipe",
      "Does not replace analysis-level trimming or transformations"
    ],
    modules: [
      { id: "prepare-quality", label: "Scan data quality", tip: "Inspect missing values, duplicates, mixed types, and inconsistent categories." }
    ]
  },
  {
    id: "prepare-dataset",
    sectionId: "prepare",
    title: "Prepare Dataset",
    icon: "fa-table-columns",
    accent: "#14b8a6",
    accentDark: "#0f766e",
    color: "#0d9488",
    colorDark: "#0f766e",
    subtitle: "Recode, compute, filter and reshape data while preserving the original worksheet.",
    desc: "Build a reusable preparation recipe — recode, compute, reverse-score, composite scores, filter, and reshape — then write a new Prepared_Data worksheet. The original range is never overwritten.",
    info: [
      "Persistent dataset operations: missing codes, recode, compute, reverse-score, composites",
      "Filter cases, flag duplicates, and reshape wide data to long",
      "Preview changes before creating a new worksheet",
      "Leaves analysis-level transforms (ln, z-score, trim) inside each analysis dialog"
    ],
    modules: [
      { id: "prepare-dataset", label: "Prepare dataset", tip: "Recode, compute, filter, and reshape into a new worksheet." }
    ]
  }
];
let HUB_CLUSTER_TILES = {
  analytics: HUB_CATEGORY_TILES,
  tools: PREPARE_CATEGORY_TILES.concat(TOOLS_CATEGORY_TILES)
};
let HUB_CLUSTER_META = {
  analytics: {
    eyebrow: "Statistico flagship",
    name: "Statistical Analysis",
    tagline: "Core statistical modeling, comparisons, and discovery tools",
    color: "#c4b5fd",
    colorDark: "#6d28d9",
    icon: "fa-chart-line",
    brandFrom: "#c4b5fd",
    brandTo: "#a78bfa"
  },
  tools: {
    eyebrow: "Statistico flagship",
    name: "Specialized Tools",
    tagline: "Goal-oriented planning, reporting, and operational workflows",
    color: "#f4b183",
    colorDark: "#8a4f1c",
    icon: "fa-toolbox",
    brandFrom: "#f4b183",
    brandTo: "#c97a32"
  }
};
let HUB_VISIBLE_CLUSTERS = ["analytics", "tools"];
/* Active Range is shown on Specialized Tools for Data Preparation and purpose-built tools.
   Calculators and standalone EzPaste pick their own inputs. */
let HUB_RANGE_VISIBLE_CLUSTERS = ["analytics", "tools"];
let HUB_ADVISOR_VISIBLE_CLUSTERS = ["analytics"];
let ACTIVE_CLUSTER = "analytics";
let ACTIVE_TOOLS_SECTION = "all";
var TOOLS_SECTION_META = {
  prepare: {
    id: "prepare",
    label: "Data Preparation",
    subtitle: "Clean, recode, and transform your data for analysis.",
    icon: "fa-broom",
    color: "#14b8a6",
    colorDark: "#0f766e"
  },
  applications: {
    id: "applications",
    label: "Specialized Tools",
    subtitle: "Purpose-built tools for analysis and reporting.",
    icon: "fa-table",
    color: "#eab308",
    colorDark: "#a16207"
  },
  calculators: {
    id: "calculators",
    label: "Calculators & Planning",
    subtitle: "Plan samples and calculate probabilities.",
    icon: "fa-calculator",
    color: "#38bdf8",
    colorDark: "#0284c7"
  }
};
var TOOLS_SECTION_ORDER = ["prepare", "applications", "calculators"];
var TOOLS_RANGE_SECTIONS = ["prepare", "applications"];
var ANALYTICS_SECTION_STORAGE_KEY = "statistico.hub.analyticsSection";
var ANALYTICS_SECTION_META = {
  explore: {
    id: "explore",
    label: "Explore & Summarize",
    subtitle: "Explore distributions, relationships, and categories.",
    icon: "fa-chart-bar",
    color: "#f97316",
    colorDark: "#c2410c"
  },
  compare: {
    id: "compare",
    label: "Compare Groups",
    subtitle: "Compare outcomes across groups or occasions.",
    icon: "fa-scale-balanced",
    color: "#10b981",
    colorDark: "#0f766e"
  },
  model: {
    id: "model",
    label: "Model & Predict",
    subtitle: "Explain outcomes, estimate effects, and build predictions.",
    icon: "fa-chart-line",
    color: "#0ea5e9",
    colorDark: "#0369a1"
  },
  structure: {
    id: "structure",
    label: "Discover Structure",
    subtitle: "Find latent dimensions and natural groups.",
    icon: "fa-circle-nodes",
    color: "#ec4899",
    colorDark: "#be185d"
  },
  synthesize: {
    id: "synthesize",
    label: "Synthesize & Evaluate",
    subtitle: "Pool study results and assess heterogeneity and bias.",
    icon: "fa-flask",
    color: "#818cf8",
    colorDark: "#4f46e5"
  }
};
var ANALYTICS_FAMILY_ORDER = ["explore", "compare", "model", "structure", "synthesize"];
var ACTIVE_ANALYTICS_SECTION = "all";
var HUB_OPEN_SECTIONS = { analytics: {}, tools: {} };
let HUB_ACTIONS = {};

/** Ensures the clustering cards appear even if a cached or older modules.config.json omits them (inserted after PCA). */
var CLUSTERING_MODULE_CARDS = [
  {
    id: "kmeans",
    group: "multivariate",
    icon: "fa-braille",
    color: "#14b8a6",
    bg: "rgba(20,184,166,.12)",
    name: "K-means Clustering",
    desc: "Partition observations into k groups by iteratively assigning cases to the nearest centroid.",
    info: [
      "Euclidean or Manhattan distance",
      "Standardisation optional",
      "Cluster sizes, centers & case assignments",
      "Mean z-score profiles by cluster",
      "Runs in the task pane — no cloud round-trip"
    ]
  },
  {
    id: "hierarchical",
    group: "multivariate",
    icon: "fa-sitemap",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,.12)",
    name: "Hierarchical Clustering",
    desc: "Build an agglomerative merge tree and cut it at k to label clusters — with a full dendrogram.",
    info: [
      "Average, complete, or single linkage",
      "Euclidean or Manhattan distance",
      "Dendrogram of the merge structure",
      "Sizes, merge steps & assignments at k",
      "Runs in the task pane — no cloud round-trip"
    ]
  }
];

function ensureClusterModule(list) {
  /* Drop the legacy combined card and make sure both single-method cards exist. */
  var out = list.filter(function(m) { return m.id !== "cluster"; });
  var afterId = "pca";
  CLUSTERING_MODULE_CARDS.forEach(function(card) {
    if (!out.some(function(m) { return m.id === card.id; })) {
      var idx = out.findIndex(function(m) { return m.id === afterId; });
      if (idx >= 0) out.splice(idx + 1, 0, card);
      else out.push(card);
    }
    afterId = card.id;
  });
  return out;
}

async function loadModulesConfig() {
  const url = new URL("modules.config.json", window.location.href);
  url.searchParams.set("v", String(Date.now()));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  const list = data && Array.isArray(data.modules) ? data.modules : [];
  if (!list.length) throw new Error("No modules in config");
  return list;
}

function renderModules(list) {
  ["descriptive", "comparisons", "multivariate", "reporting"].forEach(function(g) {
    const block = document.querySelector('.group-block[data-group="' + g + '"]');
    if (!block) return;
    block.querySelectorAll(".module-card").forEach(function(c) { c.remove(); });
    const cards = list.filter(function(m) { return m.group === g; });
    cards.forEach(function(m) { block.appendChild(makeCard(m)); });
    block.classList.toggle("hidden", cards.length === 0);
  });
  const noResults = document.getElementById("noResults");
  if (noResults) noResults.style.display = list.length ? "none" : "block";
}

function parkRangeInStickyChrome(range) {
  var chrome = document.getElementById("hubStickyChrome");
  var allBar = document.getElementById("hubAnalyticsAllBar");
  if (!chrome) return false;
  if (allBar && allBar.parentElement === chrome) {
    chrome.insertBefore(range, allBar);
  } else if (range.parentElement !== chrome) {
    chrome.insertBefore(range, chrome.firstChild);
  }
  return true;
}

/* Keep the Active Range bar in the frozen chrome (logo / tabs / search stay
   put while modules scroll). On Specialized Tools section views, park it under
   the first category header so it still sits above Report Tables. Must run
   after every tile re-render, and before wiping #categoryTiles. */
function placeHubRangeSection() {
  var range = document.getElementById("hubRangeSection");
  var holder = document.getElementById("categoryTiles");
  if (!range || !holder) return;
  if (ACTIVE_CLUSTER === "tools") {
    if (!parkRangeInStickyChrome(range) && holder.parentElement) {
      holder.parentElement.insertBefore(range, holder);
    }
    return;
  }
  if (parkRangeInStickyChrome(range)) return;
  var allBar = document.getElementById("hubAnalyticsAllBar");
  if (allBar && allBar.classList.contains("is-active") && allBar.parentElement) {
    allBar.parentElement.insertBefore(range, allBar);
    return;
  }
  if (holder.parentElement) holder.parentElement.insertBefore(range, holder);
}

function renderCategoryTiles(query) {
  var holder = document.getElementById("categoryTiles");
  var noResults = document.getElementById("noResults");
  if (!holder) return;
  var range = document.getElementById("hubRangeSection");
  // Rescue the range node if a previous tools-tab render parked it inside
  // #categoryTiles — innerHTML replacement would otherwise delete it.
  if (range && holder.contains(range)) {
    if (!parkRangeInStickyChrome(range) && holder.parentElement) {
      holder.parentElement.insertBefore(range, holder);
    }
  }
  HUB_ACTIONS = {};
  var allSource = (HUB_CLUSTER_TILES[ACTIVE_CLUSTER] || []).filter(function (c) {
    return !c.hidden;
  });
  var source = allSource;
  var clusterMeta = HUB_CLUSTER_META[ACTIVE_CLUSTER] || HUB_CLUSTER_META.analytics;
  var clusterColor = clusterMeta.color || "#1f6fff";
  var clusterColorDark = clusterMeta.colorDark || clusterColor;
  var q = (query || "").trim().toLowerCase();
  var list = source.filter(function (c) {
    var mods = getCategoryModules(c);
    if (!q) return true;
    if (c.title.toLowerCase().indexOf(q) >= 0) return true;
    if ((c.subtitle || "").toLowerCase().indexOf(q) >= 0) return true;
    if ((c.section || "").toLowerCase().indexOf(q) >= 0) return true;
    var familyMeta = ANALYTICS_SECTION_META[getAnalyticsTileSectionId(c, allSource)];
    if (familyMeta && familyMeta.label.toLowerCase().indexOf(q) >= 0) return true;
    var toolsMeta = TOOLS_SECTION_META[getToolsTileSectionId(c, allSource)];
    if (toolsMeta && toolsMeta.label.toLowerCase().indexOf(q) >= 0) return true;
    return mods.some(function (m) { return m.label.toLowerCase().indexOf(q) >= 0; });
  });
  var html = "";
  var sectionOrder = ACTIVE_CLUSTER === "tools" ? TOOLS_SECTION_ORDER : ANALYTICS_FAMILY_ORDER;
  var searching = !!q;
  var openSet = getHubOpenSectionSet();
  sectionOrder.forEach(function (sectionId) {
    var familyTiles = list.filter(function (c) {
      if (ACTIVE_CLUSTER === "tools") return getToolsTileSectionId(c, allSource) === sectionId;
      return getAnalyticsTileSectionId(c, allSource) === sectionId;
    });
    if (!familyTiles.length) return;
    var tilesHtml = '<div class="category-modules">' + familyTiles.map(function (c) {
      var tabStyle = c.tabStyle === "soft" ? "soft" : "pill";
      var scopePrefix = ACTIVE_CLUSTER + ":" + c.id;
      var mods = getCategoryModules(c);
      return mods.map(function (m) {
        return renderCategoryModuleBtn(m, tabStyle, scopePrefix, mods.length === 1);
      }).join("");
    }).join("") + "</div>";
    html += renderHubAccordionPanel(sectionId, tilesHtml, searching || !!openSet[sectionId], familyTiles);
  });
  if (ACTIVE_CLUSTER === "tools") {
    var standaloneTiles = list.filter(function (c) { return !!c.standalone; });
    if (standaloneTiles.length) {
      var standaloneHtml = standaloneTiles.map(function (c) {
        var tabStyle = c.tabStyle === "soft" ? "soft" : "pill";
        var scopePrefix = ACTIVE_CLUSTER + ":" + c.id;
        var mods = getCategoryModules(c);
        return mods.map(function (m) {
          return renderCategoryModuleBtn(m, tabStyle, scopePrefix, mods.length === 1);
        }).join("");
      }).join("");
      html += '<div class="hub-standalone-command"><div class="category-modules">' + standaloneHtml + "</div></div>";
    }
  }
  holder.innerHTML = html;
  if (noResults) noResults.style.display = list.length ? "none" : "block";
  syncAnalyticsAllBar(q);
  placeHubRangeSection();
  bindCategoryInfoButtons(list);
}

function getToolsTileSectionId(tile, tiles) {
  var list = tiles || TOOLS_CATEGORY_TILES;
  if (tile && tile.sectionId) return tile.sectionId;
  var idx = list.indexOf(tile);
  for (var i = idx; i >= 0; i--) {
    if (list[i] && list[i].sectionId) return list[i].sectionId;
  }
  return "applications";
}

function getAnalyticsTileSectionId(tile, tiles) {
  var list = tiles || HUB_CATEGORY_TILES;
  if (tile && tile.sectionId) return tile.sectionId;
  var idx = list.indexOf(tile);
  for (var i = idx; i >= 0; i--) {
    if (list[i] && list[i].sectionId) return list[i].sectionId;
  }
  return "explore";
}

function loadStoredAnalyticsSection() {
  try {
    var stored = window.localStorage && window.localStorage.getItem(ANALYTICS_SECTION_STORAGE_KEY);
    if (stored === "all" || ANALYTICS_SECTION_META[stored]) return stored;
  } catch (_e) {}
  return "all";
}

function persistAnalyticsSection(sectionId) {
  try {
    if (window.localStorage) {
      window.localStorage.setItem(ANALYTICS_SECTION_STORAGE_KEY, sectionId);
    }
  } catch (_e) {}
}

function getAvailableAnalyticsSections() {
  var tiles = (HUB_CLUSTER_TILES.analytics || HUB_CATEGORY_TILES || []).filter(function (c) {
    return !c.hidden;
  });
  var present = {};
  tiles.forEach(function (tile) {
    present[getAnalyticsTileSectionId(tile, tiles)] = true;
  });
  return ANALYTICS_FAMILY_ORDER.filter(function (id) { return present[id]; });
}

function isAnalyticsAllView() {
  return ACTIVE_CLUSTER === "analytics";
}

function getHubOpenSectionSet() {
  if (!HUB_OPEN_SECTIONS[ACTIVE_CLUSTER]) HUB_OPEN_SECTIONS[ACTIVE_CLUSTER] = {};
  return HUB_OPEN_SECTIONS[ACTIVE_CLUSTER];
}

function toggleHubAccordion(sectionId) {
  if (!sectionId) return;
  var openSet = getHubOpenSectionSet();
  openSet[sectionId] = !openSet[sectionId];
  var panel = document.querySelector('.hub-accordion-panel[data-section="' + sectionId + '"]');
  if (!panel) return;
  var open = !!openSet[sectionId];
  panel.classList.toggle("is-open", open);
  var head = panel.querySelector(".hub-accordion-head");
  if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
  syncHubExpandAllButton();
}

function getHubVisibleSectionIds() {
  var allSource = (HUB_CLUSTER_TILES[ACTIVE_CLUSTER] || []).filter(function (c) {
    return !c.hidden;
  });
  var sectionOrder = ACTIVE_CLUSTER === "tools" ? TOOLS_SECTION_ORDER : ANALYTICS_FAMILY_ORDER;
  return sectionOrder.filter(function (sectionId) {
    return allSource.some(function (c) {
      if (ACTIVE_CLUSTER === "tools") return getToolsTileSectionId(c, allSource) === sectionId;
      return getAnalyticsTileSectionId(c, allSource) === sectionId;
    });
  });
}

function areAllVisibleHubSectionsOpen() {
  var openSet = getHubOpenSectionSet();
  var ids = getHubVisibleSectionIds();
  if (!ids.length) return false;
  return ids.every(function (id) { return !!openSet[id]; });
}

function syncHubExpandAllButton() {
  var btn = document.getElementById("hubExpandAllBtn");
  var label = document.getElementById("hubExpandAllBtnLabel");
  var icon = btn && btn.querySelector("i");
  var allOpen = areAllVisibleHubSectionsOpen();
  if (label) label.textContent = allOpen ? "Collapse All" : "Expand All";
  if (icon) icon.className = allOpen ? "fa-solid fa-angles-up" : "fa-solid fa-angles-down";
  if (btn) {
    btn.setAttribute("aria-label", allOpen ? "Collapse all sections" : "Expand all sections");
    btn.setAttribute("data-st-tip", allOpen ? "Collapse all sections" : "Expand all sections");
  }
}

function toggleHubExpandAll() {
  var expand = !areAllVisibleHubSectionsOpen();
  var openSet = getHubOpenSectionSet();
  getHubVisibleSectionIds().forEach(function (id) {
    openSet[id] = expand;
  });
  var input = document.getElementById("hubSearch");
  renderCategoryTiles(input ? input.value : "");
  if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === "function") {
    window.StatisticoTooltip.refresh();
  }
}

function getAccordionModuleNames(tiles) {
  var names = [];
  var seen = {};
  (tiles || []).forEach(function (c) {
    var mods = getCategoryModules(c);
    if (mods.length) {
      mods.forEach(function (m) {
        var label = (m && m.label) || "";
        if (!label || seen[label]) return;
        seen[label] = true;
        names.push(label);
      });
    } else if (c.title && !seen[c.title]) {
      seen[c.title] = true;
      names.push(c.title);
    }
  });
  return names;
}

function renderHubAccordionPanel(sectionId, tilesHtml, open, tiles) {
  var meta = ACTIVE_CLUSTER === "tools" ? TOOLS_SECTION_META[sectionId] : ANALYTICS_SECTION_META[sectionId];
  if (!meta) return tilesHtml || "";
  var names = getAccordionModuleNames(tiles);
  var tipText = names.length
    ? meta.label + "\n" + names.map(function (n) { return "| " + n; }).join("\n")
    : (meta.subtitle || meta.label);
  var tipHtml =
    '<span class="st-tt-title">' + escapeHtml(meta.label) + "</span>" +
    '<span class="st-tt-body">' +
    (names.length
      ? names.map(function (n) { return "| " + escapeHtml(n); }).join("<br>")
      : escapeHtml(meta.subtitle || meta.label)) +
    "</span>";
  return (
    '<div class="hub-accordion-panel' + (open ? " is-open" : "") + '" data-section="' + escapeHtml(sectionId) + '"' +
    ' style="--section-color:' + escapeHtml(meta.color) + ';">' +
    '<button type="button" class="hub-accordion-head" aria-expanded="' + (open ? "true" : "false") + '"' +
    ' aria-label="' + escapeHtml(meta.label) + '"' +
    ' data-st-tip="' + escapeHtml(tipText) + '"' +
    ' data-st-tip-html="' + tipHtml.replace(/"/g, "&quot;") + '"' +
    ' onclick="toggleHubAccordion(\'' + sectionId + '\')">' +
    '<span class="hub-accordion-icon"><i class="fa-solid ' + escapeHtml(meta.icon) + '" aria-hidden="true"></i></span>' +
    '<span class="hub-accordion-copy">' +
    '<span class="hub-accordion-title">' + escapeHtml(meta.label) + "</span>" +
    (meta.subtitle ? '<span class="hub-accordion-desc">' + escapeHtml(meta.subtitle).replace(/\n/g, "<br>") + "</span>" : "") +
    "</span>" +
    '<i class="fa-solid fa-chevron-down hub-accordion-caret" aria-hidden="true"></i>' +
    "</button>" +
    '<div class="hub-accordion-body">' + (tilesHtml || "") + "</div>" +
    "</div>"
  );
}

function syncAnalyticsAllBar(query) {
  var bar = document.getElementById("hubAnalyticsAllBar");
  var input = document.getElementById("hubSearch");
  if (bar) {
    bar.classList.add("is-active");
    bar.hidden = false;
  }
  if (input) {
    input.placeholder = ACTIVE_CLUSTER === "tools" ? "Search tools…" : "Search analyses…";
    if (typeof query === "string") input.value = query;
  }
  syncHubExpandAllButton();
}

function renderAnalyticsSectionHeader(sectionId, withDivider) {
  var meta = ANALYTICS_SECTION_META[sectionId];
  if (!meta) return "";
  return (
    '<div class="category-section-header' + (withDivider ? " with-divider" : "") + '"' +
    ' style="--section-color:' + escapeHtml(meta.color) + ';">' +
    '<div class="category-section-title">' + escapeHtml(meta.label) + "</div>" +
    (meta.subtitle ? '<div class="category-section-subtitle">' + escapeHtml(meta.subtitle) + "</div>" : "") +
    "</div>"
  );
}

function renderToolsSectionHeader(sectionId, withDivider) {
  var meta = TOOLS_SECTION_META[sectionId];
  if (!meta) return "";
  return (
    '<div class="category-section-header' + (withDivider ? " with-divider" : "") + '"' +
    ' style="--section-color:' + escapeHtml(meta.color) + ';">' +
    '<div class="category-section-title">' + escapeHtml(meta.label) + "</div>" +
    (meta.subtitle ? '<div class="category-section-subtitle">' + escapeHtml(meta.subtitle) + "</div>" : "") +
    "</div>"
  );
}

function renderCategoryTileHtml(c, clusterColor, clusterColorDark) {
  var color = c.accent || clusterColor;
  var colorDark = c.accentDark || clusterColorDark;
  var icon = c.icon || "fa-table-cells-large";
  var iconContent = c.iconSvg
    ? c.iconSvg
    : '<i class="fa-solid ' + escapeHtml(icon) + '"></i>';
  return (
    '<div class="category-tile" data-tile-id="' + escapeHtml(c.id) + '" style="--cat-color:' + escapeHtml(color) + ";--cat-color-dark:" + escapeHtml(colorDark) + ';">' +
    '<div class="category-title-row">' +
    '<div class="category-icon">' + iconContent + '</div>' +
    '<div class="category-title">' + escapeHtml(c.title) + "</div>" +
    '<button type="button" class="category-info-btn" data-tile-info="' + escapeHtml(c.id) + '" title="About this module" aria-label="About ' + escapeHtml(c.title) + '">i</button>' +
    "</div>" +
    '<div class="category-subtitle">' + escapeHtml(c.subtitle) + "</div>" +
    renderCategoryGroups(c, ACTIVE_CLUSTER + ":" + c.id) +
    "</div>"
  );
}

function findHubCategoryTile(tileId) {
  var clusters = [PREPARE_CATEGORY_TILES, HUB_CATEGORY_TILES, TOOLS_CATEGORY_TILES];
  for (var i = 0; i < clusters.length; i++) {
    var found = (clusters[i] || []).find(function (c) { return c.id === tileId; });
    if (found) return found;
  }
  return null;
}

function bindCategoryInfoButtons(list) {
  var holder = document.getElementById("categoryTiles");
  if (!holder) return;
  holder.querySelectorAll(".category-info-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var tileId = btn.getAttribute("data-tile-info");
      var tile = (list || []).find(function (c) { return c.id === tileId; }) || findHubCategoryTile(tileId);
      if (!tile) return;
      showPopup({
        icon: tile.icon || "fa-circle-info",
        name: tile.title,
        desc: tile.desc || tile.subtitle || "",
        info: tile.info || []
      }, btn);
    });
  });
}

function getCategoryModules(category) {
  if (Array.isArray(category.modules)) return category.modules;
  if (Array.isArray(category.subgroups)) {
    return category.subgroups.reduce(function (all, g) {
      return all.concat(Array.isArray(g.modules) ? g.modules : []);
    }, []);
  }
  return [];
}

function renderCategoryGroups(category, scopePrefix) {
  var tabStyle = category.tabStyle === "soft" ? "soft" : "pill";
  if (Array.isArray(category.subgroups) && category.subgroups.length) {
    return category.subgroups.map(function (g, idx) {
      var mods = g.modules || [];
      return (
        '<div class="category-subgroup' + (idx > 0 ? " with-divider" : "") + '">' +
        '<div class="category-subgroup-label">' + escapeHtml(g.label || "") + "</div>" +
        '<div class="category-modules">' +
        (mods.map(function (m) { return renderCategoryModuleBtn(m, tabStyle, scopePrefix, mods.length === 1); }).join("")) +
        "</div></div>"
      );
    }).join("");
  }
  var mods = getCategoryModules(category);
  return '<div class="category-modules">' + mods.map(function (m) { return renderCategoryModuleBtn(m, tabStyle, scopePrefix, mods.length === 1); }).join("") + "</div>";
}

function renderCategoryModuleBtn(m, tabStyle, scopePrefix, fullWidth) {
  var tip = m.tip || m.label;
  var styleClass = tabStyle === "soft" ? " category-module-btn--soft" : "";
  if (m.comingSoon) styleClass += " category-module-btn--soon";
  if (fullWidth) styleClass += " category-module-btn--full";
  var actionKey = (String(scopePrefix || "scope") + ":" + String(m.id || "item")).replace(/[^a-zA-Z0-9:_-]/g, "-");
  HUB_ACTIONS[actionKey] = m;
  var soonMark = m.comingSoon ? ' <span class="soon-badge">Soon</span>' : "";
  return '<button class="category-module-btn' + styleClass + '" data-module-id="' + escapeHtml(m.id) + '" data-st-tip="' + escapeHtml(tip) + '" onclick="runHubModuleAction(\'' + escapeHtml(actionKey) + '\')"><span class="category-module-label">' + escapeHtml(m.label) + soonMark + '</span><i class="fa-solid fa-chevron-right category-module-chevron" aria-hidden="true"></i></button>';
}

var GROUP_COLORS = {
  descriptive: { color: "#f97316", bg: "rgba(249,115,22,.1)" },
  comparisons: { color: "#10b981", bg: "rgba(16,185,129,.1)" },
  multivariate: { color: "#8b5cf6", bg: "rgba(139,92,246,.1)" },
  reporting: { color: "#eab308", bg: "rgba(234,179,8,.1)" }
};

function makeCard(m) {
  const div = document.createElement("div");
  div.className = "module-card";
  div.setAttribute("data-module-id", m.id);
  div.onclick = function() { navigateToModule(m.id); };
  var gc = GROUP_COLORS[m.group] || GROUP_COLORS.descriptive;
  var iconBg = gc.bg;
  var iconColor = gc.color;
  var wrapSt = ' style="background:' + iconBg + ' !important"';
  var iSt = ' style="color:' + iconColor + ' !important"';
  div.innerHTML =
    '<div class="module-icon"' + wrapSt + ">" +
    '  <i class="fa-solid ' + m.icon + '"' + iSt + "></i>" +
    "</div>" +
    '<div class="module-name">' + escapeHtml(m.name) + "</div>" +
    '<button class="mod-info-btn" type="button" title="What\'s included">i</button>' +
    '<i class="fa-solid fa-chevron-right module-arrow"></i>';

  div.querySelector(".mod-info-btn").addEventListener("click", function(e) {
    e.stopPropagation();
    showPopup(m, this);
  });
  return div;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const popup = document.getElementById("infoPopup");
const popupScrim = document.getElementById("infoPopupScrim");
const popupClose = document.getElementById("popupClose");
const ptitle = document.getElementById("popupTitle");
const plist = document.getElementById("popupList");
let _activeBtn = null;
let _activePopupKey = null;

function popupKeyFor(btn) {
  if (!btn || !btn.getAttribute) return null;
  return btn.getAttribute("data-tile-info") || btn.getAttribute("data-module-id") || null;
}

function showPopup(m, btn) {
  var key = popupKeyFor(btn);
  var alreadyOpen = popup && popup.classList.contains("open");
  var sameTarget = (key && key === _activePopupKey) || (!key && _activeBtn === btn);
  if (alreadyOpen && sameTarget) {
    closePopup();
    return;
  }
  _activeBtn = btn;
  _activePopupKey = key;
  if (ptitle) {
    ptitle.innerHTML =
      '<i class="fa-solid ' + m.icon + '" style="color:var(--accent-1);font-size:11px;"></i> ' + escapeHtml(m.name);
  }
  const pdesc = document.getElementById("popupDesc");
  if (pdesc) pdesc.textContent = m.desc || "";
  if (plist) {
    plist.innerHTML = (m.info || []).map(function(b) { return "<li>" + escapeHtml(b) + "</li>"; }).join("");
  }
  if (popup && btn) {
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = 260;
    let left = r.right - W;
    if (left < 6) left = 6;
    if (left + W > vw - 6) left = vw - W - 6;
    popup.style.left = left + "px";
    popup.style.top = (r.bottom + 5) + "px";
    popup.classList.add("open");
    var popupH = popup.offsetHeight || 0;
    if (r.bottom + 5 + popupH > vh - 8) {
      var above = r.top - popupH - 5;
      popup.style.top = Math.max(8, above) + "px";
    }
    if (popupScrim) {
      popupScrim.classList.add("open");
      popupScrim.setAttribute("aria-hidden", "false");
    }
  }
}

function closePopup() {
  if (popup) popup.classList.remove("open");
  if (popupScrim) {
    popupScrim.classList.remove("open");
    popupScrim.setAttribute("aria-hidden", "true");
  }
  _activeBtn = null;
  _activePopupKey = null;
}

document.addEventListener("click", function(e) {
  if (!popup || !popup.classList.contains("open")) return;
  if (popup.contains(e.target)) return;
  if (e.target && e.target.closest && (
    e.target.closest(".category-info-btn") || e.target.closest(".mod-info-btn")
  )) return;
  closePopup();
});
if (popupScrim) {
  popupScrim.addEventListener("click", function () { closePopup(); });
}
if (popupClose) {
  popupClose.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    closePopup();
  });
}

function filterModules(q) {
  renderCategoryTiles(q || "");
  if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === "function") {
    window.StatisticoTooltip.refresh();
  }
}

function getHubScopeName() {
  try {
    var params = new URLSearchParams(window.location.search || "");
    var scope = (params.get("scope") || "").trim();
    return scope || null;
  } catch (e) {
    return null;
  }
}

function applyHubScopeConfig(scopeCfg) {
  if (!scopeCfg || typeof scopeCfg !== "object") return;
  if (scopeCfg.clusterTiles && typeof scopeCfg.clusterTiles === "object") {
    HUB_CLUSTER_TILES = scopeCfg.clusterTiles;
  }
  if (scopeCfg.clusterMeta && typeof scopeCfg.clusterMeta === "object") {
    HUB_CLUSTER_META = scopeCfg.clusterMeta;
  }
  if (Array.isArray(scopeCfg.visibleClusters) && scopeCfg.visibleClusters.length) {
    HUB_VISIBLE_CLUSTERS = scopeCfg.visibleClusters.slice();
  } else {
    HUB_VISIBLE_CLUSTERS = Object.keys(HUB_CLUSTER_TILES);
  }
  if (Array.isArray(scopeCfg.rangeVisibleClusters)) {
    HUB_RANGE_VISIBLE_CLUSTERS = scopeCfg.rangeVisibleClusters.slice();
  }
  document.querySelectorAll(".hub-nav-tab[data-cluster]").forEach(function (btn) {
    var clusterId = btn.getAttribute("data-cluster");
    var visible = HUB_VISIBLE_CLUSTERS.indexOf(clusterId) >= 0;
    var wrap = btn.closest ? btn.closest(".hub-nav-tools-wrap") : null;
    if (wrap) wrap.style.display = visible ? "" : "none";
    else btn.style.display = visible ? "" : "none";
  });
  if (HUB_VISIBLE_CLUSTERS.indexOf(ACTIVE_CLUSTER) < 0) {
    ACTIVE_CLUSTER = HUB_VISIBLE_CLUSTERS[0] || "analytics";
  }
  var available = getAvailableAnalyticsSections();
  if (ACTIVE_ANALYTICS_SECTION !== "all" && available.indexOf(ACTIVE_ANALYTICS_SECTION) < 0) {
    ACTIVE_ANALYTICS_SECTION = available[0] || "all";
  }
}

function loadHubScopeConfigIfAny() {
  var scopeName = getHubScopeName();
  if (!scopeName) return Promise.resolve();
  var scopeUrl = new URL("hub-scopes/" + encodeURIComponent(scopeName) + ".json", window.location.href);
  scopeUrl.searchParams.set("v", String(Date.now()));
  return fetch(scopeUrl.toString(), { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (cfg) {
      applyHubScopeConfig(cfg || {});
    })
    .catch(function (err) {
      console.warn("Hub scope load failed:", err);
    });
}

function syncClusterHeader() {
  var meta = HUB_CLUSTER_META[ACTIVE_CLUSTER] || HUB_CLUSTER_META.analytics;
  var tabAccent = ACTIVE_CLUSTER === "tools" ? "#F4C84A" : "#b49cff";
  document.documentElement.setAttribute("data-hub-cluster", ACTIVE_CLUSTER);
  document.documentElement.style.setProperty("--hub-tab-accent", tabAccent);
  document.documentElement.style.setProperty("--hub-brand-color", meta.colorDark || meta.color || "#f97316");
  document.documentElement.style.setProperty("--hub-brand-from", meta.brandFrom || meta.color || "#f97316");
  document.documentElement.style.setProperty("--hub-brand-to", meta.brandTo || meta.colorDark || meta.color || "#ea580c");
  document.querySelectorAll(".hub-nav-tab[data-cluster]").forEach(function (btn) {
    var active = btn.getAttribute("data-cluster") === ACTIVE_CLUSTER;
    btn.classList.toggle("active", active);
    if (active) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  var range = document.getElementById("hubRangeSection");
  var advisor = document.getElementById("advisorStrip");
  var showRange = HUB_RANGE_VISIBLE_CLUSTERS.indexOf(ACTIVE_CLUSTER) >= 0;
  if (ACTIVE_CLUSTER === "tools") {
    showRange = ACTIVE_TOOLS_SECTION === "all" || TOOLS_RANGE_SECTIONS.indexOf(ACTIVE_TOOLS_SECTION) >= 0;
  }
  var showAdvisor = HUB_ADVISOR_VISIBLE_CLUSTERS.indexOf(ACTIVE_CLUSTER) >= 0;
  if (range) range.style.display = showRange ? "" : "none";
  if (advisor) advisor.style.display = showAdvisor ? "" : "none";
  syncHubToolsMenuSelection();
  syncHubAnalyticsMenuSelection();
  syncAnalyticsAllBar();
  // Range placement is handled by renderCategoryTiles (called via filterModules
  // after every cluster switch) so the node isn't parked against stale tiles.
}

function isHubToolsMenuOpen() {
  var menu = document.getElementById("hubToolsMenu");
  return !!(menu && menu.classList.contains("open"));
}

function openHubToolsMenu() {
  var menu = document.getElementById("hubToolsMenu");
  var btn = document.querySelector('.hub-nav-tab[data-cluster="tools"]');
  if (!menu) return;
  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
  if (btn) {
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("menu-open");
  }
  syncHubToolsMenuSelection();
}

function closeHubToolsMenu() {
  var menu = document.getElementById("hubToolsMenu");
  var btn = document.querySelector('.hub-nav-tab[data-cluster="tools"]');
  if (!menu) return;
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
  if (btn) {
    btn.setAttribute("aria-expanded", "false");
    btn.classList.remove("menu-open");
  }
}

function syncHubToolsMenuSelection() {
  var menu = document.getElementById("hubToolsMenu");
  if (!menu) return;
  menu.querySelectorAll("[data-tools-section]").forEach(function (item) {
    var on = item.getAttribute("data-tools-section") === ACTIVE_TOOLS_SECTION;
    item.classList.toggle("active", on);
    if (on) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  });
}

function toggleHubToolsMenu(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  closeHubAnalyticsMenu();
  var wasOpen = isHubToolsMenuOpen();
  if (ACTIVE_CLUSTER !== "tools") {
    setHubCluster("tools");
    openHubToolsMenu();
    return;
  }
  if (wasOpen) closeHubToolsMenu();
  else openHubToolsMenu();
}

function setHubToolsSection(sectionId) {
  if (sectionId !== "all" && !TOOLS_SECTION_META[sectionId]) return;
  ACTIVE_TOOLS_SECTION = sectionId;
  ACTIVE_CLUSTER = "tools";
  closeHubToolsMenu();
  closeHubAnalyticsMenu();
  syncClusterHeader();
  closePopup();
  filterModules("");
}

function isHubAnalyticsMenuOpen() {
  var menu = document.getElementById("hubAnalyticsMenu");
  return !!(menu && menu.classList.contains("open"));
}

function openHubAnalyticsMenu() {
  var menu = document.getElementById("hubAnalyticsMenu");
  var btn = document.querySelector('.hub-nav-tab[data-cluster="analytics"]');
  if (!menu) return;
  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
  if (btn) {
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("menu-open");
  }
  syncHubAnalyticsMenuSelection();
}

function closeHubAnalyticsMenu() {
  var menu = document.getElementById("hubAnalyticsMenu");
  var btn = document.querySelector('.hub-nav-tab[data-cluster="analytics"]');
  if (!menu) return;
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
  if (btn) {
    btn.setAttribute("aria-expanded", "false");
    btn.classList.remove("menu-open");
  }
}

function syncHubAnalyticsMenuSelection() {
  var menu = document.getElementById("hubAnalyticsMenu");
  if (!menu) return;
  var available = getAvailableAnalyticsSections();
  menu.querySelectorAll("[data-analytics-section]").forEach(function (item) {
    var id = item.getAttribute("data-analytics-section");
    var on = id === ACTIVE_ANALYTICS_SECTION;
    item.classList.toggle("active", on);
    if (on) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
    if (id === "all") {
      item.style.display = "";
      return;
    }
    item.style.display = available.indexOf(id) >= 0 ? "" : "none";
  });
}

function toggleHubAnalyticsMenu(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  closeHubToolsMenu();
  var wasOpen = isHubAnalyticsMenuOpen();
  if (ACTIVE_CLUSTER !== "analytics") {
    setHubCluster("analytics");
    openHubAnalyticsMenu();
    return;
  }
  if (wasOpen) closeHubAnalyticsMenu();
  else openHubAnalyticsMenu();
}

function setHubAnalyticsSection(sectionId) {
  if (sectionId !== "all" && !ANALYTICS_SECTION_META[sectionId]) return;
  ACTIVE_ANALYTICS_SECTION = sectionId;
  ACTIVE_CLUSTER = "analytics";
  persistAnalyticsSection(sectionId);
  closeHubAnalyticsMenu();
  closeHubToolsMenu();
  syncClusterHeader();
  closePopup();
  filterModules("");
}

function setHubCluster(clusterId) {
  if (!HUB_CLUSTER_TILES[clusterId]) return;
  ACTIVE_CLUSTER = clusterId;
  if (clusterId !== "tools") closeHubToolsMenu();
  if (clusterId !== "analytics") closeHubAnalyticsMenu();
  syncClusterHeader();
  closePopup();
  filterModules("");
}

function openExternalDialogUrl(url, options) {
  if (!url) return;
  var dialogUrl = String(url);
  dialogUrl += (dialogUrl.indexOf("?") >= 0 ? "&" : "?") + "fromHub=1&cb=" + Date.now();
  var opts = options || DIALOG_SIZES.RESULTS;
  if (!Office || !Office.context || !Office.context.ui || typeof Office.context.ui.displayDialogAsync !== "function") {
    window.open(dialogUrl, "_blank");
    return;
  }
  Office.context.ui.displayDialogAsync(dialogUrl, opts, function (res) {
    if (res.status === Office.AsyncResultStatus.Failed) {
      console.error("Failed to open external dialog:", res.error && res.error.message);
    }
  });
}

function runHubModuleAction(actionKey) {
  dismissHubButtonTooltips();
  var module = HUB_ACTIONS[actionKey];
  if (!module) return;
  if (module.comingSoon) {
    window.alert((module.label || "This module") + " is coming soon.");
    return;
  }
  if (module.browserUrl) {
    dismissAllHubDialogs();
    window.open(module.browserUrl, "_blank");
    return;
  }
  if (module.dialogUrl) {
    dismissAllHubDialogs();
    openExternalDialogUrl(module.dialogUrl, module.dialogOptions);
    return;
  }
  navigateToModule(module.id);
}

function dismissHubButtonTooltips() {
  try {
    document.querySelectorAll(".category-module-btn").forEach(function (btn) {
      btn.blur();
    });
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  } catch (_e) {}
}

function getDialogsBaseUrl() {
  var href = window.location.href;
  if (href.includes("/taskpane/")) return href.split("/taskpane/")[0] + "/dialogs/views/";
  return window.location.origin + "/dialogs/views/";
}

function getGlobalRangePayload() {
  try {
    if (!window.StatisticoGlobalRange || typeof StatisticoGlobalRange.load !== "function") return null;
    var gr = StatisticoGlobalRange.load();
    if (!gr || !gr.values || !Array.isArray(gr.values) || gr.values.length < 2) return null;
    return gr;
  } catch (e) {
    return null;
  }
}

function setSelectedModuleCard(moduleId, active) {
  document.querySelectorAll('[data-module-id="' + moduleId + '"]').forEach(function (el) {
    el.classList.toggle("selected", !!active);
  });
}

function finishHubUnivariateFlow() {
  hubUnivariateFlowActive = false;
  if (!hubConfigDialog && !(window.HubResultsBridge && HubResultsBridge.hasActive())) {
    setSelectedModuleCard(hubUnivariateModuleId, false);
    hubUnivariateModuleId = "univariate";
    hubUnivariateStartView = null;
  }
}

function finishHubRegressionFlow() {
  hubRegressionFlowActive = false;
  hubRegressionModelSpec = null;
  hubRegressionDataPayload = null;
  if (!hubRegressionConfigDialog && !hubRegressionResultsDialog) setSelectedModuleCard("regression", false);
}

function finishHubAnovaFlow() {
  hubAnovaFlowActive = false;
  if (!hubAnovaDialog && !(window.HubResultsBridge && HubResultsBridge.hasActive())) {
    setSelectedModuleCard("anova", false);
  }
}

function finishHubIndependentFlow() {
  hubIndependentFlowActive = false;
  if (!hubIndependentDialog && !(window.HubResultsBridge && HubResultsBridge.hasActive())) {
    setSelectedModuleCard("independent", false);
  }
}

function finishHubCorrelationFlow() {
  hubCorrelationFlowActive = false;
  if (!hubCorrelationDialog && !hubCorrelationResultsDialog) setSelectedModuleCard("correlations", false);
}

function buildHubCorrelationMatrixData(runData, gr) {
  var data = runData || {};
  var dataValues = (data.data && data.data.values) || (gr && gr.values) || [];
  if (!dataValues || dataValues.length < 2) return null;
  var headers = dataValues[0] || [];
  var rows = dataValues.slice(1);
  var dataObjects = rows.map(function (row) {
    var obj = {};
    headers.forEach(function (header, idx) { obj[header] = row[idx]; });
    return obj;
  });
  var selectedVars = data.variables || headers;
  return {
    data: dataObjects,
    headers: selectedVars,
    selectedVariables: selectedVars,
    method: data.method || "pearson",
    address: (data.data && data.data.address) || (gr && gr.address) || "",
    sourceHeaders: headers,
    sourceRowsAll: rows,
    sourceRows: rows
  };
}

function sendHubCorrelationResultsData() {
  if (!hubCorrelationResultsDialog || !hubCorrelationMatrixData) return;
  var m = hubCorrelationMatrixData;
  hubCorrelationResultsDialog.messageChild(JSON.stringify({
    type: "CORRELATION_DATA",
    payload: {
      data: m.data,
      headers: m.headers,
      selectedVariables: m.selectedVariables,
      method: m.method,
      address: m.address,
      sourceHeaders: m.sourceHeaders,
      sourceRowsAll: m.sourceRowsAll,
      sourceRows: m.sourceRows
    }
  }));
}

function openHubCorrelationResultsAt(dialogUrl) {
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    DIALOG_SIZES.RESULTS_CORRELATION,
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        console.error("Could not open correlation results:", res.error && res.error.message);
        finishHubCorrelationFlow();
        return;
      }
      var dialog = res.value;
      hubCorrelationResultsDialog = dialog;
      if (window.HubResultsBridge) HubResultsBridge.registerDialog(dialog);
      var onClosed = function () {
        hubCorrelationResultsDialog = null;
        if (hubPendingCorrelationViewUrl && hubCorrelationMatrixData) {
          var next = hubPendingCorrelationViewUrl;
          hubPendingCorrelationViewUrl = null;
          setTimeout(function () { openHubCorrelationResultsAt(next); }, 120);
          return;
        }
        finishHubCorrelationFlow();
      };
      if (window.StatisticoDialogHost) {
        StatisticoDialogHost.onUserClosed(dialog, onClosed);
      }
      dialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready") sendHubCorrelationResultsData();
          else if (msg.action === "switchView" && msg.view) {
            queueHubCorrelationViewSwitch(msg.view);
          } else if (msg.action === "close" || msg.action === "closeDialog") {
            if (window.StatisticoDialogHost) {
              StatisticoDialogHost.closeFromMessage(dialog, onClosed);
            } else {
              dialog.close();
              onClosed();
            }
          }
        } catch (e) {}
      });
      if (!window.StatisticoDialogHost) {
        dialog.addEventHandler(Office.EventType.DialogEventReceived, onClosed);
      }
      setTimeout(sendHubCorrelationResultsData, 1100);
    }
  );
}

function queueHubCorrelationViewSwitch(viewPath) {
  hubPendingCorrelationViewUrl = getDialogsBaseUrl() + viewPath;
  if (hubCorrelationResultsDialog) {
    try { hubCorrelationResultsDialog.close(); } catch (e) {}
    return;
  }
  if (hubPendingCorrelationViewUrl && hubCorrelationMatrixData) {
    var target = hubPendingCorrelationViewUrl;
    hubPendingCorrelationViewUrl = null;
    openHubCorrelationResultsAt(target);
  }
}

function openCorrelationResultsFromHub(runData) {
  var gr = getGlobalRangePayload();
  var matrixData = buildHubCorrelationMatrixData(runData, gr);
  if (!matrixData) {
    finishHubCorrelationFlow();
    return;
  }
  hubCorrelationMatrixData = matrixData;
  try { sessionStorage.setItem("correlationMatrixData", JSON.stringify(matrixData)); } catch (e) {}
  openHubCorrelationResultsAt(getDialogsBaseUrl() + "correlations/correlation-matrix-v2.html?v=" + Date.now());
}

function sendUnivariateDialogData() {
  var gr = getGlobalRangePayload();
  if (!hubConfigDialog || !gr) return;
  var headers = gr.values[0] || [];
  var rows = gr.values.slice(1);
  // Always open the builder fresh.
  hubConfigDialog.messageChild(JSON.stringify({
    type: "UNIVARIATE_DATA",
    payload: { headers: headers, rows: rows, address: gr.address || "", savedSpec: null }
  }));
}

function openUnivariateConfigFromHub(moduleId, startView) {
  var gr = getGlobalRangePayload() || { values: [], address: "", mode: "used" };
  hubUnivariateModuleId = moduleId || "univariate";
  hubUnivariateStartView = startView || null;
  hubUnivariateFlowActive = true;
  setSelectedModuleCard(hubUnivariateModuleId, true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "univariate/univariate-input.html?v=" + Date.now(),
    DIALOG_SIZES.REGRESSION_BUILDER,
    function (asyncResult) {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error("Failed to open univariate config dialog:", asyncResult.error && asyncResult.error.message);
        finishHubUnivariateFlow();
        return;
      }
      hubConfigDialog = asyncResult.value;
      setTimeout(sendUnivariateDialogData, 550);
      hubConfigDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var message = JSON.parse(arg.message || "{}");
          if (message.action === "ready" || message.action === "requestData") {
            sendUnivariateDialogData();
          } else if (message.action === "univariateResults" && message.data) {
            var runSpec = Object.assign({}, message.spec || {});
            if (hubUnivariateStartView) runSpec.startView = hubUnivariateStartView;
            try {
              sessionStorage.setItem("univariateHubRunData", JSON.stringify({
                data: message.data,
                spec: runSpec
              }));
              sessionStorage.setItem("univariateModelSpec", JSON.stringify(runSpec));
            } catch (e) {}
            try { hubConfigDialog.close(); } catch (e2) {}
            hubConfigDialog = null;
            if (window.HubResultsBridge) HubResultsBridge.open(hubUnivariateModuleId, 500);
          } else if (message.action === "close") {
            try { hubConfigDialog.close(); } catch (e) {}
            hubConfigDialog = null;
            finishHubUnivariateFlow();
          }
        } catch (e) {}
      });
      hubConfigDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubConfigDialog = null;
        if (!window.HubResultsBridge || !HubResultsBridge.hasActive()) finishHubUnivariateFlow();
      });
    }
  );
  return true;
}

function sendRegressionBuilderDataFromHub() {
  if (!hubRegressionConfigDialog || !hubRegressionDataPayload) return;
  hubRegressionConfigDialog.messageChild(JSON.stringify({
    type: "REGRESSION_DATA",
    payload: hubRegressionDataPayload
  }));
}

function sendRegressionResultsDataFromHub() {
  if (!hubRegressionResultsDialog || !hubRegressionDataPayload) return;
  hubRegressionResultsDialog.messageChild(JSON.stringify({
    type: "REGRESSION_RESULTS",
    payload: {
      headers: hubRegressionDataPayload.headers || [],
      rows: hubRegressionDataPayload.rows || [],
      address: hubRegressionDataPayload.address || "",
      modelSpec: hubRegressionModelSpec || {}
    }
  }));
}

function openRegressionResultsFromHub() {
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "regression/regression-coefficients.html?cb=" + Date.now(),
    DIALOG_SIZES.RESULTS,
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        console.error("Could not open regression results:", res.error && res.error.message);
        finishHubRegressionFlow();
        return;
      }
      hubRegressionResultsDialog = res.value;
      hubRegressionResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") sendRegressionResultsDataFromHub();
          else if (msg.action === "close") {
            hubRegressionResultsDialog.close();
            hubRegressionResultsDialog = null;
            finishHubRegressionFlow();
          }
        } catch (e) {}
      });
      hubRegressionResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubRegressionResultsDialog = null;
        finishHubRegressionFlow();
      });
      setTimeout(sendRegressionResultsDataFromHub, 1200);
    }
  );
}

function openRegressionConfigFromHub() {
  var gr = getGlobalRangePayload() || { values: [], address: "", mode: "used" };
  hubRegressionDataPayload = {
    headers: gr.values[0] || [],
    rows: gr.values.slice(1),
    address: gr.address || "",
    savedModelSpec: null
  };
  hubRegressionFlowActive = true;
  setSelectedModuleCard("regression", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "regression/regression-input.html?v=" + Date.now(),
    DIALOG_SIZES.REGRESSION_BUILDER,
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        console.error("Could not open regression config:", res.error && res.error.message);
        finishHubRegressionFlow();
        return;
      }
      hubRegressionConfigDialog = res.value;
      setTimeout(sendRegressionBuilderDataFromHub, 600);
      setTimeout(sendRegressionBuilderDataFromHub, 1200);
      setTimeout(sendRegressionBuilderDataFromHub, 2000);
      hubRegressionConfigDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendRegressionBuilderDataFromHub();
          } else if (msg.action === "regressionModel") {
            hubRegressionModelSpec = msg.payload || msg.data || {};
            hubRegressionConfigDialog.close();
            hubRegressionConfigDialog = null;
            setTimeout(openRegressionResultsFromHub, 500);
          } else if (msg.action === "close") {
            hubRegressionConfigDialog.close();
            hubRegressionConfigDialog = null;
            finishHubRegressionFlow();
          }
        } catch (e) {}
      });
      hubRegressionConfigDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubRegressionConfigDialog = null;
        if (!hubRegressionResultsDialog) finishHubRegressionFlow();
      });
    }
  );
  return true;
}

function openAnovaConfigFromHub() {
  var gr = getGlobalRangePayload() || { values: [], address: "", mode: "used" };
  hubAnovaFlowActive = true;
  setSelectedModuleCard("anova", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "anova/anova-input.html?v=" + Date.now(),
    DIALOG_SIZES.REGRESSION_BUILDER,
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        finishHubAnovaFlow();
        return;
      }
      hubAnovaDialog = res.value;
      var sendAnovaData = function () {
        if (!hubAnovaDialog || !gr) return;
        // Always open the builder fresh.
        hubAnovaDialog.messageChild(JSON.stringify({
          type: "ANOVA_DATA",
          payload: {
            headers: gr.values[0] || [],
            rows: gr.values.slice(1),
            address: gr.address || "",
            savedModelSpec: null
          }
        }));
      };
      setTimeout(sendAnovaData, 550);
      hubAnovaDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendAnovaData();
          } else if (msg.action === "anovaModel") {
            sessionStorage.setItem("anovaModelSpec", JSON.stringify(msg.data || msg.payload || {}));
            try { hubAnovaDialog.close(); } catch (e) {}
            hubAnovaDialog = null;
            if (window.HubResultsBridge) HubResultsBridge.open("anova", 500);
          } else if (msg.action === "close") {
            try { hubAnovaDialog.close(); } catch (e) {}
            hubAnovaDialog = null;
            finishHubAnovaFlow();
          }
        } catch (e) {}
      });
      hubAnovaDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubAnovaDialog = null;
        if (!window.HubResultsBridge || !HubResultsBridge.hasActive()) finishHubAnovaFlow();
      });
    }
  );
  return true;
}

function openIndependentConfigFromHub() {
  var gr = getGlobalRangePayload() || { values: [], address: "", mode: "used" };
  hubIndependentFlowActive = true;
  setSelectedModuleCard("independent", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "independent/independent-input.html?v=" + Date.now(),
    DIALOG_SIZES.REGRESSION_BUILDER,
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        finishHubIndependentFlow();
        return;
      }
      hubIndependentDialog = res.value;
      var sendIndependentData = function () {
        if (!hubIndependentDialog || !gr) return;
        // Always open the builder fresh.
        hubIndependentDialog.messageChild(JSON.stringify({
          type: "INDEPENDENT_DATA",
          payload: {
            headers: gr.values[0] || [],
            rows: gr.values.slice(1),
            address: gr.address || "",
            savedModelSpec: null
          }
        }));
      };
      setTimeout(sendIndependentData, 550);
      hubIndependentDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendIndependentData();
          } else if (msg.action === "independentModel") {
            sessionStorage.setItem("independentModelSpec", JSON.stringify(msg.data || msg.payload || {}));
            try { hubIndependentDialog.close(); } catch (e) {}
            hubIndependentDialog = null;
            if (window.HubResultsBridge) HubResultsBridge.open("independent", 500);
          } else if (msg.action === "close") {
            try { hubIndependentDialog.close(); } catch (e) {}
            hubIndependentDialog = null;
            finishHubIndependentFlow();
          }
        } catch (e) {}
      });
      hubIndependentDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubIndependentDialog = null;
        if (!window.HubResultsBridge || !HubResultsBridge.hasActive()) finishHubIndependentFlow();
      });
    }
  );
  return true;
}

function openCorrelationConfigFromHub() {
  var gr = getGlobalRangePayload() || { values: [], address: "", mode: "used" };
  hubCorrelationFlowActive = true;
  setSelectedModuleCard("correlations", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "correlations/correlation-config.html?v=" + Date.now(),
    DIALOG_SIZES.REGRESSION_BUILDER,
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        finishHubCorrelationFlow();
        return;
      }
      hubCorrelationDialog = res.value;
      var sendCorrelationData = function () {
        if (!hubCorrelationDialog || !gr) return;
        hubCorrelationDialog.messageChild(JSON.stringify({
          type: "CORRELATION_DATA",
          payload: { values: gr.values, address: gr.address || "" }
        }));
      };
      setTimeout(sendCorrelationData, 550);
      hubCorrelationDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendCorrelationData();
          } else if (msg.action === "runAnalysis") {
            hubPendingCorrelationRunData = msg.data || {};
            try { hubCorrelationDialog.close(); } catch (e) {}
            hubCorrelationDialog = null;
            setTimeout(function () {
              if (hubPendingCorrelationRunData && !hubCorrelationResultsDialog) {
                var pending = hubPendingCorrelationRunData;
                hubPendingCorrelationRunData = null;
                openCorrelationResultsFromHub(pending);
              }
            }, 500);
          } else if (msg.action === "close") {
            try { hubCorrelationDialog.close(); } catch (e) {}
            hubCorrelationDialog = null;
            finishHubCorrelationFlow();
          }
        } catch (e) {}
      });
      hubCorrelationDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubCorrelationDialog = null;
        if (hubPendingCorrelationRunData && !hubCorrelationResultsDialog) {
          var pending = hubPendingCorrelationRunData;
          hubPendingCorrelationRunData = null;
          setTimeout(function () { openCorrelationResultsFromHub(pending); }, 120);
          return;
        }
        if (!hubCorrelationResultsDialog) finishHubCorrelationFlow();
      });
    }
  );
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PARETO 20/80 — flow
   ═══════════════════════════════════════════════════════════════════════════ */
function finishHubParetoFlow() {
  hubParetoFlowActive = false;
  hubParetoConfigDialog = null;
  hubParetoResultsDialog = null;
  setSelectedModuleCard("pareto2080", false);
}

function openParetoFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "pareto2080",
    dialogPath: "pareto/pareto-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "PARETO_DATA",
    payloadBuilder: function (gr) {
      // Always open the builder fresh.
      return {
        headers: gr.values[0] || [],
        rows: gr.values.slice(1),
        address: gr.address || "",
        savedModelSpec: null
      };
    },
    modelActions: ["paretoModel"],
    onModel: function (msg) {
      sessionStorage.setItem("paretoModelSpec", JSON.stringify(msg.payload || msg.data || {}));
    },
    hubResultsKey: "pareto2080",
    nextDelayMs: 500
  });
}

function openMultivariableDialogFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "multivariable",
    dialogPath: "multivariable/mv-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "MV_DATA",
    payloadBuilder: function (gr) {
      return {
        headers: (gr && gr.values && gr.values[0]) || [],
        rows: (gr && gr.values && gr.values.slice(1)) || [],
        address: (gr && gr.address) || "",
        savedModelSpec: null
      };
    },
    modelActions: ["mvModel"],
    onModel: function (msg) {
      sessionStorage.setItem("mvModelSpec", JSON.stringify(msg.payload || msg.data || {}));
    },
    hubResultsKey: "multivariable",
    nextDelayMs: 500
  });
}

function openMultivariableFromHub() {
  // Open the guided input dialog immediately (like Pareto). Range can be
  // adjusted inside the dialog via Use selection / Select range / Load sample.
  return openMultivariableDialogFromHub();
}

function openMultivariableSampleFromHub() {
  setSelectedModuleCard("multivariable-sample", true);
  var finish = function () { setSelectedModuleCard("multivariable-sample", false); };

  function afterInsert(result) {
    if (!result || !result.ok) {
      try {
        window.alert("Could not write the sample sheet.\n\n" + ((result && result.error) || "Unknown error") +
          "\n\nOpening Multivariable Visualisation with built-in sample data instead.");
      } catch (e) {}
      finish();
      openMultivariableDialogFromHub();
      return;
    }
    finish();
    openMultivariableDialogFromHub();
  }

  // Panel script may not be loaded yet — load bridge then insert.
  if (window.HubResultsBridge && typeof HubResultsBridge.ensureLoaded === "function") {
    HubResultsBridge.ensureLoaded("multivariable", function () {
      if (window.StatisticoMvSample && typeof StatisticoMvSample.insertSheet === "function") {
        StatisticoMvSample.insertSheet().then(afterInsert, function (err) {
          afterInsert({ ok: false, error: (err && err.message) || String(err) });
        });
      } else if (window.MvSampleData) {
        // Fallback: seed global range only (no worksheet write).
        var t = MvSampleData.getTable();
        if (window.StatisticoGlobalRange) StatisticoGlobalRange.save(t.values, "MV Sample (built-in)", "used");
        afterInsert({ ok: true, values: t.values });
      } else {
        afterInsert({ ok: false, error: "Sample module not loaded" });
      }
    });
    return true;
  }

  if (window.StatisticoMvSample && typeof StatisticoMvSample.insertSheet === "function") {
    StatisticoMvSample.insertSheet().then(afterInsert, function (err) {
      afterInsert({ ok: false, error: (err && err.message) || String(err) });
    });
    return true;
  }

  afterInsert({ ok: false, error: "Hub results bridge unavailable" });
  return true;
}

function openBuilderDialogFromHub(options) {
  var gr = getGlobalRangePayload() || { values: [], address: "", mode: "used" };
  var handedOffToResults = false;
  setSelectedModuleCard(options.moduleId, true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + options.dialogPath + (options.dialogPath.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now(),
    options.dialogOptions || (typeof getInputBuilderDialogOptions === "function" ? getInputBuilderDialogOptions() : DIALOG_SIZES.REGRESSION_BUILDER),
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        setSelectedModuleCard(options.moduleId, false);
        var err = res.error || {};
        var code = err.code != null ? " (code " + err.code + ")" : "";
        var detail = err.message || "Unknown error";
        console.error("Failed to open module dialog:", detail, err);
        try {
          window.alert(
            "Could not open the analysis popup" + code + ".\n\n" +
            detail + "\n\n" +
            "Try closing any other Statistico dialogs, then click the module again."
          );
        } catch (e) {}
        return;
      }
      hubBuilderDialog = res.value;
      var dlg = hubBuilderDialog;
      var sendPayload = function () {
        if (!dlg) return;
        dlg.messageChild(JSON.stringify({
          type: options.dataType,
          payload: options.payloadBuilder ? options.payloadBuilder(gr) : {}
        }));
      };
      setTimeout(sendPayload, options.initialDelayMs || 550);
      if (options.retryDelayMs) setTimeout(sendPayload, options.retryDelayMs);
      dlg.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData") {
            sendPayload();
            return;
          }
          if (msg.action === "pickRange" || msg.action === "useSelection") {
            var mode = msg.action === "useSelection" ? "selection" : "prompt";
            var capture = window.hubCaptureRange;
            if (typeof capture !== "function") return;
            Promise.resolve(capture(mode)).then(function (result) {
              if (!result || !result.values || result.values.length < 2) {
                if (dlg) {
                  dlg.messageChild(JSON.stringify({
                    type: "MV_RANGE_ERROR",
                    message: (result && result.error) || "Could not read that range. Select a header row plus data."
                  }));
                }
                return;
              }
              gr = { values: result.values, address: result.address || "", mode: mode };
              sendPayload();
            }, function (err) {
              if (dlg) {
                dlg.messageChild(JSON.stringify({
                  type: "MV_RANGE_ERROR",
                  message: (err && err.message) || "Could not read that range."
                }));
              }
            });
            return;
          }
          var modelActions = options.modelActions || [];
          if (modelActions.indexOf(msg.action) >= 0) {
            if (typeof options.onModel === "function") options.onModel(msg);
            handedOffToResults = !!(options.hubResultsKey && window.HubResultsBridge);
            try { dlg.close(); } catch (e) {}
            dlg = null;
            hubBuilderDialog = null;
            if (handedOffToResults) {
              HubResultsBridge.open(options.hubResultsKey, options.nextDelayMs || 380);
            } else if (typeof options.nextUrl === "function") {
              setSelectedModuleCard(options.moduleId, false);
              setTimeout(function () {
                window.location.href = options.nextUrl();
              }, options.nextDelayMs || 380);
            } else {
              setSelectedModuleCard(options.moduleId, false);
            }
            return;
          }
          var closeActions = options.closeActions || ["close"];
          if (closeActions.indexOf(msg.action) >= 0) {
            try { dlg.close(); } catch (e) {}
            dlg = null;
            hubBuilderDialog = null;
            setSelectedModuleCard(options.moduleId, false);
          }
        } catch (e) {}
      });
      dlg.addEventHandler(Office.EventType.DialogEventReceived, function () {
        dlg = null;
        hubBuilderDialog = null;
        /* Keep selected only while handing off to results; X-close clears. */
        if (handedOffToResults) return;
        setSelectedModuleCard(options.moduleId, false);
      });
    }
  );
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLICATION TABLES — flow
   The builder is a single self-contained dialog (Build / Preview / Details
   tabs, own demo dataset + stats engine). On open we push it the currently
   selected Active Range (if any) so it can build the table from real data
   instead of the built-in demo set; the builder falls back to the demo
   dataset on its own if no usable range is selected.
   ═══════════════════════════════════════════════════════════════════════════ */
function finishHubPublicationTablesFlow() {
  hubPublicationTablesFlowActive = false;
  if (!hubPublicationTablesResultsDialog) setSelectedModuleCard("publication-tables", false);
}

function sendPublicationTablesDataFromHub() {
  if (!hubPublicationTablesResultsDialog) return;
  var gr = getGlobalRangePayload();
  if (!gr) return;
  hubPublicationTablesResultsDialog.messageChild(JSON.stringify({
    type: "PUBTABLES_DATA",
    payload: {
      headers: gr.values[0] || [],
      rows: gr.values.slice(1),
      address: gr.address || ""
    }
  }));
}

function openPublicationTablesConfigFromHub() {
  hubPublicationTablesFlowActive = true;
  setSelectedModuleCard("publication-tables", true);
  Office.context.ui.displayDialogAsync(
    getDialogsBaseUrl() + "publication-tables/publication-tables-builder.html?v=" + Date.now(),
    DIALOG_SIZES.RESULTS_HUB,
    function (res) {
      if (res.status === Office.AsyncResultStatus.Failed) {
        console.error("Could not open publication tables builder:", res.error && res.error.message);
        finishHubPublicationTablesFlow();
        return;
      }
      hubPublicationTablesResultsDialog = res.value;
      if (window.HubResultsBridge) HubResultsBridge.registerDialog(hubPublicationTablesResultsDialog);
      // Same multi-shot pattern as Regression/ANOVA: the dialog's handler
      // may not be registered on the first ready ping.
      setTimeout(sendPublicationTablesDataFromHub, 550);
      setTimeout(sendPublicationTablesDataFromHub, 1200);
      setTimeout(sendPublicationTablesDataFromHub, 2000);
      hubPublicationTablesResultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, function (arg) {
        try {
          var msg = JSON.parse(arg.message || "{}");
          if (msg.action === "ready" || msg.action === "requestData" || msg.action === "refreshData") {
            sendPublicationTablesDataFromHub();
          } else if (msg.action === "close") {
            hubPublicationTablesResultsDialog.close();
            hubPublicationTablesResultsDialog = null;
            finishHubPublicationTablesFlow();
          }
        } catch (e) {}
      });
      hubPublicationTablesResultsDialog.addEventHandler(Office.EventType.DialogEventReceived, function () {
        hubPublicationTablesResultsDialog = null;
        finishHubPublicationTablesFlow();
      });
    }
  );
  return true;
}

function nextModuleResultUrl(moduleId) {
  return "./" + moduleId + "/" + moduleId + ".html?v=" + Date.now() + "&fromHub=1&autoConfig=1&directDialog=1&openResults=1";
}

function openDependentConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "dependent",
    dialogPath: "dependent/dependent-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "DEPENDENT_DATA",
    payloadBuilder: function (gr) {
      // Always open the builder fresh.
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", savedModelSpec: null };
    },
    modelActions: ["dependentModel"],
    onModel: function (msg) {
      sessionStorage.setItem("dependentModelSpec", JSON.stringify(msg.data || msg.payload || {}));
    },
    hubResultsKey: "dependent"
  });
}

function openFactorConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "factor",
    dialogPath: "factor/factor-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "FACTOR_DATA",
    payloadBuilder: function (gr) {
      // Always open the builder fresh.
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", analysisMode: "factor", savedModelSpec: null };
    },
    modelActions: ["factorModel", "regressionModel"],
    onModel: function (msg) {
      var spec = msg.payload || msg.data || {};
      spec.analysisMode = "factor";
      sessionStorage.setItem("factorModelSpec", JSON.stringify(spec));
    },
    hubResultsKey: "factor",
    nextDelayMs: 450
  });
}

function openLogisticConfigFromHub() {
  try { sessionStorage.removeItem("logisticModelSpec"); } catch (e) {}
  return openBuilderDialogFromHub({
    moduleId: "logistic",
    dialogPath: "logistic/logistic-input.html?dialog=1",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "LOGISTIC_DATA",
    payloadBuilder: function (gr) {
      return {
        headers: gr.values[0] || [],
        rows: gr.values.slice(1),
        address: gr.address || "",
        analysisMode: "logistic",
        // Always open logistic builder fresh from Hub.
        savedModelSpec: null,
        restoreSavedModel: false
      };
    },
    modelActions: ["logisticModel", "regressionModel"],
    onModel: function (msg) {
      var spec = msg.payload || msg.data || {};
      spec.analysisMode = "logistic";
      sessionStorage.setItem("logisticModelSpec", JSON.stringify(spec));
    },
    hubResultsKey: "logistic",
    nextDelayMs: 450
  });
}

function openPcaConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "pca",
    dialogPath: "factor/factor-input.html?mode=pca",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "FACTOR_DATA",
    payloadBuilder: function (gr) {
      // Always open the builder fresh.
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", analysisMode: "pca", savedModelSpec: null };
    },
    modelActions: ["factorModel", "regressionModel"],
    onModel: function (msg) {
      var spec = msg.payload || msg.data || {};
      spec.analysisMode = "pca";
      sessionStorage.setItem("pcaModelSpec", JSON.stringify(spec));
    },
    hubResultsKey: "pca",
    nextDelayMs: 450
  });
}

function openReliabilityConfigFromHub() {
  try { sessionStorage.removeItem("reliabilityModelSpec"); } catch (e) {}
  return openBuilderDialogFromHub({
    moduleId: "reliability",
    dialogPath: "reliability/reliability-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "RELIABILITY_DATA",
    payloadBuilder: function (gr) {
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", savedModelSpec: null };
    },
    modelActions: ["reliabilityModel"],
    onModel: function (msg) {
      var spec = msg.payload || msg.data || {};
      spec.analysisMode = "reliability";
      sessionStorage.setItem("reliabilityModelSpec", JSON.stringify(spec));
    },
    hubResultsKey: "reliability",
    nextDelayMs: 450
  });
}

function openMixedConfigFromHub() {
  return openBuilderDialogFromHub({
    moduleId: "mixed",
    dialogPath: "mixed/mixed-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "MIXED_DATA",
    payloadBuilder: function (gr) {
      // Always open the builder fresh.
      return { headers: gr.values[0] || [], rows: gr.values.slice(1), address: gr.address || "", savedModelSpec: null };
    },
    modelActions: ["mixedModel"],
    onModel: function (msg) {
      sessionStorage.setItem("mixedModelSpec", JSON.stringify(msg.payload || msg.data || {}));
    },
    hubResultsKey: "mixed",
    nextDelayMs: 500
  });
}

function openSegmentationFromHub() {
  try { sessionStorage.removeItem("segmentationModelSpec"); } catch (e) {}
  return openBuilderDialogFromHub({
    moduleId: "segmentation",
    dialogPath: "segmentation/segmentation-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "SEGMENTATION_DATA",
    payloadBuilder: function (gr) {
      return {
        headers: gr.values[0] || [],
        rows: gr.values.slice(1),
        address: gr.address || "",
        savedSpec: null
      };
    },
    modelActions: ["segmentationModel"],
    onModel: function (msg) {
      var data = msg.payload || msg.data || {};
      var spec = (data && data.spec) ? data.spec : data;
      sessionStorage.setItem("segmentationModelSpec", JSON.stringify(spec || {}));
    },
    hubResultsKey: "segmentation",
    nextDelayMs: 450,
    initialDelayMs: 400,
    retryDelayMs: 1200,
    closeActions: ["close", "cancel"]
  });
}

function openContingencyConfigFromHub() {
  try { sessionStorage.removeItem("contingencyModelSpec"); } catch (e) {}
  return openBuilderDialogFromHub({
    moduleId: "contingency",
    dialogPath: "contingency/contingency-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "CONTINGENCY_DATA",
    payloadBuilder: function (gr) {
      return {
        headers: gr.values[0] || [],
        rows: gr.values.slice(1),
        address: gr.address || "",
        savedSpec: null
      };
    },
    modelActions: ["contingencyModel"],
    onModel: function (msg) {
      var data = msg.payload || msg.data || {};
      var spec = (data && data.spec) ? data.spec : data;
      sessionStorage.setItem("contingencyModelSpec", JSON.stringify(spec || {}));
    },
    hubResultsKey: "contingency",
    nextDelayMs: 450,
    initialDelayMs: 400,
    retryDelayMs: 1200,
    closeActions: ["close", "cancel"]
  });
}

function openMetaConfigFromHub() {
  try { sessionStorage.removeItem("metaModelSpec"); } catch (e) {}
  return openBuilderDialogFromHub({
    moduleId: "meta-analysis",
    dialogPath: "meta-analysis/meta-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "META_DATA",
    payloadBuilder: function (gr) {
      // Always open the builder fresh from the Active Range.
      return {
        headers: gr.values[0] || [],
        rows: gr.values.slice(1),
        address: gr.address || "",
        savedSpec: null
      };
    },
    modelActions: ["metaModel"],
    onModel: function (msg) {
      var data = msg.payload || msg.data || {};
      var spec = (data && data.spec) ? data.spec : data;
      sessionStorage.setItem("metaModelSpec", JSON.stringify(spec || {}));
    },
    hubResultsKey: "meta-analysis",
    nextDelayMs: 450,
    initialDelayMs: 400,
    retryDelayMs: 1200,
    closeActions: ["close", "cancel"]
  });
}

function buildClusterNumericCandidates(gr, threshold) {
  var values = (gr && gr.values) || [];
  if (!values.length) return [];
  var headers = values[0] || [];
  var rows = values.slice(1);
  var th = isFinite(Number(threshold)) ? Number(threshold) : 0.8;
  var out = [];
  headers.forEach(function (h, j) {
    var num = 0, nm = 0;
    rows.forEach(function (r) {
      var v = r[j];
      if (v === null || v === undefined || v === "") return;
      nm++;
      var n = Number(v);
      if (isFinite(n)) num++;
    });
    if (nm > 0 && num / nm >= th) out.push({ index: j, label: String(h || ("V" + (j + 1))) });
  });
  return out;
}

function openClusterConfigFromHub(lockedMethod) {
  var moduleId = lockedMethod === "kmeans" || lockedMethod === "hierarchical" ? lockedMethod : "cluster";
  return openBuilderDialogFromHub({
    moduleId: moduleId,
    dialogPath: "cluster/cluster-input.html",
    dialogOptions: DIALOG_SIZES.REGRESSION_BUILDER,
    dataType: "CLUSTER_DATA",
    payloadBuilder: function (gr) {
      // Always open the builder fresh.
      return {
        headers: gr.values[0] || [],
        rows: gr.values.slice(1),
        address: gr.address || "",
        savedModelSpec: null,
        lockedMethod: moduleId === "cluster" ? null : moduleId
      };
    },
    modelActions: ["clusterModel"],
    onModel: function (msg) {
      var spec = msg.payload || msg.data || {};
      if (moduleId !== "cluster") spec.clusterMethod = moduleId;
      sessionStorage.setItem("clusterModelSpec", JSON.stringify(spec));
      sessionStorage.setItem("clusterSpec", JSON.stringify(spec));
    },
    hubResultsKey: moduleId,
    nextDelayMs: 480
  });
}

function dismissAllHubDialogs() {
  var hadOpen = false;
  [
    hubConfigDialog,
    hubRegressionConfigDialog,
    hubRegressionResultsDialog,
    hubAnovaDialog,
    hubIndependentDialog,
    hubCorrelationDialog,
    hubCorrelationResultsDialog,
    hubParetoConfigDialog,
    hubParetoResultsDialog,
    hubBuilderDialog,
    hubPublicationTablesResultsDialog
  ].forEach(function (dlg) {
    if (dlg) {
      hadOpen = true;
      try { dlg.close(); } catch (e) {}
    }
  });
  hubConfigDialog = null;
  hubRegressionConfigDialog = null;
  hubRegressionResultsDialog = null;
  hubAnovaDialog = null;
  hubIndependentDialog = null;
  hubCorrelationDialog = null;
  hubCorrelationResultsDialog = null;
  hubPendingCorrelationRunData = null;
  hubPendingCorrelationViewUrl = null;
  hubCorrelationMatrixData = null;
  hubParetoConfigDialog = null;
  hubParetoResultsDialog = null;
  hubBuilderDialog = null;
  hubPublicationTablesResultsDialog = null;
  if (window.HubResultsBridge) HubResultsBridge.dismissAll();
  if (window.StatisticoDialogHost) StatisticoDialogHost.releaseTaskpaneAfterDialog();
  return hadOpen;
}

function openPrepareQualityFromHub() {
  if (window.HubResultsBridge && typeof HubResultsBridge.open === "function") {
    HubResultsBridge.open("prepare-quality", 80);
    return true;
  }
  return false;
}

function openPrepareDatasetFromHub() {
  if (window.HubResultsBridge && typeof HubResultsBridge.open === "function") {
    HubResultsBridge.open("prepare-dataset", 80);
    return true;
  }
  return false;
}

function navigateToModuleCore(id) {
  var gr = getGlobalRangePayload();
  if (id === "prepare-quality") {
    if (openPrepareQualityFromHub()) return;
  }
  if (id === "prepare-dataset") {
    if (openPrepareDatasetFromHub()) return;
  }
  if (id === "univariate") {
    if (openUnivariateConfigFromHub("univariate", null)) return;
  }
  if (id === "univariate-workspace") {
    if (openUnivariateConfigFromHub("univariate-workspace", "univariate/univariate-workspace.html")) return;
  }
  if (id === "regression") {
    if (openRegressionConfigFromHub()) return;
  }
  if (id === "anova") {
    if (openAnovaConfigFromHub()) return;
  }
  if (id === "independent") {
    if (openIndependentConfigFromHub()) return;
  }
  if (id === "correlations") {
    if (openCorrelationConfigFromHub()) return;
  }
  if (id === "dependent") {
    if (openDependentConfigFromHub()) return;
  }
  if (id === "factor") {
    if (openFactorConfigFromHub()) return;
  }
  if (id === "logistic") {
    if (openLogisticConfigFromHub()) return;
  }
  if (id === "contingency") {
    if (openContingencyConfigFromHub()) return;
  }
  if (id === "frequency-tables") {
    window.alert("Frequency Tables is coming soon. Use Contingency Tables for two-way association, or Publication Tables for frequency distributions.");
    return;
  }
  if (id === "pca") {
    if (openPcaConfigFromHub()) return;
  }
  if (id === "reliability") {
    if (openReliabilityConfigFromHub()) return;
  }
  if (id === "meta-analysis") {
    if (openMetaConfigFromHub()) return;
  }
  if (id === "mixed") {
    if (openMixedConfigFromHub()) return;
  }
  if (id === "cluster") {
    if (openClusterConfigFromHub()) return;
  }
  if (id === "kmeans" || id === "hierarchical") {
    if (openClusterConfigFromHub(id)) return;
  }
  if (id === "pareto2080") {
    if (openParetoFromHub()) return;
  }
  if (id === "segmentation" || id === "survey-segmentation") {
    if (openSegmentationFromHub()) return;
  }
  if (id === "multivariable") {
    if (openMultivariableFromHub()) return;
  }
  if (id === "multivariable-sample") {
    if (openMultivariableSampleFromHub()) return;
  }
  if (id === "publication-tables") {
    if (openPublicationTablesConfigFromHub()) return;
  }
  var url = "./" + id + "/" + id + ".html?v=" + Date.now() + "&fromHub=1";
  if (gr && gr.values && gr.values.length >= 2) url += "&autoConfig=1&directDialog=1";
  window.location.href = url;
}

function navigateToModule(id) {
  var hadOpenDialog = dismissAllHubDialogs();
  var proceed = function () {
    if (hadOpenDialog) setTimeout(function () { navigateToModuleCore(id); }, 150);
    else navigateToModuleCore(id);
  };
  // Re-read the worksheet before launching: the stored range is a snapshot
  // from when the hub loaded, so edits made since (even saved ones) would
  // otherwise feed the module stale data.
  var refresh = typeof window.hubRefreshGlobalRange === "function" ? window.hubRefreshGlobalRange() : null;
  if (refresh && typeof refresh.then === "function") {
    var done = false;
    var once = function () { if (!done) { done = true; proceed(); } };
    refresh.then(once, once);
    // Safety net: never let a stalled Excel.run block the module launch.
    setTimeout(once, 2500);
  } else {
    proceed();
  }
}

function showAdvisor() {
  if (window.StatisticoProcedureAdvisor && typeof window.StatisticoProcedureAdvisor.open === "function") {
    window.StatisticoProcedureAdvisor.open();
    return;
  }
  window.alert(
    "AI Procedure Advisor is loading.\n\nPlease refresh the hub and try again."
  );
}

function showError(msg) {
  const list = document.getElementById("categoryTiles");
  if (list) {
    list.innerHTML =
      '<div style="text-align:center;padding:24px;color:#ef4444;font-size:12px;">' +
      '<i class="fa-solid fa-triangle-exclamation" style="font-size:28px;margin-bottom:10px;display:block;"></i>' +
      escapeHtml(msg) +
      "</div>";
  }
}

window.navigateToModule = navigateToModule;
window.filterModules = filterModules;
window.showAdvisor = showAdvisor;
window.setHubCluster = setHubCluster;
window.setHubToolsSection = setHubToolsSection;
window.toggleHubToolsMenu = toggleHubToolsMenu;
window.setHubAnalyticsSection = setHubAnalyticsSection;
window.toggleHubAnalyticsMenu = toggleHubAnalyticsMenu;
window.toggleHubAccordion = toggleHubAccordion;
window.toggleHubExpandAll = toggleHubExpandAll;
window.runHubModuleAction = runHubModuleAction;
window.setSelectedModuleCard = setSelectedModuleCard;

document.addEventListener("click", function (e) {
  var toolsWrap = document.getElementById("hubNavToolsWrap");
  if (toolsWrap && isHubToolsMenuOpen() && !toolsWrap.contains(e.target)) closeHubToolsMenu();
  var analyticsWrap = document.getElementById("hubNavAnalyticsWrap");
  if (analyticsWrap && isHubAnalyticsMenuOpen() && !analyticsWrap.contains(e.target)) closeHubAnalyticsMenu();
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closePopup();
    closeHubToolsMenu();
    closeHubAnalyticsMenu();
  }
});

Office.onReady(function(info) {
  if (info.host !== Office.HostType.Excel) {
    showError("This add-in is designed for Excel only.");
    return;
  }
  loadHubScopeConfigIfAny().then(function () {
    ACTIVE_ANALYTICS_SECTION = loadStoredAnalyticsSection();
    var available = getAvailableAnalyticsSections();
    if (ACTIVE_ANALYTICS_SECTION !== "all" && available.indexOf(ACTIVE_ANALYTICS_SECTION) < 0) {
      ACTIVE_ANALYTICS_SECTION = available[0] || "all";
    }
    syncClusterHeader();
    renderCategoryTiles("");
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.init === "function") {
      window.StatisticoTooltip.init();
      window.StatisticoTooltip.refresh();
    }
    loadModulesConfig()
      .then(function(list) {
        MODULES = ensureClusterModule(list);
      })
      .catch(function(err) {
        console.error("Hub config load failed:", err);
      });
  });
  window.addEventListener("blur", dismissHubButtonTooltips);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) dismissHubButtonTooltips();
  });
});
