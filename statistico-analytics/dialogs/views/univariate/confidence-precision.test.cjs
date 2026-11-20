const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const code = fs.readFileSync(path.join(__dirname, 'confidence-precision.js'), 'utf8');
const sandbox = { Math: Math, console: console };
sandbox.globalThis = sandbox;
sandbox.module = { exports: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const P = sandbox.ConfidencePrecision;

const mean = 20;
const s = 10;
const n0 = 100;
const c = 0.95;

function close(actual, expected, label) {
  const err = Math.abs(actual - expected);
  assert.ok(err <= 1e-6, label + ' got ' + actual + ' expected ' + expected + ' err ' + err);
}

const e100 = P.marginOfError(100, c, s, null);
close(e100, 1.9842169515864174, 'E(100)');

const e400 = P.marginOfError(400, c, s, null);
close(e400, 0.982963647960441, 'E(400)');
close(mean - e400, 19.01703635203956, 'LCL 400');
close(mean + e400, 20.98296364796044, 'UCL 400');

const need = P.requiredSampleSize(n0, c, s, null, 1);
assert.strictEqual(need.status, 'solved');
assert.strictEqual(need.n, 387);
assert.strictEqual(need.n - n0, 287);
assert.ok(P.marginOfError(387, c, s, null) <= 1);
assert.ok(P.marginOfError(386, c, s, null) > 1);

const eFinite = P.marginOfError(100, c, s, 200);
close(eFinite, 1.4030532618120553, 'E finite N=200');
close(P.marginOfError(200, c, s, 200), 0, 'census');
assert.strictEqual(P.parseScenarioN('201', 2, 200).ok, false);

const finiteTarget = P.requiredSampleSize(100, c, s, 200, 1);
assert.strictEqual(finiteTarget.status, 'solved');
const fn = finiteTarget.n;
assert.ok(fn >= 100 && fn <= 200);
assert.ok(P.marginOfError(fn, c, s, 200) <= 1);
assert.ok(fn === 100 || P.marginOfError(fn - 1, c, s, 200) > 1);

assert.ok(P.marginOfError(100, 0.99, s, null) > P.marginOfError(100, 0.95, s, null));
assert.ok(P.marginOfError(400, c, s, null) < P.marginOfError(100, c, s, null));

const met = P.requiredSampleSize(100, c, s, null, 5);
assert.strictEqual(met.status, 'met');
assert.strictEqual(met.n, 100);

const tooTight = P.requiredSampleSize(100, c, s, null, 0.001);
assert.strictEqual(tooTight.status, 'unattainable');
assert.strictEqual(tooTight.n, null);
assert.strictEqual(tooTight.maximum, 1000000);

assert.strictEqual(P.parsePopulation('', 100).N, null);
assert.strictEqual(P.parsePopulation('100', 100).ok, true);
assert.strictEqual(P.parsePopulation('99', 100).ok, false);
assert.strictEqual(P.parsePopulation('12.5', 100).ok, false);

const wider = P.widthChange(2, 3);
assert.strictEqual(wider.text, '50% wider');
const narrower = P.widthChange(4, 2);
assert.strictEqual(narrower.text, '50% narrower');
assert.strictEqual(P.widthChange(0, 2).comparable, false);

console.log('confidence-precision acceptance checks passed');
console.log('finite target n=' + fn + ' E=' + P.marginOfError(fn, c, s, 200));
