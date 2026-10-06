/* global globalThis */
/**
 * Module entitlement for scoped hubs (AppSource and similar packages).
 *
 * A missing allow-list means the full product: every module in the production
 * catalog can open. A present allow-list keeps that same catalog and navigation,
 * and only the listed module ids remain launchable.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StatisticoHubEntitlement = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function addId(ids, id) {
    var key = String(id || "").trim();
    if (!key) return false;
    ids[key] = true;
    return true;
  }

  function collectFromTiles(tiles, ids) {
    var found = false;
    if (!tiles || typeof tiles !== "object") return false;
    Object.keys(tiles).forEach(function (clusterId) {
      (tiles[clusterId] || []).forEach(function (tile) {
        (tile && tile.modules || []).forEach(function (mod) {
          if (addId(ids, mod && mod.id)) found = true;
        });
        (tile && tile.subgroups || []).forEach(function (group) {
          (group && group.modules || []).forEach(function (mod) {
            if (addId(ids, mod && mod.id)) found = true;
          });
        });
      });
    });
    return found;
  }

  /**
   * @returns {Object<string, boolean>|null} null when the config does not restrict modules
   */
  function collectModuleIds(scopeCfg) {
    if (!scopeCfg || typeof scopeCfg !== "object") return null;
    var ids = {};
    var explicit = scopeCfg.entitledModules;
    if (Array.isArray(explicit)) {
      var foundExplicit = false;
      explicit.forEach(function (id) {
        if (addId(ids, id)) foundExplicit = true;
      });
      return foundExplicit ? ids : {};
    }
    return collectFromTiles(scopeCfg.clusterTiles, ids) ? ids : null;
  }

  function isAllowed(allow, moduleId) {
    if (!allow) return true;
    return !!allow[String(moduleId || "").trim()];
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

  /**
   * Modules from the production tile that this allow-list can open.
   * Extras are appended only when an allow-list is active and includes them.
   */
  function visibleModules(tile, allow, extras) {
    var mods = modulesOnTile(tile);
    if (!allow) return mods;
    mods = mods.filter(function (mod) { return mod && isAllowed(allow, mod.id); });
    (extras || []).forEach(function (extra) {
      if (!extra || !extra.module || extra.tileId !== (tile && tile.id)) return;
      if (!isAllowed(allow, extra.module.id)) return;
      if (mods.some(function (mod) { return mod.id === extra.module.id; })) return;
      mods.push(extra.module);
    });
    return mods;
  }

  return {
    collectModuleIds: collectModuleIds,
    isAllowed: isAllowed,
    visibleModules: visibleModules
  };
});
