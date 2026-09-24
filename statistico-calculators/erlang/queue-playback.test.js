var playback = require("./queue-playback.js");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

var log = playback.buildEventLog({
  agents: 4,
  ahtSeconds: 300,
  patienceSeconds: 60,
  simSeconds: 600,
  arrivals: 20,
  completed: 14,
  abandoned: 6,
  blocked: 0,
  retrials: 0
});
assert(log.source === "aggregate", "aggregate source");
assert(log.totals.answered === 14, "answered " + log.totals.answered);
assert(log.totals.abandoned === 6, "abandoned " + log.totals.abandoned);
assert(log.totals.blocked === 0, "no blocked");
assert(log.totals.retried === 0, "no retry");
var again = playback.buildEventLog({
  agents: 4, ahtSeconds: 300, patienceSeconds: 60, simSeconds: 600,
  arrivals: 20, completed: 14, abandoned: 6, blocked: 0, retrials: 0
});
assert(JSON.stringify(again.events) === JSON.stringify(log.events), "restart is identical");

var server = playback.buildEventLog({
  events: [
    { time: 1, type: "arrival", callId: "a" },
    { time: 2, type: "service_end", callId: "a", agentId: 1 }
  ]
});
assert(server.source === "server", "server events win");
assert(server.totals.answered === 1, "server answered");

var zero = playback.buildEventLog({
  agents: 2, ahtSeconds: 60, patienceSeconds: 30, simSeconds: 120,
  arrivals: 5, completed: 5, abandoned: 0, blocked: 0, retrials: 0
});
assert(zero.totals.abandoned === 0, "zero abandon");
assert(zero.totals.answered === 5, "all answered");

console.log("queue-playback ok", log.totals);
