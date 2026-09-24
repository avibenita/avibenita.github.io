const assert = require("assert");
const math = require("./erlang-math.js");

function factorialErlangC(A, N) {
  function fact(n) {
    var r = 1;
    var i;
    for (i = 2; i <= n; i++) r *= i;
    return r;
  }
  if (A >= N) return 1;
  var numer = (Math.pow(A, N) / fact(N)) * (N / (N - A));
  var denom = 0;
  var k;
  for (k = 0; k < N; k++) denom += Math.pow(A, k) / fact(k);
  denom += numer;
  return numer / denom;
}

var traffic = (100 * 300) / 3600;
assert.ok(Math.abs(math.erlangC(traffic, 12) - factorialErlangC(traffic, 12)) < 1e-9);

var sample = math.analyze({
  callsPerHour: 100,
  ahtSeconds: 300,
  maxWaitSeconds: 20,
  direction: "findAgents",
  targetServiceLevel: 80,
  shrinkageEnabled: false
});
assert.strictEqual(sample.ok, true);
assert.ok(sample.baseAgents > traffic);
assert.ok(sample.serviceLevel >= 0.8);
var oneLess = math.serviceLevel(traffic, sample.baseAgents - 1, 300, 20);
assert.ok(oneLess < 0.8);

var shrunk = math.analyze({
  callsPerHour: 100,
  ahtSeconds: 300,
  maxWaitSeconds: 20,
  direction: "findAgents",
  targetServiceLevel: 80,
  shrinkageEnabled: true,
  shrinkagePercent: 30
});
assert.ok(shrunk.totalAgents > shrunk.baseAgents);

var unstable = math.analyze({
  callsPerHour: 100,
  ahtSeconds: 300,
  maxWaitSeconds: 20,
  direction: "fixedAgents",
  agents: 8
});
assert.strictEqual(unstable.ok, false);

var nine = math.analyze({
  callsPerHour: 100,
  ahtSeconds: 300,
  maxWaitSeconds: 20,
  direction: "fixedAgents",
  agents: 9,
  targetServiceLevel: 80
});
assert.strictEqual(nine.ok, true);
assert.ok(Math.abs(nine.averageQueueLength - (100 / 3600) * nine.avgWaitSeconds) < 1e-9);
assert.ok(nine.averageQueueLength > 1);

console.log("erlang-math ok", {
  traffic: Number(traffic.toFixed(3)),
  agents: sample.baseAgents,
  serviceLevel: Number((sample.serviceLevel * 100).toFixed(1))
});
