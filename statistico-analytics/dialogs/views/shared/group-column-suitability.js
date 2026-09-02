/**
 * Rank grouping-column candidates for Compare Groups / Grouped Analysis.
 * Never mutates caller arrays. Safe in both browser and Jest.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoGroupColumnSuitability = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var RECOMMENDED_MAX_GROUPS = 12;
  var MANY_GROUPS_MAX = 30;
  var UNIQUE_RATIO_DISABLE = 0.85;
  var ID_UNIQUE_RATIO_DISABLE = 0.55;

  var EMAIL_NAME_RE = /(e-?mail|email\s*address|\bmail\b)/i;
  var EMAIL_VALUE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var UUID_VALUE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var ID_NAME_RE = /^(id|ids|uuid|guid|pk|rowid|row_id|index)$/i;
  var ID_TOKEN_RE = /(^|[^a-z])(uuid|guid|ssn|phone|mobile|user[_-]?id|customer[_-]?id|account[_-]?id|row[_-]?id)([^a-z]|$)/i;
  var GROUPING_NAME_RE = /\b(state|region|country|province|territory|group|gender|sex|category|type|status|department|segment|class|grade|cohort|treatment|arm|condition|ethnicity|race|education|industry|brand|store|channel|device|platform|plan|tier|role|team|division|city)\b/i;

  function groupWord(n) {
    return n === 1 ? 'group' : 'groups';
  }

  function sumN(levels) {
    if (!Array.isArray(levels) || !levels.length) return 0;
    return levels.reduce(function (sum, item) {
      var n = item && Number(item.n);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  function sampleLooksLike(levels, test, minShare) {
    if (!Array.isArray(levels) || !levels.length) return false;
    var hits = 0;
    var seen = 0;
    for (var i = 0; i < levels.length && seen < 24; i++) {
      var raw = levels[i] && levels[i].level;
      if (raw == null || raw === '' || raw === '(blank)') continue;
      seen += 1;
      if (test(String(raw))) hits += 1;
    }
    if (seen < 3) return hits === seen && hits > 0;
    return hits / seen >= (minShare == null ? 0.5 : minShare);
  }

  function looksLikeEmail(name, levels) {
    if (EMAIL_NAME_RE.test(String(name || ''))) return true;
    return sampleLooksLike(levels, function (value) { return EMAIL_VALUE_RE.test(value); }, 0.5);
  }

  function looksLikeIdentifierName(name) {
    var n = String(name || '').trim();
    if (!n) return false;
    if (ID_NAME_RE.test(n)) return true;
    if (ID_TOKEN_RE.test(n)) return true;
    return false;
  }

  function looksLikeUniqueIdentifier(name, levels, uniqueRatio) {
    if (looksLikeEmail(name, levels)) return true;
    if (sampleLooksLike(levels, function (value) { return UUID_VALUE_RE.test(value); }, 0.5)) return true;
    if (uniqueRatio >= UNIQUE_RATIO_DISABLE) return true;
    if (looksLikeIdentifierName(name) && uniqueRatio >= ID_UNIQUE_RATIO_DISABLE) return true;
    return false;
  }

  function looksLikeGroupingName(name) {
    return GROUPING_NAME_RE.test(String(name || ''));
  }

  function classify(input) {
    var name = input && input.name != null ? String(input.name) : '';
    var levels = (input && Array.isArray(input.levels)) ? input.levels : [];
    var groupCount = levels.length;
    var countedRows = sumN(levels);
    var rowCount = Number(input && input.rowCount);
    if (!Number.isFinite(rowCount) || rowCount <= 0) rowCount = countedRows;
    var uniqueRatio = rowCount > 0 ? groupCount / rowCount : 1;

    if (input && input.isAnalysisVariable) {
      return {
        bucket: 'disabled',
        disabled: true,
        selectable: false,
        tone: 'muted',
        reason: 'analysis-variable',
        indicator: 'Current analysis variable',
        groupCount: groupCount,
        rowCount: rowCount,
        uniqueRatio: uniqueRatio
      };
    }

    if (looksLikeEmail(name, levels) || looksLikeUniqueIdentifier(name, levels, uniqueRatio)) {
      return {
        bucket: 'disabled',
        disabled: true,
        selectable: false,
        tone: 'bad',
        reason: looksLikeEmail(name, levels) ? 'email' : (uniqueRatio >= UNIQUE_RATIO_DISABLE ? 'unique-per-row' : 'identifier'),
        indicator: groupCount ? (groupCount + ' ' + groupWord(groupCount) + ' \u00b7 not recommended') : 'not recommended',
        groupCount: groupCount,
        rowCount: rowCount,
        uniqueRatio: uniqueRatio
      };
    }

    if (groupCount < 2) {
      return {
        bucket: 'disabled',
        disabled: true,
        selectable: false,
        tone: 'muted',
        reason: 'too-few-groups',
        indicator: groupCount === 1 ? '1 group \u00b7 not recommended' : 'no groups',
        groupCount: groupCount,
        rowCount: rowCount,
        uniqueRatio: uniqueRatio
      };
    }

    if (groupCount > MANY_GROUPS_MAX) {
      return {
        bucket: 'disabled',
        disabled: true,
        selectable: false,
        tone: 'bad',
        reason: 'high-cardinality',
        indicator: groupCount + ' ' + groupWord(groupCount) + ' \u00b7 not recommended',
        groupCount: groupCount,
        rowCount: rowCount,
        uniqueRatio: uniqueRatio
      };
    }

    if (groupCount <= RECOMMENDED_MAX_GROUPS && looksLikeGroupingName(name)) {
      return {
        bucket: 'recommended',
        disabled: false,
        selectable: true,
        tone: 'good',
        reason: 'recommended',
        indicator: 'Recommended \u00b7 ' + groupCount + ' ' + groupWord(groupCount),
        groupCount: groupCount,
        rowCount: rowCount,
        uniqueRatio: uniqueRatio
      };
    }

    if (groupCount > RECOMMENDED_MAX_GROUPS) {
      return {
        bucket: 'other',
        disabled: false,
        selectable: true,
        tone: 'caution',
        reason: 'many-groups',
        indicator: groupCount + ' ' + groupWord(groupCount) + ' \u00b7 many groups',
        groupCount: groupCount,
        rowCount: rowCount,
        uniqueRatio: uniqueRatio
      };
    }

    return {
      bucket: 'other',
      disabled: false,
      selectable: true,
      tone: 'neutral',
      reason: 'eligible',
      indicator: groupCount + ' ' + groupWord(groupCount),
      groupCount: groupCount,
      rowCount: rowCount,
      uniqueRatio: uniqueRatio
    };
  }

  function partition(items) {
    var recommended = [];
    var other = [];
    var disabled = [];
    (items || []).forEach(function (item) {
      if (!item) return;
      if (item.bucket === 'recommended') recommended.push(item);
      else if (item.bucket === 'disabled') disabled.push(item);
      else other.push(item);
    });
    return { recommended: recommended, other: other, disabled: disabled };
  }

  return {
    RECOMMENDED_MAX_GROUPS: RECOMMENDED_MAX_GROUPS,
    MANY_GROUPS_MAX: MANY_GROUPS_MAX,
    classify: classify,
    partition: partition
  };
});
