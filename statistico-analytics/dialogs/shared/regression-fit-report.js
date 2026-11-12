/**
 * Regression Results markup bound to one active fit.
 * Process Settings Explorer renders this for Process Results.
 * Regression Results uses the contribution chart so both screens
 * show the same R² and the same drop in percentage points.
 */
(function (root, factory) {
  var Contrib = root && root.StatisticoRegressionContribution;
  if (!Contrib && typeof require === 'function') Contrib = require('./regression-contribution.js');
  var api = factory(Contrib);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StatisticoRegressionFitReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Contrib) {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function finite(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatStat(value) {
    var n = finite(value);
    if (!Number.isFinite(n)) return '—';
    var abs = Math.abs(n);
    if (n !== 0 && abs < 0.01) return Contrib.fixed(n, 4);
    if (abs < 1) return Contrib.fixed(n, 4);
    return Contrib.fixed(n, 2);
  }

  function formatP(p) {
    var n = finite(p);
    if (!Number.isFinite(n)) return '—';
    if (n < 0.0001) return '&lt; 0.0001';
    return esc(Contrib.fixed(n, 4));
  }

  function sigStars(p) {
    var n = finite(p);
    if (!Number.isFinite(n)) return '';
    if (n < 0.001) return ' ***';
    if (n < 0.01) return ' **';
    if (n < 0.05) return ' *';
    return '';
  }

  function r2Text(fraction) {
    var reported = Contrib.reportedDrop(fraction, 0);
    return reported ? reported.fullText : '—';
  }

  function fReady(model) {
    return !!(model && Number(model.k) > 1 && Number.isFinite(finite(model.f)) && Number.isFinite(finite(model.fp)));
  }

  function strength(r2) {
    if (r2 >= 0.6) return 'strong';
    if (r2 >= 0.3) return 'moderate';
    return 'weak';
  }

  function sampleTag(n) {
    if (n < 30) return { cls: 'rfr-tag-warn', icon: 'fa-triangle-exclamation', label: 'Small Sample' };
    if (n < 100) return { cls: 'rfr-tag-mid', icon: 'fa-users', label: 'Medium Sample' };
    return { cls: 'rfr-tag-ok', icon: 'fa-users', label: 'Large Sample' };
  }

  function conclusion(model) {
    var n = model && model.n != null ? model.n : '—';
    if (!fReady(model)) {
      return '<section class="rfr-conclusion">' +
        '<div class="rfr-kicker"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i> Model Conclusion</div>' +
        '<p class="rfr-verdict">No predictors are in the model, so there is no overall F-test.</p>' +
        '<p class="rfr-detail">The fitted value is the mean of the outcome, based on <strong>' + esc(n) + '</strong> observations.</p>' +
        '</section>';
    }
    var sig = finite(model.fp);
    var r2 = finite(model.r2);
    var isSig = sig < 0.05;
    var pText = sig < 0.0001 ? '&lt; 0.0001' : esc(Contrib.fixed(sig, 4));
    var badge = isSig
      ? '<span class="rfr-badge rfr-badge-sig">Significant</span>'
      : '<span class="rfr-badge rfr-badge-ns">Not significant</span>';
    var lead = isSig ? 'The model is statistically significant' : 'The model is not statistically significant';
    var word = strength(r2);
    var fitTag = word === 'strong'
      ? { cls: 'rfr-tag-ok', icon: 'fa-arrow-trend-up', label: 'Strong Fit' }
      : (word === 'moderate'
        ? { cls: 'rfr-tag-mid', icon: 'fa-chart-simple', label: 'Moderate Fit' }
        : { cls: 'rfr-tag-warn', icon: 'fa-arrow-trend-down', label: 'Weak Fit' });
    var sigTag = isSig
      ? { cls: 'rfr-tag-ok', icon: 'fa-check', label: 'Significant' }
      : { cls: 'rfr-tag-warn', icon: 'fa-xmark', label: 'Not Significant' };
    var tags = [fitTag, sigTag, sampleTag(Number(model.n))];
    return '<section class="rfr-conclusion">' +
      '<div class="rfr-kicker"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i> Model Conclusion</div>' +
      '<p class="rfr-verdict">' + lead + ' (p = ' + pText + ') ' + badge + '</p>' +
      '<p class="rfr-detail">Explains <strong>' + esc(r2Text(r2)) + '</strong> of the variance — <strong>' + word + '</strong> explanatory power. Based on <strong>' + esc(n) + '</strong> observations.</p>' +
      '<div class="rfr-tags">' + tags.map(function (tag) {
        return '<span class="rfr-tag ' + tag.cls + '"><i class="fa-solid ' + tag.icon + '" aria-hidden="true"></i>' + esc(tag.label) + '</span>';
      }).join('') + '</div></section>';
  }

  function kpis(model) {
    var ready = fReady(model);
    var fText = ready ? formatStat(model.f) : '—';
    var pText = ready ? formatP(model.fp) : '—';
    var fTitle = ready
      ? ('Overall F-test. F = ' + fText + ', p = ' + (finite(model.fp) < 0.0001 ? '< 0.0001' : Contrib.fixed(finite(model.fp), 4)) + '.')
      : 'The overall F-test needs at least one predictor.';
    return '<div class="rfr-kpis">' +
      kpi('n', model && model.n != null ? String(model.n) : '—', 'Analyzed rows in this fit.') +
      kpi('R²', r2Text(model && model.r2), 'Ordinary R² of the active fit, as a percentage.') +
      kpi('Adj R²', r2Text(model && model.adjR2), 'R² adjusted for the number of fitted parameters.') +
      kpi('F-test p', pText, fTitle, ready ? ('F = ' + fText) : '') +
      '</div>';
  }

  function kpi(label, value, title, sub) {
    return '<div class="rfr-kpi" title="' + esc(title) + '"><span>' + esc(label) + '</span><b>' + value + '</b>' +
      (sub ? ('<small>' + sub + '</small>') : '') + '</div>';
  }

  function axisMax(points) {
    var max = 0;
    points.forEach(function (value) { if (value > max) max = value; });
    if (!(max > 0)) return 1;
    var padded = max * 1.08;
    var step = padded <= 10 ? 2 : (padded <= 25 ? 5 : (padded <= 60 ? 10 : (padded <= 100 ? 20 : 25)));
    return Math.max(step, Math.ceil(padded / step) * step);
  }

  function contributionChart(contributions, order) {
    var names = (order && order.length) ? order.slice() : Object.keys(contributions || {});
    var rows = names.map(function (name) {
      return { name: name, item: (contributions || {})[name] || null };
    }).filter(function (row) { return row.item; });
    if (!rows.length) {
      return '<section class="rfr-panel"><h3>Predictor Contribution</h3><p class="rfr-note">This fit has no predictor contribution to report.</p></section>';
    }
    rows.sort(function (a, b) {
      var ap = a.item.ok ? Contrib.chartDrop(a.item.fullR2, a.item.reducedR2).points : -1;
      var bp = b.item.ok ? Contrib.chartDrop(b.item.fullR2, b.item.reducedR2).points : -1;
      return bp - ap;
    });
    var fullText = '—';
    rows.some(function (row) {
      if (!row.item.ok) return false;
      fullText = Contrib.chartDrop(row.item.fullR2, row.item.reducedR2).fullText;
      return true;
    });
    var points = rows.map(function (row) {
      if (!row.item.ok) return 0;
      return Math.max(0, Contrib.chartDrop(row.item.fullR2, row.item.reducedR2).points);
    });
    var max = axisMax(points);
    var ticks = [0, 0.25, 0.5, 0.75, 1].map(function (share) {
      return Contrib.fixed(max * share, max >= 10 ? 0 : 2);
    });
    var body = rows.map(function (row) {
      var item = row.item;
      if (!item.ok) {
        return '<div class="rfr-bar-row"><span class="rfr-bar-name">' + esc(row.name) + '</span>' +
          '<span class="rfr-bar-track"></span><span class="rfr-bar-val">—</span></div>';
      }
      var reported = Contrib.chartDrop(item.fullR2, item.reducedR2);
      var width = Math.max(0, Math.min(100, (reported.points / max) * 100));
      var tip = 'Drop in ordinary R² when ' + row.name + ' is removed, in percentage points. Full-model R² ' +
        reported.fullText + '. Reduced-model R² ' + reported.reducedText + '. n = ' + item.n + '.';
      return '<div class="rfr-bar-row" data-contribution="' + esc(row.name + ' ' + reported.pointsText) + '" title="' + esc(tip) + '">' +
        '<span class="rfr-bar-name">' + esc(row.name) + '</span>' +
        '<span class="rfr-bar-track"><span class="rfr-bar" style="width:' + width.toFixed(2) + '%"></span></span>' +
        '<span class="rfr-bar-val">' + esc(Contrib.fixed(reported.points, 2)) + '</span></div>';
    }).join('');
    return '<section class="rfr-panel rfr-contrib">' +
      '<div class="rfr-contrib-head"><h3>Predictor Contribution</h3><span>Full-model R² = ' + esc(fullText) + '</span></div>' +
      '<p class="rfr-axis-label">Drop in R² (percentage points)</p>' +
      body +
      '<div class="rfr-axis" aria-hidden="true">' + ticks.map(function (tick) {
        return '<span>' + esc(tick) + '</span>';
      }).join('') + '</div>' +
      '<p class="rfr-note">pp = percentage points. Correlated predictors can each have a small contribution because they explain some of the same variation.</p>' +
      '</section>';
  }

  function coefficients(model) {
    var level = model && model.fitConfidence ? Math.round(Number(model.fitConfidence) * 100) : 95;
    var rows = ((model && model.coefficients) || []).map(function (row) {
      var p = finite(row.p);
      var pClass = !Number.isFinite(p) ? '' : (p < 0.05 ? ' rfr-p-sig' : ' rfr-p-ns');
      return '<tr><td>' + esc(row.name) + '</td>' +
        '<td class="num">' + esc(formatStat(row.estimate)) + esc(sigStars(row.p)) + '</td>' +
        '<td class="num">' + esc(formatStat(row.se)) + '</td>' +
        '<td class="num">' + (Number.isFinite(finite(row.t)) ? esc(Contrib.fixed(finite(row.t), 2)) : '—') + '</td>' +
        '<td class="num' + pClass + '">' + formatP(row.p) + '</td>' +
        '<td class="num">' + esc(formatStat(row.ciLow)) + '</td>' +
        '<td class="num">' + esc(formatStat(row.ciHigh)) + '</td></tr>';
    }).join('');
    return '<section class="rfr-panel"><h3>Coefficients</h3>' +
      '<div class="rfr-table-wrap"><table class="rfr-table"><thead><tr>' +
      '<th>Variable</th><th>Estimate</th><th>Std. error</th><th>t</th><th>P-value</th>' +
      '<th>' + level + '% CI lower</th><th>' + level + '% CI upper</th>' +
      '</tr></thead><tbody>' + (rows || '<tr><td colspan="7">No coefficients are available for this fit.</td></tr>') +
      '</tbody></table></div>' +
      '<p class="rfr-note">*** p &lt; 0.001 &nbsp; ** p &lt; 0.01 &nbsp; * p &lt; 0.05. Intervals use the confidence level stored with this fit.</p></section>';
  }

  function equation(view) {
    var model = view.model || {};
    var response = (view.config && view.config.response) || 'Response';
    var terms = model.coefficients || [];
    if (!terms.length) return '<section class="rfr-panel"><h3>Fitted equation</h3><p>The fitted equation is unavailable.</p></section>';
    var html = '<span class="rfr-y">' + esc(response) + '</span> = ';
    var started = false;
    terms.forEach(function (row) {
      var coef = finite(row.estimate);
      if (!Number.isFinite(coef)) return;
      var name = row.name || 'Term';
      if (!started && name === 'Intercept') {
        html += '<span class="rfr-coef">' + esc(Contrib.fixed(coef, 4)) + '</span>';
        started = true;
        return;
      }
      var sign = coef < 0 ? ' − ' : ' + ';
      html += (started ? sign : (coef < 0 ? '−' : '')) +
        '<span class="rfr-coef">' + esc(Contrib.fixed(Math.abs(coef), 4)) + '</span> × <span class="rfr-var">' + esc(name) + '</span>';
      started = true;
    });
    html += ' + ε';
    return '<section class="rfr-panel rfr-equation"><h3>Fitted equation</h3><p class="rfr-eq">' + html + '</p></section>';
  }

  function settingLine(view, name) {
    var source = view.pin ? view.pin.settings : view.currentDraft;
    var value = source ? source[name] : null;
    var unit = view.config.units && view.config.units[name] ? (' ' + view.config.units[name]) : '';
    if (value == null || value === '') return name;
    return name + ': ' + value + unit;
  }

  function specLine(spec, unit) {
    var suffix = unit ? (' ' + unit) : '';
    var parts = [];
    if (spec && spec.lsl != null) parts.push('LSL ' + spec.lsl + suffix);
    if (spec && spec.target != null) parts.push('Target ' + spec.target + suffix);
    if (spec && spec.usl != null) parts.push('USL ' + spec.usl + suffix);
    return parts.length ? parts.join(' · ') : 'No specification limits or target.';
  }

  function contextStrip(view) {
    var config = view.config || { numeric: [], categorical: [], roles: {}, units: {} };
    var adjustable = [];
    var fixed = [];
    (config.numeric || []).concat(config.categorical || []).forEach(function (name) {
      var text = settingLine(view, name);
      if (config.roles && config.roles[name] === 'fixed') fixed.push(text);
      else adjustable.push(text);
    });
    var unit = config.responseScale && config.responseScale.unit;
    return '<div class="rfr-context">' +
      '<section><h3>' + (view.pin ? 'Current recipe' : 'Starting settings') + '</h3><p>' + esc(adjustable.join(' · ') || 'None') + '</p>' +
      (fixed.length ? ('<p class="rfr-note">Fixed conditions: ' + esc(fixed.join(' · ')) + '</p>') : '') +
      '</section>' +
      '<section><h3>Specifications</h3><p>' + esc(specLine(view.spec, unit)) + '</p>' +
      '<p class="rfr-note">Specification changes stay on this fit. Edit them from the profiler.</p></section>' +
      '<div class="rfr-context-action"><button type="button" class="ps-btn primary" id="open-profiler">Open Prediction Profiler</button></div>' +
      '</div>';
  }

  function predictorOrder(view) {
    var config = view.config || {};
    return (config.numeric || []).concat(config.categorical || []);
  }

  function processOverview(view) {
    var model = view.model || {};
    return '<div class="rfr">' +
      contextStrip(view) +
      conclusion(model) +
      kpis(model) +
      contributionChart(model.contributions || {}, predictorOrder(view)) +
      coefficients(model) +
      equation(view) +
      '</div>';
  }

  function field(label, value) {
    return '<div class="rfr-field"><span>' + esc(label) + '</span><b>' + value + '</b></div>';
  }

  function processTechnical(view) {
    var model = view.model || {};
    var config = view.config || {};
    var unit = config.responseScale && config.responseScale.unit ? (' ' + config.responseScale.unit) : '';
    var roles = (config.numeric || []).concat(config.categorical || []).map(function (name) {
      var role = config.roles && config.roles[name] === 'fixed' ? 'fixed' : 'adjustable';
      return esc(name) + ' (' + role + ')';
    }).join(' · ') || 'None';
    var terms = (model.coefficients || []).filter(function (row) { return row.name !== 'Intercept'; }).map(function (row) {
      return esc(row.name);
    }).join(' · ') || 'None';
    var interactions = (config.interactions || []).map(function (ix) {
      return esc(ix.var1 + ' × ' + ix.var2);
    }).join(' · ') || 'This fit has no interaction terms.';
    var refs = (model.references || []).map(function (ref) {
      return esc(ref.name) + ' reference level ' + esc(ref.reference) + ' (levels ' + esc((ref.levels || []).join(', ')) + ')';
    }).join('. ') || 'This model has no categorical factor.';
    var analyzed = model.n == null ? null : Number(model.n);
    var sourceRows = view.table && typeof view.table.nRows === 'number' ? view.table.nRows : null;
    var excluded = sourceRows != null && analyzed != null && sourceRows >= analyzed ? sourceRows - analyzed : null;
    var dfModel = Math.max(0, Number(model.k || 0) - 1);
    var dfResidual = Number(model.df);
    var dfTotal = analyzed == null ? null : analyzed - 1;
    var ready = fReady(model);
    var msModel = dfModel > 0 ? finite(model.ssModel) / dfModel : NaN;
    var msResidual = dfResidual > 0 ? finite(model.ssResidual) / dfResidual : NaN;
    function cell(value) { return '<td class="num">' + esc(formatStat(value)) + '</td>'; }
    function plain(value) { return '<td class="num">' + esc(value == null || value === '' ? '—' : value) + '</td>'; }
    var anova = '<tr><td>Model</td>' + plain(dfModel) + cell(model.ssModel) + cell(msModel) +
      plain(ready ? formatStat(model.f) : '—') + '<td class="num">' + (ready ? formatP(model.fp) : '—') + '</td></tr>' +
      '<tr><td>Residual</td>' + plain(Number.isFinite(dfResidual) ? dfResidual : '—') + cell(model.ssResidual) + cell(msResidual) +
      plain('—') + plain('—') + '</tr>' +
      '<tr><td>Total</td>' + plain(dfTotal == null ? '—' : dfTotal) + cell(model.ssTotal) + plain('—') + plain('—') + plain('—') + '</tr>';
    var sd = Number.isFinite(finite(model.rmse)) ? (Contrib.fixed(finite(model.rmse), 2) + unit) : '—';
    return '<div class="rfr">' +
      '<section class="rfr-panel"><h3>Model specification</h3>' +
      '<div class="rfr-fields">' +
      field('Response', esc(config.response || 'Response')) +
      field('Intercept', config.includeIntercept === false ? 'No' : 'Yes') +
      field('Predictor roles', roles) +
      field('Fitted terms', terms) +
      field('Interactions', interactions) +
      field('Reference levels', refs) +
      '</div></section>' +
      '<section class="rfr-panel"><h3>Sample accounting</h3><div class="rfr-fields">' +
      field('Source rows', sourceRows == null ? '—' : esc(String(sourceRows))) +
      field('Analyzed rows', analyzed == null ? '—' : esc(String(analyzed))) +
      field('Excluded rows', excluded == null ? '—' : esc(String(excluded))) +
      field('Numeric predictors', esc(String((config.numeric || []).length))) +
      field('Categorical predictors', esc(String((config.categorical || []).length))) +
      field('Model degrees of freedom', esc(String(dfModel))) +
      field('Residual degrees of freedom', Number.isFinite(dfResidual) ? esc(String(dfResidual)) : '—') +
      '</div></section>' +
      '<section class="rfr-panel"><h3>ANOVA</h3><div class="rfr-table-wrap"><table class="rfr-table"><thead><tr>' +
      '<th>Source</th><th>DF</th><th>Sum of squares</th><th>Mean square</th><th>F</th><th>P-value</th>' +
      '</tr></thead><tbody>' + anova + '</tbody></table></div></section>' +
      '<section class="rfr-panel"><h3>Residual standard deviation</h3>' +
      '<p class="rfr-sd">' + esc(sd) + '</p>' +
      '<p class="rfr-note">The prediction profiler uses this residual standard deviation for the spread of its projected output curve.</p></section>' +
      '<div class="rfr-links">' +
      '<button type="button" class="ps-btn" id="open-effects">Effects &amp; Interactions</button>' +
      '<button type="button" class="ps-btn" id="open-diagnostics">Diagnostics</button>' +
      '</div></div>';
  }

  return {
    contributionChart: contributionChart,
    processOverview: processOverview,
    processTechnical: processTechnical,
    r2Text: r2Text,
    formatStat: formatStat
  };
});
