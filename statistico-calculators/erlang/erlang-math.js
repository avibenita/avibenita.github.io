/**
 * Erlang C staffing for a steady call arrival rate and exponential handle time.
 * Probability of waiting uses the Erlang B recurrence so large agent counts stay finite.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ErlangMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function erlangB(traffic, agents) {
    var n = Math.floor(agents);
    if (n <= 0) return 1;
    var b = 1;
    var k;
    for (k = 1; k <= n; k++) {
      b = (traffic * b) / (k + traffic * b);
    }
    return b;
  }

  function erlangC(traffic, agents) {
    var n = Math.floor(agents);
    if (!(n > traffic)) return 1;
    var b = erlangB(traffic, n);
    var denom = n - traffic * (1 - b);
    if (!(denom > 0)) return 1;
    return (n * b) / denom;
  }

  function serviceLevel(traffic, agents, ahtSeconds, waitSeconds) {
    var n = Math.floor(agents);
    if (!(n > traffic) || !(ahtSeconds > 0)) return 0;
    var mu = 3600 / ahtSeconds;
    var waitProb = erlangC(traffic, n);
    return 1 - waitProb * Math.exp(-(n - traffic) * mu * waitSeconds / 3600);
  }

  function averageWaitSeconds(traffic, agents, ahtSeconds) {
    var n = Math.floor(agents);
    if (!(n > traffic)) return Infinity;
    return (erlangC(traffic, n) * ahtSeconds) / (n - traffic);
  }

  function hiredAgents(baseAgents, shrinkagePercent) {
    var shrink = Number(shrinkagePercent) || 0;
    if (shrink <= 0) return baseAgents;
    if (shrink >= 100) return Infinity;
    return Math.ceil(baseAgents / (1 - shrink / 100));
  }

  function metricsAt(traffic, agents, ahtSeconds, waitSeconds) {
    var n = Math.floor(agents);
    return {
      agents: n,
      serviceLevel: serviceLevel(traffic, n, ahtSeconds, waitSeconds),
      occupancy: n > 0 ? traffic / n : Infinity,
      avgWaitSeconds: averageWaitSeconds(traffic, n, ahtSeconds),
      averageQueueLength: n > traffic ? (traffic * erlangC(traffic, n)) / (n - traffic) : Infinity,
      probabilityOfWait: erlangC(traffic, n)
    };
  }

  function findAgents(traffic, ahtSeconds, waitSeconds, targetLevel) {
    var start = Math.floor(traffic) + 1;
    var limit = start + 80;
    var n;
    for (n = start; n <= limit; n++) {
      var level = serviceLevel(traffic, n, ahtSeconds, waitSeconds);
      if (level + 1e-12 >= targetLevel) return n;
    }
    return null;
  }

  function analyze(input) {
    var calls = Number(input.callsPerHour);
    var aht = Number(input.ahtSeconds);
    var wait = Number(input.maxWaitSeconds);
    var targetPct = Number(input.targetServiceLevel);
    var fixedAgents = Math.floor(Number(input.agents));
    var shrinkage = input.shrinkageEnabled ? Number(input.shrinkagePercent) : 0;
    if (![calls, aht, wait].every(isFinite) || calls <= 0 || aht <= 0 || wait < 0) {
      return { ok: false, error: "Enter a positive call rate, handle time, and wait threshold." };
    }
    var traffic = (calls * aht) / 3600;
    var find = input.direction !== "fixedAgents";
    var base;
    if (find) {
      if (!isFinite(targetPct) || targetPct <= 0 || targetPct >= 100) {
        return { ok: false, error: "Enter a service-level target between 1 and 99 percent." };
      }
      base = findAgents(traffic, aht, wait, targetPct / 100);
      if (!base) {
        return { ok: false, error: "No staffing level within range meets that service level. Raise the wait threshold or lower the target." };
      }
    } else {
      if (!isFinite(fixedAgents) || fixedAgents < 1) {
        return { ok: false, error: "Enter at least one agent." };
      }
      if (!(fixedAgents > traffic)) {
        return { ok: false, error: "Agents must exceed the offered traffic of " + traffic.toFixed(1) + " Erlangs, or the queue does not settle." };
      }
      base = fixedAgents;
    }
    var point = metricsAt(traffic, base, aht, wait);
    return {
      ok: true,
      traffic: traffic,
      baseAgents: base,
      totalAgents: hiredAgents(base, shrinkage),
      serviceLevel: point.serviceLevel,
      occupancy: point.occupancy,
      avgWaitSeconds: point.avgWaitSeconds,
      averageQueueLength: point.averageQueueLength,
      probabilityOfWait: point.probabilityOfWait,
      targetMet: find ? point.serviceLevel + 1e-12 >= targetPct / 100 : true
    };
  }

  function serviceCurve(traffic, ahtSeconds, waitSeconds, aroundAgents) {
    var start = Math.max(Math.floor(traffic) + 1, 1);
    var end = Math.max(aroundAgents + 6, start + 8);
    var rows = [];
    var n;
    for (n = start; n <= end; n++) {
      rows.push({
        agents: n,
        serviceLevel: serviceLevel(traffic, n, ahtSeconds, waitSeconds)
      });
    }
    return rows;
  }

  return {
    erlangB: erlangB,
    erlangC: erlangC,
    serviceLevel: serviceLevel,
    averageWaitSeconds: averageWaitSeconds,
    analyze: analyze,
    serviceCurve: serviceCurve
  };
});
