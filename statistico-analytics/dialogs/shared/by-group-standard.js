/**
 * Cross-module By-Group Analysis contract.
 * Sidebar copy, page introduction, consistency statuses, and safeguard wording
 * stay identical across modules; only the module-specific sentence changes.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoByGroup = api;
  root.openByGroupMethod = api.openMethod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SIDEBAR_SECTION = 'GROUP COMPARISON';
  var SIDEBAR_LABEL = 'By Group';
  var SIDEBAR_DESCRIPTION = 'Compare results across categories, segments, or conditions to reveal differences, consistency, and patterns hidden by the overall analysis.';
  var SIDEBAR_ICON = 'fa-layer-group';

  var PAGE_TITLE = 'By-Group Analysis';
  var PAGE_SUBTITLE = 'Examine whether the overall finding remains consistent across categories, segments, or conditions.';

  var WHY_TITLE = 'Why this matters';
  var WHY_BODY = 'Pooled results can conceal important subgroup differences—or even relationships that change direction. By-group analysis shows where the overall conclusion holds, weakens, or changes.';

  var GROUP_BY_LABEL = 'Group by';
  var GROUP_BY_HELP = 'Select a categorical variable that defines the groups to compare.';

  var SAFEGUARD_DESCRIPTIVE = 'Group differences shown here are descriptive. Apparent differences do not by themselves establish a statistically significant group effect.';

  var MODULE_SENTENCE = {
    univariate: 'Compare centres, spread and distributions across groups.',
    correlations: 'Compare correlation strength and direction across groups.',
    regression: 'Compare coefficients, model fit and diagnostics across groups.',
    independent: 'Compare effects and test results across group levels.',
    'compare-means': 'Compare effects and test results across group levels.',
    contingency: 'Compare association strength and pattern across groups.',
    reliability: 'Compare reliability and item performance across groups.',
    factor: 'Examine whether the factor pattern remains similar across groups.',
    logistic: 'Compare discrimination, calibration and classification across groups.',
    segmentation: 'Examine how cluster membership and profiles differ by group.'
  };

  var NEXT_ANALYSIS = {
    univariate: 'If you need a formal test of group differences, use Compare Means or ANOVA.',
    correlations: 'Inspect pairs that reverse direction, or test a predictor-by-group interaction in regression.',
    regression: 'Test a predictor-by-group interaction before concluding that coefficients differ.',
    independent: 'Use a formal interaction or stratified comparison before treating group differences as confirmed.',
    contingency: 'A homogeneity-of-association or three-way analysis is needed before concluding that groups differ.',
    reliability: 'Review item performance in the weakest group before pooling the scale.',
    factor: 'Consider multi-group confirmatory analysis before concluding that the factor pattern differs.',
    logistic: 'Test a predictor-by-group interaction before treating classification differences as confirmed.',
    segmentation: 'Compare cluster profiles within each group before treating composition differences as confirmed.'
  };

  var STATUSES = {
    consistent: {
      id: 'consistent',
      label: 'Consistent',
      hint: 'similar direction and magnitude'
    },
    varies: {
      id: 'varies',
      label: 'Varies by group',
      hint: 'meaningful magnitude differences'
    },
    reversal: {
      id: 'reversal',
      label: 'Direction changes',
      hint: 'potentially critical reversal'
    },
    insufficient: {
      id: 'insufficient',
      label: 'Insufficient data',
      hint: 'one or more groups are unreliable'
    }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function moduleSentence(moduleKey) {
    return MODULE_SENTENCE[moduleKey] || '';
  }

  function nextAnalysis(moduleKey) {
    return NEXT_ANALYSIS[moduleKey] || 'Use a formal group-comparison test before treating visible differences as confirmed.';
  }

  function sidebarItem(opts) {
    opts = opts || {};
    return {
      type: opts.type || (opts.tab ? 'tab' : 'navigate'),
      view: opts.view,
      viewIn: opts.viewIn,
      file: opts.file,
      tab: opts.tab,
      id: opts.id,
      icon: SIDEBAR_ICON,
      iconTone: 'group',
      label: SIDEBAR_LABEL,
      description: SIDEBAR_DESCRIPTION
    };
  }

  function classifyConsistency(input) {
    input = input || {};
    var insufficient = !!input.insufficient;
    var directionChanges = !!input.directionChanges;
    var magnitudeVaries = !!input.magnitudeVaries;
    var hasFormalTest = !!input.hasFormalTest;
    var testSupportsDifference = !!input.testSupportsDifference;
    var status;
    if (insufficient) status = STATUSES.insufficient;
    else if (directionChanges) status = STATUSES.reversal;
    else if (magnitudeVaries) status = STATUSES.varies;
    else status = STATUSES.consistent;
    var canSayDiffer = hasFormalTest && testSupportsDifference;
    return {
      id: status.id,
      label: status.label,
      hint: status.hint,
      descriptive: !canSayDiffer,
      canSayDiffer: canSayDiffer,
      directionChanges: directionChanges,
      magnitudeVaries: magnitudeVaries,
      insufficient: insufficient
    };
  }

  function assessSignedMetrics(items, opts) {
    opts = opts || {};
    var minN = Number.isFinite(Number(opts.minN)) ? Number(opts.minN) : 10;
    var absDelta = Number.isFinite(Number(opts.absDelta)) ? Number(opts.absDelta) : 0.2;
    var list = Array.isArray(items) ? items : [];
    var usable = list.filter(function (item) {
      return item && Number.isFinite(Number(item.value));
    });
    var reliable = usable.filter(function (item) {
      return Number(item.n) >= minN;
    });
    var insufficient = list.length < 2 || reliable.length < 2;
    var signed = reliable.filter(function (item) {
      return Number(item.value) !== 0;
    });
    var hasPos = signed.some(function (item) { return Number(item.value) > 0; });
    var hasNeg = signed.some(function (item) { return Number(item.value) < 0; });
    var directionChanges = !insufficient && hasPos && hasNeg;
    var abs = reliable.map(function (item) { return Math.abs(Number(item.value)); });
    var range = abs.length ? Math.max.apply(null, abs) - Math.min.apply(null, abs) : 0;
    var magnitudeVaries = !insufficient && !directionChanges && range >= absDelta;
    var extreme = null;
    if (reliable.length) {
      extreme = reliable.slice().sort(function (a, b) {
        return Math.abs(Number(b.value)) - Math.abs(Number(a.value));
      })[0];
    }
    return {
      classification: classifyConsistency({
        insufficient: insufficient,
        directionChanges: directionChanges,
        magnitudeVaries: magnitudeVaries,
        hasFormalTest: !!opts.hasFormalTest,
        testSupportsDifference: !!opts.testSupportsDifference
      }),
      range: range,
      reliableCount: reliable.length,
      extreme: extreme,
      smallGroups: list.filter(function (item) {
        return item && Number(item.n) < minN;
      }).map(function (item) { return item.name; })
    };
  }

  function buildInterpretation(model) {
    model = model || {};
    var status = model.status || classifyConsistency(model);
    var consistent = model.consistentText
      || (status.id === 'consistent'
        ? 'Direction and magnitude stay similar across the included groups.'
        : 'Some aspects of the overall finding still appear in more than one group.');
    var differs = model.differsText || 'No single group stands out from the others.';
    var direction = model.directionText
      || (status.directionChanges
        ? 'At least one relationship changes direction across groups.'
        : 'No direction reversal was detected among reliable groups.');
    var warning = model.warningText || '';
    var next = model.nextText || nextAnalysis(model.moduleKey);
    return {
      consistent: consistent,
      differs: differs,
      direction: direction,
      warning: warning,
      next: next
    };
  }

  function introHtml(moduleKey) {
    var extra = moduleSentence(moduleKey);
    return '<aside class="bg-std-why" aria-label="' + escapeHtml(WHY_TITLE) + '">'
      + '<div class="bg-std-why-icon"><i class="fa-solid fa-lightbulb"></i></div>'
      + '<div class="bg-std-why-copy">'
      + '<strong>' + escapeHtml(WHY_TITLE) + '</strong>'
      + '<p>' + escapeHtml(WHY_BODY) + (extra ? ' ' + escapeHtml(extra) : '') + '</p>'
      + '</div></aside>';
  }

  function safeguardHtml(hasFormalTest) {
    if (hasFormalTest) return '';
    return '<p class="bg-std-safeguard" role="note">'
      + '<i class="fa-solid fa-circle-info"></i> '
      + escapeHtml(SAFEGUARD_DESCRIPTIVE)
      + '</p>';
  }

  function groupSetupHtml(setup) {
    setup = setup || {};
    var levels = Array.isArray(setup.levels) ? setup.levels : [];
    var chips = levels.map(function (level) {
      var cls = 'bg-std-chip';
      if (level.small) cls += ' is-small';
      if (level.included === false) cls += ' is-excluded';
      return '<span class="' + cls + '">' + escapeHtml(level.name)
        + ' <em>n=' + escapeHtml(level.n) + '</em></span>';
    }).join('');
    var warnings = [];
    if (Number(setup.missingN) > 0) {
      warnings.push(setup.missingN + ' row' + (setup.missingN === 1 ? '' : 's') + ' missing a group value were excluded.');
    }
    var small = levels.filter(function (level) { return level.included !== false && level.small; });
    if (small.length) {
      warnings.push('Small group' + (small.length === 1 ? '' : 's') + ': '
        + small.map(function (level) { return level.name + ' (n=' + level.n + ')'; }).join(', ')
        + '. Estimates from small groups are unstable.');
    }
    return '<section class="bg-std-setup" aria-label="Group setup">'
      + '<div class="bg-std-setup-head">'
      + '<span class="bg-std-kicker">Group setup</span>'
      + '<strong>' + escapeHtml(GROUP_BY_LABEL) + '</strong>'
      + '<span class="bg-std-group-name">' + escapeHtml(setup.groupName || '—') + '</span>'
      + '</div>'
      + '<p class="bg-std-help">' + escapeHtml(GROUP_BY_HELP) + '</p>'
      + (chips ? '<div class="bg-std-chips">' + chips + '</div>' : '')
      + (warnings.length ? '<p class="bg-std-warn"><i class="fa-solid fa-triangle-exclamation"></i> ' + escapeHtml(warnings.join(' ')) + '</p>' : '')
      + '</section>';
  }

  function consistencyHtml(status) {
    status = status || STATUSES.insufficient;
    return '<section class="bg-std-consistency" aria-label="Consistency across groups">'
      + '<div class="bg-std-setup-head">'
      + '<span class="bg-std-kicker">Consistency across groups</span>'
      + '<strong class="bg-std-status bg-std-status--' + escapeHtml(status.id) + '">' + escapeHtml(status.label) + '</strong>'
      + '<span class="bg-std-status-hint">' + escapeHtml(status.hint) + '</span>'
      + '</div></section>';
  }

  function interpretationHtml(model) {
    var parts = buildInterpretation(model);
    return '<section class="bg-std-interpret" aria-label="Interpretation">'
      + '<span class="bg-std-kicker">Interpretation</span>'
      + '<ul>'
      + '<li><strong>What remains consistent.</strong> ' + escapeHtml(parts.consistent) + '</li>'
      + '<li><strong>Which group differs most.</strong> ' + escapeHtml(parts.differs) + '</li>'
      + '<li><strong>Whether direction changes.</strong> ' + escapeHtml(parts.direction) + '</li>'
      + (parts.warning ? '<li><strong>Uncertainty.</strong> ' + escapeHtml(parts.warning) + '</li>' : '')
      + '<li><strong>Next analysis.</strong> ' + escapeHtml(parts.next) + '</li>'
      + '</ul></section>';
  }

  function mount(el, html) {
    if (typeof el === 'string') {
      el = typeof document !== 'undefined' ? document.querySelector(el) : null;
    }
    if (!el) return null;
    el.innerHTML = html || '';
    el.hidden = !html;
    return el;
  }

  function applyPageTitles(root) {
    if (typeof document === 'undefined') return;
    var scope = root && root.querySelector ? root : document;
    var title = scope.querySelector('.title strong, #resultTitle');
    var sub = scope.querySelector('#subtitle');
    if (title) title.textContent = PAGE_TITLE;
    if (sub) {
      sub.textContent = '';
      sub.hidden = true;
    }
    if (typeof document !== 'undefined' && document.title && /by group|grouped analysis/i.test(document.title)) {
      var suffix = document.title.indexOf(' - ') >= 0 ? document.title.slice(document.title.indexOf(' - ')) : '';
      document.title = PAGE_TITLE + suffix;
    }
  }

  function headerMetaText(info) {
    info = info || {};
    var parts = [];
    if (info.variable) parts.push(info.variable);
    if (info.groupName) parts.push('Grouped by ' + info.groupName);
    if (Number(info.groupCount) > 0) {
      parts.push(info.groupCount + (info.groupCount === 1 ? ' group' : ' groups'));
    }
    if (info.n != null && info.n !== '') parts.push('n=' + info.n);
    return parts.join(' · ');
  }

  function applyHeaderMeta(el, info) {
    if (typeof el === 'string') {
      el = typeof document !== 'undefined' ? document.querySelector(el) : null;
    }
    if (!el) return '';
    var text = headerMetaText(info);
    el.textContent = text;
    el.hidden = !text;
    return text;
  }

  function joinLabels(items) {
    if (!items || !items.length) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function similarityComponentsFromPairs(pairs, keys) {
    keys = keys || [
      { id: 'location', label: 'location', key: 'location' },
      { id: 'spread', label: 'spread', key: 'spread' },
      { id: 'shape', label: 'shape', key: 'shape' }
    ];
    var usable = (Array.isArray(pairs) ? pairs : []).filter(function (p) {
      return p && p.usable !== false;
    });
    return keys.map(function (k) {
      var vals = usable.map(function (p) { return Number(p[k.key]); }).filter(Number.isFinite);
      var score = NaN;
      if (vals.length) {
        var prod = vals.reduce(function (s, v) { return s * Math.max(v, 1e-9); }, 1);
        score = Math.pow(prod, 1 / vals.length);
      }
      return { id: k.id, label: k.label, score: score };
    });
  }

  function similarityHeadline(bandLabel, score) {
    var rounded = Number.isFinite(Number(score)) ? String(Math.round(Number(score))) + '/100' : '—';
    var label = String(bandLabel || 'Overall similarity').trim();
    return label + ' · ' + rounded;
  }

  function similarityConclusion(components) {
    var usable = (Array.isArray(components) ? components : []).filter(function (c) {
      return c && Number.isFinite(Number(c.score));
    }).map(function (c) {
      return { id: c.id || c.label, label: c.label || c.id, score: Number(c.score) };
    });
    if (!usable.length) return 'Not enough overlapping group data to describe similarity.';
    var sorted = usable.slice().sort(function (a, b) { return a.score - b.score; });
    var weakest = sorted[0];
    var rest = sorted.slice(1);
    var restSimilar = rest.filter(function (c) { return c.score >= 75; });
    if (weakest.score >= 90) {
      return 'Groups are very similar in ' + joinLabels(usable.map(function (c) { return c.label; })) + '.';
    }
    if (weakest.score >= 75) {
      return 'Groups are mostly similar across ' + joinLabels(usable.map(function (c) { return c.label; })) + '.';
    }
    if (restSimilar.length && restSimilar.length === rest.length) {
      return 'Groups differ mainly in ' + weakest.label + '. Their ' + joinLabels(restSimilar.map(function (c) { return c.label; })) + ' are very similar.';
    }
    if (restSimilar.length) {
      return 'Groups differ mainly in ' + weakest.label + '. Their ' + joinLabels(restSimilar.map(function (c) { return c.label; })) + ' remain similar.';
    }
    return 'Similarity varies across ' + joinLabels(usable.map(function (c) { return c.label; })) + '.';
  }

  function findingHtml(model) {
    model = model || {};
    var status = model.headline || (model.status && model.status.label) || '';
    var conclusion = model.conclusion || '';
    var badge = model.descriptive !== false
      ? '<span class="bg-std-badge" title="' + escapeHtml(SAFEGUARD_DESCRIPTIVE) + '">Descriptive only <i class="fa-solid fa-circle-info"></i></span>'
      : '';
    if (!status && !conclusion) return '';
    return '<section class="bg-std-finding" aria-label="Main finding">'
      + '<div class="bg-std-finding-row">'
      + '<strong class="bg-std-finding-status">' + escapeHtml(status) + '</strong>'
      + badge
      + '</div>'
      + (conclusion ? '<p class="bg-std-finding-copy">' + escapeHtml(conclusion) + '</p>' : '')
      + '</section>';
  }

  function scoreCardHtml(model) {
    model = model || {};
    var score = Number.isFinite(Number(model.score)) ? String(Math.round(Number(model.score))) : '—';
    var band = model.band || '';
    return '<div class="bg-std-score-card">'
      + '<span class="bg-std-kicker">Overall similarity</span>'
      + '<strong class="bg-std-score-value">' + escapeHtml(score) + '</strong>'
      + (band ? '<span class="bg-std-score-band">' + escapeHtml(band) + '</span>' : '')
      + '</div>';
  }

  function methodDetailsHtml(model) {
    model = model || {};
    var parts = buildInterpretation(model);
    var extra = moduleSentence(model.moduleKey);
    return '<details class="bg-std-method" id="byGroupMethodDetails">'
      + '<summary>Method &amp; interpretation</summary>'
      + '<p><strong>' + escapeHtml(WHY_TITLE) + '.</strong> ' + escapeHtml(WHY_BODY)
      + (extra ? ' ' + escapeHtml(extra) : '') + '</p>'
      + '<p><strong>Group by.</strong> ' + escapeHtml(GROUP_BY_HELP)
      + (model.groupName ? ' Current grouping: ' + escapeHtml(model.groupName) + '.' : '') + '</p>'
      + '<ul>'
      + '<li><strong>What remains consistent.</strong> ' + escapeHtml(parts.consistent) + '</li>'
      + '<li><strong>Which group differs most.</strong> ' + escapeHtml(parts.differs) + '</li>'
      + '<li><strong>Whether direction changes.</strong> ' + escapeHtml(parts.direction) + '</li>'
      + (parts.warning ? '<li><strong>Uncertainty.</strong> ' + escapeHtml(parts.warning) + '</li>' : '')
      + '<li><strong>Next analysis.</strong> ' + escapeHtml(parts.next) + '</li>'
      + '</ul>'
      + (model.descriptive !== false ? '<p class="bg-std-method-note">' + escapeHtml(SAFEGUARD_DESCRIPTIVE) + '</p>' : '')
      + '</details>';
  }

  function hideLegacyChrome() {
    if (typeof document === 'undefined') return;
    ['byGroupIntro', 'byGroupSetup', 'byGroupConsistency', 'byGroupSafeguard', 'byGroupInterpret'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '';
      el.hidden = true;
    });
  }

  function mountResultFirst(model) {
    model = model || {};
    applyPageTitles();
    hideLegacyChrome();
    applyHeaderMeta(model.headerEl || '#subtitle', model.header || {});
    var hasResult = !!(model.headline || (model.status && model.status.label) || model.conclusion);
    mount(model.findingEl || '#byGroupFinding', hasResult ? findingHtml(model) : '');
    mount('#byGroupInterpret', '');
    if (model.publish === false) return;
    if (!hasResult) {
      publishContext(null);
      return;
    }
    publishContext({
      moduleKey: model.moduleKey,
      status: model.status,
      directionChanges: model.directionChanges,
      differsText: model.differsText,
      warningText: model.warningText
    });
  }

  function openMethod() {
    if (typeof document === 'undefined') return;
    var el = document.getElementById('byGroupMethodDetails');
    if (!el) return;
    el.open = true;
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  function publishContext(ctx) {
    if (typeof globalThis !== 'undefined') {
      globalThis.__byGroupStandardContext = ctx || null;
    }
    return ctx;
  }

  function aiPromptBlock(ctx) {
    ctx = ctx || (typeof globalThis !== 'undefined' ? globalThis.__byGroupStandardContext : null);
    if (!ctx || !ctx.status) {
      return 'GROUP CONSISTENCY DATA: Not assessed — the analyst has not opened By Group, or no grouping column is selected. In GROUP CONSISTENCY say that subgroup consistency was not assessed and recommend opening By Group.';
    }
    var lines = [
      'GROUP CONSISTENCY DATA (authoritative; do not invent a significance test):',
      'Status: ' + ctx.status.label + ' — ' + ctx.status.hint,
      ctx.status.descriptive ? 'Safeguard: ' + SAFEGUARD_DESCRIPTIVE : 'A formal group-comparison test is available; only then may you say that groups differ.',
      ctx.directionChanges ? 'PROMINENT: a direction reversal was detected.' : 'No direction reversal among reliable groups.',
      ctx.differsText ? 'Group that differs most: ' + ctx.differsText : '',
      ctx.warningText ? 'Warnings: ' + ctx.warningText : '',
      'Use the exact status label. Prominently report any strong difference or direction reversal.'
    ];
    return lines.filter(Boolean).join('\n');
  }

  return {
    SIDEBAR_SECTION: SIDEBAR_SECTION,
    SIDEBAR_LABEL: SIDEBAR_LABEL,
    SIDEBAR_DESCRIPTION: SIDEBAR_DESCRIPTION,
    SIDEBAR_ICON: SIDEBAR_ICON,
    PAGE_TITLE: PAGE_TITLE,
    PAGE_SUBTITLE: PAGE_SUBTITLE,
    WHY_TITLE: WHY_TITLE,
    WHY_BODY: WHY_BODY,
    GROUP_BY_LABEL: GROUP_BY_LABEL,
    GROUP_BY_HELP: GROUP_BY_HELP,
    SAFEGUARD_DESCRIPTIVE: SAFEGUARD_DESCRIPTIVE,
    MODULE_SENTENCE: MODULE_SENTENCE,
    NEXT_ANALYSIS: NEXT_ANALYSIS,
    STATUSES: STATUSES,
    escapeHtml: escapeHtml,
    moduleSentence: moduleSentence,
    nextAnalysis: nextAnalysis,
    sidebarItem: sidebarItem,
    classifyConsistency: classifyConsistency,
    assessSignedMetrics: assessSignedMetrics,
    buildInterpretation: buildInterpretation,
    introHtml: introHtml,
    safeguardHtml: safeguardHtml,
    groupSetupHtml: groupSetupHtml,
    consistencyHtml: consistencyHtml,
    interpretationHtml: interpretationHtml,
    headerMetaText: headerMetaText,
    applyHeaderMeta: applyHeaderMeta,
    similarityComponentsFromPairs: similarityComponentsFromPairs,
    similarityHeadline: similarityHeadline,
    similarityConclusion: similarityConclusion,
    findingHtml: findingHtml,
    scoreCardHtml: scoreCardHtml,
    methodDetailsHtml: methodDetailsHtml,
    hideLegacyChrome: hideLegacyChrome,
    mountResultFirst: mountResultFirst,
    mount: mount,
    applyPageTitles: applyPageTitles,
    publishContext: publishContext,
    openMethod: openMethod,
    aiPromptBlock: aiPromptBlock
  };
});
