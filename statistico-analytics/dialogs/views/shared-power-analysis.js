/**
 * Shared power analysis engine (exact noncentral F via jStat).
 * Used by regression and one-way ANOVA analysis pages with shared-power-template.
 */
(function (global) {
  'use strict';

  function powSetText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function effectFromF2(f2) {
    if (!isFinite(f2) || f2 <= 0) return 0;
    return f2 / (1 + f2);
  }

  function f2FromEffect(v) {
    if (!isFinite(v) || v <= 0) return 0;
    if (v >= 1) return Infinity;
    return v / (1 - v);
  }

  function cohenMagnitude(f2) {
    if (!isFinite(f2) || f2 <= 0) return '';
    if (f2 < 0.02) return 'negligible';
    if (f2 < 0.15) return 'small';
    if (f2 < 0.35) return 'medium';
    return 'large';
  }

  function noncentralFCdf(f, df1, df2, ncp) {
    if (!isFinite(f) || f <= 0 || !df1 || !df2 || df1 <= 0 || df2 <= 0) return 0;
    if (typeof jStat === 'undefined' || !jStat.centralF || !jStat.beta || !jStat.beta.cdf) {
      return typeof jStat !== 'undefined' && jStat.centralF ? jStat.centralF.cdf(f, df1, df2) : 0;
    }
    if (!ncp || ncp <= 0) return jStat.centralF.cdf(f, df1, df2);
    var bx = (f * df1) / (f * df1 + df2);
    var b0 = df2 / 2;
    var sum = 0;
    var w = Math.exp(-ncp / 2);
    for (var j = 0; j < 300; j++) {
      if (j > 0) w *= (ncp / 2) / j;
      sum += w * jStat.beta.cdf(bx, df1 / 2 + j, b0);
      if (w < 1e-15) break;
    }
    return Math.max(0, Math.min(1, sum));
  }

  function powerAtF2(n, df1, df2, f2, alpha) {
    if (!f2 || f2 <= 0 || !n || !df1 || df1 < 1 || df2 < 1) return 0;
    if (typeof jStat === 'undefined' || !jStat.centralF || !jStat.centralF.inv) return 0;
    var ncp = n * f2;
    var fcrit = jStat.centralF.inv(1 - (alpha || 0.05), df1, df2);
    return Math.max(0, Math.min(1, 1 - noncentralFCdf(fcrit, df1, df2, ncp)));
  }

  function estimateRequiredN(f2, df1, minN, df2AtN, targetPower, alpha) {
    if (!f2 || f2 <= 0 || !df1 || df1 < 1) return 0;
    var nMin = Math.max(minN, df2AtN(minN) >= 1 ? minN : minN + 1);
    var nMax = 5000;
    for (var iter = 0; iter < 60; iter++) {
      var n = Math.floor((nMin + nMax) / 2);
      var df2 = df2AtN(n);
      if (df2 < 1) { nMin = n + 1; continue; }
      var power = powerAtF2(n, df1, df2, f2, alpha);
      if (Math.abs(power - targetPower) < 0.005) return n;
      if (power < targetPower) nMin = n + 1;
      else nMax = n - 1;
    }
    return Math.max(nMin, 1);
  }

  function estimateDetectableF2(n, df1, minN, df2AtN, targetPower, alpha) {
    if (!n || n < minN || !df1 || df1 < 1) return 0;
    var df2 = df2AtN(n);
    if (df2 < 1) return 0;
    var lo = 0.0001;
    var hi = 50;
    for (var i = 0; i < 60; i++) {
      var f2 = (lo + hi) / 2;
      if (powerAtF2(n, df1, df2, f2, alpha) >= targetPower) hi = f2;
      else lo = f2;
    }
    return (lo + hi) / 2;
  }

  function powerCurveNiceStep(min, max, targetTicks) {
    var span = Math.max(1, max - min);
    var raw = span / Math.max(2, targetTicks);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var nice = 10;
    if (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    return Math.max(1, nice * mag);
  }

  function interpolatePowerAtN(points, n) {
    if (!points || !points.length) return 0;
    if (n <= points[0].n) return points[0].power;
    if (n >= points[points.length - 1].n) return points[points.length - 1].power;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1];
      var b = points[i];
      if (n <= b.n) {
        var t = (n - a.n) / (b.n - a.n);
        return a.power + t * (b.power - a.power);
      }
    }
    return points[points.length - 1].power;
  }

  function createEngine(config) {
    var cfg = config || {};

    function getContext(source) {
      if (typeof cfg.getContext === 'function') return cfg.getContext(source);
      return null;
    }

    function df2AtN(ctx, n) {
      if (typeof cfg.df2AtN === 'function') return cfg.df2AtN(ctx, n);
      return n - (ctx.df2Offset || 2);
    }

    function minN(ctx) {
      if (typeof cfg.minN === 'function') return cfg.minN(ctx);
      return Math.max(ctx.df1 + 2, 8);
    }

    function observedPower(ctx) {
      return powerAtF2(ctx.n, ctx.df1, ctx.df2, ctx.f2, ctx.alpha);
    }

    function computeRequiredN(ctx, targetPower) {
      return estimateRequiredN(ctx.f2, ctx.df1, minN(ctx), function (n) { return df2AtN(ctx, n); }, targetPower, ctx.alpha);
    }

    function detectableEffect(ctx, targetPower) {
      return effectFromF2(estimateDetectableF2(ctx.n, ctx.df1, minN(ctx), function (n) { return df2AtN(ctx, n); }, targetPower, ctx.alpha));
    }

    function updateMetaLabels(ctx) {
      var labels = cfg.labels || {};
      if (labels.design) powSetText('powDesignType', labels.design);
      if (labels.target) powSetText('powTargetWhat', labels.target);
      if (labels.effectSource) powSetText('powEffectSource', labels.effectSource);
      var metric = document.querySelector('#tab-power .pwstd-metric-card:nth-child(3) .pwstd-metric-label');
      if (metric && labels.effectMetric) metric.textContent = labels.effectMetric;
      var partial = document.querySelector('#pwstd-card-planning .pwstd-planning-stat.pwstd-for-main span');
      if (partial && labels.planningEffect) partial.textContent = labels.planningEffect;
      var detItems = document.querySelectorAll('#pwstd-card-detectable .pwstd-detectable-item span');
      if (detItems.length >= 2) {
        if (labels.detectableObserved) detItems[0].textContent = labels.detectableObserved;
        if (labels.detectableThreshold) detItems[1].textContent = labels.detectableThreshold;
      }
    }

    function updateExecutiveSummary(ctx, power) {
      var el = document.getElementById('pwstd-exec-summary');
      if (!el) return;
      if (!ctx) {
        el.textContent = cfg.emptyMessage || 'Run analysis to populate power results.';
        el.className = 'pwstd-exec pwstd-exec--neutral';
        return;
      }
      var pct = (power * 100).toFixed(1);
      var mag = cohenMagnitude(ctx.f2);
      var effectName = cfg.effectName || 'effect';
      var cls = 'pwstd-exec--neutral';
      var text;
      if (power >= 0.80) {
        cls = 'pwstd-exec--success';
        text = 'Current sample size is adequate for the observed effect. Achieved power is ' + pct + '% with n = ' + ctx.n + ', α = ' + ctx.alpha.toFixed(2) + ', and observed ' + effectName + ' = ' + ctx.effect.toFixed(3) + '.';
      } else if (power >= 0.70) {
        cls = 'pwstd-exec--warning';
        text = 'Power is borderline (' + pct + '%) for the observed ' + effectName + ' with n = ' + ctx.n + '. Consider increasing sample size.';
      } else {
        cls = 'pwstd-exec--error';
        text = 'Current sample size appears underpowered (' + pct + '%) for the observed ' + effectName + ' with n = ' + ctx.n + ' (f² = ' + ctx.f2.toFixed(3) + (mag ? ', ' + mag : '') + ').';
      }
      el.textContent = text;
      el.className = 'pwstd-exec ' + cls;
    }

    function updatePlanningSummary(ctx) {
      var el = document.getElementById('pwstd-planning-summary');
      if (!el || !ctx) return;
      var target = global.StatisticoPowerTemplate && global.StatisticoPowerTemplate.getSelectedTargetPower
        ? global.StatisticoPowerTemplate.getSelectedTargetPower()
        : { pct: '85%', power: 0.85 };
      var reqN = computeRequiredN(ctx, target.power);
      if (!reqN) {
        el.textContent = 'Select a target power to see required sample size.';
        return;
      }
      var gap = ctx.n >= reqN
        ? 'Current N = ' + ctx.n + ' meets or exceeds this target.'
        : 'Current N = ' + ctx.n + ' is below this target by ' + (reqN - ctx.n) + ' observations.';
      el.textContent = 'For ' + target.pct + ' power, approximately ' + reqN + ' observations are required. ' + gap;
    }

    function updateEffectCompare(ctx, detectableEffectVal, targetPower) {
      var obsEl = document.getElementById('pwstd-r2-observed');
      var detEl = document.getElementById('pwstd-r2-detectable');
      var insightEl = document.getElementById('pwstd-r2-insight');
      var interpretEl = document.getElementById('pwstd-det-interpret');
      var block = document.getElementById('pwstd-r2-compare');
      if (obsEl) obsEl.textContent = ctx ? ctx.effect.toFixed(3) : '—';
      if (detEl) detEl.textContent = isFinite(detectableEffectVal) ? detectableEffectVal.toFixed(3) : '—';
      if (block) block.hidden = !ctx || !isFinite(detectableEffectVal);
      var tp = isFinite(targetPower) ? targetPower : 0.80;
      var effectName = cfg.effectName || 'effect';
      if (interpretEl && ctx && isFinite(detectableEffectVal)) {
        interpretEl.textContent = 'With N=' + ctx.n + ', the study can reliably detect (at ' + Math.round(tp * 100) + '% power) ' + effectName + ' values of at least ' + detectableEffectVal.toFixed(3) + '.';
      }
      if (insightEl && ctx && isFinite(detectableEffectVal)) {
        if (ctx.effect > detectableEffectVal + 0.001) {
          insightEl.textContent = 'Observed ' + effectName + ' exceeds the detectable threshold — sufficient power to detect this effect.';
        } else if (Math.abs(ctx.effect - detectableEffectVal) <= 0.001) {
          insightEl.textContent = 'Observed ' + effectName + ' is near the detectable threshold — power is borderline for this effect size.';
        } else {
          insightEl.textContent = 'Observed ' + effectName + ' is below the detectable threshold — this effect may be too small to detect reliably at this sample size.';
        }
      }
    }

    function updateOutputParams(ctx, power) {
      var ids = ['powOutLambda', 'powOutCritF', 'powOutDf1', 'powOutDf2', 'powOutN', 'powOutPower', 'powOutPillaiV'];
      if (!ctx) {
        ids.forEach(function (id) { powSetText(id, '—'); });
        return;
      }
      var critF = null;
      if (typeof jStat !== 'undefined' && jStat.centralF && jStat.centralF.inv) {
        critF = jStat.centralF.inv(1 - ctx.alpha, ctx.df1, ctx.df2);
      }
      powSetText('powOutLambda', isFinite(ctx.n * ctx.f2) ? (ctx.n * ctx.f2).toFixed(3) : '—');
      powSetText('powOutCritF', isFinite(critF) ? critF.toFixed(4) : '—');
      powSetText('powOutDf1', String(ctx.df1));
      powSetText('powOutDf2', String(ctx.df2));
      powSetText('powOutN', String(ctx.n));
      powSetText('powOutPower', isFinite(power) ? (power * 100).toFixed(1) + '%' : '—');
      powSetText('powOutPillaiV', '—');
      var formula = document.getElementById('powDfFormula');
      if (formula && cfg.dfFormula) formula.textContent = cfg.dfFormula;
    }

    function updateStatus(ctx, power, reqMap) {
      var statusEl = document.getElementById('powStatusMessage');
      if (!statusEl || !ctx) return;
      var pct = (power * 100).toFixed(1) + '%';
      var msg;
      var type = 'info';
      if (power >= 0.80) {
        var parts = [];
        ['80', '85', '90', '95'].forEach(function (p) {
          if (reqMap[p] && ctx.n >= reqMap[p]) parts.push(p + '%');
        });
        msg = parts.length === 4
          ? 'Recommendation: current sample size is sufficient for 80%, 85%, 90%, and 95% power at the observed effect.'
          : (parts.length
            ? 'Recommendation: current sample size is sufficient for ' + parts.join(', ') + ' power.'
            : 'Recommendation: increase sample size for standard power targets.');
        type = 'success';
      } else if (power >= 0.70) {
        msg = 'Borderline power (' + pct + ') with n=' + ctx.n + '. For 80% power, plan n≈' + (reqMap['80'] || '—') + '.';
        type = 'warning';
      } else {
        msg = 'Low power (' + pct + ') with n=' + ctx.n + '. For 80% power, plan n≈' + (reqMap['80'] || '—') + '.';
        type = 'error';
      }
      statusEl.textContent = msg;
      statusEl.className = 'pwstd-band';
      if (type === 'success') statusEl.classList.add('pwstd-band--success');
      else if (type === 'warning') statusEl.classList.add('pwstd-band--warning');
      else if (type === 'error') statusEl.classList.add('pwstd-band--error');
    }

    function bindCurveInteraction(svg) {
      if (!svg || svg._pwCurveBound) return;
      svg._pwCurveBound = true;
      var tooltip = document.getElementById('pwstd-curve-tooltip');
      var wrap = svg.closest('.pwstd-curve-interactive');

      function hideHover() {
        if (tooltip) tooltip.hidden = true;
        var hover = svg.querySelector('.pwstd-curve-hover');
        if (hover) hover.setAttribute('opacity', '0');
      }

      function showHover(clientX, clientY) {
        var data = svg._pwCurve;
        if (!data || !tooltip || !wrap) return;
        var rect = svg.getBoundingClientRect();
        if (!rect.width) return;
        var svgX = ((clientX - rect.left) / rect.width) * data.W;
        var clampedX = Math.max(data.pad.l, Math.min(data.pad.l + data.plotW, svgX));
        var n = Math.round(data.minN + ((clampedX - data.pad.l) / data.plotW) * (data.maxN - data.minN));
        var power = interpolatePowerAtN(data.points, n);
        var x = data.pad.l + ((n - data.minN) / (data.maxN - data.minN)) * data.plotW;
        var y = data.pad.t + data.plotH - (power * data.plotH);
        var hover = svg.querySelector('.pwstd-curve-hover');
        if (!hover) {
          hover = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          hover.setAttribute('class', 'pwstd-curve-hover');
          hover.innerHTML = '<line class="pwstd-curve-crosshair-v" stroke="rgba(255,255,255,.35)" stroke-width="1" stroke-dasharray="4 3"/><circle class="pwstd-curve-hover-dot" r="5" fill="#78c8ff" stroke="#fff" stroke-width="1.5"/>';
          svg.appendChild(hover);
        }
        hover.setAttribute('opacity', '1');
        hover.querySelector('.pwstd-curve-crosshair-v').setAttribute('x1', x.toFixed(1));
        hover.querySelector('.pwstd-curve-crosshair-v').setAttribute('x2', x.toFixed(1));
        hover.querySelector('.pwstd-curve-crosshair-v').setAttribute('y1', data.pad.t);
        hover.querySelector('.pwstd-curve-crosshair-v').setAttribute('y2', (data.pad.t + data.plotH).toFixed(1));
        hover.querySelector('.pwstd-curve-hover-dot').setAttribute('cx', x.toFixed(1));
        hover.querySelector('.pwstd-curve-hover-dot').setAttribute('cy', y.toFixed(1));
        tooltip.innerHTML = '<strong>N = ' + n + '</strong>Power = ' + (power * 100).toFixed(1) + '%';
        tooltip.hidden = false;
        var wrapRect = wrap.getBoundingClientRect();
        tooltip.style.left = (clientX - wrapRect.left) + 'px';
        tooltip.style.top = (clientY - wrapRect.top) + 'px';
      }

      svg.addEventListener('mousemove', function (e) { showHover(e.clientX, e.clientY); });
      svg.addEventListener('mouseleave', hideHover);
    }

    function renderCurve(ctx, targetPower, selectedReqN) {
      var svg = document.getElementById('pwstd-power-curve-svg');
      var tooltip = document.getElementById('pwstd-curve-tooltip');
      var note = document.getElementById('pwstd-curve-note');
      if (!svg) return;
      if (!ctx) {
        svg.innerHTML = '';
        svg.classList.remove('pwstd-power-curve--ready');
        if (tooltip) tooltip.hidden = true;
        return;
      }

      var target = targetPower || 0.85;
      var lo = minN(ctx);
      var req95 = computeRequiredN(ctx, 0.95) || ctx.n;
      var maxN = Math.max(ctx.n + 15, req95 + 10, lo + 20);
      var step = Math.max(1, Math.floor((maxN - lo) / 80));
      var points = [];
      for (var n = lo; n <= maxN; n += step) {
        var df2 = df2AtN(ctx, n);
        if (df2 < 1) continue;
        points.push({ n: n, power: powerAtF2(n, ctx.df1, df2, ctx.f2, ctx.alpha) });
      }
      if (!points.length || points[points.length - 1].n !== maxN) {
        var df2Last = df2AtN(ctx, maxN);
        if (df2Last >= 1) points.push({ n: maxN, power: powerAtF2(maxN, ctx.df1, df2Last, ctx.f2, ctx.alpha) });
      }

      var W = 640, H = 260, pad = { l: 56, r: 34, t: 22, b: 46 };
      var plotW = W - pad.l - pad.r;
      var plotH = H - pad.t - pad.b;
      var xScale = function (n) { return pad.l + ((n - lo) / (maxN - lo)) * plotW; };
      var yScale = function (p) { return pad.t + plotH - (p * plotH); };
      var fmtPct = function (p) { return Math.round(p * 100) + '%'; };
      var path = '';
      points.forEach(function (pt, i) {
        path += (i === 0 ? 'M' : 'L') + xScale(pt.n).toFixed(1) + ' ' + yScale(pt.power).toFixed(1) + ' ';
      });

      var curPower = observedPower(ctx);
      var curX = xScale(ctx.n);
      var curY = yScale(curPower);
      var tgtY = yScale(target);
      var reqX = selectedReqN ? xScale(selectedReqN) : null;
      var parts = ['<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="transparent"/>'];
      [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (p) {
        var y = yScale(p);
        parts.push('<line x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (pad.l + plotW) + '" y2="' + y.toFixed(1) + '" stroke="rgba(255,255,255,.08)" stroke-width="1"/>');
        parts.push('<text x="' + (pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" fill="rgba(255,255,255,.55)" font-size="10" font-weight="600">' + fmtPct(p) + '</text>');
      });
      var xStep = powerCurveNiceStep(lo, maxN, 5);
      for (var tickN = Math.ceil(lo / xStep) * xStep; tickN <= maxN; tickN += xStep) {
        var x = xScale(tickN);
        parts.push('<line x1="' + x.toFixed(1) + '" y1="' + pad.t + '" x2="' + x.toFixed(1) + '" y2="' + (pad.t + plotH) + '" stroke="rgba(255,255,255,.06)" stroke-width="1"/>');
        parts.push('<text x="' + x.toFixed(1) + '" y="' + (pad.t + plotH + 16) + '" text-anchor="middle" fill="rgba(255,255,255,.55)" font-size="10" font-weight="600">' + tickN + '</text>');
      }
      parts.push('<line x1="' + pad.l + '" y1="' + (pad.t + plotH) + '" x2="' + (pad.l + plotW) + '" y2="' + (pad.t + plotH) + '" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/>');
      parts.push('<line x1="' + pad.l + '" y1="' + pad.t + '" x2="' + pad.l + '" y2="' + (pad.t + plotH) + '" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/>');
      parts.push('<line x1="' + pad.l + '" y1="' + tgtY.toFixed(1) + '" x2="' + (pad.l + plotW) + '" y2="' + tgtY.toFixed(1) + '" stroke="rgb(255,215,0)" stroke-dasharray="6 4" stroke-width="1.5"/>');
      parts.push('<text x="' + (pad.l + plotW + 2) + '" y="' + (tgtY + 4).toFixed(1) + '" fill="rgb(255,215,0)" font-size="10" font-weight="700">Target ' + fmtPct(target) + '</text>');
      parts.push('<path d="' + path.trim() + '" fill="none" stroke="#78c8ff" stroke-width="2.5"/>');
      parts.push('<line x1="' + curX.toFixed(1) + '" y1="' + pad.t + '" x2="' + curX.toFixed(1) + '" y2="' + (pad.t + plotH) + '" stroke="rgb(255,165,120)" stroke-width="2"/>');
      parts.push('<circle cx="' + curX.toFixed(1) + '" cy="' + curY.toFixed(1) + '" r="5" fill="rgb(255,165,120)" stroke="#fff" stroke-width="1.5"/>');
      parts.push('<text x="' + curX.toFixed(1) + '" y="' + (pad.t - 6) + '" text-anchor="middle" fill="rgb(255,165,120)" font-size="10" font-weight="700">Current N=' + ctx.n + ' (' + fmtPct(curPower) + ')</text>');
      if (reqX) {
        parts.push('<circle cx="' + reqX.toFixed(1) + '" cy="' + tgtY.toFixed(1) + '" r="5" fill="rgb(255,215,0)" stroke="#fff" stroke-width="1.5"/>');
        parts.push('<text x="' + reqX.toFixed(1) + '" y="' + (tgtY - 8).toFixed(1) + '" text-anchor="middle" fill="rgb(255,215,0)" font-size="10" font-weight="700">Required N=' + selectedReqN + '</text>');
      }
      parts.push('<text x="' + (pad.l + plotW / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" fill="rgba(255,255,255,.55)" font-size="11" font-weight="600">Sample size (N)</text>');
      svg.innerHTML = parts.join('');
      svg._pwCurve = { points: points, minN: lo, maxN: maxN, pad: pad, W: W, H: H, plotW: plotW, plotH: plotH };
      svg.classList.add('pwstd-power-curve--ready');
      bindCurveInteraction(svg);
      if (note) note.textContent = 'Exact noncentral F curve at fixed f² and α — hover to read power at any N.';
      if (tooltip) tooltip.hidden = true;
    }

    function calculate(source) {
      var ctx = getContext(source);
      if (!ctx) {
        ['powObserved', 'powEffectSize', 'powSampleSize', 'powPartialEta', 'powRequired', 'pwstd-metric-r2', 'powReq80', 'powReq85', 'powReq90', 'powReq95'].forEach(function (id) { powSetText(id, '—'); });
        updateOutputParams(null);
        updateEffectCompare(null);
        updateExecutiveSummary(null);
        updatePlanningSummary(null);
        renderCurve(null);
        updateStatus(null);
        return;
      }

      updateMetaLabels(ctx);
      var targetInput = document.getElementById('powDetectableTarget');
      var detectTargetPower = targetInput ? (parseFloat(targetInput.value) || 0.80) : 0.80;
      var targetSel = global.StatisticoPowerTemplate && global.StatisticoPowerTemplate.getSelectedTargetPower
        ? global.StatisticoPowerTemplate.getSelectedTargetPower()
        : { pct: '85%', power: 0.85 };
      var power = observedPower(ctx);
      var mag = cohenMagnitude(ctx.f2);
      var reqMap = {
        '80': computeRequiredN(ctx, 0.80),
        '85': computeRequiredN(ctx, 0.85),
        '90': computeRequiredN(ctx, 0.90),
        '95': computeRequiredN(ctx, 0.95)
      };
      var detectable = detectableEffect(ctx, targetSel.power);

      powSetText('powObserved', (power * 100).toFixed(1) + '%');
      powSetText('powEffectSize', ctx.f2.toFixed(3) + (mag ? ' — ' + mag.charAt(0).toUpperCase() + mag.slice(1) : ''));
      powSetText('powSampleSize', String(ctx.n));
      powSetText('powPartialEta', ctx.effect.toFixed(4));
      powSetText('pwstd-metric-r2', ctx.effect.toFixed(3));
      powSetText('powAlpha', ctx.alpha.toFixed(3));
      powSetText('powRequired', reqMap['85'] || '—');
      powSetText('powReq80', reqMap['80'] || '—');
      powSetText('powReq85', reqMap['85'] || '—');
      powSetText('powReq90', reqMap['90'] || '—');
      powSetText('powReq95', reqMap['95'] || '—');

      var customInput = document.getElementById('customPowerInput');
      if (customInput) {
        var customTarget = parseFloat(customInput.value);
        if (isFinite(customTarget) && customTarget >= 0.5 && customTarget <= 0.99) {
          var customReq = computeRequiredN(ctx, customTarget);
          var customEl = document.getElementById('customRequiredN');
          if (customEl) {
            customEl.textContent = customReq || '—';
            customEl.style.color = customReq ? '#7fdb9f' : '#ff6b6b';
          }
        }
      }

      var reqNAtTarget = computeRequiredN(ctx, targetSel.power);

      updateExecutiveSummary(ctx, power);
      updatePlanningSummary(ctx);
      updateStatus(ctx, power, reqMap);

      var minF2 = estimateDetectableF2(ctx.n, ctx.df1, minN(ctx), function (n) { return df2AtN(ctx, n); }, detectTargetPower, ctx.alpha);
      powSetText('powMinDetectableF', minF2.toFixed(4) + (cohenMagnitude(minF2) ? ' (' + cohenMagnitude(minF2) + ')' : ''));
      powSetText('powMinDetectableEta', detectableEffect(ctx, detectTargetPower).toFixed(4));
      updateEffectCompare(ctx, detectable, targetSel.power);
      updateOutputParams(ctx, power);

      try {
        renderCurve(ctx, targetSel.power, reqNAtTarget);
      } catch (curveErr) {
        console.error('[StatisticoPowerAnalysis] renderCurve failed:', curveErr);
      }

      var engineNote = document.getElementById('powEngineNote');
      if (engineNote && cfg.engineNote) {
        engineNote.innerHTML = '<i class="fa-solid fa-calculator"></i> ' + (typeof cfg.engineNote === 'function' ? cfg.engineNote(ctx) : cfg.engineNote);
      }
      if (global.StatisticoPowerTemplate && global.StatisticoPowerTemplate.syncDefaultChip) {
        global.StatisticoPowerTemplate.syncDefaultChip();
      }
    }

    function calculateCustomPower() {
      var customPowerInput = document.getElementById('customPowerInput');
      var customRequiredN = document.getElementById('customRequiredN');
      var targetPower = parseFloat(customPowerInput && customPowerInput.value);
      if (isNaN(targetPower) || targetPower < 0.5 || targetPower > 0.99) {
        if (customRequiredN) {
          customRequiredN.textContent = 'Invalid';
          customRequiredN.style.color = '#ff6b6b';
        }
        return;
      }
      var ctx = getContext();
      if (!ctx) {
        if (customRequiredN) {
          customRequiredN.textContent = 'Error';
          customRequiredN.style.color = '#ff6b6b';
        }
        return;
      }
      var req = computeRequiredN(ctx, targetPower);
      if (!req) {
        if (customRequiredN) {
          customRequiredN.textContent = 'Error';
          customRequiredN.style.color = '#ff6b6b';
        }
        return;
      }
      if (customRequiredN) {
        customRequiredN.textContent = req;
        customRequiredN.style.color = '#7fdb9f';
      }
      if (global.StatisticoPowerTemplate && global.StatisticoPowerTemplate.onCustomComplete) {
        global.StatisticoPowerTemplate.onCustomComplete(req);
      }
      var targetSel = global.StatisticoPowerTemplate && global.StatisticoPowerTemplate.getSelectedTargetPower
        ? global.StatisticoPowerTemplate.getSelectedTargetPower()
        : { pct: Math.round(targetPower * 100) + '%', power: targetPower };
      if (targetSel.power === targetPower) {
        try {
          renderCurve(ctx, targetPower, req);
        } catch (curveErr) {
          console.error('[StatisticoPowerAnalysis] renderCurve failed:', curveErr);
        }
      }
    }

    function calculateDetectableEffect() {
      var ctx = getContext();
      var targetInput = document.getElementById('powDetectableTarget');
      var targetPower = targetInput ? (parseFloat(targetInput.value) || 0.80) : 0.80;
      if (isNaN(targetPower) || targetPower < 0.5 || targetPower > 0.99) {
        powSetText('powMinDetectableF', 'Invalid');
        powSetText('powMinDetectableEta', '—');
        return;
      }
      if (!ctx) {
        powSetText('powMinDetectableF', '—');
        powSetText('powMinDetectableEta', '—');
        return;
      }
      var detN = document.getElementById('pwstd-det-n');
      if (detN) detN.textContent = String(ctx.n);
      var minF2 = estimateDetectableF2(ctx.n, ctx.df1, minN(ctx), function (n) { return df2AtN(ctx, n); }, targetPower, ctx.alpha);
      var minEffect = detectableEffect(ctx, targetPower);
      powSetText('powMinDetectableF', minF2.toFixed(4) + (cohenMagnitude(minF2) ? ' (' + cohenMagnitude(minF2) + ')' : ''));
      powSetText('powMinDetectableEta', minEffect.toFixed(4));
      updateEffectCompare(ctx, minEffect, targetPower);
    }

    function mount(mountOpts) {
      mountOpts = mountOpts || {};
      if (!global.StatisticoPowerTemplate || typeof global.StatisticoPowerTemplate.renderById !== 'function') return engine;
      var mountId = mountOpts.mountId || 'sharedPowerTemplateMount';
      global.StatisticoPowerTemplate.renderById(mountId, {
        title: mountOpts.title || 'Power & Sample Size',
        layout: 'analysis',
        variant: mountOpts.variant || cfg.variant || 'regression',
        customHandler: mountOpts.customHandler || 'window.StatisticoPowerTemplate.runCustomCompute()',
        detectableHandler: mountOpts.detectableHandler || 'StatisticoPowerAnalysis._computeDetectable()'
      });
      global.StatisticoPowerAnalysis._activeEngine = engine;
      global.StatisticoPowerTemplate._computeDetectable = calculateDetectableEffect;
      global.StatisticoPowerTemplate._customComputeFn = calculateCustomPower;
      global.StatisticoPowerTemplate._recalcFn = function () { calculate(mountOpts.getSource ? mountOpts.getSource() : undefined); };
      global.StatisticoPowerTemplate._updatePlanningSummaryFn = function () {
        var ctx = getContext();
        updatePlanningSummary(ctx);
        if (!ctx) return;
        var target = global.StatisticoPowerTemplate.getSelectedTargetPower();
        renderCurve(ctx, target.power, computeRequiredN(ctx, target.power));
      };
      var detTarget = document.getElementById('powDetectableTarget');
      if (detTarget && !detTarget.dataset.powBound) {
        detTarget.dataset.powBound = '1';
        detTarget.addEventListener('input', function () { calculate(mountOpts.getSource ? mountOpts.getSource() : undefined); });
        detTarget.addEventListener('change', function () { calculate(mountOpts.getSource ? mountOpts.getSource() : undefined); });
      }
      calculate(mountOpts.getSource ? mountOpts.getSource() : undefined);
      return engine;
    }

    var engine = {
      calculate: calculate,
      calculateCustomPower: calculateCustomPower,
      calculateDetectableEffect: calculateDetectableEffect,
      mount: mount,
      getContext: getContext
    };
    return engine;
  }

  function regressionContext(results) {
    var res = results || global.regressionResults;
    if (!res) return null;
    var n = parseInt(res.n, 10);
    var withIntercept = res.includeIntercept !== false;
    var p = withIntercept ? Math.max(0, (res.k || 1) - 1) : (res.k || 0);
    var r2 = parseFloat(res.R2 != null ? res.R2 : res.rSquared);
    var alpha = 0.05;
    if (!n || n < 3 || !p || p < 1 || !isFinite(r2) || r2 < 0) return null;
    var f2 = f2FromEffect(r2);
    var df1 = p;
    var df2 = withIntercept ? (n - p - 1) : (n - p);
    if (df2 < 1) return null;
    return { n: n, p: p, f2: f2, effect: r2, alpha: alpha, df1: df1, df2: df2, df2Offset: withIntercept ? p + 1 : p, withIntercept: withIntercept };
  }

  function anovaOneWayContext(bundle) {
    var b = bundle || global._bundle;
    if (!b || !b.oneWay) return null;
    var ow = b.oneWay;
    var n = parseInt(ow.N, 10);
    var k = parseInt(ow.k, 10);
    var eta = parseFloat(ow.etaSq);
    var alpha = (b.spec && isFinite(b.spec.alpha)) ? b.spec.alpha : 0.05;
    if (!n || !k || k < 2 || !isFinite(eta) || eta < 0) return null;
    var f2 = isFinite(ow.cohenF) ? ow.cohenF * ow.cohenF : f2FromEffect(eta);
    var df1 = k - 1;
    var df2 = n - k;
    if (df2 < 1) return null;
    return { n: n, k: k, f2: f2, effect: eta, alpha: alpha, df1: df1, df2: df2, df2Offset: k };
  }

  global.StatisticoPowerAnalysis = {
    create: createEngine,
    mountRegression: function (opts) {
      return createEngine({
        variant: 'regression',
        effectName: 'R²',
        emptyMessage: 'Run a regression model to populate power results.',
        dfFormula: 'df1=p · df2=N−p−1',
        labels: {
          design: 'Linear regression',
          target: 'Global model R²',
          effectSource: 'Observed R²',
          effectMetric: 'Observed R²',
          planningEffect: 'R² used',
          detectableObserved: 'Observed R²',
          detectableThreshold: 'Detectable R²'
        },
        getContext: function (source) { return regressionContext(source); },
        minN: function (ctx) { return Math.max(ctx.df1 + (ctx.withIntercept ? 3 : 2), 8); },
        df2AtN: function (ctx, n) { return ctx.withIntercept ? (n - ctx.p - 1) : (n - ctx.p); },
        engineNote: function (ctx) {
          return 'Exact noncentral F (G*Power fixed regression): λ=N·f², f²=R²/(1−R²), df1=' + ctx.p + ', df2=N−' + ctx.p + (ctx.withIntercept ? '−1' : '') + ' — computed in browser via jStat.';
        }
      }).mount(Object.assign({ getSource: function () { return global.regressionResults; } }, opts || {}));
    },
    mountAnova: function (opts) {
      return createEngine({
        variant: 'anova',
        effectName: 'η²',
        emptyMessage: 'Run a one-way ANOVA to populate power results.',
        dfFormula: 'df1=k−1 · df2=N−k',
        labels: {
          design: 'One-way ANOVA',
          target: 'Omnibus F test',
          effectSource: 'Observed η²',
          effectMetric: 'Observed η²',
          planningEffect: 'η² used',
          detectableObserved: 'Observed η²',
          detectableThreshold: 'Detectable η²'
        },
        getContext: function (source) { return anovaOneWayContext(source); },
        minN: function (ctx) { return Math.max(ctx.k + 1, 8); },
        df2AtN: function (ctx, n) { return n - ctx.k; },
        engineNote: function (ctx) {
          return 'Exact noncentral F (Cohen one-way ANOVA): λ=N·f², f²=η²/(1−η²), df1=' + (ctx.k - 1) + ', df2=N−' + ctx.k + ' — computed in browser via jStat.';
        }
      }).mount(Object.assign({ getSource: function () { return global._bundle; } }, opts || {}));
    },
    _customCompute: function () {
      if (global.StatisticoPowerTemplate && typeof global.StatisticoPowerTemplate.runCustomCompute === 'function') {
        global.StatisticoPowerTemplate.runCustomCompute();
        return;
      }
      if (global.StatisticoPowerAnalysis._activeEngine) global.StatisticoPowerAnalysis._activeEngine.calculateCustomPower();
    },
    _computeDetectable: function () {
      if (global.StatisticoPowerAnalysis._activeEngine) global.StatisticoPowerAnalysis._activeEngine.calculateDetectableEffect();
    },
    _activeEngine: null,
    VERSION: '20260705h'
  };
})(window);
