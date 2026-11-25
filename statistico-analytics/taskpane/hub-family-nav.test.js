const family = require("./hub-family-nav.js");

function catalog(ids, extra) {
  var out = {};
  ids.forEach(function (id) {
    out[id] = Object.assign({ hidden: false }, (extra && extra[id]) || {});
  });
  return out;
}

const ALL = [
  "univariate", "correlations", "pca", "factor", "hierarchical", "kmeans",
  "independent", "dependent", "anova", "contingency",
  "regression", "logistic", "mixed",
  "calc-power", "calc-precision", "calc-distribution-hub", "calc-cpk",
  "calc-erlang", "calc-erlang-sim",
  "pareto2080", "process-settings", "gage-rr", "capability-range",
  "split-index", "reliability",
  "prepare-data", "multivariable", "publication-tables", "ezpaste-open",
  "meta-analysis"
];

describe("family home catalog", () => {
  test("groups analysis, calculators, and specialized applications", () => {
    const model = family.buildNavigationModel(catalog(ALL));
    expect(model.sections.map(function (section) { return section.label; })).toEqual([
      "Core statistical analysis",
      "Calculators & study planning",
      "Specialized applications"
    ]);
    expect(model.sections[0].families.map(function (row) { return row.id; })).toEqual([
      "explore", "compare", "model"
    ]);
    expect(model.sections[1].families.map(function (row) { return row.id; })).toEqual(["planning"]);
    expect(model.sections[1].families[0].moduleIds).toEqual([
      "calc-power", "calc-precision", "calc-distribution-hub", "calc-cpk"
    ]);
    expect(model.sections[2].families.map(function (row) { return row.id; })).toEqual([
      "quality", "staffing", "survey", "utilities"
    ]);
    expect(model.sections[2].families[1].moduleIds).toEqual(["calc-erlang", "calc-erlang-sim"]);
    expect(model.sections[2].families[3].moduleIds).toEqual([
      "prepare-data", "publication-tables", "multivariable", "ezpaste-open"
    ]);
    expect(model.sections[0].families[0].moduleIds).toEqual([
      "univariate", "correlations", "pca", "factor", "hierarchical", "kmeans"
    ]);
    expect(model.sections[0].families[1].moduleIds).toEqual([
      "independent", "dependent", "anova", "contingency", "meta-analysis"
    ]);
    expect(model.sections[0].families[2].moduleIds).toEqual(["regression", "logistic", "mixed"]);
    expect(model.sections[2].families[0].moduleIds).toEqual([
      "pareto2080", "process-settings", "gage-rr", "capability-range"
    ]);
    expect(model.sections[2].families[2].moduleIds).toEqual(["split-index", "reliability"]);
  });

  test("omits a family that has no displayable modules", () => {
    const source = catalog(ALL);
    ["univariate", "correlations", "pca", "factor", "hierarchical", "kmeans"].forEach(function (id) {
      source[id].hidden = true;
    });
    const model = family.buildNavigationModel(source);
    expect(model.sections[0].families.map(function (row) { return row.id; })).toEqual(["compare", "model"]);
  });

  test("keeps a locked module and drops Survey when none of its modules are in the catalog", () => {
    const source = catalog(["univariate", "independent", "regression", "calc-power"], {
      regression: { locked: true }
    });
    const model = family.buildNavigationModel(source);
    expect(model.sections[0].families.map(function (row) { return row.id; })).toEqual(["explore", "compare", "model"]);
    expect(model.sections[0].families[2].moduleIds).toEqual(["regression"]);
    expect(model.sections[0].families[2].modules[0].locked).toBe(true);
    expect(model.sections[1].families.map(function (row) { return row.id; })).toEqual(["planning"]);
  });

  test("Survey stays when only Split Index is available", () => {
    const model = family.buildNavigationModel(catalog(["univariate", "split-index"]));
    const tools = model.sections[1].families;
    expect(tools.map(function (row) { return row.id; })).toEqual(["survey"]);
    expect(tools[0].moduleIds).toEqual(["split-index"]);
    expect(tools[0].modules[0].label).toBe("Split Index");
  });

  test("a late launch result is ignored after navigation moves on", () => {
    expect(family.shouldApplyLaunchResult(3, 3)).toBe(true);
    expect(family.shouldApplyLaunchResult(3, 4)).toBe(false);
  });
});

describe("family home markup", () => {
  const model = family.buildNavigationModel(catalog(ALL));

  test("home shows family cards with module buttons and collapsed help", () => {
    const html = family.renderHomeHtml(model, null);
    expect(html).not.toContain("Choose an analysis or tool");
    expect(html).toContain("Core statistical analysis");
    expect(html).toContain("Calculators &amp; study planning");
    expect(html).toContain("Specialized applications");
    expect(html).not.toContain("Planning, quality");
    expect(html).toContain("Explore &amp; summarize");
    expect(html).toContain('onclick="launchHubFamilyModule(\'univariate\')"');
    expect(html).toContain('onclick="launchHubFamilyModule(\'split-index\')"');
    expect(html).toContain(">Split Index<sup>TM</sup>");
    expect(html).toContain(">Pareto Analysis<sup>TM</sup>");
    expect(html).toContain(">EzPaste<sup>TM</sup>");
    expect(html).toContain("Pareto is a proprietary innovation.");
    expect(html).toContain("Split Index is a proprietary innovation.");
    expect(html).toContain("EzPaste is a proprietary innovation.");
    expect(html).not.toContain("Survey Summaries");
    expect(html).toContain('class="hub-family-help" id="hub-family-help-explore" hidden');
    expect(html).toContain("See what’s in your data.");
    expect(html.indexOf("hub-family-title")).toBeLessThan(html.indexOf("See what’s in your data."));
    expect(html).toContain(">Paired / Repeated Measures<");
    expect(html).not.toContain('title="Paired / Repeated Measures"');
    expect(html).toContain(">Across studies<");
    expect(html).toContain(">Meta-analysis<");
    expect(html).toContain("Combine effect estimates across studies.");
    expect(html.indexOf(">Contingency Tables<")).toBeLessThan(html.indexOf(">Across studies<"));
    expect(html.indexOf(">Across studies<")).toBeLessThan(html.indexOf(">Meta-analysis<"));
    expect(html.indexOf('class="hub-family-group"')).toBeLessThan(html.indexOf("Summaries &amp; relationships"));
    expect(html).toContain('class="hub-family-divider"><span>Summaries &amp; relationships</span>');
    expect(html).toContain('class="hub-family-divider"><span>Components &amp; factors</span>');
    expect(html).toContain('class="hub-family-divider"><span>Clustering</span>');
    expect(html.indexOf(">Correlations<")).toBeLessThan(html.indexOf("Components &amp; factors"));
    expect(html.indexOf("Components &amp; factors")).toBeLessThan(html.indexOf(">PCA<"));
    expect(html.indexOf(">Factor Analysis<")).toBeLessThan(html.indexOf(">Clustering<"));
    expect(html.indexOf(">Clustering<")).toBeLessThan(html.indexOf(">Hierarchical Clustering<"));
    expect(html.indexOf(">Hierarchical Clustering<")).toBeLessThan(html.indexOf(">K-means<"));
    expect(html.indexOf(">Independent Groups<")).toBeLessThan(html.indexOf(">Paired / Repeated Measures<"));
    expect(html.indexOf(">Paired / Repeated Measures<")).toBeLessThan(html.indexOf(">ANOVA<"));
    expect(html).toContain('aria-expanded="false" aria-controls="hub-family-body-explore"');
    expect(html).toContain('class="hub-family-body" id="hub-family-body-explore" hidden');
    expect(html.indexOf("Explore &amp; summarize")).toBeLessThan(html.indexOf("Compare groups"));
    expect(html.indexOf("Model outcomes")).toBeLessThan(html.indexOf("Calculators &amp; study planning"));
    expect(html.indexOf("Calculators &amp; study planning")).toBeLessThan(html.indexOf(">Power &amp; Sample Size<"));
    expect(html.indexOf(">Power &amp; Sample Size<")).toBeLessThan(html.indexOf(">CPk Calculator<"));
    expect(html.indexOf(">CPk Calculator<")).toBeLessThan(html.indexOf("Specialized applications"));
    expect(html).toContain('data-family-static');
    expect(html).not.toContain("toggleHubFamilyCard('planning')");
    expect(html).toContain(">Erlang C model<");
    expect(html).toContain(">Simulations<");
    expect(html.indexOf("Quality &amp; process improvement")).toBeLessThan(html.indexOf("Call center staffing"));
    expect(html.indexOf("Call center staffing")).toBeLessThan(html.indexOf("Survey analysis"));
    expect(html.indexOf("Survey analysis")).toBeLessThan(html.indexOf("Data &amp; reporting tools"));
    expect(html.indexOf(">Prepare Data<")).toBeLessThan(html.indexOf(">Publication Tables<"));
    expect(html.indexOf(">Publication Tables<")).toBeLessThan(html.indexOf(">Utilities<"));
    expect(html.indexOf(">Utilities<")).toBeLessThan(html.indexOf(">3D Charts<"));
    expect(html.indexOf(">3D Charts<")).toBeLessThan(html.indexOf(">EzPaste<sup>TM</sup>"));
  });

  test("a module hover title adds the catalog purpose", () => {
    const source = catalog(ALL, {
      "prepare-data": { description: "Scan the Active Range, then recode, compute, filter, and reshape into a new worksheet." }
    });
    const html = family.renderHomeHtml(family.buildNavigationModel(source), null);
    expect(html).toContain('data-purpose="Scan the Active Range, then recode, compute, filter, and reshape into a new worksheet."');
    expect(html).toContain(">Prepare Data<");
  });

  test("a family page lists only that family's catalog rows and can return home", () => {
    const html = family.renderFamilyHtml(family.getFamilySpec("model"), [
      { id: "regression", label: "Linear Regression", description: "Coefficients and diagnostics" },
      { id: "logistic", label: "Logistic Regression", description: "Binary outcomes" },
      { id: "mixed", label: "Mixed-Effects Models", description: "Random effects" }
    ], null);
    expect(html).toContain("← All families");
    expect(html).toContain("Model outcomes");
    expect(html).toContain("Estimate effects and make predictions.");
    expect(html).toContain("Linear Regression");
    expect(html).toContain('onclick="launchHubFamilyModule(\'regression\')"');
    expect(html).not.toContain("Univariate");
  });

  test("an empty open family keeps All families and explains that nothing is available", () => {
    const html = family.renderFamilyHtml(family.getFamilySpec("quality"), [], null);
    expect(html).toContain("← All families");
    expect(html).toContain("No modules are available in this family");
    expect(html).not.toContain("launchHubFamilyModule");
  });

  test("a failed open stays on the family page with a retry", () => {
    const html = family.renderFamilyHtml(family.getFamilySpec("model"), [
      { id: "regression", label: "Linear Regression", description: "Coefficients" }
    ], { moduleId: "regression", label: "Linear Regression" });
    expect(html).toContain("Linear Regression could not be opened.");
    expect(html).toContain('onclick="retryHubFamilyModule(\'regression\')"');
    expect(html).toContain("← All families");
  });
});
