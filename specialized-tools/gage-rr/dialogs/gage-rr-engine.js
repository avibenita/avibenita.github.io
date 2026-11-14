/**
 * Crossed Gage R&R for a balanced study.
 * Long data: one reading per row, columns Part, Operator, and Measurement.
 * Two-way random-effects ANOVA. Interaction stays when its p-value is below 0.05.
 * At p >= 0.05 the interaction sum of squares and degrees of freedom join repeatability.
 * Reported components use max(0, estimate). Signed estimates stay on the result for diagnostics.
 * Study variation is 6 times the standard deviation.
 */
(function (root, factory) {
  var columnsApi = root && root.StatisticoColumnType;
  function optionalRequire(path) {
    if (typeof require !== 'function') return null;
    try { return require(path); } catch (err) { return null; }
  }
  if (!columnsApi) columnsApi = optionalRequire('./column-type.js');
  var api = factory(columnsApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StatisticoGageRR = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ColumnType) {
  'use strict';

  var ALPHA = 0.05;
  var STUDY_MULTIPLIER = 6;
  var NDC_FACTOR = 1.41;
  var KEY_SEP = '\u0000';
  var QC = {
    2: { A2: 1.880, D3: 0, D4: 3.267 },
    3: { A2: 1.023, D3: 0, D4: 2.574 },
    4: { A2: 0.729, D3: 0, D4: 2.282 },
    5: { A2: 0.577, D3: 0, D4: 2.114 },
    6: { A2: 0.483, D3: 0, D4: 2.004 },
    7: { A2: 0.419, D3: 0.076, D4: 1.924 },
    8: { A2: 0.373, D3: 0.136, D4: 1.864 },
    9: { A2: 0.337, D3: 0.184, D4: 1.816 },
    10: { A2: 0.308, D3: 0.223, D4: 1.777 },
    11: { A2: 0.285, D3: 0.256, D4: 1.744 },
    12: { A2: 0.266, D3: 0.283, D4: 1.717 },
    13: { A2: 0.249, D3: 0.307, D4: 1.693 },
    14: { A2: 0.235, D3: 0.328, D4: 1.672 },
    15: { A2: 0.223, D3: 0.347, D4: 1.653 },
    16: { A2: 0.212, D3: 0.363, D4: 1.637 },
    17: { A2: 0.203, D3: 0.378, D4: 1.622 },
    18: { A2: 0.194, D3: 0.391, D4: 1.608 },
    19: { A2: 0.187, D3: 0.403, D4: 1.597 },
    20: { A2: 0.180, D3: 0.415, D4: 1.585 },
    21: { A2: 0.173, D3: 0.425, D4: 1.575 },
    22: { A2: 0.167, D3: 0.434, D4: 1.566 },
    23: { A2: 0.162, D3: 0.443, D4: 1.557 },
    24: { A2: 0.157, D3: 0.451, D4: 1.548 },
    25: { A2: 0.153, D3: 0.459, D4: 1.541 }
  };
  var WORKSHEET_ERRORS = {
    '#N/A': true,
    '#VALUE!': true,
    '#DIV/0!': true,
    '#REF!': true,
    '#NAME?': true,
    '#NULL!': true,
    '#NUM!': true,
    '#GETTING_DATA': true,
    '#FIELD!': true,
    '#SPILL!': true,
    '#CALC!': true,
    '#BUSY!': true,
    '#BLOCKED!': true,
    '#CONNECT!': true,
    '#UNKNOWN!': true
  };

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  function blank(value) {
    return value == null || (typeof value === 'string' && value.trim() === '');
  }

  function worksheetError(value) {
    if (value == null || typeof value === 'number' || typeof value === 'boolean') return false;
    if (value instanceof Date) return false;
    if (typeof value === 'object') return true;
    if (typeof value !== 'string') return false;
    return !!WORKSHEET_ERRORS[value.trim().toUpperCase()];
  }

  function idLabel(value) {
    if (typeof value === 'string') return value.replace(/^\s+|\s+$/g, '');
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  function measurementOf(value) {
    if (worksheetError(value)) return { error: 'worksheet' };
    if (blank(value)) return { blank: true };
    if (typeof value === 'number') {
      return Number.isFinite(value) ? { value: value } : { error: 'invalid' };
    }
    if (value instanceof Date) return { error: 'invalid' };
    var parsed = ColumnType && typeof ColumnType.parseNumericCell === 'function'
      ? ColumnType.parseNumericCell(value)
      : Number(String(value).replace(/\u2212/g, '-').trim());
    return Number.isFinite(parsed) ? { value: parsed } : { error: 'invalid' };
  }

  function headerRowFromAddress(address) {
    if (!address) return null;
    var raw = String(address).replace(/\$/g, '');
    var bang = raw.lastIndexOf('!');
    var a1 = bang >= 0 ? raw.slice(bang + 1) : raw;
    var start = (a1.split(':')[0] || '').trim();
    var match = start.match(/(\d+)$/);
    if (!match) return null;
    var row = Number(match[1]);
    return Number.isFinite(row) && row > 0 ? row : null;
  }

  function findColumn(headers, name) {
    var wanted = String(name == null ? '' : name);
    var index = -1;
    (headers || []).some(function (header, i) {
      if (String(header == null ? '' : header) === wanted) {
        index = i;
        return true;
      }
      return false;
    });
    return index;
  }

  function columnKind(rows, index) {
    var numeric = 0;
    var other = 0;
    (rows || []).forEach(function (row) {
      var value = row ? row[index] : null;
      if (blank(value) || worksheetError(value)) return;
      var measured = measurementOf(value);
      if (measured.value != null) numeric += 1;
      else other += 1;
    });
    if (!numeric && !other) return 'empty';
    return other === 0 ? 'numeric' : 'categorical';
  }

  function listColumns(table) {
    var headers = (table && table.headers) || [];
    var rows = (table && table.rows) || [];
    return headers.map(function (header, index) {
      var name = String(header == null ? '' : header);
      if (!name) return null;
      return { name: name, index: index, kind: columnKind(rows, index) };
    }).filter(function (col) { return col && col.kind !== 'empty'; });
  }

  function listRowPhrase(rows) {
    var nums = rows.slice().sort(function (a, b) { return a - b; });
    if (nums.length === 1) return 'Row ' + nums[0];
    if (nums.length === 2) return 'Rows ' + nums[0] + ' and ' + nums[1];
    return 'Rows ' + nums.slice(0, -1).join(', ') + ', and ' + nums[nums.length - 1];
  }

  function pushIssue(map, key, issue) {
    if (!map[key]) map[key] = { code: issue.code, column: issue.column, rows: [], message: '' };
    map[key].rows.push(issue.row);
  }

  function logGamma(z) {
    var p = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843696540789e-6,
      1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    var x = p[0];
    var i;
    for (i = 1; i < p.length; i++) x += p[i] / (z + i);
    var t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function betacf(a, b, x) {
    var maxIt = 200;
    var eps = 3e-14;
    var fpmin = 1e-300;
    var qab = a + b;
    var qap = a + 1;
    var qam = a - 1;
    var c = 1;
    var d = 1 - qab * x / qap;
    if (Math.abs(d) < fpmin) d = fpmin;
    d = 1 / d;
    var h = d;
    var m;
    for (m = 1; m <= maxIt; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < fpmin) d = fpmin;
      c = 1 + aa / c;
      if (Math.abs(c) < fpmin) c = fpmin;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < fpmin) d = fpmin;
      c = 1 + aa / c;
      if (Math.abs(c) < fpmin) c = fpmin;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < eps) break;
    }
    return h;
  }

  function regularizedBeta(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    var front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta);
    if (x < (a + 1) / (a + b + 2)) return front * betacf(a, b, x) / a;
    return 1 - front * betacf(b, a, 1 - x) / b;
  }

  function fRightTail(f, df1, df2) {
    if (!(df1 > 0) || !(df2 > 0) || !Number.isFinite(f) || f < 0) return null;
    if (f === 0) return 1;
    var x = df2 / (df2 + df1 * f);
    var p = regularizedBeta(df2 / 2, df1 / 2, x);
    if (!Number.isFinite(p)) return null;
    if (p < 0) return 0;
    if (p > 1) return 1;
    return p;
  }

  function meanSquareTest(msNum, msDen, df1, df2, denominator) {
    var base = { df1: df1, df2: df2, denominator: denominator || '' };
    if (!(df1 > 0) || !(df2 > 0)) {
      return Object.assign(base, {
        f: null, p: null, state: 'unavailable',
        reason: 'The F test is unavailable because a degree of freedom is zero.'
      });
    }
    if (msDen === 0 && msNum === 0) {
      return Object.assign(base, {
        f: null, p: null, state: 'unavailable',
        reason: 'The numerator and denominator mean squares are both zero, so the F ratio is undefined.'
      });
    }
    if (msDen === 0 && msNum > 0) {
      return Object.assign(base, {
        f: null, p: 0, state: 'limit',
        reason: 'The denominator mean square is zero and the numerator is positive, so the right-tail probability is 0.'
      });
    }
    var f = msNum / msDen;
    var p = fRightTail(f, df1, df2);
    if (p == null) {
      return Object.assign(base, {
        f: finiteNumber(f), p: null, state: 'unavailable',
        reason: 'The F probability is unavailable.'
      });
    }
    return Object.assign(base, { f: f, p: p, state: 'ok', reason: '' });
  }

  function readTolerance(spec) {
    var src = spec || {};
    var lslBlank = src.lsl == null || String(src.lsl).trim() === '';
    var uslBlank = src.usl == null || String(src.usl).trim() === '';
    if (lslBlank && uslBlank) {
      return { valid: false, omitted: true, lsl: null, usl: null, width: null, message: '' };
    }
    if (lslBlank || uslBlank) {
      return {
        valid: false, omitted: false, lsl: null, usl: null, width: null,
        message: 'Enter both the lower and upper specification limits to show %Tolerance. The fitted study stays available.'
      };
    }
    var lsl = typeof src.lsl === 'number' ? src.lsl : Number(String(src.lsl).replace(/\u2212/g, '-'));
    var usl = typeof src.usl === 'number' ? src.usl : Number(String(src.usl).replace(/\u2212/g, '-'));
    if (!Number.isFinite(lsl) || !Number.isFinite(usl)) {
      return {
        valid: false, omitted: false, lsl: null, usl: null, width: null,
        message: 'Specification limits must be finite numbers. The fitted study stays available.'
      };
    }
    if (!(usl > lsl)) {
      return {
        valid: false, omitted: false, lsl: lsl, usl: usl, width: null,
        message: 'The upper specification limit must be greater than the lower limit. The fitted study stays available.'
      };
    }
    return { valid: true, omitted: false, lsl: lsl, usl: usl, width: usl - lsl, message: '' };
  }

  function percent(part, whole) {
    if (!Number.isFinite(part) || !(whole > 0)) return null;
    var value = 100 * part / whole;
    return Number.isFinite(value) ? value : null;
  }

  function sdOf(variance) {
    if (!Number.isFinite(variance) || variance < 0) return null;
    return Math.sqrt(variance);
  }

  function qcFactors(repeats) {
    var row = QC[repeats];
    if (!row) {
      return {
        available: false,
        repeats: repeats,
        A2: null,
        D3: null,
        D4: null,
        message: 'Control-chart factors are not available for ' + repeats + ' repeats. The subgroup statistics are still plotted, without center lines used as limits.'
      };
    }
    return {
      available: true,
      repeats: repeats,
      A2: row.A2,
      D3: row.D3,
      D4: row.D4,
      message: ''
    };
  }

  function prepare(table, mapping, options) {
    var headers = (table && table.headers) || [];
    var rows = (table && table.rows) || [];
    var map = mapping || {};
    var partIndex = findColumn(headers, map.part);
    var operatorIndex = findColumn(headers, map.operator);
    var measureIndex = findColumn(headers, map.measurement);
    if (partIndex < 0 || operatorIndex < 0 || measureIndex < 0 || partIndex === operatorIndex || partIndex === measureIndex || operatorIndex === measureIndex) {
      return {
        ok: false,
        blocked: true,
        error: 'Map Part, Operator, and Measurement to three different columns.',
        errors: [{ code: 'mapping', rows: [], message: 'Map Part, Operator, and Measurement to three different columns.' }],
        grid: null
      };
    }
    var opts = options || {};
    var headerRow = Number.isFinite(opts.headerRow) ? opts.headerRow : headerRowFromAddress(table && table.address);
    if (!Number.isFinite(headerRow)) headerRow = 1;
    var explicitRows = Array.isArray(opts.sourceRows) ? opts.sourceRows : null;
    var issues = Object.create(null);
    var records = [];
    var skipped = 0;
    rows.forEach(function (row, index) {
      var sourceRow = explicitRows && Number.isFinite(explicitRows[index])
        ? explicitRows[index]
        : headerRow + 1 + index;
      var partRaw = row ? row[partIndex] : null;
      var operatorRaw = row ? row[operatorIndex] : null;
      var measureRaw = row ? row[measureIndex] : null;
      if (blank(partRaw) && blank(operatorRaw) && blank(measureRaw)) {
        skipped += 1;
        return;
      }
      var bad = false;
      [['Part', partRaw], ['Operator', operatorRaw], ['Measurement', measureRaw]].forEach(function (pair) {
        if (bad) return;
        if (worksheetError(pair[1])) {
          bad = true;
          pushIssue(issues, 'worksheet:' + pair[0], { code: 'worksheet', column: pair[0], row: sourceRow });
          return;
        }
        if (blank(pair[1])) {
          bad = true;
          pushIssue(issues, 'blank:' + pair[0], { code: 'blank', column: pair[0], row: sourceRow });
        }
      });
      if (bad) return;
      var measured = measurementOf(measureRaw);
      if (measured.error) {
        pushIssue(issues, 'invalid:Measurement', { code: 'invalid', column: 'Measurement', row: sourceRow });
        return;
      }
      records.push({
        part: idLabel(partRaw),
        operator: idLabel(operatorRaw),
        value: measured.value,
        sourceRow: sourceRow
      });
    });
    var errors = Object.keys(issues).map(function (key) {
      var issue = issues[key];
      var noun = issue.code === 'worksheet'
        ? 'a worksheet error in ' + issue.column
        : issue.code === 'blank'
          ? 'a blank ' + issue.column
          : 'a measurement that is not a finite number';
      return {
        code: issue.code,
        column: issue.column,
        rows: issue.rows.slice(),
        message: listRowPhrase(issue.rows) + (issue.rows.length === 1 ? ' has ' : ' have ') + noun + '. Correct ' + (issue.rows.length === 1 ? 'that row' : 'those rows') + ' before running the study. Missing readings are not dropped from the fit.'
      };
    });

    var partOrder = [];
    var operatorOrder = [];
    var seenPart = Object.create(null);
    var seenOperator = Object.create(null);
    var cells = Object.create(null);
    records.forEach(function (record) {
      if (!seenPart[record.part]) {
        seenPart[record.part] = true;
        partOrder.push(record.part);
      }
      if (!seenOperator[record.operator]) {
        seenOperator[record.operator] = true;
        operatorOrder.push(record.operator);
      }
      var key = record.part + KEY_SEP + record.operator;
      if (!cells[key]) cells[key] = { part: record.part, operator: record.operator, values: [], sourceRows: [] };
      cells[key].values.push(record.value);
      cells[key].sourceRows.push(record.sourceRow);
    });
    var counts = [];
    var countSet = Object.create(null);
    partOrder.forEach(function (part) {
      operatorOrder.forEach(function (operator) {
        var cell = cells[part + KEY_SEP + operator];
        var count = cell ? cell.values.length : 0;
        counts.push({ part: part, operator: operator, count: count });
        countSet[count] = true;
      });
    });
    var distinctCounts = Object.keys(countSet).map(Number);
    var target = distinctCounts.length === 1 ? distinctCounts[0] : null;
    var problems = counts.filter(function (cell) {
      return target == null || cell.count !== target || cell.count < 2;
    }).map(function (cell) {
      return {
        part: cell.part,
        operator: cell.operator,
        count: cell.count,
        kind: cell.count === 0 ? 'zero' : 'uneven'
      };
    });
    var grid = {
      parts: partOrder.slice(),
      operators: operatorOrder.slice(),
      cells: counts,
      repeats: target,
      problems: problems
    };
    var designErrors = [];
    if (partOrder.length < 2) designErrors.push('At least two parts are required.');
    if (operatorOrder.length < 2) designErrors.push('At least two operators are required.');
    if (!records.length) designErrors.push('At least two repeats of every part and operator are required.');
    if (target == null) {
      designErrors.push('Every operator must measure every part the same number of times. The highlighted cells do not share one repeat count.');
    } else if (!(target >= 2)) {
      designErrors.push('Every part and operator combination needs at least two repeats. This study has ' + target + ' per cell.');
    }
    problems.forEach(function (cell) {
      if (cell.count === 0) {
        designErrors.push('Part ' + cell.part + ' × Operator ' + cell.operator + ' has no readings.');
      } else if (target == null || cell.count !== target) {
        designErrors.push('Part ' + cell.part + ' × Operator ' + cell.operator + ' has ' + cell.count + ' reading' + (cell.count === 1 ? '' : 's') + '.');
      }
    });
    var blocking = errors.concat(designErrors.map(function (message) {
      return { code: 'design', rows: [], message: message };
    }));
    if (blocking.length) {
      return {
        ok: false,
        blocked: true,
        error: blocking[0].message,
        errors: blocking,
        grid: partOrder.length || operatorOrder.length ? grid : null,
        readings: records.length,
        skippedEmptyRows: skipped,
        columns: { part: map.part, operator: map.operator, measurement: map.measurement }
      };
    }
    var cellList = partOrder.reduce(function (list, part) {
      operatorOrder.forEach(function (operator) {
        list.push(cells[part + KEY_SEP + operator]);
      });
      return list;
    }, []);
    return {
      ok: true,
      blocked: false,
      error: '',
      errors: [],
      grid: grid,
      readings: records.length,
      skippedEmptyRows: skipped,
      parts: partOrder,
      operators: operatorOrder,
      repeats: target,
      cells: cellList,
      columns: { part: map.part, operator: map.operator, measurement: map.measurement },
      address: (table && table.address) || ''
    };
  }

  function anovaRow(source, df, ss, test) {
    var ms = df > 0 ? ss / df : null;
    return {
      source: source,
      df: df,
      ss: ss,
      ms: ms,
      f: test ? test.f : null,
      p: test ? test.p : null,
      pState: test ? test.state : '',
      denominator: test ? test.denominator : '',
      reason: test ? test.reason : ''
    };
  }

  function fitPrepared(prepared, spec) {
    var parts = prepared.parts;
    var operators = prepared.operators;
    var a = parts.length;
    var b = operators.length;
    var r = prepared.repeats;
    var center = prepared.cells[0].values[0];
    var partSum = Object.create(null);
    var operatorSum = Object.create(null);
    var cellDev = [];
    var ssError = 0;
    var grandSum = 0;
    var n = 0;
    parts.forEach(function (part) { partSum[part] = 0; });
    operators.forEach(function (operator) { operatorSum[operator] = 0; });
    prepared.cells.forEach(function (cell) {
      var sum = 0;
      var i;
      for (i = 0; i < cell.values.length; i++) sum += cell.values[i] - center;
      var meanDev = sum / cell.values.length;
      var ss = 0;
      for (i = 0; i < cell.values.length; i++) {
        var dev = (cell.values[i] - center) - meanDev;
        ss += dev * dev;
      }
      ssError += ss;
      partSum[cell.part] += sum;
      operatorSum[cell.operator] += sum;
      grandSum += sum;
      n += cell.values.length;
      var min = cell.values[0];
      var max = cell.values[0];
      for (i = 1; i < cell.values.length; i++) {
        if (cell.values[i] < min) min = cell.values[i];
        if (cell.values[i] > max) max = cell.values[i];
      }
      cellDev.push({
        part: cell.part,
        operator: cell.operator,
        meanDev: meanDev,
        mean: meanDev + center,
        range: max - min,
        values: cell.values.slice(),
        sourceRows: cell.sourceRows.slice()
      });
    });
    var grandDev = grandSum / n;
    var partMean = {};
    var operatorMean = {};
    var ssPart = 0;
    var ssOperator = 0;
    var ssInteraction = 0;
    parts.forEach(function (part) {
      partMean[part] = partSum[part] / (b * r);
      var diff = partMean[part] - grandDev;
      ssPart += diff * diff;
    });
    ssPart *= b * r;
    operators.forEach(function (operator) {
      operatorMean[operator] = operatorSum[operator] / (a * r);
      var diff = operatorMean[operator] - grandDev;
      ssOperator += diff * diff;
    });
    ssOperator *= a * r;
    cellDev.forEach(function (cell) {
      var diff = cell.meanDev - partMean[cell.part] - operatorMean[cell.operator] + grandDev;
      ssInteraction += diff * diff;
    });
    ssInteraction *= r;

    var dfPart = a - 1;
    var dfOperator = b - 1;
    var dfInteraction = (a - 1) * (b - 1);
    var dfError = a * b * (r - 1);
    var msPart = ssPart / dfPart;
    var msOperator = ssOperator / dfOperator;
    var msInteraction = ssInteraction / dfInteraction;
    var msError = ssError / dfError;
    var interactionTest = meanSquareTest(msInteraction, msError, dfInteraction, dfError, 'Repeatability');
    var bothZero = msInteraction === 0 && msError === 0;
    var pool = bothZero || (interactionTest.p != null && !(interactionTest.p < ALPHA));
    var decision = bothZero
      ? 'The interaction and repeatability mean squares are both zero, so the F test is undefined. The zero interaction is pooled into repeatability. Part and Operator then use that pooled mean square.'
      : pool
        ? 'The interaction p-value is at least 0.05, so its sum of squares and degrees of freedom are added to repeatability. The reduced model uses the pooled mean square as the denominator for Part and Operator and as the term subtracted in those variance estimates. The interaction contributes zero.'
        : 'The interaction p-value is below 0.05, so it stays in the model. Part and Operator use the Part × Operator mean square as the F denominator and as the term subtracted in those variance estimates.';

    var full = {
      rows: [
        anovaRow('Part', dfPart, ssPart, meanSquareTest(msPart, msInteraction, dfPart, dfInteraction, 'Part × Operator')),
        anovaRow('Operator', dfOperator, ssOperator, meanSquareTest(msOperator, msInteraction, dfOperator, dfInteraction, 'Part × Operator')),
        anovaRow('Part × Operator', dfInteraction, ssInteraction, interactionTest),
        anovaRow('Repeatability', dfError, ssError, null),
        anovaRow('Total', dfPart + dfOperator + dfInteraction + dfError, ssPart + ssOperator + ssInteraction + ssError, null)
      ]
    };
    var reduced = null;
    var errorForVariance = msInteraction;
    var repeatabilityVariance = msError;
    if (pool) {
      var pooledSs = ssInteraction + ssError;
      var pooledDf = dfInteraction + dfError;
      var pooledMs = pooledDf > 0 ? pooledSs / pooledDf : 0;
      errorForVariance = pooledMs;
      repeatabilityVariance = pooledMs;
      reduced = {
        rows: [
          anovaRow('Part', dfPart, ssPart, meanSquareTest(msPart, pooledMs, dfPart, pooledDf, 'Pooled repeatability')),
          anovaRow('Operator', dfOperator, ssOperator, meanSquareTest(msOperator, pooledMs, dfOperator, pooledDf, 'Pooled repeatability')),
          anovaRow('Repeatability', pooledDf, pooledSs, null),
          anovaRow('Total', dfPart + dfOperator + pooledDf, ssPart + ssOperator + pooledSs, null)
        ]
      };
    }

    var signed = {
      part: (msPart - errorForVariance) / (b * r),
      operator: (msOperator - errorForVariance) / (a * r),
      interaction: pool ? 0 : (msInteraction - msError) / r,
      repeatability: repeatabilityVariance
    };
    function reported(value) {
      var safe = Number.isFinite(value) ? value : 0;
      return safe > 0 ? safe : 0;
    }
    var variances = {
      repeatability: reported(signed.repeatability),
      operator: reported(signed.operator),
      interaction: reported(signed.interaction),
      part: reported(signed.part)
    };
    var reproducibility = variances.operator + variances.interaction;
    var gage = variances.repeatability + reproducibility;
    var total = gage + variances.part;
    var totalSd = sdOf(total);
    var gageSd = sdOf(gage);
    var notes = [];
    function zeroNote(name, signedValue) {
      if (Number.isFinite(signedValue) && signedValue < 0) {
        notes.push(name + ' variance was ' + signedValue + ' and is reported as zero.');
        return 'The calculated variance was negative and is reported as zero.';
      }
      return '';
    }
    var tolerance = readTolerance(spec);
    var percentageNote = total > 0 ? '' : 'Total variation is zero, so percentages of the study are unavailable.';
    if (percentageNote) notes.push(percentageNote);
    function metrics(id, label, role, parent, variance, signedValue, note) {
      var clean = reported(variance);
      var sd = sdOf(clean);
      var studyVar = sd == null ? null : STUDY_MULTIPLIER * sd;
      return {
        id: id,
        label: label,
        role: role,
        parent: parent,
        countsInTotal: role === 'component',
        varianceSigned: Number.isFinite(signedValue) ? signedValue : null,
        variance: clean,
        zeroed: Number.isFinite(signedValue) && signedValue < 0,
        note: note || '',
        sd: sd,
        studyVar: studyVar,
        pctContribution: percent(clean, total),
        pctStudy: totalSd ? percent(sd, totalSd) : null,
        pctTolerance: tolerance.valid && studyVar != null ? percent(studyVar, tolerance.width) : null
      };
    }
    var interactionNote = pool
      ? 'Pooled with repeatability, so this component is zero.'
      : zeroNote('The Part × Operator', signed.interaction);
    var components = [
      metrics('gage', 'Total Gage R&R', 'parent', null, gage, gage, 'Sum of repeatability and reproducibility. Not added again to the total.'),
      metrics('repeatability', 'Repeatability', 'component', 'gage', variances.repeatability, signed.repeatability, ''),
      metrics('reproducibility', 'Reproducibility', 'parent', 'gage', reproducibility, reproducibility, 'Sum of operator and Part × Operator. Not added again to the total.'),
      metrics('operator', 'Operator', 'component', 'reproducibility', variances.operator, signed.operator, zeroNote('Operator', signed.operator)),
      metrics('interaction', 'Part × Operator', 'component', 'reproducibility', variances.interaction, signed.interaction, interactionNote),
      metrics('part', 'Part-to-part', 'component', null, variances.part, signed.part, zeroNote('Part-to-part', signed.part)),
      metrics('total', 'Total variation', 'total', null, total, total, percentageNote)
    ];
    var partRow = components.filter(function (row) { return row.id === 'part'; })[0];
    var ndc = !(gageSd > 0)
      ? { value: null, state: 'unavailable', reason: 'The Total Gage R&R standard deviation is zero, so the number of distinct categories is unavailable.' }
      : { value: Math.max(1, Math.floor(NDC_FACTOR * partRow.sd / gageSd)), state: 'ok', reason: '' };
    if (ndc.state !== 'ok') notes.push(ndc.reason);

    var factors = qcFactors(r);
    var rangeSum = 0;
    cellDev.forEach(function (cell) { rangeSum += cell.range; });
    var rBar = rangeSum / cellDev.length;
    var xCenter = grandDev + center;
    var charts = {
      repeats: r,
      constants: factors,
      rBar: rBar,
      xBarCenter: xCenter,
      rLimits: factors.available ? { center: rBar, lcl: factors.D3 * rBar, ucl: factors.D4 * rBar } : null,
      xLimits: factors.available ? { center: xCenter, lcl: xCenter - factors.A2 * rBar, ucl: xCenter + factors.A2 * rBar } : null,
      points: cellDev.map(function (cell) {
        var rLimits = factors.available ? { lcl: factors.D3 * rBar, ucl: factors.D4 * rBar } : null;
        var xLimits = factors.available ? { lcl: xCenter - factors.A2 * rBar, ucl: xCenter + factors.A2 * rBar } : null;
        return {
          part: cell.part,
          operator: cell.operator,
          mean: cell.mean,
          range: cell.range,
          values: cell.values,
          sourceRows: cell.sourceRows,
          beyondR: !!(rLimits && (cell.range < rLimits.lcl || cell.range > rLimits.ucl)),
          beyondX: !!(xLimits && (cell.mean < xLimits.lcl || cell.mean > xLimits.ucl))
        };
      })
    };
    var gageRow = components[0];
    return {
      ok: true,
      blocked: false,
      error: '',
      errors: [],
      exportReady: true,
      method: 'Balanced crossed Gage R&R, two-way random-effects ANOVA',
      alpha: ALPHA,
      studyVariationMultiplier: STUDY_MULTIPLIER,
      columns: prepared.columns,
      address: prepared.address,
      design: {
        parts: a,
        operators: b,
        repeats: r,
        readings: prepared.readings,
        partLabels: parts.slice(),
        operatorLabels: operators.slice()
      },
      grid: prepared.grid,
      skippedEmptyRows: prepared.skippedEmptyRows,
      anova: {
        full: full,
        reduced: reduced,
        selected: pool ? 'pooled' : 'full',
        interaction: interactionTest,
        pooled: pool,
        decision: decision
      },
      signedVariance: signed,
      components: components,
      tolerance: tolerance,
      percentageNote: percentageNote,
      distinctCategories: ndc,
      summary: {
        pctStudy: gageRow.pctStudy,
        pctContribution: gageRow.pctContribution,
        pctTolerance: gageRow.pctTolerance,
        distinctCategories: ndc.value
      },
      charts: charts,
      notes: notes,
      cells: charts.points
    };
  }

  function analyze(table, mapping, spec, options) {
    var prepared = prepare(table, mapping, options);
    if (!prepared.ok) return prepared;
    return fitPrepared(prepared, spec);
  }

  function withTolerance(result, spec) {
    if (!result || !result.ok) return result;
    var tolerance = readTolerance(spec);
    var components = result.components.map(function (row) {
      var copy = {};
      var key;
      for (key in row) if (Object.prototype.hasOwnProperty.call(row, key)) copy[key] = row[key];
      copy.pctTolerance = tolerance.valid && row.studyVar != null ? percent(row.studyVar, tolerance.width) : null;
      return copy;
    });
    var gage = components[0];
    var next = {};
    var name;
    for (name in result) if (Object.prototype.hasOwnProperty.call(result, name)) next[name] = result[name];
    next.tolerance = tolerance;
    next.components = components;
    next.summary = {
      pctStudy: result.summary.pctStudy,
      pctContribution: result.summary.pctContribution,
      pctTolerance: gage.pctTolerance,
      distinctCategories: result.summary.distinctCategories
    };
    next.anova = result.anova;
    return next;
  }

  function nonFinitePaths(value, path, out) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) out.push(path || '$');
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(function (item, index) { nonFinitePaths(item, path + '[' + index + ']', out); });
      return;
    }
    Object.keys(value).forEach(function (key) {
      nonFinitePaths(value[key], (path || '$') + '.' + key, out);
    });
  }

  function textNumber(value, digits) {
    if (!Number.isFinite(value)) return 'unavailable';
    var text = digits == null ? String(value) : value.toFixed(digits);
    if (text.indexOf('NaN') >= 0 || text.indexOf('Infinity') >= 0) return 'unavailable';
    return text;
  }

  function pText(row) {
    if (!row || row.pState === 'unavailable' || row.p == null) return 'unavailable';
    if (row.pState === 'limit') return '0';
    return textNumber(row.p, 6);
  }

  function reportLines(result) {
    if (!result || !result.ok) return ['No fitted Gage R&R study is available to export.'];
    var lines = [];
    var design = result.design;
    lines.push('Crossed Gage R&R');
    lines.push(result.method);
    lines.push('Parts: ' + design.parts + '. Operators: ' + design.operators + '. Repeats per cell: ' + design.repeats + '. Readings: ' + design.readings + '.');
    lines.push('Study variation multiplier: ' + result.studyVariationMultiplier + '. Interaction stays in the model when p < ' + result.alpha + '.');
    lines.push(result.anova.decision);
    if (result.tolerance && result.tolerance.valid) {
      lines.push('Lower specification limit: ' + textNumber(result.tolerance.lsl) + '. Upper specification limit: ' + textNumber(result.tolerance.usl) + '. Width: ' + textNumber(result.tolerance.width) + '.');
    } else if (result.tolerance && result.tolerance.message) {
      lines.push(result.tolerance.message);
    } else {
      lines.push('Specification limits were not used.');
    }
    lines.push('Variance components');
    result.components.forEach(function (row) {
      lines.push([
        row.label,
        'variance ' + textNumber(row.variance),
        'SD ' + textNumber(row.sd),
        'study variation ' + textNumber(row.studyVar),
        '% contribution ' + textNumber(row.pctContribution),
        '% study variation ' + textNumber(row.pctStudy),
        '% tolerance ' + textNumber(row.pctTolerance),
        row.note || ''
      ].join(' | '));
    });
    lines.push('Distinct categories: ' + (result.distinctCategories.value == null ? 'unavailable' : String(result.distinctCategories.value)) + (result.distinctCategories.reason ? '. ' + result.distinctCategories.reason : ''));
    if (result.charts && result.charts.constants && !result.charts.constants.available) {
      lines.push(result.charts.constants.message);
    }
    function writeAnova(title, table) {
      lines.push(title);
      table.rows.forEach(function (row) {
        lines.push([
          row.source,
          'df ' + row.df,
          'SS ' + textNumber(row.ss),
          'MS ' + textNumber(row.ms),
          'F ' + (row.pState === 'limit' ? 'limit' : textNumber(row.f)),
          'p ' + pText(row),
          row.denominator ? 'denominator ' + row.denominator : '',
          row.reason || ''
        ].join(' | '));
      });
    }
    writeAnova('ANOVA with interaction', result.anova.full);
    if (result.anova.reduced) writeAnova('ANOVA after pooling the interaction', result.anova.reduced);
    result.notes.forEach(function (note) { if (lines.indexOf(note) < 0) lines.push(note); });
    return lines;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch];
    });
  }

  function reportText(result) {
    return reportLines(result).join('\n');
  }

  function reportHtml(result) {
    var body = reportLines(result).map(function (line) {
      return '<p>' + escapeHtml(line) + '</p>';
    }).join('');
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Crossed Gage R&amp;R</title></head><body><h1>Crossed Gage R&amp;R</h1>' + body + '</body></html>';
  }

  function exportData(result) {
    if (!result || !result.ok) return null;
    return {
      module: 'gage-rr',
      method: result.method,
      alpha: result.alpha,
      studyVariationMultiplier: result.studyVariationMultiplier,
      columns: result.columns,
      design: result.design,
      decision: result.anova.decision,
      selectedModel: result.anova.selected,
      tolerance: result.tolerance,
      anova: result.anova,
      components: result.components,
      distinctCategories: result.distinctCategories,
      summary: result.summary,
      charts: {
        repeats: result.charts.repeats,
        constants: result.charts.constants,
        rBar: result.charts.rBar,
        xBarCenter: result.charts.xBarCenter,
        rLimits: result.charts.rLimits,
        xLimits: result.charts.xLimits,
        points: result.charts.points
      },
      notes: result.notes
    };
  }

  function cellDetail(result, part, operator) {
    if (!result || !result.cells) return null;
    var found = null;
    result.cells.some(function (cell) {
      if (cell.part === part && cell.operator === operator) {
        found = cell;
        return true;
      }
      return false;
    });
    return found;
  }

  function demoTable() {
    return {
      headers: ['Part', 'Operator', 'Measurement'],
      rows: [
        ['P01', 'A', 88], ['P01', 'A', 90],
        ['P01', 'B', 90], ['P01', 'B', 92],
        ['P02', 'A', 102], ['P02', 'A', 104],
        ['P02', 'B', 116], ['P02', 'B', 118]
      ],
      address: 'Demo!A1:C9',
      source: 'demo'
    };
  }

  function component(result, id) {
    var found = null;
    (result && result.components || []).some(function (row) {
      if (row.id === id) { found = row; return true; }
      return false;
    });
    return found;
  }

  return {
    ALPHA: ALPHA,
    STUDY_MULTIPLIER: STUDY_MULTIPLIER,
    qcFactors: qcFactors,
    headerRowFromAddress: headerRowFromAddress,
    listColumns: listColumns,
    readTolerance: readTolerance,
    prepare: prepare,
    analyze: analyze,
    withTolerance: withTolerance,
    nonFinitePaths: function (value) {
      var out = [];
      nonFinitePaths(value, '$', out);
      return out;
    },
    reportText: reportText,
    reportHtml: reportHtml,
    exportData: exportData,
    cellDetail: cellDetail,
    demoTable: demoTable,
    component: component,
    fRightTail: fRightTail
  };
});
