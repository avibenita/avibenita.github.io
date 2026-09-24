var math = require("./effect-size-math.js");

function close(a, b, tol) {
  if (Math.abs(a - b) > (tol || 1e-6)) throw new Error(a + " !== " + b);
}

function byId(out, id) {
  return out.results.filter(function (row) { return row.id === id; })[0];
}

var j = math.hedgesJ(20);
close(j, 0.961944, 1e-4);

var mean = math.convert("mean", "d", 0.5, {});
var r = byId(mean, "r");
if (r.kind !== "approximation") throw new Error("equal-n r should be an approximation until n is supplied");
close(r.value, 0.5 / Math.sqrt(0.25 + 4), 1e-8);
if (!byId(mean, "g").missing.length) throw new Error("g requires sample sizes");
var or = byId(mean, "or-from-d");
if (or.kind !== "approximation" || !isFinite(or.value)) throw new Error("OR from d does not need a baseline");
close(or.value, Math.exp(0.5 * Math.PI / Math.sqrt(3)), 1e-8);
if (!byId(mean, "absolute").missing.length) throw new Error("absolute effects need baseline risk");

var meanN = math.convert("mean", "d", 0.5, { n1: 40, n2: 40 });
if (byId(meanN, "g").kind !== "exact") throw new Error("g with n is exact");
if (byId(meanN, "meta").se <= 0) throw new Error("meta se");

var anova = math.convert("anova", "partial", 0.06, { design: "oneway" });
close(byId(anova, "f").value, Math.sqrt(0.06 / 0.94), 1e-8);
if (byId(anova, "eta2").kind !== "exact") throw new Error("one-way eta");

var factorial = math.convert("anova", "eta2", 0.06, { design: "factorial" });
if (!byId(factorial, "f").missing.length) throw new Error("factorial eta2 must not become f");

var multi = math.convert("correlation", "r2", 0.25, { model: "multiple" });
if (!byId(multi, "r").missing.length) throw new Error("multiple R2 must not become r");
close(byId(multi, "f2").value, 0.25 / 0.75, 1e-8);

var simple = math.convert("correlation", "r", 0.5, { model: "simple", n: 50 });
close(byId(simple, "z").value, Math.atanh(0.5), 1e-8);
if (byId(simple, "meta").measure !== "Fisher's z") throw new Error("meta measure");

var binary = math.convert("binary", "or", 2, {});
if (byId(binary, "d").kind !== "approximation") throw new Error("OR to d is approximate");
if (!byId(binary, "rr").missing.length) throw new Error("RR needs baseline");

var withBase = math.convert("binary", "or", 2, { baseline: 0.2 });
close(byId(withBase, "rr").value, (1 / 3) / 0.2, 1e-8);
if (byId(withBase, "rr").kind !== "exact") throw new Error("RR given baseline is exact");
if (!byId(withBase, "meta").missing.length) throw new Error("binary meta still needs a variance");

console.log("effect-size-math ok");
