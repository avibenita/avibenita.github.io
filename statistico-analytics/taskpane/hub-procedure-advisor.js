/**
 * Procedure Advisor — 3-question flow to recommend an analytics procedure.
 */
(function (global) {
  "use strict";

  var state = { step: 0, answers: {} };

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  var RECOMMENDATIONS = {
    univariate: {
      moduleId: "univariate",
      label: "Univariate",
      category: "Explore Data",
      reason: "Start with one variable — distributions, outliers, and normality checks."
    },
    correlations: {
      moduleId: "correlations",
      label: "Correlation",
      category: "Explore Data",
      reason: "Explore associations and correlation patterns across numeric variables."
    },
    independent: {
      moduleId: "independent",
      label: "Independent",
      category: "Compare Means",
      reason: "Compare means between two independent groups."
    },
    dependent: {
      moduleId: "dependent",
      label: "Repeated",
      category: "Compare Means",
      reason: "Compare paired or repeated measurements on the same cases."
    },
    anova: {
      moduleId: "anova",
      label: "ANOVA",
      category: "Compare Groups",
      reason: "Compare means across three or more groups with post-hoc support."
    },
    mixed: {
      moduleId: "mixed",
      label: "Mixed",
      category: "Compare Groups",
      reason: "Handle grouped, nested, or repeated-measures designs with mixed models."
    },
    regression: {
      moduleId: "regression",
      label: "Regression",
      category: "Build Models",
      reason: "Model a numeric outcome from one or more predictors."
    },
    logistic: {
      moduleId: "logistic",
      label: "Logistic",
      category: "Build Models",
      reason: "Model a yes/no or binary outcome with odds ratios."
    },
    pca: {
      moduleId: "pca",
      label: "PCA",
      category: "Discover Structure",
      reason: "Reduce many variables into principal components."
    },
    factor: {
      moduleId: "factor",
      label: "Factor",
      category: "Discover Structure",
      reason: "Extract latent factors with rotation for construct discovery."
    },
    kmeans: {
      moduleId: "kmeans",
      label: "K-Means",
      category: "Find Segments",
      reason: "Partition cases into k groups around centroids."
    },
    hierarchical: {
      moduleId: "hierarchical",
      label: "Hierarchical",
      category: "Find Segments",
      reason: "Build a merge tree and cut clusters from a dendrogram."
    }
  };

  function step1() {
    return {
      key: "goal",
      title: "What do you want to accomplish?",
      subtitle: "Question 1 of 3 — pick the closest match",
      options: [
        { id: "explore", label: "Explore data", desc: "Distributions, patterns, and associations" },
        { id: "compare", label: "Compare groups", desc: "Means or conditions across groups" },
        { id: "predict", label: "Predict outcomes", desc: "Explain or forecast an outcome" },
        { id: "structure", label: "Discover structure", desc: "PCA, factors, or clustering" }
      ]
    };
  }

  function step2() {
    var goal = state.answers.goal;
    if (goal === "explore") {
      return {
        key: "explore_type",
        title: "What are you exploring?",
        subtitle: "Question 2 of 3",
        options: [
          { id: "one", label: "One variable", desc: "Distribution, outliers, normality" },
          { id: "many", label: "Relationships", desc: "Correlations between variables" }
        ]
      };
    }
    if (goal === "compare") {
      return {
        key: "compare_design",
        title: "What is your comparison design?",
        subtitle: "Question 2 of 3",
        options: [
          { id: "two_indep", label: "Two independent groups", desc: "Different subjects in each group" },
          { id: "paired", label: "Paired / repeated", desc: "Same subjects measured twice or more" },
          { id: "multi", label: "Three or more groups", desc: "Compare several group means" },
          { id: "mixed", label: "Grouped or nested design", desc: "Random effects or complex grouping" }
        ]
      };
    }
    if (goal === "predict") {
      return {
        key: "outcome_type",
        title: "What type of outcome are you modeling?",
        subtitle: "Question 2 of 3",
        options: [
          { id: "continuous", label: "Numeric outcome", desc: "Continuous Y — regression" },
          { id: "binary", label: "Yes / no outcome", desc: "Binary Y — logistic regression" }
        ]
      };
    }
    return {
      key: "structure_type",
      title: "What kind of structure do you need?",
      subtitle: "Question 2 of 3",
      options: [
        { id: "pca", label: "Reduce dimensions", desc: "PCA for compact components" },
        { id: "factor", label: "Latent factors", desc: "Factor analysis with rotation" },
        { id: "kmeans", label: "Fixed k segments", desc: "K-means clustering" },
        { id: "hierarchical", label: "Merge tree", desc: "Hierarchical clustering" }
      ]
    };
  }

  function step3() {
    if (state.answers.goal === "compare" && state.answers.compare_design === "multi") {
      return {
        key: "multi_complexity",
        title: "Any random effects or nesting?",
        subtitle: "Question 3 of 3",
        options: [
          { id: "simple", label: "No — standard groups", desc: "One-way ANOVA is enough" },
          { id: "complex", label: "Yes — nested or repeated", desc: "Use a mixed model" }
        ]
      };
    }
    if (state.answers.goal === "explore" && state.answers.explore_type === "many") {
      return {
        key: "explore_focus",
        title: "Where should you start?",
        subtitle: "Question 3 of 3",
        options: [
          { id: "matrix", label: "Correlation matrix", desc: "See all pairwise associations" },
          { id: "single", label: "One variable first", desc: "Inspect a single distribution" }
        ]
      };
    }
    return null;
  }

  function resolveRecommendation() {
    var g = state.answers.goal;
    if (g === "explore") {
      if (state.answers.explore_type === "one") return RECOMMENDATIONS.univariate;
      if (state.answers.explore_focus === "single") return RECOMMENDATIONS.univariate;
      return RECOMMENDATIONS.correlations;
    }
    if (g === "compare") {
      var d = state.answers.compare_design;
      if (d === "two_indep") return RECOMMENDATIONS.independent;
      if (d === "paired") return RECOMMENDATIONS.dependent;
      if (d === "mixed") return RECOMMENDATIONS.mixed;
      if (d === "multi") {
        return state.answers.multi_complexity === "complex"
          ? RECOMMENDATIONS.mixed
          : RECOMMENDATIONS.anova;
      }
    }
    if (g === "predict") {
      return state.answers.outcome_type === "binary"
        ? RECOMMENDATIONS.logistic
        : RECOMMENDATIONS.regression;
    }
    var s = state.answers.structure_type;
    if (s === "pca") return RECOMMENDATIONS.pca;
    if (s === "factor") return RECOMMENDATIONS.factor;
    if (s === "kmeans") return RECOMMENDATIONS.kmeans;
    if (s === "hierarchical") return RECOMMENDATIONS.hierarchical;
    return RECOMMENDATIONS.univariate;
  }

  function getCurrentStepDef() {
    if (state.step === 0) return step1();
    if (state.step === 1) return step2();
    if (state.step === 2) return step3();
    return null;
  }

  function needsStep3() {
    var s3 = step3();
    return !!s3;
  }

  function renderProgress() {
    var total = needsStep3() || state.step >= 2 ? 3 : 3;
    var html = "";
    for (var i = 0; i < 3; i++) {
      var cls = "proc-advisor-dot";
      if (i < state.step) cls += " is-done";
      if (i === state.step) cls += " is-active";
      html += '<span class="' + cls + '"></span>';
    }
    return html;
  }

  function renderQuestion(stepDef) {
    var html =
      '<div class="proc-advisor-progress">' + renderProgress() + "</div>" +
      '<div class="proc-advisor-q">' + escapeHtml(stepDef.title) + "</div>" +
      '<div class="proc-advisor-sub">' + escapeHtml(stepDef.subtitle) + "</div>" +
      '<div class="proc-advisor-options">';
    stepDef.options.forEach(function (opt) {
      html +=
        '<button type="button" class="proc-advisor-opt" data-opt-id="' + escapeHtml(opt.id) + '">' +
        '<span class="proc-advisor-opt-label">' + escapeHtml(opt.label) + "</span>" +
        '<span class="proc-advisor-opt-desc">' + escapeHtml(opt.desc) + "</span>" +
        "</button>";
    });
    html += "</div>";
    return html;
  }

  function renderResult(rec) {
    return (
      '<div class="proc-advisor-progress">' +
      '<span class="proc-advisor-dot is-done"></span><span class="proc-advisor-dot is-done"></span><span class="proc-advisor-dot is-done"></span>' +
      "</div>" +
      '<div class="proc-advisor-result-kicker">Recommended procedure</div>' +
      '<div class="proc-advisor-result-title">' + escapeHtml(rec.category) + " · " + escapeHtml(rec.label) + "</div>" +
      '<p class="proc-advisor-result-why">' + escapeHtml(rec.reason) + "</p>" +
      '<div class="proc-advisor-actions">' +
      '<button type="button" class="proc-advisor-btn proc-advisor-btn--ghost" id="procAdvisorBack">Back</button>' +
      '<button type="button" class="proc-advisor-btn proc-advisor-btn--primary" id="procAdvisorOpen" data-module-id="' + escapeHtml(rec.moduleId) + '">Open ' + escapeHtml(rec.label) + "</button>" +
      "</div>"
    );
  }

  function bindQuestionHandlers(stepDef) {
    var body = getEl("procAdvisorBody");
    if (!body) return;
    body.querySelectorAll(".proc-advisor-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.answers[stepDef.key] = btn.getAttribute("data-opt-id");
        advance();
      });
    });
  }

  function bindResultHandlers(rec) {
    var back = getEl("procAdvisorBack");
    var open = getEl("procAdvisorOpen");
    if (back) {
      back.addEventListener("click", function () {
        state.step = needsStep3AfterAnswers() ? 2 : 1;
        renderBody();
      });
    }
    if (open) {
      open.addEventListener("click", function () {
        close();
        if (typeof global.navigateToModule === "function") {
          global.navigateToModule(rec.moduleId);
        }
        if (typeof global.setSelectedModuleCard === "function") {
          global.setSelectedModuleCard(rec.moduleId, true);
        }
      });
    }
  }

  function needsStep3AfterAnswers() {
    if (state.answers.goal === "compare" && state.answers.compare_design === "multi") return true;
    if (state.answers.goal === "explore" && state.answers.explore_type === "many") return true;
    return false;
  }

  function advance() {
    if (state.step === 0) {
      state.step = 1;
      renderBody();
      return;
    }
    if (state.step === 1) {
      if (needsStep3AfterAnswers()) {
        state.step = 2;
        renderBody();
      } else {
        showResult();
      }
      return;
    }
    if (state.step === 2) {
      showResult();
    }
  }

  function showResult() {
    state.step = 3;
    var rec = resolveRecommendation();
    var body = getEl("procAdvisorBody");
    var foot = getEl("procAdvisorFoot");
    if (body) {
      body.innerHTML = renderResult(rec);
      bindResultHandlers(rec);
    }
    if (foot) foot.innerHTML = "";
  }

  function renderBody() {
    var body = getEl("procAdvisorBody");
    var foot = getEl("procAdvisorFoot");
    if (!body) return;

    if (state.step >= 3) {
      showResult();
      return;
    }

    var stepDef = getCurrentStepDef();
    if (!stepDef) {
      showResult();
      return;
    }

    body.innerHTML = renderQuestion(stepDef);
    bindQuestionHandlers(stepDef);

    if (foot) {
      foot.innerHTML =
        (state.step > 0
          ? '<button type="button" class="proc-advisor-btn proc-advisor-btn--ghost" id="procAdvisorPrev">Back</button>'
          : "") +
        '<button type="button" class="proc-advisor-btn proc-advisor-btn--ghost" id="procAdvisorCancel">Cancel</button>';
      var prev = getEl("procAdvisorPrev");
      var cancel = getEl("procAdvisorCancel");
      if (prev) {
        prev.addEventListener("click", function () {
          if (state.step === 2) {
            delete state.answers.multi_complexity;
            delete state.answers.explore_focus;
          }
          if (state.step === 1) {
            delete state.answers.explore_type;
            delete state.answers.compare_design;
            delete state.answers.outcome_type;
            delete state.answers.structure_type;
          }
          state.step = Math.max(0, state.step - 1);
          renderBody();
        });
      }
      if (cancel) cancel.addEventListener("click", close);
    }
  }

  function open() {
    state = { step: 0, answers: {} };
    var overlay = getEl("procAdvisorOverlay");
    if (!overlay) return;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    renderBody();
  }

  function close() {
    var overlay = getEl("procAdvisorOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function init() {
    var overlay = getEl("procAdvisorOverlay");
    if (!overlay) return;
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    var closeBtn = getEl("procAdvisorClose");
    if (closeBtn) closeBtn.addEventListener("click", close);
  }

  global.StatisticoProcedureAdvisor = { open: open, close: close, init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);
