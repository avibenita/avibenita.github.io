const assert = require("assert");
const math = require("./cpk-math.js");

const sample = math.analyze({ lsl: 10, usl: 20, mean: 15.2, sd: 1.5, target: 15 });
assert.strictEqual(sample.ok, true);
assert.ok(Math.abs(sample.cp - (10 / 9)) < 1e-9);
assert.ok(Math.abs(sample.cpu - (4.8 / 4.5)) < 1e-9);
assert.ok(Math.abs(sample.cpl - (5.2 / 4.5)) < 1e-9);
assert.ok(Math.abs(sample.cpk - (4.8 / 4.5)) < 1e-9);
assert.strictEqual(sample.rating.text, "Poor");
assert.ok(sample.ppm > 800 && sample.ppm < 1200, "ppm " + sample.ppm);
assert.ok(sample.yieldPct > 99.8 && sample.yieldPct < 99.95);

const threeSigma = math.analyze({ lsl: 12, usl: 18, mean: 15, sd: 1, target: 15 });
assert.ok(Math.abs(threeSigma.cpk - 1) < 1e-12);
assert.ok(Math.abs(threeSigma.ppm - 2699.8) < 5, "3-sigma ppm " + threeSigma.ppm);
assert.ok(Math.abs(threeSigma.cpm - 1) < 1e-12);

const shifted = math.analyze({ lsl: 12, usl: 18, mean: 16, sd: 1, target: 15 });
assert.ok(shifted.cpk < shifted.cp);
assert.ok(shifted.cpm < shifted.cp);

const bad = math.analyze({ lsl: 20, usl: 10, mean: 15, sd: 1, target: 15 });
assert.strictEqual(bad.ok, false);

const zeroSd = math.analyze({ lsl: 10, usl: 20, mean: 15, sd: 0, target: 15 });
assert.strictEqual(zeroSd.ok, false);

console.log("cpk-math ok", {
  samplePpm: Math.round(sample.ppm),
  threeSigmaPpm: Math.round(threeSigma.ppm)
});
