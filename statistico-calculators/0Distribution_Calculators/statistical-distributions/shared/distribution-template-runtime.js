(function () {
  "use strict";

  const distName = (document.body?.dataset?.distribution || "").toLowerCase();

  function detectDistribution() {
    const p = window.location.pathname.toLowerCase();
    if (distName) return distName;
    if (p.includes("poisson")) return "poissondistribution";
    if (p.includes("geometric")) return "geometricdistribution";
    if (p.includes("hypergeometric")) return "hypergeometricdistribution";
    if (p.includes("chisquare")) return "chisquaredistribution";
    if (p.includes("fdistribution")) return "fdistribution";
    if (p.includes("tdistribution")) return "tdistribution";
    if (p.includes("lognormal")) return "lognormaldistribution";
    if (p.includes("normal")) return "normaldistribution";
    if (p.includes("binomial")) return "binomialdistribution";
    if (p.includes("uniform")) return "uniformdistribution";
    if (p.includes("exponential")) return "exponentialdistribution";
    if (p.includes("weibull")) return "weibulldistribution";
    if (p.includes("beta")) return "betadistribution";
    return "";
  }

  const configs = {
    normaldistribution: {
      title: "Normal Distribution Calculator",
      about: "About Normal Distribution...",
      params: [
        { id: "mean", label: "Mean (mu)", sub: "Center of the distribution", defaultValue: 0 },
        { id: "stddev", label: "Standard Deviation (sigma)", sub: "Spread (must be greater than 0)", defaultValue: 1 },
      ],
      rangeOptions: [
        { value: "2", label: "2σ" },
        { value: "3", label: "3σ" },
        { value: "4", label: "4σ" },
        { value: "5", label: "5σ" },
        { value: "6", label: "6σ" },
      ],
      defaults: { range: "4", precision: 3 },
      stats: [
        { key: "mean", label: "Mean" },
        { key: "std", label: "Std Dev" },
        { key: "variance", label: "Variance" },
        { key: "skewness", label: "Skewness" },
      ],
      validate: (p) => Number.isFinite(p.mean) && Number.isFinite(p.stddev) && p.stddev > 0,
      cdf: (x, p) => window.jStat.normal.cdf(x, p.mean, p.stddev),
      pdf: (x, p) => window.jStat.normal.pdf(x, p.mean, p.stddev),
      inv: (q, p) => window.jStat.normal.inv(q, p.mean, p.stddev),
      statsValues: (p) => ({
        mean: p.mean,
        std: p.stddev,
        variance: p.stddev * p.stddev,
        skewness: 0,
      }),
      chartDomain: (p, rangeValue) => {
        const k = Number(rangeValue || 4);
        const s = Math.max(0.01, p.stddev);
        return { min: p.mean - k * s, max: p.mean + k * s };
      },
    },
    uniformdistribution: {
      title: "Uniform Distribution Calculator",
      about: "About Uniform Distribution...",
      params: [
        { id: "minValue", label: "Minimum Value (a)", sub: "Lower bound of the distribution", defaultValue: 0 },
        { id: "maxValue", label: "Maximum Value (b)", sub: "Upper bound (must be > a)", defaultValue: 10 },
      ],
      rangeOptions: [
        { value: "standard", label: "Standard" },
        { value: "extended", label: "Extended" },
        { value: "wide", label: "Wide" },
      ],
      defaults: { range: "extended", precision: 2 },
      stats: [
        { key: "min", label: "a (Min)" },
        { key: "max", label: "b (Max)" },
        { key: "mean", label: "Mean" },
        { key: "std", label: "Std Dev" },
      ],
      validate: (p) => Number.isFinite(p.minValue) && Number.isFinite(p.maxValue) && p.maxValue > p.minValue,
      cdf: (x, p) => {
        if (x <= p.minValue) return 0;
        if (x >= p.maxValue) return 1;
        return (x - p.minValue) / (p.maxValue - p.minValue);
      },
      pdf: (x, p) => {
        if (x < p.minValue || x > p.maxValue) return 0;
        return 1 / (p.maxValue - p.minValue);
      },
      inv: (q, p) => p.minValue + q * (p.maxValue - p.minValue),
      statsValues: (p) => {
        const w = p.maxValue - p.minValue;
        return {
          min: p.minValue,
          max: p.maxValue,
          mean: (p.minValue + p.maxValue) / 2,
          std: Math.sqrt((w * w) / 12),
        };
      },
      chartDomain: (p, rangeValue) => {
        const w = Math.max(1e-9, p.maxValue - p.minValue);
        const padMultiplier = rangeValue === "wide" ? 1 : rangeValue === "standard" ? 0.2 : 0.5;
        const pad = w * padMultiplier;
        return { min: p.minValue - pad, max: p.maxValue + pad };
      },
    },
    exponentialdistribution: {
      title: "Exponential Distribution Calculator",
      about: "About Exponential Distribution...",
      params: [
        { id: "lambda", label: "Rate Parameter (lambda)", sub: "Events per unit time (must be greater than 0)", defaultValue: 1 },
      ],
      rangeOptions: [
        { value: "2", label: "2x mean" },
        { value: "3", label: "3x mean" },
        { value: "4", label: "4x mean" },
        { value: "5", label: "5x mean" },
        { value: "6", label: "6x mean" },
      ],
      defaults: { range: "4", precision: 3 },
      stats: [
        { key: "lambda", label: "Rate (lambda)" },
        { key: "mean", label: "Mean" },
        { key: "std", label: "Std Dev" },
        { key: "variance", label: "Variance" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>X Value (time)</label><input class="input-field" id="xValue" type="number" min="0" step="0.1" value="1"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0" step="0.1" value="0.5"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0" step="0.1" value="2"/></div></div>',
        quantile:
          '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.5"/></div>',
      },
      validate: (p) => Number.isFinite(p.lambda) && p.lambda > 0,
      cdf: (x, p) => window.jStat.exponential.cdf(x, p.lambda),
      pdf: (x, p) => window.jStat.exponential.pdf(x, p.lambda),
      inv: (q, p) => window.jStat.exponential.inv(q, p.lambda),
      statsValues: (p) => ({
        lambda: p.lambda,
        mean: 1 / p.lambda,
        std: 1 / p.lambda,
        variance: 1 / (p.lambda * p.lambda),
      }),
      chartDomain: (p, rangeValue) => {
        const m = 1 / Math.max(1e-9, p.lambda);
        const k = Number(rangeValue || 4);
        return { min: 0, max: Math.max(1e-6, k * m) };
      },
    },
    lognormaldistribution: {
      title: "Log-Normal Distribution Calculator",
      about: "About Log-Normal Distribution...",
      params: [
        { id: "mu", label: "Location Parameter (mu)", sub: "Mean of ln(X)", defaultValue: 0 },
        { id: "sigma", label: "Scale Parameter (sigma)", sub: "Standard deviation of ln(X), must be greater than 0", defaultValue: 1 },
      ],
      rangeOptions: [
        { value: "standard", label: "Standard" },
        { value: "extended", label: "Extended" },
        { value: "wide", label: "Wide Tail" },
      ],
      defaults: { range: "extended", precision: 3 },
      stats: [
        { key: "mu", label: "mu" },
        { key: "sigma", label: "sigma" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>X Value (x > 0)</label><input class="input-field" id="xValue" type="number" min="0.0001" step="0.1" value="1"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0.0001" step="0.1" value="0.5"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0.0001" step="0.1" value="2"/></div></div>',
        quantile:
          '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.5"/></div>',
      },
      validate: (p) => Number.isFinite(p.mu) && Number.isFinite(p.sigma) && p.sigma > 0,
      cdf: (x, p) => (x <= 0 ? 0 : window.jStat.lognormal.cdf(x, p.mu, p.sigma)),
      pdf: (x, p) => (x <= 0 ? 0 : window.jStat.lognormal.pdf(x, p.mu, p.sigma)),
      inv: (q, p) => {
        const clamped = Math.min(1 - 1e-12, Math.max(1e-12, q));
        return window.jStat.lognormal.inv(clamped, p.mu, p.sigma);
      },
      statsValues: (p) => ({
        mu: p.mu,
        sigma: p.sigma,
        mean: Math.exp(p.mu + (p.sigma * p.sigma) / 2),
        variance: (Math.exp(p.sigma * p.sigma) - 1) * Math.exp(2 * p.mu + p.sigma * p.sigma),
      }),
      chartDomain: (p, rangeValue) => {
        const q = rangeValue === "wide" ? 0.999 : rangeValue === "standard" ? 0.95 : 0.99;
        const maxByQuantile = window.jStat.lognormal.inv(q, p.mu, p.sigma);
        const fallback = Math.exp(p.mu + 4 * p.sigma);
        const max = Number.isFinite(maxByQuantile) && maxByQuantile > 0 ? maxByQuantile : fallback;
        return { min: 0, max: Math.max(1e-6, max) };
      },
    },
    weibulldistribution: {
      title: "Weibull Distribution Calculator",
      about: "About Weibull Distribution...",
      params: [
        { id: "shape", label: "Shape Parameter (k)", sub: "Shape controls hazard behavior, must be greater than 0", defaultValue: 2 },
        { id: "scale", label: "Scale Parameter (lambda)", sub: "Scale controls spread, must be greater than 0", defaultValue: 1 },
      ],
      rangeOptions: [
        { value: "standard", label: "Standard" },
        { value: "extended", label: "Extended" },
        { value: "wide", label: "Wide Tail" },
      ],
      defaults: { range: "extended", precision: 3 },
      stats: [
        { key: "shape", label: "Shape (k)" },
        { key: "scale", label: "Scale (lambda)" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>X Value (x >= 0)</label><input class="input-field" id="xValue" type="number" min="0" step="0.1" value="1"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0" step="0.1" value="0.5"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0" step="0.1" value="2"/></div></div>',
        quantile:
          '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.5"/></div>',
      },
      validate: (p) => Number.isFinite(p.shape) && Number.isFinite(p.scale) && p.shape > 0 && p.scale > 0,
      cdf: (x, p) => (x < 0 ? 0 : window.jStat.weibull.cdf(x, p.shape, p.scale)),
      pdf: (x, p) => (x < 0 ? 0 : window.jStat.weibull.pdf(x, p.shape, p.scale)),
      inv: (q, p) => {
        const clamped = Math.min(1 - 1e-12, Math.max(1e-12, q));
        return window.jStat.weibull.inv(clamped, p.shape, p.scale);
      },
      statsValues: (p) => {
        const g1 = window.jStat.gammafn(1 + 1 / p.shape);
        const g2 = window.jStat.gammafn(1 + 2 / p.shape);
        const mean = p.scale * g1;
        return {
          shape: p.shape,
          scale: p.scale,
          mean,
          variance: p.scale * p.scale * (g2 - g1 * g1),
        };
      },
      chartDomain: (p, rangeValue) => {
        const q = rangeValue === "wide" ? 0.995 : rangeValue === "standard" ? 0.9 : 0.97;
        const maxByQuantile = window.jStat.weibull.inv(q, p.shape, p.scale);
        const fallback = p.scale * 6;
        const max = Number.isFinite(maxByQuantile) && maxByQuantile > 0 ? maxByQuantile : fallback;
        return { min: 0, max: Math.max(1e-6, max) };
      },
    },
    betadistribution: {
      title: "Beta Distribution Calculator",
      about: "About Beta Distribution...",
      params: [
        { id: "alpha", label: "Alpha (alpha)", sub: "First shape parameter, must be greater than 0", defaultValue: 2 },
        { id: "beta", label: "Beta (beta)", sub: "Second shape parameter, must be greater than 0", defaultValue: 3 },
      ],
      rangeOptions: [
        { value: "full", label: "0 to 1" },
      ],
      defaults: { range: "full", precision: 3 },
      stats: [
        { key: "alpha", label: "alpha" },
        { key: "beta", label: "beta" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>X Value (0 to 1)</label><input class="input-field" id="xValue" type="number" min="0" max="1" step="0.01" value="0.5"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0" max="1" step="0.01" value="0.2"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0" max="1" step="0.01" value="0.8"/></div></div>',
        quantile:
          '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.5"/></div>',
      },
      validate: (p) => Number.isFinite(p.alpha) && Number.isFinite(p.beta) && p.alpha > 0 && p.beta > 0,
      cdf: (x, p) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        return window.jStat.beta.cdf(x, p.alpha, p.beta);
      },
      pdf: (x, p) => {
        if (x < 0 || x > 1) return 0;
        return window.jStat.beta.pdf(x, p.alpha, p.beta);
      },
      inv: (q, p) => {
        const clamped = Math.min(1 - 1e-12, Math.max(1e-12, q));
        return window.jStat.beta.inv(clamped, p.alpha, p.beta);
      },
      statsValues: (p) => ({
        alpha: p.alpha,
        beta: p.beta,
        mean: p.alpha / (p.alpha + p.beta),
        variance: (p.alpha * p.beta) / (((p.alpha + p.beta) ** 2) * (p.alpha + p.beta + 1)),
      }),
      chartDomain: () => ({ min: 0, max: 1 }),
    },
    poissondistribution: {
      title: "Poisson Distribution Calculator",
      about: "About Poisson Distribution...",
      params: [{ id: "lambda", label: "Rate Parameter (lambda)", sub: "Average events per interval, must be greater than 0", defaultValue: 3 }],
      rangeOptions: [
        { value: "focused", label: "Focused" },
        { value: "full", label: "Full Tail" },
      ],
      defaults: { range: "focused", precision: 3 },
      stats: [
        { key: "lambda", label: "lambda" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
        { key: "std", label: "Std Dev" },
      ],
      calcModes: [
        { value: "probability", title: "Find P(X = k)", subtitle: "Probability of exactly k events" },
        { value: "cumulative", title: "Find P(X <= k)", subtitle: "Cumulative probability up to k events" },
        { value: "between", title: "Find P(a <= X <= b)", subtitle: "Probability between two event counts" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>k Value (events)</label><input class="input-field" id="kValue" type="number" min="0" step="1" value="3"/></div>',
        cumulative:
          '<div class="input-group"><label>k Value (events)</label><input class="input-field" id="kValueCum" type="number" min="0" step="1" value="5"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0" step="1" value="2"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0" step="1" value="6"/></div></div>',
      },
      validate: (p) => Number.isFinite(p.lambda) && p.lambda > 0,
      cdf: (x, p) => {
        if (x < 0) return 0;
        return window.jStat.poisson.cdf(Math.floor(x), p.lambda);
      },
      pdf: (x, p) => {
        if (!Number.isInteger(x) || x < 0) return 0;
        return window.jStat.poisson.pdf(x, p.lambda);
      },
      statsValues: (p) => ({ lambda: p.lambda, mean: p.lambda, variance: p.lambda, std: Math.sqrt(p.lambda) }),
      chartDomain: (p, rangeValue) => {
        const s = Math.sqrt(p.lambda);
        if (rangeValue === "full") return { min: 0, max: Math.max(15, Math.ceil(p.lambda + 6 * s)) };
        return { min: 0, max: Math.max(8, Math.ceil(p.lambda + 4 * s)) };
      },
      discrete: true,
      compute: ({ params, type, precision, getValue, formatNum, cfg }) => {
        if (type === "probability") {
          const k = Math.max(0, Math.round(getValue("kValue", 3)));
          const result = cfg.pdf(k, params);
          return {
            result,
            expression: `P(X = ${k})`,
            explanation: "Probability of exactly k events.",
            percentageText: `(${(result * 100).toFixed(1)}%)`,
            equationText: `P(X = ${k}) = ${formatNum(result, precision)}`,
            shadeMin: k,
            shadeMax: k,
            markerValues: [k],
          };
        }
        if (type === "cumulative") {
          const k = Math.max(0, Math.round(getValue("kValueCum", 5)));
          const result = cfg.cdf(k, params);
          return {
            result,
            expression: `P(X <= ${k})`,
            explanation: "Cumulative probability up to k events.",
            percentageText: `(${(result * 100).toFixed(1)}%)`,
            equationText: `P(X <= ${k}) = ${formatNum(result, precision)}`,
            shadeMin: 0,
            shadeMax: k,
            markerValues: [k],
          };
        }
        const a = Math.max(0, Math.round(getValue("lowerBound", 2)));
        const b = Math.max(0, Math.round(getValue("upperBound", 6)));
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const lowerProb = lo > 0 ? cfg.cdf(lo - 1, params) : 0;
        const upperProb = cfg.cdf(hi, params);
        const result = Math.max(0, upperProb - lowerProb);
        return {
          result,
          expression: `P(${lo} <= X <= ${hi})`,
          explanation: "Probability between event count bounds.",
          percentageText: `(${(result * 100).toFixed(1)}%)`,
          equationText: `P(${lo} <= X <= ${hi}) = ${formatNum(result, precision)}`,
          shadeMin: lo,
          shadeMax: hi,
          markerValues: [lo, hi],
        };
      },
    },
    geometricdistribution: {
      title: "Geometric Distribution Calculator",
      about: "About Geometric Distribution...",
      params: [{ id: "successProb", label: "Success Probability (p)", sub: "Probability of success per trial (0 < p <= 1)", defaultValue: 0.5 }],
      rangeOptions: [
        { value: "focused", label: "Focused" },
        { value: "wide", label: "Wide" },
      ],
      defaults: { range: "focused", precision: 3 },
      stats: [
        { key: "p", label: "p" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
        { key: "std", label: "Std Dev" },
      ],
      calcModes: [
        { value: "probability", title: "Find P(X = k)", subtitle: "Exactly k trials until first success" },
        { value: "cumulative", title: "Find P(X <= k)", subtitle: "At most k trials until first success" },
        { value: "between", title: "Find P(a <= X <= b)", subtitle: "Trials until first success within range" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>k Value (trials)</label><input class="input-field" id="kValue" type="number" min="1" step="1" value="3"/></div>',
        cumulative:
          '<div class="input-group"><label>k Value (trials)</label><input class="input-field" id="kValueCum" type="number" min="1" step="1" value="5"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="1" step="1" value="2"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="1" step="1" value="6"/></div></div>',
      },
      validate: (p) => Number.isFinite(p.successProb) && p.successProb > 0 && p.successProb <= 1,
      cdf: (x, p) => {
        const k = Math.floor(x);
        if (k < 1) return 0;
        return 1 - Math.pow(1 - p.successProb, k);
      },
      pdf: (x, p) => {
        if (!Number.isInteger(x) || x < 1) return 0;
        return Math.pow(1 - p.successProb, x - 1) * p.successProb;
      },
      statsValues: (p) => ({
        p: p.successProb,
        mean: 1 / p.successProb,
        variance: (1 - p.successProb) / (p.successProb * p.successProb),
        std: Math.sqrt((1 - p.successProb) / (p.successProb * p.successProb)),
      }),
      chartDomain: (p, rangeValue) => {
        const q = rangeValue === "wide" ? 0.995 : 0.97;
        const k = Math.log(1 - q) / Math.log(1 - p.successProb);
        return { min: 1, max: Math.max(8, Math.ceil(k)) };
      },
      discrete: true,
      compute: ({ params, type, precision, getValue, formatNum, cfg }) => {
        if (type === "probability") {
          const k = Math.max(1, Math.round(getValue("kValue", 3)));
          const result = cfg.pdf(k, params);
          return {
            result,
            expression: `P(X = ${k})`,
            explanation: "Probability first success occurs on trial k.",
            percentageText: `(${(result * 100).toFixed(1)}%)`,
            equationText: `P(X = ${k}) = ${formatNum(result, precision)}`,
            shadeMin: k,
            shadeMax: k,
            markerValues: [k],
          };
        }
        if (type === "cumulative") {
          const k = Math.max(1, Math.round(getValue("kValueCum", 5)));
          const result = cfg.cdf(k, params);
          return {
            result,
            expression: `P(X <= ${k})`,
            explanation: "Probability first success occurs by trial k.",
            percentageText: `(${(result * 100).toFixed(1)}%)`,
            equationText: `P(X <= ${k}) = ${formatNum(result, precision)}`,
            shadeMin: 1,
            shadeMax: k,
            markerValues: [k],
          };
        }
        const a = Math.max(1, Math.round(getValue("lowerBound", 2)));
        const b = Math.max(1, Math.round(getValue("upperBound", 6)));
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const result = Math.max(0, cfg.cdf(hi, params) - cfg.cdf(lo - 1, params));
        return {
          result,
          expression: `P(${lo} <= X <= ${hi})`,
          explanation: "Probability first success occurs within the interval.",
          percentageText: `(${(result * 100).toFixed(1)}%)`,
          equationText: `P(${lo} <= X <= ${hi}) = ${formatNum(result, precision)}`,
          shadeMin: lo,
          shadeMax: hi,
          markerValues: [lo, hi],
        };
      },
    },
    hypergeometricdistribution: {
      title: "Hypergeometric Distribution Calculator",
      about: "About Hypergeometric Distribution...",
      params: [
        { id: "populationSize", label: "Population Size (N)", sub: "Total finite population size", defaultValue: 50 },
        { id: "successStates", label: "Success States (K)", sub: "Number of successes in population", defaultValue: 20 },
        { id: "draws", label: "Sample Size (n)", sub: "Number of draws without replacement", defaultValue: 10 },
      ],
      rangeOptions: [{ value: "full", label: "Full Support" }],
      defaults: { range: "full", precision: 3 },
      stats: [
        { key: "N", label: "N" },
        { key: "K", label: "K" },
        { key: "n", label: "n" },
        { key: "mean", label: "Mean" },
      ],
      calcModes: [
        { value: "probability", title: "Find P(X = k)", subtitle: "Exactly k successes in sample" },
        { value: "cumulative", title: "Find P(X <= k)", subtitle: "At most k successes in sample" },
        { value: "between", title: "Find P(a <= X <= b)", subtitle: "Successes in sample within interval" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>k Value (successes)</label><input class="input-field" id="kValue" type="number" min="0" step="1" value="5"/></div>',
        cumulative:
          '<div class="input-group"><label>k Value (successes)</label><input class="input-field" id="kValueCum" type="number" min="0" step="1" value="8"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0" step="1" value="3"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0" step="1" value="7"/></div></div>',
      },
      validate: (p) =>
        Number.isFinite(p.populationSize) &&
        Number.isFinite(p.successStates) &&
        Number.isFinite(p.draws) &&
        Number.isInteger(p.populationSize) &&
        Number.isInteger(p.successStates) &&
        Number.isInteger(p.draws) &&
        p.populationSize > 0 &&
        p.successStates >= 0 &&
        p.draws > 0 &&
        p.successStates <= p.populationSize &&
        p.draws <= p.populationSize,
      cdf: (x, p) => window.jStat.hypgeom.cdf(Math.floor(x), p.populationSize, p.successStates, p.draws),
      pdf: (x, p) => {
        if (!Number.isInteger(x)) return 0;
        return window.jStat.hypgeom.pdf(x, p.populationSize, p.successStates, p.draws);
      },
      statsValues: (p) => {
        const mean = (p.draws * p.successStates) / p.populationSize;
        return { N: p.populationSize, K: p.successStates, n: p.draws, mean };
      },
      chartDomain: (p) => {
        const minK = Math.max(0, p.draws - (p.populationSize - p.successStates));
        const maxK = Math.min(p.draws, p.successStates);
        return { min: minK, max: maxK };
      },
      discrete: true,
      compute: ({ params, type, precision, getValue, formatNum, cfg }) => {
        const minK = Math.max(0, params.draws - (params.populationSize - params.successStates));
        const maxK = Math.min(params.draws, params.successStates);
        const clampK = (v) => Math.min(maxK, Math.max(minK, Math.round(v)));
        if (type === "probability") {
          const k = clampK(getValue("kValue", Math.round((minK + maxK) / 2)));
          const result = cfg.pdf(k, params);
          return {
            result,
            expression: `P(X = ${k})`,
            explanation: "Probability of exactly k sampled successes.",
            percentageText: `(${(result * 100).toFixed(1)}%)`,
            equationText: `P(X = ${k}) = ${formatNum(result, precision)}`,
            shadeMin: k,
            shadeMax: k,
            markerValues: [k],
          };
        }
        if (type === "cumulative") {
          const k = clampK(getValue("kValueCum", maxK));
          const result = cfg.cdf(k, params);
          return {
            result,
            expression: `P(X <= ${k})`,
            explanation: "Cumulative probability up to k sampled successes.",
            percentageText: `(${(result * 100).toFixed(1)}%)`,
            equationText: `P(X <= ${k}) = ${formatNum(result, precision)}`,
            shadeMin: minK,
            shadeMax: k,
            markerValues: [k],
          };
        }
        const a = clampK(getValue("lowerBound", minK));
        const b = clampK(getValue("upperBound", maxK));
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const result = Math.max(0, cfg.cdf(hi, params) - cfg.cdf(lo - 1, params));
        return {
          result,
          expression: `P(${lo} <= X <= ${hi})`,
          explanation: "Probability sampled successes fall in the interval.",
          percentageText: `(${(result * 100).toFixed(1)}%)`,
          equationText: `P(${lo} <= X <= ${hi}) = ${formatNum(result, precision)}`,
          shadeMin: lo,
          shadeMax: hi,
          markerValues: [lo, hi],
        };
      },
    },
    chisquaredistribution: {
      title: "Chi-Square Distribution Calculator",
      about: "About Chi-Square Distribution...",
      params: [{ id: "df", label: "Degrees of Freedom (nu)", sub: "Controls shape, must be greater than 0", defaultValue: 10 }],
      rangeOptions: [
        { value: "standard", label: "Standard" },
        { value: "wide", label: "Wide Tail" },
      ],
      defaults: { range: "standard", precision: 3 },
      stats: [
        { key: "df", label: "df" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
        { key: "skewness", label: "Skewness" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>X Value (x >= 0)</label><input class="input-field" id="xValue" type="number" min="0" step="0.1" value="8"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0" step="0.1" value="6"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0" step="0.1" value="14"/></div></div>',
        quantile:
          '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.95"/></div>',
      },
      validate: (p) => Number.isFinite(p.df) && p.df > 0,
      cdf: (x, p) => (x <= 0 ? 0 : window.jStat.chisquare.cdf(x, p.df)),
      pdf: (x, p) => (x < 0 ? 0 : window.jStat.chisquare.pdf(x, p.df)),
      inv: (q, p) => window.jStat.chisquare.inv(Math.min(1 - 1e-12, Math.max(1e-12, q)), p.df),
      statsValues: (p) => ({ df: p.df, mean: p.df, variance: 2 * p.df, skewness: Math.sqrt(8 / p.df) }),
      chartDomain: (p, rangeValue) => {
        const q = rangeValue === "wide" ? 0.999 : 0.995;
        const max = window.jStat.chisquare.inv(q, p.df);
        const fallback = p.df + 6 * Math.sqrt(2 * p.df);
        return { min: 0, max: Number.isFinite(max) ? max : fallback };
      },
    },
    fdistribution: {
      title: "F Distribution Calculator",
      about: "About F Distribution...",
      params: [
        { id: "df1", label: "Numerator df (df1)", sub: "Degrees of freedom in numerator", defaultValue: 10 },
        { id: "df2", label: "Denominator df (df2)", sub: "Degrees of freedom in denominator", defaultValue: 15 },
      ],
      rangeOptions: [
        { value: "standard", label: "Standard" },
        { value: "wide", label: "Wide Tail" },
      ],
      defaults: { range: "standard", precision: 3 },
      stats: [
        { key: "df1", label: "df1" },
        { key: "df2", label: "df2" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>X Value (x > 0)</label><input class="input-field" id="xValue" type="number" min="0.0001" step="0.1" value="1.2"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0.0001" step="0.1" value="0.8"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0.0001" step="0.1" value="2.0"/></div></div>',
        quantile:
          '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.95"/></div>',
      },
      validate: (p) => Number.isFinite(p.df1) && Number.isFinite(p.df2) && p.df1 > 0 && p.df2 > 0,
      cdf: (x, p) => (x <= 0 ? 0 : window.jStat.centralF.cdf(x, p.df1, p.df2)),
      pdf: (x, p) => (x <= 0 ? 0 : window.jStat.centralF.pdf(x, p.df1, p.df2)),
      inv: (q, p) => window.jStat.centralF.inv(Math.min(1 - 1e-12, Math.max(1e-12, q)), p.df1, p.df2),
      statsValues: (p) => {
        const mean = p.df2 > 2 ? p.df2 / (p.df2 - 2) : NaN;
        const variance =
          p.df2 > 4 ? (2 * p.df2 * p.df2 * (p.df1 + p.df2 - 2)) / (p.df1 * (p.df2 - 2) * (p.df2 - 2) * (p.df2 - 4)) : NaN;
        return { df1: p.df1, df2: p.df2, mean, variance };
      },
      chartDomain: (p, rangeValue) => {
        const q = rangeValue === "wide" ? 0.999 : 0.995;
        const max = window.jStat.centralF.inv(q, p.df1, p.df2);
        return { min: 0, max: Number.isFinite(max) ? max : 5 };
      },
    },
    tdistribution: {
      title: "t Distribution Calculator",
      about: "About t Distribution...",
      params: [{ id: "df", label: "Degrees of Freedom (nu)", sub: "Controls tail heaviness, must be greater than 0", defaultValue: 10 }],
      rangeOptions: [
        { value: "standard", label: "Standard" },
        { value: "wide", label: "Wide" },
      ],
      defaults: { range: "standard", precision: 3 },
      stats: [
        { key: "df", label: "df" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
        { key: "skewness", label: "Skewness" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>X Value</label><input class="input-field" id="xValue" type="number" step="0.1" value="1.5"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" step="0.1" value="-1"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" step="0.1" value="1"/></div></div>',
        quantile:
          '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.95"/></div>',
      },
      validate: (p) => Number.isFinite(p.df) && p.df > 0,
      cdf: (x, p) => window.jStat.studentt.cdf(x, p.df),
      pdf: (x, p) => window.jStat.studentt.pdf(x, p.df),
      inv: (q, p) => window.jStat.studentt.inv(Math.min(1 - 1e-12, Math.max(1e-12, q)), p.df),
      statsValues: (p) => ({
        df: p.df,
        mean: p.df > 1 ? 0 : NaN,
        variance: p.df > 2 ? p.df / (p.df - 2) : NaN,
        skewness: p.df > 3 ? 0 : NaN,
      }),
      chartDomain: (p, rangeValue) => {
        const q = rangeValue === "wide" ? 0.999 : 0.995;
        const x = window.jStat.studentt.inv(q, p.df);
        const m = Number.isFinite(x) ? Math.abs(x) : 5;
        return { min: -m, max: m };
      },
    },
    binomialdistribution: {
      title: "Binomial Distribution Calculator",
      about: "About Binomial Distribution...",
      params: [
        { id: "trials", label: "Number of Trials (n)", sub: "Positive integer number of Bernoulli trials", defaultValue: 10 },
        { id: "successProb", label: "Probability of Success (p)", sub: "Probability for each trial, between 0 and 1", defaultValue: 0.5 },
      ],
      rangeOptions: [
        { value: "focused", label: "Focused" },
        { value: "full", label: "Full (0-n)" },
      ],
      defaults: { range: "focused", precision: 3 },
      stats: [
        { key: "n", label: "n (Trials)" },
        { key: "p", label: "p (Success)" },
        { key: "mean", label: "Mean" },
        { key: "variance", label: "Variance" },
      ],
      calcModes: [
        { value: "probability", title: "Find P(X = k)", subtitle: "Probability of exactly k successes" },
        { value: "cumulative", title: "Find P(X <= k)", subtitle: "Cumulative probability up to k successes" },
        { value: "between", title: "Find P(a <= X <= b)", subtitle: "Probability between two success counts" },
      ],
      contextInputs: {
        probability:
          '<div class="input-group"><label>k Value (successes)</label><input class="input-field" id="kValue" type="number" min="0" step="1" value="5"/></div>',
        cumulative:
          '<div class="input-group"><label>k Value (successes)</label><input class="input-field" id="kValueCum" type="number" min="0" step="1" value="5"/></div>',
        between:
          '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" min="0" step="1" value="3"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" min="0" step="1" value="7"/></div></div>',
      },
      validate: (p) =>
        Number.isFinite(p.trials) &&
        Number.isFinite(p.successProb) &&
        Number.isInteger(p.trials) &&
        p.trials > 0 &&
        p.successProb >= 0 &&
        p.successProb <= 1,
      cdf: (x, p) => {
        if (x < 0) return 0;
        if (x >= p.trials) return 1;
        return window.jStat.binomial.cdf(Math.floor(x), p.trials, p.successProb);
      },
      pdf: (x, p) => {
        if (!Number.isInteger(x) || x < 0 || x > p.trials) return 0;
        return window.jStat.binomial.pdf(x, p.trials, p.successProb);
      },
      statsValues: (p) => ({
        n: p.trials,
        p: p.successProb,
        mean: p.trials * p.successProb,
        variance: p.trials * p.successProb * (1 - p.successProb),
      }),
      chartDomain: (p, rangeValue) => {
        if (rangeValue === "full") return { min: 0, max: p.trials };
        const mean = p.trials * p.successProb;
        const std = Math.sqrt(Math.max(0, p.trials * p.successProb * (1 - p.successProb)));
        return {
          min: Math.max(0, Math.floor(mean - 3 * std)),
          max: Math.min(p.trials, Math.ceil(mean + 3 * std)),
        };
      },
      discrete: true,
      compute: ({ params, type, precision, getValue, formatNum, cfg }) => {
        const n = params.trials;
        const p = params.successProb;

        if (type === "probability") {
          const k = Math.round(getValue("kValue", Math.round(n / 2)));
          const kc = Math.max(0, Math.min(n, k));
          const result = cfg.pdf(kc, params);
          return {
            result,
            expression: `P(X = ${kc})`,
            explanation: "Probability of exactly k successes.",
            percentageText: `(${(result * 100).toFixed(1)}%)`,
            equationText: `P(X = ${kc}) = ${formatNum(result, precision)}`,
            shadeMin: kc,
            shadeMax: kc,
            markerValues: [kc],
          };
        }

        if (type === "cumulative") {
          const k = Math.round(getValue("kValueCum", Math.round(n / 2)));
          const kc = Math.max(0, Math.min(n, k));
          const result = cfg.cdf(kc, params);
          return {
            result,
            expression: `P(X <= ${kc})`,
            explanation: "Cumulative probability up to and including k successes.",
            percentageText: `(${(result * 100).toFixed(1)}%)`,
            equationText: `P(X <= ${kc}) = ${formatNum(result, precision)}`,
            shadeMin: 0,
            shadeMax: kc,
            markerValues: [kc],
          };
        }

        const a = Math.round(getValue("lowerBound", Math.max(0, Math.floor(n * 0.3))));
        const b = Math.round(getValue("upperBound", Math.min(n, Math.ceil(n * 0.7))));
        const lo = Math.max(0, Math.min(n, Math.min(a, b)));
        const hi = Math.max(0, Math.min(n, Math.max(a, b)));
        const lowerProb = lo > 0 ? cfg.cdf(lo - 1, params) : 0;
        const upperProb = cfg.cdf(hi, params);
        const result = Math.max(0, upperProb - lowerProb);
        return {
          result,
          expression: `P(${lo} <= X <= ${hi})`,
          explanation: "Probability of successes falling between the bounds.",
          percentageText: `(${(result * 100).toFixed(1)}%)`,
          equationText: `P(${lo} <= X <= ${hi}) = ${formatNum(result, precision)}`,
          shadeMin: lo,
          shadeMax: hi,
          markerValues: [lo, hi],
        };
      },
    },
  };

  const DISTRIBUTION_HELP_DETAILS = {
    uniformdistribution: {
      intro:
        "The Uniform distribution represents complete equiprobability across a finite interval [a, b]. Every value inside the interval has the same density, while values outside have zero density.",
      historical:
        "Uniform models are foundational in simulation, randomization, and Monte Carlo methods. They are often used as base generators for transforming random variables into more complex distributions.",
      formulas: [
        "PDF: f(x) = 1 / (b - a), for a <= x <= b",
        "CDF: F(x) = (x - a) / (b - a), for a <= x <= b",
        "Mean: (a + b) / 2, Variance: (b - a)^2 / 12"
      ],
      properties: [
        "Flat density over [a, b]",
        "Bounded support with finite tails",
        "Skewness is zero (symmetric interval)",
        "Useful baseline for uncertainty with hard bounds"
      ]
    },
    binomialdistribution: {
      intro:
        "The Binomial distribution models the number of successes in n independent Bernoulli trials with success probability p. It is a core discrete model for repeated yes/no outcomes.",
      historical:
        "Binomial theory dates to early probability work by Jacob Bernoulli and became central in statistical inference for proportions, tests, and confidence intervals.",
      formulas: [
        "PMF: P(X = k) = C(n, k) * p^k * (1 - p)^(n - k)",
        "Mean: n*p",
        "Variance: n*p*(1 - p)"
      ],
      properties: [
        "Discrete support: k = 0..n",
        "Symmetric only when p = 0.5",
        "Approaches Normal for large n with moderate p",
        "Approaches Poisson when n is large and p is small"
      ]
    },
    poissondistribution: {
      intro:
        "The Poisson distribution models counts of events in fixed intervals when events happen independently at a constant average rate lambda.",
      historical:
        "Introduced by Simeon Denis Poisson in the 19th century, this model became a standard for rare-event and arrival-count analysis in operations and sciences.",
      formulas: [
        "PMF: P(X = k) = e^(-lambda) * lambda^k / k!",
        "Mean: lambda",
        "Variance: lambda"
      ],
      properties: [
        "Discrete nonnegative counts",
        "Mean equals variance",
        "Suitable for low-probability, high-opportunity event systems",
        "Links directly to Exponential waiting-time models"
      ]
    },
    geometricdistribution: {
      intro:
        "The Geometric distribution models the number of trials needed to get the first success in repeated independent Bernoulli trials.",
      historical:
        "Geometric waiting-time models are classic examples in introductory stochastic processes and underpin reliability and queueing abstractions.",
      formulas: [
        "PMF: P(X = k) = (1 - p)^(k - 1) * p, k >= 1",
        "CDF: P(X <= k) = 1 - (1 - p)^k",
        "Mean: 1 / p, Variance: (1 - p) / p^2"
      ],
      properties: [
        "Discrete waiting-time model",
        "Memoryless among discrete distributions",
        "Right-skewed with heavier tail at small p",
        "Natural for first-hit and first-defect questions"
      ]
    },
    hypergeometricdistribution: {
      intro:
        "The Hypergeometric distribution models success counts when sampling without replacement from a finite population containing K successes out of N items.",
      historical:
        "This model appears in quality inspection, finite-population inference, and classical urn-problem probability.",
      formulas: [
        "PMF: P(X = k) = [C(K, k) * C(N-K, n-k)] / C(N, n)",
        "Mean: n*(K/N)",
        "Variance: n*(K/N)*(1-K/N)*((N-n)/(N-1))"
      ],
      properties: [
        "Finite-support discrete model",
        "Captures dependence induced by sampling without replacement",
        "Includes finite population correction in variance",
        "Common in audit and acceptance sampling"
      ]
    },
    chisquaredistribution: {
      intro:
        "The Chi-Square distribution arises as the sum of squared independent standard normal variables. It is fundamental in variance inference and goodness-of-fit testing.",
      historical:
        "Pearson's chi-square work made this family central to contingency-table analysis and model fit diagnostics.",
      formulas: [
        "If Z_i ~ N(0,1), then X = sum(Z_i^2) ~ ChiSquare(df)",
        "Mean: df",
        "Variance: 2*df"
      ],
      properties: [
        "Continuous and right-skewed",
        "Support on x >= 0",
        "Skew decreases as df increases",
        "Core distribution for many test statistics"
      ]
    },
    fdistribution: {
      intro:
        "The F distribution is the ratio of two scaled independent chi-square variables and is widely used in ANOVA and variance-ratio testing.",
      historical:
        "Associated with Ronald Fisher's work, the F family became central in experimental design and linear-model significance testing.",
      formulas: [
        "F = (U/df1) / (V/df2), with U and V independent chi-square variables",
        "Mean exists for df2 > 2: df2/(df2 - 2)",
        "Variance exists for df2 > 4"
      ],
      properties: [
        "Continuous with support x > 0",
        "Shape controlled by both df1 and df2",
        "Right-tailed and often asymmetric",
        "Used for model and variance comparisons"
      ]
    },
    tdistribution: {
      intro:
        "The Student's t distribution models standardized means when population variance is unknown and sample size is limited.",
      historical:
        "Published by William Sealy Gosset ('Student') in 1908, t methods are a cornerstone of small-sample inference.",
      formulas: [
        "t = (Xbar - mu) / (S/sqrt(n))",
        "Mean is 0 for df > 1",
        "Variance is df/(df-2) for df > 2"
      ],
      properties: [
        "Symmetric about zero",
        "Heavier tails than Normal",
        "Converges to Normal as df increases",
        "Used for means, slopes, and confidence intervals"
      ]
    },
    lognormaldistribution: {
      intro:
        "A variable is log-normal when its logarithm is normally distributed. It models positive quantities produced by multiplicative effects.",
      historical:
        "Log-normal behavior appears in economics, biology, and reliability where proportional growth and multiplicative shocks dominate.",
      formulas: [
        "If ln(X) ~ Normal(mu, sigma^2), then X is Log-Normal",
        "Median: exp(mu)",
        "Mean: exp(mu + sigma^2/2)"
      ],
      properties: [
        "Strictly positive support",
        "Strong right skew",
        "Mean exceeds median due to tail weight",
        "Useful for size, duration, and income-type variables"
      ]
    },
    weibulldistribution: {
      intro:
        "The Weibull distribution is a flexible lifetime model where shape parameter k controls failure-rate behavior over time.",
      historical:
        "Popularized in reliability engineering, Weibull analysis is standard for durability testing and maintenance planning.",
      formulas: [
        "CDF: F(x) = 1 - exp(-(x/lambda)^k), x >= 0",
        "PDF: f(x) = (k/lambda)*(x/lambda)^(k-1)*exp(-(x/lambda)^k)",
        "Hazard rises for k>1, constant for k=1, declines for k<1"
      ],
      properties: [
        "Continuous support on x >= 0",
        "Can mimic several lifetime patterns",
        "Includes Exponential as special case (k=1)",
        "Common in reliability and survival modeling"
      ]
    },
    betadistribution: {
      intro:
        "The Beta distribution models random variables bounded in [0,1], making it ideal for probabilities, rates, and proportions.",
      historical:
        "The family became central in Bayesian modeling as a conjugate prior for Bernoulli/binomial probabilities.",
      formulas: [
        "PDF: f(x) proportional to x^(alpha-1) * (1-x)^(beta-1), 0<=x<=1",
        "Mean: alpha/(alpha+beta)",
        "Variance: alpha*beta / [(alpha+beta)^2*(alpha+beta+1)]"
      ],
      properties: [
        "Flexible bounded shapes (U, bell, skewed)",
        "Controlled by alpha and beta",
        "Naturally represents uncertainty on probabilities",
        "Supports Bayesian updating workflows"
      ]
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  let pdfChart = null;
  let cdfChart = null;
  let combinedChart = null;
  let currentTab = "pdf";

  function setRadioSelection() {
    document.querySelectorAll(".radio-option").forEach((el) => el.classList.remove("selected"));
    const checked = document.querySelector('input[name="calcType"]:checked');
    if (checked) {
      const row = checked.closest(".radio-option");
      if (row) row.classList.add("selected");
    }
  }

  function getParams(cfg) {
    return cfg.params.reduce((acc, p) => {
      acc[p.id] = parseFloat($(p.id)?.value);
      return acc;
    }, {});
  }

  function formatNum(v, precision) {
    return Number.isFinite(v) ? Number(v).toFixed(precision) : "--";
  }

  function initCalcModes(cfg) {
    const wrap = document.querySelector(".radio-group");
    if (!wrap) return;
    const modes = cfg.calcModes || [
      { value: "probability", title: "Find P(X <= x)", subtitle: "Probability up to a value" },
      { value: "between", title: "Find P(a <= X <= b)", subtitle: "Probability between two values" },
      { value: "quantile", title: "Find Value for Given Probability", subtitle: "Value at cumulative probability" },
    ];
    wrap.innerHTML = modes
      .map(
        (m, idx) => `<label class="radio-option">
          <input ${idx === 0 ? "checked" : ""} name="calcType" type="radio" value="${m.value}"/>
          <div>
            <strong>${m.title}</strong>
            <small style="color: #bbb; display: block; margin-top: 2px;">${m.subtitle}</small>
          </div>
        </label>`
      )
      .join("");
  }

  function getHeaderActionsContainer() {
    const header = document.querySelector(".header");
    if (!header) return null;
    let actions = header.querySelector(".header-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "header-actions";
      header.appendChild(actions);
    }
    return actions;
  }

  function initBackToHubButton() {
    const actions = getHeaderActionsContainer();
    if (!actions || actions.querySelector(".hub-back-link")) return;
    const link = document.createElement("a");
    link.className = "hub-back-link";
    link.href = "../../hub.html";
    link.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Hub';
    link.style.display = "inline-flex";
    link.style.alignItems = "center";
    link.style.gap = "7px";
    link.style.padding = "8px 12px";
    link.style.borderRadius = "999px";
    link.style.border = "1px solid rgba(255,255,255,0.22)";
    link.style.background = "rgba(255,255,255,0.06)";
    link.style.color = "#e7f2ff";
    link.style.textDecoration = "none";
    link.style.fontSize = "0.8rem";
    link.style.fontWeight = "700";
    link.style.whiteSpace = "nowrap";
    link.style.flexShrink = "0";
    actions.appendChild(link);
  }

  function initWebsiteLink() {
    const actions = getHeaderActionsContainer();
    if (!actions || actions.querySelector(".site-external-link")) return;
    const link = document.createElement("a");
    link.className = "site-external-link";
    link.href = "https://avibenita.github.io/";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = "Visit the Statistico website";
    link.innerHTML = '<i class="fas fa-arrow-up-right-from-square" style="font-size:0.72rem"></i> statistico.live';
    link.style.display = "inline-flex";
    link.style.alignItems = "center";
    link.style.gap = "5px";
    link.style.padding = "8px 12px";
    link.style.borderRadius = "999px";
    link.style.border = "1px solid rgba(255,255,255,0.13)";
    link.style.background = "rgba(255,255,255,0.04)";
    link.style.color = "rgba(210,228,248,0.58)";
    link.style.textDecoration = "none";
    link.style.fontSize = "0.78rem";
    link.style.fontWeight = "600";
    link.style.whiteSpace = "nowrap";
    link.style.flexShrink = "0";
    link.style.transition = "border-color .18s, background .18s, color .18s";
    link.addEventListener("mouseenter", () => {
      link.style.borderColor = "rgba(255,165,120,0.38)";
      link.style.background = "rgba(255,165,120,0.10)";
      link.style.color = "rgba(255,210,175,0.92)";
    });
    link.addEventListener("mouseleave", () => {
      link.style.borderColor = "rgba(255,255,255,0.13)";
      link.style.background = "rgba(255,255,255,0.04)";
      link.style.color = "rgba(210,228,248,0.58)";
    });
    actions.appendChild(link);
  }

  function ensureThemeToggleComponent() {
    if (window.StatisticoThemeToggle) return Promise.resolve();
    return new Promise((resolve) => {
      const existing = document.querySelector('script[data-st-theme="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => resolve(), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.dataset.stTheme = "1";
      script.src = "../../shared/theme-toggle-component.js?v=20260411-2";
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  function initThemeToggle() {
    const actions = getHeaderActionsContainer();
    if (!actions) return;
    ensureThemeToggleComponent().then(() => {
      if (!window.StatisticoThemeToggle) return;
      window.StatisticoThemeToggle.mount({ container: actions });
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function buildAutoAboutSections(cfg, distKey) {
    const title = String(cfg.title || "Distribution").replace(/\s*Calculator\s*$/i, "");
    const overview = cfg.about && cfg.about.startsWith("About ") ? cfg.about : `About ${title}`;
    const detail = DISTRIBUTION_HELP_DETAILS[distKey] || {};
    const paramsList = (cfg.params || [])
      .map((p) => `<li><strong>${escapeHtml(p.label || p.id)}</strong> - ${escapeHtml(p.sub || "Parameter input")}</li>`)
      .join("");
    const modes =
      cfg.calcModes || [
        { title: "Find P(X <= x)", subtitle: "Probability up to a value" },
        { title: "Find P(a <= X <= b)", subtitle: "Probability between two values" },
        { title: "Find Value for Given Probability", subtitle: "Value at cumulative probability" },
      ];
    const modesList = modes.map((m) => `<li><strong>${escapeHtml(m.title)}</strong> - ${escapeHtml(m.subtitle || "")}</li>`).join("");
    const statsList = (cfg.stats || []).map((s) => `<li>${escapeHtml(s.label || s.key)}</li>`).join("");
    const chartText = cfg.discrete
      ? "This is a discrete distribution. The PDF chart is rendered as lollipop stems/points, and CDF uses step lines."
      : "This is a continuous distribution. PDF and CDF are rendered as smooth curves with dynamic shaded ranges.";
    const applications =
      cfg.discrete
        ? [
            { icon: "fa-industry", title: "Quality Control", desc: "Model event counts and defect frequencies in repeated production intervals." },
            { icon: "fa-network-wired", title: "Operations", desc: "Estimate probabilities for count-based outcomes in workflow and service systems." },
            { icon: "fa-chart-line", title: "Risk Monitoring", desc: "Track threshold exceedance counts and rare-event likelihood over fixed windows." },
            { icon: "fa-flask", title: "Experimental Counts", desc: "Analyze trial-based or interval-based count outcomes in scientific studies." },
          ]
        : [
            { icon: "fa-clock", title: "Waiting-Time Analysis", desc: "Evaluate time-to-event behavior under distribution-specific assumptions." },
            { icon: "fa-heartbeat", title: "Reliability & Survival", desc: "Model lifetimes, failure times, and event-time probabilities." },
            { icon: "fa-chart-area", title: "Forecasting Inputs", desc: "Provide probability inputs for simulation, forecasting, and planning models." },
            { icon: "fa-microscope", title: "Scientific Measurement", desc: "Assess uncertainty and expected ranges for continuous outcomes." },
          ];
    const appCards = applications
      .map((a) => `<div class="application-item"><h4><i class="fas ${a.icon}"></i> ${escapeHtml(a.title)}</h4><p>${escapeHtml(a.desc)}</p></div>`)
      .join("");
    const formulasList = (detail.formulas || [])
      .map((line) => `• ${escapeHtml(line)}`)
      .join("<br>");
    const propertiesList = (detail.properties || [])
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");

    return `
      <div class="about-section">
        <h3><i class="fas fa-info-circle"></i> ${escapeHtml(overview)}</h3>
        <p>${escapeHtml(detail.intro || `Use this calculator to evaluate probabilities, cumulative values, and quantiles for the ${title}.`)}</p>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-calculator"></i> Mathematical Form</h3>
        <div class="formula-box">
          <div class="formula-title">Key Formulas</div>
          ${formulasList || "• Distribution-specific formulas are computed by the shared runtime."}
        </div>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-sliders-h"></i> Parameter Inputs</h3>
        <ul>${paramsList || "<li>Distribution-specific parameters are shown in the input panel.</li>"}</ul>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-calculator"></i> Calculation Modes</h3>
        <ul>${modesList}</ul>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-history"></i> Historical Context</h3>
        <p>${escapeHtml(detail.historical || `The ${title} is part of the core probability toolbox used in classical and modern statistical modeling.`)}</p>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-cogs"></i> Key Properties</h3>
        <ul>${propertiesList || "<li>Shape, support, and tail behavior depend on the configured parameters.</li>"}</ul>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-chart-bar"></i> Summary Statistics</h3>
        <ul>${statsList || "<li>Key statistics update automatically based on the current parameters.</li>"}</ul>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-chart-area"></i> Chart Behavior</h3>
        <p>${escapeHtml(chartText)}</p>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-globe"></i> Real-World Applications</h3>
        <div class="applications-grid">${appCards}</div>
      </div>
      <div class="about-section">
        <h3><i class="fas fa-tools"></i> Using This Calculator</h3>
        <ul>
          <li><strong>Set parameters:</strong> define the distribution shape/rate/location inputs.</li>
          <li><strong>Choose mode:</strong> evaluate point, cumulative, interval, or quantile results.</li>
          <li><strong>Interpret visuals:</strong> use PDF/CDF views to validate probability intuition.</li>
          <li><strong>Adjust precision:</strong> tune numeric display for reporting or analysis detail.</li>
        </ul>
      </div>
    `;
  }

  function getAboutModalBody(modal) {
    if (!modal) return null;
    const direct = modal.querySelector(".modal-body");
    if (direct) return direct;
    const content = modal.querySelector(".about-content");
    if (!content) return null;

    let host = content.querySelector(".about-body");
    if (!host) {
      host = document.createElement("div");
      host.className = "about-body";
      const header = content.querySelector(".about-header");
      if (header && header.parentNode === content) {
        header.insertAdjacentElement("afterend", host);
      } else {
        content.appendChild(host);
      }
    }

    const directSections = Array.from(content.children).filter((el) => el.classList && el.classList.contains("about-section"));
    if (directSections.length) {
      host.innerHTML = "";
      directSections.forEach((section) => host.appendChild(section));
    }
    return host;
  }

  function enhanceAboutModalContent(cfg) {
    const modal = $("aboutModal");
    const body = getAboutModalBody(modal);
    const distKey = detectDistribution();
    if (!modal || !body) return;
    const raw = body.textContent || "";
    const hasPlaceholder =
      raw.includes("Template + Injected Math") ||
      raw.includes("shared distribution template shell") ||
      body.querySelectorAll(".about-section").length <= 1;
    if (!hasPlaceholder) return;
    body.innerHTML = buildAutoAboutSections(cfg, distKey);
  }

  function parseFiniteOr(value, fallback) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function inferSliderBounds(cfg, params, inputEl) {
    const id = inputEl.id || "";
    const currentValue = parseFiniteOr(inputEl.value, 0);
    let min = parseFiniteOr(inputEl.min, NaN);
    let max = parseFiniteOr(inputEl.max, NaN);
    let step = parseFiniteOr(inputEl.step, NaN);

    if (!Number.isFinite(step) || step <= 0) {
      step = cfg.discrete || id.toLowerCase().includes("kvalue") ? 1 : 0.1;
    }

    if (id === "probability") {
      min = 0;
      max = 1;
      if (!Number.isFinite(step) || step <= 0) step = 0.01;
    }

    if (cfg.discrete && (id === "kValue" || id === "kValueCum" || id === "lowerBound" || id === "upperBound")) {
      min = 0;
      max = Math.max(1, Math.round(params.trials || 10));
      step = 1;
    }

    if (cfg === configs.hypergeometricdistribution && (id === "kValue" || id === "kValueCum" || id === "lowerBound" || id === "upperBound")) {
      const N = Math.round(params.populationSize || 0);
      const K = Math.round(params.successStates || 0);
      const n = Math.round(params.draws || 0);
      min = Math.max(0, n - (N - K));
      max = Math.max(min, Math.min(n, K));
      step = 1;
    }

    if (id === "xValue" || id === "lowerBound" || id === "upperBound") {
      const rangeValue = $("chartRange")?.value || cfg.defaults.range;
      const domain = typeof cfg.chartDomain === "function" ? cfg.chartDomain(params, rangeValue) : null;
      if (domain && Number.isFinite(domain.min) && Number.isFinite(domain.max) && domain.max > domain.min) {
        if (!Number.isFinite(min)) min = domain.min;
        if (!Number.isFinite(max)) max = domain.max;
      }
    }

    if (!Number.isFinite(min)) min = currentValue - (cfg.discrete ? 10 : 5);
    if (!Number.isFinite(max)) max = currentValue + (cfg.discrete ? 10 : 5);
    if (max <= min) max = min + step;

    return { min, max, step };
  }

  function addContextualInputSliders(cfg) {
    const wrap = $("inputSection");
    if (!wrap) return;
    const params = getParams(cfg);
    const inputFields = Array.from(wrap.querySelectorAll('input.input-field[type="number"]'));

    inputFields.forEach((inputEl) => {
      const parentGroup = inputEl.closest(".input-group");
      if (!parentGroup) return;

      const { min, max, step } = inferSliderBounds(cfg, params, inputEl);
      const initialValue = clamp(parseFiniteOr(inputEl.value, min), min, max);
      inputEl.value = String(initialValue);

      const sliderWrap = document.createElement("div");
      sliderWrap.style.marginTop = "8px";
      sliderWrap.style.display = "grid";
      sliderWrap.style.gap = "4px";

      const sliderMeta = document.createElement("div");
      sliderMeta.style.display = "flex";
      sliderMeta.style.justifyContent = "space-between";
      sliderMeta.style.fontSize = "0.75rem";
      sliderMeta.style.color = "rgba(255,255,255,0.65)";

      const sliderHint = document.createElement("span");
      sliderHint.textContent = "Interactive slider";

      const sliderValue = document.createElement("span");
      sliderValue.style.fontWeight = "700";
      sliderValue.style.color = "rgba(255,255,255,0.9)";

      const sliderEl = document.createElement("input");
      sliderEl.type = "range";
      sliderEl.min = String(min);
      sliderEl.max = String(max);
      sliderEl.step = String(step);
      sliderEl.value = String(initialValue);
      sliderEl.style.width = "100%";
      sliderEl.style.accentColor = "#ff9b73";

      const updateSliderLabel = () => {
        sliderValue.textContent = cfg.discrete || step >= 1 ? String(Math.round(parseFloat(sliderEl.value))) : Number(sliderEl.value).toFixed(3);
      };

      sliderMeta.appendChild(sliderHint);
      sliderMeta.appendChild(sliderValue);
      sliderWrap.appendChild(sliderMeta);
      sliderWrap.appendChild(sliderEl);
      parentGroup.appendChild(sliderWrap);
      updateSliderLabel();

      inputEl.addEventListener("input", () => {
        const num = clamp(parseFiniteOr(inputEl.value, min), min, max);
        sliderEl.value = String(num);
        updateSliderLabel();
      });

      sliderEl.addEventListener("input", () => {
        const raw = parseFloat(sliderEl.value);
        const next = cfg.discrete || step >= 1 ? Math.round(raw) : raw;
        inputEl.value = String(next);
        updateSliderLabel();
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  }

  function populateContextInput(cfg) {
    const wrap = $("inputSection");
    if (!wrap) return;
    const type = document.querySelector('input[name="calcType"]:checked')?.value || "probability";
    const customMarkup = cfg?.contextInputs?.[type];
    if (customMarkup) {
      wrap.innerHTML = customMarkup;
    } else if (type === "probability") {
      wrap.innerHTML = '<div class="input-group"><label>X Value</label><input class="input-field" id="xValue" type="number" step="0.1" value="0"/></div>';
    } else if (type === "between") {
      wrap.innerHTML = '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" step="0.1" value="-1"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" step="0.1" value="1"/></div></div>';
    } else {
      wrap.innerHTML = '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.5"/></div>';
    }
    wrap.querySelectorAll("input").forEach((i) => i.addEventListener("input", calculateAndRender));
    addContextualInputSliders(cfg);
  }

  function updateStats(cfg, params, precision) {
    const values = cfg.statsValues(params);
    cfg.stats.forEach((s, idx) => {
      const valueEl = $("stat" + String.fromCharCode(65 + idx));
      const labelEl = $("stat" + String.fromCharCode(65 + idx) + "Label");
      if (valueEl) valueEl.textContent = formatNum(values[s.key], precision);
      if (labelEl) labelEl.textContent = s.label;
    });
  }

  function buildSeries(cfg, params, domain) {
    if (cfg.discrete) {
      const minK = Math.max(0, Math.ceil(domain.min));
      const maxK = Math.max(minK, Math.floor(domain.max));
      const pdf = [];
      const cdf = [];
      for (let k = minK; k <= maxK; k += 1) {
        pdf.push([k, cfg.pdf(k, params)]);
        cdf.push([k, cfg.cdf(k, params)]);
      }
      return { pdf, cdf };
    }
    const n = 220;
    const step = (domain.max - domain.min) / (n - 1);
    const pdf = [];
    const cdf = [];
    for (let i = 0; i < n; i += 1) {
      const x = domain.min + i * step;
      pdf.push([x, cfg.pdf(x, params)]);
      cdf.push([x, cfg.cdf(x, params)]);
    }
    return { pdf, cdf };
  }

  function buildShadedPdfSeries(pdfSeries, shadeRange) {
    if (!shadeRange || !Number.isFinite(shadeRange.min) || !Number.isFinite(shadeRange.max)) {
      return [];
    }
    const lo = Math.min(shadeRange.min, shadeRange.max);
    const hi = Math.max(shadeRange.min, shadeRange.max);
    return pdfSeries.map(([x, y]) => (x >= lo && x <= hi ? [x, y] : [x, null]));
  }

  function formatMarkerValue(v) {
    const rounded = Number(v.toFixed(3));
    if (Object.is(rounded, -0)) return "0";
    return String(rounded);
  }

  function formatTooltipNumber(value, digits) {
    if (!Number.isFinite(value)) return "--";
    const fixed = Number(value).toFixed(digits);
    return fixed.replace(/\.?0+$/, "");
  }

  function buildTooltipFormatter(cfg) {
    const precisionControl = parseInt($("precision")?.value || "3", 10);
    const valuePrecision = Math.max(2, Math.min(8, Number.isFinite(precisionControl) ? precisionControl : 3));
    const xPrecision = cfg.discrete ? 0 : Math.max(2, Math.min(6, valuePrecision));

    return function tooltipFormatter() {
      const xText = formatTooltipNumber(this.x, xPrecision);
      const points = this.points || (this.point ? [this.point] : []);
      let html = `<span style="font-size:11px; color:#dbe9ff;">x = ${xText}</span>`;
      points.forEach((pt) => {
        if (!Number.isFinite(pt.y)) return;
        html += `<br/><span style="color:${pt.color};">\u25CF</span> ${pt.series.name}: <b>${formatTooltipNumber(pt.y, valuePrecision)}</b>`;
      });
      return html;
    };
  }

  function buildPlotLines(markerValues) {
    const values = Array.isArray(markerValues) ? markerValues.filter((v) => Number.isFinite(v)) : [];
    return values.map((v, idx) => ({
      value: v,
      color: "rgba(255, 120, 120, 0.95)",
      width: 2,
      dashStyle: "Dash",
      zIndex: 5,
      label: {
        text: values.length === 1 ? `x = ${formatMarkerValue(v)}` : idx === 0 ? `a = ${formatMarkerValue(v)}` : `b = ${formatMarkerValue(v)}`,
        align: "left",
        x: 6,
        y: 12,
        style: {
          color: "#ffe3e3",
          fontWeight: "800",
          fontSize: "11px",
          textOutline: "none",
        },
      },
    }));
  }

  function renderCharts(cfg, params, shadeRange, markerValues) {
    if (typeof window.Highcharts === "undefined") return;
    const docTheme = document.documentElement.getAttribute("data-theme");
    let isLightTheme = docTheme === "light";
    if (!docTheme) {
      const panel = document.querySelector(".visualization-panel");
      const bg = panel ? window.getComputedStyle(panel).backgroundColor : "";
      const m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) {
        const r = Number(m[1]);
        const g = Number(m[2]);
        const b = Number(m[3]);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        isLightTheme = luminance > 0.6;
      }
    }
    const chartPalette = isLightTheme
      ? {
          chartBg: "#eef2f6",
          axisLine: "rgba(20,65,110,0.35)",
          axisText: "#1f4d7b",
          grid: "rgba(20,65,110,0.18)",
          legendText: "#234f7d",
          tooltipBg: "rgba(241,248,255,0.96)",
          tooltipText: "#173f6c",
        }
      : {
          chartBg: "transparent",
          axisLine: "rgba(255,255,255,0.25)",
          axisText: "#d2e3ff",
          grid: "rgba(255,255,255,0.08)",
          legendText: "#d2e3ff",
          tooltipBg: "rgba(8,18,34,0.94)",
          tooltipText: "#f0f6ff",
        };
    const rangeValue = $("chartRange")?.value || cfg.defaults.range;
    const domain = cfg.chartDomain(params, rangeValue);
    const series = buildSeries(cfg, params, domain);
    const shadedPdf = buildShadedPdfSeries(series.pdf, {
      min: Math.max(domain.min, shadeRange?.min ?? domain.min),
      max: Math.min(domain.max, shadeRange?.max ?? domain.max),
    });

    const base = {
      chart: { backgroundColor: chartPalette.chartBg, spacingBottom: 22, marginBottom: 82, height: 350 },
      title: { text: null },
      credits: { enabled: false },
      exporting: { enabled: false },
      xAxis: {
        lineColor: chartPalette.axisLine,
        tickColor: chartPalette.axisLine,
        labels: { style: { color: chartPalette.axisText } },
        plotLines: buildPlotLines(markerValues),
        title: { text: cfg.discrete ? "k (Discrete Outcomes)" : "x", style: { color: chartPalette.axisText } },
      },
      yAxis: {
        title: { text: "Probability", style: { color: chartPalette.axisText } },
        lineColor: chartPalette.axisLine,
        tickColor: chartPalette.axisLine,
        gridLineColor: chartPalette.grid,
        labels: { style: { color: chartPalette.axisText } },
      },
      legend: {
        enabled: true,
        floating: false,
        align: "center",
        verticalAlign: "bottom",
        y: 26,
        itemDistance: 16,
        symbolWidth: 14,
        itemStyle: { color: chartPalette.legendText, fontSize: "10px" },
        itemHiddenStyle: { color: isLightTheme ? "#7695b5" : "#7f93b0" },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: buildTooltipFormatter(cfg),
        backgroundColor: chartPalette.tooltipBg,
        style: { color: chartPalette.tooltipText },
      },
    };

    if (pdfChart) pdfChart.destroy();
    if (cdfChart) cdfChart.destroy();
    if (combinedChart) combinedChart.destroy();

    if (cfg.discrete) {
      const lollipopStems = [];
      const shadedStems = [];
      const lollipopPoints = [];
      const shadedPoints = [];
      const shadeMin = Number.isFinite(shadeRange?.min) ? shadeRange.min : Number.NEGATIVE_INFINITY;
      const shadeMax = Number.isFinite(shadeRange?.max) ? shadeRange.max : Number.POSITIVE_INFINITY;

      series.pdf.forEach(([x, y]) => {
        lollipopStems.push([x, 0], [x, y], [null, null]);
        lollipopPoints.push([x, y]);
        if (x >= shadeMin && x <= shadeMax) {
          shadedStems.push([x, 0], [x, y], [null, null]);
          shadedPoints.push([x, y]);
        }
      });

      pdfChart = window.Highcharts.chart("pdfChart", {
        ...base,
        series: [
          {
            name: "Selected Stems",
            type: "line",
            data: shadedStems,
            color: "rgba(255, 165, 120, 0.9)",
            lineWidth: 3,
            marker: { enabled: false },
            enableMouseTracking: false,
          },
          {
            name: "PMF Stems",
            type: "line",
            data: lollipopStems,
            color: "rgba(160, 200, 255, 0.55)",
            lineWidth: 2,
            marker: { enabled: false },
            enableMouseTracking: false,
          },
          {
            name: "Selected Points",
            type: "scatter",
            data: shadedPoints,
            color: "#ffa578",
            marker: { radius: 5, symbol: "circle", lineColor: "#ffd7c2", lineWidth: 1 },
          },
          {
            name: "PMF (Lollipop)",
            type: "scatter",
            data: lollipopPoints,
            color: "#7cc5ff",
            marker: { radius: 4.5, symbol: "circle", lineColor: "#eaf4ff", lineWidth: 1 },
          },
        ],
      });

      cdfChart = window.Highcharts.chart("cdfChart", {
        ...base,
        series: [{ name: "Cumulative Probability (Step)", type: "line", step: "left", data: series.cdf, color: "#7cc5ff", lineWidth: 2.5 }],
      });

      combinedChart = window.Highcharts.chart("combinedChart", {
        ...base,
        series: [
          {
            name: "Selected Stems",
            type: "line",
            data: shadedStems,
            color: "rgba(255, 165, 120, 0.75)",
            lineWidth: 3,
            marker: { enabled: false },
            enableMouseTracking: false,
          },
          {
            name: "PMF Stems",
            type: "line",
            data: lollipopStems,
            color: "rgba(160, 200, 255, 0.45)",
            lineWidth: 2,
            marker: { enabled: false },
            enableMouseTracking: false,
          },
          { name: "PMF Points", type: "scatter", data: lollipopPoints, color: "#7cc5ff", marker: { radius: 4, lineColor: "#eaf4ff", lineWidth: 1 } },
          { name: "CDF (Step)", type: "line", step: "left", data: series.cdf, color: "#ffa578", lineWidth: 2.2 },
        ],
      });
      return;
    }

    pdfChart = window.Highcharts.chart("pdfChart", {
      ...base,
      series: [
        {
          name: "Shaded Area",
          type: "area",
          data: shadedPdf,
          color: "rgba(255, 165, 120, 0.28)",
          lineWidth: 0,
          marker: { enabled: false },
        },
        { name: "Probability Density", type: "line", data: series.pdf, color: "#ffa578", lineWidth: 2.5 },
      ],
    });
    cdfChart = window.Highcharts.chart("cdfChart", {
      ...base,
      series: [{ name: "Cumulative Probability", type: "line", data: series.cdf, color: "#7cc5ff", lineWidth: 2.5 }],
    });
    combinedChart = window.Highcharts.chart("combinedChart", {
      ...base,
      yAxis: [
        {
          title: { text: "Probability", style: { color: chartPalette.axisText } },
          gridLineColor: chartPalette.grid,
          labels: { style: { color: chartPalette.axisText } },
        },
      ],
      series: [
        {
          name: "Shaded Area",
          type: "area",
          data: shadedPdf,
          color: "rgba(255, 165, 120, 0.24)",
          lineWidth: 0,
          marker: { enabled: false },
        },
        { name: "PDF", type: "line", data: series.pdf, color: "#ffa578", lineWidth: 2.5 },
        { name: "CDF", type: "line", data: series.cdf, color: "#7cc5ff", lineWidth: 2.5 },
      ],
    });
  }

  function calculateAndRender() {
    const key = detectDistribution();
    const cfg = configs[key];
    if (!cfg) return;
    const precision = Math.max(0, Math.min(10, parseInt($("precision")?.value || String(cfg.defaults.precision), 10)));
    const params = getParams(cfg);

    if (!cfg.validate(params)) {
      $("mainResult").textContent = "Invalid input";
      $("equationText").textContent = "Check parameter constraints.";
      $("percentageText").textContent = "";
      return;
    }

    const type = document.querySelector('input[name="calcType"]:checked')?.value || "probability";
    let result = 0;
    let expression = "";
    let explanation = "";
    let percentageText = "";
    let equationText = "";
    let shadeMin = Number.NEGATIVE_INFINITY;
    let shadeMax = Number.POSITIVE_INFINITY;
    let markerValues = [];

    if (typeof cfg.compute === "function") {
      const payload = cfg.compute({
        cfg,
        params,
        type,
        precision,
        getValue: (id, fallback) => {
          const n = parseFloat($(id)?.value);
          return Number.isFinite(n) ? n : fallback;
        },
        formatNum,
      });
      if (!payload || !Number.isFinite(payload.result)) {
        $("mainResult").textContent = "Invalid input";
        $("equationText").textContent = "Check parameter constraints.";
        $("percentageText").textContent = "";
        return;
      }
      result = payload.result;
      expression = payload.expression || "";
      explanation = payload.explanation || "";
      percentageText = payload.percentageText || "";
      equationText = payload.equationText || "";
      shadeMin = Number.isFinite(payload.shadeMin) ? payload.shadeMin : shadeMin;
      shadeMax = Number.isFinite(payload.shadeMax) ? payload.shadeMax : shadeMax;
      markerValues = Array.isArray(payload.markerValues) ? payload.markerValues : [];
    } else if (type === "probability") {
      const x = parseFloat($("xValue")?.value || "0");
      result = cfg.cdf(x, params);
      expression = `P(X <= ${formatNum(x, precision)})`;
      explanation = "Probability up to the specified x-value.";
      percentageText = `(${(result * 100).toFixed(1)}%)`;
      equationText = `${expression} = ${formatNum(result, precision)}`;
      shadeMax = x;
      markerValues = [x];
    } else if (type === "between") {
      const a = parseFloat($("lowerBound")?.value || "0");
      const b = parseFloat($("upperBound")?.value || "0");
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      result = Math.max(0, cfg.cdf(hi, params) - cfg.cdf(lo, params));
      expression = `P(${formatNum(lo, precision)} <= X <= ${formatNum(hi, precision)})`;
      explanation = "Probability between lower and upper bounds.";
      percentageText = `(${(result * 100).toFixed(1)}%)`;
      equationText = `${expression} = ${formatNum(result, precision)}`;
      shadeMin = lo;
      shadeMax = hi;
      markerValues = [lo, hi];
    } else {
      const p = Math.max(0, Math.min(1, parseFloat($("probability")?.value || "0.5")));
      result = cfg.inv(p, params);
      expression = `Quantile for p = ${formatNum(p, precision)}`;
      explanation = "Returned x-value at cumulative probability p.";
      percentageText = `(${(p * 100).toFixed(1)}%)`;
      equationText = `X = ${formatNum(result, precision)}`;
      shadeMax = result;
      markerValues = [result];
    }

    $("mainResult").textContent = formatNum(result, precision);
    $("heroExpression").textContent = expression;
    $("explanationLine").textContent = explanation;
    const equationEl = $("equationText");
    const percentageEl = $("percentageText");
    if (equationEl) {
      equationEl.textContent = equationText;
      equationEl.style.display = "none";
    }
    if (percentageEl) {
      percentageEl.textContent = percentageText;
      percentageEl.style.display = percentageText ? "inline" : "none";
    }
    updateStats(cfg, params, precision);
    renderCharts(cfg, params, { min: shadeMin, max: shadeMax }, markerValues);

    // Feed current calculator state to the AI insights component.
    // The runtime loads before ai-insights-component.js, so we store the latest
    // state on a queue and flush it as soon as the component is ready.
    const aiState = {
      distributionName: cfg.title || key,
      calcType: type,
      result: result,
      expression: expression,
      explanation: explanation,
      params: Object.assign({}, params),
      xValue: parseFloat($('xValue')?.value),
      lowerBound: parseFloat($('lowerBound')?.value),
      upperBound: parseFloat($('upperBound')?.value),
      probability: parseFloat($('probability')?.value),
      mean:   Number.isFinite(params.mean)   ? params.mean   :
              Number.isFinite(params.mu)     ? params.mu     : undefined,
      stddev: Number.isFinite(params.stddev) ? params.stddev :
              Number.isFinite(params.sigma)  ? params.sigma  : undefined,
    };
    // Store for deferred flush
    window.__statAIStateQueue = aiState;
    if (window.StatisticoAIInsights && typeof window.StatisticoAIInsights.update === 'function') {
      window.StatisticoAIInsights.update('aiInsightsMount', aiState);
    }
  }

  function initTabs() {
    const tabs = Array.from(document.querySelectorAll(".tab[data-tab]"));
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        currentTab = tab.dataset.tab;
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        ["pdf", "cdf", "both"].forEach((k) => {
          const pane = $(k + "Tab");
          if (pane) pane.classList.toggle("active", k === currentTab);
        });
      });
    });
  }

  function initAboutModal() {
    const modal = $("aboutModal");
    const openBtn = $("aboutBtn");
    const closeBtn = $("closeAboutBtn") || modal?.querySelector(".close-modal");
    if (!modal || !openBtn) return;
    openBtn.addEventListener("click", () => {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
      });
    }
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
      }
    });
  }

  function initReset(cfg) {
    const btn = $("resetBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      cfg.params.forEach((p) => {
        if ($(p.id)) $(p.id).value = String(p.defaultValue);
      });
      const range = $("chartRange");
      if (range) range.value = cfg.defaults.range;
      const precision = $("precision");
      if (precision) precision.value = String(cfg.defaults.precision);
      const probRadio = document.querySelector('input[name="calcType"][value="probability"]');
      if (probRadio) probRadio.checked = true;
      populateContextInput(cfg);
      setRadioSelection();
      calculateAndRender();
    });
  }

  function initDistributionTemplate() {
    const key = detectDistribution();
    const cfg = configs[key];
    if (!cfg) return;

    document.title = cfg.title;
    const h1 = document.querySelector(".header h1");
    if (h1) h1.innerHTML = `<i class="fas fa-chart-line"></i> ${cfg.title}`;

    const aboutBtn = $("aboutBtn");
    if (aboutBtn) aboutBtn.innerHTML = `<i class="fas fa-info-circle"></i> ${cfg.about}`;

    const inputsHost = document.querySelector(".control-block-inputs");
    if (inputsHost) {
      const inputGroupsHtml = cfg.params
        .map(
          (p) => `<div class="input-group">
            <label>
              ${p.label}
              <small style="color: #bbb; font-weight: normal; display: block; margin-top: 2px;">${p.sub}</small>
            </label>
            <div class="input-row">
              <input class="input-field" id="${p.id}" type="number" step="0.1" value="${p.defaultValue}"/>
            </div>
          </div>`
        )
        .join("");
      inputsHost.innerHTML = `<div class="mean-std-row" style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px;">${inputGroupsHtml}</div>`;
    }

    cfg.params.forEach((p) => {
      const input = $(p.id);
      if (!input) return;
      input.value = String(p.defaultValue);
      input.addEventListener("input", calculateAndRender);
    });

    const range = $("chartRange");
    if (range) {
      range.innerHTML = cfg.rangeOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
      range.value = cfg.defaults.range;
      range.addEventListener("change", calculateAndRender);
    }

    const precision = $("precision");
    if (precision) {
      precision.value = String(cfg.defaults.precision);
      precision.addEventListener("change", calculateAndRender);
    }

    initCalcModes(cfg);
    initBackToHubButton();
    initWebsiteLink();
    initThemeToggle();

    document.querySelectorAll('input[name="calcType"]').forEach((r) => {
      r.addEventListener("change", () => {
        populateContextInput(cfg);
        setRadioSelection();
        calculateAndRender();
      });
    });

    initTabs();
    enhanceAboutModalContent(cfg);
    initAboutModal();
    initReset(cfg);
    populateContextInput(cfg);
    setRadioSelection();
    calculateAndRender();
  }

  window.statisticoDistributionTemplate = {
    detectDistribution,
    getConfig: (key) => {
      const resolvedKey = (key || detectDistribution() || "").toLowerCase();
      return configs[resolvedKey] || null;
    },
    getParams: () => {
      const key = detectDistribution();
      const cfg = configs[key];
      if (!cfg) return null;
      return getParams(cfg);
    },
  };

  // Compatibility for legacy modal markup that still uses inline handlers.
  window.openAboutModal = function openAboutModalCompat() {
    const modal = $("aboutModal");
    if (!modal) return;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeAboutModal = function closeAboutModalCompat() {
    const modal = $("aboutModal");
    if (!modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  };

  document.addEventListener("DOMContentLoaded", initDistributionTemplate);
})();
