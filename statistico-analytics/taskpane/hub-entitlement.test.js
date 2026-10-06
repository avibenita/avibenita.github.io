const fs = require("fs");
const path = require("path");
const entitlement = require("./hub-entitlement.js");

const root = __dirname;
const scope = JSON.parse(fs.readFileSync(path.join(root, "hub-scopes", "appsource-v1.json"), "utf8"));

describe("AppSource v1 entitlement", () => {
  test("names the same modules the legacy scope catalog exposed", () => {
    const fromExplicit = entitlement.collectModuleIds(scope);
    const fromTiles = entitlement.collectModuleIds({ clusterTiles: scope.clusterTiles });
    expect(Object.keys(fromExplicit).sort()).toEqual([
      "calc-distribution-hub",
      "univariate",
      "univariate-workspace"
    ]);
    expect(Object.keys(fromTiles).sort()).toEqual(Object.keys(fromExplicit).sort());
  });

  test("keeps production tiles and drops modules outside the allow-list", () => {
    const allow = entitlement.collectModuleIds(scope);
    const univariate = entitlement.visibleModules({
      id: "explore-univariate",
      modules: [{ id: "univariate", label: "Univariate Analysis" }]
    }, allow, [{
      tileId: "explore-univariate",
      module: { id: "univariate-workspace", label: "Univariate Workspace" }
    }]);
    const regression = entitlement.visibleModules({
      id: "model-relationships",
      modules: [
        { id: "regression", label: "Linear Regression" },
        { id: "logistic", label: "Logistic Regression" }
      ]
    }, allow, []);
    const distribution = entitlement.visibleModules({
      id: "distribution-tools",
      modules: [
        { id: "calc-distribution-hub", label: "Distribution Calculators" },
        { id: "calc-precision", label: "Sample Size — Precision" }
      ]
    }, allow, []);

    expect(univariate.map(function (mod) { return mod.id; })).toEqual([
      "univariate",
      "univariate-workspace"
    ]);
    expect(regression).toEqual([]);
    expect(distribution.map(function (mod) { return mod.id; })).toEqual([
      "calc-distribution-hub"
    ]);
  });

  test("leaves the full catalog open when no allow-list is active", () => {
    const mods = [
      { id: "univariate" },
      { id: "regression" }
    ];
    expect(entitlement.collectModuleIds(null)).toBeNull();
    expect(entitlement.collectModuleIds({})).toBeNull();
    expect(entitlement.isAllowed(null, "regression")).toBe(true);
    expect(entitlement.visibleModules({ id: "model", modules: mods }, null, [{
      tileId: "model",
      module: { id: "univariate-workspace" }
    }]).map(function (mod) { return mod.id; })).toEqual(["univariate", "regression"]);
    expect(entitlement.isAllowed({}, "univariate")).toBe(false);
  });
});

describe("AppSource entry uses the production hub", () => {
  const hubHtml = fs.readFileSync(path.join(root, "hub.html"), "utf8");
  const prepHtml = fs.readFileSync(path.join(root, "hub-prep28.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "hub-app-28.js"), "utf8");

  test("hub.html?scope=appsource-v1 redirects into the production task pane", () => {
    expect(hubHtml).toContain('params.get("scope")');
    expect(hubHtml).toContain("appsource-v1");
    expect(hubHtml).toContain("hub-prep28.html");
    expect(hubHtml.indexOf("hub-prep28.html")).toBeLessThan(hubHtml.indexOf("office.js"));
  });

  test("the production hub filters modules instead of replacing its catalog", () => {
    expect(prepHtml).toContain("hub-entitlement.js");
    expect(prepHtml.indexOf("hub-entitlement.js")).toBeLessThan(prepHtml.indexOf("hub-app-28.js"));
    expect(app).toContain("StatisticoHubEntitlement");
    expect(app).toContain("HUB_ENTITLED_MODULE_IDS");
    expect(app).not.toContain("HUB_CLUSTER_TILES = scopeCfg.clusterTiles");
    expect(app).not.toContain("HUB_CLUSTER_META = scopeCfg.clusterMeta");
    expect(app).toContain('id === "univariate-workspace"');
  });
});
