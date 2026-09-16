/**
 * Display labels and grouping-link detection for Regression by Group
 * predicted-response controls.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoRegressionPredLabels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var RECODE_SUFFIX = /(_recode|_recoded|_recodes|_cat|_cats|_bin|_binned|_group|_grp|_level|_lvl|_tier|_class|_coded)$/i;
  var UNITS = {
    yr: 'years',
    year: 'years',
    years: 'years',
    hr: 'hours',
    hour: 'hours',
    hours: 'hours',
    min: 'minutes',
    mo: 'months',
    day: 'days',
    wk: 'weeks'
  };
  function predictorStem(name) {
    return String(name || '')
      .replace(RECODE_SUFFIX, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
  }

  function isLinkedToGrouping(name, groupingName) {
    if (!name || !groupingName) return false;
    if (String(name) === String(groupingName)) return true;
    var a = predictorStem(name);
    var b = predictorStem(groupingName);
    return !!(a && b && a === b);
  }

  function prettyWord(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function prettyPredictor(name) {
    if (!name) return '';
    var parts = String(name)
      .replace(/[_\-.]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return String(name);
    var last = parts[parts.length - 1].toLowerCase();
    if (UNITS[last] && parts.length > 1) {
      return parts.slice(0, -1).map(prettyWord).join(' ') + ' (' + UNITS[last] + ')';
    }
    return parts.map(prettyWord).join(' ');
  }

  function groupingNoun(groupingName) {
    var stripped = String(groupingName || '').replace(RECODE_SUFFIX, '');
    return prettyPredictor(stripped).replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  function displayLevel(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return s;
    if (s !== s.toLowerCase()) return s;
    return s.replace(/(^|[\s_-])([a-z])/g, function (_m, sep, ch) {
      return (sep === '_' || sep === '-' ? ' ' : sep) + ch.toUpperCase();
    });
  }

  function prettyGroupLabel(raw, groupingName) {
    var level = displayLevel(raw);
    if (!level) return '';
    var g = String(groupingName || '').trim();
    if (!g) return level;
    return g + '="' + level + '"';
  }

  function groupLevelWithN(raw, groupingName, n) {
    var label = prettyGroupLabel(raw, groupingName);
    var count = Number(n);
    if (!label) return Number.isFinite(count) ? '(n=' + count + ')' : '';
    return Number.isFinite(count) ? label + ' (n=' + count + ')' : label;
  }

  return {
    predictorStem: predictorStem,
    isLinkedToGrouping: isLinkedToGrouping,
    prettyPredictor: prettyPredictor,
    groupingNoun: groupingNoun,
    displayLevel: displayLevel,
    prettyGroupLabel: prettyGroupLabel,
    groupLevelWithN: groupLevelWithN
  };
});
