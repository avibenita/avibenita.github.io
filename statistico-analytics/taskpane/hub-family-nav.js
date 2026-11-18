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
      label: "Explore & summarize",
      tagline: "See what’s in your data.",
      help: "Start with Univariate for one variable or Correlations for associations. Use PCA or Factor Analysis to study patterns across variables, and clustering to group similar observations.",
      icon: "fa-chart-bar",
      accent: "explore",
      modules: [
        { divider: "Summaries & relationships" },
        { id: "univariate", label: "Univariate" },
        { id: "correlations", label: "Correlations" },
        { divider: "Components & factors" },
        { id: "pca", label: "PCA" },
        { id: "factor", label: "Factor Analysis" },
        { divider: "Clustering" },
        { id: "hierarchical", label: "Hierarchical Clustering" },
        { id: "kmeans", label: "K-means" }
      ]
    },
    {
      id: "compare",
      label: "Compare groups & conditions",
      tagline: "Check whether groups or measurements differ.",
      help: "Use independent groups for different people or units, and paired or repeated measures for the same subjects. Use contingency tables for categorical counts. Those compare groups or conditions within a study. Meta-analysis combines effect estimates across studies.",
      icon: "fa-scale-balanced",
      accent: "compare",
      modules: [
        { id: "independent", label: "Independent Groups" },
        { id: "dependent", label: "Paired / Repeated Measures" },
        { id: "anova", label: "ANOVA" },
        { id: "contingency", label: "Contingency Tables" },
        { divider: "Across studies" },
        { id: "meta-analysis", label: "Meta-analysis", description: "Combine effect estimates across studies." }
      ]
    },
    {
      id: "model",
      label: "Model outcomes",
      tagline: "Estimate effects and make predictions.",
      help: "Choose linear regression for a numeric outcome and logistic regression for a binary outcome. Choose a mixed model when numeric observations are grouped or repeated.",
      icon: "fa-chart-line",
      accent: "model",
      modules: [
        { id: "regression", label: "Linear Regression" },
        { id: "logistic", label: "Logistic Regression" },
        { id: "mixed", label: "Mixed Models" }
      ]
    }
  ];

  var MORE_TOOLS = [
    {
      id: "planning",
      label: "Calculators & study planning",
      tagline: "Plan a study, explore probability, or size staffing.",
      help: "Power planning, precision, and probability calculators can begin with assumptions. Use the call-center calculator for staffing and service-level questions.",
      icon: "fa-calculator",
      accent: "planning",
      modules: [
        { id: "calc-power", label: "Power & Sample Size" },
        { id: "calc-precision", label: "Precision Planning" },
        { id: "calc-distribution-hub", label: "Probability Distributions" },
        { id: "calc-erlang", label: "Call Center Staffing" }
      ]
    },
    {
      id: "quality",
      label: "Quality & process improvement",
      tagline: "Prioritize problems and assess process performance.",
      help: "Start with Pareto to identify the largest contributors. Use Gage R&R to assess the measurement system, capability to compare a process with specifications, and optimization to compare candidate settings. Pareto is a proprietary innovation.",
      icon: "fa-sliders",
      accent: "quality",
      modules: [
        { id: "pareto2080", label: "Pareto Analysis", mark: true },
        { id: "process-settings", label: "Process Optimization" },
        { id: "gage-rr", label: "Gage R&R" },
        { id: "capability-range", label: "Process Capability" }
      ]
    },
    {
      id: "survey",
      label: "Survey analysis",
      tagline: "See what separates groups and check multi-item scales.",
      help: "Use Split Index to see which factors differentiate two respondent groups. Use scale reliability to assess consistency among items intended to measure the same construct. Split Index is a proprietary innovation.",
      icon: "fa-list-check",
      accent: "survey",
      modules: [
        { id: "split-index", label: "Split Index", mark: true },
        { id: "reliability", label: "Scale Reliability" }
      ]
    },
    {
      id: "utilities",
      label: "Data & reporting tools",
      tagline: "Prepare data, make charts, and share results.",
      help: "Use Prepare Data before analysis, 3D Charts to visualize data, and Publication Tables or EzPaste to share outputs. EzPaste is a proprietary innovation.",
      icon: "fa-wrench",
      accent: "utilities",
      modules: [
        { id: "prepare-data", label: "Prepare Data" },
        { id: "multivariable", label: "3D Charts" },
        { id: "publication-tables", label: "Publication Tables" },
        { id: "ezpaste-open", label: "EzPaste", mark: true }
      ]
    }
  ];

  var LAUNCHER_SECTIONS = [
    { id: "analysis", label: "Statistical analysis", familyIds: ["explore", "compare", "model"] },
    { id: "tools", label: "Planning, quality & utilities", familyIds: ["planning", "quality", "survey", "utilities"] }
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

  function allFamilySpecs() {
    return HOME_FAMILIES.concat(MORE_TOOLS);
  }

  function getFamilySpec(id) {
    var all = allFamilySpecs();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function specModules(spec) {
    return (spec.modules || []).map(function (entry) {
      if (entry && entry.divider) return { divider: entry.divider };
      if (typeof entry === "string") return { id: entry, label: entry };
      return { id: entry.id, label: entry.label || entry.id, description: entry.description || "", mark: !!entry.mark };
    });
  }

  function visibleModules(spec, catalog) {
    var modules = [];
    var pendingDivider = null;
    specModules(spec).forEach(function (entry) {
      if (entry.divider) {
        pendingDivider = entry;
        return;
      }
      var row = catalog && catalog[entry.id];
      if (!row || row.hidden) return;
      if (pendingDivider) {
        modules.push({ divider: pendingDivider.divider });
        pendingDivider = null;
      }
      modules.push({
        id: entry.id,
        label: entry.label,
        description: entry.description || row.description || "",
        mark: !!entry.mark,
        locked: !!row.locked,
        comingSoon: !!row.comingSoon
      });
    });
    return modules;
  }

  function packFamily(spec, catalog) {
    var modules = visibleModules(spec, catalog);
    return {
      id: spec.id,
      label: spec.label,
      description: spec.tagline || "",
      tagline: spec.tagline || "",
      help: spec.help || "",
      icon: spec.icon,
      accent: spec.accent || spec.id,
      direct: !!spec.direct,
      moduleIds: modules.filter(function (mod) { return mod.id; }).map(function (mod) { return mod.id; }),
      modules: modules
    };
  }

  function buildNavigationModel(catalog) {
    var packed = {};
    allFamilySpecs().forEach(function (spec) {
      var family = packFamily(spec, catalog);
      if (family.moduleIds.length) packed[family.id] = family;
    });
    var sections = LAUNCHER_SECTIONS.map(function (section) {
      return {
        id: section.id,
        label: section.label,
        families: section.familyIds.map(function (id) { return packed[id]; }).filter(Boolean)
      };
    }).filter(function (section) { return section.families.length > 0; });
    return {
      sections: sections,
      families: HOME_FAMILIES.map(function (spec) { return packed[spec.id]; }).filter(Boolean),
      more: MORE_TOOLS.map(function (spec) { return packed[spec.id]; }).filter(Boolean)
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

  function cardHtml(family) {
    var id = jsId(family.id);
    var helpId = "hub-family-help-" + id;
    var bodyId = "hub-family-body-" + id;
    var html = '<section class="hub-family-card" data-family="' + escapeHtml(family.accent || family.id) + '">';
    html += '<div class="hub-family-card-head">';
    html += '<button type="button" class="hub-family-toggle" aria-expanded="false" aria-controls="' + bodyId + '" onclick="toggleHubFamilyCard(\'' + id + '\')">';
    html += '<span class="hub-family-icon">' + iconHtml(family.icon) + "</span>";
    html += '<span class="hub-family-copy"><span class="hub-family-title">' + escapeHtml(family.label) + "</span></span>";
    html += '<i class="fa-solid fa-chevron-down hub-family-caret" aria-hidden="true"></i>';
    html += "</button>";
    html += '<button type="button" class="hub-family-info" aria-label="About ' + escapeHtml(family.label) + '" aria-controls="' + helpId + '" aria-expanded="false" onclick="toggleHubFamilyHelp(\'' + id + '\')"><i class="fa-solid fa-circle-info" aria-hidden="true"></i></button>';
    html += "</div>";
    var helpText = [family.tagline, family.help].filter(function (part, index, list) {
      return part && list.indexOf(part) === index;
    }).join(" ");
    html += '<div class="hub-family-body" id="' + bodyId + '" hidden>';
    html += '<div class="hub-family-body-clip">';
    html += '<p class="hub-family-help" id="' + helpId + '" hidden>' + escapeHtml(helpText) + "</p>";
    html += '<div class="hub-family-modules">';
    var groupIndex = 0;
    var groupOpen = false;
    function closeGroup() {
      if (!groupOpen) return;
      html += "</div>";
      groupOpen = false;
    }
    function openGroup(label) {
      closeGroup();
      html += '<div class="hub-family-group" style="--group-i:' + groupIndex + '">';
      groupIndex += 1;
      groupOpen = true;
      if (label) html += '<p class="hub-family-divider"><span>' + escapeHtml(label) + "</span></p>";
    }
    (family.modules || []).forEach(function (mod) {
      if (mod.divider) {
        openGroup(mod.divider);
        return;
      }
      if (!groupOpen) openGroup("");
      var badges = "";
      if (mod.comingSoon) badges += ' <span class="soon-badge">Soon</span>';
      if (mod.locked) badges += ' <span class="plan-badge">Professional</span>';
      var detail = mod.description && mod.description !== mod.label ? mod.description : "";
      var purposeAttr = detail ? ' data-purpose="' + escapeHtml(detail) + '"' : "";
      html += '<button type="button" class="hub-family-module' + (mod.locked ? " hub-family-module--locked" : "") + '" data-module-id="' + escapeHtml(mod.id) + '"' + purposeAttr + ' onclick="launchHubFamilyModule(\'' + jsId(mod.id) + '\')">';
      html += "<span>" + escapeHtml(mod.label) + (mod.mark ? "<sup>TM</sup>" : "") + badges + "</span>";
      html += '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
      html += "</button>";
    });
    closeGroup();
    html += "</div></div></div></section>";
    return html;
  }

  function renderHomeHtml(model, error) {
    var sections = (model && model.sections) || [];
    var html = errorHtml(error);
    sections.forEach(function (section) {
      html += '<h3 class="hub-launcher-section">' + escapeHtml(section.label) + "</h3>";
      html += '<div class="hub-launcher-stack">';
      (section.families || []).forEach(function (family) {
        html += cardHtml(family);
      });
      html += "</div>";
    });
    return html;
  }

  function renderFamilyHtml(spec, modules, error) {
    var meta = spec || { id: "", label: "Analysis", description: "" };
    var list = modules || [];
    var html =
      '<button type="button" class="hub-family-back" id="hubFamilyBack" onclick="closeHubFamily()">← All families</button>' +
      '<h2 class="hub-family-heading" id="hubFamilyHeading">' + escapeHtml(meta.label) + "</h2>" +
      ((meta.tagline || meta.description) ? '<p class="hub-family-lead">' + escapeHtml(meta.tagline || meta.description) + "</p>" : "") +
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
