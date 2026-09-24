(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.QueueSim = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function unit(random) {
    var u = random();
    if (u <= 0) return 1e-12;
    if (u >= 1) return 1 - 1e-12;
    return u;
  }

  function exponential(mean, random) {
    return -mean * Math.log(1 - unit(random));
  }

  function serviceTime(mean, distribution, random) {
    var u;
    if (distribution === "uniform") {
      u = unit(random);
      return Math.max(1, mean * (0.5 + u));
    }
    if (distribution === "normal") {
      var z = Math.sqrt(-2 * Math.log(unit(random))) * Math.cos(2 * Math.PI * unit(random));
      return Math.max(1, mean + z * (mean / 5));
    }
    if (distribution === "lognormal" || distribution === "gamma") {
      var z2 = Math.sqrt(-2 * Math.log(unit(random))) * Math.cos(2 * Math.PI * unit(random));
      var sigma = Math.sqrt(Math.log(1 + 0.25));
      var mu = Math.log(mean) - sigma * sigma / 2;
      return Math.max(1, Math.exp(mu + sigma * z2));
    }
    return Math.max(1, exponential(mean, random));
  }

  function scheduledAgents(activeAgents, shrinkagePercent) {
    var active = Math.floor(Number(activeAgents));
    var shrink = Number(shrinkagePercent);
    if (!isFinite(active) || active < 1) return { ok: false, error: "Enter at least one active agent." };
    if (!isFinite(shrink) || shrink < 0 || shrink >= 100) {
      return { ok: false, error: "Shrinkage must be at least 0% and below 100%." };
    }
    if (shrink === 0) return { ok: true, activeAgents: active, scheduledAgents: active, additionalAgents: 0 };
    var scheduled = Math.ceil(active / (1 - shrink / 100));
    return { ok: true, activeAgents: active, scheduledAgents: scheduled, additionalAgents: scheduled - active };
  }

  function simulateReplication(spec, random, recordEvents) {
    var agents = Math.max(1, Math.floor(spec.agents));
    var horizon = Math.max(1, spec.simSeconds);
    var meanService = Math.max(1, spec.ahtSeconds);
    var arrivalRate = spec.callsPerHour / 3600;
    var abandonOn = !!spec.abandonmentEnabled;
    var meanPatience = spec.meanPatienceSeconds;
    var target = spec.targetSeconds;
    var distribution = spec.serviceDistribution || "exponential";
    if (!(arrivalRate > 0)) arrivalRate = 1 / 3600;
    var freeAt = [];
    var serviceStart = [];
    var i;
    for (i = 0; i < agents; i++) {
      freeAt.push(0);
      serviceStart.push(0);
    }
    var queue = [];
    var t = 0;
    var nextArrival = exponential(1 / arrivalRate, random);
    var callSerial = 0;
    var offered = 0;
    var answered = 0;
    var abandoned = 0;
    var answeredWithin = 0;
    var waitAnswered = 0;
    var waitAbandoned = 0;
    var maxQueue = 0;
    var queueArea = 0;
    var lastT = 0;
    var busyArea = 0;
    var events = recordEvents ? [] : null;
    var stillWaiting = 0;

    function emit(ev) { if (events) events.push(ev); }

    function nextFreeTime() {
      var best = Infinity;
      var k;
      for (k = 0; k < freeAt.length; k++) if (freeAt[k] < best) best = freeAt[k];
      return best;
    }

    function takeFreeAgent(time) {
      var best = -1;
      var bestT = Infinity;
      var k;
      for (k = 0; k < freeAt.length; k++) {
        if (freeAt[k] <= time + 1e-9 && freeAt[k] < bestT) {
          best = k;
          bestT = freeAt[k];
        }
      }
      return best;
    }

    function startService(call, time) {
      var agent = takeFreeAgent(time);
      if (agent < 0) return false;
      var wait = Math.max(0, time - call.arrival);
      var handle = serviceTime(meanService, distribution, random);
      serviceStart[agent] = time;
      freeAt[agent] = time + handle;
      answered += 1;
      waitAnswered += wait;
      if (wait <= target + 1e-9) answeredWithin += 1;
      emit({ time: time, type: "service_start", callId: call.callId, agentId: agent + 1, waitSeconds: wait });
      emit({ time: time + handle, type: "service_end", callId: call.callId, agentId: agent + 1, waitSeconds: wait });
      call.served = true;
      return true;
    }

    function expirePatience(until) {
      var guard = 0;
      while (queue.length && guard < 100000) {
        guard += 1;
        var soonest = 0;
        var k;
        for (k = 1; k < queue.length; k++) if (queue[k].abandonAt < queue[soonest].abandonAt) soonest = k;
        if (queue[soonest].abandonAt > until + 1e-9) break;
        var call = queue.splice(soonest, 1)[0];
        var when = call.abandonAt;
        queueArea += queue.length * Math.max(0, when - lastT);
        busyArea += busyOverlap(lastT, when);
        lastT = when;
        abandoned += 1;
        waitAbandoned += Math.max(0, when - call.arrival);
        emit({ time: when, type: "abandon", callId: call.callId, waitSeconds: Math.max(0, when - call.arrival) });
      }
    }

    function busyOverlap(from, to) {
      if (to <= from) return 0;
      var total = 0;
      var k;
      for (k = 0; k < freeAt.length; k++) {
        var start = serviceStart[k];
        var end = freeAt[k];
        if (!(end > start)) continue;
        var overlap = Math.min(to, end) - Math.max(from, start);
        if (overlap > 0) total += overlap;
      }
      return total;
    }

    function assignReady(until) {
      var guard = 0;
      while (queue.length && guard < 100000) {
        guard += 1;
        var ready = nextFreeTime();
        if (ready > until + 1e-9) break;
        expirePatience(ready);
        if (!queue.length) break;
        if (nextFreeTime() > until + 1e-9) break;
        var time = Math.max(nextFreeTime(), queue[0].arrival);
        if (time > until + 1e-9) break;
        queueArea += queue.length * Math.max(0, time - lastT);
        busyArea += busyOverlap(lastT, time);
        lastT = time;
        var call = queue.shift();
        if (call.abandonAt <= time + 1e-9) {
          abandoned += 1;
          waitAbandoned += Math.max(0, call.abandonAt - call.arrival);
          emit({ time: call.abandonAt, type: "abandon", callId: call.callId, waitSeconds: Math.max(0, call.abandonAt - call.arrival) });
          continue;
        }
        if (!startService(call, time)) break;
      }
    }

    while (nextArrival <= horizon) {
      assignReady(nextArrival);
      expirePatience(nextArrival);
      queueArea += queue.length * Math.max(0, nextArrival - lastT);
      busyArea += busyOverlap(lastT, nextArrival);
      lastT = nextArrival;
      callSerial += 1;
      offered += 1;
      var call = {
        callId: "c" + callSerial,
        arrival: nextArrival,
        abandonAt: Infinity,
        served: false
      };
      emit({ time: nextArrival, type: "arrival", callId: call.callId });
      if (!startService(call, nextArrival)) {
        if (abandonOn) {
          if (!(meanPatience > 0)) throw new Error("meanPatienceSeconds > 0");
          call.abandonAt = nextArrival + exponential(meanPatience, random);
        }
        emit({ time: nextArrival, type: "queue_enter", callId: call.callId, waitSeconds: 0 });
        queue.push(call);
        if (queue.length > maxQueue) maxQueue = queue.length;
      }
      nextArrival += exponential(1 / arrivalRate, random);
    }
    assignReady(horizon);
    expirePatience(horizon);
    queueArea += queue.length * Math.max(0, horizon - lastT);
    busyArea += busyOverlap(lastT, horizon);
    stillWaiting = queue.length;
    if (events) {
      events.sort(function (a, b) {
        if (a.time !== b.time) return a.time - b.time;
        if (a.type === "arrival" && b.type !== "arrival") return -1;
        if (b.type === "arrival" && a.type !== "arrival") return 1;
        return String(a.callId).localeCompare(String(b.callId));
      });
    }
    return {
      offeredCalls: offered,
      answeredCalls: answered,
      abandonedCalls: abandoned,
      answeredWithinTarget: answeredWithin,
      stillWaiting: stillWaiting,
      waitAnsweredSum: waitAnswered,
      waitAbandonedSum: waitAbandoned,
      maxQueueLength: maxQueue,
      queueArea: queueArea,
      busyArea: busyArea,
      horizon: horizon,
      agents: agents,
      events: events
    };
  }

  function pool(parts) {
    var acc = {
      offeredCalls: 0,
      answeredCalls: 0,
      abandonedCalls: 0,
      answeredWithinTarget: 0,
      stillWaiting: 0,
      waitAnsweredSum: 0,
      waitAbandonedSum: 0,
      maxQueueLength: 0,
      queueArea: 0,
      busyArea: 0,
      horizon: 0,
      agentHorizons: 0
    };
    parts.forEach(function (part) {
      acc.offeredCalls += part.offeredCalls;
      acc.answeredCalls += part.answeredCalls;
      acc.abandonedCalls += part.abandonedCalls;
      acc.answeredWithinTarget += part.answeredWithinTarget;
      acc.stillWaiting += part.stillWaiting;
      acc.waitAnsweredSum += part.waitAnsweredSum;
      acc.waitAbandonedSum += part.waitAbandonedSum;
      if (part.maxQueueLength > acc.maxQueueLength) acc.maxQueueLength = part.maxQueueLength;
      acc.queueArea += part.queueArea;
      acc.busyArea += part.busyArea;
      acc.horizon += part.horizon;
      acc.agentHorizons += part.horizon * part.agents;
    });
    var levels = parts.map(function (part) {
      return part.offeredCalls > 0 ? part.answeredWithinTarget / part.offeredCalls : 0;
    });
    var offered = acc.offeredCalls;
    var levelLow = levels.length ? Math.min.apply(null, levels) : 0;
    var levelHigh = levels.length ? Math.max.apply(null, levels) : 0;
    return {
      offeredCalls: offered,
      answeredCalls: acc.answeredCalls,
      abandonedCalls: acc.abandonedCalls,
      answeredWithinTarget: acc.answeredWithinTarget,
      stillWaiting: acc.stillWaiting,
      abandonmentRate: offered > 0 ? acc.abandonedCalls / offered : 0,
      serviceLevel: offered > 0 ? acc.answeredWithinTarget / offered : 0,
      serviceLevelLow: levelLow,
      serviceLevelHigh: levelHigh,
      averageWaitAnsweredSeconds: acc.answeredCalls > 0 ? acc.waitAnsweredSum / acc.answeredCalls : 0,
      averageWaitBeforeAbandonmentSeconds: acc.abandonedCalls > 0 ? acc.waitAbandonedSum / acc.abandonedCalls : 0,
      maximumQueueLength: acc.maxQueueLength,
      averageQueueLength: acc.horizon > 0 ? acc.queueArea / acc.horizon : 0,
      occupancy: acc.agentHorizons > 0 ? acc.busyArea / acc.agentHorizons : 0,
      samples: parts.map(function (part) {
        var n = part.offeredCalls;
        return {
          serviceLevel: n > 0 ? part.answeredWithinTarget / n : 0,
          abandonmentRate: n > 0 ? part.abandonedCalls / n : 0,
          averageWait: part.answeredCalls > 0 ? part.waitAnsweredSum / part.answeredCalls : 0,
          maximumQueueLength: part.maxQueueLength,
          occupancy: part.horizon * part.agents > 0 ? part.busyArea / (part.horizon * part.agents) : 0
        };
      })
    };
  }

  function run(spec) {
    var reps = Math.max(1, Math.floor(spec.replications || 1));
    var seed = spec.seed == null ? 1 : spec.seed;
    var parts = [];
    var replayEvents = null;
    var r;
    for (r = 0; r < reps; r++) {
      var random = mulberry32((seed + r * 9973) >>> 0);
      var part = simulateReplication(spec, random, false);
      parts.push(part);
    }
    var summary = pool(parts);
    if (spec.recordReplay) {
      var replaySpec = {};
      Object.keys(spec).forEach(function (key) { replaySpec[key] = spec[key]; });
      replaySpec.simSeconds = Math.min(spec.simSeconds, spec.replaySeconds || 1800);
      replayEvents = simulateReplication(replaySpec, mulberry32((seed + 17) >>> 0), true).events;
    }
    summary.events = replayEvents;
    summary.replications = reps;
    return summary;
  }

  function agentsRequiredSamples(spec) {
    var reps = Math.max(1, Math.floor(spec.replications || 1));
    var seed = spec.seed == null ? 1 : spec.seed;
    var traffic = spec.callsPerHour * spec.ahtSeconds / 3600;
    var start = Math.max(1, Math.floor(traffic));
    var limit = Math.min(200, start + 30);
    var counts = [];
    var r;
    var n;
    for (r = 0; r < reps; r++) {
      var found = limit;
      for (n = start; n <= limit; n++) {
        var trial = {};
        Object.keys(spec).forEach(function (key) { trial[key] = spec[key]; });
        trial.agents = n;
        trial.replications = 1;
        var part = simulateReplication(trial, mulberry32((seed + r * 9973) >>> 0), false);
        var sl = part.offeredCalls > 0 ? part.answeredWithinTarget / part.offeredCalls : 0;
        var ab = part.offeredCalls > 0 ? part.abandonedCalls / part.offeredCalls : 0;
        var slOk = sl + 1e-12 >= spec.targetServiceLevel;
        var abOk = !spec.abandonmentEnabled || ab <= spec.maximumAbandonmentRate + 1e-12;
        if (slOk && abOk) { found = n; break; }
      }
      counts.push(found);
    }
    return counts;
  }

  function meetsTargets(summary, spec) {
    var slOk = summary.serviceLevel + 1e-12 >= spec.targetServiceLevel;
    var abOk = !spec.abandonmentEnabled || summary.abandonmentRate <= spec.maximumAbandonmentRate + 1e-12;
    return slOk && abOk;
  }

  function findActiveAgents(spec) {
    var traffic = spec.callsPerHour * spec.ahtSeconds / 3600;
    var start = Math.max(1, Math.floor(traffic));
    var limit = Math.min(200, start + 40);
    var n;
    var last = null;
    for (n = start; n <= limit; n++) {
      var trial = {};
      Object.keys(spec).forEach(function (key) { trial[key] = spec[key]; });
      trial.agents = n;
      trial.recordReplay = false;
      last = run(trial);
      last.activeAgents = n;
      if (meetsTargets(last, spec)) {
        last.targetsMet = true;
        return last;
      }
    }
    last.targetsMet = false;
    return last;
  }

  return {
    exponential: exponential,
    scheduledAgents: scheduledAgents,
    simulateReplication: simulateReplication,
    run: run,
    findActiveAgents: findActiveAgents,
    agentsRequiredSamples: agentsRequiredSamples,
    meetsTargets: meetsTargets,
    mulberry32: mulberry32
  };
});
