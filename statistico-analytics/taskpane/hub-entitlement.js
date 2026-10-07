/* global globalThis */
/**
 * Channel licensing for the production hub.
 *
 * scope=appsource-v1 marks the AppSource distribution channel. It does not
 * decide which modules open. Plans do:
 *   FREE          → FREE_MODULE_IDS
 *   EARLY_ACCESS  → every module, until expiresAt
 *   PROFESSIONAL  → every module
 * No scope means the full product, with no license gate.
 *
 * Resolution order when a channel is active:
 *   licensing API success → that entitlement
 *   API failure           → a recently cached entitlement that has not expired
 *   otherwise             → the channel default, which is FREE
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StatisticoHubEntitlement = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  var FREE_MODULE_IDS = ["univariate", "univariate-workspace", "calc-distribution-hub"];
  var CACHE_KEY = "statistico.license.entitlement";
  var CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var current = null;

  function normalizePlan(plan) {
    var key = String(plan || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (key === "FREE" || key === "EARLY_ACCESS" || key === "PROFESSIONAL") return key;
    return null;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function planAllows(plan, moduleId) {
    var normalized = normalizePlan(plan) || "FREE";
    if (normalized === "EARLY_ACCESS" || normalized === "PROFESSIONAL") return true;
    return FREE_MODULE_IDS.indexOf(String(moduleId || "").trim()) >= 0;
  }

  function expiryMs(record) {
    if (!record || !record.expiresAt) return null;
    var exp = Date.parse(record.expiresAt);
    return isNaN(exp) ? null : exp;
  }

  function effectivePlan(record, now) {
    var plan = normalizePlan(record && record.plan);
    if (!plan) return null;
    var exp = expiryMs(record);
    if (exp != null && now >= exp && plan !== "FREE") return "FREE";
    return plan;
  }

  function cacheIsUsable(cache, now) {
    if (!cache || !normalizePlan(cache.plan)) return false;
    var cachedAt = Number(cache.cachedAt);
    if (!cachedAt || now - cachedAt > CACHE_TTL_MS) return false;
    var exp = expiryMs(cache);
    if (exp != null && now >= exp) return false;
    return true;
  }

  function readChannel(scopeCfg) {
    if (!scopeCfg || typeof scopeCfg !== "object") return null;
    var legacy = Array.isArray(scopeCfg.entitledModules) ||
      (scopeCfg.clusterTiles && typeof scopeCfg.clusterTiles === "object");
    var marked = !!(scopeCfg.channel || scopeCfg.defaultPlan || scopeCfg.scope || scopeCfg.procedureAdvisor != null);
    if (!marked && !legacy) return null;
    return {
      scope: scopeCfg.scope || scopeCfg.name || "",
      channel: scopeCfg.channel || "appsource",
      defaultPlan: normalizePlan(scopeCfg.defaultPlan) || "FREE",
      procedureAdvisor: scopeCfg.procedureAdvisor !== false,
      licenseApi: typeof scopeCfg.licenseApi === "string" ? scopeCfg.licenseApi.trim() : ""
    };
  }

  /**
   * apiResult undefined/null and apiAttempted false → API was not called.
   * apiResult { error: true } → call failed.
   * apiResult { plan } → call succeeded.
   */
  function resolveEntitlement(input) {
    var now = input && input.now || Date.now();
    var fallback = normalizePlan(input && input.defaultPlan) || "FREE";
    var apiResult = input ? input.apiResult : null;
    var attempted = !!(input && input.apiAttempted);
    if (apiResult && !apiResult.error) {
      var granted = normalizePlan(apiResult.plan);
      var plan = effectivePlan(apiResult, now);
      if (plan) {
        return {
          plan: plan,
          source: "api",
          email: apiResult.email || "",
          expiresAt: apiResult.expiresAt || null,
          expiredFrom: plan === "FREE" && granted && granted !== "FREE" ? granted : null,
          cacheRecord: {
            plan: granted,
            expiresAt: apiResult.expiresAt || null,
            email: apiResult.email || "",
            cachedAt: now
          }
        };
      }
    }
    var failed = !!(apiResult && apiResult.error) || (attempted && (!apiResult || apiResult.error));
    var skipped = !attempted && (apiResult == null);
    if (failed || skipped || (apiResult && !apiResult.error)) {
      var cache = input && input.cache;
      if (cacheIsUsable(cache, now)) {
        return {
          plan: effectivePlan(cache, now),
          source: "cache",
          email: cache.email || "",
          expiresAt: cache.expiresAt || null,
          expiredFrom: null,
          cacheRecord: null
        };
      }
    }
    return {
      plan: fallback,
      source: "default",
      email: "",
      expiresAt: null,
      expiredFrom: null,
      cacheRecord: null
    };
  }

  function readStoredEntitlement() {
    try {
      var storage = root && root.localStorage;
      if (!storage) return null;
      var parsed = JSON.parse(storage.getItem(CACHE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeStoredEntitlement(record) {
    try {
      var storage = root && root.localStorage;
      if (!storage || !record) return;
      storage.setItem(CACHE_KEY, JSON.stringify(record));
    } catch (e) {}
  }

  function modulesOnTile(tile) {
    if (!tile) return [];
    if (Array.isArray(tile.modules)) return tile.modules.slice();
    var mods = [];
    (tile.subgroups || []).forEach(function (group) {
      (group && group.modules || []).forEach(function (mod) { mods.push(mod); });
    });
    return mods;
  }

  function presentModules(tile, license, extras) {
    var mods = modulesOnTile(tile);
    if (!license) return mods;
    (extras || []).forEach(function (extra) {
      if (!extra || !extra.module || extra.tileId !== tile.id) return;
      if (mods.some(function (mod) { return mod.id === extra.module.id; })) return;
      mods.push(extra.module);
    });
    return mods.map(function (mod) {
      var copy = {};
      Object.keys(mod || {}).forEach(function (key) { copy[key] = mod[key]; });
      copy.locked = !planAllows(license.plan, mod && mod.id);
      return copy;
    });
  }

  function setCurrent(license) {
    current = license || null;
  }

  function isModuleLocked(moduleId) {
    if (!current) return false;
    return !planAllows(current.plan, moduleId);
  }

  return {
    FREE_MODULE_IDS: FREE_MODULE_IDS.slice(),
    CACHE_TTL_MS: CACHE_TTL_MS,
    normalizePlan: normalizePlan,
    normalizeEmail: normalizeEmail,
    planAllows: planAllows,
    effectivePlan: effectivePlan,
    cacheIsUsable: cacheIsUsable,
    readChannel: readChannel,
    resolveEntitlement: resolveEntitlement,
    readStoredEntitlement: readStoredEntitlement,
    writeStoredEntitlement: writeStoredEntitlement,
    presentModules: presentModules,
    setCurrent: setCurrent,
    isModuleLocked: isModuleLocked,
    openEarlyAccess: null
  };
});
