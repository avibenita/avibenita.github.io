(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EffectSizeMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : null;
  }

  function logGamma(z) {
    var p = [
      676.5203681218851, -1259.1392167224028, 771.3234287776531,
      -176.6150291621406, 12.507343278686905, -0.13857109526572012,
      9.984369578019572e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    var x = 0.9999999999998099;
    var i;
    for (i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
    var t = z + p.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function hedgesJ(df) {
    if (!(df > 1)) return null;
    return Math.exp(logGamma(df / 2) - logGamma((df - 1) / 2) - 0.5 * Math.log(df / 2));
  }

  function magnitude(abs, cuts, labels) {
    var i;
    for (i = 0; i < cuts.length; i++) {
      if (abs < cuts[i]) return labels[i];
    }
    return labels[labels.length - 1];
  }

  function row(spec) {
    return {
      id: spec.id,
      label: spec.label,
      value: spec.value,
      kind: spec.kind,
      se: spec.se == null ? null : spec.se,
      measure: spec.measure || "",
      assumptions: spec.assumptions || [],
      formula: spec.formula || "",
      interpretation: spec.interpretation || "",
      missing: spec.missing || []
    };
  }

  function blocked(id, label, missing, formula) {
    return row({ id: id, label: label, value: null, kind: null, missing: missing, formula: formula || "" });
  }

  function interpretD(d) {
    var band = magnitude(Math.abs(d), [0.2, 0.5, 0.8], ["negligible", "small", "medium", "large"]);
    return "About a " + band + " standardized mean difference on Cohen's guidelines. Those cutoffs are not a finding.";
  }

  function interpretR(r) {
    var band = magnitude(Math.abs(r), [0.1, 0.3, 0.5], ["negligible", "small", "medium", "large"]);
    return "About a " + band + " correlation on Cohen's guidelines. Those cutoffs are not a finding.";
  }

  function interpretF(f) {
    var band = magnitude(Math.abs(f), [0.1, 0.25, 0.4], ["negligible", "small", "medium", "large"]);
    return "About a " + band + " ANOVA effect on Cohen's guidelines for f. Those cutoffs are not a finding.";
  }

  function groupFactor(n1, n2) {
    if (n1 != null && n2 != null && n1 > 1 && n2 > 1) {
      return { a: ((n1 + n2) * (n1 + n2)) / (n1 * n2), exact: true, n1: n1, n2: n2 };
    }
    return { a: 4, exact: false, n1: null, n2: null };
  }

  function meanSection(source, value, extra) {
    var d = null;
    var g = null;
    var r = null;
    var n1 = num(extra.n1);
    var n2 = num(extra.n2);
    var df = n1 != null && n2 != null ? n1 + n2 - 2 : null;
    var J = df != null ? hedgesJ(df) : null;
    var factor = groupFactor(n1, n2);
    var results = [];

    if (source === "d") d = value;
    if (source === "g") g = value;
    if (source === "r") r = value;

    if (source === "g") {
      if (J == null) results.push(blocked("d", "Cohen's d", ["Both sample sizes, so the small-sample correction can be removed."], "d = g / J, J = Γ(df/2) / (√(df/2) Γ((df−1)/2)), df = n1 + n2 − 2"));
      else d = g / J;
    }
    if (source === "r") {
      if (!(Math.abs(r) < 1)) return { error: "Correlation r must be between −1 and 1." };
      d = r * Math.sqrt(factor.a) / Math.sqrt(1 - r * r);
    }
    if (d == null && source !== "d") {
      /* filled above or blocked */
    }
    if (source === "d" || d != null) {
      if (source !== "d" && d != null) {
        results.push(row({
          id: "d",
          label: "Cohen's d",
          value: d,
          kind: source === "g" ? "exact" : (factor.exact ? "exact" : "approximation"),
          assumptions: source === "g"
            ? ["Both sample sizes are the two independent groups.", "J is the exact Hedges correction from the gamma function."]
            : (factor.exact
              ? ["Point-biserial relationship using the supplied group sizes."]
              : ["Equal group sizes. Supply n1 and n2 if the groups differ."]),
          formula: source === "g" ? "d = g / J" : "d = r √a / √(1 − r²), a = (n1+n2)² / (n1 n2)",
          interpretation: interpretD(d)
        }));
      }
      if (J == null) {
        results.push(blocked("g", "Hedges' g", ["Both sample sizes. Hedges' g is d corrected for small-sample bias."], "g = J d"));
      } else if (source !== "g") {
        results.push(row({
          id: "g",
          label: "Hedges' g",
          value: J * d,
          kind: "exact",
          assumptions: ["Independent groups and the supplied sample sizes.", "J is the exact gamma correction, not the 1 − 3/(4df − 1) shortcut."],
          formula: "g = J d, df = n1 + n2 − 2",
          interpretation: interpretD(J * d)
        }));
      }
      if (source !== "r") {
        var rFromD = d / Math.sqrt(d * d + factor.a);
        results.push(row({
          id: "r",
          label: "Correlation r",
          value: rFromD,
          kind: factor.exact ? "exact" : "approximation",
          assumptions: factor.exact
            ? ["Point-biserial r from d, using the supplied group sizes."]
            : ["Assumes equal groups (a = 4). This is not exact when n1 and n2 differ."],
          formula: "r = d / √(d² + a)",
          interpretation: interpretR(rFromD)
        }));
      }
    }
    results.push(binaryFromD(d, num(extra.baseline)));
    results.push(metaMean(source === "g" && J != null ? g : d, source === "g" ? "g" : "d", n1, n2, J));
    return { results: results, power: powerMean(source === "g" && J != null ? g / J : d) };
  }

  function binaryFromD(d, baseline) {
    if (d == null) return blocked("or-from-d", "Odds ratio", ["A standardized mean difference."]);
    var lor = d * Math.PI / Math.sqrt(3);
    var or = Math.exp(lor);
    if (baseline == null || !(baseline > 0 && baseline < 1)) {
      return blocked("or-from-d", "Odds ratio", ["Baseline risk in the reference group. The logistic link is only an approximation, and risk difference still needs a baseline."], "ln(OR) ≈ d π / √3");
    }
    var odds0 = baseline / (1 - baseline);
    var p1 = (or * odds0) / (1 + or * odds0);
    return row({
      id: "or-from-d",
      label: "Odds ratio",
      value: or,
      kind: "approximation",
      assumptions: [
        "Latent response is logistic. This is not an exact map from a mean difference.",
        "Baseline risk " + baseline + " turns the odds ratio into a risk only under that model."
      ],
      formula: "ln(OR) ≈ d π / √3",
      interpretation: "Approximate odds ratio " + or.toFixed(2) + ". Implied comparison risk " + (p1 * 100).toFixed(1) + "% if the baseline is " + (baseline * 100).toFixed(1) + "%."
    });
  }

  function metaMean(effect, kind, n1, n2, J) {
    if (effect == null) return blocked("meta", "Meta-analysis study", ["An effect value."]);
    if (!(n1 > 1 && n2 > 1)) {
      return blocked("meta", "Meta-analysis study", ["Both sample sizes. A point estimate without a variance cannot enter a meta-analysis."], "Var(d) = (n1+n2)/(n1 n2) + d² / (2(n1+n2))");
    }
    var d = kind === "g" ? effect / J : effect;
    var vd = (n1 + n2) / (n1 * n2) + (d * d) / (2 * (n1 + n2));
    var yi = kind === "g" ? effect : d;
    var vi = kind === "g" ? vd * J * J : vd;
    return row({
      id: "meta",
      label: "Meta-analysis study",
      value: yi,
      se: Math.sqrt(vi),
      kind: "exact",
      measure: kind === "g" ? "Hedges' g" : "Cohen's d",
      assumptions: ["Large-sample variance for a standardized mean difference from two independent groups."],
      formula: "SE = √[ (n1+n2)/(n1 n2) + d² / (2(n1+n2)) ]",
      interpretation: "Paste one study row: effect " + yi.toFixed(3) + ", SE " + Math.sqrt(vi).toFixed(3) + "."
    });
  }

  function powerMean(d) {
    if (d == null || !isFinite(d)) return null;
    return { test: "two-sample-mean", effectSize: Math.abs(d), label: "Cohen's d" };
  }

  function anovaSection(source, value, extra) {
    var design = extra.design === "factorial" ? "factorial" : "oneway";
    var eta = null;
    var partial = null;
    var f = null;
    var f2 = null;
    var results = [];
    if (!(value >= 0)) return { error: "ANOVA effect sizes cannot be negative." };
    if ((source === "eta2" || source === "partial") && !(value < 1)) return { error: "η² must be below 1." };

    if (source === "eta2") eta = value;
    if (source === "partial") partial = value;
    if (source === "f") { f = value; f2 = value * value; }
    if (source === "f2") { f2 = value; f = Math.sqrt(value); }

    function fromProportion(prop, propName) {
      var nextF2 = prop / (1 - prop);
      var nextF = Math.sqrt(nextF2);
      results.push(row({
        id: "f",
        label: "Cohen's f",
        value: nextF,
        kind: "exact",
        assumptions: ["f is defined from this variance proportion. In a factorial design, use partial η², not ordinary η²."],
        formula: "f = √( η² / (1 − η²) )".replace("η²", propName),
        interpretation: interpretF(nextF)
      }));
      results.push(row({
        id: "f2",
        label: "Cohen's f²",
        value: nextF2,
        kind: "exact",
        assumptions: ["f² = f² by definition for the same variance proportion."],
        formula: "f² = η² / (1 − η²)".replace("η²", propName),
        interpretation: "f² = " + nextF2.toFixed(3) + " is the variance explained relative to the variance left over."
      }));
      return nextF;
    }

    if (design === "oneway") {
      if (source === "eta2" || source === "partial") {
        var prop = source === "eta2" ? eta : partial;
        if (source === "eta2") {
          results.push(row({
            id: "partial",
            label: "Partial η²",
            value: prop,
            kind: "exact",
            assumptions: ["One-way ANOVA: the only effect is the group factor, so η² and partial η² are the same."],
            formula: "partial η² = η² in a one-way design",
            interpretation: (prop * 100).toFixed(1) + "% of the variance is between groups."
          }));
        } else {
          results.push(row({
            id: "eta2",
            label: "η²",
            value: prop,
            kind: "exact",
            assumptions: ["One-way ANOVA: η² and partial η² are the same."],
            formula: "η² = partial η² in a one-way design",
            interpretation: (prop * 100).toFixed(1) + "% of the variance is between groups."
          }));
        }
        f = fromProportion(prop, source === "eta2" ? "η²" : "partial η²");
      } else {
        var propFromF = f2 / (1 + f2);
        results.push(row({
          id: "eta2",
          label: "η²",
          value: propFromF,
          kind: "exact",
          assumptions: ["One-way ANOVA, so this η² is also the partial η²."],
          formula: "η² = f² / (1 + f²)",
          interpretation: (propFromF * 100).toFixed(1) + "% of the variance is between groups."
        }));
        results.push(row({
          id: "partial",
          label: "Partial η²",
          value: propFromF,
          kind: "exact",
          assumptions: ["One-way ANOVA: partial η² equals η²."],
          formula: "partial η² = f² / (1 + f²)",
          interpretation: (propFromF * 100).toFixed(1) + "% of the variance is associated with the group factor."
        }));
        if (source === "f") {
          results.push(row({
            id: "f2", label: "Cohen's f²", value: f2, kind: "exact",
            assumptions: ["Square of the supplied f."], formula: "f² = f²", interpretation: interpretF(f)
          }));
        } else {
          results.push(row({
            id: "f", label: "Cohen's f", value: f, kind: "exact",
            assumptions: ["Positive square root of the supplied f²."], formula: "f = √f²", interpretation: interpretF(f)
          }));
        }
      }
    } else if (source === "partial" || source === "f" || source === "f2") {
      if (source === "partial") f = fromProportion(partial, "partial η²");
      else {
        var partialFromF = f2 / (1 + f2);
        results.push(row({
          id: "partial",
          label: "Partial η²",
          value: partialFromF,
          kind: "exact",
          assumptions: ["This is the partial effect used to define f. It is not the ordinary η² of a factorial model."],
          formula: "partial η² = f² / (1 + f²)",
          interpretation: (partialFromF * 100).toFixed(1) + "% of the variance left after the other effects is associated with this one."
        }));
        if (source === "f") {
          results.push(row({
            id: "f2", label: "Cohen's f²", value: f2, kind: "exact",
            assumptions: ["Square of the supplied f."], formula: "f² = f²", interpretation: interpretF(f)
          }));
        } else {
          results.push(row({
            id: "f", label: "Cohen's f", value: f, kind: "exact",
            assumptions: ["Positive square root of the supplied f²."], formula: "f = √f²", interpretation: interpretF(f)
          }));
        }
      }
      results.push(blocked("eta2", "η²", ["Sums of squares for the other effects. Ordinary η² is not recoverable from a partial η²."], "η² = SS_effect / SS_total"));
    } else {
      results.push(blocked("partial", "Partial η²", ["A factorial η² is not a partial η². Enter partial η², f, or f² for the effect you want to convert."]));
      results.push(blocked("f", "Cohen's f", ["Partial η² or f². Ordinary η² from a factorial model is the wrong input for power."]));
      f = null;
    }

    results.push(blocked("meta", "Meta-analysis study", ["ANOVA effect sizes are not a study outcome by themselves. Meta-analysis needs a mean difference, correlation, or log risk measure with a variance."]));
    return { results: results, power: f == null ? null : { test: "anova", effectSizeF: f, label: "Cohen's f" } };
  }

  function correlationSection(source, value, extra) {
    var model = extra.model === "multiple" ? "multiple" : "simple";
    var predictors = num(extra.predictors);
    var n = num(extra.n);
    var r = null;
    var r2 = null;
    var z = null;
    var f2 = null;
    var results = [];

    if (source === "r") {
      if (!(Math.abs(value) < 1)) return { error: "Correlation r must be between −1 and 1." };
      r = value;
    }
    if (source === "z") z = value;
    if (source === "r2" || source === "f2") {
      if (!(value >= 0)) return { error: "R² and f² cannot be negative." };
      if (source === "r2" && !(value < 1)) return { error: "R² must be below 1." };
    }

    if (source === "z") r = Math.tanh(z);
    if (source === "r" || r != null) {
      if (source !== "r") {
        results.push(row({
          id: "r", label: "Correlation r", value: r, kind: "exact",
          assumptions: ["Inverse of Fisher's z."],
          formula: "r = tanh(z)",
          interpretation: interpretR(r)
        }));
      }
      if (source !== "z") {
        z = Math.atanh(r);
        results.push(row({
          id: "z", label: "Fisher's z", value: z, kind: "exact",
          assumptions: ["Variance-stabilizing transform of r. It is not a different effect, and meta-analysis usually pools z."],
          formula: "z = artanh(r) = ½ ln( (1+r) / (1−r) )",
          interpretation: "Fisher's z = " + z.toFixed(3) + " for r = " + r.toFixed(3) + "."
        }));
      }
      if (model === "simple") {
        r2 = r * r;
        f2 = r2 / (1 - r2);
        results.push(row({
          id: "r2", label: "R²", value: r2, kind: "exact",
          assumptions: ["One predictor. In simple regression, R² is r²."],
          formula: "R² = r²",
          interpretation: (r2 * 100).toFixed(1) + "% of the outcome variance is linearly associated with the predictor."
        }));
        results.push(row({
          id: "f2", label: "Cohen's f²", value: f2, kind: "exact",
          assumptions: ["Whole-model f² for that single predictor."],
          formula: "f² = R² / (1 − R²)",
          interpretation: "f² = " + f2.toFixed(3) + " for the simple regression."
        }));
      } else {
        results.push(blocked("r2", "R²", ["A correlation is not the R² of a multiple regression. Enter the model R²."]));
        results.push(blocked("f2", "Cohen's f²", ["Model R², or both a full and a reduced R² for one predictor's partial effect."]));
      }
    }

    if (source === "r2" || source === "f2") {
      if (source === "r2") {
        r2 = value;
        f2 = r2 / (1 - r2);
      } else {
        f2 = value;
        r2 = f2 / (1 + f2);
      }
      if (model === "multiple" && source === "r2") {
        results.push(row({
          id: "f2", label: "Cohen's f²", value: f2, kind: "exact",
          assumptions: ["This is the whole-model f². A single predictor's partial f² needs the full and reduced R²."],
          formula: "f² = R² / (1 − R²)",
          interpretation: "Model f² = " + f2.toFixed(3) + ". It is not the effect of one covariate."
        }));
      } else if (model === "multiple") {
        results.push(row({
          id: "r2", label: "R²", value: r2, kind: "exact",
          assumptions: ["Inverts the whole-model definition f² = R² / (1 − R²)."],
          formula: "R² = f² / (1 + f²)",
          interpretation: (r2 * 100).toFixed(1) + "% of outcome variance is associated with the model, not with one predictor."
        }));
      } else {
        r = Math.sqrt(r2);
        results.push(row({
          id: source === "r2" ? "f2" : "r2",
          label: source === "r2" ? "Cohen's f²" : "R²",
          value: source === "r2" ? f2 : r2,
          kind: "exact",
          assumptions: ["One predictor."],
          formula: source === "r2" ? "f² = R² / (1 − R²)" : "R² = f² / (1 + f²)",
          interpretation: source === "r2" ? "f² = " + f2.toFixed(3) + "." : (r2 * 100).toFixed(1) + "% of variance explained."
        }));
        results.push(row({
          id: "r", label: "Correlation r", value: r, kind: "exact",
          assumptions: ["One predictor, and the correlation is taken as positive. The sign is not in R²."],
          formula: "r = √R²",
          interpretation: interpretR(r) + " The sign was not identified."
        }));
        z = Math.atanh(r);
        results.push(row({
          id: "z", label: "Fisher's z", value: z, kind: "exact",
          assumptions: ["Sign of r is taken as positive."],
          formula: "z = artanh(√R²)",
          interpretation: "Fisher's z = " + z.toFixed(3) + "."
        }));
      }
      if (model === "multiple") {
        results.push(blocked("r", "Correlation r", ["Multiple R is not a Pearson r, and its sign is undefined. Do not send √R² to a correlation test."]));
        results.push(blocked("z", "Fisher's z", ["Fisher's z is a transform of a correlation, not of a multiple R²."]));
      }
    }

    if (r != null && n != null && n > 3 && model === "simple") {
      var vz = 1 / (n - 3);
      results.push(row({
        id: "meta",
        label: "Meta-analysis study",
        value: Math.atanh(r),
        se: Math.sqrt(vz),
        kind: "exact",
        measure: "Fisher's z",
        assumptions: ["Studies are pooled on Fisher's z. Variance is 1/(n − 3)."],
        formula: "z = artanh(r), Var(z) = 1/(n − 3)",
        interpretation: "Paste Fisher's z " + Math.atanh(r).toFixed(3) + " with SE " + Math.sqrt(vz).toFixed(3) + "."
      }));
    } else {
      results.push(blocked("meta", "Meta-analysis study", model === "multiple"
        ? ["A model R² is not a pooled correlation. Enter r and the sample size, or use a partial correlation."]
        : ["Sample size n > 3. Fisher's z needs Var(z) = 1/(n − 3)."]));
    }

    var power = null;
    if (model === "simple" && r != null) power = { test: "correlation", rho: r, label: "correlation r" };
    else if (r2 != null) {
      power = { test: "regression", rsquared: r2, label: "R²" };
      if (!(predictors >= 1)) power.missing = ["Number of predictors. The power calculator cannot size a regression without it."];
      else power.numPredictors = predictors;
    }
    return { results: results, power: power };
  }

  function risksFrom(p0, p1) {
    if (!(p0 > 0 && p0 < 1 && p1 > 0 && p1 < 1)) return null;
    var rd = p1 - p0;
    return {
      p1: p1,
      or: (p1 / (1 - p1)) / (p0 / (1 - p0)),
      rr: p1 / p0,
      rd: rd,
      nnt: rd === 0 ? null : 1 / rd
    };
  }

  function binarySection(source, value, extra) {
    var p0 = num(extra.baseline);
    var direction = extra.direction === "increase" ? 1 : -1;
    var results = [];
    var p1 = null;
    var hasBaseline = p0 != null && p0 > 0 && p0 < 1;

    if (source === "or") {
      if (!(value > 0)) return { error: "Odds ratio must be greater than 0." };
      results.push(row({
        id: "lor",
        label: "Log odds ratio",
        value: Math.log(value),
        kind: "exact",
        assumptions: ["Natural log of the supplied odds ratio. Meta-analysis pools this scale."],
        formula: "ln(OR)",
        interpretation: "Log odds ratio " + Math.log(value).toFixed(3) + (value === 1 ? " means no difference in odds." : value > 1 ? " means higher odds in the comparison group." : " means lower odds in the comparison group.")
      }));
      var dApprox = Math.log(value) * Math.sqrt(3) / Math.PI;
      results.push(row({
        id: "d",
        label: "Cohen's d",
        value: dApprox,
        kind: "approximation",
        assumptions: ["Latent logistic distribution (Chinn / Hasselblad and Hedges). Not an exact conversion, and it ignores the baseline risk."],
        formula: "d ≈ ln(OR) × √3 / π",
        interpretation: interpretD(dApprox)
      }));
      if (!hasBaseline) {
        ["rr", "rd", "nnt"].forEach(function (id) {
          var labels = { rr: "Risk ratio", rd: "Risk difference", nnt: "NNT" };
          results.push(blocked(id, labels[id], ["Baseline risk in the reference group. An odds ratio does not determine a risk without it."]));
        });
      } else {
        var odds1 = value * (p0 / (1 - p0));
        p1 = odds1 / (1 + odds1);
      }
    } else if (!hasBaseline) {
      return {
        error: null,
        results: [
          blocked("or", "Odds ratio", ["Baseline risk. Risk ratio, risk difference, and NNT are not odds."]),
          blocked("rr", "Risk ratio", ["Baseline risk."]),
          blocked("rd", "Risk difference", ["Baseline risk."]),
          blocked("nnt", "NNT", ["Baseline risk and whether the treatment raises or lowers risk."])
        ],
        power: null
      };
    } else if (source === "rr") {
      if (!(value > 0)) return { error: "Risk ratio must be greater than 0." };
      p1 = p0 * value;
    } else if (source === "rd") {
      if (!(Math.abs(value) < 1)) return { error: "Risk difference must be between −1 and 1." };
      p1 = p0 + value;
    } else if (source === "nnt") {
      if (!(Math.abs(value) >= 1)) return { error: "NNT is at least 1." };
      p1 = p0 + direction / Math.abs(value);
    }

    if (p1 != null && !(p1 > 0 && p1 < 1)) {
      return { error: "Those inputs put the comparison risk outside 0–100%. Change the baseline or the effect." };
    }
    if (p1 != null) {
      var risks = risksFrom(p0, p1);
      var items = [
        ["or", "Odds ratio", risks.or, "OR = [p1/(1−p1)] / [p0/(1−p0)]"],
        ["rr", "Risk ratio", risks.rr, "RR = p1 / p0"],
        ["rd", "Risk difference", risks.rd, "RD = p1 − p0"],
        ["nnt", "NNT", risks.nnt, "NNT = 1 / RD"]
      ];
      items.forEach(function (item) {
        if (item[0] === source) return;
        if (item[0] === "nnt" && item[2] == null) return;
        var assumptions = ["Baseline risk " + (p0 * 100).toFixed(1) + "% in the reference group."];
        if (source === "nnt") assumptions.push(direction < 0 ? "NNT is read as a reduction in risk." : "NNT is read as an increase in risk.");
        if (source === "or") assumptions.push("The odds ratio and the baseline together identify both risks. This step is exact; the Cohen's d row above is not.");
        results.push(row({
          id: item[0],
          label: item[1],
          value: item[2],
          kind: "exact",
          assumptions: assumptions,
          formula: item[3],
          interpretation: item[0] === "nnt"
            ? "About " + Math.abs(item[2]).toFixed(1) + " people need the comparison exposure for one additional " + (item[2] < 0 ? "case prevented" : "case caused") + " at this baseline."
            : item[0] === "rd"
              ? "The risk changes by " + (item[2] * 100).toFixed(1) + " percentage points, from " + (p0 * 100).toFixed(1) + "% to " + (p1 * 100).toFixed(1) + "%."
              : item[0] === "rr"
                ? "The comparison risk is " + item[2].toFixed(2) + " times the baseline risk."
                : "The comparison odds are " + item[2].toFixed(2) + " times the baseline odds."
        }));
      });
    }

    results.push(blocked("meta", "Meta-analysis study", ["A standard error, confidence interval, or the 2×2 counts. Baseline risk converts the point estimate only."]));
    var power = p1 != null ? { test: "two-sample-proportion", p1: p0, p2: p1, label: "two proportions" } : null;
    return { results: results, power: power };
  }

  function convert(section, source, rawValue, extra) {
    var value = num(rawValue);
    extra = extra || {};
    if (value == null) return { error: "Enter a numeric effect size.", results: [], power: null };
    if (section === "mean") return meanSection(source, value, extra);
    if (section === "anova") return anovaSection(source, value, extra);
    if (section === "correlation") return correlationSection(source, value, extra);
    if (section === "binary") return binarySection(source, value, extra);
    return { error: "Unknown section.", results: [], power: null };
  }

  return {
    convert: convert,
    hedgesJ: hedgesJ
  };
});
