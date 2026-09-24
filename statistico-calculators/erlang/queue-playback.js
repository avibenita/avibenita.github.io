(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.QueuePlayback = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : null;
  }

  function normalizeServerEvent(raw) {
    if (!raw || raw.time == null || !raw.type) return null;
    return {
      time: Number(raw.time),
      type: raw.type,
      callId: String(raw.callId || raw.call_id || ""),
      agentId: raw.agentId != null ? Number(raw.agentId) : (raw.agent_id != null ? Number(raw.agent_id) : undefined),
      waitSeconds: raw.waitSeconds != null ? Number(raw.waitSeconds) : (raw.wait_seconds != null ? Number(raw.wait_seconds) : undefined)
    };
  }

  function tally(events) {
    var answered = 0;
    var abandoned = 0;
    var blocked = 0;
    var retried = 0;
    var arrivals = 0;
    events.forEach(function (ev) {
      if (ev.type === "arrival") arrivals += 1;
      if (ev.type === "service_end") answered += 1;
      if (ev.type === "abandon") abandoned += 1;
      if (ev.type === "blocked") blocked += 1;
      if (ev.type === "retry") retried += 1;
    });
    return { arrivals: arrivals, answered: answered, abandoned: abandoned, blocked: blocked, retried: retried };
  }

  function buildFromAggregates(spec) {
    var agents = Math.max(1, spec.agents || 1);
    var aht = Math.max(1, spec.ahtSeconds || 1);
    var patience = Math.max(1, spec.patienceSeconds || aht);
    var horizon = Math.max(1, spec.simSeconds || 1);
    var arrivals = Math.max(0, spec.arrivals || 0);
    var abandoned = Math.max(0, spec.abandoned || 0);
    var blocked = Math.max(0, spec.blocked || 0);
    var retrials = Math.max(0, spec.retrials || 0);
    if (abandoned + blocked > arrivals) {
      abandoned = Math.min(abandoned, arrivals);
      blocked = Math.min(blocked, arrivals - abandoned);
    }
    var completed = spec.completed == null ? arrivals - abandoned - blocked : spec.completed;
    completed = Math.max(0, Math.min(completed, arrivals - abandoned - blocked));
    var gap = arrivals > 0 ? horizon / arrivals : horizon;
    var agentFree = [];
    var a;
    for (a = 0; a < agents; a++) agentFree.push(0);
    var queue = [];
    var events = [];
    var needComplete = completed;
    var needAbandon = abandoned;
    var needBlock = blocked;
    var needRetry = retrials;

    function emit(ev) { events.push(ev); }

    function freeAgent(t) {
      var best = -1;
      var bestT = Infinity;
      var i;
      for (i = 0; i < agentFree.length; i++) {
        if (agentFree[i] <= t + 1e-6 && agentFree[i] < bestT) {
          best = i;
          bestT = agentFree[i];
        }
      }
      return best;
    }

    function startService(call, t) {
      var agent = freeAgent(t);
      if (agent < 0 || needComplete <= 0) return false;
      var wait = Math.max(0, t - call.arrival);
      emit({ time: t, type: "service_start", callId: call.callId, agentId: agent + 1, waitSeconds: wait });
      emit({ time: t + aht, type: "service_end", callId: call.callId, agentId: agent + 1, waitSeconds: wait });
      if (needRetry > 0) {
        emit({ time: t + aht, type: "retry", callId: call.callId, agentId: agent + 1, waitSeconds: wait });
        needRetry -= 1;
      }
      agentFree[agent] = t + aht;
      needComplete -= 1;
      return true;
    }

    function drain(until) {
      var guard = 0;
      while (queue.length && guard < 100000) {
        guard += 1;
        var nextFree = Infinity;
        var i;
        for (i = 0; i < agentFree.length; i++) nextFree = Math.min(nextFree, agentFree[i]);
        var head = queue[0];
        var abandonAt = head.arrival + patience;
        if (needComplete > 0 && nextFree <= abandonAt && nextFree <= until) {
          queue.shift();
          startService(head, Math.max(nextFree, head.arrival));
          continue;
        }
        if (needAbandon > 0 && abandonAt <= until) {
          queue.shift();
          emit({ time: abandonAt, type: "abandon", callId: head.callId, waitSeconds: patience });
          needAbandon -= 1;
          continue;
        }
        break;
      }
    }

    var n;
    for (n = 0; n < arrivals; n++) {
      var t = n * gap;
      drain(t);
      var call = { callId: "c" + (n + 1), arrival: t };
      emit({ time: t, type: "arrival", callId: call.callId });
      if (needBlock > 0 && freeAgent(t) < 0 && queue.length >= agents) {
        emit({ time: t, type: "blocked", callId: call.callId });
        needBlock -= 1;
        continue;
      }
      if (!startService(call, t)) {
        emit({ time: t, type: "queue_enter", callId: call.callId, waitSeconds: 0 });
        queue.push(call);
      }
    }
    drain(horizon + aht + patience);
    queue.forEach(function (call) {
      if (needAbandon > 0) {
        emit({ time: call.arrival + patience, type: "abandon", callId: call.callId, waitSeconds: patience });
        needAbandon -= 1;
      } else if (needComplete > 0) {
        var tEnd = Math.max(call.arrival, horizon);
        emit({ time: tEnd, type: "service_start", callId: call.callId, agentId: 1, waitSeconds: Math.max(0, tEnd - call.arrival) });
        emit({ time: tEnd + aht, type: "service_end", callId: call.callId, agentId: 1, waitSeconds: Math.max(0, tEnd - call.arrival) });
        needComplete -= 1;
      }
    });
    events.sort(function (a, b) {
      if (a.time !== b.time) return a.time - b.time;
      return String(a.callId).localeCompare(String(b.callId));
    });
    return events;
  }

  function buildEventLog(spec) {
    spec = spec || {};
    var server = spec.events || spec.event_log || spec.eventLog;
    if (Array.isArray(server) && server.length) {
      var normalized = server.map(normalizeServerEvent).filter(Boolean);
      normalized.sort(function (a, b) { return a.time - b.time; });
      return { source: "server", events: normalized, totals: tally(normalized) };
    }
    var events = buildFromAggregates(spec);
    return { source: "aggregate", events: events, totals: tally(events) };
  }

  return { buildEventLog: buildEventLog, tally: tally, num: num };
});
