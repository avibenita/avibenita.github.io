/**
 * Procedure Advisor — 3-question flow to recommend an analytics procedure.
 */
(function (global) {
  "use strict";

  var state = { step: 0, answers: {}, learnOpen: false };

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
      titleFull: "Univariate Analysis",
      category: "Explore Data",
      difficulty: "Easy",
      duration: "≈ 1 min",
      reason: "You want to explore a single variable and assess its distribution, outliers, and normality.",
      learnWhy: {
        assumptions: ["One variable of interest", "Observations are independent"],
        variables: ["One numeric or categorical column"],
        outputs: ["Descriptive statistics", "Distribution plots", "Normality and outlier checks"]
      }
    },
    correlations: {
      moduleId: "correlations",
      label: "Correlation",
      titleFull: "Correlation Analysis",
      category: "Explore Data",
      difficulty: "Easy",
      duration: "≈ 1 min",
      reason: "You want to see how numeric variables move together before modeling or comparing groups.",
      learnWhy: {
        assumptions: ["Numeric variables", "Linear association is meaningful for your question"],
        variables: ["Two or more numeric columns"],
        outputs: ["Correlation matrix", "Pairwise coefficients", "Significance indicators"]
      }
    },
    independent: {
      moduleId: "independent",
      label: "Independent",
      titleFull: "Independent Samples Comparison",
      category: "Compare Means",
      difficulty: "Easy",
      duration: "≈ 1 min",
      reason: "You have two separate groups and want to compare their means on one outcome.",
      learnWhy: {
        assumptions: ["Two independent groups", "Approximately normal outcome or adequate sample size"],
        variables: ["One numeric outcome", "One grouping variable (2 levels)"],
        outputs: ["Group means", "Mean difference", "Confidence interval and p-value"]
      }
    },
    dependent: {
      moduleId: "dependent",
      label: "Repeated",
      titleFull: "Repeated Measures Comparison",
      category: "Compare Means",
      difficulty: "Easy",
      duration: "≈ 1 min",
      reason: "The same subjects were measured more than once, so paired or repeated comparisons apply.",
      learnWhy: {
        assumptions: ["Paired or repeated measurements", "Differences are reasonably symmetric"],
        variables: ["One numeric outcome measured twice (or more)", "Subject identifier"],
        outputs: ["Paired mean difference", "Confidence interval", "Effect size"]
      }
    },
    anova: {
      moduleId: "anova",
      label: "ANOVA",
      titleFull: "One-Way ANOVA",
      category: "Compare Groups",
      difficulty: "Medium",
      duration: "≈ 3 min",
      reason: "You have three or more independent groups and want to compare their means with post-hoc follow-ups.",
      learnWhy: {
        assumptions: ["Three or more independent groups", "Outcome is numeric", "Homogeneity of variance"],
        variables: ["One numeric outcome", "One grouping variable (3+ levels)"],
        outputs: ["F-test", "Group means", "Post-hoc pairwise comparisons"]
      }
    },
    mixed: {
      moduleId: "mixed",
      label: "Mixed",
      titleFull: "Mixed Models",
      category: "Compare Groups",
      difficulty: "Advanced",
      duration: "≈ 5 min",
      reason: "Your design includes nesting, random effects, or repeated measures that a simple ANOVA cannot handle.",
      learnWhy: {
        assumptions: ["Grouped, nested, or repeated design", "Outcome is numeric"],
        variables: ["Outcome column", "Fixed and random effect factors"],
        outputs: ["Fixed-effect estimates", "Random-effect variance", "Model fit diagnostics"]
      }
    },
    regression: {
      moduleId: "regression",
      label: "Regression",
      titleFull: "Linear Regression",
      category: "Build Models",
      difficulty: "Medium",
      duration: "≈ 3 min",
      reason: "You want to explain or predict a numeric outcome from one or more predictors.",
      learnWhy: {
        assumptions: ["Numeric outcome", "Linear relationship with predictors", "Independent residuals"],
        variables: ["One numeric outcome (Y)", "One or more predictor columns"],
        outputs: ["Coefficients", "R-squared", "Confidence intervals and diagnostics"]
      }
    },
    logistic: {
      moduleId: "logistic",
      label: "Logistic",
      titleFull: "Logistic Regression",
      category: "Build Models",
      difficulty: "Medium",
      duration: "≈ 3 min",
      reason: "Your outcome is yes/no (or binary) and you want odds ratios for predictors.",
      learnWhy: {
        assumptions: ["Binary outcome", "Independent observations", "Linear relationship on the log-odds scale"],
        variables: ["One binary outcome (Y)", "One or more predictor columns"],
        outputs: ["Odds ratios", "Model fit statistics", "Classification diagnostics"]
      }
    },
    pca: {
      moduleId: "pca",
      label: "PCA",
      titleFull: "Principal Component Analysis",
      category: "Discover Structure",
      difficulty: "Medium",
      duration: "≈ 3 min",
      reason: "You have many numeric variables and want a compact set of components that capture most variance.",
      learnWhy: {
        assumptions: ["Several numeric variables", "Linear combinations are meaningful"],
        variables: ["Multiple numeric columns"],
        outputs: ["Component loadings", "Scree plot", "Reduced-dimension scores"]
      }
    },
    factor: {
      moduleId: "factor",
      label: "Factor",
      titleFull: "Factor Analysis",
      category: "Discover Structure",
      difficulty: "Medium",
      duration: "≈ 3 min",
      reason: "You suspect latent constructs drive several observed variables and want rotated factors.",
      learnWhy: {
        assumptions: ["Multiple related items or scales", "Latent structure is plausible"],
        variables: ["Multiple numeric indicator columns"],
        outputs: ["Factor loadings", "Rotation results", "Communalities"]
      }
    },
    kmeans: {
      moduleId: "kmeans",
      label: "K-Means",
      titleFull: "K-Means Clustering",
      category: "Find Segments",
      difficulty: "Medium",
      duration: "≈ 3 min",
      reason: "You want to partition cases into k groups when you already have a target number of segments.",
      learnWhy: {
        assumptions: ["Numeric features for clustering", "Clusters are roughly spherical"],
        variables: ["Multiple numeric columns", "Chosen number of clusters (k)"],
        outputs: ["Cluster assignments", "Centroids", "Within-cluster sum of squares"]
      }
    },
    hierarchical: {
      moduleId: "hierarchical",
      label: "Hierarchical",
      titleFull: "Hierarchical Clustering",
      category: "Find Segments",
      difficulty: "Medium",
      duration: "≈ 3 min",
      reason: "You want to explore how cases merge into groups and cut the tree at the level you prefer.",
      learnWhy: {
        assumptions: ["Numeric features for clustering", "A distance measure fits your data"],
        variables: ["Multiple numeric columns"],
        outputs: ["Dendrogram", "Cluster assignments", "Linkage summary"]
      }
    }
  };

  var ALT_KEYS = {
    univariate: ["correlations"],
    correlations: ["regression", "univariate"],
    independent: ["regression", "dependent"],
    dependent: ["independent"],
    anova: ["mixed", "independent"],
    mixed: ["anova"],
    regression: ["correlations", "logistic"],
    logistic: ["regression"],
    pca: ["factor", "correlations"],
    factor: ["pca"],
    kmeans: ["hierarchical"],
    hierarchical: ["kmeans"]
  };

  function step1() {
    return {
      key: "goal",
      title: "What do you want to accomplish?",
      stepLabel: "Question 1 of 3",
      subtitle: "Pick the closest match — we'll suggest a procedure",
      options: [
        { id: "explore", icon: "fa-chart-column", label: "Explore & summarize data", desc: "Distributions, summaries, and first looks" },
        { id: "compare", icon: "fa-scale-balanced", label: "Compare groups", desc: "Means or conditions across groups" },
        { id: "relationships", icon: "fa-link", label: "Analyze relationships", desc: "Associations between variables without a prediction focus" },
        { id: "predict", icon: "fa-bullseye", label: "Build prediction models", desc: "Explain or forecast an outcome" },
        { id: "structure", icon: "fa-puzzle-piece", label: "Reduce dimensions / discover structure", desc: "PCA, factors, or clustering" }
      ]
    };
  }

  function step2() {
    var goal = state.answers.goal;
    if (goal === "explore") {
      return {
        key: "explore_type",
        title: "What are you exploring?",
        stepLabel: "Question 2 of 3",
        subtitle: "We'll narrow to the best starting procedure",
        options: [
          { id: "one", icon: "fa-chart-bar", label: "One variable", desc: "Distribution, outliers, normality" },
          { id: "many", icon: "fa-table-cells", label: "Several variables", desc: "Patterns across multiple columns" }
        ]
      };
    }
    if (goal === "compare") {
      return {
        key: "compare_design",
        title: "What is your comparison design?",
        stepLabel: "Question 2 of 3",
        subtitle: "Match your study design to a comparison procedure",
        options: [
          { id: "two_indep", icon: "fa-users", label: "Two independent groups", desc: "Different subjects in each group" },
          { id: "paired", icon: "fa-arrows-left-right", label: "Paired / repeated", desc: "Same subjects measured twice or more" },
          { id: "multi", icon: "fa-layer-group", label: "Three or more groups", desc: "Compare several group means" },
          { id: "mixed", icon: "fa-sitemap", label: "Grouped or nested design", desc: "Random effects or complex grouping" }
        ]
      };
    }
    if (goal === "relationships") {
      return {
        key: "relationship_type",
        title: "What kind of relationship are you studying?",
        stepLabel: "Question 2 of 3",
        subtitle: "Association vs explaining an outcome with predictors",
        options: [
          { id: "pairwise", icon: "fa-table-cells", label: "Pairwise associations", desc: "How variables correlate together" },
          { id: "explain_continuous", icon: "fa-chart-line", label: "Explain a numeric outcome", desc: "Predictors linked to a continuous Y" },
          { id: "explain_binary", icon: "fa-toggle-on", label: "Explain a yes/no outcome", desc: "Predictors linked to a binary Y" }
        ]
      };
    }
    if (goal === "predict") {
      return {
        key: "outcome_type",
        title: "What type of outcome are you modeling?",
        stepLabel: "Question 2 of 3",
        subtitle: "Choose the outcome type for your prediction model",
        options: [
          { id: "continuous", icon: "fa-chart-line", label: "Numeric outcome", desc: "Continuous Y — linear regression" },
          { id: "binary", icon: "fa-toggle-on", label: "Yes / no outcome", desc: "Binary Y — logistic regression" }
        ]
      };
    }
    return {
      key: "structure_type",
      title: "What kind of structure do you need?",
      stepLabel: "Question 2 of 3",
      subtitle: "Dimension reduction, latent factors, or segments",
      options: [
        { id: "pca", icon: "fa-compress", label: "Reduce dimensions (PCA)", desc: "Compact components from many variables" },
        { id: "factor", icon: "fa-cubes", label: "Latent factors", desc: "Factor analysis with rotation" },
        { id: "kmeans", icon: "fa-object-group", label: "Fixed k segments", desc: "K-means clustering" },
        { id: "hierarchical", icon: "fa-diagram-project", label: "Merge tree", desc: "Hierarchical clustering dendrogram" }
      ]
    };
  }

  function step3() {
    if (state.answers.goal === "compare" && state.answers.compare_design === "multi") {
      return {
        key: "multi_complexity",
        title: "Any random effects or nesting?",
        stepLabel: "Question 3 of 3",
        subtitle: "Simple groups vs a mixed design",
        options: [
          { id: "simple", icon: "fa-check", label: "No — standard groups", desc: "One-way ANOVA is enough" },
          { id: "complex", icon: "fa-sitemap", label: "Yes — nested or repeated", desc: "Use a mixed model" }
        ]
      };
    }
    if (state.answers.goal === "explore" && state.answers.explore_type === "many") {
      return {
        key: "explore_focus",
        title: "Where should you start?",
        stepLabel: "Question 3 of 3",
        subtitle: "Correlation matrix or inspect one variable first",
        options: [
          { id: "matrix", icon: "fa-table-cells", label: "Correlation matrix", desc: "See all pairwise associations" },
          { id: "single", icon: "fa-chart-bar", label: "One variable first", desc: "Inspect a single distribution" },
          { id: "components", icon: "fa-compress", label: "Reduce dimensions", desc: "PCA when you have many variables" }
        ]
      };
    }
    if (state.answers.goal === "relationships" && state.answers.relationship_type === "pairwise") {
      return {
        key: "relationship_depth",
        title: "How deep should the analysis go?",
        stepLabel: "Question 3 of 3",
        subtitle: "Quick associations or a fuller model",
        options: [
          { id: "correlation", icon: "fa-table-cells", label: "Correlations only", desc: "Matrix of pairwise associations" },
          { id: "regression", icon: "fa-chart-line", label: "Adjust for predictors", desc: "Regression when you need control variables" }
        ]
      };
    }
    return null;
  }

  function resolveRecommendationKey() {
    var g = state.answers.goal;
    if (g === "explore") {
      if (state.answers.explore_type === "one") return "univariate";
      if (state.answers.explore_focus === "single") return "univariate";
      if (state.answers.explore_focus === "components") return "pca";
      return "correlations";
    }
    if (g === "compare") {
      var d = state.answers.compare_design;
      if (d === "two_indep") return "independent";
      if (d === "paired") return "dependent";
      if (d === "mixed") return "mixed";
      if (d === "multi") {
        return state.answers.multi_complexity === "complex" ? "mixed" : "anova";
      }
    }
    if (g === "relationships") {
      var r = state.answers.relationship_type;
      if (r === "explain_continuous") return "regression";
      if (r === "explain_binary") return "logistic";
      if (state.answers.relationship_depth === "regression") return "regression";
      return "correlations";
    }
    if (g === "predict") {
      return state.answers.outcome_type === "binary" ? "logistic" : "regression";
    }
    var s = state.answers.structure_type;
    if (s === "pca") return "pca";
    if (s === "factor") return "factor";
    if (s === "kmeans") return "kmeans";
    if (s === "hierarchical") return "hierarchical";
    return "univariate";
  }

  function buildAiExplanation(key) {
    var a = state.answers;
    if (key === "univariate") {
      return "Based on your answers, you're exploring a single variable, so Univariate Analysis is the best starting point.";
    }
    if (key === "correlations") {
      if (a.goal === "relationships") {
        return "Based on your answers, you want to understand associations between variables — for example, whether one measure relates to another — so Correlation Analysis fits best.";
      }
      return "Based on your answers, you're looking at patterns across multiple variables, so a correlation matrix is the best starting point.";
    }
    if (key === "independent") {
      return "Based on your answers, you have two independent groups to compare, so an independent-samples comparison is the right choice.";
    }
    if (key === "dependent") {
      return "Based on your answers, the same subjects were measured more than once, so a repeated-measures comparison applies.";
    }
    if (key === "anova") {
      return "Based on your answers, you have three or more groups with a straightforward design, so One-Way ANOVA is the best fit.";
    }
    if (key === "mixed") {
      return "Based on your answers, your design includes nesting or random effects, so Mixed Models are appropriate.";
    }
    if (key === "regression") {
      if (a.goal === "relationships") {
        return "Based on your answers, you want to explain how predictors relate to an outcome while adjusting for other variables, so Linear Regression is recommended.";
      }
      return "Based on your answers, you're modeling a numeric outcome from predictors, so Linear Regression is the best fit.";
    }
    if (key === "logistic") {
      return "Based on your answers, your outcome is binary, so Logistic Regression with odds ratios is the right procedure.";
    }
    if (key === "pca") {
      return "Based on your answers, you have many numeric variables and want a compact representation, so PCA is the best starting point.";
    }
    if (key === "factor") {
      return "Based on your answers, you're looking for latent constructs behind observed variables, so Factor Analysis fits best.";
    }
    if (key === "kmeans") {
      return "Based on your answers, you want a fixed number of segments, so K-Means clustering is a good match.";
    }
    if (key === "hierarchical") {
      return "Based on your answers, you want to explore how cases merge into groups, so Hierarchical Clustering fits best.";
    }
    return "Based on your answers, this procedure is the best match for your goal.";
  }

  function resolveAlternatives(primaryKey) {
    var keys = (ALT_KEYS[primaryKey] || []).slice();
    var g = state.answers.goal;

    if (g === "relationships" && primaryKey === "correlations") {
      keys = ["regression", "univariate"];
    } else if (g === "relationships" && primaryKey === "regression") {
      keys = ["correlations", "logistic"];
    } else if (g === "explore" && primaryKey === "correlations") {
      keys = ["univariate", "pca"];
    } else if (g === "explore" && primaryKey === "pca") {
      keys = ["correlations", "factor"];
    }

    return keys
      .filter(function (k) { return k !== primaryKey && RECOMMENDATIONS[k]; })
      .slice(0, 2)
      .map(function (k) { return RECOMMENDATIONS[k]; });
  }

  function resolveResultBundle() {
    var key = resolveRecommendationKey();
    var rec = RECOMMENDATIONS[key];
    return {
      key: key,
      rec: rec,
      aiExplanation: buildAiExplanation(key),
      alternatives: resolveAlternatives(key)
    };
  }

  function getCurrentStepDef() {
    if (state.step === 0) return step1();
    if (state.step === 1) return step2();
    if (state.step === 2) return step3();
    return null;
  }

  function needsStep3AfterAnswers() {
    if (state.answers.goal === "compare" && state.answers.compare_design === "multi") return true;
    if (state.answers.goal === "explore" && state.answers.explore_type === "many") return true;
    if (state.answers.goal === "relationships" && state.answers.relationship_type === "pairwise") return true;
    return false;
  }

  function difficultyClass(level) {
    if (level === "Easy") return "proc-advisor-badge--easy";
    if (level === "Advanced") return "proc-advisor-badge--advanced";
    return "proc-advisor-badge--medium";
  }

  function renderProgress(activeStep) {
    var html = "";
    for (var i = 0; i < 3; i++) {
      var cls = "proc-advisor-dot";
      if (i < activeStep) cls += " is-done";
      if (i === activeStep) cls += " is-active";
      html += '<span class="' + cls + '"></span>';
    }
    return html;
  }

  function renderQuestion(stepDef) {
    var html =
      '<div class="proc-advisor-step-label">' + escapeHtml(stepDef.stepLabel) + "</div>" +
      '<div class="proc-advisor-progress">' + renderProgress(state.step) + "</div>" +
      '<div class="proc-advisor-q">' + escapeHtml(stepDef.title) + "</div>" +
      '<div class="proc-advisor-sub">' + escapeHtml(stepDef.subtitle) + "</div>" +
      '<div class="proc-advisor-options">';
    stepDef.options.forEach(function (opt) {
      html +=
        '<button type="button" class="proc-advisor-opt" data-opt-id="' + escapeHtml(opt.id) + '">' +
        (opt.icon
          ? '<span class="proc-advisor-opt-icon"><i class="fa-solid ' + escapeHtml(opt.icon) + '"></i></span>'
          : "") +
        '<span class="proc-advisor-opt-copy">' +
        '<span class="proc-advisor-opt-label">' + escapeHtml(opt.label) + "</span>" +
        '<span class="proc-advisor-opt-desc">' + escapeHtml(opt.desc) + "</span>" +
        "</span>" +
        "</button>";
    });
    html += "</div>";
    return html;
  }

  function renderLearnWhy(rec) {
    var lw = rec.learnWhy || {};
    function listItems(items) {
      return (items || [])
        .map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; })
        .join("");
    }
    return (
      '<div class="proc-advisor-learn' + (state.learnOpen ? " is-open" : "") + '" id="procAdvisorLearn">' +
      '<div class="proc-advisor-learn-section">' +
      '<div class="proc-advisor-learn-heading">Assumptions</div>' +
      "<ul>" + listItems(lw.assumptions) + "</ul>" +
      "</div>" +
      '<div class="proc-advisor-learn-section">' +
      '<div class="proc-advisor-learn-heading">Required variables</div>' +
      "<ul>" + listItems(lw.variables) + "</ul>" +
      "</div>" +
      '<div class="proc-advisor-learn-section">' +
      '<div class="proc-advisor-learn-heading">Expected outputs</div>' +
      "<ul>" + listItems(lw.outputs) + "</ul>" +
      "</div>" +
      "</div>"
    );
  }

  function renderAlternatives(alts) {
    if (!alts.length) return "";
    var html =
      '<div class="proc-advisor-alts">' +
      '<div class="proc-advisor-alts-title">You may also consider</div>' +
      '<div class="proc-advisor-alt-list">';
    alts.forEach(function (alt) {
      html +=
        '<button type="button" class="proc-advisor-alt" data-module-id="' + escapeHtml(alt.moduleId) + '">' +
        escapeHtml(alt.titleFull) +
        "</button>";
    });
    html += "</div></div>";
    return html;
  }

  function renderResult(bundle) {
    var rec = bundle.rec;
    return (
      '<div class="proc-advisor-step-label">Your recommendation</div>' +
      '<div class="proc-advisor-progress">' +
      '<span class="proc-advisor-dot is-done"></span><span class="proc-advisor-dot is-done"></span><span class="proc-advisor-dot is-done"></span>' +
      "</div>" +
      '<p class="proc-advisor-ai">' + escapeHtml(bundle.aiExplanation) + "</p>" +
      '<div class="proc-advisor-rec-card">' +
      '<div class="proc-advisor-rec-head">' +
      '<span class="proc-advisor-rec-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span>' +
      '<div class="proc-advisor-rec-copy">' +
      '<div class="proc-advisor-rec-kicker">Recommended</div>' +
      '<div class="proc-advisor-rec-title">' + escapeHtml(rec.titleFull) + "</div>" +
      "</div>" +
      '<div class="proc-advisor-badges">' +
      '<span class="proc-advisor-badge ' + difficultyClass(rec.difficulty) + '">' + escapeHtml(rec.difficulty) + "</span>" +
      '<span class="proc-advisor-badge proc-advisor-badge--time">' + escapeHtml(rec.duration) + "</span>" +
      "</div>" +
      "</div>" +
      '<p class="proc-advisor-rec-why"><strong>Why:</strong> ' + escapeHtml(rec.reason) + "</p>" +
      "</div>" +
      renderAlternatives(bundle.alternatives) +
      renderLearnWhy(rec) +
      '<div class="proc-advisor-actions">' +
      '<button type="button" class="proc-advisor-btn proc-advisor-btn--ghost" id="procAdvisorBack">Back</button>' +
      '<button type="button" class="proc-advisor-btn proc-advisor-btn--ghost" id="procAdvisorLearnBtn">' +
      (state.learnOpen ? "Hide details" : "Learn why") +
      "</button>" +
      '<button type="button" class="proc-advisor-btn proc-advisor-btn--primary" id="procAdvisorOpen" data-module-id="' + escapeHtml(rec.moduleId) + '">Open Analysis</button>' +
      "</div>"
    );
  }

  function launchModule(moduleId) {
    close();
    if (typeof global.navigateToModule === "function") {
      global.navigateToModule(moduleId);
    }
    if (typeof global.setSelectedModuleCard === "function") {
      global.setSelectedModuleCard(moduleId, true);
    }
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

  function bindResultHandlers(bundle) {
    var rec = bundle.rec;
    var back = getEl("procAdvisorBack");
    var open = getEl("procAdvisorOpen");
    var learnBtn = getEl("procAdvisorLearnBtn");
    var body = getEl("procAdvisorBody");

    if (back) {
      back.addEventListener("click", function () {
        state.learnOpen = false;
        state.step = needsStep3AfterAnswers() ? 2 : 1;
        renderBody();
      });
    }
    if (learnBtn) {
      learnBtn.addEventListener("click", function () {
        state.learnOpen = !state.learnOpen;
        var learn = getEl("procAdvisorLearn");
        if (learn) learn.classList.toggle("is-open", state.learnOpen);
        learnBtn.textContent = state.learnOpen ? "Hide details" : "Learn why";
      });
    }
    if (open) {
      open.addEventListener("click", function () {
        launchModule(rec.moduleId);
      });
    }
    if (body) {
      body.querySelectorAll(".proc-advisor-alt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          launchModule(btn.getAttribute("data-module-id"));
        });
      });
    }
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
    state.learnOpen = false;
    var bundle = resolveResultBundle();
    var body = getEl("procAdvisorBody");
    var foot = getEl("procAdvisorFoot");
    if (body) {
      body.innerHTML = renderResult(bundle);
      bindResultHandlers(bundle);
    }
    if (foot) foot.innerHTML = "";
  }

  function clearStepAnswers(step) {
    if (step === 2) {
      delete state.answers.multi_complexity;
      delete state.answers.explore_focus;
      delete state.answers.relationship_depth;
    }
    if (step === 1) {
      delete state.answers.explore_type;
      delete state.answers.compare_design;
      delete state.answers.outcome_type;
      delete state.answers.structure_type;
      delete state.answers.relationship_type;
    }
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
          clearStepAnswers(state.step);
          state.step = Math.max(0, state.step - 1);
          renderBody();
        });
      }
      if (cancel) cancel.addEventListener("click", close);
    }
  }

  function open() {
    state = { step: 0, answers: {}, learnOpen: false };
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
    state.learnOpen = false;
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
