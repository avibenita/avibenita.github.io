/* global globalThis */
/**
 * Family-first task-pane home.
 *
 * The previous cluster accordion (Statistical Methods, Interactive Calculators,
 * Specialized Tools) stays in hub-app-apps.js. Set HUB_USE_LEGACY_STRUCTURE
 * there to show it again. This file only decides which catalog modules appear
 * in the family home and how those rows are marked up.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StatisticoHubFamily = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var RETURN_FAMILY_KEY = "statistico.hub.returnFamily";

  var HOME_FAMILIES = [
    {
      id: "explore",
      label: "Explore data",
      description: "Summarize variables and find patterns and relationships.",
      icon: "fa-chart-bar",
      moduleIds: ["univariate", "correlations", "pca", "factor"]
    },
    {
      id: "compare",
      label: "Compare groups & conditions",
      description: "Compare independent groups, paired data, or repeated measurements.",
      icon: "fa-scale-balanced",
      moduleIds: ["independent", "anova", "dependent"]
    },
    {
      id: "model",
      label: "Model outcomes",
      description: "Estimate effects and predict numeric or binary outcomes.",
      icon: "fa-chart-line",
      moduleIds: ["regression", "logistic", "mixed"]
    }
  ];

  var MORE_TOOLS = [
    {
      id: "power",
      label: "Power & Sample Size",
      description: "Plan a study or check its power.",
      icon: "fa-bolt",
      direct: true,
      moduleIds: ["calc-power"]
    },
    {
      id: "quality",
      label: "Quality & Process Improvement",
      description: "Prioritize issues and assess process or measurement performance.",
      icon: "fa-industry",
      moduleIds: ["pareto2080", "capability-range", "gage-rr"]
    }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function jsId(value) {
    return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function getFamilySpec(id) {
    var all = HOME_FAMILIES.concat(MORE_TOOLS);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function visibleModuleIds(spec, catalog) {
    var ids = [];
    (spec.moduleIds || []).forEach(function (id) {
      var row = catalog && catalog[id];
      if (!row || row.hidden) return;
      ids.push(id);
    });
    return ids;
  }

  function packFamily(spec, catalog) {
    return {
      id: spec.id,
      label: spec.label,
      description: spec.description,
      icon: spec.icon,
      direct: !!spec.direct,
      moduleIds: visibleModuleIds(spec, catalog)
    };
  }

  function buildNavigationModel(catalog) {
    return {
      families: HOME_FAMILIES.map(function (spec) {
        return packFamily(spec, catalog);
      }).filter(function (family) { return family.moduleIds.length > 0; }),
      more: MORE_TOOLS.map(function (spec) {
        return packFamily(spec, catalog);
      }).filter(function (family) { return family.moduleIds.length > 0; })
    };
  }

  function shouldApplyLaunchResult(launchEpoch, currentEpoch) {
    return launchEpoch === currentEpoch;
  }

  function iconHtml(icon, iconSvg) {
    if (iconSvg) return iconSvg;
    return '<i class="fa-solid ' + escapeHtml(icon || "fa-table-cells") + '" aria-hidden="true"></i>';
  }

  function rowHtml(opts) {
    var badges = "";
    if (opts.comingSoon) badges += ' <span class="soon-badge">Soon</span>';
    if (opts.locked) badges += ' <span class="plan-badge">Professional</span>';
    var desc = opts.description
      ? '<span class="hub-family-desc">' + escapeHtml(opts.description) + "</span>"
      : "";
    var familyAttr = opts.familyId
      ? ' data-family-id="' + escapeHtml(opts.familyId) + '"'
      : "";
    var moduleAttr = opts.moduleId
      ? ' data-module-id="' + escapeHtml(opts.moduleId) + '"'
      : "";
    return (
      '<button type="button" class="hub-family-row' + (opts.locked ? " hub-family-row--locked" : "") + '"' +
      familyAttr + moduleAttr + ' onclick="' + opts.onclick + '">' +
      '<span class="hub-family-icon">' + iconHtml(opts.icon, opts.iconSvg) + "</span>" +
      '<span class="hub-family-copy">' +
      '<span class="hub-family-title">' + escapeHtml(opts.label) + badges + "</span>" +
      desc +
      "</span>" +
      '<i class="fa-solid fa-chevron-right hub-family-chevron" aria-hidden="true"></i>' +
      "</button>"
    );
  }

  function errorHtml(error) {
    if (!error || !error.label) return "";
    var id = jsId(error.moduleId);
    return (
      '<div class="hub-family-error" role="alert">' +
      "<span>" + escapeHtml(error.label) + " could not be opened.</span>" +
      '<button type="button" onclick="retryHubFamilyModule(\'' + id + '\')">Retry</button>' +
      "</div>"
    );
  }

  function renderHomeHtml(model, error) {
    var families = (model && model.families) || [];
    var more = (model && model.more) || [];
    var html = '<h2 class="hub-family-heading" id="hubFamilyHeading">Choose an analysis</h2>';
    html += errorHtml(error);
    html += '<div class="hub-family-list">';
    families.forEach(function (family) {
      html += rowHtml({
        familyId: family.id,
        label: family.label,
        description: family.description,
        icon: family.icon,
        onclick: "openHubFamily('" + jsId(family.id) + "')"
      });
    });
    html += "</div>";
    if (more.length) {
      html += '<div class="hub-family-more">More tools</div><div class="hub-family-list">';
      more.forEach(function (family) {
        var onclick = family.direct
          ? "openHubPower()"
          : "openHubFamily('" + jsId(family.id) + "')";
        html += rowHtml({
          familyId: family.id,
          label: family.label,
          description: family.description,
          icon: family.icon,
          onclick: onclick
        });
      });
      html += "</div>";
    }
    return html;
  }

  function renderFamilyHtml(spec, modules, error) {
    var meta = spec || { id: "", label: "Analysis", description: "" };
    var list = modules || [];
    var html =
      '<button type="button" class="hub-family-back" id="hubFamilyBack" onclick="closeHubFamily()">← All families</button>' +
      '<h2 class="hub-family-heading" id="hubFamilyHeading">' + escapeHtml(meta.label) + "</h2>" +
      (meta.description ? '<p class="hub-family-lead">' + escapeHtml(meta.description) + "</p>" : "") +
      errorHtml(error);
    if (!list.length) {
      html += '<p class="hub-family-empty">No modules are available in this family</p>';
      return html;
    }
    html += '<div class="hub-family-list">';
    list.forEach(function (mod) {
      html += rowHtml({
        moduleId: mod.id,
        label: mod.label || mod.id,
        description: mod.description || "",
        icon: mod.icon,
        iconSvg: mod.iconSvg,
        locked: !!mod.locked,
        comingSoon: !!mod.comingSoon,
        onclick: "launchHubFamilyModule('" + jsId(mod.id) + "')"
      });
    });
    html += "</div>";
    return html;
  }

  return {
    RETURN_FAMILY_KEY: RETURN_FAMILY_KEY,
    HOME_FAMILIES: HOME_FAMILIES,
    MORE_TOOLS: MORE_TOOLS,
    getFamilySpec: getFamilySpec,
    buildNavigationModel: buildNavigationModel,
    shouldApplyLaunchResult: shouldApplyLaunchResult,
    renderHomeHtml: renderHomeHtml,
    renderFamilyHtml: renderFamilyHtml
  };
});
