const assert = require("assert");
const sim = require("./queue-sim.js");

function base(extra) {
  return Object.assign({
    callsPerHour: 60,
    ahtSeconds: 180,
    agents: 4,
    simSeconds: 3600,
    replications: 4,
    seed: 11,
    abandonmentEnabled: true,
    meanPatienceSeconds: 60,
    targetSeconds: 20,
    targetServiceLevel: 0.8,
    maximumAbandonmentRate: 0.05,
    serviceDistribution: "exponential"
  }, extra);
}

var off = sim.run(base({ abandonmentEnabled: false, agents: 3 }));
assert.strictEqual(off.abandonedCalls, 0);
assert.strictEqual(off.abandonmentRate, 0);
assert.strictEqual(off.offeredCalls, off.answeredCalls + off.stillWaiting);

var longPatience = sim.run(base({ meanPatienceSeconds: 100000, agents: 4 }));
var offSame = sim.run(base({ abandonmentEnabled: false, agents: 4 }));
assert.ok(longPatience.abandonmentRate < 0.03, "long patience abandon " + longPatience.abandonmentRate);
assert.ok(Math.abs(longPatience.serviceLevel - offSame.serviceLevel) < 0.08, "long patience near no-abandon");

var shortPatience = sim.run(base({ meanPatienceSeconds: 5, agents: 3 }));
var mild = sim.run(base({ meanPatienceSeconds: 120, agents: 3 }));
assert.ok(shortPatience.abandonmentRate > mild.abandonmentRate, "short patience abandons more");
assert.ok(shortPatience.averageQueueLength <= mild.averageQueueLength + 0.5, "short patience does not lengthen the queue");

var many = sim.run(base({ agents: 12, meanPatienceSeconds: 60 }));
assert.ok(many.abandonmentRate < 0.02, "enough agents " + many.abandonmentRate);

var traced = sim.simulateReplication(base({ simSeconds: 1800, agents: 3, abandonmentEnabled: true, meanPatienceSeconds: 30 }), sim.mulberry32(4), true);
var byCall = {};
traced.events.forEach(function (ev) {
  byCall[ev.callId] = byCall[ev.callId] || [];
  byCall[ev.callId].push(ev);
});
Object.keys(byCall).forEach(function (id) {
  var started = byCall[id].some(function (ev) { return ev.type === "service_start"; });
  var abandoned = byCall[id].some(function (ev) { return ev.type === "abandon"; });
  assert.ok(!(started && abandoned), id + " both served and abandoned");
});

var shrinkOff = sim.scheduledAgents(12, 0);
assert.strictEqual(shrinkOff.scheduledAgents, 12);
var shrink25 = sim.scheduledAgents(12, 25);
assert.strictEqual(shrink25.scheduledAgents, 16);
assert.strictEqual(shrink25.additionalAgents, 4);
var shrink30 = sim.scheduledAgents(10, 30);
assert.strictEqual(shrink30.scheduledAgents, 15);
assert.strictEqual(sim.scheduledAgents(12, -1).ok, false);
assert.strictEqual(sim.scheduledAgents(12, 100).ok, false);
assert.strictEqual(sim.scheduledAgents(12, 120).ok, false);

var found = sim.findActiveAgents(base({
  replications: 3,
  simSeconds: 2400,
  seed: 21,
  abandonmentEnabled: true,
  meanPatienceSeconds: 20,
  maximumAbandonmentRate: 0.05,
  targetServiceLevel: 0.8
}));
assert.strictEqual(found.targetsMet, true);
assert.ok(found.abandonmentRate <= 0.05 + 1e-9, "search abandon " + found.abandonmentRate);
assert.ok(found.serviceLevel + 1e-9 >= 0.8, "search sl " + found.serviceLevel);
var tooFew = sim.run(base({
  agents: Math.max(1, found.activeAgents - 1),
  replications: 3,
  simSeconds: 2400,
  seed: 21,
  meanPatienceSeconds: 20
}));
if (found.activeAgents > 1) {
  assert.ok(!sim.meetsTargets(tooFew, base({
    maximumAbandonmentRate: 0.05,
    targetServiceLevel: 0.8,
    abandonmentEnabled: true
  })) || tooFew.serviceLevel + 1e-9 < 0.8 || tooFew.abandonmentRate > 0.05);
}

var staff = sim.scheduledAgents(found.activeAgents, 25);
assert.ok(staff.scheduledAgents >= found.activeAgents);
assert.strictEqual(staff.scheduledAgents, Math.ceil(found.activeAgents / 0.75));

var one = sim.run(base({ replications: 1, seed: 3 }));
var two = sim.run(base({ replications: 2, seed: 3 }));
assert.ok(two.offeredCalls >= one.offeredCalls);
assert.ok(Math.abs(two.abandonmentRate - (two.abandonedCalls / two.offeredCalls)) < 1e-12);

console.log("queue-sim ok", {
  off: off.abandonmentRate,
  short: Number(shortPatience.abandonmentRate.toFixed(3)),
  found: found.activeAgents,
  scheduled: staff.scheduledAgents
});
