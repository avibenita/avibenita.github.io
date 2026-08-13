/**
 * Built-in validation / demo tables for Contingency Tables.
 */
(function (root) {
  'use strict';

  var EXAMPLES = {
    assoc2x2: {
      id: 'assoc2x2',
      title: '2×2 with a clear association',
      description: 'Treatment × Response. Expected χ² = 16.67, df = 1, V = 0.408, OR = 6.',
      headers: ['Treatment', 'Response'],
      rows: (function () {
        var r = [], i;
        for (i = 0; i < 30; i++) r.push(['Drug', 'Improved']);
        for (i = 0; i < 10; i++) r.push(['Drug', 'No change']);
        for (i = 0; i < 20; i++) r.push(['Placebo', 'Improved']);
        for (i = 0; i < 40; i++) r.push(['Placebo', 'No change']);
        return r;
      })()
    },
    zero2x2: {
      id: 'zero2x2',
      title: '2×2 with a zero cell',
      description: 'One empty cell; odds ratio uses a 0.5 continuity correction.',
      headers: ['Exposure', 'Disease'],
      rows: (function () {
        var r = [], i;
        for (i = 0; i < 10; i++) r.push(['Exposed', 'Yes']);
        for (i = 0; i < 5; i++) r.push(['Unexposed', 'Yes']);
        for (i = 0; i < 15; i++) r.push(['Unexposed', 'No']);
        return r;
      })()
    },
    table3x4: {
      id: 'table3x4',
      title: '3×4 table',
      description: 'Department × Shift counts.',
      headers: ['Department', 'Shift'],
      rows: (function () {
        var r = [], i;
        var cells = [
          ['A', 'Morning', 12], ['A', 'Afternoon', 8], ['A', 'Evening', 5], ['A', 'Night', 3],
          ['B', 'Morning', 7], ['B', 'Afternoon', 15], ['B', 'Evening', 9], ['B', 'Night', 4],
          ['C', 'Morning', 4], ['C', 'Afternoon', 6], ['C', 'Evening', 14], ['C', 'Night', 11]
        ];
        cells.forEach(function (c) {
          for (i = 0; i < c[2]; i++) r.push([c[0], c[1]]);
        });
        return r;
      })()
    },
    sparse: {
      id: 'sparse',
      title: 'Sparse table (assumption warning)',
      description: 'Several expected counts below 5; some below 1.',
      headers: ['Site', 'Outcome'],
      rows: (function () {
        var r = [], i;
        var cells = [
          ['North', 'A', 10], ['North', 'B', 1], ['North', 'C', 0],
          ['Central', 'A', 2], ['Central', 'B', 0], ['Central', 'C', 1],
          ['South', 'A', 0], ['South', 'B', 1], ['South', 'C', 8]
        ];
        cells.forEach(function (c) {
          for (i = 0; i < c[2]; i++) r.push([c[0], c[1]]);
        });
        return r;
      })()
    },
    weighted: {
      id: 'weighted',
      title: 'Weighted frequency dataset',
      description: 'Same association as the 2×2 example, stored as frequency weights.',
      headers: ['Treatment', 'Response', 'Freq'],
      rows: [
        ['Drug', 'Improved', 30],
        ['Drug', 'No change', 10],
        ['Placebo', 'Improved', 20],
        ['Placebo', 'No change', 40]
      ]
    }
  };

  function getExample(id) {
    return EXAMPLES[id] || EXAMPLES.assoc2x2;
  }

  function toPayload(ex) {
    ex = ex || EXAMPLES.assoc2x2;
    return {
      headers: ex.headers.slice(),
      rows: ex.rows.map(function (r) { return r.slice(); }),
      address: 'Demo · ' + ex.title
    };
  }

  root.StatisticoContingencySamples = {
    EXAMPLES: EXAMPLES,
    getExample: getExample,
    toPayload: toPayload,
    defaultPayload: function () { return toPayload(EXAMPLES.assoc2x2); }
  };
  if (typeof module === 'object' && module.exports) module.exports = root.StatisticoContingencySamples;
})(typeof globalThis !== 'undefined' ? globalThis : this);
