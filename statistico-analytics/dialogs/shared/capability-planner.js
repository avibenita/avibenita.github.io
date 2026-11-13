/**
 * Capability goal seeking.
 * Comparisons use an absolute tolerance of 1e-9 on the capability index
 * and 1e-12 on the normal-model nonconforming fraction. A solved boundary
 * is marked approximate because display rounding can move it off the goal.
 * Candidate metrics are evaluated with CpkMath, the same implementation
 * the results view uses. The standard deviation is never increased above
 * the baseline: process improvement keeps it or reduces it.
 */
(function (root, factory) {
  var math = root && root.CpkMath;
  if (!math && typeof require === 'function') math = require('./cpk-math.js');
  var api = factory(math);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StatisticoCapabilityPlanner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CpkMath) {
  'use strict';

  var INDEX_TOL = 1e-9;
  var FRACTION_TOL = 1e-12;

  function labels(sdBasis) {
    if (sdBasis === 'within') {
      return {
        index: 'Cpk',
        spread: 'Cp',
        basis: 'Within-process standard deviation'
      };
    }
    return {
      index: 'Ppk',
      spread: 'Pp',
      basis: 'Overall sample standard deviation (n − 1)'
    };
  }

  function fail(message) {
    return { ok: false, error: message };
  }

  function num(value) {
    return typeof value === 'number' ? value : Number(value);
  }

  function optionalBound(value) {
    if (value == null || value === '') return null;
    var n = num(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function metricsOf(lsl, usl, mean, sd, nominal) {
    var result = CpkMath.analyze({
      lsl: lsl,
      usl: usl,
      mean: mean,
      sd: sd,
      target: nominal == null || nominal === '' ? '' : nominal
    });
    if (!result.ok) return null;
    return {
      index: result.cpk,
      spread: result.cp,
      ppm: result.ppm,
      yieldPct: result.yieldPct,
      fraction: result.ppm / 1000000
    };
  }

  function fractionOf(lsl, usl, mean, sd) {
    var lo = CpkMath.normalCDF(lsl, mean, sd);
    var hi = 1 - CpkMath.normalCDF(usl, mean, sd);
    if (lo < 0) lo = 0;
    if (hi < 0) hi = 0;
    return lo + hi;
  }

  function indexOf(mean, sd, lsl, usl) {
    return Math.min(mean - lsl, usl - mean) / (3 * sd);
  }

  function roomAt(mean, lsl, usl) {
    return Math.min(mean - lsl, usl - mean);
  }

  function clamp(value, lo, hi) {
    if (value < lo) return lo;
    if (value > hi) return hi;
    return value;
  }

  function nearly(a, b) {
    return Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));
  }

  function validate(req) {
    var base = req && req.baseline;
    if (!base) return 'The planner needs an analyzed measurement.';
    if (!Number.isFinite(base.lsl) || !Number.isFinite(base.usl)) {
      return 'Enter both specification limits before looking for settings.';
    }
    if (!(base.usl > base.lsl)) {
      return 'The upper specification limit has to be greater than the lower limit.';
    }
    if (!Number.isFinite(base.mean)) return 'The analyzed mean is not available.';
    if (!(base.sd > 0)) return 'The standard deviation has to be greater than 0.';
    var metric = req.metric;
    var goal = num(req.goal);
    if (!Number.isFinite(goal)) return 'Enter a numeric goal.';
    if (metric === 'index' && !(goal > 0)) return 'The capability goal has to be a positive number.';
    if (metric === 'yield' && !(goal > 0 && goal < 100)) return 'Modeled yield has to be greater than 0% and less than 100%.';
    if (metric === 'ppm' && !(goal > 0 && goal < 1000000)) return 'Expected PPM has to be greater than 0 and less than 1,000,000.';
    if (metric !== 'index' && metric !== 'yield' && metric !== 'ppm') return 'Choose a metric.';
    var meanMin = optionalBound(req.meanMin);
    var meanMax = optionalBound(req.meanMax);
    if (Number.isNaN(meanMin) || Number.isNaN(meanMax)) return 'Mean limits have to be numeric or blank.';
    if (meanMin != null && meanMax != null && meanMin > meanMax) return 'The minimum mean is above the maximum mean.';
    var sdMin = optionalBound(req.sdMin);
    if (Number.isNaN(sdMin)) return 'The practical minimum standard deviation has to be numeric or blank.';
    if (sdMin != null && !(sdMin > 0)) return 'The practical minimum standard deviation has to be greater than 0.';
    if (sdMin != null && sdMin > base.sd + INDEX_TOL) {
      return 'The practical minimum standard deviation is above the current standard deviation. Process improvement can keep the current standard deviation or reduce it.';
    }
    if (req.mode === 'spec') {
      var lowerOut = optionalBound(req.lowerOut);
      var upperOut = optionalBound(req.upperOut);
      if (Number.isNaN(lowerOut) || Number.isNaN(upperOut)) return 'Outward allowances have to be numeric or blank.';
      if (lowerOut != null && lowerOut < 0) return 'The lower-limit allowance cannot be negative.';
      if (upperOut != null && upperOut < 0) return 'The upper-limit allowance cannot be negative.';
      if (!req.unlockLower && !req.unlockUpper) return 'Unlock at least one specification limit.';
    }
    return '';
  }

  function boundsOf(req) {
    var base = req.baseline;
    return {
      meanMin: optionalBound(req.meanMin),
      meanMax: optionalBound(req.meanMax),
      sdMin: optionalBound(req.sdMin),
      lo: optionalBound(req.meanMin) == null ? -Infinity : optionalBound(req.meanMin),
      hi: optionalBound(req.meanMax) == null ? Infinity : optionalBound(req.meanMax),
      floor: optionalBound(req.sdMin) == null ? 0 : optionalBound(req.sdMin),
      lsl: base.lsl,
      usl: base.usl,
      mean: base.mean,
      sd: base.sd,
      nominal: base.nominal == null ? '' : base.nominal
    };
  }

  function targetFraction(req) {
    var goal = num(req.goal);
    if (req.metric === 'ppm') return goal / 1000000;
    return 1 - goal / 100;
  }

  function meetsIndex(value, goal) {
    return value >= goal - INDEX_TOL;
  }

  function meetsFraction(value, target) {
    return value <= target + FRACTION_TOL;
  }

  function point(bounds, mean, sd, lsl, usl) {
    return {
      mean: mean,
      sd: sd,
      lsl: lsl == null ? bounds.lsl : lsl,
      usl: usl == null ? bounds.usl : usl
    };
  }

  function candidate(id, title, minimizes, at, bounds, onBoundary) {
    var scored = metricsOf(at.lsl, at.usl, at.mean, at.sd, bounds.nominal);
    return {
      id: id,
      title: title,
      minimizes: minimizes,
      mean: at.mean,
      sd: at.sd,
      lsl: at.lsl,
      usl: at.usl,
      deltaMean: at.mean - bounds.mean,
      deltaSd: at.sd - bounds.sd,
      sdReductionPct: (bounds.sd - at.sd) / bounds.sd * 100,
      deltaLsl: at.lsl - bounds.lsl,
      deltaUsl: at.usl - bounds.usl,
      index: scored.index,
      ppm: scored.ppm,
      yieldPct: scored.yieldPct,
      approximate: !!onBoundary,
      onBoundary: !!onBoundary
    };
  }

  function bestBlock(at, bounds, attained) {
    var scored = at ? metricsOf(at.lsl, at.usl, at.mean, at.sd, bounds.nominal) : null;
    return {
      attained: !!attained && !!scored,
      mean: at ? at.mean : null,
      sd: at ? at.sd : null,
      lsl: at ? at.lsl : null,
      usl: at ? at.usl : null,
      index: scored ? scored.index : null,
      ppm: scored ? scored.ppm : null,
      yieldPct: scored ? scored.yieldPct : null
    };
  }

  function result(status, bounds, extras) {
    var baseScore = metricsOf(bounds.lsl, bounds.usl, bounds.mean, bounds.sd, bounds.nominal);
    return Object.assign({
      ok: true,
      status: status,
      reason: '',
      limiting: '',
      policy: '',
      baseline: {
        index: baseScore.index,
        ppm: baseScore.ppm,
        yieldPct: baseScore.yieldPct
      },
      candidates: [],
      best: bestBlock(null, bounds, false),
      meanDomain: meanDomain(bounds)
    }, extras || {});
  }

  function meanDomain(bounds) {
    var span = bounds.usl - bounds.lsl;
    var lo = Number.isFinite(bounds.lo) ? bounds.lo : Math.min(bounds.mean, bounds.lsl) - span * 0.05;
    var hi = Number.isFinite(bounds.hi) ? bounds.hi : Math.max(bounds.mean, bounds.usl) + span * 0.05;
    if (!(hi > lo)) hi = lo + span;
    return { lo: lo, hi: hi };
  }

  function bisect(fn, lo, hi, target, increasing) {
    var a = lo;
    var b = hi;
    var i;
    for (i = 0; i < 80; i++) {
      var mid = (a + b) / 2;
      if (Math.abs(b - a) <= 1e-10 * Math.max(1, Math.abs(mid))) break;
      var above = fn(mid) > target;
      if (increasing) {
        if (above) b = mid;
        else a = mid;
      } else if (above) a = mid;
      else b = mid;
    }
    return (a + b) / 2;
  }

  function currentMeets(req, bounds) {
    if (bounds.mean < bounds.lo - INDEX_TOL || bounds.mean > bounds.hi + INDEX_TOL) return false;
    if (bounds.floor > 0 && bounds.sd + INDEX_TOL < bounds.floor) return false;
    if (req.metric === 'index') return meetsIndex(indexOf(bounds.mean, bounds.sd, bounds.lsl, bounds.usl), num(req.goal));
    return meetsFraction(fractionOf(bounds.lsl, bounds.usl, bounds.mean, bounds.sd), targetFraction(req));
  }

  function solveMeanIndex(req, bounds) {
    var goal = num(req.goal);
    var half = 3 * goal * bounds.sd;
    var winLo = bounds.lsl + half;
    var winHi = bounds.usl - half;
    var mid = (bounds.lsl + bounds.usl) / 2;
    var bestMean = clamp(mid, bounds.lo, bounds.hi);
    if (!(winHi >= winLo - INDEX_TOL)) {
      return result('unreachable', bounds, {
        reason: 'Cannot reach goal with these constraints. At this standard deviation the goal interval is empty.',
        limiting: 'standard deviation',
        best: bestBlock(point(bounds, bestMean, bounds.sd), bounds, true)
      });
    }
    var lo = Math.max(winLo, bounds.lo);
    var hi = Math.min(winHi, bounds.hi);
    if (hi < lo - INDEX_TOL) {
      return result('unreachable', bounds, {
        reason: 'Cannot reach goal with these constraints. The permitted mean range misses the means that would meet the goal.',
        limiting: 'mean range',
        best: bestBlock(point(bounds, bestMean, bounds.sd), bounds, true)
      });
    }
    if (currentMeets(req, bounds)) {
      return result('already-met', bounds, {
        candidates: [candidate('current', 'Current process', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)]
      });
    }
    var mean = clamp(bounds.mean, lo, hi);
    return result('reachable', bounds, {
      candidates: [candidate('mean', 'Closest allowed mean', 'change in the mean', point(bounds, mean, bounds.sd), bounds, true)],
      feasibleMean: { lo: lo, hi: hi }
    });
  }

  function solveSdIndex(req, bounds) {
    var goal = num(req.goal);
    var gap = roomAt(bounds.mean, bounds.lsl, bounds.usl);
    if (!(gap > INDEX_TOL)) {
      return result('unreachable', bounds, {
        reason: 'Cannot reach goal with these constraints. The mean is on or outside a specification limit, so no positive standard deviation can meet a positive goal.',
        limiting: 'mean',
        best: bestBlock(null, bounds, false)
      });
    }
    var sGoal = gap / (3 * goal);
    if (currentMeets(req, bounds)) {
      return result('already-met', bounds, {
        candidates: [candidate('current', 'Current process', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)]
      });
    }
    var chosen = Math.min(sGoal, bounds.sd);
    if (chosen + INDEX_TOL < bounds.floor) {
      return result('unreachable', bounds, {
        reason: 'Cannot reach goal with these constraints. The standard deviation that would meet the goal is below the practical minimum.',
        limiting: 'practical minimum standard deviation',
        best: bestBlock(point(bounds, bounds.mean, bounds.floor), bounds, true)
      });
    }
    return result('reachable', bounds, {
      candidates: [candidate('sd', 'Largest standard deviation that meets the goal', 'standard deviation reduction', point(bounds, bounds.mean, chosen), bounds, true)]
    });
  }

  function indexWindow(bounds, goal, sd) {
    var half = 3 * goal * sd;
    var lo = Math.max(bounds.lsl + half, bounds.lo);
    var hi = Math.min(bounds.usl - half, bounds.hi);
    if (hi < lo - INDEX_TOL) return null;
    return { lo: lo, hi: hi };
  }

  function solveBothIndex(req, bounds) {
    var goal = num(req.goal);
    var mid = (bounds.lsl + bounds.usl) / 2;
    var meanKeep = clamp(mid, bounds.lo, bounds.hi);
    var currentWindow = indexWindow(bounds, goal, bounds.sd);
    var atCurrentSd = currentWindow
      ? { meets: true, lo: currentWindow.lo, hi: currentWindow.hi, sd: bounds.sd }
      : { meets: false, sd: bounds.sd };
    if (currentWindow) {
      var marginMean = clamp(mid, currentWindow.lo, currentWindow.hi);
      if (currentMeets(req, bounds)) {
        var kept = [candidate('current', 'Current process', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)];
        if (!nearly(marginMean, bounds.mean)) {
          kept.push(candidate('most-margin', 'Most margin at current SD', 'distance from the specification limits', point(bounds, marginMean, bounds.sd), bounds, false));
        }
        return result('already-met', bounds, {
          candidates: kept,
          atCurrentSd: atCurrentSd,
          feasibleMean: currentWindow
        });
      }
      var shiftMean = clamp(bounds.mean, currentWindow.lo, currentWindow.hi);
      var shifted = [candidate('smallest-shift', 'Smallest mean shift at current SD', 'change in the mean', point(bounds, shiftMean, bounds.sd), bounds, true)];
      if (!nearly(marginMean, shiftMean)) {
        shifted.push(candidate('most-margin', 'Most margin at current SD', 'distance from the specification limits', point(bounds, marginMean, bounds.sd), bounds, false));
      }
      return result('reachable', bounds, {
        candidates: shifted,
        atCurrentSd: atCurrentSd,
        feasibleMean: currentWindow
      });
    }
    var allow = roomAt(meanKeep, bounds.lsl, bounds.usl) / (3 * goal);
    if (!(allow > 0) || allow + INDEX_TOL < bounds.floor) {
      var bestSd = bounds.floor > 0 ? bounds.floor : bounds.sd;
      var inside = roomAt(meanKeep, bounds.lsl, bounds.usl) > INDEX_TOL;
      return result('unreachable', bounds, {
        reason: inside
          ? 'Cannot reach goal with these constraints. Even at the practical minimum standard deviation, the permitted mean cannot reach the goal.'
          : 'Cannot reach goal with these constraints. No permitted mean is inside the specification limits.',
        limiting: inside ? 'practical minimum standard deviation' : 'mean range',
        best: inside ? bestBlock(point(bounds, meanKeep, bestSd), bounds, true) : bestBlock(null, bounds, false),
        atCurrentSd: atCurrentSd
      });
    }
    if (currentMeets(req, bounds)) {
      return result('already-met', bounds, {
        candidates: [candidate('current', 'Current process', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)],
        atCurrentSd: atCurrentSd,
        feasibleMean: indexWindow(bounds, goal, Math.max(bounds.floor, allow > bounds.sd ? bounds.sd : allow)) || meanDomain(bounds)
      });
    }
    var sdKeep = Math.min(bounds.sd, allow);
    var list = [candidate('preserve-sd', 'Least SD reduction', 'standard deviation reduction', point(bounds, meanKeep, sdKeep), bounds, true)];
    if (bounds.floor > 0) {
      var win = indexWindow(bounds, goal, bounds.floor);
      if (win) {
        var shiftedMean = clamp(bounds.mean, win.lo, win.hi);
        if (!nearly(shiftedMean, meanKeep)) {
          list.push(candidate('smallest-shift', 'Smallest change in the mean', 'change in the mean', point(bounds, shiftedMean, bounds.floor), bounds, true));
        }
      }
    }
    return result('reachable', bounds, {
      candidates: list,
      atCurrentSd: atCurrentSd,
      feasibleMean: indexWindow(bounds, goal, Math.max(bounds.floor, 1e-9)) || { lo: meanKeep, hi: meanKeep }
    });
  }

  function fractionSdLimit(bounds, mean, target, floor) {
    var sLo = floor > 0 ? floor : Math.min(bounds.sd * 1e-6, 1e-8);
    var sHi = bounds.sd;
    if (sLo > sHi + INDEX_TOL) return { ok: false, reason: 'practical minimum standard deviation' };
    function frac(sd) { return fractionOf(bounds.lsl, bounds.usl, mean, sd); }
    var onLimit = nearly(mean, bounds.lsl) || nearly(mean, bounds.usl);
    var outside = mean < bounds.lsl - INDEX_TOL || mean > bounds.usl + INDEX_TOL;
    if (onLimit && target <= 0.5 + FRACTION_TOL) {
      return {
        ok: false,
        attained: false,
        reason: 'The mean is on a specification limit. Expected PPM stays above 500,000 for every positive standard deviation and only approaches 500,000 as the standard deviation tends to zero.',
        limiting: 'mean'
      };
    }
    if (!outside) {
      if (meetsFraction(frac(sHi), target)) return { ok: true, sd: sHi, onBoundary: false };
      if (!meetsFraction(frac(sLo), target)) {
        return { ok: false, attained: true, sd: sLo, reason: 'standard deviation', limiting: 'standard deviation' };
      }
      return { ok: true, sd: bisect(frac, sLo, sHi, target, true), onBoundary: true };
    }
    var a = mean < bounds.lsl ? bounds.lsl - mean : mean - bounds.usl;
    var b = mean < bounds.lsl ? bounds.usl - mean : mean - bounds.lsl;
    var sStar = Math.sqrt((b * b - a * a) / (2 * Math.log(b / a)));
    var bestSd = sHi;
    var bestFrac = frac(sHi);
    if (frac(sLo) < bestFrac) { bestSd = sLo; bestFrac = frac(sLo); }
    if (sStar >= sLo && sStar <= sHi && frac(sStar) < bestFrac) { bestSd = sStar; bestFrac = frac(sStar); }
    if (!meetsFraction(bestFrac, target)) {
      return { ok: false, attained: true, sd: bestSd, reason: 'standard deviation', limiting: 'standard deviation' };
    }
    if (meetsFraction(frac(sHi), target)) return { ok: true, sd: sHi, onBoundary: false };
    var left = bestSd;
    return { ok: true, sd: bisect(frac, left, sHi, target, true), onBoundary: true };
  }

  function solveMeanFraction(req, bounds) {
    var target = targetFraction(req);
    var mid = (bounds.lsl + bounds.usl) / 2;
    var bestMean = clamp(mid, bounds.lo, bounds.hi);
    function frac(mean) { return fractionOf(bounds.lsl, bounds.usl, mean, bounds.sd); }
    if (!meetsFraction(frac(bestMean), target)) {
      return result('unreachable', bounds, {
        reason: 'Cannot reach goal with these constraints. The allowed mean closest to the specification midpoint still misses the goal at the current standard deviation.',
        limiting: 'standard deviation',
        best: bestBlock(point(bounds, bestMean, bounds.sd), bounds, true)
      });
    }
    if (currentMeets(req, bounds)) {
      return result('already-met', bounds, {
        candidates: [candidate('current', 'Current process', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)]
      });
    }
    var left = bounds.lo;
    var right = bounds.hi;
    var searchLo = Number.isFinite(bounds.lo) ? bounds.lo : Math.min(bounds.mean, mid) - (bounds.usl - bounds.lsl);
    var searchHi = Number.isFinite(bounds.hi) ? bounds.hi : Math.max(bounds.mean, mid) + (bounds.usl - bounds.lsl);
    if (!meetsFraction(frac(searchLo), target)) left = bisect(frac, searchLo, bestMean, target, false);
    else left = searchLo;
    if (!meetsFraction(frac(searchHi), target)) right = bisect(frac, bestMean, searchHi, target, true);
    else right = searchHi;
    var mean = clamp(bounds.mean, left, right);
    return result('reachable', bounds, {
      candidates: [candidate('mean', 'Smallest shift from the current mean', 'change in the mean', point(bounds, mean, bounds.sd), bounds, true)],
      feasibleMean: { lo: left, hi: right }
    });
  }

  function solveSdFraction(req, bounds) {
    var found = fractionSdLimit(bounds, bounds.mean, targetFraction(req), bounds.floor);
    if (!found.ok) {
      var at = found.sd != null ? point(bounds, bounds.mean, found.sd) : null;
      return result('unreachable', bounds, {
        reason: found.reason || 'Cannot reach goal with these constraints.',
        limiting: found.limiting || 'standard deviation',
        best: bestBlock(at, bounds, !!found.attained)
      });
    }
    if (currentMeets(req, bounds) && nearly(found.sd, bounds.sd)) {
      return result('already-met', bounds, {
        candidates: [candidate('current', 'Current process', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)]
      });
    }
    return result('reachable', bounds, {
      candidates: [candidate('sd', 'Largest standard deviation that meets the goal', 'standard deviation reduction', point(bounds, bounds.mean, found.sd), bounds, !!found.onBoundary)]
    });
  }

  function solveBothFraction(req, bounds) {
    var target = targetFraction(req);
    var mid = (bounds.lsl + bounds.usl) / 2;
    var meanKeep = clamp(mid, bounds.lo, bounds.hi);
    var kept = fractionSdLimit(bounds, meanKeep, target, bounds.floor);
    if (!kept.ok) {
      var at = kept.sd != null ? point(bounds, meanKeep, kept.sd) : null;
      return result('unreachable', bounds, {
        reason: 'Cannot reach goal with these constraints. ' + (kept.reason || 'The permitted mean cannot reach the goal at an allowed standard deviation.'),
        limiting: kept.limiting || 'standard deviation',
        best: bestBlock(at, bounds, !!kept.attained)
      });
    }
    if (currentMeets(req, bounds)) {
      return result('already-met', bounds, {
        candidates: [candidate('current', 'Current process', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)]
      });
    }
    var list = [candidate('preserve-sd', 'Preserves the most standard deviation', 'standard deviation reduction', point(bounds, meanKeep, kept.sd), bounds, !!kept.onBoundary)];
    if (bounds.floor > 0) {
      var shiftReq = Object.assign({}, req, { adjust: 'mean' });
      var savedSd = bounds.sd;
      bounds.sd = bounds.floor;
      var shifted = solveMeanFraction(shiftReq, bounds);
      bounds.sd = savedSd;
      if (shifted.status === 'reachable' || shifted.status === 'already-met') {
        var alt = shifted.candidates[0];
        if (alt && !nearly(alt.mean, meanKeep)) {
          list.push(candidate('smallest-shift', 'Smallest change in the mean', 'change in the mean', point(bounds, alt.mean, bounds.floor), bounds, true));
        }
      }
    }
    return result('reachable', bounds, { candidates: list });
  }

  function capAmount(unlocked, amount) {
    if (!unlocked) return 0;
    var n = optionalBound(amount);
    return n == null ? Infinity : n;
  }

  function solveSpecIndex(req, bounds) {
    var goal = num(req.goal);
    var need = 3 * goal * bounds.sd;
    var needL = bounds.mean - need;
    var needU = bounds.mean + need;
    var moveL = Math.max(0, bounds.lsl - needL);
    var moveU = Math.max(0, needU - bounds.usl);
    var capL = capAmount(req.unlockLower, req.lowerOut);
    var capU = capAmount(req.unlockUpper, req.upperOut);
    if (moveL <= INDEX_TOL && moveU <= INDEX_TOL) {
      return result('already-met', bounds, {
        candidates: [candidate('current', 'Current specifications', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)]
      });
    }
    if (moveL > capL + 1e-8) {
      return result('unreachable', bounds, {
        reason: req.unlockLower
          ? 'Cannot reach goal with these constraints. The lower limit would have to move farther outward than the allowance.'
          : 'Cannot reach goal with these constraints. The lower specification is locked, and the mean is too close to it.',
        limiting: 'lower specification',
        best: bestBlock(null, bounds, false)
      });
    }
    if (moveU > capU + 1e-8) {
      return result('unreachable', bounds, {
        reason: req.unlockUpper
          ? 'Cannot reach goal with these constraints. The upper limit would have to move farther outward than the allowance.'
          : 'Cannot reach goal with these constraints. The upper specification is locked, and the mean is too close to it.',
        limiting: 'upper specification',
        best: bestBlock(null, bounds, false)
      });
    }
    return result('reachable', bounds, {
      policy: 'Smallest outward move on each side that needs it',
      candidates: [candidate('specs', 'Capability under proposed specifications', 'outward specification change', point(bounds, bounds.mean, bounds.sd, bounds.lsl - moveL, bounds.usl + moveU), bounds, true)]
    });
  }

  function solveSpecFraction(req, bounds) {
    var target = targetFraction(req);
    var capL = capAmount(req.unlockLower, req.lowerOut);
    var capU = capAmount(req.unlockUpper, req.upperOut);
    function frac(tL, tU) {
      return fractionOf(bounds.lsl - tL, bounds.usl + tU, bounds.mean, bounds.sd);
    }
    if (meetsFraction(frac(0, 0), target)) {
      return result('already-met', bounds, {
        candidates: [candidate('current', 'Current specifications', 'no change', point(bounds, bounds.mean, bounds.sd), bounds, false)]
      });
    }
    var far = 40 * bounds.sd;
    var floorL = capL === Infinity ? far : capL;
    var floorU = capU === Infinity ? far : capU;
    if (!meetsFraction(frac(floorL, floorU), target)) {
      return result('unreachable', bounds, {
        reason: 'Cannot reach goal with these constraints. Moving the unlocked limits as far as allowed still leaves too much of the distribution outside the specifications.',
        limiting: capL === 0 ? 'lower specification' : capU === 0 ? 'upper specification' : 'specification allowance',
        best: bestBlock(point(bounds, bounds.mean, bounds.sd, bounds.lsl - floorL, bounds.usl + floorU), bounds, true)
      });
    }
    var both = req.unlockLower && req.unlockUpper;
    var tL = 0;
    var tU = 0;
    if (both) {
      var maxEqual = Math.min(capL, capU);
      var equalHi = maxEqual === Infinity ? bounds.sd : maxEqual;
      if (maxEqual === Infinity) {
        while (!meetsFraction(frac(equalHi, equalHi), target) && equalHi < far) equalHi *= 2;
      }
      if (meetsFraction(frac(equalHi, equalHi), target)) {
        var t = bisect(function (tMove) { return frac(tMove, tMove); }, 0, equalHi, target, false);
        tL = t;
        tU = t;
      } else {
        tL = maxEqual;
        tU = maxEqual;
      }
      if (!meetsFraction(frac(tL, tU), target) && capL > tL) {
        var extraL = bisect(function (extra) { return frac(tL + extra, tU); }, 0, capL === Infinity ? far : capL - tL, target, false);
        tL += extraL;
      } else if (!meetsFraction(frac(tL, tU), target) && capU > tU) {
        var extraU = bisect(function (extra) { return frac(tL, tU + extra); }, 0, capU === Infinity ? far : capU - tU, target, false);
        tU += extraU;
      }
    } else if (req.unlockLower) {
      var hiL = capL === Infinity ? far : capL;
      if (capL === Infinity) {
        while (!meetsFraction(frac(hiL, 0), target) && hiL < far) hiL *= 2;
      }
      tL = bisect(function (tMove) { return frac(tMove, 0); }, 0, hiL, target, false);
    } else {
      var hiU = capU === Infinity ? far : capU;
      if (capU === Infinity) {
        while (!meetsFraction(frac(0, hiU), target) && hiU < far) hiU *= 2;
      }
      tU = bisect(function (tMove) { return frac(0, tMove); }, 0, hiU, target, false);
    }
    return result('reachable', bounds, {
      policy: both ? 'Equal widening until a limit is reached' : 'Smallest outward move of the unlocked limit',
      candidates: [candidate('specs', 'Capability under proposed specifications', 'outward specification change', point(bounds, bounds.mean, bounds.sd, bounds.lsl - tL, bounds.usl + tU), bounds, true)]
    });
  }

  function solve(req) {
    var error = validate(req || {});
    if (error) return fail(error);
    var bounds = boundsOf(req);
    if (req.mode === 'spec') {
      return req.metric === 'index' ? solveSpecIndex(req, bounds) : solveSpecFraction(req, bounds);
    }
    if (req.metric === 'index') {
      if (req.adjust === 'mean') return solveMeanIndex(req, bounds);
      if (req.adjust === 'sd') return solveSdIndex(req, bounds);
      return solveBothIndex(req, bounds);
    }
    if (req.adjust === 'mean') return solveMeanFraction(req, bounds);
    if (req.adjust === 'sd') return solveSdFraction(req, bounds);
    return solveBothFraction(req, bounds);
  }

  function sdBoundsAtMean(req, mean) {
    var error = validate(req || {});
    if (error || req.mode === 'spec' || req.adjust !== 'both') return null;
    var bounds = boundsOf(req);
    if (mean < bounds.lo - INDEX_TOL || mean > bounds.hi + INDEX_TOL) return null;
    var floor = bounds.floor;
    if (req.metric === 'index') {
      var gap = roomAt(mean, bounds.lsl, bounds.usl);
      if (!(gap > 0)) return null;
      var goalSd = gap / (3 * num(req.goal));
      var high = Math.min(bounds.sd, goalSd);
      if (high < floor - INDEX_TOL || !(high > 0)) return null;
      return { sdLow: floor, sdHigh: high, sdGoal: goalSd, cappedByCurrent: goalSd > bounds.sd + INDEX_TOL };
    }
    var target = targetFraction(req);
    var found = fractionSdLimit(bounds, mean, target, floor);
    if (!found.ok) return null;
    var outside = mean < bounds.lsl - INDEX_TOL || mean > bounds.usl + INDEX_TOL;
    if (!outside) return { sdLow: floor, sdHigh: found.sd };
    var sLo = floor > 0 ? floor : Math.min(bounds.sd * 1e-6, 1e-8);
    function frac(sd) { return fractionOf(bounds.lsl, bounds.usl, mean, sd); }
    var nearer = mean < bounds.lsl ? bounds.lsl - mean : mean - bounds.usl;
    var farther = mean < bounds.lsl ? bounds.usl - mean : mean - bounds.lsl;
    var sStar = Math.sqrt((farther * farther - nearer * nearer) / (2 * Math.log(farther / nearer)));
    var low = sLo;
    if (sStar > sLo && !meetsFraction(frac(sLo), target)) {
      low = bisect(frac, sLo, Math.min(sStar, found.sd), target, false);
    }
    if (low > found.sd + INDEX_TOL) return null;
    return { sdLow: low, sdHigh: found.sd };
  }

  function previewMean(req, mean) {
    var bounds = boundsAtPreview(req);
    if (!bounds) return null;
    var outside = mean < bounds.lo - INDEX_TOL || mean > bounds.hi + INDEX_TOL;
    var region = outside ? null : sdBoundsAtMean(req, mean);
    var sd = region ? region.sdHigh : (bounds.floor > 0 ? bounds.floor : bounds.sd);
    var scored = metricsOf(bounds.lsl, bounds.usl, mean, sd, bounds.nominal);
    if (!scored) return null;
    return {
      mean: mean,
      sd: sd,
      meets: !!region,
      reason: outside ? 'outside' : (region ? '' : 'no-sd'),
      sdGoal: region ? region.sdGoal : null,
      sdCeiling: bounds.sd,
      cappedByCurrent: region ? !!region.cappedByCurrent : false,
      index: scored.index,
      ppm: scored.ppm,
      yieldPct: scored.yieldPct
    };
  }

  function answerText(found, opts) {
    var digits = opts && Number.isFinite(opts.digits) ? opts.digits : 2;
    var unit = opts && opts.unit ? ' ' + opts.unit : '';
    var label = (opts && opts.indexLabel) || 'Ppk';
    var goal = opts ? opts.goal : NaN;
    function fixed(n) { return Number.isFinite(n) ? Number(n).toFixed(digits) : '—'; }
    var band = found && found.atCurrentSd;
    if (band && band.meets && found.status !== 'unreachable') {
      var lines = [];
      if (found.status === 'already-met') lines.push('The current process already meets the goal.');
      lines.push(label + ' ' + fixed(goal) + ' is reachable at the current SD of ' + fixed(band.sd) + unit + '.');
      if (band.hi > band.lo + 1e-6) {
        lines.push('A mean from ' + fixed(band.lo) + ' to ' + fixed(band.hi) + unit + ' meets the goal.');
      }
      return lines.join(' ');
    }
    if (band && !band.meets && found.status === 'reachable') {
      return label + ' ' + fixed(goal) + ' is not reachable at the current SD of ' + fixed(band.sd) + unit + '. The standard deviation has to be reduced.';
    }
    return '';
  }

  function boundsAtPreview(req) {
    if (validate(req || {})) return null;
    return boundsOf(req);
  }

  return {
    INDEX_TOL: INDEX_TOL,
    FRACTION_TOL: FRACTION_TOL,
    labels: labels,
    metricsOf: metricsOf,
    fractionOf: fractionOf,
    indexOf: indexOf,
    solve: solve,
    sdBoundsAtMean: sdBoundsAtMean,
    previewMean: previewMean,
    answerText: answerText
  };
});
