/**
 * Detrended P–P / Q–Q axis scale and Y-zoom.
 * Presentation only: residuals and bounds are derived from pairs the upper
 * plot already uses. Zoom never rewrites those residuals.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DetrendedAxis = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ZOOM_FACTORS = [1, 2, 4, 8];

  function isFiniteNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function cleanNumber(value) {
    if (!isFiniteNumber(value)) return value;
    var cleaned = Number(value.toPrecision(12));
    return Object.is(cleaned, -0) ? 0 : cleaned;
  }

  function niceOutwardLimit(rawHalfRange) {
    if (!isFiniteNumber(rawHalfRange) || rawHalfRange <= 0) return null;
    var exp = Math.floor(Math.log10(rawHalfRange));
    var pow = Math.pow(10, exp);
    if (rawHalfRange / pow >= 10) {
      exp += 1;
      pow = Math.pow(10, exp);
    }
    var frac = rawHalfRange / pow;
    var steps = [1, 2, 5, 10];
    var nice = 10;
    for (var i = 0; i < steps.length; i++) {
      if (frac <= steps[i] * (1 + 1e-10)) {
        nice = steps[i];
        break;
      }
    }
    var limit = cleanNumber(nice * pow);
    if (limit + 1e-12 < rawHalfRange) {
      var next = steps[steps.indexOf(nice) + 1] || 10;
      if (next === 10 && nice === 10) {
        limit = cleanNumber(10 * pow * 10);
      } else if (nice === 5) {
        limit = cleanNumber(10 * pow);
      } else {
        limit = cleanNumber(next * pow);
      }
    }
    return limit;
  }

  function sampleStandardDeviation(values) {
    var xs = [];
    var i;
    for (i = 0; i < (values ? values.length : 0); i++) {
      if (isFiniteNumber(values[i])) xs.push(values[i]);
    }
    if (xs.length < 2) return null;
    var mean = 0;
    for (i = 0; i < xs.length; i++) mean += xs[i];
    mean /= xs.length;
    var ss = 0;
    for (i = 0; i < xs.length; i++) {
      var d = xs[i] - mean;
      ss += d * d;
    }
    var sd = Math.sqrt(ss / (xs.length - 1));
    return isFiniteNumber(sd) ? sd : null;
  }

  function autoHalfRange(residuals, options) {
    options = options || {};
    var mode = options.mode === 'pp' ? 'pp' : 'qq';
    var finite = [];
    var i;
    for (i = 0; i < (residuals ? residuals.length : 0); i++) {
      if (isFiniteNumber(residuals[i])) finite.push(residuals[i]);
    }
    if (!finite.length) return { ok: false, reason: 'empty' };
    var maxAbs = 0;
    for (i = 0; i < finite.length; i++) {
      var abs = Math.abs(finite[i]);
      if (abs > maxAbs) maxAbs = abs;
    }
    if (maxAbs === 0) {
      if (mode === 'pp') return { ok: true, lAuto: 0.01, fallback: true, maxAbs: 0 };
      if (options.standardized) return { ok: true, lAuto: 0.05, fallback: true, maxAbs: 0 };
      if (!isFiniteNumber(options.sampleSd) || options.sampleSd <= 0) {
        return { ok: false, reason: 'undefined-scale', maxAbs: 0 };
      }
      var zeroRaw = 0.05 * options.sampleSd;
      return {
        ok: true,
        lAuto: niceOutwardLimit(zeroRaw),
        rawHalfRange: zeroRaw,
        fallback: true,
        maxAbs: 0
      };
    }
    var raw = 1.1 * maxAbs;
    return {
      ok: true,
      lAuto: niceOutwardLimit(raw),
      rawHalfRange: raw,
      fallback: false,
      maxAbs: maxAbs
    };
  }

  function clampZoom(zoom) {
    var z = Number(zoom);
    return ZOOM_FACTORS.indexOf(z) === -1 ? 1 : z;
  }

  function stepZoom(zoom, direction) {
    var z = clampZoom(zoom);
    var index = ZOOM_FACTORS.indexOf(z);
    if (direction > 0) index = Math.min(ZOOM_FACTORS.length - 1, index + 1);
    else if (direction < 0) index = Math.max(0, index - 1);
    return ZOOM_FACTORS[index];
  }

  function zoomForContext(previousZoom, previousKey, nextKey) {
    if (previousKey !== nextKey) return 1;
    return clampZoom(previousZoom);
  }

  function dataSignature(values) {
    var h = 2166136261;
    var n = values ? values.length : 0;
    for (var i = 0; i < n; i++) {
      var s = String(values[i]);
      for (var j = 0; j < s.length; j++) {
        h ^= s.charCodeAt(j);
        h = Math.imul(h, 16777619);
      }
      h ^= 124;
      h >>>= 0;
    }
    return n + ':' + (h >>> 0);
  }

  function contextKey(state) {
    state = state || {};
    return [
      state.mode || '',
      state.distribution || '',
      state.variable || '',
      state.signature || ''
    ].join('\u001f');
  }

  function yBounds(lAuto, zoom) {
    var z = clampZoom(zoom);
    var half = cleanNumber(lAuto / z);
    return { min: cleanNumber(-half), max: half, zoom: z, lAuto: lAuto };
  }

  function symmetricTicks(half, intervals) {
    var n = intervals || 4;
    var ticks = [];
    var i;
    for (i = 0; i <= n; i++) ticks.push(cleanNumber(-half + (2 * half * i) / n));
    ticks[0] = cleanNumber(-half);
    ticks[n] = cleanNumber(half);
    if (n % 2 === 0) ticks[n / 2] = 0;
    return ticks;
  }

  function outsideCounts(residuals, min, max) {
    var above = 0;
    var below = 0;
    var plotted = 0;
    for (var i = 0; i < (residuals ? residuals.length : 0); i++) {
      var residual = residuals[i];
      if (!isFiniteNumber(residual)) continue;
      plotted += 1;
      if (residual > max) above += 1;
      else if (residual < min) below += 1;
    }
    return { above: above, below: below, outside: above + below, plotted: plotted };
  }

  function outsideNotice(counts) {
    var outside = counts && counts.outside ? counts.outside : 0;
    if (outside <= 0) {
      return { visible: false, text: '', aboveText: '', belowText: '' };
    }
    var noun = outside === 1 ? ' point outside view' : ' points outside view';
    return {
      visible: true,
      text: outside + noun,
      aboveText: counts.above > 0 ? '\u2191 ' + counts.above + ' above' : '',
      belowText: counts.below > 0 ? '\u2193 ' + counts.below + ' below' : ''
    };
  }

  function formatMagnitude(abs) {
    if (!isFiniteNumber(abs) || abs === 0) return '0';
    if (abs >= 10000 || abs < 0.001) {
      var exp = abs.toExponential(2).replace('e+', 'e');
      if (exp === '0.00e0' || exp === '0.00e-0') return abs.toExponential(6).replace('e+', 'e');
      return exp;
    }
    var digits = 0;
    for (var d = 0; d <= 8; d++) {
      if (Math.abs(Number(abs.toFixed(d)) - abs) <= Math.max(abs * 1e-8, 1e-12)) {
        digits = d;
        break;
      }
      digits = d;
    }
    if (abs < 10) digits = Math.max(digits, 2);
    var text = abs.toFixed(digits);
    if (Number(text) === 0) return abs.toExponential(2).replace('e+', 'e');
    return text;
  }

  function formatSigned(value) {
    var n = typeof value === 'number' ? value : Number(value);
    if (!isFiniteNumber(n)) return '';
    if (n === 0) return '0';
    return (n < 0 ? '\u2212' : '+') + formatMagnitude(Math.abs(n));
  }

  function formatAxisTick(value) {
    var n = typeof value === 'number' ? value : Number(value);
    if (!isFiniteNumber(n)) return '';
    if (n === 0) return '0';
    return (n < 0 ? '\u2212' : '') + formatMagnitude(Math.abs(n));
  }

  function formatPlain(value) {
    var n = typeof value === 'number' ? value : Number(value);
    if (!isFiniteNumber(n)) return '';
    if (n === 0) return '0';
    return (n < 0 ? '\u2212' : '') + formatMagnitude(Math.abs(n));
  }

  function formatRange(min, max) {
    return 'Y: ' + formatSigned(min) + ' to ' + formatSigned(max);
  }

  function yAxisTitle(mode, standardized) {
    if (mode === 'pp') return 'Probability difference';
    if (standardized) return 'Standardized quantile difference';
    return 'Quantile difference';
  }

  function zoomControlState(zoom, enabled) {
    var z = clampZoom(zoom);
    return {
      zoom: z,
      factorLabel: z + '\u00d7',
      inDisabled: !enabled || z === ZOOM_FACTORS[ZOOM_FACTORS.length - 1],
      outDisabled: !enabled || z === ZOOM_FACTORS[0],
      resetVisible: !!enabled && z !== 1,
      controlsDisabled: !enabled
    };
  }

  function tooltipLines(point, mode) {
    point = point || {};
    var lines = ['Case ' + point.caseId];
    if (mode === 'pp') {
      lines.push('Theoretical probability: ' + formatPlain(point.theoretical));
      lines.push('Sample probability: ' + formatPlain(point.observed));
      lines.push('Probability difference: ' + formatSigned(point.residual));
    } else {
      lines.push('Theoretical quantile: ' + formatPlain(point.theoretical));
      lines.push('Observed quantile: ' + formatPlain(point.observed));
      lines.push('Quantile difference: ' + formatSigned(point.residual));
    }
    return lines;
  }

  function modelFromPairs(pairs, options) {
    options = options || {};
    var mode = options.mode === 'pp' ? 'pp' : 'qq';
    var reference = options.reference || { intercept: 0, slope: 1 };
    if (!isFiniteNumber(reference.intercept) || !isFiniteNumber(reference.slope)) {
      return { ok: false, reason: 'undefined-scale', points: [] };
    }
    var points = [];
    var residuals = [];
    for (var i = 0; i < (pairs ? pairs.length : 0); i++) {
      var pair = pairs[i];
      if (!pair || !isFiniteNumber(pair.theoretical) || !isFiniteNumber(pair.observed)) continue;
      var residual = cleanNumber(pair.observed - (reference.intercept + reference.slope * pair.theoretical));
      if (!isFiniteNumber(residual)) continue;
      points.push({
        caseId: pair.caseId,
        theoretical: pair.theoretical,
        observed: pair.observed,
        residual: residual
      });
      residuals.push(residual);
    }
    if (!points.length) return { ok: false, reason: 'empty', points: [] };
    var scale = autoHalfRange(residuals, {
      mode: mode,
      standardized: !!options.standardized,
      sampleSd: options.sampleSd
    });
    if (!scale.ok) return { ok: false, reason: scale.reason, points: points };
    return withZoom({
      ok: true,
      mode: mode,
      yTitle: yAxisTitle(mode, !!options.standardized),
      lAuto: scale.lAuto,
      rawHalfRange: scale.rawHalfRange,
      points: points,
      reference: { intercept: reference.intercept, slope: reference.slope }
    }, options.zoom == null ? 1 : options.zoom);
  }

  function withZoom(model, zoom) {
    var bounds = yBounds(model.lAuto, zoom);
    var residuals = [];
    for (var i = 0; i < model.points.length; i++) residuals.push(model.points[i].residual);
    var counts = outsideCounts(residuals, bounds.min, bounds.max);
    return {
      ok: true,
      mode: model.mode,
      yTitle: model.yTitle,
      lAuto: model.lAuto,
      rawHalfRange: model.rawHalfRange,
      points: model.points,
      reference: model.reference,
      zoom: bounds.zoom,
      bounds: bounds,
      ticks: symmetricTicks(bounds.max, 4),
      counts: counts,
      notice: outsideNotice(counts),
      rangeLabel: formatRange(bounds.min, bounds.max),
      controls: zoomControlState(bounds.zoom, true)
    };
  }

  function yAxisOptions(model) {
    return {
      min: model.bounds.min,
      max: model.bounds.max,
      startOnTick: false,
      endOnTick: false,
      minPadding: 0,
      maxPadding: 0,
      tickPositions: model.ticks.slice(),
      softThreshold: false
    };
  }

  return {
    ZOOM_FACTORS: ZOOM_FACTORS,
    niceOutwardLimit: niceOutwardLimit,
    sampleStandardDeviation: sampleStandardDeviation,
    autoHalfRange: autoHalfRange,
    clampZoom: clampZoom,
    stepZoom: stepZoom,
    zoomForContext: zoomForContext,
    dataSignature: dataSignature,
    contextKey: contextKey,
    yBounds: yBounds,
    symmetricTicks: symmetricTicks,
    outsideCounts: outsideCounts,
    outsideNotice: outsideNotice,
    formatSigned: formatSigned,
    formatAxisTick: formatAxisTick,
    formatPlain: formatPlain,
    formatRange: formatRange,
    yAxisTitle: yAxisTitle,
    zoomControlState: zoomControlState,
    tooltipLines: tooltipLines,
    modelFromPairs: modelFromPairs,
    withZoom: withZoom,
    yAxisOptions: yAxisOptions
  };
});
