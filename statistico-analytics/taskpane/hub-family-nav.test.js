const family = require("./hub-family-nav.js");

function catalog(ids, extra) {
  var out = {};
  ids.forEach(function (id) {
    out[id] = Object.assign({ hidden: false }, (extra && extra[id]) || {});
  });
  return out;
}

const ALL = [
  "univariate", "correlations", "pca", "factor",
  "independent", "anova", "dependent",
  "regression", "logistic", "mixed",
  "calc-power", "pareto2080", "process-settings", "capability-range", "gage-rr"
];

describe("family home catalog", () => {
  test("shows the three analysis families, then Power and Quality", () => {
    const model = family.buildNavigationModel(catalog(ALL));
    expect(model.families.map(function (row) { return row.label; })).toEqual([
      "Explore data",
      "Compare groups & conditions",
      "Model outcomes"
    ]);
    expect(model.more.map(function (row) { return row.id; })).toEqual(["power", "quality"]);
    expect(model.families[0].moduleIds).toEqual(["univariate", "correlations", "pca", "factor"]);
    expect(model.families[1].moduleIds).toEqual(["independent", "anova", "dependent"]);
    expect(model.families[2].moduleIds).toEqual(["regression", "logistic", "mixed"]);
    expect(model.more[1].moduleIds).toEqual(["pareto2080", "process-settings", "capability-range", "gage-rr"]);
  });

  test("omits a family that has no displayable modules", () => {
    const source = catalog(ALL);
    ["univariate", "correlations", "pca", "factor"].forEach(function (id) {
      source[id].hidden = true;
    });
    const model = family.buildNavigationModel(source);
    expect(model.families.map(function (row) { return row.id; })).toEqual(["compare", "model"]);
  });

  test("keeps a locked module and drops Quality when none of its modules are in the catalog", () => {
    const source = catalog(["univariate", "independent", "regression", "calc-power"], {
      regression: { locked: true }
    });
    const model = family.buildNavigationModel(source);
    expect(model.families.map(function (row) { return row.id; })).toEqual(["explore", "compare", "model"]);
    expect(model.families[2].moduleIds).toEqual(["regression"]);
    expect(model.more.map(function (row) { return row.id; })).toEqual(["power"]);
  });

  test("Quality stays when only one of its modules is available", () => {
    const model = family.buildNavigationModel(catalog(["univariate", "gage-rr"]));
    expect(model.more.map(function (row) { return row.id; })).toEqual(["quality"]);
    expect(model.more[0].moduleIds).toEqual(["gage-rr"]);
  });

  test("a late launch result is ignored after navigation moves on", () => {
    expect(family.shouldApplyLaunchResult(3, 3)).toBe(true);
    expect(family.shouldApplyLaunchResult(3, 4)).toBe(false);
  });
});

describe("family home markup", () => {
  const model = family.buildNavigationModel(catalog(ALL));

  test("home is a stack of full-row buttons under Choose an analysis", () => {
    const html = family.renderHomeHtml(model, null);
    expect(html).toContain("Choose an analysis");
    expect(html).toContain("More tools");
    expect(html).toContain("Plan a study or check its power.");
    expect(html).toContain('onclick="openHubPower()"');
    expect(html.match(/<button type="button"/g)).toHaveLength(5);
    expect(html).toContain("hub-family-title");
    expect(html).toContain("hub-family-desc");
    expect(html).not.toContain("white-space:nowrap");
    expect(html.indexOf("Explore data")).toBeLessThan(html.indexOf("Compare groups"));
    expect(html.indexOf("Compare groups")).toBeLessThan(html.indexOf("Model outcomes"));
    expect(html.indexOf("Model outcomes")).toBeLessThan(html.indexOf("Power &amp; Sample Size"));
  });

  test("a family page lists only that family's catalog rows and can return home", () => {
    const html = family.renderFamilyHtml(family.getFamilySpec("model"), [
      { id: "regression", label: "Linear Regression", description: "Coefficients and diagnostics" },
      { id: "logistic", label: "Logistic Regression", description: "Binary outcomes" },
      { id: "mixed", label: "Mixed-Effects Models", description: "Random effects" }
    ], null);
    expect(html).toContain("← All families");
    expect(html).toContain("Model outcomes");
    expect(html).toContain("Estimate effects and predict numeric or binary outcomes.");
    expect(html).toContain("Linear Regression");
    expect(html).toContain('onclick="launchHubFamilyModule(\'regression\')"');
    expect(html).not.toContain("Univariate");
    expect(html).toContain('type="button"');
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
