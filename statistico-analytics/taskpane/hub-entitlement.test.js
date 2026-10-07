const fs = require("fs");
const path = require("path");
const entitlement = require("./hub-entitlement.js");

const root = __dirname;
const scope = JSON.parse(fs.readFileSync(path.join(root, "hub-scopes", "appsource-v1.json"), "utf8"));
const NOW = Date.parse("2026-10-06T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function freshCache(plan, extra) {
  return Object.assign({
    plan: plan,
    cachedAt: NOW - DAY,
    expiresAt: null,
    email: "cached@example.com"
  }, extra || {});
}

describe("central access policy", () => {
  test("FREE opens the free modules and locks the rest", () => {
    expect(entitlement.planAllows("FREE", "univariate")).toBe(true);
    expect(entitlement.planAllows("FREE", "univariate-workspace")).toBe(true);
    expect(entitlement.planAllows("FREE", "calc-distribution-hub")).toBe(true);
    expect(entitlement.planAllows("FREE", "regression")).toBe(false);
    expect(entitlement.planAllows("FREE", "pareto2080")).toBe(false);
  });

  test("email addresses are normalized before activation", () => {
    expect(entitlement.normalizeEmail("  MetricsInstitute@Gmail.com ")).toBe("metricsinstitute@gmail.com");
  });

  test("Early Access and Professional open every module", () => {
    expect(entitlement.planAllows("EARLY_ACCESS", "regression")).toBe(true);
    expect(entitlement.planAllows("PROFESSIONAL", "kmeans")).toBe(true);
    expect(entitlement.planAllows("early access", "mixed")).toBe(true);
  });

  test("an expired Early Access grant is effectively FREE", () => {
    expect(entitlement.effectivePlan({
      plan: "EARLY_ACCESS",
      expiresAt: "2026-10-01T00:00:00Z"
    }, NOW)).toBe("FREE");
    expect(entitlement.effectivePlan({
      plan: "EARLY_ACCESS",
      expiresAt: "2026-12-01T00:00:00Z"
    }, NOW)).toBe("EARLY_ACCESS");
  });

  test("the scope file is a channel marker, not the module allow-list", () => {
    const channel = entitlement.readChannel(scope);
    expect(channel.channel).toBe("appsource");
    expect(channel.defaultPlan).toBe("FREE");
    expect(channel.procedureAdvisor).toBe(true);
    expect(channel.scope).toBe("appsource-v1");
    expect(channel.licenseApi).toBe("https://statistico-license.statistico-interactive.workers.dev/");
    expect(entitlement.planAllows(channel.defaultPlan, "regression")).toBe(false);
    expect(entitlement.FREE_MODULE_IDS).toEqual(["univariate", "univariate-workspace", "calc-distribution-hub"]);
    expect(scope.entitledModules).toContain("univariate");
  });
});

describe("entitlement resolution", () => {
  test("a successful licensing response wins and is cacheable", () => {
    const resolved = entitlement.resolveEntitlement({
      defaultPlan: "FREE",
      apiAttempted: true,
      apiResult: { plan: "EARLY_ACCESS", expiresAt: "2026-12-01T00:00:00Z", email: "a@b.co" },
      cache: freshCache("FREE"),
      now: NOW
    });
    expect(resolved.plan).toBe("EARLY_ACCESS");
    expect(resolved.source).toBe("api");
    expect(resolved.cacheRecord.plan).toBe("EARLY_ACCESS");
    expect(resolved.cacheRecord.cachedAt).toBe(NOW);
  });

  test("an API failure uses a recent unexpired cache", () => {
    const resolved = entitlement.resolveEntitlement({
      defaultPlan: "FREE",
      apiAttempted: true,
      apiResult: { error: true },
      cache: freshCache("PROFESSIONAL"),
      now: NOW
    });
    expect(resolved.plan).toBe("PROFESSIONAL");
    expect(resolved.source).toBe("cache");
  });

  test("no usable cache falls back to FREE", () => {
    const expired = entitlement.resolveEntitlement({
      defaultPlan: "FREE",
      apiAttempted: true,
      apiResult: { error: true },
      cache: freshCache("EARLY_ACCESS", { expiresAt: "2026-10-01T00:00:00Z" }),
      now: NOW
    });
    const missing = entitlement.resolveEntitlement({
      defaultPlan: "FREE",
      apiAttempted: true,
      apiResult: { error: true },
      cache: null,
      now: NOW
    });
    const stale = entitlement.resolveEntitlement({
      defaultPlan: "FREE",
      apiAttempted: false,
      apiResult: null,
      cache: freshCache("PROFESSIONAL", { cachedAt: NOW - (8 * DAY) }),
      now: NOW
    });
    expect(expired).toMatchObject({ plan: "FREE", source: "default" });
    expect(missing).toMatchObject({ plan: "FREE", source: "default" });
    expect(stale).toMatchObject({ plan: "FREE", source: "default" });
  });

  test("a successful expired grant does not revive an older cache", () => {
    const resolved = entitlement.resolveEntitlement({
      defaultPlan: "FREE",
      apiAttempted: true,
      apiResult: { plan: "EARLY_ACCESS", expiresAt: "2026-09-01T00:00:00Z" },
      cache: freshCache("PROFESSIONAL"),
      now: NOW
    });
    expect(resolved.plan).toBe("FREE");
    expect(resolved.source).toBe("api");
    expect(resolved.expiredFrom).toBe("EARLY_ACCESS");
  });
});

describe("catalogue presentation", () => {
  const workspace = {
    tileId: "explore-univariate",
    module: { id: "univariate-workspace", label: "Univariate Workspace" }
  };

  test("FREE keeps the full tile list and marks Professional modules locked", () => {
    const univariate = entitlement.presentModules({
      id: "explore-univariate",
      modules: [{ id: "univariate", label: "Univariate Analysis" }]
    }, { plan: "FREE" }, [workspace]);
    const regression = entitlement.presentModules({
      id: "model-relationships",
      modules: [{ id: "regression", label: "Linear Regression" }]
    }, { plan: "FREE" }, []);
    expect(univariate.map(function (mod) { return mod.id + ":" + mod.locked; })).toEqual([
      "univariate:false",
      "univariate-workspace:false"
    ]);
    expect(regression[0].locked).toBe(true);
  });

  test("Early Access shows the same modules unlocked", () => {
    const regression = entitlement.presentModules({
      id: "model-relationships",
      modules: [{ id: "regression" }, { id: "logistic" }]
    }, { plan: "EARLY_ACCESS" }, []);
    expect(regression.every(function (mod) { return mod.locked === false; })).toBe(true);
  });

  test("the full product is unchanged when no channel license is active", () => {
    const mods = [{ id: "univariate" }, { id: "regression" }];
    expect(entitlement.presentModules({ id: "model", modules: mods }, null, [workspace])).toEqual(mods);
    entitlement.setCurrent(null);
    expect(entitlement.isModuleLocked("regression")).toBe(false);
    entitlement.setCurrent({ plan: "FREE" });
    expect(entitlement.isModuleLocked("regression")).toBe(true);
    expect(entitlement.isModuleLocked("univariate")).toBe(false);
  });
});

describe("AppSource entry still uses the production hub", () => {
  const hubHtml = fs.readFileSync(path.join(root, "hub.html"), "utf8");
  const prepHtml = fs.readFileSync(path.join(root, "hub-prep28.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "hub-app-28.js"), "utf8");

  test("hub.html?scope=appsource-v1 stays on the three-cluster hub", () => {
    expect(hubHtml).toContain("hub-app-apps.js");
    expect(hubHtml).toContain("Interactive Calculators");
    expect(hubHtml.indexOf("hub-prep28.html")).toBe(-1);
  });

  test("the production hub asks the entitlement policy instead of replacing its catalog", () => {
    expect(prepHtml).toContain("hub-entitlement.js");
    expect(prepHtml.indexOf("hub-entitlement.js")).toBeLessThan(prepHtml.indexOf("hub-app-28.js"));
    expect(app).toContain("resolveEntitlement");
    expect(app).toContain("presentModules");
    expect(app).toContain("showHubEarlyAccess");
    expect(app).toContain("No credit card required.");
    expect(app).toContain("You now have full access to Statistico.");
    expect(app).toContain("Early Access could not be activated right now. Please try again later. Your Free modules remain available.");
    expect(app).not.toContain("Early Access activation is not available yet");
    expect(app).not.toContain("Univariate Workspace");
    expect(app).not.toContain("HUB_CLUSTER_TILES = scopeCfg.clusterTiles");
    expect(app).not.toContain("could not load its module entitlements");
  });
});
