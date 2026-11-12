/**
 * Process capability from a worksheet range.
 * Mean and standard deviation come from the measured values.
 * Indices use the same formulas as the process capability calculator
 * (Cp, Cpk, Cpu, Cpl, Cpm, and normal-model defects).
 * The standard deviation is the sample standard deviation (n − 1).
 */
(function (root, factory) {
  var columnsApi = root && root.StatisticoColumnType;
  var math = root && root.CpkMath;
  var byGroup = root && root.StatisticoByGroup;
  function optionalRequire(path) {
    if (typeof require !== 'function') return null;
    return require(path);
  }
  if (!columnsApi) columnsApi = optionalRequire('./column-type.js');
  if (!math) math = optionalRequire('./cpk-math.js');
  if (!byGroup) byGroup = optionalRequire('./by-group-standard.js');
  var api = factory(columnsApi, math, byGroup);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StatisticoCapabilityRange = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ColumnType, CpkMath, ByGroup) {
  'use strict';

  var MIN_GROUP_N = 10;
  var CPK_BAND = 0.33;
  var SIDE_GAP = 0.05;

  function finiteOrNull(value) {
    if (value == null || value === '') return null;
    var n = typeof value === 'number' ? value : Number(String(value).replace(/\u2212/g, '-'));
    return Number.isFinite(n) ? n : NaN;
  }

  function summarize(values) {
    var list = values || [];
    var n = list.length;
    if (!n) return { n: 0, mean: NaN, sd: NaN, min: NaN, max: NaN };
    var sum = 0;
    var min = Infinity;
    var max = -Infinity;
    var i;
    for (i = 0; i < n; i++) {
      var v = list[i];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    var mean = sum / n;
    if (n < 2) return { n: n, mean: mean, sd: NaN, min: min, max: max };
    var ss = 0;
    for (i = 0; i < n; i++) {
      var d = list[i] - mean;
      ss += d * d;
    }
    return { n: n, mean: mean, sd: Math.sqrt(ss / (n - 1)), min: min, max: max };
  }

  function normalizeSpec(spec) {
    var src = spec || {};
    var targetRaw = src.target;
    var hasTarget = !(targetRaw == null || String(targetRaw).trim() === '');
    return {
      lsl: finiteOrNull(src.lsl),
      usl: finiteOrNull(src.usl),
      target: hasTarget ? finiteOrNull(targetRaw) : '',
      hasTarget: hasTarget
    };
  }

  function analyzeValues(values, spec) {
    var summary = summarize(values);
    if (summary.n < 2) {
      return { ok: false, error: 'At least two numeric values are required.' };
    }
    if (!(summary.sd > 0)) {
      return { ok: false, error: 'The standard deviation is 0. Capability needs variation in the measured values.' };
    }
    var normalized = normalizeSpec(spec);
    if (Number.isNaN(normalized.lsl) || Number.isNaN(normalized.usl) || (normalized.hasTarget && Number.isNaN(normalized.target))) {
      return { ok: false, error: 'Enter numeric specification limits. Leave the target blank to use the midpoint.' };
    }
    var result = CpkMath.analyze({
      lsl: normalized.lsl,
      usl: normalized.usl,
      mean: summary.mean,
      sd: summary.sd,
      target: normalized.hasTarget ? normalized.target : ''
    });
    if (!result.ok) return result;
    result.n = summary.n;
    result.min = summary.min;
    result.max = summary.max;
    result.sdKind = 'sample';
    result.binding = bindingSide(result);
    return result;
  }

  function bindingSide(result) {
    if (!result || !result.ok) return null;
    var gap = result.cpu - result.cpl;
    if (gap <= -SIDE_GAP) return 'upper';
    if (gap >= SIDE_GAP) return 'lower';
    return 'center';
  }

  function columnProfile(rows, index) {
    var numeric = 0;
    var other = 0;
    var seen = Object.create(null);
    var levels = 0;
    (rows || []).forEach(function (row) {
      var value = row ? row[index] : null;
      if (value == null || String(value).trim() === '') return;
      var key = String(value).trim();
      if (!seen[key]) {
        seen[key] = true;
        levels += 1;
      }
      if (ColumnType.isNumericCell(value)) numeric += 1;
      else other += 1;
    });
    var kind = 'empty';
    if (numeric || other) kind = other === 0 ? 'numeric' : 'categorical';
    return { numeric: numeric, other: other, levels: levels, kind: kind };
  }

  function columns(headers, rows) {
    return (headers || []).map(function (header, index) {
      var profile = columnProfile(rows, index);
      return {
        name: String(header == null ? '' : header),
        index: index,
        kind: profile.kind,
        levels: profile.levels
      };
    }).filter(function (col) { return col.name && col.kind !== 'empty'; });
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

  function numericColumn(rows, index) {
    var values = [];
    var excluded = 0;
    (rows || []).forEach(function (row) {
      var raw = row ? row[index] : null;
      if (raw == null || String(raw).trim() === '') {
        excluded += 1;
        return;
      }
      var n = ColumnType.parseNumericCell(raw);
      if (!Number.isFinite(n)) {
        excluded += 1;
        return;
      }
      values.push(n);
    });
    return { values: values, excluded: excluded };
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function assessGroups(groups) {
    var reliable = (groups || []).filter(function (group) {
      return group && group.ok && !group.small && Number.isFinite(group.cpk);
    });
    var insufficient = reliable.length < 2;
    var hasUpper = false;
    var hasLower = false;
    var hasPos = false;
    var hasNeg = false;
    reliable.forEach(function (group) {
      if (group.binding === 'upper') hasUpper = true;
      if (group.binding === 'lower') hasLower = true;
      if (group.cpk > 0) hasPos = true;
      if (group.cpk < 0) hasNeg = true;
    });
    var directionChanges = !insufficient && ((hasUpper && hasLower) || (hasPos && hasNeg));
    var cpks = reliable.map(function (group) { return group.cpk; });
    var range = cpks.length ? Math.max.apply(null, cpks) - Math.min.apply(null, cpks) : 0;
    var magnitudeVaries = !insufficient && !directionChanges && range >= CPK_BAND;
    var classification = ByGroup.classifyConsistency({
      insufficient: insufficient,
      directionChanges: directionChanges,
      magnitudeVaries: magnitudeVaries
    });
    var extreme = null;
    if (reliable.length) {
      extreme = reliable.slice().sort(function (a, b) { return a.cpk - b.cpk; })[0];
    }
    return {
      classification: classification,
      range: range,
      extreme: extreme,
      directionChanges: directionChanges,
      magnitudeVaries: magnitudeVaries,
      insufficient: insufficient
    };
  }

  function groupSentence(names) {
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  function analyzeByGroup(rows, valueIndex, groupIndex, spec, groupName) {
    var buckets = Object.create(null);
    var order = [];
    var missingN = 0;
    (rows || []).forEach(function (row) {
      var raw = row ? row[valueIndex] : null;
      var n = ColumnType.parseNumericCell(raw);
      if (!Number.isFinite(n)) return;
      var label = row ? row[groupIndex] : null;
      if (label == null || String(label).trim() === '') {
        missingN += 1;
        return;
      }
      var name = String(label).trim();
      if (!buckets[name]) {
        buckets[name] = [];
        order.push(name);
      }
      buckets[name].push(n);
    });
    if (ByGroup.tooManyGroupLevels(order.length)) {
      return {
        ok: false,
        error: 'This column has ' + order.length + ' levels. By-group analysis accepts at most ' + ByGroup.MAX_SELECTABLE_GROUP_LEVELS + '.',
        groupName: groupName,
        missingN: missingN,
        levelCount: order.length,
        groups: []
      };
    }
    var groups = order.map(function (name) {
      var result = analyzeValues(buckets[name], spec);
      var n = buckets[name].length;
      var row = {
        name: name,
        n: n,
        small: n < MIN_GROUP_N,
        ok: !!result.ok,
        error: result.ok ? '' : result.error
      };
      if (result.ok) {
        row.mean = result.mean;
        row.sd = result.sd;
        row.cp = result.cp;
        row.cpu = result.cpu;
        row.cpl = result.cpl;
        row.cpk = result.cpk;
        row.cpm = result.cpm;
        row.ppm = result.ppm;
        row.yieldPct = result.yieldPct;
        row.rating = result.rating;
        row.binding = result.binding;
      }
      return row;
    });
    var assessed = assessGroups(groups);
    var small = groups.filter(function (group) { return group.small; });
    var warnings = [];
    if (missingN > 0) {
      warnings.push(plural(missingN, 'measured row') + ' with no group value ' + (missingN === 1 ? 'was' : 'were') + ' left out of the group comparison.');
    }
    if (small.length) {
      warnings.push('Small ' + (small.length === 1 ? 'group' : 'groups') + ': '
        + small.map(function (group) { return group.name + ' (n=' + group.n + ')'; }).join(', ')
        + '. Estimates from small groups are unstable and are not used in the consistency status.');
    }
    var extreme = assessed.extreme;
    var differsText = extreme && assessed.classification.id !== 'consistent'
      ? extreme.name + ' has the lowest Cpk among reliable groups.'
      : 'No single group stands out from the others.';
    var directionText = assessed.directionChanges
      ? 'The limiting side of the specification is not the same in every reliable group. Some groups are pulled toward the upper limit and others toward the lower limit, or a group mean sits outside the limits.'
      : 'The limiting side of the specification does not reverse among reliable groups.';
    var consistentText = assessed.classification.id === 'consistent'
      ? 'Cpk stays in a similar band across the included groups.'
      : 'Some groups still sit in a similar capability band.';
    var interpretation = ByGroup.buildInterpretation({
      moduleKey: 'capability',
      status: assessed.classification,
      consistentText: consistentText,
      differsText: differsText,
      directionText: directionText,
      warningText: warnings.join(' ')
    });
    return {
      ok: true,
      groupName: groupName,
      missingN: missingN,
      levelCount: order.length,
      groups: groups,
      status: assessed.classification,
      range: assessed.range,
      extreme: extreme,
      directionChanges: assessed.directionChanges,
      interpretation: interpretation,
      differsText: differsText,
      warningText: warnings.join(' '),
      context: {
        moduleKey: 'capability',
        status: assessed.classification,
        directionChanges: assessed.directionChanges,
        differsText: differsText,
        warningText: warnings.join(' ')
      }
    };
  }

  function analyze(table, options) {
    var src = table || {};
    var headers = src.headers || [];
    var rows = src.rows || [];
    var opts = options || {};
    var valueName = String(opts.value || '');
    var valueIndex = findColumn(headers, valueName);
    if (!valueName || valueIndex < 0) {
      return { ok: false, error: 'Choose a measurement column.' };
    }
    var profile = columnProfile(rows, valueIndex);
    if (profile.kind !== 'numeric') {
      return { ok: false, error: 'The measurement column must be numeric.' };
    }
    var extracted = numericColumn(rows, valueIndex);
    var overall = analyzeValues(extracted.values, opts);
    if (!overall.ok) return overall;
    var groupName = String(opts.group || '').trim();
    var byGroup = null;
    if (groupName) {
      var groupIndex = findColumn(headers, groupName);
      if (groupIndex < 0) {
        byGroup = { ok: false, error: 'Choose a grouping column.', groupName: groupName, groups: [] };
      } else if (groupIndex === valueIndex) {
        byGroup = { ok: false, error: 'The grouping column must be different from the measurement.', groupName: groupName, groups: [] };
      } else {
        byGroup = analyzeByGroup(rows, valueIndex, groupIndex, opts, groupName);
      }
    }
    return {
      ok: true,
      valueName: valueName,
      excluded: extracted.excluded,
      overall: overall,
      byGroup: byGroup
    };
  }

  function demoTable() {
    var pattern = {
      A: [14.6, 14.8, 15.0, 15.2, 15.4, 15.0],
      B: [17.6, 17.8, 18.0, 18.2, 18.4, 18.6],
      C: [11.4, 11.6, 11.8, 12.0, 12.2, 12.4]
    };
    var headers = ['Line', 'Operator', 'Diameter'];
    var rows = [];
    var cycle;
    for (cycle = 0; cycle < 2; cycle++) {
      ['A', 'B', 'C'].forEach(function (line) {
        pattern[line].forEach(function (value, i) {
          var slot = cycle * 6 + i;
          rows.push([line, slot < 6 ? 'Day' : 'Night', value]);
        });
      });
    }
    rows.push(['Pilot', 'Pilot', 14.8]);
    rows.push(['Pilot', 'Pilot', 15.1]);
    rows.push(['Pilot', 'Pilot', 15.4]);
    return { headers: headers, rows: rows, address: 'Demo', source: 'demo' };
  }

  function demoSpec() {
    return { lsl: 10, usl: 20, target: 15 };
  }

  return {
    MIN_GROUP_N: MIN_GROUP_N,
    summarize: summarize,
    analyzeValues: analyzeValues,
    columns: columns,
    analyze: analyze,
    demoTable: demoTable,
    demoSpec: demoSpec,
    bindingSide: bindingSide
  };
});
