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

  function cohenFMagnitude(f) {
    if (!isFinite(f) || f <= 0) return '';
    if (f < 0.10) return 'small';
    if (f < 0.25) return 'medium';
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

    function resolveLabelsForCtx(ctx) {
      var labels = cfg.labels || {};
      if (typeof cfg.resolveLabels === 'function') {
        labels = Object.assign({}, labels, cfg.resolveLabels(ctx) || {});
      }
      return labels;
    }

    function updateMetaLabels(ctx) {
      var labels = resolveLabelsForCtx(ctx);
      if (labels.design) powSetText('powDesignType', labels.design);
      if (labels.target) powSetText('powTargetWhat', labels.target);
      if (labels.effectSource) powSetText('powEffectSource', labels.effectSource);
      if (cfg.variant === 'mixed') return;
      var metric = document.getElementById('pwstd-metric-effect-label');
      if (metric && labels.effectMetric) metric.textContent = labels.effectMetric;
      var partial = document.getElementById('pwstd-planning-effect-label');
      if (partial && labels.planningEffect) partial.textContent = labels.planningEffect;
      var detItems = document.querySelectorAll('#pwstd-card-detectable .pwstd-detectable-item span');
      if (detItems.length >= 2) {
        if (labels.detectableObserved) detItems[0].textContent = labels.detectableObserved;
        if (labels.detectableThreshold) detItems[1].textContent = labels.detectableThreshold;
      }
      var fMetric = document.getElementById('pwstd-metric-f-label');
      if (fMetric && labels.effectSizeMetric) fMetric.textContent = labels.effectSizeMetric;
      if (labels.minDetectableF) {
        var minFEl = document.getElementById('powMinDetectableF');
        if (minFEl) {
          var minFRow = minFEl.closest('.pwstd-row');
          if (minFRow) {
            var minFLbl = minFRow.querySelector('.pwstd-label');
            if (minFLbl) minFLbl.textContent = labels.minDetectableF;
          }
        }
      }
      if (labels.gpowerField) {
        var gpowEl = document.getElementById('powOutPillaiV');
        if (gpowEl) {
          var gpowRow = gpowEl.closest('.pwstd-row');
          if (gpowRow) {
            var gpowLbl = gpowRow.querySelector('.pwstd-label');
            if (gpowLbl) gpowLbl.textContent = labels.gpowerField;
            gpowRow.style.display = '';
          }
        }
      }
    }

    function formatEffectSize(ctx) {
      if (cfg.variant === 'anova') {
        var f = isFinite(ctx.cohenF) ? ctx.cohenF : (ctx.f2 > 0 ? Math.sqrt(ctx.f2) : NaN);
        if (isFinite(f)) {
          var fMag = cohenFMagnitude(f);
          return f.toFixed(3) + (fMag ? ' — ' + fMag.charAt(0).toUpperCase() + fMag.slice(1) : '');
        }
      }
      var mag = cohenMagnitude(ctx.f2);
      return ctx.f2.toFixed(3) + (mag ? ' — ' + mag.charAt(0).toUpperCase() + mag.slice(1) : '');
    }

    function updateExecutiveSummary(ctx, power) {
      var el = document.getElementById('pwstd-exec-summary');
      if (!el) return;
      if (typeof cfg.formatExecutiveSummary === 'function') {
        var custom = cfg.formatExecutiveSummary(ctx, power);
        if (custom) {
          el.textContent = custom.text || '';
          el.className = 'pwstd-exec ' + (custom.className || 'pwstd-exec--neutral');
          return;
        }
      }
      if (!ctx) {
        el.textContent = cfg.emptyMessage || 'Run analysis to populate power results.';
        el.className = 'pwstd-exec pwstd-exec--neutral';
        return;
      }
      var pct = (power * 100).toFixed(1);
      var mag = cohenMagnitude(ctx.f2);
      var effectName = ctx.effectName || cfg.effectName || 'effect';
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
      if (typeof cfg.formatPlanningSummary === 'function') {
        el.textContent = cfg.formatPlanningSummary(ctx) || 'Select a target power to see required sample size.';
        return;
      }
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
      var effectName = (ctx && ctx.effectName) || cfg.effectName || 'effect';
      if (interpretEl && ctx && isFinite(detectableEffectVal)) {
        interpretEl.textContent = 'With total N=' + ctx.n + ', the study can reliably detect (at ' + Math.round(tp * 100) + '% power) ' + effectName + ' values of at least ' + detectableEffectVal.toFixed(3) + '.';
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
      if (cfg.variant === 'anova' && isFinite(ctx.cohenF)) {
        powSetText('powOutPillaiV', ctx.cohenF.toFixed(4));
      } else {
        powSetText('powOutPillaiV', '—');
      }
      var formula = document.getElementById('powDfFormula');
      if (formula && cfg.dfFormula) formula.textContent = cfg.dfFormula;
    }

    function updateStatus(ctx, power, reqMap) {
      var statusEl = document.getElementById('powStatusMessage');
      if (!statusEl || !ctx) return;
      if (typeof cfg.formatStatus === 'function') {
        var customStatus = cfg.formatStatus(ctx, power, reqMap);
        if (customStatus) {
          statusEl.textContent = customStatus.text || '';
          statusEl.className = 'pwstd-band';
          if (customStatus.type === 'success') statusEl.classList.add('pwstd-band--success');
          else if (customStatus.type === 'warning') statusEl.classList.add('pwstd-band--warning');
          else if (customStatus.type === 'error') statusEl.classList.add('pwstd-band--error');
        }
        return;
      }
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

    function clientToSvgPoint(svg, clientX, clientY) {
      var pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      var ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return pt.matrixTransform(ctm.inverse());
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
        var pt = clientToSvgPoint(svg, clientX, clientY);
        if (!pt) {
          hideHover();
          return;
        }
        var plotL = data.pad.l;
        var plotR = data.pad.l + data.plotW;
        var plotT = data.pad.t;
        var plotB = data.pad.t + data.plotH;
        if (pt.x < plotL || pt.x > plotR || pt.y < plotT || pt.y > plotB) {
          hideHover();
          return;
        }
        var n = Math.round(data.minN + ((pt.x - plotL) / data.plotW) * (data.maxN - data.minN));
        var power = interpolatePowerAtN(data.points, n);
        var x = plotL + ((n - data.minN) / (data.maxN - data.minN)) * data.plotW;
        var y = plotT + data.plotH - (power * data.plotH);
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
        hover.querySelector('.pwstd-curve-crosshair-v').setAttribute('y1', plotT);
        hover.querySelector('.pwstd-curve-crosshair-v').setAttribute('y2', plotB.toFixed(1));
        hover.querySelector('.pwstd-curve-hover-dot').setAttribute('cx', x.toFixed(1));
        hover.querySelector('.pwstd-curve-hover-dot').setAttribute('cy', y.toFixed(1));
        tooltip.innerHTML = '<strong>' + (cfg.curveXAxisLabel || 'N') + ' = ' + n + '</strong>Power = ' + (power * 100).toFixed(1) + '%'
          + (typeof cfg.formatCurveTooltip === 'function' ? cfg.formatCurveTooltip(data.ctx, n, power) : '');
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
      parts.push('<text x="' + curX.toFixed(1) + '" y="' + (pad.t - 6) + '" text-anchor="middle" fill="rgb(255,165,120)" font-size="10" font-weight="700">Current ' + (cfg.curveCurrentLabel || 'N') + '=' + ctx.n + ' (' + fmtPct(curPower) + ')</text>');
      if (reqX) {
        parts.push('<circle cx="' + reqX.toFixed(1) + '" cy="' + tgtY.toFixed(1) + '" r="5" fill="rgb(255,215,0)" stroke="#fff" stroke-width="1.5"/>');
        parts.push('<text x="' + reqX.toFixed(1) + '" y="' + (tgtY - 8).toFixed(1) + '" text-anchor="middle" fill="rgb(255,215,0)" font-size="10" font-weight="700">Required ' + (cfg.curveCurrentLabel || 'N') + '=' + selectedReqN + '</text>');
      }
      parts.push('<text x="' + (pad.l + plotW / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" fill="rgba(255,255,255,.55)" font-size="11" font-weight="600">' + (cfg.curveXAxisLabel || 'Sample size (N)') + '</text>');
      svg.innerHTML = parts.join('');
      svg._pwCurve = { points: points, minN: lo, maxN: maxN, pad: pad, W: W, H: H, plotW: plotW, plotH: plotH, ctx: ctx };
      svg.classList.add('pwstd-power-curve--ready');
      bindCurveInteraction(svg);
      if (note) {
        note.textContent = typeof cfg.formatCurveNote === 'function'
          ? cfg.formatCurveNote(ctx)
          : (cfg.curveNote || 'Exact noncentral F curve at fixed f² and α — hover to read power at any N.');
      }
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
      var mag = cfg.variant === 'anova' ? cohenFMagnitude(ctx.cohenF) : cohenMagnitude(ctx.f2);
      var reqMap = {
        '80': computeRequiredN(ctx, 0.80),
        '85': computeRequiredN(ctx, 0.85),
        '90': computeRequiredN(ctx, 0.90),
        '95': computeRequiredN(ctx, 0.95)
      };
      var detectable = detectableEffect(ctx, targetSel.power);

      powSetText('powObserved', (power * 100).toFixed(1) + '%');
      powSetText('powEffectSize', formatEffectSize(ctx));
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
      var minFDisplay = cfg.variant === 'anova' ? Math.sqrt(minF2) : minF2;
      var minMag = cfg.variant === 'anova' ? cohenFMagnitude(minFDisplay) : cohenMagnitude(minF2);
      powSetText('powMinDetectableF', minFDisplay.toFixed(4) + (minMag ? ' (' + minMag + ')' : ''));
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
      if (typeof cfg.onCalculate === 'function') {
        cfg.onCalculate(ctx, power, reqMap);
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
      if (cfg.variant === 'mixed') {
        updateMixedChipSubs(ctx, null);
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
      var minFDisplay = cfg.variant === 'anova' ? Math.sqrt(minF2) : minF2;
      var minMag = cfg.variant === 'anova' ? cohenFMagnitude(minFDisplay) : cohenMagnitude(minF2);
      var minEffect = detectableEffect(ctx, targetPower);
      powSetText('powMinDetectableF', minFDisplay.toFixed(4) + (minMag ? ' (' + minMag + ')' : ''));
      powSetText('powMinDetectableEta', minEffect.toFixed(4));
      updateEffectCompare(ctx, minEffect, targetPower);
    }

    function mount(mountOpts) {
      mountOpts = mountOpts || {};
      if (!global.StatisticoPowerTemplate || typeof global.StatisticoPowerTemplate.renderById !== 'function') return engine;
      var mountId = mountOpts.mountId || 'sharedPowerTemplateMount';
      var labels = cfg.labels || {};
      global.StatisticoPowerTemplate.renderById(mountId, {
        title: mountOpts.title || 'Power & Sample Size',
        layout: 'analysis',
        variant: mountOpts.variant || cfg.variant || 'regression',
        effectMetric: labels.effectMetric,
        effectSizeMetric: labels.effectSizeMetric,
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
    var cohenF = isFinite(ow.cohenF) ? ow.cohenF : (f2 > 0 ? Math.sqrt(f2) : NaN);
    var df1 = k - 1;
    var df2 = n - k;
    if (df2 < 1) return null;
    return { n: n, k: k, f2: f2, cohenF: cohenF, effect: eta, alpha: alpha, df1: df1, df2: df2, df2Offset: k };
  }

  function readIndependentFramework(setup) {
    if (typeof document !== 'undefined') {
      var fwSel = document.getElementById('fwFrameworkSelect');
      if (fwSel && (fwSel.value === 'parametric' || fwSel.value === 'nonparametric')) {
        return fwSel.value;
      }
      var npRadio = document.getElementById('fwNonparametric');
      if (npRadio && npRadio.checked) return 'nonparametric';
      var pRadio = document.getElementById('fwParametric');
      if (pRadio && pRadio.checked) return 'parametric';
    }
    if (global._independentPrimaryFramework === 'parametric' || global._independentPrimaryFramework === 'nonparametric') {
      return global._independentPrimaryFramework;
    }
    var fromSetup = setup && setup.primaryFramework;
    return fromSetup === 'nonparametric' ? 'nonparametric' : 'parametric';
  }

  function independentMeansContext(bundle) {
    var b = bundle || global._independentBundle || global.lastIndependentBundle;
    if (!b) return null;
    var ob = (b.results && b.results.omnibus) || {};
    var res = b.results || {};
    var setup = b.setup || {};
    var explore = b.explore || {};
    var fx = b.effects || {};
    var framework = readIndependentFramework(setup);
    global._independentPrimaryFramework = framework;
    var isNP = framework === 'nonparametric';
    var compareMode = setup.compareMode || 'two-vars';

    var n = parseInt(ob.N, 10);
    if (!n && explore.kplusSummary) {
      n = parseInt(explore.kplusSummary.totalN, 10);
    }
    if (!n && Array.isArray(ob.levels)) {
      n = ob.levels.reduce(function (sum, lvl) {
        return sum + (parseInt(lvl.n, 10) || 0);
      }, 0);
    }
    if (!n) {
      var n1tot = parseInt(explore.n1, 10);
      var n2tot = parseInt(explore.n2, 10);
      if (n1tot > 0 && n2tot > 0) n = n1tot + n2tot;
    }

    var k = parseInt(ob.k, 10);
    if (!k && Array.isArray(ob.levels)) k = ob.levels.length;
    if (!k && Array.isArray(setup.selectedColumns)) k = setup.selectedColumns.length;
    if ((!k || k < 2) && compareMode !== 'k-plus') {
      var exN1 = parseInt(explore.n1, 10);
      var exN2 = parseInt(explore.n2, 10);
      if (exN1 > 0 && exN2 > 0) k = 2;
    }

    var alpha = 0.05;
    if (setup.confidence != null && isFinite(parseFloat(setup.confidence))) {
      alpha = 1 - parseFloat(setup.confidence);
    }
    if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) alpha = 0.05;
    if (typeof document !== 'undefined') {
      var alphaEl = document.getElementById('setAlpha');
      if (alphaEl && isFinite(parseFloat(alphaEl.value))) {
        var liveAlpha = parseFloat(alphaEl.value);
        if (liveAlpha > 0 && liveAlpha < 1) alpha = liveAlpha;
      }
    }

    var eta = parseFloat(fx.eta2 != null ? fx.eta2 : (fx.etaSquared != null ? fx.etaSquared : ob.etaSquared));
    var epsilon = parseFloat(fx.epsilon2 != null ? fx.epsilon2 : (fx.epsilonSquared != null ? fx.epsilonSquared : ob.epsilonSquared));
    var isTwoGroup = k === 2;
    var cohenF = NaN;
    var effect = NaN;

    if (isNP) {
      if (!isFinite(epsilon) || epsilon < 0) {
        var kwH = parseFloat(ob.kwH);
        if (isFinite(kwH) && n > k) {
          epsilon = Math.max(0, (kwH - k + 1) / (n - k));
        }
      }
      if ((!isFinite(epsilon) || epsilon < 0) && isTwoGroup) {
        var u = parseFloat(res.u);
        var n1 = parseInt(explore.n1, 10);
        var n2 = parseInt(explore.n2, 10);
        if (isFinite(u) && n1 > 0 && n2 > 0 && (n1 + n2) > 2) {
          var mu = n1 * n2 / 2;
          var sigmaU = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
          if (sigmaU > 0) {
            var H2 = Math.pow((u - mu) / sigmaU, 2);
            epsilon = Math.max(0, (H2 - 1) / (n1 + n2 - 2));
          }
        }
      }
      effect = isFinite(epsilon) && epsilon >= 0 ? epsilon : NaN;
      if (isFinite(effect) && effect > 0 && effect < 1) {
        cohenF = Math.sqrt(effect / Math.max(1e-12, 1 - effect));
      }
    } else {
      cohenF = parseFloat(ob.cohenF);
      if (!isFinite(cohenF) || cohenF <= 0) {
        if (isFinite(eta) && eta >= 0 && eta < 1) cohenF = Math.sqrt(eta / Math.max(1e-12, 1 - eta));
        else {
          var fStat = parseFloat(ob.anovaF != null ? ob.anovaF : (ob.anova && ob.anova.F));
          var df1obs = parseFloat(ob.anovaDf1 != null ? ob.anovaDf1 : (ob.anova && ob.anova.df1));
          if (isFinite(fStat) && n > 0 && isFinite(df1obs) && df1obs > 0) {
            cohenF = Math.sqrt(Math.max(0, fStat * df1obs / n));
          }
        }
      }
      if ((!isFinite(cohenF) || cohenF <= 0) && isTwoGroup) {
        var hedgesD = parseFloat(fx.hedgesG);
        if (isFinite(hedgesD) && hedgesD !== 0) {
          cohenF = Math.abs(hedgesD) / 2;
        } else {
          var tStat = parseFloat(res.welchT != null ? res.welchT : res.studentT);
          if (isFinite(tStat) && n > 0) cohenF = Math.abs(tStat) / Math.sqrt(n);
        }
      }
      effect = isFinite(eta) && eta >= 0 ? eta : NaN;
      if ((!isFinite(effect) || effect < 0) && isFinite(cohenF) && cohenF > 0) {
        effect = f2FromEffect(cohenF * cohenF);
      }
    }

    if (!n || !k || k < 2 || !isFinite(cohenF) || cohenF <= 0) return null;

    var f2 = cohenF * cohenF;
    if (!isFinite(effect) || effect < 0) effect = f2FromEffect(f2);
    var df1 = k - 1;
    var df2 = n - k;
    if (df2 < 1) return null;

    var testLabel = isNP
      ? (isTwoGroup ? 'Mann-Whitney U' : 'Kruskal-Wallis')
      : (isTwoGroup ? 'Welch / Student t' : 'One-way ANOVA');

    return {
      n: n,
      k: k,
      f2: f2,
      cohenF: cohenF,
      effect: effect,
      alpha: alpha,
      df1: df1,
      df2: df2,
      df2Offset: k,
      isNonparametric: isNP,
      isTwoGroup: isTwoGroup,
      effectName: isNP ? 'ε²' : 'η²',
      testLabel: testLabel
    };
  }

  function independentPowerLabels(ctx) {
    if (!ctx) return {};
    if (ctx.isNonparametric) {
      return {
        design: 'Independent Means · Nonparametric',
        target: ctx.isTwoGroup ? 'Mann-Whitney rank comparison' : 'Kruskal-Wallis omnibus',
        effectSource: 'Observed ε²',
        effectMetric: 'Observed ε²',
        effectSizeMetric: "Cohen's f (approx.)",
        planningEffect: 'ε² used for planning',
        detectableObserved: 'Observed ε²',
        detectableThreshold: 'Detectable ε²',
        minDetectableF: "Min detectable Cohen's f",
        gpowerField: "Cohen's f (G*Power)"
      };
    }
    return {
      design: 'Independent Means · Parametric',
      target: ctx.isTwoGroup ? 'Two-group mean difference' : 'One-way ANOVA omnibus',
      effectSource: 'Observed η²',
      effectMetric: 'Observed η²',
      effectSizeMetric: "Cohen's f",
      planningEffect: 'η² used for planning',
      detectableObserved: 'Observed η²',
      detectableThreshold: 'Detectable η²',
      minDetectableF: "Min detectable Cohen's f",
      gpowerField: "Cohen's f (G*Power)"
    };
  }

  function independentExecutiveSummary(ctx, power) {
    if (!ctx) return null;
    var pct = (power * 100).toFixed(1);
    var effectName = ctx.effectName || 'effect';
    var cls = 'pwstd-exec--neutral';
    var text;
    var testPart = ctx.testLabel ? (' for the ' + ctx.testLabel + ' test') : '';
    var nPart = 'total N = ' + ctx.n + ' (all ' + ctx.k + ' groups combined)';
    if (power >= 0.80) {
      cls = 'pwstd-exec--success';
      text = 'Current sample size is adequate' + testPart + '. Achieved power is ' + pct + '% with ' + nPart
        + ', α = ' + ctx.alpha.toFixed(3) + ', and observed ' + effectName + ' = ' + ctx.effect.toFixed(3) + '.';
    } else if (power >= 0.70) {
      cls = 'pwstd-exec--warning';
      text = 'Power is borderline (' + pct + '%)' + testPart + ' for observed ' + effectName + ' = ' + ctx.effect.toFixed(3)
        + ' with ' + nPart + '. Consider increasing sample size.';
    } else {
      var f = isFinite(ctx.cohenF) ? ctx.cohenF : Math.sqrt(ctx.f2);
      text = 'Current sample size appears underpowered (' + pct + '%)' + testPart + ' with ' + nPart
        + ' (' + effectName + ' = ' + ctx.effect.toFixed(3) + ", Cohen's f = " + f.toFixed(3) + ').';
    }
    if (ctx.isNonparametric) {
      text += ' Rank-based planning uses a Cohen\'s f approximation mapped from ε².';
    }
    return { text: text, className: cls };
  }

  function independentPlanningSummary(ctx) {
    var target = global.StatisticoPowerTemplate && global.StatisticoPowerTemplate.getSelectedTargetPower
      ? global.StatisticoPowerTemplate.getSelectedTargetPower()
      : { pct: '85%', power: 0.85 };
    var reqN = estimateRequiredN(ctx.f2, ctx.df1, Math.max(ctx.k + 1, 8), function (n) { return n - ctx.k; }, target.power, ctx.alpha);
    if (!reqN) return 'Select a target power to see required sample size.';
    var gap = ctx.n >= reqN
      ? 'Current total N = ' + ctx.n + ' meets or exceeds this target.'
      : 'Current total N = ' + ctx.n + ' is below this target by ' + (reqN - ctx.n) + ' observations.';
    var effectName = ctx.isNonparametric ? 'ε²' : 'η²';
    return 'For ' + target.pct + ' power (' + (ctx.testLabel || 'omnibus test') + ', ' + effectName + ' = '
      + ctx.effect.toFixed(3) + '), approximately ' + reqN + ' total observations (summed across all ' + ctx.k
      + ' groups) are required. ' + gap;
  }

  function independentEngineNote(ctx) {
    var f = isFinite(ctx.cohenF) ? ctx.cohenF : Math.sqrt(ctx.f2);
    if (ctx.isNonparametric) {
      return 'Approximate planning power for ' + (ctx.testLabel || 'rank test')
        + ': maps observed ε² to Cohen\'s f = ' + f.toFixed(3)
        + ' and uses noncentral F with df1 = ' + (ctx.k - 1) + ', df2 = N−' + ctx.k
        + ' (Kruskal-Wallis df structure). Treat as planning guidance, not exact rank-test power.';
    }
    return 'Exact noncentral F (G*Power one-way ANOVA / independent groups): Cohen\'s f = ' + f.toFixed(3)
      + ', k = ' + ctx.k + ' groups, λ = N·f² = ' + (ctx.n * ctx.f2).toFixed(3)
      + ', df1 = ' + (ctx.k - 1) + ', df2 = N−' + ctx.k + '.';
  }

  function independentCurveNote(ctx) {
    if (ctx.isNonparametric) {
      return 'Approximate power curve at fixed ε²-derived Cohen\'s f and α — hover to read planning power at any N (rank-test approximation).';
    }
    return 'Exact noncentral F curve at fixed Cohen\'s f and α — hover to read power at any sample size.';
  }

  function mixedDesignLabel(ctx) {
    if (!ctx) return '—';
    if (ctx.hasRepeatedMeasures && ctx.hasGroups) return 'Longitudinal / clustered';
    if (ctx.hasRepeatedMeasures) return 'Repeated measures';
    if (ctx.hasGroups) return 'Clustered';
    return 'Cross-sectional';
  }

  function formatMixedIcc(ctx) {
    if (!ctx || ctx.iccEstimated === false || !isFinite(ctx.icc)) return 'Not estimated';
    if (ctx.icc < 0.005) return '≈0';
    return ctx.icc.toFixed(2);
  }

  function mixedRandomStructure(ctx) {
    if (!ctx) return '—';
    if (ctx.hasRandomSlope) return 'Random intercept + slope';
    return 'Random intercept';
  }

  function formatMixedEffectF2(ctx) {
    if (!ctx) return '—';
    var mag = cohenMagnitude(ctx.f2);
    return ctx.f2.toFixed(2) + (mag ? ' — ' + mag.charAt(0).toUpperCase() + mag.slice(1) : '');
  }

  function updateMixedChipSubs(ctx, reqMap) {
    if (!ctx || !reqMap) return;
    ['80', '85', '90', '95'].forEach(function (p) {
      var req = reqMap[p];
      var sub = document.getElementById('powReq' + p + 'Sub');
      if (!sub) return;
      if (req && isFinite(ctx.measurementsPerSubject)) {
        sub.textContent = '≈' + Math.round(req * ctx.measurementsPerSubject) + ' obs';
        sub.title = 'Approximate total observations (subjects × measurements per subject)';
      } else {
        sub.textContent = '';
      }
    });
    var customReqEl = document.getElementById('customRequiredN');
    var customSub = document.getElementById('customRequiredNSub');
    if (customSub && customReqEl) {
      var customReq = parseInt(customReqEl.textContent, 10);
      if (customReq > 0 && isFinite(ctx.measurementsPerSubject)) {
        customSub.textContent = '≈' + Math.round(customReq * ctx.measurementsPerSubject) + ' obs';
        customSub.title = 'Approximate total observations (subjects × measurements per subject)';
      } else {
        customSub.textContent = '';
      }
    }
  }

  function updateMixedDesignAssumptions(ctx) {
    if (!ctx) {
      ['powDesignMeas', 'powDesignICC', 'powDesignRandom'].forEach(function (id) { powSetText(id, '—'); });
      powSetText('powDesignDropout', '0%');
      return;
    }
    powSetText('powDesignMeas', isFinite(ctx.measurementsPerSubject)
      ? ctx.measurementsPerSubject.toFixed(1).replace(/\.0$/, '')
      : 'Not estimated');
    powSetText('powDesignICC', formatMixedIcc(ctx));
    powSetText('powDesignDropout', '0%');
    powSetText('powDesignRandom', mixedRandomStructure(ctx));
  }

  function mixedContext(results) {
    var d = results || global._mixedResults || global.mixedResults;
    if (!d) return null;

    var typeIII = (d.typeIII || []).filter(function (r) {
      var src = String(r.source || r.effect || r.term || r.parameter || '').trim();
      return src && !/^intercept$/i.test(src);
    });
    if (!typeIII.length) return null;

    var target = typeIII.slice().sort(function (a, b) {
      var pa = parseFloat(a.pval != null ? a.pval : a.p);
      var pb = parseFloat(b.pval != null ? b.pval : b.p);
      if (!isFinite(pa)) return 1;
      if (!isFinite(pb)) return -1;
      return pa - pb;
    })[0];

    var df1 = parseFloat(target.numDF != null ? target.numDF : target.df1);
    var df2 = parseFloat(target.denDF != null ? target.denDF : target.df2);
    var F = parseFloat(target.F != null ? target.F : target.f);
    var alpha = (d.alpha != null && isFinite(d.alpha)) ? parseFloat(d.alpha) : 0.05;
    var observations = parseInt(d.n != null ? d.n : d.N, 10);
    var groups = parseInt(d.nGroups != null ? d.nGroups : d.numGroups, 10);
    var subjects = parseInt(d.nSubjects != null ? d.nSubjects : d.totalSubjects, 10);
    if (!subjects && groups > 0) subjects = groups;
    if (!subjects && observations > 0) subjects = observations;

    var measPerSub = (subjects > 0 && observations > 0) ? observations / subjects : NaN;
    if (!df1 || df1 < 1 || !df2 || df2 < 1 || !F || F <= 0 || !subjects || subjects < 2) return null;

    var etaP = (F * df1) / (F * df1 + df2);
    if (!isFinite(etaP) || etaP < 0) etaP = 0;
    if (etaP >= 1) etaP = 0.999;
    var f2 = f2FromEffect(etaP);
    var iccRaw = d.ICC != null ? d.ICC : d.icc;
    var iccEstimated = iccRaw !== undefined && iccRaw !== null && iccRaw !== '';
    var icc = iccEstimated ? parseFloat(iccRaw) : NaN;

    var vc = d.varianceComponents || d.randomEffects || [];
    var hasRandomSlope = vc.some(function (r) {
      var p = String(r.parameter || r.name || '').toLowerCase();
      return p.indexOf('slope') >= 0 || (p.indexOf('var') >= 0 && p.indexOf('intercept') < 0 && p.indexOf('residual') < 0 && vc.length > 2);
    });

    return {
      n: subjects,
      subjects: subjects,
      observations: observations,
      measurementsPerSubject: measPerSub,
      groups: groups,
      subjectsPerGroup: (groups > 0 && subjects > 0) ? subjects / groups : NaN,
      f2: f2,
      cohenF: f2 > 0 ? Math.sqrt(f2) : NaN,
      effect: etaP,
      alpha: alpha,
      df1: df1,
      df2: df2,
      df2Base: df2,
      df2Subjects: subjects,
      targetEffectName: String(target.source || target.effect || target.term || 'Fixed effect'),
      icc: icc,
      iccEstimated: iccEstimated,
      F: F,
      hasRepeatedMeasures: isFinite(measPerSub) && measPerSub > 1.05,
      hasGroups: groups >= 2,
      hasRandomSlope: hasRandomSlope,
      converged: d.converged !== false,
      method: 'approximate'
    };
  }

  function mixedExecutiveSummary(ctx, power) {
    var pct = (power * 100).toFixed(1);
    var measRounded = isFinite(ctx.measurementsPerSubject) ? Math.round(ctx.measurementsPerSubject) : null;
    var measTxt = measRounded
      ? 'approximately ' + measRounded + ' repeated measurements per subject'
      : 'the current repeated-measures structure';
    var cls = 'pwstd-exec--neutral';
    var lead;
    if (power >= 0.80 && ctx.converged !== false) {
      cls = 'pwstd-exec--success';
      lead = 'The current design is adequately powered.';
    } else if (power >= 0.70) {
      cls = 'pwstd-exec--warning';
      lead = 'The current design is borderline for conventional power targets.';
    } else {
      cls = 'pwstd-exec--error';
      lead = 'The current design appears underpowered for the observed effect.';
    }
    var text = lead + ' Based on ' + ctx.subjects + ' subjects and ' + measTxt
      + ', the estimated power to detect ' + ctx.targetEffectName + ' is ' + pct + '%'
      + (power >= 0.80 ? ', exceeding the conventional 80% target.' : (power >= 0.70 ? ', slightly below the 80% target.' : ', below the conventional 80% target.'));
    if (ctx.subjects < 30) {
      text += ' Small number of subjects may produce unstable mixed-model estimates.';
    }
    return { text: text, className: cls };
  }

  function mixedPlanningSummary(ctx) {
    var target = global.StatisticoPowerTemplate && global.StatisticoPowerTemplate.getSelectedTargetPower
      ? global.StatisticoPowerTemplate.getSelectedTargetPower()
      : { pct: '85%', power: 0.85 };
    var req = estimateRequiredN(ctx.f2, ctx.df1, Math.max(ctx.df1 + 2, 8), function (n) {
      return ctx.df2Base > 0 && ctx.df2Subjects > 0 ? Math.max(1, ctx.df2Base * (n / ctx.df2Subjects)) : ctx.df2;
    }, target.power, ctx.alpha);
    if (!req) return 'Select a target power to see required subjects.';
    var meas = isFinite(ctx.measurementsPerSubject) ? ctx.measurementsPerSubject.toFixed(1).replace(/\.0$/, '') : '—';
    var iccPart = formatMixedIcc(ctx);
    iccPart = iccPart === 'Not estimated' ? '' : ' and ICC = ' + iccPart;
    var obsPart = isFinite(ctx.measurementsPerSubject) ? ' (' + Math.round(req * ctx.measurementsPerSubject) + ' total observations)' : '';
    var gap = ctx.subjects >= req
      ? ' Current design meets this target.'
      : ' Current design is short by ' + (req - ctx.subjects) + ' subjects.';
    return 'For ' + target.pct + ' power, approximately ' + req + ' subjects are required'
      + (meas !== '—' ? ', assuming ' + meas + ' repeated measurements per subject' : '')
      + iccPart + obsPart + '.' + gap;
  }

  function mixedStatus(ctx, power, reqMap) {
    var lines = [];
    if (power >= 0.80) {
      lines.push('Recommendation: current design is adequate for 80% power at the observed effect.');
    } else if (power >= 0.70) {
      lines.push('Recommendation: current design is borderline for 80% power; plan ~' + (reqMap['80'] || '—') + ' subjects.');
    } else {
      lines.push('Recommendation: current design appears underpowered; plan ~' + (reqMap['80'] || '—') + ' subjects for 80% power.');
    }
    if (isFinite(ctx.icc) && ctx.icc >= 0.15 && ctx.hasRepeatedMeasures) {
      lines.push('Adding more subjects is likely more effective than adding repeated measurements when ICC is high.');
    } else if (ctx.hasRepeatedMeasures) {
      lines.push('Additional repeated measurements may improve precision, but increasing subjects still improves generalizability.');
    }
    if (ctx.hasRandomSlope && ctx.subjects < 40) {
      lines.push('Random-slope models require more subjects for stable estimation.');
    }
    if (ctx.subjects < 30) {
      lines.push('Model estimates may be unstable; use simulation before final planning.');
    }
    var type = power >= 0.80 ? 'success' : (power >= 0.70 ? 'warning' : 'error');
    return { text: lines.join(' '), type: type };
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
          effectSizeMetric: "Cohen's f",
          planningEffect: 'η² used',
          detectableObserved: 'Observed η²',
          detectableThreshold: 'Detectable η²',
          minDetectableF: "Min detectable Cohen's f",
          gpowerField: "Cohen's f (G*Power)"
        },
        getContext: function (source) { return anovaOneWayContext(source); },
        minN: function (ctx) { return Math.max(ctx.k + 1, 8); },
        df2AtN: function (ctx, n) { return n - ctx.k; },
        engineNote: function (ctx) {
          var f = isFinite(ctx.cohenF) ? ctx.cohenF : Math.sqrt(ctx.f2);
          return 'Exact noncentral F (G*Power one-way ANOVA): enter Cohen\'s f = ' + f.toFixed(3) + ' in G*Power (not f²). '
            + 'λ = N·f² = ' + (ctx.n * ctx.f2).toFixed(3) + ', f² = η²/(1−η²) = ' + ctx.f2.toFixed(3)
            + ', df1 = ' + (ctx.k - 1) + ', df2 = N−' + ctx.k + '.';
        }
      }).mount(Object.assign({ getSource: function () { return global._bundle; } }, opts || {}));
    },
    mountIndependent: function (opts) {
      return createEngine({
        variant: 'anova',
        effectName: 'η²',
        emptyMessage: 'Run an independent-means analysis to populate power results.',
        dfFormula: 'df1=k−1 · df2=N−k',
        curveXAxisLabel: 'Total sample size (N)',
        labels: {
          design: 'Independent Means',
          target: 'Omnibus group test',
          effectSource: 'Observed η²',
          effectMetric: 'Observed η²',
          effectSizeMetric: "Cohen's f",
          planningEffect: 'η² used',
          detectableObserved: 'Observed η²',
          detectableThreshold: 'Detectable η²',
          minDetectableF: "Min detectable Cohen's f",
          gpowerField: "Cohen's f (G*Power)"
        },
        resolveLabels: independentPowerLabels,
        formatExecutiveSummary: independentExecutiveSummary,
        formatPlanningSummary: independentPlanningSummary,
        formatCurveNote: independentCurveNote,
        getContext: function (source) { return independentMeansContext(source); },
        minN: function (ctx) { return Math.max(ctx.k + 1, 8); },
        df2AtN: function (ctx, n) { return n - ctx.k; },
        onCalculate: function (ctx) {
          var shell = document.getElementById('pwstd-shell');
          if (shell) shell.classList.toggle('pwstd-shell--nonparametric', !!(ctx && ctx.isNonparametric));
          var techNote = document.getElementById('pwstd-tech-note');
          if (techNote && ctx) {
            techNote.textContent = ctx.isNonparametric
              ? 'Planning power maps observed ε² to Cohen\'s f and uses Kruskal-Wallis df (k−1, N−k). This is an approximation for rank-based omnibus tests — use for sample-size guidance, not exact rank-test calibration.'
              : 'Power uses the exact noncentral F distribution for the one-way ANOVA omnibus test with independent groups (Welch/Student two-group tests share the same df structure when k = 2).';
          }
          var dfFormula = document.getElementById('powDfFormula');
          if (dfFormula && ctx) {
            dfFormula.textContent = ctx.isNonparametric
              ? 'df1=k−1 · df2=N−k (KW structure)'
              : 'df1=k−1 · df2=N−k';
          }
        },
        engineNote: independentEngineNote
      }).mount(Object.assign({
        getSource: function () { return global._independentBundle || global.lastIndependentBundle; },
        title: 'Power & Sample Size',
        variant: 'anova',
        emptySummary: 'Run an independent-means analysis to populate power results.'
      }, opts || {}));
    },
    mountMixed: function (opts) {
      return createEngine({
        variant: 'mixed',
        effectName: 'partial η²',
        emptyMessage: 'Run a mixed model to populate power results.',
        dfFormula: 'df1 from Type III · df2 scaled with subjects',
        curveXAxisLabel: 'Number of subjects',
        curveCurrentLabel: 'subjects',
        curveNote: 'Approximate noncentral F curve at fixed f² and α — hover to read power at any subject count.',
        labels: {
          design: 'Linear Mixed Model',
          target: 'Primary fixed effect',
          effectSource: 'Observed estimate',
          effectMetric: 'Partial η²',
          planningEffect: 'Partial η² used',
          detectableObserved: 'Observed partial η²',
          detectableThreshold: 'Minimum detectable partial η²',
          effectSizeMetric: "Cohen's f²",
          minDetectableF: 'Min detectable f²'
        },
        getContext: function (source) { return mixedContext(source); },
        minN: function (ctx) { return Math.max(ctx.df1 + 2, 8); },
        df2AtN: function (ctx, n) {
          if (ctx.df2Base > 0 && ctx.df2Subjects > 0) {
            return Math.max(1, ctx.df2Base * (n / ctx.df2Subjects));
          }
          return ctx.df2;
        },
        formatExecutiveSummary: mixedExecutiveSummary,
        formatPlanningSummary: mixedPlanningSummary,
        formatStatus: mixedStatus,
        formatCurveTooltip: function (ctx, n, power) {
          var obs = isFinite(ctx.measurementsPerSubject) ? Math.round(n * ctx.measurementsPerSubject) : '—';
          var icc = formatMixedIcc(ctx);
          var meas = isFinite(ctx.measurementsPerSubject) ? ctx.measurementsPerSubject.toFixed(1).replace(/\.0$/, '') : '—';
          return '<br>Observations = ' + obs
            + '<br>Meas./subject = ' + meas
            + '<br>Assumed ICC = ' + icc;
        },
        onCalculate: function (ctx, power, reqMap) {
          if (!ctx) {
            ['powMetricSubjects', 'powMetricObservations', 'powMetricICC', 'powMetricMeasPerSub', 'powDesignPattern'].forEach(function (id) {
              powSetText(id, '—');
            });
            updateMixedDesignAssumptions(null);
            updateMixedChipSubs(null, null);
            return;
          }
          powSetText('powMetricSubjects', String(ctx.subjects));
          powSetText('pwstd-metric-r2', ctx.effect.toFixed(3));
          powSetText('powEffectSize', formatMixedEffectF2(ctx));
          powSetText('powMetricObservations', ctx.observations ? String(ctx.observations) : 'Not estimated');
          powSetText('powMetricICC', formatMixedIcc(ctx));
          powSetText('powMetricMeasPerSub', isFinite(ctx.measurementsPerSubject)
            ? ctx.measurementsPerSubject.toFixed(1).replace(/\.0$/, '')
            : 'Not estimated');
          powSetText('powDesignPattern', mixedDesignLabel(ctx));
          updateMixedDesignAssumptions(ctx);
          updateMixedChipSubs(ctx, reqMap);
          var targetEl = document.getElementById('powTargetWhat');
          if (targetEl) targetEl.textContent = ctx.targetEffectName;
          var insightEl = document.getElementById('pwstd-r2-insight');
          if (insightEl && ctx) {
            var detEl = document.getElementById('pwstd-r2-detectable');
            var det = detEl ? parseFloat(detEl.textContent) : NaN;
            if (isFinite(det)) {
              if (ctx.effect > det + 0.001) {
                insightEl.textContent = 'Observed partial η² (f² = ' + ctx.f2.toFixed(2) + ') exceeds the minimum detectable threshold — the current design is above the planning threshold.';
              } else if (Math.abs(ctx.effect - det) <= 0.001) {
                insightEl.textContent = 'Observed effect is near the minimum detectable threshold — power is borderline for this effect size.';
              } else {
                insightEl.textContent = 'Minimum detectable partial η² at current design: ' + det.toFixed(3) + '. Observed partial η² = ' + ctx.effect.toFixed(3) + '.';
              }
            }
          }
        },
        engineNote: function (ctx) {
          return 'Approximate method: noncentral F using Type III F=' + ctx.F.toFixed(2)
            + ', df1=' + ctx.df1 + ', df2≈' + ctx.df2.toFixed(1)
            + ', partial η²=' + ctx.effect.toFixed(3) + ', f²=' + ctx.f2.toFixed(3)
            + '. Subject count is the primary planning unit.';
        }
      }).mount(Object.assign({
        getSource: function () { return global._mixedResults || global.mixedResults; },
        title: 'Power & Sample Size',
        variant: 'mixed',
        emptySummary: 'Run a mixed model to populate power results.'
      }, opts || {}));
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
    VERSION: '20260707a'
  };
})(window);
