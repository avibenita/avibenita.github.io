/**
 * Employee-loyalty sample: one row per respondent.
 * Satisfaction items Sat_1–Sat_3 and stay items Stay_1–Stay_2 are 1–5 scores.
 * Division, Wave, Level, and Tenure are categorical. Weight is optional.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoSegmentationSamples = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var HEADERS = ['Respondent ID', 'Sat_1', 'Sat_2', 'Sat_3', 'Stay_1', 'Stay_2', 'Division', 'Wave', 'Level', 'Tenure', 'Weight'];

  var ITEMS = {
    highXHighY: { sat: [5, 5, 4], stay: [5, 4] },
    highXLowY: { sat: [5, 4, 5], stay: [2, 3] },
    lowXHighY: { sat: [2, 3, 2], stay: [5, 4] },
    lowXLowY: { sat: [2, 2, 1], stay: [2, 1] }
  };

  function pushBlock(rows, state, spec) {
    var item = ITEMS[spec.segment];
    for (var i = 0; i < spec.n; i++) {
      state.n += 1;
      var id = spec.duplicateId || ('R' + String(1000 + state.n));
      var sat = item.sat.slice();
      var stay = item.stay.slice();
      if (spec.dropSat && i === 0) sat[2] = '';
      if (spec.blankStay) {
        stay[0] = '';
        stay[1] = '';
      }
      var weight = spec.weight == null ? 1 : spec.weight;
      rows.push([
        id,
        sat[0], sat[1], sat[2],
        stay[0], stay[1],
        spec.group,
        spec.wave,
        spec.level || (i % 3 === 0 ? 'Managers' : 'Staff'),
        spec.tenure || (i % 2 === 0 ? '1–5 years' : '6+ years'),
        weight
      ]);
    }
  }

  function buildRows() {
    var rows = [];
    var state = { n: 0 };
    function add(spec) { pushBlock(rows, state, spec); }

    add({ segment: 'highXHighY', n: 70, group: 'Corporate', wave: '2026', level: 'Managers', tenure: '6+ years' });
    add({ segment: 'highXLowY', n: 8, group: 'Corporate', wave: '2026', level: 'Managers' });
    add({ segment: 'lowXHighY', n: 6, group: 'Corporate', wave: '2026' });
    add({ segment: 'lowXLowY', n: 4, group: 'Corporate', wave: '2026', level: 'Staff' });

    add({ segment: 'highXHighY', n: 28, group: 'Sales', wave: '2026', level: 'Staff', tenure: '1–5 years' });
    add({ segment: 'highXLowY', n: 16, group: 'Sales', wave: '2026', level: 'Staff' });
    add({ segment: 'lowXHighY', n: 8, group: 'Sales', wave: '2026' });
    add({ segment: 'lowXLowY', n: 12, group: 'Sales', wave: '2026', level: 'Staff', tenure: '1–5 years' });

    add({ segment: 'highXHighY', n: 12, group: 'Operations', wave: '2026' });
    add({ segment: 'highXLowY', n: 6, group: 'Operations', wave: '2026' });
    add({ segment: 'lowXHighY', n: 16, group: 'Operations', wave: '2026', level: 'Staff' });
    add({ segment: 'lowXLowY', n: 14, group: 'Operations', wave: '2026', level: 'Staff' });

    add({ segment: 'highXHighY', n: 4, group: 'Support', wave: '2026', dropSat: true });
    add({ segment: 'highXLowY', n: 2, group: 'Support', wave: '2026' });
    add({ segment: 'lowXHighY', n: 3, group: 'Support', wave: '2026' });
    add({ segment: 'lowXLowY', n: 5, group: 'Support', wave: '2026' });

    add({ segment: 'highXHighY', n: 10, group: 'Field', wave: '2026', level: 'Staff', tenure: '1–5 years' });
    add({ segment: 'highXLowY', n: 4, group: 'Field', wave: '2026' });
    add({ segment: 'lowXHighY', n: 3, group: 'Field', wave: '2026' });
    add({ segment: 'lowXLowY', n: 6, group: 'Field', wave: '2026' });

    add({ segment: 'highXHighY', n: 58, group: 'Corporate', wave: '2025', level: 'Managers' });
    add({ segment: 'highXLowY', n: 10, group: 'Corporate', wave: '2025' });
    add({ segment: 'lowXHighY', n: 8, group: 'Corporate', wave: '2025' });
    add({ segment: 'lowXLowY', n: 8, group: 'Corporate', wave: '2025' });

    add({ segment: 'highXHighY', n: 22, group: 'Sales', wave: '2025' });
    add({ segment: 'highXLowY', n: 14, group: 'Sales', wave: '2025' });
    add({ segment: 'lowXHighY', n: 10, group: 'Sales', wave: '2025' });
    add({ segment: 'lowXLowY', n: 14, group: 'Sales', wave: '2025' });

    add({ segment: 'highXHighY', n: 10, group: 'Operations', wave: '2025' });
    add({ segment: 'highXLowY', n: 6, group: 'Operations', wave: '2025' });
    add({ segment: 'lowXHighY', n: 18, group: 'Operations', wave: '2025' });
    add({ segment: 'lowXLowY', n: 16, group: 'Operations', wave: '2025' });

    add({ segment: 'highXHighY', n: 3, group: 'Support', wave: '2025' });
    add({ segment: 'highXLowY', n: 2, group: 'Support', wave: '2025' });
    add({ segment: 'lowXHighY', n: 4, group: 'Support', wave: '2025' });
    add({ segment: 'lowXLowY', n: 5, group: 'Support', wave: '2025' });

    add({ segment: 'highXHighY', n: 4, group: 'Archive', wave: '2025' });
    add({ segment: 'highXLowY', n: 3, group: 'Archive', wave: '2025' });
    add({ segment: 'lowXHighY', n: 5, group: 'Archive', wave: '2025' });
    add({ segment: 'lowXLowY', n: 8, group: 'Archive', wave: '2025' });

    add({ segment: 'lowXLowY', n: 4, group: 'Corporate', wave: '2026', blankStay: true, level: 'Staff' });
    add({ segment: 'highXHighY', n: 1, group: 'Sales', wave: '2026', duplicateId: 'R1001', weight: 1 });

    return rows;
  }

  function defaultSpec() {
    return {
      template: 'employeeLoyalty',
      xDimension: {
        label: 'Satisfaction',
        columns: ['Sat_1', 'Sat_2', 'Sat_3'],
        thresholdMethod: 'custom',
        threshold: 4,
        highLabel: 'Satisfied',
        lowLabel: 'Not satisfied'
      },
      yDimension: {
        label: 'Intention to stay',
        columns: ['Stay_1', 'Stay_2'],
        thresholdMethod: 'custom',
        threshold: 4,
        highLabel: 'Tending to stay',
        lowLabel: 'Not tending to stay'
      },
      segments: {
        highXHighY: { label: 'Truly Loyal', color: '#2f9e62' },
        highXLowY: { label: 'Accessible', color: '#c4922a' },
        lowXHighY: { label: 'Trapped', color: '#6b7280' },
        lowXLowY: { label: 'High Risk', color: '#c4725a' }
      },
      groupColumn: 'Division',
      waveColumn: 'Wave',
      currentWave: '2026',
      previousWave: '2025',
      respondentIdColumn: 'Respondent ID',
      weightColumn: null,
      minimumValidItems: 0.5,
      smallBaseThreshold: 30,
      filters: {}
    };
  }

  function defaultPayload() {
    return {
      headers: HEADERS.slice(),
      rows: buildRows(),
      address: 'Employee loyalty sample',
      spec: defaultSpec()
    };
  }

  return {
    HEADERS: HEADERS,
    defaultSpec: defaultSpec,
    defaultPayload: defaultPayload
  };
});
