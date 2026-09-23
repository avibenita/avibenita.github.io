/**
 * Process capability indices for a normal process.
 * Cp, Cpk, Cpu, Cpl, and Cpm. Defect rate is the two-tail probability
 * outside the specification limits, reported as parts per million.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CpkMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function erf(x) {
    var a1 = 0.254829592;
    var a2 = -0.284496736;
    var a3 = 1.421413741;
    var a4 = -1.453152027;
    var a5 = 1.061405429;
    var p = 0.3275911;
    var sign = x >= 0 ? 1 : -1;
    var ax = Math.abs(x);
    var t = 1 / (1 + p * ax);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  function normalCDF(x, mean, sd) {
    return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
  }

  function normalPDF(x, mean, sd) {
    var z = (x - mean) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  }

  function rating(cpk) {
    if (cpk >= 2) return { text: "Excellent", className: "rating-excellent" };
    if (cpk >= 1.67) return { text: "Good", className: "rating-good" };
    if (cpk >= 1.33) return { text: "Adequate", className: "rating-adequate" };
    if (cpk >= 1) return { text: "Poor", className: "rating-poor" };
    return { text: "Inadequate", className: "rating-inadequate" };
  }

  function analyze(input) {
    var lsl = Number(input.lsl);
    var usl = Number(input.usl);
    var mean = Number(input.mean);
    var sd = Number(input.sd);
    var targetRaw = input.target;
    var hasTarget = targetRaw !== "" && targetRaw != null && isFinite(Number(targetRaw));
    var target = hasTarget ? Number(targetRaw) : (lsl + usl) / 2;

    if (![lsl, usl, mean, sd].every(isFinite)) {
      return { ok: false, error: "Enter numeric values for both specification limits, the process mean, and the standard deviation." };
    }
    if (sd <= 0) {
      return { ok: false, error: "Standard deviation must be greater than 0." };
    }
    if (!(usl > lsl)) {
      return { ok: false, error: "The upper specification limit must be greater than the lower specification limit." };
    }

    var cp = (usl - lsl) / (6 * sd);
    var cpu = (usl - mean) / (3 * sd);
    var cpl = (mean - lsl) / (3 * sd);
    var cpk = Math.min(cpu, cpl);
    var shift = mean - target;
    var cpm = (usl - lsl) / (6 * Math.sqrt(sd * sd + shift * shift));
    var pLo = normalCDF(lsl, mean, sd);
    var pHi = 1 - normalCDF(usl, mean, sd);
    var ppm = (pLo + pHi) * 1000000;
    var yieldPct = (1 - pLo - pHi) * 100;
    var specMid = (lsl + usl) / 2;
    var centerRef = hasTarget ? target : specMid;
    var centeringRatio = (Math.abs(mean - centerRef) / ((usl - lsl) / 2)) * 100;

    return {
      ok: true,
      lsl: lsl,
      usl: usl,
      mean: mean,
      sd: sd,
      target: target,
      hasTarget: hasTarget,
      cp: cp,
      cpu: cpu,
      cpl: cpl,
      cpk: cpk,
      cpm: cpm,
      ppm: ppm,
      yieldPct: yieldPct,
      centeringRatio: centeringRatio,
      rating: rating(cpk)
    };
  }

  return {
    erf: erf,
    normalCDF: normalCDF,
    normalPDF: normalPDF,
    rating: rating,
    analyze: analyze
  };
});
