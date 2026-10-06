/**
 * Built-in employee-loyalty sample for Survey Segmentation Matrix.
 */
(function (root) {
  'use strict';

  var HEADERS = [
    'RespondentID', 'Sat_Overall', 'Sat_Work', 'Sat_Manager',
    'Stay_Intent', 'Stay_Recommend',
    'Career development', 'Compensation', 'Workload', 'Manager support',
    'Recognition', 'Work–life balance', 'Tools and resources',
    'Division', 'Tenure', 'Level', 'Wave', 'Weight'
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function likert(rng, mean) {
    var v = mean + (rng() - 0.5) * 2.2;
    if (rng() < 0.03) return '';
    return clamp(Math.round(v), 1, 5);
  }

  function pick(rng, items, weights) {
    var t = 0;
    for (var i = 0; i < weights.length; i++) t += weights[i];
    var r = rng() * t;
    var acc = 0;
    for (var j = 0; j < items.length; j++) {
      acc += weights[j];
      if (r <= acc) return items[j];
    }
    return items[items.length - 1];
  }

  function buildRows() {
    var rng = mulberry32(20260815);
    var divisions = ['Corporate', 'Operations', 'Sales', 'R&D', 'Support'];
    var divW = [0.18, 0.28, 0.22, 0.16, 0.16];
    var tenure = ['0–1 years', '1–5 years', '6–10 years', '11+ years'];
    var tenW = [0.16, 0.38, 0.26, 0.20];
    var levels = ['Individual contributor', 'Manager', 'Director'];
    var levW = [0.72, 0.22, 0.06];
    var rows = [];
    var id = 1000;
    var waves = [
      { label: '2025', n: 410, satShift: -0.08, stayShift: -0.05 },
      { label: '2026', n: 426, satShift: 0, stayShift: 0 }
    ];
    waves.forEach(function (wave) {
      for (var i = 0; i < wave.n; i++) {
        var div = pick(rng, divisions, divW);
        if (wave.label === '2026' && rng() < 0.06) div = 'Field';
        if (wave.label === '2025' && rng() < 0.04) div = 'Legacy Unit';
        var ten = pick(rng, tenure, tenW);
        var lev = pick(rng, levels, levW);
        var baseSat = 4.15 + wave.satShift;
        var baseStay = 4.05 + wave.stayShift;
        if (div === 'Corporate') { baseSat -= 0.35; baseStay -= 0.25; }
        if (div === 'Sales') { baseSat -= 0.15; baseStay -= 0.45; }
        if (div === 'Support') { baseSat -= 0.45; baseStay -= 0.20; }
        if (div === 'R&D') { baseSat += 0.10; baseStay += 0.15; }
        if (div === 'Field') { baseSat -= 0.20; baseStay -= 0.10; }
        if (div === 'Legacy Unit') { baseSat -= 0.55; baseStay -= 0.35; }
        if (lev === 'Director') { baseSat += 0.25; baseStay += 0.30; }
        if (ten === '0–1 years') baseStay -= 0.25;
        if (ten === '11+ years') { baseStay += 0.20; baseSat -= 0.10; }
        var rid = 'E' + id;
        if (wave.label === '2026' && i === 12) rid = 'E1005';
        rows.push([
          rid,
          likert(rng, baseSat),
          likert(rng, baseSat - 0.05),
          likert(rng, baseSat - 0.10),
          likert(rng, baseStay),
          likert(rng, baseStay - 0.08),
          likert(rng, baseStay + 0.35),
          likert(rng, baseStay - 0.05),
          likert(rng, 3.2),
          likert(rng, baseStay + 0.15),
          likert(rng, baseStay + 0.05),
          likert(rng, 3.4),
          likert(rng, baseSat - 0.20),
          div,
          ten,
          lev,
          wave.label,
          rng() < 0.12 ? Number((0.7 + rng() * 0.8).toFixed(2)) : 1
        ]);
        id += 1;
      }
    });
    return rows;
  }

  var ROWS = buildRows();

  var DEFAULT_SPEC = {
    template: 'employeeLoyalty',
    xDimension: {
      label: 'Satisfaction',
      columns: ['Sat_Overall', 'Sat_Work', 'Sat_Manager'],
      thresholdMethod: 'custom',
      threshold: 4,
      highLabel: 'Satisfied',
      lowLabel: 'Not satisfied'
    },
    yDimension: {
      label: 'Intention to stay',
      columns: ['Stay_Intent', 'Stay_Recommend'],
      thresholdMethod: 'custom',
      threshold: 4,
      highLabel: 'Tending to stay',
      lowLabel: 'Not tending to stay'
    },
    groupColumn: 'Division',
    waveColumn: 'Wave',
    currentWave: '2026',
    previousWave: '2025',
    respondentIdColumn: 'RespondentID',
    weightColumn: null,
    minimumValidItems: 0.5,
    smallBaseThreshold: 30,
    factorColumns: [
      'Career development', 'Compensation', 'Workload', 'Manager support',
      'Recognition', 'Work–life balance', 'Tools and resources'
    ]
  };

  function getTable() {
    return {
      headers: HEADERS.slice(),
      rows: ROWS.map(function (r) { return r.slice(); }),
      values: [HEADERS.slice()].concat(ROWS.map(function (r) { return r.slice(); }))
    };
  }

  function defaultPayload() {
    var t = getTable();
    return {
      headers: t.headers,
      rows: t.rows,
      spec: Object.assign({}, DEFAULT_SPEC)
    };
  }

  function insertSheet() {
    if (typeof Excel === 'undefined' || !Excel.run) {
      return Promise.resolve({ ok: false, error: 'Excel is not available' });
    }
    var t = getTable();
    return Excel.run(function (ctx) {
      var sheet = ctx.workbook.worksheets.add('Loyalty Sample');
      var range = sheet.getRangeByIndexes(0, 0, t.values.length, t.headers.length);
      range.values = t.values;
      range.format.autofitColumns();
      sheet.activate();
      return ctx.sync().then(function () {
        return { ok: true, values: t.values, address: sheet.name + '!A1' };
      });
    }).catch(function (err) {
      return { ok: false, error: (err && err.message) || String(err) };
    });
  }

  root.StatisticoSegmentationSample = {
    HEADERS: HEADERS,
    DEFAULT_SPEC: DEFAULT_SPEC,
    getTable: getTable,
    defaultPayload: defaultPayload,
    insertSheet: insertSheet
  };
  if (typeof module === 'object' && module.exports) module.exports = root.StatisticoSegmentationSample;
})(typeof globalThis !== 'undefined' ? globalThis : this);
